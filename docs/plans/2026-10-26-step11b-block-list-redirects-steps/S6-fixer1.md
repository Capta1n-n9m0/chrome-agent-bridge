# S6 — `newTab` on `about:blank` · fixer round 1

Fixer: Opus 5.5, effort medium. 2026-10-27. Input: `S6-verifier.md` (FAIL on V1). Uncommitted, no Chrome work.

## 1. V1 — fixed

**Cause:** `waitForLoad` takes the first `complete` for the tab id. It was armed on a tab freshly created on
`about:blank`, so the blank page's own late `complete` could end the wait. The reply and the rule release then came
before the URL's load, and a URL that never loads answered `{id}`.

**Fix (the verifier's first option, made race-free):** `extension/src/newtab-open.ts` gains a pure
`settleBlank(tabId, tabs, boundMs = BLANK_SETTLE_MS /* 2 s */)`. The sequence is now: create → `settleBlank` started
at once → hold the rules → `await` the settle → arm `waitForLoad` → navigate → wait.
- `settleBlank` arms its `onUpdated` listener **before** it asks `tabs.get`. A `complete` delivered while `get` is
  pending is not missed, and a tab that already reads `complete` ends the wait at once.
- It never rejects. A failed `get` (tab gone) ends it, and the navigation then fails with Chrome's own error, as
  before. A blank tab that never reports `complete` ends it at the 2 s bound, so nothing hangs.
- The listener runs in parallel with the install, so the normal case adds no latency.
- On a hold failure it is cancelled (listener and timer dropped) before the tab is removed.
- `handlers/tabs.ts` passes `settleBlank: (tabId) => settleBlank(tabId, chrome.tabs)` through `OpenSteps`.
  `extension/src/tabs.ts` (`waitForLoad`) is unchanged.
- The URL wait keeps today's 30 s and its message (`Timed out waiting for tab N to load`). Only when the blank tab
  stays silent does the worst case reach 2 s + 30 s.

**Why not the alternative** (ignore a `complete` until the URL navigation has reported `loading`): the blank tab's own
`loading → complete` can also arrive after the listener is armed, so a `loading` seen there does not prove the URL's
navigation started. Filtering on the tab's URL was ruled out by the verifier (a download-type URL or `about:blank#x`
could hang). Settling the blank tab first needs no URL test and leaves `waitForLoad` untouched.

**Residual (by reading, unmeasured):** if `tabs.get` answers `complete` while that `complete` event is still queued
for delivery after the reply, the event could still land on the URL listener. Extension events and API replies reach
the worker over one channel in order, so this is not expected. Run 17b's RD-2 / D7.3 measure the end result.

## 2. Tests (`extension/test/s6-newtab-blank.test.ts`, 19 → 25)

New, under "the blank tab's own load never ends the URL's wait (S6 verifier V1)":
1. The blank's `complete` fires at +0 ms, after the hold, and the URL never loads (the verifier's
   `stub-noUrlLoad` shape). The call ends in `Timed out waiting for tab 99 to load` after 30 s. `{id}` never answers,
   and the release comes after the timeout.
2. The URL's `complete` fires at +50 ms. The log is `… update → url-complete → read → release`, so the reply and the
   release come after the URL's load.
3. A blank tab that never reports `complete` (`get` says `loading`): no `update` before 2 s, the URL opens at the
   bound, and the call answers `{id}`.

New, under `settleBlank`: the listener is armed before `get`; a `complete` while `get` is pending ends it, while
other ids and `loading` do not; `get` answering `complete` or rejecting ends it at once; it ends at the bound;
`cancel` ends it; every path drops the listener.

Changed (one new step, same guarantees): the pure-sequence stub gains `settleBlank`, and its expected logs gain
`settle` / `settled` / `cancel`. Navigation still never comes before `held`, and on a hold failure the log is
`… cancel, remove 99`. The handler stub gains `tabs.get`. `neverLoads` now also reports the blank tab as `complete`
through `get`, so the existing timeout test still runs on exactly 30 000 ms with its log unchanged. Every handler-level
`HEAD` / order assertion is unchanged.

**Red on the pre-fix behaviour:** mutant `await blank.done` → `void blank.done` (that is, the load wait is armed
without settling, the builder's order): **3 failed / 25**, exactly the three V1 tests. Restored afterwards.

## 3. Spec note

In `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md`, the §10 S6 bullet now says that the tab is navigated
once the blank page has reported its own load (or 2 s passed), and is waited for as before (30 s, same message), so
the wait ends on the URL's load. Without this, "the rules come out after the post-check, on every path" would not
hold (verifier §5). §6.2's note is unchanged.

## 4. Exit checks

| Check | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | `Test Files 184 passed (184)`, `Tests 4560 passed (4560)` (was 4554/184; +6, all in the S6 test file) |
| `npm run build` | `built extension → dist/`, exit 0 |
| `git status --short` | only the S6 lane files and the S6 reports (plus this report); no new path outside the lane |
| `git diff --stat -- daemon shared sdk mcp` | empty |
| log sites | `newtab-open.ts` has no `console.` call; `log-scan` / `log-sentinel` green inside the 4560 |
| E6.1 | order kept, now discriminating for "release after the URL's load" (test 2; mutant red) |
| E6.2–E6.4 | unchanged and green (rejecting install: 0 updates, tab removed; today's paths byte-equal; no cross-package diff) |
| size | `newtab-open.ts` +52, `handlers/tabs.ts` +1, test +~103: about 156 new lines against a cap of about 150 |

## 5. NITs left (V2–V5)

None is touched. V2 (inert handle fails open) is a safety-behaviour choice in `safety-call.ts` / the `sw.ts` wiring,
not trivially in lane. V3 is out of lane. V4 is environmental. V5 is a Run 17b RECORD row. They go to the step report.

## 6. Proposed decisions

### 2026-10-27 · `newTab` lets its blank tab finish loading before it waits for the URL
**Decided:** before arming the URL's load wait, the about:blank sequence waits for the blank tab's own `complete`
(listener armed before `tabs.get`, 2 s bound, never rejects). **Why:** `waitForLoad` takes the first `complete` for
the id, so the blank page's own load could release the rules mid-redirect (S6 V1). **Instead of:** ignoring completes
until a post-navigate `loading` (the blank tab's own `loading` makes that ambiguous), filtering on the URL (can hang),
or editing `waitForLoad` (out of lane, shared with `navigate`). **Revisit if:** Run 17b sees a `newTab` answer before
the URL's load, or a blank tab regularly takes more than 2 s to report `complete`. **By:** Claude (proposed)
