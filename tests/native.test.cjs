const test=require('node:test'),assert=require('node:assert/strict'),N=require('../src/native.js');
test('native frame index preserves fps, looping and clamp',()=>{assert.equal(N.frameAt(0.5,24,16),12);assert.equal(N.frameAt(1,24,16),8);assert.equal(N.frameAt(1,24,16,false),15);assert.equal(N.frameAt(-1,24,16),0)});
test('direction resolution covers original nine facing exports',()=>{assert.deepEqual(N.direction(0,-1),{index:1,flip:false});assert.equal(N.direction(0,1).index,9);assert.equal(N.direction(1,0).index,5);assert.equal(N.direction(-1,0).flip,true)});
test('UV affine maps rotated texture corners to their vertices',()=>{const a=N.affine([[0,0],[0,10],[20,10]],[[5,8],[15,8],[15,28]]);assert.ok(a);const f=(x,y)=>[a[0]*x+a[2]*y+a[4],a[1]*x+a[3]*y+a[5]];assert.deepEqual(f(0,0),[5,8]);assert.deepEqual(f(20,10),[15,28])});
test('collinear texture coordinates are rejected',()=>{assert.equal(N.affine([[0,0],[1,1],[2,2]],[[0,0],[1,1],[2,2]]),null)});
test('clip resolution uses per-team source prefixes',()=>{const cfg={prefix:['Knight','Knight_enemy']};assert.equal(N.exportName(cfg,1,'run',9),'Knight_enemy_run1_9')});
const C=require('../src/core.js');
test('battle publishes movement and attack animation states',()=>{
 const b=new C.Battle({ai:false});b.deploy(0,0,118,450);const u=b.units[0],start={x:u.x,y:u.y};assert.equal(u.visualState,'idle');
 for(let i=0;i<60;i++)b.step(1/60);assert.equal(u.visualState,'run');
 const dx=(u.x-start.x)/C.SX,dy=(u.y-start.y)/C.SY,distance=Math.hypot(dx,dy);assert(distance>0);
 // Lane entry can be horizontal. Facing must agree with actual movement,
 // rather than assuming every initial step points toward the enemy's back row.
 assert(Math.abs(Math.cos(u.heading)-dx/distance)<1e-6);assert(Math.abs(Math.sin(u.heading)-dy/distance)<1e-6);
 const target=b.towers.find(t=>t.team===1&&!t.king);u.x=target.x;u.y=target.y+35;u.cooldown=0;b.step(1/60);assert.equal(u.visualState,'attack');assert.equal(u.visualStarted,b.time);
});
test('paused battle freezes native animation time',()=>{const b=new C.Battle({ai:false});b.step(.05);const time=b.time;b.paused=true;b.step(.05);assert.equal(b.time,time)});

test('bundled native data includes original tower-princess animations for both teams',()=>{
 const data=require('../assets/native/data.json');
 assert.ok(data.scenes.chr_princess,'Tower Princess scene is required');
 for(const prefix of ['princess_tower','princess_tower_red'])
  for(const state of ['idle','attack'])
   for(let i=1;i<=9;i++){
    const scene=data.scenes.chr_princess,clip=scene.clips[scene.exports[`${prefix}_${state}1_${i}`]];
    assert.ok(clip&&clip.fps>0&&clip.frames.length>0);
   }
});
