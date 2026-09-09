const fs = require("node:fs");
const path = require("node:path");
const { webkit } = require("../../green-paradise-web/node_modules/playwright");

const url = process.env.TEST_URL || "http://127.0.0.1:4174";
const isIpad = process.env.STORE_DEVICE === "ipad";
const output = path.resolve(
  __dirname,
  isIpad
    ? "../app-store/screenshots/ipad-13-landscape"
    : "../app-store/screenshots/iphone-6.3-landscape",
);

async function shot(page, name) {
  await page.screenshot({ path: path.join(output, name), animations: "disabled" });
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await webkit.launch();
  const device = {
    viewport: isIpad ? { width: 1366, height: 1024 } : { width: 874, height: 402 },
    deviceScaleFactor: isIpad ? 2 : 3,
    isMobile: true,
    hasTouch: true,
  };
  const titleContext = await browser.newContext(device);
  const titlePage = await titleContext.newPage();
  await titlePage.goto(url);
  await shot(titlePage, "01-title.png");
  await titleContext.close();

  const context = await browser.newContext(device);
  await context.addInitScript(() => {
    localStorage.setItem("greenParadiseSaveV1", JSON.stringify({
      points: 2460,
      highestCleared: 49,
      unlockedStages: 50,
      clearedStages: Array.from({ length: 49 }, (_, i) => i + 1),
      upgrades: { jump: 4, speed: 4, energy: 4, dropRate: 3, damage: 3 },
    }));
  });
  const page = await context.newPage();
  await page.goto(url);

  await page.locator("#startButton").tap();
  await page.waitForTimeout(300);
  await shot(page, "02-adventure-map.png");

  await page.evaluate(() => {
    const create = Paradise.createGame;
    Paradise.createGame = (...args) => (window.storeGame = create(...args));
  });
  await page.locator(".stage-node").nth(24).tap();
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    storeGame.player.x = Math.max(480, storeGame.stage.length * 0.42);
    storeGame.player.y = Paradise.FLOOR - 52;
  });
  await page.waitForTimeout(250);
  await shot(page, "03-green-action.png");

  await page.locator("#menuButton").tap();
  await page.locator("#mapFromMenu").tap();
  await page.locator(".stage-node").nth(49).tap();
  await page.waitForTimeout(350);
  await page.evaluate(() => {
    const boss = storeGame.enemies.find(enemy => enemy.boss);
    storeGame.player.x = boss.x - 420;
    storeGame.player.y = Paradise.FLOOR - 52;
  });
  await page.waitForTimeout(1800);
  await shot(page, "04-final-boss.png");

  await page.evaluate(() => {
    const boss = storeGame.enemies.find(enemy => enemy.boss);
    boss.alive = false;
    storeGame.player.x = storeGame.stage.goalX;
    storeGame.player.y = Paradise.FLOOR - 52;
    storeGame.player.vy = 0;
  });
  await page.waitForTimeout(350);
  await shot(page, "05-ending.png");

  await browser.close();
  console.log(output);
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
