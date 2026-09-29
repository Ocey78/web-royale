const test=require('node:test'),A=require('node:assert/strict');
const C=require('../src/core.js'),U=require('../src/menu-model.js'),Chest=require('../src/chest-rules.js');
test('v210 Decks list excludes all IDs in the active deck without mutating the catalogue',()=>{
 const before=C.CARDS.slice(),ids=new Set(C.DEFAULT_DECK);
 const out=U.filterCards(C.CARDS,'','all','rarity',{},C.DEFAULT_DECK);
 A.equal(out.length,C.CARDS.length-ids.size);A.ok(out.every(c=>!ids.has(c.id)));A.deepEqual(C.CARDS,before);
});
test('v210 Collection ignores deck membership and filters remain independent',()=>{
 A.equal(U.filterCards(C.CARDS).length,102);
 A.equal(U.filterCards(C.CARDS,'knight','all','name',{},['knight']).some(c=>c.id==='knight'),false);
 A.equal(U.filterCards(C.CARDS,'knight','all','name').some(c=>c.id==='knight'),true);
 const ids=['knight','knight'];A.equal(U.filterCards(C.CARDS,'','all','name',{},ids).length,101);
});
test('v210 chest label shows the required remaining wins, not progress fractions',()=>{
 A.equal(typeof Chest.label,'function');
 A.deepEqual(Chest.label({kind:'gold',winsProgress:1}),{title:'Locked',detail:'2 Wins',remaining:2,ready:false});
 A.deepEqual(Chest.label({kind:'gold',winsProgress:2}),{title:'Locked',detail:'1 Win',remaining:1,ready:false});
 A.deepEqual(Chest.label({kind:'gold',winsProgress:3}),{title:'Open now!',detail:'Ready!',remaining:0,ready:true});
});
test('v210 chest labels stay bounded and use actual kind requirements',()=>{
 A.equal(typeof Chest.label,'function');
 for(const [kind,n]of [['silver',1],['gold',3],['magic',4],['epic',5],['legendary',10]]){
  A.equal(Chest.label({kind,winsProgress:0,winsRequired:99}).remaining,n);
  A.equal(Chest.label({kind,winsProgress:999}).detail,'Ready!');
  A.equal(Chest.label({kind,winsProgress:NaN}).remaining,n);
 }
});
