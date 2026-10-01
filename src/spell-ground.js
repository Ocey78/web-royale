/* Ground presentation calibrated against the supplied original spell recording.
   This adds the persistent, translucent floor body below the native edge art.
   Particle births use a separate visual hash; battle RNG is never consulted. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RoyaleSpellGround=api;})(globalThis,function(){'use strict';
const SX=480/18,SY=20,TAU=Math.PI*2,SIZE=256,cache=new Map();
const profiles=Object.freeze({
 Rage:Object.freeze({rgb:[255,81,199],alpha:.36,edge:[195,67,245],edgeAlpha:.34,nativeAlpha:.48}),
 BarbarianRage:Object.freeze({rgb:[255,81,199],alpha:.36,edge:[195,67,245],edgeAlpha:.34,nativeAlpha:.48}),
 Poison:Object.freeze({rgb:[220,158,79],alpha:.17,edge:[185,123,58],edgeAlpha:.08,nativeAlpha:.15}),
 Graveyard:Object.freeze({rgb:[186,111,242],alpha:.31,edge:[170,78,241],edgeAlpha:.22,nativeAlpha:.34}),
 Graveyard2:Object.freeze({rgb:[186,111,242],alpha:.31,edge:[170,78,241],edgeAlpha:.22,nativeAlpha:.34}),
 Freeze:Object.freeze({rgb:[191,230,247],alpha:.25,edge:[222,253,255],edgeAlpha:.21,nativeAlpha:.56})
});
// Sprite motion stays in source pixels. Only the birth point maps to the field.
// Poison's old densely stacked skull emitters are replaced by three small native
// skull clips in decorations(), rather than scaled into a bright central orb.
const policies=Object.freeze(Object.fromEntries(Object.entries({
 Poison_skull1:{replace:true,maxVisible:0},Poison_big_skull:{replace:true,maxVisible:0},
 Spell_rage_sparkle1_loop:{birthRadius:.74,drift:.12,maxVisible:18,alpha:.66,spriteScale:.72},
 graveyard_embers:{birthRadius:.80,drift:.12,maxVisible:24,alpha:.65,spriteScale:.8},
 graveyard_smoke_mist:{birthRadius:.68,drift:.13,maxVisible:8,alpha:.22,spriteScale:.65},
 graveyard_dark_partivles:{birthRadius:.74,drift:.15,maxVisible:24,alpha:.45,spriteScale:.7},
 graveyard_drak_particle_boil:{birthRadius:.74,drift:.12,maxVisible:26,alpha:.40,spriteScale:.7},
 graveyard_dark_particle_bol_big:{birthRadius:.74,drift:.12,maxVisible:20,alpha:.28,spriteScale:.65},
 freeze_snowPiles1:{birthRadius:.78,drift:.13,maxVisible:14,alpha:.8,spriteScale:.65},
 freeze_snow_scatter1:{birthRadius:.78,drift:.13,maxVisible:22,alpha:.8,spriteScale:.65}
}).map(([k,v])=>[k,Object.freeze(v)])));
function hash(value){let h=2166136261;for(const c of String(value))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
function random(seed,slot){let h=hash(seed+':'+slot);h=Math.imul(h^(h>>>16),2246822507);h=Math.imul(h^(h>>>13),3266489909);return((h^(h>>>16))>>>0)/4294967296;}
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function state(a,time){const style=profiles[a?.name],age=time-a?.born,left=a?.ends-time;if(!style||!Number.isFinite(age)||!Number.isFinite(left)||age<0||left<=0||!Number.isFinite(a.radius)||a.radius<=0)return null;
 return{age,left,rx:a.radius*SX,ry:a.radius*SY,opacity:Math.min(1,age/.18,left/.28),style};
}
function policy(name){return policies[name]||null;}
function nativeFloorAlpha(name){return profiles[name]?.nativeAlpha??1;}
function placement(a,name,p,seed,index=0,scale=.6){const rule=policy(name);if(!rule)return null;if(rule.replace)return{hidden:true};if(!a||!Number.isFinite(a.radius)||a.radius<=0)return null;
 const radius=a.radius*SX,birth=Number.isFinite(p.born)?p.born.toFixed(9):index,key=(a.id??a.born)+':'+seed+':'+name+':'+birth;
 const angle=random(key,0)*TAU,r=Math.sqrt(random(key,1))*radius*rule.birthRadius;
 // Saturate local drift smoothly instead of clipping all particles to one rim.
 const travel=Number.isFinite(p.travel)?p.travel*scale:0,drift=radius*rule.drift*Math.tanh(travel/Math.max(1,radius*rule.drift)),theta=Number.isFinite(p.theta)?p.theta:angle;
 return{x:Math.cos(angle)*r+Math.cos(theta)*drift,y:(Math.sin(angle)*r+Math.sin(theta)*drift)*.75,z:(p.z||0)*scale,alpha:(p.alpha??1)*rule.alpha,scale:(p.scale??1)*scale*rule.spriteScale,hidden:false};
}
function fieldTexture(name){if(cache.has(name))return cache.get(name);if(typeof document==='undefined')return null;const style=profiles[name];if(!style)return null;
 const cv=document.createElement('canvas');cv.width=cv.height=SIZE;const c=cv.getContext('2d'),rgb=style.rgb.join(','),center=SIZE/2;
 const g=c.createRadialGradient(center,center,0,center,center,center);g.addColorStop(0,`rgba(${rgb},${style.alpha})`);g.addColorStop(.78,`rgba(${rgb},${style.alpha})`);g.addColorStop(.94,`rgba(${rgb},${style.alpha*.8})`);g.addColorStop(1,`rgba(${rgb},0)`);
 c.fillStyle=g;c.fillRect(0,0,SIZE,SIZE);
 // Tiny deterministic variations keep the translucent floor from looking like
 // a solid UI disc. They remain bounded inside the exact gameplay footprint.
 for(let i=0;i<70;i++){const angle=random(name,i*3)*TAU,r=Math.sqrt(random(name,i*3+1))*center*.91,rr=1+random(name,i*3+2)*2;c.fillStyle=`rgba(${rgb},${style.alpha*.16})`;c.beginPath();c.arc(center+Math.cos(angle)*r,center+Math.sin(angle)*r,rr,0,TAU);c.fill();}
 // A fixed small cache: at most six 256-square canvases, independent of casts.
 cache.set(name,cv);return cv;
}
function decorations(a,s){if(!s)return[];const out=[],key=(a.id??a.born)+':'+a.name;
 if(a.name==='Poison')for(let i=0;i<3;i++){const angle=random(key,i*3)*TAU,r=Math.sqrt(random(key,i*3+1))*.68,phase=(s.age+i*.63)%2.7,fade=Math.sin(clamp(phase/2.7,0,1)*Math.PI);out.push({name:'poison_skull',time:phase,x:Math.cos(angle)*s.rx*r+Math.sin(s.age*.7+i)*3,y:Math.sin(angle)*s.ry*r-phase*3,scale:.24+random(key,i*3+2)*.05,alpha:s.opacity*fade*.26});}
 return out;
}
function draw(c,a,time,phase='ground',renderer){if(phase!=='ground')return false;const s=state(a,time);if(!s||s.opacity<=0)return false;const texture=fieldTexture(a.name),parentAlpha=c.globalAlpha;c.save();c.translate(a.x,a.y);c.globalAlpha*=s.opacity;
 if(texture)c.drawImage(texture,-s.rx,-s.ry,s.rx*2,s.ry*2);else{c.fillStyle=`rgba(${s.style.rgb.join(',')},${s.style.alpha})`;c.beginPath();c.ellipse(0,0,s.rx,s.ry,0,0,TAU);c.fill();}
 // Gentle floor wisps are deliberately broad and transparent. Keep them flat;
 // they should never rise into a yellow/purple sphere over the affected units.
 const key=(a.id??a.born)+':'+a.name,count=a.name==='Freeze'?12:7;
 for(let i=0;i<count;i++){const angle=random(key,i*4)*TAU,r=Math.sqrt(random(key,i*4+1))*.77,drift=Math.sin(s.age*.65+i)*.025,x=Math.cos(angle)*s.rx*r+drift*s.rx,y=Math.sin(angle)*s.ry*r;
  c.globalAlpha=parentAlpha*s.opacity*(a.name==='Freeze'?.12:.07);c.fillStyle=a.name==='Freeze'?'#eafaff':a.name==='Graveyard'?'#ca9dff':a.name==='Poison'?'#b38c5f':'#ffd4f4';c.beginPath();c.ellipse(x,y,s.rx*(a.name==='Freeze'?.018:.14),s.ry*(a.name==='Freeze'?.025:.065),Math.sin(s.age*.3+i)*.2,0,TAU);c.fill();
 }
 c.globalAlpha=parentAlpha*s.opacity;c.strokeStyle=`rgba(${s.style.edge.join(',')},${s.style.edgeAlpha})`;c.lineWidth=Math.min(2,Math.max(1,s.rx*.013));c.beginPath();c.ellipse(0,0,s.rx*.96,s.ry*.96,0,0,TAU);c.stroke();c.restore();
 if(renderer?.sprite)for(const d of decorations(a,s))renderer.sprite(c,'sc/effects.sc',d.name,d.time,a.x+d.x,a.y+d.y,d.scale,d.scale,0,d.alpha,false);
 return true;
}
function summary(){return{cachedFields:cache.size,cachePixels:cache.size*SIZE*SIZE};}
function zap(c,x,y,age,phase='ground',radius=50){if(phase!=='ground'&&phase!=='all'||age<0||age>1.2)return false;const r=clamp(radius||50,32,70);c.save();c.translate(x,y);c.scale(1,.75);
 if(age<.28){const alpha=Math.sin(clamp((age-.035)/.245,0,1)*Math.PI)*.52,g=c.createRadialGradient(0,0,0,0,0,r*1.2);g.addColorStop(0,`rgba(180,228,255,${alpha})`);g.addColorStop(.5,`rgba(97,173,252,${alpha*.7})`);g.addColorStop(1,'rgba(85,141,223,0)');c.fillStyle=g;c.beginPath();c.arc(0,0,r*1.2,0,TAU);c.fill();}
 if(age>.18){const alpha=Math.min(1,(age-.18)/.1)*clamp((1.2-age)/.55,0,1),rr=r*(.58+Math.min(.3,age*.24)),g=c.createRadialGradient(0,0,0,0,0,rr);g.addColorStop(0,`rgba(37,44,52,${alpha*.30})`);g.addColorStop(.45,`rgba(94,105,118,${alpha*.18})`);g.addColorStop(1,'rgba(118,135,159,0)');c.fillStyle=g;c.beginPath();c.arc(0,0,rr,0,TAU);c.fill();}c.restore();return true;
}
return{state,policy,placement,decorations,nativeFloorAlpha,draw,zap,summary};
});
