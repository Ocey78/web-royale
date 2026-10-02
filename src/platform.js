/* Local adapters. These are replaceable boundaries, NOT authentication or a
   multiplayer backend. A future server must validate commands and own rewards. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RoyalePlatform=api;})(globalThis,function(){'use strict';
const SAVE_KEY='web-royale-classic-v4',STEP=1/60;
class ProfileRepository {
 constructor({storage,normalize,key=SAVE_KEY}){if(typeof normalize!=='function')throw TypeError('Profile normalizer required');this.normalize=normalize;this.key=key;this.storage=null;this.memory=null;this.error=null;this.persistent=false;
  try{this.storage=typeof storage==='function'?storage():storage;this.persistent=!!this.storage;}catch(e){this.error=String(e.message||e);}
 }
 load(){if(this.memory)return this.normalize(JSON.parse(this.memory));try{const raw=this.storage?.getItem(this.key);const p=this.normalize(raw?JSON.parse(raw):null);this.memory=JSON.stringify(p);return p;}catch(e){this.error=String(e.message||e);this.persistent=false;const p=this.normalize();this.memory=JSON.stringify(p);return p;}}
 save(profile){this.memory=JSON.stringify(this.normalize(profile));try{if(!this.storage)throw Error('Browser storage unavailable');this.storage.setItem(this.key,this.memory);this.persistent=true;this.error=null;}catch(e){this.persistent=false;this.error=String(e.message||e);}return {ok:true,persistent:this.persistent,error:this.error};}
}
class LocalMatchSession {
 constructor(battle){if(!battle||typeof battle.deploy!=='function'||typeof battle.step!=='function')throw TypeError('Battle required');this.battle=battle;this.sequence=0;this.accumulator=0;this.replies=new Map();}
 command(cmd){const valid=cmd&&Number.isSafeInteger(cmd.sequence)&&cmd.sequence>=1&&(cmd.type==='deploy'&&Number.isInteger(cmd.slot)&&cmd.slot>=0&&cmd.slot<4&&Number.isFinite(cmd.x)&&Number.isFinite(cmd.y)||cmd.type==='ability'&&Number.isSafeInteger(cmd.entityId)&&cmd.entityId>0);if(!valid)return{ok:false,reason:'Invalid match command'};
  const signature=JSON.stringify(cmd.type==='ability'?['ability',cmd.entityId]:['deploy',cmd.slot,cmd.x,cmd.y]),old=this.replies.get(cmd.sequence);if(old)return old.signature===signature?{...old.result}:{ok:false,reason:'Sequence already used'};
  if(cmd.sequence!==this.sequence+1)return{ok:false,reason:'Out-of-order match command'};
  const reply=cmd.type==='ability'?this.battle.activateAbility?.(0,cmd.entityId)||{ok:false,reason:'Abilities unavailable'}:this.battle.deploy(0,cmd.slot,cmd.x,cmd.y),result={...reply,sequence:cmd.sequence};this.sequence=cmd.sequence;this.replies.set(cmd.sequence,{signature,result});if(this.replies.size>64)this.replies.delete(this.replies.keys().next().value);return {...result};
 }
 advance(seconds){if(!Number.isFinite(seconds)||seconds<0)throw RangeError('Invalid elapsed time');if(this.battle.paused||this.battle.result){this.accumulator=0;return;}this.accumulator+=Math.min(.25,seconds);let steps=0;while(this.accumulator+1e-9>=STEP&&steps<15){this.battle.step(STEP);this.accumulator-=STEP;steps++;}this.accumulator=Math.max(0,this.accumulator);}
 snapshot(){const b=this.battle;return {protocol:1,matchId:b.id,time:b.time,elixir:[...b.elixir],hand:b.hand.map(h=>[...h]),crowns:[...b.crowns],result:b.result?{...b.result}:null,units:b.active.map(u=>({id:u.id,entity:u.entity,team:u.team,x:u.x,y:u.y,hp:u.hp,maxHp:u.maxHp,heading:u.heading,visualState:u.visualState,animationTime:u.animationTime,formId:u.formId||null,ability:this.battle.abilityStatus?.(u.id)||null}))};}
}
return{SAVE_KEY,STEP,ProfileRepository,LocalMatchSession};});
