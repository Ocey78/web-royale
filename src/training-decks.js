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
// Modern source roster contributes role-compatible variations to the verified deck families.
for(const c of K.CARDS){if(Object.values(GROUPS).some(ids=>ids.includes(c.id)))continue;const r=K.DATA.entities[c.entity]||{},role=c.kind==='Spell'?(c.cost<=3?'smallSpell':'damageSpell'):c.kind==='Building'?'building':r.AttacksAir?'air':r.AreaDamageRadius?'splash':c.cost<=2?'cycle':c.cost<=4?'tank':'support';GROUPS[role].push(c.id);if(r.TargetOnlyBuildings&&r.Speed>0)WIN_CONDITIONS.add(c.id);}
const playable=id=>{const a=typeof module==='object'&&module.exports?require('./modern-actions.js'):globalThis.RoyaleModernActions;return !a||a.canDeployCard(null,K.CARD_BY_ID[id]).ok;};
const championLimit=cards=>cards.filter(id=>K.CARD_BY_ID[id].rarity==='Champion').length<=2;
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
function arenaLimit(value=R.ARENAS.length){return Math.max(1,Math.min(R.ARENAS.length,Math.floor(Number(value)||R.ARENAS.length)));}
function shuffle(cards,random){const out=[...cards];for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
function coherent(cards){if(!K.validDeck(cards)||!championLimit(cards)||!cards.some(id=>WIN_CONDITIONS.has(id))||!cards.some(id=>K.CARD_BY_ID[id].kind==='Spell')||!cards.some(air))return false;const average=cards.reduce((n,id)=>n+K.CARD_BY_ID[id].cost,0)/8;return average>=2.1&&average<=5.2;}
function packageSeeds(){const grouped=new Map(),byName=new Map(K.CARDS.map(c=>[c.source.Name,c.id]));for(const row of K.DATA.sourcePredefinedDeckRows||[]){if(!grouped.has(row.Name))grouped.set(row.Name,[]);grouped.get(row.Name).push(row);}const out=[];for(const [name,rows]of grouped){if(rows.length!==8||rows.some(r=>!r.Spells||r.RandomSpellSets))continue;const cards=rows.map(r=>byName.get(r.Spells));if(cards.some(id=>!id)||!coherent(cards))continue;out.push({id:'package-'+name,name,archetype:'source-predefined',cards,core:[],sources:Object.freeze([Object.freeze({provider:'SuppliedClashRoyaleXAPK',snapshot:K.DATA.snapshot,deck:name,source:'predefined_decks',note:'Original fixed base-card lineup from the supplied package; random-set deck templates are excluded.'})])});}return out;}
let all=null;const arenaPools=new Map();
function makeRecord(seed,cards,sourceType,index){return Object.freeze({id:sourceType==='genuine'?seed.id:seed.id+'-v'+index,seedId:seed.id,name:seed.name,archetype:seed.archetype,sourceType,cards:Object.freeze([...cards]),minArena:Math.max(...cards.map(id=>minArena[id])),sources:seed.sources});}
function catalogue(arenaNumber=R.ARENAS.length){
 if(!all){
  const seen=new Set(),genuine=[];
  for(const seed of [...packageSeeds(),...SEEDS]){if(!coherent(seed.cards))throw Error('Invalid source deck '+seed.id);const key=signature(seed.cards);if(seen.has(key))continue;seen.add(key);genuine.push(makeRecord(seed,seed.cards,'genuine',0));}
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
 const limit=arenaLimit(arenaNumber);if(!arenaPools.has(limit))arenaPools.set(limit,Object.freeze(all.filter(row=>row.minArena<=limit&&row.cards.every(playable)&&row.cards.filter(id=>K.CARD_BY_ID[id].rarity==='Champion').length<=(limit>=10?2:limit>=5?1:0))));
 return arenaPools.get(limit);
}
function select(seed,arenaNumber=R.ARENAS.length){const pool=catalogue(arenaNumber);if(!pool.length)throw Error('No eligible opponent decks');return pool[(Number(seed)>>>0)%pool.length];}
function build(seed,arenaNumber=R.ARENAS.length){return shuffle(select(seed,arenaNumber).cards,rng((Number(seed)>>>0)^0x51ab12));}
function forMode(seed,arenaNumber=R.ARENAS.length,mode='Default'){
 const limit=arenaLimit(arenaNumber),size=K.modeDeckSize(mode),random=rng((Number(seed)>>>0)^0x72be1),base=build(seed,limit).filter(id=>K.allowedInMode(id,mode));
 if(size===8&&mode!=='OneShot')return base;
 const chosen=[],take=id=>{if(id&&!chosen.includes(id)&&(K.CARD_BY_ID[id].rarity!=='Champion'||chosen.filter(x=>K.CARD_BY_ID[x].rarity==='Champion').length<(limit>=10?2:limit>=5?1:0)))chosen.push(id);};
 // Reduced cycles retain pressure, air defense and a spell. One Shot uses only
 // permitted troops/buildings and replenishes the removed spell slots.
 take(base.find(id=>WIN_CONDITIONS.has(id)));take(base.find(air));if(mode!=='OneShot')take(base.find(id=>K.CARD_BY_ID[id].kind==='Spell'));
 const eligible=K.CARDS.filter(c=>minArena[c.id]<=limit&&playable(c.id)&&K.allowedInMode(c.id,mode)&&c.id!=='mirror').map(c=>c.id);
 if(!chosen.some(id=>WIN_CONDITIONS.has(id)))take(eligible.find(id=>WIN_CONDITIONS.has(id)));
 if(!chosen.some(air))take(eligible.find(air));
 if(mode==='OneShot')take(base.find(id=>K.CARD_BY_ID[id].entity&&K.entityDef(K.CARD_BY_ID[id].entity,9).splash>0));
 for(const id of base)if(chosen.length<size)take(id);
 for(const role of ['air','cycle','tank','building','splash'])if(chosen.length<size)take(shuffle(GROUPS[role].filter(id=>eligible.includes(id)&&!chosen.includes(id)),random)[0]);
 for(const id of shuffle(eligible,random))if(chosen.length<size)take(id);
 if(chosen.length<size)throw Error('Not enough eligible cards for '+mode+' at this arena');
 return shuffle(chosen.slice(0,size),random);
}
function formsForDeck(deck,{arena=R.ARENAS.length,casual=false,seed=1}={}){const api=typeof module==='object'&&module.exports?require('./card-forms.js'):globalThis.RoyaleCardForms,actions=typeof module==='object'&&module.exports?require('./modern-actions.js'):globalThis.RoyaleModernActions,registry=api?.defaultRegistry;if(!registry)return[];let selected=registry.selections(deck,[]);const random=rng(seed);for(const i of shuffle(deck.map((_,i)=>i),random)){const pool=shuffle(registry.forCard(deck[i]).filter(f=>f.kind!=='champion'&&actions?.canDeployCard(null,{source:f.source,form:f}).ok),random);for(const f of pool){const candidate=[...selected];candidate[i]=f.id;const q=registry.qualify(deck,candidate,{arena,casual});if(q.ok){selected=q.forms;break;}}}return selected;}
function stats(arenaNumber=R.ARENAS.length){const rows=catalogue(arenaNumber),genuine=rows.filter(row=>row.sourceType==='genuine').length;return{total:rows.length,genuine,generated:rows.length-genuine,archetypes:new Set(rows.map(row=>row.archetype)).size};}
return{formsForDeck,WIN_CONDITIONS,SEEDS,FOUNDATIONS,catalogue,select,stats,build,randomDeck:build,forMode};
});
