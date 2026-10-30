# S5-drivers-C1 verifier, round 2: liveC20's DevTools window and control helpers

Model and effort: Opus 5.5, medium. Read and run only. Nothing was run against Chrome, a daemon, a port or UIA on a
real window. The red run, the real-helper harness and the mutants used copies in the session scratchpad, outside the
main tree, with no `node_modules` junction (#395, #220). Evidence: `S5-drivers-C1-verifier2-evidence.txt` (beside this
file). Scope: the items the fixer touched (F1, F2, F3, F5, F6), plus a regression read of the rest of the file.

## 1. Verdict

**PASS-with-notes.** F1 (MAJOR) is fixed, and the fix is proven with the real Run 19 ownership helpers. F2 and F6 are
fixed. F3 is acceptable for the per-row count, with one note on `DIALOGS C` (N1). F5 is **not** closed: the new
assertion does not kill verifier1's mutant (N2, MINOR). No CRITICAL or MAJOR finding is open.

## 2. Outputs (re-run by this verifier; tree at `6eee7cc` plus the slice's untracked files)

- `npm test`: `Test Files 249 passed (249)`, `Tests 5951 passed (5951)`. Before the fixer it was 5950 / 249, so the
  fixer added +1 test (the new `it` block) and no file. This matches the fixer's claim.
- `npm run typecheck`: exit 0. All eight `recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b,.s13}.json`: each exit 0.
  `npm run build`: exit 0. `node scripts/doc-check.mjs`: exit 0 (38 living docs).
- `git status --short`: only `recipes/s13-devt.ps1`, `recipes/test/s13-devt-ps.test.ts` and the slice's reports (the
  builder's, verifier1's and its evidence, fixer1's, and this report with its evidence).
- Both files are ASCII with LF line ends. Neither holds a user name or a `Users/` path (grep exit 1).
- Slice size: 218 + 249 = 467 lines (`wc -l`).

## 4. Deviations

None. The pre-fix script is verifier1's scratch copy (`old/`, 211 lines, same md5 as verifier1's `live/` copy).
`diff` against the tree shows only the fixer's hunks.

## 6. Findings

### F1 (MAJOR, round 1): fixed, proven
- **Code.** `Register-S13Own` (`recipes/s13-devt.ps1:88`) writes the owner pid into `$global:S9WinIds` and sets
  `S11Own`. It is called in two places:
  - at `:150`, for a new window titled for the fixture port after a dock change;
  - at `:161`, after `Open-S12DevToolsMenu` when `$global:S12Dev.How -eq 'window'`.

  Run 19's file is not edited.
- **Real-helper proof.** The harness uses the real `Test-S9Live`, `Format-S9Title` and `Test-S11Own`, with
  `Open-S12DevToolsMenu` stubbed exactly as `s12-win-b.ps1:89` leaves its window. The evidence file has the output.
  - Pre-fix: `Test-S11Own(50)=False`, `Get-S13Scope=` (empty), `closed=0 windows=1 remaining=1`.
  - Fixed: `Test-S11Own(50)=True`, `Get-S13Scope=50`, `closed=1 windows=0 remaining=0`.
  - This is verifier1's failure, reproduced and then cleared.
- **Red on the pre-fix script** (`S13_DEVT_REPO` pointed at the old copy): `Tests 3 failed | 14 passed (17)`.
  `undockCloseDockBack` received `own50=False closed=0 rem=1 done=False now=undock`.
- **The tests' stub now holds the real rule.** `Test-S9Live` requires an `S9WinIds` entry (`s13-devt-ps.test.ts:21`).
- **Mutants.** `noOpenAdopt` and `noPidRecord` are both killed.

### F2 (MINOR, round 1): fixed
- **Code.** The prune (`:152`) now covers only the scope's handles other than X, and only when `IsWindow` is false
  (`Test-S13Alive`). It never touches X, the options window or any other `S11Own` window.
- **Mutants.**
  - `oldPrune` (the pre-fix line put back) is killed by `setKeepOthers`.
  - `pruneIncludesX` survives. It is equivalent: X is alive throughout a dock change, so `IsWindow` never prunes it.

### F3 (MINOR, round 1): the step agent's choice judged
- **The choice.** `remaining` = the wave's own `S11Own` DevTools windows + any window titled for the fixture port + the
  pane (`:209`).
- **Per-row count.** For `DEVT20 … devtools-windows-after` and the row-level `devtools-left-open` STOP, this does not
  weaken a protective check.
  - The wave opens DevTools only in X, on 8081 fixture tabs. Each such window is either adopted (now really own,
    after F1) or titled `DevTools - <host>:8081/…`. Both are counted.
  - A foreign DevTools window on the fixture port is still counted, which is strict (`closeForeign` gives `0 1 1`).
  - Only a human's DevTools window on another page drops out. That window is not the wave's.
- **Mutants.** `countAllDevtools` and `countOwnOnly` are killed. `countPortOnly` survives (see N3).
- **See N1** for the one place where this narrowed count must not be used.

### F5 (MINOR, round 1): NOT closed; see N2

### F6 (NIT, round 1): fixed
`:3-4` now say the file prints no line of its own, and name the Run 19 functions' fixed lines. The file-content test
still pins that the file contains no `Write-Host`, `Say9` or `Show-S16` (`s13-devt-ps.test.ts:245`).

### N1 MINOR: `DIALOGS C … devtools=<n>` must not be fed the narrowed count
- **Sheet.** §4.28's R20-RESTORE row (e2e plan, liveC20 rows) says "then **every DevTools window** closed (the capture
  last) and counted by UIA", and expects `DIALOGS C native=0 devtools=0 …`.
- **Builder's handoff.** `S5-drivers-C1-builder.md:24` says `Close-S13DevTools` "feeds `devtools-windows-after` and
  `DIALOGS C ... devtools=<n>`". That line still describes the old count ("every DevTools window but the capture"), and
  the fixer left it unchanged.
- **The gap.** After F3, the count misses one case: a DevTools window the wave opened that is not titled for the
  fixture and not live in `S11Own`. One example is a worker-console window from a segment save that lost its record
  (compare #371). The old count caught it.
- **Why it matters.** If C3 takes `windows` for `DIALOGS C devtools=`, a pre-registered count becomes narrower than the
  sheet states. That is an integrity-floor item (§2: never weaken a protective check). It is also a sheet question the
  step agent cannot settle by a helper's choice.
- **Fix (any one).**
  - Return a second field, for example `alldevtools` = every visible `^DevTools` window except the capture, and have C3
    use it for `DIALOGS C` after the capture is closed.
  - Or state in the stage handoff that `DIALOGS C` is counted by its own all-window UIA read, not by
    `Close-S13DevTools`.
- **Record the choice.** Either way, F3's proposed decision should name which line uses which count.

### N2 MINOR: F5's new assertion does not defend "Escape only into X" (fixer's claim is wrong)
- **The claim.** The fixer added `expect(log("setDockBack")).not.toMatch(/esc50/)` (`s13-devt-ps.test.ts:205`) and
  called it "red by construction". No mutant was run.
- **The test.** On the fixed script, mutant `escapeAnyWindow` (`Close-S13Customize` sends Escape into `$Menu.hwnd`)
  gives `Tests 17 passed (17)`.
- **Cause.** `setDockBack` takes the success path. That path never calls `Close-S13Customize` with a menu in window 50:
  - `:148` calls it only when the button is missing or the press fails;
  - `Read-S13DockSide`'s menu is always in X (`:131`, `Open-S13Customize @($Hwnd)`).

  So no test reaches the one branch where the menu lives in the DevTools window.
- **Fix.** Add a case with the state `undock`, window 50 own and recorded, and the target side's button missing from the
  menu in 50 (or `Invoke-S13Item` returning `$false` for it). Then call `Set-S13DockSide 1 8081 'left'`. Expect
  `False False undock`, and a log with no `esc50` and no `esc1`.
- **Severity.** In the real stack, `Send-S12Escape 50` would assert ownership and the foreground and send a key into
  the wave's own DevTools window. That is harmless, but it breaks the stated guard.

### N3 NIT: two untested branches, and indentation
- `countPortOnly` survives. No test has an own `S11Own` DevTools window whose title is not the fixture's. Adding one
  (for example `S12Dev` adopting window 70 titled `DevTools`, left open) would pin the `-or` branch at `:209`.
- `s13-devt-ps.test.ts:205` and `:211-216` are indented with an extra tab, and the `it(` at `:217` has none. This is
  cosmetic.

### N4 NIT: adoption trusts the title and the timing
`Register-S13Own` adopts any window that appears during the 1.5 s after the Dock press and is titled for the 8081
fixture. It would also adopt a fixture-port DevTools window opened by someone else in that same instant, and the wave
would then close it. It records the window's current pid, so `Test-S9Live`'s pid check is self-consistent. That is the
same rule as `Wait-S9NewWindow`. The risk is accepted as stated; no change is asked.

## Regressions (rest of the file, the guards)
- **Window X only.** Every key still goes through `Send-S12Escape $Hwnd` / `Send-S12Key $Hwnd`. No new code sends a
  key.
- **S11Own.** `Assert-S13Window` is unchanged. `Close-S9Window` still runs only on `Test-S11Own`; mutant
  `closeAnyDevtools` is killed.
- **8081.** The port guard is unchanged (`:94`, `:99`).
- **Foreground before keys.** This is unchanged (inside `Send-S12*`).
- **Escape only into X.** The code is right (`:124`) but untested in the one branch that matters (N2).
- **The other behaviour.** The pure parts, `Read-S13Targets`, `Get-S13Control`, FLAG and the dock read are untouched by
  the diff. Their 14 earlier test blocks pass unchanged.
- **Names.** The new functions carry the S13 prefix and no top-level variable was added. The file-content test passes
  (≥ 24 functions, all `-S13…`).

## Claims audited (fixer1)
- F1, F2, F6: confirmed.
- F3: confirmed as code, with N1 added.
- F4: the fixer restated the order in its own report only. The builder report's §7 still gives the old order, and the
  committer or step agent should carry the fixer's order into the stage report.
- F5: **not confirmed** (N2).
- Counts 5951 / 249 and the 467 lines: confirmed.

## 7. Handoff
- **For the step agent.**
  - N2 is a one-case test fix.
  - N1 needs the count split, or a handoff line, before C3 builds `DIALOGS C`.
- No process, port or watcher is left. Scratch is in the session scratchpad only (`v2r2-*`).
