# S5-drivers-B2 fixer, round 1

Model: Sonnet, medium. Role: fixer (agent-rules §6). Lane: `recipes/s13-r20-b.ts`, `recipes/test/s13-r20-b.test.ts`. No Chrome, no daemon.

## 1. Fixed

- **F1 (MAJOR).** `judgeKeptDifferent` now judges every clause first: both answers `ok`, and after call 2 `change=2`, `input=2`, `cancel=0`, `files=1`. Any miss is FAIL, so "call ok, page got nothing" is FAIL even with a null digest. NOT MEASURED only when all those hold and a digest is still `null`; then PASS/FAIL by digest difference.
- **F2 (MINOR).** New exported `parseDialogCount(raw)`: trims, accepts only `^\d+$`, otherwise throws `HelperDefect` (which `catchDecision` propagates, never a row FAIL). `dlgN` uses it, so an unreadable count never reads as 0.
- **F3, F4 (NITs).** One comment line each in `s13-r20-b.ts` naming the departure from the sheet (state.json SHA-256 prelude; `browser_new_tab` for the MCP leg). No behaviour change.
- F5: not acted on.

## 2. Tests

- **Changed, not removed:** the loose test (old lines 72-75) "a digest the page never computed ... NOT MEASURED" now states its precondition (every counter holds) and adds a call-1-null case; it still passes.
- **Added (2):** "an ok the page never received is a FAIL even with no digest (F1)" (three cases: the verifier's two, plus `files=0` with null digest); "an unreadable dialog count is a HelperDefect, never 0 (F2)" (`""`, `abc`, `-1`, `1.5`, `NaN`; `"0"` and `" 2\r\n"` parse).

## 3. Red proof (outside the tree)

The new tests cannot be run against the old code without editing the tree, so the old logic was copied into a scratchpad script (`red.mjs`) and fed the new test inputs. Old `judgeKeptDifferent` returned `NOT MEASURED` for all three F1 cases (the new tests expect FAIL). Old `dlgN` returned `0` for `"abc"` (the new test expects a throw). `parseDialogCount` did not exist before, so the F2 test could not even import.

## 4. Outputs

| Check | Result |
|---|---|
| `npm test` | 244 files, 5839 passed (5837 + 2), none removed |
| `npm run typecheck` | exit 0 |
| `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b,.s13}.json` | all eight exit 0 |
| `npm run build` | exit 0 |
| `git status --short` | only the slice's 4 modified and 3 new files, plus the builder and verifier reports (and this one) |

## 5. Deviations

None. Builder's proposed decision 3 must be restated by the session agent: NOT MEASURED for KEPT `different` only when every judged clause holds and a digest is unreadable.
