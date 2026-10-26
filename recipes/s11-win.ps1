# recipes/s11-win.ps1: Windows UI Automation helpers for Step 11's live wave (Run 16; docs/e2e-test-plan.md section 4.23).
# Windows PowerShell 5.1, ASCII only. Dot-source it: it loads recipes/s10-win.ps1 (and through it s9-win.ps1, unchanged).
# Written by S5-win (Sonnet 5.5); NOT run against Chrome by its author (nothing in this slice touches Chrome). A helper bug
# found live is fixed between rows and recorded; a helper never changes a row's expected text or pass rule.
#
# Rules mirrored from recipes/s11-win-rules.ts (tied by recipes/test/s11-win-static.test.ts):
#   sha256 of UTF-8 text, non-blank line count, Add-S11Line, signal names, the URL allow-list, the occluder verdict.
# Prints no folder, block-list pattern, path or token: only counts, flags, handles and row names. Every printed line is
# checked by the static scan (scanPs1Output). A guard that fails prints a line starting STOP: and the helper returns $false
# (or throws). Only windows this file opened (marked, then recorded in $global:S11Own) are ever typed into or closed.
# The file-URL toggle ("Allow access to file URLs") is READ ONLY: Read-S11FileAccess reads ToggleState and nothing else.
#
# Contract with S5-actor (recipes/s11.ts): signal files <name>.ready / <name>.pressed in $S11_OUT; found.json is written here.
. "$PSScriptRoot\s10-win.ps1"

function Format-S9Title([string]$t) {
  if ($t -match '^(Agent Bridge E2E Playground|S9 W human tab|S10 MCPF fixture|S10 CAP fixture|S10 SAVE fixture|S11 upload fixture|S11 patched fixture|S11 frame|S11 [A-Za-z ]+|Extensions|Extensions - Chrome Agent Bridge|Extensions - Keyboard shortcuts|Chrome Agent Bridge . Options|about:blank|New Tab|s15leg-[0-9a-f]{32})( - Google Chrome)?$') { return $t }
  if ($t -match "^DevTools - chrome-extension://$S9Id/") { return $t }
  if ($t -match '^DevTools') { return '<DevTools window>' }
  '<other window>'
}

# ---- constants mirrored from s11-rules.ts (a test ties each literal) ----------------------------------------------------
$S11Warning = 'An agent may upload any file inside these folders to any site it can open. Allow only folders that hold files you mean to share. Never allow your home folder, or any folder that holds bridge.token or a .ssh folder. An agent that can also run programs on this computer can put any file into an allowed folder.'
$S11Typed = @('relative\fixture-folder', 'C:\', 'C:\Users\fixture-home')
$S11Boxes = @{ blocklist = @{ Save = 'save-blocklist'; Btn = 'Save blocked sites' }; uploadfolders = @{ Save = 'save-uploadfolders'; Btn = 'Save upload folders' } }
$S11Out = if ($env:S11_OUT) { $env:S11_OUT } else { Join-Path ([IO.Path]::GetTempPath()) 'bridge-e2e\s11' }
if (-not $global:S11Own) { $global:S11Own = @{} }
$S11Utf8 = New-Object Text.UTF8Encoding $false
$S11SampleTailMs = 4000   # section 4.23: the banner clauses judge the 4 s after the reply

# ---- small mirrors of the pure rules ----------------------------------------------------------------------------------
function Get-S11Lines([string]$t) { @($t -split "`r?`n" | Where-Object { $_.Trim() -ne '' }).Count }
function Get-S11Sha([string]$t) { Get-S9Sha256 $t }
# s11-win-rules.ts addLine: the found text stays a prefix; the newline style is the found text's.
function Add-S11Line([string]$Found, [string]$Line) {
  if ($Line -match "[`r`n]") { throw 'Add-S11Line: the line holds a newline' }
  if ($Found -eq '') { return $Line }
  $nl = if ($Found.Contains("`r`n")) { "`r`n" } else { "`n" }
  if ($Found.EndsWith("`n")) { return ($Found + $Line) }
  $Found + $nl + $Line
}
# A file holding the user's text or its hash must lie outside the repo (full path, case-insensitive). Returns the full path.
function Assert-S11Outside([string]$P) {
  $f = [IO.Path]::GetFullPath($P).TrimEnd('\') + '\'; $r = [IO.Path]::GetFullPath($S9Repo).TrimEnd('\') + '\'
  if ($f.StartsWith($r, [StringComparison]::OrdinalIgnoreCase)) { throw 'a file holding the user''s text or its hash must lie outside the repo' }
  $f.TrimEnd('\')
}
function Test-S11Name([string]$Name) { $Name -match '^[A-Za-z0-9][A-Za-z0-9-]*$' }
function Test-S11Url([string]$Url) {
  if ($Url -eq 'about:blank' -or $Url -eq 'chrome://extensions' -or $Url.StartsWith("chrome://extensions/?id=$S9Id")) { return $true }
  if ($Url.StartsWith("chrome-extension://$S9Id/")) { return $true }
  $Url -match '^http://(127\.0\.0\.1|localhost|[a-z0-9-]+\.localhost):(8081|8084)(/|$)'
}
# State.alias (state.json, written by s11.ts make): returned to the caller, never printed.
function Get-S11Alias {
  $j = [IO.File]::ReadAllText((Join-Path $S11Out 'state.json'), $S11Utf8) | ConvertFrom-Json
  [string]$j.alias
}

# ---- signal files (S5-actor's contract) -------------------------------------------------------------------------------
function Get-S11Signal([string]$Name, [ValidateSet('ready', 'pressed')][string]$Kind) {
  if (-not (Test-S11Name $Name)) { throw 'not a signal name' }
  Join-Path $S11Out "$Name.$Kind"
}
function Clear-S11Signals { New-Item -ItemType Directory -Force $S11Out | Out-Null; Get-ChildItem -LiteralPath $S11Out -Filter '*.ready' | Remove-Item -Force; Get-ChildItem -LiteralPath $S11Out -Filter '*.pressed' | Remove-Item -Force }
# Waits for <Name>.ready, consumes it (deleted), returns $true; throws at the bound.
function Wait-S11Ready([string]$Name, [int]$TimeoutSec = 120) {
  $f = Get-S11Signal $Name 'ready'; $t0 = Get-Date
  while (-not (Test-Path -LiteralPath $f)) { if (((Get-Date) - $t0).TotalSeconds -gt $TimeoutSec) { throw "no ready signal for $Name within the bound" }; Start-Sleep -Milliseconds 20 }
  Remove-Item -LiteralPath $f -Force
  Say9 "READY seen for $Name"
  $true
}
function Write-S11Pressed([string]$Name, [string]$Content = 'done') { [IO.File]::WriteAllText((Get-S11Signal $Name 'pressed'), $Content, $S11Utf8) }
# The banner sampler around a row: <Row>-sample.ready -> start polling -> <Row>-sample.pressed; <Row>-sampled.ready -> stop,
# <Row>-sampled.pressed = seen | none. Polls in this loop (one thread); the windows are the wave's own.
function Invoke-S11Sampler([string]$Row, [long[]]$Hwnds, [int]$TimeoutSec = 180) {
  foreach ($h in $Hwnds) { Assert-S11Own $h 'banner sampler' }
  [void](Wait-S11Ready "$Row-sample"); Write-S11Pressed "$Row-sample"
  $stop = Get-S11Signal "$Row-sampled" 'ready'; $t0 = Get-Date; $seen = 0; $total = 0
  do {
    foreach ($h in $Hwnds) { $total++; if ((Test-S9Banner $h) -gt 0) { $seen++ } }
    Start-Sleep -Milliseconds 120
  } until ((Test-Path -LiteralPath $stop) -or ((Get-Date) - $t0).TotalSeconds -gt $TimeoutSec)
  if (-not (Test-Path -LiteralPath $stop)) { throw "no sampled signal for $Row within the bound" }
  Remove-Item -LiteralPath $stop -Force
  $post = 0; $t1 = Get-Date   # the reply is in: keep polling for the sheet's 4 s window before answering
  do {
    foreach ($h in $Hwnds) { $total++; $post++; if ((Test-S9Banner $h) -gt 0) { $seen++ } }
    Start-Sleep -Milliseconds 120
  } while (((Get-Date) - $t1).TotalMilliseconds -lt $S11SampleTailMs)
  $res = if ($seen -gt 0) { 'seen' } else { 'none' }
  Write-S11Pressed "$Row-sampled" $res
  Say9 "SAMPLER $Row polls=$total (after the reply $post) banner=$res"
}
# A state change around the actor's call: <Id>.ready -> Do -> <Id>.pressed; <Id>-done.ready -> Undo -> <Id>-done.pressed.
function Invoke-S11Change([string]$Id, [scriptblock]$Do, [scriptblock]$Undo) {
  [void](Wait-S11Ready $Id); & $Do; Write-S11Pressed $Id
  [void](Wait-S11Ready "$Id-done"); & $Undo; Write-S11Pressed "$Id-done"
}

# ---- the wave's own windows ---------------------------------------------------------------------------------------------
function Test-S11Own([long]$Hwnd) { $global:S11Own.ContainsKey([string]$Hwnd) -and (Test-S9Live $Hwnd) }
function Assert-S11Own([long]$Hwnd, [string]$What) {
  if (-not (Test-S11Own $Hwnd)) { Stop9 "window $Hwnd is not one this wave opened ($What) - nothing sent to it"; throw 'not the wave''s own window' }
}
# Opens a marked window (s10-win.ps1 Open-S10MarkedWindow, after the window set is stable) and types an allowed URL into it.
# Returns the handle, or 0 after a STOP line.
function Open-S11Window([string]$Url) {
  if (-not (Test-S11Url $Url)) { Stop9 'Open-S11Window: that URL is not on the allow-list (fixtures on 8081/8084, chrome://extensions, this extension)'; return 0 }
  if (-not $global:S11Stable) { if (-not (Wait-S10StableWindows 'S11' 'open')) { return 0 }; $global:S11Stable = $true }
  if (-not (Get-Process chrome -ErrorAction SilentlyContinue)) { Stop9 'Open-S11Window: Chrome is not running; it is never launched from here (human gate)'; return 0 }
  $mw = Open-S10MarkedWindow 'S11' 'open'
  if (-not $mw) { return 0 }
  $h = [long]$mw.h
  $global:S11Own[[string]$h] = $true
  Set-S9Omnibox $h $Url
  $h
}
function Open-S11Options { Open-S11Window $S9OptionsUrl }
function Open-S11Extensions { Open-S11Window "chrome://extensions/?id=$S9Id" }
function Close-S11Window([long]$Hwnd) {
  if (-not (Test-S11Own $Hwnd)) { Say9 "window $Hwnd is not live and the wave's own - not closed"; return }
  Close-S9Window $Hwnd
  $global:S11Own.Remove([string]$Hwnd)
}
function Close-S11All { foreach ($k in @($global:S11Own.Keys)) { Close-S11Window ([long]$k) } }

# ---- the options page ----------------------------------------------------------------------------------------------------
# A box's text, returned and never printed.
function Get-S11Box([long]$Hwnd, [ValidateSet('blocklist', 'uploadfolders')][string]$Box) {
  $ta = Get-S9ById (Get-S9Options $Hwnd) $Box; $vp = $null
  if (-not $ta -or -not $ta.TryGetCurrentPattern([Windows.Automation.ValuePattern]::Pattern, [ref]$vp)) { throw "no $Box textarea with a ValuePattern" }
  [string]$vp.Current.Value
}
function Find-S11Texts($Doc, [string]$Regex) {
  $c = New-Object Windows.Automation.OrCondition((New-Object Windows.Automation.PropertyCondition($S9UIA::ControlTypeProperty, [Windows.Automation.ControlType]::Text)), (New-Object Windows.Automation.PropertyCondition($S9UIA::ControlTypeProperty, [Windows.Automation.ControlType]::ListItem)))
  $tw = [Windows.Automation.TreeWalker]::ControlViewWalker; $T = [Windows.Automation.ControlType]::Text; $LI = [Windows.Automation.ControlType]::ListItem
  # a Text inside a matching ListItem is the same item seen twice: only the ListItem counts
  @($Doc.FindAll([Windows.Automation.TreeScope]::Descendants, $c) | Where-Object { $_.Current.Name -match $Regex } | Where-Object { if ($_.Current.ControlType -ne $T) { $true } else { $p = $tw.GetParent($_); -not ($p -and $p.Current.ControlType -eq $LI -and $p.Current.Name -match $Regex) } } | ForEach-Object { [string]$_.Current.Name })
}
function Get-S11Summary($Doc) {
  $s = Get-S9Text (Get-S9ById $Doc 'uploadfolders-summary')
  if ($s) { return $s }
  $t = @(Find-S11Texts $Doc '^(No upload folder|\d+ upload folders?\.)')
  if ($t.Count -ge 1) { return $t[0] }
  ''
}
# The page as shown: armed, JavaScript, both boxes as counts and sha256. Printed like s11-rules.ts stateLine (a hash only
# when it is the empty text's). -PassThru returns the values (hashes included: keep them in memory, never print them).
function Read-S11State([long]$Hwnd, [switch]$PassThru) {
  $doc = Get-S9Options $Hwnd; $t0 = Get-Date; $st = ''
  do { $st = Get-S9Text (Get-S9ById $doc 'safety-status'); if (-not $st) { Start-Sleep -Milliseconds 100; $doc = Get-S9Options $Hwnd } } until ($st -or ((Get-Date) - $t0).TotalSeconds -gt 10)
  if (-not $st) { throw 'the options page rendered no stored state within 10 s' }
  $armed = Get-S9Toggle $doc 'armed'; $evaluate = Get-S9Toggle $doc 'evaluate'
  $bt = Get-S11Box $Hwnd 'blocklist'; $ft = Get-S11Box $Hwnd 'uploadfolders'
  $blockLines = Get-S11Lines $bt; $foldersLines = Get-S11Lines $ft
  $bs = Get-S11Sha $bt; $fs = Get-S11Sha $ft
  $bsShown = if ($bs -eq $S9EmptySha) { ' sha256=' + $S9EmptySha } else { '' }
  $fsShown = if ($fs -eq $S9EmptySha) { ' sha256=' + $S9EmptySha } else { '' }
  $summ = Get-S9Summary $doc; $count = if ($summ -match '^(\d+) blocked site') { $Matches[1] } else { '-1' }
  Say9 "STATE armed=$("$armed".ToLower()) evaluate=$("$evaluate".ToLower()) blocklist lines=$blockLines$bsShown uploadfolders lines=$foldersLines$fsShown"
  if ($PassThru) { [pscustomobject]@{ armed = $armed; evaluate = $evaluate; count = [int]$count; blockLines = $blockLines; blockSha = $bs; foldersLines = $foldersLines; foldersSha = $fs } }
}
# The STORED state: the window goes to about:blank and back to a fresh options page, so typed-but-unsaved text is gone.
function Read-S11Stored([long]$Hwnd, [switch]$PassThru) {
  Assert-S11Own $Hwnd 'stored read'
  Set-S9Omnibox $Hwnd 'about:blank'
  $t0 = Get-Date
  while ((Get-S9DocUrl $Hwnd).StartsWith($S9OptionsUrl)) { if (((Get-Date) - $t0).TotalSeconds -gt 10) { throw 'the old options page did not go away' }; Start-Sleep -Milliseconds 200 }
  Set-S9Omnibox $Hwnd $S9OptionsUrl
  $t0 = Get-Date
  while (-not (Get-S9DocUrl $Hwnd).StartsWith($S9OptionsUrl)) { if (((Get-Date) - $t0).TotalSeconds -gt 10) { throw 'the window did not reach the options page' }; Start-Sleep -Milliseconds 200 }
  Read-S11State $Hwnd -PassThru:$PassThru
}
# Sets a box (SetValue) and, unless -NoSave, presses its Save button; with -NoSave the text is only typed. Returns the sha256.
function Set-S11Box([long]$Hwnd, [ValidateSet('blocklist', 'uploadfolders')][string]$Box, [string]$Text, [switch]$NoSave) {
  Assert-S11Own $Hwnd 'set box'
  $doc = Get-S9Options $Hwnd
  (Get-S9ById $doc $Box).GetCurrentPattern([Windows.Automation.ValuePattern]::Pattern).SetValue($Text)
  Start-Sleep -Milliseconds 250
  if (-not $NoSave) {
    $save = Get-S9ById $doc $S11Boxes[$Box].Save
    if (-not $save -or $save.Current.Name -ne $S11Boxes[$Box].Btn) { throw "no Save button for $Box" }
    $save.GetCurrentPattern([Windows.Automation.InvokePattern]::Pattern).Invoke()
    Start-Sleep -Milliseconds 600
  }
  $lines = Get-S11Lines $Text
  Say9 "BOX $Box set ($lines non-blank line(s); $(if ($NoSave) { 'typed, NOT saved' } else { 'saved' }); text withheld)"
  Get-S11Sha $Text
}
# Saves $Text into a box and reads it back from a fresh options page by hash (decision #243). Prints equal/DIFFERENT.
function Set-S11BoxVerified([long]$Hwnd, [ValidateSet('blocklist', 'uploadfolders')][string]$Box, [string]$Text) {
  $want = Set-S11Box $Hwnd $Box $Text
  $r = Read-S11Stored $Hwnd -PassThru
  $got = if ($Box -eq 'blocklist') { $r.blockSha } else { $r.foldersSha }
  $equal = ($got -eq $want)
  $lines = Get-S11Lines $Text
  Say9 "RESTORE $Box lines=$lines hash=$(if ($equal) { 'equal' } else { 'DIFFERENT' })"
  if (-not $equal) { Stop9 "read-back of $Box differs from what was saved" }
  $equal
}
# armed / JavaScript through the page's checkbox (s9-win Set-S9Switch), read back from a fresh page.
function Set-S11Flag([long]$Hwnd, [ValidateSet('armed', 'evaluate')][string]$Which, [bool]$On) {
  Assert-S11Own $Hwnd 'set flag'
  [void](Set-S9Switch $Hwnd -Which $Which -On $On)
  Start-Sleep -Milliseconds 500
  $r = Read-S11Stored $Hwnd -PassThru
  $got = if ($Which -eq 'armed') { $r.armed } else { $r.evaluate }
  $ok = ($got -eq $On)
  Say9 "FLAG $Which read back $(if ($ok) { 'equal' } else { 'DIFFERENT' })"
  if (-not $ok) { Stop9 "the $Which switch did not read back as set" }
  $ok
}

# UP-0: the stored state read; both texts kept in $Dir (outside the repo, deleted after a matching restore); found.json written
# to $S11Out in the actor's shape. $Toggle is Read-S11FileAccess's reading. Sets $global:S11Found. $false = STOP (not armed + JS on).
function Save-S11Found([long]$Hwnd, [string]$Dir, [string]$Toggle = 'unreadable') {
  $Dir = Assert-S11Outside $Dir; [void](Assert-S11Outside $S11Out)
  New-Item -ItemType Directory -Force $Dir | Out-Null
  $r = Read-S11Stored $Hwnd -PassThru
  if (-not ($r.armed -and $r.evaluate)) { Stop9 'the found state is not armed with JavaScript on; nothing was changed'; return $false }
  $bt = Get-S11Box $Hwnd 'blocklist'; $ft = Get-S11Box $Hwnd 'uploadfolders'
  [IO.File]::WriteAllText((Join-Path $Dir 'found-blocklist.txt'), $bt, $S11Utf8)
  [IO.File]::WriteAllText((Join-Path $Dir 'found-uploadfolders.txt'), $ft, $S11Utf8)
  $fj = [ordered]@{ armed = $r.armed; evaluate = $r.evaluate; blocklist = [ordered]@{ lines = $r.blockLines; sha256 = $r.blockSha }; uploadfolders = [ordered]@{ lines = $r.foldersLines; sha256 = $r.foldersSha }; toggle = $Toggle }
  New-Item -ItemType Directory -Force $S11Out | Out-Null
  [IO.File]::WriteAllText((Join-Path $S11Out 'found.json'), ($fj | ConvertTo-Json -Depth 4 -Compress), $S11Utf8)
  $global:S11Found = [pscustomobject]@{ armed = $r.armed; evaluate = $r.evaluate; count = $r.count; blockSha = $r.blockSha; foldersSha = $r.foldersSha; blockLines = $r.blockLines; foldersLines = $r.foldersLines; Dir = $Dir }
  Say9 'FOUND STATE recorded (both texts kept outside the repo, never printed)'
  $true
}
function Get-S11FoundText([ValidateSet('blocklist', 'uploadfolders')][string]$Box) { [IO.File]::ReadAllText((Join-Path $global:S11Found.Dir "found-$Box.txt"), $S11Utf8) }

# ---- UP-0's toggle: READ ONLY. Nothing is pressed, invoked, focused or typed: ToggleState is read and that is all. -------------
function Read-S11FileAccess([long]$Hwnd) {
  Assert-S11Own $Hwnd 'file-access read'
  $root = $S9UIA::FromHandle([IntPtr]$Hwnd); $t0 = Get-Date; $cands = @(); $on = 0; $off = 0
  do {
    $cands = @(); $on = 0; $off = 0
    foreach ($e in $root.FindAll([Windows.Automation.TreeScope]::Descendants, [Windows.Automation.Condition]::TrueCondition)) {
      if ([string]$e.Current.Name -notmatch '^Allow access to file URLs') { continue }
      $tp = $null; $cands += 1
      if ($e.TryGetCurrentPattern([Windows.Automation.TogglePattern]::Pattern, [ref]$tp)) { if ($tp.Current.ToggleState -eq [Windows.Automation.ToggleState]::On) { $on++ } else { $off++ } }
    }
    if ($on + $off -eq 0) { Start-Sleep -Milliseconds 300 }
  } until ($on + $off -gt 0 -or ((Get-Date) - $t0).TotalSeconds -gt 10)
  $reading = if ($on -gt 0 -and $off -eq 0) { 'on' } elseif ($off -gt 0 -and $on -eq 0) { 'off' } else { 'unreadable' }
  Say9 "TOGGLE reading $reading (candidates $($cands.Count); on $on, off $off); nothing was pressed"
  if ($reading -eq 'unreadable') { Stop9 'the file-URL toggle is unreadable (none or conflicting); nothing changed' }
  $reading
}

# liveB: ROOT added to the Upload folders box as UP-OPT does (no new row); saved, read back by hash; sets S11RootText.
function Add-S11Root([long]$O, [string]$Root) {
  Assert-S11Own $O 'add root'
  $global:S11RootText = Add-S11Line (Get-S11FoundText 'uploadfolders') $Root
  Set-S11BoxVerified $O 'uploadfolders' $global:S11RootText
}

# ---- UP-OPT: ROOT added through the options page, and what the page shows ---------------------------------------------------
# $O = the wave's options window. Writes OptObs (s11-rules.ts) plus foundCount and firstTypedLine to $ObsJson. The first state
# change of the wave: ROOT stays added until Restore-S11Safety. Stores the rooted text in $global:S11RootText (for UP-7-c).
function Invoke-S11Opt([long]$O, [string]$Root, [string]$ObsJson) {
  Assert-S11Own $O 'UP-OPT'
  $ObsJson = Assert-S11Outside $ObsJson
  $found = Get-S11FoundText 'uploadfolders'
  $foundCount = Get-S11Lines $found
  $next = Add-S11Line $found $Root
  $global:S11RootText = $next
  $O2 = Open-S11Options
  if (-not $O2) { throw 'no second options window' }
  $doc = Get-S9Options $O
  $standing = @(Find-S11Texts $doc ('^' + [regex]::Escape($S11Warning) + '$')).Count
  $setSha = Set-S11Box $O 'uploadfolders' $next
  $t0 = Get-Date; $o2Ms = 0; $o2Eq = $false
  while (((Get-Date) - $t0).TotalSeconds -lt 6) {
    $cur = Get-S11Box $O2 'uploadfolders'
    if ((Get-S11Sha $cur) -eq $setSha) { $o2Eq = $true; $o2Ms = [int]((Get-Date) - $t0).TotalMilliseconds; break }
    Start-Sleep -Milliseconds 150
  }
  if (-not $o2Eq) { $o2Ms = [int]((Get-Date) - $t0).TotalMilliseconds }
  $o2Conflict = (@(Find-S11Texts (Get-S9Options $O2) '^The saved folders were changed elsewhere').Count -gt 0)
  Close-S11Window $O2
  $s1 = Read-S11Stored $O -PassThru
  $storedSha = $s1.foldersSha
  $summaryAfterSave = Get-S11Summary (Get-S9Options $O)
  $firstTyped = ($next -split "`r?`n").Count + 1
  $typed = $next
  foreach ($line in $S11Typed) { $typed = Add-S11Line $typed $line }
  [void](Set-S11Box $O 'uploadfolders' $typed -NoSave)
  Start-Sleep -Milliseconds 400
  $doc = Get-S9Options $O
  $summaryTyped = Get-S11Summary $doc
  $invalidItems = @(Find-S11Texts $doc ('^Line \d+: .(' + [regex]::Escape($S11Typed[0]) + '|' + [regex]::Escape($S11Typed[1]) + ').\s.\s'))
  $warnedItems = @(Find-S11Texts $doc ('^Line \d+: .(' + [regex]::Escape($S11Typed[2]) + ').\s.\swarning: '))
  $invalidCount = $invalidItems.Count; $warnedCount = $warnedItems.Count
  $O2 = Open-S11Options
  if (-not $O2) { throw 'no second options window' }
  $whileTyping = Read-S11State $O2 -PassThru
  $storedWhileTypingSha = $whileTyping.foldersSha
  Close-S11Window $O2
  [void](Set-S11Box $O 'uploadfolders' $next -NoSave)
  Start-Sleep -Milliseconds 400
  $summaryAfterRevert = Get-S11Summary (Get-S9Options $O)
  $obs = [ordered]@{ standingCount = $standing; summaryAfterSave = $summaryAfterSave; summaryTyped = $summaryTyped; summaryAfterRevert = $summaryAfterRevert; invalidItems = $invalidItems; warnedItems = $warnedItems; setSha = $setSha; storedSha = $storedSha; storedWhileTypingSha = $storedWhileTypingSha; o2Ms = $o2Ms; o2Conflict = $o2Conflict; foundCount = $foundCount; firstTypedLine = $firstTyped }
  [IO.File]::WriteAllText($ObsJson, ($obs | ConvertTo-Json -Depth 4 -Compress), $S11Utf8)
  Say9 "OPT observed: standing x$standing, invalid items $invalidCount, warned items $warnedCount, O2 $o2Ms ms; observations written for the judge"
  $true
}

# ---- the toolbar button, F12 -----------------------------------------------------------------------------------------------
# One press pair: armed -> off, $GapMs, off -> armed. The button must be pinned (an unpinned button is a STOP, never a click on
# the puzzle menu) and the title must read armed first.
# The pin and title checks of a press pair: a STOP line and $false when the button is unpinned (human gate) or the title is not armed.
function Test-S11ButtonReady([long]$Hwnd) {
  Assert-S11Own $Hwnd 'toolbar button'
  if (-not (Get-S10PinState $Hwnd)) { Stop9 'the toolbar button is not pinned (human gate); nothing pressed'; return $false }
  if ("$(Get-S9ActionTitle $Hwnd)" -ne $S9TitleArmed) { Stop9 'the toolbar title does not read armed; the press pair is not sent'; return $false }
  $true
}
# -At = the time of the first press (race A: ready + 1.5 s); the second press is $GapMs after the first one. -Checked = the
# pin and title were checked before (so nothing slow runs between the ready signal and the first press). Ends on a title check.
function Invoke-S11ButtonPair([long]$Hwnd, [int]$GapMs = 1600, [datetime]$At = [datetime]::MinValue, [switch]$Checked) {
  Assert-S11Own $Hwnd 'toolbar button'
  if (-not $Checked -and -not (Test-S11ButtonReady $Hwnd)) { return $false }
  while ((Get-Date) -lt $At) { Start-Sleep -Milliseconds 5 }
  $p1 = Get-Date; [void](Invoke-S9ActionButton $Hwnd)
  Wait-S9ActionTitle $Hwnd $S9TitleOff.Substring(0, 25) $GapMs
  while (((Get-Date) - $p1).TotalMilliseconds -lt $GapMs) { Start-Sleep -Milliseconds 5 }
  [void](Invoke-S9ActionButton $Hwnd)
  Wait-S9ActionTitle $Hwnd $S9TitleArmed 2000
  if ("$(Get-S9ActionTitle $Hwnd)" -ne $S9TitleArmed) { Stop9 'the toolbar title does not read armed after the press pair'; return $false }
  $true
}
function Send-S11DevTools([long]$Hwnd) {
  Assert-S11Own $Hwnd 'F12'
  if (-not (Set-S9Foreground $Hwnd)) { Stop9 "window $Hwnd is not in the foreground - no key sent"; throw 'not in the foreground' }
  [S9Win]::keybd_event(0x7B, 0, 0, [UIntPtr]::Zero); [S9Win]::keybd_event(0x7B, 0, 2, [UIntPtr]::Zero)
  Start-Sleep -Milliseconds 1800
  Say9 "KEY F12 pressed into window $Hwnd"
}

# ---- the safety rows' state changes (each: Do, then Undo, each read back) --------------------------------------------------
# $O = options window, $X = window for DevTools (UP-DEVT). Signals as in S5-actor.
function Invoke-S11Row([ValidateSet('UP-7-a', 'UP-7-b', 'UP-7-c', 'UP-7J', 'UP-DEVT')][string]$Id, [long]$O, [long]$X = 0) {
  switch ($Id) {
    'UP-7-a' { Invoke-S11Change $Id { [void](Set-S11Flag $O 'armed' $false) } { [void](Set-S11Flag $O 'armed' $true) } }
    'UP-7J' { Invoke-S11Change $Id { [void](Set-S11Flag $O 'evaluate' $false) } { [void](Set-S11Flag $O 'evaluate' $true) } }
    'UP-7-b' {
      $found = Get-S11FoundText 'blocklist'
      $with = Add-S11Line $found (Get-S11Alias)
      Invoke-S11Change $Id { [void](Set-S11BoxVerified $O 'blocklist' $with) } { [void](Set-S11BoxVerified $O 'blocklist' $found) }
    }
    'UP-7-c' {
      $found = Get-S11FoundText 'uploadfolders'
      $rooted = $global:S11RootText
      if (-not $rooted) { throw 'UP-7-c: no rooted text; run UP-OPT or Add-S11Root first' }
      Invoke-S11Change $Id { [void](Set-S11BoxVerified $O 'uploadfolders' $found) } { [void](Set-S11BoxVerified $O 'uploadfolders' $rooted) }
    }
    'UP-DEVT' { Invoke-S11Change $Id { Send-S11DevTools $X } { Send-S11DevTools $X } }
  }
  if (-not (Test-S9DaemonSafety ([bool]$global:S11Found.armed) ([bool]$global:S11Found.evaluate) ([int]$global:S11Found.count) $Id 5000)) { Stop9 "$Id : daemon.status is not back to the found state" ; return $false }
  $true
}
# UP-RACE-A / B: A = button pressed 1.5 s after ready and again 1.6 s later; B = block list found+alias 1.5 s after ready, restored
# on loop-done. Both write <id>.pressed only after loop-done (never an earlier restore: S5-actor-fixer).
function Invoke-S11Race([ValidateSet('A', 'B')][string]$Which, [long]$Btn, [long]$O) {
  $id = "UP-RACE-$Which"
  # everything slow is done BEFORE ready, so the presses / the edit land at +1.5 s (+1.6 s) as the sheet says
  if ($Which -eq 'A') {
    if (-not (Test-S11ButtonReady $Btn)) { return $false }
    Park-S9Cursor 'race A'
  } else {
    $found = Get-S11FoundText 'blocklist'
    $withAlias = Add-S11Line $found (Get-S11Alias)
  }
  [void](Wait-S11Ready $id); $t0 = Get-Date
  if ($Which -eq 'A') {
    if (-not (Invoke-S11ButtonPair $Btn 1600 -At $t0.AddMilliseconds(1500) -Checked)) { return $false }
    [void](Wait-S11Ready "$id-loop-done" 180)
  } else {
    Start-Sleep -Milliseconds 1500
    [void](Set-S11Box $O 'blocklist' $withAlias)
    [void](Wait-S11Ready "$id-loop-done" 180)
    [void](Set-S11BoxVerified $O 'blocklist' $found)
  }
  Write-S11Pressed $id
  Test-S9DaemonSafety ([bool]$global:S11Found.armed) ([bool]$global:S11Found.evaluate) ([int]$global:S11Found.count) $id 5000
}

# ---- placement of the wave's own window ---------------------------------------------------------------------------------------
# S5-liveA set-up fix (#281 (c)): W's monitor work area cut clear of every taskbar window (an auto-hidden taskbar's 2 px strip
# at y 1078..1126 included). Mirrors s11-win-rules.ts clearPlacement (same cases in test/s11-liveA-fixes.test.ts). $Trays holds
# "class left top right bottom" strings (S9Geo ShellTrays). Returns left/top/right/bottom. Placement only: no guard changes.
function Get-S11ClearRect($Work, [string[]]$Trays, [int]$Margin = 8) {
  $r = @{ left = [int]$Work.left; top = [int]$Work.top; right = [int]$Work.right; bottom = [int]$Work.bottom }
  foreach ($t in $Trays) {
    $p = "$t".Split(' '); if ($p.Count -ne 5) { continue }
    $tl = [int]$p[1]; $tt = [int]$p[2]; $tr = [int]$p[3]; $tb = [int]$p[4]
    if ($p[0] -ne 'Shell_TrayWnd' -and $p[0] -ne 'Shell_SecondaryTrayWnd') { continue }
    $ow = [Math]::Min($r.right, $tr) - [Math]::Max($r.left, $tl); $oh = [Math]::Min($r.bottom, $tb) - [Math]::Max($r.top, $tt)
    if ($ow -le 0 -or $oh -le 0) { continue }
    if (($tr - $tl) -ge ($tb - $tt)) {
      if (($tt + $tb) / 2 -ge ($r.top + $r.bottom) / 2) { $r.bottom = [Math]::Min($r.bottom, $tt - $Margin) } else { $r.top = [Math]::Max($r.top, $tb + $Margin) }
    } elseif (($tl + $tr) / 2 -ge ($r.left + $r.right) / 2) { $r.right = [Math]::Min($r.right, $tl - $Margin) } else { $r.left = [Math]::Max($r.left, $tr + $Margin) }
  }
  [pscustomobject]$r
}
# Restores W if maximized (a maximized frame overhangs its monitor by 8 px and touched both taskbars in the first run), then moves
# it into its monitor's work area cut clear of the taskbars. Only the wave's own window; prints numbers only.
function Set-S11Place([long]$Hwnd) {
  Assert-S11Own $Hwnd 'place'
  [void][S9Win]::ShowWindow([IntPtr]$Hwnd, 9)
  $state = [S9Geo]::WorkOf([IntPtr]$Hwnd)
  $res = Get-S11ClearRect ([pscustomobject]@{ left = $state.Left; top = $state.Top; right = $state.Right; bottom = $state.Bottom }) @([S9Geo]::ShellTrays())
  [void][S9Geo]::MoveWindow([IntPtr]$Hwnd, $res.left, $res.top, $res.right - $res.left, $res.bottom - $res.top, $true)
  Start-Sleep -Milliseconds 300
  Say9 "PLACE W work area [$($state.Left),$($state.Top),$($state.Right),$($state.Bottom)] cut clear of the taskbars to [$($res.left),$($res.top),$($res.right),$($res.bottom)]"
}
# One diagnostic line's text for an occluder: rect, owner and root-owner kind, style flags. No title.
function Format-S11Occluder($x) {
  "rect=[$($x.rect.left),$($x.rect.top),$($x.rect.right),$($x.rect.bottom)] owner=$($x.owner) rootOwner=$($x.rootOwner) topmost=$($x.styles.topmost) popup=$($x.styles.popup) toolwindow=$($x.styles.toolwindow) noactivate=$($x.styles.noactivate)"
}

# ---- guards: the cursor park and the occluders -------------------------------------------------------------------------------
# Parks the cursor in W's page area (s9-win Park-S9Cursor; needs $global:W = the wave's front window), checks it lies in W, then
# lists the occluders above $Hwnd. Foreign occluders (not owned by W/E/D/O) fail; an owned one is exempt only when it covers none
# of $ReadRects (objects with left/top/right/bottom). Prints counts and class names only.
function Enter-S11Guards([long]$Hwnd, [string]$Why, [object[]]$ReadRects = @()) {
  Assert-S11Own $Hwnd 'guards'
  Park-S9Cursor $Why
  $c = "$([S9Geo]::Cursor())".Split(' ')
  $r = [S9Geo]::Rect([IntPtr][long]$global:W)
  $inside = ($c.Count -eq 2) -and ([int]$c[0] -ge $r.Left) -and ([int]$c[0] -le $r.Right) -and ([int]$c[1] -ge $r.Top) -and ([int]$c[1] -le $r.Bottom)
  if (-not $inside) { Stop9 "GUARD cursor is not parked inside W ($Why)"; return $false }
  $occ = @(Get-S9OccluderIds $Hwnd); $foreign = 0
  foreach ($x in $occ) {
    $drv = @('W', 'E', 'D', 'O')
    $mine = ($drv -contains $x.owner) -or ($drv -contains $x.rootOwner)
    $hit = $false
    foreach ($q in $ReadRects) { if ($x.rect.left -lt $q.right -and $q.left -lt $x.rect.right -and $x.rect.top -lt $q.bottom -and $q.top -lt $x.rect.bottom) { $hit = $true } }
    if (-not ($mine -and $ReadRects.Count -gt 0 -and -not $hit)) { $foreign++; $cls = $x.cls; $procName = $x.process; Say9 "OCCLUDER foreign cls=$cls process=$procName"; $res = Format-S11Occluder $x; Say9 "OCCLUDER detail $res" }
  }
  Say9 "GUARD occluders total=$($occ.Count) foreign=$foreign ($Why)"
  if ($foreign -gt 0) { Stop9 "GUARD $foreign foreign occluder(s) above window $Hwnd ($Why)"; return $false }
  $true
}
# SW-2's set-up: W in front and the cursor parked (the actor's sw2 judges the rest).
function Set-S11Front([long]$Hwnd, [string]$Why = 'front') {
  Assert-S11Own $Hwnd 'bring to front'
  if (-not (Set-S9Foreground $Hwnd)) { Stop9 "window $Hwnd could not be brought to the front"; return $false }
  $global:W = $Hwnd
  Park-S9Cursor $Why
  $true
}

# ---- UP-RESTORE ----------------------------------------------------------------------------------------------------------------
# One press pair (the worker console's control for UP-LOGS), a fresh options page, armed / JavaScript / both boxes to the found
# values only where they differ, then the stored values, daemon.status and the toolbar title read back by count and hash.
# The found-text files are deleted only after a full match. $false = STOP (integrity floor): nothing else is pressed.
function Restore-S11Safety([long]$O, [Parameter(Mandatory)][long]$Btn, [string]$Row = 'UP-RESTORE') {
  $f = $global:S11Found
  if (-not $f) { Say9 'RESTORE: no found state was recorded, so nothing was changed'; return $true }
  if (-not (Invoke-S11ButtonPair $Btn 1600)) { Say9 'RESTORE: the press pair was not sent; restoring the rest' }
  $cur = Read-S11Stored $O -PassThru
  if ($cur.armed -ne $f.armed) { [void](Set-S11Flag $O 'armed' ([bool]$f.armed)) }
  if ($cur.evaluate -ne $f.evaluate) { [void](Set-S11Flag $O 'evaluate' ([bool]$f.evaluate)) }
  if ($cur.foldersSha -ne $f.foldersSha) { [void](Set-S11BoxVerified $O 'uploadfolders' (Get-S11FoundText 'uploadfolders')) }
  if ($cur.blockSha -ne $f.blockSha) { [void](Set-S11BoxVerified $O 'blocklist' (Get-S11FoundText 'blocklist')) }
  $r = Read-S11Stored $O -PassThru
  $page = ($r.armed -eq $f.armed) -and ($r.evaluate -eq $f.evaluate) -and ($r.blockSha -eq $f.blockSha) -and ($r.foldersSha -eq $f.foldersSha)
  $nj = [ordered]@{ armed = $r.armed; evaluate = $r.evaluate; blocklist = [ordered]@{ lines = $r.blockLines; sha256 = $r.blockSha }; uploadfolders = [ordered]@{ lines = $r.foldersLines; sha256 = $r.foldersSha } }
  [IO.File]::WriteAllText((Join-Path $S11Out 'now.json'), ($nj | ConvertTo-Json -Depth 4 -Compress), $S11Utf8)   # for s11.ts restore-check --found found.json --now now.json
  $daemon = Test-S9DaemonSafety ([bool]$f.armed) ([bool]$f.evaluate) ([int]$f.count) $Row 5000
  $title = ("$(Get-S9ActionTitle $Btn)" -eq $S9TitleArmed)
  $ok = $page -and $daemon -and $title
  Say9 "RESTORE read-back: stored page equal $("$page".ToLower()), daemon.status equal $("$daemon".ToLower()), title armed $("$title".ToLower())"
  if ($ok) {
    Remove-Item -LiteralPath (Join-Path $f.Dir 'found-blocklist.txt'), (Join-Path $f.Dir 'found-uploadfolders.txt') -ErrorAction SilentlyContinue
    Say9 'RESTORE ok: the found texts (outside the repo) deleted after the read-back matched'
  } else { Stop9 'RESTORE FAILED: the safety state is not the found state; nothing more is pressed; the step agent asks the user' }
  $ok
}
