# S4-run-record — Run 17 judged against §4.24

Written 2026-10-27 by the S4-record builder (Claude Sonnet 5.5, medium), docs only. Run 17 stopped at a pre-registered
STOP (decisions #307); the root cause is in #308 and `S4-investigation.md`. Every judgment below applies the sheet's own
pass rule (`docs/e2e-test-plan.md` §4.24, committed in `336547d` before any observation) to the committed record. No
expected text was edited or reinterpreted. An ambiguity is noted next to its row and decided against the result, never
for it. `R7` = `S4-live-run7A-record.md` (line numbers); `R1`, `R3`–`R6` = the other attempt records; `RUN7` =
`S4-live-runner7.md`; `LIVE` = `S4-live.md`; `INV` = `S4-investigation.md`; `CON7` = `S4-live-run7A-console.txt`.
All rows that ran were judged on attempt 7 (the only attempt that got past RD-REGEX); earlier attempts measured the
same rows RD-0 … RD-REGEX with the same results (section 2).

*Corrected 2026-10-27 (S5): the RD-FWD row, attempt 6A's row and the STOP-rules row call the pages of the refused set-up `back` "8081 pages". The refused `back` (`at=back 1`, RD-FWD's set-up, attempts 6 and 7) started from the 8091 flip page, the last URL of `historyPlan("fwd")` (`recipes/s11b-rules.ts`); its first request answered 200, so "no redirect" still holds. Finding M1 in `S4-record.md`; evidence `S4-record-verifier2.md`. The judgment text is not rewritten.*

Judgment words: PASS, FAIL, RECORD (a row the sheet only records, whose recorded clauses are in), NOT RUN (not reached
or not built; why stated), and STOP (the row the pre-registered STOP rule fired on). A row whose pass rule is not met is not PASS.

## 1. Every §4.24 row (38 rows)

| Row | Judgment | Evidence (quoted from the record) | File |
|---|---|---|---|
| RD-0 | PASS | line 1 `MANIFEST dnrWithHostAccess=true staticRuleSets=absent`; `RULES 0`; `STATE armed=true evaluate=true blocklist lines=0 uploadfolders valid=0 invalid=0`; `TOGGLE reading on`; `FOUNDLIST blocks-fixtures=no`. Nothing pressed. liveB's second RD-0 NOT RUN (liveB did not start). | R7:1-13 |
| R17-UP-L1 | FAIL (cause: the pass rule's "console-scanned" clause was not met by the row, because RD-LOGS never ran after the RD-BACK-EMPTY STOP, #307) | `FOUNDCHECK root=not outside=not`; `CHECK UP-L1 build PASS`; `raw-root PASS`; `raw-outside PASS`: every refusal clause holds. The pass rule (§4.24) also says "The worker console capture is already running (RD-0), so UP-L1 is console-scanned". The capture was running, but the row printed no console scan and RD-LOGS did not run; the only scan of this console is runner 8's offline scan of attempt 7's console after the STOP (all counts 0, `S4-live-runner8.md` section 1), which is not the row. By the rule the console clause was not met by the row, so the row is not PASS (the first draft passed it; verifier F6). Of the five words the one that does not flatter the result is FAIL; nothing was found on the console. | R7:14-18 |
| RD-CTL | PASS | 302 in 15/12, 3/4, 2/3 ms (8083, 8088, 8089); 8086 `302 in 4004 ms, 302 in 4004 ms`; `CTL 8091 flip 200 then 302`; `HITS ctl redirect=0 blocked=1`; `ROW RD-CTL PASS: all controls hold` | R7:19-25 |
| F-FILETAB | PASS | exactly one tab hidden: `TABSHIDDEN F-FILETAB rows=12 hidden=1 reason=blocked url=no title=no`; snapshot and navigate K-filepage (`This tab shows a local file (a file: page)…`); control K-fileurl (`The bridge never opens local files (file: URLs).`); untouched. The sheet's RECORD clause `tabCreated url-empty` was `NOT MEASURED` (tab events reach the daemon only); it is in Expected, not in the Pass rule, so the row passes, with that clause not measured. The sheet's helper cell does not name `B17 filetab`, which ran it (S4-helpers n4-2). | R7:33-49 |
| F-HOME | PASS | `ROW F-HOME PASS: summary and four K-opt-home items exact, the work line valid, nothing stored` | R7:62 |
| RD-CAPS-WARN | PASS | `ROW RD-CAPS-WARN PASS: exact K-caps items, nothing stored`. The rule-count cap warning was not run, as the sheet says. | R7:74 |
| RD-REGEX | RECORD | `REGEX bank443-schemes supported=true len=59`; `bank443-explicit … len=57`; `h119 … len=119`; `h120 supported=true len=120`; `h121 supported=true len=121`. Regexes of 120 and 121 characters are reported supported, longer than the 119 bound: by the sheet's own wording this "disagrees with the 119 bound" (#300's and #303's revisit trigger; the bound over-warns, it never under-blocks, #307). | R7:79-83 |
| RD-1 | PASS | `ROW RD-1 nav DOMAIN_BLOCKED This tab shows a site on the user's block list…` (K-tab, no data, `LAT RD-1 94 ms`); `HITS rd1 redirect=1 blocked=0`; snapshot K-tab on the hidden row; `RULES 0` after the reply | R7:85-98 |
| RD-6 | PASS | `HITS rd6 redirect=1 blocked=1`; `RD6 url=fixture-8085`; `RULES 0` read before and after (R7:97, 104, 116). The record prints no judged ROW line for RD-6, so this is judged by hand from the pass rule (blocked = 1, redirect = 1, rules 0 both times). Also printed: `window … did NOT reach http://localhost:8083/…rd6 within 15 s`, the expected effect of the redirect, not a failure; the pass rule does not read it. | R7:106-117 |
| RD-2 | RECORD | `HITS rd2 redirect=1 blocked=1`; snapshot `DOMAIN_BLOCKED This tab shows a site on the user's block list…` (K-tab; the row hidden). Judged clause (redirect = 1, snapshot K-tab when hidden) holds. `newTab` leaked its first request (1 blocked hit), as #295 records. The sheet's "the tab is cleaned by `closeTab`" did not happen: `close-r2` answered DOMAIN_BLOCKED (R7:122), as did close-r1, close-r7 and close-rdd (R7:99, 235, 344); the wave's four windows were closed by the runner at the end (RUN7:53). | R7:118-124 |
| RD-3 | PASS | redirect leg `DOMAIN_BLOCKED That address is on the user's block list…` (K-url), `hello-rd3.txt exists=no part=no`; control leg K-url, no file; `HITS rd3 redirect=1 blocked=0`; `HITS rd3c redirect=0 blocked=0`; `RULES 0` after | R7:125-139 |
| RD-DL-ERR | PASS | three times `ROW RD-DL-ERR-<i> PASS: K-fetch` (`LAT` 314, 312, 312 ms), `RULES 0` after each; the code is not `DOMAIN_BLOCKED` | R7:146-175 |
| RD-DL-HOP | PASS | per trial `PASS: K-url, no file, blocked=0` ×3 (`LAT` 9, 9, 9 ms), `RULES 0` after; recorded (not judged): `RECORD RD-DL-HOP hop=9,9,9 err=314,312,312 rd3=10 d=-303 ms reading=the event was in hand at the rejection`. `d` is about -300 ms, so #303's latency trigger is not met. | R7:176-209 |
| RD-7 | RECORD | `ROW RD-7 nav DOMAIN_BLOCKED This tab shows one of the bridge extension's own pages…` (K-own, 39 ms); `HITS rd7 redirect=1`; `CTX r7 count=0` (no context in the tab, so the STOP check did not fire). The UIA heading read was `NOT MEASURED` (no wave window shows the tab); by the sheet the console `CTX` is the stopper and read 0. | R7:216-241 |
| RD-8 | RECORD | `ROW RD-8 nav ok T2135 url <non-fixture url withheld>`; snapshot `INTERNAL Could not inject into the target tab … (Frame with ID 0 is showing error page)`; `HITS rd8 redirect=1`. Ambiguity: the tab's URL is withheld by the helper's own redaction, so the sheet's STOP test ("the tab's URL reads a `file:` URL") is not read directly; the error-page snapshot answer is evidence that no `file:` document rendered, and no STOP line printed. Stronger evidence: the hidden(blocked) count stays at 4 from RD-7 (R7:226) to RD-8 (R7:245), and a `file:` tab is listed hidden=blocked (R7:34), so no `file:` tab appeared; the snapshot answered INTERNAL, not K-filepage, and the gate refuses every call on a `file:` page. | R7:226, 235-247 |
| RD-BACK | FAIL | `ANSWER RD-BACK INTERNAL <message len=35>` (6 ms); `ROW RD-BACK FAIL: answer INTERNAL is neither ok nor K-tab`; `HITS bk blocked=0`; `FLIP bk n200=1 n302=0 total=1` (one request, so the row would also be NOT DISCRIMINATING). Cause known: Chrome's `back` refused a history the bridge built (`Cannot find a next page in history.`), predating Step 11b (#308, `INV`). Stays FAIL. | R7:248-261; INV §3 |
| RD-FWD | NOT RUN | `ROW RD-FWD NOT MEASURED: its history set-up was not built`; runner report: `HISTORY fwd set-up NOT BUILT at=back 1 INTERNAL "Cannot find a next page in history."` (`HISTDIAG fwd row=2 navigations=3 backs-done=0`). The record's own label is NOT MEASURED; the five judgment words have no such word, and the row was never observed, so NOT RUN. Same cause as RD-BACK (#308). **STOP note (F1):** this set-up `back`, on the empty found list and 8081 pages with no redirect, answered `INTERNAL`, which is the wording of the phase doc's row-level STOP rule ("a bridge call answering differently from its pre-Step-11b text on a page with no redirect"); it first did so in attempt 6 (`S4-live-runner6.md`, ledger return 6) and again here. Helper fix 5 (`2c1af4b`) recorded it as NOT BUILT / NOT MEASURED instead of a STOP. The word stays NOT RUN; the point is the user's (section 5). | R7:262; RUN7:28 |
| RD-BACK-SAMEDOC | FAIL | `ANSWER RD-BACK-SAMEDOC INTERNAL` (6 ms); `ROW RD-BACK-SAMEDOC FAIL: answer INTERNAL, not ok`; `RULES 0` after. The 1 000 ms bound held (6 ms) but the expected `ok` did not. Cause: #308. | R7:263-276 |
| RD-REBUILD-NARROW | PASS | `ANSWER RD-REBUILD-NARROW ok` (3 126 ms); `RULES samples=[1,…,1] min=1 max=1`; `RULES after=0`; the switch toggled off then on, `FLAG evaluate read back equal` both times; `ROW RD-REBUILD-NARROW PASS` | R7:277-313 |
| RD-DISARM | FAIL | `ANSWER RD-DISARM DOMAIN_BLOCKED "This tab shows a site on the user's block list…"`; `CHECK RD-DISARM FAIL: code DOMAIN_BLOCKED, want DISARMED`; `RULES samples=[1,1,1,1]`, `RULES after=0` (that clause `PASS: sample = 1, then 0`); `HITS rdd redirect=1 blocked=0`; wait-safety `NOT reached`; `ROW RD-DISARM FAIL (by 4 clause checks)`. Cause known (#308, `INV`): the ON press came about 1.3 s after OFF (OFF R7:325 at 29.760Z, ON R7:330 at 31.026Z; the helper's 1 600 ms gap runs from the scheduled first press, `s11-win.ps1:329-332`), so the state was armed again before the 4 s redirect and the product rightly answered K-tab; the disarm itself worked (title OFF in 53 ms; console line `safety: disarmed by the user`, `CON7:787`). The sheet's own steps prescribe that timing (§4.24 RD-DISARM: "pressed again (ON), 1.6 s after"), so the steps contradict the expected K-disarmed (`INV` section 4). Wait-safety `NOT reached` is the helper comparing with the found count instead of G1's (`INV`). The row still FAILs by its pass rule. | R7:314-345; CON7:787 |
| RD-4 | PASS | `ROW RD-4 nav ok` (the tab landed on a page that is not printed); `HITS rd4 redirect=1 blocked=1`; `RULES 0` after | R7:346-356 |
| RD-5 | PASS | `ANSWER RD-5 DOMAIN_BLOCKED "This tab shows a site on the user's block list…"`; `STORED match=yes lines=1`; `GAP 369 ms` (bound 1 000), `ROW RD-5 gap PASS: call after the read-back`; `HITS rd5 redirect=1 blocked=0`; `RULES 0` after | R7:357-387 |
| RD-5b | PASS | K-tab refusal (`CHECK RD-5b PASS: exact`); `RULES expect=1`, `RULES samples=[1,1,1,1]` (= N), `RULES after=0`; `HITS rd5b redirect=1 blocked=0`; list restored, `RESTORE blocklist lines=0 hash=equal` | R7:388-426 |
| RD-BACK-EMPTY | STOP | `ROW RD-BACK-EMPTY STOP: answer INTERNAL, not ok: a call on a page with no redirect answers differently`; empty list, `back` answered `INTERNAL` in 5 ms. The pre-registered STOP rule fired (#307); the runner restored and returned. Predates Step 11b (#308); the user rules. | R7:427-441 |
| RD-DL-SOCKET | NOT RUN | after the STOP; no line | R7:441 |
| R17-UP-OPT | NOT RUN | after the STOP; no line | R7:441 |
| R17-UP-6 | NOT RUN | after the STOP; no line | R7:441 |
| R17-UP-7 | NOT RUN | after the STOP; no line | R7:441 |
| R17-SAVE-REFUSE | NOT RUN | after the STOP; no line | R7:441 |
| F-RAW | NOT RUN | liveB did not start: liveA did not finish (the toggle read `on`, so G11-3 is not the reason) | LIVE §2 |
| F-RAW-2 | NOT RUN | as F-RAW | LIVE §2 |
| F-RAW-DIR | NOT RUN | as F-RAW | LIVE §2 |
| F-RAW-ENC | NOT RUN | as F-RAW | LIVE §2 |
| F-RAW-OK | NOT RUN | as F-RAW | LIVE §2 |
| R17-UP-RACE-A | NOT RUN | as F-RAW | LIVE §2 |
| R17-UP-DEVT | NOT RUN | as F-RAW | LIVE §2 |
| RD-RESTORE | NOT RUN | the row did not run (liveA's end). The STOP path's restore read back: `RESTORE read-back: stored page equal true, daemon.status equal true, title armed true`, both texts the empty-text hash. That is D4.4's evidence, not the row's (the row's `RESTORED: …` line never printed). | R7:468 |
| RD-LOGS | NOT RUN | the row did not run (no `SCAN` line). Offline scans after the STOP are labelled separately (section 2). | LIVE §2 |

Counts over the 38 rows (earlier drafts: PASS 15, then a sixth word PARTIAL; both replaced, F6): PASS = RD-0, RD-CTL, F-FILETAB, F-HOME, RD-CAPS-WARN, RD-1, RD-6,
RD-3, RD-DL-ERR, RD-DL-HOP, RD-REBUILD-NARROW, RD-4, RD-5, RD-5b = 14; FAIL = RD-BACK, RD-BACK-SAMEDOC, RD-DISARM, R17-UP-L1 = 4; RECORD = RD-REGEX, RD-2, RD-7, RD-8 =
4; STOP = 1; NOT RUN = RD-FWD, RD-DL-SOCKET, R17-UP-OPT, R17-UP-6, R17-UP-7, R17-SAVE-REFUSE, F-RAW, F-RAW-2,
F-RAW-DIR, F-RAW-ENC, F-RAW-OK, R17-UP-RACE-A, R17-UP-DEVT, RD-RESTORE, RD-LOGS = 15. 14 + 4 + 4 + 1 + 15 = 38. **PASS 14,
FAIL 4, RECORD 4, NOT RUN 15, STOP 1.**

## 2. The attempts (seven; the ledger is `S4-live.ledger.md`)

| Attempt | Returned | File |
|---|---|---|
| 1 (00:35Z) | STOP at F-FILETAB set-up: two hidden rows, the wave's own options window counted (`SET-UP: expected exactly 1 listTabs row hidden "blocked", found 2`); RD-0, UP-L1, RD-CTL passed first | `S4-live-run1-record.md`, `S4-live-runner1.md` |
| 2 | STOP at preflight (`a previous wave's globals exist`); no row, no record | `S4-live-runner2.md` |
| 3A | STOP in `f-filetab`: `Cannot read properties of undefined (reading 'includes')` (state.json without `opened`); every judge printed `NOT MEASURED: no ROW line` (time-prefix seam) | `S4-live-run3A-record.md`, `S4-live-runner3.md` |
| 4A | STOP in `rd-caps-warn`, an exception right after the box was typed (the summary `<p>` is not exposed by AutomationId); F-FILETAB and F-HOME passed | `S4-live-run4A-record.md`, `S4-live-runner4.md` |
| 5A | STOP in the history block: `unexpected BridgeError` after `HISTORY back built navigations=2 backs=0`; RD-REGEX's five lines recorded | `S4-live-run5A-record.md`, `S4-live-runner5.md` |
| 6A | STOP in the history block: `unexpected BridgeError INTERNAL at=back 1 "Cannot find a next page in history."` (RD-FWD's set-up). **Met the phase doc's row-level STOP clause (F1):** the same answer on an empty list and 8081 pages with no redirect is "a bridge call answering differently from its pre-Step-11b text on a page with no redirect"; fix 5 (`2c1af4b`) then turned it into NOT BUILT instead of a STOP, and attempt 7 met it again at RD-FWD's set-up (RUN7:28) before RD-BACK-EMPTY. Verifier 5 checked only the "throw after the first state change" clause (`S4-live-verifier5.md:57-61`), not this one | `S4-live-run6A-record.md`, `S4-live-runner6.md` |
| 7A (02:31–02:38Z) | row-level STOP at RD-BACK-EMPTY (section 1); STOP-path restore read back equal; rows to RD-5b judged above | `S4-live-run7A-record.md`, `S4-live-runner7.md` |

Post-STOP offline scans (runner 8, not the RD-LOGS row): every count 0 in the daemon slices of attempts 1, 3–7 and in
attempt 7's console (it holds the control line `safety: disarmed by the user`); the consoles of attempts 1, 3–6 are
NOT MEASURED (no control line); every record and report passes the `other` scan. Runner 8's teardown refused (RD-RESTORE
never passed) and wrote nothing (`S4-live-runner8.md`). Five helper fixes between attempts stand
(`041ea89`, `4446d17`, `344f386`, `9e3fbe4`, `2c1af4b`; none changed a pass rule, judge or expected text; #307), but the fifth
(`2c1af4b`) was made after F1's STOP clause was met in attempt 6, which is for the user's ruling (section 5).

## 3. Exit checks D4.1–D4.6

| Check | Result | Evidence |
|---|---|---|
| D4.1 §4.24 committed before the first observation | met | §4.24 in `336547d`, the #306 note in `723b63c`; first record line `2026-10-27T00:35:30Z` (R1); `git log` order |
| D4.2 the first line proves the loaded build includes the permission | met | `MANIFEST dnrWithHostAccess=true staticRuleSets=absent` is line 1 of R1, R3–R7 (every attempt that reached RD-0) |
| D4.3 RD-1, RD-2, RD-3 each 0 hits on the blocked port with the pre-written answer; RD-4 1 hit; RD-6 as written | not met | RD-1 `blocked=0`, RD-3 `blocked=0`, RD-4 `blocked=1`, RD-6 `blocked=1` as written (0.4 (C)); **RD-2 shows `blocked=1`**. RD-2 is a RECORD row in the sheet (#295) but the phase doc's D4.3 lists it among the zero rows, so by the check's own wording it is not met; the cause is the known `newTab` leak (#295) |
| D4.4 found state read back equal by hash, none printed | met (by the STOP-path restore, not the RD-RESTORE row) | `RESTORE read-back: stored page equal true, daemon.status equal true, title armed true`; both texts the empty-text hash, equal to RD-0 (R7:468; R7:1-13); the step agent's later `daemon.status` read: armed true, JavaScript true, blockedCount 0 (LIVE §2) |
| D4.5 every STOP or guard line matched to a return in the ledger | met | returns 1–7 and runner 8's teardown STOP, each in `S4-live.ledger.md` |
| D4.6 RD-LOGS by count | not met | the row did not run; only offline scans of the preserved captures (section 2), which are not the row |

## 4. Judging RD-6 and RD-8 (handoff remark in S4-live.md), and the CTX form

- **RD-6** prints no `ROW RD-6` line. Judged by hand from the sheet's pass rule: `HITS rd6 redirect=1 blocked=1`, rules
  0 before and after (R7:97, 104, 116; the sheet asks "RULES before and after"), `RD6 url=fixture-8085`. All of the
  rule's clauses hold; PASS. The record's `did NOT reach … within 15 s` line is not a clause of the rule.
- **RD-8** prints no judged ROW line either. Its pass rule is a STOP test (the tab's URL reads a `file:` URL); the
  helper withholds that URL as non-fixture, so the test is not read directly. No STOP line printed and the snapshot
  met an error page, so RECORD, with the withheld URL noted as the ambiguity.
- **CTX line form:** the helper prints `CTX r7 tabs=1` and `CTX r7 count=0`, the tab's label `r7` first, not the
  sheet's `CTX tab=<label> count=<n>` (S4-helpers' note). `count=0` is the sheet's stopper clause for RD-7 and reads 0.

## 5. Gate checklist draft (for the phase doc's § As built)

| Item | Met? | Evidence |
|---|---|---|
| Every stage: tests = before + n, none removed; typecheck and build exit 0; tree clean after the build | met | each stage report's counts: 3811/154 → 3825/156 → 3845/157 → 4087/158 → 4111/159 → 4135/160 → 4158/161 → 4472/177 (S4-helpers) → 4535/183 (S4-live fixes); `S4-live.md` §2: typecheck, build, seven `recipes` tsconfigs exit 0 (`S4-live.md:24`: product code untouched). New pure tests red before the change: `S0F-a.md:34` (16 red on HEAD), `S2.md:26` (every new test failed before the module existed); the other stage reports were not re-read for this clause |
| Z.1 Stage 0 | met | `Stage0.md` verdict DONE, verifier PASS-with-notes, round 2 PASS-with-notes |
| F.1 S0F | met | `S0F-a.md` PASS-with-notes (`62eee7e`); `S0F-b.md` PASS (`0202888`) |
| D1.1 S1 | met | `S1.md` DONE; fix round after verifier FAIL (F1 MAJOR, #300), re-check PASS-with-notes (`a675ab7`) |
| D2.1–D2.4 S2 | met | `S2.md` DONE, PASS-with-notes (`e7bb081`) |
| D3.1–D3.5 S3 | met | `S3a.md` PASS-with-notes carried, last re-check PASS (`c9db926`); `S3b.md` PASS-with-notes after a FAIL round (`7580d59`) |
| D4.1 | met | section 3 |
| D4.2 | met | section 3 |
| D4.3 | not met | section 3: RD-2 shows `blocked=1`; RD-1, RD-3, RD-4, RD-6 as written |
| D4.4 | met | section 3 (STOP-path restore; the row did not run) |
| D4.5 | met | section 3 |
| D4.6 | not met | section 3: RD-LOGS did not run |
| D5.1 S5 | pending | S5 not started |
| STOP rules (stops the gate) | **fired, and met earlier (F1)** | (1) "a bridge call answering differently from its pre-Step-11b text on a page with no redirect": first met in attempt 6, RD-FWD's set-up `back` (`INTERNAL`, empty list, 8081 pages, no redirect; `S4-live-runner6.md`, ledger return 6), which helper fix 5 (`2c1af4b`) then recorded as NOT BUILT instead of a STOP; met again in attempt 7's RD-FWD set-up (RUN7:28); and it fired as a STOP at RD-BACK-EMPTY (#307). #308 finds the refusal predates Step 11b, so the user rules, on the STOP and on fix 5. Not observed, but not fully measured: a pattern or token in a log. Every offline count is 0 (daemon slices of attempts 1, 3-7; attempt 7's console), but the consoles of attempts 1 and 3-6 are NOT MEASURED (no control line, `S4-live-runner8.md`), runner 8's scan of the ledger printed `profile=1` and its own "RD-LOGS STOP" (a profile path, redacted before the commit), and RD-LOGS did not run (D4.6 not met). Not fired: a rule left installed (`RULES 0` after every reply, R7); the human's browsing changed (RD-6 `blocked=1` as written); Chrome rendering an own page or `file:` (RD-7 `CTX count=0`, RD-8 error page, no STOP line); a safety state not restored (STOP-path read-back equal); a push or tag (`git status -sb`: `ahead 32`, nothing pushed). Not observed, not measured as a clause: a covered call that proceeds after its rules failed to install (every call that ran showed `RULES` 1 and a K-tab or K-url answer, never an `ok`), a `CLAUDE.md` runtime invariant that would have to change (no product code changed), and a port-9234 holder or an orphan process (runner 8 checked ports 8081-8091 only, nothing listening, and found only its own query shell; 9234 not checked). Continues, recorded: RD-BACK, RD-BACK-SAMEDOC, RD-DISARM FAILs (#308) |
| G11b-0 | met | phase doc Human gates: ruled 2026-10-26 (#288, #290) |
| G11b-1 (no push or tag) | met | `git status -sb` on 2026-10-27: `main...origin/main [ahead 32]` |
| G11b-2 (fixtures only) | met | every URL in the records is a fixture on the wave's own ports or a label (`<non-fixture url withheld>`); no real site |

The phase gate is **not met** (D4.3, D4.6, the fired STOP); the proposals for the ruling are in decisions #308.

**For the user's ruling beside #307/#308 (F1; listed by the fixer, the session agent decides where it goes):** helper fix 5
(`2c1af4b`, a refused set-up `back` becomes NOT BUILT) was made after the phase doc's row-level STOP clause was met in
attempt 6, and RD-FWD's set-up met it again in attempt 7. The gate outcome does not change; the disclosure does.
