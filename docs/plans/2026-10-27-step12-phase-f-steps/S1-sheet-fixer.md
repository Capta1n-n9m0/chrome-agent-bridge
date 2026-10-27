# S1-sheet fixer, round 1 (Sonnet, medium). Lane: docs/e2e-test-plan.md §4.26 only.

- X1 fixed: line 1740 (decision paragraph) and 1748 (control row), 1750 (R18-UP-6), 1752 (F-RAW): banner clause judged on the row's own slice's control; the run-wide rule is applied by S1-record.
- X2 fixed: 1740, 1750, 1752: the 15 s idle stays a step; `IDLE` < 15 000 ms is a helper STOP before the row's first call, no new NOT MEASURED clause.
- M1 fixed: R18-UP-L1 "Changes named" cell (narrowing to liveA's R18-LOGS, the two citations; "no data").
- M2 fixed: R18-LOGS change cell names UP-LOGS (1538) as base, RD-LOGS probes as Run 17 additions, `other 0` still catches URLs.
- M3 fixed: `invalid items <fi+3>` in the R18-UP-OPT cell and line form (6).
- M4 fixed: STOP limited to a file from `<OUTSIDE>` or outside ROOT; in-ROOT reporter file is a FAIL, not a STOP.
- M5 fixed: moved to the STOP paragraph as the sheet's own guard; the UP-DEVT cell points to it.
- M6 fixed: `data=<none|keys:<k1,k2>>`.
- N1 fixed (restored "per step:"). N5, N9 fixed. N6 fixed (header lists all four commands). N7 fixed (invariant added to STOP list).
- N2, N3, N4 skipped: sourced, harmless, and verifier called them so; N4 is now also stated in the row's change cell. N8 skipped: builder report is outside my lane.

doc-check: `Checked 38 living docs (5 closed phase docs skipped for paths and status).` (exit with only the known `CLAUDE.md:108  4665 passed` count note).
§4.26 now spans lines 1722–1766 (next heading, §5, at 1768); no other section touched.
