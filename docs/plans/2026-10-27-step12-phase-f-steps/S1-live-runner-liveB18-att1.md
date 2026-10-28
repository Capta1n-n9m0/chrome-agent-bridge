# S1-live runner liveB18 attempt 1

Model and effort: Claude Sonnet 5.5, medium. Rules followed: agent-rules §6 Live runner; deviations none. Nothing committed; no product or recipe edit.

## 1. Verdict
DONE. Exit code 0 (the runner printed `SLICE liveB18 done: calls with a failed check 3, not measured 1`; `CHECK rows n=19 verdict=FAIL`). No STOP line. Toggle read ON, so liveB ran.

## 2. Outputs
- Runner stdout (outside the repo): `$TEMP\bridge-e2e\s12-live\b1-runner-stdout.txt` (429 lines); out dir `...\s12-live\b1`.
- Record (written by the runner): `docs/plans/2026-10-27-step12-phase-f-steps/S1-live-record-liveB18.txt`
- Evidence: `S1-live-evidence-liveB18-att1.txt` (264 lines, user home redacted); console copy `S1-live-console-liveB18.txt` (runner wrote it after the console scan passed).
- Evidence scans (`npx tsx recipes/s11b.ts scan18 --what other --file <f>`), identical for all three files (evidence, console copy, record):
  `SCAN other: ://=0 (fixture 0, other 0) token=0 sentinel=0 profile=0`

First record line: `MANIFEST dnrWithHostAccess=true staticRuleSets=absent BUILD disk-s6-names=2/2 created-url=about:blank`

## 3. Rows as printed (the runner prints these lines; the id forms are the reused Run 17 ones, then the R18 line)
R18-0: `RULES 0`; `STATE armed=true evaluate=true blocklist lines=0 uploadfolders valid=0 invalid=0`; `TOGGLE reading on`; `FOUNDLIST blocks-fixtures=no`; `S6 commit=ancestor`; `ROW R17B-0 (e)(f) PASS: 2/2 names, S6 is an ancestor, created-url about:blank`; `HEAD 4a46a22bcc1d tree=clean`.
Rows in order:
- `ROW R18-BANNER-CTL PASS slice=B`
- `ROW F-RAW FAIL: F-RAW: banner seen` (then `ROW R18-F-RAW FAIL slice=B`)
- `ROW F-RAW-2 FAIL: F-RAW-2: banner seen` (`ROW R18-F-RAW-2 FAIL slice=B`)
- `ROW F-RAW-DIR FAIL: F-RAW-DIR: banner seen` (`ROW R18-F-RAW-DIR FAIL slice=B`)
- `ROW UP-RACE-A PASS: every clause holds` (`ROW R18-UP-RACE-A PASS`)
- `ROW R18-UP-DEVT NOT MEASURED: DevTools was not attached`
- `ROW UP-RESTORE PASS` (R18-RESTORE), `ROW R18-LOGS PASS slice=B`
- `WARN row printed twice: RULES` (helper note; counted once)
- `CHECK rows n=19 verdict=FAIL`

BANNERCTL: `BANNERCTL liveB18 leg=neg idle-ms=15050 polls=17 banner=none`; `BANNERCTL liveB18 leg=pos answer=ok polls=16 banner=seen`. The control passed, so the three F-RAW banner FAILs stand (product finding per the sheet, not converted to NOT MEASURED).

IDLE/SAMPLER per banner row:
- F-RAW: `IDLE since-attach-ms=15019`; `SAMPLER F-RAW polls=16 (after the reply 1) banner=seen`
- F-RAW-2: `IDLE 15012`; `SAMPLER polls=16 (after the reply 1) banner=seen`
- F-RAW-DIR: `IDLE 15006`; `SAMPLER polls=16 (after the reply 1) banner=seen`

Other clauses of F-RAW*: `ANSWER F-RAW BAD_PARAMS <message len=80>`, `F-RAW-2 BAD_PARAMS <len=80>`, `F-RAW-DIR BAD_PARAMS <len=76>`; `LEAKS F-RAW 0`, `LEAKS F-RAW-2 0`, `LEAKS F-RAW-DIR 0`. The only failing clause is the banner.

RAW lines: none in liveB (RAW lines belong to R18-UP-L1, liveA).

RACE: `RACE ON pressed 1602 after last reply` (>= 1600); `RACE P=1764 ms from ready; calls=120`. CALL lines: 120 total, 12 `ok`, 108 `DISARMED` refusals; first refusal is call 13 `start=1802`, i.e. 38 ms after P (`RECORD R17-UP-RACE-A first-refusal-after-P=38 ms`); `ok` at or after P+1000 ms: 0. `RECORD UP-RACE-A page-files=1`.

DEVT: `DEVT liveB18 control1 ok attached=no`; `DEVT liveB18 control2 ok`; `ANSWER UP-DEVT control1/upload/control2 ok`. F12 was pressed into window X (`CHECK devtools-ui key=F12 found=pane`), but control 1 answered `ok`, so DevTools did not attach through the debugger: the row is NOT MEASURED by its own rule (G-22 not solved by the helper's method). Upload answered `ok` with no DevTools attached (not a K-devt refusal; not judged).

RESTORE: `RESTORE armed=equal evaluate=equal blocklist lines=0 hash=equal uploadfolders lines=0 hash=equal`; `CHECK UP-RESTORE stored PASS`; `CHECK UP-RESTORE daemon PASS`; `RULES 0`.

R18-LOGS: `CONSOLE window-title lines dropped=3`; `CONSOLE liveB18 capture=console-liveB18.txt texts=677 control-disarmed=6`; `SCAN console: ://=0 (fixture 0, other 0) token=0 sentinel=0 profile=0`; `SCAN daemon: ://=0 (fixture 0, other 0) token=0 sentinel=0 profile=0`; actors: none ran.

## 4. Deviations
None. `$HOME` was unset in the Git Bash shell, so the `<HOME>` redaction used a generic `X:\Users\<name>` pattern; the files hold 0 occurrences of "users".

## 5. Proposed decisions
None.

## 6. Findings
- Banner `seen` on F-RAW, F-RAW-2, F-RAW-DIR with a passing same-slice control, 15 s idle, and answers before any attach: a product-side or sampler-side finding, cause not established (the sheet's Known limits).
- UP-RACE-A re-write passed: no `ok` at or after P+1000 ms.
- R18-UP-DEVT stays NOT MEASURED: F12 into window X does not attach DevTools to the tab (second run, after Run 17b).
- Helper note: `WARN row printed twice: RULES`.

## 7. Handoff
- Teardown ran inside the runner (windows, wave files, own server 8081 stopped; globals removed). `r18-globals.clixml` is not in the out dir.
- Final `netstat -ano` for 9234 and 8080-8089: 8080-8089 no line. 9234: LISTENING PID 19952 (the daemon, outlives the session by design; an ESTABLISHED pair 43854 with PID 19496 plus two TIME_WAIT). I did not verify the PIDs' image names and did not touch them.
- The tracked file `S1-live.ledger.md` was already modified before the run (step agent's), untouched by me.
