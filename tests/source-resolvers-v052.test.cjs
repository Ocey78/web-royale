'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const K=require('../src/catalog.js');
let R;try{R=require('../src/source-resolvers.js');}catch(e){if(e.code!=='MODULE_NOT_FOUND')throw e;}
function unit(id,x,y,extra={}){return{id,x:x*K.SX,y:y*K.SY,hp:100,maxHp:100,team:1,entity:'Knight',buffs:{},def:{radiusTiles:.3},...extra};}
test('source Balloon resolver excludes towers/flyers/hidden enemies and ranks equal-distance targets by current HP',()=>{
 assert.ok(R,'source resolver module is available');
 const parent=unit(1,9,16,{team:0}),targets=[unit(2,10,16,{hp:50}),unit(3,8,16,{hp:80}),unit(4,9,17,{king:false}),unit(5,9,15,{air:true}),unit(6,9,16.5,{hidden:true}),unit(7,17,16),unit(8,9,17,{team:0})];
 const b={active:[parent,...targets],time:1};
 assert.deepEqual(R.resolve(b,'BalloonHero_Skeletrooper_Spawn_Target_Resolver',{unit:parent,data:K.DATA}).map(u=>u.id),[3,2]);
});
test('source rear cone uses troop heading and source83-degree angle',()=>{
 assert.ok(R,'source resolver module is available');
 const parent=unit(1,9,16,{team:0,heading:-Math.PI/2,entity:'MinionGiant'}),targets=[unit(2,9,17,{team:0,entity:'Minion'}),unit(3,9,15,{team:0,entity:'Minion'}),unit(4,11,17,{team:0,entity:'Minion'}),unit(5,9,17.5,{team:0,entity:'Knight'})];
 assert.deepEqual(R.resolve({active:[parent,...targets],time:0},'MinionGiant_easter_egg_resolver',{unit:parent,data:K.DATA}).map(u=>u.id),[2]);
});
test('IceWizard resolver requires an unexpired mark from the checking caster',()=>{
 assert.ok(R,'source resolver module is available');
 const parent=unit(1,9,16,{team:0,owner:0}),targets=[unit(2,9,17,{buffs:{mark:{name:'IceWizardHeroCold',until:5,sourceId:1}}}),unit(3,8,17,{buffs:{mark:{name:'IceWizardHeroCold',until:5,sourceId:99}}}),unit(4,10,17,{buffs:{mark:{name:'IceWizardHeroSlow',until:1,sourceId:1}}}),unit(5,9,18)];
 assert.deepEqual(R.resolve({active:[parent,...targets],time:2},'IceWizardHero_target_resolver',{unit:parent,data:K.DATA}).map(u=>u.id),[2]);
});
test('lowest max HP resolver uses source furthest strategy for ties with deterministic entity id',()=>{
 assert.ok(R,'source resolver module is available');
 const parent=unit(1,9,16,{team:0}),targets=[unit(2,10,16,{maxHp:100}),unit(3,12,16,{maxHp:100}),unit(4,6,16,{maxHp:100}),unit(5,11,16,{maxHp:200})];
 assert.deepEqual(R.resolve({active:[parent,...targets],time:0},'MegaMinion_hero_target_resolver',{unit:parent,data:K.DATA}).map(u=>u.id),[3,4,2,5]);
});
test('native action tag lifetimes prevent querying an untargetable troop until expiry',()=>{
 assert.ok(R);const parent=unit(1,9,16,{team:0}),target=unit(2,9,17,{modernActions:{tags:[{tags:['UNTARGETABLE'],until:2,token:1}]}}),b={active:[parent,target],time:1};
 assert.deepEqual(R.resolve(b,'BalloonHero_Skeletrooper_Spawn_Target_Resolver',{unit:parent,data:K.DATA}),[]);b.time=2;
 assert.deepEqual(R.resolve(b,'BalloonHero_Skeletrooper_Spawn_Target_Resolver',{unit:parent,data:K.DATA}).map(u=>u.id),[2]);
});
test('noncombat attached controllers are excluded from ordinary target queries',()=>{const parent=unit(1,9,16,{team:0}),targets=[unit(2,9,17,{controllerOnly:true}),unit(3,9,17,{effectCarrier:true}),unit(4,9,17,{attachedTo:99}),unit(5,9,18)];assert.deepEqual(R.resolve({active:[parent,...targets],time:0},'BalloonHero_Skeletrooper_Spawn_Target_Resolver',{unit:parent,data:K.DATA}).map(u=>u.id),[5]);});
test('unknown shapes strategies and filter semantics fail preflight without reading battle targets',()=>{
 assert.ok(R,'source resolver module is available');
 const data={targetResolvers:{query:{Shape:'shape',Filter:'filter',StrategyList:['RESOLVER_STRATEGY_CLOSEST_TARGET']}},shapes:{shape:{ClassType:'Unknown'}},gameObjectFilters:{filter:{MatchTeamEnemy:true}}};
 assert.equal(R.preflight('query',{data}).ok,false);
 data.shapes.shape={ClassType:'Global'};data.targetResolvers.query.StrategyList=['native-only'];assert.equal(R.preflight('query',{data}).ok,false);
 data.targetResolvers.query.StrategyList=[];data.gameObjectFilters.filter.SomeNativeRule=true;assert.equal(R.preflight('query',{data}).ok,false);
 assert.throws(()=>R.resolve({get active(){throw Error('targets read before preflight');}},'query',{data,unit:unit(1,0,0)}),/Unsupported/);
});
