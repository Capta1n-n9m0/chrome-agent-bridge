# closeout-claudemd - fixer round 1

Claude Sonnet 5.5, medium. Nothing committed. All six findings fixed; none disputed. (Package CLAUDE.md files are LF, not CRLF.)

- F1 fixed, extension/CLAUDE.md:~156: "The 25 s keepalive alarm rarely lets the worker idle out, so the write-through insures ..."
- F3 fixed, extension/CLAUDE.md:23: "holds a `tabCreated` that carries Chrome's `openerTabId` up to `OPENER_JOIN_HOLD_MS` = 250 ms"; paid for by "events meanwhile" (was "for up to 250 ms").
- F6 fixed, extension/CLAUDE.md:~26-29: the webNavigation permission (#374), no new install warning (#393), manifest.test.ts and the s3a-dnr-wiring pin moved into the opener-join.ts entry; safety-dnr.ts entry now ends at its own permission.
- F4 fixed, extension/src/CLAUDE.md:53: clause "which is Chrome's unchanged-selection rule" dropped; the recorded facts stay.
- F5 fixed, extension/src/evaluate/CLAUDE.md:32: "Limits left (`docs/plans/2026-10-29-step13-phase-f-followups-steps/S2.md`)".
- F2 fixed in part, daemon/CLAUDE.md:~85: "(R15-POP-2 (a); decisions.md · 2026-10-25 · S7: Run 15 stands as recorded; its follow-ups (#226))". The extension/CLAUDE.md descriptions were not restored (no word budget).

Words: extension/CLAUDE.md 3497, daemon 1923, extension/src 1071, evaluate 497. doc-check exit 0, no over-budget, only the three pre-existing findings (output: closeout-claudemd-fixer1-doccheck.txt).
