const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  try {
    for (const viewport of [{width:844,height:390},{width:390,height:844}]) {
      const page = await b.newPage({viewport, hasTouch:true}); const errors=[]; page.on('pageerror', e=>errors.push(e.message));
      await page.goto(process.env.TEST_URL || 'http://127.0.0.1:4173');
      await page.evaluate(()=>{const create=Paradise.createGame; Paradise.createGame=(...a)=>(window.g=create(...a));});
      await page.locator('#startButton').tap(); await page.locator('.stage-node').first().tap(); await page.locator('#skipStory').tap();
      await page.evaluate(()=>{
        const door=g.stage.rooms[0]; g.enemies=[]; window.door=door;
        const block=g.gimmicks.find(a=>a.id===door.blockId);
        Object.assign(g.player,{x:block.x+6,y:block.y-170,vy:0,grounded:false});g.camera=block.x-300;
      });
      await page.keyboard.press('s');
      await page.locator('#roomButton').waitFor({state:'visible'});
      await page.locator('#roomButton').tap(); assert.ok(await page.evaluate(()=>!!g.room));
      await page.screenshot({path:`/tmp/secret-room-${viewport.width}.png`});
      await page.keyboard.down('d'); await page.locator('#journalWelcome').waitFor({state:'visible'}); await page.keyboard.up('d');
      await page.locator('#welcomeContinue').tap();
      assert.equal(await page.evaluate(()=>g.collectedRecords.size),1);
      await page.keyboard.down('a'); await page.locator('#roomButton').waitFor({state:'visible'}); await page.keyboard.up('a');
      await page.locator('#roomButton').tap(); assert.equal(await page.evaluate(()=>g.room),null);
      assert.ok(await page.evaluate(()=>Math.abs(g.player.x+18-door.x)<70));
      await page.locator('#menuButton').tap(); await page.locator('#mapFromMenu').tap();
      await page.reload(); assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('greenParadiseSaveV1')).records.length),1);
      assert.deepEqual(errors,[]); await page.close(); console.log(`PASS ${viewport.width}: actual dive, enter, walk, archive, exit, saved record`);
    }
  } finally {await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
