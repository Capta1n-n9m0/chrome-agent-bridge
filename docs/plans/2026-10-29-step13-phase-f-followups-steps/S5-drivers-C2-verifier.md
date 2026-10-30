# S5-drivers-C2 verifier: liveC20's actor

Model and effort: Opus 5.5, medium. Read and run only. Nothing was run against Chrome, a daemon, a port or a live run.
Evidence: `S5-drivers-C2-verifier-evidence.txt` (the gates, red and 14 mutants).

## 1. Verdict
**FAIL**: four MAJOR findings (F1–F4), two MINOR, two NIT. The gates pass. The judges the tests cover are discriminating
(12 of 14 mutants killed). The failures are in what the actor does around the judges: KEEP-4's timing precondition, the
`open` answer, the conditional rows' before-open control, and the no-refusal finding line.

## 2. Outputs (re-derived)
- `npm test`: **250 files, 5969 passed**, exit 0. That is 5951 / 249 + 18 tests + 1 file, all 18 in `recipes/test/s13-r20-c.test.ts`.
- `npm run typecheck` exit 0. All eight `recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b,.s13}.json` exit 0. `npm run build` exit 0.
  `node scripts/doc-check.mjs` exit 0 (38 living docs checked).
- `git status --short`: shows only the slice's files (the two tsconfig edits, `recipes/s13-r20-c.ts`, its test and the builder report). The tsconfig diffs add the file and the test to `.s13`'s include and the test to `.s6`'s exclude, and change nothing else.
- Privacy: no user name, profile path or `C:\Users` in the three files (grep exit 1). `devprobe`, `devprobeLine` and `attachedFrom` are not imported. One comment mentions `devprobe`.
- Red and mutants: I ran them on copies outside the repo with no `node_modules` and no link (`find -type l` = 0). The main tree's vitest ran with `--root <copy>`. The copy runs 18 of 18 unmutated. With the module absent it fails to load. Mutants killed: afterGate always PASS, no finding line, exact on the code alone, UP-DEVT ignoring control 2, KEEP-4 and SWEEP ignoring the gate, `none` counted as a leg, `na` title, a hyphen in place of the em dash, the row taken from its first leg, no value-wrong line, and an unread dock side that runs. **Survivors:** a duplicated leg marker (m12) and an unanchored `parseCtl` regex (m14). See F5.

## 4. Deviations
None by the verifier. The builder only argued that its tests were discriminating. I proved it by mutation (above).

## 5. Proposed decisions
### 2026-10-30 · KEEP-4's control cannot be bridge-independent in the docked state
**Decided:** for R20-KEEP-4 the before-open control is not read: the sheet's own step 1 (`consoleMessages`, a kept session) makes `attached=yes` before DevTools opens. In the docked state the after-open read cannot tell DevTools from the bridge's kept session, because it reads `attached` alone. The undocked state's `windows=1 title=ok` is independent. Record the docked leg's control as not independent (a FAIL with `dv=ok` there may mean DevTools never attached). **Why:** §4.28 asks for "the DevTools control of this sheet read before each call", and the sheet's KEEP-4 steps make that control partly unreadable. **Instead of:** silently treating the after-open read as the whole control. **Revisit if:** a docked-pane reader by UIA (`Test-S13Pane`) is accepted as a docked leg's window clause. **By:** Claude (proposed by verifier; for the session agent)

## 6. Findings

**F1 MAJOR: KEEP-4's "DevTools opened before the keeper's 5 s idle bound" is printed but not judged.** `recipes/s13-r20-c.ts:124-125`.
§4.28 R20-KEEP-4 makes it a step, and R19-KEEP-4 said "within 1 s". `KEEPER_IDLE_MS` = 5000 (`extension/src/debugger-keeper.ts:43`). Suppose DevTools attaches after the kept session idled out. The `devtools` call is then a fresh attach under the refusing state and answers K-devt, and the `closed` call answers `ok` with 11 entries. That is a **row PASS** even though the kept session never met DevTools. R19-KEEP-4's discrimination ("a build whose kept session ignores `onDetach` …") is not exercised. So the row can pass a test it did not run: a loosened rule under agent-rules §2, not a recorded detail. "It includes the dock change" makes the measure an upper bound: it can prove the bound was met, never that it was missed.
**Fix:** take t0 before the first `consoleMessages` starts (conservative) and compare `open-ms` with `KEEPER_IDLE_MS`. When `open-ms ≥ 5000`, both legs are NOT MEASURED, with a reason such as "DevTools was not opened before the keeper's idle bound". Ask C3 to set the dock side in an earlier DevTools session, so that the KEEP-4 open needs no dock change (`Set-S13DockSide` returns at once when the side already matches, `s13-devt.ps1:143`). Add a test of that branch.

**F2 MAJOR: a failed `open` is ignored, so a docked leg can PASS with DevTools undocked.** `s13-r20-c.ts:64-66` (and `:106`, `:124`, `:141`).
`open` answers `fail` when the side change is not done (`Open-S13DevTools` sets `done = false`, `s13-devt.ps1:158-164`). For a docked leg, `Get-S13Control … 'docked'` returns `windows=$null title=n/a` without looking at the window list (`s13-devt.ps1:193`), so its control is `attached` alone. R20-DEVT-EARLY runs its `undocked` leg first, which leaves the preference at undock. If the docked leg's dock change then fails, DevTools opens undocked, the read is `na na yes`, `ctrl20Verdict` gives PASS, and the call answers `ok`. The result is a **docked-leg PASS measured with DevTools undocked**. The same path exists in the conditional rows' docked state. The sheet's control paragraph says: "DevTools cannot be opened or undocked by the helper's method → RECORD (`devtools-control-unreadable`)".
**Fix:** `open=fail` makes the leg `RECORD devtools-control-unreadable`, and the conditional rows' control the same. Test it.

**F3 MAJOR: the conditional rows assume the before-open control instead of reading it, and UP-DEVT attaches the bridge just before the open.** `s13-r20-c.ts:33` (`afterGate` passes a made-up `before = {attached: "no"}`), `:105-107`.
The sheet's control passes only when "`before-open` read `attached=no`", and the conditional rows read it "before each call". `resetPage` is an `evaluate`, which is a CDP attach with a 5 s kept session. It runs right before `open`, so at the open the bridge itself may hold the tab. The after-open `attached=yes` is then not independent of the bridge: wholly so in the docked state, partly in the undocked state. The attach history also matches neither refusing condition: condition 1 waits idle ≥ 20 000 ms after an earlier attach, and condition 2 has no attach before DevTools. If DevTools did not attach in the docked state, the gate reads PASS on the bridge's own session and `c1=ok` gives a **FAIL recorded as a product finding** where the sheet's rule gives NOT MEASURED "DevTools was not attached". This is not a flattering direction, but the verdict is wrong.
**Fix:** read a `ctl0` before every conditional open and pass it to `ctrl20Verdict`. In UP-DEVT, either drop `resetPage` (the tab is fresh, so the reporter starts at zero) or run `idle()` to `IDLE_MIN_MS_19` after it. Choose by the refusing condition: no attach for EARLY, attach then idle for UNDOCK. SWEEP-HELD phase 1 can read `ctl0` as it stands. KEEP-4 is a contradiction in the sheet itself: see the proposed decision above.

**F4 MAJOR: `gate-cond none` always prints "both conditions answer ok".** `s13-r20-c.ts:165, 172-176`.
C3 passes only the refusing legs, so `none` also covers DEVT legs that ended RECORD, NOT MEASURED or FAIL without the finding. In each of those cases `CHECK R20-DEVT finding: both conditions answer ok; …` states a result that was not observed (agent-rules §2, "never invent a result"). Per §4.28 that line feeds the #374 item 3 doc reword. The three `NOT RUN — no DevTools condition refused` lines are correct in every case: only the finding is wrong.
**Fix:** give `gate-cond` the DEVT legs' verdicts (or the two rows'). Print the finding only when every leg was PASS. Otherwise print a counts-only CHECK, e.g. `CHECK R20-DEVT no-refusal legs-pass=<n> legs-other=<n>`. Test both cases.

**F5 MINOR: two of the tests cannot fail.** The marker test (`test/s13-r20-c.test.ts:24-27`) skips equal values, so two legs sharing one marker passes (mutant m12 survives). With duplicated markers, two open tabs would hold the same marker and the control would read `unread`. `parseCtl`'s anchors are untested (m14 survives).
**Fix:** assert `new Set(m).size === m.length`, and add cases such as `"1 ok yes 8 9"` and `"9 1 ok yes 8"` that must read `unread`.

**F6 MINOR: for C3, SWEEP-HELD's verdict is split over two actor runs, and the fold drops the sheet's reason text.** Phase 1 prints `LEG … control-pre` and phase 2 prints `LEG … sweep`, and §4.28 wants exactly one `ROW`. C3 must carry phase 1 into phase 2's row, as `R20Carry` does (`s13-r20.ps1:202-209`). `Get-R19Verdict` folds `LEG … NOT MEASURED DevTools was not attached` into a bare `ROW … NOT MEASURED`, so the reason survives only on the LEG line. Add this to C3's brief. It is not a C2 code defect.

**F7 NIT: fixed per-leg markers fail safe.** If a leftover tab carries a marker, Get-S13Control reads `unread`, which is RECORD and never a PASS. That meets C1 verifier F7 ("unique among open tabs"). The cost: a tab left by a STOP makes every later attempt read RECORD. A per-run nonce would avoid it. Acceptable as it stands.

**F8 NIT: the builder's other choices hold.** (1) Calling after an unattached control: no row forbids it. In the DEVT legs no later control reads that tab: it is closed, and the next leg opens a fresh one. In UP-DEVT a `c1=ok` can make `ctl2` read the bridge, but `g1` already decides there (`worseVerdict`). (4) The `CHECK <row> finding=devtools-refuses leg=<label>` line is a fine design-local choice: CHECK is a carried form, and the line names the leg as §4.28 asks. (5) Strict cases (a)–(d) and (f) are strict readings that flatter no result. (e) is F1. The K-devt text comes from K17 and matches `extension/src/debugger-errors.ts:52`. The NOT RUN texts match §4.28 character for character, em dash included (m9 killed).

## 7. Handoff
A fixer (Sonnet) takes F1–F5. F6 goes to C3's brief. Then a fresh verifier re-checks F1–F5 only. The session agent rules on the KEEP-4 control decision above. Nothing is left running. My copies sit in the session scratchpad, outside the repo.
