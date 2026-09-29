# Lane advance reconstruction in v0.31

Baby Dragon's cross-arena travel was simulation behavior, not a sprite offset. In v0.30, a Dragon at tile (3.5,25) with the opposing left Princess destroyed selected the right Princess: its collision boundary was slightly nearer than the King's. Every flying unit then used a straight path regardless of whether it was chasing a nearby enemy or merely advancing. The Dragon crossed x=9 after 7.18 seconds and began attacking the opposite Princess at 11.03 seconds.

## Behavior now implemented

`Battle.targetDecision` is a pure query returning a target and one of `engage`, `chase`, `advance`, or `idle`. `chooseTarget` remains a pure compatibility wrapper. Existing local sight, eligibility, attack locks, minimum ranges, and committed-shot grace remain intact.

When no eligible local enemy exists, an ordinary troop advances toward its current-side living Princess, then King if that Princess is unavailable, then another eligible Crown if both preferred choices are unavailable. Current x determines the side; x=9 ties left. Nearby Crown acquisition still follows local eligibility and edge distance. This replaces v0.30's global nearest-Crown fallback; it is a tested reconstruction, not an ordering recovered from the native executable.

While advancing toward a distant standard Crown, units without explicit `FlyDirectPaths` align horizontally to x=3.5 or x=14.5, then move forward. The guide stops once local acquisition takes over or the troop has passed the opposing Princess row. A 0.05-tile alignment tolerance prevents tiny oscillations; forward guidance looks one tile ahead. These centerlines approximate the source map's central lane corridors. They do not reproduce its complete native cost map.

Ground troops retain radius-aware terrain and building checks. If a guide is blocked, the existing route handles the detour. Rejoining requires the horizontal segment and the next forward segment to be clear, so lane alignment cannot repeatedly undo the detour. Air pursuit keeps its existing freedom to cross water and building footprints. The source's explicitly direct-path Skeleton Barrel remains exempt from the guide. Boat defenders and towers outside standard Crown geometry receive no normal lane guide.

## Verification

- `tests/lane-advance-v310.test.cjs`: 32 passing tests. Mirrored scenarios cover rear deployment after a lane falls, actual defense followed by advance, off-lane alignment, free aerial river pursuit, Skeleton Barrel's source flag, current-side reassignment after pursuit, pure queries, centerline tolerance, passed anchors, obstacle detours, tower-free idle, attack locks, and boat geometry.
- Eight Knight/Hog Rider obstacle cases failed before the detour re-entry correction and pass afterward. Obstacles remain alive throughout the probe so building expiration cannot conceal a stall.
- Combined lane, targeting, navigation, card behavior, placement, and sandbox checks: 215 passed, 0 failed.
- Independent review: 61/61 additional trajectory probes passed. See `independent-lane-review.json`.
- `lane-trajectory-comparison.json` repeats 34 real `Battle.step` scenarios at 60 Hz with normal combat stats, mirrored across both teams: 6 all-towers-alive, 20 fallen-lane deployments at different depths, and 8 defense-then-advance cases. Unintended center crossings changed from 20 to 0; all 34 new runs reached a Crown attack within 30 seconds.

In the concrete fallen-left-lane example, the Dragon now stays at x=3.5 while advancing, acquires King locally at 11.37 seconds, then turns toward it and starts its attack at 12.72 seconds. In the defense scenario it kills the Knight, resumes the same lane, and starts attacking King at 19.52 seconds.

## Evidence limits

See `AIR-ROUTING-EVIDENCE.md` for original CSV values, hashes, the lane mask, and the primary Supercell statement about historical horizontal lane alignment. The source distinguishes flying height, direct-path flight, and lane/default-target controls, but does not reveal their exact runtime combination. The fallback order, centerline guides, tolerance, and short lookahead are explicit implementation choices. `SightClip`, `SightClipSide`, extra Crown sight, and the opaque target-retention value25 were not assigned speculative meanings. Controlled historical native recordings are still needed to establish exact route parity for Baby Dragon and other units. These checks verify the stated behavior and known regressions; they do not certify every card's movement as identical to the native game.
