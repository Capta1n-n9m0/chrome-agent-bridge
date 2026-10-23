# S6 fixer 2: REP-0's human colour, probe-tab clean-up, verdict-line rule (pre-run)

S6 fixer (level 2), 2026-10-23. It acts on `S6-verifier-r2.md` (FAIL: MAJOR-1, MINOR-2, MINOR-3) under the
step agent's rulings. The base is HEAD `430cbeb` plus builder r2's uncommitted tree. Nothing is committed.
There was no live Chrome or bridge contact: no recipe that connects was run. Nothing in `extension/
daemon/ sdk/ mcp/ shared/` or `recipes/t5-*.ts` changed. No other row's text or rule changed.

## MAJOR-1: the human tab's colour changes from cyan to blue

**Evidence that blue and magenta read correctly through default captures.** Run 9's default-mode
(`captureVisibleTab`) captures, judged by the same hue rule:
- `docs/plans/2026-10-21-step7-multi-actor-tabs-steps/T5-run9-record.md:86` (t5-screen3-c): blue
  `#0000ff` (t5-lib `COLOURS.blue`) read `#3300f8` and named **blue**.
- `T5-run9-record.md:72` (R9-SCREEN-1 run 1): magenta read `#dd00fa` and named **magenta**. The same
  reading appears at `:112` (screen5).
- `T5-run9-record.md:85`: lime read `#8fff3d` (R = 143). CDP cyan read `#97fdfd` (R9-SCREEN-2,
  `docs/e2e-test-plan.md:1789` "cyan read #97fdfd → other").
- Both readings are confirmed in `T5-run9-verifier.md:20,23` and `T5-run9-prereg-verifier.md:55,57`.

**The probe's magenta uses the same rule Run 9 used.** `s6.ts`'s `hue()` calls `t5-png.ts describeBar`.
Run 9's `t5.ts --hue` calls the same function (`recipes/t5.ts:56,108`). `recipes/t5-png.ts` last changed
in `b4ea752` (the Run 9 pre-registration) and is unmodified in the tree. So `#dd00fa` is named magenta now
as it was then. The new test checks this on a synthetic PNG.

**Changes**
- `recipes/s6-rules.ts:312`: `REP0_HUMAN_COLOUR = "blue"` (was `"cyan"`). Lines 305–308 carry the dated
  note. The doc comment's "cyan = the human's tab" and "did not read cyan" now say blue.
- `recipes/s6.ts:549`: the human tab's bar is painted `COLOURS[REP0_HUMAN_COLOUR]` (`#0000ff`; was
  `COLOURS.cyan`). The `bars:` line prints the constant. The header (`:27`) and the doc comment (`:519`)
  say blue.
- `recipes/test/s6-rules.test.ts`:
  - The existing REP-0 inputs use blue for the human tab (`:311`, `:350` `/blue.*human/`, control B's
    wrong colour, the "also:" test). The human-tab NOT DISCRIMINATING loop now also covers `"cyan"`.
  - New block `:421–481` ("REP-0's bar colours under the hue rule"):
    - a solid-PNG encoder;
    - `DEFAULT_CAPTURE_READING` (Run 9's readings, cited);
    - 4 tests: the human colour is blue and the probe's is magenta; both colours *as Run 9's default
      captures read them* (`#dd00fa`, `#3300f8`) still name themselves through `hueName` and
      `describeBar`; the painted `COLOURS` values name themselves; `#97fdfd` is `other`, which is why
      cyan was dropped.
  - **Failing first:** run before the constant changed, they failed 2 of 53:
    `expected "blue", received "cyan"` and `no default-capture reading of cyan: expected undefined to be
    defined`. After the change: all pass.
- `docs/e2e-test-plan.md:1052` (§4.19 REP-0 row): all 7 "cyan" mentions now say blue (the paint step,
  the `bars:` and `control A` expected lines, the PASS line, the FAIL and NOT DISCRIMINATING clauses).
  The dated disclosure the step agent required is inserted verbatim before **Gate:**.
- `S6-wave-sheet.md:312` (rows table): "control A (human tab blue)". `:130`: a dated pointer in R-e.

## MINOR-2: the probe tab and the run directory are cleaned up on every path

`recipes/s6.ts:525–648`. The `try` now starts right after `rep0FailuresDir()` and covers the connected
line, the human-tab checks and the probe's opening. `openFixture` is inlined (`:538–543`) so that the
handle is stored in `let opened` (`:530`, `:541`) as soon as `newTab` returns, before its `waitFor` can
throw. The `finally` (`:642–649`) closes `opened` if it is set and always runs `rep0Cleanup(dir)`. That
deletes any report PNG under the run's directory, a `waitFor` TIMEOUT's included, or prints "not created".

## MINOR-3: only a verdict line is a result

- `docs/e2e-test-plan.md:1052`: after "Set-up refusals are exit 2 … (both recorded).", a new sentence says
  only a `REP-0 PASS|FAIL|NOT DISCRIMINATING` line is a result. A `FAILED — …` line with no verdict line
  (exit 1 or 2) measured nothing and is rerun after the set-up is fixed, with both runs recorded. A dated
  note follows it.
- `S6-wave-sheet.md:126–131` (R-e): the same rule, plus "never gate on the exit code alone" and a dated
  note.

## Commands

```
npx vitest run recipes/test/s6-rules.test.ts      (new tests, before the fix)
  Tests  2 failed | 51 passed (53)
npx vitest run recipes/                            (after)
  Test Files  4 passed (4)
       Tests  138 passed (138)
npx tsc --noEmit -p recipes/tsconfig.s6.json       → exit 0
npm run typecheck                                  → exit 0
grep -n cyan recipes/s6.ts                          → none
grep -n cyan recipes/s6-rules.ts                    → the dated note only (:306-307)
grep -n cyan recipes/test/s6-rules.test.ts          → the NOT DISCRIMINATING loop value, the "why not cyan" test
grep -n cyan S6-wave-sheet.md                       → the dated pointer only (:130)
```
There are 18 new or changed REP-0 tests in total: builder r2's 14 plus 4 new.
