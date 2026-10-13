'use strict';
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const K=require('../src/catalog'),R=require('../src/progression'),L=require('../src/level-model'),C=require('../src/core');
const cards=K.DEFAULT_DECK.map(id=>K.CARD_BY_ID[id]);
function averages(arena,trophies){const rng=C.rng(321);let card=0,king=0;for(let i=0;i<600;i++){card+=L.deckLevels({arena,trophies,cards,rng}).reduce((sum,row)=>sum+row.level,0);king+=L.kingLevel({arena,trophies,rng});}return{card:card/(600*cards.length),king:king/600};}
test('modern early and middle arenas do not generate opponents below their source tower gate',()=>{
 for(const [arena,trophies,minimum] of [[8,2300,8],[14,4600,10],[21,8000,12]]){const mean=averages(arena,trophies);a.ok(mean.king>=minimum,`arena ${arena}: King average ${mean.king}, source gate ${minimum}`);a.ok(mean.card>=minimum,`arena ${arena}: card average ${mean.card}`);}
});
test('modern opponents continue developing inside each new arena and reach the current cap at road completion',()=>{
 for(let arena=15;arena<=32;arena++){const start=R.ARENAS[arena-1].trophies,end=R.ARENAS[arena]?.trophies??14000;a.ok(L.expectedKing(arena,end-1)>L.expectedKing(arena,start),`arena ${arena} tower development`);a.ok(L.baseDevelopment(arena,end-1)>L.baseDevelopment(arena,start),`arena ${arena} card development`);}
 const last=averages(32,14000);a.ok(last.king>=15.7&&last.king<=16,`final King average ${last.king}`);a.ok(last.card>=15.4&&last.card<=16,`final card average ${last.card}`);
});
test('the modern level curve increases across all road boundaries and keeps rarity and account variation',()=>{
 let previous=0;for(const row of R.ARENAS){const center=L.expectedKing(row.number,row.trophies);a.ok(center>previous,`arena ${row.number}: ${center} after ${previous}`);previous=center;}
 const common=K.CARD_BY_ID.knight,legendary=K.CARDS.find(c=>c.rarity==='Legendary');a.ok(L.displayedLevel(legendary,0)>L.displayedLevel(common,0));
 const rng=C.rng(90),seen=new Set();for(let i=0;i<100;i++)seen.add(JSON.stringify(L.levelMap({arena:21,trophies:8000,cards,rng})));a.ok(seen.size>10,'opponents retain individual collection differences');
});
test('the current level module preserves the historical fourteen-arena and Master league model',()=>{
 const classicK=require('./fixtures/classic-v0501/src/catalog'),classicR=require('./fixtures/classic-v0501/src/progression'),box={module:{exports:{}},require:id=>id==='./catalog.js'?classicK:classicR};vm.runInNewContext(fs.readFileSync(require.resolve('../src/level-model'),'utf8'),box);const legacy=box.module.exports;
 a.equal(legacy.expectedKing(14,4600),11.4);a.equal(legacy.baseDevelopment(14,4600),.92);
 for(let seed=1;seed<20;seed++){const rng=C.rng(seed),rows=legacy.deckLevels({arena:14,trophies:8000,cards:classicK.DEFAULT_DECK.map(id=>classicK.CARD_BY_ID[id]),rng});a.ok(rows.every(x=>x.level===13));a.equal(legacy.kingLevel({arena:14,trophies:8000,rng}),13);}
});
test('new Trophy Road arena steps select their own surfaces rather than the shared league floor',()=>{
 a.equal(typeof R.roadPlatform,'function');
 for(const [number,want] of [[15,'modern-road-platform-15'],[21,'modern-road-platform-21'],[32,'modern-road-platform-32']])a.equal(R.roadPlatform(R.ARENAS[number-1],0),want);
 a.equal(R.roadPlatform(R.ARENAS[0],2),'classic-platform-27');a.equal(R.roadPlatform(R.ARENAS[1],4),'classic-platform-36');a.equal(R.roadPlatform({number:6,id:'pekka'},0),'classic-platform-44');a.equal(R.roadPlatform({name:'Master I'},0),'classic-platform-106');
});
test('every modern road surface ships a distinct floor crop with native source provenance',()=>{
 const manifest=require('../assets/ui/manifest.json'),hashes=new Set();
 for(let number=15;number<=32;number++){const key=`modern-road-platform-${number}`,entry=manifest[key];a.ok(entry,`${key} must be packaged`);a.equal(entry.sourceVersion,'16.402.2');a.match(entry.source,/^native-floor:/);a.equal(entry.adaptation,'original arena floor crop in retained road platform frame');const file=path.join(__dirname,'..',entry.file);a.ok(fs.existsSync(file));const bytes=fs.readFileSync(file);a.ok(bytes.length>2000,`${key} must contain artwork`);hashes.add(require('node:crypto').createHash('sha256').update(bytes).digest('hex'));}
 a.equal(hashes.size,18,'each added arena has its own surface');
});
