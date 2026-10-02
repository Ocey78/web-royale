'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
require('../src/presentation.js');
const P=global.RoyalePresentation;
test('health-bar crown frame is not selected by combat level',()=>{
 assert.equal(typeof P.healthInstances,'function');
 for(const level of [1,9,13,30])assert.equal(P.healthInstances({level},.8).crown.frame,0);
});
test('building lifetime does not invent a source ammo-bar value',()=>{
 assert.equal(typeof P.healthInstances,'function');
 assert.equal(P.healthInstances({level:9,def:{source:{LifeTime:30000}}},.8).ammo.visible,false);
});
test('source health-bar progress remains the inverse of the clamped fill',()=>{
 assert.equal(typeof P.healthInstances,'function');
 assert.equal(P.healthInstances({level:9},1).bar.progress,0);
 assert.equal(P.healthInstances({level:9},.2).bar.progress,.8);
});
test('original timer bindings use source instance names and clamp time',()=>{
 assert.equal(typeof P.timerBindings,'function');
 assert.equal(P.timerBindings(180,1).texts['timeLeft.txt'],'3:00');
 assert.equal(P.timerBindings(-5,2).texts['timeLeft.txt'],'0:00');
 assert.equal(P.timerBindings(125,3).texts['elixirRegen.elixir.txt'],'x3');
 assert.equal(P.timerBindings(180,1).instances.elixirRegen.visible,false);
});
