const test = require('node:test'), assert = require('node:assert/strict');
const P = require('../world.js'), C = require('../campaign.js');
test('Part one has short start and goal scenes for every stage and ten boss scenes', () => {
  for (const s of P.STAGES) for (const trigger of ['start', 'goal', 'boss']) {
    const scene = C.story(s, trigger);
    if (trigger === 'boss' && !s.boss) { assert.equal(scene, null); continue; }
    assert.ok(scene.id.startsWith('part1-')); assert.equal(scene.lines.length, 2);
    assert.ok(scene.lines.every(l => l.text.length > 10 && l.text.length < 140));
    assert.ok(!scene.lines.some(l => /undefined|宇宙人|0コア|植物が凶暴化/.test(l.text)));
  }
  assert.equal(C.story({ part: 'part2' }, 'start'), null);
  assert.match(C.story(P.STAGES[49], 'boss').lines[1].text, /大地へ帰ろう/);
});
