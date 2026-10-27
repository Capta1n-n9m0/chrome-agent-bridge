# S7-record verifier report

Model: Claude Opus 5.5, effort medium. Role: verifier (agent-rules §6), docs stage. Read and ran only; the one file
written is this report. No live run; the daemon was not touched.

## 1. Verdict
**FAIL**: two MAJOR findings. The rows that pass or fail on their observations hold. The builder's own judgment call on
R17B-LOGS (and so on R17B-UP-L1 and R17B-SAVE-REFUSE) goes the way that flatters the result, which breaks the record's own
rule. One finding is stated as measured when it was not.

## 2. Checks run
- `node scripts/doc-check.mjs`: exit 0, "Checked 37 living docs (5 closed phase docs skipped for paths and status)". The
  only notes are the existing "CLAUDE.md:112 4535 passed" and "tools: 24 · router methods: 27 · codes: 27".
- `git status --short`: ` M docs/e2e-test-plan.md`, `?? …/S7-record-builder.md`, `?? …/S7-run-record.md`, plus this report.
  `git diff HEAD --stat`: only `docs/e2e-test-plan.md | 72 +`, one hunk `@@ -3149,0 +3150,72 @@`. The lane holds.
- §4.25 is unchanged: `git show 3cfbb95:docs/e2e-test-plan.md | sed -n 1677,1716p` diffed against the working tree
  shows no difference, and `git diff --stat 3cfbb95 HEAD -- docs/e2e-test-plan.md` is empty. §4.24 sits outside the hunk.
- Placement: `### Run 17 (S4)` is at line 3069 and `### Run 17b (S7)` at line 3150, directly after Run 17's last paragraph
  and before `## 6. Exit criteria`.
- Forbidden content: I scanned the added lines, `S7-run-record.md` and `S7-record-builder.md` for `://` URLs, user-profile
  paths, `appdata`, the scan probes (`bank.example`, the a-run, `alias7`, the sentinel) and `chrome-extension://`. Nothing
  matched. The token from `bridge.token` occurs 0 times.
- D7.1: `3cfbb95` was committed 2026-10-27T09:17:31+04:00 (05:17Z). The first observation is `A1` 06:42:58Z. **Met.**

## 3. Verdicts derived per row (from R2A/R2B/CON, §4.25, §4.24, and the helper code where a printed line needs it)

| Row | Builder | Mine | Basis (raw line; where they differ, why) |
|---|---|---|---|
| R17B-0 | PASS | PASS | R2A:1-15 and R2B:1-15: the first line is exact; `RULES 0`; the STATE/TOGGLE/FOUNDLIST lines; `S6 commit=ancestor`; `created-url=about:blank` |
| R17B-UP-L1 | PASS | **FAIL** | The refusal clauses hold (R2A:17-21). The console clause is "met by R17B-LOGS' SCAN line…; if R17B-LOGS … reads NOT MEASURED, R17B-UP-L1 is FAIL". R17B-LOGS is NOT MEASURED (below) |
| R17B-CTL | PASS | PASS | R2A:23-30. 8087 answered after 3066 ms (≥ 3 000). The tag printed is `ctl`, not the sheet's `bctl`; #316 already recorded that |
| R17B-ACT-CTL | PASS | PASS | R2A:34-61: `HIST … activated=3`, `ACT … n=3 ok`, four `ok` answers in 11-12 ms, `RULES 0`. The record does not say which pair is back and which forward; two more `back` calls from p1 could not answer `ok`, so the second pair is forward |
| R17B-BACK-NOACT | RECORD | RECORD | R2A:66-69: `INTERNAL`, length 35 (= "Cannot find a next page in history.", which I computed as 35), 3 ms |
| R17B-RD-2 | PASS | PASS | R2A:84-101: `open ok T2261` = `{id, tab}`; `hidden=blocked` plus a K-tab snapshot; `redirect=1 blocked=0`; `RULES 0` |
| R17B-NEWTAB-PLAIN | PASS | PASS | R2A:109-126: `elements=29`, the playground counter; `blocked=0`; `RULES 0`; `created-url=about:blank` |
| R17B-NEWTAB-LOAD | PASS | PASS | R2A:134-243: LAT 3074/3102/3074/3076/3075 ms, page=playground, `blocked=0`, `RULES 0`. Each helper `NOT MEASURED` line comes before the HITS and RULES lines that complete the trial |
| R17B-NEWTAB-REFUSED | RECORD | RECORD | R2A:321-331: `INTERNAL` with Chrome's text, 36 ms; `created-url=about:blank`; 18 tabs twice before and twice after, `before=18 after=18` (the judged clause holds) |
| R17B-BACK | PASS | PASS | R2A:244-256: K-tab, 37 ms; `blocked=0`; `FLIP bbk n200=1 n302=1 total=2`; `RULES 0` |
| R17B-FWD | PASS | PASS | R2A:257-271: first `forward` `ok` 33 ms, second K-tab 37 ms; `blocked=0`; 2 flip requests; `RULES 0` |
| R17B-BACK-SAMEDOC | PASS | PASS | R2A:272-282: `ok` in 10 ms; `RULES 0` |
| R17B-DISARM | PASS | PASS | R2A:283-315: K-disarmed exact with data; `samples=[1,1,1]`, then `after=0`; `redirect=1 blocked=0`; ON 1577 ms after the reply; `blockedCount=1` = G1's state. See N2 for the console sentence |
| R17B-BACK-EMPTY | PASS | PASS | R2A:333-354: `back` `ok` 12 ms and `forward` `ok` 10 ms, `max=0`, `after=0` |
| R17B-RD-DL-SOCKET | PASS | PASS | R2A:356-427: 12 of 12 `ok`, no `.part`; `samples=240 connected=240`; `RULES 0`; status connected (R2A:417) |
| R17B-UP-OPT | FAIL | FAIL | R2A:456. The verdict stands; its explanation does not (M2, m1) |
| R17B-UP-6 | FAIL | FAIL | R2A:461-475: the banner seen on 5 of 5 legs |
| R17B-UP-7 | PASS | PASS | R2A:494-533: three exact CHECK lines, the state read back after each leg |
| R17B-SAVE-REFUSE | PASS | **NOT MEASURED** | The SDK and MCP CHECK lines (R2A:535-548) cover every clause of §4.23 SAVE-REFUSE-R (`saveSdkVerdict`, `saveControlVerdict`, `saveMcpVerdict`, `recipes/s11-rules.ts:381-397`, calls included). The R17 pass rule's console clause ("RD-LOGS scans these calls") rests on liveA's scan, whose control is not shown (M1) |
| R17B-F-RAW | FAIL | FAIL | R2B:19-22: banner seen. `BAD_PARAMS` length 80 = K-raw-missing `paths[0]` (80, computed) |
| R17B-F-RAW-2 | FAIL | FAIL | R2B:27-30: banner seen. Length 80 matches `paths[1]` |
| R17B-F-RAW-DIR | FAIL | FAIL | R2B:35-38: banner seen. Length 76 = K-raw-dir (76, computed) |
| R17B-F-RAW-ENC | PASS | PASS | R2B:42-43 (the aggregate CHECK form, as Run 17's record accepted) |
| R17B-F-RAW-OK | PASS | PASS | R2B:47-48 |
| R17B-UP-RACE-A | FAIL | FAIL | R2B:68-191. P = 1735 ms and P + 1 000 = 2735 ms. Calls 20-22 (2851-3151 ms) were refused and calls 23-120 (≥ 3303 ms) answered `ok`. ON was pressed at 3236 ms from the ready signal (R2B:55, 63) and the armed title came at 3309 ms (R2B:64). I re-derived the builder's arithmetic and it is right |
| R17B-UP-DEVT | NOT MEASURED | NOT MEASURED | R2B:204-207: control 1 answered `ok`, so DevTools was not attached; the pass rule makes that NOT MEASURED |
| R17B-RESTORE | PASS | PASS | R2A:584-595 and R2B:243-254: all five equal, `RULES 0` |
| R17B-LOGS | PASS | **NOT MEASURED** | liveA's counts are 0 (R2A:600-606) and liveB's are 0 (R2B:259-263), and liveB's control line is in CON:643, 700. liveA's control is not shown (M1). One verdict per row "when both slices agree", so the row is NOT MEASURED |

**My counts (28 rows):** PASS 16, RECORD 2, FAIL 7 (UP-OPT, UP-6, F-RAW, F-RAW-2, F-RAW-DIR, UP-RACE-A, UP-L1),
NOT MEASURED 3 (UP-DEVT, SAVE-REFUSE, LOGS), NOT RUN 0, NOT DISCRIMINATING 0. 16 + 2 + 7 + 3 = 28. The builder's own
"stricter reading" (record §6) gives the same numbers. Its tally of 19/2/6/1 adds up, but the verdicts behind it differ.

## 4. Findings

**M1 (MAJOR): R17B-LOGS is judged PASS for liveA with no evidence of its control. Consequences: R17B-UP-L1,
R17B-SAVE-REFUSE, D7.6, and the counts in both files.** `S7-run-record.md:46` (the LOGS row), `:21` (UP-L1), `:39`
(SAVE-REFUSE), §3 D7.6, §5's code block and the D7.6 row (`docs/e2e-test-plan.md` lines 3166-3167, 3176, 3209).
- **The rule.** §4.25 R17B-LOGS: "the capture holds R17B-DISARM's `safety: disarmed by the user`, else NOT MEASURED". The
  §4.24 preamble says the evidence is "a refusal's code and message, a server-log count by query tag, a rule count, the
  page's own reporter, or a UIA read". A helper's verdict is not on that list.
- **What survives.** liveA's capture was overwritten (`S7-live.md` §6 item 2). I searched the wave's scratch directory: of
  the files that could hold it, only liveB's `console.txt` and `console-evidence.txt` contain the line; `liveA17B.log`
  has 0 and `daemon-slice.txt` has 0. No printed line in R2A names the control.
- **What the PASS rests on.** It is an inference from code: `verdict17` returns NOT MEASURED when the substring is absent
  (`recipes/s11b-rules.ts:655`, called at `recipes/s11b.ts:456`). Even taken at face value, that test accepts any
  disarm line in the slice, for example R17B-RESTORE's press (R2A:555-558). It does not show R17B-DISARM's line, which
  is what the rule names.
- **The record breaks its own rule.** Its preamble says "An ambiguity is … decided against the result, never for it"
  (`S7-run-record.md:5-6`). Run 17's record cited the raw console line for this control (`S4-run-record.md` RD-DISARM,
  `CON7:787`), and it called consoles without a retained control NOT MEASURED. The CHECK lines this verifier accepts
  elsewhere (UP-7, UP-L1) each print their clause and its outcome. Here no line prints the clause.
- **Fix.** R17B-LOGS NOT MEASURED. R17B-UP-L1 FAIL, as the sheet requires. R17B-SAVE-REFUSE NOT MEASURED: every other
  clause holds, and the console clause is unmeasured. D7.6 "not met (R17B-LOGS NOT MEASURED; counts 0 in both slices;
  liveA's control not retained)". Counts 16/2/7/3 in the record and in §5. If the session agent instead rules that a
  unit-tested helper's verdict counts as evidence, it should record that as a proposed decision for user review, not
  leave it as the record's default. Under that ruling SAVE-REFUSE and UP-L1 become PASS.

**M2 (MAJOR): "O2 showed the saved text after 6105 ms" and "a stable lag across two builds" are not measured.**
`S7-run-record.md:36` ("Likely cause … the same lag, not a Step 11b effect"), §5 finding 6, and the §5 entry ("R17B-UP-OPT's
6105 ms matches Run 16's 6 061 ms", `docs/e2e-test-plan.md` ~3190).
- **How the time is taken.** `Invoke-S11Opt` polls O2 only while the elapsed time is under 6 s. If the text never
  matches, it sets `$o2Ms` to the elapsed time and does not record whether it matched
  (`recipes/s11-win.ps1:278-283`; `$o2Eq` is not written to the obs JSON, line 306). The judge compares only
  `o2Ms > 5000` (`recipes/s11b-rules.ts:816`).
- **What that means.** Both 6061 and 6105 sit just past the 6 000 ms poll bound. That pattern fits O2 never showing the
  text inside the poll just as well as it fits a lag. Whether O2 ever showed the saved text was not measured in either run.
- **Fix.** Keep the FAIL: the text was not shown within 5 000 ms either way. Restate the finding as "O2 did not show the
  saved text within 5 000 ms; whether it showed it at all is not measured (the 6 s poll bound; `o2Eq` not recorded)".
  Drop "stable lag" and "not a Step 11b effect". Name the helper gap for a fix wave.

**m1 (MINOR): R17B-UP-OPT's `standing x0, invalid items 2` is called "unexplained", and the row says other clauses may
not have held. Both are wrong; the code explains them.** `S7-run-record.md:36`, §5 item 7, builder report §6.
- **Every text clause held.** `judgeUpOpt` checks its clauses in order and the O2 bound last (`recipes/s11b-rules.ts:804-816`).
  A FAIL on the O2 time therefore means every clause before it passed: K-opt-stand once, the three summaries, the
  K-opt-rel/root/home items, the stored hash, nothing stored by typing, and no conflict note.
- **Where the `OPT observed` line comes from.** It is Run 16's helper. `$S11Warning` is the pre-S0F-a text
  (`recipes/s11-win.ps1:24`, used at :276), and the invalid-item regex matches only typed lines 1-2 (:296). The judge
  re-reads its own inputs (`Get-S11bOptObs`, `recipes/s11b-win.ps1:411-419`).
- **Fix.** Say so, and remove "whether the sheet's other text clauses held is not shown".

**m2 (MINOR): the cause given for R17B-SAVE-REFUSE's helper label is wrong.** The record says the aggregator "looks for the
wrong id" (`S7-run-record.md:39`, builder §6). In fact `carriedVerdict`'s `VERDICT_LINE`
(`recipes/s11b-r17b-rules.ts:152`, `ROW \S+ (PASS|…)`) accepts only a one-token row id. The block prints
`ROW SAVE-REFUSE-R sdk-leg PASS` (two tokens), so it counted 0 lines. Fix the stated cause; a helper fix is for a later wave.

**m3 (MINOR): the "likely cause" of the UP-6 and F-RAW banner FAILs goes beyond the evidence.** `S7-run-record.md:37, 40`;
§5 finding 4.
- **UP-6.** The row is headed "Likely cause (from evidence)", then speculates ("whatever else holds a debugger on the u6
  tab"), then says "Not established".
- **F-RAW.** It is called "as R17B-UP-6", but the F-RAW legs do send a call to the extension: they are raw, with no SDK
  preflight (§4.24 F-RAW). So the "no call was sent" argument does not carry over.
- **Fix.** Keep the measured fact: the banner was positive on the two SDK-preflight legs, which send no call
  (K-missing/K-relative are "SDK preflight, no call" in §4.24 K17). Write "cause not established" for every banner FAIL.

**m4 (MINOR): the D7.4 set-up gap can be closed from preserved evidence.** The builder calls the set-ups "evidenced
indirectly" (`S7-run-record.md` §3 D7.4). The framing file outside the repo,
`%TEMP%\bridge-e2e\s11b-r17b-2\r17b-framing.txt`, holds the following, which I read:
- `HIST bk built=2 pages activated=2` and `ACT bk n=2 ok`;
- `HISTORY fwd built navigations=3 backs=2` and `HIST fw built=3 pages activated=3`;
- `HIST sd built=2 pages activated=2`.

D7.4 is met. Cite these lines; if they are to count as committed evidence, the session agent should commit them after a
scan.

**N1 (NIT):** the LOGS row's evidence `localhost-pattern=0` is shown as a quote, but the record reads `localhost:8085=0`
(R2A:600). Mark it as a paraphrase.

**N2 (NIT):** RD-DISARM's pass column also says "The worker console now holds the line `safety: disarmed by the user`".
For liveA that is not shown either. I judge R17B-DISARM PASS on the four clauses that §4.25 lists after "unchanged:". The
record should name that reading.

**N3 (NIT):** #314's "Revisit if" is reported "not met". It is not measured: `tabs.create`'s text for the same URL was
not recorded.

**N4 (NIT):** the UP-DEVT "likely cause" ("did not open DevTools on the fixture tab") only restates the row's rule.
DevTools may have opened but not attached. The measured fact is that control 1 answered `ok`.

## 5. D7.1-D7.7 judged item by item

| Check | Mine | Source |
|---|---|---|
| D7.1 | met | `3cfbb95` at 05:17Z, before `A1` 06:42:58Z; §4.25 diff empty |
| D7.2 | met | R2A:1, 14-15 and R2B:1, 14-15 (the first line exact, `S6 commit=ancestor`, `created-url=about:blank`) |
| D7.3 | met | R2A:84-101 (`{id, tab}`, `redirect=1 blocked=0`) |
| D7.4 | met | R2A:244-282 and 333-354 (`blocked=0`, K-tab, the `ok` answers); set-ups from the framing file (m4) and FWD's first `forward` `ok` |
| D7.5 | met | R2A:584-589 and R2B:243-248; only the empty-text hash is printed |
| D7.6 | **not met** | R17B-LOGS is NOT MEASURED (M1); counts 0 in both slices |
| D7.7 | met | `A1:15` = `LED` return 1. `grep -c STOP` gives 0 for R2A, R2B and CON |

## 6. #313 "Revisit if" (R17B-NEWTAB-LOAD)
**Not met.** No `newTab` answered before the URL's load. The five slow-page replies came at 3074-3102 ms against a 3 s
hold, each with a playground snapshot (R2A:134-241). N1's cases: every `completes=1` (no doubled blank complete) and
`first-complete-ms` 6-7 everywhere (no blank tab silent past 2 s). There are 10 `created-url=about:blank` reads: 9 in
liveA and 1 in liveB. The third case, a `tabs.get` ahead of its event, is NOT MEASURED. The builder's §4 is correct.
Other "Revisit if" items:
- #310: met (R17B-BACK and R17B-FWD stopped a back/forward redirect).
- #316: met (helper lines the pass rule cannot read; M2 adds the O2 time).
- #315: not met.
- #317: not met (A1:1-3 shows only read lines before the throw).

## 7. Findings stated as measured
Items 1, 2, 3, 5 and 8 of the record's §5 are stated as measured and match the raw lines. Items 4, 6 and 7 need the fixes
in m3, M2 and m1.

## 8. Handoff
Nothing started, nothing running. For the fixer: M1 and M2 (the record, §5's code block and its D7.6 row, Causes and Open
items), then m1-m4 and the NITs. The §4.24/§4.25 rows stay untouched.
