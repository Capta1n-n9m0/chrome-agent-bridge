# S7-helpers fixer report, round 3 (Step 11b, Run 17b's live helpers)

Model: Opus 5.5, medium effort (agent-rules §7, third round). No live run. Nothing touched Chrome, the daemon or port 9234. No commit.

## Finding

**M1 (fixed with verifier 3's option (a)).** R17B-RD-2's snapshot clause now reads the `r2` tab's own row, found by its handle in the SDK's
`client.tabs()`, as `judgeFileTabHidden` does. It no longer reads the `hidden(blocked)` count over every tab, so a change to another tab
during the row cannot move the verdict.

- **`recipes/s11b-r17b-rules.ts`.** The count reading (`hiddenCount` and the before/after `judgeRd2Snapshot`) is gone. In its place:
  - `rd2TabRowLine(label, rows, handle)` prints `TABROW R17B-RD-2 rows=<n> found=yes hidden=blocked|none|disarmed|other`, or
    `found=no|many`, `handle=none`, `read=failed`. It prints labels and counts only, never a handle, URL or title.
  - `parseTabRowLine(lines, label)` reads the last TABROW line of the label, bare or after an ISO time. It returns
    `hidden` / `shown` / `unreadable`, and only `found=yes hidden=blocked|none` are readable.
  - `judgeRd2Snapshot(state, snap)` follows §4.25: `hidden` needs the snapshot to be K-tab (code and message), else FAIL. `shown` is
    recorded with the snapshot's code as its class. `unreadable` (and no snapshot row) is NOT MEASURED, never PASS.
- **`recipes/s11b.ts`.** There is a new SDK op, `rd2-row --tab <key> [--dry]`. It resolves the key through `handleOf` and reads
  `client.tabs()`. A missing key or a failed read prints the unreadable line, not a STOP. It bumps nothing.
  `r17b-clause --kind rd2-snap` now takes `--tabrow-from` in place of `--tabs-before-from`/`--tabs-from`. The R17B paths are the only
  ones that changed.
- **`recipes/s11b-r17b.ps1`, block `r17b-rd-2`.**
  - Fixer 2's `tabs` call before `newtab` is removed, and so is the S9 `tabs` call after the 2 s, whose only use was the clause.
  - The sheet's `tabs` step is now `B17 rd2-row --tab r2`, at the same point (after the 2 s, before `snapshot`). Its output is written
    to a file for the clause.
  - The `$codes` list is unchanged.
- **Tests (`recipes/test/s11b-r17b-fix.test.ts`).** The F2/N2 block is rewritten around the per-row judge: 4 `it` → 7.
  - It covers the three branches, disarmed or duplicate rows (NOT MEASURED), the label-only line, the K-tab code with a wrong message,
    the block's order and arguments, and the `rd2-row` op.
  - It includes verifier 3's probe as written: r2 hidden, snapshot `ok`, another hidden tab gone, so a summary count would stay level.
    That case gives FAIL, not PASS.
  - Before the fix, 6 of these tests failed (`npx vitest run recipes/test/s11b-r17b-fix.test.ts`: 6 failed, 18 passed).

## Exit checks

- `npm test`: **4663 passed, 190 files**. Before: 4660 / 190. None removed (the block went from 4 to 7 tests).
- `npm run typecheck` 0; `npm run build` 0.
- `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json`: 0, 0, 0, 0, 0, 0, 0.
- `git diff HEAD -- docs/e2e-test-plan.md recipes/s11b-r17.ps1 extension daemon shared sdk mcp`: empty.
- Run 17's paths are unchanged: `rd2-row` is a new op, and `rd2-snap` is used only by `r17b-rd-2`.
- `node --import tsx recipes/s11b.ts rd2-row --tab r2 --dry` gives `PLAN rd2-row ok …`, exit 0.
- No token, pattern or real URL was added. The test fixtures use 127.0.0.1/localhost only.

## Notes for the verifier

- **The sheet's step.** The `tabs` step is now read through the SDK (`client.tabs()`), not through `S9 call … tabs`. The sheet's expected
  text "`tabs`: the row `hidden=blocked`" is a per-row reading, which this matches. The sheet itself is not edited.
- **A disarmed r2 row.** A row hidden as `disarmed` is NOT MEASURED. The clause names only `hidden(blocked)`, and RD-2 runs armed.

## Files changed

`recipes/s11b-r17b-rules.ts`, `recipes/s11b.ts`, `recipes/s11b-r17b.ps1`, `recipes/test/s11b-r17b-fix.test.ts`.
