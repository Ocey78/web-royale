# v0.58.3 Ultimate artwork

Completed five requested spell refreshes plus Mirror and Bandit Squad. All unrelated existing portraits remain byte-for-byte unchanged (25 verified). No gameplay, native renderer, or historical-engine files were edited.

## Final assets

- `assets/ultimate-clash/cards/ultimate-lightning-storm.png`
- `assets/ultimate-clash/cards/ultimate-harvest.png`
- `assets/ultimate-clash/cards/ultimate-royale-recall.png`
- `assets/ultimate-clash/cards/ultimate-dark-pact.png`
- `assets/ultimate-clash/cards/ultimate-elixir-spell.png`
- `assets/ultimate-clash/cards/ultimate-mirror.png`
- `assets/ultimate-clash/cards/ultimate-bandit-squad.png`

Every output is an opaque 474 × 602 PNG with no embedded card UI, text or elixir badge. Mirror's gold-and-steel border is the actual mirror object, not a card frame. Bandit Squad uses four native Bandit portraits surrounding the larger native Boss Bandit portrait.

The five spell illustrations were created with the **built-in imagegen tool**, one call per asset. No CLI/API fallback was used. Their exact final prompts are retained in `assets/ultimate-clash/illustrations/prompts.json` and in each generated entry of `assets/ultimate-clash/cards.json`. The unmodified generated source PNGs are local at `assets/ultimate-clash/illustrations/{lightning-storm,harvest,royale-recall,dark-pact,elixir-spell}.png`. They are approximately 11.9 MB combined. Source hashes, final hashes, dimensions and provenance are recorded in the card manifest.

`tools/render-ultimate-cards.cjs` now imports these retained illustrations before applying any procedural art branch, so a later full generator run cannot replace them with their old placeholder recipes. Mirror and Bandit Squad remain reproducible native-portrait Canvas compositions. I rendered only the seven requested assets.

## Visual review

- `work/v0583/art-featured-contact-sheet.png`: all seven assets at 237 × 301 and 71 × 90 hand size.
- `work/v0583/art-all-cards-contact-sheet.png`: all 32 cards at collection size.
- Full-size original illustrations and both new native portraits were also inspected.
- Lightning retains three bright strikes and a strong cloud silhouette; Harvest has an unmistakable central elixir droplet; Recall has a cyan portal; Dark Pact separates the crimson powered sword and purple vitality drain; Elixir Spell shows purple glue gripping both red- and blue-team boots. All remain visually distinct in the 71 × 90 preview.
- Bandit Squad was revised once to expose all four smaller Bandit faces around the leader.

## Verification

- Red: `node --test tests/ultimate-polish-art-v0583.test.cjs` failed both tests before implementation, on the unchanged Lightning Storm hash and missing Mirror portrait.
- Green: `node --test tests/ultimate-polish-art-v0583.test.cjs tests/ultimate-expansion-catalog-v0582.test.cjs tests/ultimate-catalog.test.cjs` — 10/10 passed.
- `node --check tools/render-ultimate-cards.cjs` — passed.
- `node work/v0583/inspect-art.cjs` — all seven selected portraits exactly 474 × 602 with zero transparent pixels; 25 unrequested original portraits unchanged. Machine-readable evidence: `work/v0583/art-verification.json`.
- `node work/v0583/check-art-reproduction.cjs` — repeated selected generation reproduced all 32 portrait hashes and the full manifest byte-for-byte.
- Browser helper commands use `NODE_PATH=C:/Users/Oceyi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules` and Chrome.
- No full suite, production build, commit or push was performed by the art agent.

## Integration notes

The root catalog already contains the final descriptions supplied during coordination, and the manifest-description equality checks pass. The existing v0.58.2 test title says native compositions even for generated spell art, but its actual provenance checks remain valid because `sourceFiles` names the locally retained original image. Root may rename that test title for clarity.

The asset ignore rule requires force-adding all new source PNGs and the two new card PNGs. Ensure all seven final card PNGs, all five illustration source PNGs, `illustrations/prompts.json`, the updated manifest/generator and the new art test are included in the release/source package. Preview images and this report are evidence only and are not runtime assets.
