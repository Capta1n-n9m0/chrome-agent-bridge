# S4b fixer 2: finding N1 (the keeper loop's second turn)

Opus, medium. Fix round 2, scope `S4b-verifier2.md` N1 only. No product code changed.

## 1. Verdict
DONE

## 2. Outputs
- **The new test**, in `extension/test/s4b-keeper-wiring.test.ts`, inside the `S4b fixer (V3)` describe: "a detach that
  begins during the re-check is waited for and the re-check runs again (N1, probe P-LOOP)". It is based on the
  verifier's P-LOOP (`S4b-verifier2-evidence.txt` §6). The fake allows one debugger per tab: attach throws "Another
  debugger is already attached" while a detach is still pending. The second `use`'s re-check (call 2 of the guard)
  waits. `tabGone(7)` starts a slow detach during that wait. Then the guard is released and the detach finishes. The
  test expects that `second` resolves, the order is `["attach","fx1","detached","attach","fx2"]` and the guard ran 3 times.
- **Red under the no-loop mutant:** `Tests 1 failed | 17 skipped (18)`, `promise rejected "Error: Another debugger is
  already attach…" instead of resolving`. The mutant has one `settled` and one guard, with no loop. It was run on
  copies (`extension/src/debugger-keeper.n1mutant.ts` and a test copy that imports it), and both copies were deleted
  afterwards. `debugger-keeper.ts` was never edited: md5 `0f09d49d90f2dc27aa13e37acba130c9` before and after.
- **Green on the current code:** the file shows `Tests 18 passed (18)`.
- **Full suite** (`npx vitest run`): 5027 → **5028** passed, 211 files, none removed.
- `npx tsc --noEmit -p extension/tsconfig.json` exit 0, then `npm run typecheck` exit 0.
- **Slice test lines** (`wc -l extension/test/s4b-keeper-wiring.test.ts`): 355 → **380**.

## 3. Verifier verdict
None for this round. A fresh verifier re-checks N1.

## 4. Deviations
- **Size:** the tests are at 380 lines, against the 375 preferred cap (agent-rules §7). That is 5 over and well within
  1.5×. The fake's deps were packed onto one line to keep it small. P-LOOP-REFUSE was left out, as N1 allowed ("or its
  refusal variant"). One test is enough to pin the loop.

## 5. Proposed decisions
None.

## 6. Findings
None new.

## 7. Handoff
No processes, ports or worktrees. The scratch mutant files have been removed. `git status` shows only the slice's
files and the reports.
