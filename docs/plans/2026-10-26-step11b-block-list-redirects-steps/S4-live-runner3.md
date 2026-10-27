# S4-live runner 3 (Run 17, attempt 3) - STOPPED in liveA, block f-filetab

Commit under test: 041ea89 (tree: ledger and run-record files only).

## Step 0 - teardown (exit 0)
- `BLOCK teardown start`
- `CHECK clean PASS: the wave folder and state.json removed`
- `TEARDOWN done: windows, wave files, servers (own PIDs) ended; globals removed`
- `BLOCK teardown done`
- r17-globals.clixml: gone (checked by listing). `%TEMP%\bridge-e2e\s11b\run1\` still there (not touched).

## liveA - exit code 2 (STOP)
Passed up to the STOP: preflight, servers, files, window, reload (reload-extension exit 0, attempt 1, `RELOAD OK`), console, rd0, r17-up-l1, rd-ctl, then f-filetab.
- RD-0 lines: `ROW RD-0 (a) PASS: dnrWithHostAccess=true, staticRuleSets=absent`; `ROW RULES PASS: RULES 0`; `TOGGLE reading on (candidates 1; on 1, off 0); nothing was pressed`; `STATE armed=true evaluate=true blocklist lines=0 sha256=e3b0c4...b855 uploadfolders lines=0 sha256=e3b0c4...b855`; `ROW RD-0 (c) PASS: armed, JavaScript on, the toggle reads on`; `ROW RD-0 (d) PASS: the found list blocks no fixture URL`; `CHECK UP-0 plan PASS: liveB runs; UP-FA not run - the toggle is on`.
- `ROW UP-L1 PASS: all checks hold`
- `ROW RD-CTL PASS: all controls hold` (`HITS ctl redirect=0 blocked=1`, `CTL 8091 flip 200 then 302`).
- F-FILETAB rows so far: `ROW F-FILETAB tabs hidden row PASS: the one hidden row is hidden=blocked with no url and no title` (rows=12 hidden=1); snapshot `DOMAIN_BLOCKED` and navigate `DOMAIN_BLOCKED` with the K-filepage text (2 ms each); `tabs2 ok ... hidden(blocked)=1`. Each F-FILETAB step also printed `NOT MEASURED: no ROW line for step <tabs|snap|nav|tabs2> in the call's output (nothing was read)` (see note).
- STOP lines (verbatim):
  - `STOP: s9.ts call: FAILED - Cannot read properties of undefined (reading 'includes') (at 2026-10-27T00:49:18.600Z)`
  - `STOP: the wave ended (an exception in block liveA (RuntimeException)) (at 2026-10-27T00:49:21.469Z)`
- Not run: F-FILETAB untouched/control rows, F-HOME, RD-CAPS-WARN, RD-1..RD-6, RD-RESTORE, RD-LOGS, teardown, everything after. No RD-RESTORE / RD-LOGS lines exist.

## Helper defect (reading, not a verdict)
Right after the `tabs2` row (the next call is `New-R17Tab 'F-FILETAB' 'ft' 'ftp'`, recipes/s11b-r17.ps1:491, an `s9.ts newtab`), the s9.ts process threw `Cannot read properties of undefined (reading 'includes')`. Suspect: `recipes/s9.ts:223` (`s.opened.includes(handle)` in `noteOpened`, called from s9.ts:333), where `s` is the loaded `state.json`. The shared `%TEMP%\bridge-e2e\s11b\state.json` has keys `alias, sentinel, tabs, files, found, toggle` and no `opened` (checked after the STOP), so `s.opened` is undefined. The earlier setup newtabs in the same run passed, so why only this one failed is not clear to me; the `found`/`toggle` write (rd0, 00:49:05) is the last writer I know of. node-err.txt is empty; node-out.txt holds only the STOP line. I did not fix anything.

## Safety state
The runner changed none: only reads (STATE armed=true evaluate=true, both texts empty, hashes as above). The STOP came before the first state change, so no restore ran and `-Block rd-restore` was not run (nothing to restore). Teardown did not run after the STOP: `r17-globals.clixml` and `state.json` are still in `%TEMP%\bridge-e2e\s11b` (a next attempt must run `-Block teardown` first). The stop handler closed its own windows (console, extensions, file window, W) and stopped the servers srv8081, 8083, 8085-8089, 8091. The worker console was written to `console.txt` (242 texts; not printed).

## liveB
Not run (liveA exited 2).

## Attempt-1 scans
Not run: they were due after liveA's RD-LOGS, which never ran. The run1 captures are untouched.

## Evidence files
None copied (RD-LOGS did not run).

## Records
`S4-run-record.md` renamed to `S4-live-run3A-record.md` (58 lines). The ledger and attempt 1 and 2 files are untouched.

## Process / port check
netstat: nothing on 8081-8091; no node process whose command line holds s11b. The SDK-spawned daemon may remain (9234).
