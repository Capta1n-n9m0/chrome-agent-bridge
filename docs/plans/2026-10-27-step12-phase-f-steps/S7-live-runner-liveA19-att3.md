# S7-live runner report: liveA19, attempt 3

Model/effort: Claude Sonnet 5.5, medium.

## 1. Verdict
DONE (the wave ran to its end, no STOP, no RETURN). The slice reports 5 rows FAIL: R19-ARGS-1, R19-ARGS-3, R19-CON-NOTEA, R19-CON-4, R19-CON-FLOOR. R19-RESTORE and R19-LOGS printed PASS. Ruling on the 5 FAIL rows is the step agent's.

## 2. Outputs
- HEAD 922f757, tree clean before and after the build. Build last line: `built extension → dist/`.
- Exit code: NOT recorded. I started the runner with `&` from Git Bash, so I never held its exit status. What I have: the runner printed `SLICE liveA19 done: calls with a failed check 5, not measured 0`, `CHECK rows19 rows=32 warns=0 stop-return=0`, and teardown ran. No STOP line exists.
- Out dir `$TEMP/bridge-e2e/s19-live/a3` (new). Stdout `$TEMP/bridge-e2e-s19-live-a3-stdout.txt` as `$TEMP/bridge-e2e/s19-live-a3-stdout.txt` (606 lines).
- Record file written by the runner: `S7-live-record-liveA19-att3.txt` (440 lines).
- Steps-dir files I wrote: `S7-live-evidence-liveA19-att3.txt` (606 lines, stdout, paths replaced; 0 lines held a home or out path), `S7-live-console-liveA19-att3.txt` (1274 lines; copy of the out dir's `console-liveA19.txt`; I removed 2 title lines at its top, `DevTools - <profile>` and bare `DevTools`, the runner's copy had kept them although it printed `window-title lines dropped=3`), this report. All untracked.
- Before: nothing on 9234/808x; only unrelated node.exe 22152. No repo python process.

## 3. ROW lines in order (as printed)
RD-0 (a) PASS; RULES PASS (RULES 0); RD-0 (c) PASS; RD-0 (d) PASS; R17B-0 (e)(f) PASS (2/2 names, S6 ancestor, created-url about:blank); these five again (R19-0 reuse); `ROW R19-0 PASS slice=A`; `ROW R19-BANNER-CTL PASS slice=A`.
Then, at the end:
R19-ARGS-1 FAIL; R19-ARGS-2 PASS; R19-ARGS-GLOBAL PASS; R19-ARGS-CSP PASS; R19-ARGS-STOP PASS; R19-CON-1 PASS; R19-CON-2 PASS; R19-CON-REJ PASS; R19-CON-BIG PASS; R19-CON-NAV PASS; R19-CON-MCP PASS; R19-CON-CAP PASS; R19-CON-BANNER PASS; R19-ARGS-3 FAIL; R19-CON-JSOFF PASS; R19-CON-3 PASS; R19-CON-FRAME PASS; R19-CON-NOTEA FAIL; R19-CON-4 FAIL; R19-CON-FLOOR FAIL; R19-CON-OWN PASS; R19-CON-FILE PASS; `ROW R19-LOGS PASS slice=A`.
Also `ROW UP-RESTORE PASS`, `ROW R19-RESTORE PASS slice=A`, `ROW RD-RESTORE wait-safety reached safety armed=true evaluate=true blockedCount=0`.

## 4. CHECK lines
- `CHECK rows19 rows=32 warns=0 stop-return=0`; `CHECK clean PASS`; `CHECK R19-BANNER-CTL ctl=pass`; `CHECK UP-0 plan PASS` (liveB runs; toggle on).
- R19-ARGS-1: `control-2 kind=undefined` (the kind is "undefined"); `ARGS total table=5 value-equal=4 json-equal=5 via=sdk`; `table=5 value-equal=5 json-equal=5 via=mcp`; `LEG table FAIL`; `clauses=3 failed=1`.
- R19-ARGS-2 clauses=1 failed=0; R19-ARGS-GLOBAL 1/0; R19-ARGS-CSP 1/0; R19-ARGS-STOP 1/0 (`STOPCALL answer=TIMEOUT ms=1516 bound-ms=1500 usable=yes next=exact`).
- R19-CON-1 clauses=3 failed=0; CON-2, CON-REJ, CON-BIG, CON-NAV each 1/0.
- R19-CON-MCP: `empty-text=exact`, `existing tools=5 ok=5`, `clauses=4 failed=0`, `banner=PASS`.
- R19-CON-CAP: `sdk-entries=200 more=191`, 1/0. R19-CON-BANNER `verdict=PASS`.
- R19-ARGS-3: `clauses=5 failed=1` (LEG mcp FAIL; sdk, raw, noargs, state PASS); `banner=PASS`; `EFF before=1 after=1`.
- R19-CON-JSOFF: `mcp-refused=yes`, 1/0, banner=PASS. R19-CON-3: `mcp-refused=yes`, 1/0, banner=PASS. R19-CON-FRAME clauses=2 failed=0.
- R19-CON-NOTEA: `clauses=1 failed=1`; printed `CON ... blocked entries=0 ...` and `allowed entries=2 console=2 sentinel=1`, `LEG notea FAIL`.
- R19-CON-4: `mcp-refused=no`, `clauses=2 failed=1` (LEG mcp FAIL; disarmed, after PASS), banner=PASS.
- R19-CON-FLOOR: `clauses=1 failed=1`; `CONFLOOR disarmed-ticks=2 in-reply-disarmed=0 after-ticks=2 in-reply-after=2 exc-disarmed=1 exc-in-reply-disarmed=0 exc-after=2 exc-in-reply-after=2`.
- R19-CON-OWN 1/0, banner=PASS; R19-CON-FILE 1/0, banner=PASS.
- Every R19-ARGS/CON block also printed `console-clause pending R19-LOGS`.

## 5. STOP / STOPWHY / RETURN
None printed.

## 6. R19-RESTORE
- Per-block `RESTORE blocklist lines=0 hash=equal` x3.
- `RESTORE read-back: stored page equal true, daemon.status equal true, title armed true`.
- `RESTORE armed=equal evaluate=equal blocklist lines=0 hash=equal uploadfolders lines=0 hash=equal`; `CHECK UP-RESTORE stored PASS` and `daemon PASS`: equal to UP-0 by count and hash as the runner prints it.
- `RULES 0`; `DIALOGS liveA19 native=0 devtools=0 wave-windows-open=1`; `CHECK R19-BANNER-CTL bc-tab=closed`.

## 7. R19-LOGS
- `CAPSEG liveA19 seg=1 saved=yes before=end`
- `CONSOLE liveA19 segments=1 capture=console-liveA19.txt texts=1277 control-disarmed=9`; `window-title lines dropped=3`
- `SCAN console: ://=0 (fixture 0, other 0) token=0 sentinel=0 profile=0`; `CHECK R18-LOGS scan console PASS`
- `SCAN daemon: ... all zero`; `CHECK R18-LOGS scan daemon PASS`
- `DAEMONLOG liveA19 sentinel=0 console-text=0 args-text=0`
- SCANTOOL (sentinel/token/profile/shot-line/image-line): browser_new_tab, browser_evaluate, browser_snapshot, browser_list_tabs, browser_status, browser_network_requests all 0; **browser_console_messages sentinel=25** (token=0 profile=0 shot=0 image=0). Reading: the tool output returns the fixture's console sentinel text, which that tool exists to return; not ruled on by me.
- `SCAN actors: ://=5 (fixture 5, other 0) token=0 sentinel=25 profile-other=0`; `CHECK actors profile-all=0`.

## 8. File scans (`scan18 --what other`)
- Record: `SCAN other: ://=0 (fixture 0, other 0) token=0 sentinel=0 profile=0`
- Evidence: same, all 0.
- Console (after dropping the two title lines): same, all 0. Before dropping, the runner's copy held the profile display name in its first line (`DevTools - <profile>`); the scan pattern does not see it. That copy lives in the out dir, not in the steps dir.

## 9. After
- Listener `127.0.0.1:9234` PID 14348: node.exe running this repo's `daemon\dist\index.js` (the wave's daemon). Nothing on 8080-8089. No python process.
- node.exe 22152 unrelated, unchanged. No driver or other node process of this repo remains (unlike att2's orphan 38644). Killed nothing.
- Out dir a3 still present.
