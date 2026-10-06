'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const Current=require('../src/core'),Legacy027=require('../src/legacy-core-v027'),Legacy028=require('../src/legacy-core-v028');
const Boat=require('../src/boat-battle'),Replay=require('../src/replay');
const fixtureDir=path.join(__dirname,'fixtures/replay-v028');
const provenance=require('./fixtures/replay-v028/provenance.json');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const json=value=>JSON.parse(JSON.stringify(value));

test('historical engine, boat adapter, data and fixtures retain the released v0.29 bytes',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../src/legacy-core-v028.js'),'utf8');
 const start=source.indexOf('(function(globalThis,module,require){\n')+'(function(globalThis,module,require){\n'.length;
 const boatMark='\n;\n/* Frozen boat adapter from the same release. */\n';
 const split=source.indexOf(boatMark,start),end=source.indexOf('\n})(legacy,undefined,undefined);',split);
 assert.ok(split>start&&end>split,'both frozen source sections exist');
 assert.equal(sha(source.slice(start,split)),provenance.trainingEngineSha256);
 assert.equal(sha(source.slice(split+boatMark.length,end)),provenance.boatAdapterSha256);
 assert.equal(sha(fs.readFileSync(path.join(__dirname,'../src/historical-game-data.js'))),provenance.gameDataSha256);
 for(const fixture of provenance.fixtures)assert.equal(sha(fs.readFileSync(path.join(fixtureDir,fixture.file))),fixture.sha256,fixture.file);
});

for(const {file,sourceRelease} of provenance.fixtures)test(`release${sourceRelease} engine0.28 ${file} reproduces its stored outcome through repeated seeks`,()=>{
 const record=JSON.parse(fs.readFileSync(path.join(fixtureDir,file))),before=json(record),session=new Replay.Session(record);
 assert.ok(session.battle instanceof Legacy028.Battle);
 assert.equal(session.battle instanceof Current.Battle,false);
 assert.equal(session.battle instanceof Legacy027.Battle,false);
 for(const at of [record.duration,Math.min(5,record.duration),record.duration])session.seek(at);
 assert.equal(session.error,null);
 assert.deepEqual(Replay.digest(session.battle),record.expected);
 assert.deepEqual(record,before,'replay playback must not rewrite historical input');
 assert.equal(session.battle.learningEnabled,false);
 assert.deepEqual(session.command(),{ok:false,reason:'Replays are read-only'});
 if(file.endsWith('boat.json')){
  assert.equal(session.battle.result.reason,'Attacker tower destroyed');
  assert.ok(session.battle.towers.some(t=>t.boatCycle>0),'the boat fixture exercises spawned defenders');
  assert.equal(session.battle.tiebreaker,null);
 }
 if(file.endsWith('tiebreak.json')){
  assert.equal(session.battle.result.reason,'Tiebreaker');
  assert.ok(session.battle.tiebreaker);
 }
});

test('engine0.28 boat playback is independent of live simulation and live boat adapter',t=>{
 t.mock.method(Current.Battle.prototype,'step',()=>{throw Error('Live engine must not run');});
 t.mock.method(Boat,'configure',()=>{throw Error('Live boat adapter must not run');});
 const record=require('./fixtures/replay-v028/boat.json'),session=new Replay.Session(record);
 session.seek(record.duration);
 assert.equal(session.error,null);
 assert.deepEqual(Replay.digest(session.battle),record.expected);
});

test('browser loading keeps current and both historical engine globals isolated',()=>{
 const catalogSentinel={},context=vm.createContext({RoyaleCardForms:require('../src/card-forms'),RoyaleHistoricalGameData:require('../src/historical-game-data'),RoyaleGameData:require('../src/game-data'),RoyaleCore:Current,RoyaleBoatBattle:Boat,RoyaleCatalog:catalogSentinel,RoyaleLegacyCore:Legacy027});
 for(const file of ['legacy-core-v028.js','replay.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../src',file),'utf8'),context,{filename:file});
 assert.equal(context.RoyaleCore,Current);
 assert.equal(context.RoyaleBoatBattle,Boat);
 assert.equal(context.RoyaleCatalog,catalogSentinel);
 assert.equal(context.RoyaleLegacyCore,Legacy027);
 assert.notEqual(context.RoyaleLegacyCore028.Battle,Current.Battle);
 assert.equal(context.RoyaleReplay.ENGINE,'0.53');
 const record=require('./fixtures/replay-v028/boat.json'),session=new context.RoyaleReplay.Session(record);
 assert.ok(session.battle instanceof context.RoyaleLegacyCore028.Battle);
 session.seek(record.duration);
 assert.equal(session.error,null);
 assert.deepEqual(json(context.RoyaleReplay.digest(session.battle)),record.expected);
});

test('current records use engine0.43 while unsupported engine tags remain rejected',()=>{
 const b=new Current.Battle({ai:false,seed:422});Replay.captureInitial(b);
 const record=Replay.pack(b);
 assert.equal(record.engine,Replay.ENGINE);
 assert.ok(new Replay.Session(record).battle instanceof Current.Battle);
 for(const engine of ['0.29','0.33','0.99'])assert.throws(()=>Replay.validate({...record,engine}),/different simulation version/);
});
