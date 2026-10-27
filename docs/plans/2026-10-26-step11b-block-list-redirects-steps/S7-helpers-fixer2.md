# S7-helpers fixer report, round 2 (Step 11b, Run 17b's live helpers)

Model: Sonnet 5.5, medium effort. No live run; nothing touched Chrome, the daemon or port 9234. No commit.

## Findings

- **N1 (fixed).** `historyCall` now prints the HISTREPLY line through the new pure `histReplyLine` (`recipes/s11b-r17b-rules.ts`). Its `ms` is `msForJudge(row, allMs)`: the largest reply of a pair for R17B-ACT-CTL, the last call for every other row. `start` and `reply` still belong to the last call (R17B-BACK-EMPTY reads them). The runner's path (`back` x2 without `--rules-after`, then `judge-history --ms <HISTREPLY ms>`) now sees a slow first call. Test: parses the line with the runner's regex, then `judgeR17bRow` gives FAIL on `[13000, 200]` and PASS on `[100, 200]`.
- **N2 (fixed).** `judgeRd2Snapshot(before, after, snap)`: r2 is hidden when `hidden(blocked)` rose between a `tabs` call made just before `newtab` and the one after it. The wave's options window no longer counts. The block (`r17b-rd-2`) adds the earlier `tabs` call and passes `--tabs-before-from` to `r17b-clause` (`s11b.ts`). Tests: before=1, after=1 and an `ok` snapshot gives pass (recorded, not FAIL); before=1, after=2 and the `ok` snapshot gives FAIL; K-tab gives pass.
- **N3 (tests added).** Mixed fixtures for F1 (`elements=12 counter=none`, `elements=0` with a counter); the `$codes = @($ans, …, $snapC, …)` string; K-tab code with a wrong message; the `$wc -eq 3` arm. These pin existing code (they kill the verifier's survivors) and do not fail before the fix.
- **N5 (fixed).** In `r17b-newtab-refused`, an `ok` answer closes tab `nr` before any return, and the FAIL reads "the javascript: URL was accepted and a blank tab was made (it was closed)". Otherwise it reads "the tab-row count changed". Test: the close precedes the FAIL, and both texts are present.
- **N4:** left alone, as briefed.

## Exit checks

- `npm test`: 4660 passed, 190 files (before: 4654 / 190; none removed, 6 `it` blocks added).
- `npm run typecheck` 0; `npm run build` 0.
- Recipes tsconfigs `""`, `.fe`, `.s6`, `.s9`, `.s10`, `.s11`, `.s11b`: 0, 0, 0, 0, 0, 0, 0.
- `git diff HEAD -- docs/e2e-test-plan.md recipes/s11b-r17.ps1 extension daemon shared sdk mcp`: empty.
- Run 17's RD-* paths unchanged: `msForJudge` returns the last call for every non-ACT-CTL row, so the HISTREPLY line is identical for them.
- No token, pattern or real URL added.

## Files changed

`recipes/s11b-r17b.ps1`, `recipes/s11b-r17b-rules.ts`, `recipes/s11b.ts` (R17B paths, the `histReplyLine` call and the `rd2-snap` arguments), `recipes/test/s11b-r17b-fix.test.ts`.
