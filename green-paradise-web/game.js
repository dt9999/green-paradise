(() => {
  "use strict";
  const P = window.Paradise, Art = window.ParadiseArt;
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
    $("touchControls").hidden = !playing || $("menu").open;
    $("hintButton").hidden = !playing;
    $("tutorialHint").hidden = !playing || game?.stage.id !== 1 || $("menu").open;
    $("bossIntro").hidden = !playing || !(game?.bossIntro > 0) || $("menu").open;
    if (playing && game.bossIntro > 0) $("bossIntroName").textContent = game.stage.boss.name;
    $("leafButton").hidden = !playing || !game.leaf;
    $("rotateHint").hidden = true;
    $("bossHud").hidden = true;
    if (!playing) return;
    $("stageLabel").textContent = `${String(game.stage.id).padStart(2, "0")} / 50 · ${game.stage.biome.name}`;
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
      $("resultText").textContent = reason; $("resultReward").textContent = "集めたポイントはなくならないよ。"; $("retryButton").hidden = false;
    }
    show("result"); sound.theme(win ? "clear" : "lost");
  }
  function handleEvents() {
    const events = game.events.splice(0);
    for (const e of events) {
      if (e.type === "points") points(e.amount);
      else if (e.type === "won") finish(true);
      else if (e.type === "lost") finish(false, e.reason);
      else {
        sound.effect(e.type);
        if (e.type === "drop") toast("葉っぱアイテムが出た！ 拾うとこのステージで発射できるよ。");
        if (e.type === "pickup" && e.leaf) toast("葉っぱの力！ 3発分のゲージ、2秒で1発回復。Eで発射・1発1pt。");
        if (e.type === "newEnemy" || e.type === "gimmick") toast(e.text);
        if (e.type === "weakpoint") toast("弱点が開いた！ 2.4秒間、葉っぱで追撃できるよ！");
        if (e.type === "armored") toast("装甲には葉っぱが効きにくい！ 急降下で弱点を開こう。");
        if (e.type === "boss") { toast(e.text); sound.theme("boss", game.stage.region); }
        if (e.type === "bossPhase") sound.theme("boss", game.stage.region, 2);
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
    if (currentScreen === "ending") endingTime += dt;
    if (toastTime > 0) { toastTime -= dt; if (toastTime <= 0) $("toast").hidden = true; }
    if (currentScreen === "play" && game && !$("menu").open && !document.hidden) {
      accumulator += dt;
      while (accumulator >= 1 / 60 && game.state === "playing") {
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
  function openMenu() { clearInput(); $("menu").showModal(); $("menuButton").setAttribute("aria-expanded", "true"); syncHud(); sound.pause(); }
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
  $("retryButton").addEventListener("click", () => startStage(game.stage.id));
  $("menuButton").addEventListener("click", openMenu);
  $("hintButton").addEventListener("click", () => {
    openMenu();
    const log = $("recentHints"); log.replaceChildren();
    for (const text of hintHistory) { const p = document.createElement("p"); p.textContent = text; log.append(p); }
    $("hintGuide").open = true; $("hintGuide").scrollIntoView({ block: "start" });
  });
  $("closeMenu").addEventListener("click", closeMenu); $("resumeButton").addEventListener("click", closeMenu);
  $("restartButton").addEventListener("click", () => { const id = game?.stage.id; closeMenu(); if (id) startStage(id); });
  $("menu").addEventListener("cancel", e => { e.preventDefault(); closeMenu(); });
  $("mapFromMenu").addEventListener("click", () => { closeMenu(); goMap(); });
  $("soundButton").addEventListener("click", () => { const muted = sound.toggle(); $("soundButton").textContent = `音：${muted ? "オフ" : "オン"}`; });
  const keyMap = { a: "left", arrowleft: "left", d: "right", arrowright: "right", w: "jump", arrowup: "jump", " ": "jump", s: "dive", arrowdown: "dive", e: "shoot" };
  window.addEventListener("keydown", e => {
    if (e.key === "Escape" && currentScreen === "play" && !$("menu").open) { openMenu(); return; }
    if (currentScreen !== "play" || $("menu").open) return;
    const action = keyMap[e.key.toLowerCase()]; if (!action) return;
    e.preventDefault(); if (action === "left" || action === "right") keys.add(action); else if (!e.repeat) actions[action] = true;
  });
  window.addEventListener("keyup", e => keys.delete(keyMap[e.key.toLowerCase()]));
  document.querySelectorAll("[data-control]").forEach(b => {
    b.addEventListener("pointerdown", e => {
      if (currentScreen !== "play" || $("menu").open || b.disabled) return;
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
  window.addEventListener("blur", () => { clearInput(); if (currentScreen === "play" && !$("menu").open) openMenu(); });
  document.addEventListener("visibilitychange", () => { clearInput(); writeSave(); if (document.hidden && currentScreen === "play" && !$("menu").open) openMenu(); });
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
  resize(); show("title"); requestAnimationFrame(frame);

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
        const tones = { jump: 77, spring: 89, crack: 42, dive: 45, land: 43, grass: 89, hit: 62, defeat: 84, pickup: 88, purchase: 86, shoot: 82, hurt: 38, step: 40, bossAttack: 35, bossDefeat: 91, drop: 93 };
        if (tones[type]) note(tones[type], type === "step" ? .035 : .16, type === "step" || type === "grass" ? .01 : .04, "triangle");
      } };
  }
})();
