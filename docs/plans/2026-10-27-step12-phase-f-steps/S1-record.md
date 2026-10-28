# S1-record: Run 18's record (step report)

Step agent: Claude Opus 5.5, effort medium. Children: builder Claude Sonnet 5.5 (`S1-record-builder.md`), verifier
Claude Opus 5.5 (`S1-record-verifier.md`), fixer Claude Sonnet 5.5 (`S1-record-fixer.md`), verifier 2 Claude Opus 5.5
(`S1-record-verifier2.md`), two committers Claude Sonnet 5.5. All ran at medium. No ledger was kept: the stage held no
long wait, and each child was waited for inside the turn (#350).

## 1. Verdict
**DONE.** S1-live is closed, and Run 18 is judged in `S1-run-record.md`, with a short entry for Run 18 in
`docs/e2e-test-plan.md` §5.

## 2. Outputs
- **S1-live close-out:** commit `af56b3a` `test(e2e): S1-live — Run 18 liveB18 (ran to the end; 3 banner FAILs with a
  passing control)`. It adds the four liveB18 files, `S1-live.md` §8 and the ledger's closing line.
- **The record:** `S1-run-record.md` and the §5 Run 18 entry. The commit hash is in the session journal; the committer
  reports it.
- **Verdicts:** 13 rows make 17 slice-rows, because some rows run in both slices: 10 PASS, 6 FAIL, 1 NOT MEASURED.
  - FAIL: R18-UP-OPT, R18-UP-6, R18-F-RAW, R18-F-RAW-2 and R18-F-RAW-DIR, each with a passing control. R18-LOGS slice A is
    FAIL as written (#349).
  - NOT MEASURED: R18-UP-DEVT.
  - PASS: R18-0 (A, B), R18-BANNER-CTL (A, B), R18-RESTORE (A, B), R18-LOGS B, R18-UP-L1, R18-SAVE-REFUSE and
    R18-UP-RACE-A.
- **Banner rule:** both controls passed, so the run-wide rule does not fire and every banner clause is judged as read.
- **Exit checks:** R1.1 to R1.7 are all met, each with the line that shows it.
- **Public safety:** `scan18 --what other` prints all counts 0 on the record and on the §5 entry. `node scripts/doc-check.mjs`
  exits 0.

## 3. Verifier verdict
- **Verifier 1: PASS-with-notes.** It re-derived all 17 verdicts and agrees with each. It found two MINORs: R1.7's claim
  that no other STOP line exists, and judgment call 1 framed as an ambiguity. It also found three NITs.
- **Fix round 1:** all five were fixed. Fix rounds used: 1 of 3.
- **Verifier 2: PASS-with-notes.** It found one new NIT, N4, left open: the §5 entry still says "the stricter reading is in
  the record's section 7". Section 7 now gives one reading with its clause-to-line map.

## 4. Deviations
- The §5 entry sits after Run 17b's and before `## 6. Exit criteria`, not at the end of the file, because §5 is not the
  file's last section.

## 5. Proposed decisions
These are in `S1-run-record.md` §6, in full form. Each is marked "for user review" where it touches the product.
1. **R18-UP-OPT FAIL:** O2 did not show the saved text in 15 s, in one measurement. The cause is not established. Measure
   it before any change to the options page.
2. **The banner FAILs** (R18-UP-6, R18-F-RAW, -F-RAW-2, -F-RAW-DIR): they stay open product findings with no cause, and
   are carried to Run 19 as new rows after S4b. In UP-6, the `missing` and `relative` legs send no call, yet they read
   `banner=seen` with an idle of 27 s and a passing control. This is recorded but not explained.
3. **R18-UP-DEVT:** it was NOT MEASURED a second time. Prove a DevTools attach method with the control call before a row
   uses it.
4. **A recipes-only helper fix:**
   - UP-OPT's ROW line says "showed … after 15136 ms" while its `OPT` line reads `shown=no`.
   - The console lines still show as pending.
   - The `WARN row printed twice: RULES` line.

#349 (a) is still the user's to rule: the MCP failure report names an absolute screenshot path.

## 6. Findings
- **Plan-side notes, not edits of §4.26:**
  - §4.26 lists the console capture before the reload, but only reload-then-capture works (#348).
  - §4.26 and S7-run-record §5 item 8 give the wrong cause for the old scanner's false FAILs (#346).
- **Both builds** (`b8b493d` for liveA, `4a46a22` for liveB) contain S2a, S2b, S3a, S3b and S4a, by
  `git merge-base --is-ancestor`.

## 7. Handoff
- Nothing is running, and this stage started no process.
- The S4b agent's uncommitted files in `extension/` were not touched.
- Next: the session agent rules the proposed decisions, then the Step 12 plan continues.
