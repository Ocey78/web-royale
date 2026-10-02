'use strict';
const test=require('node:test'),A=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const C=require('../src/core.js'),P=require('../src/profile.js'),L=require('../src/learning.js'),D=require('../src/training-decks.js'),E=require('../src/economy.js');

test('v140 fresh profile starts at zero trophies with only starter eight unlocked at base rarity levels',()=>{
 const p=P.normalizeProfile();
 A.equal(p.trophies,0);A.equal(p.highestTrophies,0);A.equal(p.level,1);
 A.deepEqual([...p.unlockedCards].sort(),[...C.DEFAULT_DECK].sort());
 for(const c of C.CARDS)A.equal(p.cardLevels[c.id],C.baseLevel(c.rarity),c.id);
 for(const deck of p.decks)A.deepEqual(deck,C.DEFAULT_DECK);
});

test('v140 old saves infer ownership without deleting existing cards',()=>{
 const p=P.normalizeProfile({trophies:980,cardLevels:{knight:9,'mother-witch':9},copies:{knight:20,'mother-witch':1},decks:[[...C.DEFAULT_DECK],...P.PRESETS.slice(1)]});
 A.equal(p.trophies,980);A.ok(p.unlockedCards.includes('knight'));A.ok(p.unlockedCards.includes('mother-witch'));
});

test('v140 chest discovery unlocks newly received cards',()=>{
 const p=P.normalizeProfile();
 const locked=C.CARDS.find(c=>!p.unlockedCards.includes(c.id)&&c.arena==='Arena1');
 A.ok(locked);
 const r=E.grant(p,{gold:0,cards:[{id:locked.id,count:1}]},{discover:true});
 A.ok(r.unlockedCards.includes(locked.id));A.equal(r.copies[locked.id],1);
});

test('v140 Electro Giant reflection ignores spell proxy attackers instead of crashing on ZapFreeze',()=>{
 const seed=75697,b=new C.Battle({seed,brain:new L.SharedBrain(),ai:true,mode:'Default',shuffleDeck:true,practice:true,recording:'compact',headless:true,
  deck:D.randomDeck(seed+11),enemyDeck:D.randomDeck(seed+97)});
 for(let frame=0;frame<900&&!b.result;frame++){if(frame%5===0)b.aiPlay(0);A.doesNotThrow(()=>b.step(.05));}
 A.ok(b.time>34,'must cross the previously crashing timestamp');
});

test('v140 addBuff safely rejects non-entity spell proxies',()=>{
 const b=new C.Battle({ai:false});
 const proxy={id:0,team:0,hp:1,def:{source:{}},building:false};
 A.doesNotThrow(()=>b.addBuff(proxy,'ZapFreeze',.5,1,9));
 A.equal(proxy.buffs,undefined);
});

test('v140 loop restarts preserve high-concurrency acknowledgement',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../src/app.js'),'utf8');
 A.match(app,/riskAcknowledged/);
 A.match(app,/loopRestart\?trainingPreferences\.riskAcknowledged/);
});
