# recipes/s12-r18-lib.ps1: the sequencing and STOP logic of Run 18's block runner (Step 12 S1-helpers-c; docs/e2e-test-plan.md section 4.26).
# Windows PowerShell 5.1, ASCII only. NOT run against Chrome by its author. recipes/s12-r18.ps1 dot-sources this file and fills $global:R18Blocks;
# recipes/test/s12-r18.test.ts dot-sources it with stubbed helpers. Top-level names carry an R18 prefix (case-insensitive: no $o, $w, $d, $x).
# Needs from the caller (stubbed in tests): Say9, Stop9, Show-S16, Save-S16, Load-S16, Fail-S16, Use-S16Options, Restore-S11Safety, Set-S9Foreground,
# Close-S16Windows, End-S16Actor, Stop-S16All, Get-S11bStopCause, Test-S9Live, Save-S12Console, Set-S12AttachStamp, Invoke-R17Node, Wait-S12Idle,
# Test-S12Idle, Step-S16, Set-S11Front, Call9, and the variables $Framing, $Record, $Steps, $GlobalsFile, $FoundDir, $Root, $R17Blocks.
$R18Order = @{
  liveA18 = @('preflight', 'servers', 'files', 'window', 'reload', 'console', 'r18-0', 'r18-up-l1', 'r18-banner-ctl', 'r18-up-opt', 'r18-up-6', 'r18-save-refuse', 'r18-bc-close', 'r18-restore', 'r18-logs', 'teardown')
  liveB18 = @('preflight', 'servers', 'files', 'window', 'reload', 'console', 'r18-0', 'root-add', 'r18-banner-ctl', 'r18-f-raw', 'r18-f-raw-2', 'r18-f-raw-dir', 'r18-up-race-a', 'r18-up-devt', 'r18-bc-close', 'r18-restore', 'r18-logs', 'teardown')
}
$R18FramingBlocks = @('preflight', 'servers', 'files', 'window', 'reload', 'console', 'teardown', 'root-add', 'r18-bc-close')
$R18NeedsAccess = @('root-add', 'r18-f-raw', 'r18-f-raw-2', 'r18-f-raw-dir', 'r18-up-race-a', 'r18-up-devt')
$R18GateRows = @('R18-F-RAW', 'R18-F-RAW-2', 'R18-F-RAW-DIR', 'R18-UP-RACE-A', 'R18-UP-DEVT')
$R18Lists = @('uploadfolders-invalid', 'uploadfolders-warned')
# Same ranks and verdict-line pattern as recipes/s11b-r17b-rules.ts (carriedVerdict, VERDICT_LINE); a test compares the two.
$R18Rank = @('STOP', 'FAIL', 'NOT DISCRIMINATING', 'NOT MEASURED', 'NOT RUN', 'PASS')
$R18Pre = '^(?:\S+Z )?(?:s9-win: )?'
# a helper's failing clause line: `CHECK <id> [<step>] FAIL: ...` (s11b up6: a two-token label) or the helper's own `ROW <id> FAIL: ...` (s11b raw)
$R18BadRe = $R18Pre + '(?:CHECK \S+(?: \S+){0,2}? |ROW \S+ )(?:FAIL|NOT MEASURED|NOT DISCRIMINATING|NOT RUN|STOP)(?=[ :]|$)'
$R18BanRe = '(?:: banner seen|: the banner window was not sampled)\s*$'
$R18VerdictRe = '^(?:\S+Z )?(?:s9-win: )?ROW \S+(?: \S+){0,2}? (STOP|FAIL|NOT DISCRIMINATING|NOT MEASURED|NOT RUN|PASS|RECORD)(?=[ :]|$)'

function Get-R18RecordName([string]$Block, [int]$Att = 1) { "S1-live-record-$Block$(if ($Att -gt 1) { "-att$Att" }).txt" }
function Get-R18Order([string]$Block) { if ($Block -eq 'teardown') { return @('teardown') }; $R18Order[$Block] }
function Get-R18SliceLetter([string]$Slice) { $Slice.Substring(4, 1) }
function Set-R18Raw([string]$Name) { $env:S9_RAW = if ($R18FramingBlocks -contains $Name) { $Framing } else { $Record } }

# ---- verdicts: from a block's own new record lines, or from scan exit codes --------------------------------------------------------
function Get-R18Verdict([string[]]$Lines) {
  $best = $R18Rank.Count - 1; $n = 0
  foreach ($l in $Lines) {
    $m = [regex]::Match([string]$l, $R18VerdictRe)
    if (-not $m.Success) { continue }
    $n++; $v = $m.Groups[1].Value; if ($v -eq 'RECORD') { $v = 'PASS' }
    $best = [Math]::Min($best, [Array]::IndexOf($R18Rank, $v))
  }
  if ($n -eq 0) { 'NOT MEASURED' } else { $R18Rank[$best] }
}
function Get-R18CodesVerdict([int[]]$Codes) { if ($Codes -contains 3) { 'NOT MEASURED' } elseif (@($Codes | Where-Object { $_ -ne 0 }).Count) { 'FAIL' } else { 'PASS' } }
# Exactly one ROW line per row and slice; a row run in both slices ends its verdict with slice=<A|B>.
function Write-R18RowLine([string]$Id, [string]$Verdict, [string]$Slice = '') { Say9 "ROW $Id $Verdict$(if ($Slice) { " slice=$(Get-R18SliceLetter $Slice)" })" }
function Get-R18RecordLines { if (Test-Path -LiteralPath $Record) { @(Get-Content -LiteralPath $Record -Encoding UTF8) } else { @() } }
# Runs $Ops, then prints the row's ONE ROW line from the verdict lines $Ops added to the record. A STOP printed by $Ops prints no row.
# -Banner: a FAIL whose every non-PASS clause is a banner clause is NOT MEASURED when the slice's R18-BANNER-CTL did not pass (4.26).
# -Defer: the row's ROW line waits for R18-LOGS (its console clause), see Write-R18Pending.
function Get-R18BannerVerdict([string[]]$Lines, [string]$V) {
  if ($V -ne 'FAIL' -or $global:R18Ctl -eq 'PASS') { return $V }
  $bad = @($Lines | Where-Object { $_ -match $R18BadRe })
  if (-not $bad.Count -or @($bad | Where-Object { $_ -notmatch $R18BanRe }).Count) { return $V }
  # s11b raw prints only its FIRST failing clause (the refusal step, which passes its error, page and window clauses before it reads the banner):
  # a leak hides behind "banner seen", so the conversion needs its own LEAKS <row> 0 line (a non-zero count or no line keeps FAIL)
  if (@($bad | Where-Object { $_ -match ($R18Pre + 'ROW F-RAW') }).Count -and -not @($Lines | Where-Object { $_ -match ($R18Pre + 'LEAKS F-RAW\S* 0\s*$') }).Count) { return $V }
  'NOT MEASURED (banner clause: R18-BANNER-CTL did not pass)'
}
function Set-R18Pending([string]$Id, [string]$V) { $global:R18Pending[$Id] = $V; Show-S16 @("CHECK $Id console-clause pending R18-LOGS") }
function Write-R18Pending([string]$Logs) {
  foreach ($id in @($global:R18Pending.Keys)) {
    $v = $global:R18Pending[$id]
    if ($id -eq 'R18-UP-L1' -and (-not $Logs -or $Logs -eq 'NOT MEASURED')) { $v = 'FAIL (console clause not met: R18-LOGS did not measure)' }
    if ($id -eq 'R18-SAVE-REFUSE' -and $Logs -eq 'NOT MEASURED') { $v = 'NOT MEASURED (console clause: R18-LOGS did not measure)' }
    Write-R18RowLine $id $v
  }
  $global:R18Pending = [ordered]@{}
}
function Invoke-R18RowBlock([string]$Id, [scriptblock]$Ops, [string]$Slice = '', [switch]$Banner, [switch]$Defer) {
  $n0 = (Get-R18RecordLines).Count; $s0 = $global:S16Stops
  & $Ops
  if ($global:S16Stops -gt $s0) { throw "row $Id printed a STOP" }
  $r18L = @(Get-R18RecordLines | Select-Object -Skip $n0); $r18V = Get-R18Verdict $r18L
  if ($Banner) { $r18V = Get-R18BannerVerdict $r18L $r18V }
  if ($Defer) { Set-R18Pending $Id $r18V } else { Write-R18RowLine $Id $r18V $Slice }
}
# Every actor process can attach the debugger: the stamp is set after it, also when it throws (a forgotten stamp overstates the idle).
function Invoke-R18Node { try { Invoke-R17Node @args } finally { Set-S12AttachStamp } }
function Invoke-R18Stamped([scriptblock]$Block) { try { & $Block } finally { Set-S12AttachStamp } }
# The reused Run 17 blocks run stamped: any of them can attach the debugger (s11 setup evaluates on every tab it opens).
function Set-R18Reused([string[]]$Names, $Src) { foreach ($r18N in $Names) { $r18B = $Src[$r18N]; $global:R18Blocks[$r18N] = { Invoke-R18Stamped $r18B }.GetNewClosure() } }

# ---- R18-0: the lists and the tree are checked BEFORE the found-state read; nothing here changes state -------------------------------
function Get-R18Head { $r18Sha = (git rev-parse HEAD).Trim().Substring(0, 12); $r18Dirty = @(git status --porcelain --untracked-files=no -- . ":(exclude)$Steps"); [pscustomobject]@{ Head = $r18Sha; Clean = ($r18Dirty.Count -eq 0) } }
# Both option-page lists must be found (the empty warned list included): an element UIA does not expose is a STOP, never a count of 0 (#346).
function Test-R18Lists {
  $r18Opt = Use-S16Options
  $r18Doc = Get-S9Options $r18Opt
  foreach ($id in $R18Lists) {
    if (-not (Get-S9ById $r18Doc $id)) { $env:S9_RAW = $Record; Stop9 "R18-0: the option-page list $id was not found (an empty list may not be exposed); nothing was changed"; return $false }
  }
  Say9 'R18-0: both Upload folders lists are found'
  $true
}
function Invoke-R18Zero([scriptblock]$Zero) {
  if ($global:S16Changed) { Fail-S16 'R18-0 after a state change would overwrite the found texts; refused' }
  $r18H = Get-R18Head
  if (-not $r18H.Clean) { Fail-S16 'R18-0 (g): the tracked tree is not clean outside the steps dir' }
  $env:S9_RAW = $Framing
  $okLists = Test-R18Lists
  Set-R18Raw 'r18-0'
  if (-not $okLists) { throw 'stop' }
  Invoke-R18Stamped $Zero
  Show-S16 @("HEAD $($r18H.Head) tree=clean")
  Write-R18RowLine 'R18-0' 'PASS' $global:R18Slice
}

# ---- R18-BANNER-CTL: the judge's arguments from the two legs' own results -----------------------------------------------------------
function Get-R18CtlArgs([string]$Slice, $Neg, $Pos, [string[]]$NegOut, [string[]]$PosOut) {
  $ans = [regex]::Match(($PosOut -join "`n"), 'ANSWER R18-BANNER-CTL pos (\S+)')
  $vm = [regex]::Matches((@($NegOut) + @($PosOut)) -join "`n", 'CHECK bannerctl-(?:neg|pos) violations=(\d+)')
  if (-not $ans.Success -or $vm.Count -ne 2) { Stop9 'R18-BANNER-CTL: a leg printed no ANSWER or no violations CHECK line'; throw 'no ctl line' }
  $viol = 0; foreach ($m in $vm) { $viol += [int]$m.Groups[1].Value }
  @('bannerctl-judge', '--slice', $Slice, '--idle-ms', "$($Neg.IdleMs)", '--neg-polls', "$($Neg.Polls)", '--neg-banner', "$($Neg.Banner)", '--pos-answer', $ans.Groups[1].Value, '--pos-polls', "$($Pos.Polls)", '--pos-banner', "$($Pos.Banner)", '--violations', "$viol")
}

# ---- liveB18: the file-URL toggle is READ (never pressed) right after the preflight; OFF writes the gated rows NOT RUN ----------------
function Test-R18Gate([string]$Name) {
  if (($R18NeedsAccess -contains $Name) -and $global:S16Toggle -ne 'on') { Say9 "GATE block $Name refused: the file-URL toggle did not read on (G11-3); its rows stay NOT RUN"; return $false }
  $true
}
function Read-R18Early {
  $r18Ext = New-S16Window "chrome://extensions/?id=$S9Id"
  try { $reading = @(Read-S11FileAccess $r18Ext)[-1] } finally { Close-S11Window $r18Ext }
  if ($reading -notin 'on', 'off') { Fail-S16 'the file-URL toggle is unreadable; nothing changed' }
  $global:S16Toggle = $reading
  if ($reading -ne 'on') {
    $env:S9_RAW = $Record
    foreach ($row in $R18GateRows) { Say9 "ROW $row NOT RUN $([char]0x2014) waits for G11-3" }
    Say9 'GATE liveB18 refused before any state change: the file-URL toggle reads off (G11-3)'
    $global:S16Gone = $true; Save-S16
    return $false
  }
  $true
}

# ---- the STOP procedure (#193): restore first if the safety state was touched, save the capture, end own processes, return 2 -----------
function Save-R18Console {
  if ($global:S16ConsoleRead) { return }
  if ($global:D -and (Test-S9Live $global:D)) { [void](Save-S12Console $global:D $global:R18Slice); $global:S16ConsoleRead = $true }
}
function Restore-R18State { $r18Opt = Use-S16Options; [void](Set-S9Foreground $global:W); Restore-S11Safety $r18Opt $global:W 'R18-RESTORE' }
function Stop-R18Wave([string]$Why) {
  $env:S9_RAW = $Record
  Say9 "WAVE stopping: $Why"
  if ($global:S16Changed -and $global:R18Slice -eq 'teardown') { Say9 'the stop is in teardown: the restore is not pressed again; return to the user (the safety state may be unrestored)' }
  elseif ($global:S16Changed -and -not $global:S16InRestore) {
    $s0 = $global:S16Stops; $okr = $false; $threw = $false
    try { $okr = (@(Restore-R18State)[-1] -eq $true) } catch { $threw = $true }
    if ($threw -or -not $okr -or $global:S16Stops -gt $s0) { Stop9 'the restore failed or printed a STOP during the stop procedure; the wave is over' } else { $global:S16Changed = $false }
  } elseif ($global:S16Changed) { Say9 'the stop met the restore itself; no second restore' }
  try { Save-R18Console } catch { Say9 'the worker console could not be saved before closing (no verdict)' }
  try { End-S16Actor } catch { Say9 'the actor could not be ended' }
  try { Close-S16Windows } catch { Say9 'the own windows could not all be closed' }
  Stop-S16All
  Stop9 "the wave ended ($Why)"
  Save-S16
  2
}

# ---- the sequencer ---------------------------------------------------------------------------------------------------------------
function Invoke-R18Block([string]$Name) {
  $env:S9_RAW = $Framing; Say9 "BLOCK $Name start"
  Set-R18Raw $Name
  $s0 = $global:S16Stops
  & $global:R18Blocks[$Name]
  if ($global:S16Stops -gt $s0) { throw "block $Name printed a STOP" }
  $env:S9_RAW = $Framing; Say9 "BLOCK $Name done"
  Save-S16
}
# Returns the exit code: 0 done, 2 STOP (after the restore), 3 not run (the G11-3 branch).
function Invoke-R18Slice([string]$Block) {
  $global:R18Slice = $Block; $slot = $Block; $global:R18Ctl = ''; $global:R18Pending = [ordered]@{}
  try {
    foreach ($slot in (Get-R18Order $Block)) {
      if (-not (Test-R18Gate $slot)) { Invoke-R18Block 'teardown'; return 3 }
      Invoke-R18Block $slot
      if ($Block -eq 'liveB18' -and $slot -eq 'preflight' -and -not @(Read-R18Early)[-1]) { return 3 }
    }
    Say9 "SLICE $Block done: calls with a failed check $($global:S16Fail), not measured $($global:S16NM) (the rows are in the record)"
    return 0
  } catch {
    return (Stop-R18Wave "an exception in block $slot ($(Get-S11bStopCause $_))")
  }
}

# ---- the blocks with load-bearing logic (the entry only maps a block name to one of these) ------------------------------------------
# A banner row: front, then the wait (at least 15 s since the last attach) and the IDLE guard right before the first call.
function Invoke-R18Banner([string]$Row, [scriptblock]$Run) {
  Step-S16 'front' { Set-S11Front $global:W $Row }
  [void](Wait-S12Idle)
  if (-not (Test-S12Idle $Row)) { throw 'stop' }
  & $Run
}
# the name is $RawId, not $Row: Invoke-R18Banner has a $Row of its own that its block would see first (dynamic scope)
function Invoke-R18Raw([string]$RawId, [string[]]$Extra = @()) {
  Invoke-R18RowBlock "R18-$RawId" { Invoke-R18Banner "R18-$RawId" { [void](Invoke-R18Node 's11b' (@('raw', '--row', $RawId) + $Extra) { Invoke-S11bSamplerPasses -Ids @($RawId) -Hwnds @($global:W) }) } } $global:R18Slice -Banner
}
function Invoke-R18Up6 {
  Invoke-R18RowBlock 'R18-UP-6' {
    $r18Ids = @('R17-UP-6-outside', 'R17-UP-6-missing', 'R17-UP-6-relative', 'R17-UP-6-raw-dotdot', 'R17-UP-6-raw-notarget')
    Invoke-R18Banner 'R18-UP-6' { [void](Invoke-R18Node 's11b' @('up6') { Invoke-S11bSamplerPasses -Ids $r18Ids -Hwnds @($global:W) }) }
  } $global:R18Slice -Banner
}
function Invoke-R18UpL1 {
  Invoke-R18RowBlock 'R18-UP-L1' {
    [void](Invoke-R18Node 's11' @('foundcheck', '--text-file', (Join-Path $FoundDir 'found-uploadfolders.txt')) -StopOnFail)
    [void](Invoke-R18Node 's11b' @('raw-l1'))
  } -Defer
}
function Invoke-R18BannerCtl {
  $r18Sl = $global:R18Slice
  [void](Call9 'R18-BC' 'open' 'newtab' @('http://localhost:8081/e2e-playground.html?s12=bc', '--as', 'bc') 'ok' -StopOnFail)
  Step-S16 'front' { Set-S11Front $global:W 'R18-BANNER-CTL' }
  [void](Wait-S12Idle)
  [void](Invoke-R18Node 's11b' @('bannerctl', '--leg', 'neg') { [void](Invoke-S12BannerLeg 'neg' @($global:W)) })
  $r18Neg = $global:S12Leg; $r18NegOut = $global:R17Out
  [void](Invoke-R18Node 's11b' @('bannerctl', '--leg', 'pos', '--tab', 'bc') { [void](Invoke-S12BannerLeg 'pos' @($global:W)) })
  $r18Pos = $global:S12Leg; $r18PosOut = $global:R17Out
  $r18C = [int](Invoke-R18Node 's11b' (Get-R18CtlArgs $r18Sl $r18Neg $r18Pos $r18NegOut $r18PosOut))
  $global:R18Ctl = $(if ($r18C -eq 0) { 'PASS' } else { 'FAIL' })
  if ($r18C -ne 0) { Show-S16 @("CHECK banner-clauses slice=$(Get-R18SliceLetter $r18Sl) NOT MEASURED (R18-BANNER-CTL did not pass)") }
}
function Invoke-R18UpOpt {
  Invoke-R18RowBlock 'R18-UP-OPT' {
    $global:S16Changed = $true; Save-S16
    $r18O = Use-S16Options
    $r18Of = Join-Path $env:S11_OUT 'upopt-obs.json'
    $r18Sum0 = [string](Get-S11Summary (Get-S9Options $r18O))
    Step-S16 'opt' { Invoke-S12Opt $r18O $Root $r18Of }
    $r18Mf = @(Get-S11bOptObs $r18O $r18Of $r18Sum0)[-1]
    if (Test-Path -LiteralPath $r18Of) { Remove-Item -LiteralPath $r18Of -Force }
    [void](Invoke-R17Judge 'upopt' $r18Mf)
  }
}
function Invoke-R18SaveRefuse {
  $r18N0 = (Get-R18RecordLines).Count
  [void](Invoke-R18Node 's11' @('saverefuse-sdk'))
  $r18F1 = Join-Path $env:S11_OUT 'saverefuse-sdk-leg.txt'; Write-R17File $r18F1 ([string[]]@(Get-R18RecordLines | Select-Object -Skip $r18N0))
  [void](Invoke-R18Node 's11b' @('leg-line', '--row', 'R18-SAVE-REFUSE', '--leg', 'sdk-leg', '--from', $r18F1))
  $r18L1 = @($global:R17Out)
  $r18N1 = (Get-R18RecordLines).Count
  Start-S16Actor
  $global:R17ActorRan = $true
  try { [void](Invoke-R18Node 's11' @('saverefuse-mcp')) } finally { End-S16Actor }
  $r18F2 = Join-Path $env:S11_OUT 'saverefuse-mcp-leg.txt'; Write-R17File $r18F2 ([string[]]@(Get-R18RecordLines | Select-Object -Skip $r18N1))
  [void](Invoke-R18Node 's11b' @('leg-line', '--row', 'R18-SAVE-REFUSE', '--leg', 'mcp-leg', '--from', $r18F2))
  Set-R18Pending 'R18-SAVE-REFUSE' (Get-R18Verdict (@($r18L1) + @($global:R17Out) -replace '^LEG ', 'ROW '))
}
function Invoke-R18UpRaceA {
  Invoke-R18RowBlock 'R18-UP-RACE-A' {
    $global:S16Changed = $true; Save-S16
    Step-S16 'front' { Set-S11Front $global:W 'race A' }
    [void](Invoke-R18Node 's11b' @('race', '--to-cap') { Invoke-S12RaceA $global:W })
  }
}
function Invoke-R18UpDevt {
  $global:X = New-S16Window 'http://127.0.0.1:8081/s11-upload.html?s11=xwin'   # window X: the only window DevTools is opened in
  [void](Set-S9Foreground $global:X)
  [void](Invoke-R18Node 's11' @('setup', '--only', 'x'))
  [void](Invoke-R18Node 's11b' @('devt', '--slice', 'liveB18', '--row', 'R18-UP-DEVT') { Invoke-S12DevtRow $global:X })   # prints the one ROW R18-UP-DEVT itself
  Close-S11Window $global:X
  [void](Set-S9Foreground $global:W)
}
function Invoke-R18Restore {
  Invoke-R18RowBlock 'R18-RESTORE' {
    if (Test-S11Own $global:O) { Close-S11Window $global:O; $global:O = 0 }   # the options page is opened fresh
    Invoke-R18Stamped $R17Blocks['rd-restore']
  } $global:R18Slice
}
function Invoke-R18Logs {
  $r18Sl = $global:R18Slice
  $r18Cap = Join-Path $env:S11_OUT "console-$r18Sl.txt"; $r18Df = Join-Path $env:S11_OUT "daemon-slice-$r18Sl.txt"
  Step-S16 'console' { Save-R18Console }
  [void](Invoke-R18Node 's11b' @('clean-console', '--file', $r18Cap))
  [void](Invoke-R18Node 's11b' @('console-line', '--slice', $r18Sl, '--file', $r18Cap))
  Write-R17File $r18Df ([string[]]@(Get-Content -LiteralPath $DaemonLog -Encoding UTF8 | Select-Object -Skip $global:S16Mark))
  $r18Codes = @([int](Invoke-R18Node 's11b' @('scan18', '--what', 'console', '--file', $r18Cap)))
  if ($r18Codes[0] -eq 0) { Copy-Item -LiteralPath $r18Cap -Destination (Join-Path $env:S11_OUT "console-$r18Sl-evidence.txt") -Force; Say9 'EVIDENCE console copy written (scan passed)' } else { Say9 'EVIDENCE console copy not written (scan not passed)' }
  $r18Codes += [int](Invoke-R18Node 's11b' @('scan18', '--what', 'daemon', '--file', $r18Df))
  if ($global:R17ActorRan) { $r18Codes += [int](Invoke-R18Node 's11b' @('scan18', '--what', 'actors')) } else { Say9 'R18-LOGS actors: no actor ran in this slice; nothing to scan' }
  Assert-R17TreeClean
  $r18V = Get-R18CodesVerdict $r18Codes
  Write-R18RowLine 'R18-LOGS' $r18V $r18Sl
  Write-R18Pending $r18V
  $r18Rf = Join-Path $env:S11_OUT "rows18-$r18Sl.txt"; Write-R17File $r18Rf ([string[]]@(Get-R18RecordLines))   # a copy outside the repo: rows18 reads only there
  [void](Invoke-R18Node 's11b' @('rows18', '--from', $r18Rf))   # a WARN row printed twice is recorded, not a STOP
}
# The whole run: a record that already holds text, or a previous wave's globals, refuse it before anything is loaded or done. Returns the exit code.
function Invoke-R18Main([string]$Block) {
  $env:S9_RAW = $Framing
  if ($Block -ne 'teardown' -and @(Get-R18RecordLines | Where-Object { $_.Trim() }).Count) { Stop9 'the record file already holds text; give this attempt its own -Att'; return 2 }
  if ($Block -ne 'teardown' -and (Test-Path -LiteralPath $GlobalsFile)) { Stop9 'a previous wave''s globals exist; run -Block teardown first'; return 2 }
  Load-S16
  [int](@(Invoke-R18Slice $Block)[-1])
}

# ---- Run 17's helper functions and block texts, read by PowerShell's own parser (those files have mains that must not run) -----------
function Get-R18Defs([string]$File) {
  $tk = $null; $er = $null
  $ast = [Management.Automation.Language.Parser]::ParseFile($File, [ref]$tk, [ref]$er)
  if ($er.Count -ne 0) { throw "$File has parse errors" }
  $funcs = @{}; $blocks = @{}
  foreach ($st in $ast.EndBlock.Statements) {
    if ($st -is [Management.Automation.Language.FunctionDefinitionAst]) { $funcs[$st.Name] = $st.Extent.Text }
    elseif ($st -is [Management.Automation.Language.AssignmentStatementAst] -and $st.Left.Extent.Text.StartsWith('$Blocks[')) { $blocks[[regex]::Match($st.Left.Extent.Text, "'([^']+)'").Groups[1].Value] = $st.Right.Extent.Text }
  }
  [pscustomobject]@{ Funcs = $funcs; Blocks = $blocks }
}
