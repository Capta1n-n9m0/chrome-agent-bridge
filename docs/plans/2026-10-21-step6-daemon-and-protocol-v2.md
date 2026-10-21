# Step 6 — The daemon, protocol v2, and the `daemon/ sdk/ mcp/` split

> **DRAFT — not yet started.** For agentic workers: TDD for everything in `daemon/` and `sdk/` that
> does not touch a real socket's lifecycle (registry, routing, id remap, hello/welcome, build check,
> idle timer, knock/spawn state machine with injected `connect`/`spawn`); the existing `ws`-based host
> tests are extended for the multiplexing. Detached spawn, handover and idle exit against a real
> process are manual E2E. Steps use checkbox (`- [ ]`) syntax and are ordered so each Part leaves
> `npm test` + `npm run typecheck` green. Design: `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md`
> (§4, §5, §9, §10, §11). The **extension is not modified in this step** — it keeps sending a v1 hello
> and v1 errors, both accepted.

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

## 0. Design decisions (local to this step)

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
extension is connected → `{code: "NOT_CONNECTED"}` immediately (same text as today's message).
Per-client ordering is preserved by the socket; cross-client calls run concurrently — the extension's
router is already `async` and id-correlated, which is why this is safe without a queue.

### 0.3 `timeoutMs` moves to the envelope

Today only the MCP's `browser_evaluate` passes a per-call timeout, in-process. A client can't reach
`CallOptions`, so the request message carries `timeoutMs?` (bounded by the daemon to `[100, 600000]`).
The daemon waits `timeoutMs + 5000` on its side so the extension's own timer reports first (same
slack rule as `SERVER_TIMEOUT_SLACK_MS` today).

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

## Part D0 — Shared types and codes (TDD)

- [ ] `shared/src/codes.ts`: `export const ErrorCodes = { NOT_CONNECTED: "NOT_CONNECTED", … } as const;
      export type ErrorCode = …;` with the full list from the spec §10, grouped daemon / extension.
- [ ] `shared/src/protocol.ts`: `HelloMessage` gains `role?`, `name?`, `build?`, `proto?`;
      new `WelcomeMessage`; `RequestMessage` gains `timeoutMs?`; `ErrorResponse.error` becomes
      `{code: ErrorCode | string, message, data?}`; new `EventMessage {event, params}` + `isEvent`;
      `isWelcome`. Keep `isResponse`/`isErrorResponse` semantics.
- [ ] `shared/src/error.ts`: `class BridgeError extends Error { code; data? }` + `fromWire(err)` that
      wraps a v1 `{message}` as `INTERNAL`.
- [ ] Tests: guards accept v1 and v2 hellos; `fromWire` v1/v2; `isEvent` rejects responses/requests.

## Part D1 — Repository split (pure moves; green at the end)

- [ ] `git mv server daemon`; rename package to `@bridge/daemon`; `bin` → `chrome-bridge-daemon`.
- [ ] Create `mcp/` (`@bridge/mcp`, depends on `@bridge/sdk`, `@bridge/shared`, MCP SDK, zod) and move
      `tools/registry.ts`, `lifecycle.ts`, `config.ts`, `test/tools.test.ts`, `test/lifecycle.test.ts`.
      Temporarily the registry still imports a `Bridge`-shaped object — D5 switches it to `BridgeClient`.
- [ ] Create `sdk/` (`@bridge/sdk`, depends on `@bridge/shared`, `ws`); move `download.ts` + its test.
- [ ] Root: `workspaces: ["shared","daemon","sdk","mcp","extension"]`; `typecheck` and `build` scripts
      cover all; `vitest` picks up `*/test/**`.
- [ ] `npm test`, `npm run typecheck`, `npm run build` green; `docs/setup.md` MCP path updated to
      `mcp/dist/index.js` (the old `server/dist/index.js` path is gone — say so in the commit).

## Part D2 — Daemon: roles, registry, routing (TDD over real `ws` sockets, as `wsHost.test.ts` does)

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

## Part D3 — Daemon lifecycle

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

## Part D4 — SDK core (TDD with injected `connect`/`spawn`/timers)

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

## Part D5 — MCP over the SDK

- [ ] `mcp/src/index.ts`: `const b = await connect({ name: \`claude-code #${process.ppid}\` })` —
      **failure to connect must not crash the MCP** (same rule as the busy-port rule today): register the
      tools regardless, store the reason, surface it through every tool and `browser_status`, and retry
      `connect()` every 5 s. (`startup.ts`'s shape, reused for the SDK connection.)
- [ ] `tools/registry.ts`: takes `BridgeClient`; `bridge.call` → `b.call`; `browser_status` prints
      `daemon.status` (build, clients by name, extension connected) and the active tab as today.
- [ ] `lifecycle.ts` unchanged; its `shutdown` closes the SDK client instead of the WS host.
- [ ] Tests: `tools.test.ts` with a fake `BridgeClient` (`_registeredTools[name].handler` quirk still
      applies); `browser_status` output includes client names.

## Part D6 — E2E (manual, real Chrome; add to `docs/e2e-test-plan.md` as MUX-1…9)

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

## Part D7 — Docs + commits

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

## Follow-ups (not this step)

- Tab handles, leases, visibility lock, tab events — **Step 7**.
- Typed `Tab` API, locators, `BridgeError` enrichment, formatters out of the extension, MCP cursor — **Step 8**.
- A `daemon.clients` kick (disconnect a client by id) for the day a script hangs holding a tab.
- Windows service / launchd variants of the daemon if idle-exit proves annoying — only with evidence.
