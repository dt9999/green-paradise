// Isolated save and in-page physics fixtures; never change the player's save.
const assert = require("node:assert/strict");
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const url = process.env.TEST_URL || "http://127.0.0.1:4174";
(async () => {
  for (const engine of [chromium, webkit]) {
    const browser = await engine.launch();
    try {
      const page = await browser.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
      const errors = []; page.on("pageerror", e => errors.push(e.message));
      await page.addInitScript(() => localStorage.setItem("greenParadiseSaveV1", JSON.stringify({ points: 3456, unlockedStages: 50, upgrades: { jump: 4 } })));
      await page.goto(url); assert.match(await page.locator("#version").textContent(), /0\.4\.0/);
      await page.locator("#startButton").tap();
      await page.evaluate(() => { const create = Paradise.createGame; Paradise.createGame = (...args) => (window.testGame = create(...args)); });
      await page.locator('[aria-label^="ステージ36 "]').evaluate(e => e.click());
      await page.evaluate(() => {
        const g = testGame, a = g.gimmicks.find(a => a.kind === "switch");
        g.enemies = []; Object.assign(g.player, { x: a.x + 10, y: a.y - 52, vy: 0, grounded: true });
      });
      const tap = kind => page.locator(`[data-control="${kind}"]`).tap();
      await tap("jump"); await page.waitForTimeout(180); await tap("dive"); await page.waitForTimeout(220);
      assert.ok(await page.evaluate(() => testGame.gimmicks.some(a => a.kind === "switch" && a.activated)));
      assert.ok(await page.evaluate(() => testGame.gimmicks.some(a => a.kind === "bridge" && a.active)));
      await page.screenshot({ path: `/tmp/green-gimmick-bridge-${engine.name()}.png` });
      await page.locator("#menuButton").tap();
      const clock = await page.evaluate(() => testGame.gimmicks[0].clock);
      await page.waitForTimeout(200); assert.equal(await page.evaluate(() => testGame.gimmicks[0].clock), clock);
      await page.locator("#menu summary").tap(); assert.equal(await page.locator("#menu details p").count(), 16);
      await page.locator("#mapFromMenu").tap();
      await page.locator('[aria-label^="ステージ36 "]').evaluate(e => e.click());
      assert.equal(await page.evaluate(() => testGame.gimmicks.some(a => a.kind === "switch" && a.activated)), false);
      await page.locator("#menuButton").tap(); await page.locator("#mapFromMenu").tap();
      // Render every region's actual layout, with every clocked state exercised.
      for (let r = 0; r < 10; r++) {
        await page.locator(`[aria-label^="ステージ${r * 5 + 1} "]`).evaluate(e => e.click());
        await page.evaluate(() => {
          testGame.enemies = [];
          for (const a of testGame.gimmicks) {
            if (a.kind === "steam") a.clock = 3.7;
            if (a.kind === "icicle") { a.triggered = true; a.timer = .5; }
          }
          const a = testGame.gimmicks[0], f = testGame.stage.platforms[0];
          Object.assign(testGame.player, { x: a.x - 70, y: f.y - 52, vy: 0, invincible: 10 });
        });
        await page.waitForTimeout(200);
        await page.screenshot({ path: `/tmp/green-gimmick-area-${r}-${engine.name()}.png` });
        assert.equal(await page.locator("body").getAttribute("data-screen"), "play");
        await page.locator("#menuButton").tap(); await page.locator("#mapFromMenu").tap();
      }
      assert.deepEqual(errors, []);
      console.log(`PASS ${engine.name()}: touch jump+dive switch, bridge growth, hints, pause, restart, 10 region renders`);
    } finally { await browser.close(); }
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
