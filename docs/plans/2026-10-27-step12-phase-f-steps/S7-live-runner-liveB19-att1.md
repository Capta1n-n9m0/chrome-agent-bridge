# S7-live runner report: liveB19, attempt 1

Model/effort: Claude Sonnet 5.5, medium.

## 1. Verdict
ESCALATE. The slice hit a STOP at row R19-KEEP-1 (`existing-tool-changed`). The script restored the safety state itself (read-back equal) and printed RETURN. I fixed nothing and did not re-run. Rows after R19-KEEP-1 did not run. R19-LOGS did not run, so there are no SCAN, SCANTOOL or DAEMONLOG lines and no DIALOGS line.

## 2. Outputs
- HEAD 0f4392d (`PREFLIGHT ok: head 0f4392d, tree clean`). Tree clean outside the steps dir before and after the build.
- Build last line: `built extension → dist/`.
- EXIT CODE from the .exit file: `exit=2`.
- Out dir: `$TEMP/bridge-e2e/s19-live/b1` (fresh). Stdout: `$TEMP/bridge-e2e/s19-live-b1-stdout.txt` (339 lines).
- Record written by the script: `S7-live-record-liveB19.txt` (216 lines). The script gave it no `-att1` suffix.
- Steps-dir files I wrote (untracked):
  - `S7-live-evidence-liveB19-att1.txt` (339 lines). Path replacements: 0, because the stdout held no home, out or profile path.
  - `S7-live-console-liveB19-att1-1.txt` (793 lines). The out dir's `console-liveB19-1.txt` has 796 lines. I dropped 3 title lines: `DevTools - <profile>`, bare `DevTools`, `Minimize`.
  - This report.
- Teardown: the script did not reach it. I ran `-Block teardown` with the same S11_OUT. It printed `CHECK clean PASS: the wave folder and state.json removed`, then `TEARDOWN done: windows, wave files, servers (own PIDs) ended; globals removed`, then `SLICE teardown done: calls with a failed check 0, not measured 0`.

## 3. ROW lines in order (as printed)
- RD-0 (a) PASS; RULES PASS (RULES 0); RD-0 (c) PASS; RD-0 (d) PASS; R17B-0 (e)(f) PASS (2/2 names, S6 is an ancestor, created-url about:blank). These five printed twice (the R19-0 reuse).
- `ROW R19-0 PASS slice=B`.
- `ROW R19-UP-OPT PASS`.
- `ROW R19-BANNER-CTL PASS slice=B`.
- `ROW R19-UP-6 PASS`.
- `ROW R19-F-RAW PASS`.
- `ROW R19-F-RAW-2 PASS`.
- `ROW R19-F-RAW-DIR PASS`.
- R19-KEEP-1: no ROW line; STOP (section 5).
- `ROW R19-RESTORE wait-safety reached safety armed=true evaluate=true blockedCount=0 after 1 ms` (this is the restore's wait line, not a PASS row).

## 4. CHECK / LEG lines
- DEVPROBE: `DEVPROBE method=uia-menu answer=ok ms=15383 attached=no`. The step before it printed `CHECK devtools-menu step=menu-button found=no`.
- CLOSERPROBE: `CLOSERPROBE method=uia-owner opened=yes closed=yes ms=155 native-after=0`.
- R19-UP-OPT:
  - `OPT observed standing x1 invalid items 3 warned items 0`
  - `OPT O2 shown=yes at=360 polled-ms=362`
  - `OPT O2 front after-save=yes before-conflict-read=yes`
  - `FIX R19-UP-OPT: O2 is brought to the front after the save and before the conflict read; the poll is timed from the save (#363)`
  - `TYPED uploadfolders reverted; stored equal`
  - `CHECK R19-UP-OPT upopt PASS: summaries and items exact, O2 in 360 ms`
- R19-BANNER-CTL:
  - neg: `idle-ms=20004 polls=16 banner=none`
  - pos: `answer=ok polls=16 banner=seen`
  - `CHECK R19-BANNER-CTL ctl=pass`
- R19-UP-6:
  - 5 legs (outside, missing, relative, raw-dotdot, raw-notarget), each `PASS: <leg>: exact, page untouched, no banner`.
  - calls-sent: outside 1, missing 0, relative 0, raw-dotdot 1, raw-notarget 1.
  - `CHECK R19-UP-6 clauses=5 failed=0`.
  - 5 BANNERCALL lines, each `polls=16 banner=none control=pass`, idle-ms 20004 to 20014, each followed by `banner=PASS`.
- R19-F-RAW, R19-F-RAW-2, R19-F-RAW-DIR, each:
  - `calls-sent=1`
  - `LEAKS 0`
  - `refusal PASS`, `leaks PASS`
  - `clauses=2 failed=0`
  - `BANNERCALL polls=16 banner=none control=pass`, `banner=PASS`
- R19-KEEP-1:
  - `IDLE R19-KEEP-1 since-attach-ms=20002`
  - `KEEPSEQ R19-KEEP-1 calls=5 gap-ms=3000 answers=4/5 banner=continuous end-ms=9982 poll-ms=319`
  - then STOPWHY.

## 5. STOP / STOPWHY / RETURN
- `STOPWHY existing-tool-changed`
- `STOP: R19-KEEP-1 stopped (existing-tool-changed) (at 2026-10-28T23:28:58.514Z)`
- `WAVE stopping: an exception in block r19-keep-1 (RuntimeException: stop existing-tool-changed)`
- `RETURN 1 after-stop=existing-tool-changed restored=yes readback=equal`
- `STOP: the wave ended (an exception in block r19-keep-1 (RuntimeException: stop existing-tool-changed))`
- The stdout has no other STOP line.

## 6. R19-RESTORE (run by the script after the STOP)
- Kill switch pressed: title went `armed` to `OFF` (69 ms), then pressed back to `armed` (75 ms).
- `BOX uploadfolders set (0 non-blank line(s); saved)`.
- `STATE armed=true evaluate=true blocklist lines=0 sha256=e3b0c442...b855 uploadfolders lines=0 sha256=e3b0c442...b855`.
- `RESTORE uploadfolders lines=0 hash=equal`.
- `RESTORE read-back: stored page equal true, daemon.status equal true, title armed true`.
- `RESTORE ok: the found texts (outside the repo) deleted after the read-back matched`.
- `CAPSEG liveB19 seg=1 saved=yes before=end`.
- Wave windows closed by the script: 4 (`window ... closed` x4). `stopped own process srv8081`.
- No DIALOGS line and no R19-LOGS lines, because the block was cut by the STOP.

## 7. File scans (`scan18 --what other`)
- `S7-live-record-liveB19.txt`: `SCAN other: ://=0 (fixture 0, other 0) token=0 sentinel=0 profile=0`
- `S7-live-evidence-liveB19-att1.txt`: same, all 0.
- `S7-live-console-liveB19-att1-1.txt` (after dropping 3 lines): same, all 0.
- A grep for the profile display name (named here only by placeholder `<profile>`) on the record, the console file and the evidence file: 0 each. (Line redacted by the step agent: the runner had written the name itself.)
- No private line left in any steps-dir file. The dropped title lines exist only in the out dir copy.

## 8. After-state
- Before the shutdown: 127.0.0.1:9234 was held by node PID 39140, command line containing `daemon\dist\index.js` (this repo's daemon). I ran `npm run recipe -- recipes/s9.ts daemon-shutdown`, which printed `daemon.shutdown sent`.
- Afterwards: nothing on 9234 or 8080-8089. The only node process is the unrelated 22152. No python process.
- Windows: one Chrome window is still open, titled `S12 console fixture - Google Chrome` (PID 1624). It is a fixture-titled window, but the script's four closed windows did not include it, and I cannot tell whether the wave opened it. Possibly it is left over from liveA19 att3, whose report said `wave-windows-open=1`. I did not close it. No DevTools window is visible by title. I killed nothing.
- Out dir b1 is still present.
