'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),C=require('../src/core');
const tileY=(team,y)=>team?32-y:y;
function setup(name,team,lane,fallen=false){
 const b=new C.Battle({ai:false,seed:71,headless:true});
 if(fallen)b.towers.find(t=>t.team!==team&&!t.king&&(t.x>9*C.SX?1:0)===lane).hp=0;
 const u=b.spawn(name,team,(lane?12:6)*C.SX,tileY(team,22)*C.SY,{wait:0});
 return{b,u};
}
for(const name of ['BabyDragon','Balloon','Knight'])for(const team of [0,1])for(const lane of [0,1]){
 test(`${name} team ${team} lane ${lane}: clear off-lane deployment advances diagonally without a sideways-only leg`,()=>{
  const{b,u}=setup(name,team,lane),x=u.x,y=u.y;
  for(let n=0;n<30;n++)b.step(1/60);
  assert((u.x-x)*(lane?1:-1)>0,'Approach the selected lane');
  assert((u.y-y)*(team?1:-1)>.15*C.SY,'Make forward progress immediately instead of first sliding sideways');
  assert.equal(b.getEntity(u.targetId)?.x/C.SX,lane?14.5:3.5);
 });
}
for(const name of ['BabyDragon','Balloon'])for(const team of [0,1])for(const lane of [0,1])for(const fallen of [false,true]){
 test(`${name} team ${team} lane ${lane}, Princess ${fallen?'absent':'alive'}: empty-board flight has no artificial corner when the same Crown enters sight`,()=>{
  const{b,u}=setup(name,team,lane,fallen),initial=b.chooseTarget(u);let prior=null,worstTurn=0,attacked=null,sawAdvance=false,sawChase=false;
  for(let n=0;n<60*35&&!b.result&&u.hp>0;n++){
   const intent=b.targetDecision(u);sawAdvance||=intent.kind==='advance';sawChase||=intent.kind==='chase';
   const x=u.x,y=u.y;b.step(1/60);const dx=(u.x-x)/C.SX,dy=(u.y-y)/C.SY;
   if(Math.hypot(dx,dy)>1e-8){
    const angle=Math.atan2(dy,dx);if(prior!==null)worstTurn=Math.max(worstTurn,Math.abs(Math.atan2(Math.sin(angle-prior),Math.cos(angle-prior))));prior=angle;
    assert(lane?u.x>=9*C.SX-1e-7:u.x<=9*C.SX+1e-7,'Do not fly to the opposite Princess lane');
   }
   if(u.windup){attacked=b.getEntity(u.targetId);break;}
  }
  assert(sawAdvance&&sawChase,'Exercise the default-advance to local-pursuit boundary');
  assert.equal(attacked?.id,initial.id,'Reach the intended Crown');
  assert(worstTurn<Math.PI/180,`Unchanged clear target must not produce a ${worstTurn*180/Math.PI} degree corner`);
 });
}
