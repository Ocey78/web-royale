/* Local presentation policy. Never alters combat ticks, stats or random state. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RoyaleGraphics=api;})(globalThis,function(){'use strict';
const DEFAULTS=Object.freeze({textures:'high',animations:'high',particles:'minimal',arenaBackgrounds:'high'});
const OPTIONS=Object.freeze({textures:['low','med','high'],animations:['low','med','high'],particles:['off','spells-only','minimal','full'],arenaBackgrounds:['low','med','high']});
function normalize(raw){return {...Object.fromEntries(Object.entries(OPTIONS).map(([key,values])=>[key,values.includes(raw?.[key])?raw[key]:DEFAULTS[key]])),...(raw?.potato===true?{potato:true}: {})};}
function policy(raw){const g=normalize(raw);return {...g,renderMode:'native',textureScale:{low:.5,med:.75,high:1}[g.textures],animationFps:{low:12,med:24,high:60}[g.animations],arenaScale:{low:.75,med:1.25,high:2}[g.arenaBackgrounds],arenaAnimated:g.arenaBackgrounds!=='low',arenaFps:g.arenaBackgrounds==='med'?12:60,frameParticles:g.particles==='full'?850:g.particles==='off'?0:g.particles==='spells-only'?220:120,emitterParticles:g.particles==='full'?48:g.particles==='off'?0:g.particles==='spells-only'?24:10,...(g.potato?{renderMode:'primitive',textureScale:.2,animationFps:60,arenaScale:.5,arenaAnimated:false,arenaFps:0,frameParticles:0,emitterParticles:0}: {})};}
function particleBudget(mode,spell=false){return mode==='full'?48:mode==='off'||mode==='spells-only'&&!spell?0:mode==='spells-only'?24:10;}
let current=policy(DEFAULTS),revision=0;
function apply(raw){const next=policy(raw);if(JSON.stringify(next)!==JSON.stringify(current)){current=next;revision++;}return current;}
function animationTime(seconds){return Math.floor(Math.max(0,Number(seconds)||0)*current.animationFps+1e-7)/current.animationFps;}
return {DEFAULTS,OPTIONS,normalize,policy,particleBudget,apply,animationTime,get current(){return current;},get revision(){return revision;}};
});
