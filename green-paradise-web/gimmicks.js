(function (root) {
  "use strict";
  const INFO = {
    spring: ["葉っぱバネ", "乗ると大ジャンプ！ 空中で左右に動けるよ。"],
    moving: ["ゆれる丸太", "乗ると左右に運んでくれる。上の宝石を集めよう！"],
    sand: ["さらさら砂", "砂の上はゆっくり。ジャンプで飛びこえよう。"],
    wind: ["砂の追い風", "風が背中を押すよ。矢印を見て進もう。"],
    lift: ["水晶リフト", "上下に動く足場。高くなったらジャンプ！"],
    phase: ["ほたる足場", "光ると乗れる。点滅したら消える合図！"],
    conveyor: ["ベルトの床", "矢印の向きに流されるよ。逆にも歩ける！"],
    steam: ["蒸気パイプ", "赤く光ったら蒸気が出る！ 止まるか飛びこえよう。"],
    mushroom: ["ぽんぽんキノコ", "乗ると跳ねる！ 急降下でさらに高く飛べるよ。"],
    crumble: ["ひびわれ足場", "乗ると崩れるよ。次へジャンプ！ 少し待つと戻る。"],
    ice: ["つるつる氷", "急には止まれない！ 反対の方向でブレーキ。"],
    icicle: ["落ちるつらら", "足もとの赤い印から離れよう。つららが落ちる！"],
    updraft: ["空への風", "風の中でジャンプ！ 上の足場まで浮かべるよ。"],
    switch: ["芽ぶきスイッチ", "上から急降下すると、葉っぱの橋が育つよ！"],
    bridge: ["葉っぱの橋", "スイッチで育った橋。上の道を探検しよう！"],
    brittle: ["こわせる岩", "上から急降下でこわせるよ！ 飛びこえても進める。"],
  };
  const REGIONS = [
    ["spring", "moving"], ["sand", "wind"], ["lift", "phase"], ["conveyor", "steam"],
    ["mushroom", "crumble"], ["ice", "icicle"], ["updraft", "moving"],
    ["switch", "phase"], ["brittle", "lift", "switch", "crumble"],
    ["switch", "updraft", "mushroom", "conveyor", "ice", "lift", "phase", "brittle", "crumble"],
  ];
  const elevated = new Set(["moving", "lift", "phase", "crumble", "bridge"]);
  const intersects = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const on = (p, a) => p.x + p.w > a.x && p.x < a.x + a.w && Math.abs(p.y + p.h - a.y) < 3;
  function build(platforms, region, local, id, crystals) {
    const result = [], recipe = REGIONS[region];
    const add = (kind, x, y, w, extra = {}) => {
      const a = { id: `g${result.length}`, kind, x, y, w, h: 16, ...extra };
      result.push(a); return a;
    };
    for (let n = 0; n < platforms.length - 1; n++) {
      // Keep the spawn, gap edges, tutorial combat and every boss arena clear.
      if (id === 1 && n !== 3) continue;
      const f = platforms[n], x = f.x + (n === 0 ? 300 : 52);
      const kind = id === 1 ? "spring" : recipe[(n + (local === 0 ? 0 : local - 1)) % recipe.length];
      if (elevated.has(kind)) {
        add(kind, x, f.y - (kind === "lift" ? 60 : 85), 118, { range: kind === "moving" ? 48 : 55 });
        crystals.push({ x: x + 50, y: f.y - 180, w: 16, h: 20 });
      } else if (kind === "brittle") {
        add(kind, x, f.y - 64, 72, { h: 64, solid: true });
        crystals.push({ x: x + 28, y: f.y - 112, w: 16, h: 20 });
      } else if (kind === "switch") {
        const button = add(kind, x, f.y, 56);
        for (let j = 0; j < 3; j++) add("bridge", x + 74 + j * 46, f.y - 58 - j * 20, 48, { link: button.id });
        crystals.push({ x: x + 185, y: f.y - 150, w: 16, h: 20 });
      } else if (kind === "updraft") {
        add(kind, x, f.y - 230, 135, { h: 230 });
        add("moving", x + 25, f.y - 170, 100, { range: 35 });
        crystals.push({ x: x + 60, y: f.y - 208, w: 16, h: 20 });
      } else if (kind === "wind") add(kind, x, f.y - 155, 145, { h: 155, force: 65 });
      else add(kind, x, f.y, ["ice", "sand", "conveyor"].includes(kind) ? Math.min(170, f.w - 104) : 56,
        { force: local % 2 ? -70 : 70 });
      // Later levels revisit an earlier idea alongside the new region's toys.
      if (local >= 2 && n === 0 && region > 0 && !["spring", "mushroom"].includes(kind)) add("spring", f.x + 150, f.y, 56);
    }
    return result;
  }
  function create(stage) {
    return stage.gimmicks.map(a => ({ ...a, baseX: a.x, baseY: a.y, oldY: a.y,
      active: a.kind !== "bridge", activated: false, timer: 0, cooldown: 0, warning: false,
      clock: 0, triggered: false, dx: 0, dy: 0 }));
  }
  function update(g, dt, hooks) {
    const p = g.player;
    for (const a of g.gimmicks) {
      const oldX = a.x; a.oldY = a.y; a.clock += dt; a.cooldown = Math.max(0, a.cooldown - dt);
      if (a.kind === "moving") a.x = a.baseX + Math.sin(a.clock * 1.2) * a.range;
      if (a.kind === "lift") a.y = a.baseY - (1 - Math.cos(a.clock * 1.15)) * a.range;
      if (a.kind === "phase") { const t = a.clock % 5; a.active = t < 3.6; a.warning = t >= 2.8 && a.active; }
      if (a.kind === "crumble" && a.triggered) {
        a.timer += dt; a.warning = a.timer < .7; a.active = a.timer < .7;
        if (a.timer >= 3.7) { a.active = true; a.warning = false; a.triggered = false; a.timer = 0; }
      }
      if (a.kind === "bridge") a.active = g.gimmicks.some(s => s.id === a.link && s.activated);
      if (a.kind === "steam") {
        const t = a.clock % 4.6; a.warning = t >= 2.7 && t < 3.5; a.blasting = t >= 3.5;
      }
      if (a.kind === "icicle") {
        if (!a.triggered && a.cooldown === 0 && Math.abs(p.x + p.w / 2 - a.x - a.w / 2) < 115) { a.triggered = true; a.timer = 0; }
        if (a.triggered) {
          a.timer += dt; a.warning = a.timer < 1;
          if (a.timer >= 1) {
            g.hazards.push({ x: a.x + 16, y: a.y - 215, w: 24, h: 36, vx: 0, vy: 310, life: .7, delay: 0, kind: "icicle", floor: a.y });
            a.triggered = false; a.warning = false; a.cooldown = 3;
          }
        }
      }
      a.dx = a.x - oldX; a.dy = a.y - a.oldY;
      if (p.support === a.id) {
        if (a.active && p.grounded) { p.x += a.dx; p.y += a.dy; }
        else { p.support = null; p.grounded = false; }
      }
      if (a.kind !== "bridge" && Math.abs(p.x - a.x) < 240 && !g.seenGimmicks.has(a.kind)) {
        g.seenGimmicks.add(a.kind); hooks.emit(g, "gimmick", { text: `${INFO[a.kind][0]}：${INFO[a.kind][1]}` });
      }
    }
  }
  function motion(g, move, speed, dt) {
    const p = g.player;
    const floor = g.gimmicks.find(a => ["ice", "sand", "conveyor"].includes(a.kind) && p.grounded && on(p, a));
    const target = move * speed * (floor?.kind === "sand" ? .55 : 1);
    if (floor?.kind === "ice") {
      const change = (move ? 420 : 160) * dt;
      p.vx += Math.max(-change, Math.min(change, target - p.vx));
    } else p.vx = target;
    let drift = floor?.kind === "conveyor" ? floor.force : 0;
    for (const a of g.gimmicks) if (intersects(p, a)) {
      if (a.kind === "wind") drift += a.force;
      if (a.kind === "updraft" && !p.grounded && !p.dive) p.vy = Math.max(-360, p.vy - 2100 * dt);
    }
    return p.vx + drift;
  }
  function surfaces(g) { return g.gimmicks.filter(a => (elevated.has(a.kind) || a.solid) && a.active); }
  function land(g, floor, dive, hooks) {
    const p = g.player;
    if (floor.id) p.support = floor.id;
    if (floor.kind === "brittle" && dive) {
      floor.active = false; p.support = null; p.grounded = false;
      hooks.particles(g, floor.x + floor.w / 2, floor.y + 30, "#d4d5ae", 24); hooks.emit(g, "crack");
    }
    if (floor.kind === "crumble" && !floor.triggered) { floor.triggered = true; floor.timer = 0; hooks.emit(g, "crack"); }
    for (const a of g.gimmicks) {
      if (!on(p, a)) continue;
      if (a.kind === "switch" && dive && !a.activated) {
        a.activated = true;
        // Activate before the next physics step so rendering and collision agree.
        g.gimmicks.filter(b => b.link === a.id).forEach(b => b.active = true);
        hooks.particles(g, a.x + a.w / 2, a.y, "#d5f591", 22);
        hooks.emit(g, "gimmick", { text: "葉っぱの橋が育った！ 上の道へジャンプしよう！" }); hooks.emit(g, "purchase");
      }
      if (["spring", "mushroom"].includes(a.kind) && a.cooldown === 0) {
        p.vy = a.kind === "mushroom" && dive ? -810 : -680;
        p.grounded = false; p.coyote = 0; p.support = null; a.cooldown = .25;
        hooks.particles(g, a.x + a.w / 2, a.y, "#e6edac", 12); hooks.emit(g, "spring");
      }
    }
  }
  function hazards(g, hooks) {
    for (const a of g.gimmicks) if (a.kind === "steam" && a.blasting &&
      intersects(g.player, { x: a.x + 6, y: a.y - 88, w: a.w - 12, h: 88 })) hooks.damagePlayer(g);
  }
  const api = { INFO, REGIONS, build, create, update, motion, surfaces, land, hazards };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ParadiseGimmicks = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
