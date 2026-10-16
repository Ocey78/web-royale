# Ultimate Clash ten-card expansion

> **For agentic workers:** Implement the assigned component with failing/passing regressions, review the integrated diff, and verify the built and deployed game.

**Goal:** Add ten selected cards to every Ultimate Clash deck builder and battle, preserving current modes, costs, health displays and Bomb Squad cloak behavior.

**Architecture:** Extend the existing isolated Ultimate catalog and combat adapter. Reuse native formations, actors, projectiles and effect pipelines; keep new state deterministic and visible to replay validation. Build and publish through the existing immutable Pages workflow.

**Tech Stack:** JavaScript UMD modules, native sprite/scene assets, Canvas/WebGL rendering, Node tests and Playwright.

**Spec:** The user's selected ideas from this conversation, with the implementation decisions below.

## Global constraints

- Actual repository: E:/Projects/WebRoyale. Never modify the ChatGPT mirror's sources/ or historical engine snapshots.
- Release 0.58.2; push and update GitHub Pages under the user's continuing authorization.
- All three Ultimate modes share 30 exclusive cards; ordinary card pools remain unchanged.
- Preserve current prices for the previous 20 cards, team timers, twenty-elixir cap, Hero/Evolution forms and normal tower health bars.
- New cards have unique portraits, descriptions, proper costs and native card frames. New Hero/Evolution variants were not requested.
- Every random outcome uses the battle generator; spell ownership remains correct for every team seat.

## Cards

| ID suffix | Name | Cost | Required behavior |
|---|---|---:|---|
| mortar-battery | Mortar Battery | 12 | Three Mortars in a triangle; stagger their first shots; retain minimum range. |
| royale-recall | Royale Recall | 4 | Recall up to three friendly troops nearest the target point to safe positions on your own side. Preserve HP/status and briefly pause them; exclude buildings/attached actors. |
| goblin-magnet | Goblin Magnet | 5 | Destructible, finite-lifetime building; periodic short pulls on nearby enemy ground troops; no damage or Crown Tower displacement. |
| spirit-festival | Spirit Festival | 7 | Pairs of Fire, Ice, Electro and Heal Spirits in that order, twice, over eight seconds. |
| dark-pact | Dark Pact | 4 | Temporary field buffs friendly troop damage while draining a small fraction of their HP, never killing them itself. No building buff or stacking. |
| battle-kitchen | Battle Kitchen | 8 | Building throws healing food to damaged friendly troops; on death spawns a Chef who fights with a frying pan. |
| royale-reinforcements | Royale Reinforcements | 12 | Six Royal Recruits arrive as three pairs at 0/3/6 seconds, on the caster's side. |
| elixir-spell | Elixir Spell | 2 | Interpret the user's name as the previously proposed Elixir Spill: a purple field slowing ground movement for both teams, without damage or elixir generation. |
| dragon-king | Dragon King | 18 | Large slow flying dragon; long-windup cone breath attacks, strong versus grouped troops and vulnerable to attack resets. |
| bowler-giant | Bowler Giant | 11 | Bowler and boulders visually 40% larger. Carries/throws two balls, one in each hand; only targets buildings, but both rolling projectiles hit intervening enemy ground troops. |

## Review focus

- Recall positions are legal on classic and extended 3v3 maps, and it neither heals units nor clears harmful statuses.
- Pull/slow/health-drain effects respect teams, buildings, flight, time bounds and stacking.
- Damage buffs affect real projectile/melee damage and restore cleanly after leaving the field.
- Delayed pairs and death-spawn Chefs retain the original owner and level.
- Dual boulders and cone damage behave correctly with intervening units, hidden units, friendly units and attack resets.
- Runtime assets, training builds, saved decks and replays include all new content without leaking it into normal play.

## Tasks

- [x] Catalog and art: add ten definitions/native aliases, unique portraits and descriptions, catalog and price tests; coordinate source names with combat/rendering.
- [x] Combat: implement all ten mechanics and AI placement, scoped engine hooks and deterministic state; verify ownership, ranges, damage and timers.
- [x] Presentation: show all new spells/buildings/actors; implement giant Bowler dual-hand boulders, large Dragon and Chef; keep effects bounded and use native art.
- [x] Integration/review: update fixed catalog-size copy/tests and replay compatibility, build, run regressions and browser checks for all ten cards and all modes.
- [x] Release: commit/push, publish exact verified commit, compare live assets, verify public browser behavior and save evidence.

## Progress and rulings

- Ruling: “elixir spell” means the previously proposed Elixir Spill, displayed as Elixir Spell; announced to the user before implementation.
- Ruling: “make them 40% bigger” applies to Bowler Giant and both boulders. Original ordinary Bowler remains unchanged.
- Ruling: Use the nine proposed prices and 11 elixir for the new giant. This is an initial design balance, not a claim of equal win rates.
