# S4-live runner 1 (Run 17, liveA) — STOPPED at F-FILETAB

Commit under test: 723b63c. `-Block plan` printed the sheet's order (liveA 41 steps, liveB 19). liveB did NOT start: liveA stopped before it could be decided to run (RD-0 did print `TOGGLE reading on`, so liveB would have been allowed; the step agent decides).

## liveA — exit code 2 (STOP)

Rows as the record prints them:
- RD-0 (a) PASS: dnrWithHostAccess=true, staticRuleSets=absent (first line of the record: `MANIFEST dnrWithHostAccess=true staticRuleSets=absent`)
- RULES PASS: RULES 0
- RD-0 (c) PASS: armed, JavaScript on, the toggle reads on
- RD-0 (d) PASS: the found list blocks no fixture URL
- UP-L1 PASS: all checks hold (FOUNDCHECK root=not outside=not; build, raw-root, raw-outside each PASS)
- RD-CTL PASS: all controls hold (302 pairs 15/12, 3/4, 3/3, 4004/4004 ms; `CTL 8091 flip 200 then 302`; `HITS ctl redirect=0 blocked=1`)
- F-FILETAB: `tabs` call: total=13 hidden(disarmed)=0 hidden(blocked)=2; `ROW F-FILETAB tabs hidden row NOT MEASURED: 2 hidden rows, not exactly one`. Later steps of the row did not run.
- Not run (after the STOP): F-HOME, RD-CAPS-WARN, RD-REGEX, G1 rows, RD-4 ... R17-SAVE-REFUSE, RD-RESTORE, RD-LOGS.

RD-0 lines: `STATE armed=true evaluate=true blocklist lines=0 uploadfolders valid=0 invalid=0` / `TOGGLE reading on` / `FOUNDLIST blocks-fixtures=no`. Found state: both boxes empty (hash is the empty-text sha256).

STOP line verbatim (block liveA, row F-FILETAB):
`STOP: s9.ts call: FAILED — SET-UP: expected exactly 1 listTabs row hidden "blocked", found 2 (at 2026-10-27T00:35:51.720Z)`
then `STOP: the wave ended (an exception in block liveA (RuntimeException)) (at 2026-10-27T00:35:54.797Z)`.

Reading (not a verdict): 13 tabs listed, 2 hidden as blocked; one is the wave's own `file:` tab, the other is a second `file:`/own-page-class tab that was already in the browser (a tab I did not open; not named here). The sheet's "exactly one hidden row" set-up cannot hold while that tab exists. The step agent decides.

State: the wave made no safety-state change before the STOP (RD-0 and UP-L1 are read-only; G1 and the typing rows never started), so no restore ran and none was needed; the runner printed no RESTORED line. No read-back line was printed because nothing was changed. Not read back by me (I may not run blocks outside liveA/liveB/plan/rd-restore; I did not run rd-restore as nothing was touched).

RD-LOGS: not run. D4.3 numbers (RD-1, RD-2, RD-3, RD-4, RD-6 blocked hits): none, rows did not run. RD-RESTORE: not run.

Evidence copied into the steps dir: none (RD-LOGS did not scan; raw console.txt stays in %TEMP%\bridge-e2e\s11b). The runner wrote `S4-run-record.md` (untracked) in the steps dir.

## liveB
Not started. (If it had been judged not to run: `NOT RUN — waits for G11-3` for F-RAW, F-RAW-2, F-RAW-DIR, F-RAW-ENC, F-RAW-OK, R17-UP-RACE-A, R17-UP-DEVT — but the toggle read on, so that line does not apply.)

## Process and port check
After the STOP: the runner stopped its own servers (srv8081, 8083, 8085, 8086, 8087, 8088, 8089, 8091) and closed its windows. `netstat -ano` listening on 8081-8091: none (TIME_WAIT lines only). No runner/server process of the wave left. Raw output: %TEMP%\s4live-liveA.out.
