'use strict';
const test=require('node:test'),A=require('node:assert/strict'),T=require('../src/text.js');
test('fitting a constrained title never squeezes its horizontal axis',()=>{
 A.equal(typeof T.fitText,'function');
 const fit=T.fitText({advance:600,size:64,ascent:52,descent:13},32,120,30);
 A.equal(fit.scaleX,fit.scaleY);A.ok(fit.width<=120);A.ok(fit.height<=30);
});
test('unconstrained labels keep requested size rather than being enlarged',()=>{
 const fit=T.fitText({advance:100,size:64,ascent:52,descent:13},18,300,90);
 A.equal(fit.size,18);A.equal(fit.scaleX,18/64);
});
test('text backing pixels follow device ratio and displayed viewport scale with a bounded budget',()=>{
 A.equal(typeof T.backingScale,'function');
 A.equal(T.backingScale(1,1),2);A.equal(T.backingScale(2,1.5),3);
 A.equal(T.backingScale(3,.75),2.25);A.equal(T.backingScale(4,3),4);
 A.equal(T.backingScale(NaN,Infinity),2);
});
