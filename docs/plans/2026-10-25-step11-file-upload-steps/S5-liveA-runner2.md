# S5-liveA runner report, second run (Run 16)

Model: Sonnet 5.5, effort medium.

## 1. Verdict
All eight blocks ran, each exit 0, no STOP line. Rows added: SW-2 PASS, UP-RESTORE PASS, UP-LOGS PASS (3 scans). NOT committed: the evidence scan exits 2 (section 6).

## 2. Row lines added (from S5-run-record.md)
- ROW SW-2 PASS: measured as pre-written: the event ends the wait
- CHECK SW-2 visibility log PASS: RECORD: visibilitychange events w=8 sw=8 (4 trials)
- ROW UP-RESTORE PASS: armed, evaluate, block list and Upload folders equal to UP-0 by count and hash
- CHECK UP-RESTORE stored PASS / CHECK UP-RESTORE daemon PASS (daemon.status armed and evaluate equal the found state)
- ROW UP-LOGS PASS: all counts zero (three times, one per scan)
- CHECK setup (22 opened tabs T1667..T1688) PASS; console block: worker console window opened, 317 texts written to console.txt.

## 3. SW-2
PLACE W work area [1920,0,3840,1080] cut clear of the taskbars to [1920,0,3840,1070]. Guard: occluders total=0 foreign=0 (no STOP, so no OCCLUDER lines).
Per-trial lines:
- warm-up (trial 0, excluded): (i) background ok 1313 ms, (ii) front ok 543 ms, d=770 ms
- trial 1: background 1491 ms, front 1515 ms, d=-24 ms
- trial 2: background 1541 ms, front 1446 ms, d=95 ms
- trial 3: background 1557 ms, front 1489 ms, d=68 ms
measured 3/3 trials; d=[-24, 95, 68] ms; outcome read off the table unchanged: the event ends the wait (the pre-written PASS). The warm-up is recorded and excluded (S5.7).

## 4. Restore read-back (S5.4)
RESTORE armed=equal evaluate=equal blocklist lines=0 hash=equal uploadfolders lines=0 hash=equal (stored page equal true, daemon.status equal true, title armed true). Found texts deleted after the match. Nothing printed but counts and equality.

## 5. UP-LOGS scans (S5.6)
SCAN console: ://=0 (fixture 0, other 0) token=0 sentinel=0 profile=0
SCAN daemon: ://=0 (fixture 0, other 0) token=0 sentinel=0 profile=0
SCAN actors: ://=1 (fixture 1, other 0) token=0 sentinel=0 profile=0

## 6. Evidence scan (s11-evidence.ts), exit 2
EVIDENCE S5-run-record.md: ://=22 (fixture 19, other 3) token=0 sentinel=0 profile=0
EVIDENCE S5-liveA-framing2.txt: ://=2 (fixture 2, other 0) token=0 sentinel=0 profile=0
EVIDENCE S5-liveA-daemon.txt: ://=0 (fixture 0, other 0) token=0 sentinel=0 profile=0
The 3 "other" in the record: I scanned the new record lines one by one; they are exactly the three new `SCAN console/daemon/actors: ://=...` lines (the literal text "://=" the helper itself prints, no host). Not a leaked URL, but the rule says commit nothing if any count is non-zero, so NOTHING WAS COMMITTED. The step agent decides (a scanner/SCAN-line format fix, or an accepted note). Files left uncommitted: S5-run-record.md (modified), S5-liveA-framing2.txt (58 lines, timestamped after 04:30Z, plus the untimestamped CHECK lines that follow them), S5-liveA-daemon.txt (copy of daemon-slice.txt), this report.
Note: the framing file's first run STOP lines (04:18) are before the cut and not in framing2.

## 7. STOP lines
None. (S5.5: no STOP to match; every block exit 0.)

## 8. UTC start/end per block
servers 04:38:37-04:38:39; window 04:38:44-04:38:47; setup 04:38:51-04:39:01; console 04:39:06-04:39:09; sw-2 04:39:09-04:39:42; up-restore 04:39:46-04:39:56; up-logs 04:39:56-04:39:59; teardown 04:40:03-04:40:05. Blocks were run in the foreground of one Bash call each (all under 40 s), not as background markers.

## 9. State at the end
Teardown: windows 1247618, 1772906, 921224, 2689826 closed; own servers srv8081 and srv8084 stopped; globals removed (r16-globals.clixml gone); wave folder and state.json removed. PIDs left: none of the wave's (node 22152/26292 and python 22096 are not the wave's; 22096 was named as foreign). No code edits, no Chrome restart, file-URL toggle untouched.
