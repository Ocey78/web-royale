'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const U=require('../src/ultimate-clash'),K=require('../src/catalog'),D=require('../src/deck-manager'),P=require('../src/profile');
const additions=[['mortar-battery','Mortar Battery',12],['royale-recall','Royale Recall',4],['goblin-magnet','Goblin Magnet',5],['spirit-festival','Spirit Festival',7],['dark-pact','Dark Pact',4],['battle-kitchen','Battle Kitchen',8],['royale-reinforcements','Royale Reinforcements',12],['elixir-spell','Elixir Spell',2],['dragon-king','Dragon King',18],['bowler-giant','Bowler Giant',11]];
// A missing/newly mispriced definition must fail through each actual deck builder.
test('the ten expansion cards are selectable at their reviewed prices in all three Ultimate builders',()=>{
 for(const mode of ['UltimateClash','UltimateClash2v2','UltimateClash3v3']){
  assert.equal(D.modeState({},mode).eligibleCount,30);
  for(const [slug,name,cost] of additions){const id='ultimate-'+slug,card=K.cardAt(id,11);assert.equal(card.name,name);assert.equal(card.cost,cost);assert.equal(card.source.ManaCost,cost);assert.equal(D.setModeCard(P.normalizeProfile({}),mode,7,id).ok,true,id+' '+mode);assert.equal(D.setModeCard({},'Default',0,id).ok,false);}
 }
 assert.equal(U.CARDS.length,30);assert.equal(K.CARDS.some(c=>additions.some(([slug])=>c.id==='ultimate-'+slug)),false);
});
test('the expansion installs isolated native actors with the required targeting and lifetimes',()=>{
 const original=require('../src/game-data'),data=structuredClone(original),before=JSON.stringify({cards:data.cards,entities:data.entities,projectiles:data.projectiles});U.install(data);
 for(const name of ['UltimateGoblinMagnet','UltimateBattleKitchen','UltimateChef','UltimateDragonKing','UltimateBowlerGiant'])assert.ok(data.entities[name]?.NativeActor,name+' native alias');
 const giant=K.entityDef('UltimateBowlerGiant',11),dragon=K.entityDef('UltimateDragonKing',11),magnet=K.entityDef('UltimateGoblinMagnet',11),kitchen=K.entityDef('UltimateBattleKitchen',11);
 assert.equal(giant.buildingsOnly,true);assert.equal(giant.air,false);assert.equal(giant.source.Scale,original.entities.Bowler.Scale*1.4);assert.equal(dragon.air,true);assert.ok(dragon.hp>K.entityDef('BabyDragon',11).hp);assert.ok(dragon.speed<K.entityDef('BabyDragon',11).speed);assert.ok(magnet.building&&magnet.life>0);assert.ok(kitchen.building&&kitchen.life>0);assert.equal(kitchen.source.DeathSpawnCharacter,'UltimateChef');
 for(const [key,value]of Object.entries(original.entities))assert.deepEqual(data.entities[key],value,key+' unchanged');for(const [key,value]of Object.entries(original.projectiles))assert.deepEqual(data.projectiles[key],value,key+' unchanged');assert.equal(JSON.stringify({cards:original.cards,entities:original.entities,projectiles:original.projectiles}),before);
 assert.equal(data.ultimateForms.length,3,'existing forms only');
});
test('all expansion portraits are unique native compositions with complete manifest provenance',()=>{
 const manifest=require('../assets/ultimate-clash/cards.json'),hashes=new Set();assert.equal(manifest.cards.length,30);
 for(const [slug]of additions){const card=K.CARD_BY_ID['ultimate-'+slug],entry=manifest.cards.find(e=>e.id===card.id);assert.ok(entry,slug+' portrait manifest');assert.ok(card.description.length>60);assert.ok(card.artDescription.length>40);assert.equal(entry.description,card.artDescription);assert.ok(entry.sourceFiles.length>0,slug+' native portrait sources');for(const file of entry.sourceFiles)assert.ok(fs.existsSync(path.join(__dirname,'..',file)),file);const bytes=fs.readFileSync(path.join(__dirname,'..',entry.file));assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(bytes.readUInt32BE(16),474);assert.equal(bytes.readUInt32BE(20),602);const hash=crypto.createHash('sha256').update(bytes).digest('hex');assert.equal(hash,entry.sha256);assert.ok(!hashes.has(hash),slug+' distinct artwork');hashes.add(hash);}
});
