'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'}),page=await browser.newPage({viewport:{width:1200,height:960}});
 const out=path.resolve(process.env.CARDS_QA_OUT||'docs/qa/v028/cards');fs.mkdirSync(out,{recursive:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(process.env.WEB_ROYALE_URL||'http://127.0.0.1:8088');await page.waitForFunction(()=>window.RoyaleDemo&&document.getElementById('loading').classList.contains('hidden'));
  await page.waitForTimeout(350);
  await page.evaluate(()=>{RoyaleDemo.applyProfile({...RoyaleCore.normalizeProfile(),trophies:5300,highestTrophies:5300,gold:999999,copies:{knight:20}});RoyaleDemo.show('home');});
  await page.waitForTimeout(200);await page.locator('#home [data-action="nav-cards"]').click();await page.waitForTimeout(200);await page.locator('[data-action="card-section"][data-id="collection"]').click();await page.waitForTimeout(200);
  const labels=await page.locator('#sortLabel canvas,#collectionGrid .card-progress canvas,#collectionGrid .card-tile:not(.locked-card) .card-level canvas').evaluateAll(es=>es.map(c=>{const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let ink=0;for(let i=3;i<data.length;i+=4)if(data[i])ink++;return{width:c.width,height:c.height,ink};}));
  assert.ok(labels.length>=102,'Source lettered labels must exist for all collection cards');assert.ok(labels.every(c=>c.ink>5),'Collection labels must be painted after their hidden region is revealed');
  assert.equal(await page.locator('#collectionGrid .card-tile').count(),102);await page.locator('#viewport').screenshot({path:path.join(out,'collection.png')});
  for(const size of [{width:1200,height:960},{width:390,height:844}]){
   await page.setViewportSize(size);await page.evaluate(()=>RoyaleDemo.details('knight'));
   assert.equal(await page.locator('.card-info-hero').count(),1);assert.equal(await page.locator('.card-info-hero h3').count(),0,'Card name should not be duplicated under the modal title');
   assert.match(await page.locator('.card-info-stats').innerText(),/Melee: Medium/);
   assert.equal(await page.locator('.card-info-progress').count(),1);assert.equal(await page.locator('.card-advanced').getAttribute('open'),null);
   assert.match(await page.locator('[data-action="upgrade"]').innerText(),/Upgrade/);
   assert.equal(await page.locator('[data-action="source-card"]').isVisible(),false);
   assert.equal(await page.locator('#modalPanel').evaluate(e=>e.scrollWidth>e.clientWidth+1),false);
   if(size.width===1200)await page.locator('#viewport').screenshot({path:path.join(out,'card-details.png')});
  }
  await page.locator('.card-advanced summary').click();assert.equal(await page.locator('[data-action="source-card"]').isVisible(),true);
  await page.locator('#detailLevel').selectOption('9');assert.equal(await page.locator('#detailLevel').inputValue(),'9');
  const beforeUpgrade=await page.evaluate(()=>({level:RoyaleDemo.profile.cardLevels.knight,gold:RoyaleDemo.profile.gold}));
  await page.locator('[data-action="upgrade"]').click();
  assert.equal(await page.evaluate(()=>RoyaleDemo.profile.cardLevels.knight),beforeUpgrade.level+1);
  assert.ok(await page.evaluate(()=>RoyaleDemo.profile.gold)<beforeUpgrade.gold);
  const sheets=await page.evaluate(()=>RoyaleCore.CARDS.map(card=>{
   RoyaleDemo.details(card.id);const panel=document.getElementById('modalPanel'),hero=panel.querySelector('.card-info-hero'),portrait=panel.querySelector('.card-info-portrait').getBoundingClientRect(),summary=panel.querySelector('.card-info-summary').getBoundingClientRect();
   return{id:card.id,overflow:panel.scrollWidth>panel.clientWidth+1||hero.scrollWidth>hero.clientWidth+1,overlap:portrait.right>summary.left+1};
  }));
  assert.equal(sheets.length,102);assert.deepEqual(sheets.filter(s=>s.overflow||s.overlap),[]);
  await page.evaluate(()=>RoyaleDemo.show('cards'));await page.evaluate(()=>RoyaleDemo.cardSection('decks'));await page.locator('#viewport').screenshot({path:path.join(out,'deck.png')});
  assert.match(await page.locator('#deckGrid').evaluate(e=>getComputedStyle(e).backgroundImage),/deck-panel/);
  assert.equal(await page.locator('img[data-ui="ref-swap"]').count(),1);
  const outside=await page.locator('#deckGrid').evaluate(e=>{const r=e.getBoundingClientRect();return [...e.querySelectorAll('.card-tile')].filter(c=>{const b=c.getBoundingClientRect();return b.left<r.left-1||b.right>r.right+1||b.top<r.top-1||b.bottom>r.bottom+1;}).length;});assert.equal(outside,0);
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({collectionLabels:labels.length,painted:labels.filter(c=>c.ink>5).length,viewports:2,cardSheets:sheets.length,upgrade:'passed',deckSlotContainment:'passed',errors},null,2));
  console.log('Collection labels and card details pass at desktop and phone sizes.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
