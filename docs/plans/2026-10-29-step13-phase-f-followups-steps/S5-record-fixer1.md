# S5-record-fixer1: fixes to Run 20's record

Claude Sonnet 5.5, medium. Docs only; nothing run live, no agent spawned, no commit. Lane: `S5-run-record.md` and the Run 20
entry in `docs/e2e-test-plan.md` §5.

## Findings fixed (none disputed)

- **MINOR 1 (R20-ARGS-ORDER).** Printed RECORD kept in the count. Record: table cell (1a) now reads "RECORD (as printed;
  §4.28:1970's pass rule and #401 give PASS: open for the user)"; "safer reading" removed from conflict 1, which now says "As
  printed: RECORD; by the pass rule and #401: PASS"; an "Alternative tally" paragraph after 1d (PASS 21, RECORD 1; 21+8+1+3+1+0 =
  34); the row added to "Held or open for the user". §5 entry: RECORD line of the summary block, the notes paragraph, and the
  "Open for the user" line.
- **MINOR 2.** §5 entry now says attempt 1 stopped on setup the helpers had dropped and attempt 2 on the options window read as
  off its page (A2:220).
- **MINOR 3.** Record: "Gate consequence" paragraph after the gate table (section 2) and a bullet in section 7; §5 entry: a
  "Gate." paragraph and a line in the summary block. Both name the STOP rule, R5.5 in slice B (#417) and the three R20-RESTORE
  FAILs on the DIALOGS clause.
- **NIT 1.** §5 check table: "the LOADED20 line proves the loaded build".
- **NIT 2.** Record R20-ARGS-OLD note: the loaded manifest stays HEAD's because the swap does not replace
  `extension/manifest.json`; the sheet's parenthetical was wrong.
- **NIT 3.** Conflict 4 now cites `S5-liveB20-verifier1.md` §7 Handoff, line 213.
- **NIT 4.** "ND" spelled out: record header note before the tallies; §5 entry "(R19: FAIL or NOT DISCRIMINATING)". The record's
  section 5 table still uses "ND" in cells, covered by the note.
- **NIT 5.** One sentence in the R20-RESTORE note (record) and one in the §5 notes paragraph: `RESTORED: …` is not printed in any
  slice, no verdict changes.

## Checks

Counts unchanged and consistent between the two files: 34 = PASS 20, FAIL 8, NOT MEASURED 1, NOT RUN 3, RECORD 2,
NOT DISCRIMINATING 0 (as printed PASS 23, FAIL 5). `node scripts/doc-check.mjs`: see the return note. Private-text grep on both
outputs: see the return note.
