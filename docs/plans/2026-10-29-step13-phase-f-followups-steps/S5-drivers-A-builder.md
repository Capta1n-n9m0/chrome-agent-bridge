# S5-drivers-A builder (liveA20, first half A1)

Model: Claude Sonnet 5.5, medium effort. Not run against Chrome, a daemon or a port.

## 1. Verdict
DONE for A1 (R20-0, R20-POP-BG, -FG, -OTHER, -NONE, R20-ARGS-ORDER, R20-ARGS-3). A2 (CON rows, ARGS-OLD, RESTORE, LOGS) not built, as briefed. One piece the brief did not list is also not built: the entry script (see section 4).

## 2. Outputs
Size (`wc -l`; code 574, tests 326, total 900 = the 900 cap, code under 600):
- `recipes/s13-r20.ts` 173 (shared runner), `recipes/s13-r20-a.ts` 277 (A1 actors), `recipes/s13-r20.ps1` 124 (wrapper).
- `recipes/test/s13-r20.test.ts` 99, `s13-r20-a.test.ts` 81, `s13-r20-ps.test.ts` 151 (the PowerShell test, 15 scenarios).
- `recipes/tsconfig.s13.json` (include list), `recipes/tsconfig.s6.json` (see Deviations).

Tests: before `npm test` 239 files, 5705 passed; after 242 files, 5757 passed (+52, none removed). `npm run typecheck`, all 8 `recipes/tsconfig*.json` (`for f in recipes/tsconfig*.json; do npx tsc --noEmit -p $f; done`) and `npm run build` exit 0. `git status --porcelain` shows only the lane's files plus the two tsconfigs.
Red evidence: `S5-drivers-A-builder-red.txt` (the three test files written first; all three suites failed to load, "Does the file exist?").

Where each STOP of the sheet bullet is reached in A1 (a test each, `s13-r20-ps.test.ts`): `build-not-loaded` and `extension-disabled` (R20-0's proof `STOPWHY`), `reload-failed` (the reload block wrapper, reload exit 2 twice), `popup-lease-wrong`, `existing-tool-changed`, `args-ran-js-off` (an actor's `STOPWHY` through `Invoke-R19Row`), `throw-after-state` (any throw, a crashed proof, an actor exit 2 with no reason), `not-restored` (`Invoke-R20RestoreCheck`). Each ends in the lib's `Stop-R19Wave` (restore, then `RETURN`), pairing checked by `checkStopReturn20`.

Pure pieces (`s13-r20.ts`): STOP reasons/stopLine/returnLine, `checkStopReturn20`, `rowVerdict20` and `aggregateRows20` (one ROW per id and slice letter; a leg note such as the `unjoined` line is not a row), `scan20` / `scan20Stream` / `scan20Actors` (counts only, `actorsVerdict`), `restoreCompare20` (found vs now by lines and sha256, fixed words out), `capturePath20`, `orderOf`, `proofDecision20`, and the CLI (`proof`, `s4`, `port`, `restore-compare`, `rows20`, `scan`, `scan-actors`). Forms come from `s13-forms.ts` (`loadedLine20`, `popLine`, `keyorderLine`, `mcplineLine`, `portLine`, `s4Line`, `scan20*Line`, `MCP_LINES`, `mcpLineRead/Verdict`); `argsLine`, `argsTotalLine`, `effLine` from `s12-forms.ts`.
Not reused, as S5-sheet §7 requires: `scan18`, `hasConsoleClause`, `loadedLine`, the old cap/overlap/devprobe readers, `mcpCodeOf`, `judgeMcpErr`, `judgeMcpRefusal`. `worseVerdict` was not used: it ranks FAIL, NOT DISCRIMINATING and NOT RUN equal; `rowVerdict20` has its own full order.

## 3. How `s13-r20.ps1` reuses `s12-r19-lib.ps1`
It dot-sources `s12-r19-lib.ps1` and `s12-r19-a.ps1` unchanged, then, after them, adds keys to the tables they read (`$R19Order['liveA20'|'liveB20'|'liveC20']`, `$R19Multi`, `$R19DeferRe`) and redefines only functions that pin Run 19 text (`Get-R19RecordName`, `Get-R19CapName`, `Get-R19Verdict` (filters the unjoined note, then calls the original), `Restore-R19State` (row label R20-RESTORE), `Invoke-R19Rerun` (calls `s13-r20 proof --rerun`), `Invoke-R19StepB` (the `val` step kind only)). `Invoke-R19Row ... -Actor 's13-r20-a'` runs the A1 rows with the lib's step lists, restore-in-finally and STOPWHY mapping. New functions carry an R20 prefix. No clean-wrap blocker: no s12-* file was edited. A2 fills `$R20SlotCon`, `$R20SlotAfterArgs3`, `$R20SlotOld` (the sheet's interleaved order) and appends blocks below the marker in `Register-R20Blocks` and commands to `cmds` in `s13-r20-a.ts`.

## 4. Deviations and what remains
- `recipes/tsconfig.s6.json`: three new test names added to its `exclude` (outside the lane list), as `s13-forms.test.ts` is, because they import chrome-typed code through `s13-forms.ts`; without it `.s6` fails with `Cannot find name 'chrome'`.
- Not built, to be assembled before a run: the entry script (param `-Block`, the s9/s11/s11b/s12 window dot-sources, `Register-R20Blocks`, `Invoke-R19Main`); `Invoke-R20RestoreCheck` exists but is called by A2's R20-RESTORE block. `Read-R20Worker` (the worker-console `perm`/`listener` read) is a hook: absent, both print `unread` and R20-0 passes on the keys alone with `CHECK R20-0 perm-not-measured` (the sheet's FALLBACK).
- `enabled` is decided by whether the proof's calls reach the extension (an unreachable extension reads `enabled=no`, STOP `extension-disabled`), not by reading the `chrome://extensions` card; `--enabled no` overrides.
- R20-POP-OTHER `third`: B's traffic runs on a tab in the same window; the sheet's second window W2 is not opened (needs a window helper). The sheet says B's window does not decide the grant.
- R20-ARGS-ORDER `ref` leg: an object has no element ref (`evaluateRef` answers `BAD_PARAMS`), so the answer is recorded (`ANSWER ... ref <code>`, `LEG ref RECORD`) and no KEYORDER ref line is printed. A leg with no element list prints `elem=page` (nothing to reorder).
- `active-guard` reads the raw `listTabs` entry's `active` flag; an entry without it reads `n/a`, so the round is not counted (NOT DISCRIMINATING). Not verified against the daemon's real answer.
- The human-style click (`Invoke-R20PopClick`) is UIA on a `Hyperlink` named `Open popup*` in the wave's window; unsent reads the leg NOT MEASURED.

## 5. Proposed decisions
None.

## 6. Findings
No pre-registered check failed. Nothing run live: the live paths (`popRound`, `argsOrder`, `args3`, `proof`, the PowerShell UIA click) are unexercised, as Run 19's actors were when built.
