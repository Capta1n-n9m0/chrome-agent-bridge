# S5-drivers-C4 verifier 2 report (Opus, effort medium)

Scope: a re-check of findings F1, F2 and F3 from `S5-drivers-C4-verifier.md` against `S5-drivers-C4-fixer1.md`, plus
the exit checks. I only read and ran. Nothing was edited or committed, and no daemon, Chrome or live run was started.

## 1. Verdict
**PASS.** F1, F2 and F3 are fixed. Every exit check exits 0.

## 2. Outputs (main tree, the stage uncommitted)
- `npm test`: `Test Files 251 passed (251)`, `Tests 6016 passed (6016)`, exit 0. This matches the fixer's claim, and
  the count is unchanged from verifier 1 because the fix added no test.
- `npm run typecheck`: exit 0. All eight `recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b,.s13}.json` exit 0 under
  `npx tsc --noEmit -p`.
- `npm run build`: exit 0. `node scripts/doc-check.mjs`: exit 0.
- `git status --short`: the same 9 modified files and 3 untracked reports as at the start, plus this report.

## 4. Deviations
None.

## 5. Proposed decisions
None.

## 6. Findings (the re-check)

### F1: fixed
- `git diff --numstat docs/e2e-test-plan.md` reads `6 0`, so the plan diff is still additions only. Its one hunk
  (`@@ -2007,6 +2007,12 @@`) adds three dated notes plus blank lines after the R20-POP-OTHER-3 row and before
  `## 5.`. No row or note that existed before was edited.
- `git diff docs/e2e-test-plan.md | grep -icE "<user name>|C:\\Users|/c/Users"` reads 0, so the diff holds no local
  path and no user name.
- The note now calls `ROW R20-RESTORE dock NOT MEASURED found side unread, nothing changed` "a leg note like
  R20-POP-OTHER's `unjoined` line, not counted as a row by the aggregator". It says the row's own line then reads
  `ROW R20-RESTORE NOT MEASURED slice=C`. I checked both lines against the code:
  - **The leg note** is printed verbatim by `lineCmd20` (recipes/s13-r20.ts:154).
  - **"Not counted as a row by the aggregator"** is true. `aggregateRows20` (s13-r20.ts:51-61) takes a ROW line only
    when a verdict word follows the id, and in this note `dock` follows it.
  - **The row's own line** comes from `Write-R19RowLine` (recipes/s12-r19-lib.ps1:46), which prints
    `ROW $Id $Verdict slice=<letter>` for ids in `$R19Multi`. Verifier 1 confirmed that R20-RESTORE is in that list
    (s13-r20.ps1:16).
- The note still matches decision #416 item (1) (docs/decisions.md, the 2026-10-30 entry):
  - found `unread` with no dock change gives NOT MEASURED "found side unread, nothing changed" and goes on to R20-LOGS;
  - any dock change keeps the STOP `not-restored`;
  - the flag is set explicitly, not inferred from NOT RUN lines.
- Observation, not a finding: R20-POP-OTHER's `unjoined` note "does not change the row's verdict", while this note
  does feed the row's verdict through `Get-R19Verdict`. The comparison in the note is about the line's form only, and
  the same note says outright that the row's verdict is NOT MEASURED, so nothing reads ambiguously.

### F2: fixed, and the test now discriminates
- The `restore` T stub now takes `$Label` and prints `label=$Label`. The test expects
  `["CLOSE-XK", "RESTORE hwnd-null=True label=B"]` (recipes/test/s13-r20-b-ps.test.ts:142, :259).
- **Red proof, my own run.** I set up a scratch directory under this session's scratchpad, outside the main tree. It
  had no `node_modules` and no junction, only plain copies of `recipes/*.ps1` and `test-fixtures/s13-chooser.html`.
  - **The mutant.** In the copy, `Invoke-R20Restore 'B'` became `Invoke-R20Restore` in `Invoke-R20BRestore`
    (copy's s13-r20-b-defs.ps1:89, checked by grep).
  - **Run on the mutant.** `S13_R20_REPO=<copy> npx vitest run recipes/test/s13-r20-b-ps.test.ts` gave
    `Tests 1 failed | 31 passed (32)`. The one failure was "the restore closes WA before the shared restore…", with
    `- "RESTORE hwnd-null=True label=B"` against `+ "RESTORE hwnd-null=True label="`.
  - **Control.** I restored the unmutated defs file in the copy and ran again: `Tests 32 passed (32)`. The chooser
    fixture was copied too, so unlike the fixer's run there was no unrelated failure.
  - **Clean-up.** The scratch directory was deleted, and `ls` confirms it is gone. The main tree's
    `s13-r20-b-defs.ps1` was never touched.

### F3: fixed
All three added notes now end "No expected text or pass rule other than the one named here changes…", with a capital
"No" (`git diff` lines at 2010, 2012 and 2014).

No new finding. No new runtime fact.

## 7. Handoff
- I started no processes.
- The main tree is unchanged, apart from the gitignored `dist/` that `npm run build` rewrites.
- The fixer's runner-note text for S5-drivers-C.md §8 is correct against the code (s13-r20.ts:154,
  s12-r19-lib.ps1:46). The step agent still has to add it.
