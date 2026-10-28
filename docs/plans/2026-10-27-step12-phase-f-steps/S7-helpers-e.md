# S7-helpers-e: the UP-OPT poll fix, DIALOGS in liveA19/liveB19, the want-override test (step report; step agent Opus 5.5, medium)

## 1. Verdict
**DONE.** All three #363 items are built with tests. The verifier chain ended **PASS-with-notes**: there were 43 mutants across the two rounds, and every form the brief named is killed. `npm test`, `npm run typecheck` and all seven `recipes/tsconfig*.json` exit 0. Nothing ran against Chrome, the daemon or port 9234.

## 2. Outputs
- **(1) UP-OPT poll fix.** The new `Invoke-S19Opt` is made at load in `recipes/s12-win.ps1` as a third regex-patched copy (`$S19OptPairs`, from `Invoke-S12Opt`).
  - It brings O2 to the front (`Set-S9Foreground`) after the save, and again before the conflict read.
  - The poll's clock starts at the save. `$o2T0` is taken before the foreground call and passed to `Wait-S12O2 -FromMs`. The default is still "now", so Run 18 behaves as before.
  - It prints `OPT O2 front after-save=<yes|no> before-conflict-read=<yes|no>`, then one `FIX R19-UP-OPT: O2 is brought to the front after the save and before the conflict read; the poll is timed from the save (#363)`.
  - `OPT O2 shown=… at=… polled-ms=…`, the 15 000 ms poll cap and the 5 000 ms judge bound are unchanged.
  - `recipes/s12-r19-b.ps1:74` now calls `Invoke-S19Opt`. `recipes/s12-r19.ps1:69` exits 2 before any row if `Invoke-S19Opt` is missing.
  - **Earlier waves are unaffected.** `Invoke-S11Opt`'s text is untouched (Runs 16 and 17), and so are Run 18's `Invoke-S12Opt` and every R16/R17/R18 call site. Mutants U8a–U8d (the fix leaking into either function) are killed. The earlier static tests still pass, and `s12-r19-static.test.ts` adds only `Invoke-S19Opt` to its load-made list.
- **(2) DIALOGS.** `recipes/s12-r19-lib.ps1:220` calls `Write-R19Dialogs` at R19-RESTORE for liveA19, liveB19 and liveC19. `Write-R19Dialogs` already followed #363, so it needed no change:
  - the capture window `$global:D` is not counted;
  - `wave-windows-open` is printed and never judged;
  - a native dialog or DevTools window counted above 0 is a STOP, printed after the line.

  liveA19 opens no window X, and liveB19 uses `$global:R19Xk`.
- **(3) MINOR-1.** `recipes/test/s12-r19-c.test.ts` gains two pins:
  - the exact arguments of every `judgeChoose(` and `wantOf(` call;
  - every `want:` is exactly a `wantOf(...)` call or the leg's own `c[3]`, with no `Object.assign`/`defineProperty` and no assignment into `WANT`.

  This kills M1a2, M1b2, M1c2, M1d and M1f.
- **New test file:** `recipes/test/s12-helpers-e.test.ts` (123 lines). It runs `Invoke-S19Opt` in pwsh with stubs and checks the order, the clock, the front line and the FIX line, and that R18 and R16/17 make no foreground call.
- **Counts:** `npm test` went from 230 files / 5506 tests (the builder's run before the change) to **231 files / 5520 passed** (verifier2, main tree). `npm run typecheck` exit 0. All seven recipes tsconfigs exit 0.
- **Sizes** (`git diff --numstat HEAD -- recipes` and `wc -l`): **15 code lines** against a cap of 150, and **140 test lines** against a cap of 300.
- **Files:** `recipes/s12-win.ps1`, `recipes/s12-r19-b.ps1`, `recipes/s12-r19-lib.ps1`, `recipes/s12-r19.ps1`, `recipes/test/s12-helpers-e.test.ts` (new), `recipes/test/s12-r19-c.test.ts`, `recipes/test/s12-r19-static.test.ts`. The reports are `S7-helpers-e{,-builder,-verifier,-fixer,-verifier2}.md` and the two `-evidence.txt` files.
- **Commit:** see §7. The step agent writes the hash there.

## 3. Verifier verdict
- **Builder** (`S7-helpers-e-builder.md`, Sonnet, medium): DONE. The new tests were red on the unchanged tree.
- **Round 1** (`S7-helpers-e-verifier.md`, Opus, medium): **PASS-with-notes**, with 29 of 32 mutants killed. With the `.ps1` reverted, 7 tests fail.
  - MINOR-1: the M1d and M1f override forms survived.
  - MINOR-2: the `OPT O2 front` line is not a §4.27 form, and it shares the `OPT O2 ` prefix with form (6).
  - NIT-1: U13 survived, so `before-conflict-read` was not discriminated.
  - NIT-2: in `Wait-S12O2`, `$T0` and `$t0` were one variable, because PowerShell names ignore case.
  - NIT-3: the `O2 did not show` note now prints two lines after the O2 line.
- **Fix round 1** (`S7-helpers-e-fixer.md`, Sonnet, medium) fixed MINOR-1, NIT-1 and NIT-2. MINOR-2 and NIT-3 were left to the session agent (§5).
- **Round 2** (`S7-helpers-e-verifier2.md`, Opus, medium): **PASS-with-notes**.
  - Killed: M1a2–M1f, U4, U5, U5b, U12, U13, U13b, U13c and U14, plus six of the verifier's own forms.
  - **MINOR-1b, carried and not fixed:** four deliberate forms still pass. N4 is a spread-override inside the `calls` table that reaches `observe` as `c[3]`. N3 is an aliased mutation of `WANT`. N6 is `delete WANT.choose3.clicks`. N7 is `c[3].message = …`.
  - Verifier2's suggested fix: forbid `...wantOf(` in the file, and deep-freeze `WANT` and `wantOf`'s result.
  - Optional, and one fix round is available. I did not send one because the brief's three mutants and the likely accidental forms are killed.

## 4. Deviations
- **Item (1) is placed in `Invoke-S19Opt`**, not in `Invoke-S11Opt` as #363's wording has it. This is on the step agent's direction, so that the Run 16, 17 and 18 helpers stay as measured (a design-local decision, §5).
- **A new evidence line, `OPT O2 front …`,** follows the investigator's §5 ("record O2's foreground"). §4.27 does not list it (MINOR-2, §5).

## 5. Proposed decisions
### 2026-10-29 · Run 19's UP-OPT fix lives in a third patched copy, Invoke-S19Opt
**Decided:** `Invoke-S19Opt` is made at load from `Invoke-S12Opt` and carries the foreground calls, the clock from the save, and the front and FIX lines. Only Run 19 calls it. **Why:** the Run 16, 17 and 18 helpers stay as they were measured, and every earlier test behaves identically. **Instead of:** editing `Invoke-S11Opt`, or a switch in `Invoke-S12Opt`. **Revisit if:** an earlier wave is re-run and should get the fix. **By:** Claude (proposed; step agent)

### 2026-10-29 · The `OPT O2 front` line is a record line of R19-UP-OPT
**Decided:** a dated §4.27 note, written before any Run 19 observation, lists `OPT O2 front after-save=<yes|no> before-conflict-read=<yes|no>` as a record line of R19-UP-OPT that is never judged. The note also says the #351 (4) (a) note line now follows the front and FIX lines. **Why:** the investigator asked for O2's foreground to be recorded, and code and spec must not diverge silently. Nothing parses `OPT O2` lines today, because the judge reads the observation JSON (verifier round 1). **Instead of:** renaming the line, which would be one more fix round for a wording-only change. **Revisit if:** an aggregator ever parses `OPT O2 ` lines. **By:** Claude (proposed; for the session agent, who writes the note)

### 2026-10-29 · MINOR-1b is carried, not fixed
**Decided:** the four deliberate override forms that verifier2 found (N3, N4, N6, N7) are recorded and not fixed in this stage. **Why:** the brief's mutants, and every form likely to be written by accident, are killed. The rest would need a deep-freeze in `s12-r19-c.ts`. **Instead of:** a second fix round. **Revisit if:** a later stage edits the `calls` table or `WANT`; then forbid `...wantOf(` and freeze `WANT` there. **By:** Claude (proposed; step agent)

## 6. Findings
- No pre-registered check failed.
- **Process fact.** In both verifier rounds, `git worktree remove --force` could not delete a scratch worktree that had its own `npm ci`, because of npm's `node_modules/@bridge/*` workspace junctions. Each verifier checked that every junction pointed inside the worktree, deleted the junctions one by one without recursion, then removed and pruned the worktree.
  - This fits the root `CLAUDE.md` #220 gotcha. A bullet saying "remove npm's workspace junctions before `git worktree remove`" is the session agent's call.
- **Unmeasured until Run 19.** Whether `Set-S9Foreground` succeeds on O2 in the real profile is recorded by the `OPT O2 front` line. #363's Revisit-if applies: R19-UP-OPT still reading `shown=no` with `after-save=yes`.

## 7. Handoff
- Nothing is running. Both verifiers removed and pruned their scratch worktrees, and `git worktree list` shows the main tree only. `wtv` was not touched.
- Commit: _(filled in below by the step agent)_.
- **Next:** S7-drivers-DE. liveD19 and liveE19 do not yet call `Write-R19Dialogs`; that belongs to -DE.
- **For the session agent:** the §4.27 note for the `OPT O2 front` line, and the three proposed decisions.
