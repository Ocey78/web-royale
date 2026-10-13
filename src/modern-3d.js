/* Original modern client meshes, textures, skeletons and ASM motion, rendered
   locally into the battle canvas. Only presentation clocks are sampled here. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.RoyaleModern3D=api;})(globalThis,function(root){'use strict';
const UNITS=32,TAU=Math.PI*2,POSE_BYTES=48*1024*1024,MODEL_BYTES=128*1024*1024,MAX_ACTORS=16;
const STATE_NAMES={idle:['Idle'],run:['Walk','Run'],attack:['Attack'],deploy:['Deploy'],ability:['Skill','Custom1'],skill:['Skill','Custom1'],charge:['Charge','Walk'],dash:['Dash','Charge','Walk'],loading:['Loading','Attack']};
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
function clipPose(clip,elapsed,state,attack=null,attackDuration=0,descriptor={}){
 const fps=Number(clip?.fps)||30,count=Math.max(1,Number(clip?.frames)||1),start=Math.max(0,Math.min(count-1,Number(descriptor.StartFrame)||0)),end=Math.max(start,Math.min(count-1,descriptor.EndFrame==null?count-1:Number(descriptor.EndFrame))),speed=Math.max(.01,Number(descriptor.BaseSpeed)||1),duration=(end-start+1)/fps/speed,last=(end-start)/fps;
 let t=Math.max(0,Number(elapsed)||0),done=false;const oneShot=descriptor.Loop===true?false:descriptor.Loop===false?true:!['idle','run','charge'].includes(state);
 if(state==='attack'){
  const marker=clip.markers?.find(m=>m.Name==='action_frame');
  if(marker&&attack){const action=Math.max(0,(marker.Frame||0)-start)/fps,released=Number.isFinite(attack.releasedAt);t=released?action+Math.max(0,t-attack.releasedAt)*speed:Math.max(0,Math.min(action-1e-6,action*(attack.windup>0?t/attack.windup:1)));done=released&&t>=(end-start+1)/fps;}
  else if(attackDuration>0){done=t>=attackDuration;t*=(end-start+1)/fps/attackDuration;}else {done=t>=duration;t*=speed;}
 }else {done=oneShot&&t>=duration;t*=speed;}
 if(oneShot)t=Math.min(last,t);else t%=((end-start+1)/fps);
 const frame=Math.max(start,Math.min(end,start+Math.floor(t*fps+1e-7)));return {frame,time:start/fps+t,done,duration};
}
// Authored transitions retain only the previous presented pose. Absolute time
// makes shadow/body sampling idempotent and clears future poses on replay seek.
class PoseHistory{
 constructor({maxUnits=64}={}){this.maxUnits=maxUnits;this.entries=new Map();}
 get size(){return this.entries.size;}
 clear(){this.entries.clear();}
 sample(id,activation,now,partPoses,parts,attack=null){
  if(id===undefined||!Number.isFinite(now))return[];
  let old=this.entries.get(id);if(old&&(now<old.time||now-old.time>.5)){this.entries.delete(id);old=null;}
  let transitions=old?.transitions||[];
  if(old&&old.activation!==activation){transitions=[];for(let index=0;index<partPoses.length;index++){
   const from=old.poses[index],to=partPoses[index];if(!from||!to||from.name===to.name)continue;
   const states=parts[index]?.asm?.States||[],incoming=states.find(s=>s.Name===to.name),outgoing=states.find(s=>s.Name===from.name),times=[incoming?.TransInTime,outgoing?.TransOutTime].filter(v=>Number(v)>0);
   let duration=times.length?Math.min(...times):0;if(attack)duration=Math.min(duration,Math.max(0,Number(attack.windup)||0));
   if(duration>0)transitions.push({index,from:{...from},born:now,duration});
  }}
  transitions=transitions.filter(t=>now-t.born<t.duration);
  this.entries.delete(id);this.entries.set(id,{activation,time:now,poses:partPoses.map(p=>p&&({...p})),transitions});
  while(this.entries.size>this.maxUnits)this.entries.delete(this.entries.keys().next().value);
  return transitions.map(t=>({index:t.index,from:t.from,weight:Math.max(0,Math.min(1,(now-t.born)/t.duration))}));
 }
}
function meshVisibility(metadata,name,frame){
 const result={};for(const event of metadata.asm?.States?.find(s=>s.Name===name)?.Events||[]){
  if(event.Event!=='HideMesh'||frame<(Number(event.Frame)||0)||event.HasEndFrame&&frame>Number(event.EndFrame))continue;
  for(const geometry of event.GeometryNames||[])result[geometry]=!event.HideMesh;
 }return result;
}
// Presentation history never writes to units, simulation RNG or replay data.
// Frame sampling can change render order; an activation fires each source event
// once, and its billboards finish their own lifetime after the clip changes.
class FXHistory{
 constructor({maxEffects=128,maxUnits=64}={}){this.maxEffects=maxEffects;this.maxUnits=maxUnits;this.entries=new Map();this.units=new Map();}
 get size(){return this.entries.size;}
 update(unit,activation,time,effects,lifetime){
  let state=this.units.get(unit);if(state&&time<state.time)for(const[key,e]of this.entries)if(e.unit===unit)this.entries.delete(key);if(!state||state.activation!==activation||time<state.time){state={activation,time,seen:new Set()};this.units.set(unit,state);}state.time=time;
  while(this.units.size>this.maxUnits){const oldest=this.units.keys().next().value;this.units.delete(oldest);for(const[key,e]of this.entries)if(e.unit===oldest)this.entries.delete(key);}
  for(const[key,e]of this.entries)if(e.unit===unit&&(time>=e.until||time<e.born-1))this.entries.delete(key);
  for(const effect of effects){if(!effect.eventKey)continue;const leaf=effect.eventKey+':'+(effect.particle||effect.movieclip)+':'+JSON.stringify(effect.chain),key=String(unit)+':'+activation+':'+leaf;if(state.seen.has(leaf))continue;state.seen.add(leaf);const life=Math.max(0,Math.min(8,lifetime(effect))),born=time-effect.age;if(time<born+life)this.entries.set(key,{unit,born,until:born+life,effect:{...effect,historyKey:key}});}
  while(this.size>this.maxEffects)this.entries.delete(this.entries.keys().next().value);
  return [...effects.filter(e=>!e.eventKey),...[...this.entries.values()].filter(e=>e.unit===unit).map(e=>({...e.effect,age:time-e.born}))];
 }
 clear(){this.entries.clear();this.units.clear();}
}
const fxHistory=new FXHistory();let fxSprites=0;
function sourceFXLifetime(effect,assets,library){
 if(effect.movieclip){const ref=sourceReference(effect.movieclip),slash=ref.lastIndexOf('/'),stem=ref.slice(0,slash).split('/').pop(),sc=library?.scenes['modernfx_'+stem]||library?.scenes[stem];return sc?.duration(ref.slice(slash+1))||1;}
 const e=assets[effect.particle]?.emitter;if(!e)return 0;let last=0;for(const c of e.components||[])if(c.__class==='SpawnBurst')last=Math.max(last,...(c.bursts||[]).map(b=>Number(b.t)||0));else if(c.__class==='SpawnRate')last=Math.max(last,Number(c.duration)||0);
 return last+Math.max(Number(sourceCurve(e.lifetime,0))||0,Number(sourceCurve(e.lifetime,1))||0)+(Number(e.lifetimeJitter)||0);
}
function sourceCurve(value,t){
 if(typeof value==='number')return value;if(!Array.isArray(value))return null;
 const mix=(a,b,f)=>Array.isArray(a)?a.map((v,i)=>v+(b[i]-v)*f):a+(b-a)*f;t=Math.max(0,Math.min(1,t));
 if(value.length===2)return mix(value[0],value[1],t);if(value.length===3)return value;
 if(value.length!==6)return null;const cubic=(u,a,b)=>3*(1-u)*(1-u)*u*a+3*(1-u)*u*u*b+u*u*u;
 let lo=0,hi=1;for(let i=0;i<24;i++){const u=(lo+hi)/2;if(cubic(u,value[0],value[2])<t)lo=u;else hi=u;}
 return mix(value[4],value[5],cubic((lo+hi)/2,value[1],value[3]));
}
function sourceRandom(seed,slot){let n=2166136261;for(const c of String(seed)+':'+slot)n=Math.imul(n^c.charCodeAt(0),16777619);n=Math.imul(n^(n>>>16),2246822507);return ((n^(n>>>13))>>>0)/4294967296;}
function sourceParticleSamples(record,time,seed,budget=24){
 const e=record?.emitter,r=record?.render;if(!e||!r||time<0||!budget)return[];const components=e.components||[];
 if(components.some(c=>!['SpawnBurst','SpawnRate','SpawnPlanar'].includes(c.__class))||sourceCurve(r.alpha??1,.5)===null)return[];
 const max=Math.min(48,Math.max(0,Math.floor(budget)),e.maxParticleCount||48),lifeMax=Math.max(.001,Number(sourceCurve(e.lifetime,1))||0)+(Number(e.lifetimeJitter)||0),births=[];
 for(const c of components){if(c.__class==='SpawnBurst'){const period=Math.max(.001,lifeMax),cycle=e.emitterLoop?Math.floor(time/period):0;for(let loop=Math.max(0,cycle-1);loop<=cycle;loop++)for(const [bi,b]of(c.bursts||[]).entries())for(let j=0;j<(b.c||1);j++)births.push({at:loop*period+(b.t||0),key:'b'+bi+':'+loop+':'+j});}
  if(c.__class==='SpawnRate'){const rate=Math.max(.001,Number(c.spawnRate)||0),last=Math.floor(Math.min(time,c.infinite?time:Number(c.duration)||0)*rate),first=Math.max(0,Math.floor((time-lifeMax)*rate));for(let i=last;i>=first&&births.length<max*2;i--)births.push({at:i/rate,key:'r'+i});}}
 const out=[],planar=components.find(c=>c.__class==='SpawnPlanar')||{},offset=e.spawnPointOffset||{},gravity=e.gravity||[0,0,0],range=(a,b,rand)=>(Number(a)||0)+((Number(b??a)||0)-(Number(a)||0))*rand;
 for(const birth of births){if(out.length>=max)break;const random=k=>sourceRandom(seed+':'+birth.key,k),age=time-birth.at,life=Math.max(.001,Number(sourceCurve(e.lifetime,birth.at))+range(-e.lifetimeJitter,e.lifetimeJitter,random(0)));if(age<0||age>=life)continue;const t=age/life,angle=range(planar.minAngle,planar.maxAngle,random(1))*Math.PI/180,speed=range(planar.minSpeedXY,planar.maxSpeedXY,random(2)),zSpeed=range(planar.minSpeedZ,planar.maxSpeedZ,random(3)),radius=range(planar.spawnMinSize,planar.spawnMaxSize,random(4)),fade=Number(r.alphaFadeout)||0;
  const scale=(Number(sourceCurve(r.scale??1,t))+range(-r.scaleJitter,r.scaleJitter,random(5)))*(Number(r.globalScale)||1),alpha=Number(sourceCurve(r.alpha??1,t))*Math.min(1,fade?(life-age)/fade:1);if(!Number.isFinite(scale)||!Number.isFinite(alpha))continue;
  out.push({age,x:(offset.x||0)+Math.cos(angle)*(radius+speed*age)+gravity[0]*age*age/2,y:(offset.y||0)+Math.sin(angle)*(radius+speed*age)+gravity[1]*age*age/2,z:(offset.z||0)+zSpeed*age+gravity[2]*age*age/2,scale:Math.max(0,scale),alpha:Math.max(0,Math.min(1,alpha)),color:sourceCurve(r.color||[1,1,1],t),rotation:((Number(r.angle)||0)+range(-r.angleJitter,r.angleJitter,random(6))+((Number(r.rotationSpeed)||0)+range(-r.rotationSpeedJitter,r.rotationSpeedJitter,random(7)))*age)*Math.PI/180,movieclip:record.movieclip?.[Math.floor(random(8)*(record.movieclip?.length||1))]});
 }return out;
}
function sourceReference(value){return String(value||'').split(' | ')[0];}
function sourceFXPlan(contract,partPoses,assets,time,team){
 const out=[],visit=(node,chain,part,age,seen,bone=null,eventKey=null)=>{if(!node||seen.size>24)return;const components=node.components||[],model=components.find(c=>c.Model),mount=components.find(c=>c.objectType===5012);
  if(model){const index=contract.parts.findIndex(p=>p.sourceModel===sourceReference(model.Model));if(index>=0)part=index;}
  if(mount){bone=mount;chain=[];}chain=[...chain,{pos:node.pos,rot:node.rot,scl:node.scl}];
  for(const component of components){if(component.objectType===5004||component.objectType===5008)out.push({component,particle:sourceReference(component.Particle),movieclip:component.MovieClip,chain,part,bone,eventKey,age:age-(Number(component.Delay)||0)});
   for(const ref of [component.Prefab,component.Effect,component.objectType===5025?(team===1?component.RedVfx:component.BlueVfx):null]){const path=sourceReference(ref);if(path&&!seen.has(path)&&assets[path]?.data)visit(assets[path].data,chain,part,age,new Set([...seen,path]),bone,eventKey);}}
  for(const child of node.children||[])visit(child,chain,part,age,seen,bone,eventKey);
 };
 visit(contract.sourcePrefab?.data,[],0,time,new Set());
 for(const [part,pose]of partPoses.entries()){if(!pose)continue;const metadata=contract.parts[part],descriptor=metadata.asm?.States?.find(s=>s.Name===pose.name),fps=Number(metadata.animations[pose.name]?.fps)||30,speed=Number(descriptor?.BaseSpeed)||1;
  for(const [eventIndex,event]of (descriptor?.Events||[]).entries()){const frame=Number(event.Frame)||0,path=sourceReference(event.Effect);if(event.Event==='Effect'&&frame<=pose.frame&&assets[path]?.data)visit(assets[path].data,metadata.transforms||[],part,(pose.frame-frame)/fps/speed,new Set([path]),null,part+':'+pose.name+':'+eventIndex);}
 }return out;
}
function drawSourceFX(c,actor,partPoses,team,time,seed,effects){
 const library=root.RoyaleNative?.library,fx=library?.fx;if(!library)return;const policy=root.RoyaleGraphics?.current;let budget=root.RoyaleGraphics?root.RoyaleGraphics.particleBudget(policy?.particles||'good',false):24;if(!budget)return;
 for(const effect of effects||sourceFXPlan(actor.contract,partPoses,manifest.vfxAssets||{},time,team)){if(effect.age<0||budget<=0)continue;const part=actor.parts[effect.part],bone=effect.bone&&part?.gltf.scene.getObjectByName(effect.bone.BoneName);if(effect.bone&&!bone)continue;
  if(effect.bone&&meshVisibility(part.metadata,partPoses[effect.part]?.name,partPoses[effect.part]?.frame??0)[effect.bone.BoneName]===false)continue;
  let matrix=(bone?.matrixWorld||actor.group.matrixWorld).clone();if(bone&&effect.bone.IgnoreBoneScale){const p=new T.Vector3(),q=new T.Quaternion(),s=new T.Vector3();matrix.decompose(p,q,s);matrix.compose(p,q,new T.Vector3(1,1,1));}
  for(const tr of effect.chain){const local=new T.Matrix4().compose(new T.Vector3().fromArray(tr.pos||[0,0,0]),new T.Quaternion().setFromEuler(new T.Euler(...(tr.rot||[0,0,0]).map(v=>v*Math.PI/180))),new T.Vector3().fromArray(tr.scl||[1,1,1]));matrix.multiply(local);}
  const samples=effect.movieclip?[{movieclip:effect.movieclip,age:effect.age,alpha:1,scale:1,x:0,y:0,z:0,rotation:0,color:[1,1,1]}]:sourceParticleSamples(manifest.vfxAssets?.[effect.particle],effect.age,seed+':'+(effect.historyKey||effect.particle),budget);
  for(const sample of samples){if(budget--<=0)break;const ref=sourceReference(sample.movieclip),slash=ref.lastIndexOf('/'),stem=ref.slice(0,slash).split('/').pop(),name=ref.slice(slash+1),sc=library.scenes['modernfx_'+stem]||library.scenes[stem];if(!sc||sc.id(name)===undefined||effect.component.Loop!==true&&sample.age>sc.duration(name))continue;if(fx&&policy&&fx.particlesUsed>=policy.frameParticles)break;
   const offset=effect.component.Offset||[0,0,0],point=new T.Vector3(sample.x+offset[0],sample.y+offset[1],sample.z+offset[2]).applyMatrix4(matrix),worldScale=new T.Vector3().setFromMatrixScale(matrix),scale=sample.scale*(effect.component.FollowScale?Math.max(worldScale.x,worldScale.y):1),color=sample.color||[1,1,1];
   c.save();try{c.translate(point.x*UNITS,-(.75*point.y+Math.sqrt(7)/4*point.z)*UNITS);c.rotate(sample.rotation);c.scale(scale,scale);c.globalAlpha*=sample.alpha;if(effect.component.BlendMode===1)c.globalCompositeOperation='lighter';sc.draw(c,name,sample.age,{loop:effect.component.Loop===true,initialColor:[0,0,0,255,...color.map(v=>v*255)]});}finally{c.restore();}if(fx)fx.particlesUsed++;fxSprites++;
  }
 }
}
function rasterDensity(policy={}){const value=Math.max(Number(policy.battleDensity)||1,(Number(policy.textureScale)||1)*1.5);return Math.max(1,Math.min(4,value));}
class PoseCache{
 constructor(limit=POSE_BYTES,release=value=>{if(value?.image){value.image.width=1;value.image.height=1;}}){this.limit=limit;this.release=release;this.entries=new Map();this.bytes=0;}
 get(key){const e=this.entries.get(key);if(!e)return undefined;this.entries.delete(key);this.entries.set(key,e);return e.value;}
 set(key,value,bytes){if(this.entries.has(key)){const old=this.entries.get(key);this.entries.delete(key);this.bytes-=old.bytes;this.release(old.value);}if(bytes>this.limit){this.release(value);return false;}while(this.bytes+bytes>this.limit&&this.entries.size){const [key,e]=this.entries.entries().next().value;this.entries.delete(key);this.bytes-=e.bytes;this.release(e.value);}this.entries.set(key,{value,bytes});this.bytes+=bytes;return true;}
 clear(){for(const e of this.entries.values())this.release(e.value);this.entries.clear();this.bytes=0;}
}
// These are soft resident targets: the current frame's finite source actor
// cohort stays loaded even when it exceeds them. Only inactive models may be
// disposed. Pins survive endFrame so asynchronous loads cannot evict actors
// still on screen; the next frame/menu replaces the cohort and trims the LRU.
class ActorCache{
 constructor({maxActors=MAX_ACTORS,budget=MODEL_BYTES,release=disposeActor}={}){this.maxActors=maxActors;this.budget=budget;this.release=release;this.entries=new Map();this.bytes=0;this.active=new Set();this.frameOpen=false;}
 get size(){return this.entries.size;}
 get(id){const actor=this.entries.get(id);if(actor){this.entries.delete(id);this.entries.set(id,actor);}return actor;}
 set(id,actor){const old=this.entries.get(id);if(old){this.entries.delete(id);this.bytes-=old.bytes;this.release(old);}this.entries.set(id,actor);this.bytes+=actor.bytes;this.trim();return this;}
 beginFrame(ids=[]){this.active=new Set(ids);this.frameOpen=true;}
 markActive(id){if(this.frameOpen)this.active.add(id);}
 endFrame(){this.frameOpen=false;this.trim();}
 trim(){while(this.size>this.maxActors||this.bytes>this.budget){const entry=[...this.entries].find(([id])=>!this.active.has(id));if(!entry)break;this.entries.delete(entry[0]);this.bytes-=entry[1].bytes;this.release(entry[1]);}}
 clear(){for(const actor of this.entries.values())this.release(actor);this.entries.clear();this.bytes=0;this.active.clear();this.frameOpen=false;}
 stats(){return {activeActors:[...this.active].filter(id=>this.entries.has(id)).length,activeRequested:this.active.size,inactiveActors:[...this.entries.keys()].filter(id=>!this.active.has(id)).length,actorTarget:this.maxActors,overActorLimit:Math.max(0,this.size-this.maxActors),overBudgetBytes:Math.max(0,this.bytes-this.budget)};}
}
let manifest={heroes:{},errors:{}},assetBase='assets/modern-heroes/',vendorBase='assets/vendor/three/',configured=Promise.resolve(),onError=null,error=null,contextLost=false,enginePromise=null,T,loader,textureLoader,renderer,scene,camera,ambient,sun;
const actors=new ActorCache(),pending=new Map(),failed=new Map(),metrics=new Map(),poses=new PoseCache(),poseHistory=new PoseHistory();let renders=0,hits=0,generation=0;
function report(e,id){const message=`Original 3D art${id?' for '+id:''}: ${e?.message||e}`;error=message;if(id)failed.set(id,message);if(onError)onError(message,id);return message;}
function localURL(file,base=assetBase){return new URL(file,new URL(base,root.document?.baseURI||root.location?.href||'http://localhost/')).href;}
function configure(value,base='assets/modern-heroes/',options={}){
 generation++;assetBase=base;vendorBase=options.vendorBase||'assets/vendor/three/';onError=options.onError||null;error=null;failed.clear();poses.clear();
 actors.clear();pending.clear();metrics.clear();fxHistory.clear();poseHistory.clear();fxSprites=0;
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
function sourceLighting(contract){const light=lightFromPrefab(contract.sourcePrefab),rgb=value=>[(value?.r??255)/255,(value?.g??255)/255,(value?.b??255)/255],intensity=Number(light?.Intensity)||3;return{direct:rgb(light?.Color).map(v=>v*intensity),ambient:rgb(light?.Ambient),ambientSpec:Number(light?.AmbientSpecIntensity)||0,rotation:light?.rot||[-80.6,0,-32.6]};}
function sourceMaterialPlan(extras,definition=manifest){const variables=extras?.sourceVariables||{},textures=variables.textures||{},floats={...definition.sourceMaterialDefaults,...variables.floats},mra=definition.materialTextures?.[textures.mraTex?.split('#')[0]];return{shader:extras?.sourceShader,mraFile:mra?.file,metalness:Number(floats.metalness)||0,roughness:Number(floats.roughness)||0,emissiveStrength:Number(floats.emissiveStrength)||0};}
function sourceFragment(fragment){return fragment.replace(/^#version[^\n]+\n/,'').replace(/layout\(std140\) uniform (\w+)\s*\{([\s\S]*?)\}\s*(\w+);/g,(_,name,fields,variable)=>`struct ${name}{${fields}};uniform ${name} ${variable};`);}
const sourceVertex=`
out vec2 v_texCoord;out vec3 v_worldPos;out vec3 v_worldNormal;
#include <common>
#include <skinning_pars_vertex>
void main(){
 #include <beginnormal_vertex>
 #include <skinbase_vertex>
 #include <skinnormal_vertex>
 #include <begin_vertex>
 #include <skinning_vertex>
 v_texCoord=uv;v_worldPos=(modelMatrix*vec4(transformed,1.0)).xyz;
 v_worldNormal=normalize(mat3(modelMatrix)*objectNormal);
 gl_Position=projectionMatrix*modelViewMatrix*vec4(transformed,1.0);
}`;
async function sourceMaterial(material,part){const plan=sourceMaterialPlan(material.userData);if(plan.shader!=='uber_pbr'||!plan.mraFile||!manifest.sourceLodShader?.fragment)return material;
 const mra=await textureLoader.loadAsync(localURL(plan.mraFile));mra.flipY=false;mra.colorSpace=T.NoColorSpace;mra.wrapS=mra.wrapT=T.RepeatWrapping;part.masks.push(mra);
 const mask=part.masksByFile.get(material.userData.teamMask);if(!mask)return material;
 // Source diffuse KTX2 is ASTC sRGB; MRA/team masks are linear data textures.
 material.map.colorSpace=T.SRGBColorSpace;material.map.wrapS=material.map.wrapT=T.RepeatWrapping;
 const uniforms={diffuseTex:{value:material.map},mraTex:{value:mra},teamColorTex:{value:mask},fragmentMaterialUniforms:{value:{fresnelColor:new T.Vector4(),rimLightColor:new T.Vector4(),rimLightDir:new T.Vector3(),metalness:plan.metalness,roughness:plan.roughness,emissiveStrength:plan.emissiveStrength,specularStrength:0,sssStrength:0,fr_IOR:0,fr_colorMul:0,fr_weight:0,rl_colorMul:0,rl_lowTolerance:0,rl_pow:0,rl_weight:0}},fragmentObjectUniforms:{value:{u_color:new T.Vector4(1,1,1,1),u_clipPlane:new T.Vector4(),color_mul:new T.Vector4(1,1,1,1),color_add:new T.Vector4()}},sceneUniforms:{value:{u_invView:new T.Matrix4(),u_projectionView:new T.Matrix4(),u_shadowProjectionView:new T.Matrix4(),u_lightDirectionTime:new T.Vector4(),u_cameraPosition:new T.Vector4(),u_dirLightColor:new T.Vector4(),u_sceneAmbientColor:new T.Vector4(),u_skyboxParams:new T.Vector4()}}};
 const replacement=new T.ShaderMaterial({name:material.name,glslVersion:T.GLSL3,vertexShader:sourceVertex,fragmentShader:sourceFragment(manifest.sourceLodShader.fragment),uniforms,side:material.side,transparent:material.transparent,depthWrite:material.depthWrite,toneMapped:false});
 replacement.userData=material.userData;replacement.userData.sourceLodMaterial=true;material.dispose();return replacement;
}
function configureLighting(actor){const light=lightFromPrefab(actor.contract.sourcePrefab),rgb=value=>new T.Color().setRGB((value?.r??255)/255,(value?.g??255)/255,(value?.b??255)/255);
 sun.color.copy(rgb(light?.Color));sun.intensity=Number(light?.Intensity)||3;ambient.color.copy(rgb(light?.Ambient));ambient.intensity=2;
 const rotation=light?.rot||[-80.6,0,-32.6];sun.position.set(0,-1,0).applyEuler(new T.Euler(...rotation.map(d=>d*Math.PI/180))).multiplyScalar(8);sun.target.position.set(0,0,0);sun.target.updateMatrixWorld();
 const source=sourceLighting(actor.contract),direction=sun.position.clone().normalize();actor.group.traverse(o=>{for(const material of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){if(!material.userData.sourceLodMaterial)continue;const u=material.uniforms,scene=u.sceneUniforms.value;scene.u_lightDirectionTime.set(direction.x,direction.y,direction.z,0);scene.u_cameraPosition.set(camera.position.x,camera.position.y,camera.position.z,1);scene.u_dirLightColor.set(...source.direct,1);scene.u_sceneAmbientColor.set(...source.ambient,source.ambientSpec);u.fragmentObjectUniforms.value.u_color.set(...(actor.team===1?[1,.12,.16]:[.12,.4,1]),1);}});
}
function materialTextures(material){return [...Object.values(material),...Object.values(material.uniforms||{}).map(u=>u.value)].filter(value=>value?.isTexture);}
function actorMemory(actor){const geometry=new Set(),textures=new Set();let bytes=0;actor.group.traverse(o=>{if(o.geometry&&!geometry.has(o.geometry)){geometry.add(o.geometry);for(const attribute of Object.values(o.geometry.attributes))bytes+=attribute.array.byteLength;bytes+=o.geometry.index?.array?.byteLength||0;}for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])for(const texture of materialTextures(m))textures.add(texture);});for(const part of actor.parts)for(const texture of part.masks)textures.add(texture);for(const texture of textures){const im=texture.source?.data||texture.image;bytes+=(im?.width||0)*(im?.height||0)*4*(texture.generateMipmaps?4/3:1);}return Math.ceil(bytes);}
function disposeActor(actor){if(!actor)return;scene?.remove(actor.group);const geometries=new Set(),materials=new Set(),textures=new Set();actor.group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){materials.add(m);for(const texture of materialTextures(m))textures.add(texture);}});for(const part of actor.parts){part.mixer.stopAllAction();part.mixer.uncacheRoot(part.gltf.scene);for(const t of part.masks)textures.add(t);}for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures){t.source?.data?.close?.();t.dispose();}}
async function loadActor(id){
 const resident=actors.get(id);if(resident)return resident;if(pending.has(id))return pending.get(id);if(!has(id)||failed.has(id))return null;
 const epoch=generation,promise=(async()=>{
  await engine();const contract=manifest.heroes[id],group=new T.Group(),parts=[],actor={id,contract,group,parts,bytes:0};
  try{for(const p of contract.parts){
   const gltf=await loader.loadAsync(localURL(p.file)),outer=new T.Group();let chain=outer;
   for(const tr of p.transforms||[]){const child=new T.Group();child.position.fromArray(tr.pos||[0,0,0]);child.rotation.set(...(tr.rot||[0,0,0]).map(x=>x*Math.PI/180));child.scale.fromArray(tr.scl||[1,1,1]);chain.add(child);chain=child;}chain.add(gltf.scene);
   if(p.attach){const bone=parts[p.attach.part]?.gltf.scene.getObjectByName(p.attach.bone);if(!bone)throw Error('missing source mount bone '+p.attach.bone);bone.add(outer);}else group.add(outer);
   const uniform={value:new T.Vector3(1,1,1)},masks=[],materials=[];gltf.scene.traverse(o=>{for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])if(m.userData.teamMask)materials.push(m);});
   for(const m of new Set(materials)){const texture=await textureLoader.loadAsync(localURL(m.userData.teamMask));texture.flipY=false;masks.push(texture);m.onBeforeCompile=shader=>{shader.uniforms.sourceTeamMask={value:texture};shader.uniforms.sourceTeamColor=uniform;shader.fragmentShader='uniform sampler2D sourceTeamMask;uniform vec3 sourceTeamColor;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*sourceTeamColor,texture2D(sourceTeamMask,vMapUv).b);');};m.customProgramCacheKey=()=>`source-team-mask:${m.userData.teamMask}`;m.needsUpdate=true;}
   const masksByFile=new Map([...new Set(materials)].map((m,i)=>[m.userData.teamMask,masks[i]])),part={gltf,metadata:p,uniform,masks,masksByFile};
   const replacements=new Map();for(const m of new Set(materials))replacements.set(m,await sourceMaterial(m,part));gltf.scene.traverse(o=>{if(o.material)o.material=Array.isArray(o.material)?o.material.map(m=>replacements.get(m)||m):(replacements.get(o.material)||o.material);});
   const mixer=new T.AnimationMixer(gltf.scene);Object.assign(part,{mixer,actions:new Map(gltf.animations.map(clip=>[clip.name,mixer.clipAction(clip)]))});parts.push(part);
  }
  if(!parts.length)throw Error('source actor contains no converted geometry');group.updateMatrixWorld(true);actor.bytes=actorMemory(actor);
  if(epoch!==generation){disposeActor(actor);return null;}measureHead(actor);actors.set(id,actor);return actor;
  }catch(e){disposeActor(actor);if(epoch===generation)report(e,id);return null;}
 })();pending.set(id,promise);promise.finally(()=>{if(pending.get(id)===promise)pending.delete(id);}).catch(()=>{});return promise;
}
async function prepareActors(ids=[]){await configured;if(!actors.frameOpen){actors.beginFrame([]);actors.endFrame();}const result=[];for(const id of new Set(ids)){if(!has(id))continue;try{const actor=await loadActor(id);result.push({id,ready:!!actor,error:unsupported(id)});}catch(e){report(e,id);result.push({id,ready:false,error:unsupported(id)});}}return result;}
function choosePartPose(part,state,elapsed,options,actor){
 const entity=options.entity||{},custom=Number(entity.modernCustomStateNumber),candidates=state==='ability'&&Number.isInteger(custom)&&custom>0?['Custom'+custom,...STATE_NAMES.ability]:STATE_NAMES[state]||[state],contains=name=>part.actions?part.actions.has(name):Object.prototype.hasOwnProperty.call(part.metadata.animations||{},name),choose=names=>names.map(name=>resolveState(part.metadata.asm,name,entity)).find(name=>name&&contains(name));
 let name=choose(candidates)||choose([part.metadata.asm?.DefaultState])||choose(['Idle'])||part.gltf?.animations[0]?.name||Object.keys(part.metadata.animations||{})[0];if(!name)return null;
 let t=elapsed;if(['run','charge'].includes(state)){if(entity&&!entity.air&&Number.isFinite(entity.walk))t=entity.walk;t*=Math.max(.1,1+(Number(actor.contract.sourceEntity?.WalkTweakPercentage)||0)/100);}
 let pose=clipPose(part.metadata.animations[name],t,state,entity.visualAttack,options.attackDuration||0,part.metadata.asm?.States?.find(s=>s.Name===name));
 if(state==='attack'&&pose.done){name=choose(['Idle'])||name;pose=clipPose(part.metadata.animations[name],options.idleTime??0,'idle',null,0,part.metadata.asm?.States?.find(s=>s.Name===name));}return {name,...pose};
}
function applyPose(actor,partPoses,team,yaw,blends=[]){actor.group.rotation.z=yaw;for(let index=0;index<actor.parts.length;index++){const part=actor.parts[index],pose=partPoses[index],blend=blends.find(b=>b.index===index);part.actions.forEach(a=>a.stop());const play=(p,weight)=>{const action=part.actions.get(p.name);if(!action)return;action.reset();action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.setEffectiveWeight(weight);action.play();action.time=p.time;};if(pose){play(pose,blend?blend.weight:1);if(blend)play(blend.from,1-blend.weight);part.mixer.update(0);}const visibility=meshVisibility(part.metadata,pose?.name,pose?.frame??0);part.gltf.scene.traverse(o=>{if(o.isMesh)o.visible=visibility[o.name]??true;});part.uniform.value.set(...(team===1?[1,.12,.16]:[.12,.4,1]));}actor.group.updateMatrixWorld(true);}
function actorBounds(actor){actor.group.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();o.computeBoundingBox();}});return new T.Box3().setFromObject(actor.group);}
function projectedBounds(box){let left=Infinity,right=-Infinity,top=-Infinity,bottom=Infinity;for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const py=.75*y+Math.sqrt(7)/4*z;left=Math.min(left,x);right=Math.max(right,x);top=Math.max(top,py);bottom=Math.min(bottom,py);}return {left,right,top,bottom};}
function measureHead(actor){if(metrics.has(actor.id))return;const p=actor.parts.map(part=>choosePartPose(part,'idle',0,{},actor));applyPose(actor,p,0,0);const box=projectedBounds(actorBounds(actor)),factor=(5/6)*(Number(actor.contract.sourceEntity?.Scale)||100)/100;metrics.set(actor.id,Math.max(18,Math.min(140,box.top*UNITS*factor))+5);}
function rasterPose(actor,partPoses,team,yaw,density,blends=[]){
 applyPose(actor,partPoses,team,yaw,blends);const bounds=projectedBounds(actorBounds(actor)),margin=.08;
 const left=bounds.left-margin,right=bounds.right+margin,top=bounds.top+margin,bottom=bounds.bottom-margin,width=right-left,height=top-bottom;
 if(![width,height].every(v=>Number.isFinite(v)&&v>0))throw Error('invalid source model bounds');
 const effective=Math.min(density,1536/(width*UNITS),1536/(height*UNITS)),w=Math.max(2,Math.ceil(width*UNITS*effective)),h=Math.max(2,Math.ceil(height*UNITS*effective));
 camera.left=left;camera.right=right;camera.top=top;camera.bottom=bottom;camera.updateProjectionMatrix();renderer.setSize(w,h,false);actor.team=team;configureLighting(actor);scene.add(actor.group);try{renderer.render(scene,camera);}finally{scene.remove(actor.group);}
 const image=root.document.createElement('canvas');image.width=w;image.height=h;image.getContext('2d').drawImage(renderer.domElement,0,0);renders++;return {image,x:left*UNITS,y:-top*UNITS,width:width*UNITS,height:height*UNITS};
}
function tintRaster(raster,color,key){if(!color)return raster;const cacheKey=key+':'+color.join(','),existing=poses.get(cacheKey);if(existing)return existing;const image=root.document.createElement('canvas');image.width=raster.image.width;image.height=raster.image.height;const c=image.getContext('2d',{willReadFrequently:true});c.drawImage(raster.image,0,0);const pixels=c.getImageData(0,0,image.width,image.height);for(let i=0;i<pixels.data.length;i+=4){for(let j=0;j<3;j++)pixels.data[i+j]=Math.min(255,pixels.data[i+j]*color[4+j]/255+color[j]);pixels.data[i+3]*=color[3]/255;}c.putImageData(pixels,0,0);const result={...raster,image};poses.set(cacheKey,result,image.width*image.height*4);return result;}
function draw(c,id,x,y,team,time,state='idle',heading=-Math.PI/2,started=0,scale=1,options={}){
 if(!has(id)||failed.has(id)||contextLost)return false;actors.markActive(id);const actor=actors.get(id),contract=manifest.heroes[id];
 try{
  // An exact source pose raster remains usable after its inactive mesh was
  // evicted. Metadata derives the same clip/frame key; a different pose still
  // loads the original mesh, rather than substituting a stale cached image.
  if(state==='attack'&&options.entity?.visualAttackCancelled)state='idle';const elapsed=options.elapsed??Math.max(0,time-started),partPoses=(actor?.parts||contract.parts.map(metadata=>({metadata}))).map(part=>choosePartPose(part,state,elapsed,{...options,idleTime:options.idleTime??time},actor||{contract}));
  const policy=root.RoyaleGraphics?.current||{},density=rasterDensity(policy),fps=Math.max(12,Math.min(120,policy.animationFps||60)),steps=policy.textures==='ultra'?180:policy.textures==='max'?144:72,index=((Math.round(sourceYaw(heading)/TAU*steps)%steps)+steps)%steps,yaw=index/steps*TAU;
  for(const [i,p]of partPoses.entries())if(p){const descriptor=contract.parts[i].asm?.States?.find(s=>s.Name===p.name),first=(Number(descriptor?.StartFrame)||0)/(Number(contract.parts[i].animations[p.name]?.fps)||30);p.time=Math.max(first,Math.floor(p.time*fps+1e-7)/fps);}
  const entity=options.entity,clock=entity?.visualTime??time,activation=[id,state,entity?.visualStarted??started,entity?.visualAttack?.sequence??0,...partPoses.map(p=>p?.name||'static')].join('|'),attack=state==='attack'&&entity?.visualAttack,blends=poseHistory.sample(entity?.id,activation,clock,partPoses,contract.parts,attack?{...attack,windup:Number.isFinite(attack.releasedAt)?0:Math.max(0,(Number(attack.windup)||0)-elapsed)}:null);
  for(const blend of blends)blend.weight=Math.floor(blend.weight*fps+1e-7)/fps;
  const key=[id,team===1?1:0,density,steps,index,...partPoses.map(p=>p?`${p.name}:${p.frame}:${p.time.toFixed(6)}`:'static'),...blends.map(b=>`${b.index}:${b.from.name}:${b.from.time.toFixed(6)}:${b.weight}`)].join('|');let raster=poses.get(key);if(raster)hits++;else{if(!actor){loadActor(id).catch(e=>report(e,id));return false;}raster=rasterPose(actor,partPoses,team,yaw,density,blends);poses.set(key,raster,raster.image.width*raster.image.height*4);}
  const source=contract.sourceEntity||{},factor=scale*(5/6)*(Number(source.Scale)||100)/100,height=options.height??Math.max(0,Number(source.FlyingHeight)||0)/1000*20;
  if(options.shadowOnly){if(!options.paint)return false;options.paint(c,raster,factor);return true;}
  c.save();try{c.translate(x,y-height);c.scale(factor,factor);c.filter=root.RoyaleNative?.teamFilter?.(team)||'none';const paint=color=>{const image=tintRaster(raster,color,key);c.drawImage(image.image,image.x,image.y,image.width,image.height);};
  if(options.entity&&root.RoyalePresentation?.ready)root.RoyalePresentation.filtered(c,options.entity,time,paint);else paint(null);if(actor&&options.entity&&!options.ghost){const fxTime=options.entity.visualTime??time,current=sourceFXPlan(actor.contract,partPoses,manifest.vfxAssets||{},fxTime,team),activation=[id,state,options.entity.visualStarted??started,options.entity.visualAttack?.sequence??0,...partPoses.map(p=>p?.name||'static')].join('|'),effects=fxHistory.update(options.entity.id??id,activation,fxTime,current,e=>sourceFXLifetime(e,manifest.vfxAssets||{},root.RoyaleNative?.library));if(effects.length){applyPose(actor,partPoses,team,yaw,blends);drawSourceFX(c,actor,partPoses,team,fxTime,options.entity.id??id,effects);}}}finally{c.restore();}return true;
 }catch(e){report(e,id);return false;}
}
function headHeight(id){return metrics.get(id)||null;}
function shadow(c,id,x,y,team,time,state,heading,started,scale,options={}){return draw(c,id,x,y,team,time,state,heading,started,scale,{...options,shadowOnly:true});}
function beginFrame(ids=[]){if(!ids.length){fxHistory.clear();poseHistory.clear();}actors.beginFrame([...new Set(ids)].filter(has));}
function endFrame(){actors.endFrame();}
// modelBytes estimates geometry and decoded textures, not total browser/GPU
// memory. modelBudget is a soft inactive target; active overflow is explicit.
function summary(){return {actors:actors.size,actorIds:[...actors.entries.keys()],modelBytes:actors.bytes,modelBudget:MODEL_BYTES,...actors.stats(),poseEntries:poses.entries.size,poseBytes:poses.bytes,poseBudget:POSE_BYTES,renders,hits,fxSprites,fxHistoryEntries:fxHistory.size,pending:pending.size,error,failed:Object.fromEntries(failed)};}
return {configure,prepareActors,beginFrame,endFrame,has,unsupported,draw,shadow,headHeight,summary,resolveState,sourceYaw,clipPose,choosePartPose,meshVisibility,sourceMaterialPlan,sourceLighting,actorMemory,FXHistory,PoseHistory,sourceCurve,sourceParticleSamples,sourceFXPlan,rasterDensity,PoseCache,ActorCache,get error(){return error;}};
});
