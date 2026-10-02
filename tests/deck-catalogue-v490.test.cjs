// Historical Classic regression fixture. Modern source assertions are in modern-*-v052 tests.
'use strict';
const test=require('node:test'),A=require('node:assert/strict');
const K=require('./fixtures/classic-v0501/src/catalog'),R=require('./fixtures/classic-v0501/src/progression'),D=require('./fixtures/classic-v0501/src/training-decks');
const signature=cards=>[...cards].sort().join(',');
const hasAir=cards=>cards.some(id=>{const c=K.CARD_BY_ID[id];return c.entity&&K.entityDef(c.entity,9).targetsAir;});
const eligible=(id,arena)=>K.DEFAULT_DECK.includes(id)||R.cardArenaNumber(K.CARD_BY_ID[id],K.DATA.arenas)<=arena;

test('[Classic 0.50.1] the opponent catalogue exposes thousands of unique coherent decks and genuine source seeds',()=>{
 A.equal(typeof D.catalogue,'function','opponents need an inspectable shared deck catalogue');
 const pool=D.catalogue(),seen=new Set();
 A.ok(pool.length>=10000,`only ${pool.length} decks`);
 A.ok(pool.filter(d=>d.sourceType==='genuine').length>=20);
 for(const row of pool){
  A.equal(row.cards.length,8);A.equal(new Set(row.cards).size,8);
  A.ok(row.cards.every(id=>K.CARD_BY_ID[id]));
  const key=signature(row.cards);A.ok(!seen.has(key),`duplicate ${row.id}`);seen.add(key);
  A.ok(row.cards.some(id=>D.WIN_CONDITIONS.has(id)),`${row.id} needs a win condition`);
  A.ok(row.cards.some(id=>K.CARD_BY_ID[id].kind==='Spell'),`${row.id} needs a spell`);
  A.ok(hasAir(row.cards),`${row.id} needs air defense`);
  const avg=row.cards.reduce((n,id)=>n+K.CARD_BY_ID[id].cost,0)/8;A.ok(avg>=2.1&&avg<=5.2);
  if(row.sourceType==='genuine')A.ok(row.sources.some(s=>/^https:\/\/(statsroyale.com|royaleapi.com)\//.test(s.url)));
  else{
   const base=D.SEEDS.find(s=>s.id===row.seedId)||D.FOUNDATIONS.find(s=>s.id===row.seedId);
   A.ok(base,`missing source family ${row.seedId}`);
   A.ok(base.core.every(id=>row.cards.includes(id)),`${row.id} lost its archetype core`);
   A.ok(base.cards.filter(id=>!row.cards.includes(id)).length<=3,`${row.id} changed too many roles`);
  }
 }
 const hog=pool.find(row=>row.id==='hog-26');
 A.deepEqual([...hog.cards].sort(),['hog-rider','musketeer','cannon','ice-golem','skeletons','ice-spirit','fireball','the-log'].sort());
 A.ok(hog.sources.some(s=>s.provider==='StatsRoyale'));A.ok(hog.sources.some(s=>s.provider==='RoyaleAPI'));
});

test('[Classic 0.50.1] battle deck selection reaches the entire catalogue and is reproducible without mutable shared cards',()=>{
 A.equal(typeof D.catalogue,'function');const pool=D.catalogue(),picked=new Set();
 for(let seed=0;seed<pool.length;seed++)picked.add(signature(D.build(seed,14)));
 A.equal(picked.size,pool.length,'some catalogue entries cannot be selected by opponents');
 const before=D.build(12345,14);A.deepEqual(D.build(12345,14),before);
 before[0]='mirror';A.notEqual(D.build(12345,14)[0],'mirror');
 A.ok(Object.isFrozen(pool));A.ok(Object.isFrozen(pool[0].cards));
});

test('[Classic 0.50.1] a fresh browser worker builds the same offline catalogue without a Node dependency loader',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
 const worker={RoyaleCatalog:K,RoyaleProgression:R};vm.createContext(worker);
 for(const file of ['deck-sources','training-decks'])vm.runInContext(fs.readFileSync(path.join(__dirname,'./fixtures/classic-v0501/src/'+file+'.js'),'utf8'),worker);
 const fresh=worker.RoyaleTrainingDecks;
 A.deepEqual(Array.from(fresh.catalogue(),row=>signature(row.cards)),D.catalogue().map(row=>signature(row.cards)));
 for(const seed of [0,1,7919,40000,4294967295])A.deepEqual(Array.from(fresh.forMode(seed,8,'OneShot')),D.forMode(seed,8,'OneShot'));
});

test('[Classic 0.50.1] arena and special-mode deck generation keeps unlocks, coverage and mode restrictions',()=>{
 for(let arena=1;arena<=14;arena++)for(const mode of ['Default','FourCardDeck','SixCardDeck','TwelveCardDeck','OneShot'])for(let seed=1;seed<=32;seed++){
  const cards=D.forMode(seed*7919,arena,mode);A.equal(cards.length,K.modeDeckSize(mode));
  A.equal(new Set(cards).size,cards.length);
  A.ok(cards.every(id=>eligible(id,arena)),`${mode} arena ${arena} has locked cards`);
  A.ok(cards.every(id=>K.allowedInMode(id,mode)),`${mode} has prohibited cards`);
  A.ok(cards.some(id=>D.WIN_CONDITIONS.has(id)),`${mode} needs a win condition`);
  A.ok(hasAir(cards),`${mode} needs air defense`);
  if(mode!=='OneShot')A.ok(cards.some(id=>K.CARD_BY_ID[id].kind==='Spell'));
  A.deepEqual(D.forMode(seed*7919,arena,mode),cards);
 }
});

test('[Classic 0.50.1] real battle and self-play factories consume catalogue decks',()=>{
 A.equal(typeof D.catalogue,'function');const C=require('./fixtures/classic-v0501/src/core'),M=require('./fixtures/classic-v0501/src/training-modes'),W=require('./fixtures/classic-v0501/src/world');
 const all=new Set(D.catalogue().map(row=>signature(row.cards)));
 for(const seed of [10,234,9123]){
  const battle=new C.Battle({seed,ai:false,arenaNumber:14});A.ok(all.has(signature(battle.initialDecks[1])));
  const training=M.create('TeamVsTeam',{seed,ai:false});for(const deck of training.initialDecks)A.ok(all.has(signature(deck)));
 }
 const profile=C.normalizeProfile({trophies:7000});const player=W.player(profile,'p0250799',0);
 A.ok(player);A.ok(all.has(signature(player.deck)));
});
