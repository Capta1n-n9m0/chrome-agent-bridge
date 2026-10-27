# S6 — `newTab` on `about:blank` · verifier report, round 2 (after fixer 1)

Verifier: Opus 5.5, effort medium. 2026-10-27. Audited: the uncommitted S6 build in the main tree (HEAD `9f7bf0b`;
`extension/src/newtab-open.ts` is byte-equal to the fixer's saved copy `newtab-open.fix1.ts`). Read and run only: no
tracked file edited, no git state changed, no Chrome work. Scratch lives in the session scratchpad only (no worktree:
copies of `extension/src` + the S6 test run by the repo's vitest with `--root` pointed at the copy and a scratch config
aliasing `@bridge/shared` to `shared/src`). Re-checked only the items the brief names.

## 1. Verdict

**PASS-with-notes.** V1 is closed for the case it described: the blank page's own `complete` is spent before the
URL's load wait is armed. Three narrow residuals remain (N1, by design and bounded, unmeasured in Chrome). E6.1–E6.4,
the every-stage checks and #312's accounting still hold. The fixer's mutant claim reproduces exactly.

## 2. Outputs and numbers (re-derived)

| Check | Command | Result |
|---|---|---|
| typecheck | `npm run typecheck` | exit 0 |
| tests | `npm test` | `Test Files 184 passed (184)`, `Tests 4560 passed (4560)`, exit 0 |
| build | `npm run build` | `built extension → dist/`, exit 0; `git status --short` afterwards: the S6 lane files and S6 reports only |
| delta | | 4535/183 (round 1's re-derived "before") → 4560/184: +25 tests, +1 file, all in `s6-newtab-blank.test.ts` (19 builder + 6 fixer) |
| E6.4 | `git diff ce1f06d --stat -- daemon shared sdk mcp extension/test` | empty |
| router methods | `grep -c 'router.on("' extension/src/sw.ts` | 27 |
| log sites | `grep -n "console\|log(" extension/src/newtab-open.ts` | none; `log-scan`/`log-sentinel` green inside 4560 → +0 |
| sw.ts | `git diff` | still the one `dnrForTab` line (#312) |

## 3. V1 — closed

**Round 1's scratch, re-run on the current code** (`scratchpad/v2/test/probe.test.ts`: round 1's
`zz-verifier-s6.final.ts` with imports pointed at the repo, a `tabs.get` added to the stub that answers `complete`
once the blank tab's `complete` has fired, else `loading`, and new V-3 cases). **16 of 17 pass**; the one failure is
N2 below (a scratch assertion of mine, not an S6 test). Output: `scratchpad/v2-probe.txt`.
- V-1 (7 release paths) and V-2 (rebuild / failed rebuild while held): all pass unchanged. `rules = 0`, keeper
  `live = 0` after every reply.
- **V-3b** (the realistic V1 shape: the blank's `complete` at +5 ms, while the rules install; the URL's at +50 ms
  after `update`): log `["create about:blank","blank-complete","update … rules=1","url-complete rules=1"]`. The reply
  and the release come after the URL's load. Listeners 0, timers 0 afterwards.
- **V-3c** (blank `complete` at +5 ms, the URL never loads): no reply at 29 s; at 30 s+ `Timed out waiting for tab 99
  to load` (unchanged text). Rules, live, listeners, timers all 0.
- **V-3f** (the install rejected while the settle is pending, blank `complete` due at +1 s): `DISARMED`, `remove(99)`,
  no `update`, settle listener dropped (onUpdated listeners 0; the one remaining timer is the stub's own +1 s timer).
- **V-3g** (blank silent, `get` says `loading`, the URL never loads): no reply at 31.9 s, the timeout at ~32 s, same
  message. The daemon waits 30 s + `DAEMON_SLACK_MS` 5 s (`sdk/src/client.ts:51`, `daemon/src/intercept.ts:524`), so
  the extension's own message still reaches the client first in the worst case (2 s of the 5 s slack used).
- **V-3h** (`tabs.get` rejects, tab gone): no hang; `tabs.update`'s error surfaces unchanged; rules and live 0.

**Attacks on `settleBlank` by reading** (`newtab-open.ts:46–65`):
- Listener armed before `tabs.get` (`:58` then `:60`): a `complete` delivered while `get` is pending is caught
  (fixer test "arms the listener before get"). `get` answering `loading` then the event: caught by the listener.
- `end()` is idempotent (`clearTimeout`, `removeListener`, `finish` are all no-ops the second time), so a `get` reply
  after `cancel()` or after the bound is harmless. The bound timer is set before `get` is called, so even a synchronous
  throw from `get` would end at 2 s with the listener removed.
- `done` never rejects, so `await blank.done` (`:93`) adds no new error path; the hold-failure path cancels before
  `remove` (`:89`).
- **No listener or timer leak** from the settle on any path (V-3b, V-3c, V-3f, fixer tests).
- No-redirect answer unchanged: success replies `{id}` (V-1 success, V-3b, the builder's E6.1 test).

## 4. Findings

### N1 — MINOR — three narrow ways a blank `complete` can still end the URL's wait (by design, bounded, unmeasured)
`extension/src/newtab-open.ts:59–61, 93–94`. `waitForLoad` still takes the first `complete` for the id, so the
fix relies on the blank tab's `complete` having been delivered before the URL listener is armed. It is not, and the
reply plus the rule release come before the URL's load (`rules=0` at `url-complete`), in these cases (scratch, all
reply `{id}` early):
- **V-3a**: the blank stays silent past the 2 s bound and reports `complete` only after `update`.
- **V-3d**: Chrome reports a second `complete` for the blank page after the first.
- **V-3e**: `tabs.get` answers `complete` while the matching `onUpdated` event is still queued (the fixer's own stated
  residual).
None is known to happen in Chrome; Stage 0 saw no early resolution in 10 of 10 with the old order. The fixer's
proposed decision names the right revisit triggers. **Suggested:** no code change now; Run 17b (RD-2 / D7.3) should
record `newTab`'s reply time against the URL's load. If it ever answers early, the robust fix is a URL wait that
ignores `complete` until a `loading` reported *after* the `tabs.update` call resolved (or `webNavigation.onCommitted`
for the main frame), which the fixer rejected only because the blank's own `loading` is ambiguous before the settle.

### N2 — NIT — a failed `tabs.update` leaves the URL's load listener armed for 30 s
`newtab-open.ts:94–101`. When `navigate` throws, `waitLoad`'s listener and timer stay until its 30 s timeout (V-3h:
onUpdated listeners = 1 after the reply). The rejection is swallowed (`:95`), the tab is removed, and Chrome does not
reuse tab ids, so nothing can resolve it. `handlers/navigate.ts:10–15` has the same pattern; this predates the fix.
No action needed; worth a cancel hook if `waitForLoad` is ever touched.

### N3 — NIT — the spec's §10 bullet says "never on the blank page's"
`docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` §10 S6 bullet (diff line `+777…`): "so the wait ends on the
URL's load, never on the blank page's". Accurate for the expected order; N1's three residuals make "never" slightly
strong. Suggest "the blank page's own load is spent first, so the wait ends on the URL's load". The rest of the bullet
(2 s bound, 30 s and the same message, fail-closed paths including the navigation-call failure, the visible
differences) matches the code. One line of the bullet is also longer than its neighbours (a re-wrap). §6.2's note is
unchanged and accurate. The spec file is still the only doc change and separable for E6.5.

### N4 — NIT — size
`wc -l`: `newtab-open.ts` 104, test 429, plus +42/−3 in `tabs.ts`/`safety-call.ts`/`sw.ts`: about 575 lines against
the plan's ≤ ~400 (about 145 code, 430 tests). One coherent piece; the step agent's call.

## 5. The new tests fail on the pre-fix code (item 3)

- **Fixer's mutant** (`await blank.done` → `void blank.done` in a copy, `scratchpad/mvoid`): **3 failed / 25**,
  exactly the three V1 tests (`v2-mvoid.txt`). Confirmed.
- **The builder's own `openBehindRules`** (`newtab-open.orig.ts`, with the current `settleBlank` export added so the
  test file loads; `scratchpad/morig`): **6 failed / 25**, the three V1 tests and the three pure-sequence log tests
  (`v2-morig.txt`). The V1 timeout test fails with `expected { id: 99 } to be undefined`, the defect itself.
- **The plan's navigate-before-install mutant** on the current code (`scratchpad/mnav`: `holdRules` not awaited,
  `navigate` first): **13 failed / 25**, including every E6.1 handler test, E6.2 and the real-keeper rejection test
  (`v2-mnav.txt`). Still red.

## 6. E6.1–E6.4 and #312 after the fix

- **E6.1:** the handler-level `HEAD`/order assertions are unchanged; order create → install resolved → navigate →
  release on success, refusal, error and timeout. Now discriminating for "release after the URL's load" (V1 test 2,
  scratch V-3b).
- **E6.2:** rejecting install → 0 `update`, `remove(99)`, `DISARMED` + `STATE_UNREADABLE_MESSAGE` `{scope:"all"}`
  (S6 test, real-keeper test, scratch V-1 and V-3f).
- **E6.3:** `handlers/tabs.ts` diff: the lines after the new `if` are the old body byte for byte; `git diff ce1f06d --
  extension/test` empty; the three E6.3 tests pass.
- **E6.4:** empty cross-package diff; log sites +0.
- **#312 Revisit-if: still not met.** The second handle is released and the keeper's `live` map is empty on every path,
  including the new ones: hold refused while the settle is pending (V-3f), silent blank → timeout (V-3g), `get`
  rejecting (V-3h), plus round 1's seven paths and both rebuild cases (V-1, V-2), all re-run green.

## 7. The fixer's proposed decision

**Agree** with "`newTab` lets its blank tab finish loading before it waits for the URL". It is in lane, leaves
`waitForLoad` and `navigate` untouched, adds no latency in the normal case, cannot hang (2 s bound, never rejects),
and keeps the client-visible timeout and message. Its "Revisit if" covers N1. One addition to its Revisit-if: "or
Chrome is seen to report `complete` twice for a fresh `about:blank` tab" (V-3d).

## 8. Handoff

Nothing running. Evidence in
`C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\d035dea7-b98d-4720-a2c2-977e538a66da\scratchpad\`:
`v2-typecheck.txt`, `v2-test.txt`, `v2-build.txt`, `v2-probe.txt` (+ `v2/test/probe.test.ts`), `v2-mvoid.txt`,
`v2-morig.txt`, `v2-mnav.txt` (+ the `mvoid`, `morig`, `mnav` copies). E6.5 (spec commit before the code commit) is
the committer's.
