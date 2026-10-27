# recipes/s11b-r17.ps1: the block runner of Run 17 (Step 11b S4-helpers H7; docs/e2e-test-plan.md section 4.24). Windows PowerShell 5.1,
# ASCII only. Written 2026-10-27 by builder H7 (Sonnet 5.5) on recipes/s11-r16.ps1's model; NOT run against Chrome, a daemon or a
# port by its author. Pure decisions (block list, slice orders, G11-3 gate, ports, STOP map) are in recipes/s11b-r17-plan.ts and
# tied to this file by recipes/test/s11b-r17-*.test.ts. Helpers: s9-win.ps1, s11-win.ps1, s11b-win.ps1; actors: s9.ts, s11.ts, s11b.ts.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\s11b-r17.ps1 -Block liveA | liveB | plan | <one block>
#
# -Block plan prints both slice orders and runs nothing (the dry run). A slice is longer than the tool's 600 s cap: run it in the
# background. Framing blocks write to r17-framing.txt, rows to the run record (S4-run-record.md in the steps dir).
# STOP procedure (#193, #279): any STOP: line or throw ends the block; after the first state change the safety state is restored and
# read back by count and hash (a stop inside the restore does not restore twice); own windows, actor and servers are ended (own PIDs,
# never chrome.exe); exit 2. Exit: 0 done, 2 STOP, 3 not run (G11-3 gate, or a block that is NOT BUILT yet). A `# STOP-MAP <id>` comment
# marks the line that detects that STOP of the plan's map. Blocks listed in $NotBuilt print NOT BUILT (follow-on builder).
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('liveA', 'liveB', 'plan', 'preflight', 'servers', 'files', 'window', 'reload', 'console', 'teardown', 'history', 'g1-open', 'g1-close', 'root-add', 'rd0', 'r17-up-l1', 'rd-ctl', 'f-filetab', 'f-home', 'rd-caps-warn', 'rd-regex', 'rd1', 'rd6', 'rd2', 'rd3', 'rd-dl-err', 'rd-dl-hop', 'rd7', 'rd8', 'rd-back', 'rd-fwd', 'rd-back-samedoc', 'rd-rebuild-narrow', 'rd-disarm', 'rd4', 'rd5', 'rd5b', 'rd-back-empty', 'rd-dl-socket', 'r17-up-opt', 'r17-up-6', 'r17-up-7', 'r17-save-refuse', 'f-raw', 'f-raw-2', 'f-raw-dir', 'f-raw-enc', 'f-raw-ok', 'r17-up-race-a', 'r17-up-devt', 'rd-restore', 'rd-logs')]
  [string]$Block
)
$ErrorActionPreference = 'Continue'
$Repo = Split-Path -Parent $PSScriptRoot
Set-Location $Repo
$env:Path = "$env:LOCALAPPDATA\Author Software\nvm\.nodejs;$env:Path"
[Console]::OutputEncoding = [Text.Encoding]::UTF8
# Tied to recipes/s11b-r17-plan.ts by recipes/test/s11b-r17-static.test.ts.
$FramingBlocks = @('preflight', 'servers', 'files', 'window', 'reload', 'console', 'teardown')
$SliceA = @('preflight', 'servers', 'files', 'window', 'reload', 'console', 'rd0', 'r17-up-l1', 'rd-ctl', 'f-filetab', 'f-home', 'rd-caps-warn', 'rd-regex', 'history', 'g1-open', 'rd1', 'rd6', 'rd2', 'rd3', 'rd-dl-err', 'rd-dl-hop', 'rd7', 'rd8', 'rd-back', 'rd-fwd', 'rd-back-samedoc', 'rd-rebuild-narrow', 'rd-disarm', 'g1-close', 'rd4', 'rd5', 'rd5b', 'rd-back-empty', 'rd-dl-socket', 'r17-up-opt', 'r17-up-6', 'r17-up-7', 'r17-save-refuse', 'rd-restore', 'rd-logs', 'teardown')
$SliceB = @('preflight', 'servers', 'files', 'window', 'reload', 'console', 'rd0', 'root-add', 'f-raw', 'f-raw-2', 'f-raw-dir', 'f-raw-enc', 'f-raw-ok', 'r17-up-race-a', 'r17-up-devt', 'rd-restore', 'rd-logs', 'teardown')
$NeedsAccess = @('root-add', 'f-raw', 'f-raw-2', 'f-raw-dir', 'f-raw-enc', 'f-raw-ok', 'r17-up-race-a', 'r17-up-devt')
$NotBuilt = @()
if ($Block -eq 'plan') { $ids = $SliceA -join ' '; Write-Host "PLAN liveA: $ids"; $ids = $SliceB -join ' '; Write-Host "PLAN liveB: $ids"; $ids = $NotBuilt -join ' '; Write-Host "PLAN not built: $ids"; exit 0 }
if (-not $env:S11_OUT) { $env:S11_OUT = Join-Path $env:TEMP 'bridge-e2e\s11b' }
New-Item -ItemType Directory -Force $env:S11_OUT | Out-Null
$env:S9_OUT = $env:S11_OUT
$env:S9_ACTORS = Join-Path $env:S11_OUT 'actors'
$Steps = 'docs/plans/2026-10-26-step11b-block-list-redirects-steps'
$Record = Join-Path $Repo "$Steps/S4-run-record.md"
$Framing = Join-Path $env:S11_OUT 'r17-framing.txt'
$GlobalsFile = Join-Path $env:S11_OUT 'r17-globals.clixml'
$FoundDir = Join-Path $env:S11_OUT 'found'
$LogDir = Join-Path $env:S11_OUT 'logs'
$Root = Join-Path $env:S11_OUT 'wave\root'
$FoundJson = Join-Path $env:S11_OUT 'found.json'
$NowJson = Join-Path $env:S11_OUT 'now.json'
$DaemonLog = "$HOME\.chrome-agent-bridge\daemon.log"
$FixtureHuman = 'http://127.0.0.1:8081/s11-upload.html?s11=human'
$Fix81 = 'http://127.0.0.1:8081/e2e-playground.html'
$Blk = 'localhost:8085'
$EncName = 's11b enc #%' + [char]0x00FC + '.bin'
$Persist = @('W', 'O', 'E', 'D', 'X', 'S9WinIds', 'S11Own', 'S11Found', 'S11RootText', 'S11Stable', 'S16Changed', 'S16Pids', 'S16Born', 'S16Toggle', 'S16Mark', 'S16Actor', 'S16ConsoleRead', 'R17Fallback', 'R17CapsDone', 'R17ErrMs', 'R17HopMs', 'R17Rd3Ms', 'R17SockRan', 'R17SockLog0', 'R17SockLog1', 'R17ActorRan')
. "$PSScriptRoot\s9-win.ps1"
. "$PSScriptRoot\s11-win.ps1"
. "$PSScriptRoot\s11b-win.ps1"
$global:S9PinUiaOnly = $true                      # never pin or unpin by mouse in this wave
$global:S16Stops = 0; $global:S16Fail = 0; $global:S16NM = 0; $global:S16Gone = $false; $global:S16InRestore = $false; $global:R17NB = 0

# ---- output: ONE printing site; every helper line funnels through it (profile folder masked, STOP lines counted) ------------
function Show-S16([string[]]$Lines) {
  foreach ($t in $Lines) {
    if ($t -match '^STOP:') { $global:S16Stops++ }
    $m = $t.Replace($env:USERPROFILE, '<PROFILE>').Replace($env:USERPROFILE.Replace('\', '/'), '<PROFILE>'); Write-Host $m; Write-S9Raw $m   # vetted-node-output
  }
}
function Say9([string]$Msg) { Show-S16 @(('{0:yyyy-MM-ddTHH:mm:ss.fffZ} s9-win: {1}' -f [DateTime]::UtcNow, $Msg)) }
function Stop9([string]$Why) { Show-S16 @("STOP: $Why (at $(Now9))") }
function Fail-S16([string]$Why) { Stop9 $Why; throw 'stop' }
function Set-S16Raw([string]$Name) { $env:S9_RAW = if ($FramingBlocks -contains $Name -or $Name -like 'g1-*' -or $Name -eq 'history' -or $Name -eq 'root-add') { $Framing } else { $Record } }
# The one file-write site: wave files (fixtures made by the runner) and the daemon-log slice RD-LOGS scans. Never a user text.
function Write-R17File([string]$Path, [string[]]$Lines) { [IO.File]::WriteAllLines($Path, $Lines, $S11Utf8) }   # vetted-file-write

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
  $ta = @(if ($Name -like 'srv*') { '/T', '/F' } else { '/F' })
  if ($pr -and $pr.StartTime.Ticks -eq $global:S16Born[$Name]) { & taskkill @ta /PID $Id | Out-Null; Say9 "stopped own process $Name" }
  $global:S16Pids.Remove($Name); $global:S16Born.Remove($Name)
}
function Stop-S16All { foreach ($Name in @($global:S16Pids.Keys)) { Stop-S16Pid $Name } }

# Port rule (#251, #273): a port is free or held by the wave's own server (or its cmd parent); 9234 free or the daemon; 8090 never held.
function Test-S16Port([int]$Port) {
  $ok = $true
  foreach ($c in @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)) {
    $cp = Get-CimInstance Win32_Process -Filter "ProcessId=$($c.OwningProcess)"
    $own = ($global:S16Pids.Values -contains [int]$c.OwningProcess) -or ($cp -and ($global:S16Pids.Values -contains [int]$cp.ParentProcessId))
    $dm = [bool]($cp -and $cp.CommandLine -match 'daemon[\\/]dist[\\/]index\.js')
    if (-not $(if ($Port -eq 9234) { $dm } elseif ($Port -eq 8090) { $false } else { $own })) { $ok = $false }
  }
  $ok
}

# ---- running s9.ts / s11.ts / s11b.ts beside the driver's signals --------------------------------------------------------------
# Exit codes of all three: 0 pass, 1 a check failed (recorded), 2 STOP, 3 not measured. -StopOnFail makes a 1 a STOP (row-level STOPs).
function Invoke-R17Node([string]$Which, [string[]]$NodeArgs, [scriptblock]$Driver = $null, [int]$BudgetS = 300, [switch]$StopOnFail) {
  $Name = "$Which $($NodeArgs[0])"
  $of = Join-Path $env:S11_OUT 'node-out.txt'; $ef = Join-Path $env:S11_OUT 'node-err.txt'
  Remove-Item -LiteralPath $of, $ef -Force -ErrorAction SilentlyContinue
  if ($Driver) { Clear-S11Signals }
  $s0 = $global:S16Stops
  $q = @($NodeArgs | ForEach-Object { if ($_ -match '\s') { '"' + $_ + '"' } else { $_ } })
  $p = Start-Process -FilePath node -ArgumentList (@('--import', 'tsx', "recipes\$Which.ts") + $q) -WorkingDirectory $Repo -NoNewWindow -PassThru -RedirectStandardOutput $of -RedirectStandardError $ef
  $null = $p.Handle
  Set-S16Pid 'node' $p.Id
  $tag = ''; $res = @()
  if ($Driver) { try { $res = @(& $Driver) } catch { $tag = Get-S11bStopCause $_ } }
  if ($tag -and -not $p.HasExited) { Stop-S16Pid 'node' }
  $done = $p.WaitForExit($BudgetS * 1000)
  if (-not $done) { Stop-S16Pid 'node' }
  $out = if (Test-Path $of) { @(Get-Content $of -Encoding UTF8) } else { @() }
  Show-S16 $out
  $global:R17Out = $out
  $n = if ($done) { $p.ExitCode } else { -1 }
  $global:S16Pids.Remove('node'); $global:S16Born.Remove('node')
  if ($tag) { throw "the driver of $Name threw $tag" }
  if (-not $done) { throw "node $Name exceeded its budget" }
  if ($res -contains $false) { throw "the driver of $Name stopped" }
  if ($n -eq 2 -or $global:S16Stops -gt $s0) { throw "node $Name ended in a STOP" }
  # S4-live fixer 2: s9.ts prints every ROW/CHECK line after an ISO time (its `say`); s11.ts and s11b.ts print them bare.
  if ($n -eq 1 -and -not @($out | Where-Object { $_ -match '^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z )?(ROW|CHECK) ' }).Count) { throw "node $Name exited 1 with no ROW or CHECK line (a crash, see node-err.txt)" }
  if ($n -eq 1 -and $StopOnFail) { Stop9 "node $Name failed where a failure is a row-level STOP"; throw 'stop' }
  if ($n -eq 1) { $global:S16Fail++ } elseif ($n -eq 3) { $global:S16NM++ } elseif ($n -ne 0) { throw "node $Name exited $n" }
  if ($Which -eq 's11' -and $NodeArgs[0] -in 'make', 'setup', 'found') { Sync-R17State }
  $n
}
# S4-live fixer 2: s11.ts writes the shared state.json (make, setup, found) in its own shape, without the `opened` list s9.ts's
# noteOpened reads; B17 state-compat adds only the missing keys and never removes one. The caller's R17Out is kept.
function Sync-R17State { $keep = $global:R17Out; try { [void](Invoke-R17Node 's11b' @('state-compat')) } finally { $global:R17Out = $keep } }
# S9 call <ROW> <step> <op> <args> --expect <E>
function Call9([string]$Row, [string]$Step, [string]$Op, [string[]]$A, [string]$Expect, [switch]$StopOnFail) {
  Invoke-R17Node 's9' (@('call', $Row, $Step, $Op) + $A + @('--expect', $Expect)) -StopOnFail:$StopOnFail
}
function New-R17Tab([string]$Row, [string]$Key, [string]$Tag) { [void](Call9 $Row "setup-$Key" 'newtab' @("$Fix81`?s11b=$Tag", '--as', $Key) 'ok') }
function Close-R17Tab([string]$Row, [string]$Key) { [void](Call9 $Row "close-$Key" 'close' @($Key) 'record') }
# B17 hits: HITS <tag> redirect=<n> blocked=<n> (redirector's log, then 8085's); -Single reads only the redirector's log; -BlockedOnly prints `HITS <tag> blocked=<n>` from 8085's.
function Get-R17Hits([string]$Tag, [int]$Port = 8083, [switch]$Single, [switch]$Flip, [switch]$BlockedOnly) {
  $l = Join-Path $LogDir "p$Port.txt"
  $log = if ($BlockedOnly) { Join-Path $LogDir 'p8085.txt' } elseif ($Single) { $l } else { "$l,$(Join-Path $LogDir 'p8085.txt')" }
  $a = @('hits', '--log', $log, '--tag', $Tag)
  if ($BlockedOnly) { $a += @('--only', 'blocked') }   # n2: the sheet's `HITS <tag> blocked=<n>` form
  if ($Flip) { $a += @('--flip', (Join-Path $LogDir 'p8091.txt')) }
  [void](Invoke-R17Node 's11b' $a)
  $t = $global:R17Out -join "`n"
  $b = [regex]::Match($t, 'blocked=(\d+)'); $r = [regex]::Match($t, 'redirect=(\d+)')
  [pscustomobject]@{ Blocked = $(if ($b.Success) { [int]$b.Groups[1].Value } else { -1 }); Redirect = $(if ($r.Success) { [int]$r.Groups[1].Value } else { -1 }) }
}
# RULES read through the worker console: 0 after a reply. FALLBACK (no console eval): NOT MEASURED, never a STOP.
function Read-R17Rules {
  $global:R17RulesOk = $false
  if ($global:R17Fallback) { Say9 'RULES NOT MEASURED (console eval unavailable: RD-0 FALLBACK)'; return }
  $c = Invoke-S11bConsoleEval $global:D 'rules' @() @('--expect', '0')
  if ($c -eq 10) { $global:R17Fallback = $true; Say9 'RULES NOT MEASURED (FALLBACK)'; return }
  if ($c -eq 3) { $global:S16NM++; return }
  if ($c -ne 0) { Stop9 'RULES is not 0 after a reply, or the read printed a STOP'; throw 'stop' }   # STOP-MAP rules-stuck # STOP-MAP stuck-socket
  $global:R17RulesOk = $true
}
# ---- H8: rows with a call in flight, the typed-lines rows and the history rows ---------------------------------------------------
# A row's verdict from the exit codes of its clause checks (0 pass, 1 fail, 2 STOP, 3 not measured or not discriminating).
# A STOP ends the wave through the stop procedure. NOT MEASURED never counts as a pass.
function Write-R17Row([string]$Row, [int[]]$Codes) {
  $Kind = if ($Codes -contains 2) { 'STOP' } elseif ($Codes -contains 1) { 'FAIL' } elseif ($Codes -contains 3) { 'NOT MEASURED' } else { 'PASS' }
  $n = $Codes.Count
  Say9 "ROW $Row $Kind (by $n clause checks)"
  if ($Kind -eq 'STOP') { Stop9 "row ${Row}: a row-level STOP"; throw 'stop' }
}
# A node child that runs beside the driver (the call that waits for RD-5's go signal, the RD-DL-SOCKET sampler). Recorded as an own PID.
function Start-R17Bg([string[]]$NodeArgs, [string]$PidName) {
  $of = Join-Path $env:S11_OUT "$PidName-out.txt"; $ef = Join-Path $env:S11_OUT "$PidName-err.txt"
  Remove-Item -LiteralPath $of, $ef -Force -ErrorAction SilentlyContinue
  $q = @($NodeArgs | ForEach-Object { if ($_ -match '\s') { '"' + $_ + '"' } else { $_ } })
  $p = Start-Process -FilePath node -ArgumentList (@('--import', 'tsx', 'recipes\s11b.ts') + $q) -WorkingDirectory $Repo -NoNewWindow -PassThru -RedirectStandardOutput $of -RedirectStandardError $ef
  $null = $p.Handle
  Set-S16Pid $PidName $p.Id
  [pscustomobject]@{ P = $p; Of = $of; Name = $PidName }
}
function Wait-R17Bg($Bg, [int]$BudgetS = 120) {
  $done = $Bg.P.WaitForExit($BudgetS * 1000)
  if (-not $done) { Stop-S16Pid $Bg.Name }
  $out = if (Test-Path $Bg.Of) { @(Get-Content $Bg.Of -Encoding UTF8) } else { @() }
  Show-S16 $out
  $global:R17Out = $out
  $n = if ($done) { $Bg.P.ExitCode } else { -1 }
  $global:S16Pids.Remove($Bg.Name); $global:S16Born.Remove($Bg.Name)
  if (-not $done) { throw 'a background node exceeded its budget' }
  if ($n -eq 2) { throw 'a background node ended in a STOP' }
  if ($n -eq 1) { $global:S16Fail++ } elseif ($n -eq 3) { $global:S16NM++ } elseif ($n -ne 0) { throw "background node exited $n" }
  $n
}
# N = countRules(found + BLK).rules, printed by `B17 rules --expect-from` as `RULES expect=<N>`; returned as text.
function Get-R17Expect {
  [void](Invoke-R17Node 's11b' @('rules', '--expect-from', (Join-Path $FoundDir 'found-blocklist.txt')))
  $m = [regex]::Match(($global:R17Out -join "`n"), 'RULES expect=(\d+)')
  if (-not $m.Success) { throw 'no RULES expect line' }
  $m.Groups[1].Value
}
# One call in flight (B17 call writes <Sig>.ready just before it sends) beside a timed RULES sampler in the worker console; $Driver acts
# at offsets from the ready signal. Returns the clause exit codes: the call's, then the sampler read's (3 without a console).
function Invoke-R17Flight([string]$Row, [string]$Sig, [string[]]$CallArgs, [scriptblock]$Driver, [string]$Mode, [string[]]$ReadExtra = @()) {
  $codes = @(); $s = $null
  if (-not $global:R17Fallback) {
    $s = Start-S11bConsoleEval $global:D 'rules' @('--sample', '100', '--for', '10000', '--mode', $Mode)
    if ($s.Code -eq 10) { $global:R17Fallback = $true; $s = $null }
    elseif ($null -ne $s.Code) { Stop9 "${Row}: the RULES sampler could not be built (a STOP or a pattern)"; throw 'stop' }
  }
  $codes += [int](Invoke-R17Node 's11b' (@('call', '--row', $Row, '--signal', $Sig) + $CallArgs) $Driver)
  $m = [regex]::Match(($global:R17Out -join "`n"), 'CALLT \S+ start=(\d+) reply=(\d+)')
  if ($s -and $m.Success) { $codes += [int](Complete-S11bConsoleEval $s (@('--mode', $Mode, '--row', $Row, '--send', $m.Groups[1].Value, '--reply', $m.Groups[2].Value) + $ReadExtra) -TimeoutMs 16000) }
  else { Say9 "$Row RULES samples NOT MEASURED (no console eval, or no call times)"; $codes += 3 }
  $codes
}
# A hit clause from a tag's counts: redirect 1 and blocked 0 (RD-5, RD-5b, RD-DISARM).
function Get-R17HitCode([string]$Tag, [int]$Port = 8083) {
  $h = Get-R17Hits $Tag $Port
  if ($h.Redirect -eq 1 -and $h.Blocked -eq 0) { 0 } else { 1 }
}
function Invoke-R17Judge([string]$Kind, [string]$File) {
  $c = [int](Invoke-R17Node 's11b' @('judge-opt', '--kind', $Kind, '--obs', $File))
  Remove-Item -LiteralPath $File -Force -ErrorAction SilentlyContinue
  $c
}
# RD-CAPS-WARN's read-only typing; also RD-0 (a-prime) when the console cannot evaluate.
function Invoke-R17CapsWarn([switch]$First) {
  if ($First) { $env:S9_RAW = $Framing }   # RD-0 (a-prime): only the judged ROW is the record's first line
  try { $f = @(Get-S11bCapsObs (Use-S16Options))[-1] } finally { if ($First) { $env:S9_RAW = $Record } }
  if (-not $f) { Say9 'ROW RD-CAPS-WARN NOT MEASURED: the caps list is not in the UIA tree and no K-caps item was read by text'; $global:S16NM++ } else { [void](Invoke-R17Judge 'caps' $f) }
  $global:R17CapsDone = $true; Save-S16
}
# RD-BACK, RD-FWD, RD-BACK-SAMEDOC, RD-BACK-EMPTY: the call, then the measured values (hits, flip count, RULES) to the judge.
function Invoke-R17History([string]$Row, [string]$Op, [string]$Tab, [string]$Tag = '', [int]$Times = 1, [switch]$RulesZero, [switch]$StopOnFail) {
  $a = @($Op, '--row', $Row, '--tab', $Tab)
  if ($Times -gt 1) { $a += @('--times', "$Times") }
  $n = [int](Invoke-R17Node 's11b' $a)
  $m = [regex]::Match(($global:R17Out -join "`n"), 'HISTREPLY \S+ kind=(\S+) ms=(\d+) start=(\d+) reply=(\d+)')
  $global:R17Hist = $m
  if (-not $m.Success) { if ($n -eq 1) { return }; throw "no HISTREPLY line for $Row" }
  $j = @('judge-history', '--row', $Row, '--answer', $m.Groups[1].Value, '--ms', $m.Groups[2].Value)
  if ($Tag) {
    $h = Get-R17Hits $Tag -BlockedOnly -Flip
    $t = [regex]::Match(($global:R17Out -join "`n"), 'total=(\d+)')
    if ($h.Blocked -ge 0 -and $t.Success) { $j += @('--blocked', "$($h.Blocked)", '--flip-total', $t.Groups[1].Value) }
  }
  if (-not $RulesZero) { Read-R17Rules }
  if ($RulesZero -or $global:R17RulesOk) { $j += @('--rules-after', '0') }
  [void](Invoke-R17Node 's11b' $j -StopOnFail:$StopOnFail)
}

# The sheet's STOP "a tracked file changed outside the steps dir": checked at the preflight and again at the end of RD-LOGS, before the record is committed (m4).
function Assert-R17TreeClean {
  $d = @(git status --porcelain --untracked-files=no -- . ":(exclude)$Steps"); $count = $d.Count
  if ($count -gt 0) { Fail-S16 "the tracked tree is not clean outside the steps dir ($count path(s))" }   # STOP-MAP tree-dirty
}
# R17-UP-7 (b)'s alias, from the state.json `S11 make` wrote; passed to B17 scan by argument and never printed. '' when unknown (the scan then says NOT MEASURED).
function Get-R17Alias {
  $f = Join-Path $env:S11_OUT 'state.json'
  if (-not (Test-Path -LiteralPath $f)) { return '' }
  try { $j = Get-Content -LiteralPath $f -Raw -Encoding UTF8 | ConvertFrom-Json; [string]$j.alias } catch { '' }
}
# The last S9 call's output (R17Out) to a file outside the repo, for `B17 judge-row`; returns the file's path.
function Save-R17Call {
  $f = Join-Path $env:S11_OUT 'call-out.txt'
  Write-R17File $f ([string[]]$global:R17Out)
  $f
}
# The ms a B17 `LAT <name> <ms> ms` line (the last node output) printed; -1 when there is none.
function Get-R17LatMs {
  $m = [regex]::Match(($global:R17Out -join "`n"), 'LAT \S+ (\d+) ms')
  if ($m.Success) { [long]$m.Groups[1].Value } else { -1 }
}
# B17 judge-row over the last S9 call's own ROW line: -Kind lat|dl-err|dl-hop|filepage|fileurl|tabs-hidden. Returns B17's exit code.
function Invoke-R17Row([string]$Row, [string]$Step, [string]$Kind, [string]$Lat = '', [string[]]$More = @()) {
  $f = Save-R17Call
  $a = @('judge-row', '--row', $Row, '--from', $f, '--step', $Step, '--as', $Kind)
  if ($Lat) { $a += @('--lat', $Lat) }
  $c = [int](Invoke-R17Node 's11b' ($a + $More))
  Remove-Item -LiteralPath $f -Force -ErrorAction SilentlyContinue
  $c
}

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
function Start-S16Actor { [void](Invoke-R17Node 's11' @('actor-start')); $global:S16Actor = $true; Save-S16 }
function End-S16Actor { if ($global:S16Actor) { $global:S16Actor = $false; [void](Invoke-R17Node 's11' @('actor-end')) } }
# A stop before RD-LOGS must not lose the worker console: whatever closes the windows first saves the capture to console.txt.
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
# G11-3 (#245): a block that needs file access runs only when RD-0 / the early read saw the toggle on.
function Test-S16Gate([string]$Name) {
  if (($NeedsAccess -contains $Name) -and $global:S16Toggle -ne 'on') {
    Say9 "GATE block $Name refused: the file-URL toggle did not read on (G11-3); its rows stay NOT RUN"
    return $false
  }
  $true
}
# liveB only: the toggle is read right after the preflight (read only, nothing pressed). OFF: the seven rows are written NOT RUN.
function Read-S16Early {
  $E2 = New-S16Window "chrome://extensions/?id=$S9Id"
  try { $reading = @(Read-S11FileAccess $E2)[-1] } finally { Close-S11Window $E2 }
  if ($reading -notin 'on', 'off') { Fail-S16 'the file-URL toggle is unreadable; nothing changed' }   # STOP-MAP toggle-unreadable
  $global:S16Toggle = $reading
  if ($reading -ne 'on') {
    $env:S9_RAW = $Record
    foreach ($Row in 'F-RAW', 'F-RAW-2', 'F-RAW-DIR', 'F-RAW-ENC', 'F-RAW-OK', 'R17-UP-RACE-A', 'R17-UP-DEVT') { Say9 "ROW $Row NOT RUN - waits for G11-3" }
    Say9 'GATE liveB refused before any state change: the file-URL toggle reads off (G11-3)'
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
    try { $O = Use-S16Options; $okr = (@(Restore-S11Safety $O $global:W 'RD-RESTORE')[-1] -eq $true) } catch { $threw = $true }
    if ($threw -or -not $okr -or $global:S16Stops -gt $s0) { Stop9 'the restore failed or printed a STOP during the stop procedure; the wave is over' }
  } elseif ($global:S16Changed) { Say9 'the stop met the restore itself; no second restore' }
  try { End-S16Actor } catch { }
  try { Close-S16Windows } catch { }
  Stop-S16All
  Stop9 "the wave ended ($Why)"
  Save-S16
  exit 2
}

# ---- servers ---------------------------------------------------------------------------------------------------------------------
function Start-R17Srv([int]$Port, [string]$PyArgs) {
  $py = (Get-Command python).Source
  $log = Join-Path $LogDir "p$Port.txt"
  $cl = '/c ""' + $py + '" -u ' + $PyArgs + ' > "' + $log + '" 2>&1"'
  $p = Start-Process -FilePath cmd -ArgumentList $cl -WorkingDirectory $Repo -WindowStyle Hidden -PassThru
  Set-S16Pid "srv$Port" $p.Id
}
function Test-R17Listens([int]$Port) {
  $t0 = Get-Date
  while (((Get-Date) - $t0).TotalSeconds -lt 15) {
    $c = New-Object Net.Sockets.TcpClient
    try { $c.Connect('127.0.0.1', $Port); $c.Close(); return $true } catch { Start-Sleep -Milliseconds 300 } finally { $c.Close() }
  }
  $false
}

# ---- the blocks --------------------------------------------------------------------------------------------------------------
$Blocks = @{}
$Blocks['preflight'] = {
  if (Test-Path $GlobalsFile) { Fail-S16 'a previous wave''s globals exist; run -Block teardown first' }
  Assert-R17TreeClean
  foreach ($f in 'daemon\dist\index.js', 'mcp\dist\index.js', 'extension\dist\sw.js') { if (-not (Test-Path $f)) { Fail-S16 'a dist file is missing; run npm run build first' } }
  if (-not (Get-Process chrome -ErrorAction SilentlyContinue)) { Fail-S16 'Chrome is not running (it is never launched here)' }
  if (-not (Get-Command python -ErrorAction SilentlyContinue)) { Fail-S16 'python was not found' }
  foreach ($k in 8081, 8083, 8085, 8086, 8087, 8088, 8089, 8090, 8091, 9234) { if (-not (Test-S16Port $k)) { Fail-S16 "port $k is held by a program the wave did not start (#251)" } }   # STOP-MAP port-foreign
  New-Item -ItemType Directory -Force $LogDir | Out-Null
  $mk = @(Get-Content $DaemonLog -ErrorAction SilentlyContinue); $global:S16Mark = $mk.Count
  Say9 "PREFLIGHT ok: head $(git rev-parse --short HEAD), tree clean, ports 8081 8083 8085-8089 8091 free, 8090 unbound, 9234 free or the daemon's"
}
$Blocks['servers'] = {
  New-Item -ItemType Directory -Force $LogDir | Out-Null
  $ext = $S9Id
  Start-R17Srv 8081 '-m http.server 8081 --bind 127.0.0.1 --directory test-fixtures'
  Start-R17Srv 8083 '-I recipes/s9-redirect.py 8083 http://localhost:8085'
  Start-R17Srv 8085 '-m http.server 8085 --bind 127.0.0.1 --directory test-fixtures'
  Start-R17Srv 8086 '-I recipes/s11b-delay.py 8086 4 http://localhost:8085'
  Start-R17Srv 8087 '-I recipes/s11b-slow.py 8087 3 test-fixtures'
  Start-R17Srv 8088 "-I recipes/s9-redirect.py 8088 chrome-extension://$ext"
  Start-R17Srv 8089 '-I recipes/s9-redirect.py 8089 file://'
  Start-R17Srv 8091 '-I recipes/s11b-flip.py 8091 http://localhost:8085'
  foreach ($k in 8081, 8083, 8085, 8086, 8087, 8088, 8089, 8091) {
    if (-not (Test-R17Listens $k)) { Fail-S16 "the fixture server on $k did not answer" }
    if (-not (Test-S16Port $k)) { Fail-S16 "port $k is not held by the wave's own server" }   # STOP-MAP port-foreign
  }
  if (-not (Test-S16Port 8090)) { Fail-S16 'port 8090 (the closed port) is bound' }
  Say9 'SERVERS 8081 8083 8085 8086 8087 8088 8089 8091 up on 127.0.0.1 under the wave''s own PIDs; 8090 unbound; 8080 unused'
}
$Blocks['files'] = {
  [void](Invoke-R17Node 's11' @('make'))
  Write-R17File (Join-Path $Root 's11b-file.html') @('<!doctype html><title>S11 file fixture</title><p>S11b file fixture</p>')
  Write-R17File (Join-Path $Root 's11b-file.txt') @('s11b file fixture')
  Write-R17File (Join-Path $Root $EncName) @('s11b enc fixture')
  New-Item -ItemType Directory -Force (Join-Path $Root 's11b-dir') | Out-Null
  Say9 'FILES wave files made: <ROOT>\s11b-file.html, s11b-file.txt, s11b-dir, the encoded-name file'
}
$Blocks['window'] = {
  $global:W = New-S16Window $FixtureHuman
  $W = $global:W
  if (-not (@(Get-S10PinState $W -Quiet)[-1])) { Fail-S16 'the toolbar button is not pinned (human gate); nothing was clicked' }   # STOP-MAP unpinned
  Say9 "WINDOW W is $W; the toolbar button is pinned"
}
$Blocks['console'] = {
  $global:E = [long](@(Open-S9ChromePage 'chrome://extensions')[-1])
  $global:D = [long](@(Open-S9WorkerConsole $global:E)[-1])
  [void](Set-S9Foreground $global:W)
  Say9 'CONSOLE the worker console window is open (capture runs to RD-LOGS)'
}
$Blocks['reload'] = {
  foreach ($k in 1, 2) {
    $o = @(powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\reload-extension.ps1); $n = $LASTEXITCODE
    Show-S16 ([string[]]$o)
    Say9 "reload-extension.ps1 exit $n (attempt $k)"
    if ($n -ne 2) { break }
  }
  if ($n -ne 0) { Fail-S16 "the reload script exited $n after one re-run on exit 2" }
  [void](Set-S9Foreground $global:W)
  # m6: only the tabs the Run 17 blocks use (R17-UP-L1 l1, R17-UP-6 u6, R17-UP-7 j7 and a7, R17-SAVE-REFUSE sv, F-RAW* raw, race A ra). Not u8 (localhost:8084 is served by nothing here).
  [void](Invoke-R17Node 's11' @('setup', '--only', 'l1,u6,j7,a7,sv,raw,ra'))
}
$Blocks['rd0'] = {
  if ($global:S16Changed) { Fail-S16 'RD-0 after a state change would overwrite the found texts; refused' }
  # (a) FIRST (D4.2: the first line of the record proves): read-only, needs only the console. Only its MANIFEST line and its ROW reach the
  # record; the eval's own EXPR and CONSOLE lines, the toggle read and the found-state chatter go to the framing file (M1).
  $env:S9_RAW = $Framing; $global:S11bRecordFile = $Record
  try { $c = Invoke-S11bConsoleEval $global:D 'manifest' } finally { $global:S11bRecordFile = $null; Set-S16Raw 'rd0' }
  if ($c -eq 10) {
    $global:R17Fallback = $true
    $env:S9_RAW = $Framing; Say9 'RD-0 FALLBACK: console eval unavailable; RD-0 (a-prime) follows: RD-CAPS-WARN runs first, RULES clauses are NOT MEASURED'; Set-S16Raw 'rd0'
  } elseif ($c -eq 2) { Stop9 'RD-0 (a): the console read printed a STOP'; throw 'stop' }
  elseif ($c -ne 0) { $global:S16Fail++ }
  if (-not $global:R17Fallback) { Read-R17Rules }   # (b)
  # (c) the file-URL toggle (read only) and the found state; the chatter of both stays in the framing file, the sheet's STATE and TOGGLE lines come from B17 state
  $env:S9_RAW = $Framing
  try {
    $E2 = New-S16Window "chrome://extensions/?id=$S9Id"
    $reading = @(Read-S11FileAccess $E2)[-1]
    Close-S11Window $E2
    if ($reading -notin 'on', 'off') { Fail-S16 'the file-URL toggle is unreadable; nothing changed' }   # STOP-MAP toggle-unreadable
    $global:S16Toggle = $reading
    Step-S16 'found' { Save-S11Found (Use-S16Options) $FoundDir $reading }   # STOP-MAP found-unarmed
    [void](Invoke-R17Node 's11' @('found', '--file', $FoundJson))
  } finally { Set-S16Raw 'rd0' }
  if ($global:R17Fallback) { Invoke-R17CapsWarn -First }   # (a-prime): the record's first line in place of (a) and (b)
  [void](Invoke-R17Node 's11b' @('state', '--found', $FoundJson, '--folders', (Join-Path $FoundDir 'found-uploadfolders.txt')) -StopOnFail)
  [void](Invoke-R17Node 's11b' @('foundlist', '--file', (Join-Path $FoundDir 'found-blocklist.txt')) -StopOnFail)   # STOP-MAP found-blocks
}
$Blocks['r17-up-l1'] = {
  [void](Invoke-R17Node 's11' @('foundcheck', '--text-file', (Join-Path $FoundDir 'found-uploadfolders.txt')) -StopOnFail)   # STOP-MAP l1-allowed
  [void](Invoke-R17Node 's11' @('l1'))
}
$Blocks['rd-ctl'] = { [void](Invoke-R17Node 's11b' @('ctl', '--log85', (Join-Path $LogDir 'p8085.txt')) -StopOnFail) }   # STOP-MAP ctl-missed
$Blocks['f-filetab'] = {
  if (Test-S11Own $global:O) {
    Close-S11Window $global:O; $global:O = 0; Save-S16
    Say9 "F-FILETAB closed the wave's options window O before the file window (own page is hidden as blocked)"
  }
  $FW = [long](@(Open-S11bFileWindow $Root (Join-Path $Root 's11b-file.html'))[-1])
  if ($FW -le 0) { throw 'no file window' }
  Start-Sleep -Seconds 2
  [void](Call9 'F-FILETAB' 'tabs' 'tabs' @() 'record')
  [void](Invoke-R17Row 'F-FILETAB tabs' 'tabs' 'tabs-hidden')
  [void](Invoke-R17Node 's11b' @('filetab'))   # m3-2 (fixer 3): the SDK's own rows judge the one hidden row: hidden=blocked, no url, no title (labels only)
  [void](Call9 'F-FILETAB' 'snap' 'snapshot' @('blocked1') 'record')
  [void](Invoke-R17Row 'F-FILETAB snapshot' 'snap' 'filepage')
  [void](Call9 'F-FILETAB' 'nav' 'navigate' @('blocked1', $Fix81) 'record')
  [void](Invoke-R17Row 'F-FILETAB navigate' 'nav' 'filepage')
  [void](Call9 'F-FILETAB' 'tabs2' 'tabs' @() 'record')
  [void](Invoke-R17Row 'F-FILETAB untouched' 'tabs2' 'tabs-hidden')
  # the control: a fixture tab navigated to the wave-made file: URL (K-fileurl); the URL is an argument, never printed
  New-R17Tab 'F-FILETAB' 'ft' 'ftp'
  [void](Call9 'F-FILETAB' 'ctl' 'navigate' @('ft', ([Uri](Join-Path $Root 's11b-file.html')).AbsoluteUri) 'record')
  [void](Invoke-R17Row 'F-FILETAB control' 'ctl' 'fileurl')
  Close-R17Tab 'F-FILETAB' 'ft'
  Say9 'RECORD F-FILETAB tabCreated url-empty=NOT MEASURED (tab events reach the daemon only; no client call and no log line carries them)'
  $global:S16NM++
  Close-S11Window $FW
}
$Blocks['rd-regex'] = {
  $c = Invoke-S11bConsoleEval $global:D 'regex'
  if ($c -eq 2) { Stop9 'RD-REGEX: the console input holds a pattern or the read printed a STOP'; throw 'stop' }   # STOP-MAP console-input
  if ($c -eq 10) { Say9 'RD-REGEX FALLBACK: NOT MEASURED' } elseif ($c -eq 3) { $global:S16NM++ }
}
$Blocks['history'] = {
  New-R17Tab 'HIST' 'hb' 'hb'; New-R17Tab 'HIST' 'hf' 'hf'   # m6: keys that no S11 key (rb is race B's alias tab) can collide with in the shared state.json
  [void](Invoke-R17Node 's11b' @('history', '--kind', 'back', '--tab', 'hb'))
  [void](Invoke-R17Node 's11b' @('history', '--kind', 'fwd', '--tab', 'hf'))
}
$Blocks['g1-open'] = {
  $global:S16Changed = $true; Save-S16
  Step-S16 'g1' { Set-S11bBlockList (Use-S16Options) @($Blk) }
}
$Blocks['g1-close'] = {
  Step-S16 'g1-close' { Set-S11bBlockList (Use-S16Options) @() }
  Read-R17Rules
}
$Blocks['rd1'] = {
  New-R17Tab 'RD-1' 'r1' 'rd1p'
  [void](Call9 'RD-1' 'nav' 'navigate' @('r1', 'http://localhost:8083/e2e-playground.html?s11b=rd1') 'BLOCKED:tab|url' -StopOnFail)   # STOP-MAP covered-proceeds
  [void](Invoke-R17Row 'RD-1 LAT' 'nav' 'lat' 'RD-1')
  Start-Sleep -Seconds 2
  [void](Call9 'RD-1' 'tabs' 'tabs' @() 'record')
  [void](Call9 'RD-1' 'snap' 'snapshot' @('r1') 'record')
  [void](Get-R17Hits 'rd1')
  Read-R17Rules
  Close-R17Tab 'RD-1' 'r1'
}
$Blocks['rd6'] = {
  Read-R17Rules
  $W6 = [long](@(Open-S11bWindow 'http://localhost:8083/e2e-playground.html?s11b=rd6')[-1])
  if ($W6 -le 0) { throw 'no RD-6 window' }
  Start-Sleep -Seconds 3
  $u = Get-S9DocUrl $W6
  $cls = if ($u.StartsWith('http://localhost:8085/')) { 'fixture-8085' } else { 'other' }
  Say9 "RD6 url=$cls"
  Close-S11Window $W6
  $h = Get-R17Hits 'rd6'
  if ($h.Blocked -ne 1) { Stop9 'RD-6: the human''s own browsing changed (blocked hits are not 1)'; throw 'stop' }   # STOP-MAP human-browsing
  Read-R17Rules
}
$Blocks['rd2'] = {
  [void](Call9 'RD-2' 'open' 'newtab' @("http://localhost:8083/e2e-playground.html?s11b=rd2", '--as', 'r2') 'record')
  Start-Sleep -Seconds 2
  [void](Call9 'RD-2' 'tabs' 'tabs' @() 'record')
  [void](Call9 'RD-2' 'snap' 'snapshot' @('r2') 'record')
  [void](Get-R17Hits 'rd2')
  Close-R17Tab 'RD-2' 'r2'
}
$Blocks['rd3'] = {
  [void](Call9 'RD-3' 'dl' 'download-file' @('http://localhost:8083/dl/hello.txt?s11b=rd3', '--file', 'hello-rd3.txt') 'BLOCKED:url' -StopOnFail)   # STOP-MAP covered-proceeds-3
  [void](Invoke-R17Row 'RD-3 LAT' 'dl' 'lat' 'RD-3'); $global:R17Rd3Ms = Get-R17LatMs
  Read-R17Rules
  [void](Call9 'RD-3' 'dl-ctl' 'download-file' @('http://localhost:8085/dl/hello.txt?s11b=rd3c', '--file', 'hello-rd3c.txt') 'BLOCKED:url' -StopOnFail)
  Start-Sleep -Seconds 2
  [void](Get-R17Hits 'rd3'); [void](Get-R17Hits 'rd3c')
  Read-R17Rules
}
$Blocks['rd-dl-err'] = {
  $global:R17ErrMs = @()
  foreach ($i in 1, 2, 3) {
    [void](Call9 'RD-DL-ERR' "e$i" 'download-file' @('http://localhost:8090/dl/hello.txt?s11b=dlerr', '--file', 'x.txt') 'record')
    $f = Save-R17Call
    Read-R17Rules
    $a = @('judge-row', '--row', "RD-DL-ERR-$i", '--from', $f, '--step', "e$i", '--as', 'dl-err', '--lat', "RD-DL-ERR-$i")
    if ($global:R17RulesOk) { $a += @('--rules-after', '0') }
    [void](Invoke-R17Node 's11b' $a)
    Remove-Item -LiteralPath $f -Force -ErrorAction SilentlyContinue
    $ms = Get-R17LatMs; if ($ms -ge 0) { $global:R17ErrMs += $ms }
  }
}
$Blocks['rd-dl-hop'] = {
  $global:R17HopMs = @()
  foreach ($i in 1, 2, 3) {
    [void](Call9 'RD-DL-HOP' "h$i" 'download-file' @("http://localhost:8083/dl/hello.txt?s11b=dlhop$i", '--file', "hop$i.txt") 'record')
    $f = Save-R17Call
    $h = Get-R17Hits "dlhop$i"
    Read-R17Rules
    $a = @('judge-row', '--row', "RD-DL-HOP-$i", '--from', $f, '--step', "h$i", '--as', 'dl-hop', '--lat', "RD-DL-HOP-$i")
    if ($h.Blocked -ge 0) { $a += @('--blocked', "$($h.Blocked)") }
    if ($global:R17RulesOk) { $a += @('--rules-after', '0') }
    [void](Invoke-R17Node 's11b' $a)   # STOP-MAP covered-proceeds-hop (an ok answer: B17 judge-row exits 2 and Invoke-R17Node throws)
    Remove-Item -LiteralPath $f -Force -ErrorAction SilentlyContinue
    $ms = Get-R17LatMs; if ($ms -ge 0) { $global:R17HopMs += $ms }
  }
  $r = @('dl-record', '--hop', ($global:R17HopMs -join ','))
  if (@($global:R17ErrMs).Count -gt 0) { $r += @('--err', (@($global:R17ErrMs) -join ',')) }
  if ($global:R17Rd3Ms -gt 0) { $r += @('--rd3', "$($global:R17Rd3Ms)") }
  [void](Invoke-R17Node 's11b' $r)
}
$Blocks['rd7'] = {
  # M-new (S4-helpers fixer 2): the sheet's RD-7 STOP is proof of rendering, and without the console only the UIA read could give it; that read
  # is not built (r7 may open in a window the human owns). So on FALLBACK the row makes no call at all: no navigate, no state change.
  if ($global:R17Fallback) { Say9 'ROW RD-7 NOT RUN - no stopper without the console (the UIA read is not built)'; $global:S16NM++; return }   # no stopper, no call
  # m3-1 (fixer 3): probe the console just before the tab is made (a RULES read: only what B17 rules --expr builds is typed, pattern-checked);
  # a console lost here sets FALLBACK, and RD-7 stops before its navigate. A loss after this probe stays possible (S4-live notes).
  Read-R17Rules
  if ($global:R17Fallback) { Say9 'ROW RD-7 NOT RUN - no stopper without the console (the UIA read is not built)'; $global:S16NM++; return }   # the probe fell back
  New-R17Tab 'RD-7' 'r7' 'rd7p'
  [void](Call9 'RD-7' 'nav' 'navigate' @('r7', 'http://localhost:8088/options.html?s11b=rd7') 'record')
  Read-R17Rules
  Start-Sleep -Seconds 2
  [void](Call9 'RD-7' 'tabs' 'tabs' @() 'record')
  [void](Get-R17Hits 'rd7' 8088 -Single)
  $c = Invoke-S11bConsoleEval $global:D 'ctx' @('--label', 'r7', '--tag', 'rd7') @('--label', 'r7')
  if ($c -eq 2) { Stop9 'RD-7: an extension context lives in the tab (CTX count above 0), or the read printed a STOP'; throw 'stop' }   # STOP-MAP own-rendered
  if ($c -eq 10) { $global:R17Fallback = $true }   # m3-1: a console lost at the CTX read is FALLBACK for every later row
  if ($c -ne 0) { Say9 'CTX NOT MEASURED (see the line above)'; $global:S16NM++ }
  Say9 'RD-7 UIA read of the options heading NOT MEASURED: no wave window shows the tab, so the second proof of rendering cannot be read (the console CTX is the stopper)'; $global:S16NM++
  Close-R17Tab 'RD-7' 'r7'
}
$Blocks['rd8'] = {
  New-R17Tab 'RD-8' 'r8' 'rd8p'
  $fp = (Join-Path $Root 's11b-file.txt').Replace('\', '/')
  [void](Call9 'RD-8' 'nav' 'navigate' @('r8', "http://localhost:8089/$fp`?s11b=rd8") 'record')
  Read-R17Rules
  Start-Sleep -Seconds 2
  [void](Call9 'RD-8' 'tabs' 'tabs' @() 'record')
  [void](Call9 'RD-8' 'snap' 'snapshot' @('r8') 'record')
  if (($global:R17Out -join "`n") -match 'This tab shows a local file') { Stop9 'RD-8: Chrome followed the redirect onto a file: document'; throw 'stop' }   # STOP-MAP file-rendered
  [void](Get-R17Hits 'rd8' 8089 -Single)
  Close-R17Tab 'RD-8' 'r8'
}
# RD-BACK / RD-FWD / RD-BACK-SAMEDOC: the call, then hits, the flip count and RULES go to B17 judge-history (the sheet's pass rules).
$Blocks['rd-back'] = { Invoke-R17History 'RD-BACK' 'back' 'hb' 'bk' }
$Blocks['rd-fwd'] = { Invoke-R17History 'RD-FWD' 'forward' 'hf' 'fw' 2 }
$Blocks['rd-back-samedoc'] = {
  New-R17Tab 'RD-BACK-SAMEDOC' 'hs' 'sd'
  [void](Invoke-R17Node 's11b' @('history', '--kind', 'samedoc', '--tab', 'hs'))
  Invoke-R17History 'RD-BACK-SAMEDOC' 'back' 'hs'
  Close-R17Tab 'RD-BACK-SAMEDOC' 'hs'
}
$Blocks['rd4'] = {
  New-R17Tab 'RD-4' 'r4' 'rd4p'
  [void](Call9 'RD-4' 'nav' 'navigate' @('r4', 'http://localhost:8083/e2e-playground.html?s11b=rd4') 'ok')
  Start-Sleep -Seconds 2
  $h = Get-R17Hits 'rd4'
  if ($h.Blocked -ne 1) { Stop9 'RD-4: blocked hits are not 1 (a rule stuck on the tab or the session)'; throw 'stop' }   # STOP-MAP stuck-rule-hit
  Read-R17Rules
  Close-R17Tab 'RD-4' 'r4'
}
$Blocks['rd-back-empty'] = {
  if ($global:S11Found.blockLines -ne 0) { Say9 'ROW RD-BACK-EMPTY NOT RUN - found list not empty'; return }
  New-R17Tab 'RD-BACK-EMPTY' 'he' 'be'
  [void](Invoke-R17Node 's11b' @('history', '--kind', 'empty', '--tab', 'he'))
  $s = $null
  if (-not $global:R17Fallback) {
    $s = Start-S11bConsoleEval $global:D 'rules' @('--sample', '100', '--for', '14000', '--mode', 'empty')
    if ($s.Code -eq 10) { $global:R17Fallback = $true; $s = $null } elseif ($null -ne $s.Code) { Stop9 'RD-BACK-EMPTY: the RULES sampler could not be built'; throw 'stop' }
  }
  Invoke-R17History 'RD-BACK-EMPTY' 'back' 'he' -RulesZero:($null -ne $s) -StopOnFail   # STOP-MAP answer-changed
  $t1 = [long]$global:R17Hist.Groups[3].Value
  Invoke-R17History 'RD-BACK-EMPTY' 'forward' 'he' -RulesZero:($null -ne $s) -StopOnFail
  $t2 = [long]$global:R17Hist.Groups[4].Value
  if ($s) { $c = Complete-S11bConsoleEval $s @('--mode', 'empty', '--row', 'RD-BACK-EMPTY', '--send', "$t1", '--reply', "$t2") -TimeoutMs 20000; if ($c -eq 2) { Stop9 'RD-BACK-EMPTY: a rule existed during a history call'; throw 'stop' } }   # STOP-MAP rules-stuck-empty
  else { Say9 'RD-BACK-EMPTY RULES samples NOT MEASURED (console eval unavailable)'; $global:S16NM++ }
  Close-R17Tab 'RD-BACK-EMPTY' 'he'
}
$Blocks['r17-up-6'] = {
  Step-S16 'front' { Set-S11Front $global:W 'R17-UP-6' }
  $ids = @('R17-UP-6-outside', 'R17-UP-6-missing', 'R17-UP-6-relative', 'R17-UP-6-raw-dotdot', 'R17-UP-6-raw-notarget')
  [void](Invoke-R17Node 's11b' @('up6') { Invoke-S11bSamplerPasses -Ids $ids -Hwnds @($global:W) })
}
$Blocks['r17-up-7'] = {
  $global:S16Changed = $true; Save-S16
  $O = Use-S16Options
  [void](Invoke-R17Node 's11' @('up7') { foreach ($Id in 'UP-7-a', 'UP-7-b', 'UP-7-c') { Invoke-S11Row $Id $O } })
}
$Blocks['r17-save-refuse'] = {
  [void](Invoke-R17Node 's11' @('saverefuse-sdk'))
  Start-S16Actor
  $global:R17ActorRan = $true
  try { [void](Invoke-R17Node 's11' @('saverefuse-mcp')) } finally { End-S16Actor }
}
$Blocks['f-home'] = { [void](Invoke-R17Judge 'fhome' @(Get-S11bHomeObs (Use-S16Options))[-1]) }
$Blocks['rd-caps-warn'] = {
  if ($global:R17CapsDone) { Say9 'RD-CAPS-WARN already ran as RD-0 (a-prime) on the FALLBACK branch'; return }
  Invoke-R17CapsWarn
}
$Blocks['r17-up-opt'] = {
  $global:S16Changed = $true; Save-S16
  $O = Use-S16Options
  $of = Join-Path $env:S11_OUT 'upopt-obs.json'
  $sum0 = [string](Get-S11Summary (Get-S9Options $O))
  Step-S16 'opt' { Invoke-S11Opt $O $Root $of }
  $mf = @(Get-S11bOptObs $O $of $sum0)[-1]
  Remove-Item -LiteralPath $of -Force -ErrorAction SilentlyContinue
  [void](Invoke-R17Judge 'upopt' $mf)
}
$Blocks['rd-rebuild-narrow'] = {
  $global:S16Changed = $true; Save-S16
  $O = Use-S16Options
  New-R17Tab 'RD-REBUILD-NARROW' 'rn' 'rnp'
  $d = { [void](Wait-S11Ready 'RD-REBUILD-NARROW' 60); Start-Sleep -Milliseconds 1000; Set-S11Flag $O 'evaluate' $false; Set-S11Flag $O 'evaluate' $true }
  $codes = @(Invoke-R17Flight 'RD-REBUILD-NARROW' 'RD-REBUILD-NARROW' @('--op', 'navigate', '--tab', 'rn', '--url', 'http://localhost:8087/slow/e2e-playground.html?s11b=rn', '--expect', 'ok') $d 'inflight')
  if ($codes -contains 2) { Stop9 'RD-REBUILD-NARROW: RULES above 0 after the reply'; throw 'stop' }   # STOP-MAP stuck-narrow
  Read-R17Rules
  Close-R17Tab 'RD-REBUILD-NARROW' 'rn'
  Write-R17Row 'RD-REBUILD-NARROW' $codes
}
$Blocks['rd-disarm'] = {
  $global:S16Changed = $true; Save-S16
  New-R17Tab 'RD-DISARM' 'rdd' 'rddp'
  if (-not (Test-S11ButtonReady $global:W)) { throw 'RD-DISARM: the toolbar button is not pinned or not armed' }   # STOP-MAP unpinned-disarm
  $Expect = Get-R17Expect
  $d = { [void](Wait-S11Ready 'RD-DISARM' 60); $at = (Get-Date).AddMilliseconds(1000); Invoke-S11ButtonPair $global:W -GapMs 1600 -At $at -Checked }
  $codes = @(Invoke-R17Flight 'RD-DISARM' 'RD-DISARM' @('--op', 'navigate', '--tab', 'rdd', '--url', 'http://localhost:8086/e2e-playground.html?s11b=rdd', '--expect', 'disarmed') $d 'at' @('--expect', $Expect))
  if ($codes -contains 2) { Stop9 'RD-DISARM: RULES above 0 after the reply'; throw 'stop' }   # STOP-MAP stuck-disarm
  $ok = @(Test-S9DaemonSafety ([bool]$global:S11Found.armed) ([bool]$global:S11Found.evaluate) ([int]$global:S11Found.count) 'RD-DISARM' 5000)[-1]
  $codes += $(if ($ok) { 0 } else { 1 })
  $codes += Get-R17HitCode 'rdd' 8086
  Close-R17Tab 'RD-DISARM' 'rdd'
  Write-R17Row 'RD-DISARM' $codes
}
$Blocks['rd5'] = {
  if ($global:R17Fallback) { Say9 'ROW RD-5 NOT MEASURED - the stored read-back needs the worker console (FALLBACK)'; $global:S16NM++; return }
  $global:S16Changed = $true; Save-S16
  $O = Use-S16Options
  New-R17Tab 'RD-5' 'r5' 'rd5p'
  $ef = Join-Path $env:S11_OUT 'rd5-expected.txt'; $pf = Join-Path $env:S11_OUT 'rd5-port.txt'; $sf = Join-Path $env:S11_OUT 'rd5-stored.signal'; $xf = Join-Path $env:S11_OUT 'rd5-poller.expr'; $cf = Join-Path $env:S11_OUT 'rd5-cancel.signal'
  Remove-Item -LiteralPath $pf, $sf, $xf, $cf -Force -ErrorAction SilentlyContinue
  Write-S11bExpected $ef @($Blk)
  $global:R17Bg = $null; $global:R17Press = 0
  $d = {
    $t0 = Get-Date
    while (-not (Test-Path -LiteralPath $xf)) { if (((Get-Date) - $t0).TotalSeconds -gt 20) { throw 'the stored poller wrote no expression' }; Start-Sleep -Milliseconds 50 }
    $c = Start-S11bConsoleEval $global:D 'stored' -ExprFile $xf
    if ($null -ne $c.Code) { Say9 'RD-5: the poller could not be typed; no save pressed'; return }
    $global:R17Bg = Start-R17Bg @('call', '--row', 'RD-5', '--op', 'navigate', '--tab', 'r5', '--url', 'http://localhost:8083/e2e-playground.html?s11b=rd5', '--expect', 'tab-or-url', '--signal', 'RD-5', '--go', $sf, '--cancel', $cf) 'node2'
    [void](Wait-S11Ready 'RD-5' 60)
    $global:R17Press = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    Save-S11bBlockList $O @($Blk)
  }
  $codes = @([int](Invoke-R17Node 's11b' @('stored', '--expected', $ef, '--port-file', $pf, '--signal', $sf, '--cancel', $cf, '--expr', $xf, '--timeout', '30000', '--for', '20000') $d))
  $at = [regex]::Match(($global:R17Out -join "`n"), 'STOREDAT (\d+)')
  Remove-Item -LiteralPath $ef, $xf, $pf, $sf, $cf -Force -ErrorAction SilentlyContinue
  $codes += $(if ($global:R17Bg) { [int](Wait-R17Bg $global:R17Bg 60) } else { 3 })   # STOP-MAP covered-proceeds-rd5 (a covered call that answers ok exits 2; Wait-R17Bg throws)
  $cm = [regex]::Match(($global:R17Out -join "`n"), 'CALLT \S+ start=(\d+)')
  if ($at.Success -and $cm.Success -and $global:R17Press -gt 0) { $codes += [int](Invoke-R17Node 's11b' @('judge-gap', '--press', "$global:R17Press", '--readback', $at.Groups[1].Value, '--call', $cm.Groups[1].Value)) } else { $codes += 3 }
  # the stored value never read back holding BLK (m3): nothing was tested, so the hits are not judged (NOT MEASURED, not a failure)
  $codes += $(if ($codes[0] -eq 0) { Get-R17HitCode 'rd5' } else { 3 })
  Step-S16 'rd5-restore' { Set-S11bBlockList $O @() }
  Read-R17Rules
  if ($codes -contains 2) { Stop9 'RD-5: a row-level STOP'; throw 'stop' }   # STOP-MAP stuck-rd5
  Close-R17Tab 'RD-5' 'r5'
  Write-R17Row 'RD-5' $codes
}
$Blocks['rd5b'] = {
  $global:S16Changed = $true; Save-S16
  $O = Use-S16Options
  New-R17Tab 'RD-5b' 'r5b' 'rd5bp'
  $Expect = Get-R17Expect
  $d = { [void](Wait-S11Ready 'RD-5b' 60); Start-Sleep -Milliseconds 1000; Save-S11bBlockList $O @($Blk) }
  $codes = @(Invoke-R17Flight 'RD-5b' 'RD-5b' @('--op', 'navigate', '--tab', 'r5b', '--url', 'http://localhost:8086/e2e-playground.html?s11b=rd5b', '--expect', 'tab-or-url') $d 'at' @('--expect', $Expect))
  if ($codes -contains 2) { Stop9 'RD-5b: RULES above 0 after the reply'; throw 'stop' }   # STOP-MAP stuck-rd5b
  # STOP-MAP covered-proceeds-rd5b: a covered call that answers ok makes the call node exit 2 and Invoke-R17Node throw, before this line
  Step-S16 'rd5b-read-back' { Set-S11bBlockList $O @($Blk) }
  Step-S16 'rd5b-restore' { Set-S11bBlockList $O @() }
  $codes += Get-R17HitCode 'rd5b' 8086
  Read-R17Rules
  Close-R17Tab 'RD-5b' 'r5b'
  Write-R17Row 'RD-5b' $codes
}
# The daemon log's line count now (RD-DL-SOCKET's window ends).
function Get-R17LogCount { $lg = @(Get-Content $DaemonLog -Encoding UTF8 -ErrorAction SilentlyContinue); $lg.Count }
# One of RD-DL-SOCKET's two console marks (`B17 mark`: fixed text, pre-type checked). Without a console the mark is not typed and RD-LOGS says NOT MEASURED.
function Invoke-R17SockMark([string]$Label) {
  if ($global:R17Fallback) { return }
  $c = Invoke-S11bConsoleEval $global:D 'mark' @('--label', $Label) @('--label', $Label)
  if ($c -eq 10) { $global:R17Fallback = $true } elseif ($c -eq 2) { Stop9 'RD-DL-SOCKET: a console mark could not be built'; throw 'stop' } elseif ($c -ne 0) { $global:S16NM++ }
}
$Blocks['rd-dl-socket'] = {
  $global:S16Changed = $true; Save-S16
  $O = Use-S16Options
  Step-S16 'sock-open' { Set-S11bBlockList $O @('127.0.0.1') }
  # RD-LOGS's sock127 window (M3): two fixed console marks and the daemon.log line counts (relative to the slice file) at the loop's two ends
  $global:R17SockRan = $true
  $global:R17SockLog0 = (Get-R17LogCount) - $global:S16Mark
  Invoke-R17SockMark 'start'
  $sf = Join-Path $env:S11_OUT 'sock-stop.signal'
  Remove-Item -LiteralPath $sf -Force -ErrorAction SilentlyContinue
  $bg = Start-R17Bg @('socket', '--for', '150000', '--signal-file', $sf) 'node2'
  Start-Sleep -Seconds 3
  $n = 0
  foreach ($i in 1..12) { if ((Call9 'RD-DL-SOCKET' "s$i" 'download-file' @("http://localhost:8087/slow/hello.txt?s11b=sk$i", '--file', "sk$i.txt") 'ok') -eq 0) { $n++ } }
  Say9 "SOCKET calls ok $n of 12; HANDSHAKE during call: not exercised (recorded)"
  Invoke-R17SockMark 'end'
  $global:R17SockLog1 = (Get-R17LogCount) - $global:S16Mark
  $global:R17RulesOk = $false; Read-R17Rules
  [void](Call9 'RD-DL-SOCKET' 'status' 'status' @() 'record')
  Write-R17File $sf @('stop')
  $codes = @([int](Wait-R17Bg $bg 40))
  $codes += $(if ($n -eq 12) { 0 } else { 1 })
  $codes += $(if ($global:R17RulesOk) { 0 } else { 3 })
  Step-S16 'sock-close' { Set-S11bBlockList $O @() }
  Write-R17Row 'RD-DL-SOCKET' $codes
}
$Blocks['root-add'] = {
  $global:S16Changed = $true; Save-S16
  Step-S16 'root' { Add-S11Root (Use-S16Options) $Root }
}
function Invoke-R17Raw([string]$Row, [string[]]$Extra = @(), [string]$Sampler = '') {
  Step-S16 'front' { Set-S11Front $global:W $Row }
  $a = @('raw', '--row', $Row) + $Extra
  if ($Sampler) { [void](Invoke-R17Node 's11b' $a { Invoke-S11bSamplerPasses -Ids @($Sampler) -Hwnds @($global:W) }) } else { [void](Invoke-R17Node 's11b' $a) }
}
$Blocks['f-raw'] = { Invoke-R17Raw 'F-RAW' @() 'F-RAW' }
$Blocks['f-raw-2'] = { Invoke-R17Raw 'F-RAW-2' @() 'F-RAW-2' }
$Blocks['f-raw-dir'] = { Invoke-R17Raw 'F-RAW-DIR' @('--dir', 's11b-dir') 'F-RAW-DIR' }
$Blocks['f-raw-enc'] = { Invoke-R17Raw 'F-RAW-ENC' }
$Blocks['f-raw-ok'] = { Invoke-R17Raw 'F-RAW-OK' }
$Blocks['r17-up-race-a'] = {
  $global:S16Changed = $true; Save-S16
  Step-S16 'front' { Set-S11Front $global:W 'race A' }
  [void](Invoke-R17Node 's11b' @('race') { Invoke-S11bRaceA $global:W })
}
$Blocks['r17-up-devt'] = {
  $O = Use-S16Options
  $X = New-S16Window 'http://127.0.0.1:8081/s11-upload.html?s11=xwin'; $global:X = $X
  [void](Set-S9Foreground $X)
  [void](Invoke-R17Node 's11' @('setup', '--only', 'x'))
  [void](Invoke-R17Node 's11b' @('devt') { Invoke-S11Row 'UP-DEVT' $O $X })
  Close-S11Window $X
  [void](Set-S9Foreground $global:W)
}
$Blocks['rd-restore'] = {
  # The flag is cleared only on success: a failed or thrown restore leaves it set, so the stop procedure never restores twice.
  $global:S16InRestore = $true
  $O = Use-S16Options
  Step-S16 'restore' { [void](Set-S9Foreground $global:W); Restore-S11Safety $O $global:W 'RD-RESTORE' }   # STOP-MAP restore-mismatch
  $global:S16Changed = $false; $global:S16InRestore = $false; Save-S16
  [void](Invoke-R17Node 's11' @('restore-check', '--found', $FoundJson, '--now', $NowJson, '--daemon') -StopOnFail)
  Read-R17Rules
}
$Blocks['rd-logs'] = {
  $cf = Join-Path $env:S11_OUT 'console.txt'; $df = Join-Path $env:S11_OUT 'daemon-slice.txt'
  Step-S16 'console' { Read-S9WorkerConsole $global:D $cf }
  $global:S16ConsoleRead = $true
  [void](Invoke-R17Node 's11b' @('clean-console', '--file', $cf))   # m5: the capture drops its window-title lines (#283) before it is scanned
  $lg = @(Get-Content $DaemonLog -Encoding UTF8 | Select-Object -Skip $global:S16Mark)
  Write-R17File $df ([string[]]$lg)
  # M3: the alias goes to every scan by argument; sock127 counts only inside RD-DL-SOCKET's window (its two console marks, its two daemon-log counts)
  $al = Get-R17Alias
  $ac = @(if ($al) { '--alias', $al })
  $sc = @(); $sd = @()
  if ($global:R17SockRan) { $sc = @('--sock-console'); $sd = @('--sock-lines', "$($global:R17SockLog0),$($global:R17SockLog1)") }
  $cn = (Invoke-R17Node 's11b' (@('scan', '--what', 'console', '--file', $cf) + $ac + $sc) -StopOnFail)   # STOP-MAP log-hit
  if ($cn -eq 0) { [void](Invoke-R17Node 's11b' (@('redact-console', '--file', $cf, '--out', (Join-Path $env:S11_OUT 'console-evidence.txt')) + $ac + $sc)) }   # #306: the evidence copy holds Chrome's blocked-request lines as a label only; written only when the console scan passed
  else { Say9 'CONSOLE evidence copy not written (scan not passed)' }
  [void](Invoke-R17Node 's11b' (@('scan', '--what', 'daemon', '--file', $df) + $ac + $sd) -StopOnFail)
  if ($global:R17ActorRan) { [void](Invoke-R17Node 's11b' (@('scan', '--what', 'actors') + $ac) -StopOnFail) } else { Say9 'RD-LOGS actors: no actor ran in this slice; nothing to scan' }
  Assert-R17TreeClean
}
$Blocks['teardown'] = {
  if ($global:S16Changed) { Fail-S16 'teardown refused: the safety state is not restored (RD-RESTORE has not passed)' }
  End-S16Actor
  Close-S16Windows
  [void](Invoke-R17Node 's11' @('clean'))
  foreach ($f in 's11b-file.html', 's11b-file.txt', $EncName) { Remove-Item -LiteralPath (Join-Path $Root $f) -Force -ErrorAction SilentlyContinue }
  Remove-Item -LiteralPath (Join-Path $Root 's11b-dir') -Recurse -Force -ErrorAction SilentlyContinue
  Clear-S11Signals
  Remove-Item -LiteralPath $FoundDir -Recurse -Force -ErrorAction SilentlyContinue
  Stop-S16All
  $global:S16Gone = $true
  Say9 'TEARDOWN done: windows, wave files, servers (own PIDs) ended; globals removed'
}

function Invoke-S16Block([string]$Name) {
  $env:S9_RAW = $Framing; Say9 "BLOCK $Name start"
  Set-S16Raw $Name
  if ($NotBuilt -contains $Name) { $global:R17NB++; Say9 "NOT BUILT: block $Name is written in the plan but not built yet (a follow-on builder)"; return }
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
    $n = $global:S16Fail; $k = $global:S16NM; $count = $global:R17NB
    Say9 "SLICE $Name done: calls with a failed check $n, not measured $k, not built $count (the rows are in the record)"
    if ($count -gt 0) { exit 3 }
  } else {
    if (-not (Test-S16Gate $Name)) { exit 3 }
    Invoke-S16Block $Name
    if ($global:R17NB -gt 0) { exit 3 }
  }
} catch {
  $tag = Get-S11bStopCause $_   # fixer3: the cause, not only its type
  Stop-S16Wave "an exception in block $Name ($tag)"
}
exit 0
