'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const N=require('../src/native.js'),C=require('../src/core.js'),Cos=require('../src/cosmetics.js');
const data=require('../assets/native/data.json'),skinScene=require('../assets/tower-skins/scene.json');
globalThis.RoyaleCosmetics=Cos;
const context={save(){},restore(){},translate(){},scale(){},filter:'none'};
function library(includeSkin=true){const lib=new N.Library({...data,scenes:{...data.scenes,tower_skins:skinScene}},{}),calls=[];lib.ready=true;
 for(const [key,definition]of Object.entries({building_tower:data.scenes.building_tower,chr_king:data.scenes.chr_king,chr_princess:data.scenes.chr_princess,...(includeSkin?{tower_skins:skinScene}:{})})){
  const sc=new N.Scene(definition,[]);sc.draw=(c,name,time,options)=>{calls.push({scene:key,name,time,options});return true;};lib.scenes[key]=sc;
 }return{lib,calls};
}
for(const id of ['source-gold-rush','source-gem-rush','source-elixir-pump'])test(id+' renders both source tower assemblies and retains King/Princess attachment order',()=>{
 const {lib,calls}=library(),skin=Cos.skin(id);
 for(const team of [0,1]){
  calls.length=0;lib.drawTower(context,{skin:id,team,king:true,x:100,y:100,hp:100,active:true},1);
  assert.equal(calls[0].scene,'tower_skins');assert.equal(calls[0].name,skin.exports.king[team]);assert.equal(calls[0].options.frame,97);
  assert.ok(Object.keys(calls[0].options.replaceNodes).length>0,'source king_dummy replacement retained');
  calls.length=0;lib.drawTower(context,{skin:id,team,king:false,x:100,y:100,hp:100},1);
  assert.equal(calls[0].name,skin.exports.princessBase[team]);assert.equal(calls[1].scene,'chr_princess');
  if(skin.exports.princessTop)assert.equal(calls[2].name,skin.exports.princessTop[team]);else assert.equal(calls.length,2);
 }
});
test('absent skin scene falls back to unchanged Classic and ruins always use source destroyed artwork',()=>{
 const {lib,calls}=library(false);lib.drawTower(context,{skin:'source-gold-rush',team:0,king:false,x:100,y:100,hp:100},1);
 assert.equal(calls[0].name,'StarTower_base_blue');assert.equal(calls.at(-1).name,'StarTower_top_blue');
 const loaded=library();loaded.lib.drawTower(context,{skin:'source-gold-rush',team:0,king:true,x:100,y:100,hp:0},1);
 assert.equal(loaded.calls[0].scene,'building_tower');assert.equal(loaded.calls[0].name,'kingtower_destroyed');
});
test('battle preparation retains the selected skin scene for live towers',async()=>{
 const {lib}=library(),battle=new C.Battle({ai:false}),ensured=[],retained=[];
 battle.towers[0].skin='source-gold-rush';lib.ensureScenes=async names=>ensured.push(...names);lib.retainScenes=names=>retained.push(...names);
 await lib.prepareBattle(battle,C.DATA);assert.ok(ensured.includes('tower_skins'));assert.ok(retained.includes('tower_skins'));
});
test('Princess tower source action marker is aligned with the real release',()=>{
 const {lib,calls}=library(),b=new C.Battle({ai:false}),tower=b.towers.find(t=>!t.king),target=b.spawn('Giant',1-tower.team,tower.x,tower.y+50,{wait:0});
 tower.targetId=target.id;b.startAttack(tower,target);tower.animationTime=tower.def.firstHit;b.strike(tower,target);
 lib.drawTower(context,tower,b.time);const princess=calls.find(c=>c.scene==='chr_princess'),sc=lib.scenes.chr_princess,clip=sc.clip(princess.name);
 assert.equal(N.frameAt(princess.time,clip.fps,clip.frames.length,false),clip.labels.indexOf('action_frame'));
});
