const assert = require('node:assert/strict');
const {chromium} = require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome'});
 try {
  for(const viewport of [{width:844,height:390},{width:390,height:844}]){
   const page=await browser.newPage({viewport,hasTouch:true}), errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(process.env.TEST_URL||'http://127.0.0.1:4173');
   await page.evaluate(()=>{const create=Paradise.createGame;Paradise.createGame=(...a)=>(window.g=create(...a));});
   await page.locator('#startButton').tap();
   assert.equal(await page.evaluate(()=>document.body.dataset.screen),'play');
   assert.equal(await page.locator('#storyEvent').isVisible(),false);
   await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>g.tutorial.step),0);
   const control=page.locator('[data-control="right"]');
   await control.dispatchEvent('pointerdown',{pointerId:5,pointerType:'touch',buttons:1});
   await page.waitForFunction(()=>g.tutorial.step===1);
   await control.dispatchEvent('pointerup',{pointerId:5,pointerType:'touch'});
   await page.keyboard.press('w');await page.waitForFunction(()=>g.tutorial.step===2);
   await page.keyboard.press('w');await page.waitForTimeout(150);await page.keyboard.press('s');
   await page.waitForFunction(()=>g.tutorial.step===3);
   await page.screenshot({path:`/tmp/tutorial-walking-${viewport.width}.png`});
   await page.evaluate(()=>{g.events.push({type:'defeat'});});await page.waitForFunction(()=>g.tutorial.step===4);
   await page.waitForTimeout(1400);
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('greenParadiseSaveV1')).tutorialComplete),true);
   await page.reload();await page.locator('#startButton').tap();assert.equal(await page.evaluate(()=>document.body.dataset.screen),'map');
   assert.deepEqual(errors,[]);await page.close();console.log(`PASS ${viewport.width}: direct new game, movement/jump/dive progression, persistence, returning map`);
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
