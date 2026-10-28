# recipes/s12-r19.ps1: the block runner of Run 19 (Step 12 S7-helpers-d; docs/e2e-test-plan.md section 4.27). Windows PowerShell 5.1, ASCII only.
# Written 2026-10-27 by builder S7-helpers-d (Sonnet 5.5); NOT run against Chrome, a daemon or a port by its author. The sequencing, the STOP and
# restore logic and the verdicts are in recipes/s12-r19-lib.ps1 (unit-tested with stubs: recipes/test/s12-r19*.test.ts).
#
#   S11_OUT=<dir> powershell.exe -NoProfile -ExecutionPolicy Bypass -File recipes/s12-r19.ps1 -Block liveA19 | liveB19 | liveC19 | liveD19 | liveE19 | plan | teardown [-Att <n>]   (Git Bash)
#
# Run 17's s11b-r17.ps1 and Run 17b's s11b-r17b.ps1 are not edited and cannot be dot-sourced (they run a main): their functions and the blocks
# this runner reuses (files, window, reload, console, teardown, root-add, rd-restore, r17b-0) are read with PowerShell's own parser.
# Exit: 0 done, 2 STOP (the safety state is restored first, #193), 3 not run (the file-URL toggle reads off: G11-3, never pressed).
# After a STOP that names a failed restore ("the restore failed ... the wave is over"): never run -Block teardown or re-run; return to the user.
# A slice is longer than the tool's 600 s cap: run it in the background. S11_OUT names the wave's out folder (outside the repo); an attempt
# after the first needs a fresh one (a capture path that holds text is a STOP) and its own -Att (a record file that holds text is a STOP).
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('liveA19', 'liveB19', 'liveC19', 'liveD19', 'liveE19', 'plan', 'teardown')]
  [string]$Block,
  [int]$Att = 1
)
$ErrorActionPreference = 'Continue'
$Repo = Split-Path -Parent $PSScriptRoot
Set-Location $Repo
$env:Path = "$env:LOCALAPPDATA\Author Software\nvm\.nodejs;$env:Path"
[Console]::OutputEncoding = [Text.Encoding]::UTF8
. "$PSScriptRoot\s12-r18-lib.ps1"                   # only for Get-R18Defs (Run 17's function and block texts, read by PowerShell's own parser)
. "$PSScriptRoot\s12-r19-lib.ps1"
. "$PSScriptRoot\s12-r19-a.ps1"                  # the liveA19 row drivers (S7-drivers-A)
. "$PSScriptRoot\s12-r19-b.ps1"                  # the liveB19 row drivers (S7-drivers-B)
. "$PSScriptRoot\s12-r19-c.ps1"                  # the liveC19 row drivers (S7-drivers-C)
if ($Block -eq 'plan') { foreach ($r19P in 'liveA19', 'liveB19', 'liveC19', 'liveD19', 'liveE19') { Write-Host "PLAN ${r19P}: $((Get-R19Order $r19P) -join ' ')" }; exit 0 }
if (-not $env:S11_OUT) { $env:S11_OUT = Join-Path $env:TEMP 'bridge-e2e\s12' }
New-Item -ItemType Directory -Force $env:S11_OUT | Out-Null
$env:S9_OUT = $env:S11_OUT
$env:S9_ACTORS = Join-Path $env:S11_OUT 'actors'
$Steps = 'docs/plans/2026-10-27-step12-phase-f-steps'
$UpOptReport = Join-Path $Repo "$Steps/S7-up-opt-investigator.md"
$Framing = Join-Path $env:S11_OUT 'r19-framing.txt'
$Record = if ($Block -eq 'teardown') { $Framing } else { Join-Path $Repo "$Steps/$(Get-R19RecordName $Block $Att)" }   # teardown leaves no record file in the steps dir
$GlobalsFile = Join-Path $env:S11_OUT 'r19-globals.clixml'
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
$FramingBlocks = $R19FramingBlocks
$Persist = @('W', 'O', 'E', 'D', 'X', 'S9WinIds', 'S11Own', 'S11Found', 'S11RootText', 'S11Stable', 'S16Changed', 'S16Pids', 'S16Born', 'S16Toggle', 'S16Mark', 'S16Actor', 'S16ConsoleRead', 'R17Fallback', 'R17ActorRan', 'R19Slice', 'R19RootAdded', 'R19HumanClick', 'R19SegNext', 'R19Segs', 'R19SegLost', 'R19Rerun')
. "$PSScriptRoot\s9-win.ps1"
. "$PSScriptRoot\s11-win.ps1"
. "$PSScriptRoot\s11b-win.ps1"
. "$PSScriptRoot\s12-win.ps1"                      # AFTER the three above (Invoke-S12Opt and the class-only omnibox line patch their functions)
. "$PSScriptRoot\s12-win-b.ps1"
. "$PSScriptRoot\s12-win-c.ps1"
$S12IdleMinMs = 20000                              # the Banner rule's IDLE (4.27): s12-win.ps1's 15 000 ms is Run 18's
$global:S9PinUiaOnly = $true                       # never pin, unpin or click the toolbar by mouse: an unpinned button is a STOP
$global:S16Stops = 0; $global:S16Fail = 0; $global:S16NM = 0; $global:S16Gone = $false; $global:S16InRestore = $false

# ---- Run 17's and Run 17b's helper functions and the reused blocks (by their own parser) -------------------------------------------
$r19D17 = Get-R18Defs (Join-Path $PSScriptRoot 's11b-r17.ps1')
$r19D17b = Get-R18Defs (Join-Path $PSScriptRoot 's11b-r17b.ps1')
foreach ($r19F in $r19D17.Funcs.Keys) { . ([scriptblock]::Create($r19D17.Funcs[$r19F])) }
foreach ($r19F in 'Set-S17Raw', 'Start-R17bWatch', 'Read-R17bWatch') { . ([scriptblock]::Create($r19D17b.Funcs[$r19F])) }
$R17Blocks = @{}; foreach ($r19K in $r19D17.Blocks.Keys) { $R17Blocks[$r19K] = & ([scriptblock]::Create($r19D17.Blocks[$r19K])) }
$R17bZero = & ([scriptblock]::Create($r19D17b.Blocks['r17b-0']))
foreach ($r19N in 'files', 'window', 'reload', 'console', 'teardown', 'root-add', 'rd-restore') { if (-not $R17Blocks[$r19N]) { Write-Host "STOP: Run 17's block $r19N was not read from s11b-r17.ps1"; exit 2 } }
if (-not $R17bZero -or -not (Get-Command Invoke-S12Opt -ErrorAction Ignore) -or -not (Get-Command Invoke-S19Opt -ErrorAction Ignore)) { Write-Host 'STOP: Run 17b''s r17b-0 block or the S12 helpers were not read'; exit 2 }
$Dash = [char]0x2014

# ---- the blocks ------------------------------------------------------------------------------------------------------------------
$global:R19Blocks = @{}
Set-R19Reused @('files', 'window', 'reload', 'console', 'teardown', 'root-add') $R17Blocks   # each runs stamped: s11 setup attaches the debugger
$global:R19Blocks['preflight'] = {
  Assert-S12Patched
  Assert-R17TreeClean
  foreach ($f in 'daemon\dist\index.js', 'mcp\dist\index.js', 'extension\dist\sw.js') { if (-not (Test-Path $f)) { Fail-S16 'a dist file is missing; run npm run build first' } }
  if (-not @(Get-Process | Where-Object { $_.ProcessName -eq 'chrome' }).Count) { Fail-S16 'Chrome is not running (it is never launched here)' }
  if (-not @(Get-Command -All -Name python -CommandType Application -ErrorAction Ignore).Count) { Fail-S16 'python was not found' }
  foreach ($k in 8081, 9234) { if (-not (Test-S16Port $k)) { Fail-S16 "port $k is held by a program the wave did not start (#251)" } }
  New-Item -ItemType Directory -Force $LogDir | Out-Null
  $global:S16Mark = $(if (Test-Path -LiteralPath $DaemonLog) { @(Get-Content -LiteralPath $DaemonLog).Count } else { 0 })
  [void](Assert-R19CaptureFree $global:R19Slice)
  Say9 "PREFLIGHT ok: head $(git rev-parse --short HEAD), tree clean, ports 8081 free, 9234 free or the daemon's, the capture file of $($global:R19Slice) is free"
}
$global:R19Blocks['servers'] = {
  New-Item -ItemType Directory -Force $LogDir | Out-Null
  Start-R17Srv 8081 '-m http.server 8081 --bind 127.0.0.1 --directory test-fixtures'
  if (-not (Test-R17Listens 8081)) { Fail-S16 'the fixture server on 8081 did not answer' }
  if (-not (Test-S16Port 8081)) { Fail-S16 'port 8081 is not held by the wave''s own server' }
  Say9 'SERVERS 8081 up on 127.0.0.1 under the wave''s own PID; 8080 and 8082 unused'
}
$global:R19Blocks['r19-0'] = { Invoke-R19Zero $R17bZero }
$global:R19Blocks['closerprobe'] = { Invoke-R19Closer }
# ---- liveA19's row drivers (S7-drivers-A): each is one Invoke-R19Row over its actor command; a state change is a step list plus its restore ------------
$global:R19Blocks['r19-banner-ctl'] = { Invoke-R19BannerCtl }
$global:R19Blocks['r19-con-banner'] = { Invoke-R19ConBanner }
$global:R19Blocks['r19-args-1'] = { Invoke-R19Row 'R19-ARGS-1' @('args-1') }
$global:R19Blocks['r19-args-2'] = { Invoke-R19Row 'R19-ARGS-2' @('args-2') }
$global:R19Blocks['r19-args-global'] = { Invoke-R19Row 'R19-ARGS-GLOBAL' @('args-global') }
$global:R19Blocks['r19-args-csp'] = { Invoke-R19Row 'R19-ARGS-CSP' @('args-csp') }
$global:R19Blocks['r19-args-stop'] = { Invoke-R19Row 'R19-ARGS-STOP' @('args-stop') }
$global:R19Blocks['r19-con-1'] = { Invoke-R19Row 'R19-CON-1' @('con-read', '--row', 'R19-CON-1') }
$global:R19Blocks['r19-con-2'] = { Invoke-R19Row 'R19-CON-2' @('con-read', '--row', 'R19-CON-2') }
$global:R19Blocks['r19-con-rej'] = { Invoke-R19Row 'R19-CON-REJ' @('con-read', '--row', 'R19-CON-REJ') }
$global:R19Blocks['r19-con-big'] = { Invoke-R19Row 'R19-CON-BIG' @('con-read', '--row', 'R19-CON-BIG') }
$global:R19Blocks['r19-con-nav'] = { Invoke-R19Row 'R19-CON-NAV' @('con-read', '--row', 'R19-CON-NAV') }
$global:R19Blocks['r19-con-mcp'] = { Invoke-R19Row 'R19-CON-MCP' @('con-mcp') -StepList @(@{ k = 's'; id = 'R19-CON-MCP' }) -Banner call }
$global:R19Blocks['r19-con-cap'] = { Invoke-R19Row 'R19-CON-CAP' @('con-cap') }
$global:R19Blocks['r19-args-3'] = { Invoke-R19Row 'R19-ARGS-3' @('args-3') -StepList (New-R19Steps 'R19-ARGS-3-js' 'R19-ARGS-3' { Set-R19JsOff } { Restore-R19Js }) -Restore { Restore-R19Js } -Banner refused -Why attach-on-refused-page }
$global:R19Blocks['r19-con-jsoff'] = { Invoke-R19Row 'R19-CON-JSOFF' @('refuse', '--row', 'R19-CON-JSOFF') -StepList (New-R19Steps 'R19-CON-JSOFF-js' 'R19-CON-JSOFF' { Set-R19JsOff } { Restore-R19Js }) -Restore { Restore-R19Js } -Banner refused -Why attach-on-refused-page }
$global:R19Blocks['r19-con-3'] = { Invoke-R19Row 'R19-CON-3' @('refuse', '--row', 'R19-CON-3') -StepList (New-R19Steps 'R19-CON-3-block' 'R19-CON-3' { Set-R19BlockAdd 's12blk.localhost' } { Restore-R19Block }) -Restore { Restore-R19Block } -Banner refused -Why attach-on-refused-page }
$global:R19Blocks['r19-con-frame'] = { Invoke-R19Row 'R19-CON-FRAME' @('con-frame') -StepList (New-R19Steps 'R19-CON-FRAME-block' '' { Set-R19BlockAdd 'f.s12site.localhost' } { Restore-R19Block }) -Restore { Restore-R19Block } }
$global:R19Blocks['r19-con-notea'] = { Invoke-R19Row 'R19-CON-NOTEA' @('con-notea') -StepList (New-R19Steps 'R19-CON-NOTEA-block' '' { Set-R19BlockAdd 's12blk.localhost' } { Restore-R19Block }) -Restore { Restore-R19Block } }
$global:R19Blocks['r19-con-4'] = { Invoke-R19Row 'R19-CON-4' @('refuse', '--row', 'R19-CON-4') -StepList (New-R19Steps 'R19-CON-4-off' 'R19-CON-4' { Switch-R19Toolbar $false } { Switch-R19Toolbar $true }) -Restore { Switch-R19Toolbar $true } -Banner refused -Why attach-after-disarm }
$global:R19Blocks['r19-con-floor'] = { Invoke-R19Row 'R19-CON-FLOOR' @('con-floor') -StepList (New-R19Steps 'R19-CON-FLOOR-off' '' { Switch-R19Toolbar $false } { Switch-R19Toolbar $true }) -Restore { Switch-R19Toolbar $true } }
$global:R19Blocks['r19-con-own'] = { Invoke-R19Row 'R19-CON-OWN' @('own-file', '--row', 'R19-CON-OWN') -StepList (New-R19Steps 'R19-CON-OWN-open' 'R19-CON-OWN' { Open-R19OwnWindow } { }) -Banner refused -Why attach-on-refused-page }
$global:R19Blocks['r19-con-file'] = { Invoke-R19Row 'R19-CON-FILE' @('own-file', '--row', 'R19-CON-FILE') -StepList (New-R19Steps 'R19-CON-FILE-open' 'R19-CON-FILE' { Open-R19FileWindow } { Close-R19FileWindow }) -Restore { Close-R19FileWindow } -Banner refused -Why attach-on-refused-page }
# ---- liveB19's row drivers (S7-drivers-B): DevTools only behind the DEVPROBE's answer; the carried banner rows and the kept-session rows ------------------
$global:R19Blocks['devprobe'] = { Invoke-R19DevProbe }
$global:R19Blocks['r19-up-opt'] = { Invoke-R19UpOpt }
$global:R19Blocks['r19-up-6'] = { Invoke-R19Up6 }
$global:R19Blocks['r19-f-raw'] = { Invoke-R19FRaw 'R19-F-RAW' }
$global:R19Blocks['r19-f-raw-2'] = { Invoke-R19FRaw 'R19-F-RAW-2' }
$global:R19Blocks['r19-f-raw-dir'] = { Invoke-R19FRaw 'R19-F-RAW-DIR' }
$global:R19Blocks['r19-keep-1'] = { Invoke-R19Keep1 }
$global:R19Blocks['r19-keep-2'] = { Invoke-R19Keep2 }
$global:R19Blocks['r19-keep-3'] = { Invoke-R19Keep3 }
$global:R19Blocks['r19-con-kept'] = { Invoke-R19Row 'R19-CON-KEPT' @('con-kept') -Actor 's12-r19-b' }
$global:R19Blocks['r19-keep-overlap-a'] = { Invoke-R19Row 'R19-KEEP-OVERLAP' @('overlap-a') -Actor 's12-r19-b' }
$global:R19Blocks['r19-up-devt'] = { Invoke-R19DevRow 'R19-UP-DEVT' "${R19Fix}s11-upload.html?s11=xwin&s12x=devt" 'up-devt' (New-R19DevSteps 'R19-UP-DEVT') }
$global:R19Blocks['r19-keep-4'] = { Invoke-R19Keep4 }
$global:R19Blocks['r19-devt-noflag'] = { Invoke-R19DevtNoflag }
$global:R19Blocks['r19-sweep-held'] = { Invoke-R19SweepHeld }
$global:R19Blocks['r19-restore'] = { Invoke-R19Restore }
$global:R19Blocks['r19-logs'] = { Invoke-R19Logs }
# The old-build slices: the swap, the old build's own proof line, the rows (no driver yet), and the finally that restores HEAD, reloads and re-proves.
$global:R19Blocks['r19-old-args'] = { Invoke-R19Swapped $R19Commit['liveD19'] { [void](Invoke-R19Node 's12-r19' @('proof')); Say9 "ROW R19-ARGS-OLD NOT RUN $Dash no driver built (S7-helpers-d DONE-PARTIAL)" } }
$global:R19Blocks['r19-old-version'] = { Invoke-R19Swapped $R19Commit['liveE19'] { Say9 "ROW R19-VERSION NOT RUN $Dash no driver built (S7-helpers-d DONE-PARTIAL)" } }
# ---- liveC19's row drivers (S7-drivers-C): the file chooser (window X for the human-style rows; every one ends in the closer) and G2 ----------------------
$global:R19Blocks['r19-choose-1'] = { Invoke-R19Choose1 }
$global:R19Blocks['r19-choose-label'] = { Invoke-R19ChooseLabel }
$global:R19Blocks['r19-choose-refuse'] = { Invoke-R19ChooseRefuse }
$global:R19Blocks['r19-choose-2'] = { Invoke-R19Choose2 }
$global:R19Blocks['r19-choose-3'] = { Invoke-R19Choose3 }
$global:R19Blocks['r19-choose-mcp'] = { Invoke-R19McpLegs }
$global:R19Blocks['r19-choose-kept'] = { Invoke-R19ChooseKept }
$global:R19Blocks['r19-choose-frame'] = { Invoke-R19ChooseFrame }
$global:R19Blocks['r19-choose-human'] = { Invoke-R19ChooseHuman }
$global:R19Blocks['r19-choose-late'] = { Invoke-R19ChooseLate }
$global:R19Blocks['r19-keep-overlap-b'] = { Invoke-R19KeepOverlapB }
$global:R19Blocks['r19-choose-4'] = { Invoke-R19Choose4 }
$global:R19Blocks['r19-choose-disarm'] = { Invoke-R19ChooseDisarm }
$global:R19Blocks['r19-choose-jsoff'] = { Invoke-R19ChooseJsoff }
$global:R19Blocks['r19-choose-mcp-d'] = { Invoke-R19McpD }
$global:R19Blocks['r19-g2-1'] = { Invoke-R19G2 'R19-G2-1' 'g2-1' }
$global:R19Blocks['r19-g2-2'] = { Invoke-R19G2 'R19-G2-2' 'g2-2' }
# liveD19's and liveE19's old-build rows are S7-drivers-DE's.

exit ([int](@(Invoke-R19Main $Block)[-1]))
