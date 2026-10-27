# S7-helpers H3 builder report (Step 11b)

Model: Sonnet 5.5, medium effort. No live run; nothing touched Chrome, the daemon or port 9234. Not committed.

## 1. Verdict
DONE (slice H3: all four build steps). About 540 new lines including tests (cap 600).

## 2. Outputs
New: `recipes/s11b-r17b.ps1`, `recipes/s11b-r17b-plan.ts`, `recipes/test/s11b-r17b-plan.test.ts`, `recipes/test/s11b-r17b-static.test.ts`.
Changed (additive): `recipes/s11b.ts` (`ctl --skip <ports>`), `recipes/s11b-rules.ts` (`judgeCtl` takes optional `skipped`, `ports` is Partial), `recipes/tsconfig.s11b.json` (three files added).

Numbers (commands run here): `npm test` 4639 passed, 189 files (before 4615 / 187; none removed). `npm run typecheck`, `npm run build`, and `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json` all exit 0. `-Block plan` runs offline (exit 0) and prints `PLAN liveA17B: ...` and `PLAN liveB17B: ...` in the sheet's order.

How it works:
- `s11b-r17.ps1` has a main, so it is not dot-sourced. The runner reads it with PowerShell's parser, defines its 49 top-level functions, and keeps its 49 `$Blocks` scriptblocks by name (checked offline: functions=49, blocks=49). Carried rows (UP-L1, RD-DL-SOCKET, UP-OPT, UP-6, UP-7, SAVE-REFUSE, F-RAW x5, UP-RACE-A, UP-DEVT, RESTORE, LOGS) and G1 open/close, root-add, files, window, reload, console, teardown run that logic; a `CARRIED <R17B id> as R17 block <x>` line pairs them. `s11b-r17.ps1` is untouched.
- Own blocks: preflight (ports 8081 8083 8085 8086 8087 8091 9234 and 8090 unbound; refuses if either `r17b-globals` or Run 17's leftover `r17-globals.clixml` exists), servers (no 8088/8089), r17b-0, r17b-ctl, r17b-act-ctl, r17b-back-noact, r17b-history, r17b-rd-2, r17b-newtab-plain, r17b-newtab-load, r17b-newtab-refused, r17b-back, r17b-fwd, r17b-back-samedoc, r17b-disarm, r17b-back-empty.
- R17B-0 collects its lines in a scratch file, then writes to the record first the joined line (`MANIFEST ...` + space + `BUILD ...`), then RULES/STATE/TOGGLE/FOUNDLIST/S6/TABWATCH/ROW lines.
- No NOT BUILT path (no `NotBuilt`, no `R17FwdNotBuilt`); a refused activated set-up `back` is a node exit 2, so the stop procedure runs. Histories are built on tabs opened by `New-R17Tab` (`S9 newtab --as`), `--activate` with the sheet's labels; R17B-FWD's first forward is `forward --times 2`; R17B-DISARM uses `Invoke-S11bPressAfterReply ... -ReplyFile (Join-Path $env:S11_OUT 'node-out.txt')` and reads G1's count as found + 1.
- G11-3: `Read-S17Early` after the preflight of liveB17B; OFF writes `ROW <id> NOT RUN <em dash> waits for G11-3` for the seven rows (dash built with `[char]0x2014`, the file stays ASCII) and exits 3; unreadable is a STOP.
- Tests: plan test (table order and Helper column, Live column, carried paragraph, both slice orders against "Slices and order", G11-3 branch, expected texts by key, first-line join, STOP phrases in the sheet, `ctl --skip`); static test (ValidateSet = plan, lists = plan, every Helper-column block exists, every STOP marker on a stopping line of the named block, no NOT BUILT, history/act-ctl/fwd forms, R17B-0 first line, G11-3 text, disarm form, ASCII, no URL/token/list text in an output line, parses, `-Block plan`).

## 4. Deviations
- `B17 ctl` got `--skip` (and `judgeCtl` an optional `skipped`): the existing op always probes 8088 and 8089, which Run 17b does not start, so R17B-CTL could not be driven otherwise. Default behaviour is unchanged (R17 tests pass).
- `scanR16` (Run 16's source scanner, used by Run 17's static test) is not applied to the new .ps1: it demands Run 17's vetted-site markers. The new test checks the same things directly (output lines hold no URL, token, `$Blk`, list text; Show-S16 is called only with the joined line and the filtered lines).
- Tests were written together with the code, not shown failing first.
- Record path is `S7-run-record.md` in the steps dir (the sheet names no file); change `$Record` if the wave sheet says otherwise.

## 5. Proposed decisions
None.

## 6. Findings (helper/sheet mismatches, none resolved by editing the sheet)
1. R17B-CTL says the 8085 counter uses tag `s11b=bctl`; `B17 ctl` hardcodes tag `ctl` (`HITS ctl redirect=0 blocked=1`). Run 17b keeps `ctl` (the 8085 log is the wave's own). Only the 8087 GET uses `bctl`.
2. `newtab-timed` cannot judge blocked/RULES (they are read after it): with everything else holding it exits 3 (NOT MEASURED). The runner combines that with its own hits and RULES reads and prints `ROW R17B-NEWTAB-LOAD-<i> ... (by n clause checks)`; the exit-3 still bumps the NOT MEASURED counter in the slice summary.
3. R17B-RD-2, NEWTAB-PLAIN and NEWTAB-REFUSED use `S9 call ... newtab` (the sheet's form), so there is no `LAT` line and `TABWATCH` carries no `reply-ms` for them; `reply-ms` is passed only for NEWTAB-LOAD (from its LAT). NEWTAB-PLAIN's "snapshot shows the playground heading" is read from the S9 call's output text and is NOT MEASURED if that output does not hold the heading.
4. Carried rows print their R17 ids in ROW lines (R17's blocks are run as they are); only the CARRIED line carries the R17B id. R17B-RESTORE's RESTORE/ROW lines are "RD-RESTORE".
5. R17B-NEWTAB-REFUSED: a changed tab-row count is a STOP (the sheet's STOP rule), though the row text calls it a failed row; the conservative reading was taken.
6. R17B-UP-L1's console clause depends on R17B-LOGS' SCAN as the sheet says; the runner does nothing extra.

## 7. Handoff
No processes or files left. The live wave needs a wave sheet/record file in the steps dir and the user's ruling on Step 11b's gate; the leftover `r17-globals.clixml` makes the preflight stop until Run 17's teardown (or a ruling) clears it.
