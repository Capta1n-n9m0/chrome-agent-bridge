# Step 12 S4a — the kept debugger session: the pure keeper (builder report)

Model / effort: Opus, medium. Date 2026-10-27. Start commit `c6ad96f`. Not committed (brief: Commit no).

## 1. Verdict

**DONE.**

## 2. Outputs

- `extension/src/debugger-keeper.ts` (new, 234 lines): `DebuggerKeeper`, `KEEPER_IDLE_MS = 5000`, the dep and use types.
- `extension/test/debugger-keeper.test.ts` (new, 460 lines, 35 tests). It was written before the module: it went red
  on the import (no module yet) and then green once the module was written.
- Size (`wc -l`): code 234 (cap 450), tests 460 (cap 675). Both are under their caps.
- `npm test` before: `Test Files 207 passed (207)`, `Tests 4881 passed (4881)`. After: `Test Files 208 passed (208)`,
  `Tests 4916 passed (4916)`. That is +35, all from the new file, and no test was removed. Both runs include the
  uncommitted recipes/test files of S1-helpers-b, and their count did not change between the runs.
- `npx tsc --noEmit -p {shared,daemon,sdk,mcp,extension}/tsconfig.json`: each exit 0. `npm run typecheck`: exit 0.
- The seven recipes tsconfigs (`tsconfig.json`, `.fe`, `.s6`, `.s9`, `.s10`, `.s11`, `.s11b`; from `ls recipes/tsconfig*.json`): each exit 0.
- `npm run build`: exit 0. `git status --short` was the same before and after the build, so the build made no tracked change.
- D4.4 first half: `git diff --stat c6ad96f -- daemon shared sdk mcp` prints nothing. `git status --short extension`
  shows only the two new files, so every existing extension test is unchanged.
- Log sites: there is no `console.` in the module (`grep` count 0). `extension/test/log-scan.test.ts` `Tests 16 passed (16)`.

## 3. Verifier verdict

None yet (a builder does not have one).

## 4. Interface (for S4b)

```ts
new DebuggerKeeper(deps: KeeperDeps)
KeeperDeps = { attach(tabId), detach(tabId), getTargets(): Promise<{tabId?, attached}[]>,
               timers: {set(fn, ms), clear(h)}, sessions: DebuggerSessions, tabCheck(tabId): Promise<SafetyRefusal|null> }
keeper.use<T>(tabId, fn: (u: KeptUse) => Promise<T>, {guard?: EffectGuard, mapError(err): Error}): Promise<T>
KeptUse.drop()          // a failed clean-up: detach when this use ends (its result stands)
keeper.onDetach(tabId, reason)   // chrome.debugger.onDetach: forget, no detach
keeper.tabGone(tabId)            // tabs.onRemoved, and the removed id of tabs.onReplaced
keeper.recheckTab(tabId)         // tabs.onUpdated (URL change): detach if tabCheck refuses
keeper.recheckAll()              // the storage.onChanged safety listener(s): re-check every kept tab
keeper.sweep(): Promise<number>  // worker start, not awaited at top level; uses await it internally
keeper.state(tabId) / keeper.size
```

The wiring S4b will need:
- `runWithDebugger(deps, tabId, fn, guard)` becomes `keeper.use(tabId, fn, {guard, mapError})`. `withDebugger`'s `fn`
  stays `() => Promise<T>`, which is compatible because the keeper passes `KeptUse` as an argument the callers can ignore.
  `runTrustedInput` calls `u.drop()` where it now warns "disable failed; detach clears it".
- Registration: `sessions` is the existing `debuggerSessions`. Each kept session is `begin`-recorded before its attach
  and `end`-ed after its detach settles. So the unchanged `sw.ts` disarm call (`debuggerSessions.detachAll(...)`)
  already detaches idle kept sessions. The keeper then sees `record.killed` and forgets the entry without a second
  detach. S4b does not need to change the disarm line.
- `tabCheck` is for S4b to build in `sw.ts`/`debugger.ts`. It reads the state and the tab's URL and returns the gate's
  refusal (disarmed, blocked, own page, `file:`). A throw counts as a refusal (fail closed).
- `getTargets` → `chrome.debugger.getTargets()`, timers → `setTimeout`/`clearTimeout`.

The rules as built:
- The order inside `use` follows today's `runWithDebugger`: first the registry's refusal, then the sweep's `ready`, then
  the guard, then a wait for any pending detach on the tab, then the overlap check, then the attach or reuse.
- An overlap includes a first use that is still attaching. It answers `mapError(new Error("Another debugger is already
  attached to the tab with id: N."))`, which is today's `DEBUGGER_DEVTOOLS`, and attaches nothing.
- Every use runs on the session's one registry record. A disarm marks that record killed, and so does a recheck that
  refuses while a use is busy. The use in flight then ends with that refusal. This answers stage0-audit-2's design point
  that each call needs its own killed marker: the record lives for one attach, and uses never overlap.

## 5. Tests mapped to exit checks

Each item below is one test in `extension/test/debugger-keeper.test.ts`.

**D4.1**
- Five sequential uses: 1 attach, 0 detaches. The fake attach throws Chrome's "Another debugger…" text on an attached
  tab, and no use reads `DEBUGGER_DEVTOOLS`.
- The idle detach: 0 detaches at 4999 ms and 1 at 5000 ms, on a fake clock.
- A use inside the bound restarts the bound.
- No idle timer runs while a use is in flight.
- A use after the idle detach attaches again (2 attaches).
- Two tabs get two sessions.

**The overlap rule**
- A second use while the first is busy: `DEBUGGER_DEVTOOLS`, 1 attach, and the first use completes.
- The same while the first use is still attaching.

**Registration (F3)**
- An idle kept session counts in `DebuggerSessions.size` until its detach.

**D4.2 (each trigger)**
- Disarm, idle: `detachAll` returns 1 and detaches the tab. The next use answers `DISARMED` with no attach. After the
  re-arm, the next use attaches again.
- Disarm during a use: that use ends `DISARMED`.
- The page becomes refused (blocked, own extension page, `file:`): three cases in `it.each`, each a detach.
- A block-list change (`recheckAll`) detaches only the tab it blocks.
- A block-list change during a use ends that use `DOMAIN_BLOCKED`.
- A tab check that throws: detach (fail closed).
- A recheck of a tab the keeper does not hold does nothing.
- Close, and replace: two cases in `it.each`. A failing detach is ignored, and the session leaves the registry.
- `onDetach` with `canceled_by_user`, `target_closed` and `replaced_with_devtools`: three cases. Each forgets the
  session with no detach call, and the next use attaches again.
- `onDetach` during a use: that use reads `DEBUGGER_CANCELLED`, as today, and nothing is detached after it.
- A call timeout (`TIMEOUT`, or any error of a use) drops the session, and the next use attaches again.
- A failed clean-up (`drop()`) detaches the session, and the use's result stands.
- A use right after a release waits for the pending detach, so it does not read a false "Another debugger".
- An attach failure maps as today (`RESTRICTED_URL`) and records no session.
- The start-up sweep:
  - The fake targets carry no `extensionId`. Only the attached tab targets are detached: 2 detaches succeed, and one
    "not attached" error is ignored.
  - A use waits for the sweep, so an orphan left attached by the old worker never reads as `DEBUGGER_DEVTOOLS`.
  - A `getTargets` that fails ends the sweep at 0, and uses still run.

**D4.3**
- The guard runs once per use and before the use's work, reused uses included. The recorded order is
  check, use, check, use, check, use.
- A refusing re-check on a kept session: the use's work does not run, and `DOMAIN_BLOCKED` detaches the session.
- `JS_DISABLED` keeps the session, and `DISARMED` detaches it.
- While the registry refuses, neither the guard nor an attach runs.

**Mutants.** I applied each one to a copy of the module, ran the test file, and restored the module (the restore was
checked with `diff`):

| Mutant | Result |
|---|---|
| M1: reuse without the re-check (the guard runs only before a fresh attach) | **red**, 3 failed / 32 passed (the three D4.3 tests) |
| M2a: keep across a disarm (kept sessions are not registered in `DebuggerSessions`) | **red**, 3 failed (registration; disarm idle; disarm during a use) |
| M2b: keep across a disarm (a killed record is reused) | **red**, 1 failed (disarm idle, then re-arm: the attach count stays 1) |
| M3: no wait for a pending detach | **red**, 1 failed (the release-wait test) |

## 6. Deviations

None from the lane or the caps.

Two places where I chose and did not follow a stated rule:
- **Clock:** I did not inject a separate clock. The injected timers are driven by a fake clock in the tests, and the
  idle bound is the only time the keeper reads.
- **Detach after a use's error:** the session is detached after *any* error of a use, not only after a timeout. This is
  a superset of "after a call timeout or a failed clean-up". It is in §7 as a proposed decision.

## 7. Proposed decisions

### 2026-10-27 · S4a: a kept session is dropped after any error of a use
**Decided:** a use that throws, for any reason, ends with a detach. A use that succeeds but whose clean-up failed calls
`KeptUse.drop()`, which also ends with a detach.
**Why:** the keeper cannot tell a timeout or a broken command, which may leave state behind (G-10), from a page error.
Every call detaches today, so this changes no answer and costs only the banner's continuity after a failed call.
**Instead of:** a list of error codes that keep the session.
**Revisit if:** live rows show page-error loops making the banner flicker.
**By:** Claude (proposed)

### 2026-10-27 · S4a: which re-check refusals detach
**Decided:** a guard refusal of `JS_DISABLED` or `UPLOAD_REFUSED` refuses the use and keeps the session, because these
are the call's class rules and say nothing about the tab. Every other refusal or failure (`DISARMED`, `DOMAIN_BLOCKED`,
an unknown error) also detaches the session.
**Why:** the brief says "for a blocked/disarmed reason, a detach", and an unknown failure is treated the same way, fail
closed.
**Instead of:** detaching on every refusal (stricter, but a JavaScript-off evaluate would end the session of a tab that
may still be used).
**Revisit if:** the verifier or the user prefers a detach on every refusal.
**By:** Claude (proposed)

### 2026-10-27 · S4a: a refusing recheck ends a use in flight with the refusal
**Decided:** when `recheckTab` or `recheckAll` refuses a tab whose session is busy, the keeper detaches it and marks the
session record killed, so that call answers the refusal (for example `DOMAIN_BLOCKED`) and not `DEBUGGER_CANCELLED`.
**Why:** the call's post-check would refuse its reply anyway (#137), and STOP forbids a session on a blocked tab.
**Revisit if:** S4b finds a case where this changes an answer a test pins.
**By:** Claude (proposed)

## 8. Findings

There are no failed pre-registered checks.

The keeper adds one rule that #335 does not name: a use waits for a pending detach on its tab before it attaches.
Without the wait, a use that came right after a keeper detach would meet Chrome's "Another debugger…" and answer a
false `DEBUGGER_DEVTOOLS`. Mutant M3 shows the test that guards this.

## 9. Handoff

- No processes were left running. No port was bound.
- S4b wires the module: §4 lists the interface and where each listener calls it.
- Still open from #335 for before S4b ships: a scratch or Run 19 row that measures a sweep detach on a tab that another
  client holds.
