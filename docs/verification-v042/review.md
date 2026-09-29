# Inline release review — v0.42.0

Reviewed the working diff against the untouched v0.41.0 archive and approved chat scope.

## Reviewed boundaries

- Independent saved twelve/one-shot decks; incomplete unlocked collections cannot start.
- Restrictions are validated for both players and again at the battle deployment gate.
- Twenty-elixir capacity affects grants/leakage/public AI estimates, not base income speed.
- 3v3 clock thresholds and each destroyed King's independent passive-income restriction.
- Cosmetic map selection independent of combat RNG and recorded for replay playback.
- Frozen 0.41 engine preserves old recordings rather than applying the new 3v3 timeline.
- Potato rendering avoids native battlefield rendering; toggling restores chosen tiers.
- Both map variants are cached, with foreground and ambient animation kept separate.
- New 3v3 camera applies identically to rendering and mouse/touch coordinate conversion.
- Menu badge identity, Crown Road claims, prior economy, regular card masks and result boxes.

## Findings resolved during verification

Three old browser-isolation tests still asserted the previous *current* engine tag;
the new frozen engine was not at fault. Current tag assertions now expect 0.42,
while historical assertions and released fixture data remain intact.

The first twenty-elixir HUD showed Max 1020 because a CSS suffix was appended to
the old Max 10 label. The label now updates from actual mode capacity, and the
suffix is removed. Browser regression checks assert Max 20 and a 90% fill at 18.

The initial exterior scenery was cropped by the classic camera. A 3v3-only
uniform scenic composition now exposes it; round-trip and real touchscreen
placement tests cover this change.

The first new browser run failed in test navigation (closed Settings panel with
retained data-kind), not in the product toggle. The helper now checks visibility.

The initial touch command timed out at its tool call limit; the complete same
script passed when allowed to finish. Logs of the initial attempts are retained.

## Scope / limitations

No change to navigation geometry, troop combat rules, chest/economy amounts or
normal arena camera. No source-font distribution or live-site writes. Review
performed inline; there was no independent subagent/code reviewer.
