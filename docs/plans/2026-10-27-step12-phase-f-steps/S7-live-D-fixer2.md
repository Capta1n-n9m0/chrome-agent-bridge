# S7-live liveD19 fixer, fix round 2

Model Sonnet 5.5, effort medium. Lane: recipes/* only. No commit.

## 1. Verdict
DONE

## 2. Outputs
Defect confirmed from code: `Close-S11Window` (s11-win.ps1:123) closes only handles in `$global:S11Own`; the console block (`s11b-r17.ps1:428-433`) opens E (`Open-S9ChromePage`) and D (`Open-S9WorkerConsole`) without registering them, and `Close-S16Windows` (s11b-r17.ps1:321-325) closes them by `Test-S9Live` + `Close-S9Window`. Each `Open-R19Seg` re-runs that block and overwrites `$global:E`.
Claim checked: `reload-extension.ps1` opens its own blank window and types `chrome://extensions` into its omnibox (lines ~165-180), so E is not needed by the reload.

Diff:
- `recipes/s12-r19-lib.ps1:108` non-'end' branch now `Close-R19CaptureWindows` (was `Close-S11Window $global:D; $global:D = 0`). New function `Close-R19CaptureWindows` (lines 110-117): for D then E, `if ($h -and (Test-S9Live $h)) { Close-S9Window $h }`, then sets the global to 0. It runs after the save and whether or not the save worked (a failed save still closes the windows; choice stated). 'end' branch, CAPSEG lines, file names and ordering unchanged. Header comment (line 5) lists `Close-S9Window` as a needed helper.
- `recipes/test/s12-r19.test.ts`: PRE gets a `Close-S9Window` stub that prints `CLOSE-CAPTURE` (so every existing `CLOSE-CAPTURE` assertion, the `segs` check and the `swapBlock` filter, is untouched and keeps its meaning) and records the handle in `$global:Closed9`. Two new scenarios `capClose` (full `Invoke-R19Swapped`, two reloads, console stub mints D/E = 8/9, 18/19, 28/29; `Close-S11Window` behaves as the real one and refuses a handle outside S11Own; `Test-S11Own` false) and `capCloseOne` (`Save-R19Seg 'reload'` alone). Two new CHECKS (each also runs green-real / red-stub) and two new MUTANTS rows ("closed through Close-S11Window (attempt 1)" and "E left open"). No existing `it`, check, mutant row or assertion deleted or changed.
- Files s12-r19-b / s12-r19-de tests stub `Save-R19Seg` itself and needed no change.

## Failing before (new tests against the unfixed lib)
`npx vitest run recipes/test/s12-r19.test.ts`:
```
x ... green on the real lib, red on a stub: capture windows: the real Close-S11Window refuses a window outside S11Own, so a reload closes every capture D and E by handle and only the last pair stays open
x ... green on the real lib, red on a stub: capture windows: Save-R19Seg 'reload' closes D and E by handle and clears both
Tests 2 failed | 54 passed (56)
```

## Counts and exit codes
- `npm test`: Test Files 235 passed (235); Tests 5596 passed (5596). Before: 5592 (s12-r19.test.ts 52 -> 56 tests, +2 checks +2 mutants; 235 files unchanged). Count did not drop.
- `npm run typecheck` exit 0.
- `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json`: all exit 0.

## Findings
Not changed (minimal fix): `Save-R19Seg` still returns early at its second line when D is not live, so an E left from an earlier open would then stay until the next open overwrites `$global:E`. Not reachable in the attempt-1 path.

## Files changed
- C:\Users\aliev\Projects\chrome-remote-extention\recipes\s12-r19-lib.ps1
- C:\Users\aliev\Projects\chrome-remote-extention\recipes\test\s12-r19.test.ts
- C:\Users\aliev\Projects\chrome-remote-extention\docs\plans\2026-10-27-step12-phase-f-steps\S7-live-D-fixer2.md (this report)
