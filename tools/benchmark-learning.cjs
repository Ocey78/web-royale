'use strict';
// Explicit, deterministic offline evaluation. This does not grant game rewards.
const fs=require('node:fs'),path=require('node:path'),C=require('../src/core'),L=require('../src/learning');
const trials=Math.max(1,Math.min(50,Number(process.argv[2])||8)),training=Math.max(0,Math.min(100,Number(process.argv[3])||12));
const root=path.resolve(__dirname,'..'),output=path.join(root,'docs/qa/v110');fs.mkdirSync(output,{recursive:true});
const started=Date.now(),step=b=>{let n=0;while(!b.result&&n++<18600){if(n%15===0)b.aiPlay(0);b.step(1/60);}if(!b.result)throw Error('Match did not end');return b;};
let model=L.normalizeModel();const train=[];
for(let i=0;i<training;i++){
 const b=step(new C.Battle({mode:i%4===0?'TeamVsTeam':'Default',seed:20000+i*317,brain:new L.SharedBrain(model),shuffleDeck:true,practice:true,deck:C.PRESETS[i%5],enemyDeck:C.PRESETS[(i+2)%5]}));
 model=L.mergePacket(model,b.recorder.packet());train.push({seed:b.seed,mode:b.mode,winner:b.result.winner,time:b.time,updates:b.recorder.packet().delta.updates});
 console.log('Train',i+1,b.result.winner,Math.round(b.time),model.updates);
}
const evaluation=[];let wins=0,losses=0,draws=0;
for(let i=0;i<trials;i++)for(const learnedSeat of [0,1]){
 const blue=C.PRESETS[i%5],red=C.PRESETS[(i+1)%5],b=new C.Battle({seed:71000+i*101,shuffleDeck:true,learning:false,practice:true,deck:blue,enemyDeck:red});
 b.bots[learnedSeat].learner.brain=new L.SharedBrain(model);b.bots[1-learnedSeat].learner.brain=new L.SharedBrain();
 step(b);const w=b.result.winner,result=w<0?'draw':w===learnedSeat?'win':'loss';if(result==='win')wins++;else if(result==='loss')losses++;else draws++;
 evaluation.push({seed:b.seed,learnedSeat,result,duration:Math.round(b.time),crowns:b.crowns});console.log('Evaluate',i,learnedSeat,result);
}
const report={schema:1,scope:'In-simulator held-out paired matches, not native-game/human validation',training:train,evaluation,summary:{trainingMatches:training,evaluationMatches:trials*2,wins,losses,draws,updates:model.updates,nonzeroWeights:model.weights.filter(x=>Math.abs(x)>1e-8).length,seconds:(Date.now()-started)/1000},model};
fs.writeFileSync(path.join(output,'learning-evaluation.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report.summary,null,2));
