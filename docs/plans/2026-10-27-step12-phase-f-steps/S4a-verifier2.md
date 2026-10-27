# Step 12 S4a — the kept debugger session: the pure keeper (verifier round 2)

Model / effort: Opus, medium. Date 2026-10-27. Role: verifier, fresh (`docs/agent-rules.md` §6). Scope: only the items
affected by fix round 1 of the uncommitted `extension/src/debugger-keeper.ts` (SHA-256 `7728fea5…`, 337 lines) and
`extension/test/debugger-keeper.test.ts` (`6aad2e24…`, 596 lines). Slice start `c6ad96f`, HEAD `5e9ef9a` (in between,
only `recipes/` and `docs/` changed). Raw output: `S4a-verifier2-evidence.txt` (same folder; §n below = its sections).

## 1. Verdict

**PASS-with-notes.** Every round-1 item is fixed, and its test is red on the pre-fix module. The fixer's P4 dispute holds.
The regression checks all pass. The attack found two new MINOR races (N1, N2) and one NIT (N3). Both MINOR races fail
closed: no session stays attached, and the safety state is untouched. N1, though, is a side effect of the F1 P1/P2 fix,
and in a narrow window a sequential call can get a false `DEBUGGER_CANCELLED`. That runs against 0.6's "answers do not
change". The fix is a few lines, and I recommend it before S4b (round 2 of 3).

## 2. Round-1 items

| Item | Result | Evidence |
|---|---|---|
| F1 P1 (disarm while attach pending) | fixed: the tab detaches and the registry is empty | new test green; red on pre-fix (§2); my P1 probe green, also with `sessions.size 0` and no timer pending (§4) |
| F1 P2 (refusing recheck while attach pending) | fixed | same (§2, §4) |
| F1 P5 (blocked before the entry exists) | fixed by the post-attach `tabCheck` (`debugger-keeper.ts:160-163`). Only fresh attaches need it: a reused entry was in the map, so `recheckTab` saw it | two new tests, red on pre-fix (`expected true to be false`, `called 0 times`); P5 probe green, also with registry 0 and timers 0 |
| F2 (another call's guard failure on a busy tab) | fixed: `guardFailed` (`:257-268`). Non-`KILL_ON`: the busy use keeps its answer and the session detaches at its end. `DISARMED`/`DOMAIN_BLOCKED`: the busy use ends with the refusal | two new tests, red on pre-fix (`DEBUGGER_CANCELLED`); P3 probe green |
| F3 (late `onDetach` orphans a newer session) | fixed: forget, then read `getTargets` and detach if the tab still reads attached (`:181-197`) | new tests red on pre-fix; P4 green with a faithful `getTargets` (§4) |
| F5 (unbounded wait for a pending detach) | fixed: `KEEPER_DETACH_WAIT_MS = 1000` (`:42`, `:271-281`); the bound's timer is cleared on both outcomes | new test red on pre-fix (`timed out`); A7 probe: after an early-settling detach, only the idle timer is pending |
| F4 (handoff) | done as a doc obligation in `KeptUse.drop()` (`:68-74`). It names all four places; none is wired, which is correct for S4a | read |

**Red-before reproduced:** I used the pre-fix module (scratchpad copy `keeper.orig.ts`, SHA-256 `0ec81a4e…` =
round-1 evidence §1) plus only the new constant, with the real test file pointed at it. Result: **9 failed | 35 passed
(44)**, each failing for its own reason, exactly as the fixer claims (§2). On the real module: 44 passed (§3).

**Original 35 tests unchanged:** lines 1–460 with only the import reverted hash to `a4bbc1f13cfc…`, the round-1
verifier's hash of the original file (§1). The one difference is line 9, which adds `KEEPER_DETACH_WAIT_MS`.

## 3. The fixer's P4 dispute and the F3 fix: agree

- **The dispute.** The round-1 probe's `getTargets` always answers `[]`, so the fix cannot see the newer session. My
  P4′, which keeps that fake, stays red by construction. With a fake where any attached client reads `attached: true`,
  P4 is green (§4).
  - Chrome's `TargetInfo.attached` means "a debugger is already attached", whichever client it is. That includes this
    extension's own session, so `liveTargets` is the faithful fake.
  - This rests on the API's documented meaning, not on a measurement. The fixer's Revisit-if covers it.
- **DevTools after the F3 fix.** I modelled our session and a DevTools client separately (probe A5). After
  `replaced_with_devtools`, `getTargets` reads attached because of DevTools, and the keeper's `detach` throws "not
  attached", which is ignored. DevTools stays attached; the next use answers `DEBUGGER_DEVTOOLS` (today's answer); the
  registry is empty and no timer is pending.
  - `chrome.debugger.detach` acts only on the calling extension's own session, so it cannot detach DevTools.
  - `onDetach` produces no answer of its own. The only effect is that a use on that tab waits at most 1 s.
  - The same holds for `canceled_by_user`: the banner's Cancel ends the extension's sessions, `getTargets` then reads
    not attached, and no detach is sent.

## 4. The fixer's proposed decisions

1. **`onDetach` checks `getTargets` instead of detaching blindly.** **Agree.** It keeps the 35 tests and closes F3.
   Caveat: N2.
2. **The post-attach tab check does not change the use's answer.** **Agree.** The call's own post-check refuses the
   reply on a refused tab, which keeps `runWithDebugger`'s answers. Caveat: N3. The check sits on the reply path.
3. **The wait for a pending detach is bounded at 1 s.** **Agree.** The side effects are a false `DEBUGGER_DEVTOOLS` when
   Chrome's detach takes more than 1 s (the fixer's Revisit-if) and N2.

## 5. Findings

### N1 · MINOR · `extension/src/debugger-keeper.ts:166-168`: a killed use's second detach can detach a newer kept session

- **Sequence (probe A1):**
  1. Use A is busy in a wait that does not touch CDP.
  2. A `recheckTab` refusal kills A and unmaps it: a transient `tabCheck` throw (`UNREADABLE`), or a page that is
     blocked and then allowed again.
  3. Call B's guard passes. B attaches fresh and ends idle.
  4. A ends. Its `finally` now always runs `detachTab(tabId)`, and that detaches **B's** Chrome session.
- **Result:** the keeper holds an `idle` entry with no Chrome session behind it. The next sequential call C reuses that
  entry and answers **`DEBUGGER_CANCELLED`** (§5, "C's answer variant": `expected 'DEBUGGER_CANCELLED' to be 'c'`).
- **Introduced by round 1:** A1 passes on the pre-fix module (§5).
- **Fails closed:** nothing is left attached.
- **Today:** with per-call sessions, A's `finally` can also detach B, but only while B is in flight. A later C attaches
  fresh and succeeds. So under the keeper C's answer differs from today's (0.6 "Answers do not change").
- **Reachability is narrow and unmeasured.** A must keep running after its session was detached without issuing a CDP
  command, since `sendCommand` rejects on detach. And B's guard must pass inside that window.
- **Suggested fix.** The second detach is only needed when the kill landed before A's own attach resolved (P1/P2). So
  do it only then: right after `await this.deps.attach(tabId)` succeeds, if `k.record.killed` is set, `detachTab`, and
  drop the unconditional detach from the `finally`. A detach issued after the attach resolved is already ordered after
  it, so killed reused sessions need no second detach. P1 and P2 stay green.
- **Test:** add A1. The probe source is in evidence §9.

### N2 · MINOR · `debugger-keeper.ts:185-195` with `:279`: an `onDetach` check slower than the 1 s bound detaches the next session

- **Sequence (probe A2):**
  1. A real `onDetach` arrives, and `getTargets` answers after more than 1 s.
  2. Use B stops waiting at the 1 s bound and attaches.
  3. The late `getTargets` reads B's session as attached, and the keeper detaches it.
- **Result:** the same as N1. An `idle` entry with no session, and C answers `DEBUGGER_CANCELLED` (§5). Fails closed.
- **Reachability:** depends on `getTargets` latency (unmeasured; expected to be milliseconds).
- **Suggested fix:**
  - When `getTargets` answers, skip the detach if `this.kept.get(tabId)` now holds an entry. The `onDetach` forgot the
    old entry, so any entry present was created after the event, and its attach would have failed if an orphan were
    still attached.
  - Or keep the bound's wait from applying to the `onDetach` check.
- **Test:** add A2.

### N3 · NIT · `debugger-keeper.ts:160-163`: the post-attach `tabCheck` is on the reply path and has no bound in the keeper

- A `tabCheck` that never settles holds a fresh use's reply, and its session stays `busy` (probe A4, documented).
  `recheckTab` had the same dependency but was fire-and-forget.
- **Suggested handling:** S4b's brief should require `tabCheck` to be bounded (`tabs.get` plus the state read), or the
  keeper should race it against the injected timers and count a timeout as `UNREADABLE`.
- While the check runs, an overlapping call answers `DEBUGGER_DEVTOOLS` with 1 attach (probe A3). That is correct: the
  first call has not replied yet, so this is an overlap, not a sequential call.

### Attacks that found nothing

- **Release paths now detaching twice.**
  - `DebuggerSessions.end` is a `Set.delete`, so ending a record twice is harmless (`safety-debugger.ts:49-51`).
  - A second detach of a tab that is not attached is a no-op error, and it is ignored.
  - The only harmful case is N1.
- **Timers left armed.** No timer is pending after any detach path: `tabGone`, a recheck, `drop`, idle, a disarm on an
  idle session, P1, P2, P5 and A5 (probe A6 and the others).
- **Registry `begin`/`end` balance.** `sessions.size` is 0 after every release path (A6, P1, P2, P3, P5, A5).
- **An `onDetach` on a busy entry.** The entry is forgotten. The busy use's `finally` (not its own, not killed) does
  nothing, and its own error maps to today's `DEBUGGER_CANCELLED`. Read only, not probed.

## 6. Regression checks

| Check | Result | Evidence |
|---|---|---|
| D4.1, D4.2, D4.3 and the overlap rule | still hold: the 35 original tests are unchanged and green, and the new tests are additive | §1, §3 |
| Log sites +0 | `console.` count in the module is 0; `log-scan` 16 passed, `log-sentinel` 8 passed | §1, §7 |
| `git diff --stat c6ad96f -- daemon shared sdk mcp` | empty; `-- extension` also empty (both files are untracked) | §1 |
| Wiring | the keeper is imported nowhere | §1 |
| `tsc` for shared, daemon, sdk, mcp and extension | each exit 0 | §6 |
| `npm run typecheck` | exit 0 | §6 |
| The seven `recipes/tsconfig*.json` | each exit 0 | §6 |
| `npm run build` | exit 0; `git status --short` the same before and after | §6 |
| `npm test` | **210 files, 4964 tests passed**, exit 0 | §7 |
| Size cap (`wc -l`) | code 337 (cap 450); tests 596 (cap 675) | §1 |

The test count reconciles with round 1's 4916 tests in 208 files:

| Source | Tests | Files |
|---|---|---|
| Round 1 | 4916 | 208 |
| New keeper tests | +9 | 0 |
| Another agent's untracked `recipes/test/s12-r18-static.test.ts` | +12 | +1 |
| Another agent's untracked `recipes/test/s12-r18.test.ts` | +27 | +1 |
| **Now** | **4964** | **210** |

No test was removed.

## 7. Hygiene

- I edited no repo file other than this report and its evidence file.
- Scratch copies (`extension/src/zz-s4av2-pre.ts`, `extension/test/zz-s4av2-*.test.ts`) were created and deleted.
  The two real files hash the same before and after (§1, §8).
- I did not touch `recipes/`, bound no port and left no process running.
