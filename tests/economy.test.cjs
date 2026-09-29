const test=require('node:test'),A=require('node:assert/strict');let E={};try{E=require('../src/economy.js')}catch(_){}const C=require('../src/core.js');
test('local menus expose transactional economy actions',()=>A.equal(typeof E.dailyGift,'function'));
if(E.dailyGift){
 test('daily gift is granted only once per calendar day',()=>{const p=C.normalizeProfile(),q=E.dailyGift(p,'2026-09-23');A.ok(q.ok);A.equal(q.profile.gold,p.gold+250);const again=E.dailyGift(q.profile,'2026-09-23');A.equal(again.ok,false);A.equal(again.profile.gold,q.profile.gold)});
 test('shop never permits negative balances or duplicate daily purchases',()=>{let p=C.normalizeProfile();const q=E.purchaseCard(p,0,'2026-09-23');A.ok(q.ok);A.ok(q.profile.gold>=0);A.equal(E.purchaseCard(q.profile,0,'2026-09-23').ok,false);p.gold=0;A.equal(E.purchaseCard(p,0,'2026-09-23').ok,false)});
 test('chest contents use real catalog IDs and do not re-grant after consumption',()=>{const p=C.normalizeProfile();p.chests=[{id:'test',kind:'silver',unlockAt:1}];const q=E.openChest(p,'test',10);A.ok(q.ok);A.equal(q.profile.chests.length,0);A.ok(q.reward.cards.every(x=>C.CARD_BY_ID[x.id]));A.equal(E.openChest(q.profile,'test',11).ok,false)});
 test('chest wins are respected regardless of wall clock',()=>{const p=C.normalizeProfile();p.chests=[{id:'test',kind:'silver',winsProgress:0}];const q=E.unlockChest(p,'test',10000);A.equal(q.ok,false);A.equal(E.openChest(q.profile,'test',9e12).ok,false)});
 test('pass claim requires earned crowns and cannot repeat',()=>{let p=C.normalizeProfile();A.equal(E.claimPass(p,0).ok,false);p.earnedCrowns=10;const q=E.claimPass(p,0);A.ok(q.ok);A.equal(E.claimPass(q.profile,0).ok,false)});
 test('invalid shop input cannot create card entries or currency',()=>{const p=C.normalizeProfile();for(const id of [-1,99,NaN,'__proto__'])A.equal(E.purchaseCard(p,id,'2026-09-23').ok,false)});
}
