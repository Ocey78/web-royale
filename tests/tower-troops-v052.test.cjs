'use strict';
const test=require('node:test'),a=require('node:assert/strict'),C=require('../src/core'),T=require('../src/tower-troops'),R=require('../src/replay');
test('tower troop inventory preserves source choices and source arena ownership gates',()=>{
 const p=C.normalizeProfile({trophies:10000,unlockedTowerTroops:['King_CannonTowers','not-a-troop'],selectedTowerTroop:'King_CannonTowers',towerTroopLevels:{King_CannonTowers:99},towerTroopCopies:{King_CannonTowers:12}});
 a.equal(p.selectedTowerTroop,'King_CannonTowers');a.ok(p.unlockedTowerTroops.includes('King_CannonTowers'));a.equal(p.unlockedTowerTroops.includes('not-a-troop'),false);a.equal(p.towerTroopLevels.King_CannonTowers,16);a.equal(p.towerTroopCopies.King_CannonTowers,12);
 a.equal(T.quote(C.normalizeProfile(), 'King_CannonTowers').canUse,false);a.equal(T.quote(p,'King_CannonTowers').canUse,true);
});
test('Cannoneer replaces only the owning seat crown defenders and retains outward 3v3 spacing',()=>{
 const b=new C.Battle({queue:'challenge',mode:'Team3v3',seatSlots:[0,0,1,1,2,2],seatTowerTroops:['King_CannonTowers','King_PrincessTowers','King_PrincessTowers','King_PrincessTowers','King_PrincessTowers','King_PrincessTowers'],ai:false});
 const own=b.towers.find(t=>!t.king&&t.owner===0);a.equal(own.entity,'Cannoneer');a.equal(own.def.interval,2.2);a.equal(own.def.firstHit,.8000000000000003);a.equal(own.hp,2340);a.equal(own.x/C.SX,1.5);
 a.deepEqual(b.towers.filter(t=>!t.king&&t.team===0).map(t=>t.x/C.SX),[1.5,9,16.5]);a.ok(b.towers.filter(t=>!t.king&&t.owner!==0).every(t=>t.entity==='PrincessTower'));a.ok(b.towers.filter(t=>t.king).every(t=>t.entity==='KingTower'));
});
test('unsupported native tower controllers are unavailable before a battle can start',()=>{
 const p=C.normalizeProfile({trophies:14000,unlockedTowerTroops:T.catalog.map(t=>t.id)});
 const M=require('../src/modern-actions'),original=M.canDeployCard;try{M.canDeployCard=()=>({ok:false,reason:'unsupported source controller'});const q=T.quote(p,'King_ChefTowers');a.equal(q.supported,false);a.ok(q.reason);a.throws(()=>new C.Battle({queue:'challenge',seatTowerTroops:['King_ChefTowers'],ai:false}),/unsupported/i);}finally{M.canDeployCard=original;}
});
test('tower troop replays preserve defender entities, levels and source attack timing across seeks',()=>{
 const b=new C.Battle({queue:'challenge',seatTowerTroops:['King_CannonTowers'],seed:52520,ai:false,deck:['knight','archers','bomber','musketeer','giant','arrows','fireball','mini-pekka'],enemyDeck:['knight','archers','bomber','musketeer','giant','arrows','fireball','mini-pekka']});R.captureInitial(b);for(let i=0;i<300;i++){if(i===20)a.equal(b.deploy(1,0,3.5*C.SX,13*C.SY).ok,true);b.step(1/60);}const record=R.pack(b);a.equal(record.initial.seatTowerTroops[0],'King_CannonTowers');const s=new R.Session(record);for(const at of [record.duration,1,record.duration]){s.seek(at);a.equal(s.error,null);}a.deepEqual(R.digest(s.battle),record.expected);a.equal(s.battle.towers.find(t=>!t.king&&t.owner===0).entity,'Cannoneer');
});
test('Dagger Duchess exhausts eight authored shots then waits for the source recharge',()=>{
 const b=new C.Battle({queue:'challenge',seatTowerTroops:['King_KnifeTowers'],ai:false}),u=b.towers.find(t=>t.owner===0&&!t.king);b.towers=b.towers.filter(t=>t.team===0);const victim=b.spawn('Giant',1,u.x,u.y-3*C.SY,{wait:0});victim.def={...victim.def,speedTiles:0,damage:0};victim.hp=victim.maxHp=999999;const shots=[],original=b.modernActions;b.modernActions={...original,onProjectileSpawn(b,p){original.onProjectileSpawn?.(b,p);if(p.source===u.id)shots.push({time:b.time,charges:u.modernBurst.charges,sequence:u.attackSequenceIndex});}};
 for(let i=0;i<270;i++)b.step(1/60);a.equal(shots.length,8);a.equal(u.modernBurst.charges,0);for(const shot of shots)a.equal(shot.sequence,u.modernBurst.record.AttackSequenceIndices[shot.charges-1]);const last=shots.at(-1).time;for(let i=0;i<36;i++)b.step(1/60);a.equal(shots.length,8);for(let i=0;i<70;i++)b.step(1/60);a.ok(shots.length>8);a.ok(shots[8].time-last>=u.modernBurst.record.RechargeTime/1000-1/60);
});
test('Royal Chef cooks and delivers the source zero-damage pancake that raises a troop level',()=>{
 const b=new C.Battle({queue:'challenge',seatTowerTroops:['King_ChefTowers'],ai:false}),u=b.spawn('Knight',0,9*C.SX,20*C.SY,{wait:0,level:11});u.def={...u.def,speedTiles:0};const start=u.hp;for(let i=0;i<29*60;i++)b.step(1/60);a.equal(u.level,11);for(let i=0;i<3*60;i++)b.step(1/60);a.equal(u.level,12);a.ok(u.buffs.ChefTower_increase_level_buff);a.ok(u.hp>=start);a.equal(b.towers.find(t=>t.owner===0&&t.king).entity,'ChefTowerKing');
});
