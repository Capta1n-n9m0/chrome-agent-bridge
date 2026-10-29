# Step 13 S5-drivers-B3: Win32 window rectangles, z-order and placement for R20-G2-1 (docs/e2e-test-plan.md section 4.28). Dot-sourced by the liveB20 entry script; defines functions only.
# Numbers only: nothing here reads or prints a title, a URL or a path. The Win32 calls sit in a few thin wrappers (Initialize-S13Win, Get-S13WindowList, Get-S13WorkArea, Get-S13Rect,
# Test-S13Iconic, Move-S13Window); everything else is pure and tested with those wrappers stubbed (recipes/test/s13-win-ps.test.ts). The coverage arithmetic is TypeScript's
# (recipes/s13-r20-b.ts coveredPx): this file only lists, per named window, the counted top-level windows above it in z-order.
# Only windows the wave opened are ever moved: Invoke-S13Place takes the wave's own handle list and refuses any other.

function Initialize-S13Win {
  if ('S13Win' -as [type]) { return }
  Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
public static class S13Win {
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc f, IntPtr l);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] static extern bool IsZoomed(IntPtr h);
  [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr h, int cmd);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int w, int hh, uint flags);
  [DllImport("user32.dll")] static extern IntPtr MonitorFromWindow(IntPtr h, uint flags);
  [StructLayout(LayoutKind.Sequential)] public struct MONITORINFO { public int Size; public RECT Monitor, Work; public uint Flags; }
  [DllImport("user32.dll")] static extern bool GetMonitorInfo(IntPtr m, ref MONITORINFO mi);
  [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr h, int attr, out int v, int size);
  public static bool Cloaked(IntPtr h) { int v; return DwmGetWindowAttribute(h, 14, out v, 4) == 0 && v != 0; }
  public static int[] Rect(IntPtr h) { RECT r; if (!GetWindowRect(h, out r)) return new int[0]; return new int[] { r.L, r.T, r.R, r.B }; }
  public static int[] Work(IntPtr h) { MONITORINFO mi = new MONITORINFO(); mi.Size = Marshal.SizeOf(typeof(MONITORINFO)); if (!GetMonitorInfo(MonitorFromWindow(h, 2), ref mi)) return new int[0]; return new int[] { mi.Work.L, mi.Work.T, mi.Work.R, mi.Work.B }; }
  public static bool Move(IntPtr h, int x, int y, int w, int hh) { if (IsZoomed(h)) ShowWindow(h, 9); return SetWindowPos(h, IntPtr.Zero, x, y, w, hh, 0x0014); }
  // HWND_TOP without moving, sizing or activating (SWP_NOSIZE | SWP_NOMOVE | SWP_NOACTIVATE = 0x0013).
  public static bool Raise(IntPtr h) { return SetWindowPos(h, IntPtr.Zero, 0, 0, 0, 0, 0x0013); }
  // Top-level windows in z-order, top first: handle, class, left, top, right, bottom, counted (visible, not minimized, not cloaked, not empty).
  public static string[] List() {
    var l = new List<string>();
    EnumProc f = (IntPtr h, IntPtr p) => {
      var sb = new StringBuilder(256); GetClassName(h, sb, 256);
      int[] r = Rect(h); if (r.Length != 4) return true;
      bool counted = IsWindowVisible(h) && !IsIconic(h) && !Cloaked(h) && r[2] > r[0] && r[3] > r[1];
      l.Add(h.ToInt64() + "|" + sb.ToString() + "|" + r[0] + "|" + r[1] + "|" + r[2] + "|" + r[3] + "|" + (counted ? 1 : 0));
      return true;
    };
    EnumWindows(f, IntPtr.Zero); GC.KeepAlive(f);
    return l.ToArray();
  }
}
'@
}

# ---- thin Win32 wrappers (stubbed in the tests) ---------------------------------------------------------------------------------------------------
function Get-S13WindowList {
  Initialize-S13Win
  foreach ($line in [S13Win]::List()) {
    $p = $line.Split('|')
    [pscustomobject]@{ H = [long]$p[0]; Class = $p[1]; L = [int]$p[2]; T = [int]$p[3]; R = [int]$p[4]; B = [int]$p[5]; Counted = ($p[6] -eq '1') }
  }
}
function Get-S13WorkArea([long]$Hwnd) {
  Initialize-S13Win
  $w = [S13Win]::Work([IntPtr]$Hwnd)
  if ($w.Count -ne 4) { throw 'the work area of the window could not be read' }
  [pscustomobject]@{ L = $w[0]; T = $w[1]; R = $w[2]; B = $w[3] }
}
function Get-S13Rect([long]$Hwnd) {
  Initialize-S13Win
  $r = [S13Win]::Rect([IntPtr]$Hwnd)
  if ($r.Count -ne 4) { return $null }
  [pscustomobject]@{ L = $r[0]; T = $r[1]; R = $r[2]; B = $r[3] }
}
function Test-S13Window([long]$Hwnd) { Initialize-S13Win; [S13Win]::IsWindow([IntPtr]$Hwnd) }
function Test-S13Iconic([long]$Hwnd) { Initialize-S13Win; [S13Win]::IsIconic([IntPtr]$Hwnd) }
function Raise-S13Window([long]$Hwnd) { Initialize-S13Win; [S13Win]::Raise([IntPtr]$Hwnd) }
function Move-S13Window([long]$Hwnd, [int]$X, [int]$Y, [int]$W, [int]$H) { Initialize-S13Win; [S13Win]::Move([IntPtr]$Hwnd, $X, $Y, $W, $H) }

# ---- pure functions --------------------------------------------------------------------------------------------------------------------------------
function Test-S13Tray($Win) { $Win.Class -eq 'Shell_TrayWnd' -or $Win.Class -eq 'Shell_SecondaryTrayWnd' }
function Format-S13Box($L, $T, $R, $B) { "$L,$T,$($R - $L),$($B - $T)" }
# One answer for the actor's parseRects: `wa=x,y,w,h;A=x,y,w,h,z|ax,ay,aw,ah|…;B=…;X=…`. z is the index among the counted top-level windows, top = 0; the windows listed after `|`
# are the counted ones above the named window, taskbars left out. A named window that is not counted (minimized, hidden, gone) is an error, never a guess.
function Format-S13Rects($List, $Named, $Work) {
  $counted = @($List | Where-Object { $_.Counted })
  $parts = @("wa=$(Format-S13Box $Work.L $Work.T $Work.R $Work.B)")
  foreach ($k in $Named.Keys) {
    $h = [long]$Named[$k]; $idx = -1
    for ($i = 0; $i -lt $counted.Count; $i++) { if ($counted[$i].H -eq $h) { $idx = $i; break } }
    if ($idx -lt 0) { throw "window $k is not a visible top-level window" }
    $me = $counted[$idx]; $s = "$k=$(Format-S13Box $me.L $me.T $me.R $me.B),$idx"
    for ($i = 0; $i -lt $idx; $i++) { if (-not (Test-S13Tray $counted[$i])) { $s += '|' + (Format-S13Box $counted[$i].L $counted[$i].T $counted[$i].R $counted[$i].B) } }
    $parts += $s
  }
  $parts -join ';'
}
# Two non-overlapping rectangles side by side inside the work area, $Gap px from its edges and from each other (Chrome's frame overhangs its rectangle by a few px). $null when the
# work area is too small for two windows of $MinW x $MinH.
function Get-S13Placement($Work, [int]$Gap = 16, [int]$MinW = 500, [int]$MinH = 400) {
  $w = [int][math]::Floor((($Work.R - $Work.L) - 3 * $Gap) / 2); $h = ($Work.B - $Work.T) - 2 * $Gap
  if ($w -lt $MinW -or $h -lt $MinH) { return $null }
  $y = $Work.T + $Gap; $x1 = $Work.L + $Gap; $x2 = $x1 + $w + $Gap
  @([pscustomobject]@{ X = $x1; Y = $y; W = $w; H = $h }, [pscustomobject]@{ X = $x2; Y = $y; W = $w; H = $h })
}
# Read back after a move: both rectangles lie inside the work area and do not overlap.
function Test-S13Placed($RA, $RB, $Work) {
  foreach ($r in @($RA, $RB)) { if ($null -eq $r -or $r.L -lt $Work.L -or $r.T -lt $Work.T -or $r.R -gt $Work.R -or $r.B -gt $Work.B) { return $false } }
  -not ([math]::Min($RA.R, $RB.R) -gt [math]::Max($RA.L, $RB.L) -and [math]::Min($RA.B, $RB.B) -gt [math]::Max($RA.T, $RB.T))
}

# ---- the steps' answers ----------------------------------------------------------------------------------------------------------------------------
# $Named: [ordered]@{ A = <hwnd>; B = <hwnd>; X = <hwnd> }, the wave's own windows (X may be the same window as A or B).
function Get-S13RectsAnswer($Named) {
  Format-S13Rects @(Get-S13WindowList) $Named (Get-S13WorkArea ([long]$Named['A']))
}
# Moves WA and WB side by side inside the work area of WA's display. Answers `ok` or `refused <word>`; a window that is not in $Owned (the handles the wave opened) is never moved.
function Invoke-S13Place([long]$A, [long]$B, [long[]]$Owned) {
  if ($Owned -notcontains $A -or $Owned -notcontains $B) { return 'refused not-wave-window' }
  if (-not (Test-S13Window $A) -or -not (Test-S13Window $B)) { return 'refused gone' }
  if ((Test-S13Iconic $A) -or (Test-S13Iconic $B)) { return 'refused minimized' }
  $work = Get-S13WorkArea $A
  $pl = Get-S13Placement $work
  if ($null -eq $pl) { return 'refused no-room' }
  [void](Move-S13Window $A $pl[0].X $pl[0].Y $pl[0].W $pl[0].H)
  [void](Move-S13Window $B $pl[1].X $pl[1].Y $pl[1].W $pl[1].H)
  if (-not (Test-S13Placed (Get-S13Rect $A) (Get-S13Rect $B) $work)) { return 'refused did-not-fit' }
  # Nothing else lifts WB above the windows that were over it, and the uncovered leg needs covered-by-others-px=0: raise WB, then WA (the wave's own handles, checked above), no activation.
  [void](Raise-S13Window $B)
  [void](Raise-S13Window $A)
  if ((Test-S13Iconic $A) -or (Test-S13Iconic $B)) { return 'refused minimized' }
  'ok'
}
