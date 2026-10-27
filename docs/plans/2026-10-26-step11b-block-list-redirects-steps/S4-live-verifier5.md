# S4-live verifier 5: fix 5 (a refused set-up back is NOT BUILT, then RD-FWD is NOT MEASURED)

Model / effort: Opus, medium. I only read and ran things, and edited no repo file. I worked offline: no Chrome, extension
or daemon, and only `-Block plan`. I did not touch `%TEMP%\bridge-e2e\s11b`. Scratch work went in
`<scratchpad>\red5`, outside the repo, with no junctions. I never stashed, checked out or reset.

## 1. Verdict
**PASS-with-notes** (2 MINOR, 3 NIT; no CRITICAL or MAJOR; every exit check passed).

## 2. Exit checks (re-run by me on the working tree)
| Check | Result |
|---|---|
| `npm test` | `Test Files 183 passed (183)`, `Tests 4534 passed (4534)`. The claim was 4534/183, and it holds. |
| `npx tsc --noEmit -p` on all seven `recipes/tsconfig*.json` (fe, base, s6, s9, s10, s11, s11b) | Each exits 0. |
| `npm run typecheck` | Exits 0. |
| `powershell -File recipes/s11b-r17.ps1 -Block plan` | Exits 0. liveA order: `… rd-regex history g1-open … rd-back rd-fwd rd-back-samedoc …`. `PLAN not built:` is empty. |
| `.ps1` is ASCII only | A Node byte scan found 0 bytes above 127. |
| `git diff HEAD --stat` | The changes are in `recipes/s11b-r17.ps1`, `recipes/s11b-rules.ts`, `recipes/s11b.ts`, `recipes/tsconfig.s11b.json` and the ledger, plus the new untracked test. Nothing changed under shared/daemon/sdk/mcp/extension, `docs/e2e-test-plan.md`, `recipes/s9*`, `recipes/s11.ts`, `recipes/s11-*`, `recipes/s11b-win*` or `recipes/s11b-r17-plan.ts`. |

## 3. Item by item

### (1) Narrowness
- **`histNotBuilt17`** (`recipes/s11b-rules.ts:685-690`) returns a line only when two things hold: the step matches
  `^back \d+$`, and `e` is an `Error` named `BridgeError` with a string `code`. Every other case returns `undefined`.
- **The `try` covers only `await tab.back()`** (`recipes/s11b.ts:722-735`). Other failures are outside it and STOP as
  before:
  - claim and navigate;
  - fixer 4b's poll timeout, a `Stop` thrown after the `try`;
  - a throw from `c.tabs()` inside the poll.

  Anything `histNotBuilt17` refuses is rethrown (`if (!nb) throw e;`) and reaches `main`'s catch, which prints the
  STOP and exits 2.
- **Only the fwd build is affected.** `historyPlan` gives `backs: 0` for `back`, `samedoc` and `empty`, and
  `backs: 2` only for `fwd` (`s11b-rules.ts:714-717`). The RD-BACK, RD-BACK-SAMEDOC and RD-BACK-EMPTY set-ups never
  reach the new path.
- **Exit code.** `bump(3)` gives `code = max(code, 3)` (`s11b.ts:78-80`). Nothing earlier in `history()` bumps, so
  `main` returns 3. A NOT BUILT build never exits 0.
- **PowerShell 5.1 semantics:**
  - **One value on the pipeline.** `Invoke-R17Node` puts only `$n` there. `Show-S16` and `Say9` use `Write-Host`,
    `Export-Clixml` is piped and emits nothing, `$null = $p.Handle`, `Hashtable.Remove` is void, and
    `Sync-R17State` runs only for `s11`. So `[int](...) -eq 3` sees one int. The same pattern already runs at
    `s11b-r17.ps1:251`.
  - **On a throw.** If `Invoke-R17Node` throws (a STOP), the assignment never happens and the block STOPs.
  - **Saving.** `$false` is saved too: `Save-S16` skips only `$null`. A bool survives the Clixml round trip.
- **Across attempts:**
  - The preflight refuses to start when a previous wave's globals file exists (`s11b-r17.ps1:386`), and teardown
    deletes the file (`S16Gone`). So every liveA starts with `R17FwdNotBuilt` unset (falsy).
  - A successful fwd build in a later attempt writes `$false`.
  - A single-block run, `-Block rd-fwd`, loads the persisted value through `Load-S16`.
- **The rd-fwd guard** (`s11b-r17.ps1:632`) is the first statement of the block. It comes before
  `Invoke-R17History`, so no node process and no bridge call run. It does `S16NM++` exactly once.
  - The fwd build's own exit 3 is also counted once, by `Invoke-R17Node:141`. That is two counts for one cause; the
    fixer disclosed it (NIT-1).

### (2) Conflict with the sheet or a pre-registered rule
None found.
- **The STOP rule does not apply.** The history block runs before G1's first state change. `liveA` runs
  `history` and then `g1-open`, and `g1-open` (`s11b-r17.ps1:516`) is the first site that sets `S16Changed = $true`.
  The sheet's "Slices and order" puts the history build "with the list as found" before group G1. Run 6 confirms it:
  no state change was saved before the STOP.
- **The other STOP clauses do not cover it.** The sheet's STOP list (§4.24) has no clause for "a set-up of a
  non-★ row could not be built". The old STOP came from `main`'s generic catch, not from a sheet guard.
- **NOT MEASURED is the right verdict.** RD-FWD's set-up ("built and moved back twice (to P0) with the list found")
  did not exist, so RD-FWD's pass rule cannot be applied. The pass-rules paragraph says that "`NOT MEASURED` never
  counts as a pass".
- **No re-run or re-tune.** RD-FWD has never been observed, so this does not re-run or re-tune an observed row. The
  helper was changed between attempts, at a returned STOP, as in fixes 1-4.
- **No ★ row can pass because of this.**
  - RD-FWD has no ★.
  - No judge, pass rule, expected text or K17 entry changed (§2, and `git diff` of `s11b-rules.ts` touches only
    `unexpectedStop17`'s body and adds three functions).
  - RD-BACK ★ uses its own tab `hb` and its own tag `bk`. Its hits are counted per tag (`Get-R17Hits $Tag`,
    `s11b-r17.ps1:257`). The `hf` tab left on its flip entry can only add hits under tag `fw`.
  - The only effect on ★ rows is that they now get measured instead of being cut off by the STOP. They pass or fail
    on their own evidence.
- **Expect RD-BACK ★ may FAIL** (my reading, unmeasured). If the cause of the refusal is general (H1 in §5), RD-BACK's
  `back` in G1 may answer the same INTERNAL refusal. The sheet calls any answer other than `ok` or K-tab a recorded
  FAIL. That is an honest result, not a STOP.

### (3) What gets printed
- **The HISTDIAG line** prints `kind` (validated to four literals), a label from `histDiagRow17`, and two integers.
  The labels are `0` / `1` / `2` / `initial` / `hidden` / `other`, or `unread` when `c.tabs()` rejects. No URL is
  printed. The URL comparison uses `sameUrl17` and is never printed.
- **The NOT BUILT line** builds its code and message with `bridgeErrText17`. This is the same function that
  `unexpectedStop17` now uses, which is fix 4's filter:
  - a code outside the enum is printed by length;
  - a message that is not a sheet text and does not pass `safeMessage17` is printed `<message withheld len=n>`.

  The test proves a message containing a URL is withheld.
- **The `initial` URL** is `http://127.0.0.1:8081/e2e-playground.html?s11b=<tabKey>`. This matches `New-R17Tab`
  (`"$Fix81?s11b=$Tag"`, and for `hf` the tag equals the key).

### (4) `unexpectedStop17` is unchanged
- I compared HEAD's function with the current one in a scratch test. I saved HEAD's `s11b-rules.ts` as
  `s11b-rules-head.ts` and called both functions on 1240 inputs:
  - `e` values: non-Error values, `Error`, `TypeError`, an Error with a numeric code, and real and fake BridgeErrors;
  - codes: INTERNAL, TIMEOUT, TAB_HELD, a non-enum code, and an empty code;
  - messages: a URL, the token, the sentinel, the profile, the alias, an empty message, plain words, and every K17
    message;
  - steps: five values, including undefined.

  Result: `compared 1240`, `1 passed`. All outputs were identical.
- `s11b-stop-cause.test.ts` passes in the full run.

### (5) Red on HEAD, green now
- **Red.** `git archive HEAD recipes extension/src tsconfig.base.json` went into the scratch folder, with the new test
  copied in. A vitest config there aliased `@bridge/shared*` and `vitest` to the main tree; `shared/` is unchanged.
  Result: **6 failed (6)**: `TypeError: histNotBuilt17 is not a function` ×2, `histDiagRow17 is not a function` ×1, and
  `AssertionError` ×3 on the static pins. The pins read the scratch copy's HEAD `.ps1` and `.ts`.
- **Green.** With the three current files copied in: **6 passed (6)**.

### (6) Nothing out of lane
See §2. The diff of `s11b-rules.ts` adds `bridgeErrText17`, `histNotBuilt17` and `histDiagRow17`, and replaces the two
inline lines of `unexpectedStop17` with a call to the shared helper. It changes no judge, `verdict17`, `K17` or
`REGEX_*` code.

## 4. Findings

**MINOR-1. Any BridgeError code becomes NOT BUILT, not only the measured refusal.** `recipes/s11b-rules.ts:687`
- **What happens.** `histNotBuilt17` accepts every code: TIMEOUT, DISARMED, STATE_UNREADABLE, TAB_HELD, VERSION, and
  the SDK's own transport errors. The test confirms it: `nb(new BridgeError("INTERNAL", …))` passes, and nothing pins
  a code.
- **Why it matters.** Suppose the human disarms, or the extension socket drops, between RD-0 and the history block.
  Until now, the STOP ended the wave before any state change. Now the wave goes on to `g1-open`, which saves the list,
  the wave's first state change. A STOP comes only later, at RD-1 (`-StopOnFail`), and the restore then runs.
- **Severity.** This is not a ★ verdict risk, and later guards still STOP. But it widens the window in which the
  wave changes state on top of a state change it did not make.
- **Suggested fix.** Before the next attempt, narrow it to `c === "INTERNAL"`, the code Chrome's refusal was measured
  with. Every other code stays a STOP. Add one test that a `DISARMED` at `back 1` gives `undefined`.

**MINOR-2. The fixer's report misstates what is committed.** `S4-live-fixer5.md` intro and §7
- **What the report says.** It says it "builds on fixers 4 and 4b, whose changes are uncommitted". Its commit list
  begins "fixer 4's and 4b's files".
- **What is true.** Both are in HEAD `9e3fbe4`:
  - `git log -1 --stat` lists `S4-live-fixer4.md`, `S4-live-fixer4b.md`, `s11b-hist-wait.test.ts` and
    `s11b-stop-cause.test.ts`;
  - `unexpectedStop17` and `pollUntil17` exist on HEAD.
- **Suggested fix.** The committer's file list is fix 5's files only: `recipes/s11b-r17.ps1`, `recipes/s11b-rules.ts`,
  `recipes/s11b.ts`, `recipes/tsconfig.s11b.json`, `recipes/test/s11b-hist-notbuilt.test.ts`, `S4-live-fixer5.md`,
  this report and the ledger. The runner-6 and record files are added as the step agent decides.

**NIT-1. One cause is counted twice.** A NOT BUILT fwd set-up adds 2 to the slice's "not measured" count: once by the
build's exit 3 (`s11b-r17.ps1:141`) and once by RD-FWD's guard (`:632`). The fixer disclosed this; it is harmless
because the record names both lines.

**NIT-2. "NOT BUILT" means two things.** This line uses the words "NOT BUILT", but it does not bump `R17NB`, the plan's
"not built" counter that makes a slice exit 3 (`s11b-r17.ps1:879, 898`). With only this, liveA ends `exit 0`, with it
counted under "not measured". That is correct, but a reader of the SLICE line may expect "not built 1". Worth one
sentence in the runner's report.

**NIT-3. HISTDIAG makes a bridge call the sheet does not name.** It is one read-only `c.tabs()` before the first state
change, printing labels only. Record it as a ledger fact, not a row.

## 5. Why `chrome.tabs.goBack` could refuse after three `chrome.tabs.update` navigations: hypotheses, UNMEASURED

Read from code (`extension/src/handlers/history.ts`, `navigate.ts`, `handlers/tabs.ts` `newTab`, `tabs.ts`
`waitForLoad`, `sdk/src/tab.ts`, `extension/src/safety-dnr-keeper.ts`). Where noted, it also rests on my memory of
Chromium, which nothing here measured.

- **What the code rules out:**
  - **Not a wiring slip.** `Tab.back()` sends `back` (`sdk/src/tab.ts:206-207`). The service worker routes `back` to
    `go(…, "back")`, which calls `chrome.tabs.goBack(id)` (`sw.ts:85`, `history.ts:47`).
  - **Not Step 11b's rules.** The found list was empty (`blocklist lines=0` in Run 6's STATE line), so `holdsRules()`
    is false and no settle or DNR rule is involved. The refusal is Chrome's own rejection of `goBack`, turned into
    INTERNAL with Chrome's text (`errors.ts:31`).
  - **The wording proves nothing about direction.** "Cannot find a *next* page" is, from my memory of Chromium's
    `tabs_api.cc`, the one constant both `TabsGoBackFunction` and `TabsGoForwardFunction` return when the controller
    cannot move. The word "next" is not evidence that `forward` was called. (Memory, unmeasured.)
- **H1 (most likely).** Chrome's history-manipulation intervention marks the entries as skippable.
  - From memory: Chrome may treat `chrome.tabs.update({url})` as renderer-initiated, with the extension as initiator
    and no user activation on the page. A background tab never gets user activation.
  - Chrome then marks each previous entry "skippable on back/forward". `CanGoBack()` counts only entries that are not
    skippable, so every entry before the last is invisible and `goBack` refuses.
  - What this predicts:
    - HISTDIAG `row=2`: the tab sits on the flip entry, and the navigations did commit.
    - The same refusal for RD-BACK (`hb`, two `tabs.update` navigations), and likely for RD-BACK-SAMEDOC and
      RD-BACK-EMPTY.
    - CDP `Page.getNavigationHistory` would still list all entries.
- **H2. The navigations replaced the entry instead of adding one.**
  - Chrome replaces the current entry when the tab is still on its initial entry, or when the new URL equals the
    current one. Neither should hold here, since `newTab` waits for the first load (`handlers/tabs.ts:84`) and the
    URLs differ.
  - What this predicts: `row=2`, with a history of length 1 or 2.
- **H3. `navigate` answers early, so a later update supersedes a pending navigation.**
  - `waitForLoad` resolves on the first `status: "complete"` for the tab after it is armed (`tabs.ts:305-306`). It
    does not check that the event belongs to the new navigation. A late `complete` from the previous document could
    end the wait before the new navigation commits. The next `tabs.update` then cancels it, and fewer entries commit.
  - On its own this still leaves the initial entry plus the last one, so back 1 should work. It explains a refusal
    only together with H1 or H2.
- **H4. The tab was replaced or discarded.** A replacement WebContents normally keeps its history, so this is weak.
  The daemon follows `tabReplaced` (`daemon/src/handles.ts:137`).
- **H5. The tab key named a different tab.** `handleOf('hf')` reads state.json. Run 6's set-up rows say `hf` was
  opened just before, so this is weak. The navigations would add entries to any tab anyway.

**A measurement that would separate these** (a proposal, not my call): in the #294 scratch Chrome, build the same
three-update history on a background tab, then read CDP `Page.getNavigationHistory` and each entry's index. Compare
`chrome.tabs.goBack` with a user-activated control, for example one omnibox navigation. The next attempt's HISTDIAG
`row=` label already separates H1/H2 (`2`) from the navigations never committing (`initial`).
