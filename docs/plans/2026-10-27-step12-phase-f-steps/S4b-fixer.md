# Step 12 S4b — the kept debugger session: wiring the keeper (fixer, round 1)

Model / effort: Opus, medium. Date 2026-10-28. Role: fixer (`docs/agent-rules.md` §6). Deviations from the brief: none.
Findings fixed: V1, V2, V3 and V4 of `S4b-verifier.md`. V5 and V6 are not touched. Raw mutant output:
`S4b-fixer-evidence.txt`.

## 1. Verdict

**DONE.** All four findings are fixed. Each test the brief asked for is red under its mutant, and every existing test
still passes.

## 2. Outputs

**Changed files (the exact list for the committer, with the builder's slice files):**
- `extension/src/debugger-keeper.ts`: V3. `use()` now waits for a pending detach first and runs the re-check after it.
  A newer detach that starts during the re-check is waited for, and the re-check runs again. A detach whose bound
  already ran out is not waited for twice, so F5 still holds. The module comment's F5 line now says this.
- `extension/test/s4b-keeper-wiring.test.ts` (the slice's new file): `fakeChrome` takes an optional `reply`. Six tests
  are added:
  - V1: one static test of the `sw.ts` wiring.
  - V2: two pairs, each a control (the clean-up succeeds, the session is kept) and a failure (the clean-up fails, the
    session is detached when the call ends). One pair is for `consoleMessages`' `Runtime.disable`, the other for the
    `args` evaluate's `Debugger.disable`.
  - V3: one keeper test, a refusal that lands during the wait on a pending detach.
- `docs/setup.md`: V4.
  - The banner paragraph no longer says "about 10 s in all". It now says the session is detached about 5 s after the
    last call and that Chrome then takes a few seconds (5.0–5.2 s, Stage 0). After a disarm: "the banner then goes
    within seconds; 3–14 s measured".
  - The evaluate section's "about 10 s after the last one" is now "some seconds after the last one". The 10 s total is
    left to S8.1.
- `docs/plans/2026-10-27-step12-phase-f-steps/S4b-fixer.md` (this report) and `S4b-fixer-evidence.txt` are new.
- Not changed by me: `extension/src/debugger.ts`, `extension/src/sw.ts`, `extension/src/handlers/console.ts` (the
  builder's versions).

**Mutants** (each applied alone to the file in the main tree, restored from a copy and checked by md5 afterwards; test
set: s4b-keeper-wiring, debugger-keeper, safety-debugger, sw-static, safety-gate, s4-save-gate = 523 tests):

| Mutant | Result | Test that goes red |
|---|---|---|
| M7 `recheckAll` line removed | `1 failed \| 522 passed` | V1 static |
| M8 `onDetach` not forwarded | `1 failed \| 522 passed` | V1 static |
| M9 neither `tabGone` | `1 failed \| 522 passed` | V1 static |
| M10 no `recheckTab` | `1 failed \| 522 passed` | V1 static |
| M11 no sweep | `1 failed \| 522 passed` | V1 static |
| M12 `keepSessions` never called | `1 failed \| 522 passed` | V1 static |
| M13 `console.ts` back to a raw `chrome.debugger.sendCommand` | `1 failed \| 522 passed` | V2 consoleMessages (fails: true) |
| V3: the code before the fix (re-check before the wait) | `1 failed \| 522 passed` | V3 |

**§ Every stage:**
- `npx vitest run`: before `Tests 5021 passed (5021)` across 211 files (the verifier's after-count of the builder's
  slice, `S4b-verifier-evidence.txt` §1). After `Test Files 211 passed (211)`, `Tests 5027 passed (5027)`. That is +6,
  all in `s4b-keeper-wiring.test.ts` (11 → 17), and none removed. The 49 keeper tests still pass.
- Exit 0 for each of these:
  - `tsc --noEmit` per package: shared, daemon, sdk, mcp and extension;
  - `npm run typecheck`;
  - the seven `recipes/tsconfig*.json`: `.fe`, `.json`, `.s10`, `.s11`, `.s11b`, `.s6` and `.s9`;
  - `npm run build`.
- `git status --short` is identical before and after the build.
- Log sites +0. The only `console.` match in the `extension/src` diff is the `+++ b/…/handlers/console.ts` header.
  `log-allowlist.ts` is unchanged and `log-scan.test.ts` passes 16/16.
- **Size** (`git diff --numstat HEAD`, with the new test file counted whole):
  - code 152 added (debugger-keeper 88, debugger 47, console 2, sw 15), cap 250;
  - tests 355 (`wc -l`), cap 375;
  - docs/setup.md 9 added, 4 deleted.

## 3. Verifier verdict
Not applicable (fixer). The step agent sends a fresh verifier to V1–V4.

## 4. Deviations
None from the brief.
- **V1: how the test reads `sw.ts`.** It works line by line, not by regex. Each wiring line must appear as code: at
  column 0 for `keepSessions(` and `sweep()`, at four spaces inside the `touchesSafety` branch for `recheckAll`, and
  indented inside the first `onRemoved`, `onReplaced`, `onUpdated` and `onDetach` listener bodies.
- **The cost.** The test matches the whole line, comment included, so rewording one of those comments turns it red.
  That cost was taken on purpose, as `s4-save-gate.test.ts` does.

## 5. Proposed decisions

### 2026-10-28 · The kept session's re-check runs after the wait on a pending detach, and again if a newer detach began meanwhile
**Decided:** `DebuggerKeeper.use` now runs `settled()`, then `guard.effect()`, in a loop. The loop ends when no detach
is pending, or when the pending one is the one `settled()` already gave up on (its bound expired).

**Why:** V3. A refusal that lands during the wait now refuses the use. Moving the guard alone would have opened a new
gap: a detach starting during the guard's own await would not be waited for, which would reopen the "Another
debugger" race that F5 closed. The guard is therefore re-run after any newer wait.

**Instead of:** the guard before the wait (V3's window); or the guard after one wait with no loop (a new gap).

**Revisit if:** a guard turns out not to be safe to run twice in one call. `CallSafety.effect()` installs DNR rules
only for navigation classes, never for a debugger method.

**By:** Claude (proposed)

## 6. Findings
- **V6, after the V3 fix.** The `deadline` is still set before `withDebugger`, so the pending-detach wait still comes out
  of `timeoutMs`. That much is unchanged. What is new: the re-check now also runs inside that wait time, and a re-run of
  it adds its own duration, which is short. Still unmeasured; V6's KEEP-2 note stands.
- No new runtime fact.

## 7. Handoff
- No process is left running and no port is bound.
- The mutants ran on the main-tree files and were restored. The md5 values after the run are recorded in the evidence
  file and match the values before.
- I did not read or touch the other lane's files (S1-record, `docs/e2e-test-plan.md`).
- Nothing is committed. For the committer, the slice's files are:
  - `extension/src/{debugger,debugger-keeper,sw}.ts`
  - `extension/src/handlers/console.ts`
  - `extension/test/s4b-keeper-wiring.test.ts`
  - `docs/setup.md`
  - the steps-dir reports `S4b-builder.md`, `S4b-verifier.md`, `S4b-verifier-evidence.txt`, `S4b-fixer.md` and
    `S4b-fixer-evidence.txt`
