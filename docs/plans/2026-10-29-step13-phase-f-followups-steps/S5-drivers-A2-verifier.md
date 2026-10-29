# S5-drivers-A2 verifier (the rest of the liveA20 driver)

Model and effort: Claude Opus 5.5, medium. Read and run only; no main-tree file edited. Red proofs and mutants ran in a scratch worktree
outside the repo (`<TEMP>/v-a2-wt`, own `npm ci`, the five `@bridge` junctions removed by PowerShell `cmd /c rmdir` before
`git worktree remove`; main tree's `node_modules/@bridge` and `.bin` intact afterwards). No daemon, Chrome, reload or live run.
Evidence: `S5-drivers-A2-verifier.txt`.

## 1. Verdict

**FAIL**: 2 MAJOR, 5 MINOR, 3 NIT. Every exit check that can be measured offline passes (gates, counts, red, lane). The two MAJOR findings
are in the code that judges rows: one row would be wrongly labelled NOT RUN, and the logs scan skips a step that Run 19 relied on.
Both fixes are small.

## 2. Exit checks (re-derived)

| Check | Result |
|---|---|
| Every slice-A row of §4.28 has a code path printing its form and verdict | Yes: CON-DESC (`CHECK` + `LEG`; the sheet gives no form), CON-NOTEA (`CON … allowed/pre/blocked`, cut path `NOT REACHABLE`), CON-CAP (`CONCAP`), CON-4 (`CONREF`, `MCPLINE`), CON-FLOOR (`CONFLOOR`, waits), ARGS-OLD (`OLD`, `MCPLINE`, `LOADED20` before and `rerun=<k>` after), RESTORE (`RESTORECHECK`, `DIALOGS`), LOGS (`SCAN20`, `CONSOLE`) |
| Every STOP line returns, a test per STOP | Yes: `text-leak` (logsLeak), `old-build-left-loaded` (oldLeft), `dialog-left-open`, `devtools-left-open` (dialogLeft, devtoolsLeft), each `STOP` then `RETURN 1 …`; A1's STOP tests still pass |
| A1's four §6 findings fixed, tests red on pre-A2 code | Yes, proved here (11 failing tests on HEAD code; mutants M1–M4 killed) |
| RESTORE by hash, LOGS by counts, tested | Yes (restoreOk / restoreDiffers / `restoreCompare20`; logsOk / logsLeak / logsNoControl / `scanExit20`) |
| No `recipes/s12-*` or `s13-forms.ts` edit | `git diff 76f4f5e --stat -- recipes/s12-* recipes/s13-forms.ts` is empty |
| `npm test` = 5772 + n, none removed | 243 files, **5793 passed**; s13-r20* files 67 at HEAD → 88 (+21), so HEAD total 5772 |
| typecheck, eight recipes tsconfigs, build | all exit 0 |
| `git status --short` after the build | only the lane's files and the builder's `S5-drivers-A2-builder*` files |
| Size (cap 600) | 209 insertions + 171 + 58 + 92 new lines = **530**; under the cap |
| No home path or user name in code or evidence | grep for the name, the login and a home path over the A2 files and the builder's evidence: none |
| Entry script under Windows PowerShell 5.1 | `-Block plan` exits 0 and prints the sheet's 22 blocks in order; every command the R20 path calls resolves after the entry script's dot-sources (only `Close-R19Xk`/`Open-R19Xk`, liveC19-only, do not) |

## 3. Findings

### 3.1 MAJOR: R20-ARGS-OLD only runs if the old build gives the answer the row is meant to test

`recipes/s13-r20.ps1:183`. `Invoke-R20OldArgs` runs the row only if the old build's own `LOADED20` reads `args=VERSION|UNKNOWN_METHOD`. If
not, it prints `ROW R20-ARGS-OLD NOT RUN — old build not loadable`. But `args=VERSION` is the daemon refusing `args` to an old extension,
which is exactly what the row checks (its SDK legs expect `code=VERSION hint=yes`). Suppose the daemon regresses and forwards `args`. Then
the old build is loaded, the row should FAIL, and instead the record says NOT RUN for a false reason. The sheet (l.1975) names
`perm=no` and `keys=sorted` as the proof that the old build is loaded. It allows NOT RUN only when "the old build cannot be loaded within
one re-run (exit 2 twice)", which `Invoke-R19Swapped` already handles. The extra gate is a pass rule that was changed, not the one
written down (§4.28 preamble). Mutant M15 (gate on `keys=sorted` instead) passes every test, so the tests do not pin this choice.
**Fix:** gate on the sheet's proof (`keys=sorted`, or `perm=no`) and record `args=` as read. Add a test where the proof reads
`keys=sorted … args=answered` and the row still runs.

### 3.2 MAJOR: R20-LOGS scans the console capture without first dropping window-title lines

`recipes/s13-r20.ps1:202–205` (`Invoke-R20Logs`). `Save-S11bConsole` (`recipes/s11b-win.ps1:185`) writes every UIA name in the capture
window, title included. Chrome titles that window `DevTools - <profile>` (#283; `recipes/CLAUDE.md`: "Live runners' console captures drop
window-title lines"). Run 19's `Invoke-R19Logs` runs `s11b clean-console` on the joined capture before scanning it
(`recipes/s12-r19-lib.ps1:243`; `s11b.ts:488` "drops the capture's window-title lines in place (#283)"). A2 scans the raw file with
`s13-r20 scan`. The name pattern includes the login name and the git name. If the profile's display name contains either, the console
stream counts `name>0`, `scanExit20` returns 2, and the wave hits STOP `text-leak` at its last row. The settle step then turns every
deferred CON and ARGS row to FAIL. This contradicts a measured fact that binds live runners. **Fix:** call
`Invoke-R19Node 's11b' @('clean-console', '--file', $r20all)` before the scans, as Run 19 does. Add a test that the console scan's
`NARGS` comes after `clean-console`.

### 3.3 MINOR: a leg the sheet calls RECORD prints the row as PASS

`recipes/s13-r20-a2.ts:51` and `:87`, with `recipes/s12-r19-lib.ps1:38`. CON-NOTEA's `allowed` leg returns `RECORD` when the object's
class name is not `Object`, and `concap20Verdict` returns `RECORD` for `k ≠ 9`. The row aggregator maps `RECORD` to `PASS`, so the row
prints `ROW R20-CON-NOTEA PASS`. The pass clause "the object entry's text is `Object`" did not hold, and the sheet says the result is
RECORD. The `LEG … RECORD` line stays in the record, so nothing is hidden. Even so, the ROW line should say RECORD (the
`$global:R19RecordRows` mechanism in `Complete-R19Row`, or a RECORD LEG ranking above PASS for these ids). The sheet also wants CAP's
RECORD "with the line length", which no line prints.

### 3.4 MINOR: the settle step turns a row's own FAIL into NOT MEASURED

`recipes/s13-r20.ps1:208`. When R20-LOGS is NOT MEASURED (for example, no control line in the last segment), every deferred row becomes
`NOT MEASURED`, even one whose own verdict was FAIL. This copies Run 19's settle step. With A2 the deferred set (`$R19DeferRe`
`^R20-(ARGS|CON)-`) now also covers rows that have no console clause in their pass rule: CON-DESC, CON-CAP, CON-4 and ARGS-OLD. A failing
CON-CAP would read NOT MEASURED because of a logs problem. **Fix:** settle to the worse of the row's verdict and the logs verdict, so a
FAIL stays FAIL. The session agent may also want to narrow the deferral to rows with a console clause.

### 3.5 MINOR: test gaps, shown by surviving mutants

- M10: `judgeCon4Mcp` without "equal to the `browser_snapshot` control" passes every test (`s13-r20-a2.ts:101`). Add a case where the MCP
  line is exact but the control differs.
- M14: `capRow` without the `limit: 3` "no marker" control passes every test (the marker case also changes the line count). The
  "last 3 entries" clause is also not checked (`c.lastIndex === 200`).
- M13: `descRow` with sentence 1 "at least once" passes every test (sheet: "exactly once each").

### 3.6 MINOR: "How to run liveA20" is missing three operating facts

`S5-drivers-A2-builder.md` §8. The command, prerequisites, the first two record lines (`MANIFEST …`, then
`LOADED20 keys=page nested=page elem=page perm=yes listener=yes enabled=yes args=answered`), the record path and the STOP list are correct.
Missing:
- (a) Start it from Git Bash (`S11_OUT=<dir> powershell.exe …`, as the script header says), because `python` is not on the PowerShell
  tool's PATH (`recipes/CLAUDE.md`).
- (b) Run it in the background, because a slice runs longer than the tool's 600 s cap (`s12-r19.ps1` header).
- (c) "Resume: run `-Block teardown`" needs the exception Run 19 states: after a STOP whose RETURN reads `restored=no` (a failed restore),
  do not run teardown or re-run; return to the user.

### 3.7 MINOR: R20-CON-DESC treats a throw as a wave STOP

`s13-r20-a2.ts:162`. `con-desc` does not go through `run(…, stateless)`, so a throw while listing tools becomes `STOP: Error`, exit 2, a
`throw-after-state` STOP. The row changes no state, and its sibling rows (`con-notea-a`, `con-cap`, `args-old`) map a throw to that row's
FAIL leg. **Fix:** catch inside `conDesc` and print `LEG R20-CON-DESC actor-error FAIL`.

### 3.8 NIT

- `conrefLine(…, "snapshot")` (`s13-r20-a2.ts:110`) prints `same-as=snapshot` as a fixed word whether or not the control matched. This is
  the same as Run 19; the judge does compare.
- If `noteaA` throws after opening the kept `notea` tab, or `noteaB`'s claim fails, that tab is left open in W. Nothing closes it before
  R20-RESTORE. Not a safety item.
- The builder's TS red proof (`-red-ts.txt`) is a reading of HEAD's source, not a test run. Proved here instead (11 failures on HEAD
  code).

## 4. Questions from the brief, answered

- **MCP-leg readers:** CON-4 (`MCP_LINES.disarmedAll` = `safetyRefusalLine`), ARGS-OLD (`MCP_LINES.argsOld` = `ARGS_RELOAD_HINT`, bare)
  and CON-CAP (the MCP's own marker line) read the MCP's own text and `isError`, never the extension's message or a code on line 1.
- **PASS without evidence:** no `ok` counts as a pass. The CON-NOTEA blocked leg needs the handle file, and that file is written only when
  `pre` read 2 entries. A failed claim or read is `NOT MEASURED claim-failed/read-failed`. CON-FLOOR's preconditions come first
  (NOT MEASURED). The remaining exceptions are §3.1 (NOT RUN where a FAIL is due) and §3.3 (a RECORD leg printed as PASS).
- **CON-NOTEA two-run carry:** sound. The daemon releases a disconnected client's leases (`daemon/src/intercept.ts:447` `clientGone` →
  `releaseAll`) and keeps the tab and its handle, so a second client can `claim` it (the R19 `close-bc` precedent). The carried LEG
  lines join the one ROW through the `Complete-R19Row` wrapper (test `carry`). A missing handle gives `blocked NOT MEASURED` (test
  `noteaNoHandle`; mutant M7 killed). Port ≠ 8081 makes both legs NOT MEASURED "fixture-port".
- **STOP → RETURN with the restore first:** every new STOP goes through `Stop-R19` → `Stop-R19Wave`. That restores when `S16Changed`,
  then prints `RETURN`. NoteaB, CON-4 and CON-FLOOR restore in `Invoke-R19Row`'s finally.
- **ARGS-OLD worktree facts:** reuses `Invoke-R19Swapped` and `s12-oldbuild.ts` read-only. The worktree is under `S11_OUT\old-wt`, and
  the code throws if it is inside the repo. It runs its own `npm ci`, removes every link by Node-spawned `cmd /c rmdir` before
  `git worktree remove`, and its finally runs `restore-head`, reload, then `LOADED20 rerun=<k>` with the worker readings. Any failure
  there is `old-build-left-loaded`.
- **A1's `scan` change:** matches the sheet. R20-LOGS expects 0 for every pattern, the sentinel included, in the console, daemon and
  evidence streams. A sentinel count now exits 2 and triggers STOP `text-leak` (mutant M5 killed).
- **§4.28 notes:** form (3) `n/a` is untouched by A2. The ref-leg RECORD note (#401) is untouched: A2 does not edit ARGS-ORDER.
- **The sheet itself:** CON-DESC has no line form in §4.28, and A2's `CHECK … sentence-1=<n> sentence-2=<n> control-tool=` is a
  reasonable choice. The session agent may add a dated note on it.

## 5. Proposed decisions

None beyond the fixes above.
