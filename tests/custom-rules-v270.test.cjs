'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../src/core.js');
const P = require('../src/profile.js');
const E = require('../src/economy.js');
const R = require('../src/progression.js');
const Chest = require('../src/chest-rules.js');
const Rules = require('../src/match-rules.js');
const Menu = require('../src/menu-model.js');

const HOUR = 3600000;
const NOW = Date.parse('2026-09-27T12:00:00Z');
function profile(extra = {}) {
  return P.normalizeProfile({...P.normalizeProfile(), ...extra});
}
function result(id, extra = {}) {
  return {id, result: {winner: 0}, crowns: [1, 0], time: 30,
    mode: 'Default', queueType: 'trophy-road', ...extra};
}
function rewards(p) {
  return {gold: p.gold, gems: p.gems, trophies: p.trophies, matches: p.matches,
    wins: p.wins, losses: p.losses, draws: p.draws, earnedCrowns: p.earnedCrowns,
    chests: p.chests, history: p.history.map(h => h.replayId)};
}
function noPurchase(out, original) {
  assert.equal(out.ok, false);
  assert.equal(out.profile.gold, original.gold);
  assert.deepEqual(out.profile.copies, original.copies);
  assert.deepEqual(out.profile.shopPurchases, original.shopPurchases);
}

test('reprocessing a non-latest battle cannot grant its rewards twice', () => {
  const a = result('receipt-a');
  const p = P.applyResult(P.applyResult(profile(), a), result('receipt-b'));
  assert.deepEqual(rewards(P.applyResult(p, a)), rewards(p));
});

test('result receipts survive save reload and Battle Log retention', () => {
  const first = result('receipt-before-history-window');
  let p = P.applyResult(profile(), first);
  for (let i = 0; i < 25; i++) p = P.applyResult(p, result('later-' + i));
  p = P.normalizeProfile(JSON.parse(JSON.stringify(p)));
  assert.equal(p.history.some(h => h.replayId === first.id), false);
  assert.deepEqual(rewards(P.applyResult(p, first)), rewards(p));
});

test('legacy Battle Log entries prevent duplicate rewards after migration', () => {
  const p = profile({lastResultId: 'legacy-latest', matches: 2, wins: 2,
    history: [
      {winner: 0, crowns: [1, 0], replayId: 'legacy-latest'},
      {winner: 0, crowns: [1, 0], replayId: 'legacy-earlier'}
    ]});
  assert.deepEqual(rewards(P.applyResult(p, result('legacy-earlier'))), rewards(p));
});

test('held chest labels use remaining wins with canonical aliases', () => {
  const costs = {silver: 1, gold: 3, golden: 3, magic: 4, magical: 4,
    legendary: 10, giant: 5, epic: 5, lightning: 5, 'mega-lightning': 5,
    'legendary-kings': 5, 'royal-wild': 5, wood: 5, crown: 5};
  for (const [kind, required] of Object.entries(costs)) {
    const p = profile({chests: [{id: kind, kind, winsProgress: 0}]});
    assert.equal(p.chests[0].winsRequired, required, kind);
    assert.deepEqual(Chest.label(p.chests[0]), {title: 'Locked',
      detail: required + (required === 1 ? ' Win' : ' Wins'), remaining: required, ready: false});
    p.chests[0].winsProgress = required - 1;
    assert.equal(Chest.label(p.chests[0]).detail, '1 Win');
    p.chests[0].winsProgress = required;
    assert.deepEqual(Chest.label(p.chests[0]),
      {title: 'Open now!', detail: 'Ready!', remaining: 0, ready: true});
  }
  assert.equal(Chest.label({kind: 'gold', winsProgress: 1}).detail, '2 Wins');
});

test('legacy ready timers migrate once while future timers never unlock by waiting', () => {
  assert.equal(Chest.ready(Chest.normalize({kind: 'golden', unlockAt: NOW - 1}, NOW)), true);
  const pending = Chest.normalize({kind: 'magical', unlockAt: NOW + HOUR}, NOW);
  assert.equal(pending.kind, 'magic');
  assert.equal(pending.unlockAt, 0);
  assert.equal(Chest.ready(Chest.normalize(pending, NOW + 100 * HOUR)), false);
  const gated = Chest.normalize({kind: 'silver', winsProgress: 0, unlockAt: 1}, NOW);
  assert.equal(Chest.ready(gated), false);
});

test('wins advance previously held chests before awarding a new zero-progress chest', () => {
  const p = profile({chests: [{id: 'held', kind: 'gold', winsProgress: 1}]});
  const out = P.applyResult(p, result('new-victory-chest'));
  assert.equal(out.chests.find(c => c.id === 'held').winsProgress, 2);
  assert.equal(out.chests.find(c => c.id === 'new-victory-chest').winsProgress, 0);
  assert.equal(p.chests[0].winsProgress, 1, 'the supplied save is not mutated');
  assert.deepEqual(rewards(P.applyResult(out, result('new-victory-chest'))), rewards(out));
});

test('losses and draws never advance held chest wins', () => {
  const p = profile({chests: [{id: 'held', kind: 'legendary', winsProgress: 2}]});
  for (const winner of [1, -1]) {
    const out = P.applyResult(p, result('not-a-win-' + winner, {result: {winner}}));
    assert.equal(out.chests.length, 1);
    assert.equal(out.chests[0].winsProgress, 2);
  }
});

test('practice queues, cheats, and replays cannot farm held chest progress', () => {
  const p = profile({chests: [{id: 'held', kind: 'legendary', winsProgress: 2}]});
  for (const queue of ['training', 'friendly', 'clan-war', 'self-play', 'replay']) {
    const out = P.applyResult(p, result('practice-' + queue, {queueType: queue}));
    assert.equal(out.gold, p.gold, queue);
    assert.deepEqual(out.chests, p.chests, queue);
    assert.equal(out.earnedCrowns, p.earnedCrowns, queue);
  }
  for (const cheat of ['duplicates', 'placement', 'overlevels', 'elixir']) {
    const cheatProfile = profile({...p, cheats: {[cheat]: true}});
    const battle = new C.Battle({queue: 'trophy-road', profile: cheatProfile, ai: false});
    battle.result = {winner: 0}; battle.crowns = [3, 0];
    assert.equal(battle.practice, true);
    const out = P.applyResult(cheatProfile, battle);
    assert.equal(out.gold, cheatProfile.gold, cheat);
    assert.deepEqual(out.chests, cheatProfile.chests, cheat);
  }
  assert.deepEqual(rewards(P.applyResult(p, result('replay', {isReplay: true}))), rewards(p));
});

test('party and challenge wins progress chests without changing trophies', () => {
  const p = profile({trophies: 1000, chests: [{id: 'held', kind: 'gold', winsProgress: 0}]});
  for (const queue of ['challenge', '2v2']) {
    const out = P.applyResult(p, result('party-' + queue, {queueType: queue}));
    assert.equal(out.chests[0].winsProgress, 1);
    assert.equal(out.trophies, 1000);
    assert.equal(out.gold, p.gold + 50);
  }
});

test('four occupied chest slots stay capped and ready chests retain readiness', () => {
  const p = profile({chests: ['a', 'b', 'c', 'd'].map(id => ({id, kind: 'silver', winsProgress: 1}))});
  const out = P.applyResult(p, result('full-slots'));
  assert.deepEqual(out.chests.map(c => c.id), ['a', 'b', 'c', 'd']);
  assert.ok(out.chests.every(c => c.winsProgress === 1 && Chest.ready(c)));
});

test('Chest Key marks ready once and separate opening consumes the chest once', () => {
  const p = profile({magicItems: {'chest-key': 2},
    chests: [{id: 'key-target', kind: 'legendary', winsProgress: 2}]});
  const keyed = E.useMagicItem(p, 'chest-key', 'key-target');
  assert.equal(keyed.ok, true);
  assert.equal(keyed.profile.chests.length, 1);
  assert.equal(keyed.profile.chests[0].winsProgress, 10);
  assert.equal(keyed.profile.magicItems['chest-key'], 1);
  const twice = E.useMagicItem(keyed.profile, 'chest-key', 'key-target');
  assert.equal(twice.ok, false);
  assert.equal(twice.profile.magicItems['chest-key'], 1);
  const opened = E.openChest(keyed.profile, 'key-target');
  assert.equal(opened.ok, true);
  assert.equal(opened.profile.chests.length, 0);
  const duplicate = E.openChest(opened.profile, 'key-target');
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.profile.gold, opened.profile.gold);
  assert.deepEqual(duplicate.profile.copies, opened.profile.copies);
});

test('old held chests draw from the highest reached arena at opening', () => {
  let expanded = false;
  for (let seed = 0; seed < 80 && !expanded; seed++) {
    const p = profile({trophies: 0, highestTrophies: 1300,
      chests: [{id: 'old-arena-' + seed, kind: 'magic', arenaNumber: 1, winsProgress: 4}]});
    const out = E.openChest(p, p.chests[0].id);
    assert.equal(out.ok, true);
    assert.equal(out.reward.arenaNumber, 5);
    assert.ok(out.reward.cards.every(c => R.cardArenaNumber(C.CARD_BY_ID[c.id], C.DATA.arenas) <= 5));
    expanded = out.reward.cards.some(c => R.cardArenaNumber(C.CARD_BY_ID[c.id], C.DATA.arenas) > 1);
  }
  assert.equal(expanded, true, 'an earlier chest can grant newly eligible cards');
});

test('Shop chest rewards reveal immediately without occupying held chest slots', () => {
  const p = profile({gems: 100, chests: [{id: 'held', kind: 'gold', winsProgress: 0}]});
  const out = E.buyChest(p, 'magic', 'instant-reward');
  assert.equal(out.ok, true);
  assert.equal(out.profile.gems, 50);
  assert.equal(out.profile.gold, p.gold + 800);
  assert.deepEqual(out.profile.chests, p.chests);
  assert.ok(out.reward.cards.length > 0);
});

test('Hour Shop keeps twelve rarity-ordered slots and locks unavailable rarities', () => {
  const p = profile();
  const offers = E.offers(NOW, p);
  assert.deepEqual(offers.map(o => o.rarity),
    ['Common', 'Common', 'Common', 'Rare', 'Rare', 'Rare', 'Epic', 'Epic', 'Epic', 'Legendary', 'Legendary', 'Legendary']);
  assert.ok(offers.slice(9).every(o => o.locked && o.id === null));
  for (const o of offers.filter(o => !o.locked)) {
    assert.ok(C.DEFAULT_DECK.includes(o.id) || R.cardArenaNumber(C.CARD_BY_ID[o.id], C.DATA.arenas) <= 1);
  }
  noPurchase(E.purchaseCard(p, 9, NOW, E.shopWindow(NOW)), p);
});

test('Hour Shop offers and purchased slots remain stable until the hourly boundary', () => {
  const p = profile({trophies: 4600, gold: 10000});
  const offers = E.offers(NOW, p), window = E.shopWindow(NOW);
  const out = E.purchaseCard(p, 0, NOW, window, offers[0].id);
  assert.equal(out.ok, true);
  assert.equal(out.profile.gold, 9900);
  assert.equal(out.profile.copies[offers[0].id], p.copies[offers[0].id] + 20);
  assert.deepEqual(E.offers(NOW + HOUR - 1, out.profile), offers);
  noPurchase(E.purchaseCard(out.profile, 0, NOW + HOUR - 1, window, offers[0].id), out.profile);
  assert.notEqual(E.shopWindow(NOW + HOUR), window);
  assert.notDeepEqual(E.offers(NOW + HOUR, out.profile), offers);
  const next = E.purchaseCard(out.profile, 0, NOW + HOUR, E.shopWindow(NOW + HOUR));
  assert.equal(next.ok, true);
  assert.equal(next.profile.gold, out.profile.gold - 100);
});

test('hourly countdown includes seconds and resets on the boundary', () => {
  assert.equal(Menu.refreshIn(NOW), '01:00:00');
  assert.equal(Menu.refreshIn(NOW + 1000), '00:59:59');
  assert.equal(Menu.refreshIn(NOW + HOUR - 1001), '00:00:02');
  assert.equal(Menu.refreshIn(NOW + HOUR - 1000), '00:00:01');
  assert.equal(Menu.refreshIn(NOW + HOUR), '01:00:00');
});

test('expired or changed shop offers reject without spending or granting copies', () => {
  const p = profile({trophies: 4600, gold: 10000});
  const offers = E.offers(NOW, p), window = E.shopWindow(NOW);
  noPurchase(E.purchaseCard(p, 0, NOW + HOUR, window, offers[0].id), p);
  const wrongCard = offers[0].id === 'knight' ? 'archers' : 'knight';
  noPurchase(E.purchaseCard(p, 0, NOW, window, wrongCard), p);
  const poor = profile({...p, gold: 99});
  noPurchase(E.purchaseCard(poor, 0, NOW, window, offers[0].id), poor);
});

test('repeated cards in a small rarity pool have independent slot purchase state', () => {
  const p = profile({trophies: 1000, gold: 10000});
  const offers = E.offers(NOW, p), window = E.shopWindow(NOW);
  const pairs = offers.map((offer, i) => [i, offers.findIndex((other, j) => j > i && other.id && other.id === offer.id)]);
  const pair = pairs.find(([, j]) => j >= 0);
  assert.ok(pair, 'Arena 4 has only two eligible Legendary cards for three slots');
  const [a, b] = pair, id = offers[a].id;
  let out = E.purchaseCard(p, a, NOW, window, id);
  assert.equal(out.ok, true);
  out = E.purchaseCard(out.profile, b, NOW, window, id);
  assert.equal(out.ok, true);
  assert.equal(out.profile.copies[id], p.copies[id] + offers[a].quantity + offers[b].quantity);
  assert.equal(out.profile.gold, p.gold - offers[a].price - offers[b].price);
  noPurchase(E.purchaseCard(out.profile, a, NOW, window, id), out.profile);
  noPurchase(E.purchaseCard(out.profile, b, NOW, window, id), out.profile);
});

test('Bats requires the arena gate and then an actual eligible first card copy', () => {
  const below = profile({trophies: 1299});
  E.grant(below, {cards: [{id: 'bats', count: 1}]});
  assert.equal(below.copies.bats, 0);
  assert.equal(P.canUseCard(below, 'bats'), false);
  const reached = profile({trophies: 1300});
  assert.equal(P.canUseCard(reached, 'bats'), false);
  assert.equal(E.cardPool(reached).some(c => c.id === 'bats'), true);
  E.grant(reached, {cards: [{id: 'bats', count: 1}]});
  assert.equal(reached.copies.bats, 1);
  assert.equal(P.canUseCard(reached, 'bats'), true);
  assert.equal(P.canUseCard(profile({...reached, trophies: 1000}), 'bats'), true);
});

test('eligible first Shop copy discovers its card while future-arena offers remain absent', () => {
  const p = profile({trophies: 1300, gold: 10000});
  let candidate;
  for (let hour = 0; hour < 24 && !candidate; hour++) {
    const now = NOW + hour * HOUR, offers = E.offers(now, p);
    assert.ok(offers.filter(o => o.id).every(o => R.cardArenaNumber(C.CARD_BY_ID[o.id], C.DATA.arenas) <= 5 || C.DEFAULT_DECK.includes(o.id)));
    const index = offers.findIndex(o => o.id && !P.canUseCard(p, o.id));
    if (index >= 0) candidate = {now, index, id: offers[index].id};
  }
  assert.ok(candidate);
  const out = E.purchaseCard(p, candidate.index, candidate.now, E.shopWindow(candidate.now), candidate.id);
  assert.equal(out.ok, true);
  assert.equal(P.canUseCard(out.profile, candidate.id), true);
});

test('old eligible card copies migrate into ownership without automatically granting new arena cards', () => {
  const below = profile({version: 6, trophies: 1299, highestTrophies: 1299, copies: {bats: 2}});
  assert.equal(P.canUseCard(below, 'bats'), false);
  const reached = profile({...below, trophies: 1300, highestTrophies: 1300});
  assert.equal(reached.copies.bats, 2);
  assert.equal(P.canUseCard(reached, 'bats'), true);
  const noCopies = profile({version: 6, trophies: 1300});
  assert.equal(P.canUseCard(noCopies, 'bats'), false);
});

test('Wild Cards and Books cannot provide first-copy ownership', () => {
  const p = profile({trophies: 1300, wildcards: {Common: 20},
    magicItems: {'common-book': 1, 'book-of-books': 1}});
  const wild = E.useWildcards(p, 'bats', 1);
  assert.equal(wild.ok, false);
  assert.equal(wild.profile.wildcards.Common, 20);
  for (const id of ['common-book', 'book-of-books']) {
    const out = E.useMagicItem(p, id, 'bats');
    assert.equal(out.ok, false);
    assert.equal(out.profile.magicItems[id], 1);
    assert.equal(P.canUseCard(out.profile, 'bats'), false);
    assert.equal(out.profile.copies.bats, 0);
  }
});

test('Books fill missing copies without paying upgrade gold or XP', () => {
  const p = profile({gold: 0, cardLevels: {knight: 1}, copies: {knight: 1},
    magicItems: {'common-book': 2}});
  const out = E.useMagicItem(p, 'common-book', 'knight');
  assert.equal(out.ok, true);
  assert.equal(out.profile.copies.knight, 2);
  assert.equal(out.profile.magicItems['common-book'], 1);
  assert.equal(out.profile.gold, 0);
  assert.equal(out.profile.cardLevels.knight, 1);
  assert.equal(out.profile.experience, 0);
  const again = E.useMagicItem(out.profile, 'common-book', 'knight');
  assert.equal(again.ok, false);
  assert.equal(again.profile.magicItems['common-book'], 1);
  assert.equal(P.upgrade(out.profile, 'knight').ok, false);
});

test('Magic Coin performs a real upgrade and XP gain without spending gold', () => {
  const p = profile({gold: 0, experience: 17, cardLevels: {knight: 1}, copies: {knight: 2},
    magicItems: {'magic-coin': 1}});
  const out = E.useMagicItem(p, 'magic-coin', 'knight');
  assert.equal(out.ok, true);
  assert.equal(out.profile.gold, 0);
  assert.equal(out.profile.copies.knight, 0);
  assert.equal(out.profile.cardLevels.knight, 2);
  assert.equal(out.profile.experience, 21);
  assert.equal(out.profile.level, 2);
  assert.equal(out.profile.kingLevel, 2);
  assert.equal(out.profile.xp, 1);
  assert.equal(out.profile.magicItems['magic-coin'], 0);
  const again = E.useMagicItem(out.profile, 'magic-coin', 'knight');
  assert.equal(again.ok, false);
  assert.equal(again.profile.experience, 21);
  const missing = profile({...p, copies: {knight: 1}});
  const denied = E.useMagicItem(missing, 'magic-coin', 'knight');
  assert.equal(denied.ok, false);
  assert.equal(denied.profile.magicItems['magic-coin'], 1);
  assert.equal(denied.profile.copies.knight, 1);
});

test('source rarity upgrade XP and King-13 overflow stay synchronized', () => {
  const p = profile({trophies: 4600, gold: 5000, experience: 168700,
    copies: {'the-log': 2}, cardLevels: {'the-log': 9}, starPoints: 10});
  const out = P.upgrade(p, 'the-log');
  assert.equal(out.ok, true);
  assert.equal(out.xpEarned, 250);
  assert.equal(out.profile.experience, 168770);
  assert.equal(out.profile.level, 13);
  assert.equal(out.profile.kingLevel, 13);
  assert.equal(out.profile.xp, 0);
  assert.equal(out.profile.starPoints, 190);
  assert.equal(out.profile.gold, 0);
  assert.equal(out.profile.copies['the-log'], 0);
});

test('legacy level and partial XP migration does not count XP twice on reload', () => {
  const p = P.normalizeProfile({version: 6, level: 3, xp: 15});
  assert.equal(p.experience, 85);
  assert.equal(p.level, 3);
  assert.equal(p.kingLevel, 3);
  assert.equal(p.xp, 15);
  assert.equal(P.normalizeProfile(JSON.parse(JSON.stringify(p))).experience, 85);
});

test('every alternate public queue enforces Level 9 cards and real Level 9 towers', () => {
  const p = profile({trophies: 6000, experience: 168770,
    cardLevels: Object.fromEntries(C.CARDS.map(c => [c.id, 13])),
    cheats: {overlevels: true}, cheatLevels: {knight: 30}});
  const original = JSON.stringify(p);
  for (const queue of ['challenge', 'training', 'friendly', 'clan-war', '2v2', 'self-play', 'replay']) {
    const battle = new C.Battle({queue, mode: queue === '2v2' ? 'TeamVsTeam' : 'Default',
      profile: p, kingLevel: 13, levels: p.cardLevels, ai: false});
    assert.ok(battle.kingLevels.every(level => level === 9), queue);
    assert.ok(battle.towers.every(tower => tower.level === 9), queue);
    for (const levels of battle.seatLevels) assert.ok(Object.values(levels).every(level => level === 9), queue);
    assert.equal(battle.profile.level, 13, 'temporary match levels must not replace account progression');
  }
  assert.equal(JSON.stringify(p), original);
});

test('Trophy Road uses collection levels and account King while ignoring equal-level overrides', () => {
  const p = profile({trophies: 6000, experience: 88770,
    cardLevels: Object.fromEntries(C.CARDS.map(c => [c.id, C.baseLevel(c.rarity)]))});
  const battle = new C.Battle({queue: 'trophy-road', profile: p, ai: false,
    kingLevel: 9, levels: Object.fromEntries(C.CARDS.map(c => [c.id, 9]))});
  assert.equal(battle.kingLevels[0], 12);
  assert.equal(battle.seatLevels[0].knight, 1);
  assert.equal(battle.seatLevels[0].giant, 3);
  assert.ok(battle.initialDecks[1].every(id => [12, 13].includes(battle.seatLevels[1][id])));
  const equal = new C.Battle({queue: 'challenge', profile: p, ai: false});
  const ownKing = b => b.towers.find(t => t.team === 0 && t.king);
  assert.ok(ownKing(battle).hp > ownKing(equal).hp, 'collection King level changes real tower HP');
});

test('automatic difficulty is Expert except occasional one- or two-game Hard streaks', () => {
  for (const seed of [1, 77137, 239021]) {
    for (let start = 0; start < 200; start += 20) {
      const values = Array.from({length: 20}, (_, i) => Rules.difficulty(start + i, seed));
      const hard = values.map((value, i) => value === 'hard' ? i : -1).filter(i => i >= 0);
      assert.ok(values.every(value => value === 'hard' || value === 'expert'));
      assert.ok(hard.length === 1 || hard.length === 2);
      assert.equal(hard[hard.length - 1] - hard[0], hard.length - 1);
    }
  }
  const p = profile({aiDifficulty: 'normal', battleSerial: 0});
  const battle = new C.Battle({queue: 'trophy-road', profile: p, aiDifficulty: 'normal', ai: false});
  assert.equal(battle.aiDifficulty, 'expert');
  assert.equal(p.placementHints, true);
  assert.equal(p.learningEnabled, true);
});
