# recipes/s10-ret1.ps1: RET-1's driver (Step 10 phase doc 0.7 with Stage 0 F16; docs/e2e-test-plan.md section 4.22 RET-1).
# Windows PowerShell 5.1, ASCII. Written 2026-10-25 by the S7 prep builder.
#
# PREPARED, NOT RUN. It KILLS AND RELAUNCHES THE USER'S REAL CHROME: it runs only after the user grants G10-2 (the
# ready-to-ask package is in S7-wave-sheet.md section "RET-1"). The Run 15 runner never runs it.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\s10-ret1.ps1 -Granted G10-2
#
# Steps (each prints one stamped line; any guard prints STOP: and exits 2 - the caller returns to the step agent):
#   1. guard: the found state is armed, JavaScript on, an empty list (s9.ts wait-safety --guard); else
#      "not run - disarmed as found" (F16), exit 3, nothing killed
#   2. the holder (recipes/s10-ret1.ts hold) in the background; READY = its fixture tab is held
#   3. Chrome's browser process identified: chrome.exe with no --type= in its command line and not a --headless one;
#      exactly one, else STOP; Test-SafeToKill on it, else STOP; Stop-Process -Force on it; every remaining chrome.exe of
#      that browser (its children, same user-data-dir: none named, so the default profile) gone within 30 s, else each
#      remaining one through Test-SafeToKill and stopped; the tree is walked by creation time (Get-S10Descendants), each
#      PID's creation time is recorded when identified and re-checked before its kill (else `SKIP <pid> reused`)
#   4. relaunch as recipes/bgf-launch.ps1 does (breakaway, a clean environment; no arguments: the profile's own start-up
#      setting decides whether pages are restored or "Restore pages?" is asked - RET-1's pass does not depend on it)
#   5. wait <= 90 s for the extension to reconnect (s9.ts wait-safety, any state reported), then RET-1.pressed; a
#      non-zero wait is a STOP (exit 2, with Chrome's process count), never a judge FAIL (S7 fixer #223, 2026-10-25)
#   6. the holder's lines; s10-ret1.ts judge (daemon.log retire n >= 1, tabGone with the fixture URL, the old Tab
#      TAB_GONE/TAB_UNKNOWN, the safety tuple read back equal to the found one); s10-ret1.ts cleanup
#
# S7 wave fixer 3 (2026-10-25, after Return 4): -Row RET-1R runs the same steps under the re-measurement's row ID
# (docs/e2e-test-plan.md section 4.22 RET-1R): every line, the .ready/.pressed signals and the default output folder
# (%TEMP%\bridge-e2e\s15-ret1r) carry the row; -Row takes RET-1 or RET-1R only. The relaunch (step 4) passes no
# -ArgLine: Run 15's `-ArgLine ''` was dropped by Windows PowerShell 5.1 (`powershell -File` drops an empty native
# argument), so bgf-launch.ps1 refused to bind and Chrome stayed down (Return 4); bgf-launch.ps1's default '' applies.
param([string]$Granted = '', [string]$Row = 'RET-1')
$ErrorActionPreference = 'Continue'
$Repo = Split-Path -Parent $PSScriptRoot
Set-Location $Repo
$env:Path = "$env:LOCALAPPDATA\Author Software\nvm\.nodejs;$env:Path"
if (@('RET-1', 'RET-1R') -cnotcontains $Row) { Write-Host "USAGE: -Row takes RET-1 or RET-1R (got '$Row'); nothing run"; exit 3 }
if (-not $env:S10_OUT) { $env:S10_OUT = Join-Path $env:TEMP ('bridge-e2e\s15-' + ($Row -replace '-', '').ToLower()) }
New-Item -ItemType Directory -Force $env:S10_OUT | Out-Null
$env:S9_OUT = $env:S10_OUT
$env:S9_RAW = Join-Path $env:S10_OUT 'ret1-raw.txt'
. "$PSScriptRoot\s10-win.ps1"
$Default = 'safety armed=true evaluate=true blockedCount=0'

function Quit([int]$Code, [string]$Msg) { if ($Code -eq 2) { Stop9 $Msg } else { Say9 $Msg }; exit $Code }

if ($Granted -ne 'G10-2') { Quit 3 "NOT RUN: $Row kills and relaunches the user's Chrome; it runs only with -Granted G10-2 after the user granted it" }
$mark = Now9
Say9 "$Row begins (G10-2 granted); daemon-log mark $mark"
$o = @(node --import tsx recipes/s9.ts wait-safety --armed true --evaluate true --count 0 --row "$Row-found" --timeout 5000)
foreach ($l in $o) { Write-Host $l }; Write-S9Raw $o
if ($LASTEXITCODE -ne 0) { Quit 3 "$Row not run - disarmed as found (or JavaScript off, or a non-empty list): F16 - nothing killed" }

$p = Start-Process -PassThru -WindowStyle Hidden -WorkingDirectory $Repo -FilePath node -ArgumentList '--import', 'tsx', 'recipes/s10-ret1.ts', 'hold', '--row', $Row -RedirectStandardOutput "$env:S10_OUT\ret1-hold.out" -RedirectStandardError "$env:S10_OUT\ret1-hold.err"
$null = $p.Handle
Say9 "holder PID $($p.Id)"
Wait-S9Ready $Row 60

$browser = @(Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { "$($_.CommandLine)" -notmatch '--type=' -and "$($_.CommandLine)" -notmatch '--headless' })
if ($browser.Count -ne 1) { Quit 2 "${Row}: $($browser.Count) Chrome browser processes found (need exactly 1) - nothing killed" }
$bp = [int]$browser[0].ProcessId
$t = Test-SafeToKill $bp
Say9 "Chrome browser process $bp ($((Get-Item (Get-S9Chrome)).VersionInfo.ProductVersion)): $t"
if (-not $t.StartsWith('safe:')) { Quit 2 "${Row}: Test-SafeToKill refused the Chrome browser process - nothing killed" }
# Its descendants by creation time, level by level (S7 prep fixer 2, W1: never s9-win.ps1's ParentProcessId-only walk).
# Each PID is kept with the creation time read here; every kill re-checks it (`SKIP <pid> reused` on a mismatch).
$rows = @(Get-S10Descendants $bp (Get-S10ProcTable))
$tree = @($rows | ForEach-Object { $_.Pid })
$bpBorn = [long]$rows[0].Born
if ($bpBorn -le 0 -or (Get-S10BornOf $bp) -ne $bpBorn) { Quit 2 "${Row}: SKIP $bp reused (its creation time changed or is unknown since it was identified) - nothing killed" }
$killAt = Now9
Stop-Process -Id $bp -Force
Say9 "KILLED Chrome's browser process $bp at $killAt (no orderly quit); its tree had $($tree.Count) process(es)"
$t0 = Get-Date
while (@($rows | Where-Object { (Get-S10BornOf $_.Pid) -eq $_.Born }).Count -and ((Get-Date) - $t0).TotalSeconds -lt 30) { Start-Sleep -Milliseconds 500 }
foreach ($x in @($rows | Where-Object { Get-Process -Id $_.Pid -ErrorAction SilentlyContinue })) {
  if (-not ($x.Born -gt 0 -and (Get-S10BornOf $x.Pid) -eq $x.Born)) { Say9 "SKIP $($x.Pid) reused (its creation time differs from the one recorded before the kill) - not killed"; continue }
  $tt = Test-SafeToKill ([int]$x.Pid); Say9 "left over $($x.Pid) : $tt"
  if ($tt.StartsWith('safe:')) { Stop-Process -Id $x.Pid -Force -ErrorAction SilentlyContinue }
}
Start-Sleep -Seconds 2

# No -ArgLine (S7 wave fixer 3, Return 4): bgf-launch.ps1's default '' applies - a plain launch, no arguments.
$o = @(powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\bgf-launch.ps1 -Exe (Get-S9Chrome))
foreach ($l in $o) { Write-Host $l }; Write-S9Raw $o
if ($LASTEXITCODE -ne 0) { Quit 2 "${Row}: the relaunch (bgf-launch.ps1) exited $LASTEXITCODE - Chrome is NOT running; the step agent tells the user at once" }
Say9 "relaunched at $(Now9)"
$o = @(node --import tsx recipes/s9.ts wait-safety --row "$Row-reconnect" --timeout 90000)
foreach ($l in $o) { Write-Host $l }; Write-S9Raw $o
if ($LASTEXITCODE -ne 0) { Quit 2 "${Row}: Chrome did not reconnect to the bridge within 90 s (wait-safety exited $LASTEXITCODE; chrome processes now: $(@(Get-Process chrome -ErrorAction SilentlyContinue).Count)) - not judged; the holder PID $($p.Id) is left to the step agent; RETURN to the step agent" }
[IO.File]::WriteAllText((Join-Path $env:S10_OUT "$Row.pressed"), (Now9), (New-Object Text.UTF8Encoding $false))
if (-not $p.WaitForExit(120000)) { Quit 2 "${Row}: the holder did not end within 120 s" }
foreach ($l in @(Get-Content "$env:S10_OUT\ret1-hold.out" -Encoding UTF8)) { Write-Host $l; Write-S9Raw $l }
$o = @(node --import tsx recipes/s10-ret1.ts judge --since $mark --found $Default --row $Row)
foreach ($l in $o) { Write-Host $l }; Write-S9Raw $o
$o = @(node --import tsx recipes/s10-ret1.ts cleanup)
foreach ($l in $o) { Write-Host $l }; Write-S9Raw $o
Say9 "$Row done (the user's own tabs and windows were not touched; what session restore showed is the user's to see)"
