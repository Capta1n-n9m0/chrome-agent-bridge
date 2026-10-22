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
