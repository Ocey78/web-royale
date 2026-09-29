# Independent review of v0.31 lane routing

Scope: source evidence, read-only behavior review and independently authored 60 Hz trajectory probes. No product code was changed by the reviewer. This verifies the implemented reconstruction; it does not establish exact historical native parity.

## Result

- Independent probes: 61/61 passed on the final source.
- Focused lane, targeting and placement-preview suites: 80/80 passed.
- Original APK extract hashes were rechecked against the saved unpacked CSV files.

The independent matrix covers both teams and lanes; rear positions near arena edges and behind King; living, zero-HP and removed lane Princess Towers; only the opposite Princess remaining; tower-free idle; source direct-path Skeleton Barrel behavior; King-only target eligibility; local aerial pursuit over central river; pure target queries; and Knight/Giant/Hog Rider with blocked lane alignment. The JSON report contains one-second trajectories and identifies its isolated tickEntity methodology (stationary towers do not fire or expire).

## Regression found and resolved during review

The initial guide could prematurely pull ground troops back into their lane while they were detouring around an allied building. A blue Knight at (7,23), with friendly Cannons at (5.5,23) and (3.5,20.5), oscillated around (3.55,21.68). This reproduced for Knight and Hog Rider on both teams and lanes, and also under full Battle.step through 20 seconds with both buildings still alive.

The final implementation checks that the forward lane segment is clear before rejoining the lane. All eight independent failures then passed. A fresh full Battle.step run of the original case reached y19.36 at 5 seconds, y15.03 at 10 seconds, y10.03 at 15 seconds and began attacking the Princess Tower by 20 seconds.

## Reviewed source hashes

- `src/battle.js`: `6d3db9aee8c0270d990ddb5ff1e36d5facd0f69218ff55d29991bf92b634cca3`
- `src/navigation.js`: `78ef2c23f132144ed4ff0c4d1a2aad29cd2a9be7fedbdf03d344ca2a05eb3184`

## Limits

Lane-center guides and same-lane Princess then King default selection remain evidence-informed implementation choices. Source flags and the official historical movement statement support separating default advance from local chase, but they do not disclose the exact native lane algorithm. See AIR-ROUTING-EVIDENCE.md for the source/unknown distinction.
