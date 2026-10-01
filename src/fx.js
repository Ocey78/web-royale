/* Source-effect graph and bounded deterministic particle presentation.
   All random samples are keyed to visual IDs; rendering never advances battle RNG.
   Emitter coordinates/gravity are a browser interpretation, not native-engine code. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RoyaleFX=api;})(globalThis,function(){'use strict';
const TAU=Math.PI*2,MAX_EMITTER_PARTICLES=96,MAX_FRAME_PARTICLES=850;
const Ground=typeof module==='object'&&module.exports?require('./spell-ground'):globalThis.RoyaleSpellGround,Flight=typeof module==='object'&&module.exports?require('./spell-flight'):globalThis.RoyaleSpellFlight;
const clamp=(n,l,h)=>Math.max(l,Math.min(h,n)),num=(n,d=0)=>Number.isFinite(n)?n:d,seconds=n=>Math.max(0,num(n))/1000;
function hash(v){let n=2166136261;for(const c of String(v))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
function sample(seed,slot){let n=hash(seed+':'+slot);n=Math.imul(n^(n>>>16),2246822507);n=Math.imul(n^(n>>>13),3266489909);return ((n^(n>>>16))>>>0)/4294967296;}
const randomCache=new Map();
function particleRandom(seed,index){const key=seed+':particle:'+index;let values=randomCache.get(key);if(!values){values=Array.from({length:11},(_,k)=>sample(seed,index*23+k));if(randomCache.size>=4096)randomCache.delete(randomCache.keys().next().value);randomCache.set(key,values);}return values;}
function mix(a,b,t){return a+(b-a)*t;}
function particleAt(r,seed,index,age,parent={}){if(!Number.isFinite(age)||age<0)return null;const values=particleRandom(seed,index),random=k=>values[k];
 const parentAngle=Number.isFinite(parent)?parent:num(parent.angle);
 const life=Math.max(.001,mix(seconds(r.ParticleMinLife??r.ParticleMaxLife??800),seconds(r.ParticleMaxLife??r.ParticleMinLife??800),random(0)));
 if(age>=life)return null;const progress=age/life,angle=mix(num(r.ParticleMinAngle),num(r.ParticleMaxAngle,360),random(1))*Math.PI/180;
 const radius=mix(num(r.ParticleMinRadius),num(r.ParticleMaxRadius),random(2)),disc=Math.sqrt(random(3))*num(r.ParticleStartXYAreaRadius),discAngle=random(10)*TAU;
 const speed=mix(num(r.ParticleMinSpeed),num(r.ParticleMaxSpeed),random(4))*(r.InverseSpeed?-1:1),inertia=Math.max(0,num(r.Inertia))/100,travel=inertia>0?speed*(1-Math.exp(-inertia*age))/inertia:speed*age;
 const spin=num(r.AngularSpeed)*Math.PI/180*age,theta=angle+spin+(r.ParticleAngleRelativeToParent?parentAngle:0);let z=num(r.ParticleStartZ)+mix(num(r.ParticleMinVelocityZ),num(r.ParticleMaxVelocityZ),random(5))*age+.5*num(r.ParticleGravity)*age*age;
 // Emitters bounce or settle on the floor rather than projecting below it.
 if(z<0)z=r.NoBounce||r.StopOnBounce?0:Math.min(18,-z*.15)*Math.exp(-age*4);
 const scale=(mix(num(r.StartScale,100),num(r.EndScale,r.StartScale??100),progress)+num(r.RandomScale)*(random(6)-.5))/100;
 const fadeIn=seconds(r.FadeInDuration),fadeOut=seconds(r.FadeOutDuration),alpha=Math.min(fadeIn?age/fadeIn:1,fadeOut?(life-age)/fadeOut:1,1);
 const rotation=(r.ParticleRandomAngle?random(7)*TAU:r.RotateToDirection?theta:0)+mix(num(r.RotateMinSpeed),num(r.RotateMaxSpeed),random(8))*Math.PI/180*age;
 return {x:num(r.ParticleStartX)+Math.cos(theta)*(radius+travel)+Math.cos(discAngle)*disc,y:Math.sin(theta)*(radius+travel)+Math.sin(discAngle)*disc,z,age,life,scale:Math.max(.005,scale),alpha:clamp(alpha,0,1),rotation,variant:random(9),theta,travel};
}
function emitterSamples(r,seed,time,loop=false,parent={},budget=MAX_EMITTER_PARTICLES){budget=Math.max(0,Math.min(MAX_EMITTER_PARTICLES,Math.floor(budget)));if(!budget||time<0||!Number.isFinite(time))return[];const count=Math.min(256,Math.max(1,Math.floor(num(r.ParticleCount,1))));
 const interval=Math.max(0,mix(seconds(r.ParticleMinInterval),seconds(r.ParticleMaxInterval??r.ParticleMinInterval),.5)),emission=Math.max(seconds(r.MinLife),seconds(r.MaxLife),interval*(count-1));
 // Continuous emission has a stable birth interval. Repeating a truncated batch
 // introduced gaps in fire/rocket trails and discarded the later snow particles.
 if(loop){const step=Math.max(.001,interval,emission/count||seconds(r.ParticleMaxLife||800)/count),life=Math.max(.001,seconds(r.ParticleMaxLife??r.ParticleMinLife??800)),last=Math.floor(time/step),first=Math.max(0,last-Math.ceil(life/step)),stride=Math.max(1,Math.ceil((last-first+1)/budget)),out=[];
  for(let i=last;i>=first&&out.length<budget;i-=stride){const born=i*step,p=particleAt(r,seed,i,time-born,parent);if(p)out.push({...p,born});}return out;
 }
 const period=Math.max(.12,emission||seconds(r.ParticleMaxLife||r.ParticleMinLife||800)),cycle=loop?Math.floor(time/period):0,out=[];
 for(let g=Math.max(0,cycle-2);g<=cycle;g++){const local=time-g*period;for(let i=0;i<count;i++){if(out.length>=budget)return out;const start=interval?i*interval:emission>.12?(i/count)*emission:0,age=local-start;if(age<0)continue;const p=particleAt(r,seed+':'+g,i,age,parent);if(p)out.push({...p,born:g*period+start});}}
 return out;
}
function directionalVariant(count,angle){if(!Number.isInteger(count)||count<=1)return 0;const a=((num(angle)%TAU)+TAU)%TAU;return Math.min(count-1,Math.floor(a/TAU*count+.5)%count);}
function effectComponents(data,name,team=0,seen=new Set()){if(!name||seen.has(name)||seen.size>18)return[];seen.add(name);let rows=data.effects[name];if(!rows)return[];
 const alternate=team&&rows.find(r=>r.EnemyVersion)?.EnemyVersion;if(alternate&&data.effects[alternate])return effectComponents(data,alternate,0,seen);
 const inherited={Loop:rows[0]?.Loop===true,FollowParent:rows[0]?.FollowParent===true};const result=[];
 for(const row of rows){const r={...inherited,...row,Layer:row.Layer||'Object'};if(r.Type==='Effect'&&r.Effect){for(const x of effectComponents(data,r.Effect,team,new Set(seen)))result.push({...x,Time:num(x.Time)+num(r.Time)});}else result.push(r);}
 return result;
}
function nameOf(file){return String(file||'').split('/').pop().replace(/\.sc$/,'');}
class Renderer{
 constructor(data,library){this.data=data;this.library=library;this.used=0;this.particlesUsed=0;this.componentCache=new Map();this.areaBounds=new WeakMap();this.spriteCount=0;this.effectCount=0;this.missing=new Set();}
 begin(){this.used=0;this.particlesUsed=0;}
 async prewarmSpells(cardIds,game){if(typeof document==='undefined')return;const names=new Set(),seen=new Set(),walk=value=>{if(Array.isArray(value)){value.forEach(walk);return;}if(value&&typeof value==='object'){Object.values(value).forEach(walk);return;}if(typeof value!=='string'||seen.has(value))return;seen.add(value);if(this.data.effects[value]){names.add(value);walk(this.data.effects[value]);}for(const table of ['projectiles','areas','buffs','entities'])if(game[table]?.[value])walk(game[table][value]);};
  for(const id of new Set(cardIds)){const card=globalThis.RoyaleCore?.CARD_BY_ID[id];if(card?.spell)walk(card.source);}
  const cv=document.createElement('canvas');cv.width=cv.height=256;const ctx=cv.getContext('2d'),sprites=this.spriteCount,effects=this.effectCount;let start=performance.now();
  for(const name of names)for(const team of [0,1])for(const age of [.1,.35,.8,1.25]){ctx.clearRect(0,0,256,256);this.begin();this.effect(ctx,name,128,128,age,team,{phase:'all',spell:true,seed:'prewarm:'+name,life:6});if(performance.now()-start>8){await new Promise(resolve=>setTimeout(resolve,0));start=performance.now();}}
  this.spriteCount=sprites;this.effectCount=effects;this.begin();
 }
 // Decode/rasterize the Fireball's reusable source shapes and RGB tints while
 // the battle loading screen is visible, not on the player's first cast.
 async prewarmFireball(){if(typeof document==='undefined')return;const c=document.createElement('canvas');c.width=256;c.height=256;const ctx=c.getContext('2d'),sprites=this.spriteCount,effects=this.effectCount;let slice=Date.now();
  for(let frame=0;frame<60;frame++){ctx.clearRect?.(0,0,256,256);this.begin();for(const name of ['Fireball_explosion','FireballEmitter'])if(this.data.effects[name])this.effect(ctx,name,128,128,frame/30,0,{phase:'all',seed:'prewarm-fireball',life:3,spell:true});if(Date.now()-slice>=8){await new Promise(resolve=>setTimeout(resolve,0));slice=Date.now();}}
  this.spriteCount=sprites;this.effectCount=effects;this.begin();
 }
 isSpellEffect(name){if(!this.spellEffects){this.spellEffects=new Set();const game=globalThis.RoyaleCore?.DATA,seen=new Set();if(!game)return false;
  const visit=value=>{if(!value)return;if(Array.isArray(value)){for(const v of value)visit(v);return;}if(typeof value==='object'){for(const v of Object.values(value))visit(v);return;}if(typeof value!=='string'||seen.has(value))return;seen.add(value);if(this.data.effects[value]){this.spellEffects.add(value);visit(this.data.effects[value]);}for(const table of ['projectiles','areas'])if(game[table]?.[value])visit(game[table][value]);};
  for(const card of globalThis.RoyaleCore.CARDS||[])if(card.spell)visit(card.source);
 }return this.spellEffects.has(name);}
 components(name,team){const k=name+':'+team;if(!this.componentCache.has(k))this.componentCache.set(k,effectComponents(this.data,name,team));return this.componentCache.get(k);}
 areaExtent(scene,name){let cache=this.areaBounds.get(scene);if(!cache){cache=new Map();this.areaBounds.set(scene,cache);}if(cache.has(name))return cache.get(name);
  // Ignore the empty intro and airborne cast objects; calibrate the established
  // floor pose. Cache once per export instead of traversing its graph every draw.
  const times=name==='earthquake_cracks_timed'?[1.3,1.7,2.3,2.8]:[.25,.4,.6,.8],samples=times.map(t=>scene.bounds(name,t)).filter(b=>b.width>1&&b.height>1&&b.height<b.width*1.8);
  const bounds=samples.length?{width:Math.max(...samples.map(b=>b.width)),height:Math.max(...samples.map(b=>b.height))}:scene.bounds(name,.5);cache.set(name,bounds);return bounds;
 }
 sprite(c,file,name,time,x,y,sx=1,sy=sx,rotation=0,alpha=1,loop=true){if(this.used>=MAX_FRAME_PARTICLES||!name||alpha<=.001)return false;const sc=this.library.scenes[nameOf(file)];if(!sc||sc.id(name)===undefined){this.missing.add(nameOf(file)+'#'+name);return false;}c.save();c.translate(x,y);c.rotate(rotation);c.scale(sx,sy);c.globalAlpha*=clamp(alpha,0,1);sc.draw(c,name,time,{loop});c.restore();this.used++;this.spriteCount++;return true;}
 effect(c,name,x,y,time,team,options={}){const rows=this.components(name,team);if(!rows.length)return false;if(rows.some(r=>r.Type==='ParticleEmitter')&&Flight?.impact(this,c,name,x,y,time,options.phase||'above',options))return true;if(name==='Spell_zap_effect')Ground.zap(c,x,y,time,options.phase||'above',options.impactRadius);if(name==='Spell_rage_effect'){if(time>=.9)return true;options={...options,alpha:(options.alpha??1)*clamp(1-time/.9,0,1)};}const baseScale=num(this.data.coordinateScale,.6),phase=options.phase||'above';let count=0;
 for(let ri=0;ri<rows.length;ri++){const r=rows[ri],ground=['Base','Ground','Shadow'].includes(r.Layer);if(phase!=='all'&&ground!==(phase==='ground'))continue;const age=time-seconds(r.Time);if(age<0)continue;const scale=baseScale*num(r.Scale,100)/100*num(r.RenderableScale,100)/100;
  if(r.Type==='SWF'&&r.FileName&&r.ExportName){const sc=this.library.scenes[nameOf(r.FileName)];if(!sc||sc.id(r.ExportName)===undefined){this.missing.add(nameOf(r.FileName)+'#'+r.ExportName);continue;}let sx=scale,sy=scale;
   if(options.fitArea&&ground&&options.radius){const bounds=this.areaExtent(sc,r.ExportName);sx=options.radius*2*(480/18)/Math.max(1,bounds.width);sy=options.radius*40/Math.max(1,bounds.height);}
   const duration=sc.duration(r.ExportName)||.6,loop=options.loop||r.Loop,life=Math.min(duration,options.life??duration);if(!loop&&age>life)continue;
   const ringAlpha=options.fitArea&&/^spell_.*_radius_(blue|red)$/.test(r.ExportName)?.22:options.area&&ground?Ground.nativeFloorAlpha(options.area.name):1;
   count+=Number(this.sprite(c,r.FileName,r.ExportName,age,x,y-num(options.height),sx,sy,0,(options.alpha??1)*ringAlpha,!!loop));
  }else if(r.Type==='ParticleEmitter'&&r.ParticleEmitterName){const G=globalThis.RoyaleGraphics,mode=G?.current.particles||'good',isSpell=options.spell??this.isSpellEffect(name),budget=G?Math.min(G.particleBudget(mode,isSpell),Math.max(0,G.current.frameParticles-this.particlesUsed)):MAX_EMITTER_PARTICLES;if(!budget)continue;let records=this.data.emitters[r.ParticleEmitterName];if(!records?.length)continue;if(team&&records[0].EnemyVersion)records=this.data.emitters[records[0].EnemyVersion]||records;const head=records[0];
   const parentAngle=options.velocity?Math.atan2(options.velocity.y,options.velocity.x):num(options.angle),emitterPolicy=Ground.policy(r.ParticleEmitterName),policy=options.area&&emitterPolicy;if(emitterPolicy?.replace)continue;
   for(const p of emitterSamples(head,(options.seed??name)+':'+ri,age,options.loop||r.Loop,{angle:parentAngle},Math.min(budget,policy?.maxVisible??budget))){
    if(this.used>=MAX_FRAME_PARTICLES)break;this.particlesUsed++;const variantIndex=head.ResourceFromAngle?directionalVariant(records.length,p.theta):Math.min(records.length-1,Math.floor(p.variant*records.length)),variant=records[variantIndex],d={...head,...variant},alpha=p.alpha*(options.alpha??1)*(r.Layer==='Shadow'?.3:1);
    // Small numeric area-emitter radii use a local coordinate space distinct
    // from the authored SWF floor. Map that space to the actual spell footprint.
    const placed=options.area&&Ground.placement(options.area,r.ParticleEmitterName,p,options.seed,ri,scale);
    let px=x+(placed?.x??p.x*scale),py=y+(placed?.y??p.y*scale*.75)-(placed?.z??p.z*scale)-num(options.height)+num(d.ShadowYShift)*scale;
    if(options.velocity){px-=options.velocity.x*p.age;py-=options.velocity.y*p.age;}
    const aspect=Math.max(.1,num(d.ParticleRadiusAspect,100)/100);let sx=placed?.scale??scale*p.scale,sy=sx*aspect;const placedAlpha=placed?placed.alpha/Math.max(.0001,p.alpha):1;
    if(options.fitArea&&d.ParticleExportName==='earthquake_cracks_timed'){const scene=this.library.scenes[nameOf(d.ParticleResource)],bounds=scene&&this.areaExtent(scene,d.ParticleExportName);if(bounds){sx=options.radius*2*(480/18)/bounds.width;sy=options.radius*40/bounds.height;}}
    if(d.Shadow&&phase!=='above'){const smA=d.ShadowMulA!==undefined?clamp(num(d.ShadowMulA)/255,0,1):.55,smR=clamp(num(d.ShadowMulR),0,255),smG=clamp(num(d.ShadowMulG),0,255),smB=clamp(num(d.ShadowMulB),0,255);c.save();c.globalAlpha*=Math.min(.5,alpha*Math.max(.16,smA));c.fillStyle=`rgba(${smR},${smG},${smB},${Math.max(.35,smA)})`;c.beginPath();c.ellipse(px,py+p.z*scale+num(d.ShadowYShift)*scale,Math.max(1,8*sx),Math.max(1,3.5*sy),0,0,TAU);c.fill();c.restore();}
    const trailLife=seconds(d.TrailDuration||0),tail=mix(num(d.ParticleMinTailLength),num(d.ParticleMaxTailLength),p.variant);
    if(d.TrailSWF&&d.TrailExportName&&trailLife>0){const n=Math.min(mode==='minimal'?1:2,Math.max(1,Math.ceil(trailLife/.12)));for(let q=1;q<=n;q++){const back=(tail/1000)*q/n,tx=px-Math.cos(p.theta)*back*18,ty=py-Math.sin(p.theta)*back*13;count+=Number(this.sprite(c,d.TrailSWF,d.TrailExportName,Math.max(0,p.age-q*.04),tx,ty,sx*.8,sy*.8,p.rotation,alpha*(1-q/(n+1))*.6,true));}}
    else if(tail>0&&alpha>.05){c.save();c.globalAlpha*=alpha*.5;c.strokeStyle='rgba(255,255,255,.7)';c.lineWidth=Math.max(.6,num(d.TrailWidth,90)/100*sx);c.beginPath();c.moveTo(px,py);c.lineTo(px-Math.cos(p.theta)*tail*.025,py-Math.sin(p.theta)*tail*.019);c.stroke();c.restore();}
    const frameTime=d.FrameFromAngle?((p.theta%TAU+TAU)%TAU)/TAU*.999:p.age;
    count+=Number(this.sprite(c,d.ParticleResource,d.ParticleExportName,frameTime,px,py,sx,sy,p.rotation,alpha*placedAlpha*(r.ParticleEmitterName==='Zap_hit_area'?.22:1),d.LoopParticleClip===true&&!d.PlayParticleClipOnce));
   }
  }
 }
 if(count)this.effectCount++;return true;
 }
 tornadoWind(c,a,time,alpha){if(globalThis.RoyaleGraphics?.current.particles==='low')return;const radius=a.radius*(480/18),fade=alpha*Math.min(1,time/.12);c.save();c.translate(a.x,a.y);c.scale(1,.72);c.lineCap='round';
  // The old source export contains only faint, small wisps. A bounded set of
  // moving wind bands gives the short-lived spell its visible floor vortex.
  for(let ring=0;ring<4;ring++)for(let part=0;part<3;part++){const r=radius*(.34+ring*.2),angle=time*(ring%2?-3.8:3.3)+part*TAU/3-ring*.7,w=(15-ring*2.5)*(radius/147);
   c.filter='blur(2.5px)';c.globalAlpha=fade*.10;c.strokeStyle='#a59b89';c.lineWidth=w*1.9;c.beginPath();c.arc(0,0,r,angle,angle+1.35);c.stroke();
   c.filter='blur(1px)';c.globalAlpha=fade*(.11+ring*.015);c.strokeStyle='#d8cbb2';c.lineWidth=w;c.beginPath();c.arc(0,0,r,angle+.08,angle+1.28);c.stroke();
  }c.restore();
 }
 areas(c,b,phase){const now=b.visualTime??b.time;for(const a of b.areas){const r=globalThis.RoyaleCore.DATA.areas[a.name],age=now-a.born,left=Math.max(0,a.ends-now),alpha=Math.min(1,left/.25),tornado=a.name==='Tornado';Ground.draw(c,a,now,phase,this);if(tornado&&phase==='ground')this.tornadoWind(c,a,age,alpha);if(r.ScaledEffect)this.effect(c,r.ScaledEffect,a.x,a.y,age+(tornado?.35:0),a.team,{phase,fitArea:true,radius:a.radius,area:a,life:a.ends-a.born,seed:a.id,alpha,...(tornado?{loop:true}: {})});if(r.LoopingEffect)this.effect(c,r.LoopingEffect,a.x,a.y,age,a.team,{phase,fitArea:true,radius:a.radius,area:a,loop:true,life:a.ends-a.born,seed:a.id,alpha});}}
 events(c,b,phase){const now=b.visualTime??b.time;for(const e of b.effects){if(e.sourceBeam&&phase==='above'){const source=b.getEntity(e.source),target=b.getEntity(e.target);this.targetBeam(c,e.sourceBeam,source||{x:e.x,y:e.y},target||{x:e.tx,y:e.ty},now-e.born,e.team);}else if(e.sourceEffect){const followed=e.follow&&b.getEntity(e.follow),age=now-e.born-(e.delay||0),progress=e.travelDuration?clamp(age/e.travelDuration,0,1):1,x=e.travelDuration?mix(e.startX,e.x,progress):followed?.x??e.x,y=e.travelDuration?mix(e.startY,e.y,progress):followed?.y??e.y;this.effect(c,e.sourceEffect,x,y,age,e.team,{phase,seed:e.fxId??e.id??e.sourceEffect,life:e.ttl-(e.delay||0),impactRadius:e.radius,loop:!!e.loop,height:(e.height||0)+(followed?globalThis.RoyaleNative.entityElevation(followed):0),angle:e.angle??followed?.heading??0,...(e.travelDuration?{velocity:{x:(e.x-e.startX)/e.travelDuration,y:(e.y-e.startY)/e.travelDuration}}:{})});}else if(e.kind==='arrowsFly')this.arrows(c,e,now,phase);}}
 unitStates(c,b,phase){for(const u of b.units){if(!b.isPresent(u)||u.wait>0)continue;const r=u.def.source;if(r.LoadAttackEffectReady&&u.precharge>=u.def.interval-1e-7&&!Object.values(u.buffs).some(v=>v.until>b.time&&(globalThis.RoyaleCore.DATA.buffs[v.name]?.HitSpeedMultiplier||0)<=-100))this.effect(c,r.LoadAttackEffectReady,u.x,u.y,u.visualTime??b.time,u.team,{phase,seed:u.id,loop:true,angle:u.heading||0,height:globalThis.RoyaleNative.entityElevation(u)});}}
 movement(c,b,phase){if(['low','med'].includes(globalThis.RoyaleGraphics?.current.particles))return;const now=b.visualTime??b.time;for(const u of b.units){if(u.wait>0||u.hp<=0||u.visualState!=='run')continue;const name=u.def.source.MoveEffect;if(name)this.effect(c,name,u.x,u.y,u.visualTime??now,u.team,{phase,seed:u.id,loop:true,angle:u.heading||0});}}
 targetBeam(c,name,u,t,time,team){const spec=this.components(name,team).find(r=>r.Type==='SWF'&&r.ExportName),sc=spec&&this.library.scenes[nameOf(spec.FileName)];if(!sc||sc.id(spec.ExportName)===undefined)return false;
  const y=u.y-globalThis.RoyaleNative.entityElevation(u)-(u.building?40:22),ty=t.y-globalThis.RoyaleNative.entityElevation(t)-(t.king!==undefined?45:t.building?30:18),dx=t.x-u.x,dy=ty-y,len=Math.hypot(dx,dy),bounds=sc.bounds(spec.ExportName),vertical=bounds.height>bounds.width;
  c.save();c.translate((u.x+t.x)/2,(y+ty)/2);c.rotate(Math.atan2(dy,dx)-(vertical?Math.PI/2:0));c.scale(vertical?.4:len/Math.max(1,bounds.width),vertical?len/Math.max(1,bounds.height):.4);c.translate(-bounds.x-bounds.width/2,-bounds.y-bounds.height/2);sc.draw(c,spec.ExportName,time,{loop:true});c.restore();this.spriteCount++;return true;}

 arrows(c,e,time,phase='above'){const age=time-e.born,duration=e.flightDuration||1,p=clamp(age/duration,0,1),count=e.count||10,radius=e.radius||80;
  const sx=e.startX??9*(480/18),sy=e.startY??(e.team?3:29)*20;
  for(let i=0;i<count;i++){const seed=String(e.fxId||e.born)+':'+(e.wave||0),a=sample(seed,i)*TAU,r=Math.sqrt(sample(seed,i+20))*radius,tx=e.x+Math.cos(a)*r,ty=e.y+Math.sin(a)*r*.75;
   if(age<duration&&phase==='above'){const x=sx+(tx-sx)*p,y=sy+(ty-sy)*p-52*(1-p)-160*p*(1-p),vx=tx-sx,vy=ty-sy+52-160*(1-2*p);// The base arrows_trail CSV row has no drawable resource in this snapshot.
    // Use short afterimages of the original arrow, not a nonexistent prestige asset.
    const tails=({low:0,med:2,good:1,high:4,max:8,ultra:8}[globalThis.RoyaleGraphics?.current.particles]??1);for(let j=tails;j>=1;j--){const past=age-j*.024;if(past<0)continue;const q=clamp(past/duration,0,1),px=sx+(tx-sx)*q,py=sy+(ty-sy)*q-52*(1-q)-160*q*(1-q),pv=ty-sy+52-160*(1-2*q);this.sprite(c,'sc/effects.sc',e.team?'projectile_arrow_basic_enemy':'projectile_arrow_basic',0,px,py,.6,.6,Math.atan2(pv,vx),.35*(1-j/(tails+1)),false);}
    this.sprite(c,'sc/effects.sc',e.team?'projectile_arrow_basic_enemy':'projectile_arrow_basic',0,x,y,.6,.6,Math.atan2(vy,vx),1,false);}
   else if(age>=duration&&age<duration+1.9&&phase==='ground')this.effect(c,'ArrowHitGround',tx,ty,age-duration,e.team,{phase:'all',seed:seed+':'+i,life:1.9});
  }
 }
 trails(c,b){const now=b.visualTime??b.time;for(const p of b.projectiles){const r=globalThis.RoyaleCore.DATA.projectiles[p.name];if(!r.TrailEffect)continue;if(Flight.trail(this,c,p,now))continue;const target=b.getEntity(p.target),pos=globalThis.RoyaleNative.projectilePosition(p,target);let velocity={x:p.vx*p.speed*(480/18),y:p.vy*p.speed*20};if(p.lastStepDt>0&&Number.isFinite(p.previousX)){const previous=globalThis.RoyaleNative.projectilePosition({...p,x:p.previousX,y:p.previousY,travel:p.previousTravel},target);velocity={x:(pos.x-previous.x)/p.lastStepDt,y:(pos.y-previous.y)/p.lastStepDt};}this.effect(c,r.TrailEffect,pos.x,pos.y,now-p.born,p.team,{phase:'all',loop:true,seed:p.id,velocity,alpha:1,angle:Math.atan2(velocity.y,velocity.x)});}}
 beam(c,u,target,time){const r=u.def.source,stage=u.lockTime>=4?3:u.lockTime>=2?2:1,name=r['TargettedDamageEffect'+stage];const spec=this.components(name,u.team).find(r=>r.Type==='SWF'&&r.ExportName),sc=spec&&this.library.scenes[nameOf(spec.FileName)];if(!sc||sc.id(spec.ExportName)===undefined)return false;
  const y=u.y-globalThis.RoyaleNative.entityElevation(u)-(u.building?45:22),ty=target.y-globalThis.RoyaleNative.entityElevation(target)-(target.king!==undefined?50:target.building?32:20),dx=target.x-u.x,dy=ty-y,len=Math.hypot(dx,dy),b=sc.bounds(spec.ExportName),vertical=b.height>b.width;
  c.save();c.translate((u.x+target.x)/2,(y+ty)/2);c.rotate(Math.atan2(dy,dx)-(vertical?Math.PI/2:0));c.scale(vertical?.5:len/Math.max(1,b.width),vertical?len/Math.max(1,b.height):.5);c.translate(-b.x-b.width/2,-b.y-b.height/2);sc.draw(c,spec.ExportName,time,{loop:true});c.restore();
  const muzzle=r['FlameEffect'+stage];if(muzzle)this.effect(c,muzzle,u.x,y,time,u.team,{phase:'all',seed:u.id,loop:true});return true;
 }
 summary(){return{sprites:this.spriteCount,effects:this.effectCount,missing:[...this.missing],maxFrameParticles:MAX_FRAME_PARTICLES,particlesThisFrame:this.particlesUsed,particleBudget:globalThis.RoyaleGraphics?.current.frameParticles??MAX_FRAME_PARTICLES,randomCacheEntries:randomCache.size};}
}
return{particleAt,emitterSamples,directionalVariant,effectComponents,Renderer,MAX_EMITTER_PARTICLES,MAX_FRAME_PARTICLES};});
