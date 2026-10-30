# S5-liveC20b verifier 3 (decision #418): fixer 2's Customize chooser and tries

Model Opus 5.5, effort medium. I read the files and ran the checks. I edited nothing, started no agents, made no commits, and ran nothing against Chrome, port 8081 or the daemon. Scope: the uncommitted diff since `95e0abc` and the claims in `S5-liveC20b-fixer2.md`.

## 1. Verdict
**PASS-with-notes.** The change matches the measured pair and nothing wider that matters. #413's rule, the expected texts, the pass rules, the ROW verdicts and the gates are unchanged. The new tests fail on the old code. One minor finding (N1): the file's own key rule now says less than the code does. The key itself is guarded and harmless.

## 2. Checks run
| Check | Result |
|---|---|
| `npm test` | `Test Files 251 passed (251)`, `Tests 6029 passed (6029)`, exit 0 (the fixer's count) |
| `npm run typecheck` | exit 0 |
| the 8 recipe tsconfigs (`tsconfig.json`, `.fe`, `.s6`, `.s9`, `.s10`, `.s11`, `.s11b`, `.s13`) | all 8 exit 0 |
| `npm run build` | exit 0 |
| `node scripts/doc-check.mjs` | exit 0 (`Checked 38 living docs`) |
| `s13-r20-c.ps1 -Block plan` | exit 0; one line, `PLAN liveC20: preflight servers files window reload console r20-0c flag r20-devt-undock r20-devt-early r20-up-devt r20-keep-4 r20-sweep-held r20-restore r20-logs` |
| ASCII check of the two edited `.ps1` files | `file`: `ASCII text` for both |
| Tests against the old code (scratch copy) | see section 3, item 5 |

## 3. Item by item
1. **The chooser matches the measurement; no guess.**
   - `Get-S13CustomizeTries` (`recipes/s13-devt.ps1:130-137`):
     - one match gives that match, as before;
     - two matches with exactly one class word `main-menu` give the opener, then the other;
     - zero, three or more, two without `main-menu`, or two that both have it give none.
   - None means `Open-S13Customize` moves on to the next scope window and returns `$null`. `Read-S13DockSide` then returns `unread` (`:181`).
   - `ConvertTo-S13DockSide`, which holds #413's rule (exactly one of four items pressed, never undock), is not in the diff.
   - `ROWS_C`, `gateDock`, `gateCond` and every expected text are unchanged. The `s13-r20-c.ts` diff touches only `dockReadLine` and the new `dockSideLine`.
   - `CHECK rows20` still counts only ROW lines; the existing test "is a CHECK line, never a ROW" still passes. The new `DOCK DOCKDIAG` line comes only from `-Block dockdiag`, which runs no rows, and no reader parses `DOCK DOCKDIAG` (grep: the only `DOCK ` producers are `s13-forms.ts:74` and `dockSideLine`).
   - The second element of the pair needs no class or Invoke pattern of its own (N2).
2. **Key safety.** See N1. Every Escape still goes through `Send-S12Escape` (`recipes/s12-win-b.ps1:59-64`). That function refuses any window the wave did not open (`Assert-S11Own`) and sends nothing unless the window is in the foreground. The Escape goes to the scope window that held the button. `Get-S13Scope` (`:104-109`) gives only X or the wave's own DevTools windows; a matching window the wave did not open gives an empty scope. So no key can reach a window the wave did not open. The new part is a key into the wave's own undocked DevTools window when a try fails. The header (`:6-7`) and the `Close-S13Customize` comment (`:169`) still say no key goes there.
3. **The instrument presses no Dock side button and changes nothing.**
   - Each try in `Get-S13DockDiag` invokes only the chosen Customize element (`:313`).
   - An invoked try always ends with `finally { Send-S12Escape $Hwnd }` (`:337`), so the first menu is closed before the next try and before the extra read. The loop stops at the first try that opened the menu (`:340`).
   - `Invoke-R20CDockDiag` (`recipes/s13-r20-c-defs.ps1:203-205`) then calls `Read-S13DockSide`. That opens the menu again, reads it, and closes it with its own Escape (`Close-S13Customize`, X only). It presses no side button.
   - `Close-S13DevTools` and `CHECK dockdiag remaining=` still follow, outside the `try`, so they also run after a throw. The order test expects `READSIDE` before `CLOSE` and the `DOCKDIAG` dock-read line after `READSIDE`.
   - No safety block is in the dockdiag order (`DDORDER preflight,servers,window,dockdiag`).
4. **`Set-S13DockSide` works with the pair.**
   - It opens the menu once through `Open-S13Customize`, then presses the side button.
   - Test `trySet` logs `inv:customize,esc1,inv:inner,esc1` (the read), then `inv:customize,esc1,inv:inner,inv:dock:left` (the change), and returns `True True left`.
   - On a missing side button, the menu is still closed only when its window is X (unchanged). When every try fails, each try has already sent its Escape.
5. **The tests fail without the change.**
   - I put `git archive 95e0abc recipes` into a scratch folder and pointed the PowerShell suites at it (`S13_DEVT_REPO`, `S13_R20_REPO`). I touched nothing in the main tree.
   - Result: `Tests 4 failed | 56 passed (60)`. The 4 failures are the two new F4 blocks in `s13-devt-ps.test.ts` and the F3 and dockdiag blocks in `s13-r20-c-ps.test.ts`.
   - In `s13-r20-c.test.ts`, the import of `dockSideLine` and the new `try=` strings cannot pass on the old `s13-r20-c.ts`.
   - Covered: one match, the pair in both orders, no `main-menu`, two `main-menu`, three, zero, try 1 opens, try 2 opens, both fail (`unread try=none`, an Escape after each), no choice (nothing invoked, empty log), and the Set path.
6. **The new lines are counts only.**
   - In `dockReadLine`, `try=` must match `^(1|2|none|n\/a)$`; anything else prints `n/a` (tested with `3`, `x y` and an empty value).
   - `dockSideLine` prints only one of five words; anything else prints `unread` (tested with `My Title`).
   - `DOCKDIAG try=<n> opened=<yes|no> items=<n>` holds a count and fixed words.
   - `DOCKDIAG button try=<n> <desc>` uses the existing `Get-S13DiagDesc`, which verifier 2 already checked.

## 4. Findings
- **N1, minor: the file's key rule and the `Close-S13Customize` comment no longer describe the keys sent.**
  - Where: `recipes/s13-devt.ps1:6-7` and `:169`, against `Invoke-S13OpenTries` `:155`.
  - Evidence:
    - `Invoke-S13OpenTries` calls `Close-S13Customize $Hwnd ([pscustomobject]@{ hwnd = $Hwnd })` after a failed try. It builds a menu object only to pass that function's `hwnd -eq X` test, with the scope window standing in for X.
    - In `Set-S13DockSide` from an undocked state, the scope is the wave's own DevTools window, so an Escape goes there. The comment says "no key goes there".
    - The guards hold: `Assert-S11Own`, the foreground check, and a scope made only of the wave's own windows.
    - Effect when no menu is open: in DevTools, Escape toggles the console drawer. In docked X, the Escape reaches whatever has focus (the DevTools pane, or the fixture page). Neither changes the dock side, the safety state or any row's reading. It happens only when a try fails.
  - Severity: minor. The guards are intact and the key is harmless, but the written rule is out of date.
  - Fix:
    - Call `Send-S12Escape $Hwnd` directly in `Invoke-S13OpenTries`, with a comment.
    - Reword the header to: "an Escape into X or into the wave's own DevTools window after a Customize try that opened no Dock side items; a menu left open in X".
    - Reword `:169` to match.
    - Or, to keep the old rule, send the failed-try Escape only when the scope window is X.
- **N2, info: the chooser's second element is not checked.**
  - Where: `:136`.
  - Evidence: two matches with exactly one `main-menu` give the opener, then the other, whatever the other's class or patterns. The measured pair also had ` icon only-icon ` with Invoke.
  - Why it is only a note: a wrong second element can only open no menu (Escape, then none) or open the real menu. The side is then still judged by #413's rule, so this never produces a guess.
  - Fix: none needed. If wanted, also require the class word `icon`.
- **N3, info: `button-poll matches=` now counts tries, not matches.**
  - Where: `:292`.
  - Evidence: three matching names now print `matches=0`. The poll then runs the full 6 s, where before it stopped at exactly one.
  - Why it is only a note: the raw count is still printed on the `current-name-matches=` line (`:304`).
  - Fix: rename the field `tries-chosen=`, or print both counts.
- **N4, info: a throw in the extra read leaves no line.**
  - Where: `recipes/s13-r20-c-defs.ps1:204`.
  - Evidence: if `Read-S13DockSide` throws (for example, the window is not in the foreground), the `CHECK dock-read row=DOCKDIAG` and `DOCK DOCKDIAG` lines are not printed. The close and `CHECK dockdiag remaining=` still run, and the error is thrown again after them.
  - Fix: none needed. The runner reads a missing DOCKDIAG line as "the read threw".

## 5. Not checked
- Whether invoking the `main-menu` element (by ExpandCollapse) opens the menu live. Only the next dockdiag read can show that, as the fixer says.
- The `s13-r20-c.test.ts` failure on the old code was judged from the import, not run, because that suite imports by relative path.

## 6. Proposed decisions
None. N1 can be fixed in the next fixer round or noted in the stage record. It does not block the dockdiag read.
