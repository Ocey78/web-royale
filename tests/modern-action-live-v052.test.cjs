'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),C=require('../src/core');
function battle(){return new C.Battle({queue:'challenge',ai:false,seed:524212});}
const step=(b,frames)=>{for(let i=0;i<frames;i++)b.step(1/60);};
test('live Ice Wizard hero resolves its slowed target, creates a source-owned cube, and thaws when the cube dies',()=>{
 const b=battle(),hero=b.spawn('IceWizardHero',0,9*C.SX,24*C.SY,{wait:0,formId:'IceWizard_hero'}),enemy=b.spawn('Knight',1,9*C.SX,22*C.SY,{wait:0});
 hero.nextAttackAt=100;enemy.nextAttackAt=100;b.addBuff(enemy,'IceWizardHeroCold',20,0,hero.level,hero.id);b.elixir[0]=10;
 assert.equal(b.activateAbility(0,hero.id).ok,true);step(b,40);
 const cube=b.units.find(u=>u.entity==='IceWizardHero_IceCube');assert.ok(cube,'lifetime-end source callback creates the cube');
 assert.equal(cube.owner,hero.owner);assert.equal(cube.formId,hero.formId);assert.equal(hero.hidden,false,'hide action targets the attached ice');
 const field=b.areas.find(a=>a.name==='IceWizardHero_FreezeAeo');assert.ok(field);assert.equal(field.modernSourceId,cube.id);
 assert.ok(Object.values(enemy.buffs).some(v=>v.name==='IceWizardHero_FreezeBuff'));
 cube.hp=0;b.deaths();step(b,3);
 assert.equal(Object.values(enemy.buffs).some(v=>v.name==='IceWizardHero_FreezeBuff'),false);
 assert.ok(Object.values(enemy.buffs).some(v=>v.name==='IceWizardHero_SlowBuff'&&v.until>b.time));
 assert.equal(b.events.some(e=>e.type==='modern-action-unsupported'),false);
});
test('live Cannon Cart source transforms at half health without replenishing its remaining hp',()=>{
 const b=battle(),u=b.spawn('MovingCannon',0,9*C.SX,24*C.SY,{wait:0});const originalHp=u.maxHp;
 u.hp=Math.floor(originalHp/2)+1;b.tickEntity(u,0);assert.equal(u.entity,'MovingCannon');
 u.hp=Math.floor(originalHp/2);const remaining=u.hp;b.tickEntity(u,0);
 assert.equal(u.entity,'BrokenCannon');assert.equal(u.hp,remaining);assert.equal(u.maxHp,b.entityDefinition('BrokenCannon',u.level).hp);
 assert.equal(b.effects.filter(e=>e.sourceEffect==='moving_cannon_die').length,1);assert.equal(b.effects.filter(e=>e.sourceEffect==='broken_cannon_deploy').length,1);
 b.tickEntity(u,0);assert.equal(b.effects.filter(e=>e.sourceEffect==='moving_cannon_die').length,1);
});
test('live Magic Archer hero release creates all three parallel source projectiles and consumes its power-shot sequence',()=>{
 const b=battle(),hero=b.spawn('EliteArcherHero',0,9*C.SX,24*C.SY,{wait:0,formId:'EliteArcher_hero'}),enemy=b.spawn('Knight',1,9*C.SX,20*C.SY,{wait:0});hero.nextAttackAt=100;enemy.nextAttackAt=100;b.elixir[0]=10;
 assert.equal(b.activateAbility(0,hero.id).ok,true);step(b,20);assert.equal(hero.attackSequenceIndex,1);b.projectiles=[];
 b.strike(hero,enemy);const shots=b.projectiles.filter(p=>p.attacker===hero);assert.equal(shots.length,3);
 assert.equal(shots.filter(p=>p.name==='EliteArcherHero_Ability_Power_Shot_Projectile_Middle').length,1);
 assert.equal(shots.filter(p=>p.name==='EliteArcherHero_Ability_Triple_Shot_Projectile').length,2);
 const middle=shots.find(p=>p.name==='EliteArcherHero_Ability_Power_Shot_Projectile_Middle');for(const side of shots.filter(p=>p!==middle)){const dx=(side.startX-middle.startX)/C.SX,dy=(side.startY-middle.startY)/C.SY;assert.ok(Math.abs(Math.hypot(dx,dy)-1.5)<1e-7);assert.ok(Math.abs(dx*middle.vx+dy*middle.vy)<1e-7);}
 assert.equal(hero.attackSequenceIndex,0);assert.ok(b.units.some(u=>u.entity==='EliteArcherHero_Dummy'));
 assert.equal(b.events.some(e=>e.type==='modern-action-unsupported'),false);
});
test('live Baby Dragon wind affects friendly and enemy troops through the full source rectangle',()=>{
 const b=battle(),dragon=b.spawn('BabyDragon_EV1',0,9*C.SX,24*C.SY,{wait:0}),own=b.spawn('Knight',0,12*C.SX,23*C.SY,{wait:0}),enemy=b.spawn('Knight',1,6*C.SX,23*C.SY,{wait:0});dragon.nextAttackAt=own.nextAttackAt=enemy.nextAttackAt=100;
 b.strike(dragon,enemy);step(b,7);assert.ok(b.areas.some(a=>a.name==='BabyDragon_EV1_wind_aeo'));
 assert.ok(Object.values(own.buffs).some(v=>v.name==='BabyDragon_EV1_wind_buff_positive'));assert.ok(Object.values(enemy.buffs).some(v=>v.name==='BabyDragon_EV1_wind_buff_negative'));
 assert.equal(Object.values(own.buffs).some(v=>v.name==='BabyDragon_EV1_wind_buff_negative'),false);assert.equal(Object.values(enemy.buffs).some(v=>v.name==='BabyDragon_EV1_wind_buff_positive'),false);
});
test('live Skeleton Barrel death drops seven radial skeletons with the authored deploy delay and inherited ownership',()=>{
 const b=battle(),barrel=b.spawn('SkeletonBalloon',0,9*C.SX,24*C.SY,{wait:0}),drops=[],spawn=b.spawn.bind(b);
 b.spawn=(name,team,x,y,opt)=>{const u=spawn(name,team,x,y,opt);if(name==='Skeleton')drops.push({u,x,y,wait:u.wait,at:b.time});return u;};
 barrel.hp=0;b.deaths();assert.ok(b.units.some(u=>u.entity==='SkeletonContainerNew'));step(b,45);
 assert.equal(drops.length,7);for(const drop of drops){assert.equal(drop.u.owner,barrel.owner);assert.equal(drop.u.level,barrel.level);assert.equal(drop.wait,.5);assert.ok(Math.hypot((drop.x-barrel.x)/C.SX,(drop.y-barrel.y)/C.SY)<=1.48+1e-7);assert.ok(drop.at>=.6&&drop.at<.65);}
 assert.ok(new Set(drops.map(drop=>`${drop.x.toFixed(4)},${drop.y.toFixed(4)}`)).size===7,'source radial formation has seven distinct positions');
 assert.equal(b.events.some(e=>e.type==='modern-action-unsupported'),false);
});
test('live Valkyrie hero consumes one ability, emits fourteen whirlwind hits, and releases its movement and attack locks',()=>{
 const b=battle(),hero=b.spawn('ValkyrieHero',0,9*C.SX,24*C.SY,{wait:0,formId:'Valkyrie_hero'}),enemy=b.spawn('Golem',1,9*C.SX,23*C.SY,{wait:0}),hits=[],create=b.createArea.bind(b);
 hero.nextAttackAt=enemy.nextAttackAt=100;b.elixir[0]=10;b.createArea=(name,...args)=>{if(name==='ValkyrieHero_AEO')hits.push(b.time);return create(name,...args);};const startHp=enemy.hp;
 assert.equal(b.activateAbility(0,hero.id).ok,true);assert.equal(b.elixir[0],7);step(b,212);
 assert.equal(hits.length,14);for(let i=1;i<hits.length;i++)assert.ok(Math.abs(hits[i]-hits[i-1]-.25)<1/60+1e-7);
 assert.ok(enemy.hp<startHp);assert.equal(hero.modernActions.variables.ValkyrieHero_SpinDuration,3500);assert.equal(hero.modernAttackChain,undefined);assert.equal(hero.modernForcedAnimationUntil,0);assert.equal(hero.buffs.ValkyrieHero_AttackChain,undefined);assert.ok(hero.buffs.ValkyrieHero_Forbid_Attack_After_Whirlwind_Buff.until>b.time);
 const tags=require('../src/modern-actions').tags(hero,b.time);assert.equal(tags.has('NO_MOVE'),false);assert.equal(hero.abilityState.charges,0);assert.equal(b.events.some(e=>e.type==='modern-action-unsupported'),false);
});
