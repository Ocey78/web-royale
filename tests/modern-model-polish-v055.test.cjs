'use strict';
const test=require('node:test'),a=require('node:assert/strict'),M=require('../src/modern-3d');
test('skeletal sampling interpolates between original frames without moving event markers',()=>{
 const clip={fps:30,frames:12,markers:[{Name:'action_frame',Frame:6}]};
 const p=M.clipPose(clip,1/60,'idle');a.equal(p.frame,0);a.ok(Math.abs(p.time-1/60)<1e-10,'the half-frame must reach the glTF LINEAR sampler');
 const windup=M.clipPose(clip,.05,'attack',{windup:.1},0);a.equal(windup.frame,3);a.ok(Math.abs(windup.time-.1)<1e-10);
 const released=M.clipPose(clip,.11,'attack',{windup:.1,releasedAt:.1},0,{BaseSpeed:1.3});a.equal(released.frame,6);a.ok(Math.abs(released.time-.213)<1e-10);
 const trimmed=M.clipPose(clip,.015,'ability',null,0,{StartFrame:2,EndFrame:4,BaseSpeed:2});a.equal(trimmed.frame,2);a.ok(Math.abs(trimmed.time-(2/30+.03))<1e-10);
});
test('authored animation transitions are isolated per unit, bounded, and cleared on rewind',()=>{
 const h=new M.PoseHistory({maxUnits:2}),parts=[{asm:{States:[{Name:'Idle',TransOutTime:.2},{Name:'Walk',TransInTime:.2},{Name:'Attack',TransInTime:.2}]}}],idle=[{name:'Idle',time:.3,frame:9}],walk=[{name:'Walk',time:0,frame:0}];
 a.equal(h.sample(1,'idle',1,idle,parts).length,0);
 let blend=h.sample(1,'walk',1.02,walk,parts);a.equal(blend.length,1);a.equal(blend[0].from.name,'Idle');a.equal(blend[0].weight,0);
 blend=h.sample(1,'walk',1.12,walk,parts);a.ok(Math.abs(blend[0].weight-.5)<1e-8);
 a.equal(h.sample(1,'walk',1.23,walk,parts).length,0);
 h.sample(1,'attack',1.24,[{name:'Attack',time:0,frame:0}],parts,{windup:.05});
 a.equal(h.sample(1,'attack',1.30,[{name:'Attack',time:.2,frame:6}],parts,{windup:.05}).length,0,'blend ends before attack release');
 a.equal(h.sample(1,'idle',1.1,idle,parts).length,0,'rewind cannot reuse a future pose');
 h.sample(2,'idle',2,idle,parts);h.sample(3,'idle',2,idle,parts);a.equal(h.size,2);h.clear();a.equal(h.size,0);
});
test('source LOD material keeps packed maps and prefab ambient specular strength',()=>{
 const manifest=require('../assets/modern-heroes/manifest.json'),fs=require('node:fs'),p=manifest.heroes.Ronin.parts[0],raw=fs.readFileSync('assets/modern-heroes/'+p.file),doc=JSON.parse(raw.subarray(20,20+raw.readUInt32LE(12))),plan=M.sourceMaterialPlan(doc.materials[0].extras,manifest);
 a.equal(plan.metalness,.5);a.equal(plan.roughness,.5);a.ok(plan.mraFile.startsWith('material-'));a.equal(plan.shader,'uber_pbr');a.equal(plan.normalFile,undefined,'original LOD1 shader deliberately omits normal sampling');
 const light=M.sourceLighting(manifest.heroes.Ronin.contract||manifest.heroes.Ronin);a.deepEqual(light.direct,[256/255,256/255,256/255]);a.deepEqual(light.ambient,[111/255,138/255,114/255]);a.equal(light.ambientSpec,2.45);
});
test('shader uniform diffuse textures remain counted and disposed on actor cache eviction',async()=>{
 const code=require('node:fs').readFileSync(require.resolve('../assets/vendor/three/three.core.js')),T=await import('data:text/javascript;base64,'+code.toString('base64')),diffuse=new T.Texture({width:32,height:16,close(){closed++;}}),packed=new T.Texture({width:8,height:8,close(){closed++;}});diffuse.generateMipmaps=packed.generateMipmaps=false;let disposed=0,closed=0;for(const tex of[diffuse,packed])tex.addEventListener('dispose',()=>disposed++);
 const group=new T.Group(),material=new T.ShaderMaterial({uniforms:{diffuseTex:{value:diffuse},mraTex:{value:packed}}});group.add(new T.Mesh(new T.BufferGeometry(),material));const actor={group,parts:[{masks:[packed],mixer:new T.AnimationMixer(group),gltf:{scene:group}}]};actor.bytes=M.actorMemory(actor);a.equal(actor.bytes,2304,'diffuse and packed textures count once each');
 const cache=new M.ActorCache({maxActors:0});cache.set('source',actor);a.equal(disposed,2);a.equal(closed,2);a.equal(cache.size,0);
});
