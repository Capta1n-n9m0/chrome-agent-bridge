# CLAUDE.md

Guidance for working in this repo. Keep it accurate — update it when the architecture or the gotchas change.

## What this is

A localhost daemon + Chrome MV3 extension, with an MCP server and a TypeScript SDK as its clients, that
lets an AI agent (Claude) or a script drive the user's **real, logged-in Chrome default profile**. Chrome 136 (May 2025) blocked `--remote-debugging-port` on the default
user-data-dir, breaking CDP-against-your-real-profile; this restores it from *inside* the profile via an
extension. Mental model: "Playwright MCP, but pointed at your real logged-in Chrome."

## Current state (2026-10-24, Step 9 closed)

- **Shipped:** Steps 1–8 (Step 7 — multi-actor tabs — closed 2026-10-23; Step 8 — the SDK surface —
  closed 2026-10-24, as-built `docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-asbuilt.md`).
  Public on GitHub (MIT). **23 tools, 25 codes, 2720 tests in 116 files** (`npm test` 2026-10-24 at
  `ba6029e`). *Superseded 2026-10-24: was "23 tools, 1714 tests in 85 files (… at `a1932a8`)", because
  Step 9 added two codes and 1006 tests in 31 files (Step 9 as-built, per stage).*
- **Step 9 — Phase E safety — closed 2026-10-24**, as-built
  `docs/plans/2026-10-24-step9-phase-e-safety-asbuilt.md`: the kill switch (toolbar button,
  `Alt+Shift+K`, options page), the JavaScript switch, a block list, the own-page block; Run 13 24 PASS /
  7 FAIL / 3 RECORD / 5 NOT MEASURED, none a product defect. The user ruled all 32 open decisions
  (decisions.md · 2026-10-24 · The user rules on the 32 Step 9 open decisions; Step 9 closes (#202)): all as
  built, except a new code `JS_DISABLED` for "JavaScript is off" (Step 10) and a later network rule that stops
  redirects onto blocked sites (#140).
- **Step 8 closed 2026-10-24 (wave W2):** the user ruled its 25 open decisions (decisions.md
  #106–#127): 19 ratified as built, six with a work item for Step 10; the `blackboard-ultra` skill
  now boots by `npm --prefix ~/Projects/chrome-remote-extention run recipe --
  recipes/blackboard/boot-bb.ts <course> --keep-open` (skill `dfa2e50`; the local-server boot kept as a
  one-release fallback; the course repos PP1-2026 and NLP-Bachelor allow the command).
- **Reloads need no human:** `recipes/reload-extension.ps1` reloads the extension by UI automation
  and proves it (#65); an exit-2 reload may be re-run during waves (#99).
- **Resume:** Step 10 — the Step 8 follow-ups: kickoff `docs/plans/next-session-prompt.md`, phase doc
  `docs/plans/2026-10-24-step10-step8-follow-ups.md` (its precondition, #192, is met). Interactive sessions
  using the bridge need `/mcp` or a fresh session (the daemon build changed in Step 9).
- **Next after Step 9** (decisions.md · 2026-10-24 · The roadmap after Step 8 (#129), order open for
  veto): **Step 10** — the Step 8 follow-ups: the MCP's trusted tools focus first (#106), a warning when
  a locator resolves past the snapshot's 800 cap (#117), a squashed `step8` release tag (#125), a live
  N ≥ 1 retire row on a killed Chrome (#126), `browser_evaluate {saveTo}` with S6.3 redone through it
  (#127), plus the carried inputs (failure reports switch the human's view ~1.5 s; `bb-login.ps1`'s
  condition-based post-submit wait, #102; and Run 13's four re-measurements — SAFE-5c's redirect half (the
  post-redirect `downloadStart` check, unmeasured live), SAFE-POP-1, SAFE-3, SAFE-4 (b) (#194)); **Step 11** —
  D3 file upload; **Step 12** — Phase F (`args`
  for `browser_evaluate`, console capture, keep-attached debugger). Live waves run autonomously (#33).
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
                                + events tabCreated/tabRemoved/tabReplaced/safetyState  (extension hello: proto:2, session)
  extension/ (loaded unpacked in the real profile):
    offscreen document  → holds the WebSocket (survives MV3 service-worker culling)
    service worker      → routes methods to handlers; uses chrome.tabs/scripting/debugger
    content script      → window.__agentBridge: RefMap + snapshot + locate + DOM actions (ISOLATED world)
```

Flow: tool → `BridgeLink.call` → `BridgeClient.call(method, params, {timeoutMs})` → WS → daemon
(`route.ts`) → extension socket → `GatedRouter` (the safety gate at receipt, again before each first side effect and as
the post-check) → handler → `chrome.*` / `callInPage`. Default actions use synthetic content-script events (no banner);
`browser_click {trusted:true}` (or a content-action failure) escalates to real CDP `Input` via
`chrome.debugger` (shows the "extension is debugging this browser" banner). Clients name tabs by
daemon-minted **handles** (`T3`), never Chrome ids; one client holds a tab at a time (a **lease**:
opened, claimed, or a popup of a held tab), and a call on another client's tab fails fast with
`TAB_HELD`. The daemon forwards every tab method with a numeric `tabId` and never a `tab` key, and
each handler acts on `targetTab(p)`, in the background. Only a default-mode viewport screenshot and
`focusTab` need the screen; they run under the daemon's one FIFO **visibility lock**. A tab call
with no `tab` is refused `BAD_PARAMS "tab is required"` (network calls excepted: no `tab` means the
human's tab). The MCP keeps a **cursor**: its first untargeted tool claims the human's tab and keeps
it, and only `browser_select_tab`, `browser_new_tab` and `browser_use_active_tab` move it
(`mcp/src/cursor.ts`). A script uses the SDK's typed `Tab` (`client.newTab()` / `claim()`; the
client's own cursor is `client.tab()`): its actions take a ref or a **locator** (`{role, name}`,
`{text}`, `{css}`), resolved in the content script by the snapshot's own walk, and a failure on the
page carries a **failure report** (snapshot, screenshot, network). *Superseded 2026-10-23: was "every call acts on the active tab, and
the tab tools switch it", because Step 7 gave every method a `tabId` and the clients handles.*
*Superseded 2026-10-24: was "`focusTab`/`selectTab` need the screen … A call with no `tab` from a
Step 6 client (the legacy path, until Step 8) acts on the human's tab, lease-checked", because Step 8
S2b removed `selectTab` and the legacy path, and S3/S5 added the `Tab`, locators and
`browser_use_active_tab` (Step 8 as-built § S2b, § S3, § S5).* Network capture is separate and always on: six top-level
`chrome.webRequest` observers feed a bounded per-tab `NetworkLog` (no banner, no debugger), which
`browser_network_requests` / `browser_network_clear` query.
Since Step 9 every router method runs through one safety gate (`extension/src/safety.ts`, served by
`GatedRouter`): the human's kill switch, JavaScript switch and block list are enforced in the extension,
read from `storage.local` per call, and no wire, daemon or SDK method can change them; the network log
records nothing while disarmed and drops blocked hosts. The daemon only relays the state
(`safetyState` → `safetyStatus`, `daemon.status.safety`) and withholds URLs/titles while disarmed.

### Key files
- `shared/src/`: `protocol.ts` (wire message types + guards: v1/v2 hello, welcome, events; Step 7's
  `SnapshotResult`/`SnapshotElement`, `ScreenshotMode`, the tab and lease event params; Step 8's
  `Locator`/`LocatorName`/`LocateResult`, `WaitForParams`, `ActionTarget`, `TrustedInputOptions`,
  `EvalEnvelope.ref`, the hello's `session`, `isLocator`; Step 9's `SafetyState`/`isSafetyState`,
  `DaemonStatusSafety`, `SafetyScope`/`DisarmedData`, `HiddenReason`, the `hidden?` row fields, the
  `safetyState`/`safetyStatus` events),
  `codes.ts` (the 25 error codes of spec §10: 24 on the wire, Step 9's `DISARMED` and `DOMAIN_BLOCKED` among them, plus `NO_CURSOR`, raised by the SDK
  alone), `error.ts` (`BridgeError`, `toWire`/`fromWire`; `WireError.code` required since S2b).
  *Superseded 2026-10-24: was "the 22 error codes", because Step 8 S0 added `NO_CURSOR`
  (decisions.md · 2026-10-23 · `NO_CURSOR` enters `shared/src/codes.ts` as the 23rd code (#76)).*
  *Superseded 2026-10-24: was "the 23 error codes … 22 on the wire", because Step 9 S0 added
  `DISARMED` and `DOMAIN_BLOCKED` (#133).*
- `daemon/src/`: `index.ts` (entry → `daemon/dist/index.js`), `main.ts` (`runDaemon`: env, token,
  bind-is-the-lock, idle, signals, exit codes), `wsHost.ts` (binds 127.0.0.1, token gate, roles,
  welcome, heartbeat, `shutdown(code)`), `handshake.ts`, `registry.ts` (clients), `route.ts`
  (`daemon.*` methods, timeout bounds, forwarding), `bridge.ts` + `connection.ts` (the extension
  socket, id-correlated calls), `build.ts` (sha256 build id), `idle.ts`, `log.ts` (file log + `redact`).
  Step 7's tab layer, all pure but the last: `handles.ts` (`HandleTable`: `T<n>` ↔ Chrome tab id,
  remap on `tabReplaced`, dead handles kept 1 h / 1 000 for `TAB_GONE`), `leases.ts` (`LeaseTable`:
  one owner per tab, `TAB_HELD {owner, since}`), `lock.ts` (`VisibilityLock`: FIFO, `LOCK_TIMEOUT
  {holder}`, released on completion, deadline or disconnect), `methods.ts` (the one method-class
  table — a new extension method must enter it; `REMOVED_METHODS`: `selectTab` → `UNKNOWN_METHOD`),
  `intercept.ts` (`TabLayer`: resolve, lease check, lock, forward with `tabId`; events → handles; the
  opener rule and `leaseGranted`; `tab is required`; `retireAll` on a changed session marker; Step 9: keeps the extension's last
  `safetyState` (null until reported, from each new extension hello until that socket reports, and after the socket closes;
  `safetyStatus` is never sent with null), logs one line per change (booleans and the
  count), serves `daemon.status.safety`, broadcasts `safetyStatus`, withholds URLs/titles while the last state
  says disarmed, one `listTabs` per change),
  `handle-mark.ts` (Step 8 S2b: handle numbers continue across daemons from
  `~/.chrome-agent-bridge/handle-mark`, reserved in blocks of 64, a time base when the file fails).
  *Superseded 2026-10-24: was "…; the legacy path", because Step 8 S2b removed it (decisions.md ·
  2026-10-23 · S2's daemon half becomes stage S2b (#72)).*
- `sdk/src/`: `index.ts` (public surface, exactly eight values: `connect`, `BridgeClient`, `Tab`,
  `BridgeError`, `ErrorCodes`, `downloadToFile`, `formatSnapshot`, `formatNetwork`; the rest are
  types), `connect.ts` (`connect({name, failureReports?, …})`), `knock.ts` (knock/spawn/handover state
  machine), `client.ts` (`BridgeClient`: calls, events, 4002 reconnect; Step 8's `newTab`, `claim`,
  `tab()` — the cursor, `NO_CURSOR` without one — `tabs()` (rows carry `hidden?`, Step 9), Step 9's `safety()`
  and `on("safetyStatus")`, and the cursor's `Tab` methods mirrored but
  `close`), `tab.ts` (Step 8 `Tab {handle}`: navigate…release, stale after a 4002 reconnect →
  `TAB_UNKNOWN` with no call), `locator.ts` (`Target = ref | Locator`, `normalizeTarget`), `error.ts`
  (failure reports: the attach set, the 5 s budget, `report()`; Step 9's `safetyRefusalLine` — one plain line
  for `DISARMED`/`DOMAIN_BLOCKED`, no report — re-exported by `report.ts`), `report.ts` (the `@bridge/sdk/report`
  subpath: `attachContext` for the MCP), `policy.ts` (`TRUSTED_INPUT_POLICY = "focusFirst"`),
  `transport.ts` (the `ws` socket), `spawn.ts`,
  `paths.ts` (daemon path, `BRIDGE_DAEMON`), `token.ts` (`resolveToken`, also used by the daemon),
  `download.ts` (`browser_download`'s client half: target path, chunked pull, atomic write, sha256),
  `format/{snapshot,network}.ts` (the pure text formatters, moved from the extension in Step 7 T4,
  byte-identical to the baseline `sdk/test/fixtures/baseline-51de800.json`), exported as the
  `@bridge/sdk/format` subpath (`sdk/package.json` `exports["./format"]`) and from `index.ts`.
  *Superseded 2026-10-24: was "…, not from `index.ts`", because Step 8 S3 re-exports them from the
  main entry too (decisions.md · 2026-10-23 · S3.4 applies as written: the main entry also re-exports
  the formatters (#75)).*
- `mcp/src/`: `index.ts` (entry → `mcp/dist/index.js`), `link.ts` (`BridgeLink`: the no-crash rule
  and the 5 s retry), `config.ts` (actor name, `connectOptions()`), `lifecycle.ts` (exit with the
  session), `cursor.ts` (`TabCursor`: claimed on first untargeted touch, moved only by
  `browser_select_tab`/`browser_new_tab`/`browser_use_active_tab`, lost with a one-line notice on a
  4002 reconnect or a new client), `tools/registry.ts` (the 23 MCP tools — `browser_focus_tab` is
  Step 7's, `browser_use_active_tab` Step 8's; the `locator` object on the actions and
  `browser_wait_for`; `failureReport`/`failedLine`: an attach-set failure on a handle is rendered as the
  SDK's report plus a PNG; Step 9's `withSafetyRefusals` (a `DISARMED`/`DOMAIN_BLOCKED` from any tool → one
  error line), `safetyStatusLine` (`browser_status`'s second text item `Safety: …`), hidden rows
  `(hidden: the bridge is off)` / `(hidden: blocked site)`). *Superseded 2026-10-24: was "moved only by
  `browser_select_tab`/`browser_new_tab` … the 22 MCP tools", because Step 8 S5 added
  `browser_use_active_tab` (Step 8 as-built § S5).*
- `recipes/` (run with `npm run recipe -- <file>`, i.e. `tsx`; index in `recipes/README.md`):
  `hello.ts` (SDK smoke script; its output is pinned by MUX rows), `sdk-login.ts` (row SDK-1: the
  typed `Tab` end to end on the fixture), `reload-extension.ps1` (reloads the Chrome Agent Bridge
  card by UI Automation and verifies it; exit 2 = pressed nothing), `t5*.ts`/`t5-win.ps1` (the Step 7
  E2E driver helpers), `fe.ts`/`fe-rules.ts`/`fe-win.ps1` (Step 8 stage FE, focus emulation),
  `s6.ts`/`s6-rules.ts` (Step 8 S6's SDK rows), `blackboard/` (`boot-bb.ts` loads the
  blackboard-ultra skill's `bb.js` in a tab of its own; `export-grades.ts` reads a gradebook into
  gitignored `exports/`; `assemble-mcp.ts`, `held.ts` and their helpers `export-file.ts`,
  `guard.ts`, `readonly.ts`, `session.ts`, `transcript.ts`, `stub-bb.js`; read-only by construction,
  `failureReports: false`), `bb-login.ps1` (that login step), `fixtures/` (its Blackboard and SSO
  stand-in pages), `bgf-*.ps1` (Chrome quit/relaunch/count: BG-FLAGS, then SM-1), `s9.ts`/`s9-rules.ts`/`s9-actor.ts`/`s9-win.ps1`/`s9-redirect.py` (Step 9 S4, Run 13: SDK rows, their
  rules, headless MCP actors, UI Automation of the button/shortcut/options page/worker console, the port-8083
  redirect server), `test/` (part of `npm test`), `tsconfig{,.fe,.s6,.s9}.json` (recipes are not in `npm run
  typecheck`: `npx tsc --noEmit -p recipes/tsconfig.s6.json`). *Superseded 2026-10-24: was `hello.ts`,
  `reload-extension.ps1`, `t5*`, `bgf-*.ps1` "BG-FLAGS only", because Step 8 FE and S6 added the rest.*
- `extension/src/`: `sw.ts` (the `GatedRouter` + offscreen orchestration; the top-level `chrome.tabs.on*`,
  `action.onClicked` and `storage.onChanged` listeners), `router.ts` (thrown error →
  `{code, message, data?}`; Step 9's `GatedRouter`, the only router `sw.ts` builds: `on` throws for a method
  with no safety class, unknown → `UNKNOWN_METHOD` in every state), `offscreen.ts` (the socket; accepts only
  this extension's non-tab senders, `relay-sender.ts`),
  `client.ts` (the hello), `session-marker.ts` (pure: the session marker's choice over event orders),
  `trusted-input.ts` (pure: the CDP steps of trusted input, with or without focus emulation),
  `tabs.ts` (`targetTab` — `tabId` required since S2b — `humansTab`, `activateForCapture` + restore,
  `cdpCaptureRefusal`),
  `errors.ts` (`BridgeError`, `toWireError`, `splitCoded`), `tab-events.ts` (pure: tab events +
  the last-url/title cache), `network-scope.ts` (pure: which tab a network call covers),
  `inject.ts` (`ensureContent`/`callInPage` + `toSerializableArgs`/`unwrapResult`), `handlers/*`
  (Step 8: `target.ts` — `ref` | `locator` → a ref before the action; `locate.ts`; `locator-wait.ts`
  — the 100 ms `waitFor {locator}` poll), `content/{index,snapshot,refmap,actions,geometry,guard}.ts`
  and Step 8's `content/a11y.ts` (the one walk, `roleOf`, the accessible name, the pruning gates —
  shared by snapshot and locate), `content/locate.ts`, `content/nearest.ts` (candidate ranking),
  `content/marked.ts` (`refOfMarked`), `debugger.ts`, `debugger-errors.ts`
  (pure: CDP failure → `{code, message}`), `keys.ts` (pure: key name → CDP key params),
  `evaluate/{serialize,wrap,result,mark}.ts` (pure: in-page serialiser source, `return`-wrapper,
  CDP-result → `EvalEnvelope`, the `asRef` mark), `network-log.ts` (pure: `NetworkLog` reducer + query (its text formatter moved to `sdk/src/format`),
  redaction, body summary, serialise/merge), `network-state.ts` (the singleton log, the
  `storage.session` rehydrate/flush, the own-port variable), `handlers/network.ts`,
  `download.ts` (pure: `DownloadStore`, base64, filename from `content-disposition`) +
  `handlers/download.ts` (the service-worker fetch); the other half is `sdk/src/download.ts`.
  Step 9 (Phase E safety): pure, unit-tested, with no log call — `safety.ts` (the gate
  `safetyDecision`, the method table `METHOD_CLASSES` over all 23 router methods — `methodClass` throws
  on an unknown name — the refusal messages, `listTabs`/event redaction, the network predicate),
  `safety-match.ts` (the block-list grammar and matcher, dot boundary only; #135, #156), `safety-state.ts`
  (`SAFETY_KEYS` in `storage.local`, the per-call read that fails closed, `SafetyStore.toggle()` →
  `"disarmed" | "armed" | "ignored" | "write-failed"`, the 1 s re-arm guard, `readStoredArmed`, the
  `safetyState` reporter), `safety-call.ts` (one call's gate at receipt, before each first side effect,
  and the post-check), `safety-debugger.ts` (the session registry `detachAll` at disarm),
  `safety-network.ts` (the ingest filter), `options-model.ts` (the options page's analysis and texts),
  `relay-sender.ts` (the offscreen sender check); `badge.ts` (badge/title by state, `BadgeController.press`;
  `chrome.action` injected, unit-tested) logs one fixed line per press (`toggleLogLine`); `options.ts` +
  `extension/options.html` are page glue (DOM + `chrome.storage.local`, the Safety and Blocked sites
  boxes), not unit-tested, read statically by `safety-writers.test.ts`. Tests that guard them:
  `extension/test/log-scan.test.ts` (+ `log-allowlist.ts`, 54 log sites — *Corrected 2026-10-25 (Step 10 Stage 0 F8): was '60 log sites', because the allowlist has 54 entries (15 + 33 + 0 + 6) since S2b.*) and `log-sentinel.test.ts` (no
  pattern/URL/token in any log), `safety-writers.test.ts` (only the toggle and the options page write the
  safety keys), `manifest.test.ts`.

## Commands

```bash
npm install
npm run build        # daemon/dist/index.js + mcp/dist/index.js + extension/dist/{sw,options,offscreen,content}.js
npm test             # vitest — 2720 passed, 116 files (`npm test` 2026-10-24 at ba6029e; recipes/test included)
npm run typecheck    # tsc across shared/daemon/sdk/mcp/extension (chained with &&: the first failure hides the rest)
npm run recipe -- recipes/<file>.ts [args]   # a script against the SDK, run with tsx (= npx tsx recipes/<file>.ts)
npx tsc --noEmit -p recipes/tsconfig.s6.json # recipes typecheck separately (tsconfig.json, .fe, .s6, .s9 cover the others)
```
*Superseded 2026-10-24: was "950 passed, 59 files (`npm test` 2026-10-23 at 9cfc7db …)", because
Step 8 added 764 tests and 26 files (Step 8 as-built, per stage; 1714 / 85 also at 75f0bd6).*
*Superseded 2026-10-24: was "1714 passed, 85 files (… at eb6b991)", because Step 9 added 1006 tests and 31
files (Step 9 as-built, per stage).*
Load the extension: `chrome://extensions` → Developer mode → Load unpacked → `extension/`, then set the
token + port `9234` in its Options. The MCP config points at `<repo>/mcp/dist/index.js`; nobody starts
the daemon by hand (the first client spawns it). The token comes from `BRIDGE_TOKEN`, else `bridge.token`
at the repo root (gitignored). Full setup + the 23 tools + "Writing a script": `docs/setup.md`.
*Superseded 2026-10-24: was "the 22 tools", because Step 8 S5 added `browser_use_active_tab` (Step 8
as-built § S5).* After `npm run build`, reload the extension (on Windows `recipes/reload-extension.ps1` does it by UI Automation; `docs/setup.md` §4).
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
  retry or a non-zero exit there. The MCP keeps the no-crash rule in `mcp/src/link.ts`: the 23 tools
  (22 before Step 8 S5) are registered with no daemon, a failed `connect()` stores its message (every tool error and
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
  tab of the last-focused normal window (#43)). It serves `listTabs`' `current:
  true`, `tabs.claim {active:true}` (so `browser_use_active_tab` and the MCP's first touch), a network
  call with no `tab`, `browser_status` and `browser_list_tabs`'s `*`; the SDK's `tabs()` reads
  `current`. *Superseded 2026-10-24: the list also named "the `targetTab` fallback" and "the daemon's
  legacy path", because Step 8 S2b removed both (Step 8 as-built § S2b).* `listTabs`' `active` keeps Chrome's per-window meaning (every window's active tab), so never pick
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
  wave blocks with their output to a file, or stop the daemon after. *Updated 2026-10-24: `spawnDaemon`
  inherits no pipe — node parent, `sdk/test/spawn-inherit.test.ts`: end-of-file 3–6 ms before the
  child's exit with the stand-in daemon alive in 6 runs, while the `stdio:"inherit"` control held the
  pipe every run; npx parent one ad-hoc trial. The MUX-6 cause remains unmeasured (decisions.md ·
  2026-10-23 · S3.5's outcome and the Step 6 revisit items (#91)).*
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
- **One WebSocket frame over 100 MiB closes the extension socket (1009).** `ws`'s default `maxPayload`
  (100 MiB) is set nowhere in the repo, so one oversized reply drops the extension's socket and every actor's
  in-flight call fails `NOT_CONNECTED`; a single result frame crossed daemon → client whole up to 99 MiB (measured
  on port 0 with a fake extension, Step 10 Stage 0 F1/F2, `…step10…-steps/stage0-transport.txt`, re-run by its
  verifier). Bulk data moves in slices (`downloadChunk`; `saveTo`'s pulls, decisions.md · 2026-10-25 · Stage 0:
  `saveTo` uses transport (B), with tab-carrying pulls (#205)).
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
  detected by its hello); `unknown method: locate` names a pre-Step-8 extension. MCP
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
  what ships. Keep it closure-free. Since Step 8 S2 it is a composite that, only when `asRef` passes a
  mark, also marks the element after serialising (see the `data-__bridge-mark` bullet below); without
  a mark its output is unchanged (decisions.md · 2026-10-23 · S2's handler details: the mark rides the
  serialiser, `pressKey` takes a target, `waitFor {locator}` rules (#92)).
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
  `BAD_PARAMS "<method> requires tabId"`; `grep -rn "targetTab({}" extension/src` is empty. Don't
  restore the fallback (a Step 8 forbidden fix), and don't make the daemon omit `tabId`.
  *Superseded 2026-10-24: was "absent → the human's tab with one `console.warn` per method … Step 8
  removes the fallback; don't remove it early", because Step 8 S2b removed it (decisions.md ·
  2026-10-23 · S2's daemon half becomes stage S2b (#72); `extension/src/tabs.ts` `targetTab`).*
- **Clients see handles (`T3`), never Chrome ids.** Only the daemon maps them (`daemon/src/handles.ts`);
  a daemon restart renumbers, so the MCP cursor is lost and re-claimed with a one-line notice (T4).
  `newTab`/`listTabs` results still carry the Chrome `id` beside `tab` (kept through Step 8 for its
  consumers: decisions.md · 2026-10-23 · The Chrome `id` stays beside `tab` this step; network calls
  without `tab` stay "active" (#81)). *Superseded 2026-10-24: was "for one release (Step 6
  clients)", because #81 kept the `id` through Step 8 (`recipes/hello.ts`, `t5.ts`, `t5-lib.ts`, five
  daemon tests and `registry.ts` read it).* Since Step 8 S2b a new daemon **never reuses a handle number**:
  `daemon/src/handle-mark.ts` continues from `~/.chrome-agent-bridge/handle-mark` (blocks of 64; a
  time base when the file cannot be read or written), so a stale `T3` from an earlier daemon answers
  `TAB_UNKNOWN` instead of landing on another tab, and the SDK's `Tab` refuses itself (`TAB_UNKNOWN`,
  no call) after a 4002 reconnect (decisions.md · 2026-10-23 · A new daemon never reuses a handle
  number; the SDK guards stale `Tab`s (#79); · S2b's details … (#94) item 8). Tests inject the base
  and directory, never the real `~/.chrome-agent-bridge/`.
- **`newTab` opens in the background unless `active: true` is passed** (`handlers/tabs.ts`; T3.4). The
  MCP's `browser_new_tab` sends `active: true` only when the cursor is set and `listTabs` shows its tab
  as `current` (the human is watching this session's tab); otherwise — a session's first tab, a lost
  cursor, a failed listing — it opens in the background and says ` (in the background —
  browser_focus_tab shows it)`. Don't change the extension's default back. *Superseded 2026-10-24: was
  "the MCP's `browser_new_tab` passes `active: true` explicitly", because Step 8 S5 applied phase doc
  0.6's activation rule (decisions.md · 2026-10-23 · S5's MCP details: `browser_new_tab` activation,
  the status lines, the tool schemas, reports (#95) item 1).*
- **Only `captureVisibleTab` needs the tab on screen** — the default (`switch`) viewport screenshot,
  the one call the daemon locks besides `focusTab` (`daemon/src/methods.ts`; `selectTab` was removed
  in Step 8 S2b, and the daemon answers it `UNKNOWN_METHOD` itself — #94 item 1). Everything
  else runs on a background tab by design; measured there: `waitFor {text}` and `networkIdle` work
  (Run 8 BG-4: text after 3746 ms, idle after 552 ms, the tab hidden throughout).
  Trusted input does not (next bullet); `fullPage` (CDP) on a hidden or minimized tab is unmeasured
  (T5b F9).
- **Trusted CDP input into a background tab answers `ok` and does nothing.** `browser_click`/`type
  {trusted:true}` on a hidden tab returned in 5–10 ms with nothing received by the page; after
  `focusTab` the same call worked (Run 8 BG-1/BG-2). Chrome's `--disable-renderer-backgrounding
  --disable-backgrounding-occluded-windows --disable-background-timer-throttling` do not change it (ok
  in 12–15 ms, nothing received; Run 10 BGF-1/BGF-2, one trial each; decisions.md · 2026-10-23 ·
  Chrome's anti-throttling flags do not fix background input). **Focus emulation does not fix it
  either** (Step 8 stage FE, Run 11, 2026-10-23): with `focusEmulation: true` (attach →
  `Emulation.setFocusEmulationEnabled` on → input → off in a `finally`, one debugger session;
  `extension/src/trusted-input.ts`) the result said `focusEmulation: "on"` (FE-0), yet a trusted click
  reached the page 0/3, typing 2/3 (trial 3 got `ped`: the first five characters lost) and a key press
  0/3 (FE-1…FE-3); the control without it 0/12 (FE-5); nothing the human sees changed (FE-4 9/9). While
  it is on, the **target page reads `visible`** (3–7 ms into the call, `hidden` again 14–39 ms in), so
  a page-side visibility check is no proof of what the human saw. Hence the policy `"focusFirst"`
  (`sdk/src/policy.ts`): the SDK's `Tab.click/type/pressKey({trusted:true})` call `focusTab` first — the
  tab comes to the front of its window, the window is focused, and it stays there; the SDK never sends
  `focusEmulation`, and the MCP's trusted tools are unchanged (decisions.md · 2026-10-23 · The
  background-input policy (#89); · FE's rows and outcome table, amended before anything is measured
  (#78)). An untrusted action whose content path fails is escalated to CDP by the extension itself, out
  of the SDK's sight, so on a background tab it can still answer `ok` and do nothing; pass `trusted`
  or call `focus()` when it must land. A clipboard write in `evaluate` likewise needs `focusTab` (BG-3:
  `NotAllowedError … Document is not focused`). *Superseded 2026-10-24: was "Focus emulation is
  unmeasured …; Step 8's `sdk/src/policy.ts` decides", because FE measured it.*
- **The switch sequence, and why it never focuses the window** (`tabs.ts: activateForCapture`, plan
  0.5): minimized → `WINDOW_MINIMIZED` before switching; reserve a capture slot (Chrome allows 2
  `captureVisibleTab` calls/s; 500 ms spacing, one quota retry); activate the target; wait for
  `onActivated` (≤ 1000 ms) + 50 ms; capture; restore the previous tab — only if the window still
  shows the target and no `focusTab` touched it. `captureVisibleTab` needs the window visible, not
  focused: a target in an unfocused second window captured with the foreground window unchanged (Run
  9 R9-SCREEN-5). `focusTab` is the only call that runs `windows.update({focused:true})` (T3.3 grep;
  its alias `selectTab` was removed in Step 8 S2b). Never add focus to the capture, and never lower the
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
  `codedError(code, msg, data?)`; `guard` wraps every public `window.__agentBridge` method. Since Step
  8 S1 the marker may carry a sibling **`__bridgeData`** — a JSON copy of the error's plain-JSON `data`
  (e.g. `LOCATOR_NOT_FOUND {candidates}`) — which `unwrapResult` hands on as the `BridgeError`'s `data`;
  the marker string, return-not-throw and null/undefined → `REF_STALE` are unchanged (decisions.md ·
  2026-10-23 · Page-function failures may carry `data` beside the marker (#82); `content/guard.ts`
  `toMarker`, `inject.ts` `unwrapResult`). On the wire, `code` is required since S2b: a proto:2
  extension error without one is still delivered, as `INTERNAL`, and logged once per connection as
  `extension error without code: <method>` (decisions.md · 2026-10-23 · S2b makes `code` required on
  error frames (#73); `daemon/src/wsHost.ts`).
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
  client has been run against a newer daemon). That is why the Step 7 daemon kept a legacy path
  for Step 6 clients for one release (decisions.md · 2026-10-22 · A Step 6 client keeps working
  against a Step 7 daemon for one release, without loosening a lease). *Superseded 2026-10-24: was
  "a Step 7 daemon keeps a legacy path", because Step 8 S2b removed it: an untargeted tab call from an
  old client now gets `BAD_PARAMS "tab is required"` (or `VERSION` from a no-proto extension), and
  `selectTab` `UNKNOWN_METHOD` (Step 8 as-built § S2b).*
- **A hard reload re-fetches `favicon.ico`, and a plain fixture URL can come from Chrome's cache.** Run 8
  NET-1 served W1's 12 914-byte copy from the HTTP cache (`from cache: yes`, the server never hit) and
  printed `12.6 KB` for a 13 106-byte file; Run 9's Ctrl+Shift+R got `12.8 KB`, `from cache: no`, but
  the tab also logged a `404 image favicon.ico`, so `showing 1 of 1` became `2 of 2` (R9-NET-1). Write
  network rows with a fresh query string and a `types` filter.
- **Captures are colour-managed**: a `#ff00ff` bar drawn by the E2E driver (`recipes/t5-lib.ts:148-149`)
  read `#dd00fa` and its cyan `#00ffff` bar `#97fdfd` in a capture
  (Run 8 SCREEN rows, Run 9 R9-SCREEN-2), so pixel checks need a hue rule with slack,
  probed off any label text. In default-mode captures lime `#00ff00` read `#8fff3d` and blue
  `#0000ff` read `#3300f8` (named blue; Run 9, and Run 12 REP-0 control A); cyan through the default
  capture was not measured and is expected to shift like lime: use blue or magenta for colour
  controls (S6 verifier r2, from Run 9's readings; `…step8…-steps/S6.md` gotcha candidate 7).

**Step 8 — locators, the `Tab`, failure reports, the cursor (2026-10-23/24; reports in `docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/`)**

- **Locators are resolved by the snapshot's own rules — change `a11y.ts`, not two places.**
  `extension/src/content/a11y.ts` holds the one walk (`walkElements`: the pruning gates, open shadow
  roots, same-origin frames), `roleOf`, the accessible name and the `hasLayout`-gated zero-size filter;
  `buildSnapshot` and every `locate` variant use it, so what a snapshot shows is what a locator
  matches. A rule changed for one changes both, and changing a rule to make a fixture or a row match is
  a forbidden fix (phase doc 0.1's invariant). `{role, name}` matches only what a snapshot lists, by the
  name as shown (capped at 120 characters), case-insensitive substring, `exact` = case-sensitive
  equality; `{text}` the innermost element that survives the pruning gates whose visible text contains
  it; `{css}` any element past the gates; `nth` is 0-based in walk order; `locate` searches past the
  snapshot's 800-element cap (decisions.md · 2026-10-23 · S1's locator details (#87); · Locator rules,
  the MCP locator schema and the exported `BridgeError` (#83)). A pre-S1 capture of 46 fixtures stayed
  byte-identical (`extension/test/fixtures/snapshot-pre-s1.json`; regenerate only on pre-S1 code). Cost,
  measured in jsdom only: a `{text}` locate over 5 000 text elements ≈ 1.4 s (S1.md §6); `waitFor
  {locator}` polls from the service worker every 100 ms, without overlap.
- **`locate` adds refs, it never resets the RefMap — but every snapshot does.** `locate` mints through
  `refs.add` and never calls `buildSnapshot` (S1.4: `grep -rn "reset"` and `grep -rn buildSnapshot`
  on `extension/src/content/locate.ts` both empty). A `snapshot` — including the one a failure report takes —
  renumbers the tab's refs, so a ref held from before it silently names another element once the page
  changed (measured by the S4 verifier with the real content-script code in jsdom; S4.md §6). The SDK
  rewrites the `candidates` refs in a report's `error.data` to the attached snapshot's (unique role +
  name hit) or drops them (decisions.md · 2026-10-23 · S4's failure-report details, and how the MCP
  reaches them (#93)).
- **node → ref crosses worlds through a `data-__bridge-mark` attribute.** `evaluate {asRef}` runs in the
  page's main world (CDP); the RefMap lives in the content script's isolated world. The serialiser's
  own `Runtime.callFunctionOn` sets a fresh unique mark (`evaluate/mark.ts` `newMark`) on a connected
  Element, then `refOfMarked` (`content/marked.ts`) finds it by `getAttribute`, mints the ref through the
  RefMap and removes the attribute from every carrier on every path; a lost reply or failed content call
  sweeps it; none found → `REF_STALE`, several → `INTERNAL`; a non-Element value → `BAD_PARAMS` (`asRef
  needs an Element; the value is not one`, Run 12 ASREF-1) (decisions.md · 2026-10-23 · #87 item 6;
  #92 item 1; #99 item 6). Never leave the mark on the element or use a non-unique one.
- **Failure reports take the visibility lock and switch the screen.** On `LOCATOR_NOT_FOUND
  LOCATOR_AMBIGUOUS REF_STALE OFFSCREEN PAGE_ERROR NAV_FAILED TIMEOUT` a `Tab` call (and the MCP on a `T<n>`
  handle) reads the tab once more — `snapshot`, a default-mode `screenshot`, the last 20 network
  entries — in one 5 s budget, sets them on the same `BridgeError` (`snapshot`, `screenshotPath`,
  `network`, `attachErrors`, `report()` ≤ 60 lines) and never throws from it (`sdk/src/error.ts`). The
  screenshot is an ordinary capture under the FIFO lock (another actor's lock → `LOCK_TIMEOUT` or the
  5 s cut in `attachErrors`) and **switches the window to the failed background tab**: probe tab
  `visible` +20 ms, the human's tab hidden 1331 ms, call 1344 ms, PNG showing the failed tab (Run 12
  REP-0, with blue/magenta controls; decisions.md · 2026-10-23 · A probe of the failure-report screenshot
  runs before any row that could attach a non-fixture tab (#97)). On a fully covered window the 5 s cut
  ends the SDK's wait, not the extension's switch (the failed tab may stay in front ~30 s, R9-RESTORE).
  PNGs go to `BRIDGE_FAILURES_DIR`, else `~/.chrome-agent-bridge/failures/` — outside the repo; a
  script on a real site's private pages passes `connect({failureReports: false})`, as
  `recipes/blackboard/boot-bb.ts` and `export-grades.ts` do.
- **Claude Code drops images from `isError: true` MCP results**, so an MCP failure report with a
  screenshot is returned as a **non-error** result `[text, image]`: line 1 `<CODE>: …`, then the report,
  `Full message:` when needed, and last `The call failed (<CODE>). This result is not flagged as an error
  only so that the screenshot reaches you …` (`mcp/src/tools/registry.ts` `failureReport`,
  `failedLine`); without a screenshot it stays `isError`, one text item. Measured on Claude Code
  2.1.309: every `isError` variant (text+image, image+text, image alone, embedded resource) delivered 0
  images, both non-error variants delivered theirs (S6b probe, `…-steps/S6b-probe-record.md`;
  decisions.md · 2026-10-23 · An MCP failure report with a screenshot is returned as a non-error result
  (#100)). Re-run `S6b-probe-rows.md` after a Claude Code upgrade before restoring the flag. Claude Code
  also saves such an image under the session's `tool-results/` directory, a second copy outside
  `failures/` (S6b.md §6 finding 2; Run 12 Part 3 REP-1).
- **The MCP cursor never follows the human, except through `browser_use_active_tab` and the first
  touch.** It moves only on first touch (`tabs.claim {active:true}`), `browser_select_tab`,
  `browser_new_tab` and `browser_use_active_tab`; an explicit `tab` never moves it, nor does
  `browser_status` (which adds `Cursor:` and, when different, `Human's active tab:` after the Step 7
  lines, and never claims) (Step 8 as-built § S5; `mcp/src/cursor.ts`). Making it follow anywhere else
  is a forbidden fix. The SDK's own cursor (`client.tab()`) changes only on `newTab`/`claim` and a 4002
  reconnect — `release()`, `close()` and `tabGone` leave it (decisions.md · 2026-10-23 · The SDK `Tab`
  surface details and the cursor rule as built (#90) item 7).
- **Every tab call names its tab since Step 8 S2b.** The daemon refuses a tab method without `tab`
  (`BAD_PARAMS "tab is required"`, or `VERSION` from a no-proto extension), an unlisted untargeted method
  likewise, any `id` on `closeTab`/`focusTab`, and `selectTab` (`UNKNOWN_METHOD`, before resolution);
  network calls without `tab` (or `"active"`) mean the human's tab, with no log line (Step 8 as-built §
  S2b; decisions.md · 2026-10-23 · #81, #94).
- **The session marker retires every handle when Chrome restarts.** The extension's hello carries
  `session` (`extension/src/session-marker.ts`): reused from `storage.session` on a worker restart; on
  a miss one 2 s bound waits for `runtime.onStartup` (fresh) — an extension reload (`onInstalled`
  install/update) reuses `storage.local`'s only when the bound ends, so **a reload's hello comes up to
  2 s later**; no event → fresh (costs leases, never safety). The daemon compares with the last hello's
  marker: any change after the first hello retires every live handle synchronously before the resync
  (one `tabGone` per holder with the pre-restart url/title, leases dropped, the lock untouched; log
  `extension session changed: <n> handles retired`; the marker is never logged) (decisions.md ·
  2026-10-23 · The session marker's mechanism, amended (#80); · #94 items 2–4). Measured: an
  extension reload kept the held handle (`extension resync: 5 tabs, 0 gone`, no session line; Run 12
  SM-0); `chrome://quit` closes every tab before the session changes, so a leased handle is retired by
  `tabGone` at the quit (+1539 ms) and the restart logs `0 handles retired` (Run 12 SM-1, twice;
  S6.md gotcha candidate 4).
- **Recipes run with `tsx` (`npm run recipe -- <file>`), and `String(fn)` page code breaks under tsx.**
  tsx's keepNames wraps inner named functions and named arrows in `__name(…)`, so `String(fn)` of such a
  function throws `ReferenceError: __name is not defined` in the page; under vitest the same function
  is self-contained, so a unit test cannot catch it (S6 verifier §7, reproduced in `node:vm`, tsx
  v4.23.15). Recipes ship page code as literal strings. The extension's `SERIALIZER_SRC` is unaffected
  (bundled by esbuild without keepNames). Recipes are not in `npm run typecheck`: use their own
  `tsconfig*.json` (Commands).
- **`npm run typecheck` chains the projects with `&&`** (root `package.json`), so a type error in one
  package hides the later packages' results; when another stage's work is in flight, run `tsc -p
  <pkg>/tsconfig.json` per package (S2b builder and fixer; S2b.md gotcha candidates).
- **A leaked lease on a retired handle is invisible through the API** — leases are keyed by handle and
  the handle is dead, so only a test that claims through the lease table or after the retire catches it
  (S2b verifier mutation M6, which survived until fixer round 1 added that test; S2b.md).

**Step 9 — safety (2026-10-24; reports in `docs/plans/2026-10-24-step9-phase-e-safety-steps/`)**

- **Every router method passes the safety gate, and a new one cannot skip it.** `sw.ts` serves through
  `GatedRouter` only (`extension/src/router.ts`); `GatedRouter.on` throws for a name missing from
  `METHOD_CLASSES` (`extension/src/safety.ts`, no default class), and `safety-gate.test.ts` scans every
  `router.on("…")` in `sw.ts` against the table (S1.1, three mutants red; the scan is lexical — `router["on"]`
  escapes it, the throw does not; S1.md §6). A new extension method must enter both `METHOD_CLASSES` and
  `daemon/src/methods.ts`. Exempting or reclassifying a method to pass a row is a forbidden fix.
  (By construction + unit tests.)
- **The state lives in `storage.local`, is read per call, and fails closed.** Keys `safety.armed`,
  `safety.evaluate`, `safety.blockList` (`safety-state.ts` `SAFETY_KEYS`); missing keys = armed, JavaScript
  on, empty list; a failed read or a wrong-typed value refuses every call `DISARMED` (#139, #171). Never move
  it to `storage.session` (a reload would re-arm). A disarm held in memory wins over a read that still says
  armed (#176); a disarm whose write fails twice stays disarmed in memory, returns `"write-failed"` and
  lasts until the worker restarts, which reads storage again — armed (#174; S2b report §6 item 6); a
  rejected re-arm write returns memory to disarmed (S2c, #190). Measured cost of the per-call read:
  snapshot round trip median 3.6 → 5.3 ms (Run 13 SAFE-PERF; #139's Revisit-if not met).
- **Nothing on the wire changes the state.** Only `action.onClicked` (`sw.ts`, the button and the
  `_execute_action` shortcut — there is deliberately no `commands.onCommand`, #142) and the options page
  write it (`safety-writers.test.ts`; `storage.local.remove`/`clear` refused everywhere, #188). The
  `action.onClicked` and both `storage.onChanged` listeners are registered at the top level of `sw.ts`
  with no top-level `await`; `storage.local.setAccessLevel({TRUSTED_CONTEXTS})` runs at module scope after
  every listener, guarded, not awaited (#139). The offscreen document acts only on this extension's
  non-tab senders (`relay-sender.ts`, #173). Adding a wire, daemon or SDK method that arms, disarms, edits
  the list or enables JavaScript is a forbidden fix. (By construction + unit tests; ACL-1 not measured.)
- **The matcher matches only at a dot boundary** — `host === p || host.endsWith("." + p)`
  (`safety-match.ts` `patternMatches`); never substring or dot-less `endsWith` (a forbidden fix). The
  50-case table of stage0-audit.md §5 is `extension/test/safety-match.test.ts`. (Unit tests.)
- **Never log a pattern, URL or title from the safety code.** The gate, matcher and state modules have no
  log call; a press logs one fixed line (`badge.ts` `toggleLogLine`); the daemon logs booleans and the
  count (`intercept.ts` `safetyLogLine`). `log-scan.test.ts` allowlists every log site (54 at S2b — *Corrected 2026-10-25 (Step 10 Stage 0 F8): was '60 log sites', because the allowlist has 54 entries (15 + 33 + 0 + 6) since S2b.* — extension
  15, daemon 33, sdk 0, mcp 6) and `log-sentinel.test.ts` runs the real daemon on port 0 (#187). Run 13:
  `daemon.log` 210 lines and the worker console 0 for the token, non-fixture `://` and the test patterns
  (SAFE-10).
- **`navigate`/`newTab` are gated on the URL Chrome will open**, so a relative URL that resolves to this
  extension's `options.html` is refused, not just `chrome-extension://…` written out (S2a round-1
  CRITICAL, #175; measured in Run 13 SAFE-REL-1, PASS). `view-source:` of a relative own-page path
  answered `ok` (SAFE-REL-3 `rel`, recorded; what it opened is not shown, #196); every later call on such
  a tab is refused.
- **The disarm reaches running work fast, Chrome's banner does not.** A running trusted `type` ended
  `DISARMED` 14 ms after the press (578 of 1000 characters typed), but the "is debugging this browser"
  banner was still shown 3 s later and gone by +14 s (Run 13 SAFE-4 (b), FAIL, Chrome-owned; re-measured in
  Step 10, #194); a running `waitFor` was refused 54–92 ms after the press (SAFE-4 (a), 4c).
- **`Alt+Shift+K` is assigned as `_execute_action` on Chrome 156** and pressing it left the Windows input
  layout unchanged (`0x04090409` before and after, three layouts installed; Run 13 SAFE-2). The toolbar
  extension button and the Extensions (puzzle) button expose **no UIA Invoke pattern**: pinning and
  pressing need a mouse click at a `FromPoint`-verified point in the driver's own window (Run 13 record
  block 9; S4.md §10 finding 1).
- **Chrome 156 shows a second line under the extension's action title** ("Has access to this site"; Run 13
  record SAFE-1 (4), SAFE-9): read only the first line when checking the title by UI automation.
- **Chrome refuses a `javascript:` navigation through the bridge itself**: `NAV_FAILED JavaScript URLs are
  not allowed in API based extension navigations. …`, page unchanged (Run 13 SAFE-6c, JavaScript on,
  record). With JavaScript off the gate refuses first (`DISARMED`, scope `evaluate`, SAFE-6).
- **On a reload the daemon logs `safety state:` before `extension resync`** (by design:
  `daemon/src/intercept.ts` `onSafetyState` vs the resync; Run 13 SAFE-9, a wrong expected text, #195). A
  reload also closes an open options page (SAFE-9 record), and right after it `daemon.status` shows URLs one
  round trip later than the state (S3.md §6, by reading the code).
- **Chrome 156 titles the service worker's DevTools window `DevTools`**, with no extension URL (Run 13
  SAFE-10 set-up, #195).
- **An options page in a background window did not show a `storage.onChanged` re-arm until brought to
  the front** (Run 13 SAFE-3, FAIL; cause undetermined — UIA staleness or deferred rendering; re-measured in
  Step 10, #194). After a `write-failed` disarm the options page shows the stored state ("Bridge armed.")
  while the badge says OFF and every call is refused — the memory disarm is not visible to the page (S2b
  verifier F4, by construction, not producible live). The badge is the indicator.
- **The block list is not a network firewall.** A redirect hop of a bridge `navigate` or `downloadStart`
  onto a blocked host is still requested; the post-check refuses the reply and a download drops its bytes
  (`downloadStart` checks its own URL, then `res.url`, #140, #154). The post-redirect download check is
  unit-tested only: Run 13 SAFE-5c's redirect half timed out on the single-threaded test server (#194).
  A cross-origin frame of a blocked host shows in screenshots (stage0-audit F16, by reading).
- **Build fact: esbuild keeps comments placed inside array literals** in the bundle (S0 bundle diff, S0.md
  §6 item 3) — keep comments out of literals where a bounded bundle diff is checked.

**Driving Chrome from the outside (live waves, Windows)**

- **`chrome.exe --new-window chrome://…` opens a New Tab page, not the page** (Run 8 set-up fix 4;
  RELOAD-AUTO F1). Type the URL into the omnibox of a window the driver opened instead.
- **The extension reload is scripted: `recipes/reload-extension.ps1`** (decisions.md · 2026-10-23 ·
  Later extension reloads use `recipes/reload-extension.ps1`). On `chrome://extensions` Chrome 156's
  UIA tree flattens each card into siblings; the card's reload is AutomationId `dev-reload-button`,
  and the toolbar's Reload is also named "Reload" (AutomationId `view_1003`), so never match by name.
  An unpacked extension's id is sha256(absolute path as UTF-16LE), first 16 bytes as letters a–p.
  Proof of a reload: a new `extension resync` line in `daemon.log` in the same second (5 of 5).
  (RELOAD-AUTO F1–F6.) *Updated 2026-10-24: since Step 8 S2b a reload's hello waits up to 2 s for the
  session marker, so the line can come later: pressed 16:53:10.415Z, resync stamped 16:53:12Z, and the
  script still found it and exited 0 (Run 12 SM-0, one reload; decisions.md · 2026-10-23 · S2b's
  details … (#94), whose Revisit-if names this).*
- **UIA `TabItem` is not a tab count**: a page element with `role="tab"` is a `TabItem` too (empty
  ClassName); the tab strip's tabs have ClassName `Tab` (BG-FLAGS finding 3).
- **The driver's shell runs inside a job object** (limit flags `0x800`, breakaway allowed), and a
  process started with plain `Start-Process` inherits the job and the session's environment
  (BG-FLAGS finding 5). Anything that must outlive the driver (Chrome, a daemon) needs breakaway and
  a clean environment — `recipes/bgf-launch.ps1` does both.
- **Windows PowerShell 5.1 traps met in Run 12 (Step 8 S6)** (`…step8…-steps/S6.md` gotcha candidates
  2, 3, 10, 16): the built-in alias `R` (`Invoke-History`) shadows a function named `R`; embedded `"`
  are stripped from a native command's arguments, so send JSON-bearing prompts from Git Bash;
  `Get-ChildItem` with a wildcard in the middle of the path plus `-Filter` returns nothing (put the
  pattern in the path); `>` in a `-NoProfile` shell writes UTF-16LE (`ff fe`), which a UTF-8 reader
  turned into a page `SyntaxError` — read a file's encoding from its BOM.
- **`npx` on Windows goes through `cmd.exe`, which refuses a long argument**: an ~8 000-character actor
  prompt via `npx tsx …` printed `The command line is too long.` and exited 1 with nothing sent
  (cmd's 8191-character limit); `node --import tsx …` worked (Run 12 MCP leg; S6.md candidate 14).
- **Chrome restarts and live sites** (Run 12; S6.md candidates 8, 11–13, 15): a window handle does not
  survive a Chrome restart (session restore brings windows back under new HWNDs) — find the window
  again or open your own; a full-window OS frame includes Chrome's own UI (the bookmark bar), so judge
  frames by numbers or crop to the viewport; Chrome resolves every `*.localhost` name to loopback with
  no DNS lookup (one 127.0.0.1 server can stand in for a second host); the login script's post-submit
  check (it stops once the address bar has been stable for 4 s, at most 20 s) read the SSO page about
  8 s after the press, yet the login had worked (decisions.md · 2026-10-23 · SDK-6/SDK-7 run in
  the session the login actually opened (#101)) — wait on a condition with a bound; and live data can
  change between two reads minutes apart (inferred from counts, not proven), so compare two
  transports over one held snapshot (decisions.md · 2026-10-23 · S6.3 compares one in-page export read through both paths (#103)).

## Testing philosophy

Logic units (protocol, WS correlation, bridge, handshake, the daemon's registry/routing/lifecycle/log,
the SDK's knock/client/connect over injected I/O and clocks, the MCP link, RefMap, snapshot, actions,
geometry, tools, inject helpers, the `NetworkLog` reducer/query, the daemon's handles/leases/lock/
tab layer, the extension's error mapping and tab events, the MCP cursor, the SDK formatters, Step 9's safety gate, block-list matcher, state store, badge model and
options model) are
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

**Step 6 built (2026-10-22); Steps 7 and 8 built (2026-10-22/24).** *Superseded 2026-10-24: was
"Steps 7–8 decided", because both were built.* The persistent shared **daemon**, the TypeScript
**SDK** and the MCP as an SDK client exist (`docs/plans/2026-10-21-step6-daemon-and-protocol-v2.md`,
as-built in `…-asbuilt.md`). **Step 7 built and E2E-run (2026-10-22/23, Runs 8–10):** actors on
different tabs in parallel — handles, leases, the visibility lock, tab events, error codes, data
results with the formatters in the SDK, `browser_focus_tab`, the MCP cursor
(`docs/plans/2026-10-21-step7-multi-actor-tabs.md`, as-built `…-asbuilt.md`); closed, every decision
ruled (decisions.md · 2026-10-23 · The user rules on R9-SCREEN-2 and the last five Step 7 open
decisions (#69)). *Superseded 2026-10-24 (Step 8 propagator): was "its gate waits for the user on
R9-SCREEN-2's positive control and the open decisions #37, #40, #46, #51, #54", because #69 ruled them.*
*Corrected 2026-10-23 (Step 7 propagator): was "waits for the user's rulings", because #68 ruled the rest.* **Step 8 built and
E2E-run (2026-10-23/24, Runs 11 (FE) and 12 (S6)):** locators resolved by the snapshot's rules,
`waitFor {locator}`, `evaluate {asRef}`, the typed `Tab` with the client's cursor, failure reports,
the background-input policy `focusFirst`, the Step 6 compatibility path removed, `code` required, the
session marker, the MCP's `browser_use_active_tab` (23 tools), the first recipes
(`docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor.md`, as-built `…-asbuilt.md`, reports in
`…-steps/`); its open decisions were ruled in wave W2 (decisions.md #106–#127) and Step 8 closed 2026-10-24.
*Superseded 2026-10-24: was "its open decisions are listed in `docs/decisions.md` → Open decisions", because W2
ruled them.* **Step 9 built and E2E-run (2026-10-24, Run 13):** the kill switch, the JavaScript switch and the
block list, enforced by one gate in the extension (`docs/plans/2026-10-24-step9-phase-e-safety.md`, as-built
`…-asbuilt.md`); its gate waits on the user's ruling on Run 13 (#192).
*Superseded 2026-10-24: was "Next: Step 8 (SDK surface, cursor tools, the background-input policy) —
`docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md`, plan `docs/plans/2026-10-21-step8…`",
because Step 8 was built and run (Step 8 as-built register).*
*Superseded 2026-10-23: was "its live E2E waits for the D6 wave … they all drive the one active tab:
actors on different tabs in parallel is Step 7", because W1 ran and Step 7 was built.*
