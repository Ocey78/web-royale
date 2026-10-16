# Independent v0.58.3 source review

Reviewed the patch against `f75245a` and the implementation plan. No actionable source findings remain.

The reviewer checked catalog isolation, Mirror cost/level resolution across deployment, placement, AI and replay, native Bandit dashes, Builder healing/cap, Chef upper/lower composition, two-stone Bowler rendering and artwork provenance. Twenty-five catalog/combat/replay/art/UI checks passed. All eight rendering checks passed after the Chef streaming guard was added.

The Chef now waits until both native layers can paint, preventing a partial actor while textures load. Historical replay compatibility was traced separately: entering a replay clears selection, replay selection is disabled, and archived engines retain isolated AI and placement modules. The new preview helper is unreachable for those archived battles.

Release staging must include the ignored new source and portrait PNG files explicitly. Root handles the final build, full regression suite, packaged browser tests, publication and live checks.

The final browser inspection found that Mirror's new level label was present in the DOM but beneath its portrait. A browser regression reproduced its incorrect static positioning. The reviewer confirmed a scoped top label with z-index 4, explicit child font size and no pointer capture; this clears the portrait/frame and avoids the cost badge. Root added that CSS correction and validates the rebuilt artifact separately.
