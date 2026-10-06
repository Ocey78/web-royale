# Web Royale 0.53.0 gameplay update

This build contains verified package 160402017 gameplay tables plus the manually applied October 6, 2026 published numerical balance changes. It is **not an exact native Clash Royale simulator** and does not contain the original proprietary battle-engine code.

The roster has 123 base cards, 43 Evolutions, 18 Heroes, 8 Champions, and four active tower troops: Tower Princess, Cannoneer, Dagger Duchess, and Royal Chef. Graph support is 121/123 base cards and 52/69 special forms. Those counts measure recognized local behavior, not native equivalence. Full entry-by-entry results are in `docs/gameplay-status-v053.json`.

Gameplay changes include source zero-radius handling; Goblin Drill arrival/morph and 20-damage crown impact; effective attack range in navigation; the published balance numbers; Cannon barrage payload damage; Monk's 700 ms activation and four-second movement lock; Golden Knight's five-tile target-edge dash check; Electro Giant Evolution and Hero Electro Wizard source-action interpretation; clone preservation during level changes; source-specific reflected crown damage; correct Chef King stat scaling; and Goblinstein doctor-only ability ownership.

The standard arena tower centers already matched the recovered spawn group: King (9,3)/(9,29), Princess x=3.5/14.5 at y=6.5/25.5, in the existing 18-by-32 coordinate system. They were checked and retained. Native collision/pathfinding equations and exact tick scheduling remain unrecovered.

Live matches, replays and headless training now advance at the same 1/60-second step. Training previously stepped at 50 ms and produced different combat outcomes. This alignment establishes internal consistency, not the native game's tick rate. Earlier 0.52 replays use an isolated copy of their released data and simulator. New replay fingerprints include the manual balance overlay. The new learning archive uses `WebRoyaleMain053/AI` and separate browser keys, preserving the previous model files and player profile.

## Accuracy limits that remain

- The native pathfinder, unit-separation solver, target ordering, placement validation and full ability state machines are not recovered or proven equivalent.
- Skeletons' new spacing is unpatched because the official announcement supplies no numeric spacing.
- The new Electro Giant pulse's growth curve and some Electro Wizard target-memory/scheduling details are local interpretations. Their capability reports explicitly set `exactReady:false` and list those gaps.
- Unsupported actions remain unavailable, including several Evolutions. Correctly parsed native data does not mean every card can execute its complete behavior.
- Package data plus public balance notes cannot verify unobserved server hotfixes or original runtime arithmetic at every level.

`RoyaleCore.SIMULATION_CONTRACT` (or `require('./src/core').SIMULATION_CONTRACT`) exposes `nativeBattleCode:false` and `nativeParityVerified:false`. This package cannot serve as a validated exact-real-game ground truth for reinforcement learning.

## Run and source references

Open `open offline.bat` in the extracted folder. The full editable source and generated web build are included. Menus, shop, accepted arena artwork and original image bytes were retained.

- `docs/gameplay-data-v053.md`: input hashes, balance formulas, source-versus-manual fields, and importer commands.
- `docs/new-forms-v054.md`: implemented new-form actions and unrecovered semantics.
- `docs/tower-champions-v054.md`: tower/Champion gameplay checks.
- `docs/replay-v052-provenance.json`: frozen historical source hashes.
- `reference/gameplay-v17/`: decoded native tables used in the import.
- `docs/verification-v053.json`: final build/test evidence.

The official balance reference is https://supercell.com/en/games/clashroyale/blog/release-notes/october-balance-changes-2026/ . HP/damage targets there are Level 11. Derived raw integers and companion fields are labeled in DATA.balanceOverlay; they are not presented as recovered post-balance native constants.

## Verification

Full integration: 1,639 passed, one intentional Custom-only skip, zero failed; this included all-card sustained battles and six event-mode stress cases. After the final zero-lifetime area first-tick guard, every non-stress test was rerun against the final source and rebuilt worker: 1,639 passed, one intentional skip, zero failed. Both long stress cases were subsequently rerun from the independently extracted final ZIP: two passed, zero failed. Across the final non-stress and stress runs, all 1,641 cases passed with one intentional skip. Independent final review passed 38 focused checks; reproducible import passed five checks and a byte-identical reimport. All 1,897 generated files match the final release manifest. The final hashed browser bundle loaded, entered battle and completed a match without console errors.

These are local simulator regression checks, not comparison tests against native Clash Royale executions. Detailed scope and hashes are recorded in `docs/verification-v053.json`.

The GitHub build retains lossless compressed scene files. Its gameplay and training bundles are byte-identical to the offline build. All 1,897 published file hashes match its separate release manifest; 19 publication asset, replay, and simulation checks passed. The ZIP also passed independent path/CRC checks and comparison of all 3,570 extracted files.
