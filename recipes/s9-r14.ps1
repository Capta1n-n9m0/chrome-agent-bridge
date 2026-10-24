# recipes/s9-r14.ps1: the block runner of Run 14 (Step 10 stage S1: Step 9's live follow-ups; docs/e2e-test-plan.md
# section 4.21; wave sheet docs/plans/2026-10-24-step10-step8-follow-ups-steps/S1-wave-sheet.md). Windows PowerShell 5.1.
# Written 2026-10-25 by the S1 prep builder, before any R14 row ran; NOT run against Chrome by its author (the prep
# stage may not touch Chrome) - its parse, the S9Geo type and the rect/JSON path were dry-run without Chrome.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\s9-r14.ps1 -Block <name> [-Prep <sha>] [-DelayMs <ms>] [-Why <text>]
#
# Why a runner: the PowerShell tool keeps no state between calls (Run 13 needed a scratchpad wrapper), and #193 needs
# ONE stop procedure. Each call runs ONE block of the wave sheet, in the sheet's order, with the wave's globals kept in
# $env:S9_OUT\r14-globals.clixml between calls. Blocks, in order:
#   preflight -Prep <sha>  read-only: the prep commit in HEAD, tracked files clean, dist = Step 9's build (hashes below),
#                          no bridge MCP process, port 9234 free or the daemon's, 8080/8081/8083 free, Chrome running
#   servers                fixture servers 8080, 8081 (python http.server) and the THREADED redirect server 8083
#   window                 the driver window W; the pin state read by UIA; not pinned -> a UIA-only pin attempt;
#                          still not pinned -> STOP (human gate: pinning by mouse click needs the user, #192/#202)
#   setup                  the wave mark; s9.ts setup (the first client spawns the daemon); E = chrome://extensions;
#                          D = the worker's console (S1.6)
#   safe0                  SAFE-0's check, text unchanged (S1.2); its tuple read first: reported and not the default
#                          -> STOP (found-state guard, no reload); on a FAIL the one reload by reload-extension.ps1
#                          (one re-run on exit 2), then SAFE-0 again; a second FAIL or another exit -> STOP
#   found                  the options page O; the found-state record and its guard (anything but armed + JavaScript
#                          on + an empty list -> STOP before any change)
#   rel3 | pop1 | r3 | type [-DelayMs] | ctl | 5c     the rows R14-REL-3, R14-POP-1, R14-3, R14-4b, R14-5c's positive
#                          control, R14-5c (type runs a second time only as the one pre-registered re-run)
#   restore                the safety state restored and read back equal to the found state (S1.4)
#   logs                   the worker console and daemon.log captured and counted (S1.6); daemon log copied only at 0
#   teardown               tabs closed, desk restored (pin, layout, windows), daemon and servers stopped, ports free,
#                          the raw output copied into the steps dir only after its committed-file scan passes
#   status                 prints the globals (for the ledger); runs even after a stop
#   stop -Why <text>       the stop procedure by hand, for a STOP the runner met outside a block
#   reset                  archives a finished or stopped wave's state (a new wave needs the step agent's decision)
#   reset -Attempt 3 -Skip rel3,pop1 [-LogMark <iso>]
#                          S1 wave fixer (Return 2, ruling (b); narrowed in round 2, S1-wave-verifier F2): the ONLY
#                          resume. Accepted only as written (attempt 3, both names) and only when the stored state is
#                          attempt 2's (stopped at r3, done exactly preflight..pop1, not itself a resume); anything else
#                          prints `USAGE: ...` (never `STOP:`), exits 3 and changes nothing. Then the same archive and a
#                          RESUME: attempt 3 runs the order WITHOUT rel3 and pop1, printing `RESUME attempt 3: rel3,
#                          pop1 recorded in attempt 2, not re-run`. A skipped block refuses to run (exit 3); every other
#                          block keeps the order check (the block before it in the order minus the skipped ones).
#                          Attempt 2's WaveStart is carried as S14LogMark (ruling (d)); -LogMark (the record's attempt-2
#                          `wave start <iso>`) only when it is not stored. With no current globals file the newest
#                          archived one (r14-globals.clixml.<stamp>) is the source, under the same checks.
#
# THE STOP PROCEDURE (#193; the sheet's STOP RULE): a guard prints a line beginning `STOP:` and throws; any other throw
# in a block is caught the same way. Then, in this order: `STOP: block <b>: <why> ...`; the background r14-type ended
# (if running; by its identified PID tree, Test-SafeToKill); Restore-S9All (idempotent: the
# safety half restores and reads back only when the found state was recorded, and presses nothing that is already as
# found; then pin, layout, the driver windows); the tabs, the daemon and the servers are stopped; the wave is marked
# stopped, and every later block except status refuses to run (exit 3). Exit codes: 0 block done (a row's CHECK may
# still say FAIL - that is recorded, not a stop), 2 STOP (procedure run; RETURN to the step agent), 3 not run.
#
# Every line printed here, by s9-win.ps1 and by s9.ts, is also appended (UTF-8) to $env:S9_RAW (r14-raw.txt), which
# the live verifier greps for STOP lines (S1.5, Stage 0 F20). No token, title or URL of a user tab is ever printed.
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('preflight', 'servers', 'window', 'setup', 'safe0', 'found', 'rel3', 'pop1', 'r3', 'type', 'ctl', '5c', 'restore', 'logs', 'teardown', 'status', 'stop', 'reset')]
  [string]$Block,
  [string]$Prep = '',
  [int]$DelayMs = 400,
  [string]$Why = '',
  # S1 wave fixer (Return 2, ruling (b)): only with -Block reset.
  [int]$Attempt = 0,
  [string[]]$Skip = @(),
  [string]$LogMark = ''
)

$ErrorActionPreference = 'Continue'
$Repo = Split-Path -Parent $PSScriptRoot
Set-Location $Repo
$env:Path = "$env:LOCALAPPDATA\Author Software\nvm\.nodejs;$env:Path"
if (-not $env:S9_OUT) { $env:S9_OUT = Join-Path $env:TEMP 'bridge-e2e\s14' }
New-Item -ItemType Directory -Force $env:S9_OUT | Out-Null
$env:S9_RAW = Join-Path $env:S9_OUT 'r14-raw.txt'
. "$PSScriptRoot\s9-win.ps1"
$global:S9PinUiaOnly = $true          # never pin or unpin by mouse in this wave
$Steps = 'docs\plans\2026-10-24-step10-step8-follow-ups-steps'
$StateFile = Join-Path $env:S9_OUT 'r14-globals.clixml'
$Order = @('preflight', 'servers', 'window', 'setup', 'safe0', 'found', 'rel3', 'pop1', 'r3', 'type', 'ctl', '5c', 'restore', 'logs', 'teardown')
$Names = @('W', 'O', 'E', 'D', 'WinStart', 'PinnedBefore', 'L0', 'S9ChromeStart', 'S9Found', 'S9WinIds', 'WaveStart', 'S14Touched', 'S14Stopped', 'S14Pids', 'S14Done', 'S14TypeND', 'S14TypeRuns', 'S14Resume', 'S14LogMark')
# S1 wave fixer (Return 2, ruling (b)): the only blocks a resume may skip (rows recorded in an earlier attempt).
$Skippable = @('rel3', 'pop1')
# Step 9's build on disk (sha256, 2026-10-25, unchanged by `npm run build` at b016712): Run 14 measures exactly this.
$Dist = [ordered]@{
  'daemon/dist/index.js'      = '99bb55c5913cdb6a11a68453b22fe4751534bdcdd0d0ae29bf8bef9b3a93332d'
  'extension/dist/sw.js'      = '5a2888f72f2f12ca4bac5fb5e8c907cdc5388d1d3599375acf74fc43f9db5d4f'
  'extension/dist/content.js' = 'bcb20e289758f6118c021b54a734ef3cd6de32e7c9158a527d4808fdb899587a'
  'extension/dist/offscreen.js' = 'a8beec6cfa8abbf295131113744205866eb83d9ec9b3f18097dc0d20c2f25440'
  'extension/dist/options.js' = 'f8b520588e72daebc4cdf157e4a6d05c2fe80e4a1741c6aebac3847d77ccbcb6'
}
# SAFE-0's tuple when the found state is the expected default (recipes/s9-rules.ts safetyTupleLine; the test pins it).
$S14Default = 'safety armed=true evaluate=true blockedCount=0'

function Load-S14 {
  if (Test-Path $StateFile) { $h = Import-Clixml $StateFile; foreach ($k in $h.Keys) { Set-Variable -Scope Global -Name $k -Value $h[$k] } }
  if (-not $global:S14Pids) { $global:S14Pids = @{} }
  if (-not $global:S14Done) { $global:S14Done = @() }
}
function Save-S14 {
  $h = @{}
  foreach ($n in $Names) { $v = Get-Variable -Scope Global -Name $n -ValueOnly -ErrorAction SilentlyContinue; if ($null -ne $v) { $h[$n] = $v } }
  $h | Export-Clixml $StateFile
}

# One s9.ts call in the foreground: its lines printed and appended to the raw output; exit 2 (a STOP line) throws.
function S9 {
  $out = @(& node --import tsx recipes/s9.ts @args)
  $global:S9Code = $LASTEXITCODE
  $global:S9Out = $out
  foreach ($l in $out) { Write-Host $l }
  Write-S9Raw $out
  if ($global:S9Code -eq 2) { throw "s9.ts $($args[0]) printed a STOP line (exit 2)" }
}

# One s9.ts call in the background (a timed row); its output goes to files, never the caller's pipe (CLAUDE.md).
function S9Bg([string]$Name, [string[]]$A) {
  $p = Start-Process -PassThru -WindowStyle Hidden -WorkingDirectory $Repo -FilePath node -ArgumentList (@('--import', 'tsx', 'recipes/s9.ts') + $A) `
    -RedirectStandardOutput "$env:S9_OUT\$Name.out" -RedirectStandardError "$env:S9_OUT\$Name.err"
  $null = $p.Handle   # keeps ExitCode readable after WaitForExit (Windows PowerShell 5.1)
  $p
}

function Show-S14File([string]$Path) {
  if (-not (Test-Path $Path)) { Say9 "no file $Path"; return }
  $out = @(Get-Content $Path -Encoding UTF8)
  foreach ($l in $out) { Write-Host $l }
  Write-S9Raw $out
}

function Fail-S14([string]$m) { Stop9 $m; throw $m }

function Get-S14Listeners([int]$Port) {
  @(netstat -ano | ForEach-Object { if ($_ -match "^\s*TCP\s+\S*:$Port\s+\S+\s+LISTENING\s+(\d+)\s*$") { [int]$Matches[1] } } | Select-Object -Unique)
}

function Stop-S14Pid([int]$Id, [string]$What) {
  if (-not (Get-Process -Id $Id -ErrorAction SilentlyContinue)) { Say9 "$What (PID $Id) already gone"; return $true }
  $t = Test-SafeToKill $Id
  Say9 "$What (PID $Id): $t"
  if (-not $t.StartsWith('safe:')) { return $false }
  Stop-Process -Id $Id -Force -ErrorAction SilentlyContinue
  Start-Sleep -Milliseconds 300
  -not (Get-Process -Id $Id -ErrorAction SilentlyContinue)
}

# Prep fixer r1 (S1-prep-verifier F1): a background s9.ts the wave started (R14-4b's r14-type, PID in S14Pids
# 'r14type'), ended BEFORE Restore-S9All on any stop, so it can neither type nor focus after the STOP nor be left as
# an orphan node. Identified: its command line must name recipes/s9.ts and r14-type (a reused PID is never touched);
# its whole tree is stopped (an nvm-windows shim may sit between it and the real node), each PID through
# Test-SafeToKill. Returns $true when nothing of it is left. It is the only background process a block starts: the
# servers (web, web1, red) and the daemon are stopped by Stop-S14Processes; every other s9.ts and node call runs in
# the foreground of its block.
function Stop-S14Background {
  $id = $global:S14Pids['r14type']
  if (-not $id) { return $true }
  $p = Get-CimInstance Win32_Process -Filter "ProcessId=$([int]$id)" -ErrorAction SilentlyContinue
  if (-not $p) { Say9 "background r14-type (PID $id) already gone"; $global:S14Pids.Remove('r14type'); Save-S14; return $true }
  if ("$($p.CommandLine)" -notmatch 'recipes[\\/]s9\.ts' -or "$($p.CommandLine)" -notmatch 'r14-type') {
    Say9 "PID $id is no longer the wave's r14-type (its command line differs) - not touched"
    $global:S14Pids.Remove('r14type'); Save-S14; return $true
  }
  $tree = @(Get-ProcTree ([int]$id))
  [array]::Reverse($tree)
  $ok = $true
  foreach ($x in $tree) { if (-not (Stop-S14Pid ([int]$x) "background r14-type tree of $id")) { $ok = $false } }
  if ($ok) { $global:S14Pids.Remove('r14type'); Save-S14 }
  $ok
}

# Tabs, daemon, servers: what the stop procedure and the teardown share. Returns $true when all of it ended.
function Stop-S14Processes {
  $ok = $true
  if (@(Get-BridgeDaemon).Count -and (Test-Path (Join-Path $env:S9_OUT 'state.json'))) { try { S9 cleanup } catch { Say9 "cleanup threw: $($_.Exception.Message)" } }
  if (@(Get-BridgeDaemon).Count) {
    try { S9 daemon-shutdown } catch { Say9 "daemon-shutdown refused: $($_.Exception.Message)" }
    $t0 = Get-Date; while (@(Get-BridgeDaemon).Count -and ((Get-Date) - $t0).TotalSeconds -lt 5) { Start-Sleep -Milliseconds 250 }
    foreach ($d in @(Get-BridgeDaemon)) {
      if ($global:S14Pids['daemon'] -and [int]$d.ProcessId -eq [int]$global:S14Pids['daemon']) { if (-not (Stop-S14Pid ([int]$d.ProcessId) 'daemon')) { $ok = $false } }
      else { Say9 "a daemon PID $($d.ProcessId) is not the one this wave identified - not touched"; $ok = $false }
    }
  }
  foreach ($k in @('web', 'web1', 'red')) { if ($global:S14Pids[$k]) { if (-not (Stop-S14Pid ([int]$global:S14Pids[$k]) "server $k")) { $ok = $false } } }
  $ok
}

function Invoke-S14Stop([string]$Reason) {
  Stop9 "block ${Block}: $Reason - the stop procedure runs (restore and read-back, clean-up); then write the ledger and RETURN to the step agent"
  # F1: the background r14-type first - it would otherwise go on typing and focusing during and after the restore.
  $b = $false
  try { $b = Stop-S14Background } catch { Say9 "stopping the background r14-type threw: $($_.Exception.Message)" }
  $r = $false
  try { $r = Restore-S9All -Why "block ${Block}: $Reason" -Row 'R14-STOP' } catch { Say9 "Restore-S9All threw: $($_.Exception.Message)" }
  $p = $false
  try { $p = Stop-S14Processes } catch { Say9 "the clean-up threw: $($_.Exception.Message)" }
  $global:S14Stopped = "${Block}: $Reason"
  Save-S14
  Say9 "STOPPED at block ${Block}. Restore: $(if ($r) { 'read back equal (RESTORE ok)' } else { 'FAILED - say so as line 1 of the return' }); processes: $(if ($p -and $b) { 'ended' } else { 'NOT all ended (listed above)' }). Every later block refuses to run."
}

# ------------------------------------------------------------------------------------------------- the blocks

function B-preflight {
  Say9 "R14 preflight (read-only) at $(Now9)"
  if (-not $Prep) { Fail-S14 'preflight needs -Prep <the S1 prep commit sha> (the rows must be committed before the first press, S1.1)' }
  git merge-base --is-ancestor $Prep HEAD 2>$null
  if ($LASTEXITCODE -ne 0) { Fail-S14 "the S1 prep commit $Prep is not in HEAD" }
  Say9 "HEAD $(git rev-parse --short HEAD) contains the prep commit $Prep"
  $st = @(git status --porcelain --untracked-files=no)
  if ($st.Count) { Fail-S14 "$($st.Count) tracked file(s) modified - the wave runs on committed code only" }
  foreach ($f in $Dist.Keys) {
    $h = (Get-FileHash -Algorithm SHA256 (Join-Path $Repo $f)).Hash.ToLower()
    if ($h -ne $Dist[$f]) { Fail-S14 "$f is not Step 9's build (sha256 $($h.Substring(0, 12))...): a build changes what is measured - return (the step agent decides)" }
  }
  Say9 "dist = Step 9's build (daemon build $($Dist['daemon/dist/index.js'].Substring(0, 8))..., four extension bundles equal)"
  if ((Get-BridgeClients) -gt 0) { Fail-S14 'a bridge MCP process is running (another session, or one descending from the runner) - it would join the wave''s daemon; the step agent asks the user to end it' }
  $daemons = @(Get-BridgeDaemon | ForEach-Object { [int]$_.ProcessId })
  foreach ($l in (Get-S14Listeners 9234)) { if ($daemons -notcontains $l) { Fail-S14 "port 9234 is held by PID $l, which is not a bridge daemon" } }
  Say9 "port 9234: $(if ((Get-S14Listeners 9234).Count) { 'held by the bridge daemon ' + ($daemons -join ',') } else { 'free' })"
  foreach ($port in 8080, 8081, 8083) { $l = Get-S14Listeners $port; if ($l.Count) { Fail-S14 "port $port is already in use (PID $($l -join ','))" } }
  Say9 'ports 8080, 8081, 8083: free'
  if (-not @(Get-Process chrome -ErrorAction SilentlyContinue).Count) { Fail-S14 'Chrome is not running - starting it is not part of this wave' }
  Say9 "Chrome $((Get-Item (Get-S9Chrome)).VersionInfo.ProductVersion); node $(node --version)"
  $nodes = @(Get-CimInstance Win32_Process -Filter "Name='node.exe'" | ForEach-Object { "$($_.ProcessId)<-$($_.ParentProcessId)" })
  Say9 "node processes (pid<-parent): $($nodes -join ' ') (22152 is an unrelated host: never touched)"
  $global:WinStart = @(Get-S9ChromeWindows).Count
  $global:S9ChromeStart = Get-S9ChromeStart
  Say9 "Chrome windows $($global:WinStart); Chrome start $($global:S9ChromeStart)"
  Get-S9KeyboardLayouts
  Say9 "bridge.token present: $(Test-Path (Join-Path $Repo 'bridge.token')); BRIDGE_TOKEN set in this shell: $(Test-Path Env:BRIDGE_TOKEN) (the token is never read or printed here)"
  if (Test-Path $env:S9_RAW) { Say9 'note: r14-raw.txt already existed and is appended to' }
}

function B-servers {
  $PY = "$HOME\miniconda3\python.exe"
  if (-not (Test-Path $PY)) { Fail-S14 "no python at $PY" }
  $web = Start-Process -PassThru -WindowStyle Hidden -WorkingDirectory $Repo -FilePath $PY -ArgumentList '-I', '-m', 'http.server', '8080', '--bind', '127.0.0.1', '--directory', 'test-fixtures' -RedirectStandardOutput "$env:S9_OUT\http8080.out" -RedirectStandardError "$env:S9_OUT\http8080.err"
  $web1 = Start-Process -PassThru -WindowStyle Hidden -WorkingDirectory $Repo -FilePath $PY -ArgumentList '-I', '-m', 'http.server', '8081', '--bind', '127.0.0.1', '--directory', 'test-fixtures' -RedirectStandardOutput "$env:S9_OUT\http8081.out" -RedirectStandardError "$env:S9_OUT\http8081.err"
  $red = Start-Process -PassThru -WindowStyle Hidden -WorkingDirectory $Repo -FilePath $PY -ArgumentList '-I', 'recipes/s9-redirect.py', '8083' -RedirectStandardOutput "$env:S9_OUT\redirect8083.log" -RedirectStandardError "$env:S9_OUT\redirect8083.err"
  $global:S14Pids['web'] = $web.Id; $global:S14Pids['web1'] = $web1.Id; $global:S14Pids['red'] = $red.Id
  Save-S14
  foreach ($x in @(@(8080, $web.Id), @(8081, $web1.Id), @(8083, $red.Id))) {
    $t0 = Get-Date
    while (-not ((Get-S14Listeners $x[0]) -contains [int]$x[1]) -and ((Get-Date) - $t0).TotalSeconds -lt 8) { Start-Sleep -Milliseconds 250 }
    if (-not ((Get-S14Listeners $x[0]) -contains [int]$x[1])) { Fail-S14 "the server on $($x[0]) (PID $($x[1])) is not listening" }
  }
  Say9 "servers listening on 127.0.0.1: http8080 PID $($web.Id), http8081 PID $($web1.Id), redirect8083 (threaded) PID $($red.Id)"
}

function B-window {
  $global:W = Open-S9Window 'http://localhost:8080/e2e-playground.html?s9=w'
  $global:L0 = Get-S9Layout $global:W
  Say9 "W = $($global:W), keyboard layout $($global:L0)"
  Save-S14
  $global:PinnedBefore = Get-S9PinState $global:W
  Save-S14
  if (-not $global:PinnedBefore) {
    Say9 'the toolbar button is not pinned: one UIA-only pin attempt (no mouse)'
    if (-not (Set-S9Pin $global:W -Pin -UiaOnly)) {
      Fail-S14 'HUMAN GATE (pinning): the toolbar button is not pinned and UI Automation cannot pin it; pinning by mouse click is not pre-approved (#192, #202) - the step agent asks the user once'
    }
  }
  [void](Get-S9ActionTitle $global:W)
  Say9 "pin state found: pinned=$("$($global:PinnedBefore)".ToLower())"
}

function B-setup {
  $global:WaveStart = Now9
  Save-S14
  Say9 "wave start $($global:WaveStart) (the daemon-log mark of S1.6)"
  S9 setup
  $d = @(Get-BridgeDaemon)
  if ($d.Count -ne 1) { Fail-S14 "expected exactly 1 bridge daemon after setup, found $($d.Count)" }
  $global:S14Pids['daemon'] = [int]$d[0].ProcessId
  Save-S14
  Say9 "daemon PID $($d[0].ProcessId)"
  S9 wait-alone --row R14-CLIENTS-START --timeout 3000
  $global:E = Open-S9ChromePage 'chrome://extensions'
  Save-S14
  $global:D = Open-S9WorkerConsole $global:E
  Save-S14
  [void](Set-S9Foreground $global:W)
}

function B-safe0 {
  S9 safe0
  # Prep fixer r1 (S1-prep-verifier F3): the tuple SAFE-0 read, BEFORE any reload. Reported and not the expected
  # default (the human may have disarmed, turned JavaScript off or blocked sites) -> the found-state guard's STOP,
  # with no reload (a reload would not change storage.local, and SAFE-0 would fail for the wrong cause). A reload only
  # when the tuple is the expected one (or not reported at all: a pre-Step-9 extension) and SAFE-0 still fails.
  $tuple = $null
  foreach ($l in $global:S9Out) { if ("$l" -match 'ROW SAFE-0 safety (safety armed=\S+ evaluate=\S+ blockedCount=\S+) \(reported after') { $tuple = $Matches[1] } }
  Say9 "SAFE-0 tuple read before any reload: $(if ($tuple) { $tuple } else { 'not reported' }) (expected default: $S14Default)"
  if ($tuple -and $tuple -ne $S14Default) {
    Fail-S14 "found-state guard: SAFE-0 read '$tuple', not '$S14Default' - no reload; nothing was changed (the state may be the human's own setting; the step agent asks the user)"
  }
  if ($global:S9Code -ne 0) {
    Say9 "SAFE-0 did not pass (exit $($global:S9Code)): the one reload by recipes/reload-extension.ps1 (S1.2)"
    $rc = $null
    foreach ($try in 1, 2) {
      $o = @(powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\reload-extension.ps1)
      $rc = $LASTEXITCODE
      foreach ($l in $o) { Write-Host $l }; Write-S9Raw $o
      Say9 "reload-extension.ps1 exit $rc (attempt $try)"
      if ($rc -ne 2) { break }
    }
    if ($rc -ne 0) { Fail-S14 "the reload script exited $rc after one re-run on exit 2" }
    S9 safe0
    if ($global:S9Code -ne 0) { Fail-S14 'SAFE-0 still fails after the reload: the loaded extension is not the Step 9 build on disk' }
  }
  $o = @(Get-BridgeLog 8); foreach ($l in $o) { Write-Host $l }; Write-S9Raw $o
}

function B-found {
  S9 probe --row R14-FOUND
  $global:O = Open-S9ChromePage $S9OptionsUrl
  Save-S14
  if (-not (Test-S9FoundState $global:O -Row 'R14-FOUND-guard')) { Save-S14; throw 'the found-state guard printed STOP' }
  Save-S14
  $s = $global:S9Found.State
  Say9 "FOUND STATE recorded: armed=$("$($s.armed)".ToLower()) evaluate=$("$($s.evaluate)".ToLower()) count=$($s.count) lines=$($s.lines) sha256=$(if ($s.sha256 -eq $S9EmptySha) { $s.sha256 } else { 'withheld(non-empty)' })"
  [void](Set-S9Foreground $global:W)
}

function B-rel3 {
  [void](Set-S9Foreground $global:W)
  S9 call R14-REL-3 open newtab 'http://localhost:8080/e2e-playground.html?s14=r3' --as r3 --expect ok
  S9 call R14-REL-3 rel navigate-class r3 'view-source:/options.html' --expect record
  S9 call R14-REL-3 tabs tabs
}

function B-pop1 {
  [void](Set-S9Foreground $global:W)
  S9 pop14
}

function B-r3 {
  # S1 wave fixer (Return 2, ruling (a)): the placement is tried in the fixed order (W's monitor, then each other
  # monitor's work area), each attempt printed with its occluders named; none free -> the same STOP as before. The
  # guard below is unchanged and re-checks the chosen placement.
  if (-not (Find-S9FreePlacement $global:W $global:O)) { Fail-S14 'R14-3 placement guard: W and O are not side by side, uncovered by each other and by any window above O (no occluder), on a work area and restored' }
  if (-not (Test-S9Placement $global:W $global:O 'placement-before-switch')) { Fail-S14 'R14-3 placement guard: W and O are not side by side, uncovered by each other and by any window above O (no occluder), on a work area and restored' }
  $global:S14Touched = $true; Save-S14
  [void](Set-S9Switch $global:O -Which armed -On $false)
  Wait-S9ActionTitle $global:W $S9TitleOff 1000
  S9 call R14-3 snap snapshot a --expect DISARMED:all
  Read-S9OptionsLines $global:O
  Start-Sleep -Milliseconds 1500
  if (-not (Test-S9Placement $global:W $global:O 'placement-before-click')) { Fail-S14 'R14-3 placement guard before the toolbar click: W and O not side by side, or a window above O covers it (no occluder allowed)' }
  [void](Invoke-S9ActionButton $global:W)
  Wait-S9ActionTitle $global:W $S9TitleArmed 1000
  $reached = Wait-S9OptionsStatus $global:O 'Bridge armed.' 2000
  Read-S9OptionsLines $global:O
  [void](Read-S9SafetyState $global:O)
  if (-not $reached) {
    Say9 'R14-3 supplementary read (record, not a re-run; nothing pressed): O brought to the front'
    [void](Set-S9Foreground $global:O); Read-S9OptionsLines $global:O; [void](Set-S9Foreground $global:W)
  }
  S9 wait-safety --armed true --evaluate true --count 0 --row R14-3-end --guard
}

function B-type {
  $global:S14TypeRuns = [int]$global:S14TypeRuns + 1; Save-S14
  $bf = Join-Path $env:S9_OUT 'R14-4b.banner.json'
  Say9 "R14-4b run $($global:S14TypeRuns) with the driver's delay $DelayMs ms"
  $global:S14Touched = $true; Save-S14
  $p = S9Bg 'r14-4b' @('r14-type', '--delay-ms', "$DelayMs")
  # F1: the PID is tracked, so any STOP below (a press helper throwing, the 150 s timeout) ends it before the restore.
  $global:S14Pids['r14type'] = $p.Id; Save-S14
  Say9 "background r14-type PID $($p.Id) (tracked; the stop procedure ends it before any restore)"
  Invoke-S9PressWhenReady $global:W -Row 'R14-4b' -DelayMs $DelayMs -WatchBanner -BannerForMs 20000 -BannerPollMs 250 -BannerOut $bf -RearmAfterMs 1500
  if (-not $p.WaitForExit(150000)) { Fail-S14 'r14-type did not end within 150 s' }
  $global:S14Pids.Remove('r14type'); Save-S14
  Show-S14File "$env:S9_OUT\r14-4b.out"
  $code = $p.ExitCode
  Say9 "r14-type exit $code"
  if ($code -eq 2) { throw 'r14-type printed a STOP line (exit 2)' }
  $global:S14TypeND = ($code -eq 3); Save-S14
  try { Select-S9Tab $global:W 'S9 W' } catch { Say9 "Select-S9Tab: $($_.Exception.Message) (record)" }
  S9 wait-safety --armed true --evaluate true --count 0 --row R14-4b-end --guard
  if ($global:S14TypeND) {
    if ($global:S14TypeRuns -lt 2) { Say9 "R14-4b NOT DISCRIMINATING: the one pre-registered re-run is ``-Block type -DelayMs <the RERUN-DELAY above>``, once" }
    else { Say9 'R14-4b NOT DISCRIMINATING on its one re-run: recorded NOT MEASURED; go on with ctl' }
  }
}

function B-ctl {
  S9 redirect-probe --port 8083 --row R14-5c-ctl
  if ($global:S9Code -ne 0) { Fail-S14 'R14-5c positive control: the redirect server did not answer two concurrent requests within 1 s - R14-5c would not discriminate' }
}

function B-5c {
  $global:S14Touched = $true; Save-S14
  [void](Set-S9BlockList $global:O -Lines @('localhost:8081'))
  S9 wait-safety --count 1 --row R14-5c --guard
  S9 call R14-5c direct download-file 'http://localhost:8081/dl/hello.txt?s14=5c1' --file hello-5c1.txt --expect BLOCKED:url
  S9 call R14-5c redirect download-file 'http://localhost:8083/dl/hello.txt?s14=5c2' --file hello-5c2.txt --expect BLOCKED:url
  Start-Sleep -Seconds 2
  S9 server-logs --row R14-5c --log8083 "$env:S9_OUT\redirect8083.log" --log8081 "$env:S9_OUT\http8081.err"
  [void](Set-S9BlockList $global:O -Lines @())
  S9 wait-safety --armed true --evaluate true --count 0 --row R14-5c-end --guard
}

function B-restore {
  $ok = Restore-S9Safety 'R14-END'
  if (-not $ok) { Fail-S14 'RESTORE FAILED: the safety state read back at the end differs from the found state (S1.4)' }
  S9 probe --row R14-END
  $global:S14Touched = $false; Save-S14
  Say9 'RESTORED: armed, JavaScript and the block-list sha256 read back equal to the found state (stored page, daemon.status, title)'
}

function B-logs {
  $con = Join-Path $env:S9_OUT 'r14-console.txt'
  Read-S9WorkerConsole $global:D -Out $con
  # Prep fixer r1 (S1-prep-verifier F2): the console is judged by S1.6 as written (console-s16: every count 0, whoever
  # wrote the line - a Chrome-owned hit FAILS R14-LOGS). Both halves are counted first, then a failure of either is
  # the STOP (the stop procedure restores; the FAIL is recorded, not hidden).
  $conFail = $false
  if (Test-Path $con) {
    S9 scan-file $con --mode console-s16
    if ($global:S9Code -eq 1) { $conFail = $true }
  } else { Say9 'worker console: no capture - S1.6 console half NOT MEASURED' }
  # S1 wave fixer (Return 2, ruling (d)): on a resume daemon.log is counted from the earlier attempt's wave mark (both
  # attempts); that attempt's worker console was not captured (its window D closed with its stop procedure).
  $since = if ($global:S14LogMark) { $global:S14LogMark } else { $global:WaveStart }
  if ($global:S14Resume) {
    $prev = [int]$global:S14Resume.Attempt - 1
    Say9 "R14-LOGS daemon.log counted from $since (attempt $prev's wave mark: $($global:S14Resume.MarkFrom)) - attempts $prev and $($global:S14Resume.Attempt)"
    Say9 "R14-LOGS attempt $prev's worker console was not captured (its window D closed with attempt $prev's stop procedure) - a recorded deviation; the console counted here is attempt $($global:S14Resume.Attempt)'s only"
  }
  S9 scan-log --since $since --copy "$Steps\S1-daemon-log.txt"
  $logFail = ($global:S9Code -ne 0)
  if ($conFail -or $logFail) {
    Fail-S14 "R14-LOGS FAILS: $(if ($conFail) { 'the worker console holds a count that is not 0 (token, non-fixture ://, localhost:8081, :8083 or bank.example, whoever wrote the line)' })$(if ($conFail -and $logFail) { '; ' })$(if ($logFail) { 'daemon.log since the wave mark holds a count that is not 0 - nothing copied' }) (counts above; S1.6) - nothing of it is committed"
  }
}

function B-teardown {
  S9 cleanup
  # Prep fixer r1 (S1-prep-verifier N1): every tab the wave opened is accounted for. r3 (R14-REL-3) is closed
  # explicitly, whatever it shows: when the bridge refused its closeTab (an own page), by W's own UIA - the one tab in
  # W's strip that is not W's own (no title printed). Any other tab still listed is a STOP.
  $left = ''
  foreach ($l in $global:S9Out) { if ("$l" -match 'cleanup: still listed (.*)$') { $left = $Matches[1].Trim() } }
  if ($left -and $left -ne 'none') {
    $keys = @($left -split ' ' | ForEach-Object { ($_ -split '=')[0] })
    if (@($keys | Where-Object { $_ -ne 'r3' }).Count) { Fail-S14 "teardown: tab(s) still listed after cleanup that are not r3: $left" }
    Close-S9OtherTab $global:W 'S9 W human tab'
    Start-Sleep -Milliseconds 500
    S9 cleanup
    $again = ''
    foreach ($l in $global:S9Out) { if ("$l" -match 'cleanup: still listed (.*)$') { $again = $Matches[1].Trim() } }
    if ($again -ne 'none') { Fail-S14 "teardown: r3 still listed after its UIA close: $again" }
    Say9 'teardown: r3 closed by the driver window''s UIA (its closeTab was refused); every opened tab accounted for'
  }
  $desk = Restore-S9Desk
  if (-not $desk) { Fail-S14 'RESTORE desk FAILED at the teardown (pin state, layout or driver windows not as found)' }
  if (-not (Stop-S14Processes)) { Fail-S14 'a daemon or server of this wave did not end (listed above)' }
  foreach ($port in 9234, 8080, 8081, 8083) { $l = Get-S14Listeners $port; if ($l.Count) { Fail-S14 "port $port still held by PID $($l -join ',')" } }
  Say9 "ports 9234, 8080, 8081, 8083 free; Chrome windows $(@(Get-S9ChromeWindows).Count) (found $($global:WinStart)); bridge MCP processes $(Get-BridgeClients)"
  S9 scan-file $env:S9_RAW --mode committed
  if ($global:S9Code -eq 0) { Copy-Item $env:S9_RAW "$Steps\S1-run-raw.txt" -Force; Say9 "raw output copied to $Steps\S1-run-raw.txt (scan passed)" }
  else { Say9 'raw output NOT copied (its committed-file scan did not pass; it stays outside the repo)' }
}

function B-status {
  foreach ($n in $Names) { $v = Get-Variable -Scope Global -Name $n -ValueOnly -ErrorAction SilentlyContinue; if ($n -eq 'S9Found' -and $v) { $v = "default=$($v.Default)" }; if ($n -eq 'S9WinIds' -and $v) { $v = ($v.Keys -join ',') }; if ($n -eq 'S14Resume' -and $v) { $v = "attempt=$($v.Attempt) skip=$(@($v.Skip) -join ',') mark=$($v.Mark)" }; if ($n -eq 'S14Pids' -and $v) { $v = (($v.Keys | ForEach-Object { "$_=$($v[$_])" }) -join ' ') }; Write-Host ("{0} = {1}" -f $n, ($v -join ',')) }
  Write-Host "daemon PIDs now: $((@(Get-BridgeDaemon | ForEach-Object { $_.ProcessId })) -join ',')"
}

function B-reset {
  # S1 wave fixer (Return 2, ruling (b); round 2, S1-wave-verifier F2): the ONE resume ruling (b) allows - exactly
  # `-Attempt 3 -Skip rel3,pop1`, and only when the stored state is attempt 2's: stopped at r3, with exactly preflight..pop1
  # recorded, and not itself a resume. Anything else is a usage error (`USAGE:`, never `STOP:`), exit 3, nothing archived.
  # -LogMark is accepted only when attempt 2's wave mark is not stored.
  $resume = $null
  if ($Attempt -or $Skip.Count -or $LogMark) {
    $usage = 'the only resume is -Block reset -Attempt 3 -Skip rel3,pop1 [-LogMark <iso>, only when attempt 2''s wave mark is not stored]'
    $sk = @($Skip | ForEach-Object { "$_".Split(',') } | ForEach-Object { $_.Trim() } | Where-Object { $_ })
    if ($Attempt -ne 3) { Write-Host "USAGE: -Attempt $Attempt refused - $usage; nothing changed"; exit 3 }
    if ($sk.Count -ne 2 -or ($sk | Sort-Object -Unique).Count -ne 2 -or @($sk | Where-Object { $Skippable -notcontains $_ }).Count) { Write-Host "USAGE: -Skip '$($sk -join ',')' refused - $usage; nothing changed"; exit 3 }
    $sk = @($Order | Where-Object { $sk -contains $_ })   # rel3, pop1
    $src = 'the current globals'
    $h = $null
    if (Test-Path $StateFile) { $h = Import-Clixml $StateFile }
    else {
      $arch = @(Get-ChildItem -Path (Join-Path $env:S9_OUT 'r14-globals.clixml.*') -ErrorAction SilentlyContinue | Sort-Object Name | Select-Object -Last 1)
      if ($arch.Count) { $h = Import-Clixml $arch[0].FullName; $src = "the archived $($arch[0].Name)" }
    }
    if (-not $h) { Write-Host "USAGE: no stored state of attempt 2 to resume from - $usage; nothing changed"; exit 3 }
    $want = @($Order[0..($Order.IndexOf('pop1'))])
    $done = @($h['S14Done'])
    $isA2 = (-not $h['S14Resume']) -and ("$($h['S14Stopped'])".StartsWith('r3:')) -and (($done -join ',') -eq ($want -join ','))
    if (-not $isA2) { Write-Host "USAGE: $src is not attempt 2's stopped state (needs: stopped at r3, done exactly $($want -join ','), not a resume; found stopped='$(if ($h['S14Stopped']) { "$($h['S14Stopped'])".Split(':')[0] } else { '' })' done=$($done -join ',') resume=$(if ($h['S14Resume']) { 'yes' } else { 'no' })) - $usage; nothing changed"; exit 3 }
    $mark = ''; $from = ''
    if ($h['WaveStart']) {
      if ($LogMark) { Write-Host "USAGE: -LogMark refused - attempt 2's wave mark is stored in $src; nothing changed"; exit 3 }
      $mark = "$($h['WaveStart'])"; $from = "the WaveStart stored in $src"
    } elseif ($LogMark) { $mark = $LogMark; $from = "-LogMark: the record's attempt-2 wave start (not stored in $src)" }
    $parsed = [DateTime]::MinValue
    if (-not $mark -or -not [DateTime]::TryParse($mark, [ref]$parsed)) { Write-Host 'USAGE: attempt 2''s daemon-log mark is not stored - pass -LogMark <the record''s attempt-2 wave start iso>; nothing changed'; exit 3 }
    $resume = @{ Attempt = $Attempt; Skip = $sk; Mark = $mark; MarkFrom = $from }
  } elseif (-not $global:S14Stopped -and -not ($global:S14Done -contains 'teardown')) { Say9 'reset refused: the wave is neither stopped nor torn down'; exit 3 }
  $stamp = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ')
  foreach ($f in 'r14-globals.clixml', 'r14-raw.txt', 'state.json') { $x = Join-Path $env:S9_OUT $f; if (Test-Path $x) { Rename-Item $x "$f.$stamp" } }
  Write-Host "archived the wave's state files with suffix .$stamp; a new wave starts at preflight"
  if ($resume) {
    @{ S14Resume = $resume; S14LogMark = $resume.Mark; S14Done = @() } | Export-Clixml $StateFile
    $l = "RESUME attempt ${Attempt}: $($resume.Skip -join ', ') recorded in attempt $($Attempt - 1), not re-run"
    Write-Host $l; Write-S9Raw $l
    $l2 = "RESUME attempt ${Attempt}: blocks $(@($Order | Where-Object { $resume.Skip -notcontains $_ }) -join ', '); daemon.log mark $($resume.Mark) ($($resume.MarkFrom))"
    Write-Host $l2; Write-S9Raw $l2
  }
}

# ------------------------------------------------------------------------------------------------- main

Load-S14
if ($Block -eq 'status') { B-status; exit 0 }
if ($Block -eq 'reset') { B-reset; exit 0 }
if ($global:S14Stopped) { Write-Host "NOT RUN: the wave stopped at '$($global:S14Stopped)' (its STOP line is in the raw output). RETURN to the step agent."; exit 3 }
if ($Block -eq 'stop') { Invoke-S14Stop $(if ($Why) { $Why } else { 'a STOP the runner met outside a block' }); exit 2 }
if ($Attempt -or $Skip.Count -or $LogMark) { Write-Host 'NOT RUN: -Attempt, -Skip and -LogMark belong to -Block reset only'; exit 3 }
# S1 wave fixer (Return 2, ruling (b)): on a resume the order is the sheet's minus the skipped blocks; a skipped block
# never runs, and every other block still needs the one before it in that order.
$RunOrder = @($Order)
if ($global:S14Resume) {
  $RunOrder = @($Order | Where-Object { @($global:S14Resume.Skip) -notcontains $_ })
  if (@($global:S14Resume.Skip) -contains $Block) { Write-Host "NOT RUN: block $Block is skipped in this resume (RESUME attempt $($global:S14Resume.Attempt): recorded in attempt $([int]$global:S14Resume.Attempt - 1), not re-run)"; exit 3 }
}
$i = $RunOrder.IndexOf($Block)
if ($i -gt 0 -and -not ($global:S14Done -contains $RunOrder[$i - 1])) { Write-Host "NOT RUN: block $Block needs block $($RunOrder[$i - 1]) first (the sheet's order$(if ($global:S14Resume) { ' minus the resume''s skipped blocks' }))"; exit 3 }
# The block that comes right after a skipped one prints the RESUME line again, so the raw output shows the skip there.
if ($global:S14Resume -and $i -gt 0 -and $Order.IndexOf($RunOrder[$i - 1]) -ne $Order.IndexOf($Block) - 1) {
  Say9 "RESUME attempt $($global:S14Resume.Attempt): $(@($global:S14Resume.Skip) -join ', ') recorded in attempt $([int]$global:S14Resume.Attempt - 1), not re-run" }
if ($global:S14Done -contains $Block) {
  if (-not ($Block -eq 'type' -and $global:S14TypeND -and [int]$global:S14TypeRuns -lt 2)) { Write-Host "NOT RUN: block $Block is done (only R14-4b's one pre-registered re-run may repeat a block)"; exit 3 }
  if ($global:S14Done -contains 'ctl') { Write-Host 'NOT RUN: the re-run of type must come before ctl'; exit 3 }
}
Say9 "BLOCK $Block begins"
try {
  & "B-$Block"
  if (-not ($global:S14Done -contains $Block)) { $global:S14Done = @($global:S14Done) + $Block }
  Save-S14
  Say9 "BLOCK $Block done"
  exit 0
} catch {
  Invoke-S14Stop $_.Exception.Message
  exit 2
}
