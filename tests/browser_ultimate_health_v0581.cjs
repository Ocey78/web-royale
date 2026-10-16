'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),url=process.env.WEB_ROYALE_URL||'http://127.0.0.1:8097',out=path.resolve(process.env.ULTIMATE_QA_OUT||path.join(root,'docs/qa/v0581/local')),report={url,errors:[]};let server,browser;
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 if(!process.env.WEB_ROYALE_URL){server=spawn(process.execPath,['tools/serve.cjs','8097'],{cwd:root,stdio:['ignore','pipe','pipe'],windowsHide:true});await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});}
 browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});const page=await browser.newPage({viewport:{width:1000,height:1080},serviceWorkers:process.env.WEB_ROYALE_URL?'allow':'block'});page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(url);await page.waitForFunction(()=>window.RoyaleDemo&&document.querySelector('#loading.hidden'),null,{timeout:240000});report.version=await page.evaluate(()=>RoyaleBundle.version);assert.equal(report.version,process.env.EXPECTED_VERSION||require('../project.json').version);
 await page.locator('button[data-action="nav-events"]:visible').first().click();await page.locator('[data-action="special-deck-builder"][data-mode="UltimateClash"]').click();await page.locator('#modeDeckBattle').click();
 await page.waitForFunction(()=>RoyaleDemo.battle?.mode==='UltimateClash'&&document.querySelector('#battle.active'),null,{timeout:240000});
 report.towers=await page.evaluate(()=>{
  const b=RoyaleDemo.battle;b.ai=false;b.paused=true;b.time=b.visualTime=5;
  const canvas=document.createElement('canvas');canvas.width=540;canvas.height=960;const ctx=canvas.getContext('2d'),P=RoyalePresentation,hud=P.hud,original=hud.drawStill,rows=[];
  try{for(const tower of b.towers.filter(t=>!t.king)){const calls=[];hud.drawStill=function(c,name,opts){calls.push({name,hp:opts.texts['hpNumber.txt']});return original.call(this,c,name,opts);};for(const fraction of [1,.63]){tower.hp=tower.maxHp*fraction;P.health(ctx,tower,b.time);rows.push({team:tower.team,fraction,healthBar:tower.def.source.HealthBar,shooter:tower.def.source.AttachedCharacter,hp:Math.ceil(tower.hp),maxHp:tower.maxHp,expectedMax:RoyaleCore.entityDef('PrincessTower',tower.level).hp*8,...calls.at(-1)});}tower.lastDamagedAt=b.time;}}finally{hud.drawStill=original;}return rows;
 });
 assert.equal(report.towers.length,8);for(const t of report.towers){assert.equal(t.healthBar,'Tower');assert.equal(t.name,'hp_'+(t.team?'enemy':'player')+'_tower_withNumber');assert.equal(Number(t.hp),Math.ceil(t.maxHp*t.fraction));assert.equal(t.maxHp,t.expectedMax);assert.equal(t.shooter,'Princess_EV1');}
 await page.waitForTimeout(200);await page.locator('#viewport').screenshot({path:path.join(out,'princess-tower-health.png')});
 report.serviceWorker=await page.evaluate(()=>({supported:'serviceWorker' in navigator,controlled:!!navigator.serviceWorker?.controller}));assert.deepEqual(report.errors,[]);report.passed=true;
})().catch(e=>{report.failure=e.stack;console.error(e);process.exitCode=1;}).finally(async()=>{fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');await browser?.close();server?.kill();console.log(JSON.stringify({passed:report.passed,version:report.version,checks:report.towers?.length,errors:report.errors}));});
