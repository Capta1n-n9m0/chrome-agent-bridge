# recipes/s11-r16.ps1: the block runner of Run 16 (Step 11 stage S5; docs/e2e-test-plan.md section 4.23). Windows PowerShell 5.1,
# ASCII only. Written 2026-10-26 by the S5-runner builder (Sonnet 5.5) on recipes/s10-r15.ps1's model; NOT run against Chrome,
# a daemon or a port by its author. The pure decisions (row -> block table, slice order, G11-3 gate, stop plan) are in
# recipes/s11-r16-plan.ts and tested there; the helpers are recipes/s11-win.ps1, the actor is recipes/s11.ts.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\s11-r16.ps1 -Block liveA | liveB | <one block>
#
# liveA / liveB run a whole slice (prologue, rows in the sheet's order, teardown); any other -Block runs one block alone (the
# wave's globals live in $env:S11_OUT\r16-globals.clixml between calls), so a single row can be re-run between rows by the
# step agent. A slice is longer than the PowerShell tool's 600 s cap: run it in the background. Framing blocks write to
# r16-framing.txt, rows to the run record (S5-run-record.md in the steps dir), UTF-8, every printed line.
# STOP procedure (#193, #279): any STOP: line (ours, a helper's, s11.ts's) or throw ends the block; after the first state change
# the safety state is restored and read back by hash (a stop inside the restore does not restore twice and ends the wave too);
# own windows, actor, nodes and servers are ended (own PIDs only, never chrome.exe); exit 2. Exit: 0 done (a CHECK may say
# FAIL: recorded, not a stop), 2 STOP, 3 not run (the G11-3 gate).
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('liveA', 'liveB', 'preflight', 'servers', 'files', 'window', 'prestale', 'reload', 'setup', 'console', 'teardown', 'root-add', 'up-l1', 'up-0', 'up-opt', 'up-fa', 'up-6', 'up-7', 'save-refuse-r', 'sw-2', 'up-1', 'up-2', 'up-3', 'up-4', 'up-5', 'up-6b', 'up-8', 'up-9', 'up-patch', 'up-twice', 'up-raw', 'up-nav', 'up-devt', 'up-stale', 'up-7j', 'up-race-a', 'up-race-b', 'up-restore', 'up-logs')]
  [string]$Block
)
$ErrorActionPreference = 'Continue'
$Repo = Split-Path -Parent $PSScriptRoot
Set-Location $Repo
$env:Path = "$env:LOCALAPPDATA\Author Software\nvm\.nodejs;$env:Path"
[Console]::OutputEncoding = [Text.Encoding]::UTF8
if (-not $env:S11_OUT) { $env:S11_OUT = Join-Path $env:TEMP 'bridge-e2e\s11' }
New-Item -ItemType Directory -Force $env:S11_OUT | Out-Null
$env:S9_OUT = $env:S11_OUT
$env:S9_ACTORS = Join-Path $env:S11_OUT 'actors'
$Steps = 'docs/plans/2026-10-25-step11-file-upload-steps'
$Record = Join-Path $Repo "$Steps/S5-run-record.md"
$Framing = Join-Path $env:S11_OUT 'r16-framing.txt'
$GlobalsFile = Join-Path $env:S11_OUT 'r16-globals.clixml'
$FoundDir = Join-Path $env:S11_OUT 'found'
$Root = Join-Path $env:S11_OUT 'wave\root'
$FoundJson = Join-Path $env:S11_OUT 'found.json'
$NowJson = Join-Path $env:S11_OUT 'now.json'
$OptJson = Join-Path $env:S11_OUT 'opt-obs.json'
$DaemonLog = "$HOME\.chrome-agent-bridge\daemon.log"
$FixtureHuman = 'http://127.0.0.1:8081/s11-upload.html?s11=human'
# Tied to recipes/s11-r16-plan.ts by recipes/test/s11-r16-runner.test.ts.
$FramingBlocks = @('preflight', 'servers', 'files', 'window', 'prestale', 'reload', 'setup', 'console', 'teardown')
$SliceA = @('preflight', 'servers', 'files', 'window', 'reload', 'setup', 'console', 'up-l1', 'up-0', 'up-opt', 'up-fa', 'up-6', 'up-7', 'save-refuse-r', 'sw-2', 'up-restore', 'up-logs', 'teardown')
$SliceB = @('preflight', 'servers', 'files', 'window', 'prestale', 'reload', 'setup', 'console', 'up-0', 'root-add', 'up-1', 'up-2', 'up-3', 'up-4', 'up-5', 'up-6b', 'up-8', 'up-9', 'up-patch', 'up-twice', 'up-raw', 'up-nav', 'up-devt', 'up-stale', 'up-7j', 'up-race-a', 'up-race-b', 'up-restore', 'up-logs', 'teardown')
$NeedsAccess = @('root-add', 'up-1', 'up-2', 'up-3', 'up-4', 'up-5', 'up-6b', 'up-8', 'up-9', 'up-patch', 'up-twice', 'up-raw', 'up-nav', 'up-devt', 'up-stale', 'up-7j', 'up-race-a', 'up-race-b')
$Persist = @('W', 'O', 'E', 'D', 'X', 'S9WinIds', 'S11Own', 'S11Found', 'S11RootText', 'S11Stable', 'S16Changed', 'S16Pids', 'S16Born', 'S16Toggle', 'S16Mark', 'S16Actor', 'S16ConsoleRead')
. "$PSScriptRoot\s11-win.ps1"
$global:S9PinUiaOnly = $true                      # never pin or unpin by mouse in this wave
$global:S16Stops = 0; $global:S16Fail = 0; $global:S16NM = 0; $global:S16Gone = $false; $global:S16InRestore = $false

# ---- output: ONE printing site; every helper line funnels through it (profile folder masked, STOP lines counted) ------------
function Show-S16([string[]]$Lines) {
  foreach ($t in $Lines) {
    if ($t -match '^STOP:') { $global:S16Stops++ }
    $m = $t.Replace($env:USERPROFILE, '<PROFILE>'); Write-Host $m; Write-S9Raw $m   # vetted-node-output
  }
}
function Say9([string]$Msg) { Show-S16 @(('{0:yyyy-MM-ddTHH:mm:ss.fffZ} s9-win: {1}' -f [DateTime]::UtcNow, $Msg)) }
function Stop9([string]$Why) { Show-S16 @("STOP: $Why (at $(Now9))") }
function Fail-S16([string]$Why) { Stop9 $Why; throw 'stop' }
function Set-S16Raw([string]$Name) { $env:S9_RAW = if ($FramingBlocks -contains $Name) { $Framing } else { $Record } }

# ---- the wave's globals and own processes ---------------------------------------------------------------------------------
function Load-S16 {
  if (Test-Path $GlobalsFile) { $h = Import-Clixml $GlobalsFile; foreach ($k in $h.Keys) { Set-Variable -Scope Global -Name $k -Value $h[$k] } }
  if (-not $global:S11Own) { $global:S11Own = @{} }
  if (-not $global:S9WinIds) { $global:S9WinIds = @{} }
  if (-not $global:S16Pids) { $global:S16Pids = @{} }
  if (-not $global:S16Born) { $global:S16Born = @{} }
}
function Save-S16 {
  if ($global:S16Gone) { Remove-Item -LiteralPath $GlobalsFile -Force -ErrorAction SilentlyContinue; return }
  $h = @{}
  foreach ($n in $Persist) { $v = Get-Variable -Scope Global -Name $n -ValueOnly -ErrorAction SilentlyContinue; if ($null -ne $v) { $h[$n] = $v } }
  $h | Export-Clixml $GlobalsFile   # vetted-clixml
}
function Set-S16Pid([string]$Name, [int]$Id) {
  $global:S16Pids[$Name] = $Id
  $global:S16Born[$Name] = (Get-Process -Id $Id).StartTime.Ticks
  Save-S16
}
# Kills a process the wave started (recorded with its start time), with its children; never anything else.
function Stop-S16Pid([string]$Name) {
  $Id = $global:S16Pids[$Name]
  if (-not $Id) { return }
  $pr = Get-Process -Id $Id -ErrorAction SilentlyContinue
  # /T only for the two servers; a node process may have spawned the daemon (detached, but still its child), so it dies alone (MINOR-4).
  $ta = @(if ($Name -like 'srv*') { '/T', '/F' } else { '/F' })
  if ($pr -and $pr.StartTime.Ticks -eq $global:S16Born[$Name]) { & taskkill @ta /PID $Id | Out-Null; Say9 "stopped own process $Name" }
  $global:S16Pids.Remove($Name); $global:S16Born.Remove($Name)
}
function Stop-S16All { foreach ($Name in @($global:S16Pids.Keys)) { Stop-S16Pid $Name } }

# Port rule (#251, #273; s11-r16-plan.ts portVerdict): 8081 and 8084 free or held by the wave's own server; 9234 free or the daemon.
function Test-S16Port([int]$Port) {
  $ok = $true
  foreach ($c in @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)) {
    $cp = Get-CimInstance Win32_Process -Filter "ProcessId=$($c.OwningProcess)"
    $own = ($global:S16Pids.Values -contains [int]$c.OwningProcess) -or ($cp -and ($global:S16Pids.Values -contains [int]$cp.ParentProcessId))
    $dm = [bool]($cp -and $cp.CommandLine -match 'daemon[\\/]dist[\\/]index\.js')
    if (-not $(if ($Port -eq 9234) { $dm } else { $own })) { $ok = $false }
  }
  $ok
}

# ---- running s11.ts (and the judge) beside the driver's signals ---------------------------------------------------------------
# The node script runs in the background; the driver block (UI Automation, signals of S5-actor's contract) runs here meanwhile.
# Exit codes of s11.ts: 0 pass, 1 a check failed (recorded), 2 STOP, 3 not measured.
function Invoke-S16Node([string[]]$NodeArgs, [scriptblock]$Driver = $null, [int]$BudgetS = 300, [string]$Script = 'recipes\s11.ts') {
  $Name = if ($Script -eq 'recipes\s11.ts') { $NodeArgs[0] } else { 'judge' }
  $of = Join-Path $env:S11_OUT 'node-out.txt'; $ef = Join-Path $env:S11_OUT 'node-err.txt'
  Remove-Item -LiteralPath $of, $ef -Force -ErrorAction SilentlyContinue
  if ($Driver) { Clear-S11Signals }
  $s0 = $global:S16Stops
  $p = Start-Process -FilePath node -ArgumentList (@('--import', 'tsx', $Script) + $NodeArgs) -WorkingDirectory $Repo -NoNewWindow -PassThru -RedirectStandardOutput $of -RedirectStandardError $ef
  $null = $p.Handle
  Set-S16Pid 'node' $p.Id
  $tag = ''; $res = @()
  if ($Driver) { try { $res = @(& $Driver) } catch { $tag = $_.Exception.GetType().Name } }
  if ($tag -and -not $p.HasExited) { Stop-S16Pid 'node' }
  $done = $p.WaitForExit($BudgetS * 1000)
  if (-not $done) { Stop-S16Pid 'node' }
  $out = if (Test-Path $of) { @(Get-Content $of -Encoding UTF8) } else { @() }
  Show-S16 $out
  $n = if ($done) { $p.ExitCode } else { -1 }
  $global:S16Pids.Remove('node'); $global:S16Born.Remove('node')
  if ($tag) { throw "the driver of $Name threw $tag" }
  if (-not $done) { throw "node $Name exceeded its budget" }
  if ($res -contains $false) { throw "the driver of $Name stopped" }
  if ($n -eq 2 -or $global:S16Stops -gt $s0) { throw "node $Name ended in a STOP" }
  # exit 1 is "a check failed" only when s11.ts printed a ROW or CHECK line; a crash (import, compile) also exits 1 (MINOR-3).
  if ($n -eq 1 -and -not @($out | Where-Object { $_ -match '^(ROW|CHECK) ' }).Count) { throw "node $Name exited 1 with no ROW or CHECK line (a crash, see node-err.txt)" }
  if ($n -eq 1) { $global:S16Fail++ } elseif ($n -eq 3) { $global:S16NM++ } elseif ($n -ne 0) { throw "node $Name exited $n" }
  $n
}
# One row: optional front-and-park of W, optional banner sampler (the 4 s after the reply, S5-win).
function Invoke-S16Row([string[]]$A, [string]$Sampler = '', [switch]$Front, [int]$BudgetS = 300) {
  if ($Front) { Step-S16 'front' { Set-S11Front $global:W 'row' } }
  $d = $null
  if ($Sampler) { $d = { Invoke-S11Sampler $Sampler @($global:W) } }
  [void](Invoke-S16Node $A $d $BudgetS)
}
# A helper-only step: a STOP line printed inside it or a $false it returns ends the block.
function Step-S16([string]$Name, [scriptblock]$Do) {
  $s0 = $global:S16Stops; $r = @(& $Do)
  if ($global:S16Stops -gt $s0 -or $r -contains $false) { throw "step $Name stopped" }
}
function New-S16Window([string]$Url) {
  $r = @(Open-S11Window $Url); $h = if ($r.Count) { [long]$r[-1] } else { 0 }
  if ($h -le 0) { throw 'no wave window' }
  $h
}
function Use-S16Options {
  if (-not (Test-S11Own $global:O)) { $global:O = New-S16Window $S9OptionsUrl }
  $global:O
}
function Start-S16Actor { [void](Invoke-S16Node @('actor-start')); $global:S16Actor = $true; Save-S16 }
function End-S16Actor { if ($global:S16Actor) { $global:S16Actor = $false; [void](Invoke-S16Node @('actor-end')) } }
# S5-liveB (console, #282): a stop before UP-LOGS must not lose the worker console (liveA's F2: the first run's window was closed unread).
# Whatever closes the windows first saves the capture to the same console.txt UP-LOGS reads; no verdict, no scan, no guard here.
function Save-S16Console {
  if ($global:S16ConsoleRead) { return }
  if ($global:D -and (Test-S9Live $global:D)) {
    Read-S9WorkerConsole $global:D (Join-Path $env:S11_OUT 'console.txt')
    $global:S16ConsoleRead = $true
  }
}
function Close-S16Windows {
  try { Save-S16Console } catch { Say9 'the worker console could not be saved before closing (no verdict)' }
  foreach ($h in @($global:D, $global:E)) { if ($h -and (Test-S9Live $h)) { Close-S9Window $h } }
  Close-S11All
}

# G11-3 (#245; s11-r16-plan.ts liveBGate / needsFileAccess): a block that needs file access runs only when UP-0 read the toggle on.
function Test-S16Gate([string]$Name) {
  if (($NeedsAccess -contains $Name) -and $global:S16Toggle -ne 'on') {
    Say9 "GATE block $Name refused: the file-URL toggle did not read on (G11-3); its rows stay NOT RUN"
    return $false
  }
  $true
}

# liveB only (MINOR-2): the toggle is read right after the preflight, before any server, file, window of the wave or reload. The read needs
# only a window of its own on chrome://extensions (read only, nothing pressed). OFF: nothing started, globals removed, the caller exits 3.
function Read-S16Early {
  $E2 = New-S16Window "chrome://extensions/?id=$S9Id"
  try { $reading = @(Read-S11FileAccess $E2)[-1] } finally { Close-S11Window $E2 }
  if ($reading -notin 'on', 'off') { Fail-S16 'the file-URL toggle is unreadable; nothing changed' }
  $global:S16Toggle = $reading
  if ($reading -ne 'on') {
    Say9 'GATE liveB refused before any state change: the file-URL toggle reads off (G11-3); its rows stay NOT RUN'
    $global:S16Gone = $true; Save-S16
    return $false
  }
  $true
}

# ---- the stop procedure --------------------------------------------------------------------------------------------------------
function Stop-S16Wave([string]$Why) {
  Say9 "WAVE stopping: $Why"
  if ($global:S16Changed -and -not $global:S16InRestore) {
    $s0 = $global:S16Stops; $okr = $false; $threw = $false
    try { $O = Use-S16Options; $okr = (@(Restore-S11Safety $O $global:W 'UP-RESTORE')[-1] -eq $true) } catch { $threw = $true }
    if ($threw -or -not $okr -or $global:S16Stops -gt $s0) { Stop9 'the restore failed or printed a STOP during the stop procedure; the wave is over' }
  } elseif ($global:S16Changed) { Say9 'the stop met the restore itself; no second restore' }
  try { End-S16Actor } catch { }
  try { Close-S16Windows } catch { }
  Stop-S16All
  Stop9 "the wave ended ($Why)"
  Save-S16
  exit 2
}

# ---- the blocks --------------------------------------------------------------------------------------------------------------
$Blocks = @{}
$Blocks['preflight'] = {
  if (Test-Path $GlobalsFile) { Fail-S16 'a previous wave''s globals exist; run -Block teardown first' }
  $d = @(git status --porcelain --untracked-files=no -- . ":(exclude)$Steps"); $count = $d.Count
  if ($count -gt 0) { Fail-S16 "the tracked tree is not clean outside the steps dir ($count path(s))" }
  foreach ($f in 'daemon\dist\index.js', 'mcp\dist\index.js', 'extension\dist\sw.js') { if (-not (Test-Path $f)) { Fail-S16 'a dist file is missing; run npm run build first' } }
  if (-not (Get-Process chrome -ErrorAction SilentlyContinue)) { Fail-S16 'Chrome is not running (it is never launched here)' }
  if (-not (Get-Command python -ErrorAction SilentlyContinue)) { Fail-S16 'python was not found' }
  foreach ($k in 8081, 8084, 9234) { if (-not (Test-S16Port $k)) { Fail-S16 "port $k is held by a program the wave did not start (#251)" } }
  $mk = @(Get-Content $DaemonLog -ErrorAction SilentlyContinue); $global:S16Mark = $mk.Count
  Say9 "PREFLIGHT ok: head $(git rev-parse --short HEAD), tree clean, ports 8081 and 8084 free, 9234 free or the daemon's"
}
$Blocks['servers'] = {
  $py = (Get-Command python).Source
  $p1 = Start-Process -FilePath $py -ArgumentList '-m', 'http.server', '8081', '--bind', '127.0.0.1', '--directory', 'test-fixtures' -WorkingDirectory $Repo -WindowStyle Hidden -PassThru
  Set-S16Pid 'srv8081' $p1.Id
  $p2 = Start-Process -FilePath $py -ArgumentList '-I', 'recipes\s11-csp.py', '8084' -WorkingDirectory $Repo -WindowStyle Hidden -PassThru
  Set-S16Pid 'srv8084' $p2.Id
  $csp = ''
  foreach ($k in 8081, 8084) {
    $t0 = Get-Date; $up = $false
    while (-not $up -and ((Get-Date) - $t0).TotalSeconds -lt 15) {
      try { $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 "http://127.0.0.1:$k/s11-upload.html"; $up = ($r.StatusCode -eq 200); if ($k -eq 8084) { $csp = [string]$r.Headers['Content-Security-Policy'] } } catch { Start-Sleep -Milliseconds 300 }
    }
    if (-not $up) { Fail-S16 "the fixture server on $k did not answer" }
    if (-not (Test-S16Port $k)) { Fail-S16 "port $k is not held by the wave's own server" }
  }
  if ($csp -notmatch "script-src 'self'") { Fail-S16 'the 8084 header is not the CSP' }
  Say9 "SERVERS 8081 and 8084 up under the wave's own PIDs; the 8084 header carries script-src 'self'"
}
$Blocks['files'] = { [void](Invoke-S16Node @('make')) }
$Blocks['window'] = {
  $global:W = New-S16Window $FixtureHuman
  $W = $global:W
  if (-not (@(Get-S10PinState $W -Quiet)[-1])) { Fail-S16 'the toolbar button is not pinned (human gate); nothing was clicked' }
  Say9 "WINDOW W is $W; the toolbar button is pinned"
}
$Blocks['prestale'] = { [void](Invoke-S16Node @('setup', '--only', 'stale')) }
$Blocks['reload'] = {
  foreach ($k in 1, 2) {
    $o = @(powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\reload-extension.ps1); $n = $LASTEXITCODE
    Show-S16 ([string[]]$o)
    Say9 "reload-extension.ps1 exit $n (attempt $k)"
    if ($n -ne 2) { break }
  }
  if ($n -ne 0) { Fail-S16 "the reload script exited $n after one re-run on exit 2" }
  [void](Set-S9Foreground $global:W)
}
$Blocks['setup'] = { [void](Set-S9Foreground $global:W); [void](Invoke-S16Node @('setup')) }
$Blocks['console'] = {
  $global:E = [long](@(Open-S9ChromePage 'chrome://extensions')[-1])
  $global:D = [long](@(Open-S9WorkerConsole $global:E)[-1])
  [void](Set-S9Foreground $global:W)
  Say9 'CONSOLE the worker console window is open'
}
$Blocks['up-l1'] = {
  Step-S16 'found-text' { Save-S11Found (Use-S16Options) $FoundDir 'unreadable' }
  [void](Invoke-S16Node @('foundcheck', '--text-file', (Join-Path $FoundDir 'found-uploadfolders.txt')))
  [void](Invoke-S16Row @('l1'))
}
$Blocks['up-0'] = {
  if ($global:S16Changed) { Fail-S16 'UP-0 after a state change would overwrite the found texts; refused' }
  $E2 = New-S16Window "chrome://extensions/?id=$S9Id"
  $reading = @(Read-S11FileAccess $E2)[-1]
  Close-S11Window $E2
  if ($reading -notin 'on', 'off') { Fail-S16 'the file-URL toggle is unreadable; nothing changed' }
  $global:S16Toggle = $reading
  Step-S16 'found' { Save-S11Found (Use-S16Options) $FoundDir $reading }
  [void](Invoke-S16Node @('found', '--file', $FoundJson))
}
$Blocks['root-add'] = {
  $global:S16Changed = $true; Save-S16
  Step-S16 'root' { Add-S11Root (Use-S16Options) $Root }
}
$Blocks['up-opt'] = {
  $global:S16Changed = $true; Save-S16
  Step-S16 'opt' { Invoke-S11Opt (Use-S16Options) $Root $OptJson }
  [void](Invoke-S16Node @($OptJson) $null 60 'recipes\s11-r16-opt.ts')
}
$Blocks['up-fa'] = {
  $s = if ($global:S16Toggle -eq 'off') { 'UP-FA' } else { '' }
  [void](Invoke-S16Row @('fa') $s)
}
$Blocks['up-6'] = { Invoke-S16Row @('up6') 'UP-6' -Front }
$Blocks['up-7'] = {
  $global:S16Changed = $true; Save-S16
  $O = Use-S16Options
  [void](Invoke-S16Node @('up7') { foreach ($Id in 'UP-7-a', 'UP-7-b', 'UP-7-c') { Invoke-S11Row $Id $O } })
}
$Blocks['save-refuse-r'] = {
  [void](Invoke-S16Node @('saverefuse-sdk'))
  Start-S16Actor
  try { [void](Invoke-S16Node @('saverefuse-mcp')) } finally { End-S16Actor }
}
$Blocks['sw-2'] = {
  Step-S16 'front' { Set-S11Place $global:W; Set-S11Front $global:W 'SW-2'; Enter-S11Guards $global:W 'SW-2' }
  [void](Invoke-S16Node @('sw2'))
}
$Blocks['up-1'] = { Invoke-S16Row @('up1') 'UP-1' -Front }
$Blocks['up-2'] = { Invoke-S16Row @('up2') -BudgetS 420 }
$Blocks['up-3'] = { Invoke-S16Row @('up3') }
$Blocks['up-4'] = { Invoke-S16Row @('up4') }
$Blocks['up-5'] = {
  Start-S16Actor
  try { [void](Invoke-S16Node @('up5')) } finally { End-S16Actor }
}
$Blocks['up-6b'] = { Invoke-S16Row @('up6b') 'UP-6B' -Front }
$Blocks['up-8'] = { Invoke-S16Row @('up8') }
$Blocks['up-9'] = { Invoke-S16Row @('up9') }
$Blocks['up-patch'] = { Invoke-S16Row @('patch') }
$Blocks['up-twice'] = { Invoke-S16Row @('twice') }
$Blocks['up-raw'] = { Invoke-S16Row @('raw') }
$Blocks['up-nav'] = { Invoke-S16Row @('nav') }
$Blocks['up-devt'] = {
  $O = Use-S16Options
  $X = New-S16Window 'http://127.0.0.1:8081/s11-upload.html?s11=xwin'; $global:X = $X
  [void](Set-S9Foreground $X)
  [void](Invoke-S16Node @('setup', '--only', 'x'))
  [void](Invoke-S16Node @('devt') { Invoke-S11Row 'UP-DEVT' $O $X })
  Close-S11Window $X
  [void](Set-S9Foreground $global:W)
}
$Blocks['up-stale'] = { Invoke-S16Row @('stale') }
$Blocks['up-7j'] = {
  $global:S16Changed = $true; Save-S16
  $O = Use-S16Options
  [void](Invoke-S16Node @('up7j') { Invoke-S11Row 'UP-7J' $O })
}
$Blocks['up-race-a'] = {
  $global:S16Changed = $true; Save-S16
  $O = Use-S16Options
  Step-S16 'front' { Set-S11Front $global:W 'race A' }
  [void](Invoke-S16Node @('race', 'a') { Invoke-S11Race 'A' $global:W $O })
}
$Blocks['up-race-b'] = {
  $global:S16Changed = $true; Save-S16
  $O = Use-S16Options
  Step-S16 'front' { Set-S11Front $global:W 'race B' }
  [void](Invoke-S16Node @('race', 'b') { Invoke-S11Race 'B' $global:W $O })
}
$Blocks['up-restore'] = {
  # The flag is cleared only on success: a failed or thrown restore leaves it set, so the stop procedure never restores twice (MAJOR-1).
  $global:S16InRestore = $true
  $O = Use-S16Options
  Step-S16 'restore' { [void](Set-S9Foreground $global:W); Restore-S11Safety $O $global:W 'UP-RESTORE' }
  $global:S16Changed = $false; $global:S16InRestore = $false; Save-S16
  [void](Invoke-S16Node @('restore-check', '--found', $FoundJson, '--now', $NowJson, '--daemon'))
}
$Blocks['up-logs'] = {
  $cf = Join-Path $env:S11_OUT 'console.txt'; $df = Join-Path $env:S11_OUT 'daemon-slice.txt'
  Step-S16 'console' { Read-S9WorkerConsole $global:D $cf }
  $global:S16ConsoleRead = $true
  $lg = @(Get-Content $DaemonLog -Encoding UTF8 | Select-Object -Skip $global:S16Mark)
  [IO.File]::WriteAllLines($df, [string[]]$lg, $S11Utf8)   # vetted-file-write
  [void](Invoke-S16Node @('scan', '--what', 'console', '--file', $cf))
  [void](Invoke-S16Node @('scan', '--what', 'daemon', '--file', $df))
  [void](Invoke-S16Node @('scan', '--what', 'actors'))
}
$Blocks['teardown'] = {
  if ($global:S16Changed) { Fail-S16 'teardown refused: the safety state is not restored (UP-RESTORE has not passed)' }
  End-S16Actor
  Close-S16Windows
  [void](Invoke-S16Node @('clean'))
  Clear-S11Signals
  Remove-Item -LiteralPath $FoundDir -Recurse -Force -ErrorAction SilentlyContinue
  Stop-S16All
  $global:S16Gone = $true
  Say9 'TEARDOWN done: windows, wave files, servers (own PIDs) ended; globals removed'
}

function Invoke-S16Block([string]$Name) {
  $env:S9_RAW = $Framing; Say9 "BLOCK $Name start"
  Set-S16Raw $Name
  $s0 = $global:S16Stops
  & $Blocks[$Name]
  if ($global:S16Stops -gt $s0) { throw "block $Name printed a STOP" }
  $env:S9_RAW = $Framing; Say9 "BLOCK $Name done"
  Save-S16
}

try {
  Load-S16
  $Name = $Block
  if ($Block -eq 'liveA' -or $Block -eq 'liveB') {
    foreach ($b in $(if ($Block -eq 'liveA') { $SliceA } else { $SliceB })) {
      if (-not (Test-S16Gate $b)) { Invoke-S16Block 'teardown'; exit 3 }
      Invoke-S16Block $b
      if ($Block -eq 'liveB' -and $b -eq 'preflight' -and -not @(Read-S16Early)[-1]) { exit 3 }
    }
    $n = $global:S16Fail; $k = $global:S16NM
    Say9 "SLICE $Name done: s11.ts calls with a failed check $n, not measured $k (the rows are in the record)"
  } else {
    if (-not (Test-S16Gate $Name)) { exit 3 }
    Invoke-S16Block $Name
  }
} catch {
  $tag = $_.Exception.GetType().Name
  Stop-S16Wave "an exception in block $Name ($tag)"
}
exit 0
