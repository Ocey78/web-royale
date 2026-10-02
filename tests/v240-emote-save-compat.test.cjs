const test=require('node:test'),A=require('node:assert/strict');
const P=require('../src/profile.js'),Cos=require('../src/cosmetics.js');
test('source-derived emote identifiers survive separator or prefix differences',()=>{
 const e=Cos.emotes.find(e=>e.scene==='emotes_PEKKA_boombox_dl'),old='native:'+e.scene+':'+e.animation;
 const p=P.normalizeProfile({ownedEmotes:[old],equippedEmotes:[old],clan:{messages:[{kind:'emote',emote:old}]}});
 A.ok(p.ownedEmotes.includes(e.id));A.deepEqual(p.equippedEmotes,[e.id]);A.equal(p.clan.messages[0].emote,e.id);
});
test('unrecognized imported emote ownership remains archived, without granting a substitute',()=>{
 const p=P.normalizeProfile({ownedEmotes:['archive_emote_not_yet_mapped'],equippedEmotes:['archive_emote_not_yet_mapped']});
 A.deepEqual(p.unresolvedEmotes,{owned:['archive_emote_not_yet_mapped'],equipped:['archive_emote_not_yet_mapped']});
 A.equal(p.ownedEmotes.length,4);A.deepEqual(P.normalizeProfile(JSON.parse(JSON.stringify(p))).unresolvedEmotes,p.unresolvedEmotes);
});
test('equipped aliases still require owned originals and invalid values are ignored',()=>{
 const e=Cos.emotes.find(e=>e.scene==='emotes_PEKKA_boombox_dl'),old=e.scene+':'+e.animation;
 const p=P.normalizeProfile({ownedEmotes:[null,{},'__proto__','<script>'],equippedEmotes:[old]});
 A.equal(p.ownedEmotes.length,4);A.deepEqual(p.equippedEmotes,[]);
});
