const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../world.js");
const G = require("../gimmicks.js");
const dt = 1 / 60;

function walkTo(g, center) {
  const distance = center - g.player.x - g.player.w / 2;
  const tolerance = P.stats(g.upgrades).speed * dt / 2 + .1;
  return { right: distance > tolerance, left: distance < -tolerance };
}
function advance(g, input = {}) { P.step(g, input, dt, 100); g.events = []; }
function until(g, condition, controls, label, frames = 600) {
  for (let n = 0; n < frames && g.state === "playing"; n++) {
    advance(g, controls(n));
    if (condition()) return;
  }
  assert.fail(`${label}: ${JSON.stringify({ state: g.state, x: g.player.x, feet: g.player.y + 52, support: g.player.support })}`);
}

test("All fifty layouts reserve swept space, pickups and complete route connections", () => {
  for (const s of P.STAGES) {
    assert.deepEqual(G.auditLayout(s), { collisions: [], embedded: [] }, `stage ${s.id}`);
    assert.equal(new Set(s.gimmicks.map(a => a.id)).size, s.gimmicks.length);
    for (const c of s.crystals) if (c.sourceId) assert.ok(s.gimmicks.some(a => a.id === c.sourceId), "no rewards floating above removed lifts");
    assert.ok(s.encounters.length > 0);
    for (const route of s.encounters) {
      assert.equal(route.part, "part1");
      for (const id of [route.launchId, ...route.goalIds]) {
        assert.ok(s.gimmicks.some(a => a.id === id && a.encounter === route.id), id);
      }
      assert.ok(route.end < s.platforms.at(-1).x, "routes must not enter boss arenas");
    }
    for (const e of s.enemies.filter(e => e.type !== "boss")) {
      assert.ok(e.patrolMax - e.patrolMin >= 100, `stage ${s.id}: ${e.type} needs a safe patrol`);
      const height = P.ENEMIES[e.type].h + (P.ENEMIES[e.type].rise || 0);
      const patrol = { x: e.patrolMin, y: s.platforms[e.platform].y - height, w: e.patrolMax - e.patrolMin, h: height };
      for (const a of s.gimmicks) {
        assert.ok(!P.overlap(patrol, G.sweptBounds(a)), `stage ${s.id}: ${e.type} / ${a.id}`);
      }
      for (const zone of s.safeLandings) assert.ok(!P.overlap(patrol, zone), "landing space must stay free of enemies");
      for (const other of s.enemies.filter(other => other !== e && other.platform === e.platform)) {
        assert.ok(e.patrolMax <= other.patrolMin || other.patrolMax <= e.patrolMin, "patrols must not run through each other");
      }
    }
  }
});

test("Declared enemy flight and jump envelopes contain their real movement", () => {
  for (const type of Object.keys(P.ENEMIES)) {
    const stage = P.STAGES.find(s => s.enemies.some(e => e.type === type));
    const g = P.createGame(stage, P.sanitizeSave({})), enemy = g.enemies.find(e => e.type === type);
    g.enemies = [enemy]; g.gimmicks = [];
    Object.assign(g.player, { x: enemy.x, y: stage.platforms[enemy.platform].y - 52, invincible: 100 });
    for (let n = 0; n < 480; n++) {
      advance(g, { jump: n % 90 === 0 });
      assert.ok(enemy.y >= enemy.baseY - (enemy.rise || 0) - .01 && enemy.y <= enemy.baseY + .01, type);
      assert.ok(enemy.x >= enemy.lo && enemy.x <= enemy.hi, type);
      assert.equal(g.state, "playing", type);
    }
  }
});

test("Hints distinguish fixed ledges from moving logs and explain actual room entrances", () => {
  const g = P.createGame(P.STAGES[0], P.sanitizeSave({})); g.enemies = [];
  const ledge = g.gimmicks.find(a => a.kind === "moving" && a.range === 0);
  g.player.x = ledge.x;
  P.step(g, {}, dt); assert.ok(!g.seenGimmicks.has("moving"));
  const door = g.stage.rooms[0];
  Object.assign(g.player, { x: door.x - 100, y: door.y - 52, grounded: true });
  g.events = []; P.step(g, {}, dt);
  assert.ok(g.events.some(e => e.type === "gimmick" && e.text.includes("部屋に入れる")));
});

for (const level of [0, 7]) test(`Every authored upper route is reachable and returns to ground at upgrade ${level}`, () => {
  for (const s of P.STAGES) for (const route of s.encounters) {
    const g = P.createGame(s, P.sanitizeSave({ upgrades: { speed: level, jump: level } }));
    // Isolate route traversal from combat. All platforms, timing and hazards remain real.
    g.enemies = [];
    const launch = g.gimmicks.find(a => a.id === route.launchId);
    const goals = route.goalIds.map(id => g.gimmicks.find(a => a.id === id));
    const label = `stage ${s.id}, ${route.id}, level ${level}`;
    const start = launch.kind === "updraft" ? launch.x + launch.w - 22 : launch.x + launch.w / 2;
    Object.assign(g.player, { x: start - 18, y: route.floorY - 52 });
    if (["spring", "mushroom"].includes(launch.kind)) {
      until(g, () => !g.player.grounded, () => ({}), `${label} bounce`);
    } else if (launch.kind === "switch") {
      advance(g, { jump: true });
      for (let n = 0; n < 12; n++) advance(g);
      advance(g, { dive: true });
      until(g, () => launch.activated, () => ({}), `${label} switch`);
    } else if (launch.kind === "lift") {
      advance(g, { jump: true });
      until(g, () => g.player.support === launch.id, () => ({}), `${label} board lift`);
      until(g, () => launch.y <= goals[0].y + 48 && launch.dy < 0, () => ({}), `${label} ride lift`);
    } else if (launch.kind === "updraft") {
      advance(g, { jump: true });
      until(g, () => g.player.y + 52 <= goals[0].y - 10, () => ({}), `${label} wind rise`);
    }
    for (let i = 0; i < goals.length; i++) {
      const goal = goals[i];
      const previous = g.gimmicks.find(a => a.id === g.player.support);
      const center = previous && previous.y < goal.y && previous.x + previous.w > goal.x
        ? Math.max(goal.baseX + goal.w / 2, previous.x + previous.w + 22)
        : goal.baseX + goal.w / 2;
      if (previous && previous.kind !== "lift" && goal.y < previous.y && center - g.player.x - 18 > 100) {
        const edge = Math.min(center, previous.x + previous.w - 22);
        until(g, () => Math.abs(g.player.x + 18 - edge) < 5, () => walkTo(g, edge), `${label} takeoff ${i}`);
      }
      if (g.player.grounded) advance(g, { ...walkTo(g, center), jump: true });
      until(g, () => g.player.support === goal.id && Math.abs(g.player.x + 18 - center) < 5, () => walkTo(g, center), `${label} landing ${i}`);
    }
    const returnX = route.end - 25;
    until(g, () => g.player.grounded && !g.player.support && g.player.x + 18 >= returnX - 5,
      () => walkTo(g, returnX), `${label} return`);
    assert.equal(g.player.hp, g.player.maxHp, `${label} should not force damage`);
    assert.ok(!g.crystals.some(c => c.encounter === route.id), `${label} rewards must be collectable`);
  }
});
