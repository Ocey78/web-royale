const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const file=path.join(__dirname,'../src/modern-3d.js');
const M=fs.existsSync(file)?require(file):{};
const asm={States:[{Name:'Idle',Type:'Selector',SubStates:['IdleBasic','Idle_shield'],SwitchValues:[0,1]},{Name:'IdleBasic',Type:'AnimClip'},{Name:'Idle_shield',Type:'AnimClip'},{Name:'Attack',Type:'Random',SubStates:['Attack1','Attack2']},{Name:'Attack1',Type:'AnimClip'},{Name:'Attack2',Type:'AnimClip'}]};
test('source selectors keep the shield variant and deterministic alternate attack',()=>{
 assert.equal(typeof M.resolveState,'function','live source state resolver exists');
 assert.equal(M.resolveState(asm,'Idle',{shield:0}), 'IdleBasic');
 assert.equal(M.resolveState(asm,'Idle',{shield:10}), 'Idle_shield');
 assert.equal(M.resolveState(asm,'Attack',{visualAttack:{sequence:1}}), 'Attack2');
});
test('invalid source selector cycles stop instead of hanging rendering',()=>{
 assert.equal(typeof M.resolveState,'function');
 assert.equal(M.resolveState({States:[{Name:'Idle',Type:'Selector',SubStates:['Idle']}]},'Idle'),null);
});
test('a source controller default state is used when no generic Idle name exists',()=>{
 assert.equal(M.resolveState({DefaultState:'BasicIdle',States:[{Name:'BasicIdle',Type:'AnimClip'}]},null),'BasicIdle');
});
test('world facing rotates the original asymmetric model through all four quadrants',()=>{
 assert.equal(typeof M.sourceYaw,'function');
 // Imported CHARACTER rigs and battle prefab transforms author the face along
 // -Y. The field's screen Y runs opposite the glTF world's +Y.
 for(const [heading,yaw] of [[-Math.PI/2,Math.PI],[0,Math.PI/2],[Math.PI/2,0],[Math.PI,-Math.PI/2]])assert.ok(Math.abs(M.sourceYaw(heading)-yaw)<1e-10);
 for(const heading of [-Math.PI/2,0,Math.PI/2,Math.PI,.31]){const yaw=M.sourceYaw(heading);assert.ok(Math.abs(Math.sin(yaw)-Math.cos(heading))<1e-10);assert.ok(Math.abs(Math.cos(yaw)-Math.sin(heading))<1e-10);}
 assert.notEqual(M.sourceYaw(.4),M.sourceYaw(Math.PI-.4));
});
const clip={frames:28,fps:30,markers:[{Name:'action_frame',Frame:12}]};
test('source action marker follows simulation windup then native recovery without respeeding',()=>{
 assert.equal(typeof M.clipPose,'function');
 assert.equal(M.clipPose(clip,.5,'attack',{windup:1}).frame,6);
 assert.equal(M.clipPose(clip,1,'attack',{windup:1}).frame,11);
 assert.equal(M.clipPose(clip,1.1,'attack',{windup:1,releasedAt:1}).frame,15);
 assert.equal(M.clipPose(clip,2,'attack',{windup:1,releasedAt:1}).done,true);
});
test('an omitted source marker Frame means frame zero and one-shot clips hold their last actual pose',()=>{
 assert.equal(typeof M.clipPose,'function');
 assert.equal(M.clipPose({...clip,markers:[{Name:'action_frame'}]},0,'attack',{releasedAt:0}).frame,0);
 assert.equal(M.clipPose(clip,9,'deploy').frame,27);
 assert.equal(M.clipPose(clip,1,'idle').frame,2);
});
test('higher graphics quality changes raster density while preserving world size',()=>{
 assert.equal(typeof M.rasterDensity,'function');
 assert.ok(M.rasterDensity({battleDensity:3,textureScale:2.5})>M.rasterDensity({battleDensity:1,textureScale:.5}));
 assert.equal(M.rasterDensity({battleDensity:Infinity,textureScale:100}),4);
 assert.ok(M.rasterDensity({battleDensity:.1,textureScale:.1})>=1);
});
test('pose cache is byte bounded and releases the least recently used raster',()=>{
 assert.equal(typeof M.PoseCache,'function');
 const disposed=[],cache=new M.PoseCache(48,(v)=>disposed.push(v));
 cache.set('a','a',16);cache.set('b','b',16);cache.set('c','c',16);cache.get('a');cache.set('d','d',16);
 assert.equal(cache.get('b'),undefined);assert.equal(cache.get('a'),'a');assert.deepEqual(disposed,['b']);assert.equal(cache.bytes,48);
 cache.set('large','large',64);assert.equal(cache.get('large'),undefined);assert.ok(cache.bytes<=48);
 cache.clear();assert.equal(cache.bytes,0);
});
test('source hero manifest makes actor preparation local and publishes unsupported controller reasons',async()=>{
 assert.equal(typeof M.configure,'function');
 const configured=M.configure({heroes:{KnightHero:{parts:[]}},errors:{TombstoneHero:'source controller has no mesh'}},'assets/modern-heroes/');
 await configured;assert.equal(M.has('KnightHero'),true);assert.equal(M.has('TombstoneHero'),false);assert.match(M.unsupported('TombstoneHero'),/no mesh/);
});
