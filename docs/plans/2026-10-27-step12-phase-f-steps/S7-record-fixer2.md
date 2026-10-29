# S7-record fixer round 2 (docs)

Fixed the findings of `S7-record-verifier2.md`; nothing else touched.

- **MINOR-A:** `S7-record-verifier.md` line 38. Both spelled-out name patterns in the grep list are now `the user's name`
  (`-i the user's name` twice); the rest of the sentence is unchanged.
- **NIT-A:** `S7-run-record.md` lines 61 and 66. `sdk/error.ts` is now `sdk/src/error.ts` (0 old spellings left, 4 new
  occurrences).
- **NIT-B:** `docs/e2e-test-plan.md` line 3537 (Run 19 entry, summary code block). The CON-FLOOR wording now reads: the
  driver's waits, 3 s and 2.5 s, were shorter than #361's amended 5 s and 3.5 s; the instrument at fault. This matches the
  prose at lines ~3571-3573.
- **NIT-C:** not fixed, as instructed (the builder's report is historical; this report holds the new totals, which are
  unchanged because no row or count moved).

## Grep counts (`grep -c -i`, user's name and its path spelling, per file)

| File | Count |
|---|---|
| S7-record-builder.md | 0 |
| S7-record-fixer.md | 0 |
| S7-record-investigator.md | 0 |
| S7-record-verifier.md | 0 |
| S7-record-verifier2.md | 0 |
| S7-run-record.md | 0 |

All 0. (This file is clean as well; the name was never written.)
