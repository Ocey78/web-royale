# 0.58.1 verification

- Full suite: 1,852 passed, one existing skipped test, zero failures (`full-tests.txt`).
- Final focused source regressions: 37 passed after the Crown Road and complete tiebreaker-duration corrections.
- Final built package and learner consistency: nine passed. Both focused runs are in `focused-tests.txt`.
- Final build: version 0.58.1, 2,273 files (`build.txt`).
- Browser tests launch all three modes through their visible Events buttons, compare all 20 displayed prices, check four/six-seat teams and timelines, confirm native Builder assets, and inspect both teams' tower metadata.
- Actual browser drawing records protected Bomber opacity at 0.48 and restored opacity at 1 after Guard death. Both teams are covered.
- Native health HUD checks verify normal tower frames and numeric HP at full/damaged health on both teams. Source tests also cover every tower troop selection.
- Screenshots include Events, all three battle layouts, a phone deck builder, normal tower health bars, and cloaked/revealed Bombers.

The local browser evidence is in `local/`. Live verification and the immutable deployment commit are recorded after Pages publishes in `live/` and `deployment.json`.

The balance values are design estimates from the implemented mechanics. These checks verify price consistency and gameplay behavior; they do not claim equal competitive win rates.
