'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),url=process.env.WEB_ROYALE_URL||'http://127.0.0.1:8096',out=path.resolve(process.env.ULTIMATE_QA_OUT||path.join(root,'docs/qa/v0581/local')),expected=require('../src/ultimate-clash'),report={url,errors:[],modes:[],screenshots:[]};let server,browser;
async function main(){
 fs.mkdirSync(out,{recursive:true});
 if(!process.env.WEB_ROYALE_URL){server=spawn(process.execPath,['tools/serve.cjs','8096'],{cwd:root,stdio:['ignore','pipe','pipe'],windowsHide:true});await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});}
 browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});const page=await browser.newPage({viewport:{width:1000,height:1080},serviceWorkers:process.env.WEB_ROYALE_URL?'allow':'block'});page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(url);await page.waitForFunction(()=>window.RoyaleDemo&&document.querySelector('#loading.hidden'),null,{timeout:240000});report.version=await page.evaluate(()=>RoyaleBundle.version);assert.equal(report.version,process.env.EXPECTED_VERSION||require('../project.json').version);
 const capture=async name=>{await page.locator('#viewport').screenshot({path:path.join(out,name+'.png')});report.screenshots.push(name+'.png');};
 await page.locator('button[data-action="nav-events"]:visible').first().click();
 for(const mode of expected.MODES)assert.equal(await page.locator('[data-action="special-deck-builder"][data-mode="'+mode+'"]').count(),1);
 await capture('ultimate-events');
 for(const [mode,seats,normal,overtime]of [['UltimateClash',2,240,180],['UltimateClash2v2',4,300,240],['UltimateClash3v3',6,360,300]]){
  await page.evaluate(()=>RoyaleDemo.show('events'));await page.locator('[data-action="special-deck-builder"][data-mode="'+mode+'"]').click();
  assert.equal(await page.locator('#modeDeckCollection [data-action="special-deck-pick"]').count(),expected.CARDS.length);
  for(const card of expected.CARDS)assert.equal(await page.locator('#modeDeckCollection [data-id="'+card.id+'"] .cost').textContent(),String(card.cost));
  if(seats===6){await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);await capture('ultimate-3v3-phone-deck');await page.setViewportSize({width:1000,height:1080});}
  await page.locator('#modeDeckBattle').click();await page.waitForFunction(mode=>RoyaleDemo.battle?.mode===mode&&document.querySelector('#battle.active'),mode,{timeout:240000});
  const state=await page.evaluate(()=>{const b=RoyaleDemo.battle;b.ai=false;b.paused=true;return{mode:b.mode,seats:b.seatCount,cap:b.maxElixir,sections:b.timeline.SectionLength,decks:b.initialDecks,kingCount:b.towers.filter(t=>t.king).length,princess:b.towers.filter(t=>!t.king).map(t=>({team:t.team,bar:t.def.source.HealthBar,shooter:t.def.source.AttachedCharacter,hp:t.maxHp,expected:Math.floor(RoyaleCore.entityDef('PrincessTower',t.level).hp*(b.is2v2?1+(RoyaleCore.DATA.globals.TEAM_VS_TEAM_PRINCESS_TOWER_HP_INCREASE_PERCENTAGE?.NumberValue||0)/100:1))*8})),builderReady:!!RoyaleNative.library.ultimateBuilder};});
  assert.equal(state.seats,seats);assert.equal(state.cap,20);assert.deepEqual(state.sections,[normal,overtime]);assert.equal(state.builderReady,true);for(const deck of state.decks)assert.ok(deck.every(id=>id.startsWith('ultimate-')));for(const t of state.princess){assert.equal(t.bar,'Tower');assert.equal(t.shooter,'Princess_EV1');assert.equal(t.hp,t.expected);}
  assert.equal(await page.locator('.elixir-max').textContent(),'Max 20');report.modes.push(state);
  await page.waitForTimeout(200);await capture(mode+'-battle');
  if(seats===2){
   await page.evaluate(()=>{const b=RoyaleDemo.battle;b.paused=false;b.time=b.visualTime=5;for(const t of b.towers)t.readyAt=1e9;for(const team of [0,1])b.cast(RoyaleCore.cardAt('ultimate-bomb-squad',11),team,240,team?210:430);for(let i=0;i<90;i++)b.step(1/60);b.paused=true;b.visualTime=b.time;window.bomberPaint=[];const lib=RoyaleNative.library,original=lib.unit;lib.unit=function(ctx,id,...args){if(id==='Bomber')window.bomberPaint.push(ctx.globalAlpha);return original.call(this,ctx,id,...args);};});
   await page.waitForTimeout(300);await capture('bombers-cloaked');report.bomberCloak=await page.evaluate(()=>({alpha:[...new Set(window.bomberPaint)],units:RoyaleDemo.battle.units.filter(u=>u.entity==='Bomber').map(u=>({team:u.team,invisible:u.invisible,guard:u.ultimate?.guardId}))}));
   assert.equal(report.bomberCloak.units.length,4);assert.ok(report.bomberCloak.units.every(u=>u.invisible&&u.guard));assert.ok(report.bomberCloak.alpha.length&&report.bomberCloak.alpha.every(a=>Math.abs(a-.48)<1e-6));
   await page.evaluate(()=>{const b=RoyaleDemo.battle;for(const u of b.units)if(u.entity==='SkeletonWarrior')u.hp=0;b.deaths();window.bomberPaint=[];});await page.waitForTimeout(200);await capture('bombers-revealed');report.bomberRevealed=await page.evaluate(()=>({alpha:[...new Set(window.bomberPaint)],invisible:RoyaleDemo.battle.units.filter(u=>u.entity==='Bomber').map(u=>u.invisible)}));assert.ok(report.bomberRevealed.invisible.every(x=>x===false));assert.deepEqual(report.bomberRevealed.alpha,[1]);
  }
 }
 assert.deepEqual(report.errors,[]);report.passed=true;
}
main().catch(e=>{report.failure=e.stack;console.error(e);process.exitCode=1;}).finally(async()=>{fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'teams-report.json'),JSON.stringify(report,null,2)+'\n');await browser?.close();server?.kill();console.log(JSON.stringify({passed:report.passed,version:report.version,modes:report.modes.map(x=>x.mode),errors:report.errors}));});
