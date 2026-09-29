# Targeting policy and verification

This change implements the user's written combat-targeting rules using the bundled **3.2557.2** card data. The linked *Card Targeting in Clash Royale* talk concerns personalized shop offers, not battle target selection; it is not evidence for these combat rules. See the [speaker's notes](https://nanrecip.es/2018/card-targeting-in-clash-royale/).

## Behavior

- Eligibility remains a hard filter: enemy, alive, present, visible, unattached, and compatible with the attacker's ground/air and building/troop restrictions. Knight still cannot attack air. Crown-only and King-only restrictions also apply to fallback destinations.
- A walking troop chooses the nearest eligible enemy inside its source `SightRange`. Distance is the gap between collision boundaries, consistently accounting for both bodies. The previous 0.15-tile preference for an existing walking target is removed.
- An eligible existing target in legal attack range is treated as engaged and keeps its lock despite closer arrivals. Death, concealment, invalid category, or leaving attack range releases that ordinary lock. Source priority exceptions remain: Ram Rider prefers unsnared troops between attacks, with priority evaluated before distance.
- Electro Wizard's two-bolt release preserves the locked primary and selects the nearest eligible secondary by collision-boundary distance. Two closer arrivals can no longer take both bolts away from the locked enemy. With one eligible enemy, both bolts still hit that enemy. This also preserves a committed primary within the source hit grace; secondary targets must remain inside the ordinary attack annulus. Electro Dragon chain selection and Hunter pellet collision are unchanged.
- A committed hit keeps its eligible target through the source **1.5-tile** maximum-distance grace (`LOGIC_CANCEL_HIT_FROM_LONG_DISTANCE_RANGE=1500`). Entering a minimum-range blind spot or leaving that grace cancels the pending hit immediately. Reacquisition starts a fresh windup. The same actor may remain the best walking destination after its hit is canceled; it no longer retains a pending attack merely because its target ID did not change.
- Mortar cannot finish an unlaunched shot on a target that entered its source **3.5-tile** blind spot. Already-released projectile resolution is unchanged. Comparisons include a tiny numerical tolerance at the exact minimum-range boundary.
- Without an eligible enemy in sight, a mobile attacker that can attack buildings navigates toward the nearest eligible enemy Crown Tower by the same collision-boundary distance. King Towers participate even while Princess Towers survive. Troop-only and stationary attackers do not receive that fallback.
- Each shared King cannon carries its own pending windup into target selection, keeps that target through the same grace, and starts a fresh charge if its pending target becomes invalid. Canceling an unlaunched cannon charge no longer leaves the replacement waiting on that canceled charge's cooldown.

Target selection and eligibility queries remain pure because placement previews call them. Actual simulation updates cancel pending attack presentation when an attack is lost, including death, retargeting, minimum range, and maximum-distance cancellation. The placement preview also applies the legal attack annulus instead of highlighting Mortar's blind spot as immediately attackable.

## Reproductions and evidence

The earlier Mortar bug was reproduced by placing Mortar at tile `(9,25)`, starting its shot at a Giant at `(9,19)`, then moving the Giant to `(9,23)` during windup. Its collision gap was only **0.65 tiles**, yet the previous implementation dealt **220 damage**. The new test cancels the pending shot and confirms no damage, with a separate case that reacquires another legal target and waits its full new windup.

The Electro Wizard regression starts his attack from `(9,25)` on a Knight at `(9,20)`, then adds Knights at `(8,24)` and `(10,23)` during windup. Previously both newcomers lost **91 HP** at level 9 while the locked primary lost none. Now the primary and nearest secondary each lose 91 HP. Mirrored tests cover both teams, larger-body edge ordering, the primary's committed-hit grace, and two bolts on one eligible enemy despite hidden/attached neighbors.

For the earlier Baby Dragon cross-lane example, remove the enemy left Princess Tower and spawn a blue Baby Dragon at `(3.5,18)`. The right Princess center is closer than the King's center, but the King's collision boundary is nearer: **14.0765 versus 14.4138 tiles**. The new rule selects the King. This is a deliberate interpretation of the user's nearest-target rule, not a claim that this geometry reproduces an independently verified native tower-priority algorithm.

- [46 focused targeting tests](../../tests/targeting-v300.test.cjs) pass. They include normal/Sandbox and blue/red matrices for chase selection, engaged locks, dead/hidden/invisible targets, source sight, target categories, no-target idle, Crown navigation, and fallback eligibility; plus Mortar, canceled presentation, pure forecasting, finite hit grace, same-destination cancellation, both shared King cannons, and eight Electro Wizard release cases.
- The adjacent combat, animation, placement, team, sandbox, and FX run passed **209/209** tests. Existing Ram Rider priority, Cannon Cart morph targeting, Fisherman cancellation, Inferno ramp, source animation timing, Hunter pellets, Electro Wizard split/double hits, and accepted camera checks remained green.
- The old far-teleport lock assertion in [the fidelity suite](../../tests/v250-fidelity.test.cjs) was updated to test retention within source grace and reacquisition beyond it, matching the newly approved policy.
- Old replay mechanics are isolated in the frozen engine snapshot; new targeting uses the current engine. Integrated replay, build, and browser evidence is recorded separately by the release checks.

## Limits

This is a documented local targeting policy, not universal native parity. The source tables expose additional fields whose exact native interpretation is not established here: `SightClip`, `SightClipSide`, `LOGIC_RANGE_EXTENSION_TO_KEEP_TARGET=25`, extra Crown sight, and lane/default-tower preference globals. This change does not guess their units or combine them into an unverified priority system. Special hook/dash mechanics and projectile collision behavior retain their existing dedicated paths. No modern balance values, ground/air capability changes, camera changes, or new card stats were introduced.
