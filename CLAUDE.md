# CLAUDE.md

Guidance for working in this repo. Keep it accurate — update it when the architecture or the gotchas change.

## What this is

An MCP server + Chrome MV3 extension that lets an AI agent (Claude) drive the user's **real, logged-in
Chrome default profile**. Chrome 136 (May 2025) blocked `--remote-debugging-port` on the default
user-data-dir, breaking CDP-against-your-real-profile; this restores it from *inside* the profile via an
extension. Mental model: "Playwright MCP, but pointed at your real logged-in Chrome."

## Current state (2026-10-21)

- **Shipped:** Steps 1–5 (21 tools, 301 tests, live E2E passes recorded in `docs/e2e-test-plan.md` §5);
  `browser_download`; the server exits with its session. Public on GitHub (MIT).
- **Next: Step 6 — daemon + protocol v2** (`docs/plans/2026-10-21-step6-daemon-and-protocol-v2.md`),
  then Step 7 (multi-actor tabs) and Step 8 (SDK surface + MCP cursor). Design of record:
  `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md`. **Not started; kickoff written.** Each
  step runs as an autonomous phase under the `long-run` contract (decision 2026-10-21 "Steps 6–8 run
  under the long-run contract"). **Next action: paste `docs/plans/next-session-prompt.md` into a fresh
  session** that does not use the bridge MCP (stage D1 moves the MCP entry point). The plans' audit
  findings were ruled on 2026-10-21 (wave W0, `docs/plans/handoffs.md`; entries in `docs/decisions.md`);
  every Step 6 agent runs Opus 5.5.
- Update this block with the `session-closeout` skill whenever a stage/phase completes or the
  resume point moves.

## Architecture

```
Claude ⇄ (MCP/stdio) ⇄ server/ [hosts ws://127.0.0.1:9234, token handshake]
                            ⇅ JSON {id,method,params} / {id,result|error}
  extension/ (loaded unpacked in the real profile):
    offscreen document  → holds the WebSocket (survives MV3 service-worker culling)
    service worker      → routes methods to handlers; uses chrome.tabs/scripting/debugger
    content script      → window.__agentBridge: RefMap + snapshot + DOM actions (ISOLATED world)
```

Flow: tool → `bridge.call(method, params)` → WS → extension `router.on(method, …)` → handler →
`chrome.*` / `callInPage`. Default actions use synthetic content-script events (no banner);
`browser_click {trusted:true}` (or a content-action failure) escalates to real CDP `Input` via
`chrome.debugger` (shows the "extension is debugging this browser" banner). Control targets the
**active tab**; tab tools switch it. Network capture is separate and always on: six top-level
`chrome.webRequest` observers feed a bounded per-tab `NetworkLog` (no banner, no debugger), which
`browser_network_requests` / `browser_network_clear` query.

### Key files
- `shared/src/protocol.ts` — wire message types + guards (imported by both halves).
- `server/src/`: `wsHost.ts` (binds 127.0.0.1, token gate), `connection.ts` (id-correlated calls),
  `bridge.ts` (connection gate + unavailable-reason + host state), `startup.ts` (non-fatal port bind
  with retry), `lifecycle.ts` (exit with the session), `tools/registry.ts` (the 21 MCP tools),
  `index.ts` (entry).
- `extension/src/`: `sw.ts` (router + offscreen orchestration), `offscreen.ts` (the socket),
  `inject.ts` (`ensureContent`/`callInPage` + `toSerializableArgs`/`unwrapResult`), `handlers/*`,
  `content/{index,snapshot,refmap,actions,geometry}.ts`, `debugger.ts`, `debugger-errors.ts`
  (pure: CDP failure → actionable message), `keys.ts` (pure: key name → CDP key params),
  `evaluate/{serialize,wrap,result}.ts` (pure: in-page serialiser source, `return`-wrapper,
  CDP-result → `EvalEnvelope`), `network-log.ts` (pure: `NetworkLog` reducer + query + formatter,
  redaction, body summary, serialise/merge), `network-state.ts` (the singleton log, the
  `storage.session` rehydrate/flush, the own-port variable), `handlers/network.ts`,
  `download.ts` (pure: `DownloadStore`, base64, filename from `content-disposition`) +
  `handlers/download.ts` (the service-worker fetch); server side `server/src/download.ts`
  (target path, chunked pull, atomic write, sha256).

## Commands

```bash
npm install
npm run build        # builds server (dist/index.js) + extension (dist/{sw,options,offscreen,content}.js)
npm test             # vitest (301 tests)
npm run typecheck    # tsc --noEmit across shared/server/extension
```
Load the extension: `chrome://extensions` → Developer mode → Load unpacked → `extension/`, then set the
token + port `9234` in its Options. Full setup + the 21 tools: `docs/setup.md`.
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
- **The server must not crash on a busy WS port.** A single fixed port (9234) is tied to the process; an
  orphaned instance or a 2nd session causes `EADDRINUSE`. `startWsHost` never throws; stdio connects
  regardless, the reason is surfaced through every tool error via `bridge.setUnavailableReason`, and the
  bind is retried every 5 s. **Only run one Claude session driving the bridge at a time.**
- **The server must exit with its session** (`server/src/lifecycle.ts`). The WS server keeps the event
  loop alive, so before this an ended session left an orphan holding 9234 and the next session's bridge
  stayed unavailable. It exits on stdin `end`/`close`, a stdout error, SIGINT/SIGTERM/SIGHUP/SIGBREAK,
  or a vanished parent: on Windows a dead parent stays as `ppid`, so it checks `kill(pid, 0)`; on POSIX
  the process is re-parented, so it checks whether `ppid` changed. The parent check matters when a launcher
  sits in between (the nvm-windows `node.exe` shim spawns the real node). Verified on Windows
  2026-10-21, including force-killing the shim alone; **not yet verified on Linux**.
- **The server pings the extension socket every 30 s and terminates it on a missed pong** — browsers
  answer pings automatically, so a missed pong means Chrome (or the offscreen document) is gone. Without
  this the `Bridge` keeps a stale connection and every call waits the full 30 s timeout. Tests use
  `heartbeatMs: 30` and a `ws` client with `autoPong: false` to simulate a dead Chrome.
- **Chrome allows one debugger per tab**: with DevTools open, `chrome.debugger.attach` throws "Another
  debugger is already attached…"; clicking the banner's Cancel mid-action makes `sendCommand` throw
  "Detached while handling command". `withDebugger` maps both through `describeDebuggerError` — add new
  Chrome strings there, not in handlers.
- **`ws` is `external` in the server esbuild bundle** (it's CJS) — it resolves from `node_modules` at
  runtime, so the server runs from the repo.
- **`@types/chrome` quirks**: use `chrome.tabs.OnUpdatedInfo` (not `TabChangeInfo`);
  `InjectionResult<any>` (its `Awaited<T>` conflicts with TS's); `sendCommand` params want
  `{[k:string]:unknown}` (not `object`).
- **Editing extension code requires a manual reload**: `npm run build` then `chrome://extensions` →
  reload ↻. The service worker won't pick up `dist/` changes otherwise — **not even after a full Chrome
  restart** (seen 2026-10-06: a restarted Chrome still ran the old worker and answered the new
  server's `downloadStart` with `unknown method`). An `unknown method: X` error means exactly this. Server changes need an MCP
  reconnect (`/mcp`) or a fresh session.
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
- **The server's call timeout is per-call now** — `bridge.call(method, params, { timeoutMs })`. The
  default is still 30 s, so anything that may run longer (only `browser_evaluate` today) must pass
  `timeoutMs`, or the *server* reports a timeout while the extension is still working.
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
  (TTL 5 min, 8 entries) and pulled by the server in 1 MB `downloadChunk` calls (base64) so no single
  runtime message or WS frame grows with the file. The final URL is never returned or logged (it is
  usually signed) — only its host.

## Testing philosophy

Logic units (protocol, WS correlation, bridge, handshake, RefMap, snapshot, actions, geometry, tools,
startup, inject helpers, the `NetworkLog` reducer/query/formatter) are **TDD with real assertions**. The `chrome.*` glue (service worker,
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

**Decided, not yet built (2026-10-21):** `server/` becomes a persistent shared **daemon**, a TypeScript
**SDK** lets scripts drive the browser, the MCP becomes an SDK client, and several actors work on
different tabs in parallel — `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md`, plans
`docs/plans/2026-10-21-step6…`, `…step7…`, `…step8…`. Until Step 6 lands, don't add coupling to
`server/` that the `daemon/ sdk/ mcp/` split would undo, and treat "one session at a time" as temporary.
