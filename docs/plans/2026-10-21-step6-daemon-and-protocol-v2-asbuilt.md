# Step 6 — as-built register

**Phase doc:** `docs/plans/2026-10-21-step6-daemon-and-protocol-v2.md` · **Steps dir:**
`docs/plans/2026-10-21-step6-daemon-and-protocol-v2-steps/` · **Baseline:** `1a92d95` (301 tests,
22 files; 21 tools).

One section per stage, appended at stage close, never rewritten; corrections are dated notes.

## Stage 0 — spec audit (closed 2026-10-22, commit 618a3ae)

- **Outputs:** `stage0-audit.md` (34 findings: 0 CRITICAL, 8 MAJOR, 17 MINOR, 9 NIT; D1 move map;
  builder ambiguities B1–B18), `stage0-verifier.md` (38 spot-checks re-executed: 33 confirmed,
  3 partial on wording, 0 refuted). Verdict DONE, verifier PASS-with-notes.
- **Measured baseline** (auditor and verifier each, on `1a92d95`): `npm test` 301 passed in 22 files
  (shared 1/4, server 8/86, extension 13/211); typecheck and build exit 0; 21 tools.
- **Decisions taken:** decisions.md · 2026-10-22 · #13–#17.
- **Phase-doc amendments:** A1–A4, A13 by the step agent; A5–A12 and the F1/F2/F7/F8/F23 checkbox
  additions and MUX-7 by the session agent, each with a dated note.
- **Open decisions (user):** #13 (no welcome → `VERSION`), #14 (detached daemon vs `taskkill /T`),
  #15 (non-4002 close handling).
- **Measured fact, candidate gotcha:** on Windows `spawn(…, {detached: true})` keeps the child in
  the parent's process tree; `taskkill /T` on a live parent kills it.
- **Estimate vs actual:** 1.5 h estimated; ~26 min agent wall time.
- **Needs the user's keyboard:** nothing yet; a `bridge.token` file or `BRIDGE_TOKEN` for the D6 wave
  (F21: none exists on this machine).

## Stage D0 — shared types and codes (closed 2026-10-22, commit 6f7768c)

- **Outputs:** `shared/src/codes.ts` (22 codes: 9 daemon, 13 extension, plus `isErrorCode`),
  `shared/src/error.ts` (`BridgeError`, `WireError`, `toWire`, `fromWire`), `shared/src/protocol.ts`
  (hello `role/name/build/proto`, `WelcomeMessage`/`isWelcome`, `EventMessage`/`isEvent`,
  `ExtensionStatusParams`, request `timeoutMs?`), `shared/package.json` exports `./codes`, `./error`.
- **Measured:** `npm test` 301 → 322 passed (22 → 25 files); typecheck and build exit 0;
  `git diff 490c6c3..6f7768c -- extension/ server/` empty; extension bundle byte-identical (verifier).
- **Verifier:** PASS-with-notes (3 MINOR, 3 NIT, none blocking); D0.4 checked by reverting source
  only — 7 of 14 new tests fail, the hello/response regression guards pass as expected.
- **Contracts binding forward:** the wire error code is optional and normalises to `INTERNAL`;
  `isHello` rejects mistyped v2 fields; events are `{event, params}` with no `id`; `params` required.
- **Deviations:** the plan's `{code: ErrorCode | string, …}` became `code?` (decisions.md · 2026-10-22
  · #18); D0.4's stash instruction corrected in place (it stashed the new tests too).
- **Estimate vs actual:** 1 h estimated; ~12 min agent wall time.

## Stage D1 — repository split (closed 2026-10-22, commit 80e540c)

- **Outputs:** five workspaces `shared daemon sdk mcp extension`; all 21 tracked `server/` files moved
  as git renames (18 at R100); only import specifiers changed (`mcp/src/index.ts`, `registry.ts`,
  `tools.test.ts`); `lifecycle.ts` byte-identical. MCP bundle now at `mcp/dist/index.js`, differing
  from the old `server/dist/index.js` only in 14 esbuild path comments; `ws` still external.
  `docs/setup.md` (lines 18, 36, 46, 262) and `start-bridge.sh:20` point at `mcp/dist/index.js`.
- **Measured:** `npm test` 322 → 322 passed, 25 files (clean worktrees with `npm ci`, both sides);
  per package daemon 30, mcp 44, sdk 12, shared 25, extension 211. Typecheck all five, build
  mcp + extension green. `git log --follow daemon/src/wsHost.ts` keeps history. Extension diff empty.
- **Verifier:** PASS-with-notes.
- **Interim state binding forward:** `mcp` depends on `@bridge/daemon` (exports `./bridge`,
  `./connection`, `./wsHost`, `./startup`) until D5; `daemon/` has no build script until D3;
  `tsx` is a root devDependency (decisions.md · 2026-10-22 · #19).
- **Carried to later stages:** D3 adds `@bridge/shared` to `daemon/package.json`; D5 adds `ws` to
  `mcp` when it drops `@bridge/daemon`; D5 fixes `mcp/src/index.ts:35` (names `server/dist` in a
  runtime message) and `docs/e2e-test-plan.md` lines 19, 23, 88 (D5.5); D7 fixes `CLAUDE.md` lines
  48, 61, 94 (`server/src`).
- **Needs the user's keyboard:** the MCP config path now must be `<repo>/mcp/dist/index.js` (G6-1).
- **Estimate vs actual:** 1.5 h estimated; ~13 min agent wall time.

## Stage D2 — daemon roles, registry, routing (closed 2026-10-22, commit 4d0241e)

- **Outputs:** `daemon/src/` `handshake.ts` (`parseHello` + `validateHello` wrapper), `registry.ts`
  (`ClientRegistry`), `route.ts`, `wsHost.ts` (roles, welcome, `ClientConnection`, events ignored and
  counted, `extensionStatus`, `shutdown(code)` flush), plus tests over real `ws` sockets on port 0.
- **Measured:** `npm test` 322 → 385 passed (25 → 28 files), stable over 4 runs, in the verifier's
  worktree (8b30882 + the 12 D2 files, `npm ci`); typecheck and build exit 0; extension diff empty.
- **Verifier:** PASS-with-notes (1 MINOR, 6 NIT). All 63 new tests fail with `daemon/src` reverted;
  8 extra attack tests passed (3 clients with colliding ids answered out of order, a real-socket
  `TIMEOUT`, a hello during the shutdown grace). The real extension ignores the welcome frame
  (`extension/src/router.ts:18`) and reconnects on a 4002 close.
- **Contracts binding forward (Step 7 re-examines by execution):**
  - welcome `{type:"welcome", build, proto:2, clientId:"c<n>"|"extension", extensionConnected}`;
  - `daemon.status` → `{build, uptime (ms), extensionConnected, clients:[{id,name,since}], port}`;
  - error envelope `{id, error:{code, message, data?}}`, `code` always present from the daemon;
  - close 4001 on a failed hello (reasons "expected hello handshake", "invalid token",
    "unknown role"); close 4002 "upgrading" after `daemon.shutdown` replies `{ok:true}`, ≤ 1 s
    flush, then terminate;
  - event `extensionStatus {connected}` — `true` on the extension hello, `false` only when the
    current extension socket closes;
  - daemon wait `clamp(timeoutMs ?? 30000, 100, 600000) + 5000`; `timeoutMs` not forwarded;
  - other `daemon.*` methods → `UNKNOWN_METHOD`, never forwarded.
- **Deviation:** the handshake checkbox's `validateHello` return shape kept, `parseHello` added
  (dated Superseded note in the phase doc; decisions.md · 2026-10-22 · #20).
- **For D3:** pass the real `build`; `host.shutdown(1001)` on a signal; `host.stats()` and
  `registry.onCountChange` for the log and idle timer; add `@bridge/shared` to `daemon/package.json`
  (root lockfile edit; D3 lane is granted it by the session agent).
- **Estimate vs actual:** 3 h estimated; ~23 min agent wall time.

## Stage D4 — SDK core (closed 2026-10-22, commit 9f3fc86)

- **Outputs:** `sdk/src/` `token.ts` (`resolveToken`; `./token` subpath export for the daemon),
  `paths.ts` (workspace-root walk-up, `BRIDGE_DAEMON` override), `transport.ts`, `spawn.ts` (exactly
  decision 0.8 plus `unref()`), `knock.ts`, `client.ts` (`BridgeClient`), `connect.ts`, `index.ts`
  (exports exactly `connect`, `BridgeClient`, `BridgeError`, `ErrorCodes`, `downloadToFile`).
- **Measured:** verifier's clean worktree at 524ffa3 + D4: `npm test` 385 → 479 passed (28 → 37
  files); first pass at 8b30882 gave 322 → 394. Typecheck and build exit 0; `grep console. sdk/src`
  empty; extension diff empty. The 10 s give-up and 2 s no-welcome tests run on an injected clock.
- **Verifier:** FAIL on the first pass (an `extensionStatus` frame in the same TCP read as the
  `welcome` was dropped, so `connect()` waited 15 s and blamed Chrome), then PASS-with-notes after one
  fix round. Three NITs left open (no test for a removed `ws.terminate()` on handshake timeout; a
  non-4002 close just before the extension wait starts is missed; close-reason masking catches only
  the whole token).
- **Contracts binding forward:** SDK error codes per decisions #21 and #22; the 10 s budget per
  spawn cycle (#23); `BridgeClient` getters and `on("reconnected")` (#24). Exact knock states and
  error texts: `D4.md`. Phase doc carries an "As built 2026-10-22 (D4)" note under Stage D4.
- **Measured fact, candidate gotcha:** `ws` emits several frames from one TCP read synchronously,
  before any promise continuation runs; a one-shot listener must unsubscribe inside its own callback
  or it swallows the frames behind the one it waited for.
- **For D5/D7:** D5 reads the token through `resolveToken` (`mcp/src/config.ts` still reads
  `BRIDGE_TOKEN` raw). D7's `setup.md` covers token precedence, `BRIDGE_DAEMON` as a native Windows
  path, one shared `BRIDGE_PORT`, and ending pre-Step-6 sessions first.
- **Estimate vs actual:** 3 h estimated; ~46 min agent wall time.

## Stage D3 — daemon lifecycle (closed 2026-10-22, commit 3964eb1)

- **Outputs:** `daemon/src/build.ts`, `idle.ts`, `log.ts` (with `redact`), `main.ts` (`runDaemon`)
  behind a thin `index.ts`; `WsHost` gains an `onShutdown` hook; `daemon/package.json` gains a build
  script and `@bridge/shared` + `@bridge/sdk` (token subpath only); 2-line npm-made lockfile change.
  `npm run build` produces `daemon/dist/index.js` (`ws` external, no SDK client code inside).
- **Measured:** `npm test` 479 → 528 passed (37 → 41 files), "before" re-derived in a clean worktree
  at cbd91f9 with `npm ci`; typecheck and build exit 0; D3.1–D3.6 pass; extension diff empty.
- **Verifier:** PASS-with-notes after one fix round (an idle value above 2³¹−1 ms exited after
  1 ms; fixed with 3 tests that fail on revert). Live checks of the built entry as a non-detached
  child on ephemeral ports with a dummy token and temp HOME: held port → exit 0 with empty stdio;
  idle, `daemon.shutdown` (close 4002) and an unwritable log → clean exit 0; the extension did not
  count toward idle; the token never reached the log. Signals were not deliverable live on Windows
  (unit tests only).
- **As built (env, log, exits):** `BRIDGE_TOKEN` or `bridge.token` via `@bridge/sdk/token`;
  `BRIDGE_PORT` default 9234 (bad → exit 1); `BRIDGE_DAEMON_IDLE_MS` default 600000 (bad → logged,
  default). Log lines `YYYY-MM-DDTHH:MM:SSZ <msg>`. Bind `127.0.0.1` only. Decisions.md ·
  2026-10-22 · #25.
- **D3.4:** `startup.ts` and its 5 tests stay until D5 because `mcp` still imports them (#17).
- **Open NITs:** `wsHost`'s D2-era `console.error` lines are lost in the daemon (no stdio) — a
  logger for them is a later item; a daemon losing the bind race truncates the shared log first.
- **Phase-doc notes:** decision 0.6 (`host.close()` → `shutdown(1001)`) and "as built" for D3.
- **Estimate vs actual:** 1.5 h estimated; ~24 min agent wall time.

## Stage D5 — MCP over the SDK (closed 2026-10-22, commit d6832a1)

- **Outputs:** `mcp/src/index.ts` connects with `connect({name: "claude-code #<pid>"})`;
  `mcp/src/link.ts` (`BridgeLink`) carries the no-crash rule (21 tools registered with no daemon,
  stored reason on every tool error and in `browser_status`, `connect()` 5 s after each attempt
  settles, no overlap, fresh `connect()` after a non-4002 close); registry over `BridgeClient`;
  `config.ts` keeps only `actorName`; `browser_download` uses the SDK's `downloadToFile`.
  Removed: `mcp` → `@bridge/daemon`, the daemon's interim exports, `daemon/src/startup.ts` + test.
- **`browser_status` as built:** `Daemon: connected on 127.0.0.1:<port> (build <b>, up <s>s)` /
  `Clients (<n>): names…` / `Extension: …` / `Active tab: …`; with no client `Daemon: not connected`
  + `Problem: <reason>`.
- **Measured:** `npm test` 528 → 538 passed (41 files): −5 `startup.test.ts` (documented removal),
  +13 `link.test.ts`, +2 `tools.test.ts`; the three old `browser_status` tests replaced one for one
  (pairs in `D5.md`). Typecheck and build green. 21 tools, names and schemas byte-identical to
  `1a92d95` apart from `browser_status`'s description and body. `lifecycle.ts` and `extension/`
  diffs empty.
- **Verifier:** PASS-with-notes after one docs-only fix round. 13 code mutations each caught; the
  built `mcp/dist/index.js` ran over stdio with no daemon and did not crash; cross-package run over
  real `ws` on port 0: connect, 1001 close and recovery, 4002 reconnect, no welcome → `VERSION`.
- **Docs:** `docs/setup.md`, `docs/e2e-test-plan.md` (lines 19, 23, §2, CONN-1/2/3/6/7, STAT-1)
  updated with dated notes; run records unchanged.
- **Open, outside the lane:** the daemon's heartbeat and socket-error lines (`wsHost.ts:177,187`)
  never reach `daemon.log`; a stale comment at `sdk/src/connect.ts:48`; D7 rewrites `CLAUDE.md`'s
  busy-port gotcha (`startup.ts` gone; `link.ts` carries the no-crash rule).
- **Regression found, sent to D5b:** with Chrome closed the MCP held no client (decisions.md ·
  2026-10-22 · #27).
- **Estimate vs actual:** 2 h estimated; ~23 min agent wall time.
