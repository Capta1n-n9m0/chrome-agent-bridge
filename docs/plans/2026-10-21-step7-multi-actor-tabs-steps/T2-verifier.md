# T2 verifier — Daemon: handles, leases, visibility lock, tab intercept

Verifier: Claude Opus 5.5, 2026-10-22. I did not build this stage. I read the builder's claims (in
`T2.ledger.md`) as claims to check, not as facts. I tested the uncommitted T2 lane from the main
tree (`daemon/src/`, `daemon/test/`, `mcp/test/extension-down.test.ts`) in clean worktrees, never in
the main tree. Every test bound port 0. I killed no process. I removed both worktrees at the end.
This file is the only write I made to the main tree.

## Verdict: **PASS-with-notes**

Every exit check from T2.1 to T2.5 passes, and so does every Stage 0 addition. I found nothing
CRITICAL or MAJOR, and nothing that loosens a lease or the lock.

- 19 code mutations: the stage's own tests catch 17.
- Two mutations survive: the one-deadline rule for a waiter that gets the lock late, and the lease
  re-check after the lock wait. My attack tests ATK-L5 and ATK-L6 catch both. Adding those two tests
  is the main note (V1, V2).

## Test counts

| Base | Full suite | daemon | `mcp/test/extension-down` |
|---|---|---|---|
| HEAD `9322f24` (worktree, `npm ci`) | 600 passed / 43 files | 137 | 2 |
| `9322f24` + T2 lane | **666 passed / 48 files** | **203** (16 files) | 2 |
| HEAD `0240c7c` (T1 committed), base | 676 passed / 47 files | 137 | 2 |
| `0240c7c` + T2 lane (the combination to be committed) | **742 passed / 52 files** | 203 | 2 |

Both bases gain +66 tests and +5 files, which equals the daemon's growth (137 → 203). The builder
claimed "203/203 daemon" after its fix round, and that is confirmed. Typecheck and build both exited
0 on both bases. I ran the daemon suite 3 times on `9322f24`+T2 and got 203/203 each time, then 2
more times with the attack file added and got 215/215 each time. No flakes.

## Checks

| # | Check | Command (in the worktree) | Result |
|---|---|---|---|
| 1a | typecheck | `npm run typecheck` | exit 0 (both bases) |
| 1b | full suite | `npm test` | 600/43 → 666/48; 676/47 → 742/52 |
| 1c | build | `npm run build` | exit 0 (both bases; daemon, MCP and extension bundles built) |
| 1d | flakiness | `npx vitest run daemon/` ×3 | `Tests 203 passed (203)` ×3 |
| 2 | T2.1–T2.5 and the Stage 0 additions | see the next table | all PASS |
| 3 | new tests fail with the change reverted | `git checkout HEAD -- daemon/src` (new modules removed, new tests kept) | 5 new files fail at import; with only `methods.ts` restored, `tabs.test.ts` fails **30/30**; `multiplex` (edited) and `extension-down` pass on HEAD source, as expected for a ruled fake-only edit |
| 3 | mutations | `scratchpad/run-mutations.sh` (19 mutations) | 17 caught; M9 and M12 survive (V1, V2), and the attacks catch both |
| 4 | attacks | `zz-attack.test.ts` (12 tests) | 12/12 pass on the T2 code; ATK-L5 fails under M9; ATK-L6 fails under M12 |
| 5 | the extension never sees `tab` | `tabs.test.ts` `afterEach` checks every request the fake proto:2 extension received; ATK-W1 | PASS: no `tab` key; every tab-carrying method gets a numeric `tabId` (the one exception is `networkClear` with `{scope:"all"}`) |
| 6 | log hygiene | `grep -rn "lastUrl\|url" daemon/src/log.ts daemon/src/wsHost.ts daemon/src/main.ts` → empty; the only new log calls are `intercept.ts:146` and `intercept.ts:374`; `git diff HEAD -- daemon/src/log.ts` → empty | PASS: the two new lines hold counts, a handle and a client name; `redact` is unchanged; the test `afterEach` asserts no `://`, host or title in any log line |
| 7 | Step 6 tests unedited except the two ruled edits | `git diff HEAD --stat -- daemon/test mcp/test` | only `multiplex.test.ts` (5 lines) and `extension-down.test.ts` (13 lines) changed |
| 8 | lane | `git status --short daemon mcp shared sdk` | only T2's lane; `shared/` and `sdk/` untouched; `0240c7c` changed nothing in `daemon/ shared/ mcp/ sdk/` |
| 9 | the spec | the code read against spec §5, §6, §10, decisions #39–#44, #52–#54 and the Step 6 D2 contracts | no contradiction that loosens anything; findings V3–V9 |
| 10 | the builder's 12 proposed decisions | — | not on disk (the ledger only refers to them); I audited the decisions the code implies instead (below) |

### Exit checks (pre-registered)

| Check | Result | Evidence |
|---|---|---|
| T2.1 `npm test` is at least the old count plus the new tests; typecheck green | **PASS** | 600 → 666 (and 676 → 742); typecheck exit 0 |
| T2.2 the plan's list of cases is covered | **PASS** | `tabs.test.ts`: "A's newTab is held by A; B's click → TAB_HELD naming A; A disconnects → B can claim"; "tabReplaced keeps A's handle valid…"; "tabRemoved → tabGone … TAB_GONE with lastUrl/lastTitle"; "two concurrent screenshots serialise"; "focusTab and selectTab wait while a screenshot holds the lock"; "LOCK_TIMEOUT {holder}…"; "the holder disconnecting releases the lock at once…"; "opener rule … an unleased opener's popup stays unheld". `handles.test.ts`: "keeps a dead handle for 1 h, then forgets it" and "keeps at most 1 000 dead handles" |
| T2.3 no `tab` key; a numeric `tabId` | **PASS** | the "T2.3: every tab-carrying method…" test covers all 16 `TAB_METHODS`, each through both the handle path and the legacy path, plus an unlisted method; the `afterEach` checks every request in every test. Mutation M5 (forward `tab`) breaks 17 tests |
| T2.4 as superseded by #41 | **PASS** | legacy path: "legacy: no tab → the human's tab, numeric tabId, no lease, one log line per client"; "…held by another client → TAB_HELD"; "…a screenshot without tab takes the lock (FIFO behind a holder, or LOCK_TIMEOUT)". The download methods succeed without `tab` ("free methods need no lease…"). `networkClear` on a foreign tab gives `TAB_HELD` |
| T2.5 (corrected) no log call carries a URL | **PASS** | the grep is empty; the new log calls print counts, a handle and a name only |

### Stage 0 and ruling additions

| Item | Result | Evidence |
|---|---|---|
| Download methods without `tab` succeed (#39, F2) | PASS | the free-methods test: params forwarded byte-equal |
| A legacy `screenshot` takes the lock (F5, V3 fix) | PASS | the legacy screenshot test; M2 (skip the lock when the target is active) breaks it |
| `VERSION` plus the reload hint for a no-proto extension (#42) | PASS | the "a no-proto extension" test: `snapshot`, `click`, `screenshot`, `closeTab`, `networkClear all` and an unlisted method with `tab` all answer `VERSION`; free methods go through unchanged; no resync. M7 breaks it |
| One deadline (#44, F9) | PASS for the holder; **untested for a late waiter** (V1) | holder: "one deadline (#44)…" (`TIMEOUT` between 5000 and 6500 ms). Late waiter: ATK-L5 (mine) passes at about 7 s, and M9 fails it |
| F15 resync | PASS | the "F15: a reconnecting extension…" test; M17 breaks 28 tests |
| F20 race | PASS | the three F20 tests; M6 and M13 break them; ATK-E3 (two `newTab`s in flight) passes |
| Ruling #4 (#54): a bare number is a legacy id; an unknown one → `TAB_UNKNOWN` | PASS | the "legacy: a bare number…" test; M18 breaks it. See V5 for `networkRequests` |
| Ruling #3 (#53): `selectTab` takes the lock | PASS | M16 breaks 2 tests |
| Ruling #2 (#52): `{scope:"all"}` is forwarded, never `tab` | PASS | the free-methods test expects `{limit:3, scope:"all"}`; the `networkClear` test expects `{scope:"all"}`; M19 breaks it |

### T1 facts checked (step agent's request; T1 code at `0240c7c`)

| Fact | Result |
|---|---|
| (a) The extension answers `TAB_UNKNOWN` for "No tab with id"; the daemon answers `TAB_GONE` for a handle it knows was removed, before forwarding | PASS: `resolveHandle` (`intercept.ts:317-327`) runs before `forward`; the `tabRemoved` test asserts `ext.reqs("click")` has length 0. If a tab closes before its `tabRemoved` event arrives, the extension's `TAB_UNKNOWN` passes through unchanged (a NIT, no change asked for) |
| (b) `current: true` only on the human's tab, omitted on the others | The daemon checks `t.current === true` (`intercept.ts:380`), so it works with both forms. The test fake sends `current: false` instead of omitting the field (V10, NIT) |
| (c) Unknown methods → `UNKNOWN_METHOD` | Consistent: an unlisted method with no `tab` is forwarded and the extension's answer passes through. An unlisted method with a `tab` is resolved and lease-checked first |
| (d) Hello `{type, token, role:"extension", proto:2}` | Matches: T1's `helloFrame` (`extension/src/client.ts:9`) and the daemon's `helloProto(data) >= 2` (`wsHost.ts`) agree; the fakes send the same frame |
| Network scope | T1's `resolveNetworkScope` reads `tabId` first, then `scope:"all"`, which matches what the daemon sends. `networkClearAll`'s probe `networkRequests {tabId, limit:1}` gets back `total` |

## Mutations (`scratchpad/mutate.mjs`, run over `daemon/` and `mcp/test/extension-down.test.ts`; 205 tests)

| Id | Mutation | Caught by |
|---|---|---|
| M1 | skip the lease check on the legacy path | 2 tests (legacy `TAB_HELD`; legacy `closeTab`/`selectTab`) |
| M2 | skip the lock when the target is the human's active tab | 2 tests ("…the human's active tab"; legacy screenshot) |
| M3 | the lock made LIFO | "VisibilityLock > is FIFO" |
| M4 | a waiter's timeout releases the holder | 2 tests |
| M5 | forward the `tab` key | 17 tests |
| M6 | drop the opener hold-back (F20) | 3 tests |
| M7 | drop the `VERSION` gate | 1 test |
| M8 | no lock release on disconnect | 1 test |
| **M9** | **a fresh wait after the lock is taken (the naive F9 version)** | **none** → ATK-L5 |
| M10 | `networkClear all` without the foreign-entries check | 1 test |
| M11 | `closeTab` not lease-checked | 2 tests |
| **M12** | **no lease re-check after the lock wait** | **none** → ATK-L6 |
| M13 | `newTab` does not override an opener grant | 1 test |
| M14 | no lease release on disconnect | 3 tests |
| M15 | an unleased opener's tab gets held | 1 test |
| M16 | `selectTab` outside the lock | 2 tests |
| M17 | no resync on hello | 28 tests |
| M18 | a network bare number not resolved or checked | 1 test |
| M19 | "all" forwarded without `scope` | 1 test |

## Attack tests (my own; kept in the scratchpad, not added to the main tree)

The file is `C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\c98ff063-f897-4628-815e-2841acf83300\scratchpad\zz-attack.test.ts`.
It uses the `tabs.test.ts` harness, so its `afterEach` T2.3 and log checks apply to every attack.
All 12 pass on the T2 code.

| Attack | What it shows |
|---|---|
| ATK-L1 | The holder's call times out (`TIMEOUT` at about 5.1 s). The lock passes once, FIFO (B before C). C stays queued while B holds it (status `{holder:"B"}`). A gets exactly one response |
| ATK-L2 | The holder also has a waiter of its own and disconnects. B gets the lock. A's late reply releases nothing. A's queued call is never forwarded. Afterwards the lock is `{}` |
| ATK-L3 | Two waiters pass their deadlines. Each rejects `LOCK_TIMEOUT {holder:"A"}` exactly once. The lock stays with A, is released once (D gets it), and B's next call waits behind D |
| ATK-L4 | The lock is taken after `tabs.claim {active:true}` of the human's tab. A legacy screenshot of a held human tab → `TAB_HELD`. Once that tab is unheld, the legacy screenshot still queues behind a holder |
| ATK-L5 | One deadline (#44): a waiter that gets the lock at about 1.5 s with `timeoutMs` 2000 times out at about 7.0 s (asserted ≥ 6900 and < 7600). Fails under M9 |
| ATK-L6 | A lease taken (by C) while B waits for the lock → B gets `TAB_HELD` when the lock is granted, and its call is never forwarded. Fails under M12 |
| ATK-E1 | An opener the daemon has never seen (id 9999), and an unleased opener → the new tab stays unheld; no `leaseGranted` |
| ATK-E2 | `tabReplaced` with both ids unknown → minted and unheld. Replacing an unheld tab into B's leased tab keeps B's handle and lease. The retired unheld handle gives `TAB_GONE`. No `tabGone` to B |
| ATK-E3 | Two `newTab`s in flight plus a popup from A's tab → the popup is held by A at once, its event waits for both `newTab`s, then is sent exactly once |
| ATK-W1 | `newTab`/`downloadStart` with a `tab`, legacy network numbers, `networkClear {tab:"active"}` and `tabs.*` → the extension never sees a `tab` key or a `tabs.*` method |
| ATK-N1 (probe) | Network entries naming a closed tab id (2) and a never-seen id (4242). Output: `{"entries":[{"tabId":2,"tab":"T2"},{"tabId":4242,"tab":"T3"}],"live":[["T1",1],["T3",4242]]}`, so a **live** handle T3 was minted for a tab id that no `listTabs` showed (V3) |
| ATK-D1 | A client disconnects while its legacy screenshot waits for `listTabs` → it never takes the lock; the screenshot is never forwarded |

## Findings

**V1 — MINOR — The one-deadline rule (#44) is not pinned for a waiter that gets the lock late.**
- Location: `daemon/src/intercept.ts:294` (`this.forward(method, forwarded, deadline)`).
- Evidence: mutation M9 replaces the deadline with `now + clamp(timeoutMs)` after the lock, and the
  stage's 205 tests still pass (`Tests 205 passed (205)`). ATK-L5 fails under M9.
- Why it matters: F9 lists "a waiter's deadline" as a required test. The existing #44 test covers
  only the holder.
- Suggested fix: add ATK-L5 (about 7 s of wall time; or an injected clock) to `tabs.test.ts`.

**V2 — MINOR — The lease re-check after the lock wait is untested.**
- Location: `daemon/src/intercept.ts:281-288`.
- Evidence: mutation M12 deletes the `checkLease` after `acquire`, and the stage's tests still pass
  (205/205). ATK-L6 fails under M12.
- Why it matters: this line is what stops "a call on a held tab let through", an integrity-floor
  item, when a tab is claimed during a lock wait.
- Suggested fix: add ATK-L6 to `tabs.test.ts`.

**V3 — MINOR — The F12 annotation mints a live handle for any tab id that appears in a network entry.**
- Location: `daemon/src/intercept.ts:472` (`lastHandleOf(tabId) ?? this.handles.mint(tabId)`).
- Evidence (ATK-N1): after a `networkRequests {tab:"all"}` whose entries name tab 4242, which no
  `listTabs` or `tabCreated` ever showed, `daemon.status` lists `["T3", 4242]` as live.
- Effect: the same happens for a tab whose dead handle was pruned after 1 h. Such a phantom handle
  can be claimed, and calls on it get the extension's `TAB_UNKNOWN` instead of `TAB_GONE`. It stays
  live until the next resync.
- This does not loosen a lease.
- Suggested fix: annotate with `lastHandleOf` only, and omit `tab` when there is none.

**V4 — MINOR (spec-side; contract-level, for the session agent) — The F15 resync cannot detect a tab id reused after a Chrome restart.**
- Location: `daemon/src/intercept.ts:126-147`.
- Effect: the resync marks a handle gone only when its `tabId` is missing from the new `listTabs`.
  Tab ids restart with each Chrome session. If the daemon outlives a Chrome restart, a leased handle
  whose old id shows up again in the new session stays live and leased. Its holder would then act on
  a different tab, possibly the human's.
- This follows F15's resolution exactly, so the gap is in the design, not in the build.
- What a fix needs: an extension-session marker (for example a start time in the hello, so a new
  Chrome session marks every handle gone). That would change the hello, so it is contract-level.
- Suggested home: a T5 row or a Step 8 item.

**V5 — MINOR (reconciliation) — #54 vs `networkRequests`.**
- Location: `daemon/src/intercept.ts:351-353` and `:461`.
- What the code does: #54 says a network bare number is "lease-checked". The builder made
  `networkClear {tab:<number>}` lease-checked (the test passes; M18 breaks it), and left
  `networkRequests {tab:<number>}` free.
- My view: the code is right. Spec §6.3 (calls touching no tab, `networkRequests` in any scope, are
  free) and plan 0.3 both say `networkRequests` is a free read in every form. A legacy number that
  is checked while the handle form `networkRequests {tab:"T3"}` stays free would make the old form
  stricter than the new one for no gain.
- Suggested fix: the session agent adds a dated note to #54 saying "lease-checked where the
  handle form is (`networkClear`); `networkRequests` stays free (spec §6.3)". This needs no code
  change.

**V6 — NIT — `route.ts` falls back to Step 6 forwarding when `ctx.tabs` is set but `ctx.caller` is missing.**
- Location: `daemon/src/route.ts:92`.
- Effect: such a request would skip leases and the lock entirely. It cannot happen today, because
  `WsHost` sets `caller` synchronously before any client frame is routed (`wsHost.ts`, the
  `ctx.caller = …` line). Still, the code fails open.
- Suggested fix: when `tabs` is set and `caller` is missing, answer `INTERNAL`. The Step 6 path would
  then run only when `tabs` is absent, which is what `route.test.ts` uses.

**V7 — NIT — The legacy log line also fires for a Step 7 client's network call without `tab`.**
- Location: `daemon/src/intercept.ts:349`.
- Effect: under #40, an absent `tab` is a normal Step 7 form, so after T4 this line will mislabel
  the MCP as "legacy". It logs no URL.

**V8 — NIT — `networkClearAll` checks, then clears, across several awaits.**
- Location: `daemon/src/intercept.ts:478-487`.
- Effects:
  - A tab that another client leases during the check could still be cleared.
  - A non-number `total` counts as "no entries", so the check fails open. T1's extension always
    returns `total`.
- Suggested fix: treat a non-number `total` as a refusal.

**V9 — NIT — F20 hold-back edge.**
- Location: `daemon/src/intercept.ts:429-453`.
- Effect: if B's `newTab` created the tab and B disconnects before the result, the opener grant to
  A stands. A then gets `leaseGranted` for a tab B opened. This is harmless (the tab really is
  A-opener-related in Chrome's view) and rare.

**V10 — NIT — The test fake differs from T1's `listTabs` shape.**
- Location: `daemon/test/tabs.test.ts:126,146`.
- Effect: T1 omits `current` on non-human tabs; the fake sends `current: false`. The daemon tests
  `=== true`, so both forms work.
- Suggested fix: make the fake omit the field, to mirror T1.

**V11 — NIT — The builder's "12 proposed decisions" are not in any file.**
- Location: `T2.ledger.md:21`.
- Effect: I could not audit them as written. I audited the decisions the code implies instead
  (below). The step agent should copy the builder's text into `T2.md` as the ledger says.

## Decisions the code implies (check 10): none loosens a lease or the lock

| Decision | Effect on leases and the lock |
|---|---|
| Legacy-id methods (`closeTab`/`selectTab`/`focusTab`) never fall back to the human's tab (`BAD_PARAMS "tab is required"`) | stricter |
| `focusTab` also accepts a legacy `id` (#41 names only `closeTab`/`selectTab`) | lease-checked and locked, so neutral |
| A no-proto extension gets free, `listTabs` and `newTab` calls exactly as in Step 6 (no mint, no lease) | tab methods are `VERSION` anyway, so neutral |
| No lease is granted to a client that has already gone (`newTab`, `claim`) | stricter |
| On a `tabReplaced` collision, a leased handle is never retired in favour of an unleased one | keeps leases |
| `tabs.claim {tab}` works without an extension; `{active:true}` needs one (NOT_CONNECTED, then VERSION) | neutral |
| No human's tab → `INTERNAL` with the #43 text (spec §10 has no code for it; F21) | neutral |
| `networkRequests` is free in every form, including a legacy number (V5) | as in spec §6.3 |
| The `TAB_HELD` message names MCP tools ("use browser_new_tab…") | wording only; scripts see MCP tool names (Step 8 may reword) |
| A lock waiter that disconnects before the lock is granted is dropped (`NOT_CONNECTED`) | as in 0.4 |

## Step 6 contracts (as-built § Stage D2): all hold

- The welcome is unchanged.
- `daemon.status` only adds `tabs` and `lock`.
- The error envelope always carries a `code`.
- `timeoutMs` is never forwarded: `forward` sends `{id, method, params}`, and `without()` never adds
  it.
- The wait stays `clamp + 5000`: with no lock, the wait is `deadline − now + 5000` and the deadline
  is taken at receipt.
- Other `daemon.*` methods still answer `UNKNOWN_METHOD`.
- `extensionStatus` semantics are unchanged.
- An unlisted method with no `tab` is still forwarded (Stage 0 F2 / C3a).
- `tabs.claim`/`tabs.release` were forwarded in Step 6 and are now handled by the daemon, as the
  plan says.

## Re-check after fix round 1 (2026-10-22)

I re-checked only the items the fix affects. The fixer changed only `daemon/src/intercept.ts` and
`daemon/test/tabs.test.ts` in the main tree. The re-check ran in a fresh worktree at `0240c7c`, with
T2's lane copied from the main tree (`daemon/src`, `daemon/test`, `mcp/test/extension-down.test.ts`)
and `npm ci` (exit 0). The worktree is now removed.

### The full suite

| Check | Command | Output |
|---|---|---|
| typecheck | `npm run typecheck` | exit 0 |
| full suite | `npm test` | `Test Files 52 passed (52)` · `Tests 746 passed (746)` (742 before the fix, +4 new tests) |
| build | `npm run build` | exit 0 |
| daemon ×3 | `npx vitest run daemon/` | `Tests 207 passed (207)` on all 3 runs |

### Each finding

Each mutation below was run over `daemon/` and `extension-down` (209 tests) with
`scratchpad/run-mutations.sh`.

| Finding | Check | Result |
|---|---|---|
| V1 | ATK-L5 is in `tabs.test.ts:635`; mutation M9 (a fresh wait after the lock) | `1 failed \| 208 passed`: ATK-L5 (verifier V1) fails. **Fixed** |
| V2 | ATK-L6 is in `tabs.test.ts:660`; mutation M12 (no lease re-check after the lock) | `1 failed \| 208 passed`: ATK-L6 (verifier V2) fails. **Fixed** |
| V3 | `intercept.ts:474-475` uses `lastHandleOf` only. Test "V3: … a never-seen tab id gets no tab and no live handle": the entry `{id:"2", tabId:4242}` has no `tab`, and `daemon.status` tab ids are `[1]`. Mutation V3r (put the `mint` back) | `1 failed`: the V3 test. **Fixed** |
| V8 | `intercept.ts:484-500`: `hasEntries` starts `true`; a probe that throws, or a `total` that is not a number, counts as "has entries". The V8 test covers `total:"lots"` → `TAB_HELD`, and a probe error → `TAB_HELD` with `{owner:"A", since}`; in both cases `networkClear` is never forwarded. Mutations V8r_fail_open and V8r_nonnumber_open | each `1 failed`: the V8 test. **Fixed** |
| V10 | The fake's tabs (`tabs.test.ts:125-126`, `:146`) leave `current` out except on the human's tab; "no human's tab" removes the field (`:522`, `:795`); `grep "current: false"` over `daemon/test` and `mcp/test/extension-down.test.ts` finds nothing | **Fixed** |

The other findings were not part of this fix round and stand as written above: V4, V5 and V11
(open, for the session agent), and V6, V7 and V9 (NITs).

### Final verdict: **PASS-with-notes**
