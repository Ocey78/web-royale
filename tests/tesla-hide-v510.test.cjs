'use strict';
const test=require('node:test'),A=require('node:assert/strict'),C=require('../src/core.js'),N=require('../src/native.js'),native=require('../assets/native/data.json');
const context={save(){},restore(){},translate(){},scale(){}};
function fixture(target=true){const b=new C.Battle({ai:false});b.towers=[];const tesla=b.spawn('Tesla',0,9*C.SX,22*C.SY,{wait:0});const victim=target?b.spawn('Giant',1,9*C.SX,18*C.SY,{wait:0}):null;if(victim){victim.hp=victim.maxHp=100000;victim.def={...victim.def,speedTiles:0};}const lib=new N.Library(native,{}),sc=new N.Scene(native.scenes.building_tesla,[]);lib.scenes.building_tesla=sc;return{b,tesla,victim,lib,sc};}
function advance(f,seconds,inspect){for(let i=0;i<Math.round(seconds*60);i++){f.b.time+=1/60;f.b.tickEntity(f.tesla,1/60);inspect?.();}}
function frame(f){let drawn;f.sc.draw=(c,name,time,options)=>{const clip=f.sc.clip(name);drawn={name,frame:options.frame??N.frameAt(time,clip.fps,clip.frames.length,options.loop),loop:options.loop};};const u=f.tesla;f.lib.unit(context,u.entity,u.x,u.y,u.team,f.b.time,u.visualState,u.heading,u.visualStarted,1,{elapsed:u.animationTime,idleTime:u.visualTime,attackDuration:u.visualDuration,entity:u});return drawn;}
const blue=native.scenes.building_tesla.clips[native.scenes.building_tesla.exports.tesla1_blue],at=label=>blue.labels.indexOf(label);

test('Tesla stays in the source raised pose throughout repeated attacks at an in-range target',()=>{
 const f=fixture();advance(f,4,()=>{A.equal(f.tesla.hidden,false);if(f.b.time>.9){const pose=frame(f);A.equal(pose.frame,at('appear_end'),'An engaged Tesla must not replay the lowering half of its combined timeline');A.equal(pose.loop,false);}});
 const hits=f.b.events.filter(e=>e.type==='damage'&&e.source===f.tesla.id);A.equal(hits.length,4);for(const hit of hits)A.equal(hit.amount,f.tesla.def.damage);for(let i=1;i<hits.length;i++)A.ok(Math.abs(hits[i].time-hits[i-1].time-f.tesla.def.interval)<=1/60+1e-9,'Source cadence is retained within one simulation tick');
});

test('an idle Tesla stays on its authored underground pose instead of looping appear/hide',()=>{
 const f=fixture(false);advance(f,3,()=>{A.equal(f.tesla.hidden,true);A.equal(frame(f).frame,at('idle'));});A.equal(f.b.events.filter(e=>e.type==='damage').length,0);
});

test('Tesla raises and lowers once using source durations, then holds until engagement changes',()=>{
 const f=fixture(false);advance(f,.2);const victim=f.b.spawn('Giant',1,9*C.SX,18*C.SY,{wait:0});victim.hp=victim.maxHp=100000;
 advance(f,.4);A.equal(f.tesla.hidden,false);A.ok(frame(f).frame>at('appear_start')&&frame(f).frame<at('appear_end'));advance(f,.5);A.equal(frame(f).frame,at('appear_end'));
 victim.y=2*C.SY;advance(f,.4);A.equal(f.tesla.hidden,true);A.ok(frame(f).frame>at('hide_start')&&frame(f).frame<at('hide_end'));advance(f,.5);A.equal(frame(f).frame,at('idle'));advance(f,1);A.equal(frame(f).frame,at('idle'));
 victim.y=18*C.SY;advance(f,.9);A.equal(frame(f).frame,at('appear_end'));
});

for(const buff of ['Freeze','ZapFreeze'])test(buff+' pauses Tesla presentation and attacks without forcing it underground or replaying a canceled hit',()=>{
 const f=fixture();advance(f,1);const before=frame(f),hp=f.victim.hp;f.b.addBuff(f.tesla,buff,.8,1);advance(f,.7);A.equal(f.victim.hp,hp);A.equal(f.tesla.hidden,false);A.equal(frame(f).frame,before.frame);
 advance(f,.2);A.equal(f.victim.hp,hp,'A canceled attack starts a fresh windup after thaw');advance(f,1.1);A.ok(f.victim.hp<hp);A.equal(frame(f).frame,at('appear_end'));
});

test('Tesla presentation lookup is pure and cannot emit damage or effects while paused',()=>{
 const f=fixture();advance(f,.4);f.b.paused=true;const before=JSON.stringify({unit:f.tesla,hp:f.victim.hp,events:f.b.events,effects:f.b.effects});for(let i=0;i<40;i++){frame(f);f.b.step(1/60);}A.equal(JSON.stringify({unit:f.tesla,hp:f.victim.hp,events:f.b.events,effects:f.b.effects}),before);
});
