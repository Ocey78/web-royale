'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const K=require('../src/catalog'),D=K.DATA;
const scaled=(table,name,field,target)=>assert.equal(K.scaled(table[name][field],table[name].Rarity||'Common',11),target,name+'.'+field);
test('October 6 overlay identifies verified package without replacing source identity',()=>{assert.equal(D.snapshot,'16.402.17+balance-2026-10-06');assert.equal(D.packageLabel,'160402017');assert.equal(D.sourceFingerprint,'504fe9d1820c587deda31030c70bc4d1121fea4f');assert.equal(D.balanceOverlay.date,'2026-10-06');assert.ok(D.balanceOverlay.unresolved.some(r=>r.card==='Skeletons'&&r.reason.includes('numeric')));});
test('all announced Level 11 numerical damage and health targets are exact',()=>{
 scaled(D.areas,'IceWizardHero_FreezeAeo','Damage',46);
 scaled(D.buffs,'Cannon_EV1_barrage_damage_buff','DamagePerSecond',261);
 scaled(D.projectiles,'BarbLogProjectileRolling','Damage',215);
 scaled(D.entities,'Ghost','Hitpoints',1152);scaled(D.entities,'Ghost','Damage',263);
 assert.equal(K.scaled(D.areas.GoblinDrillDamageArea.Damage.TowerDamage,'Common',11),20);
 scaled(D.projectiles,'LavaHoundProjectile','Damage',71);scaled(D.entities,'Ram','Damage',271);
 scaled(D.projectiles,'WallbreakerProjectile','Damage',302);scaled(D.projectiles,'xbow_projectile','Damage',61);
 scaled(D.entities,'ThreeMusketeer_Rework','Hitpoints',906);scaled(D.entities,'GoldenKnight','Damage',168);
});
test('October 6 direct timers and ranges use source units',()=>{
 assert.equal(D.entities.ElixirCollector.LifeTime,110000);assert.equal(D.entities.ElixirCollector.ManaGenerateTimeMs,15000);
 assert.equal(D.entities.MinionGiant.HitSpeed,1700);assert.equal(D.entities.LavaHound.HitSpeed,1500);
 assert.equal(D.abilities.Deflect.CastTime,700);assert.equal(D.abilities.GoldenKnightChain.DashRange,5000);
 assert.equal(D.entities.GoldenKnight.DashSecondaryRange,5000);assert.equal(D.shapes.GoldenKnight_Charge_Shape.Radius,5000);
 assert.equal(D.entities.AngryBarbarian_EV1.AttackSequenceList[1].CustomSightRange,6000);
});
test('balances propagate native inheritance and barrel specialization preserves ordinary Goblins',()=>{
 scaled(D.entities,'Ghost_EV1','Hitpoints',1152);scaled(D.entities,'Ghost_EV1','Damage',263);
 for(const name of ['ThreeMusketeer_Rework_Character_1','ThreeMusketeer_Rework_Character_2','ThreeMusketeer_Rework_Character_3'])scaled(D.entities,name,'Hitpoints',906);
 assert.equal(K.scaled(D.projectiles.WallbreakerProjectile_EV1.Damage,'Common',11),302);
 assert.ok(Math.abs(K.entityDef('Goblin',11).firstHit-.4)<1e-9);
 for(const name of ['GoblinBarrelSpell','GoblinBarrelSpell_EV1','GoblinBarrelSpell_EV1_Decoy'])assert.ok(Math.abs(K.entityDef(D.projectiles[name].SpawnCharacter,11).firstHit-.3)<1e-9);
 assert.equal(D.entities.Musketeer.Hitpoints,282);assert.equal(D.projectiles.LavaPupProjectile.Damage,32);
});
test('v17 new Electro Giant Evolution and Hero Electro Wizard retain real native source definitions',()=>{
 assert.ok(D.forms.some(f=>f.id==='ElectroGiant_EV1'&&f.baseCardId==='electro-giant'));
 assert.ok(D.forms.some(f=>f.id==='ElectroWizard_hero'&&f.baseCardId==='electro-wizard'));
 assert.ok(D.entities.ElectroGiant_EV1.OnStartingAction);assert.ok(D.entities.ElectroWizardHero.Ability);
 assert.ok(D.entities.ElectroWizardHero.AttackSequenceList.length);
 assert.equal(D.unresolvedInheritance.length,0);
});
test('resolved source arithmetic preserves inheritance while raw authored source remains available',()=>{
 assert.equal(D.sourceSections.EXT.WallbreakerProjectile_EV1.Damage[0],'%');
 assert.equal(D.projectiles.WallbreakerProjectile_EV1.Damage,D.projectiles.WallbreakerProjectile.Damage);
 assert.equal(D.entities.Archer_EV1.Range,D.entities.Archer.Range*1.2);
 assert.equal(D.areas.IceWizardHero_FreezeAeo_Dummy.Damage.BaseDamage,0);
 assert.equal(D.areas.IceWizardHero_FreezeAeo_Dummy.Damage.TowerDamage,0);
 assert.equal(D.sourceSections.AEO.IceWizardHero_FreezeAeo.Damage.BaseDamage,35);
 assert.equal(D.sourceSections.CHARACTER.Ghost.Hitpoints,473);
});
test('serialized asset and module expose identical gameplay data',()=>{
 const raw=JSON.parse(require('node:fs').readFileSync(require('node:path').join(__dirname,'../assets/game/data.json'),'utf8'));
 assert.deepEqual(raw,D);
 assert.ok(D.sourceProvenance.decodedSha256['csv_logic/rarities.csv']);
 assert.ok(D.balanceOverlay.changes.every(c=>c.method&&c.appliedValue!==undefined));
});
