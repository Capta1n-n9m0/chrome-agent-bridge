# S5-drivers-C3 fixer, round 1: liveC20's entry script and blocks

Model and effort: Sonnet 5.5, medium. Nothing ran against Chrome, a daemon, a port, UIA or a live run. The one script run was `s13-r20-c.ps1 -Block plan`.

## 1. Verdict
DONE. F1, F3, F4 fixed; F5 left with the reason below; F2, F6, F7 not touched (handoff).

## 2. Outputs
- `recipes/s13-r20-c-defs.ps1` (+11 lines): `Get-R20CServeDefs <file>` reads exactly `Test-R20NodeAlive` and `Invoke-R20Serve` from a file with `Get-R18Defs` and returns their two texts; a missing one throws `<name> was not read from <file>`.
- `recipes/s13-r20-c.ps1` (+2 lines, one comment edit): right after Run 17's block loads, `$r20Serve = Get-R20CServeDefs (Join-Path $PSScriptRoot 's13-r20-b-defs.ps1')` inside a try whose catch prints `STOP: the serve step's functions were not read: ...` and `exit 2` (before any state change: nothing has run yet), then `foreach ($r20S in $r20Serve) { . ([scriptblock]::Create($r20S)) }` at top level. Slice B's file is read through the parser only, never dot-sourced, so `Format-S9Title` and `R19Xk` are untouched.
- `recipes/test/s13-r20-c-ps.test.ts` (+30 lines): the entry-text test no longer says "b-defs not mentioned"; it asserts b-defs is never dot-sourced (`^\. .*s13-r20-b-defs`), that the loader call and the top-level load loop are present, and that the load precedes `Register-R20Blocks`. The harness now dot-sources `s12-r18-lib.ps1` (as the entry script does). Three new PowerShell cases and one `it`:
  - `serveNoLoad`: without the load step `Invoke-R20Serve` is undefined and `Invoke-R19StepB @{k='serve'}` throws `CommandNotFoundException` (the F1 defect itself).
  - `serveLoad`: `Get-R20CServeDefs` on the real `s13-r20-b-defs.ps1` returns 2 texts; after the entry script's own loop, one real serve step through `Invoke-R19StepB` answers `a` (`PRESSED a=A1`), no answer for the absent `b`, no throw, and `Format-S9Title` is not overridden (`S13PriorFormatTitle` unset).
  - `serveMissing`: a file lacking `Invoke-R20Serve` throws `Invoke-R20Serve was not read from nob.ps1`.
- Counts: `npm test` and the other exit checks are listed in section 3. File count unchanged (251); slice tests 31 -> 32 in `s13-r20-c-ps.test.ts`. The slice is now about 700 lines incl. tests (about 13 code lines added, about 30 test lines).

## 3. Exit checks
`npm test`: 251 files, 6013 passed (before 6012 / 251; +1 test, none removed). `npm run typecheck` 0; all eight `recipes/tsconfig*.json` 0; `npm run build` 0; `node scripts/doc-check.mjs` 0; `-Block plan` exit 0 with the order unchanged. `git status --short`: the slice's files and the reports only (the fixer report is new).

## 4. Per finding
- **F1 CRITICAL, fixed.** Red proof, on a copy outside the main tree (`<scratchpad>/red/recipes/*.ps1`, no `node_modules`, with the new loader and entry lines removed, run under the main tree's vitest with `S13_R20_REPO`): 2 failed / 30 passed: the entry-text test and the serve-step test (`NOSERVE CommandNotFoundException` and `TEXTS 2` absent). In the tree: 32 passed. The copy was deleted.
- **F3 MINOR, fixed in §8** (code is as meant: `Get-R20CDevtCount` counts every `^DevTools` window but the capture, on any page). Now a plain prerequisite.
- **F4 MINOR, fixed in §8** (the as-built order is stated). Proposed dated note for §4.28, for the session agent (I did not edit the e2e plan):
  > 2026-10-30 note on §4.28 (all slices): "every DevTools window closed (the capture last) and counted by UIA" is run as built: R20-RESTORE counts every DevTools window but the wave's worker-console capture, R20-LOGS then saves the capture (`Save-R19Seg 'end'`), and the capture is closed at teardown or at a STOP (`Close-S16Windows`). That order is the only one that lets R20-LOGS read the capture. (C3 verifier F4.)
- **F5 NIT, left.** FLAG is its own block after `r20-0c` in the order, and the readable-side record order is `DOCK`, `CHECK gate-dock side-readable=yes`, then `FLAG`, as §4.28 and the §8 "Expected first record lines" write it. Printing FLAG before gate-dock would move FLAG ahead of `CHECK gate-dock` on every run, not only the unread-side one. Not cheap without changing a documented order, so it stays; with an unread side the five NOT RUN rows precede FLAG. No verdict changes.
- **F2, F6, F7: no code change.** Handoff: F2 needs the session agent's ruling before liveC20 (an unread found side ends the slice with STOP `not-restored` before R20-LOGS even though nothing changed; option: NOT MEASURED "found side unread, nothing changed" when no dock change ran, STOP only when one did). F6: SWEEP-HELD reloads after a RECORD control, no verdict effect. F7: after a STOP in a DEVT row the dock preference may stay changed; §8 says so.

## 5. Corrected §8, How to run liveC20 (supersedes the builder's)

**Ready to run** once this stage's commit and the session agent's bookkeeping are committed.

- **Command.** From the repo root, from **Git Bash**, **in the background** (a slice outlasts the 600 s tool cap):
  `S11_OUT=<fresh dir outside the repo> powershell.exe -NoProfile -ExecutionPolicy Bypass -File recipes/s13-r20-c.ps1 -Block liveC20`
  - A later attempt: `-Att <k>` with a fresh `S11_OUT`. `-Block plan` prints the order and runs nothing.
  - `-Block teardown -Att <k>` cleans up after the slice or a return; run it with the attempt's own `S11_OUT`.
  - Exit codes: 0 done, 2 STOP, 3 not run. Before the first state change the entry script itself can print `STOP: ...` and exit 2 (a Run 17 block or the serve step's two functions not read from their files): fix the file, run again.
- **Prerequisites:**
  - A clean tree at a committed HEAD, then `npm run build`, then `recipes/reload-extension.ps1` (one re-run on exit 2).
  - Chrome running with the extension loaded and its toolbar button pinned; JavaScript on and armed, as found; ideally started with `--enable-unsafe-extension-debugging` (the `FLAG` line records it; without it the Stage 0 controls may not hold, which the rows' own control reads settle).
  - Port 9234 free or held by the daemon; **port 8081 free** (the preflight refuses any other port).
  - Window X is the wave's window W, in front, showing the Run 17 fixture page; nobody else uses the machine's keyboard and mouse.
  - **No DevTools window of the user's own may be open during the slice, on any page.** R20-RESTORE and the slice-end count take every window titled `DevTools...` except the wave's own worker-console capture; one of the user's, on any site, is printed as `devtools=1` and is the STOP `devtools-left-open`. Close it before starting. Network is not needed (no old build).
- **Expected first record lines (R20-0C):** `MANIFEST ...`, exactly `LOADED20 keys=page nested=page elem=page perm=yes listener=yes enabled=yes args=answered`, R20-0's remaining lines, `HEAD <sha> tree=clean`, the S4 line, `ROW R20-0C PASS slice=C`, then `DOCK R20-0C side=<bottom|right|left|undock|unread>`, `CHECK gate-dock side-readable=yes` (or the five `ROW ... NOT RUN — dock side unreadable, it could not be restored` lines, which then come before `FLAG`), then `FLAG debugging-flag=<yes|no|unread>`.
- **Where the record lands:** `docs/plans/2026-10-29-step13-phase-f-followups-steps/S13-live-record-liveC20.txt` (`-att<k>` for a later attempt). In `S11_OUT`: the console segments `console-liveC20-<k>.txt` (one more after SWEEP-HELD's reload), `actors-liveC20.jsonl`, the scan inputs.
- **The worker-console capture window.** The wave opens it at the start. It is saved at R20-LOGS (and once more around SWEEP-HELD's reload), and it is **closed only at teardown or at a STOP**, as in slices A and B, not in R20-RESTORE: R20-LOGS must still read it. R20-RESTORE's DevTools count leaves it out. After a STOP or at the end, run `-Block teardown` so it closes.
- **What each STOP return means** (every `STOP <reason>` is followed by `RETURN <seq> after-stop=<reason> restored=... readback=...`):
  - `build-not-loaded`, `extension-disabled`, `reload-failed` (R20-0C, before any state change): rebuild and reload, new attempt.
  - `devtools-left-open` (a DevTools window or pane still open after a row, a close that could not be read, or any DevTools window of the user's at R20-RESTORE or the slice end): close it only with the user.
  - `dialog-left-open`: a native dialog on a wave window; close it only with the user.
  - `old-build-left-loaded` (SWEEP-HELD: the build proof after the reload failed): check which build is loaded before anything else.
  - `not-restored`: the safety read-back differs, or the dock side read back differs from `DOCK R20-0C` (the record's `CHECK R20-RESTORE found-side=<s> read-back=<s>` names the found side: set it by hand in a tab's DevTools, then Customize and control, Dock side). Never retry past it. If `restored=no`, run neither teardown nor a re-run.
  - `text-leak` (R20-LOGS): escalate; do not commit the record.
  - `throw-after-state`: a helper or environment throw after the first state change, including a hung actor (`no ready signal for serve within the bound (120 s)` or `serve exceeded its budget of 600 s`) and a refused gate; the restore ran first. Read the actor's capture in `S11_OUT`, fix a helper only between rows, teardown, new attempt.
  - After any STOP in a DEVT row the dock preference may stay changed: take it from the `DOCK R20-0C` line.
- **NOT RUN outcomes** (printed by the actor from the sheet's own words): the five rows `R20-DEVT-UNDOCK`, `R20-DEVT-EARLY`, `R20-UP-DEVT`, `R20-KEEP-4`, `R20-SWEEP-HELD` when the side is unread; the three conditional rows plus the finding line (or its counts) when no DEVT leg refused. Both are recorded, never a pass; the wave goes on to R20-RESTORE (which then reads the dock side back and, for an unread found side, stops: proposed decision 2, open, F2). A leg that ends NOT MEASURED, NOT DISCRIMINATING or RECORD is recorded.
- **Resume after a return:** run `-Block teardown -Att <k>` with that attempt's own `S11_OUT`; fix a helper only between rows, never past a STOP line; a new attempt takes `-Att <k+1>` and a fresh `S11_OUT` (at most three per slice). **Exception:** after a RETURN that reads `restored=no`, run neither teardown nor a re-run; return to the user.

## 6. Proposed Key-files line (recipes/CLAUDE.md; supersedes the builder's)
`s13-r20-c.{ts,ps1}` and `s13-r20-c-defs.ps1` (slice C's actor, entry script and blocks: the DEVT and conditional rows, FLAG, R20-RESTORE's dock read-back; the entry script reads `Invoke-R20Serve` and `Test-R20NodeAlive` from `s13-r20-b-defs.ps1` with the parser and never dot-sources that file whole, C3 fixer 1), added to the Step 13 S5 list. `s13-r20-c-ps.test.ts` runs a real serve step through that load path.

## 7. Deviations, decisions
None. Proposed decisions: none beyond the F4 dated note above.

## 8. Handoff
F2 needs a ruling before liveC20. The F4 note goes on §4.28. Slice B's files were not touched. The builder's finding 1 (slices A/B print `DIALOGS liveA20`/`liveB20` where §4.28 writes `DIALOGS B ...`) is still the session agent's. Nothing is running; the red copy was deleted.
