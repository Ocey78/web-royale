'use strict';
const test=require('node:test'),A=require('node:assert/strict');
const K=require('../src/catalog.js'),B=require('../src/battle.js');
const fs=require('node:fs'),path=require('node:path');

function deck(first){
 const rest=['knight','archers','giant','musketeer','bomber','cannon','arrows','fireball'].filter(x=>x!==first);
 return [first,...rest].slice(0,8);
}

test('princess tower destruction emits original crown death graph and crown flight event',()=>{
 const b=new B.Battle({ai:false,deck:deck('knight')});
 const tower=b.towers.find(t=>t.team===1&&!t.king);tower.hp=1;
 b.damage(tower,10,b.makeEntity('Knight',0,tower.x,tower.y,{level:9,wait:0}));b.deaths();
 A.equal(b.crowns[0],1);
 A.ok(b.effects.some(e=>e.sourceEffect==='crown_tower_death1'));
 A.ok(b.effects.some(e=>e.kind==='crownAward'&&e.team===0&&e.amount===1));
});

test('king tower destruction emits king crown death graph and awards three crowns',()=>{
 const b=new B.Battle({ai:false,deck:deck('knight')});
 const tower=b.towers.find(t=>t.team===1&&t.king);tower.hp=1;
 b.damage(tower,10,b.makeEntity('Knight',0,tower.x,tower.y,{level:9,wait:0}));b.deaths();
 A.equal(b.crowns[0],3);
 A.ok(b.effects.some(e=>e.sourceEffect==='crown_tower_death2'));
 A.ok(b.effects.some(e=>e.kind==='crownAward'&&e.team===0&&e.amount===3));
});

test('spell cards emit their authored cast effects before resolving',()=>{
 const cases=[
  ['arrows','Cast_RainOfArrows'],
  ['freeze','Spell_freeze_cast'],
  ['graveyard','Spell_graveyard_cast'],
  ['the-log','log_deploy'],
  ['barbarian-barrel','barb_log_deploy'],
  ['goblin-barrel','goblin_barrel_spawn'],
 ];
 for(const [id,effect] of cases){
  const b=new B.Battle({ai:false,deck:deck(id)});const r=b.deploy(0,0,9*K.SX,22*K.SY);A.equal(r.ok,true,id);
  A.ok(b.effects.some(e=>e.sourceEffect===effect),`${id} should emit ${effect}`);
 }
});

test('end result uses dedicated native-style flow instead of result modal',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../src/app.js'),'utf8');
 A.match(app,/function beginEndFlow\(/);
 A.doesNotMatch(app,/function result\(\)[\s\S]{0,1600}panel\('result'/);
 const html=fs.readFileSync(path.join(__dirname,'../src/index.template.html'),'utf8');
 for(const id of ['matchEnd','matchOverText','matchResultBoard','endEnemyCrowns','endPlayerCrowns','endOk'])A.match(html,new RegExp(`id=["']${id}["']`));
});

test('graveyard emits its authored skeleton appearance effect for each spawned skeleton',()=>{
 const b=new B.Battle({ai:false,deck:deck('graveyard')});
 A.equal(b.deploy(0,0,9*K.SX,10*K.SY).ok,true);
 for(let i=0;i<210;i++)b.step(1/60);
 A.ok(b.units.some(u=>u.entity==='Skeleton'),'graveyard should have spawned a Skeleton');
 A.ok(b.effects.some(e=>e.sourceEffect==='Graveyard_appear'),'spawned Skeleton should use Graveyard_appear');
});

test('end-of-match source crown and confetti graphs are bundled',()=>{
 const fx=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/game/fx-data.json'),'utf8'));
 for(const name of ['crown_tower_death1','crown_tower_death2','win_battle_confetti_gold','win_battle_confetti_gold_top'])
  A.ok(fx.effects[name],`missing source effect ${name}`);
 for(const name of ['crown_explode1','win_battle_confetti_gold1','win_battle_confette_gold2'])
  A.ok(fx.emitters[name],`missing source emitter ${name}`);
});

test('winner confetti waits for the result banners and first crown reveal',()=>{
 const b=new B.Battle({ai:false,deck:deck('knight')});
 b.finish(0,'test');
 const fx=b.effects.filter(e=>['win_battle_confetti_gold','win_battle_confetti_gold_top'].includes(e.sourceEffect));
 A.equal(fx.length,2);
 for(const e of fx)A.ok(e.delay>=1.35&&e.delay<=1.55,`confetti delay ${e.delay}`);
});
