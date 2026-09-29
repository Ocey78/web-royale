# Web Royale v0.39.1 — visible reward boxes and card-frame correction

## Launch / update

This is a complete build, not a patch. Export your save from the old game first,
close the old tab and offline launcher, and extract the entire ZIP into a fresh
folder. Run `Web-Royale/open offline.bat`. The website is already built in `dist/`;
Node is needed only for development and rebuilding, not for the retained Windows
launcher. Keep using the same browser and origin to access the same browser save.
The save key remains `web-royale-classic-v4`.

This package has not been deployed to the live Site.

## Battle result boxes

The Reward panel now contains matching bordered boxes for the chest, gold, and
any gems earned. All three use the same box style and the existing local icons.

- The gold box shows the actual total credited, including normal battle gold and
  any streak bonus. It replaces the old hard-coded `+50` display.
- The gem box appears only when the match awards gems. No empty `+0` box appears.
- When no chest slot is available, currency boxes still appear normally.
- There is no additional visible streak sentence or separate claim popup. These
  rewards are credited once when the battle settles; OK only returns home.
- The existing faster OK timing is retained.

The row fits the verified desktop and narrow-phone layouts without overlapping
its reward boxes, the trophy amount, or the OK button.

## Streak rewards carried forward from v0.39

Ranked Trophy Road wins increase the ranked streak. Every third win (3, 6, 9,
12, 15, ...) grants **100–300 extra gold**, on top of the normal 50 win gold.
Every fifth win (5, 10, 15, ...) grants **1–10 gems**. Both bonuses are awarded on
win 15 and subsequent common multiples. Intervening wins do not receive a new
currency milestone reward. The existing per-match trophy bonus is unchanged.

The bonus rolls vary by completed battle, are stable for the same result receipt,
and do not reroll or repay when the results screen is redrawn. A ranked loss or
draw resets the streak. Non-ranked games retain their normal rewards but do not
advance or reset the ranked streak and cannot earn its currency bonuses.
Training, friendly, replay and other practice results do not pay these rewards.

Completed-match history stores `goldEarned`, `gemsEarned`, `streakGoldBonus`, and
`streakGemBonus`. The result display reads those saved receipts rather than
reconstructing rewards from the current streak. Receipt totals also respect the
existing balance caps. Loading an old save does not grant retrospective rewards.

## Card-border fix and Trophy Road

The previous padding-only adjustment did not address the portrait/frame mismatch
in the supplied screenshot. The portrait filled a tall card slot while the frame
was letterboxed to its native aspect ratio. Portrait pixels could therefore spill
past the frame even though the grid had enough padding.

Card portraits and frames on the deck/collection screens now share the actual
frame aspect (258:318 for normal frames, 259:352 for Legendary). Level labels are
anchored inside the same frame. Existing card frame artwork is unchanged. The
elixir badge and upgrade bar remain separate, and hand level labels stay removed.

The Trophy Road Reward Inventory/wild-card shortcut is removed. Trophy Road
reward tiles, claimed rewards, and the Magic Items collection remain intact.

## Scope retained

Arena art, troop simulation, pathfinding, shield presentation, spell behavior,
shop quantities/prices, graphics options, old replay engines, and Windows
launchers are unchanged from v0.38. The v0.39 milestone and shortcut changes are
included in this full build.

## Verification and limitations

**1,012 automated tests**, **109 Chromium UI checks**, and **8 portrait-mask checks**
passed. A clean rebuild reproduced all **1,203 runtime-file hashes**.

See `docs/verification-v0391/VERIFICATION.md` for the initial
outdated-version assertion, command output, screenshots, and rebuild evidence.
Browser verification uses the generated product JavaScript/CSS and native local
artwork through a file-backed Playwright fixture. This container blocks browser
HTTP navigation, so this is not a live-site/Service Worker upgrade test. No
physical iPhone/Safari or Windows-launcher execution was performed. This update
makes no new FPS claim.
