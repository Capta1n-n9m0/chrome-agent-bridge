# S5-liveB fixer report (set-up fixes, #282)

Model: Sonnet 5.5, effort medium. UTC start 2026-10-26T04:54Z, end ~05:05Z.

## 1. Verdict
DONE.

## 2. Outputs
Files: recipes/s11-rules.ts, recipes/s11.ts, recipes/s11-r16.ps1, recipes/s9-win.ps1 (CLICK print only), recipes/tsconfig.s11.json,
recipes/test/s11-liveB-fixes.test.ts (new, 8 tests). `npm test`: 3803 passed / 153 files -> 3811 passed / 154 files.
`npm run typecheck` 0; `tsc --noEmit -p` on all six recipes tsconfigs 0. PS 5.1 ParseFile: s9-win and s11-r16 0 errors. Both stay LF;
s11-r16 ASCII; s9-win keeps its 18 pre-existing non-ASCII lines (none added).
Mutation proof (the four old texts put back in the working files, then restored from copies): 4 of 8 new tests failed (F4 SCAN/EVIDENCE
lines, CLICK print, console save, refusalRow wiring); the pure F3 test cannot fail on old code because the function is new, the wiring test covers it.

## 3. The fixes
- F3: pure `refusalRowVerdicts` (s11-rules.ts); `refusalRow` (s11.ts) prints each step's own clause verdict, then a `banner` CHECK, then the row.
  Row verdict unchanged (fails iff any clause fails or, with the sampler on, a banner was seen). UP-6 and UP-6B are the only callers.
- F4: `scanText` counts `scheme://` matches (host may be empty, so file:/// still counts), not a bare `://`; `evidenceCounts` inherits it.
  Fixture rule unchanged. The old counts of the committed files (record 22 -> 19, "other 3" were the SCAN lines) now read clean.
- F5: `Click-S9Element` prints `(Get-S9FirstLine $El.Current.Name).First`.
- Console: `$SliceB` already has `console` (index 7) before `up-0` (index 8), shown by the static test. A stop before UP-LOGS did lose it:
  `Stop-S16Wave` and the teardown block both close D unread. New `Save-S16Console` (called first in `Close-S16Windows`, in try/catch) reads
  D into `$env:S11_OUT\console.txt` once; `S16ConsoleRead` is persisted and set by `up-logs`, so a normal teardown does not re-read. No verdict, no guard changed.

## 4. Deviations / proposed decisions
None. Note: the console stop-path save is covered by static tests only (PowerShell/UIA, not run live).

## 7. Handoff
No background processes left (one stray python from a hung heredoc of mine was killed). Report uncommitted; journal.md not staged.
