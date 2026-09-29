'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const N=require('../src/native');
function ui(dpr,scale){const root={devicePixelRatio:dpr,RoyaleText:{backingScale:(d,s)=>Math.max(2,Math.min(4,d*s)),setViewportScale(){}},requestAnimationFrame(){},document:{}};vm.createContext(root);vm.runInContext(fs.readFileSync(require.resolve('../src/ui-polish.js'),'utf8'),root);root.RoyaleUI.resize(scale);return root.RoyaleUI;}
function canvas(){const transforms=[],c={setTransform(...args){transforms.push(args);}};return{width:0,height:0,dataset:{},getContext:()=>c,transforms};}
test('battle canvas retains a modest1.25x quality floor without using the2x glyph floor',()=>{
 const api=ui(1,.85),cv=canvas();api.prepareBattleCanvas(cv,540,1172);assert.equal(cv.width,675);assert.equal(cv.height,1465);assert.equal(cv.dataset.density,'1.25');
 const text=canvas();api.prepareCanvas(text,120,152);assert.equal(text.width,240,'UI/text policy is unchanged');
});
test('battle canvas preserves actual Retina and phone device density, including compact battle height',()=>{
 for(const[dpr,scale,height]of[[2,.85,1172],[3,.72,1172],[3,.85,960]]){const api=ui(dpr,scale),cv=canvas(),density=dpr*scale;api.prepareBattleCanvas(cv,540,height);assert.equal(cv.width,Math.ceil(540*density));assert.equal(cv.height,Math.ceil(height*density));assert.equal(Number(cv.dataset.density),density);}
});
test('battle canvas keeps the previous high-DPR cap and restores its logical transform every draw',()=>{
 const api=ui(4,1),cv=canvas();api.prepareBattleCanvas(cv,540,1172);api.prepareBattleCanvas(cv,540,1172);assert.equal(cv.width,1620);assert.equal(cv.height,3516);assert.deepEqual(cv.transforms,[[3,0,0,3,0,0],[3,0,0,3,0,0]]);
});
function scene(){const s=new N.Scene({exports:{bar:1},shapes:{3:[]},matrices:[[1,0,0,1,5,2]],colors:[],textFields:{4:{text:'default'}},clips:{1:{fps:30,frames:[[[2,0,65535,0],[4,65535,65535,0]]],frameNames:[['bar','level']]},2:{fps:30,frames:[[],[[3,65535,65535,0]]],frameNames:[[],['fill']]}}},[]);s.shape=id=>id===3?{image:'shape',x:0,y:0,w:4,h:2}:null;return s;}
const context=()=>({save(){},restore(){},transform(){},drawImage(){}});
test('still source draw plans reuse geometry while live text and caller state remain dynamic',()=>{
 const s=scene(),calls=[];global.RoyaleText={field:(c,f,text)=>calls.push(text)};
 try{s.drawStill(context(),'bar',{instances:{bar:{frame:1}},texts:{level:'9'}});const first=s.stillPlans.values().next().value;
 s.drawStill(context(),'bar',{instances:{bar:{frame:1}},texts:{level:'99'}});assert.equal(s.stillPlans.size,1);assert.equal(s.stillPlans.values().next().value,first);assert.deepEqual(calls,['9','99']);assert(first.length>0);
 }finally{delete global.RoyaleText;}
});
test('still source plans retain hidden instances and use a bounded cache',()=>{
 const s=scene();s.drawStill(context(),'bar',{instances:{bar:{visible:false}}});const plan=s.stillPlans.values().next().value;assert(!plan.some(p=>p.shape===3));
 for(let n=0;n<180;n++)s.drawStill(context(),'bar',{frame:n,instances:{bar:{frame:1}}});assert(s.stillPlans.size<=128);
});
test('mask and replacement-node clips retain the ordinary interpreter',()=>{
 const s=scene();s.data.modifiers={2:38};let calls=0;s.draw=()=>{calls++;return true;};s.drawStill(context(),'bar',{});s.drawStill(context(),'bar',{replaceNodes:{2:()=>{}}});assert.equal(calls,2);
});
