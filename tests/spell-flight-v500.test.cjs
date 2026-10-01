'use strict';
const test=require('node:test'),A=require('node:assert/strict'),F=require('../src/spell-flight');
const rocket={id:3,name:'Rocket',born:0,startX:240,startY:580,x:240,y:380,vx:0,vy:-1,speed:5,travel:10,launchDistance:20,launchHeight:52,gravity:50};
test('Rocket body points along its visible arc on diagonal and horizontal casts from either side',()=>{
 const N=require('../src/native'),K=require('../src/core'),previous=global.RoyaleCore;global.RoyaleCore=K;
 try{const lib=new N.Library(require('../assets/native/data.json'));lib.ready=true;let rotation=0,scale=0,drawn;
  lib.scenes.effects={id:n=>n==='projectile_rocket'?1:undefined,clip:()=>({frames:Array(60)}),draw(c,n,t,o){drawn={rotation,scale,frame:o.frame};}};
  const c={save(){},restore(){},translate(){},rotate(v){rotation=v;},scale(v){scale=v;},globalAlpha:1};
  for(const sign of [-1,1])for(const vy of [0,.5])for(const travel of [1,10,19]){const p={...rocket,name:'RocketSpell',vx:sign*Math.sqrt(1-vy*vy),vy:sign*vy,travel};lib.drawProjectile(c,p,travel/5,{getEntity:()=>null});const pose=N.projectilePose(p),sourceAxis=drawn.frame>=6&&drawn.frame<=35?Math.PI/2:-Math.PI/2;A.ok(Math.abs(drawn.rotation+sourceAxis-pose.angle)<1e-8,'nose must lead the visible motion');A.ok(drawn.scale>=1.1&&drawn.scale<=1.3,'body should match the reference field ratio');A.ok(drawn.frame>=0&&drawn.frame<60);}
 }finally{global.RoyaleCore=previous;}
});
test('level Rocket flight selects the horizontal barrel atlas pose, and pitch retains its source axis',()=>{
 const N=require('../src/native');A.deepEqual(N.rocketAtlasPose({pitch:0,angle:-Math.PI/2}),{frame:45,rotation:0});A.equal(N.rocketAtlasPose({pitch:-Math.PI/6,angle:0}).frame,50);
 A.deepEqual(N.rocketAtlasPose({pitch:0,angle:Math.PI/2,groundAngle:Math.PI/2}),{frame:15,rotation:0});A.equal(N.rocketAtlasPose({pitch:-Math.PI/6,angle:Math.PI/2,groundAngle:Math.PI/2}).frame,10);
 const down=N.rocketAtlasPose({pitch:Math.PI*.5,angle:Math.PI/2});A.equal(down.frame,30);A.equal(down.rotation,0);
});
test('exhaust puffs stay at their original curved-flight birth position',()=>{
 const early=F.trailSamples(rocket,2).find(p=>Math.abs(p.born-1.5)<1e-8),late=F.trailSamples({...rocket,x:240,y:360,travel:11},2.2).find(p=>Math.abs(p.born-1.5)<1e-8);
 A.ok(early&&late);A.equal(early.x,late.x);A.equal(early.y,late.y);A.notEqual(early.age,late.age);
});
test('Rocket exhaust is bounded, includes smoke and fire, and ends behind the body',()=>{
 const puffs=F.trailSamples(rocket,2);A.ok(puffs.length>12&&puffs.length<=48);A.ok(puffs.every(p=>p.born<2&&p.alpha>=0&&p.alpha<=1));A.ok(puffs.some(p=>p.smoke));A.ok(puffs.some(p=>p.fire));
});
test('impact clears its smoke promptly and expands particles across the damage footprint',()=>{
 const p=F.impactSamples('Fireball_explosion',.35,50,'cast');A.ok(p.length>5&&p.length<=24);A.ok(p.some(p=>Math.hypot(p.x,p.y)>25));A.deepEqual(F.impactSamples('Fireball_explosion',1.8,50,'cast'),[]);A.deepEqual(F.impactSamples('Fireball_explosion',.35,50,'cast'),p);
});
test('spell silhouettes retain calibrated sizes while troop missiles retain their existing scale',()=>{
 const N=require('../src/native'),data=require('../assets/native/data.json');for(const name of ['FireballSpell','SnowballSpell','GoblinBarrelSpell','LogProjectileRolling','BarbLogProjectileRolling'])A.ok(N.projectileArtScale(name,data.projectiles[name])>=.9,name);A.equal(N.projectileArtScale('MusketeerProjectile',{scale:1}),.65);
 A.equal(N.projectileArtScale('LogProjectile'),N.projectileArtScale('LogProjectileRolling'));A.equal(N.projectileArtScale('BarbLogProjectile'),N.projectileArtScale('BarbLogProjectileRolling'));
});
test('embedded Arrows render below troops for their full life and configured afterimages stay visible',()=>{
 const FX=require('../src/fx'),r=new FX.Renderer({effects:{},emitters:{}},{scenes:{}}),hits=[],sprites=[],e={born:0,flightDuration:1,ttl:2.9,count:10,radius:80,x:220,y:270,team:0,fxId:73};r.effect=(...a)=>hits.push(a);r.sprite=(...a)=>{sprites.push(a);return true;};
 r.arrows({},e,1.8,'above');A.equal(hits.length,0);r.arrows({},e,1.8,'ground');A.equal(hits.length,10);A.ok(hits.every(a=>a[6].phase==='all'&&a[6].life===1.9));hits.length=0;r.arrows({},e,3.1,'ground');A.equal(hits.length,0);
 const previous=global.RoyaleGraphics;global.RoyaleGraphics={current:{particles:'max'}};try{r.arrows({},e,.6,'above');A.equal(sprites.length,90);A.ok(sprites.every(s=>s[9]>0));}finally{global.RoyaleGraphics=previous;}
});
