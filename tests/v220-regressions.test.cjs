'use strict';
const test=require('node:test'),A=require('node:assert/strict');
const V=require('../src/battle-view.js'),C=require('../src/core.js'),U=require('../src/menu-model.js');
const retired=['lava-fortress','royal-blue','bone-crypt','jungle-ruins','electro-station','frozen-keep'];
test('v250 reference replaces the earlier fixed menu-aspect camera',()=>{A.ok(Math.abs(V.camera.scale-1.1418504387711865)<1e-9);A.ok(Math.abs(V.toScreen({x:240,y:320}).y-536.0817563389831)<1e-6);});
test('v220 both camera directions round-trip tile centres and every board edge',()=>{
 for(const x of [0,13.333,120,240,466.667,480])for(const y of [0,10,200,320,570,640]){
  const p=V.toWorld(V.toScreen({x,y}));A.ok(Math.abs(p.x-x)<1e-9);A.ok(Math.abs(p.y-y)<1e-9);
 }
 for(const p of [{x:4,y:0},{x:476,y:640},{x:4,y:640},{x:476,y:0}])A.equal(V.onBoard(V.toScreen(p)),true);
 for(const p of [{x:0,y:0},{x:480,y:640}])A.equal(V.onBoard(V.toScreen(p)),false,'cropped field slivers are outside the interactive viewport');
 for(const p of [{x:-1,y:320},{x:481,y:320},{x:240,y:-1},{x:240,y:641}])A.equal(V.onBoard(V.toScreen(p)),false);
});
test('v220 arena world clip maps exactly to the unchanged HUD-safe viewport',()=>{
 const {worldClip:w,viewport:p}=V;
 const a=V.toScreen(w),z=V.toScreen({x:w.x+w.width,y:w.y+w.height});
 A.ok(Math.abs(a.x-p.x)<1e-9&&Math.abs(a.y-p.y)<1e-9);
 A.ok(Math.abs(z.x-(p.x+p.width))<1e-9&&Math.abs(z.y-(p.y+p.height))<1e-9);
});
test('v220 imitation skins cannot be bought, equipped, or offered as actual skins',()=>{
 let p=C.normalizeProfile({...C.normalizeProfile(),gems:9000});
 for(const id of retired){A.equal(U.purchaseTowerSkin(p,id).ok,false);A.equal(U.selectTowerSkin(p,id).ok,false);}
 A.ok(U.towerSkins.every(s=>!retired.includes(s.id)));
 for(const t of [0,1,3600000,3600001,8e12])A.ok(U.rotatingTowerSkins(t).every(s=>!retired.includes(s.id)&&s.sourceKind.startsWith('original')));
 A.equal(p.gems,9000);
});
test('v220 retired recolor ownership is refunded once, deduplicated and preserved as a receipt',()=>{
 const raw={...C.normalizeProfile(),gems:50,ownedTowerSkins:['classic','frozen-keep','frozen-keep','royal-blue','invalid'],selectedTowerSkin:'frozen-keep'};
 const p=C.normalizeProfile(raw);A.equal(p.gems,1550);A.equal(raw.gems,50);
 A.deepEqual(p.ownedTowerSkins,['classic']);A.equal(p.selectedTowerSkin,'classic');
 A.deepEqual([...p.retiredTowerSkinRefunds].sort(),['frozen-keep','royal-blue']);
 A.deepEqual(C.normalizeProfile(JSON.parse(JSON.stringify(p))),p);
 const again=C.normalizeProfile({...p,ownedTowerSkins:['classic','frozen-keep','royal-blue']});A.equal(again.gems,1550);
});
test('v220 refund overflow is saved as credit instead of vanishing at the gem cap',()=>{
 const p=C.normalizeProfile({...C.normalizeProfile(),gems:9999900,ownedTowerSkins:['classic','frozen-keep']});
 A.equal(p.gems,9999999);A.equal(p.towerSkinRefundCredit,651);
 A.deepEqual(C.normalizeProfile(p),p);
 const spent=C.normalizeProfile({...p,gems:p.gems-1000});A.equal(spent.gems,9999650);A.equal(spent.towerSkinRefundCredit,0);
 A.deepEqual(C.normalizeProfile(spent),spent);
});
test('v220 malformed refund fields do not create currency or remove unrelated progress',()=>{
 const p=C.normalizeProfile({...C.normalizeProfile(),gems:70,experience:70,retiredTowerSkinRefunds:'bad',towerSkinRefundCredit:NaN,ownedTowerSkins:['invalid'],ownedEmotes:['Emote4'],magicItems:{'chest-key':3}});
 A.equal(p.gems,70);A.equal(p.experience,70);A.equal(p.magicItems['chest-key'],3);A.ok(p.ownedEmotes.includes('Emote4'));
 A.deepEqual(p.retiredTowerSkinRefunds,[]);A.equal(p.towerSkinRefundCredit,0);
});
