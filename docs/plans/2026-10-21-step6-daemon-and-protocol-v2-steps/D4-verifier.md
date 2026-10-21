# D4 verifier report — SDK core

Verifier: Claude Opus 5.5 (`claude-opus-5-5`), independent, 2026-10-22. Scope: the D4 lane only
(`sdk/package.json`, `sdk/src/*`, `sdk/test/*`, all uncommitted in the main tree).

Method: own git worktree at `8b30882` (clean HEAD), `npm ci`, BEFORE run; then copied exactly D4's
lane files from the main tree (the 8 new `sdk/src` files, the 9 new `sdk/test` files and
`sdk/package.json`; `sdk/src/download.ts` and its test are unchanged from HEAD). After the runs, every
copied file was byte-compared with the main tree (`cmp`: no difference). Nothing from `daemon/` was
copied. The worktree was removed afterwards (`git worktree list` shows only the main tree). Probe
sources are kept in the scratchpad (`…/scratchpad/D4-probes/`). Nothing was committed or pushed, no
daemon was started, nothing bound 9234 (every socket used port 0 on 127.0.0.1), and the Chrome
profile was not touched. While this ran, D2 was committed to `main` (`4d0241e`, `524ffa3`). It does
not touch `sdk/`, so these results stand. The combined tree was not re-run.

## Counts

| | Command (worktree) | Result |
|---|---|---|
| BEFORE (clean `8b30882`) | `npm ci && npm test` | **322 passed, 25 files** |
| AFTER (+ D4 lane files) | `npm run typecheck` | exit 0 (shared, daemon, sdk, mcp, extension) |
| AFTER | `npm test` | **394 passed, 33 files** (+72 tests, +8 files) |
| AFTER | `npm run build` | exit 0 (mcp + extension; `sdk` has no build script, B4) |
| sdk only | `npx vitest run sdk/test` | 84 passed, 9 files (72 new + 12 download), 848 ms |

The builder's "72 new" is confirmed. The builder's 457 included D2's in-progress tests and was not
re-derived.

## Exit checks

| Check | Evidence | Result |
|---|---|---|
| D4.1 AFTER ≥ BEFORE + new sdk tests; typecheck green | 394 = 322 + 72; typecheck exit 0 | **PASS** |
| D4.2 (each case located, see the table below) | all present and green | **PASS** |
| D4.3 exact exports | `npx tsx probes/exports.ts` (imports `"@bridge/sdk"` from the worktree root) → `sdk: BridgeClient,BridgeError,ErrorCodes,connect,downloadToFile`; `token: TOKEN_FILE,findWorkspaceRoot,moduleDir,resolveToken`. Also pinned by `sdk/test/index.test.ts` | **PASS** |
| D4.4 `grep -rn "console\." sdk/src` | no output, exit 1 (no console call at all) | **PASS** |
| `git diff -- extension/` (main tree) | empty; `git status --porcelain -- extension/` empty | **PASS** |
| Nothing outside `sdk/` changed by D4 | worktree with D4 files: `git status` shows only `sdk/` paths. The main tree's other changes are D2's `daemon/` lane plus the ledgers | **PASS** |

D4.2 case map:

| Case | Test |
|---|---|
| refused → spawn → connected | `knock.test.ts` "refused → spawn → knock every 250 ms → hello → welcome" |
| stale build → shutdown → spawn → reconnected | `knock.test.ts` "connected but stale build → daemon.shutdown → wait close → knock until refused → spawn → reconnected" |
| spawn EADDRINUSE → keeps knocking → succeeds | `knock.test.ts` "spawn loses the bind race (EADDRINUSE…)" |
| give-up after injected 10 s naming `~/.chrome-agent-bridge/daemon.log` | `knock.test.ts` "gives up after the injected 10 s…" (asserts clock ≥ 10 000, real time < 2 s) |
| close 4002 → reconnect | `client.test.ts` "close 4002 → in-flight calls reject, the knock runs again…" |
| any other close → rejected | `client.test.ts` loop over 1006/1000/1001/4001 |
| second mismatch after own handover → VERSION naming both builds, one handover | `knock.test.ts` "a second build mismatch after its own handover…" (`shutdownsSent === 1`) |
| token: env wins; file from nested dir; missing throws before any socket naming both | `token.test.ts` "BRIDGE_TOKEN in the environment wins…", "reads bridge.token … from a nested directory", "missing → throws naming…"; `connect.test.ts` "missing token → rejects before any socket" (`tryConnect`/`spawnDaemon` not called) |
| 2026-10-22: no welcome in 2 s → VERSION, no spawn/handover | `knock.test.ts` "connected, hello sent, no welcome within 2 s…" |
| daemon path from the workspace root; `BRIDGE_DAEMON` override; missing file rejects before the knock | `paths.test.ts` (sdk/src and mcp/dist start dirs, override, missing); `connect.test.ts` "missing daemon/dist/index.js → rejects before the knock" (`tryConnect` and `hashDaemon` not called) |
| client timer = daemon wait + 1 s | `client.test.ts` "clientTimeoutMs…" and "its own timer is clamp + 6000 ms…" |

## Verifier-focus results

- **No real waits in the tests.** `grep -rn "setTimeout\|useFakeTimers\|sleep(" sdk/test` finds only
  the two hand-written fake `Timers` objects (`client.test.ts:15`, `connect.test.ts:31`). The knock
  uses `fakeClock` (`fakes.ts`), whose `sleep` only adds to a counter. Measured with the vitest JSON
  reporter: the 10 s give-up test took 1.2 ms, the 2 s no-welcome test 1.5 ms, the stale-build test
  0.9 ms, and the 4002 reconnect test 2 ms. The only real-socket tests are in `transport.test.ts`, on
  port 0.
- **Only 4002 reconnects.** `client.ts:243` `if (code === CLOSE_UPGRADING)`. Every other code sets
  `failed` and rejects pending and later calls. Mutation M1 below fails 4 tests.
- **Token lookup only at the workspace root.** The walk-up stops at the first `package.json` with
  `"workspaces"`, so a nested package's `bridge.token` is ignored (test "ignores a bridge.token inside
  a nested package"; mutation M4 fails 6 tests). The message names `BRIDGE_TOKEN` and the absolute
  root path. Termination: `findWorkspaceRoot("C:\\")` → null, a UNC `\\localhost\c$\Windows` → null,
  and from `sdk/src` it finds the worktree root (probe `paths2.ts`).
- **Spawn options.** `spawn.ts:30-39` calls
  `spawn(execPath ?? process.execPath, [daemonPath], {detached:true, stdio:"ignore", windowsHide:true,
  env:{...process.env, BRIDGE_TOKEN, BRIDGE_PORT:String(port)}})` and then `child.unref()`. It also
  adds `child.on("error", () => {})`, which is harmless. Pinned by `spawn.test.ts`; mutations M6, M7
  and M12 each fail it.
- **Port consistency (F24).** The knock and `spawnDaemon` receive the same `port` variable
  (`knock.ts:142`). Tests "refused → spawn" and "an explicit port override wins and reaches both the
  knock and the spawn" pin it.
- **The token never appears in an error message.** I ran `connect()` with the token
  `SECRET-XYZ-987` through every failure path: give-up, no welcome, 4001, VERSION, proto, bad port,
  missing daemon, and no extension. The probe asserted `not.toContain(SECRET)` on each message and
  passed. `grep -n token sdk/src` shows the token only in the hello frame and the spawn environment,
  and never interpolated into text.
- **`./token` stays client-free.** `token.ts` imports `node:fs`, `node:path` and `node:url` only.
  `npx esbuild sdk/src/token.ts --bundle --metafile` gives inputs `[sdk/src/token.ts]`, so D3's daemon
  bundle will not pull in `ws` or the client.
- **`ws` import and bundling.**
  `npx esbuild sdk/src/index.ts --bundle --platform=node --format=esm --external:ws` builds cleanly
  (12 inputs, one `from "ws"`). The bundled output connected to a real `ws` server in the probes below.

## Mutation results (each in the worktree, restored afterwards; `cmp` against the main tree confirmed restoration)

| # | Mutation | Result |
|---|---|---|
| M1 | `client.ts`: reconnect on any close code | 4 tests fail (close 1006/1000/1001/4001) |
| M2 | `knock.ts`: allow a second handover | 2 tests fail (second-mismatch VERSION; drain) |
| M3 | `knock.ts`: drop the 2 s welcome timeout | 2 tests fail (time out at 5 s) |
| M4 | `token.ts`: any `package.json` is the root (nested token accepted) | 6 tests fail |
| M5 | `client.ts`: `CLIENT_MARGIN_MS = 0` (drop the +1000) | 2 tests fail |
| M6 | `spawn.ts`: `stdio: "pipe"` | 1 test fails |
| M7 | `spawn.ts`: no `unref()` | 1 test fails |
| M8 | `knock.ts`: spawn on every refusal | 3 tests fail |
| M9 | `token.ts`: the file wins over the env | 6 tests fail |
| M11 | `knock.ts`: the no-welcome path spawns before VERSION | 1 test fails |
| M12 | `spawn.ts`: `windowsHide: false` | 1 test fails |
| M13 | `knock.ts`: `KNOCK_LIMIT_MS = 20_000` | 1 test fails |

(M10 was a malformed sed that did not apply; M11 tests the same behaviour.) Every applied mutation was
caught.

## Findings

**1. MAJOR — An event that arrives right after `welcome` is lost between the knock and the client
attaching; `connect()` then waits the full `waitForExtensionMs` and fails with "Extension not
connected" although the extension is connected.**
Location: `sdk/src/knock.ts:68-82` (`sayHello` keeps its message listener until after
`await Promise.race`), and `sdk/src/transport.ts:9-11` (the docstring claims "none is lost between the
knock and the client attaching").
Mechanism: `ws` delivers every frame of one TCP read synchronously. The knock's listener is still
subscribed when the second frame arrives, so the transport does not buffer it, and the knock ignores
anything that is not `welcome`. The daemon D2 committed sends exactly this pair:
`sendWelcome(ws, clientId)` to a new client, then `broadcastExtensionStatus(true)` when the
extension's hello arrives (`daemon/src/wsHost.ts`). That is the fresh-spawn case, where the client and
the extension connect to a new daemon at about the same time. Step 7's tab events would be lost the
same way, and the same path runs on every 4002 reconnect.
Evidence: `probes/frameloss.mjs` runs a real `ws` server on 127.0.0.1:0. On hello it sends `welcome
{extensionConnected:false}` and then `{event:"extensionStatus", params:{connected:true}}` back to
back. It ran against the esbuild bundle of `sdk/src/index.ts` (3 runs) and the tsx source (1 run):
```
REJECTED NOT_CONNECTED Extension not connected — is Chrome open and the Chrome Agent Bridge extension enabled? (waited 1500 ms on port 60148) ms 1526
(×4, every run)
```
With the event delayed 20 ms (`frameloss-delayed.mjs`): `connected; extensionConnected = true ms 34`.
Suggested fix: in `sayHello`, unsubscribe synchronously inside the listener when the welcome is
seen, before `settle`, so the following frames go to the transport's buffer. Add a transport-level
test that sends welcome plus an event in one tick and expects `connect()` to resolve.

**2. MINOR — `connect()` can hang without bound, past the 10 s knock limit, when the port holder
accepts TCP but never answers the HTTP upgrade (for example a hung or suspended process).**
Location: `sdk/src/transport.ts:96` (`new WebSocket(url)` with no `handshakeTimeout`; self-declared
deviation 6).
Evidence: `probes/silent-tcp.mjs` (a `net` server on 127.0.0.1:0 that accepts and stays silent)
printed `STILL PENDING after 14013 ms (knock limit 10000 + welcome 2000)`.
Suggested fix: `new WebSocket(url, { handshakeTimeout: … })` bounded by the remaining knock budget,
or race `tryConnect` against `io.sleep(deadline - now)` in the knock so the injected clock covers it.

**3. MINOR — The extension wait ignores the 4002 reconnect and non-4002 closes (deviation 7).**
Location: `sdk/src/connect.ts:92-110` (it listens only to `"event"`).
(a) If a 4002 reconnect happens during the wait and the new `welcome` says `extensionConnected:true`,
no event follows, so `connect()` still times out. (b) After a non-4002 close the client is already
`failed`, but `connect()` keeps waiting and then reports "is Chrome open…", which hides the real
cause.
Evidence: a vitest probe using `fakes.ts` and fake timers (`D4-probes/extwait.ts`):
```
4002-then-ext-up | before the 15 s timer fires: pending
4002-then-ext-up | after the timer: rejected NOT_CONNECTED: Extension not connected — … (waited 15000 ms on port 9234)
1006-during-wait | before the 15 s timer fires: pending
1006-during-wait | after the timer: rejected NOT_CONNECTED: Extension not connected — …
```
Suggested fix: also resolve on `on("reconnected")` when `extensionConnected` is true. Fail fast with
the client's failure (the close code) on a non-4002 close. Test both cases.

**4. MINOR (spec blind spot; contract-level, for the session agent) — The handover budget resets on
every 4002 reconnect, so two clients on different builds still hand the daemon to each other. The
loser gets a misleading `NOT_CONNECTED` give-up instead of `VERSION`.**
Location: `sdk/src/connect.ts:82` (each reconnect runs a fresh `knock`), and `sdk/src/knock.ts:195`
(the drain heuristic `!spawned && build === handedOverFrom`).
Decision #10's purpose is to stop two clients with different `BRIDGE_DAEMON` paths handing the daemon
back and forth. Because 0.7 says a client that sees 4002 "runs connect() again", every reconnect gets
a new handover. When the other client's reconnect respawns the old build before this client ever sees
the port refused, the drain heuristic treats it as "still draining". This client then knocks until
the deadline and gives up with `NOT_CONNECTED … see daemon.log` rather than `VERSION` naming both
builds.
Evidence: `D4-probes/pingpong2.ts` simulates one daemon slot and two `BridgeClient`s (builds A and B)
through the real `knock` and `BridgeClient`, varying only how fast each client knocks:
```
lagA=3 lagB=0: total daemon.shutdown sent: 2
  A call -> NOT_CONNECTED Could not reach the bridge daemon on 127.0.0.1:1 within 10 s (the old daemon was still answering after daemon.
lagA=5 lagB=1: total daemon.shutdown sent: 2 ; B connect rejected NOT_CONNECTED
lagA=0 lagB=3 / 2,2: total daemon.shutdown sent: 1 (loser gets VERSION)
```
The loop ends in every run because the spawn race breaks it; nothing guarantees it ends on a fixed
number of rounds. This follows the letter of 0.7, #10 and D4.2.
Suggested resolution (decision for the session agent): either a reconnect after 4002 never hands
over (a mismatch there → `VERSION`, since someone else deliberately upgraded), or a "draining" daemon
that is still answering at the deadline gives up with `VERSION` naming both builds. Record whichever
is chosen in `decisions.md`.

**5. MINOR — The `BridgeClient` surface grew beyond the phase doc's list without a recorded decision
(deviation 8).**
Location: `sdk/src/client.ts:86-94` (getters `welcome` and `extensionConnected`) and `:137-152`
(`on("reconnected")`).
The SPEC-DISCREPANCY protocol makes "the SDK's public surface" contract-level. The additions are
additive and `on("reconnected")` is what decision #11 needs, but they should be written down.
Suggested fix: a `decisions.md` entry, or a dated note on Stage D4.

**6. NIT — Deviation 1 (the 10 s budget restarts at the handover) is compatible with the forbidden
fix and with D4.2, but no test pins it and the message understates the time.** Location:
`knock.ts:184`. 0.7's diagram puts "≤ 10 s" on the spawn branch, which the handover re-enters ("knock
until REFUSED → spawn → …"), so a per-cycle limit is a faithful reading: it is not a lowering, and it
was not tuned to make a test pass. The worst case for a handing-over `connect()` is about 20 s plus
the welcome waits. The give-up text still says "within 10 s". Suggested fix: add a test of the
give-up after a handover (clock ≈ handover time + 10 000), and record the reading in the stage report
or a dated note on 0.7.

**7. NIT — A 4001 close is always reported as "rejected the token".** Location: `knock.ts:161-167`.
D2's handshake also closes with 4001 for `"unknown role"` and a malformed hello
(`daemon/src/handshake.ts:21-28`). Suggested fix: include the daemon-supplied close reason, which
never carries the token value.

**8. NIT — Deviation 5: `BRIDGE_TOKEN` is trimmed in the SDK and raw in `mcp/src/config.ts`.** This
is harmless once D5 moves the MCP onto `resolveToken`, and the daemon uses the same function. D5
should delete the raw read rather than keep both.

Not findings (checked and found sound): no listener is left on the connection the knock returns
(asserted `listenerCount === 0`); a call's timeout deletes its pending entry and a late answer is
ignored; a 4002 on a dropped connection is ignored (`conn !== this.conn`); calls queued during a
failed reconnect reject with the knock's error; `close()` during the first connect or a reconnect
closes the new socket and rejects with "BridgeClient is closed" (the in-flight knock is not aborted
and may still spawn once, which is acceptable); no `VERSION` path spawns or sends a second
`daemon.shutdown` within one `knock()` (M2 and M11 are caught); the aborted welcome and handover
sleeps clear their real timers, so no 2 s or 10 s timer keeps a finished script alive; a Git Bash
`BRIDGE_DAEMON` on win32 gets the "use a native Windows path" hint; no URL, header value or token is
printed anywhere (no `console` in `sdk/src`).

## Verdict

**FAIL**: one MAJOR finding (1, the lost post-welcome frame). Every exit check (D4.1 to D4.4, the
extension diff and the lane) passes, and the mutation suite catches every behaviour tried. The fix
for finding 1 is local to `sayHello` and needs one transport-level test. Findings 2–8 are
MINOR or NIT; finding 4 needs a decision from the session agent, not a fixer's choice.

## Re-check after fixer round 1

Verifier: Claude Opus 5.5 (`claude-opus-5-5`), 2026-10-22. Method: a fresh worktree at `524ffa3`
(D2 committed), `npm ci`, BEFORE run, then copied in only `sdk/package.json`, `sdk/src/*` and
`sdk/test/*` from the main tree (new file: `sdk/test/handover-race.test.ts`). After the runs every
copied file was byte-compared with the main tree (no difference). The worktree was removed and
`git worktree list` shows only the main tree. No commit, no push, no daemon started, nothing bound
9234.

### Counts

| | Command | Result |
|---|---|---|
| BEFORE (`524ffa3`) | `npm ci && npm test` | **385 passed, 28 files** |
| AFTER | `npm run typecheck` | exit 0 |
| AFTER | `npm test` | **479 passed, 37 files** (+94 sdk tests; 106 in `sdk/` including the 12 download tests) |
| AFTER | `npm run build` | exit 0 |

### Exit checks (re-run)

| Check | Evidence | Result |
|---|---|---|
| D4.1 | 479 ≥ 385 + 94; typecheck exit 0 | **PASS** |
| D4.2 | every case from the first report is still present and green; the new cases are listed below | **PASS** |
| D4.3 | a `tsx` import of `"@bridge/sdk"` gives `BridgeClient,BridgeError,ErrorCodes,connect,downloadToFile`; `onClientFailure` is not exported; `./token` is unchanged (`TOKEN_FILE,findWorkspaceRoot,moduleDir,resolveToken`) | **PASS** |
| D4.4 | `grep -rn "console\." sdk/src` gives no output | **PASS** |
| `git diff -- extension/` | empty (main tree) | **PASS** |
| Lane | the worktree's `git status` shows only `sdk/` paths; the main tree's only changes outside `sdk/` are the two D4 docs files | **PASS** |

### Fixer claims, audited

- **F1 (MAJOR finding 1): fixed.** `sayHello` unsubscribes inside the welcome listener
  (`knock.ts:90-96`, with a guard for frames delivered synchronously from the buffer). My original
  probe `D4-probes/frameloss.mjs` (welcome plus `extensionStatus` back to back on a real `ws` server)
  now prints `connected; extensionConnected = true` in 12–18 ms: 3 runs against the esbuild bundle
  and 1 through tsx. Before the fix all 4 rejected after 1 500 ms. The new corked-write transport
  tests do test the fix: mutation F1a (drop the synchronous unsubscribe) fails 2 tests, including
  "an extensionStatus frame in the same TCP read as the welcome is not lost".
- **F2 (finding 2): fixed.** `D4-probes/silent-tcp.mjs` now prints
  `rejected NOT_CONNECTED after 10006 ms`; before the fix it was still pending at 14 s. A refused
  connect is unaffected: ECONNREFUSED arrives in 1–6 ms with or without a timeout. The
  `expect.any(Number)` change in `connect.test.ts:101,118` does **not** weaken anything: those tests
  pin the port, and `knock.test.ts` pins the timeout value exactly ("passes tryConnect the remaining
  budget…" gives `[10000, 9750, 9500]`). Mutation F2a (no timeout passed) fails 3 tests; F2b (the
  transport ignores `timeoutMs`) fails the ETIMEDOUT test.
- **F3 (finding 3): fixed.** My `extwait` scenarios are now covered by tests. A 4002 reconnect whose
  welcome says the extension is up resolves; a 1006 close during the wait fails at once with the
  close error. Mutations F3a (no failure notification) and F3b (the wait ignores `reconnected`) each
  fail 1 test. `onClientFailure` leaks nothing: listeners live in a `WeakMap` keyed by the client,
  `done()` removes them, and `notifyFailure` deletes the set.
- **F4 (finding 4, the session agent's ruling): implemented as ruled.** A reconnect after 4002
  passes `allowHandover:false` (`client.ts` `establish(true)` → `connect.ts:83-84` →
  `knock.ts:224-233`). A build mismatch there gives VERSION naming both builds and sends no shutdown;
  it still spawns on a refused port. After its own handover, the old build still answering at the
  deadline gives VERSION naming both builds (`knock.ts:264-275`). Each plumbing mutation is caught:
  F4a (`allowHandover: true` in `connect`, 4 tests fail), F4b (the knock ignores the option, 5 fail),
  F4c (the client passes `reconnect:false`, 4 fail), F4d (still answering at the deadline gives
  NOT_CONNECTED, 3 fail). **No path sends a second shutdown or loops:** a handover is sent only when
  `allowHandover && handedOverFrom === null`, which is also the only place the deadline resets.
  Every other iteration either sleeps 250 ms against a fixed deadline or throws.
- **The abort-honouring sleep in `handover-race.test.ts` hides no real bug.** I ran the race at 14
  lag pairs (adding 20/0, 0/20, 40/0 and 0/40) in two sleep modes:
  - *Abort honoured:* all 14 pass, each with 1 shutdown, one winner and a VERSION loser.
  - *Abort ignored:* the fake clock also counts aborted sleeps, adding 2 s per welcome wait and the
    rest of the 10 s per handover wait. Shutdowns stay ≤ 1 in all 14 and nothing loops. In 3 pairs
    B gives up with NOT_CONNECTED instead of VERSION, because time that never passed used up its fake
    deadline.

  The real `realSleep` clears its timer on abort and `now()` is `performance.now()`, so an aborted
  sleep never moves wall time. The honouring fake is the faithful model; the 3 results come from my
  probe's clock, not from the code.
- **F6: fixed.** The give-up texts say "within 10 s of the first knock" or "…of asking the old
  daemon to step down (daemon.shutdown)". The test "the 10 s budget restarts at the handover" pins
  the clock at about 1 000 + 10 000; mutation F6 (no reset) fails it.
- **F7: fixed.** The 4001 message carries the daemon's reason through `safeReason`, with the token
  masked as `<token>`. Mutation F7 (no masking) fails 1 test.
- **The token never appears in a message.** I probed every failure path with a sentinel token:
  give-up, ETIMEDOUT, no welcome, 4001 with the token inside the reason, VERSION, VERSION for an old
  build still answering at the deadline, proto, bad port, missing daemon, no extension, and VERSION
  with `allowHandover:false`. No message contained the token. The 4001 reason came out as
  `"token <token> wrong"`.

### Remaining notes (no MAJOR or CRITICAL)

1. **NIT: test gap.** Mutation F2c (drop `ws.terminate()` on a handshake timeout) passes all 106
   sdk tests, so nothing checks that the abandoned socket is closed. Suggested fix: in the ETIMEDOUT
   transport test, assert that the server-side socket sees `close` or `end` after the timeout.
2. **NIT: what is left of finding 3.** A non-4002 close can land between `attach` and the start of
   the extension wait (the close is delivered on a microtask before `connect()` subscribes). Then
   the failure notification has no listener, and the wait runs the full 15 s and reports "is Chrome
   open". A probe reproduced it: a connection whose close fires on the attach subscription left
   `connect()` pending with a live 15 000 ms timer, and firing the timer gave the Chrome text. The
   window is very narrow. Suggested fix: before waiting, if the client has already failed, throw
   its failure.
3. **NIT.** `safeReason` masks only the whole token, so a reason carrying a cut-off prefix of the
   token would not be masked. D2's reasons never contain the token, so this is defence in depth
   only. The non-4002 close message in `client.ts` still includes the daemon's reason unmasked.
   That text also comes from the daemon and carries no token.
4. Mutation F1b (checking `welcomed` after `isWelcome`) is equivalent code, so it was not counted.

### Mutation summary (this round)

12 counted mutations; all caught except F2c (note 1). F1a caught (2 tests), F2a caught (3), F2b
caught (1), F2c **survived**, F3a caught (1), F3b caught (1), F4a caught (4), F4b caught (5), F4c
caught (4), F4d caught (3), F6 caught (1), F7 caught (1). Every source file was restored and
compared with the main tree before the worktree was removed.

### Verdict (re-check)

**PASS-with-notes.** The MAJOR finding and every MINOR from the first report are resolved, and a
test that fails under mutation pins each fix. Every exit check passes, and what remains is NIT only.
