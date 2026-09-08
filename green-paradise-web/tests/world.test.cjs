const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../world.js");
const fresh = (id = 1, upgrades = {}) => P.createGame(P.STAGES[id - 1], P.sanitizeSave({ upgrades }));
const tick = (g, n = 1, input = {}) => { for (let i = 0; i < n; i++) P.step(g, input, 1 / 60, 100); };

test("50 deterministic stages, 10 biomes, 10 different bosses", () => {
  assert.equal(P.STAGES.length, 50);
  assert.equal(new Set(P.BIOMES.map(b => b.decor)).size, 10);
  assert.equal(new Set(P.BOSSES.map(b => b.skill)).size, 10);
  assert.deepEqual(P.STAGES.filter(s => s.boss).map(s => s.id), [5,10,15,20,25,30,35,40,45,50]);
  for (const s of P.STAGES) {
    assert.ok(s.goalX < s.length);
    assert.equal(s.platforms.at(-1).y, P.FLOOR);
    assert.ok(s.enemies.every(e => e.x > s.platforms[e.platform].x));
  }
});

for (const speed of [0, 4, 7]) for (const jump of [0, 4, 7]) {
  test(`All gaps are jumpable in both directions: speed ${speed}, jump ${jump}`, () => {
    for (const stage of P.STAGES) for (let i = 0; i < stage.platforms.length - 1; i++) for (const direction of [1, -1]) {
      const g = fresh(stage.id, { speed, jump }); g.enemies = [];
      const a = stage.platforms[direction === 1 ? i : i + 1], b = stage.platforms[direction === 1 ? i + 1 : i];
      g.player.x = direction === 1 ? a.x + a.w - 40 : a.x + 4; g.player.y = a.y - g.player.h;
      let landed = false;
      for (let n = 0; n < 140; n++) {
        P.step(g, { right: direction === 1, left: direction === -1, jump: n === 0 }, 1 / 60);
        if (n > 1 && g.player.grounded) { landed = g.player.x + g.player.w > b.x && g.player.x < b.x + b.w; break; }
        if (g.state !== "playing") break;
      }
      assert.ok(landed, `stage ${stage.id}, gap ${i}, direction ${direction}`);
    }
  });
}

test("Full traversal and tree clears on all 50 layouts", () => {
  for (const stage of P.STAGES) {
    const g = fresh(stage.id); g.enemies = [];
    for (let n = 0; n < 3600 && g.state === "playing"; n++) {
      const p = g.player, f = stage.platforms.find(f => p.x + p.w > f.x && p.x < f.x + f.w && Math.abs(p.y + p.h - f.y) < 1);
      P.step(g, { right: true, jump: p.grounded && f && p.x >= f.x + f.w - 42 }, 1 / 60);
      g.events = [];
    }
    assert.equal(g.state, "won", `stage ${stage.id}`);
    assert.ok(g.grass.size > 50);
  }
});

test("Old saves retain points/upgrades and unlock the new sixth stage", () => {
  const s = P.sanitizeSave({ points: 456, highestCleared: 5, unlockedStages: 5, endingSeen: true, upgrades: { damage: 3 } });
  assert.equal(s.points, 456); assert.equal(s.upgrades.damage, 3);
  assert.equal(s.unlockedStages, 6); assert.equal(s.endingSeen, false); assert.equal(s.clearedStages.length, 5);
  assert.deepEqual(P.sanitizeSave({ highestCleared: 20, clearedStages: [1, 20] }).clearedStages, [1, 20]);
  const bad = P.sanitizeSave({ points: -3, upgrades: { jump: 999, speed: "no" } });
  assert.equal(bad.points, 0); assert.equal(bad.upgrades.jump, 7); assert.equal(bad.upgrades.speed, 0);
});

test("Dive kills, rewards once, and plants grass; ordinary contact hurts", () => {
  for (const dive of [true, false]) {
    const g = fresh(); const e = g.enemies[0];
    g.player.x = e.x; g.player.y = e.y - 55; g.player.vy = 300; g.player.grounded = false;
    tick(g, 1, { dive });
    if (dive) {
      assert.equal(e.alive, false); assert.ok(g.grass.size >= 6); assert.equal(g.player.hp, 4);
      assert.equal(g.events.filter(e => e.type === "defeat").length, 1);
      P.hitEnemy(g, e, 2); assert.equal(g.events.filter(e => e.type === "defeat").length, 1);
    } else { assert.equal(e.hp, 2); assert.equal(g.player.hp, 3); }
  }
});

test("Dive landing plants a wide patch, and rewalking gives no duplicate points", () => {
  const g = fresh(); g.player.y -= 20; g.player.grounded = false;
  tick(g, 1, { dive: true }); tick(g, 4);
  assert.ok(g.grass.size >= 8);
  const earned = g.earned; tick(g, 100); assert.equal(g.earned, earned);
});

test("Leaf drop probability, collection and stage-only unlock", () => {
  for (const [level, roll, dropped] of [[0,.099,true], [0,.1,false], [4,.159,true], [4,.16,false], [7,.204,true], [7,.205,false]]) {
    const g = fresh(1, { dropRate: level }); P.hitEnemy(g, g.enemies[0], 99, () => roll);
    assert.equal(g.drops.length > 0, dropped);
  }
  const g = fresh(); const p = g.player;
  g.drops.push({ x: p.x, y: p.y + 20, w: 26, h: 26, vy: 0 }); tick(g);
  assert.equal(g.leaf, true); assert.equal(g.drops.length, 0); assert.equal(fresh().leaf, false);
});

test("Leaves require unlock and 1pt, have cooldown, deal half dive damage to exposed bosses", () => {
  for (const damage of [0,1,4,7]) {
    const g = fresh(5, { damage }); const e = g.enemies.find(e => e.boss);
    e.openTime = 2.4;
    g.player.x = e.x - 50; g.player.y = e.y; g.player.facing = 1; g.player.grounded = false;
    assert.equal(P.shoot(g, 10), false); g.leaf = true;
    assert.equal(P.shoot(g, 0), false); assert.equal(P.shoot(g, 10), true); assert.equal(P.shoot(g, 10), false);
    tick(g, 10);
    assert.equal(e.hp, e.maxHp - P.stats(g.upgrades).damage / 2);
    assert.equal(g.events.filter(e => e.type === "points" && e.amount === -1).length, 1);
  }
});

test("All bosses need multiple hits, shields block, and defeat clears attacks", () => {
  for (const stage of P.STAGES.filter(s => s.boss)) {
    const g = fresh(stage.id), e = g.enemies.find(e => e.boss);
    e.shield = true; assert.equal(P.hitEnemy(g, e, 2), false); assert.equal(e.hp, e.maxHp);
    e.shield = false; P.hitEnemy(g, e, 2); assert.equal(e.alive, true);
    g.hazards.push({ kind: "wave" });
    for (let n = 0; n < 20 && e.alive; n++) P.hitEnemy(g, e, 2);
    assert.equal(e.alive, false); assert.equal(g.hazards.length, 0);
    assert.ok(g.grass.size >= 18); assert.equal(g.events.filter(e => e.type === "bossDefeat").length, 1);
  }
});

test("Every boss runs its special attack and telegraphs it", () => {
  for (const stage of P.STAGES.filter(s => s.boss)) {
    const g = fresh(stage.id), e = g.enemies.find(e => e.boss);
    g.player.x = e.lo + 50; g.player.y = P.FLOOR - 52;
    let warned = false, shielded = false, fast = false, jumped = false; const kinds = new Set();
    for (let n = 0; n < 1100; n++) {
      g.player.invincible = 100;
      const x = e.x; tick(g);
      warned ||= e.warning; shielded ||= e.shield; fast ||= Math.abs(e.x - x) > 3; jumped ||= e.y < e.baseY - 80;
      g.hazards.forEach(h => kinds.add(h.kind)); g.events = [];
    }
    assert.ok(warned, stage.boss.name);
    const skill = stage.boss.skill;
    if (["wave","quake","jump","final"].includes(skill)) assert.ok(kinds.has("wave"));
    if (["rain","storm","poison","fan"].includes(skill)) assert.ok(kinds.has(skill));
    if (["shield","final"].includes(skill)) assert.ok(shielded);
    if (["charge","quake"].includes(skill)) assert.ok(fast);
    if (skill === "jump") assert.ok(jumped);
  }
});

test("Boss blocks the goal, then permits stage clear", () => {
  const g = fresh(50), boss = g.enemies.find(e => e.boss);
  g.player.x = g.stage.goalX; tick(g); assert.equal(g.state, "playing");
  P.hitEnemy(g, boss, 100); g.player.x = g.stage.goalX; tick(g);
  assert.equal(g.state, "won"); assert.equal(g.events.filter(e => e.type === "won").length, 1);
  tick(g); assert.equal(g.events.filter(e => e.type === "won").length, 1);
});

test("Falling loses; coyote time and buffered jumps work", () => {
  const g = fresh(); g.player.y = 621; tick(g); assert.equal(g.state, "lost");
  const c = fresh(); c.player.x = 621; c.player.grounded = false; c.player.coyote = .07; tick(c, 1, { jump: true }); assert.ok(c.player.vy < 0);
  const b = fresh(); b.player.y = P.FLOOR - 56; b.player.vy = 250; b.player.grounded = false; b.player.coyote = 0;
  tick(b, 1, { jump: true }); tick(b, 2); assert.ok(b.player.vy < 0);
});

test("Seven upgrade levels have progressively expensive prices and smaller stat steps", () => {
  let total = 0;
  for (const u of P.UPGRADES) {
    assert.equal(u.max, 7);
    const prices = Array.from({ length: 7 }, (_, n) => P.upgradeCost(u, n));
    for (let n = 1; n < prices.length; n++) assert.ok(prices[n] > prices[n - 1]);
    assert.equal(prices[6], prices[0] * 32);
    assert.equal(P.upgradeCost(u, 7), null);
    total += prices.reduce((a, b) => a + b, 0);
  }
  assert.equal(total, 84240);
  const u = P.sanitizeSave({ upgrades: { jump: 4, speed: 4, damage: 4, energy: 4, dropRate: 4 }, points: 12345 });
  assert.equal(u.points, 12345); assert.equal(u.upgrades.damage, 4);
  const s = P.stats(u.upgrades);
  assert.equal(s.jump, 614); assert.equal(s.speed, 245); assert.equal(s.damage, 4); assert.equal(s.hp, 6);
  assert.equal(P.sanitizeSave({ upgrades: { damage: 7 } }).upgrades.damage, 7);
});

test("Leaf ammo recharges, rejected shots cost nothing, and restart resets it", () => {
  const g = fresh(); g.enemies = []; g.leaf = true;
  for (let i = 0; i < 3; i++) { g.cooldown = 0; assert.ok(P.shoot(g, 99)); }
  g.cooldown = 0;
  const costs = () => g.events.filter(e => e.type === "points" && e.amount === -1).length;
  assert.equal(costs(), 3); assert.equal(P.shoot(g, 99), false); assert.equal(costs(), 3);
  tick(g, 119); assert.equal(P.shoot(g, 99), false);
  tick(g, 1); assert.equal(P.shoot(g, 99), true); assert.equal(costs(), 4);
  tick(g, 600); assert.equal(g.leafCharge, 3);
  g.state = "lost"; assert.equal(P.shoot(g, 99), false);
  assert.equal(fresh().leafCharge, 3); assert.equal(fresh().leaf, false);
});

test("Ten seconds of attempted leaf spam respects both ammo and cooldown", () => {
  const g = fresh(); g.leaf = true; g.enemies = [];
  tick(g, 600, { shoot: true });
  const count = g.events.filter(e => e.type === "shoot").length;
  assert.ok(count >= 6 && count <= 8, `got ${count} shots, old version allowed about 38`);
  assert.equal(count, g.events.filter(e => e.type === "points" && e.amount === -1).length);
});

test("Boss armor, dive-opened weakpoint, expiry, and shield priority", () => {
  for (const id of [5,15,50]) {
    const g = fresh(id); const e = g.enemies.find(e => e.boss); g.enemies = [e];
    P.hitEnemy(g, e, 1, () => 1, "leaf"); assert.equal(e.hp, e.maxHp - .25);
    P.hitEnemy(g, e, 2, () => 1, "dive"); assert.equal(e.openTime, 2.4);
    const hp = e.hp; P.hitEnemy(g, e, 1, () => 1, "leaf"); assert.equal(e.hp, hp - 1);
    tick(g, 145); assert.equal(e.openTime, 0);
    const after = e.hp; P.hitEnemy(g, e, 1, () => 1, "leaf"); assert.equal(e.hp, after - .25);
    e.shield = true; const blocked = e.hp;
    assert.equal(P.hitEnemy(g, e, 2, () => 1, "dive"), false); assert.equal(e.hp, blocked); assert.equal(e.openTime, 0);
  }
});

test("Each region introduces its own enemy, never early, including tutorial", () => {
  for (const stage of P.STAGES) {
    assert.ok(stage.enemies.some(e => e.type === P.REGION_ENEMIES[stage.region]), `stage ${stage.id}`);
    for (const e of stage.enemies) {
      const r = P.REGION_ENEMIES.indexOf(e.type);
      assert.ok(r <= stage.region);
    }
  }
});

test("All new enemy behaviors stay on their platform and remain defeatable", () => {
  for (let region = 0; region < 10; region++) {
    const type = P.REGION_ENEMIES[region], g = fresh(region * 5 + 1);
    const e = g.enemies.find(e => e.type === type), f = g.stage.platforms[e.platform]; g.enemies = [e];
    g.player.x = f.x + 35; g.player.y = f.y - 52;
    const xs = [], ys = []; let ghost = false, solid = false, warned = false, projectile = false;
    for (let n = 0; n < 600; n++) {
      g.player.invincible = 100; tick(g, 1, { jump: n % 120 === 0 });
      xs.push(e.x); ys.push(e.y); ghost ||= e.intangible; solid ||= !e.intangible; warned ||= e.warning;
      projectile ||= g.hazards.length > 0;
      assert.ok(e.x >= e.lo && e.x <= e.hi && Number.isFinite(e.y), type);
      assert.equal(g.state, "playing", type); g.events = [];
    }
    if (["prism","piston","swooper","mimic"].includes(type)) assert.ok(Math.max(...ys) - Math.min(...ys) > 30, type);
    if (["stump","skater","blink"].includes(type)) assert.ok(Math.max(...xs) - Math.min(...xs) > 20, type);
    if (["burrower","blink"].includes(type)) { assert.ok(ghost && solid); assert.ok(warned); }
    if (["spore","sentinel"].includes(type)) { assert.ok(projectile); assert.ok(warned); }
    for (let n = 0; n < 250 && e.intangible; n++) tick(g);
    assert.equal(e.intangible, false); P.hitEnemy(g, e, 20, () => 1); assert.equal(e.alive, false);
  }
});

test("Intangible enemies cannot deal contact damage or be hit", () => {
  const g = fresh(6), e = g.enemies.find(e => e.type === "burrower"); g.enemies = [e];
  g.player.x = e.x; g.player.y = e.baseY + e.h - g.player.h; tick(g);
  assert.equal(e.intangible, true); assert.equal(g.player.hp, 4);
  assert.equal(P.hitEnemy(g, e, 99), false); assert.equal(e.hp, e.maxHp);
});

test("Ten original area scores have distinct melodies and varied instruments/tempos", () => {
  const music = require("../music.js"); assert.equal(music.TRACKS.length, 10);
  assert.equal(new Set(music.TRACKS.map(s => s.notes.join())).size, 10);
  assert.ok(new Set(music.TRACKS.map(s => s.wave)).size >= 3);
  assert.ok(new Set(music.TRACKS.map(s => s.stepMs)).size >= 6);
  for (let r = 0; r < 10; r++) {
    const score = music.select("stage", r); assert.equal(score, music.TRACKS[r]);
    assert.ok(score.notes.every(n => n === null || Number.isInteger(n) && n >= 40 && n <= 96));
  }
  for (const name of ["title","shop","clear","lost","ending"]) assert.ok(music.select(name).notes.length);
});
