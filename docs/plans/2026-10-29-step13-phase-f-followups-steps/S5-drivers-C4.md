# S5-drivers-C4: #416's three pre-run notes and the driver changes

Step agent: Claude Opus 5.5, medium effort. Builder and fixer: Sonnet 5.5, medium. Verifiers: Opus 5.5, medium.
Children's reports are in this directory: `S5-drivers-C4-builder.md`, `-verifier.md`, `-fixer1.md`, `-verifier2.md`.

## 1. Verdict
DONE. Decision #416 is applied as worded, before any liveB20 or liveC20 observation.

## 2. Outputs
- **The notes:** `docs/e2e-test-plan.md` §4.28 gets three dated notes (2026-10-30, citing #416). They sit after the #407
  addendum's table and before "## 5.". The diff only adds lines (6 added, 0 removed), and no existing row or note changed.
- **(1) The dock verdict:** `dockRestoreVerdict(found, readback, changed)` (`recipes/s13-forms.ts`) returns NOT MEASURED
  when the found side is unread and no dock change ran. In every other case it works as before. `lineCmd20 dock`
  (`recipes/s13-r20.ts`) reads `--changed`, and only exactly `no` counts as no change. The flag
  `$global:R20CDockChanged` (`recipes/s13-r20-c-defs.ps1`) is reset in `Register-R20CBlocks` and set before every call
  that can change the dock side:
  - `Open-R20CDevt` when it is given a side;
  - KEEP-4's pre-open;
  - `Restore-R20CDock`'s own Set.
  
  The node call's NOT MEASURED path exits 0, so the slice goes on to R20-LOGS. An unread or different side after a dock
  change is still exit 2, the STOP `not-restored`.
- **(3) DIALOGS B:** `Invoke-R20Restore([string]$Label = '')` and a new `Write-R20Dialogs $Label` (`recipes/s13-r20.ps1`)
  use the same counts and the same two STOPs as Run 19's `Write-R19Dialogs`. Slice B passes `'B'`
  (`recipes/s13-r20-b-defs.ps1:89`). Slice A passes no label, so it behaves exactly as before and its tests are unchanged.
- **(4) The capture order (#416 item 2):** slice C already does it this way, and nothing was changed:
  - R20-RESTORE's DevTools count leaves the capture out: `recipes/s13-devt.ps1:63-65` (`Get-S13Titles` skips
    `$global:D`) and `recipes/s13-r20-c-defs.ps1:156`.
  - R20-LOGS saves the capture: `Invoke-R20Logs` in `recipes/s13-r20.ps1` (about line 258).
  - A STOP closes it in `Close-S16Windows` (`recipes/s11b-r17.ps1:321-324`), and teardown calls the same function
    (`recipes/s11b-r17.ps1:862`).
- **Tests:** written first. Four tests failed before the change, and verifier 1 re-proved five red on a scratch
  worktree with its own `npm ci`. Verifier 2 proved the DIALOGS B test red on a scratch copy with no `node_modules`.
- **Counts:** `npm test` went from 6013 passed in 251 files to 6016 passed in 251 files. Each verifier re-derived the
  count. `npm run typecheck`, all eight `recipes/tsconfig*.json`, `npm run build` and `node scripts/doc-check.mjs` each
  exited 0.
- **Size:** about 90 changed lines of code and tests, within the cap of 200.

## 3. Verifier verdict
- Verifier 1 gave PASS-with-notes (`S5-drivers-C4-verifier.md`) with three findings:
  - F1 (MINOR): the note did not name the leg-note line.
  - F2 (MINOR): no test caught a missing `'B'`.
  - F3 (NIT): capitalisation.
- Fixer 1 fixed all three (`S5-drivers-C4-fixer1.md`). This was fix round 1 of 3.
- Verifier 2 gave **PASS** (`S5-drivers-C4-verifier2.md`), with no new finding.

## 4. Deviations
**The line form of the NOT MEASURED case.** `Get-R19Verdict` (`recipes/s12-r19-lib.ps1:21,35`) reads only `ROW` lines,
so a CHECK line alone cannot make the row NOT MEASURED. The node call therefore prints three lines:
- `DOCK R20-RESTORE side=<rb>`;
- `CHECK R20-RESTORE found-side=unread read-back=<rb> NOT MEASURED found side unread, nothing changed`;
- the leg note `ROW R20-RESTORE dock NOT MEASURED found side unread, nothing changed`.

The row's own line is `ROW R20-RESTORE NOT MEASURED slice=C`. The record aggregator does not count the leg note as a
row. This is the same kind of line as R20-POP-OTHER's `unjoined` leg note. The §4.28 note states this form, and
verifier 1 judged it acceptable.

## 5. Proposed decisions
None beyond the line form above. It is design-local and is recorded in the dated note.

## 6. Findings
No new runtime fact.

## 7. Handoff and runner notes
Nothing was started and no process is left running. Per the brief, S5-drivers-C.md and S5-drivers-B4.md are committed
records and stay unedited. The runner reads their §8 with these corrections:

**S5-drivers-C.md §8**
- **"Ready to run":** the line should end "…and #416's notes are committed (F2 is ruled)."
- **The `not-restored` bullet** should read: "`not-restored`: the safety read-back differs, or the dock side read back
  differs from `DOCK R20-0C`, or it is unread AND a dock change ran in the slice (#416)." If R20-0C's side is unread and
  no dock change ran, R20-RESTORE is NOT MEASURED instead.
- **The "NOT RUN outcomes" bullet** should add: "When the side is unread, R20-RESTORE prints the `DOCK`, `CHECK … NOT
  MEASURED found side unread, nothing changed` and `ROW R20-RESTORE dock NOT MEASURED …` lines, and the slice goes on
  to R20-LOGS." The `dock` line is a leg note that the aggregator does not count. The row's own line is
  `ROW R20-RESTORE NOT MEASURED slice=C`.

**S5-drivers-B4.md §8**
- Nothing there is wrong. liveB20's R20-RESTORE now prints `DIALOGS B native=0 devtools=0 wave-windows-open=0`.

**liveA20's record**
- Its `DIALOGS liveA20 …` line is read as `DIALOGS A` (#416 item 3).
