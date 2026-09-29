# Web Royale v0.31.0 — Baby Dragon lane movement

The previous update changed target distances but did not fix the full crossing route. A blue Baby Dragon placed at tile (3.5,25), after the enemy left Princess Tower was removed, still selected the right Princess and flew diagonally across the arena. The same issue occurred on both teams and after finishing a defensive fight. The sprite and shadow accurately followed the simulated body; animation drift was not the cause.

## Corrected movement

- Default Crown advance and nearby enemy pursuit are separate decisions. Ordinary troops advance toward their lane's living Princess Tower, then the King when that Princess is absent. A different Crown remains available when the preferred towers are unavailable in a custom Sandbox setup.
- Default advance uses the historical lane direction. A troop outside its lane first joins that route before moving forward; it does not take a long diagonal across the board just because another tower has a shorter straight-line distance.
- Nearby eligible enemies still distract units. Flying troops retain flight over the river and structures while pursuing those enemies. Ground units retain their swept collision checks and building avoidance.
- Skeleton Barrel retains the source's explicit `FlyDirectPaths` exception. Boat battles retain their separate target layout.
- Existing attack locks, hit grace, ground/air restrictions, building-only targeting, Mortar blind spots and Electro Wizard's primary bolt are retained.

The level 0–99 Sandbox, tower controls, unlimited time, custom progression, UI, chest openings and event tower styles remain available. New recordings use engine 0.31; recordings tagged 0.30 and older keep their original simulation.

## Source and limits

The supplied snapshot contains lane/default-target flags, a standard lane tilemap, and a separate `FlyDirectPaths` field. Supercell's [April 2025 update notes](https://supercell.com/en/games/clashroyale/blog/release-notes/april-update/) also describe historical movement joining lanes before advancing. The source extracts, hashes and interpretation limits are included in `docs/verification-v031/`.

This is a reconstruction of lane behavior, not a recovered native pathfinding engine. The exact native waypoint cost and tie-breaking algorithm are unavailable; the browser uses guides based on the source lane corridors. The correction is tested against complete movement trajectories, rather than just the initially selected target.

## Open

Extract the entire ZIP and run `Web-Royale/open offline.bat`. The complete editable source, local assets and ready-to-play website are included. Keep the same browser and localhost origin to retain the existing save.

## Movement and browser verification

- The final full automated suite passed **857/857** tests, with no failures or skips, including sustained fights covering all 102 cards. An old animation test's assumption that every first step points forward was replaced by a check that facing matches actual movement; the renderer itself was unchanged.
- 34 full simulation trajectories: unintended center crossings changed from **20 to 0**, and all 34 reached a Crown attack. Scenarios include both teams, both lanes, rear deployment, all towers alive, a fallen lane, and defense followed by advance.
- **32 lane regressions** and **61 independent trajectory probes** passed, including eight ground-unit detour cases that exposed and then verified a building-loop correction.
- Built-browser checks use the actual Sandbox tower, card, level and team controls. All four mirrored rear-deployment cases stayed in lane and reached King; off-lane entry and free flight toward a nearby Musketeer also passed.
- **14 browser replay checks** passed, including 10 stored historical fixtures. A genuine v0.30 recording still reproduces its old Baby Dragon crossing through the frozen historical engine.
- Normal pointer deployment, Cannon Cart targeting, Golem death-spawn positions, and the 102-card level 0–99 Sandbox passed in the final browser build without application errors.

The full automated run is included in `docs/verification-v031/node-tests.txt`. Source evidence, route samples, independent review and browser results are included in the same directory. Archive extraction, rebuild and runtime-hash checks are reported in the integrity file beside the downloadable ZIP.
