# S8-builder: docs for Step 12's surface

Claude Sonnet 5.5, effort medium. Docs only; nothing committed; no CLAUDE.md edited.

## 1. Verdict
DONE.

## 2. Outputs
- `docs/setup.md` (+149/-17 by `git diff --stat`), `docs/progress-and-roadmap.md` (+25, Phase F block only),
  `README.md` (+12/-2), `docs/plans/2026-10-27-step12-phase-f-steps/S8-claude-md-proposals.md` (new). Changed lines across
  the three docs: 171 insertions, 17 deletions (cap 350).
- **Counts** (commands run): MCP tools 25 (`grep -o '"browser_[a-z_]*"' mcp/src/tools/registry.ts | sort -u | wc -l`, and
  `node scripts/doc-check.mjs`); router methods 28 (awk count of `METHOD_CLASSES` keys in `extension/src/safety.ts` = 28; doc-check
  28); error codes 27, 26 on the wire (`shared/src/codes.ts`: DAEMON 9 + EXTENSION 17 on the wire, SDK 1; doc-check 27;
  same as S3's 27 (26)). Tools 24 -> 25 and methods 27 -> 28 match S3's numbers.
- **`npm test`:** `Test Files 235 passed (235)`, `Tests 5596 passed (5596)` (2026-10-29). No test added or removed by this stage.
- **`node scripts/doc-check.mjs`:** exit 0. Findings: 5 count lines in CLAUDE.md files (CLAUDE.md:17, 18, 88;
  extension/CLAUDE.md:42; mcp/CLAUDE.md:9, all stale 24/27), the CLAUDE.md:113 test count (4665), `docs/decisions.md` 14834 words
  over a 10000 budget. README.md's finding (24 tools) is fixed. The rest are close-out items (CLAUDE.md files are not my lane;
  proposals file section 1-2).
- `typecheck` and `build` were not run (docs only; no code touched).

## 4. Deviations
- Much of setup.md already carried Step 12 text from S2-S6 (25 tools, args and console rows, banner, chooser). I did not rewrite
  it; I added citations and Run 19 results next to it and replaced sentences Run 19 made stale ("built, not yet run live",
  "not seen live", "by construction, not yet measured live").
- The MCP tool description says "frames are not read"; Run 19 read a same-site frame (R19-CON-FRAME). I documented the
  measurement in setup.md and left the tool description to the session agent (proposals section 4).
- The roadmap's Status line and section 1 were not edited. Proposed change: Status line "24 tools ... 4665 unit tests" becomes
  "25 tools, 27 codes (26 on the wire), 28 router methods, 5596 unit tests (`npm test` 2026-10-29)", plus Step 12 built, Runs 18
  and 19 recorded (#373).

## 5. Proposed decisions
None.

## 6. Findings
- setup.md line 163 table row (`browser_console_messages`) still says "the page's frames are not read"; kept to match the tool
  description. See Deviations.
- Banner steadiness across calls is not shown live (R19-KEEP-1 banner clause ND); setup.md says so and cites the keeper test.

## 7. Handoff
Verifier: walk the table below. Line numbers are in `docs/setup.md` unless named (grep the quoted start if lines moved).

## Table: changed sentence -> citation
| Location | Sentence (start) | Citation |
|---|---|---|
| setup.md:419 | Tab list gains `consoleMessages`, `upload {chooser}`, `{args}` | `mcp/test/s12-console-cross.test.ts` C3.4; R19-CON-MCP PASS; `sdk/test/s12-upload-chooser.test.ts`; `mcp/test/s12-args-cross.test.ts` B2.1 |
| setup.md:457 | "With `{args}` ... SDK checks `args` before any call" | `mcp/test/s12-args-cross.test.ts` (third test); `shared/test/protocol-step12.test.ts`; R19-ARGS-2 PASS |
| setup.md:457 | `tab.consoleMessages` entries; `formatConsole` on `@bridge/sdk/format` | `sdk/test/s12-console-format.test.ts` |
| setup.md:322 | "a trusted click ... holds the visibility lock ... 500 ms after" | `daemon/test/s6-trusted-focus.test.ts` (G6.5, G6.7) |
| setup.md:322 | "a typed string arrived complete in 5 of 5 rounds" | R19-G2-2 PASS |
| setup.md:322 | "R19-G2-1 FAILED ... `TIMEOUT` after about 35 s; cause not established" | R19-G2-1 FAIL |
| setup.md:564 | Five calls 3 s apart all answered `ok` | R19-KEEP-1 PASS (answers 5/5); banner clause ND stated |
| setup.md:564 | steady banner shown only by tests | `extension/test/debugger-keeper.test.ts` D4.1 |
| setup.md:564 | median 5.1 s later (10 132 vs 5 028 ms) | R19-KEEP-2 PASS |
| setup.md:564 | refusal while kept answered with the refusal | R19-KEEP-3 PASS |
| setup.md:564 | refused upload showed no banner after 20 s quiet | R19-UP-6, R19-F-RAW, -F-RAW-2, -F-RAW-DIR PASS |
| setup.md:564 | console read and chooser show the banner; JS-off/blocked/own/file refusals show none | R19-CON-BANNER, R19-CHOOSE-1, R19-CON-JSOFF, -3, -OWN, -FILE, R19-CHOOSE-JSOFF (all PASS) |
| setup.md:564 | DevTools not measured | R19-UP-DEVT, R19-KEEP-4, R19-SWEEP-HELD NOT MEASURED; #369 |
| setup.md:607 | returned `value` keys sorted (limit) | R19-ARGS-1 FAIL (stated as the limit; cause from Stage 0, said not to be a live print) |
| setup.md:613 | round trip of nested/Unicode/null values | `extension/test/s12-args-cdp.test.ts` B2.1 |
| setup.md:613 | no page global left | R19-ARGS-GLOBAL PASS; `extension/test/s12-args-cdp.test.ts` |
| setup.md:613 | refusals `BAD_PARAMS`, eleven exact, effect counter unmoved | R19-ARGS-2 PASS; `shared/test/protocol-step12.test.ts` |
| setup.md:613 | CSP-forbids-eval page answers | R19-ARGS-CSP PASS |
| setup.md:613 | `timeoutMs` 1 500 -> `TIMEOUT` at 1 516 ms, page usable | R19-ARGS-STOP PASS; `extension/test/s12-args-call.test.ts` |
| setup.md:613 | JS off refuses `JS_DISABLED` before attach; live MCP text not shown | `extension/test/s12-args-cdp.test.ts` B2.2; R19-ARGS-3 FAIL (stated as not shown) |
| setup.md:613 | old extension `VERSION`, nothing forwarded; live MCP text not shown | `mcp/test/s12-args-cross.test.ts` B2.3; `daemon/test/s12-args-feature.test.ts`; R19-ARGS-OLD ND (stated) |
| setup.md:716 | `## Reading the console` intro, line form, empty text, banner during read | `sdk/test/s12-console-format.test.ts`; R19-CON-MCP, R19-CON-BANNER PASS; `extension/test/s12-console-gate.test.ts` |
| setup.md:716 | 11 entries / limit 3 / level error | R19-CON-1 PASS |
| setup.md:716 | uncaught, rejection, 2000 cut, navigation, second read | R19-CON-2, -REJ, -BIG, -NAV, R19-CON-KEPT PASS |
| setup.md:716 | no URL/stack; blocked source dropped | R19-CON-1; `extension/test/s12-console-reduce.test.ts`; R19-CON-FRAME PASS |
| setup.md:716 | refusals (JS off, blocked/own/file, disarmed) | R19-CON-JSOFF, -3, -OWN, -FILE PASS; `extension/test/s12-console-gate.test.ts` C3.2 (disarmed; R19-CON-4 ND stated) |
| setup.md:716 | arm floor | `extension/test/s12-console-reduce.test.ts` (ArmFloor); R19-CON-FLOOR ND stated |
| setup.md:716 | 20 000 cap, 9 lines, 191 more, oldest kept | R19-CON-CAP PASS; `sdk/test/s12-console-cap.test.ts`; #355 for the open direction |
| setup.md:716 | object logged before the read shows as `Object` | R19-CON-NOTEA FAIL (a stated limit) |
| setup.md:885 | chooser: file reaches page, no dialog, background tab, banner | R19-CHOOSE-1, R19-CHOOSE-LABEL PASS |
| setup.md:885 | refusals with nothing uploaded, `TIMEOUT` 5 022 ms, `DISARMED` | R19-CHOOSE-2, -JSOFF, -DISARM, -3 PASS |
| setup.md:885 | picker/single/dir/disabled refused `BAD_PARAMS`, tested; live row ND | `extension/test/s5a-chooser.test.ts` ("the chooser's own input rules"); R19-CHOOSE-REFUSE ND, #370 |
| setup.md:885 | Chrome's dialog given back | R19-CHOOSE-4 PASS |
| setup.md:885 | MCP form; no-`chooser` unchanged | R19-CHOOSE-MCP PASS; `mcp/test/s12-upload-chooser.test.ts`, `sdk/test/s12-upload-chooser.test.ts` |
| setup.md:885 | old extension `VERSION` | `daemon/test/s12-chooser-feature.test.ts`; R19-VERSION ND stated |
| setup.md:885 | two calls in a row, `change` stays 1 | R19-CHOOSE-KEPT FAIL (stated limit, cause not established) |
| setup.md:957 | your click may take the call's file (measured once) | R19-CHOOSE-HUMAN RECORD |
| setup.md:957 | opener at 4 900 ms `ok`, 5 100 ms `TIMEOUT`, no dialog | R19-CHOOSE-LATE PASS |
| setup.md:957 | same-origin frame input reached | R19-CHOOSE-FRAME RECORD |
| setup.md:1402 | trusted gap: lock across focus and input | `daemon/test/s6-trusted-focus.test.ts`; R19-G2-1 FAIL stated |
| setup.md (VERSION troubleshooting bullet) | daemon refuses before forwarding; MCP fails with reload text | `daemon/test/s12-args-feature.test.ts`, `daemon/test/s12-chooser-feature.test.ts`, `mcp/test/s12-args-cross.test.ts` B2.3; R19-ARGS-OLD, R19-VERSION ND stated |
| setup.md:1413 | docked DevTools did not refuse (31 of 31 `ok`); overlap answers it | R19-UP-DEVT/-KEEP-4/-SWEEP-HELD NOT MEASURED, #369; R19-KEEP-OVERLAP PASS |
| README.md:23, 66 | 25 tools; 5596 tests in 235 files | tools/test commands above |
| README.md:56-64 | Step 12 paragraph | R19-ARGS-2, -GLOBAL, R19-CON-1, R19-CHOOSE-1, -2 PASS; `extension/test/debugger-keeper.test.ts`; R19-KEEP-1; `daemon/test/s6-trusted-focus.test.ts`; R19-G2-1 FAIL; totals 42/5/5/3/3 from S7-run-record.md section 1 |
| progress-and-roadmap.md (Phase F block, "Updated 2026-10-29") | each bullet | the rows named in the bullet (verdicts as in S7-run-record.md); Run 18 totals from S1-run-record.md section 1 (6 PASS, 6 FAIL, 1 NOT MEASURED of 13 rows); G1/#337, #355, #369, #370, #373 as decisions |
