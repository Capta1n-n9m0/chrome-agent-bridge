# S1-helpers-c builder: Run 18's block runner

Model and effort: Claude Sonnet 5.5, medium. Not run against Chrome, a daemon or a port.

## 1. Verdict
DONE.

## 2. Outputs
Files (all new, none committed; for the committer):
- `recipes/s12-r18.ps1` (188 lines, 171 code): the entry script. `-Block liveA18 | liveB18 | plan | teardown`.
- `recipes/s12-r18-lib.ps1` (162 lines, 135 code): order lists, sequencer, STOP/restore, verdicts, R18-0, early toggle read.
- `recipes/test/s12-r18.test.ts` (233 lines): PowerShell scenarios with stubbed helpers.
- `recipes/test/s12-r18-static.test.ts` (137 lines): static ties to section 4.26 and to the helper files.
Size: code 306 of the 400 cap (non-comment, non-blank lines), tests 370 of 600.

Numbers (commands run here):
- `npx vitest run recipes/test`, before: `Test Files 52 passed (52)`, `Tests 1131 passed (1131)`. After: `54 passed (54)`, `1170 passed (1170)` (+39).
- `npm test`: `Test Files 210 passed (210)`, `Tests 4964 passed (4964)`. `npm run typecheck`: no output, exit 0. `npm run build`: `built extension → dist/`, `git status --short` shows no tracked change.
- `npx tsc --noEmit -p` on all 7 `recipes/tsconfig*.json` (`.fe .s10 .s11 .s11b .s6 .s9` and `tsconfig.json`): exit 0.
- Both `.ps1` files parse with 0 errors and are ASCII (tests). Loading smoke: the runner's load section run alone read 49 Run 17 blocks, `r17b-0` and `Invoke-S12Opt` (outside the repo, no Chrome).
- Red on a stub runner: each of the four groups (`seq`, `restore`, `zero`, `rows`) has an "every check is red on a stub runner" test (a lib whose functions do nothing); all pass, so every check fails on the stub. Green: "every check holds on the real lib". Mutants (18) each turn a named check red: restore skipped on throw, restore skipped on a STOP line, failed restore not a STOP, a second restore inside the restore, list check skipped, warned list dropped, list check moved after the read, tree check dropped, STOP line not ending the slice, rows moved out of order (A and B), gate rows lost, unreadable toggle passing, no stamp after a process, violations not summed, STOP inside a row still printed, worst verdict lost.

Design: sequencing and STOP logic is in the lib (`Invoke-R18Slice`, `Invoke-R18Block`, `Stop-R18Wave`, `Invoke-R18Zero`, `Test-R18Lists`, `Read-R18Early`, `Invoke-R18RowBlock`, `Get-R18Verdict`, `Get-R18CtlArgs`). The entry reads Run 17's and Run 17b's functions and blocks with the PowerShell parser (as `s11b-r17b.ps1` does) and reuses `files`, `window`, `reload`, `console`, `teardown`, `root-add`, `rd-restore` and `r17b-0`. Own blocks: preflight (ports 8081 and 9234 only), servers (8081 only), R18-UP-L1, R18-BANNER-CTL, R18-UP-OPT (`Invoke-S12Opt`), R18-UP-6, R18-SAVE-REFUSE (two `leg-line` calls, one `ROW`), the three F-RAW rows, UP-RACE-A (`s11b race --to-cap` with `Invoke-S12RaceA`), UP-DEVT (`s11b devt --slice liveB18 --row R18-UP-DEVT` with `Invoke-S12DevtRow`), restore, logs.

Helper entry points the runner calls, each checked by the static test to exist: `Assert-S12CaptureFree`, `Save-S12Console`, `Wait-S12Idle`, `Test-S12Idle`, `Invoke-S12BannerLeg`, `Invoke-S12Opt`, `Invoke-S12RaceA`, `Invoke-S12DevtRow`, `Assert-S12Patched`, `Set-S12AttachStamp` (s12-win.ps1); `Invoke-S11bSamplerPasses`, `Get-S11bOptObs`, `Get-S11bStopCause` (s11b-win.ps1); `Read-S11FileAccess`, `Restore-S11Safety`, `Test-S11Own` (s11-win.ps1); `Get-S9ById`, `Get-S9Options` (s9-win.ps1); `Invoke-R17Node`, `Invoke-R17Judge` and the rest of Run 17's functions (s11b-r17.ps1); `Start-R17bWatch`, `Read-R17bWatch`, `Set-S17Raw` and block `r17b-0` (s11b-r17b.ps1). Subcommands: `s11 foundcheck|setup|saverefuse-sdk|saverefuse-mcp`, `s11b raw-l1|bannerctl|bannerctl-judge|leg-line|clean-console|console-line|scan18|up6|raw|race|devt`.

What the runner prints itself in the record (tied to section 4.26 by test): `ROW <id> <verdict>[ slice=<A|B>]` for R18-0, -UP-L1, -UP-OPT, -UP-6, -SAVE-REFUSE, -F-RAW, -F-RAW-2, -F-RAW-DIR, -UP-RACE-A, -RESTORE, -LOGS (one each; both-slice rows carry `slice=`); `HEAD <12 hex> tree=clean`; `ROW R18-<row> NOT RUN — waits for G11-3` (five); `CHECK banner-clauses slice=<A|B> NOT MEASURED (R18-BANNER-CTL did not pass)`. R18-BANNER-CTL's `ROW` comes from `bannerctl-judge`, R18-UP-DEVT's from `devt`.

## 3. Verifier verdict
Not yet run.

## 4. Deviations
None from the brief. Interpretations, for the verifier:
- Prologue order is window, reload, console (Run 17b's proven order), not console before reload: a reload restarts the worker, so a console opened before it would lose its worker. The capture is opened before R18-0 either way.
- The `bc` tab is closed by a ledger block `r18-bc-close` just before R18-RESTORE ("at the slice's end"), not at the end of the control.
- R18-0 reuses `r17b-0`, so its record also gets Run 17b's `ROW R17B-0 (e)(f)` line beside `ROW R18-0 PASS slice=<A|B>`. Rows that use Run 17 ops print their old ids (`ROW UP-L1`, `ROW R17-UP-6`, `ROW F-RAW`, ...) beside the one `ROW R18-…` line, as Run 17b's carried path did.
- The committed console copy is the cleaned capture copied only after a passing `scan18 console` (`console-<slice>-evidence.txt` in the out folder); `redact-console` is not used (it scans with Run 17's rules).

## 5. Proposed decisions
None.

## 6. Findings
- Section 4.26 wording, no edit made: it says the console capture starts "before R18-0" and lists build and reload after it; only the reload-then-console order works (see Deviations).
- No helper gates a banner clause on its slice's control: `s11b up6`/`raw` judge `banner seen` as in Run 17. NOT MEASURED for the banner clauses is therefore applied by S1-record from the runner's `CHECK banner-clauses` line and the control's `ROW`.
- `s11b scan18` does not take the `--alias`/sock options Run 17's scan took; the runner passes none (Run 18 has no alias row).
- Unmeasured, as #346 says: whether UIA exposes an empty `uploadfolders-warned`. If not, R18-0 STOPs before any state change with `the option-page list uploadfolders-warned was not found`; the empty-list rule then needs a ruling.
- Not exercised: nothing in the entry's blocks ran against Chrome. The unit tests cover the lib only; the entry blocks are covered by the static checks.

## 7. Handoff (S1-live)
Start from a clean tree at a committed HEAD (this slice's files committed, the steps dir included). Nothing is running; no PIDs left.

Command sequence (agent-rules §8: run each slice in the background, it is longer than 600 s):
1. `npm run build`
2. liveA18: `$env:S11_OUT = "<fresh folder outside the repo>\a1"; powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\s12-r18.ps1 -Block liveA18` (the runner's `reload` block runs `recipes/reload-extension.ps1` itself, one re-run on exit 2, so no separate reload step). `-Block plan` prints both orders and runs nothing.
3. Exit 0 done, 2 STOP (restored first; run `-Block teardown` with the same `S11_OUT` before any re-run, because the globals file blocks the preflight), 3 not run.
4. liveB18 with its own `S11_OUT` folder (or the same one after A's teardown; the capture file names differ): same command with `-Block liveB18`. Toggle OFF: five `NOT RUN` rows, exit 3, liveB18 does not start.
5. An attempt after the first uses a fresh `S11_OUT` (a capture path holding text is a STOP).

Outputs: record lines `docs/plans/2026-10-27-step12-phase-f-steps/S1-live-record-liveA18.txt` and `…-liveB18.txt` (appended; the first line is R17B-0's `MANIFEST … BUILD …`); framing lines `<S11_OUT>\r18-framing.txt`; raw capture `<S11_OUT>\console-liveA18.txt` / `console-liveB18.txt` (cleaned in place of title lines); the scan-passed copy `<S11_OUT>\console-<slice>-evidence.txt` (commit as `S1-live-console-<slice>.txt`, `-att2` later); the daemon-log slice `<S11_OUT>\daemon-slice-<slice>.txt`. Untracked record files are not seen by the clean-tree guard.

STOP lines the runner itself can print (others come from the helpers it calls):
- `port <k> is held by a program the wave did not start (#251)`; `a dist file is missing; run npm run build first`; `a previous wave's globals exist; run -Block teardown first`; `Chrome is not running (it is never launched here)`; `python was not found`; `the tracked tree is not clean outside the steps dir` (Run 17's guard, preflight and end of R18-LOGS); `the fixture server on 8081 did not answer`; `port 8081 is not held by the wave's own server`.
- `R18-0 (g): the tracked tree is not clean outside the steps dir`; `R18-0 after a state change would overwrite the found texts; refused`; `R18-0: the option-page list <id> was not found (an empty list may not be exposed); nothing was changed`.
- `the file-URL toggle is unreadable; nothing changed`; `R18-BANNER-CTL: a leg printed no ANSWER or no violations CHECK line`.
- `the restore failed or printed a STOP during the stop procedure; the wave is over`; `the wave ended (<cause>)`.
- `STOP: Run 17's block <name> was not read from s11b-r17.ps1`; `STOP: Run 17b's r17b-0 block or the S12 helpers were not read` (load time, exit 2 without a restore: nothing changed yet).
- Printed through the helpers: the `IDLE` STOP, `Assert-S12CaptureFree`, the sampler tail, the devt and race STOPs, `Fail-S16` texts of the reused Run 17 blocks (window not pinned, reload exit, restore mismatch), and any `STOP:` from `s11`/`s11b` subcommands. Every `STOP:` line counted by `Show-S16` ends the block, restores if `S16Changed`, saves the slice's capture, ends own processes and returns exit 2.
