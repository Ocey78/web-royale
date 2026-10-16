# 0.58.2 verification

This release adds ten cards to the shared Ultimate pool, for 30 cards across 1v1, 2v2 and 3v3. Source and built catalogs retain 123 ordinary cards and the earlier Ultimate forms/prices.

- Build: version 0.58.2, 2,283 files; see `build.txt`.
- Full regression run: 1,891 tests; 1,889 passed, one skipped, and one package-version check encountered the temporarily absent release manifest during trailing-whitespace rebuild. The sustained battle stress test passed. The failed file and package checks were rerun against the finished artifact: 7/7 passed in `package-retry.txt`. The original output remains in `tests.txt`; no unresolved failures remain.
- Final package integrity and renderer regression output: `final-package-tests.txt` (13 passed).
- New combat regressions include 120 real deployments covering ten cards and every seat across all three modes, delayed pair timing, Recall status/collision, field overlap/expiry, healing food and death Chef, Dragon range/reset, and both rolling boulder impacts.
- Replay regressions exercise each new card through a legal recorded deployment, nine seconds of simulation and repeated seeking. Custom projectile payloads and hit sets are included in Ultimate digests. The earlier normal replay fixture still matches.
- Independent review: `review.md`. Dragon far-edge reach and non-square-tile effect footprints were corrected and reverified.
- Art sheets: `card-portraits.png` and `native-actors.png`. The earlier 20 source portraits and manifest entries were checked unchanged.

## Built browser checks

- `local/expansion/expansion-report.json`: all ten portraits, descriptions/prices, native aliases and battle scenes; separate Bowler boulders, Dragon breath and death Chef screenshots. Zero page errors.
- `local/teams/teams-report.json`: all three builders, all 30 prices, 20-elixir HUD, correct timers/seats, independent decks, phone layout and 48% Bomber cloak/reveal. Zero page errors.
- `local/health/`: eight native tower-health rendering cases. Zero page errors.
- `local/decks/report.json`: portraits, exclusive pool, saved deck/name reload, ordinary-card exclusion, phone layout and battle entry. Zero page errors.

The source received only trailing-blank-line cleanup after the first successful local checks. The final build passed package integrity checks and the full ten-card browser scenario again. Published browser checks use the final artifact.

## Publication

`deployment.json` records the exact release commit, manual GitHub Pages workflow, deployed asset hashes and bare-entry verification. Public browser results are recorded under `live/` after successful publication.
