# S3b builder: the download half, #302's narrowed rebuild, the options page's caps warning

Builder: Claude Opus 5.5, medium effort. Start tree: `b82e009` (D3.3's `<start>` = `ecd254f`). Not committed.

## 1. Verdict

**DONE**, but **over the size cap**: about 517 new lines of code and tests against the ~400 cap (217 code, 300 tests).
Nothing is left to build. I saw the overrun only once the work was finished, so this is not a DONE-PARTIAL. The step
agent decides whether to accept it as one piece, as S2 and S3a were (#301, #302).

## 2. Outputs

**New module:** `extension/src/safety-hop.ts`, `BlockedHopWatcher` (pure, no `chrome.*`, no log). `open(list)` gives a
call a `HopWatch`. `offer(event)` is fed from the existing `onErrorOccurred` listener. A hit needs all of these:
- `tabId === -1`
- `type === "xmlhttprequest"`
- `initiator === "chrome-extension://<own id>"` (the values measured in `stage0-dnr-290-3.txt`)
- `error === "net::ERR_BLOCKED_BY_CLIENT"`
- the watch's list blocks the URL (`isUrlBlocked`, tested in memory)

Each watch keeps only a boolean. `settle(ms)` resolves at once on a hit, otherwise after `HOP_SETTLE_MS = 300` or at
`close`. `offer` never throws, so the `ingest` that follows always runs.

**Wiring:**
- `safety-call.ts`:
  - `CallSafetyDeps.watchHops?` and `HandlerSafety.hopBlocked?` added.
  - `effect()` opens one watch, but only for a `downloadStart` whose keeper handle holds rules (`dnr.holding()`). It
    uses the list of that call's own gate read, the one the rules came from. `checkFinalUrl`'s second `effect()`
    opens none.
  - `post()` closes the watch in its `finally`, before the release.
- `handlers/download.ts`: a rejected `fetch` keeps its old order: refused first, then timeout (`TIMEOUT`). After those,
  if `await call.hopBlocked()` is true, the handler throws `DOMAIN_BLOCKED` with `BLOCKED_URL_MESSAGE` and no `data`.
  That is R14-5c's exact text, and no message changed. Anything else rethrows as today. The old "not built" header
  sentence is replaced by the S3b note.
- `sw.ts`:
  - one `BlockedHopWatcher` at the top level;
  - `callDeps.watchHops`;
  - the `onErrorOccurred` callback calls `hopWatcher.offer(d)` and then `void ingest(...)`. No new listener: 19
    before and after (the S3a static test passes unchanged);
  - the router's factory calls `dnrKeeper.call(method, params)` with no `"tab"` filter, so `downloadStart` gets its
    download-scope handle;
  - the rebuild is guarded by `rebuildsRules(changes, safety.memory)`.
  - No new top-level `await`.

**#302:** `safety-state.ts` `rebuildsRules(changes, mem)` is true only when the memory copy is unreadable, or when the
`safety.blockList` change has a different old and new value (missing = `""`, malformed change = true).

**Options page:**
- `options-model.ts` gains `blockListRuleWarnings(text, caps)`, which uses S1's `countRules`/`fitsCaps` and `rulesOf`.
  It gives two warnings:
  - the caps warning, when one call's rules would not fit;
  - a line-numbered long-host warning, when a single pattern makes a regex over `MAX_SAFE_REGEX_CHARS = 119` (S1's
    test budget, #300).
- It also adds `MEASURED_DNR_CAPS` (5000/1000).
- `options.ts` renders the warnings into a new `<ul id="blocklist-caps" class="warning">`. The caps come from
  `chrome.declarativeNetRequest.MAX_*`, falling back to the measured values.
- No warning text names a pattern.

**Docs:**
- `docs/setup.md`: one sentence about the warning, in § Blocked sites.
- `docs/e2e-test-plan.md` §4.24: five placeholder rows appended after RD-DISARM, in the same format. They are RD-DL-HOP,
  RD-DL-ERR, RD-DL-SOCKET, RD-REBUILD-NARROW and RD-CAPS-WARN.

**Tests:**
- `extension/test/s3b-download-hop.test.ts` (new, 15 tests):
  - the recogniser's hit, its non-hits (each field), the late hit through `settle`, `close`, per-watch lists and
    garbage input;
  - a deep scan that no string reachable from the watcher holds the URL, plus a static scan of `safety-hop.ts` (no log
    call, no field assigned from `url`);
  - `CallSafety` opens the watch once and closes it, with no watch for an empty list or for `navigate`;
  - end to end with the real keeper and a fake DNR: the download rules in force at fetch time are all
    `resourceTypes ["xmlhttprequest"]`, `tabIds [-1]` and own initiator; the answer is `DOMAIN_BLOCKED` with the exact
    text and `data` undefined; 0 rules after `post`;
  - an event that arrives 20 ms after the rejection still counts;
  - **a failure with no blocked hop keeps today's answer**: same constructor, message and code as the no-call path;
  - `rebuildsRules` cases;
  - two static `sw.ts` checks.
- `options-model.test.ts`: +3. `s3a-dnr-wiring.test.ts`: one assertion re-pinned to the factory with no filter
  (changed, not removed).
- `safety-static.test.ts` scans every `safety*.ts` automatically: +2 for `safety-hop.ts`.

**Red without the change:** I swapped the old versions of the five edited source files back in (from `git show HEAD:`,
then restored them). **12 tests failed**:
- every new CallSafety, download, `rebuildsRules`, static and options test;
- the re-pinned S3a assertion.

The tests that stayed green on the old code were the "keeps today's answer" preservation test (expected to pass there)
and the recogniser's own tests (a new module).

**Commands (my runs, final tree):**
- `npm test`: `Test Files 161 passed (161)`, `Tests 4155 passed (4155)`. Before: `160 passed`, `4135 passed`.
  That is +20 (15 + 3 + 2), none removed.
- `npm run typecheck`: exit 0. `npm run build`: exit 0.
- `npx tsc --noEmit -p recipes/{tsconfig,tsconfig.fe,.s6,.s9,.s10,.s11}.json`: all six exit 0.
- **D3.3:** `git diff ecd254f -- daemon shared sdk mcp` is empty.
- **D3.4:** the count tests pass unchanged inside the full run. No method, code or tool was added.
- **D3.5:** log-scan 16/16 and log-sentinel 7/7 pass. The allowlist still has 54 entries, so the change is **+0** (S3
  as a whole: +0).
- `git status` after the build: only my edits, plus `journal.md`, which was already modified before I started.

**Lines added by file (`git diff --numstat` / `wc -l`):**

| File | Lines |
|---|---|
| `safety-hop.ts` | 112 (new) |
| `options-model.ts` | +35 |
| `options.ts` | +19 |
| `safety-call.ts` | +16 |
| `safety-state.ts` | +13 |
| `sw.ts` | +14 / −7 |
| `handlers/download.ts` | +7 / −2 |
| `options.html` | +1 |
| `s3b-download-hop.test.ts` | 276 (new) |
| `options-model.test.ts` | +22 |
| `s3a-dnr-wiring.test.ts` | ±2 |
| `docs/e2e-test-plan.md` | +13 |
| `docs/setup.md` | +4 / −1 |

## 4. Deviations

- **Size:** about 517 lines against ~400. All of it is in the lane, and it is one deliverable.
- **Test-first order:** I wrote the source before the tests. To make up for that, I proved the tests red on the old code
  as described above.
- **The recogniser also checks `type` and `initiator`**, which is stricter than 0.6's wording. Both values were measured
  in Stage 0. Without them, another extension's blocked worker request to a host on our list would mislabel a genuine
  failure of our download.
- **`settle`:** a failed fetch that holds rules waits up to 300 ms for the event. Stage 0 recorded no order between the
  `onErrorOccurred` event and the `fetch` rejection: its probe slept 200 ms before reading events. A genuine network
  failure with a non-empty list therefore answers up to 300 ms later, with the same answer. An empty list never waits.

## 5. Proposed decisions

### 2026-10-26 · S3b: a blocked download hop is recognised strictly, with a 300 ms bounded wait
**Decided:** a hop counts only for tab −1, `xmlhttprequest`, the own `chrome-extension://` initiator,
`ERR_BLOCKED_BY_CLIENT`, and a URL the call's own list (from its first `effect()` read) blocks. A failed fetch that
holds rules waits up to 300 ms for that event. **Why:** these are the measured fields, and the event/rejection order is
unmeasured. **Instead of:** no wait, which would risk today's generic answer on a real blocked hop; or no
type/initiator check (looser). **Revisit if:** Run 17's RD-DL-HOP records the order or a reply time near 300 ms; or a
list edit mid-download leaves a hop blocked by the new rules answered as a generic failure (the watch keeps the call's
own list, as 0.6 says). **By:** Claude (proposed)

### 2026-10-26 · S3b: the options warnings use one call's rule count and a 119-character regex bound
**Decided:** the caps warning fires when one covered call's rules exceed Chrome's caps. Two concurrent covered calls
double the count, and the warning does not cover that. The long-host warning uses S1's 119-character budget as the
"may be rejected" line. **Why:** a simple, explainable threshold, with the keeper failing closed past it either way.
**Revisit if:** Run 17's `isRegexSupported` (RD-CAPS-WARN) disagrees with 119. **By:** Claude (proposed)

## 6. Findings

- **Gotcha candidates for `extension/CLAUDE.md` (session agent):**
  - the "not a network firewall" bullet now has a download half: the typed own-initiator tab −1 rule, recognised by
    `safety-hop.ts`;
  - the rebuild runs only on block-list edits (#302);
  - the key-files list gains `safety-hop.ts`.
- **Not measured:** the order of `onErrorOccurred` against the `fetch` rejection (RD-DL-HOP).

## 7. Handoff

Nothing is running, and Chrome was not touched. Next: the verifier. Useful mutants:
- drop the `type` or `initiator` check;
- call `offer` after `ingest`;
- remove the `rebuildsRules` guard;
- remove `close()` in `post`;
- skip the `holding()` condition.

`journal.md` was left unstaged and unedited by me.
