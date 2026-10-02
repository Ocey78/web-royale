/* Original modern client meshes, textures, skeletons and ASM motion, rendered
   locally into the battle canvas. Only presentation clocks are sampled here. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.RoyaleModern3D=api;})(globalThis,function(root){'use strict';
const UNITS=32,TAU=Math.PI*2,POSE_BYTES=48*1024*1024,MODEL_BYTES=128*1024*1024,MAX_ACTORS=16;
const STATE_NAMES={idle:['Idle'],run:['Walk','Run'],attack:['Attack'],deploy:['Deploy'],skill:['Skill','Custom1'],charge:['Charge','Walk'],dash:['Dash','Charge','Walk'],loading:['Loading','Attack']};
function resolveState(asm,name,entity={},seen=new Set()){
 name=name||asm?.DefaultState;if(!name||seen.has(name))return null;seen.add(name);const s=asm?.States?.find(s=>s.Name===name);if(!s)return null;
 if(s.Type==='AnimClip')return s.Name;const children=s.SubStates||[];if(!children.length)return null;
 let index=0;if(s.Type==='Selector'){const value=entity.shield>0?1:0;index=Math.max(0,(s.SwitchValues||[]).indexOf(value));}
 else if(s.Type==='Random')index=Math.abs(Math.floor(entity.visualAttack?.sequence??entity.visualSequence??0))%children.length;
 return resolveState(asm,children[Math.min(index,children.length-1)],entity,seen);
}
// Battle prefabs author their face along -Y; +Y projects up the field. Rotate
// that actual face vector into the requested screen heading without mirroring.
function sourceYaw(heading){return Math.PI/2-(Number.isFinite(heading)?heading:-Math.PI/2);}
function clipPose(clip,elapsed,state,attack=null,attackDuration=0){
 const fps=Number(clip?.fps)||30,count=Math.max(1,Number(clip?.frames)||1),duration=count/fps,last=(count-1)/fps;
 let t=Math.max(0,Number(elapsed)||0),done=false;const oneShot=!['idle','run','charge'].includes(state);
 if(state==='attack'){
  const marker=clip.markers?.find(m=>m.Name==='action_frame');
  if(marker&&attack){const action=(marker.Frame||0)/fps,released=Number.isFinite(attack.releasedAt);t=released?action+Math.max(0,t-attack.releasedAt):Math.max(0,Math.min(action-1e-6,action*(attack.windup>0?t/attack.windup:1)));done=released&&t>=duration;}
  else if(attackDuration>0){done=t>=attackDuration;t*=duration/attackDuration;}else done=t>=duration;
 }
 if(oneShot)t=Math.min(last,t);else t%=duration;
 const frame=Math.max(0,Math.min(count-1,Math.floor(t*fps+1e-7)));return {frame,time:frame/fps,done,duration};
}
function rasterDensity(policy={}){const value=Math.max(Number(policy.battleDensity)||1,(Number(policy.textureScale)||1)*1.5);return Math.max(1,Math.min(4,value));}
class PoseCache{
 constructor(limit=POSE_BYTES,release=value=>{if(value?.image){value.image.width=1;value.image.height=1;}}){this.limit=limit;this.release=release;this.entries=new Map();this.bytes=0;}
 get(key){const e=this.entries.get(key);if(!e)return undefined;this.entries.delete(key);this.entries.set(key,e);return e.value;}
 set(key,value,bytes){if(this.entries.has(key)){const old=this.entries.get(key);this.entries.delete(key);this.bytes-=old.bytes;this.release(old.value);}if(bytes>this.limit){this.release(value);return false;}while(this.bytes+bytes>this.limit&&this.entries.size){const [key,e]=this.entries.entries().next().value;this.entries.delete(key);this.bytes-=e.bytes;this.release(e.value);}this.entries.set(key,{value,bytes});this.bytes+=bytes;return true;}
 clear(){for(const e of this.entries.values())this.release(e.value);this.entries.clear();this.bytes=0;}
}
let manifest={heroes:{},errors:{}},assetBase='assets/modern-heroes/',vendorBase='assets/vendor/three/',configured=Promise.resolve(),onError=null,error=null,contextLost=false,enginePromise=null,T,loader,textureLoader,renderer,scene,camera,ambient,sun;
const actors=new Map(),pending=new Map(),failed=new Map(),metrics=new Map(),poses=new PoseCache();let modelBytes=0,renders=0,hits=0,generation=0;
function report(e,id){const message=`Original 3D art${id?' for '+id:''}: ${e?.message||e}`;error=message;if(id)failed.set(id,message);if(onError)onError(message,id);return message;}
function localURL(file,base=assetBase){return new URL(file,new URL(base,root.document?.baseURI||root.location?.href||'http://localhost/')).href;}
function configure(value,base='assets/modern-heroes/',options={}){
 generation++;assetBase=base;vendorBase=options.vendorBase||'assets/vendor/three/';onError=options.onError||null;error=null;failed.clear();poses.clear();
 for(const actor of actors.values())disposeActor(actor);actors.clear();pending.clear();modelBytes=0;metrics.clear();
 if(typeof value==='string')configured=fetch(localURL(value,'')).then(r=>{if(!r.ok)throw Error('manifest '+r.status);return r.json();}).then(v=>{manifest=v;return manifest;}).catch(e=>{report(e);throw e;});
 else{manifest=value||{heroes:{},errors:{}};configured=Promise.resolve(manifest);}return configured;
}
function has(id){return Object.prototype.hasOwnProperty.call(manifest.heroes||{},id);}
function unsupported(id){return failed.get(id)||manifest.errors?.[id]||null;}
async function engine(){
 if(!enginePromise)enginePromise=(async()=>{
  T=await import(localURL('three.module.js',vendorBase));const {GLTFLoader}=await import(localURL('GLTFLoader.js',vendorBase));loader=new GLTFLoader();textureLoader=new T.TextureLoader();
  renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'low-power'});renderer.setPixelRatio(1);renderer.setClearColor(0,0);renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();contextLost=true;report(Error('WebGL context lost; source atlas fallback remains available'));});
  renderer.domElement.addEventListener('webglcontextrestored',()=>{contextLost=false;poses.clear();});
  scene=new T.Scene();camera=new T.OrthographicCamera(-4,4,6,-2,.01,100);camera.up.set(0,0,1);camera.position.set(0,-Math.sqrt(7)*4,12);camera.lookAt(0,0,0);
  ambient=new T.AmbientLight(0xffffff,2);sun=new T.DirectionalLight(0xffffff,3);scene.add(ambient,sun);return true;
 })().catch(e=>{report(e);throw e;});return enginePromise;
}
function lightFromPrefab(prefab){let found;const visit=node=>{for(const c of node?.components||[])if(c.objectType===5007&&!found)found={...c,rot:node.rot||[0,0,0]};for(const child of node?.children||[])visit(child);};visit(prefab?.data);return found;}
function configureLighting(actor){const light=lightFromPrefab(actor.contract.sourcePrefab),rgb=value=>new T.Color().setRGB((value?.r??255)/255,(value?.g??255)/255,(value?.b??255)/255);
 sun.color.copy(rgb(light?.Color));sun.intensity=Number(light?.Intensity)||3;ambient.color.copy(rgb(light?.Ambient));ambient.intensity=2;
 const rotation=light?.rot||[-80.6,0,-32.6];sun.position.set(0,-1,0).applyEuler(new T.Euler(...rotation.map(d=>d*Math.PI/180))).multiplyScalar(8);sun.target.position.set(0,0,0);sun.target.updateMatrixWorld();
}
function actorMemory(actor){const geometry=new Set(),textures=new Set();let bytes=0;actor.group.traverse(o=>{if(o.geometry&&!geometry.has(o.geometry)){geometry.add(o.geometry);for(const attribute of Object.values(o.geometry.attributes))bytes+=attribute.array.byteLength;bytes+=o.geometry.index?.array?.byteLength||0;}for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])for(const v of Object.values(m))if(v?.isTexture)textures.add(v);});for(const part of actor.parts)for(const texture of part.masks)textures.add(texture);for(const texture of textures){const im=texture.source?.data||texture.image;bytes+=(im?.width||0)*(im?.height||0)*4*(texture.generateMipmaps?4/3:1);}return Math.ceil(bytes);}
function disposeActor(actor){if(!actor)return;scene?.remove(actor.group);const geometries=new Set(),materials=new Set(),textures=new Set();actor.group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});for(const part of actor.parts){part.mixer.stopAllAction();part.mixer.uncacheRoot(part.gltf.scene);for(const t of part.masks)textures.add(t);}for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures){t.source?.data?.close?.();t.dispose();}}
function trimActors(keep){while((actors.size>MAX_ACTORS||modelBytes>MODEL_BYTES)&&actors.size>1){const entry=[...actors].find(([id])=>id!==keep);if(!entry)break;actors.delete(entry[0]);modelBytes-=entry[1].bytes;disposeActor(entry[1]);}}
async function loadActor(id){
 if(actors.has(id)){const actor=actors.get(id);actors.delete(id);actors.set(id,actor);return actor;}if(pending.has(id))return pending.get(id);if(!has(id)||failed.has(id))return null;
 const epoch=generation,promise=(async()=>{
  await engine();const contract=manifest.heroes[id],group=new T.Group(),parts=[],actor={id,contract,group,parts,bytes:0};
  try{for(const p of contract.parts){
   const gltf=await loader.loadAsync(localURL(p.file)),outer=new T.Group();let chain=outer;
   for(const tr of p.transforms||[]){const child=new T.Group();child.position.fromArray(tr.pos||[0,0,0]);child.rotation.set(...(tr.rot||[0,0,0]).map(x=>x*Math.PI/180));child.scale.fromArray(tr.scl||[1,1,1]);chain.add(child);chain=child;}chain.add(gltf.scene);
   if(p.attach){const bone=parts[p.attach.part]?.gltf.scene.getObjectByName(p.attach.bone);if(!bone)throw Error('missing source mount bone '+p.attach.bone);bone.add(outer);}else group.add(outer);
   const uniform={value:new T.Vector3(1,1,1)},masks=[],materials=[];gltf.scene.traverse(o=>{for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])if(m.userData.teamMask)materials.push(m);});
   for(const m of new Set(materials)){const texture=await textureLoader.loadAsync(localURL(m.userData.teamMask));texture.flipY=false;masks.push(texture);m.onBeforeCompile=shader=>{shader.uniforms.sourceTeamMask={value:texture};shader.uniforms.sourceTeamColor=uniform;shader.fragmentShader='uniform sampler2D sourceTeamMask;uniform vec3 sourceTeamColor;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*sourceTeamColor,texture2D(sourceTeamMask,vMapUv).b);');};m.customProgramCacheKey=()=>`source-team-mask:${m.userData.teamMask}`;m.needsUpdate=true;}
   const mixer=new T.AnimationMixer(gltf.scene);parts.push({gltf,metadata:p,mixer,uniform,masks,actions:new Map(gltf.animations.map(clip=>[clip.name,mixer.clipAction(clip)]))});
  }
  if(!parts.length)throw Error('source actor contains no converted geometry');group.updateMatrixWorld(true);actor.bytes=actorMemory(actor);
  if(epoch!==generation){disposeActor(actor);return null;}actors.set(id,actor);modelBytes+=actor.bytes;trimActors(id);measureHead(actor);return actor;
  }catch(e){disposeActor(actor);report(e,id);return null;}
 })();pending.set(id,promise);promise.finally(()=>{if(pending.get(id)===promise)pending.delete(id);}).catch(()=>{});return promise;
}
async function prepareActors(ids=[]){await configured;const result=[];for(const id of new Set(ids)){if(!has(id))continue;try{const actor=await loadActor(id);result.push({id,ready:!!actor,error:unsupported(id)});}catch(e){report(e,id);result.push({id,ready:false,error:unsupported(id)});}}return result;}
function choosePartPose(part,state,elapsed,options,actor){
 const entity=options.entity||{},candidates=STATE_NAMES[state]||[state],choose=names=>names.map(name=>resolveState(part.metadata.asm,name,entity)).find(name=>name&&part.actions.has(name));
 let name=choose(candidates)||choose([part.metadata.asm.DefaultState])||choose(['Idle'])||part.gltf.animations[0]?.name;if(!name)return null;
 let t=elapsed;if(['run','charge'].includes(state)){if(entity&&!entity.air&&Number.isFinite(entity.walk))t=entity.walk;t*=Math.max(.1,1+(Number(actor.contract.sourceEntity?.WalkTweakPercentage)||0)/100);}
 let pose=clipPose(part.metadata.animations[name],t,state,entity.visualAttack,options.attackDuration||0);
 if(state==='attack'&&pose.done){name=choose(['Idle'])||name;pose=clipPose(part.metadata.animations[name],options.idleTime??0,'idle');}return {name,...pose};
}
function applyPose(actor,partPoses,team,yaw){actor.group.rotation.z=yaw;for(let index=0;index<actor.parts.length;index++){const part=actor.parts[index],pose=partPoses[index];part.actions.forEach(a=>a.stop());if(pose){const action=part.actions.get(pose.name);action.reset();action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();part.mixer.setTime(pose.time);}part.uniform.value.set(...(team===1?[1,.12,.16]:[.12,.4,1]));}actor.group.updateMatrixWorld(true);}
function actorBounds(actor){actor.group.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();o.computeBoundingBox();}});return new T.Box3().setFromObject(actor.group);}
function projectedBounds(box){let left=Infinity,right=-Infinity,top=-Infinity,bottom=Infinity;for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const py=.75*y+Math.sqrt(7)/4*z;left=Math.min(left,x);right=Math.max(right,x);top=Math.max(top,py);bottom=Math.min(bottom,py);}return {left,right,top,bottom};}
function measureHead(actor){if(metrics.has(actor.id))return;const p=actor.parts.map(part=>choosePartPose(part,'idle',0,{},actor));applyPose(actor,p,0,0);const box=projectedBounds(actorBounds(actor)),factor=(5/6)*(Number(actor.contract.sourceEntity?.Scale)||100)/100;metrics.set(actor.id,Math.max(18,Math.min(140,box.top*UNITS*factor))+5);}
function rasterPose(actor,partPoses,team,yaw,density){
 applyPose(actor,partPoses,team,yaw);const bounds=projectedBounds(actorBounds(actor)),margin=.08;
 const left=bounds.left-margin,right=bounds.right+margin,top=bounds.top+margin,bottom=bounds.bottom-margin,width=right-left,height=top-bottom;
 if(![width,height].every(v=>Number.isFinite(v)&&v>0))throw Error('invalid source model bounds');
 const effective=Math.min(density,1536/(width*UNITS),1536/(height*UNITS)),w=Math.max(2,Math.ceil(width*UNITS*effective)),h=Math.max(2,Math.ceil(height*UNITS*effective));
 camera.left=left;camera.right=right;camera.top=top;camera.bottom=bottom;camera.updateProjectionMatrix();renderer.setSize(w,h,false);configureLighting(actor);scene.add(actor.group);try{renderer.render(scene,camera);}finally{scene.remove(actor.group);}
 const image=root.document.createElement('canvas');image.width=w;image.height=h;image.getContext('2d').drawImage(renderer.domElement,0,0);renders++;return {image,x:left*UNITS,y:-top*UNITS,width:width*UNITS,height:height*UNITS};
}
function tintRaster(raster,color,key){if(!color)return raster;const cacheKey=key+':'+color.join(','),existing=poses.get(cacheKey);if(existing)return existing;const image=root.document.createElement('canvas');image.width=raster.image.width;image.height=raster.image.height;const c=image.getContext('2d',{willReadFrequently:true});c.drawImage(raster.image,0,0);const pixels=c.getImageData(0,0,image.width,image.height);for(let i=0;i<pixels.data.length;i+=4){for(let j=0;j<3;j++)pixels.data[i+j]=Math.min(255,pixels.data[i+j]*color[4+j]/255+color[j]);pixels.data[i+3]*=color[3]/255;}c.putImageData(pixels,0,0);const result={...raster,image};poses.set(cacheKey,result,image.width*image.height*4);return result;}
function draw(c,id,x,y,team,time,state='idle',heading=-Math.PI/2,started=0,scale=1,options={}){
 if(!has(id)||failed.has(id)||contextLost)return false;const actor=actors.get(id);if(!actor){loadActor(id).catch(e=>report(e,id));return false;}actors.delete(id);actors.set(id,actor);
 try{
  if(state==='attack'&&options.entity?.visualAttackCancelled)state='idle';const elapsed=options.elapsed??Math.max(0,time-started),partPoses=actor.parts.map(part=>choosePartPose(part,state,elapsed,{...options,idleTime:options.idleTime??time},actor));
  const policy=root.RoyaleGraphics?.current||{},density=rasterDensity(policy),steps=policy.textures==='ultra'?180:policy.textures==='max'?144:72,index=((Math.round(sourceYaw(heading)/TAU*steps)%steps)+steps)%steps,yaw=index/steps*TAU;
  const key=[id,team===1?1:0,density,steps,index,...partPoses.map(p=>p?`${p.name}:${p.frame}`:'static')].join('|');let raster=poses.get(key);if(raster)hits++;else{raster=rasterPose(actor,partPoses,team,yaw,density);poses.set(key,raster,raster.image.width*raster.image.height*4);}
  const source=actor.contract.sourceEntity||{},factor=scale*(5/6)*(Number(source.Scale)||100)/100,height=options.height??Math.max(0,Number(source.FlyingHeight)||0)/1000*20;
  c.save();try{c.translate(x,y-height);c.scale(factor,factor);c.filter=root.RoyaleNative?.teamFilter?.(team)||'none';const paint=color=>{const image=tintRaster(raster,color,key);c.drawImage(image.image,image.x,image.y,image.width,image.height);};
  if(options.entity&&root.RoyalePresentation?.ready)root.RoyalePresentation.filtered(c,options.entity,time,paint);else paint(null);}finally{c.restore();}return true;
 }catch(e){report(e,id);return false;}
}
function headHeight(id){return metrics.get(id)||null;}
function summary(){return {actors:actors.size,modelBytes,modelBudget:MODEL_BYTES,poseEntries:poses.entries.size,poseBytes:poses.bytes,poseBudget:POSE_BYTES,renders,hits,pending:pending.size,error,failed:Object.fromEntries(failed)};}
return {configure,prepareActors,has,unsupported,draw,headHeight,summary,resolveState,sourceYaw,clipPose,rasterDensity,PoseCache,get error(){return error;}};
});
