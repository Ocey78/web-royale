'use strict';
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const L=require('../src/arena-layout.js');
function fixture(){
 const surfaces=[];
 function context(){const calls=[],c={calls,canvas:{},globalAlpha:1};for(const n of ['save','restore','beginPath','closePath','moveTo','lineTo','bezierCurveTo','rect','clip','fill','stroke','fillRect','strokeRect','ellipse','translate','transform','scale','rotate','drawImage'])c[n]=(...args)=>calls.push([n,...args]);c.createLinearGradient=c.createRadialGradient=()=>({addColorStop(){}});return c;}
 class Image{constructor(){this.width=551;this.height=647;this.naturalWidth=551;this.naturalHeight=647;}set src(value){this.url=value;queueMicrotask(()=>this.onload?.());}get src(){return this.url;}}
 const root={Image,RoyaleGraphics:{current:{arenaScale:1,arenaAnimated:true,arenaFps:30,arenaBackgrounds:'good'}},document:{baseURI:'http://localhost/',createElement(){const c=context(),cv={width:0,height:0,getContext:()=>c};c.canvas=cv;surfaces.push(cv);return cv;}}};root.globalThis=root;vm.runInNewContext(fs.readFileSync('src/custom-arena.js','utf8'),root);return{root,surfaces,context};
}
test('touchdown keeps its playable pitch separate from background and raised stadium decorations',async()=>{
 const {root,surfaces}=fixture(),b={arenaLayout:L.get('Touchdown')};
 a.equal(await root.RoyaleCustomArena.prepareAssets(b,'http://localhost/game/'),true);
 const cv=root.RoyaleCustomArena.prepare(b,null),draws=surfaces[0].getContext().calls.filter(c=>c[0]==='drawImage');
 a.equal(cv.stadiumArt,'supplied-reference');a.equal(cv.foundations.length,0);a.equal(cv.crossings,0);
 a.ok(cv.background,'distant stadium scenery has its own cached surface');
 a.equal(draws.length,3,'the ground surface contains only turf and the two end zones');
 const centre=draws.filter(c=>c[2]===136&&c[4]===273);a.equal(centre.length,3);
 a.ok(centre.some(c=>c[3]===169&&c[5]===315&&c[7]===25&&c[9]===590),'green goal boundaries match gameplay goals');
 const front=cv.foreground.getContext().calls.filter(c=>c[0]==='drawImage'),back=cv.background.getContext().calls.filter(c=>c[0]==='drawImage'),all=[...draws,...front,...back];
 a.ok(front.length>0&&back.length>0,'both decoration layers contain supplied source crops');
 for(const q of draws)a.ok(q[6]>=0&&q[6]+q[8]<=480&&q[7]>=-20&&q[7]+q[9]<=660,'ground art stays inside the legal field');
 for(const q of [...front,...back])a.ok(q[6]+q[8]<=0||q[6]>=480||q[7]+q[9]<=-20||q[7]>=660,'stadium decorations cannot cover a playable lane');
 a.equal(all.reduce((area,q)=>area+q[4]*q[5],0),551*647,'all original stadium pixels belong to exactly one presentation layer');
 const output=fixture().context();root.RoyaleCustomArena.draw(output,b,null);a.deepEqual(output.calls.filter(q=>q[0]==='drawImage').map(q=>q[1]),[cv.background,cv],'background renders before the playable ground');
 root.RoyaleCustomArena.clear();for(const layer of [cv,cv.background,cv.foreground])a.equal(layer.width,1,'clearing custom caches releases every Touchdown layer');
});
test('a missing reference falls back to the existing native touchdown pitch',async()=>{
 const {root}=fixture();root.Image=class{set src(value){queueMicrotask(()=>this.onerror?.(new Error('missing')));}};
 const b={arenaLayout:L.get('Touchdown')};a.equal(await root.RoyaleCustomArena.prepareAssets(b,'http://localhost/'),false);
 const drawn=[],scene={clip:n=>n==='royal_touchdown_bg'?{}:null,bounds:()=>({x:-1066,y:-458,width:2135,height:1931}),draw(c,n){drawn.push(n);}};
 const cv=root.RoyaleCustomArena.prepare(b,{scenes:{level_royal_arena:scene}});
 a.ok(drawn.includes('royal_touchdown_bg'));a.equal(cv.stadiumArt,'native-pitch');a.equal(cv.foundations.length,0);
});
test('jungle and volcano use their own source perimeter props instead of the shared spooky stands',()=>{
 for(const [id,want] of [['Team3v3Jungle','level_jungle_arena'],['Team3v3Volcano','level_dark_arena']]){
  const {root}=fixture(),drawn=[],scene=n=>({clip:()=>({}),bounds:()=>({x:0,y:0,width:40,height:80}),draw(c,name){drawn.push([n,name]);}});
  root.RoyaleCustomArena.prepare({arenaLayout:L.get(id)},{scenes:Object.fromEntries(['level_jungle_arena','level_dark_arena','level_spooky_arena'].map(n=>[n,scene(n)]))});
  a.ok(drawn.some(([n])=>n===want),id+' draws theme source architecture');a.ok(!drawn.some(([n])=>n==='level_spooky_arena'),id+' avoids the recurring spooky structures');
 }
});
test('expanded environments animate scenery beyond both ends while retaining static surface caches',()=>{
 for(const id of ['Team3v3Jungle','Team3v3Volcano','TeamRumbleArcReverse','TeamRumbleRiverLine']){
  const {root,surfaces,context}=fixture(),b={arenaLayout:L.get(id)},cv=root.RoyaleCustomArena.prepare(b,null),c=context();
  root.RoyaleCustomArena.drawForeground(c,b,null,1);const first=c.calls.filter(q=>q[0]==='ellipse');
  a.ok(first.some(q=>q[2]<b.arenaLayout.top*20),id+' has motion above the floor');a.ok(first.some(q=>q[2]>b.arenaLayout.bottom*20),id+' has motion below the floor');
  c.calls.length=0;root.RoyaleCustomArena.drawForeground(c,b,null,2);a.notDeepEqual(c.calls.filter(q=>q[0]==='ellipse'),first,id+' environment moves');
  a.equal(root.RoyaleCustomArena.prepare(b,null),cv);a.equal(surfaces.length,2);
  root.RoyaleGraphics.current.arenaAnimated=false;c.calls.length=0;root.RoyaleCustomArena.drawForeground(c,b,null,3);a.deepEqual(c.calls.map(q=>q[0]),['drawImage']);
 }
});
test('Ultra custom environment ambience retains Max detail without increasing its bounded workload',()=>{
 const {root,context}=fixture(),b={arenaLayout:L.get('TeamRumbleRiverLine')};root.RoyaleCustomArena.prepare(b,null);
 const count=tier=>{root.RoyaleGraphics.current.arenaBackgrounds=tier;const c=context();root.RoyaleCustomArena.drawForeground(c,b,null,1);return c.calls.filter(q=>q[0]==='ellipse').length;};
 const good=count('good'),max=count('max'),ultra=count('ultra');a.ok(max>good,'Max adds ambient detail');a.equal(ultra,max,'Ultra keeps the full Max ambience workload');
});
