'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),zlib=require('node:zlib'),N=require('../src/native'),C=require('../src/catalog');
const data=JSON.parse(zlib.gunzipSync(fs.readFileSync(require.resolve('../assets/native/source-data.json.gz'))));
function context(){const calls=[],c={calls,globalAlpha:1,canvas:{width:540,height:960},createLinearGradient:()=>({addColorStop(){}})};return new Proxy(c,{get:(o,k)=>k in o?o[k]:(...a)=>calls.push([k,...a]),set:(o,k,v)=>(calls.push(['set',k,v]),o[k]=v,true)});}
function library(){const lib=new N.Library(data,{});for(const name of ['chr_bowler','chr_royal_chef'])lib.scenes[name]=new N.Scene(data.scenes[name],[]);return lib;}
function unit(entity,extra={}){return{entity,def:C.entityDef(entity,11),animationTime:0,walk:0,...extra};}
function drawScope(){const scope={RoyaleCore:{SX:30,SY:26.6666666667,CARD_BY_ID:{}},RoyaleBattleView:{layout:{height:700},viewport:{x:0,y:0,width:540,height:700},camera:{x:0,y:0,scale:1}}};vm.runInNewContext(fs.readFileSync(require.resolve('../src/draw'),'utf8'),scope);return scope;}

test('Kitchen death Chef composes original matching upper and lower layers for both teams and every facing',()=>{
 const lib=library(),u=unit('UltimateChef');
 for(const team of [0,1])for(const state of ['idle','run','attack'])for(let d=0;d<=8;d++){
  const p=lib.nativeUnitPose(u.entity,team,.2,state,-Math.PI/2+d*Math.PI/8,0,1,{entity:u,elapsed:.2});
  assert.equal(p.cfg.scene,'chr_royal_chef');assert.match(p.name,/Royal_Chef_bot/);
  assert.equal(p.top,p.name.replace('_bot','_top'),'upper layer must follow the lower layer animation and team');
  assert.notEqual(p.sc.id(p.top),undefined);assert.equal(p.sc.clip(p.top).frames.length,p.sc.clip(p.name).frames.length);
 }
 const c=context(),p=lib.nativeUnitPose(u.entity,0,0,'idle',0,0,1,{entity:u});lib.drawUltimateAccessories(c,u.entity,u,p,0,'idle',0,0);
 assert.equal(c.calls.filter(r=>['ellipse','fillRect','lineTo'].includes(r[0])).length,0,'native Chef must not receive fake hat/apron/pan art');
});

test('ground Chef walking has travel-linked movement without replacing native attack playback',()=>{
 const lib=library(),u=unit('UltimateChef'),at=walk=>lib.nativeUnitPose(u.entity,0,1,'run',0,0,1,{entity:{...u,walk},elapsed:1});
 const a=at(0),b=at(.2);assert.ok(a.motion&&b.motion);assert.notDeepEqual(a.motion,b.motion,'moving Chef must visibly step');
 assert.deepEqual(at(.2).motion,b.motion,'same traveled distance produces the same pose');
 const attack=lib.nativeUnitPose(u.entity,0,1,'attack',0,0,1,{entity:{...u,visualAttack:{windup:.4,releasedAt:null}},elapsed:.2});
 assert.match(attack.name,/_attack1_5$/);assert.ok(attack.seconds>0&&attack.seconds<11/30);assert.equal(attack.motion,null);
});

test('Chef waits for both native layers before painting a partially loaded model',()=>{
 const lib=library(),sc=lib.scenes.chr_royal_chef,u=unit('UltimateChef');let painted=0;
 // Model the streaming boundary: lower texture ready, upper page still loading.
 sc.frameReady=name=>!name.includes('_top');sc.draw=()=>{painted++;return true;};
 assert.equal(lib.unit(context(),u.entity,100,200,0,.2,'idle',0,0,1,{entity:u}),false);
 assert.equal(painted,0);
});

test('two and three Builders draw distinct original worker animations and disappear with the building',()=>{
 const D=drawScope().RoyaleDraw,draws=[],builder=JSON.parse(fs.readFileSync(require.resolve('../assets/ultimate-clash/builder.json'))),scene={draw:(c,name,time,options)=>{assert.ok(builder.exports[name]!==undefined,name);draws.push({name,time,options});}},u={x:100,y:200,hp:1,team:0,ultimate:{builders:3}},c=context();
 D.drawBuilders(c,u,.5,{ultimateBuilder:scene});assert.equal(draws.length,3);assert.equal(new Set(c.calls.filter(r=>r[0]==='translate').map(r=>r.slice(1).join(','))).size,3);
 assert.equal(new Set(draws.map(r=>r.time)).size,3);draws.length=0;const pair=context();D.drawBuilders(pair,{...u,ultimate:{builders:2}},.5,{ultimateBuilder:scene});assert.equal(draws.length,2);assert.deepEqual(pair.calls.filter(r=>r[0]==='translate').map(r=>r.slice(1)),[[119,205],[81,205]]);
 draws.length=0;D.drawBuilders(context(),{...u,hp:0},.5,{ultimateBuilder:scene});assert.equal(draws.length,0);
});

test('giant Bowler uses a stable carrying pose and source-frame hand anchors through windup and recovery',()=>{
 const lib=library(),u=unit('UltimateBowlerGiant',{ultimate:{kind:'bowler-giant'}}),pose=(t,state='idle',entity=u,elapsed=t)=>lib.nativeUnitPose(u.entity,0,t,state,0,0,1,{entity,elapsed});
 assert.equal(pose(0).pose.frame,pose(8).pose.frame,'idle must not wander through throwing poses');
 const hold=pose(0);assert.equal(hold.pose.hands.length,2);assert.notDeepEqual(hold.pose.hands[0],hold.pose.hands[1]);
 const frames=[];for(const elapsed of [0,.2,.5,.8,1]){const p=pose(elapsed,'attack',{...u,animationTime:elapsed,visualAttack:{windup:1,releasedAt:null}});frames.push(p.pose.frame);assert.ok(p.pose.frame>=17&&p.pose.frame<33,'no frame with a baked central stone');assert.equal(p.pose.hands.length,2);}
 assert.equal(frames[0],hold.pose.frame);assert.ok(frames.at(-1)<frames[0]);
 for(const d of [0,1,2,3,4,5,6,7,8])for(const t of [0,.1,.2,.3,.4,.5]){const p=lib.nativeUnitPose(u.entity,1,1+t,'attack',-Math.PI/2+d*Math.PI/8,0,1,{entity:{...u,animationTime:1+t,visualAttack:{windup:1,releasedAt:1},ultimate:{kind:'bowler-giant',throwAt:1}},elapsed:1+t});assert.ok(p.pose.frame>=17&&p.pose.frame<33);assert.equal(p.pose.hands.length,2);}
});

test('giant held stones scale with the actor and both hands clear at release',()=>{
 const lib=library(),draws=[],projectile=data.projectiles.BowlerProjectile,sc={id:()=>1,draw:(c,name,t,options)=>draws.push({name,t,options})};lib.scenes[projectile.scene]=sc;
 const u=unit('UltimateBowlerGiant',{ultimate:{kind:'bowler-giant'}}),p=lib.nativeUnitPose(u.entity,0,.5,'idle',0,0,1,{entity:u}),c=context();lib.drawUltimateAccessories(c,u.entity,u,p,.5,'idle',0,0);assert.equal(draws.length,2);
 const heldScale=c.calls.find(r=>r[0]==='scale')[1],big=lib.nativeUnitPose(u.entity,0,.5,'idle',0,0,2,{entity:u}),c2=context();lib.drawUltimateAccessories(c2,u.entity,u,big,.5,'idle',0,0);assert.equal(c2.calls.find(r=>r[0]==='scale')[1],heldScale,'hand art must retain its relative size when drawing a scaled actor');
 draws.length=0;lib.drawUltimateAccessories(context(),u.entity,{...u,ultimate:{kind:'bowler-giant',throwAt:.5}},p,.5,'attack',0,0);assert.equal(draws.length,0);
});

test('Kitchen death Chef and all Bandit Squad members are included in native asset closure',()=>{
 const native=structuredClone(data);require('../tools/native-policy.cjs').apply(C.DATA,native);
 assert.equal(native.units.UltimateChef.scene,'chr_royal_chef');
 const kitchen=N.sceneDependencies(native,C.DATA,[['ultimate-battle-kitchen','ultimate-mirror']],'custom');assert.ok(kitchen.includes('chr_royal_chef'));
 const squad=N.sceneDependencies(native,C.DATA,[['ultimate-bandit-squad','ultimate-mirror']],'custom');assert.ok(squad.includes('chr_bandit'));assert.ok(squad.includes('chr_boss_bandit'));
});

test('potato rendering shows the third Builder without source assets',()=>{
 const scope=drawScope();vm.runInNewContext(fs.readFileSync(require.resolve('../src/potato'),'utf8'),scope);const c=context(),u={id:1,entity:'UltimateBattleKitchen',x:100,y:200,hp:100,maxHp:100,team:0,level:11,building:true,def:{radiusTiles:.4},ultimate:{builders:3}},b={time:.5,arenaLayout:{left:0,right:18,top:0,bottom:24,river:false,bridges:[]},areas:[],units:[u],towers:[],projectiles:[],effects:[],isPresent:()=>true};scope.RoyalePotato.draw(c,b,.5,null,null);assert.ok(c.calls.some(r=>r[0]==='fillText'&&r[1]==='B3'));
});
