# Animation and source-effect verification

This pass uses the supplied **3.2557.2** game tables and extracted SC clips. It changes presentation and adds default-delegating stat hooks for the isolated sandbox. Ordinary battle mechanics remain engine **0.28**. It does not certify exact native parity for every animation or interaction.

## Corrected presentation

- **Attack timing:** clips with an authored `action_frame` now reach that pose at the actual simulated hit/projectile release. Recovery plays at source clip speed. Previously the entire clip was stretched to `HitSpeed`, putting Knight's visible contact after damage and Musketeer's visible release before its projectile. Sparky's firing recovery no longer spans its four-second reload. The separate continuous `VisualHitSpeed` path remains intact.
- **Interruption and pause:** pending attack presentation cancels on stun/displacement; pause holds its frame. Drawing does not emit attacks or effects. These use presentation metadata instead of changing the `visualState` value observed by AI.
- **Ground strides:** playback follows actual travelled tiles, with Speed 60 as the one-tile-per-second reference and the source `WalkingSpeedTweakPercentage`. Giant's 0.75-tile-per-second travel advances its walking clip by 0.75 seconds per second. Airborne wingbeats retain their independent clock. Exact native footfall/burst timing is not established; Giant's `StopMovementAfterMS=640` / `WaitMS=100` were not guessed into movement behavior.
- **Stationary Cannon Cart:** its directional 53-frame attack clip is no longer mistaken for a rotation atlas. The source action marker at frame 17 and recoil can play. Cannon/X-Bow single-view heading atlases still use pose lookup.
- **Fisherman:** the dedicated source loading clip supplies the labelled loop, throw, hold, and pull poses. His hook no longer shows the fish melee swing during its windup. Hook impact uses the source `DragEffect` rope. Existing hook travel/pull mechanics are unchanged; complete native pull/movement coordination remains unverified.
- **Original effects restored:** Witch/Night Witch child appearance effects, Prince/Battle Ram-family charge effects, Bandit/Mega Knight dash effects, Sparky ready sparks, Miner underground travel particles, and deployment effects delayed until actual appearance. Sound-only source effect rows are not replaced with invented particles.
- **Original tower styles:** Gold Rush, Gem Rush, and Elixir Pump use the recovered source scene. King dummy replacement, Princess attachment depth, Classic fallback, destroyed artwork, and accepted camera transforms are retained. Selected tower scenes survive battle asset preparation; shadow caches distinguish styles.

## Executable evidence

The focused combined run passed **117/117** tests, including:

- [19 animation/effect regressions](../../tests/animation-sync-v290.test.cjs): real simulation release versus real SC action markers; Giant displacement clock; airborne control; source effects; Fisherman labels; pause/once-only events; dash landing after interruption.
- [Six tower rendering cases](../../tests/tower-skin-render-v290.test.cjs): both teams for all three assemblies, character depth, fallback/ruins, scene retention, and Tower Princess action marker.
- [Three stat-policy cases](../../tests/battle-stat-policy-v290.test.cjs): override dispatch, level-zero propagation, and unchanged normal catalog caps.
- Existing native, facing, source FX, card behavior, sandbox, and accepted-camera tests in the same focused run.

After the final hooks and presentation changes, current and frozen v0.28 mechanics matched for three seeded **60-second** battles (7, 42, 91), sampled each second, and **102 scripted five-second** card-versus-target cases, compared every step. The comparison included positions, health/shields, target IDs, windups, preload, drag, projectiles, resources, crowns, hands, metrics, and result. Visual event lists and new presentation fields were intentionally excluded. This is regression evidence, not an exhaustive proof.

The original tower contact sheet was independently rendered through `Library.drawTower`; all four styles produced distinct pixels with no missing drawable shapes. Full application/build/browser validation belongs to the integrated release check.

The focused [tower browser check](../../tests/browser_towers_v290.cjs) also passed against the built application on port 8092. An isolated browser profile started with 5,000 local gems, purchased all three styles through the Shop, equipped each through Collection → preview → Use, and reloaded to verify ownership, selection, and the exact 750-gem deduction. Each ordinary Trophy Road battle retained the source scene and drew the expected King/Princess exports into its visible battle canvas. Desktop and phone screenshots show all three styles. Final balance: 2,750 gems; browser errors: zero. The packaged [browser evidence](browser-towers.json) records the tested bundle, export names, and screenshot hashes; screenshots remain in the local QA directory.

## Baby Dragon target investigation

With both enemy Princess Towers intact, empty-board placements across the arena select the nearer Princess Tower. With **all enemy entities removed**, Baby Dragon has no target and remains idle (also covered by the sandbox suite). A unit outside immediate attack/sight range may still have a tower navigation target; “not attacking” does not mean “no target.”

A reproducible cross-lane case exists after a tower falls:

1. Create a normal battle without AI.
2. Set the enemy left Princess Tower's HP to zero.
3. Spawn a blue Baby Dragon at tile **(3.5, 18)** and inspect `battle.chooseTarget(dragon)`.

The selected destination is the right Princess Tower at **(14.5, 6.5)**. Its center is **15.9138** tiles away; the King at **(9, 3)** is **15.9765** tiles away. Because the King has a larger collision radius, its edge is closer (**14.0765** versus **14.4138** tiles). The current out-of-sight tower fallback sorts by center distance, whereas nearby target acquisition compares collision edges. This explains the observed local cross-lane flight. Exact native tower preference/tie behavior is unverified, so this pass leaves that mechanic unchanged instead of imposing a speculative rule.

For target debugging, inspect the unit's `targetId`, then resolve it with `battle.getEntity(targetId)` and compare the target's team, HP, tile position, and collision edge distance. Inspect `chooseTarget` before the first tick because `targetId` is populated during simulation.

## Remaining limits

No modern balance values were introduced. Source-labelled contacts provide strong timing anchors, but source tables alone do not establish every native animation transition, movement pause, particle attachment/force curve, or special interaction. Continuous Inferno visuals and clips without a usable action marker retain their existing playback path. See [the v0.28 card ledger](../verification-v028/CARD-COVERAGE.md) for broader tested and untested behavior coverage.
