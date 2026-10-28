# Step 12 S6-G2 fixer, round 1: a trusted click or typing as one blocking action

Model / effort: Opus, medium. Role: fixer (agent-rules §6), round 1 of 3. Brief deviations: none. Nothing committed.

## 1. Verdict
**DONE.** I fixed MINOR-1, MINOR-2, MINOR-3, NIT-1 and NIT-3 as briefed. I changed nothing for NIT-2 or MINOR-4, as the brief
says.

## 2. Outputs
Files touched: `daemon/src/intercept.ts`, `daemon/test/s6-trusted-focus.test.ts`, and the §6.4 S6-G2 note in
`docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md`. I did not touch `methods.ts`, `shared/`, `extension/`, `sdk/`, `mcp/` or
`docs/setup.md`.

- **MINOR-1.** New test "fixer r1 (MINOR-1): the lease is re-checked after the lock wait". B's screenshot holds the lock. A sends a
  trusted click on T1. A releases T1 and B claims it. Then B's screenshot resolves. The test expects `TAB_HELD {owner:"B"}`, zero
  `focusTab` and zero `click` forwards, and the lock free. **Mutant M7b** removes the `checkLease` after `acquire`/`resolveHandle` in
  `trustedInput`: `Tests 1 failed | 15 passed (16)`, and the failing test is the MINOR-1 test. I restored the file and `cmp` showed
  it identical.
- **MINOR-3.** I took the conservative option. In `trustedInput`, after the focus forward and the caller and lease re-checks,
  `if (this.now() >= deadline) throw new BridgeError(ErrorCodes.TIMEOUT, \`Timed out before calling ${method}\`)`. The check sits
  inside the try, so the existing catch releases the lock at once and no input is forwarded. The message is the same as
  `forward`'s own TIMEOUT. New test "fixer r1 (MINOR-3)": `timeoutMs` 1000, and the focus resolves after 1000 ms. The test expects
  `TIMEOUT "Timed out before calling click"`, zero `click` forwards, and the lock free. **Mutant** (the check deleted):
  `Tests 1 failed | 15 passed (16)`, and the failing test is the MINOR-3 test. I restored the file and `cmp` showed it identical.
  I also updated the doc comment on the method.
- **NIT-1.** The pause now runs on the injected `sleep`: `void this.sleep(pause).then(release)`. No test needed a change, because
  the default `sleep` is `setTimeout`, which vitest's fake timers also fake.
- **MINOR-2 and NIT-3.** I edited the spec §6.4 note. The deadline bullet now says three things: the pause is 0 when the input
  settles at or past the deadline (a known edge); a focus that settles at or past the deadline answers `TIMEOUT` with no input
  sent; and the lock is then released at once. The contention bullet now says that a trusted input sent without its own
  `focusTab` (a raw client, or the SDK's `"none"` policy) brings its tab to the front and focuses its window, as `focusFirst` does.
- **Stale for S8's doc pass (I did not edit these):** `sdk/src/policy.ts:36` (the `"none"` policy: "send trusted input as is"),
  and `mcp/CLAUDE.md:54` (the F19 sentence "Focus and input are two calls, so another actor's capture … can come between them").

Checks, all run in the main tree with S5b's uncommitted work present:

| Check | Result |
|---|---|
| Daemon tests, `npx vitest run daemon` | 291 passed, 23 files |
| The slice's two test files | s6: 16 tests (was 14); methods: 9; all pass |
| Full `npm test` | before **5100 passed / 218 files**, after **5102 / 218**: +2, none removed, exit 0 |
| `npm run typecheck` | exit 0 |
| The 7 `recipes/tsconfig*.json` files (`npx tsc --noEmit -p`) | each exit 0 |
| `npm run build` | exit 0. `git status --short` was identical before and after the build |
| Log sites | +0 log calls in the `daemon/src` diff. The allowlist has 54 entries. `log-scan`: 16 passed |
| Size (`git diff --numstat` and `wc -l`) | code: `intercept.ts` +37/−1 and `methods.ts` +15, about 52 lines (cap 300). Tests: `methods.test.ts` +2 and the new file 380 lines, 382 in all (cap 450). Spec note: +40 |

## 3. Verifier verdict
Not applicable: I am a fixer. The round's verifier verdict was PASS-with-notes (`S6-G2-verifier.md`).

## 4. Deviations
None.

## 5. Proposed decisions
### 2026-10-28 · A trusted input whose focus settles at the deadline is not sent
**Decided:** if the daemon's `focusTab` forward settles at or past the caller's deadline, the input is not forwarded. The caller
gets `TIMEOUT "Timed out before calling <method>"`, and the lock is released at once. **Why:** before S6-G2, no forward ever started
after the deadline. This keeps that rule, and it means no keys land after the caller's time has run out. **Instead of:** forwarding
the input inside the 5 s slack (#44) and noting it. **Revisit if:** a live run shows real focus times near a short `timeoutMs`.
**By:** Claude (proposed)

## 6. Findings
None new. The mutant anchors first missed because `intercept.ts` has CRLF line endings. With CRLF-tolerant patterns, each mutant
removed exactly one line, and `git diff --no-index --stat` confirmed it.

## 7. Handoff
No processes are left running. Scratch copies are in the session scratchpad (`intercept.orig.ts`, `before.txt`, `after.txt`). A
fresh verifier needs to re-check only MINOR-1, MINOR-3, NIT-1 and the note.
