'use strict';
// Current Void balance reference: Supercell August4/26,2026 (Lv11).
const test=require('node:test'),assert=require('node:assert/strict'),C=require('../src/core.js');
function field(){const deck=['void','knight','archers','giant'];const b=new C.Battle({queue:'challenge',mode:'FourCardDeck',deck,enemyDeck:deck,ai:false,seed:541});b.towers=[];return b;}
function enemy(b,id='Knight',x=210,y=300,team=1){const u=b.spawn(id,team,x,y,{wait:0,level:11});u.hp=u.maxHp=10000;return u;}
function advance(b,seconds){for(let i=0;i<Math.round(seconds*60);i++){b.time+=1/60;b.tickPending();b.tickAreas(1/60);b.modernActions.tickBattle(b,1/60);for(const u of b.active){b.modernActions.tickEntity(b,u,1/60);b.tickBuffs(u);}b.deaths();}}
function damage(b,id){return b.events.filter(e=>e.type==='damage'&&e.target===id);}
test('current Void uses official level11 damage tiers and retains three one-second pulses',()=>{
 for(const [count,amount]of [[1,696],[2,294],[4,294],[5,153]]){const b=field(),units=Array.from({length:count},()=>enemy(b)),a=b.createArea('DarkMagicAOE',0,240,300,11);advance(b,4.2);const hits=damage(b,units[0].id);assert.deepEqual(hits.map(e=>e.amount),[amount,amount,amount]);assert.equal(a.modernLaser.hits,3);for(let i=1;i<hits.length;i++)assert.ok(Math.abs(hits[i].time-hits[i-1].time-1)<1/60);assert.ok(Math.abs(hits[0].time-1.6)<=1/60+1e-7);}
});
test('Void keeps one persistent center field even when no enemy is in range',()=>{
 const b=field(),a=b.createArea('DarkMagicAOE',0,240,300,11);advance(b,.6);const main=b.effects.filter(e=>e.sourceEffect==='PaoloFirstEffectEver');assert.equal(main.length,1);assert.equal(main[0].loop,true);assert.equal(main[0].x,a.x);assert.equal(main[0].y,a.y);assert.ok(Math.abs(main[0].born+main[0].ttl-a.ends)<1e-7);
 enemy(b);advance(b,2.2);assert.equal(b.effects.filter(e=>e.sourceEffect==='PaoloFirstEffectEver').length,1,'damage pulses cannot stack more center fields');
});
test('Void bolts are born at every detected target and follow its actual position',()=>{
 const b=field(),one=enemy(b,'Knight',210,295),two=enemy(b,'BabyDragon',266,307);b.createArea('DarkMagicAOE',0,240,300,11);advance(b,1.55);const beams=b.effects.filter(e=>e.sourceEffect==='Paolo_zap_effect2');assert.equal(beams.length,2);assert.deepEqual(beams.map(e=>[e.follow,e.x,e.y]),[[one.id,one.x,one.y],[two.id,two.x,two.y]]);assert.equal(damage(b,one.id).length,0,'beam starts before the source100ms damage delay');
});
test('Void recounts live targets each pulse, including air while excluding friendly troops',()=>{
 const b=field(),one=enemy(b),friend=enemy(b,'Knight',235,300,0),a=b.createArea('DarkMagicAOE',0,240,300,11);advance(b,1.7);const air=enemy(b,'BabyDragon',250,300);advance(b,1);air.x=450;advance(b,1);assert.deepEqual(damage(b,one.id).map(e=>e.amount),[696,294,696]);assert.deepEqual(damage(b,air.id).map(e=>e.amount),[294]);assert.equal(damage(b,friend.id).length,0);assert.equal(a.modernLaser.hits,3);
});
test('Void applies its official separate tower tiers when towers contribute to target count',()=>{
 for(const [others,amount]of [[0,97],[1,51],[4,35]]){const b=field(),tower={...new C.Battle({ai:false}).towers.find(t=>!t.king&&t.team===1),x:240,y:300,hp:10000,maxHp:10000};b.towers=[tower];for(let i=0;i<others;i++)enemy(b);b.createArea('DarkMagicAOE',0,240,300,11);advance(b,4.2);assert.deepEqual(damage(b,tower.id).map(e=>e.amount),[amount,amount,amount]);}
});
test('Void hover includes the flying enemies that its source controller actually hits',()=>{const b=field(),ground=enemy(b),air=enemy(b,'BabyDragon',245,300),friendly=enemy(b,'BabyDragon',240,300,0),shape={kind:'radial',x:240,y:300,radius:2.5};assert.deepEqual(b.spellAffectedEntities(C.cardAt('void',11),shape,0).map(u=>u.id).sort(),[ground.id,air.id].sort());assert.ok(!b.spellAffectedEntities(C.cardAt('earthquake',11),shape,0).some(u=>u.id===air.id));assert.ok(!b.spellAffectedEntities(C.cardAt('void',11),shape,0).some(u=>u.id===friendly.id));});
