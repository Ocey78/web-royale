'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const M=require('../src/modern-3d.js');
const A=require('../src/modern-actions.js');
const K=require('../src/catalog.js');
const manifest=require('../assets/modern-heroes/manifest.json');

test('native Evo selector Parameter 2 follows source PropState actions independently of shields',()=>{
 const part=manifest.heroes.AngryBarbarian_EV1.parts[0];
 const unit={id:1,hp:100,shield:50,x:0,y:0,def:{source:{}}};
 const b={time:0,units:[unit],effects:[],pending:[],effect(){},schedule(e){this.pending.push(e);}};
 for(const [action,value,suffix]of [['AngryBarbarian_EV1_set_prop_state',1,'_Prop'],['AngryBarbarian_EV1_set_normal_state',0,'_Origin']]){
  assert.equal(A.executeAction(b,action,{unit,data:K.DATA}).ok,true);
  assert.equal(unit.animationModifiers.PropState,value);
  for(const state of ['Idle','Walk','Attack'])assert.equal(M.resolveState(part.asm,state,unit),state+suffix);
 }
 assert.equal(M.resolveState(part.asm,'Idle',{shield:100}), 'Idle_Origin');
});

test('both Evo source entities use the same original rig and preserve throw mesh visibility events',()=>{
 const first=manifest.heroes.AngryBarbarian_EV1,second=manifest.heroes.AngryBarbarian_EV1_2;
 assert.equal(first.parts[0].file,second.parts[0].file);
 assert.equal(first.sourceEntity.Name,'AngryBarbarian_EV1');assert.equal(second.sourceEntity.Name,'AngryBarbarian_EV1_2');
 const state=first.parts[0].asm.States.find(s=>s.Name==='Attack2');
 const event=state.Events.find(e=>e.Event==='HideMesh');
 assert.equal(event.Frame,14);assert.equal(event.EndFrame,31);assert.equal(state.EndFrame,27);
 assert.equal(first.parts[0].animations.Attack2.markers[0].Frame,14);
});
