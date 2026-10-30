# S5-drivers-C3 verifier, round 2: liveC20's entry script and blocks

Model and effort: Opus 5.5, medium. I only read and ran things. Nothing ran against Chrome, a daemon, a port, UIA or a live run. The one slice script I ran was `s13-r20-c.ps1 -Block plan`. Evidence: `S5-drivers-C3-verifier2-evidence.txt`.

## 1. Verdict
**PASS-with-notes.** F1 is fixed, and the fix is discriminating: a red copy fails 2 tests, and the closure check finds `Invoke-R20Serve` missing without the parser load. F3 and F4 hold in §8. F5's non-fix stands, but part of its reason is wrong (N3). Four new findings, all MINOR or NIT.

## 2. Outputs (my own re-runs; the tree is clean apart from the slice's files)
- `npm test`: **251 files, 6013 passed**, exit 0. That is 6012 / 251 before the fixer plus 1 (the new serve `it`), and 5977 / 250 before C3 plus 36. No test was removed.
- `npm run typecheck`: exit 0. All eight `recipes/tsconfig*.json` (`json`, `fe`, `s6`, `s9`, `s10`, `s11`, `s11b`, `s13`): exit 0 each.
- `npm run build`: exit 0. `node scripts/doc-check.mjs`: exit 0.
- `-Block plan`: exit 0. It printed `PLAN liveC20: preflight servers files window reload console r20-0c flag r20-devt-undock r20-devt-early r20-up-devt r20-keep-4 r20-sweep-held r20-restore r20-logs`.
- `git status --short`: the 6 modified and 3 new slice files, plus the three C3 reports. This report and its evidence file are the only additions.

## 3. F1 re-check (CRITICAL in round 1): fixed
- **Code.**
  - `s13-r20-c.ps1:64-65` reads the two functions with `Get-R20CServeDefs`, which wraps `Get-R18Defs` (parser only). It then dot-sources the two texts at the script's top level.
  - If either function is missing, the script prints `STOP: the serve step's functions were not read: …` and exits 2.
  - That happens before `Register-R20Blocks` and before `Invoke-R19Main`, so before any state change. Only the out folder has been created by then.
  - `s13-r20-b-defs.ps1` is never dot-sourced (the test asserts `^\. .*s13-r20-b-defs` is absent). Its load-time lines 7-14 (`R19Xk`, `Format-S9Title`) are statements, not functions, so `Get-R18Defs` never returns them.
  - `Get-R20CServeDefs` (`s13-r20-c-defs.ps1:200-204`) throws on either missing name.
- **Red.** I made a copy outside the tree with lines 64-65 and `Get-R20CServeDefs` removed. Result: **2 failed / 30 passed**: the entry-text test and the serve-step test.
- **Mutants**, on copies outside the tree with no `node_modules`:
  - m3 (dot-source b-defs whole): 1 failed, the entry-text test.
  - m4 (the loader drops `Test-R20NodeAlive`): 1 failed, the serve test (`TEXTS 2`).
  - m5 (the loader called without its try/catch STOP): **0 failed**. See N1.
- **Scope.** The serve test calls `Invoke-R19StepB` from the test's own scope. Live, the call goes through `Invoke-R19Row`'s `GetNewClosure` driver.
  - A pure-PowerShell probe that uses no repo file had the same shape: a function made by `. ([scriptblock]::Create(…))` at a `-File` script's top level, called through a closure driver inside a closure body. It printed `SERVE-OK` (evidence §5).
  - That is also the pattern of line 60 (Run 17's functions), which liveA20 already ran.

## 4. Static closure check (asked because F1 slipped past a green suite)
- **Method.** I used PowerShell's parser only (`[Parser]::ParseFile` / `ParseInput`; no file dot-sourced or run). The full script is in evidence §6.
  - **Load chain modelled:**
    - The entry's own dot-sources: `s12-r18-lib`, `s9-win`, `s11-win` (which dot-sources `s10-win`, which dot-sources `s9-win`), `s11b-win`, `s12-win`, `s12-win-b`, `s12-win-c`, `s13-r20` (which dot-sources `s12-r19-lib`, `-a`, `-c`), `s13-devt`, `s13-r20-c-defs`.
    - The parser loads: every function of `s11b-r17`, the three named functions of `s11b-r17b`, and the two of `s13-r20-b-defs`.
  - **Roots:**
    - every command of the entry, including `Register-R20Blocks` and `Register-R20CBlocks` and every block they install;
    - Run 17's `files`, `window`, `reload`, `console`, `teardown`, `root-add` and `rd-restore` blocks;
    - `r17b-0`.
  - **Call graph:** command names, plus the literal strings passed to `[scriptblock]::Create` (the leg handlers' `Read-R20CCtl`, `Open-R20CDevt`, `Close-R20CDevt` and `Read-R20CCheck`), plus `${function:X}` references.
- **Result.** 309 command names were reached, 269 of them repo functions. Only two names are undefined, and neither is a defect:
  - `Create` is the `[scriptblock]::Create` member, parsed as a command name: a false positive.
  - `Invoke-R20Pop3Cap` sits only in `New-R20PopSteps -Pop3` (`s13-r20.ps1:172-174`, slice B4's rows), which slice C never reaches.
  - **Control:** with the b-defs parser load removed from the model, `UNDEFINED Invoke-R20Serve (first called by Invoke-R19StepB)` appears. So the check would have caught F1.
- **Globals.** Every global slice C's blocks read is set before use:
  - `W`, `O`, `D`: the window block and `Load-S16`.
  - `R19Slice`: `Invoke-R19Slice`.
  - `R17Out`: `Invoke-R17Node`.
  - `R20Carry`: `s13-r20.ps1:202`, at load.
  - `R19Blocks`: the entry.
  - `R20DockFound` and the `R20C*` flags: c-defs at load, then `Register-R20CBlocks`.
  - `S16Pids['node']` and `S16Born['node']`, read by `Test-R20NodeAlive`: `Set-S16Pid`, inside `Invoke-R17Node` (`s11b-r17.ps1:85-86,123`).
  - `R19Xk`: never set in slice C, so it is `$null`. `Write-R20CDialogs` filters it out.
  - Script-level `$R17Blocks`, `$R17bZero` and `$R20CMark`: assigned at the entry's or the defs file's top level.
  - No top-level name of the entry (`$r20S`, `$r20N`, `$r20F`, `$r20K`, `$r20Serve`, `$r20Miss`) is read as a global by any helper (grep of `recipes/*.ps1`; #317).
- **The node side.** Every subcommand slice C sends exists:
  - In `s13-r20-c.ts`'s `cmds` table: `devt-undock`, `devt-early`, `up-devt`, `keep-4`, `sweep-held` (`--phase 1|2|close`), `gate-dock --dock` and `gate-cond --findings [--legs]`.
  - In `s13-r20.ts`'s `main`, through `lineCmd20`: `flag --value` and `dock --row R20-0C|R20-RESTORE --side [--found]`. On the RESTORE path a differing side exits 2 with `STOPWHY not-restored`. `Invoke-R17Node` turns that into "ended in a STOP", `Invoke-R19Node` returns 2, and `Restore-R20CDock` then calls `Stop-R19 'not-restored'`.
  - `s12-r19-c.ts dialogs`: unchanged. `Invoke-R17Node` writes only `$n` to its output, so `[int](Invoke-R19Node …)` at `s13-r20-c-defs.ps1:172` is a single value.
- **Limits.** The model checks only that a name is defined somewhere in the chain, not the definition order. Functions defined inside other functions at run time (for example `Install-R20StopKill`'s override) are not modelled. Neither gap applies to anything slice C calls.

## 5. §8 how-to against the code, end to end (fixer1 §5)
- **Command.**
  - `-Block liveC20|plan|teardown` and `-Att` match the `param` block.
  - `S11_OUT` and the fresh-folder rule match lines 34-41 and `Invoke-R19Main`'s two refusals (a record that already holds text; a globals file that already exists).
  - The background run and the 600 s tool cap: correct.
- **Prerequisites.**
  - 8081 only: the shared preflight.
  - The F3 sentence ("no DevTools window of the user's own, on any page") now matches `Get-R20CDevtCount` (`^DevTools`, every window but `$global:D`, through `Get-S13Titles`).
- **First record lines.**
  - MANIFEST, then LOADED20, then R20-0's remaining lines, then `ROW R20-0C PASS slice=C`: this is `Invoke-R20Zero … 'R20-0C'`.
  - Next comes `DOCK R20-0C side=…` (`dockLine`), then `CHECK gate-dock side-readable=yes` or the five `ROW … NOT RUN — dock side unreadable, it could not be restored` lines, then `FLAG debugging-flag=…` (`flagLine`). This matches the code.
- **Record path.** `S13-live-record-liveC20[-att<k>].txt`, from `Get-R19RecordName`. The other file names match the code too: `console-liveC20-<k>.txt` from `Get-R19CapName`, and `actors-liveC20.jsonl` from `s13-r20.ps1:251`.
- **The capture (F4).** As built:
  - R20-RESTORE leaves it out of the count.
  - `Invoke-R20Logs` saves it with `Save-R19Seg 'end'`.
  - It closes at teardown or at a STOP.
  
  The proposed dated note matches the code; the session agent places it.
- **STOP meanings.** The nine reasons equal `SLICE_C_STOPS` and §4.28's list for slice C. The hang texts (`no ready signal for serve within the bound (120 s)`, `serve exceeded its budget of 600 s`) are `Invoke-R20Serve`'s throws. Slice C passes `s = 600` and no `i`, so the idle bound is 120 s.
- **NOT RUN outcomes and resume/teardown.** These match `gateDock`, `gateCond`, the entry header and §4.28.
- **Exit codes.** These are wrong: see N4.

## 6. Findings (new in round 2)

**N1 MINOR: the entry's STOP for a missing serve function is not pinned by any test.**
- Where: `recipes/s13-r20-c.ps1:64`.
- The brief asks that a missing function STOP before any state change. The code does so.
- But mutant m5 (`$r20Serve = Get-R20CServeDefs (…)` with no try/catch) leaves all 32 tests green (evidence §3). Without the catch, a missing function would end the script with a PowerShell error and exit 1, not the documented `STOP: …` and exit 2.
- Suggested fix: one text assertion in the entry-text test. It would check that the loader call sits in a `try` whose `catch` prints `STOP: the serve step's functions were not read` and `exit 2`.

**N2 NIT: the serve test does not go through the closure path.**
- Where: `recipes/test/s13-r20-c-ps.test.ts:174-185`.
- The test loads the texts and calls `Invoke-R19StepB` inside the `T` scope. The live path goes through `Invoke-R19Row`, `Invoke-R17Node`'s `GetNewClosure` driver, and then `Invoke-R19Steps`.
- My scope probe (§3) and the already-run Run 17 pattern cover this. No change needed.

**N3 NIT: F5's reason for not fixing is partly wrong.**
- The fixer says the readable-side order DOCK, CHECK gate-dock, FLAG is "as §4.28 … write[s] it".
- But §4.28's R20-0C expected-text cell (`docs/e2e-test-plan.md:1989`) lists `LOADED20 …`; `FLAG …`; `DOCK R20-0C …`, so it puts FLAG before DOCK. Only the slice order line ("R20-0C; `FLAG`; …") supports putting FLAG after the row.
- FLAG is a RECORD and changes no verdict, so leaving the code is fine. The session agent may want a dated note on which order is meant.

**N4 NIT: "3 not run" is a dead exit code.**
- Where: `recipes/s13-r20-c.ps1:8` and §8's "Exit codes".
- `Invoke-R19Slice` returns only 0 or 2 (`s12-r19-lib.ps1:205-217`). `Invoke-R19Main` refuses with 2. The entry's own STOPs exit 2.
- So 3 never occurs. A PowerShell crash would exit 1, which §8 does not mention.
- Shared with `s13-r20-a.ps1:7` and `s13-r20-b.ps1:9`, so it is for the session agent, not this slice alone.

## 7. Carried from round 1 (not this round's to fix)
- **F2** needs the session agent's ruling before liveC20. With an unread found side, the slice stops `not-restored` before R20-LOGS even though nothing changed.
- **F4's dated note** goes on §4.28.
- **F6 and F7** stay NITs.
- **The builder's finding 1** is still the session agent's: slices A and B print `DIALOGS liveA20` / `DIALOGS liveB20`, where §4.28 writes `DIALOGS B …`.

## 8. Handoff
- Accept with N1 as an optional one-line test.
- Nothing is running. The mutant copies and probe files are in the session scratchpad, outside the repo.
