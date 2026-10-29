# S5-addendum407 fixer round 3 (Sonnet, medium effort)

## 1. Verdict
DONE

## 2. Outputs
Fixed MAJOR-D in the dated note at `docs/e2e-test-plan.md` line 2002, in two spans of the liveness control. Nothing else was touched, and nothing was committed.

Span 1 (precedence):
- Old: "the clause is judged only on a capture that shows the worker's lines: the worker ..."
- New: "the clause can pass only on a capture that shows the worker's lines (a count above 0 fails it on any capture): the worker ..."

Span 2 (print rule and verdict order):
- Old: "... than the capture saved just before the leg; if it does not, `console-join` and `console-url` print `unread`. Every other clause is judged first: a STOP or a FAIL stands whatever the console reads; `unread` only turns a leg that would otherwise PASS into NOT MEASURED (a stated instrument limit); a round with ..."
- New: "... than the capture saved just before the leg; `console-join` and `console-url` always print their counts, and a count above 0 is a FAIL whatever the control reads; if the control does not hold, `unread` replaces only a count of 0, and then turns a leg that would otherwise PASS into NOT MEASURED (a stated instrument limit). Every other clause is judged first: a STOP or a FAIL stands whatever the console reads; a round with ..."

Rows 2006-2008: unchanged. They repeat none of the changed words; they say only "`console-join=0 console-url=0`".

Commands:
- `node scripts/doc-check.mjs`: exit 0, the same three standing items (counts 25/28/27, `CLAUDE.md:114 5596 passed`, `next-session-prompt.md:15`), 38 living docs checked.
- `git diff --numstat docs/e2e-test-plan.md`: `8	0	docs/e2e-test-plan.md`.

## 3. Verifier verdict
Not applicable (a fresh verifier re-checks the liveness and precedence spans).

## 4. Deviations
None. The fixer is Sonnet on a stage's third round, which is the last round a Sonnet fixer may run (agent-rules §7).

## 5. Proposed decisions
None.

## 6. Findings
None new.

## 7. Handoff
The tree holds the uncommitted edit to `docs/e2e-test-plan.md`. Nothing is running.
