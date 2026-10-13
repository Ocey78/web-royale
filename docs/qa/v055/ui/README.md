# Deck, collection and daily-card shop comparison

The `before/` and `after/` images use the same isolated profile, cards, shop time and browser sizes: 1000×1080 desktop and 390×844 phone. The game viewport is captured rather than the surrounding desktop. `before/` is the built 0.54 menu; `after/` loads the updated `src/v540.css` and `src/v550.css` over that same build. No profile was changed outside the isolated browser context.

References inspected directly:

- The supplied `Photos-1-001` screenshots: active/inactive special deck slots, collection variants and cleaner daily shop cards.
- Live Clash client captures `03-deck.png`, `04-collection.png` and `06-shop-scroll.png` from the 419×633 Android window in `work/clash-live-v055`. These confirm cobalt deck controls, a deep navy deck field, four card columns and a blue diamond collection background. Its paid resource bundles are a different offer type from the daily card offers changed here.

## Measured changes

| Measurement (logical 540px screen) | Before | After |
| --- | ---: | ---: |
| Deck portrait width | 86px | 113px |
| Portrait share of screen width | 15.9% | 20.9% |
| Deck grid side padding | 62px | 12px |
| Daily-card title size | 16px | 20px |
| Daily-card rarity size | about 14px | about 20px |
| Daily-card portrait | 108×143px | 120×148px |
| Price row within offer panel | No | Yes |

The deck keeps its existing eight positions and controls. Narrow outer gutters replace the nested gray borders. The selected tabs are cobalt; the card field is navy; active Evolution/Hero/Wild slots have bounded inner and outer lighting. Unused special slots retain their eligibility colors, and inactive variants retain gray diamonds. Collection uses the existing diamond texture, brighter blue coloring, and larger level lettering. The daily-card offers retain their three-column layout, with additional height for titles, progress and prices. Native portraits and frame assets were not edited. Card level labels now enable the original outline atlas and use their full available width; every deck label fits at the intended 20px instead of retaining a smaller intrinsic width.

## Verification

- `browser_menu_polish_v055.cjs` captured six matched images per version. It checked all eight deck slots on both viewports, card-detail opening/closing, no horizontal overflow, ordered portrait/progress/price regions and no browser errors. The baseline records its existing price overflow without treating that known defect as a test failure.
- `browser_ui_v540.cjs` ran with source modules and the updated stylesheet. Its 12 captures and checks passed: active/inactive/locked variants, card detail interaction, shop quantity placement, tower preview label separation and zero clipped canvas-edge pixels, mode cards, battle cycle states and phone layout.
- JavaScript syntax and scoped whitespace checks passed.

The changes improve proportions and hierarchy against the references; they are not a pixel-perfect recreation. The existing deck management toolbar, separate Heroes & Evos control, and collection content remain the Web Royale functionality.

The final built release passed the full `browser_ui_v540.cjs` regression on 2026-10-13 at `http://127.0.0.1:8087/` with `UI_SOURCE_PREVIEW=0` and `PROOF=docs/qa/v055/ui/built`. The same release was independently identified by the shadow harness as version `0.55.0`, `app.c99cbaf49401.js`, `styles.cdacf7dcad18.css`. No source modules or styles were injected. `built/report.json` records all 12 captures, `sourcePreview: false`, `passed: true`, and no browser errors. Active special slots load their original modern form portraits; shop regions remain ordered; every tower preview has separate label/price regions and zero clipped edge pixels. The built desktop deck, daily-card shop, tower shop and phone deck images were inspected directly. All eight deck slots fit on phone with no horizontal overflow.

To repeat the matched captures, serve the current built release locally and run the helper with `UI_MENU_BASELINE=1` for baseline, or without that flag for the source stylesheet. `UI_MENU_BUILT=1` checks the delivered bundle without injecting styles. `WEB_ROYALE_URL` overrides its default port 8094; `PROOF` overrides the output directory. Metrics and browser error results are saved in each `report.json`.
