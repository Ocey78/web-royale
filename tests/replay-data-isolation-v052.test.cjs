'use strict';
const test=require('node:test'),a=require('node:assert/strict'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.join(__dirname,'..');
function isolated(body){const r=spawnSync(process.execPath,['-e',body],{cwd:root,encoding:'utf8'});a.equal(r.status,0,r.stderr||r.stdout);}
test('historical replay results survive changes to live tower stats and removal of live card IDs',()=>{
 isolated(`const a=require('node:assert/strict'),C=require('./src/core'),R=require('./src/replay'),L=require('./src/legacy-core-v046');
 const record=require('./tests/fixtures/replay-v046/3v3-rocket.json');
 C.DATA.entities.PrincessTower.Hitpoints=1;delete C.CARD_BY_ID.rocket;
 const s=new R.Session(record);s.seek(record.duration);a.equal(s.error,null);a.deepEqual(R.digest(s.battle),record.expected);a.notEqual(L.DATA,C.DATA);`);
});
test('the historical snapshot and independently captured 0.51 fixture retain their source fingerprints',()=>{
 const fs=require('node:fs'),crypto=require('node:crypto'),p=require('./fixtures/replay-v051/provenance.json');
 const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
 a.equal(sha('src/historical-game-data.js'),p.gameDataSha256);
 a.equal(sha('src/legacy-core-v051.js'),p.engineSha256);
 for(const fixture of p.fixtures)a.equal(sha('tests/fixtures/replay-v051/'+fixture.file),fixture.sha256);
});
test('the archived 0.51 simulator retains its released tower geometry and replay outcome',()=>{
 isolated(`const a=require('node:assert/strict'),C=require('./src/core'),R=require('./src/replay'),L=require('./src/legacy-core-v051');
 const record=require('./tests/fixtures/replay-v051/3v3-rocket-tesla.json');
 C.DATA.entities.PrincessTower.Hitpoints=1;delete C.CARD_BY_ID.rocket;
 const b=new L.Battle({mode:'Team3v3',ai:false,seed:510520});
 a.deepEqual(b.towers.filter(t=>!t.king&&t.team===1).map(t=>t.x/L.SX),[1.5,9,16.5]);
 const s=new R.Session({...record,engine:'0.51'});s.seek(record.duration);a.equal(s.error,null);a.deepEqual(R.digest(s.battle),record.expected);`);
});

test('current replay verification includes source controller clocks, warp paths and presentation phases',()=>{
 const C=require('../src/core'),R=require('../src/replay'),b=new C.Battle({queue:'challenge',ai:false,seed:520051}),u=b.spawn('Knight',0,9*C.SX,20*C.SY,{wait:0});
 const fields=['modernIndicator','modernMegaAbility','modernInjectedWarp','modernKnockback','modernKnockbackHeight','modernFrameRange','modernAttackChain','modernAnimationPlaybackUntil'];
 for(const key of fields){const before=R.digest(b);u[key]=key==='modernKnockbackHeight'?9000:{phase:'pending',until:3,sourceId:u.id};a.notDeepEqual(R.digest(b),before,key+' must affect replay verification');delete u[key];}
});
