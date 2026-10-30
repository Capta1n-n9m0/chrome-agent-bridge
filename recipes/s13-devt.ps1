# recipes/s13-devt.ps1: Windows helpers for liveC20's DevTools rows (Step 13 S5-drivers-C1; docs/e2e-test-plan.md section 4.28 "The bridge-independent DevTools control").
# Windows PowerShell 5.1, ASCII only. Dot-source it AFTER s9-win.ps1, s11-win.ps1, s11b-win.ps1, s12-win.ps1 and s12-win-b.ps1 (it loads none; it edits none). Defines functions only.
# NOT run against Chrome, a daemon or a port by its author. Returns objects and prints no line of its own: no ROW line (the entry script prints), no title, URL, path, token or command line.
# The Run 19 functions it calls print their own fixed lines (CHECK devtools-menu, KEY F12 pressed into window <h>, window <h> closed, Test-S9Live's "alive but not taken"): handles and fixed words only.
# Top-level names carry an S13 prefix (case-insensitive: a plain $o would shadow $global:O, Run 17b); locals carry s13.
# Every function that touches window X refuses a window the wave did not open (Assert-S11Own) and a fixture port other than 8081 (#405). The only keys sent are an Escape into
# X (a menu left open in X) and F12 into X (closing a docked pane that UIA shows), each after Set-S9Foreground (Send-S12Escape, Send-S12Key). The dock side is changed by UIA patterns only.
# Returned property names are lower case so ConvertTo-Json hands recipes/s13-forms.ts its own keys (Ctl: windows, title, attached; DockSide words).

# ---- pure parts (tested with stubs: recipes/test/s13-devt-ps.test.ts) -----------------------------------------------------------------------------------
# An undocked DevTools window is titled `DevTools - <fixture host>:<P>/<path>?<query>` (Stage 0, 11 of 11). The worker-console capture window never matches (no host:port).
function Test-S13DevtTitle([string]$Title, [int]$Port) { $Title -match ('^DevTools - (127\.0\.0\.1|localhost):' + $Port + '/') }
# windows = how many titles match; title = ok when at least one carries the row's query marker (or no marker is asked), else none. The titles are compared, never printed.
function Get-S13TitleRead([string[]]$Titles, [int]$Port, [string]$Marker = '') {
  $s13m = @($Titles | Where-Object { Test-S13DevtTitle $_ $Port })
  $s13t = if ($s13m.Count -gt 0 -and ($Marker -eq '' -or @($s13m | Where-Object { $_.Contains($Marker) }).Count -gt 0)) { 'ok' } else { 'none' }
  [pscustomobject]@{ windows = $s13m.Count; title = $s13t }
}
# A Dock side button's name -> its DockSide word; $null for any other name.
function ConvertTo-S13DockKind([string]$Name) {
  if ($Name -like 'Undock*') { return 'undock' }
  if ($Name -like 'Dock to left*') { return 'left' }
  if ($Name -like 'Dock to bottom*') { return 'bottom' }
  if ($Name -like 'Dock to right*') { return 'right' }
  $null
}
# R20-0C's rule. $Windows = DevTools windows titled for this fixture; $Items = the Dock side buttons read in the Customize menu, each { kind; pressed ($true, $false or $null) }.
# One such window = undock (no menu read needed). More than one = unread. None: docked = every one of the four buttons present once with a readable state, exactly one pressed and
# it is not `undock` (a pressed Undock with no window is inconsistent); anything else is unread. Never a guess.
function ConvertTo-S13DockSide($Items, [int]$Windows) {
  if ($Windows -eq 1) { return 'undock' }
  if ($Windows -gt 1) { return 'unread' }
  $s13i = @($Items)
  foreach ($s13k in 'undock', 'left', 'bottom', 'right') { if (@($s13i | Where-Object { $_.kind -eq $s13k }).Count -ne 1) { return 'unread' } }
  if (@($s13i | Where-Object { $null -eq $_.pressed }).Count -gt 0) { return 'unread' }
  $s13p = @($s13i | Where-Object { $_.pressed -eq $true })
  if ($s13p.Count -ne 1 -or $s13p[0].kind -eq 'undock') { return 'unread' }
  $s13p[0].kind
}
# The worker-console expression: the fixture tab's `attached` from chrome.debugger.getTargets(), picked by the query marker inside the expression; one console.log line of words and a count.
# The marker is checked against a fixed character set first, so no text can end up inside the expression.
function Test-S13Marker([string]$Marker) { $Marker -match '^[A-Za-z0-9_.=&-]{1,40}$' }
function New-S13TargetsExpr([string]$Marker) {
  if (-not (Test-S13Marker $Marker)) { throw 'the marker is not a fixed plain word' }
  '(async () => { const t = await chrome.debugger.getTargets(); const m = t.filter((x) => x.type === "page" && (x.url || "").includes("' + $Marker + '")); console.log("S13DEVT " + (m.length === 1 ? (m[0].attached ? "yes" : "no") : "unread") + " " + t.length); })()'
}
# The last whole-line `S13DEVT <yes|no|unread> <n>` of the capture's lines (the typed expression's echo is longer, so it never matches); $null when there is none.
function Get-S13TargetsRead([string[]]$Lines) {
  $s13m = @($Lines | ForEach-Object { [regex]::Match("$_", '^S13DEVT (yes|no|unread) (\d+)$') } | Where-Object { $_.Success })
  if ($s13m.Count -eq 0) { return $null }
  [pscustomobject]@{ attached = $s13m[-1].Groups[1].Value; targets = [int]$s13m[-1].Groups[2].Value }
}
# FLAG: --enable-unsafe-extension-debugging among the browser processes' command lines (a line without --type=). yes when one carries it; no when a browser line was read and none does;
# unread when no browser line could be read. The lines are scanned in place, never printed or kept.
function Get-S13FlagWord([string[]]$CommandLines) {
  $s13b = @($CommandLines | Where-Object { $_ -and $_ -notmatch '(^|\s)--type=' })
  if (@($s13b | Where-Object { $_ -match '(^|\s)--enable-unsafe-extension-debugging(\s|=|$)' }).Count -gt 0) { return 'yes' }
  if ($s13b.Count -gt 0) { return 'no' }
  'unread'
}

# ---- thin wrappers over the windows and UIA (stubbed in the tests) --------------------------------------------------------------------------------------
# Every visible top-level Chrome window except the worker-console capture window ($global:D) as { h; title }. The titles are for comparing only.
function Get-S13Titles {
  @(Get-S9ChromeWindows -AnyTitle | Where-Object { [long]$_ -ne [long]$global:D } | ForEach-Object { [pscustomobject]@{ h = [long]$_; title = [string][S9Win]::Text([IntPtr]$_) } })
}
# Every named descendant of one window as { name; type; el }, type the control type word ('Button').
function Get-S13UiaItems([long]$Hwnd) {
  $s13r = $S9UIA::FromHandle([IntPtr]$Hwnd)
  foreach ($s13e in @($s13r.FindAll([Windows.Automation.TreeScope]::Descendants, [Windows.Automation.Condition]::TrueCondition))) {
    $s13n = [string]$s13e.Current.Name
    if ($s13n) { [pscustomobject]@{ name = $s13n; type = ([string]$s13e.Current.ControlType.ProgrammaticName -replace '^ControlType\.', ''); el = $s13e } }
  }
}
# A toggle button's pressed state: TogglePattern On, else SelectionItem IsSelected; $null when it offers neither (then the side is unread, never guessed).
function Get-S13Pressed($El) {
  $s13p = $null
  try {
    if ($El.TryGetCurrentPattern([Windows.Automation.TogglePattern]::Pattern, [ref]$s13p)) { return ($s13p.Current.ToggleState -eq [Windows.Automation.ToggleState]::On) }
    if ($El.TryGetCurrentPattern([Windows.Automation.SelectionItemPattern]::Pattern, [ref]$s13p)) { return [bool]$s13p.Current.IsSelected }
  } catch { }
  $null
}
function Invoke-S13Item($El) { Invoke-S12UiaElement $El }   # InvokePattern, else ExpandCollapse; $false when neither or a throw (s12-win-b.ps1)
function Get-S13WinPid([long]$Hwnd) { $s13p = [uint32]0; [void][S9Win]::GetWindowThreadProcessId([IntPtr]$Hwnd, [ref]$s13p); [int]$s13p }
function Test-S13Alive([long]$Hwnd) { [bool][S9Win]::IsWindow([IntPtr]$Hwnd) }
# Adopts a DevTools window the wave opened: S11Own AND the owner pid in S9WinIds, as Wait-S9NewWindow records a window at open time (Test-S9Live refuses a handle without that record, so Test-S11Own would be false).
function Register-S13Own([long]$Hwnd) { if (-not $global:S9WinIds) { $global:S9WinIds = @{} }; $global:S9WinIds[[string]$Hwnd] = (Get-S13WinPid $Hwnd); $global:S11Own[[string]$Hwnd] = $true }
function Test-S13Pane([long]$Hwnd) { [bool](Test-S12DevToolsUi $Hwnd @(Get-S9ChromeWindows -AnyTitle | ForEach-Object { [long]$_ })) }   # a docked pane in X; every window counts as "before", so only the pane branch can fire

# ---- guards ---------------------------------------------------------------------------------------------------------------------------------------
function Assert-S13Window([long]$Hwnd, [int]$Port, [string]$What) {
  Assert-S11Own $Hwnd $What
  if ($Port -ne 8081) { Stop9 "$What : the fixture port is not 8081 - nothing done"; throw 'not the fixture port' }
}
# The fixture-page check runs only where X still shows its page alone: before DevTools opens (a docked pane adds a second document to X's UIA tree).
function Assert-S13Fixture([long]$Hwnd, [int]$Port, [string]$What) {
  Assert-S13Window $Hwnd $Port $What
  if (([string](Get-S9DocUrl $Hwnd)) -notmatch '^http://(127\.0\.0\.1|localhost):8081/') { Stop9 "window $Hwnd is not on a fixture (8081) - $What refused"; throw 'not the fixture' }
}

# ---- (b) the dock side ----------------------------------------------------------------------------------------------------------------------------
# The windows the Customize menu lives in: the wave's own DevTools window when the tab's DevTools is undocked, else X. A matching window the wave did not open gives an empty list (refused).
function Get-S13Scope([long]$Hwnd, [int]$Port) {
  $s13w = @(Get-S13Titles | Where-Object { Test-S13DevtTitle $_.title $Port })
  if ($s13w.Count -eq 0) { return @($Hwnd) }
  if (@($s13w | Where-Object { -not (Test-S11Own $_.h) }).Count -gt 0) { return @() }
  @($s13w | ForEach-Object { $_.h })
}
# Opens the Customize menu in the first scope window that has its button, then returns { hwnd; items } with the Dock side buttons as { kind; pressed; el }. $null when the button is not found once or does not open.
function Open-S13Customize([long[]]$Scope) {
  foreach ($s13h in $Scope) {
    $s13a = @(Get-S13UiaItems $s13h)
    $s13b = @($s13a | Where-Object { $_.type -eq 'Button' -and $_.name -like 'Customize and control DevTools*' })
    if ($s13b.Count -ne 1) { continue }
    if (-not (Invoke-S13Item $s13b[0].el)) { return $null }
    Start-Sleep -Milliseconds 700
    $s13i = @(Get-S13UiaItems $s13h | Where-Object { $_.type -in 'Button', 'MenuItem', 'RadioButton' -and (ConvertTo-S13DockKind $_.name) } | ForEach-Object { [pscustomobject]@{ kind = (ConvertTo-S13DockKind $_.name); pressed = (Get-S13Pressed $_.el); el = $_.el } })
    return [pscustomobject]@{ hwnd = $s13h; items = $s13i }
  }
  $null
}
# A menu left open in X is closed by an Escape into X only (foreground checked); a menu in the wave's DevTools window dies with that window, and no key goes there.
function Close-S13Customize([long]$Hwnd, $Menu) { if ($Menu -and $Menu.hwnd -eq $Hwnd) { Send-S12Escape $Hwnd } }
# R20-0C / R20-RESTORE's read: one of bottom|right|left|undock|unread. Call it with DevTools open on the tab in X, never on the capture window. Reads the window list first; reads the menu only for a docked pane.
function Read-S13DockSide([long]$Hwnd, [int]$Port) {
  Assert-S13Window $Hwnd $Port 'dock read'
  $s13n = @(Get-S13Titles | Where-Object { Test-S13DevtTitle $_.title $Port }).Count
  if ($s13n -ge 1) { return (ConvertTo-S13DockSide @() $s13n) }
  if (-not (Test-S13Pane $Hwnd)) { return 'unread' }
  $s13m = Open-S13Customize @($Hwnd)
  if (-not $s13m) { return 'unread' }
  $s13s = ConvertTo-S13DockSide $s13m.items 0
  Close-S13Customize $Hwnd $s13m
  $s13s
}
# (a, second half) Changes the dock side of the tab's DevTools in X by the Dock side button of the Customize menu. Returns { done; changed; now }: now is the side read back; done when it equals $Side.
# An unreadable side first, or a missing button, changes nothing (done = false). A DevTools window the change creates is recorded as the wave's own so Close-S13DevTools may close it.
function Set-S13DockSide([long]$Hwnd, [int]$Port, [ValidateSet('bottom', 'right', 'left', 'undock')][string]$Side) {
  Assert-S13Window $Hwnd $Port 'dock change'
  $s13cur = Read-S13DockSide $Hwnd $Port
  if ($s13cur -eq 'unread') { return [pscustomobject]@{ done = $false; changed = $false; now = 'unread' } }
  if ($s13cur -eq $Side) { return [pscustomobject]@{ done = $true; changed = $false; now = $s13cur } }
  $s13before = @(Get-S13Titles | ForEach-Object { $_.h })
  $s13scope = @(Get-S13Scope $Hwnd $Port)
  $s13m = if ($s13scope.Count) { Open-S13Customize $s13scope } else { $null }
  $s13btn = @(if ($s13m) { $s13m.items | Where-Object { $_.kind -eq $Side } })   # @(if ...) keeps a single hit an array (a lone object has no Count in 5.1)
  if ($s13btn.Count -ne 1 -or -not (Invoke-S13Item $s13btn[0].el)) { Close-S13Customize $Hwnd $s13m; return [pscustomobject]@{ done = $false; changed = $false; now = $s13cur } }
  Start-Sleep -Milliseconds 1500
  foreach ($s13t in @(Get-S13Titles)) { if ($s13before -notcontains $s13t.h -and (Test-S13DevtTitle $s13t.title $Port)) { Register-S13Own $s13t.h } }
  # an own DevTools window (the scope, never X) that docked itself back into X is gone: drop only a handle that is no window any more
  foreach ($s13k in @($s13scope | Where-Object { [long]$_ -ne $Hwnd })) { if (-not (Test-S13Alive ([long]$s13k))) { $global:S11Own.Remove([string]$s13k); if ($global:S9WinIds) { $global:S9WinIds.Remove([string]$s13k) } } }
  $s13now = Read-S13DockSide $Hwnd $Port
  [pscustomobject]@{ done = ($s13now -eq $Side); changed = $true; now = $s13now }
}
# (a) DevTools on the fixture tab in X by Run 19's app-menu opener (UIA patterns only), then, when $Side is given, the dock change. Returns { opened; side; done; now }:
# side = the side asked ('' for none), done = no side asked or the read-back equals it, now = the side read back ('' when none was asked).
function Open-S13DevTools([long]$Hwnd, [int]$Port, [string]$Side = '') {
  Assert-S13Fixture $Hwnd $Port 'DevTools open'
  if (-not (Open-S12DevToolsMenu $Hwnd)) { return [pscustomobject]@{ opened = $false; side = $Side; done = $false; now = '' } }
  if ($global:S12Dev -and $global:S12Dev.How -eq 'window') { Register-S13Own ([long]$global:S12Dev.Hwnd) }   # Run 19's opener put an undocked window in S11Own only
  if ($Side -eq '') { return [pscustomobject]@{ opened = $true; side = ''; done = $true; now = '' } }
  $s13r = Set-S13DockSide $Hwnd $Port $Side
  [pscustomobject]@{ opened = $true; side = $Side; done = [bool]$s13r.done; now = $s13r.now }
}

# ---- (c) the bridge-independent control ------------------------------------------------------------------------------------------------------------
# attached/targets from chrome.debugger.getTargets() evaluated in the worker-console capture window ($global:D), as Read-R20Worker does (s13-r20.ps1). Unreadable = attached unread, targets 0 (not meaningful then).
function Read-S13Targets([string]$Marker, [int]$TimeoutMs = 8000) {
  $s13res = [pscustomobject]@{ attached = 'unread'; targets = 0 }
  if (-not (Test-S13Marker $Marker)) { return $s13res }
  $s13e = Join-Path $env:S11_OUT 's13-devt-read.expr'; $s13d = Join-Path $env:S11_OUT 's13-devt-read.dump'
  try {
    [IO.File]::WriteAllText($s13e, (New-S13TargetsExpr $Marker), (New-Object Text.UTF8Encoding $false))
    $s13c = Start-S11bConsoleEval $global:D 'stored' @() $s13e
    if ($null -eq $s13c.Code) {
      $s13t0 = Get-Date; $s13g = $null
      do {
        Start-Sleep -Milliseconds 300
        $s13tl = Get-S11bTail (Save-S11bConsole $global:D $s13d) "S11B-MARK $($s13c.Mark)"
        $s13g = if ($s13tl.Found) { Get-S13TargetsRead $s13tl.Lines } else { $null }
      } while ($null -eq $s13g -and ((Get-Date) - $s13t0).TotalMilliseconds -lt $TimeoutMs)
      if ($s13g) { $s13res = $s13g }
    }
  } catch { } finally { Remove-Item -LiteralPath $s13e, $s13d -Force -ErrorAction Ignore }
  $s13res
}
# One CTRL20 reading for the fixture tab whose URL carries $Marker (e.g. 's12=con'). Leg `docked` has no window of its own: windows $null (form: n/a), title n/a. Returns { windows; title; attached; targets },
# the Ctl fields of recipes/s13-forms.ts plus targets. Read it BEFORE the bridge's call. Touches window X in no way (no key, no UIA).
function Get-S13Control([long]$Hwnd, [int]$Port, [string]$Marker, [ValidateSet('undock', 'docked')][string]$Leg) {
  Assert-S13Window $Hwnd $Port 'DevTools control'
  $s13t = Read-S13Targets $Marker
  if ($Leg -eq 'docked') { return [pscustomobject]@{ windows = $null; title = 'n/a'; attached = $s13t.attached; targets = $s13t.targets } }
  $s13w = Get-S13TitleRead @(Get-S13Titles | ForEach-Object { $_.title }) $Port $Marker
  [pscustomobject]@{ windows = $s13w.windows; title = $s13w.title; attached = $s13t.attached; targets = $s13t.targets }
}

# ---- (d) closing what the wave opened -------------------------------------------------------------------------------------------------------------
# Closes every DevTools window the wave opened (S11Own and titled DevTools; the capture window excluded; a window the wave did not open is never touched), then a docked pane in X by F12 (only when UIA shows
# the pane: F12 would open one otherwise). Returns { closed; windows; pane; remaining }: what is left, counted over the wave's own DevTools windows plus any window titled for this fixture port, plus the pane. The caller decides on a STOP.
function Close-S13DevTools([long]$Hwnd, [int]$Port) {
  Assert-S13Window $Hwnd $Port 'DevTools close'
  $s13closed = 0
  foreach ($s13t in @(Get-S13Titles | Where-Object { $_.title -match '^DevTools' })) {
    if (Test-S11Own $s13t.h) { Close-S9Window $s13t.h; $global:S11Own.Remove([string]$s13t.h); $s13closed++ }
  }
  Start-Sleep -Milliseconds 800
  if (Test-S13Pane $Hwnd) { Send-S12Key $Hwnd 'F12'; $s13closed++; Start-Sleep -Milliseconds 800 }
  $s13win = @(Get-S13Titles | Where-Object { (Test-S13DevtTitle $_.title $Port) -or ($_.title -match '^DevTools' -and (Test-S11Own $_.h)) }).Count   # the wave's own windows and any titled for this fixture; never a human's DevTools on another page
  $s13pane = if (Test-S13Pane $Hwnd) { 1 } else { 0 }
  [pscustomobject]@{ closed = $s13closed; windows = $s13win; pane = $s13pane; remaining = ($s13win + $s13pane) }
}

# ---- (e) FLAG ---------------------------------------------------------------------------------------------------------------------------------------
# yes | no | unread from the chrome.exe processes' command lines. Any error is unread. The lines live only inside the pipeline.
function Read-S13Flag {
  try { Get-S13FlagWord @(Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" -ErrorAction Stop | ForEach-Object { "$($_.CommandLine)" }) } catch { 'unread' }
}
