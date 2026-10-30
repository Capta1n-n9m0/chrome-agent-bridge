# S5-drivers-C1 verifier: liveC20's DevTools window and control helpers

Model and effort: Opus 5.5, medium. Read and run only. Nothing was run against Chrome, a daemon, a port or UIA on a real
window. Mutants and the red run used copies in the session scratchpad, outside the main tree, with no `node_modules`
junction (#395, #220). Evidence: `S5-drivers-C1-verifier-evidence.txt` (beside this file).

## 1. Verdict

**FAIL**: one MAJOR (F1). The pure parts are strict and well tested. But in the real helper stack the wave cannot close,
or dock back, an undocked DevTools window it opened itself. The first undocked leg would end in `devtools-left-open`, and
the dock side would be left changed.

## 2. Outputs (re-run by this verifier, tree at `6eee7cc` plus the slice's three untracked files)

- `npm test`: `Test Files 249 passed (249)`, `Tests 5950 passed (5950)`. The start was 5934 / 248, so the slice adds
  +16 tests and +1 file (`recipes/test/s13-devt-ps.test.ts`). The builder's counts are confirmed.
- `npm run typecheck`: exit 0. `npx tsc --noEmit -p recipes/<f>` for all eight `recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b,.s13}.json`:
  each exit 0. `npm run build`: exit 0. `node scripts/doc-check.mjs`: exit 0 (38 living docs).
- `git status --short`: only `S5-drivers-C1-builder.md`, `recipes/s13-devt.ps1` and `recipes/test/s13-devt-ps.test.ts`
  (plus this report and its evidence file).
- Red: `S13_DEVT_REPO` pointed at a scratch folder holding an empty `recipes/s13-devt.ps1` gives `Tests 16 failed (16)`.
- Mutants (13, scratch copies): 12 killed, 1 survived (`escapeAnyWindow`, F5). The list is in the evidence file.
- Files are ASCII and LF. There is no user name, profile path or `Users/` path in the three files (grep exit 1).

## 6. Findings

### F1 MAJOR: a DevTools window the wave opens never counts as the wave's own, so it is never closed or docked back
`recipes/s13-devt.ps1:145-146`, `:198`, `:102`. The same pattern is inherited from `recipes/s12-win-b.ps1:89`.
- **Cause.** `Test-S11Own` is `S11Own.ContainsKey(h) -and (Test-S9Live h)` (`s11-win.ps1:104`). `Test-S9Live`
  (`s9-win.ps1:1057-1060`) returns `$false` for any handle that is not in `$global:S9WinIds`. That table is written only
  by `Wait-S9NewWindow` / `Open-S10MarkedWindow` when a window is opened. Two code paths put an undocked DevTools window
  into `S11Own` without recording it in `S9WinIds`: `Open-S12DevToolsMenu` (`s12-win-b.ps1:89`) and `Set-S13DockSide`
  line 145. So:
  - `Close-S13DevTools` skips that window (`if (Test-S11Own …)`): `closed=0 remaining=1`.
  - `Get-S13Scope` returns `@()`, so a change from `undock` to any docked side is refused (`done=false`).
  - Line 146 removes the handle from `S11Own` straight after line 145 added it.
- **Evidence.** A harness with the real `Test-S9Live`, `Format-S9Title` and `Test-S11Own` and a faked `[S9Win]`. The
  evidence file has the full output:
  `Test-S11Own(1)=True Test-S11Own(50)=False`; `Get-S13Scope=` (empty);
  `Close-S13DevTools closed=0 windows=1 pane=0 remaining=1`; `window 50 is alive but not taken as the driver's (not recorded at open time) - not touched`.
- **Effect on liveC20.**
  - R20-DEVT-UNDOCK step 7, and the `undocked` leg of R20-DEVT-EARLY: `devtools-windows-after=1`, which is the STOP
    `devtools-left-open`. That window is the one the wave just undocked.
  - R20-0C itself STOPs when the found dock side is `undock`.
  - After any undock leg, R20-RESTORE to a docked found side cannot dock back, which is the STOP `not-restored`. The
    human's persistent DevTools preference is left as `undock`.
- **Why the tests miss it.** The test's stub `Test-S9Live` (`s13-devt-ps.test.ts:19-20`) treats every handle that is not
  dead as live, so it hides the real ownership rule.
- **Suggested fix.**
  - Each time a DevTools window is adopted, record its pid in `$global:S9WinIds[[string]$h]`, as `Wait-S9NewWindow` does
    (`s9-win.ps1:240-243`). Do this at line 145, and after `Open-S12DevToolsMenu` when `$global:S12Dev.How -eq 'window'`.
    Do it in s13 code; the Run 19 file stays read-only.
  - Make the test's `Test-S9Live` stub require an `S9WinIds` entry.
  - Add a test: open with `undock` → close → `remaining=0`; then undock → set `bottom` → `done=True`.

### F2 MINOR: the line 146 prune drops live wave windows
`recipes/s13-devt.ps1:146` removes every `S11Own` key that fails `Test-S9Live`. That function also returns `$false` for
a window that is alive but whose title is momentarily not one `Format-S9Title` knows. X, the options window or a
chrome://extensions window could lose ownership for good, and later `Assert-S11Own` STOPs or `Close-S11All` leaves the
window open. **Fix:** prune only the DevTools handles this function adopted, and only when
`-not [S9Win]::IsWindow`.

### F3 MINOR: `Close-S13DevTools` counts DevTools windows the wave did not open
`recipes/s13-devt.ps1:202` counts every visible Chrome window titled `^DevTools` except the capture window. A DevTools
window the human has open in their own window would therefore read as `remaining>0`, and C3 would raise a false
`devtools-left-open` STOP. Titles are only compared and never printed, so this is strict but spurious. §4.28's
`DIALOGS C … devtools=` concerns the wave's DevTools. **Fix:** count `S11Own` windows plus windows that match
`Test-S13DevtTitle` for the port, or record this choice as a proposed decision.

### F4 MINOR: the handoff's R20-RESTORE order misses the close and reopen §4.28 requires
`S5-drivers-C1-builder.md` §7 gives Open → `Set-S13DockSide` → `Read-S13DockSide` → Close. §4.28's R20-RESTORE row
(e2e plan, row "R20-RESTORE, R20-LOGS (slice C)") says the side is set in X's tab DevTools, "which is closed; then
DevTools is **reopened once on that tab and the side read back** … so a restore that did not take reads as different".
**Fix:** state the order as Open → Set → Close → Open (plain) → `Read-S13DockSide` (this is `DOCK R20-RESTORE`) → Close.
`Set-S13DockSide`'s `now` is not the read-back.

### F5 MINOR: the "Escape only into X" guard is not defended by a test
Mutant `escapeAnyWindow`: `Close-S13Customize` changed to send Escape into `$Menu.hwnd` (the DevTools window). Result:
`16 passed (16)`. The `setDockBack` case runs the menu in window 50, but nothing asserts its log. **Fix:**
`expect(log("setDockBack")).not.toMatch(/esc50/)`.

### F6 NIT: the header says the helpers print nothing, but the functions they call do print
`recipes/s13-devt.ps1:3` says "prints nothing". The functions it calls print `Say9` lines: `CHECK devtools-menu …`,
`KEY F12 pressed into window <h>`, `window <h> closed`, and `Test-S9Live`'s "alive but not taken". These carry handles
and fixed words only, nothing forbidden. **Fix:** reword to "prints no line of its own".

### F7 NIT (recorded): DevTools UIA names not measured; the marker must be unique per tab
- The builder already flags that the Customize-menu names and the toggle patterns are not measured. If they are wrong,
  every docked read is `unread` and the DEVT rows are NOT RUN. That is strict, but it may cost the whole slice.
- C2 must give each leg's tab a marker unique among open tabs, for example `s12=con&leg=u1`. Otherwise
  `m.length===2` gives `unread`, which is RECORD.

## Checks that held (spec reading attacked)
- **R20-0C's read stays off the capture window.** `Get-S13Titles` excludes `$global:D`, and `Test-S13DevtTitle` needs
  `127.0.0.1|localhost:8081/`. Mutant `titleAnyHost` was killed.
- **Strict control reads.**
  - `attached` is `unread` on a bad marker, a console code, a throw or a timeout. Mutant `timeoutNo` was killed.
  - `targets=0` is reported only together with `unread`.
  - `title=ok` needs the marker. Mutant `titleNoMarker` was killed.
  - A docked leg gives `windows=$null` and `title=n/a`, which `ctrl20Line` prints as `n/a`.
  - Both sources are read with no key or UIA on X.
- **Strict dock word.** A pressed Undock with no window, or a null pressed state, gives `unread`. Mutants
  `undockNoWin` and `nullPressedOk` were killed.
- **Strict FLAG.** Only browser processes count. Mutant `flagRenderer` was killed. Command lines are never kept.
- **Safe console expression.** The marker set `^[A-Za-z0-9_.=&-]{1,40}$` keeps text out of the expression. The reader
  is anchored (mutant `unanchored` was killed).
- **Guards.**
  - Port 8081 is required (mutant `noPortGuard` was killed).
  - X must be `S11Own`.
  - Every key goes through `Send-S12Escape` / `Send-S12Key`, which assert ownership and the foreground.
  - F12 is sent only on a pane UIA shows (mutant `f12Always` was killed).
  - A foreign DevTools window refuses a dock change (mutant `noForeignRefuse` was killed), and closing touches only
    own windows (mutant `closeAnyDevtools` was killed).
- **PowerShell 5.1.** Locals and functions carry the S13 prefix, with no top-level variable. `@(if …)` is used for a
  single hit. No name collides with `s13-win.ps1` or any other recipes `.ps1`.

## Unstated cases the builder decided
The builder's seven cases (report §5) are strict, apart from (7). (7) is right in intent but is broken by F1, because
the wave's own DevTools window is also treated as foreign. Further cases this verifier found:
- (a) Titles are read from every Chrome window, the human's included; they are compared only. Strict, but see F3.
- (b) A UIA throw inside `Get-S13Titles`, `Get-S13UiaItems` or `Get-S9DocUrl` propagates and becomes C3's
  `throw-after-state` STOP. Strict.
- (c) The Escape after a dock read goes into X, and reaches the DevTools pane if the menu has already closed. That can
  toggle the console drawer but does not change the dock preference. NIT.
- (d) The fixture-URL check runs only before DevTools opens (builder §4). Accepted: `Open-S12DevToolsMenu` re-checks it
  itself.

## 7. Handoff
- **Fixer:** F1 (with its tests), then F2–F5. F6 and F7 are text.
- No process, port or watcher is left. Scratch is in the session scratchpad only.
