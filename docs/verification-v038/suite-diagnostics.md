# v0.38 validation diagnostics

Intentional pre-fix TDD runs failed for Daily quantities, Gem Shop APIs, shield state, safe deployment, Mirror placement, replay tagging and exhausted-path handling. The red logs are included separately. They are not final regression failures.

Full-suite runs succeeded at 990 tests, then 998 after replay preservation/Mirror coverage, and finally **999/999** after adding the exhausted-detour regression. The final release run completed in 184.63 seconds with no failed, cancelled or skipped tests. The first baseline attempt before implementation was stopped by a command time limit; it was not counted as a passing baseline.

A first comprehensive Chromium run passed 70 checks. A later concurrent repetition reached the four-card builder but timed out while loading the match. The environment's 4 GiB memory cgroup reported an OOM-kill increment, and the active browser renderer had disappeared; there was no JavaScript application error reported. The concurrent run and its timeout are recorded in `concurrent-browser-timeout.txt`. The final sequential browser run passed all 70 checks without a new OOM kill. It avoided overlapping the stress suite and artifact-rebuild work.

The browser uses actual generated UI/Canvas/native assets with a file-backed transport and saved-storage adapter, not a live HTTP origin. Results do not establish physical iPhone/Safari, live-site deployment or Windows launcher behavior.
