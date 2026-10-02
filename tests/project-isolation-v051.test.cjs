'use strict';
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const L=require('../src/learning.js'),{LearningStore}=require('../src/learning-store.js'),{AppDataLearningStore}=require('../src/appdata-store.js'),{Store}=require('../src/replay.js'),{ProfileRepository}=require('../src/platform.js'),C=require('../src/core.js');
const memory=()=>{const m=new Map();return{m,getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
const packet=id=>({record:{schema:1,snapshot:L.normalizeModel().snapshot,id,mode:'Default',status:'completed',duration:1,commands:[],events:[],transitions:[],snapshots:[]},delta:{weights:Array(L.DIM).fill(.01),updates:1,reward:1}});
test('main and private custom learning stay separate on the same origin, including reset and import',async()=>{
 const storage=memory(),main=new LearningStore({storage,key:'web-royale-main-learning-v1'}),custom=new LearningStore({storage,key:'web-royale-custom-learning-v1'});
 await main.open();await main.commit(packet('main-match'));await custom.open();a.equal(custom.model.matches,0);
 await custom.commit(packet('custom-match'));const saved=await main.export();await main.reset();
 const reopened=new LearningStore({storage,key:'web-royale-custom-learning-v1'});await reopened.open();a.equal(reopened.model.matches,1);a.equal(reopened.records[0].id,'custom-match');
 await main.import(saved);a.equal((await main.export()).records[0].id,'main-match');a.equal((await reopened.export()).records[0].id,'custom-match');
});
test('AppData browser fallback receives the project learning namespace',async()=>{
 const storage=memory(),main=new AppDataLearningStore({storage,key:'main-test',database:'main-db'}),custom=new AppDataLearningStore({storage,key:'custom-test',database:'custom-db'});
 await main.open();await main.commit(packet('main'));await custom.open();a.equal(custom.model.matches,0);a.equal(main.fallback.database,'main-db');
});
test('IndexedDB learning and replay stores open only their requested databases',async()=>{
 const opened=[],indexedDB={open(name){opened.push(name);throw Error('test fallback');}};
 await new LearningStore({indexedDB,database:'main-learning-db'}).open();await new LearningStore({indexedDB,database:'custom-learning-db'}).open();
 await new Store({indexedDB,database:'main-replay-db'}).open();await new Store({indexedDB,database:'custom-replay-db'}).open();
 a.deepEqual(opened,['main-learning-db','custom-learning-db','main-replay-db','custom-replay-db']);
});
test('project identity selects unique browser saves, launcher port and AppData folder',()=>{
 const root=path.resolve(__dirname,'..'),project=JSON.parse(fs.readFileSync(path.join(root,'project.json'))),pkg=require('../package.json'),app=fs.readFileSync(path.join(root,'src/app.js'),'utf8'),host=fs.readFileSync(path.join(root,'tools/offline-host.cs'),'utf8'),bat=fs.readFileSync(path.join(root,'offline build opener.bat'),'utf8');
 a.equal(project.version,pkg.version);a.equal(project.id,pkg.name);a.ok(['web-royale','web-royale-custom'].includes(project.id));a.notEqual(project.profileKey,'web-royale-classic-v4');a.notEqual(project.learningKey,'web-royale-learning-v1');a.notEqual(project.learningDatabase,'web-royale-learning-v1');a.notEqual(project.replayDatabase,'web-royale-replays');
 a.ok(host.includes('"'+project.aiFolder+'", "AI"'));a.ok(bat.includes('$port = '+project.defaultPort));a.match(app,/key:KEY/);a.match(app,/B\.project\?\.profileKey/);a.match(app,/B\.project\?\.replayDatabase/);
 const storage=memory(),classic=new ProfileRepository({storage,normalize:C.normalizeProfile}),fork=new ProfileRepository({storage,normalize:C.normalizeProfile,key:project.profileKey});
 classic.save({...C.normalizeProfile(),name:'Classic'});fork.save({...C.normalizeProfile(),name:'Fork'});a.equal(classic.load().name,'Classic');a.equal(fork.load().name,'Fork');
});
