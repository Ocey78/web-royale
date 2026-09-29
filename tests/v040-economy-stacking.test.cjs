'use strict';
const test=require('node:test'),A=require('node:assert/strict');
const C=require('../src/core.js'),E=require('../src/economy.js'),U=require('../src/menu-model.js'),Cos=require('../src/cosmetics.js');
const NOW=Date.UTC(2026,8,28,12),CAP=9999999;
const ranges={Common:[150,500,20],Rare:[50,100,50],Epic:[10,15,100],Legendary:[2,3,200]};
function profile(extra={}){return C.normalizeProfile({version:11,trophies:6000,highestTrophies:6000,gold:1000,gems:10000,...extra});}
function battle(id,winner=0,extra={}){return{id,result:{winner},crowns:winner===0?[1,0]:winner===1?[0,1]:[0,0],time:180,mode:'Default',queueType:'trophy-road',...extra};}

for(const [kind,interval,min,max,base]of [['gold',3,100,300,50],['gems',5,1,10,0]]){
 test(`v040 ${kind} stack on every ranked win, including between milestones`,()=>{
  let p=profile();
  for(let win=1;win<=36;win++){
   const before=p;p=C.applyResult(p,battle('stack-'+kind+'-'+win));
   const bonus=p[kind]-before[kind]-base,tiers=Math.floor(win/interval);
   A.ok(bonus>=tiers*min&&bonus<=tiers*max,`win ${win}: ${bonus} outside ${tiers*min}–${tiers*max}`);
   A.equal(p.history[0][kind==='gold'?'streakGoldBonus':'streakGemBonus'],bonus);
   A.equal(p.history[0][kind==='gold'?'goldEarned':'gemsEarned'],p[kind]-before[kind]);
  }
 });
 test(`v040 ${kind} reroll per match within a tier, not when redrawing or loading`,()=>{
  const p=profile({winStreak:16}),seen=new Set();
  for(let i=0;i<100;i++){
   const b=battle('variation-'+i),q=C.applyResult(p,b),again=C.applyResult(p,b),saved=C.normalizeProfile(JSON.parse(JSON.stringify(q)));
   seen.add(q[kind]-p[kind]);A.equal(q[kind],again[kind]);A.equal(saved[kind],q[kind]);A.deepEqual(saved.history[0],q.history[0]);
   A.deepEqual(C.applyResult(saved,b),saved);
  }
  A.ok(seen.size>10,'rolls should vary for the same tier across games');
 });
}
test('v040 large streak receipts and result metadata survive save/import beyond old single-tier caps',()=>{
 const p=profile({winStreak:59}),b=battle('large-streak'),q=C.applyResult(p,b),saved=C.normalizeProfile(JSON.parse(JSON.stringify(q)));
 A.ok(q.gold-p.gold>=2050);A.ok(q.gems-p.gems>=12);
 A.equal(q.history[0].goldEarned,q.gold-p.gold);A.equal(q.history[0].gemsEarned,q.gems-p.gems);
 A.equal(q.lastStreakGoldBonus,q.gold-p.gold-50);A.equal(q.lastStreakGemBonus,q.gems-p.gems);A.deepEqual(saved,q);
});
test('v040 ranked loss/draw clear tiers; non-ranked battles neither earn tiers nor break them',()=>{
 for(const winner of [1,-1]){
  const p=profile({winStreak:30}),q=C.applyResult(p,battle('broken-'+winner,winner));
  A.equal(q.winStreak,0);A.equal(q.lastStreakGoldBonus,0);A.equal(q.lastStreakGemBonus,0);
  const next=C.applyResult(q,battle('restart-'+winner));A.equal(next.gold-q.gold,50);A.equal(next.gems,q.gems);
 }
 for(const queue of ['challenge','2v2']){
  const p=profile({winStreak:30}),q=C.applyResult(p,battle('party-'+queue,0,{queueType:queue}));
  A.equal(q.winStreak,30);A.equal(q.gold-p.gold,50);A.equal(q.gems,p.gems);
  const next=C.applyResult(q,battle('resume-'+queue));A.ok(next.gold-q.gold>=1050);A.ok(next.gems-q.gems>=6);
 }
});
test('v040 stacked rewards respect wallet caps and the saved result only reports credited currency',()=>{
 const p=profile({winStreak:59,gold:CAP-100,gems:CAP-4}),q=C.applyResult(p,battle('cap-stack'));
 A.equal(q.gold,CAP);A.equal(q.gems,CAP);A.equal(q.history[0].goldEarned,100);A.equal(q.history[0].gemsEarned,4);
 A.equal(q.history[0].streakGoldBonus,50);A.equal(q.history[0].streakGemBonus,4);
});
test('v040 old saves keep their streak without retrospective payout or receipt recomputation',()=>{
 const p=profile({winStreak:18,gold:2345,gems:678,history:[{winner:0,replayId:'old',winStreak:18,streakGoldBonus:212,goldEarned:262,gemsEarned:0,streakGemBonus:0}]}),saved=C.normalizeProfile(JSON.parse(JSON.stringify(p)));
 A.equal(saved.gold,2345);A.equal(saved.gems,678);A.equal(saved.winStreak,18);A.deepEqual(saved.history,p.history);
 const next=C.applyResult(saved,battle('next-after-update'));A.ok(next.gold-saved.gold>=650);A.ok(next.gems-saved.gems>=3);
});

test('v040 every paid emote costs 50 gems and every paid tower style costs 100',()=>{
 A.ok(Cos.emotes.filter(e=>!e.free).length>100);
 for(const e of Cos.emotes.filter(e=>!e.free))A.equal(e.cost,50,e.id);
 for(const s of Cos.towerSkins.filter(s=>!s.free))A.equal(s.cost,100,s.id);
 A.equal(Cos.skin('classic').cost,0);
});
for(const [name,offers,purchase,price]of [['emote',U.rotatingEmotes,U.purchaseEmote,50],['tower skin',U.rotatingTowerSkins,U.purchaseTowerSkin,100]]){
 test(`v040 ${name} purchase charges new price exactly once and preserves ownership`,()=>{
  const o=offers(NOW)[0],p=profile({gems:price}),q=purchase(p,o.id,NOW,U.hourlyKey(NOW));
  A.equal(q.ok,true);A.equal(q.profile.gems,0);A.equal(p.gems,price);
  const saved=C.normalizeProfile(JSON.parse(JSON.stringify(q.profile)));
  A.equal(purchase(saved,o.id,NOW,U.hourlyKey(NOW)).ok,false);
  A.equal(purchase(profile({gems:price-1}),o.id,NOW,U.hourlyKey(NOW)).ok,false);
  A.equal(purchase(profile(),o.id,NOW,U.hourlyKey(NOW)-1).ok,false);
 });
}

test('v040 Gem Shop quantity rolls cover all requested ranges and endpoints at unchanged prices',()=>{
 const seen=Object.fromEntries(Object.keys(ranges).map(r=>[r,new Set()]));
 const base=profile({world:{seed:47123}});
 for(let rotation=0;rotation<2000;rotation++){
  const p=profile({...base,gemShop:{rotation,arenaNumber:14,purchased:[]}}),os=E.gemOffers(p);
  A.equal(os.length,6);A.equal(new Set(os.map(o=>o.id)).size,6);A.deepEqual(E.gemOffers(C.normalizeProfile(JSON.parse(JSON.stringify(p)))),os);
  for(const o of os){const [lo,hi,price]=ranges[o.rarity];A.ok(Number.isInteger(o.quantity)&&o.quantity>=lo&&o.quantity<=hi,JSON.stringify(o));A.equal(o.price,price);seen[o.rarity].add(o.quantity);}
 }
 for(const [r,values]of Object.entries(seen)){A.equal(Math.min(...values),ranges[r][0],r+' lower endpoint');A.equal(Math.max(...values),ranges[r][1],r+' upper endpoint');}
});
test('v040 Gem Shop grants the displayed quantity before refreshing on purchase two; price roll is stable on reload',()=>{
 const p=profile(),os=E.gemOffers(p),cycle=p.gemShop.rotation;
 const one=E.purchaseGemCard(p,0,cycle,os[0].id);A.equal(one.ok,true);A.equal(one.refreshed,false);A.equal(one.profile.copies[os[0].id],p.copies[os[0].id]+os[0].quantity);
 const saved=C.normalizeProfile(JSON.parse(JSON.stringify(one.profile)));A.deepEqual(E.gemOffers(saved),os);
 const two=E.purchaseGemCard(saved,1,cycle,os[1].id);A.equal(two.ok,true);A.equal(two.refreshed,true);A.equal(two.profile.copies[os[1].id],saved.copies[os[1].id]+os[1].quantity);
 A.equal(two.profile.gemShop.rotation,cycle+1);A.deepEqual(two.profile.gemShop.purchased,[]);
 A.equal(two.profile.gems,p.gems-os[0].price-os[1].price);
 A.deepEqual(E.purchaseGemCard(two.profile,2,cycle,os[2].id).profile,two.profile);
});

for(const [kind,price]of [['silver',15],['gold',35],['magic',50],['giant',65],['epic',80],['legendary',100]]){
 test(`v040 ${kind} chest can be bought for ${price} gems with usable loot and without a battle chest slot`,()=>{
  const p=profile({gems:price,chests:Array.from({length:4},(_,i)=>({id:'occupied-'+i,kind:'silver',winsProgress:0}))});
  const r=E.buyChest(p,kind,'buy-'+kind);A.equal(r.ok,true,r.reason);A.equal(r.profile.gems,0);A.equal(p.gems,price);A.deepEqual(r.profile.chests,p.chests);
  A.ok(r.reward.cards.length>0,'chest must not be empty');
  for(const c of r.reward.cards){A.ok(E.cardPool(p).some(x=>x.id===c.id));A.equal(r.profile.copies[c.id]-p.copies[c.id],r.reward.cards.filter(x=>x.id===c.id).reduce((n,x)=>n+x.count,0));A.ok(r.profile.unlockedCards.includes(c.id));}
  const short=profile({gems:price-1});const fail=E.buyChest(short,kind,'unfunded');A.equal(fail.ok,false);A.deepEqual(fail.profile,short);
 });
}
test('v040 Giant chest has its own Common/Rare loot, not the generic Silver fallback',()=>{
 const p=profile(),giant=E.loot('giant','giant-loot',p),silver=E.loot('silver','giant-loot',p);
 A.ok(giant.gold>silver.gold);A.ok(giant.cards.reduce((n,x)=>n+x.count,0)>silver.cards.reduce((n,x)=>n+x.count,0));
 A.deepEqual([...new Set(giant.cards.map(x=>C.CARD_BY_ID[x.id].rarity))].sort(),['Common','Rare']);
 A.deepEqual(E.loot('giant','giant-loot',p),giant);
});
test('v040 Legendary chest cannot charge an early-arena player for an empty reward',()=>{
 const p=C.normalizeProfile({gems:100});const r=E.buyChest(p,'legendary','no-legendaries');
 if(E.cardPool(p).some(c=>c.rarity==='Legendary')){A.equal(r.ok,true);A.equal(r.reward.cards[0].count,1);}else{A.equal(r.ok,false);A.deepEqual(r.profile,p);}
});
test('v040 Epic and Legendary chests grant only their respective rarity',()=>{
 for(const [kind,rarity,count]of [['epic','Epic',20],['legendary','Legendary',1]]){
  const r=E.buyChest(profile(),kind,'rarity-'+kind);A.equal(r.ok,true);A.ok(r.reward.cards.every(c=>C.CARD_BY_ID[c.id].rarity===rarity));A.equal(r.reward.cards.reduce((n,c)=>n+c.count,0),count);
 }
});
test('v040 unknown and prototype chest kinds cannot bypass pricing',()=>{
 for(const kind of ['__proto__','constructor','toString','gem','not-a-chest',undefined]){const p=profile(),r=E.buyChest(p,kind,'invalid');A.equal(r.ok,false);A.deepEqual(r.profile,p);}
});
