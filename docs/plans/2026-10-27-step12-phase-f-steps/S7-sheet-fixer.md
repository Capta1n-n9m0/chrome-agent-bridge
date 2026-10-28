# S7-sheet fixer, round 1 of 3

Claude Sonnet 5.5, medium effort. Role: fixer (`docs/agent-rules.md` §6). Docs only; lane was `docs/e2e-test-plan.md` §4.27
and this report. Nothing committed. Every added expected text is quoted from `git show HEAD:<path>` (HEAD `e7958eb`)
or a committed report; no run was made.

## 1. Verdict

DONE. Every finding is fixed except two parts, disputed or narrowed below (MINOR-7, and the CHOOSE-MCP half of MINOR-2).

## 2. Findings

| Finding | Status | Where in §4.27 |
|---|---|---|
| MAJOR-1 attach STOPs | Fixed | New paragraph "Banner rule and the line forms added by fix round 1" (before the Part B fixtures paragraph): a banner positive is a STOP only with `IDLE >= 20 000 ms` and a passing slice control, else NOT MEASURED; quotes `recipes/CLAUDE.md:159-161`. Every "counted by the keeper" clause is struck: STOP rule paragraph, R19-ARGS-3 (also waits for the idle after its CDP control), R19-CON-3, -4, -OWN, -JSOFF, R19-CHOOSE-2, -JSOFF now cite the rule. R19-BANNER-CTL is now per slice A, B, C (new in A and C in the slice lists). R19-KEEP-3 and R19-CHOOSE-DISARM drop the in-row banner STOP and mark `attach-after-disarm` / `attach-on-refused-page` NOT DISCRIMINATING there; R19-KEEP-1's banner clause is NOT DISCRIMINATING (`ROW … PASS banner-clause=NOT DISCRIMINATING`). The STOP-to-return list is updated. Open item 5 rewritten. |
| MAJOR-2 R19-ARGS-OLD | Fixed | A raw `client.call("evaluate", {expression: "(a) => a", args: 1, tab})` leg (form quoted from `mcp/test/s12-args-cross.test.ts:156`), `forwarded` now read from the answer (`ok` with `kind: "function"`), no counter. Line form (7) redefined. Hint quoted at `daemon/src/intercept.ts:41-42`. |
| MAJOR-3 R19-CON-FRAME | Fixed | Row rewritten as two legs: a same-site pair (`p.` / `f.s12site.localhost`; expects 2 then 13) and a cross-site pair (`localhost` / `127.0.0.1`; expects 2). Aligned with `Stage0-measurer1.md:48`; exercises S3a check 4 (same-site blocked frame). `a-nopattern entries=2` makes leg a's drop clause NOT DISCRIMINATING. Fixtures (`frame`, `frameoop`) and pattern text updated. Open item 4 corrected. |
| MAJOR-4 S3a handoff rows | Fixed | (i) R19-CON-FLOOR now has uncaught errors thrown each tick while disarmed (`exc-*` keys, form (10), `tick` fixture). (ii) R19-CON-NOTEA gains an `allowed` leg (`s12=noteaok`, entry present, `stack=0 url=0`), quoting the F1 test title. Chose the verifier's suggestion, as two rows' legs rather than new row ids. |
| MAJOR-5 capture across reloads | Fixed | New paragraph "Capture segments" (before Open items): save before each reload, reopen after, `console-<slice>-<k>.txt`, `CAPSEG` line, judged over all segments, control line in the last. The capture window is named as the one exception to the "no DevTools" wording; `DIALOGS` form (30), R19-RESTORE's order, R19-LOGS (`CONSOLE … segments=`) and the liveA19 sentence are aligned. Slices B, D, E mention it. |
| MINOR-1 R19-0 line order; D, E | Fixed | `LOADED` is the second line (after `MANIFEST`), buffered. liveD19 and liveE19 now run R19-0 in full on the current build first, so RESTORE has its reference. |
| MINOR-2 line forms | Fixed, one part disputed | CON form (8) gains `ordered`, `newest`, `marker`. CON-MCP and CHOOSE-1 get a `BANNERCALL` window (form (34)). CON-MCP names five existing tools (the sheet's choice, stated). KEEP-3 `next=TAB_GONE` is code-only, sourced at `daemon/src/intercept.ts:601`, `data` never printed. The args sentinel is defined in R19-LOGS. **Disputed:** R19-CHOOSE-MCP has no banner clause (checked the row text), so nothing was added there. |
| MINOR-3 fixtures | Fixed | `e2e-playground.html` is stated to gain `s12=` handling, `#tb`, `beat`, `clicks` (0 matches at HEAD); `none` and `single` gain a visible `#vis`; CHOOSE-4 names each leg's own page. |
| MINOR-4 closer proof | Fixed | New row-less probe R19-CLOSER (`CLOSERPROBE`, form (33)) in liveC19 right after R19-0 and the control, before CHOOSE-1 (which can raise a dialog if the interception fails). `opened=no` makes CHOOSE-4 and DISARM's second half NOT MEASURED instead of a misleading STOP. Open item 12 updated. |
| MINOR-5 CON-BANNER after leg | Fixed | The negative and after legs go to 20 000 ms (better than NOT MEASURED, since the sheet's own worst case is about 19 s). Open items 8 and the "where the control rows sit" bullet updated. |
| MINOR-6 S5c quoted | Fixed | R19-VERSION quotes `CHOOSER_RELOAD_HINT` (`daemon/src/intercept.ts:44-45`), its test, and the spec §10 S5c note from HEAD. Open item 6 closed; the provenance sentence says so. |
| MINOR-7 order of carried banner rows | Not changed | The verifier marked it for the session agent. R19-UP-6 and F-RAW* still sit before R19-KEEP-1, as #351's words ("after S4b") allow. |
| MINOR-8 KEEP-1 banner clause | Fixed | Marked NOT DISCRIMINATING (see MAJOR-1). |
| NIT-1 quotes | Fixed | Mangle-JSON text cites `Stage0.md:63`; `kind: "function"` cites `s12-args-cross.test.ts:176`; Note A cites the test's own title (`:157`); S3a checks cite `S3a-builder.md` §7. |
| NIT-2 line numbers | Fixed | `safety.ts` 204, 213, 215, 198; `intercept.ts` 41-42; cap test `:32` with the regex at `:10`. |
| NIT-3 ARGS-CSP discrimination | Fixed | Now: a build that does not pass `args` fails with `a` undefined (`PAGE_ERROR`). |
| NIT-4 CON-NAV | No change | The verifier accepted it as written. |

## 3. Exit checks

- `node scripts/doc-check.mjs`: exit 0 (same 4 dead paths for the S12 fixtures S7-helpers builds, and the same count drifts as before; none in this lane).
- `git diff --stat docs/e2e-test-plan.md`: `94 insertions(+)`, no deletions, one hunk; still one insertion between §4.26's end and `## 5.`.
- The file's CRLF line endings are kept.

## 4. Deviations, proposed decisions, handoff

- Deviation: R19-CON-NOTEA and R19-CON-FLOOR were extended in place rather than given new row ids (no row has run, R7.1 holds).
- Proposed decision (the verifier's, adopted): **2026-10-28 · Run 19's "attached" STOPs are judged on the banner only after a 20 s idle under a passing slice control** (Banner rule). By: Claude (proposed).
- Open for the session agent: Open item 5 (the NOT DISCRIMINATING gaps; agent-rules §3 item 9 is the step agent's to raise) and MINOR-7.
- Not verified by any run: that `p.` and `f.s12site.localhost` stay in one process and that `localhost` / `127.0.0.1` split them. The row says so and uses leg a's second read as the control.
- Next: a fresh verifier re-checks MAJOR-1 to 5 and MINOR-1 to 3 and 6.
