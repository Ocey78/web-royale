# v0.9.0 source-presentation additions

Source files are the user's provided APK/graphics archive and two provided classic UI
screenshots. Original HUD symbols, lettering images, high-resolution textures, arena
scenery and loading art are extracted from those sources. No font program or APK is
included. `assets/presentation/data.json` records source hashes; native source and
quality-upgrade records are included in the project metadata.

SC format references (reference descriptions, not approval or endorsement):
- https://github.com/jeanbmar/sc-tools
- https://github.com/jeanbmar/sc-tools/blob/master/lib/supercell-sc/tags/text-field-original.mjs
- https://github.com/jeanbmar/sc-tools/blob/master/lib/supercell-sc/tags/scaling-grid.mjs
Historical roadmap reference:
- https://supercell.com/en/games/clashroyale/blog/release-notes/summer-update-is-here-2/
- https://royaleapi.com/blog/slash-royale?lang=en

## Earlier asset provenance (retained)
# Source provenance and technical references — v0.6.0

## Supplied originals

The runtime images, animation data, arena records, card records and UI symbols were converted from the files uploaded in this conversation:

| Input | Bytes | SHA-256 |
|---|---:|---|
| `Clash Royale-3.5.0.apk` | 139202652 | `0fcb851246cd8de9283355513f5310900dd2fac1be0f85d4e2e05f34949cba81` |
| `CR-3.5.0-Graphics.zip` | 159308987 | `870e6f50be30526bccdc444ffde5c2756691cd3bc526de48b75f2a4a759d2b81` |

The internal fingerprint is version `3.2557.2`, SHA `fe5506de8a98cdc0964a3ad0bf7f02653bf300db`. The public-looking filename 3.5.0 is retained as an input name, not substituted for that fingerprint. Per-scene source paths/checksums are embedded in the native scene data. Table digests are in `assets/game/data.json`; earlier selected-file checks are retained in `assets/native/provenance.json` with their scope explicitly identified as the v0.3.0 input audit.

The distribution contains 102 extracted portraits, 97 lossless source texture pages and 93 scene graphs, plus 94 rasterized native UI exports. It also contains 35 raster images of fixed menu words. These word images are not font files; arbitrary live text uses system fonts. `assets/ui/manifest.json` identifies each symbol, source clip and frame, or fixed word. No fonts or full input archives are packaged.

The old RoyaleAPI first-run downloader is not used in this release: its card manifest has been replaced with local same-origin image assets for all 102 cards. Generic recovery code remains in the tested image-store module, but this release supplies no remote recovery URLs. Browser QA resolved all runtime requests to the local distribution through its request fixture; no external image host was used.

## Conversion and references

The included converter and renderer read the source's compression, textures, shape geometry, UVs, banked affine/color transforms, exports, movie clips and FPS. Converted texture pages use lossless WebP. Runtime projection, state selection, input, gameplay and UI interactions are newly written for this browser application.

Primary technical references consulted, rather than copied game binaries:

- **jeanbmar / SC Tools**: https://github.com/jeanbmar/sc-tools — SC tag, movie-clip, matrix-bank and texture structure references. In particular `lib/supercell-sc/tags/movie-clip-original.mjs` and `tag-41.mjs` informed format interpretation.
- **ToxicLand / SCEditor**: https://github.com/ToxicLand/SCEditor — supplementary SC texture/shape/movie-clip terminology from the earlier renderer implementation.
- **hastylmao / Hasty-CR**: https://github.com/hastylmao/Hasty-CR/blob/main/docs/SIM_MECHANICS.md and `docs/SIM_HANDOFF.md` — independent simulator-author reference used to check source movement units and the distinction between data coverage and behavioral equivalence. Its source-unit warning led to a regression check and correction from the previous 0.75× movement conversion. No engine code from that project is included, and its present-day card values are not used as this snapshot's balance data.

No Reddit discussion was used to set gameplay numbers or establish parity.

## Attribution

Clash Royale names and original game artwork are associated with Supercell and their respective rights holders. This is an unofficial project, not endorsed by Supercell. Attribution identifies the origin of assets; it is not represented as a transfer of rights or publisher authorization. The runtime is not an original Supercell executable or connection to Supercell services.


## v0.6.0 presentation and sound additions

Three repaired button PNGs use the source export cap pixels with reconstructed center strips (assets/ui/manifest.json). Thirty-five fixed-word images replace the earlier eighteen. No arbitrary text font file is included.

Eight source cues (button/card selection/deploy/start/reward/victory/defeat/draw) are converted from the uploaded APK's OGG files to 44.1 kHz mono PCM WAV with FFmpeg. Each source path and input/output checksum is in assets/audio/manifest.json. tools/extract-ui-audio.py reproduces the conversion from the original upload. Runtime WAVs are same-origin assets, with no online fallback.

Reference screenshots: https://interfaceingame.com/games/clash-royale/
Tactical principles cross-check: pavelfi, https://www.deckshop.pro/guide/beginner-tips
These references informed interface structure and bot heuristics; they did not supply newer balance values. The attempted remote MP4 playback was unavailable. The supplied native-game recording, not an unviewed remote video, supplied motion evidence.


## v0.7.0 reference menus

New native symbols, gem-pack art and emote icons were decoded from the user's same APK/graphics uploads. Fixed text images were rasterized from the supplied typeface, with no font file distributed. Source IDs, file paths, dimensions and text provenance are in assets/ui/manifest.json. Reference screenshot bytes are not included as runtime page images. Reference metadata/hashes are in docs/qa/v070/reference-inputs.json. Original images remain associated with their respective rights holders; use is not an endorsement or license claim.

## v0.26 item and boat presentation sources

Seven original magic-item sprites were cropped from `assets/native/fx-ui_spells-1.webp`,
using alpha-connected source pixels. Three original boat components were cropped from
`assets/native/fx-building_clanwars_towers-0.webp`. Provenance is recorded in
`assets/ui/v260-atlas-provenance.json` and `assets/ui/v260-boat-provenance.json`.
The renderer assembles the latter in a browser approximation; it is not a recovered
complete boat scene. Clan action icons reference existing original UI manifest keys.

Historical primary rule references:
- https://supercell.com/en/games/clashroyale/blog/fun/clan-wars-what-has-changed/ (5 July 2021)
- https://supercell.com/en/games/clashroyale/blog/release-notes/clan-wars-2-is-here/ (31 August 2020; the July 2021 changes supersede its repair/weekly reward rules)

No external requests are needed by the packaged world. These references are provenance,
not a claim of endorsement, native-engine equivalence or ownership of original game art.
