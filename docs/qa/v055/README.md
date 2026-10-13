# Visual polish comparison

Baseline: published 0.54.0 (`2d01d1c`). The comparison uses the user's ten Photos-1-001 screenshots, the installed Clash Royale client (version code 160402020), original model/material/animation assets and isolated Web Royale browser profiles.

`reference/` preserves selected live-client observations. The emulator's native capture is 419×633; the supplied photographs provide higher-resolution menu detail. Read-only menu and built-in card preview navigation did not change the account's deck, currencies or progression. These captures are documentation and are not included in the deployed site.

`ui/before` and `ui/after` show matching deck, collection and shop profiles. Deck portraits occupy 20.9% of the logical screen width, up from 15.9%. Card level text has source outlines restored and fills its enlarged card. Shop prices stay within their offer panels. See `ui/README.md` for measurements and checks.

`layers/` contains the old build and source preview comparisons for home/navigation and crowded battle scenes. Home keeps its existing functional layout with a teal diamond background, stronger panel depth and consistent navigation selection. The battle ground pass paints all troop shadows before bodies; the HUD pass paints health and deployment labels after actors/effects. Hidden effect carriers and burrowed actors cannot cast detached blob shadows. Browser comparisons confirm that rendering does not alter the replay digest.

The delivered 0.55.0 bundle passed the full regression suite: 1,702 tests passed, zero failed, one existing test skipped (`full-regression.log`). The built UI regression covers 12 screens; `ui/menu-built/report.json` separately verifies the six matched menu captures and measurements. `layers/built/` shows the delivered home at three viewport sizes and a crowded 16-actor battle with both teams' Knight and Bowler heroes; the battle digest stays unchanged.

`models/built/gpu-check.json` verifies 40 GPU samples plus continuous poses, authored transitions, visibility boundaries and shared shadow/body sampling. `models/all-actors-built.json` covers 3,864 samples across 161 actors, including all 36 modern actors. Expected source-invisible controller/initial poses match the 0.54 baseline; no new pose is missing. `shadows/built/` verifies eight native silhouettes, bounded memory and unchanged entity state. The related READMEs document projection and material limitations.

The production checks load delivered modules and styles without source substitutions. `final-bundle.json` records file hashes and module provenance; `deployment.json` records the published commit and live-site verification after deployment. The source-based renderer remains an interpretation of the native engine. Passing tests or matching asset hashes is not evidence of pixel-identical presentation.
