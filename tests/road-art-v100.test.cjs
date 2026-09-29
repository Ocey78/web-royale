'use strict';
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),R=require('../src/progression.js');
test('every non-choice road reward maps to an original game icon, not a question-mark placeholder',()=>{
 a.equal(typeof R.rewardIcon,'function');const m=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/ui/manifest.json'),'utf8'));
 for(const r of R.ROAD_REWARDS){if(r.kind==='choice')continue;const key=R.rewardIcon(r);a.ok(m[key],`${r.id}: ${key}`);a.ok(m[key].source,`${key} missing original provenance`);}
});
test('tokens and wild cards use their own rarity-specific graphics',()=>{for(const rarity of ['Common','Rare','Epic','Legendary']){a.equal(R.rewardIcon({kind:'tokens',rarity}),'road-token-'+rarity.toLowerCase());a.equal(R.rewardIcon({kind:'wildcards',rarity}),'road-wild-'+rarity.toLowerCase());}});
