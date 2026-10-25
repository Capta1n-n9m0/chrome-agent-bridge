# recipes/s10-mem.ps1: SAVE-64's memory sampler (Run 15; docs/e2e-test-plan.md section 4.22; a RECORD, step-agent ruling
# D3). Windows PowerShell 5.1. Written 2026-10-25 by the S7 prep builder; not run against Chrome by its author.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\s10-mem.ps1 -Out <file> [-PollMs 250] [-MaxSec 300]
#
# The method, stated before the run: at start it lists every chrome.exe whose command line has --extension-process (an
# MV3 service worker and an offscreen document live in the extension's renderer process; which extension a process
# serves is not proven, so several candidates are sampled), then every PollMs appends one line per live candidate,
# `<ms since start> <pid> <PrivateMemorySize64>`, to -Out, until <Out>.stop exists or MaxSec passed. Reads process
# counters only; prints nothing but its own start and end lines; never touches a process.
param([Parameter(Mandatory = $true)][string]$Out, [int]$PollMs = 250, [int]$MaxSec = 300)
$ErrorActionPreference = 'Continue'
$pids = @(Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { "$($_.CommandLine)" -match '--extension-process' -and "$($_.CommandLine)" -notmatch '--headless' } | ForEach-Object { [int]$_.ProcessId })
$t0 = [DateTime]::UtcNow
$enc = New-Object Text.UTF8Encoding $false
[IO.File]::WriteAllText($Out, '', $enc)
while (-not (Test-Path "$Out.stop") -and (([DateTime]::UtcNow) - $t0).TotalSeconds -lt $MaxSec) {
  $s0 = [DateTime]::UtcNow
  $ms = [int]($s0 - $t0).TotalMilliseconds
  $lines = foreach ($id in $pids) { $p = Get-Process -Id $id -ErrorAction SilentlyContinue; if ($p) { "$ms $id $($p.PrivateMemorySize64)" } }
  if ($lines) { [IO.File]::AppendAllText($Out, (($lines -join "`n") + "`n"), $enc) }
  $left = $PollMs - [int](([DateTime]::UtcNow) - $s0).TotalMilliseconds
  if ($left -gt 0) { Start-Sleep -Milliseconds $left }
}
