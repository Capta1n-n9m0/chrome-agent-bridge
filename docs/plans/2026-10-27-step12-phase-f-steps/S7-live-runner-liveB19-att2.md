# S7-live runner report: liveB19, attempt 2

Model/effort: Claude Sonnet 5.5, medium.

## 1. Verdict
DONE. Exit 0, no STOP, no RETURN. The script ran R19-LOGS and its own teardown (`CHECK clean PASS`), so I ran no teardown. Recorded only; no result judged.

## 2. Outputs
- HEAD `a40aa86` (`PREFLIGHT ok: head a40aa86, tree clean, ports 8081 free, 9234 free or the daemon's, the capture file of liveB19 is free`). Pre-check: tree clean, nothing on 9234 or 8080-8089, only node PID 22152 (left alone).
- Build last line: `built extension → dist/`; tree still clean.
- EXIT CODE (.exit file): `exit=0`.
- Out dir: `$TEMP/bridge-e2e/s19-live/b2` (fresh). Stdout `$TEMP/bridge-e2e/s19-live-b2-stdout.txt` (542 lines).
- Steps-dir files (untracked, not committed): `S7-live-record-liveB19-att2.txt` (388 lines, the script's own name), `S7-live-evidence-liveB19-att2.txt` (542 lines; 0 path replacements, the stdout already printed `<PROFILE>`/`<ROOT>`), `S7-live-console-liveB19-att2-1.txt` (929 lines; out-dir `console-liveB19-1.txt` has 936 text lines; I dropped the DevTools/title lines and the bare `Minimize` line, 7 lines), this report.

## 3. ROW lines in order (as printed)
- RD-0 (a) PASS dnrWithHostAccess=true, staticRuleSets=absent; RULES PASS (RULES 0); RD-0 (c) PASS; RD-0 (d) PASS; R17B-0 (e)(f) PASS (2/2 names, S6 ancestor, created-url about:blank). Printed twice (R19-0 reuse).
- `ROW R19-0 PASS slice=B`
- `ROW R19-UP-OPT PASS`
- `ROW R19-BANNER-CTL PASS slice=B`
- `ROW R19-UP-6 PASS`
- `ROW R19-F-RAW PASS`
- `ROW R19-F-RAW-2 PASS`
- `ROW R19-F-RAW-DIR PASS`
- `ROW R19-KEEP-1 PASS banner-clause=NOT DISCRIMINATING`
- `ROW R19-KEEP-2 PASS`
- `ROW R19-KEEP-3 PASS`
- `ROW R19-CON-KEPT PASS` (printed after R19-RESTORE, with R19-LOGS)
- `ROW R19-KEEP-OVERLAP PASS slice=B`
- `ROW R19-UP-DEVT NOT MEASURED — DevTools was not attached`
- `ROW R19-KEEP-4 NOT MEASURED — DevTools was not attached`
- `ROW R19-DEVT-NOFLAG RECORD`
- `ROW R19-SWEEP-HELD NOT MEASURED — DevTools was not attached` (no extension reload ran for it)
- `ROW UP-RESTORE PASS`; `ROW RD-RESTORE wait-safety reached safety armed=true evaluate=true blockedCount=0 after 1 ms`; `ROW RULES PASS: RULES 0`
- `ROW R19-RESTORE PASS slice=B`
- `ROW R19-LOGS PASS slice=B`

## 4. CHECK / LEG / clause lines
- Setup reload: `reload-extension.ps1 exit 0 (attempt 1)`, `RELOAD OK`. `LOADED consoleMessages=answered entries=11 console=10 exception=1 args=answered`. `HEAD a40aa86b97bb tree=clean`.
- `DEVPROBE method=uia-menu answer=ok ms=15365 attached=no` (before it: `CHECK devtools-menu step=menu-button found=no`).
- `CLOSERPROBE method=uia-owner opened=yes closed=yes ms=123 native-after=0`.
- R19-UP-OPT: `OPT observed standing x1 invalid items 3 warned items 0`; `OPT O2 shown=yes at=362 polled-ms=362`; `OPT O2 front after-save=yes before-conflict-read=yes`; `FIX R19-UP-OPT: O2 is brought to the front after the save and before the conflict read; the poll is timed from the save (#363)`; `TYPED uploadfolders reverted; stored equal`; `CHECK R19-UP-OPT upopt PASS: summaries and items exact, O2 in 362 ms`.
- R19-BANNER-CTL: `BANNERCTL leg=neg idle-ms=20002 polls=16 banner=none`; `leg=pos answer=ok polls=15 banner=seen`; `CHECK R19-BANNER-CTL ctl=pass`.
- R19-UP-6: 5 legs each `PASS: <leg>: exact, page untouched, no banner`; calls-sent outside 1, missing 0, relative 0, raw-dotdot 1, raw-notarget 1; `CHECK R19-UP-6 clauses=5 failed=0`; 5 BANNERCALL lines, each `polls=16 banner=none control=pass` (idle-ms 20002, 20006, 20000, 20014, 20014), each `banner=PASS`.
- R19-F-RAW / -2 / -DIR, each: `calls-sent=1`, `LEAKS 0`, refusal PASS, leaks PASS, `clauses=2 failed=0`, `BANNERCALL polls=16 banner=none control=pass` (idle-ms 20008, 20005, 20003), `banner=PASS`.
- R19-KEEP-1: `IDLE since-attach-ms=20008`; `KEEPSEQ calls=5 gap-ms=3000 answers=5/5 banner=continuous end-ms=10122 poll-ms=247`; LEG answers PASS, LEG banner PASS; `CHECK R19-KEEP-1 clauses=1 failed=0`.
- R19-KEEP-2 (KEEPEND, 6 legs): idle x3 `since-last-call-ms=0 end-ms=10045 / 10020 / 10021 next=ok`; ctl x3 `end-ms=5050 / 5161 / 5021 next=BAD_PARAMS`; `CHECK R19-KEEP-2 medians idle=10021 ctl=5050 measured=yes`; `LEG end PASS`; `clauses=1 failed=0`.
- R19-KEEP-3 (KEEPEND): disarm `since-last-call-ms=2012 end-ms=6270 next=DISARMED`; block `1985 / 6541 / DOMAIN_BLOCKED`; nav-blocked `1834 / 6577 / DOMAIN_BLOCKED`; nav-own `1844 / 6649 / DOMAIN_BLOCKED`; nav-file `1704 / 6431 / DOMAIN_BLOCKED`; close `1051 / 6177 / TAB_GONE`. Each leg `-end PASS` and `-next PASS` (12 LEG lines). `CHECK R19-KEEP-3 leg=replace NOT RUN — no deterministic trigger is sourced`; `CHECK R19-KEEP-3 clauses=12 failed=0`. (No KEEPDT line printed.)
- R19-CON-KEPT: `CONKEPT first=11 second=11 equal=yes ordered=yes`; sdk PASS, mcp PASS; `clauses=2 failed=0`; `console-clause pending R19-LOGS`.
- R19-KEEP-OVERLAP: `OVERLAP leg=evaluate first=ok second=DEBUGGER_DEVTOOLS exact=yes`; `clauses=1 failed=0`.
- `DEVNOFLAG probe=ok kept-then-devtools=not-run`; `LEG R19-DEVT-NOFLAG record RECORD`.
- No SWEEP lines (SWEEP-HELD not measured); no rerun lines.
- CAPSEG: `CAPSEG liveB19 seg=1 saved=yes before=end`; `CONSOLE liveB19 segments=1 capture=console-liveB19-1.txt texts=936 control-disarmed=6`; `CONSOLE window-title lines dropped=3`.

## 5. STOP / STOPWHY / RETURN
None printed.

## 6. R19-RESTORE
- Kill switch pressed twice: OFF in 61 ms, back to armed in 60 ms.
- `BOX uploadfolders set (0 non-blank line(s); saved; text withheld)`.
- `STATE armed=true evaluate=true blocklist lines=0 sha256=e3b0c442...b855 uploadfolders lines=0 sha256=e3b0c442...b855`; `RESTORE uploadfolders lines=0 hash=equal`.
- `RESTORE read-back: stored page equal true, daemon.status equal true, title armed true`; `RESTORE ok: the found texts (outside the repo) deleted after the read-back matched`.
- `RESTORE armed=equal evaluate=equal blocklist lines=0 hash=equal uploadfolders lines=0 hash=equal`; `CHECK UP-RESTORE stored PASS`; `CHECK UP-RESTORE daemon PASS`.
- `CHECK R19-BANNER-CTL bc-tab=closed`.
- `DIALOGS liveB19 native=0 devtools=0 wave-windows-open=1`.
- Mid-slice block-list restores (KEEP-3 block, nav-blocked): `RESTORE blocklist lines=0 hash=equal` x2.

## 7. R19-LOGS
- `SCAN console: ://=0 (fixture 0, other 0) token=0 sentinel=0 profile=0`; `CHECK R18-LOGS scan console PASS: all counts zero`.
- `SCAN daemon: ://=0 (fixture 0, other 0) token=0 sentinel=0 profile=0`; `CHECK R18-LOGS scan daemon PASS: all counts zero`.
- `DAEMONLOG liveB19 sentinel=0 console-text=0 args-text=0`.
- `SCANTOOL tool=browser_new_tab sentinel=0 token=0 profile=0 shot-line=0 image-line=0`; `tool=browser_console_messages sentinel=11 token=0 profile=0 shot-line=0 image-line=0`; `tool=browser_close_tab sentinel=0 token=0 profile=0 shot-line=0 image-line=0`.
- `SCAN actors: ://=0 (fixture 0, other 0) token=0 sentinel=11 profile-other=0 shot-line=0 image-line=0`; `CHECK actors profile-all=0`.
- `CHECK rows19 rows=24 warns=0 stop-return=0`.
- `CHECK clean PASS: the wave folder and state.json removed`; `TEARDOWN done`; `SLICE liveB19 done: calls with a failed check 0, not measured 0 (the rows are in the record)`.

## 8. File scans (`scan18 --what other`)
- Record: `SCAN other: ://=0 (fixture 0, other 0) token=0 sentinel=0 profile=0`.
- Evidence: same, all 0.
- Console (after dropping 7 lines): same, all 0.

## 9. After-state
- Before shutdown, the 9234 owner (PID 26540) had `daemon\dist\index.js` in its command line. `npm run recipe -- recipes/s9.ts daemon-shutdown` printed `daemon.shutdown sent`.
- After: nothing listening on 9234 or 8080-8089; only unrelated node PID 22152; no python. Nothing killed.
- Visible Chrome windows by title: one, `<other>`. Closed nothing.
- Out dir b2 kept. Tree: only the 3 new evidence files are untracked (plus this report).
