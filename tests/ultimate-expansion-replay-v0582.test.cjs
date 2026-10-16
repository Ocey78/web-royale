'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../src/core'),R=require('../src/replay');
const additions=['mortar-battery','royale-recall','goblin-magnet','spirit-festival','dark-pact','battle-kitchen','royale-reinforcements','elixir-spell','dragon-king','bowler-giant'];
test('Ultimate replay digest includes custom projectile payload and already-hit units',()=>{
 const b=new C.Battle({mode:'UltimateClash',ai:false,headless:true});
 b.cast(C.cardAt('ultimate-bowler-giant',9),0,9*C.SX,22*C.SY,0);
 b.strike(b.units[0],b.towers.find(t=>t.team===1));
 const p=b.projectiles[0],before=R.digest(b);
 p.ultimate.hand=99;p.hit.add(999);
 assert.notDeepEqual(R.digest(b),before);
});
for(const [index,slug]of additions.entries())test(slug+' records and seeks through its real deployment',()=>{
 const mode=['UltimateClash','UltimateClash2v2','UltimateClash3v3'][index%3],seats=[2,4,6][index%3],owner=index%seats;
 const id='ultimate-'+slug,deck=[id,...C.ULTIMATE_CARDS.map(c=>c.id).filter(x=>x!==id).slice(0,7)];
 const b=new C.Battle({mode,ai:false,headless:true,seed:58200+index,decks:Array.from({length:seats},()=>deck)});
 R.captureInitial(b);
 while(b.elixir[owner]<b.card(owner,0).cost)b.step(1/60);
 const deployed=b.deploy(owner,0,9*C.SX,(owner%2?10:22)*C.SY);assert.equal(deployed.ok,true,deployed.reason);
 for(let frame=0;frame<540;frame++)b.step(1/60);
 const record=R.pack(b),s=new R.Session(record);s.seek(record.duration);
 assert.equal(s.error,null);assert.deepEqual(R.digest(s.battle),record.expected);
 s.seek(Math.max(0,record.duration-2));s.seek(record.duration);
 assert.equal(s.error,null);assert.deepEqual(R.digest(s.battle),record.expected);
});
