const test=require('node:test'),A=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist'),read=p=>fs.readFileSync(path.join(dist,p));
test('web build has a small external-script entry point instead of a 149 MB payload',()=>{const html=read('index.html').toString();A.ok(Buffer.byteLength(html)<30000);A.ok(!html.includes('royale-payload'));A.ok(!html.includes('data:image'));A.match(html,/<script[^>]+src="bootstrap\.[a-f0-9]+\.js"/);});
test('web release is complete and cannot contain desktop executables, installers or fonts',()=>{
 const files=fs.readdirSync(dist,{recursive:true}).filter(f=>fs.statSync(path.join(dist,f)).isFile());A.ok(files.length>300);
 for(const f of files)A.ok(!/\.(exe|bat|cmd|dll|apk|ttf|otf|woff2?|mp4)$/i.test(f),f);
 const m=JSON.parse(read('release.json'));A.equal(m.version,JSON.parse(fs.readFileSync(path.join(root,'package.json'))).version);A.equal(m.target,'web');A.equal(m.cards,require('../src/catalog.js').CARDS.length);
 for(const [name,expected]of Object.entries(m.files)){A.equal(crypto.createHash('sha256').update(read(name)).digest('hex'),expected,name);}
});
test('split scene metadata and images resolve to packaged files with cache-busting revisions',()=>{
 const m=JSON.parse(read('release.json')),runtime=JSON.parse(read(m.runtime));A.equal(runtime.native.streamed,true);
 for(const url of [...Object.values(runtime.art),...Object.values(runtime.images),...Object.values(runtime.uiImages),...Object.values(runtime.native.scenes).map(s=>s.file)]){A.match(url,/\?v=[a-f0-9]+$/);A.ok(fs.existsSync(path.join(dist,url.split('?')[0])),url);}
 A.equal(Object.keys(runtime.art).length,require('../src/catalog.js').CARDS.length);A.ok(Object.values(runtime.native.scenes).every(s=>!s.clips));
});
test('web build bundles no remote script, remote image host, or account impersonation endpoint',()=>{
 const m=JSON.parse(read('release.json')),runtime=JSON.parse(read(m.runtime));for(const map of [runtime.art,runtime.images,runtime.uiImages])for(const url of Object.values(map))A.ok(!url.includes('://'));
 const html=read('index.html').toString();A.ok(!/<script[^>]+src="https?:/i.test(html));
});
test('the web build-info dialog does not advertise the old native bundle version',()=>{const release=JSON.parse(read('release.json')),app=read(release.app).toString();A.ok(!app.includes('Version 0.4.0.'),'stale build information');A.ok(!app.includes('No network connection is needed.'),'hosted assets need same-origin requests');});
