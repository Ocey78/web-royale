# v0.58.3 native presentation

## Changes

- `src/native.js`: UltimateChef composes the original `Royal_Chef_bot` and matching `Royal_Chef_top` timelines from `chr_royal_chef`, including the red team and all nine authored directions. Both layers use the same attack timing. The original asset has no run clip; walking keeps its native idle animation and adds a small travel-linked step to the combined model. The Knight hat/apron/pan overlays are removed. The health anchor includes the real upper layer, and a streamed Chef waits for both layers before painting.
- Bowler Giant retains the 1.4 body and 1.4 projectile scales. Its flattened source frames contain the ordinary central stone, so the giant is confined to the empty-handed frame range 17–32. Its holding pose is stable; windup dips/lifts the original body and recovery returns to that pose. The two stone positions follow palm anchors measured against the actual source pose/direction rather than a separate bobbing clock. Fake purple hand ovals are gone. Both stones disappear at release; carried stone scale now also follows preview/caller scale correctly. Ordinary Bowler playback is unchanged.
- `src/draw.js`: supports three distinct original CoC Builder actors; positions of the first two are unchanged, and the third works at the front with its own animation phase/direction. Placement ghosts now use `Battle.playableCard`, retaining Ultimate Mirror's resolved +3 level.
- `src/potato.js`: displays the effective Builder count up to `B3` without native scene access.
- `tools/native-policy.cjs` required no change: its existing aliases correctly copy the new Chef mapping, and the existing scene-closure traversal includes Kitchen death Chef, Bandit, Boss Bandit, and cards available to Mirror.

## Verification

- `tests/ultimate-polish-render-v0583.test.cjs`: eight focused tests, using actual native scene metadata for Chef composition, attack/walk poses, Bowler empty-handed frames, carried-stone scale/release, and dependency closure. Builder rendering verifies real export names plus distinct positions/phases. Potato verifies the visible third-Builder count.
- Initial regressions failed for missing Chef upper layer/walk movement, the two-Builder cap, idle Bowler pose drift, carried-stone scale, and missing potato count. `visuals-red.log` records that run. The separate composite-loading regression then failed before its readiness guard was added.
- Fresh final focused run: **22 passed, 0 failed**, combining the new eight tests with `ultimate-expansion-render-v0582.test.cjs` and `ultimate-render-v058.test.cjs`. Full output: `visuals-green.log`.
- No full suite, build, commit, or publish was run by this agent. Root owns integrated verification/release.

## Render evidence inspected

- `source-frame-contact-sheet.png` identifies Bowler's baked-in central stone returning at frame 33 and the Chef's separate lower/upper source layers.
- `source-hand-grid.png` records source palm measurements and the original composed Chef.
- `before-native-contact-sheet.png` / `after-native-contact-sheet.png`: actual browser Canvas render before/after using the source module harness against local bundled assets. Each rendered **36/36 actor samples with zero page errors**. Reports: `before-preview-result.json` / `after-preview-result.json`.
- Contact sheets include six facings including a mirrored west view, Bowler blue idle/red windup/empty hands after release, Chef idle/attack/walk, blue/red Builder counts 1/2/3, and four original Bandits plus Boss Bandit.
- Visually confirmed that the original Chef is complete with its original hat, pan, spatula and apron; the Bowler has exactly two hand-aligned carried stones and no central third stone; all three Builders occupy visible distinct positions. Chef is kept at the original source scale.

## Limits and integration notes

The Bowler's source artwork is flattened rather than skeletal, so its new empty-handed gait adapts existing source poses and applies a small travel-linked step; no original sprite bytes were edited. The Chef likewise has no authored run export. All source textures/scenes remain unchanged. The contact sheets are renderer-level evidence; full combat, built-package, replay, and live release checks remain with root.

The local preview host on loopback port 8094 is running (`node tools/serve.cjs 8094`, execution session 22887), available for root's browser checks.
