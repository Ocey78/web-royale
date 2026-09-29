# Future accounts and authoritative matches

## What is connected today

`src/platform.js` is used by the running application, not a disconnected example.
`ProfileRepository` loads/saves normalized guest profiles, preserves the old save
key, and reports persistent-versus-memory-only storage. `LocalMatchSession` receives
sequenced deploy commands from real mouse/touch/keyboard input; it rejects malformed
or out-of-order commands and duplicate sequence conflicts. Repeating an accepted
command with the same sequence returns its previous result rather than deploying
again. It advances the local engine at a fixed 1/60 second and offers a copied
snapshot for presentation/debugging. The current renderer still reads the local
Battle directly; a network adapter and remote interpolation layer are not built.

These are local boundaries, **not network security or native tick-rate parity**.
The local snapshot includes both hands for debugging. It must not be exposed as a
public spectator/opponent payload. The local engine remains client-controlled.

## Accounts stage

Add an account service and a durable database independently of the static website.
Define a versioned profile API and an authenticated session. Keep passwords, account
secrets, signing keys and payment-related logic out of the downloadable client.
Use HTTPS and properly scoped secure session cookies; enforce authorization for each
profile operation. Include registration, verification/recovery, logout, rate limits,
account deletion and explicit consent around importing a guest save. None of those
flows exists in this build, and there is no login to an official Supercell account.

Never turn arbitrary guest gold/gems/trophies into trusted online balances. Guest
saves are editable practice data. A server must decide what, if anything, can be
migrated, and must issue canonical versioned balances/progression updates.

## Match stage

The server should own the match seed, deck validation, selected source-data version,
elixir, card cycle, deployment legality, simulation clock, damage and outcome.
Clients submit intents, not authoritative unit positions or rewards. Use match IDs,
protocol/data versions, monotonically sequenced commands, acknowledgements and
idempotent retries. Redact enemy hand/elixir and other hidden state from opponent
and spectator views. A reconnect flow needs a baseline snapshot plus ordered deltas
and a clearly defined stale-command policy. The client renderer must interpolate
between server observations rather than running an independently authoritative match.

The standalone Battle module can run without DOM dependencies and is therefore a
useful starting point for server hosting, but its floating-point 60 Hz update is a
browser-reimplementation choice. Lock a server tick convention and test determinism,
ordering, timeouts and all client/server data boundaries before calling it production.
The local adapter's small command cache is not a durable replay or recovery log.

## Online features after those boundaries are proven

Matchmaking, friend lists, chat moderation, clans/donations, progression ledgers,
anti-abuse controls and observability follow authenticated identity and authoritative
matches. They should not be simulated by silently relabeling the present generated
clan members or scripted local chat as real users. Keep offline practice explicitly
separate and available. Record native-reference parity cases independently from
network correctness; passing one does not establish the other.

No server, database, domain, account provider or hosted deployment has been created
or contacted on the user's behalf for this release.

## v0.10.0 progression and reward boundary

`progression.js` and `economy.js` own the local arena entitlement, acquisition-arena
chest pool, high-water mark, source reward IDs, choices, wildcard consumption and
idempotent claims. A future server must independently validate all those inputs and
commit both the claim ID and inventory change atomically in a durable transaction.
Do not accept client-submitted highestTrophies, chest arena, claimed IDs or balances
as evidence of entitlement. Local cheats and imported guest saves are still editable
practice data, not an online economy migration or security implementation.


## v0.11.0 shared learning and 2v2 boundary

The local Battle has four player seats in TeamVsTeam modes; seats 0/2 are blue and
1/3 red. Elixir, cycles, last-card state and summon ownership are per-seat. A future
server must authenticate the seat behind each command; client-supplied team/owner
values are not authority. Preserve hidden enemy hands and return teammate intents
only to that team. 2v2 here contains three local bots, not remote players.

`learning.js` exports a versioned model and per-match event/reward packet.
`learning-store.js` keeps a browser-local model/archive; `training-worker.js` runs
explicit local self-play. None is a remote upload endpoint. "Shared" means across
local bots/modes, not all users. No account IDs, remote credentials or hidden upload
jobs exist. Local recording includes diagnostic information that must not be sent
to opponents as a gameplay observation.

For a future central learner, use explicit consent, authenticated immutable match
IDs, engine/data version partitions, authoritative recomputation of outcomes and
reward targets, bounds/retention and a poison-resistant evaluation pipeline. Do not
merge arbitrary client gradient vectors into the global ranked policy; these local
exports and cheat labels are user-editable. Stage learned policies against fixed
held-out tests/opponent pools and support rollback. Record the model revision used
for each online match and never let client-side learned state control online rewards.
These are future design requirements, not implemented server assurances.

## v0.12.0 local persistence endpoint

The offline BAT now hosts a fixed-path AI-state API for the current Windows user. It is loopback-only, token protected, and revision checked, but is not a public multi-user account service. Do not expose it on a public interface or use its client-supplied models/results as authoritative online state. `src/appdata-store.js` keeps the browser/client boundary explicit. Self-play remains client-side workers, not a server cluster. Real accounts, authenticated server battle authority, cloud data lifecycle and global model training remain separate future work.
