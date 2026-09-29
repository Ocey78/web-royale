# v0.39.1 implementation review

Reviewed the source changes against the available v0.38 full source archive and
the v0.39 requirements/changes in the conversation. This was an inline review,
not an independent external/subagent review.

## Reward settlement
- Current trophy bonus algorithm and ranked/practice classification are preserved.
- Currency bonuses are computed once on a qualifying ranked result and protected
  by the existing result-ID receipt checks.
- UI rendering reads the match-specific receipt. No render branch grants currency.
- Actual credited totals, not nominal uncapped rewards, feed the boxes.
- Save normalization preserves new metadata; it grants no historical milestone.

## Rendering and regression scope
- Chest/gold/gems use the same box class; zero rewards are omitted.
- Full chest slots do not suppress currency. Non-ranked/practice/replay behavior
  is tested separately. Repeated draw/OK flows cannot settle a second reward.
- Card-frame mismatch was reproduced with a solid diagnostic portrait. Before:
  654–655 sentinel pixels outside each normal frame in the fixture. After: zero
  exterior sentinel pixels on all eight test cards, including a Legendary.
- Card level text moved inside its fitted frame only on deck/collection cards;
  ordinary cardVisual(id) callers retain their existing no-level behavior.
- The matching chest style is retained with no per-frame reward DOM work.

## Initial failures retained as evidence
- New reward regressions failed on the original implementation before being fixed.
- The first complete Node run was 1011/1012: the sole failure was an outdated
  hard-coded assertion that package.version must be 0.38.0 in
  `tests/v160-regressions.test.cjs`. It now validates a semantic version and agrees
  with both the build tool VERSION and the generated release. The consistency
  checks were kept rather than removed. A full fresh run is recorded separately.
- A browser HTTP probe returned ERR_BLOCKED_BY_ADMINISTRATOR. The browser test
  reports explicitly identify their file-backed transport; no live-site claim
  is made.
