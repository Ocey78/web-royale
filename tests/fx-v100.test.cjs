'use strict';
const test=require('node:test'),a=require('node:assert/strict'),C=require('../src/core.js'),N=require('../src/native.js');
let FX={};try{FX=require('../src/fx.js')}catch(_){}
const source=require('../assets/game/fx-data.json');
test('source particle sampler exists and is deterministic without using combat RNG',()=>{
 a.equal(typeof FX.particleAt,'function');const r=source.emitters.Fireball_explosion_smoke[0];const x=FX.particleAt(r,42,0,.2);a.deepEqual(x,FX.particleAt(r,42,0,.2));a.notDeepEqual(x,FX.particleAt(r,43,0,.2));
});
test('source particle lifetime and fade end fully at expiry',()=>{
 a.equal(FX.particleAt({ParticleCount:1,ParticleMinLife:500,ParticleMaxLife:500},1,0,.6),null);
 const p=FX.particleAt({ParticleCount:1,ParticleMinLife:1000,ParticleMaxLife:1000,FadeOutDuration:400},1,0,.9);a.ok(p.alpha>0&&p.alpha<.3);
});
test('looping emitter particle budget is bounded even at huge times',()=>{
 const fake={ParticleCount:1000000,ParticleMinLife:1000,ParticleMaxLife:1000,ParticleMinInterval:1,ParticleMaxInterval:1};
 const samples=FX.emitterSamples(fake,12,999999,true);a.ok(samples.length<=FX.MAX_EMITTER_PARTICLES);a.ok(samples.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z)));
});
test('projectile arc rises then lands without changing gameplay position',()=>{
 const p={x:100,y:200,startX:100,startY:400,travel:5,launchDistance:10,launchHeight:0,gravity:50,speed:5};const before={...p};
 a.ok(N.projectilePosition(p).y<200);a.deepEqual(p,before);p.travel=10;a.equal(N.projectilePosition(p).y,200);
});
test('rolling log projectiles are on the ground not suspended at a troop muzzle',()=>{
 const b=new C.Battle({ai:false});b.cast(C.cardAt('the-log'),0,120,380);for(let i=0;i<31;i++)b.step(1/60);const p=b.projectiles.find(p=>p.name==='LogProjectileRolling');a.ok(p);a.equal(p.launchHeight,0);
});
test('projectile impact records the actual source hit effect rather than a generic blast',()=>{
 const b=new C.Battle({ai:false});for(const name of ['FireballSpell','RocketSpell','SnowballSpell','LighningSpell']){b.projectileImpact({name,team:0,x:200,y:250,level:9,vx:0,vy:-1},null);a.ok(b.effects.some(e=>e.sourceEffect===C.DATA.projectiles[name].HitEffect),name);}
});
test('arrows produce a separate visual volley for each damage wave',()=>{
 const b=new C.Battle({ai:false});b.cast(C.cardAt('arrows'),0,200,250);for(let i=0;i<30;i++)b.step(1/60);
 a.equal(b.effects.filter(e=>e.kind==='arrowsFly').length,3);a.equal(new Set(b.effects.filter(e=>e.kind==='arrowsFly').map(e=>Math.round(e.born*10))).size,3);
});
test('royal delivery retains its visual descent until the damage actually happens',()=>{
 const b=new C.Battle({ai:false});b.cast(C.cardAt('royal-delivery'),0,200,420);for(let i=0;i<150;i++)b.step(1/60);
 a.ok(b.effects.some(e=>e.sourceEffect==='Royale_Delivery_spawn'));a.ok(!b.units.some(u=>u.entity==='DeliveryRecruit'));
 for(let i=0;i<40;i++)b.step(1/60);a.ok(b.units.some(u=>u.entity==='DeliveryRecruit'));a.ok(b.effects.some(e=>e.sourceEffect==='royale_delivery_broken'));
});
test('effect event IDs do not consume the gameplay entity sequence',()=>{
 const b=new C.Battle({ai:false}),n=b.nextId;b.effect({kind:'spark',x:1,y:2,ttl:1});b.effect({kind:'spark',x:1,y:2,ttl:1});a.equal(b.nextId,n);a.notEqual(b.effects[0].fxId,b.effects[1].fxId);
});
test('source effect resolution chooses red variants and retains true layer and timing',()=>{
 const rows=FX.effectComponents(source,'Spell_poison_ground',1);a.ok(rows.some(r=>/red/.test(r.ExportName)));a.ok(rows.every(r=>r.Layer));
 const rows2=FX.effectComponents(source,'Fireball_explosion',0);a.ok(rows2.some(r=>r.Type==='ParticleEmitter'));a.ok(rows2.some(r=>r.Time===100));
});

test('non-looping source clips disappear at their own end rather than lingering for the event TTL',()=>{
 let calls=0;const scene={id:()=>1,duration:()=>.2,draw:()=>calls++},lib={scenes:{effects:scene}};
 const f=new FX.Renderer({effects:{OneShot:[{Type:'SWF',FileName:'sc/effects.sc',ExportName:'clip',Layer:'Object'}]},emitters:{}},lib);
 const c={save(){},restore(){},translate(){},rotate(){},scale(){},globalAlpha:1};
 f.effect(c,'OneShot',0,0,.1,0,{life:6});a.equal(calls,1);
 f.effect(c,'OneShot',0,0,.5,0,{life:6});a.equal(calls,1);
});

test('spawn, attack start and muzzle events use each entity original effect names',()=>{
 const b=new C.Battle({ai:false}),u=b.spawn('Musketeer',0,220,400,{wait:0}),t=b.spawn('Knight',1,220,350,{wait:0});
 a.ok(b.effects.some(e=>e.sourceEffect===u.def.source.SpawnEffect));
 b.startAttack(u,t);a.ok(b.effects.some(e=>e.sourceEffect===u.def.source.AttackStartEffect));
 b.strike(u,t);a.ok(b.effects.some(e=>e.sourceEffect===u.def.source.ProjectileEffect));
});
test('Tesla and Electro Wizard use their original targeted hit beam exports',()=>{
 for(const entity of ['Tesla','ElectroWizard']){const b=new C.Battle({ai:false}),u=b.spawn(entity,0,200,400,{wait:0}),t=b.spawn('Knight',1,200,360,{wait:0});b.strike(u,t);a.ok(b.effects.some(e=>e.sourceBeam===u.def.source.TargetedHitEffect&&e.target===t.id),entity);}
});
