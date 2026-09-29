'use strict';
const test=require('node:test'),A=require('node:assert/strict');
const L=require('../src/learning.js');

test('v130 learned action experience persists and contributes a bounded preference',()=>{
  const b=new L.SharedBrain();
  b.learnExperience('knight|defend|000100|1|L',4);
  b.learnExperience('knight|defend|000100|1|L',2);
  const value=b.experience('knight|defend|000100|1|L');
  A.ok(value>0 && value<=2.2);
  const restored=new L.SharedBrain(b.export());
  A.equal(restored.state.actionStats['knight|defend|000100|1|L'].count,2);
  A.ok(restored.experience('knight|defend|000100|1|L')>0);
});

test('v130 empirical experience merges across self-play packets',()=>{
  const a=new L.SharedBrain(),base=a.export();
  a.learnExperience('fireball|spell|010100|1|R',3);
  const delta=a.delta(base),record={id:'v130-exp',snapshot:base.snapshot,status:'completed',mode:'Default',quarantined:false,trainingEnabled:true,result:{winner:0},duration:10};
  const merged=L.mergePacket(base,{record,delta});
  A.equal(merged.actionStats['fireball|spell|010100|1|R'].count,1);
  A.equal(merged.actionStats['fireball|spell|010100|1|R'].sum,3);
});

test('v130 experience key distinguishes visible enemy archetypes and battle phase',()=>{
  const base={team:1,seatCount:2,time:20,secondsLeft:160,elixir:8,crowns:[0,0],own:[],towers:[],enemies:[]};
  const a={card:'knight',reason:'defend: test',x:100,y:100};
  const air={...base,enemies:[{air:true,building:false,hp:700,maxHp:700,x:120,y:300,def:{buildingsOnly:false}}]};
  const tank={...base,enemies:[{air:false,building:false,hp:2500,maxHp:2500,x:120,y:300,def:{buildingsOnly:true}}]};
  A.notEqual(L.experienceKey(air,a),L.experienceKey(tank,a));
  A.notEqual(L.experienceKey(air,a),L.experienceKey({...air,time:250,secondsLeft:20},a));
});

test('v130 reward shaping values surviving board advantage, not only tower damage',()=>{
  const r=L.rewardDelta({boardFor:1,boardAgainst:1},{boardFor:3,boardAgainst:0});
  A.ok(r.board>0);
  A.ok(r.total>0);
});

test('v130 experience memory distinguishes the specific visible threat card',()=>{
  const base={team:0,seat:0,seatCount:2,time:50,secondsLeft:130,multiplier:1,elixir:6,own:[],towers:[{team:0,hp:3000,maxHp:3000,x:120,y:560},{team:1,hp:3000,maxHp:3000,x:120,y:80}]};
  const action={card:'musketeer',reason:'defend: threat',x:120,y:430,cost:4};
  const balloon=L.experienceKey({...base,enemies:[{card:'balloon',entity:'Balloon',air:true,hp:1200,maxHp:1200,x:120,y:360}]},action);
  const hog=L.experienceKey({...base,enemies:[{card:'hog-rider',entity:'HogRider',air:false,hp:1200,maxHp:1200,x:120,y:360}]},action);
  A.notEqual(balloon,hog);
  A.match(balloon,/balloon/);A.match(hog,/hog-rider/);
});

test('v130 matchup memory distinguishes the visible threat while keeping a generic fallback',()=>{
  const base={team:0,seatCount:2,time:90,secondsLeft:90,elixir:7,crowns:[0,0],own:[],towers:[]};
  const action={card:'musketeer',reason:'defend: threat',x:240,y:500};
  const knight={...base,enemies:[{card:'knight',entity:'Knight',air:false,building:false,hp:1200,maxHp:1200,x:240,y:280,def:{buildingsOnly:false}}]};
  const giant={...base,enemies:[{card:'giant',entity:'Giant',air:false,building:false,hp:3000,maxHp:3000,x:240,y:280,def:{buildingsOnly:true}}]};
  A.notEqual(L.experienceKey(knight,action,true),L.experienceKey(giant,action,true));
  A.equal(L.experienceKey(knight,action,false),L.experienceKey(giant,action,false));
});
