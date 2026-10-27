# S4-live runner 8: post-STOP scans and teardown

Model/effort: Sonnet, medium. Offline scans after attempt 7's row-level STOP (RD-BACK-EMPTY). These are a **post-STOP scan**, not the sheet's RD-LOGS row (which never ran).

## Verdict: DONE-PARTIAL (scans done, one STOP in the ledger scan, teardown printed STOP)

## 1. Capture folders (run1, 3, 4, 5, 6, 7)
`clean-console` on a copy `console-clean.txt` in each folder: "window-title lines dropped=3", exit 0, every run.

Deviation: the first pass ran with `S11_OUT` unset. The recipe's default is `bridge-e2e\s11`, not `s11b`, so it found no alias and every scan was NOT MEASURED (alias7). The scans were rerun with `S11_OUT` set to `%TEMP%\bridge-e2e\s11b`. The results below are from that rerun.

Every SCAN line read `://=0 (fixture 0, other 0) token=0 localhost:8085=0 aaaa...=0 bank.example=0 alias7=0 sock127=0 sentinel=0 profile=0`.

| Folder | console scan | daemon-slice scan |
|---|---|---|
| run1 | NOT MEASURED, no 'safety: disarmed by the user' line (exit 3) | PASS, all counts zero (exit 0) |
| run3 | NOT MEASURED, same cause (exit 3) | PASS (exit 0) |
| run4 | NOT MEASURED, same cause (exit 3) | PASS (exit 0) |
| run5 | NOT MEASURED, same cause (exit 3) | PASS (exit 0) |
| run6 | NOT MEASURED, same cause (exit 3) | PASS (exit 0) |
| run7 | **PASS**, all counts zero (exit 0) | PASS (exit 0) |

No pattern found in any capture. Earlier consoles hold no disarm control line, as expected.

## 2. Committable files, `scan --what other`
All PASS (all counts zero, exit 0), with `://` counts that are all fixture: run1-record 0, run3A 0, run4A 2, run5A 3, run6A 3, run7A 11, runner1-7 0.

**STOP: `S4-live.ledger.md` printed `profile=1`, "RD-LOGS STOP", exit 2.** Line 12 holds a real profile path (a `C:\Users\<user>\AppData\Local\Temp/s4live-build.log` reference). It is the same line that matches both `aliev` and `AppData`. I made no edit (lane). It must be changed to a label such as `<PROFILE>` before the ledger is committed.

Counts of `aliev` / `AppData` (line numbers):
- ledger: aliev line 12; AppData line 12.
- run1-record: AppData line 36. run3A: line 45. run4A: line 65. run7A: line 470. All four are the label form `<PROFILE>\AppData\Local\Temp\bridge-e2e\s11b\console.txt`, which holds no user name. The scan passes them, but the repo is public, so the user may want the `\AppData\...` tail dropped.
- runner4: aliev line 40, a prose "grep for `<user>`" sentence. runner5: AppData line 37, the same kind of prose ("no user-name/AppData match").
- run5A, run6A, runner1, 2, 3, 6, 7: no hit.

## 3. Evidence copy
Run7's console scan passed. `redact-console` printed "CONSOLE chrome-blocked lines redacted=0" (exit 0). The copy `S4-live-run7A-console.txt` (1376 lines) is kept: its `--what other` scan was all zero and PASS, and it has 0 hits for `aliev`/`AppData`. It is untracked and not committed.

## 4. Teardown
`s11b-r17.ps1 -Block teardown` exit 2.
- `BLOCK teardown start`
- `STOP: teardown refused: the safety state is not restored (RD-RESTORE has not passed)`
- The script's own stop procedure then opened a check window (46858822) on `options.html` and closed it. It also printed `STOP: window 4393762 is not one this wave opened (toolbar button) - nothing sent to it` and `STOP: the restore failed or printed a STOP during the stop procedure; the wave is over`, then `STOP: the wave ended`.

This is a Chrome touch my brief said would not happen. It was the script's stop path, not an action of mine. Nothing was pressed, per the output ("nothing sent to it"). Per the brief I stopped after the STOP.

`r17-globals.clixml` is **still present** in `%TEMP%\bridge-e2e\s11b` (not removed). The run1, 3, 4, 5, 6, 7 folders are intact. RD-RESTORE never passed in this wave, so teardown refuses by design. Runner7 says the restore was read back equal, but the sheet's RD-RESTORE row did not run, so the teardown guard is not satisfied. A session-level ruling is needed.

## 5. Final check
- `netstat -ano` shows nothing LISTENING on 8081-8091.
- The only match for a wave process by command line (`s11b` / `s9-redirect`) was one `powershell.exe`, PID 23164. It is almost certainly my own query shell. I killed nothing, and I did not touch `chrome.exe` or the daemon.

## Files
- `docs/plans/2026-10-26-step11b-block-list-redirects-steps/S4-live-runner8.md` (this file)
- `docs/plans/2026-10-26-step11b-block-list-redirects-steps/S4-live-run7A-console.txt` (new evidence copy, untracked)
