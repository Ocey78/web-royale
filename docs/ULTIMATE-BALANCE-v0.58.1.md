# Ultimate Clash balance — v0.58.1

This first balance pass prices the implemented cards against the native card costs bundled with Web Royale. It applies to the Ultimate Clash family: 1v1, 2v2, and 3v3. Regular cards keep their original prices. The 20-elixir cap, tower health multipliers, and match elixir schedule are unchanged.

Large formations receive a discount for committing many troops in one play, sharing spell exposure, and leaving less elixir for responses. The discount does not erase their much larger army value. Random and conditional effects receive a discount for missed impacts or failed payoff. These are design estimates from the implemented mechanics, not measured equal-win-rate claims.

| Card | Previous | New | Reason |
| --- | ---: | ---: | --- |
| Mega Minion Horde | 8 | **14** | Six native Mega Minions cost 18 separately. A four-elixir formation discount still leaves room to pay for six durable flyers and the six-member Hero option. |
| Lightning Storm | 10 | **14** | Six waves each choose 1–3 targets. Repeated lightning can remove several expensive troops; the smaller field, random target count, and time to escape temper its value. |
| Heal Spell | 4 | **3** | A wide, double-duration Heal Spirit field supports dense armies but needs damaged allies and provides no attack or body. Three elixir makes the support play worthwhile. |
| Balloon Parade | 12 | **20** | Six Balloons are 30 elixir of separate units. They retain their normal attacks and death damage, so the full 20-elixir commitment is appropriate even after a substantial formation discount. |
| Executioner Cage | 9 | **16** | The three Executioners released on death already cost 15 separately. The preceding cage also throws axes at up to three distinct enemies; its short lifetime and shared spawn position offset some of that extra defense. |
| Builder | 5 | **5** | Preventing lifetime decay is a lasting benefit, particularly on the custom buildings. A second five-elixir investment adds healing, while enemy attacks can still remove the building. |
| Magic Trio | 7 | **10** | Ice Wizard, Electro Wizard, and Wizard cost 12 together. Their overlapping splash and control are valuable, but a tight three-unit group is vulnerable to the same spell. |
| Frostbite | 6 | **11** | Includes the initial larger Freeze and roughly 14 Ice Spirits over its nine-second field. Random spawning, delayed spirits, and splash vulnerability justify a discount from buying that control separately. |
| Harvest | 5 | **3** | This field deals no damage. It needs three ordinary troop deaths, or substantially more small troops, just to break even during its short active window. |
| Overcharged Tesla | 6 | **6** | Sparky damage warrants six elixir, but this stationary version has a finite lifetime, cannot hit air, stays exposed, and warns before firing. Those restrictions offset its defensive building role. |
| Three P.E.K.K.As | 15 | **17** | Three individual P.E.K.K.As cost 21. A four-elixir discount accounts for the large commitment and shared weaknesses without making three full bodies too cheap. |
| Meteor Shower | 4 | **6** | Eight one-third-strength Fireballs contain about 2.67 Fireballs of total potential damage. Random impact locations and the 4.5-second delay reduce how much damage a player can reliably concentrate. |
| CODE RED | 18 | **18** | Twenty-five Rockets have enormous potential against a crowded enemy half, but their random locations waste many impacts and cannot reliably finish a chosen target. The already-high price remains appropriate. |
| Royale Escort | 14 | **20** | Its base army costs 27 separately: two Knights, a Prince, Royal Giant, and two Cannon Carts. Twenty retains a group discount while accounting for its combined frontline, win condition, support, and one-cycle Evolution. |
| King’s Dropoff | 9 | **13** | Four Royal Deliveries plus a Cannon Cart cost 17 separately, with another delivery impact at the center. The fixed formation and three-second arrival delay earn a discount. |
| Elite Barbarians | 8 | **12** | Five Elite Barbarians are 15 elixir at the normal pair's price. Twelve pays for their increased pressure while retaining a formation discount. |
| Elixir Witch | 4 | **5** | Mother Witch gains repeated pairs of middle-stage golemites and kill conversions. Five prices that added board presence without ignoring that her golemites and blobs can feed elixir to opponents. |
| Unstable Egg | 5 | **3** | Only 55% of hatches produce dragons, with a 45% friendly-fire explosion branch. The delayed, fragile egg and uncertain payoff need a low entry cost; its rare triple-dragon and evolved outcomes remain the upside. |
| Fisherman | 3 | **4** | Immediate deployment hooks and half-duration later hook charges add reliable displacement to an already useful three-elixir body. |
| Bomb Squad | 4 | **6** | Two Bombers plus one Guard are about five elixir of native bodies. The extra elixir pays for both Bombers remaining untargetable while the Guard lives. They remain faintly visible like an Archer Queen using her cloak. |

Hero and Evolution deployments use their base card's new cost. Frostbite's separate Hero activation still costs three elixir. Card descriptions, generated runtime sources, resolved forms, affordability previews, and actual deployment spending all share the same card cost.

Validation is in `tests/ultimate-balance-v0581.test.cjs`: all 20 cards across levels, all three forms, real deployment just below and at the cost boundary, recorded spending, exact family mode recognition, and unchanged regular card/form data. Existing combat tests cover the formations and effects used in these estimates.
