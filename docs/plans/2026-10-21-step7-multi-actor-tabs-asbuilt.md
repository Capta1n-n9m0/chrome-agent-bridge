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
