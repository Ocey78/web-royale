'use strict';
// Lossless repository copy; the editable native source remains untouched.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const {verifyNativeSourcePackage}=require('./restore-source.cjs');
function packageSource(root=path.resolve(__dirname,'..')){
 const rawPath='assets/native/data.json',archivePath='assets/native/source-data.json.gz',raw=fs.readFileSync(path.join(root,rawPath)),archive=zlib.gzipSync(raw,{level:9}),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
 const proof={schema:1,compression:'gzip',raw:{path:rawPath,bytes:raw.length,sha256:sha(raw)},archive:{path:archivePath,bytes:archive.length,sha256:sha(archive)}};
 fs.writeFileSync(path.join(root,archivePath),archive);fs.writeFileSync(path.join(root,'assets/native/source-data.provenance.json'),JSON.stringify(proof,null,2)+'\n');
 return verifyNativeSourcePackage(root,{required:true});
}
if(require.main===module)console.log(JSON.stringify(packageSource(),null,2));
module.exports={packageSource};
