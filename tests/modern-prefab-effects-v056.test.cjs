'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const A=require('../src/modern-actions.js');
const K=require('../src/catalog.js');

function fixture(record){
 const data={actions:{fx:record},areas:{},buffs:{},entities:{},variables:{}};
 const unit={id:7,owner:0,team:0,x:100,y:200,hp:100,maxHp:100,shield:0,buffs:{},def:{source:{}}};
 const b={time:0,units:[unit],towers:[],areas:[],projectiles:[],effects:[],pending:[],
  getEntity(id){return this.units.find(u=>u.id===id);},effect(e){this.effects.push({...e,born:this.time,fxId:this.effects.length+1});},schedule(e){this.pending.push(e);}};
 return {b,unit,data,ctx:{unit,data}};
}

test('source prefab and legacy companion are emitted together with actor attachment',()=>{
 const record={ClassType:'ActionPlayEffect',Effect:'original_2d_fx',PrefabAsset:'sc3d/original_fx',EffectFlags:'FollowParent,ParticlesFollowParent,Looping',OverrideDuration:7300,OverrideScale:125};
 const f=fixture(record);assert.equal(A.executeAction(f.b,'fx',f.ctx).ok,true);
 assert.equal(f.b.effects.length,1);const e=f.b.effects[0];
 assert.equal(e.sourcePrefab,record.PrefabAsset);assert.equal(e.sourceEffect,record.Effect);
 assert.equal(e.sourceActor,7);assert.equal(e.follow,7);assert.equal(e.sourceAction,'fx');assert.ok(e.sourceActionToken);
 assert.equal(e.particlesFollowParent,true);assert.equal(e.loop,true);assert.equal(e.scale,1.25);assert.equal(e.ttl,7.3);
});

test('prefab singleton stays active until authored override duration and can restart',()=>{
 const f=fixture({ClassType:'ActionPlayEffect',PrefabAsset:'sc3d/pulse',Singleton:true,OverrideDuration:500});
 A.executeAction(f.b,'fx',f.ctx);A.executeAction(f.b,'fx',f.ctx);assert.equal(f.b.effects.length,1);
 f.b.time=.499;A.tickEntity(f.b,f.unit,.1,f.data);A.executeAction(f.b,'fx',f.ctx);assert.equal(f.b.effects.length,1);
 f.b.time=.5;A.tickEntity(f.b,f.unit,.001,f.data);assert.equal(f.unit.modernActions,undefined);
 A.executeAction(f.b,'fx',f.ctx);assert.equal(f.b.effects.length,2);assert.notEqual(f.b.effects[0].sourceActionToken,f.b.effects[1].sourceActionToken);
});

test('linked looping prefab expires its current event when force-stop becomes true',()=>{
 const f=fixture({ClassType:'ActionPlayEffect',PrefabAsset:'sc3d/loop',EffectFlags:'FollowParent,LinkLifeToActionLife,Looping',ForceStopIfTrue:'hp < 50'});
 A.executeAction(f.b,'fx',f.ctx);assert.equal(f.b.effects.length,1);assert.equal(f.b.effects[0].ttl,Infinity);
 f.b.time=6;A.tickEntity(f.b,f.unit,.1,f.data);assert.equal(f.b.effects[0].ttl,Infinity);
 f.unit.hp=40;f.b.time=6.1;A.tickEntity(f.b,f.unit,.1,f.data);assert.equal(f.b.effects[0].ttl,6.1);assert.equal(f.unit.modernActions,undefined);
 A.executeAction(f.b,'fx',f.ctx);assert.equal(f.b.effects.length,1,'already stopped action must not flash');
});

test('linked prefab stops on actor death and preserves independent source effect events',()=>{
 const f=fixture({ClassType:'ActionPlayEffect',PrefabAsset:'sc3d/loop',EffectFlags:'LinkLifeToActionLife,Looping'});
 A.executeAction(f.b,'fx',f.ctx);f.b.effect({sourceEffect:'other',ttl:4});
 f.unit.hp=0;f.b.time=.25;A.onDeath(f.b,f.unit,f.data);
 assert.equal(f.b.effects[0].ttl,.25);assert.equal(f.b.effects[1].ttl,4);
});

test('source action delay is preserved and absent native asset references are not replaced',()=>{
 const record=K.DATA.actions.ElectroGiant_EV1_Play_Pulse_Effect;
 const f=fixture({...record,ActionDelay:200});
 A.executeAction(f.b,'fx',f.ctx);assert.equal(f.b.effects.length,0);assert.equal(f.b.pending.length,1);
 f.b.time=.2;A.resolvePending(f.b,f.b.pending[0],f.data);
 assert.equal(f.b.effects[0].sourcePrefab,record.PrefabAsset);assert.equal(f.b.effects[0].sourceEffect,undefined);
});

test('source PropState actions preserve named selector values including zero',()=>{
 const f=fixture(K.DATA.actions.AngryBarbarian_EV1_set_prop_state);
 f.unit.animationModifiers={OtherParameter:3};
 A.executeAction(f.b,'fx',f.ctx);assert.deepEqual(f.unit.animationModifiers,{OtherParameter:3,PropState:1});
 f.data.actions.fx=K.DATA.actions.AngryBarbarian_EV1_set_normal_state;
 A.executeAction(f.b,'fx',f.ctx);assert.deepEqual(f.unit.animationModifiers,{OtherParameter:3,PropState:0});
 f.data.actions.fx=K.DATA.actions.BarbLog_hero_set_pro_modifier;
 A.executeAction(f.b,'fx',f.ctx);assert.equal(f.unit.animationModifiers.PropState,1);
 f.data.actions.fx={ClassType:'ActionSetAnimationModifier',Modifier:'legacy'};
 A.executeAction(f.b,'fx',f.ctx);assert.equal(f.unit.modernAnimationModifier,'legacy');
 assert.equal(f.unit.animationModifiers.PropState,1);
});

test('prefab-only execution and force-stop updates leave serialized gameplay action state unchanged',()=>{
 const f=fixture({ClassType:'ActionPlayEffect',PrefabAsset:'sc3d/loop',EffectFlags:'LinkLifeToActionLife,Looping',ForceStopIfTrue:'hp < 50'});
 f.unit.modernActions={variables:{existing:3},timers:[],tags:[],listeners:[],serial:41};
 const before=JSON.stringify(f.unit.modernActions);
 A.executeAction(f.b,'fx',f.ctx);assert.equal(JSON.stringify(f.unit.modernActions),before);
 f.b.time=.25;A.tickEntity(f.b,f.unit,.25,f.data);assert.equal(JSON.stringify(f.unit.modernActions),before);
 f.unit.hp=20;f.b.time=.5;A.tickEntity(f.b,f.unit,.25,f.data);
 assert.equal(f.b.effects[0].ttl,.5);assert.equal(JSON.stringify(f.unit.modernActions),before);
 A.executeAction(f.b,'fx',f.ctx);assert.equal(JSON.stringify(f.unit.modernActions),before);
 assert.equal(f.b.effects.length,1);
});

test('read-only visual conditions do not initialize modernActions on otherwise stateless units',()=>{
 const f=fixture({ClassType:'ActionPlayEffect',PrefabAsset:'sc3d/pulse',ForceStopIfTrue:'hp < 50',OverrideDuration:100});
 A.executeAction(f.b,'fx',f.ctx);assert.equal(Object.hasOwn(f.unit,'modernActions'),false);
 f.b.time=.05;A.tickEntity(f.b,f.unit,.05,f.data);assert.equal(Object.hasOwn(f.unit,'modernActions'),false);
 f.b.time=.1;A.tickEntity(f.b,f.unit,.05,f.data);assert.equal(Object.hasOwn(f.unit,'modernActions'),false);
 assert.equal(f.b.effects[0].ttl,.1);
});

test('prefab singleton ownership is isolated by battle and by actual actor object',()=>{
 const record={ClassType:'ActionPlayEffect',PrefabAsset:'sc3d/pulse',Singleton:true,OverrideDuration:1000};
 const first=fixture(record),second=fixture(record);
 second.unit=first.unit;second.ctx.unit=first.unit;second.b.units=[first.unit];
 A.executeAction(first.b,'fx',first.ctx);A.executeAction(second.b,'fx',second.ctx);
 assert.equal(first.b.effects.length,1);assert.equal(second.b.effects.length,1);
 first.ctx.unit={...first.unit};first.b.units=[first.ctx.unit];
 A.executeAction(first.b,'fx',first.ctx);assert.equal(first.b.effects.length,2);
 assert.equal(first.unit.modernActions,undefined);
});

test('prefab effects preserve legacy GameTagsToSet token, duration, repeat and force-stop semantics',()=>{
 const f=fixture({ClassType:'ActionPlayEffect',PrefabAsset:'sc3d/loop',EffectFlags:'LinkLifeToActionLife,Looping',Singleton:true,GameTagsToSet:'NO_MOVE',ForceStopIfTrue:'hp < 50'});
 A.executeAction(f.b,'fx',f.ctx);A.executeAction(f.b,'fx',f.ctx);
 assert.equal(f.b.effects.length,1);
 assert.deepEqual(f.unit.modernActions,{variables:{},timers:[],tags:[{tags:['NO_MOVE'],until:4,token:'effect'},{tags:['NO_MOVE'],until:4,token:'effect'}],listeners:[],serial:0});
 f.unit.hp=20;f.b.time=.5;A.executeAction(f.b,'fx',f.ctx);
 assert.equal(f.b.effects.length,1);assert.deepEqual(f.unit.modernActions.tags.at(-1),{tags:['NO_MOVE'],until:4.5,token:'effect'});
 A.tickEntity(f.b,f.unit,0,f.data);assert.equal(f.b.effects[0].ttl,.5);assert.equal(f.unit.modernActions.tags.length,3);
 assert.equal(f.unit.modernActions.serial,0);
});

test('projectile and area visual lifetimes update without creating gameplay timers',()=>{
 for(const kind of ['projectiles','areas']){
  const f=fixture({ClassType:'ActionPlayEffect',PrefabAsset:'sc3d/loop',EffectFlags:'Looping,LinkLifeToActionLife',ForceStopIfTrue:'hp < 50'});
  f.b.units=[];f.b[kind]=[f.unit];
  A.executeAction(f.b,'fx',f.ctx);assert.equal(f.unit.modernActions,undefined);
  f.unit.hp=20;f.b.time=.5;A.tickBattle(f.b,.5,f.data);
  assert.equal(f.b.effects[0].ttl,.5);assert.equal(f.unit.modernActions,undefined);
 }
});
