'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../src/modern-actions.js');
const K = require('../src/catalog.js');
function fixture(extra = {}) {
  const data = { actions: {}, areas: {}, buffs: {}, entities: {}, variables: {}, ...extra };
  const unit = { id: 20, owner: 2, team: 0, x: 4 * K.SX, y: 24 * K.SY, level: 9, hp: 100, maxHp: 200, shield: 0, maxShield: 80, buffs: {}, def: { source: {}, radiusTiles: .4 } };
  const b = { time: 0, pending: [], units: [unit], towers: [], areas: [], effects: [], nextId: 21,
    get active() { return this.units.filter(u => u.hp > 0); }, getEntity(id) { return this.units.find(u => u.id === id); },
    schedule(p) { this.pending.push(p); }, effect(e) { this.effects.push(e); }, withOwner(owner, fn) { return fn(); },
    addBuff(u, name, duration, team, level) { u.buffs[name] = { name, until: this.time + duration, sourceTeam: team, level }; },
    heal(u, value) { u.hp = Math.min(u.maxHp, u.hp + value); }, damage(u, value) { u.hp = Math.max(0, u.hp - value); },
    scaleStat(value) { return value; }, entityDefinition(name) { return { name, source: data.entities[name], hp: 500, shield: 40, radiusTiles: .5, air: false, building: false }; },
    createArea(name, team, x, y, level) { const a = { id: this.nextId++, name, team, x, y, level, born: this.time, ends: this.time + (data.areas[name].LifeDuration || 1000) / 1000, spawned: 0 }; this.areas.push(a); return a; },
    spawn(name, team, x, y, options) { const u = { ...unit, id: this.nextId++, entity: name, team, x, y, ...options, buffs: {}, def: { source: data.entities[name], radiusTiles: .4 } }; this.units.push(u); return u; }
  };
  return { b, unit, data, ctx: { unit, owner: 2, team: 0, data } };
}
function advance(f, time) { f.b.time = time; const due = f.b.pending.filter(p => p.due <= time); f.b.pending = f.b.pending.filter(p => p.due > time); for (const p of due) A.resolvePending(f.b, p, f.data); A.tickEntity(f.b, f.unit, .05, f.data); }
test('source resolver actions share context, honor default result, and run on the resolved victim', () => {
  const f = fixture({ gameObjectFilters: { enemy: { MatchTeamEnemy: true, Filters: ['Hidden'] } }, shapes: { nearby: { ClassType: 'Circle', Radius: 3000 } }, targetResolvers: { nearest: { Shape: 'nearby', Filter: 'enemy', StrategyList: ['RESOLVER_STRATEGY_CLOSEST_TARGET'] } }, actions: {
    write: { ClassType: 'ActionWriteResolverResultToContext', Resolver: 'nearest', ResultName: 'Found', DefaultValue: -1 },
    run: { ClassType: 'ActionRunActionOnResolvedGameObjects', Resolver: 'nearest', Amount: 1, Action: 'shield' },
    shield: { ClassType: 'ActionSetShield', ShieldPercent: 100 }
  } });
  const context = {}; const ctx = { ...f.ctx, context };
  assert.equal(A.evaluate('#Found', f.b, ctx), -1);
  assert.equal(A.executeAction(f.b, 'write', ctx).ok, true); assert.equal(context.Found, -1);
  const target = { ...f.unit, id: 30, team: 1, y: f.unit.y - K.SY, buffs: {}, shield: 0 }; f.b.units.push(target);
  A.executeAction(f.b, 'write', ctx); assert.equal(context.Found, 30);
  A.executeAction(f.b, 'run', ctx); assert.equal(target.shield, 80); assert.equal(f.unit.shield, 0);
  target.hidden = true; A.executeAction(f.b, 'write', ctx); assert.equal(context.Found, -1);
});
test('source area dependency preflight rejects unsupported geometry before a card can deploy', () => {
  const f = fixture({ areas: { unknown: { Shape: 'bad', TargetFilter: 'enemy' } }, shapes: { bad: { ClassType: 'NativeUnimplementedShape' } }, gameObjectFilters: { enemy: { MatchTeamEnemy: true } } });
  const report = A.canDeployCard(f.b, { AreaEffectObject: 'unknown' }, { data: f.data });
  assert.equal(report.ok, false); assert.match(report.reason, /shape/);
  assert.equal(f.b.areas.length, 0);
});
test('waiting source selector owns its pause tags only until it finds a target', () => {
  const f = fixture({ shapes: { ahead: { ClassType: 'Rectangle', Width: 4000, Height: 4000 } }, gameObjectFilters: { enemy: { MatchTeamEnemy: true } }, actions: { select: { ClassType: 'ActionRunActionListOnObjectsInShapeWithPrio', Shape: 'ahead', TargetFilter: 'enemy', WaitForTarget: true, GameTagsToSet: 'ABILITY_COOLDOWN_PAUSED', Actions: ['shield'] }, shield: { ClassType: 'ActionSetShield', ShieldPercent: 100 } } });
  assert.equal(A.executeAction(f.b, 'select', f.ctx).ok, true);
  assert.equal(A.tags(f.unit, 0).has('ABILITY_COOLDOWN_PAUSED'), true);
  const target = { ...f.unit, id: 30, team: 1, y: f.unit.y + K.SY, buffs: {}, shield: 0 }; f.b.units.push(target);
  advance(f, .05); assert.equal(target.shield, 80); assert.equal(A.tags(f.unit, .05).has('ABILITY_COOLDOWN_PAUSED'), false);
});
test('Giant hero source slap waits 400ms, flies for 1500ms, and lands after caster death', () => {
  const f = fixture({ ...K.DATA }); f.unit.entity = 'GiantHero'; f.unit.def.source = K.DATA.entities.GiantHero;
  const target = { ...f.unit, id: 30, entity: 'Knight', team: 1, x: 5 * K.SX, buffs: {}, def: { source: K.DATA.entities.Knight, radiusTiles: .4 } }; f.b.units.push(target);
  f.b.push = (u, dx, dy, strength, force) => { assert.equal(strength, 23); assert.equal(force, true); u.x = 17.5 * K.SX; };
  const ctx = { unit: target, instigator: f.unit, team: 0, owner: 2, data: f.data };
  assert.equal(A.executeAction(f.b, 'GiantHero_Slap_Pushback', ctx).ok, true);
  f.b.time = .399; for (const p of f.b.pending.filter(p => p.due <= f.b.time)) A.resolvePending(f.b, p, f.data); assert.equal(target.x, 5 * K.SX);
  f.b.time = .4; const due = f.b.pending.filter(p => p.due <= f.b.time); f.b.pending = f.b.pending.filter(p => p.due > f.b.time); for (const p of due) A.resolvePending(f.b, p, f.data);
  assert.ok(target.modernKnockback); assert.equal(target.x, 5 * K.SX); assert.equal(target.modernKnockback.height, 9000);
  f.unit.hp = 0; f.b.time = 1.15; A.tickEntity(f.b, target, .75, f.data); assert.equal(target.x, 11.25 * K.SX); assert.ok(Math.abs(target.modernKnockbackHeight - 9000) < 1e-7);
  f.b.time = 1.9; A.tickEntity(f.b, target, .75, f.data); assert.equal(target.x, 17.5 * K.SX); assert.equal(target.modernKnockback, undefined);
  const area = f.b.areas.find(a => a.name === 'GiantHero_LandingAEO'); assert.ok(area); assert.equal(area.team, 0); assert.equal(area.modernSourceId, f.unit.id);
});
test('controlled Freeze buff ends with its source area and applies the authored two-second slow', () => {
  const f = fixture({ ...K.DATA }); const a = f.b.createArea('IceWizardHero_FreezeAeo', 1, f.unit.x, f.unit.y, 9);
  f.b.addBuff(f.unit, 'IceWizardHero_FreezeBuff', 999, 1, 9); f.unit.buffs.IceWizardHero_FreezeBuff.sourceId = a.id;
  A.onBuffAdded(f.b, f.unit, 'IceWizardHero_FreezeBuff', f.unit.buffs.IceWizardHero_FreezeBuff, f.data);
  A.tickEntity(f.b, f.unit, .05, f.data); assert.ok(f.unit.buffs.IceWizardHero_FreezeBuff);
  f.b.areas = []; f.b.time = .05; A.tickEntity(f.b, f.unit, .05, f.data);
  assert.equal(f.unit.buffs.IceWizardHero_FreezeBuff, undefined); assert.equal(f.unit.buffs.IceWizardHero_SlowBuff.until, 2.05);
});
test('Furnace flip-flop stops quick spawning only after a full second of continuous movement',()=>{
 const f=fixture({...K.DATA});f.unit.entity='FirespiritHut_EV1';
 assert.equal(A.executeAction(f.b,'Furnace_EV1_Check_Moving',f.ctx).ok,true);
 f.unit.visualState='run';advance(f,.05);advance(f,.8);assert.equal(A.tags(f.unit,.8).has('FURNACE_STOP_QUICK_SPAWN'),false);
 f.unit.visualState='idle';advance(f,.9);f.unit.visualState='run';advance(f,1);advance(f,1.99);assert.equal(A.tags(f.unit,1.99).has('FURNACE_STOP_QUICK_SPAWN'),false);
 advance(f,2);assert.equal(A.tags(f.unit,2).has('FURNACE_STOP_QUICK_SPAWN'),true);advance(f,2.1);assert.equal(A.tags(f.unit,2.1).has('FURNACE_STOP_QUICK_SPAWN'),false);
});
test('Hunter source net waits its initial cooldown and cast time before the exact trapping projectile',()=>{
 const f=fixture({...K.DATA}),enemy={...f.unit,id:30,team:1,x:6*K.SX,buffs:{},def:{source:{},radiusTiles:.4}};f.b.units.push(enemy);const shots=[];f.b.fireProjectile=(name,source,target,options)=>{shots.push({name,target:target.id,options});return{name};};
 assert.equal(A.executeAction(f.b,'Hunter_EV1_net_attack',f.ctx).ok,true);advance(f,.999);assert.equal(shots.length,0);advance(f,1);assert.equal(shots.length,0);advance(f,1.2);
 assert.equal(shots.length,1);assert.equal(shots[0].name,'Hunter_EV1_bear_trap_projectile');assert.equal(shots[0].target,30);
 advance(f,6.19);assert.equal(shots.length,1);advance(f,6.2);advance(f,6.4);assert.equal(shots.length,2);
});
test('Baby Dragon source attack resets the same wind field, which expires while idle and lingers two seconds after death',()=>{
 const f=fixture({...K.DATA});f.unit.entity='BabyDragon_EV1';assert.equal(A.executeAction(f.b,'baby_dragon_evo_wind_action',f.ctx).ok,true);
 const a=f.b.areas[0];assert.equal(a.name,'BabyDragon_EV1_wind_aeo');assert.equal(a.y,f.unit.y-1.5*K.SY);
 f.unit.x+=K.SX;A.refreshAreas(f.b,f.data);assert.equal(a.x,f.unit.x);assert.equal(a.y,f.unit.y-1.5*K.SY);
 advance(f,3);A.executeAction(f.b,'baby_dragon_evo_wind_action',f.ctx);assert.equal(f.b.areas.length,1);assert.equal(a.ends,9);
 advance(f,9.01);assert.equal(f.b.areas.length,1);assert.equal(f.unit.modernActions.timers.filter(v=>v.type==='ActionSpawnResetableAeO').length,0);
 A.executeAction(f.b,'baby_dragon_evo_wind_action',f.ctx);assert.equal(f.b.areas.length,2);f.unit.hp=0;A.onDeath(f.b,f.unit,f.data);assert.equal(f.b.areas.at(-1).ends,11.01);
});
test('Mega Minion hero source resolver pins the lowest-max-hp target and returns to its saved origin',()=>{
 const f=fixture({...K.DATA});f.unit.entity='MegaMinionHero';f.unit.def.source=K.DATA.entities.MegaMinionHero;f.unit.abilityState={charges:1,cooldownUntil:0};f.unit.abilityConfig=K.DATA.abilities.MegaMinion_Teleport_Ability;
 const enemy={...f.unit,id:30,entity:'Knight',team:1,x:12*K.SX,y:20*K.SY,maxHp:100,buffs:{},abilityState:null,def:{source:K.DATA.entities.Knight,radiusTiles:.4}},closer={...enemy,id:31,x:5*K.SX,maxHp:300};f.b.units.push(enemy,closer);
 A.onSpawn(f.b,f.unit,f.data);advance(f,1.5);assert.equal(f.unit.modernIndicator.target,enemy.id);
 const origin={x:f.unit.x,y:f.unit.y};assert.equal(A.executeAbility(f.b,f.unit.abilityConfig,f.ctx).ok,true);
 for(let i=0;i<10;i++)advance(f,1.5+(i+1)*.05);
 assert.equal(f.unit.modernMegaAbility.phase,'active');assert.equal(f.unit.targetId,enemy.id);assert.equal(A.attackProfile(f.b,f.unit,f.data).Projectile,'MegaMinionSpit_DoubleDamage');
 enemy.hp=0;for(let i=0;i<20;i++)advance(f,2+(i+1)*.05);
 assert.equal(f.unit.modernMegaAbility.phase,'returned');assert.equal(f.unit.x,origin.x);assert.equal(f.unit.y,origin.y);assert.equal(A.evaluate('MegaMinion_has_returned',f.b,f.ctx),1);
});
test('damage callback threshold belongs to the source decoy and suppresses repeated reactions for one second',()=>{
 const f=fixture({...K.DATA});f.unit.entity='EliteArcherHero_Dummy';A.executeAction(f.b,'EliteArcherHero_Dummy_Hit_Threshold',f.ctx);
 A.onDamage(f.b,f.unit,1,null,{},f.data);assert.equal(f.unit.modernActions.listeners[0].lastAt,0);
 f.b.time=.2;A.onDamage(f.b,f.unit,1,null,{},f.data);assert.equal(f.unit.modernActions.listeners[0].lastAt,0);
 f.b.time=1;A.onDamage(f.b,f.unit,1,null,{},f.data);assert.equal(f.unit.modernActions.listeners[0].lastAt,1);
});
test('base Skeleton Barrel source balloon stages follow the 66 and 33 percent thresholds and 500ms transitions',()=>{
 const f=fixture({...K.DATA});assert.equal(A.executeAction(f.b,'skeleton_balloon_pop_balloons',f.ctx).ok,true);assert.equal(f.unit.modernFrameRange.start,'fly3_start');
 f.unit.hp=132;advance(f,.1);assert.equal(f.unit.modernFrameRange.start,'fly2_start');assert.equal(f.unit.modernFrameRange.transition.start,'balloon_pop1');assert.equal(f.unit.modernFrameRange.transition.until,.6);
 f.unit.hp=66;advance(f,.7);assert.equal(f.unit.modernFrameRange.start,'fly1_start');assert.equal(f.unit.modernFrameRange.transition.start,'balloon_pop2');
 assert.equal(f.b.effects.filter(e=>e.sourceEffect==='skeleton_balloon_pop1').length,1);assert.equal(f.b.effects.filter(e=>e.sourceEffect==='skeleton_balloon_pop2').length,1);
});
test('Valkyrie hero whirlwind follows source targets and emits at 250ms cadence until the 3500ms timer',()=>{
 const f=fixture({...K.DATA});f.unit.entity='ValkyrieHero';f.unit.def.source=K.DATA.entities.ValkyrieHero;f.unit.def.radiusTiles=.5;
 const enemy={...f.unit,id:30,team:1,x:6*K.SX,buffs:{},def:{source:{},radiusTiles:.4}};f.b.units.push(enemy);
 assert.equal(A.executeAction(f.b,'ValkyrieHero_Execute_Charge_Group',f.ctx).ok,true);
 for(let i=1;i<=70;i++)advance(f,i*.05);
 assert.equal(f.b.areas.filter(a=>a.name==='ValkyrieHero_AEO').length,14);assert.equal(A.evaluate('ValkyrieHero_SpinDuration',f.b,f.ctx),3500);
 assert.equal(f.unit.modernAttackChain,undefined);assert.equal(f.unit.buffs.ValkyrieHero_AttackChain,undefined);assert.equal(f.unit.modernForcedAnimationUntil,0);assert.ok(f.unit.buffs.ValkyrieHero_Forbid_Attack_After_Whirlwind_Buff);
});
test('Battle buff callback accepts a buff instance, refreshes once, and removes once at expiry', () => {
  const f = fixture({ variables: { Starts: {}, Removes: {} }, buffs: { Trigger: { OnStartAction: 'start', OnRemoveAction: 'remove' } }, actions: { start: { ClassType: 'ActionSetVariable', Variable: 'Starts', Value: 'Starts + 1' }, remove: { ClassType: 'ActionSetVariable', Variable: 'Removes', Value: 'Removes + 1' } } });
  f.b.addBuff(f.unit, 'Trigger', 1, 0, 9);
  A.onBuffAdded(f.b, f.unit, 'Trigger', f.unit.buffs.Trigger, f.data);
  A.onBuffAdded(f.b, f.unit, 'Trigger', f.unit.buffs.Trigger, f.data);
  assert.equal(A.evaluate('Starts', f.b, f.ctx), 1);
  f.b.time = .5; f.b.addBuff(f.unit, 'Trigger', 1, 0, 9);
  A.onBuffAdded(f.b, f.unit, 'Trigger', f.unit.buffs.Trigger, f.data);
  assert.equal(A.evaluate('Starts', f.b, f.ctx), 1);
  advance(f, 1); assert.equal(A.evaluate('Removes', f.b, f.ctx), 0);
  advance(f, 1.5); assert.equal(A.evaluate('Removes', f.b, f.ctx), 1);
  advance(f, 2); assert.equal(A.evaluate('Removes', f.b, f.ctx), 1);
});
test('duration force-stop cancels continuation and clears owned tags', () => {
  const f = fixture({ variables: { Stop: {} }, actions: { wait: { ClassType: 'ActionWithDuration', ActionDuration: 1000, GameTagsToSet: 'NO_MOVE', ForceStopIfTrue: 'Stop > 0', NextAction: 'shield' }, shield: { ClassType: 'ActionSetShield', ShieldPercent: 100 } } });
  A.executeAction(f.b, 'wait', f.ctx); assert.equal(A.rates(f.b, f.unit, f.data).speed, 0);
  f.unit.modernActions.variables.Stop = 1; advance(f, .5); advance(f, 1);
  assert.equal(f.unit.shield, 0); assert.equal(A.rates(f.b, f.unit, f.data).speed, 1);
});
test('projectile source OnHitTargetAction runs on the struck unit exactly once', () => {
  const f = fixture({ projectiles: { projectile: { OnHitTargetAction: 'shield' } }, actions: { shield: { ClassType: 'ActionSetShield', ShieldPercent: 100 } } });
  const p = { name: 'projectile', attacker: f.unit, owner: 2, team: 0, level: 9 };
  const target = { ...f.unit, id: 30, team: 1, shield: 0, buffs: {} }; f.b.units.push(target);
  A.onProjectileHit(f.b, p, target, f.data); assert.equal(target.shield, 80); assert.equal(f.unit.shield, 0);
});
test('Dagger Duchess spends all eight source charges, reloads at 900ms, and selects depleted attack', () => {
  const f = fixture({ entities: K.DATA.entities });
  f.unit.entity = 'DaggerDuchess'; f.unit.def.source = K.DATA.entities.DaggerDuchess;
  assert.equal(A.executeAction(f.b, f.unit.def.source.OnStartingAction, f.ctx).ok, true);
  for (let i = 0; i < 8; i++) { f.b.time = i * .5; A.onAttackStart(f.b, f.unit, null, f.data); assert.equal(A.attackProfile(f.b, f.unit).Projectile, 'TowerKnifeThrowerProjectile'); if (i === 7) assert.equal(f.unit.attackSequenceIndex, 2); A.onAttack(f.b, f.unit, null, f.data); }
  assert.equal(f.unit.modernBurst.charges, 0); assert.equal(A.rates(f.b, f.unit, f.data).attack, 0);
  advance(f, 4.399); assert.equal(f.unit.modernBurst.charges, 0);
  advance(f, 4.4); assert.equal(f.unit.modernBurst.charges, 1);
  A.onAttackStart(f.b, f.unit, null, f.data); assert.equal(f.unit.attackSequenceIndex, 3);
  A.onAttack(f.b, f.unit, null, f.data); assert.equal(f.unit.modernBurst.charges, 0);
  for (let t = 5.3; t <= 12; t += .9) advance(f, t);
  assert.equal(f.unit.modernBurst.charges, 8); assert.ok(A.rates(f.b, f.unit, f.data).attack > 0);
});
test('Chef source contributions give 23s idle cooking and target an eligible unbuffed high-hp troop', () => {
  const f = fixture({ actions: K.DATA.actions, buffs: K.DATA.buffs, projectiles: K.DATA.projectiles, entities: K.DATA.entities, gameObjectFilters: K.DATA.gameObjectFilters });
  f.unit.entity = 'ChefTowerKing'; f.unit.king = true; f.unit.building = true;
  f.b.towers = [f.unit, { id: 5, entity: 'ChefTower', team: 0, hp: 100, nextAttackAt: 0 }, { id: 6, entity: 'ChefTower', team: 0, hp: 100, nextAttackAt: 0 }];
  const weak = { ...f.unit, id: 31, entity: 'MiniPekka', king: undefined, building: false, hp: 99, maxHp: 200, buffs: {} };
  const strong = { ...weak, id: 32, hp: 180, buffs: {} }; const injured = { ...weak, id: 33, hp: 60, maxHp: 900, buffs: {} };
  f.b.units.push(weak, strong, injured); const shots = []; f.b.fireProjectile = (name, source, target) => shots.push({ name, target: target.id });
  const row = K.DATA.actions.ChefTower_CookingAction;
  assert.equal(A.executeAction(f.b, 'ChefTower_CookingAction', f.ctx).ok, true);
  for (let t = .05; t < 30; t += .05) { f.b.time = t; A.tickEntity(f.b, f.unit, .05, f.data); }
  assert.equal(shots.length, 0);
  for (let t = 30; t <= 30.3; t += .05) { f.b.time = t; A.tickEntity(f.b, f.unit, .05, f.data); }
  assert.equal(shots.length, 1); assert.deepEqual(shots[0], { name: row.BuffProjectile, target: strong.id });
  strong.buffs.ChefTower_increase_level_buff = { name: 'ChefTower_increase_level_buff', until: 999 };
  for (let t = 30.35; t <= 53.6; t += .05) { f.b.time = t; A.tickEntity(f.b, f.unit, .05, f.data); }
  assert.equal(shots.length, 2); assert.equal(shots[1].target, weak.id);
});
test('Chef cooking contributions fall when its Princess towers attack or are destroyed', () => {
  const f = fixture({ actions: K.DATA.actions, buffs: K.DATA.buffs, projectiles: K.DATA.projectiles, entities: K.DATA.entities, gameObjectFilters: K.DATA.gameObjectFilters });
  f.b.towers = [{ id: 5, team: 0, king: false, entity: 'ChefTower', hp: 100, windup: {} }, { id: 6, team: 0, king: false, entity: 'ChefTower', hp: 0 }];
  A.executeAction(f.b, 'ChefTower_CookingAction', f.ctx);
  f.b.time = 8; A.tickEntity(f.b, f.unit, 1, f.data);
  assert.equal(f.unit.modernActions.timers[0].contribution, 600);
});
test('unit-group death actions exclude other deployments and spawn the Hero Goblin flag only on the last death', () => {
  const f = fixture({ actions: K.DATA.actions, buffs: K.DATA.buffs, entities: K.DATA.entities, variables: K.DATA.variables, gameObjectFilters: K.DATA.gameObjectFilters, cardGroups: K.DATA.cardGroups });
  const source = K.DATA.entities.GoblinHero;
  f.unit.entity = 'GoblinHero'; f.unit.def.source = source; f.unit.levelGroupId = 'deploy:20'; f.unit.formId = 'Goblins_hero';
  const companion = { ...f.unit, id: 21, buffs: {}, modernActions: undefined };
  const unrelated = { ...f.unit, id: 22, levelGroupId: 'deploy:22', buffs: {}, modernActions: undefined };
  f.b.units.push(companion, unrelated);
  f.unit.hp = 0; A.onDeath(f.b, f.unit, f.data);
  assert.equal(f.b.units.filter(u => u.entity === 'GoblinHero_Flag_Building').length, 0);
  companion.hp = 0; A.onDeath(f.b, companion, f.data);
  const flag = f.b.units.find(u => u.entity === 'GoblinHero_Flag_Building'); assert.ok(flag); assert.equal(flag.owner, 2); assert.equal(flag.formId, 'Goblins_hero'); assert.equal(flag.levelGroupId, 'deploy:20');
});
test('source placement expressions mirror Goblin hero second wave by team without random consumption', () => {
  const f = fixture({ actions: K.DATA.actions, entities: K.DATA.entities, variables: K.DATA.variables });
  const before = f.b.units.length; assert.equal(A.executeAction(f.b, 'GoblinHero_Spawn_Second_Wave_0', f.ctx).ok, true);
  assert.equal(f.b.units.length, before + 1); assert.equal(f.b.units.at(-1).x, 5 * K.SX); assert.equal(f.b.units.at(-1).y, 23.5 * K.SY);
});
test('Pekka kill context preserves tournament victim hp through the 700ms source soul flight', () => {
  const f = fixture({ actions: K.DATA.actions, buffs: K.DATA.buffs, entities: K.DATA.entities, variables: K.DATA.variables });
  f.unit.entity = 'Pekka_EV1'; f.unit.def.source = K.DATA.entities.Pekka_EV1;
  const victim = { ...f.unit, id: 31, entity: 'Skeleton', team: 1, hp: 0, maxHp: 100, maxShield: 0, buffs: {}, def: { source: K.DATA.entities.Skeleton } };
  f.b.units.push(victim); A.onDamage(f.b, victim, 100, f.unit, {}, f.data); A.onDeath(f.b, victim, f.data);
  assert.equal(f.b.pending[0].due, .7); assert.equal(f.unit.buffs.PekkaEV1_HealMin, undefined);
  advance(f, .7); assert.ok(f.unit.buffs.PekkaEV1_HealMin); assert.equal(A.healingLimit(f.b, f.unit, f.data), 300);
});
test('Little Prince guard source delay spawns behind its caster, sweeps forward, and ends the cleave on arrival', () => {
  const f = fixture({ actions: K.DATA.actions, areas: K.DATA.areas, buffs: K.DATA.buffs, entities: K.DATA.entities, variables: K.DATA.variables, gameObjectFilters: K.DATA.gameObjectFilters });
  f.unit.entity = 'LittlePrince'; f.unit.def.source = K.DATA.entities.LittlePrince;
  const target = { ...f.unit, id: 31, team: 1, owner: 1, y: 22 * K.SY, buffs: {}, def: { radiusTiles: .4, source: {} } }; f.b.units.push(target); f.unit.targetId = target.id; f.b.nextId = 32;
  assert.equal(A.executeAction(f.b, 'Spawn_ChampionGuardCharge', f.ctx).ok, true);
  advance(f, .849); assert.equal(f.b.units.filter(u => u.entity === 'ChampionGuard').length, 0);
  advance(f, .85); const guard = f.b.units.find(u => u.entity === 'ChampionGuard'); assert.ok(guard); assert.equal(guard.owner, 2); assert.equal(guard.y, 26 * K.SY);
  for (let t = .9; t <= 2; t += .05) { f.b.time = t; A.tickEntity(f.b, guard, .05, f.data); A.refreshAreas(f.b, f.data); }
  assert.equal(guard.modernGuardDash, undefined); assert.ok(Math.abs(guard.y - target.y) < K.SY); assert.ok(f.b.areas.find(a => a.name === 'ChampionGuardCleave').ends <= f.b.time);
});
test('blackboard source scratch values are inherited by next actions without unsafe evaluation', () => {
  const f = fixture({ actions: { write: { ClassType: 'ActionBlackboardSetInt', Key: 'hp_scale', Value: 'hp * 10000 / max_hp', NextAction: 'heal' }, heal: { ClassType: 'ActionHeal', Value: 'max_hp * #hp_scale / 10000' } } });
  assert.equal(A.executeAction(f.b, 'write', f.ctx).ok, true); assert.equal(f.unit.hp, 200);
});
test('Ronin parries a melee hit for twice the source damage, never parries ranged/reflected hits, and recharges after 3500ms', () => {
  const f = fixture({ actions: K.DATA.actions, buffs: K.DATA.buffs, entities: K.DATA.entities, variables: K.DATA.variables, gameObjectFilters: K.DATA.gameObjectFilters });
  const attacker = { ...f.unit, id: 31, team: 1, hp: 1000, maxHp: 1000, buffs: {}, def: { source: { Range: 1200 } } }; f.b.units.push(attacker);
  assert.equal(A.executeAction(f.b, 'ronin_parry', f.ctx).ok, true);
  assert.equal(A.damageModifier(f.b, f.unit, 100, attacker, { projectile: true }, f.data), 100);
  assert.equal(A.damageModifier(f.b, f.unit, 100, attacker, { melee: true }, f.data), 0); assert.equal(attacker.hp, 1000);
  advance(f, .299); assert.equal(attacker.hp, 1000); advance(f, .3); assert.equal(attacker.hp, 800);
  assert.equal(A.damageModifier(f.b, f.unit, 100, attacker, { melee: true }, f.data), 100);
  f.b.time = 3.499; assert.equal(A.damageModifier(f.b, f.unit, 100, attacker, { melee: true }, f.data), 100);
  f.b.time = 3.5; assert.equal(A.damageModifier(f.b, f.unit, 100, attacker, { melee: true }, f.data), 0); advance(f, 3.8); assert.equal(attacker.hp, 600);
  f.b.time = 7; assert.equal(A.damageModifier(f.b, f.unit, 100, attacker, { melee: true, reflected: true }, f.data), 100);
});
test('reworked Goblin Hut wakes only for a source-filtered enemy in range and spawns at 2200ms cadence', () => {
  const f = fixture({ actions: K.DATA.actions, entities: K.DATA.entities, variables: K.DATA.variables, gameObjectFilters: K.DATA.gameObjectFilters });
  f.unit.entity = 'GoblinHut_Rework'; f.unit.def.source = K.DATA.entities.GoblinHut_Rework;
  assert.equal(A.executeAction(f.b, 'goblin_hut_life_time_controller', f.ctx).ok, true);
  advance(f, 1); assert.equal(f.b.units.length, 1);
  const enemy = { ...f.unit, id: 31, team: 1, owner: 1, y: 19 * K.SY, buffs: {}, def: { radiusTiles: .4, source: {} } }; f.b.units.push(enemy); f.b.nextId = 32;
  advance(f, 2); assert.equal(f.b.units.filter(u => u.entity === 'SpearGoblin_Dummy').length, 1);
  advance(f, 4.199); assert.equal(f.b.units.filter(u => u.entity === 'SpearGoblin_Dummy').length, 1);
  advance(f, 4.2); assert.equal(f.b.units.filter(u => u.entity === 'SpearGoblin_Dummy').length, 2);
  enemy.y = 1 * K.SY; advance(f, 6.4); assert.equal(f.b.units.filter(u => u.entity === 'SpearGoblin_Dummy').length, 2);
});
test('Goblin Machine telegraphs its ranged rocket after load, respects the minimum range, and uses its authored cooldown', () => {
  const f = fixture({ actions: K.DATA.actions, areas: K.DATA.areas, entities: K.DATA.entities, projectiles: K.DATA.projectiles, variables: K.DATA.variables, gameObjectFilters: K.DATA.gameObjectFilters });
  f.unit.entity = 'GoblinMachine'; f.unit.def.source = K.DATA.entities.GoblinMachine;
  const near = { ...f.unit, id: 31, team: 1, y: 23 * K.SY, buffs: {}, def: { radiusTiles: .4, source: {} } };
  const ranged = { ...near, id: 32, y: 20 * K.SY, buffs: {} }; f.b.units.push(near, ranged); const shots = [];
  f.b.fireProjectile = (name, source, target, opts) => shots.push({ name, target: target.id, time: f.b.time, opts });
  assert.equal(A.executeAction(f.b, 'goblin_machine_rocket', f.ctx).ok, true);
  advance(f, 1.499); assert.equal(f.b.areas.length, 0); advance(f, 1.5); assert.equal(f.b.areas.length, 1);
  advance(f, 2.499); assert.equal(shots.length, 0); advance(f, 2.5); assert.equal(shots.length, 1); assert.equal(shots[0].target, ranged.id);
  advance(f, 6.499); assert.equal(f.b.areas.length, 1); advance(f, 6.5); assert.equal(f.b.areas.length, 2);
  advance(f, 7.5); assert.equal(shots.length, 2);
});
test('source expression AST observes precedence, variables, and deterministic native units', () => {
  const f = fixture({ variables: { HealPercent: { DefaultValue: 30 } } });
  assert.equal(A.evaluate('(max_hp - hp) * HealPercent / 100', f.b, f.ctx), 30);
  assert.equal(A.evaluate('x + team_y_direction(team_index) * 1000', f.b, f.ctx), 3000);
  assert.equal(A.evaluate('1 + 2 * 3 == 7 && !is_clone', f.b, f.ctx), true);
  for (const s of ['globalThis.process.exit()', 'constructor.constructor(1)', 'missing_variable + 1', 'Math.random()', 'hp; hp = 0']) assert.throws(() => A.evaluate(s, f.b, f.ctx), /Unsupported|Unknown|Invalid/, s);
});
test('groups honor authored millisecond delays and retain source owner across pending actions', () => {
  const f = fixture({ actions: { group: { ClassType: 'ActionGroup', SubActions: ['buff', 'shield'], SubActionsDelay: [0, 400] }, buff: { ClassType: 'ActionSpawn', SpawnType: 'BuffType', SpawnData: 'Rapid', SpawnTime: 3500 }, shield: { ClassType: 'ActionSetShield', ShieldPercent: 100 } }, buffs: { Rapid: { HitSpeedMultiplier: 280, Invisible: true } } });
  assert.equal(A.executeAction(f.b, 'group', f.ctx).ok, true);
  assert.equal(f.unit.buffs.Rapid.until, 3.5);
  assert.equal(f.unit.shield, 0);
  assert.equal(f.b.pending[0].owner, 2);
  assert.equal(f.b.pending[0].sourceId, 20);
  advance(f, .399); assert.equal(f.unit.shield, 0);
  advance(f, .4); assert.equal(f.unit.shield, 80);
});
test('unsupported descendant fails the entire graph before partial side effects', () => {
  const f = fixture({ actions: { group: { ClassType: 'ActionGroup', SubActions: ['shield', 'native'] }, shield: { ClassType: 'ActionSetShield', ShieldPercent: 100 }, native: { ClassType: 'ActionUnspecifiedNativeMechanic' } } });
  const check = A.canExecuteAction(f.b, 'group', f.ctx);
  assert.equal(check.ok, false); assert.match(check.reason, /ActionUnspecifiedNativeMechanic/);
  assert.equal(A.executeAction(f.b, 'group', f.ctx).ok, false);
  assert.equal(f.unit.shield, 0); assert.equal(f.b.pending.length, 0);
});
test('source heal expressions and shield actions preserve health limits and identity', () => {
  const f = fixture({ actions: { heal: { ClassType: 'ActionHeal', Value: '(max_hp - hp) * HealPercent / 100' }, morph: { ClassType: 'ActionChangeGameObjectData', NewCharacterData: 'SecondForm' } }, variables: { HealPercent: { DefaultValue: 30 } }, entities: { SecondForm: { Hitpoints: 500, Speed: 90 } } });
  assert.equal(A.executeAction(f.b, 'heal', f.ctx).ok, true); assert.equal(f.unit.hp, 130);
  assert.equal(A.executeAction(f.b, 'morph', f.ctx).ok, true);
  assert.equal(f.unit.id, 20); assert.equal(f.unit.owner, 2); assert.equal(f.unit.hp, 130); assert.equal(f.unit.entity, 'SecondForm');
});
test('passive intervals use source cadence, bounded repetitions, and cancellation expressions', () => {
  const f = fixture({ actions: { ticker: { ClassType: 'ActionInterval', Interval: 250, StartCounterAt: 250, ActionToExecute: 'increment', MaxRepetitions: 3, ForceStopIfTrue: 'Counter >= 2' }, increment: { ClassType: 'ActionSetVariable', Variable: 'Counter', Value: 'Counter + 1' } }, variables: { Counter: { DefaultValue: 0 } } });
  assert.equal(A.executeAction(f.b, 'ticker', f.ctx).ok, true);
  advance(f, .249); assert.equal(A.evaluate('Counter', f.b, f.ctx), 0);
  advance(f, .25); assert.equal(A.evaluate('Counter', f.b, f.ctx), 1);
  advance(f, .5); assert.equal(A.evaluate('Counter', f.b, f.ctx), 2);
  advance(f, 1); assert.equal(A.evaluate('Counter', f.b, f.ctx), 2);
});
test('health threshold passive runs once for each authored threshold', () => {
  const f = fixture({ actions: { passive: { ClassType: 'ActionRunActionAtHealth', HealthPercentages: [50], Actions: ['shield'] }, shield: { ClassType: 'ActionSetShield', ShieldPercent: 100 } } });
  f.unit.hp = 180; A.executeAction(f.b, 'passive', f.ctx); A.tickEntity(f.b, f.unit, .05, f.data); assert.equal(f.unit.shield, 0);
  f.unit.hp = 99; A.tickEntity(f.b, f.unit, .05, f.data); assert.equal(f.unit.shield, 80);
  f.unit.shield = 0; A.tickEntity(f.b, f.unit, .05, f.data); assert.equal(f.unit.shield, 0);
});
test('Archer Queen authored buff makes unit invisible for 3.5 seconds and expires', () => {
  const f = fixture({ buffs: { ArcherQueenRapid: { Invisible: true, HitSpeedMultiplier: 280, SpeedMultiplier: -25 } } });
  const config = { Buff: 'ArcherQueenRapid', BuffTime: 3500 };
  assert.equal(A.canExecuteAbility(f.b, config, f.ctx).ok, true);
  assert.equal(A.executeAbility(f.b, config, f.ctx).ok, true); A.tickEntity(f.b, f.unit, 0, f.data);
  assert.equal(f.unit.invisible, true);
  advance(f, 3.5); assert.equal(f.unit.invisible, false);
});
test('Monk source damage reduction and Berserker source multiplier are exact and expire', () => {
  const f = fixture({ buffs: { ShieldBoostMonk: { DamageReduction: 65 }, BerserkerHero_buff: { DamageMultiplier: 164, GameTagsToSet: 'UNKILLABLE' } } });
  f.unit.buffs.ShieldBoostMonk = { until: 4 };
  assert.equal(A.damageModifier(f.b, f.unit, 100, null, {}, f.data), 35);
  const enemy = { ...f.unit, id: 31, team: 1, hp: 100, buffs: { BerserkerHero_buff: { until: 3.5 } } };
  assert.equal(A.damageModifier(f.b, f.unit, 100, enemy, {}, f.data), 57.4);
  f.b.time = 4; assert.equal(A.damageModifier(f.b, f.unit, 100, null, {}, f.data), 100);
  f.b.time = 0; assert.equal(A.damageModifier(f.b, enemy, 1000, null, {}, f.data), 99);
});
test('Skeleton King direct ability caps base plus source soul charge count and resets charge variable', () => {
  const f = fixture({ areas: { SkeletonKingGraveyard: { LifeDuration: 10000, FollowBehaviour: 'FollowParent' } }, actions: { reset: { ClassType: 'ActionSetVariable', Variable: 'Souls', Value: '0' } }, variables: { Souls: { DefaultValue: 30 } } });
  const config = { AreaEffectObject: 'SkeletonKingGraveyard', ResurrectBaseCount: 6, SpawnLimit: 16, ResurrectChargesExpression: 'Souls', SpawnCountResetAction: 'reset' };
  assert.equal(A.executeAbility(f.b, config, f.ctx).ok, true);
  assert.equal(f.b.areas[0].modernSpawnLimit, 16); assert.equal(f.b.areas[0].modernSourceId, 20);
  assert.equal(A.evaluate('Souls', f.b, f.ctx), 0);
});
test('real source graphs are audited rather than blindly marked supported', () => {
  const { Battle } = require('../src/battle.js');
  const b = new Battle({ ai: false, seed: 177, headless: true });
  const queen = b.spawn('ArcherQueen', 0, 4 * K.SX, 24 * K.SY, { level: 9, wait: 0 });
  assert.ok(queen); assert.equal(A.canExecuteAbility(b, K.DATA.abilities.ArcherQueenRapid, { unit: queen }).ok, true);
  const audit = A.audit(K.DATA);
  assert.ok(audit.actions.total >= 885); assert.ok(audit.actions.supported > 100); assert.ok(audit.actions.unsupported > 0);
  assert.equal(audit.actions.supported + audit.actions.unsupported, audit.actions.total);
});
test('projectile deflection follows native NoDeflect and inverts line projectiles once', () => {
  const f = fixture({ areas: { Deflect: { DeflectProjectilesEnabled: true, Radius: 1500 } }, projectiles: { Arrow: {}, Zap: { DeflectBehaviour: 'NoDeflect' }, Log: { DeflectBehaviour: 'InvertDirection' } } });
  f.b.areas.push({ id: 50, name: 'Deflect', team: 0, x: f.unit.x, y: f.unit.y, ends: 4, modernSourceId: f.unit.id });
  const enemy = { ...f.unit, id: 40, team: 1, x: f.unit.x, y: f.unit.y - 4 * K.SY }; f.b.units.push(enemy);
  f.b.projectiles = ['Arrow', 'Zap', 'Log'].map((name, i) => ({ id: 60 + i, name, team: 1, owner: 1, attacker: enemy, source: enemy.id, x: f.unit.x, y: f.unit.y, tx: f.unit.x, ty: f.unit.y, vx: 0, vy: 1, line: name === 'Log', range: 10, travel: 2, hit: new Set(), level: 9 }));
  A.tickBattle(f.b, .05, f.data);
  assert.equal(f.b.projectiles[0].team, 0); assert.equal(f.b.projectiles[0].target, 40);
  assert.equal(f.b.projectiles[1].team, 1);
  assert.equal(f.b.projectiles[2].team, 0); assert.equal(f.b.projectiles[2].vy, -1);
  A.tickBattle(f.b, .05, f.data); assert.equal(f.b.projectiles[0].team, 0);
});
test('Wizard source air transitions use 200ms ascend and 3500ms lifetime and restore grounded form', () => {
  const f = fixture({ actions: { flight: { ClassType: 'ActionGroundToAir', TransitionDuration: 200, TotalDuration: 3500, ActionOnFlyHeightReached: 'air', ActionOnStartDescending: 'ground' }, air: { ClassType: 'ActionChangeGameObjectData', NewCharacterData: 'AirForm' }, ground: { ClassType: 'ActionChangeGameObjectData', NewCharacterData: 'GroundForm' } }, entities: { AirForm: { FlyingHeight: 3500 }, GroundForm: {} } });
  const old = f.b.entityDefinition; f.b.entityDefinition = name => ({ ...old(name), air: name === 'AirForm' });
  assert.equal(A.executeAction(f.b, 'flight', f.ctx).ok, true);
  advance(f, .199); assert.notEqual(f.unit.entity, 'AirForm');
  advance(f, .2); assert.equal(f.unit.entity, 'AirForm'); assert.equal(f.unit.air, true);
  advance(f, 3.499); assert.equal(f.unit.air, true);
  advance(f, 3.5); assert.equal(f.unit.entity, 'GroundForm'); assert.equal(f.unit.air, false);
});
test('Mini Pekka quest advances on source timer and single hit tag edges up to source maximum', () => {
  const f = fixture({ actions: { quest: { ClassType: 'ActionMiniPekkaHeroQuest', Intervals: [22000], AmountToIncreaseOnUpgradeBarList: [8000], StartTimerDelay: 1000, MaxResets: 3, UpgradeBarIfTrue: 'UNIT_CUSTOM_TAG_1', OnIntervalReachedAction: 'increment' }, increment: { ClassType: 'ActionSetVariable', Variable: 'Stack', Value: 'Stack + 1' }, hit: { ClassType: 'ActionWithDuration', ActionDuration: 200, GameTagsToSet: 'UNIT_CUSTOM_TAG_1' } }, variables: { Stack: {} } });
  A.executeAction(f.b, 'quest', f.ctx); f.b.time=1; A.tickEntity(f.b,f.unit,1,f.data);
  f.b.time=14; A.tickEntity(f.b,f.unit,13,f.data); assert.equal(A.evaluate('Stack',f.b,f.ctx),0);
  A.executeAction(f.b,'hit',f.ctx); A.tickEntity(f.b,f.unit,.01,f.data);
  assert.equal(A.evaluate('Stack',f.b,f.ctx),0);
  f.b.time=15; A.tickEntity(f.b,f.unit,1,f.data); assert.equal(A.evaluate('Stack',f.b,f.ctx),1);
  f.b.time=100; A.tickEntity(f.b,f.unit,85,f.data); assert.equal(A.evaluate('Stack',f.b,f.ctx),3);
});
test('native level changes update stats and health proportion without replacing the unit identity', () => {
  const f = fixture({ actions: { level: { ClassType: 'ActionSetCharacterLevel', RelativeLevelAdjustmentExpression: '2' } } });
  f.unit.entity='Unit'; f.b.entityDefinition=(name,level)=>({ source:{},hp:200+level*10,shield:80,radiusTiles:.4,level });
  assert.equal(A.executeAction(f.b,'level',f.ctx).ok,true);
  assert.equal(f.unit.level,11); assert.equal(f.unit.id,20); assert.equal(f.unit.maxHp,310); assert.equal(f.unit.hp,155);
});
test('full card capability checks companion and passive dependency graphs', () => {
  const f=fixture({entities:{Main:{},Companion:{OnStartingAction:'native'}},actions:{native:{ClassType:'ActionNativeOnly'}}});
  assert.equal(A.canDeployCard(f.b,{source:{SummonCharacter:'Main',SummonCharacterSecond:'Companion'}},{data:f.data}).ok,false);
  assert.equal(A.canDeployCard(f.b,{source:{SummonCharacter:'Main'}},{data:f.data}).ok,true);
});
test('source target resolver selects nearest legal enemy and Golden Knight chain never repeats a victim', () => {
  const f=fixture({actions:{select:{ClassType:'ActionRunActionListOnObjectsInShapeWithPrio',Shape:'range',TargetFilter:'ground',TargetSelectionMode:'Closest',Actions:[],ActionOnSelfWhenTriggered:'chain'},chain:{ClassType:'ActionDashingAttackChain',DashCount:1,TargetResolver:'nearest'}},shapes:{range:{ClassType:'Circle',Radius:5500}},targetResolvers:{nearest:{Filter:'ground',Shape:'range',StrategyList:['RESOLVER_STRATEGY_CLOSEST_TARGET']}},gameObjectFilters:{ground:{MatchTeamEnemy:true,Filters:['Flying']}}});
  Object.assign(f.unit.def.source,{DashCount:3,DashDamage:40,DashSecondaryRange:5500,JumpSpeed:600,DashLandingTime:200});
  const enemies=[{...f.unit,id:32,team:1,x:f.unit.x,y:f.unit.y-2*K.SY,hp:100,buffs:{}},{...f.unit,id:31,team:1,x:f.unit.x,y:f.unit.y-4*K.SY,hp:100,buffs:{}},{...f.unit,id:33,team:1,x:f.unit.x,y:f.unit.y-K.SY,air:true,hp:100,buffs:{}}];f.b.units.push(...enemies);
  assert.equal(A.executeAction(f.b,'select',f.ctx).ok,true);
  for(let i=1;i<=60;i++){f.b.time=i*.05;A.tickEntity(f.b,f.unit,.05,f.data);}
  assert.equal(enemies[0].hp,60);assert.equal(enemies[1].hp,60);assert.equal(enemies[2].hp,100);
});
test('Goblinstein authored tether damages only enemies inside its segment and preserves owner pairing', () => {
  const f=fixture({actions:{tether:{ClassType:'ActionGoblinsteinAbility',TetherDuration:3500,TetherWidth:2000,TetherDamage:37,TetherCrownTowerDamage:9,TetherHitInterval:500,TetherDamageTargets:'enemy'}},buffs:{goblinstein_doctor_aura:{}},gameObjectFilters:{enemy:{MatchTeamEnemy:true}},entities:{}});
  f.unit.entity='goblinstein_doctor';f.unit.card='goblinstein';f.unit.levelGroupId='pair';
  const monster={...f.unit,id:22,entity:'goblinstein',x:f.unit.x+4*K.SX,team:0,owner:2,buffs:{}};
  const enemy={...f.unit,id:30,entity:'Enemy',x:f.unit.x+2*K.SX,y:f.unit.y,team:1,owner:1,hp:200,buffs:{}};
  const other={...enemy,id:31,y:f.unit.y+3*K.SY};f.b.units.push(monster,enemy,other);
  A.executeAction(f.b,'tether',f.ctx);f.unit.buffs.goblinstein_doctor_aura={until:1.25};
  A.tickEntity(f.b,f.unit,.05,f.data);assert.equal(enemy.hp,163);assert.equal(other.hp,200);
  f.b.time=.5;A.tickEntity(f.b,f.unit,.05,f.data);assert.equal(enemy.hp,126);
  f.b.time=3.5;A.tickEntity(f.b,f.unit,.05,f.data);assert.equal(enemy.hp,126);
});
