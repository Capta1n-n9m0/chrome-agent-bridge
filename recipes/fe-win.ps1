# recipes/fe-win.ps1: the window-capture loop of Step 8 stage FE (docs/e2e-test-plan.md §4.17, wave
# sheet docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-steps/FE-wave-sheet.md). Windows
# PowerShell 5.1. Written 2026-10-23 before any FE row ran; not run against Chrome before the wave (the
# build part may not touch Chrome), so a helper bug found live is fixed and recorded as a set-up fix -
# a helper never changes a row's expected text or PASS rule.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\fe-win.ps1 -Hwnd <driver window> -Seconds 240 -IntervalMs 50 -Csv <file> [-StopFile <file>]
#
# Each frame is one PrintWindow capture (PW_RENDERFULLCONTENT) of the driver's window. It writes no
# image (frames show Chrome's frame, B2) and prints no title. Per frame it writes one CSV line
#   ms,fg,w,h,colours
# ms = UTC epoch milliseconds; fg = the foreground window's handle (a number); w,h = the window's size;
# colours = the distinct colours of the "uniform rows" among the top -ScanRows rows (a row is uniform
# when its three probes, x = w/2, 3w/4 and w - 60, agree within 24 on every channel), each quantized to
# steps of 8 (#rrggbb), ';'-separated. The T5 bars span the page's width at its top, right of a label
# that ends before x = 300, so a bar that is on screen yields its colour here; recipes/fe-rules.ts
# `classifyRgb` names it (magenta = the FE target, cyan = the human's tab). Judge with
# `npx tsx recipes/fe.ts frames <csv> --for positive|block`.
param(
  [long]$Hwnd = 0,
  [int]$Seconds = 240,
  [int]$IntervalMs = 50,
  [string]$Csv = "$env:TEMP\bridge-e2e\fe\frames.csv",
  [int]$ScanRows = 480,
  [string]$StopFile = ''   # the loop also ends as soon as this file exists
)

Add-Type -AssemblyName System.Drawing
if (-not ('FEWin' -as [type])) {
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class FEWin {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint flags);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
}
'@
}

if (-not $Hwnd) { Write-Output 'fe-win: -Hwnd is required (the driver window from Open-T5Window)'; exit 2 }
if (-not [FEWin]::IsWindow([IntPtr]$Hwnd)) { Write-Output "fe-win: $Hwnd is not a window"; exit 2 }

$dir = Split-Path -Parent $Csv
if ($dir) { New-Item -ItemType Directory -Force $dir | Out-Null }
$w0 = New-Object IO.StreamWriter($Csv, $false, (New-Object Text.UTF8Encoding($false)))
$w0.AutoFlush = $true
$w0.WriteLine('ms,fg,w,h,colours')

function Close-Enough($a, $b) {
  [Math]::Abs($a.R - $b.R) -le 24 -and [Math]::Abs($a.G - $b.G) -le 24 -and [Math]::Abs($a.B - $b.B) -le 24
}

$n = 0
$start = Get-Date
$end = $start.AddSeconds($Seconds)
try {
  while ((Get-Date) -lt $end) {
    if (-not [FEWin]::IsWindow([IntPtr]$Hwnd)) { Write-Output 'fe-win: the window is gone; stopping'; break }
    if ($StopFile -and (Test-Path $StopFile)) { break }
    $ms = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    $fg = [long][FEWin]::GetForegroundWindow()
    $r = New-Object FEWin+RECT; [void][FEWin]::GetWindowRect([IntPtr]$Hwnd, [ref]$r)
    $w = $r.Right - $r.Left; $h = $r.Bottom - $r.Top
    $colours = New-Object 'System.Collections.Generic.HashSet[string]'
    if ($w -gt 120 -and $h -gt 10) {
      $bmp = New-Object System.Drawing.Bitmap $w, $h
      $g = [System.Drawing.Graphics]::FromImage($bmp); $hdc = $g.GetHdc()
      [void][FEWin]::PrintWindow([IntPtr]$Hwnd, $hdc, 2); $g.ReleaseHdc($hdc); $g.Dispose()
      $xs = @([int]($w / 2), [int]($w * 3 / 4), ($w - 60))
      $rows = [Math]::Min($h, $ScanRows)
      for ($y = 0; $y -lt $rows; $y += 3) {
        $c0 = $bmp.GetPixel($xs[0], $y); $c1 = $bmp.GetPixel($xs[1], $y); $c2 = $bmp.GetPixel($xs[2], $y)
        if ((Close-Enough $c0 $c1) -and (Close-Enough $c0 $c2)) {
          [void]$colours.Add(('#{0:x2}{1:x2}{2:x2}' -f ($c0.R -band 0xF8), ($c0.G -band 0xF8), ($c0.B -band 0xF8)))
        }
      }
      $bmp.Dispose()
    }
    $w0.WriteLine(('{0},{1},{2},{3},{4}' -f $ms, $fg, $w, $h, (@($colours) -join ';')))
    $n++
    Start-Sleep -Milliseconds $IntervalMs
  }
} finally {
  $w0.Close()
}
Write-Output ('fe-win: {0} frames in {1:N1} s -> {2}' -f $n, ((Get-Date) - $start).TotalSeconds, $Csv)
