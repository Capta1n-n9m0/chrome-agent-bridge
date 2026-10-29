# S7-live runner report: liveC19 attempt 1 (Run 19 slice C)

Model/effort: Claude Sonnet 5.5, medium. Role: live runner (agent-rules section 6). Deviations from the brief: none.

## Verdict
DONE. The script exited 0 (`s19-live-c1.exit`: `exit=0`). No STOPWHY, STOP or RETURN line (grep count 0). The stdout holds the teardown too (`CHECK clean PASS: the wave folder and state.json removed`). I judge nothing; the counts follow. Three rows printed FAIL (R19-CHOOSE-REFUSE, R19-CHOOSE-KEPT, R19-G2-1).

## Before
- HEAD `0c42637`, `git status --short` empty. Nothing on 9234 or 8080-8089. Only node PID 22152 (the unrelated codex runtime, left alone); no python.
- Chrome running (13 chrome processes). `MainWindowHandle` listing showed one top-level window, 38602544 (68708 did not show as a main window; I never touched either). My own EnumWindows listing printed nothing, so the Chrome window count is from `MainWindowHandle` only.
- `npm run build` last line: `built extension → dist/`. Tree clean after.
- The out folder `c1` did not exist.

## Outputs (docs/plans/2026-10-27-step12-phase-f-steps/, untracked)
- `S7-live-record-liveC19.txt` (written by the script), `S7-live-evidence-liveC19-att1.txt` (stdout copy, 547 lines).
- `S7-live-console-liveC19-att1-1.txt` (from `console-liveC19.txt`, 1295 lines, 1291 after) and `-2.txt` (from `console-liveC19-all.txt`, 1292 lines, 1291 after). Dropped lines: lines starting `DevTools` (4 in file 1, 1 in file 2: the window-title lines plus a `DevTools is undocked` text line). The script's own count: `CONSOLE window-title lines dropped=3`.
- Out folder: `%TEMP%\bridge-e2e\s19-live\c1\`. Stdout: `%TEMP%\bridge-e2e\s19-live-c1-stdout.txt`.

## ROW lines in order (as printed)
R19-0 PASS (slice=C); R19-BANNER-CTL PASS; R19-CHOOSE-1 PASS; R19-CHOOSE-LABEL PASS; R19-CHOOSE-REFUSE **FAIL**; R19-CHOOSE-2 PASS; R19-CHOOSE-3 PASS; R19-CHOOSE-MCP PASS (printed once, after leg d); R19-CHOOSE-KEPT **FAIL**; R19-CHOOSE-FRAME RECORD; R19-CHOOSE-HUMAN RECORD; R19-CHOOSE-LATE PASS; R19-KEEP-OVERLAP PASS (slice=C); R19-CHOOSE-4 PASS; R19-CHOOSE-DISARM PASS; R19-CHOOSE-JSOFF PASS; R19-G2-1 **FAIL**; R19-G2-2 PASS; R19-RESTORE PASS (slice=C); R19-LOGS PASS (slice=C). `CHECK rows19 rows=26 warns=0 stop-return=0`.
Prologue rows also printed: RD-0 (a),(c),(d) PASS, RULES PASS, R17B-0 (e)(f) PASS, UP-RESTORE PASS.

## Lines by kind
- CLOSERPROBE: `method=uia-owner opened=yes closed=yes ms=147 native-after=0` (1 line).
- CHOOSE (23 lines). Selected: CHOOSE-1 sdk ok files=1 change=1 clicks=1 dialog=0; ref ok same; LABEL label/input/multi ok files=1/1/2; REFUSE picker/single/dir BAD_PARAMS exact=yes, **dis TIMEOUT exact=no files=0 clicks=1 ms=5023 (LEG FAIL; clauses=4 failed=1)**; CHOOSE-2 outside UPLOAD_REFUSED, missing BAD_PARAMS (leg noacc: NOT RUN, the file-URL toggle reads on); CHOOSE-3 none TIMEOUT ms=5022; MCP a ok, b ok, c TIMEOUT ms=6567, e form=run16, d JS_DISABLED; DISARM none DISARMED ms=5025; JSOFF sdk JS_DISABLED, control ok. All have dialog=0.
- BANNERCALL: CHOOSE-1 idle-ms=20014 banner=seen control=pass; CHOOSE-2 20008 none pass; JSOFF 20006 none pass. SAMPLER lines: CHOOSE-1 polls=16 banner=seen; CHOOSE-2 none; JSOFF none. IDLE lines also for KEPT (20006) and KEEP-OVERLAP (20006).
- KEEPSEQ: `R19-CHOOSE-KEPT calls=2 gap-ms=2000 answers=2/2 banner=continuous end-ms=10309 poll-ms=369` -> LEG kept **FAIL** (clauses=1 failed=1).
- OVERLAP: `leg=chooser first=TIMEOUT second=DEBUGGER_DEVTOOLS exact=yes`, page-clicks=1, PASS.
- DIALOG: CHOOSE-4 legs a, b, c: `before=0 after-click=1 after-close=0 ms=122/125/120 change=0`, answers ok / TIMEOUT / BAD_PARAMS; DISARM leg=a `before=0 after-click=1 after-close=0 ms=124`. Four dialogs raised by the wave, four closed, 0 left.
- LATE: opener-ms=4900 opened=yes (answer ok); opener-ms=5100 opened=no (answer TIMEOUT); both PASS.
- HUMAN: `received=clicked-input dialog=0 files=1`, RECORD. FRAME: `reached-via=locator`, files=1 change=1, RECORD.
- G2: `R19-G2-1 a-reply=34 b-reply=35106 gap-ms=35072 holder-after-reply-ms=477 a-effect=1 b=TIMEOUT` -> LEG raw **FAIL** (`raw-gap-ms=35072 a=ok`; focusFirst variant recorded, not judged: a-reply=15 b-reply=35118 gap-ms=35103 holder-after-reply-ms=479; clauses=1 failed=1).
- G2TYPE: rounds 1-5 each `sent=40 got=40 lost=0 b-calls=3 b-ok=3 b-lock-timeout=0`, 5 of 5 PASS.
- STOP/RETURN: none.

## Restore and DIALOGS
`RESTORE armed=equal evaluate=equal blocklist lines=0 hash=equal uploadfolders lines=0 hash=equal`; UP-RESTORE stored PASS, daemon PASS. `DIALOGS liveC19 native=0 devtools=0 wave-windows-open=1`.

## R19-LOGS
`CAPSEG liveC19 seg=1 saved=yes before=end`; `CONSOLE liveC19 segments=1 texts=1295 control-disarmed=6`; `R18-LOGS scan console` and `scan daemon` both PASS (all counts zero); `CHECK actors profile-all=1`.

## File scans
`recipes/s11b.ts scan18 --what other` on 4 files (console -1, console -2, evidence, record): each `://=0 token=0 sentinel=0 profile=0`, PASS. Grep for `Users\` (fixed string), `<user-folder>` and `<user-name>`: 0 hits in each of the 4 files. No redaction was needed. (The raw console file line 1 held the profile window title; it is in the dropped lines.)

## After state
- Daemon PID 37668 still listened on 9234; command line was `...\daemon\dist\index.js`. Stopped with `npm run recipe -- recipes/s9.ts daemon-shutdown` (`daemon.shutdown sent`). Then: nothing on 9234/8080-8089; only node 22152 (codex, untouched); no python.
- Chrome main window after: 38602544 (same as before). Wave window W (40044694) no longer listed; I closed nothing myself. `git status`: only the 4 new untracked evidence files (plus this report).

## Findings for the step agent
Three FAILs to examine: CHOOSE-REFUSE `dis` leg (TIMEOUT, expected exact text not met, clicks=1), CHOOSE-KEPT (banner continuous across 2 calls, as measured), G2-1 raw leg (b waited 35 106 ms and got TIMEOUT). Judging belongs to the verifier.
