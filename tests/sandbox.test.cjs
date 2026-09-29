const test=require('node:test'),A=require('node:assert/strict'),C=require('../src/core'),S=require('../src/sandbox');
const noTowers={blue:{left:false,right:false,king:false},red:{left:false,right:false,king:false}};
test('sandbox has no opponents, recorder, result or time limit',()=>{
 const s=new S.Session({towers:noTowers}),b=s.battle;
 A.equal(b.isSandbox,true);A.equal(b.ai,false);A.equal(b.practice,true);A.equal(b.learningEnabled,false);A.equal(b.recorder,null);
 b.time=10000;for(let i=0;i<120;i++)s.advance(1/60);
 A.ok(b.time>10001);A.equal(b.result,null);A.equal(b.tiebreaker,null);A.equal(b.units.length,0);A.deepEqual(b.events,[]);
});
test('each of 102 cards can be cast for either team without a deck, elixir or territory gate',()=>{
 A.equal(C.CARDS.length,102);
 for(const team of [0,1])for(const c of C.CARDS){const s=new S.Session({towers:noTowers});s.battle.elixir[team]=0;
  if(c.id==='mirror')A.equal(s.spawn({card:'knight',team,x:240,y:320}).ok,true);
  A.equal(s.spawn({card:c.id,team,x:100,y:team?500:100}).ok,true,c.id+' team '+team);
  A.equal(s.battle.elixir[team],0);A.equal(s.battle.result,null);
 }
});
test('sandbox Mirror requires and copies the previous card for its selected team',()=>{
 const s=new S.Session({towers:noTowers});A.equal(s.spawn({card:'mirror',team:1,x:100,y:100}).ok,false);
 s.spawn({card:'knight',team:0,x:100,y:500,level:1});s.spawn({card:'baby-dragon',team:1,x:100,y:100,level:5});
 const r=s.spawn({card:'mirror',team:1,x:200,y:100,level:9});A.equal(r.card,'baby-dragon');A.equal(s.battle.units.at(-1).team,1);A.equal(s.battle.units.at(-1).level,10);
});
test('tower selection removes only the chosen towers and reset restores their health',()=>{
 const s=new S.Session({towers:{blue:{left:false,right:true,king:true},red:{left:true,right:false,king:false}}});
 A.equal(s.battle.towers.length,3);A.equal(s.battle.towers.filter(t=>t.king).length,1);A.ok(s.battle.towers.some(t=>t.team===0&&!t.king&&t.x>240));
 s.battle.towers[0].hp=1;s.spawn({card:'knight',team:0,x:100,y:500});s.reset();
 A.equal(s.battle.towers.length,3);A.equal(s.battle.units.length,0);A.equal(s.battle.towers[0].hp,s.battle.towers[0].maxHp);A.equal(s.battle.time,0);
});
test('clear removes pending spells and units, pause freezes combat but permits arranging units',()=>{
 const s=new S.Session();s.battle.paused=true;s.spawn({card:'arrows',team:0,x:100,y:100});s.spawn({card:'knight',team:1,x:100,y:100});
 A.ok(s.battle.pending.length);A.ok(s.battle.units.length);s.advance(.2);A.equal(s.battle.time,0);
 const tower=s.battle.towers[0];Object.assign(tower,{visualState:'attack',animationTime:.4,visualAttack:{windup:.6,releasedAt:null},visualHook:{target:22}});
 s.clear();for(const key of ['units','pending','projectiles','areas','effects'])A.equal(s.battle[key].length,0);A.equal(s.battle.towers.length,6);A.equal(s.battle.paused,true);A.equal(tower.visualState,'idle');A.equal(tower.animationTime,0);A.equal(tower.visualAttack,null);A.equal(tower.visualHook,null);
});
test('Baby Dragon has no target and stays idle when every enemy is absent',()=>{
 const s=new S.Session({towers:noTowers});s.spawn({card:'baby-dragon',team:0,x:240,y:400});const u=s.battle.units[0],at={x:u.x,y:u.y};
 for(let i=0;i<300;i++)s.advance(1/60);A.equal(u.targetId,null);A.equal(u.x,at.x);A.equal(u.y,at.y);A.equal(u.visualState,'idle');
});
test('invalid sandbox commands have no side effects and regular battles keep normal rules',()=>{
 const s=new S.Session();for(const cmd of [{card:'missing',team:0,x:50,y:50},{card:'knight',team:2,x:50,y:50},{card:'knight',team:0,x:NaN,y:50},{card:'knight',team:0,x:-50,y:50}])A.equal(s.spawn(cmd).ok,false);
 A.equal(s.battle.units.length,0);const b=new C.Battle({ai:false});b.time=301;b.checkResult();A.ok(b.tiebreaker||b.result);A.ok(b.recorder);A.equal(b.isSandbox,undefined);
});
test('sandbox levels 0, 1, 13, 30 and 99 scale troop health, attacks and shields consistently',()=>{
 for(const level of [0,1,13,30,99]){const s=new S.Session({level,towers:noTowers});
  for(const id of ['knight','guards','baby-dragon']){s.spawn({card:id,team:0,x:100,y:400,level});const u=s.battle.units.at(-1),r=C.DATA.entities[u.entity];
   A.equal(u.level,level,id+' level');A.equal(u.hp,Math.max(1,S.scaleStat(r.Hitpoints,r.Rarity,level)),id+' hp');
   if(r.ShieldHitpoints)A.equal(u.shield,S.scaleStat(r.ShieldHitpoints,r.Rarity,level),id+' shield');
   const p=C.projectileDamageDef(C.projectileForAttack(r));A.equal(u.def.damage,S.scaleStat(r.Damage??p?.Damage??0,r.Damage!==undefined?r.Rarity:p?.Rarity||r.Rarity,level),id+' damage');
  }
 }
 A.ok(S.scaleStat(100,'Legendary',0)<S.scaleStat(100,'Legendary',1));A.equal(C.entityDef('Knight',99).level,30,'Normal catalog cap unchanged');
});
test('sandbox levels pass through spells, death spawns, towers and Mirror without normal caps',()=>{
 for(const level of [0,1,13,30,99]){const s=new S.Session({level,towers:noTowers});
  s.spawn({card:'golem',team:0,x:100,y:400,level});const golem=s.battle.units[0];golem.hp=0;s.battle.deaths();
  A.ok(s.battle.units.length);A.ok(s.battle.units.every(u=>u.level===level),'Death-spawn levels preserved');
  s.spawn({card:'fireball',team:0,x:240,y:100,level});const p=s.battle.projectiles.at(-1);A.equal(p.level,level,'Spell projectile level');
  const target=s.battle.makeEntity('Giant',1,240,100,{level:99,wait:0});const hp=target.hp,raw=C.DATA.projectiles[p.name];s.battle.projectileDamage(p,target);A.equal(hp-target.hp,S.scaleStat(raw.Damage,raw.Rarity,level),'Spell actual damage');
  s.reset(undefined,level);A.equal(s.battle.sandboxLevel,level);s.reset({blue:{left:true,right:true,king:true},red:{left:true,right:true,king:true}},level);A.ok(s.battle.towers.every(t=>t.level===level&&t.hp===t.def.hp));
 }
 const s=new S.Session({towers:noTowers});s.spawn({card:'knight',team:0,x:100,y:400,level:99});s.spawn({card:'mirror',team:0,x:150,y:400,level:99});A.equal(s.battle.units.at(-1).level,99);
});
