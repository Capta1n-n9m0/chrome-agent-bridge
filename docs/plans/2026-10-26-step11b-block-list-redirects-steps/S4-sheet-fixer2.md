# S4-sheet fixer report, round 2

Model and effort: Sonnet 5.5, medium. Role: fixer. Lane: `docs/e2e-test-plan.md` §4.24 only. Findings: `S4-sheet-verifier2.md`.

## Verdict
DONE. No finding disputed. K17 table untouched.

## Fixes (all in §4.24)
- **N1:** RD-0's fallback now prints `FALLBACK: console eval unavailable`, and the row says this line is not a STOP.
- **N2:** RD-6 names a new `Open-S11bWindow` (admits 8083 and 8081 only; `Open-S11Window` stays untouched). RD-5 names a new `B17 stored` (count and in-process hash read-back, prints only a `STORED` verdict). Both are in the S4-helpers list (items 2 and 6).
- **N3:** (a) "d as defined below"; (b) RD-CAPS-WARN uses `<bl+2>`, `<bl+3>` with `bl` from RD-0 (c); (c) `countRules(…).rules` in RD-5b and RD-DISARM; (d) the heading is quoted as `Chrome Agent Bridge`; (e) RD-REGEX says the typed expression evaluates to `undefined`, so no regex is echoed.
- **F11 note:** the delayed redirector is now a new `s11b-delay (.py)` on 8086. The fixtures table, the lane sentence ("no exception") and helper item 4 now say `recipes/s9-redirect.py` is not changed.

## Checks
- `node scripts/doc-check.mjs` exit 0; last line: `Checked 36 living docs (5 closed phase docs skipped for paths and status).` Its findings are the pre-existing ones outside the slice.
- No test pattern, real site, user path or token added.

## Deviations / proposed decisions
None.
