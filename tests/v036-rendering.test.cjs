'use strict';
const test=require('node:test'),a=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const G=require('../src/graphics.js'),N=require('../src/native.js'),FX=require('../src/fx.js');
function ctx(){return{globalAlpha:1,save(){},restore(){},transform(){},translate(){},rotate(){},scale(){},drawImage(){},beginPath(){},ellipse(){},fill(){},moveTo(){},lineTo(){},stroke(){}};}
test('animated alpha is composited without generating a separate tint texture per fade frame',()=>{
 const s=new N.Scene({exports:{x:1},shapes:{},matrices:[],colors:[[0,0,0,127,255,255,255]],clips:{1:{fps:30,frames:[[[2,65535,0,0]]]}}},[]),colors=[];
 s.coloredShape=(id,col)=>{if(id!==2)return null;colors.push(col);return{image:{},x:0,y:0,w:1,h:1};};
 const c=ctx();let opacity;c.drawImage=()=>opacity=c.globalAlpha;s.draw(c,'x',0);
 a.equal(colors[0][3],255);a.ok(Math.abs(opacity-127/255)<1e-9);
});
test('particle Off retains core spell artwork but skips emitter sprite work',()=>{
 global.RoyaleGraphics=G;G.apply({particles:'off'});let calls=0;
 const scene={id:()=>1,duration:()=>1,draw:()=>calls++},data={effects:{Hit:[{Type:'SWF',FileName:'sc/effects.sc',ExportName:'impact'},{Type:'ParticleEmitter',ParticleEmitterName:'Smoke'}]},emitters:{Smoke:[{ParticleCount:48,ParticleMinLife:1000,ParticleResource:'sc/effects.sc',ParticleExportName:'smoke'}]}};
 const f=new FX.Renderer(data,{scenes:{effects:scene}});f.begin();f.effect(ctx(),'Hit',0,0,.1,0,{phase:'all',spell:true});a.equal(calls,1);a.equal(f.particlesUsed,0);G.apply(G.DEFAULTS);delete global.RoyaleGraphics;
});
test('Spells only skips movement particles but permits marked spell particles within the frame cap',()=>{
 global.RoyaleGraphics=G;G.apply({particles:'spells-only'});let calls=0;
 const scene={id:()=>1,duration:()=>1,draw:()=>calls++},data={effects:{Dust:[{Type:'ParticleEmitter',ParticleEmitterName:'Smoke'}]},emitters:{Smoke:[{ParticleCount:48,ParticleMinLife:1000,ParticleResource:'sc/effects.sc',ParticleExportName:'smoke'}]}};
 const f=new FX.Renderer(data,{scenes:{effects:scene}});f.begin();f.effect(ctx(),'Dust',0,0,.1,0,{phase:'all'});a.equal(calls,0);
 for(let i=0;i<100;i++)f.effect(ctx(),'Dust',0,0,.1,0,{phase:'all',spell:true});a.ok(calls>0);a.ok(f.particlesUsed<=G.current.frameParticles);G.apply(G.DEFAULTS);delete global.RoyaleGraphics;
});
test('undamaged enemy troops draw a native level badge, not a health bar',async()=>{
 const calls=[],hud={clip:()=>({frames:[[]]}),drawStill:(c,name,opts)=>calls.push({name,opts})};
 const root={RoyaleText:{load:async()=>{},summary:()=>({})},RoyaleNative:{Scene:function(){return hud;},towerArtPosition:u=>u,entityElevation:()=>0,library:{headHeight:()=>20}}};root.globalThis=root;
 vm.runInNewContext(fs.readFileSync(require.resolve('../src/presentation.js'),'utf8'),root);
 await root.RoyalePresentation.load({text:{},hud:{textures:[]},filters:{textures:[]},healthBars:[{Name:'Medium'},{Name:'Tower'}]});
 for(const king of [undefined]){const u={id:1,level:11,hp:100,maxHp:100,team:1,x:100,y:100,def:{source:{HealthBar:king===false?'Tower':'Medium'}}};if(king!==undefined)u.king=king;
 a.equal(root.RoyalePresentation.health(ctx(),u,0),true);a.equal(calls.at(-1).opts.texts.level,'11');a.equal(calls.at(-1).name,'hp_enemy_number');}
});
test('Low texture tier really permits half-size raster textures',()=>{a.equal(N.shapeRasterScale(100,100,.5),.5);a.equal(N.shapeRasterScale(100,100,.75),.75);a.equal(N.shapeRasterScale(100,100,1),1);});
test('effect prewarming is bounded, yields, and never changes combat state',async()=>{
 const draw=[];global.document={createElement:()=>({width:0,height:0,getContext:()=>ctx()})};
 const f=new FX.Renderer({effects:{Fireball_explosion:[{Type:'SWF',FileName:'sc/effects.sc',ExportName:'impact'}]},emitters:{}},{scenes:{effects:{id:()=>1,duration:()=>3,draw:()=>draw.push(1)}}});
 a.equal(typeof f.prewarmFireball,'function');await f.prewarmFireball();a.ok(draw.length>=30&&draw.length<=120);a.equal(f.spriteCount,0);a.equal(f.effectCount,0);delete global.document;
});
