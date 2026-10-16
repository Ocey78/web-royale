# Ultimate Clash independent review

Reviewed 2026-10-16 against baseline `06652d7`, the implementation plan, the supplied diff, and the final working files. No source files were edited by the reviewer.

## Verdict

No unresolved material defect remains from this review. The implementation covers the exclusive 20-card catalog, independent decks, mode timing and elixir rules, hero/evolution controls, combat mechanics, source visuals, replay integration, and the measured rendering optimization. Normal-mode changes are narrowly scoped, and custom lookup maps do not mutate the generated native source data.

The final rebuild, full suite, and release browser checks run separately and remain release gates. This review does not substitute for those checks.

## Findings resolved before release

Six concrete findings were corrected and reviewed before release. The Harvest classification finding was identified in the root's final spot check and independently verified here.

| Finding | Correction and verification |
|---|---|
| P2: Executioner Cage fired duplicate axes at the same enemy when fewer than three targets existed. | Its shot count is capped to distinct available targets. One-, two-, and three-target regression cases pass; ordinary multi-target actors retain existing behavior. |
| P2: Tesla's warning occurred at the firing instant after its first shot, including when acquiring a target after idle charging. | Both charge paths now emit the warning with a one-second lead. Repeated four-second discharge and idle-acquisition tests pass. |
| P2: Hero Frostbite's Snowball projectile artwork was absent from the preload dependency closure. | `SnowballSpell` is declared in Frostbite's visual dependencies. The runtime regression and an independent Hero-Frostbite-only dependency check both retain `spell_snowball_dl`. |
| P2: Custom projectile damage was omitted from the Ultimate replay fingerprint. | Custom projectiles are included. Changing Elixir Witch projectile damage now rejects incompatible saved replays. |
| P2: Harvest used broad name matching, assigning cheap troop rewards to specialists such as Guards, Mega Minions, and Elite Barbarians. | Exact basic-family membership and authored `CHARACTER.Base` ancestry replace substring matching. A 33-entity actual-death regression verifies ordinary variants retain their family rewards while specialists receive the catch-all 1 elixir. |
| P3: Harvest gain labels displayed `+0` despite correct elixir credits. | Harvest events now carry the credited reward amount used by the renderer. |

## Verification

- Final focused combat, replay, custom rendering, and geometry-bounds run: **41 passed, 0 failed**. It covers the actual-hit evolved Princess correction, the findings above, exact geometry equivalence, the Egg's source idle animation, and the new 33-entity Harvest death/credit regression.
- Independent executable checks passed for both teams' one-third Meteor troop damage and reduced crown damage, enemy-half CODE RED impacts, and Builder attachment ownership.
- An actual Hero Frostbite deployment and ability activation replayed to an identical digest, including after backward/forward seeking.
- Five Elite Barbarians match native Barbarians formation positions; six Balloons match native Royal Recruits positions.
- Reviewed catalog/deck isolation, seeded random scheduling, custom state replay coverage, one-cycle Escort deployment, hero controls, source aliases, Builder artwork loading, and bounded renderer caches.
- Reviewed performance evidence: the 12-actor effects workload's synchronous draw mean falls from 22.85 ms to 14.12 ms, with zero changed image channels. These measurements describe that draw workload, not full-game FPS.

The review found no additional material correctness or normal-mode regression issue in the inspected paths.
