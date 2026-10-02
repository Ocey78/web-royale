# Modern source behavior coverage

Snapshot: **16.402.2**. Catalog source SHA-256: `7f40419b4fe9673a5cf13e61222e6063f671e19da38714db594a00c8d59c5c44`. These counts describe the local interpreter's dependency preflight, not native-client gameplay or visual parity.

| Source set | Recognized dependency graphs | Total | Explicitly unavailable |
| --- | ---: | ---: | ---: |
| Base cards | 121 | 123 | 2 |
| Card forms | 51 | 67 | 16 |
| Source action records | 823 | 910 | 87 |

- evolution: 30/42 forms pass.
- hero: 13/17 forms pass.
- champion: 8/8 forms pass.

The action count includes client/UI and mode-specific source records beyond playable-card dependencies. Counts come from `RoyaleModernActions.coverage()` and `audit()`. Complete dependencies and reasons are in [full-card-form-capabilities.json](full-card-form-capabilities.json) and [action-interpreter-audit.json](action-interpreter-audit.json). Battle preflight rejects unavailable card/form graphs before spending elixir or advancing the hand. Ability preflight and live disabled-state checks also prevent unsupported activation.

## Unavailable playable entries

| ID | Kind | Source blocker |
| --- | --- | --- |
| rune-giant | base | Unsupported native action ActionGiantBufferCollectFriends |
| berserker | base | Unsupported native action ActionBerserk |
| Musketeer_EV1 | evolution | Unsupported native action ActionMusketeerSnipe |
| BattleRam_EV1 | evolution | Unsupported native action ActionDamagingPushBack |
| BlowdartGoblin_EV1 | evolution | Unsupported native action ActionBlowdartGoblinEvoDartSelect; Unsupported native action ActionBlowdartGoblinEvoController |
| AxeMan_EV1 | evolution | Unknown source variable get_ping_pong_projectile_distance; Unsupported live projectile data replacement; Unsupported native action ActionExecutionerEvoProjectile |
| Ghost_EV1 | evolution | Unsupported native action ActionGhostEvoAction |
| MegaKnight_EV1 | evolution | Unsupported native action ActionMegaKnightUppercut |
| SkeletonBalloon_EV1 | evolution | Unsupported native Skeleton Barrel evolution containers |
| ElectroDragon_EV1 | evolution | Unsupported native action ActionChainProjectileAttack |
| GoblinBarrel_EV1 | evolution | Unsupported native action ActionMirroredExtraSpell |
| Snowball_EV1 | evolution | Unsupported native action ActionCaptureCharacter; Unsupported native action ActionRollingProjectile |
| Cannon_EV1 | evolution | Unsupported native action ActionCannonBarrage |
| GoblinCage_EV1 | evolution | Unsupported native action ActionCaptureCharacter |
| Balloon_hero | hero | Unsupported native action ActionOverrideProjectileSpeed |
| IceGolemite_hero | hero | Unknown has_data source |
| Berserker_hero | hero | Unsupported native action ActionBerserk |
| BarbLog_hero | hero | Unsupported native action ActionBarbBarrelHeroReRoll |

Unresolved numeric `has_data` identifiers remain unknown. The separate source-hash probe did not establish their entity identity; no guessed aliases were inserted. Source records with zero-field native controllers, such as `ActionBerserk`, are preserved without fabricated parameters.

## Source-driven implementation and evidence

The interpreter uses local source actions, buffs, expressions, callbacks, shapes, filters, target resolvers, spawn groups, projectiles, and ability configuration. Expressions run through a bounded whitelist AST without JavaScript evaluation. Renderer calls do not consume the battle random generator. Delayed actions retain source owner, level, form, context, and instigator. Dependent graphs are checked before any side effect.

Verified controllers include all eight Champions, available Hero forms, Dagger Duchess ammo/reload, Chef cooking/target selection, Ronin melee parry, reworked Goblin Hut, Goblin Machine rockets, Hunter evolution nets, Baby Dragon evolution wind, Furnace evolution spawn cadence, and base Skeleton Barrel stages and radial payload. Source Hero tests cover Golden Knight chains, Little Prince guard timing/sweep, Goblinstein tether, Giant slap/landing, Ice Wizard freeze/cube/thaw, Magic Archer parallel power shots, Mega Minion mark/warp/return, Mini P.E.K.K.A quest levels, and Valkyrie whirlwind completion.

Latest focused verification: **49 tests passed** across `tests/modern-actions.test.cjs` and `tests/modern-action-live-v052.test.cjs`. Six use the actual Battle implementation: Ice Wizard ownership/thaw, Cannon Cart half-health morph, Magic Archer three parallel projectiles, Baby Dragon full-field effects, Skeleton Barrel payload, and Valkyrie charge/cadence/lock cleanup. The root release run verifies the complete project and browser bundle separately.

## Practical limits

- Source graph recognition verifies the implemented interpreter path. It cannot prove parity with unavailable native C++ controllers. The entries above remain excluded from live choices.
- Source distance/velocity units are converted to local tiles and seconds. Golden Knight, Mega Minion, and Valkyrie use deterministic local motion; native acceleration, contact routing, and animation timing have not been independently measured. Giant knockback uses a deterministic source-height arc over the existing terrain-safe destination.
- Chef consumes source cooking contributions, eligible-health threshold, selection order, cooking bar, and throw delay. Native `HoldFullBarTime` and post-attack throw coordination are not fully reproduced.
- Source visual-effect selection is retained, while generic effect durations and linked looping FX use the local renderer lifetime policy. A supported gameplay graph does not certify every authored visual loop.
- Vines has two unresolved cosmetic entity IDs in its size selector. Verified radius/crown-role branches choose the snare tier with equal source gameplay stats. Ice Golem Hero's unresolved gameplay predicates stay blocked.
- Raw Mega Minion source has isolated fields without expected action table headers. No missing records were invented during import or interpretation.

## Replay and shared framework

Replay must retain `modernActions` timers/variables/tags/listeners and top-level `modernBurst`, `modernGuardDash`, `modernDash`, `modernIndicator`, `modernMegaAbility`, `modernInjectedWarp`, `modernKnockback`, `modernKnockbackHeight`, `modernFrameRange`, and `modernAttackChain` controller states. The peer was notified of the final new field. Skeleton Barrel uses existing action timers and `modernFrameRange` without another top-level controller. Classic's historical engine does not use this module. Custom may share the framework with its original catalog without importing Main's modern card/hero content.
