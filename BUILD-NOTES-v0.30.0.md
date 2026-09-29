# Web Royale v0.30.0 — Target selection

This release changes combat targeting according to the rules supplied in the request. The level 0–99 sandbox, UI fixes, chest openings, original event tower styles, and custom progression rules from v0.29 remain available.

## Targeting behavior

- Troops acquire the nearest eligible enemy inside their own source sight range. Distance is measured between collision edges, consistently for nearby targets and tower destinations. The previous arbitrary preference for a slightly farther chase target is removed.
- Ground-only attacks stay ground-only. Anti-air capability remains card-specific. Giant, Hog Rider, Golem and other building attackers ignore troops; nearby defensive buildings can pull them away from tower navigation. Troop-only, Crown-only and King-only restrictions are enforced where specified by the card.
- An existing target in legal attack range stays engaged when a closer distraction appears. Death, disappearance, invalid category, or leaving the allowed range causes reacquisition. A committed attack retains the source's 1.5-tile maximum-distance grace; it cancels if the target goes beyond that allowance. The source minimum range still applies during windup.
- Mortar rejects targets inside its blind spot, including targets that enter it before the projectile launches. Cancelling a pending attack also clears its unfinished attack pose.
- If there is no eligible enemy in sight, a mobile troop advances toward the nearest eligible living Crown Tower. King Towers participate even while Princess Towers survive. Buildings and troop-only attached attackers do not receive an invalid tower destination.
- Card-specific preference rules, such as Ram Rider's preference for an unsnared troop, remain separate from ordinary proximity selection.
- Electro Wizard keeps one bolt on his locked primary target and selects the nearest eligible secondary by collision-edge distance. With only one eligible target, both bolts still hit it. Two closer arrivals no longer steal both bolts from the committed primary.

The Baby Dragon reproduction from v0.29 now chooses the nearer King Tower boundary after the lane Princess Tower falls, instead of crossing toward the slightly nearer *center* of the opposite Princess Tower. Turning on **Show targets** in Sandbox displays the chosen target. With no enemy targets, Baby Dragon remains idle.

## Reference clarification

The linked [Supercell talk](https://www.youtube.com/watch?v=r7l4lAtEs6E) is about personalized shop-card offers. The [speaker's primary talk notes](https://nanrecip.es/2018/card-targeting-in-clash-royale/) explain offer selection using machine learning. It does not document troop combat targeting. This release therefore follows the explicit combat rules supplied in the request and retains the bundled card ranges and capabilities; it does not claim the talk proves native-engine parity.

Using collision-edge distance consistently for tower fallback is an explicit interpretation of “nearest” in that requested behavior. Undocumented global tuning fields have not been assigned guessed meanings, and this is not a complete reverse engineering of Supercell's engine.

## Saved games and replays

New recordings use replay engine **0.30**. Recordings from v0.28/v0.29 retain a frozen **0.28** simulation; older 0.26/0.27 recordings retain their existing historical engine. Targeting updates must not change how previously recorded battles play back.

The profile format, collection levels, Level 9 alternate matches, win-unlocked chests, twelve-card Hour Shop, local AI systems, sandbox levels and accepted camera are retained.

## Run the build

Extract the complete ZIP and open `Web-Royale/open offline.bat`. Editable source and the complete static build are included. Use Settings → Export Save before changing browser or localhost origin.

## Verification

- The final full automated suite passed **817/817** tests with no failures or skips, including 46 focused targeting cases and two Mortar placement-preview regressions.
- Built-browser targeting checks passed for Baby Dragon tower navigation, distraction, attack lock, lost-range retargeting, Giant's building-only selection, and Electro Wizard's locked primary bolt.
- Browser Sandbox checks passed for all 102 card choices, both teams, levels 0/13/99, individual tower controls, unlimited time, and no progression/save/replay side effects.
- Nine built-browser replay checks passed, including six stored v0.28/v0.29 match fixtures. Historical and current engines produced exact recorded outcomes after seeking backward and forward.
- Normal pointer deployment, Cannon Cart targeting and legal Golem death-spawn positions passed in the built browser. No application errors or missing replay/gameplay assets were found.

Evidence is included under `docs/verification-v030/`. Archive CRC, clean extraction, source rebuild and runtime-hash verification are recorded in the separate release integrity file alongside the downloadable ZIP.
