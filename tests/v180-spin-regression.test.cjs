'use strict';
const test=require('node:test'),A=require('node:assert/strict');
const K=require('../src/catalog.js'),B=require('../src/battle.js');
function wrap(a){while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;}
function packedRun(hz=60){
 const dt=1/hz,b=new B.Battle({ai:false});b.units=[];const cx=3.5,n=4;
 const units=Array.from({length:n},(_,i)=>{const a=i*2*Math.PI/n,u=b.makeEntity('Knight',0,(cx+.15*Math.cos(a))*K.SX,(22+.15*Math.sin(a))*K.SY,{level:9,wait:0});b.units.push(u);return u;});
 const target={id:-1,x:cx*K.SX,y:10*K.SY,def:{radiusTiles:0}},turn=units.map(()=>0),prev=units.map(u=>u.heading),startY=units.map(u=>u.y);
 for(let step=0;step<5*hz;step++){for(let i=0;i<n;i++){b.move(units[i],target,dt);turn[i]+=Math.abs(wrap(units[i].heading-prev[i]));prev[i]=units[i].heading;}b.separate(dt);}
 return units.map((u,i)=>({forward:(startY[i]-u.y)/K.SY,turn:turn[i],x:u.x/K.SX,y:u.y/K.SY}));
}

test('v180 clustered same-direction troops spread sideways without orbiting or spinning',()=>{
 const result=packedRun(60);
 for(const [i,u] of result.entries()){
  A.ok(u.forward>2.5,`unit ${i} only advanced ${u.forward.toFixed(2)} tiles`);
  A.ok(u.turn<12,`unit ${i} spun ${u.turn.toFixed(2)} radians`);
 }
});

test('v180 soft separation is time-step scaled rather than frame-rate dependent',()=>{
 const fast=packedRun(60),slow=packedRun(20);
 const avg=a=>a.reduce((n,u)=>n+u.forward,0)/a.length;
 A.ok(Math.abs(avg(fast)-avg(slow))<.35,`60Hz ${avg(fast).toFixed(2)} vs 20Hz ${avg(slow).toFixed(2)}`);
});
