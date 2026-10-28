# S7-helpers-b fixer report (round 1 of 3)

Model and effort: Claude Sonnet 5.5, medium. Touched: `recipes/s12-win-b.ps1`, `recipes/test/s12-ps-b.test.ts`, `recipes/test/s12-forms-b.test.ts`, this report. `recipes/s12-forms-b.ts` is unchanged (restored byte for byte after each mutant).

## Outputs
- `npx vitest run recipes/test`: **1301 passed, 57 files** (before my round: 1283, 57).
- All seven `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json` exit 0; `npm run typecheck` exit 0.
- Size: code 116 + 95 = 211 (cap 400); tests 263 + 213 = 476 (cap 600).

## Findings
- **MAJOR-1, fixed.**
  - `Invoke-S12UiaElement` wraps `Invoke()` / `Expand()` in try/catch and returns `$false`. `Find-S12UiaByName` is also wrapped in `Open-S12DevToolsMenu`, so nothing throws before the DEVPROBE signal and the procedure's `finally` still closes X.
  - New `Get-S12SearchHwnds`: X first, then the top-level Chrome windows not in `$global:S12Before` and not X, the `Set-S9Pin` scope rule (s9-win.ps1:438-439). `Set-S9Pin` has no reusable helper for this (its scope code is inline), so the two lines are written here; no change to shared scripts is needed. `Find-S12UiaByName` walks those windows.
  - Tests (stub element with throwing `Invoke`/`Expand`), under `Continue` and `Stop`: the helper returns `False`; the opener prints `step=menu-button found=no`, sends Escape to X, returns `False`, no throw, no `found=yes`; a throwing find is `found=no` too.
  - Red: the mutants B14 (rethrow), B15 (a throw counts as invoked), B16 (no try, the old code), B17 (find throw escapes), B11 and B12 (X-only scope, no before filter) and B13 (finder X only) each turn their check red.
  - `attached` still comes only from the control's code. The method is unchanged in what it touches (window X, 8081 fixture, no key to the page).
- **MINOR-3, six mutants killed.**
  - M19 (OVERLAP slots swapped), M23 (`sentinel = body.length`) and M28 (marker regexp loosened to `more lines,.* narrow`): new tests (exact OVERLAP string; a text with a line lacking the sentinel; the marker built by the SDK's own `formatConsole`, plus look-alike texts). I ran each mutant on `s12-forms-b.ts`; each turned one test red; the file was restored and diffed identical.
  - P3 and P4 (`Send-S12Escape` guards): the group `escape` stubs `Assert-S11Own`, `Set-S9Foreground` and a compiled `S9Win.keybd_event` counter, and checks the order (own check, foreground, two key events), a foreign window (no foreground call, no key) and not-in-foreground (STOP, no key). Mutants B18, B19, B20 are red.
  - P5 and P6 are the MAJOR-1 tests above.
- **NIT-4 timeline stamp, fixed.** `T` is stamped before the read. Test B9 (the old order) is red. The poll interval (`poll-ms`) is unchanged; each read still covers all given windows.
- **NIT-5 start signal, fixed.** `Invoke-S12Timeline` prints `TIMELINE <Row> started` after `Wait-S11Ready` (B10 red); the actor may wait on that line before its first call.
- **NIT-5 F12 closing a docked pane, not fixed.** `Close-S12DevTools` (`s12-win.ps1:126`) sends F12 for a docked pane. That is the shared helper, outside my lane. A menu-opened DevTools is likely a pane or a window, and a failure ends in the `devtools-left-open` STOP with X left open, by design. For the session agent: close by the menu or a UIA close if the F12 close fails live.
- **MINOR-2** untouched, as ordered: the helper still prints `end-ms=never`; `docs/e2e-test-plan.md` not edited.
- **NIT-6, correction (the builder report is not edited).** The builder's sentence "no tsconfig includes `s12-*` files" is wrong: `tsconfig.s6.json`'s `test/*.test.ts` glob pulls in both new test files and, through them, `s12-forms-b.ts`. The files are typechecked (all seven exit 0).

## For the proposed decision
Add to its "Revisit if": Chrome 156's `ExpandCollapse.Expand()` answered E_FAIL live in `Set-S9Pin`, so the toolbar button may offer no usable pattern; the helper then prints `found=no` and a mouse click needs the user's grant.

## Handoff
Nothing is running. Not committed. A fresh verifier re-checks MAJOR-1 and MINOR-3 only.
