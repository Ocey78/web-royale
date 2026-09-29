'use strict';
// Regenerate after running the cited suites and the pathing report. This is a
// coverage ledger, not a replacement test runner or a native parity claim.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const C=require('../src/core.js'),root=path.resolve(__dirname,'..');
const folder=path.join(root,'docs/verification-v028');
const pathing=JSON.parse(fs.readFileSync(path.join(folder,'pathing-report.json'),'utf8'));
assert.equal(C.CARDS.length,102);assert.equal(pathing.catalogCards,102);assert.equal(pathing.summary.failed,0);
const evidence=[];
function add(id,cards,file,probe,scope,kind='combat'){
 assert.ok(fs.readFileSync(path.join(root,'tests',file),'utf8').includes(probe),id+' evidence title');
 for(const card of cards.split(' '))assert.ok(C.CARD_BY_ID[card],card);
 evidence.push({id,cards:cards.split(' '),file:'tests/'+file,testTitleContains:probe,kind,scope});
}
const E='expanded-battle.test.cjs',B='card-behavior-v271.test.cjs',F='v250-fidelity.test.cjs';
add('knight-source','knight',E,'source speed, health, range, and first-hit timing are used','Knight source HP/speed/range/first-hit values');
add('ground-targeting','knight',E,'ground-only melee cannot select or hit flying troops','Knight rejects flying targets');
add('air-targeting','musketeer',E,'ranged anti-air can acquire a flying target','Musketeer acquires a flying target');
add('buildings-only','giant',E,'building targeters ignore nearby defending troops','Giant ignores defending troops');
add('shield','guards',E,'shield absorbs a whole hit without overflow','Guards shield absorbs a complete hit without HP overflow');
add('golem-split','golem',E,'Golem death creates two Golemites','Golem creates two Golemites on death','spawn');
add('cage-cart-death','goblin-cage cannon-cart',E,'cage releases Brawler and cart changes to stationary cannon','Cage releases Brawler; Cart changes to BrokenCannon','spawn');
add('spawner-types','witch goblin-hut tombstone',E,'Witch and huts generate their actual unit types','Source child type appears during live simulation','spawn');
add('collector','elixir-collector',E,'Elixir Collector generates an elixir at its source interval','Collector produces elixir','spawn');
add('charge-reset','prince',E,'stun stops movement and resets charge','Prince charge and movement reset under stun');
add('freeze-team','freeze',E,'Freeze does not debuff friendly troops','Freeze affects enemies and leaves allied troops unbuffed','buff');
add('mirror-repeat','mirror',E,'Mirror repeats the last card at +1 elixir and a higher level','Mirror repeats last card with cost and level changes','deployment-rule');
add('clone','clone',E,'Clone creates one-HP copies, not buildings','Clone creates one-HP troop copies and excludes buildings','spawn');
add('curse-death','mother-witch',E,'Mother Witch curse turns a killed troop into an allied hog','Curse death creates an allied Voodoo Hog','spawn');
add('blob-elixir','elixir-golem',E,'Elixir blob death grants the opponent elixir','Final Elixir Golem stage grants opponent elixir on death');
add('inferno-reset','inferno-dragon',E,'ramp-up damage grows only while retaining an uninterrupted target','Inferno Dragon ramp increases damage and stun resets lock');
add('reflection','electro-giant',E,'Electro Giant reflects nearby attacks without a reflection loop','Electro Giant retaliates with damage and stun without recursion');
add('curse-impact','mother-witch',B,'Mother Witch curse is applied by impact','No early curse; lethal projectile applies curse even after caster death');
add('snare-choice','ram-rider',B,'Ram Rider spreads Bola Snare','Unsnared preference; committed target retained; expired snare ignored');
add('pellet-blocker','hunter',B,'Hunter pellet hits the first blocker','Nearest body takes pellet independent of entity insertion order');
add('collector-freeze','elixir-collector freeze',B,'Freeze suspends Elixir Collector production','Freeze pauses current remaining production time','buff');
add('collector-rage','elixir-collector rage',B,'Rage speeds the current Elixir Collector cycle','Rage speeds current remaining production time','buff');
add('spawner-freeze','witch night-witch goblin-hut barbarian-hut tombstone furnace freeze',B,'Freeze suspends the remaining','Freeze pauses each of six source spawn cycles, retaining remaining time','buff');
add('cart-building','cannon-cart clone giant',B,'Cannon Cart becomes a building','Broken Cart is stationary, attracts Giant, and is excluded by Clone');
add('cart-morph','cannon-cart',B,'Cannon Cart keeps its target','Source 150ms morph delay and retained attack target');
add('hook-windup','fisherman',B,'Fisherman remains stationary','Source hook windup is stationary; stun/push/death/invisibility cancel it');
add('tornado-rate','tornado',B,'Tornado pulls the same distance','Equal-time displacement at 20Hz, 60Hz, and 10Hz; attacks continue');
add('spawn-terrain','golem elixir-golem battle-ram','card-pathing-v271.test.cjs','ground death-spawn families remain legal','16 bridge death cases cover four split stages, two teams, two lanes','spawn');
add('source-spread','golem',B,'spawn groups preserve legal source spread','Valid Golemite spread retained; whole-body wall bounds repaired','spawn');
add('death-payload-origin','balloon skeleton-barrel lumberjack',B,'river death payloads retain their origin','Death bomb deals199 damage at origin; skeleton container settles later children; Rage remains at death origin','spawn');
add('bank-rounding','mini-pekka ice-golem',B,'ground spawn settlement chooses a nearby bank','Fractional body radii settle to nearby bank without distant-bridge teleport','spawn');
add('windup-period','knight','mechanics.test.cjs','attack period includes windup','Attack period includes windup without adding it twice');
add('recoil','firecracker sparky','mechanics.test.cjs','ranged recoil occurs','Attack recoil changes caster position');
add('split-bolts','electro-wizard','mechanics.test.cjs','Electro Wizard strikes two targets','Two enemies split bolts; one enemy receives both');
add('fireball-travel','fireball','mechanics.test.cjs','Fireball damages both flying and ground units after travel','Delayed Fireball damages ground and air');
add('princess-projectile','princess','projectile-v160.test.cjs','Princess attack lowers a target HP','Damage-bearing CustomFirstProjectile deals damage');
add('dragon-chain','electro-dragon','source-timing.test.cjs','Electro Dragon source ChainedHitCount','Chain target count includes primary target');
add('poison-stack','poison','source-timing.test.cjs','two distinct Poison areas stack','Independent Poison areas stack; refresh of one area does not');
add('earthquake-ticks','earthquake','source-timing.test.cjs','Earthquake delivers three ground-only','Three ground-only ticks including expiry boundary');
add('balloon-preload','balloon',F,'displacement removes Balloon preload','Displacement clears Balloon preload');
add('dash-contact','bandit',F,'dash destination contacts the target edge','Bandit dash ends at target body edge');
add('hog-jump','hog-rider',F,'Hog crosses open river with source jump speed','Open-river jump uses source speed; bridge crossing stays grounded','movement');
add('ghost-hover','royal-ghost',F,'Hog remains grounded across bridges','Ghost can hover across water without a jump animation','movement');
add('lumberjack-rage','lumberjack','fixes-v120.test.cjs','Lumberjack rage bottle resolves','Death bottle resolves Rage after its source delay','spawn');
add('rage-team','rage','fixes-v120.test.cjs','Rage area buffs both teammates','Rage affects both allied seats and creates no targetable bottle','buff');
add('mirror-level','mirror','source-card-rules.test.cjs','Mirror uses its own level','Mirror uses own source level offset; opening hand exclusion','deployment-rule');
add('own-side-spells','the-log barbarian-barrel royal-delivery','source-card-rules.test.cjs','SpellAsDeploy rolling cards cannot','Own-territory deployment restriction','deployment-rule');
add('delivery-tower','royal-delivery','source-card-rules.test.cjs','CanPlaceOnBuildings permits','Royal Delivery can be placed on allied tower','deployment-rule');
add('archer-formation','archers','v170-movement-formations.test.cjs','Archers preview and live deploy','Preview/live member count, horizontal placement, source stagger','formation');
add('triangles','skeletons goblins spear-goblins','v170-movement-formations.test.cjs','Skeletons and Goblins use mirrored triangle','Three-member mirrored formations','formation');
add('barbs-recruits','barbarians royal-recruits','v170-movement-formations.test.cjs','Barbarians form a five-point','Barbarian radial spread and full-lane Recruits','formation');
add('army-formation','skeleton-army','v170-movement-formations.test.cjs','Skeleton Army scatters','15 members distributed over multiple radii','formation');
add('secondary-members','goblin-gang rascals','v170-movement-formations.test.cjs','Goblin Gang and Rascals preview','Primary/secondary member composition and front/back roles','formation');
add('bowler-deploying','bowler','deployment-v110.test.cjs','line projectiles hit deploying troops','Bowler projectile damages a deploying troop');
const primaryFixes=new Set('mother-witch ram-rider hunter elixir-collector witch night-witch goblin-hut barbarian-hut tombstone furnace cannon-cart fisherman tornado'.split(' '));
assert.equal(primaryFixes.size,13);
const riverFixes=new Set('golem elixir-golem battle-ram'.split(' '));
const specificGaps={
 hunter:'Exact native pellet spread/random delays and every multi-body arrangement remain unverified.',
 tornado:'Native attraction curve and mass dependence remain unverified; the fixed speed preserves the previous 60Hz presentation.',
 tesla:'Native hide/rise 800ms transitions are not explicitly simulated or verified by a behavior scenario.',
 fisherman:'Full hook travel/pull resolution, building self-pull, retargeting, and all interrupt races need matched reference cases.',
 'ram-rider':'Snare selection is tested; complete rider/mount attack and movement interaction matrix is not.',
 'cannon-cart':'BrokenCannon building classification and morph delay/target are tested; shield/death/Clone interaction permutations remain incomplete.',
 'mother-witch':'Projectile curse ordering is tested; curse ownership collisions and every immunity interaction remain incomplete.',
 'royal-ghost':'Hover routes are tested; exact invisibility acquire/loss timings and splash interactions remain unverified.',
 'night-witch':'Frozen regular spawn cycle is tested; every death-bat and overlap timing case is not.',
 freeze:'Enemy targeting and production suspension are tested; complete Freeze/Rage/slow overlap and expiry ordering across every entity are not.',
 rage:'Collector cycle and team buffs are tested; all attack/spawn buff overlaps and exact tick-boundary timing are not.'
};
const sharedGaps=[
 'Passing deployment means the card dispatches and remains finite for three simulated seconds; it does not prove correct combat behavior.',
 'The route sweep isolates movement from combat. It does not prove every aggro, retarget, push, crowd, building-placement, or battle interaction.',
 'The engine is an independent interpreter of pinned 3.2557.2 tables, not the native binary. No modern balance values were introduced.',
 'There is no matched historical video/reference trace for every card; native attack cadence, hit ordering, special interactions and visual identity are not certified.',
 'Exact Hunter pellet spread, native Tornado attraction/mass response, and Tesla hide/rise timing remain known fidelity gaps.',
 'The source graph includes attached-only and stationary entities; these are not falsely counted as independently mobile routes.',
 'Legal spawn settling is a deterministic browser-engine repair, not a claim of exact native collision resolution.'
];
const cards=C.CARDS.map(card=>{
 const rows=pathing.roster.filter(r=>r.cards.includes(card.id));
 const mobile=rows.filter(r=>!r.stationary&&!r.attachedOnly&&!r.effectCarrier);
 const explicit=evidence.filter(e=>e.cards.includes(card.id));
 const outcomes=pathing.outcomes.filter(o=>o.scenario==='oblique-crossing'&&mobile.some(r=>r.entity===o.entity));
 for(const row of mobile)assert.equal(outcomes.filter(o=>o.entity===row.entity&&o.ok).length,4,row.entity);
 return {id:card.id,name:card.name,type:card.spell?'spell':card.building?'building':'troop',
  baselineDeployment:{covered:true,evidence:'tests/expanded-battle.test.cjs',scope:'Legal deploy followed by three seconds; finite resource, HP and position assertions. Mirror fixture supplies a previous Knight.'},
  explicitBehavior:{covered:explicit.length>0,evidence:explicit.map(e=>e.id),kinds:[...new Set(explicit.map(e=>e.kind))]},
  movement:{sourceReachableEntities:rows.map(r=>r.entity),independentlyMobile:mobile.map(r=>r.entity),passingObliqueCrossings:outcomes.length,excludedFromIndependentRoutes:rows.filter(r=>!mobile.includes(r)).map(r=>({entity:r.entity,reason:r.attachedOnly?'attached-only':r.effectCarrier?'effect carrier':'stationary'}))},
  changedThisPass:primaryFixes.has(card.id)?'primary behavior repair':riverFixes.has(card.id)?'ground death-spawn terrain repair':null,
  remainingReferenceWork:specificGaps[card.id]||(explicit.length?'Listed cases cover selected behavior only; full native interaction/timing and visual parity remain unverified.':'No dedicated combat/special-ability assertion mapped in this ledger; requires a targeted source-backed scenario and native reference comparison.')};
});
const totals={cards:cards.length,baselineDeployment:cards.filter(c=>c.baselineDeployment.covered).length,
 explicitBehavior:cards.filter(c=>c.explicitBehavior.covered).length,withoutDedicatedBehavior:cards.filter(c=>!c.explicitBehavior.covered).length,
 cardsWithIndependentMobileEntities:cards.filter(c=>c.movement.independentlyMobile.length).length,primaryBehaviorRepairCards:primaryFixes.size,additionalDeathSpawnRepairCards:riverFixes.size,
 pathing:pathing.summary};
const data={snapshot:C.DATA.snapshot,release:'0.28',purpose:'Evidence inventory, not universal native parity certification',
 generation:'node tests/report-card-coverage-v028.cjs; run cited suites first; generate pathing-report.json with CARD_PATHING_REPORT during the pathing suite',
 totals,scopeLimits:sharedGaps,evidence,cards};
fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,'card-coverage.json'),JSON.stringify(data,null,2)+'\n');
const lines=['# 102-card behavior and movement coverage — v0.28','',
 'Pinned source: **3.2557.2**. This ledger records executable evidence, not a claim that every card matches the native game.', '',
 `All **${totals.baselineDeployment}/102** cards pass basic deployment. **${totals.explicitBehavior}** have at least one mapped behavior, formation, or placement-rule scenario; **${totals.withoutDedicatedBehavior}** do not. A selected scenario is not full coverage.`, '',
 `The movement report follows **${pathing.summary.reachableEntities}** source-reachable entities. **${pathing.summary.independentMobileEntities}** independently mobile entities each pass four oblique team/lane crossings. Attached-only, stationary, and effect-carrier entities are listed separately. See [the movement report](pathing-report.json).`, '',
 'The new combat suite covers 13 primary card repairs: impact-only Mother Witch curse; Ram Rider snare preference; Hunter first blocker; Elixir Collector production under Freeze/Rage and six other spawn cycles under Freeze; stationary Cannon Cart and morph state; Fisherman hook windup; and timestep-independent Tornado that does not repeatedly interrupt attacks. Golem, Elixir Golem, and Battle Ram also receive legal child-spawn placement at river/wall boundaries.', '',
 '## How to read the table','',
 'Every row has baseline deployment coverage: one legal placement, three simulated seconds, and finite-state checks. “Cases” lists dedicated evidence IDs, including formation/placement cases where applicable. “Routes” counts distinct independently mobile source entities and their four oblique crossing cases, not complete combat paths. A dash means no dedicated behavior case mapped here.', '',
 '| Card | Cases | Routes (entities / crossings) | Changed |','|---|---|---:|---|',
 ...cards.map(c=>`| ${c.name} | ${c.explicitBehavior.evidence.join(', ')||'—'} | ${c.movement.independentlyMobile.length} / ${c.movement.passingObliqueCrossings} | ${c.changedThisPass||'—'} |`), '',
 '## Evidence index','',
 ...evidence.map(e=>`- **${e.id}** (${e.kind}): ${e.scope}. [${e.file}](../../${e.file}).`), '',
 '## Remaining native fidelity work','',
 ...sharedGaps.map(s=>'- '+s), '',
 'Card-specific limitations and exact source-reachable entities are retained in [the JSON ledger](card-coverage.json). In particular, cards with only deployment/route coverage still need dedicated attacks and special-ability scenarios. Passing shared engine tests must not be relabeled as an exhaustive 102-card native comparison.', '',
 '## Regeneration','',
 '`node tests/report-card-coverage-v028.cjs` reads the current catalog and the saved movement report, checks that cited test-title fragments exist, and writes both ledgers. Run the cited suites before refreshing; generation alone does not execute their assertions.', ''];
fs.writeFileSync(path.join(folder,'CARD-COVERAGE.md'),lines.join('\n'));
console.log(JSON.stringify(totals,null,2));
