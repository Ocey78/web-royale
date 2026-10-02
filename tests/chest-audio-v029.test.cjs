'use strict';
const {test}=require('node:test'),A=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),manifest=require('../assets/audio/manifest.json');
const cues={chestOpenWood:'wooden_chest_open_01.ogg',chestOpenSilver:'iron_chest_open_01.ogg',chestOpenGold:'gold_chest_open_01.ogg',chestOpenMagic:'magic_chest_open_01.ogg',chestOpenCrown:'star_chest_open_01.ogg',cardCommon:'get_card_comon_01.ogg',cardRare:'get_card_rare_01.ogg'};
test('original chest and reveal audio is present as non-silent PCM16 mono44100 WAV with source hashes',()=>{
 for(const [key,source]of Object.entries(cues)){
  const entry=manifest[key];A.ok(entry,key);A.equal(entry.source,'APK/assets/sfx/'+source);
  A.match(entry.file,/^assets\/audio\/[a-z-]+\.wav$/);A.match(entry.sourceSha256,/^[a-f0-9]{64}$/);
  const bytes=fs.readFileSync(path.join(root,entry.file));A.equal(crypto.createHash('sha256').update(bytes).digest('hex'),entry.sha256);
  A.equal(bytes.toString('ascii',0,4),'RIFF');A.equal(bytes.readUInt32LE(4),bytes.length-8);A.equal(bytes.toString('ascii',8,12),'WAVE');
  A.equal(bytes.toString('ascii',12,16),'fmt ');A.equal(bytes.readUInt16LE(20),1);A.equal(bytes.readUInt16LE(22),1);A.equal(bytes.readUInt32LE(24),44100);A.equal(bytes.readUInt16LE(34),16);
  A.equal(bytes.toString('ascii',36,40),'data');A.equal(bytes.readUInt32LE(40),bytes.length-44);A.ok(bytes.length>4410&&bytes.length<44100*2*20);
  let audible=false;for(let i=44;i<bytes.length;i+=2)if(Math.abs(bytes.readInt16LE(i))>100){audible=true;break;}A.ok(audible,key+' non-silent audio');
 }
});
test('all twelve earlier audio mappings remain available',()=>{
 for(const [key,file]of Object.entries({click:'click',select:'select',deploy:'deploy',start:'start',reward:'reward',win:'win',lose:'lose',draw:'draw',crown1:'crown-one',crown2:'crown-two',crown3:'crown-three',crownAppear:'crown-appear'}))A.equal(manifest[key].file,'assets/audio/'+file+'.wav');
});
