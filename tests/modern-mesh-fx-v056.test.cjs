'use strict';
const test=require('node:test'),A=require('node:assert/strict'),F=require('../src/modern-fx-3d.js'),fixtures=require('./fixtures/modern-fx-timelines-v056.json'),manifest=require('../assets/modern-heroes/manifest.json');
const knight=Object.values(fixtures)[0].record,countdown=Object.values(fixtures)[1].record;
test('simultaneous source materials own independent struct uniforms and share only textures',async()=>{
 const code=require('node:fs').readFileSync(require.resolve('../assets/vendor/three/three.core.js')),T=await import('data:text/javascript;base64,'+code.toString('base64')),texture=new T.Texture(),uniforms={mainTex:{value:texture},fragmentMaterialUniforms:{value:{mainColor:new T.Vector4(1,1,1,1),disv_amount:.2}},sceneUniforms:{value:{u_projectionView:new T.Matrix4()}}};
 const a=F.cloneUniforms(uniforms),b=F.cloneUniforms(uniforms);a.fragmentMaterialUniforms.value.mainColor.w=.1;a.fragmentMaterialUniforms.value.disv_amount=.8;a.sceneUniforms.value.u_projectionView.elements[0]=2;
 A.equal(b.fragmentMaterialUniforms.value.mainColor.w,1);A.equal(b.fragmentMaterialUniforms.value.disv_amount,.2);A.equal(b.sceneUniforms.value.u_projectionView.elements[0],1);A.equal(a.mainTex.value,texture);A.equal(b.mainTex.value,texture);A.equal(uniforms.fragmentMaterialUniforms.value.mainColor.w,1);
});
test('source prop selectors read PropState independently from shield hitpoints',()=>{
 const M=require('../src/modern-3d.js'),asm=manifest.heroes.BarbLogBarbarianHero.parts[0].asm;
 A.equal(M.resolveState(asm,'Attack',{shield:500,animationModifiers:{PropState:0}}),'Attack_Origin');
 A.equal(M.resolveState(asm,'Attack',{shield:0,animationModifiers:{PropState:1}}),'Attack_Prop');
});
test('original mesh timelines sample constant, linear and normalized Bezier segments',()=>{
 const start=F.timelineState(knight,0),middle=F.timelineState(knight,.15),end=F.timelineState(knight,.4);
 A.equal(start['pos/vfx_slash'].x,-.91);A.equal(end['pos/vfx_slash'].x,-.73);
 A.ok(middle['pos/vfx_slash'].x>-.91&&middle['pos/vfx_slash'].x<-.73);
 A.equal(start['pos/vfx_slash']['Model.mat0.mainColor.w'],.8779411);
 A.equal(end['pos/vfx_slash']['Model.mat0.mainColor.w'],0);
 A.equal(F.timelineState(countdown,0).vfx_countdown['Model.mat0.dissolveTex_UV.z'],.31);
 A.ok(Math.abs(F.timelineState(countdown,1.35).vfx_countdown['Model.mat0.dissolveTex_UV.z']+.195)<1e-8);
 A.equal(F.timelineState(countdown,4).vfx_countdown['Model.mat0.mainColor.w'],0);
 const loop=F.timelineState(knight,.65,true)['pos/vfx_slash'];for(const[k,v]of Object.entries(middle['pos/vfx_slash']))A.ok(Math.abs(loop[k]-v)<1e-12);
});
test('retained source effects resample transforms and visibility on their lifetime clock',()=>{
 const f=require('../assets/modern-heroes/fx-manifest.json'),record=Object.entries(f.records).find(([k])=>k.endsWith('tml_minipekka_hero_ingame_def_slash'))[1],tracks=[{record,loop:false,relative:'pos/vfx_slash'}],tr={source:{pos:[0,0,0],rot:[0,0,0],scl:[1,1,1]},tracks};
 const a=F.sampledTransform(tr,0),b=F.sampledTransform(tr,.275);A.deepEqual(b.rot,[53.08,-121.67,158.65]);A.notDeepEqual(a.rot,b.rot);
 const plan=F.sourceMeshPlan(manifest.heroes.KnightHero,[{name:'Attack2',frame:12,time:.4}],{...manifest.vfxAssets,...f.records},.4,0)[0];
 A.ok(F.scopedValues(plan.tracks,0)['Model.mat0.mainColor.w']>0);A.equal(F.scopedValues(plan.tracks,.5)['Model.mat0.mainColor.w'],0);
});
test('source body material timelines bind their actual MaterialEffect.mat fields',()=>{
 const material={userData:{initial:{fr_weight:1,fr_IOR:1}},uniforms:{fragmentMaterialUniforms:{value:{fr_weight:1,fr_IOR:1}}}};
 F.Renderer.prototype.uniformState.call({T:{}},material,0,0,{}, {},{'MaterialEffect.mat.fr_weight':.25,'MaterialEffect.mat.fr_IOR':1.18});
 A.equal(material.uniforms.fragmentMaterialUniforms.value.fr_weight,.25);A.equal(material.uniforms.fragmentMaterialUniforms.value.fr_IOR,1.18);
});
test('a stale source autoplay name retains the prefab default timeline',()=>{
 const f=require('../assets/modern-heroes/fx-manifest.json'),prefab=Object.entries(f.records).find(([k])=>k.endsWith('/vfx_minipekka_hero_ingame_fnl_ability_activate'))[1];
 A.equal(F.timelineBindings(prefab.data,f.records).length,1);
});
test('native shader adapter removes binary terminators and native instance inputs',()=>{
 const f=require('../assets/modern-heroes/fx-manifest.json');for(const s of Object.values(f.shaders))for(const v of Object.values(s.vert.variants)){if(v.flags?.includes('GPU_SKINNED'))continue;const text=F.vertexSource(v.source);A.ok(!text.includes('\0'));A.ok(!text.includes('layout(std140)'));A.ok(!/layout\(location[^\n]+ in/.test(text));A.ok(text.includes('#include <skinning_vertex>'));}
});
test('mesh FX use original event gates, scoped timeline transforms and team prefabs',()=>{
 const assets={...manifest.vfxAssets,...Object.fromEntries(Object.entries(fixtures).map(([k,v])=>[k,v.record]))},contract=manifest.heroes.KnightHero;
 A.equal(F.sourceMeshPlan(contract,[{name:'Attack2',frame:7,time:7/30}],assets,0,0).length,0);
 const before=JSON.stringify(assets),rows=F.sourceMeshPlan(contract,[{name:'Attack2',frame:12,time:12/30}],assets,.4,0);
 A.equal(rows.length,1);A.match(rows[0].model,/sm_slash/);A.ok(rows[0].materialValues['Model.mat0.mainColor.w']>0);A.ok(rows[0].materialValues['Model.mat0.mainColor.w']<.8779411);A.equal(rows[0].duration,.5);
 A.equal(JSON.stringify(assets),before,'sampling never modifies original records');
 const fake={parts:[],sourcePrefab:{data:{components:[{objectType:5025,BlueVfx:'blue',RedVfx:'red'}]}}},records={blue:{data:{components:[{objectType:5001,Model:'mesh-blue'}]}},red:{data:{components:[{objectType:5001,Model:'mesh-red'}]}}};
 A.equal(F.sourceMeshPlan(fake,[],records,0,0)[0].model,'mesh-blue');A.equal(F.sourceMeshPlan(fake,[],records,0,1)[0].model,'mesh-red');
});
