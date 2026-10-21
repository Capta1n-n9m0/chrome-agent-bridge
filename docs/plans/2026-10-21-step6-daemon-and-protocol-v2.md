# Step 6 — The daemon, protocol v2, and the `daemon/ sdk/ mcp/` split

**Date:** 2026-10-21 · **Status:** Planned
**Design of record:** docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md (§4, §5, §9, §10, §11) ·
**As-built:** docs/plans/2026-10-21-step6-daemon-and-protocol-v2-asbuilt.md (does not exist yet; written
at stage close) · **Steps dir:** docs/plans/2026-10-21-step6-daemon-and-protocol-v2-steps/ (does not
exist yet; created at kickoff for ledgers, briefs, reports and evidence)

## Outcome

Targets at planning time; rewritten as results when the step closes.

- The WebSocket host on `127.0.0.1:9234` runs as a **persistent, shared daemon** started by whoever
  knocks first and gone after 10 min with zero clients (spec §9).
- A second Claude Code session connects alongside the first, and a script can run
  `await b.call("snapshot")` while Claude is connected — through one extension socket.
- The MCP server becomes the first client of a new `sdk/` package; the `server/` package is renamed
  `daemon/`; the five workspaces `shared/ daemon/ sdk/ mcp/ extension/` build, typecheck and test from
  the root (spec §11).
- Every existing tool behaves as today for Claude: baseline 21 tools (`server/src/tools/registry.ts`,
  21 `server.tool(` calls) and 301 tests (`npm test`, per `CLAUDE.md`) stay green at every stage close;
  the test count after each stage is recorded in its report.
- The **extension is not modified** in this step: it keeps sending a v1 hello and v1 errors, both
  accepted by the daemon.

Test-driven development (a failing test first, then the code) applies to everything in `daemon/` and
`sdk/` that does not touch a real socket's lifecycle: the registry, routing, id remapping, hello/welcome,
the build check, the idle timer, and the knock/spawn state machine with injected `connect`/`spawn`. The
existing `ws`-based host tests are extended for the multiplexing. Detached spawn, handover and idle exit
against a real process are manual end-to-end (E2E) checks. The checkbox (`- [ ]`) lines below are the
work items; the stages are ordered so each leaves `npm test` and `npm run typecheck` green.

**Goal:** Turn the MCP-owned WebSocket host into a **persistent, shared daemon** that any number of
clients connect to, started by whoever knocks first and gone when idle; give scripts a first SDK
(`connect()` + raw `call()`); make the MCP server the first SDK client. At the end of this step
everything behaves as today for Claude — through the daemon — a second Claude session connects
alongside the first, and a script can run `await b.call("snapshot")` while Claude is connected.
Tab leases and handles are **Step 7**; the typed `Tab` API is **Step 8**.

**Non-goals (this step):** any change to the extension; tab handles, leases, the visibility lock
(Step 7); locators, `BridgeError` enrichment, the typed `Tab` API, formatters moving (Steps 7–8);
a Python client; a daemon GUI or tray icon.

**Files touched:**
- `shared/src/protocol.ts` (v2 message types + guards), new `shared/src/codes.ts`, `shared/test/protocol.test.ts`
- `server/` → **`daemon/`** (git `mv`): `wsHost.ts` (roles, welcome, registry), `connection.ts` (unchanged),
  `handshake.ts` (role/name/build), new `registry.ts`, new `route.ts`, new `idle.ts`, new `build.ts`,
  new `log.ts`, `index.ts` (daemon entry), `startup.ts` (bind = lock: no retry in daemon mode);
  tests move with them
- new **`sdk/`**: `src/client.ts` (`BridgeClient`), `src/knock.ts` (connect-or-spawn state machine),
  `src/token.ts`, `src/index.ts`; `test/*`
- new **`mcp/`**: `src/index.ts`, `src/tools/registry.ts` (moved, now over `BridgeClient`),
  `src/lifecycle.ts` (moved unchanged), `src/config.ts` (moved), `src/download.ts` (moved → later to sdk);
  `test/tools.test.ts` (moved)
- root `package.json` (workspaces, scripts), `tsconfig` per package, `vitest.config.*`, `.gitignore`
- `docs/setup.md` (MCP config path changes to `mcp/dist/index.js`), `docs/e2e-test-plan.md` (§ MUX),
  `docs/progress-and-roadmap.md`, `CLAUDE.md` (architecture, key files, commands, gotchas)

**Order of work:** D0 (shared types, TDD) → D1 (repo split, pure moves, green) → D2 (daemon: registry,
roles, routing — TDD over `ws`) → D3 (daemon lifecycle: build hash, idle, shutdown, log) → D4 (sdk:
client + knock/spawn, TDD with injected I/O) → D5 (mcp over sdk) → D6 (E2E) → D7 (docs + commits).
D0 and D1 are independent. D2 needs D0+D1. D4 needs D0 only (can run parallel to D2/D3). D5 needs D4
and D2.

---

## Decisions

The decisions below were taken in the design spec and in this plan on 2026-10-21 and are **not
reopened** during the build: they are contract decisions in the sense of the `long-run` skill §3 (wire
protocol, package split, security boundary, lifecycle). A new decision taken while building goes to
`docs/decisions.md` (cited by date + title), never into this section; the run itself is governed by
decisions.md · 2026-10-21 · Steps 6–8 run under the long-run contract.

### 0.1 One port, one protocol, two roles

The hello gains `role`. `role: "extension"` (or absent — the v1 extension) is *the* extension
connection: at most one, a newer one replaces the older (today's behaviour). `role: "client"` joins
the registry; any number. Both authenticate with the same token. Rejected alternative: a second
listener (HTTP or WS on 9235) for clients — more surface, and the existing token gate, heartbeat and
`ExtensionConnection` already fit clients as they are.

### 0.2 Routing is dumb in this step

A client request `{id, method, params, timeoutMs?}` → the daemon calls
`extensionConnection.call(method, params, {timeoutMs})` and replies with the result or the error,
under the client's `id`. No interception yet except `daemon.status` and `daemon.shutdown`. If no
extension is connected → `{code: "NOT_CONNECTED"}` immediately (same text as today's message, which is
the `NOT_CONNECTED_MESSAGE` in `server/src/bridge.ts`). Per-client ordering is preserved by the socket;
cross-client calls run concurrently — the extension's router is already `async` and id-correlated,
which is why this is safe without a queue.

### 0.3 `timeoutMs` moves to the envelope

Today only the MCP's `browser_evaluate` passes a per-call timeout, in-process. A client can't reach
`CallOptions`, so the request message carries `timeoutMs?` (bounded by the daemon to `[100, 600000]`).
The daemon waits `timeoutMs + 5000` on its side so the extension's own timer reports first (same
slack rule as `SERVER_TIMEOUT_SLACK_MS = 5_000` in `server/src/tools/registry.ts` today).

### 0.4 Errors become `{code, message, data?}` everywhere

`ExtensionConnection` rejects with a `BridgeError` (in `shared/`) carrying `code`. A v1 error from the
extension (`{message}` only) is wrapped as `code: "INTERNAL"` — so nothing is lost before Step 7
teaches the extension codes. The MCP renders `message` as before; tests that matched message strings
keep passing.

### 0.5 Build identity

`build = sha256(daemon/dist/index.js)` computed once at daemon start (`build.ts`), sent in `welcome`,
printed by `daemon.status`. The SDK knows the path it would spawn (resolved relative to the sdk
package → `../daemon/dist/index.js`, overridable by `BRIDGE_DAEMON` env) and hashes it on `connect()`.
Mismatch → handover (§0.7). A hash, not the package version, because `npm run build` doesn't bump
versions and the stale-code trap is exactly the one we keep falling into with the extension.

### 0.6 Idle exit

`idle.ts`: a timer armed when the client count drops to 0, cleared when it rises above 0; fires after
`BRIDGE_DAEMON_IDLE_MS` (default 600 000). The extension connection does not count. On fire:
`host.close()` then `process.exit(0)`. Pure and tested with fake timers.

### 0.7 Handover protocol (SDK side)

```
connect():
  knock → ECONNREFUSED ─────────────► spawn detached ─► knock every 250 ms, ≤ 10 s ─► hello
        → connected ─► hello ─► welcome.build == expected ? done
                                    : send daemon.shutdown ─► wait close ─► knock until REFUSED ─► spawn ─► …
```
A daemon that receives `daemon.shutdown` replies `{result:{ok:true}}`, closes every client socket with
code `4002 "upgrading"`, closes the extension socket, exits. Clients that were connected see 4002 and
run `connect()` again (`BridgeClient` auto-reconnects on 4002 only; any other close is an error to the
script — a script should not silently keep going on a different daemon).

### 0.8 Spawn details

`spawn(process.execPath, [daemonPath], { detached: true, stdio: "ignore", windowsHide: true, env:
{ ...process.env, BRIDGE_TOKEN, BRIDGE_PORT } })`, then `child.unref()`. `process.execPath` so the
real node binary is used even when an nvm-windows shim launched the parent (the `lifecycle.ts`
finding). The daemon writes `~/.chrome-agent-bridge/daemon.log` (append, truncate to the last 1 MB on
start), lines like `2026-10-21T12:01:33Z client + "export-grades.ts" (3 clients)`. Never a URL, header
value, body or token.

### 0.9 Token lookup (`sdk/src/token.ts`)

`BRIDGE_TOKEN` env → else `bridge.token` file at the repo root (found by walking up from the sdk
package to the first directory containing `package.json` with `"workspaces"`), trimmed. Missing →
throws before any socket is opened, naming both places. The daemon uses the same function.

### 0.10 Package split, not a rewrite

`git mv server daemon` keeps history. Files that are MCP-only move to `mcp/` (`tools/registry.ts`,
`lifecycle.ts`, `config.ts` → split: port/token loading goes to `sdk/token.ts`, the MCP keeps a thin
`config.ts`). `download.ts` (chunked pull) is a client concern and lands in `sdk/` now, since the MCP
tool needs it and it already takes a `call` function.

---

## Stages

One stage per Part. **Lane** is the explicit grant a step agent needs under the `step-agent` ESCALATION
list ("an effect outside its own stage escalates unless the kickoff grants the lane"). **Parallel with**
follows the dependency graph in "Order of work". Only one process may own port 9234 at a time, so any
stage whose tests bind a real socket (D2, D3) serialises with any other that does.

### Stage D0 — Shared types and codes (TDD)

- [ ] `shared/src/codes.ts`: `export const ErrorCodes = { NOT_CONNECTED: "NOT_CONNECTED", … } as const;
      export type ErrorCode = …;` with the full list from the spec §10, grouped daemon / extension.
- [ ] `shared/src/protocol.ts`: `HelloMessage` gains `role?`, `name?`, `build?`, `proto?`;
      new `WelcomeMessage`; `RequestMessage` gains `timeoutMs?`; `ErrorResponse.error` becomes
      `{code: ErrorCode | string, message, data?}`; new `EventMessage {event, params}` + `isEvent`;
      `isWelcome`. Keep `isResponse`/`isErrorResponse` semantics.
- [ ] `shared/src/error.ts`: `class BridgeError extends Error { code; data? }` + `fromWire(err)` that
      wraps a v1 `{message}` as `INTERNAL`.
- [ ] Tests: guards accept v1 and v2 hellos; `fromWire` v1/v2; `isEvent` rejects responses/requests.

**Lane:** `shared/src/`, `shared/test/`. **Parallel with:** D1 (file-disjoint). **Verifier focus:**
every code in spec §10 is present, none invented; a v1 hello (`{type:"hello", token}` only) still
passes the guards; new tests fail when the guard change is reverted; `npm run typecheck` passes for
`server/` and `extension/` unchanged (the widened types must not break the v1 consumers).
**Needs the user's keyboard:** no.

### Stage D1 — Repository split (pure moves; green at the end)

- [ ] `git mv server daemon`; rename package to `@bridge/daemon`; `bin` → `chrome-bridge-daemon`.
- [ ] Create `mcp/` (`@bridge/mcp`, depends on `@bridge/sdk`, `@bridge/shared`, MCP SDK, zod) and move
      `tools/registry.ts`, `lifecycle.ts`, `config.ts`, `test/tools.test.ts`, `test/lifecycle.test.ts`.
      Temporarily the registry still imports a `Bridge`-shaped object — D5 switches it to `BridgeClient`.
- [ ] Create `sdk/` (`@bridge/sdk`, depends on `@bridge/shared`, `ws`); move `download.ts` + its test.
- [ ] Root: `workspaces: ["shared","daemon","sdk","mcp","extension"]`; `typecheck` and `build` scripts
      cover all; `vitest` picks up `*/test/**`.
- [ ] `npm test`, `npm run typecheck`, `npm run build` green; `docs/setup.md` MCP path updated to
      `mcp/dist/index.js` (the old `server/dist/index.js` path is gone — say so in the commit).

**Lane:** the whole repository — `server/` → `daemon/`, new `mcp/` and `sdk/`, root `package.json`,
per-package `tsconfig`, `vitest.config.ts`, `.gitignore`, `docs/setup.md`. This is the one stage with a
repo-wide grant; it must change **no behaviour** (moves and manifests only). **Parallel with:** D0
only; nothing else may run while D1 moves files. **Verifier focus:** `git log --follow` shows history
preserved for a moved file; `npm test` count equals the baseline (301 per `CLAUDE.md`; re-derived on
the baseline commit) — a pure move loses no test; the three root scripts cover all five workspaces;
`docs/setup.md` no longer mentions `server/dist/index.js` (today at lines 18, 36, 46 and 262).
**Needs the user's keyboard:** yes — see human gate G6-1 (the MCP config path changes).

### Stage D2 — Daemon: roles, registry, routing (TDD over real `ws` sockets, as `wsHost.test.ts` does)

- [ ] `handshake.ts`: `validateHello` returns `{ok, role, name, build}`; absent role → `"extension"`;
      unknown role → reject 4001.
- [ ] `registry.ts` (pure): `ClientRegistry` — `add(conn, meta) → clientId`, `remove`, `count()`,
      `list()` for `daemon.status`, `onCountChange(cb)`.
- [ ] `wsHost.ts`: on hello → send `welcome {build, proto:2, clientId, extensionConnected}`; extension
      role → `bridge.setConnection` as today; client role → registry + a `ClientConnection` that parses
      requests and hands them to `route()`. Heartbeat applies to both roles.
- [ ] `route.ts` (pure, takes `{bridge, registry, host}`): `daemon.status` → `{build, uptime,
      extensionConnected, clients:[{id,name,since}], port}`; `daemon.shutdown` → reply then
      `host.shutdown(4002)`; anything else → `bridge.call(method, params, {timeoutMs})`, errors mapped
      to `{code, message, data}` (`NOT_CONNECTED`, `TIMEOUT`, extension errors passed through).
- [ ] Extension events (`isEvent`) are accepted and ignored in this step (logged as a count), so a
      Step 7 extension against a Step 6 daemon does not spam errors.
- [ ] Tests: two clients + one fake extension — interleaved calls get their own ids back; a client
      disconnecting rejects only its pending calls; extension gone → every client's in-flight call
      rejects `NOT_CONNECTED`; `daemon.status` lists names; `daemon.shutdown` closes all with 4002;
      v1 hello still works; bad token still 4001.

**Lane:** `daemon/src/`, `daemon/test/`. **Parallel with:** D4 (file-disjoint, no shared socket in
D4's tests); never with D3 (same files and the same test port). **Verifier focus:** attack the id
remap with interleaved calls from two clients whose ids collide (both send `id: 1`); confirm the bad
token and the unknown role both close with 4001 and nothing is logged about the token; confirm the
heartbeat still terminates a client that misses a pong (the existing `heartbeatMs: 30` /
`autoPong: false` pattern); confirm D4's dependency — the `extensionStatus {connected:true}` event
reaches clients when the extension hello arrives (D4 says "add in D2").
**Needs the user's keyboard:** no.

### Stage D3 — Daemon lifecycle

- [ ] `build.ts`: `buildHash(path)`; the entry computes it for its own `process.argv[1]`.
- [ ] `idle.ts`: `IdleTimer({ms, onIdle, now?, setTimeout?, clearTimeout?})` driven by registry count
      changes; tests with fake timers (arm at 0, cancel at 1, re-arm at 0, fire once).
- [ ] `log.ts`: append-only file logger with start-time truncation to the last 1 MB; a `redact`
      guard that refuses to log a string containing `://` or the token (defence in depth).
- [ ] `index.ts`: load token/port (sdk `token.ts`), bind **once** — `EADDRINUSE` → log and exit 0
      (the other daemon won); no stdio; install SIGINT/SIGTERM/SIGBREAK → `host.shutdown(1001)`.
      `startup.ts`'s retry loop is no longer used by the daemon (keep it only if the mcp still needs
      it — it does not after D5; delete with its test).
- [ ] `BRIDGE_DAEMON_IDLE_MS` and `BRIDGE_PORT` env honoured; defaults 600000 / 9234.

**Lane:** `daemon/src/`, `daemon/test/`; reads `sdk/src/token.ts` (D4) — if D4 has not landed, D3
stubs the import and D5 wires it. **Parallel with:** D4 (file-disjoint); sequential after D2.
**Verifier focus:** the idle timer fires exactly once and never while a client is connected; `redact`
rejects a string with `://` and one containing the test token; the daemon entry has no `console.*`
call (it has no stdio); `EADDRINUSE` exits 0 without retrying (the bind is the lock, spec §9.3).
**Needs the user's keyboard:** no (the real detached process is D6).

### Stage D4 — SDK core (TDD with injected `connect`/`spawn`/timers)

- [ ] `client.ts`: `BridgeClient` — `connect()`, `call(method, params?, {timeoutMs?})`, `on("event",
      cb)`, `close()`, `status()`; reconnect on close 4002 only; events dispatched to listeners.
- [ ] `knock.ts`: the state machine of §0.7 as a pure function over an `io` object
      `{tryConnect, spawnDaemon, hashDaemon, sleep}`; tests: refused→spawn→connected; connected but
      stale→shutdown→spawn; two starters where spawn fails with EADDRINUSE → keep knocking; give up after
      10 s with a message naming the log file.
- [ ] `spawn.ts`: the real `spawnDaemon` (§0.8). Not unit-tested; E2E.
- [ ] `token.ts` (§0.9) + tests over a temp directory tree.
- [ ] `connect({ name, waitForExtensionMs = 15000 })`: after welcome, if `!extensionConnected`, wait for
      `extensionStatus {connected:true}` (the daemon emits it to clients when the extension hello
      arrives — add in D2) or fail `NOT_CONNECTED` with the usual "is Chrome open…" text.
- [ ] `index.ts` exports: `connect`, `BridgeClient`, `BridgeError`, `ErrorCodes`, `downloadToFile`.

**Lane:** `sdk/src/`, `sdk/test/`. **Parallel with:** D2 and D3. **Verifier focus:** the knock state
machine with a `sleep` that never advances real time (the 10 s give-up is measured by the injected
clock, not by waiting); a close code other than 4002 rejects the script rather than reconnecting;
`token.ts` finds `bridge.token` only at the workspace root, never in a nested package, and the thrown
message names both places; `spawn.ts` passes exactly `detached`, `stdio: "ignore"`, `windowsHide` and
calls `unref()`. **Needs the user's keyboard:** no.

### Stage D5 — MCP over the SDK

- [ ] `mcp/src/index.ts`: `const b = await connect({ name: \`claude-code #${process.ppid}\` })` —
      **failure to connect must not crash the MCP** (same rule as the busy-port rule today): register the
      tools regardless, store the reason, surface it through every tool and `browser_status`, and retry
      `connect()` every 5 s. (`startup.ts`'s shape, reused for the SDK connection.)
- [ ] `tools/registry.ts`: takes `BridgeClient`; `bridge.call` → `b.call`; `browser_status` prints
      `daemon.status` (build, clients by name, extension connected) and the active tab as today.
- [ ] `lifecycle.ts` unchanged; its `shutdown` closes the SDK client instead of the WS host.
- [ ] Tests: `tools.test.ts` with a fake `BridgeClient` (`_registeredTools[name].handler` quirk still
      applies); `browser_status` output includes client names.

**Lane:** `mcp/src/`, `mcp/test/`; deletes `daemon/src/startup.ts` + its test if D3 left them (granted).
**Parallel with:** sequential (needs D2 and D4). **Verifier focus:** the MCP starts and registers all
21 tools with no daemon reachable, and every tool error carries the stored reason (the no-crash rule
of `CLAUDE.md`); `lifecycle.ts` is byte-identical to the baseline apart from the shutdown call; the
tool list and every tool schema are unchanged from the baseline (`git diff` on the tool definitions).
**Needs the user's keyboard:** no for the unit work; the live check is D6.

### Stage D6 — E2E (manual, real Chrome; add to `docs/e2e-test-plan.md` as MUX-1…9)

This stage is a **wave run with the user** after the autonomous phase closes (human gate G6-2). The
autonomous run writes the rows into `docs/e2e-test-plan.md` and the `recipes/hello.ts` the rows need;
the measurements are taken with the user.

- [ ] **MUX-1** First knock starts the daemon: no daemon running → start Claude Code → `browser_status`
      shows build + 1 client; `Get-Process node` shows the detached daemon; daemon.log has the start line.
- [ ] **MUX-2** Second Claude session connects alongside: `browser_status` in both show 2 clients;
      `browser_snapshot` works in both (same active tab — leases come in Step 7).
- [ ] **MUX-3** A script while Claude is connected: `npx tsx recipes/hello.ts` (connect + `call("listTabs")`
      + print) succeeds; `browser_status` shows its name while it runs.
- [ ] **MUX-4** Idle exit: end every session, set `BRIDGE_DAEMON_IDLE_MS=20000` for the test, daemon
      exits ~20 s later; the extension's SW console shows `connection: down` then reconnect attempts.
- [ ] **MUX-5** Handover: with a session connected, touch `daemon/dist/index.js` content (rebuild),
      start a script → the script reports "upgraded daemon", Claude's `browser_status` shows the new
      build after its auto-reconnect.
- [ ] **MUX-6** Race: start two scripts simultaneously with no daemon → exactly one daemon process;
      both scripts succeed.
- [ ] **MUX-7** Parent death: kill Claude Code's process tree → daemon survives (detached); kill the
      nvm shim only (the `lifecycle.ts` case) → mcp exits, daemon survives.
- [ ] **MUX-8** No Chrome: daemon up, Chrome closed → `connect()` fails after 15 s with the
      "is Chrome open" message; open Chrome → next `connect()` succeeds.
- [ ] **MUX-9** Regression smoke: ACT-1/2, TRUST-2, EVAL-1, NET-1, DL-1 through the daemon.

**Lane:** `docs/e2e-test-plan.md` (§ MUX rows + the run record), `recipes/hello.ts`. **Parallel with:**
sequential, last before D7. **Verifier focus (wave):** each row's expected text is written before the
run; MUX-6 is judged by a process listing, not by the scripts' output alone; MUX-4's timing is measured
with a timestamp, not estimated; the daemon.log produced during the wave is grepped for `://` and for
the token before it is attached as evidence. **Needs the user's keyboard:** yes — the real profile, two
Claude sessions (MUX-2), killing process trees and the nvm shim (MUX-7), closing and reopening Chrome
(MUX-8), a rebuild mid-session (MUX-5).

### Stage D7 — Docs + commits

- [ ] `CLAUDE.md`: architecture block (daemon between), key files for the five packages, commands,
      gotchas: *the daemon outlives the session on purpose; `daemon.status` prints its build; after
      `npm run build` the next client upgrades it; `~/.chrome-agent-bridge/daemon.log`*. Remove the
      "only one Claude session" rule.
- [ ] `docs/setup.md`: MCP path, token file, daemon log, how to stop the daemon by hand.
- [ ] `docs/progress-and-roadmap.md`: Step 6 entry + E2E results.
- [ ] Commits (one per Part; each green): `refactor: split server into daemon/sdk/mcp workspaces`,
      `feat(shared): protocol v2 — roles, welcome, error codes, events`, `feat(daemon): client
      multiplexing over one extension socket`, `feat(daemon): build hash, idle exit, shutdown, log`,
      `feat(sdk): connect-or-spawn client with daemon handover`, `refactor(mcp): run as an SDK client`,
      `docs: Step 6 E2E results`.

**Lane:** `CLAUDE.md`, `docs/`. Under the long-run bookkeeping invariants the per-Part commits happen at
each stage's close (one commit per stage), so D7's commit list is the record of what each stage commits,
not a batch at the end. **Parallel with:** sequential, last. **Verifier focus:** every `CLAUDE.md` key
file path exists; no doc still says `server/dist/index.js` or "one session at a time" except as a dated
superseded marker; the roadmap entry cites its numbers with their source. **Needs the user's keyboard:**
the E2E results part waits for the D6 wave; the rest does not.

---

## Exit checks (pre-registered)

Pass rules a verifier can execute before any measurement is taken. "Before" is the stage's starting
commit; "after" is its closing commit; counts come from `npm test` (vitest prints `Tests N passed`).
The baseline for the whole step is 301 tests (`CLAUDE.md`, `npm test`) and 21 tools.

**D0**
- D0.1 `npm test` after ≥ before + the new guard tests; `npm run typecheck` green for all packages.
- D0.2 Tests cover: a v1 hello and a v2 hello both accepted by `isHello`; `fromWire({message})` →
  `code: "INTERNAL"`; `fromWire({code, message, data})` preserved; `isEvent` rejects a response and a
  request; `isWelcome` accepts only `type: "welcome"`.
- D0.3 `shared/src/codes.ts` contains exactly the codes listed in spec §10 (daemon: `NOT_CONNECTED
  TIMEOUT UNKNOWN_METHOD BAD_PARAMS TAB_HELD TAB_GONE TAB_UNKNOWN LOCK_TIMEOUT VERSION`; extension:
  `REF_STALE LOCATOR_NOT_FOUND LOCATOR_AMBIGUOUS OFFSCREEN RESTRICTED_URL DEBUGGER_ATTACH
  DEBUGGER_CANCELLED DEBUGGER_DEVTOOLS PAGE_ERROR NAV_FAILED DOWNLOAD_HTTP WINDOW_MINIMIZED INTERNAL`).
- D0.4 Each new test fails with the type/guard change reverted (verifier re-runs with a stash).

**D1**
- D1.1 `npm test` after == before (a pure move; the verifier re-derives "before" on the baseline
  commit); `npm run typecheck` and `npm run build` green from a clean tree.
- D1.2 `git log --follow -- daemon/src/wsHost.ts` shows the pre-move history.
- D1.3 `grep -rn "server/dist" docs/setup.md README.md CLAUDE.md` returns nothing.
- D1.4 `ls server` fails (the directory is gone); root `package.json` lists the five workspaces.
- D1.5 `git diff --stat <before>..<after> -- extension/` is empty.

**D2**
- D2.1 `npm test` after ≥ before + the D2 tests; typecheck green.
- D2.2 Tests cover, over real `ws` sockets: two clients + one fake extension with interleaved calls
  receiving their own ids; a client disconnect rejecting only that client's pending calls; the
  extension disconnecting rejecting every in-flight client call with `NOT_CONNECTED`; `daemon.status`
  listing client names; `daemon.shutdown` closing all sockets with 4002; a v1 hello accepted; a bad
  token rejected with 4001.
- D2.3 An `{event, params}` frame from the extension produces no error frame to any client.
- D2.4 `grep -rnE "console\.(log|error|warn)\(.*(url|href|token)" daemon/src` returns nothing.
- D2.5 `timeoutMs` outside `[100, 600000]` is clamped (test), and the daemon-side wait is
  `timeoutMs + 5000` (test with fake timers or an injected clock).
- D2.6 `git diff --stat -- extension/` is empty.
- D2.7 Clients receive `extensionStatus {connected: true}` when the extension hello arrives (required
  by D4's `waitForExtensionMs`; see Open items).

**D3**
- D3.1 `npm test` after ≥ before + the idle/build/log tests; typecheck green.
- D3.2 Tests cover: the idle timer arms at count 0, cancels at 1, re-arms at 0, fires once; `redact`
  refuses a string containing `://` and one containing the token; `buildHash` of a known file is
  stable; the log truncates to the last 1 MB on start.
- D3.3 `grep -n "console\." daemon/src/index.ts` returns nothing (the daemon has no stdio).
- D3.4 `daemon/src/startup.ts` and its test are deleted, or a note says why they stay until D5.
- D3.5 `grep -rn "retry\|setInterval" daemon/src/index.ts` shows no bind retry.
- D3.6 `git diff --stat -- extension/` is empty.

**D4**
- D4.1 `npm test` after ≥ before + the knock/client/token tests; typecheck green.
- D4.2 Tests cover: refused → spawn → connected; connected but stale build → shutdown → spawn →
  reconnected; spawn fails with `EADDRINUSE` → keeps knocking and succeeds; give-up after the injected
  10 s names `~/.chrome-agent-bridge/daemon.log`; close 4002 → reconnect; any other close → rejected;
  `token.ts` env wins over the file, the file is found from a nested directory, a missing token throws
  before any socket and names both places.
- D4.3 `sdk/src/index.ts` exports exactly `connect`, `BridgeClient`, `BridgeError`, `ErrorCodes`,
  `downloadToFile` (plus types).
- D4.4 `grep -rn "console\." sdk/src` shows no line that prints a URL, token or header value.

**D5**
- D5.1 `npm test` after ≥ before (the moved `tools.test.ts` now drives a fake `BridgeClient`); typecheck
  and build green.
- D5.2 The MCP registers 21 tools (`grep -c "server.tool(" mcp/src/tools/registry.ts` → 21) with
  schemas unchanged from the baseline.
- D5.3 Test: with `connect()` rejecting, the MCP still registers every tool and a tool call returns the
  stored reason; `browser_status` output includes the client names from a fake `daemon.status`.
- D5.4 `git diff <before> -- mcp/src/lifecycle.ts` shows only the shutdown call changed.
- D5.5 `docs/setup.md` and `docs/e2e-test-plan.md` updated in this stage for anything the user must
  do differently (the MCP path, the daemon).

**D6 (wave, with the user)**
- D6.1 Rows MUX-1…9 exist in `docs/e2e-test-plan.md` with expected results written before the run.
- D6.2 Each row's result is recorded with the command and the observed text; MUX-6 evidence is a
  process listing showing one daemon; MUX-4 evidence is two timestamps.
- D6.3 The attached `daemon.log` excerpt contains no `://` and not the token (grep both).
- D6.4 MUX-9's regression rows pass with the same expected text as their last recorded run.

**D7**
- D7.1 `grep -rn "one Claude session\|server/dist\|server/src" CLAUDE.md docs/setup.md` returns nothing
  except dated superseded markers.
- D7.2 Every path in the `CLAUDE.md` key-files list exists (`ls` each).
- D7.3 One commit per stage in `git log`, each message from the D7 list, no `dist/` and no
  `bridge.token` in any of them (`git show --stat`).

---

## Human gates

Points where the autonomous run stops and waits (`long-run` §4.2). Each is also the place the run
prepares a decision package.

- **G6-1 — before D1 (the repository split).** `git mv server daemon` and the move of the MCP entry to
  `mcp/` change the MCP config path from `server/dist/index.js` to `mcp/dist/index.js`. The building
  session must therefore **not depend on the bridge MCP** (its own connection dies with the move), and
  the user must update the MCP config (`docs/setup.md` line 36 today) **before the next session
  connects**. Stop before D1 unless the kickoff states both.
- **G6-2 — D6 is a wave run with the user.** Every MUX row needs the real Chrome profile, and several
  need actions only the user can take: a second Claude Code session (MUX-2), killing the Claude Code
  process tree and the nvm shim alone (MUX-7), closing and reopening Chrome (MUX-8), a rebuild while a
  session is connected (MUX-5). After the autonomous phase closes (D0–D5, D7's non-E2E parts), the
  session hands the user the MUX rows and the `recipes/hello.ts` runner; the measurements are taken
  together. The extension is unchanged in this step, so no extension reload is needed, but the MCP must
  be reconnected (`/mcp`) at the new path.
- **G6-3 — any token or bind question.** 0.9 adds a file lookup for the token and 0.8 passes
  `BRIDGE_TOKEN`/`BRIDGE_PORT` into the spawned daemon's environment. Any finding that would require
  binding other than `127.0.0.1`, accepting a connection without the token, or writing the token
  anywhere but the gitignored `bridge.token`, stops the run (`long-run` §4.4).
- **Standing gates:** never push; never commit `bridge.token`, `.env` or `dist/`; nothing touches the
  user's Chrome profile data outside the E2E rows the user runs.

## STOP rules and forbidden fixes

**Stops the gate** (the stage is not closed; the write-up continues): a pre-registered exit check
above fails after 2 fix rounds; `git diff -- extension/` is non-empty at any stage of this step; the
test count drops without a documented move; a security-boundary question (G6-3); an unexplained
port-9234 holder or an orphan `node` process the run did not start (`step-agent` ESCALATION list).

**Continues anyway, recorded:** a surprising measurement that trips no rule (for example the idle exit
taking longer than 20 s in MUX-4 — report the number); a build decision the plan left open (module
layout, test structure) — decided and recorded per `long-run` §3.

**Forbidden fixes for this step** (derived from 0.1–0.10 and `long-run` §3):
- widening the token rule or binding to anything but `127.0.0.1`;
- lowering the `+5000` daemon-side slack, the `[100, 600000]` bounds, the 10 s knock limit or the
  heartbeat to make a race or timeout test pass;
- logging a URL, header value, body or token — including "temporarily, to debug the daemon";
- making the daemon retry the bind (the bind is the lock, 0.7/spec §9.3) or exit non-zero on
  `EADDRINUSE`;
- making `BridgeClient` reconnect on any close code other than 4002;
- letting the MCP crash when `connect()` fails (D5's no-crash rule), or removing the 5 s retry;
- editing a test's expected message text to match a changed error instead of keeping the message
  (0.4: existing message-matching tests keep passing).

## Open items

Findings for the Stage-0 spec audit (not fixed here; the audit resolves them before stage 1), what
the plan leaves open, who decides, and what needs the user's keyboard.

**Findings for the Stage-0 audit**
- D4 requires the daemon to emit `extensionStatus {connected:true}` to clients "(add in D2)", but D2's
  checkbox list does not mention the event. Pre-registered here as exit check D2.7; the audit confirms
  D2 owns it. Step 7 T2 relies on it ("`extensionStatus` already emitted (Step 6)").
- Actor name: spec §8.3 says `claude-code #<pid>`; D5 uses `process.ppid` (Step 8 0.6 also says
  `#<ppid>`). Under the nvm-windows shim the MCP's parent is the shim, not Claude Code
  (`CLAUDE.md` lifecycle gotcha), so `ppid` names the shim. The audit decides which id the name should
  carry; the session agent records it (a naming decision, build-level, but it appears in the spec).
- "Files touched" lists `connection.ts (unchanged)`, while 0.4 makes `ExtensionConnection`
  (`server/src/connection.ts:14`) reject with a `BridgeError` carrying `code`. One of the two is stale.
- MUX-9 cites regression row `DL-1`; `docs/e2e-test-plan.md` has no `DL-*` rows (its IDs are ACT,
  TRUST, EVAL, NET, PERC, TAB, WAIT, HIST, NAV). `browser_download` (commit eec05a0) has no E2E row
  yet; the wave needs one written before the run.
- `bridge.token` is gitignored but today `server/src/config.ts` reads only `BRIDGE_TOKEN`; 0.9 adds the
  file lookup. `docs/setup.md` must state the precedence (env wins) in D5/D7.
- Blind spot: two clients with different `BRIDGE_DAEMON` paths (0.5) would each see a build mismatch
  and hand the daemon over to each other in turn. Spec §12 does not cover it. The audit decides whether
  a rule is needed; if none, it is recorded as a known limitation.
- `lifecycle.ts`'s parent check is verified on Windows only (`CLAUDE.md`); MUX-7 measures the detached
  daemon on Windows only. POSIX stays unverified unless the user runs it there.

**Left open by design (follow-ups below decide):** a `daemon.clients` kick; service variants of the
daemon; a Python client.

**Who decides:** build-level questions (file layout inside `daemon/`, test structure) → the session
agent, recorded `By: Claude`; anything on the wire (`protocol.ts`, codes, close codes), the token
lookup, the bind → contract, pre-stated rules apply or the conservative rule of `long-run` §3 with the
decision listed under Open decisions for the user.

**Revisit triggers:** the handover loop above is observed live; idle exit "proves annoying" (then the
service variant, only with evidence); a second trust boundary is wanted (out of scope, spec §2).

**Needs the user's keyboard:** updating the MCP config path after D1 and reconnecting (`/mcp`); the
whole D6 wave (MUX-1…9), including a second Claude session, process-tree kills, closing Chrome, and a
mid-session rebuild; any push.

## Follow-ups (not this step)

- Tab handles, leases, visibility lock, tab events — **Step 7**.
- Typed `Tab` API, locators, `BridgeError` enrichment, formatters out of the extension, MCP cursor — **Step 8**.
- A `daemon.clients` kick (disconnect a client by id) for the day a script hangs holding a tab.
- Windows service / launchd variants of the daemon if idle-exit proves annoying — only with evidence.
