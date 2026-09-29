'use strict';
const test=require('node:test'),A=require('node:assert/strict'),V=require('../src/battle-view'),C=require('../src/core');
test('phone battle occupies the same width as the menu, including shorter Safari viewports',()=>{
 try{V.configure?.({compact:true});for(const [w,h]of [[390,751],[390,664],[375,647],[375,547],[844,369]]){
  const battle=V.fitViewport(w,h),menu=C.fitViewport(w,h);A.ok(Math.abs(battle.width-menu.width)<1e-8,`${w}x${h}: battle ${battle.width}, menu ${menu.width}`);
 }}finally{V.configure?.({compact:false});}
});
test('compact composition preserves world aspect and every world boundary above the hand',()=>{
 A.equal(typeof V.configure,'function');const original={...V.camera};
 try{V.configure({compact:true});A.equal(V.layout.height,960);A.equal(V.camera.scale,original.scale*.96);A.equal(V.camera.x,270+(original.x-270)*.96);
  for(const p of [{x:0,y:0},{x:480,y:640},{x:240,y:320},{x:93.333333,y:130},{x:386.666667,y:510},{x:240,y:60},{x:240,y:580}]){
   const q=V.toScreen(p),roundTrip=V.toWorld(q);A.ok(q.y>=0&&q.y<V.layout.handTop,'world point under hand: '+JSON.stringify(q));A.ok(Math.hypot(p.x-roundTrip.x,p.y-roundTrip.y)<1e-8);
  }
  const a=V.toScreen({x:100,y:100}),b=V.toScreen({x:200,y:200});A.ok(Math.abs((b.x-a.x)-(b.y-a.y))<1e-8,'World is uniformly scaled');
  A.equal(V.onBoard({x:270,y:V.layout.handTop+1}),false);A.equal(V.onBoard(V.toScreen({x:240,y:320})),true);
 }finally{V.configure({compact:false});}
});
test('complete source Crown Tower health exports fit the phone arena, asleep and active',()=>{
 const N=require('../src/native'),data=require('../assets/presentation/data.json'),hud=new N.Scene(data.hud,[]),battle=new C.Battle();
 try{V.configure({compact:true});for(const u of battle.towers){
  const config=data.healthBars.find(r=>r.Name===u.def.source.HealthBar),name=config[u.team?'EnemyExportName':'PlayerExportName'];
  const anchor=N.towerArtPosition(u),y=anchor.y+(u.king?(u.team?-4:10):(u.team?-62:-48));
  for(const frame of [0,31]){const bounds=hud.bounds(name,frame/hud.clip(name).fps),top=V.toScreen({x:anchor.x,y:y+bounds.y*5/6}),bottom=V.toScreen({x:anchor.x,y:y+(bounds.y+bounds.height)*5/6});
   A.ok(top.y>=0&&bottom.y<V.layout.handTop,`${name} frame ${frame}: ${top.y}..${bottom.y}`);
  }
 }}finally{V.configure({compact:false});}
});
test('desktop framing and camera restore exactly after phone rotation or layout changes',()=>{
 A.equal(typeof V.configure,'function');const original=JSON.stringify({layout:V.layout,camera:V.camera,viewport:V.viewport,worldClip:V.worldClip,fit:V.fitViewport(1200,960)});
 V.configure({compact:true});A.equal(V.mode,'compact');V.configure({compact:false});A.equal(V.mode,'reference');
 A.equal(JSON.stringify({layout:V.layout,camera:V.camera,viewport:V.viewport,worldClip:V.worldClip,fit:V.fitViewport(1200,960)}),original);
});
