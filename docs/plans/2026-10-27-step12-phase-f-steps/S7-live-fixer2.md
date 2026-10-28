# S7-live fix round 2 (fixer): Format-S9Title knows Run 19's fixture titles

Model Sonnet 5.5, effort medium. Lane kept: `recipes/s12-win.ps1` and `recipes/test/` only. Nothing committed; no live run.

## 1. Verdict
DONE.

## 2. Outputs
- `recipes/s12-win.ps1` (+9 lines): captures the prior `Format-S9Title` once (`$global:S12PriorFormatTitle`, guarded so a second dot-source cannot capture the override and recurse), then redefines it. It returns the title itself when it matches exactly `^(S12 console fixture|S12 chooser fixture|S12 chooser frame)( - Google Chrome)?$`, and otherwise calls the prior function (s11-win.ps1's), so every other answer is unchanged. No wildcard.
- `recipes/test/s12-title.test.ts` (new, 6 tests). It runs powershell.exe with the real loader order (s9, s11, s11b, s12) and checks:
  - each fixture title, with and without ` - Google Chrome`, comes back as itself;
  - `S12 console fixtureX`, `S12 other`, `Inbox - Gmail`, the empty string, `xS12 console fixture` and a doubled suffix give `<other window>`;
  - the old accepted titles (`Agent Bridge E2E Playground - Google Chrome`, `S11 upload fixture`, `about:blank`, `S10 CAP fixture - Google Chrome`, `New Tab`) come back as before, `DevTools` gives `<DevTools window>`, and an unknown title gives `<other window>`;
  - a static pair: the `<title>` of every `test-fixtures/s12-*.html` appears in s12-win.ps1, and the fixture set is exactly the three known titles, so a new s12 fixture fails until it is added; no `S12 [` or `S12 .*` pattern exists in the file.
- Red before the fix: 2 of 6 failed (the fixture-titles-return-themselves test and the static tie); the 4 refusal and unchanged-behaviour tests passed, as they should. Green after: 6 of 6.
- Numbers:
  - `npm test` before: 232 files, 5570 passed. After: 233 files, 5576 passed (+6, the new file).
  - `npm run typecheck`: no errors.
  - Recipes typechecks `tsconfig.json`, `.fe`, `.s6`, `.s9`, `.s10`, `.s11`, `.s11b`: all exit 0.
- `git diff --stat`: `recipes/s12-win.ps1` 9 insertions (the other two entries are the ledger and the liveA19 doc, which were already modified and are not mine). The new test file is untracked.

## 4. Deviations
None. The test loads s11b-win.ps1 as the runner does; it needs no stubs.

## 6. Findings
- Run 18's runner `recipes/s12-r18.ps1` (lines 46-49) dot-sources the same four files in the same order, so the override applies there too. Effect: W showing an S12 fixture page now counts as the wave's own in Run 18 as well. Run 18 is closed and its tests (s12-r18*, s12-ps*, s12-helpers*) still pass in the full run. `s12-win-b.ps1` and `s12-win-c.ps1` load after s12-win.ps1 and do not redefine the function.
- The guards (`Test-S9Live`, `Assert-S11Own`) are untouched: the window must still be recorded at open time and owned by the recorded chrome pid. Only the title test widens, and only to three exact strings.
- A static note: the title list lives in one place in s12-win.ps1; the test, not a comment, keeps it in step with the fixtures.

## 7. Handoff
No processes left running. Files to commit: `recipes/s12-win.ps1`, `recipes/test/s12-title.test.ts`. Line endings: git warns LF will become CRLF for s12-win.ps1 (the repo's usual autocrlf behaviour).
