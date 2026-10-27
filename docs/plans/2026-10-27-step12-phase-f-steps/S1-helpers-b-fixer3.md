# S1-helpers-b fixer 3 report (round 3 of 3, Sonnet, medium)

Scope: verifier 3's F-1 to F-4 only. No Chrome, daemon, port 9234 or build. Mutants were exact edits to the real file, restored and
compared with `cmp` ("restored" for all).

## Findings

- **F-1 (MAJOR), fixed (test).** New case in `recipes/test/s12-helpers-b-fix2.test.ts`: `scan18` over
  `{"r":"see http://localhost:8081\nhttp://evil.example/x"}` (`\n` = backslash + n) gives urls 2, fixture 1, other 1.
  Mutant "backslash stop removed from `scan18`'s walk alone" (`s12-rules.ts:91`, `\\` dropped from the class): 1 test red
  (the new one). Restored: green.
- **F-2 (MINOR), fixed.** `recipes/s11-win.ps1:296-297` (still two lines): each list is read into `$ulI` / `$ulW`; if
  `Get-S9ById` returns null the line calls `Stop9 '<id> list not found'` and then `throw`. Test case in
  `s12-helpers-b.test.ts`: the stub `Get-S9ById` returns null for `uploadfolders-invalid`, then for `uploadfolders-warned`, run
  by `Invoke-S12Opt` (the patched copy of `Invoke-S11Opt`) under `$ErrorActionPreference = 'Continue'`; asserts the `STOP:`
  line and `NULLLIST <id> threw` for both. Mutants, PowerShell run in PowerShell: null check off on invalid (`if ($false)`): 2 red;
  off on warned: 2 red.
- **F-3 (NIT), fixed.** The stub now has `$global:Page` for the invalid list and `$global:Warned` for the warned list (the run
  with a warned found item sets both). Mutants: invalid list read through the warned list's variable (FD3-style swap): 1 red;
  the two ids swapped in the `Get-S9ById` calls: 1 red.
- **F-4 (NIT), recounted.** Code insertions per `git diff --numstat HEAD -- recipes` (s11-win 3 (unchanged by this round: the
  lines grew, the line count did not), s11b-r17b-build 5, s11b-r17b-rules 18, s11b-r17b.ps1 2, s11b-win 1, s11b 92, s12-rules
  49, s12-win 89) = **259**. Tests: numstat 3 + 22, plus `wc -l` of the three new test files 211 + 128 + 134 = 473, total
  **498**. Total 757. Code is under 350.

## Checks

- Seven recipes tsconfigs and five package `tsc --noEmit -p`: all exit 0.
- `npx vitest run recipes/test`: 1129 -> **1131** passed, 52 files (the F-1 case and the null-list case).
- Full `npm test`, once: **4881 passed, 207 files**, 0 failed.
- `s12-win.ps1`, `s11-win.ps1`, `s11b-win.ps1`, `s11b-r17b.ps1`: Parser 0 errors, 0 non-ASCII bytes.

## Final file list for the committer (recipes lane)

Modified: `recipes/s11-win.ps1`, `recipes/s11b-r17b-build.ts`, `recipes/s11b-r17b-rules.ts`, `recipes/s11b-r17b.ps1`,
`recipes/s11b-win.ps1`, `recipes/s11b.ts`, `recipes/s12-rules.ts`, `recipes/s12-win.ps1`, `recipes/test/s11-win-static.test.ts`,
`recipes/test/s11b-r17b-fix.test.ts`.
New: `recipes/test/s12-helpers-b.test.ts`, `recipes/test/s12-helpers-b-fix.test.ts`, `recipes/test/s12-helpers-b-fix2.test.ts`.
Plus the slice's reports under `docs/plans/2026-10-27-step12-phase-f-steps/` (S1-helpers-b-*). Files outside recipes in `git status`
belong to other agents.

## Handoff changes

- Risk verifier 3 names, unmeasured: UIA may omit an **empty** `<ul>`. R18-UP-OPT expects `warned items 0`, so that list is empty
  on a correct page, and `Invoke-S11Opt` / `Invoke-S12Opt` would then STOP live after the wave's first Upload-folders change.
  Run 18's prologue should measure whether `uploadfolders-warned` is findable when empty; if not, the rule (null warned list and
  nothing warned elsewhere = 0) needs a step-agent ruling.
- S1-helpers-c should keep its outer `try` around the wave (a `throw` there becomes a `Stop-S16Wave`).
- The helper's STOP line goes through `Stop9`, so it reaches the raw log in the s9 form.
