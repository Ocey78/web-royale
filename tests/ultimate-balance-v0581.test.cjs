'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const U=require('../src/ultimate-clash'),K=require('../src/catalog'),F=require('../src/card-forms'),{Battle}=require('../src/battle');
const prices={'mega-minion-horde':14,'lightning-storm':10,'heal-spell':3,'balloon-parade':20,'executioner-cage':16,builder:5,'magic-trio':10,frostbite:10,harvest:3,'overcharged-tesla':6,'three-pekkas':17,'meteor-shower':6,'code-red':14,'royale-escort':20,'kings-dropoff':13,'elite-barbarians':12,'elixir-witch':5,'unstable-egg':3,fisherman:4,'bomb-squad':6,'mortar-battery':12,'royale-recall':4,'goblin-magnet':5,'spirit-festival':7,'dark-pact':4,'battle-kitchen':8,'royale-reinforcements':12,'elixir-spell':2,'dragon-king':18,'bowler-giant':11,mirror:1,'bandit-squad':18,'elixir-pump':15};

test('all Ultimate cards use the reviewed 20-elixir balance schedule in every level and form',()=>{
 assert.equal(U.CARDS.length,Object.keys(prices).length);
 for(const row of U.CARDS){
  const expected=prices[row.slug];assert.equal(row.cost,expected,row.name);assert.ok(Number.isInteger(expected)&&expected>=1&&expected<=20);
  for(const level of [1,9,11,16]){const card=K.cardAt(row.id,level);assert.equal(card.cost,expected,row.id+' displayed cost');assert.equal(card.source.ManaCost,expected,row.id+' source cost');}
 }
 for(const form of K.DATA.ultimateForms){const base=K.cardAt(form.baseCardId,11),resolved=F.defaultRegistry.resolve(base,form.id);assert.equal(form.source.ManaCost,base.cost,form.id+' source');assert.equal(resolved.cost,base.cost,form.id+' resolved');}
 assert.equal(F.defaultRegistry.get('ultimate-frostbite-hero').ability.ManaCost,3,'the requested hero activation price stays separate');
});

test('real deployment and placement forecasts agree at the affordability boundary for all cards and variants',()=>{
 const variants=[...U.CARDS.filter(c=>c.slug!=='mirror').map(c=>({baseCardId:c.id})),...K.DATA.ultimateForms];
 for(const variant of variants){
  const id=variant.baseCardId,deck=[id,...U.CARD_IDS.filter(c=>c!==id)].slice(0,8),b=new Battle({mode:U.MODE,queue:'challenge',ai:false,headless:true,seed:581,deck,enemyDeck:deck,forms:variant.kind?[variant.id]:[],formContext:{casual:true,arena:28}});
  // Affordability is independent of a card's opening-hand restriction.
  const queued=b.queue[0].indexOf(id);if(queued>=0){[b.hand[0][0],b.queue[0][queued]]=[b.queue[0][queued],b.hand[0][0]];[b.handSlots[0][0],b.queueSlots[0][queued]]=[b.queueSlots[0][queued],b.handSlots[0][0]];}
  if(variant.kind==='evolution')b.formState.cycles[0][0]=variant.cycles;
  const card=b.card(0,0),expected=prices[id.slice('ultimate-'.length)];assert.equal(card.id,id);assert.equal(card.cost,expected);if(variant.kind)assert.equal(card.formId,variant.id);
  const x=9*K.SX,y=22*K.SY;if(id==='ultimate-builder')b.spawn('GoblinCage',0,x,y,{wait:0});if(id==='ultimate-royale-recall')b.spawn('Knight',0,x,y,{wait:0});
  b.elixir[0]=expected-.01;const beforeHand=[...b.hand[0]],beforeUnits=b.units.length,preview=b.placementPreview(0,0,x,y);assert.equal(preview.ok,true,id+' valid placement');assert.equal(preview.affordable,false,id+' forecast');
  assert.deepEqual(b.deploy(0,0,x,y),{ok:false,reason:'Not enough elixir'},id+' cannot deploy below cost');assert.deepEqual(b.hand[0],beforeHand);assert.equal(b.units.length,beforeUnits);assert.equal(b.metrics.spent[0],0);
  b.elixir[0]=expected;assert.equal(b.placementPreview(0,0,x,y).affordable,true);assert.equal(b.deploy(0,0,x,y).ok,true,id+' can deploy at exact cost');assert.equal(b.elixir[0],0);assert.equal(b.metrics.spent[0],expected);assert.equal(b.events.find(e=>e.type==='deploy').cost,expected);
 }
});

test('the Ultimate family helper is exact and installing its balance never alters normal cards or forms',()=>{
 assert.deepEqual(U.MODES,['UltimateClash','UltimateClash2v2','UltimateClash3v3']);assert.equal(Object.isFrozen(U.MODES),true);for(const mode of U.MODES)assert.equal(U.isMode(mode),true);for(const mode of ['Default','TeamVsTeam','Team3v3','UltimateClashOther',undefined,null])assert.equal(U.isMode(mode),false);
 const original=require('../src/game-data'),copy=structuredClone(original),beforeCards=JSON.stringify(copy.cards),beforeForms=JSON.stringify(copy.forms);U.install(copy);assert.equal(JSON.stringify(copy.cards),beforeCards);assert.equal(JSON.stringify(copy.forms),beforeForms);
 for(const card of original.cards){assert.equal(K.CARD_BY_ID[card.id].cost,card.cost,card.id);assert.equal(K.CARD_BY_ID[card.id].source.ManaCost,card.source.ManaCost,card.id+' source');}
 assert.ok(copy.ultimateCards.every(c=>c.exclusiveMode===U.MODE));assert.ok(copy.ultimateForms.every(f=>f.exclusiveMode===U.MODE));assert.match(K.CARD_BY_ID['ultimate-bomb-squad'].description,/faintly visible.*Archer Queen.*cannot be targeted.*Guard falls/);
});
