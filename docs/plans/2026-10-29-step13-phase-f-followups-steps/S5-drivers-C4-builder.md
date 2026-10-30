# S5-drivers-C4 builder report (Sonnet, effort medium)

## 1. Verdict
DONE. Nothing committed, nothing run against Chrome, a daemon or a port.

## 2. Outputs
Changed files:
- docs/e2e-test-plan.md: three dated notes (the three items of #416) between the #407 table and "## 5." No existing row or note edited.
- recipes/s13-forms.ts: `dockRestoreVerdict(found, readback, changed)` returns `"PASS" | "STOP not-restored" | "NOT MEASURED"`.
- recipes/s13-r20.ts: `lineCmd20` reads `--changed`; strict (only exactly `no` means nothing changed).
- recipes/s13-r20-c-defs.ps1: flag `$global:R20CDockChanged`, set before every dock-changing call; `Restore-R20CDock` passes `--changed yes|no`.
- recipes/s13-r20.ps1: new `Write-R20Dialogs([string]$Label)`; `Invoke-R20Restore([string]$Label = '')`.
- recipes/s13-r20-b-defs.ps1: `Invoke-R20BRestore` calls `Invoke-R20Restore 'B'`.
- Tests: recipes/test/s13-forms.test.ts, s13-r20-c-ps.test.ts, s13-r20-b-ps.test.ts.

Counts: npm test 251 files, 6016 passed (start 6013 / 251; +3). `npm run typecheck` exit 0. All eight recipes/tsconfig*.json exit 0. `npm run build` exit 0. `node scripts/doc-check.mjs` exit 0. About 70 new lines of code and tests, plus the three notes.

## 4. Deviations
- The brief asked for a CHECK line carrying NOT MEASURED to drive the row verdict. `Get-R19Verdict` (recipes/s12-r19-lib.ps1:35-44, regex `$R19VerdictRe` at :21) reads only lines that start with `ROW <id> [up to two tokens] <VERDICT>`; a CHECK line is never judged. A CHECK alone would leave R20-RESTORE decided by the other ROW lines (`ROW RD-RESTORE PASS`, so PASS) or, with none, NOT MEASURED by accident. So the NOT MEASURED exit prints three lines, and the third is the one the verdict reads:
  `DOCK R20-RESTORE side=<rb>`
  `CHECK R20-RESTORE found-side=unread read-back=<rb> NOT MEASURED found side unread, nothing changed`
  `ROW R20-RESTORE dock NOT MEASURED found side unread, nothing changed`
  The `dock` token fits the regex's optional tokens (the same shape as `ROW R20-POP-OTHER unjoined NOT MEASURED ...`). The rank order (s12-r19-lib.ps1:20) takes the worst line, so NOT MEASURED beats the other PASS lines, and `Write-R19RowLine` then prints `ROW R20-RESTORE NOT MEASURED`. `aggregateRows20` (s13-r20.ts:49-61) does not count the note as a row (its verdict regex needs a verdict word right after the id), so there is no "row printed twice" warning. Exit 0, so `Invoke-R19Node` returns 0 and the block goes on to `Invoke-R20RestoreCheck`, `Write-R20CDialogs`, then R20-LOGS.

## 5. Proposed decisions
None. A design-local choice, listed for the verifier: `Write-R20Dialogs` is a copy of `Write-R19Dialogs` (Run 19's file is read-only) that takes the label; slice A keeps calling `Write-R19Dialogs` (label empty), so its tests and recorded form are unchanged.

## 6. Findings
Red-proof (before the code change, tests already written):
- s13-forms.test.ts "#416: an unread found side with no dock change is NOT MEASURED..." failed with `expected 'STOP not-restored' to be 'NOT MEASURED'`.
- s13-r20-c-ps.test.ts "#416: found unread and --changed exactly no is NOT MEASURED..." failed with `expected { lines: [ …(3) ], exit: 2 } to deeply equal { lines: [ …(3) ], exit: +0 }`.
- s13-r20-c-ps.test.ts "#416: an unread found side with no dock change goes on..." failed with `expected [ 'FLAG0 True', …(10) ] to include 'FLAG0 False'` (the old restoreUnread-style run stopped; the flag did not exist).
- s13-r20-c-ps.test.ts "R20-RESTORE: Open, Set to ..." (the node line now ends `--changed yes`, since the restore's own Set sets the flag) failed on the exact list; I updated its expected line.
- DIALOGS B: its test (`restoreLabel` T in s13-r20-b-ps.test.ts, asserted in the "restore" `it`) was written first, but I applied the PowerShell change in the same step as the TS changes, so I did not run it red. Before the change the same path printed `--slice liveB20` through `Write-R19Dialogs` (s12-r19-c.ps1:59); the test pins `--slice B`, and also pins that no label still prints `--slice liveB20`. A verifier can prove it red by removing the `'B'` at s13-r20-b-defs.ps1:89.

Flag set points (recipes/s13-r20-c-defs.ps1): reset to `$false` in the globals line (:6) and in `Register-R20CBlocks`; set `$true` in `Open-R20CDevt` when `$Side` is non-empty (:34); in KEEP-4's `-Pre` before its `Open-S13DevTools` with a side (:120); in `Restore-R20CDock` before `Set-S13DockSide` (:171). Not set: R20-0C's plain open (:70) and the read-back open (:172). The grep found no other `Open-S13DevTools` or `Set-S13DockSide` call in s13-r20-c-defs.ps1 or s13-r20-c.ps1. The set-before-call is tested: `Open-R20CDevt ''` leaves it False, `'undock'` sets it, Register resets it, KEEP-4 sets it before its row, and the restore's own set leaves True.

Verdict-line tests: found unread plus `--changed no` gives the three lines above with exit 0. Missing, empty, `No`, `false`, `yes` give exit 2. Found `left` read back `bottom` with `--changed no` still gives exit 2.

Item 4, the capture order in slice C (confirmed, nothing changed):
- R20-RESTORE's count leaves out the capture: `Get-S13Titles` skips `$global:D` (recipes/s13-devt.ps1:63-65); `Get-R20CDevtCount` (s13-r20-c-defs.ps1:156) uses it; `Write-R20CDialogs` (:157-164) prints and judges it.
- R20-LOGS saves it: `Invoke-R20Logs` (recipes/s13-r20.ps1, `function Invoke-R20Logs` at about :258, first call `Save-R19Seg 'end'`); registered for slice C at s13-r20-c-defs.ps1:195.
- Teardown or a STOP closes it: a STOP goes through `Close-S16Windows` (recipes/s11b-r17.ps1:321-324, which closes `$global:D` and `$global:E`), after the stop path saves it with `Save-R19Seg 'end'` (recipes/s12-r19-lib.ps1:82). The teardown block (s11b-r17.ps1:862) also calls `Close-S16Windows`; slice C reuses it through `Set-R19Reused` (s13-r20.ps1:128).

Runner notes (item 5; I did not edit these files):
- S5-drivers-C.md §8, the line "**Ready to run** once this stage's commits and the session agent's bookkeeping are committed, and F2 is ruled." now reads: "...and #416's notes are committed (F2 is ruled)."
- §8, the `not-restored` bullet reads "...or the dock side read back differs from `DOCK R20-0C` or is unread (see F2, §5)." and is wrong now. Corrected: "`not-restored`: the safety read-back differs, or the dock side read back differs from `DOCK R20-0C`, or it is unread AND a dock change ran in the slice (#416). With R20-0C's side unread and no dock change, R20-RESTORE is NOT MEASURED instead (below). The line `CHECK R20-RESTORE found-side=<s> read-back=<s>` names the found side..."
- §8, the "NOT RUN outcomes" bullet ends "...and the wave goes on to R20-RESTORE." Add: "With an unread side, R20-RESTORE prints `DOCK R20-RESTORE side=<s>`, `CHECK R20-RESTORE found-side=unread read-back=<s> NOT MEASURED found side unread, nothing changed` and `ROW R20-RESTORE dock NOT MEASURED ...`, its row is NOT MEASURED \"found side unread, nothing changed\", and the slice goes on to R20-LOGS (#416)."
- S5-drivers-B4.md §8 has no DIALOGS line, so nothing there reads wrong. Runner note to add: liveB20's R20-RESTORE prints `DIALOGS B native=0 devtools=0 wave-windows-open=0`.
- The record of liveA20 holds `DIALOGS liveA20 ...`; read it as `DIALOGS A` (#416 item 3).

## 7. Handoff
No processes started. The tree has 8 modified files plus this report, uncommitted. A verifier should check:
- the ROW-line form above;
- that `Invoke-R20Restore`'s `$Label` is read through dynamic scope in the row-block scriptblock (no `GetNewClosure`, so test stubs stay visible);
- that slice A's tests (s13-r20-ps.test.ts) still pass unchanged (they do).
