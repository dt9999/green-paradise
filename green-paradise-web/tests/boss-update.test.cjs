const test = require("node:test"), assert = require("node:assert/strict");
const P = require("../world.js"), M = require("../music.js");
const fresh = id => P.createGame(P.STAGES[id - 1], P.sanitizeSave({ upgrades: { damage: 7 } }));
const tick = (g, n) => { for (let i = 0; i < n; i++) P.step(g, {}, 1 / 60); };

test("Bosses take at least seven max-power dives, reject rapid repeats and enter phase two once", () => {
  for (const id of [5,10,15,20,25,30,35,40,45,50]) {
    const g = fresh(id), boss = g.enemies.find(e => e.boss); g.enemies = [boss];
    let hits = 0;
    while (boss.alive && hits < 30) {
      assert.ok(P.hitEnemy(g, boss, P.stats(g.upgrades).damage)); hits++;
      const hp = boss.hp;
      assert.equal(P.hitEnemy(g, boss, 99), false); assert.equal(boss.hp, hp);
      tick(g, 46);
    }
    assert.ok(hits >= 7 && hits <= 20); assert.equal(boss.alive, false);
    assert.equal(g.events.filter(e => e.type === "bossPhase").length, 1);
  }
});

test("Boss entrance freezes combat, then resumes safely and happens only once", () => {
  const g = fresh(5), e = g.enemies.find(e => e.boss);
  g.player.x = e.lo; tick(g, 1); assert.equal(g.bossIntro, 1.8);
  const x = g.player.x, y = g.player.y, time = g.time, hp = e.hp;
  assert.equal(P.hitEnemy(g, e, 100), false); assert.equal(e.hp, hp);
  tick(g, 60); assert.equal(g.player.x, x); assert.equal(g.player.y, y); assert.equal(g.time, time);
  tick(g, 50); assert.equal(g.bossIntro, 0); assert.ok(g.player.grounded);
  g.player.x = e.lo - 50; tick(g, 1); assert.ok(g.player.x >= e.lo - 20);
  assert.equal(g.events.filter(e => e.type === "boss").length, 1);
});

test("Every second phase adds a special attack while retaining a warning", () => {
  for (const id of [5,10,15,20,25,30,35,40,45,50]) {
    const g = fresh(id), e = g.enemies.find(e => e.boss); g.enemies = [e];
    g.arenaEntered = true; e.phase = 2; e.hp = e.maxHp / 2;
    g.player.x = e.lo + 30; g.player.invincible = 99;
    let warned = false; const kinds = new Set();
    for (let i = 0; i < 190; i++) { tick(g, 1); warned ||= e.warning; g.hazards.forEach(h => kinds.add(h.kind)); }
    assert.ok(warned); assert.ok(kinds.size >= 1); assert.ok(e.attack >= 1);
  }
});

test("Ten boss scores differ from stage music and intensify in phase two", () => {
  assert.equal(new Set(M.BOSS_TRACKS.map(t => t.notes.join())).size, 10);
  for (let r = 0; r < 10; r++) {
    const first = M.select("boss", r), second = M.select("boss", r, 2);
    assert.notDeepEqual(first.notes, M.select("stage", r).notes);
    assert.ok(first.drums); assert.ok(second.stepMs < first.stepMs);
    assert.ok(first.notes.every(n => Number.isInteger(n) && n >= 40 && n <= 96));
  }
});

test("Early stages are longer and late-stage growth is gradual", () => {
  assert.equal(P.STAGES[0].platforms.length, 7);
  assert.ok(P.STAGES[1].platforms.length >= 8);
  assert.ok(P.STAGES[45].platforms.length - P.STAGES[5].platforms.length <= 2);
});
