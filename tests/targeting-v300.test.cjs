'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),C=require('../src/core.js');
const make=()=>{const b=new C.Battle({ai:false});b.towers=[];return b;};
const spawn=(b,name,team,x,y)=>b.spawn(name,team,x*C.SX,y*C.SY,{wait:0});
const advance=(b,u,seconds)=>{for(let i=0;i<Math.round(seconds*60);i++){b.time+=1/60;b.tickEntity(u,1/60);b.tickProjectiles(1/60);}};
function mortarWindup(){const b=make(),m=spawn(b,'Mortar',0,9,25),target=spawn(b,'Giant',1,9,19);assert(C.edge(m,target)>=m.def.minRange);m.targetId=target.id;b.startAttack(m,target);advance(b,m,.2);return{b,m,target};}

test('Mortar cancels an unlaunched shot when its target enters the source minimum range',()=>{
 const{b,m,target}=mortarWindup();target.y=23*C.SY;assert(C.edge(m,target)<m.def.minRange);
 advance(b,m,.1);assert.equal(m.targetId,null);assert.equal(m.windup,null);assert.equal(m.visualAttack,null);assert.equal(m.visualAttackCancelled,true);
 advance(b,m,2);assert.equal(b.projectiles.length,0);assert.equal(target.hp,target.maxHp,'No blind-spot damage from the canceled shot');
});

test('Mortar can reacquire a legal target and starts its full new windup',()=>{
 const{b,m,target}=mortarWindup(),replacement=spawn(b,'Knight',1,12,19);target.y=23*C.SY;
 advance(b,m,1/60);assert.equal(m.targetId,replacement.id);assert.equal(m.windup.target,replacement.id);assert.equal(m.windup.remaining,m.def.firstHit);assert.equal(m.visualAttack.releasedAt,null);
 advance(b,m,.8);assert.equal(b.projectiles.length,0,'Old remaining windup must not fire early at the replacement');
 advance(b,m,.3);assert(b.projectiles.some(p=>p.name==='MortarProjectile'));assert.equal(target.hp,target.maxHp);
});

test('minimum-range forecasting is pure, even while a real attack is pending',()=>{
 const{b,m,target}=mortarWindup();target.y=23*C.SY;const before=JSON.stringify({unit:m,effects:b.effects,events:b.events});
 assert.equal(b.chooseTarget(m),null);assert.equal(b.chooseTarget(m,[]),null);
 assert.equal(JSON.stringify({unit:m,effects:b.effects,events:b.events}),before,'Placement forecasts must not cancel or alter live attacks');
});

test('Mortar still acquires targets at the exact minimum-range boundary',()=>{
 const b=make(),m=spawn(b,'Mortar',0,9,25),target=spawn(b,'Knight',1,9,25-m.def.minRange-m.def.radiusTiles-.5);
 assert(Math.abs(C.edge(m,target)-m.def.minRange)<1e-9);assert.equal(b.chooseTarget(m)?.id,target.id);
});

test('losing a dead target clears its pending attack presentation',()=>{
 const b=make(),u=spawn(b,'Knight',0,9,25),target=spawn(b,'Knight',1,9,23.5);u.targetId=target.id;b.startAttack(u,target);target.hp=0;
 advance(b,u,1/60);assert.equal(u.windup,null);assert.equal(u.targetId,null);assert.equal(u.visualAttack,null);assert.equal(u.visualAttackCancelled,true);
});

test('source maximum-distance grace still preserves an already-started shot',()=>{
 const b=make(),u=spawn(b,'Musketeer',0,9,25),target=spawn(b,'Knight',1,9,21);u.targetId=target.id;b.startAttack(u,target);target.y=17.5*C.SY;
 assert(C.edge(u,target)>u.def.range);assert(C.edge(u,target)<=u.def.range+C.DATA.globals.LOGIC_CANCEL_HIT_FROM_LONG_DISTANCE_RANGE.NumberValue/1000);
 assert.equal(b.chooseTarget(u)?.id,target.id);advance(b,u,.9);assert(b.projectiles.some(p=>p.name==='MusketeerProjectile'));
});

test('a target beyond the source maximum-distance grace cancels and clears its pending pose immediately',()=>{
 const b=make(),u=spawn(b,'Musketeer',0,9,25),target=spawn(b,'Knight',1,9,21);u.targetId=target.id;b.startAttack(u,target);target.y=15*C.SY;
 assert.equal(b.chooseTarget(u),null,'The source maximum-distance grace has a finite outer boundary');
 advance(b,u,1/60);assert.equal(b.projectiles.length,0);assert.equal(u.windup,null);assert.equal(u.visualAttack,null);assert.equal(u.visualAttackCancelled,true);
});
test('a canceled hit can keep the same navigation target without retaining its pending attack',()=>{
 const b=make(),u=spawn(b,'Knight',0,9,25),target=spawn(b,'Knight',1,9,23.5);u.targetId=target.id;b.startAttack(u,target);target.y=20*C.SY;
 assert(C.edge(u,target)>u.def.range+1.5);assert(C.edge(u,target)<u.def.sight);assert.equal(b.chooseTarget(u)?.id,target.id,'Still the nearest legal chase destination');
 advance(b,u,1/60);assert.equal(u.targetId,target.id);assert.equal(u.windup,null);assert.equal(u.visualAttack,null);assert.equal(u.visualAttackCancelled,true);assert.equal(u.visualState,'run');
});

const Sandbox=require('../src/sandbox.js');
for(const sandbox of [false,true])for(const team of [0,1]){
 const label=`${sandbox?'sandbox':'normal'} team ${team}`,world=()=>sandbox?new Sandbox.Session().battle:new C.Battle({ai:false}),tile=(b,name,side,x,y)=>spawn(b,name,side,x,team?32-y:y);
 test(`${label}: a walking troop freely selects a closer valid enemy, including a 0.1-tile improvement`,()=>{
  const b=world();b.towers=[];const u=tile(b,'Knight',team,9,25),old=tile(b,'Knight',1-team,9,21),closer=tile(b,'Knight',1-team,9,21.1);u.targetId=old.id;
  assert(C.edge(u,old)>u.def.range);assert.equal(b.chooseTarget(u)?.id,closer.id);b.time+=1/60;b.tickEntity(u,1/60);assert.equal(u.targetId,closer.id);
 });
 test(`${label}: engaged lock survives distraction but releases on death, concealment, or lost range`,()=>{
  for(const invalid of ['dead','hidden','invisible','range']){
   const b=world();b.towers=[];const u=tile(b,'Knight',team,9,25),old=tile(b,'Knight',1-team,9,23.5),closer=tile(b,'Knight',1-team,9.8,25);u.targetId=old.id;
   assert.equal(b.chooseTarget(u)?.id,old.id,'A closer arrival must not steal an in-range lock');
   if(invalid==='dead')old.hp=0;else if(invalid==='range')old.y=(team?11:21)*C.SY;else old[invalid]=true;
   assert.equal(b.chooseTarget(u)?.id,closer.id,invalid);b.time+=1/60;b.tickEntity(u,1/60);assert.equal(u.targetId,closer.id);
  }
 });
 test(`${label}: source ground/air and buildings-only categories remain hard restrictions`,()=>{
  const b=world();b.towers=[];const knight=tile(b,'Knight',team,9,25),bat=tile(b,'Bat',1-team,9,24),ground=tile(b,'Knight',1-team,9,22.5);
  assert.equal(b.canTarget(knight,bat),false);assert.equal(b.chooseTarget(knight)?.id,ground.id);
  const musketeer=tile(b,'Musketeer',team,9,25);assert.equal(b.chooseTarget(musketeer)?.id,bat.id);
  const giant=tile(b,'Giant',team,9,25),cannon=tile(b,'Cannon',1-team,9,20);assert.equal(b.chooseTarget(giant)?.id,cannon.id);
 });
 test(`${label}: source sight excludes just-outside enemies and no enemy means idle`,()=>{
  const b=world();b.towers=[];const u=tile(b,'Knight',team,9,25),target=tile(b,'Knight',1-team,9,18.4);assert.equal(b.chooseTarget(u),null);
  target.y=(team?13.4:18.6)*C.SY;assert.equal(b.chooseTarget(u)?.id,target.id);target.hp=0;
  b.time+=1/60;b.tickEntity(u,1/60);assert.equal(u.targetId,null);assert.equal(u.visualState,'idle');
 });
 test(`${label}: an opened default lane leads toward King instead of the opposite Princess`,()=>{
  const b=world(),left=b.towers.find(t=>t.team!==team&&!t.king&&t.x<240),king=b.towers.find(t=>t.team!==team&&t.king),right=b.towers.find(t=>t.team!==team&&!t.king&&t.x>240);left.hp=0;
  const dragon=tile(b,'BabyDragon',team,3.5,18);assert(C.dist(dragon,right)<C.dist(dragon,king));assert(C.edge(dragon,king)<C.edge(dragon,right));
  assert.equal(b.chooseTarget(dragon)?.id,king.id);b.time+=1/60;b.tickEntity(dragon,1/60);assert.equal(dragon.targetId,king.id);
 });
 test(`${label}: visible King acquisition is separate from same-lane Princess fallback`,()=>{
  const b=world(),u=tile(b,'BabyDragon',team,9,9),king=b.towers.find(t=>t.team!==team&&t.king);assert(b.towers.filter(t=>t.team!==team&&!t.king).every(t=>t.hp>0));
  assert.equal(b.chooseTarget(u)?.id,king.id,'A visible eligible King remains a local target');
  const princess=b.towers.find(t=>t.team!==team&&!t.king&&t.x<9*C.SX);assert.equal(b.chooseTarget(u,[])?.id,princess.id,'Without a local candidate, the deterministic center tie uses left-lane Princess advance');
  const rider=tile(b,'RamRider',team,9,25);assert.equal(b.chooseTarget(rider,[]),null,'Troop-only attacker never falls back to a Crown');
 });
 test(`${label}: Crown-only and King-only constraints also apply to acquisition and fallback`,()=>{
  const b=world(),u=tile(b,'Mortar_Owned',team,9,25),cannon=tile(b,'Cannon',1-team,9,20);
  assert.equal(u.def.source.TargetOnlyTowers,true);assert.equal(b.canTarget(u,cannon),false,'Crown-only is narrower than buildings-only');
  const kingOnly=tile(b,'BabyDragon',team,3.5,20);kingOnly.def={...kingOnly.def,buildingsOnly:true,source:{...kingOnly.def.source,TargetOnlyKingTower:true}};
  const king=b.towers.find(t=>t.team!==team&&t.king);assert.equal(b.chooseTarget(kingOnly,[])?.id,king.id);
 });
}

for(const team of [0,1])test(`duo King team ${team}: each barrel preserves its own pending target within grace and reacquires beyond it`,()=>{
 const b=new C.Battle({ai:false,mode:'TeamVsTeam'}),king=b.towers.find(t=>t.team===team&&t.king);assert(king.duoKing);king.active=true;b.towers=[king];
 const barrel=king.cannons[0],x=(king.x-barrel.side*-king.cannonOffset)/C.SX,sign=team?1:-1;
 const old=spawn(b,'Knight',1-team,x,king.y/C.SY+sign*5),near=spawn(b,'Knight',1-team,x,king.y/C.SY+sign*3);
 barrel.targetId=old.id;barrel.windup=.1;barrel.cooldown=1;king.cannons[1].cooldown=1;
 old.y=king.y+sign*(king.def.range+king.def.radiusTiles+old.def.radiusTiles+.5)*C.SY;
 b.tickKingCannons(king,.11,1);assert.equal(barrel.targetId,old.id);assert.equal(b.kingShots,1,'A second enemy does not steal this barrel\'s committed shot within grace');
 barrel.targetId=old.id;barrel.windup=.2;barrel.cooldown=king.def.interval-.1;old.y=king.y+sign*(king.def.range+king.def.radiusTiles+old.def.radiusTiles+1.6)*C.SY;
 b.tickKingCannons(king,.01,1);assert.equal(barrel.targetId,near.id);assert.equal(barrel.windup,king.def.firstHit,'Beyond-grace target must be replaced with a fresh charge');
});

for(const team of [0,1]){
 const place=(b,name,side,x,y)=>spawn(b,name,side,x,team?32-y:y);
 test(`Electro Wizard team ${team}: two closer arrivals cannot steal the locked primary bolt`,()=>{
  const b=make(),u=place(b,'ElectroWizard',team,9,25),primary=place(b,'Knight',1-team,9,20);u.targetId=primary.id;b.startAttack(u,primary);
  const near=place(b,'Knight',1-team,8,24),next=place(b,'Knight',1-team,10,23);assert.equal(b.chooseTarget(u)?.id,primary.id);
  advance(b,u,u.def.firstHit+1/30);assert.equal(primary.maxHp-primary.hp,u.def.damage);assert.equal(near.maxHp-near.hp,u.def.damage);assert.equal(next.hp,next.maxHp);
 });
 test(`Electro Wizard team ${team}: secondary bolt chooses the nearer collision boundary, not the nearer center`,()=>{
  const b=make(),u=place(b,'ElectroWizard',team,9,25),primary=place(b,'Knight',1-team,9,20);u.targetId=primary.id;b.startAttack(u,primary);
  const nearCenter=place(b,'Knight',1-team,12,25),nearEdge=place(b,'Giant',1-team,12.1,25);
  assert(C.dist(u,nearCenter)<C.dist(u,nearEdge));assert(C.edge(u,nearEdge)<C.edge(u,nearCenter));
  advance(b,u,u.def.firstHit+1/30);assert.equal(primary.maxHp-primary.hp,u.def.damage);assert.equal(nearEdge.maxHp-nearEdge.hp,u.def.damage);assert.equal(nearCenter.hp,nearCenter.maxHp);
 });
 test(`Electro Wizard team ${team}: committed primary in source grace still receives its bolt`,()=>{
  const b=make(),u=place(b,'ElectroWizard',team,9,25),primary=place(b,'Knight',1-team,9,20);u.targetId=primary.id;b.startAttack(u,primary);primary.y=(team?13.5:18.5)*C.SY;
  const secondary=place(b,'Knight',1-team,9,23);assert(C.edge(u,primary)>u.def.range);assert(b.canCompleteHit(u,primary));
  advance(b,u,u.def.firstHit+1/30);assert.equal(primary.maxHp-primary.hp,u.def.damage);assert.equal(secondary.maxHp-secondary.hp,u.def.damage);
 });
 test(`Electro Wizard team ${team}: one eligible enemy receives both bolts despite hidden or attached neighbors`,()=>{
  const b=make(),u=place(b,'ElectroWizard',team,9,25),primary=place(b,'Knight',1-team,9,20),hidden=place(b,'Knight',1-team,9,24),attached=place(b,'SpearGoblinGiant',1-team,9,23.5);hidden.hidden=true;attached.attachedTo=primary.id;
  u.targetId=primary.id;b.startAttack(u,primary);advance(b,u,u.def.firstHit+1/30);assert.equal(primary.maxHp-primary.hp,u.def.damage*2);assert.equal(hidden.hp,hidden.maxHp);assert.equal(attached.hp,attached.maxHp);
 });
}
