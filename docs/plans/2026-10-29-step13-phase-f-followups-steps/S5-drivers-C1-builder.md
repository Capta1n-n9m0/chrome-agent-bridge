# S5-drivers-C1 builder: liveC20's DevTools window and control helpers

Model and effort: Sonnet 5.5, medium. Nothing was run against Chrome, a daemon, a port or UIA on a real window.

## 1. Verdict

DONE.

## 2. Outputs

- `recipes/s13-devt.ps1` (211 lines), `recipes/test/s13-devt-ps.test.ts` (231 lines, 16 tests); 442 new lines, under the ~600 cap.
- Red: the test run with `S13_DEVT_REPO` pointing at a scratch folder outside the tree holding an empty `recipes/s13-devt.ps1`: `Tests 16 failed (16)`. (A first red run was void: the test script itself had a parse error; red was re-shown after the fix.)
- `npm test`: `Test Files 249 passed (249)`, `Tests 5950 passed (5950)` (start 5934 / 248; +16, +1 file). `npm run typecheck`, all eight `recipes/tsconfig*.json`, `npm run build`, `node scripts/doc-check.mjs`: exit 0.
- `git status --short`: only the two new recipes files (plus this report). No tsconfig edit was needed: `.s6`'s `test/*.test.ts` glob compiles the new test (it imports no chrome-typed code).

## 3. Interface for C2 and C3

Dot-source AFTER s9-win, s11-win, s11b-win, s12-win, s12-win-b. Defines functions only, prints nothing, returns objects with lower-case properties (ConvertTo-Json gives `recipes/s13-forms.ts` its own keys). Every function takes window X (`$Hwnd`, must be `S11Own`) and `$Port` (must be 8081, else Stop9 + throw).

- `Open-S13DevTools [long]$Hwnd [int]$Port [string]$Side=''` returns `{opened; side; done; now}`. Checks X is on an 8081 fixture (STOP + throw otherwise), calls `Open-S12DevToolsMenu` (Run 19's opener, read-only), then with `$Side` in `bottom|right|left|undock` calls `Set-S13DockSide`. `done` = no side asked, or the read-back equals it; `now` = the side read back, `''` when none asked.
- `Set-S13DockSide $Hwnd $Port $Side` returns `{done; changed; now}`. Reads the side first (unread: changes nothing); presses the one Dock side button in the Customize menu by Invoke (no key); a DevTools window it creates is added to `S11Own`; a dead own handle is dropped.
- `Read-S13DockSide $Hwnd $Port` returns `bottom|right|left|undock|unread`. One DevTools window titled for the fixture = `undock` (no menu touched); none = pane in X, Customize menu opened, pressed Dock button read by UIA, one Escape into X; anything else = `unread`. Call it with DevTools open on the tab in X, never on the capture window.
- `Get-S13Control $Hwnd $Port $Marker $Leg` (`$Leg` = `undock|docked`; `$Marker` e.g. `s12=con`) returns `{windows; title; attached; targets}`: the `Ctl` fields of `ctrl20Line` plus `targets`. `docked`: `windows = $null`, `title = 'n/a'`. `attached` = `yes|no|unread` from `chrome.debugger.getTargets()` in the worker-console capture window (`$global:D`), tab picked inside the expression by the marker (exactly one `page` target must match, else `unread`). `targets` = the total target count; `unread` gives `targets = 0` (not meaningful then). Touches X in no way. Needs `$env:S11_OUT`.
- `Close-S13DevTools $Hwnd $Port` returns `{closed; windows; pane; remaining}`. Closes only `S11Own` windows titled `^DevTools` (capture window excluded), then F12 into X only when UIA shows a docked pane; `remaining` = every DevTools window but the capture + the pane. Feeds `devtools-windows-after` and `DIALOGS C ... devtools=<n>`; the caller decides on the STOP.
- `Read-S13Flag` returns `yes|no|unread` (any error = unread; the lines never leave the pipeline).
- Pure, separable (all tested): `Test-S13DevtTitle`, `Get-S13TitleRead $Titles $Port $Marker`, `ConvertTo-S13DockKind`, `ConvertTo-S13DockSide $Items $Windows`, `Test-S13Marker`, `New-S13TargetsExpr`, `Get-S13TargetsRead`, `Get-S13FlagWord`. Wrappers stubbed by tests: `Get-S13Titles`, `Get-S13UiaItems`, `Get-S13Pressed`, `Invoke-S13Item`, `Test-S13Pane`, `Read-S13Targets`.

## 4. Deviations

None from the brief. The fixture-page URL check (`Assert-S13Fixture`) runs only in `Open-S13DevTools`, before DevTools exists; the later functions check `S11Own` and port 8081 only, because a docked pane adds a second document to X's UIA tree and `Get-S9DocUrl` may then read the DevTools document.

## 5. Proposed decisions

### 2026-10-30 · S5-drivers-C1: the unstated cases of liveC20's DevTools helpers
**Decided:** (1) The dock side is `unread` unless exactly one DevTools window is titled for the fixture (undock), or none is and the four Dock side buttons are each present once with a readable pressed state, exactly one pressed and it is not Undock; two windows, a missing, duplicate or unreadable button, or Undock pressed with no window are `unread`. (2) `attached` is `unread` unless exactly one `page` target carries the marker. (3) `targets` is the total `getTargets()` count; `0` when `attached` is unread. (4) `title` is `ok` only when a matching window carries the marker, so `windows=1 title=none` fails the control (RECORD by `ctrl20Verdict`). (5) FLAG reads browser processes only (command lines without `--type=`); `yes` if one carries the flag as a whole argument, `no` if a browser line was read without it, else `unread`. (6) A menu left open in X is closed by one Escape into X; a menu in the wave's DevTools window gets no key (it dies with the window). (7) A DevTools window not opened by the wave makes a dock change refuse (nothing pressed). **Why:** each is the strict reading of #391 (1) and R20-0C's "neither is unread". **Instead of:** guessing a side or a tab. **Revisit if:** liveC20 reads `unread` on a healthy DevTools (a button name or pressed state differs on Chrome 156). **By:** Claude (proposed by S5-drivers-C1)

## 6. Findings

- Measured (PowerShell 5.1, a unit test): `$x = if (...) { @(<one pscustomobject>) } else { @() }` unrolls the single object, and `.Count` on it is empty; write `@(if ...)`.
- NOT MEASURED on a real Chrome: the DevTools UIA names (`Customize and control DevTools`, `Undock into separate window`, `Dock to left|bottom|right`) and that the buttons expose `TogglePattern` or `SelectionItemPattern`. They are the DevTools front end's titles from memory, not a reading. If they differ, every dock read is `unread` and the DEVT rows are NOT RUN by R20-0C's rule (safe, not a false pass).
- A Python write in this stage briefly turned the test file CRLF; it was converted back to LF (the file is LF now).

## 7. Handoff

- C2 (`s13-r20-c.ts`) can use the property names above as the JSON the actor reads; C3 (`s13-r20-c.ps1`, `s13-r20-c-defs.ps1`) prints the lines (`ctrl20Line`, `dockLine`, `flagLine`, `devt20Line`) and owns the STOP on `remaining > 0`.
- Order inside a DEVT leg: `Get-S13Control` (before) -> `Open-S13DevTools` with the side -> `Get-S13Control` (after, before any bridge call) -> the bridge call -> `Close-S13DevTools`. For R20-RESTORE: `Open-S13DevTools` plain, `Set-S13DockSide` to R20-0C's side, `Read-S13DockSide` as the read-back, then `Close-S13DevTools` closes the reopened docked pane (verifier3 NIT F).
- No PID, port, watcher or process is left.
