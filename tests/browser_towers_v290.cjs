'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.TOWER_QA_OUT||path.join(root,'docs/qa/v029/towers'));
fs.mkdirSync(out,{recursive:true});
const styles=['source-gold-rush','source-gem-rush','source-elixir-pump'];
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
 try{
  // This fresh context has its own local profile, IndexedDB, and cookies.
  const context=await browser.newContext({viewport:{width:1200,height:1000}}),page=await context.newPage(),errors=[],checks=[];
  page.on('pageerror',e=>errors.push(e.message));
  const ready=()=>page.waitForFunction(()=>window.RoyaleDemo&&document.getElementById('loading').classList.contains('hidden'),null,{timeout:60000});
  await page.goto(process.env.WEB_ROYALE_URL||'http://127.0.0.1:8092');await ready();
  await page.evaluate(()=>RoyaleDemo.applyProfile({...RoyaleCore.normalizeProfile(),gems:5000,ownedTowerSkins:['classic'],selectedTowerSkin:'classic'}));
  const build=await page.evaluate(()=>({scripts:[...document.scripts].map(s=>s.src).filter(Boolean),version:document.title}));
  let gems=5000;
  for(const id of styles){
   await page.setViewportSize({width:1200,height:1000});
   await page.locator('#home [data-action="nav-shop"]').click();
   const buy=page.locator(`#towerSkinShop [data-action="buy-tower-skin"][data-id="${id}"]`);
   await buy.scrollIntoViewIfNeeded();assert(await buy.isEnabled(),'Unowned style can be purchased');
   await page.waitForFunction(id=>document.querySelector(`#towerSkinShop canvas[data-skin-preview="${id}"]`)?.dataset.rendered==='true',id);
   await page.locator('#viewport').screenshot({path:path.join(out,`${id}-shop.png`)});
   await buy.click();gems-=750;
   await page.waitForFunction(({id,gems})=>RoyaleDemo.profile.ownedTowerSkins.includes(id)&&RoyaleDemo.profile.gems===gems,{id,gems});
   assert(await buy.isDisabled(),'Purchased style cannot be charged twice');
   await page.locator('#shop [data-action="nav-cards"]').click();
   await page.locator('[data-action="card-section"][data-id="collection"]').click();
   await page.locator('[data-action="library-section"][data-id="tower-skins"]').click();
   const tile=page.locator(`.tower-collection-tile[data-action="tower-skin-preview"][data-id="${id}"]`);
   await tile.click();
   await page.waitForFunction(id=>document.querySelector(`.tower-large-preview[data-skin-preview="${id}"]`)?.dataset.rendered==='true',id);
   const use=page.locator(`#modalPanel [data-action="select-tower-skin"][data-id="${id}"]`);
   assert(await use.isEnabled(),'Purchased style exposes Use in the real Collection preview');
   await page.locator('#viewport').screenshot({path:path.join(out,`${id}-use.png`)});
   await use.click();assert.equal(await page.evaluate(()=>RoyaleDemo.profile.selectedTowerSkin),id);
   assert(await tile.evaluate(e=>e.classList.contains('equipped')),'Collection marks equipped style');
   await page.reload();await ready();
   const persisted=await page.evaluate(()=>({selected:RoyaleDemo.profile.selectedTowerSkin,owned:RoyaleDemo.profile.ownedTowerSkins,gems:RoyaleDemo.profile.gems}));
   assert.equal(persisted.selected,id);assert.equal(persisted.gems,gems);assert(persisted.owned.includes(id));
   await page.locator('#battleButton').click();
   await page.waitForFunction(()=>RoyaleDemo.screen==='battle'&&RoyaleDemo.battle?.time>.1&&!RoyaleDemo.preparing,null,{timeout:60000});
   const prepared=await page.evaluate(id=>{
    const b=RoyaleDemo.battle,n=RoyaleDemo.native,scene=n.scenes.tower_skins,skin=RoyaleCosmetics.skin(id);
    window.towerDrawEvidence=[];
    const draw=scene?.draw;
    if(draw)scene.draw=function(c,name,...args){if(c.canvas.id==='battleCanvas'&&typeof name==='string')towerDrawEvidence.push(name);return draw.call(this,c,name,...args);};
    return{normal:!b.isSandbox&&!b.isReplay&&!b.practice,queue:b.queueType,mode:b.mode,towers:b.towers.filter(t=>t.team===0).map(t=>({skin:t.skin,king:t.king})),sceneRetained:Boolean(scene),expected:[skin.exports.king[0],skin.exports.princessBase[0],...(skin.exports.princessTop?[skin.exports.princessTop[0]]:[])]};
   },id);
   assert(prepared.normal&&prepared.queue==='trophy-road'&&prepared.mode==='Default','Entered an ordinary battle');assert(prepared.sceneRetained,'Selected source scene survived battle asset preparation');
   assert.equal(prepared.towers.length,3);assert(prepared.towers.every(t=>t.skin===id));
   await page.waitForFunction(expected=>expected.every(name=>towerDrawEvidence.includes(name)),prepared.expected);
   const visible=await page.locator('#battleCanvas').evaluate(c=>{const r=c.getBoundingClientRect(),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let opaque=0;for(let i=3;i<d.length;i+=4)opaque+=d[i]>0;return{width:c.width,height:c.height,visible:r.width>0&&r.height>0&&getComputedStyle(c).visibility!=='hidden',opaque};});
   assert(visible.visible&&visible.opaque>visible.width*visible.height*.25,'Live battle canvas contains visible drawn artwork');
   const screenshots=[];
   for(const size of [{width:1200,height:1000},{width:390,height:844}]){
    await page.setViewportSize(size);await page.waitForTimeout(200);
    const file=`${id}-battle-${size.width}.png`,bytes=await page.locator('#viewport').screenshot({path:path.join(out,file)});
    screenshots.push({file,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal page overflow');
   }
   checks.push({id,spent:750,persisted,prepared,visible,sourceExportsDrawn:await page.evaluate(()=>[...new Set(towerDrawEvidence)]),screenshots});
   await page.locator('#battle [data-action="pause"]').click();await page.locator('#modalPanel [data-action="leave"]').click();await page.locator('#modalPanel [data-action="nav-home"]').click();
   await page.waitForFunction(()=>RoyaleDemo.screen==='home');
  }
  assert.equal(gems,2750);assert.deepEqual(errors,[]);
  const report=JSON.stringify({url:process.env.WEB_ROYALE_URL||'http://127.0.0.1:8092',build,initialGems:5000,finalGems:gems,styles:checks,errors},null,2)+'\n';
  fs.writeFileSync(path.join(out,'results.json'),report);
  const verification=path.join(root,'docs/verification-v029');fs.mkdirSync(verification,{recursive:true});fs.writeFileSync(path.join(verification,'browser-towers.json'),report);
  console.log('Original tower browser checks passed: 3 purchases, Collection Use, reload persistence, 3 ordinary battles, desktop and phone source artwork.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
