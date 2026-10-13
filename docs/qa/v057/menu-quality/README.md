# Menu rendering check

Captured the delivered 0.56.0 build and the current `presentation.js` at the user's 1251 × 930 browser viewport, DPR 1, with Good graphics. The home source animation is fixed at 1.2 seconds for the comparison. Both captures use the same original texture assets, 652 × 644 home canvas, and 315.8125 × 311.9375 displayed arena area.

The current home painter uses high-quality image sampling inside its saved canvas state. The context returns to its previous `low` value after restoration; the value in `comparison.json` records that restored state. The change to the arena edges is subtle. It does not change or sharpen the menu's bitmap icons, text, buttons, layout, or source artwork.

Home framing is now resolved once per source symbol. Repeated source frame tuples, including nested clip frames with separate frame rates, reuse the existing canvas pixels. A changed source frame, arena, canvas, or canvas dimensions causes a new paint. `tests/home-render-cache-v057.test.cjs` covers those cases, and all 22 focused presentation tests passed.

A separate initial fresh-profile measurement found no persistent menu slowdown on this machine: home paint CPU time averaged 0.31 ms (0.70 ms p95), and cards/shop did not redraw the home arena. Those local measurements do not demonstrate performance on the user's device or after a long battle. No global noise or sharpening pass is active at the Good setting; the Ultra finishing pass is disabled there.
