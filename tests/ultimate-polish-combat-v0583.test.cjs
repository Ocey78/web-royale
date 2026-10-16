'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const K=require('../src/catalog'),{Battle}=require('../src/battle'),AI=require('../src/ai'),Ultimate=require('../src/ultimate-combat');
const S=K.SX,T=K.SY;
function quiet(options={}){const b=new Battle({mode:'UltimateClash',ai:false,headless:true,seed:583,...options});for(const t of b.towers)t.readyAt=1e9;return b;}
function advance(b,seconds){for(let i=0;i<Math.round(seconds*60);i++)b.step(1/60);}
function builder(b,u,seat=0){b.hand[seat][0]='ultimate-builder';b.slotReady[seat][0]=0;b.elixir[seat]=20;return b.deploy(seat,0,u.x,u.y);}
function close(actual,expected){assert.ok(Math.abs(actual-expected)<1e-6,actual+' should equal '+expected);}
function mirrorBattle(id,options={}){const filler=['ultimate-heal-spell','ultimate-harvest','ultimate-royale-recall','ultimate-dark-pact','ultimate-frostbite','ultimate-builder','ultimate-fisherman'].filter(v=>v!==id),deck=[id,...filler.slice(0,3),'ultimate-mirror',...filler.slice(3,6)];return quiet({deck,enemyDeck:deck,...options});}
function play(b,seat,slot,x=6,y=22){b.elixir[seat]=20;const result=b.deploy(seat,slot,x*S,y*T);assert.equal(result.ok,true,result.reason);return result;}

test('Builder third real deployment is legal and fourth leaves cost, cycle and recorder unchanged',()=>{
 const b=quiet(),u=b.spawn('GoblinCage',0,9*S,22*T,{wait:0});
 for(let count=1;count<=3;count++){
  b.hand[0][0]='ultimate-builder';b.slotReady[0][0]=0;b.elixir[0]=20;
  const preview=b.placementPreview(0,0,u.x,u.y);assert.equal(preview.ok,true,'Builder '+count+' preview');assert.deepEqual(preview.affected.map(v=>v.id),[u.id]);
  assert.equal(b.deploy(0,0,u.x,u.y).ok,true);assert.equal(u.ultimate.builders,count);assert.equal(b.elixir[0],15);
 }
 b.hand[0][0]='ultimate-builder';b.slotReady[0][0]=0;b.elixir[0]=20;
 const before={hand:[...b.hand[0]],queue:[...b.queue[0]],records:b.recorder.commands.length,played:b.played[0]};
 assert.equal(b.placementPreview(0,0,u.x,u.y).ok,false);assert.equal(b.deploy(0,0,u.x,u.y).ok,false);
 assert.deepEqual({hand:b.hand[0],queue:b.queue[0],records:b.recorder.commands.length,played:b.played[0]},before);assert.equal(b.elixir[0],20);assert.equal(u.ultimate.builders,3);
});
test('Builder stacks prevent decay and heal exactly zero, 1.5 or 3 percent max health per second',()=>{
 for(const [count,rate]of [[1,0],[2,.015],[3,.03]]){
  const b=quiet(),u=b.spawn('GoblinCage',0,9*S,22*T,{wait:0});for(let i=0;i<count;i++)assert.equal(builder(b,u).ok,true);
  u.hp=u.maxHp*.5;advance(b,1);close(u.hp,u.maxHp*(.5+rate));assert.equal(u.expires,Infinity);
  u.hp=u.maxHp-1;advance(b,1);assert.ok(u.hp<=u.maxHp);if(count>1)assert.equal(u.hp,u.maxHp);
  u.hp=0;advance(b,.1);assert.ok(u.dead);assert.equal(u.hp,0);
 }
 const b=quiet(),tower=b.towers.find(t=>t.team===0&&!t.king),enemy=b.spawn('GoblinCage',1,9*S,10*T,{wait:0});
 assert.equal(builder(b,tower).ok,false);assert.equal(builder(b,enemy).ok,false);
});
test('Ultimate AI assigns a third Builder and never spends on a fourth',()=>{
 const b=quiet(),u=b.spawn('GoblinCage',0,9*S,22*T,{wait:0});assert.equal(builder(b,u).ok,true);assert.equal(builder(b,u).ok,true);
 b.hand[0]=['ultimate-builder','ultimate-three-pekkas','ultimate-code-red','ultimate-balloon-parade'];b.slotReady[0]=[0,0,0,0];b.elixir[0]=5;
 assert.equal(Ultimate.aiPlay(b,0),true);assert.equal(u.ultimate.builders,3);assert.equal(b.elixir[0],0);
 b.hand[0][0]='ultimate-builder';b.slotReady[0][0]=0;b.elixir[0]=5;const commands=b.recorder.commands.length;
 assert.equal(Ultimate.aiPlay(b,0),true);assert.equal(b.elixir[0],5);assert.equal(b.recorder.commands.length,commands);
});
test('Ultimate Mirror real slot cycle copies the played level plus three through preview, AI and deployment',()=>{
 const b=mirrorBattle('ultimate-fisherman',{levels:{'ultimate-fisherman':16,'ultimate-mirror':9}});
 play(b,0,0);assert.equal(b.hand[0][0],'ultimate-mirror');assert.equal(b.units[0].level,16);
 const c=b.card(0,0);assert.equal(c.id,'ultimate-mirror');assert.equal(c.cost,5);assert.equal(c.mirrorCard,'ultimate-fisherman');assert.equal(c.mirrorLevel,19);
 const preview=b.placementPreview(0,0,12*S,22*T);assert.equal(preview.card,'ultimate-fisherman');assert.equal(preview.level,19);assert.equal(preview.members.length,1);assert.equal(preview.cycling,true);
 const observation=AI.observe(b,0);assert.equal(observation.hand[0].card.level,19);assert.equal(observation.hand[0].card.cost,5);assert.equal(observation.hand[0].card.entity,'UltimateFisherman');
 const before=[...b.hand[0]];assert.equal(b.deploy(0,0,12*S,22*T).ok,false);assert.deepEqual(b.hand[0],before);
 advance(b,1);b.elixir[0]=20;assert.equal(b.deploy(0,0,12*S,22*T).ok,true);assert.equal(b.elixir[0],15);
 const copy=b.units.at(-1);assert.equal(copy.level,19);assert.equal(copy.card,'ultimate-fisherman');assert.ok(copy.maxHp>b.units[0].maxHp);
 const event=b.recorder.commands.at(-1);assert.equal(event.playedCard,'ultimate-mirror');assert.equal(event.card,'ultimate-fisherman');assert.equal(event.cost,5);
 assert.deepEqual(b.lastCard[0],{id:'ultimate-fisherman',level:16,cost:4});assert.notEqual(b.hand[0][0],'ultimate-mirror');assert.equal(b.queue[0].at(-1),'ultimate-mirror');
});
test('Ultimate Mirror caps a twenty elixir copy at twenty and repeated copies never compound',()=>{
 const b=mirrorBattle('ultimate-royale-escort',{levels:{'ultimate-royale-escort':16,'ultimate-mirror':16}});
 play(b,0,0,9,23);advance(b,1);assert.equal(b.card(0,0).cost,20);assert.equal(b.placementPreview(0,0,9*S,22*T).level,19);
 b.elixir[0]=19.99;assert.equal(b.deploy(0,0,9*S,22*T).ok,false);assert.equal(b.hand[0][0],'ultimate-mirror');
 play(b,0,0,9,22);assert.equal(b.elixir[0],0);assert.ok(b.units.slice(6).every(u=>u.level===19));
 b.hand[0][0]='ultimate-mirror';b.slotReady[0][0]=0;assert.equal(b.card(0,0).cost,20);assert.equal(b.card(0,0).mirrorLevel,19);play(b,0,0,9,21);
 assert.ok(b.units.slice(12).every(u=>u.level===19));assert.deepEqual(b.lastCard[0],{id:'ultimate-royale-escort',level:16,cost:20});
});
test('Ultimate Mirror without a previous card rejects deployment, preview and AI without side effects',()=>{
 const b=mirrorBattle('ultimate-fisherman');b.hand[0][0]='ultimate-mirror';b.elixir[0]=20;
 const before={hand:[...b.hand[0]],queue:[...b.queue[0]],cycles:[...b.formState.cycles[0]]};
 assert.equal(b.deploy(0,0,9*S,22*T).ok,false);const preview=b.placementPreview(0,0,9*S,22*T);assert.equal(preview.ok,false);assert.match(preview.reason,/before Mirror/);
 assert.equal(AI.observe(b,0).hand[0].available,false);assert.equal(b.recorder.commands.length,0);assert.equal(b.elixir[0],20);
 assert.deepEqual({hand:b.hand[0],queue:b.queue[0],cycles:b.formState.cycles[0]},before);assert.equal(b.units.length,0);
});
test('Ultimate Mirror uses the copied building territory and collision rules in preview and tactical legality',()=>{
 const b=mirrorBattle('ultimate-battle-kitchen');play(b,0,0,9,22);advance(b,1);
 const enemy=b.towers.find(t=>t.team===1&&!t.king),preview=b.placementPreview(0,0,enemy.x,enemy.y);
 assert.equal(preview.building,true);assert.equal(preview.cardEntity,'UltimateBattleKitchen');assert.equal(preview.ok,false);
 assert.equal(AI.observe(b,0).legal(0,enemy.x,enemy.y),false);assert.equal(b.deploy(0,0,enemy.x,enemy.y).ok,false);assert.equal(b.hand[0][0],'ultimate-mirror');
});
test('Ultimate Mirror copies a hero as an ordinary base card without abilities or extra form charges',()=>{
 const b=mirrorBattle('ultimate-mega-minion-horde',{forms:['ultimate-mega-minion-horde-hero'],formContext:{arena:28,casual:true}});
 play(b,0,0);assert.ok(b.units.every(u=>u.entity==='MegaMinionHero'&&u.abilityState));const cycles=[...b.formState.cycles[0]];
 advance(b,1);const preview=b.placementPreview(0,0,12*S,22*T);assert.equal(preview.members.length,6);assert.ok(preview.members.every(m=>m.entity==='MegaMinion'));
 play(b,0,0,12,22);assert.equal(b.units.length,12);assert.ok(b.units.slice(6).every(u=>u.entity==='MegaMinion'&&u.level===12&&!u.abilityState&&!u.formId));assert.deepEqual(b.formState.cycles[0],cycles);
});
test('Ultimate Mirror resolves copied Builder targets in Ultimate AI and enforces the three Builder cap',()=>{
 const b=mirrorBattle('ultimate-builder'),u=b.spawn('GoblinCage',0,9*S,22*T,{wait:0});
 play(b,0,0,9,22);advance(b,1);b.elixir[0]=6;
 assert.equal(Ultimate.aiPlay(b,0),true);assert.equal(u.ultimate.builders,2);assert.equal(b.elixir[0],0);
 b.hand[0][0]='ultimate-mirror';b.slotReady[0][0]=0;b.elixir[0]=6;Ultimate.aiPlay(b,0);assert.equal(u.ultimate.builders,3);assert.equal(b.elixir[0],0);
 b.hand[0][0]='ultimate-mirror';b.slotReady[0][0]=0;b.elixir[0]=6;b.slotReady[0].fill(Infinity,1);Ultimate.aiPlay(b,0);assert.equal(b.elixir[0],6);assert.equal(b.placementPreview(0,0,u.x,u.y).ok,false);
});
test('Ultimate Mirror delayed Spirit Festival copies retain the casting seat and boosted level',()=>{
 const b=mirrorBattle('ultimate-spirit-festival',{mode:'UltimateClash3v3',seatLevels:[{}, {}, {}, {}, {'ultimate-spirit-festival':16,'ultimate-mirror':9}]});
 // Give seat four the same ordered deck while preserving its independent loadout.
 b.hand[4]=[...b.hand[0]];b.queue[4]=[...b.queue[0]];b.handSlots[4]=[...b.handSlots[0]];b.queueSlots[4]=[...b.queueSlots[0]];
 play(b,4,0,9,23);advance(b,1);play(b,4,0,9,22);
 const pending=b.pending.filter(p=>p.ultimate==='festival-pair'&&p.level===19);assert.equal(pending.length,8);assert.ok(pending.every(p=>p.owner===4&&p.team===0));
 const copied=new Map();for(let i=0;i<480;i++){b.step(1/60);for(const u of b.units)if(u.card==='ultimate-spirit-festival'&&u.level===19)copied.set(u.id,u);}
 assert.equal(copied.size,16);assert.ok([...copied.values()].every(u=>u.owner===4&&u.team===0));
 assert.equal(b.lastCard[0],null);assert.deepEqual(b.lastCard[4],{id:'ultimate-spirit-festival',level:16,cost:7});
});
test('normal Mirror retains its own level offset and ten elixir cap',()=>{
 const b=quiet({mode:'Default',levels:{mirror:16,knight:1}});b.hand[0][0]='mirror';b.lastCard[0]={id:'knight',level:1,cost:10};b.elixir[0]=10;
 assert.equal(b.card(0,0).cost,10);assert.equal(b.placementPreview(0,0,9*S,22*T).level,17);assert.equal(b.deploy(0,0,9*S,22*T).ok,true);assert.equal(b.units[0].level,17);assert.equal(b.elixir[0],0);assert.deepEqual(b.lastCard[0],{id:'knight',level:1,cost:10});
});
test('normal Mirror leaves evolution charge untouched and copies the ordinary form',()=>{
 const deck=['knight','archers','giant','fireball','mirror','musketeer','bomber','arrows'],b=quiet({mode:'Default',deck,enemyDeck:deck,levels:{knight:11,mirror:12},forms:['Knight_EV1'],formContext:{arena:28,casual:true,unlockedForms:['Knight_EV1']}});
 b.formState.cycles[0][0]=2;b.elixir[0]=10;assert.equal(b.deploy(0,0,6*S,22*T).ok,true);assert.equal(b.units[0].entity,'Knight_EV1');assert.equal(b.formState.cycles[0][0],0);assert.equal(b.hand[0][0],'mirror');
 advance(b,1);b.elixir[0]=10;assert.equal(b.deploy(0,0,12*S,22*T).ok,true);assert.equal(b.units[1].entity,'Knight');assert.equal(b.units[1].level,13);assert.equal(b.elixir[0],6);assert.equal(b.formState.cycles[0][0],0);assert.equal(b.units[1].formId,null);
});
test('Bandit Squad deploys four native Bandits and a Boss Bandit at their owner level with working dashes',()=>{
 const b=mirrorBattle('ultimate-bandit-squad',{mode:'UltimateClash2v2',seatLevels:[{}, {}, {'ultimate-bandit-squad':14}]});
 b.hand[2]=[...b.hand[0]];b.queue[2]=[...b.queue[0]];b.handSlots[2]=[...b.handSlots[0]];b.queueSlots[2]=[...b.queueSlots[0]];
 play(b,2,0,9,22);assert.equal(b.elixir[2],2);assert.deepEqual(b.units.map(u=>u.entity).sort(),['Assassin','Assassin','Assassin','Assassin','BossBandit']);assert.ok(b.units.every(u=>u.owner===2&&u.team===0&&u.level===14&&!u.abilityState));
 const squad=[...b.units];for(const u of squad)b.spawn('Pekka',1,u.x,u.y-5*T,{wait:100});const dashed=new Set();
 for(let i=0;i<210;i++){b.step(1/60);for(const u of squad)if(u.dash)dashed.add(u.id);}
 assert.equal(dashed.size,5);for(const u of squad)assert.ok(b.events.some(e=>e.type==='damage'&&e.source===u.id),u.entity+' damages an enemy after its native dash');
});
