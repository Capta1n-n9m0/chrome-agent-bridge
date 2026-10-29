# recipes/s13-r20-a.ps1: the entry script of Run 20's liveA20 (Step 13 S5-drivers-A2; docs/e2e-test-plan.md section 4.28). Windows PowerShell 5.1, ASCII only.
# NOT run against Chrome, a daemon or a port by its author. It sets the wave's paths, dot-sources the s9/s11/s11b/s12 window helpers, reads Run 17's functions and blocks
# with PowerShell's own parser (as recipes/s12-r19.ps1 does), dot-sources recipes/s13-r20.ps1 (the Run 20 blocks and drivers), registers them and runs the slice.
#
#   S11_OUT=<dir> powershell.exe -NoProfile -ExecutionPolicy Bypass -File recipes/s13-r20-a.ps1 -Block liveA20 | plan | teardown [-Att <n>]   (Git Bash)
#
# Exit: 0 done, 2 STOP (the safety state is restored first, #193; every STOP line is followed by its RETURN line), 3 not run. After a STOP or at the end of a slice, run -Block teardown.
# EXCEPTION: after a STOP that names a failed restore (restored=no, "the wave is over"): never run -Block teardown or re-run; return to the user.
# A slice is longer than the tool's 600 s cap: run it in the background. S11_OUT names the wave's out folder (outside the repo); an attempt after the first needs a fresh one
# (a capture path that holds text is a STOP) and its own -Att (a record file that holds text is a STOP).
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('liveA20', 'plan', 'teardown')]
  [string]$Block,
  [int]$Att = 1
)
$ErrorActionPreference = 'Continue'
$Repo = Split-Path -Parent $PSScriptRoot
Set-Location $Repo
$env:Path = "$env:LOCALAPPDATA\Author Software\nvm\.nodejs;$env:Path"
[Console]::OutputEncoding = [Text.Encoding]::UTF8
. "$PSScriptRoot\s12-r18-lib.ps1"                   # only for Get-R18Defs
. "$PSScriptRoot\s9-win.ps1"
. "$PSScriptRoot\s11-win.ps1"
. "$PSScriptRoot\s11b-win.ps1"
. "$PSScriptRoot\s12-win.ps1"
. "$PSScriptRoot\s12-win-b.ps1"
. "$PSScriptRoot\s12-win-c.ps1"
. "$PSScriptRoot\s13-r20.ps1"                       # dot-sources s12-r19-lib.ps1, -a.ps1 and -c.ps1 unchanged, then the Run 20 definitions
if ($Block -eq 'plan') { Write-Host "PLAN liveA20: $((Get-R19Order 'liveA20') -join ' ')"; exit 0 }
if (-not $env:S11_OUT) { $env:S11_OUT = Join-Path $env:TEMP 'bridge-e2e\s13' }
New-Item -ItemType Directory -Force $env:S11_OUT | Out-Null
$env:S9_OUT = $env:S11_OUT
$env:S9_ACTORS = Join-Path $env:S11_OUT 'actors'
$Steps = 'docs/plans/2026-10-29-step13-phase-f-followups-steps'
$UpOptReport = Join-Path $env:S11_OUT 'none.md'
$Framing = Join-Path $env:S11_OUT 'r20-framing.txt'
$Record = if ($Block -eq 'teardown') { $Framing } else { Join-Path $Repo "$Steps/$(Get-R19RecordName $Block $Att)" }
$GlobalsFile = Join-Path $env:S11_OUT 'r20-globals.clixml'
$FoundDir = Join-Path $env:S11_OUT 'found'
$LogDir = Join-Path $env:S11_OUT 'logs'
$Root = Join-Path $env:S11_OUT 'wave\root'
$FoundJson = Join-Path $env:S11_OUT 'found.json'
$NowJson = Join-Path $env:S11_OUT 'now.json'
$DaemonLog = "$HOME\.chrome-agent-bridge\daemon.log"
$FramingBlocks = $R19FramingBlocks
$Persist = @('W', 'O', 'E', 'D', 'X', 'S9WinIds', 'S11Own', 'S11Found', 'S11RootText', 'S11Stable', 'S16Changed', 'S16Pids', 'S16Born', 'S16Toggle', 'S16Mark', 'S16Actor', 'S16ConsoleRead', 'R17Fallback', 'R17ActorRan', 'R19Slice', 'R19RootAdded', 'R19HumanClick', 'R19SegNext', 'R19Segs', 'R19SegLost', 'R19Rerun', 'R20Port')
$S12IdleMinMs = 20000
$global:S9PinUiaOnly = $true                        # never pin, unpin or click the toolbar by mouse: an unpinned button is a STOP
$global:S16Stops = 0; $global:S16Fail = 0; $global:S16NM = 0; $global:S16Gone = $false; $global:S16InRestore = $false
$r20D17 = Get-R18Defs (Join-Path $PSScriptRoot 's11b-r17.ps1')
$r20D17b = Get-R18Defs (Join-Path $PSScriptRoot 's11b-r17b.ps1')
foreach ($r20F in $r20D17.Funcs.Keys) { . ([scriptblock]::Create($r20D17.Funcs[$r20F])) }
foreach ($r20F in 'Set-S17Raw', 'Start-R17bWatch', 'Read-R17bWatch') { . ([scriptblock]::Create($r20D17b.Funcs[$r20F])) }
$R17Blocks = @{}; foreach ($r20K in $r20D17.Blocks.Keys) { $R17Blocks[$r20K] = & ([scriptblock]::Create($r20D17.Blocks[$r20K])) }
$R17bZero = & ([scriptblock]::Create($r20D17b.Blocks['r17b-0']))
foreach ($r20N in 'files', 'window', 'reload', 'console', 'teardown', 'rd-restore') { if (-not $R17Blocks[$r20N]) { Write-Host "STOP: Run 17's block $r20N was not read from s11b-r17.ps1"; exit 2 } }
if (-not $R17bZero -or -not (Get-Command Invoke-S12Opt -ErrorAction Ignore)) { Write-Host 'STOP: Run 17b''s r17b-0 block or the S12 helpers were not read'; exit 2 }
$global:R19Blocks = @{}
Register-R20Blocks
exit ([int](@(Invoke-R19Main $Block)[-1]))
