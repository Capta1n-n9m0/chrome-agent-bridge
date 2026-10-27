# S4-live runner 6 (attempt 6), report

## Step 0 (teardown)
```
2026-10-27T02:07:37.723Z s9-win: BLOCK teardown start
CHECK clean PASS: the wave folder and state.json removed
2026-10-27T02:07:38.256Z s9-win: TEARDOWN done: windows, wave files, servers (own PIDs) ended; globals removed
2026-10-27T02:07:38.258Z s9-win: BLOCK teardown done
```
Exit 0. r17-globals.clixml gone after it. run1, run3, run4, run5 preserved (teardown removed none).

## liveA: exit 2 (STOP in block `history`)
Output: %TEMP%\s4live-run6-liveA.out. Record renamed to S4-live-run6A-record.md (0 lines match the user name).

STOP line, verbatim:
`STOP: unexpected BridgeError INTERNAL at=back 1 "Cannot find a next page in history."`
preceded by `HISTORY back built navigations=2 backs=0`; set-up rows `HIST setup-hb` and `HIST setup-hf` PASS (tabs 12 to 13, 13 to 14).
Then: `WAVE stopping: an exception in block liveA (RuntimeException: node s11b history ended in a STOP)` and
`STOP: the wave ended (an exception in block liveA (RuntimeException: node s11b history ended in a STOP)) (at 2026-10-27T02:08:54.212Z)`.
Same block and same family of failure as attempt 5 (its history set-up now reaches the first `back` and Chrome answers
INTERNAL "Cannot find a next page in history"). Helper defect candidate: the history block's back step in recipes/s11b.ts
(set-up built the history, but the tab had no entry to go back/forward to); the step agent decides.

Rows before the STOP, as the record prints them:
- RD-0 (a) PASS (dnrWithHostAccess=true, staticRuleSets=absent); RULES PASS (RULES 0); RD-0 (c) PASS: armed, JavaScript on, the toggle reads on; RD-0 (d) PASS (found list blocks no fixture URL)
- RD-0 toggle: `TOGGLE reading on (candidates 1; on 1, off 0); nothing was pressed`
- UP-L1 PASS; RD-CTL PASS (all controls hold; four concurrent legs 302/302)
- F-FILETAB: tabs PASS, hidden row PASS, snapshot PASS, navigate PASS, untouched PASS, control PASS
- F-HOME PASS; RD-CAPS-WARN PASS
- RD-REGEX: REGEX bank443-schemes / bank443-explicit / h119 / h120 / h121 all supported=true (no PASS row printed before the STOP)
- Not reached: HIST rows, RD-1, RD-2, RD-3 (incl. control leg), RD-4, RD-6 (no HITS lines), RD-RESTORE, RD-LOGS and the rest.

## State read-back
Last STATE line (02:08:44): `armed=true evaluate=true blocklist lines=0 ... uploadfolders lines=0 ...` (hashes e3b0c442... the empty-text hash, equal to the saved globals). Every options-box edit was "typed, NOT saved" and reverted ("TYPED ... reverted; stored equal"). No state change was saved, so no restore ran and rd-restore was not run (as in attempt 5). RD-RESTORE and RD-LOGS did not run.

## liveB
Not run (liveA exited 2). Toggle read on, but liveB is conditional on liveA exit 0.
r17-globals.clixml REMAINS in %TEMP%\bridge-e2e\s11b (liveA's STOP path does not run teardown; the dir also holds state.json, found/, wave/, console.txt). The step agent decides on `-Block teardown`.

## Earlier-attempt scans
Not run: they were ordered after liveA's RD-LOGS, which did not run. The captures in run1/run3/run4/run5 are untouched.

## Evidence copies
None (RD-LOGS scan did not run; no S4-live-run6A-console.txt / run6B-console.txt written).

## Process/port check
netstat: nothing listening or connected on 8081 to 8091. The runner stopped its own servers (srv8081, 8083, 8085 to 8089, 8091) and closed its four windows. No runner or server process of mine left. The SDK daemon may remain.
