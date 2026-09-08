// Run against a local server. Uses isolated browser saves, never the player's save.
const assert = require("node:assert/strict");
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const url = process.env.TEST_URL || "http://127.0.0.1:4174";
const snapshot = async (p, name) => p.screenshot({ path: `/tmp/green-${name}.png`, animations: "disabled" });

(async () => {
  for (const [name, engine, viewport, mobile] of [
    ["desktop", chromium, { width: 1365, height: 850 }, false],
    ["mobile", webkit, { width: 844, height: 390 }, true],
    ["portrait", webkit, { width: 390, height: 844 }, true],
  ]) {
    const browser = await engine.launch();
    try {
      const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile });
      const page = await context.newPage(), errors = [], missing = [];
      page.on("pageerror", e => errors.push(e.message));
      page.on("response", r => { if (r.status() >= 400) missing.push(r.url()); });
      await page.goto(url);
      await snapshot(page, `title-${name}`);
      const start = await page.locator("#startButton").boundingBox(), version = await page.locator("#version").boundingBox();
      assert.ok(start.width > 270 && start.height >= 46);
      assert.ok(Math.abs(start.x + start.width / 2 - version.x - version.width / 2) < 1);
      const activate = async selector => mobile ? page.locator(selector).tap() : page.locator(selector).click();
      await activate("#startButton");
      assert.equal(await page.locator("body").getAttribute("data-screen"), "map");
      assert.equal(await page.locator(".stage-node").count(), 50);
      assert.equal(await page.locator(".stage-node.boss").count(), 10);
      await snapshot(page, `map-${name}`);
      if (mobile) {
        const node = await page.locator(".stage-node").first().boundingBox();
        const scroller = await page.locator("#mapScroll").boundingBox();
        assert.ok(node.y >= scroller.y && node.y + node.height <= scroller.y + scroller.height, "first stage visible without scrolling down");
      }
      await activate("#shopButton");
      await snapshot(page, `shop-${name}`);
      assert.equal(await page.locator(".shop-grid .shop-card").count(), 5);
      await page.locator(".shop-scroll").evaluate(e => { e.scrollTop = e.scrollHeight; });
      await activate("#shop [data-map]");
      // Capture the game only in this test context to observe real UI input.
      await page.evaluate(() => {
        const create = Paradise.createGame;
        Paradise.createGame = (...args) => (window.testGame = create(...args));
      });
      await activate(".stage-node:not(:disabled)");
      assert.equal(await page.locator("body").getAttribute("data-screen"), "play");
      assert.equal(await page.locator("#leafButton").isVisible(), false);
      await snapshot(page, `play-${name}`);
      if (mobile) {
        // Pointer input also covers held movement, multi-touch and cancellation.
        const right = page.locator('[data-control="right"]'), jump = page.locator('[data-control="jump"]');
        const x = await page.evaluate(() => testGame.player.x);
        await right.dispatchEvent("pointerdown", { pointerId: 1, pointerType: "touch", buttons: 1 });
        await page.waitForTimeout(350);
        assert.ok(await page.evaluate(x => testGame.player.x > x + 30, x));
        await jump.dispatchEvent("pointerdown", { pointerId: 2, pointerType: "touch", buttons: 1 });
        await page.waitForTimeout(120);
        assert.ok(await page.evaluate(() => !testGame.player.grounded));
        await jump.dispatchEvent("pointercancel", { pointerId: 2, pointerType: "touch" });
        await right.dispatchEvent("pointercancel", { pointerId: 1, pointerType: "touch" });
        await page.waitForTimeout(80);
        assert.equal(await page.evaluate(() => testGame.player.vx), 0);
        assert.equal(await page.locator(".held").count(), 0);
      } else {
        await page.keyboard.down("d"); await page.waitForTimeout(700); await page.keyboard.up("d");
        assert.ok(await page.evaluate(() => testGame.player.x > 150));
        await page.keyboard.press("w"); await page.waitForTimeout(120);
        assert.ok(await page.evaluate(() => testGame.player.vy < 0));
        await page.keyboard.press("s"); await page.waitForTimeout(160);
        assert.ok(await page.evaluate(() => testGame.grass.size > 5));
      }
      await activate("#menuButton");
      const time = await page.evaluate(() => testGame.time); await page.waitForTimeout(200);
      assert.equal(await page.evaluate(() => testGame.time), time);
      await activate("#dailyButton");
      const points = await page.locator("#points").textContent();
      await activate("#dailyButton"); assert.equal(await page.locator("#points").textContent(), points);
      await activate("#supportButton"); await activate("#adButton");
      await activate("#resumeButton");
      // Collect a real drop and verify the conditional leaf control.
      await page.evaluate(() => { testGame.drops.push({ x: testGame.player.x, y: testGame.player.y, w: 26, h: 26, vy: 0 }); });
      await page.waitForTimeout(100); assert.ok(await page.evaluate(() => testGame.leaf));
      if (mobile) assert.equal(await page.locator("#leafButton").isVisible(), true);
      // Reach the goal with normal simulation; check rewards, map and shop flow.
      await page.evaluate(() => { testGame.player.x = testGame.stage.goalX; testGame.player.y = Paradise.FLOOR - 52; testGame.player.vy = 0; });
      await page.waitForTimeout(150);
      assert.equal(await page.locator("body").getAttribute("data-screen"), "result");
      await snapshot(page, `clear-${name}`);
      await activate("#result [data-map]"); await activate("#shopButton");
      await activate("#shopItems .shop-card:first-child button");
      assert.match(await page.locator("#shopItems .shop-card:first-child").textContent(), /レベル 1/);
      await activate("#shop [data-map]");
      await page.reload(); await activate("#startButton");
      assert.equal(await page.locator(".stage-node:not(:disabled)").count(), 2);
      assert.equal(await page.locator(".stage-node.cleared").count(), 1);
      assert.deepEqual(errors, [], `JS errors: ${name}`); assert.deepEqual(missing, []);
      console.log(`PASS ${name}: start, version, 50 nodes, shop scroll, input, pause, drops, clear, purchase, persistence`);
      await context.close();
    } finally { await browser.close(); }
  }
  // Audio/storage unavailable must never make Start unusable.
  const browser = await webkit.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", { get() { throw Error("storage disabled"); } });
      window.AudioContext = class { constructor() { throw Error("audio disabled"); } };
    });
    await page.goto(url); await page.locator("#startButton").tap(); await page.locator(".stage-node:not(:disabled)").tap();
    assert.equal(await page.locator("body").getAttribute("data-screen"), "play");
    console.log("PASS start with blocked audio and storage");
  } finally { await browser.close(); }
  const touchBrowser = await chromium.launch();
  try {
    const page = await touchBrowser.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
    await page.goto(url); await page.locator("#startButton").tap();
    await page.evaluate(() => { const create = Paradise.createGame; Paradise.createGame = (...args) => (window.testGame = create(...args)); });
    await page.locator(".stage-node:not(:disabled)").tap();
    const client = await page.context().newCDPSession(page);
    const right = await page.locator('[data-control="right"]').boundingBox(), jump = await page.locator('[data-control="jump"]').boundingBox();
    const finger = (r, id) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2, id });
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [finger(right, 1)] });
    await page.waitForTimeout(900);
    assert.ok(await page.evaluate(() => testGame.player.x > 200));
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [finger(right, 1), finger(jump, 2)] });
    await page.waitForTimeout(150);
    assert.ok(await page.evaluate(() => !testGame.player.grounded));
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => testGame.player.vx), 0);
    assert.equal(await page.evaluate(() => String(getSelection())), "");
    console.log("PASS real touch long hold, simultaneous move + jump, release and no text selection");
  } finally { await touchBrowser.close(); }

  const bossBrowser = await chromium.launch();
  try {
    const page = await bossBrowser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = []; page.on("pageerror", e => errors.push(e.message));
    await page.addInitScript(() => localStorage.setItem("greenParadiseSaveV1", JSON.stringify({ points: 2000, unlockedStages: 50 })));
    await page.goto(url); await page.locator("#startButton").click();
    await page.evaluate(() => {
      const create = Paradise.createGame; Paradise.createGame = (...args) => (window.testGame = create(...args));
      const select = ParadiseMusic.select; ParadiseMusic.select = (...args) => (window.testScore = select(...args));
    });
    for (let r = 0; r < 10; r++) {
      await page.locator("#regionTabs button").nth(r).click();
      await page.locator(`[aria-label^="ステージ${r * 5 + 1} "]`).click();
      assert.ok(await page.evaluate(r => testScore === ParadiseMusic.TRACKS[r], r));
      await page.evaluate(r => {
        const e = testGame.enemies.find(e => e.type === Paradise.REGION_ENEMIES[r]);
        e.mobTime = e.type === "burrower" ? 2 : 0;
        testGame.player.x = e.x - 100; testGame.player.y = e.baseY + e.h - 52;
        testGame.camera = Math.max(0, e.x - 480); testGame.player.invincible = 100;
      }, r);
      await page.waitForTimeout(150); await snapshot(page, `new-enemy-${r}`);
      await page.locator("#menuButton").click(); await page.locator("#mapFromMenu").click();
    }
    for (const id of [5,10,15,20,25,30,35,40,45,50]) {
      await page.locator(`#regionTabs button`).nth(id / 5 - 1).click();
      await page.locator(`[aria-label^="ステージ${id} "]`).click();
      await page.evaluate(() => {
        const e = testGame.enemies.find(e => e.boss);
        testGame.player.x = e.x - 180; testGame.player.y = Paradise.FLOOR - 52;
        testGame.camera = testGame.player.x - 400; testGame.player.invincible = 100;
      });
      await page.waitForTimeout(180);
      assert.equal(await page.locator("#bossHud").isVisible(), true);
      await snapshot(page, `boss-${id}`);
      // Use the same collision/attack path as gameplay for the final strike.
      await page.evaluate(() => {
        const e = testGame.enemies.find(e => e.boss); e.hp = 2; e.cycle = 2.5;
        testGame.player.x = e.x + 20; testGame.player.y = e.y - 56;
        testGame.player.grounded = false; testGame.player.vy = 300;
      });
      await page.keyboard.press("s"); await page.waitForTimeout(100);
      assert.ok(await page.evaluate(() => !testGame.enemies.find(e => e.boss).alive), `boss ${id} defeated by dive`);
      await page.evaluate(() => { testGame.player.x = testGame.stage.goalX; testGame.player.y = Paradise.FLOOR - 52; testGame.player.vy = 0; });
      await page.waitForTimeout(100);
      assert.equal(await page.locator("body").getAttribute("data-screen"), id === 50 ? "ending" : "result");
      if (id === 50) { await page.waitForTimeout(4200); await snapshot(page, "ending-desktop"); }
      await page.locator(id === 50 ? "#ending [data-map]" : "#result [data-map]").click();
    }
    assert.deepEqual(errors, []);
    console.log("PASS 10 new enemy renders, area music selection, 10 boss renders, real dive defeat, tree clear, final ending and map return");
  } finally { await bossBrowser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
