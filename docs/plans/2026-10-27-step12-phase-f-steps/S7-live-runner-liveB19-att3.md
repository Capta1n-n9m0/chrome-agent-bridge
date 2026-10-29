# S7-live runner report: liveB19, attempt 3

Model/effort: Claude Sonnet 5.5, medium.

## 1. Verdict
DONE. Exit 0, no STOP, no RETURN. The script ran R19-LOGS and its own teardown (`CHECK clean PASS`, `TEARDOWN done`), so I ran no teardown. Recorded only; nothing judged.

## 2. Outputs
- `PREFLIGHT ok: head 3478261, tree clean, ports 8081 free, 9234 free or the daemon's, the capture file of liveB19 is free`. Pre-check: tree clean, HEAD 3478261, nothing on 9234 or 8080-8089, only node PID 22152.
- Build last line: `built extension → dist/`; tree still clean. `HEAD 34782615724d tree=clean`.
- EXIT CODE (.exit file): `exit=0`. Out dir `$TEMP/bridge-e2e/s19-live/b3` (fresh). Stdout `$TEMP/bridge-e2e/s19-live-b3-stdout.txt` (546 lines).
- Steps-dir files (untracked, not committed): `S7-live-record-liveB19-att3.txt` (script's own), `S7-live-evidence-liveB19-att3.txt` (stdout copied as is; it contains no home/out/profile path, 0 hits for `Users\`, `<user-folder>`), `S7-live-console-liveB19-att3-1.txt` (936 lines in the out dir, 931 kept; 5 dropped: `DevTools - <profile>`, `DevTools`, `Minimize`, `DevTools`, `DevTools is undocked`), this report.

## 3. ROW lines in order (as printed)
- RD-0 (a) PASS dnrWithHostAccess=true, staticRuleSets=absent; RULES PASS: RULES 0; RD-0 (c) PASS; RD-0 (d) PASS; R17B-0 (e)(f) PASS (2/2 names, S6 ancestor, created-url about:blank). Printed twice.
- `ROW R19-0 PASS slice=B`
- `ROW R19-UP-OPT PASS`
- `ROW R19-BANNER-CTL PASS slice=B`
- `ROW R19-UP-6 PASS`
- `ROW R19-F-RAW PASS`; `ROW R19-F-RAW-2 PASS`; `ROW R19-F-RAW-DIR PASS`
- `ROW R19-KEEP-1 PASS banner-clause=NOT DISCRIMINATING`
- `ROW R19-KEEP-2 PASS`
- `ROW R19-KEEP-3 PASS`
- `ROW R19-KEEP-OVERLAP PASS slice=B`
- `ROW R19-UP-DEVT NOT MEASURED — DevTools was not attached`
- `ROW R19-KEEP-4 NOT MEASURED — DevTools was not attached`
- `ROW R19-DEVT-NOFLAG RECORD`
- `ROW R19-SWEEP-HELD NOT MEASURED — DevTools was not attached`
- `ROW UP-RESTORE PASS`; `ROW RD-RESTORE wait-safety reached safety armed=true evaluate=true blockedCount=0 after 1 ms`; `ROW RULES PASS: RULES 0`
- `ROW R19-RESTORE PASS slice=B`
- `ROW R19-CON-KEPT PASS`; `ROW R19-LOGS PASS slice=B` (printed after R19-RESTORE)

## 4. CHECK / probe / clause lines
- `LOADED consoleMessages=answered entries=11 console=10 exception=1 args=answered`.
- Devtools-menu: `step=menu-button found=yes`, `step=more-tools found=yes`, `step=developer-tools found=yes`, `CHECK devtools-ui method=uia-menu found=pane`; then `KEY F12 pressed into window`; `DEVPROBE method=uia-menu answer=ok ms=15476 attached=no`.
- `CLOSERPROBE method=uia-owner opened=yes closed=yes ms=184 native-after=0`.
- `CHECK R19-UP-OPT upopt PASS: summaries and items exact, O2 in 353 ms`.
- `CHECK R19-BANNER-CTL ctl=pass`.
- R19-UP-6: five `PASS: <leg>: exact, page untouched, no banner` (outside, missing, relative, raw-dotdot, raw-notarget); `clauses=5 failed=0`; five `banner=PASS`.
- R19-F-RAW, -2, -DIR: each `PASS refusal: exact, page untouched, no banner`, `clauses=2 failed=0`, `banner=PASS`.
- `KEEPSEQ R19-KEEP-1 calls=5 gap-ms=3000 answers=5/5 banner=continuous end-ms=10042 poll-ms=280`; `clauses=1 failed=0`.
- KEEPEND R19-KEEP-2: idle x3 `since-last-call-ms=0 end-ms=10132 / 10134 / 10104 next=ok`; ctl x3 `end-ms=4988 / 5057 / 5028 next=BAD_PARAMS`; `medians idle=10132 ctl=5028 measured=yes`; `clauses=1 failed=0`.
- KEEPEND R19-KEEP-3: disarm `2012 / 6344 / DISARMED`; block `2003 / 6570 / DOMAIN_BLOCKED`; nav-blocked `1879 / 6800 / DOMAIN_BLOCKED`; nav-own `1846 / 6634 / DOMAIN_BLOCKED`; nav-file `1870 / 6708 / DOMAIN_BLOCKED`; close `1037 / 6156 / TAB_GONE`. `leg=replace NOT RUN — no deterministic trigger is sourced`; `clauses=12 failed=0`. No KEEPDT line printed. Block-list mid-slice restores: `RESTORE blocklist lines=0 hash=equal` x2.
- `CHECK R19-CON-KEPT clauses=2 failed=0`; `console-clause pending R19-LOGS`.
- `OVERLAP R19-KEEP-OVERLAP leg=evaluate first=ok second=DEBUGGER_DEVTOOLS exact=yes`; `clauses=1 failed=0`.
- `DEVNOFLAG probe=ok kept-then-devtools=not-run`; `LEG R19-DEVT-NOFLAG record RECORD`.
- No SWEEPHELD, KEEPDT or rerun lines.
- `CAPSEG liveB19 seg=1 saved=yes before=end`; `CONSOLE liveB19 segments=1 capture=console-liveB19-1.txt texts=936 control-disarmed=6`; `CONSOLE window-title lines dropped=3`.

## 5. STOP / STOPWHY / RETURN
None printed.

## 6. Restore
- `RESTORE uploadfolders lines=0 hash=equal`; `RESTORE read-back: stored page equal true, daemon.status equal true, title armed true`; `RESTORE ok: the found texts (outside the repo) deleted after the read-back matched`.
- `RESTORE armed=equal evaluate=equal blocklist lines=0 hash=equal uploadfolders lines=0 hash=equal`; `CHECK UP-RESTORE stored PASS`; `CHECK UP-RESTORE daemon PASS`.
- `CHECK R19-BANNER-CTL bc-tab=closed`; `DIALOGS liveB19 native=0 devtools=0 wave-windows-open=1`.

## 7. R19-LOGS
- `SCAN console: ://=0 (fixture 0, other 0) token=0 sentinel=0 profile=0`; `CHECK R18-LOGS scan console PASS: all counts zero`.
- `SCAN daemon: ... all 0`; `CHECK R18-LOGS scan daemon PASS`. `DAEMONLOG liveB19 sentinel=0 console-text=0 args-text=0`.
- `SCANTOOL`: browser_new_tab sentinel=0; browser_console_messages sentinel=11; browser_close_tab sentinel=0 (token, profile, shot-line, image-line all 0).
- `SCAN actors: ://=0 (fixture 0, other 0) token=0 sentinel=11 profile-other=0 shot-line=0 image-line=0`; `CHECK actors profile-all=0`.
- `CHECK rows19 rows=24 warns=0 stop-return=0`.
- `CHECK clean PASS: the wave folder and state.json removed`; `TEARDOWN done: windows, wave files, servers (own PIDs) ended; globals removed`; `SLICE liveB19 done: calls with a failed check 0, not measured 0 (the rows are in the record)`.

## 8. File scans (`scan18 --what other --file <f>`)
- Record, evidence, console: each `SCAN other: ://=0 (fixture 0, other 0) token=0 sentinel=0 profile=0` and `CHECK R18-LOGS scan other PASS: all counts zero`. Grep for `Users\`, `<user-folder>`, `<user-name>`: 0 in each.

## 9. After-state
- The 9234 owner (PID 10264) had `daemon\dist\index.js` in its command line; `daemon-shutdown` printed `daemon.shutdown sent`. After: nothing listening on 9234 or 8080-8089; only node PID 22152 remains; no python.
- Chrome windows: 2 (HWNDs 38602544, 68708), neither title starts `DevTools`, neither a fixture title. Closed nothing.
- Untracked: the 3 att3 evidence files plus this report (and the A19 att3 files from an earlier run).
