# S7-live liveD19, fix round 1: fixer report

Model: Sonnet 5.5, effort medium. Lane: recipes only. Nothing committed.

## 1. Verdict
DONE (with one unexplained flaky failure in one full-suite run, see Findings).

## 2. Outputs
- `recipes/s12-r19-de.ts` line 81 (`version()`, R19-VERSION): `IN = { css: "#in" }` is now `IN = { css: "#vis" }`. Judges, wants and order untouched.
- `recipes/test/s12-r19-de-target.test.ts` (new, 2 tests): (a) the R19-VERSION line has `IN = { css: "#vis" }` and the file holds no `"#in"` string at all; (b) in `test-fixtures/s12-chooser.js`, `VIS` is `<input id="vis" type="file"` with no `hidden`, `HID` is `#in` with `hidden`, and `c1: BTN + HID + VIS`.
- Red on the old line: with the new test in the tree and line 81 still `#in`, `npx vitest run recipes/test/s12-r19-de-target.test.ts` gave `Tests 1 failed | 1 passed (2)` (test (a) red). I did not revert the line a second time; the red run was before the edit, the edit was then applied.
- Green after: `Test Files 1 passed (1)`, `Tests 2 passed (2)`.
- `npm test` count: before (HEAD 2f6ca57) = 5590 tests / 234 files, derived (the first full run, taken with the new file already present and the old line, read 5592 tests / 235 files with 1 failed, which is my red test: 5592 - 2). After = `Test Files 235 passed (235)`, `Tests 5592 passed (5592)` (two later runs; see Findings for one that differed). Net +2 tests, +1 file, nothing removed or edited.
- `npm run typecheck`: exit 0.
- Recipes `npx tsc --noEmit -p`: tsconfig.json, .fe, .s6, .s9, .s10, .s11, .s11b all exit 0.

## 4. Deviations
The pre-fix baseline was derived, not measured on a clean tree (I created the test file before the first `npm test`). The arithmetic above is the only source.

## 6. Findings
- One `npm test` run right after the fix read `1 failed | 234 passed (235)`, `1 failed | 5591 passed (5592)`. I did not capture which test it was (output filtered). Two re-runs were fully green (5592 passed). Not explained; likely a timing flake among the PowerShell mutant tests, which run 1-4 s each, but that is a guess. The step agent's verifier should run `npm test` itself.
- `git status` also shows `docs/plans/2026-10-27-step12-phase-f-steps/S7-live.ledger.md` modified; not mine (the step agent's ledger).

## 7. Handoff
Files changed: `recipes/s12-r19-de.ts`, `recipes/test/s12-r19-de-target.test.ts` (new), this report.
