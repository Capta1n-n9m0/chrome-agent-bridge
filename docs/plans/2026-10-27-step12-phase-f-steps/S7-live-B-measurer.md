# S7-live liveB19 — DevTools opener measurer (#368)

Model: Claude Opus 5.5, effort medium. Read-only leaf. Measured 2026-10-29 00:10–00:15 UTC on Chrome 156, the user's real profile, in
one window this measurer opened (HWND 26740990, `Open-S11Window`, on `http://127.0.0.1:8081/s12-console.html?s12=con&probe=m1`).
Raw output: `S7-live-B-measurer-evidence.txt` (same folder).

## 1. Verdict

**DONE.** The UIA path works with patterns only, with no mouse and no key: app-menu Button `Chrome` → `ExpandCollapse.Expand()` →
MenuItem `More tools` → `ExpandCollapse.Expand()` → MenuItem `Developer tools Ctrl+Shift+I` → `Invoke()`. DevTools opened
**docked** in my window. **It did not make the bridge answer `DEBUGGER_DEVTOOLS`:** `evaluate "1"` answered `ok` on all 31 polls over
15.5 s. It also answered `ok` on a later read after 70 s of no calls, with DevTools still open, past the keeper's 5 s idle detach.

`DEVPROBE method=uia-menu answer=ok ms=15516 attached=no`

## 2. Outputs

- `docs/plans/2026-10-27-step12-phase-f-steps/S7-live-B-measurer.md` (this report), `…/S7-live-B-measurer-evidence.txt`.
- Scratch files, not in the repo, all in the scratchpad: `m1.ps1` (driver), `m1-sdk.mts`, `m2-sdk.mts`.
- No repo file edited, nothing committed, no build or reload done. The extension's options and the safety state were not touched, and
  no call answered DISARMED or was refused by the gate.

### The measured path

| # | Element name | Control type | ClassName / AutomationId | Patterns offered | Action | Result | ms |
|---|---|---|---|---|---|---|---|
| 0 | `Chrome` (app menu) | Button | `BrowserAppMenuButton` / `view_1007` | ExpandCollapse, ScrollItem (no Invoke) | find by ClassName in my window | 1 found; state Collapsed; `Customize and control*` found=no | — |
| 1 | `Chrome` | Button | as above | as above | `ExpandCollapsePattern.Expand()` (attempt (a)) | answered, no throw; state became `Expanded`; one new untitled top-level `Chrome_WidgetWin_1` popup (92736892) holding Menu (`SubmenuView`) + 26 items | 26 (call); menu listed 800 ms later |
| 2 | `More tools` | MenuItem | `MenuItemView` / (none) | ExpandCollapse, ScrollItem (no Invoke) | `ExpandCollapsePattern.Expand()` | answered; a second new popup (107744822) holding Menu `More tools` (`SubmenuView`) + 8 items | find 225, call 14 |
| 3 | `Developer tools Ctrl+Shift+I` | MenuItem | `MenuItemView` / (none) | Invoke, ScrollItem | `InvokePattern.Invoke()` | answered; DevTools docked pane seen in my window 439 ms later; the menus closed | find 75, call 10 |

Where the items live: each menu level is a **new untitled top-level window** (`Chrome_WidgetWin_1`, UIA ClassName `Chrome_WidgetWin_1`,
root element Menu ClassName `SubmenuView`). The same elements also appear **under my own window's UIA tree** (36 MenuItem/Menu
elements there with both menus open). So `Find-S12UiaByName`, which searches window X first, finds them in X.

`More tools` submenu items: `Customize Chrome`, `Reading mode Alt+Shift+R`, `Performance`, `Task manager Shift+Esc`,
`Developer tools Ctrl+Shift+I`, plus three items withheld by the allow-list (lengths 23, 12, 20). All have Invoke. The top-level menu
list is in the evidence; items not on the allow-list are printed as `<withheld len=N>`.

### Attach check and reads

- Before: `BEFORE evaluate "1" answer=ok` (tab T2882, claimed by URL marker `probe=m1`).
- Poll started at the opened signal (written right after Invoke): `ok` every ~517 ms, 31 reads, 27 ms to 15 516 ms.
  `DEVPROBE method=uia-menu answer=ok ms=15516 attached=no`.
- Extra read (deviation, §4), DevTools still docked and open, 70 s after the last call: `evaluate "1" answer=ok ms=8`.
- DevTools was really open: the UIA tree of my window showed TabItems `Elements, Console, Sources, Network`, 2 names starting
  `DevTools*` and 2 documents. The fixture server logged DevTools' own
  `GET /.well-known/appspecific/com.chrome.devtools.json` in the same second as the Invoke.
- After close (`Close-S12DevTools`, pane branch = F12 into my window, foreground checked; returned True in 2 906 ms; UIA then showed 0
  DevTools elements, 1 document): `AFTER-CLOSE evaluate "1" answer=ok ms=9`.

### Close and after-state

My window was closed (`Close-S11Window`, 00:14:35). `daemon.shutdown sent`. My python server was killed by its PID. Netstat showed
nothing listening on 9234 or 8080–8089. No DevTools window was left (0 titled `DevTools*`). Both user HWNDs still exist and are
visible (IsWindow / IsWindowVisible, count only). No python process is left. One node.exe remains, created 2026-10-22: not the daemon
or the MCP, and not started here.

### The snippet that worked (function level, for `Open-S12DevToolsMenu`)

```powershell
# Chrome 156: the app-menu button is Button 'Chrome', ClassName BrowserAppMenuButton (no Invoke; ExpandCollapse works here).
# Menu items' names carry their accelerator ('Developer tools Ctrl+Shift+I'): match with -like 'Developer tools*'.
function Find-S12AppMenuButton([long]$Hwnd) {
  $root = $S9UIA::FromHandle([IntPtr]$Hwnd)
  $c = New-Object Windows.Automation.PropertyCondition($S9UIA::ClassNameProperty, 'BrowserAppMenuButton')
  $b = @($root.FindAll([Windows.Automation.TreeScope]::Descendants, $c))
  if ($b.Count -eq 1) { $b[0] } else { $null }
}
# Expand when the element offers ExpandCollapse and is not already expanded; else Invoke. $false on a throw.
function Open-S12UiaItem($El) {
  $p = $null
  try {
    if ($El.TryGetCurrentPattern([Windows.Automation.ExpandCollapsePattern]::Pattern, [ref]$p)) {
      if ($p.Current.ExpandCollapseState -ne [Windows.Automation.ExpandCollapseState]::Expanded) { $p.Expand() }; return $true }
    if ($El.TryGetCurrentPattern([Windows.Automation.InvokePattern]::Pattern, [ref]$p)) { $p.Invoke(); return $true }
  } catch { return $false }
  $false
}
# in Open-S12DevToolsMenu, after $global:S12Before is taken:
#   $el = Find-S12AppMenuButton $Hwnd                                   ; Open-S12UiaItem $el ; Start-Sleep -Milliseconds 800
#   $el = Find-S12UiaByName $Hwnd 'More tools*' 'MenuItem'              ; Open-S12UiaItem $el ; Start-Sleep -Milliseconds 700
#   $el = Find-S12UiaByName $Hwnd 'Developer tools*' 'MenuItem'         ; Open-S12UiaItem $el   (Invoke)
#   then Test-S12DevToolsUi as today (it saw How=pane 439 ms after the Invoke)
```

Two traps in the current `Invoke-S12UiaElement` (Invoke first, else Expand): for these three elements the order does not matter,
because none offers both patterns. But a second `Expand()` on an item that is already expanded throws
`InvalidOperationException` HRESULT `0x80131509` ("Operation is not valid due to the current state of the object"; measured on
`More tools` at 00:12:21). The guard on `ExpandCollapseState` above avoids it. The existing `'Developer tools*'` pattern already
matches the accelerator name; only step 1's `'Customize and control*'` is wrong.

## 3. Verifier verdict

Not applicable (a measurer).

## 4. Deviations

- **Developer tools took two runs of my `devtools` phase.** Run 1 looked for the exact name `Developer tools` and found nothing,
  because the item's name carries its accelerator. Run 2, 34 s later with the menus still open, matched `Developer tools*`. Its own
  `More tools` Expand threw `0x80131509`, because the submenu was already expanded. The table gives run 1's Expand timing and run 2's
  Invoke. Only one DevTools opening happened.
- **One read beyond the brief:** after the 15 s poll I read `evaluate "1"` once more with DevTools still open, 70 s after the last
  call. Past `KEEPER_IDLE_MS` = 5000 (`extension/src/debugger-keeper.ts:43`), the kept session should have detached, so this read
  should have needed a fresh `chrome.debugger.attach`. This tells the probe's two possible causes apart. That the session really
  detached is inferred from the constant: the worker's log was not read.
- The read after close came from a second short client (`m2-sdk.mts`), because the first one had already released the tab.
- Attempts (b), the mouse click, and (c), Alt+F, were not run, because (a) worked.

## 5. Proposed decisions

### 2026-10-29 · The DevTools opener uses the app-menu button's ClassName and checks the expand state
**Decided:** `Open-S12DevToolsMenu` step 1 finds the Button by ClassName `BrowserAppMenuButton`, not by the name
`Customize and control*`. Expand is skipped when the item is already `Expanded`. **Why:** measured above; the name is `Chrome` on 156.
**Instead of:** a mouse click or Alt+F (not needed; both are riskier). **Revisit if:** a later Chrome drops the ClassName.
**By:** Claude (proposed)

### 2026-10-29 · liveB19's DevTools rows need a re-read of their premise before the last attempt
**Decided:** before liveB19's last attempt is spent, the step agent reads this finding. On Chrome 156, DevTools docked by the menu
**did not** make `evaluate` answer `DEBUGGER_DEVTOOLS`, either with the kept session live or (by the 5 s idle constant) after a fresh
attach. A fixed opener may therefore still print `attached=no`, and the rows stay NOT MEASURED under the sheet's rule.
**Why:** Run 18's F12 / Ctrl+Shift+I probes (#351 (3)) also printed `attached=no`; with this result, the opener may not be the
cause. **Instead of:** spending the attempt on the opener alone. **Revisit if:** an undocked DevTools window, or DevTools opened
before the bridge's first call on the tab, gives `DEBUGGER_DEVTOOLS` (not measured here). **By:** Claude (proposed, for user review:
it touches what the `DEBUGGER_DEVTOOLS` code claims)

## 6. Findings

1. **Chrome 156 app menu, by UIA** (00:10–00:12 UTC, the user's Chrome 156, my window):
   - The button is Button `Chrome`, ClassName `BrowserAppMenuButton`, AutomationId `view_1007`, with patterns ExpandCollapse and
     ScrollItem. `Expand()` **works** on it (26 ms, state Expanded), unlike the Extensions button's E_FAIL (`s9-win.ps1` Set-S9Pin).
   - Each menu level opens in a new untitled `Chrome_WidgetWin_1` window, and its elements are also reachable under the browser
     window's UIA tree.
   - Submenu parents (`More tools`, `Help`, …) offer only ExpandCollapse; leaf items offer Invoke. Item names include the accelerator.
2. **DevTools does not block the bridge's debugger here.** Docked DevTools opened via `More tools → Developer tools`, and
   `evaluate "1"` still answered `ok`: 31 of 31 reads over 15.5 s, one read 70 s later with DevTools still open, and `ok` again after
   close. A candidate `extension/CLAUDE.md` fact once confirmed (an undocked DevTools window was not measured): on Chrome 156, an open
   docked DevTools did not make `chrome.debugger` answer "Another debugger is already attached".
3. `Get-S9ChromeWindows` counted 1 titled Chrome window before anything was opened, while both user HWNDs exist and are visible. One of
   them fails its filter (title or class). Recorded only; nothing was read from them.

## 7. Handoff

Nothing is left running. No PIDs, no watcher, no daemon (shut down), no fixture server, no DevTools, and no window of mine.
`docs/plans/2026-10-27-step12-phase-f-steps/S7-live.ledger.md` was already modified in the tree; it is not mine and I did not touch
it. The next stage needs the step agent's ruling on §5's second item before it ports the snippet.
