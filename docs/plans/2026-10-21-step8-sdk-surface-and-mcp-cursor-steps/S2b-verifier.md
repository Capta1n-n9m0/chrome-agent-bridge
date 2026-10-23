# S2b verifier report: the Step 6 compatibility path removed, `code` required, the session marker, handle numbers never reused, the minimized-window message

Verifier: Claude Opus 5.5, 2026-10-23. Independent of the builder. I edited nothing in the main tree except this
file, and committed nothing. Clean worktree at `53f68db` (later moved to `d72aeda`, see S2b.1), `npm ci`, S2b's
lane diff applied (`git diff -- daemon extension shared docs/e2e-test-plan.md mcp` plus the 4 untracked lane
files). The worktree was removed at the end.

**Verdict: PASS-with-notes.** No exit check fails. There are 3 MINOR findings and 4 NITs. One ESCALATED CHECK
(S2b.2's daemon grep) is reported separately and not counted in the verdict, as the brief says.

## Lane

`git status --short` (main tree) for S2b: 29 modified, 4 untracked lane files, and 2 docs (`S2b-builder.md`,
`S2b.ledger.md`). All of them are inside the lane:
- `daemon/src/{connection,handles,handshake,index,intercept,main,methods,wsHost}.ts`, plus the new `handle-mark.ts`;
- `daemon/test/*`;
- the extension files `client.ts`, `errors.ts`, `handlers/network.ts`, `handlers/tabs.ts`, `network-scope.ts`,
  `offscreen.ts`, `sw.ts`, `tabs.ts`, plus the new pure `session-marker.ts`;
- `extension/test/*`, `shared/src/error.ts`, and `docs/e2e-test-plan.md` (one hunk, SCREEN-4).

`git diff -- mcp` is empty, `route.ts` and `router.ts` are unchanged, and nothing under `sdk/` belongs to S2b.
While I worked, S4 committed (`26df11b`, `d72aeda`). Its commit touches only `sdk/` and docs, and none of S2b's
files. The lane diff stayed byte-identical to my patch (`cmp`: "lane diff unchanged").

## S2b.1: counts and arithmetic (met)

| | Command | Result |
|---|---|---|
| Before (HEAD `53f68db`, clean) | `npx vitest run` | **1370 passed, 75 files** |
| After (+ S2b lane) | `npx vitest run` | **1423 passed, 77 files** (exit 0) |
| After, on S4's HEAD `d72aeda` + S2b lane | `npx vitest run` | **1488 passed, 78 files**: S4's +65, consistent |
| typecheck (both bases) | `npm run typecheck` | exit 0 (the full chain: shared, daemon, sdk, mcp, extension) |
| build | `npm run build` | exit 0: `built daemon → dist/index.js`, `built mcp → dist/index.js`, `built extension → dist/` |

The builder's typecheck exit 2 came from S4's in-flight file in the shared tree. Clean, it is 0, also on top of
S4's commit.

**Re-derivation.** I diffed the full test names from vitest's JSON reporter, before and after
(`scratchpad/names.cjs`). 23 names disappeared and 76 appeared. Of these, **12 pairs are renames of an edited
test** (methods.test.ts ×4, tabs.test.ts ×1, target-tab.test.ts ×7: the describe rename moves 5, plus the
screenshot test and network form 1). So:
- **removed = 11**: methods.test.ts "an unlisted method is free without tab…"; tabs.test.ts legacy ×5 (`:981`,
  `:1003`, `:1016`, `:1038`, `:1066`); target-tab.test.ts "absent → the human's tab…", "selectTab is the same
  function as focusTab", "form 3 (legacy tab)…", "neither tabId nor scope nor tab → the 0.1 fallback", "form 3:
  anything else…".
- **new = 64**: connection 3, handle-mark 10, handles 1, handshake 1, main 1, methods 1, tabs 15, router 12,
  session-marker 16, tab-events 1, target-tab 3.
- **1370 − 11 + 64 = 1423.** Files: 75 + 2 = 77.

This matches the builder's tables exactly: the same 11 removed tests, and the same per-file new counts (64). The
builder's scoped count (1079 → 1132) has the same delta, +53.

## S2b.2 / S2.2: greps (met, except the escalated line)

Run in the worktree with the lane applied:
```
grep -rn "activeTab" extension/src                   → (empty) exit=1
grep -rn "selectTab" extension/src                   → (empty) exit=1
grep -rn "targetTab({}" extension/src                → (empty) exit=1
grep -rn "LEGACY_ID_METHODS\|selectTab" daemon/src   → daemon/src/methods.ts:43:  ["selectTab", "was removed in Step 8 — call focusTab"],   exit=0
grep -rnE "console\.(log|warn|error)\(.*(url|href)" extension/src → (empty) exit=1   (S2.4)
```

### ESCALATED CHECK (not counted in the verdict): the daemon grep reads one line

The literal result is **not empty, and the exit is 0**, so the check as worded does not pass. My judgement of
the hit:
- `REMOVED_METHODS` (`methods.ts:42-44`) is used in exactly one place, `intercept.ts:352-353`:
  `throw new BridgeError(UNKNOWN_METHOD, …)`. That is the first statement of `TabLayer.request`, before the
  deadline, `classify`, the connection check, resolution, the lease check and the lock.
- `selectTab` is absent from `TAB_METHODS` and `takesLock` (`methods.ts:61`: `focusTab` only).
- No alias exists in the daemon, and nothing forwards it: `ext.reqs("selectTab")` stays `[]` against a FakeExt
  that answers every method, including with an unknown handle, a handle held by another client, `{id}` or `{}`.
  With no extension connected the answer is still `UNKNOWN_METHOD`.
- Mutation M11 (refusal disabled) fails that test.

**Confirmed: the single hit is the refusal #85 item 4 requires, and nothing else.** Rewording the check (for
example, requiring exactly that one `REMOVED_METHODS` line) is the session agent's ruling to make.

## S2b.3: removals (met)

The tests exist and are discriminating. Each mutation below was applied in the worktree, run, and restored:

| Contract | Test | Mutation → result |
|---|---|---|
| no `tab` → `BAD_PARAMS "tab is required"` | tabs "S2b.3: a tab call without tab…"; methods "locate through the TabLayer…" | M13 (refusal deleted) → 4 failed |
| unlisted method without `tab` → `BAD_PARAMS` (proto:2), `VERSION` (no-proto) | tabs "S2b.3 (#81 F8)…"; no-proto test edited | M12 (`untargeted` → `free`) → 4 failed |
| numeric network `tab`, as a number **and** a numeric string → `BAD_PARAMS` | tabs "S2b.3 (#40, #54)…" | M17 (string regex dropped) → 1 failed |
| `selectTab` → `UNKNOWN_METHOD` against a fake that would answer it | tabs "S2b.3 (#85 item 4)…" | M11 → 1 failed |
| `closeTab`/`focusTab` with `id` (alone or beside `tab`) → `BAD_PARAMS` | tabs "S2b.3: closeTab/focusTab with a Chrome id…" | M18 → 1 failed |
| extension `targetTab` without `tabId` → `BAD_PARAMS` (S2.3) | target-tab "absent → BAD_PARAMS…", screenshot test | M19 (fallback restored) → 2 failed |

I diffed every edited test (`git diff -U2/-U3` of `daemon/test/{tabs,methods,multiplex}.test.ts` and
`extension/test/{target-tab,capture}.test.ts`). Only the removed form changed:
- `:779` keeps the lock assertion `expect(ext.reqs("focusTab")).toHaveLength(0)` byte-identical. Only the second
  waiter changed, from `selectTab {id:102}` to `focusTab {tab}`.
- T2.3 lost only its legacy second call. `TAB_METHODS.size * 2` became `TAB_METHODS.size`, and the per-request
  `tabId`/no-`tab` checks are unchanged.
- The no-proto test moved `slow` from the forwarded list to the VERSION list.
- In methods.test.ts the `locate` TAB_HELD check now goes through `{tab:"T1"}`.
- The multiplex routing probes became free methods.

Spot mutations on the edited lease/lock tests:
- **L1** (`takesLock("focusTab")` → false): the edited `:779` test and the edited lock-class test fail.
- **L2** (`checkLease` skipped): 12 failed, including the edited `locate` test.
- **L3** (forwarded params keep `tab`): 22 failed. Separately, T2.3 alone fails
  (`-t "T2.3"` → `1 failed | 55 skipped`).

## S2b.4: `code` required (met)

- **Type:** `shared/src/error.ts:10-14`: `WireError.code` is required. `fromWire(err: WireErrorInput)` is lenient
  and its body is unchanged.
- **Receipt, both peer kinds:**
  - tabs "S2b.4: a proto:2 extension's error without a usable code…" sends four codeless shapes (`{message}`,
    `code:""`, `code:5`, `code:null`). Each arrives as `INTERNAL` with its message, in turn, so none is dropped or
    timed out.
  - `{code:"WEIRD"}` passes through verbatim.
  - Exactly one line is logged, `extension error without code: snapshot`, although `click` also failed codeless.
    No `boom-SECRET` text is in any log line. A new connection gets its own line.
  - "a no-proto extension's codeless error is INTERNAL as before, with no log line" covers the other peer kind.
  - connection.test.ts covers the hook directly.
- **Mutations:**
  - M14 (hook not passed) → 1 failed;
  - M15 (fires every time) → 2 failed;
  - M16 (fires for no-proto too) → 1 failed;
  - M20 (`toWireError` lets an empty code through) → 2 router tests failed.
- **Sender side:** router.test.ts has 12 tests that send every throw shape. They are labelled a regression guard,
  as F17 asks.

## S2b.5: the session marker (met)

Daemon branches, in tabs.test.ts with a real WsHost:
- same marker (and the first hello) → nothing retired, the lease stays;
- changed (A→B);
- audit §2 B6;
- dropped (A→none);
- never (none→none) → nothing retired;
- none→A (the step agent's ruling).

The changed-marker test checks:
- the resync's `listTabs` is **held**, and `tabGone` still arrives, so the retire is synchronous;
- `tabGone` goes to each holder exactly once, re-checked after the resync;
- each retired handle's `tabGone` and later `TAB_GONE` data carry the pre-restart `lastUrl` **and** `lastTitle`,
  never the reused page's;
- the reused ids 1 and 2 get new unheld handles `T4`/`T5`, and nothing is forwarded on the old handle;
- `extension session changed: 3 handles retired` is logged, and no log line contains either marker or `SENTINEL`.

Mutations:
- M4 (no retire) → 4 failed: the four retiring branches. The two no-retire branches pass, as they should.
- M5 (none→A not retired) → 1 failed.
- M7 (`HandleTable.retireAll` kills nothing) → 4 failed.
- M22 (marker appended to the log line) → 3 failed.
- **M6 (the retire releases no lease) → 0 failed**: Finding 2.

Extension, `extension/test/session-marker.test.ts` (pure, 16 tests):
- `chooseMarker` ×5;
- the five event orders of #80 (worker restart; reload, with the "onInstalled after connect() within the bound"
  variant; onStartup before connect(); onStartup after connect() within 2 s; neither);
- the rulings: chrome_update → fresh; both events → fresh; a late onStartup after a reuse rotates; a late
  onStartup after a fresh marker does nothing; memoised; a failing store → fresh.

Mutations:
- M1 (onStartup no longer wins) → 1 failed;
- M2 (session not reused) → 3 failed;
- M3 (no rotation) → 1 failed;
- M21 (hello omits `session`) → 1 failed.

## S2b.6: the minimized message (met)

- `extension/src/tabs.ts:81-82`: `SWITCH_MINIMIZED_MESSAGE = "Chrome's window is minimized, so the tab cannot be
  captured — restore the window, or call focusTab first"`. This is exactly the required text, and `captureOnce`
  throws it (`:185`).
- `grep -rn 'pass mode:"cdp"' extension/src extension/test` → empty, exit=1.
- `capture.test.ts:92-95` asserts the new text, with a comment citing #63.
- `git diff docs/e2e-test-plan.md` has one hunk, at SCREEN-4 (line 677). It adds a dated *Superseded* note on
  the expected text, and Run 8's recorded result is untouched.

## S2b.7: the Step 7 cross-package test (met)

- `git diff -- mcp` is empty.
- `npx vitest run mcp/test/multi-actor.test.ts` → 4 passed. The Step 7 fake sends no marker, so it is the
  none→none case.

## S2b.8: the removal list (met)

The builder's list of 11 removed tests, each with its form, equals my re-derivation (S2b.1). Its edited-test
table covers every one of my 12 renames, plus the edits that kept their names (network form 1/2, the
`beforeEach`, the `FakeExt` harness, capture.test.ts). The builder flags `multiplex.test.ts` as not in Stage 0's
list.

## S2b.9: the handle mark (met)

- handle-mark.test.ts "a second table started against the first's mark never re-mints…".
- tabs.test.ts "S2b.9: a second daemon on the first's mark…": two real WsHosts on one temp directory. The second
  daemon's lowest handle is above the first's highest, and the first's stale `T<n>` → `TAB_UNKNOWN`, with nothing
  forwarded.
- An unreadable mark (not a number, or a directory) falls back to the start-time base from the injected clock,
  and is logged once with no path.

Mutations:
- M8 (`next = mark`) → 1 failed;
- M9 (the first write comes after the first return) → 4 failed;
- M10 (an unreadable mark starts at 1) → 1 failed.

The tests never use the real directory:
- every mark directory comes from `mkdtempSync(path.join(tmpdir(), …))` (handle-mark.test.ts:15,
  tabs.test.ts:1506, main.test.ts:382);
- `grep -rn "homedir\|chrome-agent-bridge\|HOME"` over those tests hits only a doc comment;
- `stateDir` appears in `daemon/test` only in the one main.test.ts test that passes a temp directory, so no other
  `runDaemon` test passes it;
- `~/.chrome-agent-bridge/` still holds only `daemon.log` (mtime 12:37) after all my runs.

## Design attacks

(a) **Marker.**
- A `storage.session` hit returns at once, with no wait and no `setBoth` rotation (`session-marker.ts:428`,
  order 1 test). A worker restart cannot change the marker.
- A Chrome restart cannot keep the marker in these orders: onStartup before connect(); onStartup during the wait;
  onStartup during `getLocal`/`setBoth`, since the flags are read after every await, and `rotate()` replaces
  `value` and `chosen`.
- Two concurrent `setBoth` writes are issued in order, so the rotated marker lands last.
- No top-level `await` (`grep "^await"` → none). `onInstalled`/`onStartup` are registered synchronously at the top
  level (`sw.ts:220`, `:224`). `void connect()` is at `:242`.
- The offscreen key is `port:token:session` (`offscreen.ts:13`), so a changed marker stops the old client and
  sends a new hello.
- The marker appears in no `console.*` call: the only ones in sw/offscreen/client/session-marker are lines
  181/189/205/209/210/217, and none carries it.
- Residual: Finding 1.

(b) **Retire.**
- `extensionConnected` runs `retireAll()` synchronously, then `void this.resync`. `setConnection` comes before it
  in the same tick (`wsHost.ts:242-246`), with no await in between.
- A waiter on the lock re-resolves after the grant (`intercept.ts:392-393`) and gets `TAB_GONE`.
- The holder's call is on the old socket, which ends by its answer, its deadline or `rejectAll` on close. FIFO
  order and the release paths are untouched.
- Old-socket events and a late resync are ignored (`intercept.ts:191`, `:208`).
- A no-proto hello counts as "none" (none ↔ A retires), which is stricter.
- An answer from the old socket after a retire can only come on a marker rotation, where Chrome is the same and
  the ids are consistent. After a real restart the old socket is dead.

(c) **Handle mark.**
- The ceiling is written before the number is returned (`handle-mark.ts:120-133`; M9).
- The write is atomic: temp file `<file>.<pid>.tmp`, then rename, and the temp file is removed on failure.
- ENOENT → 0; any other read error or non-integer → fallback.
- The fallback is `max(next, timeBase(now))`, never below a number already issued.
- `createHandleMark` runs before `listen()` (`main.ts:166-183`) but only reads. Writes happen only on `mint`,
  which needs a connection, so a losing daemon (EADDRINUSE → exit 0) never writes or advances the mark (it may
  log a line: NIT 7).
- No log line names the path or a number.

(d) **Removals.** Every one is stricter:
- the unlisted method (forwarded before, refused now);
- the numeric network `tab`;
- `id` beside `tab`;
- the no-proto unlisted call (VERSION).

What stays:
- A no-proto extension still gets free methods verbatim (#42).
- `tabs.claim {active:true}` is intact (`intercept.ts` claim path; tests green).
- The Chrome `id` stays beside `tab` (#81): the `listTabs`/`newTab` code is untouched, and the `:249`/`:276`/
  `:386`/`:406`/`:435` tests read it.
- A network call without `tab`/"active" → the human's tab, with no log line (#81; test).
- The extension accepts nothing without `tabId` except an explicit `id` on closeTab/focusTab: Finding 3.

**CLAUDE.md invariants.**
- `127.0.0.1` bind (`wsHost.ts:172`), the 30 s heartbeat (`:221`) and `route.ts` are unchanged.
- No `windows.update({focused:true})` was added: the only one is the existing `handlers/tabs.ts:61`.
- The webRequest listeners are still top-level (`sw.ts:59-84`), with no top-level await.
- No URL, title, marker or token is logged.

## Findings

1. **MINOR: a Chrome start whose `onInstalled("update")` precedes `onStartup` sends one hello with the old marker
   before rotating.**
   - Location: `extension/src/session-marker.ts:498-508` (reuse is chosen as soon as `installed` is seen, without
     waiting for `onStartup`).
   - Evidence: if onInstalled(update) fires first on a Chrome start (an unpacked or updated extension), `resolve()`
     reads `storage.local`, the first hello carries the old marker A, and the daemon resyncs the old handles by id.
     A late `onStartup` rotates the marker and a second hello retires them. Between the two hellos, a held handle
     can name a reused tab id. The window lasts until `onStartup` is dispatched, normally within milliseconds of
     the same worker start.
   - This follows #80 as written, adds the rotation (stricter), and is strictly better than before S2b. It is not
     a loosening, and the forbidden-fix clause (a marker that changes on a worker restart) is not hit.
   - Fix: when `installed` is a reload reason and `startup` is not seen, keep waiting a short grace (or the rest
     of the 2 s bound) for `onStartup` before reusing `storage.local`'s marker. An extension reload costs that
     wait once. Or record the window as an accepted residual under #80, and give SM-1 a row that watches for it.
2. **MINOR: the retire's lease drop is not pinned by any test.**
   - Location: `daemon/src/intercept.ts:176` (`this.leases.release(handle)`).
   - Evidence: mutation M6 (that line deleted) → `Tests 56 passed (56)`. The tests pass because leases are keyed
     by handle and the retired handles are dead, so a leaked lease is not visible through today's API. #74 and
     S2b.5 nevertheless state "leases dropped".
   - Fix: assert it, for example through the lease table, or through `daemon.status`/a `tabs.claim` path that
     would show an owner, in the changed-marker test.
3. **MINOR: the extension still accepts a Step 6 `id` on `closeTab`/`focusTab`.**
   - Location: `extension/src/handlers/tabs.ts:46` (`p.tabId ?? p.id`).
   - Evidence: the S2b daemon refuses any `id` (`intercept.ts:378-380`), so no Step 8 route reaches it, and a
     Step 7 daemon strips `id`. Only a Step 6 daemon forwarding raw `{id}` could use it, and even then it names
     an explicit tab. The brief did not list it, so I judge it out of S2b's stated scope, but it is the last
     extension-side Step 6 form.
   - Fix: read `p.tabId` only, at S2b or later, with a dated decision either way.
4. **NIT: three multiplex comments name the wrong refusal.** `daemon/test/multiplex.test.ts:141`, `:166`, `:196`
   say the unlisted method "is now refused BAD_PARAMS", but that fake is a no-proto extension (`:93`), where the
   refusal is `VERSION`. Reword them.
5. **NIT: `WireErrorInput` constrains nothing.** At `shared/src/error.ts:17-18`, the union includes `unknown`, so
   the type collapses to `unknown`. It documents the intent but enforces nothing. Harmless.
6. **NIT: SCREEN-4 keeps the old expected text inline, followed by the note.** At `docs/e2e-test-plan.md:677`
   this is consistent with "never edit a row's expected text after its run". A future run of SCREEN-4 must read
   the note to know the expectation. No change needed beyond awareness.
7. **NIT: a losing daemon can log a spurious line.** A daemon that loses the bind reads the mark before
   `listen()` (`daemon/src/main.ts:166-167`), so it may append `handle mark unreadable …` to the shared log before
   it exits 0. It never writes the mark.

## Mutation results (summary)

The runner is `scratchpad/mutate.cjs`: one string replacement, the named test files, then a restore. A full
suite re-run after all mutations: 1423 passed.

| # | Mutation | Failed |
|---|---|---|
| M1 | chooseMarker: onStartup no longer wins | 1 |
| M2 | storage.session not reused | 3 |
| M3 | late onStartup does not rotate | 1 |
| M4 | TabLayer retire disabled | 4 |
| M5 | none→A does not retire | 1 |
| M6 | retire keeps leases | **0** (F2) |
| M7 | HandleTable.retireAll kills nothing | 4 |
| M8 | mark re-mints (`next = mark`) | 1 |
| M9 | write after first return | 4 |
| M10 | unreadable mark → 1 | 1 |
| M11 | daemon selectTab refusal removed | 1 |
| M12 | untargeted → free | 4 |
| M13 | tab-required refusal removed | 4 |
| M14 | codeless hook not passed | 1 |
| M15 | codeless hook every time | 2 |
| M16 | codeless hook for no-proto | 1 |
| M17 | numeric-string network tab accepted | 1 |
| M18 | closeTab/focusTab id refusal removed | 1 |
| M19 | extension targetTab fallback restored | 2 |
| M20 | toWireError empty code through | 2 |
| M21 | hello omits session | 1 |
| M22 | marker in retire log line | 3 |
| L1 | focusTab not locked | 2 (edited `:779` + lock-class) |
| L2 | lease check skipped | 12 (incl. edited `locate`) |
| L3 | forwarded keeps `tab` | 22; T2.3 alone: 1 |

## Re-check (fixer round 1)

Verifier: Claude Opus 5.5, 2026-10-23. Input: `S2b-fixer1.md`, read as claims to audit. I used a clean worktree
at HEAD `d72aeda`, `npm ci`, and applied S2b's lane diff only (`git diff -- daemon extension shared
docs/e2e-test-plan.md` plus the 4 untracked lane files). `mcp/test/tools.test.ts` was excluded: it belongs to
another stage. The worktree was removed afterwards.

**Nothing else in the lane changed.** I compared the lane patch file by file with my first-pass patch. The
only tracked files that differ are the four the fixer names: `daemon/test/multiplex.test.ts`,
`daemon/test/tabs.test.ts`, `extension/src/handlers/tabs.ts` and `extension/test/target-tab.test.ts`. Among the
untracked files, `extension/src/session-marker.ts` and its test changed (mtime 15:18), as claimed.
`daemon/src/handle-mark.ts` and its test date from 14:41/14:38, before my first pass, so they are unchanged.
`sw.ts`, `intercept.ts` and every other source file are identical to the first pass.

**Counts.**

| | Result |
|---|---|
| HEAD `d72aeda`, clean (`npx vitest run`) | 1435 passed, 76 files |
| With the lane after fixer 1 | **1493 passed, 78 files** (exit 0) |
| Arithmetic | 1435 − 11 removed + 69 new (64 builder + 5 fixer) = **1493** |
| Test names (JSON diff) | still 11 removed, 12 renames, and 69 new |
| The fixer's 5 new tests | 3 in session-marker, 1 in tabs ("changed marker drops every lease"), 1 in target-tab ("a Step 6 id without tabId → BAD_PARAMS") |
| `npm run typecheck` | exit 0 in the clean worktree. The fixer's exit 2 came from the other stage's `mcp/test/tools.test.ts`. |
| `npm run build` | exit 0 (`built daemon`, `built mcp`, `built extension`) |

**Per item.**

| Item | Verdict | Evidence |
|---|---|---|
| F1 (marker reuse on a reload reason) | **fixed** | `session-marker.ts:131-139`: on a `storage.session` miss, one `delay` bound is created and never restarted. A reload reason then races `startupSignal` against **the same** bound before `storage.local` is read. The bound is created inside `if (!session && …)`, so a `storage.session` hit calls no `delay` and returns its stored marker (`chooseMarker` checks `session` first). The new wait therefore cannot delay a hit or change the marker on a worker restart. Mutations: **R1** (the new race removed) → 2 failed, the two new ordering tests. **R2** (a hit also waits) → 3 failed, the worker-restart and memoisation tests time out at 5 s. **R3** (a hit not reused) → 4 failed. Cost: an extension reload sends its hello up to 2 s later. `recipes/reload-extension.ps1` accepts an `extension resync` line stamped at or after the press second, within `$TimeoutSec` = 15 s (`:239-243`), so it still works. CLAUDE.md's "in the same second (5 of 5)" may need a dated note after a live reload (NIT, for the session agent). |
| F2 (the retire's lease drop not pinned) | **fixed** | The new tabs test: B's `networkClear {tab:"all"}` is refused `TAB_HELD` before the retire (the control) and forwarded after it. The reused id has a new, claimable handle, and `T2` answers `TAB_GONE`. Mutation **R4** (`this.leases.release(handle)` removed from `retireAll`) → `1 failed | 56 passed (57)`, the new test. |
| F3 (extension accepts a Step 6 `id`) | **fixed** | `handlers/tabs.ts`: `const raw = p.tabId;`, and the doc comment is updated. Mutation **R5** (`?? p.id` restored) → `1 failed | 34 passed (35)`, the new test. |
| NIT 4 (multiplex comments) | **fixed** | `multiplex.test.ts` comments now say "VERSION against this no-proto fake, BAD_PARAMS against a proto:2 one". |
| NITs 5–7 | unchanged | Not in the fixer's scope. They remain NITs. |

**Greps.** These are unchanged:
```
grep -rn "activeTab" extension/src                    → (empty) exit=1
grep -rn "selectTab" extension/src                    → (empty) exit=1
grep -rn "targetTab({}" extension/src                 → (empty) exit=1
grep -rn 'pass mode:"cdp"' extension/src extension/test → (empty) exit=1
grep -rn "LEGACY_ID_METHODS\|selectTab" daemon/src    → daemon/src/methods.ts:43:  ["selectTab", "was removed in Step 8 — call focusTab"],  exit=0
```

**ESCALATED CHECK (still not counted):** the daemon grep's single hit is unchanged. It is still the #85 item 4
refusal only, used once at `intercept.ts:352`.

**Final verdict after fixer round 1: PASS-with-notes.** Every exit check is met, and findings 1–3 and NIT 4 are
fixed, each confirmed by a mutation. NITs 5–7 remain, plus one new NIT: the CLAUDE.md reload-proof wording may
need updating now that a reload's hello can come up to 2 s after the press. The S2b.2 daemon grep stays a
separate ESCALATED CHECK.
