# S1 prep fixer, round 1 — report (Step 10, stage S1, Run 14 prep)

Fixer: Opus 5.5, level 2, 2026-10-25, working tree at `b016712` plus the prep builder's uncommitted work. I applied
the step agent's rulings (`briefs/S1-prep-fixer1.md`) on `S1-prep-verifier.md` F1–F8 and N1–N5. No agent was spawned
and nothing was committed. Nothing has been measured yet, so every rule below was set before any measurement. For each
changed pure rule I wrote the failing test first: 9 tests went red before the code changed, then all passed.

## Findings → changes

| # | What changed | Where | Test |
|---|---|---|---|
| F1 | `B-type` now stores the background PID: `$global:S14Pids['r14type'] = $p.Id`. The key is removed after a normal exit. New `Stop-S14Background` stops that process on any stop. It is identified by its command line, which must name `recipes/s9.ts` and `r14-type`, so a reused PID is never touched. It stops the whole process tree, children first, each PID through `Test-SafeToKill`. `Invoke-S14Stop` calls it **before** `Restore-S9All`, and the 150 s timeout reaches it the same way. I checked every other process the blocks start. The servers and the daemon are already stopped by `Stop-S14Processes`. Every other `s9.ts`/node call runs in the foreground. So `r14-type` is the only background process. The sheet's "PIDs to track" now says so. | `recipes/s9-r14.ps1:128-151` (`Stop-S14Background`), `:170-173` (`Invoke-S14Stop`), `:346-352` (`B-type`); sheet "PIDs and handles to track" | `prep fixer r1 (F1)` (source order: `Stop-S14Background` before `Restore-S9All`; the PID stored) |
| F2 | New rule `consoleVerdictS16`, which applies S1.6 as written: the token, a non-fixture `://`, `localhost:8081`, `:8083` and `bank.example` must all count 0, whoever wrote the line. The positive control is unchanged: a capture without it is NOT MEASURED. Run 13's `consoleVerdict` stays as it was. `scan-file --mode console-s16` prints `CHECK R14-LOGS scan-console …`. `B-logs` counts both halves first. If either has a non-zero count, it then prints `STOP: block logs: R14-LOGS FAILS: …`, the stop procedure restores, and the FAIL is recorded. The text of the row matches the code. | `recipes/s9-rules.ts:540-555`; `recipes/s9.ts:1079-1105`; `recipes/s9-r14.ps1:390-408`; §4.21 R14-LOGS | `consoleVerdictS16 (prep fixer r1, F2)`: a Chrome-owned `localhost:8081` line passes Run 13's rule and fails S1.6's |
| F3 | `B-safe0` reads the `ROW SAFE-0 safety …` tuple before any reload. If the tuple was reported and is not `$S14Default` (`safety armed=true evaluate=true blockedCount=0`), it prints `STOP: block safe0: found-state guard: SAFE-0 read '<tuple>', not '<default>' - no reload; …`. A reload happens only when the tuple is the expected one (or not reported) and SAFE-0 still fails. `S9` keeps its output in `$global:S9Out`. I check the tuple whatever SAFE-0's exit code, so a non-empty list with SAFE-0 passing also stops here. It would have stopped at block 6 anyway. | `recipes/s9-r14.ps1:73-74, 91, 266-280`; §4.21 SAFE-0; sheet block 5; runner brief | `prep fixer r1 (F3)`: `$S14Default` equals `safetyTupleLine(default)`; the guard comes before `reload-extension.ps1` |
| F4 | `classStepVerdict` now returns `notMeasured`. `not listed` and `hidden=disarmed` give NOT MEASURED. `hidden=blocked` passes and says why: "an own page whose URL the extension withholds". Any other `hidden=` value fails. A URL in any line is still a FAIL first. `navigate-class` prints `CHECK R14-REL-3 rel-class NOT MEASURED — …`. | `recipes/s9-rules.ts:686-710`; `recipes/s9.ts:627-637`; §4.21 R14-REL-3 | `classStepVerdict (prep fixer r1, F4)` |
| F5 | `placementVerdict` now judges `occluders`. A count above 0 fails: "N window(s) above O overlap it (O is covered)". A missing or negative count fails: "occluders not measured". `placementLine` no longer says "(record)". The exact rule is in `S9Geo.Occluders` and in the row. It walks `GW_HWNDPREV` to the top of the z-order. It counts a window that is visible, not minimized, not DWM-cloaked and not see-through, and whose rect is non-empty and overlaps O's with a positive area. See-through means a layered window that is either click-through (`WS_EX_LAYERED`+`WS_EX_TRANSPARENT`) or fully transparent (`LWA_ALPHA` with alpha 0). Both guard messages begin `R14-3 placement guard`, so a hit prints `STOP: block r3: R14-3 placement guard …` before the toolbar click. | `recipes/s9-rules.ts:740-790`; `recipes/s9-win.ps1:101-136` (C#), `:852-853`; `recipes/s9-r14.ps1:320, 327`; `recipes/s9.ts:1038-1039`; §4.21 R14-3 | `prep fixer r1 (F5)` + the updated placement tests |
| F6 | New rule `r14TypeVerdict(o, typed, n, pressed, replied)`. A press at or before the reply, with a reply of `ok` or k = n, is a **FAIL** ("…the call still finished"). A press after the reply is NOT DISCRIMINATING. `DISARMED` with k = 0 is NOT DISCRIMINATING too: the press came before the first character. A missing press time, an unreadable k or any other reply is a FAIL. `cmdR14Type` uses this rule. §4.20's `typeVerdict` is unchanged. | `recipes/s9-rules.ts:797-834`; `recipes/s9.ts:946-950`; §4.21 R14-4b | `r14TypeVerdict (prep fixer r1, F6)` |
| F7/F8 | The count may be printed; the daemon logs it by design (#132). The sha256 of a non-empty list is never printed. `Restore-S9Safety` compares the hashes itself and prints only `… block-list sha256 vs found equal\|DIFFERENT`. A `DIFFERENT` makes the restore fail. The empty text's sha256 may still be printed. The record template's "Lines" now begin with L1 = SAFE-0 as the first recorded line. The pre-flight lines of blocks 1–4 go to `S1.ledger.md` ("Found state" / "Live PIDs"). The sheet and the runner brief both say this. | `recipes/s9-win.ps1:940-946`; sheet (§0, "Never printed", record template); runner brief ("Found-state guard", "Record"); §4.21 note, R14-FOUND, R14-RESTORE | the restore line is PowerShell glue; checked by reading (no Chrome) |
| N1 | `cleanup` now accounts for every opened tab with two lines: `cleanup: <c> of <n> opened tabs closed, <g> already gone, <l> still listed` and `cleanup: still listed <key=T#…\|none>`. In `B-teardown`, if r3 is still listed, new `Close-S9OtherTab W 'S9 W human tab'` closes it. It closes the one tab in W's strip that is not W's own, prints no title, and throws if it finds anything other than exactly one such tab. `cleanup` then runs again and must print `none`. Any tab other than r3 still listed is a STOP. | `recipes/s9.ts:1124-1144`; `recipes/s9-win.ps1:803-817`; `recipes/s9-r14.ps1:410-425`; §4.21 R14-TEARDOWN; sheet block 15 | PowerShell glue. The regexes were dry-run on sample lines. The UIA close is **untested live**, because Run 13 never closed r3 this way. |
| N2 | `Set-S9BlockList -FromFile` prints the sha256 only when the list is empty. Otherwise it prints `withheld(non-empty)`. The wave's own `-Lines` still print their hash, as R14-5c's expected text requires: `localhost:8081`, a test pattern and not the user's. | `recipes/s9-win.ps1:701-706` | `prep fixer r1 (N2)` |
| N3 | An unknown `s9.ts` command prints `STOP: s9.ts: unknown command "<x>" …` and exits 2. `--help` still exits 0. | `recipes/s9.ts:1193-1203` | run: `s9.ts bogus` → the STOP line, exit 2; `--help` → 0 |
| N4, N5 | No change. Both are listed as known limits: N4 in the R14-4b row and the sheet, N5 in the sheet. | §4.21 R14-4b; sheet "Known limits" | — |

STOP RULE: the md5 of the sentence is `9f3f7bfb…` in the sheet, the runner brief and §4.21, the same value the verifier
found. I did not touch the runner brief's verbatim sections. §4.20 is untouched: `git diff f45e3bf --
docs/e2e-test-plan.md` shows 73 lines added and 0 removed.

## Checks (2026-10-25)

- `npx tsc --noEmit -p recipes/tsconfig.s9.json` → 0. `npm run typecheck` → 0.
- `npm test` → **2751 passed, 116 files**, up from 2744 / 116. The +7 are all in `recipes/test/s9-rules.test.ts`
  (59 → 66 tests): F1, F2, F3, F4, F5, F6 and N2, one each. The old `placementLine` test was rewritten in place, not
  removed. Before the code changed, 9 tests were red.
- `npm run build` → 0. The dist sha256s are unchanged (`99bb55c5…`, `5a2888f7…`, `bcb20e28…`, `a8beec6c…`, `f8b52058…`,
  the same as `$Dist`). `git status --short` shows no tracked change from the build.
- PowerShell: both `.ps1` files parse with 0 errors. `S9Geo` with the new P/Invokes compiles, and `Occluders` ran
  read-only on the console window. The SAFE-0 tuple regex and the `cleanup: still listed` regex were dry-run on sample
  lines.
- `s9-r14.ps1` is still ASCII; the existing test checks this.
- Stop-procedure dry run, with no Chrome window and no daemon: a dummy node whose command line names `recipes/s9.ts
  r14-type` was tracked as `r14type`. `-Block stop` ended it through `Test-SafeToKill`, before `RESTORE begins`, and
  exited 2.

## Deviation (say this to the step agent): one dry run reached the real extension

My first stop-procedure dry run was a mistake. A scratch `S9_OUT` had a hand-written `S14Done` list running up to
`r3`, so `-Block type` really ran. This is what happened:

- `s9.ts r14-type` spawned a daemon (PID 9052, at 21:01:20Z). The real extension connected to it. `daemon.log` shows
  `safety state: armed=true evaluate=true blocked=0` and `extension resync: 1 tabs, 0 gone`.
- `r14-type` then stopped itself at set-up, before any tab call: `STOP: … no …\state.json — run s9.ts setup first`.
- The driver waited 120 s for READY. It then ran the stop procedure:
  - the tracked PID was already gone;
  - "RESTORE safety: nothing to restore";
  - no window was touched;
  - the daemon was ended by `daemon.shutdown`, logged as `exit 0 (shutdown 4002)`.

So there was no tab call, no UI action and no change to the safety state. Only the extension's hello and its resync
reached Chrome. Afterwards no bridge daemon was running, the only node process was 22152, and 9234 showed only
TIME_WAIT. I deleted the scratch directories.

The run also exposed a gap. When `r14-type` prints a STOP before READY, the driver still waits its full 120 s and only
then stops. Only time is lost. I wrote it into the sheet's "Known limits" and did not change it.

## Interpretations for the step agent (made before any measurement; stricter or neutral)

1. **F6 with k = 0:** `DISARMED` with k = 0 after a press at or before the reply is NOT DISCRIMINATING, not a FAIL.
   The ruling's "only" names the press-after-reply case. But a refusal before the first character is correct
   behaviour, and §4.21 already pre-registered a re-run for k = 0. A non-`DISARMED` reply at k = 0 stays a FAIL.
2. **F6 with no press time or unreadable k:** this is a FAIL, never NOT DISCRIMINATING. In practice the driver throws
   (a STOP) before that can happen.
3. **F2 STOP timing:** both halves are counted before the STOP, so the daemon-log count is recorded even when the
   console fails.
4. **F3:** the guard applies whatever SAFE-0's exit code is. A passing SAFE-0 with blocked sites also stops at
   block 5, not block 6.
5. **N2:** only `-FromFile` withholds the hash. The wave's own `-Lines` keep it, because R14-5c's text has
   `sha256 14ceab87…`.

## Commit list (the S1 prep commit)

`docs/e2e-test-plan.md`, `recipes/s9-redirect.py`, `recipes/s9-rules.ts`, `recipes/s9-win.ps1`, `recipes/s9.ts`,
`recipes/s9-r14.ps1`, `recipes/test/s9-rules.test.ts`,
`docs/plans/2026-10-24-step10-step8-follow-ups-steps/S1-wave-sheet.md`,
`docs/plans/2026-10-24-step10-step8-follow-ups-steps/briefs/S1-runner.md`,
`docs/plans/2026-10-24-step10-step8-follow-ups-steps/S1-prep-builder.md`,
`docs/plans/2026-10-24-step10-step8-follow-ups-steps/S1-prep-verifier.md`,
`docs/plans/2026-10-24-step10-step8-follow-ups-steps/S1-prep-fixer1.md`. The step agent's own files, to commit at its
discretion: `briefs/common.md`, `journal.md`, `S1.ledger.md`, `briefs/S1-prep-builder.md`,
`briefs/S1-prep-verifier.md`, `briefs/S1-prep-fixer1.md`, `briefs/S1-verbatim.md`.
