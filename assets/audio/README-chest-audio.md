# Original chest and card-reveal audio

Seven cues were decoded from the supplied Clash Royale 3.5.0 APK. The original
source paths and source/output SHA-256 hashes are in `chest-audio-provenance.json`
and `manifest.json`. The original spelling `get_card_comon_01.ogg` is intentional.

Reproduce with:

```text
node tools/import-chest-audio.cjs path/to/supplied.apk path/to/python
```

The build-time importer needs Python's standard library, Playwright, and installed
Chrome. Set `NODE_PATH` if Playwright is supplied by a bundled dependency runtime;
set `CHROMIUM` to use a specific installed browser executable. It performs no
network requests and does not execute or install the APK.

Chromium's `OfflineAudioContext` decodes the original Ogg Vorbis audio and renders
mono at 44,100 Hz. The importer writes PCM16 WAV without gain normalization, then
independently decodes each emitted WAV and checks channels, sample rate, frame
count, non-silence, and quantization error. Existing manifest mappings are kept.

The resulting sounds use the game's existing optional sound bank. The runtime
needs no extra codec, browser automation library, source archive, or download.
Original audio remains associated with its respective rights holders; this
conversion does not claim publisher endorsement or a new license.
