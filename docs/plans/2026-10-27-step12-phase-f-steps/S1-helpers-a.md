# S1-helpers-a — Run 18's helpers, part a (step report)

Step agent: Claude Opus 5.5, effort medium. Risk: low. The builder, the fixer and the committer ran on Sonnet 5.5 at medium effort, and both verifiers on Opus 5.5 at medium. The code was written by Sonnet. Nothing in this slice drove Chrome, a daemon or a port.

## 1. Verdict
DONE. The verifier's verdict is **PASS-with-notes**, after one fix round (1 of 3).

## 2. Outputs
- **Commit:** made by the committer after the verdict. Its hash is in the step agent's return and the session agent's journal (agent-rules §6).
- **Files** (code by Sonnet):
  - `recipes/s12-rules.ts` (new, 52 lines): the pure rules.
  - `recipes/s12-win.ps1` (new, 140): the PowerShell helpers.
  - `recipes/s11b.ts` (+48/−1): the subcommands `bannerctl`, `bannerctl-judge` and `console-line`, and `devt --slice/--row`.
  - `recipes/test/s12-helpers.test.ts` (new, 165): the TS rules, the §4.26 ties and the `s11b.ts` ties.
  - `recipes/test/s12-ps.test.ts` (new, 152): runs the real `s12-win.ps1` functions under PowerShell with stubbed helpers.
  - Reports in this folder: `S1-helpers-a-builder.md`, `-verifier.md`, `-verifier-evidence.txt`, `-fixer.md`, `-verifier2.md`, `-verifier2-evidence.txt`, and this file.
- **What was built:**
  - **The console capture.** Each slice gets its own capture file, `console-liveA18.txt` or `console-liveB18.txt`. `Assert-S12CaptureFree` (prologue) and `Save-S12Console` both STOP when the file already holds text. The `CONSOLE` line's control text is tied to `extension/src/badge.ts` `disarmed`.
  - **R18-BANNER-CTL.** The negative leg runs with no bridge connection. The positive leg runs one `evaluate` of `1`. Both use the existing `Invoke-S11Sampler` handshake. The `BANNERCTL` and `ROW R18-BANNER-CTL` lines are judged in TS. An idle under 15 000 ms reaches the judge and FAILs the row, as §4.26 writes.
  - **The idle guard.** It reads an attach stamp, prints the `IDLE` line, and prints a STOP under 15 000 ms or when the stamp is unknown. `Wait-S12Idle` waits the full 15 s when the stamp is unknown.
  - **The banner window.** `$S11SampleTailMs = 0` is set in `s12-win.ps1`, guarded by `Assert-S12Tail`, which `Test-S12Idle` calls. The post-reply window drops from about 6.5 s to the actor's 2 500 ms, plus up to two poll passes. `s11-win.ps1` is unchanged.
  - **The DevTools helper.** It opens DevTools in window X only, and X must be on `http://(127.0.0.1|localhost):8081/`. It presses F12, then Ctrl+Shift+I only if no DevTools shows. Attachment is claimed only from control 1 answering `DEBUGGER_DEVTOOLS`. Closing STOPs if a DevTools window or pane is left.
- **Counts** (verifier 2, `S1-helpers-a-verifier2.md`):
  - `npx vitest run recipes/test`: 1056 → 1090 (+34). The 1056 was re-derived at HEAD by verifier 1.
  - `npm test`: 4768 passed, two runs. S2a and S2b landed during the slice, so the full count's "before + n" is not separable here; the recipes count is.
  - All seven recipes tsconfigs exit 0, and `npm run typecheck` exits 0 per package.
  - `npm run build` exits 0 in verifier 2's worktree.
  - `s12-win.ps1` is ASCII and parses with 0 errors.
- **Size:** 557 new lines: 240 code, 317 tests (verifier 2's count).

## 3. Verifier verdict
- **Verifier 1** (`S1-helpers-a-verifier.md`): **FAIL**.
  - F1 (MAJOR): the PowerShell guards that run were untested, and their TS twins were dead code. 26 mutants were applied and the PowerShell ones survived.
  - MINOR: F2–F7. NIT: F8–F11.
- **Fix round 1** (`S1-helpers-a-fixer.md`): fixed F1–F11 with these rulings:
  - F2: the written FAIL wins over a STOP.
  - F3: static ties only, with no tsconfig lane grant.
  - F5: handoff only.
- **Verifier 2** (`S1-helpers-a-verifier2.md`): **PASS-with-notes**. Every mutant of verifier 1 now fails a test against the real file, as do five more of its own.
  - F-a (MINOR): the fixer's first `npm test` had 2 failures, named nowhere and not reproduced in two runs.
  - F-b (MINOR): the `violations` path of `bannerctl` is untested, and it prints `answer=VIOLATION`, which is outside §4.26's `answer=<ok|CODE>`. The row still FAILs.
  - F-c (NIT): the built-in mutants match exact text.

## 4. Deviations
- **Size:** 557 lines against the 450 cap. This is accepted under agent-rules §7: the extra is tests, code alone is 240, and the total is under 1.5× (675).
- **The test harness:** the `s11b.ts` subcommands are tied by static tests, not by running `main()`, because `tsconfig.s6` cannot compile an import of `s11b.ts` and tsconfigs were out of the lane.
- **The full `npm test` exit check** ("before + n") is reported as the recipes delta, because S2a and S2b changed the tree during the slice.

## 5. Proposed decisions
### 2026-10-27 · The banner tail is set to 0 by the Run 18 helpers, not in s11-win.ps1
**Decided:** `s12-win.ps1` sets `$S11SampleTailMs = 0` after dot-sourcing the older helpers. `Assert-S12Tail`, called from `Test-S12Idle` and `Invoke-S12Sampler`, STOPs otherwise. `s11-win.ps1:30` and its 4000 pin stay for Run 16's §4.23.
**Why:** the actor already sleeps 2 500 ms after the reply, so the 4 000 ms tail made the window about 6.5 s. #340 fixes it at 2 500 ms. Run 16's helpers keep the window their own sheet wrote.
**Instead of:** editing `s11-win.ps1:30`.
**Revisit if:** a runner loads the files in another order.
**By:** Claude (proposed)

### 2026-10-27 · The attach stamp is written by the runner after every actor process
**Decided:** the stamp is `last-attach.stamp` (epoch ms) in the out folder, written by `Set-S12AttachStamp`. A missing stamp is "unknown": the wait then waits 15 s, and the check STOPs.
**Why:** this is conservative. A stamp at the end of a process is later than the reply, so the measured idle is shorter, never longer.
**Instead of:** a stamp written by the actor alone.
**Revisit if:** something attaches outside an actor process.
**By:** Claude (proposed)

### 2026-10-27 · A short idle on the negative leg is the row's FAIL, not a STOP
**Decided:** the negative leg prints its measured idle, and the judge FAILs R18-BANNER-CTL below 15 000 ms, as §4.26's pass rule writes. Only a missing stamp STOPs, and that can happen only if the runner skips `Wait-S12Idle`.
**Why:** a pre-registered pass rule is not turned into another verdict class (agent-rules §2).
**Instead of:** the builder's STOP.
**Revisit if:** never; it follows the sheet.
**By:** Claude (step agent's ruling, F2)

## 6. Findings
- **F-b (open, for S1-helpers-b or a ruling):** a non-zero `violations` count in `bannerctl` prints `answer=VIOLATION`, a word outside `answer=<ok|CODE>`, and has no test. The fix is either an existing code word or a separate `CHECK` line with the answer left as the call's own, plus a test.
- **F-a:** two unnamed `npm test` failures in the fixer's first run were not reproduced by verifier 2 in two runs. If a later full run fails, capture the test names.
- **The DevTools pane detector** was written without Chrome 156's UIA names being checked live. If it misses a docked pane, the open step reports no DevTools and the close step cannot see the pane. Control 1 still decides the row. Stage 0 measured DevTools coexisting with an extension debugger session, so `attached=no` and R18-UP-DEVT NOT MEASURED are possible honest outcomes (§4.26's known limits).
- **§4.26, spec side (no edit):**
  - The window ends 2 500 ms after the reply plus up to two UIA poll passes. That is stricter, never looser, and is worth one sentence in the record.
  - `texts=<n>` is not defined in §4.26. The helper counts non-blank lines after the title lines are dropped.
- **The runner gap:** no slice of Stage0.md §6 names the Run 18 block runner (`R18 <block>` in §4.26's Helper column). The fixer's handoff assigns it to S1-helpers-b. The session agent should confirm that S1-helpers-b's cap of 350 holds it, or split it out.

## 7. Handoff
Nothing is running: no PIDs, watchers or worktrees are left (verifier 2 removed its own). The binding call order is in `S1-helpers-a-fixer.md` § Handoff, which supersedes the builder's §7:
- **Dot-source order:** s9-win, s11-win, s11b-win, then s12-win.
- **Prologue:** `Assert-S12CaptureFree <slice>`. An attempt after the first uses a fresh out folder.
- **After every actor process:** `Set-S12AttachStamp`. Test this in the runner's process wrapper (S1-helpers-b).
- **Banner control:** open the `bc` tab, `Wait-S12Idle`, the neg leg, then the pos leg. Each leg's results come back through `$global:S12Leg`, because `Invoke-R17Node` returns only the exit code. Then `s11b bannerctl-judge`.
- **Before each banner row:** `Wait-S12Idle`, then `Test-S12Idle`.
- **Capture:** `Save-S12Console` after R18-RESTORE, then `s11b console-line`.
- **DevTools row:** `devt --slice liveB18 --row R18-UP-DEVT` with `Invoke-S12DevtRow $X`.

S1-helpers-b also owns UP-RACE-A, UP-OPT, the aggregator, the RAW and OPT lines and the G-23 items, plus F-b above.
