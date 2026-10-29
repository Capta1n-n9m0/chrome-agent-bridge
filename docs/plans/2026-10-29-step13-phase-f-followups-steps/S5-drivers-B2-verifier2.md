# S5-drivers-B2 verifier, re-check after fix round 1

Model: Opus, medium effort. Role: verifier (agent-rules §6). This re-checks only the items the fix round touched:
F1 to F4 and the code around them in `recipes/s13-r20-b.ts`. Read and run only. Nothing in the main tree was edited,
reverted or moved. The mutants ran on a copy of the tree in the scratchpad, whose `node_modules` was a junction to
the main tree's. The junction was removed with `cmd /c rmdir` before anything else, and the main tree's
`node_modules/.bin` still lists 42 entries. No Chrome, no daemon, no port.

## 1. Verdict

**PASS-with-notes.** F1 and F2 are fixed against the sheet, each new test fails on the pre-fix logic, and every exit
check holds. The notes are the open NITs (F3 to F5), which go into the record. They need no code change.

## 2. Outputs (re-derived)

| Check | Command | Result |
|---|---|---|
| Tests | `npm test` | `Test Files 244 passed (244)`, `Tests 5839 passed (5839)`. That is 5837 + 2: the two new `it` blocks, F1 at `s13-r20-b.test.ts:77` and F2 at `:82`. The loose test at `:72-75` was rewritten in place, not removed. |
| Typecheck | `npm run typecheck` | exit 0 |
| Recipes | `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b,.s13}.json` | all eight exit 0 |
| Build | `npm run build` | exit 0. Afterwards `git status --short` shows only the slice's 4 modified and 5 untracked files: the builder, fixer1 and verifier reports, `s13-r20-b.ts` and its test. |
| Personal data | `grep -niE` for the user's names and for `C:\Users` / `C:/Users` in the slice's code, configs and reports | no hits. The only hit was the first verifier's description of its own grep pattern, which holds no path. |

**Red proofs.** These ran on the copy, with `npx vitest run recipes/test/s13-r20-b.test.ts`. The baseline on the
copy, identical to the main tree's file (`diff -q`), gave `22 passed`.
- **F1 mutant.** The pre-fix order was restored, so a `null` digest returns `NOT MEASURED` before the counters are
  judged. Result: `1 failed | 21 passed`, the failure `an ok the page never received is a FAIL even with no digest
  (F1)` with `expected 'NOT MEASURED' to be 'FAIL'`.
- **F2 mutant.** `parseDialogCount` was changed back to the old `dlgN` mapping, where a non-integer reads as 0.
  Result: `1 failed | 21 passed`, the failure `an unreadable dialog count is a HelperDefect, never 0 (F2)` with
  `expected function to throw an error, but it didn't`.
- After each mutant the file was restored and `diff -q` against the main tree's copy matched.

## 4. Deviations

None. The fixer's red proof re-implemented the old logic in a script. This re-check instead ran the real test file
against a mutated copy of the module, which is the stronger form.

## 6. Findings

### F1 (MAJOR): closed

`recipes/s13-r20-b.ts:42-47`. `judgeKeptDifferent` now gives FAIL unless both answers are `ok` and, after call 2,
`change=2`, `input=2`, `cancel=0` and `files=1`. Only when all of those hold does a `null` digest give NOT MEASURED;
otherwise the result is PASS or FAIL by digest difference. This matches the sheet's pass rule for leg `different`
(`docs/e2e-test-plan.md:1983`) word for word, and the preamble at `:1942` ("an `ok` is never evidence"). The
verifier's two cases and a third (`files=0`, digest `null`) are pinned as FAIL at `:78-80`. The remaining NOT MEASURED
case can now only be a reporter that set `files=1` and `change=2` but no digest, which is a helper-side unreadable
value, as F1 asked. The session agent should restate the builder's proposed decision 3 in these terms, as the fixer
says.

The sheet's expected `call=1` line is not judged, and it is not part of the pass rule. It is unchanged and still
printed.

### F2 (MINOR): closed

`recipes/s13-r20-b.ts:79-84`. `parseDialogCount` accepts only `^\d+$` after a trim, which covers `[int]`'s output
from `Get-R19DialogN` (`recipes/s12-r19-c.ps1:24`) with a CRLF. Anything else throws `HelperDefect`.
`catchDecision` lets a `HelperDefect` propagate even on a stateless row (`recipes/s12-r19-a.ts:87-90`), so `main`
prints `STOP: HelperDefect` and exits 2. The STOP fails closed. A row's FAIL leg cannot absorb it, and nothing can
read it as "no dialog". In TWICE, the count is read before the row's lines are printed, so an unreadable count ends
the slice with no ROW for that row. A slice STOP is the right outcome here.

### F3 and F4 (NIT): the comments are accurate

- `:100` (F3): `recipes/s11.ts:425-430` stores `sha256: sha256Hex(b)` for each file at `make`, and `sha()` at `:77`
  reads exactly that field. The leg still compares the page's digests (`page13` → `judgeKeptDifferent`). The comment
  is true.
- `:113` (F4): the MCP leg opens its tab with `browser_new_tab` and takes the handle from the answer, as Run 19's MCP
  legs do (`recipes/s12-r19-a.ts:198, 329`). The comment is true.
- Both are still departures from the sheet's words. The session agent records them (first verifier, F3 and F4).

### F5 (NIT): unchanged, not in this round's scope

The fixer did not act on F5, which the first verifier rated optional. #405's wording still needs the builder's
proposed decision 1.

### No regression

`s13-r20-b.ts` differs from what the first verifier read only in four places: the order inside
`judgeKeptDifferent`, the new `parseDialogCount` that `dlgN` now uses, and the two comment lines. `chooseTwice`,
`chooseKept`, `chooseRefuseDis`, `stopFor`, `preludeStop` and `cmds` are unchanged in behaviour. All 22 tests in the
file pass, and so does the full suite. The PowerShell side (`s13-r20.ps1` and its test) was outside the fixer's lane,
and its tests pass in the full run.

## 7. Handoff

- The slice is ready for its committer. The file list is `recipes/s13-r20-b.ts`, `recipes/test/s13-r20-b.test.ts`,
  `recipes/s13-r20.ps1`, `recipes/test/s13-r20-ps.test.ts`, `recipes/tsconfig.s13.json`, `recipes/tsconfig.s6.json`
  and the four B2 reports.
- For the session agent's record: restate proposed decision 3 (F1), the F3 and F4 departures, and amend #405's
  wording (F5 / decision 1).
- B3/B4 carry the first verifier's handoff list unchanged. The PowerShell value steps must answer a bare integer,
  since `parseDialogCount` refuses anything else.
- The scratch copy remains in the session scratchpad (`v2`), with its junction already removed. Nothing is running.
