# recipes/s12-r19-de.ps1: the row drivers of Run 19's old-build slices (Step 12 S7-drivers-DE; docs/e2e-test-plan.md section 4.27: R19-ARGS-OLD in liveD19, R19-VERSION in liveE19).
# Windows PowerShell 5.1, ASCII only. NOT run against Chrome by its author. recipes/s12-r19.ps1 dot-sources this file after s12-r19-c.ps1 and registers each driver inside
# Invoke-R19Swapped (s12-r19-lib.ps1), which swaps the old build into extension/dist, reloads it, and in its own finally restores HEAD, reloads and re-proves. The actors are
# recipes/s12-r19-de.ts (node); each row goes through Invoke-R19Row (s12-r19-a.ps1), so a STOP goes through Stop-R19 and the verdict is the worst LEG line. Names carry an R19 prefix.

# R19-ARGS-OLD: the old build's own proof first (a line of its own, not R19-0: `LOADED consoleMessages=UNKNOWN_METHOD ...`). A proof that does not read UNKNOWN_METHOD means the old
# build is not what is loaded, so no `args` call is made on it: the row is NOT RUN, never a pass (4.27).
function Invoke-R19OldArgs {
  [void](Invoke-R19Node 's12-r19' @('proof'))
  $r19l = @(@($global:R17Out) | Where-Object { "$_" -match 'LOADED ' })
  if (-not ($r19l.Count -and "$($r19l[-1])" -match 'consoleMessages=UNKNOWN_METHOD')) { Say9 "ROW R19-ARGS-OLD NOT RUN $Dash old build not loadable (the old build's proof does not read UNKNOWN_METHOD)"; return }
  Invoke-R19Row 'R19-ARGS-OLD' @('args-old') -Actor 's12-r19-de'
}
# R19-VERSION: the control upload (no `chooser`) must reach the page, so the Upload folders hold ROOT first, on the current build and before the swap; R19-RESTORE puts them back.
function Add-R19RootOnce {
  if ($global:R19RootAdded) { return }
  Invoke-R19Stamped $R17Blocks['root-add']
  $global:R19RootAdded = $true
}
function Invoke-R19OldVersion { Invoke-R19Row 'R19-VERSION' @('version') -Actor 's12-r19-de' }
