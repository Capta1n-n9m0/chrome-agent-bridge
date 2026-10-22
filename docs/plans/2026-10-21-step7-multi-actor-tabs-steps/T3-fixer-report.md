# T3 — fixer report (round 1)

Written 2026-10-22 by the T3 fixer (Claude Opus 5.5). Lane: `extension/src/`, `extension/test/`
only. No build, no commit. HEAD 54ccf08; T3's changes stay uncommitted in the tree.

## Counts

| | Test files | Tests |
|---|---|---|
| `npx vitest run extension/` before | 18 | 326 |
| after | 18 | 332 (+6: V1 1, V2 2, V3 2, V8 1) |

- `npm run typecheck`: exit 0.
- `grep -n "focused" extension/src/tabs.ts`: no output (exit 1).
- `grep -nE "_MS = " extension/src/tabs.ts`: `ACTIVATION_WAIT_MS = 1000`, `FRAME_WAIT_MS = 50`,
  `CAPTURE_SPACING_MS = 500`, `QUOTA_RETRY_MS = 500` (all four unchanged), plus the new
  `CHAIN_RELEASE_MAX_MS = 30_000`.

## Findings

**V1 (MAJOR): fixed.** In `extension/src/handlers/perceive.ts`, `if (params.fullPage === true)`
became `if (params.fullPage)`, with a comment that this is the daemon's `takesLock` rule
(`!params?.fullPage`). The extension now switches tabs only in the cases where the daemon takes the
lock.
- Test: `target-tab.test.ts` › screenshot modes (T3) › "a truthy non-boolean fullPage takes the CDP
  full-page path, as the daemon's lock rule reads it (V1)". It loops over `fullPage: 1` and
  `"yes"`. It asserts `Page.captureScreenshot {captureBeyondViewport:true}`, and that `tabs.update`
  and `captureVisibleTab` are never called.
- Fails without the fix: with the old line, the run gave `× … (V1) → expected "spy" to be called
  with arguments: [ { tabId: 12 }, …(2) ]` (2 failed | 51 passed in the two files, together with V2).

**V2 (MINOR): fixed.** In `extension/src/tabs.ts`, `captureOnce` now starts
`setTimeout(releaseChain, CHAIN_RELEASE_MAX_MS)` as soon as the link begins to run. Its `release`
first clears that timer and then releases the chain. It is still called when the restore settles
(`restored.then(release, release)`). The constant is documented as the daemon's default call
timeout, with the spec §6.4 quote. The `activateForCapture` doc mentions the bound. The caller's
promise is not touched, and neither is the restore.
- Test: `capture.test.ts` › "a capture that never settles frees the window's chain 30 s after it
  started, not before (V2)". The first `captureVisibleTab` never settles. At +29 999 ms there is
  still one `windows.get`. At +30 000 ms the second capture has started (exactly 30 000 ms after the
  first `windows.get`) and resolves. The first caller's promise is still unsettled.
- Fails without the fix: `× … (V2) → expected [ 'windows.get 1 @1000000' ] to have a length of 2
  but got 1`. The same test fails again when the mutation replaces only the timer with a no-op.
- Test: "a normally settled link clears its 30 s bound (no timer left behind)". After 5 s of fake
  time, `vi.getTimerCount() === 0`. It fails when `clearTimeout(bound)` is removed (mutation M4).
  It advances 5 s on purpose instead of calling `runAllTimersAsync`, because that call would fire
  the bound itself and hide the mutation. I saw that happen on the first try.

**V3 (MINOR): fixed (tests only).** Two tests in `capture.test.ts`:
- "a target Chrome no longer has → TAB_UNKNOWN, and the window's chain is released". Tab 99 does not
  exist, so the test expects `TAB_UNKNOWN` with "No tab with id: 99.". The next capture in window 1
  then returns `data:…12`. The test advances only 5 s, which stays inside the 30 s bound, so the
  release has to come from the failure path and not from V2's timer. Mutations: dropping
  `asTabUnknown` in `showTab` fails it. Releasing the chain only on success fails it too. That run
  hits vitest's 5 s timeout, because `b` never starts.
- "a window with no active tab: the target is activated and captured, nothing is restored". The
  steps are `windows.get 1, update 12, activated 12, capture 1:12`, with `tabs.update` called once.
  The mutation `switching = prev !== undefined && …` fails it.

**V8 (NIT): fixed.** `target-tab.test.ts` › "networkRequests result shape (T3, #49) › returns data
only: no text key". It stubs `chrome.storage.session` and then imports `handlers/network.js`
dynamically, because `network-state.ts` rehydrates at import time. It calls
`networkRequests({tabId: 5})` and asserts that the result has no `text` key and has `entries: []`.
I did not change any source for this. The mutation `return { text: "", ...log.query(…) }` fails it.

**V9 (NIT): fixed.** In `target-tab.test.ts` › "captures an explicit active tab, and the fallback as
before", I added `resetCaptureState()` between the two screenshots, with a comment that the spacing
is tested in `capture.test.ts`. The assertions are unchanged. The verbose run now prints no duration
for this test (before: 508 ms), and the whole extension suite takes 1.77 s of test time.

## Mutation runs

Each mutation was run on `capture.test.ts` and `target-tab.test.ts`. Afterwards the source was
restored from a scratchpad copy and checked with `cmp` (`restored-ok`).

| Mutation | Result |
|---|---|
| M1: `showTab` rethrows raw (no `asTabUnknown`) | 1 failed (V3 a) |
| M2: chain released only on success | 1 failed (V3 a, 5004 ms timeout) |
| M3: no switch when the window has no active tab | 1 failed (V3 b) |
| M4: `clearTimeout(bound)` removed | 1 failed (bound-cleared test) |
| M5: `networkRequests` adds `text: ""` | 1 failed (V8) |
| M6: bound timer replaced by a no-op | 1 failed (V2) |
| pre-fix `fullPage === true` | 1 failed (V1) |

## Files touched

- `extension/src/handlers/perceive.ts` (V1)
- `extension/src/tabs.ts` (V2)
- `extension/test/capture.test.ts` (V2, V3)
- `extension/test/target-tab.test.ts` (V1, V8, V9)

Nothing outside the lane changed. V4–V7 and V10 were not in scope and are untouched.
