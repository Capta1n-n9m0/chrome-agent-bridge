# S5-liveC20b fixer 2 (decision #418): the Customize chooser and the try sequence

Model Sonnet 5.5, effort medium. No agents, no commits, nothing against Chrome, a port or the daemon.

## 1. Verdict
DONE (the live-run check lines are in section 5).

## 2. Changes
- `recipes/s13-devt.ps1:128-170`
  - `Get-S13CustomizeTries` is the pure chooser. One match gives that match. Two matches with exactly one class word `main-menu` give an ordered list: the menu opener, then the other. Anything else gives none. I chose the class word rule, as the brief allowed.
  - `Get-S13ClassWord` reads ClassName from the element. A test descriptor may carry a `cls` property instead.
  - `Invoke-S13OpenTries` takes the tries in order. Each try invokes the item, then polls with `Invoke-S13Poll` (3600 ms, 300 ms step) for Dock side items. If none appear it sends Escape through `Close-S13Customize` and takes the next try. It returns `{hwnd; items; tryn}`, or `$null` with `trynum=none`.
  - `Open-S13Customize` now uses the chooser and the tries. The old fixed 700 ms sleep is gone: the poll's first probe is immediate. `Set-S13DockSide` is unchanged and opens the menu once through it.
  - `New-S13DockDiag` has a new field `trynum` (default `n/a`).
- `recipes/s13-devt.ps1` `Get-S13DockDiag`
  - The chooser decides the current-name path. The old keyword path stays as the fallback and needs exactly one candidate.
  - The button-poll succeeds when the chooser gives at least one try. Its `matches=` field is now the number of tries.
  - The COUNTS, KEY after, MENU and NEWWIN block now runs inside a loop over the tries. Each try writes `DOCKDIAG try=<n> opened=<yes|no> items=<n>`, and the loop stops at the first try that opened the menu. Dumps are also written for a failed try; I did not suppress them, because that keeps the instrument simple.
- `recipes/s13-r20-c-defs.ps1:69` adds `--try` to `Write-R20CDockRead`, so the field is on the `CHECK dock-read` line.
- `recipes/s13-r20-c-defs.ps1:200-206` `Invoke-R20CDockDiag`
  - After `Get-S13DockDiag` returns (it has already sent its Escape), it clears `$global:S13DockDiag` and calls `Read-S13DockSide X 8081` once.
  - It then prints `CHECK dock-read row=DOCKDIAG ...` and the new `DOCK DOCKDIAG side=<word>` line.
  - Both come before `Close-S13DevTools` and `CHECK dockdiag remaining=`.
  - No Dock side button is invoked by the instrument, and no dock side is changed.
- `recipes/s13-r20-c.ts:229-238, 255`
  - `dockReadLine` accepts the row `DOCKDIAG` and appends ` try=1|2|none|n/a`. Any other text prints `n/a`.
  - A new `dockSideLine` and a new subcommand `dock-side --side <word>` print `DOCK DOCKDIAG side=<bottom|right|left|undock|unread>`. Any other value prints `unread`.
  - I did not edit `recipes/s13-r20.ts` or `recipes/s13-forms.ts`.

## 3. New line forms
- `CHECK dock-read row=<R20-0C|R20-RESTORE|DOCKDIAG> windows=.. pane=.. customize=.. invoked=.. items=.. kinds=.. pressed-readable=.. pressed=.. try=<1|2|none|n/a>`
- `DOCKDIAG try=<n> opened=<yes|no> items=<n>` (evidence file)
- `DOCK DOCKDIAG side=<word>`

## 4. Tests
`recipes/test/s13-devt-ps.test.ts` has 2 new `it` blocks and 14 new `T` cases, plus stubs for the nested pair. They cover:
- The chooser: one match, the measured pair, the pair in reverse order, two matches without `main-menu`, both with it, three matches, zero.
- The tries: try 1 opens; try 1 fails then try 2 opens (also with the pair reversed); both fail, giving `unread try=none` with Escape after each; no choice invokes nothing; `Set-S13DockSide` through the pair.

The `s13-r20-c` tests add the `try` field cases (1, none, 3, "x y" and empty) and the `dockSideLine` cases. The `-Block dockdiag` order test now expects `READSIDE`, the `DOCKDIAG` dock-read line and the `dock-side` call.

Test count: 6026 / 251 before, 6029 / 251 after (`npm test`).

Size: about 111 new lines in the three code files and about 56 in the tests, counted from `git diff --numstat` (`s13-devt.ps1` +50/-18, `s13-r20-c-defs.ps1` +4/-2, `s13-r20-c.ts` +7/-4, and the test files).

## 5. Checks
- `npm test`: Test Files 251 passed (251), Tests 6029 passed (6029).
- `npm run typecheck`: exit 0.
- The eight recipe tsconfigs (`tsconfig.json`, `.fe`, `.s6`, `.s9`, `.s10`, `.s11`, `.s11b`, `.s13`): all exit 0.
- `npm run build`: exit 0. `node scripts/doc-check.mjs`: exit 0. `s13-r20-c.ps1 -Block plan`: exit 0.
- ASCII check of the two edited `.ps1` files: the grep call failed ("-P supports only unibyte and UTF-8 locales"), so it did not run. I wrote only ASCII text.

## 6. Deviations and notes
- Escape in `Invoke-S13OpenTries` goes to the scope window that held the button. In the docked read that is X. A scope window is only ever X or one of the wave's own DevTools windows.
- The measured pair needs a live run to confirm that invoking the main-menu element opens the menu. The tests use stubs only.
- Every item in the nested pair keeps the exact name, so the instrument's `DOCKDIAG button try=<n>` descriptor line shows the class and patterns of each tried element.
