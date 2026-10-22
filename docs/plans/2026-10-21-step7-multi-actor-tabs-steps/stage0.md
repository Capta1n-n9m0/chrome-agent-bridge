# Step 7 — Stage 0 (spec audit) — step report

**Date:** 2026-10-22 · **Step agent:** Claude Opus 5.5 (`claude-opus-5-5`); auditor, verifier and fixer
also Opus 5.5 · **Baseline:** `0773a98` · **Ledger:** `stage0.ledger.md` (this directory).

## 1. Verdict

**DONE.** Every exit criterion is met (table in §2). No feature code was written. No Step 6 contract
failed, so there is no CRITICAL finding. There are 9 MAJOR findings, all with a resolution. Four of
them need a contract-level ruling ("for user review", §5), and the session agent should record those
before T0 starts.

## 2. Outputs

| File | sha256 (at hand-back, before commit) |
|---|---|
| `stage0-audit.md` (auditor; fixer round 1 applied) | `0e2cf804695e09428a208c1848cbba61dd6bab7bfa886a9f9935d3e4e407e931` |
| `stage0-verifier.md` (verifier, with the re-check section) | `46f14d494d035a606a2e2b7149bb5087bd6f62e2a0270b37aef6e53ee938c641` |
| `docs/plans/2026-10-21-step7-multi-actor-tabs.md` | 8 dated *Corrected 2026-10-22 (Stage 0)* notes; additions only (41 lines, 0 removed) |

The scratch scripts stay outside the repo, in the session scratchpad
`C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\c98ff063-f897-4628-815e-2841acf83300\scratchpad`:
`step6-contracts.mts`, `probe-extra.mts` (auditor) and `verifier-probe.mts` (verifier), each with an
`.out.txt`.

**Measured (2026-10-22):**
- `npm run typecheck`: exit 0.
- `npm test`: `Test Files 42 passed (42)` / `Tests 542 passed (542)`, by the auditor and again by the
  verifier.
- `npm run build`: exit 0. The auditor ran it in the main tree; the build id is the same as W1's,
  `795fb769…` (see §4).
- Test count: 542 → 542. This stage changed no code.

**Counts, re-derived by command by both agents:**
- 13 `activeTab()` call sites in `extension/src/handlers`, 4 of them in `actions.ts` (lines 6, 12, 39, 85).
- 21 tools (`grep -c "server.tool("`); the plan's 22 after T4 is consistent.
- 22 codes in `shared/src/codes.ts` (9 daemon, 13 extension), matching spec §10 one by one.
- 22 extension methods in `sw.ts`.
- `NetworkRequestsResult.text` at `shared/src/protocol.ts:204`.

**Step 6 contracts, executed:** 25 of 25 runs hold. They used port 0 or OS-assigned ports, a fake
extension, a fake token from the env, and the real `daemon/src` and `sdk/src` code. The table is in the
audit's "Step 6 contracts executed" section.

**Exit criteria:**

| # | Criterion | Met? | Evidence |
|---|---|---|---|
| 1 | Every finding has evidence, a severity, a tag and a resolution | yes, after fixer round 1 | verifier V1 → RESOLVED |
| 2 | The §4 (a) Step 6 contracts were executed on port 0 | yes | 25/25 hold; the verifier re-ran C7, C8 and C14 with its own script |
| 3 | Counts re-derived by command | yes | above |
| 4 | The verifier re-executed five findings | yes, all five AGREE | Step 6 contracts C7/C8/C14, F8, F5, F2, F4 |
| 5 | A stage split with estimates | yes | audit "Proposed stage split"; §7 below |
| 6 | Mechanical phase-doc notes written and committed | yes | 8 notes, in this stage's commit |

## 3. Verifier verdict

**PASS-with-notes.** The first pass was FAIL on one MAJOR finding: V1, the NIT findings had no tags,
two had no evidence, and one quote was wrong. Fixer round 1 fixed V1–V7. The re-check found all seven
resolved, plus one new NIT:

- **V8:** `closeTab` still also sits in F2's "tab-carrying" list, so it appears in two classes. This
  is left for T2, which owns the method table.

The verifier's file is `stage0-verifier.md`.

## 4. Deviations from the phase doc and brief

- **The stage split is not in `journal.md`.** Kickoff §4 says Stage 0 writes the split into
  `journal.md`, but the journal belongs to the session agent. The split is in the audit and in §7
  below, for the session agent to copy.
- **The auditor ran `npm run build` in the main tree.** This was harmless: nothing was listening on
  9234 and the build id was unchanged. It does go against the "build in a clean worktree" lesson, and
  the audit now says that every build until T4's commit runs in a clean worktree (V6).
- **Not applied, because they touch pre-registered checks or are more than mechanical:**
  - F25's rewrites of T1.4, T1.5 and T6.1. T6.1 cannot fail as written, because the sentence it greps
    for is split across `CLAUDE.md` lines 50–51.
  - F26's PASS rules for LEASE-2, LEASE-6, SCREEN-1, SCREEN-2, SCREEN-4 and BG-1…4.
  - The resolutions of F1–F26.

  These are for the session agent (§5 and the audit's "Amendments").

## 5. Proposed decisions

The full blocks are in the audit's "Proposed decisions" section. Below is each one in short form.
Items 3, 4, 5 and 9 are contract-level, for user review.

### 2026-10-22 · Content-script failures are returned, not thrown, to carry `CODE:message`
**Decided:** The page functions return `{__bridgeError:"CODE:message"}`. `unwrapResult` turns that
into a `BridgeError`, and still treats a null or undefined result as `REF_STALE`.
**Why:** A thrown injected function resolves with `result: null`, so a prefixed message never arrives
(F1).
**Instead of:** Prefixing thrown messages, as 0.6 says.
**Revisit if:** Chrome adds an `error` field to `InjectionResult`.
**By:** Claude (proposed)

### 2026-10-22 · The daemon's method classes are one table, and the download methods are free
**Decided:** `route.ts` puts every method in one table. Only a tab-carrying method without `tab` gets
`BAD_PARAMS` (or F5's legacy path). `downloadStart`, `downloadChunk` and `downloadEnd` are free.
`closeTab` is intercepted and lease-checked; per V8, it belongs only in that class.
**Why:** Without this, `browser_download` breaks (F2).
**Instead of:** "No `tab` and not free → `BAD_PARAMS`".
**Revisit if:** A new extension method is added (it must go into the table).
**By:** Claude (proposed)

### 2026-10-22 · The `tab` parameter keeps its "all"/"active" meanings for the network tools — for user review
**Decided:** `tab` is a handle, `"all"` or `"active"`/absent. A bare number from a Step 7 client is
`BAD_PARAMS`. `networkClear {tab:"all"}` is refused with `TAB_HELD` if another client holds a tab
that has entries.
**Why:** `tab` already means a scope on the wire and in the MCP schemas (F3).
**Instead of:** Reading every `tab` as a handle, or renaming the scope parameter.
**Revisit if:** Step 8 redesigns the network tools.
**By:** Claude (proposed, contract-level)

### 2026-10-22 · A Step 6 client keeps working against a Step 7 daemon for one release, without loosening a lease — for user review
**Decided:** Option (C).
- **Daemon legacy path:** a tab-carrying call with no `tab` (or `closeTab`/`selectTab` with a Chrome
  `id`) is resolved to the human's tab (or the id's handle). It is lease-checked like an explicit
  `tab`, and the method's lock class applies unchanged. No lease is granted. It is forwarded with
  `tabId` and logged once per client, with no URL.
- **Build discipline:** no `npm run build` in the main tree between T2's and T4's commits; verifiers
  build in clean worktrees.

Step 8 S2 removes the legacy path together with the extension's fallback.
**Why:** The knock hashes the daemon file on disk (`sdk/src/knock.ts:162`), so every running Step 6
MCP would adopt a freshly built Step 7 daemon. Every tool would then fail with `BAD_PARAMS` (F5;
the verifier agrees).
**Instead of:** (A) alone or (B) alone, or forwarding without `tabId`. The last would loosen a lease,
which is forbidden.
**Revisit if:** Step 8 S2 lands.
**By:** Claude (proposed, contract-level)

### 2026-10-22 · A stale extension is refused for tab calls, detected by its hello — for user review
**Decided:** T1's extension hello carries `role:"extension", proto:2`; a Step 6 daemon accepts it
(probe P1). T2's daemon answers tab-carrying methods with `VERSION`, plus a reload hint, when the
extension's hello had no `proto`.
**Why:** An extension that was not reloaded ignores `tabId` and acts on the active tab, past every
lease (F6).
**Instead of:** Relying on the `unknown method` text.
**Revisit if:** The extension's hello gains a build id.
**By:** Claude (proposed, contract-level)

### 2026-10-22 · "The human's tab" is the active tab of the last-focused normal window
**Decided:** One resolver, `windows.getLastFocused({windowTypes:["normal"]})` → its active tab,
serves all of these:
- the 0.1 fallback;
- `listTabs`' marker;
- `tabs.claim {active:true}`;
- F5's legacy path;
- `browser_status` and `browser_list_tabs`.

When there is no normal window, the error names a DevTools or popup window as the likely cause.
**Owners:** T1, T2, T4 and T5.

The DevTools-focused case is unconfirmed (V2). A live check is pre-registered at G7-1 or in T5: with
the service-worker console focused, `browser_status` and `browser_snapshot` name and act on the same
tab.
**Why:** W1 proposal 3, accepted (#36) (F8). No E2E expected text changes, because every row uses an
`[<id>]` placeholder.
**Instead of:** `lastFocusedWindow:true`, or "the first active tab of any window".
**Revisit if:** A row shows a popup window, or the DevTools-focused check fails.
**By:** Claude (proposed)

### 2026-10-22 · One deadline per call covers the lock wait and the forwarded call
**Decided:** `deadline = received + clamp(timeoutMs ?? 30000, 100, 600000)`.
- The lock wait ends at the deadline with `LOCK_TIMEOUT {holder}`.
- The forwarded call then waits `deadline − now + 5000`.
- The extension gets no deadline, so the revisit trigger of D2's decision does not fire.

**Why:** Two separate waits would outlive the SDK client's own timer (F9).
**Instead of:** A fresh `daemonWaitMs` after the lock is taken.
**Revisit if:** The extension needs the caller's deadline.
**By:** Claude (proposed)

### 2026-10-22 · LEASE-6 measures whether a discard keeps the tab id, with both outcomes pre-written
**Decided:** LEASE-6 records the tab id before and after a discard. "Same id, no `tabReplaced`" and
"new id, `tabReplaced`" both PASS if the handle still works.
**Why:** The docs say `onReplaced` fires only for prerendering, and Chromium's 2024 discard keeps the
tab's contents, so the premise is probably false on Chrome 156 (F7). This is unconfirmed.
**Instead of:** The row as written.
**Revisit if:** LEASE-6 shows a new id.
**By:** Claude (proposed)

### 2026-10-22 · The formatters reach the MCP through a `@bridge/sdk/format` subpath — for user review
**Decided:** T4 adds a `./format` export to the SDK. `index.ts` keeps its five exports, and Step 8
adds the formatters to it.
**Why:** The SDK's public surface belongs to Step 8 (F23).
**Instead of:** Exporting the formatters from `index.ts` in Step 7.
**Revisit if:** A recipe needs the formatters before Step 8.
**By:** Claude (proposed, contract-level)

### 2026-10-22 · T4.2's baseline is captured in a worktree of T3's parent commit
**Decided:** T4's builder captures the baseline `buildSnapshot` and `formatEntries` text over the
existing fixtures, once, in a worktree of T3's parent commit. It stores the result under
`sdk/test/fixtures/` with that commit id, and the verifier repeats the capture.
**Why:** No whole-text baseline exists, and T3 changes `buildSnapshot` first (F11).
**Instead of:** Capturing from the new code, which is forbidden.
**Revisit if:** The capture cannot run in the worktree.
**By:** Claude (proposed)

## 6. Findings

**Counts:** 0 CRITICAL, 9 MAJOR, 17 MINOR, 9 NIT, plus the verifier's V8 NIT. The MAJOR findings:

| # | Finding | Owner or ruling |
|---|---|---|
| F1 | `CODE:message` cannot travel on a content-script throw | T1 |
| F2 | The download methods are not in the free list | T2 |
| F3 | `tab` already means a scope on the network methods | contract-level |
| F4 | `closeTab`/`selectTab` read `p.id`; the 0.1 fallback must not apply to them | T1/T3 |
| F5 | A Step 6 MCP adopts a freshly built Step 7 daemon | contract-level, (C) |
| F6 | A stale extension acts past every lease | contract-level |
| F7 | LEASE-6's premise is probably false | T5 row rewrite |
| F8 | The active-tab mismatch | T1/T2/T4/T5 |
| F9 | The lock wait and the call wait need one deadline | T2 |

**Chrome behaviour still unconfirmed.** Each item has a live row that confirms it:
- whether a discard keeps the tab id (LEASE-6);
- `captureVisibleTab` on a minimized or covered window (SCREEN-4, SCREEN-5);
- the paint timing of `tabs.onActivated` (SCREEN-1);
- `openerTabId` for tabs the extension creates (LEASE-1, LEASE-3);
- calls on a discarded or frozen tab (LEASE-6, BG-4);
- `getLastFocused({windowTypes:["normal"]})` while DevTools has focus (G7-1 or T5).

**Read only, not executed:** whether the offscreen relay can carry an event frame with no id. That
needs Chrome; T1's live check covers it.

**Possible new `CLAUDE.md` gotcha (measured by reading):** the SDK's knock hashes
`daemon/dist/index.js` on disk at every knock, so a client started from an older bundle adopts
whatever daemon was built last (F5).

## 7. Handoff

- **Running:** nothing from this stage. Port 9234 is free. PID 22152 (codex) was not touched. No
  scratch file is in the repo.
- **Proposed stage split** (the default is kept). Estimates are agent wall time; Step 6 ran at about a
  quarter of the kickoff budgets.

  | Stage | Estimate (kickoff budget) | Absorbs |
  |---|---|---|
  | T0 | ~10 min (0.5 h) | F13, F21, the D0 revisit ruling |
  | T1 ∥ T2 | T1 ~60 min (2.5 h), T2 ~80 min (3 h) | T1: F1, F4, F6-hello, F8-resolver, F16–F18, F29, F30, F33. T2: F2, F3-daemon, F5 (A), F6-gate, F8-claim, F9, F12, F14, F15, F20, V8 |
  | T3 | ~40 min (2.5 h) | F10, F19, F4 (`focusTab`) |
  | T4 | ~45 min (2.5 h) | F3-MCP, F11, F12, F23, F24, the cursor notice |
  | T5 | ~25 min (1.5 h) + the live wave (3 h) | F7, F10, F18, F26's PASS rules, the V2 check |
  | T6 | ~15 min (1 h) | F25 (T6.1), F31, F32, the spec notes |

- **Before T0, the session agent:**
  - records the decisions above, and puts the four contract-level ones under Open decisions;
  - rules on the F25 check rewrites and the F26 PASS rules (they touch pre-registered checks);
  - puts F5 (B) ("no main-tree `npm run build` until T4's commit") into the T2, T3 and T4 briefs.
- **Needs the user's keyboard:** nothing for this stage. The contract rulings (F3, F5, F6, F23) wait
  at the gate.
