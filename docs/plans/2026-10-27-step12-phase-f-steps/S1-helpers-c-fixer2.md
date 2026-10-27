# S1-helpers-c fixer (round 2 of 3): Run 18's block runner

Model and effort: Claude Sonnet 5.5, medium. Nothing drove Chrome, the daemon or port 9234 (no runner invocation at all).

## 1. Verdict
DONE. G1, G2, G3 and n-a are fixed and red-proven. Mutants are applied in memory to a copy of the lib text by the tests (nothing in the tree, nothing in recipes/ scratch).

## 2. Outputs
- `npx vitest run recipes/test`: before 54 files, 1201 passed (verifier 2's count) -> after 54 files, **1209 passed** (+8).
- All seven `npx tsc --noEmit -p recipes/tsconfig*.json`: exit 0. `npm run typecheck` exit 0. `npm test`: 210 files, **5008** passed (first run, no failure). `npm run build`: `built extension -> dist/`.
- Both .ps1: 0 parse errors and ASCII (asserted by the static tests, which passed), `SilentlyContinue` 0, no `&&`, `??`, ternary.
- Size (non-blank, non-comment): code 84 + 267 = **351** (cap 400); tests 400 + 151 = **551** (cap 600).
- Files (all uncommitted): `recipes/s12-r18.ps1` (101 lines), `recipes/s12-r18-lib.ps1` (305), `recipes/test/s12-r18.test.ts` (414), `recipes/test/s12-r18-static.test.ts` (159).

## 3. Per item
**G1** (`lib:17-20` regexes, `lib:43-52` `Get-R18BannerVerdict`). A failing clause line is now `CHECK <id> [<step>] FAIL...` (up to a three-token label: `CHECK R17-UP-6 outside FAIL: ...`) or the helper's own `ROW <id> FAIL: ...`. Conversion needs a failed control, a FAIL verdict, at least one such line, and every such line ending in `: banner seen` or `: the banner window was not sampled`. For an `F-RAW*` row it also needs a `LEAKS F-RAW* 0` line; with a leak count above 0, or no LEAKS line, the row stays FAIL.
- Reading of `s11b.ts`: `refusalStepJudge` (s11b.ts:723-732) returns "banner seen" only after the error, the page and the window-violation clauses passed, so "banner seen" itself proves those. The only clause that `worst()` (s11b.ts:735) can hide behind it is the leak clause (`finalRow` of `raw`, :1153, lists the step judge first). `raw` prints `LEAKS <row> <n>` (:1152), so the positive evidence exists and no clause is left to guess; nothing is conservative beyond the LEAKS-line requirement. `s11b.ts` is not edited.
- Tests: the fixtures are generated in the test with `refusalStepJudge`, `worst`, `row17Line`, `answerText` and the `checkLine` rule (a wording change in s11b.ts turns them red). They cover both of verifier 2's repros (`bvUp`, `bvRaw`) and F-RAW-2: NOT MEASURED under a failed control; banner plus leak, banner plus a page failure, banner plus a violation, no LEAKS line: FAIL; passed control and PASS: unchanged; end to end `rawNm`, `rawLeakRow`, `rawFail`, `rawCtlPass`, `up6Nm`, `up6Fail`, `up6CtlPass`.
- Red proof (mutants, all red on the named check): "any failure counts as a banner clause" (-> "up6: another failed step keeps FAIL"); "up6's CHECK label one token" (same); "F-RAW converts without its LEAKS 0 line" (-> "raw: a leak, another failed clause, or no LEAKS line keeps FAIL"); "the helper's own ROW line is not read" (-> the raw NOT MEASURED check); the round-1 mutants (rule never applies, passed control converts, F-RAW or UP-6 not a banner row, control not kept) remain red. The old single-token fixtures are gone.

**G2** (tests only). `up6Idle` (WAIT-IDLE before `NODE s11b up6`) and `up6Busy` (no NODE line, the block throws). Mutants "G2: UP-6 skips the banner wrapper" (verifier 2's E2u) and its busy variant: both red.

**G3** (`lib:135-136`, `Stop-R18Wave`). When `$global:R18Slice -eq 'teardown'` and the state is marked changed, it prints `the stop is in teardown: the restore is not pressed again; return to the user ...` and presses nothing; the wave still ends (processes, console save, STOP line, exit 2). Test `teardownStop` (verifier 2's `td.ps1` shape: no `RESTORE-CALLED`, return 2, `STOP-ALL`); mutant "a stop in teardown presses the restore" red. The Handoff rule is also in the entry's header comment (`s12-r18.ps1:10`) and pinned by a static test.

**n-a** (`s12-r18.ps1:30-31`). `$Framing` is defined first; `$Record` is `$Framing` for `-Block teardown`. A static test pins the line and the order. `Get-R18RecordName 'teardown'` is unchanged and unused for that case.

Verifier 1's and 2's mutant sets: E1, E2, E2b, E4, E7, E9, E11, the F-series and the brief's three (restore skipped, list check skipped, row out of order) are all still in the test file and pass (red as required). E10 is still the static assertion.

## 4. Deviations
None.

## 5. Proposed decisions
None.

## 6. Findings
- Measured (s11b.ts reading above): `worst()` hides a later failing clause behind the first one, so a banner-only conversion of an F-RAW row is sound only with the helper's own `LEAKS <row> 0` line. If s11b.ts ever adds a clause after the banner in `refusalStepJudge`, the conversion would need that clause's line too.
- A banner conversion applies only to CHECK/ROW lines of the row's own call: the `CHECK banner-clauses ... NOT MEASURED` line of a failed control is printed outside any row block and never counts.

## 7. Handoff (supersedes round 1's)
Start from a clean tree at a committed HEAD (this slice's four files committed). Nothing is running; no PIDs. The slices are longer than 600 s: each runs in the background from Git Bash, each slice and each attempt with a fresh `S11_OUT` outside the repo.

Commands:
1. `npm run build`
2. liveA18: `S11_OUT=<fresh>/a1 powershell.exe -NoProfile -ExecutionPolicy Bypass -File recipes/s12-r18.ps1 -Block liveA18` (the `reload` block runs `recipes/reload-extension.ps1` itself). `-Block plan` prints both orders.
3. liveB18: `S11_OUT=<another fresh>/b1 powershell.exe ... -Block liveB18`. Toggle OFF: five `NOT RUN` rows, exit 3.
4. Exit 0 done; 3 not run; 2 STOP (the safety state is restored first).
5. After exit 2: read the last STOP lines. **If a STOP names a failed restore (`the restore failed or printed a STOP during the stop procedure; the wave is over`, or a restore STOP from R18-RESTORE), never run `-Block teardown` and never re-run: return to the user.** Otherwise run `-Block teardown` with the same `S11_OUT` before the next attempt (teardown never presses the restore, and writes only to `<S11_OUT>\r18-framing.txt`).
6. A later attempt of a slice: a new `S11_OUT` and `-Att 2` (then 3); record file `S1-live-record-<slice>-att<n>.txt`.

Outputs: record `docs/plans/2026-10-27-step12-phase-f-steps/S1-live-record-<slice>.txt` (`-att<n>` after the first; first line R17B-0's `MANIFEST ... BUILD ...`); framing `<S11_OUT>\r18-framing.txt` (also teardown's output); capture `<S11_OUT>\console-<slice>.txt`; scan-passed copy `<S11_OUT>\console-<slice>-evidence.txt` (commit as `S1-live-console-<slice>.txt`, `-att2` later); daemon slice `<S11_OUT>\daemon-slice-<slice>.txt`; rows18 input copy `<S11_OUT>\rows18-<slice>.txt`. In the record R18-UP-L1 and R18-SAVE-REFUSE print their `ROW` after R18-LOGS' row; `CHECK rows n=<n> verdict=<v>` (plus any WARN) is last; banner rows carry `slice=<A|B>`; a banner row converted under a failed control reads `NOT MEASURED (banner clause: R18-BANNER-CTL did not pass) slice=<A|B>`.

STOP lines the runner itself can print (others come from the helpers it calls):
- Main: `the record file already holds text; give this attempt its own -Att`; `a previous wave's globals exist; run -Block teardown first`.
- Preflight: `a dist file is missing; run npm run build first`; `Chrome is not running (it is never launched here)`; `python was not found`; `port <k> is held by a program the wave did not start (#251)`; `the tracked tree is not clean outside the steps dir` (Run 17's guard, preflight and end of R18-LOGS); Assert-S12Patched and Assert-S12CaptureFree texts.
- Servers: `the fixture server on 8081 did not answer`; `port 8081 is not held by the wave's own server`.
- R18-0: `R18-0 (g): the tracked tree is not clean outside the steps dir`; `R18-0 after a state change would overwrite the found texts; refused`; `R18-0: the option-page list <id> was not found (an empty list may not be exposed); nothing was changed`.
- Gate and control: `the file-URL toggle is unreadable; nothing changed`; `R18-BANNER-CTL: a leg printed no ANSWER or no violations CHECK line`; the `IDLE` STOP of `Test-S12Idle` (any banner row, R18-UP-6 included).
- Stop procedure: `the restore failed or printed a STOP during the stop procedure; the wave is over` (the failed-restore STOP: rule in step 5); `the wave ended (<cause>)`; `row <id> printed a STOP` / `block <name> printed a STOP` (thrown causes). In `-Block teardown` a stop prints `the stop is in teardown: the restore is not pressed again; return to the user (the safety state may be unrestored)` (a Say, not a STOP) and still ends with `the wave ended (...)`, exit 2.
- Load time (exit 2, nothing changed): `STOP: Run 17's block <name> was not read from s11b-r17.ps1`; `STOP: Run 17b's r17b-0 block or the S12 helpers were not read`.
- Through the helpers: the sampler tail, the devt and race STOPs, `Fail-S16` texts of the reused Run 17 blocks (window not pinned, reload exit, restore mismatch), any `STOP:` from `s11`/`s11b`. Every counted `STOP:` ends the block, restores if `S16Changed` (not in teardown), saves the slice's capture, ends own processes and exits 2.
