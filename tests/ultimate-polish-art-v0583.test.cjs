'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.join(__dirname,'..'),U=require('../src/ultimate-clash'),manifest=require('../assets/ultimate-clash/cards.json');
const oldSpellHashes={
 'lightning-storm':'7a20202b34a25107baf778df2086332be6f7397ad33cf35e221ab45e5b264a4b',
 harvest:'176025ede6be63c8c9b7c4bd8bb4add9b45948a1796c81192c8d43040d1f4d28',
 'royale-recall':'548446c506ba19db4e03b9f6b9c8e94e861249ee1de1edf4da51892bfb85a1d5',
 'dark-pact':'78c8681a41da120df51596e50e63dff4606bacf28edd29e3ae9dcd0dd7ee2ecf',
 'elixir-spell':'f06d5151a101bc7f2a67a903959cbae47cade2e625097b2843d789f25c65b68e'
};
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function portrait(entry){
 assert.ok(entry,'portrait manifest entry exists');
 const bytes=fs.readFileSync(path.join(root,entry.file));
 assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 assert.equal(bytes.readUInt32BE(16),474);assert.equal(bytes.readUInt32BE(20),602);
 assert.equal(entry.width,474);assert.equal(entry.height,602);assert.equal(sha(bytes),entry.sha256);
 assert.equal(entry.description,U.CARDS.find(c=>c.id===entry.id).artDescription);
 return bytes;
}
test('the five refreshed spells retain local original illustrations and reproducible provenance',()=>{
 for(const [slug,oldHash]of Object.entries(oldSpellHashes)){
  const entry=manifest.cards.find(c=>c.id==='ultimate-'+slug);portrait(entry);
  assert.notEqual(entry.sha256,oldHash,slug+' has replaced the old flat composition');
  assert.equal(entry.source,'Original illustration generated with the built-in imagegen tool');
  assert.equal(entry.sourceFiles.length,1);assert.match(entry.sourceFiles[0],/^assets\/ultimate-clash\/illustrations\//);
  const source=fs.readFileSync(path.join(root,entry.sourceFiles[0]));assert.equal(sha(source),entry.sourceSha256);
  assert.ok(source.readUInt32BE(16)>=474);assert.ok(source.readUInt32BE(20)>=602);
  assert.ok(entry.generationPrompt.length>300,'the exact production prompt is retained');
 }
});
test('Mirror and Bandit Squad have distinct portraits made from their actual native card identities',()=>{
 const mirror=manifest.cards.find(c=>c.id==='ultimate-mirror'),squad=manifest.cards.find(c=>c.id==='ultimate-bandit-squad');
 portrait(mirror);portrait(squad);
 assert.notEqual(mirror.sha256,squad.sha256);
 assert.deepEqual(mirror.sourceFiles,['assets/cards/mirror.png']);
 assert.deepEqual(squad.sourceFiles,['assets/cards/bandit.png','assets/cards/boss-bandit.png']);
 for(const entry of [mirror,squad])for(const file of entry.sourceFiles)assert.ok(fs.existsSync(path.join(root,file)));
 assert.equal(manifest.cards.length,32);assert.equal(new Set(manifest.cards.map(c=>c.id)).size,32);
});
