# Ultimate polish, Mirror and Bandit Squad

> **For agentic workers:** Implement assigned components with focused failing/passing regressions. Root integrates, reviews, builds and publishes only after final checks.

**Goal:** Replace the Kitchen Chef's placeholder appearance with the original Royal Chef, clean up Bowler Giant, improve spell portraits, add Ultimate Mirror/Bandit Squad, and allow three Builders with stronger healing.

**Architecture:** Extend the existing isolated Ultimate catalog and adapter. Reuse native Chef/Bandit/BossBandit assets. Mirror must resolve the actual played card throughout deployment, forecast, AI, HUD and replay. Keep normal Mirror unchanged.

**Tech stack:** Existing JavaScript/Canvas/native SC renderer, Node tests and Playwright.

## Requirements and decisions

- Release 0.58.3, publish GitHub and GitHub Pages under continuing user authorization. Work in E:/Projects/WebRoyale. Mirror project sources/ stays read-only; historical engines untouched.
- New `ultimate-mirror`, name Mirror, base mirror, standard variable-cost display, copies last non-Mirror card at its played level +3. Cost last card cost +1 capped at 20; twenty-elixir cards remain20. Repeated Mirror cannot recursively boost copied level/cost. No artificial level16 cap on this mode-only boost; base cards/forms remain capped normally. Mirror's copy uses ordinary base form behavior unless native policy already preserves forms; no free Hero/Champion abilities introduced.
- New `ultimate-bandit-squad`, 18 elixir: four native Bandit entities (actual source name `Assassin`) and one native BossBandit. No separate Champion ability requested. Preserve native dash mechanics/owner/level. All three Ultimate modes now share32 cards; normal123 untouched.
- Builder cap3, first stops decay, second heals1.5%maxHP/s (was1%), third heals3%maxHP/s total. Never overheal/resurrect, no Crown Towers. Forecast, AI, copy, descriptions and visible builder count agree.
- Kitchen death-spawn UltimateChef reuses original Chef native model/animations (`chr_royal_chef`, Royal_Chef_bot prefixes). Preserve existing melee Chef gameplay stats, remove fake Knight hat/apron/pan overlays. Use native artwork without misrepresenting imported model provenance.
- Bowler remains1.4 scale, two1.4 boulders, building-only acquisition and rolling ground collision. Improve pose/hand alignment, animation continuity and stones; no extra third ball; source sprites unchanged.
- User clarified improve spell artwork. Refresh weak spell portraits, especially Lightning Storm, Harvest, Royale Recall, Dark Pact and Elixir Spell, with richer original illustrations in existing card frames. Inspect all at small card size. Preserve unrequested troop art and all gameplay.

## Ownership and tasks

- [x] Root catalog/integration: ultimate-clash.js definitions/descriptions/native Chef alias; version/count tests, replay/browser integration and release docs.
- [x] Combat agent: battle.js, ultimate-combat.js, placement.js and any scoped Mirror HUD resolution hooks after coordination; tests covering real deploy, cost20/+3, delayed ownership, no recursion, normal Mirror unchanged and Builder counts/heal.
- [x] Visual agent: native.js/draw.js/potato.js/native-policy, correct Chef scene/death dependencies and cleaner Bowler plus three visible Builders; render tests/previews.
- [x] Art agent: render-ultimate-cards.cjs, assets/ultimate-clash/cards.json and card art assets; refreshed spell icons plus Mirror and Bandit Squad. Coordinate manifests after root catalog ready.
- [x] Review/build: independent source review, final build before full tests (never rebuild concurrently), source/package/regression/browser evidence.
- [x] Release: commit/push main, manual exact-SHA Pages dispatch, deployed file hashes and live browser checks; save proof and push docs.
