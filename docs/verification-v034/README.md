# v0.34 verification

The full Node run executed 916 tests: 909 passed and seven temporary-file tests were denied access to the environment's default AppData Temp directory. All seven were rerun using a writable workspace temp directory and passed. `final-focused-tests.txt` records 36 passing checks, including these retries and the new preload recovery, worker routing, renderer and mobile framing cases. There were no unresolved product-test failures in that run.

`preload-server-stop.json` verifies all 1,192 standard-build asset files using real WebKit fetches after the local server was stopped, then checks Sandbox preparation and a warm startup with zero asset downloads. The explicit server-stop test is necessary because Playwright's WebKit offline emulation also blocks otherwise valid service-worker responses.

`renderer-pixel-parity.json` records 480 byte-identical cached-versus-original health-bar renders. See `RENDERING.md` for pixel counts and the limitations of synthetic timing measurements.

Battle, navigation and replay simulation source hashes remain identical to v0.32:

- battle.js: 6d3db9aee8c0270d990ddb5ff1e36d5facd0f69218ff55d29991bf92b634cca3
- navigation.js: 040bb1ab7ad7e8f6886183dd3b1637091304592e8c8e8f31b495d68e3a51942c
- replay.js: ee3ea0095c263561028d161291f33369e8bcf3d8abc616a988ceba53b087c685
