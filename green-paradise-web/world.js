(function (root) {
  "use strict";
  const VERSION = "0.2.0";
  const FLOOR = 430;
  const GRAVITY = 1500;
  const BIOMES = [
    { name: "はじまりの森", sub: "THE FIRST SPROUT", sky: "#a9dace", light: "#f4f0ce", far: "#79aaa1", near: "#397b69", soil: "#665344", edge: "#b2a078", accent: "#d3ef8a", decor: "forest", boss: "スモッグ・タートル", skill: "wave", tip: "地面の波はジャンプ！ 上から急降下しよう。" },
    { name: "こはくの砂漠", sub: "AMBER DUNES", sky: "#edcbaa", light: "#fff0c2", far: "#d49b76", near: "#a8684f", soil: "#ab7853", edge: "#efc481", accent: "#ffdb7b", decor: "desert", boss: "サンド・ブルドーザー", skill: "charge", tip: "光ったら突進の合図。飛びこえて背中をねらおう。" },
    { name: "水晶のどうくつ", sub: "CRYSTAL HOLLOW", sky: "#203e53", light: "#447c83", far: "#285269", near: "#163544", soil: "#3c5059", edge: "#78b5bd", accent: "#9ef4ef", decor: "crystal", boss: "クリスタル・ガード", skill: "shield", tip: "青いバリアが消えたらチャンス！" },
    { name: "さびいろ工場", sub: "RUSTWORK GARDENS", sky: "#c8bbaa", light: "#f1dcc0", far: "#a29b90", near: "#606f66", soil: "#655e53", edge: "#b7ab82", accent: "#ffd089", decor: "factory", boss: "ボイラー・キング", skill: "rain", tip: "地面の赤い印から離れよう。火の玉が落ちてくる！" },
    { name: "きのこの湿地", sub: "MUSHROOM MARSH", sky: "#718f9d", light: "#c4d8ab", far: "#557e80", near: "#2b585a", soil: "#515346", edge: "#8caa7b", accent: "#efd7ac", decor: "mushroom", boss: "ポイズン・マッシュ", skill: "poison", tip: "緑の水たまりをよけて、急降下！" },
    { name: "しずかな雪山", sub: "FROSTBOUND PEAKS", sky: "#bedde4", light: "#f6f4df", far: "#95b6c7", near: "#628b9c", soil: "#647b87", edge: "#ecf6ec", accent: "#c8f4ff", decor: "snow", boss: "フロスト・イエティ", skill: "jump", tip: "大ジャンプの着地に注意。着地のあとがチャンス！" },
    { name: "夕やけの峡谷", sub: "SUNSET CANYON", sky: "#e7af91", light: "#f9d3a3", far: "#bb8075", near: "#815c62", soil: "#865b4f", edge: "#d49c71", accent: "#ffd19a", decor: "canyon", boss: "サンダー・ホーク", skill: "storm", tip: "黄色い印に雷が落ちるよ。止まらず移動しよう。" },
    { name: "星あかりの森", sub: "STARLIT WOODS", sky: "#172f43", light: "#35656b", far: "#214d59", near: "#163b42", soil: "#344a43", edge: "#799b7b", accent: "#deeda6", decor: "night", boss: "ナイト・モス", skill: "fan", tip: "広がる光の玉のすきまをぬけよう。" },
    { name: "雲の上の遺跡", sub: "SKY SANCTUARY", sky: "#9ccacb", light: "#fff4da", far: "#93b7ba", near: "#648f91", soil: "#78867a", edge: "#dfdec1", accent: "#fff2b0", decor: "ruins", boss: "エンシェント・ゴーレム", skill: "quake", tip: "波と突進を使うよ。光る合図をよく見よう！" },
    { name: "さいごの大樹", sub: "HEART OF PARADISE", sky: "#698b83", light: "#efdf9e", far: "#598075", near: "#315f51", soil: "#544c3f", edge: "#c0af74", accent: "#f3ed9a", decor: "ancient", boss: "ゼロ・パラダイス", skill: "final", tip: "波・火の玉・バリアを使う最後の敵。バリアが消えたら攻撃！" },
  ];
  const BOSSES = BIOMES.map((b, i) => ({ name: b.boss, skill: b.skill, tip: b.tip, hp: 8 + i * 2 }));
  const ENEMIES = {
    crawler: { w: 44, h: 28, speed: 36, hp: 2, points: 25 },
    roller: { w: 44, h: 40, speed: 70, hp: 2, points: 35 },
    hopper: { w: 40, h: 36, speed: 28, hp: 2, points: 40 },
    drone: { w: 46, h: 30, speed: 44, hp: 2, points: 45 },
    tank: { w: 58, h: 42, speed: 24, hp: 4, points: 60 },
  };
  function random(seed) {
    return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  function makeStage(id) {
    const region = Math.floor((id - 1) / 5), local = (id - 1) % 5;
    const rng = random(id * 931 + 71), platforms = [], enemies = [], crystals = [];
    let x = 0, y = FLOOR;
    const count = id === 1 ? 5 : 6 + Math.floor(region / 3) + local;
    for (let n = 0; n < count; n++) {
      // Every gap and rise is reachable with the starting jump, without upgrades.
      const width = n === 0 ? 620 : 270 + Math.floor(rng() * 170);
      const p = { x, y, w: width, h: 600 - y };
      platforms.push(p);
      if (n > 0) {
        const types = ["crawler", "roller", "hopper", "drone", "tank"];
        const type = id === 1 ? "crawler" : types[(n + region + local) % Math.min(5, 2 + region)];
        if (id !== 1 || n === 2) enemies.push({ type, x: x + width * .55, platform: n });
        crystals.push({ x: x + 64, y: y - 66, w: 16, h: 20 });
      }
      x += width + (id === 1 ? 62 : 60 + Math.floor(rng() * (24 + region * 3)));
      y = clamp(y + (Math.floor(rng() * 3) - 1) * 24, 358, FLOOR);
    }
    const boss = local === 4 ? BOSSES[region] : null;
    const last = platforms[platforms.length - 1];
    last.w = boss ? 1150 : 620;
    last.y = FLOOR; last.h = 170;
    if (boss) {
      // Leave the arena free of ordinary enemies.
      for (let n = enemies.length - 1; n >= 0; n--) if (enemies[n].platform === platforms.length - 1) enemies.splice(n, 1);
      enemies.push({ type: "boss", x: last.x + 610, platform: platforms.length - 1 });
    }
    return { id, region, local, biome: BIOMES[region], boss, platforms, enemies, crystals,
      name: id === 1 ? "はじめの一歩" : boss ? boss.name : ["芽ぶきの道", "風の通り道", "ひみつの小径", "大樹への道"][local],
      length: last.x + last.w, goalX: last.x + last.w - 120,
      bonus: 100 + id * 12 + (boss ? 180 : 0), cost: 90 + id * 12 };
  }
  const STAGES = Array.from({ length: 50 }, (_, i) => makeStage(i + 1));
  const UPGRADES = [
    { id: "jump", name: "ジャンプ", text: "もっと高くとべる", cost: 90, max: 4 },
    { id: "speed", name: "スピード", text: "移動が少し速くなる", cost: 80, max: 4 },
    { id: "energy", name: "エネルギー", text: "ハートが1つ増える", cost: 110, max: 4 },
    { id: "dropRate", name: "アイテム運", text: "葉っぱの出る確率 +3%", cost: 120, max: 4 },
    { id: "damage", name: "こうげき", text: "急降下 +1 / 葉っぱ +0.5", cost: 140, max: 4 },
  ];
  function sanitizeSave(raw) {
    raw = raw && typeof raw === "object" ? raw : {};
    const num = (n, max) => clamp(Number.isFinite(n) ? Math.floor(n) : 0, 0, max);
    const highestCleared = num(raw.highestCleared, 50);
    const clearedStages = Array.isArray(raw.clearedStages)
      ? [...new Set(raw.clearedStages.filter(n => Number.isInteger(n) && n >= 1 && n <= 50))]
      : Array.from({ length: highestCleared }, (_, i) => i + 1);
    return { points: num(raw.points, 9999999), highestCleared, clearedStages,
      unlockedStages: Math.max(1, Math.min(50, highestCleared + 1), num(raw.unlockedStages, 50)),
      upgrades: Object.fromEntries(UPGRADES.map(u => [u.id, num(raw.upgrades?.[u.id], u.max)])),
      lastDailyBonus: typeof raw.lastDailyBonus === "string" ? raw.lastDailyBonus : "",
      endingSeen: raw.highestCleared >= 50 && !!raw.endingSeen };
  }
  function createGame(stage, save) {
    const upgrades = { ...save.upgrades };
    return { stage, upgrades, time: 0, state: "playing", camera: 0, score: 0, earned: 0, events: [],
      grass: new Set(), drops: [], shots: [], hazards: [], particles: [], crystals: stage.crystals.map(c => ({ ...c })),
      leaf: false, cooldown: 0, shake: 0, arenaEntered: false,
      player: { x: 80, y: FLOOR - 52, w: 36, h: 52, vx: 0, vy: 0, facing: 1, grounded: true, dive: false,
        hp: 4 + upgrades.energy, maxHp: 4 + upgrades.energy, invincible: 0, coyote: .1, jumpBuffer: 0 },
      enemies: stage.enemies.map((e, i) => {
        const p = stage.platforms[e.platform], boss = e.type === "boss";
        const def = boss ? { w: 100, h: 78, hp: stage.boss.hp, speed: 36, points: 150 + stage.region * 30 } : ENEMIES[e.type];
        return { ...e, ...def, maxHp: def.hp, x: e.x, y: p.y - def.h, baseY: p.y - def.h, baseX: e.x,
          lo: p.x + 24, hi: p.x + p.w - def.w - 24, dir: -1, alive: true, age: i * .7, hit: 0,
          shield: false, boss, cycle: 0, attack: 0, warning: false };
      }) };
  }
  function emit(g, type, data = {}) { g.events.push({ type, ...data }); }
  function particles(g, x, y, color, count = 16) {
    for (let i = 0; i < count; i++) {
      const angle = i * 2.399, speed = 35 + i % 5 * 22;
      g.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 60, life: .8, color, size: 3 + i % 4 });
    }
  }
  function grass(g, x, radius = 18, floor = null) {
    let count = 0;
    for (const p of g.stage.platforms) {
      if (floor !== null && p.y !== floor) continue;
      for (let k = Math.max(p.x, Math.floor((x - radius - p.x) / 20) * 20 + p.x); k < Math.min(p.x + p.w, x + radius); k += 20) {
        const key = `${k}:${p.y}`;
        if (!g.grass.has(key)) { g.grass.add(key); count++; }
      }
    }
    if (count) { emit(g, "grass"); g.earned += count; emit(g, "points", { amount: count }); }
  }
  function damagePlayer(g) {
    const p = g.player;
    if (p.invincible > 0 || g.state !== "playing") return;
    p.hp--; p.invincible = 1.4; p.vy = -250; p.dive = false; g.shake = .15;
    emit(g, "hurt");
    if (p.hp <= 0) { g.state = "lost"; emit(g, "lost", { reason: "エネルギーがなくなった。強化してまた挑戦しよう。" }); }
  }
  function hitEnemy(g, e, damage, rng = Math.random) {
    if (!e.alive) return false;
    if (e.shield) { particles(g, e.x + e.w / 2, e.y, "#b1f0ff", 8); emit(g, "blocked"); return false; }
    e.hp -= damage; e.hit = .22;
    particles(g, e.x + e.w / 2, e.y + 10, "#daf5a0"); emit(g, "hit");
    if (e.hp <= 0) {
      e.alive = false; g.score += e.points; g.earned += e.points;
      emit(g, "points", { amount: e.points }); emit(g, "defeat", { points: e.points });
      const platform = g.stage.platforms[e.platform];
      grass(g, e.x + e.w / 2, e.boss ? 220 : 80, platform.y);
      if (rng() < .1 + .03 * g.upgrades.dropRate) {
        g.drops.push({ x: e.x + e.w / 2 - 13, y: e.y, w: 26, h: 26, vy: -100 }); emit(g, "drop");
      }
      if (e.boss) { g.hazards = []; g.shake = .3; emit(g, "bossDefeat"); }
    }
    return true;
  }
  function shoot(g, points) {
    if (!g.leaf || points < 1 || g.cooldown > 0 || g.state !== "playing") return false;
    const p = g.player;
    g.cooldown = .26;
    g.shots.push({ x: p.x + p.w / 2, y: p.y + 30, w: 18, h: 12, vx: p.facing * 460, life: 1.4 });
    emit(g, "points", { amount: -1 }); emit(g, "shoot"); return true;
  }
  function attack(g, e, kind) {
    const p = g.player, floor = g.stage.platforms[e.platform].y;
    const add = h => g.hazards.push({ x: e.x, y: floor - 20, w: 22, h: 20, vx: 0, vy: 0, life: 4, delay: 0, ...h });
    if (kind === "wave" || kind === "quake" || kind === "jump") {
      for (const dir of [-1, 1]) add({ x: e.x + e.w / 2, vx: dir * (kind === "quake" ? 210 : 150), kind: "wave" });
    } else if (kind === "rain" || kind === "storm") {
      for (let i = -1; i <= 1; i++) add({ x: clamp(p.x + i * 100, e.lo, e.hi + e.w), y: kind === "rain" ? 80 : floor - 130,
        w: kind === "rain" ? 22 : 28, h: kind === "rain" ? 22 : 130, vy: kind === "rain" ? 220 : 0,
        life: kind === "rain" ? 3 : .6, delay: .85, kind });
    } else if (kind === "poison") {
      add({ x: clamp(p.x - 30, e.lo, e.hi), y: floor - 10, w: 84, h: 10, delay: .7, life: 2.5, kind });
    } else if (kind === "fan") {
      const dir = p.x < e.x ? -1 : 1;
      for (let i = -1; i <= 1; i++) add({ x: e.x + e.w / 2, y: e.y + 35, vx: dir * 150, vy: i * 60, kind });
    }
  }
  function updateBoss(g, e, dt) {
    const p = g.player;
    if (!g.arenaEntered) return;
    const previousCycle = e.cycle;
    e.cycle += dt;
    let skill = g.stage.boss.skill;
    if (skill === "final") skill = ["wave", "rain", "shield", "fan"][e.attack % 4];
    const period = 3.8;
    e.warning = e.cycle > period - .85;
    e.shield = skill === "shield" && e.cycle < 1.9;
    let speed = 26;
    if ((skill === "charge" || skill === "quake") && e.cycle < .65 && e.attack > 0) speed = 280;
    if (skill === "jump") {
      // Rest first, then warn, jump, and release shockwaves on landing.
      const jumpTime = e.cycle - 1.2;
      e.warning = e.cycle > .5 && jumpTime < 0;
      e.y = e.baseY - Math.sin(clamp(jumpTime / 1.1, 0, 1) * Math.PI) * 125;
      if (previousCycle < 2.3 && e.cycle >= 2.3) { attack(g, e, skill); emit(g, "bossAttack"); }
    }
    else e.y = e.baseY;
    e.x += speed * e.dir * dt;
    if (e.x <= e.lo || e.x >= e.hi) { e.x = clamp(e.x, e.lo, e.hi); e.dir *= -1; }
    if (e.cycle >= period) {
      e.cycle = 0; e.dir = p.x < e.x ? -1 : 1;
      if (skill !== "jump") { attack(g, e, skill); emit(g, "bossAttack"); }
      e.attack++;
    }
  }
  function step(g, input, dt, points = 0) {
    if (g.state !== "playing") return;
    const p = g.player, stage = g.stage;
    g.time += dt; g.cooldown = Math.max(0, g.cooldown - dt); g.shake = Math.max(0, g.shake - dt);
    p.invincible = Math.max(0, p.invincible - dt);
    p.coyote = p.grounded ? .1 : Math.max(0, p.coyote - dt);
    if (input.jump) p.jumpBuffer = .12;
    else p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
    if (p.jumpBuffer > 0 && p.coyote > 0) {
      p.vy = -(550 + 28 * g.upgrades.jump); p.grounded = false; p.coyote = 0; p.jumpBuffer = 0; p.dive = false; emit(g, "jump");
    }
    if (input.dive && !p.grounded) { p.dive = true; p.vy = 820; emit(g, "dive"); }
    if (input.shoot) shoot(g, points);
    const move = Number(!!input.right) - Number(!!input.left);
    p.vx = move * (205 + 18 * g.upgrades.speed);
    if (move) p.facing = move;
    const old = { x: p.x, y: p.y, bottom: p.y + p.h };
    const wasGrounded = p.grounded;
    p.x = clamp(p.x + p.vx * dt, 0, stage.length - p.w);
    p.vy = Math.min(1000, p.vy + GRAVITY * dt); p.y += p.vy * dt; p.grounded = false;
    const boss = g.enemies.find(e => e.boss && e.alive);
    if (boss && p.x >= boss.lo - 20) {
      if (!g.arenaEntered) emit(g, "boss", { text: stage.boss.tip });
      g.arenaEntered = true; p.x = clamp(p.x, boss.lo - 20, stage.goalX - 150);
    }
    // Resolve top crossings, including fast dives, before ordinary contact damage.
    for (const e of g.enemies) {
      if (!e.alive) continue;
      e.hit = Math.max(0, e.hit - dt); e.age += dt;
      if (e.boss) updateBoss(g, e, dt);
      else {
        e.x += e.speed * e.dir * dt;
        if (e.x < e.lo || e.x > e.hi) { e.x = clamp(e.x, e.lo, e.hi); e.dir *= -1; }
        if (e.type === "drone") e.y = e.baseY - 52 + Math.sin(e.age * 2) * 25;
        if (e.type === "hopper") e.y = e.baseY - Math.max(0, Math.sin(e.age * 2.4)) * 65;
      }
      const crosses = p.vy > 0 && old.bottom <= e.y + 12 && p.y + p.h >= e.y && p.y < e.y + e.h;
      const across = p.x + p.w > e.x && p.x < e.x + e.w;
      if (across && crosses && p.dive) {
        hitEnemy(g, e, 2 + g.upgrades.damage); p.y = e.y - p.h - 1; p.vy = -480; p.dive = false;
      } else if (overlap(p, e)) damagePlayer(g);
    }
    for (const floor of stage.platforms) {
      if (p.x + p.w <= floor.x || p.x >= floor.x + floor.w) continue;
      if (p.vy >= 0 && old.bottom <= floor.y + 1 && p.y + p.h >= floor.y) {
        const dive = p.dive;
        p.y = floor.y - p.h; p.vy = 0; p.grounded = true; p.dive = false;
        if (!wasGrounded) { emit(g, "land"); if (dive) { grass(g, p.x + p.w / 2, 100, floor.y); particles(g, p.x, floor.y, "#cbf49b", 22); g.shake = .12; } }
        grass(g, p.x + p.w / 2, 14, floor.y);
      } else if (overlap(p, floor) && old.bottom > floor.y + 1 && old.y < floor.y + floor.h) {
        if (old.x + p.w <= floor.x + 1) p.x = floor.x - p.w;
        else if (old.x >= floor.x + floor.w - 1) p.x = floor.x + floor.w;
      }
    }
    if (p.grounded && move && Math.floor(g.time * 5) !== Math.floor((g.time - dt) * 5)) emit(g, "step");
    g.shots = g.shots.filter(s => {
      const prevX = s.x; s.x += s.vx * dt; s.life -= dt;
      const sweep = { ...s, x: Math.min(prevX, s.x), w: s.w + Math.abs(s.x - prevX) };
      if (stage.platforms.some(f => overlap(sweep, f))) return false;
      const e = g.enemies.find(e => e.alive && overlap(sweep, e));
      if (e) { hitEnemy(g, e, (2 + g.upgrades.damage) / 2); return false; }
      return s.life > 0;
    });
    g.drops = g.drops.filter(d => {
      const bottom = d.y + d.h; d.vy += GRAVITY * dt; d.y += d.vy * dt;
      for (const f of stage.platforms) if (d.x + d.w > f.x && d.x < f.x + f.w && bottom <= f.y + 1 && d.y + d.h >= f.y && d.vy > 0) { d.y = f.y - d.h; d.vy = 0; }
      if (overlap(p, d)) { g.leaf = true; emit(g, "pickup", { leaf: true }); particles(g, d.x, d.y, "#fff0a0"); return false; }
      return d.y < 650;
    });
    g.crystals = g.crystals.filter(c => {
      if (!overlap(p, c)) return true;
      emit(g, "points", { amount: 10 }); emit(g, "pickup"); g.earned += 10; particles(g, c.x, c.y, "#ffe4a8", 8); return false;
    });
    g.hazards = g.hazards.filter(h => {
      if (h.delay > 0) { h.delay -= dt; return true; }
      h.life -= dt; h.x += h.vx * dt; h.y += h.vy * dt;
      if (overlap(p, h)) damagePlayer(g);
      return h.life > 0 && h.y < 560;
    });
    g.particles = g.particles.filter(a => { a.x += a.vx * dt; a.y += a.vy * dt; a.vy += 130 * dt; a.life -= dt; return a.life > 0; });
    if (g.state !== "playing") return;
    if (p.y > 620) { g.state = "lost"; emit(g, "lost", { reason: "穴に落ちた。少し手前からジャンプしてみよう。" }); }
    else if (!boss && overlap(p, { x: stage.goalX, y: FLOOR - 170, w: 70, h: 170 })) {
      g.state = "won"; emit(g, "won");
    }
  }
  const api = { VERSION, FLOOR, GRAVITY, BIOMES, BOSSES, STAGES, UPGRADES, clamp, overlap, random, sanitizeSave, createGame, step, hitEnemy, shoot, grass };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Paradise = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
