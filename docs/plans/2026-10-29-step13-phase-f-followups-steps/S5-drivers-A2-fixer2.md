# S5-drivers-A2 fixer, round 2

Model and effort: Sonnet 5.5, medium. No product code; no main-tree file reverted, stashed or moved. No daemon, Chrome, reload or live run.

## 1. Verdict: DONE (N1, N2, N3 fixed; N4 left as the verifier allowed)

## 2. Outputs
- N1 (MAJOR): `recipes/s13-r20.ps1:17` `$R19DeferRe = '(?!)'`, with a comment citing the step agent's ruling and §4.28 l.1968-1975. Every slice-A ARGS/CON row now prints its own `ROW` at the row; R20-LOGS no longer changes it, and a STOP before R20-LOGS drops no `ROW` line. The settle loop in `Invoke-R20Logs` stays (harmless, and still tested by `logsOk`/`logsOwnFail`, which seed `R19Pending` directly; their expectations are unchanged).
- N2: `recipes/s13-r20-a.ps1` header now carries the `restored=no` exception and the run-in-background note, adapted from `s12-r19.ps1` l.10-11.
- N3: `capRow` in `recipes/s13-r20-a2.ts` prints `CHECK R20-CON-CAP line-chars=<min>-<max>` (the kept body lines, marker excluded; counts only). No `s13-forms.ts` edit.
- Tests (+2): `s13-r20-ps.test.ts` new case "no slice-A ARGS or CON row is deferred ..." (two PS cases `inlineRows`, `stopBeforeLogs`: exactly one ROW per id on a STOP, `PENDN 0`); `s13-r20-a2.test.ts` new header case, and two new asserts in the CON-CAP case for `line-chars`.
- Changed expectations (not removals), because the rows are no longer pending: `carry` (`PEND FAIL` -> `ROW R20-CON-NOTEA FAIL`), `noteaNoHandle` (`PEND NOT MEASURED` -> `ROW ... NOT MEASURED`), `recordRow` (`PEND RECORD`/`PEND2 PASS` -> `ROW ... RECORD`/`ROW ... PASS`). The brief's "ARGS-3 PASS to NOT MEASURED" change did not apply as worded: the only `ROW R20-ARGS-3 NOT MEASURED` expectation (`logsOwnFail`) seeds the pending table by hand and is still correct; the carry/record expectations above are the ones the over-wide deferral had shaped.
- Red proof for N1: scratch copy of the `.ps1` files via `S13_R20_REPO`, `$R19DeferRe` set back to the old pattern: the three tests above (carry, record, new deferral) fail. N2 and N3 tests are red without their change by construction (the header text and the `lines[1]` value do not exist).

## 3. Numbers (`S5-drivers-A2-fixer2-gates.txt`)
- `npm test`: 243 files, 5798 passed (5796 + 2, none removed). `npm run typecheck`, all eight `recipes/tsconfig*.json`, `npm run build`: exit 0. `git status --short` after the build: only the lane's 11 files plus the stage docs.
- Size: `git diff --numstat` insertions 246 + `wc -l` of the three untracked files (61 + 175 + 103) = 585 (cap 600; was 564).

## 4. Deviations: none. Proposed decisions: none.
## 5. Findings: none new. Handoff: the tests only edit nothing outside the lane; a fresh verifier re-checks N1-N3.
