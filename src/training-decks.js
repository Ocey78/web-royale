/* Deterministic, role-complete deck generator for self-play diversity. */
(function(root,factory){const n=typeof module==='object'&&module.exports,K=n?require('./catalog.js'):root.RoyaleCatalog,R=n?require('./progression.js'):root.RoyaleProgression;const api=factory(K,R);if(n)module.exports=api;else root.RoyaleTrainingDecks=api;})(globalThis,function(K,R){'use strict';
const WIN_CONDITIONS=new Set(['hog-rider','royal-hogs','battle-ram','ram-rider','balloon','giant','goblin-giant','golem','elixir-golem','lava-hound','royal-giant','wall-breakers','goblin-barrel','graveyard','miner','x-bow','mortar']);
function rng(seed){let x=(seed>>>0)||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
function build(seed,arenaNumber=14){const random=rng(seed),limit=Math.min(14,Math.max(1,Math.floor(Number(arenaNumber)||14))),cards=K.CARDS.filter(c=>K.DEFAULT_DECK.includes(c.id)||R.cardArenaNumber(c,K.DATA.arenas)<=limit),picked=[];
 const available=filter=>cards.filter(c=>!picked.includes(c.id)&&filter(c));
 const take=filter=>{const pool=available(filter);if(!pool.length)return false;const c=pool[Math.floor(random()*pool.length)];picked.push(c.id);return true;};
 take(c=>WIN_CONDITIONS.has(c.id));
 take(c=>c.kind==='Spell'&&c.cost<=4&&c.id!=='mirror');
 take(c=>c.entity&&K.entityDef(c.entity,9).targetsAir&&!WIN_CONDITIONS.has(c.id));
 take(c=>c.entity&&K.entityDef(c.entity,9).splash>0);
 if(random()<.62)take(c=>c.kind==='Building');
 take(c=>c.cost<=2&&c.id!=='mirror');
 while(picked.length<8){if(!take(c=>c.id!=='mirror'||random()<.08))break;}
 for(const id of K.DEFAULT_DECK)if(picked.length<8&&!picked.includes(id))picked.push(id);
 for(const c of cards)if(picked.length<8&&!picked.includes(c.id))picked.push(c.id);
 let chosen=picked.map(id=>K.CARD_BY_ID[id]);
 let avg=chosen.reduce((n,c)=>n+c.cost,0)/8;
 // Keep self-play from over-sampling unusably heavy meme decks while retaining variety.
 if(avg>5.2){const candidates=available(c=>c.cost<=3&&c.id!=='mirror');while(avg>5.2&&candidates.length){const hi=picked.map((id,i)=>({i,c:K.CARD_BY_ID[id]})).filter(x=>!WIN_CONDITIONS.has(x.c.id)).sort((a,b)=>b.c.cost-a.c.cost)[0];if(!hi)break;const ix=Math.floor(random()*candidates.length),replacement=candidates.splice(ix,1)[0];picked[hi.i]=replacement.id;chosen=picked.map(id=>K.CARD_BY_ID[id]);avg=chosen.reduce((n,c)=>n+c.cost,0)/8;}}
 for(let i=picked.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[picked[i],picked[j]]=[picked[j],picked[i]];}
 return picked;
}
function forMode(seed,arenaNumber,mode){const size=K.modeDeckSize(mode);if(!['OneShot','TwelveCardDeck'].includes(mode))return build(seed,arenaNumber).slice(0,size);const r=rng(seed^0x72be1),pool=K.CARDS.filter(c=>K.allowedInMode(c.id,mode)&&(K.DEFAULT_DECK.includes(c.id)||R.cardArenaNumber(c,K.DATA.arenas)<=arenaNumber)).map(c=>c.id);for(let i=pool.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}const chosen=build(seed,arenaNumber).filter(id=>K.allowedInMode(id,mode));for(const id of pool)if(!chosen.includes(id))chosen.push(id);if(chosen.length<size)throw Error('Not enough eligible cards for '+mode+' at this arena');return chosen.slice(0,size);}
return{WIN_CONDITIONS,build,randomDeck:build,forMode};});
