# 0.58.3 verification

This release adds Ultimate Mirror and the 18-elixir Bandit Squad, bringing the exclusive pool to 32 cards across all three Ultimate modes. It updates the native Chef and Bowler presentation, supports three Builders with 1.5%/3% healing, and refreshes five spell portraits. The ordinary pool remains 123 cards.

- `build.txt` records the final compact website build.
- `tests.txt` records the complete regression suite: **1,924 tests, 1,923 passed, one skipped, zero failures**. This includes sustained fights for every supported ordinary card.
- `final-package-tests.txt` records **14/14 passing** package, identity, UI and native-render checks after the final CSS rebuild. The compact release contains 2,285 files.
- `review.md` records independent source review and the final Mirror label correction.
- `combat.md` describes the focused deployment, cost, healing, native dash and replay checks. New replay cases use real slot cycling and passive elixir regeneration in 1v1, 2v2 and 3v3.
- `visuals.md`, `native-actors.png` and `card-portraits.png` record inspected native actors, all three Builders, both teams, several facings and the refreshed cards at hand size.
- `art.md` and `art-verification.json` record source provenance and unchanged unrelated portrait hashes. Generated source illustrations and exact prompts are retained under `assets/ultimate-clash/illustrations/`.

## Packaged browser checks

- `local/polish/polish-report.json`: 32-card pool, seven new/refreshed portraits, variable Mirror cost, visible copied level, twenty-elixir copies, four Bandits plus Boss Bandit, three Builders, exact healing, original Chef layers, and two Bowler projectiles.
- `local/teams/teams-report.json`: all three event entries/builders, all card prices, twenty-elixir HUD, extended timers, separate decks, phone layout, protected Bombers at 48% opacity and full visibility after the Guard dies.
- `local/health/report.json`: eight native Princess Tower health-bar cases with evolved shooters and multiplied tower health.

The healing browser scenario waits until the building finishes deploying before measuring a full second. Visual inspection found the new Mirror level label beneath the portrait; a failing browser layout assertion reproduced the issue, then scoped CSS moved it above the portrait. The final rebuilt artifact receives separate package integrity checks and a fresh browser run.

All three local browser scenarios passed with zero page errors. The final polish run verifies a visible level-14, twenty-elixir Mirror copy; three Builders heal exactly 3% per second after deployment; both original Chef layers paint successfully. The team and health runs used the same gameplay/renderer build before the final scoped Mirror-label CSS adjustment.

## Publication

`deployment.json` records the exact release commit, manual GitHub Pages workflow, public file hashes and bare-entry verification. Live browser evidence is saved under `live/` after publication.
