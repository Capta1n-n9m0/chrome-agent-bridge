# S7-sheet verifier 2 report: re-check of F1–F10 after fix round 1 (§4.25)

Claude Opus 5.5, medium effort. 2026-10-27. Read and run only. I edited nothing except this file and made no commit.
Scope: findings F1–F10 of `S7-sheet-verifier.md` against `docs/e2e-test-plan.md` §4.25 (lines 1677–1716,
uncommitted), and the lines the fix touched. Read: the phase doc § S7, Exit checks D7.1–D7.7, STOP rules (#311
paragraph); §4.24 RD-0, R17-UP-L1, RD-BACK-EMPTY, RD-RESTORE; `S6.md` "For S7-sheet"; `extension/src/handlers/tabs.ts`
(now and at `db3f82e^`), `newtab-open.ts`, `safety-call.ts`, `safety.ts`, `safety-match.ts`, `errors.ts`,
`handlers/navigate.ts`, `daemon/src/intercept.ts`; `recipes/s11b.ts`, `s11b-rules.ts`, `s9.ts`, `s9-rules.ts`.
The fixer's report was treated as claims to audit.

## 1. Verdict

**PASS-with-notes.** F1–F10 are resolved. The fix introduced one MINOR (V2-1, in F4's row) and three NITs.
No CRITICAL or MAJOR. Exit checks hold.

## 2. Commands and outputs

- `git diff --stat`: `docs/e2e-test-plan.md | 40 ++++++++++++++++++++++++++++++++++++++++` (1 file, 40
  insertions). `git diff docs/e2e-test-plan.md | grep -c '^-[^-]'` → `0`. One hunk `@@ -1674,6 +1674,46 @@`; §4.25
  is lines 1677–1716 and `## 5. Results template` is line 1717. §4.24 and Run 17's §5 record are untouched.
- `node scripts/doc-check.mjs --files docs/e2e-test-plan.md`: `tools: 24 · router methods: 27 · codes: 27`,
  `Checked 1 living docs (0 closed phase docs skipped for paths and status).`, exit 0.
- `git show db3f82e^:extension/src/handlers/tabs.ts`: pre-S6 `newTab` is `chrome.tabs.create({ url, active })`
  (line 83). Now (`tabs.ts:89-97`): when `call.holdRulesFor` exists (a `CallSafety` class method, so always under
  `GatedRouter`) and `opensBehindRules(url)` (any URL but `about:blank`), `tabs.create({url: BLANK_URL})`, hold
  rules, then `tabs.update(id, {url})`; a failed update removes the tab (`newtab-open.ts:96-101`) and rethrows.
- `daemon/src/intercept.ts:433-436` `clientGone`: a client's disconnect releases all its leases.

## 3. Per finding

| # | Was | Now |
|---|---|---|
| F1 | MAJOR | **Resolved** |
| F2 | MAJOR | **Resolved** |
| F3 | MINOR | **Resolved** (one NIT left, V2-3) |
| F4 | MINOR | **Resolved as to the target**; the new expected text is wrong (V2-1, MINOR) |
| F5 | MINOR | **Resolved** |
| F6 | MINOR | **Resolved** |
| F7 | MINOR | **Resolved** |
| F8 | NIT | **Resolved** |
| F9 | NIT | **Resolved** (the touched line carries a stale reference, V2-2) |
| F10 | NIT | **Resolved** |

**F1.** Line 1696, step (e) now says it reads the disk ("this reads the disk, not the loaded worker"), and the
first verifier's fetch claim is gone. Step (f) is behavioural. Checked against the code:
- **Discriminating.** The pre-S6 build runs `tabs.create({url})`, so `tabs.onCreated` carries the fixture URL as
  `pendingUrl` (`tab-events.ts:140` reads the same field). The S6 build creates `about:blank` first. The label is
  `about:blank|other`, so an empty or missing field reads `other` and STOPs: a pre-S6 worker cannot pass (fails
  closed). The only unmeasured side is a false STOP if Chrome's `onCreated` for a blank create carries neither field
  as `about:blank`; that direction is safe.
- **Before any state change.** (f) runs after (a)–(d), which are read-only, and before R17B-UP-L1 and every row that
  changes the safety state. (d) `FOUNDLIST blocks-fixtures=no` has already shown that 8081 is not blocked. Opening a
  tab changes no safety state, and the row says so.
- **Fixture page.** `http://localhost:8081/e2e-playground.html?s11b=b0`. The tag `b0` is used nowhere else in §4.25,
  and the 8081 server is started in the prologue.
- **Orphan tab and lease.** No lease is orphaned: the helper's client disconnect drops its leases
  (`intercept.ts:433-436`). The tab is not closed in the steps. The row notes the handle "for the runner's close at
  the end", which is R17B-RD-2's existing practice ("the wave's windows are closed by the runner at the end"). It
  affects no later judgment: tab counts are taken before and after within one row, and R17B-RESTORE compares safety
  state only. Recorded as NIT V2-4.
- **D7.2.** The first line `MANIFEST … BUILD disk-s6-names=2/2 created-url=about:blank` carries the permission proof
  and the behavioural S6 proof, so D7.2 is met.

**F2.** The STOP sentence (line 1686) now names R17B-ACT-CTL, any set-up `back` of R17B-FWD, R17B-FWD's first
`forward` P0 → P1, R17B-BACK-SAMEDOC's `back` and R17B-BACK-EMPTY (its `back` and `forward`). R17B-BACK and FWD's
second `forward` keep FAIL-and-continue because the flip URL answers 302 in G1. Rows 1706 and 1707 each say an
answer other than `ok` is a STOP. I listed every activated back or forward in the sheet:
- ACT-CTL ×4: listed.
- BACK-NOACT: no activation, RECORD.
- BACK: the flip page redirects.
- FWD: the set-up backs and the first forward are listed; the second forward lands on the flip page.
- SAMEDOC: listed.
- BACK-EMPTY ×2: listed.

Nothing is missing. This matches the phase doc's #311 paragraph (lines 472–474).

**F3.** Line 1713 now names each op the sheet's rows use. Checked against the code:
- **Already exists:** `manifest`, `rules` (with `--sample`), `hits`, `ctl`, `back`, `forward` and `history` in
  `s11b.ts:1020-1050`, and `wait-safety`, `redirect-probe` and `call … newtab` in `s9.ts`.
- **Named as new:**
  - `build-proof`, `tabwatch` and `newtab-timed`.
  - The three-page history kind (`HistoryKind` and `historyPlan`, `s11b-rules.ts:710-712`).
  - `--activate`, with the `histNotBuilt17`/`bump(3)` path (`s11b.ts:715-728`) disabled under it.
  - The R17B ids in `HISTORY_ROWS` (`s11b.ts:676`), so `ROW R17B-…` lines are printed.
  - The 8087 timed GET.
  - `Invoke-S11bPressAfterReply`.
  - The console op `tabwatch`.
- **First line:** the `.ps1` block prints it.

The "new ops only" contradiction is gone. One gap is left (V2-3).

**F4.** The target is now reached. `new URL("javascript:void 0")` parses, so `resolveOpenUrl` returns the string
unchanged (`safety-call.ts:178-182`). The gate passes it:
- JavaScript is on, so the `SCRIPT_SCHEMES` refusal does not apply (`safety.ts:318-323`).
- It is not an own page.
- `isUrlBlocked` is false because `urlHost` gives no host (`safety-match.ts:208-212`).
- It is not `file:`.

The daemon, SDK and shared code have no `javascript:` check of their own (grep: none outside a comment in
`shared/src/codes.ts`). The S6 path then runs: blank tab, `holdRulesFor`, `tabs.update` rejected by Chrome, the tab
removed, rethrown. So V5 (#314) is measured. The RECORD framing is honest as far as the judged clause goes, but the
pre-written code is wrong (V2-1).

**F5.** Line 1703: `completes` is now the `complete` events before the first `loading` after the navigation
(expected 1; a higher count is N1's doubled blank complete). `first-complete-ms` above 2 000 ms is the
"blank silent over 2 s" case. The `tabs.get` case is NOT MEASURED. All three N1 cases from #313 are accounted for.

**F6.** Line 1697: "if R17B-LOGS does not run or reads NOT MEASURED, R17B-UP-L1 is FAIL".

**F7.** Line 1696: `S6 commit=ancestor` is judged in (e) (else STOP). The pass rule is "RD-0's pass rule for
(a)–(d), without its console-fallback clause".

**F8.** Line 1700: "(Chrome's text, not a K17 constant)".

**F9.** Line 1711: R17B-CTL is called a narrowed RD-CTL (8083, 8086, 8091, the 8085 counter, 8087; 8088 and 8089 not
started).

**F10.** Line 1684: the allow-list is 8081 or 8091 plus the handle's presence in `opened`. Tests (4) say "8081 and
8091 only".

## 4. New findings (in lines the fix touched)

### V2-1 — MINOR — `docs/e2e-test-plan.md:1704` (R17B-NEWTAB-REFUSED): the expected `NAV_FAILED` is wrong, and the gate-refused branch reads a listener the steps do not start
**Evidence.**
- (a) The `NAV_FAILED` in `extension/CLAUDE.md:226` and Run 13 SAFE-6c comes from the **`navigate` handler**, which
  wraps Chrome's rejection: `handlers/navigate.ts:15-18`,
  `throw new BridgeError(ErrorCodes.NAV_FAILED, message, { error: message })`. The `newTab` path does not wrap it.
  Its navigate step is `navigate: async (tabId) => void (await chrome.tabs.update(tabId, { url }))`
  (`handlers/tabs.ts:95`), and `openBehindRules` rethrows the error unchanged (`newtab-open.ts:96-101`).
  `toWireError` turns a plain `Error` into `INTERNAL` with its message (`errors.ts:31`). The answer that can be
  derived from the code is therefore `INTERNAL` with Chrome's text ("JavaScript URLs are not allowed in API based
  extension navigations. …"), not `NAV_FAILED`. The row is RECORD, so nothing is judged on the code and no pass rule
  is weakened. But the pre-written expectation will read as a mismatch, and a forbidden-fix reader could take it as a
  reason to change a code ("a new error code or a changed message to make a row pass").
- (b) The branch "a `BAD_PARAMS` or a `DOMAIN_BLOCKED` with no `TABWATCH` created event" reads `TABWATCH`, but the
  row's steps never start the listener. Also, when the gate does refuse, the judged clause "count after = count
  before" holds trivially, yet the row only says "recorded, no proposal". It should not count as a pass of V5.

**Fix.**
- Pre-write the RECORD expectation as `INTERNAL` with Chrome's `javascript:` refusal text (derived from
  `handlers/tabs.ts:95`, `errors.ts:31`; the `NAV_FAILED` wrapping is the `navigate` handler's).
- Add "the console listener started (`TABWATCH`)" to the steps, and RECORD `created-url` (expected `about:blank`,
  the path reached).
- In the gate-refused branch, write the judged clause as NOT MEASURED (path not reached).

### V2-2 — NIT — `docs/e2e-test-plan.md:1711` (R17B-LOGS): stale reference to "R17B-0 (e)"
**Evidence.** The sentence "it scans the console input of R17B-0 (e) too, which holds no pattern" dates from when (e)
fetched in the console. After F1's fix, (e) reads the disk. The console input is (f)'s `onCreated` listener and the
`TABWATCH` listeners of R17B-RD-2, NEWTAB-PLAIN and NEWTAB-LOAD.
**Fix.** "(f) and the `TABWATCH` listeners".

### V2-3 — NIT — `docs/e2e-test-plan.md:1713` (Helpers needed): the STOP judges of the target calls are not named
**Evidence.** Item (2) names the `--activate` STOP for **set-up** backs, but not the STOP the sheet puts on the
**target** calls made through `B17 back`/`B17 forward`: R17B-ACT-CTL's four calls, R17B-FWD's first `forward`,
R17B-BACK-SAMEDOC and R17B-BACK-EMPTY. The existing `historyCall` turns a refused first call of two into a plain row
FAIL (`s11b.ts:690`: `return judged(row, j17(false, …))`, no `stop`). The RD-BACK-EMPTY judge returns FAIL on a
non-`ok` answer (`s11b.ts:701`). "With their judges" leaves this open. The runner is still bound by the sheet's STOP
lines (D7.7), so this is a helper-spec gap, not a rule gap. The "no `about:blank` row is left" clause (line 1704) has
no printing op either: `tabsLine` (`s9-rules.ts:262`) counts totals only. The total-count equality covers it.
**Fix.** Add to item (2): "the R17B judges print a STOP line for a non-`ok` answer of ACT-CTL, FWD's first forward,
SAMEDOC and BACK-EMPTY, including the first of a `--times 2` pair". Add the matching test to item (4).

### V2-4 — NIT — `docs/e2e-test-plan.md:1696` (R17B-0 (f)): the `b0` tab stays open until the end of the wave
**Evidence.** As in §3 F1: no lease is orphaned (`intercept.ts:433-436`), and no later judgment is affected. The tab is
closed by the runner at the end, as with R17B-RD-2.
**Fix (optional).** `closeTab` the `b0` handle at the end of R17B-0, recorded and not judged.

## 5. Exit criteria

- F1–F10 resolved: yes.
- §4.24 and Run 17's §5 untouched (insertions only, inside §4.25): yes (0 deletions; one hunk ending before line 1717).
- doc-check exits 0: yes.

## 6. Handoff

No process started; nothing to kill. V2-1 is MINOR, so the verdict is PASS-with-notes. The step agent may fold V2-1
to V2-4 into the sheet before its commit, which needs no new verifier round under §6 because MINOR and NIT findings
do not fail a stage. If it does fold them, the V2-1 change is the one to check by reading `handlers/tabs.ts:95` and
`errors.ts:31`.
