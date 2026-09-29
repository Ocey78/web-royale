> v0.27 Windows verification: the embedded local host passed 17 isolated AppData checks
> (including persistence across restart) and 27 static-host checks on Windows. Tests use
> temporary AI data and do not touch the player's existing model. Tiebreak drain health
> changes do not count as combat damage; policy decisions stop during the drain. Training
> worker limits now accommodate the visible ending. Learning strength was not benchmarked
> by this release. Earlier environment limitations below describe historical runs.

# Learning system — v0.12.0 storage and concurrency

The tactical candidate generator supplies legal actions. The shared reward-trained action-value model scores those candidates and updates from the existing combat/elixir/outcome rewards. This is not a new deep neural network and this release does not claim a measured increase in win rate.

## Persistence

`src/appdata-store.js` wraps the prior IndexedDB/localStorage store. Hosted browsers use that fallback unchanged. An offline-opener page at loopback discovers `/__webroyale_ai__/capabilities`, obtains a session token, and performs compare-and-swap reads/writes of a fixed AI JSON state. The C# host stores under LocalApplicationData/WebRoyale/AI; no requested filenames or paths enter the API. Migration is one-time when disk state is absent. Export/import and reset operate on the active model/recent window. The separate on-disk match archive is retained across reset and rotates at 512 MiB / 10,000 records.

Finished live matches and explicit abandonment are recorded as before. If a write fails, the finished packet remains in the page's pending queue and Learning Center offers Retry AI Save. Closing the page loses such unsaved packets. State replacement/import is revision-checked rather than overwriting another tab silently.

## Scheduling

`training-scheduler.js` validates 1–5,000 total and concurrent simulations. It selects 1–8 workers, partitions unique match indices and allocates each worker its share of active games. Workers fill active slots in small admission slices and advance games round-robin. Rendering/texture loading is absent. Each worker yields after a nominal 10 ms slice or 512 steps (a single expensive step can exceed the nominal budget). New simulations can receive the updated merged model from the page; running simulations keep their starting policy state. Finished gradients are merged once using unique receipts; the receipt window is 20,000 matches.

The main page persists packets in batches of at most 32. It synchronizes final writes before displaying completion. Stop releases unfinished games and preserves finished packets. A worker/storage error cancels the pool and is displayed. These limits are not a promise that 5,000 real games will fit or train efficiently on a particular PC.

## Compact self-play recordings

Self-play keeps cumulative event counts and per-seat placement totals, at most 64 recent commands, 32 decision/reward samples and two compact snapshots. It still records the outcome and learned delta. Ordinary player matches retain detailed recording. Only the last 40 / 24 MiB records are part of the model's export; the opener also writes completed record JSON to a bounded raw archive. No data is uploaded to a shared public trainer.

## Verification boundary

Tests cover 5,000 active scheduler state machines, full-batch idempotency, host-protocol mocks, the real packaged engine in worker-thread harnesses, and controlled browser input/rendering. Windows PowerShell compilation, actual Windows disk migration/API serving, ordinary hosted navigation and a full 5,000-game resource benchmark are not verified here. Run `tests/appdata-host.tests.ps1` on Windows for isolated host integration tests.
