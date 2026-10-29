# S5-addendum407 fixer report, round 2

Model Sonnet, effort medium. I edited only the dated note at `docs/e2e-test-plan.md` line 2002 (four spans) and this report. I read no raw run record and did not commit.

## 1. Verdict
All three findings (MAJOR-A, MAJOR-B, MINOR-C) are written in as the step agent ruled.

## 2. Outputs
- `docs/e2e-test-plan.md` line 2002, edited.
- This report.

## 6. Findings, old to new

**MAJOR-A (liveness control).**
Old: "the after-leg capture must hold at least one piece `[bridge] evaluate` from the leg's own `evaluate` calls (B's probe); if it holds none, ... print `unread` ...; in leg `human` a round with no popup makes no probe, and that round is NOT MEASURED anyway."
New: lists which calls reach the worker (A's `window.open` evaluate on O, one per round in `bg`, `fg`, `third`; B's own `evaluate "1"` in `third`; A's call on its popup) and says B's calls on the popup and on O are refused `TAB_HELD` by the daemon and print nothing. A's call on its popup is an `evaluate` of unique expression length in the slice (`1+0`, `1+0+0`, ...), made in every round whose popup opened, after B's held-call probe. The control holds when the after-leg capture holds more `[bridge] evaluate` pieces than the capture saved just before the leg; otherwise `console-join` and `console-url` print `unread`.
Also: the closing sentence "a piece such as `[bridge] evaluate` from the leg's own evaluate calls passes the clause" became "a piece such as `[bridge] evaluate` passes the clause", so it no longer repeats the dropped attribution wording. Row 2006 cell 4 ("A's call on its popup is `ok`") is unchanged: the note says it is an `evaluate`, and the cell does not repeat the changed words.

**MAJOR-B (precedence).** Added to the same sentence: "Every other clause is judged first: a STOP or a FAIL stands whatever the console reads; `unread` only turns a leg that would otherwise PASS into NOT MEASURED (a stated instrument limit); a round with `popup-opened=yes` and `granted-to=none` is a FAIL whatever the console reads."

**MINOR-C (capture window).**
Old: "judged over the whole capture saved right after the leg (from the slice's start), not over a before/after difference: a stricter window than the leg, so ..."
New: "judged over the whole capture as saved after the leg (the console's rendered rows, which may not reach back to the slice's start), not over a before/after difference, so ..."
Old: "The clause rests on a static fact: `extension/src/opener-join.ts` has no log call (".
New: "The content check is a backstop to the static fact that `extension/src/opener-join.ts` has no log call (".

Rows 2006-2008: no change.

## Outputs of the checks
- `node scripts/doc-check.mjs`: exit 0; reports the same three standing items (code counts 25/28/27; `CLAUDE.md:114  5596 passed`; `docs/plans/next-session-prompt.md:15`), "Checked 38 living docs".
- `git diff --numstat docs/e2e-test-plan.md`: `8	0	docs/e2e-test-plan.md`.

## 4. Deviations
None.

## 5. Proposed decisions
None.
