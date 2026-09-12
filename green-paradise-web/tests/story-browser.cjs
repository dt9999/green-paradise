const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    const page = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true });
    await page.addInitScript(() => localStorage.setItem('greenParadiseSaveV1', JSON.stringify({ unlockedStages: 50 })));
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.TEST_URL || 'http://127.0.0.1:4173');
    await page.evaluate(() => { const create = Paradise.createGame; Paradise.createGame = (...a) => (window.g = create(...a)); });
    await page.locator('#startButton').tap(); await page.locator('.stage-node').nth(4).tap();
    await page.locator('#skipStory').tap();
    await page.evaluate(() => { const b = g.enemies.find(e => e.boss); b.hp = 1; Paradise.hitEnemy(g, b, 999); });
    await page.locator('#storyEvent').waitFor({ state: 'visible' });
    assert.match(await page.locator('#storyText').textContent(), /倒れ/);
    const time = await page.evaluate(() => g.time); await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => g.time), time);
    await page.locator('#nextStory').tap(); await page.screenshot({ path: '/tmp/story-boss-mobile.png' });
    await page.locator('#nextStory').tap();
    assert.equal(await page.evaluate(() => g.state), 'playing');
    await page.evaluate(() => { Object.assign(g.player, { x: g.stage.goalX, y: 378, vy: 0 }); });
    await page.locator('#storyEvent').waitFor({ state: 'visible' });
    const points = Number(await page.locator('#points').textContent());
    const bonus = await page.evaluate(() => g.stage.bonus);
    await page.locator('#skipStory').tap();
    assert.equal(Number(await page.locator('#points').textContent()), points + bonus);
    await page.waitForTimeout(150);
    assert.equal(Number(await page.locator('#points').textContent()), points + bonus);
    assert.equal(await page.evaluate(() => document.body.dataset.screen), 'result');
    assert.deepEqual(errors, []);
    console.log('PASS: boss dialogue, pause, goal follow-up, reward exactly once');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
