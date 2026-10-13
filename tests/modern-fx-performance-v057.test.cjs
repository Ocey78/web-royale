'use strict';
const test=require('node:test'),A=require('node:assert/strict'),F=require('../src/modern-fx-3d.js'),manifest=require('../assets/modern-heroes/manifest.json'),definition=require('../assets/modern-heroes/fx-manifest.json'),data=require('../src/catalog.js').DATA;
const three=()=>import('data:text/javascript;base64,'+require('node:fs').readFileSync(require.resolve('../assets/vendor/three/three.core.js')).toString('base64'));
test('actor preparation retains every owned action effect without loading unrelated character overlays',()=>{
 const keys=Object.keys(definition.actionRoots),byName=ids=>ids.map(id=>definition.actionRoots[id]);
 A.deepEqual(F.reachableActionRoots(manifest.heroes.KnightHero,definition,data),[]);
 A.deepEqual(F.reachableActionRoots(manifest.heroes.BalloonHero,definition,data),[]);
 A.deepEqual(F.reachableActionRoots(manifest.heroes.BowlerHero,definition,data),byName(['BowlerHero_3DFlashEffect','Bowler_hero_play_rock_glow']));
 A.deepEqual(F.reachableActionRoots(manifest.heroes.EliteArcherHero,definition,data),byName(['EliteArcherHero_Play_Triple_Shot_Effect']));
 for(const id of ['AngryBarbarian_EV1','AngryBarbarian_EV1_2'])A.deepEqual(F.reachableActionRoots(manifest.heroes[id],definition,data),byName(['AngryBarbarian_EV1_ReadyIndicator']));
 const reached=new Set(Object.values(manifest.heroes).flatMap(c=>F.reachableActionRoots(c,definition,data)));A.equal(reached.size,keys.length);
});
test('source graph preparation follows abilities and nested spawn records across asset directories',()=>{
 const f={actionRoots:{end:'fx/end',unrelated:'fx/unrelated'}},d={actions:{begin:{SubActions:['spawn']},spawn:{SpawnData:'buff'},end:{NextAction:'begin'}},abilities:{ability:{OnActivationAction:'begin'}},buffs:{buff:{OnStartAction:'end'}}};
 A.deepEqual(F.reachableActionRoots({sourceEntity:{Ability:'ability'}},f,d),['fx/end']);
 A.deepEqual(F.reachableActionRoots({sourceEntity:{}},f,null),['fx/end','fx/unrelated'],'unknown standalone definitions retain the conservative fallback');
});
test('native PBR materials remain cacheable while authored scrolling material speeds stay animated',()=>{
 for(const record of Object.values(definition.materials))if(record.resolvedShader==='uber_pbr')A.equal(F.timeDependentShader(definition.shaders.uber_pbr.frag.variants[record.selectedVariants.frag].source,record.resolvedVariables),false);
 const shader='fragmentMaterialUniforms.speed.xy * sceneUniforms.u_lightDirectionTime.w';
 A.equal(F.timeDependentShader(shader,{speed:[0,0,4,1]}),false);
 A.equal(F.timeDependentShader(shader,{speed:[.1,0,0,0]}),true);
 A.equal(F.timeDependentShader('sin(sceneUniforms.u_lightDirectionTime.w)',{}),true,'unknown time equations remain conservatively dynamic');
});
test('repeated timeline samples share bounded internal work while public results remain mutable and isolated',()=>{
 let reads=0;const anims={nodes:['mesh'],data:[{anims:[{id:'x',value:{keys:[{s:0,e:2,t:1,lf:0,lt:2}]}}]}]},record={total_time:2,get anims(){reads++;return anims;}},tracks=[{record,loop:false,relative:'mesh'}];
 const first=F.scopedValues(tracks,.25),initialReads=reads;A.equal(first.x,.25);first.x=100;
 A.equal(F.scopedValues(tracks,.25).x,.25);A.equal(reads,initialReads,'transform and material queries share the original curve sample');
 const publicValue=F.timelineState(record,.25);publicValue.mesh.x=200;A.equal(F.scopedValues(tracks,.25).x,.25);
 for(let i=1;i<=17;i++)F.scopedValues(tracks,i/20);const before=reads;F.scopedValues(tracks,.25);A.equal(reads,before,'a recently used age stays cached');
 F.scopedValues(tracks,1.5);for(let i=1;i<=17;i++)F.scopedValues(tracks,i/20);const evictedReads=reads;F.scopedValues(tracks,1.5);A.ok(reads>evictedReads,'old ages are evicted after the bounded recent sample window');
 A.deepEqual(F.scopedValues([{record,loop:true,relative:'mesh'}],2.25),F.timelineState(record,.25).mesh);
 const other={...record,anims:{nodes:['mesh'],data:[{anims:[{id:'x',value:{keys:[{s:0,e:2,t:0,c:7}]}}]}]}};A.equal(F.scopedValues([{record:other,relative:'mesh'}],.25).x,7,'cache entries belong to record identity');
});
test('mesh plans expose copies of material values and no cached timeline value objects',()=>{
 const records={...manifest.vfxAssets,...definition.records},pose=[{name:'Attack2',frame:12,time:.4}],plan=F.sourceMeshPlan(manifest.heroes.KnightHero,pose,records,.4,0),expected=plan[0].materialValues['Model.mat0.mainColor.w'];
 for(const effect of plan)for(const track of [...effect.tracks,...effect.chain.flatMap(tr=>tr.tracks||[])])A.equal(Object.hasOwn(track,'values'),false);
 plan[0].materialValues['Model.mat0.mainColor.w']=99;
 A.equal(F.sourceMeshPlan(manifest.heroes.KnightHero,pose,records,.4,0)[0].materialValues['Model.mat0.mainColor.w'],expected);
});
test('body overlay preparation uses authored geometry targets and resets only changed meshes',async()=>{
 const T=await three(),group=new T.Group(),a=new T.Mesh(new T.BufferGeometry(),new T.MeshBasicMaterial()),b=new T.Mesh(new T.BufferGeometry(),new T.MeshBasicMaterial());a.name='weapon';b.name='body';group.add(a,b);
 const baseA=a.material,baseB=b.material,contract={parts:[],sourceEntity:{},sourcePrefab:{data:{components:[{objectType:5018,MaterialAsset:'glow',GeometryNames:['weapon']}]}}},actor={contract,parts:[],group},r=new F.Renderer(T,{records:{},meshes:{},actionRoots:{}},{},{},x=>x),calls=[];
 r.material=async(path,base)=>({userData:{sourceFXPath:path,sourceFXMaterial:true,sourceFXTimeDependent:false}});r.uniformState=(...v)=>calls.push(v);
 await r.prepare(actor);A.equal(r.overlays.size,1);A.equal(r.dynamic,false);A.equal(r.shadowDiffers,false);
 const effect={bodyMaterial:'glow',age:0,duration:1,component:{GeometryNames:['weapon']},tracks:[]};r.updateBody([effect],0,0,{},{});A.notEqual(a.material,baseA);A.equal(b.material,baseB);A.equal(calls.length,1);
 r.updateBody([],1,0,{},{});A.equal(a.material,baseA);A.equal(b.material,baseB);A.equal(r.activeOverlays.size,0);A.equal(calls.length,1,'inactive overlays cause no uniform work');
});
test('whole-body overlay references preserve meshes beyond restricted references to the same material',async()=>{
 const T=await three(),group=new T.Group();for(const name of ['weapon','body']){const mesh=new T.Mesh(new T.BufferGeometry(),new T.MeshBasicMaterial());mesh.name=name;group.add(mesh);}
 const components=[{objectType:5018,MaterialAsset:'glow',GeometryNames:['weapon']},{objectType:5018,MaterialAsset:'glow'}],r=new F.Renderer(T,{records:{},meshes:{},actionRoots:{}},{},{},x=>x);
 r.material=async path=>({userData:{sourceFXPath:path,sourceFXMaterial:true}});await r.prepare({contract:{parts:[],sourceEntity:{},sourcePrefab:{data:{components}}},parts:[],group});A.equal(r.overlays.size,2);
});
test('camera refresh preserves mesh transforms and animated material values',async()=>{
 const T=await three(),r=new F.Renderer(T,{},null,null,x=>x),s={u_invView:new T.Matrix4(),u_projectionView:new T.Matrix4(),u_cameraPosition:new T.Vector4()},material=new T.ShaderMaterial({uniforms:{sceneUniforms:{value:s},fragmentMaterialUniforms:{value:{alpha:.37}}}}),mesh=new T.Mesh(new T.BufferGeometry(),material),camera=new T.OrthographicCamera(-3,3,4,-4,.1,50);mesh.position.set(1,2,3);r.group.add(mesh);camera.position.set(2,4,6);camera.updateMatrixWorld();camera.updateProjectionMatrix();const pose=mesh.position.clone();r.refreshMeshCamera(camera);A.deepEqual(s.u_cameraPosition.toArray(),[2,4,6,1]);A.deepEqual(s.u_projectionView.elements,new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).elements);A.equal(material.uniforms.fragmentMaterialUniforms.value.alpha,.37);A.deepEqual(mesh.position,pose);
});
