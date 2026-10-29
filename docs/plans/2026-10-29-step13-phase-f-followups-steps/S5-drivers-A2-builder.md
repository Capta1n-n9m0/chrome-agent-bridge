# S5-drivers-A2 builder (the rest of the liveA20 driver)

Model and effort: Claude Sonnet 5.5, medium.

## 1. Verdict
**DONE.** All four carried findings fixed with tests, all slice-A rows have a code path, every STOP A2 adds reaches a RETURN. Nothing was run live (no Chrome, no daemon, no reload).

## 2. Outputs
- New: `recipes/s13-r20-a2.ts` (171), `recipes/s13-r20-a.ps1` (58, the entry script), `recipes/test/s13-r20-a2.test.ts` (92).
- Changed: `recipes/s13-r20-a.ts`, `recipes/s13-r20.ts`, `recipes/s13-r20.ps1`, tests `s13-r20-a.test.ts`, `s13-r20.test.ts`, `s13-r20-ps.test.ts`, `recipes/tsconfig.s13.json`, `recipes/tsconfig.s6.json` (include/exclude of the new files). No `recipes/s12-*` or `s13-forms.ts` file touched (`s12-r19-c.ps1` is now dot-sourced, read-only).
- Size: `git diff --stat` 209 insertions + 321 new lines = about 530 (cap 600).
- Tests: before 242 files / 5,772 passed (measured with `npm test` at the start); after 243 files / 5,793 passed (+21, none removed; `S5-drivers-A2-builder-npmtest.txt`). `npm run typecheck` exit 0, `npm run build` exit 0, eight `recipes/tsconfig*.json` exit 0 (`-tsc.txt`). `git status --short` after the build: only the lane files and the evidence files.
- Red proofs without touching the main tree (#395): the PowerShell tests ran against a scratch copy of the pre-A2 `s13-r20.ps1` (the test's `S13_R20_REPO` override): 9 of 26 fail (`-red-ps.txt`: order, held CHECK lines, `go`-only click, carry, RESTORE, LOGS, ARGS-OLD; two A1 fallback tests also fail there only because the scratch dir has no `extension/manifest.json`). The TS finding fixes: HEAD has no `grantTiming`, `scanExit20` or `preClick`, and its clamp turns a grant 500 ms before the click into `inMs=0` (`-red-ts.txt`). No scratch worktree or `npm ci` was needed.

## 3. The four carried findings
1. `grantTiming(grants, t0)` (pure, exported, `PRE_CLICK_TOL_MS = 20`): a first grant earlier than `t0 - 20` is `preClick`, `inMs` null; `judgePop` does not count it, so the leg is NOT DISCRIMINATING, and the leg prints `CHECK <row> <leg> grant-before-click=yes`. Chosen because a pre-click grant is not this round's evidence, and not counting it can never produce a false pass. Tests: `grantTiming`, pre-click round in `judgePop`.
2. R20-0: `Out-R20Held` prints LOADED20 then the held proof CHECK lines, after MANIFEST (also before a STOP). Test `zeroOrder`, `zeroOrderStop`.
3. `third`: I did not open W2 (no SDK, MCP or daemon call opens a tab in a chosen window; matching a W2 tab by URL is not cheap or testable). `B_WINDOW_CHECK` = `CHECK R20-POP-OTHER third b-window=W (sheet: W2)` is printed before the leg; a static test pins its place.
4. `Invoke-R20PopClick` clicks only on ready content `go` (default `go`). Tests `clickEmpty`, `clickOther` (no UIA call).

## 4. Rows (function and test names)
- R20-CON-DESC: `conDesc`, `descRow`, `listDescriptions` (own MCP client, `tools/list`); test "R20-CON-DESC". Line is a `CHECK … sentence-1=<n> sentence-2=<n> control-tool=<read|missing>` (the sheet gives no form).
- R20-CON-NOTEA: `noteaA` (legs allowed, pre; keeps the `notea` tab open and writes its handle to `r20-notea.handle`) and `noteaB` (legs blocked: claims that tab, pattern added by the PowerShell step list, read, pattern removed, tab closed); `judgeNotea`; `Invoke-R20NoteaA`/`Invoke-R20NoteaB` carry the first two legs into the one ROW (`Complete-R19Row` wrapper, `$global:R20Carry`). Port other than 8081 or `pre` not 2 entries: blocked leg NOT MEASURED with the reason; cut path printed `NOT REACHABLE (S3a not run)`. Tests "R20-CON-NOTEA", `carry`, `noteaNoHandle`.
- R20-CON-CAP: `conCap`, `capRow` (uses `concap20Stats`/`concap20Verdict`/`concap20Line`; controls: SDK count 200, `limit: 3` three lines, no marker). Test "R20-CON-CAP".
- R20-CON-4: `con4`, `judgeCon4Mcp` (the SDK's `DISARMED_ALL_LINE` exact, one line, equal to the snapshot control; the extension's message is a FAIL). Test "R20-CON-4".
- R20-CON-FLOOR: `conFloor`, `judgeFloor20` (preconditions first, NOT MEASURED), `assertWaits` (5 000 / 3 500). Test "R20-CON-FLOOR".
- R20-ARGS-OLD: `argsOld` (reuses `hintSdk`, `judgeOldLeg`, `rawForwarded` from `s12-r19-de.ts`), PowerShell `Invoke-R20OldArgs` inside Run 19's `Invoke-R19Swapped` (its swap/restore frame, scratch worktree with its own `npm ci`, link removal by `cmd /c rmdir`); the old build's own proof prints a LOADED20 line and the row runs only if it reads `args=VERSION|UNKNOWN_METHOD`, else `ROW … NOT RUN`. `Invoke-R20Rerun` now reads the worker and passes the port (the re-run prints `LOADED20 rerun=<k>` with the full values). Tests `oldRowRuns`, `oldRowNotRun`, `oldOk`.
- R20-RESTORE: `Invoke-R20Restore` (R17 `rd-restore`, then A1's `restore-compare` by count and hash, then `Write-R19Dialogs`). Tests `restoreOk`, A1's `restoreCompare20` hash tests.
- R20-LOGS: `Invoke-R20Logs` (console, daemon since the mark, evidence = the record, actors' results; counts only; control line in the last segment else NOT MEASURED; deferred rows settled; `rows20` check). `scanExit20` (sentinel now counts as a leak, as the sheet says; A1's `scan` ignored it). Tests `logsOk`, `logsLeak`, `logsNoControl`, `scanExit20`.
- Entry script `recipes/s13-r20-a.ps1`: `-Block liveA20|plan|teardown [-Att n]`; tests check ASCII, order of dot-sources, calls, and that it parses.

## 5. STOP reasons added and their tests
`text-leak` (`logsLeak`), `old-build-left-loaded` (`oldLeft`), `dialog-left-open` (`dialogLeft`), `devtools-left-open` (`devtoolsLeft`); each asserts STOP then RETURN with the right reason. The A1 STOPs still pass.

## 6. Deviations and proposed decisions
- Finding 3 resolved by the CHECK line, not W2 (the brief allowed it).
- R20-CON-NOTEA is two actor runs (first early, blocked leg later, as the sheet orders them) tied by a tab handle claimed by a second client. Whether the daemon keeps a handle valid after its client disconnects was not measured (nothing live ran); if the claim fails the blocked leg is NOT MEASURED "claim-failed", never a pass.
- `liveA20`'s order has no `teardown` (A1's choice); the runner runs `-Block teardown` after.
- The `SCAN20 actors` lines cover MCP results only (the actors file is written by the MCP wrapper); SDK results are not in it (same as Run 19).
- Proposed decision (design-local): a pre-click grant is not counted (NOT DISCRIMINATING), tolerance 20 ms.
- `recipes/CLAUDE.md` should read "all eight" tsconfigs and mention `s13-r20-a.ps1` (session agent).

## 7. Findings
None new beyond §6. Test-side facts: a top-level `foreach ($w …)` in a PowerShell test script overwrites `$global:W`; test state leaks between `T` blocks (reload stub, `$global:Dlg`), so each test sets what it needs.

## 8. Handoff and "How to run liveA20"
No processes running. Nothing committed.
- **Command** (repo root, Windows PowerShell 5.1, a fresh `S11_OUT` outside the repo): `powershell -NoProfile -ExecutionPolicy Bypass -File recipes/s13-r20-a.ps1 -Block liveA20` (`-Att 2` for a later attempt; `-Block plan` prints the order; `-Block teardown` after the slice or any return).
- **Prerequisites:** §4.28's prologue (clean committed tree at HEAD, `npm run build`, Chrome running with the extension and the pinned toolbar button, JS on and armed as found, port 9234 free or the daemon's, python on PATH; fixture server on 8081 is started by the `servers` block when 8081 is free; CON-NOTEA needs 8081); the worker-console capture window is opened by the `console` block.
- **Expected first two record lines of R20-0:** `MANIFEST …`, then `LOADED20 keys=page nested=page elem=page perm=yes listener=yes enabled=yes args=answered`; in the fallback the CHECK lines follow LOADED20.
- **Where the record lands:** `docs/plans/2026-10-29-step13-phase-f-followups-steps/S13-live-record-liveA20.txt` (`-att<k>`); console segments `console-liveA20-<k>.txt`, actors `actors-liveA20.jsonl` and the scan inputs in `S11_OUT`.
- **STOP returns** (each `STOP <reason>` is followed by `RETURN <n> after-stop=<reason> restored=… readback=…`; the runner returns): `build-not-loaded`, `extension-disabled`, `reload-failed` (R20-0; rebuild/reload, new attempt); `popup-lease-wrong` (POP rows; product defect, escalate); `existing-tool-changed`; `args-ran-js-off` (escalate); `not-restored` (escalate; never retry past it); `old-build-left-loaded` (ARGS-OLD frame; the current build may not be loaded, check before anything else); `dialog-left-open`, `devtools-left-open` (R20-RESTORE; close by hand only with the user); `text-leak` (R20-LOGS; escalate, do not commit the record); `throw-after-state` (helper or environment, restore ran first).
- **Resume:** run `-Block teardown`, fix a helper only between rows (never past a STOP), start a new attempt with `-Att <k+1>` and a fresh `S11_OUT` (at most three per slice). Rows run in the sheet's order; a leg that is NOT MEASURED, NOT DISCRIMINATING or RECORD is recorded and the wave goes on.
