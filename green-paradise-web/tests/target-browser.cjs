const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.TEST_URL || 'http://127.0.0.1:4173');
    await page.evaluate(() => { const create = Paradise.createGame; Paradise.createGame = (...a) => (window.g = create(...a)); });
    await page.locator('#startButton').click();
    await page.evaluate(() => {
      const t = g.targets[0]; g.enemies = []; g.leaf = true;
      Object.assign(g.player, { x: t.x - 55, y: t.y - 25, facing: 1, invincible: 99 });
      g.camera = t.x - 350; Paradise.shoot(g, 10);
    });
    await page.waitForFunction(() => !g.targets[0].active);
    await page.screenshot({ path: '/tmp/target-points-mobile.png' });
    await page.waitForTimeout(1900);
    assert.ok(await page.evaluate(() => g.time - g.targets[0].hitAt > 1.8));
    await page.evaluate(() => {
      const l = g.stage.landmarks.find(l => l.entranceBlock && g.gimmicks.some(a => a.id === l.entranceBlock));
      const b = g.gimmicks.find(a => a.id === l.entranceBlock);
      window.block = b;
      Object.assign(g.player, { x: b.x + 6, y: b.y - 170, vy: 0, grounded: false, invincible: 99 });
      g.camera = b.x - 350;
    });
    await page.screenshot({ path: '/tmp/passage-before-mobile.png' });
    await page.keyboard.press('s');
    await page.waitForFunction(() => !block.active);
    await page.screenshot({ path: '/tmp/passage-after-mobile.png' });
    assert.deepEqual(errors, []);
    console.log('PASS: actual target shot, popup expiry, dive through roof hatch, passage opening');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
