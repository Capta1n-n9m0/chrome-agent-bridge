# S5-helpers builder report (Step 13, Run 20's pure helpers and fixture)

Builder: Claude Sonnet 5.5, medium. Nothing committed.

## 1. Verdict
DONE.

## 2. Outputs
- `recipes/s13-forms.ts` (199 lines), `recipes/test/s13-forms.test.ts` (359), `test-fixtures/s13-chooser.html` (16) and `.js` (55), `recipes/tsconfig.s13.json` (5). Total 634 new lines, under 1.5 x the ~600 cap; the extra is tests.
- One edit to an existing config: `recipes/tsconfig.s6.json` gains `test/s13-forms.test.ts` in `exclude`. Unavoidable: its `test/*.test.ts` glob compiled the new test, which imports chrome-typed extension code (`extension/src/debugger.ts`: 5+ `Cannot find name 'chrome'` errors). Same treatment Step 10 S8 gave the s9/s10 tests. `tsconfig.s13.json` (with `chrome` in `types`) compiles it.
- No Run 19 file (`s12-*.ts`) edited; `s12-forms-c.ts` `chooseLine` and `s11-rules.ts` `K` are imported read-only.
- Test count: 5654 (238 files, re-measured before my edits) -> 5702 (239 files), +48, none removed (`npm test`).
- `npm run typecheck`, `npm run build` exit 0; all 8 `npx tsc --noEmit -p recipes/tsconfig*.json` (`.json`, `.fe`, `.s6`, `.s9`, `.s10`, `.s11`, `.s11b`, `.s13`) exit 0. `git status` after build: only the slice's files plus this report and the red-run evidence.
- Evidence: `S5-helpers-builder-red.txt` (red run: the test run against an empty stub module through a scratch vitest config outside the tree, via alias; 42 failed, 6 passed. The 6 are the fixture-text and sheet-parser tests that do not call the module). I wrote the test before the module, but the first real red run was this stub reproduction (no file moved or reverted in the main tree).

### Exports and the §4.28 form each implements
- Forms: `loadedLine20` (1), `keyorderLine` (2), `popLine` (3), `mcplineLine` (4), `chkeptLine` (5), `rectLine` (6), `ctrl20Line` (7), `devt20Line` (8), `flagLine` (9), `portLine` (10), `scan20Line` and `scan20ActorsLine` (11), `s4Line` (12), `dockLine` (13). Redefined: `concap20Line` (`lines` = k+1), `chooseLine20` (Run 19 `chooseLine` plus `names-devtools=` last). Each is compared by key and alternatives with the sheet's own "Line forms (Run 20)" paragraph, parsed at test time.
- MCP judge: `MCP_LINES` (from `safetyRefusalLine`, `ARGS_RELOAD_HINT`, `CHOOSER_RELOAD_HINT`, `CHOOSER_BUSY_MESSAGE`), `mcpLineRead`, `mcpLineVerdict` (isError and the whole text equal to the line, one line).
- `busyExact`, `namesDevtools` (R20-CHOOSE-TWICE; `CHOOSER_BUSY_MESSAGE`).
- Cap: `concap20Stats`, `concap20Verdict`, `concap20Line` (R20-CON-CAP; marker pattern derived from the product's `formatConsole` output, never copied).
- DevTools: `ctrl20Verdict`, `devt20Verdict`, `worseVerdict`, `conditionalRows`, `devtRowGate`, `dockRestoreVerdict`, `DOCK_READ_PLACE`.
- Disabled input: `disClass`, `disVerdict`, `disBaselineOk` (`DISABLED_INPUT_MESSAGE`, `CHOOSER_TIMEOUT_MESSAGE` imported).
- `hasConsoleClause20`, `actorsVerdict`, `sentinelRows`.

### Mutants (all fed in memory, all rejected)
- Old overlap text (`K["K-devt"]`): fails `busyExact`; `namesDevtools` true.
- Old cap text (oldest nine kept, marker last, "more lines, the newest"): `marker=no`, verdict FAIL. Also the new marker at the end, a gap in the kept block, an uncapped body, a miscounted `n`: each FAIL.
- MCP line: the extension's message on the MCP leg is `other`; `VERSION\n<line>` and `VERSION: <line>` are `contains` and FAIL; `isError` false FAILs.
- DevTools: unread control never PASS; a refusal under a non-passing control carries no finding.
- Disabled input: `ok files=1` and any other answer FAIL; TIMEOUT on `flip` defers to `self`.

### Verifier3 NITs
- E/F: `DOCK_READ_PLACE` = "a tab's DevTools in window X" (R20-0C wording); `devtRowGate("unread")` gives NOT RUN; `dockRestoreVerdict` takes the read-back after reopening. Closing the reopened docked pane after the read-back is a driver step (S5-drivers-C), not a pure helper.
- G: `sentinelRows(tool)` attributes an evaluate tool's sentinel count to R20-ARGS-ORDER and R20-ARGS-OLD; `actorsVerdict` allows a sentinel above 0 only on `browser_console_messages`, `tab.consoleMessages`, `browser_evaluate`, `tab.evaluate`.

## 3. Verifier verdict
Not yet run.

## 4. Deviations
- `recipes/tsconfig.s6.json` edited (above).
- Judges import extension, daemon and sdk source (as the brief asks); other recipes did not.

## 5. Proposed decisions
None for the user. Design-local choices: an MCP-line mismatch is FAIL in `mcpLineVerdict` (the NOT DISCRIMINATING call for a reader fault is the driver's); `self` answering another code than the three on a `flip` TIMEOUT is FAIL (the sheet is silent; it mirrors `flip`'s rule); a DevTools control with `before` windows is not judged.

## 6. Findings
- Sheet gap: form (3) lists `active-guard=<bg or fg>` but the POP-NONE row prints `active-guard=n/a` (and `held-call=n/a`, `in-ms=n/a`); `popLine` prints n/a as the row does, and the test checks that case against the row text, not the form. S5-sheet could note it.
- `CLAUDE.md:110` still states 5596 tests (pre-existing; now 5702).

## 7. Handoff
- Drivers import from `recipes/s13-forms.ts`. The fixture's reporter is `window.__s13ch = {clicks, input, change, cancel, files, size, digest}`; `digest` is the page-computed SHA-256 hex (the driver prints only yes/no for `digest-differs`). The driver window guard must add the title "S13 chooser fixture" (#367). Queries `kept`, `disflip` (`#open` runs `in.click(); in.disabled = true;`), `disself` (`css:#dis`), `disbtn`.
- No daemon, Chrome or live run was used.
