# S5-liveA live runner report

Model: Sonnet 5.5, effort medium. UTC: first launch 04:18:20Z, last launch 04:18:55Z (approx), wave ended 04:20:42Z.

## 1. Verdict
**ESCALATE.** liveA exited **2** (STOP). Nothing committed: the scan found 2 non-fixture `scheme://host` hits (see 6).

## 2. Outputs
- `npm run build` in the main tree: ok (daemon, mcp, extension built); tracked tree afterwards only `journal.md`.
- Record (uncommitted): `S5-run-record.md` (179 lines). Framing copy (uncommitted): `S5-liveA-framing.txt`.
- `S5-liveA-daemon.txt`: NOT written. `daemon-slice.txt` was never produced by the runner.
- Launch history: the first launch via the PowerShell tool exited 2 at preflight ("python was not found": that tool's PATH has no miniconda; Git Bash has it). It left a globals file; the second launch stopped at preflight on it; `-Block teardown` cleared it (exit 0, nothing live had happened); the third launch, from Git Bash, is the real run. The framing file therefore starts with these two preflight lines. No file was edited.

## 3. Row tally (from the record)
- PASS: UP-L1, UP-7 (a, b, c), SAVE-REFUSE-R sdk-leg, SAVE-REFUSE-R mcp-leg.
- FAIL: UP-OPT (one clause, `o2-follows`: "O2 took 6061 ms or showed a conflict note"); UP-6 (all five checks: "banner seen on a refusal").
- RECORD: UP-FA, not run, "the toggle is on". UP-0: plan check PASS, liveB runs.
- NOT RUN (stopped before): SW-2, UP-LOGS, the rest. UP-RESTORE ran inside the stop path (see 5).
- NOT MEASURED: none recorded.
- SW-2 outcome: no measurement. The occluder guard fired first (`GUARD 3 foreign occluder(s) above window`).
- Found file-access state: **ON** (UP-0 plan: "the toggle is on"). I never touched the toggle.

## 4. Restore read-back
The runner's own lines: stored page equal true, daemon.status equal true, block list and Upload folders hash=equal (both 0 lines, found = armed true, JavaScript true), then `title armed false`. So the safety state itself read back equal by hash; only the toolbar-title check failed.

## 5. STOP lines (in order)
1. `GUARD 3 foreign occluder(s) above window ... (SW-2)`: the SW-2 guard, run without read areas, as S5-runner §9 predicted (Chrome's own topmost popups).
2. `the toolbar title does not read armed; the press pair is not sent`.
3. `RESTORE FAILED: the safety state is not the found state; nothing more is pressed`.
4. `the restore failed or printed a STOP during the stop procedure; the wave is over`.
5. `the wave ended (an exception in block liveA)`.
How it returned: I did not continue or fix. Windows and own servers were closed by the runner's stop procedure. Likely cause of (2) and (3), not verified by a fix: the toolbar button's accessible name now reads "Chrome Agent Bridge - armed (click to turn off)" followed by a newline and "Has access to this site" (the file-access/site-access line), so the exact-equality title check against `$S9TitleArmed` in `recipes/s9-win.ps1:179` fails although the name starts with the right text. That is a helper defect, but it was found after crossing a STOP, so I did not fix it.

## 6. Scan counts (record + framing)
- token: 0. profile path (both forms): 0. sentinel folder name pattern `s11-<12 hex>`: 0.
- non-fixture `scheme://host`: **2**, both `chrome://extensions` (the browser's own page, in lines saying a wave window "now shows" it; one with `?id=` of the extension). The 15 `extension://...` hits are the extension's own chrome-extension id. Per the brief, any non-zero count means no commit.

## 7. Deviations
None to the lane. No set-up fix was made. Commit not made, per the scan rule.

## 8. Proposed decisions
For the session agent: whether `chrome://extensions` is acceptable evidence (it is the browser's own page, not a user tab) so the record can be committed; whether to fix the title check (a prefix/StartsWith match in the s9/s11 helpers, with a test) and the SW-2 occluder guard before re-running the liveA remainder.

## 9. Handoff
- Chrome is untouched by kill or restart. Own windows closed, own servers stopped (8081, 8084 free). Port 9234 held by PID 17832, which I did not identify as the daemon (not touched).
- State left on disk: `$env:TEMP\bridge-e2e\s11\` including `r16-globals.clixml`; the next run needs `-Block teardown` first.
- The user may need to check the toolbar/options state by eye once; the stored state reads equal.
- Uncommitted: S5-run-record.md, S5-liveA-framing.txt, this report, S5-liveA.ledger.md (the step agent's), journal.md (the session agent's).
