# Step 7 — as-built register

**Phase doc:** `docs/plans/2026-10-21-step7-multi-actor-tabs.md` · **Steps dir:**
`docs/plans/2026-10-21-step7-multi-actor-tabs-steps/` · **Baseline:** `0773a98` (542 tests, 42 files;
21 tools; 13 `activeTab()` call sites in `extension/src/handlers`, 4 in `actions.ts`).

One section per stage, appended at stage close, never rewritten; corrections are dated notes.

## Stage 0 — spec audit · 2026-10-22 · verifier: PASS-with-notes · commit 551d7fd

### Contracts (binding forward)
- Step 6's contracts hold: 25 runs on port 0 with a fake extension, all as stated in the Step 6
  as-built "Contracts binding forward" (`stage0-audit.md` § "Step 6 contracts executed"); the
  verifier re-ran C7, C8, C14 with its own script.
- Baseline re-measured: `npm test` 542 passed in 42 files; typecheck exit 0; 21 tools; 22 codes in
  `shared/src/codes.ts`, matching spec §10; 13 / 4 `activeTab()` sites.

### Decisions taken
- decisions.md · 2026-10-22 · Step 7 agents run Opus 5.5 (#37) — default, open for veto.
- #38 content-script failures returned as `{__bridgeError}` (T1); #39 one method table, downloads free
  (T2); #40 network `tab` scope kept (open); #41 Step 6 client against a Step 7 daemon: legacy path +
  no main-tree build between T2 and T4 (open); #42 stale extension refused by hello (open); #43 one
  "human's tab" resolver (T1/T2/T4/T5); #44 one deadline per call (T2); #45 LEASE-6 two-way (T5);
  #46 `@bridge/sdk/format` subpath (open); #47 T4.2 baseline in a worktree of T3's parent (T4);
  #48 check sharpenings and T5 PASS rules.

### Deviations from the phase doc
- Stage 0's step agent wrote 8 mechanical dated notes (A1–A6 and others, additions only). The session
  agent added dated notes on T1.4, T1.5, T2.4 (superseded in part by #41), T3.2, T5.2 and T6.1 (#48).
- The auditor ran `npm run build` in the main tree (harmless: nothing on 9234, build id unchanged);
  from now on every build until T4's commit runs in a clean worktree (#41 (B)).

### Estimates vs actuals
| Item | Estimate | Actual | Source |
|---|---|---|---|
| Stage 0 wall time | 1.5 h | ~39 min | agent run 12:16–12:55 UTC |
| Findings | — | 0 CRITICAL, 9 MAJOR, 17 MINOR, 9 NIT (+V8 NIT) | `stage0-audit.md` |
| Tests | 542 | 542 (docs only) | `npm test` |

### Needs the user's keyboard
- Nothing for this stage.

### Open decisions for the user
- #37, #40, #41, #42, #46 (also under Open decisions in `docs/decisions.md`).

## Stage T0 — types · 2026-10-22 · verifier: PASS-with-notes · commit 18520f9

### Contracts (binding forward)
- `shared/src/protocol.ts`: `TabCreatedParams {tabId, openerTabId?, url}`, `TabRemovedParams {tabId,
  lastUrl?, lastTitle?}`, `TabReplacedParams {addedTabId, removedTabId}`, `TabGoneParams {tab,
  lastUrl?, lastTitle?}`, `LeaseGrantedParams {tab, reason:"opener", url}`; guards
  `isTabCreatedEvent` … `isLeaseGrantedEvent` on the unchanged `isEvent`; `ScreenshotMode`,
  `SnapshotElement`, `SnapshotResult`; `ExtensionEventName`, `DaemonEventName`. Proof:
  `shared/test/protocol-step7.test.ts` (58 tests; 48 fail with `protocol.ts` at HEAD).
- `NetworkRequestsResult.text?` is optional and deprecated until T4 removes it (#49);
  `mcp/src/tools/registry.ts:282` reads `out ?? ""` meanwhile.
- `codes.ts`, `error.ts`, `isHello`, `fromWire` byte-identical; the #42 hello already passes `isHello`.
- Daemon and extension bundles byte-identical to HEAD's: no build-id handover from T0.

### Decisions taken
- #49 (with its update: the one-line mcp grant), #50 guard rules, #51 `code` stays optional (open).

### Deviations from the phase doc
- `text` deprecated, not removed (#49; *Superseded* note on T0's checkbox).
- The step agent did fix round 1 and the commit itself rather than through a fixer/builder (small,
  mutation-checked, re-verified). Accepted; later briefs repeat that level-2 agents do the work.

### Estimates vs actuals
| Item | Estimate | Actual | Source |
|---|---|---|---|
| Wall time | 0.5 h (audit: ~10 min) | ~28 min incl. one escalation | agent runs |
| Tests | ≥ 542 | 600 passed, 43 files | `npm test`, verifier clean worktree |

### Needs the user's keyboard
- Nothing.

### Open decisions for the user
- #51.

## Stage T1 — extension: `tabId`, codes, events · 2026-10-22 · verifier: PASS-with-notes · commit 0240c7c

### Contracts (binding forward)
- Every handler targets `targetTab(p, method)`: integer `tabId` → that tab; non-integer → `BAD_PARAMS`;
  "No tab with id" → `TAB_UNKNOWN`; absent → one warning per method (method name only), then the
  human's tab (`humansTab()` = `windows.getLastFocused({windowTypes:["normal"]})` → active tab, #43;
  no normal window → `NO_NORMAL_WINDOW` text naming DevTools/popup). `closeTab`/`selectTab` read
  `tabId ?? id` and never fall back. `grep -rn "activeTab()" extension/src/handlers` is empty.
- Errors: `{code, message, data?}` from `router.ts`; page functions return
  `{__bridgeError:"CODE:message"}` (`content/guard.ts`), `unwrapResult` keeps null/undefined →
  `REF_STALE` (#38); `describeDebuggerError` → `{code, message}`, every message byte-identical.
- Events `tabCreated`/`tabRemoved`/`tabReplaced` (T0 shapes, no `null`) from listeners at column 1 in
  `sw.ts`, through the offscreen relay; `TabInfoCache` refilled by a non-awaited `tabs.query({})`
  (no `storage.session`, F16).
- Hello `{type:"hello", token, role:"extension", proto:2}` — accepted by the Step 6 daemon's
  `parseHello` (verifier).
- `listTabs` adds `current: true` on the human's tab only. Network scope: `tabId` → `scope:"all"` →
  legacy `tab` → fallback (#52, #54).
- Fixture: `<a id="open-popup" … target="_blank">`; 13 106 bytes, LF.

### Decisions taken
- #52 (extension half), #54, #55, #56.

### Deviations from the phase doc
- T1.6 / G7-1 deferred to T5 (user away); also deferred: the offscreen relay's live event frame, the
  DevTools-focused resolver check, ACT-8's text, whether a synthetic click on the popup link sets
  `openerTabId` (LEASE-3 should try `trusted:true`).
- T3.3 sharpened (#55); NET-1 expected text moves to `12.8 KB` (#56, T5 writes the note).

### Estimates vs actuals
| Item | Estimate | Actual | Source |
|---|---|---|---|
| Wall time | 2.5 h (audit ~60 min) | ~45 min | agent run |
| Tests | ≥ 600 + new | 671 / 46 files (verifier worktree), then +5 in fix round 1 → 676 / 47 | T1 report |

### Needs the user's keyboard
- The extension reload (G7-1), deferred to the T5 wave.

### Open decisions for the user
- None new (#54 listed under T2's stage when it closes).

## Stage T2 — daemon: handles, leases, lock, intercept · 2026-10-22 · verifier: PASS-with-notes · commits e409706, cd346ed

### Contracts (binding forward)
- Pure modules `daemon/src/{handles,leases,lock,methods}.ts` and the tab layer `intercept.ts`:
  handles `T<n>` monotonic, `mint` idempotent, dead handles pruned after 1 h / 1 000; one lease per
  tab (`TAB_HELD {owner, since}`); FIFO `VisibilityLock` around default-mode `screenshot` (not
  `mode:"cdp"`, not `fullPage`), `focusTab` and `selectTab` (#53), released once per acquisition, on
  completion, deadline (`LOCK_TIMEOUT {holder}`) or disconnect; one deadline per call (#44); lease
  re-checked after the lock wait.
- The extension never receives `tab`: every tab method is forwarded with numeric `tabId`; the network
  "all" scope as `{scope:"all"}` (#52).
- Legacy path for Step 6 clients (#41, #54): no `tab` → the human's tab (`listTabs` `current:true`),
  a Chrome `id`/number → its handle; lease-checked, lock class unchanged, no lease granted, logged
  once per client without a URL. `closeTab`/`selectTab`/`focusTab` with neither → `BAD_PARAMS`.
- A no-proto extension: tab methods → `VERSION` + reload hint (#42); `listTabs`/`newTab`/free
  methods forwarded as in Step 6.
- `networkClear` "all" → `TAB_HELD` whenever another client holds any tab, checked synchronously
  (cd346ed; #57 update). `networkRequests` is free in every scope (spec §6.3).
- Events out: `leaseGranted {tab, reason:"opener", url}`, `tabGone {tab, lastUrl?, lastTitle?}`;
  resync from `listTabs` on every proto:2 extension hello (F15). `daemon.status` adds
  `tabs:[{tab, tabId, owner?, url?}]` and `lock:{holder?}`. `tabs.claim {tab | active:true}` →
  `{tab}`; `newTab` → `{id, tab}`; `listTabs` entries carry `tab`, `owner?`, `current?`.
- No URL, title or token in any new log line.

### Decisions taken
- #52 (daemon half, two Step 6 test fakes), #53, #54 (+ V5 note), #57 (with the networkClear update).

### Deviations from the phase doc
- T2.4 as superseded by #41 (legacy path instead of `BAD_PARAMS "tab is required"`).
- Two Step 6 tests' fakes edited (#52), assertions unchanged.
- Follow-up commit cd346ed: the networkClear "all" race closed (session agent's ruling).

### Estimates vs actuals
| Item | Estimate | Actual | Source |
|---|---|---|---|
| Wall time | 3 h (audit ~80 min) | ~70 min of agent time over the pause | agent runs |
| Tests | ≥ 676 + new | 748 passed / 52 files (daemon 137 → 209) | verifier clean worktree at e409706 + fix |

### Needs the user's keyboard
- Nothing.

### Open decisions for the user
- #54. Follow-up proposal (not decided): a session marker in the extension's hello so the daemon can
  retire handles when Chrome restarts and reuses tab ids (T2 verifier V4).

## Stage T3 — extension: data not text, screenshot modes, `focusTab` · 2026-10-22 · verifier: PASS-with-notes · commit 43c0a53

### Contracts (binding forward)
- `buildSnapshot` → `SnapshotResult {url, title, elements, truncated}` (field meanings: #58); the
  `hasLayout` gate kept; no password value on the wire. `networkRequests` returns no `text`.
- `screenshot {mode}`: default switch mode via `activateForCapture` (minimized → `WINDOW_MINIMIZED`
  before any switch; no window focus; 1000 ms activation wait and 50 ms frame wait unchanged; 500 ms
  capture spacing; one quota retry; per-window chain bounded at 30 s); `mode:"cdp"`; `fullPage` read
  as truthy, matching the daemon's lock decision.
- `newTab` opens in the background unless `active:true`; `focusTab` is the only call that focuses a
  window; `selectTab` is the same handler. `listTabs` adds `windowId` and `openerTabId`.
- T4.2's baseline: capture in a worktree of `51de800` (T3's parent).

### Decisions taken
- #58.

### Deviations from the phase doc
- No test deleted: 38 snapshot text assertions became element assertions; their list is handed to T4
  (T3 report) for the formatter tests. T1's background-screenshot refusal test replaced one for one.
- Pre-existing, left unchanged for the baseline: frames nested inside a same-origin frame are never
  entered.

### Estimates vs actuals
| Item | Estimate | Actual | Source |
|---|---|---|---|
| Wall time | 2.5 h (audit ~40 min) | ~44 min of agent time over the pause | agent runs |
| Tests | ≥ 748 | 793 passed / 53 files | verifier clean worktree |

### Needs the user's keyboard
- The extension reload, at T5. Until T4 lands and the reload, `browser_snapshot` would print
  `undefined` and the network tool an empty string — nothing is built in the main tree, so no live
  session sees it.

### Open decisions for the user
- None new. Open NIT/MINOR: T3 verifier V4 (a timed-out capture's restore can undo a later
  `focusTab`) — a T5 watch item.

## Stage T4 — SDK formatters + MCP pass-through · 2026-10-22 · verifier: PASS-with-notes · commit 138c7f6

### Contracts (binding forward)
- Formatters in `sdk/src/format/{snapshot,network}.ts`, exported through the SDK's `./format` subpath
  (#46); `sdk/src/index.ts` keeps its five exports. Byte-identical to the baseline at `51de800`:
  `sdk/test/fixtures/baseline-51de800.json` (23 snapshot, 12 network, 11 helper fixtures), compared
  with `toBe`; the verifier's fresh re-capture matched.
- `NetworkRequestsResult.text` removed (#49).
- MCP: 22 tools (`browser_focus_tab` added); 18 schemas with `tab: z.string().optional()`; a cursor
  (`mcp/src/cursor.ts`) claimed on first touch, lost on a 4002 reconnect or a new client with a
  one-time notice (#59); `browser_select_tab` claims, never activates; `browser_list_tabs` prints
  `T3* [owner] Title — url`; `TAB_HELD` shows the owner's actor name. `lifecycle.ts` untouched.
- Cross-package test `mcp/test/multi-actor.test.ts`: real daemon + SDK + MCP over `ws` on port 0 with
  a fake proto:2 extension.

### Decisions taken
- #59, #60.

### Deviations from the phase doc
- None beyond the decisions. `docs/setup.md` and `docs/e2e-test-plan.md` updated (T4.5), with dated
  notes on rows whose output changes by design; no recorded result changed.

### Estimates vs actuals
| Item | Estimate | Actual | Source |
|---|---|---|---|
| Wall time | 2.5 h (audit ~45 min) | ~56 min | agent run |
| Tests | ≥ 793 + new | 934 passed / 59 files | verifier clean worktrees |
| Tools | 22 | 22 | `grep -c "server.tool("` |

### Needs the user's keyboard
- `/mcp` or a fresh session for any interactive Claude session (its MCP bundle predates T4), after
  the T5 build.

### Open decisions for the user
- None new. Follow-ups: dead network formatters in `extension/src/network-log.ts` (T6 or Step 8);
  the cursor notice's wording on a non-4002 close; a clean-tree guard in `capture-baseline.ts`.

## Stage T5 — E2E, Run 8 · 2026-10-22/23 · wave verifier: PASS-with-notes · commits e7e56ff, 87c75c5, 8ed3e89

### Results
- PASS: RELOAD-1, LEASE-1, LEASE-2, LEASE-4, LEASE-5, LEASE-6 (outcome (b): a Memory-Saver discard
  gave a new tab id; the handle survived through `tabReplaced` — #45's revisit trigger met, Stage 0
  F7's premise wrong), LEASE-7, BG-3, BG-4; SCREEN-4 PASS-as-designed; designed-change rows (#60);
  ACT-8 and the offscreen relay's live event frame (G7-1 deferrals); regression rows except NET-1.
- FAIL (bridge): SCREEN-2 (cdp on a hidden tab → `TIMEOUT` 35 s), BG-1/BG-2 (trusted input into a
  background tab answers `ok`, does nothing; retry not run, #61), LEASE-3 (`leaseGranted.url` `""`).
- FAIL (check defects, pre-written): SCREEN-1, SCREEN-3, SCREEN-5, RESOLVER-1. NET-1: Chrome's cache.
- SCREEN-1 flash: 1509 / 1486 / 1493 ms, median 1493 ms (page-side `visibilitychange` timestamps).
- Daemon log `T5-daemon-log.txt`: `://` 0, token 0.
- The user's rulings: #62 (T5b, then Run 9).

## Stage T5b — fixes from Run 8 · 2026-10-23 · verifier: PASS-with-notes · commit 12ecb65

### Contracts (binding forward)
- A failed or hung switch capture restores the previous tab (once; skipped if the window moved on or
  `focusTab` touched it); chain released by 30 s. `screenshot {mode:"cdp"}` refuses a minimized window
  (`WINDOW_MINIMIZED`) or a background tab (`OFFSCREEN`) before attaching. `leaseGranted.url` filled by
  polling `listTabs` (100 ms, ≤ 2 s); the grant itself at once.
- Daemon build id `490f1c60e04464b7e184fcb150699484cc5ca176d7041c726f8a2a4d0507d974` (main tree).

### Decisions taken
- #63.

### Estimates vs actuals
| Item | Estimate | Actual | Source |
|---|---|---|---|
| Tests | ≥ 934 + new | 965 passed / 59 files | verifier clean worktree |

### Needs the user's keyboard
- The extension reload before Run 9.

### Open decisions for the user
- None new. Docs owed by T6/the propagator: spec §7 *Superseded* note on the cdp mode; stale comments
  on `ScreenshotMode` and `LeaseGrantedParams.url` in `shared/src/protocol.ts`.
