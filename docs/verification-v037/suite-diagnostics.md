# Diagnostic runs before final verification

The first complete v0.37.0 test run reported 961/963 passing. The two failures were:

1. `package version is v0.36.0`: the inherited release test still hardcoded the prior release. It now checks v0.37.0 and agreement with the generated release manifest.
2. `v110: packaged self-play worker completes 1v1 with actual learned gradients`: the 90-second guard expired while the full suite and artifact generation competed for CPU. The unchanged worker tests passed 4/4 in isolation; that same 1v1 fixture completed in 65.29 seconds, with actual nonzero gradients.

`npm test` now caps test-file concurrency at two to reduce competing heavy simulations. This only changes the test runner, not training behavior, match timing or timeouts. The final complete rerun is in `full-suite.txt`. The initial complete run is retained as `suite-initial-diagnostic.txt`.

`tests-red.txt` and `winner-binding-red.txt` intentionally record the pre-implementation failing regression tests. They are not final failures.
