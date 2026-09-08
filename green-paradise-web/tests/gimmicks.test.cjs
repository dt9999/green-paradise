const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../world.js");
const G = require("../gimmicks.js");
const tick = (g, n = 1, input = {}) => { for (let i = 0; i < n; i++) P.step(g, input, 1 / 60, 100); };
function fixture(kind, extra = {}) {
  const stage = { ...P.STAGES[0], platforms: [{ x: 0, y: 430, w: 2000, h: 170 }],
    gimmicks: [{ id: "toy", kind, x: 300, y: 430, w: 120, h: 16, range: 55, force: 70, ...extra }],
    crystals: [], enemies: [], length: 2000, goalX: 1900 };
  const g = P.createGame(stage, P.sanitizeSave({}));
  return g;
}
function stand(g, a) {
  Object.assign(g.player, { x: a.x + 20, y: a.y - 52, vx: 0, vy: 0, grounded: true, support: a.id });
}

test("16 mechanics across 10 regions, safe spawn/arenas, no shared mutable state", () => {
  assert.equal(Object.keys(G.INFO).length, 16);
  const kinds = new Set();
  for (const s of P.STAGES) {
    assert.ok(s.gimmicks.length > 0);
    const last = s.platforms.at(-1);
    for (const a of s.gimmicks) {
      kinds.add(a.kind); assert.ok(a.x >= 150); assert.ok(a.x + a.w < last.x);
      if (a.kind === "bridge") assert.ok(s.gimmicks.some(b => b.id === a.link && b.kind === "switch"));
    }
    const a = P.createGame(s, P.sanitizeSave({ points: 1234 }));
    a.gimmicks[0].x = -123; a.gimmicks[0].activated = true;
    const b = P.createGame(s, P.sanitizeSave({ points: 1234 }));
    assert.notEqual(b.gimmicks[0].x, -123); assert.equal(b.gimmicks[0].activated, false);
    assert.deepEqual(b.gimmicks.map(g => [g.x, g.y]), s.gimmicks.map(g => [g.x, g.y]));
  }
  assert.equal(kinds.size, 16);
});

for (const kind of ["moving", "lift"]) test(`${kind}: carries rider both ways for full cycles and releases on jump`, () => {
  const g = fixture(kind, { y: 330 }), a = g.gimmicks[0]; stand(g, a);
  for (let n = 0; n < 720; n++) {
    tick(g);
    assert.ok(g.player.grounded, `${kind} frame ${n}`);
    assert.ok(Math.abs(g.player.y + 52 - a.y) < .001, `vertical carry ${n}`);
    assert.ok(Math.abs(g.player.x - a.x - 20) < .001, `horizontal carry ${n}`);
  }
  tick(g, 1, { jump: true }); assert.equal(g.player.support, null);
  const x = g.player.x; tick(g, 6); assert.equal(g.player.x, x); assert.ok(g.player.vy < 0);
});

test("One-way platforms allow rising through, fast dives land, vanished floors release support", () => {
  const g = fixture("phase", { y: 345 }), a = g.gimmicks[0];
  g.player.x = a.x + 20; tick(g, 1, { jump: true }); tick(g, 18);
  assert.ok(g.player.y + 52 < a.y); assert.equal(g.player.grounded, false);
  tick(g, 1, { dive: true }); tick(g, 5); assert.equal(g.player.support, a.id);
  a.clock = 3.59; tick(g); assert.equal(a.active, false); assert.equal(g.player.grounded, false);
  tick(g, 35); assert.equal(g.player.y + 52, 430);
  a.clock = 4.99; tick(g); assert.equal(a.active, true);
  assert.equal(g.player.y + 52, 430, "reappearing above player does not teleport or trap them");
});

test("Crumble warns, collapses after 0.7 seconds, restores and retriggers", () => {
  const g = fixture("crumble", { y: 340 }), a = g.gimmicks[0]; stand(g, a);
  tick(g, 30); assert.ok(a.triggered && a.active && a.warning);
  tick(g, 15); assert.equal(a.active, false); assert.equal(g.player.support, null);
  tick(g, 185); assert.ok(a.active && !a.triggered);
  stand(g, a); tick(g); assert.ok(a.triggered); assert.ok(a.timer < .02);
});

test("Springs auto-bounce and diving on a mushroom adds height", () => {
  for (const kind of ["spring", "mushroom"]) for (const dive of [false, true]) {
    const g = fixture(kind, { w: 56 }), a = g.gimmicks[0];
    Object.assign(g.player, { x: a.x + 5, y: a.y - 55, vy: 300, grounded: false, coyote: 0 });
    tick(g, 1, { dive });
    assert.equal(g.player.vy, kind === "mushroom" && dive ? -810 : -680);
    assert.equal(g.player.grounded, false); assert.equal(g.player.dive, false);
    assert.ok(g.events.some(e => e.type === "spring"));
  }
});

test("Ice decelerates, sand slows only on ground, conveyor moves idle player but permits reverse", () => {
  const ice = fixture("ice", { w: 220 }); stand(ice, ice.gimmicks[0]); ice.player.vx = 205;
  tick(ice, 10); assert.ok(ice.player.vx > 170 && ice.player.vx < 205);
  tick(ice, 35, { left: true }); assert.ok(ice.player.vx < 0);
  const sand = fixture("sand", { w: 220 }); stand(sand, sand.gimmicks[0]);
  tick(sand, 1, { right: true }); assert.equal(sand.player.vx, 205 * .55);
  tick(sand, 1, { right: true, jump: true }); assert.equal(sand.player.vx, 205);
  const belt = fixture("conveyor", { w: 220 }); stand(belt, belt.gimmicks[0]); const x = belt.player.x;
  tick(belt, 20); assert.ok(belt.player.x > x + 20);
  tick(belt, 30, { left: true }); assert.ok(belt.player.x < x);
});

test("Wind pushes inside its field, updraft lifts airborne players, dive overcomes it", () => {
  const wind = fixture("wind", { y: 200, h: 230 }); wind.player.x = 320;
  tick(wind, 30); assert.ok(wind.player.x > 345);
  wind.player.x = 500; tick(wind, 10); assert.equal(wind.player.x, 500);
  const g = fixture("updraft", { y: 180, h: 250, w: 150 }); g.player.x = 320;
  tick(g, 1, { jump: true }); tick(g, 25); assert.ok(g.player.y < 250);
  tick(g, 1, { dive: true }); assert.ok(g.player.vy > 800);
  tick(g, 20); assert.ok(g.player.grounded);
});

test("Only dive activates a switch, bridge supports player and retry removes bridge", () => {
  const g = fixture("switch", { w: 56 });
  g.stage.gimmicks.push({ id: "bridge", kind: "bridge", x: 380, y: 345, w: 100, h: 16, link: "toy" });
  g.gimmicks = G.create(g.stage); const a = g.gimmicks[0], b = g.gimmicks[1];
  stand(g, a); tick(g); assert.equal(a.activated, false); assert.equal(b.active, false);
  Object.assign(g.player, { y: 370, vy: 200, grounded: false }); tick(g, 1, { dive: true });
  assert.ok(a.activated && b.active);
  stand(g, b); tick(g, 2); assert.equal(g.player.support, b.id);
  const fresh = P.createGame(g.stage, P.sanitizeSave({ points: 9876, upgrades: { jump: 4 } }));
  assert.equal(fresh.gimmicks[0].activated, false); assert.equal(fresh.gimmicks[1].active, false);
  assert.equal(fresh.upgrades.jump, 4);
});

test("Brittle rock blocks walking, supports normal landings, breaks only on dive", () => {
  const g = fixture("brittle", { y: 366, w: 72, h: 64, solid: true }), a = g.gimmicks[0];
  g.player.x = 260; tick(g, 10, { right: true }); assert.equal(g.player.x + 36, a.x);
  Object.assign(g.player, { x: 320, y: a.y - 55, vy: 250, grounded: false }); tick(g);
  assert.ok(a.active); assert.equal(g.player.support, a.id);
  Object.assign(g.player, { y: a.y - 55, vy: 250, grounded: false }); tick(g, 1, { dive: true });
  assert.equal(a.active, false); tick(g, 35); assert.equal(g.player.y + 52, 430);
  tick(g, 30, { right: true }); assert.ok(g.player.x > a.x + a.w);
});

test("Steam and icicles warn before damage and do not repeatedly remove hearts", () => {
  const g = fixture("steam", { w: 56 }), a = g.gimmicks[0]; g.player.x = 310;
  a.clock = 2.8; tick(g); assert.ok(a.warning); assert.equal(g.player.hp, 4);
  a.clock = 3.51; tick(g); assert.equal(g.player.hp, 3); tick(g, 10); assert.equal(g.player.hp, 3);
  const ice = fixture("icicle", { w: 56 }); ice.player.x = 310;
  tick(ice, 50); assert.ok(ice.gimmicks[0].warning); assert.equal(ice.hazards.length, 0);
  tick(ice, 35); assert.equal(ice.player.hp, 3); assert.ok(ice.gimmicks[0].cooldown > 0);
  const avoid = fixture("icicle", { w: 56 }); avoid.player.x = 310;
  tick(avoid, 50); tick(avoid, 60, { left: true }); assert.equal(avoid.player.hp, 4);
});

test("Introduction hints appear once per mechanic, all spawns are safe when idle", () => {
  for (const stage of P.STAGES) {
    const g = P.createGame(stage, P.sanitizeSave({})); tick(g, 600);
    assert.equal(g.state, "playing"); assert.equal(g.player.hp, 4, `stage ${stage.id}`);
    const hints = g.events.filter(e => e.type === "gimmick").map(e => e.text);
    assert.equal(hints.length, new Set(hints).size);
  }
});

test("All 50 stages remain traversable at starting stats with gimmicks and hazards enabled", () => {
  for (const stage of P.STAGES) {
    const g = P.createGame(stage, P.sanitizeSave({}));
    // Isolate navigation from enemy combat; keep every toy, hazard and heart rule.
    g.enemies = [];
    for (let n = 0; n < 6000 && g.state === "playing"; n++) {
      const p = g.player;
      const floor = [...stage.platforms, ...G.surfaces(g)].find(f => p.x + p.w > f.x && p.x < f.x + f.w && Math.abs(p.y + p.h - f.y) < 1);
      const obstacle = g.gimmicks.some(a => ((a.kind === "brittle" && a.active) || a.kind === "steam") && a.x > p.x && a.x - p.x < 85);
      tick(g, 1, { right: true, jump: p.grounded && ((floor && p.x >= floor.x + floor.w - 42) || obstacle) });
      g.events = [];
    }
    assert.equal(g.state, "won", `stage ${stage.id}`);
    assert.ok(g.player.hp > 0);
  }
});
