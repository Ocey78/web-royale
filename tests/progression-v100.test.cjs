// Historical Classic regression fixture. Modern source assertions are in modern-*-v052 tests.
'use strict';
const test=require('node:test'),a=require('node:assert/strict');
const C=require('./fixtures/classic-v0501/src/core.js'),R=require('./fixtures/classic-v0501/src/progression.js'),E=require('./fixtures/classic-v0501/src/economy.js');
const fresh=(extra={})=>C.normalizeProfile({trophies:600,...extra});
const legal=(id,arena)=>C.DEFAULT_DECK.includes(id)||R.cardArenaNumber(C.CARD_BY_ID[id],C.DATA.arenas)<=arena;
test('[Classic 0.50.1] current arena is derived from trophies and ignores saved manual arena selections',()=>{
 for(const [trophies,id] of [[0,'goblin'],[299,'goblin'],[300,'bone'],[600,'barbarian'],[4599,'rascals'],[4600,'serenity'],[92230,'serenity']])
  a.equal(C.normalizeProfile({trophies,arena:'royal'}).arena,id);
});
test('[Classic 0.50.1] normalization preserves reached trophies but not a fake selected arena unlock',()=>{
 const p=fresh({highestTrophies:2000,arena:'serenity'});a.equal(p.highestTrophies,2000);a.equal(p.arena,'barbarian');
 a.equal(R.cardArenaNumber(C.CARD_BY_ID.pekka,C.DATA.arenas),4);
 a.equal(R.cardArenaNumber(C.CARD_BY_ID.knight,C.DATA.arenas),0);
});
test('[Classic 0.50.1] chest awards keep the arena in which they were earned',()=>{
 const p=fresh({trophies:280,wins:0});const b=new C.Battle({profile:p,ai:false});b.result={winner:0};b.crowns=[1,0];
 const q=C.applyResult(p,b);a.equal(q.arena,'bone');a.equal(q.highestTrophies,310);a.equal(q.chests[0].arenaNumber,1);
});
test('[Classic 0.50.1] defeats cannot cross the current arena trophy gate',()=>{
 const p=fresh({trophies:610});const b=new C.Battle({profile:p,ai:false});b.result={winner:1};b.crowns=[0,1];
 const q=C.applyResult(p,b);a.equal(q.trophies,600);a.equal(q.arena,'barbarian');
});
test('[Classic 0.50.1] every chest reward path is restricted to reached arenas',()=>{
 for(let arena=1;arena<=14;arena++)for(let seed=0;seed<50;seed++){
  const p=fresh({trophies:R.ARENAS[arena-1].trophies,gems:9999});
  for(const kind of ['silver','gold','magic']){const r=E.buyChest(p,kind,seed);a.ok(r.ok);a.ok(r.reward.cards.length>0);for(const c of r.reward.cards)a.ok(legal(c.id,arena),`${arena} ${kind} ${c.id}`);}
 }
});
test('[Classic 0.50.1] old chests expand to the highest arena reached before they are opened',()=>{
 const p=fresh({trophies:4600,highestTrophies:4600,chests:[{id:'old',kind:'magic',arenaNumber:1,unlockAt:1}]});
 const r=E.openChest(p,'old',2);a.ok(r.ok);for(const c of r.reward.cards)a.ok(legal(c.id,14));a.equal(r.reward.arenaNumber,14);
});
test('[Classic 0.50.1] free and crown chests use the allowed pool rather than the first deck card',()=>{
 for(const crown of [false,true]){const p=fresh({trophies:0,earnedCrowns:10,freeChestAt:0,crownChestAt:0});p.decks[0][0]='pekka';
  const r=E.classicChest(p,crown,1000);a.ok(r.ok);a.equal(r.reward.gold,crown?350:50);a.ok(r.reward.cards.every(x=>legal(x.id,1)));a.equal(E.classicChest(r.profile,crown,1001).ok,false);}
});
test('[Classic 0.50.1] road provides uniquely identified claimable reward steps between arena gates and into leagues',()=>{
 a.ok(R.ROAD_REWARDS.length>90);a.equal(new Set(R.ROAD_REWARDS.map(r=>r.id)).size,R.ROAD_REWARDS.length);
 a.equal(R.ROAD_REWARDS.find(r=>r.trophies===200).amount,200);
 for(const r of R.ROAD_REWARDS){a.ok(Number.isInteger(r.trophies));a.ok(r.trophies>0&&r.trophies<=8000);a.ok(r.kind);}
 for(const arena of R.ARENAS){const top=R.ARENAS[arena.number]?.trophies||5000;a.ok(R.ROAD_REWARDS.some(r=>r.trophies>arena.trophies&&r.trophies<top),arena.id);}
});
test('[Classic 0.50.1] road currency claims are atomic, persistent and cannot be claimed twice',()=>{
 const s=R.ROAD_REWARDS.find(r=>r.trophies===200),p=fresh({trophies:200});const old=JSON.stringify(p),r=E.claimRoad(p,s.id);
 a.ok(r.ok);a.equal(r.profile.gold,p.gold+200);a.equal(JSON.stringify(p),old);a.ok(r.profile.roadClaimed.includes(s.id));
 const persisted=C.normalizeProfile(JSON.parse(JSON.stringify(r.profile)));a.equal(E.claimRoad(persisted,s.id).ok,false);
});
test('[Classic 0.50.1] locked and forged road claims cannot mutate inventory',()=>{
 const p=fresh({trophies:0}),gold=p.gold;
 for(const id of ['bad','__proto__',R.ROAD_REWARDS[0].id]){const r=E.claimRoad(p,id);a.equal(r.ok,false);a.equal(r.profile.gold,gold);a.deepEqual(r.profile.copies,p.copies);}
});
test('[Classic 0.50.1] choice rewards require an offered card and grant only one choice',()=>{
 const s=R.ROAD_REWARDS.find(r=>r.kind==='choice'),p=fresh({trophies:s?.trophies||50});
 a.equal(E.claimRoad(p,s.id,'pekka').ok,false);const id=s.cards[0],r=E.claimRoad(p,s.id,id);a.ok(r.ok);a.equal(r.profile.copies[id],p.copies[id]+s.amount);a.equal(E.claimRoad(r.profile,s.id,s.cards[1]).ok,false);
});
test('[Classic 0.50.1] wildcard rewards are stored and can be applied only to eligible matching cards',()=>{
 const s=R.ROAD_REWARDS.find(r=>r.kind==='wildcards'),p=fresh({trophies:s?.trophies||1050});const r=E.claimRoad(p,s.id);a.ok(r.ok);
 a.equal(r.profile.wildcards[s.rarity],s.amount);const c=C.CARDS.find(c=>c.rarity===s.rarity&&R.cardArenaNumber(c,C.DATA.arenas)<=1);
 const used=E.useWildcards(r.profile,c.id,1);a.ok(used.ok);a.equal(used.profile.copies[c.id],p.copies[c.id]+1);a.equal(used.profile.wildcards[s.rarity],s.amount-1);
});
test('[Classic 0.50.1] all road rewards resolve without future-arena chest leaks',()=>{
 for(const s of R.ROAD_REWARDS){let p=fresh({trophies:s.trophies});const choices=s.kind==='choice'?s.cards:[undefined];for(const choice of choices){const r=E.claimRoad(p,s.id,choice);a.ok(r.ok,JSON.stringify({s,reason:r.reason}));for(const c of r.reward.cards||[])a.ok(legal(c.id,R.arenaForTrophies(s.trophies).number));}}
});

test('[Classic 0.50.1] road emotes resolve both source IndexHi and IndexLo and survive saving',()=>{
 const targets={2200:'Emote58',4000:'Emote71'};
 for(const [trophies,expected] of Object.entries(targets)){
  const step=R.ROAD_REWARDS.find(r=>r.trophies===Number(trophies));a.equal(step.emote,expected);
  const result=E.claimRoad(C.normalizeProfile({trophies:8000}),step.id);a.equal(result.ok,true);a.ok(C.normalizeProfile(result.profile).ownedEmotes.includes(expected));
 }
});

test('[Classic 0.50.1] a road Legendary Kings Chest includes an eligible legendary rather than only magical-chest cards',()=>{
 const p=fresh({trophies:8000}),s=R.ROAD_REWARDS.find(r=>r.chest==='Shop_Large_Legendary_Arena_L1');
 const result=E.claimRoad(p,s.id);a.equal(result.ok,true);a.ok(result.reward.cards.some(x=>C.CARD_BY_ID[x.id].rarity==='Legendary'&&x.count>=1));
});
