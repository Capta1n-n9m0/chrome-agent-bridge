# Step 7 — Multi-actor tabs: `tabId` everywhere, handles, leases, the visibility lock, structured errors

**Date:** 2026-10-21 · **Status:** Planned
**Design of record:** docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md (§5, §6, §7, §10) ·
**As-built:** docs/plans/2026-10-21-step7-multi-actor-tabs-asbuilt.md (does not exist yet; written at
stage close) · **Steps dir:** docs/plans/2026-10-21-step7-multi-actor-tabs-steps/ (does not exist yet;
created at kickoff for ledgers, briefs, reports and evidence)

**Prerequisite:** Step 6 (`2026-10-21-step6-daemon-and-protocol-v2.md`) complete and E2E-passed. This
step's **Stage-0 spec audit re-examines Step 6's as-built register by execution** — every contract it
lists (welcome shape, `extensionStatus` event, close code 4002, the error envelope) is exercised, not
read, before T0 starts.

## Outcome

Targets at planning time; rewritten as results when the step closes.

- Several actors work in parallel on different tabs without their actions mixing: a script on `T3`
  and Claude on `T1` run at the same time (spec §6).
- Every extension method takes an explicit `tabId`; the daemon mints **handles** (`T1, T2, …`),
  enforces **leases** and holds a **visibility lock** around the only instructions that need the tab
  on screen (`screenshot` in its default mode, `focusTab`).
- The extension emits **tab lifecycle events** so handles survive a Memory-Saver discard and a dead tab
  reports its last URL; errors carry **codes** end to end (spec §10).
- The extension returns **data** (snapshot elements, network entries); the text formatters move to
  `sdk/src/format/` and render byte-identical output for today's fields, so the MCP transcript and the
  E2E expectations in `docs/e2e-test-plan.md` do not change.
- The MCP tool count goes 21 → 22 (`browser_focus_tab` added; baseline 21 per
  `server/src/tools/registry.ts`); tests and typecheck green at every stage close, counts recorded per
  stage (Step 6's closing count is the baseline).

Test-driven development applies to the daemon's `HandleTable`, `LeaseTable`, `VisibilityLock` and the
`intercept` layer (all pure), to the extension's `BridgeError` → wire mapping in `Router`, and to
`buildSnapshot` returning elements. The `chrome.tabs` listeners, the activation sequencing and the
background-tab behaviour of CDP (Chrome DevTools Protocol) are manual E2E. Each stage leaves `npm test`
and `npm run typecheck` green. **This step changes the wire protocol in a way the extension must
follow — build and reload the extension before E2E (`unknown method` / `BAD_PARAMS tabId` means an old
worker; `CLAUDE.md` gotcha).**

**Goal:** Let several actors work in parallel on different tabs without their actions mixing. Every
extension method takes an explicit `tabId`; the daemon mints **handles**, enforces **leases**, and
holds a **visibility lock** around the only instructions that need the tab on screen; the extension
emits **tab lifecycle events** so handles survive Memory-Saver discards and report dead tabs with their
last URL; errors carry **codes** end to end; the extension returns **data** (snapshot elements, network
entries) and the text formatters move to the SDK. After this step, a script on T3 and Claude on T1 run
at the same time, and a screenshot of either flashes the tab for a frame and restores the human's view.

**Non-goals (this step):** locators, `waitFor({locator})`, node→ref, the typed `Tab` API and
`BridgeError` enrichment (Step 8); the MCP cursor semantics beyond "pass `tab` through" (Step 8);
read-only snapshots of a foreign tab; generation-stamped refs; `tabs.claim {wait:true}`.

**Files touched:**
- `shared/src/protocol.ts` (`SnapshotResult`, `SnapshotElement`, tab event params, `ScreenshotMode`),
  `shared/src/codes.ts` (already complete from Step 6; verify)
- `extension/src/tabs.ts` (`targetTab(p)` replaces `activeTab()` in handlers; `activateForCapture`),
  every `handlers/*.ts`, `router.ts` (code mapping), new `errors.ts` (`BridgeError` + `restrictedUrl`
  → code), `debugger-errors.ts` (returns `{code, message}`), `content/snapshot.ts` (elements),
  `content/index.ts`, `sw.ts` (tab listeners → events), `handlers/tabs.ts` (`focusTab`, `newTab
  {active:false}` default), `handlers/perceive.ts` (`mode`), `network-log.ts` (formatter removed →
  moved), tests
- `daemon/src/`: new `handles.ts`, `leases.ts`, `lock.ts`, `intercept.ts`; `route.ts` (resolve `tab` →
  `tabId`, lease check, lock), `wsHost.ts` (extension events → daemon), `registry.ts` (release on
  disconnect); tests
- `sdk/src/format/snapshot.ts`, `format/network.ts` (moved formatters + their tests), `client.ts`
  (events: `tabGone`, `leaseGranted`)
- `mcp/src/tools/registry.ts` (optional `tab` on every tool; ids shown are handles; `browser_list_tabs`
  columns), tests
- `test-fixtures/e2e-playground.html` (a "open popup" button with `target=_blank`), `docs/*`, `CLAUDE.md`

**Order of work:** T0 (types) → T1 (extension: `tabId` + errors + events, no behaviour change when
`tabId` absent) → T2 (daemon: handles/leases/lock/intercept, TDD) → T3 (extension: data not text,
screenshot modes, `focusTab`) → T4 (sdk formatters + mcp pass-through) → T5 (E2E) → T6 (docs).
T1 and T2 are independent and can run in parallel. T3 needs T1. T4 needs T2+T3.

---

## Decisions

The decisions below were taken in the design spec and in this plan on 2026-10-21 and are **not
reopened** during the build: they are contract decisions in the sense of the `long-run` skill §3 (wire
protocol, lease and lock semantics, what the human sees). A new decision taken while building goes to
`docs/decisions.md` (cited by date + title), never into this section; the run itself is governed by
decisions.md · 2026-10-21 · Steps 6–8 run under the long-run contract.

### 0.1 `tabId` is required on the wire, optional for one release in the handler

`targetTab(p)`: `p.tabId` (number) → `chrome.tabs.get(tabId)`; absent → `activeTab()` **with a console
warning** so a Step 6 daemon still works against a Step 7 extension during the migration. The daemon
always sends `tabId` after T2. The fallback is removed in Step 8's cleanup. `BAD_PARAMS` if `tabId`
is present but not a number; `TAB_UNKNOWN` (extension-side) if `chrome.tabs.get` throws "No tab with id".

### 0.2 Handles (`daemon/src/handles.ts`, pure)

`HandleTable`: `mint(tabId) → "T<n>"`, `resolve(handle) → tabId | gone`, `handleOf(tabId)`,
`replace(removedTabId, addedTabId)`, `remove(tabId, {lastUrl, lastTitle})`, `prune(now)`. A tab seen
in `listTabs` without a handle gets one on the spot (so handles exist for every tab the actors can
name). Dead handles are kept 1 h / 1 000 entries for the `TAB_GONE` message. Handles are **not**
persisted — a daemon restart renumbers (the SDK's cursor is re-established by the script's own
`newTab`/`claim`; documented).

### 0.3 Leases (`daemon/src/leases.ts`, pure)

`LeaseTable`: `grant(handle, clientId, reason)`, `release(handle)`, `releaseAll(clientId)`,
`ownerOf(handle)`, `check(handle, clientId)` → ok | `TAB_HELD {owner: name, since}`. Reasons:
`opened | claimed | opener`. The opener rule: on `tabCreated {openerTabId}` whose opener handle is
leased → grant to that client, emit `leaseGranted {tab, reason:"opener", url}` to it. A tab created by
the human (no opener, or opener unleased) is unheld.

Which methods are lease-checked: every method that carries `tab`. Free: `listTabs`, `networkRequests`
with `tab:"all"` or a tab param (**read**, not RefMap-touching), `daemon.*`, `tabs.claim/release`.
`networkClear` is **checked** (it clears shared state; the plan's own note marks this as the less
certain call — see Open items). `newTab` leases its result to the caller. `closeTab` is checked.

### 0.4 The visibility lock (`daemon/src/lock.ts`, pure)

`VisibilityLock.acquire(timeoutMs, owner) → release()`; FIFO; a waiter past its deadline rejects
`LOCK_TIMEOUT {holder}`; `releaseAllOf(clientId)` on disconnect. Needs-screen methods: `screenshot`
when `mode !== "cdp" && !fullPage`, `focusTab`. The lock wraps the forwarded call, so the extension's
activate→capture→restore runs atomically against other screen users.

### 0.5 Activation sequence in the extension (`tabs.ts: activateForCapture`)

```
prev = active tab of target.windowId
if prev.id !== target.id:  chrome.tabs.update(target.id, {active:true}); await onActivated(target.id) ∥ 1 s;
                           await new Promise(r => setTimeout(r, 50))     // one frame + paint
dataUrl = captureVisibleTab(windowId)
if prev switched: chrome.tabs.update(prev.id, {active:true})           // restore, not awaited for the result
```
If the window is minimized (`chrome.windows.get(...).state === "minimized"`) → `WINDOW_MINIMIZED`
before switching anything. The window is **not** focused (no `chrome.windows.update({focused})`):
`captureVisibleTab` needs the window visible, not focused, and stealing focus is what we're avoiding.
`focusTab` is the explicit exception: it does focus the window and activate the tab, and does *not*
restore.

### 0.6 Errors with codes in the extension

`extension/src/errors.ts`: `class BridgeError extends Error { constructor(code, message, data?) }`.
`Router` serialises `{code, message, data}`; a plain `Error` → `INTERNAL`. `describeDebuggerError`
returns `{code, message}` (`DEBUGGER_ATTACH | DEBUGGER_CANCELLED | DEBUGGER_DEVTOOLS |
RESTRICTED_URL | TIMEOUT`); `unwrapResult` throws `REF_STALE` for a null/undefined frame result;
`centerForInput` throws `OFFSCREEN`; `evaluate` wraps a page exception as `PAGE_ERROR {name, stack?}`;
`navigate` → `NAV_FAILED {error}`; `downloadStart` → `DOWNLOAD_HTTP {status, contentType}`. Content-
script throws come back as strings through `executeScript`; the content script prefixes them
`CODE:message` and `unwrapResult` splits — one place, tested.

### 0.7 Snapshot returns elements; the formatter moves

`buildSnapshot` → `{url, title, elements: SnapshotElement[], truncated}` where `SnapshotElement =
{ref, role, name, value?, checked?, disabled?, expanded?, selected?, href?, depth, frame?: number}`.
`formatSnapshot(result): string` in `sdk/src/format/snapshot.ts` renders *byte-identical* text to
today's for the fields that existed (so the MCP transcript doesn't change and the E2E expectations in
`docs/e2e-test-plan.md` hold). Same for `NetworkLog.format` → `sdk/src/format/network.ts`. The
extension handler no longer builds `text`; `NetworkRequestsResult.text` (today
`shared/src/protocol.ts:136`) is removed from the wire.

### 0.8 `newTab` no longer activates

`chrome.tabs.create({url, active: false})` — a script opening a tab must not steal the screen. The MCP
passes `active: true` explicitly only from `browser_new_tab` when the cursor is on the human's active
tab (Step 8 decides; in this step the MCP passes `active: true` to preserve today's behaviour).

---

## Stages

One stage per Part. **Lane** is the explicit grant a step agent needs under the `step-agent` ESCALATION
list. **Parallel with** follows "Order of work". T1 and T2 may run concurrently because they are
file-disjoint (`extension/` vs `daemon/`) and share no port: T2's `ws` tests bind a test port, T1's
tests are jsdom/pure.

### Stage T0 — Types

- [ ] `shared/src/protocol.ts`: `SnapshotElement`, `SnapshotResult`, `TabCreatedParams`,
      `TabRemovedParams`, `TabReplacedParams`, `TabGoneParams`, `LeaseGrantedParams`,
      `ScreenshotMode = "switch" | "cdp"`; `NetworkRequestsResult` loses `text`.
- [ ] Tests for any new guard (events have a `params` object).

**Lane:** `shared/src/`, `shared/test/`. **Parallel with:** sequential, first (T1 and T2 both import
these types). **Verifier focus:** `shared/src/codes.ts` really is complete against spec §10 (the plan
says "verify"); removing `text` from `NetworkRequestsResult` breaks typecheck in exactly the places
T3/T4 will change — list them; no guard accepts an event without a `params` object.
**Needs the user's keyboard:** no.

### Stage T1 — Extension: `tabId`, codes, events (no behaviour change when `tabId` is absent)

- [ ] `tabs.ts`: `targetTab(p)` (§0.1); replace every `activeTab()` call in `handlers/*` with it
      (`actions.ts` ×5, `perceive.ts` ×2, `navigate.ts`, `history.ts` ×2, `wait.ts` ×2, `evaluate.ts`,
      `network.ts`).
- [ ] `errors.ts` + `router.ts` + `inject.ts` (`CODE:message` split) + `debugger-errors.ts` (§0.6);
      update `router.test.ts`, `inject.test.ts`, `debugger-errors.test.ts`, `actions.test.ts`.
- [ ] `sw.ts`: `chrome.tabs.onCreated` → `tabCreated {tabId, openerTabId, url}`; `onRemoved` →
      `tabRemoved {tabId, lastUrl?, lastTitle?}` (cache title/url from `onUpdated` per tab so the removed
      event can carry them); `onReplaced` → `tabReplaced`. Sent through the offscreen relay as
      `{event, params}` (no id). The network log's existing `onRemoved` listener stays.
- [ ] Build + load against the Step 6 daemon: everything still works (daemon ignores events, extension
      falls back to the active tab). Record in the commit.

**Lane:** `extension/src/`, `extension/test/`. **Parallel with:** T2. **Verifier focus:**
`grep -rn "activeTab()" extension/src/handlers` returns nothing after the change (the call sites today
are 13: `handlers/actions.ts` lines 6, 12, 39, 85; `perceive.ts` ×2; `navigate.ts`; `history.ts` ×2;
`wait.ts` ×2; `evaluate.ts`; `network.ts` — the plan's "×5" for `actions.ts` is stale, see Open items);
`unwrapResult` still treats null **or** undefined as failure (`CLAUDE.md` invariant) and now throws
`REF_STALE`; the three `chrome.tabs` listeners are registered at the top level of `sw.ts`,
synchronously, with no top-level `await` (`CLAUDE.md` gotchas); the content script is still an IIFE
with no `import`/`export`; no `console.*` in `sw.ts` prints a URL (the `tabRemoved` cache holds URLs —
they go on the wire, never into a log line). **Needs the user's keyboard:** yes for the last checkbox
(build, reload the extension, run against the Step 6 daemon) — human gate G7-1; the unit work does not.

### Stage T2 — Daemon: handles, leases, lock, intercept (TDD)

- [ ] `handles.ts`, `leases.ts`, `lock.ts` per §0.2–0.4 with full unit tests (replace, gone message,
      opener grant, release on disconnect, FIFO lock, lock timeout, holder disconnect releases).
- [ ] `intercept.ts`: `listTabs` → annotate `{tab: handle, owner?: name, active}`; `newTab` → mint +
      grant; `closeTab` → check, forward, remove; `tabs.claim {tab | active:true}` → grant or `TAB_HELD`;
      `tabs.release`; `screenshot`/`focusTab` → lock.
- [ ] `route.ts`: resolve `params.tab` → `params.tabId` (strip `tab`); `TAB_UNKNOWN` / `TAB_GONE`;
      lease check; then forward. Methods with no `tab` and not free → `BAD_PARAMS "tab is required"`.
- [ ] `wsHost.ts`: extension events → `HandleTable`/`LeaseTable` updates; `tabGone` to the lease
      holder; `leaseGranted` on the opener rule; `extensionStatus` already emitted (Step 6).
- [ ] `daemon.status` adds `tabs: [{tab, tabId, owner, url?}]` and `lock: {holder?} `.
- [ ] Tests over real `ws`: two clients, fake extension that answers `listTabs`/`newTab` and emits
      events — client A's `newTab` is held by A; B's `click` on it → `TAB_HELD` naming A; A disconnects →
      B can claim; `tabReplaced` keeps A's handle valid; `tabRemoved` → `TAB_GONE` with lastUrl; two
      concurrent screenshots serialise (fake extension records order); `focusTab` while a screenshot
      holds the lock waits.

**Lane:** `daemon/src/`, `daemon/test/`. **Parallel with:** T1. **Verifier focus:** attack the lock —
a holder whose call times out, a holder that disconnects mid-call, two waiters past their deadline —
and confirm each path releases exactly once; attack the lease table with a `tabCreated` whose opener is
unleased (must stay unheld) and with a `tabReplaced` for a tab nobody holds; the extension never
receives `tab` (handles are stripped before forwarding — assert on the fake extension's received
params); the lock is taken even when the target is already active (0.4 "always taken");
`daemon.status`'s `url?` is returned to clients but never written to `daemon.log` (the Step 6 `redact`
guard covers it). **Needs the user's keyboard:** no.

### Stage T3 — Extension: data not text, screenshot modes, `focusTab`

- [ ] `content/snapshot.ts`: `buildSnapshot` returns elements (§0.7); `snapshot.test.ts` asserts on
      elements; the text assertions move to the sdk formatter test with the same fixtures.
- [ ] `handlers/perceive.ts`: `screenshot {tabId, fullPage?, mode?}`: `fullPage` → CDP as today;
      `mode:"cdp"` → `Page.captureScreenshot` viewport via `withDebugger(tabId, …, "Screenshot")`;
      default → `activateForCapture` (§0.5).
- [ ] `handlers/tabs.ts`: `newTab {url, active?}` default `false`; new `focusTab {tabId}`; `selectTab`
      **removed** from the extension (it was "activate + focus window"; `focusTab` is its honest name);
      `listTabs` adds `windowId`, `openerTabId?`.
- [ ] `handlers/network.ts`: return `query` result without `text`; `network-log.ts` `format` + its
      tests move (T4).
- [ ] `sw.ts`: register `focusTab`; keep `selectTab` as an alias to `focusTab` for one release.

**Lane:** `extension/src/`, `extension/test/`; may move test cases out of
`extension/test/snapshot.test.ts` and `network-log.test.ts` into `sdk/test/` (granted, shared with T4).
**Parallel with:** sequential after T1 (same files). **Verifier focus:** the zero-size filter is still
gated on `hasLayout(doc)` (`CLAUDE.md` gotcha — jsdom reports 0×0); `activateForCapture` never calls
`chrome.windows.update({focused})` (grep) and checks `minimized` before switching; `focusTab` is the
only handler that focuses a window; `newTab` defaults to `active: false` (today it is `active: true`,
`extension/src/handlers/tabs.ts`); the `snapshot` handler result carries no `text` field.
**Needs the user's keyboard:** the extension changes are invisible until reloaded — deferred to the T5
wave (G7-2).

### Stage T4 — SDK formatters + MCP pass-through

- [ ] `sdk/src/format/snapshot.ts`, `format/network.ts` with the moved tests (byte-identical output for
      the existing fixtures — add a test that renders the Step 5 fixture entries and compares to the
      stored expected text).
- [ ] `sdk/src/client.ts`: typed events `tabGone`, `leaseGranted`, `extensionStatus`.
- [ ] `mcp/src/tools/registry.ts`: every tab-touching tool gets `tab: z.string().optional()`; without
      it the MCP uses its cursor — **in this step** the cursor is simply "claim the active tab on first
      touch, then keep it" (Step 8 adds `browser_use_active_tab` and the status line); `browser_snapshot`
      renders with `formatSnapshot`; `browser_network_requests` with `formatNetwork`;
      `browser_list_tabs` prints `T3* [claude-code #4412] Title — url`; `browser_select_tab {tab}` →
      claim + cursor (no activation); new `browser_focus_tab`. Tool count 21 → 22.
- [ ] `tools.test.ts` updated: fake client records `tab` resolution; `TAB_HELD` renders the owner.

**Lane:** `sdk/src/`, `sdk/test/`, `mcp/src/`, `mcp/test/`, plus the test cases moved from
`extension/test/` (granted). **Parallel with:** sequential after T2 and T3. **Verifier focus:** the
byte-identical test uses expected text captured from the **baseline** formatter (generated on the
pre-T3 commit, stored as a fixture), not text produced by the new code; the tool count is 22 by
`grep -c "server.tool("`; `browser_select_tab` no longer activates on screen (its handler calls
`tabs.claim`, not `focusTab`); a `TAB_HELD` error renders the owner's actor name in the tool result.
**Needs the user's keyboard:** the MCP schema changes need an MCP reconnect (`/mcp`) — part of G7-2.

### Stage T5 — E2E (manual; `docs/e2e-test-plan.md` LEASE-1…7, SCREEN-1…5, BG-1…4)

This stage is a **wave run with the user** after the autonomous phase closes (human gate G7-2). It
starts with `npm run build` → `chrome://extensions` ↻ → `/mcp`; an `unknown method: focusTab` or
`BAD_PARAMS tabId` error means the loaded extension is stale. The autonomous run writes the rows and
their expected results into `docs/e2e-test-plan.md` beforehand.

- [ ] **LEASE-1** Two Claude sessions: A snapshots (claims the active tab), B's `browser_snapshot` →
      `TAB_HELD` naming A; B `browser_new_tab` → works on its own tab; both click in parallel.
- [ ] **LEASE-2** Script + Claude: `recipes/hello.ts` opens a tab and types for 30 s while Claude
      snapshots its own tab — no interleaving, both succeed.
- [ ] **LEASE-3** Opener rule: fixture "open popup" button → the new tab is leased to the clicker,
      `leaseGranted` received, `listTabs` shows the owner.
- [ ] **LEASE-4** Disconnect releases: end session A → B can claim A's tab.
- [ ] **LEASE-5** `TAB_GONE`: close a leased tab by hand → next call reports the last URL/title.
- [ ] **LEASE-6** `tabReplaced`: discard a leased background tab via `chrome://discards` → reload it →
      the handle still works; the SW console shows the replaced event.
- [ ] **LEASE-7** Human-opened tab is unheld; `browser_select_tab` on it claims it.
- [ ] **SCREEN-1** Screenshot of a background leased tab (default): correct image; the human's tab is
      restored; measure the flash (video or stopwatch).
- [ ] **SCREEN-2** Same with `mode:"cdp"`: no switch; banner; image matches.
- [ ] **SCREEN-3** Two actors screenshot simultaneously: both images correct, serialised.
- [ ] **SCREEN-4** Minimized window → `WINDOW_MINIMIZED`; CDP mode in a minimized window → record.
- [ ] **SCREEN-5** Two windows: target in the unfocused window — capture works without focusing it.
- [ ] **BG-1** Trusted click into a background tab (fixture's `isTrusted` reporter) → record result;
      if it fails, try with `Emulation.setFocusEmulationEnabled` and record.
- [ ] **BG-2** Trusted typing into a background tab → record.
- [ ] **BG-3** `evaluate` clipboard write in a background tab → expected `NotAllowedError`; after
      `browser_focus_tab` → works.
- [ ] **BG-4** `waitFor {text}` and `networkIdle` on a background tab → work (timers throttled but fine).
- [ ] Regression smoke: PERC-1…4, ACT-1…3, TRUST-2, EVAL-1, NET-1, DL-1 — via handles.

**Lane:** `docs/e2e-test-plan.md`, `test-fixtures/e2e-playground.html` (the "open popup" button
LEASE-3 needs — see Open items for which stage adds it), `recipes/hello.ts` (its 30 s typing variant
for LEASE-2). **Parallel with:** sequential, after T4. **Verifier focus (wave):** every row's expected
text is written before the run; SCREEN-1's flash is a measured number with its method; BG-1/BG-2 are
recorded as facts either way because Step 8's `sdk/src/policy.ts` constant is set from them; LEASE-1
and LEASE-4 need two real sessions, so the evidence names both actor names. **Needs the user's
keyboard:** yes — all of it: extension reload, two Claude sessions (LEASE-1, LEASE-4), closing a tab by
hand (LEASE-5), `chrome://discards` (LEASE-6), minimizing and using two windows (SCREEN-4/5), watching
for the flash (SCREEN-1).

### Stage T6 — Docs + commits

- [ ] `CLAUDE.md` gotchas: *every handler takes `tabId`; handles not Chrome ids; `newTab` is background
      by default; only `captureVisibleTab` needs the screen; the activation sequence and why no window
      focus; `CODE:message` convention for content-script throws; formatters live in `sdk/format`*.
      Remove "Control targets the active tab" from the architecture paragraph.
- [ ] `docs/setup.md`: handles, owners, `browser_focus_tab`, screenshot modes, what the human sees.
- [ ] `docs/progress-and-roadmap.md`: Step 7 entry + the BG-* findings (they decide Step 8's defaults).
- [ ] Commits per Part: `feat(extension): tabId on every method, error codes, tab events`,
      `feat(daemon): tab handles, leases and the visibility lock`, `feat(extension): structured
      snapshot, screenshot modes, focusTab`, `refactor(sdk,mcp): formatters move to the SDK; tools take
      a tab`, `docs: Step 7 E2E results`.

**Lane:** `CLAUDE.md`, `docs/`. The per-Part commits happen at each stage's close (one commit per
stage, long-run bookkeeping invariant); T6's list is the record. **Parallel with:** sequential, last.
**Verifier focus:** `CLAUDE.md` no longer says "Control targets the **active tab**"; every new gotcha
is a measured fact from a stage report or the wave, not a paraphrase of the plan; the setup doc's tool
list has 22 entries. **Needs the user's keyboard:** the E2E results and BG findings wait for the T5
wave.

---

## Exit checks (pre-registered)

"Before" is the stage's starting commit, "after" its closing commit; counts come from `npm test`. The
step's baseline is Step 6's closing test count (recorded in Step 6's as-built) and 21 tools.

**T0**
- T0.1 `npm test` after ≥ before; `npm run typecheck` green for all five packages (or the typecheck
  failures are exactly the `text` consumers that T3/T4 own, listed in the stage report).
- T0.2 Tests cover: each new event guard rejects a frame without a `params` object.
- T0.3 `shared/src/codes.ts` is unchanged from Step 6 or the diff is only additions matching spec §10.

**T1**
- T1.1 `npm test` after ≥ before + the error-mapping tests; typecheck green.
- T1.2 `grep -rn "activeTab()" extension/src/handlers` returns nothing; `grep -n "activeTab" extension/src/tabs.ts`
  shows it used only inside `targetTab`'s fallback with a `console.warn`.
- T1.3 Tests cover: `Router` serialises a thrown `BridgeError` as `{code, message, data}` and a plain
  `Error` as `INTERNAL`; `unwrapResult` throws `REF_STALE` on null and on undefined; the `CODE:message`
  split; `describeDebuggerError` returns each of `DEBUGGER_ATTACH | DEBUGGER_CANCELLED |
  DEBUGGER_DEVTOOLS | RESTRICTED_URL | TIMEOUT` for its Chrome string; `targetTab` → `BAD_PARAMS` for a
  non-numeric `tabId`.
- T1.4 `grep -n "await" extension/src/sw.ts` shows no top-level `await`; the three `chrome.tabs.on*`
  listeners are registered at the top level.
- T1.5 `grep -rnE "console\.(log|warn|error)\(.*(url|lastUrl|href)" extension/src` returns nothing.
- T1.6 The last checkbox (load against the Step 6 daemon) is either recorded with the user (G7-1) or
  explicitly deferred to T5 in the stage report.

**T2**
- T2.1 `npm test` after ≥ before + the handles/leases/lock/intercept/route tests; typecheck green.
- T2.2 Tests cover (the plan's list): A's `newTab` held by A; B's `click` → `TAB_HELD` naming A; A
  disconnects → B can claim; `tabReplaced` keeps A's handle; `tabRemoved` → `TAB_GONE` with `lastUrl`;
  two concurrent screenshots serialise; `focusTab` waits while a screenshot holds the lock; plus
  `LOCK_TIMEOUT {holder}`, holder disconnect releases, opener grant, unleased-opener tab stays unheld,
  `prune` after 1 h / 1 000 entries.
- T2.3 Test: the fake extension never receives a `tab` key in `params`; it always receives a numeric
  `tabId` for a tab-carrying method.
- T2.4 Test: a tab-carrying method without `tab` that is not free → `BAD_PARAMS "tab is required"`;
  `listTabs`, `networkRequests`, `daemon.*`, `tabs.claim/release` succeed without a lease; `networkClear`
  on a foreign tab → `TAB_HELD`.
- T2.5 `grep -rn "lastUrl\|url" daemon/src/log.ts daemon/src/wsHost.ts` shows no log call carrying a URL.

**T3**
- T3.1 `npm test` after ≥ before (text assertions moved, not deleted — the moved count is stated);
  typecheck green.
- T3.2 Tests cover: `buildSnapshot` returns `{url, title, elements, truncated}` with the element fields
  of 0.7 for the existing fixtures (shadow root, closed shadow root, same-origin frame, pruned
  subtrees, the 800 cap); the zero-size filter still gated on `hasLayout`.
- T3.3 `grep -n "focused" extension/src/tabs.ts` returns nothing; `grep -n "focused" extension/src/handlers/tabs.ts`
  appears only in `focusTab`.
- T3.4 `grep -n "active: true" extension/src/handlers/tabs.ts` appears only in `focusTab` (and
  `newTab` only when `p.active` is true).
- T3.5 `sw.ts` registers `focusTab`, and `selectTab` resolves to the same handler (alias) — or the
  audit has resolved the contradiction in Open items and the report says which.

**T4**
- T4.1 `npm test` after ≥ before + the formatter fixture test; typecheck and build green.
- T4.2 The byte-identical test: expected strings captured from the baseline formatter on the pre-T3
  commit (stored under `sdk/test/fixtures/`), compared with `toBe`, for the snapshot fixtures and the
  Step 5 network fixture entries.
- T4.3 `grep -c "server.tool(" mcp/src/tools/registry.ts` → 22; every tab-touching tool's schema has
  `tab: z.string().optional()`.
- T4.4 Tests cover: a tool call with `tab` passes it through; without it the cursor is claimed on
  first touch and kept; `TAB_HELD` renders the owner; `browser_list_tabs` output has the
  `T3* [name] Title — url` form.
- T4.5 `docs/setup.md` and `docs/e2e-test-plan.md` updated in this stage for the new tool, the `tab`
  argument and the changed `browser_select_tab` behaviour.

**T5 (wave, with the user)**
- T5.1 Rows LEASE-1…7, SCREEN-1…5, BG-1…4 exist in `docs/e2e-test-plan.md` with expected results written
  before the run; the extension reload and `/mcp` are recorded as the first line of the run.
- T5.2 Every row's result is recorded with the observed text; SCREEN-1 has a measured flash duration
  and its method; BG-1 and BG-2 state PASS/FAIL and, on FAIL, the `setFocusEmulationEnabled` retry.
- T5.3 The regression rows pass with the same expected text as their last recorded run.
- T5.4 No screenshot or evidence file committed contains page content from a real site (guide rule 8:
  the repo is public) — only the fixture.

**T6**
- T6.1 `grep -n "active tab" CLAUDE.md` shows no "Control targets the active tab" sentence.
- T6.2 Every new `CLAUDE.md` gotcha cites where it was measured (stage report or E2E row).
- T6.3 One commit per stage in `git log` with the messages listed; no `dist/`, no token.

---

## Human gates

- **G7-1 — T1's live check.** "Build + load against the Step 6 daemon" needs `npm run build` →
  `chrome://extensions` ↻ → `/mcp` in the real profile (`long-run` §4.2 standing gate). The autonomous
  run cannot do it. Either the user is present at T1's close and does it (the result goes into the T1
  commit as the plan asks), or the step agent records it as deferred to the T5 wave and the T1 commit
  says so.
- **G7-2 — T5 is a wave run with the user.** Every extension change from T1 and T3 is invisible until
  the user reloads the extension; the MCP changes from T4 need an MCP reconnect. The wave opens with
  the reload sequence and the stale-extension check (`unknown method: focusTab` / `BAD_PARAMS tabId` ⇒
  reload again). Rows needing the user specifically: LEASE-1 and LEASE-4 (two Claude sessions), LEASE-5
  (close a tab by hand), LEASE-6 (`chrome://discards`), LEASE-7 (open a tab as the human), SCREEN-1
  (watch and time the flash), SCREEN-4 (minimize), SCREEN-5 (two windows), BG-3 (focus by tool, then
  confirm). The BG-1/BG-2 outcome is a **Step 8 input**: Step 8's kickoff cannot set `sdk/src/policy.ts`
  without it.
- **G7-3 — the "open popup" fixture button.** Adding it to `test-fixtures/e2e-playground.html` is in
  the repo and needs no gate; serving the fixture (`python -m http.server 8080 --directory
  test-fixtures`) and clicking it in the real profile is part of G7-2.
- **Standing gates:** any loosening of the lease or lock semantics in a direction that lets one actor act
  on another's tab is a contract change — stop; never push; no evidence with real-site content.

## STOP rules and forbidden fixes

**Stops the gate:** a pre-registered exit check fails after 2 fix rounds; the byte-identical formatter
test fails (T4.2) and the proposed fix is to regenerate the expected text; a `CLAUDE.md` runtime
invariant would have to change (`unwrapResult` null-or-undefined, IIFE content script, no top-level
`await`, top-level `webRequest` listeners, never logging URLs — `step-agent` ESCALATION list); a
security-boundary question; an unexplained port-9234 holder.

**Continues anyway, recorded:** BG-1…4 and SCREEN-4 results in either direction (they are findings,
and Step 8 reads them); a longer-than-expected flash in SCREEN-1 (report the number); build decisions
on module layout inside `daemon/src/` or `extension/src/`.

**Forbidden fixes for this step** (derived from 0.1–0.8 and `long-run` §3):
- weakening a lease or lock invariant to make a test or an E2E row pass: letting a call on a held tab
  through, skipping the lock when the target "is already active", making the lock not FIFO, releasing
  it on anything but the holder's completion/timeout/disconnect;
- regenerating the stored expected text in T4.2 from the new formatter (the fixture is captured from
  the baseline, once);
- adding `chrome.windows.update({focused: true})` to `activateForCapture` to make a capture work (0.5:
  no window focus; `focusTab` is the only exception);
- removing the `tabId` fallback or its warning early (Step 8 owns the removal), or making the daemon
  omit `tabId`;
- logging a URL, `lastUrl`, title, header value or body from the service worker or the daemon to debug
  a handle or lease;
- lowering the 1 s activation wait or the 50 ms frame wait to shave the flash without a measurement
  that says it is safe;
- changing `newTab`'s default back to `active: true` in the extension (the MCP passes it explicitly).

## Open items

Findings for the Stage-0 spec audit (which also re-examines Step 6's as-built register by execution),
what the plan leaves open, who decides, revisit triggers, and the keyboard summary.

**Findings for the Stage-0 audit**
- T3 says `selectTab` is **removed** from the extension, and T3's last checkbox keeps `selectTab` as an
  alias to `focusTab` for one release. Both cannot hold; the audit picks one and the T3 report records
  it (exit check T3.5).
- 0.3 marks `networkClear` as lease-checked with an explicit note of doubt ("hmm"). The spec §6.3 lists
  only `listTabs`, `networkRequests` and `daemon.status` as free, so "checked" is consistent with the
  spec; the audit confirms and the doubt is closed.
- T1 lists `actions.ts ×5` `activeTab()` calls; `extension/src/handlers/actions.ts` has 4 (lines 6, 12,
  39, 85). Total call sites across handlers today: 13.
- The regression smoke cites `DL-1`; `docs/e2e-test-plan.md` has no `DL-*` rows (same finding as
  Step 6). A download row must be written before the wave.
- The fixture's "open popup" button (LEASE-3) is in Files touched but no Part adds it. The audit assigns
  it to a stage (T1 or T3 lane, `test-fixtures/`).
- Actor name `claude-code #<pid>` (spec §8.3, the `#4412` examples) vs `process.ppid` (Step 6 D5) —
  carried from Step 6's audit; the `browser_list_tabs` format in T4 prints whichever Step 6 settled.
- 0.2: handles are not persisted, so a daemon restart (idle exit, handover) renumbers every tab. A
  Claude session's cursor handle becomes `TAB_UNKNOWN` after a handover mid-session. The plan says
  "documented"; the audit decides whether the MCP re-claims the active tab on `TAB_UNKNOWN` (a Step 8
  cursor question) or the user is told.
- T2 says `extensionStatus` is "already emitted (Step 6)" — verified by execution against Step 6's
  as-built, not assumed (it is Step 6's exit check D2.7).

**Left open by design:** `tabs.claim {wait:true}`; read-only foreign snapshots; generation-stamped
refs; `daemon.kick` (follow-ups).

**Who decides:** the shape of `HandleTable`/`LeaseTable` internals, the fixture button's stage, test
file placement → session agent (`By: Claude`); anything on the wire (event names, params, codes), the
lease/lock rules, what the human sees (0.5, 0.8) → contract; a pre-stated rule applies or the
conservative rule of `long-run` §3 with the decision listed for the user.

**Revisit triggers:** a real collision between a script and a Claude session wanting one tab (spec
§13 → `{wait:true}`); BG-1/BG-2 failing (Step 8 policy); SCREEN-4 showing CDP renders a minimized
window (then `cdp` mode gains a use the docs should state).

**Needs the user's keyboard:** extension reload + `/mcp` (G7-1 if taken at T1, and at the start of the
T5 wave); the whole T5 wave; any push.

## Follow-ups (not this step)

- Locators, `waitFor({locator})`, node→ref, typed `Tab`, `BridgeError` enrichment, MCP cursor tools — **Step 8**.
- `tabs.claim {wait:true}` if a real hand-over need appears.
- Generation-stamped refs (`s7.e12`) → read-only foreign snapshots and stale-ref detection.
- `daemon.kick {clientId}` for a hung script holding tabs.
