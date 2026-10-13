'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),M=require('../src/modern-3d');
test('cached bone matrices produce exactly the original bounds across animation, morphs and binding transforms',async()=>{
 const code=require('node:fs').readFileSync(require.resolve('../assets/vendor/three/three.core.js')),T=await import('data:text/javascript;base64,'+code.toString('base64'));
 const g=new T.BufferGeometry(),positions=[],indices=[],weights=[];
 for(let i=0;i<64;i++){positions.push(Math.sin(i)*3,Math.cos(i)*2,i/17);indices.push(0,1,2,3);weights.push(.1,.2,.3,.4);}
 g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));g.morphAttributes.position=[new T.Float32BufferAttribute(positions.map(v=>v*.7+.2),3)];
 const bones=Array.from({length:4},()=>new T.Bone());for(let i=1;i<4;i++){bones[i].position.z=.3;bones[i-1].add(bones[i]);}
 const mesh=new T.SkinnedMesh(g,new T.MeshBasicMaterial());mesh.add(bones[0]);mesh.bind(new T.Skeleton(bones));mesh.morphTargetInfluences[0]=.25;
 for(let i=0;i<24;i++){mesh.rotation.z=i*.1;bones[1].rotation.x=i*.07;bones[2].rotation.y=-i*.13;bones[3].scale.setScalar(1+i*.01);mesh.updateMatrixWorld(true);mesh.skeleton.update();mesh.computeBoundingBox();const expected=mesh.boundingBox.clone();M.computeSkinnedBounds(mesh,T);assert.deepEqual(mesh.boundingBox.min.toArray(),expected.min.toArray());assert.deepEqual(mesh.boundingBox.max.toArray(),expected.max.toArray());}
});
