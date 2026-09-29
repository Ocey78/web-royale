const test=require('node:test'),A=require('node:assert/strict'),C=require('../src/core');
const mirrorDeck=['mirror','knight','archers','giant','mini-pekka','musketeer','fireball','arrows'];
test('source global excludes Mirror from both opening hands without changing the saved deck',()=>{
 A.equal(C.DATA.globals.LOGIC_MIRROR_NEVER_ON_OPENING_HAND.BooleanValue,true);
 const b=new C.Battle({deck:mirrorDeck,enemyDeck:mirrorDeck,ai:false});
 for(const team of [0,1]){A.ok(!b.hand[team].includes('mirror'));A.ok(b.queue[team].includes('mirror'));A.deepEqual(b.initialDecks[team],mirrorDeck);A.equal(new Set([...b.hand[team],...b.queue[team]]).size,8);}
});
test('Mirror uses its own level plus the source offset rather than the preceding card level',()=>{
 const b=new C.Battle({ai:false,levels:{mirror:12,knight:1}});b.hand[0][0]='mirror';b.lastCard[0]={id:'knight',level:1,cost:3};b.elixir[0]=10;
 A.equal(b.deploy(0,0,100,420).ok,true);A.equal(b.units[0].level,12+C.DATA.globals.MIRROR_LEVEL_OFFSET.NumberValue);A.equal(b.elixir[0],6);
});
test('SpellAsDeploy rolling cards cannot be cast in enemy territory with intact towers',()=>{
 for(const id of ['the-log','barbarian-barrel','royal-delivery']){const b=new C.Battle({ai:false});b.hand[0][0]=id;b.elixir[0]=10;A.equal(b.deploy(0,0,100,100).ok,false,id);A.equal(b.elixir[0],10);}
});
test('CanPlaceOnBuildings permits a Royal Delivery on an allied tower',()=>{
 const b=new C.Battle({ai:false}),t=b.towers.find(t=>t.team===0&&!t.king);b.hand[0][0]='royal-delivery';b.elixir[0]=10;
 A.equal(C.CARD_BY_ID['royal-delivery'].source.CanPlaceOnBuildings,true);A.equal(b.deploy(0,0,t.x,t.y).ok,true);
});
test('spell damage resolves the original secondary projectile and area projectile',()=>{
 for(const [id,entity]of [['the-log','LogProjectileRolling'],['barbarian-barrel','BarbLogProjectileRolling'],['royal-delivery','RoyalDeliveryProjectile']]){const d=C.cardAt(id,9),p=C.DATA.projectiles[entity];A.equal(d.damage,C.scaled(p.Damage,p.Rarity,9),id);}
});
test('card detail metadata identifies spell ticks, durations and delivered troops',()=>{
 A.equal(C.cardAt('arrows').damageMode,'per wave');A.equal(C.cardAt('poison').damageMode,'per second');A.equal(C.cardAt('freeze').duration,4);A.equal(C.cardAt('goblin-barrel').spawnEntity,'Goblin');A.equal(C.cardAt('goblin-barrel').count,3);A.equal(C.cardAt('royal-delivery').spawnEntity,'DeliveryRecruit');
});
test('Heal Spirit is classified as a troop despite its original spells table',()=>{
 A.equal(C.CARDS.filter(c=>c.kind==='Troop').length,72);A.equal(C.CARDS.filter(c=>c.kind==='Building').length,12);A.equal(C.CARDS.filter(c=>c.kind==='Spell').length,18);
});
