# S7-run-record — Run 17b judged against §4.25

Written 2026-10-27 by the S7-record builder (Claude Sonnet 5.5, medium), docs only. Every judgment applies the sheet's own
pass rule (`docs/e2e-test-plan.md` §4.25, committed in `3cfbb95` before any observation, unchanged since: `git diff
3cfbb95 HEAD -- docs/e2e-test-plan.md` is empty) to the committed records. No expected text was edited or reinterpreted.
An ambiguity is noted beside its row and decided against the result, never for it. Words are the sheet's: PASS, FAIL,
RECORD, NOT RUN, NOT MEASURED, NOT DISCRIMINATING. A "likely cause" is given only from evidence and marked so.
`R2A` / `R2B` = `S7-live-run2A-record.md` / `S7-live-run2B-record.md` (line numbers); `A1` = `S7-live-run1A-record.md`;
`CON` = `S7-live-run2-console.txt` (liveB's capture only); `LIVE` = `S7-live.md`; `LED` = `S7-live.ledger.md`;
`RUN2` = `S7-live-runner2.md`. Judged from attempt 2 (HEAD `6f3413c`, build exit 0, reload by the recipe), the only attempt
that got past R17B-0; attempt 1 stopped inside R17B-0 (section 2). A row run in both slices (R17B-0, R17B-RESTORE,
R17B-LOGS) has one verdict, given when both slices agree.

## 1. Every §4.25 row (28 rows)

| Row | Verdict | Evidence (quoted from the record) | File |
|---|---|---|---|
| R17B-0 | PASS | line 1 `MANIFEST dnrWithHostAccess=true staticRuleSets=absent BUILD disk-s6-names=2/2 created-url=about:blank`; `RULES 0`; `STATE armed=true evaluate=true blocklist lines=0 … uploadfolders valid=0 invalid=0`; `TOGGLE reading on`; `FOUNDLIST blocks-fixtures=no`; `TABWATCH created-url=about:blank completes=1 first-complete-ms=6`; `S6 commit=ancestor`. Nothing pressed. Both slices alike. | R2A:1-15; R2B:1-15 |
| R17B-UP-L1 | FAIL | `FOUNDCHECK root=not outside=not`; `CHECK UP-L1 build PASS`, `raw-root PASS`, `raw-outside PASS` (the record prints the checks, not the raw codes). The refusal clauses hold. The sheet makes the console clause met by R17B-LOGS' `SCAN console`, and says that if R17B-LOGS reads NOT MEASURED, R17B-UP-L1 is FAIL. R17B-LOGS is NOT MEASURED (liveA's control line not retained), so this row is FAIL. Run 17: FAIL (that clause never ran). | R2A:16-22, 600 |
| R17B-CTL | PASS | `ROW RD-CTL concurrent 302 in 15 ms, 302 in 12 ms` (8083), `302 in 4004 ms, 302 in 4004 ms` (8086), idle socket held: yes; `CTL 8091 flip 200 then 302`; `HITS ctl redirect=0 blocked=1`; `CTL 8087 slow answered after 3066 ms` (≥ 3 000). 8088/8089 not started, as the sheet says. | R2A:23-30 |
| R17B-ACT-CTL | PASS | `HIST act-ctl built=3 pages activated=3`; `ACT act-ctl n=3 ok`; `back` pair: `ok` 11 ms, `ok` 12 ms; `forward` pair: `ok` 12 ms, `ok` 12 ms (the helper printed the whole verdict twice; one row); `RULES 0` after each. No STOP: the activation took through `chrome.debugger`. | R2A:31-62 |
| R17B-BACK-NOACT | RECORD | same three pages, no activation: `back` answered `INTERNAL` in 3 ms, message length 35 (the length of Run 17's "Cannot find a next page in history."; the text is not printed). Not `ok`, so the sheet's "activation not shown to be what decided" clause is not triggered. | R2A:63-78 |
| R17B-RD-2 | PASS | `open ok T2261` (98 ms); `TABROW R17B-RD-2 … found=yes hidden=blocked`; snapshot `DOMAIN_BLOCKED` with K-tab's exact text, 3 ms; **`HITS bd2 redirect=1 blocked=0`**; `RULES 0`; `TABWATCH created-url=about:blank completes=1 first-complete-ms=6` (recorded). `closeTab` of the handle answered K-tab (recorded, not judged). Run 17: `blocked=1`. | R2A:84-103 |
| R17B-NEWTAB-PLAIN | PASS | `open ok T2262`; snapshot `elements=29 counter="Click counter: 0"` (the playground, not an empty page); `HITS bnp blocked=0`; `RULES 0`; `TABWATCH created-url=about:blank completes=1 first-complete-ms=7`. The per-row URL class is not printed (the aggregate `url8081=3` only); not a clause of the pass rule. | R2A:109-128 |
| R17B-NEWTAB-LOAD | PASS | five trials, each `ANSWER ok`, `LAT` 3074, 3102, 3074, 3076, 3075 ms (all ≥ 3 000), `page=playground elements=29 snapshot=ok`, `HITS bnl<i> blocked=0`, `RULES 0`; RECORD per trial `completes=1 first-complete-ms=6 reply-ms` equal to `LAT`. The helper's interim line per trial reads `NOT MEASURED … blocked or RULES after not given`, followed by its own `PASS (by 3 clause checks)`; judged here from the raw lines above, all clauses hold. | R2A:134-243 |
| R17B-NEWTAB-REFUSED | RECORD | `newtab javascript:void 0` → `INTERNAL` "JavaScript URLs are not allowed in API based extension navigations. Use chrome.scripting.executeScript instead." (36 ms); `TABWATCH created-url=about:blank completes=1 first-complete-ms=6` (the path was reached); tab-row count `total=18` four times (twice before, twice after, 1 s apart) and `open-after tabs before=18 after=18`: the judged clause holds, no blank tab left. | R2A:321-332 |
| R17B-BACK | PASS | answer `DOMAIN_BLOCKED` (K-tab, the allowed alternative to `ok`), 37 ms (< 12 000); **`HITS bbk blocked=0`**; `FLIP bbk n200=1 n302=1 total=2` (two requests, so discriminating); `RULES 0`. `tabs.get().status` after `goBack`: NOT MEASURED (the SDK exposes no tab status; a RECORD clause). The record has no later `snapshot` line for the tab (not a pass-rule clause). | R2A:244-256 |
| R17B-FWD | PASS | first `forward` `ok` 33 ms; second `DOMAIN_BLOCKED` K-tab 37 ms; **`HITS bfw blocked=0`**; `FLIP bfw n200=1 n302=1 total=2`; `RULES 0`. No STOP line, so the two set-up `back` calls were `ok`. | R2A:257-271 |
| R17B-BACK-SAMEDOC | PASS | `ok` in 10 ms (< 1 000); `RULES 0` after. | R2A:272-282 |
| R17B-DISARM | PASS | `ANSWER DISARMED` with K-disarmed's exact message and its data; `RULES expect=1`, `samples=[1,1,1]` (= N), `after=0`; `HITS bdd redirect=1 blocked=0`; ON pressed 1577 ms after the reply (`PRESS ON timed from the reply`), OFF title in 72 ms; `wait-safety` reached `armed=true evaluate=true blockedCount=1` = G1's state (found 0 lines + BLK). The console line `safety: disarmed by the user` is not retained for liveA (see R17B-LOGS); R17B-DISARM is judged on the four clauses §4.25 lists after "unchanged:", not on that line. Run 17: FAIL (K-tab, ON too early). | R2A:283-315 |
| R17B-BACK-EMPTY | PASS | found list empty so it ran; `HIST be built=2 pages activated=2`; `back` `ok` 12 ms, `forward` `ok` 10 ms; `RULES samples=[0,0,0,0,0] max=0`; `after=0`. Run 17: STOP. | R2A:333-355 |
| R17B-RD-DL-SOCKET | PASS | twelve downloads `ok` (3017-3021 ms each, 69-byte files, no `.part`); `SOCKET samples=240 connected=240`; `RULES 0`; list restored (hash equal); `HANDSHAKE during call: not exercised` (recorded). Run 17: NOT RUN. | R2A:356-428 |
| R17B-UP-OPT | FAIL | The helper's printed wording (not a measurement): **`ROW R17-UP-OPT FAIL: O2 showed the saved text after 6105 ms, over 5 000 ms`**; the line before reads `standing x0, invalid items 2, warned items 0, O2 6105 ms`; `judgeUpOpt` checks its clauses in order and the O2 bound last (`recipes/s11b-rules.ts:804-816`), so a FAIL on the O2 time means every earlier clause passed (K-opt-stand once, the three summaries, the K-opt-rel/root/home items, the stored hash, nothing stored by typing, no conflict note). The `OPT observed` line (`standing x0, invalid items 2`) comes from Run 16's helper: `$S11Warning` is the pre-S0F-a text (`recipes/s11-win.ps1:24`, used at :276) and its invalid-item regex matches only typed lines 1-2 (:296); the judge re-reads its own inputs (`Get-S11bOptObs`, `recipes/s11b-win.ps1:411-419`). Measured about O2: it did not show the saved text within 5 000 ms. `Invoke-S11Opt` polls O2 only while elapsed time is under 6 s and, when the text never matches, sets `$o2Ms` to the elapsed time without recording whether it matched (`recipes/s11-win.ps1:278-283`; `$o2Eq` is not in the obs JSON, :306); the judge compares only `o2Ms > 5000` (`recipes/s11b-rules.ts:816`). Run 16's 6 061 ms and this run's 6 105 ms both sit just past the 6 s poll bound, a pattern that fits O2 never showing the text in the poll as well as a lag. Whether O2 ever showed the saved text is not measured in either run. The 5 000 ms bound stays. | R2A:429-457 |
| R17B-UP-6 | FAIL | all five legs `SAMPLER … banner=seen` (outside 35 polls, missing 34, relative 36, raw-dotdot 34, raw-notarget 36) and `ROW R17-UP-6 FAIL: outside: banner seen`. Measured: `missing` and `relative` are refused by the SDK before any call (§4.24 K-missing / K-relative: "SDK preflight, no call"), yet the banner was seen on them. Cause not established. Run 16: FAIL (its own `evaluate`). | R2A:458-476 |
| R17B-UP-7 | PASS | `CHECK UP-7 a-disarmed PASS: K-disarmed: exact, page untouched`; `b-blocked PASS: K-blocked: exact`; `c-folder-removed PASS: K-gate: exact`; each leg's state read back (`wait-safety` reached, `RESTORE … hash=equal`). | R2A:477-533 |
| R17B-SAVE-REFUSE | NOT MEASURED | SDK leg: `K-undef`, `K-node`, `K-map`, `K-cycle` exact, control keeps the prefix and names the error, no file and no `.part`; MCP leg: the same four contained and unprefixed, no file. Every clause but one has a printed CHECK line and holds. The console clause rests on R17B-LOGS' scan of liveA, whose control is not retained, so the row is NOT MEASURED. The helper's row line also reads `NOT MEASURED (0 verdict lines, none printed)`: its `VERDICT_LINE` (`recipes/s11b-r17b-rules.ts:152`, `ROW \S+ (PASS|...)`) accepts only a one-token row id, and the block prints `ROW SAVE-REFUSE-R sdk-leg PASS` (two tokens), so it counted 0 lines. | R2A:534-550 |
| R17B-F-RAW | FAIL | `ROW F-RAW FAIL: F-RAW: banner seen` (`SAMPLER F-RAW polls=35 … banner=seen`); `ANSWER F-RAW BAD_PARAMS <message len=80>` (80 = K-raw-missing's length for `paths[0]`), `LEAKS F-RAW 0`. The banner clause is part of the pass rule, so FAIL whatever the code. Cause not established. These legs are raw and do send a call to the extension (no SDK preflight, §4.24 F-RAW), so the UP-6 "no call was sent" observation does not carry over. Run 17: NOT RUN. | R2B:16-23 |
| R17B-F-RAW-2 | FAIL | `F-RAW-2: banner seen`; `BAD_PARAMS <message len=80>` (K-raw-missing, `paths[1]`); `LEAKS 0`. | R2B:24-31 |
| R17B-F-RAW-DIR | FAIL | `F-RAW-DIR: banner seen`; `BAD_PARAMS <message len=76>` (K-raw-dir's length); `LEAKS 0`. | R2B:32-39 |
| R17B-F-RAW-ENC | PASS | `ANSWER F-RAW-ENC ok`; `ROW F-RAW-ENC PASS: files, hashes, isTrusted and mark clauses hold` (aggregate line; the record prints no more). | R2B:40-44 |
| R17B-F-RAW-OK | PASS | `ANSWER F-RAW-OK ok`; `ROW F-RAW-OK PASS: files, hashes, isTrusted and mark clauses hold` (aggregate). | R2B:45-49 |
| R17B-UP-RACE-A | FAIL | `RACE P=1735 ms from ready; calls=120`; calls 1-11 `ok`, calls 12-22 `DISARMED` (start 1653-3151 ms), calls 23-120 `ok`; `ROW UP-RACE-A FAIL: 98 call(s) started at or after P + 1 000 ms answered ok` (calls 23-120 started ≥ 3303 ms, P + 1 000 = 2735). `first-refusal-after-P=-82 ms`; `RECORD UP-RACE-A page-files=1`. Likely cause (from evidence): the sheet's steps press ON 1.6 s after OFF (R2B:59-64: the ON press 1.583 s after the OFF press, title armed 1.656 s after it); the first `ok` after the refusals starts at 3303 ms, right after that press, so those calls ran with the bridge armed again. Calls started at or after P + 1 000 ms and before the ON press (20-22) were refused. The sheet's pass rule and steps contradict each other, the same shape as Run 17's RD-DISARM (#308). The row stays FAIL; the repair is a new row. Run 17: NOT RUN. | R2B:50-192 |
| R17B-UP-DEVT | NOT MEASURED | `KEY F12 pressed into window …` twice; `control1 ok`, `upload ok`, `control2 ok`; `NOT MEASURED: DevTools was not attached`. The control's `ok` (not K-devt) means DevTools was not attached to the tab, so the row measured nothing, as the pass rule says. Measured: control 1 answered `ok`, so DevTools was not attached to the tab (it may have opened without attaching); cause not established. | R2B:193-209 |
| R17B-RESTORE | PASS | both slices: `RESTORE read-back: stored page equal true, daemon.status equal true, title armed true`; `RESTORE armed=equal evaluate=equal blocklist lines=0 hash=equal uploadfolders lines=0 hash=equal`; `RULES 0`. Found-text files deleted after the match. Afterwards `daemon.status` safety `armed=true evaluate=true blockedCount=0` (`RUN2` §4). | R2A:551-596; R2B:210-255 |
| R17B-LOGS | NOT MEASURED | liveA: `SCAN console: ://=0 … token=0 localhost:8085=0 … profile=0` (probes as printed; "…" marks omitted ones) (1675 console texts), `SCAN daemon` all 0, `SCAN actors: ://=1 (fixture 1, other 0)` rest 0, `chrome-blocked lines redacted=0`. liveB: `SCAN console` and `SCAN daemon` all 0, no actor ran. liveB's control is retained: `CON` holds `safety: disarmed by the user` / `safety: armed by the user` twice (lines 643-649, 700-709). **liveA's raw capture was overwritten by liveB's** (one path), so its control line cannot be checked here; the helper's judge returns NOT MEASURED when the line is absent (`recipes/s11b.ts:456`) and printed PASS, and the OFF titles are in R2A:297 and 558. The sheet needs the capture to hold R17B-DISARM's `safety: disarmed by the user`, else NOT MEASURED; no printed line in R2A names the control, and a helper's verdict is not on the §4.24 list of evidence kinds (a refusal's code and message, a server-log count by query tag, a rule count, the page's own reporter, a UIA read). The row has one verdict only when both slices agree; liveA's control is unproven, so NOT MEASURED. Counts are 0 in both slices. | R2A:597-607; R2B:256-265; CON |

Counts over the 28 rows (re-counted by listing): PASS = R17B-0, CTL, ACT-CTL, RD-2, NEWTAB-PLAIN, NEWTAB-LOAD, BACK, FWD,
BACK-SAMEDOC, DISARM, BACK-EMPTY, RD-DL-SOCKET, UP-7, F-RAW-ENC, F-RAW-OK, RESTORE = 16; RECORD =
BACK-NOACT, NEWTAB-REFUSED = 2; FAIL = UP-L1, UP-OPT, UP-6, F-RAW, F-RAW-2, F-RAW-DIR, UP-RACE-A = 7; NOT MEASURED = UP-DEVT,
SAVE-REFUSE, LOGS = 3; NOT RUN = 0; NOT DISCRIMINATING = 0. 16 + 2 + 7 + 3 = 28. **PASS 16, RECORD 2, FAIL 7, NOT MEASURED 3,
NOT RUN 0, NOT DISCRIMINATING 0.** (Counting by liveA/liveB id, with R17B-0, RESTORE and LOGS once per slice, gives 31 judged
slice-rows: R17B-0 and RESTORE add 2 PASS and LOGS one NOT MEASURED.) RECORD clauses not measured inside PASS rows: `tabs.get().status` after
`goBack` (R17B-BACK, R17B-FWD), the `tabs.get` ahead of its event case of #313.

## 2. The attempts (the ledger is `LED`)

| Attempt | Returned | File |
|---|---|---|
| 1 (06:42Z) | STOP inside R17B-0 after (a) and the toggle read, before any state change: `ParameterBindingArgumentTransformationException` in `Test-S11Own` (`A1:15`). Cause, measured by the step agent and verifier 1: a `-File` script's top level is the global scope, so a top-level `$o` replaced `$global:O`. No `STATE` line, no pressed button in the record. Fix `6f3413c`; #317. | `S7-live-run1A-record.md`, `S7-live-runner1.md` |
| 2 (06:57-07:10Z) | liveA17B exit 0, liveB17B exit 0 (toggle read `on`), no `STOP` line in either record (`grep STOP` on R2A, R2B, CON: no match); RESTORE equal in both slices. | `S7-live-run2A-record.md`, `-run2B-record.md`, `S7-live-run2-console.txt`, `S7-live-runner2.md` |

## 3. Exit checks D7.1-D7.7

| Check | Result | Evidence |
|---|---|---|
| D7.1 §4.25 committed before the first observation | met | `3cfbb95` 2026-10-27T09:17:31+04:00 (05:17Z); first record line `A1` 06:42:58Z; §4.25 unchanged since (empty diff). |
| D7.2 first line proves the permission and S6 | met | `MANIFEST … BUILD disk-s6-names=2/2 created-url=about:blank` and `S6 commit=ancestor`, R2A:1, 14-15 and R2B:1, 14-15. The `about:blank` is the behavioural proof of the loaded worker (the sheet's (f)). |
| D7.3 R17B-RD-2 0 blocked hits with the pre-written answer | met | `HITS bd2 redirect=1 blocked=0`; answer `ok T2261` = `{id, tab}`; snapshot K-tab (R2A:84-101). Run 17's RD-2 was 1. |
| D7.4 activated back rows 0 blocked hits, pre-written answers | met | R17B-BACK `blocked=0` (K-tab, 2 flip requests), R17B-FWD `blocked=0` (`ok`, then K-tab), R17B-BACK-SAMEDOC `ok`, R17B-BACK-EMPTY `ok`/`ok`. The set-up lines are not in the committed record (the `r17b-history` block writes to the framing file, `recipes/s11b-r17b.ps1:70`, `:236-238`), but the framing file outside the repo, `%TEMP%\bridge-e2e\s11b-r17b-2\r17b-framing.txt`, holds them (read by the fixer): `HIST bk built=2 pages activated=2` and `ACT bk n=2 ok`; `HISTORY fwd built navigations=3 backs=2`, `HIST fw built=3 pages activated=3` and `ACT fw n=3 ok`; `HIST sd built=2 pages activated=2` and `ACT sd n=2 ok`. Not committed. |
| D7.5 found state read back equal by hash, none printed | met | R2A:584-589, R2B:243-248; only the empty text's hash is in the record. |
| D7.6 R17B-LOGS by count | **not met** | R17B-LOGS is NOT MEASURED: counts 0 in both slices (R2A:600-606, R2B:259-263), but liveA's control line is not retained (R17B-LOGS row). |
| D7.7 every STOP or guard line matched to a return | met | the one STOP line (`A1:15`) is `LED` return 1; attempt 2 printed none. `LED` line 7 is stamped 07:10Z but precedes line 8 (06:56Z): a timestamp error in the ledger, no effect on the match. |

## 4. #313's "Revisit if" against R17B-NEWTAB-LOAD

#313: "Run 17b sees a `newTab` answer before the URL's load, or any N1 case". **No `newTab` answered before the URL's load.**
Five trials of the 3 s slow page: replies after 3074, 3102, 3074, 3076, 3075 ms (R2A:134, 157, 180, 203, 226), each
snapshot the playground (`elements=29`), `completes=1`, `first-complete-ms=6` (R2A:149, 172, 195, 218, 241). The other
five `newTab` calls of the wave (RD-2, NEWTAB-PLAIN, NEWTAB-REFUSED, R17B-0 (f) of both slices) also read `completes=1`
and `first-complete-ms` 6-7 with `created-url=about:blank`. N1's cases: a doubled blank `complete` (`completes` > 1) did
not occur; a blank tab silent over 2 s did not occur (6-7 ms); a `tabs.get` reading `complete` ahead of its event is
not observable from the console: **NOT MEASURED**. The trigger is not met; the third case stays open (no case forced).

## 5. Findings (runtime facts, as measured)

1. **Activation works through the bridge** (Run 17b, extension, 2026-10-27): `evaluate 1` (CDP `Runtime.evaluate`
   `userGesture: true` through `chrome.debugger`) before a tab leaves each page made `back`/`forward` answer `ok` 4 of 4
   (R17B-ACT-CTL, 11-12 ms); the same three pages without it answered `INTERNAL` in 3 ms, 1 of 1 (R17B-BACK-NOACT).
2. **A `back`/`forward` redirect hop was stopped** (`extension` back/forward with the tab rules held, R17B-BACK,
   R17B-FWD): the flip server saw 200 then 302 (`n200=1 n302=1`) and the blocked fixture 0 requests; the answer is
   K-tab (the post-check reads the blocked URL), 37 ms, `RULES 0` after. Measured once each. #310's "Revisit if: Run
   17b measures a back/forward redirect" is met by this.
3. **`newTab` with a URL no longer leaks its first request** (R17B-RD-2: redirect 1, blocked 0; Run 17: 1). Every
   `newTab` URL read `about:blank` at `tabs.onCreated` (10 calls over both slices); replies waited for the page
   (3074-3102 ms for a 3 s page). A refused `javascript:` URL answers `INTERNAL` with Chrome's text and leaves the tab
   count unchanged (18 to 18).
4. **The banner sampler reads positive on legs that send no call** (`recipes`, R17B-UP-6 `missing`/`relative`, the SDK
   preflight refusals, which send no call): its meaning as "the call raised the banner" is not supported. The three F-RAW legs
   also read positive; they are raw client calls that do reach the extension. Cause not established for any banner FAIL.
5. **R17B-UP-RACE-A's pass rule and steps contradict each other**: the sheet presses ON 1.6 s after OFF and fails any
   call started at or after P + 1 000 ms that answered `ok`; the 98 failing calls all started after the ON press.
6. **R17B-UP-OPT: O2 did not show the saved text within 5 000 ms** (6105 ms read; Run 16: 6061 ms). Whether it showed it at all is not measured: the helper's poll stops at 6 s and does not record whether the text matched (`o2Eq` is not written to the obs JSON).
7. **Evidence and helper gaps** (for a fix wave, not judged): liveA's console capture is overwritten by liveB's (one
   path); the `r17b-history` set-up lines go to the framing file; the aggregator's `VERDICT_LINE` accepts only one-token row ids, so it labels R17B-SAVE-REFUSE `NOT MEASURED`,
   and it prints `NOT MEASURED` beside each NEWTAB-LOAD trial's PASS; R17B-ACT-CTL and R17B-BACK-NOACT print twice; the O2 poll does not record a match (finding 6). R17B-UP-OPT's `standing x0, invalid items 2` line is Run 16's helper (pre-S0F-a warning text, two typed lines), not a failed clause.
8. The wave's scanner prints `non-fixture ://` FAILs on both records; the only such text is the extension's own page URL in
   `window … now shows` lines (`RUN2` §5).

## 6. Judgment calls to check

- R17B-LOGS NOT MEASURED, R17B-SAVE-REFUSE NOT MEASURED and R17B-UP-L1 FAIL: liveA's control line is not retained, and the ambiguity is decided against the result. If the session agent rules instead that a unit-tested helper's verdict counts as the control (a proposed decision for user review, not the default), R17B-LOGS, R17B-SAVE-REFUSE and R17B-UP-L1 become PASS (PASS 19, RECORD 2, FAIL 6, NOT MEASURED 1) and D7.6 is met. The record stands on the first reading.
- R17B-NEWTAB-REFUSED and R17B-BACK-NOACT are RECORD by the sheet's label although they carry a judged clause (as Run 17's RD-2).
