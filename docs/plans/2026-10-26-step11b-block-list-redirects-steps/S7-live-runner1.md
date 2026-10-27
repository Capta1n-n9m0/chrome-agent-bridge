# S7-live runner 1 report (Run 17b, live)

Model: Sonnet, effort medium. Date 2026-10-27.

## 1. Verdict: DONE-PARTIAL (a STOP returned in liveA17B; liveB17B not started)

## 2. Outputs
- Preconditions: HEAD 32a9e25, tracked tree clean (only the untracked S7-live ledger), ports 8080-8099 and 9234 free, r17-globals.clixml absent.
- `npm run build`: exit 0; tracked tree still clean afterwards.
- `S11_OUT=%TEMP%\bridge-e2e\s11b-r17b`. liveA17B log: `%TEMP%\bridge-e2e\s11b-r17b\liveA17B.log`; exit code **2** (STOP). liveB17B: not run (rule: no re-run past a STOP).
- Record (moved, not copied): `docs/plans/2026-10-26-step11b-block-list-redirects-steps/S7-live-run1A-record.md` (untracked). No run1B record.
- Worker-console capture `%TEMP%\bridge-e2e\s11b-r17b\console.txt` is not a redacted copy (helper wrote it raw, 197 texts); not copied into the repo.

## 3. §4.25 rows
The reload ran (reload-extension.ps1, no exit-2 re-run needed); the wave then stopped inside R17B-0 (c), before (d)-(f). The record's first line is `MANIFEST dnrWithHostAccess=true staticRuleSets=absent` only: the joined `BUILD` text (D7.2) was never produced.

| Row | Result |
|---|---|
| R17B-0 | partial: `ROW RD-0 (a) PASS`, `ROW RULES PASS: RULES 0`, `TOGGLE reading on` (log); (b)-(f) and the joined first line NOT REACHED; no `BUILD`, no `S6 commit` line, no behavioural proof. No verdict word for the row |
| All other liveA17B rows (R17B-UP-L1, CTL, ACT-CTL, BACK-NOACT, RD-2, NEWTAB-PLAIN, NEWTAB-LOAD, BACK, FWD, BACK-SAMEDOC, DISARM, NEWTAB-REFUSED, BACK-EMPTY, RD-DL-SOCKET, UP-OPT, UP-6, UP-7, SAVE-REFUSE, RESTORE, LOGS) | NOT RUN: the wave stopped at R17B-0 |
| liveB17B rows (F-RAW, F-RAW-2, F-RAW-DIR, F-RAW-ENC, F-RAW-OK, UP-RACE-A, UP-DEVT, RESTORE, LOGS) | NOT RUN: liveB17B not started after the STOP (the toggle read `on`, so the G11-3 branch would not have applied) |

## 4. STOP lines (block liveA17B, block r17b-0 step (c))
`STOP: the wave ended (an exception in block liveA17B (ParameterBindingArgumentTransformationException; message withheld (id ParameterArgumentTransformationError,Test-S11Own))) (at 2026-10-27T06:43:00.330Z)`

Likely helper defect (not fixed, not verified): the exception comes right after `window 12389844 closed` (the toggle-check window `$E2`), so the next call is `Use-S16Options` in `recipes/s11b-r17.ps1:308`, `Test-S11Own $global:O` (`recipes/s11-win.ps1:104`, parameter `[long]$Hwnd`). `$global:O` apparently holds a value that does not bind to `[long]` (an array or non-numeric value; it comes from the persisted globals or from `Open-S11Window` output). The same path ran in Run 17, so a r17b-specific global setup (r17b-0's `$global:O`, or the `Persist` list at `s11b-r17b.ps1:49`) is the suspect. The step agent decides.

## 5. Restore
No safety state was changed before the STOP (no save, no list or folder edit; the block was still reading the found state). Post-STOP read via `s9.ts call X st status`: `armed=true evaluate=true blockedCount=0 extensionConnected=true`. The helper's own RESTORE read-back line was not printed (nothing to restore; r17b-restore never ran). Count and hash equality to R17B-0's found record was therefore NOT MEASURED (no found record was saved).

## 6. Scan
`s9.ts scan-file --mode committed` on the record: `://=0, token=0, CHECK SAFE-10 PASS`. No profile path in the record (the helper printed `<PROFILE>`). No console copy handed over. This report was written without the token, list text, real URLs or profile paths.

## 7. Processes
- The wave's six fixture servers (8081, 8083, 8085, 8086, 8087, 8091) were stopped by the helper's own teardown; ports 8081-8099 free afterwards (netstat).
- The helper closed its three own windows. No chrome.exe action by me.
- Left running: the daemon (PID 28660, port 9234), which the SDK client spawned detached by design; I did not stop it. The Chrome extension is the S6 build as reloaded by the helper (reload card found; no behavioural proof taken).
- Wave leftovers in `%TEMP%\bridge-e2e\s11b-r17b\` (including `r17b-globals.clixml`, which the next run's preflight refuses until removed per the root CLAUDE.md note).
- Ledger file `S7-live.ledger.md` was not edited by me.
