const test=require('node:test'),A=require('node:assert/strict'),C=require('../src/core.js'),M=require('../src/modern-actions.js');
test('every supported current card takes part in sustained fights under source deck rules',()=>{
 const supported=M.coverage().cards.rows.filter(row=>row.ok).map(row=>row.id),champion=id=>C.CARDS.find(card=>card.id===id).rarity==='Champion',pending=[...supported],groups=[];
 A.ok(supported.length>=120,'current source capability coverage must not shrink');
 while(pending.length){const deck=[];let heroes=0;for(let i=0;i<pending.length&&deck.length<8;){const id=pending[i];if(champion(id)&&heroes>=2){i++;continue;}deck.push(id);heroes+=champion(id)?1:0;pending.splice(i,1);}for(const id of C.DEFAULT_DECK)if(deck.length<8&&!deck.includes(id)&&supported.includes(id)&&!champion(id))deck.push(id);A.equal(deck.length,8);A.ok(deck.filter(champion).length<=2);groups.push(deck);}
 const seen=new Set();for(let group=0;group<groups.length;group++){
  const b=new C.Battle({deck:groups[group],enemyDeck:groups[(group+4)%groups.length],queue:'challenge',seatForms:[[],[]],seed:group+123,mode:'7xElixir',ai:false});b.towers.forEach(t=>{t.hp=t.maxHp=50000;});
  for(let frame=0;frame<3600&&!b.result;frame++){
   if(frame%30===0)for(const team of [0,1]){b.elixir[team]=10;const slot=(frame/30)%4,card=b.card(team,slot);if(card.id==='mirror'&&!b.lastCard[team])b.lastCard[team]={id:'knight',level:11,cost:3};const r=b.deploy(team,slot,(frame%120===0?4:14)*C.SX,(team?11:21)*C.SY);if(r.ok)seen.add(card.id);}
   b.step(1/60);A.ok(b.units.length<=500);A.ok(b.projectiles.length<1000);
   if(frame%60===0)for(const u of b.active){A.ok(Number.isFinite(u.x)&&Number.isFinite(u.y)&&Number.isFinite(u.hp),u.entity);A.ok(u.hp>=0&&u.hp<=Math.max(u.maxHp,M.healingLimit(b,u))+1,u.entity+' exceeded source healing limit');}
  }
 }
 A.deepEqual([...seen].sort(),[...supported].sort(),'every supported card including Mirror must be deployed');
});
test('six selectable event modes finish within their timeline plus the visible tiebreak',()=>{for(const mode of ['Default','DoubleElixir','TripleElixir','RampUp','SuddenDeath','7xElixir']){const b=new C.Battle({mode,seed:42}),deadline=b.timeline.SectionLength.reduce((a,n)=>a+n,0)+4.1;for(let i=0;i<Math.ceil(deadline/.05)&&!b.result;i++){if(i%20===0)b.aiPlay(0);b.step(.05);}A.ok(b.result,mode);A.ok(b.time<=deadline,mode+' exceeded ending deadline');if(b.tiebreaker)A.ok(Math.abs(b.result.time-b.tiebreaker.startedAt-4)<1e-6);A.ok([-1,0,1].includes(b.result.winner));A.ok(b.elixir.every(x=>x>=0&&x<=10));}});
