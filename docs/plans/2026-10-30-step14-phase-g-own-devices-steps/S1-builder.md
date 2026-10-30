# Step 14 S1 builder: the ~ path

**Change.** `sdk/src/error.ts`: new pure `homeAsTilde(p, home)`; `ReportInput.home` (set from the injected `opts.homedir()` in `enrich`); the `Screenshot:` line prints `homeAsTilde(input.screenshotPath, input.home)`. `err.screenshotPath` is untouched (absolute). `recipes/test/s12-r19-static.test.ts:61` re-states the pinned source text for the new line (same behaviour pinned, not loosened).
**Tests** (written first; red run in `S1-builder-red.txt`: 4 failed, 1 passed): new `sdk/test/s14-home-path.test.ts` (5), one added in `sdk/test/failure-report.test.ts` (end to end: report shows `~`, `screenshotPath` absolute). Existing expectations at failure-report 531/595 and mcp s5-cross 230 needed no change (their injected homes are not parents of the shot, or none is passed).
**Results.** tsc sdk exit 0, mcp exit 0; `npm test` 6030 passed / 251 files -> 6036 passed / 252 files; `npm run build` ok; `recipes/tsconfig.s6.json` exit 0 (empty output). Evidence: `S1-builder-{red,tsc,test,build,recipes-tsc}.txt`.

## Proposed decisions
- Case/separators: a Windows home (drive-letter form) matches case-insensitively and with either separator, and prints `~\` plus the rest with `\`; a non-Windows home matches exactly and prints `~/`. Only a path strictly inside the home (home + separator) is rewritten; the home itself, a sibling prefix (`...\someone2`) and other drives print unchanged.
- Scripts' `report()` also shows `~` (the line is shared with the MCP), as Stage0 m1 noted.
