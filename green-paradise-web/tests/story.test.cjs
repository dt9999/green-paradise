const test = require('node:test'), assert = require('node:assert/strict');
const P = require('../world.js'), C = require('../campaign.js');
test('Part one has short start and goal scenes for every stage and ten boss scenes', () => {
  for (const s of P.STAGES) for (const trigger of ['start', 'goal', 'boss']) {
    const scene = C.story(s, trigger);
    if (trigger === 'boss' && !s.boss) { assert.equal(scene, null); continue; }
    assert.ok(scene.id.startsWith('part1-')); assert.equal(scene.lines.length, s.id === 1 && trigger === 'start' ? 4 : 2);
    assert.ok(scene.lines.every(l => l.text.length > 10 && l.text.length < 140));
    assert.ok(!scene.lines.some(l => /undefined|宇宙人|0コア|植物が凶暴化/.test(l.text)));
    assert.ok(['depart', 'bloom', 'release'].includes(scene.effect));
    if (s.id !== 50) assert.ok(!scene.lines.some(l => /人間だった|科学者|研究主任|声紋|被験|吸収量|計画名/.test(l.text)));
  }
  assert.equal(C.story({ part: 'part2' }, 'start'), null);
  assert.match(C.story(P.STAGES[49], 'boss').lines[1].text, /大地へ帰ろう/);
});
test('Opening establishes location, ability and destination without repeating the first archive', () => {
  const opening = C.story(P.STAGES[0], 'start');
  assert.match(opening.lines[0].text, /ここはどこ/);
  assert.match(opening.lines[2].text, /草が生えた/);
  assert.match(opening.lines[3].text, /街へ行こう/);
  assert.ok(!JSON.stringify(opening).includes('いっしょに行こう'));
  assert.match(C.record('part1-1-0').text, /送り主/);
  const starts = P.STAGES.map(s => C.story(s, 'start').lines.at(-1).text);
  assert.equal(new Set(starts).size, 50);
});
