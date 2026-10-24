# S2c — verifier report ("Fix: failed re-arm write; narrow badge read", Step 9)

Verifier: Opus 5.5, 2026-10-24. Brief: `briefs/S2c-verifier.md`. No agents spawned, nothing committed, no
Chrome, no daemon, 9234 never bound. The builder's report (`S2c-builder.md`) was treated as claims and re-run.

**Verdict: PASS-with-notes.** E1–E6 hold. The fix closes the defect as specified; one residual interleaving
(F1, MINOR) leaves the same defect reachable in a narrower window, and the static check has two gaps (F2, NIT).

## Method
- Main tree before: `git status --short` and `git diff` saved to the scratchpad (`status-before.txt`,
  `diff-before.patch`).
- `git worktree add --detach <scratchpad>/wt 9a5366c`; copied in `extension/src/{safety-state,sw}.ts` and the two
  new test files from the main tree; `npm ci --prefer-offline` in the worktree (the `@bridge/*` links then point
  into the worktree, not the main tree).
- After: worktree removed (`git worktree list` shows only the main tree); `status-after.txt` identical to before
  (`diff` → no output, `STATUS_SAME`); `git diff` byte-identical (`cmp` → `DIFF_SAME`).

## Exit criteria

**E1 PASS.** On 9a5366c's sources (`git checkout -- extension/src/safety-state.ts extension/src/sw.ts` in the
worktree), `npx vitest run extension/test/safety-rearm-failure.test.ts extension/test/badge-stored-read.test.ts`:
```
Tests  8 failed | 2 passed (10)
× … the toggle rejects; memory, ingestView() and read() say disarmed … → expected { armed: true, … } to match object { armed: false, … }
× … the other fields survive the revert … → expected { armed: true, evaluate: false, …(1) } to deeply equal { armed: false, … }
× … the next press right after the failure is a retry … → expected 'disarmed' to be 'armed'
× … after a worker-start load of a disarmed state, a failed arm then a retry arms … → expected 'disarmed' to be 'armed'
× … an event after the failed re-arm is dropped as disarmed … → expected [ { id: 'r1', tabId: 5, …(7) } ] to have a length of +0 but got 1
× readStoredArmed … calls get once with exactly SAFETY_KEY_NAMES … → TypeError: readStoredArmed is not a function
× readStoredArmed … a missing key is the default … → TypeError: readStoredArmed is not a function
× static — no whole-area storage.local read … → expected [ 'sw.ts:366' ] to deeply equal []
```
With the fix: 10/10 (inside the full run below). Matches the builder's claim. The two `readStoredArmed` tests fail
on HEAD only by the missing export, as the builder said; their discrimination is shown by mutation instead
(M-h, M-i below), and the HEAD-shaped `get(null)` in `sw.ts` with the helper present is caught by the static test
(S-a, S-d).

**E2 PASS.** Worktree `npm test`: `Test Files 115 passed (115)`, `Tests 2670 passed (2670)` (baseline claim
2660/113; +10 tests, +2 files, all new). `git status --short extension/test` in the main tree: only
`?? extension/test/badge-stored-read.test.ts`, `?? extension/test/safety-rearm-failure.test.ts`; `git diff --stat
-- extension/test` empty — no existing test edited.

**E3 PASS.** `head -c 40 extension/dist/content.js` → `"use strict";\n(() => {`; `grep -cE "^\s*(import|export)\b"
extension/dist/content.js` → `0`. The `sw.ts` change is one arrow-function body inside the existing
`new BadgeController({…})` literal plus the import line; `grep -n addListener extension/src/sw.ts` shows the same
top-level listeners (lines 107–371); the only `await`s are inside functions (lines 212, 236, 257, 258);
`sw-static.test.ts` passes unchanged.

**E4 PASS.** `npx vitest run extension/test/log-scan extension/test/log-sentinel extension/test/safety-writers
extension/test/sw-static extension/test/badge extension/test/safety-state extension/test/safety-network` →
`Test Files 8 passed (8)`, `Tests 143 passed (143)` (the `badge` filter also matches the new
`badge-stored-read.test.ts`; the builder's 7 files/140 excludes it).

**E5 PASS.** Worktree `npm run typecheck` exit 0; `npm run build` exit 0; `git status --short` after the build:
` M extension/src/safety-state.ts`, ` M extension/src/sw.ts`, the two new tests — nothing else tracked changed.

**E6 PASS.** 2660 → 2670 (+10), 113 → 115 files.

## Mutation table
Each mutation applied to the fixed source in the worktree, `npx vitest run extension/test` (1449 tests) run, source
restored (script `mutate.mjs` in the scratchpad; worktree `git diff --stat` identical after).

| Mutation | Result | Caught by |
|---|---|---|
| M-a no revert (drop the revert line) | 5 failed | rearm-failure: toggle rejects/memory; other fields; next press is a retry; worker-start retry; ingest |
| M-b revert unconditionally (drop `this.mem === applied`) | 1 failed | rearm-failure: "a storage change … stands" |
| M-c revert moves `lastDisarmAt` (drop the `"revert"` exemption) | 3 failed | rearm-failure: next-press retry; worker-start retry; ingest |
| M-d revert sets `this.mem` directly (skips `onDisarm`) | 1 failed | rearm-failure: "toggle rejects … onDisarm fires after onArm" |
| M-e swallow the rejection (fall through to `"armed"`) | 7 failed | all 6 rearm-failure store tests + `log-sentinel` (its press expects `"arm-failed"`) |
| M-f swallow, return `"write-failed"` | 7 failed | same as M-e |
| M-g revert resets evaluate/blockList to defaults | 1 failed | rearm-failure: "the other fields survive" |
| M-h `readStoredArmed` asks `get(null)` | 1 failed | badge-stored-read: spy test |
| M-i `readStoredArmed` asks `[...SAFETY_KEY_NAMES, "token"]` | 1 failed | badge-stored-read: spy test |
| S-a `sw.ts`: `readStoredArmed(() => chrome.storage.local.get(null))` | 1 failed | badge-stored-read: static |
| S-d `sw.ts`: HEAD's `get(null).then(parseStoredSafety…)` back | 1 failed | badge-stored-read: static |
| S-b `sw.ts`: `readStoredArmed(() => chrome.storage.local.get(undefined as any))` | **survived** | — (F2) |
| S-c `sw.ts`: `chrome.storage.local.get(["token", ...keys])` | **survived** | — (F2) |

## Attack on the fix (read in full: the `safety-state.ts` and `sw.ts` diffs, `badge.ts`, `sw.ts` 25–60 and 330–381,
`safety-debugger.ts` refuse/detachAll)
- **Second queued `toggle()`**: `toggle` serialises on `chain` (`run.catch(() => {})`), so the second press runs
  after the revert; memory is disarmed and `lastDisarmAt` unmoved, so it is a retry (test "next press … retry").
- **`read()` during the pending write**: storage says OFF, so `read()` returns disarmed regardless of memory; the
  gate never admitted a call in the window (before or after the fix). Only the synchronous `ingestView()` and the
  next-press direction depended on memory; both are fixed.
- **`start()` during the pending write**: the load callback returns when `this.mem !== null`; no interaction.
- **`applyChanges()` that sets `armed` during the pending write**: the newer object stands (test; M-b).
- **`applyChanges()` that touches only `evaluate`/`blockList` during the pending write**: residual defect — F1.
- **A failed arm still rejects (#174)**: yes; M-e/M-f show tests require it.
- **Badge (#181/#182)**: `press` catches the rejection → `"arm-failed"`; `model.note` sets the failure; `refresh`
  reads disarmed (now from memory and storage alike) → `{kind:"arm-failed"}` → `OFF`, title "turning on failed…".
  The revert happens before the rejection propagates, so the refresh already sees the reverted memory. Badge tests
  and `log-sentinel`'s press sequence (`… "write-failed"`, `"arm-failed"`) pass unchanged.
- **`onArm` → `onDisarm` ordering**: `onArm` = `debuggerSessions.refuse(null)`; the revert's `onDisarm` =
  `detachAll(DISARMED_ALL, …)` (which sets the refusal again, `safety-debugger.ts:8-9,57`) + `clearDownloads()`.
  No session can start in the window because every gated call's `read()` already said disarmed; the net state
  after the failure is refused, as before the press. Safe.
- **Success paths**: the arm branch on success is unchanged (apply, write, `"armed"`); `apply`'s only change is
  the `"revert"` source, used solely in the catch. Disarm/unreadable branches untouched. The 2660 existing tests
  pass unchanged.

## Hunt (step 4) — `grep -rn "storage\.local\.set\|deps\.set\|writeSafety\|\.apply(\|storage\.local\.get\|storage\.session\.get\|storage\.local\.remove\|storage\.local\.clear" extension/src`
Confirms the builder's table:
- `safety-state.ts` arm branch (288–296): fixed. Disarm (278) and unreadable (283) branches: memory disarmed
  before `writeDisarm`, never re-armed on failure — fails closed (#174). `apply(…, "load")` at 193/214/273: reads
  only. `apply(…, "change")` at 251: driven by `storage.onChanged`, i.e. after a successful write — but see F1.
- `options.ts:93` `save()` → `writeSafety`: no memory copy; the checkboxes are UI state re-rendered from storage on
  failure (`refreshSafety()`), `loadedList` moves only after a successful save. No defect. `options.ts:14`
  port/token: not safety state.
- `sw.ts:212` session-marker writes; `network-state.ts` session flush: not safety state.
- `network-state.ts:50` `chrome.storage.session.get(null)`: the session area (marker + network blob), no token;
  outside #183's scope (builder F1 confirmed).

## Item (2)
- `readStoredArmed(get)` calls `get(SAFETY_KEY_NAMES)` exactly once (spy test; M-h/M-i caught).
- No `chrome.storage.local.get(null)` / `get()` remains in `extension/src` (grep above: every `local.get` names keys:
  `options.ts:8,43`, `sw.ts:36,210,228,366`).
- `sw.ts` names no safety key: `grep -nE "safety\.(armed|evaluate|blockList)|SAFETY_KEY" extension/src/sw.ts` →
  no output.
- Writers/sw-static/log-scan/log-sentinel pass unchanged (E4).
- **Deviation sound**: `safety-writers.test.ts:48-51` `IDENT_ALLOWED` admits `SAFETY_KEY_NAMES` only in
  `safety-state.ts` and `options.ts`, so a `badge.ts` helper naming the keys would fail an existing test; putting
  the helper in the module that owns the keys keeps D1's intent (a `get(keys)` helper, `sw.ts` names no key).

## Findings
- **F1 (MINOR) — the revert's "newer state stands" check is fooled by a non-`armed` storage change.**
  `applyChanges` builds its merge on the memory copy (`base = { ...this.mem }`), so an options-page edit of only the
  block list or the JavaScript switch while the arm write is pending replaces `this.mem` with a new object that
  still carries the optimistic `armed: true`. The arm write then fails, `this.mem !== applied`, no revert: the
  original defect returns. Reproduced with a throwaway probe test in the worktree (deleted):
  ```
  PROBE storage armed = false  memory = {"armed":true,"evaluate":true,"blockList":"x.example"}  ingestView armed = true  read armed = false
  PROBE next press = disarmed
  ```
  Impact as in S2b.md §6 finding 1 (the network log records while storage says OFF; the next press disarms instead
  of retrying); the gate's `read()` still refuses. Needs both a rejected `storage.local.set` and an options-page save
  inside that write's pending window, so rare. Possible fix (not applied): revert when memory is still armed and no
  change since the apply carried `safety.armed` (e.g. a flag set in `applyChanges` when `changes` has the armed key),
  rather than identity of the object.
- **F2 (NIT) — the static check covers `null`, a bare `undefined` and no argument only.** `get(undefined as any)`
  (S-b) and extra keys passed from `sw.ts` (`get(["token", ...keys])`, S-c) survive; aliases
  (`const a = chrome.storage.local; a.get(null)`) would too. The spy test pins the helper's own argument, so only the
  `sw.ts` adapter is unpinned. A tighter check would require the adapter to be exactly `(keys) =>
  chrome.storage.local.get([...keys])`, or forbid string literals in `local.get` calls in `sw.ts` except the
  existing `MARKER_KEY` / `["port","token"]` ones.
- **F3 (NIT) — E4 count.** The builder's "7 files, 140 tests" for E4 is consistent with mine (8 files/143 including
  the new `badge-stored-read.test.ts` matched by the `badge` filter); not a discrepancy, noted for the register.

## Not checked
- Anything live (Chrome, the real `chrome.storage` rejection behaviour, the real badge); the `sw.ts` glue runs only
  in Chrome (not unit-tested by design).
- Whether `chrome.storage.local.get([...keys])` in Chrome returns exactly the asked keys (assumed per the API).
- Daemon/SDK/MCP: untouched by S2c, covered only by the full `npm test` run.

## Round 2 re-check (after fixer round 1)

Verifier: Opus 5.5, 2026-10-24. Scope: F1, F2, full-suite numbers, E3/E5. `S2c-fixer1.md` treated as claims. Same
method: clean `git worktree` of 9a5366c in the scratchpad + the main tree's current `extension/src/{safety-state,sw}.ts`
and the two new test files, `npm ci --prefer-offline`; worktree removed after. Main tree before/after: `git status
--short` identical (`STATUS_SAME`), `git diff` byte-identical (`DIFF_SAME`), sha256 of both new test files `OK`.

**Verdict: PASS.** F1 and F2 are fixed; no new finding above NIT.

### Full suite, E3, E5
- `npm run typecheck` exit 0; `npm run build` exit 0; `npm test` → `Test Files 115 passed (115)`, `Tests 2685 passed
  (2685)` — matches the claim (2670 → 2685, +15, all in the two stage-new files).
- E5: worktree `git status --short` after the build: ` M extension/src/safety-state.ts`, ` M extension/src/sw.ts`, the
  two new tests — nothing else. `sw.ts` is unchanged by round 1 (its diff against HEAD is still the import line and
  the `storedArmed` expression).
- E3: `extension/dist/content.js` starts `"use strict";\n(() => {`; `grep -cE "^\s*(import|export)\b"` → `0`;
  `sw-static.test.ts` passes in the full run.
- Existing tests unchanged: main tree `git diff --stat -- extension/test` → empty; only the two untracked files.

### F1 — re-run of the original interleaving and attacks on the armed-touch counter
Throwaway probe test in the worktree (`zz-r2-probe.test.ts`, deleted after), harness: stored `armed:false`, start,
arm write held pending, a change applied, the write rejected. All 9 probes passed:
```
PROBE P1 blockList-only {"mem":{"armed":false,"evaluate":true,"blockList":"x.example"},"ingest":false,"read":false}   (next press past the guard → "armed")
PROBE P1 evaluate-only  {"mem":{"armed":false,"evaluate":false,"blockList":""},"ingest":false,"read":false}            (next press past the guard → "armed")
PROBE P2 {"mem":{"armed":true,…},"ingest":true,"read":true} onDisarm 0     another writer set armed:true (its write saved) → stands
PROBE P3 {"mem":{"armed":false,…},"ingest":false,"read":false} onDisarm 1  armed:false change, then reject → disarmed, no second onDisarm
PROBE P4 second = armed {"armed":true,…} true                              two queued toggles: 1st rejects, 2nd retries and arms
PROBE P5 {"mem":{"armed":false,…,"blockList":"a.example"},"ingest":false,"read":false}   applyChanges before start(), then blockList-only + reject
PROBE P6 {"unreadable":true} onDisarm 1                                    wrong-typed change during pending → stays unreadable, rejects
PROBE P7 ok                                                                success path: arm → "armed", onArm 1, onDisarm 0; disarm; re-arm at guard-1 "ignored", at guard "armed"
PROBE P8 {"mem":{"armed":false,…},"ingest":false,"read":false} storage false   late onChanged of an earlier arm (true) then of the disarm (false) during a failing arm → converges disarmed
```
(onDisarm counts are after clearing the mocks past `start()`; the load of a stored `armed:false` itself fires one.)

New F1 tests discriminate: on the builder's version (`safety-state.ts` as of round 1's input) `npx vitest run
extension/test/safety-rearm-failure.test.ts extension/test/badge-stored-read.test.ts` → `2 failed | 23 passed (25)`
(the block-list-only and JavaScript-only tests); on HEAD's sources → `11 failed | 14 passed (25)` (both new F1 tests
among them). With the fix: 25/25.

Mutations of the round-1 code (full `npx vitest run extension/test`, 1464 tests, restored after):

| Mutation | Result | Caught by |
|---|---|---|
| C-a counter comparison dropped (revert whenever memory is armed) | 2 failed | builder "a storage change … stands"; fixer-1 test 3 |
| C-b counter counts any safety change | 2 failed | fixer-1 block-list-only, JavaScript-only |
| C-c `now.armed` condition dropped | survived | equivalent mutant: with the counter unchanged and the copy readable, memory is necessarily still armed (toggles are serialised; only `applyChanges` replaces it, and a non-`armed` change keeps `armed`) — and a revert of a disarmed copy fires nothing |

### F2 — `sw.ts` mutations against the static tests
| Mutation of `storedArmed` in `sw.ts` | Result |
|---|---|
| S-a `readStoredArmed(() => chrome.storage.local.get(null))` | 2 failed (whole-area static; `sw.ts` glue static) |
| S-b `… get(undefined as any)` (survived round 1) | 2 failed (same two) |
| S-c `get(["token", ...keys])` (survived round 1) | 1 failed (`sw.ts` glue static) |
| S-f alias `const a = chrome.storage.local; return a.get(null)` | 2 failed (`sw.ts` glue static; `safety-writers`) |
| S-g `get(Object.keys({}) as any)` | 1 failed (`sw.ts` glue static) |

### Round 2 findings
- **R2-N1 (NIT, pre-existing, not S2c's).** A `storage.onChanged` batch that sets `armed:false` and arrives before the
  first load (`mem === null`) goes through `apply(…, "change")` with no previous state, so it sets `lastDisarmAt`
  and a press within 1 000 ms after it is `"ignored"` (seen while writing probe P5; it needed a tick). Fail-safe
  direction (a re-arm is delayed, never a disarm); present on HEAD; noted only.
- **R2-N2 (NIT).** The counter treats any `armed`-touching event as authoritative, even a late one from an earlier
  write; P8 shows the state converges once Chrome's ordered events finish. No action.

### Not checked
Anything live; whether Chrome fires `storage.onChanged` for a same-value `set` (P2 assumes the other writer changed
the stored value).
