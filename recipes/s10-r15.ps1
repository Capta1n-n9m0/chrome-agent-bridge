# recipes/s10-r15.ps1: the block runner of Run 15 (Step 10 stage S7: Step 10's own rows; docs/e2e-test-plan.md section
# 4.22; wave sheet docs/plans/2026-10-24-step10-step8-follow-ups-steps/S7-wave-sheet.md). Windows PowerShell 5.1, ASCII.
# Written 2026-10-25 by the S7 prep builder on recipes/s9-r14.ps1's model (decisions.md 2026-10-25 #213), before any R15
# row ran; NOT run against Chrome by its author (the prep stage may not touch Chrome): its parse and the pure rules were
# checked without Chrome (S7-prep-builder.md).
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\s10-r15.ps1 -Block <name> [-Prep <sha>] [-Why <text>]
#
# ONE block per call, in the sheet's order; the wave's globals live in $env:S10_OUT\r15-globals.clixml between calls;
# every printed line is also appended (UTF-8) to $env:S10_OUT\r15-raw.txt (the raw output the live verifier greps for
# STOP lines, S7.6 with Stage 0 F20). Blocks, in order:
#   preflight -Prep <sha>   read-only: the prep commit in HEAD, tracked files clean outside the steps dir (the ledger
#                           and the record may change), the dist hashes before the build (a record), no bridge MCP
#                           process, 9234 free or a daemon's, 8080/8081/8083/8085 free, Chrome running, claude.exe and
#                           python found
#   build                   npm run build of the committed code; the tracked status outside the steps dir equal before
#                           and after it
#   servers                 8080 (test-fixtures) and 8085 (recipes/fixtures, BBL-1), python http.server on 127.0.0.1
#   window                  the driver window W; the pin state by UIA; not pinned -> one UIA-only try; else STOP (human gate)
#   daemon                  the wave's daemon-log mark; s10.ts daemon-up (the daemon of the build on disk)
#   reload                  recipes/reload-extension.ps1 (exit 0; one re-run on exit 2; anything else -> STOP)
#   setup                   s10.ts setup: the fixture tabs, opened AFTER the reload (no stale content script)
#   safe0                   L1: s9.ts safe0 (Step 9's SAFE-0, text unchanged) + s10.ts s10check (the Step 10 build)
#   console                 E = chrome://extensions, D = the worker's console (S7.6)
#   found                   O = the options page; the found-state record and its guard
#   rep0                    REP-0's probe (#97) in its own window R (recipes/s6.ts rep0)
#   bbl1 | bbl2             BBL-1: delayed old/new | stuck + elsewhere (no bridge; recipes/fixtures on 8085)
#   mcpf-click | mcpf-type | mcpf-press | cap | sw1 | pop2 | save-a | savefix | save-64 | save-64-mcp | prim | idonly |
#   save-ttl                rows that change no safety state
#   r3 | savedis | savejs | saveblk | jsd | off                            rows that change the safety state
#                           Every row block builds the page values it reads at its start (a resume may have skipped the
#                           block that built them before: S7 prep fixer 1, C1/M3; recipes/test/s10-rules.test.ts checks
#                           it), and block off sets JavaScript off itself when block jsd did not run in this attempt.
#   restore                 the safety state restored and read back equal to the found state (S7.4)
#   logs                    console, daemon.log, every actor transcript counted (S7.6, SAVE-LOG); daemon log copied at 0
#   teardown                tabs, desk, daemon, servers; raw output scanned and copied; the saveTo files deleted
#   status                  prints the globals (the ledger's "Live PIDs"); runs even after a stop
#   stop -Why <text>        the stop procedure by hand, for a STOP met outside a block
#   reset                   archives a finished or stopped wave (a new wave needs the step agent's decision)
#   reset -Attempt <n> -Skip <blocks>   the ONLY resume: from a stored stop, attempt n = the stored attempt + 1, and
#                           -Skip must name every ROW block already done plus the stopped block when it is a row block
#                           (an observed row is never re-run); anything else prints USAGE: (never STOP:), exit 3
#
# THE STOP PROCEDURE (#193): a guard prints a line beginning STOP: and throws; any other throw in a block is caught the
# same way. Then: the background s10.ts (if any) ended by its identified PID tree; running actors ended; the headless
# Chrome and the memory sampler ended; the windows R and bb-login's closed; Restore-S9All (the safety half restores and
# reads back only when the found state was recorded and presses nothing already as found; then pin, layout, W O E D);
# tabs, daemon and servers stopped; the wave marked stopped. Exit: 0 block done (a CHECK may still say FAIL - recorded,
# not a stop), 2 STOP (RETURN to the step agent), 3 not run.
#
# BLOCK BUDGETS (S7 prep fixer 1, m2): the PowerShell tool ends a call at 600 s, which would bypass the stop procedure.
# Every node script a block runs (s10.ts, s9.ts, s9-actor.ts, s6.ts) runs through Invoke-S15Node, bounded by the
# block's deadline ($BudgetS / $DefaultBudgetS from the block's start); past it the call's identified process tree is
# ended and the block throws, so the stop procedure runs inside the same call. Worst case per block = its budget + its
# longest call outside a node script ($UnwrappedS) + the stop procedure ($StopBoundS) <= 570 s (a rule test checks it).
# A block the tool still ends at its cap is itself a STOP: the runner runs -Block stop -Why "<block> hit the tool's cap".
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('preflight', 'build', 'servers', 'window', 'daemon', 'reload', 'setup', 'safe0', 'console', 'found', 'rep0', 'bbl1', 'bbl2', 'mcpf-click', 'mcpf-type', 'mcpf-press', 'cap', 'sw1', 'pop2', 'save-a', 'savefix', 'save-64', 'save-64-mcp', 'prim', 'idonly', 'save-ttl', 'r3', 'savedis', 'savejs', 'saveblk', 'jsd', 'off', 'restore', 'logs', 'teardown', 'status', 'stop', 'reset')]
  [string]$Block,
  [string]$Prep = '',
  [string]$Why = '',
  [int]$Attempt = 0,
  [string[]]$Skip = @()
)

$ErrorActionPreference = 'Continue'
$Repo = Split-Path -Parent $PSScriptRoot
Set-Location $Repo
$env:Path = "$env:LOCALAPPDATA\Author Software\nvm\.nodejs;$env:Path"
if (-not $env:S10_OUT) { $env:S10_OUT = Join-Path $env:TEMP 'bridge-e2e\s15' }
New-Item -ItemType Directory -Force $env:S10_OUT | Out-Null
$env:S9_OUT = $env:S10_OUT                       # s9.ts and s9-win.ps1 share state.json and the .ready/.pressed signals
$env:S9_ACTORS = Join-Path $env:S10_OUT 'actors'
$env:S9_RAW = Join-Path $env:S10_OUT 'r15-raw.txt'
. "$PSScriptRoot\s10-win.ps1"
$global:S9PinUiaOnly = $true                     # never pin or unpin by mouse in this wave
$Steps = 'docs\plans\2026-10-24-step10-step8-follow-ups-steps'
$StateFile = Join-Path $env:S10_OUT 'r15-globals.clixml'
$Order = @('preflight', 'build', 'servers', 'window', 'daemon', 'reload', 'setup', 'safe0', 'console', 'found', 'rep0', 'bbl1', 'bbl2', 'mcpf-click', 'mcpf-type', 'mcpf-press', 'cap', 'sw1', 'pop2', 'save-a', 'savefix', 'save-64', 'save-64-mcp', 'prim', 'idonly', 'save-ttl', 'r3', 'savedis', 'savejs', 'saveblk', 'jsd', 'off', 'restore', 'logs', 'teardown')
# Row blocks: an observation is made in them, so a resume never runs one again (#213). The others are framing.
$RowBlocks = @('bbl1', 'bbl2', 'mcpf-click', 'mcpf-type', 'mcpf-press', 'cap', 'sw1', 'pop2', 'save-a', 'savefix', 'save-64', 'save-64-mcp', 'prim', 'idonly', 'save-ttl', 'r3', 'savedis', 'savejs', 'saveblk', 'jsd', 'off')
$Names = @('W', 'O', 'E', 'D', 'R', 'WinStart', 'PinnedBefore', 'L0', 'S9ChromeStart', 'S9Found', 'S9WinIds', 'WaveStart', 'S15Touched', 'S15Stopped', 'S15Pids', 'S15Done', 'S15Resume', 'S15LogMark', 'S15Actors', 'S15BbWins', 'S15Attempt', 'S15Claude', 'S15Born', 'S15IdonlyLaunch')
# Block budgets in seconds (see BLOCK BUDGETS above; the sheet section 1 lists each block's worst case).
$DefaultBudgetS = 330
$BudgetS = @{ 'save-ttl' = 360; 'bbl1' = 300; 'bbl2' = 300 }
# The longest call a block makes outside a node script (bb-login's 90 s bound + its start; the reload script; UIA steps).
$DefaultUnwrappedS = 15
$UnwrappedS = @{ 'bbl1' = 95; 'bbl2' = 95; 'reload' = 60 }
# The stop procedure's own bound: one actor's end 30 s, the headless Chrome 10 s, the windows 5 s, the restore's UIA
# reads and presses ~45 s, cleanup and daemon.shutdown (30 s cap each inside the stop) + 5 s, the kills ~5 s.
$StopBoundS = 160
$Default = 'safety armed=true evaluate=true blockedCount=0'
$BlkPattern = 'saveblk.localhost'                # SAVE-BLOCK's only test pattern (D4); this file never prints it
$OldBbCommit = '2479301'                         # the commit before S5's (34adfdc): the old bb-login.ps1 (BBL-1)
$Dist = @('daemon/dist/index.js', 'mcp/dist/index.js', 'extension/dist/sw.js', 'extension/dist/content.js', 'extension/dist/offscreen.js', 'extension/dist/options.js')

function Load-S15 {
  if (Test-Path $StateFile) { $h = Import-Clixml $StateFile; foreach ($k in $h.Keys) { Set-Variable -Scope Global -Name $k -Value $h[$k] } }
  if (-not $global:S15Pids) { $global:S15Pids = @{} }
  if (-not $global:S15Done) { $global:S15Done = @() }
  if (-not $global:S15Actors) { $global:S15Actors = @{} }
  if (-not $global:S15BbWins) { $global:S15BbWins = @() }
  if (-not $global:S15Attempt) { $global:S15Attempt = 1 }
  if (-not $global:S15Born) { $global:S15Born = @{} }
}
function Save-S15 {
  $h = @{}
  foreach ($n in $Names) { $v = Get-Variable -Scope Global -Name $n -ValueOnly -ErrorAction SilentlyContinue; if ($null -ne $v) { $h[$n] = $v } }
  $h | Export-Clixml $StateFile
}

function Show-Lines([string[]]$Out) { foreach ($l in $Out) { Write-Host $l }; Write-S9Raw $Out }

# The tracked files' status outside the steps dir (S7 prep fixer 1, M1): the ledger and the record live in the steps
# dir and change during the wave; every other tracked path (e2e-test-plan.md section 4.22, recipes, fixtures, product
# code) stays guarded. Pre-flight requires it empty; the build block requires it equal before and after the build.
function Get-S15Tracked {
  @(git status --porcelain --untracked-files=no -- . ':(exclude)docs/plans/2026-10-24-step10-step8-follow-ups-steps')
}

# A PID the wave started, recorded with its creation time (S7 prep fixer 2, W1: every kill re-checks it).
function Set-S15Pid([string]$Key, [int]$Id) {
  $global:S15Pids[$Key] = $Id
  $global:S15Born[$Key] = Get-S10BornOf $Id
  Save-S15
}

# A process tree the wave started: the root identified by its recorded creation time and its command line naming one
# of the wave's node scripts; its descendants by Get-S10Descendants (creation time no earlier than the parent's, level
# by level - never s9-win.ps1's Get-ProcTree); only node/claude/cmd/conhost/esbuild (tsx's) are killed, never chrome.exe; each kill
# re-checks the creation time read when the tree was identified, then Test-SafeToKill; the leaves first.
function Stop-S15Tree([int]$Id, $RootBorn, [string]$What) {
  $table = Get-S10ProcTable
  $root = @($table | Where-Object { $_.Pid -eq $Id })
  if (-not $root.Count) { Say9 "$What (PID $Id) already gone"; return $true }
  if (-not ([long]$RootBorn -gt 0 -and $root[0].Born -eq [long]$RootBorn)) { Say9 "SKIP $Id reused (${What}: its creation time is not the one recorded when the wave started it) - not killed"; return $true }
  if ("$($root[0].Cmd)" -notmatch 'recipes[\\/](s10|s9|s9-actor|s6)\.ts') { Say9 "$What (PID $Id) is no longer the wave's node script - not touched"; return $true }
  $members = @(Get-S10Descendants $Id $table)
  $ok = $true
  $batch = $members
  # Pass 0 kills the identified tree; passes 1-2 a child a member started between the snapshot and its own kill
  # (Get-S10LateChildren: created no earlier than its parent, never a reused PID's). A process left alive -> $false.
  for ($pass = 0; $pass -le 2 -and $batch.Count; $pass++) {
    $kill = @($batch); [array]::Reverse($kill)   # the leaves first
    foreach ($x in $kill) {
      if (-not (Test-S10TreeKillable $x)) { Say9 "SKIP $($x.Pid) $($x.Name) in the tree of $Id - only node, claude, cmd, conhost and esbuild are ever killed (never chrome.exe) - left running"; $ok = $false; continue }
      if (-not (Stop-S15Pid $x.Pid "$What, tree of $Id" -Born $x.Born)) { $ok = $false }
    }
    $batch = @(Get-S10LateChildren $members (Get-S10ProcTable))
    if ($batch.Count) { Say9 "$What (tree of $Id): $($batch.Count) process(es) started after the tree was identified" }
    $members += $batch
  }
  if ($batch.Count) { Say9 "$What (tree of $Id): still gaining processes after 3 passes - not all ended"; $ok = $false }
  $ok
}

# One node script in the foreground, bounded by the block's deadline (BLOCK BUDGETS above): its output goes to a file
# and is printed when it ends (as the former direct call captured it); past the deadline its identified tree is ended and
# the block throws, so the stop procedure runs. Inside the stop procedure each call is bounded by 30 s instead.
function Invoke-S15Node([string]$Script, [string[]]$A) {
  $cap = if ($global:S15InStop) { 30 } else { [int][Math]::Floor(($global:S15Deadline - (Get-Date)).TotalSeconds) }
  if ($cap -le 0) { Fail-S15 "block ${Block}: its budget of $($global:S15BudgetS) s is used up before node $Script $($A[0]) (a block over its budget is a STOP, sheet section 1)" }
  $q = @($A | ForEach-Object { $s = "$_"; if ($s -eq '' -or $s -match '[\s"]') { '"' + ($s -replace '"', '\"') + '"' } else { $s } })
  $tag = [Guid]::NewGuid().ToString('N').Substring(0, 8)
  $o = Join-Path $env:S10_OUT "fg-$tag.out"; $e = Join-Path $env:S10_OUT "fg-$tag.err"
  $p = Start-Process -PassThru -WindowStyle Hidden -WorkingDirectory $Repo -FilePath node -ArgumentList (@('--import', 'tsx', $Script) + $q) -RedirectStandardOutput $o -RedirectStandardError $e
  $null = $p.Handle
  Set-S15Pid 'fg' $p.Id
  $ended = $p.WaitForExit($cap * 1000)
  if ($ended) { $p.WaitForExit() }
  $out = @(); if (Test-Path $o) { $out = @(Get-Content $o -Encoding UTF8) }
  $err = @(); if (Test-Path $e) { $err = @(Get-Content $e -Encoding UTF8) }
  if (-not $ended) {
    Show-Lines $out
    $k = Stop-S15Tree $p.Id $global:S15Born['fg'] 'the foreground node call over the budget'
    $global:S15Pids.Remove('fg'); Save-S15
    Fail-S15 "block ${Block}: node $Script $($A[0]) did not end within the block's budget ($cap s left); its process tree ended: $k"
  }
  $global:S15Pids.Remove('fg'); Save-S15
  Remove-Item -LiteralPath $o, $e -ErrorAction SilentlyContinue
  foreach ($l in $err) { Write-Host $l }
  @{ Code = $p.ExitCode; Out = $out }
}

# One s10.ts / s9.ts call in the foreground: lines printed and appended to the raw output; exit 2 (a STOP line) throws.
function S10 {
  $r = Invoke-S15Node 'recipes/s10.ts' ([string[]]$args)
  $global:S10Code = $r.Code; $global:S10Out = $r.Out
  Show-Lines $r.Out
  if ($global:S10Code -eq 2) { throw "s10.ts $($args[0]) printed a STOP line (exit 2)" }
}
function S9 {
  $r = Invoke-S15Node 'recipes/s9.ts' ([string[]]$args)
  $global:S9Code = $r.Code; $global:S9Out = $r.Out
  Show-Lines $r.Out
  if ($global:S9Code -eq 2) { throw "s9.ts $($args[0]) printed a STOP line (exit 2)" }
}
# s9-actor.ts start / end / extract, bounded the same way; its output lines are returned (the caller prints them).
function S9Actor { (Invoke-S15Node 'recipes/s9-actor.ts' ([string[]]$args)).Out }

# One s10.ts call in the background (a row with driver presses); its output goes to files, never the caller's pipe.
function S10Bg([string]$Name, [string[]]$A) {
  $p = Start-Process -PassThru -WindowStyle Hidden -WorkingDirectory $Repo -FilePath node -ArgumentList (@('--import', 'tsx', 'recipes/s10.ts') + $A) `
    -RedirectStandardOutput "$env:S10_OUT\$Name.out" -RedirectStandardError "$env:S10_OUT\$Name.err"
  $null = $p.Handle
  $global:S15Pids['bgname'] = $Name; Set-S15Pid 'bg' $p.Id
  Say9 "background s10.ts $($A[0]) PID $($p.Id) (tracked; the stop procedure ends it before any restore)"
  $p
}
function Wait-S10Bg($P, [string]$Name, [int]$TimeoutSec = 200) {
  $left = [int][Math]::Floor(($global:S15Deadline - (Get-Date)).TotalSeconds)
  $TimeoutSec = [Math]::Max(1, [Math]::Min($TimeoutSec, $left))   # never past the block's budget (BLOCK BUDGETS)
  if (-not $P.WaitForExit($TimeoutSec * 1000)) { Fail-S15 "the background s10.ts $Name did not end within $TimeoutSec s" }
  $global:S15Pids.Remove('bg'); $global:S15Pids.Remove('bgname'); Save-S15
  if (Test-Path "$env:S10_OUT\$Name.out") { Show-Lines @(Get-Content "$env:S10_OUT\$Name.out" -Encoding UTF8) }
  $code = $P.ExitCode
  Say9 "background s10.ts $Name exit $code"
  if ($code -eq 2) { throw "the background s10.ts $Name printed a STOP line (exit 2)" }
}

function Fail-S15([string]$m) { Stop9 $m; throw $m }

function Get-S15Listeners([int]$Port) {
  @(netstat -ano | ForEach-Object { if ($_ -match "^\s*TCP\s+\S*:$Port\s+\S+\s+LISTENING\s+(\d+)\s*$") { [int]$Matches[1] } } | Select-Object -Unique)
}

# One kill (S7 prep fixer 2, W1): only a process whose creation time equals the one recorded when the wave identified
# it (else `SKIP <pid> reused`: the wave's process is gone, the PID belongs to another); never chrome.exe, except
# SAVE-IDONLY's headless Chrome (-Headless, which Stop-S15Headless has already checked); then Test-SafeToKill.
function Stop-S15Pid([int]$Id, [string]$What, $Born = 0, [switch]$Headless) {
  $p = Get-CimInstance Win32_Process -Filter "ProcessId=$Id" -ErrorAction SilentlyContinue
  if (-not $p) { Say9 "$What (PID $Id) already gone"; return $true }
  $Born = [long]$Born
  if ($Born -le 0) { Say9 "SKIP $Id unidentified (${What}: no creation time was recorded when the wave identified it) - not killed"; return $false }
  $now = Get-S10Born $p
  if ($now -ne $Born) { Say9 "SKIP $Id reused (${What}: its creation time differs from the one recorded when the wave identified it) - not killed"; return $true }
  $name = "$($p.Name)".ToLower()
  if ($name -eq 'chrome.exe' -and -not $Headless) { Say9 "SKIP $Id chrome.exe ($What) - the wave never kills a Chrome process but its own headless one"; return $false }
  $t = Test-SafeToKill $Id
  Say9 "$What (PID $Id): $t"
  if (-not $t.StartsWith('safe:')) { return $false }
  Stop-Process -Id $Id -Force -ErrorAction SilentlyContinue
  Start-Sleep -Milliseconds 300
  -not (Get-Process -Id $Id -ErrorAction SilentlyContinue)
}

# The background s10.ts the wave started, and a foreground node call left by a tool-cap kill (-Block stop), each by
# its recorded PID: the whole tree (identified by its command line), each PID through Test-SafeToKill.
function Stop-S15Background {
  $ok = $true
  foreach ($k in 'bg', 'fg') {
    $id = $global:S15Pids[$k]
    if (-not $id) { continue }
    if (Stop-S15Tree ([int]$id) $global:S15Born[$k] "the $(if ($k -eq 'bg') { 'background s10.ts' } else { 'foreground node call' })") {
      $global:S15Pids.Remove($k); if ($k -eq 'bg') { $global:S15Pids.Remove('bgname') }; Save-S15
    } else { $ok = $false }
  }
  $ok
}

function Start-Actor([string]$Name) {
  $out = @(S9Actor start $Name --model sonnet)
  Show-Lines $out
  if (-not ($out -match 'started')) { Fail-S15 "the headless actor $Name did not start" }
  $global:S15Actors[$Name] = 'running'; Save-S15
}
function End-Actor([string]$Name) {
  $out = @(S9Actor end $Name)
  Show-Lines $out
  $global:S15Actors[$Name] = $(if ($out -match 'ended after') { 'ended' } else { 'end-unconfirmed' }); Save-S15
  if ($global:S15Actors[$Name] -ne 'ended') { Fail-S15 "the headless actor $Name did not exit within 30 s of closing its stdin (its PIDs are in the actors folder; Test-SafeToKill before any kill)" }
}
function End-AllActors {
  $ok = $true
  foreach ($n in @($global:S15Actors.Keys)) { if ($global:S15Actors[$n] -eq 'running') { try { End-Actor $n } catch { $ok = $false; Say9 "ending actor ${n} threw: $($_.Exception.Message)" } } }
  $ok
}

# SAVE-IDONLY's headless Chrome, if Browser.close left it alive (S7 prep fixer 2, W1): only chrome.exe processes that
# Test-S10HeadlessKillable accepts - created at or after the launch stamp block idonly recorded, the command line naming
# the throwaway --user-data-dir under %TEMP%\bridge-e2e\s15 - each re-checked by the creation time read here.
function Stop-S15Headless {
  $dir = Join-Path $env:S10_OUT 'idonly-profile'
  $launch = [long]$global:S15IdonlyLaunch
  if ($launch -le 0) { Say9 'headless Chrome: no launch stamp recorded (block idonly did not start one) - nothing killed'; return $true }
  $rows = @(Get-S10ProcTable | Where-Object { "$($_.Name)".ToLower() -eq 'chrome.exe' -and "$($_.Cmd)".ToLower().Contains($dir.ToLower()) })
  $ok = $true
  foreach ($x in $rows) {
    if (-not (Test-S10HeadlessKillable $x $launch $dir)) { Say9 "SKIP $($x.Pid) chrome.exe - not the wave's headless Chrome (launch stamp, profile under %TEMP%\bridge-e2e\s15) - not killed"; $ok = $false; continue }
    if (-not (Stop-S15Pid $x.Pid 'headless Chrome (the throwaway profile)' -Born $x.Born -Headless)) { $ok = $false }
  }
  if ($ok) { $global:S15Pids.Remove('headless'); Save-S15 }
  $ok
}

function Close-S15Extra {
  $ok = $true
  if ($global:R -and (Test-S9Live $global:R)) { Close-S9Window $global:R; if (Test-S9Live $global:R) { $ok = $false } }
  foreach ($h in @($global:S15BbWins)) { if (-not (Close-S10Foreign ([long]$h) 'bb-login own')) { $ok = $false } }
  if ($ok) { $global:S15BbWins = @(); Save-S15 }
  $ok
}

# Tabs, daemon, servers: what the stop procedure and the teardown share. $true when all of it ended.
function Stop-S15Processes {
  $ok = $true
  # Only the wave's own daemon (its PID recorded by block daemon) is ever asked to shut down or stopped.
  if (-not $global:S15Pids['daemon']) { Say9 'no daemon of this wave recorded - none touched' }
  if ($global:S15Pids['daemon'] -and @(Get-BridgeDaemon).Count -and (Test-Path (Join-Path $env:S10_OUT 'state.json'))) { try { S9 cleanup } catch { Say9 "cleanup threw: $($_.Exception.Message)" } }
  if ($global:S15Pids['daemon'] -and @(Get-BridgeDaemon).Count) {
    try { S9 daemon-shutdown } catch { Say9 "daemon-shutdown refused: $($_.Exception.Message)" }
    $t0 = Get-Date; while (@(Get-BridgeDaemon).Count -and ((Get-Date) - $t0).TotalSeconds -lt 5) { Start-Sleep -Milliseconds 250 }
    foreach ($d in @(Get-BridgeDaemon)) {
      if ($global:S15Pids['daemon'] -and [int]$d.ProcessId -eq [int]$global:S15Pids['daemon']) { if (-not (Stop-S15Pid ([int]$d.ProcessId) 'daemon' -Born $global:S15Born['daemon'])) { $ok = $false } }
      else { Say9 "a daemon PID $($d.ProcessId) is not the one this wave identified - not touched"; $ok = $false }
    }
  }
  foreach ($k in @('web', 'bbl')) { if ($global:S15Pids[$k]) { if (-not (Stop-S15Pid ([int]$global:S15Pids[$k]) "server $k" -Born $global:S15Born[$k])) { $ok = $false } } }
  $ok
}

function Invoke-S15Stop([string]$Reason) {
  $global:S15InStop = $true   # every node call of the stop procedure is bounded by 30 s, not by the block's deadline
  Stop9 "block ${Block}: $Reason - the stop procedure runs (restore and read-back, clean-up); then write the ledger and RETURN to the step agent"
  $b = $false; try { $b = Stop-S15Background } catch { Say9 "stopping the background s10.ts threw: $($_.Exception.Message)" }
  $a = $false; try { $a = End-AllActors } catch { Say9 "ending the actors threw: $($_.Exception.Message)" }
  try { if ($global:S15Pids['mem']) { [IO.File]::WriteAllText("$env:S10_OUT\save64-mem.txt.stop", (Now9)); Start-Sleep -Milliseconds 600; [void](Stop-S15Pid ([int]$global:S15Pids['mem']) 'memory sampler' -Born $global:S15Born['mem']); $global:S15Pids.Remove('mem') } } catch { }
  $hl = $false; try { $hl = Stop-S15Headless } catch { Say9 "ending the headless Chrome threw: $($_.Exception.Message)" }
  $x = $false; try { $x = Close-S15Extra } catch { Say9 "closing R / bb-login windows threw: $($_.Exception.Message)" }
  $r = $false; try { $r = Restore-S9All -Why "block ${Block}: $Reason" -Row 'R15-STOP' } catch { Say9 "Restore-S9All threw: $($_.Exception.Message)" }
  $p = $false; try { $p = Stop-S15Processes } catch { Say9 "the clean-up threw: $($_.Exception.Message)" }
  $global:S15Stopped = "${Block}: $Reason"
  Save-S15
  Say9 "STOPPED at block ${Block}. Restore: $(if ($r) { 'read back equal (RESTORE ok)' } else { 'FAILED - say so as line 1 of the return' }); processes: $(if ($p -and $b -and $a -and $hl -and $x) { 'ended' } else { 'NOT all ended (listed above)' }). Every later block refuses to run."
}

function Assert-Default([string]$Row) { S9 wait-safety --armed true --evaluate true --count 0 --row $Row --guard }

# ------------------------------------------------------------------------------------------------- framing blocks

function B-preflight {
  Say9 "R15 preflight (read-only) at $(Now9)"
  if (-not $Prep) { Fail-S15 'preflight needs -Prep <the S7 prep commit sha> (the rows must be committed before the build is loaded, S7.1)' }
  git merge-base --is-ancestor $Prep HEAD 2>$null
  if ($LASTEXITCODE -ne 0) { Fail-S15 "the S7 prep commit $Prep is not in HEAD" }
  Say9 "HEAD $(git rev-parse --short HEAD) contains the prep commit $Prep"
  $st = @(Get-S15Tracked)
  if ($st.Count) { Fail-S15 "$($st.Count) tracked file(s) modified outside the steps dir - the wave builds committed code only" }
  Say9 'tracked files: clean outside the steps dir (the ledger and the record may change there)'
  foreach ($f in $Dist) { $p = Join-Path $Repo $f; Say9 "dist before the build: $f $(if (Test-Path $p) { (Get-FileHash -Algorithm SHA256 $p).Hash.ToLower().Substring(0, 16) + '...' } else { 'absent' }) (record)" }
  if ((Get-BridgeClients) -gt 0) { Fail-S15 'a bridge MCP process is running (another session, or one descending from the runner) - it would join the wave''s daemon; the step agent asks the user to end it' }
  $daemons = @(Get-BridgeDaemon | ForEach-Object { [int]$_.ProcessId })
  foreach ($l in (Get-S15Listeners 9234)) { if ($daemons -notcontains $l) { Fail-S15 "port 9234 is held by PID $l, which is not a bridge daemon" } }
  Say9 "port 9234: $(if ((Get-S15Listeners 9234).Count) { 'held by the bridge daemon ' + ($daemons -join ',') + ' (the first client hands it over to the new build)' } else { 'free' })"
  foreach ($port in 8080, 8081, 8083, 8085) { $l = Get-S15Listeners $port; if ($l.Count) { Fail-S15 "port $port is already in use (PID $($l -join ','))" } }
  Say9 'ports 8080, 8081, 8083, 8085: free'
  if (-not @(Get-Process chrome -ErrorAction SilentlyContinue).Count) { Fail-S15 'Chrome is not running - starting it is not part of this wave' }
  Say9 "Chrome $((Get-Item (Get-S9Chrome)).VersionInfo.ProductVersion); node $(node --version)"
  $nodes = @(Get-CimInstance Win32_Process -Filter "Name='node.exe'" | ForEach-Object { "$($_.ProcessId)<-$($_.ParentProcessId)" })
  Say9 "node processes (pid<-parent): $($nodes -join ' ') (22152 is an unrelated host: never touched)"
  $c = Get-Command claude.exe -ErrorAction SilentlyContinue
  if (-not $c) { Fail-S15 'claude.exe not found on PATH - the headless MCP actors cannot start' }
  $global:S15Claude = $c.Source
  Say9 "claude.exe found (the actors' S9_CLAUDE)"
  if (-not (Test-Path "$HOME\miniconda3\python.exe")) { Fail-S15 'no python at %USERPROFILE%\miniconda3\python.exe' }
  $global:WinStart = @(Get-S9ChromeWindows).Count
  $global:S9ChromeStart = Get-S9ChromeStart
  Say9 "Chrome windows $($global:WinStart); Chrome start $($global:S9ChromeStart)"
  Get-S9KeyboardLayouts
  Say9 "bridge.token present: $(Test-Path (Join-Path $Repo 'bridge.token')); BRIDGE_TOKEN set in this shell: $(Test-Path Env:BRIDGE_TOKEN) (never read or printed here)"
  if (Test-Path $env:S9_RAW) { Say9 'note: r15-raw.txt already existed and is appended to' }
}

function B-build {
  $before = @(Get-S15Tracked)
  Say9 "tracked changes outside the steps dir before the build: $($before.Count)"
  Say9 'npm run build of the committed code (main tree)'
  $o = @(cmd /c "npm run build 2>&1")
  $rc = $LASTEXITCODE
  Show-Lines @($o | Select-Object -Last 12)
  Say9 "npm run build exit $rc ($($o.Count) lines; the last 12 shown)"
  if ($rc -ne 0) { Fail-S15 "npm run build exited $rc" }
  $after = @(Get-S15Tracked)
  if (($before -join "`n") -ne ($after -join "`n")) { Fail-S15 "the build changed the tracked status outside the steps dir ($($before.Count) line(s) before, $($after.Count) after) - it must not change any tracked file" }
  Say9 'git status: no tracked change after the build'
  Say9 '(the tracked status outside the steps dir is equal before and after the build; the steps dir holds the ledger)'
  foreach ($f in $Dist) { Say9 "dist after the build: $f $((Get-FileHash -Algorithm SHA256 (Join-Path $Repo $f)).Hash.ToLower().Substring(0, 16))... (record)" }
}

function B-servers {
  $PY = "$HOME\miniconda3\python.exe"
  $web = Start-Process -PassThru -WindowStyle Hidden -WorkingDirectory $Repo -FilePath $PY -ArgumentList '-I', '-m', 'http.server', '8080', '--bind', '127.0.0.1', '--directory', 'test-fixtures' -RedirectStandardOutput "$env:S10_OUT\http8080.out" -RedirectStandardError "$env:S10_OUT\http8080.err"
  $bbl = Start-Process -PassThru -WindowStyle Hidden -WorkingDirectory $Repo -FilePath $PY -ArgumentList '-I', '-m', 'http.server', '8085', '--bind', '127.0.0.1', '--directory', 'recipes/fixtures' -RedirectStandardOutput "$env:S10_OUT\http8085.out" -RedirectStandardError "$env:S10_OUT\http8085.err"
  Set-S15Pid 'web' $web.Id; Set-S15Pid 'bbl' $bbl.Id
  foreach ($x in @(@(8080, $web.Id), @(8085, $bbl.Id))) {
    $t0 = Get-Date
    while (-not ((Get-S15Listeners $x[0]) -contains [int]$x[1]) -and ((Get-Date) - $t0).TotalSeconds -lt 8) { Start-Sleep -Milliseconds 250 }
    if (-not ((Get-S15Listeners $x[0]) -contains [int]$x[1])) { Fail-S15 "the server on $($x[0]) (PID $($x[1])) is not listening" }
  }
  Say9 "servers listening on 127.0.0.1: http8080 (test-fixtures) PID $($web.Id), http8085 (recipes/fixtures) PID $($bbl.Id)"
}

function B-window {
  $global:W = Open-S9Window 'http://localhost:8080/e2e-playground.html?s9=w'
  $global:L0 = Get-S9Layout $global:W
  Say9 "W = $($global:W), keyboard layout $($global:L0)"
  Save-S15
  $global:PinnedBefore = Get-S9PinState $global:W
  Save-S15
  if (-not $global:PinnedBefore) {
    Say9 'the toolbar button is not pinned: one UIA-only pin attempt (no mouse)'
    if (-not (Set-S9Pin $global:W -Pin -UiaOnly)) {
      Fail-S15 'HUMAN GATE (pinning): the toolbar button is not pinned and UI Automation cannot pin it; pinning by mouse click is not pre-approved (#192, #202) - the step agent asks the user once'
    }
  }
  [void](Get-S9ActionTitle $global:W)
  Say9 "pin state found: pinned=$("$($global:PinnedBefore)".ToLower())"
}

function B-daemon {
  if (-not $global:S15LogMark) { $global:WaveStart = Now9 } else { $global:WaveStart = $global:S15LogMark }
  Save-S15
  Say9 "wave start $($global:WaveStart) (the daemon-log mark of S7.6)"
  S10 daemon-up
  $d = @(Get-BridgeDaemon)
  if ($d.Count -ne 1) { Fail-S15 "expected exactly 1 bridge daemon after daemon-up, found $($d.Count)" }
  Set-S15Pid 'daemon' ([int]$d[0].ProcessId)
  Say9 "daemon PID $($d[0].ProcessId)"
  S9 wait-alone --row R15-CLIENTS-START --timeout 5000
}

function B-reload {
  $rc = $null
  foreach ($try in 1, 2) {
    $o = @(powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\reload-extension.ps1)
    $rc = $LASTEXITCODE
    Show-Lines $o
    Say9 "reload-extension.ps1 exit $rc (attempt $try)"
    if ($rc -ne 2) { break }
  }
  if ($rc -ne 0) { Fail-S15 "the reload script exited $rc after one re-run on exit 2" }
  Show-Lines @(Get-BridgeLog 6)
  [void](Set-S9Foreground $global:W)
}

function B-setup {
  [void](Set-S9Foreground $global:W)
  S10 setup
  S9 wait-alone --row R15-SETUP --timeout 5000
}

function B-safe0 {
  S9 safe0
  $tuple = $null
  foreach ($l in $global:S9Out) { if ("$l" -match 'ROW SAFE-0 safety (safety armed=\S+ evaluate=\S+ blockedCount=\S+) \(reported after') { $tuple = $Matches[1] } }
  Say9 "SAFE-0 tuple: $(if ($tuple) { $tuple } else { 'not reported' }) (expected default: $Default)"
  if ($tuple -and $tuple -ne $Default) { Fail-S15 "found-state guard: SAFE-0 read '$tuple', not '$Default' - nothing was changed (the state may be the human's own setting; the step agent asks the user)" }
  if ($global:S9Code -ne 0) { Fail-S15 'SAFE-0 (Step 9''s check) did not pass after the reload: the loaded extension is not the build on disk' }
  S10 s10check
  if ($global:S10Code -ne 0) { Fail-S15 'SAFE-0''s Step 10 check did not pass: the daemon or the extension is not the Step 10 build on disk (no second reload: the reload block had its one re-run)' }
}

function B-console {
  $global:E = Open-S9ChromePage 'chrome://extensions'
  Save-S15
  $global:D = Open-S9WorkerConsole $global:E
  Save-S15
  [void](Set-S9Foreground $global:W)
}

function B-found {
  S9 probe --row R15-FOUND
  $global:O = Open-S9ChromePage $S9OptionsUrl
  Save-S15
  if (-not (Test-S9FoundState $global:O -Row 'R15-FOUND-guard')) { Save-S15; throw 'the found-state guard printed STOP' }
  Save-S15
  $s = $global:S9Found.State
  Say9 "FOUND STATE recorded: armed=$("$($s.armed)".ToLower()) evaluate=$("$($s.evaluate)".ToLower()) count=$($s.count) lines=$($s.lines) sha256=$(if ($s.sha256 -eq $S9EmptySha) { $s.sha256 } else { 'withheld(non-empty)' })"
  [void](Set-S9Foreground $global:W)
}

function B-rep0 {
  $global:R = Open-S9Window 'http://localhost:8080/e2e-playground.html?t5=s6-human'
  Save-S15
  if (-not (Set-S9Foreground $global:R)) { Fail-S15 'REP-0: its window R is not in the foreground' }
  Park-S9Cursor 'before REP-0'
  $s6 = Join-Path $env:S10_OUT 's6out'
  New-Item -ItemType Directory -Force $s6 | Out-Null
  $env:S6_OUT = $s6
  $r = Invoke-S15Node 'recipes/s6.ts' @('rep0')
  $o = $r.Out; $rc = $r.Code
  Show-Lines $o
  Say9 "REP-0 exit $rc (0 PASS, 1 FAIL, 3 NOT DISCRIMINATING - each recorded; 2 a set-up refusal)"
  if ($rc -eq 2) { Fail-S15 'REP-0 refused its set-up (exit 2): nothing measured' }
  Close-S9Window $global:R
  if (Test-S9Live $global:R) { Fail-S15 'REP-0: its window R did not close' }
  $global:R = $null; Save-S15
  [void](Set-S9Foreground $global:W)
}

# ------------------------------------------------------------------------------------------------- BBL-1

function Run-BbLogin([string]$Leg, [string]$Script, [string]$Page) {
  $log = "$env:S10_OUT\http8085.err"
  $from = if (Test-Path $log) { @(Get-Content $log).Count } else { 0 }
  $out = "$env:S10_OUT\bbl-$Leg.txt"
  Say9 "BBL-1 $Leg begins ($(if ($Script -like '*old*') { "old script from $OldBbCommit" } else { 'recipes/bb-login.ps1' }), page $Page, server log line $from)"
  $o = @(powershell -NoProfile -ExecutionPolicy Bypass -File $Script -DryRunBase 'http://127.0.0.1:8085/' -DryRunPage $Page)
  $rc = $LASTEXITCODE
  [IO.File]::WriteAllText($out, (($o | ForEach-Object { "$_" }) -join "`n") + "`n", (New-Object Text.UTF8Encoding $false))
  Show-Lines $o
  $h = $null
  foreach ($l in $o) { if ("$l" -match ' own window (\d+) opened') { $h = [long]$Matches[1] } }
  if ($h) { $global:S15BbWins = @($global:S15BbWins) + $h; Save-S15 }
  Start-Sleep -Milliseconds 1500   # the server writes its request lines; the redirect of a delayed leg may land
  S10 bbl-judge --leg $Leg --out $out --log $log --from $from --exit $rc
  if ($h) { if (-not (Close-S10Foreign $h 'bb-login own')) { Fail-S15 "BBL-1 ${Leg}: bb-login's own window $h did not close" } ; $global:S15BbWins = @($global:S15BbWins | Where-Object { $_ -ne $h }); Save-S15 }
  [void](Set-S9Foreground $global:W)
}

function B-bbl1 {
  $old = "$env:S10_OUT\bb-login-old-$OldBbCommit.ps1"
  $txt = @(git show "${OldBbCommit}:recipes/bb-login.ps1")
  if ($LASTEXITCODE -ne 0 -or -not $txt.Count) { Fail-S15 "git show ${OldBbCommit}:recipes/bb-login.ps1 failed" }
  [IO.File]::WriteAllText($old, (($txt -join "`r`n") + "`r`n"), (New-Object Text.UTF8Encoding $false))
  Say9 "old bb-login.ps1 written outside the repo (from $OldBbCommit, sha256 $((Get-FileHash -Algorithm SHA256 $old).Hash.ToLower().Substring(0, 16))...)"
  Run-BbLogin 'delayed-old' $old 'bb-standin-delayed.html'
  Run-BbLogin 'delayed-new' '.\recipes\bb-login.ps1' 'bb-standin-delayed.html'
}

function B-bbl2 {
  Run-BbLogin 'stuck' '.\recipes\bb-login.ps1' 'bb-standin-stuck.html'
  Run-BbLogin 'elsewhere' '.\recipes\bb-login.ps1' 'bb-standin-elsewhere.html'
}

# ------------------------------------------------------------------------------------------------- rows, no state change

# MCPF-1 in three blocks (S7 prep fixer 1, m2: 10 actor turns do not fit one call): click (with the focus question),
# type, press; each its own actor, ended before the next client; the press block prints the tally of the attempt.
function Invoke-S15Mcpf([string]$Kind) {
  [void](Set-S9Foreground $global:W)
  Start-Actor "mcpf-$Kind"
  S10 mcpf --kind $Kind --actor "mcpf-$Kind"
  End-Actor "mcpf-$Kind"
  S9 wait-alone --row "MCPF-1-$Kind-end" --timeout 15000
  [void](Set-S9Foreground $global:W)
}
function B-mcpf-click {
  Invoke-S15Mcpf 'click'
}
function B-mcpf-type {
  Invoke-S15Mcpf 'type'
}
function B-mcpf-press {
  Invoke-S15Mcpf 'press'
}

function B-cap {
  S10 cap1-sdk
  Start-Actor 'cap'
  S10 cap1-mcp --actor cap
  End-Actor 'cap'
  S9 wait-alone --row CAP-1-end --timeout 15000
}

function B-sw1 {
  [void](Set-S9Foreground $global:W)
  try { Select-S9Tab $global:W 'S9 W human tab' } catch { Fail-S15 "SW-1: W's own tab could not be selected: $($_.Exception.Message)" }
  Park-S9Cursor 'before SW-1'
  S10 sw1
  [void](Set-S9Foreground $global:W)
}

function B-pop2 {
  [void](Set-S9Foreground $global:W)
  S10 pop2 --leg a
  [void](Set-S9Foreground $global:W)
  S10 pop2 --leg b
  [void](Set-S9Foreground $global:W)
}

function B-save-a {
  S10 save-build 1m
  S10 save-build 4m
  S10 save-build surr
  S10 save-build json
  S10 save-build 4m --tab close
  S10 save-sdk SAVE-1M 1m
  Start-Actor 'save'
  S10 save-mcp SAVE-1M 1m --actor save
  End-Actor 'save'
  S10 save-sdk SAVE-4M 4m
  S10 save-surr
  S10 save-sdk SAVE-JSON json
  S10 save-refuse
  S10 save-hold
  S10 save-close
  S9 wait-alone --row SAVE-A-end --timeout 15000
}

function B-savefix {
  S10 save-build fix
  S10 savefix-sdk
  Start-Actor 'fix'
  S10 savefix-mcp --actor fix
  End-Actor 'fix'
  $tr = Join-Path $env:S9_ACTORS 'fix.transcript.txt'
  Show-Lines @(S9Actor extract fix --out $tr | ForEach-Object { "$_" -replace [regex]::Escape($tr), '<actors>\fix.transcript.txt' })
  S10 savefix-judge --transcript $tr
  S9 wait-alone --row SAVE-FIX-end --timeout 15000
}

function B-save-64 {
  S10 save-build 64m
  $mf = "$env:S10_OUT\save64-mem.txt"
  $mp = Start-S10Mem $mf
  Set-S15Pid 'mem' $mp.Id
  Start-Sleep -Milliseconds 1000
  try { S10 save-sdk SAVE-64 64m } finally { Start-Sleep -Milliseconds 1000; Stop-S10Mem $mf $mp; $global:S15Pids.Remove('mem'); Save-S15 }
  S10 mem-record --file $mf
}

function B-save-64-mcp {
  S10 save-build 64m
  Start-Actor 'big'
  S10 save-mcp SAVE-64 64m --actor big
  End-Actor 'big'
  S9 wait-alone --row SAVE-64-mcp-end --timeout 15000
}

function B-prim {
  S10 save-build 64m
  S10 prim
  S9 wait-safety --armed true --evaluate true --count 0 --row SAVE-PRIM-after --timeout 30000 --guard
}

function B-idonly {
  $dir = Join-Path $env:S10_OUT 'idonly-profile'
  if (Test-Path $dir) { Remove-Item -LiteralPath $dir -Recurse -Force }
  New-Item -ItemType Directory -Force $dir | Out-Null
  $port = $null
  foreach ($p in 9301..9399) { if (-not (Get-S15Listeners $p).Count) { $port = $p; break } }
  if (-not $port) { Fail-S15 'SAVE-IDONLY: no free port in 9301-9399' }
  $before = @(Get-S10HeadlessPids $dir)
  if ($before.Count) { Fail-S15 'SAVE-IDONLY: a Chrome already uses the throwaway profile' }
  # The launch stamp (W1): only a chrome.exe created at or after it, naming this profile, may ever be killed.
  $global:S15IdonlyLaunch = [DateTime]::UtcNow.Ticks; Save-S15
  $h = Start-Process -PassThru -FilePath (Get-S9Chrome) -ArgumentList '--headless=new', "--user-data-dir=$dir", "--remote-debugging-port=$port", '--no-first-run', '--no-default-browser-check', 'about:blank'
  Set-S15Pid 'headless' $h.Id
  Say9 "headless Chrome PID $($h.Id) on 127.0.0.1:$port with a throwaway profile under the wave's folder (never the user's profile)"
  $t0 = Get-Date
  while (-not (Get-S15Listeners $port).Count -and ((Get-Date) - $t0).TotalSeconds -lt 15) { Start-Sleep -Milliseconds 250 }
  if (-not (Get-S15Listeners $port).Count) { Fail-S15 "SAVE-IDONLY: the headless Chrome does not listen on $port within 15 s" }
  try { S10 idonly --port $port } finally {
    $t0 = Get-Date
    while (@(Get-S10HeadlessPids $dir).Count -and ((Get-Date) - $t0).TotalSeconds -lt 10) { Start-Sleep -Milliseconds 250 }
    $left = @(Get-S10HeadlessPids $dir)
    Say9 "headless Chrome processes left after Browser.close: $($left.Count)"
    if ($left.Count -and -not (Stop-S15Headless)) { Fail-S15 'SAVE-IDONLY: the headless Chrome did not end' }
    $global:S15Pids.Remove('headless'); Save-S15
    Start-Sleep -Milliseconds 500
    Remove-Item -LiteralPath $dir -Recurse -Force -ErrorAction SilentlyContinue
    Say9 "throwaway profile removed: $(-not (Test-Path $dir))"
  }
}

function B-save-ttl {
  S10 save-build 4m
  S10 save-ttl --idle-s 330
}

# ------------------------------------------------------------------------------------------------- rows that change the state

function B-r3 {
  # R15-3 (#212): SAFE-3's expected text, the options window O visible beside W; occluder diagnostics and the cursor
  # printed before the re-arm; the fixed cursor park before every guard. A window above O -> STOP (exempting it is the
  # user's call).
  Park-S9Cursor 'before the R15-3 placement'
  if (-not (Find-S10FreePlacement $global:W $global:O 'R15-3')) { Fail-S15 'R15-3 placement guard: W and O are not side by side, uncovered by each other and by any window above O (no occluder), on a work area and restored' }
  Park-S9Cursor 'before placement-before-switch'
  if (-not (Test-S10Placement $global:W $global:O 'placement-before-switch' -Row 'R15-3')) { Fail-S15 'R15-3 placement guard (before the switch): an occluder above O, or W and O not side by side' }
  $global:S15Touched = $true; Save-S15
  [void](Set-S9Switch $global:O -Which armed -On $false)
  Wait-S9ActionTitle $global:W $S9TitleOff 1000
  S9 call R15-3 snap snapshot a --expect DISARMED:all
  Read-S9OptionsLines $global:O
  Start-Sleep -Milliseconds 1500
  Park-S9Cursor 'before placement-before-click'
  Write-S10Cursor 'before the re-arm'
  if (-not (Test-S10Placement $global:W $global:O 'placement-before-click' -Row 'R15-3')) { Fail-S15 'R15-3 placement guard before the toolbar click: an occluder above O (diagnostics above), or W and O not side by side' }
  [void](Invoke-S9ActionButton $global:W)
  Wait-S9ActionTitle $global:W $S9TitleArmed 1000
  $reached = Wait-S9OptionsStatus $global:O 'Bridge armed.' 2000
  Read-S9OptionsLines $global:O
  [void](Read-S9SafetyState $global:O)
  if (-not $reached) {
    Say9 'R15-3 supplementary read (record, not a re-run; nothing pressed): O brought to the front'
    [void](Set-S9Foreground $global:O); Read-S9OptionsLines $global:O; [void](Set-S9Foreground $global:W)
  }
  Assert-Default 'R15-3-end'
}

function B-savedis {
  S10 save-build 4m
  $global:S15Touched = $true; Save-S15
  Park-S9Cursor 'before SAVE-DISARM'
  $p = S10Bg 'save-disarm' @('save-disarm')
  Invoke-S9PressWhenReady $global:W -Row 'SAVE-DISARM'
  Wait-S9ActionTitle $global:W $S9TitleOff 2000
  Invoke-S9WhenReady -Row 'SAVE-DISARM-rearm' -Action { Start-Sleep -Milliseconds 1500; [void](Invoke-S9ActionButton $global:W) }
  Wait-S9ActionTitle $global:W $S9TitleArmed 2000
  Wait-S10Bg $p 'save-disarm'
  Assert-Default 'SAVE-DISARM-end'
}

function B-savejs {
  S10 save-build 4m
  $global:S15Touched = $true; Save-S15
  $p = S10Bg 'save-jsoff' @('save-jsoff')
  Invoke-S9WhenReady -Row 'SAVE-JSOFF' -Action { [void](Set-S9Switch $global:O -Which evaluate -On $false) }
  Wait-S9ActionTitle $global:W $S9TitleJsOff 2000
  Invoke-S9WhenReady -Row 'SAVE-JSOFF-on' -Action { [void](Set-S9Switch $global:O -Which evaluate -On $true) }
  Wait-S9ActionTitle $global:W $S9TitleArmed 2000
  Wait-S10Bg $p 'save-jsoff'
  Assert-Default 'SAVE-JSOFF-end'
}

function B-saveblk {
  S10 save-build 4m --tab blk
  $global:S15Touched = $true; Save-S15
  $p = S10Bg 'save-block' @('save-block')
  Invoke-S9WhenReady -Row 'SAVE-BLOCK' -Action { [void](Set-S9BlockList $global:O -Lines @($BlkPattern)) }
  Invoke-S9WhenReady -Row 'SAVE-BLOCK-unblock' -Action { [void](Set-S9BlockList $global:O -Lines @()) }
  Wait-S10Bg $p 'save-block'
  Assert-Default 'SAVE-BLOCK-end'
}

function B-jsd {
  # MCPF-1's disarmed leg needs its page baseline read while JavaScript is still on (evaluate), so it is taken here.
  S10 mcpf-off-prep
  $global:S15Touched = $true; Save-S15
  [void](Set-S9Switch $global:O -Which evaluate -On $false)
  Wait-S9ActionTitle $global:W $S9TitleJsOff 2000
  S9 wait-safety --armed true --evaluate false --count 0 --row JSD-jsoff --guard
  S10 jsd --state jsoff
  Start-Actor 'jsd'
  S10 jsd-mcp --state jsoff --actor jsd
  End-Actor 'jsd'
  S9 wait-alone --row JSD-jsoff-end --timeout 15000
}

function B-off {
  # The bridge turned off by the toolbar on top of JavaScript off, so DISARMED must win. JavaScript is off from block
  # jsd when jsd ran in this attempt; otherwise (a resume that skipped jsd) this block takes MCPF-1-off's baseline and
  # turns JavaScript off itself from the found state, through the same options-page path, recorded as part of its
  # row (S7 prep fixer 1, M3).
  if ($global:S15Done -contains 'jsd') {
    Say9 'OFF set-up: block jsd ran in this attempt - JavaScript is off and the MCPF-1-off baseline is taken'
  } else {
    Say9 'OFF set-up: block jsd did not run in this attempt - this block takes the MCPF-1-off baseline and turns JavaScript off itself (part of its row)'
    Assert-Default 'OFF-setup-found'
    S10 mcpf-off-prep
    $global:S15Touched = $true; Save-S15
    [void](Set-S9Switch $global:O -Which evaluate -On $false)
    Wait-S9ActionTitle $global:W $S9TitleJsOff 2000
  }
  $global:S15Touched = $true; Save-S15
  S9 wait-safety --armed true --evaluate false --count 0 --row OFF-start --guard
  [void](Set-S9Foreground $global:W)
  $pressed = Invoke-S9ActionButton $global:W | Select-Object -Last 1
  Wait-S9ActionTitle $global:W $S9TitleOff 2000
  S9 wait-safety --armed false --row OFF-disarmed --guard
  S10 jsd --state off
  Start-Actor 'off'
  S10 jsd-mcp --state off --actor off
  S10 mcpf-off --actor off
  End-Actor 'off'
  S9 wait-alone --row OFF-actor-end --timeout 15000
  Start-Sleep -Milliseconds 1500
  [void](Invoke-S9ActionButton $global:W)
  Wait-S9ActionTitle $global:W $S9TitleJsOff 2000
  S9 wait-safety --armed true --evaluate false --count 0 --row OFF-rearmed --guard
  [void](Set-S9Switch $global:O -Which evaluate -On $true)
  Wait-S9ActionTitle $global:W $S9TitleArmed 2000
  Assert-Default 'OFF-end'
  S10 mcpf-off-judge
  S10 jsd --state on
  Start-Actor 'on'
  S10 jsd-mcp --state on --actor on
  End-Actor 'on'
  S9 wait-alone --row JSD-on-end --timeout 15000
  Say9 "OFF block: the disarm press was at $pressed (record)"
}

# ------------------------------------------------------------------------------------------------- restore, logs, teardown

function B-restore {
  $ok = Restore-S9Safety 'R15-END'
  if (-not $ok) { Fail-S15 'RESTORE FAILED: the safety state read back at the end differs from the found state (S7.4)' }
  S9 probe --row R15-END
  $global:S15Touched = $false; Save-S15
  Say9 'RESTORED: armed, JavaScript and the block-list sha256 read back equal to the found state (stored page, daemon.status, title)'
}

function B-logs {
  $bad = @()
  $con = Join-Path $env:S10_OUT 'r15-console.txt'
  Read-S9WorkerConsole $global:D -Out $con
  if (Test-Path $con) { S10 scan --mode console --file $con; if ($global:S10Code -eq 1) { $bad += 'the worker console' }; if ($global:S10Code -eq 3) { Say9 'R15-LOGS worker console: NOT MEASURED (the CHECK line above says why: no positive control line, or token=not found)' } }
  else { Say9 'R15-LOGS worker console: no capture - NOT MEASURED' }
  $since = if ($global:S15LogMark) { $global:S15LogMark } else { $global:WaveStart }
  S10 scan-log --since $since --copy "$Steps\S7-daemon-log.txt"
  if ($global:S10Code -ne 0) { $bad += 'daemon.log' }
  foreach ($n in @($global:S15Actors.Keys | Sort-Object)) {
    $tr = Join-Path $env:S9_ACTORS "$n.transcript.txt"
    $o = @(S9Actor extract $n --out $tr)
    Say9 "actor ${n}: transcript extracted ($(@($o).Count) line(s) of output; path not printed)"
    S10 scan --mode transcript --file $tr
    if ($global:S10Code -ne 0) { $bad += "actor $n's transcript" }
  }
  if ($bad.Count) { Fail-S15 "R15-LOGS FAILS: a count is not 0 in $($bad -join ', ') (counts above; S7.6) - nothing of it is committed" }
}

function B-teardown {
  S9 cleanup
  $left = ''
  foreach ($l in $global:S9Out) { if ("$l" -match 'cleanup: still listed (.*)$') { $left = $Matches[1].Trim() } }
  if ($left -and $left -ne 'none') { Fail-S15 "teardown: tab(s) still listed after cleanup: $left" }
  if (-not (Close-S15Extra)) { Fail-S15 'teardown: window R or a bb-login window did not close' }
  $desk = Restore-S9Desk
  if (-not $desk) { Fail-S15 'RESTORE desk FAILED at the teardown (pin state, layout or driver windows not as found)' }
  if (-not (Stop-S15Processes)) { Fail-S15 'a daemon or server of this wave did not end (listed above)' }
  foreach ($port in 9234, 8080, 8081, 8083, 8085) { $l = Get-S15Listeners $port; if ($l.Count) { Fail-S15 "port $port still held by PID $($l -join ',')" } }
  $hl = @(Get-S10HeadlessPids (Join-Path $env:S10_OUT 'idonly-profile'))
  if ($hl.Count) { Fail-S15 "teardown: $($hl.Count) headless Chrome process(es) still run" }
  Say9 "ports 9234, 8080, 8081, 8083, 8085 free; Chrome windows $(@(Get-S9ChromeWindows).Count) (found $($global:WinStart)); bridge MCP processes $(Get-BridgeClients); headless Chrome 0"
  S10 scan --mode committed --file $env:S9_RAW --copy "$Steps\S7-run-raw.txt"
  if ($global:S10Code -ne 0) { Fail-S15 'teardown: the raw output''s committed-file scan did not pass - it stays outside the repo (#213: a teardown scan failure is a STOP)' }
  S10 values-clean
}

function B-status {
  foreach ($n in $Names) {
    $v = Get-Variable -Scope Global -Name $n -ValueOnly -ErrorAction SilentlyContinue
    if ($n -eq 'S9Found' -and $v) { $v = "default=$($v.Default)" }
    if ($n -eq 'S9WinIds' -and $v) { $v = ($v.Keys -join ',') }
    if ($n -eq 'S15Claude' -and $v) { $v = 'set' }
    if ($n -eq 'S15Resume' -and $v) { $v = "attempt=$($v.Attempt) skip=$(@($v.Skip) -join ',') mark=$($v.Mark)" }
    if (($n -eq 'S15Pids' -or $n -eq 'S15Actors') -and $v) { $v = (($v.Keys | ForEach-Object { "$_=$($v[$_])" }) -join ' ') }
    Write-Host ("{0} = {1}" -f $n, ($v -join ','))
  }
  Write-Host "daemon PIDs now: $((@(Get-BridgeDaemon | ForEach-Object { $_.ProcessId })) -join ',')"
}

function B-reset {
  $resume = $null
  if ($Attempt -or $Skip.Count) {
    $usage = 'the only resume is -Block reset -Attempt <stored attempt + 1> -Skip <every row block done, plus the stopped block when it is a row block>'
    if (-not (Test-Path $StateFile)) { Write-Host "USAGE: no stored state to resume from - $usage; nothing changed"; exit 3 }
    $h = Import-Clixml $StateFile
    $prev = if ($h['S15Attempt']) { [int]$h['S15Attempt'] } else { 1 }
    if (-not $h['S15Stopped']) { Write-Host "USAGE: the stored attempt $prev is not stopped - $usage; nothing changed"; exit 3 }
    if ($Attempt -ne $prev + 1) { Write-Host "USAGE: -Attempt $Attempt refused (the stored attempt is $prev) - $usage; nothing changed"; exit 3 }
    $stopAt = "$($h['S15Stopped'])".Split(':')[0]
    $done = @($h['S15Done'])
    $prevSkip = if ($h['S15Resume']) { @($h['S15Resume'].Skip) } else { @() }
    $must = @($Order | Where-Object { $RowBlocks -contains $_ -and (($done -contains $_) -or ($prevSkip -contains $_) -or ($_ -eq $stopAt)) })
    $sk = @($Skip | ForEach-Object { "$_".Split(',') } | ForEach-Object { $_.Trim() } | Where-Object { $_ })
    $notRow = @($sk | Where-Object { $RowBlocks -notcontains $_ })
    if ($notRow.Count) { Write-Host "USAGE: -Skip names framing block(s) $($notRow -join ',') - only row blocks are skipped; nothing changed"; exit 3 }
    $missing = @($must | Where-Object { $sk -notcontains $_ })
    $extra = @($sk | Where-Object { $must -notcontains $_ })
    if ($missing.Count -or $extra.Count) { Write-Host "USAGE: -Skip must be exactly '$($must -join ',')' (rows already observed, or the stopped row block) - missing '$($missing -join ',')', extra '$($extra -join ',')'; nothing changed"; exit 3 }
    $mark = if ($h['S15LogMark']) { $h['S15LogMark'] } else { $h['WaveStart'] }
    if (-not $mark) { Write-Host 'USAGE: the first attempt''s daemon-log mark is not stored; nothing changed'; exit 3 }
    $resume = @{ Attempt = $Attempt; Skip = @($Order | Where-Object { $sk -contains $_ }); Mark = $mark; Line = "RESUME attempt ${Attempt}: $($sk -join ', ') observed in an earlier attempt or stopped in one, not re-run" }
  } elseif (-not $global:S15Stopped -and -not ($global:S15Done -contains 'teardown')) { Say9 'reset refused: the wave is neither stopped nor torn down'; exit 3 }
  $stamp = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ')
  foreach ($f in 'r15-globals.clixml', 'r15-raw.txt', 'state.json') { $x = Join-Path $env:S10_OUT $f; if (Test-Path $x) { Rename-Item $x "$f.$stamp" } }
  Write-Host "archived the wave's state files with suffix .$stamp; a new attempt starts at preflight"
  if ($resume) {
    @{ S15Resume = $resume; S15LogMark = $resume.Mark; S15Done = @(); S15Attempt = $resume.Attempt; S15Actors = @{} } | Export-Clixml $StateFile
    Write-Host $resume.Line; Write-S9Raw $resume.Line
    $l2 = "RESUME attempt $($resume.Attempt): blocks $(@($Order | Where-Object { $resume.Skip -notcontains $_ }) -join ', '); daemon.log mark $($resume.Mark) (the first attempt's)"
    Write-Host $l2; Write-S9Raw $l2
  }
}

# ------------------------------------------------------------------------------------------------- main

Load-S15
if ($global:S15Claude) { $env:S9_CLAUDE = $global:S15Claude }
if ($Block -eq 'status') { B-status; exit 0 }
if ($Block -eq 'reset') { B-reset; exit 0 }
if ($global:S15Stopped) { Write-Host "NOT RUN: the wave stopped at '$($global:S15Stopped)' (its STOP line is in the raw output). RETURN to the step agent."; exit 3 }
if ($Block -eq 'stop') { Invoke-S15Stop $(if ($Why) { $Why } else { 'a STOP the runner met outside a block' }); exit 2 }
if ($Attempt -or $Skip.Count) { Write-Host 'NOT RUN: -Attempt and -Skip belong to -Block reset only'; exit 3 }
$RunOrder = @($Order)
if ($global:S15Resume) {
  $RunOrder = @($Order | Where-Object { @($global:S15Resume.Skip) -notcontains $_ })
  if (@($global:S15Resume.Skip) -contains $Block) { Write-Host "NOT RUN: block $Block is skipped in this resume ($($global:S15Resume.Line))"; exit 3 }
}
$i = $RunOrder.IndexOf($Block)
if ($i -gt 0 -and -not ($global:S15Done -contains $RunOrder[$i - 1])) { Write-Host "NOT RUN: block $Block needs block $($RunOrder[$i - 1]) first (the sheet's order$(if ($global:S15Resume) { ' minus the resume''s skipped blocks' }))"; exit 3 }
if ($global:S15Done -contains $Block) { Write-Host "NOT RUN: block $Block is done (no block runs twice in an attempt)"; exit 3 }
if ($global:S15Resume -and $i -gt 0 -and $Order.IndexOf($RunOrder[$i - 1]) -ne $Order.IndexOf($Block) - 1) { Say9 $global:S15Resume.Line }
$global:S15InStop = $false
$global:S15BudgetS = if ($BudgetS.ContainsKey($Block)) { [int]$BudgetS[$Block] } else { $DefaultBudgetS }
$global:S15Deadline = (Get-Date).AddSeconds($global:S15BudgetS)
Say9 "BLOCK $Block begins (attempt $($global:S15Attempt); budget $($global:S15BudgetS) s, then the block stops itself)"
try {
  & "B-$Block"
  if (-not ($global:S15Done -contains $Block)) { $global:S15Done = @($global:S15Done) + $Block }
  Save-S15
  Say9 "BLOCK $Block done"
  exit 0
} catch {
  Invoke-S15Stop $_.Exception.Message
  exit 2
}
