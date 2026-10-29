# S7-record verifier report

Claude Opus 5.5, effort medium. Read-only. I ran no live run, no Chrome, no daemon and used no port 9234. I did not read `wtv`.
Under audit: `S7-run-record.md` (287 lines), the Run 19 entry in `docs/e2e-test-plan.md` §5, `S7-record-builder.md` and
`S7-record-investigator.md`. Governing text that I read myself: §4.27 (lines 1768–1929, kept as `/tmp/s427.txt`; the line
numbers below are relative to 1768), phase doc §S7 and R7.1–R7.6 (`…phase-f.md:415-417`), and decisions #361 and #366–#372.

## 1. Verdict

**FAIL.** There is one MAJOR finding (a row verdict chosen in the result's favour), plus five MINOR findings and two NITs.
Everything else re-derives from the evidence: the totals, nine of the ten sampled PASSes as written (the tenth, G2-2, stands
on the driver's leg judge), every exit check, the attempt table and the public-repo scan.

## 2. Outputs and commands

- **Lane:** `git status --short` shows ` M docs/e2e-test-plan.md` plus the three `??` lane files. `git diff --stat` shows
  `docs/e2e-test-plan.md | 84 +++` with one hunk (`@@ -3507,2 +3507,86 @@`, after the Run 18 entry) and 0 removed lines.
  Nothing outside the lane changed.
- **`node scripts/doc-check.mjs`:**
  - `Counts in the code (1) - tools: 25 · router methods: 28 · codes: 27`
  - `Counts that differ from the code (6)`: CLAUDE.md:17, :18, :88, extension/CLAUDE.md:42, mcp/CLAUDE.md:9, README.md:23
  - `Test counts stated … CLAUDE.md:113 4665 passed`
  - `Over word budget (1) docs/decisions.md 14513 words (budget 10000)`
  - `Checked 38 living docs (5 closed phase docs skipped …)`

  None of these lines comes from the lane files. The counts are recomputed at S8 (root CLAUDE.md).
- **Row ids:** `grep -o "^| R19-[A-Z0-9-]*"` over 1768–1929 gives **56 table rows**. Line 52 is
  `| R19-F-RAW, R19-F-RAW-2, R19-F-RAW-DIR ★ (…three ids, one ROW each)`, so there are **58 ids**. Both counts are right;
  they count different things (see MINOR-2).
- **Totals, re-added:**
  - Row level: 42+4+6+3+3 = 58, and every one of the 58 ids appears exactly once in the lists in §1e.
  - Slice level: A 26 (21 PASS / 2 FAIL / 3 ND), B 19 (15 / 3 NM / 1 RECORD), C 21 (16 / 2 FAIL / 1 ND / 2 RECORD),
    D 4 (3 / 1 ND), E 4 (3 / 1 ND) = 74, with 58 PASS.
  - The multi-slice rows agree across their slices (R19-0 ×5, BANNER-CTL ×3, CLOSER and KEEP-OVERLAP ×2, RESTORE and
    LOGS ×5, all PASS).
  - The §5 block's totals and lists match the record.
- **Public repo:** I searched the four lane texts (the record, builder, investigator and the `+` lines of the §5 diff)
  with `grep -cF 'Users\'`, `C:/Users`, `-i the user's name`, `@gmail`, `-i the user's name` and `http`. Every count is 0. The only `://`
  hits are `chrome://extensions` inside the quoted reload hints (investigator lines 126 and 144).

## 3. Findings

### MAJOR-1: R19-ARGS-3 is judged ND, but its reader is not wrong; the sheet's pre-registered MCP text is
- **Where:** `S7-run-record.md:60` ("the reader is shown wrong"), §1e (ND list), judgment call 2 (`:269-271`); the §5
  entry ("reader checks the extension's text").
- **Evidence:**
  - §4.27 row R19-ARGS-3 (line 20, Expected column) says: "each of the first four `code=JS_DISABLED` with exactly the
    message `The user has turned JavaScript off for the bridge in Chrome (browser_evaluate and script URLs are refused)…`
    (`extension/src/safety.ts:204`) … **the MCP leg's result text contains it**".
  - The driver does exactly that: `recipes/s12-r19-a.ts:439` checks `mr.isError && mr.text.includes(MSG.jsOff)`, and
    `MSG.jsOff` = `EXPECT10.jsDisabled` (`recipes/s10-rules.ts:148`) is that same sentence. So the reader implements the
    sheet faithfully.
  - The MCP's line is the SDK's `JS_DISABLED_LINE` (`sdk/src/error.ts:122-124`), which by design (#202) does not contain
    the sentence.
  - The record says so itself in plan-side note 2 (`:213`): "R19-ARGS-3's and R19-CON-4's expected MCP texts … contradict
    the MCP's pinned lines".
  - So the cause is an expected-text error in the sheet, not a reader shown wrong.
- **What the rules say:**
  - The rulings make a leg ND only when "a reader [is] shown wrong" (#372 bullet 2; #367 "a helper check is shown wrong").
  - The standing precedent for a wrong row text is #195 (`docs/decisions-archive/step9.md:64`): "the row text was wrong,
    not the product … Both rows stay FAIL" (also `recipes/CLAUDE.md`, "Expected texts are tied to the product's
    constants").
  - At best the ruling is ambiguous here. The record's own rule (`:6`) is to choose against the result, and choosing ND
    over FAIL is the choice in the result's favour.
- **Contrast with the other three MCP legs (their ND stands):**
  - R19-CON-4's sheet gives no MCP text (line 29: the expected text is the SDK leg's). Its "equal to the snapshot
    control's" was usable, and the reader chose the extension text instead (`s12-r19-a.ts:375`). That is a reader shown
    wrong.
  - ARGS-OLD and VERSION: `mcpCodeOf`'s own doc comment claims "an isError text starts with [the code]"
    (`recipes/s12-r19-c.ts:91`). That is false for a rethrown `VERSION` (`daemon/src/intercept.ts:41-45` starts with
    `the`). That too is a reader shown wrong.
- **Fix:**
  - Judge R19-ARGS-3 **FAIL** (expected-text error, product as designed, no product finding; cite #195 and plan-side note
    2). The totals become row level PASS 42 / FAIL 5 / ND 5 and slice A 21 / 3 FAIL / 2 ND, with the same change in §5.
  - Or, if the step agent rules ND anyway, list it as a judgment call that names #195 and the sheet's "contains it"
    clause, for the session agent.

### MINOR-1: G2-2's clauses (i) and (ii) are called unprinted and set aside, but the driver judges them
- **Where:** `S7-run-record.md:122` and judgment call 7 (`:278-281`).
- **Evidence:**
  - Row 78's pass rule lists (i) no B call sent after A's send replies before A's reply + 450 ms, and (ii)
    `lock.holder` reads A during the hold. The record calls these "not read against the result because the stated rule
    is 5 of 5 intact strings".
  - In fact `judgeTypeRound` (`recipes/s12-r19-c.ts:112-114`) checks both (`c.sentAt < r.aSentAt || c.replyAt >=
    r.aReplyAt + 450`, `r.holderSeen` from `:474`). Their only print is `LEG R19-G2-2 roundN PASS` ×5 (CE:455-463).
- **Why it matters:** the verdict PASS holds, but the stated reason is wrong. Waiving pre-registered clauses would be a
  choice in the result's favour.
- **Fix:** say that (i) and (ii) rest on the driver's leg judge (code cited), not on printed counts.

### MINOR-2: The 56/58 reconciliation gives the wrong reason
- **Where:** `S7-run-record.md:14-15`; builder report "Verdict totals" and Deviations.
- **Evidence:** the 56 table rows come from the grep above. R19-CLOSER has its own table row (line 62). The difference of
  two is R19-F-RAW-2 and R19-F-RAW-DIR, which share the F-RAW row (line 52).
- **Fix:** "56 table rows, 58 ids: line 52 holds F-RAW, F-RAW-2 and F-RAW-DIR". CLOSER being row-less (it prints no `ROW`)
  is a separate point.

### MINOR-3: CON-FLOOR's wait is framed as a row/note disagreement; the driver ignored a binding pre-run amendment
- **Where:** `S7-run-record.md:66`, plan-side note 1 (`:211-212`), judgment call 3; builder judgment 3.
- **Evidence:**
  - #361 (decisions.md:449-450) reads "Before any Run 19 observation, a dated §4.27 note: R19-CON-FLOOR's waits become 5 s
    and 3.5 s". The §4.27 note (line 102) says the same.
  - The driver still has `await sleep(3000); // §4.27's step text: "wait 3 s" (N1 left as the sheet says)` and
    `sleep(2500)` (`recipes/s12-r19-a.ts:507, 510`).
  - The off title to the ON press is A3E:453 23:11:22.606 to :460 23:11:25.868, i.e. 3.26 s, so 2 judged ticks.
  - The dated note amends the row, so there is no disagreement. The instrument did not apply the amended sheet, and that
    is exactly the condition under which the ruling allows ND.
- **Verdict:** ND is correct (never PASS; the floor clauses 0/2 and 0/1 hold).
- **Fix:** reword it as "the driver did not apply #361's pre-run note (instrument at fault)" and drop "the rule names no
  meaning for a short window … sheet check shown wrong".

### MINOR-4: Two factual errors in the §5 entry
- **Where:** `docs/e2e-test-plan.md` (+ lines of the diff).
- **First error:** "the three attempts that ran to the end print `stop-return=0`". Six did: A3E:595, B2E:531, B3E:535,
  CE:536, D2E:261, EE:271 (`grep -n stop-return` on each).
- **Second error:** "The chooser rows pass (CHOOSE-1 to -4, -DISARM, -JSOFF, -LATE, -MCP; after each call Chrome's own
  dialog opened and the wave closed it)". CHOOSE-1, -2, -3, -MCP and -LATE print `dialog=0` (CE:163, 209, 221, 231-237,
  291-295), and CHOOSE-3's rule says "no dialog afterwards". Only CHOOSE-4's three legs and CHOOSE-DISARM's second half
  open Chrome's dialog (CE:332, 336, 340, 372).
- **Fix:** "six attempts"; and "after CHOOSE-4's calls (and CHOOSE-DISARM's re-armed click) Chrome's own dialog opened".

### MINOR-5: KEEP-1's `poll-ms=280` breaches the pre-registered expected line, which the record says no clause reads
- **Where:** `S7-run-record.md:83`, judgment call 4, plan-side note 6.
- **Evidence:**
  - Row 54's Expected column is pre-registered text: `poll-ms=<p≤250>`.
  - `pollMsOf` is the largest gap between samples (`recipes/s12-forms-b.ts:76`).
  - The pass rule's "a banner gap (`banner=gaps:<m>`) … does fail the row" depends on that resolution.
- **Reading against the result:** the banner-gap clause is NOT MEASURED at the sheet's resolution. The row stays PASS
  for the answers only, because the five answers are checked one by one at `s12-r19-b.ts:222-226`, `answers=5/5`
  (B3E:297), and the banner clause is already ND by the sheet.
- **Verdict:** the verdict does not change, so this is not in the result's favour. But "no pass-rule clause reads it" is
  inaccurate.
- **Fix:** state the line-form breach and that it leaves the banner-gap clause unmeasured.

### NIT-1: DEVPROBE has a verdict cell
- **Where:** `S7-run-record.md:77`.
- **Issue:** DEVPROBE (not a §4.27 id) has its own row in the slice B table with the verdict "RECORD", but it is not
  counted in B's 19.
- **Fix:** mark it "(probe, not counted)".

### NIT-2: CON-NOTEA's cause reads as shown
- **Where:** `S7-run-record.md:64`.
- **Issue:** the cause comes from Stage 0 captures and code (`console-messages.ts:168-177`). No Run 19 line prints the
  entry's text. The investigator labels it class P ("Chrome's reason taken from Stage 0").
- **Fix:** add "from Stage 0 and the code; the entry text is not printed in Run 19".

## 4. Re-derivations

**Ten random PASSes.** I drew them with Python `random.seed(19); random.sample(<the 58 PASS slice-rows in §1 order>, 10)`.
The draw covers slices A, B, C and D:
1. **C:CHOOSE-MCP:** a and b `ok files=1 change=1`, c `TIMEOUT exact=yes files=0`, e `form=run16`, d `JS_DISABLED files=0`
   (CE:231-237, 429) → PASS.
2. **A:ARGS-2:** 11 `exact=yes data=none`, `sent=2` (raw-big and notfn), `EFF before=1 after=1` (A3E:160-173) → PASS.
3. **C:RESTORE:** `hash=equal` ×2, stored and daemon PASS, `RULES 0`, `native=0 devtools=0` (CE:507-517) → PASS.
4. **B:KEEP-OVERLAP:** `first=ok second=DEBUGGER_DEVTOOLS exact=yes` (B3E:447) → PASS.
5. **A:CON-2:** `entries=2 console=1 exception=1 url=0 stack=0 uncaught-first=yes` (A3E:207) → PASS.
6. **B:CON-KEPT:** `first=11 second=11 equal=yes ordered=yes` (B3E:439) → PASS.
7. **A:CON-CAP:** 18 278 ≤ 20 000, marker yes, indexes 1 to 9 consecutive, 9 + 191 = 200 (A3E:253-254) → PASS.
8. **B:UP-6:** five legs each with idle ≥ 20 000, CHECK PASS and `BANNERCALL … banner=none control=pass`
   (B3E:206-239) → PASS.
9. **B:CLOSER:** `opened=yes closed=yes native-after=0` (B3E:145), which is row 62's rule → PASS.
10. **D:LOGS:** scans 0, `DAEMONLOG` 0, `profile-other=0`, `profile-all=0` (D2E:247-258) → PASS.

All ten agree with the record. I also re-derived the following outside the sample:
- **KEEP-2:** medians 10 132 and 5 028, difference 5 104 ≥ 3 500, spread 69 → PASS.
- **KEEP-3:** end-ms 6 156 to 6 800. The largest gap to the ctl median is 1 772 ≤ 2 000, and the smallest margin below
  the idle median is 3 332 ≥ 2 500 (B3E:411-431) → PASS.
- **ARGS-STOP:** 1 516 is inside 1 500–3 500 → PASS.

**FAIL, ND and NOT MEASURED rows, re-read against their rules and the reader code:**
- **ARGS-1 FAIL:**
  - The SDK leg reads v1 `value-equal=no json-equal=yes` (A3E:140).
  - The cause chain holds: the compare is order-sensitive (`s12-r19-a.ts:188`); `returnByValue: true` (`debugger.ts:271`);
    Stage 0 measured the key sort (`Stage0-measurer1.md:36-37`); `description` is built by `JSON.stringify(value, null, 2)`
    (`serialize.ts:374`). The cause is shown.
  - Control-2 `kind=undefined` on both builds (A3E:154, D2E:166) → PASS by #366.
- **CON-4, ARGS-OLD and VERSION ND:** the readers are shown wrong, as described under MAJOR-1. The ARGS-OLD raw
  `forwarded=no` clause is ND by #365.
- **CON-NOTEA FAIL:** the allowed leg reads `entries=2 … marker=0` (A3E:406). Only `entries=1 marker=0` is RECORD, so
  this is FAIL.
- **CHOOSE-REFUSE ND:** `dis` reads `TIMEOUT exact=no` (CE:197); ND by #370.
- **CHOOSE-KEPT FAIL:** change 1 then 1 (CE:247-248) against `judgeKept`, which wants change 1 then 2
  (`s12-r19-c.ts:81-83`). Cause not established.
- **G2-1 FAIL:** `b=TIMEOUT` at 35 106 (CE:440) against "B answers `ok`". The occluded-capture hang
  (`extension/CLAUDE.md:187-192`) fits but is not shown.
- **UP-DEVT, KEEP-4, SWEEP-HELD NOT MEASURED:** `DEVPROBE … answer=ok attached=no` (B3E:137); the menu steps were found
  (B3E:130-133). Attempt 2 read `found=no` (B2E:130) → NOT MEASURED by #369.

**Exit checks:**
- **R7.1:**
  - `git log --format='%h %cI %s' -- docs/e2e-test-plan.md` shows `a1b8544 2026-10-28T10:54:32+04:00` (rows), the notes
    up to `ed6abbc 2026-10-29T02:04:50+04:00`, then `dd6cbc1 02:15:10+04:00` (#366).
  - `A1E:1` is `2026-10-28T22:07:34.803Z s9-win: PREFLIGHT ok`.
  - `git diff ed6abbc HEAD --stat` shows 17 insertions and 0 deletions.
  - Met, with #366 disclosed as after observation.
- **R7.2:** the sheet (row 17) wants the `LOADED` line as the second record line, after `MANIFEST`. It is there
  (A3E:106-107).
- **R7.3–R7.5:** the cited lines exist and say what is claimed (spot-checked: CE:332, 336 and 340, all five RESTORE
  lines, D2E:247-258).
- **R7.6:** each STOP has one RETURN:
  - A1E:92 → 94
  - A2E:269 → 277
  - B1E:297 → 338
  - D1E:243 → 250

  Each matches a ledger entry (`S7-live.ledger.md:9-13, 34-38, 73-78`; D in the ledger by #371).

**Attempts:**
- HEADs, exit lines and causes match the evidence. Examples: A1E:87 MCP `value-equal=0` (the "connecting" defect); B2E:130
  vs B3E:130 DEVPROBE `found=no` vs `found=yes`.
- liveB19 attempts 2 and 3 have the same verdicts, and the differing readings are shown with both values (#368 complied
  with).

## 5. Proposed decisions

None of my own. MAJOR-1 needs the step agent to pick a reading (FAIL by #195, or ND listed as an explicit judgment call).

## 6. Handoff

The fixer touches only the lane:
- `S7-run-record.md`: `:14-15`, `:60`, `:64`, `:66`, `:77`, `:83`, `:122`, §1e, §5 notes 1 and 6, §7 calls 2–4 and 7.
- The §5 entry: totals if MAJOR-1 is taken as FAIL, "three attempts", and the dialog sentence.
- The builder report's mirrors of these.

A fresh verifier then re-checks only those items.
