'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),M=require('../src/modern-3d.js');
test('static bodies and their shadows share poses across presentation clocks',()=>{
 const traits={shadowDiffers:false,timeDependent:false};
 assert.equal(M.bodyAppearanceKey([],false,traits,1,60),M.bodyAppearanceKey([],false,traits,500,60));
 assert.equal(M.bodyAppearanceKey([],false,traits,1,60),M.bodyAppearanceKey([],true,traits,1,60));
});
test('animated body materials and actual overlay targets retain distinct cached appearances',()=>{
 const traits={shadowDiffers:false,timeDependent:true};
 assert.notEqual(M.bodyAppearanceKey([],false,traits,1,60),M.bodyAppearanceKey([],false,traits,2,60));
 assert.equal(M.bodyAppearanceKey([],true,traits,1,60),M.bodyAppearanceKey([],true,traits,2,60));
 const e={bodyMaterial:'glow',effectKey:'event',age:.1,duration:1,component:{GeometryNames:['weapon']}};
 assert.notEqual(M.bodyAppearanceKey([e],false,{},0,60),M.bodyAppearanceKey([{...e,component:{GeometryNames:['body']}}],false,{},0,60));
 assert.equal(M.bodyAppearanceKey([{...e,age:2}],false,{},0,60),M.bodyAppearanceKey([],false,{},0,60));
 assert.notEqual(M.bodyAppearanceKey([],false,{shadowDiffers:true},0,60),M.bodyAppearanceKey([],true,{shadowDiffers:true},0,60));
});
test('raster targets reuse capacity and crop the exact requested pixels from WebGL lower origin',()=>{
 let size=M.rasterTarget({width:0,height:0},237,311);assert.deepEqual(size,{width:256,height:384,w:237,h:311,sy:73});
 const smaller=M.rasterTarget(size,210,190);assert.equal(smaller.width,256);assert.equal(smaller.height,384);assert.equal(smaller.sy,194);
 size=M.rasterTarget(smaller,410,700);assert.deepEqual(size,{width:512,height:768,w:410,h:700,sy:68});
 assert.equal(M.rasterTarget(size,1536,1536).width,1536);
});
test('floating-point rounding cannot request a raster larger than its capped buffer',()=>{
 const width=32.934306569343065,effective=1536/(width*32),rounded=Math.ceil(width*32*effective);
 assert.equal(rounded,1537);
 assert.deepEqual(M.rasterTarget({},rounded,rounded),{width:1536,height:1536,w:1536,h:1536,sy:0});
});
