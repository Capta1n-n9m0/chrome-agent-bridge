# S4-live fixer 4b: the history set-up waits for each back before the next one

Model / effort: Opus, medium. Offline only (`-Block plan` only; nothing under `%TEMP%\bridge-e2e\s11b` touched).
Built on fixer 4's uncommitted change, all of which is kept.

## 1. Verdict
DONE.

## 2. Outputs
- **Navigate needs no added wait.** `extension/src/handlers/navigate.ts` arms `waitForLoad` before `chrome.tabs.update`
  and answers only after the load, and `Tab.navigate` (`sdk/src/tab.ts:202`) awaits that answer.
- **Back does need one.** `handlers/history.ts` waits for the load only when the call holds block-list rules. The set-up
  runs with an empty list, so `goBack` answers before its load.
- **No load-state field can be reached.** The `listTabs` rows (`handlers/tabs.ts` `ListedTab`) and the SDK's `TabInfo`
  (`sdk/src/client.ts`) carry no `status`. The wait therefore uses a field plus a fixed settle:
  - After each set-up `tab.back()` in `history()` (`recipes/s11b.ts`), the script polls `c.tabs()` every 100 ms, for at
    most 10 s, until the tab's own row shows the URL of the entry that back lands on.
  - That target comes from `historyBackTarget(plan, n)`: back 1 lands on P1 and back 2 on P0.
  - The URL is compared in memory and never printed. An empty (hidden) row never matches.
  - After the match there is a fixed 500 ms settle (`HIST_SETTLE_MS`) to cover the time between the commit and
    `complete`. A comment in the code gives the reason.
  - On timeout the script throws `Stop("history set-up at=back <n>: the tab did not reach its history entry within
    10000 ms")`, which prints as a `STOP:` line with no URL. If `c.tabs()` itself throws, the error goes out through
    fixer 4's `at=back n` path.
- **New pure helpers in `recipes/s11b-rules.ts`:** `historyBackTarget`, `sameUrl17`, `pollUntil17` (an injected reader,
  clock and sleep), and `HIST_WAIT_MS`, `HIST_POLL_MS`, `HIST_SETTLE_MS`.
- **Unchanged:**
  - The measured `historyCall` ops (`B17 back` / `B17 forward`).
  - Every pass rule, judge, expected text and K17 entry, the sheet, `s9.ts` and `s11.ts`.
  - The end state of the set-up, which still matches the RD-FWD row: [P0][P1][flip /h/fwd?s11b=fw] moved back twice to
    P0.
- **New test file `recipes/test/s11b-hist-wait.test.ts`** (5 tests), registered in `recipes/tsconfig.s11b.json`.
  - It covers: the poll stopping when the reader turns true, the poll stopping at the bound (10 000 ms, 101 reads), a
    reader's throw passing through, the fwd targets, and `sameUrl17`.
  - Red before the fix: with the new helpers cut out of the current `s11b-rules.ts`, 5 of 5 failed.
  - Green after: with the file restored, 5 of 5 passed.
- Size: about 75 lines (rules +21, `s11b.ts` +9, test 45).

## 3. Exit checks
- `npm test`: Tests 4528 passed (4528), Test Files 182 passed (182). With fix 4 alone it was 4523/181.
- All seven `recipes/tsconfig*.json` exit 0, and `npm run typecheck` exits 0.
- `recipes/s11b-r17.ps1 -Block plan` exits 0.
- `git status --short` shows only lane files, plus the runner and record files and the ledger change, which I did not
  make.

## 4. Deviations
- The red check swapped `recipes/s11b-rules.ts` for a cut-down copy in place (a Python cut), then copied the full file
  back from the scratchpad. I did not use git stash, checkout or reset.

## 5. Proposed decisions
### 2026-10-27 · The history set-up waits on the tab's URL plus a 500 ms settle
**Decided:** after each set-up back, poll the tab's list row until it shows the target entry's URL (bounded at 10 s,
then a STOP), then wait 500 ms. **Why:** no read the SDK exposes carries a load status, and adding one would be a
product change. **Instead of:** a fixed sleep alone, or a new status field. **Revisit if:** a set-up back is still
followed by an unexplained STOP, or `TabInfo` gains a status. **By:** Claude (proposed)

## 6. Handoff
- A `-Block teardown` is still needed before the next liveA (`runner5.md`, Leftovers).
- Nothing is committed. Files to commit: fixer 4's four files plus `recipes/test/s11b-hist-wait.test.ts` and this
  report.
