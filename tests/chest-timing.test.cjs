const test=require('node:test'),assert=require('node:assert/strict'),E=require('../src/economy.js'),P=require('../src/profile.js');
test('win gates replace elapsed chest timers while the historical source waits remain reference data',()=>{
 assert.deepEqual(['silver','gold','magic'].map(k=>E.CHART[k].wait),[10800,28800,43200].map(n=>n*1000));
 for(const [kind,need] of [['silver',1],['gold',3],['magic',4],['legendary',10],['giant',5]]){
  let p=P.normalizeProfile({chests:[{id:'x',kind,unlockAt:0}]});
  assert.equal(p.chests[0].winsRequired,need);assert.equal(E.unlockChest(p,'x').ok,false);
  assert.equal(E.openChest(p,'x',9e12).ok,false);
  for(let i=0;i<need;i++)p=P.applyResult(p,{id:kind+'-'+i,time:10,crowns:[1,0],result:{winner:0}});
  const q=E.openChest(p,'x');assert.equal(q.ok,true);assert.equal(E.openChest(q.profile,'x').ok,false);
 }
});
