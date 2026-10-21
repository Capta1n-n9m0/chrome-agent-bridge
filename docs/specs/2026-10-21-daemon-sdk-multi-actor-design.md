# Daemon, SDK and Multi-Actor Control — Design Spec

- **Date:** 2026-10-21
- **Status:** Approved in discussion (implementation not started). Plans: `docs/plans/2026-10-21-step6-daemon-and-protocol-v2.md`, `…step7-multi-actor-tabs.md`, `…step8-sdk-surface-and-mcp-cursor.md`.
- **Owner:** Abbas Aliyev (@Capta1n-n9m0)
- **Supersedes in part:** `2026-06-04-chrome-real-profile-agent-bridge-design.md` §3 "Controller: MCP server", §4 topology, and the "Tab targeting: active tab" decision. Everything about the extension's perception/action model stands.

---

## 1. Background & motivation

The bridge works: 21 MCP tools drive the real logged-in profile, E2E-verified over five runs. But the
only way to *script* it today is what the `blackboard-ultra` skill does — a 400-line `bb.js` eval'd
into a tab through `browser_evaluate`, booted via a side HTTP server on port 8765, with Claude in the
loop for every call. That works for Blackboard because Blackboard has a REST API behind the page. It
does not generalise to "click through this UI" tasks, every rerun costs tokens, and a human watches.

The field has gone the same way we want to go — browser-use's *workflow-use* ("record once, run a
million times without AI"), Stagehand's observe→act caching, Playwright's planner/generator/healer
agents — but none of them run against the user's **real** Chrome profile. That is the differentiator
this project already has.

Three problems turned out to have one solution:

1. **No scripting SDK.** A program (not Claude) cannot call the primitives.
2. **One Claude session at a time.** Port 9234 is owned by the MCP process; a second session finds
   it busy (handled gracefully since Phase B, but still exclusive).
3. **The orphan problem, inverted.** `lifecycle.ts` (2026-10-21) makes the server exit with its
   session precisely because a lingering process on 9234 was a bug. A persistent daemon makes that
   lingering process the *design*, so its lifecycle has to be deliberate.

> Mental model: **Claude explores once interactively, writes a script, the script runs forever for
> free — against the same logged-in Chrome, while Claude (or a second Claude) keeps working in
> another tab.**

## 2. Goals & non-goals

### Goals
- A **daemon** between any number of clients and the one extension: started by whoever knocks first,
  shared by everyone after, exits when idle.
- A **TypeScript SDK** (`@bridge/sdk`) that scripts — primarily Claude-written scripts and skills —
  use to drive the browser with typed calls and structured results.
- The **MCP server becomes an SDK client**: tool schemas + text rendering, no protocol code of its own.
- **Several actors at once** (two Claude sessions, a script and a Claude session, two scripts) on
  different tabs, in parallel, without their actions mixing.
- **Failures that explain themselves**: structured error codes, and SDK errors that carry a snapshot,
  a screenshot and the recent network entries — the "honest v1" of failure handling.

### Non-goals (YAGNI)
- Self-healing / "Claude fixes the broken step" hooks (Agent SDK in the loop). Good error reports are
  enough; revisit after watching real scripts break.
- A Python (or any non-Node) SDK. The wire protocol is plain JSON over WebSocket; a port later is small.
- Bun. Node + TS stays.
- A second trust boundary. Clients present the same token the extension presents (see §9). Token
  design is a separate future direction.
- Remote-over-network control. Still `127.0.0.1` only.
- Queueing or turn-passing between actors who want the *same* tab. Fail fast instead (§6.3).
- Making a background tab believe it is visible (§7.3 explains why not).

## 3. Key decisions

| Decision | Choice | Rationale |
|---|---|---|
| Topology | **Daemon hosts 9234; MCP and scripts are clients of it** | One extension socket shared by all; solves SDK + multi-session + orphan at once. |
| Who starts the daemon | **Whoever knocks first** (MCP or script); the port bind is the lock | No lock file, no race: both starters try to bind, the loser goes back to knocking. |
| Daemon lifetime | **Idle-exit after 10 min with zero clients** + **version handover** | Cheap to restart (extension reconnects on its own); a stale daemon cannot outlive a `npm run build` for long. |
| Wire protocol | **Same `{id,method,params}` RPC, extended**: hello with role/name/build, structured errors, events | The protocol was already a good RPC; the extension needs almost no change to keep speaking it. |
| Payloads | **Extension returns data; MCP renders prose; nothing in between touches the payload** | Scripts need structures, models need text; formatters are pure and move to where the text is needed. |
| Tab addressing | **Daemon-minted handles (`T3`), never raw Chrome ids** | Chrome ids change on restart and on Memory-Saver discard (`tabs.onReplaced`). |
| Multi-actor model | **Named actors, per-actor cursor + tab leases, background execution, a visibility lock only for screen-needing instructions** | Synthesis of the two models discussed (§6.1). |
| Screenshot of a background tab | **Switch-shoot-restore (default) under the visibility lock; CDP `Page.captureScreenshot` opt-in** | Default keeps today's banner-free quality; opt-in avoids stealing the screen from a human. |
| MCP's current tab | **Does not follow the human.** Starts at the active tab on first touch, then stays until Claude or the user says otherwise | A human checking email mid-task must not redirect Claude's next click into Gmail. |
| Primary consumer | **Claude-written scripts and skills** | Shifts polish from API sugar to precise types + JSDoc and errors that contain the fix (§8). |
| Packages | `shared/ extension/ daemon/ sdk/ mcp/` — `server/` renamed to `daemon/`, MCP split out, MCP depends on SDK | Four parts that evolve independently; one client code path exercised by both consumers. |

## 4. Topology

```
 Claude Code #1 ─ stdio ─ mcp/ ─┐                     (clients: same token, role "client", a name)
 Claude Code #2 ─ stdio ─ mcp/ ─┼─ ws://127.0.0.1:9234 ─┐
 export-grades.ts ── sdk/ ──────┘                        │
                                                         ▼
                                              ┌─────────────────────┐
                                              │  daemon/            │  registry · handles · leases
                                              │  (detached node)    │  visibility lock · idle exit
                                              └──────────┬──────────┘
                                                         │ one socket, role "extension"
                                                         ▼
                                              ┌─────────────────────┐
                                              │  extension/ (MV3)   │  offscreen socket · SW router
                                              │  real Chrome profile│  content script · chrome.debugger
                                              └─────────────────────┘
```

The extension still dials out to 9234 and still cannot tell it is talking to a daemon rather than to
the old server: a v1 hello (no `role`) is treated as `role: "extension"`.

## 5. Layer contract — who returns what

| Layer | Does | Does not |
|---|---|---|
| **Extension** | Capabilities. Every method takes an explicit `tabId`. Structured results: `snapshot → {url, title, elements: [{ref, role, name, value?, disabled?, checked?, …}], truncated}`, `networkRequests → {entries, total, pending, recordingSince}`, `evaluate → EvalEnvelope`. Structured errors `{code, message, data?}`. Emits tab lifecycle **events**. | Build text for a model (today's snapshot and network formatters move out — they are pure, their tests move with them). Know that several actors exist. |
| **Daemon** | Connection registry (one extension, N clients), hello/token/build check, request routing with id remapping, per-call timeouts, **handles**, **leases**, the **visibility lock**, interception of the tab methods, idle exit, `daemon.*` methods. | Know anything about pages. Its own error codes: `NOT_CONNECTED`, `TIMEOUT`, `TAB_HELD`, `TAB_GONE`, `TAB_UNKNOWN`, `LOCK_TIMEOUT`, `VERSION`, `UNKNOWN_METHOD`, `BAD_PARAMS`. |
| **SDK** | `connect()` with knock → spawn → handover; `BridgeClient.call()`; typed `Tab` API; locators; wait/retry policy; the per-actor **cursor**; **failure enrichment** (a thrown `BridgeError` carries code, snapshot, screenshot path, last N network entries); the pure formatters (`formatSnapshot`, `formatNetwork`) so scripts *can* print what the model sees. | Decide how a model reads things. |
| **MCP** | *Is an SDK client.* Tool schemas, text rendering, the active-tab-on-first-touch convenience, exit-with-session lifecycle (today's `lifecycle.ts` moves here unchanged). | Any protocol code. |

Consequence: `mcp/` shrinks to "SDK call → render", and one client path is tested by both consumers.

## 6. Multi-actor control

### 6.1 The two models and the synthesis

**Model A — "actor cursor + turn scheduler"** (the original idea): each actor connects with a name; the
daemon keeps its *cursor* (the tab it last touched); instructions never mention tabs; when an actor's
instruction runs, the daemon makes its cursor the active tab, runs the instruction, releases the turn.
Instruction-level locking, so interleaving is safe and the actor's mental model stays "the active tab".

Kept from A: **named actors** (errors say *who* holds a tab), the **cursor** (scripts should not pass a
tab to every call), **instruction-level** pausing.

Why not A as the execution model: the visible tab is one global resource, so every instruction from
every actor would serialise through it even when nothing needs the screen; activating a tab is
asynchronous and has side effects (`visibilitychange`, paused media, throttled timers, SPA refetches);
and the human using the same Chrome would have the view stolen on every instruction.

**Model B — "tab leases, background execution"**: every call carries a tab; the daemon enforces that
a tab is acted on by one actor; calls run on the tab *where it is*, in the background.

What makes B possible — verified by reading the extension: every handler resolves the target through
one function (`extension/src/tabs.ts: activeTab()`), and **only one Chrome API in the whole extension
needs the tab to be visible**: `chrome.tabs.captureVisibleTab` (the viewport screenshot). `executeScript`,
`chrome.debugger`, `webRequest`, `tabs.update` all work on a background tab.

**Synthesis (chosen):** A's table — named actors, cursors — kept in the daemon; B's rule — act on the
tab where it is; and a **visibility lock** that only the screen-needing instructions take, which is
A's instruction-level turn scoped to the few instructions that need it.

```
actor "export-grades.ts"             actor "claude-code #4412"
  cursor T3, leases {T3, T5}           cursor T1, leases {T1}

click T3 ─────────────┐                snapshot T1 ─────┐        ← both run now, no lock
                      ▼                                 ▼
             executeScript(tabId 412)          executeScript(tabId 388)

screenshot T3 ──► acquire VISIBILITY ─► activate 412 ─► capture ─► restore ─► release
screenshot T1 ──► waits for the lock ─────────────────────────────────────────► its turn
```

### 6.2 Handles

Actors never see Chrome tab ids. The daemon mints handles `T1, T2, …` (monotonic per daemon lifetime)
and owns `handle → chromeTabId`. The extension emits `tabCreated {tabId, openerTabId?, url}`,
`tabRemoved {tabId}`, `tabReplaced {addedTabId, removedTabId}`; the daemon remaps on `tabReplaced`
(Memory Saver discard, prerender swap) and marks the handle dead on `tabRemoved` — a later call gets
`TAB_GONE { lastUrl, lastTitle }`, so the error tells you what was lost. A tab that a page opens itself
(`target=_blank`, a popup) carries `openerTabId`; the daemon leases it to the opener's holder and tells
that client (`leaseGranted {tab, reason: "opener"}`), so "click Export, a new tab appears" just works.

### 6.3 Leases

- A tab is held by the actor that opened it (`newTab`), claimed it (`tabs.claim`), or received it by
  the opener rule. Leases die with the connection.
- A call on a tab held by someone else → `TAB_HELD { owner, since }`, **fail fast**. Two actors wanting
  one tab is a design error in the scripts, not a scheduling event. (Future option, not v1: read-only
  `snapshot` on a foreign tab via generation-stamped refs `s7.e12`, which would also catch stale refs.)
- Calls touching no tab — `listTabs`, `networkRequests` (any scope), `daemon.status` — are free.
- `tabs.release {tab}` gives a tab up; `tabs.claim {tab}` on an unheld tab takes it; `tabs.claim
  {active: true}` claims whatever the human is looking at (the MCP's first-touch move).

### 6.4 The visibility lock

- One daemon-wide async mutex. Taken for the duration of a single call by methods flagged
  *needs-screen*: `screenshot` (viewport, default mode) and `focusTab`.
- Waiting is bounded by the call's own timeout → `LOCK_TIMEOUT`; the holder's call timing out or its
  connection closing releases it, so a hung screenshot cannot wedge everyone.
- Always taken, even if the target happens to be active — uncontended it costs nothing, and the
  extension skips the switch when the tab is already active.

### 6.5 The human

The human is an actor the daemon cannot model: they can click anything at any time, and their
active tab is theirs. Rules that follow: nothing the bridge does changes the active tab except a
screen-needing instruction (which restores it) or an explicit `focusTab`; and the MCP's current tab
does not follow the human (§8.3).

## 7. Screenshots

`chrome.tabs.captureVisibleTab` photographs *what is on screen in a window*; it cannot capture a
background tab. Two modes, both already partly in the code (`fullPage` goes through CDP today):

| Mode | How | Banner | Visible effect | Default for |
|---|---|---|---|---|
| **`switch`** (default) | under the visibility lock: remember the window's active tab → activate target → wait for activation (+ one frame) → `captureVisibleTab` → re-activate the previous tab | no | the tab flashes on screen for ~100–200 ms unless it was already active (then nothing switches) | MCP; humans watching Claude see exactly today's behaviour |
| **`cdp`** (opt-in) | `chrome.debugger` → `Page.captureScreenshot` on the background tab; no lock | yes (~100 ms attach) | none — the human's view is untouched | unattended scripts sharing Chrome with a human |

E2E must establish: `captureVisibleTab` on a *minimized* window (expected to fail — report
`WINDOW_MINIMIZED`), whether CDP renders a tab in a minimized window, and whether `switch` is reliable
across two windows (the lock is global; the activation is per window).

### 7.3 "Render a background tab as if it were active" — needs Chrome launch flags; a later step

CDP `Page.captureScreenshot` already forces the compositor to produce a frame for a background tab —
that *is* the `cdp` mode. What an extension cannot do is make `document.visibilityState` read
`"visible"`, un-throttle timers, or un-pause media for a tab that is not shown. Chrome exposes those
only as **launch flags** — `--disable-renderer-backgrounding`, `--disable-backgrounding-occluded-windows`,
`--disable-background-timer-throttling` — i.e. on the Chrome shortcut, not from inside the profile.
**Decision (2026-10-21): a separate future step** adds these flags to the user's Chrome shortcut (and
documents what each changes for the rest of the browser: battery, every background tab un-throttled),
so that `cdp`-mode scripts see a fully live background tab. Until then the `switch` mode is the way to
get a tab rendered exactly as the user would see it. The one adjacent lever available today is
`Emulation.setFocusEmulationEnabled`, which makes the page believe it has *focus* (Playwright uses it
to drive many pages in one headed browser) — that is the tool for trusted input into a background tab,
and it is on Step 7's E2E list.

## 8. SDK and the MCP as its client

### 8.1 Shape

```ts
import { connect } from "@bridge/sdk";

const b = await connect({ name: "export-grades.ts" });     // knocks; starts the daemon if absent
const tab = await b.newTab("https://ada.blackboard.com/ultra/courses/_19192_1/outline");
await tab.waitFor({ role: "button", name: "Create" });
await tab.click({ role: "button", name: "Create" });
await tab.type({ role: "textbox", name: "Title" }, "Week 7", { trusted: true });
const rows = await tab.evaluate<{ id: string }[]>(`[...document.querySelectorAll("tr")].map(r => ({ id: r.id }))`);
await tab.download(url, "C:/exports/");
await b.close();
```

- Every action accepts a **ref** (`"e12"`) or a **locator** (`{role, name}`, `{text}`, `{css}`). A
  locator is resolved in the content script by the same walk that builds the snapshot (same role and
  accessible-name rules), so what Claude saw in a snapshot is what a locator matches.
- `tab.waitFor({locator})` is the primitive that makes scripts robust to SPAs.
- `tab.evaluate()` returns `EvalEnvelope.value`, typed by the caller; a `kind: "node"` result can be
  turned into a ref (`tab.refOf(result)`) — "find it with JS, act on it with trusted input".
- `b.tab()` is the actor's **cursor** (last created / selected), so `b.click(...)` without a tab works.

### 8.2 Why "Claude writes the scripts" shifts polish toward errors

A human learns an API once and benefits from sugar daily. Claude writes each script fresh from the
**types + JSDoc** (that *is* its documentation) and then iterates on **whatever the error says**. So the
two investments that let Claude succeed in one or two iterations without a human are: a small
orthogonal API with precise types, and errors that contain the fix. Concretely a `BridgeError` has:

```
code:     LOCATOR_NOT_FOUND
message:  no button named "Create" on T3 (https://…/outline). Nearest: button "Create item",
          button "Create folder".
data:     { tab: "T3", url, locator, candidates: [...] }
snapshot: SnapshotResult            (attached by the SDK on failure, when attachable)
screenshot: "…/bridge-failures/2026-10-21T12-01-33-T3.png"
network:  NetworkEntry[]           (last 20 for the tab)
```

`error.message` plus `formatSnapshot(error.snapshot)` is what a script prints by default. The MCP
renders the same fields as text. Nothing here needs a model in the loop.

### 8.3 MCP cursor semantics

- Actor name `claude-code #<pid>`; one MCP process per Claude Code session, as today.
- On the first tab-touching tool with no `tab` argument, the MCP **claims the active tab** and sets
  its cursor there. From then on the cursor **stays** — the human switching tabs does not move it.
- Every tool takes an optional `tab` (a handle from `browser_list_tabs`).
- New tools: `browser_use_active_tab` ("work in the tab I just opened": claims the current active tab
  and moves the cursor) and `browser_focus_tab` (bring the cursor's tab on screen, under the lock).
  `browser_select_tab {tab}` moves the cursor and claims, **without** activating on screen.
- `browser_status` reports the cursor, its lease, and whether it differs from the human's active tab.
- `browser_list_tabs` shows handles, owners (actor names) and the human's active marker.

## 9. Daemon lifecycle

1. **Knock.** A client connects to `127.0.0.1:9234`. `ECONNREFUSED` → it spawns the daemon.
2. **Detached spawn.** `spawn(process.execPath, [daemon/dist/index.js], { detached: true, stdio:
   "ignore", windowsHide: true })` + `unref()`. The daemon therefore has no stdio; it logs to
   `~/.chrome-agent-bridge/daemon.log` (size-capped), counts only, never URLs or tokens.
3. **The bind is the lock.** Two starters that both saw `ECONNREFUSED` both spawn; the loser's daemon
   gets `EADDRINUSE` and exits at once; the loser client simply keeps knocking (up to 10 s).
4. **Hello / welcome.** Client → `{type:"hello", token, role:"client", name, build, proto: 2}`.
   Daemon → `{type:"welcome", build, proto, clientId, extensionConnected}`. Extension hellos carry no
   `role` and get the same `welcome` (the router ignores a message without `id`+`method`).
5. **Version handover.** `build` is the sha256 of `daemon/dist/index.js`. A client whose expected
   build (it hashes the file it would spawn) differs from `welcome.build` sends `daemon.shutdown`,
   waits for the port to free, spawns, reconnects. Other clients see their socket close and reconnect
   with the same logic — so after `npm run build` the first client to connect upgrades the daemon for
   everyone. The extension reconnects on its own (`ReconnectingClient`, 0.5–10 s backoff).
6. **Idle exit.** Zero *clients* (the extension does not count) for 10 min → exit. Also `daemon.shutdown`.
7. **Waiting for Chrome.** A fresh daemon has no extension yet; the SDK's `connect({ waitForExtensionMs })`
   waits for the `extensionStatus {connected:true}` event (default 15 s) before resolving, so a script
   does not start with `NOT_CONNECTED`. *Amended 2026-10-22: `connect({ requireExtension: false })`
   skips the wait and resolves on the welcome; the MCP uses it so that Chrome closed reads as before
   Step 6 (decisions.md · 2026-10-22 · #27, stage D5b).*
8. **Token.** Same token as the extension. Source of truth: `bridge.token` at the repo root (gitignored);
   `BRIDGE_TOKEN` env overrides (the MCP config still passes it that way). The daemon reads it the
   same way; a client that cannot find a token fails before knocking with a message naming both places.
9. **MCP exit-with-session** stays exactly as implemented in `lifecycle.ts`, moved to `mcp/`. The
   daemon gets none of it — it is meant to outlive sessions.

## 10. Protocol v2 (normative summary; `shared/src/protocol.ts` is the source)

```
hello    C→D  {type:"hello", token, role?: "extension"|"client", name?, build?, proto?: 2}
welcome  D→C  {type:"welcome", build, proto: 2, clientId, extensionConnected}
request  C→D  {id, method, params?, timeoutMs?}          (D→E: same, id remapped)
response D→C  {id, result} | {id, error:{code, message, data?}}
event    E→D  {event, params}   tabCreated | tabRemoved | tabReplaced | (later: console, navigation)
event    D→C  {event, params}   tabGone | leaseGranted | extensionStatus
```

- **Tab parameter.** Clients pass `tab: "T3"` (handle) in `params`; the daemon resolves it to
  `tabId: 412` before forwarding and strips the handle. The extension never sees handles.
- **Daemon-handled methods** (never forwarded): `daemon.status`, `daemon.shutdown`, `tabs.claim`,
  `tabs.release`. **Intercepted** (forwarded, then annotated/recorded): `listTabs` (adds handles,
  owners), `newTab` (mints a handle, leases it to the caller, sets nothing else), `closeTab`.
- **Error codes** (`shared/src/codes.ts`): daemon — `NOT_CONNECTED TIMEOUT UNKNOWN_METHOD BAD_PARAMS
  TAB_HELD TAB_GONE TAB_UNKNOWN LOCK_TIMEOUT VERSION`; extension — `REF_STALE LOCATOR_NOT_FOUND
  LOCATOR_AMBIGUOUS OFFSCREEN RESTRICTED_URL DEBUGGER_ATTACH DEBUGGER_CANCELLED DEBUGGER_DEVTOOLS
  PAGE_ERROR NAV_FAILED DOWNLOAD_HTTP WINDOW_MINIMIZED INTERNAL`. The extension's `Router` serialises a
  thrown `BridgeError {code, data}`; a plain `Error` becomes `INTERNAL` with its message, so nothing
  is lost during the migration.
- **Compatibility.** A v1 hello is accepted as an extension. A v1 error `{message}` from an old
  extension is wrapped as `INTERNAL`. Beyond that, extension and daemon of this generation ship
  together — nothing else speaks the protocol yet.

## 11. Repository layout after the work

```
shared/     protocol v2 types + guards, error codes, (pure) locator types
extension/  unchanged structure; handlers take tabId; events; BridgeError; formatters removed
daemon/     ← server/ renamed: wsHost, connection, handshake, startup + registry, handles, leases,
            lock, intercept, idle, log; entry spawns nothing, just listens
sdk/        BridgeClient (knock/spawn/handover), Tab, locators, BridgeError, format/, download
mcp/        entry (stdio) + tools registry over the SDK + lifecycle.ts + config
recipes/    Claude-written scripts; first dogfood: a Blackboard export, and a one-line bb.js boot
```

`npm test` and `npm run typecheck` cover all five packages; `npm run build` builds daemon, mcp, sdk
and extension. Scripts run with `tsx` (dev dependency) until Node's type stripping is the floor.

## 12. Risks and what E2E must settle

| Risk | Mitigation / what to measure |
|---|---|
| Trusted CDP input into a background tab behaves differently from an active one | E2E in Step 7; `Emulation.setFocusEmulationEnabled` is the lever if focus matters. Fallback: the SDK's `focus()` before trusted input. |
| `evaluate` code that needs document focus (clipboard) fails in a background tab | Already known (EVAL run 5); documented; `tab.focus()` exists for it. |
| Switch-shoot-restore flickers or races | Wait for `tabs.onActivated` + one frame before capture; measure; `cdp` mode is the escape. |
| Detached spawn on Windows leaves a console window or dies with the parent | `windowsHide`, `stdio: "ignore"`, `unref()`; test with the nvm shim in between, as for `lifecycle.ts`. |
| A stale daemon keeps running old code | Build-hash handover (§9.5); `daemon.status` prints the build and uptime. |
| Two daemons race for the port | The bind is the lock; the loser exits; verified by starting two scripts simultaneously. |
| Idle exit while a long script sleeps between calls | Idle counts *connections*, not calls; a connected client is never idle. |
| Handles leak | Dead handles are kept for the error message only and pruned after 1 h / 1 000 entries. |

## 13. Open questions (not blocking)

- Should `tabs.claim` on a held tab offer `{wait: true}` for the rare legitimate hand-over between a
  script and a Claude session? Decide after the first real collision.
- Token design beyond "one shared secret" — a separate direction, out of scope here.
- Generation-stamped refs (`s7.e12`) for stale-ref detection and read-only foreign snapshots.
- **Chrome launch flags for live background tabs** (§7.3) — a step of its own after Step 8: a
  documented shortcut change, plus `daemon.status` detecting whether Chrome runs with them.
