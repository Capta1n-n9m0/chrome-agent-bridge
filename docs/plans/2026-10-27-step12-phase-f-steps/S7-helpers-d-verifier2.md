# S7-helpers-d verifier 2 (round 2): Run 19's block runner (Opus 5.5, medium)

Re-checked only the items fix round 1 touched (F1, F2, F3, F5, F6) and ran the regression checks. The fixer's claims are
in `S7-helpers-d-fixer.md`. F4 is left to the step agent, as briefed. Nothing live was run: no Chrome, no daemon, no
port 9234, no reload. Raw output is in `S7-helpers-d-verifier2-evidence.txt`, and its section numbers are cited as §E1 to
§E7 below. The scratch harnesses are in the session scratchpad (`v2/rn.ps1`, `v2/mk.mjs`, `v2/mirror/`), outside the
repo.

## 1. Verdict
**PASS-with-notes.** F1, F2, F3, F5 and F6 are fixed. I checked this with verifier 1's method: the real `Invoke-R17Node`,
only `Start-Process` faked, and the entry's own block lines. I also ran the fixer's new tests against the pre-fix lib, and
they are red there. There is one MINOR finding: one of the fixer's in-suite mutants is vacuous. There are four NITs. Every
exit check passes. The slice stays **DONE-PARTIAL** on size: the code is over its cap, which is not a FAIL.

## 2. Outputs (re-derived)
- `npx vitest run recipes/test`, run three times: `61 passed (61)`, `1433 passed (1433)` each time. This matches the
  fixer's 1433/61, and the count went up from 1411 (§E5).
- `npx tsc --noEmit -p` on the seven configs `recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json`: all exit 0.
  `npm run typecheck`: exit 0.
- `npm test`: `227 passed (227)`, `5333 passed (5333)`, exit 0. `npm run build`: `built mcp → dist/index.js`,
  `built extension → dist/`, exit 0.
- **Size** (`wc -l`): the code is `s12-r19.ps1` 99, `s12-r19-lib.ps1` 242 and `s12-r19.ts` 178, a total of **519**, plus the
  M1 diff to `s12-oldbuild.ts` (+10/-3). The cap is 400. The tests are 292 + 242 = **534**, under the cap of 600.
  The code alone is over the cap (1.30x), so the slice stays DONE-PARTIAL under agent-rules §7.

## 3. Item checks

**1. F1, using the real `Invoke-R17Node`** (`v2/rn.ps1`, §E1). The harness runs the lib with the six blocks that
`s12-r19.ps1:90-96` registers, read from the entry itself (`ENTRY-LINES 6`). The real node runner comes from
`s11b-r17.ps1:114-143` through `Get-R18Defs`. Only node is faked.
- **R19-0 with a stale build** (`zeroStale`, proof exit 2): the record shows `SHOW LOADED consoleMessages=UNKNOWN_METHOD …`, then
  `STOP: R19-0: the loaded extension is stale, not this build … nothing was changed (old-build-left-loaded)`, then
  `STOP old-build-left-loaded`, then `RETURN 1 after-stop=old-build-left-loaded restored=n/a readback=n/a`. No later block
  runs. **Fixed.**
- **R19-0 when it passes** (`zeroGood`): `MANIFEST`, then `LOADED` once, then `RULES`, `STATE`, `HEAD`, and `ROW R19-0 PASS`.
  I also traced the real R17b-0 path. Its MANIFEST line comes from `Write-S11bB17Out`, which writes directly into the
  scratch file and does not go through `Show-S16`, so the wrapper does not fire on it. The first `Show-S16` that carries a
  MANIFEST line is `Show-S16 @($first)` (`s11b-r17b.ps1`, r17b-0, after `$env:S9_RAW = $Record`). The wrapper therefore
  releases `LOADED` into the record, directly after the joined `MANIFEST … BUILD …` line (R7.2). **Fixed.**
- **Wrong counts, `args=other`** (`zeroCounts`, `zeroArgsOther`, proof exit 1 with no ROW line): the result is
  `ROW R19-0 FAIL slice=D`, not a STOP. **Fixed (F6).**
- **liveD19 reaches R19-ARGS-OLD** (`oldArgs`): the old build's in-row proof answers `UNKNOWN_METHOD` with exit 2. Then
  `ROW R19-ARGS-OLD NOT RUN …` prints, followed by `restore-head`, `RELOAD`, `proof --rerun 1` (answered), RESTORE, LOGS,
  and `EXIT 0`. No STOP. **Fixed.**
- **A failed `restore-head`** (`headFails` exits 2, `headCrash` exits 1 with no output): the reload and the re-proof still
  run, and the run ends `STOP: restoreHead failed: extension/dist may hold the old build (old-build-left-loaded)` with a
  matched RETURN. **A failed re-proof** (`rerunFails`): `STOP: the loaded extension is stale: the re-run proof … (old-build-left-loaded)`,
  with a matched RETURN. **Fixed.**
- **R19-LOGS** (`logsDaemon`: DAEMONLOG exits 2; `logsScan`: the console scan18 exits 2): the order is
  `ROW R19-LOGS FAIL slice=D`, then `NODE … rows19`, then `STOP: R19-LOGS: … (text-leak)`, `STOP text-leak`, and
  `RETURN 1 after-stop=text-leak …`. **Fixed.**
- **M1's wording** (`swapFails`): `SHOW SWAP failed: the scratch worktree could not be removed: a link is left in it` is
  printed to the record through `Show-S16`. The finally still restores HEAD, reloads and re-proves, and the run ends
  `STOP throw-after-state` with a matched RETURN. **Fixed.**
- **Every stop path** in §E1 and §E2 prints exactly one `RETURN <seq> after-stop=<same reason>` after its `STOP <reason>`.
  The one run that changed state (`throwChanged`, liveA19) printed `RESTORE-CALLED R19-RESTORE` and then `restored=yes readback=equal`.

**2. F2** (`s12-r19-lib.ps1:121-128`). Each step of the finally sits in its own `try`.
- `segExists`: the finally's `Save-R19Seg` throws `capture exists`. `RELOAD`, `CONSOLE-REOPEN` and `proof --rerun 1`
  still run, and the run ends `STOP: the capture segment could not be saved (old-build-left-loaded)`.
- `reloadThrows`: the reload in the finally throws. The re-proof still runs, and the run ends
  `the reload after restoreHead failed … (old-build-left-loaded)`.
- `headFails`: the reload and the re-proof run after `restore-head` fails.

**Fixed.**

**3. F3** (the realistic-layer tests).
- The suite `Run 19's entry blocks over the real Invoke-R17Node` exists (`recipes/test/s12-r19.test.ts:20-38`, `:176`,
  `:203-213`, `:228-245`). It reads the entry's own six block lines (`:229` asserts six).
- **It is red without the fix.** I ran the fixer's test file in a scratch mirror against the **pre-fix lib** (verifier 1's
  kept 226-line copy): `Tests 20 failed | 34 passed (54)`. All nine real-node "green on the real lib" checks were red
  (`real: expected false to be true`). The control run, with the current lib in the same mirror, gave `54 passed (54)` (§E4).
- **The fixer's lib mutants, re-run myself** on scratch copies with a function replacer, in my own harness (§E2 X1 to X7):
  - X1 (exit 2 not mapped): the stale proof becomes `STOP throw-after-state … (node s12-r19 proof ended in a STOP)`.
  - X2 (exit 1 not mapped): wrong counts become `STOP throw-after-state … exited 1 with no ROW or CHECK line`.
  - X3 (LOADED printed by node): `LOADED`, then `MANIFEST`, then `LOADED` again.
  - X4 (no leak code): `ROW R19-LOGS FAIL` and `EXIT 0`, with no text-leak STOP.
  - X5 (segment save not isolated): the reload and the re-proof are skipped, and the run ends `throw-after-state`.
  - X6 (reload not isolated): the re-proof is skipped, and the run ends `throw-after-state … (reload died)`.
  - X7 (restore-head failure not a STOP): `EXIT 0` after a failed `restore-head`.

  All seven are distinguishable. One of them is vacuous **as the suite applies it**: see N-1.

**4. F5 and F6.**
- **F5** (`s12-r19-lib.ps1:164`): the gate reads `git log -1 --format=%H -- <path>`. In a scratch git repo, a file that is
  staged but not committed gives an empty result while `ls-files` lists it, and a committed file gives a hash (§E7). In the
  runner (§E2 X8), the staged-only report gives `ROW R19-UP-OPT NOT RUN …`, then `RAN root-add`. The `ls-files` mutant gives
  `RAN r19-up-opt`. A committed report also gives `RAN r19-up-opt`, with no root-add. **Fixed.**
- **F6** (`s12-r19.ts:118-122`, `proofExit`): only `UNKNOWN_METHOD` or `VERSION` gives exit 2. `args=other`, an `ERROR`
  read and wrong counts give exit 1, which is R19-0's FAIL. This matches §4.27 R19-0 (e2e-test-plan.md line 1784): "Any
  `consoleMessages=UNKNOWN_METHOD` or `args=VERSION` is a STOP before any state change". The `kind: "function"` and
  `entries=0` builds are listed there as discrimination, so they are a FAIL. The sheet's "A console that cannot evaluate is
  a STOP" refers to the worker DevTools console of R17b-0 (§4.25, line 1701), which R17b-0's own block enforces. It does
  not refer to the `evaluate` call. **Fixed.**

**5. No regression.**
- **The five required mutants** (§E2 N1 to N5), each on its own scratch copy:
  - N1, skipped restore: `restored=no readback=n/a` and no `RESTORE-CALLED`.
  - N2, swap without the finally: no `restore-head`, no reload, no re-proof after the rows throw.
  - N3, STOP without RETURN: no RETURN line.
  - N4, row out of order: `args-2` runs before `args-1`.
  - N5, UP-OPT without the report: `RAN r19-up-opt` with a staged-only report.

  All five are red.
- **Forms** (28), (29), (31) and (32): the static suite, unchanged at 242 lines, reads the templates from §4.27 and is green
  (`the forms by key, against section 4.27`, `the thirteen STOP reasons are exactly the sheet's list`).
- **ASCII**: both `.ps1` files have 0 non-ASCII lines. `s12-r19.ts` has one ellipsis, in a comment.
- **`SilentlyContinue`**: 0 in both `.ps1` files.
- **PowerShell 5.1 and the shadowing trap**: there is no top-level `$o`, `$w`, `$d`, `$x` or `$e`. The only `$d` is local to
  `Get-R19Head` (`:138`) and calls nothing after it is assigned. No helper reads a global with any of the lib's local names
  (checked by grep over the dot-sourced helper files).
- **Logging**: only counts, ids, leaf file names and a short HEAD are printed. The one exception is N-4.

**6. Size**: see §2. DONE-PARTIAL stays.

**7. Exit commands**: see §2. All pass.

**8. M5 (#359).** **No recurrence.**
- `npx vitest run recipes/test/s12-ps-c.test.ts`, run 20 times alone: `26 passed (26)` all 20 times, with 0 `FAIL` or `×` lines.
- The full `npx vitest run recipes/test`, run 3 times: `1433 passed (1433)` each time, with no failing test title (§E5, §E6).

## 4. Findings

**N-1 (MINOR): the in-suite mutant "a node exit of 2 is not mapped back" is red only because its lib does not parse.**
- Where: `recipes/test/s12-r19.test.ts:248`, applied by `LIB.replace(from, to)` at `:241`.
- Cause: the replacement `'NEVER-MATCHES$'` contains `$'`, which `String.prototype.replace` expands to the text after the
  match. The mutated lib therefore has **14 parse errors** (§E3, `vac-X1.ps1 parse-errors=14`), every check is red, and the
  mutant proves nothing.
- With a function replacer, the same mutant parses (`X1.ps1 parse-errors=0`) and is still red for the right reason (§E2 X1).
  The protection is therefore real, and the green check is also red on the pre-fix lib. But the suite's evidence for this
  mutant is not what its name claims.
- No other mutant `to` string in either table holds a `$` replacement pattern (`$'`, `` $` ``, `$&`, `$n`, `$<`). I checked
  them by eye.
- **Fix:** use `LIB.replace(from, () => to)` at `:241` and `:268`, and assert that each mutant parses (the static suite
  already has a parse check to reuse), so that a broken mutant cannot pass as red.

**N-2 (NIT): R19-0 labels a proof crash "stale".**
- Where: `s12-r19-lib.ps1:149-151`.
- A `proof` that exits 1 with no output gives `STOP … the loaded extension is stale … (old-build-left-loaded)` (§E1
  `zeroCrash`). This happens, for example, when `connect()` fails or the daemon cannot be spawned.
- It is still a STOP before any state change, so the outcome is safe, but the words name the wrong cause.
- **Fix:** when no `LOADED` line came back, say "the proof printed no LOADED line (see node-err.txt)".

**N-3 (NIT): the re-proof after the old-build slices asks for more than §4.27 does.**
- Where: `s12-r19-lib.ps1:132-135`.
- The re-proof requires exit 0, which means all the counts. §4.27 (R19-ARGS-OLD, R19-VERSION) asks only for "R19-0 re-run
  (`LOADED … args=answered`), else STOP".
- When the current build's R19-0 already failed on counts (`zeroCounts`, `zeroArgsOther`, §E1), the finally then STOPs
  `old-build-left-loaded`, "the loaded extension is stale", although the current build is loaded.
- This errs on the safe side, but the wording misleads. Either judge the re-run on `args=answered` (and not
  `UNKNOWN_METHOD`/`VERSION`), or word the STOP as "the re-run proof did not match".

**N-4 (NIT): `swap`'s catch prints any error message, but the code comment says the message names no path.**
- Where: `s12-r19.ts:155-156`.
- `swapOldBuild` re-throws a raw failure (`s12-oldbuild.ts:80`, `throw failure`). An fs error from `replaceDir` or
  `removeWorktree` carries its path, so the comment's claim is not true for that branch.
- Mitigation: the line reaches the record through `Show-S16`, which masks `$env:USERPROFILE` (`s11b-r17.ps1:57-61`).
- **Fix:** print the message only when it starts with `swap:`, and print a fixed word otherwise.

**N-5 (NIT): on an R17b-0 STOP inside R19-0, the buffered `LOADED` line never reaches the record.**
- Where: `s12-r19-lib.ps1:156-157`. The `try` re-throws past the release at `:157`.
- R17b-0's own finally keeps its MANIFEST, STOP and ROW lines, but the proof reading is lost.
- **Fix:** release `R19Loaded` in the `finally` at `:156`.

Notes for the step agent (not findings):
- A failed capture-segment save in the finally is reported as `old-build-left-loaded`, even when restore-head, the reload
  and the re-proof all passed (`segExists`). That is what the brief asks for ("failure → old-build-left-loaded"), but the
  reason over-states the case.
- The old build's in-row proof result is discarded (`s12-r19.ps1:95`, `[void]`). The future R19-ARGS-OLD/VERSION driver
  must judge it, so that a reload of the old build that did not take is not recorded as the old build's answers.

## 5. Handoff
- Nothing is running: the background vitest, npm test and build jobs have all ended.
- The scratch files are in the session scratchpad, under `v2/`.
- The tree is as the fixer left it (`git status`: `M recipes/s12-oldbuild.ts` and the untracked slice files). I edited no
  repo file apart from this report and its evidence file.
- If the step agent wants N-1 fixed, it is a two-line change to the test, and it fits within the remaining fix rounds.
