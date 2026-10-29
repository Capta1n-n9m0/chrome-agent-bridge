# S5-liveA20 fix round 3 (the last) - fixer report

Scope: `recipes/s13-r20.ps1` and `recipes/test/s13-r20-ps.test.ts` only. No live block, no Chrome, daemon or port.

## Item 1 - fresh load of O before the NOTEA-b change and its restores

Change: `recipes/s13-r20.ps1:187-198`. New helper `Invoke-R20OptionsStep($Row, $Op)` runs
`Read-S11Stored (Use-S16Options)` and then `$Op`. `Invoke-R20NoteaB` now wraps the three places that touch the box:
the step's change (`Set-R19BlockAdd 's12blk.localhost'`), the step's undo (`Restore-R19Block`) and the `-Restore`
block (`Restore-R19Block`). The step texts, expected text, STOP rule, pass rule and the actor argument are unchanged.

Checked `Read-S11Stored` (`s11-win.ps1:167-176`): it asserts O is the wave's own window, goes to `about:blank`, waits
for the old page to go, types the options URL, waits for the options URL, then `Read-S11State`, which only reads
(UIA reads of the toggles and boxes) and prints one `STATE armed=... evaluate=... blocklist lines=N ... uploadfolders
lines=N ...` line (counts, the empty-text hash only). No URL, no text, no state change (`Get-S9Options` is the reader that
threw in attempt 2; here it runs on a freshly loaded page). It is the same call `Set-S11Flag` and `Set-S11BoxVerified`
make after their saves, so the record already carries those lines for every other state step.

Timing note: the extra load takes about 2.5 s (att 2 record, 17:01:34-17:01:36 for one read). The change step runs after
`READY seen for R20-CON-NOTEA-block`, so the actor waits for the `pressed` signal a little longer; the other state steps
(ARGS-3) already take the same time between ready and pressed.

Other callers checked, no change made:
- ARGS-3 (`Set-R19JsOff` / `Restore-R19Js`): ran green in att 2 (17:01:04-17:01:09). No toolbar press lies between O's
  last fresh load and it, and `Set-S11Flag` reads a fresh page after the switch for the read-back. Its restore comes
  after that read-back. Left as is.
- R20-RESTORE (`Invoke-R20Restore`, `s13-r20.ps1:~216`): it closes O if it is the wave's own and sets `$global:O = 0`;
  `rd-restore` then runs `Restore-S11Safety (Use-S16Options)`, which opens a new options window. So it never reads a stale
  document, whatever ARGS-OLD's reloads or the toolbar rows did. The STOP path (`Restore-R19State` in `s13-r20.ps1:24`)
  also calls `Use-S16Options` and `Set-S9Foreground` first and was green in att 2 (17:01:35-17:01:37: restored=yes,
  readback=equal). No change.
- CON-4 / CON-FLOOR: toolbar only, never touch O.

## Item 2 - diagnostic

In the same helper (`s13-r20.ps1:189-196`): if the failure message matches `is not on this extension's options page`,
it prints `CHECK <row> options-window url-class=<class>` using `Get-S12UrlClass` (`s12-win.ps1:181`, the formatter behind
the `now shows url-class=` lines; returns one of about-blank, fixture, chrome-extensions, own-page, other), on the URL
read from `Get-S9DocUrl $global:O`, then rethrows. The URL itself is never printed. If the formatter is not loaded it
prints `url-class=unknown`. Because the helper wraps the fresh load too, a stale read in the load itself is covered. Note
this only helps if Read-S11Stored's own wait loops pass; they throw their own messages (`the window did not reach the
options page`), which are not matched and rethrow unchanged.

## Item 3 - the orphan `node ... s13-r20-a2.ts con-notea-b`

Not fixed; the cause is not proven, and the code involved is outside R20's lane.
- Start: `Invoke-R19Row` (`s12-r19-a.ps1:43`) -> `Invoke-R19Node` (`s12-r19-lib.ps1:57`) -> `Invoke-R17Node`
  (`s11b-r17.ps1:114-143`): `Start-Process node --import tsx recipes\<actor>.ts ...` (line 121), then `Set-S16Pid 'node'`
  (123).
- Stop on a driver throw: line 125 catches the throw into `$tag`, line 126 calls `Stop-S16Pid 'node'`
  (`s11b-r17.ps1:~90-96`), which ran `taskkill /F /PID <id>` and printed `stopped own process node` (record 17:01:31.576,
  the `READY seen for R20-CON-NOTEA-block` at 17:01:31.295 shows the throw came from the change step).
- Why it can survive: (a) `Stop-S16Pid` prints `stopped own process` right after `taskkill ... | Out-Null`, without
  checking taskkill's exit code, so that line proves the command was issued, not that the process ended; (b) it
  uses `/F` without `/T` for any name not `srv*` (line 88 comment: a node process may have spawned the daemon, so it
  dies alone), so any child of the actor outlives it; (c) `Stop-S16All` in `Stop-R19Wave` only knows names still in
  `S16Pids`, and line 133 removes `node` from it after the first kill. At the check time (21:06 local, after the runner) the only
  node processes left are the daemon and an unrelated old one; the orphan is gone (the runner killed it), so
  which of (a)/(b) applied cannot be reproduced offline. The files are `s11b-r17.ps1` and `s12-r19-lib.ps1`; both are
  outside the lane and untouched. A fix would be in `Stop-S16Pid` (check `taskkill`'s exit code or the process
  state and print `could not stop` otherwise) - for the step agent to rule on.

## Tests

Added to `recipes/test/s13-r20-ps.test.ts` (end of file, 3 source-level tests, run against `S13_R20_PS1` or the repo copy):
the helper loads O via `Read-S11Stored (Use-S16Options)` before running `$Op`; it prints the url-class (formatter
`Get-S12UrlClass $r20u`, source `Get-S9DocUrl $global:O`, no URL printed) and rethrows; the change, undo and `-Restore`
blocks of `Invoke-R20NoteaB` all go through the helper.

- Red: HEAD's `s13-r20.ps1` copied to `$TEMP` via `git show HEAD:recipes/s13-r20.ps1`; 3 failed, 36 skipped.
  Saved to `docs/plans/2026-10-29-step13-phase-f-followups-steps/S5-liveA20-fixer3-red.txt` (home path redacted to `<home>`).
- Green: `recipes/test/s13-r20-ps.test.ts` 39 passed.
- `npm test`: 5804 -> 5807 passed, 243 files (before = the figure after round 2).
- Eight recipes tsconfigs and the `-Block plan` run: see the final lines below.
- All eight recipes tsconfigs exit 0; `-Block plan` (S11_OUT fresh $TEMP/bridge-e2e/s20-fix3-plan) exit 0, read directly.
