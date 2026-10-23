# Daemon, SDK and Multi-Actor Control — Design Spec

- **Date:** 2026-10-21
- **Status:** Approved in discussion (implementation not started). *Corrected 2026-10-22: was
  "implementation not started"; as built Step 6 (§4, §5's daemon/SDK/MCP rows, §9, §10 without tabs,
  §11) is built — stages D0–D5b, 542 tests — and its live E2E waits for the D6 wave; contracts and
  deviations in `docs/plans/2026-10-21-step6-daemon-and-protocol-v2-asbuilt.md`.* *Corrected
  2026-10-23 (Step 7 propagator): Step 6 closed on 2026-10-22, after wave W1. Step 7 (§5's extension row,
  §6, §7, §10's tab parts) is built and E2E-run (Runs 8–10). It has 22 tools and 950 tests in 59 files
  (`npm test` at `9cfc7db`); its gate waits on the user's remaining items. Step 8 (§8) is planned.
  Contracts and deviations: `docs/plans/2026-10-21-step7-multi-actor-tabs-asbuilt.md`.* *Corrected
  2026-10-24 (Step 8 S7): Step 8 (§8, with §5, §10 and §13 where noted below) is built and E2E-run
  (Runs 11–12): 23 tools, 1714 tests in 85 files (`npm test` at `eb6b991`); its gate waits on the
  user's open decisions. Contracts and deviations: `docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-asbuilt.md`.* Plans: `docs/plans/2026-10-21-step6-daemon-and-protocol-v2.md`, `…step7-multi-actor-tabs.md`, `…step8-sdk-surface-and-mcp-cursor.md`.
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

*Corrected 2026-10-23: the Tab addressing rationale was doubted by Step 7's Stage 0 audit (F7: Chrome's
docs tie `tabs.onReplaced` to prerendering, and a 2024 Chromium change discards by clearing the
document, so the id was expected to stay). Measured on Chrome 156 (Step 7 Run 8, LEASE-6, outcome (b)):
an Urgent Discard from `chrome://discards` **did** give the tab a new id, `tabReplaced` fired, and the
handle kept working — the rationale stands as written (`docs/plans/2026-10-21-step7-multi-actor-tabs-steps/T5-run-record.md`
§ LEASE-6; decisions.md · 2026-10-22 · LEASE-6 measures whether a discard keeps the tab id, with both
outcomes pre-written).*

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
*Corrected 2026-10-23 (Step 7 propagator): as built since Step 7 T1, the extension's hello is `{type:
"hello", token, role:"extension", proto:2}`. A Step 6 daemon accepts it. A Step 7 daemon still accepts a
hello with no `proto`, but it then answers every tab-carrying method with `VERSION` and a reload hint,
because such an extension ignores `tabId` and would act past every lease (decisions.md · 2026-10-22 · A
stale extension is refused for tab calls, detected by its hello (#42)) — see Step 7 as-built § Stage T1,
§ Stage T2.*

## 5. Layer contract — who returns what

| Layer | Does | Does not |
|---|---|---|
| **Extension** | Capabilities. Every method takes an explicit `tabId`. Structured results: `snapshot → {url, title, elements: [{ref, role, name, value?, disabled?, checked?, …}], truncated}`, `networkRequests → {entries, total, pending, recordingSince}`, `evaluate → EvalEnvelope`. Structured errors `{code, message, data?}`. Emits tab lifecycle **events**. | Build text for a model (today's snapshot and network formatters move out — they are pure, their tests move with them). Know that several actors exist. |
| **Daemon** | Connection registry (one extension, N clients), hello/token/build check, request routing with id remapping, per-call timeouts, **handles**, **leases**, the **visibility lock**, interception of the tab methods, idle exit, `daemon.*` methods. | Know anything about pages. Its own error codes: `NOT_CONNECTED`, `TIMEOUT`, `TAB_HELD`, `TAB_GONE`, `TAB_UNKNOWN`, `LOCK_TIMEOUT`, `VERSION`, `UNKNOWN_METHOD`, `BAD_PARAMS`. |
| **SDK** | `connect()` with knock → spawn → handover; `BridgeClient.call()`; typed `Tab` API; locators; wait/retry policy; the per-actor **cursor**; **failure enrichment** (a thrown `BridgeError` carries code, snapshot, screenshot path, last N network entries); the pure formatters (`formatSnapshot`, `formatNetwork`) so scripts *can* print what the model sees. | Decide how a model reads things. |
| **MCP** | *Is an SDK client.* Tool schemas, text rendering, the active-tab-on-first-touch convenience, exit-with-session lifecycle (today's `lifecycle.ts` moves here unchanged). | Any protocol code. |

Consequence: `mcp/` shrinks to "SDK call → render", and one client path is tested by both consumers.

*Corrected 2026-10-23 (Step 7 propagator), on the as-built state of the four rows:*
- *Extension: "every method takes an explicit `tabId`" holds on the wire from the Step 7 daemon. The
  extension still falls back to the human's tab, with a warning, when `tabId` is absent, for one
  release; Step 8 S2 removes the fallback.* *Corrected 2026-10-24 (Step 8 S7): as built the fallback
  was removed by stage S2b, not S2; an absent `tabId` is now `BAD_PARAMS` (Step 8 as-built § S2b).
  The SDK row's typed `Tab`, locators and failure enrichment are built (§ S3, § S4), and the formatters
  are also exported from the main entry (decisions.md · 2026-10-23 · S3.4 applies as written: the main
  entry also re-exports the formatters (#75)).*
- *SDK: the formatters `formatSnapshot` and `formatNetwork` exist in `sdk/src/format/`. They are exported
  through the `@bridge/sdk/format` subpath, not the main entry (decisions.md · 2026-10-22 · The
  formatters reach the MCP through a `@bridge/sdk/format` subpath (#46), open for the user).*
- *SDK: the typed `Tab`, locators and failure enrichment are Step 8's.*
- *MCP: the active-tab-on-first-touch cursor is built (`mcp/src/cursor.ts`).*

*See Step 7 as-built § Stage T1, § Stage T4.*

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

*Corrected 2026-10-23 (Step 7 Stage 0 F13): the event params were not fully specified here and differed
from the Step 7 plan; as built (`shared/src/protocol.ts`, Step 7 T0) they are `tabCreated {tabId,
openerTabId?, url}`, `tabRemoved {tabId, lastUrl?, lastTitle?}` (the extension sends the last URL and
title, which `TAB_GONE` needs), `tabReplaced {addedTabId, removedTabId}`, the daemon's `tabGone {tab,
lastUrl?, lastTitle?}`, and `leaseGranted {tab, reason: "opener", url}`. `tabCreated.url` is often empty
for a popup, so the daemon polls `listTabs` (≤ 2 s) to fill `leaseGranted.url` (T5b). Run 8 LEASE-6
confirmed the remap on a Memory-Saver discard (see the note under §3).*

### 6.3 Leases

- A tab is held by the actor that opened it (`newTab`), claimed it (`tabs.claim`), or received it by
  the opener rule. Leases die with the connection.
- A call on a tab held by someone else → `TAB_HELD { owner, since }`, **fail fast**. Two actors wanting
  one tab is a design error in the scripts, not a scheduling event. (Future option, not v1: read-only
  `snapshot` on a foreign tab via generation-stamped refs `s7.e12`, which would also catch stale refs.)
- Calls touching no tab — `listTabs`, `networkRequests` (any scope), `daemon.status` — are free.
- `tabs.release {tab}` gives a tab up; `tabs.claim {tab}` on an unheld tab takes it; `tabs.claim
  {active: true}` claims whatever the human is looking at (the MCP's first-touch move).

*Corrected 2026-10-23 (Step 7 propagator), on what was built:*
- *The free list also holds `downloadStart`, `downloadChunk` and `downloadEnd` (decisions.md ·
  2026-10-22 · The daemon's method classes are one table, and the download methods are free (#39)).*
- *`networkClear {tab:"all"}` is refused with `TAB_HELD` while any other client holds any tab (#40 as
  amended by #57).*
- *"Whatever the human is looking at" is the active tab of the last-focused **normal** window
  (decisions.md · 2026-10-22 · "The human's tab" is the active tab of the last-focused normal window
  (#43)).*
- *For one release a Step 6 client's untargeted call goes through a legacy path: it is resolved to
  the human's tab and lease-checked, but grants no lease (#41, #54).*

*See Step 7 as-built § Stage T2.*

### 6.4 The visibility lock

- One daemon-wide async mutex. Taken for the duration of a single call by methods flagged
  *needs-screen*: `screenshot` (viewport, default mode) and `focusTab`.
- Waiting is bounded by the call's own timeout → `LOCK_TIMEOUT`; the holder's call timing out or its
  connection closing releases it, so a hung screenshot cannot wedge everyone.
- Always taken, even if the target happens to be active — uncontended it costs nothing, and the
  extension skips the switch when the tab is already active.
- *Corrected 2026-10-23 (Step 7 propagator), on what was built:*
  - *`selectTab`, the one-release alias of `focusTab`, takes the lock too (decisions.md · 2026-10-22 ·
    `selectTab` takes the visibility lock, like `focusTab` (#53)).*
  - *`mode:"cdp"` and a truthy `fullPage` do not take it.*
  - *One deadline per call bounds the lock wait and the forwarded call together (decisions.md ·
    2026-10-22 · One deadline per call covers the lock wait and the forwarded call (#44)).*
  - *"Costs nothing" holds for the lock. The switch itself costs about 1.5 s of flash (see §7).*

  *See Step 7 as-built § Stage T2.*

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

*Superseded 2026-10-23: was "`cdp` … on the background tab; … none — the human's view is untouched;
default for unattended scripts", because Step 7 Run 8 measured `Page.captureScreenshot` never returning
for a hidden tab (SCREEN-2: `TIMEOUT` after 35 s, banner up) or a minimized window (SCREEN-4: 25 s). As
built since Step 7 T5b, `cdp` refuses before attaching: `OFFSCREEN` for a tab that is not active in its
window, `WINDOW_MINIMIZED` for a minimized window (3 ms each, no banner; Run 9 R9-SCREEN-2/-4;
decisions.md · 2026-10-23 · T5b's three fixes). So `cdp` captures only a tab already in front of a
visible window, and today no mode captures a background tab without switching to it.*
*Corrected 2026-10-23: the `switch` row's "~100–200 ms" flash was measured at ~1.5 s (median 1493 ms,
Run 8 SCREEN-1; 1557 ms, Run 9 R9-SCREEN-1; page-side `visibilitychange` timestamps). `switch` works
across two windows without focusing either (R9-SCREEN-5), but a window fully covered by others never
yields a capture (`TIMEOUT`; the previous tab is restored at 30 s since T5b, R9-RESTORE).*

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
*Corrected 2026-10-23: the first sentence did not hold. Run 8 SCREEN-2 measured a `cdp` capture of
a hidden background tab hanging (`TIMEOUT` after 35 012 ms; `T5-run-record.md`, SCREEN-2), so since T5b
`cdp` mode refuses such a tab at once with `OFFSCREEN` or `WINDOW_MINIMIZED` (decisions.md · 2026-10-23 ·
T5b's three fixes (#63)). Focus emulation was not on any run: no bridge method sends
`Emulation.setFocusEmulationEnabled`, so BG-1/BG-2's retry was recorded as not run and returns as a
proposed decision for Step 8 (decisions.md · 2026-10-22 · BG-1/BG-2's focus-emulation retry cannot run
in this wave (#61)). The three launch flags above did not fix trusted input either: a trusted click and
trusted typing into a background tab still answered `ok` and did nothing (Run 10 BGF-1/2; decisions.md ·
2026-10-23 · Chrome's anti-throttling flags do not fix background input (#66)).*
*Corrected 2026-10-24 (Step 8 S7): Step 8 stage FE added the lever (`focusEmulation: true` on trusted
`click`/`type`/`pressKey`) and measured it (Run 11): it does not deliver trusted input to a background
tab either — click 0/3, typing 2/3, key press 0/3 — while the target page reads `visible` during the
call. The SDK therefore focuses first (decisions.md · 2026-10-23 · The background-input policy (#89)).*

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

*Corrected 2026-10-24 (Step 8 S7), on what Step 8 built (as-built § S1, § S2, § S3; the sketch above
stays as written):*
- *`waitFor` takes a locator in its own arm, `tab.waitFor({locator, state?, timeoutMs?})`, beside
  `{text}`, `{networkIdle}` and `{seconds}`; `state: "hidden"` waits for it to go.*
- *The node → ref step is `tab.evaluateRef(expression)` (wire: `evaluate {asRef: true}` →
  `EvalEnvelope.ref`), not `tab.refOf(result)`; it marks the element with a `data-__bridge-mark`
  attribute that the content script resolves and removes (decisions.md · 2026-10-23 · S2's handler
  details … (#92)).*
- *`download(url, path)` takes a file or directory path; `{text}` matches visible text of any element
  past the snapshot's pruning gates, and `nth` is 0-based (decisions.md · 2026-10-23 · Locator rules,
  the MCP locator schema and the exported `BridgeError` (#83); · S1's locator details (#87)).*
- *The cursor changes only on `newTab`/`claim` and a 4002 reconnect; with none a call throws
  `NO_CURSOR`. Trusted `click`/`type`/`pressKey` focus the tab first (`focusFirst`, #89).*

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

*Corrected 2026-10-24 (Step 8 S7), as built in S4–S6b:* *the fields are optional properties on the
shared `BridgeError` (no subclass): `snapshot`, `screenshotPath`, `network` (last 20), `attachErrors`
and `report()` (≤ 60 lines), attached only for `LOCATOR_NOT_FOUND LOCATOR_AMBIGUOUS REF_STALE OFFSCREEN
PAGE_ERROR NAV_FAILED TIMEOUT` within one 5 s budget; PNGs go to `BRIDGE_FAILURES_DIR`, else
`~/.chrome-agent-bridge/failures/`. The attached snapshot renumbers the tab's refs, so candidate refs
are rewritten or dropped (#93). The screenshot switches the window to the failed tab (Run 12 REP-0).
The MCP renders `report()` plus a PNG image block; a report with an image is a non-error result,
because Claude Code drops images from error results (decisions.md · 2026-10-23 · An MCP failure report
with a screenshot is returned as a non-error result (#100)).*

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

*Corrected 2026-10-23 (Step 7 propagator): Step 7 T4 built these parts:*
- *the first-touch claim, and the cursor staying put;*
- *the optional `tab` on 18 tools;*
- *`browser_focus_tab`;*
- *`browser_select_tab` claiming without activating;*
- *`browser_list_tabs` printing `T3* [owner] Title — url`;*
- *a cursor lost on a 4002 reconnect or a new client, with a one-line notice (decisions.md ·
  2026-10-22 · T4's MCP cursor and tool details (#59)).*

*`browser_status` reports only the human's tab (`Active tab: [T<n>] …`). `browser_use_active_tab` and
the cursor/divergence lines are Step 8's. The tool count is 22 — see Step 7 as-built § Stage T4.*
*Corrected 2026-10-24 (Step 8 S7): Step 8 S5 built the rest — `browser_use_active_tab` (23 tools);
`browser_status` adds `Cursor:` and, only when it differs, `Human's active tab:` after the Step 7
lines, and never claims; the actions and `browser_wait_for` take a nested `locator`; `browser_new_tab`
comes to the front only when the cursor is the human's tab, else opens in the background and says so
(decisions.md · 2026-10-23 · S5's MCP details: `browser_new_tab` activation, the status lines, the
tool schemas, reports (#95)) — see Step 8 as-built § S5.*

## 9. Daemon lifecycle

1. **Knock.** A client connects to `127.0.0.1:9234`. `ECONNREFUSED` → it spawns the daemon.
2. **Detached spawn.** `spawn(process.execPath, [daemon/dist/index.js], { detached: true, stdio:
   "ignore", windowsHide: true })` + `unref()`. The daemon therefore has no stdio; it logs to
   `~/.chrome-agent-bridge/daemon.log` (size-capped), counts only, never URLs or tokens.
   *Corrected 2026-10-22: as built the log is cut to its last 1 MiB on start and a line containing
   `://` or the token is withheld whole (decisions.md · 2026-10-22 · D3's daemon lifecycle: idle armed
   at start, every shutdown exits 0, bad env values, the log policy) — see as-built § Stage D3.*
3. **The bind is the lock.** Two starters that both saw `ECONNREFUSED` both spawn; the loser's daemon
   gets `EADDRINUSE` and exits at once; the loser client simply keeps knocking (up to 10 s).
   *Corrected 2026-10-22: as built the 10 s runs per spawn cycle and restarts at the client's own
   handover, and each attempt's WebSocket handshake is bounded by the remaining budget (decisions.md ·
   2026-10-22 · The knock's 10 s budget runs per spawn cycle, with a handshake timeout per attempt);
   the losing daemon exits 0 — see as-built § Stage D3, § Stage D4.*
4. **Hello / welcome.** Client → `{type:"hello", token, role:"client", name, build, proto: 2}`.
   Daemon → `{type:"welcome", build, proto, clientId, extensionConnected}`. Extension hellos carry no
   `role` and get the same `welcome` (the router ignores a message without `id`+`method`).
   *Corrected 2026-10-22: as built `clientId` is `"c<n>"` for a client (never reused within a daemon
   process) and `"extension"` for the extension; a failed hello closes with 4001 and the reason
   "expected hello handshake", "invalid token" or "unknown role"; a client waits at most 2 s for the
   welcome, then rejects with `VERSION` and neither spawns nor hands over (decisions.md · 2026-10-22 ·
   A Step 6 client gives up with VERSION when no welcome arrives — open for user review) — see
   as-built § Stage D2, § Stage D4.*
5. **Version handover.** `build` is the sha256 of `daemon/dist/index.js`. A client whose expected
   build (it hashes the file it would spawn) differs from `welcome.build` sends `daemon.shutdown`,
   waits for the port to free, spawns, reconnects. Other clients see their socket close and reconnect
   with the same logic — so after `npm run build` the first client to connect upgrades the daemon for
   everyone. The extension reconnects on its own (`ReconnectingClient`, 0.5–10 s backoff).
   *Corrected 2026-10-22: was "reconnect with the same logic"; as built a client reconnecting after
   4002 runs the knock **without** a handover — a build mismatch there rejects with `VERSION` naming
   both builds — so two clients on different builds cannot hand the daemon back and forth; `connect()`
   itself hands over at most once (decisions.md · 2026-10-22 · A reconnect after 4002 never hands the
   daemon over — open for user review; decisions.md · 2026-10-21 · One daemon handover per connect(),
   then a VERSION error). The daemon replies `{ok:true}`, closes every socket with 4002 "upgrading",
   waits ≤ 1 s, then terminates — see as-built § Stage D2, § Stage D4.*
6. **Idle exit.** Zero *clients* (the extension does not count) for 10 min → exit. Also `daemon.shutdown`.
   *Corrected 2026-10-22: as built the timer is also armed at start with zero clients, and idle,
   `daemon.shutdown` and signals all close the sockets (1001, or 4002 for `daemon.shutdown`) and exit 0
   (decisions.md · 2026-10-22 · D3's daemon lifecycle: idle armed at start, every shutdown exits 0, bad
   env values, the log policy) — see as-built § Stage D3.*
7. **Waiting for Chrome.** A fresh daemon has no extension yet; the SDK's `connect({ waitForExtensionMs })`
   waits for the `extensionStatus {connected:true}` event (default 15 s) before resolving, so a script
   does not start with `NOT_CONNECTED`. *Amended 2026-10-22: `connect({ requireExtension: false })`
   skips the wait and resolves on the welcome; the MCP uses it so that Chrome closed reads as before
   Step 6 (decisions.md · 2026-10-22 · #27, stage D5b).*
8. **Token.** Same token as the extension. Source of truth: `bridge.token` at the repo root (gitignored);
   `BRIDGE_TOKEN` env overrides (the MCP config still passes it that way). The daemon reads it the
   same way; a client that cannot find a token fails before knocking with a message naming both places.
   *Corrected 2026-10-22: as built that failure is a `NOT_CONNECTED` rejection of `connect()` (as are
   a missing daemon build, a bad `BRIDGE_PORT`, the 10 s give-up and a 4001 close), never naming the
   token (decisions.md · 2026-10-22 · The SDK reports configuration and connection failures as
   NOT_CONNECTED — open for user review); "repo root" is the first directory above the code whose
   `package.json` has `"workspaces"` — see as-built § Stage D4.*
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
  *Added 2026-10-23 (Step 8 S0; decisions.md · 2026-10-23 · `NO_CURSOR` enters `shared/src/codes.ts`
  as the 23rd code (#76)): SDK — `NO_CURSOR`, a `Tab`-less SDK call with no cursor ("call newTab() or
  claim() first"; §8). The SDK alone raises it, never the daemon or the extension, so it never
  travels on the wire from them; `shared/src/codes.ts` lists it in its own `SDK_ERROR_CODES`, beside
  the daemon and extension lists.*
- **Compatibility.** A v1 hello is accepted as an extension. A v1 error `{message}` from an old
  extension is wrapped as `INTERNAL`. Beyond that, extension and daemon of this generation ship
  together — nothing else speaks the protocol yet.
- *Corrected 2026-10-22 (as built in Step 6):* the error `code` is optional on the wire (`WireError
  {code?, message, data?}`; `fromWire` maps a missing code to `INTERNAL`) and the daemon always sends
  one (decisions.md · 2026-10-22 · D0's protocol shapes: optional wire code, strict v2 hello fields,
  events without id). `timeoutMs` stays on the envelope: the daemon waits `clamp(timeoutMs ?? 30000,
  100, 600000) + 5000` and forwards `{id, method, params}` only (decisions.md · 2026-10-22 · D2's daemon
  details: parseHello beside validateHello, BAD_PARAMS for bad ids, no forwarded timeoutMs, interim
  defaults). `daemon.status` returns `{build, uptime (ms), extensionConnected, clients:[{id, name,
  since}], port}`; any other `daemon.*` method answers `UNKNOWN_METHOD`; `tabs.claim`/`tabs.release` are
  not handled until Step 7 and are forwarded meanwhile. `extensionStatus {connected}` is `true` on each
  extension hello and `false` only when the current extension socket closes. Close codes, not listed
  above: 4001 on a failed hello, 4002 "upgrading" after `daemon.shutdown`, 1001 on idle exit or a
  signal — see as-built § Stage D0, § Stage D2, § Stage D3.
- *Corrected 2026-10-23 (Step 7 propagator): as built in Step 7, on the wire.*
  - *Hello: the extension sends `role:"extension", proto:2`. Without `proto` its tab calls get
    `VERSION` (#42).*
  - *Daemon-handled methods: `tabs.claim {tab | active:true}` → `{tab}` and `tabs.release` →
    `{ok:true}` are now handled.*
  - *Annotations: `newTab` → `{id, tab}`, in the background unless `active:true`. `listTabs` entries add
    `tab`, `owner?`, `current?`, `windowId` and `openerTabId?`. `daemon.status` adds `tabs` and `lock`.*
  - *The network "all" scope is forwarded as `{scope:"all"}` (#52).*
  - *Content-script errors travel as a returned `{__bridgeError:"CODE:message"}`, never a throw (#38).*
  - *The code count is unchanged at 22; `code` stays optional on the wire (decisions.md · 2026-10-22 ·
    v2 peers do not yet require `code` (#51)).*
    *Corrected 2026-10-23 (Step 8 S0): the count is 23 from Step 8 S0 on — `NO_CURSOR` joins as an
    SDK-only code (decisions.md · 2026-10-23 · `NO_CURSOR` enters `shared/src/codes.ts` as the 23rd
    code (#76)); the 22 daemon and extension codes are unchanged.*
  - *Compatibility: a Step 6 client keeps a legacy path for one release (#41, #54), which Step 8 S2
    removes.*
- *Corrected 2026-10-24 (Step 8 S7): as built in Step 8 S2b, on the wire (Step 8 as-built § S2b):*
  - *`tab` is required on every tab call and every unlisted method (`BAD_PARAMS "tab is required"`);
    network calls without `tab` or with "active" mean the human's tab; `selectTab` is answered
    `UNKNOWN_METHOD` by the daemon; any `id` on `closeTab`/`focusTab` is `BAD_PARAMS`. The legacy path
    is gone (it was removed by S2b, not S2).*
  - *`WireError.code` is required; a proto:2 error without one is delivered as `INTERNAL` and logged
    once per connection (decisions.md · 2026-10-23 · S2b makes `code` required on error frames (#73)).*
  - *The extension's hello carries `session` (§13), and the new method `locate {locator}` →
    `{ref, role, name}` is a tab method; actions take `ref` or `locator`.*
  - *The code count is 23: the 22 above plus the SDK-only `NO_CURSOR` (`shared/src/codes.ts`).*

  *See Step 7 as-built § Stage T0, § Stage T1, § Stage T2.*

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

*Corrected 2026-10-22: as built `daemon/` has no `startup.ts` (deleted in D5; the daemon never retries
the bind) and adds `main.ts`, `route.ts` and `build.ts`; `sdk/` has `connect.ts`, `knock.ts`,
`client.ts`, `transport.ts`, `spawn.ts`, `paths.ts`, `token.ts` and `download.ts`; `mcp/` adds `link.ts`
(the no-crash 5 s retry). `npm run build` builds daemon, mcp and extension only: `sdk/` has no build
step and is consumed as TypeScript source (bundled into the MCP; scripts run it with `tsx`) — see
as-built § Stage D1, § Stage D3, § Stage D5.*
*Corrected 2026-10-23 (Step 7 propagator): Step 7 added these files:*
- *`daemon/src/{handles,leases,lock,methods,intercept}.ts`;*
- *`sdk/src/format/{snapshot,network,index}.ts`;*
- *`mcp/src/cursor.ts`;*
- *in the extension, `errors.ts`, `tab-events.ts`, `network-scope.ts` and `content/guard.ts`;*
- *in `recipes/`, `reload-extension.ps1` and the E2E helpers.*

*The locator types in `shared/` are still Step 8's — see Step 7 as-built § Stage T1–T4,
§ "RELOAD-AUTO, Run 9, BG-FLAGS".*
*Corrected 2026-10-24 (Step 8 S7): Step 8 added the locator types (`shared/src/protocol.ts`);
`sdk/src/{tab,locator,error,report,policy}.ts`; `daemon/src/handle-mark.ts`; in the extension
`content/{a11y,locate,nearest,marked}.ts`, `handlers/{target,locate,locator-wait}.ts`,
`evaluate/mark.ts`, `trusted-input.ts`, `session-marker.ts`; and `recipes/{sdk-login,s6,fe}.ts` with
`recipes/blackboard/` — see Step 8 as-built.*

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

*Corrected 2026-10-23 (Step 7 propagator), on what Step 7 measured:*
- *Row 1: trusted CDP input into a background tab answers `ok` and does nothing (Run 8 BG-1/BG-2). With
  the three launch flags of §7.3 it does the same (Run 10). Focus emulation is unmeasured. Step 8
  measures it before choosing between it and the `focus()` fallback (decisions.md · 2026-10-23 · The
  user rules on Run 8: fix stage T5b, then Run 9 (#62) item 4; · Chrome's anti-throttling flags do not
  fix background input (#66)).*
- *Row 3: the switch flashes for about 1.5 s. `cdp` mode is not an escape for a background tab, since
  it refuses one (§7 notes).*
- *A new risk, found by reading (T2 verifier V4): handles are keyed by Chrome tab id, and ids restart
  with each Chrome session. A daemon that outlives a Chrome restart can keep a leased handle live on a
  reused id, which may be the human's tab.*
*Corrected 2026-10-24 (Step 8 S7): row 1 — focus emulation was measured and does not fix it (Run 11),
so the SDK's `focus()` before trusted input is the policy (#89); the new risk is closed by the session
marker (§13).*

*See Step 7 as-built § T5, § Stage T2.*

## 13. Open questions (not blocking)

- Should `tabs.claim` on a held tab offer `{wait: true}` for the rare legitimate hand-over between a
  script and a Claude session? Decide after the first real collision.
- Token design beyond "one shared secret" — a separate direction, out of scope here.
- Generation-stamped refs (`s7.e12`) for stale-ref detection and read-only foreign snapshots.
- **Chrome launch flags for live background tabs** (§7.3) — a step of its own after Step 8: a
  documented shortcut change, plus `daemon.status` detecting whether Chrome runs with them.
  *Corrected 2026-10-23 (Step 7 propagator): Run 10 measured that the flags do not make trusted input
  work in a background tab (#66). If this step happens, its case rests on timers, media and
  `visibilityState`, and not on input.*
- *Added 2026-10-23 (Step 7 propagator):* should the extension's hello carry a session marker? On a
  new marker the daemon would retire every handle with `tabGone`, so that a handle never lands on a tab
  id that Chrome reused after a restart. This is T2 verifier V4, a proposal that is not yet decided and
  is contract-level (`docs/plans/2026-10-21-step7-multi-actor-tabs-steps/T2-verifier.md` V4).
  *Answered 2026-10-24 (Step 8 S7): yes. Step 8 S2b built it — the marker is kept across worker
  restarts and extension reloads and changes when Chrome starts; any change after the daemon's first
  extension hello retires every handle (`tabGone` to each holder, leases dropped, the lock untouched),
  and a new daemon never reuses a handle number (decisions.md · 2026-10-23 · The extension hello
  carries an optional session marker (#74); · The session marker's mechanism, amended (#80); · S2b's
  details: the `selectTab` refusal grep, the marker's edge cases, the handle mark (#94)). Measured in
  Run 12: an extension reload kept a held handle (SM-0); a Chrome restart left no handle minted before
  it listed, and the old handle answered `TAB_GONE` (SM-1, where `chrome://quit` had already closed the tab, so the restart retired 0).*
