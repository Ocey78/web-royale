# v0.41.0 implementation review

Review was performed inline; no independent reviewer/subagent was available.

## Main failure cases checked

- Crown entitlement is derived from durable crown counters, not the displayed Crown
  Level. Old overlapping counters are not summed. Claims are normalized, merged,
  clipped to reached milestones, and committed after the award in one saved profile.
  Repeated battle receipts cannot award crowns twice. Crown Chest spending stays separate.
- Six player identities are seats, not team numbers or screen positions. Each team's
  three positions are a permutation. A zero-health King disables passive regeneration
  only for its owner. Collector credit remains active and limited to ten; the custom
  owner's Elixir Golem payout is isolated to 3v3 and its descendants retain ownership.
- Ground spawn, deployment, swept movement, waypoint planning, lateral yielding and
  arena painting share the same custom layout. Flyers and hovering/jumping troops keep
  their intentional terrain differences. The bridge-corner test proves that an unsafe
  lookahead does not consume the corner early. Yielding never turns off physical radii.
- New six-seat histories store up to six crowns. Replay captures all decks and the
  shuffled ownership map. A frozen old interpreter handles 0.38 records. Invalid
  ownership, string slot indices and custom-mode/legacy-version combinations reject
  before replay simulation can silently use the wrong topology.
- The training factory uses all twelve selected modes, including four-card cycle size,
  six-seat assignments, actual Boat configuration and elixir timelines. Generated
  worker runs complete a real match and generate nonzero learned weight updates in
  each of the twelve modes. Practice self-play never pays Crown Road currency/crowns.
- Custom arena rasters are bounded and reused, reflect texture/background policy, and
  avoid decoding a normal Trophy Road arena that is not displayed. No global graphics
  preset or existing arena artwork was reduced for this release.
- The local King's gold HP is drawn as a final arena overlay, above its destruction
  dust, so the zero-health indicator is not hidden behind the defeat particles.

## Preservation audit

The audit compares every existing runtime `assets/` hash with the exact supplied
v0.40.1 rebuilt ZIP. All 1,192 existing assets match. The two new Treasure palette
images and new mode/progression modules are additions. Windows BAT launchers,
existing cosmetic prices, graphics policy, deck manager, audio and all earlier
frozen replay interpreter files match their baseline source byte for byte.
Shop and stacked-streak behavior is also exercised through 190 existing-interface
checks on the generated v0.41.0 build, rather than inferred from source alone.

## Deliberate choices and limitations

- Crown Level begins at 1; the first reward is earned at ten crowns / Level 2.
- Treasure is 1/15 per eligible free-slot battle reward versus Gem at 1/12, and takes
  five subsequent wins to unlock. Crown Road chest contents settle immediately.
- All three enemy Kings are required for an immediate 3v3 win; crown advantage,
  overtime and the tiebreaker still apply at the timer boundary.
- Crown Road premium contents use eligible arena pools; a Legendary chest milestone
  falls back to Magical before any Legendary arena is reached, rather than granting
  an unusable future-arena card or an empty chest.
- The custom arenas follow the reference topology and style and use native towers
  and props, but are not represented as pixel-identical recreations of the screenshots.
- The regression suite, movement audit and headless Chromium checks cannot prove an
  FPS target on a physical phone or that every pathological crowd can never obstruct
  itself. No physical iPhone/Safari, Windows execution, or live deployment was tested.

## Initial failures retained in the audit trail

The initial full-suite run had ten failures: old assertions still expected the
current replay writer's former version string, and one source-string test expected
random deck construction directly inside the worker rather than its new shared
factory. Current-version assertions were updated; historical fixture engines and
expected digests were preserved. The worker test now also checks actual generated
mode/deck behavior. Subsequent complete runs passed.

Browser fixture bring-up exposed a missing v410 stylesheet import, which was fixed.
The fixture also initially waited too briefly for an AI's deliberate elixir-saving
behavior and for the first chest scene decode, and used an outdated learning-menu
selector. Those fixture checks now wait for actual conditions/use the current entry.
Later focused red/green tests cover rejected string ownership, custom replay engine
labels, custom quality-cache variants and the King's foreground health overlay.
