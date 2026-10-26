# S5-liveB runner report (Run 16)

Model: Sonnet 5.5, effort medium. Runner UTC 05:00Z-~05:10Z. Wave (liveB) 05:01:00Z-05:02:51Z. Exit code: 0. No build run (dist unchanged since liveA; only recipes changed).

## Rows (verbatim, from S5-run-record.md)
ROW UP-1 PASS: all checks hold (SAMPLER UP-1 polls=21, banner=seen; outcome: received on a background tab, hash equal, isTrusted, tab still behind, human's tab unchanged)
ROW UP-2 PASS: all checks hold
ROW UP-3 PASS: all checks hold
ROW UP-4 PASS: all checks hold
ROW UP-5 PASS: all checks hold
ROW UP-6B FAIL: banner seen on a refusal (the five refusal clauses PASS: exact, page untouched; only the banner clause fails)
ROW UP-8 PASS: all checks hold
ROW UP-9 PASS: all checks hold
ROW UP-PATCH PASS: all checks hold
ROW UP-TWICE PASS: all checks hold
ROW UP-RAW RECORD: recorded; no leak; mark balanced, 0 left
ROW UP-NAV RECORD: recorded; the new document saw no mutation, none left
ROW UP-DEVT NOT MEASURED: DevTools was not attached (the call succeeded)
ROW UP-STALE RECORD: recorded; no mark left
ROW UP-7J PASS: all checks hold
ROW UP-RACE-A NOT MEASURED: NOT DISCRIMINATING: the loop saw no ok or no refusal (recorded, not re-run)
ROW UP-RACE-B NOT MEASURED: NOT DISCRIMINATING: the loop saw no ok or no refusal (recorded, not re-run)
ROW UP-RESTORE PASS: armed, evaluate, block list and Upload folders equal to UP-0 by count and hash
ROW UP-LOGS PASS: all counts zero (three times)

## STOP / guard lines
None. The only guard-like lines are PARK notes (cursor parked / "PARK skipped ... no driver window W"), not STOPs.

## Restore read-back
RESTORE armed=equal evaluate=equal blocklist lines=0 hash=equal uploadfolders lines=0 hash=equal (05:02:47Z; stored page equal true, daemon.status equal true)

## UP-LOGS scans
SCAN console: ://=0 (fixture 0, other 0) token=0 sentinel=0 profile=0
SCAN daemon: ://=0 (fixture 0, other 0) token=0 sentinel=0 profile=0
SCAN actors: ://=2 (fixture 2, other 0) token=0 sentinel=0 profile=0

## Evidence scans and copies (s11-evidence.ts, exit 0)
S5-liveB-framing.txt: ://=7 (fixture 7, other 0) clean - copied
S5-liveB-console.txt: ://=0 clean - copied
S5-liveB-daemon.txt: ://=0 clean - copied

## Notes
Slice summary line: "s11.ts calls with a failed check 1, not measured 3". The file-URL toggle was ON (no exit 3). Not committed. UP-6B's banner FAIL and the two race rows are recorded as-is, not re-run.

## State
Teardown done by the script (windows, wave files, own servers, globals). PIDs of mine left: none (the wave ran as a background shell job that has exited; /tmp/liveB.* temp files only).
