'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const N=require('../src/native.js');
function scene(){return new N.Scene({exports:{meter:1},shapes:{},matrices:[],colors:[],textFields:{3:{fontName:'Supercell-Magic',fontSize:18,bounds:[0,0,100,25],text:'',align:2,color:-1}},clips:{1:{fps:30,frames:[[[2,65535,65535,0],[3,65535,65535,0]]],frameNames:[['bar','level']]},2:{fps:30,frames:[[],[],[]],frameNames:[[],[],[]]}}},[]);}
const ctx={save(){},restore(){},transform(){},translate(){},scale(){}};
test('source UI timelines accept a named child frame without changing sibling playback',()=>{
 const s=scene();s.draw(ctx,'meter',0,{instances:{bar:{frame:2}}});
 assert.ok(s.frameSamples.has('2:2'),'source health fill must use the requested child frame');
});
test('source text fields forward live values to the original glyph painter',()=>{
 const calls=[];global.RoyaleText={field:(c,f,text)=>calls.push({f,text})};
 const s=scene();s.draw(ctx,'meter',0,{texts:{level:'28'}});delete global.RoyaleText;
 assert.equal(calls.length,1);assert.equal(calls[0].text,'28');assert.equal(calls[0].f.fontSize,18);
});
test('hidden source instances do not render or sample their children',()=>{
 const s=scene();s.draw(ctx,'meter',0,{instances:{bar:{visible:false}}});
 assert.equal([...s.frameSamples].some(x=>x.startsWith('2:')),false);
});
test('source damage/deploy filter nodes can wrap a rendered character',()=>{
 const s=scene();let replaced=0;s.draw(ctx,'meter',0,{replaceNodes:{2:()=>replaced++}});
 assert.equal(replaced,1);
});
test('native presentation module and metadata exist rather than fall back to drawn bars',()=>{
 assert.ok(fs.existsSync(path.join(__dirname,'../src/presentation.js')));
 assert.ok(fs.existsSync(path.join(__dirname,'../assets/presentation/data.json')));
});
test('XP display uses the uploaded experience-level thresholds',()=>{
 const data=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/presentation/data.json')));
 assert.ok(Array.isArray(data.experienceLevels));
 assert.equal(data.experienceLevels.find(r=>r.Name==='9').ExpToNextLevel,10000);
});
