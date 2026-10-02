'use strict';
const test=require('node:test'),A=require('node:assert/strict'),fs=require('node:fs');
const read=f=>fs.readFileSync(require('node:path').join(__dirname,'../',f),'utf8');
test('v110: menus expose 2v2, learning controls and trophy road navigation',()=>{const a=read('src/app.js');for(const marker of ['learning-center','train-start','train-stop','learning-export','learning-import','TeamVsTeam','road-next-reward','road-my-progress'])A.ok(a.includes(marker),marker);});
test('v260: range preview uses the engine forecast and hints cannot be disabled',()=>{A.match(read('src/draw.js'),/placementPreview/);A.equal(require('../src/core.js').normalizeProfile({placementHints:false}).placementHints,true);});
test('v110: build emits an offline training worker and all new runtime modules',()=>{const s=read('tools/build-web.js');for(const name of ['navigation','learning','learning-store','training-worker','v110.css'])A.ok(s.includes(name),name);});
test('v110: training runs without the browser DOM or any remote game service',()=>{A.ok(fs.existsSync(require('node:path').join(__dirname,'../src/training-worker.js')));const w=read('src/training-worker.js');A.ok(w.includes('cancel'));A.ok(!/https?:\/\//.test(w));A.ok(!/document\./.test(w));});
