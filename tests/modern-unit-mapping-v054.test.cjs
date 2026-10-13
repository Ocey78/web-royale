'use strict';
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const file=path.join(__dirname,'../tools/repair-modern-unit-art.cjs'),tool=fs.existsSync(file)?require(file):{};
test('missing evolved and hero actors use their declared source sprite prefixes and exact scales',()=>{
 a.equal(typeof tool.mappings,'function');
 const game=require('../assets/game/data.json'),native={scenes:{chr_electro_giant_dl:{},chr_electro_wizard:{},modernfx_chr_skeleton_evolution:{}}},map=tool.mappings(game,native);
 a.equal(map.Skeleton_EV1.scene,'modernfx_chr_skeleton_evolution');a.equal(map.Skeleton_EV1.scale,.4);a.deepEqual(map.Skeleton_EV1.prefix,['evoskeleton1','evoskeleton1']);
 a.equal(map.ElectroGiant_EV1.scale,.9);a.deepEqual(map.ElectroGiant_EV1.prefix,['electrogiant','electrogiant_enemy']);a.equal(map.ElectroWizardHero.scale,1);a.equal(map.ElectroWizardHero.walkTweak,-26);
});
