# S1-run-record: Run 18 judged against §4.26

Written 2026-10-28 by the S1-record builder (Claude Sonnet 5.5, medium), docs only. Every judgment applies §4.26's own
pass rules (`docs/e2e-test-plan.md` §4.26, committed in `3008f55` on 2026-10-27 before any observation) to the committed
records. §4.26 is unchanged since: its text is identical at `3008f55` and at HEAD (the section extracted from each, same
md5; no commit touched `docs/e2e-test-plan.md` after `3008f55`). No expected text was edited or reinterpreted. Where a rule
is ambiguous the choice is named in section 7 and was made against the result when it could go either way. Words are the
sheet's: PASS, FAIL, RECORD, NOT RUN, NOT MEASURED, NOT DISCRIMINATING. A cause is given only from evidence and marked as
such; "cause not established" means none is claimed.

**Which attempt.** liveA18 is judged from **attempt 2** (HEAD `b8b493d`), the attempt that ran past R18-UP-OPT. Attempt 1
(HEAD `e1e68e0`, a helper fault inside `r18-up-opt`, fixed in `b8b493d`) is in section 2: its lines are recorded and not
judged. liveB18 is judged from its attempt 1 (HEAD `4a46a22`), its only attempt.

**Sources and aliases** (all in this steps dir; `A2E:n` means line n of that file):
- `A2E` = `S1-live-evidence-liveA18-att2.txt`; `A2R` = `S1-live-record-liveA18-att2.txt`; `A2C` = `S1-live-console-liveA18-att2.txt`
- `A1E` = `S1-live-evidence-liveA18-att1.txt`; `A1R` = `S1-live-record-liveA18.txt`
- `BE` = `S1-live-evidence-liveB18-att1.txt`; `BR` = `S1-live-record-liveB18.txt`; `BC` = `S1-live-console-liveB18.txt`
- `RUN-A1`, `RUN-A2`, `RUN-B1` = the three runner reports (`S1-live-runner-liveA18-att1.md`, `-att2.md`,
  `S1-live-runner-liveB18-att1.md`); `LIVE` = `S1-live.md`; `LED` = `S1-live.ledger.md`.
- Decisions cited: #340, #346, #348, #349, #350 in `docs/decisions.md`. Recipe code was read only to learn which clauses a
  printed `CHECK` or `ROW` line covers (named where used).

**The two controls first.** The run-wide banner rule (§4.26: a FAIL of R18-BANNER-CTL in either slice makes every banner
clause of the run NOT MEASURED) is applied in the R18-BANNER-CTL rows below. **Outcome: both controls PASS, so no banner
clause is NOT MEASURED. Every banner clause stands as printed.**

## 1. Every §4.26 row (13 rows, 17 slice-rows)

Row-level counts: PASS 6, FAIL 6, NOT MEASURED 1 (R18-LOGS is FAIL because slice A is). Slice-row counts: PASS 10, FAIL 6,
NOT MEASURED 1; the lists are at the end of this section.

| Row | Slice | Verdict | Clauses and quoted evidence |
|---|---|---|---|
| R18-0 | A | PASS | Line 1 of the slice record is exactly `MANIFEST dnrWithHostAccess=true staticRuleSets=absent BUILD disk-s6-names=2/2 created-url=about:blank` (A2R:1). Then `RULES 0` (A2R:3), `STATE armed=true evaluate=true blocklist lines=0 uploadfolders valid=0 invalid=0` (A2R:7), `TOGGLE reading on` (A2R:8), `FOUNDLIST blocks-fixtures=no` (A2R:10), `S6 commit=ancestor` (A2R:14), `ROW R17B-0 (e)(f) PASS: 2/2 names, S6 is an ancestor, created-url about:blank` (A2R:15), `ROW RD-0 (c) PASS: armed, JavaScript on, the toggle reads on` (A2R:9). (g): `HEAD b8b493de5505 tree=clean` (A2R:16), then `ROW R18-0 PASS slice=A` (A2R:17, A2E:24). The toggle was read, never pressed (no press line before R18-RESTORE). |
| R18-0 | B | PASS | The same set, `BR:1-17`: first line `MANIFEST ... created-url=about:blank` (BR:1), `RULES 0` (BR:3), STATE (BR:7), `TOGGLE reading on` (BR:8, so liveB ran), `FOUNDLIST blocks-fixtures=no` (BR:10), `S6 commit=ancestor` (BR:14), `HEAD 4a46a22bcc1d tree=clean` (BR:16), `ROW R18-0 PASS slice=B` (BR:17, BE:60). |
| R18-UP-L1 | A | PASS (judgment call 1) | No ROW line of its own was printed (the runner prints it after R18-LOGS, which stopped; #349). Judged from the clause lines. `FOUNDCHECK root=not outside=not` (A2R:18). `CHECK UP-L1 build PASS: daemon build = sha256 of daemon/dist/index.js` (A2R:19). Both raw calls K-gate with no data: `RAW R18-UP-L1 raw-root code=UPLOAD_REFUSED key=K-gate data=none` (A2R:21) and `RAW R18-UP-L1 raw-outside code=UPLOAD_REFUSED key=K-gate data=none` (A2R:23); neither answered `ok`, so neither is the STOP "allowed". `CHECK UP-L1 raw-root PASS: all checks hold` (A2R:20) and `raw-outside PASS` (A2R:22) cover the exact message and data (`judgeError`) and the page: 0 files, no change or input event, no mark carrier left, mark never set (`refusalPageJudge`; `recipes/s11b.ts` `l1Step`). `ROW UP-L1 PASS: all checks hold` (A2R:24). Console clause: see judgment call 1; `SCAN console: ://=0 (fixture 0, other 0) token=0 sentinel=0 profile=0` and `CHECK R18-LOGS scan console PASS: all counts zero` (A2R:158-159) over liveA18's own capture, which holds the control line (`CONSOLE liveA18 capture=console-liveA18.txt texts=679 control-disarmed=3`, A2R:157; the line itself under R18-LOGS). |
| R18-BANNER-CTL | A | PASS | `BANNERCTL liveA18 leg=neg idle-ms=15064 polls=17 banner=none` (A2R:37); `BANNERCTL liveA18 leg=pos answer=ok polls=16 banner=seen` (A2R:38); `ROW R18-BANNER-CTL PASS slice=A` (A2R:39). Rule: negative `none` (yes), positive `seen` (yes), positive's `evaluate` `ok` (yes, `ANSWER R18-BANNER-CTL pos ok`, A2R:36), `idle-ms` >= 15 000 (15 064, yes). |
| R18-BANNER-CTL | B | PASS | `BANNERCTL liveB18 leg=neg idle-ms=15050 polls=17 banner=none` (BR:29); `BANNERCTL liveB18 leg=pos answer=ok polls=16 banner=seen` (BR:30); `ROW R18-BANNER-CTL PASS slice=B` (BR:31); `ANSWER R18-BANNER-CTL pos ok` (BR:28). All four clauses hold (15 050 >= 15 000). **Run-wide rule: neither slice's control failed, so no banner clause of the run is NOT MEASURED.** |
| R18-UP-OPT | A | FAIL (finding; product or poll, cause not established) | `OPT observed standing x1 invalid items 3 warned items 0` (A2R:57): matches the sheet's `standing x1 invalid items <fi+3> warned items 0` with fi = 0 (`STATE ... uploadfolders valid=0 invalid=0`). `OPT O2 shown=no at=none polled-ms=15136` (A2R:58): in the 15 s poll O2 never showed the saved text, so the clause "O2 shows the saved text within 5 000 ms" is not met. `ROW R17-UP-OPT FAIL: O2 showed the saved text after 15136 ms, over 5 000 ms` (A2R:67) and `ROW R18-UP-OPT FAIL` (A2R:68). The judge checks the O2 bound last (`judgeUpOpt`, `recipes/s11b-rules.ts`), so a FAIL on that text means the earlier clauses held (K-opt-stand once, the three summaries, the K-opt-rel, -root, -home items, the stored hash, nothing stored by typing, no conflict note). **Wording defect:** the ROW text says O2 "showed the saved text after 15136 ms" while the OPT line says `shown=no at=none`. The verdict follows the OPT line and the rule, not the ROW wording. Cause not established. |
| R18-UP-6 | A | FAIL (product finding) | `IDLE R18-UP-6 since-attach-ms=27011` (A2R:71, over 15 000). Five legs, all `SAMPLER ... banner=seen`: outside (A2R:73), missing (A2R:75), relative (A2R:77), raw-dotdot (A2R:79), raw-notarget (A2R:81). `CHECK R17-UP-6 <leg> FAIL: <leg>: banner seen` for each (A2R:82-86), `ROW R17-UP-6 FAIL: outside: banner seen` (A2R:87), `ROW R18-UP-6 FAIL slice=A` (A2R:88). The banner clause is judged on slice A's own control, which passed (A2R:39), and the run-wide rule voids nothing. The step judge checks the exact code and message, the untouched page and mark, and "no other bridge call in the window" before it checks the banner (`refusalStepJudge`, `recipes/s11b.ts:723`), so "banner seen" as the printed reason means those clauses held on each leg. No separate printed line shows them. Cause not established; see section 4 for the `missing` and `relative` legs. |
| R18-SAVE-REFUSE | A | PASS (judgment call 1) | No ROW line of its own was printed. SDK leg: `CHECK SAVE-REFUSE-R sdk-undef PASS: K-undef: exact`, `sdk-node`, `sdk-map`, `sdk-cycle` likewise exact (A2R:89-92); `sdk-control PASS: control keeps the prefix and names boom` (A2R:93); `sdk-files PASS: no file and no .part` (A2R:94); `LEG R18-SAVE-REFUSE sdk-leg PASS` (A2R:96). MCP leg: `CHECK actor start PASS: started, tool search off` (A2R:97); `mcp-undef`, `mcp-node`, `mcp-map`, `mcp-cycle` each `contained, unprefixed` (A2R:98-101), which also covers "the actor's calls exactly `[browser_evaluate]`" (`saveMcpVerdict`, `recipes/s11-rules.ts:393`); `mcp-files PASS: no file and no .part` (A2R:102); `LEG R18-SAVE-REFUSE mcp-leg PASS` (A2R:105). Console clause: the worker console scan over liveA18's own capture printed all zeros (A2R:158-159); see judgment call 1. |
| R18-F-RAW | B | FAIL (product finding) | `IDLE R18-F-RAW since-attach-ms=15019` (BR:34). `SAMPLER F-RAW polls=16 (after the reply 1) banner=seen` (BR:36). `ANSWER F-RAW BAD_PARAMS <message len=80>` (BR:37): code `BAD_PARAMS`, length 80, the length Run 17b printed for K-raw-missing `paths[0]`. `LEAKS F-RAW 0` (BR:38). `ROW F-RAW FAIL: F-RAW: banner seen` (BR:39), `ROW R18-F-RAW FAIL slice=B` (BR:40). Judged on slice B's control, which passed (BR:31). The F-RAW judge checks error, page and window first, then banner, then the leak count (`recipes/s11b.ts:1153`), so every other clause held. The exact message text is not printed, only its length. Cause not established. |
| R18-F-RAW-2 | B | FAIL (product finding) | `IDLE R18-F-RAW-2 since-attach-ms=15012` (BR:43); `SAMPLER F-RAW-2 polls=16 ... banner=seen` (BR:45); `ANSWER F-RAW-2 BAD_PARAMS <message len=80>` (BR:46); `LEAKS F-RAW-2 0` (BR:47); `ROW F-RAW-2 FAIL: F-RAW-2: banner seen` (BR:48); `ROW R18-F-RAW-2 FAIL slice=B` (BR:49). Same reading as R18-F-RAW. |
| R18-F-RAW-DIR | B | FAIL (product finding) | `IDLE R18-F-RAW-DIR since-attach-ms=15006` (BR:52); `SAMPLER F-RAW-DIR polls=16 ... banner=seen` (BR:54); `ANSWER F-RAW-DIR BAD_PARAMS <message len=76>` (BR:55; 76 is K-raw-dir's length in Run 17b); `LEAKS F-RAW-DIR 0` (BR:56); `ROW F-RAW-DIR FAIL: F-RAW-DIR: banner seen` (BR:57); `ROW R18-F-RAW-DIR FAIL slice=B` (BR:58). Same reading as R18-F-RAW. |
| R18-UP-RACE-A | B | PASS | `RACE ON pressed 1602 after last reply` (BR:72; rule: at least 1 600). `RACE P=1764 ms from ready; calls=120` (BR:197). 120 `CALL` lines (BR:76-195): calls 1-12 `ok`, calls 13-120 `DISARMED`. Discrimination: at least one `ok` and one refusal (12 and 108), so not NOT DISCRIMINATING. P + 1 000 = 2 764 ms; the last `ok` started at 1651 ms (`CALL 12 start=1651 reply=1665 ok`, BR:87), so no call that started at or after P + 1 000 answered `ok`. `RECORD R17-UP-RACE-A first-refusal-after-P=38 ms` (BR:198; call 13 starts at 1802, 1802 - 1764 = 38). `RECORD UP-RACE-A page-files=1` (BR:196). `ROW UP-RACE-A PASS: every clause holds` (BR:199), `ROW R18-UP-RACE-A PASS` (BR:200); the exact K-disarmed refusals and the mark pairs are inside that line (the runner prints the codes only in the `CALL` lines). Run 17b's FAIL was 98 calls `ok` after P + 1 000. |
| R18-UP-DEVT | B | NOT MEASURED | `CHECK devtools-ui key=F12 found=pane` (BR:208): the key found the DevTools pane. `ANSWER UP-DEVT control1 ok` (BR:212); `DEVT liveB18 control1 ok attached=no` (BR:215). The sheet: the control's K-devt proves DevTools is attached, otherwise "NOT MEASURED, never a product failure". `ROW R18-UP-DEVT NOT MEASURED: DevTools was not attached` (BR:217). `ANSWER UP-DEVT upload ok` (BR:213) and `control2 ok` (BR:214) are recorded, not judged (ROOT is in the Upload folders, so the upload answering `ok` is not a file from outside them). Window X closed (BR:218). The second run in which F12 into window X did not attach (Run 17b was the first). |
| R18-RESTORE | A | PASS | `RESTORE armed=equal evaluate=equal blocklist lines=0 hash=equal uploadfolders lines=0 hash=equal` (A2R:145); `CHECK UP-RESTORE stored PASS` and `daemon PASS` (A2R:146-147); `RULES 0` (A2R:153); `RESTORE read-back: stored page equal true, daemon.status equal true, title armed true` (A2R:143); `ROW R18-RESTORE PASS slice=A` (A2R:155). |
| R18-RESTORE | B | PASS | `RESTORE armed=equal evaluate=equal blocklist lines=0 hash=equal uploadfolders lines=0 hash=equal` (BR:257); `CHECK UP-RESTORE stored PASS` and `daemon PASS` (BR:258-259; BE:243-244); `RULES 0` (BR:265); `ROW R18-RESTORE PASS slice=B` (BR:267, BE:248). |
| R18-LOGS | A | FAIL (as written, #349) | `CONSOLE liveA18 capture=console-liveA18.txt texts=679 control-disarmed=3` (A2R:157): the capture holds the control line (R1.2 below). `SCAN console: ://=0 (fixture 0, other 0) token=0 sentinel=0 profile=0` (A2R:158). `SCAN daemon: ://=0 (fixture 0, other 0) token=0 sentinel=0 profile=0` (A2R:161). **`SCAN actors: ://=1 (fixture 1, other 0) token=0 sentinel=0 profile=2`** (A2R:163), then `CHECK R18-LOGS scan actors FAIL: STOP: a non-zero count (non-fixture URL, token, sentinel or profile path)` (A2R:164). The rule says every non-zero count of token, sentinel, profile path or non-fixture URL is 0; `profile=2` fails it. FAIL as written. **Cause (#349):** both matches are in the `sv-cycle` actor's tool result, an MCP agent's transcript in the wave's own output folder: (a) the MCP failure report's `Screenshot:` line, which names an absolute path under the user's home (the product's designed reply to a failed `browser_evaluate`, Step 8); (b) Claude Code's own `[Image: source: ...]` line for the image item, which the client writes and the product does not. The row is not re-judged and no match is excluded. |
| R18-LOGS | B | PASS | `CONSOLE liveB18 capture=console-liveB18.txt texts=677 control-disarmed=6` (BR:269). `SCAN console: ://=0 (fixture 0, other 0) token=0 sentinel=0 profile=0` (BR:270, `CHECK ... PASS: all counts zero` BR:271). `SCAN daemon: ://=0 (fixture 0, other 0) token=0 sentinel=0 profile=0` (BR:273-274). `R18-LOGS actors: no actor ran in this slice; nothing to scan` (BR:275). `ROW R18-LOGS PASS slice=B` (BR:276). The rule's "token that cannot be found is NOT MEASURED" does not apply: the scan printed `token=0`, not an error. |

**Slice-row lists.** PASS (10): R18-0 A and B; R18-BANNER-CTL A and B; R18-RESTORE A and B; R18-LOGS B; R18-UP-L1 A;
R18-SAVE-REFUSE A; R18-UP-RACE-A B. FAIL (6): R18-LOGS A; R18-UP-OPT A; R18-UP-6 A; R18-F-RAW B; R18-F-RAW-2 B;
R18-F-RAW-DIR B. NOT MEASURED (1): R18-UP-DEVT B. NOT RUN 0, NOT DISCRIMINATING 0, RECORD 0. 10 + 6 + 1 = 17.
By row id: PASS (6) R18-0, UP-L1, BANNER-CTL, SAVE-REFUSE, UP-RACE-A, RESTORE; FAIL (6) UP-OPT, UP-6, F-RAW, F-RAW-2,
F-RAW-DIR, LOGS; NOT MEASURED (1) UP-DEVT. 6 + 6 + 1 = 13.

**R1.2: the control line, from each slice's own committed console file.** Command `grep -n "safety: disarmed by the user"`:
- liveA18: `A2C:688` `safety: disarmed by the user`; `A2C:692` the same line again (A2C:689 is the same text with the
  console's "Stack table collapsed" suffix). Three lines, as `control-disarmed=3` says.
- liveB18: `BC:625` and `BC:629`, `BC:682` and `BC:686` `safety: disarmed by the user` (with the suffix on BC:626 and BC:683).
  Six lines, as `control-disarmed=6` says.

**R18-0 (g): the build each slice ran.** HEAD per slice: A `b8b493d` (A2R:16), B `4a46a22` (BR:16), each `tree=clean`. Both
contain S2a, S2b, S3a, S3b and S4a, checked with `git merge-base --is-ancestor <commit> <HEAD>` (exit 0 means ancestor):

| Commit | What | Ancestor of `b8b493d` (A) | Ancestor of `4a46a22` (B) |
|---|---|---|---|
| `e481efe` | S2a | exit 0 | exit 0 |
| `9921715` | S2b | exit 0 | exit 0 |
| `e835eb5` | S3a | exit 0 | exit 0 |
| `beaa805` | S3b | exit 0 | exit 0 |
| `c9bb6cb` | S4a | exit 0 | exit 0 |
| `3008f55` | §4.26 | exit 0 | exit 0 |
| `db3f82e` | S6 of Step 11b | exit 0 | exit 0 |

Note (not judged): the sheet's open item 3 expected Run 18 to run before S2a; #340 ruled that S1-live starts after S2a
lands, so both builds carry the Step 12 extension code up to S4a. S4a's commit subject says "pure, unwired", so its
keeper does not run in these builds. `b8b493d` changes recipes only (LIVE §2).

## 2. The attempts (the ledger is `LED`)

| Attempt | Returned | Files |
|---|---|---|
| liveA18 att1 (HEAD `e1e68e0`, out `a1`) | Exit 2 inside `r18-up-opt`, a helper fault: `STOP: the wave ended (an exception in block r18-up-opt (ParameterBindingArgumentTransformationException; message withheld (id ParameterArgumentTransformationError,Get-S9Options)))` (A1E:53, A1E:63). Before it: R18-0 PASS (A1E:38), `ROW UP-L1 PASS: all checks hold` (A1E:42), `BANNERCTL liveA18 leg=neg idle-ms=15074 polls=17 banner=none` and `leg=pos answer=ok polls=16 banner=seen` (A1E:49-50), `ROW R18-BANNER-CTL PASS slice=A` (A1E:51). Restore: `RESTORE uploadfolders lines=0 hash=equal` (A1E:59) and read-back equal (A1E:61). Cause: the fix round 1 finding (a result variable `$o2` overwrote the window handle `$O2`; PowerShell names ignore case); fixed in `b8b493d`. **Recorded, not judged.** | `A1E`, `A1R`, `RUN-A1` |
| liveA18 att2 (HEAD `b8b493d`, out `a2`) | Exit 2 in `r18-logs`, after every measuring block: `CHECK R18-LOGS scan actors FAIL: STOP: ...` (A2E:92) and `STOP: the wave ended (an exception in block r18-logs (RuntimeException: node s11b scan18 ended in a STOP))` (A2E:94). Restore equal first (A2R:145). Judged here. Ruled by #349. | `A2E`, `A2R`, `A2C`, `RUN-A2` |
| liveB18 att1 (HEAD `4a46a22`, out `b1`) | Exit 0, no STOP line (`grep -n STOP` on `BE`, `BR`, `BC`: no match). `SLICE liveB18 done: calls with a failed check 3, not measured 1 (the rows are in the record)` (BE:264); `CHECK rows n=19 verdict=FAIL` (BE:259). Judged here. | `BE`, `BR`, `BC`, `RUN-B1` |

Fix rounds used 1 of 3; runner attempts liveA18 2 of 3, liveB18 1 of 3 (`LED`). The liveB18 step agent ended its turn on its
running runner and wrote nothing up; a fresh step agent wrote `LIVE` section 8 afterwards (#350). Nothing listened on 9234 or
8080-8089 at 03:05Z on 2026-10-28 (the session agent; `LIVE` section 8).

## 3. Exit checks R1.1-R1.7

| Check | Verdict | Evidence |
|---|---|---|
| **R1.1** §4.26 committed before the first observation | met | `git log -n1 --format='%h %cI %s' 3008f55` prints `3008f55 2026-10-27T19:37:39+04:00 docs(e2e): S1-sheet — Run 18's §4.26 rows (verifier: PASS-with-notes)`, which is 15:37:39Z. The first timestamped line in the committed evidence is `2026-10-27T20:32:23.962Z` (A1E:22), 4 h 55 min later. §4.26 is identical at `3008f55` and HEAD (md5 of the extracted section equal). |
| **R1.2** each slice's capture holds its own control line, quoted | met | Above: `A2C:688, 692`, `BC:625, 629, 682, 686`; `control-disarmed=3` (A2R:157) and `=6` (BR:269). |
| **R1.3** R18-BANNER-CTL judged by its rule; banner clauses judged as it decides | met | Both controls PASS (A2R:37-39; BR:29-31); the banner clauses of R18-UP-6, R18-F-RAW, -2 and -DIR are judged on their own slice's control and stand (FAIL, not NOT MEASURED). |
| **R1.4** every carried row judged by its pre-written rule | met | The carried rows are R18-UP-L1, -UP-OPT, -UP-6, -SAVE-REFUSE, -F-RAW, -F-RAW-2, -F-RAW-DIR, -UP-RACE-A, -UP-DEVT, -RESTORE and -LOGS (11), each with one verdict in section 1: PASS 4 (UP-L1, SAVE-REFUSE, UP-RACE-A, RESTORE), FAIL 6 (UP-OPT, UP-6, F-RAW, F-RAW-2, F-RAW-DIR, LOGS), NOT MEASURED 1 (UP-DEVT); 4 + 6 + 1 = 11. A FAIL or NOT MEASURED is a verdict, not a failure of this check. The two rule changes (UP-OPT's 15 s poll, UP-RACE-A's ON press) are the only ones in §4.26 (#320). |
| **R1.5** found state read back equal by hash in each slice, none printed | met | A `RESTORE armed=equal evaluate=equal blocklist lines=0 hash=equal uploadfolders lines=0 hash=equal` (A2R:145); B the same (BR:257). Only the empty text's hash is printed (in `STATE` lines, A2R:5). |
| **R1.6** R18-LOGS by count in each slice | met (the check is applied); the row result differs | A: console 0, daemon 0, actors `profile=2` (A2R:158, 161, 163): R18-LOGS A FAIL. B: console 0, daemon 0, no actor (BR:270, 273, 275): PASS. |
| **R1.7** every STOP or guard line matched to a return in the ledger | met | liveA18 att1: `A1E:53` and `A1E:63` = `LED` lines 6-10 (the runner returned; restore read back equal; teardown exit 0). liveA18 att2: `A2E:92`, `A2E:93`, `A2E:94` = `LED` lines 18-23 (the runner returned; restore equal first). liveB18: no STOP line, so none to match; no guard line printed (every `IDLE` is over 15 000 ms: BR:34, 43, 52 and A2R:71). `grep -n STOP` over all `S1-live-evidence-*`, `-record-*`, `-console-*` also matches copies of the same two events: in the record stream A1R:85 (att1) and A2R:164, 165, 171 (att2), and A2E:1 (`EXIT 2 (STOP, block r18-logs)`); A1E:53 holds only `WAVE stopping`. They are the same two events, so both still match the ledger's two returns. |

## 4. Product findings (a carried row FAIL with a passing control)

Per §4.26, #349 and phase doc § STOP rules ("Continues anyway"): recorded, proposed, no STOP, nothing re-run or re-tuned.

**F1. R18-UP-OPT: O2 never showed the saved text in 15 s.** `OPT O2 shown=no at=none polled-ms=15136` (A2R:58); the
other clauses held (the judge's order, section 1). Run 16: 6 061 ms; Run 17b: 6 105 ms and no record of whether it ever
showed; Run 18 adds the datum: not within 15 s, in the one measurement. Cause not established: the evidence does not
separate the options page's cross-window update from the poll that reads it (the poll is the helper S1-helpers-b wrote and
its fix round 1 touched the handle it uses). §4.26's control list names no control for this row; #349 calls it "with a
passing control", and this record follows #349's wording (judgment call 2).

**F2. The banner on R18-UP-6 and R18-F-RAW, -F-RAW-2, -F-RAW-DIR.** The control passed in both slices (neg `none` at
15 064 and 15 050 ms of idle, pos `seen`), the idle before each banner row was over 15 000 ms, and each row's answer, page
and leak clauses held, but the sampler read `banner=seen` on UP-6's five legs (A2R:73-81) and on the three F-RAW rows
(BR:36, 45, 54). In F-RAW the answer (`BAD_PARAMS`, 80, 80 and 76 characters) comes before any debugger attach (G-24).
Cause not established; the sheet's Known limits said a passing control only licenses reading the clause, it does not
explain Run 17b's reading.

**What UP-6's `missing` and `relative` legs establish.** §4.26 says these legs are the SDK's preflight refusals, send no
call and attach nothing, "the sampler's own negative evidence for the control". Run 18 read them `banner=seen` (A2R:75,
77) with `IDLE R18-UP-6 since-attach-ms=27011` and a passing control (A2R:37-39). That establishes: (1) in this row the
sampler can read `seen` in a window around a leg the SDK refuses before any call, even when its empty-window control reads
`none`; so a `seen` on a leg is not by itself evidence that this leg attached the debugger. (2) It does not make the row
pass: the pre-written rule is "no banner sample positive in the window" for every leg, and the control passed. (3) It does
not say where the banner came from. Facts the record shows and does not interpret: the five legs ran in one row, about
3.3 to 3.5 seconds apart (A2R:73, 75, 77: 20:48:34.8, :38.2, :41.7), and the 15 s idle guard applies once, before the
first leg; the first leg (`outside`) is a real call to the extension. No cause is claimed.

**F3. R18-UP-DEVT stays NOT MEASURED** (not a product finding: the sheet says never a product failure). F12 into window X
found the pane (`found=pane`, BR:208) but control 1 answered `ok`, so DevTools was not attached through the debugger. This
is the second run (after Run 17b) in which the helper's method did not attach. The G-22 question stays open.

**F4 (already ruled, listed for completeness). R18-LOGS A `profile=2`.** #349: (a) is a product finding for the user (an
MCP failure report names an absolute path under the user's home; whether it should name only the file is the user's to
rule), (b) is the client's line. Recorded as FAIL as written.

## 5. Plan-side notes and helper notes

**Plan-side (notes only; §4.26 is not edited):**
1. §4.26's prologue lists the console capture before the reload. Only reload-then-capture works (S1-helpers-c finding,
   #348); the runner does that (BE:18-29 shows `BLOCK reload` before `BLOCK console`).
2. §4.26's stated cause for the old scanner's false `non-fixture ://` FAILs, "the extension's own page URL" (and S7-run-record
   §5 item 8), is wrong: the false FAILs came from the helpers' own `SCAN ...: ://=` text and from `127.0.0.1:8081`
   (#346). The Run 18 scanner printed `://=0` or a fixture-only count throughout.
3. The STOP list in §4.26 names a pattern leak, but no R18-LOGS count looks for one: pattern leaks are not counted in Run
   18 (S1-sheet verifier note N-b).
4. Open item 3 of §4.26 (the build under test) is settled by #340: HEAD per slice is in section 1, with S2a to S4a inside.

**Helper notes (recorded, not fixed here):**
1. `WARN row printed twice: RULES` (BE:258, BR:277), counted once. The five preflight ROW lines (`RD-0 (a)`, `RULES`, `RD-0
   (c)`, `RD-0 (d)`, `R17B-0 (e)(f)`) are printed twice in each slice (BE:32-45 and 47-58); the aggregator warned on `RULES`
   only. `RULES` also prints once more at R18-RESTORE (BE:246-247).
2. The R18-UP-OPT ROW wording ("showed the saved text after 15136 ms" with `shown=no`) contradicts the OPT line.
3. The pending lines `CHECK R18-UP-L1 console-clause pending R18-LOGS` (A2R:25) and `CHECK R18-SAVE-REFUSE console-clause
   pending R18-LOGS` (A2R:106) are never resolved by the runner when R18-LOGS stops, so neither row prints a final ROW line.
4. RUN-A2 §3 says `ROW R18-0 PASS slice=A` does not appear in the runner's stdout; it does appear in the committed evidence
   (A2E:24) and record (A2R:17). This record judges from the committed files.
5. R18-UP-DEVT, second run: F12 into X found the pane and control 1 answered `ok` (section 1). The helper's method did not
   attach in two runs (BR:208, 215; Run 17b).
6. The upload in R18-UP-DEVT answered `ok` with no DevTools attached (`ANSWER UP-DEVT upload ok`, BR:213). ROOT is in the
   Upload folders, so this is the carried rule's normal case, not a file from outside; not judged.
7. `RUN-A1` did not produce a console evidence copy for attempt 1 (`A1E:5`); the copy for liveA exists for attempt 2 only.

## 6. Proposed decisions (agent-rules §5 format; the session agent decides)

### 2026-10-28 · R18-UP-OPT FAIL: measure before touching the options page
**Decided:** record R18-UP-OPT as a product finding (O2 did not show the saved text in 15 s, one measurement) and do not
change the 5 000 ms bound or any pass rule. Before any product change, a read-only investigator measures on its own page:
does a second options window ever show a saved Upload-folders text, after how long, and does the same poll read the right
control? A fix, if one follows, is a new row in Run 19. **Why:** cause not established; the helper's poll and the page are
both candidates. **Instead of:** a product fix now, or moving the bound (forbidden). **Revisit if:** the investigator shows
O2 updates in under 5 s with a corrected poll. **By:** Claude (proposed), for user review.

### 2026-10-28 · The banner FAILs (R18-UP-6, R18-F-RAW, -2, -DIR) stay open product findings with no cause
**Decided:** record the four rows as FAIL with a passing control and carry the question into Run 19 as new rows after S4b
wires the debugger keeper, with an instrument that can tell which call attached (a count the extension keeps, no URL, no
text) beside the sampler. No change to the sampler's window or the idle bound to make a row pass. **Why:** the sampler read
`seen` on legs that attach nothing (UP-6 `missing`, `relative`), so it cannot yet tie a banner to a call. **Instead of:**
a product fix on a cause nobody measured; dropping the banner clause. **Revisit if:** the instrument shows a debugger
attach during a refused `uploadFiles`. **By:** Claude (proposed), for user review (a new extension count touches the
logging and gate rules).

### 2026-10-28 · UP-DEVT: prove the attach method with its control before a row uses it
**Decided:** R18-UP-DEVT stays NOT MEASURED. A later attempt first runs a row-less probe: open DevTools by the chosen
method, then call `evaluate` until it answers `DEBUGGER_DEVTOOLS` or 15 s pass; only a method that passes the probe goes
into a row. F12 into window X is not retried as is (two runs, no attach). **Why:** twice the control answered `ok`.
**Instead of:** another row with the same method; a real-profile claim without the control. **Revisit if:** Run 19 or the
user supplies a method that attaches. **By:** Claude (proposed).

### 2026-10-28 · Helper fix: the UP-OPT row's wording, the pending console lines, the repeated preflight rows
**Decided:** a small recipes-only fix before the next live wave: (a) print `O2 did not show the saved text in <n> ms` when
`shown=no`, verdicts unchanged; (b) let the runner resolve `console-clause pending` lines (or print the two rows' final
verdicts) before R18-LOGS, so a stop in R18-LOGS leaves them judged; (c) print the five preflight rows once, so the
aggregator needs no `RULES` warning. **Why:** each cost this record a judgment call or a note. **Instead of:** leaving
them for S1-record to explain each run. **Revisit if:** none of these helpers runs again. **By:** Claude (proposed).

## 7. Judgment calls to check

1. **R18-UP-L1 and R18-SAVE-REFUSE console clauses (PASS).** Not an ambiguity: the sheet's words decide it. §4.26
   (`docs/e2e-test-plan.md:1747`) says R18-UP-L1's clause "console-scanned" "is met by **R18-LOGS' `SCAN console`** over
   liveA18's own capture (the file that holds this row's calls and the control line)", and (`:1751`) R18-SAVE-REFUSE's is
   "met by R18-LOGS over liveA18's own capture". Both name the console stream. The fallbacks are only "R18-LOGS (liveA)
   does not run or reads NOT MEASURED" (UP-L1: FAIL) and "is NOT MEASURED" (SAVE-REFUSE: NOT MEASURED). R18-LOGS (liveA)
   ran and read **FAIL**, which is neither, so no fallback fires. Clause to line: the console scan printed all zeros over a
   capture holding the control line (`SCAN console ...` A2R:158, `CHECK R18-LOGS scan console PASS` A2R:159, control line
   A2R:157), and the capture opened (A2E:5, 20:47:11Z) before UP-L1's calls. R18-LOGS' FAIL came from the actors stream.
   UP-L1's raw calls come from a script, not an actor. SAVE-REFUSE's own `sv-cycle` actor's tool result holds the
   `profile=2` path; only R18-LOGS' actors stream scans an actor's tool results, and none of SAVE-REFUSE's clauses is a
   path clause. So both verdicts follow the text and would hold whichever way the result fell.
2. **R18-UP-OPT as a "product finding with a passing control".** §4.26's control list has none for UP-OPT. The verdict
   (FAIL) does not depend on it; only the label does. #349 uses the label and this record follows it.
3. **Reading which clauses a printed line covers from recipe code** (`refusalStepJudge`, `judgeUpOpt`, `l1Step`, the F-RAW
   judge): the code was read only for that, and the verdicts do not depend on it: UP-OPT, UP-6, F-RAW* are FAIL on the
   printed banner or O2 line alone, UP-L1 and SAVE-REFUSE PASS on their printed clause lines.
4. **R18-LOGS row level.** Slice A FAIL and slice B PASS are two slice-rows; the row-level count shows R18-LOGS as FAIL (one
   failing slice). The slice-row count is in section 1.
5. **R18-UP-DEVT's upload `ok`** is recorded and not judged, because control 1 did not prove DevTools attached.
6. **liveA18 attempt 1 is not judged**, not even its R18-BANNER-CTL and R18-UP-L1 lines, which agree with attempt 2
   (A1E:42, 49-51). The S7-run-record precedent.
