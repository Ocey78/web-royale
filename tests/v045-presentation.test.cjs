'use strict';
const test=require('node:test'),A=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const L=require('../src/arena-layout.js');
function root(){let made=0;const ctx=new Proxy({canvas:{},createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})}, {get:(t,k)=>k in t?t[k]:(()=>{})});const r={RoyaleArenaLayout:L,RoyaleGraphics:{current:{textures:'high',textureScale:1,arenaScale:1,arenaAnimated:true,arenaBackgrounds:'high',arenaFps:30}},document:{createElement(){made++;return{width:0,height:0,getContext:()=>ctx};}}};r.globalThis=r;vm.runInNewContext(fs.readFileSync('src/custom-arena.js','utf8'),r);return{r,ctx,made:()=>made};}

test('v045 every custom expansion map advertises layered themed presentation',()=>{
 const {r}=root();
 for(const id of ['TeamRumble','TeamRumbleArcReverse','TeamRumbleRiverLine','Team3v3','Team3v3Jungle','Team3v3Volcano','BridgeBattle','BridgeBattleLava','BridgeBattleGarden','Touchdown','Touchdown3v3']){
  const cv=r.RoyaleCustomArena.prepare({arenaLayout:L.get(id)},null);
  A.ok(cv.layers.includes('distant-backdrop'),id);
  A.ok(cv.layers.includes('unique-floor'),id);
  A.ok(cv.layers.includes('raised-scenery'),id);
  A.ok(cv.layers.includes('theme-props'),id);
  A.ok(cv.layers.includes('ambient'),id);
  A.equal(cv.detailTier,'environment-v047',id);
 }
});

test('v045 touchdown retains its dedicated presentation layer after FFA retirement',()=>{
 const {r}=root();
 const td=r.RoyaleCustomArena.prepare({arenaLayout:L.get('Touchdown3v3')},null);
 A.ok(td.layers.includes('touchdown-stands'));
 A.equal(L.get('FreeForAll').id,'classic');
});
