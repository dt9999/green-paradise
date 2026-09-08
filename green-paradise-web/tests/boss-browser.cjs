const assert = require("node:assert/strict");
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
(async () => {
  for (const engine of [chromium, webkit]) {
    const browser = await engine.launch();
    try {
      const page = await browser.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
      const errors = []; page.on("pageerror", e => errors.push(e.message));
      await page.addInitScript(() => localStorage.setItem("greenParadiseSaveV1", JSON.stringify({ unlockedStages: 50 })));
      await page.goto(process.env.TEST_URL || "http://127.0.0.1:4174");
      await page.locator("#startButton").tap();
      await page.evaluate(() => {
        const create = Paradise.createGame; Paradise.createGame = (...args) => (window.testGame = create(...args));
        const select = ParadiseMusic.select; ParadiseMusic.select = (...args) => (window.testScore = select(...args));
      });
      await page.locator('[aria-label^="ステージ1 "]').tap();
      await page.waitForTimeout(100);
      assert.equal(await page.locator("#toast").isVisible(), false);
      const hint = await page.locator("#tutorialHint").boundingBox(), control = await page.locator('[data-control="jump"]').boundingBox();
      assert.ok(hint.y + hint.height < control.y);
      await page.locator("#hintButton").tap();
      const time = await page.evaluate(() => testGame.time);
      await page.waitForTimeout(100); assert.equal(await page.evaluate(() => testGame.time), time);
      assert.ok(await page.locator("#hintGuide").getAttribute("open") !== null);
      assert.ok(await page.locator("#recentHints p").count() > 0);
      await page.locator("#mapFromMenu").tap();
      await page.locator('[aria-label^="ステージ5 "]').evaluate(e => e.click());
      await page.evaluate(() => {
        const e = testGame.enemies.find(e => e.boss);
        testGame.player.x = e.x - 160; testGame.player.y = 378; testGame.player.invincible = 99;
      });
      await page.waitForTimeout(150); assert.ok(await page.locator("#bossIntro").isVisible());
      assert.ok(await page.evaluate(() => testScore === ParadiseMusic.BOSS_TRACKS[0]));
      await page.screenshot({ path: `/tmp/green-boss-intro-${engine.name()}.png` });
      await page.waitForFunction(() => testGame.bossIntro === 0);
      await page.evaluate(() => { const e = testGame.enemies.find(e => e.boss); e.hp = e.maxHp / 2 + 1; Paradise.hitEnemy(testGame, e, 2); });
      await page.waitForTimeout(100);
      assert.match(await page.locator("#bossTip").textContent(), /本気モード/);
      assert.ok(await page.evaluate(() => testScore.stepMs < ParadiseMusic.BOSS_TRACKS[0].stepMs));
      assert.equal(await page.locator("#toast").isVisible(), false);
      await page.screenshot({ path: `/tmp/green-boss-phase-${engine.name()}.png` });
      assert.deepEqual(errors, []);
      console.log(`PASS ${engine.name()}: quiet help, safe controls, paused hints, boss intro/music, phase-two music and HUD`);
    } finally { await browser.close(); }
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
