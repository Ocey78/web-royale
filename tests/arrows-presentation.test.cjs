const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const K=require('../src/core'),FX=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/game/fx-data.json')));
const deck=['arrows','knight','archers','giant','musketeer','bomber','minions','cannon'];
function battle(){return new K.Battle({ai:false,deck,enemyDeck:deck,seed:817});}
function advance(b,time){while(b.time<time-1e-8)b.step(1/60);}
test('arrow visual events remain alive through the full authored ground-arrow lifetime',()=>{
 const b=battle(),r=FX.emitters['Arrows Hit Ground'][0],life=r.ParticleMaxLife/1000;
 b.cast(K.cardAt('arrows',9),0,240,260);
 const visuals=b.pending.filter(e=>e.kind==='arrowsFly');assert.equal(visuals.length,3);
 for(const e of visuals)assert.ok(e.ttl>=e.flightDuration+life,`visual ttl ${e.ttl} truncates ${life}s embedded arrows`);
 advance(b,2.5);assert.equal(b.effects.filter(e=>e.kind==='arrowsFly').length,3,'ground arrows still present after the volley');
 advance(b,3.4);assert.equal(b.effects.filter(e=>e.kind==='arrowsFly').length,0,'expired arrow decorations must be removed');
});
test('longer arrow decorations preserve all three damage waves and their original cadence',()=>{
 const b=battle(),tower=b.towers.find(t=>t.team===1&&!t.king),start=tower.hp,calls=[],impact=b.projectileImpact.bind(b);
 b.projectileImpact=(p,t)=>{if(p.name==='ArrowsSpell')calls.push(b.time);return impact(p,t);};
 b.cast(K.cardAt('arrows',9),0,tower.x,tower.y);advance(b,.9);assert.equal(tower.hp,start);
 advance(b,1.05);const one=start-tower.hp;assert.ok(one>0);advance(b,1.25);assert.equal(start-tower.hp,one*2);advance(b,1.45);assert.equal(start-tower.hp,one*3);
 advance(b,3.4);assert.equal(start-tower.hp,one*3);assert.equal(calls.length,3);for(let i=0;i<3;i++)assert.ok(Math.abs(calls[i]-(1+i*.2))<1/60+1e-8);
});
