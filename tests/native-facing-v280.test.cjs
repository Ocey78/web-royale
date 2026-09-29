'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),N=require('../src/native'),D=require('../assets/native/data.json');
test('stationary Cannon Cart faces a left-hand target with one horizontal reflection',()=>{
 const library=new N.Library(D),cfg=D.units.BrokenCannon,data=D.scenes[cfg.scene],drawn=[];
 let xScale=1;const stack=[],ctx={save(){stack.push(xScale);},restore(){xScale=stack.pop();},translate(){},scale(x){xScale*=x;}};
 library.scenes[cfg.scene]={data,id:name=>data.exports[name],clip:name=>data.clips[data.exports[name]],duration(name){const c=this.clip(name);return c.frames.length/c.fps;},draw(c,name,time,opts){drawn.push({name,xScale,frame:opts.frame});}};
 for(const team of [0,1]){
  drawn.length=0;library.unit(ctx,'BrokenCannon',0,0,team,1,'idle',0);const right=drawn[0];
  drawn.length=0;library.unit(ctx,'BrokenCannon',0,0,team,1,'idle',Math.PI);const left=drawn[0];
  assert.ok(right.xScale>0);assert.ok(left.xScale<0,'Left-facing rotation pose must not be mirrored twice');assert.equal(left.frame,right.frame);
 }
});
