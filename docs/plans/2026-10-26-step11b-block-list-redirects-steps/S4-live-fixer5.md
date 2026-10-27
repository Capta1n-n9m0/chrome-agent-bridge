# S4-live fixer 5: a refused set-up back is recorded as NOT BUILT, and RD-FWD is then NOT MEASURED

Model / effort: Opus, medium. Offline only: no Chrome, extension or daemon was run, only `-Block plan`, and nothing
under `%TEMP%\bridge-e2e\s11b` was touched. This builds on fixers 4 and 4b, whose changes are uncommitted and all kept.

## 1. Verdict
DONE.

## 2. Outputs
- **`recipes/s11b-rules.ts`**
  - `histNotBuilt17(e, {kind, step, ctx, known})` decides which errors become NOT BUILT. It returns
    `HISTORY <kind> set-up NOT BUILT at=back <i> <CODE> "<msg>"|<message withheld len=n>` only when two things hold:
    the step is exactly `back <n>`, and the error is a BridgeError with a string code. In every other case it returns
    `undefined`, and the throw still STOPs.
  - The code and message text come from a new private `bridgeErrText17`. It is fix 4's filter (`isErrorCode`,
    `safeMessage17`, the sheet texts) moved out of `unexpectedStop17`, so both lines share one filter. The output of
    `unexpectedStop17` is unchanged; its 18 tests pass.
  - `histDiagRow17(plan, initial, rowUrl)` labels which entry the tab's row shows, and never prints a URL. The labels:
    - `0`, `1` or `2`: the index of the matching `plan.urls` entry.
    - `initial`: the newtab URL.
    - `hidden`: an empty URL.
    - `other`: anything else, including a missing row.
- **`recipes/s11b.ts`, `history()`**
  - Each set-up `tab.back()` is now wrapped. On a throw, a NOT BUILT result prints
    `HISTDIAG <kind> row=<label> navigations=<n> backs-done=<i>`, then the NOT BUILT line. It then clears `histStep`
    and calls `bump(3)`, so the exit is 3, never 0.
  - Anything else is rethrown, so claim, navigate and non-BridgeError throws, and a fixer 4b poll timeout, STOP as
    before.
  - The `initial` URL is `http://127.0.0.1:8081/e2e-playground.html?s11b=<tab key>`. That is what `New-R17Tab` opens
    for `hf`, whose tag equals its key.
- **`recipes/s11b-r17.ps1`**
  - `$Persist` gains `R17FwdNotBuilt`.
  - The `history` block sets `$global:R17FwdNotBuilt = (<fwd build exit> -eq 3); Save-S16`, so a later successful build
    clears it.
  - `$Blocks['rd-fwd']` starts with this guard:
    `if ($global:R17FwdNotBuilt) { Say9 'ROW RD-FWD NOT MEASURED: its history set-up was not built (see HISTORY fwd set-up NOT BUILT)'; $global:S16NM++; return }`.
    The guard comes before `Invoke-R17History`, so no bridge call is made.
  - The back build's call is unchanged. `Invoke-R17Node` already counts exit 3 as `S16NM++` and returns it, and that is
    still how a back-build exit 3 is handled.
  - The file is ASCII only.
- **`recipes/test/s11b-hist-notbuilt.test.ts`** is new, with 6 tests, and is registered in `recipes/tsconfig.s11b.json`.
  - The classification tests check two things: BridgeErrors at `back 1` and `back 2` give the exact line, with a
    message containing a URL withheld; and `connect`, `claim`, `navigate 3`, `back`, `back 1x`, no step, a plain
    `Error` and a non-Error all give undefined.
  - The `histDiagRow17` tests cover all the labels.
  - Static pins cover `$Persist`, the history block, the rd-fwd guard and its order before the call, the ASCII-only
    check, and the HISTDIAG → NOT BUILT → `bump(3)` → `return` order in `history()`.
- **Red on HEAD:**
  - I ran `git archive HEAD recipes extension/src shared` into a scratchpad folder outside the repo (no junctions),
    added the new test and a scratch vitest config with aliases, and ran it. All 6 of 6 failed: TypeError (not a
    function) ×3, AssertionError ×3.
  - With the three changed files copied in, 6 of 6 passed.
  - The scratch folder was then deleted. The main tree was never swapped, stashed or reset.
- **Size:** tracked files +47/−9, plus the 62-line test, about 110 lines in all.

## 3. Exit checks
- `npm test`: Tests 4534 passed (4534), Test Files 183 passed (183). It was 4528/182; the change adds 6 tests and 1 file.
- All seven `recipes/tsconfig*.json` exit 0, and `npm run typecheck` exits 0.
- `powershell -File recipes/s11b-r17.ps1 -Block plan` exits 0.
- `git status --short` shows only lane files, plus the ledger change and the untracked runner and record files,
  which I did not make.

## 4. Deviations
- **One extra label.** If `c.tabs()` itself throws while the diagnostics are being read, the row label is `unread`, so
  a failed read is not reported as `other`.
- **Python edits.** The `s11b-r17.ps1` replacements and the first draft of the `s11b-rules.ts` insertion were applied
  with a small Python exact-match replace script, with each match checked to be unique. The final rules code was
  written with Edit.
- **A NOT BUILT fwd set-up is counted as NOT MEASURED twice.** It counts once at the `history` block, through
  `Invoke-R17Node`'s generic exit 3, and once at RD-FWD, as the brief asks. I kept `Invoke-R17Node` unchanged.

## 5. Proposed decisions
None.

## 6. Findings
- The cause of `chrome.tabs.goBack` refusing the first back is still unexplained. The next attempt's `HISTDIAG` line
  will show whether, when back 1 is refused, the tab's row is on the flip entry (`row=2`), on its own newtab page
  (`row=initial`, meaning the navigates did not add history entries), or hidden.

## 7. Handoff
- A `-Block teardown` is still needed before the next liveA, as before.
- Nothing is committed. The files to commit are fixer 4's and 4b's files, plus `recipes/s11b-r17.ps1`,
  `recipes/test/s11b-hist-notbuilt.test.ts` and this report. `recipes/s11b.ts`, `recipes/s11b-rules.ts` and
  `recipes/tsconfig.s11b.json` were changed again.
