/* Source SCDB MovieClipEmitterData v6, sampled without a mutable simulation.
 * The native client is stripped: component integration is a deterministic,
 * bounded browser interpretation of the original authoring data. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RoyaleSourceParticles=api;})(globalThis,function(){'use strict';
const TAU=Math.PI*2,DEG=Math.PI/180,MAX_PARTICLES=48,MAX_BIRTHS=384,MAX_COMPONENTS=64,MAX_KEYS=256;
const number=(v,fallback=0)=>Number.isFinite(v)?v:fallback;
const clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,v));
const mix=(a,b,t)=>Array.isArray(a)?a.map((x,i)=>mix(x,b[i],t)):a+(b-a)*t;
const cubic=(a,b,c,d,u)=>{const v=1-u;return v*v*v*a+3*v*v*u*b+3*v*u*u*c+u*u*u*d;};
function parameter(x,a,b,c,d){let lo=0,hi=1;for(let i=0;i<28;i++){const u=(lo+hi)/2;if(cubic(a,b,c,d,u)<x)lo=u;else hi=u;}return(lo+hi)/2;}
function packedKeys(values,width){
 if(!Array.isArray(values)||values.length%width||values.length<width||values.length>MAX_KEYS*width||!values.every(Number.isFinite))return null;
 const keys=[];for(let i=0;i<values.length;i+=width){if(i&&values[i]<values[i-width])return null;keys.push(values.slice(i,i+width));}return keys;
}
function packedBezier(values,t){
 const keys=packedKeys(values,7);if(!keys)return null;if(t<keys[0][0])return keys[0][1];
 let i=1;while(i<keys.length&&keys[i][0]<=t)i++;if(i===keys.length)return keys[i-1][1];
 const a=keys[i-1],b=keys[i],dt=b[0]-a[0];
 // Each key stores time, value, incoming dx/dy, outgoing dx/dy, tangent mode.
 // Horizontal handles are fractions of the segment; vertical handles are
 // per unit time. Tangent mode is editing metadata, not interpolation mode.
 const u=parameter(t,a[0],a[0]+clamp(a[4])*dt,b[0]-clamp(b[2])*dt,b[0]);
 return cubic(a[1],a[1]+a[5]*dt,b[1]-b[3]*dt,b[1],u);
}
function packedLinear(values,t,dimensions){
 const width=dimensions+1,keys=packedKeys(values,width);if(!keys)return null;
 const value=k=>dimensions===1?k[1]:k.slice(1);if(t<=keys[0][0])return value(keys[0]);
 for(let i=1;i<keys.length;i++)if(t<keys[i][0])return mix(value(keys[i-1]),value(keys[i]),(t-keys[i-1][0])/(keys[i][0]-keys[i-1][0]));
 return value(keys[keys.length-1]);
}
function sourceCurve(value,t,dimensions){
 t=clamp(number(t));if(Number.isFinite(value))return value;
 if(value&&typeof value==='object'&&!Array.isArray(value)){
  if(value._b0){const p=value._b0;if(Array.isArray(p))return packedBezier(p,t);const names=['x','y','z'].filter(k=>p[k]);if(names.length)return names.map(k=>packedBezier(p[k],t));return null;}
  if(value._l0)return packedLinear(value._l0,t,dimensions||(value._l0.length%4===0?3:1));
  return null;
 }
 if(!Array.isArray(value))return null;
 if(value.length===2)return mix(value[0],value[1],t);
 if(value.length===3)return value.slice();
 if(value.length!==6)return null;
 const u=parameter(t,0,clamp(value[0]),clamp(value[2]),1),fraction=cubic(0,value[1],value[3],1,u);
 return mix(value[4],value[5],fraction);
}
function cubicMaximum(a,b,c,d){
 let max=Math.max(a,d),A=-a+3*b-3*c+d,B=2*(a-2*b+c),C=b-a;
 const roots=Math.abs(A)<1e-12?(Math.abs(B)>1e-12?[-C/B]:[]):B*B-4*A*C>=0?[(-B+Math.sqrt(B*B-4*A*C))/(2*A),(-B-Math.sqrt(B*B-4*A*C))/(2*A)]:[];
 for(const u of roots)if(u>0&&u<1)max=Math.max(max,cubic(a,b,c,d,u));return max;
}
function curveMaximum(value){
 if(Number.isFinite(value))return value;
 if(Array.isArray(value)){if(value.length===2&&value.every(Number.isFinite))return Math.max(...value);if(value.length===6&&Number.isFinite(value[4])&&Number.isFinite(value[5])){const a=value[4],d=value[5];return cubicMaximum(a,mix(a,d,value[1]),mix(a,d,value[3]),d);}return 0;}
 const keys=packedKeys(value?._b0,7);if(keys){let max=keys[0][1];for(let i=1;i<keys.length;i++){const a=keys[i-1],b=keys[i],dt=b[0]-a[0];max=Math.max(max,cubicMaximum(a[1],a[1]+a[5]*dt,b[1]-b[3]*dt,b[1]));}return max;}
 const linear=packedKeys(value?._l0,2);return linear?Math.max(...linear.map(k=>k[1])):0;
}
function sourceRandom(seed,slot){let n=2166136261;for(const c of String(seed)+':'+slot)n=Math.imul(n^c.charCodeAt(0),16777619);n=Math.imul(n^(n>>>16),2246822507);return((n^(n>>>13))>>>0)/4294967296;}
const scalar=(v,t,fallback=0)=>number(sourceCurve(v,t,1),fallback);
const vector=(v,t,fallback=[0,0,0])=>{const out=sourceCurve(v,t,3);return Array.isArray(out)?out.map((x,i)=>number(x,fallback[i]||0)):fallback.slice();};
const range=(a,b,r)=>a+(b-a)*r;
const jitter=(value,amount,r)=>value+(r*2-1)*number(amount);
function emitterTiming(record){
 const e=record?.emitter;if(!e)return{delay:0,last:0,life:0,period:0,infinite:false};
 let last=0,infinite=false;for(const c of (e.components||[]).slice(0,MAX_COMPONENTS)){
  if(c.__class==='SpawnBurst')for(const b of (c.bursts||[]).slice(0,MAX_KEYS))if(number(b.c,1)>0)last=Math.max(last,number(b.t));
  if(c.__class==='SpawnRate'){last=Math.max(last,number(c.duration));infinite=infinite||c.infinite===true;}
 }
 const delay=Math.max(0,number(e.emitterDelay)),life=Math.max(.001,curveMaximum(e.lifetime)+Math.abs(number(e.lifetimeJitter)));
 return{delay,last,life,period:Math.max(.001,delay+last+life),infinite};
}
function particleLifetime(record){const timing=emitterTiming(record);return record?.emitter?timing.delay+timing.last+timing.life:0;}
function sourceFXLifetime(effect,assets,library){
 if(effect.movieclip){const ref=String(effect.movieclip).split(' | ')[0],slash=ref.lastIndexOf('/'),stem=ref.slice(0,slash).split('/').pop(),sc=library?.scenes?.['modernfx_'+stem]||library?.scenes?.[stem];return sc?.duration(ref.slice(slash+1))||1;}
 return particleLifetime(assets?.[effect.particle]);
}
function birthsFor(record,time,seed,timing){
 const e=record.emitter,births=[],components=(e.components||[]).slice(0,MAX_COMPONENTS);
 // A repeating finite emitter restarts only once its final particle can expire.
 // Infinite rate emitters already have their own absolute birth clock.
 const looping=e.emitterLoop&&!timing.infinite,cycle=looping?Math.floor(time/timing.period):0;
 for(let loop=Math.max(0,cycle-1);loop<=cycle;loop++){
  const origin=(looping?loop*timing.period:0)+timing.delay,local=time-origin;if(local<0)continue;
  for(let ci=0;ci<components.length;ci++){const c=components[ci];
   if(c.__class==='SpawnBurst')for(const[bi,b]of(c.bursts||[]).slice(0,MAX_KEYS).entries()){
    const at=number(b.t);if(at>local||at<local-timing.life)continue;const count=Math.min(MAX_BIRTHS,Math.max(0,Math.floor(number(b.c,1))));
    for(let j=0;j<count&&births.length<MAX_BIRTHS;j++)births.push({at:origin+at,phase:at,key:`${ci}:b${bi}:${loop}:${j}`,order:ci,index:bi*MAX_BIRTHS+j});
   }
   if(c.__class==='SpawnRate'){
    // Fixed seeded rate jitter gives repeatable births on rewind, independent
    // of display frame rate. No native or gameplay RNG stream is consumed.
    const rate=Math.max(0,jitter(scalar(c.spawnRate,0),c.spawnRateJitter,sourceRandom(seed,`rate:${ci}:${loop}`)));if(!rate)continue;
    const end=c.infinite?local:Math.min(local,Math.max(0,number(c.duration))),last=Math.floor(end*rate+1e-9),first=Math.max(0,Math.ceil((local-timing.life)*rate-1e-9),last-MAX_BIRTHS+1);
    for(let j=first;j<=last&&births.length<MAX_BIRTHS;j++){const at=j/rate;births.push({at:origin+at,phase:at,key:`${ci}:r${j}:${loop}`,order:ci,index:j});}
   }
  }
 }
 return births.sort((a,b)=>a.at-b.at||a.order-b.order||a.index-b.index);
}
function spawnState(components,phase,random){
 const position=[0,0,0],velocity=[0,0,0];
 for(let ci=0;ci<components.length;ci++){
  const c=components[ci],r=k=>random(`component:${ci}:${k}`),s=(v,f=0)=>scalar(v,phase,f);
  if(c.__class==='SpawnPlanar'){
   const angle=range(s(c.minAngle),s(c.maxAngle,s(c.minAngle)),r(0))*DEG,spawnAngle=c.randomAngle?r(1)*TAU:angle,radius=range(s(c.spawnMinSize),s(c.spawnMaxSize,s(c.spawnMinSize)),r(2)),speed=range(s(c.minSpeedXY),s(c.maxSpeedXY,s(c.minSpeedXY)),r(3));
   position[0]+=Math.cos(spawnAngle)*radius;position[1]+=Math.sin(spawnAngle)*radius;velocity[0]+=Math.cos(angle)*speed;velocity[1]+=Math.sin(angle)*speed;velocity[2]+=range(s(c.minSpeedZ),s(c.maxSpeedZ,s(c.minSpeedZ)),r(4));
  }else if(c.__class==='SpawnCone'){
   const direction=vector(c.direction,phase,[0,0,1]),length=Math.hypot(...direction);if(!length)continue;const n=direction.map(v=>v/length),azimuth=r(0)*TAU,cos=range(1,Math.cos(clamp(s(c.directionJitterAngle),0,180)*DEG),r(1)),sin=Math.sqrt(Math.max(0,1-cos*cos));
   const tangent=Math.abs(n[2])<.999?[-n[1],n[0],0]:[1,0,0],tl=Math.hypot(...tangent),u=tangent.map(v=>v/tl),v=[n[1]*u[2]-n[2]*u[1],n[2]*u[0]-n[0]*u[2],n[0]*u[1]-n[1]*u[0]],speed=jitter(s(c.velocity),s(c.velocityJitter),r(2));
   for(let axis=0;axis<3;axis++)velocity[axis]+=(n[axis]*cos+sin*(u[axis]*Math.cos(azimuth)+v[axis]*Math.sin(azimuth)))*speed;
  }else if(c.__class==='SpawnLocation'){
   const radius=range(s(c.spawnMinSize),s(c.spawnMaxSize,s(c.spawnMinSize)),r(0)),angle=r(1)*TAU;
   if(c.spawnShape===1){position[0]+=Math.cos(angle)*radius;position[1]+=Math.sin(angle)*radius;}
   else if(c.spawnShape===2){const z=r(2)*2-1,xy=Math.sqrt(1-z*z);position[0]+=Math.cos(angle)*xy*radius;position[1]+=Math.sin(angle)*xy*radius;position[2]+=z*radius;}
  }else if(c.__class==='SpawnVelocityComponent'){
   const v=vector(c.velocity,phase),j=vector(c.velocityJitter,phase);for(let axis=0;axis<3;axis++)velocity[axis]+=jitter(v[axis],j[axis],r(axis));
  }
 }
 return{position,velocity};
}
function motion(state,components,gravity,age,life){
 const p=state.position.slice(),v=state.velocity.slice(),decelerations=components.filter(c=>c.__class==='Deceleration');
 if(!decelerations.length){for(let axis=0;axis<3;axis++){p[axis]+=v[axis]*age+gravity[axis]*age*age/2;v[axis]+=gravity[axis]*age;}return{position:p,velocity:v};}
 // Fixed substeps are a function of particle age, never of render history.
 // Constant deceleration uses exact within-step stopping distance, so particles
 // do not reverse direction when their authored slowing force reaches zero.
 const steps=Math.min(64,Math.max(1,Math.ceil(age*120))),dt=age/steps;
 for(let step=0;step<steps;step++){
  const dec=[0,0,0];for(const c of decelerations){const value=vector(c.deceleration,(step+.5)*dt/life);for(let axis=0;axis<3;axis++)dec[axis]+=value[axis];}
  for(let axis=0;axis<3;axis++){
   const sign=Math.sign(v[axis]),acceleration=gravity[axis]-sign*dec[axis],next=v[axis]+acceleration*dt;
   if(sign&&sign*next<0&&dec[axis]>Math.abs(gravity[axis])){const stop=-v[axis]/acceleration;p[axis]+=v[axis]*stop+acceleration*stop*stop/2;v[axis]=0;}
   else{p[axis]+=v[axis]*dt+acceleration*dt*dt/2;v[axis]=next;}
  }
 }
 return{position:p,velocity:v};
}
function stretchAt(value,t){if(Array.isArray(value)&&value.length===2&&value.every(Number.isFinite))return value;const out=sourceCurve(value,t,2);return Array.isArray(out)?out:[1,1];}
function sourceParticleSamples(record,time,seed,budget=24){
 const e=record?.emitter,r=record?.render;if(!e||!r||!Number.isFinite(time)||time<0)return[];
 const max=Math.min(MAX_PARTICLES,Math.max(0,Math.floor(number(budget))),Math.max(0,Math.floor(number(e.maxParticleCount,MAX_PARTICLES))));if(!max)return[];
 const timing=emitterTiming(record),components=(e.components||[]).slice(0,MAX_COMPONENTS),out=[];
 for(const birth of birthsFor(record,time,seed,timing)){
  if(out.length>=max)break;const random=k=>sourceRandom(seed+':'+birth.key,k),age=time-birth.at,life=Math.max(.001,jitter(scalar(e.lifetime,birth.phase),e.lifetimeJitter,random('life')));if(age<0||age>=life)continue;
  const t=age/life,scale=Math.max(0,(scalar(r.scale,t,1)+jitter(0,r.scaleJitter,random('scale')))*number(r.globalScale,1)),alpha=clamp(scalar(r.alpha,t,1)*Math.min(1,r.alphaFadeout>0?(life-age)/r.alphaFadeout:1)),color=vector(r.color,t,[1,1,1]);
  if(sourceCurve(r.alpha??1,t,1)===null||sourceCurve(r.scale??1,t,1)===null)continue;
  const offset=Array.isArray(e.spawnPointOffset)?e.spawnPointOffset:[e.spawnPointOffset?.x,e.spawnPointOffset?.y,e.spawnPointOffset?.z],state=motion(spawnState(components,birth.phase,random),components,vector(e.gravity,t),age,life),stretch=stretchAt(r.stretch,t);
  let rotation=(jitter(scalar(r.angle,0),r.angleJitter,random('angle'))+jitter(scalar(r.rotationSpeed,t),r.rotationSpeedJitter,random('rotation'))*age)*DEG;
  const directionRotation=r.orientToDirection&&Math.hypot(...state.velocity)>1e-10?Math.atan2(-(.75*state.velocity[1]+Math.sqrt(7)/4*state.velocity[2]),state.velocity[0]):0;rotation+=directionRotation;
  out.push({age,x:state.position[0]+number(offset[0]),y:state.position[1]+number(offset[1]),z:state.position[2]+number(offset[2]),scale,scaleX:scale*number(stretch[0],1),scaleY:scale*number(stretch[1],1),alpha,color,rotation,directionRotation,velocity:state.velocity,orientToDirection:r.orientToDirection===true,movieclip:record.movieclip?.[Math.floor(random('movieclip')*(record.movieclip?.length||1))],loopMovieClip:r.loopMovieClip===true,blendMode:r.blendMode,followEmitter:e.followEmitter===true});
 }
 return out;
}
function copyPose(value){
 if(!value)return null;const out={};for(const[name,size]of[['position',3],['quaternion',4],['scale',3],['origin',2]]){const data=value[name]||(name==='origin'?[0,0]:null);if(!Array.isArray(data)||data.length!==size||!data.every(Number.isFinite))return null;out[name]=data.slice();}
 out.factor=value.factor??1;if(!Number.isFinite(out.factor)||out.factor<=0)return null;
 const length=Math.hypot(...out.quaternion);if(length<1e-12)return null;out.quaternion=out.quaternion.map(v=>v/length);return out;
}
function interpolatePose(a,b,t){
 const out={position:mix(a.position,b.position,t),scale:mix(a.scale,b.scale,t),origin:mix(a.origin,b.origin,t),factor:mix(a.factor,b.factor,t)};
 let end=b.quaternion,dot=a.quaternion.reduce((sum,v,i)=>sum+v*end[i],0);if(dot<0){dot=-dot;end=end.map(v=>-v);}
 if(dot>.9995){const q=mix(a.quaternion,end,t),length=Math.hypot(...q);out.quaternion=q.map(v=>v/length);}
 else{const angle=Math.acos(clamp(dot,-1,1)),sin=Math.sin(angle),from=Math.sin((1-t)*angle)/sin,to=Math.sin(t*angle)/sin;out.quaternion=a.quaternion.map((v,i)=>from*v+to*end[i]);}
 return out;
}
// Presentation-only birth poses. The renderer supplies decomposed attachment
// TRS, canvas origin and outer actor factor; no THREE or gameplay state is read.
// Before the first observed pose, clamp to that pose rather than inventing a
// movement trajectory. A new activation key or clock rewind starts fresh.
class ParticleTransformHistory{
 constructor({maxEmitters=128,maxSamples=64,maxAge=4}={}){this.maxEmitters=clamp(Math.floor(number(maxEmitters,128)),1,512);this.maxSamples=clamp(Math.floor(number(maxSamples,64)),2,128);this.maxAge=clamp(number(maxAge,4),.01,8);this.entries=new Map();}
 observe(key,activation,time,value){
  const pose=copyPose(value);if(!Number.isFinite(time)||!pose)return false;
  let entry=this.entries.get(key);if(!entry||entry.activation!==activation||time<entry.time)entry={activation,time,samples:[]};
  const samples=entry.samples;if(samples.length&&samples[samples.length-1].time===time)samples.pop();samples.push({time,pose});entry.time=time;
  while(samples.length>2&&samples[1].time<time-this.maxAge)samples.shift();while(samples.length>this.maxSamples)samples.shift();
  this.entries.delete(key);this.entries.set(key,entry);while(this.entries.size>this.maxEmitters)this.entries.delete(this.entries.keys().next().value);return true;
 }
 sample(key,time){
  const samples=this.entries.get(key)?.samples;if(!samples?.length||!Number.isFinite(time))return null;
  if(time<=samples[0].time)return copyPose(samples[0].pose);const last=samples[samples.length-1];if(time>=last.time)return copyPose(last.pose);
  for(let i=1;i<samples.length;i++)if(time<=samples[i].time){const a=samples[i-1],b=samples[i];return interpolatePose(a.pose,b.pose,(time-a.time)/(b.time-a.time));}return null;
 }
 resolve(key,time,particleAge,followEmitter=false){return this.sample(key,followEmitter?time:time-Math.max(0,number(particleAge)));}
 prune(time){if(Number.isFinite(time))for(const[key,entry]of this.entries)if(time-entry.time>this.maxAge)this.entries.delete(key);}
 clear(){this.entries.clear();}
 summary(){let snapshots=0;for(const entry of this.entries.values())snapshots+=entry.samples.length;return{emitters:this.entries.size,snapshots};}
}
return{sourceCurve,sourceParticleSamples,sourceFXLifetime,particleLifetime,ParticleTransformHistory};
});
