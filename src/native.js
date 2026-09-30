/* Source-asset SC movie-clip playback. All coordinates, UVs, frames and FPS
   come from the supplied client. Browser code has no network dependency. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RoyaleNative=api;})(globalThis,function(){'use strict';
const I=[1,0,0,1,0,0],NONE=65535;
function frameAt(seconds,fps,count,loop=true){if(!count)return 0;const f=Math.max(0,Math.floor((Number.isFinite(seconds)?seconds:0)*fps+1e-7));return loop?f%count:Math.min(f,count-1)}
function direction(dx,dy){if(!Number.isFinite(dx)||!Number.isFinite(dy))return{index:1,flip:false};const a=Math.atan2(Math.abs(dx),-dy);return{index:Math.max(1,Math.min(9,1+Math.round(a/(Math.PI/8)))),flip:dx<0};}
function teamFilter(team){return team===2?'hue-rotate(105deg) saturate(1.35) brightness(.95)':team===3?'sepia(.82) saturate(2.2) hue-rotate(355deg) brightness(1.08)':'none';}
function exportName(cfg,team,state,index){const key=`${team===1?1:0}:${state}`;return cfg.animations?.[key]?.[Math.max(0,Math.min(8,index-1))]||`${cfg.prefix[team===1?1:0]}_${state}1_${index}`}
// Source exports sometimes have only one viewing direction (e.g. Balloon).
// Prefer the requested state's single-direction clip before an idle fallback.
function resolveAnimation(cfg,scene,team,state,index){
 const data=scene.data||scene,pref=cfg.prefix[team===1?1:0],ex=data.exports,exists=n=>n&&Object.prototype.hasOwnProperty.call(ex,n);
 const names=s=>[`${pref}_${s}1_${index}`,`${pref}_${s}_${index}`,`${pref}_${s}1`,`${pref}_${s}`,`${pref}_${s}1_1`,`${pref}_${s}_1`];
 let candidates=names(state);
 if(state==='charge'||state==='dash')candidates.push(...names('run'));
 candidates.push(cfg.animations?.[`${team===1?1:0}:${state}`]?.[index-1],...names('idle'),pref);
 return candidates.find(exists)||null;
}
// A rotation timeline is a pose lookup (north -> east -> south), not an animation.
function rotationPose(heading,count){
 heading=Number.isFinite(heading)?heading:-Math.PI/2;
 const dx=Math.cos(heading),dy=Math.sin(heading),angle=Math.atan2(Math.abs(dx)<1e-9?0:Math.abs(dx),-dy);
 return {frame:Math.round(angle/Math.PI*Math.max(0,(count||1)-1)),flip:dx < -1e-9};
}
function renderPosition(u,alpha=1){alpha=Math.max(0,Math.min(1,Number.isFinite(alpha)?alpha:1));return {x:(u.previousX??u.x)+(u.x-(u.previousX??u.x))*alpha,y:(u.previousY??u.y)+(u.y-(u.previousY??u.y))*alpha};}
function flightOffset(def){return Math.max(0,Number(def?.source?.FlyingHeight)||0)/1000*20;}
// Source sprites have a visual ground pivot distinct from their collision center.
// Registered against the reference's four intact tower bases (26-72 inliers each).
function towerArtPosition(t){return {x:t.x+(t.king||t.preview||t.customCrown?0:t.x<240?55/6:-55/6),y:t.y-(t.preview?0:25/6)};}
function shapeRasterScale(w,h,requested=1){
 if(!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0||w>262144||h>262144)throw Error('Invalid native shape extent');
 // Validate before allocating. Flat, oversized arena backdrops do not need
 // enormous supersampled bitmaps; small sprites retain the selected texture quality.
 return Math.min(Math.max(.5,Math.min(3,Number(requested)||1)),8191/w,8191/h,Math.sqrt(8380000/(w*h)));
}
function kingTowerPose(t,time,duration=3.3){
 const activating=Number.isFinite(t.activationAt),progress=t.active?1:activating?Math.max(0,Math.min(1,(time-(t.activationAt-duration))/duration)):0;
 return {frame:Math.min(97,Math.floor(progress*97)),progress};
}
function towerAttachmentOffset(t){return (Number(t.def?.source?.AttachedCharacterHeight)||2200)/100*6/5;}
function entityElevation(u){const p=Math.max(0,Math.min(1,u.riverJump?.progress??(u.dash?.moving&&u.def?.source?.FlyDuringDash?u.dash.progress:0)));return flightOffset(u.def)+Math.sin(Math.PI*p)*Math.max(0,Number(u.def?.source?.JumpHeight)||0)/1000*20;}

// The authored action_frame is the release pose. Simulation supplies when the
// hit actually happened; recovery then plays at the original clip rate.
function attackClipTime(clip,elapsed,attack){
 const frame=clip?.labels?.indexOf('action_frame')??-1;if(!attack||frame<0)return null;
 const action=frame/clip.fps,duration=clip.frames.length/clip.fps;
 const released=Number.isFinite(attack.releasedAt),time=released?action+Math.max(0,elapsed-attack.releasedAt):Math.max(0,Math.min(action-1e-6,action*(attack.windup>0?elapsed/attack.windup:1)));
 return {time,done:released&&time>=duration};
}
function hookClipTime(clip,elapsed,u){
 const labels=clip?.labels||[],at=name=>labels.indexOf(name),fps=clip?.fps||60;
 if(at('throw_start')<0)return {time:elapsed,done:false};
 if(u.hook){const throwDuration=(at('throw_end')-at('throw_start'))/fps,remaining=Math.max(0,u.hook.remaining);
  return {time:remaining>throwDuration?at('loop_start')/fps+elapsed%((at('loop_end')-at('loop_start')+1)/fps):at('throw_start')/fps+throwDuration-remaining,done:false};}
 if(u.visualHook?.phase==='outbound')return {time:at('throw_hold')/fps,done:false};
 const age=Math.max(0,elapsed-(u.visualHook?.startedAt||0)),hold=at('pull_hold')/fps,start=at('pull_start')/fps;
 const time=age<(u.visualHook?.duration||0)?Math.min(hold,start+age):hold+Math.max(0,age-(u.visualHook?.duration||0));
 return {time,done:time>=clip.frames.length/fps};
}

function effectOpacity(age,ttl){if(!Number.isFinite(age)||!Number.isFinite(ttl)||ttl<=0)return 0;return Math.pow(Math.max(0,Math.min(1,1-age/ttl)),1.5);}
function battleEndState(elapsed,enemyCrowns=0,playerCrowns=0,winner=-1,crownSlots=3){
 elapsed=Math.max(0,Number(elapsed)||0);const clamp=v=>Math.max(0,Math.min(1,v));
 const boardProgress=clamp((elapsed-.88)/.60),starts=crownSlots>3?Array.from({length:crownSlots},(_,i)=>1.38+i*.75/Math.max(1,crownSlots-1)):[1.45,2.03,2.61],duration=crownSlots>3?.32:.48;
 const progress=count=>starts.map((start,i)=>i<Math.max(0,Math.min(crownSlots,count))?clamp((elapsed-start)/duration):0);
 const enemyCrownProgress=progress(enemyCrowns),playerCrownProgress=progress(playerCrowns),winnerProgress=clamp((elapsed-2.40)/.25);
 return{phase:elapsed<.88?'match-over':'board',boardProgress,enemyCrownProgress,playerCrownProgress,enemyCrownsVisible:enemyCrownProgress.filter(v=>v>0).length,playerCrownsVisible:playerCrownProgress.filter(v=>v>0).length,winner,winnerProgress,winnerVisible:elapsed>=2.40,okVisible:elapsed>=2.65,elapsed};
}
function projectilePosition(p,target){
 if(p.line&&Number.isFinite(p.constantHeight))return{x:p.x,y:p.y-p.constantHeight};
 const progress=Math.min(1,p.travel/Math.max(.01,p.launchDistance||1)),end=target?entityElevation(target)+(target.king!==undefined?46:target.building?30:18):0;
 const duration=(p.launchDistance||0)/Math.max(.01,p.speed||1),arc=Math.max(0,Number(p.gravity)||0)*duration*duration*.5*progress*(1-progress);
 const z=(p.launchHeight||0)*(1-progress)+end*progress+arc;
 return {x:p.x,y:p.y-z};
}
// Ordinary projectile artwork is authored facing +X. Rocket is a separate
// pitch atlas authored on the Y axis. Ground and altitude derivatives differ.
// Fireball/Rocket must
// face their flight tangent; a rotation timeline is a pitch lookup, not a timer.
function projectilePose(p,target){const pos=projectilePosition(p,target),distance=Math.max(.001,p.launchDistance||1),speed=Math.max(.001,p.speed||1),q=Math.max(0,Math.min(1,p.travel/distance)),duration=distance/speed,end=target?entityElevation(target)+(target.king!==undefined?46:target.building?30:18):0;
 const vz=p.line?0:((end-(p.launchHeight||0))+.5*(p.gravity||0)*duration*duration*(1-2*q))*speed/distance;
 const vx=(p.vx||0)*speed*(480/18),vy=(p.vy||0)*speed*20-vz;
 return {...pos,vx,vy,vz,angle:Math.atan2(vy,vx),groundAngle:Math.atan2((p.vy||0)*20,(p.vx||0)*(480/18)),pitch:Math.atan2(-vz,speed*20)};
}
// The six Canvas affine coefficients mapping source points into destination points.
function affine(src,dst){const [p,q,r]=src,[a,b,c]=dst,ux=q[0]-p[0],uy=q[1]-p[1],vx=r[0]-p[0],vy=r[1]-p[1],det=ux*vy-uy*vx;if(Math.abs(det)<1e-8)return null;const ax=b[0]-a[0],ay=b[1]-a[1],bx=c[0]-a[0],by=c[1]-a[1];const m=[(ax*vy-bx*uy)/det,(ay*vy-by*uy)/det,(bx*ux-ax*vx)/det,(by*ux-ay*vx)/det,0,0];m[4]=a[0]-m[0]*p[0]-m[2]*p[1];m[5]=a[1]-m[1]*p[0]-m[3]*p[1];return m.map(v=>Math.abs(v)<1e-12?0:v);}
// SC frequently describes a stretched texel as a zero-area UV rectangle.
// A 2D affine solver cannot invert it. Give that texel its physical one-pixel
// footprint before mapping, preserving the varying axis and the original pixels.
function expandStripeUV(uv,width,height){
 if(uv.length!==4)return uv;const result=uv.map(p=>[...p]);
 const flat=[0,1].map(axis=>Math.max(...uv.map(p=>p[axis]))-Math.min(...uv.map(p=>p[axis]))<1e-5);
 for(let axis=0;axis<2;axis++){if(!flat[axis])continue;const limit=axis?height:width,center=Math.max(.5,Math.min(limit-.5,uv[0][axis]));
  const other=1-axis,alongFirst=Math.abs(uv[1][other]-uv[0][other])>Math.abs(uv[3][other]-uv[0][other]);
  const first=flat[other]?axis===0:!alongFirst;
  const positive=first?[1,2]:[2,3];for(let i=0;i<4;i++)result[i][axis]=center+(positive.includes(i)?.5:-.5);
 }return result;
}
function mul(a,b){return[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]]}
const point=(m,p)=>[m[0]*p[0]+m[2]*p[1]+m[4],m[1]*p[0]+m[3]*p[1]+m[5]];
function opaqueTint(color){return color&&color[3]!==255?[color[0],color[1],color[2],255,color[4],color[5],color[6]]:color;}
function canvas(w,h){const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));return c;}
// Pool mask buffers instead of allocating full battle surfaces every frame.
const maskPool=[];let maskPoolPixels=0;
function maskLayerFor(parent){const w=parent.canvas.width,h=parent.canvas.height,index=maskPool.findIndex(c=>c.width===w&&c.height===h);let cv;
 if(index>=0){cv=maskPool.splice(index,1)[0];maskPoolPixels-=w*h;}else cv=canvas(w,h);
 const ctx=cv.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.clearRect(0,0,w,h);ctx.setTransform(parent.getTransform());return ctx;
}
function releaseMask(ctx){if(!ctx)return;const cv=ctx.canvas,pixels=cv.width*cv.height;if(maskPool.length<6&&maskPoolPixels+pixels<=8388608){maskPool.push(cv);maskPoolPixels+=pixels;}else{cv.width=1;cv.height=1;}}
function imageFrom(url){return new Promise((resolve,reject)=>{const img=new Image();img.crossOrigin='anonymous';img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('An embedded native texture did not decode'));img.src=url;});}
class Scene{
 constructor(data,images){this.data=data;this.images=images;this.cache=new Map();this.tintCache=new Map();this.tintPixels=0;this.drawCount=0;this.frameSamples=new Set();this.animationCache=new Map();}
 id(name){return typeof name==='string'&&!/^\d+$/.test(name)?this.data.exports[name]:name;}
 clip(name){return this.data.clips[this.id(name)]}
 animated(name){const id=this.id(name);if(this.animationCache.has(id))return this.animationCache.get(id);const seen=new Set(),visit=(idx)=>{if(seen.has(idx))return false;seen.add(idx);const c=this.data.clips[idx];return !!c&&(c.frames.length>1||c.frames.some(f=>f.some(i=>visit(i[0]))));};const result=visit(id);this.animationCache.set(id,result);return result;}
 // Resolve single-frame arena containers, but keep actual timelines and masks
 // intact. Each returned part stays in source painter order. No troop/HUD path
 // uses this plan, and animated parts are still rendered at the live clock.
 arenaParts(name,animate=true,frame){
  const root=this.id(name),parts=[];
  const walk=(id,m,color,blend,depth)=>{
   if(depth>20)throw Error('SC nesting limit');
   const clip=this.data.clips[id],dynamic=animate&&frame===undefined&&this.animated(id);
   const masked=clip?.frames[0]?.some(([child])=>this.data.modifiers?.[child]);
   if(!dynamic||!clip||clip.frames.length!==1||masked){parts.push({id,m,color,blend,dynamic,frame});return;}
   for(const [child,mat,col,mode] of clip.frames[0]){
    const own=col===NONE?null:this.data.colors[col];let cc=own||color;
    if(color&&own)cc=[color[0]+own[0]*color[4]/255,color[1]+own[1]*color[5]/255,color[2]+own[2]*color[6]/255,color[3]*own[3]/255,color[4]*own[4]/255,color[5]*own[5]/255,color[6]*own[6]/255];
    walk(child,mat===NONE?m:mul(m,this.data.matrices[mat]),cc,({3:'multiply',4:'screen',8:'lighter'})[mode]||blend,depth+1);
   }
  };walk(root,I,null,null,0);return parts;
 }
 shapeBounds(id){
  this.shapeBoxes||=new Map();if(this.shapeBoxes.has(id))return this.shapeBoxes.get(id);
  const chunks=this.data.shapes[id];if(!chunks?.length)return null;
  let x=Infinity,y=Infinity,right=-Infinity,bottom=-Infinity;
  for(const chunk of chunks)for(const p of chunk.xy){x=Math.min(x,p[0]);y=Math.min(y,p[1]);right=Math.max(right,p[0]);bottom=Math.max(bottom,p[1]);}
  const box={x:Math.floor(x)-1,y:Math.floor(y)-1,width:Math.ceil(right)-Math.floor(x)+2,height:Math.ceil(bottom)-Math.floor(y)+2};
  shapeRasterScale(box.width,box.height,1);this.shapeBoxes.set(id,box);return box;
 }
 outsideCanvas(c,box){
  if(!box||!c.getTransform||!c.canvas)return false;
  const t=c.getTransform(),m=[t.a,t.b,t.c,t.d,t.e,t.f],pts=[[box.x,box.y],[box.x+box.width,box.y],[box.x,box.y+box.height],[box.x+box.width,box.y+box.height]].map(p=>point(m,p));
  return Math.max(...pts.map(p=>p[0])) < -2 || Math.min(...pts.map(p=>p[0])) > c.canvas.width+2 || Math.max(...pts.map(p=>p[1])) < -2 || Math.min(...pts.map(p=>p[1])) > c.canvas.height+2;
 }
 // Huge one-polygon backdrops can go straight into the clipped arena cache.
 // Avoid a many-megapixel intermediate, without downscaling the source texture.
 drawRawShape(c,id){
  this.rawShapePlans||=new Map();let plan=this.rawShapePlans.get(id);
  if(!plan){plan=[];for(const chunk of this.data.shapes[id]||[]){
   const img=this.images[chunk.texture];if(!img)throw Error('Missing SC texture');
   const uv=expandStripeUV(chunk.uv.map(p=>[p[0]*img.naturalWidth,p[1]*img.naturalHeight]),img.naturalWidth,img.naturalHeight),xy=chunk.xy;
   let m=null;for(let j=1;j<xy.length-1&&!m;j++)m=affine([uv[0],uv[j],uv[j+1]],[xy[0],xy[j],xy[j+1]]);
   if(!m)continue;
   if(uv.every((p,i)=>{const q=point(m,p);return Math.hypot(q[0]-xy[i][0],q[1]-xy[i][1])<.45}))plan.push({img,xy,m});
   else for(let j=1;j<xy.length-1;j++){const v=[xy[0],xy[j],xy[j+1]],matrix=affine([uv[0],uv[j],uv[j+1]],v);if(matrix)plan.push({img,xy:v,m:matrix});}
  }this.rawShapePlans.set(id,plan);}
  for(const op of plan){c.save();c.beginPath();op.xy.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.clip();c.transform(...op.m);c.drawImage(op.img,0,0);c.restore();}
 }
 releaseRasters(){
  const images=new Set([...this.cache.values(),...this.tintCache.values()].map(s=>s.image));
  this.stillPlans?.clear();this.cache.clear();this.tintCache.clear();this.tintPixels=0;
  for(const image of images)if(image&&typeof image==='object'){image.width=1;image.height=1;}
 }
 duration(name){const c=this.clip(name);return c?c.frames.length/c.fps:0;}
 bounds(name,seconds=0){const points=[];const visit=(id,m,t,depth)=>{if(depth>20)throw Error('SC nesting limit');const shape=this.data.shapes[id];if(shape){for(const chunk of shape)for(const p of chunk.xy)points.push(point(m,p));return;}const clip=this.data.clips[id];if(!clip)return;for(const [child,mat] of clip.frames[frameAt(t,clip.fps,clip.frames.length)])visit(child,mul(m,mat===NONE?I:this.data.matrices[mat]),t,depth+1);};visit(this.id(name),I,seconds,0);if(!points.length)return{x:0,y:0,width:1,height:1};const x=Math.min(...points.map(p=>p[0])),y=Math.min(...points.map(p=>p[1]));return{x,y,width:Math.max(...points.map(p=>p[0]))-x,height:Math.max(...points.map(p=>p[1]))-y};}
 prepareQuality(){const scale=this.data.qualityIndependent?1:(globalThis.RoyaleGraphics?.current.textureScale??1);if(this.textureScale===scale)return;this.textureScale=scale;this.releaseRasters();}
 shape(id){this.prepareQuality();if(this.cache.has(id))return this.cache.get(id);const chunks=this.data.shapes[id];if(!chunks)return null;
  const pts=chunks.flatMap(s=>s.xy),lo=[Math.floor(Math.min(...pts.map(p=>p[0])))-1,Math.floor(Math.min(...pts.map(p=>p[1])))-1],hi=[Math.ceil(Math.max(...pts.map(p=>p[0])))+1,Math.ceil(Math.max(...pts.map(p=>p[1])))+1];
  const logicalW=hi[0]-lo[0],logicalH=hi[1]-lo[1],quality=shapeRasterScale(logicalW,logicalH,(this.data.rasterScale||1)*this.textureScale),cv=canvas(logicalW*quality,logicalH*quality);const c=cv.getContext('2d');c.scale(quality,quality);c.translate(-lo[0],-lo[1]);c.imageSmoothingEnabled=true;
  for(const chunk of chunks){const img=this.images[chunk.texture];if(!img)throw Error('Missing SC texture');const uv=expandStripeUV(chunk.uv.map(p=>[p[0]*img.naturalWidth,p[1]*img.naturalHeight]),img.naturalWidth,img.naturalHeight);const xy=chunk.xy;
   // Most source polygons are clipped affine sprites. Use one draw where possible
   // to avoid triangle seams; deformed meshes use their source triangle fan.
   let m=null;for(let j=1;j<xy.length-1&&!m;j++)m=affine([uv[0],uv[j],uv[j+1]],[xy[0],xy[j],xy[j+1]]);
   if(!m)continue;
   const linear=uv.every((p,i)=>{const q=point(m,p);return Math.hypot(q[0]-xy[i][0],q[1]-xy[i][1])<.45});
   const draw=(vertices,matrix)=>{if(!matrix)return;c.save();c.beginPath();vertices.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.clip();c.transform(...matrix);c.drawImage(img,0,0);c.restore();};
   if(linear)draw(xy,m);else for(let j=1;j<xy.length-1;j++){const v=[xy[0],xy[j],xy[j+1]];draw(v,affine([uv[0],uv[j],uv[j+1]],v));}
  }
  const result={image:cv,x:lo[0],y:lo[1],w:logicalW,h:logicalH};this.cache.set(id,result);return result;
 }
 coloredShape(id,color){const sh=this.shape(id);if(!sh||!color||color[0]===0&&color[1]===0&&color[2]===0&&color[3]===255&&color[4]===255&&color[5]===255&&color[6]===255)return sh;const key=`${id}:${color.join(',')}`;let painted=this.tintCache.get(key);if(!painted){const cv=canvas(sh.image.width,sh.image.height),ct=cv.getContext('2d');ct.drawImage(sh.image,0,0);const px=ct.getImageData(0,0,cv.width,cv.height),p=px.data;for(let i=0;i<p.length;i+=4){p[i]=Math.min(255,p[i]*color[4]/255+color[0]);p[i+1]=Math.min(255,p[i+1]*color[5]/255+color[1]);p[i+2]=Math.min(255,p[i+2]*color[6]/255+color[2]);p[i+3]*=color[3]/255;}ct.putImageData(px,0,0);painted={...sh,image:cv};const pixels=cv.width*cv.height;while(this.tintCache.size&&(this.tintCache.size>=128||this.tintPixels+pixels>4194304)){const oldest=this.tintCache.keys().next().value,evicted=this.tintCache.get(oldest);this.tintPixels-=evicted.image.width*evicted.image.height;this.tintCache.delete(oldest);}if(pixels<=4194304){this.tintCache.set(key,painted);this.tintPixels+=pixels;}}return painted;}
 // Explicitly still HUD assemblies can reuse resolved source geometry. This
 // keeps the original shape textures and live glyph painter; it does not flatten
 // artwork to a lower-resolution bitmap or freeze an animated unit/effect.
 drawStill(c,name,options={}){this.prepareQuality();const id=this.id(name);if(id===undefined)return false;if(options.replaceNodes)return this.draw(c,name,0,{...options,still:true});
  this.stillPlans||=new Map();const key=JSON.stringify([id,options.frame??0,options.instances||null,options.initialColor||null]);let plan=this.stillPlans.get(key);
  if(plan===undefined){plan=[];let supported=true;
   const visit=(idx,m,depth,color,blend=null,instance='',instancePath='')=>{
    if(depth>20)throw Error('SC nesting limit');const control=options.instances?.[instancePath]||options.instances?.[instance]||{};if(control.visible===false)return;
    if(this.data.modifiers?.[idx]){supported=false;return;}
    const field=this.data.textFields?.[idx];if(field){plan.push({m,field,color,blend,instance,instancePath});return;}
    const sh=this.coloredShape(idx,opaqueTint(color));if(sh){plan.push({m,shape:idx,sh,blend,alpha:color?color[3]/255:1});return;}
    const clip=this.data.clips[idx];if(!clip)return;let f=depth===0?Math.max(0,Math.min(clip.frames.length-1,options.frame??0)):0;
    if(Number.isFinite(control.progress))f=Math.round(Math.max(0,Math.min(1,control.progress))*(clip.frames.length-1));if(Number.isFinite(control.frame))f=Math.max(0,Math.min(clip.frames.length-1,Math.floor(control.frame)));
    if(this.frameSamples.size<4096)this.frameSamples.add(`${idx}:${f}`);
    for(const [slot,[child,mat,col,mode]]of clip.frames[f].entries()){
     const childName=clip.frameNames?.[f]?.[slot]??clip.childrenNames?.[clip.children?.indexOf(child)]??'',own=col===NONE?null:this.data.colors[col];let cc=own||color;
     if(color&&own)cc=[color[0]+own[0]*color[4]/255,color[1]+own[1]*color[5]/255,color[2]+own[2]*color[6]/255,color[3]*own[3]/255,color[4]*own[4]/255,color[5]*own[5]/255,color[6]*own[6]/255];
     visit(child,mat===NONE?m:mul(m,this.data.matrices[mat]),depth+1,cc,({3:'multiply',4:'screen',8:'lighter'})[mode]||blend,childName,instancePath?instancePath+'.'+childName:childName);
    }
   };visit(id,I,0,options.initialColor||null);if(!supported)plan=null;
   if(this.stillPlans.size>=128)this.stillPlans.delete(this.stillPlans.keys().next().value);this.stillPlans.set(key,plan);
  }
  if(!plan)return this.draw(c,name,0,{...options,still:true});this.drawCount++;
  for(const op of plan){c.save();c.transform(...op.m);if(op.blend)c.globalCompositeOperation=op.blend;
   if(op.sh){c.globalAlpha*=op.alpha;c.drawImage(op.sh.image,op.sh.x,op.sh.y,op.sh.w??op.sh.image.width,op.sh.h??op.sh.image.height);}
   else{const value=options.texts?.[op.instancePath]??options.texts?.[op.instance]??op.field.text;if(value!==undefined&&value!==null&&String(value).length)globalThis.RoyaleText?.field(c,op.field,String(value),op.color);}
   c.restore();
  }return true;
 }
 draw(c,name,seconds=0,options={}){const id=this.id(name);if(id===undefined)return false;this.drawCount++;const tick=options.still?0:seconds;
  const visit=(idx,time,depth,color,instance='',instancePath='')=>{
   if(depth>20)throw Error('SC nesting limit');
   const control=options.instances?.[instancePath]||options.instances?.[instance]||{};
   if(control.visible===false)return;
   if(options.replaceNodes?.[idx]){options.replaceNodes[idx](c,color);return;}
   const field=this.data.textFields?.[idx];
   if(field){const value=options.texts?.[instancePath]??options.texts?.[instance]??field.text;
    if(value!==undefined&&value!==null&&String(value).length)globalThis.RoyaleText?.field(c,field,String(value),color);return;}
   if(options.arena&&this.data.shapes[idx]){
    const box=this.shapeBounds(idx);if(this.outsideCanvas(c,box))return;
    const identity=!color||color[0]===0&&color[1]===0&&color[2]===0&&color[4]===255&&color[5]===255&&color[6]===255;
    if(box&&identity&&this.data.shapes[idx].length===1&&(box.width*box.height>1048576||box.width>4096||box.height>4096)){
     if(color)c.globalAlpha*=color[3]/255;this.drawRawShape(c,idx);return;
    }
   }
   const sh=this.coloredShape(idx,opaqueTint(color));if(sh){
    if(color)c.globalAlpha*=color[3]/255;c.drawImage(sh.image,sh.x,sh.y,sh.w??sh.image.width,sh.h??sh.image.height);return;
   }
   const clip=this.data.clips[idx];if(!clip)return;let f=frameAt(time,clip.fps,clip.frames.length,depth===0?options.loop!==false:true);if(depth===0&&options.frame!==undefined)f=Math.max(0,Math.min(clip.frames.length-1,options.frame));
   if(Number.isFinite(control.progress))f=Math.round(Math.max(0,Math.min(1,control.progress))*(clip.frames.length-1));
   if(Number.isFinite(control.frame))f=Math.max(0,Math.min(clip.frames.length-1,Math.floor(control.frame)));
   if(this.frameSamples.size<4096)this.frameSamples.add(`${idx}:${f}`);
   // SC modifier nodes define alpha masks; the red mask geometry is never
   // visible artwork. Composite a group in device pixels, preserving transforms.
   const groupParent=c;let maskLayer=null,contentLayer=null,maskPhase=0;
   const layer=()=>maskLayerFor(groupParent);
   const flushMask=()=>{if(contentLayer&&maskLayer){contentLayer.save();contentLayer.setTransform(1,0,0,1,0,0);contentLayer.globalCompositeOperation='destination-in';contentLayer.drawImage(maskLayer.canvas,0,0);contentLayer.restore();groupParent.save();groupParent.setTransform(1,0,0,1,0,0);groupParent.drawImage(contentLayer.canvas,0,0);groupParent.restore();}c=groupParent;releaseMask(maskLayer);releaseMask(contentLayer);maskLayer=contentLayer=null;maskPhase=0;};
   for(const [slot,[child,mat,col,blend]] of clip.frames[f].entries()){
    const modifier=this.data.modifiers?.[child];
    if(modifier===38){if(maskPhase)flushMask();maskLayer=layer();c=maskLayer;maskPhase=1;continue;}
    if(modifier===39){contentLayer=layer();c=contentLayer;maskPhase=2;continue;}
    if(modifier===40){flushMask();continue;}if(modifier===37)continue;
const childName=clip.frameNames?.[f]?.[slot]??clip.childrenNames?.[clip.children?.indexOf(child)]??'';c.save();if(mat!==NONE)c.transform(...this.data.matrices[mat]);let cc=col===NONE?color:this.data.colors[col];if(color&&col!==NONE){const own=this.data.colors[col];cc=[color[0]+own[0]*color[4]/255,color[1]+own[1]*color[5]/255,color[2]+own[2]*color[6]/255,color[3]*own[3]/255,color[4]*own[4]/255,color[5]*own[5]/255,color[6]*own[6]/255];}
    if(blend===3)c.globalCompositeOperation='multiply';else if(blend===4)c.globalCompositeOperation='screen';else if(blend===8)c.globalCompositeOperation='lighter';
    visit(child,time,depth+1,cc,childName,instancePath?instancePath+'.'+childName:childName);c.restore();}
   if(maskPhase)flushMask();
  };visit(id,tick,0,options.initialColor||null);return true;
 }
}
// Collect the exact scene closure for both decks, including death spawns,
// spawned troops, attached riders, spell projectiles and their secondary effects.
function sceneDependencies(data,game,decks,arenaId){
 const found=new Set(['building_tower','chr_king','chr_princess','effects','ui_battle_end']),seen=new Set();
 const tables=['entities','projectiles','areas','buffs'];
 function visit(value,depth=0){if(depth>40||value==null)return;if(Array.isArray(value)){for(const x of value)visit(x,depth+1);return;}
  if(typeof value==='object'){for(const x of Object.values(value))visit(x,depth+1);return;}if(typeof value!=='string')return;
  for(const scene of data.fxDependencies?.[value]||[])found.add(scene);
  if(data.units[value])found.add(data.units[value].scene);if(data.projectiles?.[value])found.add(data.projectiles[value].scene);
  for(const table of tables){const key=table+':'+value,row=game[table]?.[value];if(row&&!seen.has(key)){seen.add(key);visit(row,depth+1);}}
 }
 for(const id of decks.flat()){const card=game.cards.find(c=>c.id===id);if(card)visit(card);}
 if(arenaId!=='custom'){const arena=data.arenas.find(a=>a.id===arenaId)||data.arenas[0];found.add(arena.scene);for(const ob of arena.objects)if(ob.scene)found.add(ob.scene);}
 return [...found].filter(name=>data.scenes[name]).sort();
}
function customSourceArenaId(layout){
 const theme=layout?.theme||'';
 if(theme==='jungle'||theme==='garden')return'jungle';
 if(theme==='volcano'||theme==='lava')return'pekka';
 if(theme==='ice')return'frozen';
 if(theme==='moon-castle')return'serenity';
 if(theme==='touchdown'||theme==='touchdown-wide')return'barbarian';
 if(theme==='river-fort'||theme==='castle'||theme==='bastion')return'royal';
 return'royal';
}
function arenaLayers(a,overtime=false){const layers={Base:0,Ground:1,Object:2,Above:3};return[{name:a.export,x:0,y:0,scene:a.scene,layer:'Base'},...a.objects.filter(o=>!o.visibility||o.visibility==='Always'||(overtime?o.visibility==='Overtime':o.visibility==='NormalTime')).slice().sort((x,y)=>(layers[x.layer]??2)-(layers[y.layer]??2)||(x.sort||0)-(y.sort||0)||x.y-y.y)];}
class Library{
 constructor(data,embedded){this.data=data;this.embedded=embedded;this.scenes={};this.ready=false;this.error=null;this.arenaId=data.arenas[0].id;this.arenaCache=new Map();this.towerShadowCache=new Map();this.loadedTextures=0;this.pending=new Map();this.textureImages=new Map();this.assetBase=globalThis.document?.baseURI||'http://localhost/';}
 async fetchScene(name){
  if(this.scenes[name])return this.scenes[name];if(this.pending.has(name))return this.pending.get(name);
  const pending=(async()=>{let definition=this.data.scenes[name];if(!definition)throw Error('Unknown native scene: '+name);
   if(definition.file){const url=new URL(definition.file,this.assetBase),response=await fetch(url,{cache:'force-cache',credentials:'same-origin'});if(!response.ok)throw Error(`Scene ${name}: HTTP ${response.status}`);
    if(url.pathname.endsWith('.json.gz')){
     if(typeof DecompressionStream!=='function')throw Error('Update your browser to load game animations. iPhone requires iOS 16.4 or later.');
     // These are explicit gzip assets, independent of HTTP Content-Encoding.
     definition=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).json();
    }else definition=await response.json();
   }
   const images=await Promise.all(definition.textures.map(async t=>{
    if(!this.textureImages.has(t.file)){const path=this.embedded[t.file];if(!path)throw Error('Missing native texture '+t.file);
     const job=imageFrom(path).then(im=>{this.loadedTextures++;this.onProgress?.();return im;}).catch(e=>{this.textureImages.delete(t.file);throw e;});this.textureImages.set(t.file,job);}
    return this.textureImages.get(t.file);
   }));return this.scenes[name]=new Scene({...definition,rasterScale:/^(level_|building_tower$|chr_(king|princess)$)/.test(name)?2:definition.rasterScale},images);
  })();this.pending.set(name,pending);try{return await pending;}finally{this.pending.delete(name);}
 }
 async ensureScenes(names){const queue=[...new Set(names)];let index=0;const worker=async()=>{while(index<queue.length){const name=queue[index++];await this.fetchScene(name);}};await Promise.all(Array.from({length:Math.min(4,queue.length)},worker));return this;}
 retainScenes(names){const keep=new Set(names),textures=new Set();for(const n of keep)for(const t of this.data.scenes[n]?.textures||[])textures.add(t.file);for(const [n,scene]of Object.entries(this.scenes))if(!keep.has(n)){if(scene.releaseRasters)scene.releaseRasters();else scene.cache.clear();delete this.scenes[n];}for(const key of this.textureImages.keys())if(!textures.has(key))this.textureImages.delete(key);this.releaseArenaCache();this.metricCache?.clear();}
 async prepareBattle(battle,game){this.error=null;if(globalThis.RoyaleGraphics?.current?.potato){this.preparation=(this.preparation||0)+1;await this.ensureScenes(['ui_battle_end']);this.retainScenes(['ui_battle_end']);globalThis.RoyaleCustomArena?.clear();return this;}const names=sceneDependencies(this.data,game,battle.boatConfiguration?[...battle.initialDecks,...battle.boatConfiguration.cards]:battle.initialDecks,battle.arenaLayout?.custom?'custom':this.arenaId),generation=this.preparation=(this.preparation||0)+1;for(const tower of battle.towers||[]){const skin=globalThis.RoyaleCosmetics?.skin(tower.skin);if(skin?.scene&&this.data.scenes[skin.scene]&&!names.includes(skin.scene))names.push(skin.scene);}if(battle.arenaLayout?.custom){const sourceId=customSourceArenaId(battle.arenaLayout);for(const dep of sceneDependencies(this.data,game,[],sourceId))if(!names.includes(dep))names.push(dep);if(!names.includes('level_spooky_arena')&&this.data.scenes.level_spooky_arena)names.push('level_spooky_arena');}try{await this.ensureScenes(names);if(generation===this.preparation){this.retainScenes(names);if(battle.arenaLayout?.custom)globalThis.RoyaleCustomArena?.prepare(battle,this);else{this.arenaRuns(false);this.arenaRuns(true);}if(battle.initialDecks?.flat().includes('fireball'))await this.fx?.prewarmFireball?.();}return this;}catch(e){this.error=e.message;throw e;}}
 async loadHUD(urls){this.ui={};await Promise.all(['level-crown'].map(async key=>{if(urls[key])this.ui[key]=await imageFrom(urls[key]);}));}
 async load(){try{if(!this.data.streamed)await this.ensureScenes(Object.keys(this.data.scenes));this.ready=true;return this;}catch(e){this.error=e.message;throw e;}}
 setArena(id){if(!this.data.arenas.some(a=>a.id===id))throw RangeError('Unknown arena');if(this.arenaId!==id)this.releaseArenaCache();this.arenaId=id;}
 get arena(){return this.data.arenas.find(a=>a.id===this.arenaId)}
 unit(c,id,x,y,team,time,state='idle',heading=-Math.PI/2,started=0,scale=1,options={}){
  const cfg=this.data.units[id];if(!cfg)return false;const sc=this.scenes[cfg.scene];if(!sc)return false;
  if(state==='attack'&&options.entity?.visualAttackCancelled)state='idle';
  if(!options.entity?.visualAttackCancelled&&(options.entity?.hook||options.entity?.visualHook&&state!=='run'&&state!=='dash'))state='loading';
  const d=direction(Math.cos(heading),Math.sin(heading));let name=resolveAnimation(cfg,sc,team,state,d.index);if(!name)return false;
  let elapsed=options.elapsed??Math.max(0,time-started);const nativeDuration=sc.duration(name),attackDuration=options.attackDuration||nativeDuration;
  if(state==='loading'){
   const synced=hookClipTime(sc.clip(name),elapsed,options.entity||{});elapsed=synced.time;
   if(synced.done){state='idle';name=resolveAnimation(cfg,sc,team,state,d.index);elapsed=options.idleTime??time;}
  }else if(state==='attack'){
   const synced=attackClipTime(sc.clip(name),elapsed,options.entity?.visualAttack);
   if(synced?.done||(!synced&&elapsed>=attackDuration)){state='idle';name=resolveAnimation(cfg,sc,team,state,d.index);elapsed=options.idleTime??time;}
   else if(synced)elapsed=synced.time;else if(attackDuration>0)elapsed*=nativeDuration/attackDuration;
  }else if(state==='run'||state==='charge'){
   // Ground stride is tied to travelled tiles (Speed60 is one tile/second).
   // Wingbeats keep their independent clock when an airborne troop hovers.
   if(options.entity&&!options.entity.air&&Number.isFinite(options.entity.walk))elapsed=options.entity.walk;
   elapsed*=Math.max(.1,1+(cfg.walkTweak||0)/100);
  }
  if(globalThis.RoyaleGraphics)elapsed=globalThis.RoyaleGraphics.animationTime(elapsed);
  c.save();c.translate(x,y-(options.height??cfg.flightHeight??0));
  const factor=scale*(5/6)*cfg.scale;
  const views=cfg.animations?.[`${team===1?1:0}:${state}`]||[],directional=new Set(views.filter(v=>v&&sc.id(v)!==undefined)).size>1;
  const rotation=!directional&&(options.entity?.def?.source?.HasRotationOnTimeline===true||cfg.rotationTimeline===true);
  c.scale((d.flip&&!cfg.building&&!rotation?-1:1)*factor,factor);
  c.filter=teamFilter(team);
  const clip=sc.clip(name),pose=rotation?rotationPose(heading,clip?.frames?.length||1):null;if(pose?.flip)c.scale(-1,1);
  const paint=color=>{sc.draw(c,name,pose?pose.frame/(clip.fps||30):elapsed,{loop:pose?false:state!=='attack'&&state!=='loading',...(pose?{frame:pose.frame}:{}),initialColor:color});
   const top=cfg.top?.[team];if(top&&sc.id(top)!==undefined)sc.draw(c,top,pose?pose.frame/(clip.fps||30):elapsed,{loop:!pose,initialColor:color});};
  if(options.entity&&globalThis.RoyalePresentation?.ready)RoyalePresentation.filtered(c,options.entity,time,paint);else paint(null);c.restore();return true;
 }
 // A stable head anchor measured from the original idle views, independent of
 // the current attack frame. This keeps health bars from bouncing with swings.
 headHeight(id){this.metricCache||=new Map();if(this.metricCache.has(id))return this.metricCache.get(id);
  const cfg=this.data.units[id],sc=cfg&&this.scenes[cfg.scene];if(!sc)return 48;
  let top=0;for(const team of [0,1])for(const dir of [1,3,5,7,9]){const name=resolveAnimation(cfg,sc,team,'idle',dir);if(name)top=Math.max(top,-sc.bounds(name).y);}
  const h=Math.max(18,Math.min(140,top*(5/6)*cfg.scale))+5;this.metricCache.set(id,h);return h;
 }
 drawProjectile(c,p,time,battle=null){const cfg=this.data.projectiles?.[p.name];if(!this.ready||!cfg)return false;const sc=this.scenes[cfg.scene],sourceTeam=p.team===1?1:0,name=sourceTeam?cfg.redExport:cfg.export;if(!sc||sc.id(name)===undefined)return false;const r=battle?.constructor?globalThis.RoyaleCore?.DATA.projectiles[p.name]||{}:{};
  const pos=projectilePose(p,battle?.getEntity(p.target)),angle=pos.angle,scale=.65*(cfg.scale||1);
  if(r.ShadowExportName){const shadow=sc.id(r.ShadowExportName)!==undefined?sc:this.scenes.effects;if(shadow?.id(r.ShadowExportName)!==undefined){c.save();c.globalAlpha*=.3;c.translate(p.x,p.y);c.rotate(angle);c.scale(scale,scale*.7);shadow.draw(c,r.ShadowExportName,0);c.restore();}}
  c.save();c.translate(pos.x,pos.y);c.filter=teamFilter(p.team);const clip=sc.clip(name),count=clip?.frames?.length||1;let options={};if(r.use360Frames&&count>1){options={frame:Math.floor(((pos.pitch/(Math.PI*2))%1+1)%1*count)};c.rotate(pos.groundAngle+Math.PI/2);}else c.rotate(p.line?pos.groundAngle:angle);c.scale(scale,scale);sc.draw(c,name,Math.max(0,time-p.born),options);c.restore();return true;}

 releaseArenaCache(){
  for(const runs of this.arenaCache.values())for(const run of runs)if(run.image){run.image.width=1;run.image.height=1;}
  this.arenaCache.clear();
 }
 arenaRuns(overtime=false){
  if(!this.ready)return null;const a=this.arena;if(!a)return null;
  const g=globalThis.RoyaleGraphics?.current,arenaScale=g?.arenaScale??2,ordered=arenaLayers(a,overtime);
  if(!ordered.every(ob=>this.scenes[ob.scene||a.scene]))return null;
  const view=globalThis.RoyaleBattleView?.worldClip||{x:-120,y:-147,width:720,height:984};
  const variant=a.objects.some(o=>o.visibility==='NormalTime'||o.visibility==='Overtime')?Number(overtime):0;
  const key=a.id+':'+variant+':'+(g?.arenaBackgrounds||'high')+':'+(g?.textures||'high')+':'+[view.x,view.y,view.width,view.height].join(',');
  if(this.arenaCache.has(key))return this.arenaCache.get(key);
  const runs=[];let current=null;
  for(const ob of ordered){
   const sc=this.scenes[ob.scene||a.scene];if(sc.id(ob.name)===undefined)throw Error('Arena decoration unavailable: '+a.id+' / '+ob.name);
   for(const part of sc.arenaParts(ob.name,g?.arenaAnimated!==false,ob.frame)){
    const op={...part,sc,m:mul([5/6,0,0,5/6,240+ob.x*5/6,-4+ob.y*5/6],part.m)};
    // Non-source-over blending needs the prior painted backdrop, so never
    // flatten that operation into an isolated transparent surface.
    if(op.dynamic||op.blend){current=null;runs.push({dynamic:op});}
    else{if(!current){current={objects:[]};runs.push(current);}current.objects.push(op);}
   }
  }
  const cached=[];
  for(const run of runs){
   if(run.dynamic){cached.push(run);continue;}
   let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
   for(const op of run.objects){
    const box=op.sc.bounds(op.id,(op.frame||0)/(op.sc.clip(op.id)?.fps||60));
    for(const p of [[box.x,box.y],[box.x+box.width,box.y],[box.x,box.y+box.height],[box.x+box.width,box.y+box.height]]){const q=point(op.m,p);x0=Math.min(x0,q[0]);y0=Math.min(y0,q[1]);x1=Math.max(x1,q[0]);y1=Math.max(y1,q[1]);}
   }
   x0=Math.max(view.x,Math.floor(x0)-2);y0=Math.max(view.y,Math.floor(y0)-2);x1=Math.min(view.x+view.width,Math.ceil(x1)+2);y1=Math.min(view.y+view.height,Math.ceil(y1)+2);
   if(x1<=x0||y1<=y0)continue;
   const cv=canvas((x1-x0)*arenaScale,(y1-y0)*arenaScale),ctx=cv.getContext('2d');ctx.scale(arenaScale,arenaScale);ctx.translate(-x0,-y0);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
   for(const op of run.objects){ctx.save();ctx.transform(...op.m);op.sc.draw(ctx,op.id,0,{frame:op.frame||0,still:true,initialColor:op.color,arena:true});ctx.restore();}
   cached.push({image:cv,x:x0,y:y0,w:x1-x0,h:y1-y0});
  }
  while(this.arenaCache.size>=2){const old=this.arenaCache.keys().next().value;for(const r of this.arenaCache.get(old))if(r.image){r.image.width=1;r.image.height=1;}this.arenaCache.delete(old);}
  this.arenaCache.set(key,cached);return cached;
 }
 drawArenaById(c,arenaId,time=0,overtime=false){
  const previous=this.arenaId;this.arenaId=arenaId;const cached=this.arenaRuns(overtime);this.arenaId=previous;if(!cached)return false;
  const g=globalThis.RoyaleGraphics?.current;time=g?.arenaAnimated===false?0:Math.floor(time*(g?.arenaFps||60))/(g?.arenaFps||60);
  for(const run of cached){if(run.image)c.drawImage(run.image,run.x,run.y,run.w,run.h);else{const op=run.dynamic;c.save();c.transform(...op.m);if(op.blend)c.globalCompositeOperation=op.blend;op.sc.draw(c,op.id,time,{initialColor:op.color,arena:true,still:!op.dynamic,...(op.frame!==undefined?{frame:op.frame}: {})});c.restore();}}
  return true;
 }
 drawArena(c,time=0,overtime=false){
  const cached=this.arenaRuns(overtime);if(!cached)return false;
  const g=globalThis.RoyaleGraphics?.current;time=g?.arenaAnimated===false?0:Math.floor(time*(g?.arenaFps||60))/(g?.arenaFps||60);
  for(const run of cached){
   if(run.image)c.drawImage(run.image,run.x,run.y,run.w,run.h);
   else{const op=run.dynamic;c.save();c.transform(...op.m);if(op.blend)c.globalCompositeOperation=op.blend;op.sc.draw(c,op.id,time,{initialColor:op.color,arena:true,still:!op.dynamic,...(op.frame!==undefined?{frame:op.frame}: {})});c.restore();}
  }return true;
 }
 drawBattleEnd(c,state,options={}){
  const sc=this.scenes.ui_battle_end;if(!sc||!state||state.phase==='match-over')return false;
  const root=sc.clip('pvp_battle_end_new'),names=root?.frameNames?.[29]||[],frame=root?.frames?.[29]||[];
  const child=(name)=>{const i=names.indexOf(name);return i>=0?frame[i]?.[0]:undefined;};
  const blue=child('player_01'),red=child('player_02');if(blue===undefined||red===undefined)return false;
  const drawPlayer=(id,centerY,progress,crowns,winner,name,clan)=>{
   const appearFrame=Math.max(1,Math.min(40,1+Math.round(state.boardProgress*39))),winnerFrame=41+Math.round((state.winnerProgress||0)*18),parentFrame=winner&&state.winnerVisible?Math.min(59,winnerFrame):appearFrame;
   const bounds=sc.bounds(id,40/60),scale=Math.min(1.12,430/Math.max(1,bounds.width));
   const x=270-(bounds.x+bounds.width/2)*scale,y=centerY-(bounds.y+bounds.height/2)*scale;
   const instances={trophies:{visible:false},trophies_crown_rush:{visible:false},crowns_crown_rush:{visible:false},winner_txt:{visible:winner&&state.winnerVisible,frame:Math.round((state.winnerProgress||0)*14)}};
   for(let i=0;i<3;i++){const p=progress[i]||0;instances['crown_'+(i+1)]={visible:progress.length<=3&&i<crowns&&p>0,frame:p>0?1+Math.round(p*48):0};}
   c.save();c.translate(x,y);c.scale(scale,scale);sc.draw(c,id,0,{frame:parentFrame,loop:false,instances,texts:{'player_name.name':name,'player_name.clan':clan||'', 'winner_txt.winner_txt.TID_WINNER':winner?'Winner!':''}});c.restore();
   if(progress.length>3){for(let i=0;i<progress.length;i++){const p=progress[i]||0,cx=270+(i-(progress.length-1)/2)*Math.min(40,300/progress.length),cy=centerY-68; c.save();c.globalAlpha=i<crowns?Math.max(.35,p):.2;const scale=Math.min(.63,6/progress.length*.63)*(p>0?.6+.4*p:1);c.translate(cx,cy);c.scale(scale,scale);c.fillStyle=i<crowns?'#ffd44e':'#63869a';c.strokeStyle='#65472c';c.lineWidth=3;c.beginPath();c.moveTo(-20,-14);c.lineTo(-10,-4);c.lineTo(0,-22);c.lineTo(10,-4);c.lineTo(20,-14);c.lineTo(16,12);c.lineTo(-16,12);c.closePath();c.fill();c.stroke();c.restore();}}
  };
  drawPlayer(red,270,state.enemyCrownProgress||[],options.enemyCrowns||0,state.winner===1,options.enemyName||'Opponent',options.enemyClan);
  drawPlayer(blue,530,state.playerCrownProgress||[],options.playerCrowns||0,state.winner===0,options.playerName||'Player',options.playerClan);
  return true;
 }
 drawTowerShadow(c,t){
  if(!this.ready||t.hp<=0)return false;
  if(t.duoKing){for(const side of [-1,1])this.drawTowerShadow(c,{...t,duoKing:false,x:t.x+side*(t.cannonOffset||480/18)});return true;}
  // Project the original model alpha onto the ground. Keep this separate from
  // its sprite so shadows cannot cover troop sprites or floating health labels.
  // SC's authored shadow size/offset/skew supply the per-model parameters;
  // the vertical ground-plane projection is an interpreter approximation.
  const key=[t.skin||'classic',t.king,t.team,!!t.active].join(':');let mask=this.towerShadowCache.get(key);
  if(!mask){mask=canvas(480,480);const x=mask.getContext('2d');x.scale(2,2);x.translate(120,170);this.drawTower(x,{...t,x:0,y:0,preview:true},0);x.setTransform(1,0,0,1,0,0);x.globalCompositeOperation='source-in';x.fillStyle='#211915';x.fillRect(0,0,480,480);if(this.towerShadowCache.size>=8)this.towerShadowCache.clear();this.towerShadowCache.set(key,mask);}
  const p=towerArtPosition(t),r=t.def?.source||{};c.save();c.globalAlpha*=.34;c.translate(p.x,p.y+22);c.transform((r.ShadowScaleX||100)/100,0,Math.tan((r.ShadowSkew||13)*Math.PI/180),-.23*(r.ShadowScaleY||70)/100,(r.ShadowX||0)*5/6,(r.ShadowY||0)*5/6);c.drawImage(mask,-120,-192,240,240);c.restore();return true;
 }
 drawTower(c,t,time){if(t.boatPart&&globalThis.RoyaleBoatBattle?.draw(c,t,time))return true;if(t.duoKing){const left={...t,duoKing:false,x:t.x-(t.cannonOffset||480/18),heading:t.cannons?.[0]?.heading??t.heading},right={...t,duoKing:false,x:t.x+(t.cannonOffset||480/18),heading:t.cannons?.[1]?.heading??t.heading};const a=this.drawTower(c,left,time),b=this.drawTower(c,right,time);return a&&b;}if(!this.ready)return false;const classic=this.scenes.building_tower;if(!classic)return false;const sourceTeam=t.team===1?1:0,requested=globalThis.RoyaleCosmetics?.skin(t.skin),candidate=requested?.scene&&this.scenes[requested.scene],skin=candidate&&candidate.id(requested.exports?.[t.king?'king':'princessBase']?.[sourceTeam])!==undefined?requested:null,sc=skin?candidate:classic;c.save();const pos=towerArtPosition(t);c.translate(pos.x,pos.y);c.scale(5/6,5/6);c.filter=teamFilter(t.team);
  if(t.hp<=0)classic.draw(c,t.king?'kingtower_destroyed':'princesstower_destroyed',0,{still:true});
  else if(t.king){
   const name=skin?.exports.king[sourceTeam]||`KingTower_${sourceTeam?'red':'blue'}`,pose=kingTowerPose(t,time),frame=sc.clip(name)?.frames?.[pose.frame]||[],names=sc.clip(name)?.frameNames?.[pose.frame]||[],dummy=frame[names.indexOf('king_dummy')]?.[0],king=this.scenes.chr_king;
   const replacements={};if(dummy!==undefined&&king)replacements[dummy]=(ctx,color)=>king.draw(ctx,`King_${sourceTeam?'red':'blue'}`,0,{frame:pose.frame,initialColor:color||undefined});
   // Bind the King at the source king_dummy node: red/blue assemblies have
   // different authored depth ordering relative to the rim and raised barrel.
   sc.draw(c,name,0,{frame:pose.frame,replaceNodes:replacements,instances:{turret:{frame:rotationPose(t.heading,19).frame}}});
  }
  else{sc.draw(c,skin?.exports.princessBase[sourceTeam]||`StarTower_base_${sourceTeam?'red':'blue'}`,0,{still:true});
   c.filter=teamFilter(t.team);const princess=this.scenes.chr_princess;if(princess){const heading=Number.isFinite(t.heading)?t.heading:(t.team?Math.PI/2:-Math.PI/2),d=direction(Math.cos(heading),Math.sin(heading)),prefix=sourceTeam?'princess_tower_red':'princess_tower',elapsed=t.animationTime??Math.max(0,time-(t.visualStarted??-Infinity));let name=`${prefix}_attack1_${d.index}`;const synced=attackClipTime(princess.clip(name),elapsed,t.visualAttack),attacking=t.visualState==='attack'&&!t.visualAttackCancelled&&(synced?!synced.done:elapsed<(t.visualDuration||princess.duration(name)));if(!attacking)name=`${prefix}_idle1_${d.index}`;c.save();c.translate(0,-towerAttachmentOffset(t));c.scale(d.flip?-1:1,1);princess.draw(c,name,attacking?(synced?.time??elapsed*princess.duration(name)/(t.visualDuration||princess.duration(name))):(t.visualTime??time),{loop:!attacking});c.restore();}const top=skin?skin.exports.princessTop?.[sourceTeam]:`StarTower_top_${sourceTeam?'red':'blue'}`;if(top)sc.draw(c,top,0,{still:true});}

  c.restore();return true;
 }
 drawEffect(c,e,time){if(!this.ready)return false;const s=this.scenes.effects;if(!s)return false;const age=Math.max(0,time-e.born),p=Math.min(1,age/e.ttl),at=(name,x,y,scale=1,rotation=0)=>{c.save();c.filter=teamFilter(e.team);c.globalAlpha*=effectOpacity(age,e.ttl);c.translate(x,y);c.rotate(rotation);c.scale(scale,scale);s.draw(c,name,age,{loop:false});c.restore();};
  if(e.kind==='rollingDeploy'){const cfg=this.data.projectiles[e.projectile],scene=cfg&&this.scenes[cfg.scene];if(!scene)return false;const name=e.team===1?cfg.redExport:cfg.export,h=64*(1-p);c.save();c.translate(e.x,e.y-h);c.rotate(e.team===1?Math.PI/2:-Math.PI/2);c.scale(.65,.65);scene.draw(c,name,age,{loop:true});c.restore();return true;}
  if(e.kind==='fireballFly'){at('fireball_projectile1',e.x,e.y-(1-p)*300,.7,Math.PI);return true;}
  if(e.kind==='arrowsFly'){for(let i=0;i<9;i++)at(e.team===1?'projectile_arrow_basic_enemy':'projectile_arrow_basic',e.x+Math.sin(i*3)*47,e.y+Math.cos(i*8)*46-(1-p)*190,.7,Math.PI);return true;}
  if(e.kind==='fireball'||e.kind==='blast'){const r=e.radius||45;for(let i=0;i<7;i++)at('FireParticle1',e.x+Math.cos(i*2.4)*p*r*.7,e.y+Math.sin(i*2.4)*p*r*.6,.22+p*.16);at('explosion_cloud_1',e.x,e.y,.20+p*.22);return true;}
  if(e.kind==='poof'){at('death_ground_elixir1',e.x,e.y,.5);at('Death_blue_smoke',e.x,e.y,.65);return true;}
  if(e.kind==='towerDown'){at('tower_destr_cloud_1',e.x,e.y,.65);return true;}
  if(e.kind==='crownAward'){const name=e.team===1?'crown_appear_touchdown_enemy':'crown_appear_touchdown',duration=s.duration(name)||3.48;if(age<=duration){c.save();c.translate(e.x,e.y);c.scale(.58,.58);s.draw(c,name,age,{loop:false});c.restore();}return true;}
  if(e.kind==='shot'){const name=e.card==='bomber'?'projectile_bomb':e.card==='archers'?(e.team===1?'projectile_arrow_basic_enemy':'projectile_arrow_basic'):e.tower?'Tower_projectile1':'projectile_speed_line';const q=Math.min(1,p*1.3);at(name,e.x+(e.tx-e.x)*q,e.y+(e.ty-e.y)*q,.5,Math.atan2(e.ty-e.y,e.tx-e.x)+Math.PI/2);return true;}
  return false;
 }
 summary(){return{ready:this.ready,error:this.error,arenas:this.data.arenas.length,units:Object.keys(this.data.units).length,textures:this.loadedTextures,residentTextures:this.textureImages.size,residentScenes:Object.keys(this.scenes).length,shapeCache:[...Object.values(this.scenes)].reduce((n,s)=>n+s.cache.size,0),frameSamples:[...Object.values(this.scenes)].reduce((n,s)=>n+s.frameSamples.size,0)}}
}
return{teamFilter,battleEndState,rotationPose,arenaLayers,expandStripeUV,sceneDependencies,frameAt,direction,exportName,resolveAnimation,renderPosition,flightOffset,entityElevation,attackClipTime,towerArtPosition,towerAttachmentOffset,shapeRasterScale,kingTowerPose,effectOpacity,projectilePosition,projectilePose,affine,mul,Scene,Library};});
