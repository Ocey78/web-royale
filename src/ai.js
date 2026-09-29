/* Tactical candidate generator with an optional reward-trained value policy.
 * The observation boundary deliberately excludes the opposing hand, queue,
 * exact elixir, unrevealed units, random generator and account data.
 */
(function(root,factory){
 const K=typeof module==='object'&&module.exports?require('./catalog.js'):root.RoyaleCatalog;
 const api=factory(K);if(typeof module==='object'&&module.exports)module.exports=api;else root.RoyaleAI=api;
})(globalThis,function(K){'use strict';
const {SX,SY,clamp,cardAt,entityDef,DATA}=K;
const distance=(a,b)=>Math.hypot((a.x-b.x)/SX,(a.y-b.y)/SY);
const unitCard=Object.fromEntries(K.CARDS.filter(c=>c.entity).map(c=>[c.entity,c.id]));
const SETTINGS={normal:{reaction:.85,reserve:2.5},hard:{reaction:.6,reserve:2.5},expert:{reaction:.42,reserve:2.5}};
const WIN=new Set(['hog-rider','royal-hogs','battle-ram','ram-rider','balloon','giant','goblin-giant','golem','elixir-golem','lava-hound','royal-giant','wall-breakers','goblin-barrel','graveyard','miner','x-bow','mortar']);
const SWARM_COUNTER=new Set(['arrows','the-log','barbarian-barrel','zap','giant-snowball']);
const point=(x,y)=>({x:x*SX,y:y*SY});
function publicUnit(u){return {id:u.id,entity:u.entity,card:K.CARD_BY_ID[u.card]?u.card:unitCard[u.entity],team:u.team,x:u.x,y:u.y,hp:u.hp,maxHp:u.maxHp,shield:u.shield||0,air:!!u.air,building:!!u.building,king:u.king,active:!!u.active,wait:u.wait||0,born:u.born,level:u.level,heading:u.heading,attacking:u.visualState==='attack',targetId:u.targetId,charged:!!u.charged,cloned:!!u.cloned,def:u.def};}
function observe(b,seat){
 const team=b.teamOf?b.teamOf(seat):seat;
 const own=b.units.filter(u=>u.team===team&&u.hp>0&&!u.dead&&(!b.isPresent||b.isPresent(u))&&!u.attachedTo);
 const enemies=b.units.filter(u=>u.team!==team&&u.hp>0&&!u.dead&&(!b.isPresent||b.isPresent(u))&&!u.attachedTo&&!u.hidden&&!u.invisible);
 const hand=b.hand[seat].map((id,slot)=>{const c=b.card(seat,slot);let real=c?.mirrorCard?{...cardAt(c.mirrorCard,Math.min(14,c.level+1)),cost:c.cost,mirror:true}:c;return {slot,card:real,ready:b.slotReady[seat][slot]<=b.time,available:!!c&&!(id==='mirror'&&!c.mirrorCard)};});
 const allyPlans=(b.seats||[0,1]).filter(s=>s!==seat&&(s%2)===team).map(s=>{const i=b.bots?.[s]?.intent;return i&&i.at>=b.time?{...i.action,seat:s,at:i.at}:null;}).filter(Boolean);
 return {team,seat,allyPlans,enemyRegen:Object.fromEntries((b.seats||[0,1]).filter(s=>s%2!==team).map(s=>[s,b.passiveElixirEnabled?.(s)===false?0:10/(b.timeline.ElixirFullBarMS?.[b.phase]/1000||28)])),maxElixir:b.maxElixir||10,mode:b.mode,layout:b.arenaLayout?.id,...(b.is5v5?{bounds:{left:b.arenaLayout.left,right:b.arenaLayout.right,top:b.arenaLayout.top,bottom:b.arenaLayout.bottom}}:{}),seatCount:b.seatCount||2,time:b.time,secondsLeft:b.secondsLeft,multiplier:b.multiplier,elixir:b.elixir[seat],startingElixir:b.timeline.StartingElixir??6,regen:b.passiveElixirEnabled?.(seat)===false?0:10/(b.timeline.ElixirFullBarMS?.[b.phase]/1000||28),crowns:[...b.crowns],hand,own:own.map(publicUnit),enemies:enemies.map(publicUnit),towers:b.towers.map(publicUnit),events:b.events.filter(e=>e.type==='deploy').map(e=>({...e})),areas:b.areas.map(a=>({...a})),legal:(slot,x,y)=>b.placement(team,b.card(seat,slot),x,y,seat).ok};
}
class TacticalBot{
 constructor({team=1,seat=team,difficulty='expert',seed=1}={}){
  this.team=team;this.seat=seat;this.difficulty=SETTINGS[difficulty]?difficulty:'expert';this.settings=SETTINGS[this.difficulty];this.seed=seed>>>0;
  this.memory={estimate:null,time:0,seen:{},opponents:{},cycle:[],lastEnemyPlay:-100,lane:[1,1]};this.eventCount=0;this.eventKeys=new Set();this.lastPlay=-100;this.decisions=[];
 }
 remember(v){const m=this.memory;if(m.estimate===null)m.estimate=v.startingElixir;
  const elapsed=Math.max(0,v.time-m.time),rates=Object.values(v.enemyRegen||{}),regen=rates.length?rates.reduce((a,b)=>a+b,0)/rates.length:v.regen;m.estimate=clamp(m.estimate+elapsed*regen,0,v.maxElixir||10);for(const k of Object.keys(m.opponents))m.opponents[k]=clamp(m.opponents[k]+elapsed*(v.enemyRegen?.[k]??regen),0,v.maxElixir||10);m.time=v.time;
  for(const e of v.events){if(e.team===v.team)continue;const key=`${e.seat??e.team}:${e.time}:${e.card}:${e.serial??''}`;if(this.eventKeys.has(key))continue;this.eventKeys.add(key);const c=K.CARD_BY_ID[e.card];const seat=e.seat??e.team;m.opponents[seat]=Math.max(0,(m.opponents[seat]??m.estimate)-(e.cost??c?.cost??0));m.estimate=Object.values(m.opponents).reduce((a,b)=>a+b,0)/Object.values(m.opponents).length;m.seen[e.card]=(m.seen[e.card]||0)+1;m.cycle.push(e.card);m.cycle=m.cycle.slice(-8);m.lastEnemyPlay=e.time;if(Number.isFinite(e.x))m.lane[e.x<240?0:1]++;}
  if(this.eventKeys.size>512)this.eventKeys=new Set([...this.eventKeys].slice(-300));
 }
 choose(v){
  this.lastCandidates=[];this.remember(v);if(v.time-this.lastPlay<this.settings.reaction)return null;
  // Transform only placement coordinates so the same policy works from either end.
  const front=y=>v.team?y:640-y,world=y=>v.team?y:640-y;
  const observed=v.enemies.filter(u=>v.time-u.born>=this.settings.reaction);
  const ours=v.towers.filter(t=>t.team===v.team&&t.hp>0),theirs=v.towers.filter(t=>t.team!==v.team&&t.hp>0);
  const primary=theirs.filter(t=>!t.king),targets=primary.length?primary:theirs;
  const weakest=[...targets].sort((a,b)=>a.hp-b.hp||a.x-b.x)[0];if(!weakest||!ours.length)return null;
  const dps=u=>(u.def.damage||0)/Math.max(.2,u.def.interval);
  const canHit=(a,u)=>u.air?a.targetsAir:a.targetsGround;
  const threatInfo=observed.filter(u=>!u.building&&front(u.y)<365).map(u=>{
   const tower=[...ours].sort((a,b)=>distance(a,u)-distance(b,u))[0];
   const d=Math.max(0,distance(tower,u)-tower.def.radiusTiles-u.def.radiusTiles-(u.def.range||0));
   const eta=u.attacking?0:d/Math.max(.4,u.def.speedTiles)+u.wait;
   const inRange=v.own.filter(a=>canHit(a.def,u)&&distance(a,u)<Math.max(5,a.def.range+3));
   const support=inRange.reduce((n,a)=>n+dps(a)*Math.min(1.2,a.hp/(Math.max(1,a.maxHp)*.5)),0);
   const towerDps=ours.filter(t=>(!t.king||t.active)&&distance(t,u)<t.def.range+u.def.radiusTiles+2).reduce((n,t)=>n+dps(t),0);
   const health=u.hp+u.shield,killTime=health/Math.max(1,support+towerDps);
   const pressure=Math.max(.2,(dps(u)*Math.min(health/Math.max(1,towerDps),6)/350)+(u.def.buildingsOnly?2.5:0));
   const urgency=clamp((14-eta)/8,.1,2.0);const covered=support>0&&killTime<Math.max(1.8,eta+1.2);
   return {u,tower,eta,pressure,urgency,covered,weight:pressure*urgency*(covered?.13:1)};
  }).sort((a,b)=>b.weight-a.weight);
  const threats=threatInfo.filter(t=>!t.covered),danger=threats.reduce((n,t)=>n+t.weight,0),main=threats[0];
  const entries=v.hand.filter(e=>e.available&&e.ready&&e.card&&e.card.cost<=v.elixir+1e-7);
  const candidates=[];
  const add=(e,p,score,reason)=>{if(!Number.isFinite(score)||score<=0)return;const radius=Math.max(.6,e.card.entity?K.entityDef(e.card.entity,e.card.level||9).radiusTiles||.6:.6),x=clamp(p.x,v.bounds?(v.bounds.left+radius+.05)*SX:v.layout==='BridgeBattle'?(6+radius)*SX:.75*SX,v.bounds?(v.bounds.right-radius-.05)*SX:v.layout==='BridgeBattle'?(12-radius)*SX:17.25*SX),y=clamp(p.y,v.bounds?(v.bounds.top+radius+.05)*SY:.8*SY,v.bounds?(v.bounds.bottom-radius-.05)*SY:31.2*SY);if(!v.legal(e.slot,x,y))return;for(const plan of v.allyPlans||[]){const ally=K.CARD_BY_ID[plan.card];if(ally&&distance(plan,{x,y})<Math.max(2,e.card.radiusTiles||0)){if(e.card.spell&&ally.spell&&e.card.damage>0&&ally.damage>0)score-=7;else if(e.card.building&&ally.building)score-=6;else if(reason.startsWith('defend')&&(plan.reason||'').startsWith('defend'))score-=3;}}if(score<=0)return;const tie=((e.slot*13+Math.round(x)+Math.round(y)+this.seed)%17)*.0001;candidates.push({slot:e.slot,x,y,score:score+tie,reason,card:e.card.id});};
  const positions=(e,points,score,reason)=>{for(let i=0;i<points.length;i++)add(e,points[i],score-i*.035,reason);};
  for(const e of entries){const c=e.card;
   if(c.spell){this.spells(v,e,observed,threatInfo,weakest,add);continue;}
   const d=entityDef(c.entity,c.level),count=c.count||1;
   if(c.source.CanDeployOnEnemySide){
    if(danger<3&&(v.elixir>=7||v.own.some(u=>front(u.y)>360&&u.hp/u.maxHp>.4))){positions(e,[{x:weakest.x+(weakest.x<240?-1:1)*SX*1.5,y:weakest.y+SY},{x:weakest.x,y:weakest.y+2*SY}],5.5,'pressure: tower distractor');}
   }
   for(const t of threats.slice(0,6)){
    const u=t.u;if(!canHit(d,u)&&!(!u.def.buildingsOnly&&!u.air&&c.cost<=3)&&!(d.building&&u.def.buildingsOnly))continue;
    if(d.buildingsOnly&&!d.building)continue; // Don't defend a tower with a Giant.
    const peers=observed.filter(z=>distance(z,u)<2.4),swarm=peers.length;
    let effectiveDps=d.damage/Math.max(.2,d.interval)*count;
    if(d.source.VariableDamage2)effectiveDps=Math.max(effectiveDps,180);
    if(d.splash>0)effectiveDps*=Math.min(4,1+(swarm-1)*.6);
    if(!d.splash&&swarm>3)effectiveDps*=Math.min(1,u.hp/Math.max(1,d.damage))+.12;
    if(!canHit(d,u))effectiveDps=0;
    const incoming=dps(u)*(u.def.splash>0?Math.min(count,3):1),endurance=(d.hp*count+d.shield*count)/Math.max(30,incoming);
    const timeToKill=(u.hp+u.shield)/Math.max(1,effectiveDps+dps(t.tower));
    let match=clamp(effectiveDps/105,0,6)+Math.min(2,endurance/3)+Math.min(3,6/Math.max(.4,timeToKill));
    if(d.building&&u.def.buildingsOnly)match+=4;
    if(d.air&&!u.def.targetsAir)match+=1.7;
    if(count>2&&u.def.splash>0)match-=4;
    if(count>2&&u.def.interval>1.5&&!u.def.splash)match+=2;
    if(d.splash>0&&swarm>=4)match+=4;
    if(d.range>=4&&t.eta<1&&u.hp>1000)match-=.8;
    const defenseAlready=v.own.filter(a=>distance(a,u)<4).length;
    let score=match+t.weight*1.4-c.cost*.85-defenseAlready*.55;
    if(t.eta<1.5)score+=2;if(d.building&&!d.damage&&!d.source.SpawnCharacter)score-=8;
    if(c.cost>v.elixir-1&&danger<2)score-=3;
    const uy=front(u.y)/SY,ux=u.x/SX,sgn=ux<9?1:-1;
    let points;
    if(d.building)points=[point(9-sgn*.8,world(11*SY)/SY),point(9+sgn*.7,world(10.5*SY)/SY),point(9-sgn*1.1,world(12.5*SY)/SY)];
    else if(d.range>=3){const yy=clamp(uy-(d.range-1),5.1,13.6);points=[point(clamp(ux+sgn*2.3,1,17),world(yy*SY)/SY),point(clamp(ux-sgn*1.7,1,17),world(yy*SY)/SY),point(ux,world((yy-1.2)*SY)/SY)];}
    else {const yy=clamp(uy-.5,5,14.2);points=[point(clamp(ux+sgn*.7,1,17),world(yy*SY)/SY),point(clamp(ux+sgn*2,1,17),world((yy-.5)*SY)/SY),point(clamp(ux-sgn*1.2,1,17),world(yy*SY)/SY)];}
    // Avoid giving an opposing area spell all our defenders at one location.
    for(const p of points){const clustering=v.own.filter(a=>!a.building&&distance(a,p)<1.5).length;add(e,p,score-clustering*1.5,'defend: '+u.entity);}
   }
   if(danger>5)continue;
   const alive=v.own.filter(u=>!u.building&&u.wait<1.6&&u.hp/u.maxHp>.3);
   const advancing=alive.filter(u=>front(u.y)>200&&front(u.y)<470);
   const win=WIN.has(c.id),tank=d.hp*count>=1600&&d.speedTiles<=1.05;
   const friends=advancing.filter(u=>u.hp>450).sort((a,b)=>front(b.y)-front(a.y));
   const focused=weakest.x/SX,enemyInvestment=observed.filter(u=>front(u.y)>440&&u.hp>1800);
   const lane=enemyInvestment.length&&this.memory.estimate<4?(enemyInvestment[0].x<240?14.5:3.5):focused;
   const reserve=this.settings.reserve+(danger>1?1:0),safe=v.elixir-c.cost>=reserve;
   if(win&&friends.length&&safe){const f=friends[0];const yy=clamp(front(f.y)/SY+2,10,14.15);positions(e,[point(f.x/SX,world(yy*SY)/SY),point(f.x/SX+(f.x<240?1:-1),world(yy*SY)/SY)],8+Math.min(4,advancing.length)-danger,'counterpush: support survivors');}
   if(!win&&!d.building&&!d.buildingsOnly&&friends.some(u=>u.def.buildingsOnly||u.hp>1900)&&safe){const f=friends.find(u=>u.def.buildingsOnly||u.hp>1900);if(v.own.filter(u=>u.id!==f.id&&distance(u,f)<4.5).length<2){const yy=clamp(front(f.y)/SY-2.7,4,13.5),xx=clamp(f.x/SX+(f.x<240?2:-2),1,17);positions(e,[point(xx,world(yy*SY)/SY),point(f.x/SX,world((yy-.8)*SY)/SY)],7+(d.range>3?1.6:0)-c.cost*.45-danger,'support: behind tank');}}
   if(d.building&&d.range>=10&&safe&&danger<2)positions(e,[point(lane,world(14*SY)/SY),point(lane+1,world(13.6*SY)/SY)],7,'pressure: siege');
   if(win&&!tank&&!d.building&&safe&&danger<2&&(this.memory.estimate<4||v.elixir>=(v.maxElixir||10)-.7))positions(e,[point(lane,world(14*SY)/SY),point(lane+1,world(13.8*SY)/SY)],8+(this.memory.estimate<3?2:0),'pressure: win condition');
   const ahead=v.crowns[v.team]>v.crowns[1-v.team]&&v.secondsLeft<45;
   if(v.elixir>=(v.maxElixir||10)-.5&&danger<2&&!ahead){
    let score=tank?6.5:(!d.building?4.8:1.5);score-=c.cost*.16;
    if(advancing.length>2)score-=3;
    if(c.id==='elixir-collector')score=v.secondsLeft>75?5:0;
    const y=d.building?10:3.8;positions(e,[point(lane,world(y*SY)/SY),point(lane+(lane<9?1.5:-1.5),world((y+.8)*SY)/SY)],score,'build: bank elixir and start in back');
   }
  }
  candidates.sort((a,b)=>b.score-a.score||a.slot-b.slot);this.lastCandidates=candidates;const choice=candidates[0]||null;
  if(!choice||choice.score<2.6)return null;
  return choice;
 }
 spells(v,e,enemies,threats,weakest,add){
  const c=e.card,id=c.id,r=c.source,own=v.own.filter(u=>!u.building&&u.wait<=0),front=y=>v.team?y:640-y;
  const tower=v.towers.filter(t=>t.team!==v.team&&t.hp>0);
  const danger=threats.filter(t=>!t.covered).reduce((n,t)=>n+t.weight,0);
  const damage=spellDamage(c),rad=Math.max(c.radiusTiles||1,id==='the-log'?1.1:0);
  if(id==='goblin-barrel'||id==='graveyard'){
   const tank=own.some(u=>distance(u,weakest)<7&&u.hp>450);
   const logged=this.memory.cycle.slice(-3).includes('the-log');
   if(danger<3&&(tank||id==='goblin-barrel'&&v.elixir>=8&&logged))add(e,weakest,7+(tank?3:0)+(logged?2:0),'pressure: supported summon');return;
  }
  if(['rage','clone','heal','freeze','tornado'].includes(id)){
   if(id==='rage'||id==='clone'||id==='heal'){
    for(const u of own){const group=own.filter(z=>distance(z,u)<=rad&&z.hp/z.maxHp>.3);const ready=group.filter(z=>z.attacking||front(z.y)>330);if((id==='clone'?ready.length>=3:ready.length>=2)&&danger<3)add(e,u,4+ready.length-c.cost*.5,'support: '+id);}return;
   }
   if(id==='freeze'){for(const t of tower){const friend=own.filter(u=>distance(u,t)<5&&u.hp>200),enemy=enemies.filter(u=>distance(u,t)<rad);if(friend.length&&enemy.length&&v.elixir>=c.cost+2)add(e,t,6+friend.length+enemy.length,'support: freeze defenders');}return;}
   if(id==='tornado'){const splash=own.filter(u=>u.def.splash>0);for(const u of enemies){const group=enemies.filter(z=>distance(z,u)<rad);if(group.length>=3&&splash.some(z=>distance(z,u)<z.def.range+5))add(e,u,7+group.length*.5,'defend: group into splash');}return;}
  }
  if(damage<=0)return;
  const p=DATA.projectiles[c.projectileName]||{},air=p.AoeToAir===true||['zap','arrows','fireball','rocket','poison','lightning','giant-snowball'].includes(id);
  const ground=p.AoeToGround!==false;
  const potential=enemies.filter(u=>(u.air?air:ground));
  const points=[...potential,...tower];
  for(let i=0;i<potential.length&&i<18;i++)for(let j=i+1;j<potential.length&&j<i+6;j++)if(distance(potential[i],potential[j])<2*rad)points.push({x:(potential[i].x+potential[j].x)/2,y:(potential[i].y+potential[j].y)/2});
  for(const target of points){
   let pos={x:target.x,y:target.y};
   if(target.entity&&!target.building&&!target.attacking&&target.wait<=0&&id!=='lightning'){
    const delay=id==='arrows'?1:id==='fireball'?.9:id==='rocket'?1.6:.4;
    // Only visible velocity is extrapolated; no future engine state is inspected.
    pos.x+=Math.cos(target.heading||0)*(target.def.speedTiles||0)*delay*SX;
    pos.y+=Math.sin(target.heading||0)*(target.def.speedTiles||0)*delay*SY;
   }
   if(id==='the-log'||id==='barbarian-barrel')pos.y+=(v.team?-1:1)*1.1*SY;
   if(id==='royal-delivery'){pos.y=clamp(pos.y,v.team?SY:17.5*SY,v.team?14.5*SY:31*SY);}
   const line=id==='the-log'||id==='barbarian-barrel';
   const hits=potential.filter(u=>line?Math.abs(u.x-pos.x)/SX<1.3+u.def.radiusTiles&&(front(u.y)-front(pos.y))>=-.4&&(front(u.y)-front(pos.y))<=10*SY:distance(u,pos)<=rad+u.def.radiusTiles);
   let value=0,urgency=0;
   for(const u of hits){const card=K.CARD_BY_ID[u.card],cost=(card?.cost||3)/Math.max(1,card?.count||1);const removed=Math.min(1,damage/Math.max(1,u.hp+u.shield));value+=cost*removed;const th=threats.find(t=>t.u.id===u.id);if(th&&!th.covered)urgency+=Math.min(3,th.weight*.3)*removed;}
   let finish=0,chip=0,kingPenalty=0;
   for(const t of tower){const hit=line?Math.abs(t.x-pos.x)/SX<1.3+t.def.radiusTiles&&front(t.y)>=front(pos.y)&&front(t.y)<=front(pos.y)+10*SY:distance(t,pos)<=rad+t.def.radiusTiles;if(!hit)continue;const crown=spellCrownDamage(c);if(t.hp<=crown)finish+=t.king?150:65;else{chip+=.8;if(t.king&&!t.active)kingPenalty=16;}}
   if(id==='lightning'){const ranked=hits.concat(tower.filter(t=>distance(t,pos)<=rad+t.def.radiusTiles)).sort((a,b)=>b.hp-a.hp).slice(0,3);if(!ranked.some(t=>t.id===weakest.id))finish=0;}
   let score=finish+value*3.2+urgency+chip-c.cost*2.35-kingPenalty;
   if(!finish&&value<c.cost*.55)score-=5;
   if(id==='poison'&&hits.some(u=>u.building))score+=1.5;
   if(id==='earthquake'&&hits.some(u=>u.building))score+=4;
   if(SWARM_COUNTER.has(id)&&hits.length>=4)score+=3;
   if(!finish&&v.elixir<c.cost+1&&danger<3)score-=2;
   add(e,pos,score,finish?'finish: lethal spell':'spell: '+hits.length+' targets');
  }
 }
 played(v,action){this.lastPlay=v.time;this.decisions.push({...action,time:v.time,enemyElixirEstimate:Number(this.memory.estimate.toFixed(2))});if(this.decisions.length>80)this.decisions.shift();}
 tick(b){const v=observe(b,this.seat);let action;
  if(this.intent){if(b.time<this.intent.at)return null;action=this.intent.action;this.intent=null;}
  else{const baseline=this.choose(v);if(v.time-this.lastPlay<this.settings.reaction)return null;if(this.learner&&v.time-this.learner.lastDecision<.6)return null;
   action=this.learner?this.learner.select(v,this.lastCandidates,baseline,b.rewardFrame(this.seat)):baseline;if(!action)return null;
   if(b.is2v2){this.intent={action,at:b.time+.3};return null;}
  }
  const result=b.deploy(this.seat,action.slot,action.x,action.y);if(result.ok){this.played(v,action);b.record({type:'decision',team:this.team,seat:this.seat,card:action.card,reason:action.reason,score:action.score,learnedValue:action.learnedValue||0});}return result;
 }
}
function spellDamage(c){let damage=c.damage||0;if(c.id==='arrows')damage*=c.source.ProjectileWaves||3;if(c.damageMode==='per second')damage*=Math.min(3,c.duration||1);return damage;}
function spellCrownDamage(c){const d=spellDamage(c);if(c.crownDamage!==null&&c.crownDamage!==undefined&&c.damage>0)return Math.floor(d*c.crownDamage/c.damage);return d;}
return {TacticalBot,observe,SETTINGS,spellDamage,spellCrownDamage};
});
