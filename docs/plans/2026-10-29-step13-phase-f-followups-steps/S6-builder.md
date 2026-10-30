# S6 builder report

Claude Sonnet 5.5, medium. Docs only; nothing committed; the held liveB20 files untouched.

## 1. Verdict
DONE. The #369 reword is not applied (waits for the user); it is in the proposals file.

## 2. Outputs
- Changed: `docs/setup.md`, `docs/progress-and-roadmap.md`, `README.md`. New: `…-steps/S6-claude-md-proposals.md`,
  `…-steps/S6-builder-doccheck.txt`, this report.
- `npm test` (2026-10-30, HEAD `f6bafc5`): "Test Files 251 passed (251)", "Tests 6030 passed (6030)". Before: 5596 / 235 files
  (root `CLAUDE.md:114`). The rise is Step 13's tests (5654 after S4; recipes tests after).
- `node scripts/doc-check.mjs`: exit 0, counts 25 tools, 28 router methods, 27 codes; no dead path; the flags are
  `CLAUDE.md:114  5596 passed`, which the session agent fixes (proposals (c)), and `docs/plans/next-session-prompt.md:15`
  (status text, out of lane, pre-existing).
- `git diff --stat`: only the three lane docs changed.

## 3. Changes (each behaviour sentence cites a row or a test, D6.1)
| Area | File:line | Citation |
|---|---|---|
| Reload note: `webNavigation` | setup.md:~102-104 | `extension/test/manifest.test.ts`, R20-0 |
| Popup lease: completed live note (BG-3 PASS 3 of 3, FG-3 PASS, OTHER-3 NOT MEASURED, first rows FAIL on sheet clauses) | setup.md:288 | R20-POP-BG-3, R20-POP-FG-3, R20-POP-OTHER-3; #406, #407; `extension/test/opener-join.test.ts` |
| Key order of `value` now the page's | setup.md:624 | `extension/test/s13-envelope.test.ts`, `s12-args-cdp.test.ts`; R20-ARGS-ORDER SDK leg 5 of 5 (row printed RECORD, said so); R20-0 `keys=page` |
| Tool-table console row: frames clause per `registry.ts`, amendment dropped; class-name limit added | setup.md:165 | R19-CON-FRAME, R20-CON-NOTEA; `registry.ts` checked |
| Frames sentence in "Reading the console": last sentence dropped, replaced by a pointer | setup.md:~745 | R20-CON-DESC; `mcp/test/s12-console-cross.test.ts` |
| Cap keeps the newest lines, new marker | setup.md:761 | R20-CON-CAP; `sdk/test/s12-console-cap.test.ts`; #398 |
| Replayed-object limit now documented; the description's sentence quoted (checked against `registry.ts`) | setup.md:773 | R20-CON-NOTEA (cut path NOT REACHABLE); #387 |
| Chooser: second call has its own fixed text, quoted from `CHOOSER_BUSY_MESSAGE` | setup.md:~908 | R20-CHOOSE-TWICE; `extension/test/s5a-chooser.test.ts`; `mcp/test/s13-chooser-busy.test.ts` |
| Chooser: old VERSION-MCP and CHOOSE-KEPT notes updated (CHOOSE-KEPT as RECORD) | setup.md:931, 935 | R20-VERSION, R20-CHOOSE-KEPT |
| Troubleshooting: overlap text no longer the chooser's | setup.md:1447 | R20-CHOOSE-TWICE |
| Status line, Step 12 table row note, new Step 13 row, test-count line, roadmap "next", Phase F open items (key order, console, DevTools, chooser, G1) | progress-and-roadmap.md:3-5, 173-174, 195, 769, 882-895 | `S5-run-record.md` §1d, §2; `npm test`; doc-check |
| Step 12 "not closed" corrected; Step 13 paragraph; test count | README.md:56, 66-80 | #374; R20-POP-BG-3, R20-ARGS-ORDER, R20-CON-CAP, R20-CON-NOTEA, R20-CON-DESC, R20-CHOOSE-TWICE; the three test files |

The two plan-drift amendments (setup.md tool-table clause, last sentence of the console frames bullet) are dropped as item 2 asked.

## 4. Deviations
- Item 5: the #369 text in setup.md (banner section "Not measured", Troubleshooting) and README is left as is, on purpose; only
  the chooser overlap note in Troubleshooting got a dated note (it is about the chooser text, not #369).
- Added dated notes the brief did not list: R19-VERSION and R19-CHOOSE-KEPT lines in the Uploading section (Run 20 re-measured both).
- No setup.md limit statements about S2's left-for-later items existed, so none added; they are in proposals (d) 5.

## 5. Proposed decisions
None.

## 6. Findings
- R20-ARGS-ORDER: kept RECORD as printed everywhere; no doc calls it PASS.
- setup.md still says (item 5, untouched) "DevTools wins" and "Not measured" for #369's conditions; true until the user rules.
- Proposals file (d) items 7-9: `daemon/CLAUDE.md` ~78-83 ("a background opener's popup gets no lease at all") is now false
  and is the biggest stale CLAUDE.md statement.

## 7. Handoff
Verifier focus: every dated note above; no local path or user name (grep run on the three docs and the proposals file: none).
The session agent applies the proposals file and the `CLAUDE.md:114` count. Nothing running.
