'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const out=path.resolve(process.env.TARGETING_QA_OUT||'docs/qa/v030/targeting');fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
 try{const page=await browser.newPage({viewport:{width:1200,height:1000}}),errors=[],missing=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().includes('/__webroyale_ai__/'))missing.push(r.url());});
  await page.goto(process.env.WEB_ROYALE_URL||'http://127.0.0.1:8092');await page.waitForFunction(()=>window.RoyaleDemo&&document.getElementById('loading').classList.contains('hidden'),null,{timeout:60000});
  assert.equal(await page.evaluate(()=>RoyaleBundle.version),require('../package.json').version);
  await page.locator('.sandbox-launch').click();await page.waitForFunction(()=>RoyaleDemo.sandboxUI.ready);await page.locator('#sandboxPause').click();await page.locator('#sandboxTargets').check();
  async function spawn(card,team,x,y){await page.locator('#sandboxCard').selectOption(card);await page.waitForFunction(()=>RoyaleDemo.sandboxUI.ready);await page.locator(`[data-sandbox-team="${team}"]`).click();const p=await page.evaluate(({x,y})=>{const q=RoyaleBattleView.toScreen({x:x*RoyaleCore.SX,y:y*RoyaleCore.SY}),r=document.getElementById('viewport').getBoundingClientRect();return{x:r.x+q.x*r.width/540,y:r.y+q.y*r.height/1172};},{x,y});await page.mouse.click(p.x,p.y);return page.evaluate(()=>RoyaleDemo.battle.units.at(-1).id);}
  async function advance(seconds){await page.evaluate(seconds=>{const b=RoyaleDemo.battle;b.paused=false;for(let i=0;i<Math.ceil(seconds*60);i++)RoyaleDemo.session.advance(1/60);b.paused=true;},seconds);}
  await page.evaluate(()=>{const b=RoyaleDemo.battle;b.towers.find(t=>t.team===1&&!t.king&&t.x<240).hp=0;});
  const dragon=await spawn('baby-dragon',0,3.5,18);await advance(1.1);
  const fallback=await page.evaluate(id=>{const b=RoyaleDemo.battle,u=b.getEntity(id),t=b.getEntity(u.targetId);return{target:t?.entity,king:!!t?.king,team:t?.team,position:{x:u.x,y:u.y}};},dragon);assert.equal(fallback.king,true,'Baby Dragon advances toward King after its lane Princess falls');
  await page.locator('#viewport').screenshot({path:path.join(out,'dragon-nearest-tower.png')});
  const knight=await spawn('knight',1,4.5,18);await advance(.25);assert.equal(await page.evaluate(id=>RoyaleDemo.battle.getEntity(id).targetId,dragon),knight,'Visible nearby enemy distracts tower navigation');
  const goblin=await spawn('goblins',1,3.5,17.8);await advance(.05);assert.equal(await page.evaluate(id=>RoyaleDemo.battle.getEntity(id).targetId,dragon),knight,'Closer distraction does not steal an engaged target');
  await page.setViewportSize({width:390,height:844});await page.locator('#viewport').screenshot({path:path.join(out,'dragon-locked-target-phone.png')});
  await page.evaluate(id=>{const u=RoyaleDemo.battle.getEntity(id);u.x=17*RoyaleCore.SX;u.y=2*RoyaleCore.SY;},knight);await advance(.05);
  const reacquired=await page.evaluate(id=>{const b=RoyaleDemo.battle,u=b.getEntity(id),t=b.getEntity(u.targetId);return{entity:t?.entity,id:t?.id};},dragon);assert.equal(reacquired.entity,'Goblin','Target leaving range causes reacquisition');
  await page.locator('[data-action="sandbox-clear"]').click();
  await page.locator('[data-action="sandbox-towers"]').click();await page.locator('[data-action="sandbox-towers-off"]').click();await page.locator('[data-action="sandbox-towers-apply"]').click();
  const giant=await spawn('giant',0,6,21),nearTroop=await spawn('knight',1,6,20),cannon=await spawn('cannon',1,7,17.8);await advance(1.1);assert.equal(await page.evaluate(id=>RoyaleDemo.battle.getEntity(id).targetId,giant),cannon,'Giant ignores closer troop and acquires defensive building');
  await page.locator('#viewport').screenshot({path:path.join(out,'giant-building-only-phone.png')});
  const electroWizard=await page.evaluate(()=>{
   const C=RoyaleCore,b=new C.Battle({ai:false});b.towers=[];const spawn=(name,team,x,y)=>b.spawn(name,team,x*C.SX,y*C.SY,{wait:0});
   const u=spawn('ElectroWizard',0,9,25),primary=spawn('Knight',1,9,20);u.targetId=primary.id;b.startAttack(u,primary);
   const near=spawn('Knight',1,8,24),next=spawn('Knight',1,10,23);
   for(let i=0;i<Math.round((u.def.firstHit+1/30)*60);i++){b.time+=1/60;b.tickEntity(u,1/60);}
   return{damage:u.def.damage,primary:primary.maxHp-primary.hp,secondary:near.maxHp-near.hp,third:next.maxHp-next.hp};
  });
  assert.equal(electroWizard.primary,electroWizard.damage);assert.equal(electroWizard.secondary,electroWizard.damage);assert.equal(electroWizard.third,0);
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({version:require('../package.json').version,fallback,dragon,knight,goblin,reacquired,giant,nearTroop,cannon,electroWizard,checks:['fallen-lane King advance','tower-navigation distraction','attack lock','out-of-range retarget','buildings-only','Electro Wizard locked primary bolt'],errors,missing},null,2));console.log('Built sandbox acquisition, locks, retargeting, Baby Dragon fallback, buildings-only and Electro Wizard bolts pass.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
