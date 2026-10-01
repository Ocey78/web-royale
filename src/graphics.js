/* Local presentation policy. Never alters combat ticks, stats or random state. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RoyaleGraphics=api;})(globalThis,function(){'use strict';
const TIERS=Object.freeze(['low','med','good','high','max','ultra']);
const DEFAULTS=Object.freeze({textures:'good',animations:'good',particles:'good',arenaBackgrounds:'good'});
const SAFARI_DEFAULTS=Object.freeze({textures:'med',animations:'med',particles:'med',arenaBackgrounds:'med'});
const OPTIONS=Object.freeze({textures:TIERS,animations:TIERS,particles:TIERS,arenaBackgrounds:TIERS});
const LEGACY_PARTICLES=Object.freeze({off:'low','spells-only':'med',minimal:'good',full:'high'});
function migrateLegacy(raw){const g=raw&&typeof raw==='object'?raw:{};return {textures:g.textures==='high'?'good':g.textures,animations:g.animations==='high'?'good':g.animations,particles:LEGACY_PARTICLES[g.particles]||g.particles,arenaBackgrounds:g.arenaBackgrounds==='high'?'good':g.arenaBackgrounds,...(g.potato===true?{potato:true}:{})};}
function normalize(raw){const source=raw&&typeof raw==='object'?{...raw}:{};if(LEGACY_PARTICLES[source.particles])source.particles=LEGACY_PARTICLES[source.particles];return {...Object.fromEntries(Object.entries(OPTIONS).map(([key,values])=>[key,values.includes(source?.[key])?source[key]:DEFAULTS[key]])),...(source?.potato===true?{potato:true}: {})};}
function isSafari(userAgent=''){const ua=String(userAgent);return /Safari\//.test(ua)&&!/Chrome\/|Chromium\/|CriOS\/|FxiOS\/|EdgiOS\/|OPiOS\/|SamsungBrowser\/|Android\b/.test(ua);}
function firstLaunchDefaults(userAgent=''){return {...(isSafari(userAgent)?SAFARI_DEFAULTS:DEFAULTS)};}
function policy(raw){const g=normalize(raw),textureScale={low:.5,med:.75,good:1,high:1.5,max:2,ultra:2.5}[g.textures],animationFps={low:12,med:24,good:60,high:90,max:120,ultra:120}[g.animations],arenaScale={low:.75,med:1.25,good:2,high:2.25,max:2.5,ultra:3}[g.arenaBackgrounds];return {...g,renderMode:'native',textureScale,animationFps,arenaScale,superResolutionScale:Math.max(1,textureScale),battleDensity:{low:1,med:1.5,good:2,high:2.25,max:2.5,ultra:3}[g.textures],postProcessing:g.textures==='ultra',arenaAnimated:g.arenaBackgrounds!=='low',arenaFps:g.arenaBackgrounds==='low'?0:g.arenaBackgrounds==='med'?12:60,frameParticles:{low:0,med:220,good:120,high:360,max:512,ultra:640}[g.particles],emitterParticles:{low:0,med:24,good:10,high:48,max:64,ultra:80}[g.particles],...(g.potato?{renderMode:'primitive',textureScale:.2,animationFps:60,arenaScale:.5,battleDensity:.75,postProcessing:false,superResolutionScale:1,arenaAnimated:false,arenaFps:0,frameParticles:0,emitterParticles:0}: {})};}
function particleBudget(mode,spell=false){mode=LEGACY_PARTICLES[mode]||mode;return mode==='ultra'?80:mode==='max'?64:mode==='high'?48:mode==='low'||mode==='med'&&!spell?0:mode==='med'?24:10;}
let current=policy(DEFAULTS),revision=0;
function apply(raw){const next=policy(raw);if(JSON.stringify(next)!==JSON.stringify(current)){current=next;revision++;}return current;}
function animationTime(seconds){return Math.floor(Math.max(0,Number(seconds)||0)*current.animationFps+1e-7)/current.animationFps;}
return {TIERS,DEFAULTS,SAFARI_DEFAULTS,OPTIONS,migrateLegacy,normalize,isSafari,firstLaunchDefaults,policy,particleBudget,apply,animationTime,get current(){return current;},get revision(){return revision;}};
});
