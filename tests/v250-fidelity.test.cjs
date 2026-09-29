'use strict';
const test=require('node:test'),A=require('node:assert/strict'),C=require('../src/core'),V=require('../src/battle-view'),P=require('../src/pathing');
const {SX,SY}=C, distance=(a,b)=>Math.hypot((a.x-b.x)/SX,(a.y-b.y)/SY);
const make=()=>new C.Battle({ai:false,headless:true});
test('v250 camera projects the measured reference river and field edges',()=>{
 const k=540/944,river=V.toScreen({x:240,y:320});
 A.ok(Math.abs(river.x-472*k)<1);
 A.ok(Math.abs(river.y-(298.3907+1.99612373*320)*k)<1,JSON.stringify(river));
 A.ok(Math.abs(V.toScreen({x:0,y:0}).x-(-6.518*k))<1);
});
test('v250 battle view retains reference aspect ratio without stretching menus',()=>{
 A.ok(V.layout&&Math.abs(V.layout.height/V.layout.width-2048/944)<.002);
 const fit=V.fitViewport(1200,960);A.ok(Math.abs(fit.width/fit.height-944/2048)<.002);
 A.equal(C.fitViewport(1200,960).width,540);
 for(const p of [{x:0,y:0},{x:480,y:640},{x:240,y:320}]){const q=V.toWorld(V.toScreen(p));A.ok(Math.hypot(p.x-q.x,p.y-q.y)<1e-8);}
});
test('v250 a swept move cannot jump completely over a small body',()=>{
 const b=make(),u=b.makeEntity('Knight',0,9*SX,24*SY,{wait:0}),wall=b.makeEntity('Cannon',1,9*SX,21*SY,{wait:0});
 const end=P.sweptStep(u,0,-6*SY,[wall]);A.ok(end.y>=22*SY-1e-3,JSON.stringify(end));
});
test('v250 crowded bodies resolve along the contact normal, not a tangential shuffle',()=>{
 const b=make(),u=b.spawn('Knight',0,9*SX,23*SY,{wait:0}),v=b.spawn('Knight',0,9*SX,22.7*SY,{wait:0});
 const initial=distance(u,v);for(let i=0;i<30;i++){b.time+=1/60;b.separate(1/60);}
 A.ok(distance(u,v)>.98,`${initial} -> ${distance(u,v)}`);
});
test('v250 moving contact does not let a following troop erase the front troop footprint',()=>{
 const b=make(),u=b.spawn('HogRider',0,3.5*SX,24*SY,{wait:0}),v=b.spawn('Knight',0,3.5*SX,22.5*SY,{wait:0});
 const target={id:'goal',x:3.5*SX,y:4*SY,def:{radiusTiles:0}};
 for(let i=0;i<90;i++){b.time+=1/60;b.move(u,target,1/60);b.move(v,target,1/60);b.separate(1/60);A.ok(distance(u,v)>1.06,'excessive overlap '+distance(u,v));}
});
test('committed hit retains a target within source grace and reacquires beyond it',()=>{
 const b=make(),u=b.spawn('Knight',0,9*SX,23*SY,{wait:0}),v=b.spawn('Knight',1,9*SX,21*SY,{wait:0});
 u.targetId=v.id;b.startAttack(u,v);v.y=20*SY;const closer=b.spawn('Skeleton',1,9*SX,21.5*SY,{wait:0});
 A.equal(b.chooseTarget(u)?.id,v.id);
 v.y=10*SY;A.equal(b.chooseTarget(u)?.id,closer.id);
});
test('v250 displacement removes Balloon preload rather than granting another fast first hit',()=>{
 const b=make(),u=b.spawn('Balloon',0,9*SX,22*SY,{wait:0}),v=b.spawn('Cannon',1,9*SX,21.1*SY,{wait:0});
 u.targetId=v.id;b.startAttack(u,v);A.ok(u.windup.remaining<.21);
 b.push(u,0,SY,.05,true);A.equal(u.windup,null);b.startAttack(u,v);A.ok(u.windup.remaining>=2.9,String(u.windup.remaining));
});
test('v250 dash destination contacts the target edge rather than its center',()=>{
 const b=make(),u=b.spawn(C.CARD_BY_ID.bandit.entity,0,9*SX,23*SY,{wait:0}),v=b.spawn('Knight',1,9*SX,19*SY,{wait:0});
 b.startDash(u,v);b.time=u.dash.windup+.001;b.tickDash(u,10);
 A.ok(distance(u,v)>=u.def.radiusTiles+v.def.radiusTiles-.01,String(distance(u,v)));
});
const N=require('../src/native');
test('v250 original tower art pivots align with registered source tower landmarks',()=>{
 A.equal(typeof N.towerArtPosition,'function');
 const a=N.towerArtPosition({x:3.5*SX,y:6.5*SY,king:false});
 A.ok(Math.abs(a.x-102.5)<.1);A.ok(Math.abs(a.y-125.833)<.1);
 const k=N.towerArtPosition({x:240,y:580,king:true});A.ok(Math.abs(k.y-575.833)<.1);
});
test('v250 Hog crosses open river with source jump speed and a visible arc',()=>{
 const b=make(),u=b.spawn('HogRider',0,9*SX,17.1*SY,{wait:0}),t={id:'goal',x:9*SX,y:12*SY,def:{radiusTiles:0}};
 let airborne=false,peak=0,fast=false;for(let i=0;i<90;i++){b.time+=1/60;const old={x:u.x,y:u.y};b.move(u,t,1/60);const h=N.entityElevation?.(u)||0;peak=Math.max(peak,h);if(h>0)airborne=true;if(distance(u,old)>u.def.speedTiles/60+.001)fast=true;}
 A.ok(airborne,'river crossing must not be a ground run');A.ok(peak>70&&peak<=80.01);A.ok(fast,'uses JumpSpeed160 instead of Speed120');A.equal(u.riverJump,null);A.equal(N.entityElevation(u),0);A.equal(u.air,false);
});
test('v250 Hog remains grounded across bridges while hovering Ghost does not jump',()=>{
 const b=make();for(const [name,x] of [['HogRider',3.5],['Ghost',9]]){if(!C.DATA.entities[name])continue;const u=b.spawn(name,0,x*SX,17.1*SY,{wait:0}),t={id:'goal',x:x*SX,y:12*SY,def:{radiusTiles:0}};for(let i=0;i<90;i++){b.time+=1/60;b.move(u,t,1/60);A.equal(N.entityElevation?.(u),N.flightOffset(u.def));}}
});
test('v250 Princess is attached at the authored height rather than double that height',()=>{
 A.equal(typeof N.towerAttachmentOffset,'function');A.equal(N.towerAttachmentOffset({def:{source:C.DATA.entities.PrincessTower}}),26.4);
});
test('v250 high resolution source caches stay bounded for giant arena backdrops',()=>{
 A.equal(typeof N.shapeRasterScale,'function');A.equal(N.shapeRasterScale(160,200,2),2);
 for(const [w,h] of [[8002,2148],[4403,3650],[860,5002]]){const q=N.shapeRasterScale(w,h,2);A.ok(Math.ceil(w*q)<=8192);A.ok(Math.ceil(h*q)<=8192);A.ok(Math.ceil(w*q)*Math.ceil(h*q)<=8388608);}
 A.throws(()=>N.shapeRasterScale(Infinity,10,2));
});
test('v250 King activation follows its source timeline instead of popping to an idle cannon',()=>{
 A.equal(typeof N.kingTowerPose,'function');A.equal(N.kingTowerPose({active:false,activationAt:Infinity},9).frame,0);
 A.equal(N.kingTowerPose({active:false,activationAt:3.3},0).frame,0);
 const halfway=N.kingTowerPose({active:false,activationAt:3.3},1.65);A.ok(halfway.frame>=47&&halfway.frame<=49);
 A.equal(N.kingTowerPose({active:true,activationAt:3.3},4).frame,97);
});
