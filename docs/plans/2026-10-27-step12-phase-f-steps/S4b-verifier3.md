# S4b verifier 3: re-check of N1 after fix round 2

Opus, medium. Scope: `S4b-verifier2.md` N1 only. Read and run only; no tracked file edited.

## Verdict
**PASS**

## Evidence
| Check | Command | Result |
|---|---|---|
| The new test is where N1 asked | `grep -n "it(" extension/test/s4b-keeper-wiring.test.ts` | line 356, inside `S4b fixer (V3)` (line 323): "a detach that begins during the re-check is waited for and the re-check runs again (N1, probe P-LOOP)" |
| It pins the loop's second turn | read of the test | guard call 2 waits; `tabGone(7)` starts a slow detach during it; the fake refuses a second attach while attached (as Chrome); expects `second` resolves, order `attach,fx1,detached,attach,fx2`, `guards: 3` |
| Red with the loop removed | mutant on copies: `extension/src/debugger-keeper.n1v3.ts` (the `for(;;)` replaced by one `settled` + one guard, diff checked) and a test copy importing it; `npx vitest run <copy>` | `Tests 1 failed \| 17 passed (18)`; only the N1 test fails: `promise rejected "Error: Another debugger is already attach…" instead of resolving`. Both copies deleted; `git status --short` unchanged |
| Green on the current code | `npx vitest run extension/test/s4b-keeper-wiring.test.ts` | `Tests 18 passed (18)` |
| No product code changed since fix round 1 | `md5sum` | `debugger-keeper.ts 0f09d49d…`, `sw.ts 2fbea129…`, `handlers/console.ts 33d4ece4…`: equal to the restored values in `S4b-fixer-evidence.txt`; mtimes of all four product files (incl. `debugger.ts`, 07:17) predate `S4b-verifier2.md` (08:07); only the test file is newer (08:10) |
| No test removed | full suite | `Test Files 211 passed (211)`, `Tests 5028 passed (5028)`: 5027 (verifier 2) + 1; the file has 18 tests (17 before) |
| Types | `npx tsc --noEmit -p extension/tsconfig.json`; `npm run typecheck` | exit 0; exit 0 |
| Size | `wc -l extension/test/s4b-keeper-wiring.test.ts` | 380 lines against the 375 cap (1.01×, within 1.5×); the extra is tests; declared under Deviations in `S4b-fixer2.md` §4, as agent-rules §7 requires |

## Findings
None. N1 is fixed.

## Handoff
No processes, ports or worktrees. Scratch mutant files removed.
