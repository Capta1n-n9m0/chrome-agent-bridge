# Step 11b — S3a verifier report (the rule keeper wired for tab navigations, and the manifest)

Verifier: Opus 5.5, medium effort. Read and run only; no tracked file edited. Start commit `ecd254f`; the work audited
is the uncommitted diff in the main tree plus `extension/test/s3a-dnr-wiring.test.ts` (`journal.md` ignored).

## 1. Verdict

**PASS-with-notes.** No CRITICAL or MAJOR finding; every exit check that can be run now holds. Two MINOR and four NIT
findings (§4). Layer followed: the phase doc (0.3–0.6, Stages note, S3, exit checks, STOP rules) as amended by #295,
#296 and #301.

## 2. Re-run results (main tree, after the builder's work)

| Check | Result |
|---|---|
| `npm run typecheck` | exit 0 (shared → daemon → sdk → mcp → extension) |
| `npm test` | `Test Files 160 passed (160)`, `Tests 4130 passed (4130)`, exit 0 |
| `npm run build` | `built extension → dist/`, exit 0; `git status --short` afterwards unchanged (only the stage's files and `journal.md`) |
| Recipes typechecks | `tsconfig`, `.fe`, `.s6`, `.s9`, `.s10`, `.s11`: all exit 0 |
| Baseline at `ecd254f` | scratch worktree with its own `npm ci` (no shared `node_modules`): `Tests 9 failed \| 4102 passed (4111)`, `Test Files 1 failed \| 158 passed (159)`. The 9 failures are all `recipes/test/s11-r16-runner.test.ts` and are environment-only (that file reads the worktree's checkout; it passes in the main tree). **4111 / 159 confirmed.** |
| Delta | +19 tests, +1 file: keeper +6, wiring +11 (new file), manifest +2. One test renamed in place, not removed (`manifest.test.ts` "the permissions are exactly today's …", its expectation re-pinned as 0.3 orders). 4111 + 19 = 4130 ✓ |

Size, measured (`git diff HEAD --numstat` + `wc -l`): code +157 (manifest 1, history 27, safety-call 39, keeper 72,
sw 18), tests +337 (manifest 26, keeper 113, wiring 198), docs +37 (spec 18, e2e plan 19). **494 new lines of code and
tests** against S3's ~400; under #271's 600 line, so no DONE-PARTIAL. The builder's numbers are exact.

## 3. Exit checks and verifier focus

- **D3.1** ✓ `manifest.test.ts` 6/6. `permissions` = S2b's list + `declarativeNetRequestWithHostAccess`, appended; no
  `declarativeNetRequest`/`…Feedback`; no `declarative_net_request` key; every other key equal to S2b's pin; dated
  header note citing 0.3 and #290.
- **D3.2** (at commit) The spec §10 note is one self-contained dated bullet in
  `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md`, touches no other file and names no code that a reader needs
  the code commit to understand; it can be committed first. It adds no method, code, event, field or message.
- **D3.3** ✓ `git diff ecd254f --stat -- daemon shared sdk mcp` → empty.
- **D3.4** ✓ the existing count tests pass unchanged; `METHOD_CLASSES` and `daemon/src/methods.ts` untouched.
- **D3.5** ✓ `git diff HEAD -- extension/src | grep '^+.*console\.'` → nothing; `extension/test/log-allowlist.ts`
  unchanged → log-scan **+0**; full suite (log-scan, log-sentinel) green.
- **No new top-level `await`**: `grep -nE '^(await|for await)' extension/src/sw.ts` → nothing; the start-up clear is
  `void dnrKeeper.ready;`.
- **Listener count**: `grep -c 'addListener('` = 19 at `ecd254f` and 19 now. The rebuild sits inside the existing
  `touchesSafety` block.
- **Existing tests unchanged**: the only `-` lines under `extension/test/` are the manifest re-pin and `setup()`'s
  signature in the keeper test (one optional argument added). `safety-gate.test.ts` (router scan), `sw-static.test.ts`,
  `log-allowlist.ts` untouched. `docs/e2e-test-plan.md` only gains rows; SAFE-5b and R14-5c expected text untouched.

### Fail-before proof (copied the three test files into the `ecd254f` worktree)

`Tests 17 failed | 28 passed (45)`. Failing: both re-pinned manifest tests, 10 of 11 wiring tests, 5 of 6 new keeper
tests. The three new tests that pass before are guards that cannot fail on the old code by nature: R1 (S2's code was
already right; the test was the gap #301 named), "a refused re-check installs nothing" (the old `CallSafety` ignores a
fourth argument) and "no `declarative_net_request` key".

### Mutants (new code copied into the worktree, one mutant at a time, restored between)

| Mutant | Red tests |
|---|---|
| `post()` releases without `finally` | 1 (the gate-throw test) |
| `effect()` never installs | 3 |
| `post()` reads `refusal()` before the release | 2 |
| `effect()` skips `mark()` | 1 |
| `holdsFor` true for an empty-list call | 1 |
| `call(…, only)` ignores `only` | 1 |
| `clear()` drops the orphan list again (pre-S3a) | **0 — survives** (N3) |

## 4. Attacks and findings

**(1) Every path releases; no covered call proceeds without its rules.** Holds by reading `router.ts` +
`safety-call.ts`: a receipt refusal never reaches `effect()` (nothing installed, nothing to release); a handler throw,
an `effect()` refusal (the install's own refusal included), a post-check refusal, a post-check throw and a disarm all go
through `post()`, whose `finally` awaits `release()`. `effect()` installs whenever the re-check passed (`view` is null
only on the read failure that already refused). `dnrScopeOf` and `requireTabId` agree: every tabId `targetTab`
accepts that `chrome.tabs.get` can resolve is a safe non-negative integer, so a covered call cannot run with an inert
handle. Install is enqueued behind `ready`, so the start-up clear precedes the first install.

- **M1 (MINOR) — a timed-out install's late rule can outlive its call indefinitely.**
  `extension/src/safety-dnr-keeper.ts:198` keeps a timed-out add's ids as orphans, but `releaseFor` (`:212`) sends an
  update only when the call itself holds ids, so the refused call's release does not retry them. If Chrome applies the
  add after the bound, the tab-scoped rule stays in force on that tab until the next non-empty install, rebuild or a
  disarm `sweep()` — possibly the worker's life. It only blocks hosts on the list, on that one tab, and needs a DNR call
  past 5 s, so it is fail-closed and rare; but it is the STOP rule's "a rule left installed after its call ended" in
  form. #301 (b) only says "kept for later removal". Suggested fix: in `releaseFor`, also send `removeRuleIds:
  orphans` when the call's ids are empty but orphans exist (the sweep's body), and test it with the existing hung-add
  fake.

**(2) Rebuild on any safety-key change.** Fail-closed: a non-list change rebuilds with the same list (identical rules
swapped atomically; no API call when nothing is live or the list is empty); an unreadable state refuses the live calls,
which the post-check would refuse anyway. Ordering is sound: the epoch bump happens when the read resolves, and a call
that installed first is then rebuilt from the fresh list.

- **M2 (MINOR) — a JavaScript-switch or Upload-folders edit can now refuse an unrelated navigation.**
  `extension/src/sw.ts:373` bumps the keeper's epoch on every safety-key change, so a `navigate`/`back`/`forward`
  whose `mark()` → gate read → `install` window (a few ms: one `storage.local.get` plus `tabs.get`) straddles such an
  edit is refused `DISARMED {scope:"all"}` `STATE_UNREADABLE_MESSAGE` — even with an empty list, where nothing would be
  installed. Before Step 11b that call answered normally; it is a different answer on a page with no redirect, in a race
  with a human's options edit. The same race already exists for list edits by S2's design (#292), where it is
  justified; here it buys nothing. Not a STOP in my reading (fail-closed, existing code and text, needs a human edit
  inside a few-ms window), but the session agent should rule on it rather than adopt it silently. Suggested fix (needs
  a lane grant): a `touchesBlockList(changes)` predicate in `safety-state.ts` beside `touchesSafety`, used for the
  rebuild only — or, within the lane, have the keeper skip the epoch bump when the rebuild's list has the same pattern
  set as the live calls' lists. The builder's proposed decision names this risk under "Residual risk"; its *Revisit if*
  ("Run 17 shows a false refusal") is not observable by any planned row.

**(3) The back/forward wait.** Bounded (10 s, `HISTORY_SETTLE_MS`), never an error (`settle.catch`), answer
unchanged `{ok: true}`; armed before `goBack`/`goForward`; `waitForLoad` resolves only on a `complete` event, so arming
on an already-complete tab does not resolve early. With an empty list `holdsRules()` is false: no `waitForLoad`, no
extra `tabs.get`, the call sequence identical to `ecd254f`'s. Unmeasured (as the builder says): whether `status` reads
`loading` right after `goBack` resolves — RD-BACK/RD-BACK-SAMEDOC measure it.

- **N1 (NIT)** `extension/src/handlers/history.ts:17` — when the tab is not `loading` after the call (same-document
  entry, no history), the `onUpdated` listener stays registered until its 10 s bound; a tab closed mid-wait also waits
  the full 10 s. Harmless; a cleanup handle on `waitForLoad` would end it.
- **N2 (NIT)** a client passing `timeoutMs` under 10 s on `back`/`forward` with a non-empty list could now see
  `TIMEOUT` on a slow load (daemon/SDK default 30 s, `daemon/src/route.ts:10`, `sdk/src/client.ts:47`). Run 17's
  RD-BACK records the reply time; worth one line in S5's docs.

**(4) The 5 s bound and orphans.** `bounded()` is correct: the loser's rejection is swallowed, the timer is cleared
when the call wins, a timeout counts as a rejection everywhere (install, release, rebuild, clear). A timed-out rebuild
orphans the new ids and keeps the old ones live, which is right whichever way Chrome resolves the atomic update. Orphan
counts are charged against the caps (conservative). See M1 for the release gap.

- **N3 (NIT, test gap)** the S3a change "`clear()` keeps the orphan list" (`safety-dnr-keeper.ts:246`) has no test: the
  mutant restoring `dropOrphans()` there survives all 39 keeper and wiring tests. The builder lists it as untested.

**(5) Lane.** `back`/`forward` are defined only in `extension/src/handlers/history.ts` (`grep -rn goBack extension/src`),
so #296/#301 (c) cannot be built elsewhere: a mechanical extension of the lane, recorded as a deviation by the builder.
`safety-dnr-keeper.ts` is outside S3's lane list but #301 grants S3a that edit. `navigate.ts`, `tabs.ts`, `safety.ts`,
`download.ts` untouched; `newTab` unchanged (#295); the download half inert (`only: "tab"`), matching the Stages note.
Nothing else left the lane.

**(6) Size.** 494 lines of code and tests (157 + 337), +37 docs. Over S3's ~400, under #271's 600.

- **N4 (NIT)** record the overrun in the as-built; two thirds of it is tests.

**(7) Logging.** No log call added anywhere in `extension/src`; no rule, filter, URL, `getSessionRules` result or
Chrome text reaches a log or the wire (the refusal is always `stateUnreadableRefusal()`; the wiring test asserts the
rejection text "bank" does not appear). The e2e rows read rules by count only.

Other checks: `sw.ts` reads `chrome.declarativeNetRequest` at call time inside `async` wrappers, so a missing API
rejects inside the keeper (fail closed); caps fall back to 0. The spec note matches the code, except that it says "a
list edit mid-call replaces them" where any safety edit does (M2).

## 5. Proposed decisions (the builder's, judged)

- *Rebuild on every safety-key change*: acceptable as fail-closed only with M2 ruled on; I would prefer the narrower
  trigger.
- *back/forward wait up to 10 s only while holding rules*: agree.
- *5 s bound; a clear keeps the orphan list*: agree, plus M1's release-side retry.

## 6. Housekeeping

My scratch worktree (`…/scratchpad/wt2`, own `npm ci`) was removed after its five workspace junctions were removed
with `cmd /c rmdir` (`dir /AL /S` then showed none); `git worktree list` shows only the main tree, and the main tree's
`node_modules/.bin` (42 entries) and `git status` are unchanged. A directory `…/scratchpad/wt` (dated 22:03, not
registered as a worktree, its own junctions pointing inside itself) existed before my run and is not mine: left
untouched. Nothing running; the extension was not reloaded and the daemon was not started.
