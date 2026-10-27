# S1-live fixer, round 1 (Claude Sonnet 5.5, medium effort)

## 1. Verdict
DONE.

## 2. Outputs
Finding verified: `Invoke-S11Opt` (recipes/s11-win.ps1:272, 299) holds the second options window in `$O2`. The `$S12OptPairs` replacement
assigned `$o2 = Wait-S12O2 ...`; PowerShell names are case-insensitive, so `$o2` overwrote `$O2` with the result object. The next
`Get-S9Options $O2` ([long] parameter) and `Close-S11Window $O2` then threw. A second effect: `$O2` is reassigned at s11-win.ps1:299 to a new
window handle, so the later `Format-S12OptO2 $o2` would have formatted a handle, not the poll result, even without the throw.

Diff:
- recipes/s12-win.ps1:178: replacement text `$o2` -> `$o2Res` (4 uses). Regex part untouched.
- recipes/s12-win.ps1:179: `Format-S12OptO2 $o2` -> `Format-S12OptO2 $o2Res`.
- Other replacements checked: `$S12OmniPairs` (lines 181) introduces no variable. Only pair 1 and pair 2 introduced `$o2`. No other
  `Get-S12PatchedFunction` use. No collision left (`$o2Res` vs the function's `$o2Ms`, `$o2Eq`, `$o2Conflict`: distinct names).
- Printed lines, pass rules, `$S12O2PollMaxMs` (15000): unchanged.
- recipes/test/s12-helpers-b.test.ts (new describe before the existing PowerShell describe, `HANDLE_BODY`): runs the real patched
  `Invoke-S12Opt` with `Open-S11Options` returning 777 and `Get-S9Options`/`Close-S11Window` stubs that keep the real `[long]` parameters and
  print the handle they received. Asserts 777 reaches both later calls (Close twice), the run does not throw, and the `OPT O2 ...` and
  `OPT observed ...` lines still print.

Red on the old code (before the s12-win.ps1 edit), `npx vitest run recipes/test/s12-helpers-b.test.ts`:
- `AssertionError: expected [ 'HANDLE Get-S9Options 5', ...(2) ] to include 'HANDLE Get-S9Options 777'` (s12-helpers-b.test.ts:162)
- `AssertionError: expected false to be true` on the OPT O2 line check (the run threw before printing it)
- `Tests 2 failed | 15 passed (17)`

Green after the fix: `Test Files 1 passed (1)`, `Tests 17 passed (17)`.

Commands after the fix:
- `npx vitest run recipes/test/s12`: 7 files, 152 tests passed.
- `npm test`: 210 files passed, 5010 tests passed (before: not re-read; brief said 4665+; the tree has grown since). Count did not drop.
- `npx tsc --noEmit -p recipes/<tsconfig>.json` for tsconfig, .fe, .s6, .s9, .s10, .s11, .s11b: all exit 0.
- `npm run typecheck`: exit 0. `npm run build` not run (no product change).
- `git status --short`: M recipes/s12-win.ps1, M recipes/test/s12-helpers-b.test.ts, plus the four untracked steps-dir files.

## 3. Verifier verdict
None yet.

## 4. Deviations
None. Nothing was run against Chrome or the daemon; nothing committed.

## 5. Proposed decisions
None.

## 6. Findings
Runtime fact worth a recipes/CLAUDE.md bullet (same class as `$o`/`$global:O`): a variable a regex patch introduces into a re-defined function
must not match any variable of that function case-insensitively; `$o2` vs `$O2` in the patched `Invoke-S11Opt` broke Run 18 liveA18 attempt 1
(`ParameterBindingArgumentTransformationException` at `Get-S9Options`).

## 7. Handoff
No processes, no watchers. A fresh verifier should confirm the new test is red on `git show HEAD:recipes/s12-win.ps1` and green on the tree.
