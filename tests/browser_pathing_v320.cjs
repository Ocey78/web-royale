'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const out=path.resolve(process.env.PATHING_QA_OUT||'docs/qa/v032/pathing');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
 const page=await browser.newPage({viewport:{width:1200,height:1000}}),errors=[],missing=[],results=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().includes('/__webroyale_ai__/'))missing.push(r.url());});
 try{
  await page.goto(process.env.WEB_ROYALE_URL||'http://127.0.0.1:8092');await page.waitForFunction(()=>window.RoyaleDemo&&document.getElementById('loading').classList.contains('hidden'),null,{timeout:60000});
  const version=await page.evaluate(()=>RoyaleBundle.version);
  if(process.env.ALLOW_PREVIOUS_BUILD!=='1')assert.equal(version,require('../package.json').version);
  await page.locator('.sandbox-launch').click();await page.waitForFunction(()=>RoyaleDemo.sandboxUI.ready);await page.locator('#sandboxPause').click();await page.locator('#sandboxTargets').check();
  async function towers(team,lane,fallen){
   await page.locator('[data-action="sandbox-towers"]').click();
   for(const side of ['red','blue'])for(const part of ['left','right','king'])await page.locator(`[name="${side}-${part}"]`).setChecked(!(fallen&&side===(team===0?'red':'blue')&&part===lane));
   await page.locator('#sandboxTowerLevel').fill('9');await page.locator('[data-action="sandbox-towers-apply"]').click();
  }
  async function spawn(card,team,x,y){
   await page.locator('#sandboxCard').selectOption(card);await page.waitForFunction(()=>RoyaleDemo.sandboxUI.ready);
   await page.locator('#sandboxLevel').fill('9');await page.locator('#sandboxLevel').dispatchEvent('change');await page.locator(`[data-sandbox-team="${team}"]`).click();
   const p=await page.evaluate(({x,y})=>{const q=RoyaleBattleView.toScreen({x:x*RoyaleCore.SX,y:y*RoyaleCore.SY}),r=document.getElementById('viewport').getBoundingClientRect();return{x:r.x+q.x*r.width/540,y:r.y+q.y*r.height/1172};},{x,y});
   await page.mouse.click(p.x,p.y);return page.evaluate(()=>RoyaleDemo.battle.units.at(-1).id);
  }
  async function trace(id,seconds,stopAtAttack=false){return page.evaluate(({id,seconds,stopAtAttack})=>{
   const b=RoyaleDemo.battle,C=RoyaleCore,samples=[];b.paused=false;let attack=null,angle=null,maxTurn=0;
   for(let n=0;n<seconds*60;n++){
    const old=b.getEntity(id),before=old?{x:old.x,y:old.y}:null;
    RoyaleDemo.session.advance(1/60);const u=b.getEntity(id);if(!u||u.hp<=0)break;const t=b.getEntity(u.targetId);
    if(before){const dx=(u.x-before.x)/C.SX,dy=(u.y-before.y)/C.SY;if(Math.hypot(dx,dy)>1e-8){const a=Math.atan2(dy,dx);if(angle!==null)maxTurn=Math.max(maxTurn,Math.abs(Math.atan2(Math.sin(a-angle),Math.cos(a-angle)))*180/Math.PI);angle=a;}}
    if(n%30===0)samples.push({time:b.time,x:u.x/C.SX,y:u.y/C.SY,target:t?.entity,king:t?.king,targetX:t?.x/C.SX});
    if(stopAtAttack&&u.windup&&t&&t.king!==undefined){attack={target:t.entity,king:t.king,x:u.x/C.SX,y:u.y/C.SY,time:b.time};break;}
   }
   b.paused=true;const u=b.getEntity(id);return{samples,attack,maxTurn,end:u?{x:u.x/C.SX,y:u.y/C.SY,hp:u.hp}:null};
  },{id,seconds,stopAtAttack});}
  for(const team of [0,1])for(const lane of ['left','right']){
   await towers(team,lane,true);const x=lane==='left'?3.5:14.5,id=await spawn('baby-dragon',team,x,team?7:25);
   const first=await trace(id,7);await page.locator('#viewport').screenshot({path:path.join(out,`fallen-${team}-${lane}-advance.png`)});
   const finish=await trace(id,15,true),samples=[...first.samples,...finish.samples],check={team,lane,...finish,samples};results.push(check);
   fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({version,results,errors,missing},null,2));
   assert(samples.every(p=>lane==='left'?p.x<=9.01:p.x>=8.99),'Fallen-lane Dragon must not cross the arena to the opposite Princess');
   assert(samples.filter(p=>p.target).every(p=>p.king===true),'Undistracted fallen-lane Dragon advances toward the King');
   assert.equal(finish.attack?.king,true,'Fallen-lane Dragon reaches and attacks the King');
   assert(Math.max(first.maxTurn,finish.maxTurn)<1,'Clear King approach has no lane corner or sight-boundary snap');
   assert(Math.abs(first.end.x-9)<Math.abs(x-9),'King approach moves diagonally toward the actual target');
  }
  // Current no-enemy advance makes diagonal progress; a real nearby troop still
  // permits free aerial pursuit across the river and away from its default Crown.
  await towers(0,'left',false);const aligning=await spawn('baby-dragon',0,6,22);
  const start=await page.evaluate(id=>{const u=RoyaleDemo.battle.getEntity(id);return{x:u.x/RoyaleCore.SX,y:u.y/RoyaleCore.SY};},aligning),join=await trace(aligning,2.1);
  assert(join.end.x<start.x&&join.end.y<start.y-.5,'Off-lane Dragon advances diagonally instead of sliding sideways first');assert(join.maxTurn<1);
  await page.setViewportSize({width:390,height:844});await page.locator('#viewport').screenshot({path:path.join(out,'join-lane-phone.png')});
  await towers(0,'left',false);const dragon=await spawn('baby-dragon',0,5.5,18),musketeer=await spawn('musketeer',1,8.5,12.5);
  const pursuit=await trace(dragon,2.5);const target=await page.evaluate(id=>RoyaleDemo.battle.getEntity(id)?.targetId,dragon);
  assert.equal(target,musketeer);assert(pursuit.end.x>5.5&&pursuit.end.y<17,'Nearby enemy allows aerial pursuit over open water');
  await page.locator('#viewport').screenshot({path:path.join(out,'free-aerial-pursuit-phone.png')});
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({version,fallenLaneCases:results,join,pursuit,checks:['both teams and lanes','diagonal fallen-lane approach','King attack reached','no artificial corners','diagonal lane entry','free aerial pursuit'],errors,missing},null,2));
  console.log('Built browser diagonal movement, continuous King approach and free aerial pursuit pass.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
