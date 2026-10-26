# Step 11b — S3a builder report (the rule keeper wired for tab navigations, and the manifest)

Builder: Opus 5.5, medium effort. Uncommitted, as briefed.

## 1. Verdict

**DONE**. The work is complete. It is over the size cap: 494 new lines of code and tests (157 code, 337 tests), plus
37 lines of docs, against about 400. Most of the excess is tests. I found it only at the end, with nothing left to
build (see §4).

## 2. Outputs

**Spec-note file (commit first, D3.2):**
- `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md`: one dated §10 note, "Amended 2026-10-26 (Step 11b S3a …)",
  18 lines. It adds no method, code, event, field or message.

**Code and test files (commit second):**
- `extension/manifest.json`: `permissions` gains `declarativeNetRequestWithHostAccess`, appended.
- `extension/test/manifest.test.ts`: re-pinned with a dated header note. Adds two tests: exactly one permission added
  (and neither `declarativeNetRequest` nor `…Feedback`), and no `declarative_net_request` key with every other key
  unchanged. S2b's tests pin the new list.
- `extension/src/safety-dnr-keeper.ts`, the #301 items:
  - (a) `resyncIfIdle()`: after a rejected rebuild with no covered call live, it retries the clear. It runs at the end
    of every release and before every install. If the clear succeeds, the keeper is synced again.
  - (b) `bounded()`: every DNR call is raced against `timeoutMs` (default `DNR_TIMEOUT_MS` = 5 000). A timeout counts as
    a rejection. A timed-out add's ids, at install or rebuild, are kept as orphans. `clear()` no longer drops orphans,
    because a timed-out add may still land after the clear's read.
  - `holding()` on the handle, and `call(method, params, only?)`: with `only`, a call of another scope gets an inert
    handle.
  - `fitsCaps` moved inside the install's `try`, so a throwing `caps()` fails closed.
- `extension/src/safety-call.ts`:
  - `CallSafety` takes an optional fourth argument `dnr: DnrCall`. It defaults to an inert `NO_RULES`, so every call
    without a handle behaves as before.
  - `effect()` runs `mark()`, then the re-check (the new `gate()` returns the view it read), then
    `install(view.ctx.blockList)`.
  - `post()` releases in a `finally`, then reads `refusal()` after the release has settled (S2-builder.md §7, V1). The
    gate's own refusal still wins.
  - `HandlerSafety.holdsRules?()` is new.
- `extension/src/sw.ts`:
  - The keeper is constructed at the top level, after `tabInfo`. `chrome.declarativeNetRequest` is read at call time
    (a missing API rejects, and the caps fall back to 0, so the call fails closed).
  - `void dnrKeeper.ready;` sits next to `safety.start()`.
  - `void dnrKeeper.sweep();` is in `onDisarm`.
  - The rebuild runs inside the existing safety `storage.onChanged` block.
  - The router's factory passes `dnrKeeper.call(method, params, "tab")`.
  - No new listener (19 `addListener(` before and after) and no top-level `await`.
- `extension/src/handlers/history.ts`, #301 (c):
  - `back` and `forward` share `go()`. When the call holds rules, `waitForLoad(id, HISTORY_SETTLE_MS = 10 000)` is armed
    before `goBack`/`goForward`. After the navigation call, if `tabs.get(id).status === "loading"`, the handler waits
    for the load or the bound, and swallows a failure.
  - The answer stays `{ok: true}`. With an empty list it behaves exactly as before.
- `extension/test/safety-dnr-keeper.test.ts`: 6 new tests:
  - R1: a rejected install keeps the leftover rules, and the next update retries them.
  - (a) two cases.
  - (b) two cases: a hung add that lands late and is later removed, and a hung start-up read.
  - `holding()`.
- `extension/test/s3a-dnr-wiring.test.ts` (new): 11 tests:
  - The effect order: mark, then the read, then the install.
  - A refused re-check installs nothing.
  - A rejected install refuses without Chrome's text.
  - `post()` releases before it reads the refusal.
  - `post()` releases when the gate throws.
  - A call without a handle answers as before.
  - An end-to-end test with the real keeper (a failed rebuild mid-call refuses the reply and leaves 0 rules).
  - `only`.
  - Three static `sw.ts` checks.
- `docs/e2e-test-plan.md` §4.24: a dated note and 9 placeholder rows appended after S0F-b's rows: RD-PERM, RD-START,
  RD-NAV-HOP, RD-BACK, RD-FWD, RD-BACK-EMPTY, RD-BACK-SAMEDOC, RD-REBUILD, RD-DISARM.

**Results:**

| Check | Result |
|---|---|
| Tests, before (`npm test`, my run) | `Test Files 159 passed (159)`, `Tests 4111 passed (4111)` |
| Tests, after | `Test Files 160 passed (160)`, `Tests 4130 passed (4130)`: +19, none removed |
| Test count by file | keeper +6, wiring +11 (new file), manifest +2 |
| `npm run typecheck` | exit 0 |
| `npm run build` | `built extension → dist/`, exit 0 |
| Recipes typechecks | `tsc --noEmit -p recipes/{tsconfig,tsconfig.fe,tsconfig.s6,tsconfig.s9,tsconfig.s10,tsconfig.s11}.json`: all exit 0 |

**Exit checks:**
- **D3.1:** `manifest.test.ts` passes, 6 tests.
- **D3.3:** `git diff ecd254f --stat -- daemon shared sdk mcp` is empty.
- **D3.4:** the existing count tests pass unchanged; `METHOD_CLASSES` and `daemon/src/methods.ts` were not touched.
- **D3.5:** no log line added; `log-allowlist.ts` is unchanged, so the log-scan count is +0. `log-scan.test.ts` 16/16.
- **Verifier focus:** `sw-static.test.ts` (top-level `await` scan) and `safety-gate.test.ts` (router scan) pass
  unchanged. No existing safety test was edited, and no expected text for SAFE-5b or R14-5c was edited.
- **After the build:** `git status --short` shows only my files and the pre-existing `journal.md` change.
- **Fail-before proof:** the 5 new keeper tests for (a), (b) and `holding()` failed on the pre-stage keeper (run
  before the code change). R1 passed: it was the test gap S2 recorded, and the code was already correct. The wiring
  tests use APIs that did not exist before (the fourth `CallSafety` argument, `holdsRules`, `only`); the verifier
  proves them.

## 3. Verifier verdict

Not applicable (builder).

## 4. Deviations

- **Size:** about 494 new lines of code and tests against about 400. The code is 157 lines.
- **Lane:** `back` and `forward` live in `extension/src/handlers/history.ts`, not in `navigate.ts` or `tabs.ts`. The
  brief's READ list says "wherever back/forward live", so I edited `history.ts`. `navigate.ts` is unchanged.
- **The rebuild trigger:** the rebuild runs on every safety-key change, not only on `safety.blockList`. Naming the key
  in `sw.ts` fails two guards, `sw-static` ("stored key names appear in safety-state.ts only") and `safety-writers`
  (`SAFETY_KEYS` referenced outside its module). Weakening either is forbidden. A test-only exported helper in
  `safety-state.ts` would be outside my lane.
- **The disarm clear:** "the disarm clear per the phase doc" is built as `sweep()`, as #296 item 5 and S2 amend 0.5.
  It removes orphans only; a running call keeps its own rules.
- **The download half is not wired:** S3a passes `only: "tab"`, so `downloadStart` gets an inert handle until S3b.
  The phase doc's S3 bullet also lists `downloadStart`, but that bullet was split by the Stages note.
- **`newTab`:** unchanged (#295). `navigate`'s post-check is unchanged (Stage0.md §4).

## 5. Proposed decisions

### 2026-10-26 · S3a: the keeper rebuilds on every safety-key change, not only on a block-list edit
**Decided:** the existing safety `storage.onChanged` block calls `rebuild(list | null)` from a fresh read on any
safety-key change. **Why:** the key name must stay in `safety-state.ts` (two guards). A rebuild with an unchanged list
swaps in identical rules, and it also covers a state made unreadable by another key. **Instead of:** a key-name test
in `sw.ts` (breaks the guards); a new helper in `safety-state.ts` (outside the lane). **Revisit if:** Run 17 shows a
false refusal from the epoch bump (a toggle between a call's mark and its install), or the extra update costs
measurably. **By:** Claude (proposed)

### 2026-10-26 · S3a: `back`/`forward` wait up to 10 s for their load only while they hold rules
**Decided:** #301 (c) is built. The handler waits for the load it started only when the call holds rules and the tab
reads `loading` after `goBack`/`goForward`. The wait is bounded at 10 s, is never an error, and leaves the answer
unchanged. **Why:** a rule removed before the hop does nothing. Waiting only while holding rules keeps the default
(empty list) behaviour identical. Checking for `loading` avoids a 10 s stall on a same-document entry. **Instead of:**
always waiting (changes latency for everyone); holding the rule past the call (the STOP rule "a rule left installed
after its call ended"). **Revisit if:** Run 17 RD-BACK shows hits on the blocked fixture (the tab not yet `loading`
when `goBack` resolves), or RD-BACK-SAMEDOC waits. **By:** Claude (proposed)

### 2026-10-26 · S3a: a 5 s bound per DNR call; a clear keeps the orphan list
**Decided:** `DNR_TIMEOUT_MS = 5 000` per `updateSessionRules`/`getSessionRules`. A timed-out add's ids become orphans,
and `clear()` no longer empties the orphan list (removing an id Chrome does not hold is ignored, as the docs say).
**Why:** #301 (b). A late add after a clear would otherwise leave a rule nobody removes. **Revisit if:** Run 17 sees a
DNR call near the bound. **By:** Claude (proposed)

## 6. Findings

- No pre-registered check failed. No runtime fact was measured (no live run).
- Unmeasured, for Run 17: whether `tabs.get().status` reads `loading` right after `goBack` resolves for a
  cross-document entry. I expect it does, by reading Chromium: the navigation starts inside `GoBack()`. RD-BACK,
  RD-FWD and RD-BACK-SAMEDOC measure it.
- Residual risk: when the rebuild comes from a non-list key change, a covered call between its `mark()` and its
  install is refused (fails closed; rare).
- Not tested (residual): a timed-out add landing after an idle clear. By construction its ids stay listed as orphans.

## 7. Handoff

- Nothing is running; no PIDs. The extension was not reloaded and the daemon was not started (Run 17 does both). The
  new permission needs one reload by `recipes/reload-extension.ps1`.
- The committer commits the spec-note file first, then the code and test files plus `docs/e2e-test-plan.md`. Do not
  stage `journal.md` (it holds the session agent's edits).
- S3b: wire the download scope by dropping `only: "tab"` in `sw.ts`'s factory, or passing `"download"` there as well.
  `CallSafety.effect()` already installs once per call, `checkFinalUrl` included. Also `onErrorOccurred` before
  `ingest`, `download.ts`'s mapping, and the options page's caps warning.
