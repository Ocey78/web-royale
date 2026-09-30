/* The measured reference battle frame is independent of the 9:16 menu frame.
   All game geometry stays in the original 480x640 logical world. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./arena-layout.js'):root.RoyaleArenaLayout);if(typeof module==='object'&&module.exports)module.exports=api;else root.RoyaleBattleView=api;})(globalThis,function(L){'use strict';
// Registered against IMG_4991.png: 568 original-terrain feature matches.
// The tiny photographed rotation is intentionally not introduced into gameplay.
const k=540/944;
function composition(compact){
 const layout=Object.freeze(compact?{width:540,height:960,handTop:788,handHeight:172}:{width:540,height:1172,handTop:960,handHeight:212});
 // The source enemy King HUD reaches world y=-60.0417. A uniform 4% reduction
 // leaves its full crown/HP export and the world bottom inside the phone frame.
 // Desktop retains the measured reference camera; neither composition stretches.
 const ratio=compact?.96:1;
 const camera=Object.freeze({x:compact?270+(-6.51802815*k-270)*ratio:-6.51802815*k,y:298.390736*k-(compact?97:0),scale:1.99612373*k*ratio});
 const viewport=Object.freeze({x:0,y:0,width:layout.width,height:layout.handTop});
 const worldClip=Object.freeze({x:(viewport.x-camera.x)/camera.scale,y:(viewport.y-camera.y)/camera.scale,width:viewport.width/camera.scale,height:viewport.height/camera.scale});
 return Object.freeze({layout,camera,viewport,worldClip,mode:compact?'compact':'reference'});
}
const reference=composition(false),compact=composition(true);
// Wide 3v3 keeps the same world and pointer math, but exposes its stone railings,
// stands and animated torches instead of cropping those layers offscreen.
function customComposition(base,id){
 const a=L.get(id),v=base.viewport,top=Math.min(a.top*20-24,Math.min(...(a.kingYs||[a.kingY??3]))*20-125),bottom=a.bottom*20+24;
 const wide=(a.right-a.left)>18,maxScale=wide?Infinity:base.camera.scale*(id.startsWith('Team3v3')?.84:1);
 const scale=Math.min(maxScale,(base.layout.width-(wide?32:16))/((Math.max(18,a.right)-Math.min(0,a.left))*480/18),(v.height-18)/(bottom-top));
 const camera=Object.freeze({x:270-240*scale,y:(v.height-scale*(bottom-top))/2-top*scale,scale});
 return Object.freeze({...base,camera,board:a,worldClip:Object.freeze({x:(v.x-camera.x)/scale,y:(v.y-camera.y)/scale,width:v.width/scale,height:v.height/scale})});
}
let frame=reference;
function configure(options={}){const base=options.compact?compact:reference,a=L.get(options.arenaId);frame=a.custom?customComposition(base,options.arenaId):base;return frame;}
function toWorld(p){const c=frame.camera;return {x:(p.x-c.x)/c.scale,y:(p.y-c.y)/c.scale};}
function toScreen(p){const c=frame.camera;return {x:c.x+p.x*c.scale,y:c.y+p.y*c.scale};}
function onBoard(p){const c=frame.camera,v=frame.viewport,a=frame.board||L.get('classic');return p.x>=Math.max(v.x,c.x+a.left*480/18*c.scale)&&p.x<=Math.min(v.x+v.width,c.x+a.right*480/18*c.scale)&&p.y>=Math.max(v.y,c.y+a.top*20*c.scale)&&p.y<=Math.min(v.y+v.height,c.y+a.bottom*20*c.scale);}
function fitViewport(width,height){if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw RangeError('Viewport dimensions must be positive');const l=frame.layout,scale=Math.min(width/l.width,height/l.height);return{width:l.width*scale,height:l.height*scale,x:(width-l.width*scale)/2,y:(height-l.height*scale)/2,scale};}
return {get layout(){return frame.layout},get camera(){return frame.camera},get viewport(){return frame.viewport},get worldClip(){return frame.worldClip},get mode(){return frame.mode},configure,toWorld,toScreen,onBoard,fitViewport};});
