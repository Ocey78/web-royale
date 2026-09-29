'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const C=require('../src/core.js'),Cos=require('../src/cosmetics.js'),U=require('../src/menu-model.js');
const ids=['source-gold-rush','source-gem-rush','source-elixir-pump'];
const root=path.resolve(__dirname,'..');
test('three genuine source event variants are offered alongside Classic',()=>{
 assert.deepEqual(Cos.towerSkins.map(s=>s.id),['classic',...ids]);
 assert.equal(Cos.towerSkinAvailability.originalSkinCount,3);
 for(const id of ids){const skin=Cos.skin(id);assert.equal(skin.sourceKind,'original-event');assert.equal(skin.scene,'tower_skins');assert.equal(skin.cost,100);}
});
test('genuine skins can be purchased once, equipped, and preserved through a save reload',()=>{
 const now=1740000000000;
 for(const id of ids){
  const before=C.normalizeProfile({gems:1000}),r=U.purchaseTowerSkin(before,id,now,U.hourlyKey(now));
  assert.equal(r.ok,true,id);assert.equal(r.profile.gems,900);assert.equal(before.gems,1000);
  assert.equal(U.purchaseTowerSkin(r.profile,id,now,U.hourlyKey(now)).ok,false);
  const equip=U.selectTowerSkin(r.profile,id);assert.equal(equip.ok,true);
  const reload=C.normalizeProfile(JSON.parse(JSON.stringify(equip.profile)));
  assert.equal(reload.selectedTowerSkin,id);assert.ok(reload.ownedTowerSkins.includes(id));
  assert.equal(new C.Battle({profile:reload,ai:false}).towers.filter(t=>t.team===0).every(t=>t.skin===id),true);
 }
});
test('skin ownership, insufficient funds, stale offers, and retired recolor rejection remain enforced',()=>{
 const p=C.normalizeProfile({gems:99}),now=1740000000000;
 for(const id of ids){assert.equal(U.selectTowerSkin(p,id).ok,false);assert.equal(U.purchaseTowerSkin(p,id,now,U.hourlyKey(now)).ok,false);assert.equal(U.purchaseTowerSkin({...p,gems:1000},id,now,U.hourlyKey(now)-1).ok,false);}
 for(const id of Cos.retiredTowerSkins){assert.equal(U.purchaseTowerSkin({...p,gems:1000},id).ok,false);assert.equal(Cos.validSkin(id),false);}
 assert.equal(C.normalizeProfile({...p,selectedTowerSkin:ids[0]}).selectedTowerSkin,'classic');
});
test('skin mappings resolve both original team assemblies and their activation timelines',()=>{
 const scene=JSON.parse(fs.readFileSync(path.join(root,'assets/tower-skins/scene.json')));
 for(const id of ids){const skin=Cos.skin(id);for(const team of [0,1]){
  for(const name of [skin.exports.king[team],skin.exports.princessBase[team],skin.exports.princessTop?.[team]].filter(Boolean))assert.ok(scene.exports[name]!==undefined,name);
  const clip=scene.clips[scene.exports[skin.exports.king[team]]];assert.equal(clip.frames.length,98);
  assert.ok(clip.frameNames.some(names=>names.includes('king_dummy')),'source King attachment '+id);
 }}
});
test('skin scene has complete drawable dependencies and hash-verified original texture output',()=>{
 const scene=JSON.parse(fs.readFileSync(path.join(root,'assets/tower-skins/scene.json')));
 const evidence=JSON.parse(fs.readFileSync(path.join(root,'assets/tower-skins/provenance.json')));
 const check=(id,seen=new Set())=>{if(seen.has(id))return;seen.add(id);if(scene.shapes[id])return;const clip=scene.clips[id];assert.ok(clip,'missing drawable '+id);for(const frame of clip.frames)for(const item of frame)check(item[0],seen);};
 for(const id of Object.values(scene.exports))check(id);
 for(const texture of scene.textures){const file='assets/native/'+texture.file,bytes=fs.readFileSync(path.join(root,file));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),evidence.outputs[file]);}
 assert.equal(scene.source.file,'assets/sc/building_tower.sc');assert.match(scene.source.sha256,/^[a-f0-9]{64}$/);
 assert.equal(evidence.variants.length,3);
});
