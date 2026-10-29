# recipes/s12-r19-lib.ps1: the sequencing, STOP/RETURN and old-build logic of Run 19's block runner (Step 12 S7-helpers-d; docs/e2e-test-plan.md section 4.27).
# Windows PowerShell 5.1, ASCII only. NOT run against Chrome by its author. recipes/s12-r19.ps1 dot-sources this file and fills $global:R19Blocks;
# recipes/test/s12-r19.test.ts dot-sources it with stubbed helpers. Top-level names carry an R19 prefix (case-insensitive: no $o, $w, $d, $x).
# Needs from the caller (stubbed in tests): Say9, Stop9, Show-S16, Save-S16, Load-S16, Fail-S16, Use-S16Options, Restore-S11Safety, Set-S9Foreground,
# Close-S16Windows, End-S16Actor, Stop-S16All, Get-S11bStopCause, Test-S9Live, Save-S11bConsole, Close-S11Window, Close-S9Window, Set-S12AttachStamp, Invoke-R17Node,
# Invoke-S12CloserProbe, git, and the variables $Record, $Framing, $Steps, $GlobalsFile, $R17Blocks, $UpOptReport.
$R19Prologue = @('preflight', 'servers', 'files', 'window', 'reload', 'console')
$R19Order = @{
  liveA19 = $R19Prologue + @('r19-0', 'r19-banner-ctl', 'r19-args-1', 'r19-args-2', 'r19-args-global', 'r19-args-csp', 'r19-args-stop', 'r19-con-1', 'r19-con-2', 'r19-con-rej', 'r19-con-big', 'r19-con-nav', 'r19-con-mcp', 'r19-con-cap', 'r19-con-banner', 'r19-args-3', 'r19-con-jsoff', 'r19-con-3', 'r19-con-frame', 'r19-con-notea', 'r19-con-4', 'r19-con-floor', 'r19-con-own', 'r19-con-file', 'r19-restore', 'r19-logs', 'teardown')
  liveB19 = $R19Prologue + @('r19-0', 'devprobe', 'closerprobe', 'r19-up-opt', 'root-add', 'r19-banner-ctl', 'r19-up-6', 'r19-f-raw', 'r19-f-raw-2', 'r19-f-raw-dir', 'r19-keep-1', 'r19-keep-2', 'r19-keep-3', 'r19-con-kept', 'r19-keep-overlap-a', 'r19-up-devt', 'r19-keep-4', 'r19-devt-noflag', 'r19-sweep-held', 'r19-restore', 'r19-logs', 'teardown')
  liveC19 = $R19Prologue + @('r19-0', 'root-add', 'r19-banner-ctl', 'closerprobe', 'r19-choose-1', 'r19-choose-label', 'r19-choose-refuse', 'r19-choose-2', 'r19-choose-3', 'r19-choose-mcp', 'r19-choose-kept', 'r19-choose-frame', 'r19-choose-human', 'r19-choose-late', 'r19-keep-overlap-b', 'r19-choose-4', 'r19-choose-disarm', 'r19-choose-jsoff', 'r19-choose-mcp-d', 'r19-g2-1', 'r19-g2-2', 'r19-restore', 'r19-logs', 'teardown')
  liveD19 = $R19Prologue + @('r19-0', 'r19-old-args', 'r19-restore', 'r19-logs', 'teardown')
  liveE19 = $R19Prologue + @('r19-0', 'r19-old-version', 'r19-restore', 'r19-logs', 'teardown')
}
$R19Commit = @{ liveD19 = '3ab9207'; liveE19 = '63c771c' }   # the pre-S2a build (R19-ARGS-OLD) and the pre-S5a build (R19-VERSION)
$R19FramingBlocks = $R19Prologue + @('teardown')
$R19Probes = @('devprobe', 'closerprobe')
$R19Silent = @('r19-choose-mcp')                              # leg a-c, e of CHOOSE-MCP: its one ROW is printed by r19-choose-mcp-d
$R19Multi = @('R19-0', 'R19-BANNER-CTL', 'R19-RESTORE', 'R19-LOGS', 'R19-KEEP-OVERLAP')
$R19Rank = @('STOP', 'FAIL', 'NOT DISCRIMINATING', 'NOT MEASURED', 'NOT RUN', 'PASS')
$R19VerdictRe = '^(?:\S+Z )?(?:s9-win: )?ROW \S+(?: \S+){0,2}? (STOP|FAIL|NOT DISCRIMINATING|NOT MEASURED|NOT RUN|PASS|RECORD)(?=[ :]|$)'

function Get-R19Order([string]$Block) { if ($Block -eq 'teardown') { return @('teardown') }; $R19Order[$Block] }
function Get-R19RecordName([string]$Block, [int]$Att = 1) { "S7-live-record-$Block$(if ($Att -gt 1) { "-att$Att" }).txt" }
function Get-R19SliceLetter([string]$Slice) { $Slice.Substring(4, 1) }
function Get-R19RowId([string]$Name) {
  if ($Name -match '^r19-keep-overlap-[ab]$') { return 'R19-KEEP-OVERLAP' }
  if ($Name -eq 'r19-choose-mcp-d') { return 'R19-CHOOSE-MCP' }
  if ($Name -eq 'r19-old-args') { return 'R19-ARGS-OLD' }
  if ($Name -eq 'r19-old-version') { return 'R19-VERSION' }
  $Name.ToUpper()
}
function Set-R19Raw([string]$Name) { $env:S9_RAW = if ($R19FramingBlocks -contains $Name) { $Framing } else { $Record } }
function Get-R19RecordLines { if (Test-Path -LiteralPath $Record) { @(Get-Content -LiteralPath $Record -Encoding UTF8) } else { @() } }
function Get-R19Verdict([string[]]$Lines) {
  $best = $R19Rank.Count - 1; $n = 0
  foreach ($l in $Lines) {
    $m = [regex]::Match([string]$l, $R19VerdictRe)
    if (-not $m.Success) { continue }
    $n++; $v = $m.Groups[1].Value; if ($v -eq 'RECORD') { $v = 'PASS' }
    $best = [Math]::Min($best, [Array]::IndexOf($R19Rank, $v))
  }
  if ($n -eq 0) { 'NOT MEASURED' } else { $R19Rank[$best] }
}
# Exactly one ROW per id and slice; the rows every slice holds end with slice=<letter>.
function Write-R19RowLine([string]$Id, [string]$Verdict) { Say9 "ROW $Id $Verdict$(if ($R19Multi -contains $Id) { " slice=$(Get-R19SliceLetter $global:R19Slice)" })" }
function Invoke-R19RowBlock([string]$Id, [scriptblock]$Ops, [switch]$Defer) {
  $n0 = (Get-R19RecordLines).Count; $s0 = $global:S16Stops
  & $Ops
  if ($global:S16Stops -gt $s0) { throw "row $Id printed a STOP" }
  $v = Get-R19Verdict @(Get-R19RecordLines | Select-Object -Skip $n0)
  if ($Defer) { $global:R19Pending[$Id] = $v; Show-S16 @("CHECK $Id console-clause pending R19-LOGS") } else { Write-R19RowLine $Id $v }
}
function Invoke-R19Stamped([scriptblock]$Block) { try { & $Block } finally { Set-S12AttachStamp } }
# The real Invoke-R17Node prints node's output itself and THROWS on an exit of 2 (or a guard STOP) and on an exit of 1 with no ROW/CHECK line (s11b-r17.ps1:137,139).
# The runner reads node's verdict as a code: those two throws are mapped back to 2 and 1 here (node's lines are already in the record and in $global:R17Out).
function Invoke-R19Node {
  try {
    try { Invoke-R17Node @args }
    catch { $r19m = "$_"; if ($r19m -match 'ended in a STOP$') { 2 } elseif ($r19m -match 'exited 1 with no ROW or CHECK line') { 1 } else { throw } }
  } finally { Set-S12AttachStamp }
}
function Set-R19Reused([string[]]$Names, $Src) { foreach ($r19N in $Names) { $r19B = $Src[$r19N]; $global:R19Blocks[$r19N] = { Invoke-R19Stamped $r19B }.GetNewClosure() } }

# ---- STOP and RETURN (forms (31); R7.6): a STOP line is always followed by exactly one RETURN line ------------------------------------------------
# A row block that knows its reason calls Stop-R19 (sets the reason, prints the guard line, throws); any other throw is `throw-after-state`.
function Stop-R19([string]$Reason, [string]$Why) { $global:R19Reason = $Reason; Stop9 "$Why ($Reason)"; throw "stop $Reason" }
function Restore-R19State { $r19Opt = Use-S16Options; [void](Set-S9Foreground $global:W); Restore-S11Safety $r19Opt $global:W 'R19-RESTORE' }
function Stop-R19Wave([string]$Why) {
  $reason = if ($global:R19Reason) { $global:R19Reason } else { 'throw-after-state' }
  $env:S9_RAW = $Record
  Say9 "WAVE stopping: $Why"
  $global:R19StopSeq++
  Say9 "STOP $reason"
  $restored = 'n/a'; $readback = 'n/a'
  if ($global:S16Changed -and $global:R19Slice -eq 'teardown') { Say9 'the stop is in teardown: the restore is not pressed again; return to the user (the safety state may be unrestored)'; $restored = 'no' }
  elseif ($global:S16Changed -and -not $global:S16InRestore) {
    $s0 = $global:S16Stops; $okr = $false; $threw = $false
    try { $okr = (@(Restore-R19State)[-1] -eq $true) } catch { $threw = $true }
    if ($threw -or -not $okr -or $global:S16Stops -gt $s0) { $restored = 'no'; Stop9 'the restore failed or printed a STOP during the stop procedure; the wave is over' } else { $global:S16Changed = $false; $restored = 'yes'; $readback = 'equal' }
  } elseif ($global:S16Changed) { Say9 'the stop met the restore itself; no second restore'; $restored = 'no' }
  try { Save-R19Seg 'end' } catch { Say9 'the worker console could not be saved before closing (no verdict)' }
  try { End-S16Actor } catch { Say9 'the actor could not be ended' }
  try { Close-S16Windows } catch { Say9 'the own windows could not all be closed' }
  Stop-S16All
  Say9 "RETURN $($global:R19StopSeq) after-stop=$reason restored=$restored readback=$readback"
  Stop9 "the wave ended ($Why)"
  Save-S16
  2
}

# ---- capture segments (Capture segments): saved before every reload, reopened after it; one file per segment ------------------------------------
function Get-R19CapName([string]$Slice, [int]$K) { if ($Slice -in 'liveA19', 'liveC19') { "console-$Slice.txt" } else { "console-$Slice-$K.txt" } }
function Assert-R19CaptureFree([string]$Slice) {
  foreach ($k in 1..3) {
    $f = Join-Path $env:S11_OUT (Get-R19CapName $Slice $k)
    if ((Test-Path -LiteralPath $f) -and (([IO.File]::ReadAllText($f)).Trim() -ne '')) { Stop9 "the capture file $(Split-Path -Leaf $f) already holds text; it is never overwritten"; throw 'capture exists' }
  }
}
function Save-R19Seg([string]$Before) {
  if ($global:S16ConsoleRead -and $Before -eq 'end') { return }
  if (-not ($global:D -and (Test-S9Live $global:D))) { return }
  $k = $global:R19SegNext; $f = Join-Path $env:S11_OUT (Get-R19CapName $global:R19Slice $k)
  if ((Test-Path -LiteralPath $f) -and (([IO.File]::ReadAllText($f)).Trim() -ne '')) { Stop9 "the capture file $(Split-Path -Leaf $f) already holds text"; throw 'capture exists' }
  $saved = $true; try { [void](Save-S11bConsole $global:D $f) } catch { $saved = $false }
  Say9 "CAPSEG $($global:R19Slice) seg=$k saved=$(if ($saved) { 'yes' } else { 'no' }) before=$Before"
  if (-not $saved) { $global:R19SegLost = $true } else { $global:R19Segs += $f }
  if ($Before -eq 'end') { $global:S16ConsoleRead = $true } else { Close-R19CaptureWindows }
}
# The capture window D and the chrome://extensions window E the console block opened with it are the wave's own but NOT in S11Own (Close-S11Window would leave them): close both
# by handle, as Close-S16Windows does, whether or not the save worked. The reload opens its own chrome://extensions window, so E is not needed by it.
function Close-R19CaptureWindows {
  foreach ($r19w in 'D', 'E') {
    $r19h = [long](Get-Variable -Name $r19w -Scope Global -ValueOnly -ErrorAction Ignore)
    if ($r19h -and (Test-S9Live $r19h)) { Close-S9Window $r19h }
    Set-Variable -Name $r19w -Scope Global -Value 0
  }
}
function Open-R19Seg { $global:R19SegNext++; Invoke-R19Stamped $R17Blocks['console'] }

# ---- the old-build slices (#356 (2), #359 M1): the swap runs inside a try whose finally ALWAYS restores HEAD, reloads and proves the build ----------
# S7-drivers-DE: with a $RowId, a reload that gave up (exit 2 twice, the reload block's own record line) is the row's NOT RUN, never a pass and never a STOP; any other reload failure still throws.
function Test-R19ReloadGaveUp([int]$Skip) { @(Get-R19RecordLines | Select-Object -Skip $Skip | Where-Object { "$_" -match 'reload-extension\.ps1 exit 2 \(attempt 2\)' }).Count -gt 0 }
function Invoke-R19Swapped([string]$Commit, [scriptblock]$Rows, [string]$RowId = '') {
  $tmp = Join-Path $env:S11_OUT 'old-wt'
  try {
    Save-R19Seg 'reload'
    if ([int](Invoke-R19Node 's12-r19' @('swap', '--commit', $Commit, '--tmp', $tmp)) -ne 0) { throw 'the old-build swap failed' }
    $r19n0 = @(Get-R19RecordLines).Count; $r19s0 = $global:S16Stops; $r19loaded = $true
    try { Invoke-R19Stamped $R17Blocks['reload'] }
    catch { if (-not ($RowId -and (Test-R19ReloadGaveUp $r19n0))) { throw }; $r19loaded = $false; $global:S16Stops = $r19s0 }
    Open-R19Seg
    if ($r19loaded) { & $Rows } else { Say9 "ROW $RowId NOT RUN $([char]0x2014) old build not loadable (reload exit 2 twice)" }
  } finally {
    $left = @()   # each step runs whatever an earlier one did; any failure is the STOP old-build-left-loaded (F2)
    try { $okHead = ([int](Invoke-R19Node 's12-r19' @('restore-head')) -eq 0) } catch { $okHead = $false }
    if (-not $okHead) { $left += 'restoreHead failed: extension/dist may hold the old build' }
    try { Save-R19Seg 'reload' } catch { $left += 'the capture segment could not be saved' }
    try { Invoke-R19Stamped $R17Blocks['reload'] } catch { $left += 'the reload after restoreHead failed: the extension may still run the old build' }
    try { Open-R19Seg } catch { $left += 'the console could not be reopened after the reload' }
    try { if (-not (Invoke-R19Rerun)) { $left += 'the loaded extension is stale: the re-run proof of the current build failed' } } catch { $left += 'the re-run proof threw: the loaded extension may be stale' }
    if ($left.Count) { Stop-R19 'old-build-left-loaded' ($left -join '; ') }
  }
}
# R19-0's re-run line only (no ROW, no preflight lines): a failed proof is a STOP that names the stale extension.
function Invoke-R19Rerun {
  $global:R19Rerun++
  [int](Invoke-R19Node 's12-r19' @('proof', '--rerun', "$($global:R19Rerun)")) -eq 0
}

# ---- R19-0: the preflight lines and the loaded-build proof, before any state change; LOADED is printed right after MANIFEST ---------------------------
function Get-R19Head { $s = (git rev-parse HEAD).Trim().Substring(0, 12); $d = @(git status --porcelain --untracked-files=no -- . ":(exclude)$Steps"); [pscustomobject]@{ Head = $s; Clean = ($d.Count -eq 0) } }
function Invoke-R19Zero([scriptblock]$Zero) {
  if ($global:S16Changed) { Fail-S16 'R19-0 after a state change would overwrite the found texts; refused' }
  $h = Get-R19Head
  if (-not $h.Clean) { Fail-S16 'R19-0: the tracked tree is not clean outside the steps dir' }
  # the real Invoke-R17Node prints node's lines itself: they are collected here, so LOADED can be released right after MANIFEST (R7.2) and printed once
  $global:R19Real = ${function:Show-S16}; $global:R19Held = @()
  function global:Show-S16([string[]]$l) { $global:R19Held += @($l) }
  try { $rc = [int](Invoke-R19Node 's12-r19' @('proof')) } finally { Set-Item function:global:Show-S16 $global:R19Real }
  $global:R19Loaded = @($global:R19Held | Where-Object { $_ -match '^LOADED ' })[-1]
  $r19Other = @($global:R19Held | Where-Object { $_ -notmatch '^LOADED ' }); if ($r19Other.Count) { Show-S16 $r19Other }
  if ($rc -ne 2 -and -not $global:R19Loaded) { Stop-R19 'throw-after-state' 'R19-0: the proof printed no LOADED line (it crashed); nothing was changed' }   # N-2: a crashed proof is not "stale"
  if ($rc -eq 2 -or -not $global:R19Loaded) {
    if ($global:R19Loaded) { Show-S16 @($global:R19Loaded); $global:R19Loaded = $null }
    Stop-R19 'old-build-left-loaded' 'R19-0: the loaded extension is stale, not this build (a reload did not take); nothing was changed'
  }
  Set-R19Raw 'r19-0'
  # the sheet's second line: LOADED follows MANIFEST, so it is released by the first Show-S16 that prints a MANIFEST line
  function global:Show-S16([string[]]$l) { & $global:R19Real $l; if ($global:R19Loaded -and (@($l | Where-Object { $_ -match '^MANIFEST ' }).Count)) { & $global:R19Real @($global:R19Loaded); $global:R19Loaded = $null } }
  try { Invoke-R19Stamped $Zero } finally { Set-Item function:global:Show-S16 $global:R19Real; if ($global:R19Loaded) { Show-S16 @($global:R19Loaded); $global:R19Loaded = $null } }   # N-5: a STOP inside r17b-0 still prints the held LOADED
  Show-S16 @("HEAD $($h.Head) tree=clean")
  Write-R19RowLine 'R19-0' $(if ($rc -eq 0) { 'PASS' } else { 'FAIL' })
}

# ---- the gates ---------------------------------------------------------------------------------------------------------------------------------
# R19-UP-OPT waits for its investigator's report (Open item 14): a report file that is absent, empty or not committed means NOT RUN.
function Test-R19UpOptReport { (Test-Path -LiteralPath $UpOptReport) -and (([IO.File]::ReadAllText($UpOptReport)).Trim() -ne '') -and ([bool]"$(git log -1 --format=%H -- $UpOptReport)".Trim()) }   # committed: a staged file has no commit
function Test-R19Gate([string]$Name) {
  if ($Name -eq 'r19-up-opt' -and -not (Test-R19UpOptReport)) { Say9 "ROW R19-UP-OPT NOT RUN $([char]0x2014) the UP-OPT investigator's report is absent or not committed (Open item 14)"; return $false }
  if ($Name -eq 'root-add' -and $global:R19RootAdded) { return $false }
  if ($Name -eq 'r19-con-file' -and $global:S16Toggle -ne 'on') { Say9 "ROW R19-CON-FILE NOT RUN $([char]0x2014) waits for G11-3"; return $false }
  $true
}
function Invoke-R19Closer {
  $s0 = $global:S16Stops
  $ok = (@(Invoke-S12CloserProbe)[-1] -eq $true)
  if ($global:S16Stops -gt $s0) { Stop-R19 'dialog-left-open' 'CLOSERPROBE: a native dialog was left open' }
  $global:R19HumanClick = $ok   # false = opened=no: the human-style rows are NOT MEASURED, never a STOP dialog-not-opened
}

# ---- the sequencer -----------------------------------------------------------------------------------------------------------------------------
function Invoke-R19Block([string]$Name) {
  $env:S9_RAW = $Framing; Say9 "BLOCK $Name start"
  Set-R19Raw $Name
  $s0 = $global:S16Stops
  if ($global:R19Blocks.ContainsKey($Name)) { & $global:R19Blocks[$Name]; if ($Name -eq 'r19-up-opt') { $global:R19RootAdded = $true } }
  elseif ($R19Silent -contains $Name) { }
  elseif ($R19Probes -contains $Name) { Say9 "CHECK $Name NOT RUN $([char]0x2014) no driver built (S7-helpers-d DONE-PARTIAL)" }
  else { Say9 "ROW $(Get-R19RowId $Name) NOT RUN $([char]0x2014) no driver built (S7-helpers-d DONE-PARTIAL)" }
  if ($global:S16Stops -gt $s0) { throw "block $Name printed a STOP" }
  $env:S9_RAW = $Framing; Say9 "BLOCK $Name done"
  Save-S16
}
# Returns the exit code: 0 done, 2 STOP (after the restore and the RETURN line).
function Invoke-R19Slice([string]$Block) {
  $global:R19Slice = $Block; $slot = $Block; $global:R19Pending = [ordered]@{}; $global:R19StopSeq = 0; $global:R19Reason = ''; $global:R19Segs = @(); $global:R19SegNext = 1; $global:R19SegLost = $false; $global:R19Rerun = 0; $global:R19RootAdded = $false
  try {
    foreach ($slot in (Get-R19Order $Block)) {
      if (-not (Test-R19Gate $slot)) { continue }
      Invoke-R19Block $slot
    }
    Say9 "SLICE $Block done: calls with a failed check $($global:S16Fail), not measured $($global:S16NM) (the rows are in the record)"
    return 0
  } catch {
    return (Stop-R19Wave "an exception in block $slot ($(Get-S11bStopCause $_))")
  }
}
# The whole run: a record that already holds text, or a previous wave's globals, refuse it before anything is loaded or done.
function Invoke-R19Main([string]$Block) {
  $env:S9_RAW = $Framing
  if ($Block -ne 'teardown' -and @(Get-R19RecordLines | Where-Object { $_.Trim() }).Count) { Stop9 'the record file already holds text; give this attempt its own -Att'; return 2 }
  if ($Block -ne 'teardown' -and (Test-Path -LiteralPath $GlobalsFile)) { Stop9 'a previous wave''s globals exist; run -Block teardown first'; return 2 }
  Load-S16
  [int](@(Invoke-R19Slice $Block)[-1])
}

# ---- the blocks with load-bearing logic --------------------------------------------------------------------------------------------------------
function Invoke-R19Restore {
  Invoke-R19RowBlock 'R19-RESTORE' {
    if (Test-S11Own $global:O) { Close-S11Window $global:O; $global:O = 0 }
    Invoke-R19Stamped $R17Blocks['rd-restore']
    if ($global:R19Slice -in 'liveA19', 'liveB19' -and (Get-Command Close-R19Bc -ErrorAction Ignore)) { try { Close-R19Bc } catch { Say9 'CHECK R19-BANNER-CTL bc-tab=close-failed' } }   # after the safety restore: a tidy-up never skips it (S7-drivers-A)
    if ($global:R19Slice -in 'liveA19', 'liveB19', 'liveC19', 'liveD19', 'liveE19' -and (Get-Command Write-R19Dialogs -ErrorAction Ignore)) { Write-R19Dialogs }   # form (30): the slice's native-dialog, DevTools and wave-window counts (S7-drivers-C; liveA19 and liveB19 too, #363; liveD19 and liveE19 too, #364)
  }
}
function Invoke-R19Logs {
  $sl = $global:R19Slice
  Save-R19Seg 'end'
  $all = Join-Path $env:S11_OUT "console-$sl-all.txt"; $df = Join-Path $env:S11_OUT "daemon-slice-$sl.txt"
  [IO.File]::WriteAllText($all, ((@($global:R19Segs | ForEach-Object { [IO.File]::ReadAllText($_) })) -join "`n"))
  Say9 "CONSOLE $sl segments=$(@($global:R19Segs).Count) capture=$(@($global:R19Segs | ForEach-Object { Split-Path -Leaf $_ }) -join ',') texts=$(@(Get-Content -LiteralPath $all).Count) control-disarmed=$(([regex]::Matches(([IO.File]::ReadAllText($all)), 'safety: disarmed by the user')).Count)"
  [void](Invoke-R19Node 's11b' @('clean-console', '--file', $all))
  [IO.File]::WriteAllLines($df, [string[]]@(Get-Content -LiteralPath $DaemonLog -Encoding UTF8 | Select-Object -Skip $global:S16Mark))
  $codes = @([int](Invoke-R19Node 's11b' @('scan18', '--what', 'console', '--file', $all)))
  $codes += [int](Invoke-R19Node 's11b' @('scan18', '--what', 'daemon', '--file', $df))
  $codes += [int](Invoke-R19Node 's12-r19' @('daemonlog', '--slice', $sl, '--file', $df))
  $af = Join-Path $env:S11_OUT "actors-$sl.jsonl"
  if (Test-Path -LiteralPath $af) { $codes += [int](Invoke-R19Node 's12-r19' @('scan-actors', '--slice', $sl, '--file', $af)) } else { Say9 'R19-LOGS actors: no actor results file in this slice; nothing to scan' }
  $v = if ($global:R19SegLost -or $codes -contains 3) { 'NOT MEASURED' } elseif (@($codes | Where-Object { $_ -ne 0 }).Count) { 'FAIL' } else { 'PASS' }
  # #351 (4) (b): the rows with a console clause are judged BEFORE R19-LOGS prints its own ROW
  foreach ($id in @($global:R19Pending.Keys)) { Write-R19RowLine $id $(if ($v -eq 'PASS') { $global:R19Pending[$id] } elseif ($v -eq 'FAIL') { 'FAIL' } else { 'NOT MEASURED' }) }
  $global:R19Pending = [ordered]@{}
  Write-R19RowLine 'R19-LOGS' $v
  $rf = Join-Path $env:S11_OUT "rows19-$sl.txt"; [IO.File]::WriteAllLines($rf, [string[]]@(Get-R19RecordLines))
  [void](Invoke-R19Node 's12-r19' @('rows19', '--from', $rf))
  if ($codes[0] -eq 2 -or $codes[1] -eq 2 -or $codes[2] -eq 2) { Stop-R19 'text-leak' 'R19-LOGS: a token, sentinel, profile path or non-fixture URL count is above 0 in the console or daemon stream' }
}
