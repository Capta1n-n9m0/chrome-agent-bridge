# S7-live liveC19 fixer, round 1

Model: Claude Sonnet 5.5, effort medium.

## 1. Verdict
DONE

## 2. Outputs
Finding fixed: `recipes/s12-r19-c.ts:387` (R19-CHOOSE-MCP leg b) now targets `{ css: "#vis" }` instead of `{ css: "#in" }`. Nothing else in the leg changed (judge, want `files: 1, change: 1`, dialog step name).

Files (`git diff --stat` for the fixer's changes; the ledger line is another agent's earlier edit):
- `recipes/s12-r19-c.ts` — 1 line changed.
- `recipes/test/s12-r19-c-legb.test.ts` — new, 2 tests. Chosen as a new file so the 23 anchored mutants in `s12-r19-c.test.ts` stay untouched.

New tests pin: (1) the single `leg(R, "b", await mcpLeg(` line contains `locator: { css: "#vis" }` and not `"#in"`; (2) in `test-fixtures/s12-chooser.js` `VIS` is `<input id="vis" type="file">` with no `hidden`, `HID` is `<input id="in" type="file" hidden>`, and `c1: BTN + HID + VIS`.

Red on HEAD's line 387 (fix not yet applied):
`FAIL ... leg b's locator is the visible file input #vis, never the hidden #in` / `AssertionError: expected '  leg(R, "b", await mcpLeg(m, R, "b",…' to contain 'locator: { css: "#vis" }'` / `Tests 1 failed | 1 passed (2)`. The fixture test passed on HEAD, as expected (the fixture was already right).

No anchored mutant went red from the line change; no anchor text was edited. No existing test deleted, skipped or weakened.

Test counts:
- `npx vitest run recipes/test/s12-r19-c.test.ts`: before 53 passed; after (with the new file, both files): `Test Files 2 passed, Tests 55 passed`.
- `npm test`: before `233 files, 5588 passed`; after `234 files, 5590 passed` (+1 file, +2 tests).
- `npm run typecheck`: exit 0.
- `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json`: all seven exit 0.

## 3. Verifier verdict
n/a (fixer).

## 4. Deviations
None. Nothing run against Chrome, the daemon or port 9234; not committed; `wtv` not read.

## 5. Proposed decisions
None.

## 6. Findings
None new. The defect class matches decision #368: a locator on a `hidden` element never matches because the locator walk prunes hidden subtrees.

## 7. Handoff
Uncommitted: `recipes/s12-r19-c.ts`, `recipes/test/s12-r19-c-legb.test.ts`, this report. No processes left running.
