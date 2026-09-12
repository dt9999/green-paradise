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
        const platform = add(kind, x, f.y - (kind === "lift" ? 60 : 85), 118, { range: kind === "moving" ? 48 : 55 });
        crystals.push({ x: x + 50, y: f.y - 180, w: 16, h: 20, sourceId: platform.id });
      } else if (kind === "brittle") {
        const block = add(kind, x, f.y - 64, 72, { h: 64, solid: true });
        crystals.push({ x: x + 28, y: f.y - 112, w: 16, h: 20, sourceId: block.id });
      } else if (kind === "switch") {
        const button = add(kind, x, f.y, 56);
        for (let j = 0; j < 3; j++) add("bridge", x + 74 + j * 60, f.y - 58 - j * 20, 48, { link: button.id });
        crystals.push({ x: x + 185, y: f.y - 150, w: 16, h: 20, sourceId: button.id });
      } else if (kind === "updraft") {
        const wind = add(kind, x, f.y - 230, 135, { h: 230 });
        add("moving", x + 25, f.y - 170, 100, { range: 35 });
        crystals.push({ x: x + 60, y: f.y - 208, w: 16, h: 20, sourceId: wind.id });
      } else if (kind === "wind") add(kind, x, f.y - 155, 145, { h: 155, force: 65 });
      else add(kind, x, f.y, ["ice", "sand", "conveyor"].includes(kind) ? Math.min(170, f.w - 104) : 56,
        { force: local % 2 ? -70 : 70 });
      // Later levels revisit an earlier idea alongside the new region's toys.
      if (local >= 2 && n === 0 && region > 0 && !["spring", "mushroom"].includes(kind)) add("spring", f.x + 150, f.y, 56);
    }
    return result;
  }
  function sweptBounds(a) {
    const range = a.range || 0;
    if (a.kind === "moving") return { x: a.x - range, y: a.y, w: a.w + range * 2, h: a.h };
    if (a.kind === "lift") return { x: a.x, y: a.y - range * 2, w: a.w, h: a.h + range * 2 };
    if (a.kind === "steam") return { x: a.x, y: a.y - 88, w: a.w, h: 104 };
    if (a.kind === "icicle") return { x: a.x, y: a.y - 215, w: a.w, h: 231 };
    if (["spring", "mushroom"].includes(a.kind)) return { x: a.x, y: a.y - 40, w: a.w, h: 56 };
    return { x: a.x, y: a.y, w: a.w, h: a.h };
  }
  function intentionalPair(a, b) {
    return a.encounter && a.encounter === b.encounter &&
      ((a.kind === "updraft" && elevated.has(b.kind)) || (b.kind === "updraft" && elevated.has(a.kind)));
  }
  function auditLayout(stage) {
    const collisions = [];
    for (let i = 0; i < stage.gimmicks.length; i++) for (let j = i + 1; j < stage.gimmicks.length; j++) {
      const a = stage.gimmicks[i], b = stage.gimmicks[j];
      if (!intentionalPair(a, b) && intersects(sweptBounds(a), sweptBounds(b))) collisions.push([a.id, b.id]);
    }
    const embedded = [];
    for (const c of [...stage.crystals, stage.supply, ...stage.targets]) {
      for (const a of stage.gimmicks) if (intersects(c, sweptBounds(a)) && !["wind", "updraft"].includes(a.kind)) embedded.push([c.x, a.id]);
    }
    return { collisions, embedded };
  }
  function refine(stage, enemyTypes) {
    const before = auditLayout(stage);
    const ground = stage.platforms, blocked = new Set([0, 1, 2, ground.length - 2, ground.length - 1]);
    const indexAt = x => ground.findIndex(f => x >= f.x && x < f.x + f.w);
    for (const p of [...stage.checkpoints, ...stage.rooms, ...stage.records, stage.supply, ...stage.targets]) blocked.add(indexAt(p.x));
    stage.encounters = []; stage.safeLandings = [];
    const limit = stage.id === 1 ? 1 : 2 + Math.floor(stage.region / 2);
    for (let n = 3; n < ground.length - 2 && stage.encounters.length < limit; n++) {
      if (blocked.has(n)) continue;
      const f = ground[n], next = ground[n + 1];
      const bounce = stage.region < 2;
      const crossesGap = bounce || stage.region === 4;
      if ((crossesGap && blocked.has(n + 1)) || (!bounce && f.w < 440)) continue;
      const id = `route-${stage.id}-${n}`, end = bounce ? next.x + 160 : f.x + f.w;
      const reserveEnd = crossesGap ? next.x + next.w : end;
      const reservation = { x: f.x, y: 0, w: reserveEnd - f.x, h: 600 };
      stage.gimmicks = stage.gimmicks.filter(a => !intersects(reservation, sweptBounds(a)));
      stage.crystals = stage.crystals.filter(c => !intersects(reservation, c));
      stage.landmarks = stage.landmarks.filter(l => l.x + 118 < f.x || l.x > reserveEnd);
      const route = { id, x: f.x, end, floorY: f.y, type: bounce ? "spring-crossing" : stage.region < 4 ? "lift-balcony" : stage.region === 4 ? "mushroom-balcony" : stage.region === 5 ? "ice-overlook" : stage.region === 6 ? "wind-tower" : stage.region === 7 ? "switch-stair" : "mixed-tower", goalIds: [], part: stage.part };
      let serial = 0;
      const add = (kind, x, y, w, extra = {}) => {
        const a = { id: `${id}-${serial++}`, kind, x, y, w, h: 16, range: 0, encounter: id, ...extra };
        stage.gimmicks.push(a); return a;
      };
      const reward = a => {
        route.goalIds.push(a.id);
        stage.crystals.push({ x: a.x + a.w / 2 - 8, y: a.y - 30, w: 16, h: 20, encounter: id });
      };
      if (bounce) {
        const launch = add("spring", f.x + f.w - 50, f.y, 46);
        const landing = add("moving", f.x + f.w + 10, Math.min(f.y, next.y) - 60, next.x - f.x - f.w + 90);
        route.launchId = launch.id; reward(landing);
        route.arc = { x: launch.x + 23, y: f.y - 26, toX: landing.x + landing.w / 2, toY: landing.y - 25 };
        blocked.add(n + 1);
      } else if (stage.region === 4) {
        const launch = add("mushroom", f.x + 65, f.y, 56);
        const landing = add("moving", f.x + 170, f.y - 110, 145);
        route.launchId = launch.id; reward(landing);
        reward(add("crumble", f.x + f.w - 160, f.y - 180, 90));
        route.arc = { x: launch.x + 28, y: f.y - 30, toX: landing.x + 40, toY: landing.y - 25 };
      } else if (stage.region === 7) {
        const button = add("switch", f.x + 60, f.y, 56); route.launchId = button.id;
        for (let j = 0; j < 3; j++) reward(add("bridge", f.x + (j === 2 ? f.w - 150 : 130 + j * 100), f.y - 65 - j * 65, 80, { link: button.id }));
      } else if (stage.region === 6 || stage.region === 9) {
        const wind = add("updraft", f.x + 30, f.y - 245, 130, { h: 245 }); route.launchId = wind.id;
        add("moving", f.x + 40, f.y - 130, 100);
        reward(add(stage.region === 9 ? "phase" : "moving", f.x + 205, f.y - 195, 120));
        reward(add("moving", f.x + f.w - 130, f.y - 115, 80, { range: stage.region === 9 ? 18 : 0 }));
      } else {
        const lift = add("lift", f.x + 50, f.y - 56, 112, { range: 68 }); route.launchId = lift.id;
        reward(add(stage.region === 8 ? "crumble" : "moving", f.x + 210, f.y - 195, 115));
        if (stage.region === 8) reward(add("phase", f.x + f.w - 130, f.y - 120, 80));
        else add("moving", f.x + f.w - 145, f.y - 70, 70);
        if (stage.region === 3) add("steam", f.x + 220, f.y, 56);
        if (stage.region === 5) add("ice", f.x + 205, f.y, 170);
      }
      if (!bounce) {
        // Catch a missed upper jump before the next gap, then reconnect to solid ground.
        add("moving", f.x + f.w - 70, Math.max(f.y, next.y) - 52, next.x - f.x - f.w + 64, { routeExit: true });
        route.end = next.x + 150;
      }
      stage.safeLandings.push({ x: next.x, y: 0, w: 180, h: next.y });
      stage.encounters.push(route); blocked.add(n); n++;
    }
    // Structural doors and authored routes win over old incidental decorations.
    const doors = new Set(stage.rooms.map(r => r.blockId));
    const priority = a => doors.has(a.id) ? 100 : a.encounter ? 80 : a.routeExit ? 70 : a.kind === "switch" ? 30 : a.link ? 10 : 20;
    const kept = [];
    const safeZones = [stage.supply, ...stage.targets, ...stage.checkpoints.map(p => ({ x: p.x - 16, y: p.y - 60, w: 100, h: 60 })), ...stage.records.filter(r => !r.roomId)];
    for (const a of [...stage.gimmicks].sort((a, b) => priority(b) - priority(a))) {
      if (!a.encounter && !doors.has(a.id) && stage.safeLandings.some(z => intersects(sweptBounds(a), z))) continue;
      if (!doors.has(a.id) && safeZones.some(z => intersects(sweptBounds(a), z))) continue;
      if (!kept.some(b => !intentionalPair(a, b) && intersects(sweptBounds(a), sweptBounds(b)))) kept.push(a);
    }
    stage.gimmicks = kept.filter(a => !a.link || kept.some(b => b.id === a.link));
    // A switch with no remaining bridge is not a useful interaction.
    stage.gimmicks = stage.gimmicks.filter(a => a.kind !== "switch" || stage.gimmicks.some(b => b.link === a.id));
    const clear = c => !stage.gimmicks.some(a => !["updraft", "wind"].includes(a.kind) && intersects(c, sweptBounds(a)));
    const gems = [];
    for (const c of stage.crystals) {
      if (c.sourceId && !stage.gimmicks.some(a => a.id === c.sourceId)) continue;
      if (clear(c) && !gems.some(g => Math.abs(g.x - c.x) < 24 && Math.abs(g.y - c.y) < 24)) gems.push(c);
    }
    stage.crystals = gems;
    for (const c of [stage.supply, ...stage.targets]) if (!clear(c)) {
      const f = ground[indexAt(c.x)];
      for (let x = f.x + 24; x < f.x + f.w - c.w - 24; x += 32) {
        const candidate = { ...c, x };
        if (clear(candidate) && ![stage.supply, ...stage.targets].some(other => other !== c && intersects(candidate, other))) { c.x = x; break; }
      }
    }
    // Keep patrols away from doors, landing zones and solid obstacles, not just spawn points.
    const occupiedPatrols = [];
    stage.enemies = stage.enemies.filter((e, index) => {
      if (e.type === "boss") return true;
      const f = ground[e.platform];
      let spans = [[f.x + 24, f.x + f.w - 24]];
      const def = enemyTypes[e.type], height = def.h + (def.rise || 0) + 8;
      const obstacles = stage.gimmicks.filter(a => intersects(sweptBounds(a), { x: f.x, y: f.y - height, w: f.w, h: height }));
      const exclusions = [...obstacles.map(a => sweptBounds(a)), ...occupiedPatrols, ...stage.safeLandings, ...stage.rooms.map(r => ({ x: r.x - 60, w: 120 })), ...stage.checkpoints.map(r => ({ x: r.x - 60, w: 120 }))];
      for (const a of exclusions) spans = spans.flatMap(([lo, hi]) => a.x >= hi || a.x + a.w <= lo ? [[lo, hi]] : [[lo, Math.max(lo, a.x - 14)], [Math.min(hi, a.x + a.w + 14), hi]]).filter(([lo, hi]) => hi - lo >= 100);
      if (!spans.length) return false;
      let [lo, hi] = spans.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]))[0];
      if (hi - lo >= 240 && stage.enemies.slice(index + 1).some(other => other.platform === e.platform)) hi = lo + Math.floor((hi - lo) / 2) - 10;
      e.patrolMin = lo; e.patrolMax = hi;
      e.x = Math.max(lo, Math.min(hi - 64, e.x));
      occupiedPatrols.push({ x: lo, w: hi - lo });
      return true;
    });
    stage.layoutAudit = { before: { overlaps: before.collisions.length, embedded: before.embedded.length }, after: auditLayout(stage) };
    return stage;
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
      if (a.kind !== "bridge" && !(a.kind === "moving" && a.range === 0) && Math.abs(p.x - a.x) < 240 && !g.seenGimmicks.has(a.kind)) {
        const entrance = a.kind === "brittle" && g.stage.rooms.some(r => r.blockId === a.id);
        g.seenGimmicks.add(a.kind); hooks.emit(g, "gimmick", { text: entrance
          ? "研究室の入口：ブロックを急降下でこわすと、部屋に入れるよ！"
          : `${INFO[a.kind][0]}：${INFO[a.kind][1]}` });
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
  const api = { INFO, REGIONS, build, create, update, motion, surfaces, land, hazards, sweptBounds, auditLayout, refine };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ParadiseGimmicks = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
