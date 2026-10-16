'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../src/core'),R=require('../src/replay');

test('all Ultimate modes prepare the same cached native Builder scene',async()=>{
 const Native=require('../src/native'),scene={builder:true};
 for(const mode of ['UltimateClash','UltimateClash2v2','UltimateClash3v3']){
  const b=new C.Battle({mode,ai:false});
  const renderer=Object.create(Native.Library.prototype);renderer.ultimateBuilder=scene;
  assert.equal(await renderer.prepareUltimateAssets(b),scene);
 }
});

test('the released 0.58.0 normal replay still plays after Ultimate price changes',()=>{
 const record=require('./fixtures/v058/normal-replay.json');
 assert.doesNotThrow(()=>R.validate(record));
 const s=new R.Session(record);s.seek(record.duration);
 assert.equal(s.error,null);assert.deepEqual(R.digest(s.battle),record.expected);
});

for(const [mode,seats]of [['UltimateClash2v2',4],['UltimateClash3v3',6]]){
 test(mode+' records and seeks every seat with custom state intact',()=>{
  const deck=['ultimate-fisherman',...C.ULTIMATE_CARDS.map(c=>c.id).filter(id=>id!=='ultimate-fisherman').slice(0,7)];
  const b=new C.Battle({mode,ai:false,seed:58122,deck,enemyDeck:deck,decks:Array.from({length:seats},()=>deck)});
  assert.equal(b.mode,mode);assert.equal(b.seatCount,seats);R.captureInitial(b);
  for(let seat=0;seat<seats;seat++)assert.equal(b.deploy(seat,0,120+(seat>>1)*100,seat%2?220:420).ok,true);
  for(let frame=0;frame<360;frame++)b.step(1/60);
  const record=R.pack(b);assert.ok(record.initial.ultimateFingerprint);assert.ok(record.expected.ultimate);
  assert.equal(new Set(record.commands.map(c=>c.seat)).size,seats);
  const s=new R.Session(record);s.seek(record.duration);assert.equal(s.error,null);assert.deepEqual(R.digest(s.battle),record.expected);
  s.seek(2);s.seek(record.duration);assert.equal(s.error,null);assert.deepEqual(R.digest(s.battle),record.expected);
  const wrong=structuredClone(record);wrong.initial.mode='UltimateClash';assert.throws(()=>R.validate(wrong));
  const changed=structuredClone(record);changed.initial.ultimateFingerprint='wrong';assert.throws(()=>R.validate(changed),/Ultimate Clash.*differs/);
 });
}

test('3v3 Ultimate replays accept the full 11-minute match and reject malformed ownership',()=>{
 const b=new C.Battle({mode:'UltimateClash3v3',ai:false});assert.equal(b.seatCount,6);R.captureInitial(b);
 const record=R.pack(b);record.duration=660;assert.doesNotThrow(()=>R.validate(record));
 record.duration=721;assert.throws(()=>R.validate(record),/Invalid replay/);
 record.duration=660;record.initial.seatSlots=[0,0,0,1,2,2];assert.throws(()=>R.validate(record),/Invalid slot ownership/);
});
