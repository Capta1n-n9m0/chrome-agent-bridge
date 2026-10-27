# S4-live runner, attempt 5 (Run 17 live) — STOPPED in block liveA at `history`

## Step 0 (teardown)
- `2026-10-27T01:46:29.502Z s9-win: BLOCK teardown start`
- `CHECK clean PASS: the wave folder and state.json removed`
- `2026-10-27T01:46:30.043Z s9-win: TEARDOWN done: windows, wave files, servers (own PIDs) ended; globals removed`
- `2026-10-27T01:46:30.045Z s9-win: BLOCK teardown done` — exit 0. r17-globals.clixml gone (checked). run1, run3, run4 folders still present (teardown removed none).

## liveA: exit 2 (STOP)
Rows as the record prints them: RD-0 (a) PASS, RULES PASS (RULES 0), RD-0 (c) PASS (TOGGLE reading on), RD-0 (d) PASS, UP-L1 PASS,
RD-CTL PASS, F-FILETAB tabs / snapshot / navigate / untouched / control PASS, F-FILETAB tabs hidden row PASS, F-FILETAB tabCreated url-empty RECORD "NOT MEASURED",
F-HOME PASS, RD-CAPS-WARN PASS, RD-REGEX lines (bank443-schemes, bank443-explicit, h119, h120, h121 all supported=true; no ROW line printed).
Then block `history` (setup T2001 and T2002 PASS):
```
HISTORY back built navigations=2 backs=0
STOP: unexpected BridgeError
2026-10-27T01:47:45.642Z s9-win: WAVE stopping: an exception in block liveA (RuntimeException: node s11b history ended in a STOP)
STOP: the wave ended (an exception in block liveA (RuntimeException: node s11b history ended in a STOP)) (at 2026-10-27T01:47:48.534Z)
```
The STOP cause is not named: recipes/s11b.ts:1032 prints only the constructor name for a non-Stop throw. The "HISTORY back built" line (s11b.ts:714)
printed first, so the BridgeError was thrown after the history body, in the `session(...)` wrapper (release/close) or similar, or by the tab.back
loop with backs=0 (no). The history `plan` for kind=back reports `backs=0`, which looks odd for RD-BACK (a back with zero backs) — step agent to judge.
Helper defect candidate: s11b.ts:1032 should print the BridgeError code/message (filtered) like the earlier STOP-cause fix.

## Safety state
No state change: F-HOME / RD-CAPS-WARN typed text was reverted, never saved; last read-back
`STATE armed=true evaluate=true blocklist lines=0 sha256=e3b0c442...b855 uploadfolders lines=0 sha256=e3b0c442...b855` (= the RD-0 recording) at 01:47:38.505Z,
`TYPED blocklist reverted; stored equal`. No restore ran (none needed); rd-restore not run. RD-RESTORE and RD-LOGS did not run.

## D4.3 rows (RD-1, RD-2, RD-3, RD-4, RD-6)
Not reached. HITS line seen: `HITS ctl redirect=0 blocked=1` (RD-CTL).

## liveB: not run (liveA exited 2). RD-0 toggle read: `TOGGLE reading on`.
## Earlier-attempt scans: not run (RD-LOGS never ran; STOP = return).
## Evidence copies: none (RD-LOGS scan did not run; no console-evidence.txt written).
## Records
Renamed S4-run-record.md -> S4-live-run5A-record.md (83 lines; no user-name/AppData match in it).
## Leftovers
%TEMP%\bridge-e2e\s11b still holds r17-globals.clixml, state.json, wave\, found\, console.txt (runner's stop did not run teardown; a teardown block run is needed before another liveA).
Own servers 8081, 8083, 8085-8089, 8091 stopped; netstat shows only TIME_WAIT entries; no wave process left.
