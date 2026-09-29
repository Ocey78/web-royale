# Web Royale v0.21.0 — Deck Pool, Chest Labels, Emote Bubbles and Battle Header

## Scope of this release

This is a full offline package based on v0.20.0, with the playable distribution, editable source, data, regression tests, and both offline launchers. It is not a patch.

**The complete official cosmetic catalogue is not included.** This release retains the nine source-backed static emote images and seven custom tower styles available in the prior build. White speech bubbles and their presentation motion are implemented, but the original characters' expression/frame animations and missing official emote/skin assets have not been imported. This distinction applies to all screenshots and tests described below.

## Implemented changes

### Decks and Collection

Decks now includes the card list beneath the selected eight-card deck. This list excludes the IDs already in that selected deck, including when practice duplicates are enabled. An ordinary eight-unique-card deck leaves 94 of the 102 catalogue cards in the list. Both owned and locked cards remain visible, with the existing arena eligibility and Not Found labels.

Collection → Cards continues to show all 102 cards, including the selected deck cards. Existing in-deck markers remain. Replacing a deck card or switching decks refreshes the exclusions without changing collection ownership. The Decks list has its own search, rarity filter, sort, and remembered scroll position; Collection subpage navigation does not overwrite it.

### Chest text

Unready slot chests display **Locked**. The secondary label shows the number of wins still required, with singular/plural grammar: **1 Win**, **2 Wins**, and so forth. Ready slot chests display **Open now! / Ready!**. The detail panel also reports remaining wins instead of an earned/required fraction.

The underlying win requirements, earning rules, manual opening, reward pools, and existing Free/Crown reward rules are unchanged. Remaining-win labels use the authoritative chest-kind requirements and bound malformed progress values.

### Emote bubbles and picker

The same white speech bubble with a tail is used in Collection, equipped slots, Shop, the preview dialog, clan messages/picker, and battle messages. Playing a preview or battle message triggers a pop-in and icon-settling motion; battle messages fade out and are removed after three seconds. Navigation cancels pending message timers. Reduced-motion settings suppress the added animation.

These effects animate the bubble and its existing static icon. They are not the original emote character-frame animations.

The battle picker now has a white-chevron expansion control when owned emotes exist outside the equipped slots. It opens the rest of the **bundled owned** emotes and allows them to be sent; collapsing returns to the equipped set. This exposes existing ownership, not new catalogue entries.

### Front-facing tower previews

Shop and Collection preview canvases use the front-facing source tower/King pose rather than the back-facing blue-player pose. The seven existing custom styles retain distinct rendered previews, names, ownership, and saved selection. This only changes preview orientation; team-facing battle tower orientation and tower stats remain unchanged.

The custom styles are still Classic Tower, Lava Fortress, Royal Blue, Bone Crypt, Jungle Ruins, Electro Station, and Frozen Keep. They are not a complete set of official tower-skin models.

### Battle header

Opponent name and clan now render into their own fixed-size source-glyph canvases. Text fits the allotted identity region rather than being split into shrink-to-fit word canvases that clip. The full name remains available in accessible text and the title attribute.

The badge, name, clan, fullscreen button, pause button, and timer have separate layout regions. Controls are larger than the previous tiny buttons. The timer/multiplier canvas retains the safe dimensions and above-arena layering from v0.20.0. No arena camera, pathing, spell, or damage logic was changed in this release.

## Verification

Fresh runs against the final source and built distribution:

- `npm run build`: passed, **0.21.0**, source snapshot **3.2557.2**, **779 runtime files**.
- `npm test`: **488/488 passed**, **0 failed**, **0 skipped**, including the existing stress runner.
- Combined packaged Chromium suites (`BrowserV210`, `BrowserV200`, `BrowserV180`): **26/26 passed**.
- New browser checks cover Decks/Collection membership, actual deck replacement, independent filters/scroll state, all requested remaining-win labels, front-facing preview calls, white bubbles, message timing, extra-owned-emote access, reduced motion, and header layout.
- Retained browser checks cover all 15 bundled arenas in normal/overtime states, timer multipliers, the five previously requested spells from both sides, cosmetics, collection, and match-end flow.
- Browser fixture: actual packaged bytes served through a controlled same-origin Playwright fixture, not substitute game logic. No page errors or missing requested runtime resources were recorded.
- Every runtime file was checked against its SHA-256 manifest. Original WAVs contain non-silent sample data. No font binaries are distributed.
- The packaging check extracts the final ZIP, restores omitted duplicate source images/audio, performs a clean rebuild, and requires the rebuilt release manifest and every runtime file to match the tested distribution byte for byte.

The original new assertions were observed failing before their corresponding fixes. The first full Node run also identified an old test still expecting release 0.20.0; that version assertion was updated and both subsequent full Node runs passed.

Logs, diffs, and screenshots are under `docs/qa/v021/`. Final combined logs are `final-node.txt` and `final-browser.txt`. The adjacent downloadable package-verification JSON records archive integrity, rebuild, file counts, and SHA-256.

## Asset availability and limits

The project archive contains only the selected cosmetic icons and source scene exports already used by v0.20.0. The original APK and graphics ZIP are visible as archived file records, but their raw bytes could not be materialized in this run. No missing official model or original animation was fabricated, replaced with an unrelated asset, or reported as imported. Public asset lookup did not result in additional packaged cosmetic files.

Two temporary Library working-copy records were created while testing archived asset retrieval. Retrieval still failed, and cleanup was rejected by the Project mutation boundary. They are named `Clash-Royale-3.5.0-cosmetics-working.apk` and `CR-3.5.0-cosmetics-working.zip`; the original records were not altered. Those copies are not part of this ZIP.

Windows execution of `open offline.bat` and physical Windows AppData writes were not performed in this Linux environment. The full existing launchers are included; packaged-game browser tests ran in Chromium. Native Supercell engine parity, all-device UI parity, the full official cosmetic catalogue, and original emote character animation are not claimed.

## Run

Extract the entire ZIP, close any older Web Royale launcher, and open:

`Web-Royale\open offline.bat`

Keep the launcher window open while playing. The same browser-save key and default localhost origin are retained. Export a save from Settings before changing browser or clearing browser data. Node is needed only to edit/rebuild source, not to start the included Windows offline launcher.
