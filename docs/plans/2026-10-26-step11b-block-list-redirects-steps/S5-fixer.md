# S5-fixer

Sonnet, medium. Docs only. All seven findings fixed, none disputed. `node scripts/doc-check.mjs` exit 0, last line
`Checked 36 living docs (5 closed phase docs skipped for paths and status).` Changed lines about 64 plus the
70-line proposals file.

- MINOR 1: `S4-run-record.md:12` now names "the RD-FWD row, attempt 6A's row and the STOP-rules row" instead of line numbers.
- MINOR 2: `progress-and-roadmap.md` (Step 11b paragraph, ~line 830): "D4.3 is part (RD-2's leak; the user rules which reading holds) and D4.6 is not met (#309)".
- MINOR 3: `setup.md` (~line 975): added `*Superseded 2026-10-27: was "A redirect hop is still requested …", because Step 11b built the rule*`.
- MINOR 4: `progress-and-roadmap.md` Known-limitations marker (~697) rewritten to "was X, because Y"; Phase E line (~800): "Not built" now lists only the allow-list mode, with a Superseded marker for the redirect item and `newTab` uncovered (#295).
- NIT 1: `setup.md` "just before or during a call (RD-5, RD-5b)".
- NIT 2: `setup.md` "with the pattern removed" (RD-4). The optional #293 citation was not added.
- NIT 5: `S5-claude-md-proposals.md` (a): "before: 1" now attached per row (`navigate` SAFE-5b, `downloadStart` R14-5c); the `res.url` post-check fact is flagged to keep (rule 7) or move to the handler CLAUDE.md.
- NIT 3, NIT 4: left as instructed.
