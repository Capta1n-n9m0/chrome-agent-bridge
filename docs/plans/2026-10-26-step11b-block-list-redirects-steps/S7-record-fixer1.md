# S7-record fixer 1

Model: Claude Sonnet 5.5, effort medium. Role: fixer (agent-rules §6). Docs only; no commit, no live run.

## 1. Verdict
DONE. Every finding fixed; none disputed.

## 2. Outputs
Edited: `S7-run-record.md` and the Run 17b (S7) entry in `docs/e2e-test-plan.md` §5 (still one hunk, 72 added lines,
`git diff --stat`). Nothing else touched (the builder report `S7-record-builder.md` still carries the old 19/2/6/1 counts
and a "Not met: ... #314" line; it is outside my lane).

Recount by listing ids (28 rows):
- PASS 16: R17B-0, CTL, ACT-CTL, RD-2, NEWTAB-PLAIN, NEWTAB-LOAD, BACK, FWD, BACK-SAMEDOC, DISARM, BACK-EMPTY, RD-DL-SOCKET, UP-7, F-RAW-ENC, F-RAW-OK, RESTORE.
- RECORD 2: BACK-NOACT, NEWTAB-REFUSED.
- FAIL 7: UP-L1, UP-OPT, UP-6, F-RAW, F-RAW-2, F-RAW-DIR, UP-RACE-A.
- NOT MEASURED 3: UP-DEVT, SAVE-REFUSE, LOGS.
- 16 + 2 + 7 + 3 = 28. Same as the verifier's.

## 3. Per finding
- M1: R17B-LOGS NOT MEASURED (the rule needs R17B-DISARM's disarm line in the capture, liveA's is not retained; a helper verdict is not on the §4.24 evidence list); R17B-UP-L1 FAIL per the sheet; R17B-SAVE-REFUSE NOT MEASURED on the console clause; D7.6 not met. Updated in the row table, counts, D7 table, §6 (now states the alternative reading, 19/2/6/1, only as a ruling for the session agent to take, not the default), and the §5 code block, Causes, Open items, D7 table and Differences paragraph.
- M2: "stable lag" and "not a Step 11b effect" removed everywhere (rows, finding 6, §5 Causes). Restated: O2 did not show the saved text within 5 000 ms; whether it ever showed it is not measured (6 s poll bound, `o2Eq` not recorded; 6105 ms and Run 16's 6061 ms both sit past the bound).
- m1: UP-OPT row and finding 7 now say every text clause before the O2 bound held (`judgeUpOpt` order) and the `standing x0, invalid items 2` line is Run 16's helper text; "unexplained" and "other clauses not shown" removed.
- m2: SAVE-REFUSE helper-label cause corrected to the one-token `VERDICT_LINE` (`recipes/s11b-r17b-rules.ts:152`); finding 7 updated.
- m3: UP-6 states the measured fact (banner seen on the two no-call SDK-preflight legs), cause not established; F-RAW says the legs do send a raw call, so the argument does not carry over; finding 4 and §5 Causes match.
- m4: D7.4 met. I read `%TEMP%\bridge-e2e\s11b-r17b-2\r17b-framing.txt` (lines 71-79) and confirmed: `HIST bk built=2 pages activated=2` / `ACT bk n=2 ok`; `HISTORY fwd built navigations=3 backs=2`, `HIST fw built=3 pages activated=3` / `ACT fw n=3 ok`; `HIST sd built=2 pages activated=2` / `ACT sd n=2 ok`. Cited by the unexpanded path; marked not committed.
- N1: the LOGS row now prints `localhost:8085=0` as the record reads, with a note on omitted probes.
- N2: the DISARM row says it is judged on the four clauses listed after "unchanged:", not the console line.
- N3: #314 is not mentioned in either file in my lane (only in the builder report); nothing to change here. The session agent should read it as not measured, not "not met".
- N4: UP-DEVT now says only that control 1 answered `ok` (DevTools not attached, possibly opened without attaching); cause not established.

## 4. Checks
`node scripts/doc-check.mjs`: "Checked 37 living docs (5 closed phase docs skipped for paths and status)"; only the existing
note (`CLAUDE.md:112 4535 passed`). Scan of S7-run-record.md for `http(s)://`, `appdata`, user-profile path: no match. The
only path text is the `%TEMP%`-relative framing file. No token, block-list pattern or real URL added.

## 5. Handoff
For the fresh verifier: re-check M1/M2 consistency across both files (counts 16/2/7/3, D7.6 not met), and the stale 19/2/6/1 in
`S7-record-builder.md` (not mine to edit). Files keep CRLF line endings. Nothing running.
