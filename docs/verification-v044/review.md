# v0.44.0 inline review

Reviewed the production changes against the agreed 5v5/Mirror scope. This was an
inline review, not an independent review or a subagent report.

- Expanded bounds are mode-scoped; shared rendering/input coordinates and tower
  foundations use the same layout. Other custom geometry remains unchanged.
- Castle static cache keys include the layout revision; historical flat replays
  cannot reuse a live arched layout's scenery cache.
- Elixir multipliers change at elapsed 120, 240, 300, 420 and 540 seconds. King
  ownership remains per-seat and destroyed owners cannot receive passive income.
- Victory checks use actual dead Kings. Princess deaths cannot settle regulation,
  sudden death, or the final health-drain tiebreak. Simultaneous equal losses do
  not choose an arbitrary winner. Dead Kings are not reactivated.
- Group activation uses one earliest deadline and never postpones it on repeated
  hits. A side with an already-active King activates its remaining living Kings.
- Mirror has no painted center plane, even without CSS mask support. Real-asset
  pixel comparisons cover ordinary, Legendary and spell portraits; valid copied
  cost/hand selection is still tested through the browser shell.
- The expanded 5v5 placement bounds are exposed to AI candidates without changing
  the standard arena's decisions. A 10-seat worker completes the new timeline and
  produces learning updates, and the new AI outer-lane regression passes.
- Frozen v0.43 engine selection retains historical geometry/rules. Current-engine
  version expectations were updated explicitly, not by altering old fixtures.
- All original runtime asset bytes and both Windows launchers remain identical to
  the base. No frame-rate improvement or physical Safari test is asserted.

There are no remaining critical or important findings from this scoped review.
The final full-suite run and packaged rebuild are recorded separately.
