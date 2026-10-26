# S5-runner builder report

Model: Sonnet 5.5, effort medium. UTC 2026-10-26 03:40Z to 03:52Z. Context use: about 150k tokens (estimate). Risk: low (recipes only).

## 1. Verdict
DONE. Nothing ran live: no daemon, no Chrome UIA, no reload, no server on 8081/8084; port 9234 untouched (0 listeners at 03:52Z).

## 2. Outputs (uncommitted)
- `recipes/s11-r16.ps1` 384 lines (`wc -l`, cap 500). ParseFile in Windows PowerShell 5.1: **0 errors**. ASCII only.
- `recipes/s11-r16-plan.ts` (109): row-to-block table, slice order, G11-3 gate, stop/restore decision, port rule, `scanR16` (the extended static scan).
- `recipes/s11-r16-opt.ts` (29): UP-OPT's judge. Gap found: `s11.ts` has no subcommand that judges `Invoke-S11Opt`'s observations (`optVerdict` is exported but unused), so this small CLI prints the CHECK/ROW lines from `optExpected` + `optVerdict`.
- `recipes/test/s11-r16-runner.test.ts` (29 tests). `recipes/tsconfig.s11.json` include list extended.
- `npm test`: 150 files / 3746 tests -> **151 files / 3775 tests**, all pass. `npm run typecheck` exit 0; `npm run build` ok; `npx tsc --noEmit -p` on recipes `tsconfig`, `.fe`, `.s6`, `.s9`, `.s10`, `.s11`: all exit 0.

## 3. Row to block map (sheet order; test parses section 4.23 and asserts it)
Block = row ID lowercased. Slices follow the sheet's Live column, so UP-0, UP-RESTORE and UP-LOGS are in both (the brief said "exactly one"; the sheet says A,B for these three).
- liveA: UP-L1 `up-l1`, UP-0 `up-0`, UP-OPT `up-opt`, UP-FA `up-fa`, UP-6 `up-6`, UP-7 `up-7`, SAVE-REFUSE-R `save-refuse-r`, SW-2 `sw-2`, UP-RESTORE `up-restore`, UP-LOGS `up-logs`.
- liveB: UP-0, `root-add` (no row), UP-1 .. UP-5 `up-1`..`up-5`, UP-6B `up-6b`, UP-8 `up-8`, UP-9 `up-9`, UP-PATCH `up-patch`, UP-TWICE `up-twice`, UP-RAW `up-raw`, UP-NAV `up-nav`, UP-DEVT `up-devt`, UP-STALE `up-stale`, UP-7J `up-7j`, UP-RACE-A `up-race-a`, UP-RACE-B `up-race-b`, UP-RESTORE, UP-LOGS.
- Framing blocks (write to `r16-framing.txt`, not the record): `preflight servers files window prestale reload setup console teardown`. UP-CLICK has no block (not run, #251).
- liveA = preflight, servers, files, window, reload, setup, console, rows, teardown. liveB adds `prestale` (the stale tab, opened before the reload) after `window`.

## 4. Command lines (run in the background: a slice exceeds the tool's 600 s cap)
- S5-liveA: `powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\s11-r16.ps1 -Block liveA`
- S5-liveB: `powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\s11-r16.ps1 -Block liveB`
- One block between rows: the same with `-Block up-6` etc. (globals persist in `$S11_OUT\r16-globals.clixml`; `teardown` removes them).
- Exit codes: 0 done (a failed CHECK is recorded, not a stop), 2 STOP, 3 not run (G11-3 gate).
- Run record: `docs/plans/2026-10-25-step11-file-upload-steps/S5-run-record.md` (UTF-8, rows only; framing blocks go to `$S11_OUT\r16-framing.txt`).

## 5. How the contract is met
- Checks first: `preflight` = globals absent, tracked tree clean outside the steps dir, dist files, Chrome running, python, 8081/8084 free and 9234 free or the daemon (command line names `daemon/dist/index.js`), HEAD printed. `servers` starts `python -m http.server 8081 --bind 127.0.0.1 --directory test-fixtures` and `python -I recipes\s11-csp.py 8084` under recorded PIDs (start time checked before any kill, `taskkill` only on those), then checks both answer, the ports are held by those PIDs, and the 8084 header. `reload` runs `reload-extension.ps1`, one re-run on exit 2, else STOP. `window` STOPs on an unpinned button.
- STOP handling: one printing function (`Show-S16`) takes every line (helpers' `Say9`/`Stop9` are redefined to go through it; user profile folder masked; each `STOP:` line counted). A block, step or node call that raised the count throws. The main catch runs `Stop-S16Wave`: after the first state change it restores (`Restore-S11Safety`, by hash), treats a false return, a throw or any STOP printed during it as a failed restore (prints a STOP), never restores twice, ends actor, windows, own PIDs, and exits 2. `up-restore` sets an in-restore flag so its own failure does not restore again.
- G11-3: `Test-S16Gate` refuses every block in `$NeedsAccess` (the 17 rows plus `root-add`) unless UP-0 read the toggle `on`; liveB runs `teardown` and exits 3, and `s11.ts found` has already printed the 17 `NOT RUN` lines. An unreadable toggle is a STOP.
- Tests: map against the sheet; ValidateSet, slice lists, framing and file-access lists tied to the plan; stop procedure run in PowerShell with stubbed helpers (STOP in restore, false, throw, clean, no change, in-restore); gate function run in PowerShell; static scan with planted leaks.

## 6. Findings and notes for the live slices
- `s11.ts` gap above (UP-OPT judge). No defect found in `s11.ts`, `s11-win.ps1` or the rules files; none edited.
- Static scan: `scanR16` runs `scanPs1Output` over the file (with `Fail-S16` treated as `Stop9`), requires exactly one vetted printing site and at most one vetted file-write site, and refuses `Get-S11FoundText`, `Get-S11Box`, `Get-S11Alias`, `Tee-Object`, `WriteAllText`, `AppendAllText`, `Write-S11Pressed`, `Out-File`, `Add-Content`, `Set-Content`, token names. The runner never touches the found texts itself.
- Untested until live: `Start-Process` with redirected output beside the UIA driver; `Open-S9ChromePage`/`Open-S9WorkerConsole` results used as window handles (D and E are closed only if `Test-S9Live` accepts them); UP-DEVT assumes `setup --only x` lands the tab in window X; `prestale` in liveB makes a tab stale relative to liveB's own reload, not a Step 10 content script if liveA already loaded the Step 11 build (record it as such).
- `up-logs` writes the daemon-log slice since the preflight mark with `WriteAllLines` to `$S11_OUT` (outside the repo) for `s11.ts scan`.
- Interactive PowerShell scoping: driver scriptblocks rely on dynamic scope (no `GetNewClosure`, which would hide script functions).

## 7. Deviations
- UP-0, UP-RESTORE, UP-LOGS appear in both slices (sheet), not "exactly one".
- Added `recipes/s11-r16-opt.ts` (not named in the brief; inside the `s11-r16*` lane).
