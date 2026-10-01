'use strict';
const test=require('node:test'),A=require('node:assert/strict');
const FX=require('../src/fx'),G=require('../src/graphics'),N=require('../src/native');
const data=require('../assets/native/data.json'),fx=require('../assets/game/fx-data.json');
test('area calibration sizes Rage and Poison from visible source poses',()=>{
 const scene=new N.Scene(data.scenes.effects,[]),renderer=new FX.Renderer(fx,{scenes:{effects:scene}}),scales=[];
 renderer.sprite=(c,f,n,t,x,y,sx,sy)=>{scales.push({n,sx,sy});return true;};
 for(const name of ['Spell_rage_ground','Spell_poison_ground','Spell_graveyard_ground'])renderer.effect({},name,240,300,.6,0,{phase:'ground',fitArea:true,radius:3,life:8});
 A.ok(scales.length>=6);A.ok(scales.every(s=>s.sx>.1&&s.sx<2&&s.sy>.1&&s.sy<2),JSON.stringify(scales));
});
test('looping projectile trail has no gap between emitter cycles',()=>{
 const r={ParticleCount:50,MinLife:800,MaxLife:800,ParticleMinInterval:5,ParticleMaxInterval:10,ParticleMinLife:200,ParticleMaxLife:200};
 for(const t of [.39,.59,.79,.99,10.79])A.ok(FX.emitterSamples(r,'trail',t,true,{},32).length>=9,'empty trail at '+t);
});
test('Earthquake cracks fill the radius while retaining their authored delayed appearance',()=>{
 const sc=new N.Scene(data.scenes.effects,[]),r=new FX.Renderer(fx,{scenes:{effects:sc}}),calls=[];r.sprite=(...args)=>{calls.push(args);return true;};
 r.effect({},'Spell_earthquake_loop',240,300,.4,0,{phase:'ground',fitArea:true,radius:3.5,life:3,loop:true});const crack=calls.find(a=>a[2]==='earthquake_cracks_timed');A.ok(crack);A.ok(crack[3]<.5);A.ok(crack[6]>1);A.ok(sc.bounds('earthquake_cracks_timed',crack[3]).width<=1);
 calls.length=0;r.effect({},'Spell_earthquake_loop',240,300,1.4,0,{phase:'ground',fitArea:true,radius:3.5,life:3,loop:true});A.ok(calls.some(a=>a[2]==='earthquake_cracks_timed'&&sc.bounds(a[2],a[3]).width>1));
});
test('Rage cast burst fades promptly while its separate area remains',()=>{
 const r=new FX.Renderer(fx,{scenes:{}}),calls=[];r.sprite=(...args)=>{calls.push(args);return true;};
 r.effect({},'Spell_rage_effect',240,300,1.5,0,{phase:'above',spell:true});A.equal(calls.length,0);
});
test('legacy team radius rings remain subtle beside the actual area artwork',()=>{
 const sc=new N.Scene(data.scenes.effects,[]),r=new FX.Renderer(fx,{scenes:{effects:sc}}),calls=[];r.sprite=(...args)=>{calls.push(args);return true;};
 r.effect({},'Spell_rage_ground',240,300,.6,0,{phase:'ground',fitArea:true,radius:5,life:6});const ring=calls.find(a=>a[2]==='spell_rage_radius_blue'),floor=calls.find(a=>a[2]==='rage_effect_ground');A.ok(ring&&floor);A.ok(ring[9]<=.25);A.equal(floor[9],1);
});
test('Tornado has visible wind throughout its short active area',()=>{
 const r=new FX.Renderer(fx,{scenes:{}}),strokes=[];const c={save(){},restore(){},translate(){},scale(){},beginPath(){},arc(...a){strokes.push(a);},stroke(){},globalAlpha:1};
 r.tornadoWind(c,{x:240,y:250,radius:5.5},.15,1);A.ok(strokes.length>=8&&strokes.length<=32);A.ok(strokes.some(a=>a[2]>100));A.ok(strokes.every(a=>a[2]>0&&Number.isFinite(a[4])));
});
test('one-shot Clone ground timeline does not restart',()=>{
 const calls=[],sc={id:()=>1,duration:()=>.8,bounds:()=>({x:-50,y:-40,width:100,height:80}),draw:(c,n,t,o)=>calls.push(o)},r=new FX.Renderer({coordinateScale:.6,effects:{clone:[{Type:'SWF',FileName:'effects.sc',ExportName:'clone',Layer:'Base'}]},emitters:{}},{scenes:{effects:sc}});
 const c={save(){},restore(){},translate(){},rotate(){},scale(){},globalAlpha:1};
 r.effect(c,'clone',0,0,.3,0,{phase:'ground',fitArea:true,radius:3,life:1});A.equal(calls[0].loop,false);
 r.effect(c,'clone',0,0,1.2,0,{phase:'ground',fitArea:true,radius:3,life:1});A.equal(calls.length,1);
});
test('Ultra retains smooth source artwork with bounded raster density',()=>{
 const g=G.policy({textures:'ultra',animations:'ultra',particles:'ultra',arenaBackgrounds:'ultra'});
 A.equal(g.textures,'ultra');A.equal(g.animationFps,120);A.equal(g.postProcessing,true);A.ok(g.textureScale>G.policy({textures:'max'}).textureScale);A.ok(g.textureScale<=3);A.ok(g.arenaScale<=3);A.ok(g.frameParticles<=700);
 for(const tier of ['high','max'])A.ok(G.policy({textures:tier}).textureScale<=3);
});
test('tinted source raster cache stays available at high density',()=>{
 let reads=0;const previous=global.document;global.document={createElement:()=>({width:0,height:0,getContext:()=>({drawImage(){},getImageData(){reads++;return{data:new Uint8ClampedArray(4)};},putImageData(){}})})};
 try{const s=new N.Scene({shapes:{},clips:{},exports:{}},[]);s.shape=id=>({image:{width:1280,height:1000},x:0,y:0,w:1280,h:1000});
  for(let round=0;round<2;round++)for(let i=0;i<6;i++)s.coloredShape(i,[0,0,0,255,230,255,255]);A.equal(reads,6,'repeated spell tint frames should reuse existing rasters');
 }finally{global.document=previous;}
});
