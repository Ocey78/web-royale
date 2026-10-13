'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),N=require('../src/native');
function setup(){
 let reads=0;const original=global.document,source=new Uint8ClampedArray([0,9,255,0,127,128,129,64,240,17,6,128,255,255,255,255]),image={width:2,height:2,pixels:source},shape={image,x:0,y:0,w:2,h:2};
 global.document={createElement(){const cv={width:0,height:0};let draw;const ctx={drawImage(img){draw=img;},getImageData(){reads++;return{data:draw.pixels.slice()};},createImageData(w,h){return{data:new Uint8ClampedArray(w*h*4)};},putImageData(px){cv.pixels=px.data.slice();}};cv.getContext=()=>ctx;return cv;}};
 const scene=new N.Scene({shapes:{},clips:{},exports:{}},[]);scene.shape=()=>shape;scene.cache.set(1,shape);return{scene,shape,source,get reads(){return reads;},restore(){scene.releaseRasters();global.document=original;}};
}
test('changing particle colors reuse one source readback and retain exact channel/alpha math',()=>{
 const q=setup();try{for(const color of [[0,0,0,255,255,255,255],[.25,-10,19.8,159.5,254.9,27.8,300],[15.3,13.5,-7.9,20.4,220.7,280.1,79.01],[-8,0,270,0,0,255,1]]){const painted=q.scene.coloredShape(1,color);const expected=q.source.slice();for(let i=0;i<expected.length;i+=4){for(let j=0;j<3;j++)expected[i+j]=Math.min(255,expected[i+j]*color[j+4]/255+color[j]);expected[i+3]*=color[3]/255;}assert.deepEqual(painted.image.pixels,expected);}assert.equal(q.reads,1);assert.deepEqual(q.shape.image.pixels,q.source,'original pixels remain unmodified');}finally{q.restore();}
});
test('identical tint reuses its raster and clearing quality rasters invalidates source bytes',()=>{
 const q=setup();try{const a=q.scene.coloredShape(1,[0,0,0,255,120,130,140]);assert.equal(a,q.scene.coloredShape(1,[0,0,0,255,120,130,140]));assert.equal(q.reads,1);q.scene.releaseRasters();q.shape.image.width=q.shape.image.height=2;q.scene.cache.set(1,q.shape);q.scene.coloredShape(1,[0,0,0,255,20,30,40]);assert.equal(q.reads,2);}finally{q.restore();}
});
test('shared source cache bounds pixels and entries, refreshes LRU and skips oversized shapes',()=>{
 const c=new N.TintSourceCache(8,2),a={width:2,height:2},b={width:2,height:2},d={width:1,height:1},large={width:3,height:3};let reads=0;const read=()=>new Uint8ClampedArray([++reads]);assert.equal(c.get(a,read)[0],1);c.get(b,read);c.get(a,read);c.get(d,read);assert.equal(c.entries.has(b),false);assert.equal(c.pixels,5);assert.equal(c.get(a,read)[0],1);c.get(large,read);assert.equal(c.entries.has(large),false);assert.equal(c.pixels,5);c.delete(a);assert.equal(c.pixels,1);
});
