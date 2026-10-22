# T3 — verifier report

Written 2026-10-22 by the T3 verifier (Claude Opus 5.5). Independent of the builder. I read the
builder's report as claims to audit.

**Verdict: FAIL.** One MAJOR finding (V1: a viewport `switch` capture can run outside the visibility
lock). Its fix is one line in T3's lane plus a test. Every pre-registered exit check T3.1–T3.5 passes.

## Set-up

- Clean worktree: `git worktree add <scratchpad>/t3-verify 51de800`, then `npm ci`. I measured the
  baseline there **before** copying anything in. After that I copied exactly the 12 T3 files from
  the main tree (`git status --short` in the worktree showed those 12 and nothing else). I removed the
  worktree at the end (`git worktree remove --force`, `rm -rf`, `git worktree prune`; `git worktree
  list` shows only the main tree).
- While I worked, the main tree's HEAD moved from 51de800 to e409706 (T2) and then to 54ccf08 (T2
  fix and T2 docs). None of those commits touches `extension/`. I also ran the suite with T3 on top of
  e409706 (see Counts).

## Exit checks

| Check | Command | Output (excerpt) | Result |
|---|---|---|---|
| T3.1 typecheck | `npm run typecheck` (worktree, 51de800 + T3) | exit 0, all five `tsc -p` projects | PASS |
| T3.1 tests | `npm test` | before `47 passed (47)` / `676 passed (676)`; after `48 passed (48)` / `715 passed (715)` | PASS (715 ≥ 676) |
| T3.1 moved, not deleted | old vs new `it(` names per file; old `toContain` count | no case deleted (3 renamed, 1 replaced; see Counts). `grep -c toContain` on the 51de800 `snapshot.test.ts` = **38**, which matches the builder's hand-off list one for one | PASS |
| build | `npm run build` | exit 0: `built mcp → dist/index.js`, `built extension → dist/` | PASS |
| T3.2 | read `extension/test/snapshot.test.ts`, then mutations | shape test `{elements,title,truncated,url}` (no `text`/`count`); every 0.7 field tested; open shadow, closed shadow (absent), same-origin frame, cross-origin frame, display:none/aria-hidden/inert pruning, 800 cap (799 → false, 800 → true); with the `hasLayout` gate removed, 34 tests fail | PASS |
| T3.3 | `grep -n "focused" extension/src/tabs.ts` | (nothing) | PASS |
| T3.3 | `grep -n "focused" extension/src/handlers/tabs.ts` | `59: if (tab.windowId >= 0) await chrome.windows.update(tab.windowId, { focused: true });`, inside `focusTab` (`:55-65`) | PASS |
| T3.3 sharpened | `grep -nE "focused\s*:" extension/src/tabs.ts extension/src/errors.ts` | (nothing) | PASS |
| extra | `grep -rnE "focused\s*:" extension/src` | only `handlers/tabs.ts:59` (focusTab) | PASS |
| T3.4 | `grep -n "active: true" extension/src/handlers/tabs.ts` | only `60: await chrome.tabs.update(id, { active: true });` (focusTab); `newTab` is `active: p.active === true` (`:73`) | PASS |
| T3.5 | `grep -n "focusTab\|selectTab" extension/src/sw.ts` | `30: router.on("focusTab", focusTab);` `32: router.on("selectTab", focusTab);`; also `export const selectTab = focusTab` and the test `expect(selectTab).toBe(focusTab)` | PASS |
| hasLayout gate | `grep -n hasLayout extension/src/content/snapshot.ts` | `76: function hasLayout`, `229: checkSize = hasLayout(doc);`; the filter is `role && !(checkSize && isZeroSize(el))` | PASS |
| minimized first | `captureOnce`, `tabs.ts:136-143` | `windows.get` → `WINDOW_MINIMIZED` before `reserveCaptureSlot`, `tabs.query` and any `update`; the test asserts that `query`, `update` and `captureVisibleTab` were never called | PASS |
| waits | `grep -nE "_MS = " extension/src/tabs.ts` | `ACTIVATION_WAIT_MS = 1000`, `FRAME_WAIT_MS = 50`, `CAPTURE_SPACING_MS = 500`, `QUOTA_RETRY_MS = 500` | PASS |
| snapshot result has no `text` | `perceive.ts:7-11` returns `callInPage(...snapshot())`; content-guard test `not.toHaveProperty("text")`; `grep -n text extension/src/handlers/perceive.ts` → nothing | | PASS |
| windows.update only in focusTab | `grep -rn "windows.update" extension/src` | only `handlers/tabs.ts:59` | PASS |

## Findings

**V1 — MAJOR — the daemon and the extension disagree on when `fullPage` applies, so a `switch` capture can run outside the visibility lock.**
`extension/src/handlers/perceive.ts:18` vs `daemon/src/methods.ts:65`.
Evidence:
```
$ grep -n "fullPage" extension/src/handlers/perceive.ts daemon/src/methods.ts
extension/src/handlers/perceive.ts:18:  if (params.fullPage === true) {
daemon/src/methods.ts:65:  return params?.mode !== "cdp" && !params?.fullPage;
```
With `{tabId, fullPage: 1}` (or `"yes"`), the daemon does not take the lock (`!1` is false). The
extension reads `fullPage === true` as false and runs `activateForCapture`, which switches the
window's tab. A probe in the worktree confirmed it: `screenshot({tabId: 12, fullPage: 1})` → calls
`update 12, capture, update 11`. Before T3 the same input took a plain `captureVisibleTab` with no
switch, so T3 creates this exposure. Any SDK script can send it with a raw `client.call`. The MCP
sends booleans only (`registry.ts:89`, `z.boolean()`).
The per-window extension mutex still stops two captures from overlapping in one window. But a lock
holder's `focusTab` in that window can be undone by this capture's restore. Spec §6.4 requires the
lock for every viewport `switch` capture, and the integrity floor lists a skipped lock.
Suggested fix (T3 lane, preferred): use the daemon's own predicate for the full-page branch,
`if (params.fullPage)`. A non-boolean truthy `fullPage` then takes the CDP full-page path, which needs
no lock. Alternatively, reject a non-boolean `fullPage` with `BAD_PARAMS` before the branch. Add a test:
`screenshot({tabId:12, fullPage:1})` never calls `tabs.update`. A stricter daemon predicate
(`params?.fullPage !== true`) is out of T3's lane, so it goes to the step agent.

**V2 — MINOR — a restore that never settles blocks every later capture in that window, with no bound.**
`extension/src/tabs.ts:154`. The chain link is released only when `restored` settles. The same holds
for a `windows.get`, `tabs.query` or `captureVisibleTab` that hangs. Probe: the restore's
`tabs.update(11)` never resolves, and a second `activateForCapture` in window 1 is still pending
after `advanceTimersByTimeAsync(600_000)` (`b settled after 10 min: false`). The daemon times the
call out and releases its own lock. The extension keeps the window blocked until the service worker
restarts, and the 25 s keepalive makes a restart rare. This matches the brief ("released after
restore settles"), and a hung Chrome tabs API is unlikely. Suggested fix: release on `restored`
settling **or** after a bound (say 2 s, with a comment that the bound only frees the chain and never
skips the restore). Record it as a design-local decision.

**V3 — MINOR — two stated deviations have no test.** `tabs.ts:144-152, 177-183`. I confirmed both by
probe:
(a) `tabs.update(target)` throws "No tab with id" → `TAB_UNKNOWN`, the restore of `prev` is still
attempted (harmless), and the next capture runs (`probe1 TAB_UNKNOWN update 12,update 11`; next
capture `data:x`).
(b) A window with no active tab → the target is activated and captured, with no restore (`probe2
data:x update 12,capture`).
The behaviour is sensible, but nothing pins it. Suggested fix: add two cases to `capture.test.ts`.

**V4 — MINOR — `focusTab` sits outside the extension's per-window chain, so F19's race remains for it.**
`handlers/tabs.ts:55-65` vs `tabs.ts:121-131`. Once the daemon has released the lock on a capture's
timeout, a later holder's `focusTab` can run while the extension is still switching. The earlier
capture's restore then re-activates the previous tab and undoes the focus. F19's resolution names
only `activateForCapture`, so this follows the plan. Suggested fix (optional): run `focusTab` through
the same per-window chain, or record the limit for T5 (SCREEN-3 plus a focus).

**V5 — NIT — the capture window comes from the resolved tab, before the wait in the queue.**
`tabs.ts:121, 136, 144`. If the tab is dragged to another window while queued, `update(target)`
activates it there and `captureVisibleTab(oldWindowId)` captures the old window: the wrong pixels,
and no error. This is rare. Suggested fix: re-read `chrome.tabs.get(tab.id)` at the start of
`captureOnce`, which also catches a tab that closed while queued.

**V6 — NIT — the spacing holds between reservations, not between the actual captures.** The builder
disclosed this (proposed decision 3). I agree with the reasoning: across windows, two captures can
run closer than 500 ms when the first one switches tabs, and the one quota retry absorbs it. The
retry's own `captureVisibleTab` does not advance `lastSlot` either. Keep it for T5 SCREEN-3 to record.

**V7 — NIT — the builder's report says 5 `count` assertions; the 51de800 file has 6.** Lines 34, 107,
125, 156, 209 and 217 (`grep -n "count" old-snap.ts`). All 6 have counterparts: `toHaveLength(2)`,
`(1)`, `(0)`, a `pairs` equality of length 1, `(0)` and `(800)`. Only the report's count is wrong.

**V8 — NIT — no unit test pins the absence of `text` in `networkRequests`.** I mutated
`handlers/network.ts` to return `{text: "", ...query}`, and all 96 tests in the four touched files
still passed. This handler is `chrome.*` glue (not unit-tested by policy), and the `text` field is
still optional in `shared/`, so typecheck cannot catch it until T4 removes the field (#49). The grep
and the review cover it: `network.ts:37-46` returns `log.query(...)` directly.

**V9 — NIT — one old test now waits about 500 ms of real time.** In `target-tab.test.ts` › "captures
an explicit active tab, and the fallback as before" (508 ms in the verbose run), the second capture
waits for the global spacing slot under real timers. Suggested fix: `vi.useFakeTimers()` there.

**V10 — NIT — `focusTab`/`selectTab`'s `BAD_PARAMS` text is now `focusTab requires tabId`.** The text
dates from T1, not Step 6. No test asserts it, and the MCP always sends an id, so nothing visible
changes. Mentioned only for completeness.

### Checked and found sound

- **Mutations: every new test fails without its change.** I applied each mutation in the worktree,
  ran the four touched test files, restored the file and checked it with `cmp`:

  | Mutation | Failing tests |
  |---|---|
  | minimized check removed | 2 |
  | per-window mutex removed | 3 |
  | mutex released before the restore settles | 1 |
  | spacing 0 | 2 |
  | quota retry removed | 2 |
  | quota retry wait 0 | 1 |
  | frame wait 0 | 3 |
  | activation cap 100 s | 1 |
  | activation cap 500 ms | 1 |
  | listener not removed in `finally` | 1 |
  | listener added after `update` | 1 |
  | no restore | 6 |
  | switch even when already active | 2 |
  | `mode:"cdp"` ignored | 1 |
  | `fullPage` only without `mode` | 1 |
  | `newTab` default `active:true` | 1 |
  | `focusTab` without window focus | 1 |
  | `listTabs` without `windowId` | 1 |
  | `openerTabId` always set | 1 |
  | password value read | 2 |
  | depth not incremented | 3 |
  | frame index constant 1 | 2 |
  | value not capped | 1 |
  | `truncated` always false | 2 |
  | `hasLayout` gate removed | 34 |
  | `instanceof` in `valueOf` | 1 |
  | `checked` for any role | 1 |
  | `disabled:false` emitted | 2 |
  | `href` for any role | 1 |
  | `<summary>` expanded removed | 1 |

  Two mutations caused no failures. One is equivalent: without the restore's `.catch`, the rejection
  is still handled by `.then(release, release)`. The other is V8.
- **The replaced T1 test.** With `perceive.ts` restored from 51de800, `target-tab.test.ts` fails the
  replacement test, cdp mode and minimized (3 failed, 30 passed). With 51de800's `snapshot.ts`, the
  content-guard test fails (1 failed).
- **Invariants:**
  - `extension/dist/content.js` begins `"use strict"; (() => {`. A grep for
    `^\s*(import|export)\b|\bimport\(|@bridge/shared` finds nothing, so the type-only
    `@bridge/shared` import is erased.
  - `inject.ts` (`unwrapResult`) has no diff.
  - `sw.ts` has no top-level `await`: the only `await`s are indented, inside functions (`:137`, `:153`).
  - All `chrome.tabs.on*` and `webRequest` listeners are still at column 1 (`sw.ts:58-124`).
  - The diff adds no `console.*` call.
  - The transient `onActivated` listener removes itself in its own callback, and again in `finally`;
    `listeners.size === 0` is asserted on both paths.
- **`value` on the wire.** No daemon log line carries a result: the `logger.log` calls in
  `daemon/src/main.ts` print only lifecycle lines and client names. Password inputs are never read,
  including `type="PASSWORD"` with `role="textbox"`, and the test asserts that `JSON.stringify` of the
  result contains no `hunter`. A file input is a `button` and carries no value. Other values, such as
  a card number in a text field, do reach the client. That is the spec's §5 shape, not a log, so it is
  not a security-boundary change.
- **Spec §6.5, §7 and plan 0.5.** `switch` remembers the window's active tab, activates the target,
  waits for `onActivated` or 1 s, waits 50 ms, captures, and restores without awaiting the result.
  `cdp` uses `Page.captureScreenshot` through `withDebugger(…, "Screenshot")` with no switch.
  `fullPage` takes CDP whatever the `mode` (V1 aside). No window focus in `activateForCapture`.
  `focusTab` focuses and does not restore.
- **The step agent's stage-local decisions are all followed:** the fields, the 800 rule, the frame
  index, the mutex, the slot, the retry, `newTab` `active: p.active === true`, the alias, `listTabs`
  `windowId`/`openerTabId?`, network data only, and `network-log.ts` with its tests untouched
  (`git diff --stat` shows neither). None of them contradicts the plan or the spec.
- **MCP and SDK.** Typecheck stays green for `mcp/` and `sdk/`, also on top of e409706. The builder's
  Finding 2 holds: between T3's commit and T4's, a reloaded extension would give `browser_snapshot`
  `undefined` text, an empty network text, and a background new tab. No reload is planned before
  T5, which comes after T4.
- **Lane.** `git status --short` in the main tree shows the 11 modified `extension/` files, the new
  `extension/test/capture.test.ts`, and the T3 builder report and ledger. The `docs/decisions.md`,
  `briefs/common.md` and `journal.md` edits are the session agent's, not T3's. No `sdk/test/` file
  was added, and nothing outside `extension/` and the steps directory changed for T3.

## Counts

Full suite, in the worktree:

| Tree | Test files | Tests |
|---|---|---|
| 51de800 (baseline) | 47 | 676 |
| 51de800 + T3 | 48 | 715 (+39) |
| e409706 (T2) + T3 | 53 | 785 |

`npx vitest run extension/` goes from 287 / 17 files to 326 / 18 files. Per file (`it(` count,
51de800 → now):

| File | Before | After |
|---|---|---|
| actions | 8 | 8 |
| capture (new) | 0 | 14 |
| content-guard | 10 | 10 |
| debugger-errors | 18 | 18 |
| download | 13 | 13 |
| evaluate-result | 24 | 24 |
| evaluate-serialize | 23 | 23 |
| evaluate-wrap | 9 | 9 |
| geometry | 7 | 7 |
| handler-codes | 5 | 5 |
| inject | 15 | 15 |
| keys | 12 | 12 |
| network-log | 69 | 69 |
| refmap | 3 | 3 |
| router | 14 | 14 |
| snapshot | 23 | 39 |
| tab-events | 10 | 10 |
| target-tab | 24 | 33 |
| **Total** | **287** | **326** |

**Verbose name diff (old names missing in the new run): no case was deleted.**
- `snapshot`: all 23 old names are present.
- `target-tab`, renamed:
  - the describe `closeTab / selectTab (F4)` became `closeTab / focusTab / selectTab alias (F4)`;
    its 3 cases kept their names;
  - `selectTab with neither → BAD_PARAMS` became `focusTab (and its selectTab alias) with neither →
    BAD_PARAMS`, with the old assertion inside a loop over both functions.
- `target-tab`, replaced one for one: `refuses instead of capturing another tab` became `switches to
  the background tab, captures it and restores the previous tab (T3; replaces T1's refusal)`.
- **Moved text assertions:** 38. They are now asserted on `elements`, and T4 re-establishes the text
  against the SDK formatter. I audited the hand-off list entry by entry against the 51de800 file:
  18 tests and 38 assertions, all matching, each with an element-level counterpart. The 6 `count`
  assertions (V7) became length assertions.

## Verdict

**FAIL**: V1 is MAJOR, because a viewport switch capture can bypass the daemon's visibility lock
with a non-boolean `fullPage`. One fix round can close it: align `perceive.ts:18` with the daemon's
predicate (or reject a non-boolean `fullPage`) and add a test. In the same round, add the two
missing tests from V3. V2 and V4 are MINOR and each needs a design-local decision. Everything else
holds: T3.1–T3.5 pass, every new test is discriminating, the invariants are intact, and the lane is
clean.

## Re-check (fix round 1)

Re-checked 2026-10-22 by the same verifier. I re-checked only the affected items, against the
fixer's report `T3-fixer-report.md`, which I read as claims to audit.

**Verdict: PASS-with-notes.** V1, V2, V3, V8 and V9 are fixed, and each new test fails without its
change. No new MAJOR issue. V4, V5, V6, V7 and V10 stay open as notes, as the step agent ruled.

### Set-up

- Fresh worktree at HEAD **54ccf08**, then `npm ci`.
- Baseline measured before copying anything: `npm test` → **748 passed / 52 files**.
- Then I copied in the same 12 T3 files from the main tree. `cmp` and `diff` against my round-0
  copies show the expected changes: `snapshot.ts` is unchanged, and `perceive.ts` differs only at
  the `fullPage` line.
- After the copy:
  - `npm run typecheck`: exit 0.
  - `npm test`: **793 passed / 53 files**. That is 748 + 45, i.e. round 0's +39 plus the fixer's +6.
  - `npm run build`: exit 0. `content.js` still has no `import`/`export`.
  - `npx vitest run extension/`: 332 passed. No test name from round 0 is missing; two names only
    looked missing because my round-0 list had cut them short at "500 ms" / "50 ms".
- I removed the worktree afterwards (`git worktree remove --force`, `rm -rf`, `prune`).

### Items

| Item | Fix | Fails without it (mutation → failing test) |
|---|---|---|
| V1 | `perceive.ts:20` `if (params.fullPage)`, which matches `takesLock`'s `!params?.fullPage` | `=== true` restored → "a truthy non-boolean fullPage takes the CDP full-page path … (V1)" |
| V2 | `tabs.ts:108` `CHAIN_RELEASE_MAX_MS = 30_000`; the bound timer starts with the link and is cleared on the normal release | bound timer made a no-op → V2 test; 29 s → V2 test; 1 s → V2 test **and** "waits for a slow restore to settle"; `clearTimeout` removed → "no timer left behind" |
| V3 (a) | test: `TAB_UNKNOWN`, then the chain is released | `asTabUnknown` dropped → V3a test; release only on success → V3a test and the bound test |
| V3 (b) | test: no active tab → switch, capture, no restore | `switching = prev !== undefined && …` → V3b test |
| V8 | test: `networkRequests` result has no `text` | `{text:"", ...log.query()}` → "returns data only: no text key" |
| V9 | `target-tab.test.ts:290` `resetCaptureState()` between the two captures, assertions unchanged | the verbose run prints no 508 ms duration any more |

I also re-ran the round-0 mutations against the new `tabs.ts`, so the bound cannot have masked
them. Each still fails:

| Mutation | Failing tests |
|---|---|
| per-window mutex removed | 4 (now also the V2 test) |
| released before the restore settles | 1 |
| minimized check | 2 |
| spacing 0 | 2 |
| frame wait 0 | 3 |
| activation cap 100 s | 1 |
| quota retry | 2 |
| `newTab` default | 1 |

After every run, `cmp` showed the source identical to the main tree.

### Constants and greps

- `grep -nE "_MS = " extension/src/tabs.ts` → `ACTIVATION_WAIT_MS = 1000`, `FRAME_WAIT_MS = 50`,
  `CAPTURE_SPACING_MS = 500`, `QUOTA_RETRY_MS = 500` (all unchanged), plus `CHAIN_RELEASE_MAX_MS = 30_000`.
- `grep -n "focused" extension/src/tabs.ts` → nothing (exit 1).
- T3.3–T3.5 re-run:
  - `focused` appears only at `handlers/tabs.ts:59`, inside `focusTab`.
  - `grep -nE "focused\s*:" extension/src/tabs.ts extension/src/errors.ts` → nothing.
  - `active: true` appears only at `handlers/tabs.ts:60`, inside `focusTab`.
  - `sw.ts:30` and `sw.ts:32` both register `focusTab`.
  - `hasLayout` is still at `:229`.
  - `windows.update` appears only in `focusTab`.

| Check | Result |
|---|---|
| T3.1 | PASS (793 ≥ 748; nothing deleted) |
| T3.2 | PASS |
| T3.3 | PASS |
| T3.4 | PASS |
| T3.5 | PASS |

### The 30 s bound: can it let two switches overlap?

**Not in normal operation.** The bound runs from the start of a link, i.e. once the previous link in
that window has released, not from the call. A normal link's longest path is:

- `windows.get`;
- the spacing wait, at most 500 ms, because the daemon's global visibility lock lets only one
  switch capture be in flight;
- with the daemon's lock skipped by a timeout, the wait is at most about 500 ms per window with a
  queued capture;
- the activation wait, at most 1000 ms;
- 50 ms;
- `captureVisibleTab`;
- at most one quota retry, 500 ms, plus a second capture.

That is about 2–3 s against 30 s. Only a Chrome call that hangs for more than 30 s lets the next link
start while the first is unfinished, and then a late restore could interfere. That is the trade the
step agent ruled for, and spec §6.4 accepts the same trade for the daemon's lock ("a hung screenshot
cannot wedge everyone"). The 1 s mutation shows the bound is not short enough to cut into a slow but
settling restore (3 s in the test).

New NIT: **R1-1.** A truthy string such as `fullPage: "false"` now takes the full-page CDP path. This
is consistent with the daemon, which takes no lock in that case, and the MCP sends booleans only.
Either side could tighten it to `=== true`, but only both together (Step 8 or a decision).

**Count: 793 passed / 53 files** (HEAD 54ccf08 + T3; baseline 748 / 52).
