# Step 12 S4a — the kept debugger session: the pure keeper (verifier round 3)

Model / effort: Opus, medium. Date 2026-10-27. Role: verifier, fresh (`docs/agent-rules.md` §6). Scope: only the items
affected by fix round 2 of the uncommitted `extension/src/debugger-keeper.ts` (SHA-256 `09bf647e…`, 347 lines) and
`extension/test/debugger-keeper.test.ts` (`37775c29…`, 643 lines). Slice start `c6ad96f`, HEAD `5e9ef9a`. Raw output:
`S4a-verifier3-evidence.txt` (same folder; §n below means its sections).

## 1. Verdict

**FAIL**, on one MAJOR (V3-1).
- N1 and N2 are fixed, each new test is red on the round-2 revert, and N3 is handled as a doc obligation. No regression.
- The attack on the brief's case, a pending attach under `onDetach`, found something the brief did not expect. A late
  `onDetach` that arrives while the next use's attach is still pending forgets that pending entry. The attach then
  lands outside the registry: after a disarm the tab **stays attached** (V3-1).
- V3-1 is not new in round 2. It is red on the round-2 revert, and by reading the round-1 diff it is red on that
  module too. It is the F3 fix left incomplete, in the F1 class: a session no trigger reaches. Round 1 rated that
  class MAJOR. Today's `runWithDebugger` always detaches in its `finally`, so no such session can exist today.
- The fix is one line, and I checked it on a scratch copy (§4). This would be fix round 3 of 3.
- Three more items fail closed: V3-2 and V3-3 (MINOR), V3-4 (NIT).

## 2. Round-2 items

| Item | Result | Evidence |
|---|---|---|
| N1 (a killed use's end-of-use detach removes a newer kept session) | fixed: the second detach runs when the attach lands (`:155-156`), and the `finally` sends none (`:175-176`) | the N1 test is red on the revert (`expected false to be true`) and green on the real module (§2) |
| N2 (a slow `onDetach` check detaches the next session) | fixed for an entry whose attach has **resolved** (`:204`) | the N2 test is red on the revert, green on the real module (§2) |
| N2, the fixer's choice over "skip for any entry" | **agree**. My probe Q1 (an orphan from a late event, the next use's attach pending when `getTargets` answers): the real module detaches the orphan, and B answers `DEBUGGER_DEVTOOLS`, today's overlap answer. The alternative leaves the orphan attached, also after a disarm (`{orphan:true, afterDisarm:true}`). The repo's 46 tests all pass on the alternative, so only this probe tells the two apart. | §3 `probes-alt` |
| N2, the pending case the fixer argued but did not test | partly: no orphan is left, but the answer can change (V3-2) | §3 Q1b |
| N3 (`tabCheck` unbounded on the reply path) | handled as the `KeeperDeps.tabCheck` doc obligation (`:62-66`) | read |

**Red before the fix.** No copy of the pre-round-2 module (`7728fea5…`) exists. The scratchpad holds only verifier 2's
pre-round-1 `keeper.orig.ts` (`0ec81a4e…`), and the header wording cannot be rebuilt byte for byte. So I made
behavioural reverts on scratch copies (`mk.mjs`, §6):
- **pre** (both hunks reverted): `2 failed | 44 passed (46)`, N1 and N2 each failing `expected false to be true`.
- **n1** (N1 hunk only): N1 alone red.
- **n2** (N2 hunk only): N2 alone red.

Each new test therefore pins its own hunk.

**Tests unchanged.**
- Lines 1–596 of the test file hash to `6aad2e24…`. That is verifier 2's hash of the whole round-2-start file, so the
  35 original tests and the round-1 block are byte-identical (§1).
- Lines 1–460, with the import line reverted, hash to `a4bbc1f1…`, the original file.
- The fixer's figure "lines 1–460 hash to `6e5d6658…`" does not reproduce: `head -460 | sha256sum` gives `6f71b6a2…`.
  This is a bookkeeping slip only. The stronger 596-line match above settles the claim.

## 3. The kill matrix: killed sessions are not orphaned

I modelled Chrome as a queue of pending operations, completed in an order the probe chooses (`queuedChrome`, §6). The
matrix crosses five kills with five timings:
- **Kills:** a disarm; a recheck that refuses `DOMAIN_BLOCKED`; a recheck whose tab check throws; another call's guard
  refusing `DOMAIN_BLOCKED`; another call's guard refusing `DISARMED`.
- **Timings:** attach pending with the kill's detach reaching Chrome first; attach pending with the attach landing
  first; busy after the attach; idle; during the post-attach (P5) tab check.

Each case drains the queue, advances 10 s, then disarms. It asserts that no tab is attached without a registry record,
that nothing is attached after the disarm, and that `sessions.size` is 0.
- **Result: 25 of 25 green** on the real module (§3).
- So the N1 change (no detach at the use's end) did not reopen F1 P1, P2 or P5, F2, or F3 for **killed** sessions.
- F5's bound: no timer is left pending (the 10 s advance settles everything).

## 4. Findings

### V3-1 · MAJOR · `extension/src/debugger-keeper.ts:191-194`: `onDetach` forgets a pending entry, whose attach then lands outside the registry

- **Sequence (probe Q2, §3):**
  1. Session X is kept. Chrome ends X (Cancel), and its `onDetach` is still queued.
  2. A use on X fails, and X is released (this is F3's own premise).
  3. Use A attaches fresh; the attach is pending.
  4. The late `onDetach` for X arrives. `kept.get(7)` is A's entry, so `forget` unmaps it and **ends its registry
     record**.
  5. The check's `getTargets` answers before A's attach lands, and reads not attached. No detach is sent.
  6. A's attach lands. A is not killed, so it answers `"a"`. Its `finally` finds the entry not its own and does nothing.
- **Result:** `{ans:"a", orphan:true, afterDisarm:true, size:0}`. The tab is attached, the registry is empty, and
  `detachAll` does not detach it. The idle timer is never armed. Every later use on the tab answers a false
  `DEBUGGER_DEVTOOLS` until the human cancels the banner or the worker restarts (sweep).
- **If Chrome answers in order** (attach before `getTargets`; probe Q2b), the check reads the tab attached and
  detaches it. Then nothing is orphaned.
- **Reachability:**
  - It needs F3's premise, an `onDetach` that arrives after the command reply.
  - It also needs `getTargets` to answer while an attach is in progress (the attach waits on the renderer;
    `getTargets` does not) and to read that tab as not attached.
  - Both are unmeasured.
  - Round 1 rated F1 P1/P2 MAJOR on the same grounds: unmeasured ordering, but a defence the pre-slice code had is
    gone. `runWithDebugger` detaches in every `finally`, so this cannot happen today.
- **Introduced:** no. Red on the round-2 revert (§3 `probes-pre`). Round 1's `onDetach` has the same
  `forget`-then-check shape, so it is red there too.
- **Suggested fix (one line, checked):**
  - Change `:193` to `if (!k || !k.attached) return;`.
  - An event cannot be about an attach whose reply has not arrived. If it is (Chrome ended the session in that gap), the
    entry stays, the use's first CDP command fails, and the error path releases it. That fails closed and keeps today's
    answer.
  - On a scratch copy with this line, Q2 gives `{ans:"a", orphan:false, afterDisarm:false, size:1}`, Q2b is green, and
    the 46 keeper tests pass (§4).
  - Add Q2 as a test. It needs the out-of-order step: `getTargets` answered before the attach.

### V3-2 · MINOR · `debugger-keeper.ts:204`: the N2 pending case: a check that reads a landing attach detaches it

- **Sequence (probe Q1b):**
  1. A real `onDetach` arrives, and `getTargets` takes longer than 1 s.
  2. B stops waiting at the bound and attaches.
  3. B's attach lands in Chrome. `getTargets` answers and reads the tab attached. B's entry still has
     `attached: false`, so the keeper detaches B's session.
  4. B's attach reply arrives afterwards.
- **Result:** B answers `"b"`, and its entry is kept idle with no session behind it. The next sequential CDP call
  answers **`DEBUGGER_CANCELLED`** (`next:"DEBUGGER_CANCELLED"`). Nothing is left attached.
- The fixer's report says this case "lands and is detached … fails closed". That is true, but it leaves out the changed
  answer, which runs against 0.6 "Answers do not change".
- **Reachability:** it needs N2's condition (`getTargets` slower than 1 s) and this reply order.
- **Suggested fix:**
  - Bound `getTargets` inside `onDetach`'s check by `KEEPER_DETACH_WAIT_MS` on the injected timers, and detach on a
    timeout (fail closed).
  - The check's timer is set before any waiter's timer, so its detach is issued before the waiter's attach, and the
    late answer is ignored.
  - This also closes N2 without needing the `attached` flag in the check (it remains needed for V3-1).

### V3-3 · MINOR · `debugger-keeper.ts:170-171`: a slow post-attach (P5) check releases a newer session with a stale refusal

This is round-1 code, but it sits in the `finally` that round 2 reshaped.
- **Sequence (probe Q3):**
  1. A awaits its P5 `tabCheck`.
  2. A `recheckTab` refusal releases A.
  3. The page is allowed again. B's guard passes, and B attaches and is busy.
  4. A's stale check answers `DOMAIN_BLOCKED`. `release(tabId, …)` acts on whatever entry is now mapped, which is
     **B's**.
- **Result:** B ends with `DOMAIN_BLOCKED` although its own guard passed. Fails closed.
- **Suggested fix (checked, §4: Q3 then answers `"b"`):** `if (refusal && this.kept.get(tabId) === mine) await
  this.release(tabId, refusal);`. If A's entry is gone, whoever unmapped it already sent its detach.
- N3's bound on `tabCheck` narrows this window, but does not close it.

### V3-4 · NIT · `debugger-keeper.ts:156` with `:286`: F5's bound lets a queued second detach land after the next attach

- **Sequence (probe Q5):**
  1. A's attach is slow. A recheck kills A, and its detach queues behind A's attach.
  2. B stops waiting at the 1 s bound and queues its own attach.
  3. Chrome, first in first out: A lands; the first detach detaches A; B lands; A's second detach (issued when A's
     attach resolved) detaches **B**.
- **Result:** B answers `"b"`, and the next sequential call answers `DEBUGGER_CANCELLED`. Fails closed.
- **Introduced:** no. It is the same on the round-2 revert, where the second detach comes at A's end, also after B's
  attach.
- It falls under F5's Revisit-if ("Chrome's detach takes more than 1 s").
- **Possible fix:** when `release` hits an entry whose attach is pending, track the attach-then-detach as the tab's
  pending detach, so that waiters wait for both. Or leave it to S4b's measurement.

## 5. The fixer's three proposed decisions

1. **The killed-during-attach detach runs when the attach lands.** **Agree.** The kill matrix is green, and so is N1.
   Residual: V3-4, under F5.
2. **`onDetach`'s check spares an entry whose attach resolved.** **Agree** with the choice over "any entry" (Q1 shows
   the alternative orphans). Residuals: V3-1, a separate line in the same function, which this round should close; and
   V3-2.
3. **S4b bounds `tabCheck`; the keeper does not.** **Agree.** S4b's brief must carry the obligation. V3-3's fix is
   needed whatever the bound.

## 6. Regression checks

| Check | Result | Evidence |
|---|---|---|
| D4.1, D4.2, D4.3 and the overlap rule | hold: the 35 original tests and the round-1 block are byte-identical (596-line hash) and green | §1, §5 |
| Keeper file | `46 passed (46)` | §5 |
| Log sites +0 | `console.` in the module: 0. `log-scan` 16 passed, `log-sentinel` 8 passed | §1, §5 |
| `git diff --stat c6ad96f -- daemon shared sdk mcp extension` | empty (the keeper files are untracked) | §1 |
| Wiring | imported nowhere | §1 |
| `tsc` for shared, daemon, sdk, mcp and extension | each exit 0 | §5 |
| `npm run typecheck` | exit 0 | §5 |
| The seven `recipes/tsconfig*.json` | each exit 0 | §5 |
| `npm run build` | exit 0; `git status --short` the same before and after | §5 |
| Size cap (`wc -l`) | code 347 of 450; tests 643 of 675 | §1 |

**`npm test`:** `Test Files 2 failed | 208 passed (210)`, `Tests 5 failed | 4961 passed (4966)`.
- On the one re-run: `Tests 7 failed | 4961 passed (4968)`.
- Every failure is in another agent's untracked `recipes/test/s12-r18-static.test.ts` and `recipes/test/s12-r18.test.ts`.
  Their count changed between my two runs, so that work is in progress.
- Outside those two files, all 4961 pass.
- The total, 4966, matches the fixer's after-count; nothing was removed. As my brief says, I report this and do not
  touch `recipes/`.

## 7. Hygiene

- Scratch files were created in `extension/src/` and `extension/test/` (`zz-s4av3-*`) and all deleted; `ls | grep zz`
  gives 0.
- The two real files hash the same before and after (§1).
- `git status --short` is unchanged.
- No port was bound, no process was left running, and I edited no repo file other than this report and its evidence
  file.
- The probe source is in evidence §6, along with `mk.mjs` and `mkfix.mjs`.
