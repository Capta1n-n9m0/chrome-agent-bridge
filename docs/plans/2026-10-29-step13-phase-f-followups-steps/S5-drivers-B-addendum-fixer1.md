# S5-drivers-B addendum (fixer, round 1)

Fixer: Claude Sonnet 5.5, medium. Edited only the added addendum lines of `docs/e2e-test-plan.md`; `git diff --numstat` is 8 added, 0 deleted. `node scripts/doc-check.mjs`: only the standing test-count note.

- F1: the R20-POP-OTHER-2 first cell now reads "leg `third` FAIL on `held-call` and `console-new`, leg `human` FAIL on `granted-to=none`; reader change only".
- F2: each -2 row's cells name the `-2` id for every ROW, LEG, POP, ANSWER and CHECK line; the OTHER-2 fallback is `CHECK R20-POP-OTHER-2 third b-window=W (sheet: W2)` (also in the paragraph).
- F3: Expected text and Pass rule cells of the three -2 rows are the original cells pasted byte for byte (built by script from the R20-POP-BG/-FG/-OTHER rows), plus one sentence naming the only differences (the id and the #404 readers).
- F4: paragraph now says "after R20-0B and before the row-less `CLOSERPROBE`" (twice, in both places the position was stated).
- F5: reader (1) reads "`held-call` is the `ANSWER` line's code for B's call on the popup handle (equal to its `control=` code)".
