# Offline opener — v0.12.0

Run `offline build opener.bat` beside `dist/`. It starts a loopback-only HTTP host on port 8080, opens the default browser, and remains alive until its console is closed. Do not double-click `dist/index.html` and do not reuse the v0.11 or earlier BAT for AppData storage. A different optional port changes the browser origin/profile save, but still uses the same user's AI AppData directory.

The only runtime dependency is Windows PowerShell 5.1 / .NET Framework with System.Web.Extensions. Nothing is downloaded or installed. Embedded C# is compiled by Add-Type; the matching editable source is `tools/offline-host.cs`. The old duplicate WAV switch label remains fixed.

Website files are read-only. The only write interface is the same-origin `/__webroyale_ai__/state` API, with a random session token, strict Host/Origin validation, bounded JSON, compare-and-swap revision, a named mutex, atomic state replacement and a backup. It writes only under `%LOCALAPPDATA%\WebRoyale\AI`; requests cannot select paths. No files are exposed to the LAN/Internet. Raw JSON match archives are hashed by ID and capped at 10,000 records / 512 MiB.

AI storage status/path is shown in Settings and Learning Center. When the disk state does not exist, existing browser AI memory is migrated without deleting it. An existing disk state is loaded instead of overwritten. Player profile/trophies/currency remain browser-local. If storage fails, the UI reports it and keeps failed finished packets pending for Retry AI Save while the page remains open.

## Windows verification

Not executed in the Linux build environment. To compile and exercise the actual C# host in a temporary directory on Windows:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tests\appdata-host.tests.ps1
```

The test uses an explicit temporary AI root. It verifies token/Origin rejection, data round-trips, conflicts, invalid models, backups, archives, static write rejection and restart persistence without overwriting your real AI folder. The older `tests/offline-opener.tests.ps1` covers static GET/HEAD and path guards.
