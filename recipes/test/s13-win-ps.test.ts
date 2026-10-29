// Step 13 S5-drivers-B3: recipes/s13-win.ps1 runs in PowerShell with every Win32 wrapper stubbed (the s13-r20-ps.test.ts pattern): no window is listed, moved or touched, and the
// answers it formats are read back by the actor's own parser (recipes/s13-r20-b.ts).
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseRects, winCovered } from "../s13-r20-b.js";
const REPO = (process.env.S13_WIN_REPO ?? resolve(dirname(fileURLToPath(import.meta.url)), "..", "..")).replace(/\\/g, "/");
const hasPs = spawnSync("powershell.exe", ["-NoProfile", "-Command", "1"], { encoding: "utf8" }).error === undefined;
const SCRIPT = `
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$global:Moves = @(); $global:Iconic = @{}; $global:Gone = @{}; $global:NoMove = $false; $global:Raises = @(); $global:MinAfter = @{}
. '${REPO}/recipes/s13-win.ps1'
function Initialize-S13Win { throw 'a test touched Win32' }
function W([long]$h, [string]$c, $l, $t, $r, $b, $counted = $true) { [pscustomobject]@{ H = $h; Class = $c; L = $l; T = $t; R = $r; B = $b; Counted = $counted } }
$global:Work = [pscustomobject]@{ L = 0; T = 0; R = 1920; B = 1040 }
function Get-S13WorkArea([long]$h) { $global:Work }
function Test-S13Window([long]$h) { -not $global:Gone.ContainsKey($h) }
function Test-S13Iconic([long]$h) { $global:Iconic.ContainsKey($h) }
function Raise-S13Window([long]$h) { $global:Raises += "$h"; $true }
$global:Rects = @{ 1 = [pscustomobject]@{ L = 100; T = 100; R = 900; B = 700 }; 2 = [pscustomobject]@{ L = 300; T = 200; R = 1100; B = 800 } }
function Get-S13Rect([long]$h) { $global:Rects[[int]$h] }
function Move-S13Window([long]$h, [int]$x, [int]$y, [int]$w, [int]$hh) {
  $global:Moves += "$h $x $y $w $hh"
  if (-not $global:NoMove) { $global:Rects[[int]$h] = [pscustomobject]@{ L = $x; T = $y; R = $x + $w; B = $y + $hh } }
  if ($global:MinAfter.ContainsKey($h)) { $global:Iconic[$h] = $true }
  $true
}
function T([string]$n, [scriptblock]$b) { Write-Host "BEGIN $n"; $global:Moves = @(); $global:Iconic = @{}; $global:Gone = @{}; $global:NoMove = $false; $global:Raises = @(); $global:MinAfter = @{}; $global:Work = [pscustomobject]@{ L = 0; T = 0; R = 1920; B = 1040 }; $global:Rects = @{ 1 = [pscustomobject]@{ L = 100; T = 100; R = 900; B = 700 }; 2 = [pscustomobject]@{ L = 300; T = 200; R = 1100; B = 800 } }; try { Write-Host "RET $(@(& $b)[-1])" } catch { Write-Host "THREW $_" } }
$List = @(
  (W 9 'Shell_TrayWnd' 0 1040 1920 1080), (W 8 'Chrome_WidgetWin_1' 1700 100 1900 125), (W 7 'Notepad' 0 0 50 50 $false),
  (W 2 'Chrome_WidgetWin_1' 300 200 1100 800), (W 6 'Other' 1000 700 1200 900), (W 1 'Chrome_WidgetWin_1' 100 100 900 700), (W 5 'Other' 0 0 10 10)
)
T rects { Format-S13Rects $List ([ordered]@{ A = 1; B = 2; X = 6 }) $Work }
T notCounted { Format-S13Rects $List ([ordered]@{ A = 1; B = 7; X = 6 }) $Work }
T missing { Format-S13Rects $List ([ordered]@{ A = 1; B = 99; X = 6 }) $Work }
T place { $p = Get-S13Placement $Work; "$($p[0].X),$($p[0].Y),$($p[0].W),$($p[0].H) $($p[1].X),$($p[1].Y),$($p[1].W),$($p[1].H)" }
T placeSmall { $p = Get-S13Placement ([pscustomobject]@{ L = 0; T = 0; R = 900; B = 700 }); "NULL=$($null -eq $p)" }
T placeShort { $p = Get-S13Placement ([pscustomobject]@{ L = 0; T = 0; R = 1920; B = 420 }); "NULL=$($null -eq $p)" }
T placedOverlap { Test-S13Placed ([pscustomobject]@{ L = 0; T = 0; R = 500; B = 500 }) ([pscustomobject]@{ L = 400; T = 0; R = 900; B = 500 }) $Work }
T placedOutside { Test-S13Placed ([pscustomobject]@{ L = 0; T = 0; R = 500; B = 500 }) ([pscustomobject]@{ L = 600; T = 0; R = 2000; B = 500 }) $Work }
T placedApart { Test-S13Placed ([pscustomobject]@{ L = 0; T = 0; R = 500; B = 500 }) ([pscustomobject]@{ L = 500; T = 0; R = 900; B = 500 }) $Work }
T placeOk { $r = Invoke-S13Place 1 2 @(1, 2, 3); "$r MOVES=$($global:Moves.Count)" }
T foreign { $r = Invoke-S13Place 1 2 @(1); "$r MOVES=$($global:Moves.Count)" }
T foreign2 { $r = Invoke-S13Place 1 2 @(2); "$r MOVES=$($global:Moves.Count)" }
T gone { $global:Gone[[long]2] = $true; $r = Invoke-S13Place 1 2 @(1, 2); "$r MOVES=$($global:Moves.Count)" }
T minimized { $global:Iconic[[long]1] = $true; $r = Invoke-S13Place 1 2 @(1, 2); "$r MOVES=$($global:Moves.Count)" }
T noRoom { $global:Work = [pscustomobject]@{ L = 0; T = 0; R = 900; B = 700 }; $r = Invoke-S13Place 1 2 @(1, 2); "$r MOVES=$($global:Moves.Count)" }
T didNotMove { $global:NoMove = $true; $r = Invoke-S13Place 1 2 @(1, 2); "$r MOVES=$($global:Moves.Count)" }
T raised { $r = Invoke-S13Place 1 2 @(1, 2); "$r RAISES=$($global:Raises -join ',')" }
T noRaiseForeign { $r = Invoke-S13Place 1 2 @(1); "$r RAISES=$($global:Raises.Count)" }
T noRaiseRefused { $global:NoMove = $true; $r = Invoke-S13Place 1 2 @(1, 2); "$r RAISES=$($global:Raises.Count)" }
T minAfter { $global:MinAfter[[long]2] = $true; $r = Invoke-S13Place 1 2 @(1, 2); "$r RAISES=$($global:Raises.Count)" }
T answer { function Get-S13WindowList { $List }; Get-S13RectsAnswer ([ordered]@{ A = 1; B = 2; X = 6 }) }
`;
const run = (): Record<string, string[]> => {
	const r = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", SCRIPT], { encoding: "utf8", timeout: 60_000 });
	const o: Record<string, string[]> = {}; let cur = "";
	for (const l of r.stdout.split(/\r?\n/)) { if (l.startsWith("BEGIN ")) { cur = l.slice(6); o[cur] = []; } else if (cur && l) o[cur]!.push(l); }
	return o;
};
describe.skipIf(!hasPs)("recipes/s13-win.ps1 (every Win32 call stubbed)", () => {
	const o = run();
	const ret = (n: string): string => (o[n] ?? []).find((l) => l.startsWith("RET "))?.slice(4) ?? (o[n] ?? []).join("|");
	it("lists, per named window, its rectangle, its z index among the counted windows and the counted windows above it, taskbar and uncounted windows left out", () => {
		expect(ret("rects")).toBe("wa=0,0,1920,1040;A=100,100,800,600,4|1700,100,200,25|300,200,800,600|1000,700,200,200;B=300,200,800,600,2|1700,100,200,25;X=1000,700,200,200,3|1700,100,200,25|300,200,800,600");
	});
	it("a named window that is not counted, or not listed, is an error rather than a guess", () => {
		expect(o.notCounted!.join("|")).toMatch(/THREW window B is not a visible top-level window/);
		expect(o.missing!.join("|")).toMatch(/THREW window B is not a visible top-level window/);
	});
	it("the answer is what the actor's parser reads, and the coverage it computes cuts nothing it should not: WB under WA's neighbours, WA under three windows", () => {
		const r = parseRects(ret("rects"));
		expect([winCovered(r, "A"), winCovered(r, "B"), winCovered(r, "X")]).toEqual([600 * 500, 0, 100 * 100]);
	});
	it("two side-by-side rectangles inside the work area with a 16 px margin; too small a display gives none", () => {
		expect(ret("place")).toBe("16,16,936,1008 968,16,936,1008");
		expect(ret("placeSmall")).toBe("NULL=True");
		expect(ret("placeShort")).toBe("NULL=True");
	});
	it("Test-S13Placed refuses an overlap and a window outside the work area, and accepts two that only touch", () => {
		expect([ret("placedOverlap"), ret("placedOutside"), ret("placedApart")]).toEqual(["False", "False", "True"]);
	});
	it("places the two wave windows and answers ok", () => {
		expect(ret("placeOk")).toBe("ok MOVES=2");
		expect(ret("answer")).toMatch(/^wa=0,0,1920,1040;A=/);
	});
	it("refuses, moving nothing, a window the wave did not open, a missing window, a minimized one and a display with no room", () => {
		expect(ret("foreign")).toBe("refused not-wave-window MOVES=0");
		expect(ret("foreign2")).toBe("refused not-wave-window MOVES=0");
		expect(ret("gone")).toBe("refused gone MOVES=0");
		expect(ret("minimized")).toBe("refused minimized MOVES=0");
		expect(ret("noRoom")).toBe("refused no-room MOVES=0");
	});
	it("after the move it raises WB, then WA, to the top without activating, for the wave's own handles only (F1)", () => {
		expect(ret("raised")).toBe("ok RAISES=2,1");
		expect(ret("noRaiseForeign")).toBe("refused not-wave-window RAISES=0");
		expect(ret("noRaiseRefused")).toBe("refused did-not-fit RAISES=0");
		expect(ret("minAfter")).toBe("refused minimized RAISES=2");
	});
	it("the raise is HWND_TOP with NOMOVE|NOSIZE|NOACTIVATE (0x0013), and only the wrapper calls it", () => {
		const src = readFileSync(resolve(REPO, "recipes", "s13-win.ps1"), "utf8");
		expect(src).toMatch(/Raise\(IntPtr h\) \{ return SetWindowPos\(h, IntPtr\.Zero, 0, 0, 0, 0, 0x0013\)/);
	});
	it("a move that did not take is refused (did-not-fit) after the attempt", () => {
		expect(ret("didNotMove")).toBe("refused did-not-fit MOVES=2");
	});
	it("prints numbers and fixed words only: no title, URL or path text is read by the script", () => {
		const src = readFileSync(resolve(REPO, "recipes", "s13-win.ps1"), "utf8");
		expect(src).not.toMatch(/GetWindowText|MainWindowTitle|\.Title\b/);
	});
});
