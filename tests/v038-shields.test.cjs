'use strict';
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),C=require('../src/core.js');const data=require('../assets/presentation/data.json');
async function harness(){const calls=[],hud={clip:()=>({frames:[[]]}),drawStill:(c,name,opts)=>calls.push({name,opts})};const root={RoyaleText:{load:async()=>{},summary:()=>({}),draw(){}},RoyaleNative:{Scene:function(){return hud;},towerArtPosition:u=>u,entityElevation:()=>0,library:{headHeight:()=>20}},RoyaleLevelLabels:require('../src/level-labels.js')};root.globalThis=root;vm.runInNewContext(fs.readFileSync(require.resolve('../src/presentation.js'),'utf8'),root);await root.RoyalePresentation.load({text:{},hud:{textures:[]},filters:{textures:[]},healthBars:data.healthBars});return{P:root.RoyalePresentation,calls,c:{save(){},restore(){},translate(){},scale(){}}};}
for(const entity of ['DarkPrince','SkeletonWarrior','Recruit'])for(const team of [0,1])test('v038 '+entity+' team '+team+' shield badge exactly tracks live shield, including group labels',async()=>{
 a.ok(C.DATA.entities[entity]);const{P,calls,c}=await harness(),b=new C.Battle({ai:false,headless:true}),u=b.spawn(entity,team,9*C.SX,20*C.SY,{wait:0});a.ok(u.shield>0);
 P.health(c,u);a.match(calls.at(-1).name,/^hp_shield_/,'full shield must display a shield');P.level(c,u);a.match(calls.at(-1).name,/^hp_shield_/,'intact group level must display a shield');
 b.damage(u,Math.max(1,u.shield/2));P.health(c,u);a.match(calls.at(-1).name,/^hp_shield_/,'partly damaged shield remains visible');
 b.damage(u,u.shield);P.health(c,u);a.doesNotMatch(calls.at(-1).name,/shield/,'broken shield must disappear');P.level(c,u);a.doesNotMatch(calls.at(-1).name,/shield/);
 b.damage(u,1);P.health(c,u);a.doesNotMatch(calls.at(-1).name,/shield/,'HP damage must not restore shield icon');
});
