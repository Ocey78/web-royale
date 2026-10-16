# Web Royale 0.58.7 — Ultimate Team Rumble and Sandbox controls

**Ultimate Team Rumble** is available in the Ultimate Clash event group with its own saved deck builder. It uses five players per team, the existing three Rumble arenas and King elimination rules, all 33 Ultimate cards and their supported forms, 20 maximum elixir, evolved Princess Towers with eight times normal health, and King Towers with ten times normal health.

Regulation lasts seven minutes and overtime lasts six minutes. Elixir increases to 2x at 3:30, 2.5x at 5:15, 3x at 7:00 and 4x at 10:30. Tiebreaker starts at 13:00. Replay, training and match-history handling include the new mode and its longer duration.

**Sandbox** now has independent Blue AI and Red AI checkboxes. Both start off, take effect immediately, and retain their selections through resets and map changes. Enabled sides use the existing AI decks; manual placement remains available. Sandbox does not record matches or train the learning model.

The card selector includes separate Ultimate Troops, Buildings and Spells groups. All 33 base Ultimate cards can be placed at the selected Sandbox level, including custom spells, Builders and the accelerated Pump. Ultimate Mirror copies the previous card at three levels higher without stacking further levels on repeated Mirrors. Custom Builder animation and selected Ultimate assets are loaded for Sandbox.

**Lightning Storm Evolution now requires two cycles**, activating on every third cast. Its eight all-target waves and expanding radius are unchanged.

This release includes the Bowler Giant bridge-clearance fix from 0.58.6. Tests and gameplay/browser checks remain skipped at the user's request. Build and publication records are under `docs/qa/v0587/`.
