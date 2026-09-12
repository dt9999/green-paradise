const test = require('node:test'), assert = require('node:assert/strict');
const P = require('../world.js'), C = require('../campaign.js');
const fresh = id => P.createGame(P.STAGES[id - 1], P.sanitizeSave({}));
test('Only part one exists, every expedition has three sections and optional paths', () => {
  assert.equal(C.PART.last, 50);
  for (const s of P.STAGES) {
    assert.equal(s.part, 'part1'); assert.ok(s.length > (s.region === 0 ? 7000 : 10000));
    assert.equal(s.sections.length, 3); assert.equal(s.records.length, 1);
    assert.ok(s.checkpoints.length >= 2);
    assert.ok(s.gimmicks.some(a => a.id.startsWith('expedition-') && a.kind === 'moving'));
    assert.ok(s.records.every(r => C.validRecord(r.id) && r.x < s.goalX));
  }
  assert.equal(P.STAGES[49].boss.name, 'ゼロパラダイス');
  assert.equal(new Set(P.STAGES.flatMap(s => s.records.map(r => r.id))).size, 50);
  assert.equal(new Set(P.STAGES.flatMap(s => s.records.map(r => r.text))).size, 50);
  assert.equal(C.validRecord('part2-1-0'), false);
});
test('Archives collect on contact once, survive migration and do not stop play', () => {
  const g = fresh(1), r = g.stage.records[0];
  Object.assign(g.player, { x: r.x, y: r.y });
  P.step(g, {}, 1 / 60); P.step(g, {}, 1 / 60);
  assert.equal(g.events.filter(e => e.type === 'record').length, 1);
  assert.equal(g.state, 'playing');
  const save = P.sanitizeSave({ points: 2300, highestCleared: 50, upgrades: { jump: 5 }, records: [r.id, r.id, 'part2-1-0', null] });
  assert.deepEqual(save.records, [r.id]); assert.equal(save.points, 2300); assert.equal(save.upgrades.jump, 5);
  assert.equal(save.unlockedStages, 50);
});
test('Checkpoint retry preserves collected rewards and resets a living boss', () => {
  const g = fresh(50), cp = g.stage.checkpoints.at(-1);
  Object.assign(g.player, { x: cp.x, y: cp.y - 52 }); P.step(g, {}, 1 / 60);
  assert.equal(g.checkpoint, cp);
  g.grass.add('100:430'); g.collectedRecords.add('part1-50-0');
  const b = g.enemies.find(e => e.boss); b.hp = 2; b.phase = 3;
  g.state = 'lost'; g.hazards.push({});
  assert.ok(C.retry(g)); assert.equal(g.state, 'playing'); assert.equal(g.player.x, cp.x);
  assert.equal(b.hp, b.maxHp); assert.equal(b.phase, 1); assert.equal(g.hazards.length, 0);
  assert.ok(g.grass.has('100:430')); assert.ok(g.collectedRecords.has('part1-50-0'));
  assert.equal(g.events.filter(e => e.type === 'points').length, 0);
});
test('Leaf supply and optional target use real collection and shooting', () => {
  const g = fresh(3), s = g.stage.supply; g.enemies = []; g.gimmicks = [];
  Object.assign(g.player, { x: s.x, y: s.y - 20 }); P.step(g, {}, 1 / 60);
  assert.ok(g.leaf); assert.ok(g.supplyTaken);
  const t = g.targets[0]; Object.assign(g.player, { x: t.x - 55, y: t.y - 25, facing: 1 });
  P.shoot(g, 10); for (let i = 0; i < 15; i++) P.step(g, {}, 1 / 60);
  assert.equal(t.active, false); assert.equal(g.events.filter(e => e.type === 'points' && e.amount === 30).length, 1);
});
test('Zero has an absorption telegraph, three phases, and defeat ends only part one', () => {
  const g = fresh(50), b = g.enemies.find(e => e.boss);
  g.enemies = [b]; g.arenaEntered = true; b.attack = 1; b.cycle = 3.79;
  Object.assign(g.player, { x: b.lo + 100, y: 378, invincible: 999 });
  P.step(g, {}, 1 / 60); assert.ok(g.hazards.some(h => h.kind === 'absorb' && h.delay > 1));
  b.hp = b.maxHp / 3; b.phase = 2; P.step(g, {}, 1 / 60); assert.equal(b.phase, 3);
  b.hp = 1; b.shield = false; b.recovery = 0; P.hitEnemy(g, b, 2); P.step(g, {}, 1 / 60);
  assert.equal(g.state, 'won'); assert.equal(g.events.filter(e => e.type === 'won').length, 1);
  assert.match(C.ENDING.at(-1).title, /第1部/); assert.match(C.ENDING[3].text, /科学者/);
  assert.ok(!C.ENDING.some(s => /宇宙人|0コア/.test(s.text)));
});
test('All archives have clear landing space, including moving obstacles', () => {
  for (const s of P.STAGES) {
    const r = s.records[0]; assert.equal(r.coverId, undefined);
    assert.ok(s.platforms.some(f => r.x - 60 >= f.x && r.x + r.w + 60 <= f.x + f.w && r.y + r.h === f.y));
    for (const a of s.gimmicks) assert.ok(a.x + a.w + (a.range || 0) <= r.x - 100 || a.x - (a.range || 0) >= r.x + 128, `stage ${s.id}: ${a.id}`);
    for (const a of [...s.crystals, s.supply, ...s.targets]) assert.equal(P.overlap(r, a), false, `stage ${s.id}: pickup overlap`);
    const g = fresh(s.id); Object.assign(g.player, { x: r.x, y: r.y - 16 });
    P.step(g, {}, 1 / 60); assert.ok(g.collectedRecords.has(r.id));
  }
});
test('Journal read state migrates without losing records or accepting uncollected entries', () => {
  const s = P.sanitizeSave({ records: ['part1-1-0'], readRecords: ['part1-1-0', 'part1-1-0', 'part1-2-0', null], journalGuideSeen: true });
  assert.deepEqual(s.readRecords, ['part1-1-0']); assert.equal(s.journalGuideSeen, true);
  assert.deepEqual(P.sanitizeSave({ records: s.records }).readRecords, []);
});
test('Starting jump can reach Zero from the arena floor for a real dive hit', () => {
  const g = fresh(50), b = g.enemies.find(e => e.boss);
  g.enemies = [b]; g.arenaEntered = true;
  Object.assign(g.player, { x: b.x - 100, y: 378, grounded: true });
  for (let i = 0; i < 24; i++) P.step(g, { right: true, jump: i === 0 }, 1 / 60);
  P.step(g, { right: true, dive: true }, 1 / 60);
  for (let i = 0; i < 6; i++) P.step(g, { right: true }, 1 / 60);
  assert.equal(b.hp, b.maxHp - 2); assert.equal(g.player.hp, 4);
});
