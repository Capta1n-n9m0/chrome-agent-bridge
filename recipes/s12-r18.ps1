# recipes/s12-r18.ps1: the block runner of Run 18 (Step 12 S1-helpers-c; docs/e2e-test-plan.md section 4.26). Windows PowerShell 5.1, ASCII only.
# Written 2026-10-27 by builder S1-helpers-c (Sonnet 5.5); NOT run against Chrome, a daemon or a port by its author. The sequencing, the STOP and
# restore logic and the verdicts are in recipes/s12-r18-lib.ps1 (unit-tested with stubs: recipes/test/s12-r18*.test.ts).
#
#   S11_OUT=<dir> powershell.exe -NoProfile -ExecutionPolicy Bypass -File recipes/s12-r18.ps1 -Block liveA18 | liveB18 | plan | teardown [-Att <n>]   (Git Bash)
#
# Run 17's s11b-r17.ps1 and Run 17b's s11b-r17b.ps1 are not edited and cannot be dot-sourced (they run a main): their functions and the blocks
# this runner reuses (files, window, reload, console, teardown, root-add, rd-restore, r17b-0) are read with PowerShell's own parser.
# Exit: 0 done, 2 STOP (the safety state is restored first, #193), 3 not run (the file-URL toggle reads off: G11-3, never pressed).
# After a STOP that names a failed restore ("the restore failed ... the wave is over"): never run -Block teardown or re-run; return to the user.
# A slice is longer than the tool's 600 s cap: run it in the background. S11_OUT names the wave's out folder (outside the repo); an attempt
# after the first needs a fresh one (a capture path that holds text is a STOP) and its own -Att (a record file that holds text is a STOP).
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('liveA18', 'liveB18', 'plan', 'teardown')]
  [string]$Block,
  [int]$Att = 1
)
$ErrorActionPreference = 'Continue'
$Repo = Split-Path -Parent $PSScriptRoot
Set-Location $Repo
$env:Path = "$env:LOCALAPPDATA\Author Software\nvm\.nodejs;$env:Path"
[Console]::OutputEncoding = [Text.Encoding]::UTF8
. "$PSScriptRoot\s12-r18-lib.ps1"
if ($Block -eq 'plan') { foreach ($r18P in 'liveA18', 'liveB18') { Write-Host "PLAN ${r18P}: $((Get-R18Order $r18P) -join ' ')" }; exit 0 }
if (-not $env:S11_OUT) { $env:S11_OUT = Join-Path $env:TEMP 'bridge-e2e\s12' }
New-Item -ItemType Directory -Force $env:S11_OUT | Out-Null
$env:S9_OUT = $env:S11_OUT
$env:S9_ACTORS = Join-Path $env:S11_OUT 'actors'
$Steps = 'docs/plans/2026-10-27-step12-phase-f-steps'
$Framing = Join-Path $env:S11_OUT 'r18-framing.txt'
$Record = if ($Block -eq 'teardown') { $Framing } else { Join-Path $Repo "$Steps/$(Get-R18RecordName $Block $Att)" }   # teardown leaves no record file in the steps dir
$GlobalsFile = Join-Path $env:S11_OUT 'r18-globals.clixml'
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
$FramingBlocks = $R18FramingBlocks
$Persist = @('W', 'O', 'E', 'D', 'X', 'S9WinIds', 'S11Own', 'S11Found', 'S11RootText', 'S11Stable', 'S16Changed', 'S16Pids', 'S16Born', 'S16Toggle', 'S16Mark', 'S16Actor', 'S16ConsoleRead', 'R17Fallback', 'R17ActorRan', 'R18Slice')
. "$PSScriptRoot\s9-win.ps1"
. "$PSScriptRoot\s11-win.ps1"
. "$PSScriptRoot\s11b-win.ps1"
. "$PSScriptRoot\s12-win.ps1"                      # AFTER the three above (Invoke-S12Opt and the class-only omnibox line patch their functions)
$global:S9PinUiaOnly = $true                       # never pin, unpin or click the toolbar by mouse: an unpinned button is a STOP
$global:S16Stops = 0; $global:S16Fail = 0; $global:S16NM = 0; $global:S16Gone = $false; $global:S16InRestore = $false

# ---- Run 17's and Run 17b's helper functions and the reused blocks (by their own parser) -------------------------------------------
$r18D17 = Get-R18Defs (Join-Path $PSScriptRoot 's11b-r17.ps1')
$r18D17b = Get-R18Defs (Join-Path $PSScriptRoot 's11b-r17b.ps1')
foreach ($r18F in $r18D17.Funcs.Keys) { . ([scriptblock]::Create($r18D17.Funcs[$r18F])) }
foreach ($r18F in 'Set-S17Raw', 'Start-R17bWatch', 'Read-R17bWatch') { . ([scriptblock]::Create($r18D17b.Funcs[$r18F])) }
$R17Blocks = @{}; foreach ($r18K in $r18D17.Blocks.Keys) { $R17Blocks[$r18K] = & ([scriptblock]::Create($r18D17.Blocks[$r18K])) }
$R17bZero = & ([scriptblock]::Create($r18D17b.Blocks['r17b-0']))
foreach ($r18N in 'files', 'window', 'reload', 'console', 'teardown', 'root-add', 'rd-restore') { if (-not $R17Blocks[$r18N]) { Write-Host "STOP: Run 17's block $r18N was not read from s11b-r17.ps1"; exit 2 } }
if (-not $R17bZero -or -not (Get-Command Invoke-S12Opt -ErrorAction Ignore)) { Write-Host 'STOP: Run 17b''s r17b-0 block or the S12 helpers were not read'; exit 2 }
$Dash = [char]0x2014

# ---- the blocks ------------------------------------------------------------------------------------------------------------------
$global:R18Blocks = @{}
Set-R18Reused @('files', 'window', 'reload', 'console', 'teardown', 'root-add') $R17Blocks   # each runs stamped: s11 setup attaches the debugger
$global:R18Blocks['preflight'] = {
  Assert-S12Patched
  Assert-R17TreeClean
  foreach ($f in 'daemon\dist\index.js', 'mcp\dist\index.js', 'extension\dist\sw.js') { if (-not (Test-Path $f)) { Fail-S16 'a dist file is missing; run npm run build first' } }
  if (-not @(Get-Process | Where-Object { $_.ProcessName -eq 'chrome' }).Count) { Fail-S16 'Chrome is not running (it is never launched here)' }
  if (-not @(Get-Command -All -Name python -CommandType Application -ErrorAction Ignore).Count) { Fail-S16 'python was not found' }
  foreach ($k in 8081, 9234) { if (-not (Test-S16Port $k)) { Fail-S16 "port $k is held by a program the wave did not start (#251)" } }
  New-Item -ItemType Directory -Force $LogDir | Out-Null
  $global:S16Mark = $(if (Test-Path -LiteralPath $DaemonLog) { @(Get-Content -LiteralPath $DaemonLog).Count } else { 0 })
  [void](Assert-S12CaptureFree $global:R18Slice)
  Say9 "PREFLIGHT ok: head $(git rev-parse --short HEAD), tree clean, ports 8081 free, 9234 free or the daemon's, the capture file of $($global:R18Slice) is free"
}
$global:R18Blocks['servers'] = {
  New-Item -ItemType Directory -Force $LogDir | Out-Null
  Start-R17Srv 8081 '-m http.server 8081 --bind 127.0.0.1 --directory test-fixtures'
  if (-not (Test-R17Listens 8081)) { Fail-S16 'the fixture server on 8081 did not answer' }
  if (-not (Test-S16Port 8081)) { Fail-S16 'port 8081 is not held by the wave''s own server' }
  Say9 'SERVERS 8081 up on 127.0.0.1 under the wave''s own PID; 8080 and 8082 unused'
}
$global:R18Blocks['r18-0'] = { Invoke-R18Zero $R17bZero }
$global:R18Blocks['r18-up-l1'] = { Invoke-R18UpL1 }
$global:R18Blocks['r18-banner-ctl'] = { Invoke-R18BannerCtl }
$global:R18Blocks['r18-bc-close'] = { [void](Call9 'R18-BC' 'close' 'close' @('bc') 'record') }
$global:R18Blocks['r18-up-opt'] = { Invoke-R18UpOpt }
$global:R18Blocks['r18-up-6'] = { Invoke-R18Up6 }
$global:R18Blocks['r18-f-raw'] = { Invoke-R18Raw 'F-RAW' }
$global:R18Blocks['r18-f-raw-2'] = { Invoke-R18Raw 'F-RAW-2' }
$global:R18Blocks['r18-f-raw-dir'] = { Invoke-R18Raw 'F-RAW-DIR' @('--dir', 's11b-dir') }
$global:R18Blocks['r18-save-refuse'] = { Invoke-R18SaveRefuse }
$global:R18Blocks['r18-up-race-a'] = { Invoke-R18UpRaceA }
$global:R18Blocks['r18-up-devt'] = { Invoke-R18UpDevt }
$global:R18Blocks['r18-restore'] = { Invoke-R18Restore }
$global:R18Blocks['r18-logs'] = { Invoke-R18Logs }

exit ([int](@(Invoke-R18Main $Block)[-1]))
