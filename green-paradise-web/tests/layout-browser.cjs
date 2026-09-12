const assert = require("node:assert/strict");
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  try {
    for (const viewport of [{ width: 1365, height: 768 }, { width: 844, height: 390 }]) {
      const context = await browser.newContext({ viewport, hasTouch: true });
      await context.addInitScript(() => localStorage.setItem("greenParadiseSaveV1", JSON.stringify({ unlockedStages: 50, tutorialComplete: true })));
      const page = await context.newPage(), errors = [];
      page.on("pageerror", e => errors.push(e.message));
      await page.goto(process.env.TEST_URL || "http://127.0.0.1:4173");
      await page.evaluate(() => {
        const create = Paradise.createGame, step = Paradise.step;
        Paradise.createGame = (...args) => (window.g = create(...args));
        window.bounces = 0;
        Paradise.step = (...args) => { step(...args); if (args[0].events.some(e => e.type === "spring")) window.bounces++; };
      });
      await page.locator("#startButton").tap();
      for (const id of [1, 11, 16, 21, 31, 36, 46]) {
        await page.locator("#regionTabs button").nth(Math.floor((id - 1) / 5)).tap();
        await page.locator(`[aria-label^="ステージ${id} "]`).tap();
        if (id !== 1) await page.locator("#skipStory").tap();
        await page.evaluate(() => {
          g.enemies = [];
          const route = g.stage.encounters[0];
          const launch = g.gimmicks.find(a => a.id === route.launchId);
          Object.assign(g.player, { x: launch.x - 65, y: route.floorY - 52, grounded: true, vy: 0 });
          g.camera = Math.max(0, route.x - 120);
        });
        await page.screenshot({ path: `/tmp/green-layout-${id}-${viewport.width}.png` });
        if (id === 1) {
          const right = page.locator('[data-control="right"]');
          await right.dispatchEvent("pointerdown", { pointerId: 4, pointerType: "touch", buttons: 1 });
          await page.waitForFunction(() => bounces > 0);
          await page.waitForTimeout(600);
          await right.dispatchEvent("pointerup", { pointerId: 4, pointerType: "touch" });
          assert.equal(await page.evaluate(() => g.state), "playing");
          await page.waitForTimeout(300);
          assert.equal(await page.evaluate(() => g.player.vx), 0);
        }
        if (id === 11) {
          await page.evaluate(() => {
            const a = g.gimmicks.find(a => a.id === g.stage.encounters[0].goalIds[0]);
            Object.assign(g.player, { x: a.x + 35, y: a.y - 52, grounded: true, vy: 0, support: a.id });
          });
          await page.waitForFunction(() => document.querySelector("#journeyStatus").textContent.includes("上の道"));
          await page.keyboard.press("w");
          await page.waitForFunction(() => g.cameraY < -12);
          await page.screenshot({ path: `/tmp/green-upper-${viewport.width}.png` });
          assert.ok(await page.evaluate(() => g.player.y - g.cameraY > 30));
        }
        await page.locator("#menuButton").tap();
        await page.locator("#mapFromMenu").tap();
      }
      assert.deepEqual(errors, []);
      console.log(`PASS ${viewport.width}: seven route scenes, touch bounce/release, upper camera and map return`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
