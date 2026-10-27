# Step 12 S4a — the kept debugger session: the pure keeper (verifier round 4)

Model / effort: Opus, medium. Date 2026-10-28. Role: verifier, fresh (`docs/agent-rules.md` §6). Scope: the items
touched by fix round 3 of the uncommitted `extension/src/debugger-keeper.ts` (SHA-256 `0948bb6f…`, 358 lines) and
`extension/test/debugger-keeper.test.ts` (`5b80781a…`, 710 lines). Slice start `c6ad96f`, HEAD `5e9ef9a`. Raw output:
`S4a-verifier4-evidence.txt` in this folder (§n below means its sections).

## 1. Verdict

**PASS-with-notes.**
- V3-1 (MAJOR), V3-2 and V3-3 are fixed. Each new test is red on the round-3-start behaviour and on its own hunk's
  revert, and green on the real module (§3).
- Round 3 reopens no earlier fix. The kill matrix is 25 of 25 green. The round-2 probes are green except P4′, which is red
  by construction, as before (§2, §4).
- I found one new MINOR, V4-1. The new `getTargets` timeout can detach a newer session's attach. This needs a waiter
  whose 1 s bound was set on an **earlier** detach that took more than 1 s. It fails closed: nothing is orphaned, but
  one answer changes to `DEBUGGER_CANCELLED`. A one-line fix is checked on a scratch copy.
- V3-4 (NIT) is still open, as ruled.

## 2. Round-3 items and the fixer's adapted probes

| Item | Result | Evidence |
|---|---|---|
| V3-1: `onDetach` forgot a pending entry (`:199`) | fixed. Q2′ gives `{targets:false, ans:"a", orphan:false, afterDisarm:false, size:1}`. On the start module: `orphan:true, afterDisarm:true, size:0` | §2 |
| V3-2: unbounded `getTargets` in `onDetach` (`:204-215`) | fixed for its own schedule. Q1b′ and T5 are green, and the queue reads `targets,detach,attach`, so the check's detach is issued before the waiter's attach. Residual: V4-1 | §2 |
| V3-3: stale P5 refusal released a newer entry (`:173`) | fixed. Q3 answers `b`, against `DOMAIN_BLOCKED` on the start module and on r3 | §2 |
| The bound's timer is cleared on every path | yes. The timer count after the check is 0 in each case: `getTargets` answers first (T1), rejects (T2), throws synchronously (T3), or times out (T4). After a timeout, the late rejection sends no second detach and raises no unhandled rejection (T4: detaches 1 → 1) | §2 T1–T4 |
| The event is about A itself (Chrome ends A between land and reply; the fixer's argument) | as argued: A answers `DEBUGGER_CANCELLED`, the next call answers `c`, nothing is orphaned | §2 Q2c |

**Q1, Q1b and Q2 as written.** I agree with the fixer: they fail only on the order of steps.
- **Q1** asserts the queue `["targets","attach"]`. The real queue is `targets,detach,attach`.
- **Q2** steps a `getTargets` that is no longer issued.
- **Q1b** completes Chrome's earlier-issued detach **after** a later attach. That is out of order. Its only effect is a
  changed answer: `next:"DEBUGGER_CANCELLED"`, no orphan. It is covered by the fixer's Revisit-if.

**Are the adapted assertions as strong on safety?** Yes. I rebuilt them independently (§8):
- **Q1′** keeps Q1's `{orphan:false, afterDisarm:false}` and adds `size:1`. The answer improved from today's
  `DEBUGGER_DEVTOOLS` to `b`.
- **Q2′** keeps Q2's exact `{ans:"a", orphan:false, afterDisarm:false}` and adds `size:1`.
- **Q1b′** asserts the answer and both safety fields.
- **Q1″** (my own: `getTargets` answers before the bound and reads the orphan) is green.

A probe written strictly enough also tells the variants apart. The start module answers `DEBUGGER_DEVTOOLS` on Q1′,
and the safety half of Q2′ is red on start and on r1.

## 3. Red before the fix

No byte copy of the round-3-start module (`09bf647e…`) exists in any scratchpad. I rebuilt it behaviourally (`mk4.mjs`,
§8): each of the three hunks reverted to the code verifier 3 quoted.

| Variant | The real 49-test file | Failing test |
|---|---|---|
| start (all three reverted) | `3 failed \| 46 passed (49)` | V3-1 (`expected +0 to be 1`), V3-2 (`cancelled mid-action`), V3-3 (`blocked (test)`) |
| r1 (V3-1 hunk only) | `1 failed \| 48 passed` | V3-1 only |
| r2 (V3-2 hunk only) | `1 failed \| 48 passed` | V3-2 only |
| r3 (V3-3 hunk only) | `1 failed \| 48 passed` | V3-3 only |

This matches the fixer's figures.

## 4. Findings

### V4-1 · MINOR · `extension/src/debugger-keeper.ts:300` (with `:206`): the check's timeout can detach a waiter whose bound came from an earlier slow detach

- **Sequence (probe T6, Chrome first in first out):**
  1. X is released. Its detach `p0` is slow (more than 1 s).
  2. K waits out its 1 s bound and attaches. It lands and is kept.
  3. D starts. It waits on `p0`, with its bound at +1000.
  4. 200 ms later Chrome ends K, and `onDetach` arms the check's bound, at +1000 from then. `detaching` is now `p1`.
  5. D's bound fires first. Line 300 returns on `!done`, although `detaching` now holds the newer `p1`. D attaches.
  6. The check's `getTargets` has not answered. It times out, and the timeout's detach is queued **after** D's attach.
- **Result:** `{shape:"detach,targets,attach,detach", ans:"d", next:"DEBUGGER_CANCELLED", orphan:false,
  afterDisarm:false}`.
- **Introduced in round 3:** T6 is green on r2 and on the start module (`ans:"d", next:"e"`). Without the bound, the
  first-in-first-out `getTargets` answers before D lands.
- **The fixer's claim:** §3 says the `!…attached` condition "covers a waiter whose bound was set earlier". That holds
  only if the waiter's attach has answered before the check ends.
- **Reachability:** it needs a detach slower than 1 s (F5's own Revisit-if) and a `getTargets` slower than 1 s. It
  fails closed. The answer change runs against 0.6 "Answers do not change". Same class as V3-2 and V3-4.
- **Suggested fix (checked):**
  - Change `:300` to `if (this.detaching.get(tabId) === p) return;`.
  - On a bound expiry, a waiter then waits again if a **newer** pending detach replaced the one it waited on, each with
    its own bound. It still returns at once when the same detach is still pending (F5).
  - On a scratch copy (`fix6`): T6 is green (`ans:"d", next:"e"`, and D's attach queues after the check's detach); the
    49 keeper tests pass; the kill matrix and every other probe are as on the real module (§2 `probes-fix6`, §3
    `keeper-fix6`).
  - The cost: a waiter can wait up to 1 s more for each replacement.
- Fix rounds 1–3 are spent. This fix needs a fourth round by an Opus fixer (§6, §7), or it is carried to S4b together
  with V3-4, under F5's Revisit-if. That is the step agent's call.

### Carried: V3-4 · NIT (unchanged, as ruled)

Q5 still reads `{ansB:"b", next:"DEBUGGER_CANCELLED", orphan:false}` on every variant.

## 5. Regression checks

| Check | Result | Evidence |
|---|---|---|
| The 46 earlier tests are byte-identical | lines 1–643 hash to `37775c29…`, the whole round-3-start file (verifier 3's hash). Lines 1–596 hash to `6aad2e24…`. CR count: 596 in lines 1–596, 0 in lines 597–710, as the fixer states | §1 |
| D4.1, D4.2, D4.3 and the overlap rule | inside those byte-identical lines, all green. The D4.3 mutant (`guard.effect()` removed) gives `6 failed \| 43 passed`, and the D4.3 block is red | §5 |
| Round-1 and round-2 fixes (F1 P1/P2/P5, F2, F3, F5, N1, N2) | kill matrix 25 of 25 green. Round-2 probes: `1 failed \| 12 passed (13)`, and the one red test is P4′, red by construction. The round-1 and round-2 tests are green | §2, §4 |
| Log sites +0 | `console.` in the module: 0. Keeper + `log-scan` + `log-sentinel`: `Tests 73 passed (73)` | §1, §7 |
| `git diff --stat c6ad96f -- daemon shared sdk mcp` | empty. The `extension` diff is empty too (the keeper files are untracked) | §1 |
| Wiring | the keeper is imported nowhere | §1 |
| `tsc` for shared, daemon, sdk, mcp and extension; `npm run typecheck`; the seven `recipes/tsconfig*.json` | each exit 0 | §6 |
| `npm run build` | exit 0; `git status --short` is the same before and after | §6 |
| `npx vitest run extension` | `Test Files 82 passed (82)`, `Tests 2454 passed (2454)`, the fixer's figure | §7 |
| Size (`wc -l`) | code 358 of 450. Tests 710, which is 35 over their 675 cap. Together 1068 of 1125, and the extra is tests (≤ 1.5×), so it falls under the recorded deviation | §1 |

**`npm test`:**
- First run: `Tests 2 failed | 4998 passed (5000)`.
- The one re-run: `Tests 2 failed | 5006 passed (5008)`.
- Every failure is in another agent's untracked `recipes/test/s12-r18.test.ts`. Different tests failed on the two runs,
  and the total grew, so that work is in progress.
- Nothing outside that file fails. As my brief says, I report this and did not touch `recipes/`.

## 6. Hygiene

- The scratch files `extension/src/zz-s4av4-*` and `extension/test/zz-s4av4-*` were all deleted; `ls | grep -c zz`
  gives 0.
- The two real files hash the same before and after (§1, §9).
- No port was bound and no process was left running.
- I edited no repo file other than this report and its evidence file. The new `S1-helpers-c-verifier2*` files in
  `git status` belong to another agent.
