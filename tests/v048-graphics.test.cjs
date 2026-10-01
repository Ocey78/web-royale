'use strict';
const test=require('node:test'),A=require('node:assert/strict'),fs=require('node:fs');
const G=require('../src/graphics.js'),C=require('../src/core.js'),N=require('../src/native.js');

const SAFARI_MAC='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const SAFARI_IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const CHROME='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36';
const CRIOS='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/136.0 Mobile/15E148 Safari/604.1';

function tiers(key){return G.OPTIONS[key];}

test('graphics categories retain old tiers and include Ultra',()=>{
 for(const key of ['textures','animations','particles','arenaBackgrounds'])
  A.deepEqual(tiers(key),['low','med','good','high','max','ultra'],key);
});

test('Good retains original detail and higher tiers avoid wasteful spatial supersampling',()=>{
 A.equal(G.policy({textures:'low'}).textureScale,.5);
 A.equal(G.policy({textures:'med'}).textureScale,.75);
 A.equal(G.policy({textures:'good'}).textureScale,1);
 A.equal(G.policy({textures:'high'}).textureScale,1.5);
 A.equal(G.policy({textures:'max'}).textureScale,2);
 A.equal(G.policy({arenaBackgrounds:'good'}).arenaScale,2);
 A.equal(G.policy({arenaBackgrounds:'high'}).arenaScale,2.25);
 A.equal(G.policy({arenaBackgrounds:'max'}).arenaScale,2.5);
 A.equal(N.shapeRasterScale(100,100,4),3);
 A.equal(N.shapeRasterScale(100,100,8),3);
});

test('v048 animation and particle tiers preserve old behavior and add higher ceilings',()=>{
 A.deepEqual(['low','med','good','high','max'].map(x=>G.policy({animations:x}).animationFps),[12,24,60,90,120]);
 A.equal(G.particleBudget('low',true),0);
 A.equal(G.particleBudget('med',false),0);
 A.ok(G.particleBudget('med',true)>0);
 A.equal(G.particleBudget('good',false),10);
 A.equal(G.particleBudget('high',false),48);
 A.equal(G.particleBudget('max',false),64);
});

test('v048 v13 saves migrate old graphics names without changing effective quality',()=>{
 const p=C.normalizeProfile({version:13,graphics:{textures:'high',animations:'high',particles:'minimal',arenaBackgrounds:'high'}});
 A.equal(p.version,14);
 A.deepEqual(p.graphics,{textures:'good',animations:'good',particles:'good',arenaBackgrounds:'good'});
 const full=C.normalizeProfile({version:13,graphics:{textures:'low',animations:'med',particles:'full',arenaBackgrounds:'med'}});
 A.deepEqual(full.graphics,{textures:'low',animations:'med',particles:'high',arenaBackgrounds:'med'});
});

test('v048 Safari is detected precisely and receives all-medium first-launch defaults',()=>{
 A.equal(G.isSafari(SAFARI_MAC),true);
 A.equal(G.isSafari(SAFARI_IOS),true);
 A.equal(G.isSafari(CHROME),false);
 A.equal(G.isSafari(CRIOS),false);
 A.deepEqual(G.firstLaunchDefaults(SAFARI_MAC),{textures:'med',animations:'med',particles:'med',arenaBackgrounds:'med'});
 A.deepEqual(G.firstLaunchDefaults(CHROME),G.DEFAULTS);
});

test('v048 settings UI names Good and exposes High/Max tiers',()=>{
 const app=fs.readFileSync(require.resolve('../src/app.js'),'utf8');
 A.match(app,/Good/);
 A.match(app,/high:'High'/);
 A.match(app,/max:'Max'/);
 A.match(app,/ultra:'Ultra'/);
 A.match(app,/firstLaunchDefaults\(navigator\.userAgent/);
});
