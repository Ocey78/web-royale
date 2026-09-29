Web Royale v0.6.0 — Offline opener hotfix

CAUSE
The embedded C# MIME switch contained two identical case ".wav" labels.
This stops Add-Type compilation before the local server or browser can start.

FIX
Removed only the second case ".wav": return "audio/wav"; line.
One WAV handler remains. No gameplay or website runtime file was changed.
The loopback address, default port 8080, browser opener, and save origin are unchanged.

INSTALL — SMALL DOWNLOAD
Put Web-Royale-Opener-Fixed.bat beside the existing dist folder.
Double-click this fixed BAT instead of the old opener.
It may also replace the original file under the name offline build opener.bat.
Keep the server console open while playing.

INSTALL — FULL ZIP
Extract Web-Royale-v0.6.0-Opener-Fix.zip.
Double-click offline build opener.bat inside Web-Royale.

VERIFICATION
Before the fix: two regression assertions failed on the duplicate WAV case.
After the fix: all three opener regression tests passed.
Full npm test: 201 passed, zero failed, zero skipped.
All original website/runtime files are preserved byte-for-byte.
The added tests run as part of the existing npm test command.

LIMITATIONS
The Node tests inspect the embedded server source; they do not compile C#.
Windows BAT execution, PowerShell Add-Type compilation, browser launch,
and the existing Windows integration tests were not executed here.
No C# compiler or Windows PowerShell runtime is available in this environment.

REFERENCE
Microsoft Learn — Compiler Error CS0152
https://learn.microsoft.com/en-us/dotnet/csharp/misc/cs0152


Historical note: this document describes the v0.6.0 WAV hotfix only. Current opener behavior and AppData writes are documented in OFFLINE-OPENER.md.
