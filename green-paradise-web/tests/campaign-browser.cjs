const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const url = process.env.TEST_URL || 'http://127.0.0.1:4173';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    for (const [name, viewport] of [['desktop', { width: 1365, height: 850 }], ['mobile', { width: 844, height: 390 }], ['portrait', { width: 390, height: 844 }]]) {
      const context = await browser.newContext({ viewport, isMobile: name !== 'desktop', hasTouch: true });
      await context.addInitScript(() => { if (!localStorage.getItem('greenParadiseSaveV1')) localStorage.setItem('greenParadiseSaveV1', JSON.stringify({ points: 2000, unlockedStages: 50 })); });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(url);
      assert.match(await page.locator('#version').textContent(), /1.1.4/);
      await page.locator('#startButton').tap(); assert.equal(await page.locator('.stage-node').count(), 50);
      await page.evaluate(() => { const create = Paradise.createGame; Paradise.createGame = (...args) => (window.testGame = create(...args)); });
      await page.locator('.stage-node').first().tap();
      const startTime = await page.evaluate(() => testGame.time);
      assert.equal(await page.evaluate(() => document.body.dataset.screen), 'map');
      assert.ok(await page.locator('.map-green').isVisible());
      await page.waitForTimeout(120);
      assert.equal(await page.evaluate(() => testGame.time), startTime);
      await page.locator('#nextStory').tap();
      assert.equal(await page.locator('#storySpeaker').textContent(), 'グリーン');
      await page.screenshot({ path: `/tmp/story-${name}.png` });
      await page.locator('#nextStory').tap();
      const right = page.locator('[data-control="right"]');
      assert.equal(await page.locator('.map-green').count(), 0);
      await right.dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'touch', buttons: 1 });
      await page.waitForTimeout(350);
      await right.dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'touch' });
      assert.ok(await page.evaluate(() => testGame.player.x > 110));
      await page.evaluate(() => {
        const g = testGame, r = g.stage.records[0];
        Object.assign(g.player, { x: r.x, y: r.y - 16, vy: 0, invincible: 99 });
        g.camera = r.x - 250;
      });
      await page.waitForFunction(() => testGame.collectedRecords.size === 1);
      await page.screenshot({ path: `/tmp/part1-record-${name}.png` });
      assert.ok(await page.locator('#journalWelcome').isVisible());
      const firstTime = await page.evaluate(() => testGame.time);
      await page.waitForTimeout(120);
      assert.equal(await page.evaluate(() => testGame.time), firstTime);
      await page.locator('#welcomeContinue').tap();
      assert.equal(await page.locator('#journalBadge').textContent(), '1');
      await page.locator('#journalButton').tap();
      assert.equal(await page.locator('#researchNotes button').count(), 1);
      assert.ok((await page.locator('#recordBody').textContent()).length > 20);
      assert.equal(await page.locator('#journalBadge').isVisible(), false);
      const time = await page.evaluate(() => testGame.time); await page.waitForTimeout(100);
      assert.equal(await page.evaluate(() => testGame.time), time);
      await page.screenshot({ path: `/tmp/part1-journal-${name}.png` });
      await page.locator('#closeJournal').tap();
      await page.evaluate(() => {
        const g = testGame, r = ParadiseCampaign.record('part1-2-0');
        g.events.push({ type: 'record', record: r });
      });
      await page.waitForFunction(() => document.querySelector('#recordNoticeTitle').textContent === ParadiseCampaign.record('part1-2-0').title);
      assert.equal(await page.locator('#journalWelcome').isVisible(), false);
      await page.locator('#readNewRecord').tap();
      assert.equal(await page.locator('#researchNotes button').count(), 2);
      await page.locator('#closeJournal').tap();
      await page.evaluate(() => {
        const g = testGame, cp = g.stage.checkpoints[0];
        Object.assign(g.player, { x: cp.x, y: cp.y - 52, vy: 0, grounded: true });
      });
      await page.waitForFunction(() => testGame.checkpoint !== null);
      await page.evaluate(() => { testGame.player.y = 650; });
      await page.waitForFunction(() => document.body.dataset.screen === 'result');
      await page.locator('#retryButton').tap();
      assert.equal(await page.evaluate(() => testGame.state), 'playing');
      assert.ok(await page.evaluate(() => Math.abs(testGame.player.x - testGame.checkpoint.x) < 10));
      await page.evaluate(() => { Object.assign(testGame.player, { x: testGame.stage.goalX, y: 378, vy: 0 }); });
      await page.locator('#skipStory').tap();
      await page.waitForFunction(() => document.body.dataset.screen === 'result');
      await page.locator('#result [data-map]').tap(); await page.locator('#shopButton').tap();
      await page.locator('#shopItems button').first().tap();
      await page.locator('#shop [data-map]').tap();
      await page.reload(); await page.locator('#startButton').tap();
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('greenParadiseSaveV1')).records.length), 2);
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('greenParadiseSaveV1')).journalGuideSeen), true);
      if (name === 'mobile') {
        await page.evaluate(() => { const create = Paradise.createGame; Paradise.createGame = (...args) => (window.testGame = create(...args)); });
        await page.locator('#regionTabs button').last().tap();
        await page.locator('[aria-label^="ステージ50 "]').tap();
        await page.locator('#skipStory').tap();
        await page.evaluate(() => { const g = testGame, b = g.enemies.find(e => e.boss); Object.assign(g.player, { x: b.x - 180, y: 378, invincible: 99 }); g.camera = b.x - 450; });
        await page.waitForFunction(() => testGame.bossIntro > 0);
        await page.waitForFunction(() => testGame.bossIntro === 0);
        await page.screenshot({ path: '/tmp/part1-zero-mobile.png' });
        await page.evaluate(() => { const b = testGame.enemies.find(e => e.boss); b.hp = 1; b.shield = false; b.recovery = 0; Paradise.hitEnemy(testGame, b, 2); });
        await page.locator('#skipStory').tap();
        await page.waitForFunction(() => document.body.dataset.screen === 'ending');
        await page.waitForTimeout(7000);
        await page.screenshot({ path: '/tmp/part1-restored-mobile.png' });
        await page.waitForFunction(() => document.querySelector('#endingTitle').textContent.includes('研究施設'), null, { timeout: 22000 });
        await page.screenshot({ path: '/tmp/part1-scientist-mobile.png' });
        await page.locator('#endingMap').tap({ timeout: 15000 });
        assert.equal(await page.locator('.stage-node').count(), 50);
      }
      assert.deepEqual(errors, []);
      console.log(`PASS ${name}: input, records, pause, checkpoint, clear, shop, save${name === 'mobile' ? ', Zero and full part-one epilogue' : ''}`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
