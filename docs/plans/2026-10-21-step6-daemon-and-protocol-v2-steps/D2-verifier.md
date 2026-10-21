# D2 verifier report — Daemon: roles, registry, routing

Verifier: Claude Opus 5.5 (`claude-opus-5-5`), 2026-10-22. Independent; no agents spawned; no file in
the main tree edited except this report. Verified in an own git worktree
(`…/scratchpad/D2-verify`, at `8b30882`) with exactly the 12 D2 lane files copied in from the main
tree (D4 was editing `sdk/` in parallel). The worktree was removed at the end; `git worktree list`
then showed only the main tree and the D4 verifier's own `D4-verify` worktree (not mine).

**Verdict: PASS-with-notes** (no CRITICAL or MAJOR findings; every exit check passes; 1 MINOR, 6 NIT).

## Counts

| | Command (in the worktree) | Result |
|---|---|---|
| BEFORE (pristine `8b30882`, after `npm ci`) | `npm test` | **322 passed, 25 files** |
| BEFORE, daemon only | `npx vitest run daemon` | 30 passed, 5 files |
| AFTER (+12 D2 files) | `npm test`, run 4× | **385 passed, 28 files** every run |
| AFTER, daemon only | `npx vitest run daemon`, run 7× | **93 passed, 8 files** every run |
| AFTER, sdk at HEAD | `npx vitest run sdk` | 12 passed (1 file) → non-sdk = 373 / 27 files, matching the builder's claim |
| typecheck | `npm run typecheck` | exit 0 |
| build | `npm run build` | exit 0 |

No flake seen across 4 full-suite and 7 daemon-only runs (the one timing test,
"host.shutdown terminates a peer … after ~1 s", took 1012 ms each run against a 900–3000 ms window).

## Exit checks

| Check | Result | Evidence |
|---|---|---|
| D2.1 tests ≥ before + D2 tests; typecheck green | **PASS** | 322 → 385 (+63 = 7 registry + 24 route + 18 multiplex + 8 handshake + 2 bridge + 4 connection); typecheck exit 0 |
| D2.2 coverage over real `ws` sockets | **PASS** | `daemon/test/multiplex.test.ts`: colliding ids answered out of order (:134), client disconnect (:157), extension gone → `NOT_CONNECTED` for every client (:186), `daemon.status` names (:218), `daemon.shutdown` → 4002 `"upgrading"` on client A, B and the extension (:244), v1 hello (:286), bad token exactly 4001 (:346). See finding 4 on the wording "rejecting" |
| D2.3 extension event → no error frame to any client | **PASS** | multiplex.test.ts:370 (client frame counts unchanged after 100 ms, `stats().extensionEvents === 1`, no error frame back to the extension). A regression guard, see finding 3 |
| D2.4 `grep -rnE "console\.(log\|error\|warn)\(.*(url\|href\|token)" daemon/src` | **PASS** | empty, exit 1 (main tree and worktree) |
| D2.5 clamp + `timeoutMs + 5000` with fake timers | **PASS** | route.test.ts:46-58 (`daemonWaitMs`), :132-178 real `ExtensionConnection` under fake timers: 1000 → pending at 5999, TIMEOUT at 6000; 50 → 5100; 10 000 000 → 605 000; absent → 35 000 |
| D2.6 `git diff --stat -- extension/` empty | **PASS** | empty in the main tree (also `git status --short extension/` empty) and in the worktree |
| D2.7 `extensionStatus {connected:true}` on extension hello | **PASS** | multiplex.test.ts:420 (both clients get true, then false on close); :436 B7 |

## Revert experiment (focus 7)

1. **Full revert** — `git checkout HEAD -- daemon/src`, delete `registry.ts`/`route.ts`, keep every
   test: `npx vitest run daemon` → **32 failed | 30 passed (62)** plus `registry.test.ts` and
   `route.test.ts` failing at import (31 tests). The 30 passing are exactly the 30 pre-existing tests;
   **all 63 new tests fail on revert.** The multiplex tests fail coarsely (the `client()` helper waits
   for a welcome), so I also ran targeted mutations on the D2 code (each restored afterwards, `cmp`
   against the main tree clean):

| Mutation | Tests that fail |
|---|---|
| M1 B7 guard removed (`connected:false` on any extension close) | 1 — ":436 old extension socket … emits no {connected:false}" |
| M2 heartbeat skipped for clients | 1 — ":463 terminates a client that stops answering pings…" |
| M3 shutdown `terminate()` instead of `close(code, reason)` | 2 — :244 shutdown 4002, :273 |
| M4 no `+5000` slack | 7 — route.test.ts daemonWaitMs ×2, forwarding wait, fake-timer ×4 |
| M5 no clamp | 3 — route.test.ts clamp, 50→5100, 10 000 000→605 000 |
| M6 unknown role accepted | 2 — handshake.test.ts parseHello unknown role, validateHello unknown role |
| M7 no `extensionStatus {connected:true}` | 2 — :420, :436 |
| M8 no `if (this.shuttingDown) return` hello guard (wsHost.ts:192) | **0** — finding 2 |
| M9 events not short-circuited (passed on to `handleMessage`, still counted) | **0** — finding 3 |
| M10 only `status`/`shutdown` intercepted (other `daemon.*` forwarded) | 2 — multiplex :384, route.test.ts :220 |
| M11 `registry.remove` on close dropped | 3 — :157, :463, :273 |
| M12 `after()` (shutdown) runs before the reply is sent | 1 — :244 |

2. **Throwaway attack tests** (worktree only, then deleted) — 8/8 passed:
   3 clients × 5 colliding ids `"1"…"5"` plus a duplicate `"1"` inside client A, extension answering
   in a shuffled order → every client got exactly its own 5 (A: 6) results, extension-side ids all
   distinct; a response-shaped frame and a numeric id from a client → `BAD_PARAMS`, nothing forwarded;
   `timeoutMs: 1` over real sockets → `{code:"TIMEOUT", message:"Timed out after 5100ms calling never"}`;
   `daemon.status` after client B left lists only `["A"]`; `params` (including a nested object and a
   `tab`/`timeoutMs` key inside params) reach the extension byte-equal; a hello sent inside the 1 s
   shutdown grace window is not welcomed and leaves the registry empty; `host.shutdown` is idempotent
   (same promise) and the client sees 4002; a silent extension (`heartbeatMs: 30`, `autoPong:false`) is
   terminated, the bridge disconnects and a live client gets `{connected:false}` and stays open.

## Unedited existing tests (focus 6)

`git diff 8b30882 --stat -- daemon/test mcp/test` → `bridge.test.ts | 20 +`, `connection.test.ts | 39 +`,
`handshake.test.ts | 52 +`, `111 insertions(+)`; `git diff 8b30882 -- daemon/test mcp/test | grep -E "^-" | grep -v "^---"`
→ empty. No removed or changed line; `wsHost.test.ts`, `startup.test.ts` and every `mcp/test` file
untouched; no expected message text edited. `mcp/src/index.ts` is unchanged and still uses
`Bridge`/`WsHost`/`startWsHost` (lines 4-6, 14, 21, 27); it typechecks and the mcp tests pass.

## Findings

**1. MINOR — The `validateHello` deviation is not recorded in the governing doc.**
Location: `daemon/src/handshake.ts:36-39`; phase doc D2 first checkbox ("`validateHello` returns
`{ok, role, name, build}`").
Evidence: `grep -rn parseHello docs/` → only `D2.ledger.md:3` ("deviation, proposed decision"). The
phase doc carries no dated note.
Judgement: the deviation itself is **defensible** under the SPEC-DISCREPANCY PROTOCOL and the
conservative rule: the pre-existing `handshake.test.ts` asserts `validateHello(v1 hello) toEqual {ok:true}`,
and "every existing test behaves identically / unedited" sits on the integrity floor, above a
function-shape line in a checkbox; the checkbox's intent (the hello parse yields role/name/build;
absent role → extension; unknown role → 4001) is met by `parseHello`, which `wsHost` uses, and
`validateHello` also rejects an unknown role. **Can both be satisfied?** Not honestly: `toEqual` ignores
only `undefined`-valued, non-enumerable or prototype properties, and `role` is never undefined for an
accepted hello — passing would need a trick (role as a prototype getter or non-enumerable property)
that defeats the test's meaning. Fix: the step agent adds a dated note to the D2 checkbox
("*Amended 2026-10-22: `parseHello` returns `{ok, role, name?, build?}`; `validateHello` keeps `{ok}`
because `handshake.test.ts:7` pins it*") and records the proposed decision.

**2. NIT — The shutdown hello guard is untested and, as measured, only defensive.**
Location: `daemon/src/wsHost.ts:192`.
Evidence: mutation M8 (guard removed) → 93/93 pass; my grace-window attack test also passed with the
guard removed, because a hello arriving after `shutdown()` meets a socket already in `CLOSING`, whose
`ws.send(welcome)` is dropped, and its `close` removes the registry entry.
Fix: none required; optionally a test that drives a hello into a socket still `OPEN` while
`shuttingDown` is set (e.g. stub `close` for that socket) if the guard is meant to be load-bearing.

**3. NIT — D2.3's test is a regression guard, not a test of new behaviour.**
Location: `daemon/test/multiplex.test.ts:370`.
Evidence: M9 → 93/93 pass; at `8b30882` an `{event, params}` frame also went to
`ExtensionConnection.handleMessage`, which ignores non-responses, so no error frame could arise before
D2 either. The discriminating part is the `stats().extensionEvents === 1` assertion (fails with the
full revert). Fix: none; state it as a guard in the step report.

**4. NIT — A disconnected client's calls are dropped, not cancelled.**
Location: `daemon/src/wsHost.ts:63-67` (`ClientConnection.send` drops when closed), `:226`.
Evidence: multiplex.test.ts:157 asserts A gets nothing and B still resolves; the daemon-side
`ExtensionConnection` pending entry for A's call stays until the extension answers or
`daemonWaitMs` elapses (up to 605 s with `timeoutMs: 600000`). D2.2's "rejecting only that client's
pending calls" is met in substance (nothing of B's is affected; the client rejects its own pending
calls on its side), and v1 has no cancel message to send the extension. Fix: none for Step 6; note for
Step 7 if per-client cancellation is wanted.

**5. NIT — `timeoutMs` is not forwarded on the daemon → extension frame.**
Location: `daemon/src/route.ts:86-88`; `daemon/src/connection.ts:25`.
Evidence: attack test — the extension received `{id, method, params}` only. Decision 0.2 writes the
call as `extensionConnection.call(method, params, {timeoutMs})` (a daemon-side wait), consistent with
this; spec §10's "D→E: same, id remapped" is looser. The v1 router ignores the field either way.
Fix: none now; Step 7 decides if the extension should see it.

**6. NIT — Interim window: the MCP's embedded host now answers `daemon.shutdown`.**
Location: `mcp/src/index.ts:21-27` (unchanged) with the new `WsHost`.
Evidence (by reading): until D5, any token-holding `role:"client"` peer on the MCP's port can call
`daemon.shutdown`; `host.shutdown` closes the listener and `startWsHost`'s retry only covers a failed
bind, so that MCP's bridge stays down until the session restarts. Same token boundary; nothing in the
autonomous run starts an MCP or a client against 9234. Fix: none; D5 removes the embedded host.

**7. NIT — `daemon/package.json` does not declare `@bridge/shared`.**
Location: `daemon/package.json` dependencies.
Evidence: D2 adds value imports of `BridgeError`/`ErrorCodes`; `connection.ts` already imported
`@bridge/shared` at `8b30882`, resolving through the workspace link. Pre-existing since D1; the D2
ledger notes it as out of lane. Fix: D3 (which adds the daemon build) declares it.

## Other focus items — checked, no finding

- **Id remap (1):** `ExtensionConnection` mints its own ids (`String(this.nextId++)`, `connection.ts:24`),
  the client's id is echoed verbatim; collisions within and across clients hold (attack test).
- **4001 and logging (2, 10):** bad token and unknown role close with exactly 4001
  (multiplex :346 asserts the code); reasons are the fixed strings `"invalid token"`,
  `"unknown role"`, `"expected hello handshake"` — never a field value. The token is compared before
  the role is looked at (`handshake.ts:26-27`, test "rejects a wrong token before looking at the role").
  Every `console.*` in `daemon/src`: `wsHost.ts:88` (`err.name` only), `:171` (`err.message` — stricter
  than HEAD's whole error object), `:181` (the role). Bind still `host: "127.0.0.1"` (`wsHost.ts:139`).
- **Heartbeat (3):** both roles — existing `wsHost.test.ts:131` (extension) and new multiplex :463
  (client leaves the registry, `onCountChange` → `[1, 0]`); M2 discriminates.
- **extensionStatus / B7 (4):** sent after the extension's welcome (`wsHost.ts:199-203`); `false` only
  when the closing connection is `bridge.currentConnection()` (`:221-224`); M1/M7 discriminate.
- **Cross-package (5):** the v1 hello lands as the extension, never in the registry, also on reconnect
  (multiplex :286). The real extension: `extension/src/client.ts:44` forwards every frame to the
  service worker, and `extension/src/router.ts:18` returns `null` for a frame without `id`+`method`,
  so the unsolicited `welcome` and any `extensionStatus` are dropped silently (no reply, no throw);
  `client.ts:45-47` reconnects on any close code, so 4002 makes it reconnect with its 0.5–10 s backoff.
- **Shutdown (9):** reply sent before `after()` runs `host.shutdown(4002)` (`wsHost.ts:84-85`,
  M12 discriminates); code **and** reason asserted on client A, B and the extension; after shutdown a
  new connection is refused/not welcomed; grace 1 s then `terminate()` (`SHUTDOWN_GRACE_MS`, test :273);
  idempotent; no `process.exit` (D3's job).
- **Spec (11):** `daemon.status` reflects departures; a script claiming `role:"extension"` with the
  token replaces the extension — pre-existing design per 0.1 ("a newer one replaces the older"), not a
  D2 change; `params` forwarded untouched; `ExtensionConnection` timeouts surface as `TIMEOUT` over the
  wire; numeric id → `BAD_PARAMS` is what B8 rules, so it is not a deviation; `undefined` results are
  answered as `null` (route.ts:90).

## Claimed deviations — ruling

| Claim | Ruling |
|---|---|
| `validateHello` keeps `{ok:true}`; `parseHello` carries role/name/build | Defensible (integrity floor beats the checkbox's function shape); needs the in-place doc note — finding 1 |
| Numeric id → `BAD_PARAMS`, not ignored | Not a deviation: B8 says "A non-string id → `BAD_PARAMS`" |
| `timeoutMs` not forwarded to the extension | Consistent with 0.2; finding 5 |
| Socket-error log prints `err.message` | Stricter than before; acceptable |
