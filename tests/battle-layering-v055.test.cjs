'use strict';
const test=require('node:test'),A=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');

function stage(){
 const paint=[],context=new Proxy({globalAlpha:1},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
 const root={RoyaleNative:{renderPosition:(u,a)=>({x:u.x-3*(1-a),y:u.y-2*(1-a)}),entityElevation:()=>0,library:{drawArena:()=>paint.push(['arena']),drawTowerShadow:(c,t)=>paint.push(['shadow',t.id]),drawTower:(c,t)=>paint.push(['body',t.id]),unit:(c,id,x,y)=>paint.push(['body',id,x,y]),fx:{begin(){},events(){},movement(){},unitStates(){},trails(){},areas:(c,b,phase)=>paint.push(['fx',phase])}}},RoyaleBattleView:{layout:{height:960},viewport:{x:0,y:0,width:540,height:800},camera:{x:0,y:0,scale:1}},RoyalePresentation:{shadow:(c,u)=>paint.push(['shadow',u.id,u.x,u.y]),health:(c,u)=>paint.push(['health',u.id]),deployment:(c,u)=>paint.push(['deploy',u.id])}};
 root.globalThis=root;vm.runInNewContext(fs.readFileSync('src/draw.js','utf8'),root);
 const entity=(id,y,extra={})=>({id,entity:id,x:120,y,hp:100,air:false,def:{source:{}},buffs:{},...extra});
 const b={towers:[entity('tower',200,{king:false})],units:[entity('back',190),entity('front',205),entity('flying',180,{air:true}),entity('gone',210,{hp:0})],effects:[],projectiles:[],isPresent:u=>u.hp>0};
 return{paint,context,root,b};
}

test('troop shadows stay on terrain beneath every body and ground spell, using interpolated positions',()=>{
 const {paint,context,root,b}=stage();root.RoyaleDraw.battle(context,b,1,null,null,.5);
 const shadows=paint.filter(p=>p[0]==='shadow');A.deepEqual(shadows.map(p=>p[1]),['tower','back','front','flying']);
 A.deepEqual(shadows.find(p=>p[1]==='front').slice(2),[118.5,204]);
 const lastShadow=Math.max(...paint.map((p,i)=>p[0]==='shadow'?i:-1));
 A.ok(lastShadow<paint.findIndex(p=>p[0]==='body'),'a later shadow must never darken an earlier actor');
 A.ok(lastShadow<paint.findIndex(p=>p[0]==='fx'&&p[1]==='ground'),'ground spell light is above contact shadows');
});

test('individual health and deployment badges remain above all bodies without duplicate tower labels',()=>{
 const {paint,context,root,b}=stage();root.RoyaleDraw.battle(context,b,1,null,null);
 const lastBody=Math.max(...paint.map((p,i)=>p[0]==='body'?i:-1));
 A.ok(paint.filter(p=>p[0]==='health'||p[0]==='deploy').every(p=>paint.indexOf(p)>lastBody));
 A.deepEqual(paint.filter(p=>p[0]==='health').map(p=>p[1]).sort(),['back','flying','front','tower']);
});

test('burrowed and invisible effect carriers do not cast detached troop shadows',async()=>{
 const calls=[],scene={clip:()=>true,draw:()=>calls.push('shadow')},root={RoyaleText:{load:async()=>{}},RoyaleNative:{Scene:class{constructor(){return scene;}}}};
 root.globalThis=root;vm.runInNewContext(fs.readFileSync('src/presentation.js','utf8'),root);await root.RoyalePresentation.load({text:{},hud:{textures:[]},filters:{textures:[]}});
 const c=new Proxy({globalAlpha:1},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)}),u={x:10,y:10,def:{source:{}}};
 for(const extra of [{burrowing:true},{effectCarrier:true},{attachedTo:10},{hidden:true}])A.equal(root.RoyalePresentation.shadow(c,{...u,...extra}),false);
 A.equal(calls.length,0);A.equal(root.RoyalePresentation.shadow(c,u),true);A.equal(calls.length,1);
});
