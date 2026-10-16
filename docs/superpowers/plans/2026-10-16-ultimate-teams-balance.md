# Ultimate team modes and balance implementation plan

> **For agentic workers:** Use the existing subagent-driven development workflow, run each component's regressions, then verify the integrated build before release.

**Goal:** Ship balanced Ultimate card prices, longer 2v2 and 3v3 Ultimate matches, normal Princess Tower bars and translucent protected Bombers to GitHub Pages.

**Architecture:** Extend the existing Ultimate family through one mode predicate. Reuse established team seats, arenas, victory rules, independent deck storage and the exclusive card pool. Keep simulation changes and presentation fixes separate.

**Tech Stack:** JavaScript UMD modules, Node test runner, Playwright and the existing static build and Pages workflow.

**Spec:** The user's requests in this conversation; the original card mechanics remain in the preceding Ultimate Clash plan. Prices are now subject to the requested balance pass.

## Global constraints

- Preserve read-only project sources and historical simulation snapshots.
- Publish this combined update as 0.58.1 and verify the deployed site.
- Mode IDs: UltimateClash, UltimateClash2v2, UltimateClash3v3. Each seat has a 20-elixir cap.
- 1v1 remains 240 seconds plus 180 overtime, with the original elixir schedule.
- 2v2: 300 seconds plus 240 overtime. Multipliers 1/2/2.5/3/4 at elapsed seconds 0/150/225/300/450; tiebreaker at 540.
- 3v3: 360 seconds plus 300 overtime. Multipliers 1/2/2.5/3/4 at elapsed seconds 0/180/270/360/540; tiebreaker at 660.
- All three share the 20 exclusive cards and forms, with separately saved decks. Normal collections stay unchanged.
- Crown Tower health stays 8x/10x; evolved Princess defenders use normal tower health frames. Guard-protected Bombers remain untargetable and use Archer Queen cloak opacity.

## Review focus

- Switching and reloading modes preserves the correct independent deck and forms.
- All four/six seats use the Ultimate pool, abilities, cap and team ownership.
- Team victory, overtime and tiebreaker happen at the intended boundaries.
- Replays preserve team size, slot ownership and custom events, and reject incompatible content explicitly.
- The live site visibly lists and launches all three modes with current prices and presentation fixes.

## Tasks

- [x] Balance: review actual card value, update catalog costs and source/form costs, document every price, verify normal cards remain unchanged.
- [x] Team engine: extend battle/rules/arena and Ultimate hooks; add failing then passing tests for seats, timing, all-seat casting, towers and outcomes.
- [x] UI and persistence: expose both modes in Events and Learning Center, independent deck builders, correct pool and saved history; test normalization and training.
- [x] Replay/assets: extend custom replay guards and digest to team modes; prepare Builder assets for the whole family; verify record/playback and prior normal replay compatibility.
- [x] Integration: review changes, run appropriate suite, rebuild and inspect actual browser screenshots of all modes, tower bars and Bombers.
- [ ] Release: commit and push, dispatch Pages for the exact release commit, verify live hashes and browser behavior, save deployment evidence.
