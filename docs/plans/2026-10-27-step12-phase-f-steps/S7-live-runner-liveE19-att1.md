# S7-live runner report: liveE19 attempt 1

Model/effort: Claude Sonnet 5.5, medium. Role: live runner. I judge nothing.

## Verdict
DONE. Script exit `exit=0`. No STOP, no RETURN line. Final line: `SLICE liveE19 done: calls with a failed check 1, not measured 0 (the rows are in the record)`. The script ran its own teardown (`CHECK clean PASS: the wave folder and state.json removed`, `BLOCK teardown done`); I did not run `-Block teardown`.

## Before
HEAD 772a53e; `git status --short` only the ledger modification. Nothing on 9234/8080-8089; only node 22152 (left alone); no python; worktrees: main only. Chrome windows: 38602544 and 68708. Out folder `e1` did not exist. `npm run build` last line: `built extension → dist/`. Run from Git Bash, S11_OUT = `%TEMP%\bridge-e2e\s19-live\e1`, `-Block liveE19 -Att 1`.

## Lines as printed
- ROW: R19-0 PASS slice=E; R19-VERSION FAIL; R19-RESTORE PASS slice=E; R19-LOGS PASS slice=E; UP-RESTORE PASS; RD-0 (a) PASS x2; RD-0 (c) PASS x2; RD-0 (d) PASS x2; RULES PASS (RULES 0) x3; R17B-0 (e)(f) PASS x2.
- `CHECK rows19 rows=10 warns=0 stop-return=0`
- LOADED: head `consoleMessages=answered entries=11 console=10 exception=1 args=answered`; old build: no `LOADED` line printed for the old build in the grep (VERSIONCH legs follow SWAP directly); re-run `LOADED rerun=1 consoleMessages=answered entries=11 console=10 exception=1 args=answered`.
- `SWAP old build is in extension/dist`; `RESTOREHEAD ok`.
- CAPSEG: seg=1 saved=yes before=reload; seg=2 saved=yes before=reload; seg=3 saved=yes before=end.
- VERSIONCH / LEG:
  - sdk code=VERSION hint=yes files=0 exact=yes (LEG PASS)
  - mcp code=ERROR hint=yes files=0 exact=yes (LEG FAIL)
  - raw code=VERSION hint=yes files=0 exact=yes (LEG PASS)
  - control code=ok hint=no files=1 exact=no (LEG PASS)
  - `CHECK R19-VERSION args=answered` (LEG args PASS)
  - `CHECK R19-VERSION clauses=5 failed=1`
- `RESTORE armed=equal evaluate=equal blocklist lines=0 hash=equal uploadfolders lines=0 hash=equal`; CHECK UP-RESTORE stored PASS, daemon PASS.
- `DIALOGS liveE19 native=0 devtools=0 wave-windows-open=1`
- `CONSOLE liveE19 segments=3 capture=console-liveE19-1.txt,-2.txt,-3.txt texts=895 control-disarmed=3`; `CONSOLE window-title lines dropped=9`
- `SCAN console: ://=0 (fixture 0, other 0) token=0 sentinel=0 profile=0` / CHECK R18-LOGS scan console PASS; `SCAN daemon:` same zeros / CHECK PASS; `DAEMONLOG liveE19 sentinel=0 console-text=0 args-text=0`
- SCANTOOL x4 (browser_new_tab, browser_upload_file, browser_evaluate, browser_close_tab): all sentinel/token/profile/shot-line/image-line 0.
- `SCAN actors: ://=1 (fixture 1, other 0) token=0 sentinel=0 profile-other=0 shot-line=0 image-line=0`; `CHECK actors profile-all=0`

## Files (docs/plans/2026-10-27-step12-phase-f-steps/, untracked, not committed)
- `S7-live-record-liveE19.txt` 160 lines (script-written)
- `S7-live-evidence-liveE19-att1.txt` 282 lines (stdout copy)
- `S7-live-console-liveE19-att1-1.txt` 593 to 587 after dropping `DevTools` lines; `-2` 155 to 149; `-3` 148 to 142; `-all` 887 to 878 (UTF-8 via node)

## Scans
`scan18 --what other` on all 6 files: each `SCAN other: ://=0 (fixture 0, other 0) token=0 sentinel=0 profile=0`, `CHECK R18-LOGS scan other PASS: all counts zero`. Grep for `Users\`, `Users/`, the user's name (three forms), `AppData`: 0 hits per file; no redaction.

## After
Daemon stopped by `recipes/s9.ts daemon-shutdown` (`daemon.shutdown sent`); no listener on 9234/8080-8089; only node 22152 remains; no python. `git worktree prune`; `git worktree list`: main only. `old-wt` has 0 entries; no `@bridge` junction. Chrome windows after: 38602544 and 68708 only; nothing left open, nothing closed by me.

## Findings for the step agent
- mcp leg printed `code=ERROR` where sdk and raw print `VERSION` (same pattern as liveD19 R19-ARGS-OLD); that is the one failed clause, and ROW R19-VERSION FAIL follows from it.
- The grep of the stdout shows no `LOADED` line for the old build (only head and the rerun); check the record file if the sheet expects one.
