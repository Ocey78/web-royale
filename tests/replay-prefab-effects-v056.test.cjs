'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const Replay=require('../src/replay');
const directory=path.join(__dirname,'fixtures/replay-v053-prefab-effects');
const proof=require('./fixtures/replay-v053-prefab-effects/provenance.json');

for(const entry of proof.records)test(`saved 0.53 ${entry.entity} replay keeps its pre-prefab gameplay digest`,()=>{
 const raw=fs.readFileSync(path.join(directory,entry.file));
 assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),entry.sha256);
 const record=JSON.parse(raw),session=new Replay.Session(record),prefabs=[];
 assert.equal(record.engine,'0.53');
 const effect=session.battle.effect.bind(session.battle);
 session.battle.effect=event=>{if(event.sourcePrefab)prefabs.push(event.sourcePrefab);return effect(event);};
 for(let guard=0;!session.finished&&!session.error&&guard<2000;guard++)session.tick();
 assert.equal(session.error,null);assert.equal(session.finished,true);
 assert.ok(prefabs.length>0,'fixture must actually exercise newly presented prefab effects');
 assert.equal(JSON.stringify(Replay.digest(session.battle)),JSON.stringify(record.expected));
 assert.ok(session.battle.units.every(u=>!u.modernActions?.timers.some(t=>t.type==='ActionPlayEffect')));
 // Seeking creates another battle. Presentation ownership cannot leak between
 // the first playback and the reset, even when entity ids repeat.
 session.seek(record.duration);
 assert.equal(session.error,null);
 assert.equal(JSON.stringify(Replay.digest(session.battle)),JSON.stringify(record.expected));
});
