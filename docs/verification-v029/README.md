# v0.29 verification

The release retains normal replay engine 0.28 and adds isolated sandbox behavior plus presentation changes.

- `node-tests.txt`: complete Node regression run, including original battle/economy/host coverage and new sandbox, animation, chest lifecycle, and source asset cases.
- `animation-evidence.json` / `ANIMATION-FX.md`: source attack markers, movement clocks, effect lifecycles, and comparison with frozen v0.28 mechanics for three 60-second battles and 102 card scenarios.
- `ui-browser.json`: all five marked UI corrections at desktop and phone sizes.
- `sandbox-browser.json`: real home entry, 102 cards, levels 0/13/99, both teams, manual placement, Mirror, towers, target lines, pause, unlimited time, and persistence isolation.
- `chests-browser.json`: actual Free Chest claim, card/gold reveal, Legendary reveal on phone, skip/close, claim cooldown, reload and exactly-once rewards.
- `browser-towers.json`: purchase/equip/reload for all three source tower variants, expected source exports drawn in normal live battles, and correct gem deduction.
- `protected-assets.json`: unchanged accepted camera, arena CSS and original native/presentation data hashes. Drawing code changed deliberately for animation and source-effect playback.

Existing browser regressions also passed for card details, pointer deployment, Cannon Cart targeting, river death spawns, old replay playback, Hour Shop, overtime/tiebreak, all fifteen arenas, save reload, and menu recovery.

These checks are reproducible from the included source. Browser tests use isolated temporary profiles and a separately started local server. Screenshots were inspected during development; large intermediate QA images are excluded from the ZIP. Full native-engine equivalence is not asserted; the release notes identify remaining gaps.
