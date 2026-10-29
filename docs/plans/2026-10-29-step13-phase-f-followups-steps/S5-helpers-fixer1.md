# S5-helpers fixer 1 (Step 13, round 1 of 3)

Sonnet, medium. Lane: `recipes/s13-forms.ts`, `recipes/test/s13-forms.test.ts`, `S5-helpers-builder-red.txt`, this report. Nothing committed.
Tests: 5702 -> 5705 (the new file 48 -> 51 tests, none removed). Proofs were run on scratch copies outside the tree (copies of the module and the
test with absolute imports, one mutation each); the main tree was never reverted.

| Finding | What changed | Proof |
|---|---|---|
| MAJOR-1 | `S5-helpers-builder-red.txt`: ANSI codes stripped, the vitest `RUN` banner line (home path) dropped. | `grep -i "Users[/\\]\|"Users[/\]|<the user's name>"` over every slice file and the red file finds nothing (the verifier report quotes the redacted line); ANSI count 0. |
| MINOR-2 | New test "the oldest nine under the NEW marker fail": new marker plus the oldest nine rows reads `first-index=1 last-index=9`, verdict FAIL. | Mutant without `lastIndex === total && firstIndex === total - k + 1`: that test fails (`expected 'PASS' to be 'FAIL'`); the old 48 tests passed it. |
| MINOR-3 | `concap20Verdict` takes `expectK` (default 9): rule held with k = expectK is PASS, with another k RECORD, rule broken FAIL. Return type gains `"RECORD"`. The extension-text mutant now uses `JS_DISABLED_MESSAGE` (imported from `extension/src/safety.js`). New test for PASS/RECORD (`expectK: 8`, and a `maxChars: 7000` run with k < 9). | Mutant that returns PASS for any k: the RECORD test fails. |
| NIT-4 | `K_DEVT_CODE = ErrorCodes.DEBUGGER_DEVTOOLS` (import `@bridge/shared/codes`). The DevTools text stays from `K["K-devt"]` (no product export). | Mutant with a wrong code literal: not separately killed (existing busyExact and devt tests use the literal code string, which would fail them; covered by the code-equality tests). |
| NIT-5 | `busyExact` also requires `data === undefined`; test for a busy answer with `data`. `MCP_LINES.chooserOld` asserted against `CHOOSER_RELOAD_HINT`. | Mutant dropping the data clause: the new test fails (plus the disabled-input map test). Mutant `chooserOld: ARGS_RELOAD_HINT`: "the expected lines come from the product" fails. |
| NIT-6 | The bare `toThrow()` calls carry message matchers (`x: an integer`, `not a side`, `R20-0C or R20-RESTORE`, `listed: a count`, `sentinel: a count`, `stream: not a fixed code`). | The unmutated suite passes 51/51; a stub module now fails these tests on the message. |

Not done by design: NIT-7 (the doc updates) is the session agent's. Exit checks: `npm test` 239 files, 5705 passed; `npm run typecheck` 0; the 8
recipes tsconfigs 0; `npm run build` 0; `git status` shows only the slice's files.
