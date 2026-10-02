'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),N=require('../src/native.js');
const xy=[[0,0],[60,0],[60,8],[0,8]];
for(const [name,uv] of [['column',[[10,0],[10,0],[10,20],[10,20]]],['row',[[10,0],[10,0],[20,0],[20,0]]],['solid',[[10,0],[10,0],[10,0],[10,0]]]])test(`native ${name} texture strip has a drawable affine map`,()=>{
 assert.equal(typeof N.expandStripeUV,'function','Source one-pixel fills must not be dropped');
 const fixed=N.expandStripeUV(uv,64,64);assert.ok(N.affine(fixed.slice(0,3),xy.slice(0,3)));
 assert.ok(fixed.every(p=>p.every(v=>v>=0&&v<=64)));
});
test('ordinary source UV polygons are left unchanged',()=>{
 assert.equal(typeof N.expandStripeUV,'function');const a=[[2,2],[10,2],[10,10],[2,10]];assert.deepEqual(N.expandStripeUV(a,16,16),a);
});
