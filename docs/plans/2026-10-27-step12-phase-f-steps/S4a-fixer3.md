# Step 12 S4a — the kept debugger session: fixer, round 3

Model / effort: Opus, medium. Date 2026-10-27. Role: fixer (`docs/agent-rules.md` §6), round 3 of 3. Slice start
`c6ad96f`, HEAD `5e9ef9a`. Not committed (brief: Commit no). Lane: `extension/src/debugger-keeper.ts` and
`extension/test/debugger-keeper.test.ts`. Findings: `S4a-verifier3.md` §4 (V3-1 MAJOR; V3-2, V3-3 MINOR; V3-4 NIT).

## 1. Verdict

**DONE.**
- V3-1, V3-2 and V3-3 are fixed test-first. Each has a new test that is red on the round-3-start module, and each test
  is red on a copy of the final module with only its own hunk reverted.
- V3-4 is unchanged, as the brief says (NIT, under F5's Revisit-if).
- I dispute none of the findings. V3-2 is fixed the way the verifier suggested. It does not reopen V3-1 or N2 (§4).

## 2. Outputs

- **At start:** module SHA-256 `09bf647e9f91…` (347 lines), tests `37775c294e00…` (643 lines). Both match verifier 3.
  Scratch copies were taken before any edit.
- **At end:** module `0948bb6f469f…` (358 lines), tests `5b80781ae3ad…` (710 lines).
  - Module: 17 lines in, 6 out (`git diff --no-index --stat`).
  - Tests: one new block at the end, "S4a fixer round 3", with 3 tests and one helper, `manualAttach`.
- **Existing tests are unchanged.** Lines 1–643 of the test file hash to `37775c29…`, which is the whole round-3-start
  file, so all 46 tests are byte-identical. Lines 1–596 hash to `6aad2e24…`.
  - The Edit tool had rewritten lines 597–643 from LF to CRLF. I put them back to LF, so the bytes match again. Lines
    1–596 are CRLF, as before.
- **Red before the fix.** The real test file was pointed at scratch module copies:
  - round-3-start module: `3 failed | 46 passed (49)`.
    - V3-1: `expected +0 to be 1`, the registry is empty.
    - V3-2: next call `DEBUGGER_CANCELLED`.
    - V3-3: `blocked (test)`.
  - final module with only V3-1's line reverted: `1 failed | 48 passed`. Only the V3-1 test fails.
  - final module with only V3-2's bound reverted: `1 failed | 48 passed`. Only the V3-2 test fails.
  - final module with only V3-3's guard reverted: `1 failed | 48 passed`. Only the V3-3 test fails.
- **After:** keeper file `Tests 49 passed (49)`. Keeper + `log-scan` + `log-sentinel`: `Tests 73 passed (73)`.
- **`npx vitest run extension`:** `Test Files 82 passed (82)`, `Tests 2454 passed (2454)`.
- **`npm test`:**
  - Before (verifier 3's run on the same lane files): `Tests 5 failed | 4961 passed (4966)`. All 5 failures were in
    another agent's untracked `recipes/test/s12-r18*.test.ts`.
  - After (mine): `Test Files 210 passed (210)`, `Tests 5000 passed (5000)`. Nothing fails, the s12-r18 files included.
  - My part of the +34 is 3 tests. The other 31 come from the other agent's in-progress `recipes/test/s12-r18*` work,
    which I did not touch.
- **Type checks:** `tsc --noEmit` for shared, daemon, sdk, mcp and extension: each exit 0. `npm run typecheck`: exit 0.
  The seven `recipes/tsconfig*.json` (fe, base, s6, s9, s10, s11, s11b): each exit 0.
- **Build:** `npm run build` exit 0, and `git status --short` was the same before and after.
- **`git diff --stat c6ad96f -- daemon shared sdk mcp`:** empty.
- **Logging:** `console.` in the module: 0, so log sites are +0.
- **Wiring:** the keeper is still imported nowhere.

## 3. The fixes

- **V3-1 (`onDetach`, module :198).** The guard is now `if (!k || !k.attached) return;`. An entry whose attach is
  pending is not forgotten and not checked.
  - Why: no event can be about a session whose attach has not answered yet.
  - If Chrome did end that session in the gap, the use's first CDP command fails, and the error path releases the
    entry. That fails closed.
  - Test V3-1 Q2: after the late event, A answers `"a"`, the registry holds 1, and a disarm leaves the tab detached.
- **V3-2 (`onDetach`'s check, :203–214).** `getTargets` is raced against `KEEPER_DETACH_WAIT_MS` on the injected timers.
  On a timeout, `attached` stays `true` and the tab is detached (fail closed). The timer is cleared in a `finally`.
  - The check's timer is set synchronously in `onDetach`, before any waiter's timer. So on a timeout the check's
    detach is issued before the waiter's attach, and the late answer is ignored.
  - The `!this.kept.get(tabId)?.attached` condition stays, as a second defence. It covers a waiter whose bound was set
    earlier, on a prior detach.
  - Test V3-2 Q1b: B's attach lands in Chrome, then the late `getTargets` reads it attached, then B's reply arrives.
    B answers `"b"`, the sequential C answers `"c"`, and only B's idle timer is left pending.
- **V3-3 (the P5 check in `use`'s `finally`, :171–172).** The line is now
  `if (refusal && this.kept.get(tabId) === mine) await this.release(…)`.
  - Test V3-3 Q3: A's stale `DOMAIN_BLOCKED` arrives after A was released and B attached. B answers `"held"` and stays
    attached.
- **Header doc.** The module header and the `onDetach` doc now describe both changes. No other code changed.

## 4. The verifiers' probes on the final module (scratch copies, all deleted)

**Round 3** (`S4a-verifier3-evidence.txt` §6, verbatim):
- **Kill matrix: 25 of 25 green.**
- **Q2b and Q3: green.**
- **Q1, Q1b, Q2 and Q5 fail as written.** Q5 is V3-4, which I did not change; it is expected red, as on the start module.
- The other three fail because they assert the old order of steps, not because the outcome is unsafe:
  - **Q1** asserts that the queue reads `["targets","attach"]`. With the bound, the check's detach now queues before
    B's attach (`targets,detach,attach`), so the probe stops at that line.
  - **Q1b** completes B's attach in Chrome before the detach that was issued earlier. That is out of order. The
    verifier's suggested fix assumes Chrome completes them in order, and so does my fix.
  - **Q2** steps a `getTargets` that is no longer issued (`no pending targets`). The verifier's own §4 note records the
    same failure on its suggested line.
- **Adapted versions of those three** (same setup; only the order is asserted differently):
  - **Q1′** (assert only the outcome): green on the final module, `{shape:"targets,detach,attach", ans:"b", next:"c",
    orphan:false, afterDisarm:false, size:1}`. The orphan is detached and B now answers. On the start module it
    answered `DEBUGGER_DEVTOOLS`.
  - **Q1b′** (Chrome in order: the detach, B lands, `getTargets` answers, B's reply): green, `{ans:"b", next:"c"}`.
    On the start module it gives `next:"DEBUGGER_CANCELLED"` (red).
  - **Q2′** (`getTargets` is stepped only if it was issued): green, `{targets:false, ans:"a", orphan:false,
    afterDisarm:false, size:1}`. On the start module it gives `orphan:true, afterDisarm:true, size:0` (red).

**Round 2** (`S4a-verifier2-evidence.txt` §9, verbatim):
- **A1 and A2: green.** A3 to A7, P1, P2, P3, P4 and P5 are also green.
- **P4′ is red**, which verifier 2 marks as red by construction (its fake `getTargets` always answers `[]`).

**Round 1** (`S4a-verifier-evidence.txt` §5, verbatim):
- **P1, P2, P3 and P5: green.**
- **P4 is red**, outside the brief's list. It uses the same fake that always answers `[]`, which verifier 2 rewrote as
  P4 (green) and P4′.

## 5. Deviations

- **Size.** Code is 358 of 450 lines. Tests are 710, which is 35 over their 675 cap. Code and tests together are 1068 of
  1125. The extra is tests, so this falls under the brief's recorded deviation (agent-rules §7).
- **Q1, Q1b and Q2.** Run as written, they fail on assertions about the order of steps, as §4 explains. I report their
  adapted versions next to the verbatim results.

## 6. Proposed decisions

### 2026-10-27 · `onDetach` leaves an entry whose attach is still pending
**Decided:** `onDetach` returns at once when the tab's entry has not had its attach answered. **Why:** a late event for
an older session otherwise ends the pending entry's registry record, and its attach then lands outside the disarm's
reach (verifier-3 V3-1). **Instead of:** forgetting any entry. **Revisit if:** a live row shows Chrome ending a session
between the attach and its reply. **By:** Claude (proposed)

### 2026-10-27 · `onDetach`'s `getTargets` read is bounded, and a timeout detaches
**Decided:** the read is raced against `KEEPER_DETACH_WAIT_MS` on the injected timers. A timeout counts as attached, so
the tab is detached. **Why:** the check's detach is then issued before any waiter's attach, so a late answer cannot
detach the next session (verifier-3 V3-2). **Instead of:** an unbounded read guarded by the `attached` flag alone.
**Revisit if:** Chrome completes a detach after a later attach on the same tab. **By:** Claude (proposed)

### 2026-10-27 · The post-attach tab check releases only its own entry
**Decided:** the P5 check releases only while the entry is still its own. **Why:** a stale refusal must not end a newer
session whose own guard passed (verifier-3 V3-3). **Instead of:** releasing whatever entry is mapped. **Revisit if:**
never. **By:** Claude (proposed)

## 7. Findings / handoff

- No new runtime fact.
- **For S4b, from earlier rounds:** S4b must bound `tabCheck` and wire `KeptUse.drop()`.
- **Still open:** V3-4 (NIT), which S4b's measurement of Chrome's detach time can settle.
- **Hygiene:**
  - The scratch files (`extension/src/zz-s4af3-*`, `extension/test/zz-s4af3-*`, and the scratchpad copies and
    `mk3.mjs`) were deleted.
  - I edited only the two lane files and this report. I did not touch `recipes/`, bound no port and left no process
    running.
