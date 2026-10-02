'use strict';
const test=require('node:test'),A=require('node:assert/strict');
const K=require('../src/catalog.js'),B=require('../src/battle.js');

test('Princess volley uses CustomFirstProjectile for the damage-bearing projectile',()=>{
 const src=K.DATA.entities.Princess;A.equal(K.projectileForAttack(src,0),src.CustomFirstProjectile);A.equal(K.projectileForAttack(src,1),src.Projectile);A.ok(K.projectileDamageDef(src.CustomFirstProjectile).Damage>0);A.equal(K.projectileDamageDef(src.Projectile)?.Damage,undefined);
});
test('Princess entity damage derives from the damage-bearing projectile',()=>{A.ok(K.entityDef('Princess',9).damage>0);});
test('Princess attack lowers a target HP',()=>{const b=new B.Battle({ai:false}),p=b.makeEntity('Princess',0,9*K.SX,20*K.SY,{level:9,wait:0}),t=b.makeEntity('Knight',1,9*K.SX,15*K.SY,{level:9,wait:0});b.units.push(p,t);const hp=t.hp;b.strike(p,t);for(let i=0;i<160&&t.hp===hp;i++)b.step(.05);A.ok(t.hp<hp,`before=${hp} after=${t.hp}`);});
test('ordinary projectile users keep their source projectile',()=>{for(const name of ['Musketeer','Archer','SpearGoblin','Cannon']){const src=K.DATA.entities[name];A.equal(K.projectileForAttack(src,0),src.CustomFirstProjectile||src.Projectile);}});
