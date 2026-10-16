'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../src/core'),T=require('../src/tower-troops'),metadata=require('../assets/presentation/data.json');

test('evolved Princess defenders retain the Princess Tower health display metadata',()=>{
 const base=C.entityDef('PrincessTower',11).source;
 for(const selected of T.catalog){const b=new C.Battle({mode:'UltimateClash',queue:'challenge',seatTowerTroops:[selected.id,selected.id],ai:false});
 for(const tower of b.towers.filter(t=>!t.king)){
  for(const key of ['HealthBar','HideHealthbar','HealthBarOffsetY','HealthBarOffsetYBlue','HealthBarOffsetYRed','ShowHealthNumber','OnStartingClientActions'])assert.deepEqual(tower.def.source[key],base[key],key+' on team '+tower.team);
  assert.equal(tower.def.source.AttachedCharacter,'Princess_EV1');
  assert.equal(tower.maxHp,C.entityDef('PrincessTower',tower.level).hp*8);
 }}
});

test('Ultimate Princess Towers draw the normal tower HP frame, number and level on both teams',async()=>{
 const calls=[],labels=[],hud={clip:()=>({frames:[[]]}),drawStill:(c,name,opts)=>calls.push({name,opts})};
 const root={RoyaleText:{load:async()=>{},summary:()=>({}),draw:(...args)=>labels.push(args.slice(1))},RoyaleNative:{Scene:function(){return hud;},towerArtPosition:u=>u}};root.globalThis=root;
 vm.runInNewContext(fs.readFileSync(require.resolve('../src/presentation'),'utf8'),root);
 await root.RoyalePresentation.load({text:{},hud:{textures:[]},filters:{textures:[]},healthBars:metadata.healthBars});
 const ctx={save(){},restore(){},translate(){},scale(){}},normal=new C.Battle({queue:'challenge',ai:false});
 for(const selected of T.catalog){const ultimate=new C.Battle({mode:'UltimateClash',queue:'challenge',seatTowerTroops:[selected.id,selected.id],ai:false});
 for(const team of [0,1])for(const fraction of [1,.5]){
  const ordinary=normal.towers.find(t=>!t.king&&t.team===team),tower=ultimate.towers.find(t=>!t.king&&t.team===team);ordinary.hp=ordinary.maxHp*fraction;tower.hp=tower.maxHp*fraction;
  calls.length=labels.length=0;root.RoyalePresentation.health(ctx,ordinary);const expectedName=calls[0].name,expectedLabels=JSON.stringify(labels);
  calls.length=labels.length=0;root.RoyalePresentation.health(ctx,tower);
  assert.equal(calls[0].name,expectedName);assert.match(calls[0].name,/tower/);
  assert.equal(calls[0].opts.texts['hpNumber.txt'],String(Math.ceil(tower.hp)));
  assert.equal(JSON.stringify(labels),expectedLabels,'normal level badge retained');
 }}
});
