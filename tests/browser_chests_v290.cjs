'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const out=path.resolve(process.env.CHEST_QA_OUT||'docs/qa/v029/chests');fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
 try{const page=await browser.newPage({viewport:{width:1200,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.WEB_ROYALE_URL||'http://127.0.0.1:8092');await page.waitForFunction(()=>window.RoyaleDemo&&document.getElementById('loading').classList.contains('hidden'),null,{timeout:60000});
  await page.evaluate(()=>RoyaleDemo.applyProfile({...RoyaleCore.normalizeProfile(),freeChestAt:0}));
  await page.locator('[data-action="free-chest"]').click();await page.waitForFunction(()=>RoyaleDemo.chestOpening.sequence?.stage==='closed');
  const committed=await page.evaluate(()=>JSON.stringify({...RoyaleDemo.profile,world:undefined}));assert(await page.evaluate(()=>RoyaleDemo.profile.freeChestAt>Date.now()));
  await page.locator('#viewport').screenshot({path:path.join(out,'closed.png')});await page.locator('.chest-tap').click();
  await page.waitForFunction(()=>RoyaleDemo.chestOpening.sequence?.stage==='shown');await page.locator('#viewport').screenshot({path:path.join(out,'gold.png')});
  const revealed=[];while(await page.evaluate(()=>RoyaleDemo.chestOpening.sequence?.stage!=='summary')){
   revealed.push(await page.evaluate(()=>({...RoyaleDemo.chestOpening.sequence.current})));
   await page.locator('.chest-tap').click();await page.waitForFunction(()=>['shown','summary'].includes(RoyaleDemo.chestOpening.sequence?.stage));
   if(await page.evaluate(()=>RoyaleDemo.chestOpening.sequence?.stage==='shown'&&RoyaleDemo.chestOpening.sequence?.current?.kind==='card'))await page.locator('#viewport').screenshot({path:path.join(out,'card.png')});
  }
  assert(revealed.some(x=>x.kind==='gold'));assert(revealed.some(x=>x.kind==='card'));
  await page.locator('#viewport').screenshot({path:path.join(out,'summary.png')});await page.locator('.chest-tap').click();
  assert.equal(await page.evaluate(()=>JSON.stringify({...RoyaleDemo.profile,world:undefined})),committed,'Presentation never grants twice');assert.equal(await page.locator('#overlay').getAttribute('class'),'overlay');
  await page.reload();await page.waitForFunction(()=>window.RoyaleDemo&&document.getElementById('loading').classList.contains('hidden'));
  assert.equal(await page.evaluate(()=>JSON.stringify({...RoyaleDemo.profile,world:undefined})),committed,'Reward survives reload');
  await page.locator('[data-action="free-chest"]').click();assert.equal(await page.evaluate(()=>RoyaleDemo.modal),'classic-chest','Cooldown prevents repeat claim');await page.keyboard.press('Escape');
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(async()=>{await RoyaleDemo.chestOpening.open({cards:[{id:'princess',count:1}]},{kind:'legendary',title:'Legendary Chest',owned:[]});});
  await page.waitForFunction(()=>RoyaleDemo.chestOpening.sequence?.stage==='closed');await page.locator('.chest-tap').click();
  await page.waitForFunction(()=>RoyaleDemo.chestOpening.sequence?.stage==='revealing');await page.waitForTimeout(1800);await page.locator('#viewport').screenshot({path:path.join(out,'legendary-turn.png')});
  assert.equal(await page.evaluate(()=>RoyaleDemo.chestOpening.sequence.stage),'revealing');
  await page.waitForFunction(()=>RoyaleDemo.chestOpening.sequence?.stage==='shown');await page.locator('#viewport').screenshot({path:path.join(out,'legendary-card.png')});
  assert.equal(await page.locator('.chest-reward-badge').innerText(),'New Card!');await page.locator('.chest-skip').click();assert.equal(await page.evaluate(()=>RoyaleDemo.chestOpening.sequence.stage),'summary');await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>RoyaleDemo.chestOpening.sequence),null);
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({revealed,exactlyOnce:true,reload:true,legendary:true,phone:true,errors},null,2));console.log('Chest claims, original sequences, legendary reveal, skip/close and reload pass.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
