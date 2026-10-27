# Step 12 S4a — the kept debugger session: fixer, round 2

Model / effort: Opus, medium. Date 2026-10-27. Role: fixer (`docs/agent-rules.md` §6), round 2 of at most 3. Slice
start `c6ad96f`, HEAD `5e9ef9a`. Not committed (brief: Commit no). Lane: `extension/src/debugger-keeper.ts` and
`extension/test/debugger-keeper.test.ts`. Findings: `S4a-verifier2.md` §5 (N1, N2 MINOR; N3 NIT).

## 1. Verdict

**DONE.**
- N1 and N2 are fixed test-first, each with a new test that is red on the pre-round-2 module.
- N3 is handled as a doc obligation for S4b on `KeeperDeps.tabCheck`, not as a bound in the keeper (§4).
- No dispute.

## 2. Outputs

- **At start:** module SHA-256 `7728fea55dd1…`, tests `6aad2e24676…` (both match verifier 2's hashes).
- **At end:** module `09bf647e9f91…` (347 lines), tests `37775c294e00…` (643 lines).
- **Size cap:** code 347 of 450, tests 643 of 675. Both are under their caps.
- **New tests:** 2, in a new block "S4a fixer round 2" at the end of the file, plus one helper, `cdpUse`. `cdpUse` is a
  use that fails as Chrome does when the session is gone.
  - **N1 A1:** a use killed by a transient tab-check failure ends after a newer session B was kept. B stays attached
    and idle. A sequential CDP use C answers `"c"` with 2 attaches in all, and the registry holds 1 session.
  - **N2 A2:** `onDetach`'s `getTargets` answers after the 1 s wait bound, and B attached in the meantime. B stays
    attached and idle, and C answers `"c"`.
- **Existing tests are unchanged.** Lines 1–460 hash to `6e5d6658…` both before and after. The round-1 block
  (lines 461–596) was not edited, because the new block is appended after it.
- **Red before the fix, on a scratch copy of the module:**
  - Setup: I copied the pre-round-2 module (SHA-256 `7728fea5…`, recorded before the copy) to
    `extension/src/zz-s4af2-pre.ts`. The real test file was pointed at it as `zz-s4af2-pre.test.ts`.
  - Result: `Tests 2 failed | 44 passed (46)`. N1 and N2 each failed with `expected false to be true` (the tab's
    session was gone).
  - Both scratch files were deleted afterwards.
- **After the fix:** keeper file `Tests 46 passed (46)`.
- **Verifier 2's own probes** (evidence §9, run as a scratch file in `extension/test/`, then deleted): `1 failed |
  12 passed (13)`. P1, P2, P3, P4, P5 and A1 to A7 are green, A1 and A2 included. The one failure is P4′, which
  verifier 2 marks as red by construction (its `getTargets` always answers `[]`).
- **`npm test`:**
  - Before: `Test Files 210 passed (210)`, `Tests 4964 passed (4964)`. This is verifier 2's run on the same tree
    before my edit (`S4a-verifier2.md` §6).
  - After: `Test Files 210 passed (210)`, `Tests 4966 passed (4966)`.
  - The difference is +2, my two tests. No other agent's test failed.
- **Type checks:** `tsc --noEmit` for shared, daemon, sdk, mcp and extension: each exit 0. `npm run typecheck`: exit 0.
  All seven `recipes/tsconfig*.json`: each exit 0.
- **Build:** `npm run build` exit 0, and `git status --short` was the same before and after.
- **`git diff --stat c6ad96f -- daemon shared sdk mcp`:** empty.
- **Logging:** the module's `console.` count is 0, so log sites are +0.
- **Wiring:** the keeper is still imported nowhere.

## 3. The fixes

### N1: the second detach moves from the use's end to the moment the attach lands

- **What changed:**
  - Right after `await this.deps.attach(tabId)` resolves, if the record is already killed, the keeper runs
    `await this.detachTab(tabId, k.record)`. This is the F1 P1/P2 case: the kill's detach may have reached Chrome
    before the attach did.
  - The `finally` no longer detaches a killed use. When the entry is still its own it calls `forget(tabId, mine)`,
    which unmaps the entry and ends its record. Otherwise it does nothing, because whoever unmapped the entry ends the
    record.
- **Why this is enough:** a kill that lands after the attach resolved issued its own detach after Chrome's attach. By
  the time the use ends, that detach would hit a newer session.
- **The round-1 fixes still hold:**
  - P1: the disarm kills a pending attach. The attach lands, the keeper detaches, and the `finally` forgets the entry.
    The registry ends at 0.
  - P2: the recheck's `release` unmapped the entry. The attach lands and the keeper detaches. The record ends after
    that detach settles.
  - The round-1 tests and verifier 2's P1 and P2 probes are green, including registry 0 and no pending timer.
- **One small change in ordering.** A use killed by a disarm after its attach landed now ends its registry record when
  the use ends, not after a second detach settles.
  - The disarm's own `detachAll` has already sent that session's detach, and new sessions are refused while
    disarmed. So nothing can attach in between and be missed.
  - Before round 1, `runWithDebugger` likewise ended its record after a single detach.

### N2: `onDetach` skips the detach when the tab's entry has an attach that resolved

- **What changed:**
  - `Kept` gains `attached: boolean`, set once Chrome's attach resolves.
  - `onDetach`'s check now detaches only when `getTargets` reads the tab as attached and no entry with
    `attached: true` is on the tab.
- **Why it is safe:** that entry's attach succeeded after the event. Chrome refuses a second attach on a tab that is
  already attached (m2 D5), so no orphan was attached at that point.
- **Why not verifier 2's first option** (skip whenever `kept.get(tabId)` holds any entry):
  - The entry could be a use whose attach is still pending, and that attach will fail because the orphan is still
    attached.
  - Skipping the detach then would leave the orphan outside the registry, and the disarm could not reach it.
  - With the `attached` flag, a pending entry does not stop the detach. That use's attach either fails first and
    answers `DEBUGGER_DEVTOOLS`, today's overlap answer, or it lands and is detached. Either way it fails closed.
  - I did not add a test for the pending case. The reasoning is recorded here, and the ordering would need a third
    deferred fake.

## 4. N3: a doc obligation, not a bound

- **What changed:** the `KeeperDeps.tabCheck` doc now says it runs on a fresh use's reply path and that the keeper does
  not bound it. S4b must make it settle promptly: `tabs.get` plus the state read, each bounded, with a timeout that
  throws and therefore refuses.
- **Why I did not add the bound in the keeper:**
  - It would add a timer on every fresh attach and every `recheckTab`.
  - It would need a new constant, and choosing its value is a design choice outside this round.
  - The doc obligation changes no behaviour and no existing test.

## 5. Proposed decisions

### 2026-10-27 · A session killed during its attach is detached when the attach lands, not when its use ends
**Decided:** the extra detach of F1 P1/P2 runs right after `attach` resolves on a killed record. The use's `finally`
sends none. **Why:** at the use's end a newer session may be kept on the tab, and detaching it gave a false
`DEBUGGER_CANCELLED` on the next sequential call (verifier-2 N1). **Instead of:** an unconditional detach at the
use's end (round 1). **Revisit if:** a live row shows a session left attached after a kill. **By:** Claude (proposed)

### 2026-10-27 · `onDetach`'s check spares a session whose attach resolved after the event
**Decided:** the keeper skips the detach when the tab's current entry has `attached: true`. **Why:** that attach
succeeded, so no orphan was attached at the time, and detaching would remove a live kept session (verifier-2 N2).
**Instead of:** skipping for any entry, which would leave an orphan when the entry's attach is still pending; or an
unbounded wait for the check, which would undo F5. **Revisit if:** Chrome ever allows one extension two attaches on a
tab. **By:** Claude (proposed)

### 2026-10-27 · S4b bounds `tabCheck`; the keeper does not
**Decided:** a doc obligation on `KeeperDeps.tabCheck` for S4b. **Why:** it keeps the keeper unchanged and needs no new
constant (N3). **Instead of:** racing `tabCheck` against the injected timers. **Revisit if:** S4b's `tabCheck` cannot
be bounded at its source. **By:** Claude (proposed)

## 6. Hygiene

- I edited only the two lane files and this report.
- The scratch files (`extension/src/zz-s4af2-pre.ts`, `extension/test/zz-s4af2-pre.test.ts`,
  `extension/test/zz-s4af2-probes.test.ts`) and the scratchpad copy were deleted.
- I did not touch `recipes/`, bound no port and left no process running.
