# Step 12 S4b — the kept debugger session: wiring the keeper (verifier 2, after fix round 1)

Model / effort: Opus, medium. Date 2026-10-28. Role: verifier (`docs/agent-rules.md` §6). Deviations: none. Read and run
only. Every run was made in a scratch git worktree: HEAD `8ef6e4e` plus the slice's six files, each `cmp`-identical to the
main tree's, with its own `npm ci`. The five `@bridge/*` workspace links were removed with `cmd /c rmdir` before
`git worktree remove`. Raw output is in `S4b-verifier2-evidence.txt` (§ numbers below refer to it).

Scope: V1–V4 of `S4b-verifier.md`, the fixer's new `use()` order in `extension/src/debugger-keeper.ts:135-149`, and the
whole-slice exit checks.

## 1. Verdict

**PASS-with-notes.** V1–V4 are fixed, and each new test goes red under its mutant. The new order holds up:
- it misses no refusal;
- no loop or wait is unbounded;
- no false `DEBUGGER_CANCELLED` comes back;
- no answer changes against 0.6.

Every whole-slice exit check holds. One MINOR finding: the loop's second turn, which the fixer's own decision depends
on, has no test.

## 2. Exit checks

| Check | Result | Evidence |
|---|---|---|
| V1: M7–M12 red | each `1 failed \| 2470 passed (2471)`, all on the V1 static test | §2 |
| V2: M13 red | `1 failed`, on "consoleMessages, Runtime.disable fails: true" | §2 |
| V3: a refusal during the wait refuses the use, and the new test is red on the old order | mutant V3pre (guard, then `settled`): `1 failed`, the V3 test | §2 |
| V4 wording | `docs/setup.md:547-551, 643-645`. The 10 s total is gone. "5.0–5.2 s measured in Step 12 Stage 0" matches `Stage0-measurer2.md:27-31` (D2: 5.02–5.06 / 5.14–5.16 s). "3–14 s measured" after a disarm matches `extension/CLAUDE.md` § Safety gate. The anchor `#the-debugging-banner` exists (`setup.md:543`) | §5 |
| Required mutant: a session kept across a disarm (M2, the keeper on its own `new DebuggerSessions()`) | red, `1 failed` (D4.2) | §2 |
| Required mutant: the re-check skipped | M3 (`guard: undefined` in `withDebugger`): `1 failed`. M3skip (the guard block removed in the keeper): `8 failed`. M3b (skipped only on a reused session): `6 failed` | §2 |
| V4-1 revert still red | V41rev (`if (!done \|\| …) return` restored): `1 failed`, T6 | §2 |
| `npx vitest run`, counts re-derived | before (slice reverted): 5010 tests in 210 files. After: 5027 in 211. Compared per file, the only difference is `s4b-keeper-wiring.test.ts` absent → 17. No test was removed | §1 |
| tsc per package, `npm run typecheck`, the seven `recipes/tsconfig*.json`, `npm run build` | all exit 0. `git status --short` is identical before and after the build | §4 |
| Log sites +0 (allowlist 54) | the only `^+.*console\.` match in `git diff HEAD -- extension/src` is the `+++ …/handlers/console.ts` header. Tracked `extension/test` (with `log-allowlist.ts`) is unchanged since `c9bb6cb`, and `log-scan` passes in the full run | §5 |
| Size cap (#344 (4)) | code 152 (keeper 88, debugger 47, console 2, sw 15) ≤ 250; tests 355 ≤ 375 | §5 |
| `git diff c9bb6cb -- daemon shared sdk mcp` | empty | §5 |

**About the 9 failures in the worktree.** Both scratch runs, before and after, had the same 9 failures, all in
`recipes/test/s11-r16-runner.test.ts`:
- **Cause.** The worktree checks `recipes/*.ps1` out with CRLF, while the main tree's copies are LF.
- **Fix in the worktree.** Converted to LF there, the file passes 30/30.
- **Main tree.** The same file passes 30/30 in the main tree.

These failures are environmental and have nothing to do with the slice (§1). Counts above are totals: 5001 + 9 and
5018 + 9.

## 3. The attack on the new `use()` order

The code (`debugger-keeper.ts:138-149`) works like this:
1. It waits in `settled(tabId)`.
2. It notes `waited = detaching.get(tabId)`. That is the pending detach whose 1 s bound `settled` gave up on, or nothing.
3. It runs the guard.
4. It leaves the loop if no detach is pending, or if the pending one is still `waited`. Otherwise it goes round again.

I added three scratch probes (§3, source in §6). They use a Chrome-like fake: `attach` throws "Another debugger…" while
the previous session is still attached, and a detach lands only when the probe releases it.

**(a) A refusal missed?**
- **The cases.** A refusal can land:
  - during the first wait (V3's test);
  - during a second wait. P-LOOP-REFUSE: a detach starts during the guard's own await, and the tab is blocked while the
    keeper waits for that detach.
- **Results.** Both are refused `DOMAIN_BLOCKED`, with no attach and no side effect. P-LOOP-REFUSE ends with `order`
  `["attach","fx1","detached"]`.
- **No gap after the loop.** Between the loop's exit and `this.live(tabId)` / `sessions.begin` there is no `await`.
  So nothing can come between the last re-check and the attach decision except the attach itself, as before the fix.
- **Not new.** The post-attach `tabCheck` (F1 P5) and `record.killed` still cover the attach's own latency.
- **Running the guard more than once is harmless.** `CallSafety.effect()` (`safety-call.ts:282-291`) reads the gate and
  installs DNR rules only once per call, and only for navigation classes. No debugger method is in a navigation class,
  and `effect()` is already run more than once per call elsewhere (`checkFinalUrl`). The fixer's Revisit-if holds.

**(b) An unbounded loop or wait (F5, #347)?**
- **P-BOUND.** A detach that never settles holds the next use **1008 ms**, and the guard runs once on that use
  (`guards: 2` across two uses). The use then goes on and gets Chrome's "Another debugger…" answer. That is S4a's
  accepted F5 behaviour.
- **Mutant L2noexpiry.** It drops `now === waited`, so the loop leaves only when no detach is pending. It is red on two
  shipped tests: F5 in `debugger-keeper.test.ts`, at 5004 ms, and T6. So the "do not wait twice on an expired bound"
  clause is pinned.
- **Each turn needs a new detach.** A further turn needs a detach that **started** during the guard. That needs a kept
  entry on the tab: a `release`, or an `onDetach` on an attached entry. The waiting use creates none of these, so each
  turn takes another call's session on the same tab, and the turns are bounded by the concurrent calls.
- **Each turn is bounded too.** Every turn costs at most 1 s plus one guard read.
- **Not new.** This is the same shape as `settled`'s own loop since S4a, so I raise no finding.

**(c) A false `DEBUGGER_CANCELLED`, and is V4-1 still fixed?**
- **V4-1.** `settled` is unchanged by the fixer, and the V41rev mutant is still red.
- **P-LOOP.** A detach starts while the guard awaits. The fixed code waits for it, runs the guard again and attaches
  cleanly, answering `ok`: `order` `["guard","attach","fx1","guard","detached","guard","attach","fx2"]`.
- **Without the loop** (mutant L1noloop: one `settled`, then one guard), the same probe fails. The attach is issued
  while the old session is still attached, so on this fake the call answers "Another debugger…" (`DEBUGGER_DEVTOOLS`).
  With Chrome's first-in-first-out order (T6) it would answer `DEBUGGER_CANCELLED` instead. The fixer's reason for
  the loop is therefore real.

**(d) Does any answer change against 0.6?**
- **The refusals.** The refusal codes and texts are those of the guard and `refusalError`, as before. On the old order
  the V3 case answered `ok` after a late post-check, which refused the reply. The new order refuses before any side
  effect, and the refusal is the one the post-check would have given.
- **The overlap answer.** It is unchanged: the busy check stays after the loop.
- **Time only.** The guard now runs after the wait, so its read is fresher. V6 (the wait comes out of `timeoutMs`) stands
  as the fixer says.

## 4. Findings

### N1 · MINOR · `extension/src/debugger-keeper.ts:138-149` / `extension/test/s4b-keeper-wiring.test.ts:323-355`: the loop's second turn is untested
- **Evidence.** Mutant L1noloop (the loop replaced by one `settled` and one guard) leaves all 2471 extension tests
  green: `Tests 2471 passed (2471)` (§2). The scratch probes P-LOOP and P-LOOP-REFUSE go red under it (§3).
- **Why it matters.** The fixer's proposed decision rests on that turn: without it, a detach that starts during the
  guard's await is not waited for. That reopens F5's "Another debugger" race, which gives a false `DEBUGGER_DEVTOOLS`
  or, with Chrome's first-in-first-out order, a false `DEBUGGER_CANCELLED`. No test would catch it if the loop were
  later simplified away.
- **Why only MINOR.** The code is correct today and nothing is left attached.
- **Fix.** Add P-LOOP (about 30 lines, §6), or its refusal variant, to `s4b-keeper-wiring.test.ts`. The file is at 355
  lines against a 375 cap. One test fits; both would go to about 415. That is within §7's 1.5× bound for tests, and
  would have to be stated as a deviation.

### Notes (no severity)
- **Process: the fixer's mutants.** The fixer ran its mutants on the main-tree files, restoring them and checking md5
  afterwards (S4b-fixer.md §7). The other lane works in the same tree, so this is a risk to record, not a defect. I
  found the main tree's slice files byte-identical to what I tested, and `git status` shows only the slice's files and
  reports.
- **V5 and V6 are open as the fixer left them.** V5 is the lane deviation of `handlers/console.ts`, to be declared in
  the stage report. V6 is the wait taken out of `timeoutMs`, for KEEP-2.
- **Gating facts still open** from `S4b-verifier.md` §3–§4: CON-KEPT (0.6's "answers do not change" for
  `browser_console_messages`) and SWEEP-HELD (#335's pre-ship measurement).
- **The fixer's other claims.** Every count and mutant result the fixer claims (`S4b-fixer.md` §2) matches what I
  re-derived: 5027 tests, +6 in the new file, code 152, tests 355, and M7–M13 and V3 each `1 failed`.

## 5. Handoff
- The scratch worktree was removed (`git worktree list` shows only the main tree). No process is left running, no port
  was bound, and no Chrome or daemon was used.
- No tracked file was edited in the main tree. I did not read or touch the other lane's files.
- The probe source is in the evidence file (§6), for the fixer of N1 if the step agent sends one.
