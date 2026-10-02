'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),C=require('../src/core.js');
class PolicyBattle extends C.Battle{
 entityDefinition(name,level){const def=C.entityDef(name,level);return level===0?{...def,level:0,hp:def.hp/2,damage:def.damage/2,shield:def.shield/2}:def;}
 scaleStat(raw,rarity,level){return level===0?Math.floor((raw||0)/2):C.scaled(raw,rarity,level);}
}
test('an isolated battle stat policy receives explicit level zero when creating parent and death children',()=>{
 const b=new PolicyBattle({ai:false}),golem=b.spawn('Golem',0,240,400,{level:0,wait:0});
 assert.equal(golem.level,0);assert.equal(golem.hp,C.entityDef('Golem',0).hp/2);
 golem.hp=0;b.deaths();const children=b.units.filter(u=>u.entity==='Golemite');assert.equal(children.length,2);assert.ok(children.every(u=>u.level===0));
});
test('projectile and area-buff dispatch preserve explicit zero and use the isolated scalar policy',()=>{
 const b=new PolicyBattle({ai:false}),source=b.spawn('Musketeer',0,240,400,{level:0,wait:0}),target=b.spawn('Giant',1,240,380,{wait:0});
 const p=b.fireProjectile(source.def.projectile,source,target);assert.equal(p.level,0);const hp=target.hp;b.projectileDamage(p,target);
 assert.equal(hp-target.hp,Math.floor(C.DATA.projectiles[p.name].Damage/2));
 b.hitArea({team:0,x:target.x,y:target.y,radius:2,damage:0,ground:true,air:true,buff:'Freeze',level:0});assert.equal(target.buffs.Freeze.level,0);
});
test('normal battles keep the unchanged catalog scalar and entity definition policies',()=>{
 const b=new C.Battle({ai:false});assert.equal(typeof b.scaleStat,'function');assert.equal(typeof b.entityDefinition,'function');
 for(const level of [0,1,13,30,99]){assert.deepEqual(b.entityDefinition('Knight',level),C.entityDef('Knight',level));assert.equal(b.scaleStat(160,'Legendary',level),C.scaled(160,'Legendary',level));}
 assert.equal(b.spawn('Knight',0,240,400,{level:99}).level,30);
});
