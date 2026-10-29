# S5-drivers-B addendum (verifier, round 2)

Verdict: **FAIL-needs-ruling** (F1–F5 fixed as claimed; 1 new MAJOR the copy exposes, 1 NIT). Verifier: Claude Opus 5.5,
medium. Read-only; nothing in the main tree edited.

## F1–F5 re-checked
- **F1 fixed.** The R20-POP-OTHER-2 first cell reads "leg `third` FAIL on `held-call` and `console-new`, leg `human` FAIL
  on `granted-to=none`", which matches `S13-live-record-liveA20-att3.txt:53-56`. #404's own "In every leg the lease
  clause held" is still wrong for `human` (`granted-to=none`); that is for the session agent at the gate, not this lane.
- **F2 fixed.** Each -2 row names its `-2` id for ROW, LEG, POP, ANSWER and CHECK lines; the fallback is
  `CHECK R20-POP-OTHER-2 third b-window=W (sheet: W2)` in both the paragraph and the OTHER-2 cells.
- **F3 fixed, proven by script.** The scratch script `cmp.py` splits each row into cells and cuts each -2 cell at
  " **Differences from the first row, and only these:**". For all six cells (Expected and Pass of BG, FG and OTHER), the
  prefix equals the original cell byte for byte (`True`; original lengths 379/805, 214/543, 192/1064). Each -2 cell holds
  exactly one appended Differences sentence, and nothing else differs.
- **F4 fixed.** "after R20-0B and before the row-less `CLOSERPROBE`", stated twice in the paragraph, consistently.
- **F5 fixed in the paragraph only.** Reader (1) now reads "the `ANSWER` line's code for B's call on the popup handle
  (equal to its `control=` code)". **NIT:** the R20-POP-BG-2 Steps cell still says "`held-call` read from each round's
  `ANSWER` control", the old wording that can be read as the control call. FG-2 and OTHER-2 say "the same two reader
  changes", but the Differences sentences say "the three of decision #404". Reader (3) is OTHER-only, so the wording is
  loose but not wrong.
- Diff: `git diff --numstat` gives 8 added, 0 deleted. `node scripts/doc-check.mjs` shows only the two standing notes
  (counts; `CLAUDE.md:110` test count), nothing new. No local path or user name in the diff.

## New finding

**N1 MAJOR: the copied Expected text and reader (1) disagree, and the copied text cannot pass on this daemon.**
Reader (1) and #404 take `held-call` from codes only, "the `ANSWER` control". The copied R20-POP-BG Expected cell, which
OTHER inherits through "as above" and the BG Pass rule, requires B's popup call to be "`TAB_HELD`, **equal in code and
message** to B's control call on A's O handle". The old reader enforced exactly that (`recipes/s13-r20-a.ts:113`,
`controlSame = … code === … && message === …`; `judgePop` requires `r.controlSame`). That message clause is why
liveA20 printed `held-call=ok` while every `ANSWER` line read `TAB_HELD control=TAB_HELD`. So the "reader defect" #404
names is not a reader defect: the reader followed the sheet. The daemon's message cannot meet the clause.
`daemon/src/intercept.ts:609-613` builds it as ``tab ${handle} is held by … since ${hhmmss(c.since)} …``. That message
names the handle (the popup's vs O's) and the lease time, which always differ between the two calls.

Under §4 precedence, the pre-registered Expected and Pass text wins over the reader. A driver that follows the copied
text must compare the messages, and every -2 round then fails again by construction. A driver that follows reader (1)
breaks the "copied unchanged" text. The Pass cells alone say only "B's call on the popup is `TAB_HELD`" (a code), so the
row now contradicts itself.

This needs a ruling before liveB20, not a fixer. Options:
- (a) A dated pre-observation note: the -2 rows compare the code and the message with the handle and the `since` time
  masked. This keeps the intent, "the control makes the comparison independent of its wording". It is a change to the
  expected text, so it amends #404's "same expected text".
- (b) Code-only, as #404 and reader (1) say, with the message clause struck for the -2 rows and stated as such. This
  loosens a clause, which needs a decision.
- (c) Keep the clause and accept that the rows will FAIL.

The record shows that the first rows' `held-call` FAIL came from the clause, not from the reader, and #404's diagnosis
should say so at the gate.

## R5.1
The text is uncommitted and no liveB20 observation exists. N1 can still be settled and written before the rows run.
Until it is settled, the -2 rows are not ready to run.
