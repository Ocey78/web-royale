'use strict';
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const manifest=require('../assets/ui/manifest.json');
test('available evolution and champion portraits retain their original form-specific source exports',()=>{
 for(const [id,source] of [['Knight_EV1','sc/ui_spells.sc#knight_evolution_card'],['Pekka_EV1','sc/ui_spells.sc#Pekka_evolution_card'],['ArcherQueen_champion','sc/ui_spells.sc#archerqueen'],['BossBandit_champion','sc/ui_card_boss_bandit.sc#bossbandit_card'],['Knight_hero','sc/ui_card_knight_hero.sc#knight_hero_card'],['Witch_EV1','sc/ui_card_witch_evolution.sc#witch_evolution_card']]){const key='modern-form-'+id,entry=manifest[key];a.ok(entry,`${key} must use form art`);a.equal(entry.source,source);const bytes=fs.readFileSync(path.join(__dirname,'..',entry.file));a.equal(crypto.createHash('sha256').update(bytes).digest('hex'),entry.sha256);a.equal(bytes.toString('hex',0,8),'89504e470d0a1a0a');a.ok(bytes.readUInt32BE(16)>100&&bytes.readUInt32BE(20)>100);a.match(entry.sourceSha256,/^[a-f0-9]{64}$/);}
});
