'use strict';
const {test, after} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../src/core.js');
const G = require('../src/arena-grid.js');
const Nav = require('../src/navigation.js');
const Sweep = require('../src/pathing.js');

// Follow only behavior references, never coincidentally matching art names/tribes.
const references = {
  entities: /^(SummonCharacter(?:Second)?|SpawnCharacter\d*|DeathSpawnCharacter\d*|AttachedCharacter|SpawnObject|DeathSpawn)$/,
  projectiles: /^(Projectile|CustomFirstProjectile|ProjectileSpecial|SpawnProjectile|OverrideProjectile|DeathSpawnProjectile)$/,
  areas: /^(AreaEffectObject|DeathAreaEffect|SpawnAreaObject|AreaEffectOnHit|SpawnAreaEffectObject)$/,
  buffs: /^(Buff|BuffOnDamage|TargetBuff|BuffWhenNotAttacking|ReflectedAttackBuff|ChainedBuff)$/
};
function reachableEntities() {
  const entities = new Map();
  for (const card of C.CARDS) {
    const visited = new Set();
    function walk(row, chain) {
      for (const [field, value] of Object.entries(row)) {
        if (typeof value !== 'string') continue;
        for (const [table, pattern] of Object.entries(references)) {
          if (!pattern.test(field) || !C.DATA[table][value]) continue;
          const link = table + ':' + value;
          const next = [...chain, field + ':' + value];
          if (table === 'entities') {
            let found = entities.get(value);
            if (!found) entities.set(value, found = {entity: value, cards: new Set(), paths: []});
            found.cards.add(card.id);
            if (found.paths.length < 4) found.paths.push(next);
          }
          if (!visited.has(link)) { visited.add(link); walk(C.DATA[table][value], next); }
        }
      }
    }
    walk(card.source, [card.id]);
  }
  return [...entities.values()].sort((a, b) => a.entity.localeCompare(b.entity)).map(row => ({
    ...row, cards: [...row.cards], def: C.entityDef(row.entity, 9)
  }));
}
const roster = reachableEntities();
const attachedOnly = new Set(['GhostOverlay', 'RamRider', 'SpearGoblinGiant']);
const mobile = roster.filter(row => row.def.speedTiles > 0 && !row.def.building && row.def.hp > 0 && !attachedOnly.has(row.entity));
const outcomes = [];
const report = {snapshot: C.DATA.snapshot, catalogCards: C.CARDS.length,
  methodology: 'Pinned source-reachable entities, real Battle.move and separation, deterministic geometry and source speeds/radii. This does not certify native tick-for-tick parity.',
  roster: roster.map(({entity, cards, paths, def}) => ({entity, cards, paths,
    speedTiles: def.speedTiles, radiusTiles: def.radiusTiles, mass: def.mass,
    air: def.air, hover: def.hover, riverJump: !!def.source.JumpEnabled,
    stationary: def.building || def.speedTiles === 0,
    attachedOnly: attachedOnly.has(entity), effectCarrier: def.hp <= 0})), outcomes};
after(() => {
  if (!process.env.CARD_PATHING_REPORT) return;
  report.summary = {reachableEntities: roster.length, independentMobileEntities: mobile.length,
    scenarios: outcomes.length, passed: outcomes.filter(row => row.ok).length,
    failed: outcomes.filter(row => !row.ok).length};
  const output = path.resolve(process.env.CARD_PATHING_REPORT);
  fs.mkdirSync(path.dirname(output), {recursive: true});
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
});
function point(unit) { return {x: unit.x / C.SX, y: unit.y / C.SY}; }
function gap(a, b) { return Math.hypot((a.x - b.x) / C.SX, (a.y - b.y) / C.SY); }
function waterAllowed(unit) { return unit.air || unit.def.hover || unit.def.source.JumpEnabled; }
function isolatedBattle() {
  const b = new C.Battle({ai: false, recording: 'compact', headless: true});
  // Isolate travel from combat and tower range; actual movement implementation is retained.
  b.towers = [];
  return b;
}
function crossing(entity, team, lane) {
  const b = isolatedBattle(), center = lane === 0 ? 3.5 : 14.5;
  const u = b.spawn(entity, team, (center + (lane === 0 ? 2.75 : -2.75)) * C.SX,
    (team === 0 ? 22 : 10) * C.SY, {wait: 0, level: 9});
  const target = {id: 'travel-goal', x: center * C.SX, y: (team === 0 ? 1 : 31) * C.SY, def: {radiusTiles: .5}};
  let crossed = false, illegal = null, teleport = null, sawJump = false;
  const dt = .05, maxSeconds = 45;
  for (let step = 0; step < maxSeconds / dt; step++) {
    const before = point(u);
    b.time += dt; b.move(u, target, dt);
    sawJump ||= !!u.riverJump;
    const after = point(u), distance = Math.hypot(after.x - before.x, after.y - before.y);
    const maximumSpeed = Math.max(u.def.speedTiles * (u.def.source.ChargeSpeedMultiplier || 200) / 100,
      (u.def.source.JumpSpeed || 0) / 60);
    if (distance > maximumSpeed * dt + 1e-6) teleport = {before, after, distance};
    if (!u.air && !G.terrainFits(u.x, u.y, u.def.radiusTiles,
      {allowWater: !!waterAllowed(u), ignoreTowers: true})) { illegal = after; break; }
    if (team === 0 ? after.y < 14 : after.y > 18) { crossed = true; break; }
  }
  const row = {scenario: 'oblique-crossing', entity, team, lane, crossed,
    position: point(u), seconds: b.time, searches: b.navigator.searches, illegal, teleport, sawJump,
    ok: crossed && !illegal && !teleport};
  outcomes.push(row);
  return row;
}

test('source traversal includes secondary, death, projectile, area, and attached entities', () => {
  const names = new Set(roster.map(row => row.entity));
  for (const name of ['GiantSkeleton', 'ZapMachine', 'RascalGirl', 'Golemite', 'LavaPups',
    'ElixirGolem2', 'ElixirGolem4', 'VoodooHog', 'DeliveryRecruit', 'GoblinBrawler', 'RamRider', 'SpearGoblinGiant']) {
    assert.ok(names.has(name), name);
  }
  assert.equal(report.catalogCards, 123);
});

for (const {entity} of mobile) test(entity + ' follows legal movement across both lanes in both directions', () => {
  const rows = [];
  for (const team of [0, 1]) for (const lane of [0, 1]) rows.push(crossing(entity, team, lane));
  assert.deepEqual(rows.filter(row => !row.ok), []);
});

test('navigation and execution agree on whole-body arena boundaries', () => {
  for (const radius of [.4, .5, .6, .75, 1]) {
    const p = {x: radius - .1, y: 20};
    assert.equal(G.terrainFits(p.x * C.SX, p.y * C.SY, radius, {ignoreTowers: true}), false);
    assert.equal(Nav.pointClear(p, radius, []), false, 'planner must include radius ' + radius + ' at side wall');
  }
});

test('planner cannot smooth a route across a narrow river-bank corner collision', () => {
  const start = {x: 13.418510269373655, y: 22.2903943490237};
  const end = {x: 14.25, y: 14.75};
  // This segment clips the bank for less than a tenth of a tile. Different
  // sampling intervals previously made the planner and executor disagree.
  assert.equal(G.waterClear(13.996, 17.05, .5), false);
  assert.equal(Nav.segmentClear(start, end, .5, []), false);
  const b = isolatedBattle(), u = b.spawn('Knight', 0, start.x * C.SX, start.y * C.SY, {wait: 0});
  assert.equal(Sweep.sweptStep(u, (end.x - start.x) * C.SX, (end.y - start.y) * C.SY).blocked, true);
});

test('source movement speed is preserved for every independent mobile entity', () => {
  for (const {entity, def} of mobile) {
    const b = isolatedBattle(), u = b.spawn(entity, 0, 1.5 * C.SX, 23 * C.SY, {wait: 0});
    const initial = {...u}, target = {id: 'speed-goal', x: 16.5 * C.SX, y: 23 * C.SY, def: {radiusTiles: 0}};
    for (let step = 0; step < 20; step++) { b.time += .05; b.move(u, target, .05); }
    assert.ok(Math.abs(gap(u, initial) - def.source.Speed / 60) < 1e-6, entity);
  }
});

test('radius-one troops reach real enemy tower range from oblique approaches', () => {
  for (const name of ['GiantSkeleton', 'ZapMachine']) for (const team of [0, 1]) for (const lane of [0, 1]) {
    const b = new C.Battle({ai: false, headless: true}), center = lane === 0 ? 3.5 : 14.5;
    const target = b.towers.filter(t => t.team !== team && !t.king).sort((a, z) => a.x - z.x)[lane];
    const u = b.spawn(name, team, (center + (lane === 0 ? 2.75 : -2.75)) * C.SX,
      (team === 0 ? 22 : 10) * C.SY, {wait: 0});
    for (let step = 0; step < 1200 && C.edge(u, target) > u.def.range + 1e-6; step++) {
      b.time += .05; b.move(u, target, .05);
    }
    const row = {scenario: 'real-tower-approach', entity: name, team, lane,
      seconds: b.time, edgeDistance: C.edge(u, target), range: u.def.range,
      ok: C.edge(u, target) <= u.def.range + 1e-6};
    outcomes.push(row);
    assert.equal(row.ok, true, JSON.stringify(row));
  }
});

test('deterministic angled routes keep planned and executed segment clearance consistent', () => {
  const random = C.rng(91827), radii = [.4, .45, .5, .6, .7, .75, 1];
  let checked = 0;
  for (let sample = 0; sample < 500; sample++) {
    const radius = radii[sample % radii.length];
    let from = {x: 1 + random() * 16, y: 18 + random() * 8};
    const target = {x: 3 + random() * 12, y: 3 + random() * 9, radius: .5};
    const obstacle = {id: 1, x: 4 + random() * 10, y: 18 + random() * 7, radius: .6};
    if (!Nav.pointClear(from, radius, [obstacle])) continue;
    const route = Nav.route(from, target, radius, radius + 1, [obstacle]);
    assert.ok(route.length > 0, JSON.stringify({from, target, radius}));
    const solid = {id: 1, hp: 100, x: obstacle.x * C.SX, y: obstacle.y * C.SY,
      def: {radiusTiles: obstacle.radius}};
    for (const to of route) {
      const u = {id: 2, x: from.x * C.SX, y: from.y * C.SY, air: false,
        def: {radiusTiles: radius, source: {}}};
      const moved = Sweep.sweptStep(u, (to.x - from.x) * C.SX, (to.y - from.y) * C.SY, [solid]);
      const error = Math.hypot(moved.x / C.SX - to.x, moved.y / C.SY - to.y);
      assert.ok(error < 1e-6, JSON.stringify({radius, from, to, error}));
      // Independently sample the existing geometry too: sharing a new helper
      // must not hide a common mistake in the planner and executor.
      const steps = Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / .02);
      for (let step = 1; step <= steps; step++) {
        const q = step / steps;
        assert.equal(G.terrainFits((from.x + (to.x - from.x) * q) * C.SX,
          (from.y + (to.y - from.y) * q) * C.SY, radius, {ignoreTowers: true}), true);
      }
      checked++; from = to;
    }
  }
  assert.ok(checked > 1000);
  outcomes.push({scenario: 'deterministic-segment-clearance', checkedSegments: checked, ok: true});
});

test('large knockbacks cannot tunnel across the river or live buildings', () => {
  for (const name of ['Knight', 'Giant', 'Golem', 'Pekka', 'GiantSkeleton', 'ZapMachine']) {
    const b = isolatedBattle(), u = b.spawn(name, 0, 9 * C.SX, 20 * C.SY, {wait: 0});
    const water = Sweep.sweptStep(u, 0, -8 * C.SY, []);
    assert.equal(water.blocked, true, name);
    assert.ok(water.y / C.SY >= 17 + u.def.radiusTiles - 1e-6, name);
    const wall = b.spawn('Cannon', 1, 9 * C.SX, 22 * C.SY, {wait: 0});
    const structure = Sweep.sweptStep(u, 0, 6 * C.SY, [wall]);
    assert.equal(structure.blocked, true, name);
    assert.ok(gap(structure, wall) >= u.def.radiusTiles + wall.def.radiusTiles - 1e-6, name);
  }
});

test('air, hover, and jump families preserve their source water permissions', () => {
  for (const name of ['Minion', 'Balloon', 'SkeletonDragon', 'HogRider', 'Ram', 'RoyalHog', 'VoodooHog', 'Ghost', 'BattleHealer']) {
    const b = isolatedBattle(), u = b.spawn(name, 0, 9 * C.SX, 20 * C.SY, {wait: 0});
    const target = {id: 'center-crossing', x: 9 * C.SX, y: 2 * C.SY, def: {radiusTiles: 0}};
    let sawJump = false;
    for (let step = 0; step < 600 && u.y > 14 * C.SY; step++) {
      b.time += .05; b.move(u, target, .05); sawJump ||= !!u.riverJump;
    }
    assert.ok(u.y < 15 * C.SY, name);
    assert.ok(Math.abs(u.x / C.SX - 9) < 1e-6, name + ' should cross the center river directly');
    assert.equal(sawJump, !!u.def.source.JumpEnabled, name + ' jump presentation');
  }
});

test('hover and jumping ground units still detour around solid buildings', () => {
  for (const name of ['HogRider', 'Ram', 'RoyalHog', 'VoodooHog', 'Ghost', 'BattleHealer']) {
    const b = isolatedBattle(), u = b.spawn(name, 0, 9 * C.SX, 23 * C.SY, {wait: 0});
    const wall = b.spawn('GoblinHut', 0, 9 * C.SX, 20 * C.SY, {wait: 0});
    const target = {id: 'beyond-wall', x: 9 * C.SX, y: 2 * C.SY, def: {radiusTiles: 0}};
    for (let step = 0; step < 900 && u.y > 14 * C.SY; step++) {
      b.time += .05; b.move(u, target, .05);
      assert.ok(gap(u, wall) >= u.def.radiusTiles + wall.def.radiusTiles - 1e-6, name);
    }
    assert.ok(u.y < 15 * C.SY, name);
  }
});

test('a crowd of mixed source masses can follow a heavy unit over either bridge', () => {
  for (const leader of ['Golem', 'GiantSkeleton', 'ZapMachine']) for (const team of [0, 1]) for (const lane of [0, 1]) {
    const b = isolatedBattle(), center = lane === 0 ? 3.5 : 14.5, dir = team === 0 ? -1 : 1;
    const startY = team === 0 ? 20 : 12;
    const units = [b.spawn(leader, team, center * C.SX, startY * C.SY, {wait: 0})];
    for (let i = 0; i < 12; i++) units.push(b.spawn('Skeleton', team,
      (center + (i % 3 - 1) * .9) * C.SX, (startY - dir * (1.8 + Math.floor(i / 3) * 1.05)) * C.SY, {wait: 0}));
    const target = {id: 'crowd-goal', x: center * C.SX, y: (team === 0 ? 1 : 31) * C.SY, def: {radiusTiles: 0}};
    let illegal = null;
    for (let step = 0; step < 1200; step++) {
      b.time += .05;
      for (const u of units) b.move(u, target, .05);
      b.separate(.05);
      const bad = units.find(u => !G.terrainFits(u.x, u.y, u.def.radiusTiles, {ignoreTowers: true}));
      if (bad) { illegal = {entity: bad.entity, ...point(bad)}; break; }
      if (units.every(u => team === 0 ? u.y < 14 * C.SY : u.y > 18 * C.SY)) break;
    }
    const remaining = units.filter(u => team === 0 ? u.y >= 14 * C.SY : u.y <= 18 * C.SY).map(u => ({entity: u.entity, ...point(u)}));
    const row = {scenario: 'mixed-mass-crowd', entity: leader, team, lane, illegal, remaining, seconds: b.time, ok: !illegal && remaining.length === 0};
    outcomes.push(row);
    assert.deepEqual({illegal, remaining}, {illegal: null, remaining: []}, JSON.stringify(row));
  }
});

test('ground death-spawn families remain legal and mobile when their parent dies on a bridge', () => {
  const failed = [];
  for (const [parentName, childName] of [['Golem', 'Golemite'], ['ElixirGolem1', 'ElixirGolem2'],
    ['ElixirGolem2', 'ElixirGolem4'], ['BattleRam', 'Barbarian']]) {
    for (const team of [0, 1]) for (const lane of [0, 1]) {
      const b = isolatedBattle(), center = lane === 0 ? 3.5 : 14.5;
      const parent = b.spawn(parentName, team, center * C.SX, 16 * C.SY, {wait: 0});
      parent.hp = 0; b.deaths();
      const children = b.units.filter(u => !u.dead && u.entity === childName);
      const positions = children.map(u => ({...point(u), legal: G.terrainFits(u.x, u.y,
        u.def.radiusTiles, {ignoreTowers: true})}));
      const legal = children.length === 2 && positions.every(p => p.legal);
      if (legal) {
        const target = {id: 'death-spawn-goal', x: center * C.SX,
          y: (team === 0 ? 1 : 31) * C.SY, def: {radiusTiles: 0}};
        for (let step = 0; step < 600; step++) {
          b.time += .05;
          for (const u of children) b.move(u, target, .05);
          b.separate(.05);
          if (children.every(u => team === 0 ? u.y < 14 * C.SY : u.y > 18 * C.SY)) break;
        }
      }
      const crossed = children.length === 2 && children.every(u => team === 0 ? u.y < 14 * C.SY : u.y > 18 * C.SY);
      const row = {scenario: 'bridge-death-spawn', entity: parentName, childEntity: childName,
        team, lane, spawnPositions: positions, finalPositions: children.map(point), legal, crossed, ok: legal && crossed};
      outcomes.push(row);
      if (!row.ok) failed.push(row);
    }
  }
  assert.deepEqual(failed, []);
});
