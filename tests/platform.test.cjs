'use strict';
const test=require('node:test'),A=require('node:assert/strict'),C=require('../src/core');
let P={};try{P=require('../src/platform')}catch(e){if(e.code!=='MODULE_NOT_FOUND')throw e;}
test('platform has explicit local repository and match-session interfaces',()=>{A.equal(typeof P.ProfileRepository,'function');A.equal(typeof P.LocalMatchSession,'function');});
const T=P.ProfileRepository?test:test.skip;
T('repository migrates the existing v4 local save without changing its key',()=>{
 const store=new Map([['web-royale-classic-v4',JSON.stringify({...C.normalizeProfile(),name:'Nano',gold:321})]]),r=new P.ProfileRepository({storage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},normalize:C.normalizeProfile});
 const p=r.load();A.equal(p.name,'Nano');A.equal(p.gold,321);p.gold++;A.equal(r.save(p).persistent,true);A.equal(JSON.parse(store.get('web-royale-classic-v4')).gold,322);
});
T('blocked browser storage remains an honest session-only repository',()=>{
 const r=new P.ProfileRepository({storage:()=>{throw Error('SecurityError');},normalize:C.normalizeProfile});const p=r.load();A.equal(r.persistent,false);p.name='Temporary';A.equal(r.save(p).persistent,false);A.equal(r.load().name,'Temporary');
});
T('corrupted save is normalized instead of crashing the application',()=>{
 const r=new P.ProfileRepository({storage:{getItem:()=>'{bad',setItem:()=>{}},normalize:C.normalizeProfile});A.equal(r.load().decks.length,5);A.ok(r.error);
});
T('match commands are sequenced and replaying the same command cannot deploy twice',()=>{
 const b=new C.Battle({ai:false}),session=new P.LocalMatchSession(b),cmd={type:'deploy',sequence:1,slot:0,x:110,y:460};
 A.equal(session.command(cmd).ok,true);const spent=b.elixir[0],units=b.units.length;A.equal(session.command(cmd).ok,true);A.equal(b.elixir[0],spent);A.equal(b.units.length,units);
 A.equal(session.command({...cmd,sequence:4}).ok,false);
});
T('malformed and non-finite commands cannot mutate a match',()=>{
 const b=new C.Battle({ai:false}),session=new P.LocalMatchSession(b),before=b.elixir[0];
 for(const cmd of [null,{type:'deploy',sequence:1,slot:0,x:NaN,y:460},{type:'deploy',sequence:1,slot:0,x:110,y:Infinity},{type:'grant-currency',sequence:1}])A.equal(session.command(cmd).ok,false);
 A.equal(b.elixir[0],before);A.equal(b.units.length,0);
});
T('fixed-step session advances reproduce equivalent simulated time and pause freezes it',()=>{
 const a=new C.Battle({seed:20,ai:false}),b=new C.Battle({seed:20,ai:false}),sa=new P.LocalMatchSession(a),sb=new P.LocalMatchSession(b);
 for(let i=0;i<120;i++)sa.advance(1/120);for(let i=0;i<20;i++)sb.advance(1/20);A.ok(Math.abs(a.time-b.time)<1e-8);
 a.paused=true;const t=a.time;sa.advance(.1);A.equal(a.time,t);
});
T('session snapshot is an independent view, not mutable game authority',()=>{
 const b=new C.Battle({ai:false}),s=new P.LocalMatchSession(b),snap=s.snapshot();snap.elixir[0]=999;A.notEqual(b.elixir[0],999);A.equal(snap.protocol,1);
});
