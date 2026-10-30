# S5-drivers-C3 verifier: liveC20's entry script and blocks

Model and effort: Opus 5.5, medium. Read and run only. Nothing ran against Chrome, a daemon, a port, UIA on a real window or a live run. The one script run was `s13-r20-c.ps1 -Block plan`.

## 1. Verdict
**FAIL.** One CRITICAL finding (F1): liveC20 cannot run any actor row. Every DEVT and conditional row answers through a `serve` step, and the slice's load set never defines `Invoke-R20Serve`. Everything else is MINOR or NIT.

## 2. Outputs (re-run by me, clean tree apart from the slice's files)
- `npm test`: **251 files, 6012 passed** (exit 0). Before: 250 / 5977. Delta +35 = 31 (`s13-r20-c-ps.test.ts`, new file) + 3 (`s13-r20-c.test.ts`, 26 → 29) + 1 (`s13-devt-ps.test.ts`, 17 → 18). No test was removed. Per file from `npx vitest run`: s13-r20-c-ps 31, s13-r20-c 29, s13-devt-ps 18, s13-r20 24, s13-r20-ps 49, s13-r20-b-ps 32, all green. Slice A/B tests are unchanged and green.
- `npm run typecheck`: exit 0. All eight `recipes/tsconfig*.json` (`json`, `fe`, `s6`, `s9`, `s10`, `s11`, `s11b`, `s13`): exit 0 each.
- `npm run build`: exit 0. `node scripts/doc-check.mjs`: exit 0 (informational sections only).
- `-Block plan`: exit 0, `PLAN liveC20: preflight servers files window reload console r20-0c flag r20-devt-undock r20-devt-early r20-up-devt r20-keep-4 r20-sweep-held r20-restore r20-logs`. This is §4.28's order behind the shared prologue.
- `git status --short`: only the slice's 9 files plus the builder report.
- Size: 592 new lines (71 + 195 PowerShell, 326 test) and 80 insertions / 11 deletions in existing files (the builder says "about 90"). Code is about 266 new PowerShell lines plus about 40 TS lines; tests are about 326 + 45. The overrun past 600 is tests, within 1.5x (agent-rules §7).

## 3. Red proofs and mutants
- TS, by construction: `condFor`, `pickRefusing`, `LEG_ORDER`, the `--phase close` branch and `lineCmd20` are absent at HEAD (`git show HEAD:recipes/s13-r20-c.ts | grep -c …` = 0; the same for `s13-r20.ts` = 0). The new tests import them, so they fail on the pre-slice code.
- PowerShell mutants ran on copies outside the main tree: `<scratchpad>/m1`, `m2`, `recipes/*.ps1` only, no `node_modules`, under the main tree's vitest with `S13_R20_REPO`.
  - m1 (R20-RESTORE's `Set-S13DockSide` removed): 1 failed / 30 passed, the R20-RESTORE test.
  - m2 (`Get-R20CDevtCount` counts only the wave's own windows): 1 failed / 30 passed, the DIALOGS C test.
- The N2 test in `s13-devt-ps.test.ts` pins C1 code that is unchanged (`git diff --quiet HEAD -- recipes/s13-devt.ps1`). It cannot be red on pre-slice code. That is acceptable: it pins existing behaviour, as C1 verifier2 asked.
- **Gap (part of F1):** no test runs a `serve` step through the slice's real load set. Every row test stubs `Invoke-R19Row`, and the entry-text test asserts that `s13-r20-b-defs` is **not** loaded. So the defect in F1 passes the whole suite.

## 4. Findings

**F1 CRITICAL: `Invoke-R20Serve` is undefined in liveC20, so every actor row breaks.**
- Where: `recipes/s13-r20-c-defs.ps1:62,136,149` build `@{ k = 'serve'; … }`. Run 19's `Invoke-R19Steps` (`s12-r19-a.ps1:22`) sends those to `Invoke-R19StepB`, defined at `s13-r20.ps1:183`, which calls `Invoke-R20Serve`.
- Evidence: `Invoke-R20Serve` and its helper `Test-R20NodeAlive` are defined only in `recipes/s13-r20-b-defs.ps1:16,24`. That was a recipes-wide Grep for `Invoke-R20Serve|Test-R20NodeAlive`: the only definitions are in b-defs, plus stubs in `test/s13-r20-b-ps.test.ts`. `s13-r20-c.ps1:23-32` dot-sources s12-r18-lib, s9/s11/s11b/s12 win, s13-r20, s13-devt and s13-r20-c-defs, never b-defs. `test/s13-r20-c-ps.test.ts:196` even asserts `not.toMatch(/…s13-r20-b-defs/)`.
- I tried to run a definitions-only PowerShell probe (dot-source the three s13 files, then `Get-Command Invoke-R20Serve`). The classifier refused it. I did not retry; the finding is proved by construction from the grep.
- What happens live: the first DEVT row's driver throws `CommandNotFoundException` inside `Invoke-R17Node`'s driver try (`s11b-r17.ps1:125`). The actor is killed and the row throws `the driver … threw`. `Invoke-R20CGuarded` closes DevTools and rethrows, so the wave reads STOP `throw-after-state` at R20-DEVT-UNDOCK. If the side is unread, the DEVT rows are gated off; then the first `serve` use is never reached, but nothing measures either.
- Fix: make the serve step shared. Either move `Invoke-R20Serve` and `Test-R20NodeAlive` from b-defs into `s13-r20.ps1` (a shared-file change; slice B's tests must stay green), or define them for slice C in its own load set. Do not dot-source b-defs whole: at load it overrides `Format-S9Title` and resets `R19Xk` (`s13-r20-b-defs.ps1:7-14`). Then add a test that drives one real `serve` step through `Invoke-R19Steps` in the C load set, with `Invoke-R19Row` unstubbed down to the step dispatch, and drop the `s13-r20-b-defs` negative assertion or replace it.

**F2 MINOR: an unread found side ends slice C before R20-LOGS (proposed decision 2).**
- Where: `s13-r20-c-defs.ps1:166-172` with `dockRestoreVerdict` (`s13-forms.ts:168`).
- With `side=unread`, gate-dock stops every row that could change the side. R20-RESTORE still throws STOP `not-restored`, so R20-LOGS never runs and the slice cannot meet R5.5.
- It is the literal reading of the sheet ("a different or unread side is the STOP") and of C1's committed judge, so it is not wrong. But nothing was changed, so there is nothing to restore.
- Suggest: the session agent rules on it before liveC20. One option is a NOT MEASURED "found side unread, nothing changed" when no dock change ran, keeping the STOP whenever a dock change did run.

**F3 MINOR: §8's how-to understates which human DevTools windows trip a STOP.**
- It says "No DevTools window of the user's own on a 127.0.0.1/localhost page".
- `Get-R20CDevtCount` (`s13-r20-c-defs.ps1:156`) counts **every** `^DevTools` window except the capture, on any page. A user's DevTools on any site therefore makes RESTORE print `devtools=1` and STOP `devtools-left-open`.
- Per row, `Close-S13DevTools` also counts any window titled for port 8081.
- Fix the sentence: no DevTools window of the user's own, anywhere.

**F4 MINOR (shared with slices A and B, for the session agent): the capture is not closed in R20-RESTORE.**
- The sheet writes "every DevTools window closed (the capture last) and counted by UIA".
- Slice C, like A and B (`Invoke-R20Restore`), counts without the capture, saves it at R20-LOGS (`Save-R19Seg 'end'`) and closes it at teardown or STOP (`Close-S16Windows`).
- That order is the only one that lets R20-LOGS read the capture, and it matches the STOP rule's "capture … exception until its slice's R20-RESTORE" only loosely.
- Suggest: a dated note on §4.28 stating the as-built order.

**F5 NIT: FLAG prints after gate-dock's NOT RUN rows (proposed decision 1).**
- The slice order is "R20-0C; FLAG; R20-DEVT-UNDOCK …", but with an unread side the five `ROW … NOT RUN` lines come before `FLAG`.
- No verdict changes. Printing the gate-dock rows from the DEVT blocks, or moving FLAG before gate-dock, would follow the order.

**F6 NIT: SWEEP-HELD reloads on a RECORD control.**
- Phase 1's `finish` exits 0 for a RECORD verdict (`s12-r19-a.ts:184`), so an unreadable control still costs a reload and phase 2.
- The row stays RECORD through `Complete-R19Row`, so the verdict is right; only the reload is avoidable.
- The `--phase close` actor branch has no TS test (async glue). The PS test checks only that it is called.

**F7 NIT: after a STOP in a DEVT row, the dock preference stays changed** (builder finding 3, confirmed). `Stop-R19Wave` restores the safety state only. The `DOCK R20-0C` line names the side for the user, and §8 says so.

## 5. Checks against §4.28 that hold
- **Slice and prologue:** the order and the self-contained prologue are right, and the record is `S13-live-record-liveC20[-att<k>].txt`.
- **Preflight and tree kill:** the 8081-only preflight is the shared one (`s13-r20.ps1:133`), and the tree kill (#405/#408) is installed by `Register-R20Blocks`.
- **R20-0C:**
  - It is `Invoke-R20Zero … 'R20-0C'`, so LOADED20 comes second and `ROW R20-0C … slice=C` is printed.
  - The dock side is read in X's tab DevTools; `Get-S13Titles` leaves the capture out.
  - The DevTools it opens is closed in the guard, and `devtools-left-open` fires if it stays open.
  - gate-dock prints the exact `NOT RUN — dock side unreadable, it could not be restored` text from `devtRowGate`, and every DEVT and conditional block checks `R20CGate`.
- **FLAG:** exactly one line (`R20CFlagDone`).
- **Step ids:** they equal the actor's `<row>-<leg>-<step>` for every row: DEVT-UNDOCK and DEVT-EARLY's two legs; UP-DEVT's 5 steps; KEEP-4's open/ctl1/close with no ctl0 and its side set in a `-Pre` session; SWEEP-HELD's ctl0/open/ctl1 then ctl2/check/close.
- **Conditional rows:** gate-cond is asked once, `--legs` is omitted when empty, the pick comes from `condFor`/`pickRefusing`, and exit 3 runs none of the three rows.
- **ROOT:** added only in UP-DEVT and removed by `rd-restore`.
- **SWEEP-HELD:**
  - The capture is saved, the reload runs, the capture is reopened, and `LOADED20 rerun` follows (STOP `old-build-left-loaded`).
  - Phase 1's LEG lines are carried into the one ROW and dropped after it.
  - A phase-1 exit other than 0 gives no reload, the tab closed by `--phase close`, and one ROW.
- **R20-RESTORE's dock order:** Open → Set → Close → Open plain → read → `DOCK R20-RESTORE` → Close. Different or unread is STOP `not-restored`, with `CHECK … found-side=` naming the found side. It runs before the safety restore, which a STOP's own restore covers.
- **DIALOGS:** `DIALOGS C …` from an all-window count, the safety read-back by count and hash (`Invoke-R20RestoreCheck`), and R20-LOGS is the shared one.
- **STOP pairing:** each of the 9 slice-C STOP reasons pairs with its RETURN (R5.6 tests).
- **Hygiene:** no private path or user name in the new files, which are ASCII.
- **The shared hook `lineCmd20`:** no existing `flag` or `dock` subcommand existed in `s13-r20.ts` `main`, so slices A and B behave identically.
- **Proposed decision 3 ("else bottom") is sound.** `R20DockFound` is one of bottom/right/left/undock/unread. With unread, gate-dock runs no DEVT row, so "else bottom" is reached only when the found side is `undock`. R20-RESTORE then sets `undock` back and reads it. For a found docked side, the docked legs keep it. RESTORE always sets the found side whenever it is readable.

## 6. Builder's deviation and finding (1)
- **`sweep-held --phase close`:** accepted. It is the minimal way to close the kept tab without a shared helper, exit 0 and no ROW.
- **Finding (1) is confirmed, for the session agent; slices A and B's records are not judged here:**
  - `Write-R19Dialogs` (`s12-r19-c.ps1:59`) passes `--slice "$global:R19Slice"`, and `dialogsLine` prints it verbatim (`s12-forms-c.ts:43-44`).
  - So slices A and B print `DIALOGS liveA20 …` / `DIALOGS liveB20 …`, where §4.28 writes `DIALOGS B native=0 …` (and `DIALOGS A`).
  - Slice C prints the letter (`Get-R19SliceLetter`).

## 7. Handoff
- Fix F1 and add the discriminating serve test. F3 is a one-line fix to §8.
- F2 needs the session agent's ruling before liveC20. F4 needs a dated note or a ruling.
- Nothing is running. The scratch mutant copies are in the session scratchpad, outside the repo.
