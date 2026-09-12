const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    for (const viewport of [{ width: 844, height: 390 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport, hasTouch: true });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript(() => {
        if (sessionStorage.getItem('reset-test-seeded')) return;
        sessionStorage.setItem('reset-test-seeded', 'yes');
        localStorage.setItem('greenParadiseSaveV1', JSON.stringify({ points: 2345, highestCleared: 12, upgrades: { jump: 5 }, records: ['part1-1-0'], journalGuideSeen: true }));
        localStorage.setItem('unrelated-test-data', 'keep');
      });
      await page.goto(process.env.TEST_URL || 'http://127.0.0.1:4173'); await page.locator('#startButton').tap();
      await page.locator('.stage-node').first().tap(); await page.locator('#skipStory').tap();
      await page.locator('#menuButton').tap(); await page.locator('#deleteSaveButton').tap();
      const originalPoints = await page.locator('#points').textContent();
      assert.ok(Number(originalPoints) >= 2345);
      await page.locator('#cancelDeleteSave').tap();
      assert.equal(await page.locator('#points').textContent(), originalPoints);
      await page.locator('#deleteSaveButton').tap();
      await page.evaluate(() => { window.originalRemove = Storage.prototype.removeItem; Storage.prototype.removeItem = () => { throw Error('blocked'); }; });
      await page.locator('#confirmDeleteSave').tap(); assert.ok(await page.locator('#deleteSaveError').isVisible());
      assert.equal(await page.locator('#points').textContent(), originalPoints);
      await page.evaluate(() => { Storage.prototype.removeItem = window.originalRemove; });
      await page.screenshot({ path: `/tmp/delete-save-${viewport.width}.png` });
      await page.locator('#confirmDeleteSave').tap();
      assert.equal(await page.evaluate(() => document.body.dataset.screen), 'title');
      assert.equal(await page.locator('#points').textContent(), '0');
      await page.reload();
      const save = await page.evaluate(() => Paradise.sanitizeSave(JSON.parse(localStorage.getItem('greenParadiseSaveV1'))));
      assert.equal(save.points, 0); assert.equal(save.unlockedStages, 1);
      assert.deepEqual(save.records, []); assert.deepEqual(save.clearedStages, []);
      assert.ok(Object.values(save.upgrades).every(n => n === 0));
      assert.equal(save.journalGuideSeen, false);
      assert.equal(await page.evaluate(() => localStorage.getItem('unrelated-test-data')), 'keep');
      await page.locator('#startButton').tap(); assert.equal(await page.locator('.stage-node:not(:disabled)').count(), 1);
      assert.deepEqual(errors, []); await page.close();
      console.log(`PASS ${viewport.width}: cancel, failure, deletion, reload, fresh start, unrelated data preserved`);
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
