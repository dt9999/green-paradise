(() => {
  "use strict";
  const P = window.Paradise, Art = window.ParadiseArt, C = window.ParadiseCampaign;
  const $ = id => document.getElementById(id);
  const canvas = $("gameCanvas"), ctx = canvas.getContext("2d");
  const STORAGE = "greenParadiseSaveV1";
  let save;
  try { save = P.sanitizeSave(JSON.parse(localStorage.getItem(STORAGE))); }
  catch { save = P.sanitizeSave({}); }
  let game = null, currentScreen = "title", region = 0, viewWidth = 960, displayScale = 1, offsetY = 0;
  let last = 0, accumulator = 0, visualTime = 0, toastTime = 0, writePending = false, lastSave = 0;
  let tutorialStep = -1, endingTime = 0;
  const keys = new Set(), pointers = new Map(), actions = { jump: false, dive: false, shoot: false };
  const sound = createSound();
  const screens = ["title", "map", "shop", "result", "ending"];
  const hintHistory = [];
  let selectedRecord = null, newestRecord = null, noticeTime = 0;
  const paused = () => $("menu").open || $("journal").open || $("journalWelcome").open;
  const replayEnding = document.createElement("button"); replayEnding.id = "replayEnding";
  replayEnding.className = "small-button"; replayEnding.textContent = "第1部のエピローグを見る";
  $("menu").append(replayEnding);

  function writeSave() {
    try { localStorage.setItem(STORAGE, JSON.stringify(save)); writePending = false; }
    catch { if (!writePending) toast("このブラウザでは記録を保存できません。今はこのまま遊べます。"); writePending = true; }
  }
  function points(amount) { save.points = Math.max(0, save.points + amount); $("points").textContent = save.points; writePending = true; }
  function toast(text) {
    if (currentScreen === "play") {
      if (!hintHistory.includes(text)) hintHistory.unshift(text);
      hintHistory.length = Math.min(hintHistory.length, 30);
      if (!$("menu").open) return;
    }
    $("toast").textContent = text; $("toast").hidden = false; toastTime = 4;
    if ($("menu").open) {
      let status = $("menuStatus");
      if (!status) { status = document.createElement("p"); status.id = "menuStatus"; status.setAttribute("role", "status"); $("menu").prepend(status); }
      status.textContent = text;
    }
  }
  function clearInput() {
    keys.clear(); pointers.clear(); Object.keys(actions).forEach(k => actions[k] = false);
    document.querySelectorAll("[data-control]").forEach(b => b.classList.remove("held"));
  }
  function show(screen) {
    currentScreen = screen; document.body.dataset.screen = screen;
    $("toast").hidden = true;
    $("recordNotice").hidden = true; noticeTime = 0;
    if (screen === "ending") endingTime = 0;
    for (const id of screens) $(id).hidden = id !== screen;
    clearInput(); syncHud();
    if (screen === "map") { renderMap(); sound.theme("title"); }
    if (screen === "shop") { renderShop(); sound.theme("shop"); }
    if (screen === "title") sound.theme("title");
  }
  function syncHud() {
    const playing = currentScreen === "play" && game?.state === "playing";
    $("playHud").hidden = !playing;
    $("touchControls").hidden = !playing || paused();
    $("hintButton").hidden = !playing;
    $("tutorialHint").hidden = !playing || game?.stage.id !== 1 || paused();
    $("bossIntro").hidden = !playing || !(game?.bossIntro > 0) || paused();
    if (playing && game.bossIntro > 0) $("bossIntroName").textContent = game.stage.boss.name;
    $("leafButton").hidden = !playing || !game.leaf;
    $("rotateHint").hidden = true;
    $("bossHud").hidden = true;
    if (!playing) return;
    const section = game.stage.sections.filter(s => s.x <= game.player.x).at(-1);
    $("stageLabel").textContent = `${String(game.stage.id).padStart(2, "0")} / 50 · ${section.name}`;
    $("journeyStatus").textContent = `${Math.min(100, Math.floor(game.player.x / game.stage.goalX * 100))}% · ${game.checkpoint ? "中継地点を記録済み" : "中継地点をめざそう"}`;
    $("hearts").textContent = "♥".repeat(Math.max(0, game.player.hp)) + "♡".repeat(game.player.maxHp - Math.max(0, game.player.hp));
    const charges = Math.floor(game.leafCharge + 1e-9);
    $("leafStatus").textContent = game.leaf ? `葉っぱ ${"●".repeat(charges)}${"○".repeat(3 - charges)} · 1pt` : "";
    $("leafButton").disabled = save.points < 1 || charges < 1;
    const boss = game.enemies.find(e => e.boss && e.alive);
    if (boss && game.arenaEntered) {
      $("bossHud").hidden = false;
      $("bossName").textContent = game.stage.boss.name;
      $("bossTip").textContent = `${boss.phase === 2 ? "本気モード" : "第1形態"} · ${boss.shield ? "バリア" : boss.recovery > 0 ? "ガード中" : boss.openTime > 0 ? "弱点オープン" : boss.warning ? "攻撃の合図！" : "急降下で攻撃"}`;
      $("bossHud").dataset.phase = boss.phase;
      $("bossHealth").max = boss.maxHp; $("bossHealth").value = Math.max(0, boss.hp);
    }
  }
  function renderMap() {
    $("progressText").textContent = `${save.clearedStages.length} / 50 ステージをクリア · 次の一歩で、またみどりが増える。`;
    const tabs = $("regionTabs"), map = $("stageMap"); tabs.replaceChildren(); map.replaceChildren();
    P.BIOMES.forEach((biome, r) => {
      const tab = document.createElement("button"); tab.textContent = `${String(r + 1).padStart(2, "0")} ${biome.name}`;
      tab.classList.toggle("active", r === region);
      tab.addEventListener("click", () => {
        region = r; $("mapScroll").scrollTo({ left: r * 1120, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
        [...tabs.children].forEach((t, n) => t.classList.toggle("active", n === region));
      }); tabs.append(tab);
      const panel = document.createElement("div"); panel.className = "map-region";
      ["sky", "light", "far", "near"].forEach(k => panel.style.setProperty(`--${k}`, biome[k]));
      const label = document.createElement("div"); label.className = "map-region-label";
      label.innerHTML = `<small>WORLD ${String(r + 1).padStart(2, "0")} / ${biome.sub}</small><b>${biome.name}</b>`; panel.append(label);
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("viewBox", "0 0 1120 330"); svg.setAttribute("preserveAspectRatio", "none"); svg.classList.add("map-route");
      svg.innerHTML = '<path d="M 0 222 Q 50 222 110 215 T 320 180 T 530 235 T 740 180 T 950 230 L1120 230" fill="none" stroke="#fcf3d8" stroke-width="15"/><path d="M 0 222 Q 50 222 110 215 T 320 180 T 530 235 T 740 180 T 950 230 L1120 230" fill="none" stroke="#b89e72" stroke-width="2" stroke-dasharray="5 9"/>'; panel.append(svg);
      P.STAGES.slice(r * 5, r * 5 + 5).forEach((stage, n) => {
        const button = document.createElement("button");
        const cleared = save.clearedStages.includes(stage.id);
        button.className = `stage-node${stage.boss ? " boss" : ""}${cleared ? " cleared" : ""}`;
        button.style.left = `${110 + n * 210}px`; button.style.top = `${[215,180,235,180,230][n] / 330 * 100}%`;
        button.disabled = stage.id > save.unlockedStages;
        button.innerHTML = `<span class="node-circle">${cleared ? "✓" : stage.id}</span><strong>${stage.name}</strong><small>${stage.boss ? "BOSS · " : ""}${button.disabled ? "まだ開いていないよ" : cleared ? "もう一度あそぶ" : "ここから冒険！"}</small>`;
        button.setAttribute("aria-label", `ステージ${stage.id} ${stage.name}`);
        button.addEventListener("click", () => startStage(stage.id)); panel.append(button);
      }); map.append(panel);
    });
    $("mapScroll").scrollLeft = region * 1120;
  }
  function renderShop() {
    const items = $("shopItems"); items.replaceChildren();
    P.UPGRADES.forEach((u, i) => {
      const level = save.upgrades[u.id], cost = P.upgradeCost(u, level);
      const card = document.createElement("article"); card.className = "shop-card";
      card.innerHTML = `<span class="shop-number">UPGRADE ${String(i + 1).padStart(2, "0")}</span><h4>${u.name}</h4><span class="upgrade-level">${"●".repeat(level)}${"○".repeat(u.max - level)}</span><p>${u.text}<br>レベル ${level} / ${u.max}</p>`;
      const current = P.stats(save.upgrades), next = P.stats({ ...save.upgrades, [u.id]: Math.min(u.max, level + 1) });
      const value = s => u.id === "dropRate" ? `${(s.drop * 100).toFixed(1)}%` : u.id === "energy" ? `${s.hp}ハート / 無敵${s.safety.toFixed(2)}秒` : String(s[u.id]);
      const preview = document.createElement("p"); preview.textContent = `今 ${value(current)}${level < u.max ? ` → 次 ${value(next)}` : ""}`; card.append(preview);
      const button = document.createElement("button"); button.className = "small-button";
      button.textContent = level >= u.max ? "最大レベル！" : `${cost} pt で強化`;
      button.disabled = level >= u.max || save.points < cost;
      button.addEventListener("click", () => {
        if (save.upgrades[u.id] !== level || save.points < cost || level >= u.max) return;
        points(-cost); save.upgrades[u.id]++; writeSave(); renderShop(); sound.effect("purchase"); toast(`${u.name} が強くなった！`);
      }); card.append(button); items.append(card);
    });
    const next = P.STAGES[save.unlockedStages]; $("unlockItem").replaceChildren();
    if (!next) { $("unlockItem").textContent = "50ステージすべて開いているよ！"; return; }
    const card = document.createElement("article"); card.className = "shop-card";
    card.innerHTML = `<h4>ステージ ${next.id} · ${next.biome.name}</h4><p>前のステージをクリアしても開きます。先に遊びたいときはポイントで開けるよ。</p>`;
    const button = document.createElement("button"); button.className = "small-button"; button.textContent = `${next.cost} pt で開く`; button.disabled = save.points < next.cost;
    button.addEventListener("click", () => {
      if (save.points < next.cost || save.unlockedStages + 1 !== next.id) return;
      points(-next.cost); save.unlockedStages++; writeSave(); renderShop(); sound.effect("purchase"); toast(`ステージ${next.id} が開いた！`);
    }); card.append(button); $("unlockItem").append(card);
  }
  function startStage(id) {
    if (id > save.unlockedStages) return;
    game = P.createGame(P.STAGES[id - 1], save); tutorialStep = -1; accumulator = 0;
    show("play"); sound.theme("stage", game.stage.region);
    toast(game.stage.boss ? `この先に ${game.stage.boss.name} がいるよ。` : `${game.stage.name} · 大きな木まで進もう。`);
  }
  function goMap() {
    if (game) region = game.stage.region;
    game = null; writeSave(); show("map");
  }
  function finish(win, reason) {
    writeSave(); clearInput();
    if (win) {
      const bonus = game.stage.bonus;
      points(bonus); save.highestCleared = Math.max(save.highestCleared, game.stage.id);
      if (!save.clearedStages.includes(game.stage.id)) save.clearedStages.push(game.stage.id);
      save.unlockedStages = Math.max(save.unlockedStages, Math.min(50, game.stage.id + 1));
      if (game.stage.id === 50) { save.endingSeen = true; writeSave(); show("ending"); sound.theme("ending"); return; }
      writeSave(); $("resultEyebrow").textContent = "A LITTLE GREENER. A LITTLE BRIGHTER.";
      $("resultTitle").textContent = game.stage.boss ? "ボスをこえた！" : "ステージクリア！";
      $("resultText").textContent = `${game.stage.biome.name}に、みどりが戻った。ステージ${game.stage.id + 1} が開いたよ。`;
      $("resultReward").textContent = `+ ${bonus} pt`; $("retryButton").hidden = true;
    } else {
      $("resultEyebrow").textContent = "EVERY STEP IS A NEW BEGINNING"; $("resultTitle").textContent = "もう一度、やってみよう。";
      $("resultText").textContent = reason; $("resultReward").textContent = "集めたポイントと研究記録はなくならないよ。"; $("retryButton").hidden = false;
      $("retryButton").textContent = game.checkpoint ? "中継地点から再開" : "もう一度挑戦";
    }
    show("result"); sound.theme(win ? "clear" : "lost");
  }
  function handleEvents() {
    const events = game.events.splice(0);
    for (const e of events) {
      if (e.type === "points") points(e.amount);
      else if (e.type === "won") finish(true);
      else if (e.type === "lost") finish(false, e.reason);
      else if (e.type === "record") {
        if (!save.records.includes(e.record.id)) save.records.push(e.record.id);
        newestRecord = e.record.id; noticeTime = 9;
        $("recordNoticeTitle").textContent = e.record.title;
        $("recordNotice").hidden = false;
        updateJournalBadge(); sound.effect("record"); writeSave();
        if (!save.journalGuideSeen) {
          clearInput(); $("journalWelcome").showModal(); syncHud();
        }
      }
      else {
        sound.effect(e.type);
        if (e.type === "drop") toast("葉っぱアイテムが出た！ 拾うとこのステージで発射できるよ。");
        if (e.type === "pickup" && e.leaf) toast("葉っぱの力！ 3発分のゲージ、2秒で1発回復。Eで発射・1発1pt。");
        if (e.type === "newEnemy" || e.type === "gimmick") toast(e.text);
        if (e.type === "weakpoint") toast("弱点が開いた！ 2.4秒間、葉っぱで追撃できるよ！");
        if (e.type === "armored") toast("装甲には葉っぱが効きにくい！ 急降下で弱点を開こう。");
        if (e.type === "boss") { toast(e.text); sound.theme("boss", game.stage.region); }
        if (e.type === "bossPhase") sound.theme("boss", game.stage.region, 2);
        if (e.type === "bossFinalPhase") { sound.theme("boss", game.stage.region, 2); toast("吸収炉が暴走！ 光る地面から離れよう。"); }
        if (e.type === "bossDefeat") { toast("ボスをたおした！ 大きな木へ進もう。"); sound.theme("clear"); }
        if (e.type === "blocked") toast("バリアが消えるのを待って攻撃しよう！");
      }
    }
  }
  function input() {
    const held = new Set([...keys, ...pointers.values()]);
    return { left: held.has("left"), right: held.has("right"), ...actions };
  }
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(innerWidth * dpr); canvas.height = Math.round(innerHeight * dpr);
    viewWidth = Math.max(720, innerWidth / innerHeight * 540);
    displayScale = innerWidth / viewWidth; offsetY = (innerHeight - 540 * displayScale) / 2;
    syncHud();
  }
  function frame(ms) {
    const dt = last ? Math.min(.08, (ms - last) / 1000) : 0; last = ms; visualTime += dt;
    if (currentScreen === "ending" && !paused() && !document.hidden) {
      endingTime += dt;
      const scene = C.ENDING.filter(s => endingTime >= s.at).at(-1);
      $("endingTitle").textContent = scene.title; $("endingText").textContent = scene.text;
      $("endingMedal").textContent = endingTime < 13 ? "PART I · GREEN RETURNS" : "PART I · TO BE CONTINUED";
      $("ending").dataset.scene = endingTime < 13 ? "restored" : "mystery";
      $("endingMap").hidden = endingTime < 27;
    }
    if (toastTime > 0) { toastTime -= dt; if (toastTime <= 0) $("toast").hidden = true; }
    if (noticeTime > 0 && !paused() && !document.hidden) { noticeTime -= dt; if (noticeTime <= 0) $("recordNotice").hidden = true; }
    if (currentScreen === "play" && game && !paused() && !document.hidden) {
      accumulator += dt;
      while (accumulator >= 1 / 60 && game.state === "playing" && !paused()) {
        P.step(game, input(), 1 / 60, save.points); Object.keys(actions).forEach(k => actions[k] = false);
        accumulator -= 1 / 60; handleEvents();
      }
      const target = P.clamp(game.player.x - viewWidth * .42, 0, Math.max(0, game.stage.length - viewWidth));
      game.camera += (target - game.camera) * Math.min(1, dt * 8);
      syncHud();
      if (game.stage.id === 1) {
        const index = game.player.x < 330 ? 0 : game.player.x < 700 ? 1 : game.player.x < 1150 ? 2 : 3;
        if (index > tutorialStep) { tutorialStep = index; $("tutorialHint").textContent = ["左右ボタン / A・D で移動", "上ボタン / W でジャンプ", "空中で下ボタン / S → 急降下", "敵の上から急降下！"][index]; }
        if (game.player.x > 1700) $("tutorialHint").hidden = true;
      }
    }
    if (writePending && ms - lastSave > 1200) { writeSave(); lastSave = ms; }
    const dpr = Math.min(devicePixelRatio || 1, 2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = "#234e40"; ctx.fillRect(0, 0, innerWidth, innerHeight);
    ctx.translate(0, offsetY); ctx.scale(displayScale, displayScale);
    if (game?.shake > 0 && currentScreen === "play" && !matchMedia("(prefers-reduced-motion: reduce)").matches) ctx.translate(Math.sin(ms * .09) * 2, Math.cos(ms * .1) * 2);
    Art.render(ctx, currentScreen === "play" || currentScreen === "result" ? game : null, currentScreen === "ending" ? endingTime : game && currentScreen === "play" ? game.time : visualTime, viewWidth, currentScreen === "ending");
    requestAnimationFrame(frame);
  }
  function openMenu() { if (paused()) return; clearInput(); $("replayEnding").hidden = !save.endingSeen; $("menu").showModal(); $("menuButton").setAttribute("aria-expanded", "true"); syncHud(); sound.pause(); }
  function updateJournalBadge() {
    const count = save.records.filter(id => !save.readRecords.includes(id)).length;
    $("journalBadge").textContent = count; $("journalBadge").hidden = count === 0;
    $("journalButton").classList.toggle("has-unread", count > 0);
  }
  function openJournal(id) {
    if (paused()) return;
    selectedRecord = id || save.records.find(r => !save.readRecords.includes(r)) || selectedRecord || save.records.at(-1);
    clearInput(); renderJournal(); $("journal").showModal();
    $("journalButton").setAttribute("aria-expanded", "true"); syncHud(); sound.pause();
  }
  function renderJournal() {
    const journal = $("researchNotes"); journal.replaceChildren();
    $("journalCount").textContent = `${save.records.length} / 50 記録を発見`;
    const record = selectedRecord && save.records.includes(selectedRecord) ? C.record(selectedRecord) : null;
    if (record && !save.readRecords.includes(record.id)) { save.readRecords.push(record.id); writeSave(); }
    $("recordNumber").textContent = record ? `ARCHIVE ${String(record.stage).padStart(2, "0")} / ${P.STAGES[record.stage - 1].biome.name}` : "YOUR FIRST DISCOVERY AWAITS";
    $("recordTitle").textContent = record ? record.title : "失われた世界の声を、集めよう。";
    $("recordBody").textContent = record ? record.text : "ステージにある、青く光る記録端末に触れるとノートが手に入るよ。集めた記録はここに残り、何度でも読み返せます。";
    if (!record) journal.textContent = "まだ記録はありません。";
    for (const id of [...save.records].sort((a, b) => C.record(a).stage - C.record(b).stage)) {
      const r = C.record(id), entry = document.createElement("button"), number = document.createElement("small"), title = document.createElement("strong");
      entry.className = "archive-entry"; entry.setAttribute("aria-current", String(id === selectedRecord));
      number.textContent = `STAGE ${String(r.stage).padStart(2, "0")}${save.readRecords.includes(id) ? "" : " · 未読"}`;
      title.textContent = r.title; entry.append(number, title);
      entry.addEventListener("click", () => { selectedRecord = id; renderJournal(); $("recordTitle").scrollIntoView({ block: "nearest" }); });
      journal.append(entry);
    }
    updateJournalBadge();
  }
  function closeJournal() { $("journal").close(); clearInput(); accumulator = 0; $("journalButton").setAttribute("aria-expanded", "false"); syncHud(); sound.resume(); }
  function closeWelcome(read) { save.journalGuideSeen = true; writeSave(); $("journalWelcome").close(); clearInput(); accumulator = 0; syncHud(); if (read) openJournal(newestRecord); }
  $("journalButton").addEventListener("click", () => openJournal());
  $("closeJournal").addEventListener("click", closeJournal);
  $("journal").addEventListener("cancel", e => { e.preventDefault(); closeJournal(); });
  $("welcomeRead").addEventListener("click", () => closeWelcome(true));
  $("welcomeContinue").addEventListener("click", () => closeWelcome(false));
  $("journalWelcome").addEventListener("cancel", e => { e.preventDefault(); closeWelcome(false); });
  $("readNewRecord").addEventListener("click", () => openJournal(newestRecord));
  $("dismissRecord").addEventListener("click", () => { $("recordNotice").hidden = true; noticeTime = 0; });
  function closeMenu() { $("menu").close(); clearInput(); accumulator = 0; $("menuButton").setAttribute("aria-expanded", "false"); syncHud(); if (currentScreen === "shop") renderShop(); sound.resume(); }
  // Native clicks belong to menus; only the actual play controls cancel touch defaults.
  $("startButton").addEventListener("click", () => { show("map"); sound.unlock(); });
  $("mapScroll").addEventListener("scroll", () => {
    if (currentScreen !== "map") return;
    region = P.clamp(Math.floor(($("mapScroll").scrollLeft + $("mapScroll").clientWidth / 2) / 1120), 0, 9);
    [...$("regionTabs").children].forEach((tab, r) => tab.classList.toggle("active", r === region));
  }, { passive: true });
  $("shopButton").addEventListener("click", () => show("shop"));
  document.querySelectorAll("[data-map]").forEach(b => b.addEventListener("click", goMap));
  $("retryButton").addEventListener("click", () => {
    if (C.retry(game)) { accumulator = 0; show("play"); sound.theme("stage", game.stage.region); }
    else startStage(game.stage.id);
  });
  $("replayEnding").addEventListener("click", () => { if (save.endingSeen) { closeMenu(); show("ending"); sound.theme("ending"); } });
  $("menuButton").addEventListener("click", openMenu);
  $("hintButton").addEventListener("click", () => {
    openMenu();
    const log = $("recentHints"); log.replaceChildren();
    for (const text of hintHistory) { const p = document.createElement("p"); p.textContent = text; log.append(p); }
    $("hintGuide").open = true;
    $("hintGuide").scrollIntoView({ block: "start" });
  });
  $("closeMenu").addEventListener("click", closeMenu); $("resumeButton").addEventListener("click", closeMenu);
  $("restartButton").addEventListener("click", () => { const id = game?.stage.id; closeMenu(); if (id) startStage(id); });
  $("menu").addEventListener("cancel", e => { e.preventDefault(); closeMenu(); });
  $("mapFromMenu").addEventListener("click", () => { closeMenu(); goMap(); });
  $("soundButton").addEventListener("click", () => { const muted = sound.toggle(); $("soundButton").textContent = `音：${muted ? "オフ" : "オン"}`; });
  const keyMap = { a: "left", arrowleft: "left", d: "right", arrowright: "right", w: "jump", arrowup: "jump", " ": "jump", s: "dive", arrowdown: "dive", e: "shoot" };
  window.addEventListener("keydown", e => {
    if (e.key === "Escape" && currentScreen === "play" && !paused()) { e.preventDefault(); openMenu(); return; }
    if (currentScreen !== "play" || paused()) return;
    const action = keyMap[e.key.toLowerCase()]; if (!action) return;
    e.preventDefault(); if (action === "left" || action === "right") keys.add(action); else if (!e.repeat) actions[action] = true;
  });
  window.addEventListener("keyup", e => keys.delete(keyMap[e.key.toLowerCase()]));
  document.querySelectorAll("[data-control]").forEach(b => {
    b.addEventListener("pointerdown", e => {
      if (currentScreen !== "play" || paused() || b.disabled) return;
      e.preventDefault();
      // A cancelled/system-interrupted pointer may already have lost capture.
      try { b.setPointerCapture(e.pointerId); } catch {}
      pointers.set(e.pointerId, b.dataset.control); b.classList.add("held");
      if (b.dataset.control in actions) actions[b.dataset.control] = true;
    });
    const release = e => { pointers.delete(e.pointerId); if (![...pointers.values()].includes(b.dataset.control)) b.classList.remove("held"); };
    b.addEventListener("pointerup", release); b.addEventListener("pointercancel", release); b.addEventListener("lostpointercapture", release);
    b.addEventListener("touchstart", e => e.preventDefault(), { passive: false });
    b.addEventListener("contextmenu", e => e.preventDefault()); b.addEventListener("selectstart", e => e.preventDefault());
  });
  canvas.addEventListener("contextmenu", e => e.preventDefault());
  canvas.addEventListener("touchstart", e => e.preventDefault(), { passive: false });
  window.addEventListener("blur", () => { clearInput(); if (currentScreen === "play" && !paused()) openMenu(); });
  document.addEventListener("visibilitychange", () => { clearInput(); writeSave(); if (document.hidden && currentScreen === "play" && !paused()) openMenu(); });
  window.addEventListener("pagehide", writeSave); window.addEventListener("resize", resize);
  $("points").textContent = save.points; $("version").textContent = `バージョン ${P.VERSION}`;
  $("menu").querySelector(".instructions").append(document.createTextNode("\n葉っぱゲージは3発分、2秒で1発回復。ボスは急降下で弱点が開き、体力が半分になると本気モードになります。"));
  const guide = document.createElement("details"); guide.id = "hintGuide";
  const heading = document.createElement("summary"); heading.textContent = "仕掛けのヒント（16種類）"; guide.append(heading);
  const backToPlay = document.createElement("button"); backToPlay.className = "small-button"; backToPlay.textContent = "閉じてつづける";
  backToPlay.addEventListener("click", closeMenu); guide.append(backToPlay);
  const recent = document.createElement("div"); recent.id = "recentHints"; guide.append(recent);
  for (const [name, hint] of Object.values(window.ParadiseGimmicks.INFO)) {
    const line = document.createElement("p"); line.textContent = `${name}：${hint}`; guide.append(line);
  }
  $("menu").append(guide);
  updateJournalBadge(); resize(); show("title"); requestAnimationFrame(frame);

  function createSound() {
    let audio = null, master = null, timer = null, score = window.ParadiseMusic.select("title"), beat = 0, muted = false, paused = false;
    function note(midi, len, volume = .035, type = "sine") {
      if (!audio || muted || paused || midi === null) return;
      const osc = audio.createOscillator(), gain = audio.createGain(), now = audio.currentTime;
      osc.type = type; osc.frequency.value = 440 * 2 ** ((midi - 69) / 12);
      gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(volume, now + .015); gain.gain.exponentialRampToValueAtTime(.0001, now + len);
      osc.connect(gain).connect(master); osc.start(); osc.stop(now + len); osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    }
    function tick() {
      if (!paused && !muted) {
        note(score.notes[beat % score.notes.length], score.stepMs / 1000 * 1.2, score.wave === "square" || score.wave === "sawtooth" ? .009 : .024, score.wave);
        const meter = score.meter || 4;
        if (beat % meter === 0) note(score.bass[Math.floor(beat / meter) % score.bass.length], score.stepMs / 1000 * meter, .018);
        if (score.drums) { note(beat % 4 === 0 ? 30 : 42, .065, .035, "triangle"); if (beat % 2) note(96, .025, .008, "square"); }
        beat++;
      }
      timer = setTimeout(tick, score.stepMs);
    }
    function unlock() {
      try {
        if (!audio) { const Audio = window.AudioContext || window.webkitAudioContext; if (!Audio) return; audio = new Audio(); master = audio.createGain(); master.gain.value = .7; master.connect(audio.destination); }
        void audio.resume().catch(() => {}); if (!timer) tick();
      } catch { /* Audio support must never block menu navigation. */ }
    }
    return { unlock,
      theme(next, region = 0, phase = 1) { score = window.ParadiseMusic.select(next, region, phase); beat = 0; if (timer) clearTimeout(timer); timer = null; if (audio) tick(); },
      pause() { paused = true; if (audio) void audio.suspend().catch(() => {}); },
      resume() { paused = false; if (audio) void audio.resume().catch(() => {}); },
      toggle() { muted = !muted; if (master) master.gain.value = muted ? 0 : .7; if (!muted) unlock(); return muted; },
      effect(type) {
        if (type === "record") { [76, 83, 88].forEach(n => note(n, .7, .025, "sine")); return; }
        const tones = { jump: 77, spring: 89, crack: 42, dive: 45, land: 43, grass: 89, hit: 62, defeat: 84, pickup: 88, purchase: 86, shoot: 82, hurt: 38, step: 40, bossAttack: 35, bossDefeat: 91, drop: 93 };
        if (tones[type]) note(tones[type], type === "step" ? .035 : .16, type === "step" || type === "grass" ? .01 : .04, "triangle");
      } };
  }
})();
