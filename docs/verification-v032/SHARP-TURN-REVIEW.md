# Sharp-turn diagnosis and independent review

The v0.31 lane guide introduced actual movement corners. This was not a rendering or facing-rate issue. Measured at 60 Hz in the frozen v0.31 simulation:

| Unit and deployment, blue side | Situation | Largest turn between movement steps |
|---|---|---:|
| Baby Dragon (6,22) | All Crowns alive; horizontal alignment ends at 1.67s | 90.00 degrees |
| Baby Dragon (3.5,25) | Left enemy Princess absent; King enters local sight at 11.38s | 48.01 degrees |
| Knight (6,22) | All Crowns alive; horizontal alignment ends | 90.00 degrees |
| Giant (6,22) | All Crowns alive; horizontal alignment ends | 90.00 degrees |
| Hog Rider (6,22) | All Crowns alive; horizontal alignment ends | 90.00 degrees |

The first discontinuity came from switching a purely horizontal guide to a purely forward guide. The second came from dropping the lane guide when local Crown pursuit began. Both occurred even though the selected Crown had not changed.

## Alternatives measured without product edits

`sharp-turn-diagnostics.json` contains 48 scenarios per variant, mirrored across teams and lanes: Baby Dragon, Knight, Giant, and Hog Rider; off-lane starts, a missing lane Princess, and two persistent friendly building obstacles. Ground fallen-lane starts use y=22 to avoid the friendly Princess footprint. Each variant reached a Crown in all 48 cases, with no center crossing or illegal ground position.

| Diagnostic variant | Cases with a movement turn above 60 degrees | Clear Baby Dragon alignment / King turn |
|---|---:|---:|
| Frozen v0.31 | 32 | 90.00 / 48.01 degrees |
| Direct approach to the already selected Crown | 0 | 0.00 / 0.00 degrees |
| Diagonal lane lookahead | 4 | 1.60 / 48.01 degrees |
| Diagonal lookahead with a continuous Crown blend | 4 | 0.18 / 0.22 degrees |

The lookahead experiments used arbitrary three-tile guidance and six-tile blending distances, solely for comparison. They were not adopted. Removing the mandatory guide is the smaller correction: lane-aware target selection remains in `Battle.targetDecision`, while existing clear-segment and obstacle routing approach that target directly. No rotational inertia, source speed changes, or new steering parameters are necessary.

Supercell's [31 March 2025 April Update notes](https://supercell.com/en/games/clashroyale/blog/release-notes/april-update/) describe reduced lane dependence and more diagonal troop movement, alongside advance avoidance of buildings. That supports the requested modern movement direction, but does not establish exact native waypoints or turn rates. This correction is not a claim that the historical data snapshot now reproduces every modern native route.

## Independent review of the actual updated source

`independent-diagonal-review.json` records 616/616 successful movement probes: all 77 independently mobile entities in the existing source-reachable roster, both teams and lanes, with and without persistent building detours. The probes use actual `Battle.tickEntity` at 60 Hz, source stats and collision radii. Other actors remain stationary so building expiration cannot hide a stall. Every mover reached a Crown attack without an illegal terrain position, building overlap, or unexplained movement jump. Battle Ram's immediate charged impact and Sparky's source recoil are accounted for.

Twelve additional controls passed: direct aerial pursuit across water, source slowdown magnitude, recovery after knockback, Freeze hold and release, a committed attack retaining its target, and idle behavior with no enemies or towers. These are mirrored across both teams. Reports include hashes of the reviewed files.

This review made no product or existing-test edits. The reproducible diagnostic scripts are `work/sharp-turn-v032.cjs` (frozen v0.31 alternatives) and `work/review-diagonal-v032.cjs` (current source). Geometry probes do not establish complete native combat or animation parity; ground obstacle routes may still turn where clearance requires it.
