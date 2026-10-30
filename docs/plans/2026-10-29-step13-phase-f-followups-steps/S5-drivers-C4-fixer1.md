# S5-drivers-C4 fixer 1 report (Sonnet, effort medium)

## 1. Verdict
DONE. F1, F2 and F3 are fixed. Nothing was committed, and no daemon, Chrome or live run was started.

## 2. Outputs
- `docs/e2e-test-plan.md` (the three uncommitted #416 notes only; `git diff --numstat` still reads `6 0`, additions only).
- `recipes/test/s13-r20-b-ps.test.ts` (the `restore` test, lines 142 and 259).
- `npm test`: Test Files 251 passed (251), Tests 6016 passed (6016), exit 0 (no test was added, so the count is unchanged).
- `npm run typecheck`: exit 0. All eight `recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b,.s13}.json` under `npx tsc --noEmit -p`: exit 0.
  `npm run build`: exit 0. `node scripts/doc-check.mjs`: exit 0.

## 4. Deviations
None.

## 6. Findings, as fixed
- **F1.** The #416 dock note now says that `ROW R20-RESTORE dock NOT MEASURED found side unread, nothing changed` is a leg
  note (like R20-POP-OTHER's `unjoined` line, not counted as a row by the aggregator), and that the row's own line then reads
  `ROW R20-RESTORE NOT MEASURED slice=C`. The form is the one `Write-R19RowLine` prints, as the verifier quoted it.
- **F2.** The `restore` test's `Invoke-R20Restore` stub now takes `$Label` and prints `label=$Label`; the test expects
  `["CLOSE-XK", "RESTORE hwnd-null=True label=B"]`. Red proof: I copied `recipes/*.ps1` into a scratch directory outside the
  main tree, removed the `'B'` from `Invoke-R20BRestore` there, and ran the real test with `S13_R20_REPO` set to that copy
  (the test's own override). The `restore` test failed with `+ "RESTORE hwnd-null=True label="` against the expected
  `label=B`. The other failure in that run (the window guard names the chooser fixture's title) is only because the
  scratch copy lacks the fixtures. With the real tree the file passes, 32 of 32. The main tree's `s13-r20-b-defs.ps1`
  was never touched, and the scratch directory is deleted. No worktree and no junction were used.
- **F3.** "no expected text" is now "No expected text" in all three notes (lines 2010, 2012, 2014).

## 7. Handoff
Runner-note text for `S5-drivers-C.md` §8 (the file is not edited here; the step agent adds it): "In the NOT MEASURED case
of R20-RESTORE's dock clause, `ROW R20-RESTORE dock NOT MEASURED found side unread, nothing changed` is a leg note, like
R20-POP-OTHER's `unjoined` line, and the aggregator does not count it as a row. The row's own line reads
`ROW R20-RESTORE NOT MEASURED slice=C`, and the reason appears only on the CHECK and note lines above it."

The tree holds the builder's nine modified files plus the builder, verifier and this report, all uncommitted.
