const test = require('node:test'), assert = require('node:assert/strict');
const P = require('../world.js'), C = require('../campaign.js');
test('Rooms require an opened door, freeze outside enemies, preserve state and give unique rewards', () => {
  for (const stage of P.STAGES) for (const door of stage.rooms) {
    const g = P.createGame(stage, P.sanitizeSave({})), p = g.player;
    Object.assign(p, { x: door.x - 18, y: door.y - 52, grounded: true });
    assert.equal(C.travel(g), false);
    const block = g.gimmicks.find(a => a.id === door.blockId); block.active = false;
    const outsideX = p.x; g.leaf = true; g.camera = 500;
    assert.equal(C.travel(g), true); assert.ok(g.room);
    const enemies = JSON.stringify(g.enemies);
    p.x = 650; P.step(g, {}, 1 / 60); P.step(g, {}, 1 / 60);
    if (door.recordId) assert.ok(g.collectedRecords.has(door.recordId));
    else assert.equal(g.events.filter(e => e.type === 'points').length, 1);
    assert.equal(JSON.stringify(g.enemies), enemies);
    Object.assign(p, { x: 80, y: 378, grounded: true }); C.travel(g);
    assert.equal(g.room, null); assert.equal(p.x, outsideX); assert.equal(g.camera, 500); assert.ok(g.leaf); assert.equal(block.active, false);
    C.travel(g); p.x = 650; P.step(g, {}, 1 / 60);
    assert.equal(g.events.filter(e => e.type === (door.recordId ? 'record' : 'points')).length, 1);
  }
});
test('Early upgrades stay affordable, high ranks rise sharply without changing owned levels', () => {
  const u = P.UPGRADES[0];
  assert.deepEqual(Array.from({ length: 7 }, (_, i) => P.upgradeCost(u, i)), [180, 360, 720, 1800, 3960, 8100, 16200]);
  assert.equal(P.sanitizeSave({ upgrades: { jump: 7 } }).upgrades.jump, 7);
});
test('Room travel keeps upgraded movement and resets only the presentation camera', () => {
  const g = P.createGame(P.STAGES[0], P.sanitizeSave({ upgrades: { jump: 7, speed: 7 } }));
  const door = g.stage.rooms[0];
  g.gimmicks.find(a => a.id === door.blockId).active = false;
  Object.assign(g.player, { x: door.x - 18, y: door.y - 52, grounded: true });
  g.cameraY = -100; assert.ok(C.travel(g)); assert.equal(g.cameraY, 0);
  P.step(g, { right: true, jump: true }, 1 / 60);
  assert.equal(g.player.vx, P.stats(g.upgrades).speed);
  assert.equal(g.player.vy, -P.stats(g.upgrades).jump + P.GRAVITY / 60);
});
