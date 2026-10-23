# Step 8 Stage 0 — spec audit: step report

**Date:** 2026-10-23 · **Step agent:** Opus 5.5 · **Baseline:** `1a62620` · **Ledger:** `stage0.ledger.md`

## 1. Verdict

**DONE.** The audit is written and verified. Every Step 7 contract held when executed. Seven findings
are escalated to the session agent, because resolving them would change a pre-registered rule
(§5, §6). Stage S0 starts only after the session agent rules on them and records the contract-level
decisions.

## 2. Outputs

- `stage0-audit.md`: the audit. It has 35 findings (F1–F35): CRITICAL 2 · MAJOR 14 · MINOR 15 · NIT 4.
  It also covers the Step 7 contract runs (§2), the verdicts on #71–#77 (§3), the rulings checked by
  premise (§4), the blind spots (§5), the testability of 50 exit checks (§6), the proposed stage split
  (§7) and a Chrome facts table (§8).
- Dated phase-doc notes in `docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor.md`: 403 lines
  added, 0 deleted (`git diff --stat`). These cover the FE and S2b stages and their exit checks,
  copied from kickoff §7. The clauses Stage 0 flags are marked, not changed. The notes also move
  S2.2's greps to S2b with `-rn`, add S2.6, S0.4 (`NO_CURSOR`, `focusEmulation?`, the hello's
  `session?`, `asRef?`), S3.4 per #75, S3.5 with a positive control, and G8-1 resolved by FE. They add
  SDK-1 (a new recipe, *proposed*), SDK-8's fixture "human" tab, SM-1, SM-0 (*proposed*), F2's note
  under 0.4, and fix stale line numbers.
- Sub-reports: `stage0-builder.md` (the merge), `stage0-verifier.md` (verifier, with the re-check),
  `stage0-fixer1.md`. The auditors' raw parts and scratch tests are in the session scratchpad
  (`…/scratchpad/stage0/{A,B,C,V}/`) and are not committed.
- Measured baseline (A, B and the verifier, each in a clean worktree of `1a62620` after `npm ci`):
  - `npm test` → 59 files, 950 tests passed.
  - `npm run typecheck` → exit 0.
  - `grep -c "server.tool(" mcp/src/tools/registry.ts` → 22.
  - 22 codes in `shared/src/codes.ts`; `grep -c NO_CURSOR` → 0.
- Test count: 950 → 950. No code or test changed.

## 3. Verifier verdict

**PASS-with-notes** (`stage0-verifier.md`). The first pass was FAIL on V1 (MAJOR): F2's fix covered
SDK `Tab` objects only. Fixer round 1 rewrote it, and the re-check resolved V1–V4. One NIT is left
(V5: option (a) writes a file for every new handle; reserving numbers in blocks avoids that).

The verifier re-ran five findings independently and agreed with all five:
- **F2**, end to end through two real daemon instances on port 0: the stale `click {tab:"T3"}` reached
  the fake extension as `{"ref":"e1","tabId":1}`, the human's tab.
- **F1**, against Chromium source the verifier fetched itself.
- **F8**: `locate` with no `tab` was forwarded unchecked while another client held the tab.
- **F6**: the marker comes back without `data`.
- **One Step 7 contract run**: `TAB_HELD {owner, since}`; `LOCK_TIMEOUT {holder}` at 303 ms; `tab`
  reached the extension in 0 of 4 requests; one deadline per call, timed out at 7012 ms.

## 4. Deviations from the phase doc

- **The audit was split across three parallel auditors** (A, B, C) and then merged by a builder,
  instead of one auditor. The scope was unchanged and the merge kept the source IDs.
- **No Chrome or CDP scratch experiment was run**, under the brief's "never touch Chrome". A stray
  `--user-data-dir` would hand the command to the user's running Chrome. Chrome facts come from
  Chromium `main` source and the Chrome docs, and stay unconfirmed for Chrome 156 until FE-0…FE-5 and
  SM-1 run.

## 5. Proposed decisions

### 2026-10-23 · SDK-1 is a new recipe; `recipes/hello.ts` stays the MUX rows' instrument
**Decided:** SDK-1 runs a new recipe file, and S6.2 gets a dated note naming it. `recipes/hello.ts`
and the expected text of MUX-3/5/6/8/10 stay as they are. **Why:** `hello.ts` is the instrument of
five recorded rows. Rewriting it would re-date their expected text without a new measurement.
**Instead of:** rewriting `hello.ts` and re-dating those rows. **Revisit if:** S6 finds the two
recipes drifting apart. **By:** Claude (proposed; design-local, so the session agent records it).

### 2026-10-23 · S2.2's greps move to S2b's close, recursive
**Decided:** S2.2's `activeTab`/`selectTab` greps run at S2b's close as `grep -rn …`. **Why:** the
removals move to S2b, and `grep -n "selectTab" extension/src` exits 2 ("Is a directory") with empty
output, so as written it can never fail (F16). **Instead of:** keeping it in S2. **Revisit if:**
never. **By:** Claude (mechanical; already written as a dated note).

### 2026-10-23 · Stage split for Step 8 (for `journal.md`)
**Decided:** the order is the kickoff §7 default: S0 → (S1 ∥ FE build) → FE live → S2 → (S2b ∥ S3) →
S4 → S5 → S6 → S7. The budgets are adjusted as in `stage0-audit.md` §7:
- S0: 0.75 h
- S1: 2.25 h
- FE: 1.75 h build + 1.5 h live
- S2: 2.5 h
- S2b: 4 h (3.5 h if F2's option (a) is rejected)
- S3: 3.5 h
- S4: 2 h
- S5: 3 h (+0.25 h if (a) is rejected)
- S6: 1.5 h + 3.25 h live
- S7: 1 h

**Why:** the items the findings add (listed per stage in §7). **Instead of:** the kickoff's
budgets. **Revisit if:** the rulings on F2, F5 or F7 change S2b's scope. **By:** Claude (proposed).

The contract-level and pre-registered-rule items are listed under §6 for the session agent. I did
not decide any of them.

## 6. Findings

**CRITICAL**
- **F1 · plan-side · FE · ESCALATION.** In Chromium source, `Emulation.setFocusEmulationEnabled`
  raises a visible capturer (`IncrementCapturerCount(stay_hidden=false)`), so the target's page reads
  `visible` while the option is on. FE-4's "target stays hidden" and FE-1/FE-2's copied "target
  hidden" would then fail on something the human never sees, and the table would read (B).
  **Proposed:** before FE-0…FE-5 are committed, FE-4 judges only what the human sees. The target's
  visibility becomes a pre-registered observation, and FE-1/FE-2 read it after the call returns.
- **F2 · plan-side · S2b + S3 · contract-level.** After a daemon restart, a stale explicit handle
  resolves to a different, unheld tab. The premise of ruling #11 and phase 0.4 ("a stale handle
  returns `TAB_UNKNOWN`") is wrong. This is not a Step 7 contract violation: Step 7 promises unique
  handles only within one daemon. **Proposed:** (a) a new daemon never reuses a handle number
  (high-water mark under `~/.chrome-agent-bridge/`, no wire change; S2b), plus the S3 `Tab` guard.
  This is an Open decision for the user under the conservative rule.

**MAJOR**
- **F3 · FE · ESCALATION.** The FE outcome table is not total: (B) and (C) overlap, FE-0 and FE-5
  across trials are undefined, the debugging banner shows on every trusted call, there is no
  positive control, and trials need a fresh tab each. **Proposed:** amend #71's table before the FE
  rows are committed.
- **F4 · FE.** Trusted `type` focuses the field before emulation is on, and FE-3 has no focus step.
  **Proposed:** state the order in the FE stage text.
- **F5 · S2b (#74) · contract-level.** The session marker cannot live in `storage.session`, which an
  extension reload empties. `onStartup` races the first hello (`sw.ts` `connect()` runs first), and
  the client key ignores the marker. **Proposed:** amend #74's mechanism. Make the marker choice a
  pure tested function over five event orders, add a fifth test branch, and add row SM-0.
- **F6 · S1 · ESCALATION (a `CLAUDE.md` invariant).** The `{__bridgeError}` marker drops `data`, so
  `LOCATOR_* {candidates, matches}` cannot reach the handler. **Proposed:** an additive
  `__bridgeData` field. The `__bridgeError` string and the null/undefined → `REF_STALE` rule stay.
- **F7 · S2b (#57).** Recipes (`hello.ts`, `t5.ts:552-553` LEASE-6, `t5-lib.ts`), five daemon tests
  and `registry.ts` read the Chrome `id` beside `tab`. **Proposed:** a dated decision to keep the
  `id`, or grant S2b `recipes/`. Recommended: keep it.
- **F8 · S2.** An unlisted method sent with no `tab` is forwarded with no lease check.
  **Proposed:** `locate` enters `methods.ts` in the same commit as its router entry (S2.6).
- **F9 · S2b (#72).** S2b's lane misses `extension/src/client.ts` (the hello), `handlers/tabs.ts:70`
  and `handlers/network.ts:12`, and network calls with no `tab` are undefined after S2b.
  **Proposed:** widen the lane and rule on the no-`tab` network case.
- **F10 · S2b.** A `selectTab` removed only from `methods.ts` is forwarded without the visibility
  lock (measured). **Proposed:** the daemon itself refuses `selectTab` with `UNKNOWN_METHOD`.
- **F11 · S2b · ESCALATION.** S2b.3's "every lease and lock test unchanged" cannot hold: under a
  simulated S2b daemon, 9 lease, lock and intercept tests use a removed form. **Proposed:** allow
  listed, documented edits.
- **F12 · S5 · contract-level.** The MCP locator field `text` clashes with `browser_type.text` and
  `browser_wait_for.text`, and `ref` is required today. **Proposed:** a tool-schema decision before S5.
- **F13 · S0/S1.** `{text}` locator matching is undefined, and SDK-4's `#load-later` target is a
  div with no role. **Proposed:** define the `{text}` rule before S1.
- **F14 · S3/S4.** The SDK must keep exporting the shared `BridgeError` class, or existing
  `instanceof` checks break. **Proposed:** pin that in 0.5.
- **F15 · S3 · ESCALATION (#77's outcome text).** S3.5 needs a positive control, and the pre-written
  outcome claims a cause the test does not measure. The check passes at the baseline, and an
  inheriting variant fails.
- **F16 · S2b.** S2.2's grep cannot fail (§5). Already fixed in the notes.

The remaining escalated items are F18 (S2b.6's unscoped grep) and F32 (S6.1's `/mcp` line); both are
MINOR or NIT.

**Proposals #71–#77:**
- #71: premise holds; amend the table (F1, F3).
- #72: holds; widen the lane (F9).
- #73: holds, but it is nearly today's behaviour (F17).
- #74: partly wrong (F5).
- #75: holds; the re-export adds no runtime dependency.
- #76: holds; needs an SDK-only list in `codes.ts` (F27).
- #77: holds; add a control and a third outcome (F15).

**Runtime gotchas:** no new one is proposed. Today's resync keeps a lease alive onto a reused tab id
after a Chrome restart (B6, run on port 0). That confirms T2 verifier V4 and #74's premise; it becomes
a `CLAUDE.md` bullet only once S2b changes it.

## 7. Handoff

- **Nothing is running.** Port 9234 was never touched. Every worktree was removed (`git worktree
  list` shows main only).
- **Before S0:** the session agent rules on the escalations (F1, F3, F6, F11, F15, F18, F32). It
  records the contract-level decisions as Open decisions (F2, F5, F7, F9, F12, F13, F14) and the
  amendments to #71, #72, #74 and #77. It puts the stage split in `journal.md`.
- **Needs the user:** F2 option (a), the handle rule; SM-1's Chrome-restart grant; SDK-6/SDK-7.
- **No extension reload or MCP reconnect is needed.**
