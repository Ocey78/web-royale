'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('1080-wide canvas backing preserves the 540-wide logical drawing coordinates on low DPI displays',()=>{
 const transforms=[],context={setTransform(...args){transforms.push(args);}},canvas={width:0,height:0,dataset:{},getContext(){return context;}},root={devicePixelRatio:1,RoyaleText:require('../src/text')};
 vm.runInNewContext(fs.readFileSync(require.resolve('../src/ui-polish'),'utf8'),{globalThis:root});
 root.RoyaleUI.prepareBattleCanvas(canvas,540,1172);
 assert.equal(canvas.width,1080);assert.equal(canvas.height,2344);assert.deepEqual(transforms.at(-1),[2,0,0,2,0,0]);
 root.RoyaleUI.prepareCanvas(canvas,540,960);assert.equal(canvas.width,1080);assert.equal(canvas.height,1920);
});
