# S7-record verifier 2 (after fix round 1)

Model: Claude Opus 5.5, effort medium. Role: verifier (agent-rules §6), docs stage. Read and ran only; the one file
written is this report. No live run; the daemon was not touched.

## 1. Verdict
**PASS-with-notes.** All ten findings (M1, M2, m1-m4, N1-N4) are resolved; the fixer disputed none. Counts are 16/2/7/3
everywhere. One MINOR note introduced by the fix (n1: the §5 "Differences" paragraph) and one NIT (n2).

## 2. Checks run
- `node scripts/doc-check.mjs`: exit 0, "Checked 37 living docs (5 closed phase docs skipped …)"; the only note is the
  existing `CLAUDE.md:112 4535 passed`.
- `git diff HEAD --stat`: `docs/e2e-test-plan.md | 72 +`, one hunk (`@@ -3147,6 +3147,78 @@`, the Run 17b (S7) entry after
  Run 17's last paragraph, before `## 6. Exit criteria`). `git status --short`: that file plus the four untracked
  steps-dir files (builder, fixer1, verifier, run-record). `git diff 3cfbb95 HEAD --stat -- docs/e2e-test-plan.md` is
  empty, so §4.25 is unchanged. The lane holds.
- Forbidden content: the token from `bridge.token` occurs 0 times in `S7-run-record.md`, `S7-record-fixer1.md` and the
  added hunk. A scan for `http(s)://`, `appdata`, an expanded user-profile path, `bank.example`, `alias7`, `sentinel` and
  `chrome-extension:` finds nothing in the record or the hunk (the fixer report's one hit is its own description of the
  scan). The framing file is cited only as `%TEMP%\bridge-e2e\s11b-r17b-2\r17b-framing.txt`.
- Stale phrases: `stable lag`, `not a Step 11b`, `unexplained`, `wrong id`, `whatever else`, `matches Run 16`, `314`:
  0 hits in the record and in the hunk.

## 3. Findings re-checked

| Finding | Status | Evidence |
|---|---|---|
| M1 | resolved | `S7-run-record.md:45` LOGS NOT MEASURED, on the §4.25 rule and the §4.24 evidence list; `:19` UP-L1 FAIL by the sheet's tie to R17B-LOGS; `:36` SAVE-REFUSE NOT MEASURED on the console clause; `:71` D7.6 not met; `:111` gives the alternative reading (19/2/6/1, D7.6 met) only as a proposed ruling for user review. §5 code block, Causes, Open items and D7.6 row match. Re-derived: liveB's control is in CON:643-649 and 700-709 (I read the lines); liveA's is not retained; R2A:297 and :558 are the two OFF titles (I read them), so the citation is right and they name no console line. |
| M2 | resolved | `:33` and finding 6 (`:102`) now say "did not show the saved text within 5 000 ms; whether it showed it at all is not measured", with the 6 s poll bound and `o2Eq` not recorded; "stable lag" and "not a Step 11b effect" are gone from both files. FAIL kept. See n2. |
| m1 | resolved | `:33` states that `judgeUpOpt` checks the O2 bound last, so every earlier clause held, and attributes `standing x0, invalid items 2` to Run 16's helper with the line refs; finding 7 (`:105`) matches. |
| m2 | resolved | `:36` and finding 7 give the one-token `VERDICT_LINE` (`recipes/s11b-r17b-rules.ts:152`) as the cause. |
| m3 | resolved | `:34` UP-6: the measured fact (banner on the two SDK-preflight legs), "Cause not established". `:37` F-RAW: raw legs do send a call, so the argument does not carry over. Finding 4 and §5 Causes say "no established cause". |
| m4 | resolved | `:69` and the §5 D7.4 row cite the framing file. I read `r17b-framing.txt` lines 71-79: `HIST bk built=2 pages activated=2`, `ACT bk n=2 ok`, `HISTORY fwd built navigations=3 backs=2`, `HIST fw built=3 pages activated=3`, `ACT fw n=3 ok`, `HIST sd built=2 pages activated=2`, `ACT sd n=2 ok`, exactly as quoted. Marked not committed. |
| N1 | resolved | `:45` prints `localhost:8085=0` as in R2A:600 (I read it), with "…" marked as omitted probes. |
| N2 | resolved | `:30` says DISARM is judged on the four clauses after "unchanged:", not on the console line. |
| N3 | resolved (no text in lane) | #314 appears in neither the record nor the hunk; it survives only in `S7-record-builder.md`, a historical report. The session agent should read #314's "Revisit if" as not measured. |
| N4 | resolved | `:43` states only that control 1 answered `ok` (DevTools not attached, possibly opened without attaching); cause not established. |

## 4. Counts re-counted
Listing the 28 verdicts in `S7-run-record.md:18-45` one by one: PASS 16 (R17B-0, CTL, ACT-CTL, RD-2, NEWTAB-PLAIN,
NEWTAB-LOAD, BACK, FWD, BACK-SAMEDOC, DISARM, BACK-EMPTY, RD-DL-SOCKET, UP-7, F-RAW-ENC, F-RAW-OK, RESTORE), RECORD 2,
FAIL 7 (UP-L1, UP-OPT, UP-6, F-RAW, F-RAW-2, F-RAW-DIR, UP-RACE-A), NOT MEASURED 3 (UP-DEVT, SAVE-REFUSE, LOGS); 28.
They agree with: the counts paragraph (`:47-51`), the §3 D7 table (D7.6 alone not met), §6's alternative (16+3 = 19,
7-1 = 6, 3-2 = 1), and the §5 code block (the PASS line names the same 16, FAIL the same 7, NOT MEASURED the same 3; D7.6
NOT MET). The slice count (31 = 28 + R17B-0, RESTORE, LOGS once more) also adds up. My verdicts from the first round are
unchanged and match.

## 5. Notes

**n1 (MINOR, introduced by the fix): the §5 "Differences from the step reports' tallies" paragraph is now wrong.**
`docs/e2e-test-plan.md`, last paragraph of the Run 17b entry (just before `## 6. Exit criteria`).
- It lists R17B-SAVE-REFUSE as a difference ("`LIVE` gives … NOT MEASURED (the helper's word); this record judges it NOT
  MEASURED"). The two verdicts are the same; only the reason differs.
- It leaves out the two real differences: `S7-live.md:31` gives R17B-UP-L1 PASS and `S7-live.md:51` gives R17B-LOGS PASS
  (both slices); this record judges them FAIL and NOT MEASURED.
- Fix: name UP-L1 (PASS → FAIL) and LOGS (PASS → NOT MEASURED), and say SAVE-REFUSE has the same word for a different
  reason, or drop it. This does not change any verdict or count; the session agent may fold it into closeout.

**n2 (NIT):** `S7-run-record.md:33` still opens with the helper's printed line in bold, "O2 showed the saved text after
6105 ms". It is a quote of R2A, and the same cell then states what was measured, so it is accurate as a quote. Marking it
"(the helper's wording)" would stop a reader from taking it as measured.

## 6. Handoff
Nothing started, nothing running. Not committed. n1 is a one-paragraph edit inside the §5 hunk; the stale 19/2/6/1 and
the #314 line in `S7-record-builder.md` stay as history.
