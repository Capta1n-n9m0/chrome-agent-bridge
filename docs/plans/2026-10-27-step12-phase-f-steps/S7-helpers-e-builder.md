# S7-helpers-e builder report

Model: Claude Sonnet 5.5, medium effort. Nothing ran live (no Chrome, daemon or port 9234). Nothing committed.

## 1. Verdict
DONE.

## 2. Outputs
- Files changed: `recipes/s12-win.ps1` (+12/-2), `recipes/s12-r19-b.ps1` (1 line), `recipes/s12-r19.ps1` (1 line),
  `recipes/s12-r19-lib.ps1` (1 line), `recipes/test/s12-r19-c.test.ts` (+8/-1), `recipes/test/s12-r19-static.test.ts` (+2/-1);
  new: `recipes/test/s12-helpers-e.test.ts` (121 lines).
- Size (`git diff --numstat` + `wc -l`): code about 15 new lines (cap 150); tests about 131 new lines (cap 300).
- Counts: `npm test` before 230 files / 5506 tests; after 231 files / **5519 passed**. `npm run typecheck` exit 0.
  `npx tsc --noEmit -p` on `recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json`: all seven exit 0.
- Red before the change: the new tests of items 1 and 2 ran against the unchanged tree and failed (5 of 12 in `s12-helpers-e.test.ts`:
  four UP-OPT tests, because `Invoke-S19Opt` did not exist, and the R19-RESTORE call test; the line pin at `s12-r19-c.test.ts` failed
  once the new text was pinned). The A/B `Write-R19Dialogs` checks passed at once: the function already matched the #363 readings.
  Item 3: each of M1a2, M1b2, M1c2 applied to `recipes/s12-r19-c.ts` turns the new test red (1 failed each); the file was restored
  (`git diff --stat recipes/s12-r19-c.ts` empty).

### (1) UP-OPT
- `Invoke-S19Opt` is a third patched copy, made at load in `recipes/s12-win.ps1` from `Invoke-S12Opt` with `$S19OptPairs`
  (same `Get-S12PatchedFunction`, each regex must match once). After the save it takes `$o2T0 = Get-S12NowMs`, calls
  `Set-S9Foreground $O2`, then `Wait-S12O2 $O2 $setSha $o2T0`; `Wait-S12O2` got an optional `-T0` (default 0 = now, so Run 18 is unchanged).
  The conflict read is preceded by a second `Set-S9Foreground $O2`. Prints: `OPT O2 shown=… at=… polled-ms=…` intact, then the new line
  `OPT O2 front after-save=<yes|no> before-conflict-read=<yes|no>`, then `FIX R19-UP-OPT: …` once. A failed foreground records `no` and does not throw.
- `s12-r19-b.ps1:74` calls `Invoke-S19Opt`; `s12-r19.ps1:69` also checks it exists (STOP before any row otherwise).
- Test (stubbed clock, 400 ms foreground): order `SAVE,FG,READ…,FG,CONFLICT`; `at=1000 polled-ms=1000` (the foreground time is counted from the save).
- Affected callers: only Run 19 (liveB19's UP-OPT). Run 16 (`s11-r16.ps1:291`), Run 17 (`s11b-r17.ps1:693`) and Run 18 (`s12-r18-lib.ps1:226`)
  are unchanged, and `Invoke-S11Opt`'s text in `s11-win.ps1` is untouched; a test runs both and finds no foreground call, no FIX, no front line.
  The existing static tests (`s11-win-static`, `s11b-h8-static`, `s12-helpers-b`, `s12-r18-static`, `s12-forms`) pass unchanged.
  `s12-r19-static.test.ts:188` now also whitelists `Invoke-S19Opt` as load-made (and pins its name in `s12-win.ps1`).

### (2) DIALOGS in liveA19 and liveB19
- `s12-r19-lib.ps1:219`: the slice test is now `-in 'liveA19','liveB19','liveC19'`. `Write-R19Dialogs` itself needed no change, checked by tests for both slices:
  the capture window (`$global:D`) is not counted in `devtools`; native > 0 and devtools > 0 STOP (the line is printed first); `wave-windows-open` is printed, never judged.
- Windows per slice: liveA19 opens no window X (`$global:R19Xk` stays 0, set in `s12-r19-b.ps1:7`); liveB19 uses `$global:R19Xk`, as liveC19 does, and
  `Get-R19DlgWindows` (W and `R19Xk`) covers both. The Bc tab of BANNER-CTL is an actor tab, not a window.
- `s12-r19-c.test.ts:455` now pins the three-slice form.

### (3) MINOR-1
- New test in `s12-r19-c.test.ts` (after the "uses its WANT" test): the arguments of every `judgeChoose(` (7 sites) and `wantOf(` (8 sites) call, read by
  paren matching, are compared with the exact allowed lists, plus REFUSE's `message` coming from `REFUSE_LEGS`. Source text, not behaviour: the row functions need a live `Ctx`.
- No anchor line of the mutant tests was edited, so no anchor was changed (NIT-1).

## 3. Deviations
- Item 3 is a source-text pin (exact arguments), not a behavioural test (the rows take a live SDK context). It catches a spread followed by another key and any replaced argument.
- The new tests are in a new file `s12-helpers-e.test.ts`; only the line-455 pin and the item 3 test are in `s12-r19-c.test.ts`.

## 4. Proposed decisions
### 2026-10-29 · Run 19's UP-OPT fix is a third patched copy, Invoke-S19Opt
**Decided:** `Invoke-S19Opt` (made at load from `Invoke-S12Opt`) carries the fix; Runs 16, 17, 18 keep their functions. **Why:** earlier waves' helpers stay as measured.
**Instead of:** a switch in `Invoke-S12Opt`. **Revisit if:** Run 18 is ever re-run with the fix. **By:** Claude (proposed)

## 5. Findings
- `wave-windows-open` counts `$global:R19Xk` and `$global:O` only; the wave's own window `$global:W` is open at R19-RESTORE and is not counted, in liveC19 either. Left as is (record only).
- `Invoke-R19Restore` runs `Write-R19Dialogs` after `$global:O` is closed, so `O` is always 0 there; the count is effectively X only.
- liveD19 and liveE19 do not call `Write-R19Dialogs` (outside this brief; the sheet lists `DIALOGS` for every slice, S7-drivers-DE).
- The CRLF warnings on `git diff` are the repo's autocrlf, not a change.

## 6. Handoff
Nothing running. The tree holds uncommitted changes in the files above for a verifier and committer.
