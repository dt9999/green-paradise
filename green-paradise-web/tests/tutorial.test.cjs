const test = require('node:test'), assert = require('node:assert/strict');
const P = require('../world.js'), C = require('../campaign.js');
test('First launch flags migrate and reset safely', () => {
  assert.equal(P.sanitizeSave({}).adventureStarted, false);
  assert.equal(P.sanitizeSave({ highestCleared: 2 }).adventureStarted, true);
  assert.equal(P.sanitizeSave({ highestCleared: 2 }).tutorialComplete, true);
  assert.equal(P.sanitizeSave({ adventureStarted: true }).adventureStarted, true);
});
test('Tutorial follows actions, not elapsed time or distant teleportation', () => {
  const g = P.createGame(P.STAGES[0], P.sanitizeSave({}));
  for (let i = 0; i < 100; i++) C.updateTutorial(g, []);
  assert.equal(g.tutorial.step, 0);
  g.player.x = 4000; C.updateTutorial(g, []); assert.equal(g.tutorial.step, 0);
  for (let i = 0; i < 6; i++) { g.player.x += 20; C.updateTutorial(g, []); }
  assert.equal(g.tutorial.step, 1);
  C.updateTutorial(g, [{type:'jump'}]); assert.equal(g.tutorial.step, 1);
  C.updateTutorial(g, [{type:'land'}]); assert.equal(g.tutorial.step, 2);
  C.updateTutorial(g, [{type:'dive'}]); C.updateTutorial(g, [{type:'land'}]); assert.equal(g.tutorial.step, 3);
  C.updateTutorial(g, [{type:'defeat'}]); assert.equal(g.tutorial.step, 4);
  assert.equal(P.createGame(P.STAGES[1], P.sanitizeSave({})).tutorial, null);
});
