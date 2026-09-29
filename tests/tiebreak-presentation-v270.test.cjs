'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Announcer}=require('../src/announcements.js');
require('../src/presentation.js');
const state=()=>({id:'match',section:{index:2},secondsLeft:1,multiplier:3,overtime:true,result:null});
test('tiebreak message immediately replaces queued overtime and elixir announcements',()=>{
 const a=new Announcer(),b=state();a.update(b,0);
 b.tiebreaker={duration:4};b.secondsLeft=0;
 const message=a.update(b,100);
 assert.equal(message.key,'tiebreaker');assert.equal(message.main,'Tiebreaker');
 assert.match(message.sub,/tower health/i);assert.equal(a.queue.length,0);
 assert.equal(a.update(b,3000).key,'tiebreaker');
});
test('tiebreak announcement survives pauses until resolution and resets for another match',()=>{
 const a=new Announcer(),b={...state(),secondsLeft:0,tiebreaker:{duration:4}};
 a.update(b,0);assert.equal(a.update(b,5000).key,'tiebreaker');assert.equal(a.queue.length,0);
 b.result={winner:0};assert.equal(a.update(b,6000),null);b.result=null;
 assert.equal(a.update({...b,id:'next'},7000).key,'tiebreaker');
});
test('native timer shows tiebreak label without an elixir regeneration badge',()=>{
 const binding=globalThis.RoyalePresentation.timerBindings(0,3,true);
 assert.equal(binding.texts['timeLeft.txt'],'0:00');
 assert.equal(binding.texts['TID_TIME_LEFT.TID_TIME_LEFT_vcenter'],'Tiebreaker');
 assert.equal(binding.instances.elixirRegen.visible,false);
 assert.equal(globalThis.RoyalePresentation.timerBindings(120,2).instances.elixirRegen.visible,true);
});
