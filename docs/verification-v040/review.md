# v0.40.0 implementation review

The runtime diff is recorded in `runtime.diff`. Review was performed inline;
no independent reviewer/subagent was available in this environment.

## Findings addressed

1. Paying only at a modulus-zero milestone was incompatible with the requested
   stacking ranges. The currency function now computes unlocked tiers and pays a
   new receipt-keyed roll on every eligible win.
2. The old saved receipt caps (350 gold, 10 gems) would truncate higher-tier result
   displays. Profile/history limits now scale with the recorded streak and remain
   below the existing wallet cap. Tests cover actual credited totals and reloads.
3. Inserting the quantity draw into the card-selection RNG would change existing
   partial rotations. The quantity hash uses a separate seed. An old/new audit
   checked 1,008 rotations across 14 arenas and three seeds; all card IDs and
   prices stayed the same.
4. Live cosmetic prices are separate from imported historical metadata. Runtime
   metadata is now built from the live catalogue, so previews, shop prices and
   purchase charges agree. Existing ownership/refund behavior is not reset.
5. Chest prices and labels are driven by one catalogue. New chest variants use
   their own existing original icons and opening exports, and a Giant loot path
   was added instead of silently using Silver loot.
6. A rarity-only chest with no eligible pool is disabled/rejected before any
   charge. Unknown and prototype-property kind values cannot bypass pricing.

## Verification adjustments, not product failures

The first full suite had two outdated price expectations:
- `Shop chest rewards reveal immediately without occupying held chest slots`
  expected 20 gems remaining after buying Magical from a 100-gem balance (the old
  80-gem price). It now expects 50 remaining at the requested 50-gem price.
- `classic emote purchases persist, reject duplicates and insufficient gems`
  expected 50 remaining from 300 (old 250-gem emote). It now expects 250 remaining
  and uses a 49-gem wallet for the explicit insufficient-funds case.

Earlier milestone-specific and tower-skin-price tests were updated to assert
current requested rules while retaining all their save, duplicate-purchase and
reset checks. No test file was skipped or removed.

The initial new Gem Shop endpoint sweep of 650 rotations did not happen to draw
150 Common cards. The deterministic sweep was expanded to 2,000 rotations; the
production inclusive-range calculation did not need alteration.

## Limits

The Giant reward path uses Common/Rare contents based on bundled source amounts;
this is not a claim of a complete live-game probability model. No live deployment,
physical Safari/iPhone run or Windows launcher execution was performed. Existing
simulation/rendering/replay source and original artwork were retained.
