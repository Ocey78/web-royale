'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),M=require('../src/modern-3d.js'),manifest=require('../assets/modern-heroes/manifest.json');
function pose(id,state,time,entity={}){const actor={contract:manifest.heroes[id]},metadata=actor.contract.parts[0];return M.choosePartPose({metadata},state,time,{entity},actor);}
test('hero ability state selects its authored ability instead of idle',()=>{
 assert.equal(typeof M.choosePartPose,'function');
 assert.equal(pose('BalloonHero','ability',0).name,'Custom1');
 assert.equal(pose('DarkPrinceHero','ability',0,{shield:100}).name,'Skill_Shield');
 assert.equal(pose('DarkPrinceHero','ability',0,{shield:0}).name,'Skill_NoShield');
 assert.equal(pose('IceWizardHeroFloatingCube','ability',0,{modernCustomStateNumber:2}).name,'Custom2');
});
test('hero ASM samples source speed and trimmed ranges rather than the entire clip',()=>{
 assert.equal(typeof M.choosePartPose,'function');
 assert.equal(pose('BarbLogBarbarianHero','ability',0).frame,10);
 assert.equal(pose('BarbLogBarbarianHero','ability',.1).frame,14);
 assert.equal(pose('BarbLogBarbarianHero','ability',5).frame,21);
 assert.equal(pose('MusketeerTurret','idle',1).frame,0);
 const p=pose('BowlerHero','run',.5,{air:true});assert.equal(p.frame,Math.floor(.5*.8*manifest.heroes.BowlerHero.parts[0].animations.Walk.fps+1e-7));
});
test('source attack release synchronization respects the authored speed after release',()=>{
 assert.equal(typeof M.choosePartPose,'function');
 const part=manifest.heroes.Ronin.parts[0],state=part.asm.States.find(s=>s.Name==='Attack_01'),clip=part.animations.Attack_01,marker=clip.markers.find(m=>m.Name==='action_frame').Frame;
 const p=pose('Ronin','attack',.1,{visualAttack:{sequence:0,windup:0,releasedAt:0}});
 assert.equal(p.frame,Math.floor(marker+.1*clip.fps*state.BaseSpeed+1e-7));
});
test('source geometry hide events follow their authored frame interval and shield selector',()=>{
 assert.equal(typeof M.meshVisibility,'function');
 const p=manifest.heroes.BalloonHero.parts[0];
 assert.equal(M.meshVisibility(p,'Attack',21).weapon_lod1,undefined);
 assert.equal(M.meshVisibility(p,'Attack',22).weapon_lod1,false);
 assert.equal(M.meshVisibility(p,'Attack',40).weapon_lod1,false);
 assert.equal(M.meshVisibility(p,'Attack',41).weapon_lod1,undefined);
 assert.equal(M.meshVisibility(manifest.heroes.DarkPrinceHero.parts[0],'Idle_NoShield',0).Weapon2_LOD1,false);
});


const N=require('../src/native.js');
test('a pending native texture cannot report that an absent hero raster was drawn',()=>{
 const old=globalThis.RoyaleModern3D,requested=[];globalThis.RoyaleModern3D={has:id=>id==='KnightHero',draw:(...args)=>{requested.push(args[1]);return false;}};
 try {
  const name='knight_idle1_1',sc=new N.Scene({exports:{[name]:1},clips:{1:{fps:30,frames:[[[2,65535,65535,0]]]}},shapes:{2:[{texture:0,xy:[[0,0],[1,0],[1,1]],uv:[[0,0],[1,0],[1,1]]}]},textures:[{file:'hero-page'}]},[]).configureLazy(()=>new Promise(()=>{}),new N.DecodedArtCache());
  const lib=new N.Library({arenas:[{id:'test'}],units:{KnightHero:{scene:'hero',prefix:['knight','knight_enemy'],scale:1}}},{});lib.scenes.hero=sc;
  const ctx=new Proxy({},{get:()=>()=>{}});
  assert.equal(lib.unit(ctx,'KnightHero',0,0,0,0),false,'both pending presentations must return unavailable');
  assert.deepEqual(requested,['KnightHero'],'3D request is scheduled regardless of native page readiness');
  assert.equal(sc.lazyPending.size,1,'the native fallback page is also requested');
 }finally {globalThis.RoyaleModern3D=old;}
});

test('source hero FX plan resolves team prefabs and marker-timed particle events',()=>{
 assert.equal(typeof M.sourceFXPlan,'function');
 const assets=manifest.vfxAssets,contract=manifest.heroes.MusketeerTurret,p=pose('MusketeerTurret','attack',.2,{visualAttack:{windup:0,releasedAt:0}});
 const plan=M.sourceFXPlan(contract,[p],assets,.2,0);
 assert.ok(plan.some(x=>/muzzle_impact/.test(x.particle)),'native turret muzzle particles are active after their ASM event marker');
 assert.equal(M.sourceFXPlan(contract,[{...p,frame:0}],assets,0,0).length,0,'events cannot run before their source frame');
});
test('original particle births and curves are deterministic, bounded and expire',()=>{
 assert.equal(typeof M.sourceParticleSamples,'function');
 const assets=manifest.vfxAssets,record=assets['sc3d/characters/hero/hero_musketeer/effect/particles/ps_musketeer_hero_muzzle_impact'];
 const a=M.sourceParticleSamples(record,.05,'troop:4',1),b=M.sourceParticleSamples(record,.05,'troop:4',1);
 assert.deepEqual(a,b);assert.equal(a.length,1);assert.ok(a[0].scale>0);assert.equal(a[0].alpha,1);assert.equal(M.sourceParticleSamples(record,.2,'troop:4').length,0);assert.equal(M.sourceParticleSamples(record,.05,'troop:4',0).length,0);
 assert.ok(Math.abs(M.sourceCurve([.333333,.333333,.666667,.666667,0,10],.5)-5)<1e-5);
});


test('source attack particles finish after the actor returns to idle without touching battle state',()=>{
 assert.equal(typeof M.FXHistory,'function');const history=new M.FXHistory({maxEffects:2}),effect={eventKey:'Attack:13',age:0,particle:'muzzle',component:{}};
 let active=history.update(7,'attack:1',1,[effect],()=>.3);assert.equal(active.length,1);
 active=history.update(7,'idle',1.1,[],()=>.3);assert.equal(active.length,1);assert.ok(Math.abs(active[0].age-.1)<1e-8);
 assert.equal(history.update(7,'idle',1.31,[],()=>.3).length,0);
 history.update(7,'attack:2',2,[effect],()=>.3);assert.equal(history.update(7,'attack:2',2.1,[{...effect,age:.1}],()=>.3).length,1,'sampling the same event cannot respawn its burst');
 history.update(8,'attack',2,[effect],()=>.3);history.update(9,'attack',2,[effect],()=>.3);assert.equal(history.size,2,'particle history is bounded across actors');
 history.clear();assert.equal(history.size,0);
});

test('a rewound presentation clock discards future particle births',()=>{
 const history=new M.FXHistory(),effect={eventKey:'Attack:13',age:0,particle:'muzzle',component:{}};
 history.update(7,'attack',1,[effect],()=>.5);
 assert.equal(history.update(7,'idle',.9,[],()=>.5).length,0,'seeking backwards cannot retain a future burst');
});
