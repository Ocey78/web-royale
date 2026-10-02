'use strict';
const {test}=require('node:test'),A=require('node:assert/strict');
const C=require('../src/core.js'),S=require('../src/sandbox.js');
const noTowers={blue:{left:false,right:false,king:false},red:{left:false,right:false,king:false}};
const make=level=>new S.Session({level,towers:noTowers,headless:true});
function place(session,card,level,team=0){const result=session.spawn({card,level,team,x:9*C.SX,y:22*C.SY});A.equal(result.ok,true,card);return result;}
function advance(session,seconds){for(let i=0;i<seconds*4;i++)session.advance(.25);}
function checkUnit(unit,level){A.equal(unit.level,level,unit.entity+' level');A.equal(unit.def.level,level,unit.entity+' definition');const expected=S.entityDefinition(unit.entity,level);A.equal(unit.maxHp,unit.cloned?1:expected.hp||1,unit.entity+' max HP');A.equal(unit.def.damage,expected.damage,unit.entity+' damage');}

test('all source sandbox cards expose finite Level0 and99 stats and match their spawned entity definitions',()=>{
 for(const card of C.CARDS)for(const level of [0,99]){
  const def=S.cardDefinition(card.id,level);A.equal(def.level,level,card.id);
  for(const field of ['hp','damage','duration'])A.ok(Number.isFinite(def[field])&&def[field]>=0,card.id+' '+field);
  if(def.entity){const e=S.entityDefinition(def.entity,level);A.equal(def.hp,e.hp,card.id+' hp');A.equal(def.damage,e.damage,card.id+' damage');}
 }
});

for(const level of [0,99]){
 test('Level'+level+' real Fireball damage uses the same scale as its card stats',()=>{
  const s=make(level),b=s.battle,target=b.spawn('Knight',1,9*C.SX,22*C.SY,{level,wait:999});target.hp=target.maxHp=1e10;
  place(s,'fireball',level);A.ok(b.pending.some(p=>p.level===level)||b.projectiles.some(p=>p.level===level));
  advance(s,5);A.equal(1e10-target.hp,S.cardDefinition('fireball',level).damage);
 });
 test('Level'+level+' Poison area and direct area buffs preserve their level and damage',()=>{
  const s=make(level),b=s.battle,target=b.spawn('Knight',1,9*C.SX,22*C.SY,{level,wait:0});target.hp=target.maxHp=1e10;
  place(s,'poison',level);advance(s,2.25);
  A.equal(1e10-target.hp,S.cardDefinition('poison',level).damage);
  A.equal(Object.values(target.buffs)[0].level,level);
  target.buffs={};target.hp=1e10;b.areas=[];
  b.hitArea({team:0,x:target.x,y:target.y,radius:2,damage:0,ground:true,air:true,buff:'Poison',buffTime:3,level});
  advance(s,1.25);A.equal(1e10-target.hp,S.cardDefinition('poison',level).damage);A.ok(Object.values(target.buffs).every(buff=>buff.level===level));
 });
 test('Level'+level+' Golem splits preserve child levels and power stats',()=>{
  const s=make(level),b=s.battle;place(s,'golem',level);const parent=b.units.find(u=>u.entity==='Golem');checkUnit(parent,level);parent.hp=0;b.deaths();
  const children=b.units.filter(u=>u.entity==='Golemite');A.equal(children.length,2);for(const child of children)checkUnit(child,level);
 });
 for(const [card,child,seconds]of [['goblin-giant','SpearGoblinGiant',2],['witch','Skeleton',12],['graveyard','Graveyard_rework_Skeleton',5],['goblin-barrel','Goblin',5],['barbarian-barrel','Barbarian',6],['royal-delivery','DeliveryRecruit',5]]){
  test('Level'+level+' '+card+' propagates its level through the live child-spawn chain',()=>{
   const s=make(level);place(s,card,level);advance(s,seconds);const children=s.battle.units.filter(u=>u.entity===child);A.ok(children.length>0,child+' actually spawned');for(const unit of children)checkUnit(unit,level);
  });
 }
 test('Level'+level+' crown towers use their requested isolated definitions',()=>{
  const b=new S.Session({level,headless:true}).battle;A.deepEqual(b.kingLevels,[level,level]);A.equal(b.towers.length,6);for(const t of b.towers)checkUnit(t,level);
 });
}

test('Clone preserves the copied troop level while Mirror caps its bonus at99',()=>{
 const s=make(0),b=s.battle;place(s,'knight',99);advance(s,1.25);place(s,'clone',0);advance(s,1.25);
 const clone=b.units.find(u=>u.cloned);A.ok(clone);checkUnit(clone,99);A.equal(clone.hp,1);
 s.clear();place(s,'knight',99);place(s,'mirror',99);const originalKnights=b.units.filter(u=>u.entity==='Knight'&&!u.cloned);A.equal(originalKnights.length,2);for(const u of originalKnights)checkUnit(u,99);
 s.clear();place(s,'knight',0);place(s,'mirror',0);A.deepEqual(b.units.filter(u=>u.entity==='Knight').map(u=>u.level),[0,1]);
});

test('extended sandbox definitions never change normal catalog caches, saved caps, or another sandbox',()=>{
 const before=JSON.stringify(C.CARDS.map(c=>C.cardAt(c.id,9))),normal=C.entityDef('Knight',30),low=make(0),high=make(99);
 place(low,'knight',0);place(high,'knight',99);checkUnit(low.battle.units[0],0);checkUnit(high.battle.units[0],99);
 A.ok(low.battle.units[0].maxHp<C.entityDef('Knight',1).hp);A.ok(high.battle.units[0].maxHp>normal.hp);
 A.strictEqual(C.entityDef('Knight',30),normal);A.equal(C.entityDef('Knight',99).level,30);A.equal(C.entityDef('Knight',0).level,9);
 A.equal(JSON.stringify(C.CARDS.map(c=>C.cardAt(c.id,9))),before);
 A.equal(C.normalizeProfile({cardLevels:{knight:99},level:99}).cardLevels.knight,C.MAX_CARD_LEVEL);
 const battle=new C.Battle({kingLevel:99,kingLevels:[99,99],ai:false});A.deepEqual(battle.kingLevels,[C.MAX_CARD_LEVEL,C.MAX_CARD_LEVEL]);
});
