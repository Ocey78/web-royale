# v0.38 implementation review

Reviewed the changed deployment, navigation, HUD, economy, profile, shop UI, replay and build paths against v0.37.0. This was an implementation self-review with executable regression and browser checks, not an independent human review.

## Findings and resolutions

1. Live deployment dropped `snapCard().formation`, even though the UI displayed its adjusted members. The command now passes those members through to the actual caster. Obstacle clearance agrees with navigation.
2. Mirror passed its spell descriptor into placement, ignoring the mirrored troop's body. Placement now validates the resolved card before spending elixir. A dedicated regression verifies the bank-edge preview/live positions.
3. Shield-specific HealthBar metadata selected shield sprites after depletion; undamaged-enemy and grouped badges chose generic sprites before depletion. Both health and level-only paths now select on current `shield > 0`. Selected exports were verified against the bundled native scene.
4. Goblin Barrel inherited the generic row formation and lacked structure-aware spawn clearance. It now gets a team-oriented three-point formation and deterministic legal settlement, including sibling bodies near walls/banks.
5. Reusing static routes indefinitely could preserve an exhausted detour. Empty paths now receive a bounded retry deadline; the direct-route, invalid-origin and structure-change branches retain their existing invalidation rules.
6. Changing simulation behavior while continuing to label new replays `0.32` would reinterpret existing recordings. A frozen, hashed copy of the supplied v0.37 training engine/boat adapter now serves old `0.32` recordings; new records use `0.38`. Default, four-card and boat fixtures reproduce their frozen digests through repeated seeks.
7. A Gem Shop refresh is committed only after the second valid distinct purchase. Currency/card grants use the pre-refresh offer; stale rotations, mismatched cards, repeated slots and insufficient gems return without mutation. A reached-arena snapshot keeps in-progress offers stable until the next refresh.
8. Daily quantity changes leave existing receipt keys, prices, currency rewards, daily reset and free-claim counts unchanged. Both the paid cards and free wildcards are explicitly fivefold.

## Scope and limitations

No redesign of the accepted arena or unrelated content removal. No paid currency packs. No simulation tick-rate, collision-radius or damage reductions used as performance shortcuts. CPU data is an isolated navigation benchmark, not a whole-game FPS promise. File-backed Chromium visual tests do not replace physical iPhone/Safari, live-site/service-worker or Windows launcher testing.
