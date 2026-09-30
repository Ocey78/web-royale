'use strict';
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs');
const C=require('../src/core'),L=require('../src/arena-layout');
const battle=mode=>new C.Battle({mode,queue:'challenge',seed:4411,ai:false,headless:true});

test('v0441 Rumble kings are pushed deeper into enlarged castle ends with safe rear clearance',()=>{
 const b=battle('TeamRumble'),l=b.arenaLayout,enemy=b.towers.filter(t=>t.king&&t.team===1).sort((x,y)=>x.x-y.x),own=b.towers.filter(t=>t.king&&t.team===0).sort((x,y)=>x.x-y.x);
 a.ok(l.top<=-7&&l.bottom>=39,'castle extends farther vertically');
 a.ok(enemy[2].y/C.SY<=0,'center enemy king pushed back');
 a.ok(own[2].y/C.SY>=32,'center player king pushed back');
 a.ok(enemy[0].y>enemy[1].y&&enemy[1].y>enemy[2].y,'enemy arch preserved');
 a.ok(own[0].y<own[1].y&&own[1].y<own[2].y,'player arch preserved');
});

test('v0441 custom king health presentation uses a detached safe label above the tower art',()=>{
 const src=fs.readFileSync(require.resolve('../src/presentation.js'),'utf8');
 a.match(src,/u\.localKing[\s\S]{0,300}a\.y-6[0-9]/,'local king HP is no longer painted through the king sprite');
 a.match(src,/u\.customCrown&&u\.king[\s\S]{0,500}anchor\.y[+-]/,'custom king health has custom detached placement');
});

test('v0441 custom arena source contains rear-courtyard detail layers for 3v3 and 5v5',()=>{
 const src=fs.readFileSync(require.resolve('../src/custom-arena.js'),'utf8');
 a.match(src,/function rearCourtyard/);
 a.match(src,/rearCourtyard\(c,l,/);
});
