# v0.58.2 independent expansion review

Reviewed against docs/superpowers/plans/2026-10-16-ultimate-expansion.md and baseline d52813e. Scope: catalog installation, combat adapter, battle hooks, expansion tests, replay digest, and a source review of current rendering changes. No production files were edited by this reviewer. Build, browser verification, publishing and final visual QA remain with the parent agent.

## Confirmed finding, corrected and reverified

[P1] Dragon King could repeatedly attack a stationary primary without dealing damage. src/ultimate-combat.js:94 previously used a 5.5-tile center-to-center cone radius while battle targeting uses a 5-tile edge range plus the Dragon's 0.85-tile body radius. Enemies at edge ranges 4.65 through 5 therefore attracted attacks but lay outside the damage cone. Independent reproduction: Dragon at (9,22), enemy Knight at (9,15.75), towers disabled, twelve seconds of real simulation. Before correction, breathAt reached 12 while enemy HP remained 1,000,000 and no damage events occurred.

The combat agent corrected the cone radius to b.attackRange(u)+u.def.radiusTiles and added the actual-simulation far-edge regression. This reviewer reran the integrated expansion tests after correction: all 36 passed. No remaining release-blocking combat, catalog or replay finding was identified.

## Verification evidence

- Ran the four tests/ultimate-expansion-*-v0582.test.cjs suites together after correction: 36 tests, 36 pass, zero failures.
- Independently exercised each of the ten new cards through a legal recorded deployment followed by 30 seconds of simulation, rotating Ultimate, 2v2 and 3v3 modes and seat owners. All ten replay Sessions sought to the recorded duration and exactly matched their expected digests. This covers delayed festival/reinforcement events and field expiry. The parent subsequently extended the checked-in replay simulations to nine seconds per deployment.
- Reviewed source spell inheritance: new Recall/Pact/Spill/Festival casts return through their custom adapter before native spell pipelines; clean custom area specs prevent copied Tornado/Rage damage or pull side effects. Repeated Dark Pact fields use boolean multiplier selection and per-time drain deduplication.
- Reviewed delayed ownership: pending pairs store original owner/team/level; kitchen death spawning occurs under the building owner's context; kitchen food validates friendly troop impact and bypasses native Heal Spirit damage/area spawning.
- Reviewed Recall terrain safety and attached/building exclusion; Mortar minimum range; team-agnostic ground-only Spill; Bowler building-only acquisition with both native rolling projectiles hitting intervening enemy ground troops; Dragon stun reset and cone exclusions.
- Reviewed replay digest change: Ultimate projectile state now contains custom payload and a serialized hit Set, scoped to Ultimate modes. Normal digest shape remains unchanged.

## Final visual source review

The visual agent corrected the reported coordinate issue. Magnet pulse X radius now multiplies the SY-based event radius by SX/SY and keeps the supplied Y radius. Dragon cone endpoints use tile-space heading and independently scale X by SX/SY, preserving the combat cone footprint; their vertical offsets intentionally connect the airborne mouth with the impact region.

Reviewed the stable draw.js, native.js, potato.js and native-policy.cjs changes. The additions select custom aliases or ultimate markers, preserve ordinary Bowler scale, keep the existing Bomb Squad opacity path and native tower health rendering, resolve death-spawn Chef and projectile artwork aliases, and provide bounded fields/effects in normal and potato quality. The corrected kitchen healing impact now has its own visible effect. Accessory drawing does not mutate battle state.

Fresh final rendering suite: 8 tests passed, zero failures, including the new non-square tile footprint regression. No further actionable source-review findings remain. The implementation is ready for the parent's final build, full tests and browser/deployment verification; this review does not substitute for those final rendered checks.
