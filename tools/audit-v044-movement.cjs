
'use strict';
const C=require('../src/core'),A=require('assert/strict'),fs=require('fs');
function scenario(mode,entity,team,x,startY,targetY,pack=1){
 const b=new C.Battle({mode,ai:false,headless:true,seed:671}),goal={x:x*C.SX,y:targetY*C.SY,hp:1e6,team:1-team};
 // Retain real towers as obstacles. Movement is exercised directly to prevent
 // tower attacks from killing the units before route clearance can be measured.
 const us=Array.from({length:pack},(_,i)=>b.spawn(entity,team,(x+(pack===1?0:(i%3-1)*.7))*C.SX,(startY+(team?-1:1)*Math.floor(i/3)*.8)*C.SY,{owner:team,wait:0}));
 const samples=[];
 for(let frame=0;frame<2400;frame++){b.time+=1/60;for(const u of us){u.previousX=u.x;u.previousY=u.y;b.move(u,goal,1/60);}b.separate(1/60);if(frame===2100)for(const u of us)samples.push([u.x,u.y]);}
 const last=us.map((u,i)=>({x:u.x/C.SX,y:u.y/C.SY,reach:u.def.range+u.def.radiusTiles,distance:Math.hypot((u.x-goal.x)/C.SX,(u.y-goal.y)/C.SY),delta:Math.hypot((u.x-samples[i][0])/C.SX,(u.y-samples[i][1])/C.SY)}));
 const stuck=last.filter(u=>u.distance>u.reach+.15&&u.delta<.1);
 return{mode,entity,team,x,startY,targetY,pack,stuck,last,searches:b.navigator.searches};
}
const out=[];
for(const entity of ['Giant','Golem','Pekka'])for(const team of [0,1])for(const x of [1.15,16.85])out.push(scenario('Team3v3',entity,team,x,team?4:28,team?12:20));
for(const mode of ['Default','Team3v3','BridgeBattle','TeamRumble'])for(const team of [0,1]){
 const l=require('../src/arena-layout').get(mode);for(const x of l.custom?l.lanes:[3.5,14.5])out.push(scenario(mode,'Giant',team,x,team?13:19,team?20:12));
}
out.push(scenario('Team3v3','Barbarian',0,3.5,20,12,18));
fs.writeFileSync('docs/verification-v044/movement-audit.json',JSON.stringify(out,null,2));
const fails=out.filter(x=>x.stuck.length);
console.log(JSON.stringify({scenarios:out.length,failed:fails.length,failures:fails.map(x=>({mode:x.mode,entity:x.entity,x:x.x,team:x.team,stuck:x.stuck.length}))}));
A.equal(fails.length,0);
