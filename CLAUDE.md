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
- **Step 6 — daemon + protocol v2: code complete, E2E pending.** Stages D0–D5b, the D6 rows and the
  D7 docs are done (`npm test` → 542 passed, 42 files, at `033b1bc`). As-built:
  `docs/plans/2026-10-21-step6-daemon-and-protocol-v2-asbuilt.md`; decisions 2026-10-22 #13–#30, of
  which #13, #14, #15, #21, #22, #24, #27 are open for the user.
- **Done 2026-10-22:** the D7 docs commit; this machine's MCP config now points at
  `<repo>/mcp/dist/index.js` (other machines: `docs/setup.md` §3 "Upgrading a machine that ran the
  bridge before Step 6"); pushed.
- **Next, deferred by the user to a later session:** (1) review the seven open decisions —
  `docs/plans/2026-10-22-step6-open-decisions-review.md`; (2) the **D6 wave** (MUX-1…10, DL-1/2 in
  `docs/e2e-test-plan.md`, wave sheet in `docs/plans/2026-10-21-step6-daemon-and-protocol-v2-steps/D6.md`;
  paste wave W1 from `docs/plans/handoffs.md`; may use UI automation). After the wave: Step 7
  (multi-actor tabs), then Step 8 (SDK surface + MCP cursor).
- Update this block with the `session-closeout` skill whenever a stage/phase completes or the
  resume point moves.

## Architecture

```
Claude ⇄ (MCP/stdio) ⇄ mcp/ ──┐   both are SDK clients: sdk/ connect() finds, spawns or
scripts (tsx) ⇄ sdk/ ─────────┤   hands over the daemon, then hello {token, role:"client",
                              │   name, build, proto:2} → welcome
                              ⇅ ws://127.0.0.1:9234
daemon/ (one per machine, detached, outlives sessions; token gate; holds the one extension socket;
         answers daemon.status / daemon.shutdown itself, forwards the rest under its own ids)
                              ⇅ JSON {id,method,params} / {id,result|error}  (extension: v1 hello, unchanged)
  extension/ (loaded unpacked in the real profile):
    offscreen document  → holds the WebSocket (survives MV3 service-worker culling)
    service worker      → routes methods to handlers; uses chrome.tabs/scripting/debugger
    content script      → window.__agentBridge: RefMap + snapshot + DOM actions (ISOLATED world)
```

Flow: tool → `BridgeLink.call` → `BridgeClient.call(method, params, {timeoutMs})` → WS → daemon
(`route.ts`) → extension socket → `router.on(method, …)` → handler → `chrome.*` / `callInPage`. Default actions use synthetic content-script events (no banner);
`browser_click {trusted:true}` (or a content-action failure) escalates to real CDP `Input` via
`chrome.debugger` (shows the "extension is debugging this browser" banner). Control targets the
**active tab**; tab tools switch it. Network capture is separate and always on: six top-level
`chrome.webRequest` observers feed a bounded per-tab `NetworkLog` (no banner, no debugger), which
`browser_network_requests` / `browser_network_clear` query.

### Key files
- `shared/src/`: `protocol.ts` (wire message types + guards: v1/v2 hello, welcome, events),
  `codes.ts` (the 22 error codes of spec §10), `error.ts` (`BridgeError`, `toWire`/`fromWire`).
- `daemon/src/`: `index.ts` (entry → `daemon/dist/index.js`), `main.ts` (`runDaemon`: env, token,
  bind-is-the-lock, idle, signals, exit codes), `wsHost.ts` (binds 127.0.0.1, token gate, roles,
  welcome, heartbeat, `shutdown(code)`), `handshake.ts`, `registry.ts` (clients), `route.ts`
  (`daemon.*` methods, timeout bounds, forwarding), `bridge.ts` + `connection.ts` (the extension
  socket, id-correlated calls), `build.ts` (sha256 build id), `idle.ts`, `log.ts` (file log + `redact`).
- `sdk/src/`: `index.ts` (public surface: `connect`, `BridgeClient`, `BridgeError`, `ErrorCodes`,
  `downloadToFile`), `connect.ts`, `knock.ts` (knock/spawn/handover state machine), `client.ts`
  (`BridgeClient`: calls, events, 4002 reconnect), `transport.ts` (the `ws` socket), `spawn.ts`,
  `paths.ts` (daemon path, `BRIDGE_DAEMON`), `token.ts` (`resolveToken`, also used by the daemon),
  `download.ts` (`browser_download`'s client half: target path, chunked pull, atomic write, sha256).
- `mcp/src/`: `index.ts` (entry → `mcp/dist/index.js`), `link.ts` (`BridgeLink`: the no-crash rule
  and the 5 s retry), `config.ts` (actor name, `connectOptions()`), `lifecycle.ts` (exit with the
  session), `tools/registry.ts` (the 21 MCP tools).
- `extension/src/`: `sw.ts` (router + offscreen orchestration), `offscreen.ts` (the socket),
  `inject.ts` (`ensureContent`/`callInPage` + `toSerializableArgs`/`unwrapResult`), `handlers/*`,
  `content/{index,snapshot,refmap,actions,geometry}.ts`, `debugger.ts`, `debugger-errors.ts`
  (pure: CDP failure → actionable message), `keys.ts` (pure: key name → CDP key params),
  `evaluate/{serialize,wrap,result}.ts` (pure: in-page serialiser source, `return`-wrapper,
  CDP-result → `EvalEnvelope`), `network-log.ts` (pure: `NetworkLog` reducer + query + formatter,
  redaction, body summary, serialise/merge), `network-state.ts` (the singleton log, the
  `storage.session` rehydrate/flush, the own-port variable), `handlers/network.ts`,
  `download.ts` (pure: `DownloadStore`, base64, filename from `content-disposition`) +
  `handlers/download.ts` (the service-worker fetch); the other half is `sdk/src/download.ts`.

## Commands

```bash
npm install
npm run build        # daemon/dist/index.js + mcp/dist/index.js + extension/dist/{sw,options,offscreen,content}.js
npm test             # vitest — 542 passed, 42 files (`npm test` at D5b commit 033b1bc, 2026-10-22)
npm run typecheck    # tsc across shared/daemon/sdk/mcp/extension
```
Load the extension: `chrome://extensions` → Developer mode → Load unpacked → `extension/`, then set the
token + port `9234` in its Options. The MCP config points at `<repo>/mcp/dist/index.js`; nobody starts
the daemon by hand (the first client spawns it). The token comes from `BRIDGE_TOKEN`, else `bridge.token`
at the repo root (gitignored). Full setup + the 21 tools: `docs/setup.md`.
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
  retry or a non-zero exit there. The MCP keeps the no-crash rule in `mcp/src/link.ts`: the 21 tools
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
  server's `downloadStart` with `unknown method`). An `unknown method: X` error means exactly this. MCP
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
  still working.
- **`describeDebuggerError(err, what)` / `withDebugger(tabId, fn, what)` take a caller name** —
  it's interpolated into the restricted-URL and timeout messages ("Trusted input" by default,
  `"browser_evaluate"`, `"Full-page screenshot"`). Add new Chrome strings there, not in handlers.
- **A module service worker must not use top-level `await`** — Chrome fails the worker with
  `TypeError: Top-level await is disallowed in service workers`, since the script must finish
  evaluating synchronously for its listeners to be known. The network log therefore ingests into
  memory from the first event and `network-state.ts` keeps a `ready` promise that `merge`s the
  rehydrated `storage.session` blob *underneath* the live entries (live wins); handlers `await ready`.
- **`chrome.webRequest` listeners must be registered at the top level of `sw.ts`**, synchronously —
  they have to exist on every worker start or the events that woke it are lost.
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

## Testing philosophy

Logic units (protocol, WS correlation, bridge, handshake, the daemon's registry/routing/lifecycle/log,
the SDK's knock/client/connect over injected I/O and clocks, the MCP link, RefMap, snapshot, actions,
geometry, tools, inject helpers, the `NetworkLog` reducer/query/formatter) are **TDD with real assertions**.
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
as-built in `…-asbuilt.md`); its live E2E waits for the D6 wave with the user. Several clients share
one daemon today, but they all drive the one **active tab**: actors on different tabs in parallel is
Step 7, the SDK surface and MCP cursor Step 8 — `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md`,
plans `docs/plans/2026-10-21-step7…`, `…step8…`.
