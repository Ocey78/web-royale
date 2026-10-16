'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../src/core'),R=require('../src/replay'),Forms=require('../src/card-forms');

function ultimate(options={}){const b=new C.Battle({mode:'UltimateClash',ai:false,seed:58071,...options});assert.equal(b.mode,'UltimateClash');return b;}

test('Ultimate replay records a separate custom rules fingerprint',()=>{
 const b=ultimate();R.captureInitial(b);const record=R.pack(b);
 assert.equal(typeof record.initial.ultimateFingerprint,'string');
 assert.ok(record.initial.ultimateFingerprint.length>8);
 assert.doesNotThrow(()=>R.validate(record));
 record.initial.ultimateFingerprint='changed-custom-card-rules';
 assert.throws(()=>R.validate(record),/Ultimate Clash.*differs/i);
});

test('Ultimate replay rejects missing custom rules metadata',()=>{
 const b=ultimate();R.captureInitial(b);const record=R.pack(b);
 delete record.initial.ultimateFingerprint;
 assert.throws(()=>R.validate(record),/Ultimate Clash.*differs/i);
});

test('Ultimate replay rejects changed custom projectile damage',()=>{
 const b=ultimate();R.captureInitial(b);const record=R.pack(b);
 const projectile=C.DATA.projectiles.UltimateElixirWitchProjectile;
 assert.ok(projectile);const damage=projectile.Damage;
 try{projectile.Damage=999999;assert.throws(()=>R.validate(record),/Ultimate Clash.*differs/i);}
 finally{projectile.Damage=damage;}
});

test('normal replay accepts the existing base-only form fingerprint after new mode is installed',()=>{
 const b=new C.Battle({ai:false});R.captureInitial(b);const record=R.pack(b);
 record.initial.formRegistryFingerprint=Forms.createRegistry({forms:C.DATA.forms||[],loadouts:C.DATA.loadouts||{}}).fingerprint;
 assert.doesNotThrow(()=>R.validate(record));
});

test('replay validation rejects cross-mode custom card injection',()=>{
 const b=ultimate();R.captureInitial(b);const record=R.pack(b);record.initial.mode='Default';
 assert.throws(()=>R.validate(record),/Prohibited replay deck/);
});

test('Ultimate replay digest detects changed attachment and area state',()=>{
 const b=ultimate(),u=b.makeEntity('Knight',0,240,440,{owner:0,wait:0});b.units.push(u);
 u.ultimate={builders:1};b.areas.push({id:999,ultimate:{type:'harvest',next:3}});
 const before=R.digest(b);u.ultimate.builders=2;b.areas[0].ultimate.next=4;
 assert.notDeepEqual(R.digest(b),before);
});

test('Ultimate match replay reproduces spell waves and remains deterministic after seeking',()=>{
 const cards=C.cardsForMode?.('UltimateClash')||[];
 const deck=['ultimate-meteor-shower',...cards.map(c=>c.id).filter(id=>id!=='ultimate-meteor-shower').slice(0,7)];
 const b=ultimate({deck,enemyDeck:deck});R.captureInitial(b);
 assert.equal(b.deploy(0,0,240,160).ok,true);
 for(let i=0;i<480;i++)b.step(1/60);
 const record=R.pack(b),s=new R.Session(record);s.seek(record.duration);
 assert.equal(s.error,null);assert.deepEqual(R.digest(s.battle),record.expected);
 s.seek(2);s.seek(record.duration);assert.equal(s.error,null);assert.deepEqual(R.digest(s.battle),record.expected);
});
