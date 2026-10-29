# S7-run-record: Run 19 judged against §4.27

Written 2026-10-29 by the S7-record builder (Claude Sonnet 5.5, medium), docs only. Every judgment applies §4.27's own
pass rules (`docs/e2e-test-plan.md` §4.27, rows committed in `a1b8544` on 2026-10-28; amended by its dated notes #358, #361-#365
before the first observation and #366 after it) to the committed records. No expected text was edited or reinterpreted. Where a
rule is ambiguous the choice was made against the result and is listed in section 7. Words are the sheet's: PASS, FAIL, RECORD,
NOT RUN, NOT MEASURED, NOT DISCRIMINATING (ND below, in full where it is a verdict). A cause is given only from evidence and
marked as such; "cause not established" means none is claimed. A verdict comes from the printed counts and the rule as amended,
never from an `ok` or a printed `ROW` word alone; where the two disagree the counts and the rule decide, and the row says so.

**Which attempt.** Each slice is judged from its last full attempt: liveA19 **attempt 3** (HEAD `922f757`), liveB19 **attempt 3**
(HEAD `3478261`, with attempt 2's verdicts beside it, #368), liveC19 attempt 1 (HEAD `0c42637`), liveD19 **attempt 2** (HEAD
`c55cf9d`), liveE19 attempt 1 (HEAD `772a53e`). Earlier attempts (liveA19 1 and 2, liveB19 1, liveD19 1) are in section 2:
recorded, not judged. The brief counted 56 row ids; the §4.27 tables hold **56 table rows and 58 ids** (counted by `grep`): the F-RAW row holds
three ids (R19-F-RAW, R19-F-RAW-2, R19-F-RAW-DIR). Separately, R19-CLOSER is a row-less probe (it prints `CLOSERPROBE`, no
`ROW`) and is judged from that line.

**Sources and aliases** (all in this steps dir; `A3E:n` = line n of that file; line numbers are those of the evidence files,
which hold every record line plus the block lines):
- `A1E`, `A2E`, `A3E` = `S7-live-evidence-liveA19-att1.txt`, `-att2`, `-att3`; `B1E`, `B2E`, `B3E` = `…-liveB19-att1`, `-att2`,
  `-att3`; `CE` = `…-liveC19-att1`; `D1E`, `D2E` = `…-liveD19-att1`, `-att2`; `EE` = `…-liveE19-att1`.
- Console captures: `A3C` = `S7-live-console-liveA19-att3.txt`; `B3C` = `…-liveB19-att3-1.txt`; `CC` = `…-liveC19-att1-1.txt`; `D2C3` =
  `…-liveD19-att2-3.txt`; `EC3` = `…-liveE19-att1-3.txt` (the last segments).
- `LED` = `S7-live.ledger.md`; `RA`-`RE` = the five step reports `S7-live-liveA19.md` … `S7-live-liveE19.md`; `INV` =
  `S7-record-investigator.md` (its nine cause readings; every cited line was re-read here before use: the evidence lines, the
  driver lines `recipes/s12-r19-a.ts:192, 373-375, 439, 502-516`, `recipes/s12-r19-c.ts:81-83, 94-96`, `recipes/s12-r19-de.ts:28, 95`,
  the MCP's own lines `sdk/src/error.ts:119-124`, `daemon/src/intercept.ts:41-45`, `extension/src/console-messages.ts:168-177`,
  `extension/src/debugger.ts:268-272`, `docs/plans/…/Stage0-measurer1.md:36-37` and `stage0-m1-C.txt:216-244, 277-300`).
- Decisions cited: #356-#372 in `docs/decisions.md`. Recipe code was read only to learn what a printed `CHECK`, `LEG` or `ROW`
  line covers, and for the investigator's readings.
- Evidence holds only counts and fixed words. No hash is printed here: "hash=equal" is the evidence's own wording.

## 1. Every §4.27 row (58 ids, 74 slice-rows)

Row-level counts: **PASS 42, FAIL 5, NOT DISCRIMINATING 5, NOT MEASURED 3, RECORD 3, NOT RUN 0** (42+5+5+3+3 = 58).
Slice-row counts: **PASS 58, FAIL 5, NOT DISCRIMINATING 5, NOT MEASURED 3, RECORD 3, NOT RUN 0** (= 74). The lists end this section.

**The five controls first.** R19-BANNER-CTL passed in A, B and C (negative `none`, positive `seen`, `evaluate` `ok`, idle >= 20 000
ms: A3E:133-134, B3E:188-189, CE:142-143), so **no banner clause of the run is NOT MEASURED**; every banner clause stands as
printed. Each of R19-0's five runs printed `ROW R19-0 PASS slice=<A..E>`.

### 1a. Slice A (liveA19 attempt 3; `A3E`)

| Row | Verdict | Clauses and counts |
|---|---|---|
| R19-0 | PASS | Line 106 `MANIFEST … BUILD disk-s6-names=2/2 created-url=about:blank`; line 107, the next line, **exactly** `LOADED consoleMessages=answered entries=11 console=10 exception=1 args=answered`; then `RULES 0` (109), `STATE armed=true evaluate=true …` (111, 113), `TOGGLE reading on` (112, nothing pressed), `FOUNDLIST blocks-fixtures=no` (116), `S6 commit=ancestor` (120), `HEAD 922f7572e3ac tree=clean` (122), `ROW R19-0 PASS slice=A` (123). Page reporter `logged=10 thrown=1` is not printed; 11/10/1 is its count. |
| R19-BANNER-CTL | PASS | `IDLE … since-attach-ms=20002` (131), `BANNERCTL liveA19 leg=neg idle-ms=20002 polls=16 banner=none` (133), `leg=pos answer=ok polls=16 banner=seen` (134), `ROW … PASS slice=A` (137). |
| R19-ARGS-1 | **FAIL** (cause named; finding 1) | SDK: `v1-sdk … value-equal=no json-equal=yes` (140), v2-v5 `yes/yes` (142-148), `total table=5 value-equal=4 json-equal=5 via=sdk` (150). MCP: `via=mcp value-equal=5 json-equal=5` (151). Controls: `control-1 ok` (152), `control-2 ok` (153) with `kind=undefined` (154); control-2 judged **PASS by #366** (the old build's raw twin read `kind=undefined`, D2E:166; D1E:165). `LEG table FAIL`, `clauses=3 failed=1` (155-156). The rule: "0 of the 5 differing in key order". Cause (INV item 1, re-checked): the SDK compare is order-sensitive (`recipes/s12-r19-a.ts:192`); `value` is the in-page serialiser's result fetched with `returnByValue: true` (`extension/src/debugger.ts:268-272`), and Chrome's `returnByValue` sorts object keys (Stage 0, `Stage0-measurer1.md:36-37`, which names today's product evaluate too); the MCP prints `description`, built by `JSON.stringify(value, null, 2)` in page order (`extension/src/evaluate/serialize.ts:374`). Only TABLE[0] has more than one key, which fits 4 of 5. `json-equal=5/5` shows the page received every value exactly. Pre-existing, not an `args` defect (judgment call 1). Same reading in attempt 2 (A2E:150-151). |
| R19-ARGS-2 | PASS | Eleven `ARGSREF … code=BAD_PARAMS exact=yes data=none` with `sent=0` for nine and `sent=1` for `raw-big` and `notfn` (160-170); `ARGSREF total refusals=11 exact=11 data-none=11 sent=2 effects=0 control=1` (172); `EFF before=1 after=1` (173); `semicolon PAGE_ERROR` recorded (171); `LEG refusals PASS` (174). |
| R19-ARGS-GLOBAL | PASS | `GLOBALS … args=absent fn=absent new-own-keys=0` (179); `LEG globals PASS` (180). |
| R19-ARGS-CSP | PASS | `ANSWER … calls ok` (185), `LEG csp PASS` (186). The control (`page eval: BLOCKED`) prints `LEG control NOT MEASURED` when it fails (`s12-r19-a.ts:269`); none was printed. |
| R19-ARGS-STOP | PASS | `STOPCALL … answer=TIMEOUT ms=1516 bound-ms=1500 usable=yes next=exact` (191): 1 500 <= 1 516 <= 3 500. |
| R19-CON-1 | PASS | `all entries=11 console=10 exception=1 sentinel=11 url=0 stack=0 … uncaught-first=yes ordered=yes` (197); `limit3 entries=3 … newest=yes` (199); `error entries=2 console=1 exception=1` (201); `clauses=3 failed=0` (203). |
| R19-CON-2 | PASS | `errors entries=2 console=1 exception=1 sentinel=2 url=0 stack=0 uncaught-first=yes` (207). |
| R19-CON-REJ | PASS | `rej entries=1 console=0 exception=1 sentinel=1 url=0 stack=0` (213). |
| R19-CON-BIG | PASS | `big entries=1 console=1 … maxlen=2000 cut=1` (219). |
| R19-CON-NAV | PASS | `nav entries=2 console=2 exception=0 sentinel=2 url=0 stack=0` (225). |
| R19-CON-MCP | PASS | `CONMCP all lines=11 form=11 truncated=no entries-via-sdk=11` (235), `error lines=2 form=2` (237), `limit3 lines=3 form=3` (239), `empty-text=exact` (241), `existing tools=5 ok=5` (243); banner `seen` as expected, idle 20 000, control pass (247); never a STOP. |
| R19-CON-CAP | PASS | `CONCAP lines=9 body-chars=18278 marker=yes first-index=1 last-index=9` (253): <= 20 000, one marker, the oldest lines, consecutive; `sdk-entries=200 more=191` (254): 9 + 191 = 200. The direction is #355's open question; recorded. |
| R19-CON-BANNER | PASS | `BANNERCON leg=neg … banner=none idle-ms=20003`, `leg=pos … banner=seen idle-ms=23517`, `leg=after … banner=none idle-ms=22889` (271-273); call `ok` (269); `verdict=PASS` (275). |
| R19-ARGS-3 | **FAIL** (the sheet's expected MCP text is wrong; not a product finding) | `sdk`, `raw`, `noargs` legs each `code=JS_DISABLED exact=yes data=none` (299, 301, 305); snapshot `ok` (307); `EFF before=1 after=1` (308, counts the MCP call too); idle 20 009 (298); banner `none`, control pass (312). **MCP leg `code=ok exact=no` (303), `LEG mcp FAIL` (304): FAIL.** The sheet's own Expected column asks that "the MCP leg's result text contains" the extension's JavaScript-off message, and the driver follows the sheet: it tests `mr.isError && mr.text.includes(MSG.jsOff)` (`s12-r19-a.ts:439`), so the reader is not wrong. The MCP never prints that text: `withSafetyRefusals` replaces it with the SDK's own line, `JS_DISABLED: the user has turned JavaScript off … Ask the user before relying on it; do not retry it.` (`sdk/src/error.ts:122-124`), pinned by `mcp/test/safety.test.ts`. The cause is an expected-text error in the sheet, not a product finding; a wrong row text leaves the row FAIL (decisions.md #195; #372's condition for ND, a reader shown wrong, is not met). The effect counter stayed 1 to 1 (`EFF`, 308), so the call did not run; the MCP's refusal itself is not shown by a print (the actor file is outside the repo and uncommitted). Plan-side note 2 and a later-wave row (section 6) carry it. The printed `ROW R19-ARGS-3 FAIL` (585) agrees with the rule (judgment call 2). |
| R19-CON-JSOFF | PASS | `CONREF … code=JS_DISABLED exact=yes data=none same-as=evaluate` (338); `mcp-refused=yes` (341); banner `none`, control pass (344). |
| R19-CON-3 | PASS | `CONREF … DOMAIN_BLOCKED exact=yes data=none same-as=snapshot` (364); `mcp-refused=yes` (367); banner `none`, idle 20 009 (370); block list restored `lines=0 hash=equal` (362). |
| R19-CON-FRAME | PASS | `a-pattern entries=2 console=2 …` (386), `a-nopattern entries=13 console=12 exception=1` (387; so leg a is discriminating: frames are read), `b-oop entries=2 console=2` (388); `clauses=2 failed=0` (391). |
| R19-CON-NOTEA | **FAIL** (product finding 2) | Blocked leg `entries=0 … url=0 stack=0 … marker=0` (405) meets its counts. **Allowed leg `entries=2 console=2 exception=0 sentinel=1 url=0 stack=0 maxlen=16 cut=0 … marker=0` (406)**: the rule wants `marker=1`; its RECORD branch covers `entries=1 marker=0` only, so `entries=2 marker=0` is FAIL (407-408). Cause (INV item 3, re-read; taken from Stage 0 and the code: no Run 19 line prints the entry's text): the fixture logged `{e: Error}` at load, so the entry is a replayed one; Chrome's replayed args carry no `preview` (`stage0-m1-C.txt:216-244`, an Object is `className`/`description: "Object"` only; live args do, `:277-300`), and `remoteText` adds `{e: …}` only when `preview.properties` is an array (`console-messages.ts:168-177`), so the entry reads `Object` and the Error's message is lost. `maxlen=16` is the sentinel entry. No URL or stack leaks. Side note: with no preview on replay the blocked leg cannot reach the preview-cut path (#344 (3)); its `entries=0` is real but not discriminating for that cut. |
| R19-CON-4 | **ND** | `CONREF … disarmed code=DISARMED exact=yes data=keys:scope same-as=snapshot` (432); `after ok` (437); banner `none`, idle 20 009, control pass (440). **MCP leg `mcp-refused=no` (435), `LEG mcp FAIL` (436): ND, the reader is shown wrong.** `judgeMcpRefusal` needs `r.text.includes(MSG.disarmed)` (`s12-r19-a.ts:373-375`), the extension's message with ", so every page call is refused"; the MCP's line is `DISARMED: the user has turned the bridge off in Chrome. Stop and ask the user to turn it back on; do not retry.` (`sdk/src/error.ts:119-120`), which cannot contain it. The sheet gives the MCP no text for this row (its expected text is the SDK leg's; "equal to the snapshot control's" was usable), so the reader chose the extension text on its own. Row ND. The printed `ROW … FAIL` (590) yields to the rule. |
| R19-CON-FLOOR | **ND** | `CONFLOOR disarmed-ticks=2 in-reply-disarmed=0 after-ticks=2 in-reply-after=2 exc-disarmed=1 exc-in-reply-disarmed=0 exc-after=2 exc-in-reply-after=2` (462), `LEG floor FAIL` (463). **Floor clauses pass by their counts:** 0 of 2 disarmed ticks and 0 of 1 disarmed errors in the reply; 2 of 2 after-ticks and 2 of 2 after-errors in it. **The precondition `disarmed-ticks >= 3` / `exc-disarmed >= 3` was not made:** the window is `[off + 500, on - 500)`; the driver waited 3 s (`s12-r19-a.ts:507`, comment "§4.27's step text … N1 left as the sheet says"), the off title to the ON press is 3.26 s here (A3E:453 to 460, 22.606 s to 25.868 s), against a page that ticks at 1 Hz. #361 (a dated note before any Run 19 observation, also in §4.27) amended the row's waits to 5 s and 3.5 s because 3 s leaves two judged ticks; the driver did not apply that pre-run note and kept the old 3 s and 2.5 s (instrument at fault), predicted before the run as N1 (`S7-drivers-A-verifier2.md`, MAJOR). The amended sheet's precondition was not made by the instrument, so ND, never PASS. Why only 1 error fell in the window against 2 ticks is not established. |
| R19-CON-OWN | PASS | `CONREF … own code=DOMAIN_BLOCKED exact=yes data=none same-as=snapshot` (478); banner `none` (482). |
| R19-CON-FILE | PASS | Toggle read `on` (82), so the row runs: `CONREF … file DOMAIN_BLOCKED exact=yes data=none same-as=snapshot` (499); banner `none` (503). |
| R19-RESTORE | PASS | `RESTORE armed=equal evaluate=equal blocklist lines=0 hash=equal uploadfolders lines=0 hash=equal` (540); `UP-RESTORE stored PASS`, `daemon PASS` (541-542); `RULES 0` (548); `DIALOGS liveA19 native=0 devtools=0 wave-windows-open=1` (551, the open window is the wave's own W, a record: #363); `ROW … PASS slice=A` (552). |
| R19-LOGS | PASS | `CONSOLE liveA19 segments=1 … texts=1277 control-disarmed=9` (556); `SCAN console … ://=0 token=0 sentinel=0 profile=0` (558); `SCAN daemon` zeros (560); `DAEMONLOG … sentinel=0 console-text=0 args-text=0` (562); `SCAN actors: ://=5 (fixture 5, other 0) token=0 sentinel=25 profile-other=0 shot-line=0 image-line=0` (570), `profile-all=0` (571); `SCANTOOL` sentinel > 0 only for `browser_console_messages` (25; 565), 0 for the other six tools (563-568); `ROW … PASS slice=A` (594). The rows with a console clause printed their `ROW` words after R19-LOGS (572-593). |

### 1b. Slice B (liveB19 attempt 3; `B3E`, attempt 2 `B2E` beside it)

| Row | Verdict | Clauses and counts |
|---|---|---|
| R19-0 | PASS | `LOADED consoleMessages=answered entries=11 console=10 exception=1 args=answered` (107, after `MANIFEST` 106); `HEAD 34782615724d tree=clean` (122); `ROW … PASS slice=B` (123). Attempt 2: B2E:107, 123. |
| (DEVPROBE, row-less; probe, not counted) | RECORD | `DEVPROBE method=uia-menu answer=ok ms=15476 attached=no` (137). All three menu steps `found=yes`, `devtools-ui found=pane` (130-133). Attempt 2: `ms=15365 attached=no` (B2E:133) with `step=menu-button found=no` (DevTools never opened). |
| R19-CLOSER | PASS | `CLOSERPROBE method=uia-owner opened=yes closed=yes ms=184 native-after=0` (145); att2 `ms=123` (B2E:141). |
| R19-UP-OPT | PASS | `OPT observed standing x1 invalid items 3 warned items 0` (165); `OPT O2 shown=yes at=353 polled-ms=353` (166): within 5 000 ms; `O2 front after-save=yes before-conflict-read=yes` (167) and `FIX R19-UP-OPT: …` (168), the fix named (#363, #364); `ROW … PASS` (178). Attempt 2: `at=362` (B2E:162). Run 18 read `shown=no` at 15 136 ms; the helper's poll was the cause (the UP-OPT investigator, #363). |
| R19-BANNER-CTL | PASS | `leg=neg idle-ms=20016 … banner=none` (188), `leg=pos answer=ok … banner=seen` (189), `ROW … PASS slice=B` (192). |
| R19-UP-6 | PASS | Five legs, each `IDLE >= 20 000` (206, 210, 214, 218, 222: 20 004, 20 002, 20 012, 20 000, 20 011) and `CHECK … PASS: <leg>: exact, page untouched, no banner` (208, 212, 216, 220, 224); `calls-sent` 1, 0, 0, 1, 1 (207, 211, 215, 219, 223); `BANNERCALL … banner=none control=pass` ×5 (227-239); `clauses=5 failed=0` (226). Run 18 read `seen` on all five legs 3.3 s apart. |
| R19-F-RAW, -2, -DIR | PASS ×3 | Each: `IDLE >= 20 000` (248, 264, 280), `CHECK … PASS: refusal: exact, page untouched, no banner` (250, 266, 282), `LEAKS … 0` (251, 267, 283), `BANNERCALL … banner=none control=pass` (255, 271, 287), `clauses=2 failed=0`, `ROW … PASS` (258, 274, 290). |
| R19-KEEP-1 | PASS (answers only) | `KEEPSEQ … calls=5 gap-ms=3000 answers=5/5 banner=continuous end-ms=10042 poll-ms=280` (297); `ROW … PASS banner-clause=NOT DISCRIMINATING` (301): PASS stands for the answers unchanged. The banner clause is ND by the sheet (no attach counter). Line-form note: `poll-ms=280` breaches the pre-registered expected line `poll-ms=<p<=250>` (att2: 247, B2E:293; att1: 319). `pollMsOf` is the largest gap between samples, so the banner-gap clause (`banner=gaps:<m>` fails the row) is NOT MEASURED at the sheet's resolution; it is already ND by the sheet, and the five answers are checked one by one (`answers=5/5`), so the verdict holds (judgment call 4). |
| R19-KEEP-2 | PASS | idle `end-ms` 10 132, 10 134, 10 104; ctl 4 988, 5 057, 5 028 (318-328); `medians idle=10132 ctl=5028 measured=yes` (329): difference 5 104 >= 3 500, ctl spread 69 <= 3 000, every end <= 25 000. Attempt 2: medians 10 021 / 5 050 (B2E:325). |
| R19-KEEP-3 | PASS | Six legs, each `next=` the refusal exactly (`DISARMED`, `DOMAIN_BLOCKED` ×4, `TAB_GONE`; 411-431); `end-ms` 6 344, 6 570, 6 800, 6 634, 6 708, 6 156: each within 2 000 ms of the ctl median 5 028 (largest gap 1 772) and each >= 2 500 ms below the idle median 10 132 (largest 6 800 <= 7 632); `clauses=12 failed=0` (435). `leg=replace NOT RUN — no deterministic trigger is sourced` (434; the row lists no such leg). No `kept-session-used`. `attach-after-disarm` and `attach-on-refused-page`: ND by the sheet (Open item 5). Attempt 2: 6 177-6 649 (B2E:407-427). |
| R19-CON-KEPT | PASS | `CONKEPT first=11 second=11 equal=yes ordered=yes` (439), sdk and mcp legs PASS (440-441); `ROW … PASS` (533, after R19-LOGS). |
| R19-KEEP-OVERLAP (leg a) | PASS | `OVERLAP … leg=evaluate first=ok second=DEBUGGER_DEVTOOLS exact=yes` (447). |
| R19-UP-DEVT | NOT MEASURED | `ROW … NOT MEASURED — DevTools was not attached` (453). DEVPROBE `answer=ok attached=no` (137): docked DevTools on Chrome 156 did not make `chrome.debugger` refuse (31 of 31 calls `ok` in the measurer's run, `S7-live-B-measurer.md`); #369. Not a product failure. |
| R19-KEEP-4 | NOT MEASURED | Same cause (456). |
| R19-SWEEP-HELD | NOT MEASURED | Same cause (464); no reload ran in this slice (one capture segment, 520). |
| R19-DEVT-NOFLAG | RECORD | `DEVNOFLAG probe=ok kept-then-devtools=not-run` (459): with DevTools docked and open, the probe was `ok`. |
| R19-RESTORE | PASS | `RESTORE armed=equal evaluate=equal blocklist lines=0 hash=equal uploadfolders lines=0 hash=equal` (505); `UP-RESTORE stored PASS`, `daemon PASS` (506-507); `RULES 0` (513); `DIALOGS liveB19 native=0 devtools=0 wave-windows-open=1` (516); `ROW … PASS slice=B` (517). |
| R19-LOGS | PASS | `CONSOLE liveB19 segments=1 … texts=936 control-disarmed=6` (521); console, daemon zeros (523, 525); `DAEMONLOG … 0` (527); `SCAN actors … sentinel=11 profile-other=0 shot-line=0 image-line=0` (531), `profile-all=0` (532); `SCANTOOL` sentinel > 0 for `browser_console_messages` only (529); `ROW … PASS slice=B` (534). |

**Attempt 2 and attempt 3 read the same verdict on all 24 rows** (`RB` A3.5). The readings that differ: DEVPROBE's path
(att2 never opened DevTools, `found=no`; att3 opened it, docked, and the bridge's `evaluate` was not refused), so UP-DEVT,
KEEP-4 and SWEEP-HELD are NOT MEASURED for two different reasons; CLOSERPROBE ms (123, 184); UP-OPT O2 (362, 353); KEEP-1
`poll-ms` (247, 280) and `end-ms` (10 122, 10 042); KEEP-2 medians (10 021 / 5 050, 10 132 / 5 028); KEEP-3 `end-ms` ranges.

### 1c. Slice C (liveC19 attempt 1; `CE`)

| Row | Verdict | Clauses and counts |
|---|---|---|
| R19-0 | PASS | LOADED line (107) as A; `HEAD 0c4263755169 tree=clean` (122); ROW (123). |
| R19-BANNER-CTL | PASS | `leg=neg idle-ms=20000 … none`, `leg=pos answer=ok … seen` (142-143), ROW (146). |
| R19-CLOSER | PASS | `CLOSERPROBE method=uia-owner opened=yes closed=yes ms=147 native-after=0` (154). |
| R19-CHOOSE-1 | PASS | `sdk ok … files=1 change=1 clicks=1 bytes-equal=yes dialog=0 ms=34` (163), `ref ok … files=1 change=1 clicks=1` (165); banner `seen` as expected, idle 20 014, control pass (168). |
| R19-CHOOSE-LABEL | PASS | `label ok files=1 change=1` (177), `input ok files=1` (179), `multi ok files=2 change=1` (181); `dialog=0`. |
| R19-CHOOSE-2 | PASS | idle 20 008 (208); `outside UPLOAD_REFUSED exact=yes files=0 change=0 clicks=0` (209), `missing BAD_PARAMS exact=yes files=0 change=0 clicks=0` (210); banner `none` (214). Leg (c) `NOT RUN — the file-URL toggle reads on (never pressed)` (207), as the sheet says. |
| R19-CHOOSE-3 | PASS | `none TIMEOUT exact=yes files=0 change=0 clicks=1 … ms=5022` (221): within 4 900-8 000. |
| R19-CHOOSE-REFUSE | **ND** | `picker`, `single`, `dir` each `BAD_PARAMS exact=yes files=0 change=0 clicks=1 dialog=0` (191-196). **Leg `dis` `TIMEOUT exact=no … clicks=1 … ms=5023` (197), `LEG dis FAIL` (198): ND (#370).** The page's button calls `click()` on a disabled input, which by the HTML spec does nothing, so no chooser opens and the product's disabled-input refusal (reached only after a chooser opens, `extension/src/upload-files.ts:457`) cannot be reached on that page on any build; it is proved by its unit tests. The printed `ROW … FAIL` (200) yields. |
| R19-CHOOSE-MCP | PASS | (a) `ok files=1 change=1` (231), (b) `ok files=1 change=1` (233), (c) `TIMEOUT exact=yes files=0` (235), (e) `form=run16` (237), (d) `JS_DISABLED files=0 clicks=0` (429); legs PASS; `ROW … PASS` (432). |
| R19-CHOOSE-KEPT | **FAIL** (cause not established) | `first ok files=1 change=1 clicks=1` (247); `second ok files=1 change=1 clicks=2` (248): the rule wants `change` +1 each, so 1 then 2; it read 1 then 1. `KEEPSEQ … answers=2/2 banner=continuous end-ms=10309 poll-ms=369` (249); `LEG kept FAIL` (250). Both calls: one page load, the same file into the same hidden input (`s12-r19-c.ts:219-229`; `judgeKept` wants change 1 then 2, `:81-83`). `files=1` fits both "the same file set again, so no `change`" and "the second set never reached the input"; the fixture counts `change` only. Nothing in the repo or evidence measures Chrome's behaviour for an unchanged selection. The inferred cause is not shown (#370). Other clauses pass: 2/2 `ok`, banner continuous (itself ND by the sheet's KEEP-1 limit), `dialog=0`. |
| R19-CHOOSE-FRAME | RECORD | `frame ok … files=1 change=1 clicks=1 dialog=0` (256), `reached-via=locator` (257); the activation reached the same-origin child frame's input. |
| R19-CHOOSE-HUMAN | RECORD | `received=clicked-input dialog=0 files=1` (271): the call's file went to the input the human-style click opened, not the call's target (the by-construction limit of #353 (a), now measured). |
| R19-CHOOSE-LATE | PASS | `opener-ms=4900 opened=yes dialog=0` (291); `opener-ms=5100 opened=no dialog=0` (295); answers `ok` / `TIMEOUT` (289, 293). |
| R19-KEEP-OVERLAP (leg b) | PASS | `leg=chooser first=TIMEOUT second=DEBUGGER_DEVTOOLS exact=yes` (303); `page-clicks=1` (304). |
| R19-CHOOSE-4 | PASS | Legs a, b, c: `before=0 after-click=1 after-close=0 ms=122/125/120 change=0` (332, 336, 340), preconditions met (331, 335, 339); answers `ok`, `TIMEOUT`, `BAD_PARAMS`. Chrome's own dialog opened after each call (R7.3), and the wave closed each. No `dialog-not-opened`. |
| R19-CHOOSE-DISARM | PASS | `none DISARMED exact=yes files=0 change=0 clicks=1 … ms=5025` (370): <= 7 000; `DIALOG … after-click=1 after-close=0` (372). `attach-after-disarm` ND (Open item 5). |
| R19-CHOOSE-JSOFF | PASS | `sdk JS_DISABLED exact=yes files=0 change=0 clicks=0` (400); control `ok files=1` (402); idle 20 006, banner `none`, control pass (406). The control's `clicks`/`dialog` are `not-measured` placeholders (403), not read by its rule. |
| R19-G2-1 | **FAIL** (cause not established) | `G2 … a-reply=34 b-reply=35106 gap-ms=35072 holder-after-reply-ms=477 a-effect=1 b=TIMEOUT` (440); `LEG raw FAIL` (442); the `focusFirst` variant `b-reply=35118` (443), recorded not judged. A answered `ok` first (34 ms), `holder-after-reply-ms=477` >= 450, `a-effect=1`; B did not answer (`b=TIMEOUT`, no `ok`), so the gap 35 072 meets >= 450 only because B never replied and carries no hold information. B's ~35.0 s fits the covered-window capture hang of `extension/CLAUDE.md:187-192` (`TIMEOUT` at 35 119 ms), but also any hang that runs to the 30 s timeout plus slack; no window rectangle or occlusion state is in the evidence, and G2-2, set up the same way, answered 15 of 15 B screenshots `ok`. The cause is not shown (#370); never PASS and not ND. |
| R19-G2-2 | PASS | Five rounds `sent=40 got=40 lost=0 b-calls=3 b-ok=3 b-lock-timeout=0` (454-463); `clauses=5 failed=0` (464). The clause "no B screenshot forwarded between A's focus and A's reply" cannot be observed live (the sheet says so); the row stands on 5 of 5 intact strings (evidence of no harm, not of the absence of an interleaving). The row's clauses (i) (no B call sent after A's send replies before A's reply + 450 ms) and (ii) (`lock.holder` reads A during the hold) are not printed as counts; they rest on the driver's leg judge (`judgeTypeRound`, `s12-r19-c.ts:112-114`, `holderSeen` from `:474`), whose only print is `LEG R19-G2-2 roundN PASS` ×5 (CE:455-463). |
| R19-RESTORE | PASS | `RESTORE … hash=equal` (507); stored and daemon PASS (508-509); `RULES 0` (515); `DIALOGS liveC19 native=0 devtools=0 wave-windows-open=1` (517); ROW (518). |
| R19-LOGS | PASS | `CONSOLE liveC19 segments=1 … texts=1295 control-disarmed=6` (522); zeros (524, 526); `DAEMONLOG … 0` (528); `SCAN actors: ://=1 (fixture 1, other 0) token=0 sentinel=0 profile-other=0 shot-line=1 image-line=0` (533), `profile-all=1` (534): the one `shot-line` is the MCP failure report's screenshot line in `browser_upload_file` leg (c)'s `TIMEOUT` result (#349 (a)); ROW (535). |

### 1d. Slice D (liveD19 attempt 2; `D2E`) and slice E (liveE19 attempt 1; `EE`)

| Row | Verdict | Clauses and counts |
|---|---|---|
| R19-0 D | PASS | LOADED line (107), `HEAD c55cf9df49dc tree=clean` (122), ROW (123); the slice's reference for R19-RESTORE. |
| R19-ARGS-OLD D | **ND** | Old build proven: `LOADED consoleMessages=UNKNOWN_METHOD entries=0 console=0 exception=0 args=VERSION` (154). `sdk`, `ref`, `file` `code=VERSION hint=yes` (155, 159, 161); `raw` `code=VERSION hint=yes forwarded=no` (163); control `code=ok hint=no` (165) with the raw twin `kind=undefined` (166, equal to A3E:154: control-2 PASS, #366). **MCP leg `code=ERROR hint=yes` (157), `LEG mcp FAIL` (158): the code clause is ND** (INV item 6, re-read): `VERSION` is neither an attach code nor a safety code, so the MCP rethrows and the MCP SDK returns the bare message with `isError` (`mcp/test/s12-args-cross.test.ts:160-164`); line 1 is the daemon's `ARGS_RELOAD_HINT` (`daemon/src/intercept.ts:41-42`), which starts with `the`, so `mcpCodeOf`'s `^[A-Z][A-Z_]*` (`s12-r19-c.ts:94-96`) returns `ERROR`. The hint clause passes (`hint=yes`); the product's answer is the designed one. **The raw `forwarded=no` clause is ND live** (#365: indistinguishable from a daemon that forwards and rewrites to `VERSION`; proved by `mcp/test/s12-args-cross.test.ts`). `clauses=6 failed=1` (168). Current build back: `LOADED rerun=1 … args=answered` (198). Attempt 1 read the same MCP leg (D1E:156-157). The printed `ROW … FAIL` (259) yields. |
| R19-RESTORE D | PASS | `RESTORE … hash=equal` (232), stored and daemon PASS (233-234), `RULES 0` (240), `DIALOGS liveD19 native=0 devtools=0 wave-windows-open=1` (242), ROW (243). Ends on the current build (198). |
| R19-LOGS D | PASS | `CONSOLE liveD19 segments=3 … texts=837 control-disarmed=3` (D2E:247), the control line in the last segment (`D2C3:75, 76, 79`; segments 1 and 2 hold none); zeros (249, 251); `DAEMONLOG … 0` (253); actors `://=1 (fixture 1, other 0) … sentinel=0 profile-other=0 shot-line=0 image-line=0` (257), `profile-all=0` (258); `CAPSEG` seg=1, 2, 3 all `saved=yes` (126, 171, 246); ROW (260). |
| R19-0 E | PASS | LOADED line (107), `HEAD 772a53e0e207 tree=clean` (122), ROW (123). |
| R19-VERSION E | **ND** | `sdk` `code=VERSION hint=yes files=0 exact=yes` (161), `raw` the same (165), control `code=ok hint=no files=1` (167), `args=answered` (169). **MCP leg `code=ERROR hint=yes files=0 exact=yes` (163), `LEG mcp FAIL` (164): code clause ND, same cause as ARGS-OLD** (INV item 7; `browser_upload_file` has no catch, the bare `CHOOSER_RELOAD_HINT` is line 1, `exact=yes` confirms the text). `clicks` and the leak count are judged by the driver and not printed for this leg. `clauses=5 failed=1` (171). The printed `ROW … FAIL` (172) yields. Current build back: `LOADED rerun=1 … args=answered` (201). The old build's load rests on the legs' `VERSION` answers (no separate old-build `LOADED` line is printed in E). |
| R19-RESTORE E | PASS | `RESTORE … hash=equal` (242), stored and daemon PASS (243-244), `RULES 0` (250), `DIALOGS liveE19 native=0 devtools=0 wave-windows-open=1` (252), ROW (253). ROOT was added for the control upload and restored (`uploadfolders lines=1 hash=equal`, 132; then `lines=0`, 232). |
| R19-LOGS E | PASS | `CONSOLE liveE19 segments=3 … texts=895 control-disarmed=3` (257), control in the last segment (`EC3:75, 76, 79`); zeros (259, 261); `DAEMONLOG … 0` (263); actors `profile-other=0 shot-line=0 image-line=0` (268), `profile-all=0` (269); `CAPSEG` ×3 `saved=yes` (133, 174, 256); ROW (270). |

### 1e. Totals by id and slice-row

**By row id (58).** PASS (42): R19-0, BANNER-CTL, ARGS-2, ARGS-GLOBAL, ARGS-CSP, ARGS-STOP, CON-1, CON-2, CON-REJ, CON-BIG, CON-NAV,
CON-MCP, CON-CAP, CON-BANNER, CON-JSOFF, CON-3, CON-FRAME, CON-OWN, CON-FILE, UP-OPT, UP-6, F-RAW, F-RAW-2, F-RAW-DIR, KEEP-1, KEEP-2,
KEEP-3, CON-KEPT, KEEP-OVERLAP, CLOSER, CHOOSE-1, -LABEL, -2, -3, -4, -DISARM, -JSOFF, -MCP, -LATE, G2-2, RESTORE, LOGS. FAIL (5):
ARGS-1, ARGS-3, CON-NOTEA, CHOOSE-KEPT, G2-1. ND (5): CON-4, CON-FLOOR, ARGS-OLD, VERSION, CHOOSE-REFUSE. NOT MEASURED (3): UP-DEVT,
KEEP-4, SWEEP-HELD. RECORD (3): DEVT-NOFLAG, CHOOSE-FRAME, CHOOSE-HUMAN. **Slice-rows (74):** A 26 (PASS 21, FAIL 3, ND 2), B 19
(PASS 15, NOT MEASURED 3, RECORD 1), C 21 (PASS 16, FAIL 2, ND 1, RECORD 2), D 4 (PASS 3, ND 1), E 4 (PASS 3, ND 1); PASS 58, FAIL 5,
ND 5, NOT MEASURED 3, RECORD 3.

## 2. The attempts (the ledger is `LED`)

| Attempt | Returned | Files |
|---|---|---|
| liveA19 att1 (HEAD `41690ed`) | Exit 2: `STOPWHY existing-tool-changed` in R19-ARGS-1 (A1E:90-95), `RETURN 1 after-stop=existing-tool-changed restored=n/a readback=n/a` (A1E:94). Cause: control-2's constant (`kind: "function"`) was copied from a fake-extension test; the real page answers `kind=undefined` (#366). Also the scripted MCP actor's first call answered "connecting", so its ARGS-1 legs read 0/0 (A1E:87): a helper defect. Fix round 1 `079a063`. **Recorded, not judged.** | `A1E`, `RA`, `LED` |
| liveA19 att2 (HEAD `079a063`) | Exit 2: `STOP throw-after-state` in r19-con-banner (A2E:264-269), `RETURN 1 … restored=n/a` (A2E:277). Cause: the driver's fixture page changed W's title and the window guard refused W (helper). Rows before it equal att3's (A2E:150-194: ARGS-1 sdk 4 / mcp 5, control-2 `kind=undefined`, ARGS-STOP `ms=1511`). Fix round 2 `922f757`. **Recorded, not judged.** | `A2E`, `RA`, `LED` |
| liveA19 att3 (HEAD `922f757`) | Exit 0, no STOP: `CHECK rows19 rows=32 warns=0 stop-return=0` (A3E:595). Judged here. | `A3E`, `A3C`, `RA` |
| liveB19 att1 (HEAD `0f4392d`) | Exit 2: `STOPWHY existing-tool-changed` in R19-KEEP-1 (`answers=4/5`, B1E:293-297), `RETURN 1 … restored=yes readback=equal` (B1E:338). Cause: the driver's trusted click targeted `{css:"body"}`, which the locator walk never matches (helper). Fix round 1 `a40aa86`. Before it: R19-0, UP-OPT (O2 360 ms), BANNER-CTL, UP-6, F-RAW family PASS. **Recorded, not judged.** | `B1E`, `RB`, `LED` |
| liveB19 att2 (HEAD `a40aa86`) | Exit 0, `rows=24 warns=0 stop-return=0`; every verdict equals att3's (section 1b). Kept beside att3. | `B2E`, `RB` |
| liveB19 att3 (HEAD `3478261`) | Exit 0 (`B3E:535`). Judged here. Fix rounds 2 and 3 (`3478261`) corrected the DevTools opener. | `B3E`, `B3C`, `RB` |
| liveC19 att1 (HEAD `0c42637`) | Exit 0, `rows=26 warns=0 stop-return=0` (CE:536). Judged here. Fix round 1 (`0c42637`): CHOOSE-MCP leg b's target `#in` (hidden) to `#vis`. | `CE`, `CC`, `RC` |
| liveD19 att1 (HEAD `bd523bb`) | Exit 2: `DIALOGS liveD19 native=0 devtools=2` (D1E:240), `STOP devtools-left-open` (D1E:243), `RETURN 1 … restored=n/a` (D1E:250). Cause: the slice's own earlier capture windows, not closed by `Save-R19Seg` (#371). ARGS-OLD's legs read as att2's, including the MCP leg (D1E:156-157). Fix round 2 `c55cf9d`. **Recorded, not judged.** | `D1E`, `RD`, `LED` |
| liveD19 att2 (HEAD `c55cf9d`) | Exit 0, `rows=10 warns=0 stop-return=0` (D2E:261). Judged here. | `D2E`, `RD` |
| liveE19 att1 (HEAD `772a53e`) | Exit 0, `rows=10 warns=0 stop-return=0` (EE:271). Judged here. | `EE`, `RE` |

Attempts per slice: A 3 of 3, B 3 of 3, C 1, D 2, E 1. Fix rounds: A 2, B 3, C 1, D 2, E 0 (#367: three attempts and three
rounds per slice). Every step agent ended in-turn on its runner (#350).

## 3. Exit checks R7.1-R7.6

| Check | Verdict | Evidence |
|---|---|---|
| **R7.1** §4.27 committed before the first observation | met | `git log --format='%h %cI %s' -- docs/e2e-test-plan.md`: the rows `a1b8544` (2026-10-28T10:54:32+04:00); the pre-run notes `d1eaefd` (#358), `93f2fc1` (#361), `9b14658` (#362), `9a56093` (#363), `6b3b5e5` (#364) and the last, `ed6abbc` (#365) at **2026-10-29T02:04:50+04:00 = 2026-10-28T22:04:50Z**. The first timestamped evidence line is `A1E:1`, **2026-10-28T22:07:34.803Z**, 2 min 44 s later. `git diff ed6abbc HEAD -- docs/e2e-test-plan.md` shows 17 added lines and no other change: the dated **note after observation** (#366, `dd6cbc1`, 02:15:10+04:00), listed here as such; it amends control-2 and ARGS-OLD's twin only. |
| **R7.2** the first line proves the loaded build | met | Each slice's second record line (right after `MANIFEST`) is the exact `LOADED consoleMessages=answered entries=11 console=10 exception=1 args=answered`: A3E:107, B3E:107, CE:107, D2E:107, EE:107. D also proved the old build (D2E:154 `consoleMessages=UNKNOWN_METHOD … args=VERSION`) and the current build again (D2E:198, EE:201 `rerun=1`). |
| **R7.3** each feature row's pre-written answer and counts; CHOOSE-4 shows Chrome's own dialog opening | met | Every feature row has one verdict from its pre-written rule (section 1), FAIL, ND and NOT MEASURED included, as in S1 R1.4. CHOOSE-4: legs a, b, c `after-click=1 after-close=0 change=0` (CE:332, 336, 340). |
| **R7.4** restore by hash | met | All five: state items `armed=equal evaluate=equal blocklist lines=0 hash=equal uploadfolders lines=0 hash=equal` (A3E:540, B3E:505, CE:507, D2E:232, EE:242), `RULES 0`, `DIALOGS … native=0 devtools=0` (A3E:551, B3E:516, CE:517, D2E:242, EE:252). Slices D and E end on the current build (D2E:198, EE:201). |
| **R7.5** R19-LOGS by count per slice | met | Five `ROW R19-LOGS PASS`: console and daemon streams all zero, `DAEMONLOG` probes 0, `profile-other=0` everywhere, the control line in each slice's last segment (`A3C:1145-1211`, `B3C:778-869`, `CC:1004-1229`, `D2C3:75-79`, `EC3:75-79`). `shot-line`: 0 in A, B, D, E; 1 in C (CE:533, #349 (a)); `image-line` 0 throughout. |
| **R7.6** STOP lines matched to returns | met | Four STOP events, each with exactly one `RETURN` after it and one ledger return: liveA19 att1 (A1E:92 to 94), liveA19 att2 (A2E:269 to 277), liveB19 att1 (B1E:297 to 338), liveD19 att1 (D1E:243 to 250). The paired "STOP: …" guard lines (A1E:91, 95; A2E:264, 278; B1E:295, 339; D1E:241, 251) belong to the same events. Attempts that ran to the end print `stop-return=0`. |

## 4. Product findings and findings for the user (numbered)

1. **R19-ARGS-1: `evaluate`'s returned `value` has sorted keys** (SDK leg `value-equal=4`, A3E:150). The page received every
   value exactly (`json-equal=5/5`); Chrome's `returnByValue` sorts the keys of the returned object, so a value with several keys comes back
   with them reordered; the MCP's `description` keeps page order. Stage 0 measured it; it predates Step 12
   and is not an `args` defect. FAIL stands under the clause "0 of the 5 differing in key order"; the other reading is in section 7.
2. **R19-CON-NOTEA: a console message logged before the read reaches the agent without its object's contents.** Replayed
   console args carry no `preview`, so an object holding an Error logs as `Object`; the Error's message is lost (no URL or stack leaks,
   `url=0 stack=0`). FAIL (A3E:406). It follows from reading Chrome's replay, so `consoleMessages` for an object logged earlier shows
   its class name only. Live-logged objects do carry a preview (Stage 0), unmeasured through this tool.
3. **Docked DevTools on Chrome 156 did not make `chrome.debugger` refuse the bridge** (DEVPROBE `answer=ok attached=no`, B3E:137; 31
   of 31 calls `ok`; Run 18's F12 probes read the same): R19-UP-DEVT, -KEEP-4 and -SWEEP-HELD are NOT MEASURED (#369). The
   `DEBUGGER_DEVTOOLS` path may be unreachable as the rows are written; undocked DevTools and DevTools opened before the bridge's first
   attach were not measured. Open under #369.
4. **R19-CHOOSE-KEPT: two chooser calls in a row with the same file left `change` at 1** (CE:247-248). Cause not established.
5. **R19-G2-1: B's screenshot timed out at about 35 s while A's trusted input held the lock** (CE:440, both variants), while G2-2 with the
   same set-up answered 15 of 15. The hold itself was seen (`holder-after-reply-ms=477`). Cause not established; a covered-window
   capture hang fits but is not shown.
6. **A banner `seen` on Run 18's refused-upload rows did not reproduce.** With `IDLE >= 20 000 ms` before every leg and a passing
   control, R19-UP-6 (five legs), R19-F-RAW, -2 and -DIR read `banner=none` (B3E:227-239, 255, 271, 287). Run 18 read `seen` 3.3 s
   apart. The row text expected the spacing to rule out a previous leg's session; this run's data is consistent with a spacing effect but does not show the cause (no attach counter
   exists, #351 (2)).
7. **Known limits measured, now recorded:** R19-CHOOSE-HUMAN: the call's file went to the input the human's click opened
   (`received=clicked-input`, CE:271); R19-CHOOSE-LATE: a page that opens its chooser at 4 900 ms gets the call answered `ok`, one at 5 100 ms
   gets `TIMEOUT`, and no dialog opened in either (CE:289-295); R19-CHOOSE-FRAME: a same-origin frame's input is reached (CE:256); R19-CON-CAP keeps the
   **oldest** lines (A3E:253), the direction #355 left for user review.
8. **The MCP prints no code for an error that is neither a safety nor an attach error** (a rethrown `VERSION` is the bare message), and its
   safety lines are the SDK's own, not the extension's texts. Four legs (ARGS-3, CON-4, ARGS-OLD, VERSION) were read against texts the MCP
   does not print: ARGS-3's from the sheet's own expected text (row FAIL), the other three by a reader that assumed otherwise (row ND)
   (sections 1a, 1d). Not a product defect; a reader rule for later waves.

## 5. Plan-side notes and helper notes

**Plan-side (§4.27 is not edited):**
1. R19-CON-FLOOR: #361's pre-run dated note (also in §4.27) amends the waits to 5 s and 3.5 s; the driver did not apply it and kept 3 s and
   2.5 s (instrument at fault). The row is ND for the amended sheet's precondition.
2. R19-ARGS-3's expected MCP text (the extension's message, "the MCP leg's result text contains it") contradicts the MCP's pinned line
   (#133, #202): an expected-text error in the sheet, so the row is FAIL (#195). R19-CON-4's MCP leg: the sheet gives no MCP text and
   the reader chose the extension's (ND).
3. R19-CON-NOTEA's allowed-leg expectation (`marker=1`) assumes a preview that replayed messages do not carry.
4. R19-ARGS-1's `value-equal=5` was copied from a fake-extension test whose `toEqual` ignores key order (`s12-args-cross.test.ts:131`).
5. §4.27 lists 58 table ids; R19-CLOSER prints no `ROW` line (a probe).
6. The line form `poll-ms=<p<=250>` (KEEP-1, KEEP-2 forms) is pre-registered text; the sampler read 247, 280, 319 and 369 ms, so the
   banner-gap clause is NOT MEASURED at that resolution (KEEP-1's verdict rests on the answers).

**Helper notes (recorded, not fixed here):**
1. `ROW … FAIL` is printed for CON-4, CON-FLOOR, CHOOSE-REFUSE, ARGS-OLD and VERSION where the rulings give ND (section 1).
2. The control values of R19-ARGS-1 (`control-1` value `2`) are judged inside `clauses=3` and not printed separately (A3E:152-156).
3. R19-CHOOSE-JSOFF's control prints `clicks`/`dialog` as `not-measured` placeholders (CE:403).
4. The rows with a console clause print their `ROW` words after the R19-LOGS scans and just before `ROW R19-LOGS` (A3E:572-594).
5. R19-VERSION's `clicks` and leak count are judged and not printed (EE:163).
6. The actor files (`actors-<slice>.jsonl`) are outside the repo and were not read here; no judgment rests on them.
7. KEEP-3's `leg=replace NOT RUN` (B3E:434) is a driver note; the sheet's row lists six legs.

## 6. Proposed decisions (agent-rules §5 format; the session agent decides)

### 2026-10-29 · R19-ARGS-1: the returned `value` has sorted keys; which reading of "key order" holds
**Decided:** keep R19-ARGS-1 FAIL with its cause named, and put the product fact to the user: `evaluate`'s `value` comes back with
Chrome's sorted keys while the page received the sent order exactly. Whether to change that (return page order) or document it is the
user's. **Why:** the clause "0 of the 5 differing in key order" is written without limiting it to the receive side. **Instead of:**
reading the clause as receive-side only (SDK `value-equal` ND). **Revisit if:** the user reads the clause as receive-side only; then the
SDK `value-equal` clause becomes ND and the row is ND, with no re-run. **By:** Claude (proposed), for user review.

### 2026-10-29 · R19-CON-NOTEA: replayed objects reach the agent as `Object`; the row needs a live-log leg
**Decided:** record R19-CON-NOTEA as a product finding (FAIL). A later wave adds new rows: an object logged **after** the read starts
(live args carry a preview) with an allowed host and with a blocked host's frame, so #344 (3)'s preview-cut path is reached. Whether an
earlier-logged object should show its class name only is the user's to rule. **Why:** the blocked leg's `entries=0` cannot reach the cut
path on replay. **Instead of:** editing the row's expected text (forbidden). **Revisit if:** the user wants replayed objects shown with
properties (a product change, new Stage 0 measurement first). **By:** Claude (proposed), for user review.

### 2026-10-29 · The four MCP legs, CON-FLOOR and the two cause-unknown FAILs are re-run as new rows in a later wave
**Decided:** a recipes-only re-run, new row ids: (a) R19-ARGS-3 (FAIL, a wrong expected text in the sheet), R19-CON-4, R19-ARGS-OLD and
R19-VERSION (ND) MCP legs with a reader that
matches the MCP's own lines (`sdk/src/error.ts:119-128`) and reads `isError`; (b) R19-CON-FLOOR with #361's 5 s and 3.5 s waits;
(c) R19-CHOOSE-KEPT with a different second file and an `input`/`cancel` counter; (d) R19-CHOOSE-REFUSE `dis` on a page whose
handler targets the disabled input itself; (e) R19-G2-1 with the window rectangles of A, B and X recorded. **Why:** each is FAIL on a wrong
sheet text, ND or cause-unknown, and no pass rule moves. **Instead of:** counting the ND legs as passes. **Revisit if:** the user declines further runs.
**By:** Claude (proposed).

### 2026-10-29 · The DevTools premise goes to the user; the carried banner findings can be marked not reproduced
**Decided:** keep #369 open for the user (keep the code and rows, find a reproducing condition, or drop the "one debugger per tab"
claim). Mark Run 18's banner FAILs (UP-6, F-RAW family) as "not reproduced at 20 s idle with a passing control" in the findings list,
without claiming a cause. **Why:** B3E:227-239, 255, 271, 287. **Instead of:** closing them as fixed. **Revisit if:** a later run
reads `seen` again. **By:** Claude (proposed), for user review.

### 2026-10-29 · Gotchas for the package CLAUDE.md files, at the close-out
**Decided:** (1) `extension/CLAUDE.md`: replayed console args carry no preview, so an object logs as its class name only (Stage 0, Run
19 A3E:406); (2) `evaluate`'s `value` has sorted keys, `description` keeps page order (`Stage0-measurer1.md:36-37`, A3E:140); (3)
`recipes/CLAUDE.md`: an MCP error that is neither a safety nor an attach error carries no code on line 1; read MCP text by its own lines.
**Why:** measured facts, each seen in Run 19. **By:** Claude (proposed).

## 7. Judgment calls to check

1. **R19-ARGS-1 stays FAIL** (the step agent's ruling, applied mechanically). The pass rule reads "0 of the 5 differing in key order"; the
   cause is pre-existing and not an `args` defect, but the clause is not limited to the receive side, and against the result it fails.
   The other reading (the clause covers only the receive side, so the SDK `value-equal` clause is ND and the row ND) is in section 6.
2. **R19-ARGS-3 FAIL (step agent's ruling); R19-CON-4 ND.** Both MCP legs look for the extension's message, which the MCP's safety lines
   (SDK-owned) do not carry. ARGS-3's sheet itself asks that the MCP text contain the extension's message and the driver follows it, so
   the reader is not wrong: the row text is wrong, and the row stays FAIL (#195; #372's ND condition, a reader shown wrong, is not met).
   CON-4's sheet gives the MCP no text and the reader chose the extension's: a reader shown wrong, ND. The MCP's refusal itself is not
   shown by a print in either row (the counters show the function did not run). Neither is a product finding.
3. **R19-CON-FLOOR ND, not FAIL.** #361's pre-run note amended the waits; the driver did not apply it (instrument at fault), so the
   amended precondition `disarmed-ticks >= 3` was not made; the floor clauses held (0 of 2, 0 of 1 in the reply). Never PASS.
4. **R19-KEEP-1 PASS (answers) despite `poll-ms=280`.** The line breaches the pre-registered `<p<=250>`; the banner-gap clause is NOT
   MEASURED at that resolution (and already ND by the sheet). The five answers are checked one by one (`answers=5/5`), so the verdict
   holds whichever way the line form is read.
5. **R19-CHOOSE-2 PASS with leg (c) NOT RUN** (the sheet: "with it on, (c) is NOT RUN").
6. **R19-KEEP-3 PASS with `replace` NOT RUN** (the row lists six legs; B3E:434).
7. **R19-G2-2 PASS.** Its sheet-conceded clause (no capture between focus and input) cannot be seen live; the printed counts meet
   5 of 5 intact strings, `b-ok` all, no `LOCK_TIMEOUT`, and the sheet says a pass is "evidence of no harm". The sheet's clauses (i)
   (no B call sent after A's send replies before A's reply + 450 ms) and (ii) (`lock.holder` reads A during the hold) are not printed as
   counts; they rest on the driver's leg judge (`judgeTypeRound`, `s12-r19-c.ts:112-114`; `LEG … roundN PASS` ×5, CE:455-463), not on a
   print. The PASS rests on that judge.
8. **Row-level ND for rows with any ND leg and all other clauses passing** (CON-4, ARGS-OLD, VERSION, CHOOSE-REFUSE), per the
   step agent's rulings (ARGS-3 is FAIL, call 2); the printed `ROW … FAIL` words yield to the counts and the rule.
9. **Recipe code and the actors file.** The code was read only for what a printed line covers; the actors file is outside the repo and
   uncommitted, and was not read.
10. **Attempt choice.** liveA19 att3, liveB19 att3, liveC19 att1, liveD19 att2, liveE19 att1; earlier attempts are not judged. liveB19's
    att2 was kept beside att3; no verdict differs, one reason differs (DEVPROBE's opener), reported with both readings (#368).
