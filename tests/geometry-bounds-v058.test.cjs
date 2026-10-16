'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),M=require('../src/modern-3d');
test('geometry bounds reuse exact poses across appearance passes and evict oldest measurements',()=>{
 const cache=new M.GeometryBoundsCache(2);let reads=0;const measure=()=>({left:++reads,right:2,top:3,bottom:4});
 const a=cache.sample('idle',measure);assert.equal(cache.sample('idle',measure),a);assert.equal(reads,1);assert.ok(Object.isFrozen(a));
 cache.sample('attack',measure);cache.sample('idle',measure);cache.sample('walk',measure);assert.equal(cache.entries.size,2);assert.equal(cache.sample('attack',measure).left,4);assert.equal(cache.hits,2);
});
test('geometry keys distinguish headings, exact interpolation, visible event frames and transition sources',()=>{
 const pose=[{name:'Attack',frame:3,time:.1}],blend=[{index:0,from:{name:'Idle',frame:2,time:.05},weight:.3}],key=M.geometryPoseKey(pose,.2,blend);
 for(const other of [M.geometryPoseKey(pose,.21,blend),M.geometryPoseKey([{...pose[0],time:.1000001}],.2,blend),M.geometryPoseKey([{...pose[0],frame:4}],.2,blend),M.geometryPoseKey(pose,.2,[{...blend[0],weight:.4}]),M.geometryPoseKey(pose,.2,[{...blend[0],from:{...blend[0].from,time:.051}}])])assert.notEqual(key,other);
 assert.equal(M.geometryPoseKey(pose,.2,blend),key);
});
test('packed bounds match Three exactly over animated multi-bone meshes and retain normalized fallback',async()=>{
 const T=await import('data:text/javascript;base64,'+require('node:fs').readFileSync(require.resolve('../assets/vendor/three/three.core.js')).toString('base64'));
 for(const normalized of [false,true]){
  const g=new T.BufferGeometry(),positions=[],indices=[],weights=[];for(let i=0;i<120;i++){positions.push(Math.sin(i)*7,Math.cos(i)*4,i/19);indices.push(0,1,2,3);weights.push(...(normalized?[25,50,75,105]:[0,.2,.3,.5]));}
  g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));g.setAttribute('skinWeight',normalized?new T.Uint8BufferAttribute(weights,4,true):new T.Float32BufferAttribute(weights,4));
  const bones=Array.from({length:4},()=>new T.Bone());for(let i=1;i<4;i++){bones[i].position.set(.2,.1,.3);bones[i-1].add(bones[i]);}const mesh=new T.SkinnedMesh(g,new T.MeshBasicMaterial());mesh.add(bones[0]);mesh.bind(new T.Skeleton(bones));
  for(let i=0;i<24;i++){mesh.rotation.z=i*.13;bones[1].rotation.x=i*.07;bones[2].rotation.y=-i*.13;bones[3].scale.setScalar(1+i*.01);mesh.updateMatrixWorld(true);mesh.skeleton.update();mesh.computeBoundingBox();const expected=mesh.boundingBox.clone();M.computeSkinnedBounds(mesh,T);assert.deepEqual(mesh.boundingBox.min.toArray(),expected.min.toArray());assert.deepEqual(mesh.boundingBox.max.toArray(),expected.max.toArray());}
 }
});
