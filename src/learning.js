/* Shared, reward-trained linear action-value model with a tactical prior.
   Online TD(lambda) updates are real parameter updates, not a difficulty timer.
   This is not a neural network, and learning is not a guarantee of improvement. */
(function(root,factory){const n=typeof module==='object'&&module.exports,api=factory(n?require('./catalog.js'):root.RoyaleCatalog);if(n)module.exports=api;else root.RoyaleLearning=api;})(globalThis,function(K){'use strict';
const VERSION=1,ENGINE='0.53.0',WEIGHT_LIMIT=4,GAMMA=.985,LAMBDA=.94,ALPHA=.06;
const CATEGORIES=['wait','defend','support','counterpush','pressure','build','finish','spell'];
const CONTEXT_NAMES=['air-threat','swarm','tank','structure','danger','allied-tank','low-elixir','late','tower-weak','allied-push','2v2','near-tower'];
const FEATURE_NAMES=['bias','cost','reserve','elixir','time','double','own-board','enemy-board','own-hp','enemy-hp','left-lane','front','danger','anti-air','splash','tank','building','spell','endgame','2v2',...CATEGORIES.map(x=>'action:'+x),...K.CARDS.map(c=>'card:'+c.id),...CATEGORIES.flatMap(a=>CONTEXT_NAMES.map(c=>'action:'+a+'@'+c)),...K.CARDS.flatMap(a=>CONTEXT_NAMES.map(c=>'card:'+a.id+'@'+c))];
const DIM=FEATURE_NAMES.length,finite=(x,d=0)=>Number.isFinite(x)?x:d,clamp=K.clamp;
const num=(x,max=1e12)=>clamp(Math.floor(finite(x)),0,max);
function normalizeModel(raw){const p=raw&&raw.schema===VERSION&&raw.snapshot===K.DATA.snapshot?raw:{};
 return {schema:VERSION,snapshot:K.DATA.snapshot,engine:ENGINE,weights:Array.from({length:DIM},(_,i)=>clamp(finite(p.weights?.[i]),-WEIGHT_LIMIT,WEIGHT_LIMIT)),updates:num(p.updates),matches:num(p.matches),recorded:num(p.recorded),quarantined:num(p.quarantined),abandoned:num(p.abandoned),reward:clamp(finite(p.reward),-1e12,1e12),revision:num(p.revision),actionStats:p.actionStats&&typeof p.actionStats==='object'?Object.fromEntries(Object.entries(p.actionStats).filter(([k,v])=>typeof k==='string'&&k.length<=100&&v&&Number.isFinite(v.count)&&Number.isFinite(v.sum)).slice(-12000).map(([k,v])=>[k,{count:num(v.count,1000000),sum:clamp(finite(v.sum),-1e7,1e7)}])):{},seen:Array.isArray(p.seen)?p.seen.filter(s=>typeof s==='string'&&s.length<=140).slice(-20000):[],recent:Array.isArray(p.recent)?p.recent.filter(r=>r&&typeof r.id==='string').slice(-40).map(r=>({id:r.id.slice(0,140),mode:String(r.mode||'Default').slice(0,40),status:String(r.status||'completed').slice(0,20),winner:[-1,0,1].includes(r.winner)?r.winner:null,duration:num(r.duration,650),updates:num(r.updates),reward:finite(r.reward)})):[]};
}
function features(v,a){const f=new Array(DIM).fill(0),c=K.CARD_BY_ID[a?.card],cost=a?.cost??c?.cost??0,category=a?(a.reason||'').split(':')[0]:'wait',entity=c?.entity?K.entityDef(c.entity,c.level||9):null,own=v.own||[],enemies=v.enemies||[],towers=v.towers||[];
 const ours=towers.filter(t=>t.team===v.team),theirs=towers.filter(t=>t.team!==v.team),front=y=>v.team?y:640-y;
 const hp=xs=>xs.reduce((n,u)=>n+u.hp/Math.max(1,u.maxHp),0)/Math.max(1,xs.length);
 const vals=[1,cost/10,(v.elixir-cost)/(v.maxElixir||10),v.elixir/(v.maxElixir||10),Math.min(1,v.time/300),Math.min(1,(v.multiplier-1)/2),Math.min(1,own.length/15),Math.min(1,enemies.length/15),hp(ours),hp(theirs),a?(a.x<240?1:-1):0,a?front(a.y)/640:0,Math.min(1,enemies.filter(u=>front(u.y)<300).length/6),entity?.targetsAir?1:0,entity?.splash>0?1:0,entity?.buildingsOnly?1:0,c?.building?1:0,c?.spell?1:0,v.secondsLeft<45?1:0,v.seatCount===4?1:0];
 vals.forEach((x,i)=>f[i]=clamp(finite(x),-1,1));const cat=Math.max(0,CATEGORIES.indexOf(category)),cardIndex=c?K.CARDS.findIndex(x=>x.id===c.id):-1;f[20+cat]=1;if(c)f[20+CATEGORIES.length+cardIndex]=1;
 // State-action interactions are essential: a common state offset alone cannot
 // learn different counters for an air rush, a swarm, and an empty battlefield.
 const contexts=[enemies.filter(u=>u.air).length/4,enemies.length/8,Math.max(0,...enemies.map(u=>u.hp))/2500,enemies.filter(u=>u.building).length/2,enemies.filter(u=>front(u.y)<300).length/5,own.filter(u=>u.hp>1400&&front(u.y)>180).length/2,1-v.elixir/(v.maxElixir||10),v.secondsLeft<45?1:0,1-hp(theirs),own.filter(u=>front(u.y)>300).length/5,v.seatCount===4?1:0,Math.max(0,...enemies.map(u=>Math.max(0,...ours.map(t=>1-Math.hypot((u.x-t.x)/K.SX,(u.y-t.y)/K.SY)/8))))].map(x=>clamp(finite(x),0,1));
 const start=20+CATEGORIES.length+K.CARDS.length;for(let i=0;i<contexts.length;i++){f[start+cat*CONTEXT_NAMES.length+i]=contexts[i];if(c)f[start+CATEGORIES.length*CONTEXT_NAMES.length+cardIndex*CONTEXT_NAMES.length+i]=contexts[i];}return f;
}

function experienceKey(v,a,specific=true){
 const c=K.CARD_BY_ID[a?.card],category=a?(a.reason||'').split(':')[0]:'wait',enemies=v.enemies||[],own=v.own||[],front=y=>v.team?y:640-y;
 const air=enemies.some(u=>u.air)?1:0,swarm=enemies.length>=4?1:0,tank=enemies.some(u=>u.hp>1700)?1:0,danger=enemies.some(u=>front(u.y)<250)?1:0,push=own.some(u=>front(u.y)>360&&u.hp>800)?1:0,late=v.secondsLeft<50?1:0,lane=a?(v.mode==='BridgeBattle'?'C':v.mode==='TeamRumble'?String(Math.min(4,Math.floor(a.x/96))):v.mode==='Team3v3'?(a.x<160?'L':a.x<320?'C':'R'):(a.x<240?'L':'R')):'W';
 const modeKey=({TwelveCardDeck:'twelve',TwentyElixir:'twenty',OneShot:'oneshot',Team3v3:'3v3',TeamRumble:'5v5',BridgeBattle:'bridge',FourCardDeck:'four',RandomDeck:'random',DoubleElixir:'double',TripleElixir:'triple',RampUp:'ramp',SuddenDeath:'sudden','7xElixir':'7x',ClanWar_BoatBattle:'boat'})[v.mode]||'',teamKey=modeKey|| (v.seatCount===4?'2':'1');
 const threat=[...enemies].sort((a,b)=>front(a.y)-front(b.y)||b.hp-a.hp)[0],threatId=String(threat?.card||threat?.entity||'none').slice(0,28),elixirBand=Math.max(0,Math.min(5,Math.floor(finite(v.elixir)/2)));
 const broad=`${c?.id||'wait'}|${category}|${danger}${push}${late}|${teamKey}|${lane}`;
 const specificState=`${c?.id||'wait'}|${category}|${air}${swarm}${tank}${danger}${push}${late}|${teamKey}|${lane}`;
 return specific?`${specificState}|${threatId}|e${elixirBand}`:broad;
}

function rewardDelta(before,after,terminal=0){const d=k=>finite(after?.[k])-finite(before?.[k]),loss=k=>Math.min(0,d(k));const terms={tower:5*(d('towerFor')-d('towerAgainst')),trade:.16*(d('dealt')-d('taken')),board:.28*(loss('boardFor')-loss('boardAgainst')),crowns:.8*(d('crownsFor')-d('crownsAgainst')),spending:-.008*d('spent'),leaking:-.05*d('leaked'),terminal};return {...terms,total:clamp(Object.values(terms).reduce((a,b)=>a+b,0),-8,8)};}
class SharedBrain{
 constructor(raw){this.state=normalizeModel(raw);}
 export(){return JSON.parse(JSON.stringify(this.state));}
 predict(f){return clamp(f.reduce((v,x,i)=>v+finite(x)*this.state.weights[i],0),-6,6);}
 experience(key){const s=this.state.actionStats[key];if(!s?.count)return 0;const mean=s.sum/s.count,confidence=Math.min(1,Math.log2(1+s.count)/6);return clamp(mean*confidence,-2.2,2.2);}
 learnExperience(key,reward){if(!key)return;const s=this.state.actionStats[key]||(this.state.actionStats[key]={count:0,sum:0});s.count=Math.min(1000000,s.count+1);s.sum=clamp(s.sum+clamp(finite(reward),-8,8),-1e7,1e7);if(Object.keys(this.state.actionStats).length>12000){const entries=Object.entries(this.state.actionStats).sort((a,b)=>a[1].count-b[1].count).slice(0,1000);for(const [k] of entries)delete this.state.actionStats[k];}}
 update(f,reward,next,trace,seconds=1){if(!Array.isArray(f)||f.length!==DIM)return 0;const gamma=Math.pow(GAMMA,clamp(finite(seconds,1),.05,300)),td=clamp(finite(reward)+gamma*(next?this.predict(next):0)-this.predict(f),-6,6),norm=1+f.reduce((n,x)=>n+x*x,0),decay=Math.pow(GAMMA*LAMBDA,clamp(finite(seconds,1),.05,300));
  for(let i=0;i<DIM;i++){trace[i]=clamp(finite(trace[i])*decay+finite(f[i]),-6,6);this.state.weights[i]=clamp(this.state.weights[i]+ALPHA*td*trace[i]/norm,-WEIGHT_LIMIT,WEIGHT_LIMIT);}
  this.state.updates++;this.state.reward+=clamp(finite(reward),-8,8);return td;
 }
 delta(from){const base=from?.actionStats||{},experience={};for(const [k,v] of Object.entries(this.state.actionStats)){const b=base[k]||{count:0,sum:0},count=v.count-b.count,sum=v.sum-b.sum;if(count||Math.abs(sum)>1e-9)experience[k]={count,sum};}return {weights:this.state.weights.map((w,i)=>w-finite(from?.weights?.[i])),updates:Math.max(0,this.state.updates-num(from?.updates)),reward:this.state.reward-finite(from?.reward),experience};}
}
class Controller{
 constructor(brain,seat,{training=true,seed=1,record=()=>{}}={}){this.brain=brain;this.seat=seat;this.training=training;this.seed=seed>>>0||1;this.trace=new Float64Array(DIM);this.previous=null;this.record=record;this.closed=false;this.decisions=0;this.lastDecision=-100;}
 random(){let x=this.seed;x^=x<<13;x^=x>>>17;x^=x<<5;this.seed=x>>>0;return this.seed/4294967296;}
 select(v,candidates,baseline,frame){
  const unique=[],seen=new Set();for(const a of candidates||[]){const key=a.card+':'+Math.round(a.x/30)+':'+Math.round(a.y/30);if(a.score<2||seen.has(key))continue;seen.add(key);unique.push(a);if(unique.length>=24)break;}
  const pool=[{action:null,prior:2.6,feature:features(v,null),key:experienceKey(v,null,true),genericKey:experienceKey(v,null,false)},...unique.map(a=>({action:a,prior:a.score,feature:features(v,a),key:experienceKey(v,a,true),genericKey:experienceKey(v,a,false)}))];
  const learnedExperience=p=>this.brain.experience(p.key)+.45*this.brain.experience(p.genericKey);
  const waitValue=this.brain.predict(pool[0].feature),waitExperience=learnedExperience(pool[0]);for(const p of pool){p.value=this.brain.predict(p.feature);p.experience=learnedExperience(p);p.score=p.prior+clamp(p.value-waitValue,-3,3)+clamp(p.experience-waitExperience,-2,2);}
  pool.sort((a,b)=>b.score-a.score);let choice=pool[0];
  // Never let exploration throw away an immediate forced win or emergency.
  if(baseline?.score>=24)choice=pool.find(p=>p.action===baseline)||choice;
  else if(this.training&&this.random()<.035){const safe=pool.filter(p=>p.prior>=Math.max(2.6,(baseline?.score||2.6)-1.3)&&p.score>=choice.score-1.6);if(safe.length)choice=safe[Math.floor(this.random()*safe.length)];}
  if(this.previous){const r=rewardDelta(this.previous.frame,frame),dt=v.time-this.previous.time;let error=0;if(this.training){error=this.brain.update(this.previous.feature,r.total,choice.feature,this.trace,dt);this.brain.learnExperience(this.previous.key,r.total);if(this.previous.genericKey&&this.previous.genericKey!==this.previous.key)this.brain.learnExperience(this.previous.genericKey,r.total*.5);}this.record({type:'learning',seat:this.seat,team:v.team,time:v.time,action:this.previous.action?.card||'wait',reason:this.previous.action?.reason||'wait',reward:r,td:error,q:this.brain.predict(this.previous.feature),features:this.previous.feature.map((x,i)=>x?[i,Number(x.toFixed(5))]:null).filter(Boolean),trained:this.training});}
  this.previous={feature:choice.feature,key:choice.key,genericKey:choice.genericKey,frame:{...frame},time:v.time,action:choice.action};this.decisions++;this.lastDecision=v.time;
  return choice.action?{...choice.action,priorScore:choice.prior,learnedValue:choice.value,score:choice.score}:null;
 }
 finish(frame,winner,time){if(this.closed)return;this.closed=true;if(!this.previous)return;const terminal=winner===null||winner===-1?0:winner===(this.seat%2)?4:-4,r=rewardDelta(this.previous.frame,frame,terminal);let error=0;if(this.training){error=this.brain.update(this.previous.feature,r.total,null,this.trace,time-this.previous.time);this.brain.learnExperience(this.previous.key,r.total);if(this.previous.genericKey&&this.previous.genericKey!==this.previous.key)this.brain.learnExperience(this.previous.genericKey,r.total*.5);}this.record({type:'learning',seat:this.seat,team:this.seat%2,time,action:this.previous.action?.card||'wait',reason:this.previous.action?.reason||'wait',reward:r,td:error,terminal:true,trained:this.training});}
}
class MatchRecorder{
 constructor(b){this.b=b;this.compact=b.compactRecording===true;this.eventCounts={};this.seatPlacements=b.seats.map(()=>0);this.commands=[];this.events=[];this.transitions=[];this.snapshots=[];this.dropped=0;this.nextSample=0;this.closed=false;this.status='running';this.initial=b.brain?.export()||new SharedBrain().export();this.started=new Date().toISOString();}
 event(event){if(this.closed)return;this.eventCounts[event.type]=(this.eventCounts[event.type]||0)+1;
  const e=this.compact?{...event}:JSON.parse(JSON.stringify(event));if(this.compact)delete e.features;
  if(e.type==='deploy'||e.type==='ability'){this.commands.push(e);const seat=e.seat??e.owner;if(e.type==='deploy'&&this.seatPlacements[seat]!==undefined)this.seatPlacements[seat]++;if(this.compact&&this.commands.length>64){this.commands.shift();this.dropped++;}}
  if(e.type==='learning'){this.transitions.push(e);if(this.transitions.length>(this.compact?32:3000)){this.transitions.shift();this.dropped++;}}
  else if(!this.compact){this.events.push(e);if(this.events.length>12000){this.events.shift();this.dropped++;}}
 }
 tick(){const b=this.b;if(b.time+1e-7<this.nextSample)return;this.nextSample=b.time+(this.compact?60:2);this.snapshots.push({time:Number(b.time.toFixed(3)),crowns:[...b.crowns],units:this.compact?[]:b.active.filter(u=>!u.attachedTo).slice(0,256).map(u=>[u.id,u.entity,u.team,u.owner,Number(u.x.toFixed(1)),Number(u.y.toFixed(1)),Math.ceil(u.hp),Math.ceil(u.shield),Number(u.wait.toFixed(2)),u.targetId||0]),elixir:b.elixir.map(x=>Number(x.toFixed(2)))});if(this.snapshots.length>(this.compact?2:180)){this.snapshots.shift();this.dropped++;}}
 end(status='completed'){if(this.closed)return;this.tick();this.closed=true;this.status=status;}
 finish(){const b=this.b;return {recording:this.compact?'compact':'full',eventCounts:{...this.eventCounts},seatPlacements:[...this.seatPlacements],schema:VERSION,engine:ENGINE,snapshot:K.DATA.snapshot,id:b.id,started:this.started,ended:new Date().toISOString(),status:this.status,mode:b.mode,seatCount:b.seatCount,seed:b.seed,initialDecks:b.initialDecks.map(d=>[...d]),levels:{...b.levels},kingLevel:b.kingLevel,quarantined:Object.values(b.cheats).some(Boolean),trainingEnabled:b.learningEnabled!==false,result:b.result?{...b.result}:null,terminalReward:b.result?(b.result.winner===0?4:b.result.winner===1?-4:0):0,duration:Number(b.time.toFixed(3)),metrics:JSON.parse(JSON.stringify(b.metrics)),commands:this.commands.slice(),events:this.events.slice(),transitions:this.transitions.slice(),snapshots:this.snapshots.slice(),dropped:this.dropped,policyUpdates:b.brain?b.brain.state.updates-this.initial.updates:0};}
 packet(){return {record:this.finish(),delta:this.b.brain?this.b.brain.delta(this.initial):{weights:new Array(DIM).fill(0),updates:0,reward:0}};}
}
function mergePacket(raw,packet){const model=normalizeModel(raw),r=packet?.record,d=packet?.delta;if(!r||typeof r.id!=='string'||r.id.length>140||r.snapshot!==K.DATA.snapshot||!d||!Array.isArray(d.weights)||d.weights.length!==DIM)throw Error('Incompatible learning record');if(model.seen.includes(r.id))return model;
 const allowed=!r.quarantined&&r.trainingEnabled!==false;const updates=allowed?num(d.updates,100000):0;
 if(allowed){for(let i=0;i<DIM;i++)model.weights[i]=clamp(model.weights[i]+clamp(finite(d.weights[i]),-WEIGHT_LIMIT*2,WEIGHT_LIMIT*2),-WEIGHT_LIMIT,WEIGHT_LIMIT);for(const [k,v] of Object.entries(d.experience||{})){if(typeof k!=='string'||k.length>100||!v)continue;const s=model.actionStats[k]||(model.actionStats[k]={count:0,sum:0});s.count=Math.min(1000000,s.count+num(v.count,1000000));s.sum=clamp(s.sum+finite(v.sum),-1e7,1e7);}model.updates+=updates;model.reward+=clamp(finite(d.reward),-100000,100000);}
 model.recorded++;if(r.status==='abandoned')model.abandoned++;else model.matches++;if(r.quarantined)model.quarantined++;model.revision++;model.seen.push(r.id);model.seen=model.seen.slice(-20000);model.recent.push({id:r.id,mode:r.mode,status:r.status||'completed',winner:r.result?.winner??null,duration:Math.round(r.duration||0),updates,reward:allowed?finite(d.reward):0});model.recent=model.recent.slice(-40);return model;
}
return {VERSION,ENGINE,WEIGHT_LIMIT,FEATURE_NAMES,DIM,normalizeModel,features,experienceKey,rewardDelta,SharedBrain,Controller,MatchRecorder,mergePacket};});
