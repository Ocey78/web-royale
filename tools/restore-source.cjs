'use strict';
// The archive includes each runtime image once, under dist/. Restore missing
// editable source copies from that verified output before rebuilding or testing.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const RAW='assets/native/data.json',ARCHIVE='assets/native/source-data.json.gz',PROOF='assets/native/source-data.provenance.json';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function verifyNativeSourcePackage(root=path.resolve(__dirname,'..'),{required=false,includeBytes=false}={}){
 const archivePath=path.join(root,ARCHIVE),proofPath=path.join(root,PROOF),hasArchive=fs.existsSync(archivePath),hasProof=fs.existsSync(proofPath);
 if(!hasArchive&&!hasProof&&!required)return null;
 if(!hasArchive||!hasProof)throw Error('Missing native source archive or provenance');
 const proof=JSON.parse(fs.readFileSync(proofPath,'utf8'));
 if(proof.schema!==1||proof.compression!=='gzip'||proof.raw?.path!==RAW||proof.archive?.path!==ARCHIVE)throw Error('Invalid native source provenance');
 for(const record of [proof.raw,proof.archive])if(!Number.isSafeInteger(record.bytes)||record.bytes<=0||record.bytes>1024*1024*1024||!/^[a-f0-9]{64}$/.test(record.sha256||''))throw Error('Invalid native source provenance size or checksum');
 const compressed=fs.readFileSync(archivePath);
 if(compressed.length!==proof.archive.bytes||sha(compressed)!==proof.archive.sha256)throw Error('Native source archive checksum mismatch');
 let bytes;try{bytes=zlib.gunzipSync(compressed,{maxOutputLength:proof.raw.bytes});}catch{throw Error('Invalid native source archive payload');}
 if(bytes.length!==proof.raw.bytes||sha(bytes)!==proof.raw.sha256)throw Error('Native raw source checksum mismatch');
 const rawPath=path.join(root,RAW);if(fs.existsSync(rawPath)){const raw=fs.readFileSync(rawPath);if(raw.length!==proof.raw.bytes||sha(raw)!==proof.raw.sha256)throw Error('Existing native raw source checksum mismatch');}
 return {...proof,...(includeBytes?{bytes}:{})};
}
function restore(root=path.resolve(__dirname,'..')){
 const pending=[];
 const packaged=verifyNativeSourcePackage(root,{includeBytes:true}),rawTarget=path.join(root,RAW);
 if(packaged&&!fs.existsSync(rawTarget))pending.push({target:rawTarget,bytes:packaged.bytes});
 const dist=path.join(root,'dist'),manifest=path.join(dist,'release.json');
 const files=fs.existsSync(manifest)?JSON.parse(fs.readFileSync(manifest,'utf8')).files:{};if(!files||typeof files!=='object')throw Error('Invalid web release manifest');
 for(const [name,expected]of Object.entries(files)){
  if(!name.startsWith('assets/')||! /\.(png|webp|wav|glb)$/i.test(name))continue;
  if(!/^assets\/[A-Za-z0-9_./-]+\.(png|webp|wav|glb)$/.test(name)||name.split('/').includes('..'))throw Error('Invalid image manifest path: '+name);
  const target=path.join(root,name);if(fs.existsSync(target))continue;
  const source=path.join(dist,name);if(!fs.existsSync(source))throw Error('Missing distributed source asset: '+name);
  const bytes=fs.readFileSync(source),actual=crypto.createHash('sha256').update(bytes).digest('hex');
  if(actual!==expected)throw Error('Source asset checksum mismatch: '+name);
  pending.push({target,bytes});
 }
 // Validate the entire missing-image set before writing any of it.
 for(const {target,bytes}of pending){fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes,{flag:'wx'});}
 return pending.length;
}
if(require.main===module){const count=restore();console.log(`Source assets ready (${count} restored from the verified web build).`);}
module.exports={restore,verifyNativeSourcePackage};
