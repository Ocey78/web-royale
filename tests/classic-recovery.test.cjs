'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const C=require('../src/core.js'),K=require('../src/catalog.js'),P=require('../src/profile.js');
const root=path.resolve(__dirname,'..');
const cheats={duplicates:true,placement:true,overlevels:true};
test('local cheat flags and overlevel preferences survive normalization without changing earned levels',()=>{
 const p=P.normalizeProfile({cheats,cheatLevels:{knight:24,unknown:99},cardLevels:{knight:9}});
 assert.deepEqual(p.cheats,cheats);assert.equal(p.cheatLevels.knight,24);assert.equal(p.cardLevels.knight,9);assert.equal(p.cheatLevels.unknown,undefined);
 assert.equal(P.normalizeProfile({cheats:{duplicates:'true'}}).cheats.duplicates,false);
});
test('duplicate decks are accepted only with the explicit practice flag',()=>{
 const deck=Array(8).fill('knight');assert.equal(K.validDeck(deck),false);assert.equal(K.validDeck(deck,{duplicates:true}),true);
 assert.deepEqual(P.normalizeProfile({cheats,decks:[deck]}).decks[0],deck);
 assert.equal(new Set(P.normalizeProfile({cheats:{duplicates:false},decks:[deck]}).decks[0]).size,8);
});
test('practice duplicates really enter the battle hand; overlevels affect only the local player',()=>{
 const deck=Array(8).fill('knight'),b=new C.Battle({ai:false,profile:{cheats,cheatLevels:{knight:22},decks:[deck]}});
 assert.deepEqual(b.initialDecks[0],deck);assert.equal(b.card(0,0).level,22);assert.equal(b.card(1,0).level,9);assert.equal(b.practice,true);
 assert.ok(K.entityDef('Knight',22).hp>K.entityDef('Knight',13).hp);
});
test('placement override accepts enemy-side ground deployment, preserves bounds and does not empower the enemy',()=>{
 const b=new C.Battle({ai:false,profile:{cheats:{placement:true}}}),card=b.card(0,0);
 assert.equal(b.placement(0,card,240,160).ok,true);assert.equal(b.placement(0,card,NaN,160).ok,false);
 assert.equal(b.placement(1,card,240,590).ok,false);
 const r=b.deploy(0,0,240,160);assert.equal(r.ok,true);assert.ok(b.units.some(u=>u.team===0&&u.y<200));
});
test('training and cheat results are recorded but cannot award trophies, coins, chests or crown progress',()=>{
 const b=new C.Battle({ai:false,practice:true});b.result={winner:0};b.crowns=[3,0];b.time=100;
 const p=P.normalizeProfile(),q=P.applyResult(p,b);for(const key of ['trophies','gold','earnedCrowns','wins'])assert.equal(q[key],p[key]);
 assert.equal(q.chests.length,p.chests.length);assert.equal(q.history[0].practice,true);assert.deepEqual(P.applyResult(q,b),q);
});
test('[Classic 0.50.1] progression has fourteen historical arenas and the full June 2021 league ladder',()=>{
 const file=path.join(root,'src/progression.js');assert.ok(fs.existsSync(file),'progression module missing');const R=require('./fixtures/classic-v0501/src/progression.js');
 assert.equal(R.ARENAS.length,14);assert.deepEqual(R.ARENAS.slice(-2).map(a=>[a.name,a.trophies]),[["Rascal’s Hideout",4200],['Serenity Peak',4600]]);
 assert.deepEqual(R.LEAGUES.map(l=>l.trophies),[5000,5300,5600,6000,6300,6600,7000,7300,7600,8000]);
 assert.equal(R.arenaForTrophies(2000).id,'royal');assert.equal(R.arenaForTrophies(0).id,'goblin');
});
test('all restored arena decorations resolve to their original source scenes and exported names',()=>{
 const d=JSON.parse(fs.readFileSync(path.join(root,'assets/native/data.json'),'utf8')),game=JSON.parse(fs.readFileSync(path.join(root,'assets/game/data.json'),'utf8'));
 const sourceArenas=game.modernProgression?.arenas||require('../src/progression.js').ARENAS;
 assert.deepEqual(d.arenas.map(a=>a.id),['training',...sourceArenas.map(a=>a.id)]);
 for(const a of d.arenas){assert.ok(d.scenes[a.scene].exports[a.export]!==undefined,a.id);for(const ob of a.objects){assert.ok(d.scenes[ob.scene||a.scene].exports[ob.name]!==undefined,a.id+' '+ob.name);assert.ok(Number.isFinite(ob.x)&&Number.isFinite(ob.y),a.id+' '+ob.name+' position');}}
 if(game.modernProgression)for(const expected of sourceArenas){const a=d.arenas.find(a=>a.id===expected.id);assert.equal(a.sourceLocationSettings.Name,expected.source.PvpLocation,expected.id+' uses the correct source location');}
});
test('Trophy Road unlocks use UnlockArena, not a missing card Arena column',()=>{
 const R=require('../src/progression.js');assert.equal(typeof R.arenaUnlocks,'function');
 const cards=R.arenaUnlocks(C.CARDS,C.DATA.arenas,7);
 assert.ok(cards.length>0);assert.ok(cards.every(c=>c.source.UnlockArena==='Arena7'));
});
test('chest timer labels omit empty units instead of overflowing the classic slot',()=>{
 const R=require('../src/progression.js');assert.equal(R.timeLabel(43200),'12H');assert.equal(R.timeLabel(28800),'8H');assert.equal(R.timeLabel(3600+58*60),'1H 58MIN');
});
