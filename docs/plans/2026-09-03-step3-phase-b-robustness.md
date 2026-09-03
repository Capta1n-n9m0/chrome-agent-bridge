# Step 3 — Phase B leftovers: robustness & diagnostics

> **For agentic workers:** TDD for the server-side pure logic (`Bridge`, `startup`, `wsHost` heartbeat);
> the extension glue + soak cases are manual E2E. Steps use checkbox (`- [ ]`) syntax.
> Prerequisites: Steps 1 and 2 done (`2026-09-03-step1-…`, `2026-09-03-step2-…`).

**Goal:** Make failure modes *legible to the agent* and prove the keepalive. Three sub-goals:
1. **B1 — "port busy" surfaced through the tools**, plus automatic recovery when the port frees up. Today the
   warning goes to stderr only; the agent just sees the generic "Extension not connected" error and can't
   tell "Chrome is closed" from "an orphaned server holds :9234".
2. **B2 — dead-socket detection + CONN-5 idle keepalive soak.** The server never pings; if Chrome dies or the
   offscreen document is torn down, `Bridge` keeps a stale connection and every call waits the full 30 s
   timeout. And the 3-minute idle soak (does the offscreen socket survive service-worker culling?) has never
   been run.
3. **B3 — TRUST-3 debugger-attach conflict UX.** When DevTools is open on the tab, `chrome.debugger.attach`
   throws "Another debugger is already attached…"; the agent should get a one-line, actionable message.

**Files touched:** `server/src/bridge.ts`, `server/src/startup.ts`, `server/src/index.ts`,
`server/src/wsHost.ts`, `server/src/connection.ts` (maybe), `server/src/tools/registry.ts`,
`extension/src/debugger.ts`, new `extension/src/debugger-errors.ts`, `extension/src/sw.ts`,
`docs/e2e-test-plan.md`, `docs/setup.md`, `docs/progress-and-roadmap.md`, `CLAUDE.md`; tests in
`server/test/{bridge,startup,wsHost,tools}.test.ts`, `extension/test/debugger-errors.test.ts` (new).

---

## Part B1 — port-busy through the tools + bind retry

### Task B1.1: `Bridge` carries an "unavailable reason" (TDD)

- [x] `server/test/bridge.test.ts`: `bridge.setUnavailableReason("…9234 busy…")` → `bridge.call()` rejects
      with an error whose message contains that reason **instead of** the generic NOT_CONNECTED text;
      `setUnavailableReason(null)` restores the generic message; a live connection takes precedence (call
      succeeds even if a stale reason is set).
- [x] Implement in `server/src/bridge.ts`. Keep the generic NOT_CONNECTED for the ordinary case.

### Task B1.2: bind retry (TDD)

- [x] `server/test/startup.test.ts`: `startWsHost(host, {retryMs, onStateChange})` — on EADDRINUSE it reports
      `{ok:false}` immediately (non-blocking for stdio) **and** keeps retrying on a timer; when a later
      `listen()` resolves it calls `onStateChange({ok:true, port})`. Use `vi.useFakeTimers()` and a fake host
      whose `listen` rejects N times then resolves. Retry must stop after success; a returned `stop()` clears
      the timer (so tests and shutdown are clean).
- [x] Implement in `server/src/startup.ts` without ever throwing (keep the invariant in its doc comment).
- [x] `server/src/index.ts`: on `{ok:false}` → `bridge.setUnavailableReason("WebSocket port 9234 is busy
      (EADDRINUSE): another chrome-agent-bridge instance is running — end other Claude sessions or kill the
      stale 'node …/server/dist/index.js' process. Retrying every 5s.")`; on later success →
      `setUnavailableReason(null)` + stderr log. Default `retryMs` 5000.

### Task B1.3: `browser_status` tool (17th tool; small, high leverage)

- [x] `server/test/tools.test.ts`: `browser_status` returns text containing the WS port, whether the host is
      listening, whether an extension is connected, and — when connected — the active tab's url/title
      (via `bridge.call("listTabs")`, picking the `active` one). When not connected it must **not** call the
      bridge and must include the unavailable reason if set.
- [x] Registry: needs read access to host state → hang it on `Bridge` (`bridge.hostState = {listening, port}`)
      so the `registerTools(server, bridge)` signature stays stable.
- [x] Update the "16 tools" count in `CLAUDE.md`, `docs/setup.md`, roadmap.

## Part B2 — heartbeat + idle keepalive soak

### Task B2.1: server-side WS ping/pong (TDD against a real `ws` socket, like `wsHost.test.ts` does)

- [x] `server/test/wsHost.test.ts`: with `heartbeatMs: 50`, a client that answers pongs stays connected across
      several intervals; a client whose pong is suppressed (a raw `ws` client with `ws.pong = () => {}` or an
      `autoPong: false` option) is terminated within ~2 intervals and `bridge.isConnected()` becomes `false`.
- [x] `server/src/wsHost.ts`: per-connection `isAlive` flag; `setInterval(heartbeatMs)` → if `!isAlive`
      `ws.terminate()` else `isAlive=false; ws.ping()`; `on("pong")` → `isAlive=true`. Clear the interval on
      close and in `close()`. Default 30 000 ms; expose in `WsHostOptions`. Browser `WebSocket` answers pings
      automatically — no extension change needed.

### Task B2.2: fail fast on a dead connection

- [x] Verify that `ws.terminate()` triggers the existing `close` → `rejectAll("extension disconnected")` path
      so in-flight calls fail immediately rather than after 30 s. Add a test if `wsHost.test.ts` doesn't
      already cover it.

### Task B2.3: CONN-5 idle keepalive soak (manual, ~10 min wall clock)

- [x] Build, reload extension, `browser_snapshot` works.
- [x] Leave Chrome idle **≥ 3 min** with the fixture tab in the background (switch to another app). MV3 culls
      the service worker after ~30 s idle; the socket lives in the offscreen document so it should survive.
- [x] `browser_snapshot` again → works **without** a reconnect delay. Check the SW console: expect no
      `connection: down` between the two calls. Repeat with a **6 min** gap.
- [x] If it drops: record whether it was the offscreen doc being torn down (check `chrome.offscreen.hasDocument`
      from the SW console) or the socket idling out. The `keepalive` alarm already re-calls `connect()` every
      ~25 s; if Chrome is closing the offscreen document, try a different `chrome.offscreen.Reason` or a
      client-side ping from `ReconnectingClient`.
- [x] Record in the E2E scorecard (CONN-5).

## Part B3 — debugger-attach conflict UX (TRUST-3)

### Task B3.1: map attach errors to actionable messages (TDD, pure)

- [x] `extension/test/debugger-errors.test.ts`: `describeDebuggerError(err)` maps
      "Another debugger is already attached to the tab…" → "Chrome DevTools (or another extension) is already
      attached to this tab — close DevTools on that tab and retry"; "Cannot access a chrome:// URL" /
      "Cannot attach to this target" → the restricted-URL message; "Detached while handling command" /
      "Debugger is not attached" → "the debugging session was cancelled (banner ✕) — retry"; anything
      else → passthrough with a `[chrome.debugger]` prefix. Pure function in
      `extension/src/debugger-errors.ts` (no `chrome.*` imports, so it runs under node).
- [x] `extension/src/debugger.ts` `withDebugger`: wrap `attach` and the `fn()` body in try/catch →
      `throw new Error(describeDebuggerError(err))`. Keep the detach-in-finally.

### Task B3.2: detach awareness

- [x] `extension/src/sw.ts`: `chrome.debugger.onDetach.addListener((source, reason) =>
      console.warn("[bridge] debugger detached:", source.tabId, reason))` — purely diagnostic, so the SW
      console explains a mid-action failure when the user clicks the banner's ✕.

### Task B3.3: E2E

- [x] TRUST-3: open DevTools on the fixture tab → `browser_click {trusted:true}` → tool returns the DevTools
      message (not a raw CDP string, not a 30 s timeout). Close DevTools → retry succeeds.
- [x] New **TRUST-8**: start a trusted action and click the banner's "Cancel" during it (use
      `browser_type {trusted:true}` with a long `text` to have time) → the tool returns the "cancelled" message.

## Task B.final: docs + commits

- [x] `docs/e2e-test-plan.md`: add TRUST-8 and a **CONN-6** ("kill Chrome mid-session → next tool call fails
      within ~60 s with 'Extension not connected', not a 30 s timeout per call; relaunch Chrome → reconnects
      without restarting the server"). Fill scorecard for CONN-5/6, TRUST-3/8.
- [x] `docs/setup.md`: document `browser_status`, the port-busy message, and the DevTools conflict.
- [x] `docs/progress-and-roadmap.md`: §5 Phase B → ✅; §4 update "Keepalive edge cases" and "Single connection"
      with what was measured; §6 answer "is the offscreen keepalive sufficient?" with the soak result.
- [x] `CLAUDE.md`: bump tool count; add gotchas learned (heartbeat interval, DevTools = one debugger per tab).
- [x] Commits: `feat(server): surface port-busy through tools + retry bind`, `feat(server): browser_status
      tool`, `feat(server): WS heartbeat; fail fast on dead extension socket`, `fix(extension): actionable
      chrome.debugger attach/detach errors`, `docs: …`. Trailer per `CLAUDE.md`.

## Exit criteria

All new unit tests + typecheck green; CONN-5 soak passes (or its failure is diagnosed and fixed); TRUST-3
returns the DevTools message; a second server instance's tools report "port busy" and recover automatically
once the first exits. Phase B closed in the roadmap.
