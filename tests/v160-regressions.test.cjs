'use strict';
const test=require('node:test'),A=require('node:assert/strict'),fs=require('node:fs');
const pkg=require('../package.json');

test('v160 release declares placement engine modules in visible and training bundles',()=>{
 const build=fs.readFileSync(require.resolve('../tools/build-web.js'),'utf8');
 for(const name of ['arena-grid','formations','placement','pathing']) A.match(build,new RegExp("'"+name+"'"));
 const training=build.match(/trainingEngine=\[([^\]]+)\]/);
 A.ok(training,'training module list found');
 for(const name of ['arena-grid','formations','placement','pathing']) A.match(training[1],new RegExp("'"+name+"'"));
});

test('package version agrees with the generated release',()=>{
 const release=JSON.parse(fs.readFileSync(require.resolve('../dist/release.json'),'utf8'));
 A.match(pkg.version,/^\d+\.\d+\.\d+$/);
 const build=fs.readFileSync(require.resolve('../tools/build-web.js'),'utf8');
 A.match(build,/VERSION=project\.version/);
 A.equal(require('../project.json').version,pkg.version);
 A.equal(release.version,pkg.version);
});
