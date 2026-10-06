'use strict';
const test=require('node:test'),a=require('node:assert/strict'),C=require('../src/core'),T=require('../src/tower-troops'),F=require('../src/card-forms'),S=require('../src/form-state'),A=require('../src/modern-actions');
function battle(options={}){const b=new C.Battle({queue:'challenge',ai:false,seed:170406,kingLevels:[11,11],...options});for(const t of b.towers)t.nextAttackAt=999;return b;}
function step(b,n){for(let i=0;i<n;i++)b.step(.05);}
function champion(b,id,x=9,y=24){const f=F.defaultRegistry.get(id),card=F.defaultRegistry.resolve(C.cardAt(f.baseCardId,11),id),u=b.spawn(card.entity,0,x*C.SX,y*C.SY,{owner:0,wait:0,level:11,formId:id,card});S.attach(b,u,card);u.nextAttackAt=999;b.elixir[0]=10;return u;}

test('source-inherited Royal Chef King Tower uses the same level health curve as ordinary King Tower',()=>{
 for(const level of [1,9,11,16]){
  const chef=battle({queue:null,practice:true,seatTowerTroops:['King_ChefTowers'],kingLevels:[level,level]}),ordinary=battle({queue:null,practice:true,kingLevels:[level,level]});
  const c=chef.towers.find(t=>t.owner===0&&t.king),k=ordinary.towers.find(t=>t.owner===0&&t.king);
  a.equal(c.entity,'ChefTowerKing');a.equal(c.def.source.SkinType,'KingTower');a.equal(c.def.source.Hitpoints,k.def.source.Hitpoints);
  a.equal(c.hp,k.hp,'inherited source KingTower health at level '+level);a.equal(c.def.damage,k.def.damage);
 }
});

test('all four active source tower troops deliver their source-selected projectile damage in Battle',()=>{
 a.deepEqual(T.catalog.map(x=>x.id).sort(),['King_CannonTowers','King_ChefTowers','King_KnifeTowers','King_PrincessTowers']);
 for(const [id,name,projectile,damage,interval]of [
  ['King_PrincessTowers','PrincessTower','TowerPrincessProjectile',107,.8],
  ['King_CannonTowers','Cannoneer','CannoneerProjectile',267,2.2],
  ['King_KnifeTowers','DaggerDuchess','TowerKnifeThrowerProjectile',89,.5],
  ['King_ChefTowers','ChefTower','ChefTower_spatula_projectile',107,1]]){
  const b=battle({seatTowerTroops:[id],seatTowerTroopLevels:[11,11]}),u=b.towers.find(t=>t.owner===0&&!t.king);
  a.equal(u.entity,name);a.equal(u.def.interval,interval);
  const target=b.spawn('Giant',1,u.x,u.y-3*C.SY,{wait:0,level:11});target.def={...target.def,speedTiles:0};target.nextAttackAt=999;const hp=target.hp;
  b.strike(u,target);a.equal(b.projectiles.at(-1).name,projectile);for(let i=0;i<30;i++)b.tickProjectiles(.05);a.equal(hp-target.hp,damage,id);
  a.equal(T.capability(id).ok,true);a.equal(T.capability(id,true).ok,true);
 }
});

test('live Monk activation applies its authored four-second movement lock and 65 percent damage reduction',()=>{
 const b=battle(),u=champion(b,'Monk_champion');a.equal(b.activateAbility(0,u.id).ok,true);a.equal(b.elixir[0],9);
 step(b,13);a.equal(A.rates(b,u).speed,1);step(b,1);
 a.equal(A.rates(b,u).speed,0);a.ok(A.tags(u,b.time).has('NO_MOVE_ALLOW_ATTRACT'));a.ok(A.tags(u,b.time).has('DEFLECTING_PROJECTILES'));
 const start={x:u.x,y:u.y},hp=u.hp;b.damage(u,1000,b.towers.find(t=>t.team===1),{melee:true});a.equal(hp-u.hp,350);
 step(b,79);a.equal(u.x,start.x);a.equal(u.y,start.y);a.equal(A.rates(b,u).speed,0);step(b,1);a.equal(A.rates(b,u).speed,1);
});

test('live deployed Goblinstein pair gives the native doctor the sole ability control',()=>{
 const b=battle(),id='Goblinstein_champion',f=F.defaultRegistry.get(id),card=F.defaultRegistry.resolve(C.cardAt(f.baseCardId,11),id);
 b.cast(card,0,9*C.SX,24*C.SY);step(b,3);
 const monster=b.units.find(u=>u.entity==='goblinstein'),doctor=b.units.find(u=>u.entity==='goblinstein_doctor');
 a.ok(monster);a.ok(doctor);a.equal(monster.def.source.Ability,undefined);a.equal(doctor.def.source.Ability,'goblinstein_ability');
 a.equal(monster.abilityState,undefined);a.ok(doctor.abilityState);a.equal(doctor.abilityConfig.id,'goblinstein_ability');
});
function enemy(b,name,x,y){const u=b.spawn(name,1,x*C.SX,y*C.SY,{wait:0,level:11});u.def={...u.def,speedTiles:0};u.nextAttackAt=999;return u;}
test('live Mighty Miner switches lanes after 500ms and the original-lane bomb damages nearby troops',()=>{
 const b=battle(),u=champion(b,'MightyMiner_champion',4,24),target=enemy(b,'Knight',4,22),hp=target.hp;u.def={...u.def,speedTiles:0};
 a.equal(b.activateAbility(0,u.id).ok,true);a.equal(b.elixir[0],9);step(b,9);a.equal(u.x/C.SX,4);step(b,1);a.ok(Math.abs(u.x/C.SX-14)<1e-10);step(b,2);a.equal(hp-target.hp,332);a.equal(u.abilityState.charges,0);
});
test('live Skeleton King collects one native soul then summons base six plus that soul',()=>{
 const b=battle(),u=champion(b,'SkeletonKing_champion'),victim=enemy(b,'Skeleton',9,22);u.def={...u.def,speedTiles:0};b.damage(victim,victim.hp,u,{melee:true});b.deaths();
 step(b,28);a.equal(A.evaluate('SkeletonKing_ResurrectCharges',b,{unit:u}),0);step(b,1);a.equal(A.evaluate('SkeletonKing_ResurrectCharges',b,{unit:u}),1);
 a.equal(b.activateAbility(0,u.id).ok,true);a.equal(b.elixir[0],8);step(b,10);const area=b.areas.find(x=>x.name==='SkeletonKingGraveyard');a.equal(area.modernSpawnLimit,7);a.equal(A.evaluate('SkeletonKing_ResurrectCharges',b,{unit:u}),0);step(b,45);a.equal(b.units.filter(x=>x.entity==='SkeletonKingSkeleton').length,7);
});
test('live Archer Queen cloak starts at 200ms, speeds attacks, and expires after 3500ms',()=>{
 const b=battle(),u=champion(b,'ArcherQueen_champion'),target=enemy(b,'Knight',9,20);u.def={...u.def,speedTiles:0};a.equal(b.activateAbility(0,u.id).ok,true);a.equal(b.elixir[0],9);
 step(b,3);a.equal(u.invisible,false);step(b,1);a.ok(u.buffs.ArcherQueenRapid);a.equal(u.buffs.ArcherQueenRapid.until,3.7);step(b,1);a.equal(u.invisible,true);a.equal(b.canTarget(target,u),false);a.equal(b.buffs(u).attack,2.8);a.equal(b.buffs(u).speed,.75);
 step(b,68);a.equal(u.invisible,true);step(b,2);a.equal(u.invisible,false);a.equal(b.buffs(u).attack,1);
});
test('live Golden Knight ability spends its charge and damages the acquired dash target',()=>{
 const b=battle(),u=champion(b,'GoldenKnight_champion'),target=enemy(b,'Knight',13,24),hp=target.hp;u.def={...u.def,speedTiles:0};a.equal(b.activateAbility(0,u.id).ok,true);a.equal(b.elixir[0],9);step(b,14);a.equal(hp-target.hp,335);a.equal(u.abilityState.charges,0);a.equal(u.modernDash,undefined);
});
test('live Little Prince summons the source Guardian and applies its dash hit',()=>{
 const b=battle(),u=champion(b,'LittlePrince_champion'),target=enemy(b,'Knight',9,21),hp=target.hp;u.def={...u.def,speedTiles:0};a.equal(b.activateAbility(0,u.id).ok,true);a.equal(b.elixir[0],7);
 step(b,47);a.equal(b.units.some(x=>x.entity==='ChampionGuard'),false);step(b,2);const guard=b.units.find(x=>x.entity==='ChampionGuard');a.ok(guard);a.equal(guard.owner,0);step(b,35);a.equal(hp-target.hp,320);a.equal(u.abilityState.charges,0);
});
test('live Goblinstein doctor ability applies the native 500ms tether damage pulses',()=>{
 const b=battle(),id='Goblinstein_champion',f=F.defaultRegistry.get(id),card=F.defaultRegistry.resolve(C.cardAt(f.baseCardId,11),id);b.cast(card,0,9*C.SX,24*C.SY);step(b,23);
 const monster=b.units.find(u=>u.entity==='goblinstein'),doctor=b.units.find(u=>u.entity==='goblinstein_doctor');for(const u of [monster,doctor]){u.def={...u.def,speedTiles:0};u.nextAttackAt=999;}
 monster.x=11*C.SX;monster.y=24*C.SY;doctor.x=7*C.SX;doctor.y=24*C.SY;const target=enemy(b,'Knight',9,24),hp=target.hp;b.elixir[0]=10;a.equal(b.activateAbility(0,doctor.id).ok,true);a.equal(b.elixir[0],8);step(b,1);a.equal(hp-target.hp,94);step(b,9);a.equal(hp-target.hp,94);step(b,1);a.equal(hp-target.hp,188);
});
test('live Boss Bandit uses two charges, a 200ms trigger and 700ms warp delay',()=>{
 const b=battle(),u=champion(b,'BossBandit_champion',9,20);u.def={...u.def,speedTiles:0};a.equal(b.activateAbility(0,u.id).ok,true);a.equal(b.elixir[0],9);a.equal(u.abilityState.charges,1);
 step(b,3);a.equal(u.invisible,false);step(b,1);a.ok(u.buffs.BossBandit_ability_buff);step(b,1);a.equal(u.invisible,true);step(b,12);a.equal(u.y/C.SY,20);step(b,1);a.equal(u.y/C.SY,26);step(b,42);a.equal(b.activateAbility(0,u.id).ok,true);a.equal(u.abilityState.charges,0);step(b,60);a.equal(b.activateAbility(0,u.id).ok,false);
});

test('native Champion frozen-ability flag allows Monk activation and its 700ms trigger while Frozen',()=>{
 for(const initiallyFrozen of [true,false]){
  const b=battle(),u=champion(b,'Monk_champion');a.equal(C.DATA.globals.LOGIC_CHAMPION_CAN_EXECUTE_ABILITY_FROZEN.BooleanValue,true);
  if(initiallyFrozen)b.addBuff(u,'Freeze',2,1,11);
  a.equal(b.activateAbility(0,u.id).ok,true);if(!initiallyFrozen)b.addBuff(u,'Freeze',2,1,11);
  step(b,13);a.equal(u.buffs.ShieldBoostMonk,undefined);step(b,1);a.ok(u.buffs.ShieldBoostMonk);a.equal(u.abilityState.pending,false);
  a.equal(b.buffs(u).attack,0);a.equal(b.buffs(u).speed,0);const hp=u.hp;b.damage(u,1000,b.towers.find(t=>t.team===1),{melee:true});a.equal(hp-u.hp,350);
 }
 const b=battle(),u=champion(b,'Monk_champion');b.catalog={...b.catalog,DATA:{...b.catalog.DATA,globals:{...b.catalog.DATA.globals,LOGIC_CHAMPION_CAN_EXECUTE_ABILITY_FROZEN:{BooleanValue:false}}}};b.addBuff(u,'Freeze',2,1,11);a.equal(b.activateAbility(0,u.id).ok,false);
});
