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
# The Dock side buttons among a window's named UIA items as { kind; pressed; el } (pressed $true, $false or $null when unreadable).
function Get-S13DockItems($Items) {
  @($Items | Where-Object { $_.type -in 'Button', 'MenuItem', 'RadioButton' -and (ConvertTo-S13DockKind $_.name) } | ForEach-Object { [pscustomobject]@{ kind = (ConvertTo-S13DockKind $_.name); pressed = (Get-S13Pressed $_.el); el = $_.el } })
}
# The counts-only diagnostic of the last dock read (F3, #418): never a name, title, URL or user text. kinds = how many items of each kind (u undock, l left, b bottom, r right).
function New-S13DockDiag($Windows = 'n/a', [string]$Pane = 'n/a', $Customize = 'n/a', [string]$Invoked = 'n/a', $Items = $null) {
  $s13d = [pscustomobject]@{ windows = $Windows; pane = $Pane; customize = $Customize; invoked = $Invoked; items = 0; kinds = 'u0l0b0r0'; pr = 0; pressed = 0; trynum = 'n/a' }
  if ($null -ne $Items) { Set-S13DiagItems $s13d @($Items) }
  $s13d
}
function Set-S13DiagItems($Diag, $Items) {
  $s13i = @($Items); $s13c = @{}
  foreach ($s13k in 'undock', 'left', 'bottom', 'right') { $s13c[$s13k] = @($s13i | Where-Object { $_.kind -eq $s13k }).Count }
  $Diag.items = $s13i.Count; $Diag.kinds = "u$($s13c['undock'])l$($s13c['left'])b$($s13c['bottom'])r$($s13c['right'])"
  $Diag.pr = @($s13i | Where-Object { $null -ne $_.pressed }).Count; $Diag.pressed = @($s13i | Where-Object { $_.pressed -eq $true }).Count
}
function Set-S13DiagField([string]$Name, $Value) { if ($global:S13DockDiag) { $global:S13DockDiag.$Name = $Value } }
# #418 F4: Chrome 156 shows the docked Customize button as a nested pair of Button elements of one name (measured): the toolbar button (class word main-menu, ExpandCollapse) and its inner icon (Invoke).
# The tries, in order, among the matches: one match -> it; two with exactly one main-menu -> the menu opener, then the other; anything else -> none (the side stays unread).
function Get-S13ClassWord($It) { if ($It.PSObject.Properties['cls']) { return [string]$It.cls }; try { [string]$It.el.Current.ClassName } catch { '' } }
function Get-S13CustomizeTries($Matches) {
  $s13m = @($Matches)
  if ($s13m.Count -eq 1) { return $s13m }
  if ($s13m.Count -ne 2) { return @() }
  $s13mm = @($s13m | Where-Object { (Get-S13ClassWord $_) -split '\s+' -contains 'main-menu' })
  if ($s13mm.Count -ne 1) { return @() }
  @($s13mm[0]) + @($s13m | Where-Object { $_ -ne $s13mm[0] })
}
# Each try: invoke, poll up to 3.6 s for Dock side items; none appeared -> Escape into the window and the next try. Returns { hwnd; items; tryn } or $null; the diagnostic keeps which try opened it (1, 2 or none).
function Invoke-S13OpenTries([long]$Hwnd, $Tries) {
  $s13n = 0
  foreach ($s13t in @($Tries)) {
    $s13n++
    $s13v = [bool](Invoke-S13Item $s13t.el)
    Set-S13DiagField 'invoked' $(if ($s13v) { 'yes' } else { 'no' })
    if (-not $s13v) { continue }
    $s13p = Invoke-S13Poll { param($t, $ms) @(Get-S13DockItems @(Get-S13UiaItems $Hwnd)).Count -gt 0 } 3600 300
    $s13i = @(Get-S13DockItems @(Get-S13UiaItems $Hwnd))
    if ($s13p.found -and $s13i.Count -gt 0) {
      Set-S13DiagField 'trynum' "$s13n"
      if ($global:S13DockDiag) { Set-S13DiagItems $global:S13DockDiag $s13i }
      return [pscustomobject]@{ hwnd = $Hwnd; items = $s13i; tryn = $s13n }
    }
    Close-S13Customize $Hwnd ([pscustomobject]@{ hwnd = $Hwnd })
  }
  Set-S13DiagField 'trynum' 'none'
  $null
}
# Opens the Customize menu in the first scope window that has its button, then returns { hwnd; items } with the Dock side buttons as { kind; pressed; el }. $null when the button is not chosen or no try opens it.
function Open-S13Customize([long[]]$Scope) {
  foreach ($s13h in $Scope) {
    $s13b = @(@(Get-S13UiaItems $s13h) | Where-Object { $_.type -eq 'Button' -and $_.name -like 'Customize and control DevTools*' })
    Set-S13DiagField 'customize' $s13b.Count
    $s13tr = @(Get-S13CustomizeTries $s13b)
    if ($s13tr.Count -eq 0) { Set-S13DiagField 'trynum' 'none'; continue }
    return (Invoke-S13OpenTries $s13h $s13tr)
  }
  $null
}
# A menu left open in X is closed by an Escape into X only (foreground checked); a menu in the wave's DevTools window dies with that window, and no key goes there.
function Close-S13Customize([long]$Hwnd, $Menu) { if ($Menu -and $Menu.hwnd -eq $Hwnd) { Send-S12Escape $Hwnd } }
# R20-0C / R20-RESTORE's read: one of bottom|right|left|undock|unread. Call it with DevTools open on the tab in X, never on the capture window. Reads the window list first; reads the menu only for a docked pane.
function Read-S13DockSide([long]$Hwnd, [int]$Port) {
  Assert-S13Window $Hwnd $Port 'dock read'
  $global:S13DockDiag = New-S13DockDiag
  $s13n = @(Get-S13Titles | Where-Object { Test-S13DevtTitle $_.title $Port }).Count
  Set-S13DiagField 'windows' $s13n
  if ($s13n -ge 1) { return (ConvertTo-S13DockSide @() $s13n) }
  $s13pn = [bool](Test-S13Pane $Hwnd)
  Set-S13DiagField 'pane' $(if ($s13pn) { 'yes' } else { 'no' })
  if (-not $s13pn) { return 'unread' }
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

# ---- the live dock diagnostic (#418): ONE read of the real DevTools UIA structure in window X, counts and element descriptors only ----------------------------
# Writes an evidence file (the caller passes a path outside the repo). Never the document URL, a window title, a tab title, the omnibox value or a Value pattern; an element whose name or id suggests the
# profile, account or avatar is skipped, and so are Document, TabItem, Window and TitleBar elements (their names are page or tab titles). At most one button is invoked, never a Dock side button.
# F2 (#418 verifier): also skipped by the class name of Chrome's own views (bookmarks, extension buttons, avatar, tab hover card, omnibox, side panel, downloads, infobars).
function Test-S13DiagSkip([string]$Name, [string]$Id, [string]$Class = '') { (("$Name $Id") -match '(?i)profile|account|avatar') -or ("$Class" -match '(?i)BookmarkButton|BookmarkBar|ToolbarActionView|Extensions|Avatar|Profile|TabHoverCard|^Tab|Omnibox|LocationBar|SidePanel|Download|Infobar|BrowserView') }
# The help field is written only for a fixed DevTools name (it can hold a URL on a bookmark button).
function Test-S13FixedName([string]$Name) { "$Name" -match '^(Customize and control DevTools|Dock side|Undock|Dock to |More options|More tools|Settings|Close)' }
# F4: pressed-state extras only for a Dock side kind or the Customize button.
function Test-S13DiagStateName([string]$Name) { [bool](ConvertTo-S13DockKind $Name) -or ("$Name" -like 'Customize and control DevTools*') }
function Format-S13DiagLegacy($State) { $s13n = 0; if (-not [int]::TryParse("$State", [ref]$s13n)) { return 'Leg=n/a' }; $s13w = @(); if ($s13n -band 2) { $s13w += 'selected' }; if ($s13n -band 8) { $s13w += 'pressed' }; if ($s13n -band 16) { $s13w += 'checked' }; "Leg=$s13n($($s13w -join ','))" }
# F3: a new top-level window is read only when it looks like a popup menu; else its type and (fixed Chrome) class only.
function Test-S13PopupMenu([string]$Type, [string]$Class) { $Type -eq 'Menu' -or "$Class" -match '^(#32768|MenuHost)' }
function Format-S13NewWinSkip([string]$Type, [string]$Class) { $s13c = if ("$Class" -match '^(Chrome_WidgetWin_\d+|Chrome_RenderWidgetHostHWND|#32768|NativeHWNDHost|MenuHost\w*)$') { $Class } else { '-' }; "NEWWIN skipped type=$Type class=$s13c" }
# F1: a probe retried every $StepMs up to $MaxMs; returns { found; tries; ms }. $Probe gets (try, ms) and returns $true when satisfied.
function Invoke-S13Poll([scriptblock]$Probe, [int]$MaxMs = 6000, [int]$StepMs = 300, [scriptblock]$Sleep = { param($m) Start-Sleep -Milliseconds $m }) {
  $s13sw = [Diagnostics.Stopwatch]::StartNew(); $s13n = [Math]::Max(1, [int]($MaxMs / $StepMs))
  for ($s13t = 1; $s13t -le $s13n + 1; $s13t++) { if (& $Probe $s13t $s13sw.ElapsedMilliseconds) { return [pscustomobject]@{ found = $true; tries = $s13t; ms = $s13sw.ElapsedMilliseconds } }; if ($s13t -le $s13n) { & $Sleep $StepMs } }
  [pscustomobject]@{ found = $false; tries = $s13n + 1; ms = $s13sw.ElapsedMilliseconds }
}
function Test-S13DiagKeyword([string]$Name) { $Name -match '(?i)customize|control|devtools|dock|undock|side|more options|menu' }
function Format-S13DiagText([string]$Text, [int]$Max = 60) { $s13t = ("$Text" -replace '[\r\n|]', ' '); if ($s13t.Length -gt $Max) { $s13t.Substring(0, $Max) } else { $s13t } }
function Format-S13DiagCounts([string]$Tag, $D) { "COUNTS $Tag windows=$($D.windows) pane=$($D.pane) customize=$($D.customize) invoked=$($D.invoked) items=$($D.items) kinds=$($D.kinds) pressed-readable=$($D.pr) pressed=$($D.pressed)" }
function Add-S13DiagLine([string]$File, [string]$Text) { [IO.File]::AppendAllText($File, ($Text + "`r`n"), (New-Object Text.UTF8Encoding $false)) }
# Every UIA descendant of an element as { el; type; name; id }, named or not.
function Get-S13DiagAll($Root) {
  foreach ($s13e in @($Root.FindAll([Windows.Automation.TreeScope]::Descendants, [Windows.Automation.Condition]::TrueCondition))) {
    try { [pscustomobject]@{ el = $s13e; type = ([string]$s13e.Current.ControlType.ProgrammaticName -replace '^ControlType\.', ''); name = [string]$s13e.Current.Name; id = [string]$s13e.Current.AutomationId } } catch { }
  }
}
# One descriptor line: type|name|id|class|patterns (Invoke, Toggle state, Sel IsSelected, Exp state)|help; $null for a skipped element.
function Get-S13DiagDesc($It) {
  try {
    $s13el = $It.el; $s13cls = [string]$s13el.Current.ClassName
    if ($It.type -in 'Document', 'TabItem', 'Window', 'TitleBar' -or (Test-S13DiagSkip $It.name $It.id $s13cls)) { return $null }
    $s13pt = @(); $s13p = $null
    if ($s13el.TryGetCurrentPattern([Windows.Automation.InvokePattern]::Pattern, [ref]$s13p)) { $s13pt += 'Invoke' }
    $s13p = $null; if ($s13el.TryGetCurrentPattern([Windows.Automation.TogglePattern]::Pattern, [ref]$s13p)) { $s13pt += "Toggle=$($s13p.Current.ToggleState)" }
    $s13p = $null; if ($s13el.TryGetCurrentPattern([Windows.Automation.SelectionItemPattern]::Pattern, [ref]$s13p)) { $s13pt += "Sel=$($s13p.Current.IsSelected)" }
    $s13p = $null; if ($s13el.TryGetCurrentPattern([Windows.Automation.ExpandCollapsePattern]::Pattern, [ref]$s13p)) { $s13pt += "Exp=$($s13p.Current.ExpandCollapseState)" }
    if (Test-S13DiagStateName $It.name) {
      foreach ($s13pr in @(@('Leg', 30096), @('AriaRole', 30101), @('AriaProps', 30102))) {
        $s13pv = 'n/a'; try { $s13pv = $s13el.GetCurrentPropertyValue([Windows.Automation.AutomationProperty]::LookupById([int]$s13pr[1])) } catch { }
        $s13pt += $(if ($s13pr[0] -eq 'Leg') { Format-S13DiagLegacy $s13pv } elseif ($s13pr[0] -eq 'AriaRole') { "AriaRole=$(Format-S13DiagText ([string]$s13pv) 20)" } else { "AriaProps=$(Format-S13DiagText ([string]$s13pv) 80)" })
      }
    }
    $s13help = if (Test-S13FixedName $It.name) { Format-S13DiagText ([string]$s13el.Current.HelpText) } else { '-' }
    "$($It.type)|$(Format-S13DiagText $It.name)|$(Format-S13DiagText $It.id 40)|$(Format-S13DiagText $s13cls 40)|$($s13pt -join ',')|$s13help"
  } catch { $null }
}
function Test-S13InRect($El, $Rects) {
  try { $s13r = $El.Current.BoundingRectangle; if ($s13r.IsEmpty) { return $false }; $s13x = $s13r.X + $s13r.Width / 2; $s13y = $s13r.Y + $s13r.Height / 2; @($Rects | Where-Object { $_.Contains([double]$s13x, [double]$s13y) }).Count -gt 0 } catch { $false }
}
function Get-S13TopWindows([int]$ProcId) {
  @([Windows.Automation.AutomationElement]::RootElement.FindAll([Windows.Automation.TreeScope]::Children, [Windows.Automation.Condition]::TrueCondition) | Where-Object { try { $_.Current.ProcessId -eq $ProcId } catch { $false } })
}
function Get-S13RunId($El) { try { $El.GetRuntimeId() -join '.' } catch { '' } }
# The counts of the Customize read in X as Read-S13DockSide would take them (no key sent, no invoke).
function Get-S13DiagCounts([long]$Hwnd, [string]$Pane, [string]$Invoked) {
  $s13a = @(Get-S13UiaItems $Hwnd)
  New-S13DockDiag 0 $Pane @($s13a | Where-Object { $_.type -eq 'Button' -and $_.name -like 'Customize and control DevTools*' }).Count $Invoked @(Get-S13DockItems $s13a)
}
function Write-S13DiagKeywords([string]$File, [string]$Tag, $All, $Rects) {
  $s13n = 0
  foreach ($s13it in $All) { if ((Test-S13DiagKeyword $s13it.name) -and $s13n -lt 60 -and (Test-S13InRect $s13it.el $Rects)) { $s13l = Get-S13DiagDesc $s13it; if ($s13l) { Add-S13DiagLine $File "KEY $Tag $s13l"; $s13n++ } } }
  Add-S13DiagLine $File "KEY $Tag lines=$s13n"
}
function Get-S13DockDiag([long]$Hwnd, [int]$Port, [string]$OutFile) {
  Assert-S13Window $Hwnd $Port 'dock diagnostic'
  $s13pane = [bool](Test-S13Pane $Hwnd); $s13pw = if ($s13pane) { 'yes' } else { 'no' }
  $s13pid = Get-S13WinPid $Hwnd
  $s13before = @(Get-S13TopWindows $s13pid | ForEach-Object { Get-S13RunId $_ })
  $s13all = @(Get-S13DiagAll ($S9UIA::FromHandle([IntPtr]$Hwnd)))
  Add-S13DiagLine $OutFile "DOCKDIAG pane=$s13pw elements=$($s13all.Count) top-before=$($s13before.Count)"
  # F1: the Customize button is looked for every 300 ms up to 6 s (the DevTools tree is built late); each try writes counts and ms only.
  $s13st = @{ all = $s13all }
  $s13pl = Invoke-S13Poll { param($t, $ms) if ($t -gt 1) { $s13st.all = @(Get-S13DiagAll ($S9UIA::FromHandle([IntPtr]$Hwnd))) }; $s13mm = @(Get-S13CustomizeTries @($s13st.all | Where-Object { $_.type -eq 'Button' -and $_.name -like 'Customize and control DevTools*' })).Count; Add-S13DiagLine $OutFile "DOCKDIAG button-poll try=$t ms=$ms elements=$($s13st.all.Count) matches=$s13mm"; $s13mm -gt 0 }
  Add-S13DiagLine $OutFile "DOCKDIAG button-poll found=$(if ($s13pl.found) { 'yes' } else { 'no' }) tries=$($s13pl.tries) ms=$($s13pl.ms)"
  $s13all = @($s13st.all)
  # F2: KEY lines and the keyword search stay inside the DevTools document (a Document named DevTools*; else every Document rectangle), never the page's.
  $s13docs = @($s13all | Where-Object { $_.type -eq 'Document' })
  $s13dd = @($s13docs | Where-Object { $_.name -like 'DevTools*' }); $s13rsrc = if ($s13dd.Count) { 'devtools-doc' } else { 'all-docs' }; if (-not $s13dd.Count) { $s13dd = $s13docs }
  $s13rects = @($s13dd | ForEach-Object { try { $_.el.Current.BoundingRectangle } catch { } } | Where-Object { $_ -and -not $_.IsEmpty })
  Add-S13DiagLine $OutFile "DOCKDIAG key-region=$s13rsrc documents=$($s13docs.Count) rects=$($s13rects.Count)"
  Write-S13DiagKeywords $OutFile 'before' $s13all $s13rects
  $s13a = @($s13all | Where-Object { $_.name })
  $s13cand = @($s13a | Where-Object { $_.type -eq 'Button' -and $_.name -like 'Customize and control DevTools*' }); $s13cur = $s13cand.Count; $s13how = 'current'; $s13tr = @(Get-S13CustomizeTries $s13cand)
  if ($s13tr.Count -eq 0) { $s13how = 'keyword'; $s13cand = @($s13a | Where-Object { $_.type -eq 'Button' -and $_.name -match '(?i)customize|more options' -and -not (Test-S13DiagSkip $_.name $_.id) -and (Test-S13InRect $_.el $s13rects) }); $s13tr = if ($s13cand.Count -eq 1) { @($s13cand[0]) } else { @() } }
  Add-S13DiagLine $OutFile "DOCKDIAG current-name-matches=$s13cur used=$s13how candidates=$($s13cand.Count) document-rects=$($s13rects.Count)"
  $s13inv = 'n/a'; $s13c1 = $null; $s13c2 = $null; $s13new = 0
  if ($s13tr.Count -gt 0) {
   $s13tn = 0
   foreach ($s13cx in $s13tr) {
    $s13tn++; $s13c1 = $null; $s13c2 = $null
    Add-S13DiagLine $OutFile "DOCKDIAG button try=$s13tn $(Get-S13DiagDesc $s13cx)"
    $s13before = @(Get-S13TopWindows $s13pid | ForEach-Object { Get-S13RunId $_ })   # F3: only windows that appear after the invoke
    $s13inv = if (Invoke-S13Item $s13cx.el) { 'yes' } else { 'no' }
    $s13sw = [Diagnostics.Stopwatch]::StartNew()
    if ($s13inv -eq 'yes') { try {
      Start-Sleep -Milliseconds 700; $s13c1 = Get-S13DiagCounts $Hwnd $s13pw $s13inv; Add-S13DiagLine $OutFile (Format-S13DiagCounts "at-$($s13sw.ElapsedMilliseconds)ms" $s13c1)
      if ($s13c1.items -eq 0) {   # F1: the Dock side items are looked for every 300 ms up to 3.6 s more; counts and ms only
        $s13ip = Invoke-S13Poll { param($t, $ms) @(Get-S13DockItems @(Get-S13UiaItems $Hwnd)).Count -gt 0 } 3600 300
        Add-S13DiagLine $OutFile "DOCKDIAG items-poll found=$(if ($s13ip.found) { 'yes' } else { 'no' }) tries=$($s13ip.tries) at=$($s13sw.ElapsedMilliseconds)ms"
      }
      if ($s13sw.ElapsedMilliseconds -lt 2500) { Start-Sleep -Milliseconds (2500 - [int]$s13sw.ElapsedMilliseconds) }
      $s13c2 = Get-S13DiagCounts $Hwnd $s13pw $s13inv; Add-S13DiagLine $OutFile (Format-S13DiagCounts "at-$($s13sw.ElapsedMilliseconds)ms" $s13c2)
      $s13after = @(Get-S13DiagAll ($S9UIA::FromHandle([IntPtr]$Hwnd)))
      Write-S13DiagKeywords $OutFile 'after' $s13after $s13rects
      $s13budget = 80
      foreach ($s13m in @($s13after | Where-Object { $_.type -eq 'Menu' })) {
        foreach ($s13d in @(Get-S13DiagAll $s13m.el)) { $s13l = Get-S13DiagDesc $s13d; if ($s13l -and $s13budget -gt 0) { Add-S13DiagLine $OutFile "MENU $s13l"; $s13budget-- } }
      }
      foreach ($s13w in @(Get-S13TopWindows $s13pid | Where-Object { $s13before -notcontains (Get-S13RunId $_) })) {
        $s13new++
        $s13wt = ''; $s13wc = ''; try { $s13wt = [string]$s13w.Current.ControlType.ProgrammaticName -replace '^ControlType\.', ''; $s13wc = [string]$s13w.Current.ClassName } catch { }
        if (-not (Test-S13PopupMenu $s13wt $s13wc)) { Add-S13DiagLine $OutFile (Format-S13NewWinSkip $s13wt $s13wc); continue }   # F3: never a window title, never a non-menu window's tree
        $s13wd = @(Get-S13DiagAll $s13w)
        if ($s13wd.Count -gt 150) { Add-S13DiagLine $OutFile "NEWWIN skipped-large descendants=$($s13wd.Count)"; continue }
        foreach ($s13d in $s13wd) { $s13l = Get-S13DiagDesc $s13d; if ($s13l -and $s13budget -gt 0) { Add-S13DiagLine $OutFile "NEWWIN $s13l"; $s13budget-- } }
      }
      Add-S13DiagLine $OutFile "DOCKDIAG new-top-windows=$s13new menu-lines-left=$s13budget"
    } finally { Send-S12Escape $Hwnd } }   # the menu this opened, closed by an Escape into X only
    $s13op = ($s13c1 -and $s13c1.items -gt 0) -or ($s13c2 -and $s13c2.items -gt 0)
    Add-S13DiagLine $OutFile "DOCKDIAG try=$s13tn opened=$(if ($s13op) { 'yes' } else { 'no' }) items=$(if ($s13c2) { $s13c2.items } elseif ($s13c1) { $s13c1.items } else { 0 })"
    if ($s13op) { break }
   }
  } else { Add-S13DiagLine $OutFile 'DOCKDIAG no unique Customize or More options button inside the pane: nothing invoked' }
  [pscustomobject]@{ pane = $s13pw; used = $s13how; invoked = $s13inv; counts700 = $s13c1; counts2500 = $s13c2; newwin = $s13new }
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
