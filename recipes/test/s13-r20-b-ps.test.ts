// Step 13 S5-drivers-B4b: recipes/s13-r20-b.ps1 (the liveB20 entry script) and recipes/s13-r20-b-defs.ps1 run in PowerShell with every helper stubbed (the s13-r20-ps.test.ts pattern):
// nothing touches Chrome, a daemon or a port.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { checkStopReturn20, STOP_REASONS_20 } from "../s13-r20.js";
const REPO = (process.env.S13_R20_REPO ?? resolve(dirname(fileURLToPath(import.meta.url)), "..", "..")).replace(/\\/g, "/");
const hasPs = spawnSync("powershell.exe", ["-NoProfile", "-Command", "1"], { encoding: "utf8" }).error === undefined;
const read = (f: string): string => readFileSync(join(REPO, "recipes", f), "utf8");
// Every STOP reason slice B can name (outside-file-reached-page is listed by the sheet, but no slice-B reader raises it: the actor sends only files under ROOT): the actors' STOPWHYs, the swap, the restore, the logs, the dialog closer and R20-0B's three.
const SLICE_B_STOPS = ["build-not-loaded", "extension-disabled", "reload-failed", "popup-lease-wrong", "existing-tool-changed", "chooser-interception-left-on", "dialog-left-open", "throw-after-state", "old-build-left-loaded", "not-restored", "text-leak", "devtools-left-open", "outside-file-reached-page"];
const PRE = (dir: string): string => `
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$global:S16Stops = 0; $global:S16Fail = 0; $global:S16NM = 0; $global:S16Changed = $false; $global:S16InRestore = $false; $global:S16Toggle = 'on'; $global:S16Pids = @{}
$env:S11_OUT = '${dir}'; $GlobalsFile = '${dir}\\g.clixml'; $DaemonLog = '${dir}\\daemon.log'; $global:S16Mark = 0; $global:D = 8; $global:W = 7; $global:O = 5
$Repo = '${dir}'; $Steps = 'steps'; $Att = 1; New-Item -ItemType Directory -Force '${dir}\\steps' | Out-Null
$Framing = '${dir}\\framing.txt'; $Record = '${dir}\\record.txt'; $UpOptReport = '${dir}\\u.md'; $FoundJson = '${dir}\\found.json'; $NowJson = '${dir}\\now.json'
function Say9([string]$m) { Write-Host $m }; function Stop9([string]$m) { $global:S16Stops++; Write-Host "STOP: $m" }
function Show-S16([string[]]$l) { foreach ($t in $l) { if ($t -match '^STOP:') { $global:S16Stops++ }; Write-Host $t } }
function Fail-S16([string]$m) { Stop9 $m; throw 'stop' }; function Save-S16 { }; function Load-S16 { }
function Use-S16Options { 5 }; function Restore-S11Safety($o, $b, $row) { Write-Host "RESTORE-CALLED $row"; $true }; function Set-S9Foreground($h) { $true }
function Close-S16Windows { }; function End-S16Actor { }; function Stop-S16All { }
function Get-S11bStopCause($e) { 'cause' }; function Test-S9Live($h) { $true }; function Save-S11bConsole($h, $f) { Set-Content -LiteralPath $f 'a'; $f }
function Close-S9Window($h) { }; function Set-S12AttachStamp { }
function Invoke-R17Node([string]$Which, [string[]]$NodeArgs, [scriptblock]$Driver = $null, [int]$BudgetS = 300, [switch]$StopOnFail) {
  $k = "$Which $($NodeArgs[0])"; $global:R17Out = @($global:NodeOut[$k]); if ($global:NodeOut[$k]) { Show-S16 $global:R17Out }; 0
}
function git { if ($args[0] -eq 'rev-parse') { 'aaaaaaaaaaaabbbbbbbb' } elseif ($args[0] -eq 'status') { } }
function Format-S9Title([string]$t) { "PRIOR:$t" }
$R17Blocks = @{ reload = { Write-Host 'RELOAD' }; console = { Write-Host 'CONSOLE' } }; $R17bZero = { }
. '${REPO}/recipes/s13-r20.ps1'
. '${REPO}/recipes/s13-win.ps1'
. '${REPO}/recipes/s13-r20-b4.ps1'
. '${REPO}/recipes/s13-r20-b-defs.ps1'
function T([string]$n, [scriptblock]$b) {
  Write-Host "BEGIN $n"; $global:S16Changed = $false; $global:S16InRestore = $false; $global:S16Stops = 0; $global:NodeOut = @{}; $global:R20Port = 8081
  $global:R19Slice = 'liveB20'; $global:R19Reason = ''; $global:R19Pending = [ordered]@{}; $global:R19StopSeq = 0; $global:R19Segs = @(); $global:R19SegNext = 1; $global:R19SegLost = $false
  try { & $b } catch { Write-Host "THREW $_" }
}
function RegAll { $global:R19Blocks = @{}; Register-R20Blocks; $global:R19Blocks['root-add'] = { Write-Host 'ROOT-ADD' }; Register-R20B4Blocks; Register-R20BBlocks }
`;
const BODY = `
T reg { RegAll; Write-Host "MISSING $(@(Get-R20MissingBlocks 'liveB20').Count)"; [void]$global:R19Blocks.Remove('closerprobe'); Write-Host "MISS2 $(@(Get-R20MissingBlocks 'liveB20') -join ',')" }
T zero0b {
  function Read-R20Worker { [pscustomobject]@{ Perm = 'yes'; Listener = 'yes'; Enabled = 'yes'; Disk = 'unread' } }; function Test-R20S4Ancestor { $true }
  $global:NodeOut['s13-r20 proof'] = 'LOADED20 keys=page nested=page elem=page perm=yes listener=yes enabled=yes args=answered'
  Invoke-R20Zero { Show-S16 @('MANIFEST m BUILD b') } 'R20-0B'; $global:S16Changed = $false; Invoke-R20Zero { }
}
T order { Write-Host "ORDER $((Get-R19Order 'liveB20') -join ',')" }
T guard { Write-Host "G1 $(Format-S9Title 'S13 chooser fixture') | $(Format-S9Title 'S13 chooser fixture - Google Chrome') | $(Format-S9Title 'other')" }
T blocks {
  RegAll
  function Invoke-R20Zero($z, $row) { Write-Host "ZERO $row" }; function Invoke-R20Ch($id, $cmd, $h) { Write-Host "CH $id $($cmd -join ' ') $($h.Keys -join ',')" }
  function Test-S11Own($h) { $false }; function Invoke-R19Closer { Write-Host 'CLOSER' }
  $r20ev = & $R20Pop3Evidence; Set-Content -LiteralPath $r20ev 'old counts'
  foreach ($n in 'r20-0b', 'closerprobe', 'r20-choose-twice', 'r20-choose-kept', 'r20-choose-refuse-dis', 'r20-g2-1') { & $global:R19Blocks[$n] }
  Write-Host "ZERO-ROTATED $(-not (Test-Path -LiteralPath $r20ev)) PREV=$(@(Get-ChildItem -LiteralPath $env:S11_OUT -Filter 'r20-pop3-evidence.txt.prev-*').Count)"; Get-ChildItem -LiteralPath $env:S11_OUT -Filter 'r20-pop3-evidence.txt.prev-*' | Remove-Item -Force
  Write-Host "ROOT-FLAG-BEFORE $($global:R20BRoot)"; & $global:R19Blocks['root-add']; Write-Host "ROOT-FLAG-AFTER $($global:R20BRoot)"
}
T ch {
  function Set-S11Front($h, $w) { Write-Host "FRONT $h $w" }; function Close-R19Dialogs { Write-Host 'CLOSE-DLG' }; function Close-R20Xk { Write-Host 'CLOSE-XK' }
  function Invoke-R19Row($id, $cmd, $StepList, $Actor, $BudgetS) { Write-Host "ROWRUN $id $($cmd -join ' ') $($StepList[0].k) $($StepList[0].h.Keys -join ',') $Actor $BudgetS"; if ($global:Boom) { throw 'boom' } }
  Invoke-R20Ch 'R20-CHOOSE-KEPT' @('choose-kept') (New-R20Dlg @('a-dlg', 'b-dlg'))
  $global:Boom = $true; try { Invoke-R20Ch 'R20-X' @('x') (New-R20Dlg @('c-dlg')) } catch { Write-Host "CAUGHT $_" }
}
T serve {
  function Get-S11Signal([string]$n, [string]$k) { Join-Path $env:S11_OUT "$n.$k" }
  function Wait-S11Ready([string]$n) { Remove-Item -LiteralPath (Get-S11Signal $n 'ready'); $true }
  function Write-S11Pressed([string]$n, [string]$c) { Write-Host "PRESSED $n=$c" }
  $global:Alive = 4; function Test-R20NodeAlive { $global:Alive--; $global:Alive -gt 0 }
  foreach ($n in 'c', 'a') { Set-Content -LiteralPath (Get-S11Signal $n 'ready') 'x' }
  Invoke-R19StepB @{ k = 'serve'; h = [ordered]@{ a = { 'A1' }; b = { 'B1' }; c = { 'C1' } } }   # the runner's own dispatch
  Write-Host "LEFT $(@(Get-ChildItem -LiteralPath $env:S11_OUT -Filter '*.ready').Count)"
}
T node { $global:S16Pids = @{ node = $PID }; Write-Host "ALIVE $(Test-R20NodeAlive)"; $global:S16Pids = @{ node = 2147483000 }; Write-Host "DEAD $(Test-R20NodeAlive)"; $global:S16Pids = @{}; Write-Host "NONE $(Test-R20NodeAlive)" }
T nodeBorn {
  $global:S16Pids = @{ node = $PID }; $global:S16Born = @{ node = (Get-Process -Id $PID).StartTime.Ticks }; Write-Host "BORN-SAME $(Test-R20NodeAlive)"
  $global:S16Born = @{ node = 1 }; Write-Host "BORN-REUSED $(Test-R20NodeAlive)"; $global:S16Born = @{}
}
T serveBound {
  function Get-S11Signal([string]$n, [string]$k) { Join-Path $env:S11_OUT "$n.$k" }
  function Wait-S11Ready([string]$n) { $true }; function Write-S11Pressed([string]$n, [string]$c) { }
  $r20q = Start-Process -FilePath powershell.exe -ArgumentList '-NoProfile', '-Command', 'Start-Sleep -Seconds 60' -PassThru -WindowStyle Hidden
  try {
    $global:S16Pids = @{ node = $r20q.Id }; $global:S16Born = @{ node = $r20q.StartTime.Ticks }
    $r20t = Get-Date; try { Invoke-R20Serve ([ordered]@{ a = { 'A' } }) 600 1; Write-Host 'IDLE-RETURNED' } catch { Write-Host "IDLE-THREW $_" }
    Write-Host "IDLE-FAST $((((Get-Date) - $r20t).TotalSeconds) -lt 30)"
    $r20t = Get-Date; try { Invoke-R20Serve ([ordered]@{ a = { 'A' } }) 1 600; Write-Host 'BUDGET-RETURNED' } catch { Write-Host "BUDGET-THREW $_" }
    Write-Host "BUDGET-FAST $((((Get-Date) - $r20t).TotalSeconds) -lt 30)"
    $global:S16Born = @{ node = 1 }; Invoke-R20Serve ([ordered]@{ a = { 'A' } }) 600 600; Write-Host 'REUSED-RETURNED'
  } finally { Stop-Process -Id $r20q.Id -Force -ErrorAction SilentlyContinue; $global:S16Pids = @{}; $global:S16Born = @{} }
}
function G2Stubs {
  $global:W = 7; $global:S11Own = @{ '7' = $true; '9' = $true }; $global:D = 3; $global:E = 0; $global:R19Xk = 0
  function Get-S9DocUrl([long]$h) { if ($h -eq 7 -and -not $global:NoB) { 'http://localhost:8081/e2e-playground.html?s12=g2b' } else { 'x' } }
  function New-S16Window([string]$u) { Write-Host "OPENED $($u -replace '^http://localhost:8081/', '')"; 11 }
  function Close-S11Window($h) { Write-Host "CLOSED $h" }; function Test-S11Own($h) { $true }; function Get-S12Foreground { $global:Fg }
}
T g2open {
  . G2Stubs; $global:Fg = 11; $global:NoB = $false
  $r = Invoke-R20G2Open; Write-Host "ANS $r A=$($global:S13Hwnd['A']) B=$($global:S13Hwnd['B']) X=$($global:S13Hwnd['X']) KEYS=$($global:S13Hwnd.Keys -join ',') OWNED=$(($global:S13Owned | Sort-Object) -join ',') TYPE=$($global:S13Owned.GetType().Name)"
  $global:Fg = 999; $r = Invoke-R20G2Open; Write-Host "ANS2 $r X=$($global:S13Hwnd['X'])"
  $global:NoB = $true; $r = Invoke-R20G2Open; Write-Host "ANS3 $r B=$($global:S13Hwnd['B'])"
}
T g2handlers {
  function Invoke-S13Place($a, $b, $o) { "PLACE $a $b $($o -join ',')" }; function Get-S13RectsAnswer($n) { "RECTS $($n.Keys -join '')" }
  $global:S13Hwnd = [ordered]@{ A = 11; B = 7; X = 11 }; $global:S13Owned = [long[]]@(3, 7, 11)
  $h = New-R20G2Handlers
  Write-Host "IDS $($h.Keys -join ',')"; Write-Host "PL $(& $h['R20-G2-1-place'])"; Write-Host "RC $(& $h['R20-G2-1-rects-covered-after'])"
}
T g2block {
  RegAll; $global:O = 5; $global:S13Hwnd = 1
  function Test-S11Own($h) { $true }; function Close-S11Window($h) { Write-Host "CLOSED-O $h" }; function Invoke-R20Ch($id, $cmd, $h) { Write-Host "CH $id $($h.Keys.Count) O=$($global:O)" }
  & $global:R19Blocks['r20-g2-1']; Write-Host "HWND-AFTER $($null -eq $global:S13Hwnd)"
}
T rootThrows {
  $global:R19Blocks = @{}; Register-R20Blocks; $global:R19Blocks['root-add'] = { throw 'root-add failed' }; Register-R20B4Blocks; Register-R20BBlocks
  try { & $global:R19Blocks['root-add'] } catch { Write-Host "ROOT-THREW $_" }; Write-Host "ROOT-FLAG-THROWN $($global:R20BRoot)"
}
T versionNoRoot { RegAll; $global:R20BRoot = $false; & $global:R19Blocks['r20-version'] }
T versionSwap {
  RegAll; $global:R20BRoot = $true
  function Invoke-R19Swapped($c, $rows, $id) { Write-Host "SWAP $c $id"; & $rows }; function Invoke-R20Ch($id, $cmd, $h) { Write-Host "CH $id $($cmd -join ' ') $($h.Keys -join ',')" }
  function Test-R20OldLoaded { $global:OldOk }
  $global:OldOk = $true; & $global:R19Blocks['r20-version']; $global:OldOk = $false; & $global:R19Blocks['r20-version']
}
T oldLoaded {
  function Read-R20Worker { [pscustomobject]@{ Perm = 'unread'; Listener = 'unread'; Enabled = 'unread'; Disk = 'unread' } }
  foreach ($l in 'LOADED20 keys=sorted nested=sorted elem=sorted perm=no listener=no enabled=yes args=answered', 'LOADED20 keys=page nested=page elem=page perm=yes listener=yes enabled=yes args=answered', 'none') {
    $global:NodeOut['s13-r20 proof'] = $l; Write-Host "OLD $(Test-R20OldLoaded)"
  }
}
T restoreLabel {   # #416: the real Invoke-R20Restore with a label prints DIALOGS B (letter), Run 19's count; no label keeps the slice id (slice A's recorded form)
  function Get-R19DlgWindows { @() }; function Get-S12DialogCount($h) { 0 }; function Get-R19DevToolsCount { $global:Dev }; function Invoke-R20RestoreCheck { }; function Test-S11Own($h) { $false }; $R17Blocks['rd-restore'] = { }
  function Invoke-R17Node([string]$Which, [string[]]$NodeArgs, [scriptblock]$Driver = $null, [int]$BudgetS = 300, [switch]$StopOnFail) { Write-Host "NODE $Which $($NodeArgs -join ' ')"; 0 }
  $global:R19Xk = 0; $global:O = 0; $global:Dev = 0; Invoke-R20Restore 'B'; Invoke-R20Restore
  $global:Dev = 2; try { Invoke-R20Restore 'B' } catch { Write-Host "THREWL $_" }; Write-Host "REASONL [$global:R19Reason]"
}
T restore { function Close-R20Xk { Write-Host 'CLOSE-XK' }; function Invoke-R20Restore($Label) { Write-Host "RESTORE hwnd-null=$($null -eq $global:S13Hwnd) label=$Label" }; $global:S13Hwnd = 1; Invoke-R20BRestore }
T evidence {
  $p = & $R20Pop3Evidence
  Reset-R20Pop3Evidence; Set-Content -LiteralPath $p 'R-3 bg before lines=1 eval=0'
  Reset-R20Pop3Evidence; Write-Host "ROTATED $(Test-Path -LiteralPath $p) PREV=$(@(Get-ChildItem -LiteralPath $env:S11_OUT -Filter 'r20-pop3-evidence.txt.prev-*').Count)"
  $dst = Get-R20EvidenceCopy; Write-Host "NAME $(Split-Path -Leaf $dst)"; $Att = 2; Write-Host "NAME2 $(Split-Path -Leaf (Get-R20EvidenceCopy))"; $Att = 1
  function Invoke-R20Logs { Write-Host 'LOGS' }; Invoke-R20BLogs; Write-Host "NOCOPY $(Test-Path -LiteralPath $dst)"
  Set-Content -LiteralPath $p 'R-3 bg after lines=2 eval=1 join=0 url=0'
  function Invoke-R20Logs { throw 'leak' }; try { Invoke-R20BLogs } catch { Write-Host "RETHROWN $_" }
  Write-Host "COPIED $((Get-Content -LiteralPath $dst) -join '|')"
}
foreach ($rs in @(${SLICE_B_STOPS.map((r) => `'${r}'`).join(", ")})) {
  $r = $rs; T "stop-$r" { $R19Order['liveB20'] = @('x'); $global:R19Blocks = @{ x = { Stop-R19 $r 'why' }.GetNewClosure() }; Invoke-R19Slice 'liveB20' }.GetNewClosure()
}
`;
function run(): Record<string, string[]> {
	const d = mkdtempSync(join(tmpdir(), "s13-b4b-"));
	try {
		const f = join(d, "t.ps1");
		writeFileSync(f, PRE(d.replace(/\\/g, "\\")) + BODY, "utf8");
		const out = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", f], { encoding: "utf8", timeout: 180_000 }).stdout ?? "";
		const o: Record<string, string[]> = {};
		let cur = "";
		for (const l of out.split(/\r?\n/)) { const m = /^BEGIN (\S+)$/.exec(l); if (m) { cur = m[1]!; o[cur] = []; } else if (cur) o[cur]!.push(l); }
		return o;
	} finally { rmSync(d, { recursive: true, force: true }); }
}
describe("the liveB20 entry script's text", () => {
	const e = read("s13-r20-b.ps1");
	it("loads Run 17's functions before it registers, dot-sources the s13 files at its top level, and registers in the order the overrides need", () => {
		const at = (s: string): number => e.indexOf(s);
		expect(at("Get-R18Defs (Join-Path $PSScriptRoot 's11b-r17.ps1')")).toBeGreaterThan(-1);
		expect(at("Get-R18Defs (Join-Path $PSScriptRoot 's11b-r17.ps1')")).toBeLessThan(at("\nRegister-R20Blocks"));
		for (const f of ["s13-r20.ps1", "s13-win.ps1", "s13-r20-b4.ps1", "s13-r20-b-defs.ps1"]) expect(e).toMatch(new RegExp(`^\\. "\\$PSScriptRoot\\\\${f.replace(/\./g, "\\.")}"`, "m"));
		expect(at("\nRegister-R20Blocks")).toBeLessThan(at("\nRegister-R20B4Blocks"));
		expect(at("\nRegister-R20B4Blocks")).toBeLessThan(at("\nRegister-R20BBlocks"));
		expect(at("-Block plan") < 0 ? at("'plan'") : at("-eq 'plan'")).toBeLessThan(at("Get-R18Defs (Join-Path"));   // plan exits before anything is read or run
		expect(e).toContain("ValidateSet('liveB20', 'plan', 'teardown')");
		expect(e).toContain("Get-R20MissingBlocks 'liveB20'");
	});
	it("-Block teardown copies the -3 evidence after the blocks are registered and before the main run", () => {
		const m = /if \(\$Block -eq 'teardown'\) \{ Copy-R20Pop3Evidence \}/.exec(e);
		expect(m).not.toBeNull();
		expect(m!.index).toBeGreaterThan(e.indexOf("\nRegister-R20BBlocks"));
		expect(m!.index).toBeLessThan(e.indexOf("Invoke-R19Main $Block"));
	});
	it("the s13 PowerShell files are ASCII only", () => { for (const f of ["s13-r20-b.ps1", "s13-r20-b-defs.ps1"]) expect(read(f)).toMatch(/^[\x20-\x7e\r\n\t]*$/); });
	it("the window guard names the title of the chooser fixture the page really has", () => {
		const title = /<title>([^<]+)<\/title>/.exec(readFileSync(join(REPO, "test-fixtures", "s13-chooser.html"), "utf8"))![1]!;
		expect(read("s13-r20-b-defs.ps1")).toContain(`'^${title}( - Google Chrome)?$'`);
	});
});
describe("every STOP reason slice B can reach is known to the pairing check", () => {
	it("is in STOP_REASONS_20", () => { for (const r of SLICE_B_STOPS) expect(STOP_REASONS_20).toContain(r); });
});
describe.skipIf(!hasPs)("s13-r20-b-defs.ps1 under PowerShell with stubbed helpers", () => {
	const o = run();
	it("registers a block for every name of liveB20's order, and names the one that is missing", () => {
		expect(o.reg).toContain("MISSING 0");
		expect(o.reg).toContain("MISS2 closerprobe");
	});
	it("runs R20-0B, the three -3 rows, root-add, CLOSERPROBE, the chooser rows, G2, VERSION, RESTORE, LOGS in that order", () => {
		expect(o.order![0]).toBe("ORDER preflight,servers,files,window,reload,console,r20-0b,r20-pop-bg-3,r20-pop-fg-3,r20-pop-other-3,root-add,closerprobe,r20-choose-twice,r20-choose-kept,r20-choose-refuse-dis,r20-g2-1,r20-version,r20-restore,r20-logs");
	});
	it("R20-0B is R20-0's proof and form under its own row id, ending slice=B", () => {
		const z = o.zero0b!;
		expect(z.filter((l) => l.startsWith("ROW "))).toEqual(["ROW R20-0B PASS slice=B", "ROW R20-0 PASS slice=B"]);
		expect(z[z.indexOf("MANIFEST m BUILD b") + 1]).toMatch(/^LOADED20 keys=page /);
	});
	it("the window guard accepts the chooser fixture's title and leaves every other title to the prior guard", () => expect(o.guard![0]).toBe("G1 S13 chooser fixture | S13 chooser fixture - Google Chrome | PRIOR:other"));
	it("each block calls its row with its command and the dialog-count steps the actor asks for", () => {
		const b = o.blocks!;
		expect(b).toContain("ZERO R20-0B");
		expect(b).toContain("CLOSER");
		expect(b).toContain("CH R20-CHOOSE-TWICE choose-twice R20-CHOOSE-TWICE-dlg");
		expect(b).toContain("CH R20-CHOOSE-KEPT choose-kept R20-CHOOSE-KEPT-different-dlg,R20-CHOOSE-KEPT-same-dlg");
		expect(b).toContain("CH R20-CHOOSE-REFUSE-DIS choose-refuse-dis R20-CHOOSE-REFUSE-DIS-btn-dlg,R20-CHOOSE-REFUSE-DIS-flip-dlg,R20-CHOOSE-REFUSE-DIS-self-dlg");
		expect(b).toContain("ROOT-FLAG-BEFORE False");
		expect(b).toContain("ROOT-FLAG-AFTER True");
		expect(b).toContain("ZERO-ROTATED True PREV=1");   // r20-0b rotates an existing -3 evidence file (B4a MINOR-3's call site)
	});
	it("the root flag stays False when the wrapped root-add block throws", () => {
		expect(o.rootThrows).toContain("ROOT-THREW root-add failed");
		expect(o.rootThrows).toContain("ROOT-FLAG-THROWN False");
	});
	it("a slice-B row is one serve step on the slice-B actor with W in front, and the closer and WA's close run even when the row throws", () => {
		const c = o.ch!;
		expect(c.slice(0, 4)).toEqual(["FRONT 7 R20-CHOOSE-KEPT", "ROWRUN R20-CHOOSE-KEPT choose-kept serve a-dlg,b-dlg s13-r20-b 600", "CLOSE-DLG", "CLOSE-XK"]);
		expect(c.slice(4)).toEqual(["FRONT 7 R20-X", "ROWRUN R20-X x serve c-dlg s13-r20-b 600", "CLOSE-DLG", "CLOSE-XK", "CAUGHT boom"]);
	});
	it("serve answers only the steps the actor asked for, in the handlers' order, and ends when the actor's process is gone", () => {
		expect(o.serve).toEqual(["PRESSED a=A1", "PRESSED c=C1", "LEFT 0"]);
		expect(o.node).toEqual(["ALIVE True", "DEAD False", "NONE False"]);
		expect(o.nodeBorn).toEqual(["BORN-SAME True", "BORN-REUSED False"]);   // a reused PID (start time differs from S16Born) counts as gone
	});
	it("serve throws at its idle bound and at the row's budget while a live process stays silent, and returns for a reused PID", () => {
		expect(o.serveBound).toEqual(["IDLE-THREW no ready signal for serve within the bound (1 s)", "IDLE-FAST True", "BUDGET-THREW serve exceeded its budget of 1 s", "BUDGET-FAST True", "REUSED-RETURNED"]);
	});
	it("R20-G2-1's open step finds WB by B's marker before WA exists, records the wave's own handles as [long[]], and says wb-unknown rather than guess", () => {
		const g = o.g2open!;
		expect(g[0]).toBe("OPENED e2e-playground.html?s12=g2a&s12x=g2a");
		expect(g[1]).toBe("ANS ok A=11 B=7 X=11 KEYS=A,B,X OWNED=3,7,9,11 TYPE=Int64[]");
		expect(g).toContain("ANS2 ok X=11");   // a foreground window that is not the wave's: X falls back to WA
		expect(g).toContain("ANS3 wb-unknown B=0");
	});
	it("the G2 handlers are the six ids the actor asks for; place gets WA, WB and the owned list; rects get the named windows", () => {
		expect(o.g2handlers).toEqual(["IDS R20-G2-1-open,R20-G2-1-place,R20-G2-1-rects-covered,R20-G2-1-rects-covered-after,R20-G2-1-rects-uncovered,R20-G2-1-rects-uncovered-after", "PL PLACE 11 7 3,7,11", "RC RECTS ABX"]);
	});
	it("R20-G2-1 closes the wave's options window first and forgets the handles after", () => {
		expect(o.g2block).toEqual(["CLOSED-O 5", "CH R20-G2-1 6 O=0", "HWND-AFTER True"]);
	});
	it("R20-VERSION swaps to 63c771c, runs the actor only when the proof read the old build, and is NOT RUN without ROOT or without an old build", () => {
		expect(o.versionNoRoot!.filter((l) => l.startsWith("ROW "))).toEqual(["ROW R20-VERSION NOT RUN — ROOT is not in the Upload folders"]);
		expect(o.versionSwap).toEqual(["SWAP 63c771c R20-VERSION", "CH R20-VERSION version R20-VERSION-dlg", "SWAP 63c771c R20-VERSION", "ROW R20-VERSION NOT RUN — old build not loadable (the proof reads neither keys=sorted nor perm=no)"]);
		expect(o.oldLoaded!.filter((l) => l.startsWith("OLD "))).toEqual(["OLD True", "OLD False", "OLD False"]);
	});
	it("the restore closes WA before the shared restore; the -3 evidence is rotated at the start and copied at LOGS even when LOGS throws", () => {
		expect(o.restore).toEqual(["CLOSE-XK", "RESTORE hwnd-null=True label=B"]);
		const rl = o.restoreLabel!.filter((l) => l.startsWith("NODE "));
		expect(rl).toEqual(["NODE s12-r19-c dialogs --slice B --native 0 --devtools 0 --windows 0", "NODE s12-r19-c dialogs --slice liveB20 --native 0 --devtools 0 --windows 0", "NODE s12-r19-c dialogs --slice B --native 0 --devtools 2 --windows 0"]);
		expect(o.restoreLabel).toContain("REASONL [devtools-left-open]");
		const e = o.evidence!;
		expect(e).toContain("ROTATED False PREV=1");
		expect(e).toContain("NAME S13-live-evidence-liveB20-pop3.txt");
		expect(e).toContain("NAME2 S13-live-evidence-liveB20-pop3-att2.txt");
		expect(e).toContain("NOCOPY False");
		expect(e).toContain("RETHROWN leak");
		expect(e).toContain("COPIED R-3 bg after lines=2 eval=1 join=0 url=0");
	});
	for (const r of SLICE_B_STOPS) {
		it(`the generic STOP ${r} pairs with its RETURN line (R5.6; the pairing only, not each row's own reason)`, () => {
			const lines = o[`stop-${r}`]!.filter((l) => /^(STOP [a-z-]+|RETURN )/.test(l));
			expect(lines).toEqual([`STOP ${r}`, `RETURN 1 after-stop=${r} restored=n/a readback=n/a`]);
			expect(checkStopReturn20(lines)).toEqual([]);
		});
	}
});
