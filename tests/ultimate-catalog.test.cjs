const test=require('node:test'),assert=require('node:assert/strict');
const K=require('../src/catalog.js'),P=require('../src/profile.js'),D=require('../src/deck-manager.js'),T=require('../src/training-decks.js'),F=require('../src/card-forms.js'),S=require('../src/shop-model.js'),E=require('../src/economy.js');
const fs=require('node:fs'),path=require('node:path');

test('Ultimate Clash cards are selectable only in their own deck builder',()=>{
 const state=D.modeState({},'UltimateClash');
 assert.ok(state,'Ultimate Clash has its own saved deck library');
 assert.equal(state.eligibleCount,K.ULTIMATE_CARDS.length);assert.equal(state.valid,true);
 assert.equal(K.CARD_BY_ID['ultimate-code-red'].cost,18);
 assert.equal(K.CARD_BY_ID['ultimate-builder'].kind,'Spell');
 assert.ok(state.eligible.every(id=>id.startsWith('ultimate-')));
 assert.equal(D.setModeCard({},'UltimateClash',0,'knight').ok,false);
 assert.equal(D.setModeCard({},'Default',0,'ultimate-code-red').ok,false);
 assert.equal(D.setCard({unlockedCards:['ultimate-code-red']},0,'ultimate-code-red').ok,false);
 assert.ok(!K.CARDS.some(c=>c.id.startsWith('ultimate-')));
 assert.ok(!E.cardPool(P.normalizeProfile({highestTrophies:12000})).some(c=>c.id.startsWith('ultimate-')));
});

test('Ultimate Clash decks survive save reload independently and sanitize foreign cards',()=>{
 let p=P.normalizeProfile({});assert.ok(p.ultimateClashDeck,'mode deck initialized');
 const ranked=JSON.stringify(p.decks),normal=JSON.stringify(p.challengeDeck);
 let r=D.setModeCard(p,'UltimateClash',7,'ultimate-code-red');assert.equal(r.ok,true);p=r.profile;
 r=D.modeAdd(p,'UltimateClash');assert.equal(r.ok,true);p=r.profile;
 p=P.normalizeProfile(JSON.parse(JSON.stringify(p)));assert.equal(p.modeDeckSets.UltimateClash.decks.length,2);assert.equal(p.ultimateClashDeck[7],'ultimate-code-red');
 assert.equal(JSON.stringify(p.decks),ranked);assert.equal(JSON.stringify(p.challengeDeck),normal);
 const contaminated=P.normalizeProfile({...p,unlockedCards:[...p.unlockedCards,'ultimate-code-red'],decks:[p.ultimateClashDeck],challengeDeck:p.ultimateClashDeck,ultimateClashDeck:['knight',...p.ultimateClashDeck.slice(1)]});
 assert.ok(contaminated.ultimateClashDeck.every(id=>id.startsWith('ultimate-')));
 assert.ok(contaminated.decks.flat().every(id=>!id.startsWith('ultimate-')));
 assert.ok(contaminated.challengeDeck.every(id=>!id.startsWith('ultimate-')));
 assert.ok(!contaminated.unlockedCards.includes('ultimate-code-red'));
});

test('Ultimate Clash opponents use a reproducible all-custom pool at every arena',()=>{
 for(const arena of [1,10,27])for(const seed of [1,12,345]){
  const deck=T.forMode(seed,arena,'UltimateClash');assert.equal(deck.length,8);assert.equal(new Set(deck).size,8);
  assert.ok(deck.every(id=>id.startsWith('ultimate-')));assert.ok(deck.some(id=>K.CARD_BY_ID[id].kind==='Troop'));assert.ok(deck.some(id=>K.CARD_BY_ID[id].kind==='Spell'));
  assert.deepEqual(T.forMode(seed,arena,'UltimateClash'),deck);
 }
});

test('Ultimate Clash forms are free mode choices and do not appear in normal shops',()=>{
 const p=P.normalizeProfile({}),deck=['ultimate-royale-escort','ultimate-mega-minion-horde','ultimate-frostbite','ultimate-builder','ultimate-harvest','ultimate-magic-trio','ultimate-bomb-squad','ultimate-heal-spell'];
 const ids=['ultimate-royale-escort-evolution','ultimate-mega-minion-horde-hero','ultimate-frostbite-hero'];
 for(const id of ids)assert.ok(F.defaultRegistry.get(id),'custom form registered: '+id);
 assert.equal(F.defaultRegistry.qualify(deck,ids,{casual:true,positionalSlots:true,unlockedForms:p.unlockedForms}).ok,true);
 assert.equal(F.defaultRegistry.get(ids[0]).cycles,1);assert.equal(F.defaultRegistry.get(ids[2]).ability.ManaCost,3);
 assert.ok(S.offers(p,{now:1800000000000}).every(o=>!o.targetId.startsWith('ultimate-')));
});

test('every Ultimate Clash card has a readable standalone portrait and a mechanic description',()=>{
 assert.ok(K.ULTIMATE_CARDS?.length);
 for(const card of K.ULTIMATE_CARDS){
  assert.ok(card.description.length>60,card.id+' mechanics');assert.ok(card.artDescription.length>40,card.id+' artwork description');
  const file=path.join(__dirname,'../assets/ultimate-clash/cards',card.id+'.png');assert.ok(fs.existsSync(file),card.id+' portrait');
  const bytes=fs.readFileSync(file);assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.ok(bytes.readUInt32BE(16)>=237);assert.ok(bytes.readUInt32BE(20)>=301);
 }
});
