'use strict';
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs');
const C=require('../src/core.js'),E=require('../src/economy.js'),D=require('../src/deck-manager.js'),X=require('../src/player-xp.js');
const app=fs.readFileSync(require.resolve('../src/app.js'),'utf8'),html=fs.readFileSync(require.resolve('../src/index.template.html'),'utf8'),css=fs.readFileSync(require.resolve('../src/v470.css'),'utf8'),arena=fs.readFileSync(require.resolve('../src/custom-arena.js'),'utf8');
const NOW=1800000000000;
function profile(level=1){return C.normalizeProfile({trophies:6000,highestTrophies:6000,experience:X.CUMULATIVE[level],unlockedCards:C.CARDS.map(c=>c.id)});}

test('v047 shop scaling helper uses 2.5 percent per king level and clean rarity rounding',()=>{
 a.equal(E.shopQuantityMultiplier({kingLevel:1}),1);
 a.equal(E.shopQuantityMultiplier({kingLevel:13}),1.3);
 a.equal(E.scaleShopQuantity(500,'Common',{kingLevel:13}),650);
 a.equal(E.scaleShopQuantity(150,'Rare',{kingLevel:13}),195);
 a.equal(E.scaleShopQuantity(30,'Epic',{kingLevel:13}),39);
 a.equal(E.scaleShopQuantity(8,'Legendary',{kingLevel:13}),10);
});

test('v047 Daily paid offers use much higher king-scaled card quantities without changing prices',()=>{
 const l1=E.dailyOffers(NOW,profile(1)).slice(3),l13=E.dailyOffers(NOW,profile(13)).slice(3);
 a.equal(l1.length,6);a.equal(l13.length,6);
 const base={Common:500,Rare:150,Epic:30,Legendary:8},price={Common:100,Rare:250,Epic:500,Legendary:1000};
 for(let i=0;i<6;i++){
  a.equal(l1[i].quantity,base[l1[i].rarity]);
  a.equal(l1[i].price,price[l1[i].rarity]);
  a.equal(l13[i].price,l1[i].price);
  a.ok(l13[i].quantity>=l1[i].quantity);
  a.equal(l13[i].reward.cards[0].count,l13[i].quantity);
 }
});

test('v047 timed and gem shops also scale card quantities by king level',()=>{
 const p1=profile(1),p13=profile(13);
 for(const getter of [p=>E.offers(NOW,p),p=>E.lightningOffers(NOW,p)]){
  const a1=getter(p1),a13=getter(p13);a.equal(a1.length,a13.length);
  for(let i=0;i<a1.length;i++){a.equal(a1[i].price,a13[i].price);if(!a1[i].locked)a.ok(a13[i].quantity>=a1[i].quantity);}
 }
 const g1=E.gemOffers(p1),g13=E.gemOffers(p13);a.equal(g1.length,g13.length);
 for(let i=0;i<g1.length;i++){a.equal(g1[i].price,g13[i].price);a.ok(g13[i].quantity>=g1[i].quantity);}
});

test('v047 custom deck editor is a full shared Royale deck screen rather than modal builder',()=>{
 a.match(app,/id='modeDeck'|id="modeDeck"|show\('modeDeck'\)/);
 a.match(html,/royale-deck-screen/);
 a.match(css,/\.royale-deck-screen/);
 a.match(css,/\.royale-surface/);
});

test('v047 each custom environment has distinct structural scenery and floor logic',()=>{
 for(const marker of ['jungleTempleFloor','emberForgeFloor','royalGardenFloor','lavaCausewayFloor','moonKeepFloor','fourBridgesFloor','royalBastionFloor','castleCrownFloor'])a.match(arena,new RegExp('function '+marker));
});
test('v047 displayed shop quantity is part of the purchase receipt and stale king-scaled offers are rejected',()=>{const now=Date.UTC(2026,8,30,12),low=C.normalizeProfile({experience:0,trophies:6000,highestTrophies:6000,gold:999999,gems:999999}),high=C.normalizeProfile({...low,experience:168770});const hour=E.offers(now,low)[0],changed=E.purchaseCard(high,0,now,E.shopWindow(now),hour.id,hour.quantity);a.equal(changed.ok,false);a.equal(changed.profile.gold,high.gold);const current=E.offers(now,high)[0],ok=E.purchaseCard(high,0,now,E.shopWindow(now),current.id,current.quantity);a.equal(ok.ok,true);a.equal(ok.reward.cards[0].count,current.quantity);});
