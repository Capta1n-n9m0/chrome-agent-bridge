# S5-liveC20b verifier 4 (decision #418): fixer 3's dock-side press and the N1 Escape

Model Opus 5.5, effort medium. I read the files and ran the checks. I edited nothing, started no agents, made no commits, and ran nothing against Chrome, port 8081 or the daemon. Scope: the uncommitted `git diff -- recipes` since `dfbac13` (`recipes/s13-devt.ps1`, `recipes/test/s13-devt-ps.test.ts`) and the claims in `S5-liveC20b-fixer3.md`. Measured structure: `S13-live-evidence-liveC20-dockdiag2.txt`, `S5-liveC20b-runner-diag2.md`.

## 1. Verdict
**PASS-with-notes.** The press now matches the measured pair: one Invoke-capable Group per side, with a strict Toggle fallback. The reader, #413's rule, the expected texts, the pass rules, the ROW verdicts and the gates are unchanged. N1 is fixed, and the file's key-rule comments are true again. The new tests fail on the old code. Two minor notes are about attempt 2 on paths this diff does not touch (M1, M2). One note is informational (I1).

## 2. Checks run
| Check | Result |
|---|---|
| `npm test` | `Test Files 251 passed (251)`, `Tests 6030 passed (6030)` (matches the fixer) |
| `npm run typecheck` | exit 0 |
| 8 recipe tsconfigs (`tsconfig.json`, `.fe`, `.s6`, `.s9`, `.s10`, `.s11`, `.s11b`, `.s13`) | all 8 exit 0 |
| `npm run build` | exit 0, `built extension → dist/` |
| `node scripts/doc-check.mjs` | exit 0 |
| `s13-r20-c.ps1 -Block plan` | exit 0; `PLAN liveC20: preflight servers files window reload console r20-0c flag r20-devt-undock r20-devt-early r20-up-devt r20-keep-4 r20-sweep-held r20-restore r20-logs` |
| `file recipes/s13-devt.ps1` | `ASCII text` |
| Current tests against `git archive dfbac13 recipes` (scratch folder, `S13_DEVT_REPO`) | `Tests 4 failed \| 20 passed (24)` |
| Current tests against a scratch copy with only the N1 guard reverted (`if ($true)`) | `Tests 1 failed \| 23 passed (24)`: the new #418 fixer3 block, on `not.toMatch(/esc50/)` |

## 3. Item by item
1. **The press (`recipes/s13-devt.ps1:189-196`, `:208`).**
   - `Press-S13DockKind` lists the opened menu window's items (`$Menu.hwnd`). It keeps the Groups whose name maps to the asked kind through the same `ConvertTo-S13DockKind` the reader uses.
     - Exactly one of them offering InvokePattern (`Test-S13Invokable`): `Invoke-S13Item` on it.
     - Two Groups, or one without Invoke: `$false`, so nothing is pressed.
     - No Group at all: `TogglePattern.Toggle()` on the matched Button, only when `pressed -eq $false`. A Button that reads On or `$null` is never toggled.
   - In `Set-S13DockSide`, everything else is as it was: the read before, the early return on `unread` or on the same side, `Get-S13Scope`, the 1500 ms wait, `Register-S13Own` for a new titled window, dropping a dead scope handle, the read-back, and `Close-S13Customize` on any failure.
   - Measured fit: dockdiag2 shows exactly one Group per side name (`toolbar-button`, Invoke) and one Button (`Toggle=Off/On`, no Invoke). The Group path therefore fires on this structure. The old code would have called `Invoke-S12UiaElement` on the Button, which offers neither Invoke nor ExpandCollapse (`s12-win-b.ps1:31-37`). Every dock change would have returned `done=false`, so the fix is necessary.
2. **Reader and rules unchanged.**
   - `ConvertTo-S13DockSide`, `Get-S13DockItems`, `Get-S13Pressed` and `Get-S13CustomizeTries` are not in the diff.
   - `Read-S13DockSide` changes only by passing X to `Open-S13Customize` (`:181`).
   - No `.ts` file changed, so no expected text, pass rule, ROW form, gate or verdict changed.
3. **The three changed expectations are legitimate.**
   - `setLeft`, `setPressFailX` and `setPressFailOwn` changed from `inv:dock:<side>` to `tog:dock:<side>`.
   - Their stubs list no Group, so the no-Group fallback runs. The Button reads Off (`Get-S13Pressed` stub), so Toggle is the strict branch.
   - The returns are unchanged (`True True left`, `False False bottom`, `False False undock`). `setPressFailOwn` still asserts no `esc`.
   - The measured Group path is tested on its own and through the whole flow:
     - `pressGroup` → `True inv:grp:left`;
     - `setViaGroup` → `True True left`, log `^inv:customize,esc1,inv:customize,inv:grp:left,`;
     - `setOwnNoEsc` → `True bottom`, the Group pressed in window 50.
   - The refusals are tested too: `pressNoGroupOn`, `pressNoGroupUnread`, `pressTwoGroups`, `pressGroupNoInvoke` each give `False` with an empty log.
   - The stub replaces the real `Test-S13Invokable` and `Invoke-S13Toggle`. They are thin UIA wrappers, like the other stubbed ones, and read correctly (`TryGetCurrentPattern` / `GetCurrentPattern(...).Toggle()` inside a try).
4. **N1.**
   - `Invoke-S13OpenTries` (`:153`) now sends the Escape between tries only when the scope window is X.
   - Both callers pass X: `:181` and `:206`. No other caller exists (grep).
   - Header `:6-7` ("an Escape into X (a menu left open in X)") and `:169` ("no key goes there") are now true.
   - The diag instrument's `finally { Send-S12Escape $Hwnd }` goes into X.
   - The revert test above shows that `setOwnNoEsc` guards the change.
5. **Key and window safety.**
   - Every Escape goes through `Send-S12Escape` (`s12-win-b.ps1:59-64`): `Assert-S11Own`, then `Set-S9Foreground`, else STOP and throw.
   - F12 goes through `Send-S12Key`.
   - The new press is UIA patterns only. It needs no key and no foreground.
   - `Get-S13Scope` gives X or the wave's own titled DevTools windows. A titled window the wave did not open gives an empty scope, so nothing is opened and nothing is pressed.
   - No new key path was added.
6. **Attempt 2, end to end (reasoned; not run).** See section 4 for the risks.
   - **R20-0C:** a plain open docks right (the last state). The reader reads `right`, as diag2 did (same code path). F12 closes the pane. `R20DockFound=right`, gate `run`.
   - **DEVT-UNDOCK `open`** (`Open-R20CDevt 'undock'`):
     - The read before gives `right`. The scope is `@(X)`.
     - The menu opens in X on try 1. Group "Undock into separate window" is invoked.
     - The pane leaves X, so the menu dies with it and needs no Escape.
     - After 1500 ms, a new window whose title passes `Test-S13DevtTitle` is registered by `Register-S13Own` (S11Own plus S9WinIds). Stage 0 measured the `DevTools - <host>:<port>/…` title on 9 of 9 undocked legs.
     - The read-back counts 1 titled window, so `undock`, `done=true`.
     - `close` closes it as the wave's own (`Close-S13DevTools` closes `^DevTools` windows that pass `Test-S11Own`). This holds unless M1 applies.
   - **Later opens start undocked.** DevTools reopens in its last state, so after UNDOCK a plain open makes a window. `Open-S13DevTools` registers it (`S12Dev.How -eq 'window'`, `:221`).
   - **Docked legs ask for `right`** (#415 (2): the found side). From the undocked state:
     - The read gives `undock`. The scope is the own DevTools window.
     - The menu opens there through the same chooser. This is unmeasured in an undocked window (M2).
     - Group "Dock to right" is invoked there. The window docks into X and disappears.
     - The dead handle is dropped. The read-back in X reads `right`.
     - No key goes to the DevTools window, on the tries or on a failure. A failed press leaves that window's menu open, and `Close-S13DevTools` then closes the window.
     - If the state was already docked right, it is "same side": `done=true`, `changed=false`, no press.
   - **R20-RESTORE:**
     - It opens plain (undocked or right, depending on the last leg) and sets `right` by the same path as a docked leg. It closes.
     - It opens plain again: docked right. It reads `right` and matches the found side.
     - From the undocked scope, the press needs no Escape: the window dies on a successful dock. If it fails, the menu dies when `Close-R20CChecked` closes the window. The read-back is then `undock`, which is the STOP `not-restored`. That STOP is correct, because the side really was not restored.

## 4. Findings
- **M1, minor (pre-existing, not in this diff): a new undocked window is registered by a single title check at 1500 ms.**
  - Where: `recipes/s13-devt.ps1:209-210`.
  - Evidence:
    - A window that still carries only `DevTools` at that moment (before the frontend sets `DevTools - localhost:8081/…`) is not registered.
    - The later read-back counts it by title, so it reads `undock`, `done=true`.
    - `Close-S13DevTools` (`:390-392`) skips it, because `Test-S11Own` is false. `remaining` counts it, because it is titled for the fixture, so the result is the STOP `devtools-left-open` (`Invoke-R20CGuarded`).
    - Stage 0 measured the final title, not how long it takes to appear after a UIA-driven undock.
  - Effect: an instrument STOP in DEVT-UNDOCK's or EARLY's undocked leg on a slow start. No wrong verdict is possible.
  - Suggested fix: poll the new-window check, for example with `Invoke-S13Poll` up to 5 s for a titled window that is not in `$s13before`, or repeat the registration after the read-back.
- **M2, minor (unmeasured): the Customize chooser and the Group press inside an undocked DevTools window.**
  - Where: `:160-166` and `:192`, with the scope being the wave's own DevTools window.
  - Evidence: dockdiag2 measured only the pane docked in X (`try=1 opened=yes items=4`). An undocked window runs the same frontend, so the same pair and Groups are likely.
  - What happens otherwise: the button is not chosen, or the side items do not show. Then `done=false`, so `open` answers `fail` and the leg is RECORD `devtools-control-unreadable` (#414 (3)). In R20-RESTORE, the read-back of `undock` gives the STOP `not-restored`.
  - Safety holds: no key goes to that window. It is the wave's own, and a failed menu dies when it is closed.
  - Suggested fix: none before the run. The runner should expect the first undocked-scope press (EARLY's docked leg, or RESTORE if EARLY's order differs) to be the measurement. The dock-read line already carries `try=` and the counts.
- **I1, info: why the Group is the right element to press.** The Group (`toolbar-button` host) exposes Invoke, which Chrome gives an element with a click handler. So the press most likely reaches DevTools' toolbar-button click handler. A Toggle on the inner Button would also bubble up to it. Neither is measured live, as the fixer says. A Group invoke that has no effect reads back as the old side: `done=false`, never a false PASS.

## 5. Not checked
- Live behaviour: Group Invoke changing the dock, the undocked-window tree, and title timing. Nothing was run against Chrome, per the brief.
- The real `Test-S13Invokable` and `Invoke-S13Toggle` are covered by reading only. The tests stub them.

## 6. Proposed decisions
None. M1 and M2 can go to a later fixer round or be noted in the attempt-2 brief. Neither blocks attempt 2.
