# Independent release review

Compared the final v0.28 simulation, UI and replay changes with the verified v0.27
source. Thirty focused combat, spawn, native-facing and replay tests passed independently.

Review found one regression while the spawn fix was in progress: a Balloon death
bomb was relocated from its death point. The final fix preserves effect-carrier origins.
The reproduced case now matches the previous version: origin (9,16), 199 damage to
an enemy Giant at (9,19.2). Skeleton-container children still settle on legal land.
The fractional-radius bank placement regression was also fixed and tested.

No actionable blocker remained in the reviewed change. This is a regression review,
not certification of complete native-game equivalence.
