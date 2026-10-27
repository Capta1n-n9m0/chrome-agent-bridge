# Step 12 S4a — the kept debugger session: fixer, round 1

Model / effort: Opus, medium. Date 2026-10-27. Role: fixer (`docs/agent-rules.md` §6). Slice start `c6ad96f` (HEAD
`5e9ef9a`; the commits in between touch only `recipes/` and `docs/`). Not committed (brief: Commit no). Lane:
`extension/src/debugger-keeper.ts`, `extension/test/debugger-keeper.test.ts`.

## 1. Verdict

**DONE.** F1 (P1, P2, P5), F2, F3 and F5 are fixed test-first. F4 is a handoff note: the `KeptUse.drop()` doc now
names S4b's obligation and nothing is wired. One partial dispute on the fidelity of the verifier's P4 probe (§6).

## 2. Outputs

- At start, both files had the verifier's SHA-256 (`0ec81a4e…`, `a4bbc1f1…`).
- **Tests:** 9 new tests at the end of the test file, in the block "S4a fixer round 1". Two helpers come with them:
  `deferAttach` (Chrome's attach lands only on `finish()`) and `liveTargets` (`getTargets` reflects the fake's
  attached set, as Chrome's does).
- **The 35 existing tests are unchanged.** Lines 1–460 of the new file, with only the import addition reverted, hash
  to `a4bbc1f13cfc…` (the verifier's hash of the original). The one edit there is the import line, which adds
  `KEEPER_DETACH_WAIT_MS`.
- **Red before the fix.** The new tests ran against the pre-fix module plus the new constant alone, as scratch copies
  `zz-s4af-pre*`, deleted after: **9 failed | 35 passed (44)**. Each failure is for its own reason:
  - P1, P2, P5, P4: `expected true to be false`, meaning the tab was still attached.
  - The check-per-attach test: `called 0 times`.
  - The first F2 test: `DEBUGGER_CANCELLED`. The second: `DEBUGGER_CANCELLED` instead of `DOMAIN_BLOCKED`.
  - The F3 follow-on test: `DEBUGGER_DEVTOOLS`.
  - F5: `Test timed out in 5000ms`, because the wait is unbounded.
- **After the fix:** keeper file `Tests 44 passed (44)`.
- **The verifier's own probes** (copied from the evidence file §5, scratch, deleted): `1 failed | 4 passed (5)`.
  P1, P2, P3 and P5 are green. P4 is red because of how the probe is built; see §6.
- **`npm test`:**
  - Before: `Test Files 1 failed | 208 passed (209)`, `Tests 5 failed | 4938 passed (4943)`. All 5 failures are in
    another agent's new, untracked, in-progress `recipes/test/s12-r18.test.ts`.
  - After: `Test Files 210 passed (210)`, `Tests 4964 passed (4964)`, exit 0.
  - The change in the totals mixes my +9 (keeper 35 → 44) with the other agent's recipes files, which changed between
    the two runs (+1 file). No test was removed.
- **Type checks:** `tsc --noEmit` for shared, daemon, sdk, mcp and extension: each exit 0. `npm run typecheck`: exit 0.
  The seven `recipes/tsconfig*.json`: each exit 0.
- **Build:** `npm run build` exit 0, and `git status --short` was the same before and after it.
- **`git diff --stat c6ad96f -- daemon shared sdk mcp`:** empty. `git diff --stat c6ad96f -- extension`: empty (both
  files are untracked).
- **Logging:** `console.` count in the module is 0, so log sites are +0. `log-scan.test.ts` 16 passed and
  `log-sentinel.test.ts` 8 passed, in the full run.
- **Wiring:** the keeper is still imported nowhere.
- **Size (`wc -l`):** code 337 (cap 450); tests 596 (cap 675). Both are under their caps.
- **Exit checks still hold:**
  - D4.1 and the overlap rule: the original tests pass unchanged.
  - D4.2 and D4.3: the original tests pass unchanged. A guard still runs before every use. Also: the tab check runs
    once per fresh attach and never on a reused session (new test).

## 3. The fixes

- **F1 P1/P2.** When a use ends with its record killed (a disarm, or a refusing recheck), it now always detaches the
  tab and ignores the result. This happens whether or not its entry is still in the map. It brings back
  `runWithDebugger`'s "always detach" for killed sessions. The detach is tracked in `detaching`, so new uses wait for it.
- **F1 P5.** A use that attached a fresh session runs `tabCheck` once in its `finally`, before the session is kept idle.
  A refusal, or a throw (which counts as `DISARMED`), releases the session.
  - **Only fresh attaches need this.** A reused session's entry was in the map all the time, so `recheckTab` saw every
    page change.
  - **The use's answer is unchanged.** The call's post-check refuses the reply anyway.
  - **The use stays `busy` during the check.** Its promise has not settled yet, so a call that arrives in that time
    is an overlap.
- **F2.** A guard failure on a tab where another call's use is busy now follows `guardFailed`:
  - `DISARMED`/`DOMAIN_BLOCKED`: `release` with that refusal, so `killed` is set and the busy use ends with it
    (proposed decision 3).
  - Any other failure: mark the busy entry `drop`. The busy use keeps its answer and its session detaches when it ends.
  - `JS_DISABLED`/`UPLOAD_REFUSED`: kept, as before.
  - A guard failure with no busy use detaches, as before.
- **F3.** `onDetach` still forgets the entry at once, with no detach and the record ended. This is the behaviour the
  existing tests pin: `detaches() === 0`, and `sessions.size === 0` straight after the event. After that it reads
  `getTargets`:
  - If the tab still reads `attached: true`, or `getTargets` throws, it calls `detach` and ignores the result.
  - Since the event cannot say which session it ends, this is how a late event for an ended session avoids leaving
    a newer one orphaned.
  - When DevTools is the attached client, the extension's detach is a no-op "not attached".
  - Uses on the tab wait for this check.
- **F4.** The `KeptUse.drop()` doc now states the obligation and names each place S4b must handle:
  `evaluate/call.ts`'s quiet `Debugger.disable`, `console-messages.ts`'s `Runtime.disable`, trusted input's
  focus-emulation off, and `upload-files.ts`'s isolated world.
- **F5.** The wait for a pending detach is bounded by `KEEPER_DETACH_WAIT_MS = 1000`, using the injected timers; the
  timer is cleared after each wait. After the bound, the use goes on and its attach answers whatever Chrome says.
- **Refactor (behaviour unchanged):**
  - `release` now detaches through `detachTab`/`track`, the shared pending-detach bookkeeping.
  - `recheckTab` shares `check()`, which carries the same `UNREADABLE` refusal text as before.
- The module header was updated to match.

## 4. Deviations

None.

## 5. Proposed decisions

### 2026-10-27 · A late `onDetach` is checked against `getTargets` instead of detaching blindly
**Decided:** on `onDetach` the keeper forgets the session, then detaches the tab if `getTargets` still reads it attached,
or if `getTargets` fails. **Why:** this closes F3 without changing the 35 existing tests, which pin "forgotten without
a detach" when Chrome really ended the session. **Instead of:** the verifier's "release on every `onDetach`", which
would have meant editing the test at lines 296–309, and the brief keeps every existing test unchanged. **Revisit if:**
S4b measures that `getTargets().attached` is false while this extension's session is attached. **By:** Claude (proposed)

### 2026-10-27 · The post-attach tab check does not change the use's answer
**Decided:** a refusal from the one tab check after a fresh attach detaches the session, but the use still returns its
result. **Why:** the call's post-check already refuses that reply, and this keeps the keeper's answers the same as
`runWithDebugger`'s. **Instead of:** throwing the refusal from the `finally`. **Revisit if:** S4b finds a debugger
call whose post-check does not cover the tab. **By:** Claude (proposed)

### 2026-10-27 · A pending detach is waited on for at most 1 s
**Decided:** `KEEPER_DETACH_WAIT_MS = 1000`. **Why:** F5; it is the same order as the worker's other bounds.
**Instead of:** an unbounded wait. **Revisit if:** live runs show a detach that takes longer than 1 s, so that uses
read a false `DEBUGGER_DEVTOOLS`. **By:** Claude (proposed)

## 6. Findings

- **Partial dispute on probe P4 (evidence §5).** The probe's fake `getTargets` always answers `[]`, even while session 2
  is attached. Chrome reports `attached: true` for a tab with any debugger client, ours included. With a faithful fake
  (`liveTargets`), the new test "F3 P4" is red before the fix and green after it. The finding stands and is fixed; only
  the probe's fake misreports the state.
- The reachability of P1, P2 and P4 in real Chrome is still unmeasured, as the verifier noted. The fixes cost one no-op
  detach or one `getTargets` call when the race does not happen.

## 7. Handoff

- No process was left running and no port was bound.
- Scratch copies (`extension/src/zz-s4af-pre.ts`, `extension/test/zz-s4af-*.test.ts`) were deleted.
- `recipes/` was not touched.
- For S4b: the `drop()` obligations listed in the doc comment, and the items in the verifier's §5.
- A fresh verifier should re-check F1, F2, F3 and F5 only.
