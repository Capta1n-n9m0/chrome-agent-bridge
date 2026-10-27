# S4-record verifier — Run 17's record against §4.24

Verifier: Claude Opus 5.5, medium effort. Read and run only. Claims audited: `S4-run-record.md` (new), the "Run 17
(S4)" entry in `docs/e2e-test-plan.md` §5 (`git diff` +44 lines, lines 3017–3060), `S4-record-builder.md`. Sources read:
§4.24 (e2e-test-plan.md:1552–1664), Run 16's §5 entry (2876–3016), the phase doc (0.10, S4, Exit checks, Human gates,
STOP rules, As built), decisions #291–#308, `S4-live.md`, the ledger, the seven attempt records, runners 6–8, verifier5,
`S4-investigation.md`, `S4-sheet.md`, and the verdict lines of Stage0 … S4-helpers. `R7` = `S4-live-run7A-record.md`.

## 1. Verdict

**FAIL.** One MAJOR (a disclosure gap in the STOP-rule item and the attempts table, §3 F1), plus five MINOR and five
NIT findings. Every row judgment I re-derived matches the sheet's pass rules. No judgment flatters a result, no expected
text is edited, and no FAIL is softened. The fixes are text-only and do not change a count or an exit-check result.

## 2. Checks

### C1. Row coverage and counts: holds
§4.24's row table defines 38 ids (e2e-test-plan.md:1611–1648 in the file, rows RD-0 … RD-LOGS). The record's table
(S4-run-record.md:19–56) lists the same 38, in sheet order, each once with exactly one of the five words. None is missing
and none is extra. Recount: PASS 15 (RD-0, R17-UP-L1, RD-CTL, F-FILETAB, F-HOME, RD-CAPS-WARN, RD-1, RD-6, RD-3,
RD-DL-ERR, RD-DL-HOP, RD-REBUILD-NARROW, RD-4, RD-5, RD-5b), FAIL 3 (RD-BACK, RD-BACK-SAMEDOC, RD-DISARM), RECORD 4,
STOP 1, NOT RUN 15. 15+3+4+1+15 = 38, which matches :58–62 and the §5 block.

### C2. Row judgments re-derived (14 rows): all agree
- **RD-6 PASS.** Rule: blocked = 1, redirect = 1, rules 0 both times (sheet RD-6). Evidence: `HITS rd6 redirect=1
  blocked=1` (R7:111), `RD6 url=fixture-8085` (R7:109), `RULES 0` at R7:104 (before W6 opens at :106) and R7:116 (after).
  The `did NOT reach … within 15 s` line (R7:108) is not a clause. PASS.
- **RD-8 RECORD.** STOP only if the tab's URL reads `file:`. R7:238 `nav ok … url <non-fixture url withheld>`, R7:246
  snapshot `INTERNAL … (Frame with ID 0 is showing error page)`, R7:247 `HITS rd8 redirect=1`, and no STOP line. RECORD is
  correct. The record misses stronger evidence (N2).
- **RD-2 RECORD.** Judged clauses: redirect = 1 (R7:121), and snapshot K-tab when the row is hidden (R7:120; hidden(blocked)
  goes from 2 to 3 at R7:119). Blocked = 1 is recorded, not judged (sheet RD-2). RECORD.
- **RD-7 RECORD.** K-own (R7:219), `HITS rd7 redirect=1` (R7:227), `CTX r7 count=0` (R7:233), UIA heading NOT MEASURED
  (R7:234). The stopper reads 0. RECORD.
- **RD-FWD NOT RUN.** R7:262 `NOT MEASURED: its history set-up was not built`; runner7:28 `HISTORY fwd set-up NOT BUILT
  at=back 1 INTERNAL`. The row itself was never observed, and the record's mapping (NOT MEASURED → NOT RUN, "not built")
  fits the word's definition at :12–13. But see F1: the set-up call's answer meets a STOP clause.
- **RD-DISARM FAIL.** `ANSWER … DOMAIN_BLOCKED` (R7:337), `CHECK RD-DISARM FAIL … want DISARMED` (:338), `RULES
  samples=[1,1,1,1]` and `after=0` (:339–341), `HITS rdd redirect=1 blocked=0` (:343), wait-safety NOT reached (:342),
  `ROW RD-DISARM FAIL` (:345). FAIL, not softened. Wording issues: F2.
- **RD-BACK FAIL.** `ANSWER RD-BACK INTERNAL` (R7:250); the sheet says an answer other than `ok` or K-tab "fails the
  row". `FLIP bk … total=1` (:254) would make the row NOT DISCRIMINATING. The record picks FAIL, the judgment against the
  result. Correct.
- **RD-BACK-EMPTY STOP.** R7:440–441. The `max=0` clause was never printed (the sampler was submitted at :435, and no
  `RULES samples` line follows). STOP is the right word.
- **F-FILETAB PASS.** Pass-rule clauses: exact K-filepage on snapshot and navigate (R7:36, :39), K-fileurl on the control
  (:46), no URL form (:34), untouched (:41–42). `tabCreated url-empty=NOT MEASURED` (:49) sits in Expected, not in the
  Pass rule, and the record says so. PASS.
- **RD-REGEX RECORD.** R7:79–83. Lengths 120 and 121 are reported supported, so the sheet's own phrase "disagrees with
  the 119 bound" applies. The record words it that way and adds no reinterpretation.
- **RD-5 PASS.** Exact K-tab (R7:370–371), `GAP 369 ms` (:372), `STOREDAT …094` before `CALLT start=…106` (:367–368),
  blocked = 0 (:374), `RULES 0` after (:386).
- **RD-5b PASS.** Exact (R7:401–402), samples = expect 1 (:392, :403), after 0 (:404), blocked = 0 (:420), and the save
  read back `lines=1 hash=equal` (:412).
- **RD-REBUILD-NARROW PASS.** `ok` (R7:301), `min=1` (:303), `after=0` (:304), and the switch read back twice (:291, :298).
- **RD-DL-HOP PASS.** Three times K-url, no file, blocked 0 (R7:176–208). d = 9 − 312 = −303 ms (:209), so #303's
  trigger is not met.
- **RD-1 / RD-3 / RD-4 PASS** (R7:87–104, 123–145, 348–356).

### C3. D4.1–D4.6: agree
- **D4.1 met.** `336547d` was committed at 2026-10-26T20:46Z and `723b63c` at 2026-10-27T00:34Z (`git log
  --date=iso-strict`, +04:00). The first observation is 00:35:30Z (run1-record:4).
- **D4.2 met.** `head -1` of run1, run3A–run7A all read `MANIFEST dnrWithHostAccess=true staticRuleSets=absent`.
- **D4.3 not met.** The phase doc says "RD-1, RD-2, RD-3 each show 0 hits on the blocked port", and R7:121 shows RD-2
  `blocked=1`. The sheet's own footnote (e2e-test-plan.md:1652, "RD-2 is a RECORD … recorded, not judged") is a sheet-level
  reading of D4.3. The record correctly follows the phase doc's wording and does not use the softer reading.
- **D4.4 met, by the STOP path.** R7:460/465 STATE shows the empty-text hash on both boxes, R7:466 wait-safety reached,
  and R7:468 reads `equal true` ×3. This is correctly separated from the RD-RESTORE row.
- **D4.5 met.** Returns 1–7 are in the ledger at :13, 17, 19, 24, 30, 35 and 40. Runner 8's ledger-scan STOP and teardown
  STOP are at :41.
- **D4.6 not met.** The RD-LOGS row did not run.

### C4. Gate checklist (§5 of the record)
Every item the brief lists is there: every-stage, Z.1, F.1, D1.1, D2.1–D2.4, D3.1–D3.5, D4.1–D4.6, D5.1 pending, STOP
rules, and G11b-0..2.
- **Spot checks hold.** The test chain 3811/154 → 3825/156 → 3845/157 → 4087/158 → 4111/159 → 4135/160 → 4158/161 →
  4472/177 → 4535/183 matches S0F-b.md:25, S1.md:18, S3a.md:25, S3b.md:31, S4-helpers.md:23, S4-live.md:23 and the phase
  doc's As built. The hashes 62eee7e, 0202888, a675ab7, e7bb081, c9db926, 7580d59 are all in `git log`. The verdict
  words match Stage0.md:13, S0F-a.md:8, S0F-b.md:8–9, S1.md:24–29, S2.md:33–35, S3a.md:8–10 and S3b.md:10–12.
  `git status -sb` reads `main...origin/main [ahead 32]` (G11b-1).
- **The STOP-rules item needs work** (F1, F3).

### C5. Attempts table: matches the ledger
Attempts 1–7 match ledger :13–40 and runners 1–7 (causes, rows passed first, record files). The fix hashes match
S4-live.md:21. Exception: F1.

### C6. §5 Run 17 entry
The entry agrees with the record on counts, row lists and D4.x. It does not follow Run 16's form (F4), and it has two
wording slips (F2, N1).

### C7. Public-repo scan and doc-check
Command (the scratch copy of e2e-test-plan.md:3017–3060 is `run17.txt`):
```
grep -n -i -E "localhost:8085|127\.0\.0\.1|a{24}|bank\.example|bank443|alias|token|[A-Za-z]:\\\\Users|<user-name terms>|AppData|<PROFILE>|profile|[0-9a-f]{40}|e3b0c442|sha256=|cpnemjb|chrome-extension://|https?://" S4-run-record.md S4-record-builder.md run17.txt
```
The output had 4 hits:
- S4-run-record.md:25: `bank443-…` (a REGEX label, not the pattern).
- S4-run-record.md:27: `http://localhost:8083/…rd6` (the redirector fixture, not BLK).
- S4-run-record.md:121: the prose word "token".
- S4-record-builder.md:12: the builder's own grep command, which holds `localhost:8085` (N5).

Neither new text has a token, a user path, a user name, a profile name or the BLK pattern.

`node scripts/doc-check.mjs` → `exit=0`. It reports three findings outside these files: the code counts (24/27/27), a
test count `CLAUDE.md:112 4472 passed`, and `extension/CLAUDE.md 3733 words (budget 3500)`. These are noted, not charged.

## 3. Findings

**F1 — MAJOR — S4-run-record.md:73, :35, :79–80, :121; e2e-test-plan.md:3021–3024.** A pre-registered STOP clause's
condition was met before RD-BACK-EMPTY, and neither text says so.

Evidence:
- The sheet builds RD-FWD's history "with the list as found" and moves it back twice before G1
  (e2e-test-plan.md:1574). The found list was empty (R7:9).
- In attempt 6 that set-up `back` answered `INTERNAL "Cannot find a next page in history."` (runner6:16; ledger :35). The
  pages were 8081 pages, the found list was empty, and there was no redirect.
- That is the phase doc's row-level STOP: "a bridge call answering differently from its pre-Step-11b text on a page with
  no redirect" (phase doc § STOP rules; sheet STOP paragraph).
- Fix 5 (`2c1af4b`, ledger :35–38) turned that answer into `NOT BUILT` / NOT MEASURED, not a STOP. Attempt 7 met the same
  condition again (runner7:28) before RD-BACK-EMPTY fired.
- Verifier5 checked only the "throw after the first state change" clause (`S4-live-verifier5.md:57–61`); nobody checked
  the row-level clause.

What the record says instead:
- The STOP item (:121) says the rule fired at RD-BACK-EMPTY.
- The attempts table (:73) calls 6A's STOP an "unexpected BridgeError".
- :79–80 and the §5 entry (3021–3022) say the five fixes "stand (none changed a pass rule, judge or expected text)".

Each statement is literally true. Together they hide that one helper fix was made after a STOP condition named by the
phase doc, which is the condition `agent-rules.md` §6 ("never past a STOP line") and §3 item 1 govern. The gate
outcome does not change, but the user rules from this text.

**Fix:** add to row 6A and to the STOP item that the same answer, on an empty list with no redirect, first met this
STOP clause's wording in attempt 6's RD-FWD set-up (and again in attempt 7's), and that fix 5 recorded it as NOT BUILT
instead of a STOP. List this for the user's ruling next to #307/#308. Add one clause about it to the §5 entry. Keep
RD-FWD's word as NOT RUN, with this note.

**F2 — MINOR — S4-run-record.md:38; e2e-test-plan.md:3043–3044.** RD-DISARM's cause is stated as the helper's timing
only ("pressed ON 1.6 s after OFF").

Evidence:
- The clicks were 1.27 s apart: OFF at R7:325 (29.760Z), ON at R7:330 (31.026Z). The helper's 1600 ms gap is measured
  from the scheduled first press (`S4-investigation.md:88–89`).
- The investigation's finding says the sheet's own steps (e2e-test-plan.md:1630, "pressed again (ON), 1.6 s after")
  contradict its expected K-disarmed, and it flags this "for S4-record" (`S4-investigation.md:9`, :90–91, :140).
- The wait-safety "NOT reached" at R7:342 is the helper comparing with the found count, not G1's
  (`S4-investigation.md:98–101`). The record quotes the line without that cause.

**Fix:** "the ON press came about 1.3 s after OFF (the helper's 1.6 s gap runs from the scheduled first press), as the
sheet's steps prescribe, so the steps contradict the expected K-disarmed (S4-investigation §4); wait-safety compared
with the found count instead of G1's." The FAIL stays.

**F3 — MINOR — S4-run-record.md:121.** "Not fired: a pattern or token in a log (every offline scan 0, section 2)"
overclaims.

Evidence:
- The consoles of attempts 1 and 3–6 are NOT MEASURED (runner8:16–20).
- The ledger scan printed `profile=1` and "RD-LOGS STOP" (runner8:28; ledger :41). It was redacted before the commit.
- The RD-LOGS row did not run (D4.6 not met).
- The item also leaves out three clauses: "a covered call that proceeds after its rules failed to install", "a
  `CLAUDE.md` runtime invariant …" and "a port-9234 holder … or an orphan process" (runner8:49–51 has the evidence for
  the last one).

**Fix:** "not observed; not fully measured (consoles of attempts 1, 3–6 NOT MEASURED; the ledger's profile path caught
and redacted before commit)", and add the three missing clauses with their evidence or "not measured".

**F4 — MINOR — e2e-test-plan.md:3017–3060.** The entry does not follow Run 16's form. Run 16's entry (2876–3016) has:
- a Sources legend;
- per-row lines, each with its record line;
- a "Found state = read-back" line;
- a "STOP lines in the committed evidence" inventory;
- an exit-check table with evidence;
- "Differences from the step reports' tallies".

Run 17's entry has a summary block and a link. At least one tally difference exists and should be stated:
`S4-live.md:47` gives RD-FWD as NOT MEASURED, while the record gives NOT RUN.

**Fix:** add, at least, the found-state/restore line (R7:9, 460–468), the STOP-lines inventory (R7:440–441, 483; the
attempt records' STOP lines; runner 8's two), a Differences paragraph (RD-FWD NOT MEASURED → NOT RUN; RD-0 PASS on
liveA only), and an exit-check table with R7 line evidence. The per-row lines may stay in the linked record if Run 16's
form is consciously shortened; then say so.

**F5 — MINOR — e2e-test-plan.md:3055.** "the offline scans of the captures were all 0." The counts were 0, but five of
the six consoles were NOT MEASURED (runner8:16–20). **Fix:** "counts 0; the consoles of attempts 1, 3–6 NOT MEASURED (no
control line)".

**F6 — MINOR — S4-run-record.md:20.** R17-UP-L1's Pass-rule cell says "UP-L1 is console-scanned". The record passes the
row on runner 8's offline scan of attempt 7's console, although its own policy (:6) decides ambiguities "against the
result". PASS is defensible, since attempt 7's console was scanned and passed (runner8:21). **Fix:** mark it explicitly
as an ambiguity decided for the result, with the reason, or judge the console clause NOT MEASURED as a row.

**N1 — NIT — e2e-test-plan.md:3040–3041.** "The three `INTERNAL …` answers (RD-BACK, RD-BACK-SAMEDOC, RD-BACK-EMPTY,
and RD-FWD's set-up)" lists four. Also, the record prints only `<message len=35>` for the three rows (R7:250, :267,
:437), so the quoted text comes from the length plus runner6/7, which should be said.

**N2 — NIT — S4-run-record.md:33, :100.** RD-8 has stronger evidence that no `file:` page rendered:
- The hidden(blocked) count stays at 4 from RD-7 (R7:226) to RD-8 (R7:245), and a `file:` tab is listed hidden=blocked
  (R7:34).
- The snapshot answered INTERNAL, not K-filepage, and the gate refuses every call on a `file:` page.

Cite both lines.

**N3 — NIT — S4-run-record.md:28.** RD-2's sheet clause "the tab is cleaned by `closeTab`" was refused: `close-r2
DOMAIN_BLOCKED` (R7:122). The same happened to close-r1, close-r7 and close-rdd (R7:99, :235, :344). Record it, with
where the tabs went (runner7:53 says the wave's four windows were closed).

**N4 — NIT — S4-run-record.md:108.** The every-stage item cites no evidence for "every new pure test fails on the code
before the stage" or "tree clean after the build". Cite S0F-a/S2 as built ("red on the code before") and S4-live.md:24.

**N5 — NIT — S4-record-builder.md:12–13.** The builder's scan command holds the BLK literal. The pattern is already
committed in §4.24, so this is no new exposure, but a public-repo scan of the steps dir will match it; use a regex such
as `localhost:80[8]5`. Line 13 says "exit code above" and gives no code. The report has no §9 Handoff section.

## 4. Proposed decisions

None. F1 is for the session agent to list for the user next to #307/#308.

## 5. Handoff

Nothing running; no file edited except this report.

- **Fixer lane:** S4-run-record.md (F1, F2, F3, F6, N2–N4) and the Run 17 entry in e2e-test-plan.md §5 (F1, F2, F4,
  F5, N1).
- **Re-check:** a fresh verifier re-checks F1–F6 only.
