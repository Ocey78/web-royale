'use strict';
// The archive includes each runtime image once, under dist/. Restore missing
// editable source copies from that verified output before rebuilding or testing.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function restore(root=path.resolve(__dirname,'..')){
 const dist=path.join(root,'dist'),manifest=path.join(dist,'release.json');if(!fs.existsSync(manifest))return 0;
 const files=JSON.parse(fs.readFileSync(manifest,'utf8')).files;if(!files||typeof files!=='object')throw Error('Invalid web release manifest');
 const pending=[];
 for(const [name,expected]of Object.entries(files)){
  if(!name.startsWith('assets/')||! /\.(png|webp|wav)$/i.test(name))continue;
  if(!/^assets\/[A-Za-z0-9_./-]+\.(png|webp|wav)$/.test(name)||name.split('/').includes('..'))throw Error('Invalid image manifest path: '+name);
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
module.exports={restore};
