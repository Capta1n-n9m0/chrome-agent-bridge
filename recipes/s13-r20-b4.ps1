# recipes/s13-r20-b4.ps1: the PowerShell side of liveB20's R20-POP-BG-3, -FG-3 and -OTHER-3 (Step 13 S5-drivers-B4a; docs/e2e-test-plan.md section 4.28, the dated addendum of 2026-10-30, #407, #410).
# Windows PowerShell 5.1, ASCII only. NOT run against Chrome by its author. Definitions only (no main, no param block): the liveB20 entry script dot-sources it AFTER recipes/s13-r20.ps1, then calls
# Register-R20B4Blocks. It answers the actor's value steps (recipes/s13-r20-b4.ts): `<row>-<leg>-cn0` with `ok <lines> <eval>` and `<row>-<leg>-cn1` with `ok <lines> <eval> <join> <url>`,
# or `unread` when the capture (or the window title it must drop) cannot be read. Counts only: no console line, window title, URL or name is printed or written.
$R20Pop3Evidence = { Join-Path $env:S11_OUT 'r20-pop3-evidence.txt' }   # the slice's evidence file (counts); NOT the record, whose line forms are fixed (item 15)
function Get-R20RootName { try { [string]$S9UIA::FromHandle([IntPtr]$global:D).Current.Name } catch { '' } }
# The counts of one capture, per capture line (item 10): `[bridge] evaluate` case-sensitive; the join names (case-insensitive); the popup URL parts (case-insensitive). A line equal to the
# root window-title Name is dropped before any match (item 9). Lines are matched with ordinal string tests, never by a pattern that could print.
function Get-R20Pop3Counts([string[]]$Lines, [string]$Port, [string]$Root) {
  $r20e = 0; $r20j = 0; $r20u = 0; $r20n = 0
  $r20jp = @('opener-join', 'openerjoin', 'opener_join'); $r20up = @("localhost:$Port", 'e2e-playground.html?popup', 'popup=1')
  foreach ($r20l in @($Lines)) {
    if ($null -eq $r20l -or "$r20l" -ceq $Root) { continue }
    $r20n++
    if ("$r20l".Contains('[bridge] evaluate')) { $r20e++ }
    if (@($r20jp | Where-Object { "$r20l".IndexOf($_, [StringComparison]::OrdinalIgnoreCase) -ge 0 }).Count) { $r20j++ }
    if (@($r20up | Where-Object { "$r20l".IndexOf($_, [StringComparison]::OrdinalIgnoreCase) -ge 0 }).Count) { $r20u++ }
  }
  [pscustomobject]@{ Lines = $r20n; Eval = $r20e; Join = $r20j; Url = $r20u }
}
# The capture window saved to a scratch file (outside the repo) and counted; $null = unreadable (Save-S11bConsole threw, the root Name could not be read, or the file could not be read) (item 14).
function Read-R20Pop3Capture {
  $r20f = Join-Path $env:S11_OUT 'cn3-probe.txt'
  try {
    [void](Save-S11bConsole $global:D $r20f)
    $r20r = Get-R20RootName; if (-not $r20r) { return $null }
    Get-R20Pop3Counts @(Get-Content -LiteralPath $r20f -Encoding UTF8) "$($global:R20Port)" $r20r
  } catch { $null } finally { Remove-Item -LiteralPath $r20f -ErrorAction Ignore }
}
function Add-R20Pop3Evidence([string]$Text) { $r20p = & $R20Pop3Evidence; Add-Content -LiteralPath $r20p -Value $Text -Encoding ASCII }
# One value step. When = before (the leg's first call is next) or after (the leg's last call answered and its popup closed). The evidence file gets the evaluate counts of both (item 15) and, once, the leg where a
# join or URL count first rose above 0 (item 17; the whole-capture counts are carried into later legs, so only the first leg is named).
function Invoke-R20Pop3Cap([string]$Row, [string]$Leg, [string]$When) {
  $r20c = Read-R20Pop3Capture
  if ($null -eq $r20c) { Add-R20Pop3Evidence "$Row $Leg $When unread"; return 'unread' }
  if ($When -eq 'before') { Add-R20Pop3Evidence "$Row $Leg before lines=$($r20c.Lines) eval=$($r20c.Eval)"; return "ok $($r20c.Lines) $($r20c.Eval)" }
  Add-R20Pop3Evidence "$Row $Leg after lines=$($r20c.Lines) eval=$($r20c.Eval) join=$($r20c.Join) url=$($r20c.Url)"
  $r20p = & $R20Pop3Evidence
  if (($r20c.Join + $r20c.Url) -gt 0 -and -not (Select-String -LiteralPath $r20p -Pattern '^first-hit ' -Quiet)) { Add-R20Pop3Evidence "first-hit $Row $Leg join=$($r20c.Join) url=$($r20c.Url)" }
  "ok $($r20c.Lines) $($r20c.Eval) $($r20c.Join) $($r20c.Url)"
}
function Register-R20B4Blocks {   # call after Register-R20Blocks; the order (R20-0B, the three rows, CLOSERPROBE) is the entry script's
  $global:R19Blocks['r20-pop-bg-3'] = { Invoke-R19Row 'R20-POP-BG-3' @('pop-bg-3', '--port', "$($global:R20Port)") -StepList (New-R20PopSteps 'R20-POP-BG-3' @('bg') $false -Pop3) -Actor 's13-r20-b4' }
  $global:R19Blocks['r20-pop-fg-3'] = { Invoke-R19Row 'R20-POP-FG-3' @('pop-fg-3', '--port', "$($global:R20Port)") -StepList (New-R20PopSteps 'R20-POP-FG-3' @('fg') $false -Pop3) -Actor 's13-r20-b4' }
  $global:R19Blocks['r20-pop-other-3'] = { $r20c = Test-R20Click; Invoke-R19Row 'R20-POP-OTHER-3' @('pop-other-3', '--port', "$($global:R20Port)", '--click', $(if ($r20c) { 'yes' } else { 'no' })) -StepList (New-R20PopSteps 'R20-POP-OTHER-3' $(if ($r20c) { @('third', 'human') } else { @('third') }) $r20c -Pop3) -Actor 's13-r20-b4' }
}
