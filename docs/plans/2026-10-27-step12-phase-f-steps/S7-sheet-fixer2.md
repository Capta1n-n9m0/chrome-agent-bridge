# S7-sheet fixer 2: fix round 2 of 3 (`docs/e2e-test-plan.md` §4.27)

Claude Sonnet 5.5, medium. Role: fixer (`docs/agent-rules.md` §6). Edited only §4.27 and this report. No row ran.

| Finding | Result | Where in §4.27 |
|---|---|---|
| MINOR-A (allowed NOTEA leg can fail a correct build) | Fixed | Fixture `noteaok`: message is exactly `s12-noteaok` (cites `S3a.md:66-68`), then one plain `console.log` of `SENTINEL`. R19-CON-NOTEA allowed leg now `entries=2 console=2`, `marker=1`. `entries=1 marker=0` is RECORD (a V8 cut cannot be told from a build that drops Error objects), clause NOT DISCRIMINATING. `entries=0` is a FAIL. |
| MINOR-B (closer before the first chooser call) | Fixed | liveB19 runs the row-less `CLOSERPROBE` right after `DEVPROBE`, before any row (KEEP-2's ctl leg is the slice's one `chooser: true` call). R19-CLOSER's slice column now names B and C. Open item 12 names liveB19 as well. |
| MINOR-C (R7.6 map) | Fixed | `dialog-left-open` list gains R19-CLOSER. `chooser-interception-left-on` dropped from the map and from form (31); CHOOSE-4 and -DISARM keep `dialog-not-opened`, which already means "the interception is still on". |
| MINOR-D (two `ROW R19-0` per slice) | Fixed | Fix-round-2 paragraph (b): a re-run prints only `LOADED rerun=<k> …`, no `ROW`, no preflight lines. Form (1) gains optional `rerun=<k>`. liveB19, liveD19, liveE19 say so. |
| MINOR-E (three IDLE definitions) | Fixed | Fix-round-2 paragraph (a): one IDLE (the Banner rule's: since the last reply of any call except `snapshot`, `listTabs`, `daemon.status`). No CDP-call list is invented; the superset counts every call that can attach, citing phase doc § 0.6 ("the first CDP call attaches, later calls reuse it"; "`withDebugger` and every caller … go through it"). BANNER-CTL, UP-6, F-RAW and ARGS-3 now point to it. |
| NIT-A (reopen capture before the re-run) | Fixed | Capture segments paragraph, liveD19, liveB19 text. |
| NIT-B (args sentinel name) | Fixed | R19-ARGS-1: "the args sentinel of that test, not `s12-console.js`'s `SENTINEL`" (value not written); "The args sentinel is counted…". |
| NIT-C (Open item 5) | Fixed | The step agent raises it "unconditionally, under agent-rules §3 item 9 … and reports it upward". |
| NIT-D (absent CON keys) | Fixed | Fix-round-2 paragraph (c): a key left out of an expected `CON` line means "not judged". |

No finding disputed. Not touched: the CON-FLOOR `:215` residual (the verifier's NIT-1 residual, called trivial; not among the nine).

Exit checks: `node scripts/doc-check.mjs` exit 0 (same 4 dead S12-fixture paths and count drifts as before); `git diff --stat docs/e2e-test-plan.md` is `94 insertions(+)`, one hunk `@@ -1767,0 +1768,94 @@`, before `## 5.`. Nothing committed.
