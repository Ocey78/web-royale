'use strict';
// Exercise real movement and separation, not only existence of a path. Towers
// remain live obstacles; their attacks are not ticked so they cannot kill probes.
const C=require('../src/core'),L=require('../src/arena-layout'),N=require('../src/navigation'),assert=require('node:assert/strict'),fs=require('node:fs');
const results=[];
for(const mode of ['Team3v3','BridgeBattle','TeamRumble']){
 const template=new C.Battle({mode,ai:false,headless:true,seed:772});
 for(const entity of ['Giant','Golem','Pekka','GiantSkeleton'])for(const towerIndex of template.towers.keys()){
  const b=new C.Battle({mode,ai:false,headless:true,seed:772}),t=b.towers[towerIndex],r=C.entityDef(entity,9).radiusTiles,dir=t.team?1:-1;
  const start={x:t.x/C.SX,y:t.y/C.SY-dir*(t.def.radiusTiles+r+.1)},target={x:b.arenaLayout.lanes[L.lane(start.x,mode)]*C.SX,y:16*C.SY,hp:1e9,team:1-t.team};
  const obstacles=b.towers.map(o=>({id:o.id,x:o.x/C.SX,y:o.y/C.SY,radius:o.def.radiusTiles}));
  assert.ok(N.pointClear(start,r,obstacles,{layout:mode}),`${mode} ${entity} rear start ${t.id}`);
  const u=b.spawn(entity,t.team,start.x*C.SX,start.y*C.SY,{owner:t.team,wait:0});let last,invalid=0,minProgress=Infinity;
  for(let i=0;i<3000;i++){
   b.time+=1/60;u.previousX=u.x;u.previousY=u.y;b.move(u,target,1/60);b.separate(1/60);
   if(!N.pointClear({x:u.x/C.SX,y:u.y/C.SY},r,obstacles,{layout:mode}))invalid++;
   if(i===2700)last={x:u.x,y:u.y};
  }
  const distance=Math.hypot((u.x-target.x)/C.SX,(u.y-target.y)/C.SY),reach=u.def.range+r,drift=Math.hypot((u.x-last.x)/C.SX,(u.y-last.y)/C.SY);
  const row={mode,entity,tower:t.entity,team:t.team,slot:t.crownSlot,start,end:{x:u.x/C.SX,y:u.y/C.SY},distance,reach,drift,invalid,searches:b.navigator.searches,passed:distance<=reach+.05&&invalid===0};results.push(row);
 }
}
fs.writeFileSync('docs/verification-v044/rear-clearance-audit.json',JSON.stringify(results,null,2));
console.log(JSON.stringify({scenarios:results.length,failed:results.filter(x=>!x.passed).length,failures:results.filter(x=>!x.passed)},null,2));
assert.ok(results.every(x=>x.passed),'Every rear deployment must reach midfield without crossing footprints or map edges');
