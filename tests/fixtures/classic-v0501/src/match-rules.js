/* Non-configurable public queue rules. Test fixtures without a queue retain their explicit inputs. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RoyaleMatchRules=api;})(globalThis,function(){'use strict';
const QUEUES=Object.freeze(['trophy-road','challenge','training','friendly','clan-war','2v2','3v3','5v5','bridge','touchdown','self-play','replay']);
function mix(n){n=Math.imul(n^(n>>>16),0x45d9f3b);n=Math.imul(n^(n>>>16),0x45d9f3b);return(n^(n>>>16))>>>0;}
function difficulty(index=0,seed=77137){index=Math.max(0,Math.floor(Number(index)||0));const cycle=Math.floor(index/20),h=mix(cycle^seed),start=4+h%13,length=1+((h>>>12)%2);return index%20>=start&&index%20<start+length?'hard':'expert';}
function prepare(options,cards){
 if(!options.queue)return options;
 const queue=QUEUES.includes(options.queue)?options.queue:'challenge',trophy=queue==='trophy-road';
 const clean={...options,profile:options.profile?{...options.profile,cheatLevels:{}}:options.profile,queue,aiDifficulty:difficulty(options.profile?.battleSerial||0,options.profile?.world?.seed||77137)};
 if(!trophy){const levels=Object.fromEntries(cards.map(c=>[c.id,9])),count=options.mode==='TeamRumble'?10:['Team3v3','Touchdown3v3'].includes(options.mode)?6:['TeamVsTeam','Touchdown2v2'].includes(options.mode)?4:2;Object.assign(clean,{levels,seatLevels:Array.from({length:count},()=>({...levels})),kingLevel:9,kingLevels:Array(count).fill(9)});}
 else{clean.levels={...options.profile?.cardLevels};clean.seatLevels=[clean.levels,...(options.seatLevels||[]).slice(1)];clean.kingLevel=options.profile?.level||1;clean.kingLevels=[clean.kingLevel,...(options.kingLevels||[]).slice(1)];}
 return clean;
}
const CUSTOM_MODES=Object.freeze(['FourCardDeck','SixCardDeck','RandomDeck','Team3v3','TeamRumble','BridgeBattle','TwelveCardDeck','TwentyElixir','UncappedElixir','OneShot','Touchdown','Touchdown2v2','Touchdown3v3']);
function timelineFor(mode,timelines){if(['Touchdown','Touchdown2v2','Touchdown3v3'].includes(mode))return {...timelines.Default,Name:mode};
 if(mode==='TeamRumble')return {...timelines.Default,Name:'TeamRumble',SectionLength:[300,300],SectionType:['Normal','Overtime'],ElixirRateLength:[120,120,60,120,120,60],ElixirFullBarMS:[28000,14000,28000/3,28000/3,7000,5600],ElixirRateVisible:[10,20,30,30,40,50],NextSpellCooldownMS:[1000,1000,500,500,400,350]};
 if(mode==='OneShot')return timelines.SuddenDeath;
 if(mode==='Team3v3')return {...timelines.Default,Name:'Team3v3',SectionLength:[300,120],SectionType:['Normal','Overtime'],ElixirRateLength:[120,120,60,60,60],ElixirFullBarMS:[28000,28000/1.5,14000,14000,9300],ElixirRateVisible:[10,15,20,20,30],NextSpellCooldownMS:[1000,1000,500,500,350]};
 return null;}
return{QUEUES,difficulty,prepare,CUSTOM_MODES,timelineFor};});
