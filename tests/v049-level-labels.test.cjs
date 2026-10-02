'use strict';
const test=require('node:test'),A=require('node:assert/strict');
const C=require('../src/core.js'),L=require('../src/level-labels.js'),P=require('../src/platform.js');
function troop(id,extra={}){return {id,team:0,level:9,x:40+id*10,y:440,hp:100,maxHp:100,shield:0,maxShield:0,levelGroupId:'swarm',...extra};}

test('compact swarm labels default on and only a saved boolean false disables them',()=>{
 A.equal(C.normalizeProfile().compactSwarmLevels,true);
 for(const raw of [undefined,null,0,1,'false','true',{},[]])A.equal(C.normalizeProfile({compactSwarmLevels:raw}).compactSwarmLevels,true);
 A.equal(C.normalizeProfile({version:13,compactSwarmLevels:false}).compactSwarmLevels,false);
 A.equal(C.normalizeProfile({compactSwarmLevels:true}).compactSwarmLevels,true);
});

test('individual swarm labels survive repository reload, export and import, and graphics changes',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},make=()=>new P.ProfileRepository({storage,normalize:C.normalizeProfile});
 const first=make(),profile=first.load();profile.compactSwarmLevels=false;first.save(profile);
 const loaded=make().load();A.equal(loaded.compactSwarmLevels,false);
 for(const textures of ['low','med','good','high','max','ultra']){
  const imported=C.normalizeProfile(JSON.parse(JSON.stringify({...loaded,graphics:{...loaded.graphics,textures}})));
  A.equal(imported.compactSwarmLevels,false,textures);
 }
 loaded.compactSwarmLevels=true;make().save(loaded);A.equal(make().load().compactSwarmLevels,true);
});

test('disabling compact labels gives every visible swarm member an individual level without mutating units',()=>{
 const units=[troop(1),troop(2,{entity:'Bat'}),troop(3,{entity:'Goblin'}),troop(4,{hp:70}),troop(5,{team:1,level:12})],before=JSON.stringify(units);
 const compact=L.plan(units,()=>true,true);A.equal(compact.groups.length,1);A.deepEqual([...compact.individual].sort(),[4,5]);
 const individual=L.plan(units,()=>true,false);A.equal(individual.groups.length,0);A.deepEqual([...individual.individual].sort(),[1,2,3,4,5]);
 A.equal(JSON.stringify(units),before);
});

test('individual labels still exclude dead, hidden, attached, burrowing and absent units',()=>{
 const units=[troop(1),troop(2,{hp:0}),troop(3,{dead:true}),troop(4,{hidden:true}),troop(5,{burrowing:true}),troop(6,{effectCarrier:true}),troop(7,{attachedTo:12}),troop(8)];
 const labels=L.plan(units,u=>u.id!==8,false);A.deepEqual([...labels.individual],[1]);A.equal(labels.groups.length,0);
});

test('real bats, minions, skeletons, goblins and mixed swarms all label every member when compact mode is off',()=>{
 for(const id of ['bats','minions','minion-horde','skeleton-army','goblin-gang','rascals','guards']){
  const b=new C.Battle({ai:false});b.cast(C.cardAt(id),0,240,440);
  const units=b.units.filter(L.visible);A.ok(units.length>2,id);
  const labels=L.plan(units,()=>true,false);A.equal(labels.groups.length,0,id);A.deepEqual([...labels.individual],units.map(u=>u.id),id);
 }
});
