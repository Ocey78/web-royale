# Gameplay data update provenance

The active gameplay snapshot is `16.402.17+balance-2026-10-06`, with package label `160402017`. The original source fingerprint is retained separately as `504fe9d1820c587deda31030c70bc4d1121fea4f`. `DATA.sourceProvenance.decodedSha256` hashes the decoded CSV/TOML input bytes; these are not hashes of the encoded package entries. `DATA.sourceSections` preserves the authored native TOML content, while the active tables materialize source inheritance and the manual balance overlay.

The import uses the verified decoded v17 logic and the read-only v0.52.3 baseline. It preserves all 123 existing card IDs, display metadata, loadout slots, Trophy Road, chests, arenas, modes, and UI/progression tables. The roster contains 69 forms, including original source definitions for `ElectroGiant_EV1` and `ElectroWizard_hero`. Inclusion in the data roster does not establish complete simulation support.

`tools/import-gameplay-v17.py` is the reproducible importer. Run it with Python 3.11 or later:

```text
python tools/import-gameplay-v17.py --source <verified-v17-decoded-directory> --baseline <read-only-v0523-assets/game/data.json> --output <new-build-directory>
python tools/import-gameplay-v17.py --source <verified-v17-decoded-directory> --baseline <read-only-v0523-assets/game/data.json> --output <new-build-directory> --check
python tools/test-gameplay-import.py --source <verified-v17-decoded-directory> --baseline <read-only-v0523-assets/game/data.json> --output <new-build-directory>
node --test tests/october-balance-v053.test.cjs tests/modern-source-v052.test.cjs
```

The importer builds and validates the complete result before replacing the active asset and JavaScript data module. Unknown or cyclic source inheritance fails the import. Each file replacement is atomic; interruption between the two replacements can leave an inconsistent pair, which `--check` and the serialized-asset test detect. Rerun the import to recover.

## October 6 numerical overlay

The official article is [October Balance Changes](https://supercell.com/en/games/clashroyale/blog/release-notes/october-balance-changes-2026/). It states that its damage and hitpoint values are at Level 11. Each applied field records its original value, applied value, derivation method, and official target when available in `DATA.balanceOverlay.changes`.

All damage/hitpoint base values below are **manually derived**, not recovered post-balance native constants. The source Common Level 11 multiplier is 2.56. Each selected raw integer is the unique nonnegative integer satisfying `floor(base * 2.56) == official target`.

| Official changed field | Level 11 target | Derived raw base |
| --- | ---: | ---: |
| Hero Ice Wizard freeze damage | 46 | 18 |
| Cannon Evolution barrage damage | 261 | 102 |
| Barbarian Barrel damage | 215 | 84 |
| Royal Ghost hitpoints | 1152 | 450 |
| Royal Ghost attack damage | 263 | 103 |
| Goblin Drill crown tower spawn damage | 20 | 8 |
| Lava Hound attack damage | 71 | 28 |
| Ram Rider mount attack damage | 271 | 106 |
| Wall Breakers explosion damage | 302 | 118 |
| X-Bow damage | 61 | 24 |
| Three Musketeers hitpoints | 906 | 354 |
| Golden Knight attack damage | 168 | 66 |

Direct source-unit changes are Collector lifetime 110000 ms and production interval 15000 ms; Minion Giant attack interval 1700 ms; Lava Hound interval 1500 ms; Monk ability cast 700 ms and its protection TriggerDelay 700 ms (derived companion preserving the native equal cast/trigger relationship); Golden Knight dash range 5000 source units (5 tiles), with its secondary dash range and charge resolver radius updated consistently; and Elite Barbarians Evolution spear attack sequence sight 6000 source units (6 tiles). Its spear attack range remains the native authored 4500 units because the article changes sight only.

Goblin Barrel's first hit is 300 ms. The native package shares Goblin with other cards, so manual aliases `GoblinBarrelGoblin` and `GoblinBarrelGoblinDummy` copy the native real and decoy Goblins and specialize only LoadTime to `HitSpeed - 300`. Base, Evolution, and mirrored decoy Barrel projectiles point to those aliases. Ordinary Goblin keeps its native 400 ms first hit.

Source inheritance propagates the changed base fields to evolved and cloned Royal Ghost, the three distinct Three Musketeers entities, and the Wall Breaker Evolution initial explosion. Royal Ghost's independently authored small summons and the Wall Breaker Evolution runner explosion retain their native independent damage and health. The barrel aliases are explicitly manual adaptations, not native recovered entity IDs.

Ram's separately authored charge damage preserves the native exact 2x ordinary-attack relationship, giving raw 212. This is a derived companion value; the article does not separately specify charge damage. Hero Ice Wizard's independently authored tower damage and Cannon Evolution's independent crown tower damage retain v17 values because the article does not give separate targets. No unspecified numerical field is presented as a recovered post-balance native constant.

## Remaining limits

Skeletons' tighter spawn spread has no numerical specification in the official article. Native v17 spread remains active, and `DATA.balanceOverlay.unresolved` records this gap. Golden Knight's collision-edge targeting is an engine rule, validated separately from these data tables. Native pathfinding/collision parity, other undocumented constants, and complete native engine equivalence are not established by these import tests.

`DATA.manualEntityAliases` records the explicitly manual barrel entity specializations and each original native rendering entity (`Goblin` or `GoblinDummy`). The build policy copies those original scene and animation configurations into its generated in-memory native table. The authored `assets/native/data.json`, textures, scene definitions, and card art manifest remain byte-preserved; their art snapshot is `sourceProvenance.uiProgressionBaseline` rather than the new gameplay snapshot.

The package includes both inputs for an offline reproducibility check:

```text
python tools/import-gameplay-v17.py --source reference/gameplay-v17 --baseline reference/baseline-v052.json --output . --check
python tools/test-gameplay-import.py --source reference/gameplay-v17 --baseline reference/baseline-v052.json --output .
```

The baseline JSON retains its original key order, which is required for the byte-identical check. Re-serializing it with JavaScript changes numeric-key ordering even though the resulting JSON data is semantically equal.
