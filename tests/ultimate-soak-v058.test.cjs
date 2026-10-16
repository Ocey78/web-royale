'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../src/core');

for(const seed of [58017,58029])test(`Ultimate AI match ${seed} reaches a valid ending with finite capped combat state`,()=>{
 const b=new C.Battle({mode:'UltimateClash',queue:'challenge',ai:true,headless:true,recording:'compact',seed});
 for(let step=0;step<8500&&!b.result;step++){
  if(step%5===0)b.aiPlay(0);
  b.step(.05);
  if(step%40===0){
   assert.ok(b.elixir.every(e=>Number.isFinite(e)&&e>=0&&e<=20));
   for(const u of b.active){assert.ok([u.x,u.y,u.hp,u.maxHp].every(Number.isFinite),u.entity);assert.ok(u.hp>0);}
   assert.ok(b.units.length<=500);assert.ok(b.projectiles.length<1000);assert.ok(b.pending.length<1000);
  }
 }
 assert.ok(b.result,'match completes by 420-second limit plus tiebreaker');
 assert.ok(b.time<=424.1);assert.ok([-1,0,1].includes(b.result.winner));
 assert.ok(b.metrics.spent.every(value=>value>0),'both AI seats played cards');
});
