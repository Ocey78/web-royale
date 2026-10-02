'use strict';
// Exercise actual result grants and the application's result template. The tiny
// row object substitutes only DOM storage; reward calculations are not mocked.
const test=require('node:test'),A=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../src/core.js'),E=require('../src/economy.js');
function battle(id,winner=0,extra={}){return {id,result:{winner},crowns:winner===0?[1,0]:winner===1?[0,1]:[0,0],time:180,mode:'Default',queueType:'trophy-road',...extra};}
function fresh(extra={}){return C.normalizeProfile({version:11,gold:1000,gems:100,trophies:1000,...extra});}
function render(profile,b){
 const source=fs.readFileSync(require.resolve('../src/app.js'),'utf8');
 const start=source.indexOf('function renderEndReward()'),end=source.indexOf('function beginEndFlow()',start);
 A.ok(start>=0&&end>start,'live result renderer available');
 const row={innerHTML:'',hidden:false,setAttribute(){},classList:{toggle(){}}};
 const ctx={profile,battle:b,C,E,U:require('../src/cosmetics.js'),$:id=>id==='endBattleReward'?row:null,word:s=>s,fmt:n=>String(n),esc:s=>String(s),icon:(id,cls='',alt='')=>`<img data-ui="${id}" class="${cls}" alt="${alt}">`};
 vm.runInNewContext(source.slice(start,end)+';renderEndReward();',ctx);
 return row;
}
test('ranked gold tiers grant 100–300 extra per tier on every win after three',()=>{
 let p=fresh();for(let n=1;n<=16;n++){const before=p,b=battle('gold-milestone-'+n);p=C.applyResult(p,b);const extra=p.gold-before.gold-50;
 const tier=Math.floor(n/3);A.ok(extra>=100*tier&&extra<=300*tier,'expected stacked gold at streak '+n);
 A.equal(p.history[0].streakGoldBonus,extra);A.equal(p.history[0].goldEarned,p.gold-before.gold);}
});
test('ranked gems grant 1–10 per tier on every win after five',()=>{
 let p=fresh();for(let n=1;n<=16;n++){const before=p;p=C.applyResult(p,battle('gems-milestone-'+n));const extra=p.gems-before.gems;
 const tier=Math.floor(n/5);A.ok(extra>=tier&&extra<=10*tier,'expected stacked gems at streak '+n);
 A.equal(p.history[0].streakGemBonus,extra);A.equal(p.history[0].gemsEarned,extra);}
});
test('first-tier rolls vary across matches, stay stable for the same receipt, and include both range endpoints',()=>{
 const gold=new Set(),gems=new Set(),p=fresh({winStreak:2}),g=fresh({winStreak:4});
 for(let n=0;n<1200;n++){const b=battle('currency-roll-'+n),q=C.applyResult(p,b),t=C.applyResult(g,b);gold.add(q.gold-p.gold-50);gems.add(t.gems-g.gems);if(n<5){const r=C.applyResult(p,b);A.equal(q.gold,r.gold);A.equal(q.gems,r.gems);}}
 A.equal(Math.min(...gold),100);A.equal(Math.max(...gold),300);A.ok(gold.size>180);A.equal(Math.min(...gems),1);A.equal(Math.max(...gems),10);A.equal(gems.size,10);
});
test('15th ranked win produces matching chest, gold and gem boxes from the receipt',()=>{
 const p=fresh({winStreak:14}),b=battle('boxes-15'),q=C.applyResult(p,b),before=JSON.stringify(q),row=render(q,b);
 A.equal(row.hidden,false);for(const kind of ['chest','gold','gems'])A.match(row.innerHTML,new RegExp(`data-reward-kind="${kind}"`));
 A.equal((row.innerHTML.match(/class="end-reward-box/g)||[]).length,3);
 A.ok(row.innerHTML.includes('+'+(q.gold-p.gold)),'gold box displays base + bonus actually credited');
 A.ok(row.innerHTML.includes('+'+(q.gems-p.gems)),'gem box displays the credited gems');
 A.equal(JSON.stringify(q),before,'rendering cannot modify reward balances');
});
test('ordinary win has chest and base gold boxes but no zero-gem or stale-streak box',()=>{
 const p=fresh({winStreak:0,lastStreakGoldBonus:250,lastStreakGemBonus:9}),b=battle('boxes-normal'),q=C.applyResult(p,b),row=render(q,b);
 A.equal(q.gold-p.gold,50);A.equal(q.gems-p.gems,0);A.match(row.innerHTML,/data-reward-kind="gold"/);A.match(row.innerHTML,/\+50/);A.doesNotMatch(row.innerHTML,/data-reward-kind="gems"/);
});
test('full chest inventory does not suppress earned currency boxes',()=>{
 const p=fresh({winStreak:14,chests:Array.from({length:4},(_,i)=>({id:'old-chest-'+i,kind:'silver'}))}),b=battle('boxes-full'),q=C.applyResult(p,b),row=render(q,b);
 A.equal(q.chests.length,4);A.doesNotMatch(row.innerHTML,/data-reward-kind="chest"/);A.match(row.innerHTML,/data-reward-kind="gold"/);A.match(row.innerHTML,/data-reward-kind="gems"/);
});
test('loss/draw reset ranked streak, show actual base gold only, and restart rewards at three wins',()=>{
 for(const [winner,base]of [[1,10],[-1,20]]){const p=fresh({winStreak:14}),b=battle('reset-'+winner,winner);let q=C.applyResult(p,b);A.equal(q.winStreak,0);A.equal(q.gold-p.gold,base);A.equal(q.gems,p.gems);A.equal(q.history[0].goldEarned,base);const row=render(q,b);A.match(row.innerHTML,new RegExp('\\+'+base));A.doesNotMatch(row.innerHTML,/data-reward-kind="gems"/);
 for(let n=1;n<=3;n++){const before=q.gold;q=C.applyResult(q,battle('after-reset-'+winner+'-'+n));if(n<3)A.equal(q.gold-before,50);else A.ok(q.gold-before>=150);}}
});
test('non-ranked wins keep the ranked streak and grant base gold without milestone currency',()=>{
 for(const extra of [{mode:'RandomDeck',queueType:'challenge'},{mode:'FourCardDeck',queueType:'challenge'},{queueType:'2v2',is2v2:true}]){const p=fresh({winStreak:14}),b=battle('nonranked-'+extra.mode,0,extra),q=C.applyResult(p,b);A.equal(q.winStreak,14);A.equal(q.trophies,p.trophies);A.equal(q.gold-p.gold,50);A.equal(q.gems,p.gems);A.equal(q.history[0].streakGoldBonus,0);A.equal(q.history[0].streakGemBonus,0);A.doesNotMatch(render(q,b).innerHTML,/data-reward-kind="gems"/);}
});
test('training/friendly/replay/sandbox screens cannot show or pay normal currency rewards',()=>{
 for(const extra of [{queueType:'training'},{queueType:'friendly'},{queueType:'clan-war'},{queueType:'self-play'},{isReplay:true},{practice:true}]){const p=fresh({winStreak:14}),b=battle('no-reward-'+JSON.stringify(extra),0,extra),q=C.applyResult(p,b);A.equal(q.gold,p.gold);A.equal(q.gems,p.gems);A.equal(q.winStreak,14);A.equal(render(q,b).hidden,true);}
 const p=fresh({winStreak:14}),b=battle('sandbox-screen'),q=C.applyResult(p,b);A.equal(render(q,{...b,isSandbox:true}).hidden,true);
});
test('result history survives saves; duplicate settlement and repeated rendering never repay currency',()=>{
 const p=fresh({winStreak:14}),b=battle('duplicate-reward'),q=C.applyResult(p,b),saved=C.normalizeProfile(JSON.parse(JSON.stringify(q)));
 A.deepEqual(saved.history[0],q.history[0]);A.deepEqual(C.applyResult(saved,b),saved);const html=render(saved,b).innerHTML;for(let i=0;i<3;i++)A.equal(render(saved,b).innerHTML,html);
 const other=C.applyResult(saved,battle('next-reward'));A.deepEqual(C.applyResult(other,b),other);
});
test('display receipts reflect currency actually credited at the save balance caps',()=>{
 const p=fresh({winStreak:14,gold:9999990,gems:9999998}),b=battle('currency-cap'),q=C.applyResult(p,b);
 A.equal(q.history[0].goldEarned,q.gold-p.gold);A.equal(q.history[0].gemsEarned,q.gems-p.gems);A.equal(q.history[0].goldEarned,9);
 const row=render(q,b);A.ok(row.innerHTML.includes('+9'));
});
test('normalizing an old save does not grant retrospective streak gold or gems',()=>{
 const p=fresh({winStreak:20,gold:1234,gems:456});A.equal(p.gold,1234);A.equal(p.gems,456);A.equal(p.lastStreakGoldBonus,0);A.equal(p.lastStreakGemBonus,0);
});
test('Trophy Road no longer renders its old wild-card inventory shortcut; reward tiles remain',()=>{
 const app=fs.readFileSync(require.resolve('../src/app.js'),'utf8'),start=app.indexOf('function road('),end=app.indexOf('function roadLabel(',start),body=app.slice(start,end);
 A.ok(start>=0);A.doesNotMatch(body,/button\('Reward Inventory','road-inventory'/);A.match(body,/data-action="road-reward"/);
});
