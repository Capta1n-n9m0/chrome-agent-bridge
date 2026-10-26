# S5-runner verifier report

Model: Claude Opus 5.5. UTC 2026-10-26T03:53:12Z → 2026-10-26T04:01Z (`date -u`). Role: verifier (agent-rules §6). Nothing ran
live: no daemon, no Chrome UIA, no reload, no server; 9234/8081/8084 had 0 listeners at the start and at 04:00:44Z (`netstat -ano`).
Scratch work (mutants, harnesses) is under
`C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\9c6ea090-7b81-4653-b2ad-abef50160f29\scratchpad\r16v`.

## 1. Verdict

**FAIL**: one MAJOR. If the restore fails inside the `up-restore` block, the stop procedure restores a second time
(MAJOR-1). Every other exit check holds. The fix is small.

## 2. Exit checks, re-derived

| # | Check | Result |
|---|---|---|
| 1 | Row → block, sheet order, slices per Live column | **Holds.** I mapped §4.23 myself (lines 1493–1520 of the plan): 27 rows have a live slice and UP-CLICK has none. liveA: UP-L1, UP-0, UP-OPT, UP-FA, UP-6, UP-7, SAVE-REFUSE-R, SW-2, UP-RESTORE, UP-LOGS. liveB: UP-0, root-add, UP-1…UP-5, UP-6B, UP-8, UP-9, UP-PATCH, UP-TWICE, UP-RAW, UP-NAV, UP-DEVT, UP-STALE, UP-7J, UP-RACE-A, UP-RACE-B, UP-RESTORE, UP-LOGS. This equals `ROW_BLOCKS`/`sliceBlocks` and `$SliceA`/`$SliceB` (s11-r16.ps1:43-44). **Which layer governs:** the sheet. Its Live column ("A, B", "A and B (end of each)") and its Slices paragraph are pre-registered rules. decisions.md #272 adds "UP-0, UP-RESTORE and UP-LOGS run in both live slices". Pre-registered rules rank above a brief (agent-rules §4 precedence). The brief's "exactly one" holds in the sense that matters: each row has exactly one `-Block`, and that block is run by both slices. The builder chose correctly. |
| 2 | A STOP during the restore ends the wave non-zero, tested | **Partly holds.** It ends non-zero (exit 2), but a second restore runs first (MAJOR-1). The test stubs `$S16InRestore` directly, so the real path is never exercised. |
| 3 | liveB's G11-3 refusal tested | **Holds.** `Test-S16Gate` runs in PowerShell (off, unreadable and `$null` are refused; on is let through; the rows that need no file access are let through). A mutant `-ne 'on'`→`-eq 'off'` is caught. The slice loop's `exit 3` is pinned only by a regex. See MINOR-2 for *when* liveB refuses. |
| 4 | No folder/pattern/path/token printed; scan discriminates | **Holds for the code; the scan has gaps** (MINOR-1). Read by hand, the real call sites are safe. Planted leaks: 16 of 21 caught; 5 missed. |
| 5 | PS 5.1 ParseFile | **0 errors** (PowerShell 5.1.26100.9711), 384 lines, 0 non-ASCII bytes. |
| 6 | typecheck / test / build / recipes tsconfigs | `npm run typecheck` exit 0. `npm test`: **151 files, 3775 passed** (builder: 150/3746 → 151/3775; +29, which equals the new file's 29 tests). `npm run build` exit 0. `npx tsc --noEmit -p` on recipes `tsconfig{,.fe,.s6,.s9,.s10,.s11}.json`: all six exit 0. |
| 7 | ≤500 lines | 384. |
| 8 | Lane | `git status`: the five new `s11-r16*` and report files, `tsconfig.s11.json` (+3 include entries), and `journal.md` (+1 line, the step agent's own "S5-runner … (running)" line, not the builder's). No other change. |

**Do the new tests fail without the change?** I applied each mutant to an in-memory copy of the `.ps1` and re-ran the
builder's own PowerShell test bodies against it (`mut2.mjs`). Each of these was caught: dropping the STOP-count clause of the
restore check, dropping `exit 2`, restoring even while in restore, and weakening the gate. The map test re-parses §4.23, so
moving any row breaks it.

## 3. Findings

### MAJOR-1: a failed UP-RESTORE is followed by a second restore. s11-r16.ps1:326-332 with :170-176
The `finally { $global:S16InRestore = $false }` in `$Blocks['up-restore']` runs **before** the exception reaches the main
`catch`. `Stop-S16Wave` therefore sees `S16Changed = $true` and `S16InRestore = $false`, and calls `Restore-S11Safety` again.
That sends a second toolbar press pair and a second set of box writes, after a restore that had already failed.
`Restore-S11Safety` itself says "$false = STOP (integrity floor): nothing else is pressed". The builder's report (§5) and
the plan comment (s11-r16-plan.ts:62-65) both claim "never restores twice". The claim is false on the one path it is about.

Evidence: `dbl.mjs` builds a harness from the **real** text of `Step-S16`, `Stop-S16Wave`, `$Blocks['up-restore']`,
`Invoke-S16Block` and the main `try/catch`. Only the UIA and node helpers are stubbed.
```
stub restore = "Stop9 'RESTORE FAILED (stub)'; $false"     stub restore = "throw 'uia'"
RESTORE-CALLED 1                                             RESTORE-CALLED 1
STOP: RESTORE FAILED (stub)                                  SAY WAVE stopping: an exception in block up-restore (RuntimeException)
SAY WAVE stopping: an exception in block up-restore (...)    RESTORE-CALLED 2
RESTORE-CALLED 2                                             STOP: the restore failed or printed a STOP during the stop procedure; ...
STOP: RESTORE FAILED (stub)                                  exit 2
STOP: the restore failed or printed a STOP during the stop procedure; the wave is over
exit 2
```
**Fix:** clear the flag only on success. Move `$global:S16InRestore = $false` after `$global:S16Changed = $false` inside the
`try` and drop the `finally`, or add a separate `$global:S16RestoreTried` that `Stop-S16Wave` honours. Add a test that runs
the real `up-restore` block through `Invoke-S16Block` and the main catch, as `dbl.mjs` does, and asserts one
`RESTORE-CALLED`. The current test sets the flag by hand and cannot see this.

### MINOR-1: the static scan does not cover the runner's own printing function or two more sinks. s11-r16-plan.ts:86-109
Planted in a scratch copy (`mut.mts`, after line 269). Missed:
`Show-S16 @("root $Root")`, `Show-S16 $FoundDir`, `Show-S16 @($env:USERPROFILE)`,
`[IO.File]::WriteAllLines($Record, [string[]]@($Root))`, a bare `$Root` or `$FoundJson` left in a block's pipeline (the block
output reaches stdout), and `$Root | Export-Clixml $Record`. Caught: Say9/Stop9/Fail-S16/Write-Host/Write-Output/Write-S9Raw
with `$Root`/`$FoundJson`/`$DaemonLog`; `Get-S11FoundText`; `Tee-Object`; `Write-S11Pressed`; `bridge.token`;
`Get-S11Box`; `ReadAllText`; `$env:TEMP`.

`Show-S16` is the one site every line goes through, but it is not in `SINK`, so any argument passed to it goes unchecked.
Today's two calls are safe by reading: `Show-S16 $out` prints s11.ts's own lines, and `Show-S16 ([string[]]$o)` prints the
reload script's lines. The reload script prints `(from $ExtensionDir)`, which is masked to `<PROFILE>` and goes to the framing
file in `%TEMP%`. **Fix:** in `scanR16`, treat `Show-S16` as a sink. Allow only the two vetted arguments (`$out`,
`[string[]]$o`) or mark those calls with a vetted tag. Add `WriteAllLines`, `Export-Clixml` and `Out-String` to the sink
regex. Plant each in the "catches planted leaks" test.

### MINOR-2: liveB reads the toggle only after the reload and the fixture tabs. s11-r16.ps1:44, :369-373
With file access OFF, liveB still runs preflight, servers, files, window, **prestale, reload, setup, console** and UP-0.
Only then does the gate refuse (`root-add`) and exit 3. The sheet says "OFF: … liveB does not start", and the brief says
"liveB refuses to start unless the toggle read finds file access ON". The reload is harmless, but it is work the sheet says
not to start. **Fix (design-local):** read the toggle right after `window` (`Read-S11FileAccess`, read only) and exit 3
there, before `prestale`. Or require a `-Toggle on` argument taken from liveA's recorded UP-0 reading. UP-0's own record
stays where it is.

### MINOR-3: a node crash looks like a failed check. s11-r16.ps1:121-129
s11.ts uses exit 1 for "a check failed". An import or compile crash under tsx also exits 1 and prints nothing to stdout,
and its stderr goes to `node-err.txt`, which the runner never shows. The runner then counts `S16Fail++` and goes on, and
the record holds no line for that row. **Fix:** after an exit 1, require at least one `^ROW ` or `^CHECK ` line in `$out`;
otherwise throw (a STOP).

### MINOR-4: the tree kill of a node process can take the daemon with it. s11-r16.ps1:87, :118, :120
`taskkill /T /F` on a recorded `node` PID runs on a driver throw or a budget overrun. If that node process spawned the
daemon (9234 free at preflight; the SDK spawns `daemon/dist/index.js` detached, but its parent is still that node), the
tree kill ends the one-per-machine daemon. Other clients would lose their leases. agent-rules §8: kill only what you
identified as yours. **Fix:** use `/T` only for the two server PIDs; kill `node` without `/T`.

### NIT-1: no between-row re-check of the tracked tree. s11-r16.ps1:189-190
The sheet's STOP list includes "a tracked file changed outside the steps dir", but the runner checks it only in preflight.
Re-running the same `git status` check at the start of each row block would cover helper fixes made between rows.

### NIT-2: the stop line names the slice, not the block. s11-r16.ps1:368, :382
In slice mode `$Name` is `liveA`/`liveB`. The failing block is visible only from the last `BLOCK x start` line in the
framing file. Print the block name (it is a safe string).

### NIT-3: `Start-Process -ArgumentList` with an array joins without quoting in PS 5.1. s11-r16.ps1:113
A `%TEMP%` path that holds a space would split `--file`/`--found` arguments. It is fine on this machine (no space).
Quote each element, or record this as a known limit.

### NIT-4: `r16-globals.clixml` keeps `S11RootText` (the user's Upload folders text plus ROOT) after a matching restore,
until teardown. s11-r16.ps1:46
It is outside the repo and never printed, but it outlives the "found texts deleted after a match" rule. Drop
`S11RootText` from `$Persist` once `up-restore` passes.

### NIT-5: the UP-7 driver keeps going after a leg returns `$false`. s11-r16.ps1:273
The actor's own `waitSafety` stops first, so the next leg's `Wait-S11Ready` times out before any change is made. Breaking
on `$false` would end the row without the 120 s wait.

## 4. The builder's other claims

- **"Left unproven until live" list:** each item is accurate. Missing from it: SW-2's `Enter-S11Guards` is called with no
  `ReadRects`, so any owned occluder (such as the Chrome topmost popup in recipes/CLAUDE.md, Run 14/15) counts as foreign
  and STOPs. Also missing: whether the fixture servers and the stored PIDs survive between separate `-Block` invocations
  when launched from a backgrounded tool shell (job object); and that the 8081 server binds `127.0.0.1` only (stricter than
  the brief's command line), while `localhost`/`*.localhost` tabs depend on Chrome falling back from `::1`.
- **`s11-r16-opt.ts`:** the gap is real (`optVerdict` is exported but no s11.ts subcommand calls it; ROW_MAP gives UP-OPT to
  "the driver"). A 29-line judge inside the `s11-r16*` lane is a reasonable place for it (design-local). It judges with
  `optExpected` + `optVerdict` from s11-rules.ts (S5-rules, already verified). Their nine clauses match UP-OPT's pass rule
  clause for clause: K-opt-stand once; stored = set by hash; `<found+1>` after the save and after the revert; `<found+2> … 2
  invalid lines …` while typed; both invalid items by number; the home line warned; nothing stored by typing; O2 ≤ 5 000 ms
  with no conflict note. It prints only CHECK/ROW lines and never page text (tested). An unreadable or malformed observation
  file gives a STOP (exit 2).
- **Restore path, other cases:** a STOP or throw before the first change does not restore and exits 2. After a change it
  restores once and treats a false return, a throw or a STOP printed during the restore as failed. Teardown refuses while
  `S16Changed` is set. All of these are correct.
- **Port checks:** both are correct (no own PIDs at preflight, so 8081/8084 must be free; 9234 accepts only a command line
  naming `daemon/dist/index.js`; an unreadable command line is refused). **Reload re-run rule:** correct (exit 2 gets
  exactly one re-run; any other non-zero exit is a STOP). **Run record:** appended UTF-8 without a BOM through
  `Write-S9Raw`. Rows go to `S5-run-record.md`; framing goes to `%TEMP%\…\r16-framing.txt`. The sheet sends the framing
  "to the ledger", so the step agent copies it there.

## 5. Proposed decisions

### 2026-10-26 · UP-0, UP-RESTORE and UP-LOGS run in both slices, as the sheet says
**Decided:** keep them in liveA and liveB (one `-Block` each). **Why:** §4.23's Live column and #272 are pre-registered and
rank above the brief's "exactly one" (agent-rules §4). **Instead of:** one slice each. **Revisit if:** a dated §4.23 note
says otherwise. **By:** Claude (proposed; verifier)

## 6. Handoff

No processes started. Scratch files: `mut.mts` (scan mutants), `mut2.mjs` (PS-test discrimination), `dbl.mjs` (MAJOR-1
harness), all in the scratch folder above. A fixer needs MAJOR-1 (and its test) fixed. MINOR-1…4 are cheap to fix in the
same round.
