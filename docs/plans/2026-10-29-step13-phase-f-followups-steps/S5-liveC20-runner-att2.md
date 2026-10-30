# S5-liveC20 runner, attempt 2

## 1. Verdict
DONE. Sonnet 5.5, medium effort. The slice ran to its end; no STOP, no RETURN. Exit code 0.

## 2. Outputs
- Prerequisites: HEAD e614e0c (ancestor check passed); `git status --short` showed the six untracked liveB20 files and the modified steps-dir ledger (7 lines); `npm run build` result line `built extension → dist/`; `recipes/reload-extension.ps1` printed `RELOAD OK` (no re-run); 9234 free at the start, 8081 free; top-level `DevTools…` windows 0; `s20-liveC/a2` did not exist; `-Block plan` exit 0.
- Start 2026-10-30T04:25:5xZ (the launch), end about 04:28:38Z (record's last line); exit file `0`.
- Record: `docs/plans/2026-10-29-step13-phase-f-followups-steps/S13-live-record-liveC20-att2.txt` (174 lines, uncommitted, unedited). Raw out dir `$TEMP/bridge-e2e/s20-liveC/a2` (outside the repo); stdout `$TEMP/bridge-e2e/s20-liveC-a2-stdout.txt`.

## Record lines (as printed; the "s9-win:" time prefixes dropped)
```
ROW R20-0C PASS slice=C
CHECK dock-read row=R20-0C windows=0 pane=yes customize=2 invoked=yes items=4 kinds=u1l1b1r1 pressed-readable=4 pressed=1 try=1
DOCK R20-0C side=right
CHECK gate-dock side-readable=yes
FLAG debugging-flag=no
CHECK R20-DEVT-UNDOCK undock open=ok
ANSWER R20-DEVT-UNDOCK undock call ok
CTRL20 R20-DEVT-UNDOCK leg=undock when=before-open windows=0 title=none attached=no targets=29
CTRL20 R20-DEVT-UNDOCK leg=undock when=after-open windows=1 title=ok attached=yes targets=31
DEVT20 R20-DEVT-UNDOCK leg=undock answer=ok value=ok exact=n/a devtools-windows-after=0
LEG R20-DEVT-UNDOCK undock PASS
CHECK R20-DEVT-UNDOCK clauses=1 failed=0
ROW R20-DEVT-UNDOCK PASS
CHECK R20-DEVT-EARLY undocked open=ok
ANSWER R20-DEVT-EARLY undocked call ok
CTRL20 R20-DEVT-EARLY leg=undocked when=before-open windows=0 title=none attached=no targets=29
CTRL20 R20-DEVT-EARLY leg=undocked when=after-open windows=1 title=ok attached=yes targets=31
DEVT20 R20-DEVT-EARLY leg=undocked answer=ok value=ok exact=n/a devtools-windows-after=0
LEG R20-DEVT-EARLY undocked PASS
CHECK R20-DEVT-EARLY docked open=ok
ANSWER R20-DEVT-EARLY docked call ok
CTRL20 R20-DEVT-EARLY leg=docked when=before-open windows=n/a title=n/a attached=no targets=29
CTRL20 R20-DEVT-EARLY leg=docked when=after-open windows=n/a title=n/a attached=yes targets=31
DEVT20 R20-DEVT-EARLY leg=docked answer=ok value=ok exact=n/a devtools-windows-after=0
LEG R20-DEVT-EARLY docked PASS
CHECK R20-DEVT-EARLY row=PASS
CHECK R20-DEVT-EARLY clauses=2 failed=0
ROW R20-DEVT-EARLY PASS
ROW R20-UP-DEVT NOT RUN — no DevTools condition refused
ROW R20-KEEP-4 NOT RUN — no DevTools condition refused
ROW R20-SWEEP-HELD NOT RUN — no DevTools condition refused
CHECK R20-DEVT finding: both conditions answer ok; #374 item 3's reword waits for the user
CHECK dock-read row=R20-RESTORE windows=0 pane=yes customize=2 invoked=yes items=4 kinds=u1l1b1r1 pressed-readable=4 pressed=1 try=1
DOCK R20-RESTORE side=right
RESTORE armed=equal evaluate=equal blocklist lines=0 hash=equal uploadfolders lines=0 hash=equal
ROW UP-RESTORE PASS: armed, evaluate, block list and Upload folders equal to UP-0 by count and hash
RESTORECHECK stored=equal differs-by=none
DIALOGS C native=0 devtools=0 wave-windows-open=1
ROW R20-RESTORE PASS slice=C
SCAN20 console: name=0 sentinel=0 token=0
SCAN20 daemon: name=0 sentinel=0 token=0
SCAN20 evidence: name=0 sentinel=0 token=0
ROW R20-LOGS PASS slice=C
CHECK rows20 rows=8 warns=0 stop-return=0
```
Also printed: `CONSOLE window-title lines dropped=3`. No `STOP`, `RETURN`, `FLAG` other than the one above, no `text-leak`. No separate gate-cond line was printed (the three conditional rows printed NOT RUN, then the finding line).

## Verdicts as printed
R20-0C PASS; R20-DEVT-UNDOCK PASS; R20-DEVT-EARLY PASS (both legs PASS); R20-UP-DEVT, R20-KEEP-4, R20-SWEEP-HELD NOT RUN (no condition refused); R20-RESTORE PASS; R20-LOGS PASS. Slice end: `SLICE liveC20 done: calls with a failed check 0, not measured 1`.

## #369's two DevTools conditions (as printed)
- DevTools undocked: the bridge's call answered ok (`ANSWER … undock call ok`; `DEVT20 … leg=undock answer=ok`; the EARLY undocked leg also ok).
- DevTools docked: answered ok (`ANSWER R20-DEVT-EARLY docked call ok`; `DEVT20 … leg=docked answer=ok`).
- Neither was refused.

## Teardown
`-Block teardown -Att 2` exit 0; `CHECK clean PASS: the wave folder and state.json removed` (seen on a second teardown call, which found nothing left to remove).

## State after
- Top-level `DevTools…` windows: 0.
- 9234: LISTENING by node PID 1952 (the daemon) with one established client (PID 27384); 8080-8089 free.
- node.exe: 1952 (daemon), 27060 (not started by the wave; left alone).
- `git worktree list`: the main tree only.
- `git status --short`: 8 lines = 7 untracked (the six liveB20 files plus the new att2 record) ... the report file itself was not yet written at that count; 1 modified (the steps-dir ledger).
- Nothing left hanging.

## Hygiene (record, counts only)
Token 0; the user's full name 0 and each part 0; Windows user folder name 0; home paths 0; `DevTools - ` title lines 0; `http` 0.

## Deviations, decisions, findings
None proposed. Both DevTools conditions answered ok, so the conditional rows did not run (as the sheet prints).

## Handoff
No wave process remains. The record is uncommitted.
