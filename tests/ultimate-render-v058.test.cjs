'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),N=require('../src/native'),C=require('../src/catalog'),data=require('../assets/native/data.json');
const context={};vm.runInNewContext(fs.readFileSync(require.resolve('../src/draw'),'utf8'),context);const D=context.RoyaleDraw;
test('Ultimate scene closure loads cloned actor art, composite armies, egg outcomes and evolved tower defender',()=>{
 const names=N.sceneDependencies(data,C.DATA,C.ULTIMATE_CARDS.map(c=>c.id),'training',[{AttachedCharacter:'Princess_EV1'}]);
 for(const id of ['GoblinCage','Tesla_EV1','WitchMother','PhoenixEgg','Fisherman','BabyDragon','BabyDragon_EV1','Knight','Prince','RoyalGiant','MovingCannon','IceWizard','ElectroWizard','Wizard','SkeletonWarrior','Princess_EV1']){const cfg=data.units[id];if(cfg)assert.ok(names.includes(cfg.scene),id+' art must be loaded before deployment');}
});
test('custom actor aliases resolve to original source scenes and overcharged Tesla never plays the lowering frames',()=>{
 for(const id of ['UltimateExecutionerCage','UltimateOverchargedTesla','UltimateElixirWitch','UltimateUnstableEgg','UltimateFisherman'])assert.ok(data.units[C.DATA.entities[id].NativeActor]);
 const clip={labels:['deploy','idle','appear_start','appear_end','hide_start','hide_end']};for(const hidden of [true,false])assert.equal(N.hidingClipPose(clip,{ultimate:{kind:'overcharged-tesla'},hidden}).frame,3);assert.equal(N.hidingClipPose(clip,{def:{source:{HidesWhenNotAttacking:true}},hidden:true}).frame,1);
});
test('the unstable egg reaches its source idle animation and never restarts its tiny birth frames',()=>{
 const clip=data.scenes.chr_phoenix_dl.clips[data.scenes.chr_phoenix_dl.exports.Egg_Phoenix_V2_Blue],u={born:0,ultimate:{kind:'unstable-egg'}};assert.equal(N.ultimateClipPose(clip,u,0).frame,0);for(const time of [1,2,3,4,5,6,100]){const frame=N.ultimateClipPose(clip,u,time).frame;assert.ok(frame>=22&&frame<=39);}
});
test('runtime Hero Frostbite dependency closure includes native Ice Spirits',()=>{
 require('../src/battle');const form=C.DATA.ultimateForms.find(f=>f.id==='ultimate-frostbite-hero'),names=N.sceneDependencies(data,C.DATA,['ultimate-frostbite'],'training',[form.source]);assert.ok(names.includes(data.units.IceSpirits.scene));
});
test('custom area style uses correct original floor art and separates Frostbite from Graveyard particles',()=>{
 assert.equal(D.ultimateAreaStyle({name:'UltimateHarvest'}).floor,'sauron_eye_ground');assert.match(D.ultimateAreaStyle({name:'UltimateMeteorShower'}).filter,/64deg/);assert.match(D.ultimateAreaStyle({name:'UltimateLightningStorm'}).filter,/grayscale/);assert.equal(D.ultimateAreaStyle({name:'UltimateFrostbite'}).source,'Freeze');assert.equal(D.ultimateAreaStyle({name:'UltimateHealSpell'}).scale,2);assert.equal(D.ultimateAreaStyle({name:'Freeze'}),null);
});
test('falling source projectiles respect schedule delays and land exactly at their impact position',()=>{
 const e={kind:'ultimate-falling-projectile',projectile:'FireballSpell',born:1,delay:1.5,duration:.5,impactAt:3,x:100,y:200,team:0};assert.equal(D.ultimateProjectilePose(e,2.4),null);assert.equal(D.ultimateProjectilePose(e,3),null);const p=D.ultimateProjectilePose(e,2.75),pos=N.projectilePosition(p);assert.equal(pos.x,140);assert.equal(pos.y,90);assert.equal(p.born,2.5);const final=D.ultimateProjectilePose(e,3-1e-7),end=N.projectilePosition(final);assert.ok(Math.abs(end.x-100)<.001);assert.ok(Math.abs(end.y-200)<.001);
});
