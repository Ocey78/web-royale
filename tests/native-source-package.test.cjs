'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {restore,verifyNativeSourcePackage}=require('../tools/restore-source.cjs');
const project=path.resolve(__dirname,'..'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function packaged(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'royale-native-source-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const dir=path.join(root,'assets/native');fs.mkdirSync(dir,{recursive:true});for(const name of ['source-data.json.gz','source-data.provenance.json'])fs.copyFileSync(path.join(project,'assets/native',name),path.join(dir,name));return root;}
test('actual native source archive restores missing data byte-exactly without a dist build',t=>{
 const root=packaged(t),target=path.join(root,'assets/native/data.json'),raw=fs.readFileSync(path.join(project,'assets/native/data.json'));
 assert.equal(fs.existsSync(target),false);const proof=verifyNativeSourcePackage(project);assert.equal(proof.raw.sha256,sha(raw));assert.equal(proof.raw.bytes,raw.length);
 assert.equal(restore(root),1);const restored=fs.readFileSync(target);assert.equal(restored.length,raw.length);assert.equal(sha(restored),sha(raw));assert.equal(restore(root),0);
});
test('corrupt archive or false raw provenance rejects before restoring any file',t=>{
 for(const corruption of ['archive','raw']){const root=packaged(t),dir=path.join(root,'assets/native'),target=path.join(dir,'data.json');
  if(corruption==='archive'){const p=path.join(dir,'source-data.json.gz'),b=fs.readFileSync(p);b[Math.floor(b.length/2)]^=1;fs.writeFileSync(p,b);}else{const p=path.join(dir,'source-data.provenance.json'),r=JSON.parse(fs.readFileSync(p));r.raw.sha256='0'.repeat(64);fs.writeFileSync(p,JSON.stringify(r));}
  fs.mkdirSync(path.join(root,'dist/assets/cards'),{recursive:true});const image=Buffer.from('valid-image'),imagePath='assets/cards/test.png';fs.writeFileSync(path.join(root,'dist',imagePath),image);fs.writeFileSync(path.join(root,'dist/release.json'),JSON.stringify({files:{[imagePath]:sha(image)}}));
  assert.throws(()=>restore(root),/checksum|provenance|archive/i);assert.equal(fs.existsSync(target),false);assert.equal(fs.existsSync(path.join(root,imagePath)),false);
 }
});
test('source package refuses an existing raw file with different bytes',t=>{
 const root=packaged(t),target=path.join(root,'assets/native/data.json');fs.writeFileSync(target,'wrong raw source');assert.throws(()=>verifyNativeSourcePackage(root),/raw source|checksum/i);assert.equal(fs.readFileSync(target,'utf8'),'wrong raw source');
});
