# S7-live runner report: liveD19 attempt 2

Model/effort: Claude Sonnet 5.5, medium. Role: live runner. I judge nothing.

## Verdict
DONE. Script exit `exit=0` (`s19-live-d2.exit`). No STOP, no RETURN line, no failed restore. Final line: `SLICE liveD19 done: calls with a failed check 1, not measured 0`. The script ran its own teardown (`CHECK clean PASS: the wave folder and state.json removed`, `BLOCK teardown done`), so I did not run `-Block teardown`.

## Before
- HEAD `c55cf9d`. `git status --short`: only the ledger modification (as allowed). Nothing on 9234 or 8080-8089; only node 22152 (left alone); no python. `git worktree list`: main tree only. Chrome top-level windows: 38602544 and 68708 only. Out folder `d2` did not exist. `npm run build` last line: `built extension → dist/`.
- Run from Git Bash with S11_OUT = `%TEMP%\bridge-e2e\s19-live\d2` (Windows path), `-Block liveD19 -Att 2`.

## Lines as printed (counts)
- ROW: R19-0 PASS (slice=D); R19-RESTORE PASS; R19-ARGS-OLD FAIL; R19-LOGS PASS (slice=D); RD-0 (a) PASS x2; RD-0 (c) PASS x2; RD-0 (d) PASS x2; RULES PASS (RULES 0) x3; R17B-0 (e)(f) PASS x2; UP-RESTORE PASS. Verdicts: PASS 16 (incl. 2 slice rows) , FAIL 1.
- `CHECK rows19 rows=10 warns=0 stop-return=0`
- LOADED: head build `consoleMessages=answered entries=11 console=10 exception=1 args=answered`; old build `consoleMessages=UNKNOWN_METHOD entries=0 console=0 exception=0 args=VERSION`; re-run `rerun=1 consoleMessages=answered entries=11 console=10 exception=1 args=answered`.
- `SWAP old build is in extension/dist`; `RESTOREHEAD ok`.
- CAPSEG: `seg=1 saved=yes before=reload`; `seg=2 saved=yes before=reload`; `seg=3 saved=yes before=end`.
- OLD / LEG (R19-ARGS-OLD): sdk code=VERSION hint=yes forwarded=n/a (LEG PASS); mcp code=ERROR hint=yes forwarded=n/a (LEG FAIL); ref code=VERSION hint=yes (PASS); file code=VERSION hint=yes (PASS); raw code=VERSION hint=yes forwarded=no (PASS); control code=ok hint=no, `CHECK R19-ARGS-OLD control raw-twin kind=undefined` (PASS). LEG counts: 5 PASS, 1 FAIL.
- `CHECK R19-ARGS-OLD clauses=6 failed=1`; `CHECK R19-ARGS-OLD console-clause pending R19-LOGS`.
- `RESTORE armed=equal evaluate=equal blocklist lines=0 hash=equal uploadfolders lines=0 hash=equal`; CHECK UP-RESTORE stored/daemon PASS.
- `DIALOGS liveD19 native=0 devtools=0 wave-windows-open=1`
- `CONSOLE liveD19 segments=3 capture=console-liveD19-1.txt,console-liveD19-2.txt,console-liveD19-3.txt texts=837 control-disarmed=3`; `CONSOLE window-title lines dropped=9`
- `SCAN console: ://=0 (fixture 0, other 0) token=0 sentinel=0 profile=0` / `CHECK R18-LOGS scan console PASS: all counts zero`
- `SCAN daemon: ... all zero` / `CHECK R18-LOGS scan daemon PASS`; `DAEMONLOG liveD19 sentinel=0 console-text=0 args-text=0`
- `SCAN actors: ://=1 (fixture 1, other 0) token=0 sentinel=0 profile-other=0 shot-line=0 image-line=0`; `CHECK actors profile-all=0`

## Files (docs/plans/2026-10-27-step12-phase-f-steps/, untracked, not committed)
- `S7-live-record-liveD19-att2.txt` (150 lines, script-written)
- `S7-live-evidence-liveD19-att2.txt` (272 lines, stdout copy)
- `S7-live-console-liveD19-att2-1.txt` (593 raw, 587 after dropping `DevTools` lines), `-2.txt` (97 to 91), `-3.txt` (148 to 142), `-all.txt` (829 to 820); UTF-8 via node.

## Scans
`recipes/s11b.ts scan18 --what other --file <f>` on all 6 files: each `SCAN other: ://=0 (fixture 0, other 0) token=0 sentinel=0 profile=0`, `CHECK R18-LOGS scan other PASS: all counts zero`. Grep for `Users\`, `Users/`, `aliev`, `Aliyev`, `Abbas`, `AppData`: 0 hits before and 0 after in each; no redaction done.

## After
- Daemon PID 14040 listened on 9234; stopped by `recipes/s9.ts daemon-shutdown` (`daemon.shutdown sent`). Then no listener on 9234/8080-8089 (only TIME_WAIT entries); only node 22152 remains; no python.
- `git worktree list`: main only (after `git worktree prune`). `<out>\old-wt` has 0 entries, no `node_modules\@bridge\*` junctions.
- Chrome top-level windows after: 38602544 and 68708 only (same as before); no extra DevTools or Extensions windows. Nothing closed by me.
- `git status --short`: ledger modification plus the 6 new untracked files (and this report).

## Findings for the step agent
- mcp leg printed `code=ERROR` where the other four legs print `VERSION` (same as attempt 1); this is the one failed clause, and ROW R19-ARGS-OLD FAIL follows from it.
- The attempt-1 STOP (`devtools-left-open`) did not recur: `devtools=0`.
