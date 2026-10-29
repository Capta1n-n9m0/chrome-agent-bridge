# S7-live runner report: liveD19 attempt 1 (Run 19 slice D, R19-ARGS-OLD on the pre-S2a build)

Model/effort: Claude Sonnet 5.5, medium. Role: live runner (agent-rules section 6).

## Verdict
DONE-PARTIAL, ended by a STOP. The script exited 2 (`s19-live-d1.exit`: `exit=2`). The STOP is `devtools-left-open` (not a failed restore, not `old-build-left-loaded`). The safety state was restored before it (RESTORE line below). I judge nothing.

## Before
- HEAD `bd523bb`. `git status --short` was NOT empty: ` M .../S7-live.ledger.md` (one line added by the step agent). A mid-task message from the step agent said it is expected, the steps dir is excluded from the script's clean-tree guard, and I should treat the tree as clean; I confirmed the exclusion in `recipes/s12-r19-lib.ps1:143` (`:(exclude)$Steps`) and went on. Deviation from the brief's "empty".
- Nothing on 9234 or 8080-8089; only node 22152 (codex, left alone); no python. `git worktree list`: the main tree only. Chrome top-level windows seen: 38602544 and 68708 (user's). `npm run build` last line: `built extension → dist/`. Out folder `d1` did not exist.

## Outputs (docs/plans/2026-10-27-step12-phase-f-steps/, untracked)
- `S7-live-record-liveD19.txt` (script-written, 142 lines; no `-att1` suffix), `S7-live-evidence-liveD19-att1.txt` (stdout, 251 lines).
- `S7-live-console-liveD19-att1-1.txt` (592 raw, 588 after dropping `DevTools` lines), `-2.txt` (96 to 92), `-3.txt` (147 to 143). No `-all` file existed. The three copies differ (distinct md5).
- Out folder `%TEMP%\bridge-e2e\s19-live\d1\`; stdout `%TEMP%\bridge-e2e\s19-live-d1-stdout.txt`; teardown stdout `...\s19-live-d1-teardown.txt`.

## Key lines as printed
- R19-0: `LOADED consoleMessages=answered entries=11 console=10 exception=1 args=answered` then `ROW R19-0 PASS slice=D`.
- `CAPSEG liveD19 seg=1 saved=yes before=reload`; `seg=2 saved=yes before=reload`; `seg=3 saved=yes before=end`.
- `SWAP old build is in extension/dist`
- Old build: `LOADED consoleMessages=UNKNOWN_METHOD entries=0 console=0 exception=0 args=VERSION`
- `OLD R19-ARGS-OLD leg=sdk code=VERSION hint=yes forwarded=n/a` / `LEG ... sdk PASS`
- `OLD R19-ARGS-OLD leg=mcp code=ERROR hint=yes forwarded=n/a` / `LEG ... mcp FAIL`
- `OLD ... leg=ref code=VERSION hint=yes forwarded=n/a` / ref PASS
- `OLD ... leg=file code=VERSION hint=yes forwarded=n/a` / file PASS
- `OLD ... leg=raw code=VERSION hint=yes forwarded=no` / raw PASS
- `OLD ... leg=control code=ok hint=no forwarded=n/a`; `CHECK R19-ARGS-OLD control raw-twin kind=undefined`; `LEG ... control PASS`
- `CHECK R19-ARGS-OLD clauses=6 failed=1`; `CHECK R19-ARGS-OLD console-clause pending R19-LOGS`
- `RESTOREHEAD ok`
- Re-run on the head build: `LOADED rerun=1 consoleMessages=answered entries=11 console=10 exception=1 args=answered` (args=answered).
- `RESTORE armed=equal evaluate=equal blocklist lines=0 hash=equal uploadfolders lines=0 hash=equal`; `ROW UP-RESTORE PASS`; `ROW RULES PASS: RULES 0` (twice).
- `DIALOGS liveD19 native=0 devtools=2 wave-windows-open=1`
- `STOP: a DevTools window is still open at the slice end (devtools-left-open)`
- `RETURN 1 after-stop=devtools-left-open restored=n/a readback=n/a`
- `STOP: the wave ended (an exception in block r19-restore (RuntimeException: stop devtools-left-open))`

## ROW lines in order (as printed)
RD-0 (a) PASS; RULES PASS; RD-0 (c) PASS; RD-0 (d) PASS; R17B-0 (e)(f) PASS (printed twice with the prologue repeat); R19-0 PASS (slice=D); UP-RESTORE PASS; RULES PASS. No R19-ARGS-OLD ROW line, no R19-LOGS line, no `CHECK rows19` line were printed (the block stopped in r19-restore; R19-LOGS did not run). The R19-ARGS-OLD result is the CHECK/LEG lines above.

## STOP/RETURN and follow-up
After the STOP the script closed windows 44632872, 16451460, 50728866, 50465462 and stopped srv8081 itself. It did not run its own teardown, so I ran `-Block teardown` with the same S11_OUT: exit 0, `CHECK clean PASS: the wave folder and state.json removed`, `SLICE teardown done: calls with a failed check 0, not measured 0`.

## File scans
`recipes/s11b.ts scan18 --what other --file <f>` on 5 files (record, evidence, console -1, -2, -3): each `://=0 token=0 sentinel=0 profile=0`, `CHECK R18-LOGS scan other PASS`. Grep for `Users\`, `Users/`, the user's name and `AppData`: 0 hits in each. No redaction needed. The evidence holds `<PROFILE>` already as printed by the script.

## After state
- Daemon PID 9352 listened on 9234 (a repo `daemon\dist\index.js`); stopped with `recipes/s9.ts daemon-shutdown` (`daemon.shutdown sent`). Then nothing on 9234/8080-8089; only node 22152; no python.
- `git worktree list`: main tree only (before and after `prune`). `<out>\old-wt` is empty (0 entries); no scratch worktree and no `node_modules\@bridge\*` junctions left.
- Chrome top-level windows by EnumWindows (class Chrome_WidgetWin_1, visible), after: 53349404 (DevTools), 42143640, 44437174 (DevTools), 21433154, 38602544, 68708. The user's 38602544 and 68708 are present. Four others are NOT in the before list; 53349404 is the old-build worker console window the wave opened (seg 2) and 44437174 is the seg-1 DevTools window the script logged as "not live and the wave's own - not closed". 42143640 and 21433154 (26-character titles, same length as the chrome://extensions windows the wave used) are probably wave windows too; I did not identify them further. I closed none of them (brief: do not touch Chrome); the step agent decides.
- `git status --short`: the ledger modification (step agent's) plus the 5 new untracked evidence files (and this report).

## Findings for the step agent
- mcp leg: `code=ERROR` where sdk/ref/file/raw print `VERSION`: the one failed clause.
- The STOP `devtools-left-open` fired with `devtools=2`; leftover DevTools windows 53349404 and 44437174 remain in Chrome.
- Safety state restored and read back equal before the STOP; the attempt's R19-LOGS row never ran.
