# S1-helpers-c verifier: Run 18's block runner

Model and effort: Claude Opus 5.5, medium. Read and run only. Nothing drove Chrome, the daemon or port 9234; the only
runner invocation was `-Block plan`, which exits before any helper loads. Mutants were made in the session scratchpad,
outside the repo. Command output: `S1-helpers-c-verifier-evidence.txt` (beside this file).

## 1. Verdict
**FAIL.** Three MAJOR findings:
- F1: the entry script's blocks have no tests. These blocks set the state-change flags, wire the IDLE guard and call
  the restore. Seven load-bearing mutants survive every test, among them "a missing IDLE guard" from the brief's list.
- F2: the runner prints a banner row's `ROW` verdict without applying §4.26's per-slice control rule.
- F3: `s11 setup` attaches the debugger and leaves no attach stamp, so in one documented run path the banner control
  records a false `idle-ms`.

The lib's sequencing, STOP and restore logic is sound, and its tests discriminate. The brief's three required mutants
(a skipped restore on throw, a skipped R18-0 list check, a row out of order) are all red.

## 2. Outputs (numbers from my own commands)
- `npx vitest run recipes/test`. Before, at HEAD's set (the two new files excluded; no tracked recipes file differs from
  `5e9ef9a`): 52 files, **1131** tests passed. After: 54 files, **1170** passed (+39). Both match the builder.
- All seven `npx tsc --noEmit -p recipes/tsconfig*.json`: exit 0 with no output. The new tests are compiled only by
  `tsconfig.s6.json` (`--listFilesOnly`).
- `npm run typecheck`: exit 0. `npm test`: 210 files, **4964** passed, exit 0, first run, with no flake.
  `npm run build`: `built extension → dist/`, exit 0. `git status --short` shows no tracked change.
- Both `.ps1` files: 0 parse errors (PS 5.1 `Parser.ParseFile`); `file` reports "ASCII text"; no `&&`, `||`, `??` or `?.`;
  no `SilentlyContinue`.
- Size (#344 (4)): code 171 + 135 = **306** non-blank, non-comment lines (350 in total) against the 400 cap; tests 233 + 137
  = **370** against 600. Within the cap.
- The load section (lines 17–60) runs outside the repo: 49 Run 17 functions and 49 blocks are read, 11 functions and
  16 blocks from Run 17b, and no Run 17 function overrides a name in s12-win or the lib. `Assert-S12Patched` passes and
  `S11SampleTailMs=0`.

## 3. Exit criteria
| # | Check | Result |
|---|---|---|
| 1 | Red on a stub, green on the real runner; own mutants | Lib: the builder's stub tests pass. 13 own lib mutants, V1–V13: 11 red, 2 survive (V8 MINOR, V12 NIT). Entry: 7 own mutants, E1, E2, E4, E7, E9, E10, E11, **all survive** (F1). |
| 2 | Each line form the runner prints matches §4.26 by key | Mostly. `ROW … [slice=]`, `HEAD <12 hex> tree=clean`, `NOT RUN — waits for G11-3` and `CHECK banner-clauses …` match. `CONSOLE evidence copy …` reuses the `CONSOLE` key of form (1) in a different form (F7). |
| 3 | Every recipes tsconfig exits 0 | Yes |
| 4 | vitest before → after | 1131 → 1170 |
| 5 | typecheck, test, build | Green |
| 6 | Each helper entry point the runner calls exists | Yes. I listed every command the two files call from their AST (evidence §6). Every one is defined in a helper file, the lib or the runner, or is built in. `Invoke-S12Opt` is created at load time (s12-win.ps1:184), and the load run confirms it. The builder's list is right but leaves out `Set-S11Front`, `Get-S11Summary`, `Close-S11Window`, `Test-S9Live`, `Set-S9Foreground` and `Call9` (NIT). |
| 7 | Size cap | Within |
| 8 | Handoff command sequence and STOP list | Partly wrong (F4, F5) |

## 4. Deviations
None. I made the mutants without a worktree. I copied the test file's PRE/BODY/CHECKS/`run()` text verbatim into a
`node` (type-stripping) harness in the scratchpad, and its LIB came from each mutant file. For the entry mutants, every
assertion of `s12-r18-static.test.ts` that touches `ENTRY` was copied verbatim into a checker. On the real files the
harness gives 30 of 30 green and the checker gives green, which matches vitest.

## 5. Proposed decisions
None by me. F2 needs the step agent's ruling (the options are under F2).

## 6. Findings

**F1 — MAJOR — the entry blocks are untested, and load-bearing mutants survive.** Location: `recipes/s12-r18.ps1:65-184`;
the tests are `recipes/test/s12-r18*.test.ts`. The unit tests dot-source only the lib. The entry is covered only by
regex and substring static checks. Each mutant below passes every `ENTRY` assertion (evidence, "entry mutants"):
- E1: `if (-not (Test-S12Idle $Row)) { throw 'stop' }` becomes `[void](Test-S12Idle $Row)`. The IDLE STOP is still
  printed, but the banner row's calls are sent after it. The static regex `Wait-S12Idle[\s\S]{0,80}Test-S12Idle \$Row`
  still matches.
- E2: `Invoke-R18Raw` skips `Invoke-R18Banner`, so F-RAW, -2 and -DIR run with no idle wait and no IDLE guard.
- E4: `Wait-S12Idle` is dropped from R18-BANNER-CTL.
- E7, E9: R18-UP-OPT or R18-UP-RACE-A does not set `$global:S16Changed`. A STOP inside the row then never restores the
  safety state.
- E11: R18-RESTORE no longer calls `rd-restore`.
- E10: `exit $r18Rc` becomes `exit 0`.

The builder states this limit itself (§6: "The unit tests cover the lib only"), and the brief asks for a missing IDLE
guard to be proven red. Suggested fix: move the block bodies, or at least `Invoke-R18Banner`, `Invoke-R18Raw` and the
flag-setting rows, into the lib as functions. Then run them in the existing PowerShell scenarios with stubs for
`Wait-S12Idle`, `Test-S12Idle` and `Invoke-R18Node`, so that E1, E2, E4, E7, E9 and E11 turn red. A table test could
also check that each state-changing row block sets `S16Changed` before its first call.

**F2 — MAJOR — banner rows print a FAIL where §4.26 rules NOT MEASURED.** Location: `recipes/s12-r18.ps1:102, 124-135`.
§4.26 preamble: "A row whose only unmet clause is a banner clause made NOT MEASURED by a failed R18-BANNER-CTL has the
verdict NOT MEASURED". The R18-BANNER-CTL paragraph: "a row's banner clause is judged **by the helper** on its own
slice's R18-BANNER-CTL". Decision #340 gives S1-record only the run-wide rule. No helper takes the control's result:
`refusalStepJudge` (`recipes/s11b.ts:723-731`) returns a plain FAIL on `banner seen`. `Invoke-R18RowBlock` then prints
`ROW R18-UP-6 FAIL` (and likewise for F-RAW*) even when the slice's control failed. The runner prints only a side line,
`CHECK banner-clauses slice=X NOT MEASURED`. The record would carry a verdict line that contradicts the pre-registered
rule. The builder reported this gap (§6) but did not fix it. Suggested fix, inside the lane: keep the slice's control
result in a global. When it did not pass, compute the banner rows' `ROW` verdict as NOT MEASURED if every non-PASS
CHECK line of the row is a banner clause (`banner seen`, or `the banner window was not sampled`), and as FAIL otherwise.
Alternatively, the step agent rules that S1-record applies the per-slice rule too and amends #340, which is a decision,
not a verifier's call.

**F3 — MAJOR — an attach with no stamp gives a false idle in liveB on a shared out folder.** `s11 setup` evaluates on
every tab it opens (`recipes/s11.ts:449-466`, `ev(c, r.tab, "typeof window.__s11")`), so it attaches `chrome.debugger`.
It runs through `Invoke-R17Node`, not `Invoke-R18Node`, so no stamp is written. That happens in the reused `reload`
block (`recipes/s11b-r17.ps1:444`, 7 tabs) and in `s12-r18.ps1:160`. S1-helpers-a's binding handoff says: "after every
actor process: `Set-S12AttachStamp` … A forgotten call overstates the idle and no guard fires."

The builder's Handoff step 4 allows liveB to reuse liveA's `S11_OUT`. In that case the stamp is liveA's last one, minutes
old. Then `Wait-S12Idle` does not wait after liveB's setup attaches, and the negative leg prints an `idle-ms` of minutes,
which is a false number against the pass clause `idle-ms ≥ 15000`. A fresh folder hides the problem, because a missing
stamp makes the helper wait the full 15 s. Suggested fix: call `Set-S12AttachStamp` after the `reload` block, and
route `setup` through `Invoke-R18Node`. Drop the "same folder" option from the handoff.

**F4 — MINOR — the handoff command cannot pass the preflight from the PowerShell tool.** The handoff uses PowerShell
syntax (`$env:S11_OUT = …; powershell …`). `python` is not on the PowerShell tool's PATH: `(Get-Command python
-ErrorAction Ignore) -ne $null` printed `False` (recipes/CLAUDE.md: start such a runner from Git Bash). In addition, the
preflight's `Get-Command -All -Name python … -ErrorAction Stop` (`s12-r18.ps1:71`) throws `CommandNotFoundException` before
its `Fail-S16`. So the listed STOP text "python was not found" is never printed; the STOP reads `the wave ended (an
exception in block preflight (…))` instead. Fix: a Git Bash command line, `S11_OUT=<dir> powershell.exe -NoProfile
-ExecutionPolicy Bypass -File recipes/s12-r18.ps1 -Block liveA18`, and `-ErrorAction Ignore` on that probe, or the STOP
list corrected.

**F5 — MINOR — the record file is appended across attempts.** Location: `s12-r18.ps1:29`. `S1-live-record-<slice>.txt` has
no `-attN` suffix, and nothing refuses a file that already exists. An attempt after the first appends to it, so the
sheet's rule that R18-0's `MANIFEST … BUILD …` is "the first line of the slice's record" no longer holds for that attempt.
The sheet names `-att2` and `-att3` for the console copies. Fix: an attempt suffix, or a STOP when the record already
holds text.

**F6 — MINOR — `rows18` is never called.** The binding call list (`S1-helpers-b-fixer.md` §7: "Aggregation: `s11b rows18
--from <record lines file>`") is not followed. The runner prints its own one `ROW` per row, but the `WARN row printed
twice` check that §4.26 assigns to the aggregator never runs over a slice's record. Fix: run `rows18` over the slice's
record lines at the end of `r18-logs` (written outside the repo first), or record that S1-record runs it.

**F7 — MINOR — the `CONSOLE` key is reused in a different form.** `s12-r18.ps1:179` prints `CONSOLE evidence copy written
(scan passed)` and `… not written …`. §4.26 form (1) reserves the key for `CONSOLE <slice> capture=<file> texts=<n>
control-disarmed=<n>`, and a reader keyed on `CONSOLE` meets two forms. Fix: another key, for example `EVIDENCE console
copy …`.

**F8 — MINOR — two rows print a verdict before their console clause is known.** `ROW R18-UP-L1` and `ROW R18-SAVE-REFUSE`
are printed before R18-LOGS. Their pass rules depend on R18-LOGS: liveA's NOT MEASURED makes R18-UP-L1 FAIL and
R18-SAVE-REFUSE NOT MEASURED. The record's `ROW` lines can therefore read PASS where the rule gives another verdict, so
S1-record must apply the rule. Fix: print these two rows' `ROW` lines after R18-LOGS, or add a CHECK line that names the
pending clause.

**F9 — MINOR — no test checks that a stop ends the wave's own processes (V8).** Removing `Stop-S16All` from
`Stop-R18Wave` (`s12-r18-lib.ps1:119`) leaves every check green, so nothing tests that a STOP, including one before the
first state change, ends the fixture server. The code does end it. Fix: assert `STOP-ALL` in the `throwNoChange` and
`throwChanged` checks.

**F10 — MINOR — a refused preflight acts on the previous wave's globals.** `Load-S16` (`s12-r18.ps1:186`) loads the old
globals file before the preflight refuses it (`:67`). `Stop-R18Wave` then acts on those stale values: it attempts a
restore when the old `S16Changed` is true (the toolbar pair, options edits), closes the old windows and kills the old PIDs
(checked by start time). After a "restore failed" STOP, which escalates to the user, a plain re-run would press again
without the user. Run 17b's runner does the same. Fix: test `$GlobalsFile` before `Load-S16`, and exit 2 with nothing done.

**NITs.**
- n1: V12 survives, because `root-add` is gated twice (`Read-R18Early` returns first). Harmless.
- n2: R18-0's missing-list STOP goes to the framing stream (`lib:64-67`). The record then shows only `the wave ended (an
  exception in block r18-0 (stop))`.
- n3: `Test-R18Lists` reads the lists right after the options page opens, with no settle wait. A slow render would be a
  STOP before any change, the safe direction.
- n4: `ROW R18-0 PASS` is fixed text (`lib:70`). A NOT MEASURED from `r17b-0`'s lines would not reach it.
- n5: the load-time `Get-Command Invoke-S12Opt -ErrorAction Stop` (`:59`) throws uncaught, so the runner exits 1 with no
  STOP line (nothing has changed at that point).
- n6: `setup` opens `j7` and `a7`, which Run 18 does not use. Both are fixture hosts.
- n7: the console copy is the cleaned capture, not `redact-console`'s redacted copy. It is written once the console scan
  passes, even if the daemon or actors scan later fails. It stays outside the repo.

**§4.26 wording (no edit made):** the prologue lists the console before the build and the reload, but only the order
reload → console keeps the worker. The builder's reading is right. The Helper cells still name `S11 l1` and the old
scanners, as S1-helpers-b already found.

**Design attacks that held:**
- A throw before the first state change restores nothing, saves the capture if one is open, closes the wave's windows and
  stops its servers (code; tests for all but the servers).
- The restore runs in liveB, both at R18-RESTORE and on a stop after `root-add`.
- A STOP met inside `rd-restore` does not restore a second time.
- A successful stop-path restore clears `S16Changed`, so `-Block teardown` can proceed.
- Nothing the runner prints holds a hash other than HEAD's, a path, folder or block-list text, or the token. `Show-S16`
  masks the profile.
- The toggle is only read (`Read-S11FileAccess` is the only `FileAccess` name). OFF writes the five NOT RUN rows and exits
  3 before any change; an unreadable toggle is a STOP.
- The toolbar is driven by UIA only (`S9PinUiaOnly`), and an unpinned button is a STOP (`window` block).
- DevTools opens only in window X. Each STOP returns exit 2.

## 7. Handoff
Nothing is left running: no worktree, PID or watcher. The scratch harness, mutants and outputs are in the session
scratchpad, outside the repo. For the fixer: F1–F3 first, re-verified with the mutant set in the evidence file (E1, E2,
E4, E7, E9 and E11 must turn red, and F2 needs a scenario where the control fails). Then F4–F10. A fresh verifier
re-checks F1–F10 and the counts.
