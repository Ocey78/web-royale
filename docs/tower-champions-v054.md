Tower troops and Champions: package 16.402.17 plus October 6, 2026 balance overlay

Import evidence

The decoded support_cards.toml has five rows. modernProgression.supportCards matches all five rows field-for-field. Four rows are active: King_PrincessTowers, King_CannonTowers, King_KnifeTowers and King_ChefTowers. GoblinQueen_SpawnAbility has both NotVisible=true and NotInUse=true and is excluded. There was no stale support-card table discrepancy. Runtime reads modernProgression.supportCards intentionally; a separate DATA.supportCards field is not required.

All eight Champion forms and their actor, projectile, ability and action dependencies are imported. Comparing 144 scalar fields from the eight decoded CHARACTER-file ABILITY sections found only three deliberate October overlay differences: GoldenKnightChain.DashRange 5500 -> 5000, Deflect.CastTime 933 -> 700 and Deflect.TriggerDelay 933 -> 700. This scalar comparison does not certify the complete native engine or every nested field.

Source values and computed interpreter values

The raw columns below are resolved table values. Level 11 columns are exact outputs of this build's existing stat-scaling code, not a claim that proprietary native rounding has been recovered. Time is milliseconds; table range units are 1000 per tile.

| Tower entity | Raw HP | Raw projectile damage | HitSpeed | Range | Interpreter L11 HP | Interpreter L11 damage |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| PrincessTower | 1400 | 50 | 800 | 7500 | 2730 | 107 |
| Cannoneer | 1200 | 125 | 2200 | 7500 | 2340 | 267 |
| DaggerDuchess | 1270 | 42 | 500 | 7500 | 2476 | 89 |
| ChefTower | 1240 | 50 | 1000 | 7500 | 2418 | 107 |
| KingTower | 2400 | 50 | 1000 | 7000 | 4680 | 107 |
| ChefTowerKing | 2400 | 50 | 1000 | 7000 | 4680 | 107 |

| Champion actor | Raw HP | Raw initial damage | HitSpeed | Range | Interpreter L11 HP | Interpreter L11 initial damage | Ability cost | TriggerDelay / CastTime | MaxCharges |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: |
| MightyMiner | 879 | 17 | 400 | 1600 | 2250 | 43 | 1 | 500 / 933 | 1 |
| SkeletonKing | 898 | 80 | 1600 | 1200 | 2298 | 204 | 2 | 500 / 933 | 1 |
| ArcherQueen | 391 | 91 | 1200 | 5000 | 1000 | 232 | 1 | 200 / 933 | 1 |
| GoldenKnight | 703 | 66 | 900 | 1200 | 1799 | 168 | 1 | 0 / 0 | 1 |
| Monk | 865 | 55 | 800 | 1200 | 2214 | 140 | 1 | 700 / 700 | 1 |
| LittlePrince | 273 | 41 | 1200 | 5500 | 698 | 104 | 3 | 50 / 944 | 1 |
| goblinstein monster | 875 | 50 | 1500 | 1200 | 2240 | 128 | 2, owned by doctor | 50 / 933 | 1 |
| BossBandit | 1025 | 96 | 1100 | 800 | 2624 | 245 | 1 | 200 / 933 | 2 |

Goblinstein's native doctor owns Ability='goblinstein_ability'. Its raw HP is 282, projectile damage is 53, HitSpeed is 1800 and Range is 5500. This build computes Level 11 HP=721 and projectile damage=135. The monster has no native Ability field.

Verified runtime corrections

ChefTowerKing inherits BUILDING.KingTower, including Hitpoints=2400 and SkinType='KingTower'. Catalog classification previously applied a troop factor, producing Level 11 HP=6144. It now follows the same King Tower curve as the ordinary inherited source, producing HP=4680 and damage=107. Actual Battle comparisons cover levels 1, 9, 11 and 16.

Monk's AbilityStateDuration=4000 and GameTagsWhileAbilityActive='AVOIDANCE_AS_OBSTACLE,NO_MOVE_ALLOW_ATTRACT' now create an explicit four-second tag lifetime after activation. Movement remains stopped throughout that lifetime, its native ShieldBoostMonk reduces 1000 incoming damage to 350, and movement resumes when the tag lifetime expires.

Goblinstein's deployed pair previously received two ability controls because its form source had neither abilityCharacter nor LinkedChampionCharacter. Form attachment now uses the native Ability field of a summoned source actor when such a carrier exists. The doctor receives the ability and the monster does not. Existing explicitly authored carrier rules and content-free fixture forms remain supported.

LOGIC_CHAMPION_CAN_EXECUTE_ABILITY_FROZEN.BooleanValue=true now allows activation and completion of a stopped Champion's pending ability cast. Recognition requires a Champion form and ability ID present in imported native DATA.forms. Actual Monk tests cover Freeze applied before activation and during its 700 ms cast, and verify that ordinary movement and attack remain stopped. A false flag rejects activation. The existing Hero fixture still pauses its pending action while frozen.

Guardian's ChampionGuardCleave has Damage.BaseDamage=125, HitSpeed=50, OneHitPerTarget=true and FollowBehaviour='FollowParent'. The battle engine now applies this authored tick damage to targets encountered after area creation, once per target. Actual Little Prince activation summons ChampionGuard and its moving area deals 320 damage at Level 11. Battle changes and the independent late-entry area regression were made by the battle-engine owner.

Actual ability-effect validation

tests/tower-champions-v054.test.cjs has twelve tests using the real imported DATA and real Battle. They cover:
- Each of the four active tower troops selecting its source projectile and delivering its computed damage; source deployment groups are supported in 1v1 and 2v2.
- Chef King Tower health scaling.
- Monk's four-second movement lock, 65% reduction and native frozen-ability flag.
- Goblinstein doctor-only ownership and 94-damage tether pulses every 500 ms at Level 11.
- Mighty Miner's 500 ms lane switch and original-lane bomb dealing 332 damage at Level 11.
- Skeleton King's native 1450 ms soul flight and base-six-plus-one-soul summon count.
- Archer Queen's 200 ms buff trigger, 3500 ms cloak lifetime, source HitSpeedMultiplier=280 and SpeedMultiplier=-25.
- Golden Knight's complete ability activation and 335-damage dash hit at Level 11.
- Little Prince's source Guardian summon and 320-damage charge hit.
- Boss Bandit's two-charge, three-second cooldown flow, 200 ms trigger and 700 ms delayed six-tile backward warp.

Final focused command:
node --test tests/tower-champions-v054.test.cjs tests/forms-live-v17.test.cjs tests/card-forms-v052.test.cjs tests/tower-troops-v052.test.cjs

Result: 46 tests passed, zero failed. Parent integration owns final build, complete suite and packaging.

Remaining limits

canDeployCard marks every card/form exactReady=false and executionFidelity='source-interpreted'. A deployable graph means that the interpreter can execute its recognized actions; it does not prove complete native parity. Collision, navigation, stat-rounding details, scheduling phases and complete target-memory semantics are not recovered. Visibility changes in these tests are processed on the next interpreter update after the ability buff starts, which must not be presented as measured native frame timing.

Boss Bandit's LockDelay and ReleaseLockDelay native lock phases remain unmodeled. The source's MaxCharges is consumed per unit by this interpreter; unrecovered native charge/refill semantics are not replaced with a guessed recharge constant. Native continuous/relative pushback behavior and general movement scheduling are still interpretation limits even though the Guardian's authored one-hit damage now works. See docs/new-forms-v054.md for Electro Giant pulse interpolation, zero-based level guard and Hero Electro Wizard scheduling/target-memory limits.

No menu or shop work was added by this audit. No new persistent replay fields were introduced for these fixes: Monk uses the existing modernActions.tags list, and ability ownership uses existing formId and abilityState.