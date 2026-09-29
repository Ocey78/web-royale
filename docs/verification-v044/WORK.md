# v0.44.0 execution record
Base: Web-Royale-v0.43.0-Full-Build.zip. Work is isolated in work044.
Approved scope: arched, spaced 5v5 towers; castle-themed river-free arena; visible Mirror artwork; 5+5-minute king-only Rumble rules.

- [x] Inspect base source and reproduce a full-gradient Mirror cover with CSS masking disabled.
- [x] Add regression tests; initial Rumble run: 10 expected failures, 3 passes.
- [x] Fix rules/layout, preserve old replay engine.
- [x] Replace fragile masked Mirror overlay and compare actual rendered pixels.
- [x] Layered castle environment; validate shared tower foundations and cache.
- [x] Run full suite, browser tests, movement audits, worker match.
- Package/clean-extraction result is recorded in the external release verification report after closing the actual ZIP.

Rulings: Only Team Rumble uses new arches and king-only scoring. Princess Towers still defend and open deployment lanes, but do not award Rumble crowns or decide results. With equal surviving Kings, overtime ends on the next unequal King loss; simultaneous equal losses continue. At 10 minutes, the existing health tiebreak drains only living Kings. Dead Kings never regenerate passive elixir. No new health or collision-radius balancing.
Castle art is a locally rendered, layered custom environment, not official new Supercell assets. Ordinary/3v3/Bridge geometry remains unchanged.

Final verification: 1,171 unit tests; 219 browser checks; three Mirror pixel checks; 179 movement scenarios; completed ten-seat Rumble worker match. All recorded failures resolved.
