'use strict';
const test=require('node:test');
const A=require('node:assert/strict');
const C=require('../src/core.js');
const P=require('../src/profile.js');
const R=require('../src/progression.js');
const E=require('../src/economy.js');
const L=require('../src/level-model.js');
const X=require('../src/player-xp.js');

function profileAt(trophies, extra={}){
 return P.normalizeProfile({version:7,trophies,highestTrophies:trophies,experience:extra.experience??168770,gold:extra.gold??999999,copies:Object.fromEntries(C.CARDS.map(c=>[c.id,extra.copies??9999])),unlockedCards:extra.unlockedCards??C.CARDS.map(c=>c.id),decks:extra.decks??P.PRESETS,equalLevels:false,...extra});
}
function seeded(seed=1){let n=seed>>>0||1;return()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return(n>>>0)/4294967296;};}

test('v190 uses the build Trophy Road: Master I begins at 6000',()=>{
 A.equal(R.LEAGUES.find(x=>x.name==='Master I').trophies,6000);
 A.equal(L.LEAGUE_RULES[L.MASTER_INDEX].trophies,6000);
});

test('Master I AI decks are all 12/13 with at most four level-12 cards',()=>{
 const cards=C.DEFAULT_DECK.map(id=>C.CARD_BY_ID[id]),rng=seeded(909);
 for(let i=0;i<600;i++){
  const levels=L.deckLevels({arena:14,trophies:6000,cards,rng});
  const n=levels.filter(x=>x.level===12).length;
  A.ok(n>=0&&n<=4,String(n));
  A.ok(levels.every(x=>x.level===12||x.level===13));
 }
});

test('higher ranks progressively squeeze level-12 cards out',()=>{
 const cards=C.DEFAULT_DECK.map(id=>C.CARD_BY_ID[id]);
 const maxima=[['Master I',4],['Master II',3],['Master III',2],['Champion',1],['Grand Champion',1],['Royal Champion',0],['Ultimate Champion',0]];
 for(const [name,max] of maxima){
  const trophies=R.LEAGUES.find(x=>x.name===name).trophies,rng=seeded(trophies);
  for(let i=0;i<250;i++)A.ok(L.deckLevels({arena:14,trophies,cards,rng}).filter(x=>x.level===12).length<=max,name);
 }
});

test('rarity floors and scarcity matter below Master I',()=>{
 const common=C.CARD_BY_ID.knight,legend=C.CARD_BY_ID['mother-witch'];
 A.equal(L.displayedLevel(common,0),1);
 A.equal(L.displayedLevel(legend,0),9);
 A.ok(L.rarityScarcity(legend)>L.rarityScarcity(common));
 A.ok(L.acquisitionDifficulty(legend,14)>L.acquisitionDifficulty(common,14));
});

test('normal Battle no longer mirrors the human card-level map into bots',()=>{
 const p=profileAt(6000,{cardLevels:Object.fromEntries(C.CARDS.map(c=>[c.id,C.baseLevel(c.rarity)]))});
 const b=new C.Battle({profile:p,seed:44,ai:false});
 const enemy=b.initialDecks[1];
 A.ok(enemy.every(id=>[12,13].includes(b.seatLevels[1][id])));
 A.ok(enemy.some(id=>b.seatLevels[1][id]!==p.cardLevels[id]));
 A.notStrictEqual(b.seatLevels[1],b.seatLevels[0]);
});

test('Ultimate Champion AI decks and King Towers are level 13',()=>{
 const trophies=R.LEAGUES.find(x=>x.name==='Ultimate Champion').trophies,p=profileAt(trophies);
 for(let seed=1;seed<20;seed++){
  const b=new C.Battle({profile:p,seed,ai:false});
  A.equal(b.kingLevels[1],13);
  A.ok(b.initialDecks[1].every(id=>b.seatLevels[1][id]===13));
 }
});

test('Master I King Towers remain dynamic 12/13',()=>{
 const rng=seeded(1234),seen=new Set();
 for(let i=0;i<1000;i++)seen.add(L.kingLevel({arena:14,trophies:6000,rng}));
 A.deepEqual([...seen].sort(),[12,13]);
});

test('first eligible card copy unlocks from a generic non-chest grant',()=>{
 const trophies=R.ARENAS[4].trophies;
 const p=P.normalizeProfile({version:7,trophies,highestTrophies:trophies,unlockedCards:[...C.DEFAULT_DECK]});
 A.equal(P.canUseCard(p,'bats'),false);
 E.grant(p,{cards:[{id:'bats',count:1}]});
 A.equal(P.canUseCard(p,'bats'),true);
});

test('legacy eligible non-chest copies migrate into ownership',()=>{
 const trophies=R.ARENAS[4].trophies;
 const p=P.normalizeProfile({version:6,trophies,highestTrophies:trophies,unlockedCards:[...C.DEFAULT_DECK],copies:{bats:3}});
 A.equal(p.unlockedCards.includes('bats'),true);
 A.equal(P.canUseCard(p,'bats'),true);
});

test('Shop can sell and unlock arena-eligible cards that were not previously owned',()=>{
 const trophies=R.ARENAS[4].trophies;
 let base=P.normalizeProfile({version:7,trophies,highestTrophies:trophies,gold:999999,unlockedCards:[...C.DEFAULT_DECK]});
 let found=null;
 for(let d=1;d<=80&&!found;d++){
  const date='2026-10-'+String(d%28+1).padStart(2,'0'),os=E.offers(date,base);
  const index=os.findIndex(o=>!base.unlockedCards.includes(o.id));
  if(index>=0)found={date,index,id:os[index].id};
 }
 A.ok(found,'expected a locked eligible Shop card');
 const bought=E.purchaseCard(base,found.index,found.date);
 A.equal(bought.ok,true);
 A.equal(bought.profile.unlockedCards.includes(found.id),true);
 A.equal(P.canUseCard(bought.profile,found.id),true);
});

test('Trophy Road direct card rewards discover their granted card',()=>{
 const step=R.ROAD_REWARDS.find(s=>s.kind==='cards');
 A.ok(step);
 const p=P.normalizeProfile({version:7,trophies:step.trophies,highestTrophies:step.trophies,unlockedCards:[...C.DEFAULT_DECK]});
 const out=E.claimRoad(p,step.id);
 A.equal(out.ok,true);
 A.ok(out.reward.cards.length>0);
 for(const card of out.reward.cards)A.equal(out.profile.unlockedCards.includes(card.id),true,card.id);
});

test('player XP thresholds drive King Level 1-13',()=>{
 A.equal(X.levelFromTotalXp(0),1);
 A.equal(X.levelFromTotalXp(20),2);
 A.equal(X.levelFromTotalXp(88770),12);
 A.equal(X.levelFromTotalXp(168770),13);
 const p=P.normalizeProfile({version:7,experience:88770});
 A.equal(p.level,12);A.equal(p.kingLevel,12);A.equal(p.xp,0);
});

test('card upgrade awards source rarity UpgradeExp instead of flat battle XP',()=>{
 let p=P.normalizeProfile({version:7,experience:0,gold:999999,copies:{knight:9999},cardLevels:{knight:1},unlockedCards:[...C.DEFAULT_DECK]});
 const r=P.upgrade(p,'knight');
 A.equal(r.ok,true);A.equal(r.xpEarned,C.DATA.rarities.Common.UpgradeExp[0]);
 A.equal(r.profile.experience,4);A.equal(r.profile.level,1);
});

test('donation XP uses the source rarity table, including Legendary 25 XP',()=>{
 let p=P.normalizeProfile({version:7,experience:0});
 let rare=P.grantDonationXp(p,'giant',1);A.equal(rare.xpEarned,C.DATA.rarities.Rare.DonateXP);A.equal(rare.profile.experience,10);
 let legend=P.grantDonationXp(rare.profile,'the-log',1);A.equal(legend.xpEarned,25);A.equal(legend.profile.experience,35);A.equal(legend.profile.level,2);
});

test('fresh profiles start in Collection mode and King Level 1',()=>{
 const p=P.normalizeProfile();A.equal(p.equalLevels,false);A.equal(p.level,1);A.equal(p.experience,0);
});
