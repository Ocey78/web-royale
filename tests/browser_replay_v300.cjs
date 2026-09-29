'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const fixtureGroups=['replay-v028','replay-v030','replay-v031'].map(name=>({name,dir:path.join(__dirname,'fixtures',name),provenance:require('./fixtures/'+name+'/provenance.json')}));
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const url=process.env.WEB_ROYALE_URL||'http://127.0.0.1:8092';
const output=path.resolve(process.env.REPLAY_QA_OUT||'docs/verification-v032/browser-replay.json');

(async()=>{
 const fixtures=fixtureGroups.flatMap(group=>group.provenance.fixtures.map(entry=>{
  const bytes=fs.readFileSync(path.join(group.dir,entry.file));
  assert.equal(sha(bytes),entry.sha256,entry.file+' fixture integrity');
  return{...entry,group:group.name,record:JSON.parse(bytes)};
 }));
 const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'chrome'});
 const context=await browser.newContext({viewport:{width:1200,height:960}}),page=await context.newPage();
 const errors=[],consoleErrors=[],missing=[],bundles=[],optionalResources=new Map();
 // The plain static QA host has no disk-learning endpoint or favicon. These
 // two 404s are unrelated to replay assets; preserve them explicitly in evidence.
 const optional404=address=>['/favicon.ico','/__webroyale_ai__/capabilities'].includes(new URL(address).pathname);
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error'){
  const address=message.location().url||url;
  if(message.text().includes('404 (Not Found)')&&optional404(address))optionalResources.set(address,{url:address,status:404});
  else consoleErrors.push({message:message.text(),url:address});
 }});
 page.on('response',response=>{
  const address=response.url();
  if(response.status()===404&&optional404(address))optionalResources.set(address,{url:address,status:404});
  else if(response.status()>=400)missing.push({url:address,status:response.status()});
  if(/\/(?:app|runtime|bootstrap)\.[a-f0-9]+\.(?:js|json)(?:\?|$)/.test(address))bundles.push({url:address,status:response.status()});
 });
 try{
  await page.goto(url);
  await page.waitForFunction(()=>window.RoyaleDemo&&document.getElementById('loading').classList.contains('hidden'),null,{timeout:60000});
  const version=await page.evaluate(()=>RoyaleBundle.version);
  assert.equal(version,require('../package.json').version);
  assert.equal(await page.evaluate(()=>RoyaleReplay.ENGINE),'0.38');
  const results=[];
  for(const fixture of fixtures){
   const check=await page.evaluate(record=>{
    const Core=record.engine==='0.31'?RoyaleLegacyCore031:record.engine==='0.30'?RoyaleLegacyCore030:RoyaleLegacyCore028,session=new RoyaleReplay.Session(record),route=session.battle instanceof Core.Battle;
    const isolated=[RoyaleCore,RoyaleLegacyCore,RoyaleLegacyCore028,RoyaleLegacyCore030,RoyaleLegacyCore031].filter(candidate=>candidate!==Core).every(candidate=>!(session.battle instanceof candidate.Battle));
    session.seek(record.duration);const first=RoyaleReplay.digest(session.battle);
    session.seek(Math.min(5,record.duration));session.seek(record.duration);
    return{route,isolated,error:session.error,readOnly:session.command().ok===false,learningDisabled:session.battle.learningEnabled===false,first,final:RoyaleReplay.digest(session.battle)};
   },fixture.record);
   assert.equal(check.route,true,fixture.file+' routes to its historical engine');
   assert.equal(check.isolated,true,fixture.file+' avoids other engine classes');
   assert.equal(check.error,null,fixture.file);assert.equal(check.readOnly,true);assert.equal(check.learningDisabled,true);
   assert.deepEqual(check.first,fixture.record.expected,fixture.file+' first playback');
   assert.deepEqual(check.final,fixture.record.expected,fixture.file+' after reverse/forward seek');
   results.push({kind:'stored-release-fixture',group:fixture.group,file:fixture.file,sourceRelease:fixture.sourceRelease,engine:fixture.record.engine,route:fixture.record.engine==='0.31'?'Legacy031':fixture.record.engine==='0.30'?'Legacy030':'Legacy028',duration:fixture.record.duration,commands:fixture.record.commands.length,digestSha256:sha(JSON.stringify(check.final)),repeatedSeekMatches:true,readOnly:check.readOnly,learningDisabled:check.learningDisabled,error:check.error,passed:true});
  }
  for(const engine of ['0.26','0.27','0.30','0.31','0.38']){
   const check=await page.evaluate(engine=>{
    const Core=engine==='0.38'?RoyaleCore:engine==='0.31'?RoyaleLegacyCore031:engine==='0.30'?RoyaleLegacyCore030:RoyaleLegacyCore;
    const b=new Core.Battle({ai:false,seed:983,tiebreaker:engine!=='0.26',deck:['giant-skeleton','sparky','knight','archers','giant','musketeer','fireball','arrows']});
    RoyaleReplay.captureInitial(b);const deployment=b.deploy(0,0,123,430);
    for(let i=0;i<1200;i++)b.step(1/60);
    const record=RoyaleReplay.pack(b),packedEngine=record.engine;
    if(engine!=='0.38'){record.engine=engine;if(engine==='0.26')delete record.initial.tiebreaker;}
    const session=new RoyaleReplay.Session(record);session.seek(record.duration);
    const first=RoyaleReplay.digest(session.battle);session.seek(5);session.seek(record.duration);
    return{deployment:deployment.ok,packedEngine,route:session.battle instanceof Core.Battle,expected:record.expected,first,final:RoyaleReplay.digest(session.battle),error:session.error,duration:record.duration,commands:record.commands.length};
   },engine);
   assert.equal(check.deployment,true);assert.equal(check.packedEngine,'0.38');assert.equal(check.route,true,engine+' routing');
   assert.equal(check.error,null,engine);assert.deepEqual(check.first,check.expected,engine+' first playback');assert.deepEqual(check.final,check.expected,engine+' repeated seek');
   results.push({kind:'built-engine-roundtrip',engine,route:engine==='0.38'?'Current':engine==='0.31'?'Legacy031':engine==='0.30'?'Legacy030':'Legacy027',duration:check.duration,commands:check.commands,digestSha256:sha(JSON.stringify(check.final)),repeatedSeekMatches:true,error:check.error,passed:true});
  }
  assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);assert.deepEqual(missing,[]);
  assert.ok(bundles.some(bundle=>/\/app\./.test(bundle.url)),'Loaded the emitted app bundle');
  const report={testedAt:new Date().toISOString(),url,version,bundles,fixtureProvenance:fixtureGroups.map(group=>({group:group.name,sha256:sha(fs.readFileSync(path.join(group.dir,'provenance.json')))})),passed:results.length,total:results.length,storedHistoricalFixtures:fixtures.length,results,errors,consoleErrors,missing,unavailableOptionalResources:[...optionalResources.values()]};
  fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  console.log(`Built replay verification passed: ${results.length}/${results.length}, including ${fixtures.length} stored historical fixtures; no application errors or missing replay assets.`);
 }finally{await context.close();await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
