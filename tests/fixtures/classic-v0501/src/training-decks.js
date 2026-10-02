/* Shared offline deck catalogue for world opponents, battles and self-play. */
(function(root,factory){const n=typeof module==='object'&&module.exports,api=factory(n?require('./catalog.js'):root.RoyaleCatalog,n?require('./progression.js'):root.RoyaleProgression,n?require('./deck-sources.js'):root.RoyaleDeckSources);if(n)module.exports=api;else root.RoyaleTrainingDecks=api;})(globalThis,function(K,R,S){'use strict';
const WIN_CONDITIONS=new Set(['hog-rider','royal-hogs','battle-ram','ram-rider','balloon','giant','goblin-giant','golem','elixir-golem','lava-hound','royal-giant','wall-breakers','goblin-barrel','graveyard','miner','x-bow','mortar','electro-giant']);
const SEEDS=S.SEEDS,FOUNDATIONS=Object.freeze([Object.freeze({id:'starter-giant',name:'Starter Giant Support',archetype:'giant-beatdown',cards:Object.freeze([...K.DEFAULT_DECK]),core:Object.freeze(['giant','musketeer']),sources:Object.freeze([])})]);
const GROUPS={
 smallSpell:['zap','the-log','barbarian-barrel','giant-snowball','arrows','royal-delivery'],
 damageSpell:['fireball','poison','earthquake','lightning','rocket'],
 utility:['tornado','freeze'],
 cycle:['skeletons','goblins','spear-goblins','bats','ice-spirit','electro-spirit','heal-spirit','fire-spirits'],
 tank:['knight','ice-golem','valkyrie','dark-prince','bandit','royal-ghost','mini-pekka','lumberjack'],
 swarm:['skeleton-army','goblin-gang','guards','goblins','spear-goblins','bats','minions','barbarians'],
 air:['archers','musketeer','mega-minion','minions','flying-machine','dart-goblin','princess','hunter','electro-wizard','magic-archer','ice-wizard','baby-dragon','skeleton-dragons'],
 splash:['bomber','valkyrie','dark-prince','bowler','executioner','wizard','baby-dragon'],
 building:['cannon','tesla','tombstone','goblin-cage','bomb-tower','inferno-tower','furnace'],
 support:['night-witch','witch','battle-healer','electro-dragon','baby-dragon','cannon-cart','rascals','inferno-dragon','mega-minion']
};
const ROLE=Object.fromEntries(Object.entries(GROUPS).flatMap(([role,ids])=>ids.map(id=>[id,role])));
for(const id of GROUPS.cycle)ROLE[id]='cycle';for(const id of GROUPS.smallSpell)ROLE[id]='smallSpell';
for(const id of ['knight','ice-golem','bandit','royal-ghost','mini-pekka','lumberjack'])ROLE[id]='tank';
for(const id of ['skeleton-army','goblin-gang','guards','barbarians'])ROLE[id]='swarm';
for(const id of ['archers','musketeer','mega-minion','minions','flying-machine','dart-goblin','princess','hunter','electro-wizard','magic-archer','ice-wizard','skeleton-dragons'])ROLE[id]='air';
const minArena=Object.fromEntries(K.CARDS.map(c=>[c.id,K.DEFAULT_DECK.includes(c.id)?0:R.cardArenaNumber(c,K.DATA.arenas)]));
const air=id=>{const c=K.CARD_BY_ID[id];return !!(c.entity&&K.entityDef(c.entity,9).targetsAir);};
const signature=cards=>[...cards].sort().join(',');
function rng(seed){let x=(seed>>>0)||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};}
function hash(value){let h=2166136261;for(const c of String(value))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
function arenaLimit(value=14){return Math.max(1,Math.min(14,Math.floor(Number(value)||14)));}
function shuffle(cards,random){const out=[...cards];for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
function coherent(cards){if(!K.validDeck(cards)||!cards.some(id=>WIN_CONDITIONS.has(id))||!cards.some(id=>K.CARD_BY_ID[id].kind==='Spell')||!cards.some(air))return false;const average=cards.reduce((n,id)=>n+K.CARD_BY_ID[id].cost,0)/8;return average>=2.1&&average<=5.2;}
let all=null;const arenaPools=new Map();
function makeRecord(seed,cards,sourceType,index){return Object.freeze({id:sourceType==='genuine'?seed.id:seed.id+'-v'+index,seedId:seed.id,name:seed.name,archetype:seed.archetype,sourceType,cards:Object.freeze([...cards]),minArena:Math.max(...cards.map(id=>minArena[id])),sources:seed.sources});}
function catalogue(arenaNumber=14){
 if(!all){
  const seen=new Set(),genuine=[];
  for(const seed of SEEDS){if(!coherent(seed.cards))throw Error('Invalid source deck '+seed.id);const key=signature(seed.cards);if(seen.has(key))continue;seen.add(key);genuine.push(makeRecord(seed,seed.cards,'genuine',0));}
  const families=[...SEEDS,...FOUNDATIONS],variants=families.map(seed=>{
   const result=[],random=rng(hash(seed.id)),mutable=seed.cards.map((id,i)=>({id,i})).filter(x=>!seed.core.includes(x.id)&&ROLE[x.id]);
   const target=seed.sources.length?512:1024;
   for(let attempt=0;attempt<60000&&result.length<target;attempt++){
    const cards=[...seed.cards],slots=shuffle(mutable,random).slice(0,1+Math.floor(random()*3));
    for(const {id,i}of slots){const pool=GROUPS[ROLE[id]];cards[i]=pool[Math.floor(random()*pool.length)];}
    const key=signature(cards);if(seen.has(key)||!coherent(cards))continue;seen.add(key);result.push(makeRecord(seed,cards,'generated',result.length+1));
   }
   return result;
  });
  const entries=[...genuine];
  // Interleave families so adjacent seeds meet different archetypes. Deduplicate
  // before shuffling: different opening-hand orders are not different decks.
  for(let i=0;i<Math.max(...variants.map(v=>v.length));i++)for(const family of variants)if(family[i])entries.push(family[i]);
  all=Object.freeze(entries);
 }
 const limit=arenaLimit(arenaNumber);if(!arenaPools.has(limit))arenaPools.set(limit,Object.freeze(all.filter(row=>row.minArena<=limit)));
 return arenaPools.get(limit);
}
function select(seed,arenaNumber=14){const pool=catalogue(arenaNumber);if(!pool.length)throw Error('No eligible opponent decks');return pool[(Number(seed)>>>0)%pool.length];}
function build(seed,arenaNumber=14){return shuffle(select(seed,arenaNumber).cards,rng((Number(seed)>>>0)^0x51ab12));}
function forMode(seed,arenaNumber=14,mode='Default'){
 const limit=arenaLimit(arenaNumber),size=K.modeDeckSize(mode),random=rng((Number(seed)>>>0)^0x72be1),base=build(seed,limit).filter(id=>K.allowedInMode(id,mode));
 if(size===8&&mode!=='OneShot')return base;
 const chosen=[],take=id=>{if(id&&!chosen.includes(id))chosen.push(id);};
 // Reduced cycles retain pressure, air defense and a spell. One Shot uses only
 // permitted troops/buildings and replenishes the removed spell slots.
 take(base.find(id=>WIN_CONDITIONS.has(id)));take(base.find(air));if(mode!=='OneShot')take(base.find(id=>K.CARD_BY_ID[id].kind==='Spell'));
 const eligible=K.CARDS.filter(c=>minArena[c.id]<=limit&&K.allowedInMode(c.id,mode)&&c.id!=='mirror').map(c=>c.id);
 if(!chosen.some(id=>WIN_CONDITIONS.has(id)))take(eligible.find(id=>WIN_CONDITIONS.has(id)));
 if(!chosen.some(air))take(eligible.find(air));
 if(mode==='OneShot')take(base.find(id=>K.CARD_BY_ID[id].entity&&K.entityDef(K.CARD_BY_ID[id].entity,9).splash>0));
 for(const id of base)if(chosen.length<size)take(id);
 for(const role of ['air','cycle','tank','building','splash'])if(chosen.length<size)take(shuffle(GROUPS[role].filter(id=>eligible.includes(id)&&!chosen.includes(id)),random)[0]);
 for(const id of shuffle(eligible,random))if(chosen.length<size)take(id);
 if(chosen.length<size)throw Error('Not enough eligible cards for '+mode+' at this arena');
 return shuffle(chosen.slice(0,size),random);
}
function stats(arenaNumber=14){const rows=catalogue(arenaNumber),genuine=rows.filter(row=>row.sourceType==='genuine').length;return{total:rows.length,genuine,generated:rows.length-genuine,archetypes:new Set(rows.map(row=>row.archetype)).size};}
return{WIN_CONDITIONS,SEEDS,FOUNDATIONS,catalogue,select,stats,build,randomDeck:build,forMode};
});
