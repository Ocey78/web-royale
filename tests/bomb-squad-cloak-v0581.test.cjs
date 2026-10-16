'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../src/core'),F=require('../src/card-forms'),S=require('../src/form-state');

function drawBattle(b){
 const paint=[],stack=[],canvas=new Proxy({globalAlpha:1,save(){stack.push(this.globalAlpha);},restore(){this.globalAlpha=stack.pop();}},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
 const record=(phase,c,u)=>paint.push({phase,id:u.id,alpha:c.globalAlpha});
 const root={RoyaleCore:C,RoyaleNative:{renderPosition:u=>({x:u.x,y:u.y}),entityElevation:()=>0,library:{drawArena(){},drawTowerShadow(){},drawTower(){},drawProjectile:()=>true,drawEffect:()=>true,unit:(c,id,x,y,team,time,state,heading,started,scale,options)=>record('body',c,options.entity),fx:{begin(){},areas(){},events(){},movement(){},unitStates(){},trails(){}}}},RoyaleBattleView:{layout:{height:960},viewport:{x:0,y:0,width:540,height:800},camera:{x:0,y:0,scale:1}},RoyalePresentation:{shadow:(c,u)=>record('shadow',c,u),health:(c,u)=>record('health',c,u),deployment:(c,u)=>record('deployment',c,u)}};
 root.globalThis=root;vm.runInNewContext(fs.readFileSync(require.resolve('../src/draw'),'utf8'),root);root.RoyaleDraw.battle(canvas,b,b.time,null,null);
 return paint;
}

for(const team of [0,1])test('team '+team+' Bomb Squad uses the active Queen cloak, then becomes fully visible and targetable after guard death',()=>{
 const b=new C.Battle({mode:'UltimateClash',ai:false,headless:true,seed:581}),y=team?10:22;
 for(const t of b.towers)t.readyAt=1e9;
 b.cast(C.cardAt('ultimate-bomb-squad',11),team,9*C.SX,y*C.SY);
 const guard=b.units.find(u=>u.entity==='SkeletonWarrior'),bombers=b.units.filter(u=>u.entity==='Bomber');assert.equal(bombers.length,2);
 const form=F.defaultRegistry.get('ArcherQueen_champion'),card=F.defaultRegistry.resolve(C.cardAt(form.baseCardId,11),form.id),queen=b.spawn(card.entity,team,4*C.SX,y*C.SY,{owner:team,wait:0,level:11,formId:form.id,card});S.attach(b,queen,card);b.elixir[team]=20;assert.equal(b.activateAbility(team,queen.id).ok,true);
 const enemy=b.spawn('Knight',1-team,14*C.SX,y*C.SY,{wait:100});for(let i=0;i<5;i++)b.step(.05);assert.equal(queen.invisible,true);
 const cloaked=drawBattle(b);
 for(const phase of ['body','shadow','health','deployment']){
  const queenPaint=cloaked.find(p=>p.phase===phase&&p.id===queen.id);assert.ok(queenPaint,phase+' paints the cloaked Queen');assert.ok(queenPaint.alpha>0&&queenPaint.alpha<1);
  for(const bomber of bombers){const painted=cloaked.find(p=>p.phase===phase&&p.id===bomber.id);assert.ok(painted,phase+' must still paint protected Bombers');assert.equal(painted.alpha,queenPaint.alpha);}
 }
 for(const bomber of bombers){assert.equal(bomber.invisible,true);assert.equal(b.canTarget(enemy,bomber),false);}
 guard.hp=0;b.deaths();const revealed=drawBattle(b);
 for(const bomber of bombers){assert.equal(bomber.invisible,false);assert.equal(b.canTarget(enemy,bomber),true);for(const phase of ['body','shadow','health','deployment'])assert.equal(revealed.find(p=>p.phase===phase&&p.id===bomber.id)?.alpha,1);}
});
