# Web Royale v0.27.0

Built on 27 September 2026 from the supplied, checksum-verified v0.26 recovery archive.
This is a full source and offline browser build. Extract the entire ZIP and run
`Web-Royale/open offline.bat`; keep the launcher window open while playing.

## Changes

- Decisive overtime ties now show a Tiebreaker announcement, a one-second hold,
  three seconds of equal tower-health drain, and the existing destruction/crown/result
  sequence. Cards, combat, AI decisions, elixir and delayed troop appearance stop during
  the phase. The announcement survives a pause. The timer remains at 0:00.
- New replay recordings use engine 0.27. Existing 0.26 recordings retain their original
  immediate tiebreak resolution. Replay playback remains read-only.
- Clan search scrolls to its final rows and pagination. The social hub resource strip
  is visible. Chat icons, captions, the composer and long clan names fit. War defense
  controls retain readable labels at desktop and phone sizes.
- Recent result IDs persist across saves, preventing repeat rewards when an old result
  is presented after another match. The receipt list retains 512 IDs and migrates IDs
  still available in the legacy Battle Log and last-result fields.
- The Windows offline host now drains rejected static request bodies within a five-second
  budget so it returns the HTTP rejection reliably rather than resetting the connection.

## Preserved

The accepted camera, renderer, arena stylesheet, native scene data and presentation data
match all five original protected hashes. The 102-card 3.2557.2 snapshot, original local
artwork, 206 imported emotes, 15 arenas, Hour Shop, win-based battle chests, fixed Level 9
alternate queues, local AI world and save identifiers remain in place.

No new modern cards, currency packs, Pass interface, recolored tower skins or remote
services were introduced. Existing saves are normalized without clearing browser or
AppData storage. Use the same browser and usual launcher origin to retain browser saves.

## Verification details

Final full suite: **565 tests passed, 0 failed, 0 skipped** on Node 24.20.0 / Windows.

The supplied baseline passed all 522 recovered Node tests before changes. This release
adds 43 behavior regressions covering tiebreaks, presentation and the custom economy rules.
The former five-minute match cutoff test now verifies all six modes complete within their
timeline plus the explicit four-second ending allowance.

Built Chrome checks cover the real tiebreak/result flow, disabled deployment, all 30
arena/phase combinations, original catalog counts, the Hour Shop, viewport geometry,
real localhost save reload and missing assets/script errors. Built Edge checks cover
clan scrolling, chat sending and control containment at 1200x960 and 390x844.

Windows PowerShell 5.1 compiled and exercised the actual embedded host: 27 static-host
checks and 17 isolated AppData checks passed, including stored-model reload after restart.
These tests use temporary AI data, not the player's existing model. They do not constitute
a manual Explorer/double-click test of the full BAT/browser-opening flow.

The original Python browser suites were not rerun in this environment. The new Node
Playwright suites test the built application on normal localhost origins. No new claim
about learner strength is made. Independent agent review found no actionable regression.
Machine-readable results and full test logs are in `docs/verification-v027/`.

For source work, use Node 22 or newer: `npm test`, `npm run build`, `npm run serve`.
Browser QA additionally requires Playwright and a Chromium browser; the current suites
are `tests/browser_v270.cjs` and `tests/browser_menu_recovery.cjs`. Set `WEB_ROYALE_URL`
to the fresh server origin, `CHROMIUM` to a browser executable for the former and
`BROWSER_CHANNEL` for the latter. Restart the development host after rebuilding.

## Fidelity boundaries

This update improves the existing recreation; it does not establish full 1:1 parity.
The four-second tiebreak cadence is locally chosen. Minima within 0.5 HP still produce
the prior immediate draw. The weakest surviving tower rule follows the historical
[Supercell update notes](https://supercell.com/en/games/clashroyale/blog/release-notes/the-party-button-update-2/),
but universal native animation/tick equivalence remains unverified.

Official tower skins beyond Classic remain missing. Native pathing/collision edge cases,
complete mode coverage, fully independent AI economies and open-ended clan conversations
remain incomplete or approximated. Legacy result IDs already missing from old saved
history cannot be reconstructed, and duplicate protection is bounded to recent receipts.

The delivered ZIP is accompanied by an integrity receipt with its exact size and SHA-256,
full CRC verification, 1,181 runtime hash checks and independent source rebuild result.
