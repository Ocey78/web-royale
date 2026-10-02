const test=require('node:test'),assert=require('node:assert/strict'),N=require('../src/native.js');
test('source arena layers and time variants are not drawn on top of one another',()=>{
 assert.equal(typeof N.arenaLayers,'function');const a={scene:'arena',export:'ground',objects:[{name:'normal',layer:'Base',visibility:'NormalTime',y:0},{name:'extra',layer:'Above',visibility:'Overtime',y:0},{name:'tree',layer:'Object',visibility:'Always',y:12},{name:'water',layer:'Ground',visibility:'Always',y:600}]};
 assert.deepEqual(N.arenaLayers(a,false).map(o=>o.name),['ground','normal','water','tree']);
 assert.deepEqual(N.arenaLayers(a,true).map(o=>o.name),['ground','water','tree','extra']);
});
