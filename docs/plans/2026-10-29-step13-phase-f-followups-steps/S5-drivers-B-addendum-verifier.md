# S5-drivers-B addendum (verifier)

Verdict: **PASS-with-fixes** (1 MAJOR, 3 MINOR, 1 NIT). Verifier: Claude Opus 5.5, medium. Read-only; nothing edited.

## Checks that hold
- Diff: `docs/e2e-test-plan.md` 8 added, 0 deleted (`git diff --stat`); the addendum sits after §4.28's last bullet (line 2002 on).
- The quoted POP lines equal the first rows' POP lines character for character: BG (§4.28 R20-POP-BG, line ~1966,
  with `console-new=0`), FG (no `console-new` key, as in the original), OTHER `third` and `human` (the original's `…` kept).
- Reader change (1) matches #404 and the original expected cell (B's call on the popup vs B's control call on O).
  Reader change (2) is form (3)'s own definition ("between the first popup's open and the last grant"), so it narrows
  nothing the sheet did not already say; it is #404's and no wider. Reader change (3) matches #404 ("if it can be made");
  the original row already places B's tab in W2, so this restores the sheet, and the fallback is the driver's existing
  `B_WINDOW_CHECK` (`recipes/s13-r20-a.ts:27`).
- No pass rule is re-tuned: no bound, count, leg or clause is loosened; attempt 3's `held-call=ok` / `console-new` 90–129
  are not made passing by any rule change, only by the readers #404 ruled.
- #403 (c) is carried explicitly; form (3)'s `n/a` note binds only no-grant legs and is carried by "the first row's".
- No local path, no user name. `node scripts/doc-check.mjs`: exit 0, only the two standing counts notes (tools/codes,
  `CLAUDE.md:110` test count); nothing from the addendum.

## Findings

**F1 MAJOR — R20-POP-OTHER-2's "Re-measures" cell misstates the first row's failure.** `docs/e2e-test-plan.md:2008`
says "FAIL on `held-call` and `console-new`; reader change only". The att3 record shows leg `human` failed on the lease
clause: `POP R20-POP-OTHER leg=human n=3 granted-to=none in-ms=n/a … console-new=0` / `LEG R20-POP-OTHER human FAIL`
(`S13-live-record-liveA20-att3.txt:55-56`; also `S5-liveA20.md` §6 item 1). No reader change touches that clause, so the
cell is false for `human` and the gate (G1.4 "judged on both sets", #404) would read it. Same error in #404's own text
("In every leg the lease clause held") — for the session agent to note at the gate; not this slice's lane.
Fix, the cell should read: `R20-POP-OTHER-2 ★ (re-measures **R20-POP-OTHER**: leg `third` FAIL on `held-call` and
`console-new`, leg `human` FAIL on `granted-to=none`; reader change only)`.

**F2 MINOR — the -2 id is stated for BG only.** Line 2006 says "(printed with the id `R20-POP-BG-2`)"; the FG-2 (2007)
and OTHER-2 (2008) cells do not, and reader (3)'s fallback line keeps the old id `CHECK R20-POP-OTHER third b-window=W
(sheet: W2)` (line 2002). §4.28's forms put the row id in `<row>` (`POP <row> …`, `ROW <id>`), so a driver could print
`POP R20-POP-FG …` / `ROW R20-POP-FG …` in liveB20, indistinguishable by id from the judged slice-A rows. Fix: append
"(printed with the id `R20-POP-FG-2`)" and "(printed with the id `R20-POP-OTHER-2`)" to those Expected cells, and in
line 2002 write `CHECK R20-POP-OTHER-2 third b-window=W (sheet: W2)` (or state once in the paragraph: "every `POP`,
`ANSWER`, `LEG`, `CHECK` and `ROW` line of these rows carries the `-2` id").

**F3 MINOR — the Expected and Pass cells quote part of the original and paraphrase the rest.** The brief asks for the
first rows' text copied unchanged. The BG-2 Expected cell quotes only the POP line, dropping "B's call (`evaluate "1"`)
on A's popup handle answers `TAB_HELD`, equal in code and message to B's control call on A's O handle …; A's call on its
popup is `ok`; `ANSWER` for each" — the very clause reader (1) now reads. The Pass cells restate a chosen subset (BG-2:
"3 of 3 rounds; the STOP `popup-lease-wrong` binds"; it omits the 1 000 ms bound, exactly one `leaseGranted
{reason: "opener"}`, `others=0`, the `fg`-round NOT DISCRIMINATING rule and granted-to-none = FAIL). "As …, unchanged"
keeps them binding by reference, so nothing is altered, but a partial quote invites reading it as the whole. Fix
(either): (a) make each cell a pure reference — Expected: "As R20-POP-BG's Expected text cell, whole and unchanged
(§4.28 above), printed with the id `R20-POP-BG-2`"; Pass: "As R20-POP-BG's Pass rule cell, whole and unchanged (§4.28
above), with #403 (c)"; same for FG/OTHER (OTHER adds "each leg; `unjoined` NOT MEASURED as there") — or (b) paste the
three original cells verbatim.

**F4 MINOR — the place in liveB20 is ambiguous against `CLOSERPROBE`.** Line 2002 says "between R20-0B and
R20-CHOOSE-TWICE"; liveB20's order (§4.28 liveB20 row, line ~1980, and bullet ~1997) has the row-less `CLOSERPROBE`
between those two. Fix: "after R20-0B and before the row-less `CLOSERPROBE`" (or "after `CLOSERPROBE`"), one of them.

**F5 NIT — "the round's `ANSWER` control" can be read as the control call (B on O).** The parenthesis clarifies it;
clearer: "`held-call` is the `ANSWER` line's code for B's call on the popup handle (equal to its `control=` code)".

## R5.1
The text is uncommitted and no liveB20 observation exists, so it can still be fixed before it runs; F1–F4 should be
applied (a re-verify of only these cells suffices) before liveB20 starts.
