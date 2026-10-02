'use strict';
const {test}=require('node:test'),A=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const C=require('../src/core.js'),E=require('../src/economy.js'),R=require('../src/progression.js');
const uiSource=fs.readFileSync(path.join(__dirname,'../src/chest-opening-ui.js'),'utf8');
const appSource=fs.readFileSync(path.join(__dirname,'../src/app.js'),'utf8');
// Run the real controller and application handler with deferred asset loading.
// No canvas or DOM rendering is reached in these cancellation/error scenarios.
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}
function fixture(){
 const loads=[],events=[],fallback=[],errors=[];
 const context={console:{error:e=>errors.push(e.message)},Image:class{decode(){return Promise.resolve();}},cancelAnimationFrame(){},C,E,R,
  profile:C.normalizeProfile(),screen:'home',save(){events.push('save');},header(){events.push('header');},renderChests(){events.push('chests');},renderShop(){events.push('shop');},
  transaction(){events.push('failed-transaction');},rewards:(reward,title)=>{fallback.push({reward,title});events.push('fallback');},toast:message=>events.push('toast:'+message),sound(){},roadLabel:()=> 'Trophy Road Chest'};
 vm.createContext(context);vm.runInContext(uiSource,context);
 const ui=context.RoyaleChestOpeningUI.create({native:{ensureScenes:()=>{const load=deferred();loads.push(load);return load.promise;}},
  uiImages:{},panel:()=>events.push('loading-panel'),art:{load:()=>Promise.resolve()}});
 context.chestOpening=ui;
 const handler=appSource.match(/^async function chestRewards\([^\n]+/m);A.ok(handler,'application chestRewards handler');vm.runInContext(handler[0],context);
 return{context,ui,loads,events,fallback,errors};
}

test('closing during a rejected chest preload never resurrects its receipt',async()=>{
 const f=fixture(),before=f.context.profile,result=E.classicChest(before,false,1000);A.equal(result.ok,true);
 const opening=f.context.chestRewards(result,'wood','Free Chest');A.notEqual(f.ui.loading,null);
 f.ui.close();f.events.push('navigated-away');f.loads[0].reject(Error('late texture failure'));await opening;
 A.equal(f.ui.sequence,null);A.equal(f.ui.loading,null);A.deepEqual(f.fallback,[]);A.deepEqual(f.errors,[]);
 A.equal(f.events.filter(e=>e==='save').length,1);A.deepEqual(f.context.profile,result.profile);
});

test('closing during a successful delayed preload also remains closed',async()=>{
 const f=fixture(),opening=f.ui.open({cards:[]},{kind:'wood'});f.ui.close();f.loads[0].resolve();
 A.equal(await opening,false);A.equal(f.ui.sequence,null);A.equal(f.ui.loading,null);A.deepEqual(f.events,['loading-panel']);
});

test('an older rejected preload cannot replace a newer opening or suppress its own current failure',async()=>{
 const f=fixture(),old=f.ui.open({cards:[]},{kind:'wood'}),current=f.ui.open({cards:[]},{kind:'gold'}),token=f.ui.loading;
 f.loads[0].reject(Error('old source failure'));A.equal(await old,false);A.strictEqual(f.ui.loading,token);
 const rejects=A.rejects(current,/current source failure/);f.loads[1].reject(Error('current source failure'));await rejects;
 A.equal(f.ui.sequence,null);f.ui.close();
});

test('a current preload failure shows the already committed receipt without granting it twice',async()=>{
 const f=fixture(),result=E.classicChest(f.context.profile,false,1000),saved=JSON.stringify(result.profile);
 const opening=f.context.chestRewards(result,'wood','Free Chest');f.loads[0].reject(Error('current preload failed'));await opening;
 A.equal(f.fallback.length,1);A.strictEqual(f.fallback[0].reward,result.reward);A.equal(f.fallback[0].title,'Free Chest');
 A.deepEqual(f.errors,['current preload failed']);A.equal(f.events.filter(e=>e==='save').length,1);A.equal(JSON.stringify(f.context.profile),saved);
 A.equal(E.classicChest(f.context.profile,false,1001).ok,false);f.ui.close();
});

test('the real Trophy Road claim refreshes claimed state before starting asynchronous chest loading',async()=>{
 const f=fixture(),step=R.ROAD_REWARDS.find(s=>s.kind==='chest');A.ok(step);
 f.context.profile=C.normalizeProfile({trophies:step.trophies,highestTrophies:step.trophies});f.context.screen='trophyRoad';
 f.context.road=preserve=>{A.equal(preserve,true);A.equal(R.rewardState(f.context.profile,step),'claimed');f.events.push('road-refreshed');f.ui.close();};
 const source=appSource.match(/case 'claim-road':(\{[^\n]+?\})case 'road-inventory'/);A.ok(source,'application claim-road handler');
 vm.runInContext("function dispatchRoad(id){const el={dataset:{}};switch('claim-road'){case 'claim-road':"+source[1]+"}}",f.context);
 const actual=f.context.chestRewards;let pending;f.context.chestRewards=(...args)=>pending=actual(...args);
 f.context.dispatchRoad(step.id);A.ok(pending);A.equal(f.loads.length,1);
 A.ok(f.events.indexOf('save')<f.events.indexOf('road-refreshed'));A.ok(f.events.indexOf('road-refreshed')<f.events.indexOf('loading-panel'));
 A.notEqual(f.ui.loading,null,'the road refresh did not cancel the newly started opening');
 const saved=JSON.stringify(f.context.profile);f.loads[0].reject(Error('current scene unavailable'));await pending;
 A.equal(f.fallback.length,1);A.equal(JSON.stringify(f.context.profile),saved);
 f.context.dispatchRoad(step.id);A.equal(f.loads.length,1,'repeat claim cannot start another receipt');A.equal(f.events.filter(e=>e==='save').length,1);A.equal(JSON.stringify(f.context.profile),saved);f.ui.close();
});
