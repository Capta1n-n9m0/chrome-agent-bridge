# recipes/s11b-win.ps1: Windows UI Automation helpers for Step 11b's live wave (Run 17; docs/e2e-test-plan.md section 4.24).
# Windows PowerShell 5.1, ASCII only. Dot-source it AFTER s9-win.ps1 and s11-win.ps1 (it edits neither and loads neither).
# Written by S4-helpers H6 (Sonnet 5.5); NOT run against Chrome by its author. A helper bug found live is fixed between rows
# and recorded; a helper never changes a row's expected text or pass rule.
#
# Rules mirrored from recipes/s11b-win-rules.ts (tied by recipes/test/s11b-win-static.test.ts, which also runs the pure
# functions here on the same cases): the 8083/8081 URL allow-list, file-under-ROOT, the console marker and tail, the
# SendKeys escape, the printable B17 lines. Prints no pattern, token, real site, user path or hash: only counts, handles,
# row names and B17's own sheet lines (filtered by $S11bPrintRe).

$S11bUrlRe = '^http://(127\.0\.0\.1|localhost):(8083|8081)(/|$)'
$S11bPrintRe = '^(MANIFEST |RULES |CTX |REGEX |STORED |STOREDAT |EXPR |ROW |STOP: |NOT MEASURED: |FALLBACK: )'
$S11bFallbackCode = 10
$S11bSubs = @('manifest', 'rules', 'ctx', 'regex', 'stored', 'mark')
$S11bSamplerIds = @('R17-UP-6-outside', 'R17-UP-6-missing', 'R17-UP-6-relative', 'R17-UP-6-raw-dotdot', 'R17-UP-6-raw-notarget', 'F-RAW', 'F-RAW-2', 'F-RAW-DIR')

# ---- pure rules (mirrored in s11b-win-rules.ts) -------------------------------------------------------------------------
function Test-S11bUrl([string]$Url) { $Url -match $S11bUrlRe }
# A file strictly under ROOT, drive-letter paths only, never a drive root; the comparison is by full path, ignoring case.
function Test-S11bUnderRoot([string]$Root, [string]$Path) {
  if (-not $Root -or -not $Path) { return $false }
  if ($Root -notmatch '^[A-Za-z]:[\\/]' -or $Path -notmatch '^[A-Za-z]:[\\/]') { return $false }
  $r = [IO.Path]::GetFullPath($Root).TrimEnd('\'); $f = [IO.Path]::GetFullPath($Path)
  if ($r.Length -lt 4) { return $false }
  ($f.StartsWith($r + '\', [StringComparison]::OrdinalIgnoreCase)) -and ($f.Length -gt $r.Length + 1)
}
# The text after the LAST whole-line marker. Returns an object: Found, Lines.
function Get-S11bTail([string[]]$Lines, [string]$Mark) {
  $at = -1
  for ($i = 0; $i -lt $Lines.Count; $i++) { if ($Lines[$i] -ceq $Mark) { $at = $i } }
  if ($at -lt 0) { return [pscustomobject]@{ Found = $false; Lines = @() } }
  $rest = if ($at + 1 -lt $Lines.Count) { @($Lines[($at + 1)..($Lines.Count - 1)]) } else { @() }
  [pscustomobject]@{ Found = $true; Lines = $rest }
}
# SendKeys metacharacters in braces; $null for text that is not one printable ASCII line.
function ConvertTo-S11bSendKeys([string]$Text) {
  if ($Text -notmatch '^[\x20-\x7e]*$') { return $null }
  [regex]::Replace($Text, '[+^%~(){}\[\]]', { param($m) '{' + $m.Value + '}' })
}

# ---- the wave's own windows: RD-6 and F-FILETAB ---------------------------------------------------------------------------
# A marked window recorded as the wave's own (the same route as Open-S11Window). Returns the handle or 0 after a STOP line.
function New-S11bOwnWindow([string]$What) {
  if (-not $global:S11Stable) { if (-not (Wait-S10StableWindows 'S11b' 'open')) { return 0 }; $global:S11Stable = $true }
  if (-not (Get-Process chrome -ErrorAction SilentlyContinue)) { Stop9 "$What : Chrome is not running; it is never launched from here (human gate)"; return 0 }
  $mw = Open-S10MarkedWindow 'S11b' 'open'
  if (-not $mw) { return 0 }
  $h = [long]$mw.h
  $global:S11Own[[string]$h] = $true
  $h
}
# RD-6: a window opened by UIA outside the bridge on a fixture URL of 8083 or 8081 (localhost or 127.0.0.1) and nothing else.
function Open-S11bWindow([string]$Url) {
  if (-not (Test-S11bUrl $Url)) { Stop9 'Open-S11bWindow: that URL is not on the allow-list (fixtures on 8083 and 8081 only)'; return 0 }
  $h = New-S11bOwnWindow 'Open-S11bWindow'
  if (-not $h) { return 0 }
  Set-S9Omnibox $h $Url
  $h
}
# The omnibox typing of Set-S9Omnibox without printing the URL (a file: URL holds a path). Throws when a guard fails.
function Set-S11bOmnibox([long]$Hwnd, [string]$Url, [int]$TimeoutSec = 15) {
  Assert-S11Own $Hwnd 'omnibox'
  Park-S9Cursor 'before the omnibox foreground/focus guard'
  $omni = Get-S9Omnibox $Hwnd
  if (-not (Set-S9Foreground $Hwnd)) { throw "window $Hwnd is not in the foreground - no key sent" }
  $omni.SetFocus()
  $omni.GetCurrentPattern([Windows.Automation.ValuePattern]::Pattern).SetValue($Url)
  Start-Sleep -Milliseconds 300
  $focused = $S9UIA::FocusedElement
  if (([long][S9Win]::GetForegroundWindow()) -ne $Hwnd -or -not $focused -or -not [Windows.Automation.Automation]::Compare($focused, $omni)) { throw "window $Hwnd or its address bar lost the focus - no key sent" }
  [S9Win]::keybd_event(0x0D, 0, 0, [UIntPtr]::Zero); [S9Win]::keybd_event(0x0D, 0, 2, [UIntPtr]::Zero)
  $t0 = Get-Date; $u = ''
  do { Start-Sleep -Milliseconds 300; $u = Get-S9DocUrl $Hwnd } until ($u.StartsWith('file:') -or ((Get-Date) - $t0).TotalSeconds -gt $TimeoutSec)
  $ok = $u.StartsWith('file:')
  Say9 "window $Hwnd omnibox sent; the page reads a file: URL: $ok"
}
# F-FILETAB: a wave-made file under ROOT opened as a file: page by the new window's own omnibox. Prints <ROOT>\name.
# The file's <title> must be one Format-S9Title takes as the wave's own (s11-win.ps1: `S11 ...`), else Close-S11Window leaves it.
function Open-S11bFileWindow([string]$Root, [string]$FilePath) {
  if (-not (Test-S11bUnderRoot $Root $FilePath)) { Stop9 'Open-S11bFileWindow: that file is not under the wave''s ROOT; nothing opened'; return 0 }
  if (-not (Test-Path -LiteralPath $FilePath -PathType Leaf)) { Stop9 'Open-S11bFileWindow: the file does not exist; nothing opened'; return 0 }
  $full = [IO.Path]::GetFullPath($FilePath)
  $h = New-S11bOwnWindow 'Open-S11bFileWindow'
  if (-not $h) { return 0 }
  Set-S11bOmnibox $h ([Uri]$full).AbsoluteUri
  $Name = [IO.Path]::GetFileName($full)
  Say9 "FILEWINDOW $h opened <ROOT>\$Name"
  $h
}

# ---- RD-CAPS-WARN ------------------------------------------------------------------------------------------------------------
# Both caps item forms (options-model.ts blockListLongHostWarning, names line numbers only; BLOCKLIST_CAPS_WARNING's leading text).
$S11bCapsRe = '^(Lines? \d+(, \d+)*: a very long site name|This list needs more of Chrome''s blocking rules)'
# The options page's caps items: Found ($false = the list is not in the UIA tree and no K-caps item stands anywhere: NOT MEASURED)
# and Items (texts, compared with K-caps; never printed). The page must have rendered (the block-list summary is there).
# fixer3 (Run 17 attempt 4): Chrome 156 shows <p id="blocklist-summary"> by its text only (Get-S9Summary, 2026-10-24), so the
# summary is read by Get-S9Summary; the list by id, else (or when it holds no ListItem) its K-caps items by text (Find-S11Texts, F-HOME).
function Get-S11bCaps([long]$Hwnd) {
  Assert-S11Own $Hwnd 'caps read'
  $doc = Get-S9Options $Hwnd
  if (-not (Get-S9Summary $doc)) { throw 'the options page shows no block-list summary: not read' }
  $ul = Get-S9ById $doc 'blocklist-caps'
  $items = @(); $by = 'id'
  if ($ul) {
    $LI = New-Object Windows.Automation.PropertyCondition($S9UIA::ControlTypeProperty, [Windows.Automation.ControlType]::ListItem)
    $items = @($ul.FindAll([Windows.Automation.TreeScope]::Descendants, $LI) | ForEach-Object { [string]$_.Current.Name })
  }
  if ($items.Count -eq 0) { $items = @(Find-S11Texts $doc $S11bCapsRe); $by = 'text' }
  $n = $items.Count
  if ($by -eq 'id') { Say9 "CAPS items=$n by=id (texts withheld)" } else { Say9 "CAPS items=$n by=text (texts withheld)" }
  if (-not $ul -and $n -eq 0) { Say9 'CAPS list not in the UIA tree and no K-caps item by text: NOT MEASURED' }
  [pscustomobject]@{ Found = ([bool]$ul -or $n -gt 0); Items = $items }
}
# The STOP's cause for the stop procedure (printed by Show-S16, profile masked): a helper's own `throw '<text>'` (its error id is
# its text; a rethrown record or exception object is not) or a UIA/COM framework message. Any other class (an engine cast, a JSON
# parse, a file error can quote a value or a path) gives its type name and the error record's fixed id only. Any printed message
# that holds an RD-LOGS pattern (scan17's, pinned by s11b-fix3-static.test.ts; stricter: 127.0.0.1, any 16-hex run as the token
# guard, the state.json alias and sentinel) or a URL, a drive or UNC path or a non-ASCII character is withheld.
$S11bStopDeny = 'a{24}|bank\.example|localhost:8085|127\.0\.0\.1|://|[0-9a-f]{16}|[A-Za-z]:[\\/]|\\\\|[^\x20-\x7e]'
function Get-S11bStopCause($Err) { try { Get-S11bStopText $Err } catch { 'cause not readable' } }
function Get-S11bStopText($Err) {
  $x = $Err.Exception; $tag = $x.GetType().Name
  $own = ($x.GetType() -eq [Management.Automation.RuntimeException]) -and $x.WasThrownFromThrowStatement -and ($Err.FullyQualifiedErrorId -ceq $x.Message)
  $in = if ($x -is [Management.Automation.MethodInvocationException] -and $x.InnerException) { $x.InnerException } else { $x }
  $uia = ("$($in.GetType().Namespace)" -eq 'System.Windows.Automation') -or ($in -is [Runtime.InteropServices.COMException])
  if (-not ($own -or $uia)) { $id = [string]$Err.FullyQualifiedErrorId; if ($id -notmatch '^[\w.,-]{1,120}$' -or $id -match $S11bStopDeny) { $id = '?' }; return "$tag; message withheld (id $id)" }
  if ($uia) { $tag = $in.GetType().Name }
  $m = ([string]$in.Message -replace '\s+', ' ').Trim()
  $known = @(); try { $j = [IO.File]::ReadAllText((Join-Path $env:S11_OUT 'state.json')) | ConvertFrom-Json; $known = @("$($j.alias)", "$($j.sentinel)") | Where-Object { $_ } } catch { }
  if ($m -match $S11bStopDeny -or @($known | Where-Object { $m.IndexOf($_, [StringComparison]::OrdinalIgnoreCase) -ge 0 }).Count) { return "$tag; message withheld (an RD-LOGS pattern, a URL, a path or a non-ASCII text)" }
  if ($m.Length -gt 240) { $m = $m.Substring(0, 240) }
  "$tag" + ': ' + $m
}

# ---- B17 as a child process ----------------------------------------------------------------------------------------------------
# Runs `node --import tsx recipes/s11b.ts <args>`; stderr is discarded, stdout is returned. Returns Code and Lines. Kills only its own child.
function Invoke-S11bB17([string[]]$B17Args) {
  $node = (Get-Command node -ErrorAction Stop).Source
  $q = @('--import', 'tsx', (Join-Path $S9Repo 'recipes\s11b.ts')) + $B17Args | ForEach-Object { if ("$_" -match '[\s"]') { '"' + ("$_" -replace '"', '\"') + '"' } else { "$_" } }
  $si = New-Object Diagnostics.ProcessStartInfo
  $si.FileName = $node; $si.Arguments = ($q -join ' '); $si.WorkingDirectory = $S9Repo
  $si.UseShellExecute = $false; $si.CreateNoWindow = $true; $si.RedirectStandardOutput = $true; $si.RedirectStandardError = $true
  $si.StandardOutputEncoding = New-Object Text.UTF8Encoding $false
  $p = [Diagnostics.Process]::Start($si)
  $p.BeginErrorReadLine()
  $task = $p.StandardOutput.ReadToEndAsync()
  if (-not $p.WaitForExit(120000)) { try { $p.Kill() } catch { }; return [pscustomobject]@{ Code = 2; Lines = @('STOP: B17 did not finish within 120 s') } }
  $p.WaitForExit()
  [pscustomobject]@{ Code = $p.ExitCode; Lines = @($task.Result -split "`r?`n" | Where-Object { $_ -ne '' }) }
}
# Prints B17's sheet lines (anchored forms only: the console's echo of typed input never matches) and counts the rest.
function Write-S11bB17Out($Res) {
  $held = 0
  foreach ($l in $Res.Lines) {
    # M1: while $global:S11bRecordFile is set, the MANIFEST line and its ROW go to that file (the record) and every other line of the eval stays on the current raw file.
    $keep = $env:S9_RAW; if ($global:S11bRecordFile -and $l -match '^(MANIFEST |ROW )') { $env:S9_RAW = $global:S11bRecordFile }
    if ($l -match $S11bPrintRe) { Write-Host $l; Write-S9Raw $l } else { $held++ }   # s11b-print-ok
    $env:S9_RAW = $keep
  }
  $n = $held
  if ($n -gt 0) { Say9 "B17: $n other line(s) withheld" }
}
function Write-S11bFallback { Write-Host 'FALLBACK: console eval unavailable'; Write-S9Raw 'FALLBACK: console eval unavailable' }

# ---- the worker console: Invoke-S11bConsoleEval (RD-0 a/b, RD-REGEX, RD-7, RD-5, the RULES samplers) ----------------------------
# The window: recorded by the wave at open time (Wait-S9NewWindow via Open-S9WorkerConsole), live (Test-S9Live), and titled DevTools
# (Chrome 156 titles it plain `DevTools`, so the extension is proven by the recorded handle, not the title).
function Test-S11bConsoleWindow([long]$Hwnd) {
  if (-not (Test-S9Live $Hwnd)) { return $false }
  $global:S9WinIds -and $global:S9WinIds.ContainsKey([string]$Hwnd) -and ((Format-S9Title ([S9Win]::Text([IntPtr]$Hwnd))) -match '^(DevTools|<DevTools window>)')
}
function Select-S11bConsoleTab([long]$Hwnd) {
  $root = $S9UIA::FromHandle([IntPtr]$Hwnd)
  $tab = @($root.FindAll([Windows.Automation.TreeScope]::Descendants, (New-Object Windows.Automation.PropertyCondition($S9UIA::ControlTypeProperty, [Windows.Automation.ControlType]::TabItem))) | Where-Object { $_.Current.Name -eq 'Console' })
  if ($tab.Count -ge 1) { $sp = $null; if ($tab[0].TryGetCurrentPattern([Windows.Automation.SelectionItemPattern]::Pattern, [ref]$sp)) { $sp.Select(); Start-Sleep -Milliseconds 400 } }
}
# The console prompt: the one focusable element named like a prompt that is not the page document; $null otherwise.
function Find-S11bPrompt([long]$Hwnd) {
  $root = $S9UIA::FromHandle([IntPtr]$Hwnd)
  $c = @($root.FindAll([Windows.Automation.TreeScope]::Descendants, [Windows.Automation.Condition]::TrueCondition) | Where-Object { $_.Current.Name -match 'prompt' -and $_.Current.ControlType -ne [Windows.Automation.ControlType]::Document -and $_.Current.IsKeyboardFocusable })
  if ($c.Count -eq 1) { return $c[0] }
  $null
}
# Every text UIA exposes in the DevTools window (Console selected), to a file outside the repo; returns the lines. Prints nothing.
function Save-S11bConsole([long]$Hwnd, [string]$Out) {
  [void](Assert-S11Outside $Out)
  Select-S11bConsoleTab $Hwnd
  $root = $S9UIA::FromHandle([IntPtr]$Hwnd)
  $acc = New-Object System.Collections.ArrayList
  foreach ($e in @($root.FindAll([Windows.Automation.TreeScope]::Descendants, [Windows.Automation.Condition]::TrueCondition))) { $x = $e.Current.Name; if ($x) { [void]$acc.Add(($x -replace "`r?`n", ' ')) } }
  [IO.File]::WriteAllText($Out, (($acc -join "`n") + "`n"), $S11Utf8)
  , @($acc.ToArray())
}
# Types one ASCII line into the console prompt and submits it. $true when the Enter was sent, $false (nothing submitted) when a guard fails.
# Never types into a window that is not the wave's recorded DevTools window; the foreground and the focus are checked before the
# text and again before the Enter. The text is never printed.
function Enter-S11bConsoleText([long]$Hwnd, [string]$Text) {
  if (-not (Test-S11bConsoleWindow $Hwnd)) { return $false }
  Select-S11bConsoleTab $Hwnd
  $prompt = Find-S11bPrompt $Hwnd
  if (-not $prompt) { return $false }
  Park-S9Cursor 'console prompt'
  if (-not (Set-S9Foreground $Hwnd)) { return $false }
  try { $prompt.SetFocus() } catch { return $false }
  Start-Sleep -Milliseconds 200
  $wpid = [uint32]0; [void][S9Win]::GetWindowThreadProcessId([IntPtr]$Hwnd, [ref]$wpid)
  $guard = {
    $f = $S9UIA::FocusedElement
    (([long][S9Win]::GetForegroundWindow()) -eq $Hwnd) -and $f -and ([Windows.Automation.Automation]::Compare($f, $prompt) -or $f.Current.ProcessId -eq [int]$wpid)
  }
  $viaValue = $false; $vp = $null
  if ($prompt.TryGetCurrentPattern([Windows.Automation.ValuePattern]::Pattern, [ref]$vp) -and -not $vp.Current.IsReadOnly) {
    try { $vp.SetValue($Text); Start-Sleep -Milliseconds 200; $viaValue = ([string]$vp.Current.Value -ceq $Text) } catch { $viaValue = $false }
  }
  if (-not $viaValue) {
    $keys = ConvertTo-S11bSendKeys $Text
    if ($null -eq $keys) { return $false }
    if (-not (& $guard)) { return $false }
    Add-Type -AssemblyName System.Windows.Forms
    [Windows.Forms.SendKeys]::SendWait('^a'); Start-Sleep -Milliseconds 100
    if (-not (& $guard)) { return $false }
    [Windows.Forms.SendKeys]::SendWait($keys); Start-Sleep -Milliseconds 300
  }
  if (-not (& $guard)) { return $false }
  [S9Win]::keybd_event(0x0D, 0, 0, [UIntPtr]::Zero); [S9Win]::keybd_event(0x0D, 0, 2, [UIntPtr]::Zero)
  Start-Sleep -Milliseconds 300
  $true
}
# Phase one of a console eval: B17 writes the expression (a STOP there ends it), a marker round trip proves the console takes input
# and gives the later reading an anchor, then the expression is typed and submitted. Returns at once (a sampler or the stored poller
# keeps running in the console). The result's Code is $null when submitted, else 2 (B17 STOP, printed) or 10 (FALLBACK, printed).
# -ExprFile: type that file instead (the `stored` process writes its own; it is pattern-checked there).
function Start-S11bConsoleEval([long]$Console, [string]$Sub, [string[]]$Opts = @(), [string]$ExprFile = '', [int]$MarkTimeoutMs = 8000) {
  if ($S11bSubs -cnotcontains $Sub) { throw 'not a B17 console subcommand' }
  $ctx = [pscustomobject]@{ Code = $null; Sub = $Sub; Hwnd = $Console; Mark = [long]0; Expr = '' }
  New-Item -ItemType Directory -Force $S11Out | Out-Null
  $expr = if ($ExprFile) { $ExprFile } else { Join-Path $S11Out ("console-$Sub-" + [guid]::NewGuid().ToString('N') + '.expr') }
  [void](Assert-S11Outside $expr)
  $ctx.Expr = $expr
  if (-not $ExprFile) {
    $r = Invoke-S11bB17 (@($Sub, '--expr', $expr) + $Opts)
    Write-S11bB17Out $r
    if ($r.Code -ne 0) { $ctx.Code = [int]$r.Code; return $ctx }
  }
  if (-not (Test-Path -LiteralPath $expr)) { Write-S11bFallback; $ctx.Code = $S11bFallbackCode; return $ctx }
  $ctx.Mark = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  if (-not (Enter-S11bConsoleText $Console "void console.log(""S11B-MARK $($ctx.Mark)"")")) { Write-S11bFallback; $ctx.Code = $S11bFallbackCode; return $ctx }
  $dump = Join-Path $S11Out ("console-mark-" + [guid]::NewGuid().ToString('N') + '.dump')
  $t0 = Get-Date; $seen = $false
  try {
    do {
      Start-Sleep -Milliseconds 500
      $lines = Save-S11bConsole $Console $dump
      $seen = (Get-S11bTail $lines "S11B-MARK $($ctx.Mark)").Found
    } until ($seen -or ((Get-Date) - $t0).TotalMilliseconds -gt $MarkTimeoutMs)
  } finally { Remove-Item -LiteralPath $dump -Force -ErrorAction SilentlyContinue }
  if (-not $seen) { Write-S11bFallback; $ctx.Code = $S11bFallbackCode; return $ctx }
  $text = [IO.File]::ReadAllText($expr, $S11Utf8).TrimEnd("`r", "`n")
  if (-not (Enter-S11bConsoleText $Console $text)) { Write-S11bFallback; $ctx.Code = $S11bFallbackCode; return $ctx }
  $Name = $Sub
  Say9 "CONSOLE $Name submitted"
  $ctx
}
# Phase two: waits (bounded) for B17's result line in the console text AFTER this call's marker, runs `B17 <sub> --read`, prints its
# lines, returns B17's exit code (0 pass, 1 fail, 2 STOP, 3 not measured). On the bound: 10 with the FALLBACK line when
# -FallbackOnTimeout (a short read-only expression), else 3 with B17's own NOT MEASURED line (a sampler read late).
function Complete-S11bConsoleEval($Ctx, [string[]]$ReadOpts = @(), [int]$TimeoutMs = 8000, [switch]$FallbackOnTimeout) {
  $dump = Join-Path $S11Out ("console-" + $Ctx.Sub + "-" + [guid]::NewGuid().ToString('N') + '.dump')
  $tail = $dump + '.tail'
  $t0 = Get-Date; $r = $null
  try {
    do {
      Start-Sleep -Milliseconds 600
      $lines = Save-S11bConsole $Ctx.Hwnd $dump
      $tl = Get-S11bTail $lines "S11B-MARK $($Ctx.Mark)"
      if ($tl.Found) {
        [IO.File]::WriteAllText($tail, ((@($tl.Lines) -join "`n") + "`n"), $S11Utf8)
        $r = Invoke-S11bB17 (@($Ctx.Sub, '--read', $tail) + $ReadOpts)
        if (-not ($r.Code -eq 3 -and (@($r.Lines | Where-Object { $_ -match '^NOT MEASURED: no ' }).Count -ge 1))) { break }
        $r = $null
      }
    } while (((Get-Date) - $t0).TotalMilliseconds -lt $TimeoutMs)
  } finally {
    Remove-Item -LiteralPath $dump -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $tail -Force -ErrorAction SilentlyContinue
    if ($Ctx.Expr) { Remove-Item -LiteralPath $Ctx.Expr -Force -ErrorAction SilentlyContinue }
  }
  if ($r) { Write-S11bB17Out $r; return [int]$r.Code }
  if ($FallbackOnTimeout) { Write-S11bFallback; return $S11bFallbackCode }
  $Name = $Ctx.Sub; $ms = $TimeoutMs
  Say9 "CONSOLE $Name : no result line within $ms ms; NOT MEASURED"
  3
}
# A short, read-only expression in one call: RD-0 (a)/(b) manifest and rules, rules --expect, ctx, regex. Returns the code above.
# Long ones (the `rules --sample` sampler, the stored poller) use Start-S11bConsoleEval, do their work, then Complete-S11bConsoleEval.
function Invoke-S11bConsoleEval([long]$Console, [string]$Sub, [string[]]$Opts = @(), [string[]]$ReadOpts = @(), [int]$TimeoutMs = 8000) {
  $c = Start-S11bConsoleEval $Console $Sub $Opts
  if ($null -ne $c.Code) { return [int]$c.Code }
  Complete-S11bConsoleEval $c $ReadOpts $TimeoutMs -FallbackOnTimeout
}
# RD-5: true when the stored poller's acknowledgement line (STOREDPOLL done) stands after this call's marker. Nothing is printed.
function Test-S11bStoredAck($Ctx) {
  $dump = Join-Path $S11Out ("console-ack-" + [guid]::NewGuid().ToString('N') + '.dump')
  try {
    $lines = Save-S11bConsole $Ctx.Hwnd $dump
    $tl = Get-S11bTail $lines "S11B-MARK $($Ctx.Mark)"
    $tl.Found -and (@($tl.Lines) -ccontains 'STOREDPOLL done')
  } finally { Remove-Item -LiteralPath $dump -Force -ErrorAction SilentlyContinue }
}

# ---- driver pieces for B17's signals (builder 5, section 5) ------------------------------------------------------------------
# One banner-sampler pass per refusal id (Invoke-S11Sampler of s11-win.ps1, once for each id, in the order given).
function Invoke-S11bSamplerPasses([string[]]$Ids, [long[]]$Hwnds) {
  foreach ($Id in $Ids) { if ($S11bSamplerIds -cnotcontains $Id) { throw 'not a sampler id of the sheet' } }
  foreach ($Id in $Ids) { Invoke-S11Sampler $Id $Hwnds }
}
function Test-S11bTitleOff([long]$Hwnd) {
  $b = Find-S9ActionButtons $Hwnd
  ($b.Count -eq 1) -and (Get-S9FirstLine $b[0].Current.Name).First.StartsWith($S9TitleOff.Substring(0, 25))
}
# R17-UP-RACE-A: as Invoke-S11Race 'A' (button pressed at ready + 1.5 s, again 1.6 s later, .pressed after loop-done) plus the
# new file UP-RACE-A.press: the epoch ms at which the OFF title was first read after the first press, written BEFORE .pressed.
# No OFF title within 2 s: no .press file (B17 then reports NOT MEASURED) and the second press still restores the switch.
function Invoke-S11bRaceA([long]$Btn) {
  $id = 'UP-RACE-A'
  if (-not (Test-S11ButtonReady $Btn)) { return $false }
  Park-S9Cursor 'race A'
  [void](Wait-S11Ready $id); $t0 = Get-Date
  while ((Get-Date) -lt $t0.AddMilliseconds(1500)) { Start-Sleep -Milliseconds 5 }
  $p1 = Get-Date; [void](Invoke-S9ActionButton $Btn)
  $pms = [long]0; $t1 = Get-Date
  do { if (Test-S11bTitleOff $Btn) { $pms = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() } else { Start-Sleep -Milliseconds 20 } } until ($pms -gt 0 -or ((Get-Date) - $t1).TotalMilliseconds -gt 2000)
  if ($pms -gt 0) { [IO.File]::WriteAllText((Join-Path $S11Out "$id.press"), "$pms", $S11Utf8) } else { Stop9 'RACE A: the toolbar title did not read OFF after the first press; no .press file' }
  while (((Get-Date) - $p1).TotalMilliseconds -lt 1600) { Start-Sleep -Milliseconds 5 }
  [void](Invoke-S9ActionButton $Btn)
  Wait-S9ActionTitle $Btn $S9TitleArmed 2000
  if ("$(Get-S9ActionTitle $Btn)" -ne $S9TitleArmed) { Stop9 'the toolbar title does not read armed after the press pair'; return $false }
  [void](Wait-S11Ready "$id-loop-done" 180)
  Write-S11Pressed $id
  Test-S9DaemonSafety ([bool]$global:S11Found.armed) ([bool]$global:S11Found.evaluate) ([int]$global:S11Found.count) $id 5000
}

# H7 contract gap: the block list as found plus $Extra lines (none = the found text itself), saved and read back by hash. The found
# text is read here, never in the runner (decisions.md #279). Returns what Set-S11BoxVerified returns.
function Set-S11bBlockList([long]$O, [string[]]$Extra = @()) {
  $t = Get-S11FoundText 'blocklist'
  foreach ($l in $Extra) { $t = Add-S11Line $t $l }
  Set-S11BoxVerified $O 'blocklist' $t
}

# ---- H8: typed lines (F-HOME, RD-CAPS-WARN, R17-UP-OPT) and the block list as the stored-poller expects it ------------------------
# K-opt-stand (extension/src/options-model.ts UPLOAD_FOLDERS_WARNING; tied by s11b-win-static.test.ts). Run 16's $S11Warning is the old text.
$S11bStand = 'An agent may upload any file inside these folders to any site it can open. Allow only folders that hold files you mean to share. A home folder, or a folder that holds home folders, is refused; never allow a folder that holds bridge.token or a .ssh folder. An agent that can also run programs on this computer can put any file into an allowed folder.'
$S11bHomeTyped = @('C:\Users\fixture-home', 'C:\Users', 'C:\Users\fixture-home\work', '/home/fixture-home', '/root')
# A long-host fixture (RD-CAPS-WARN): three labels of a, 24, 24 and $Last long, with the fixture port: a regex of 119, 120 or 121 characters.
function Get-S11bLongHost([int]$Last) { ((24, 24, $Last | ForEach-Object { 'a' * $_ }) -join '.') + ':8085' }
# Types $Lines after the box's base text (the found text, or with -OnRoot found + ROOT) and does NOT save (Set-S11Box -NoSave).
# The text is never printed and never returned.
function Set-S11bTyped([long]$O, [ValidateSet('blocklist', 'uploadfolders')][string]$Box, [string[]]$Lines, [switch]$OnRoot) {
  $t = if ($OnRoot) { $global:S11RootText } else { Get-S11FoundText $Box }
  foreach ($l in $Lines) { $t = Add-S11Line $t $l }
  [void](Set-S11Box $O $Box $t -NoSave)
  Start-Sleep -Milliseconds 400
}
# The page as it reads while typed: the Upload-folders summary, the invalid-line items (K-opt-item texts; the judge keeps the typed lines' own), the standing text count.
function Get-S11bTypedObs([long]$O) {
  $doc = Get-S9Options $O
  [pscustomobject]@{
    Summary = [string](Get-S11Summary $doc)
    Items = @(Find-S11Texts $doc '^Line \d+: [^\x00-\x7f]')
    Standing = @(Find-S11Texts $doc ('^' + [regex]::Escape($S11bStand) + '$')).Count
  }
}
# Reverts the typed text (not saved), then reads the STORED state from a fresh page: $true when the stored box equals $WantSha (never printed).
function Undo-S11bTyped([long]$O, [ValidateSet('blocklist', 'uploadfolders')][string]$Box, [string]$WantSha, [switch]$OnRoot) {
  $t = if ($OnRoot) { $global:S11RootText } else { Get-S11FoundText $Box }
  [void](Set-S11Box $O $Box $t -NoSave)
  Start-Sleep -Milliseconds 400
  $r = Read-S11Stored $O -PassThru
  $got = if ($Box -eq 'blocklist') { $r.blockSha } else { $r.foldersSha }
  $equal = ($got -eq $WantSha)
  Say9 "TYPED $Box reverted; stored $(if ($equal) { 'equal' } else { 'DIFFERENT' })"
  $equal
}
# An observation file for B17 judge-opt: JSON, UTF-8, outside the repo, deleted by the caller after the judge. Returns its path.
function Write-S11bObs([string]$Name, $Obj) {
  $f = Assert-S11Outside (Join-Path $S11Out $Name)
  [IO.File]::WriteAllText($f, (ConvertTo-Json -InputObject $Obj -Depth 5 -Compress), $S11Utf8)
  $f
}
# F-HOME: the five home lines typed after the found Upload folders (not saved), read, reverted; the observation file's path.
function Get-S11bHomeObs([long]$O) {
  $sum0 = [string](Get-S11Summary (Get-S9Options $O))
  Set-S11bTyped $O 'uploadfolders' $S11bHomeTyped
  $t = Get-S11bTypedObs $O
  $equal = Undo-S11bTyped $O 'uploadfolders' $global:S11Found.foldersSha
  Write-S11bObs 'fhome-obs.json' ([ordered]@{ foundSummary = $sum0; standing = $t.Standing; summaryTyped = $t.Summary; items = @($t.Items); foundCount = $global:S11Found.foldersLines; storedEqual = $equal })
}
# RD-CAPS-WARN: H119 and H120 typed after the found block list, caps read; H121 added, read; reverted. bl = RD-0 (c)'s line count.
function Get-S11bCapsObs([long]$O) {
  Set-S11bTyped $O 'blocklist' @((Get-S11bLongHost 22), (Get-S11bLongHost 23))
  $two = Get-S11bCaps $O
  Set-S11bTyped $O 'blocklist' @((Get-S11bLongHost 22), (Get-S11bLongHost 23), (Get-S11bLongHost 24))
  $three = Get-S11bCaps $O
  $equal = Undo-S11bTyped $O 'blocklist' $global:S11Found.blockSha
  if (-not ($two.Found -or $three.Found) -and $equal) { return '' }   # neither read found anything: not measured; else judged (a changed stored list, a list gone after H121: FAIL)
  Write-S11bObs 'caps-obs.json' ([ordered]@{ bl = [int]$global:S11Found.blockLines; afterTwo = @($two.Items); afterThree = @($three.Items); storedEqual = $equal })
}
# R17-UP-OPT: Invoke-S11Opt's observations ($ObsJson) completed with what it cannot read (K-opt-stand once; the third typed line's
# K-opt-home item), judged together by B17. $FoundSummary = the Upload-folders summary read before Invoke-S11Opt ran.
function Get-S11bOptObs([long]$O, [string]$ObsJson, [string]$FoundSummary) {
  $j = [IO.File]::ReadAllText($ObsJson, $S11Utf8) | ConvertFrom-Json
  Set-S11bTyped $O 'uploadfolders' $S11Typed -OnRoot
  $t = Get-S11bTypedObs $O
  $equal = Undo-S11bTyped $O 'uploadfolders' $j.setSha -OnRoot
  Write-S11bObs 'upopt-merged.json' ([ordered]@{
    foundSummary = $FoundSummary; standing = $t.Standing; summaryAfterSave = $j.summaryAfterSave; summaryTyped = $j.summaryTyped; summaryAfterRevert = $j.summaryAfterRevert
    items = @($t.Items); foundCount = $j.foundCount; storedEqual = $equal; firstTypedLine = $j.firstTypedLine; o2Ms = $j.o2Ms; o2Conflict = $j.o2Conflict
    setSha = $j.setSha; storedSha = $j.storedSha; storedWhileTypingSha = $j.storedWhileTypingSha })
}
# RD-5: the block list as found plus $Extra lines, written to a file outside the repo (B17 stored compares the stored value with it
# in its own process), and the same list typed and saved with no read-back (the poller reads it back). The found text is read here only.
function Write-S11bExpected([string]$File, [string[]]$Extra = @()) {
  $t = Get-S11FoundText 'blocklist'
  foreach ($l in $Extra) { $t = Add-S11Line $t $l }
  [IO.File]::WriteAllText((Assert-S11Outside $File), $t, $S11Utf8)
}
function Save-S11bBlockList([long]$O, [string[]]$Extra = @()) {
  $t = Get-S11FoundText 'blocklist'
  foreach ($l in $Extra) { $t = Add-S11Line $t $l }
  [void](Set-S11Box $O 'blocklist' $t)
}
