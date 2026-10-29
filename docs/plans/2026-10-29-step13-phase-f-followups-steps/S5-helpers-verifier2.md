# S5-helpers verifier 2 (Step 13, re-check after fix round 1)

Verifier: Claude Opus 5.5, medium. Read and run only. The only files written are this report and
`S5-helpers-verifier2-evidence.txt`. Nothing was committed, and mutants ran on scratch copies (#395).

## 1. Verdict

**FAIL**, on one MAJOR that is a single-line fix in a report, not in code. The fixer cleaned the builder's red file, but
its own report `S5-helpers-fixer1.md` now spells the user's name in the grep pattern it quotes. That puts the finding back
in the steps dir the committer stages. Every code item (MINOR-2, MINOR-3, NIT-4 to NIT-6) is fixed and proven, and every
exit check passes. With that one line redacted, the slice is **PASS-with-notes**, and a further code round is not needed.

## 2. Exit checks (re-run in the main tree; evidence §4)

| Check | Result |
|---|---|
| `npm test` | `Test Files 239 passed (239)`, `Tests 5705 passed (5705)`, which is at least 5702. The new file has 51 tests: 48 + 3. |
| None removed | All 42 test names in the builder's red file are still present (`comm -23` is empty). The 9 names that are added are the 6 that passed on the stub plus the fixer's 3 (evidence §3). The tracked diff is still only `recipes/tsconfig.s6.json`. |
| `npm run typecheck` | exit 0 |
| recipes tsconfigs | **8** (`.json`, `.fe`, `.s6`, `.s9`, `.s10`, `.s11`, `.s11b`, `.s13`), each `npx tsc --noEmit -p` exit 0 |
| `npm run build` | exit 0 |
| `git status --short` after the build | `M recipes/tsconfig.s6.json`, the 5 slice files, and the steps-dir reports (builder red and report, verifier report and evidence, fixer1) |

## 3. The affected items

- **MAJOR-1 (local path, user name, ANSI codes): fixed in the red file, but reintroduced in the fixer's report.**
  - The red file now has no path, no name and no ESC byte. Its vitest banner line is gone.
  - The 5 slice files and `tsconfig.s6.json` are clean (evidence §1).
  - `S5-helpers-verifier.md:112-113` holds only the placeholder `C:/Users/<user>/…` and the pattern `Users/`. These are
    acceptable.
  - New finding: see MAJOR-A below.
- **MINOR-2 (newest-kept clause): killed.**
  - The new test is `recipes/test/s13-forms.test.ts:237-243`. It takes the new marker plus the oldest nine rows, which
    read `first-index=1 last-index=9`, and expects FAIL.
  - Mutant m2 removes `s.lastIndex === total && s.firstIndex === total - k + 1` (`recipes/s13-forms.ts:137`). The
    result is 1 failed, which is exactly that test.
- **MINOR-3 (expectK / RECORD): matches the R20-CON-CAP row.**
  - The row (`docs/e2e-test-plan.md` §4.28, line 1968) sets the rule as the marker first and once with n = 200 − k,
    `body-chars ≤ 20 000`, and the newest contiguous block ending at 200. It pre-states k = 9, and "a different `k` with
    the same rule held is RECORD".
  - `concap20Verdict` (`recipes/s13-forms.ts:134-139`) gives FAIL when the rule breaks, PASS when the rule holds and
    k = `expectK` (default 9), and RECORD otherwise.
  - Mutant m3 (RECORD returned as PASS) fails the RECORD test. Mutant m3b (default 8) fails the product-output PASS test.
  - The row's other clauses are the driver's: the SDK count of 200, `limit: 3` with no marker, and no line cut mid-line.
    `concap20Line` prints the line length the RECORD needs (`body-chars`).
  - The test now imports `JS_DISABLED_MESSAGE` from `extension/src/safety.js` (`s13-forms.test.ts:14`, `:195`), so no
    text is copied.
- **NIT-4: fixed.**
  - `K_DEVT_CODE = ErrorCodes.DEBUGGER_DEVTOOLS` (`recipes/s13-forms.ts:11`, `:87`).
  - The fixer did not run the K_DEVT_CODE mutant, so I ran it. A wrong literal (n4) and `ErrorCodes.TIMEOUT` (n4b) each
    fail "accepts the product's own busy message under DEBUGGER_DEVTOOLS only". It is killed.
  - The optional pin of `K["K-devt"].message` against `describeDebuggerError` was not taken. It was optional and I
    accept that.
- **NIT-5: fixed.**
  - `busyExact` requires `data === undefined` (`:89`). Mutant n5 fails the new "carries data" test.
  - `chooserOld` is asserted against `CHOOSER_RELOAD_HINT` (`test:184`). Mutant n5b fails "the expected lines come from
    the product".
- **NIT-6: fixed.**
  - Every `toThrow` carries a message matcher (`test:98`, `:135-136`, `:139-141`).
  - On an empty stub module the count-refusal test now fails (46 failed, 5 passed). Before the fix it passed vacuously.
- **Regression check on the changed code:** the earlier mutants k = lines (o1, 2 failed), the olderCut clause dropped (o2)
  and the busyExact code clause dropped (o3) are still killed. The identity copy gives 51 of 51. The forms and the other
  judges are unchanged.

## 4. Findings

**MAJOR-A: the user's name is in the fixer's report, which the committer stages.**
- **Where:** `docs/plans/2026-10-29-step13-phase-f-followups-steps/S5-helpers-fixer1.md:9`.
- **Evidence:**
  - `grep -ci <the user's name>` over the steps-dir reports gives 1 hit, only in this file, and only on line 9.
  - The MAJOR-1 proof cell quotes the scan pattern as `grep -i "Users[/\\]\|<the name, spelled out>"`.
- **Why it matters:** the same STOP-rule class as MAJOR-1. The user's name may not appear in committed evidence (#374).
  Report scan patterns name the user only as "the user's name" (#372, agent-rules §8).
- **Fix:** in that cell, replace the spelled-out name with `<the user's name>`, then re-run the scan. The code needs no
  change, and no further fix round is needed for the code.

**NIT-B: one fixer claim does not reproduce.**
- **Where:** `S5-helpers-fixer1.md:12`.
- **Evidence:** the fixer says dropping busyExact's data clause also fails "the disabled-input map test". Mutant n5 fails
  only "a busy answer that carries data fails" (1 failed). `disClass` has its own `data` clause, so this is expected.
- **Fix:** none needed. It is a wrong claim in the report, not a gap in the code.

**Carried (NIT-7, the session agent's, unchanged):**
- Add a dated note to §4.28 form (3) for `active-guard=n/a`.
- `recipes/CLAUDE.md` still says "all seven" recipe tsconfigs. There are now 8, and `s13-forms.test.ts` should be named in
  the `.s6` exclude.
- The root `CLAUDE.md` test count should go to 5705.
