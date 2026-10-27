# recipes/s11b-r17b.ps1: the block runner of Run 17b (Step 11b S7-helpers H3; docs/e2e-test-plan.md section 4.25). Windows PowerShell 5.1,
# ASCII only. Written 2026-10-27 by builder H3 (Sonnet 5.5); NOT run against Chrome, a daemon or a port by its author. Pure decisions
# (block list, slice orders, G11-3 branch, STOP map, expected texts) are in recipes/s11b-r17b-plan.ts, tied to this file by
# recipes/test/s11b-r17b-*.test.ts.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\s11b-r17b.ps1 -Block liveA17B | liveB17B | plan | <one block>
#
# Run 17's s11b-r17.ps1 is not edited and cannot be dot-sourced (it runs its main). This file reads it with PowerShell's own parser and
# defines its top-level functions here, and keeps its $Blocks scriptblocks by name (the carried rows run them under the R17B id: their ROW
# lines still carry the R17 ids, a CARRIED line names the pairing). Exit: 0 done, 2 STOP, 3 not run (the G11-3 branch). No NOT BUILT path.
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('liveA17B', 'liveB17B', 'plan', 'preflight', 'servers', 'files', 'window', 'reload', 'console', 'teardown', 'r17b-history', 'g1-open', 'g1-close', 'root-add', 'r17b-0', 'r17b-up-l1', 'r17b-ctl', 'r17b-act-ctl', 'r17b-back-noact', 'r17b-rd-2', 'r17b-newtab-plain', 'r17b-newtab-load', 'r17b-back', 'r17b-fwd', 'r17b-back-samedoc', 'r17b-disarm', 'r17b-newtab-refused', 'r17b-back-empty', 'r17b-rd-dl-socket', 'r17b-up-opt', 'r17b-up-6', 'r17b-up-7', 'r17b-save-refuse', 'r17b-f-raw', 'r17b-f-raw-2', 'r17b-f-raw-dir', 'r17b-f-raw-enc', 'r17b-f-raw-ok', 'r17b-up-race-a', 'r17b-up-devt', 'r17b-restore', 'r17b-logs')]
  [string]$Block
)
$ErrorActionPreference = 'Continue'
$Repo = Split-Path -Parent $PSScriptRoot
Set-Location $Repo
$env:Path = "$env:LOCALAPPDATA\Author Software\nvm\.nodejs;$env:Path"
[Console]::OutputEncoding = [Text.Encoding]::UTF8
# Tied to recipes/s11b-r17b-plan.ts by recipes/test/s11b-r17b-static.test.ts.
$FramingBlocks = @('preflight', 'servers', 'files', 'window', 'reload', 'console', 'teardown')
$SliceA = @('preflight', 'servers', 'files', 'window', 'reload', 'console', 'r17b-0', 'r17b-up-l1', 'r17b-ctl', 'r17b-act-ctl', 'r17b-back-noact', 'r17b-history', 'g1-open', 'r17b-rd-2', 'r17b-newtab-plain', 'r17b-newtab-load', 'r17b-back', 'r17b-fwd', 'r17b-back-samedoc', 'r17b-disarm', 'g1-close', 'r17b-newtab-refused', 'r17b-back-empty', 'r17b-rd-dl-socket', 'r17b-up-opt', 'r17b-up-6', 'r17b-up-7', 'r17b-save-refuse', 'r17b-restore', 'r17b-logs', 'teardown')
$SliceB = @('preflight', 'servers', 'files', 'window', 'reload', 'console', 'r17b-0', 'root-add', 'r17b-f-raw', 'r17b-f-raw-2', 'r17b-f-raw-dir', 'r17b-f-raw-enc', 'r17b-f-raw-ok', 'r17b-up-race-a', 'r17b-up-devt', 'r17b-restore', 'r17b-logs', 'teardown')
$NeedsAccess = @('root-add', 'r17b-f-raw', 'r17b-f-raw-2', 'r17b-f-raw-dir', 'r17b-f-raw-enc', 'r17b-f-raw-ok', 'r17b-up-race-a', 'r17b-up-devt')
$Carried = @{ 'r17b-up-l1' = 'r17-up-l1'; 'r17b-rd-dl-socket' = 'rd-dl-socket'; 'r17b-up-opt' = 'r17-up-opt'; 'r17b-up-6' = 'r17-up-6'; 'r17b-up-7' = 'r17-up-7'; 'r17b-save-refuse' = 'r17-save-refuse'; 'r17b-f-raw' = 'f-raw'; 'r17b-f-raw-2' = 'f-raw-2'; 'r17b-f-raw-dir' = 'f-raw-dir'; 'r17b-f-raw-enc' = 'f-raw-enc'; 'r17b-f-raw-ok' = 'f-raw-ok'; 'r17b-up-race-a' = 'r17-up-race-a'; 'r17b-up-devt' = 'r17-up-devt'; 'r17b-restore' = 'rd-restore'; 'r17b-logs' = 'rd-logs' }
$GateRows = @('R17B-F-RAW', 'R17B-F-RAW-2', 'R17B-F-RAW-DIR', 'R17B-F-RAW-ENC', 'R17B-F-RAW-OK', 'R17B-UP-RACE-A', 'R17B-UP-DEVT')
if ($Block -eq 'plan') { $r17bIds = $SliceA -join ' '; Write-Host "PLAN liveA17B: $r17bIds"; $r17bIds = $SliceB -join ' '; Write-Host "PLAN liveB17B: $r17bIds"; exit 0 }
if (-not $env:S11_OUT) { $env:S11_OUT = Join-Path $env:TEMP 'bridge-e2e\s11b' }
New-Item -ItemType Directory -Force $env:S11_OUT | Out-Null
$env:S9_OUT = $env:S11_OUT
$env:S9_ACTORS = Join-Path $env:S11_OUT 'actors'
$Steps = 'docs/plans/2026-10-26-step11b-block-list-redirects-steps'
$Record = Join-Path $Repo "$Steps/S7-run-record.md"
$Framing = Join-Path $env:S11_OUT 'r17b-framing.txt'
$GlobalsFile = Join-Path $env:S11_OUT 'r17b-globals.clixml'
$OldGlobals = Join-Path $env:S11_OUT 'r17-globals.clixml'
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
$Dash = [char]0x2014
$Persist = @('W', 'O', 'E', 'D', 'X', 'S9WinIds', 'S11Own', 'S11Found', 'S11RootText', 'S11Stable', 'S16Changed', 'S16Pids', 'S16Born', 'S16Toggle', 'S16Mark', 'S16Actor', 'S16ConsoleRead', 'R17Fallback', 'R17CapsDone', 'R17ErrMs', 'R17HopMs', 'R17Rd3Ms', 'R17SockRan', 'R17SockLog0', 'R17SockLog1', 'R17ActorRan')
. "$PSScriptRoot\s9-win.ps1"
. "$PSScriptRoot\s11-win.ps1"
. "$PSScriptRoot\s11b-win.ps1"
$global:S9PinUiaOnly = $true                      # never pin or unpin by mouse in this wave
$global:S16Stops = 0; $global:S16Fail = 0; $global:S16NM = 0; $global:S16Gone = $false; $global:S16InRestore = $false; $global:R17NB = 0

# ---- Run 17's helpers, read by its parser (s11b-r17.ps1 is not edited and has a main that must not run) ---------------------------
$R17Blocks = @{}; $R17Funcs = 0
$r17bTk = $null; $r17bEr = $null
$R17Ast = [Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot 's11b-r17.ps1'), [ref]$r17bTk, [ref]$r17bEr)
foreach ($r17bSt in $R17Ast.EndBlock.Statements) {
  if ($r17bSt -is [Management.Automation.Language.FunctionDefinitionAst]) { $R17Funcs++; . ([scriptblock]::Create($r17bSt.Extent.Text)) }
  elseif ($r17bSt -is [Management.Automation.Language.AssignmentStatementAst] -and $r17bSt.Left.Extent.Text.StartsWith('$Blocks[')) {
    $r17bNm = [regex]::Match($r17bSt.Left.Extent.Text, "'([^']+)'").Groups[1].Value
    $R17Blocks[$r17bNm] = & ([scriptblock]::Create($r17bSt.Right.Extent.Text))
  }
}
if ($r17bEr.Count -ne 0 -or $R17Funcs -ne 49 -or $R17Blocks.Count -ne 49) { Write-Host 'STOP: Run 17''s block list was not read from s11b-r17.ps1'; exit 2 }

# ---- Run 17b's own pieces ------------------------------------------------------------------------------------------------------------
# S1-helpers-b: r17b-history is not a framing block: its HIST/ACT set-up lines belong to the record stream.
function Set-S17Raw([string]$Name) { $env:S9_RAW = if ($FramingBlocks -contains $Name -or $Name -like 'g1-*' -or $Name -eq 'root-add') { $Framing } else { $Record } }
function Test-S17Gate([string]$Name) {
  if (($NeedsAccess -contains $Name) -and $global:S16Toggle -ne 'on') { Say9 "GATE block $Name refused: the file-URL toggle did not read on (G11-3); its rows stay NOT RUN"; return $false }
  $true
}
# liveB17B only: the toggle is read right after the preflight (read only, nothing pressed). OFF: the seven rows are written NOT RUN.
function Read-S17Early {
  $E2 = New-S16Window "chrome://extensions/?id=$S9Id"
  try { $reading = @(Read-S11FileAccess $E2)[-1] } finally { Close-S11Window $E2 }
  if ($reading -notin 'on', 'off') { Fail-S16 'the file-URL toggle is unreadable; nothing changed' }   # STOP-MAP toggle-unreadable
  $global:S16Toggle = $reading
  if ($reading -ne 'on') {
    $env:S9_RAW = $Record
    foreach ($Row in $GateRows) { Say9 "ROW $Row NOT RUN $Dash waits for G11-3" }
    Say9 'GATE liveB17B refused before any state change: the file-URL toggle reads off (G11-3)'
    $global:S16Gone = $true; Save-S16
    return $false
  }
  $true
}
# The console's tab listener (R17B-0 (f), the newTab rows): started before the call, read after. Labels and numbers only.
function Start-R17bWatch {
  if ($global:R17Fallback) { return $false }
  $c = Invoke-S11bConsoleEval $global:D 'tabwatch' @('--mode', 'start') @('--mode', 'start')
  if ($c -eq 10) { $global:R17Fallback = $true }
  ($c -eq 0)
}
function Read-R17bWatch([string]$Row = '', [string]$ReplyMs = '') {
  $o = @('--mode', 'read'); if ($ReplyMs) { $o += @('--reply-ms', $ReplyMs) }; if ($Row) { $o += @('--row', $Row) }
  [int](Invoke-S11bConsoleEval $global:D 'tabwatch' @('--mode', 'read') $o)
}
# `tabs total=<n>` of an S9 tabs call: the tab-row count (R17B-NEWTAB-REFUSED); -1 when unreadable.
function Get-R17bTabTotal {
  [void](Call9 'R17B-NEWTAB-REFUSED' 'tabs' 'tabs' @() 'record')
  $m = [regex]::Match(($global:R17Out -join "`n"), 'tabs total=(\d+)')
  if ($m.Success) { [int]$m.Groups[1].Value } else { -1 }
}
# A hits clause: redirect 1 and blocked 0 (R17B-RD-2); blocked 0 alone for the rows with no redirect.
function Get-R17bBlockedCode([string]$Tag) { $h = Get-R17Hits $Tag -BlockedOnly; if ($h.Blocked -eq 0) { 0 } elseif ($h.Blocked -lt 0) { 3 } else { 2 } }
function Invoke-S17Block([string]$Name) {
  $env:S9_RAW = $Framing; Say9 "BLOCK $Name start"
  Set-S17Raw $Name
  $s0 = $global:S16Stops
  & $Blocks[$Name]
  if ($global:S16Stops -gt $s0) { throw "block $Name printed a STOP" }   # STOP-MAP any-stop-line
  $env:S9_RAW = $Framing; Say9 "BLOCK $Name done"
  Save-S16
}
# A carried row: Run 17's block logic for the same step, named by a CARRIED line (no other change).
# F6: the block's own verdict lines (new record lines since it began) give the R17B row line (B17 carried-row); Run 17's file is not edited.
function Write-R17bCarriedRow([string]$Row, [string]$Orig, [int]$From) {
  $new = @(Get-Content -LiteralPath $Record -Encoding UTF8 -ErrorAction SilentlyContinue | Select-Object -Skip $From)
  $f = Join-Path $env:S11_OUT 'r17b-carried.txt'
  Write-R17File $f ([string[]]$new)
  try { [void](Invoke-R17Node 's11b' @('carried-row', '--row', $Row, '--orig', $Orig, '--from', $f)) } finally { Remove-Item -LiteralPath $f -Force -ErrorAction SilentlyContinue }
}
function Get-R17bRecordLines { @(Get-Content -LiteralPath $Record -Encoding UTF8 -ErrorAction SilentlyContinue).Count }
function Invoke-R17bCarried([string]$Row, [string]$Orig) {
  Say9 "CARRIED $Row as R17 block $Orig"
  $n0 = Get-R17bRecordLines
  & $R17Blocks[$Orig]
  Write-R17bCarriedRow $Row $Orig $n0
}

# ---- the blocks --------------------------------------------------------------------------------------------------------------------
$Blocks = @{}
$Blocks['preflight'] = {
  if ((Test-Path $GlobalsFile) -or (Test-Path $OldGlobals)) { Fail-S16 'a previous wave''s globals exist; run its teardown first' }
  Assert-R17TreeClean   # STOP-MAP tree-dirty
  foreach ($f in 'daemon\dist\index.js', 'mcp\dist\index.js', 'extension\dist\sw.js') { if (-not (Test-Path $f)) { Fail-S16 'a dist file is missing; run npm run build first' } }
  if (-not (Get-Process chrome -ErrorAction SilentlyContinue)) { Fail-S16 'Chrome is not running (it is never launched here)' }
  if (-not (Get-Command python -ErrorAction SilentlyContinue)) { Fail-S16 'python was not found' }
  foreach ($k in 8081, 8083, 8085, 8086, 8087, 8090, 8091, 9234) { if (-not (Test-S16Port $k)) { Fail-S16 "port $k is held by a program the wave did not start (#251)" } }   # STOP-MAP port-foreign
  New-Item -ItemType Directory -Force $LogDir | Out-Null
  $mk = @(Get-Content $DaemonLog -ErrorAction SilentlyContinue); $global:S16Mark = $mk.Count
  Say9 "PREFLIGHT ok: head $(git rev-parse --short HEAD), tree clean, ports 8081 8083 8085 8086 8087 8091 free, 8090 unbound, 9234 free or the daemon's"
}
$Blocks['servers'] = {
  New-Item -ItemType Directory -Force $LogDir | Out-Null
  Start-R17Srv 8081 '-m http.server 8081 --bind 127.0.0.1 --directory test-fixtures'
  Start-R17Srv 8083 '-I recipes/s9-redirect.py 8083 http://localhost:8085'
  Start-R17Srv 8085 '-m http.server 8085 --bind 127.0.0.1 --directory test-fixtures'
  Start-R17Srv 8086 '-I recipes/s11b-delay.py 8086 4 http://localhost:8085'
  Start-R17Srv 8087 '-I recipes/s11b-slow.py 8087 3 test-fixtures'
  Start-R17Srv 8091 '-I recipes/s11b-flip.py 8091 http://localhost:8085'
  foreach ($k in 8081, 8083, 8085, 8086, 8087, 8091) {
    if (-not (Test-R17Listens $k)) { Fail-S16 "the fixture server on $k did not answer" }
    if (-not (Test-S16Port $k)) { Fail-S16 "port $k is not held by the wave's own server" }   # STOP-MAP port-foreign
  }
  if (-not (Test-S16Port 8090)) { Fail-S16 'port 8090 (the closed port) is bound' }
  Say9 'SERVERS 8081 8083 8085 8086 8087 8091 up on 127.0.0.1 under the wave''s own PIDs; 8088 8089 8090 not started; 8080 unused'
}
foreach ($r17bN in 'files', 'window', 'reload', 'console', 'teardown', 'g1-open', 'g1-close', 'root-add') { $Blocks[$r17bN] = $R17Blocks[$r17bN] }
$Blocks['r17b-0'] = {
  if ($global:S16Changed) { Fail-S16 'R17B-0 after a state change would overwrite the found texts; refused' }
  # Every line of the block goes to a scratch file first; the record gets the joined first line, then the sheet's other lines.
  $sc = Join-Path $env:S11_OUT 'r17b-0-lines.txt'; $twf = Join-Path $env:S11_OUT 'r17b-0-tabwatch.txt'
  Remove-Item -LiteralPath $sc, $twf -Force -ErrorAction SilentlyContinue
  $env:S9_RAW = $sc
  $r17b0Done = $false
  try {
    $c = Invoke-S11bConsoleEval $global:D 'manifest'   # (a)
    if ($c -ne 0) { Stop9 'R17B-0 (a): the manifest read did not return 0 (console unavailable, a failed check or a STOP); Run 17b has no fallback'; throw 'stop' }   # STOP-MAP console-unavailable
    Read-R17Rules   # (b)
    if ($global:R17Fallback) { Stop9 'R17B-0 (b): the console cannot evaluate; Run 17b has no fallback'; throw 'stop' }   # STOP-MAP console-unavailable
    $E2 = New-S16Window "chrome://extensions/?id=$S9Id"   # (c) the toggle, the found state
    $reading = @(Read-S11FileAccess $E2)[-1]
    Close-S11Window $E2
    if ($reading -notin 'on', 'off') { Fail-S16 'the file-URL toggle is unreadable; nothing changed' }   # STOP-MAP toggle-unreadable
    $global:S16Toggle = $reading
    Step-S16 'found' { Save-S11Found (Use-S16Options) $FoundDir $reading }
    [void](Invoke-R17Node 's11' @('found', '--file', $FoundJson))
    [void](Invoke-R17Node 's11b' @('state', '--found', $FoundJson, '--folders', (Join-Path $FoundDir 'found-uploadfolders.txt')) -StopOnFail)
    [void](Invoke-R17Node 's11b' @('foundlist', '--file', (Join-Path $FoundDir 'found-blocklist.txt')) -StopOnFail)   # (d)
    if (-not (Start-R17bWatch)) { Stop9 'R17B-0 (f): the tab listener could not be started'; throw 'stop' }   # STOP-MAP console-unavailable
    [void](Call9 'R17B-0' 'open' 'newtab' @('http://localhost:8081/e2e-playground.html?s11b=b0', '--as', 'b0') 'ok')
    if ((Read-R17bWatch) -ne 0) { Stop9 'R17B-0 (f): the tab listener read failed'; throw 'stop' }   # STOP-MAP console-unavailable
    $all = @(Get-Content -LiteralPath $sc -Encoding UTF8)
    $tw = @($all | Where-Object { $_ -match '^TABWATCH ' })
    if ($tw.Count -eq 0) { Stop9 'R17B-0 (f): no TABWATCH line was read'; throw 'stop' }   # STOP-MAP created-url
    Write-R17File $twf @($tw[-1])
    [void](Invoke-R17Node 's11b' @('build-proof', '--tabwatch', $twf) -StopOnFail)   # (e)(f): names < 2 or not an ancestor or created-url other   # STOP-MAP build-not-s6   # STOP-MAP created-url
    Close-R17Tab 'R17B-0' 'b0'
    $all = @(Get-Content -LiteralPath $sc -Encoding UTF8)
    $man = @($all | Where-Object { $_ -match '^MANIFEST ' })[-1]
    $bld = @($all | Where-Object { $_ -match '^BUILD ' })[-1]
    if (-not $man -or -not $bld) { Stop9 'R17B-0: the MANIFEST or the BUILD text is missing'; throw 'stop' }   # STOP-MAP build-not-s6
    $first = "$man $bld"   # the sheet's first line: the MANIFEST text joined to the BUILD text, one line
    $env:S9_RAW = $Record
    Show-S16 @($first)
    Show-S16 @($all | Where-Object { $_ -match '^(RULES |STATE |TOGGLE |FOUNDLIST |S6 commit=|TABWATCH |ROW )' })
    $r17b0Done = $true
  } finally {
    Set-S17Raw 'r17b-0'
    # F4: on a STOP the record still gets the block's STOP, ROW, BUILD, S6 and MANIFEST lines (the terminal showed them already).
    if (-not $r17b0Done -and (Test-Path -LiteralPath $sc)) {
      $keep = @(Get-Content -LiteralPath $sc -Encoding UTF8 | Where-Object { $_ -match '^(\S+Z )?(STOP: |ROW |BUILD |S6 commit=|MANIFEST )' } | ForEach-Object { $_.Replace($env:USERPROFILE, '<PROFILE>') })
      if ($keep.Count) { Write-S9Raw $keep }
    }
    Remove-Item -LiteralPath $twf -Force -ErrorAction SilentlyContinue
  }
}
$Blocks['r17b-ctl'] = {
  # R17B-CTL narrows RD-CTL to 8083, 8086, 8091 and the 8085 counter (8088 and 8089 are not started), then the timed 8087 GET.
  $n0 = Get-R17bRecordLines
  [void](Invoke-R17Node 's11b' @('ctl', '--log85', (Join-Path $LogDir 'p8085.txt'), '--skip', '8088,8089') -StopOnFail)   # STOP-MAP ctl-missed
  Write-R17bCarriedRow 'R17B-CTL' 'rd-ctl' $n0
  [void](Invoke-R17Node 's11b' @('ctl-slow') -StopOnFail)   # STOP-MAP ctl-missed
}
$Blocks['r17b-act-ctl'] = {
  New-R17Tab 'R17B-ACT-CTL' 'ac' 'ac0'
  [void](Invoke-R17Node 's11b' @('history', '--kind', 'p3', '--tab', 'ac', '--tag', 'ac', '--activate', '--label', 'act-ctl'))
  Invoke-R17History 'R17B-ACT-CTL' 'back' 'ac' '' 2 -StopOnFail   # STOP-MAP act-refused
  Invoke-R17History 'R17B-ACT-CTL' 'forward' 'ac' '' 2 -StopOnFail
  Close-R17Tab 'R17B-ACT-CTL' 'ac'
}
$Blocks['r17b-back-noact'] = {
  New-R17Tab 'R17B-BACK-NOACT' 'na' 'na0'
  [void](Invoke-R17Node 's11b' @('history', '--kind', 'p3', '--tab', 'na', '--tag', 'na'))   # no --activate: the documented limit (#308)
  Invoke-R17History 'R17B-BACK-NOACT' 'back' 'na'
  Close-R17Tab 'R17B-BACK-NOACT' 'na'
}
# The activated histories of R17B-BACK, R17B-FWD and R17B-BACK-SAMEDOC, built with the list as found. Every tab is opened by `S9 newtab --as`
# (New-R17Tab), so the activation guard finds it in `opened`. A refused set-up back is a STOP (no NOT BUILT path exists here).
$Blocks['r17b-history'] = {
  New-R17Tab 'R17B-HIST' 'hb' 'hb0'; New-R17Tab 'R17B-HIST' 'hf' 'hf0'; New-R17Tab 'R17B-HIST' 'hs' 'hs0'
  [void](Invoke-R17Node 's11b' @('history', '--kind', 'back', '--tab', 'hb', '--tag', 'bbk', '--activate', '--label', 'bk'))   # STOP-MAP activation-target
  [void](Invoke-R17Node 's11b' @('history', '--kind', 'fwd', '--tab', 'hf', '--tag', 'bfw', '--activate', '--label', 'fw'))   # STOP-MAP setup-back-refused
  [void](Invoke-R17Node 's11b' @('history', '--kind', 'samedoc', '--tab', 'hs', '--tag', 'bsd', '--activate', '--label', 'sd'))
}
$Blocks['r17b-rd-2'] = {
  $w = Start-R17bWatch
  $ans = [int](Call9 'R17B-RD-2' 'open' 'newtab' @('http://localhost:8083/e2e-playground.html?s11b=bd2', '--as', 'r2') 'ok')   # the answer clause: a non-ok answer is a failed clause
  Start-Sleep -Seconds 2
  # M1 (fixer 3): the `tabs` step reads r2's own row of the SDK's tab list by its handle (TABROW: labels only), no count over every tab
  [void](Invoke-R17Node 's11b' @('rd2-row', '--tab', 'r2'))
  $rowF = Join-Path $env:S11_OUT 'r17b-rd2-tabrow.txt'; $snapF = Join-Path $env:S11_OUT 'r17b-rd2-snap.txt'
  Write-R17File $rowF ([string[]]$global:R17Out)
  [void](Call9 'R17B-RD-2' 'snap' 'snapshot' @('r2') 'record')
  Write-R17File $snapF ([string[]]$global:R17Out)
  $snapC = [int](Invoke-R17Node 's11b' @('r17b-clause', '--kind', 'rd2-snap', '--row', 'R17B-RD-2 snapshot', '--from', $snapF, '--tabrow-from', $rowF))
  Remove-Item -LiteralPath $rowF, $snapF -Force -ErrorAction SilentlyContinue
  $h = Get-R17Hits 'bd2'
  if ($h.Blocked -gt 0) { Stop9 'R17B-RD-2: a blocked hit (the covered call let a request through)'; throw 'stop' }   # STOP-MAP rd2-blocked
  Read-R17Rules
  $codes = @($ans, $(if ($h.Redirect -eq 1 -and $h.Blocked -eq 0) { 0 } else { 1 }), $snapC, $(if ($global:R17RulesOk) { 0 } else { 3 }))
  $codes += $(if ($w) { Read-R17bWatch 'R17B-RD-2' } else { 3 })
  Close-R17Tab 'R17B-RD-2' 'r2'
  Write-R17Row 'R17B-RD-2' $codes
}
$Blocks['r17b-newtab-plain'] = {
  $w = Start-R17bWatch
  [void](Call9 'R17B-NEWTAB-PLAIN' 'open' 'newtab' @("$Fix81`?s11b=bnp", '--as', 'np') 'ok' -StopOnFail)   # STOP-MAP newtab-plain-differs
  [void](Call9 'R17B-NEWTAB-PLAIN' 'tabs' 'tabs' @() 'record')
  [void](Call9 'R17B-NEWTAB-PLAIN' 'snap' 'snapshot' @('np') 'record')
  # the page clause is read from S9's snapshot ROW line (elements and counter), which prints no title (F1)
  $snapF = Join-Path $env:S11_OUT 'r17b-np-snap.txt'; Write-R17File $snapF ([string[]]$global:R17Out)
  $page = [int](Invoke-R17Node 's11b' @('r17b-clause', '--kind', 'snap-page', '--row', 'R17B-NEWTAB-PLAIN page', '--from', $snapF))
  Remove-Item -LiteralPath $snapF -Force -ErrorAction SilentlyContinue
  $b = Get-R17bBlockedCode 'bnp'
  Read-R17Rules
  $codes = @($page, $b, $(if ($global:R17RulesOk) { 0 } else { 3 }))
  $codes += $(if ($w) { Read-R17bWatch 'R17B-NEWTAB-PLAIN' } else { 3 })
  Close-R17Tab 'R17B-NEWTAB-PLAIN' 'np'
  Write-R17Row 'R17B-NEWTAB-PLAIN' $codes
}
# Five trials. The op judges the reply against the hold and the page; it cannot know blocked and RULES (read after it), so an exit 3 from
# the op with nothing else missing is combined here with the hits and RULES reads (a blocked hit is a STOP).
$Blocks['r17b-newtab-load'] = {
  foreach ($i in 1..5) {
    $w = Start-R17bWatch
    $oc = [int](Invoke-R17Node 's11b' @('newtab-timed', '--row', "R17B-NEWTAB-LOAD-$i", '--url', "http://localhost:8087/slow/e2e-playground.html?s11b=bnl$i", '--as', "nl$i"))
    $lat = Get-R17LatMs
    $b = Get-R17bBlockedCode "bnl$i"
    if ($b -eq 2) { Stop9 "R17B-NEWTAB-LOAD-${i}: a blocked hit"; throw 'stop' }   # STOP-MAP newtab-load-blocked
    Read-R17Rules
    $codes = @($(if ($oc -eq 3) { 0 } else { $oc }), $b, $(if ($global:R17RulesOk) { 0 } else { 3 }))
    $wc = 0
    if ($w -and $lat -ge 0) { $wc = Read-R17bWatch '' "$lat" } elseif ($w) { $wc = Read-R17bWatch }
    if ($wc -eq 2) { Stop9 "R17B-NEWTAB-LOAD-${i}: the tab listener read printed a STOP"; throw 'stop' }
    Write-R17Row "R17B-NEWTAB-LOAD-$i" $codes
    Close-R17Tab 'R17B-NEWTAB-LOAD' "nl$i"
  }
}
$Blocks['r17b-newtab-refused'] = {
  $w = Start-R17bWatch
  $n0 = Get-R17bTabTotal; Start-Sleep -Seconds 1; $n0b = Get-R17bTabTotal
  [void](Call9 'R17B-NEWTAB-REFUSED' 'open' 'newtab' @('javascript:void 0', '--as', 'nr') 'record')
  $code = [regex]::Match(($global:R17Out -join "`n"), 'ROW \S+ open (ok|[A-Z][A-Z0-9_]*)').Groups[1].Value
  $n1 = Get-R17bTabTotal; Start-Sleep -Seconds 1; $n1b = Get-R17bTabTotal
  $wc = $(if ($w) { Read-R17bWatch } else { 3 })
  # N5: if Chrome accepted the javascript: URL a tab nr exists; close it (the count below still judges the row)
  if ($code -eq 'ok') { Close-R17Tab 'R17B-NEWTAB-REFUSED' 'nr' }
  if ($wc -eq 2) { Stop9 'R17B-NEWTAB-REFUSED: the tab listener read printed a STOP'; throw 'stop' }
  if ($n0 -lt 0 -or $n0 -ne $n0b -or $n1 -ne $n1b) { Say9 'ROW R17B-NEWTAB-REFUSED NOT MEASURED (the tab-row count was unreadable or moved between its two reads)'; $global:S16NM++; return }
  # F7 (decided 2026-10-27): a leftover blank tab fails the row as the sheet says; the wave goes on (a javascript: refusal comes after the install).
  if ($n1 -ne $n0) {
    $why = $(if ($code -eq 'ok') { 'the javascript: URL was accepted and a blank tab was made (it was closed)' } else { 'the tab-row count changed' })
    Say9 "ROW R17B-NEWTAB-REFUSED FAIL ($why)"; $global:S16Fail++; return
  }
  # F3: the gate refused before any tab was made (BAD_PARAMS or DOMAIN_BLOCKED), or no created event could be read: the path was not reached
  if (($code -in @('BAD_PARAMS', 'DOMAIN_BLOCKED')) -or $wc -eq 3 -or $code -eq '') { Say9 'ROW R17B-NEWTAB-REFUSED NOT MEASURED (path not reached: no tab was created, or the tab listener could not be read)'; $global:S16NM++; return }
  Say9 'ROW R17B-NEWTAB-REFUSED PASS (tab-row count equal before and after; the answer is a RECORD)'
}
$Blocks['r17b-back'] = { Invoke-R17History 'R17B-BACK' 'back' 'hb' 'bbk' }
$Blocks['r17b-fwd'] = { Invoke-R17History 'R17B-FWD' 'forward' 'hf' 'bfw' 2 }   # STOP-MAP fwd-first   (the first call of the pair is strict in B17)
$Blocks['r17b-back-samedoc'] = { Invoke-R17History 'R17B-BACK-SAMEDOC' 'back' 'hs' }   # STOP-MAP samedoc-refused
$Blocks['r17b-disarm'] = {
  $global:S16Changed = $true; Save-S16
  New-R17Tab 'R17B-DISARM' 'bdd' 'bddp'
  if (-not (Test-S11ButtonReady $global:W)) { throw 'R17B-DISARM: the toolbar button is not pinned or not armed' }   # STOP-MAP unpinned-disarm
  $Expect = Get-R17Expect
  $d = { Invoke-S11bPressAfterReply $global:W 'R17B-DISARM' -ReplyFile (Join-Path $env:S11_OUT 'node-out.txt') -Checked }
  $codes = @(Invoke-R17Flight 'R17B-DISARM' 'R17B-DISARM' @('--op', 'navigate', '--tab', 'bdd', '--url', 'http://localhost:8086/e2e-playground.html?s11b=bdd', '--expect', 'disarmed') $d 'at' @('--expect', $Expect))
  if ($codes -contains 2) { Stop9 'R17B-DISARM: RULES above 0 after the reply'; throw 'stop' }
  # the state read back is G1's (found + BLK): the found count plus one, not the found count
  $ok = @(Test-S9DaemonSafety ([bool]$global:S11Found.armed) ([bool]$global:S11Found.evaluate) ([int]$global:S11Found.count + 1) 'R17B-DISARM' 5000)[-1]
  $codes += $(if ($ok) { 0 } else { 1 })
  $codes += Get-R17HitCode 'bdd' 8086
  Close-R17Tab 'R17B-DISARM' 'bdd'
  Write-R17Row 'R17B-DISARM' $codes
}
$Blocks['r17b-back-empty'] = {
  if ($global:S11Found.blockLines -ne 0) { Say9 "ROW R17B-BACK-EMPTY NOT RUN $Dash found list not empty"; return }
  New-R17Tab 'R17B-BACK-EMPTY' 'he' 'be0'
  [void](Invoke-R17Node 's11b' @('history', '--kind', 'empty', '--tab', 'he', '--activate', '--label', 'be'))
  $s = $null
  if (-not $global:R17Fallback) {
    $s = Start-S11bConsoleEval $global:D 'rules' @('--sample', '100', '--for', '14000', '--mode', 'empty')
    if ($s.Code -eq 10) { $global:R17Fallback = $true; $s = $null } elseif ($null -ne $s.Code) { Stop9 'R17B-BACK-EMPTY: the RULES sampler could not be built'; throw 'stop' }
  }
  Invoke-R17History 'R17B-BACK-EMPTY' 'back' 'he' -RulesZero:($null -ne $s) -StopOnFail   # STOP-MAP empty-refused
  $t1 = [long]$global:R17Hist.Groups[3].Value
  Invoke-R17History 'R17B-BACK-EMPTY' 'forward' 'he' -RulesZero:($null -ne $s) -StopOnFail
  $t2 = [long]$global:R17Hist.Groups[4].Value
  if ($s) { $c = Complete-S11bConsoleEval $s @('--mode', 'empty', '--row', 'R17B-BACK-EMPTY', '--send', "$t1", '--reply', "$t2") -TimeoutMs 20000; if ($c -eq 2) { Stop9 'R17B-BACK-EMPTY: a rule existed during a history call'; throw 'stop' } }
  else { Say9 'R17B-BACK-EMPTY RULES samples NOT MEASURED (console eval unavailable)'; $global:S16NM++ }
  Close-R17Tab 'R17B-BACK-EMPTY' 'he'
}
foreach ($r17bK in $Carried.Keys) { $r17bO = $Carried[$r17bK]; $Blocks[$r17bK] = [scriptblock]::Create("Invoke-R17bCarried '$($r17bK.ToUpper())' '$r17bO'") }

try {
  Load-S16
  $Name = $Block
  if ($Block -eq 'liveA17B' -or $Block -eq 'liveB17B') {
    foreach ($r17bSlot in $(if ($Block -eq 'liveA17B') { $SliceA } else { $SliceB })) {
      if (-not (Test-S17Gate $r17bSlot)) { Invoke-S17Block 'teardown'; exit 3 }
      Invoke-S17Block $r17bSlot
      if ($Block -eq 'liveB17B' -and $r17bSlot -eq 'preflight' -and -not @(Read-S17Early)[-1]) { exit 3 }
    }
    $r17bFailN = $global:S16Fail; $r17bNmN = $global:S16NM
    Say9 "SLICE $Name done: calls with a failed check $r17bFailN, not measured $r17bNmN (the rows are in the record)"
  } else {
    if (-not (Test-S17Gate $Name)) { exit 3 }
    Invoke-S17Block $Name
  }
} catch {
  $r17bTag = Get-S11bStopCause $_
  Stop-S16Wave "an exception in block $Name ($r17bTag)"
}
exit 0
