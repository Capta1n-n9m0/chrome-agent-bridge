# S1-helpers-c fixer (round 1 of 3): Run 18's block runner

Model and effort: Claude Sonnet 5.5, medium. Nothing drove Chrome, the daemon or port 9234 (the only runner invocation was `-Block plan`; a load smoke of the reused blocks ran in the scratchpad).

## 1. Verdict
DONE. F1-F10, n2 and n5 are fixed and red-proven. n1, n3, n4, n6, n7 untouched (not in the brief).

## 2. Outputs
- `npx vitest run recipes/test`: before (builder/verifier) 54 files, 1170 passed; after 54 files, **1201 passed** (+31).
- `npm test`: 210 files, **4997 passed**. `npm run typecheck` exit 0. `npm run build` ok. All seven `npx tsc --noEmit -p recipes/tsconfig*.json`: exit 0.
- Both `.ps1`: 0 parse errors (PS 5.1 parser), ASCII, no `SilentlyContinue`, `&&`, `??`.
- Size (non-blank, non-comment lines): code 84 + 262 = **346** (cap 400); tests 344 + 144 = **488** (cap 600).
- Files (all uncommitted): `recipes/s12-r18.ps1` (100 lines), `recipes/s12-r18-lib.ps1` (297), `recipes/test/s12-r18.test.ts` (356), `recipes/test/s12-r18-static.test.ts` (152).

## 3. Findings, one by one
**A bug the F1 tests exposed.** `Invoke-R18Raw` took `$Row`, and `Invoke-R18Banner` has a `$Row` of its own, so the F-RAW call ran `raw --row R18-F-RAW` (dynamic scope) instead of `--row F-RAW`. Fixed: `Invoke-R18Raw` now uses `$RawId` (lib:183-185). Red proof: the check "F-RAW rows wait for the idle before their call" failed on the real lib until the rename.

**F1.** The row-block bodies moved from the entry into the lib as functions: `Invoke-R18Banner`, `Invoke-R18Raw`, `Invoke-R18Up6`, `Invoke-R18UpL1`, `Invoke-R18BannerCtl`, `Invoke-R18UpOpt`, `Invoke-R18SaveRefuse`, `Invoke-R18UpRaceA`, `Invoke-R18UpDevt`, `Invoke-R18Restore`, `Invoke-R18Logs`, `Invoke-R18Main` (lib:~150-260). The entry only maps a name to one call (`s12-r18.ps1:67-80`; a static test pins each mapping, that the entry runs no `Invoke-R17Node`, and `exit ([int](@(Invoke-R18Main $Block)[-1]))`). New `blocks` scenario group in `s12-r18.test.ts` (stubs for `Wait-S12Idle`, `Test-S12Idle`, `Invoke-R17Node`, ...). Verifier mutants, applied in memory to a copy of the lib text by the test (nothing in the tree), each turns a named check red (vitest "mutant ... turns ... red", all passed):
- E1 (IDLE guard not stopping): red on "banner row, not idle: no call is sent and the block throws".
- E2, E2b (F-RAW skips the banner wrapper): red on "F-RAW rows wait for the idle before their call" and "... send nothing when not idle".
- E4 (control without `Wait-S12Idle`): red on "the control waits for the idle before its first leg and passes".
- E7 (UP-OPT no `S16Changed`), E9 (UP-RACE-A no `S16Changed`): red on the two "sets the state-change flag before its first call" checks.
- E11 (no `rd-restore` call): red on "R18-RESTORE calls the restore, stamped, and prints its row".
- E10 (`exit 0`): a static test (exact `exit ([int](@(Invoke-R18Main $Block)[-1]))`); checked by a node one-liner on the entry text: real contains the line = true, the E10 mutant = false (an `exit` cannot run in a unit scenario).
- Every new check is also red on the stub lib (STUB_LIB gained no-op versions of the new names).

**F2.** `Get-R18BannerVerdict` (lib:~45) and `-Banner` on `Invoke-R18RowBlock`; `$global:R18Ctl` is `PASS`/`FAIL`, set by `Invoke-R18BannerCtl`, reset (empty = not run) at slice start. When the control is not `PASS` and the row's verdict is FAIL and every non-PASS CHECK line is `banner seen` or `the banner window was not sampled`, the line reads `ROW R18-UP-6 NOT MEASURED (banner clause: R18-BANNER-CTL did not pass) slice=A`; any other non-PASS clause keeps FAIL; a PASS or a passed control is unchanged. Banner rows (R18-UP-6, -F-RAW, -F-RAW-2, -F-RAW-DIR) now always print `slice=<A|B>` (the brief's example form). Tests: bvOnly/bvNoCtl/bvOther/bvCtlPass/bvPass, and end to end rawNm/rawFail/rawCtlPass/up6Nm. Mutants (control not kept, rule never applies, any failure counts, passed control still converts, F-RAW or UP-6 not a banner row): all red.

**F3.** `Set-R18Reused` wraps `files, window, reload, console, teardown, root-add` in `Invoke-R18Stamped` (stamp in a `finally`); `r18-0`'s `r17b-0` and `rd-restore` run stamped too; `R18-UP-DEVT`'s `s11 setup` goes through `Invoke-R18Node`. Tests "a reused block runs stamped" and "R18-UP-DEVT s11 setup goes through the stamping wrapper"; mutants red. The "same S11_OUT" option is gone from the handoff.

**F4.** The handoff line is a Git Bash line (header comment `s12-r18.ps1:5` and Handoff below). Both probes use `-ErrorAction Ignore` (python probe `:71`; static test pins the text, and that no `-ErrorAction Stop` remains).

**F5.** `-Att <n>` (entry param); `Get-R18RecordName` gives `S1-live-record-<slice>.txt` and `...-att<n>.txt` from 2; `Invoke-R18Main` STOPs (`the record file already holds text; give this attempt its own -Att`, exit 2) before anything else. Tests: "the record file is named per slice and attempt", "a record that holds text is a STOP before anything else"; both mutants red. Teardown skips the record and globals guards.

**F6.** `Invoke-R18Logs` copies the slice's record lines to `<S11_OUT>\rows18-<slice>.txt` (outside the repo; `rows18` reads only there) and runs `s11b rows18 --from` it, last. A WARN is recorded, not a STOP. Red when the call is removed.

**F7.** `EVIDENCE console copy written (scan passed)` / `... not written (scan not passed)`. Red on the old key.

**F8.** R18-UP-L1 and R18-SAVE-REFUSE print `CHECK <row> console-clause pending R18-LOGS` at their own time and keep their verdict (`Set-R18Pending`); `Write-R18Pending` prints their `ROW` right after R18-LOGS' row: UP-L1 with R18-LOGS NOT MEASURED or not run -> `FAIL (console clause not met: ...)`; SAVE-REFUSE with NOT MEASURED -> `NOT MEASURED (console clause: ...)`; else their own verdict. A STOP before R18-LOGS never flushes (test "a STOP before R18-LOGS prints neither deferred row"). Mutants (no defer, UP-L1 rule, SAVE-REFUSE rule, flush after a STOP): red.

**F9.** `STOP-ALL` asserted in `throwNoChange` and `throwChanged`; two mutants (no `Stop-S16All`, both stop paths) red (V8).

**F10.** `Invoke-R18Main` tests `$GlobalsFile` before `Load-S16`: STOP `a previous wave's globals exist; run -Block teardown first`, exit 2, nothing done (test: no `LOADED`, no block, no restore). The old preflight copy of the check was removed (it came after the load). Mutant red.

**n2.** `Test-R18Lists` sets `$env:S9_RAW = $Record` before its STOP; test "the missing-list STOP also reaches the record file"; mutant red. **n5.** The load-time `Get-Command Invoke-S12Opt` uses `-ErrorAction Ignore`, so the STOP line prints and the exit is 2 (static test).

## 4. Deviations
None. One choice: banner rows print `slice=` always (F2's example), where the builder printed it only for rows run in both slices.

## 5. Proposed decisions
None.

## 6. Findings
- The `$Row` shadowing above is a measured PowerShell dynamic-scope fact: a nested block run inside a function sees that function's parameter before the caller's variable of the same name. It is the same trap as the `$o`/`$global:O` one in `recipes/CLAUDE.md`; name block-local variables with distinct names.
- `Invoke-R18Main` runs the preflight's globals check once, at process start; a mid-wave `Save-S16` is never mistaken for a previous wave's file.

## 7. Handoff (supersedes the builder's §7)
Start from a clean tree at a committed HEAD (this slice's files committed). Nothing is running; no PIDs.

Commands (Git Bash; each slice in the background, it is longer than 600 s; each slice and each attempt gets a fresh `S11_OUT` outside the repo):
1. `npm run build`
2. liveA18: `S11_OUT=<fresh dir>/a1 powershell.exe -NoProfile -ExecutionPolicy Bypass -File recipes/s12-r18.ps1 -Block liveA18` (the `reload` block runs `recipes/reload-extension.ps1` itself). `-Block plan` prints both orders.
3. liveB18: `S11_OUT=<another fresh dir>/b1 powershell.exe ... -Block liveB18`. Toggle OFF: five `NOT RUN` rows, exit 3.
4. Exit 0 done, 2 STOP (restored first; run `-Block teardown` with the same `S11_OUT` before the next attempt), 3 not run.
5. A later attempt of a slice: a new `S11_OUT` and `-Att 2` (then 3): record file `S1-live-record-<slice>-att<n>.txt`.

Outputs: record `docs/plans/2026-10-27-step12-phase-f-steps/S1-live-record-<slice>.txt` (`-att<n>` after the first; the first line is R17B-0's `MANIFEST ... BUILD ...`); framing `<S11_OUT>\r18-framing.txt`; capture `<S11_OUT>\console-<slice>.txt`; scan-passed copy `<S11_OUT>\console-<slice>-evidence.txt` (commit as `S1-live-console-<slice>.txt`, `-att2` later); daemon slice `<S11_OUT>\daemon-slice-<slice>.txt`; rows18 input copy `<S11_OUT>\rows18-<slice>.txt`. In the record, R18-UP-L1 and R18-SAVE-REFUSE print their `ROW` after R18-LOGS' row, and the `CHECK rows n=<n> verdict=<v>` line (plus any `WARN`) is last.

STOP lines the runner itself can print (others come from the helpers it calls):
- Main: `the record file already holds text; give this attempt its own -Att`; `a previous wave's globals exist; run -Block teardown first`.
- Preflight: `a dist file is missing; run npm run build first`; `Chrome is not running (it is never launched here)`; `python was not found`; `port <k> is held by a program the wave did not start (#251)`; `the tracked tree is not clean outside the steps dir` (Run 17's guard, preflight and end of R18-LOGS); Assert-S12Patched and Assert-S12CaptureFree texts.
- Servers: `the fixture server on 8081 did not answer`; `port 8081 is not held by the wave's own server`.
- R18-0: `R18-0 (g): the tracked tree is not clean outside the steps dir`; `R18-0 after a state change would overwrite the found texts; refused`; `R18-0: the option-page list <id> was not found (an empty list may not be exposed); nothing was changed` (now also in the record).
- Gate and control: `the file-URL toggle is unreadable; nothing changed`; `R18-BANNER-CTL: a leg printed no ANSWER or no violations CHECK line`; the `IDLE` STOP of `Test-S12Idle` (any banner row).
- Stop procedure: `the restore failed or printed a STOP during the stop procedure; the wave is over`; `the wave ended (<cause>)`; `row <id> printed a STOP` / `block <name> printed a STOP` (thrown causes).
- Load time (exit 2, nothing changed): `STOP: Run 17's block <name> was not read from s11b-r17.ps1`; `STOP: Run 17b's r17b-0 block or the S12 helpers were not read`.
- Through the helpers: the sampler tail, the devt and race STOPs, `Fail-S16` texts of the reused Run 17 blocks (window not pinned, reload exit, restore mismatch), any `STOP:` from `s11`/`s11b`. Every counted `STOP:` ends the block, restores if `S16Changed`, saves the slice's capture, ends own processes and exits 2.
