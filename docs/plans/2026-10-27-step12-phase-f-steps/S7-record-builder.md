# S7-record builder report

Claude Sonnet 5.5, effort medium. Docs only; no code, no live run, no agent spawned, nothing committed.

## 1. Verdict
**DONE.**

## 2. Outputs
- `docs/plans/2026-10-27-step12-phase-f-steps/S7-run-record.md` (287 lines; sections 1-7 in `S1-run-record.md`'s form).
- `docs/e2e-test-plan.md` §5: the entry `### Run 19 (S7) …` after Run 18's, before `## 6. Exit criteria` (84 lines).
- This report. Command evidence: `grep`/`sed`/`node` reads of the evidence, console and ledger files; `git log --format='%h %cI %s' -- docs/e2e-test-plan.md`; `git diff ed6abbc HEAD -- docs/e2e-test-plan.md` (17 added lines, #366 only); `node scripts/doc-check.mjs` (its six "counts that differ" and the word budget are pre-existing; none names the new text).

## Verdict totals
The §4.27 tables hold **58 row ids** (the brief said 56; R19-CLOSER is row-less and judged from `CLOSERPROBE`).
- **Row level:** PASS 42, FAIL 4, NOT DISCRIMINATING 6, NOT MEASURED 3, RECORD 3, NOT RUN 0.
- **Slice-row level (74):** PASS 58, FAIL 4, ND 6, NOT MEASURED 3, RECORD 3. Per slice: A 26 (21/2 FAIL/3 ND), B 19 (15 PASS, 3 NM, 1 RECORD), C 21 (16, 2 FAIL, 1 ND, 2 RECORD), D 4 (3, 1 ND), E 4 (3, 1 ND).

## FAIL / ND / NOT MEASURED by row (one-line cause)
- **FAIL R19-ARGS-1:** SDK `value-equal=4` (A3E:150); Chrome's `returnByValue` sorts keys of the returned value (Stage 0), the page received all values (`json-equal` 5/5); pre-existing; FAIL stands by the clause "0 of the 5 differing in key order" (finding 1).
- **FAIL R19-CON-NOTEA:** replayed console args carry no preview, so an object holding an Error logs as `Object`, message lost (A3E:406); no URL or stack leaks (finding 2).
- **FAIL R19-CHOOSE-KEPT:** second call `change` stayed 1 (CE:247-248); cause not established.
- **FAIL R19-G2-1:** B timed out at 35 s (CE:440); covered-window hang fits, not shown; cause not established.
- **ND R19-ARGS-3 (MCP leg):** reader tests for the extension's message; the MCP sends the SDK's own line.
- **ND R19-CON-4 (MCP leg):** same cause (`DISARMED:` line lacks the extension's wording).
- **ND R19-ARGS-OLD:** MCP code clause (the rethrown `VERSION` has no code on line 1; `mcpCodeOf` reads `ERROR`); the raw `forwarded=no` clause is ND by #365.
- **ND R19-VERSION (MCP leg):** same as ARGS-OLD.
- **ND R19-CON-FLOOR:** floor held (0 of 2, 0 of 1 disarmed items in the reply), but `disarmed-ticks=2`, `exc-disarmed=1` against the `>= 3` precondition: the driver waited 3 s, #361's dated note says 5 s. The rule names no meaning for a short window, so a helper/sheet check shown wrong.
- **ND R19-CHOOSE-REFUSE (leg dis):** `click()` on a disabled input does nothing (#370).
- **NOT MEASURED R19-UP-DEVT, R19-KEEP-4, R19-SWEEP-HELD:** `DEVPROBE answer=ok attached=no` (B3E:137); docked DevTools on Chrome 156 did not make `chrome.debugger` refuse (#369, open for the user). Attempt 2 read the same verdict for a different reason (DevTools never opened); both readings are in the record.
- RECORD: R19-DEVT-NOFLAG, R19-CHOOSE-FRAME, R19-CHOOSE-HUMAN.
- Clause-level ND (rows still PASS): KEEP-1 banner, KEEP-3 and CHOOSE-DISARM attach-after-disarm, G2-2 interleaving; CHOOSE-2 leg (c) NOT RUN and KEEP-3 `replace` not run, as the sheet says.

## Exit checks
R7.1 met (`ed6abbc` 2026-10-28T22:04:50Z vs the first evidence line A1E:1 22:07:34Z; only #366's note, additions, after observation). R7.2 met (the exact LOADED line at line 107 of all five slices). R7.3 met (one verdict per feature row; CHOOSE-4 `after-click=1` ×3, CE:332/336/340). R7.4 met (five slices equal by count and hash; D and E end on the current build). R7.5 met (five LOGS PASS; `profile-other=0`; control line in each last segment). R7.6 met (four STOP events, each with one RETURN and one ledger return).

## 4. Deviations
- 58 ids instead of 56 (counted in the table).
- Aliases cite the evidence files (the superset), as the investigator did, for all slices.

## 5. Proposed decisions
In the record's section 6 (agent-rules §5 form, "By: Claude (proposed)"): the ARGS-1 key-order reading (user review); a live-log leg for CON-NOTEA; a recipes-only re-run of the ND and cause-unknown rows as new rows; the DevTools premise (open under #369) and the banner findings marked "not reproduced at 20 s idle"; gotchas for the package CLAUDE.md files (replay has no preview; `value` keys sorted; MCP text carries no code for non-safety, non-attach errors).

## Judgment calls (record section 7)
1. ARGS-1 FAIL by the clause as written; the receive-side reading (SDK `value-equal` ND) is listed for the user.
2. The MCP legs of ARGS-3 and CON-4 are ND; the MCP's refusal itself is not shown by a print (only the unmoved effect counter).
3. CON-FLOOR ND, not FAIL, never PASS; the row text (3 s) and #361's note (5 s) disagree and the driver followed the row text.
4. KEEP-1 PASS despite `poll-ms=280` (expected line says `<=250`): no pass-rule clause reads it and the only clause it touches is the banner clause, ND by the sheet.
5. G2-2 PASS on its printed counts; the sheet's `gap-ms` clause (i) is not printed in the `G2TYPE` form.
6. Row-level ND where any leg is ND and every other clause passes; the printed `ROW … FAIL` words for six rows yield to the counts.
7. The actors file (outside the repo) was not read; the investigator's cited lines were re-read in the evidence and code before use.

## 7. Handoff
The session agent decides section 6 and the findings; the record and the §5 entry are uncommitted. Nothing left running.
