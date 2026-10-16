# v0.58.3 combat and replay report

Implemented in `src/battle.js`, `src/ultimate-combat.js`, `src/placement.js`, and `src/ai.js`.

- `Battle.card()` preserves Mirror hand identity and exposes `mirrorCard` / `mirrorLevel`; `Battle.playableCard(seat, slot)` and `resolvePlayedCard(seat, card)` resolve the actual base card for deployment, forecast and both tactical/Ultimate AI.
- Ultimate Mirror uses the last non-Mirror card's played level +3, including level19; its paid cost is last cost +1 capped20. Repeated copies retain the original last-card record. Unavailable copies reject without spending, recording or cycling. Copies do not carry Hero abilities or change Evolution charge.
- Native Mirror retains its own level + native offset, native cap policy, ten-elixir price cap and ordinary-form semantics.
- Builder placement, forecasts and AI allow three, reject a fourth, and heal exactly 0 / 1.5% / 3% max HP per second for one / two / three Builders. Healing cannot exceed maximum HP or resurrect a destroyed building; Crown Towers and enemy buildings remain invalid.
- Bandit Squad uses the catalog's existing generic formation path. The native regular Bandit entity is `Assassin`; all four Assassins and the BossBandit retain the owner/level and automatically dash and damage enemies without an attached Champion ability.

## Focused evidence

New `tests/ultimate-polish-combat-v0583.test.cjs`: 13 passing tests. The three Builder regressions first failed on the two-Builder limit, old 1% healing, and AI rejecting the third. Seven Ultimate Mirror cases then failed on the missing copy cost/level/preview/AI/ownership behavior before implementation. The native squad and normal Mirror checks are integration/regression coverage of retained behavior.

New `tests/ultimate-polish-replay-v0583.test.cjs`: six passing replay tests across UltimateClash / UltimateClash2v2 / UltimateClash3v3, owners0 / 2 / 4. Every case uses an actual ordered deck (source slot0, Mirror at queue head), captures replay state before the first tick, and obtains all subsequent elixir through passive regeneration. The cases replay a twenty-elixir level16 source at level19 for twenty elixir and boosted Spirit Festival delayed summons. Full seeks and backward/forward seeks match the recorded digest; restored copies and pending waves retain owner and level explicitly.

Updated the earlier Builder combat test for the authorized third Builder.

Final focused run: **142 tests passed, zero failed**, exit0, approximately11.2 seconds:

```text
node --test tests/source-card-rules.test.cjs tests/opening-cycle.test.cjs tests/v038-movement.test.cjs tests/team-v110.test.cjs tests/tactical-ai.test.cjs tests/modern-ai-v052.test.cjs tests/battle-form-routing-v523.test.cjs tests/ultimate-combat.test.cjs tests/ultimate-expansion-combat-v0582.test.cjs tests/ultimate-polish-combat-v0583.test.cjs tests/ultimate-expansion-replay-v0582.test.cjs tests/ultimate-polish-replay-v0583.test.cjs
```

The scoped diff whitespace check passed. No full suite, build, commit or push was run by this agent, as requested. No outstanding combat/replay issue found. Root owns final browser/build/full-suite verification; the visual agent was notified to use `playableCard()` for the placement ghost and root owns the HUD.
