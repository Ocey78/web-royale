'use strict';
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const policy=require('../tools/native-policy.cjs'),game=require('../src/game-data');
test('manual balance aliases reuse original native Goblin scenes and every animation',()=>{
 const file=path.join(__dirname,'../assets/native/data.json'),bytes=fs.readFileSync(file),native=JSON.parse(bytes);
 for(const [alias,source]of [['GoblinBarrelGoblin','Goblin'],['GoblinBarrelGoblinDummy','GoblinDummy']]){
  a.equal(game.manualEntityAliases?.[alias]?.sourceEntity,source);
  a.equal(game.manualEntityAliases[alias].kind,'manual-balance-specialization');
 }
 policy.apply(game,native);
 for(const [alias,source]of [['GoblinBarrelGoblin','Goblin'],['GoblinBarrelGoblinDummy','GoblinDummy']]){
  a.ok(native.units[alias]);a.deepEqual(native.units[alias],native.units[source]);
  a.equal(native.units[alias].scene,native.units[source].scene);
  a.deepEqual(native.units[alias].animations,native.units[source].animations);
  a.ok(native.scenes[native.units[alias].scene]);
 }
 a.deepEqual(fs.readFileSync(file),bytes,'authored native asset bytes remain unchanged');
});
