# T5b verifier: fixes from Run 8

Independent verifier, Claude Opus 5.5, 2026-10-23. Scope: the uncommitted T5b lane diff (10 files) on
HEAD `8ed3e89`. The builder report was treated as claims to audit. No live Chrome, no extension
reload, no daemon on 9234, nothing committed.

## Verdict: FAIL

One MAJOR finding (F1). Fix 1 removed the absolute 30 s chain release. A restore whose Chrome call
hangs now wedges that window's capture chain for the worker's lifetime. At HEAD the bound released it
at 30 s. A probe test proves it (passes at HEAD, fails with the lane). Everything else holds or is a
documentation or coverage note. The fix is small (see F1).

## Set-up

- `git worktree add <scratchpad>/t5bwt HEAD` (detached `8ed3e89`), then `npm ci`.
- Baseline at HEAD, before copying anything: `npx vitest run` →
  `Test Files 59 passed (59)` / `Tests 934 passed (934)`.
- Copied in the 10 lane files from the main tree. `git status --short` in the worktree listed exactly
  those 10 as `M`.
- Worktree removed afterwards (`git worktree remove --force`, then `rm -rf` and `git worktree prune`,
  because Windows left the folder behind). `git worktree list` now shows only the main tree.

## Counts (in the clean worktree)

| check | result |
|---|---|
| `npm run typecheck` | `typecheck exit 0` (shared, daemon, sdk, mcp, extension) |
| `npm test` (`vitest run`) | `Test Files 59 passed (59)` / `Tests 959 passed (959)` |
| `npm run build` | `build exit 0`, `built extension → dist/` |
| before → after | 934 → 959 (+25), the same as the builder's claim. No test was dropped. |

## Exit criteria

- **(a) met.** 959 ≥ 934 + 25 new tests. Typecheck and build are green (table above).
- **(b) met, with gaps.** Every fix has a test that fails without it: see the mutation table, M1–M4
  and M6–M15 are all killed. Surviving mutants M17–M19 are coverage gaps (F5). M5 and M16 behave the
  same as the original in every case, so they are not gaps.
- **(c) met for the listed invariants; one robustness regression (F1).**
  - No lease or lock rule was loosened. The grant takes effect synchronously in `extensionEvent`,
    before any await. M10, which delays the grant until after the fill, fails 6 tests, including
    "a '' url is filled …; the grant holds at once", which checks that B's click is refused while the
    fill runs.
  - The only `chrome.windows.update` in `extension/src` is in focusTab:
    `grep -rn "windows.update" extension/src` → `extension/src/handlers/tabs.ts:61` (focusTab).
  - The waits are unchanged: `ACTIVATION_WAIT_MS = 1000` and `FRAME_WAIT_MS = 50` are untouched in the
    diff.
  - No log line was added: `git diff daemon/src | grep -n log` shows only the existing `log?:` option
    and comment lines. `fillUrl`/`record` call no `log(`.
  - `sw.ts`, `inject.ts` (`unwrapResult`), the content script and `build.mjs` are unchanged.
    `git diff --stat` touches only the 10 lane files, and nothing in `shared/`, `sdk/` or `mcp/`.
  - No new wire names, params or codes. The fill uses the existing `listTabs`. The refusals use the
    existing `WINDOW_MINIMIZED` and `OFFSCREEN`.
- **(d) met.** Each fix has a live behaviour that can be checked:
  - Fix 2 (SCREEN-2/4): `OFFSCREEN` or `WINDOW_MINIMIZED` comes back at once, and no banner appears
    because the debugger never attaches.
  - Fix 1 (SCREEN-5): the human's previous tab is back by about 30 s after the link started, while
    the client still gets `TIMEOUT` (at about 35 s).
  - Fix 3 (LEASE-3): `leaseGranted.url` is the fixture popup's url, received within about 2 s.
  - The step agent's ledger (Design section) records these expectations. None of them yet appears as
    expected text in a Run 9 row; that is (e)'s job.

## Mutation table (run in the worktree)

Each mutation was applied, then `npx vitest run` ran capture, handler-codes, target-tab, tab-events
and daemon tabs (129 tests), then the file was restored. Script:
`<scratchpad>/mutate.mjs`; output: `<scratchpad>/mut.txt`.

| # | mutation | result |
|---|---|---|
| M1 | the bound only releases, no restore at the bound | **killed**, 3 failed |
| M2 | focus-epoch check dropped | **killed**, 2 failed |
| M3 | active-tab re-read check dropped | **killed**, 2 failed |
| M4 | focusTab no longer calls `noteFocus` | **killed**, 1 failed (the V4 test) |
| M5 | `restore && !restoring` → `restore` (restore may run twice) | survives. The second call sees the previous tab already active and does nothing, so the outcome is the same. |
| M6 | cdp refusal not thrown | **killed**, 3 failed |
| M7 | the hidden-tab check dropped | **killed**, 3 failed |
| M8 | the order swapped (hidden is checked before minimized) | **killed**, 1 failed |
| M9 | the daemon sends at once with `""` | **killed**, 6 failed |
| M10 | the grant waits for the fill (F20 violation) | **killed**, 6 failed |
| M11 | the fill keeps the event's url | **killed**, 2 failed |
| M12 | polls every 200 ms | **killed**, 1 failed |
| M13 | the bound is 3000 ms | **killed**, 1 failed |
| M14 | `deliverGrant` without `grantStands` | **killed**, 1 failed |
| M15 | `deliverGrant` ignores `newTabsInFlight` | **killed**, 4 failed (F20 tests + fix 3) |
| M16 | the fill does not stop early when the grant is gone | survives. Only efficiency is lost; `deliverGrant` still checks the grant. |
| M17 | the fill does not stop on an extension-socket change | **survives**, untested (F5) |
| M18 | the fill does not stop when the tab is no longer listed | **survives**, untested (F5) |
| M19 | `about:blank` counts as a known url (so it never triggers a fill) | **survives**, untested (F5) |

My results agree with the builder's revert claims: M1 and the related fix-1 mutants each kill tests
in the new describe block, fix 2 kills 3, and fix 3 kills 6.

## Findings

**F1 — MAJOR — a hung restore wedges the window's capture chain forever (regression of the T3 V2
bound; spec §6.4).**
- What changed: at HEAD, `bound = setTimeout(releaseChain, 30 s)` stayed armed until the restore
  settled, so a hung `tabs.update` was freed at 30 s. Now `finally { clearTimeout(bound);
  restoreThenRelease(); }` clears the bound as soon as the capture settles, and only then waits for
  the restore. The restore (`restorePrevious`: a fresh `tabs.query`, then `tabs.update`) has no
  bound. If the bound itself fires, it also waits, unbounded, on the same restore.
- The probe: `<scratchpad>/zz-verifier.test.ts`, the capture-test harness plus 2 tests. The capture
  of tab 12 succeeds, then the restore hangs: `tabs.update(11)` never settles in V-WEDGE; the
  restore's `tabs.query` never settles in V-WEDGE-Q. A second capture of tab 13 is queued, and the
  test advances 120 s.
- Results:
  - With the lane: `× V-WEDGE … → expected false to be true` (`windows.get count 1`), and
    `× V-WEDGE-Q … → expected false to be true`.
  - With HEAD's `tabs.ts`: V-WEDGE **passes** (`windows.get count 2`, so the next link ran). V-WEDGE-Q
    does not apply at HEAD, which has no restore query.
- The code comment still promises "A hung Chrome call must not wedge a window for the worker's
  lifetime".
- Fix direction (the fixer's choice): keep an absolute release at `CHAIN_RELEASE_MAX_MS` from the
  link's start, independent of the restore. For example, do not `clearTimeout(bound)` until
  `release()`, and have the bound's handler call `release()` after starting the restore instead of
  waiting for it. Or race the restore against a short timer. Add V-WEDGE as a test.

**F2 — MINOR (doc, contract-level) — fix 2 contradicts spec §7.**
- What the spec says:
  - The §7 table's `cdp` row: "`chrome.debugger` → `Page.captureScreenshot` on the background tab;
    no lock … none — the human's view is untouched … unattended scripts sharing Chrome with a human".
  - §7.3: "CDP `Page.captureScreenshot` already forces the compositor to produce a frame for a
    background tab — that *is* the `cdp` mode".
  - Source: `grep -n -i cdp docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` → lines 74, 198,
    206.
- What the code does now: `cdp` captures only the tab that is already active in a window that is not
  minimized, so the mode no longer does the job the spec gives it (a background tab).
- Who authorised it: decisions.md · 2026-10-23 · #62 (user). The choice of `OFFSCREEN` and of
  refusing rather than bounding is the step agent's.
- What the protocol requires: whoever changes the behaviour amends §7 (table row and §7.3) in place
  with "*Superseded 2026-10-23: was 'on the background tab', because Run 8 SCREEN-2/SCREEN-4 measured
  CDP hang on a hidden tab and a minimized window; decisions.md #62*". The as-built register records
  it. `shared/src/protocol.ts` `ScreenshotMode` doc ("no lock, no tab switch") is still true, but
  should say "the active tab of a visible window only".

**F3 — MINOR (doc, outside the lane) — the `LeaseGrantedParams.url` comment is stale.**
- `shared/src/protocol.ts:117-118` says "`url` is `tabCreated`'s, so it may be ''".
- It is now the url that `listTabs` filled in. It may still be `""` (the test "at the 2 s bound …
  ('' here)" asserts `url === ""`), or `about:blank` ("a later about:blank is the best url seen at
  the bound").
- So "may be ''" stays true at the bound, but the reason is wrong. Amend it to: "filled from
  `listTabs` for up to 2 s; may still be '' or about:blank".
- `shared/` is outside the lane, so this goes to the step or session agent.

**F4 — MINOR — the switch-mode `WINDOW_MINIMIZED` message now gives advice that fails.**
- `extension/src/tabs.ts:186` reads "… restore the window, or pass mode:\"cdp\"". `mode:"cdp"` on a
  minimized window now refuses with `WINDOW_MINIMIZED` too.
- The text is pinned at `extension/test/capture.test.ts:93`. Changing it is a deliberate message
  change that needs a recorded decision, not a fixer editing expected text.

**F5 — MINOR — three fill branches are untested (mutants M17, M18, M19 survive).**
- M17: stop on an extension-socket change.
- M18: stop when the tab is no longer listed.
- M19: `about:blank` in the event as a fill trigger. The goal names it explicitly ("only when the url
  is '' or about:blank"), but every test emits `url: ""`.
- Each needs one test.

**F6 — NIT — the fill is bounded, but its worst case is about 3.1 s, not 2 s.**
- The deadline is checked between polls. A `listTabs` started just before the deadline runs with
  `URL_FILL_CALL_MS = 1000`, so the event can come about 1 s after the 2 s bound. No unbounded loop:
  every pass either awaits a bounded call or sleeps, and returns once the deadline has passed.
- On a socket change, `fillUrl` returns and `deliverGrant` still sends the best url seen so far
  (often `""`) if the grant stands. Leases survive an extension resync, so that is sound. The
  docstring's "stops early" could add "and sends what it has".

**F7 — NIT — `deliverGrant`'s new `grantStands` check on the immediate path behaves as before.**
- `applyOpener` has just granted `{owner.clientId, "opener"}` synchronously.
- The owner came from the opener tab's live lease. A disconnect runs `releaseAll`, so `nameOf` is
  defined.
- So `grantStands` is always true at that point. Confirmed by M14, which changes only the fill test,
  and by the unchanged F20 tests passing.

**F8 — NIT — a bound that fires during a pending `showTab` skips the restore for good.**
- This is the builder's deviation 5. `restorePrevious` re-reads, sees `prev` still active, and
  returns. `restoring` is now set, so the restore in `finally` never retries.
- When `showTab`'s `tabs.update` later lands, the target stays in front. This needs
  `chrome.tabs.update` itself to hang for 30 s or more; rare.

**F9 — NIT — `fullPage` with a hidden or minimized tab is still not refused, and unmeasured.**
- This is the builder's finding, confirmed by the test "fullPage is not refused (unmeasured; left as
  it was)".
- `OFFSCREEN` gains a second meaning (tab hidden). It was previously used only by `content/actions.ts`
  for an element out of the viewport. Any later SDK policy that maps `OFFSCREEN` to "scroll into view"
  would mislead.

**Deviation 1 (the re-pointed T3 test) — legitimate.**
- The test "mode cdp → Page.captureScreenshot … on the tab itself" moved from tab 12 (background) to
  tab 21 (active in window 2). It still pins "no switch, no `captureVisibleTab`, attach/send/detach
  on the tab".
- No expected message text was edited.
- A sibling test pins the designed change: tab 12 → `OFFSCREEN`, no attach. Both are killed by
  M6/M7.

**Deviation 4 (the residual focusTab race) — benign.**
- `focusTab` calls `noteFocus` before its own `windows.update` and `tabs.update`.
- A restore update that slips in between is issued earlier, so focusTab's later `tabs.update` wins.

## Summary

Counts reproduce: 934 at HEAD, 959 with the lane, with typecheck and build green in a clean worktree.
The mutation tests kill every core mutant of the three fixes: the bound restore, both V4 guards,
noteFocus, the cdp refusal and its order, send-at-once, grant-after-fill, the poll period and the
bound, and the hold-back. No lease or lock invariant is loosened, no window focus was added, no log
line was added, and nothing changed on the wire or outside the lane.

One regression blocks a PASS. Fix 1 clears the 30 s chain bound before the restore settles, so a
hung `tabs.query` or `tabs.update` in the restore wedges the window's chain forever. HEAD released it
at 30 s, and probe V-WEDGE passes at HEAD and fails with the lane. One fix round should close it, with
V-WEDGE added as a test. The documentation items are separate: F2 (spec §7 superseded note), F3 (the
`LeaseGrantedParams.url` comment) and F4 (the stale "pass mode:\"cdp\"" advice) need the governing
docs amended by the step or session agent, and F5 adds three small tests.

## Re-check (fix round 1)

Same verifier, 2026-10-23. The scope was only F1 and F5.

### Verdict: PASS-with-notes

F1 and F5 are both closed. There is one new note (N1, MINOR): the trade-off in the accepted
deviation, described below.

### Set-up

- A fresh worktree at HEAD `8ed3e89`, with the 10 lane files copied in from the main tree
  (`git status --short | wc -l` → `10`), then `npm ci` (exit 0).
- Results:
  - `npm run typecheck` → `typecheck exit 0`
  - `npm test` → `Test Files 59 passed (59)` / `Tests 965 passed (965)` (959 → 965, +6)
  - `npm run build` → `build exit 0`
- The worktree was removed afterwards. `git worktree list` shows only the main tree.

### Nothing else changed (against round 0)

- `diff <round-0 tabs.ts> extension/src/tabs.ts`: the only changes are inside `captureOnce`:
  - its docstring;
  - a new `startRestore()`;
  - the bound now runs `void startRestore(); release();` and is cleared only inside `release()`;
  - `finally` now runs `void startRestore().then(release)`.
- `git diff --stat` for every other source file matches round 0 line for line: `intercept.ts` 91,
  `wsHost.ts` 3, `debugger.ts` 5, `perceive.ts` 9, `handlers/tabs.ts` 4, `handler-codes.test.ts` 79,
  `target-tab.test.ts` 20.
- Only `capture.test.ts` (135 → 220 lines changed) and `daemon/test/tabs.test.ts` (151 → 223) grew.
  `fillUrl` is unchanged, as claimed.

### Mutations

Script: `<scratchpad>/mutate-r1v.mjs`. Each mutation ran against capture, handler-codes, target-tab,
tab-events and daemon tabs, 135 tests.

| # | mutation | result |
|---|---|---|
| R1 | round-0 `captureOnce` put back (bound cleared in `finally`, release waits for the restore) | **killed**, 4 failed (V-WEDGE, V-WEDGE-Q, "hung capture whose bound-started restore also hangs", "bound fires first … releases at once") |
| R2 | the bound waits for the restore before releasing | **killed**, 4 failed |
| R3 | the bound cleared when the capture settles | **killed**, 2 failed (V-WEDGE, V-WEDGE-Q) |
| R4 | the bound only releases, no restore | **killed**, 4 failed |
| R5 | the restore may run twice | **killed**, 1 failed (V-WEDGE). In round 0 this mutant survived. |
| R6 | `release()` not idempotent | survives, harmless: resolving a promise twice does nothing |
| M2 / M3 | the V4 guards dropped | **killed**, 2 failed each |
| M17 | the fill does not stop on a socket change | **killed**, 1 failed ("F5/M17 … socket changes mid-fill") |
| M18 | the fill does not stop when the tab is no longer listed | **killed**, 1 failed ("F5/M18") |
| M19 | `about:blank` counts as a known url | **killed**, 2 failed ("F5/M19 … triggers the fill", "F5/M18") |

**F1 closed.** The chain is now released no later than 30 s after the link starts, whether a restore
is pending or not. My round-0 probes V-WEDGE and V-WEDGE-Q are now in the suite and fail without the
fix. **F5 closed.** M17, M18 and M19 are all killed.

### The deviation (the builder's "33 000" test replaced) — accepted, with note N1

Spec §6.4 says the bound must hold ("a hung screenshot cannot wedge everyone"). The F19 rule ("the
next link waits for the previous restore") can only give way to it when the restore hangs, and the
replacement test pins exactly that case. HEAD also released the chain at 30 s without waiting for
anything.

**N1 — MINOR.** When the bound fires first, the next link can start while the restore the bound
started is still in flight. The replacement test shows it: link B starts at 30 000, and the slow
`update 11` lands at 33 000. If that late restore lands inside B's switch-and-capture window (its
50 ms frame wait and the capture), B captures tab 11 instead of its own target. The fake
`captureVisibleTab` returns `"…next"` whatever tab is active, so no test sees this. The window's
final state is still the human's tab, because B's own restore re-reads the active tab first.
Whether it can happen at all depends on a Chrome `tabs.update` taking seconds, which nothing
measured has shown. Record it as a known edge in the as-built register. No change is required.
