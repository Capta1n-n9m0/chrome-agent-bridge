# CLAUDE.md

Guidance for working in this repo. Keep it accurate — update it when the architecture or the gotchas change.

## What this is

A localhost daemon + Chrome MV3 extension, with an MCP server and a TypeScript SDK as its clients, that
lets an AI agent (Claude) or a script drive the user's **real, logged-in Chrome default profile**. Chrome 136 (May 2025) blocked `--remote-debugging-port` on the default
user-data-dir, breaking CDP-against-your-real-profile; this restores it from *inside* the profile via an
extension. Mental model: "Playwright MCP, but pointed at your real logged-in Chrome."

## Current state (2026-10-22)

- **Shipped:** Steps 1–5 (21 tools, live E2E passes recorded in `docs/e2e-test-plan.md` §5);
  `browser_download`. Public on GitHub (MIT).
- **Step 6 — daemon + protocol v2: closed 2026-10-22** (built, E2E-tested in wave W1). Code D0–D5b
  (`npm test` → 542 passed, 42 files); every live row passes but MUX-5, whose snapshot sub-check
  failed on a focused DevTools window and passed on re-measurement; MUX-7 confirmed #14, so Step 7
  has no launcher prerequisite. Run 7 in `docs/e2e-test-plan.md`; as-built (§ "W1 as-built")
  `docs/plans/2026-10-21-step6-daemon-and-protocol-v2-asbuilt.md`.
- **W1 rulings** (decisions.md 2026-10-22 #34–#36): MUX-5 accepted (its latency a later item);
  NET-1 corrected to `12.6 KB` and `test-fixtures/*.html` pinned to LF; Step 7 Stage 0 makes status
  and actions agree on the active tab; Step 8 checks the daemon's inherited handles. This machine's
  MCP entry has no `env`; the token lives in `bridge.token` (decisions.md · 2026-10-22 · W1's set-up).
- **Next:** Step 7 (multi-actor tabs) from `docs/plans/next-session-prompt.md`, then Step 8 (SDK
  surface + MCP cursor). Live waves run autonomously (decisions.md · 2026-10-22 · Live E2E waves are
  run by Claude end to end).
- Update this block with the `session-closeout` skill whenever a stage/phase completes or the
  resume point moves.

## Architecture

```
Claude ⇄ (MCP/stdio) ⇄ mcp/ ──┐   both are SDK clients: sdk/ connect() finds, spawns or
scripts (tsx) ⇄ sdk/ ─────────┤   hands over the daemon, then hello {token, role:"client",
                              │   name, build, proto:2} → welcome
                              ⇅ ws://127.0.0.1:9234
daemon/ (one per machine, detached, outlives sessions; token gate; holds the one extension socket;
         answers daemon.status / daemon.shutdown / tabs.claim / tabs.release itself; its tab layer
         turns a client's `tab` handle (T<n>) into a numeric tabId, checks the tab's lease, takes the
         FIFO visibility lock for screen-needing calls, then forwards under its own ids)
                              ⇅ JSON {id,method,params:{tabId,…}} / {id,result|error{code,message,data?}}
                                + events tabCreated/tabRemoved/tabReplaced  (extension hello: proto:2)
  extension/ (loaded unpacked in the real profile):
    offscreen document  → holds the WebSocket (survives MV3 service-worker culling)
    service worker      → routes methods to handlers; uses chrome.tabs/scripting/debugger
    content script      → window.__agentBridge: RefMap + snapshot + DOM actions (ISOLATED world)
```

Flow: tool → `BridgeLink.call` → `BridgeClient.call(method, params, {timeoutMs})` → WS → daemon
(`route.ts`) → extension socket → `router.on(method, …)` → handler → `chrome.*` / `callInPage`. Default actions use synthetic content-script events (no banner);
`browser_click {trusted:true}` (or a content-action failure) escalates to real CDP `Input` via
`chrome.debugger` (shows the "extension is debugging this browser" banner). Clients name tabs by
daemon-minted **handles** (`T3`), never Chrome ids; one client holds a tab at a time (a **lease**:
opened, claimed, or a popup of a held tab), and a call on another client's tab fails fast with
`TAB_HELD`. The daemon forwards every tab method with a numeric `tabId` and never a `tab` key, and
each handler acts on `targetTab(p)`, in the background. Only a default-mode viewport screenshot and
`focusTab`/`selectTab` need the screen; they run under the daemon's one FIFO **visibility lock**. A
call with no `tab` from a Step 6 client (the legacy path, until Step 8) acts on the human's tab,
lease-checked; the MCP instead keeps a **cursor**: its first untargeted tool claims the human's
tab and keeps it (`mcp/src/cursor.ts`). *Superseded 2026-10-23: was "every call acts on the active tab, and
the tab tools switch it", because Step 7 gave every method a `tabId` and the clients handles.* Network capture is separate and always on: six top-level
`chrome.webRequest` observers feed a bounded per-tab `NetworkLog` (no banner, no debugger), which
`browser_network_requests` / `browser_network_clear` query.

### Key files
- `shared/src/`: `protocol.ts` (wire message types + guards: v1/v2 hello, welcome, events; Step 7's
  `SnapshotResult`/`SnapshotElement`, `ScreenshotMode`, the tab and lease event params),
  `codes.ts` (the 22 error codes of spec §10), `error.ts` (`BridgeError`, `toWire`/`fromWire`).
- `daemon/src/`: `index.ts` (entry → `daemon/dist/index.js`), `main.ts` (`runDaemon`: env, token,
  bind-is-the-lock, idle, signals, exit codes), `wsHost.ts` (binds 127.0.0.1, token gate, roles,
  welcome, heartbeat, `shutdown(code)`), `handshake.ts`, `registry.ts` (clients), `route.ts`
  (`daemon.*` methods, timeout bounds, forwarding), `bridge.ts` + `connection.ts` (the extension
  socket, id-correlated calls), `build.ts` (sha256 build id), `idle.ts`, `log.ts` (file log + `redact`).
  Step 7's tab layer, all pure but the last: `handles.ts` (`HandleTable`: `T<n>` ↔ Chrome tab id,
  remap on `tabReplaced`, dead handles kept 1 h / 1 000 for `TAB_GONE`), `leases.ts` (`LeaseTable`:
  one owner per tab, `TAB_HELD {owner, since}`), `lock.ts` (`VisibilityLock`: FIFO, `LOCK_TIMEOUT
  {holder}`, released on completion, deadline or disconnect), `methods.ts` (the one method-class
  table — a new extension method must enter it), `intercept.ts` (`TabLayer`: resolve, lease check,
  lock, forward with `tabId`; events → handles; the opener rule and `leaseGranted`; the legacy path).
- `sdk/src/`: `index.ts` (public surface: `connect`, `BridgeClient`, `BridgeError`, `ErrorCodes`,
  `downloadToFile`), `connect.ts`, `knock.ts` (knock/spawn/handover state machine), `client.ts`
  (`BridgeClient`: calls, events, 4002 reconnect), `transport.ts` (the `ws` socket), `spawn.ts`,
  `paths.ts` (daemon path, `BRIDGE_DAEMON`), `token.ts` (`resolveToken`, also used by the daemon),
  `download.ts` (`browser_download`'s client half: target path, chunked pull, atomic write, sha256),
  `format/{snapshot,network}.ts` (the pure text formatters, moved from the extension in Step 7 T4,
  byte-identical to the baseline `sdk/test/fixtures/baseline-51de800.json`), exported as the
  `@bridge/sdk/format` subpath (`sdk/package.json` `exports["./format"]`), not from `index.ts`.
- `mcp/src/`: `index.ts` (entry → `mcp/dist/index.js`), `link.ts` (`BridgeLink`: the no-crash rule
  and the 5 s retry), `config.ts` (actor name, `connectOptions()`), `lifecycle.ts` (exit with the
  session), `cursor.ts` (`TabCursor`: claimed on first untargeted touch, moved only by
  `browser_select_tab`/`browser_new_tab`, lost with a one-line notice on a 4002 reconnect or a new
  client), `tools/registry.ts` (the 22 MCP tools; `browser_focus_tab` is Step 7's).
- `recipes/`: `hello.ts` (SDK smoke script), `reload-extension.ps1` (reloads the Chrome Agent Bridge
  card by UI Automation and verifies it; exit 2 = pressed nothing), `t5*.ts`/`t5-win.ps1` (the Step 7
  E2E driver helpers), `bgf-*.ps1` (Chrome quit/relaunch/count, BG-FLAGS only).
- `extension/src/`: `sw.ts` (router + offscreen orchestration; the top-level `chrome.tabs.on*`
  listeners), `router.ts` (thrown error → `{code, message, data?}`), `offscreen.ts` (the socket),
  `tabs.ts` (`targetTab`, `humansTab`, `activateForCapture` + restore, `cdpCaptureRefusal`),
  `errors.ts` (`BridgeError`, `toWireError`, `splitCoded`), `tab-events.ts` (pure: tab events +
  the last-url/title cache), `network-scope.ts` (pure: which tab a network call covers),
  `inject.ts` (`ensureContent`/`callInPage` + `toSerializableArgs`/`unwrapResult`), `handlers/*`,
  `content/{index,snapshot,refmap,actions,geometry,guard}.ts`, `debugger.ts`, `debugger-errors.ts`
  (pure: CDP failure → `{code, message}`), `keys.ts` (pure: key name → CDP key params),
  `evaluate/{serialize,wrap,result}.ts` (pure: in-page serialiser source, `return`-wrapper,
  CDP-result → `EvalEnvelope`), `network-log.ts` (pure: `NetworkLog` reducer + query (its text formatter moved to `sdk/src/format`),
  redaction, body summary, serialise/merge), `network-state.ts` (the singleton log, the
  `storage.session` rehydrate/flush, the own-port variable), `handlers/network.ts`,
  `download.ts` (pure: `DownloadStore`, base64, filename from `content-disposition`) +
  `handlers/download.ts` (the service-worker fetch); the other half is `sdk/src/download.ts`.

## Commands

```bash
npm install
npm run build        # daemon/dist/index.js + mcp/dist/index.js + extension/dist/{sw,options,offscreen,content}.js
npm test             # vitest — 950 passed, 59 files (`npm test` 2026-10-23 on 6c5c603 + Step 7 T6's tree; 965 before T6 removed 15 dead formatter tests)
npm run typecheck    # tsc across shared/daemon/sdk/mcp/extension
```
Load the extension: `chrome://extensions` → Developer mode → Load unpacked → `extension/`, then set the
token + port `9234` in its Options. The MCP config points at `<repo>/mcp/dist/index.js`; nobody starts
the daemon by hand (the first client spawns it). The token comes from `BRIDGE_TOKEN`, else `bridge.token`
at the repo root (gitignored). Full setup + the 22 tools: `docs/setup.md`. After `npm run build`, reload
the extension (on Windows `recipes/reload-extension.ps1` does it by UI Automation; `docs/setup.md` §4).
E2E: serve `test-fixtures/e2e-playground.html` (`python -m http.server 8080 --directory test-fixtures`)
and follow `docs/e2e-test-plan.md`.

## Runtime gotchas (learned the hard way — read before touching the extension)

- **`chrome.scripting.executeScript` can't serialize `undefined` in `args`** → "Value is unserializable".
  Optional handler params arrive undefined. `callInPage` runs args through `toSerializableArgs`
  (undefined→null). Don't pass raw optional values into executeScript args.
- **A thrown injected function does NOT reject `executeScript`** — Chrome resolves the frame with
  `result: null`. `unwrapResult` treats null OR undefined as failure (no page fn returns those on
  success). Without it, bad/stale refs *silently succeed*. Keep that invariant if you add page fns.
- **The content script is built as an IIFE** (separate esbuild call in `extension/build.mjs`), because
  it's injected as a *classic* script via `executeScript({files})` — it must contain no `import`/`export`.
  `sw`/`options`/`offscreen` are ESM.
- **MCP SDK (`@modelcontextprotocol/sdk` v1.29) stores a tool's handler at `_registeredTools[name].handler`**
  (not `.callback`). Tool tests rely on this.
- **The daemon's bind is the lock; the MCP never crashes when there is no daemon.** *Superseded
  2026-10-22: was "the server must not crash on a busy WS port — `startWsHost` never throws, the bind
  is retried every 5 s", with a rule that a single Claude session drives the bridge, because in Step 6
  (D3/D5) the MCP no longer binds a port.* The daemon calls `listen()` once on `127.0.0.1`; `EADDRINUSE` means another daemon
  won, so it logs `port <p> in use — another daemon owns it` and exits **0**, never retrying
  (`daemon/src/main.ts`; spec §9.3; decisions.md · 2026-10-22 · D3's daemon lifecycle). Don't add a
  retry or a non-zero exit there. The MCP keeps the no-crash rule in `mcp/src/link.ts`: the 22 tools
  are registered with no daemon, a failed `connect()` stores its message (every tool error and
  `browser_status`'s `Problem:` line show it), and the next `connect()` runs 5 s after each attempt
  settles, never overlapping — also after an established connection closes with a code other than
  4002. Several Claude sessions and scripts can now share the one daemon as separate clients.
- **The MCP must exit with its session; the daemon must not** (`mcp/src/lifecycle.ts`, moved unchanged
  from the pre-Step-6 server in D1/D5). Before this, an ended session left an orphan holding 9234. It
  exits on stdin `end`/`close`, a stdout error, SIGINT/SIGTERM/SIGHUP/SIGBREAK, or a vanished parent:
  on Windows a dead parent stays as `ppid`, so it checks `kill(pid, 0)`; on POSIX the process is
  re-parented, so it checks whether `ppid` changed. The parent check matters when a launcher sits in
  between (the nvm-windows `node.exe` shim spawns the real node). Verified on Windows 2026-10-21,
  including force-killing the shim alone; **not yet verified on Linux**. On exit the MCP only closes
  its client (`link.stop()`); the daemon gets none of this lifecycle.
- **The daemon outlives the session on purpose** — the SDK spawns it detached with no stdio
  (`sdk/src/spawn.ts`). Once listening it exits only on idle (`BRIDGE_DAEMON_IDLE_MS`, default
  600000 ms with zero clients; the extension does not count), `daemon.shutdown`, a signal, or a fatal
  error; at start it also exits 1 on a bad `BRIDGE_PORT`, no token, no build id or a failed `listen`,
  and 0 when the port is taken (`daemon/src/main.ts`). Its only voice is
  `~/.chrome-agent-bridge/daemon.log` (`YYYY-MM-DDTHH:MM:SSZ <msg>`, cut to its last 1 MiB on start; a
  line containing `://` or the token is withheld whole) (`daemon/src/log.ts`, D3 2026-10-22). Its build
  id is the sha256 of `daemon/dist/index.js`; `daemon.status` and `browser_status` print it. After
  `npm run build` changes that file, the next client's `connect()` sees a different build in the
  welcome, sends `daemon.shutdown` (other clients get close 4002 and reconnect without a handover — a build mismatch on that reconnect
  rejects with `VERSION`; decisions.md · 2026-10-22 · A reconnect after 4002 never hands the daemon over) and spawns the new one —
  once per `connect()`, then `VERSION`; the 10 s knock budget runs per spawn cycle (`sdk/src/knock.ts`, D4 2026-10-22). Its pre-D3 `console.error`
  lines in `wsHost.ts` (routing failure, socket error, heartbeat drop) go nowhere, since there is no stdio (open NIT, D3/D5).
- **On Windows `spawn(…, {detached: true})` keeps the child in the parent's process tree** — Windows
  keeps `ParentProcessId`, so `taskkill /T` on a *live* parent kills the "detached" daemon too; a child
  whose spawner had already exited survived the same tree kill (measured with test processes, Stage 0
  audit F3, 2026-10-22). Whether Claude Code ends MCP servers that way is not established; the D6 wave
  (MUX-7) measures it (decisions.md · 2026-10-22 · The detached daemon's survival depends on how the
  session's MCP is killed).
- **A pre-Step-6 server on 9234 takes a v2 hello as the extension.** The old host accepts any hello
  with the right token as the extension, so a Step 6 client replaces the real extension's slot, gets
  no welcome, and leaves that old session broken (measured on port 0, Stage 0 audit F1, 2026-10-22).
  The SDK waits 2 s for the welcome, then gives up with `VERSION` and never spawns or hands over
  (`WELCOME_TIMEOUT_MS`, `sdk/src/knock.ts`). End every pre-Step-6 session before starting a Step 6 one.
- **Every client must agree on `BRIDGE_PORT`.** A client spawns its daemon on its own port, so an MCP
  on 9235 and a script on 9234 start two daemons and the extension (one port in its Options) reaches
  only one; the other client waits and blames Chrome (Stage 0 audit F24, by reading the code, 2026-10-22).
  `BRIDGE_DAEMON` (a dev override of the daemon path) must be a native Windows path on Windows: Node
  resolves `/c/Users/…` to `C:\c\Users\…` (F24); `paths.ts` names that in its error.
- **"The human's tab" has one resolver: `humansTab()` = `windows.getLastFocused({windowTypes:["normal"]})`
  → its active tab** (`extension/src/tabs.ts`; decisions.md · 2026-10-22 · "The human's tab" is the active
  tab of the last-focused normal window (#43)). It serves the `targetTab` fallback, `listTabs`' `current:
  true`, `tabs.claim {active:true}`, the daemon's legacy path, `browser_status` and `browser_list_tabs`'s
  `*`. `listTabs`' `active` keeps Chrome's per-window meaning (every window's active tab), so never pick
  "the first `active`" again. Measured with the service-worker DevTools window in front: status and
  snapshot named and acted on the same tab (Run 9 R9-RESOLVER-1, 2026-10-23). With no normal window
  at all, calls fail with `No normal Chrome window is focused (a DevTools or popup window may have
  focus) …`. *Superseded 2026-10-23: was "`browser_status`'s active tab is not always the tab actions
  use" — `listTabs` read as the first active tab of any window (strictly: it marked every window's
  active tab and readers took the first, Stage 0 F31) while actions used `lastFocusedWindow:true`, which
  failed under a focused DevTools window (W1 MUX-5, 2026-10-22) — because Step 7 T1 put every reader on
  one resolver.*
- **A daemon spawned through `Start-Process -NoNewWindow` held the caller's output pipe open** — a
  PowerShell call that ran recipes that way returned only when that daemon was stopped (W1 MUX-6,
  2026-10-22, by correlation); a plain foreground `npx tsx recipes/hello.ts` returned at once. Run
  wave blocks with their output to a file, or stop the daemon after.
- **Windows PowerShell 5.1 mangles `—`** (U+2014): it decodes program output with the console code
  page and writes `Add-Content`/`Set-Content` in ANSI, so `—` becomes `â€"` (D6 fixer; again in W1,
  2026-10-22). Set `[Console]::OutputEncoding = [Text.Encoding]::UTF8`, read with `-Encoding UTF8`, and
  write UTF-8 text with Node or `[IO.File]::WriteAllText`.
- **`ws` emits several frames from one TCP read synchronously**, before any promise continuation
  runs. A one-shot listener that settles a promise and unsubscribes later swallows the frames behind
  the one it waited for: the knock lost an `extensionStatus` sent in the same read as the `welcome`, so
  `connect()` waited 15 s and blamed Chrome (D4 verifier, measured, 2026-10-22). Unsubscribe inside the
  listener's own callback.
- **The daemon pings the extension socket every 30 s and terminates it on a missed pong** — browsers
  answer pings automatically, so a missed pong means Chrome (or the offscreen document) is gone. Without
  this the `Bridge` keeps a stale connection and every call waits the full 30 s timeout. Tests use
  `heartbeatMs: 30` and a `ws` client with `autoPong: false` to simulate a dead Chrome. (Pre-Step-6 this
  ran in the MCP's server; it moved with `wsHost.ts` to `daemon/src`, D1 2026-10-22.)
- **Chrome allows one debugger per tab**: with DevTools open, `chrome.debugger.attach` throws "Another
  debugger is already attached…"; clicking the banner's Cancel mid-action makes `sendCommand` throw
  "Detached while handling command". `withDebugger` maps both through `describeDebuggerError` — add new
  Chrome strings there, not in handlers.
- **`ws` is `external` in the daemon and MCP esbuild bundles** (it's CJS; `daemon/build.mjs`,
  `mcp/build.mjs`) — it resolves from `node_modules` at runtime, so both run from the repo.
- **`@types/chrome` quirks**: use `chrome.tabs.OnUpdatedInfo` (not `TabChangeInfo`);
  `InjectionResult<any>` (its `Awaited<T>` conflicts with TS's); `sendCommand` params want
  `{[k:string]:unknown}` (not `object`).
- **Editing extension code requires a manual reload**: `npm run build` then `chrome://extensions` →
  reload ↻. The service worker won't pick up `dist/` changes otherwise — **not even after a full Chrome
  restart** (seen 2026-10-06: a restarted Chrome still ran the old worker and answered the new
  server's `downloadStart` with `unknown method`). An `unknown method: X` error means exactly this; a
  pre-Step-7 extension (its hello has no `proto`) gets every tab call refused by the daemon with
  `VERSION` and a reload hint (decisions.md · 2026-10-22 · A stale extension is refused for tab calls,
  detected by its hello). MCP
  changes need an MCP reconnect (`/mcp`) or a fresh session; daemon changes take effect when the next
  client connects after `npm run build` (the build-id handover above) — a `/mcp` reconnect is one.
- **Snapshots list only interactive elements** (native controls, links, and an explicit-ARIA-role
  allowlist — button/tab/menuitem/switch/option/slider/…), each with a ref; non-interactive text
  (e.g. a status `<div>`) won't appear — verify those via screenshot. The walk descends into **open**
  shadow roots and **same-origin** frames, and prunes `aria-hidden`/`inert`/`hidden`/`display:none`
  subtrees. Output is capped at 800 elements.
- **The zero-size snapshot filter is gated on `hasLayout(doc)`** — jsdom reports every rect as 0x0,
  so an ungated filter would empty the snapshot in every unit test. Keep the gate if you touch
  `snapshot.ts`; tests that want the filter stub `documentElement.getBoundingClientRect`.
- **A character's ASCII code is its virtual key code only for `A-Z`, `0-9` and space.** In
  `keys.ts`, sending punctuation with `windowsVirtualKeyCode = charCodeAt(0)` makes Chrome act on the
  wrong key and *drop the character*: `"."` is 46, i.e. `VK_DELETE`, so trusted-typing `x@y.com`
  produced `x@ycom`. Punctuation uses OEM virtual keys — send `text` alone for it.
- **CDP `Input.*` coordinates need no scaling — but the point must be on screen.** `x`/`y` are CSS
  pixels of the layout viewport (what `getBoundingClientRect` gives). Measured at zoom 1.0/1.5 and
  DPR 1/1.25/1.5: `clientX,clientY` always came back identical to what was sent, so do **not** multiply
  by `chrome.tabs.getZoom()` or `devicePixelRatio`. What does bite: CDP never clamps, so a point past
  the viewport edge hit-tests the root element and the click **silently does nothing**. Page zoom
  shrinks the visual viewport in CSS px (150 % turns 1920x940 into 1280x630), which is how an element
  that fit at 100 % ends up off-screen. `centerForInput` scrolls first and throws if it still can't
  reach — keep that if you add a trusted hover/drag.
- **CDP `Runtime.evaluate.timeout` does not fire while the script is `await`ing** — an idle promise
  isn't "executing", so it only bounds *synchronous* code. `evaluateInPage` races the CDP call
  against its own timer (`raceTimeout`) and swallows the loser's rejection; detaching does **not**
  stop page-side work already in flight.
- **`returnByValue: true` flattens nodes, `Map`s and class instances to `{}`.** The value comes back
  by `objectId` and is described by `Runtime.callFunctionOn` with `SERIALIZER_SRC` (`evaluate/serialize.ts`)
  as `this` — a self-contained function shipped as `String(fn)`, so the jsdom unit tests test exactly
  what ships. Keep it closure-free.
- **`replMode` + `awaitPromise` unwrap only *one* promise level**, and `replMode` spends that level on
  Chrome's own async script wrapper. A promise-valued completion value (`fetch(…)`, `p.then(…)`, the
  `(async () => …)()` form `wrapExpression` emits) therefore arrives as `Promise {}` and needs a second
  `Runtime.awaitPromise` — see `pendingPromiseId` in `extension/src/evaluate/result.ts`.
- **The call timeout is per-call** — `client.call(method, params, { timeoutMs })`. The daemon bounds
  it to `[100, 600000]` and waits 5 s longer; the client waits 1 s more than the daemon (`route.ts`,
  `sdk/src/client.ts`). The default is still 30 s, so anything that may run longer (`browser_evaluate`,
  `browser_download`) must pass `timeoutMs`, or the daemon reports a timeout while the extension is
  still working. Since Step 7 one deadline covers both the visibility-lock wait (`LOCK_TIMEOUT`) and
  the forwarded call (decisions.md · 2026-10-22 · One deadline per call covers the lock wait and the
  forwarded call).
- **`describeDebuggerError(err, what)` / `withDebugger(tabId, fn, what)` take a caller name** —
  it's interpolated into the restricted-URL and timeout messages ("Trusted input" by default,
  `"browser_evaluate"`, `"Full-page screenshot"`). Add new Chrome strings there, not in handlers.
- **A module service worker must not use top-level `await`** — Chrome fails the worker with
  `TypeError: Top-level await is disallowed in service workers`, since the script must finish
  evaluating synchronously for its listeners to be known. The network log therefore ingests into
  memory from the first event and `network-state.ts` keeps a `ready` promise that `merge`s the
  rehydrated `storage.session` blob *underneath* the live entries (live wins); handlers `await ready`.
- **`chrome.webRequest` listeners must be registered at the top level of `sw.ts`**, synchronously —
  they have to exist on every worker start or the events that woke it are lost. The same holds for the
  `chrome.tabs.on{Created,Updated,Removed,Replaced}` listeners that feed Step 7's tab events (column 1 in
  `sw.ts`).
- **Cache hits skip `onHeadersReceived`** — `onCompleted` carries `statusCode`/`statusLine`/
  `responseHeaders`/`fromCache`, so the reducer fills status from `onCompleted` too. Same for an
  event whose `requestId` it has never seen (worker restarted mid-request): build the entry from the
  fields every event carries rather than dropping it.
- **`extraHeaders` is omitted from every `extraInfoSpec` on purpose** — without it Chrome never hands
  the extension `Cookie`/`Set-Cookie`, so cookies cannot enter the log at all (stronger than
  redacting). The price, verified live, is that `referer` and `origin` are missing too. Don't add it.
- **`storage.session` is emptied by an extension reload and by Chrome exiting**, and has a 10 MB
  quota — the flush is debounced, writes only `takeDirty()` tabs, and on a rejected `set` calls
  `evictOldest(0.5)` and retries once (writing the union of both dirty sets). The 25 s keepalive
  alarm means the worker rarely idles out, so the write-through is really insurance against a forced
  stop or a crash.
- **Never log a URL from the service worker** — URLs carry tokens. The network code prints counts
  only (`[bridge] network: rehydrated N entries`). Same rule for header values and bodies.
- **`centerOf` is top-document relative** — it adds each ancestor `frameElement`'s rect, because
  CDP `Input.*` dispatches against the top-level viewport. Don't hand it a raw
  `getBoundingClientRect` from inside a frame.

- **`browser_download` fetches from the service worker, not the page.** The `<all_urls>` host
  permission exempts the extension's `fetch` from CORS, so a cross-origin redirect (Blackboard →
  signed S3) is followed — the page cannot do that. The bytes are held in a `DownloadStore`
  (TTL 5 min, 8 entries) and pulled by the SDK's `downloadToFile` in 1 MB `downloadChunk` calls (base64) so no single
  runtime message or WS frame grows with the file. The final URL is never returned or logged (it is
  usually signed) — only its host.

**Step 7 — tabs, leases, the lock (2026-10-22/23; reports in `docs/plans/2026-10-21-step7-multi-actor-tabs-steps/`)**

- **Every handler takes `tabId`; nothing in `extension/src/handlers` calls `activeTab()`** (T1.2 grep,
  T1 report). `targetTab(p, method)`: integer → `chrome.tabs.get`, "No tab with id" → `TAB_UNKNOWN`,
  non-integer → `BAD_PARAMS`, a string `tab` (a handle an old daemon forwarded) → `BAD_PARAMS`, absent →
  the human's tab with one `console.warn` per method naming only the method. Step 8 removes the
  fallback; don't remove it early, and don't make the daemon omit `tabId`.
- **Clients see handles (`T3`), never Chrome ids.** Only the daemon maps them (`daemon/src/handles.ts`);
  a daemon restart renumbers, so the MCP cursor is lost and re-claimed with a one-line notice (T4).
  `newTab`/`listTabs` results still carry the Chrome `id` beside `tab` for one release (Step 6 clients).
- **`newTab` opens in the background unless `active: true` is passed** (`handlers/tabs.ts`; T3.4); the
  MCP's `browser_new_tab` passes `active: true` explicitly. Don't change the extension's default back.
- **Only `captureVisibleTab` needs the tab on screen** — the default (`switch`) viewport screenshot,
  the one call the daemon locks besides `focusTab`/`selectTab` (`daemon/src/methods.ts`). Everything
  else runs on a background tab by design; measured there: `waitFor {text}` and `networkIdle` work
  (Run 8 BG-4: text after 3746 ms, idle after 552 ms, the tab hidden throughout).
  Trusted input does not (next bullet); `fullPage` (CDP) on a hidden or minimized tab is unmeasured
  (T5b F9).
- **Trusted CDP input into a background tab answers `ok` and does nothing.** `browser_click`/`type
  {trusted:true}` on a hidden tab returned in 5–10 ms with nothing received by the page; after
  `focusTab` the same call worked (Run 8 BG-1/BG-2). Chrome's `--disable-renderer-backgrounding
  --disable-backgrounding-occluded-windows --disable-background-timer-throttling` do not change it (ok
  in 12–15 ms, nothing received; Run 10 BGF-1/BGF-2, one trial each; decisions.md · 2026-10-23 ·
  Chrome's anti-throttling flags do not fix background input). Focus emulation is unmeasured (no
  method sends `Emulation.setFocusEmulationEnabled`); Step 8's `sdk/src/policy.ts` decides. A clipboard
  write in `evaluate` likewise needs `focusTab` (BG-3: `NotAllowedError … Document is not focused`).
- **The switch sequence, and why it never focuses the window** (`tabs.ts: activateForCapture`, plan
  0.5): minimized → `WINDOW_MINIMIZED` before switching; reserve a capture slot (Chrome allows 2
  `captureVisibleTab` calls/s; 500 ms spacing, one quota retry); activate the target; wait for
  `onActivated` (≤ 1000 ms) + 50 ms; capture; restore the previous tab — only if the window still
  shows the target and no `focusTab` touched it. `captureVisibleTab` needs the window visible, not
  focused: a target in an unfocused second window captured with the foreground window unchanged (Run
  9 R9-SCREEN-5). `focusTab` (and its alias `selectTab`) is the only call that runs
  `windows.update({focused:true})` (T3.3 grep). Never add focus to the capture, and never lower the
  1000 ms or 50 ms waits without a measurement.
- **The switch flash is ~1.5 s, not a frame.** Measured page-side from `visibilitychange` timestamps on
  the human's tab: hidden +5–6 ms after the call, visible again after 1509/1486/1493 ms (Run 8
  SCREEN-1, median 1493 ms) and 1588/1557/1556 ms (Run 9 R9-SCREEN-1, median 1557 ms). That is about
  the 1000 ms wait running to its limit + 50 ms + the capture, which suggests `onActivated` does not
  end the wait (unconfirmed; Run 8 finding 3). Three concurrent captures serialised with no quota error
  (Run 8 SCREEN-3, Run 9 R9-SCREEN-3).
- **A capture of a tab in a fully covered (occluded) window hangs.** `captureVisibleTab` did not return
  and the call ended in `TIMEOUT` after 35 s (Run 8 SCREEN-5 first attempt); before T5b the target tab
  then stayed in front ≥ 49 s. Since T5b the chain bound restores the previous tab at 30 s: measured
  `TIMEOUT` at 35 119 ms, previous tab active again at +30 026 ms (Run 9 R9-RESTORE). A late restore
  can still spoil the next capture or undo a `focusTab` that lands in its last check (T5b verifier N1,
  residual race).
- **`screenshot {mode:"cdp"}` hung on a hidden or minimized tab, so it now refuses.** Run 8: a
  background tab → `TIMEOUT` after 35 s with the banner up, and the next `evaluate` on another tab got
  a transient `DEBUGGER_DEVTOOLS` (SCREEN-2); a minimized window → `TIMEOUT` after 25 s (SCREEN-4).
  Since T5b, `cdpCaptureRefusal` answers before attaching: `OFFSCREEN` for a tab not active in its
  window, `WINDOW_MINIMIZED` for a minimized window, both in 3 ms with no banner (Run 9 R9-SCREEN-2,
  R9-SCREEN-4; decisions.md · 2026-10-23 · T5b's three fixes). `cdp` mode is useful only for a tab
  already in front of a visible window.
- **A Memory-Saver discard changes the tab id; `tabReplaced` keeps the handle.** On Chrome 156 an
  Urgent Discard from `chrome://discards` gave the tab a new id (1108126391 → 1108126396) and the
  handle followed through `tabReplaced` (Run 8 LEASE-6 (b); Stage 0 F7 had expected the id to stay).
  While discarded, a page call returns `INTERNAL: The tab was discarded by Chrome's Memory Saver …`
  (`assertNotDiscarded`); `focusTab` reloads it.
- **Content-script failures travel as a returned `{__bridgeError: "CODE:message"}`**, not a throw
  (`content/guard.ts`; decisions.md · 2026-10-22 · Content-script failures are returned, not thrown, to
  carry `CODE:message`): a thrown page function reaches `executeScript` as `result: null` (gotcha
  above), so a prefixed thrown message would never arrive (Stage 0 F1). `unwrapResult` splits the
  marker into a `BridgeError` and still treats null/undefined as `REF_STALE`. Page functions throw
  `codedError(code, msg)`; `guard` wraps every public `window.__agentBridge` method.
- **The text formatters live in `sdk/src/format/`** (`@bridge/sdk/format`), not in the extension: the
  extension returns `SnapshotResult {url, title, elements, truncated}` and network entries, and the MCP
  renders them. The output is pinned byte-identical by `sdk/test/format-baseline.test.ts` against
  `sdk/test/fixtures/baseline-51de800.json`, captured once from the pre-T3 code (T4.2). Never
  regenerate that fixture from the new formatter.
- **`leaseGranted.url` starts empty for a popup** — `tabs.onCreated` fires before a `target=_blank`
  tab's url is set (Run 8 LEASE-3: `""`). The daemon polls `listTabs` (100 ms, ≤ 2 s) before sending
  the event; Run 9 R9-LEASE-3 got the url after 45 ms, and another client was refused (`TAB_HELD`) 44
  ms after the click, before the event (the grant is immediate).
- **The SDK's knock hashes `daemon/dist/index.js` on disk at every knock** (`sdk/src/knock.ts:162`,
  `io.hashDaemon`, defined in `sdk/src/spawn.ts:44`), not a build baked into the client, so a client
  started from an older bundle adopts whatever daemon was built last (Stage 0 F5, found by reading
  the code; the Stage 0 verifier re-read it and ran only a same-build 4002 reconnect, so no old-bundle
  client has been run against a newer daemon). That is why a Step 7 daemon keeps
  a legacy path for Step 6 clients (decisions.md · 2026-10-22 · A Step 6 client keeps working
  against a Step 7 daemon for one release, without loosening a lease).
- **A hard reload re-fetches `favicon.ico`, and a plain fixture URL can come from Chrome's cache.** Run 8
  NET-1 served W1's 12 914-byte copy from the HTTP cache (`from cache: yes`, the server never hit) and
  printed `12.6 KB` for a 13 106-byte file; Run 9's Ctrl+Shift+R got `12.8 KB`, `from cache: no`, but
  the tab also logged a `404 image favicon.ico`, so `showing 1 of 1` became `2 of 2` (R9-NET-1). Write
  network rows with a fresh query string and a `types` filter.
- **Captures are colour-managed**: a `#ff00ff` bar drawn by the E2E driver (`recipes/t5-lib.ts:148-149`)
  read `#dd00fa` and its cyan `#00ffff` bar `#97fdfd` in a capture
  (Run 8 SCREEN rows, Run 9 R9-SCREEN-2), so pixel checks need a hue rule with slack,
  probed off any label text.

**Driving Chrome from the outside (live waves, Windows)**

- **`chrome.exe --new-window chrome://…` opens a New Tab page, not the page** (Run 8 set-up fix 4;
  RELOAD-AUTO F1). Type the URL into the omnibox of a window the driver opened instead.
- **The extension reload is scripted: `recipes/reload-extension.ps1`** (decisions.md · 2026-10-23 ·
  Later extension reloads use `recipes/reload-extension.ps1`). On `chrome://extensions` Chrome 156's
  UIA tree flattens each card into siblings; the card's reload is AutomationId `dev-reload-button`,
  and the toolbar's Reload is also named "Reload" (AutomationId `view_1003`), so never match by name.
  An unpacked extension's id is sha256(absolute path as UTF-16LE), first 16 bytes as letters a–p.
  Proof of a reload: a new `extension resync` line in `daemon.log` in the same second (5 of 5).
  (RELOAD-AUTO F1–F6.)
- **UIA `TabItem` is not a tab count**: a page element with `role="tab"` is a `TabItem` too (empty
  ClassName); the tab strip's tabs have ClassName `Tab` (BG-FLAGS finding 3).
- **The driver's shell runs inside a job object** (limit flags `0x800`, breakaway allowed), and a
  process started with plain `Start-Process` inherits the job and the session's environment
  (BG-FLAGS finding 5). Anything that must outlive the driver (Chrome, a daemon) needs breakaway and
  a clean environment — `recipes/bgf-launch.ps1` does both.

## Testing philosophy

Logic units (protocol, WS correlation, bridge, handshake, the daemon's registry/routing/lifecycle/log,
the SDK's knock/client/connect over injected I/O and clocks, the MCP link, RefMap, snapshot, actions,
geometry, tools, inject helpers, the `NetworkLog` reducer/query, the daemon's handles/leases/lock/
tab layer, the extension's error mapping and tab events, the MCP cursor, the SDK formatters) are
**TDD with real assertions**; `mcp/test/multi-actor.test.ts` runs a real daemon + SDK + MCP against a
fake proto:2 extension on port 0.
Socket tests bind port 0, never 9234. The `chrome.*` glue (service worker,
chrome-API handlers) is **not unit-tested** — mocking the extension runtime is low-value; it's covered
by `docs/e2e-test-plan.md` against real Chrome. New pure logic → write a failing test first.

## Conventions

- Commits end with the `Co-Authored-By: Claude …` trailer for the model that wrote them (plus the
  `Claude-Session:` line the session supplies).
- Don't commit the token (`bridge.token`, `.env` are gitignored). The localhost bind + token are the
  only security boundary — treat the token as a password; never log it.

## Skills & workflow (project skills in `.claude/skills/`, ported 2026-10-21 from the research repos)

- `long-run` — session-agent contract for an autonomous multi-stage run: context discipline,
  the agent tree (session agent → step agent → builder/verifier/fixer + propagator), decisions
  while the user is away, the exhaustive stop list, waiting/revival rules.
- `step-agent` — STEP BRIEF template, ledger, step-report schema, ESCALATION list, and the
  builder/verifier/fixer/propagator role prompts (`role-prompts.md`).
- `phase-kickoff` — writes `docs/plans/next-session-prompt.md` (phase kind) or an entry in
  `docs/plans/handoffs.md` (wave kind); as-built format in `asbuilt.md`.
- `session-closeout` — end of significant work: doc entry, `docs/decisions.md`,
  `docs/progress-and-roadmap.md`, the Current state block above, a new gotcha if one was learned,
  memory, commit.
- Writing rules for every doc: `docs/docs-writing-guide.md`. Decisions are dated plain-language
  entries in `docs/decisions.md`, cited by date + title.

## Docs
`docs/specs/…-design.md` (design of record), `docs/plans/…` (phase docs; beside each, `…-asbuilt.md`
and `…-steps/` once a phase runs), `docs/decisions.md` (decision log), `docs/docs-writing-guide.md`
(how we write), `docs/setup.md` (install/usage), `docs/e2e-test-plan.md` (manual suite + fixture),
`docs/progress-and-roadmap.md` (status + roadmap).

**Step 6 built (2026-10-22); Steps 7–8 decided.** The persistent shared **daemon**, the TypeScript
**SDK** and the MCP as an SDK client exist (`docs/plans/2026-10-21-step6-daemon-and-protocol-v2.md`,
as-built in `…-asbuilt.md`). **Step 7 built and E2E-run (2026-10-22/23, Runs 8–10):** actors on
different tabs in parallel — handles, leases, the visibility lock, tab events, error codes, data
results with the formatters in the SDK, `browser_focus_tab`, the MCP cursor
(`docs/plans/2026-10-21-step7-multi-actor-tabs.md`, as-built `…-asbuilt.md`); its gate waits for the
user's rulings. Next: Step 8 (SDK surface, cursor tools, the background-input policy) —
`docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md`, plan `docs/plans/2026-10-21-step8…`.
*Superseded 2026-10-23: was "its live E2E waits for the D6 wave … they all drive the one active tab:
actors on different tabs in parallel is Step 7", because W1 ran and Step 7 was built.*
