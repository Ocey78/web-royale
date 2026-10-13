/* Source effect timelines and mesh/material rendering. Presentation only. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.RoyaleModernFX3D=api;})(globalThis,function(root){'use strict';
const reference=v=>String(v||'').split(' | ')[0],clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function bezier(values,t){
 if(!Array.isArray(values)||values.length!==6||!values.every(Number.isFinite))return null;
 t=clamp(t,0,1);if(t===0)return values[4];if(t===1)return values[5];
 const cubic=(u,a,b)=>3*(1-u)*(1-u)*u*a+3*(1-u)*u*u*b+u*u*u;let lo=0,hi=1;
 for(let i=0;i<30;i++){const u=(lo+hi)/2;if(cubic(u,values[0],values[2])<t)lo=u;else hi=u;}
 return values[4]+(values[5]-values[4])*cubic((lo+hi)/2,values[1],values[3]);
}
function timelineValue(value,time){
 const keys=value?._v?.timelineValue?.keys||value?.timelineValue?.keys||value?.keys;if(!keys?.length)return null;
 let key=keys[0];for(const next of keys){if((Number(next.s)||0)>time)break;key=next;if(time<(Number(next.e)||0))break;}
 const start=Number(key.s)||0,end=Number(key.e)||0,t=end>start?clamp((time-start)/(end-start),0,1):1;
 if(key.t===2){const v=bezier(key.b,t);if(v!==null)return v;return Number.isFinite(key.b?.[4])&&key.b[4]===key.b[5]?key.b[4]:null;}
 if(key.t===1)return(Number(key.lf)||0)+((Number(key.lt)||0)-(Number(key.lf)||0))*t;
 return Number(key.c)||0;
}
function timelineState(timeline,time,loop=false){
 const duration=Number(timeline?.total_time)||0,t=loop&&duration>0?Math.max(0,time)%duration:Math.max(0,time),result={};
 for(const [i,path]of (timeline?.anims?.nodes||[]).entries())for(const track of timeline.anims.data[i]?.anims||[]){const value=timelineValue(track.value,t);if(value!==null)(result[path]??={})[track.id]=value;}
 return result;
}
// A mesh uses the same timeline age for its transform, visibility and each
// material. Share those samples internally without retaining unloaded records
// or exposing cached objects through the public, caller-mutable sampler.
const timelineSamples=new WeakMap(),MAX_TIMELINE_SAMPLES=16;
function sampledTimelineState(timeline,time,loop=false){
 if(!timeline||typeof timeline!=='object')return timelineState(timeline,time,loop);
 const duration=Number(timeline.total_time)||0,age=loop&&duration>0?Math.max(0,time)%duration:Math.max(0,time);let cache=timelineSamples.get(timeline);if(!cache)timelineSamples.set(timeline,cache=new Map());
 if(cache.has(age)){const value=cache.get(age);cache.delete(age);cache.set(age,value);return value;}
 const result=timelineState(timeline,age);for(const row of Object.values(result))Object.freeze(row);Object.freeze(result);cache.set(age,result);if(cache.size>MAX_TIMELINE_SAMPLES)cache.delete(cache.keys().next().value);return result;
}
function timelineBindings(node,records){
 const list=(node.components||[]).find(c=>c.objectType===5014),play=(node.components||[]).find(c=>c.objectType===5016),name=play?.TimelineName||list?.defaultTimeline;
 const entries=list?.timelines||[],selected=entries.some(t=>t.name===name)?name:list?.defaultTimeline;
 return entries.filter(t=>t.name===selected).map(t=>({record:records[reference(t.asset)],loop:play?.Loop??list.loop??false})).filter(t=>t.record);
}
const lifeCaches=new WeakMap();
function prefabLifetime(node,records,team){
 let cache=lifeCaches.get(records);if(!cache)lifeCaches.set(records,cache=new WeakMap());let pair=cache.get(node);if(pair?.[team])return pair[team];
 let duration=0,looped=false;const visit=(n,seen)=>{if(!n||seen.size>24)return;for(const t of timelineBindings(n,records)){duration=Math.max(duration,Number(t.record.total_time)||0);looped||=t.loop;}for(const c of n.components||[]){if(c.objectType===5018)duration=Math.max(duration,Number(c.Lifetime)||0);for(const ref of[c.Prefab,c.Effect,c.objectType===5025?(team===1?c.RedVfx:c.BlueVfx):null]){const key=reference(ref);if(key&&!seen.has(key))visit(records[key]?.data,new Set([...seen,key]));}}for(const child of n.children||[])visit(child,seen);};visit(node,new Set());
 const result={duration:duration||1,looped};pair??={};pair[team]=result;cache.set(node,pair);return result;
}
function sourceMeshPlan(contract,partPoses,records,time,team){
 const out=[];
 const visit=(node,chain,part,age,seen,bone=null,eventKey=null,path='',scopes=[],life=null)=>{
  if(!node||seen.size>24||out.length>=96)return;
  life??=prefabLifetime(node,records,team);
  const components=node.components||[],model=components.find(c=>c.Model),mount=components.find(c=>c.objectType===5012);
  if(model){const index=contract.parts.findIndex(p=>p.sourceModel===reference(model.Model));if(index>=0)part=index;}
  if(mount){bone=mount;chain=[];}
  const localScopes=[...scopes,...timelineBindings(node,records).map(t=>({...t,path,values:sampledTimelineState(t.record,age,t.loop)}))],values={};
  for(const scope of localScopes){const relative=path===scope.path?'':path.startsWith(scope.path+'/')?path.slice(scope.path.length+1):scope.path===''?path:null;if(relative!==null)Object.assign(values,scope.values[relative]);}
  const tracks=localScopes.map(scope=>{const relative=path===scope.path?'':path.startsWith(scope.path+'/')?path.slice(scope.path.length+1):scope.path===''?path:null;return relative===null?null:{record:scope.record,loop:scope.loop,path:scope.path,relative};}).filter(Boolean);
  const tr={pos:[...(node.pos||[0,0,0])],rot:[...(node.rot||[0,0,0])],scl:[...(node.scl||[1,1,1])]};
  tr.source={pos:[...tr.pos],rot:[...tr.rot],scl:[...tr.scl]};tr.tracks=tracks;
  for(const [i,axis]of['x','y','z'].entries()){if(values[axis]!==undefined)tr.pos[i]=values[axis];if(values['rot_'+axis]!==undefined)tr.rot[i]=values['rot_'+axis];if(values['scl_'+axis]!==undefined)tr.scl[i]=values['scl_'+axis];}
  chain=[...chain,tr];
  for(const component of components){
   const model=reference(component.Model);if(component.objectType===5001&&model&&!contract.parts.some(p=>p.sourceModel===model))out.push({model,component,chain,part,bone,eventKey,age,path,materialValues:values,tracks,...life});
   if(component.objectType===5018&&component.MaterialAsset)out.push({bodyMaterial:reference(component.MaterialAsset),component,chain,part,bone,eventKey,age,path,materialValues:values,tracks,...life,duration:Number(component.Lifetime)||life.duration,looped:!component.Lifetime&&life.looped});
   for(const ref of[component.Prefab,component.Effect,component.objectType===5025?(team===1?component.RedVfx:component.BlueVfx):null]){const key=reference(ref);if(key&&!seen.has(key)&&records[key]?.data)visit(records[key].data,chain,part,age-(Number(component.Delay)||0),new Set([...seen,key]),bone,eventKey,'',[],prefabLifetime(records[key].data,records,team));}
  }
  for(const child of node.children||[])visit(child,chain,part,age,seen,bone,eventKey,path?path+'/'+child.name:child.name,localScopes,life);
 };
 visit(contract.sourcePrefab?.data,[],0,time,new Set());
 for(const [part,pose]of partPoses.entries()){if(!pose)continue;const metadata=contract.parts[part],descriptor=metadata.asm?.States?.find(s=>s.Name===pose.name),fps=Number(metadata.animations[pose.name]?.fps)||30,speed=Number(descriptor?.BaseSpeed)||1;
  for(const [i,event]of (descriptor?.Events||[]).entries()){const frame=Number(event.Frame)||0,key=reference(event.Effect);if(event.Event==='Effect'&&frame<=pose.frame&&records[key]?.data)visit(records[key].data,metadata.transforms||[],part,Math.max(0,((pose.time??pose.frame/fps)-frame/fps)/speed),new Set([key]),null,part+':'+pose.name+':'+i);}
 }
 return out;
}
function scopedValues(tracks,age){const result={};for(const t of tracks||[])Object.assign(result,sampledTimelineState(t.record,age,t.loop)[t.relative]);return result;}
function sampledTransform(tr,age){const result={pos:[...(tr.source?.pos||tr.pos||[0,0,0])],rot:[...(tr.source?.rot||tr.rot||[0,0,0])],scl:[...(tr.source?.scl||tr.scl||[1,1,1])]},v=scopedValues(tr.tracks,age);for(const[i,a]of['x','y','z'].entries())for(const[key,prefix]of[['pos',''],['rot','rot_'],['scl','scl_']])if(v[prefix+a]!==undefined)result[key][i]=v[prefix+a];for(const[i,key]of['pitch','roll','yaw'].entries())if(v[key]!==undefined)result.rot[i]=v[key];return result;}
function shaderSource(source){return source.replace(/\0/g,'').replace(/^#version[^\n]+\n/,'').replace(/layout\(std140\) uniform (\w+)\s*\{([\s\S]*?)\}\s*(\w+);/g,(_,name,fields,variable)=>`struct ${name}{${fields}};uniform ${name} ${variable};`);}
function vertexSource(source){
 let s=shaderSource(source).replace(/layout\(location\s*=\s*\d+\) in \w+ a_\w+;/g,'').replace(/transpose\(mat4\(a_model, a_model2, a_model3, vec4\(0\.0, 0\.0, 0\.0, 1\.0\)\)\)/g,'modelMatrix');
 s=s.replace(/\ba_pos\b/g,'transformed').replace(/\ba_normal\b/g,'objectNormal').replace(/\ba_uv0\b/g,'uv').replace(/\ba_tangent\b/g,'sourceTangent');
 return '#include <common>\n#include <skinning_pars_vertex>\n'+s.replace(/void main\(\)\s*\{/,`void main(){
 #include <beginnormal_vertex>
 #include <skinbase_vertex>
 #include <skinnormal_vertex>
 #include <begin_vertex>
 #include <skinning_vertex>
 vec4 sourceTangent=vec4(1.0,0.0,0.0,1.0);
 #ifdef USE_TANGENT
 sourceTangent=vec4(objectTangent,tangent.w);
 #endif
 `);
}
function bodyOverrides(contract){const result=[];const walk=n=>{for(const c of n?.components||[])if(c.Model){const part=contract.parts.findIndex(p=>p.sourceModel===reference(c.Model));if(part>=0)for(const g of c.Geometries||[])if(g.MaterialOverride)result.push({part,name:g.Name,index:g.GeomIndex||0,material:reference(g.MaterialOverride)});}for(const child of n?.children||[])walk(child);};walk(contract.sourcePrefab?.data);return result;}
function cloneUniforms(uniforms){const copy=v=>v?.isTexture?v:v?.clone?v.clone():Array.isArray(v)?v.map(copy):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,copy(x)])):v;return copy(uniforms);}
// Follow the source graph once at load time. Unrelated actors do not need the
// Bowler, Magic Archer and Evo Barbarian body overlays on every body mesh.
function reachableActionRoots(contract,definition,data=root.RoyaleCatalog?.DATA){
 const roots=definition.actionRoots||{},directory=/^(sc3d\/characters\/[^/]+\/[^/]+\/)/.exec(reference(contract.prefab))?.[1],result=new Set(directory?Object.values(roots).filter(path=>path.startsWith(directory)):[]);if(!data?.actions)return directory?[...result]:Object.values(roots);
 const seen=new Set(),tables=['actions','abilities','entities','buffs','projectiles','areas'];
 const visit=value=>{if(typeof value==='string'){if(roots[value])result.add(roots[value]);for(const table of tables){const record=data[table]?.[value];if(record&&!seen.has(record)){seen.add(record);visit(record);}}}else if(Array.isArray(value)){for(const child of value)visit(child);}else if(value&&typeof value==='object'){for(const [key,child]of Object.entries(value))if(key!=='Name'&&key!=='Base')visit(child);}};
 visit(contract.sourceEntity);return [...result];
}
function timeDependentShader(source,variables={}){
 let animated=false;const remaining=source.replace(/fragmentMaterialUniforms\.(\w+)(?:\.([xyzwrgba]+))?\s*\*\s*sceneUniforms\.u_lightDirectionTime\.w/g,(_,key,components)=>{const value=variables[key],indices=components?[...components].map(c=>'xyzw'.indexOf(({r:'x',g:'y',b:'z',a:'w'})[c]||c)):null;animated||=Array.isArray(value)?(indices?indices.map(i=>value[i]):value).some(v=>Number(v)!==0):Number(value)!==0;return '';});
 return animated||/sceneUniforms\.u_lightDirectionTime\.w/.test(remaining);
}
// The imported fragment equations are unchanged. The adapter only replaces
// native instancing/UBO bindings with Three's skinned vertices and uniforms.
class Renderer{
 constructor(T,definition,loader,textureLoader,url){Object.assign(this,{T,definition,loader,textureLoader,url});this.textures=new Map();this.materials=new Set();this.templates=new Map();this.instances=new Map();this.group=new T.Group();this.body=[];this.overlays=new Map();this.overlaysByPath=new Map();this.activeOverlays=new Map();this.bodyMaterials=[];this.draws=0;this.materialDraws=0;}
 async texture(ref){const key=reference(ref).split('#')[0],entry=this.definition.textures[key];if(!entry)return null;if(!this.textures.has(key))this.textures.set(key,this.textureLoader.loadAsync(this.url(entry.file)).then(t=>{t.flipY=false;t.colorSpace=entry.colorSpace==='srgb'?this.T.SRGBColorSpace:this.T.NoColorSpace;t.wrapS=t.wrapT=this.T.RepeatWrapping;return t;}));return this.textures.get(key);}
 async material(path,base=null){
  const d=this.definition.materials[path];if(!d)return null;const T=this.T,family=d.resolvedShader,shaders=this.definition.shaders[family];if(!shaders)return null;
  const variables={...base?.userData.sourceVariables?.floats,...base?.userData.sourceVariables?.floatVectors,...base?.userData.sourceVariables?.textures,...d.resolvedVariables};
  // Empty inherited texture slots mean keep the model's own texture.
  for(const[k,v]of Object.entries(base?.userData.sourceVariables?.textures||{}))if(!variables[k])variables[k]=v;
  const frag=shaders.frag.variants[d.selectedVariants.frag]?.source,vert=shaders.vert.variants[family==='uber_pbr'?0:d.selectedVariants.vert&1]?.source;if(!frag||!vert)return null;
  const uniforms={},initial={};for(const source of [vert,frag])for(const match of source.matchAll(/layout\(std140\) uniform \w+\s*\{([\s\S]*?)\}\s*(\w+);/g)){const value={};for(const field of match[1].matchAll(/(?:\w+\s+)?(mat[34]|vec[234]|float)\s+(\w+);/g)){const type=field[1],name=field[2],v=variables[name];value[name]=type==='mat4'?new T.Matrix4():type==='mat3'?new T.Matrix3():type.startsWith('vec')?new T['Vector'+type.slice(3)]().fromArray(Array.isArray(v)?v:new Array(Number(type.slice(3))).fill(0)):Number(v)||0;}uniforms[match[2]]={value};}
  for(const match of frag.matchAll(/uniform\s+(?:\w+\s+)?sampler2D\s+(\w+);/g)){const name=match[1],inherited=base?.uniforms?.[name]?.value||(name==='diffuseTex'?base?.map:null);let texture=!d.resolvedVariables[name]&&inherited?inherited:await this.texture(variables[name]);if(!texture)texture=inherited;uniforms[name]={value:texture};}
  if(uniforms.fragmentObjectUniforms){const v=uniforms.fragmentObjectUniforms.value;v.u_color.set(1,1,1,1);v.color_mul.set(1,1,1,1);}
  for(const[k,v]of Object.entries(uniforms.fragmentMaterialUniforms?.value||{}))initial[k]=v?.clone?v.clone():v;
  const material=new T.ShaderMaterial({name:path.split('/').pop(),glslVersion:T.GLSL3,vertexShader:vertexSource(vert),fragmentShader:shaderSource(frag),uniforms,toneMapped:false,side:family==='uber_pbr'?(base?.side??T.FrontSide):T.DoubleSide,transparent:family!=='uber_pbr'||!!base?.transparent,depthWrite:family==='uber_pbr'&&!base?.transparent,blending:d.resolvedRenderStateFields?.[6]===6?T.AdditiveBlending:T.NormalBlending});
  if(family==='uber_pbr')material.defines.USE_TANGENT='';
  material.userData={...base?.userData,sourceLodMaterial:false,sourceFXMaterial:true,sourceFXFamily:family,sourceFXPath:path,sourceFXTimeDependent:timeDependentShader(frag,variables),initial};material.defaultAttributeValues={...material.defaultAttributeValues,tangent:[1,0,0,1]};this.materials.add(material);return material;
 }
 async prepare(actor){
  const records=this.definition.records,refs=new Set(),models=new Set(),overlays=new Map();const visit=n=>{for(const c of n?.components||[]){if(c.Model&&this.definition.meshes[reference(c.Model)])models.add(reference(c.Model));if(c.MaterialAsset){const path=reference(c.MaterialAsset),names=c.GeometryNames;if(!names?.length)overlays.set(path,null);else if(!overlays.has(path)||overlays.get(path)){const target=overlays.get(path)||new Set();for(const name of names)target.add(name);overlays.set(path,target);}}for(const v of[c.Prefab,c.Effect,c.BlueVfx,c.RedVfx])walk(reference(v));}for(const child of n?.children||[])visit(child);},walk=key=>{if(!key||refs.has(key))return;refs.add(key);visit(records[key]?.data);};visit(actor.contract.sourcePrefab?.data);for(const p of actor.contract.parts)for(const state of p.asm?.States||[])for(const e of state.Events||[])walk(reference(e.Effect));
  for(const path of reachableActionRoots(actor.contract,this.definition))walk(path);
  for(const key of models)this.templates.set(key,(await this.loader.loadAsync(this.url(this.definition.meshes[key].file))).scene);
  for(const binding of bodyOverrides(actor.contract)){const part=actor.parts[binding.part];let mesh=part.gltf.scene.getObjectByName(binding.name);if(!mesh)part.gltf.scene.traverse(o=>{if(o.isMesh&&o.userData.sourceName===binding.name)mesh=o;});if(!mesh?.material)continue;const original=mesh.material,materials=Array.isArray(original)?original:[original],changed=[];for(const base of materials)changed.push(await this.material(binding.material,base)||base);mesh.material=Array.isArray(original)?changed:changed[0];this.body.push({mesh,original,current:mesh.material});}
  const bodies=[];actor.group.traverse(mesh=>{if(mesh.isMesh&&mesh.material)bodies.push(mesh);});
  this.bodyMaterials=[...new Set(bodies.flatMap(mesh=>Array.isArray(mesh.material)?mesh.material:[mesh.material]).filter(m=>m.userData.sourceFXMaterial))];
  for(const [path,names]of overlays)for(const mesh of bodies){if(Array.isArray(mesh.material)||names&&!names.has(mesh.name))continue;const mat=await this.material(path,mesh.material);if(mat){const binding={mesh,material:mat,base:mesh.material};this.overlays.set(path+':'+mesh.uuid,binding);if(!this.overlaysByPath.has(path))this.overlaysByPath.set(path,[]);this.overlaysByPath.get(path).push(binding);}}
  // Resolve material/texture loading before the first frame, never mid-draw.
  for(const key of refs){const scan=n=>{for(const c of n?.components||[])if(c.Model&&this.templates.has(reference(c.Model)))for(const g of c.Geometries||[])if(g.MaterialOverride){const path=reference(g.MaterialOverride);if(!this.instances.has('warm:'+path))this.instances.set('warm:'+path,{material:awaitable(path)});}for(const ch of n?.children||[])scan(ch);};const awaitable=path=>this.material(path);scan(records[key]?.data);}
  await Promise.all([...this.instances.values()].map(v=>v.material));for(const[k,v]of this.instances)if(k.startsWith('warm:'))v.material=await v.material;
  this.actor=actor;return this;
 }
 uniformState(material,time,team,camera,light,values={},index=0){
  const T=this.T,u=material.uniforms,s=u.sceneUniforms?.value;if(s){s.u_invView.copy(camera.matrixWorld);s.u_projectionView.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);s.u_lightDirectionTime.set(...light.direction,time);s.u_cameraPosition.set(camera.position.x,camera.position.y,camera.position.z,1);s.u_dirLightColor.set(...light.direct,1);s.u_sceneAmbientColor.set(...light.ambient,light.ambientSpec);}
  if(u.fragmentObjectUniforms)u.fragmentObjectUniforms.value.u_color.set(...(team===1?[1,.12,.16]:[.12,.4,1]),1);
  const target=u.fragmentMaterialUniforms?.value;if(target){for(const[k,v]of Object.entries(material.userData.initial))if(target[k]?.copy)target[k].copy(v);else target[k]=v;for(const[k,v]of Object.entries(values)){const m=/^(?:Model\.mat(\d+)\.|Material\.|MaterialEffect\.mat\.)(\w+)(?:\.([xyzwrgba]))?$/.exec(k);if(!m||m[1]!==undefined&&Number(m[1])!==index||!(m[2]in target))continue;const component=m[3]&&({r:'x',g:'y',b:'z',a:'w'}[m[3]]||m[3]);if(component&&target[m[2]]?.isVector4||component&&target[m[2]]?.isVector3||component&&target[m[2]]?.isVector2)target[m[2]][component]=v;else if(!component&&typeof target[m[2]]==='number')target[m[2]]=v;}}
 }
 updateBody(effects,time,team,camera,light){
  for(const [mesh,base]of this.activeOverlays)mesh.material=base;this.activeOverlays.clear();
  for(const mat of this.bodyMaterials){this.uniformState(mat,time,team,camera,light);this.materialDraws++;}
  for(const effect of effects)if(effect.bodyMaterial&&effect.age>=0&&(effect.looped||effect.age<effect.duration)){const values=scopedValues(effect.tracks,effect.age);for(const v of this.overlaysByPath.get(effect.bodyMaterial)||[])if(!effect.component.GeometryNames?.length||effect.component.GeometryNames.includes(v.mesh.name)){v.mesh.material=v.material;this.activeOverlays.set(v.mesh,v.base);this.uniformState(v.material,time,team,camera,light,values);this.materialDraws++;}}
 }
 bodyTimeDependent(effects=[]){return this.bodyMaterials.some(m=>m.userData.sourceFXTimeDependent)||effects.some(e=>e.bodyMaterial&&e.age>=0&&(e.looped||e.age<e.duration)&&(this.overlaysByPath.get(e.bodyMaterial)||[]).some(v=>v.material.userData.sourceFXTimeDependent));}
 refreshMeshCamera(camera){this.group.traverse(o=>{for(const material of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){const s=material.uniforms?.sceneUniforms?.value;if(s){s.u_invView.copy(camera.matrixWorld);s.u_projectionView.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);s.u_cameraPosition.set(camera.position.x,camera.position.y,camera.position.z,1);}}});}
 updateMeshes(effects,time,team,camera,light,budget=96){
  const T=this.T;this.group.clear();let count=0;
  for(const effect of effects){if(!effect.model||effect.age<0||!effect.looped&&effect.age>=effect.duration||effect.chain.some(tr=>scopedValues(tr.tracks,effect.age).visible===0))continue;const template=this.templates.get(effect.model);if(!template)continue;const key=(effect.historyKey||effect.eventKey||'ambient')+':'+effect.model+':'+effect.path;let instance=this.instances.get(key);
   if(!instance){const object=template.clone(true),materials=[];object.traverse(mesh=>{if(!mesh.isMesh)return;const bindings=effect.component.Geometries||[],binding=bindings.find(g=>g.Name===mesh.name)||bindings[0],warm=this.instances.get('warm:'+reference(binding?.MaterialOverride))?.material;if(!warm){mesh.visible=false;return;}const material=warm.clone();material.uniforms=cloneUniforms(warm.uniforms);material.userData={...warm.userData};mesh.material=material;materials.push(material);this.materials.add(material);mesh.frustumCulled=false;});instance={object,materials};this.instances.set(key,instance);}
   let matrix=(effect.bone?this.actor.parts[effect.part]?.gltf.scene.getObjectByName(effect.bone.BoneName)?.matrixWorld:this.actor.group.matrixWorld)?.clone();if(!matrix)continue;
   if(effect.bone?.IgnoreBoneScale||effect.bone?.IgnoreBoneRotation){const p=new T.Vector3(),q=new T.Quaternion(),s=new T.Vector3();matrix.decompose(p,q,s);if(effect.bone.IgnoreBoneScale)s.set(1,1,1);if(effect.bone.IgnoreBoneRotation)q.identity();matrix.compose(p,q,s);}
   if(effect.bone?.Offset)matrix.multiply(new T.Matrix4().makeTranslation(...effect.bone.Offset));
   for(const tr of effect.chain){const v=sampledTransform(tr,effect.age);matrix.multiply(new T.Matrix4().compose(new T.Vector3().fromArray(v.pos),new T.Quaternion().setFromEuler(new T.Euler(...v.rot.map(v=>v*Math.PI/180))),new T.Vector3().fromArray(v.scl)));}
   instance.object.matrixAutoUpdate=false;instance.object.matrix.copy(matrix);instance.object.updateMatrixWorld(true);this.group.add(instance.object);
   for(const[index,mat]of instance.materials.entries()){this.uniformState(mat,time,team,camera,light,scopedValues(effect.tracks,effect.age),index);if(mat.uniforms.objectUniforms){const rot=new T.Matrix4().extractRotation(matrix);mat.uniforms.objectUniforms.value.u_model.setFromMatrix4(rot);}}
   count++;if(count>=Math.min(96,budget))break;
  }
  // Instances carry no gameplay state; recycle old event slots to bound memory.
  for(const[key,v]of this.instances)if(!key.startsWith('warm:')&&this.instances.size>160&&v.object.parent!==this.group){for(const m of v.materials){m.dispose();this.materials.delete(m);}this.instances.delete(key);}
  this.draws+=count;return count;
 }
 get dynamic(){return this.bodyTimeDependent();}
 get shadowDiffers(){return this.bodyMaterials.some(m=>m.userData.sourceFXFamily?.startsWith('vfx_'));}
 async bytes(){const textures=await Promise.all(this.textures.values());return textures.reduce((n,t)=>n+(t.image?.width||0)*(t.image?.height||0)*4*4/3,0)+[...this.templates.values()].reduce((n,g)=>{g.traverse(o=>{if(o.geometry){for(const a of Object.values(o.geometry.attributes))n+=a.array.byteLength;n+=o.geometry.index?.array.byteLength||0;}});return n;},0);}
 dispose(){for(const v of this.overlays.values())v.mesh.material=v.base;for(const v of this.body)v.mesh.material=v.original;for(const m of this.materials)m.dispose();for(const p of this.textures.values())p.then(t=>t.dispose());for(const g of this.templates.values())g.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();});this.instances.clear();this.group.clear();}
}
return {reference,bezier,timelineValue,timelineState,timelineBindings,prefabLifetime,sourceMeshPlan,scopedValues,sampledTransform,shaderSource,vertexSource,bodyOverrides,cloneUniforms,reachableActionRoots,timeDependentShader,Renderer};
});
