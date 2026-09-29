# v0.26.0 archive recovery

The previous attachment was incomplete: 71,821,678 bytes instead of the
286,387,854 bytes listed in its original receipt. Its ZIP central directory was
absent; a final compressed file was truncated. This is a defect in the supplied
archive, not evidence of a problem with the user's extractor.

## What was recovered

The complete v0.26.0 game bundle, `app.4edeb8d0c883.js`, passed its original local
ZIP-header CRC. All 44 JavaScript modules were recovered from it without editing
or substituting their code. Its SHA-256 remains:

`4edeb8d0c883ef1548f8d64e089546ae6f2506bf09d873e98c2348f80ebbd246`

This preserves the Hour Shop, fixed queue levels, placement/bridge changes,
procedural world, friends/clans, trading, wars, replays and original emote player.

Intact source data and emote scenes were recovered from the unfinished ZIP.
Missing unchanged artwork, the launchers and build scaffolding were restored
from the CRC-verified v0.25.0 full archive. The accepted arena camera, terrain,
drawing module, arena stylesheet and original scene/presentation data are
unchanged from that version, as they were in v0.26.0.

The trailing v0.26.0 HTML/CSS/tool/test files were not recoverable from the damaged
attachment. The compatible previous HTML shell and build tools were updated to
load the recovered module order. Shop/social/war/replay layout styles were
restored using the recovered DOM templates and the available v0.26 screenshots.
Thus this is a reconstructed full package, not a byte-identical reproduction of
the unavailable original complete ZIP. The game-code bundle itself is identical.

Ten magic-item and boat PNGs were regenerated from the original atlas components
recorded in the intact provenance files. Source atlas SHA-256 hashes were checked.
They use original RGBA artwork; no placeholder art was substituted. Their PNG
encoding/crop padding can differ from the earlier exports. The recovery receipt
is in `docs/recovery/image-recovery.json`.

The original v0.26.0 test files were beyond the cutoff. The available v0.25.0
regressions were retained, with obsolete version/shop/difficulty/preview/currency
expectations updated to the already implemented v0.26.0 rules. Additional archive
recovery and packaged-browser tests were added. The prior report is retained as
historical evidence, not as this replacement package's verification result.

## Run

Extract the complete new ZIP into a fresh folder. Run:

`Web-Royale\open offline.bat`

Keep the launcher window open. Do not run from inside the ZIP, and do not combine
files from a partial old extraction. No previous build needs to be installed.
Do not clear browser storage or AppData to repair an archive; those hold saves.

## Packaging

This archive uses standard Deflate compression, no encryption, no split-volume
format, no ZIP64 requirement, no symlinks, and short Windows-compatible paths.
Source image/audio bytes are stored once in `dist/assets`; the existing
`restore-source.cjs` restores them before source builds or tests. Large historical
QA screenshots and redundant source-media copies are omitted, not game content.
No font binaries, input APKs or original input ZIPs are included.

The archive is written to a temporary filename, closed, CRC-tested and extracted
before being published. A new checksum accompanies this replacement; the old
checksum is not valid for this recovered package. Runtime hashes are in
`dist/release.json`.

No Windows environment was available to execute the BAT or Explorer extractor.
