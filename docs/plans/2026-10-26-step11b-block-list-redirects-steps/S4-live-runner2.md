# S4-live runner 2 (Run 17, attempt 2) — STOPPED at liveA's preflight guard

Commit under test: 041ea89. `-Block plan` printed the order (liveA: preflight servers files window reload console rd0 ... rd-logs teardown; liveB: preflight ... rd0 root-add f-raw ... rd-logs teardown; "PLAN not built:" empty).

## liveA — exit code 2 (STOP), block liveA, step preflight
Output (whole of it):
- `BLOCK preflight start`
- `STOP: a previous wave's globals exist; run -Block teardown first (at 2026-10-27T00:46:53.595Z)`
- `STOP: the wave ended (an exception in block liveA (RuntimeException)) (at 2026-10-27T00:46:53.629Z)`

Cause (reading, not a verdict): `recipes/s11b-r17.ps1:381` refuses when `%TEMP%\bridge-e2e\s11b\r17-globals.clixml` exists. Attempt 1's STOP left it (a copy is in run1\, 04:38), and the file at s11b\ is stamped 04:46, so my `-Block plan` call (or the saved globals of a prior block) re-wrote it. The STOP procedure of attempt 1 did not remove it. The guard names `-Block teardown` as the remedy; I did not run it (rules: return on STOP, never re-run a block, the step agent decides). Likely helper defect/gap: neither `plan` nor the STOP path clears the globals file, so an attempt after a STOP cannot start without a manual `-Block teardown`.

## State
Nothing was changed: the guard fired before any server, window, reload or state read. No restore needed; no RESTORED line printed. Safety state untouched. The runner wrote no S4-run-record.md (none in the steps dir).

## Rows / D4.3 / RD-0 / RD-RESTORE / RD-LOGS
None ran. No row ids to report. liveB: not started (liveA did not exit 0). Attempt-1 log scans: not done (they follow liveA's RD-LOGS, which did not run).

## Evidence
None copied.

## Process and port check
`netstat -ano` listening on 8081-8091: none. No runner/server/actor process of mine left. `git status`: only the pre-existing S4-live.ledger.md modification and the two attempt-1 files; this report is new.

Output file: %TEMP%\s4live-run2-liveA.out
