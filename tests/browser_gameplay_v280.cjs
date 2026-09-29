'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'}),page=await browser.newPage({viewport:{width:1200,height:960}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(process.env.WEB_ROYALE_URL||'http://127.0.0.1:8089');await page.waitForFunction(()=>window.RoyaleDemo&&document.getElementById('loading').classList.contains('hidden'));
  assert.equal(await page.evaluate(()=>RoyaleBundle.version),require('../package.json').version);
  await page.evaluate(async()=>{await RoyaleDemo.startBattle('Default',true);RoyaleDemo.battle.ai=false;RoyaleDemo.battle.elixir[0]=10;RoyaleDemo.refreshHand(true);});
  await page.waitForFunction(()=>RoyaleDemo.battle.time>.1&&!RoyaleDemo.battle.paused);
  const placement=await page.evaluate(()=>{
   const b=RoyaleDemo.battle,slot=b.hand[0].findIndex(id=>RoyaleCore.CARD_BY_ID[id].entity),card=b.hand[0][slot],screen=RoyaleBattleView.toScreen({x:120,y:480}),r=document.getElementById('viewport').getBoundingClientRect();
   return{slot,card,x:r.left+screen.x*r.width/540,y:r.top+screen.y*r.height/1172};
  });
  assert.ok(placement.slot>=0);await page.locator(`#hand [data-slot="${placement.slot}"]`).click();await page.mouse.click(placement.x,placement.y);
  await page.waitForFunction(()=>RoyaleDemo.battle.recorder.commands.length===1);
  assert.equal(await page.evaluate(()=>RoyaleDemo.battle.recorder.commands[0].playedCard||RoyaleDemo.battle.recorder.commands[0].card),placement.card);
  await page.waitForFunction(()=>RoyaleDemo.battle.units.some(u=>u.team===0&&u.wait===0));
  await page.evaluate(()=>{RoyaleDemo.battle.paused=true;});
  const checks=await page.evaluate(()=>{
   const C=RoyaleCore,b=new C.Battle({ai:false}),giant=b.spawn('Giant',0,5*C.SX,20*C.SY,{wait:0}),cart=b.spawn('MovingCannon',1,7*C.SX,20*C.SY,{wait:0});b.damage(cart,999999);b.deaths();const broken=b.units.find(u=>u.entity==='BrokenCannon');
   const golem=b.spawn('Golem',0,3.5*C.SX,16*C.SY,{wait:0});b.damage(golem,999999);b.deaths();const children=b.units.filter(u=>u.entity==='Golemite');
   const old=new RoyaleLegacyCore.Battle({ai:false,seed:42,deck:['giant-skeleton','sparky','knight','archers','giant','musketeer','fireball','arrows']});RoyaleReplay.captureInitial(old);old.deploy(0,0,123,430);for(let i=0;i<1200;i++)old.step(1/60);const record=RoyaleReplay.pack(old);record.engine='0.27';const playback=new RoyaleReplay.Session(record);playback.seek(record.duration);
   return{cartPull:broken?.building&&b.chooseTarget(giant).id===broken.id,golemChildren:children.length,childrenLegal:children.every(u=>RoyaleArenaGrid.terrainFits(u.x,u.y,u.def.radiusTiles,{ignoreTowers:true})),legacyEngine:playback.battle instanceof RoyaleLegacyCore.Battle,replayError:playback.error,replayMatch:JSON.stringify(RoyaleReplay.digest(playback.battle))===JSON.stringify(record.expected)};
  });
  assert.deepEqual(checks,{cartPull:true,golemChildren:2,childrenLegal:true,legacyEngine:true,replayError:null,replayMatch:true});assert.deepEqual(errors,[]);
  const out=path.resolve(process.env.GAMEPLAY_QA_OUT||'docs/qa/v028/gameplay');fs.mkdirSync(out,{recursive:true});await page.locator('#viewport').screenshot({path:path.join(out,'deployed-card.png')});
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({pointerDeployment:placement.card,...checks,errors},null,2));console.log('Built pointer deployment, Cannon Cart targeting, river death children and historical replay pass.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
