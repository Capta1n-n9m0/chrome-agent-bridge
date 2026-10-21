# Step 7 — Multi-actor tabs: `tabId` everywhere, handles, leases, the visibility lock, structured errors

> **DRAFT — not yet started.** For agentic workers: TDD for the daemon's `HandleTable`, `LeaseTable`,
> `VisibilityLock` and the `intercept` layer (all pure), for the extension's `BridgeError` → wire
> mapping in `Router`, and for `buildSnapshot` returning elements. The `chrome.tabs` listeners,
> activation sequencing and the background-tab behaviour of CDP are manual E2E. Each Part leaves
> `npm test` + `npm run typecheck` green. Prerequisite: Step 6 (`…step6-daemon-and-protocol-v2.md`)
> complete and E2E-passed. Design: spec §5, §6, §7, §10. **This step changes the wire protocol in a
> way the extension must follow — build and reload the extension before E2E (`unknown method` /
> `BAD_PARAMS tabId` means an old worker).**

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

## 0. Design decisions (local to this step)

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
with `tab:"all"` or a tab param (**read**, not RefMap-touching), `networkClear` (hmm — clears shared
state; **checked**), `daemon.*`, `tabs.claim/release`. `newTab` leases its result to the caller.
`closeTab` is checked.

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
extension handler no longer builds `text`; `NetworkRequestsResult.text` is removed from the wire.

### 0.8 `newTab` no longer activates

`chrome.tabs.create({url, active: false})` — a script opening a tab must not steal the screen. The MCP
passes `active: true` explicitly only from `browser_new_tab` when the cursor is on the human's active
tab (Step 8 decides; in this step the MCP passes `active: true` to preserve today's behaviour).

---

## Part T0 — Types

- [ ] `shared/src/protocol.ts`: `SnapshotElement`, `SnapshotResult`, `TabCreatedParams`,
      `TabRemovedParams`, `TabReplacedParams`, `TabGoneParams`, `LeaseGrantedParams`,
      `ScreenshotMode = "switch" | "cdp"`; `NetworkRequestsResult` loses `text`.
- [ ] Tests for any new guard (events have a `params` object).

## Part T1 — Extension: `tabId`, codes, events (no behaviour change when `tabId` is absent)

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

## Part T2 — Daemon: handles, leases, lock, intercept (TDD)

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

## Part T3 — Extension: data not text, screenshot modes, `focusTab`

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

## Part T4 — SDK formatters + MCP pass-through

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

## Part T5 — E2E (manual; `docs/e2e-test-plan.md` LEASE-1…10, SCREEN-1…5, BG-1…4)

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

## Part T6 — Docs + commits

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

## Follow-ups (not this step)

- Locators, `waitFor({locator})`, node→ref, typed `Tab`, `BridgeError` enrichment, MCP cursor tools — **Step 8**.
- `tabs.claim {wait:true}` if a real hand-over need appears.
- Generation-stamped refs (`s7.e12`) → read-only foreign snapshots and stale-ref detection.
- `daemon.kick {clientId}` for a hung script holding tabs.
