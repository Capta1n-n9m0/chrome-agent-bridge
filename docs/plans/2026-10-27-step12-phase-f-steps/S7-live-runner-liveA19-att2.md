# S7-live runner report: liveA19, attempt 2

Model/effort: Claude Sonnet 5.5, medium.

## 1. Verdict
ESCALATE: exit 2 (STOP) in block r19-con-banner, about 3 minutes into the slice: `STOP: window 44303224 is not one this wave opened (banner sampler)`, then `STOP throw-after-state`. Not a failed-restore STOP (`RETURN 1 after-stop=throw-after-state restored=n/a readback=n/a`). R19-RESTORE, R19-LOGS and `CHECK rows` never ran. I did nothing after the exit: no teardown, no re-run. One more finding: R19-ARGS-1 table leg FAILED (control-2 kind=undefined), see 4.

## 2. Outputs
- HEAD 079a063 (clean before and after the build). Build last line: `built extension → dist/`.
- Exit code 2 (read from a handle on the runner process). Out dir `$TEMP/bridge-e2e/s19-live/a2` (new). Stdout `$TEMP/bridge-e2e/s19-live-a2-stdout.txt` (278 lines).
- Steps-dir files: `S7-live-record-liveA19-att2.txt` (145 lines, written by the runner), `S7-live-evidence-liveA19-att2.txt` (the 278 stdout lines; 0 lines held a home or out path, so nothing was replaced), this report. All untracked.
- No console evidence copy: R19-LOGS did not run. `console-liveA19.txt` exists in the out dir (CAPSEG seg=1 saved=yes), unscanned and not copied.
- Before: nothing on 9234/808x; only the unrelated node.exe 22152 (codex runtime) existed.

## 3. ROW lines in order (as printed)
- `ROW RD-0 (a) PASS: dnrWithHostAccess=true, staticRuleSets=absent`
- `ROW RULES PASS: RULES 0`
- `ROW RD-0 (c) PASS: armed, JavaScript on, the toggle reads on`
- `ROW RD-0 (d) PASS: the found list blocks no fixture URL`
- `ROW R17B-0 (e)(f) PASS: 2/2 names, S6 is an ancestor, created-url about:blank`
- `LOADED consoleMessages=answered entries=11 console=10 exception=1 args=answered`
- the five RD-0/RULES/R17B-0 rows again (R19-0's reuse), then `ROW R19-0 PASS slice=A`
- `ROW R19-BANNER-CTL PASS slice=A` (`BANNERCTL leg=neg idle-ms=20004 polls=16 banner=none`; `leg=pos answer=ok polls=15 banner=seen`; `CHECK R19-BANNER-CTL ctl=pass`)
- No ROW line for any R19-ARGS-*/R19-CON-* block (each prints CHECK lines only; the runner prints ROW at the end).

## 4. CHECK lines
R19-ARGS-1:
- sdk: v1 `ok value-equal=no json-equal=yes`; v2-v5 `ok value-equal=yes json-equal=yes`. mcp: v1-v5 all `ok value-equal=yes json-equal=yes` (att1: all five ERROR).
- `ARGS total table=5 value-equal=4 json-equal=5 via=sdk`; `table=5 value-equal=5 json-equal=5 via=mcp`
- `ANSWER R19-ARGS-1 control-1 ok`; `ANSWER R19-ARGS-1 control-2 ok`
- `CHECK R19-ARGS-1 control-2 kind=undefined` (the kind was not recorded as a type name; #366 asked for `kind=<k>`)
- `LEG R19-ARGS-1 table FAIL`; `CHECK R19-ARGS-1 clauses=3 failed=1`; `console-clause pending R19-LOGS`
Others (all `console-clause pending R19-LOGS`):
- R19-ARGS-2 clauses=1 failed=0 (`ARGSREF total refusals=11 exact=11 data-none=11 sent=2 effects=0 control=1`; `ANSWER semicolon PAGE_ERROR`)
- R19-ARGS-GLOBAL clauses=1 failed=0; R19-ARGS-CSP clauses=1 failed=0 (`ANSWER calls ok`)
- R19-ARGS-STOP clauses=1 failed=0 (`STOPCALL answer=TIMEOUT ms=1511 bound-ms=1500 usable=yes next=exact`)
- R19-CON-1 clauses=3 failed=0; R19-CON-2, CON-REJ, CON-BIG, CON-NAV each clauses=1 failed=0
- R19-CON-MCP clauses=4 failed=0 (`empty-text=exact`, `existing tools=5 ok=5`, `ANSWER window ok`, `banner=PASS`)
- R19-CON-CAP clauses=1 failed=0 (`sdk-entries=200 more=191`)
- `CHECK rows`: not printed.

## 5. STOP / STOPWHY / RETURN lines
- `STOP: window 44303224 is not one this wave opened (banner sampler) - nothing sent to it (at 2026-10-28T22:46:03.208Z)`; preceded by `window 44303224 is alive but not taken as the driver's (title not one of the wave's own) - not touched` and `SAMPLER R19-CON-BANNER-neg polls=17 (after the reply 1) banner=none`
- `s9-win: WAVE stopping: an exception in block r19-con-banner (RuntimeException: the driver of s12-r19-a con-banner threw RuntimeException: not the wave's own window)`
- `STOP throw-after-state`; `CAPSEG liveA19 seg=1 saved=yes before=end`
- `RETURN 1 after-stop=throw-after-state restored=n/a readback=n/a`
- No STOPWHY line. The runner closed its three own windows (30609272, 46009252, 10423080), left 44303224 untouched, stopped own processes node and srv8081.

## 6. R19-RESTORE, R19-LOGS
Not printed (RESTORE/DIALOGS/RULES, CONSOLE/SCAN/SCANTOOL/DAEMONLOG: none). Safety state was only read (`armed`, JavaScript on, `RULES 0`), no toggle was pressed in this attempt, so nothing needed restoring; no read-back was made.

## 7. Scans (`recipes/s11b.ts scan18 --what other --file`)
- Record: `SCAN other: ://=0 (fixture 0, other 0) token=0 sentinel=0 profile=0`
- Evidence: `SCAN other: ://=0 (fixture 0, other 0) token=0 sentinel=0 profile=0`
- Console: no file written, not scanned. Nothing redacted.

## 8. Listener state after
- `127.0.0.1:9234` LISTENING PID 35924: node.exe running `<HOME>\Projects\chrome-remote-extention\daemon\dist\index.js`, this repo's daemon. Nothing on 808x.
- Orphan: PID 38644, node.exe `--import tsx recipes\s12-r19-a.ts con-banner --slice liveA19`, still ESTABLISHED to the daemon (127.0.0.1:34838). It is the con-banner driver the runner reported stopping ("stopped own process node") but it was still alive after exit. Also, a driver left running is a client of the daemon. I killed nothing. Unrelated node.exe 22152 (codex runtime) unchanged.

## 9. Handoff
- The STOP says the banner sampler found window 44303224 alive whose title was "not one of the wave's own" (the title is not recorded here). Whether it is a leftover from att1 or the user's window is not established by me. Details: `<OUT>\wave`, `R19-CON-BANNER-*.pressed/ready` markers, `node-err.txt`, `node-out.txt` in the a2 out dir (not read).
- Attempt 1 out dir `a1` and this `a2` hold `r19-globals.clixml`. Fix rounds / runner attempts are the step agent's call.
- R19-ARGS-1 `kind=undefined` is a result to rule on: the MCP leg now agrees with the SDK leg, but the control-2 kind line did not print a kind.
