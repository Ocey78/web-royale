// Deterministic paired comparison: both policies use the same deck, king level,
// starting resources and battle implementation. Side assignment is swapped.
const C=require('../src/core.js'),fs=require('node:fs'),path=require('node:path');
const results=[];const seeds=Number(process.env.SEEDS||3),offset=Number(process.env.SEED_OFFSET||0);if(!Number.isInteger(seeds)||seeds<1||seeds>100||!Number.isInteger(offset)||offset<0)throw Error('SEEDS must be 1..100 and SEED_OFFSET a nonnegative integer');const start=Date.now();
for(let d=0;d<C.PRESETS.length;d++)for(let seed=1;seed<=seeds;seed++)for(let side=0;side<2;side++){
 const b=new C.Battle({ai:false,shuffleDeck:true,seed:(seed+offset)*319+d,deck:C.PRESETS[d],enemyDeck:C.PRESETS[d]});
 let legacyNext=2,tacticalNext=1.2,leak=[0,0];
 for(let frame=0;frame<310*30&&!b.result;frame++){
  if(b.time>=tacticalNext){b.aiPlay(side);tacticalNext=b.time+.25;}
  if(b.time>=legacyNext){b.legacyAIPlay(1-side);legacyNext=b.time+.6+b.random()*1.1;}
  for(let t=0;t<2;t++)if(b.elixir[t]>=9.99)leak[t]+=1/30;
  b.step(1/30);
 }
 const r={deck:d,seed:seed+offset,side,winner:b.result?.winner??-1,win:b.result?.winner===side,draw:b.result?.winner===-1,crowns:b.crowns,seconds:+b.time.toFixed(2),played:b.played,leakSeconds:leak.map(x=>+x.toFixed(2))};results.push(r);console.log(JSON.stringify(r));
}
const summary={protocol:'Paired same-deck shuffled-opening matches; identical level/economy; both arena sides; tactical vs v0.5 random baseline; no claims about native matches or human skill.',seedOffset:offset,matches:results.length,wins:results.filter(r=>r.win).length,draws:results.filter(r=>r.draw).length,losses:results.filter(r=>!r.win&&!r.draw).length,elapsedSeconds:(Date.now()-start)/1000,byDeck:C.PRESETS.map((d,i)=>({deck:i,cards:d,wins:results.filter(r=>r.deck===i&&r.win).length,draws:results.filter(r=>r.deck===i&&r.draw).length,matches:results.filter(r=>r.deck===i).length})),results};
fs.mkdirSync(path.join(__dirname,'../docs/qa/v060'),{recursive:true});fs.writeFileSync(path.join(__dirname,'../docs/qa/v060/ai-benchmark.json'),JSON.stringify(summary,null,2));console.log(summary.wins,summary.draws,summary.losses);
