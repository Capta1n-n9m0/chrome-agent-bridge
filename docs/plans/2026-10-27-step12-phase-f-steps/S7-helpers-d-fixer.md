# S7-helpers-d fixer (round 1): Run 19's block runner (Sonnet 5.5, medium)

Fixed the verifier's F1, F2, F3, F5, F6 in the five `s12-r19*` files. F4 is left for the step report. Nothing live was run.

## 1. Outputs
- `npx vitest run recipes/test`: 1411 / 61 files before, 1433 / 61 files after. The 22 new tests are in `s12-r19.test.ts`.
- The seven `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json`: all exit 0.
- `npx vitest run recipes/test/s12-ps-c.test.ts` three times: 26 passed, 26 passed, 26 passed.
- `npm run typecheck`: exit 0.
- Lines now: `s12-r19.ts` 178, `s12-r19-lib.ps1` 242, `s12-r19.ps1` 99 (unchanged), code total 519; tests `s12-r19.test.ts` 292, `s12-r19-static.test.ts` 242 (unchanged).

## 2. Findings
- **F1 fixed.** Cause: the real `Invoke-R17Node` prints node's lines and throws on exit 2 or on exit 1 with no ROW/CHECK line.
  - `Invoke-R19Node` (lib) maps those two throws back to 2 and 1 (any other throw passes). R19-0, the old-build proof, `restore-head`, the re-proof, `daemonlog`, `scan-actors`, `rows19` and the scans are read as codes again.
  - R19-0 runs `proof` with `Show-S16` swapped for a collector, so `LOADED` is printed once, as the line right after `MANIFEST` (R7.2). A stale build prints its `LOADED` line and then `STOP old-build-left-loaded` ("the loaded extension is stale") with `restored=n/a`.
  - Pinned by `R19-0 real node: LOADED is printed once ...`, `... a stale build ...`, `... wrong counts ...`, `R19-ARGS-OLD real node`, `restore-head real node`, `re-proof real node`, `R19-LOGS real node` and `swap real node`.
  - `swap` (ts) catches the error, prints `SWAP failed: <message>` (no path in it) and exits 2, so M1's wording reaches the record. Pinned by the `swap real node` check and a source test.
- **F2 fixed.** The finally runs restore-head, segment save, reload, reopen and re-proof, each in its own `try`. Failures are collected, and any failure ends in one `Stop-R19 'old-build-left-loaded'`. `Invoke-R19Rerun` now returns a boolean. Pinned by `F2: a throw from the segment save ...` and `F2: a throw from the reload ...`.
- **F3 fixed.** A second suite loads the real `Invoke-R17Node` (read by `Get-R18Defs` from `s11b-r17.ps1`) with only `Start-Process` faked. It runs the entry's own registered block lines (`r19-0`, `r19-old-args`, `r19-old-version`, `r19-restore`, `r19-logs`, `closerprobe`, read from `s12-r19.ps1`). Every check is also run on a do-nothing stub lib (red there), and seven mutants of the lib turn their named checks red. Before-fix redness comes from those mutants (the unmapped-throw mutants are the pre-fix behaviour); the old lib was not kept.
- **F5 fixed.** `Test-R19UpOptReport` uses `git log -1 --format=%H -- <path>` (empty for a staged-only file). The test stub's `ls-files` now always lists the file; the mutant `a staged file counts as committed` turns `gate: R19-UP-OPT does not run ...` red.
- **F6 fixed.** The exit rule is the exported pure `proofExit`: only `UNKNOWN_METHOD` or `VERSION` is exit 2; `args=other`, an `ERROR` read and wrong counts are exit 1 (the R19-0 FAIL row). Pinned by `proofExit: only UNKNOWN_METHOD or VERSION is a STOP ...`.

## 3. Required mutants (re-run in the suite)
skipped restore on throw, swap without the finally restore, STOP without RETURN, row out of order, UP-OPT without the report: each turns its named check red.

## 4. Handoff: STOP reasons as the runner now prints them
- `old-build-left-loaded`: R19-0 stale (`consoleMessages=UNKNOWN_METHOD` or `args=VERSION`, before any state change, `restored=n/a`); in an old-build slice, any failed step of the finally (restore-head, segment save, reload, reopen, re-proof).
- `text-leak`: R19-LOGS, after its ROW lines and `rows19`, when a scan, `daemonlog` or the console scan returns 2.
- `dialog-left-open`: CLOSERPROBE leaves a dialog open.
- `throw-after-state`: any other throw (a failed swap, a row that prints a guard STOP, an exception); `restored=n/a` when no state changed.
- R19-0 with wrong counts or `args=other` is `ROW R19-0 FAIL`, not a STOP.
- Not seen in this slice (no driver): `attach-after-disarm`, `attach-on-refused-page`, `kept-session-used`, `dialog-not-opened`, `outside-file-reached-page`, `args-ran-js-off`, `existing-tool-changed`, `devtools-left-open`, `not-restored`.

Scratch (outside the repo): `edit1.py`, `edit2.py` in the session scratchpad. No commit made.
