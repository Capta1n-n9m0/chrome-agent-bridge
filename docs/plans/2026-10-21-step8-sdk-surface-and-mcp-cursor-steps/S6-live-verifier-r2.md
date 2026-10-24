# S6 — live verifier r2 (Run 12 (S6), Part 2 record)

Fresh level-2 verifier, 2026-10-23. Scope: the uncommitted working-tree changes to `S6-run-record.md`
(Part 2 appended), `S6-daemon-log.txt` (replaced), and `docs/e2e-test-plan.md` §5 "Run 12 (S6)" Part 2.
I did not contact Chrome or the bridge, commit anything or edit the files under review. I cross-checked
against the raw outputs in `%TEMP%\bridge-e2e\s6-run2\`, the actors' `out.jsonl` files, and AR's and R's
session transcripts (I only counted image blocks in those). Blackboard material: only the output of
`bb-login.ps1` (counts and yes/no) was read; no page exists.

**Verdict: PASS-with-notes.** The record is honest and matches the raw outputs. Every PASS and FAIL
follows its pre-written rule. No rule was re-tuned and nothing was retried against a rule. Hygiene counts
are 0. The notes below are classification and accuracy points for the step agent. None invalidates a verdict.

## Checks

**1. ORDER — pass.**
```
git log --format='%h %ad %s' --date=iso-strict 23b878f^..HEAD
bc78ded 2026-10-23T18:36:25+04:00 (= 14:36:25Z) REP-0 probe, helper rename (pre-run)
… 23b878f 2026-10-23T17:12:31+04:00 (= 13:12:31Z) wave sheet, expected text, recipes (pre-run)
Part 2 first timestamp: "time 14:38:14.198Z" (record :477)         → both commits precede it
git diff docs/e2e-test-plan.md | grep -c '^@@'        → 1  (hunk at line 1897; "## 5." is 1054, "## 6." 1927)
git diff docs/e2e-test-plan.md | grep -c '^-[^-]'     → 0  (additions only, §5 only)
git diff --quiet HEAD -- …/S6-wave-sheet.md           → "sheet unchanged"
git diff 8d77a35 -- …/S6-run-record.md | grep -c '^-[^-]' → 0  (Part 1 untouched; 772 lines appended)
```

**2. First result line; no build — pass.** Set-up (R-a) lines come first: `log --stat 23b878f..HEAD: []`.
The first result line is the stale check, `STALE-CHECK NEW BUILD …`, exit 0. It matches
`s6-run2\stale1.txt` byte for byte. No reload was run.
`git log --stat --oneline 23b878f..HEAD -- extension daemon mcp sdk shared | wc -l` → `0`. The vitest count
was 138, not the sheet's 134. That is disclosed and matches `S6-fixer2.md:73` and `vitest-recipes.txt`.

**3. Verdicts against the pre-written rules — pass, with notes N1, N2.** The record's observed lines match
the raw outputs verbatim for these rows: REP-0 (`rep0-1.txt`, all 15 lines), S6-STALE, SDK-1 (`sdk1.txt`;
SA `out.jsonl` at 14:40:01.658Z and 14:40:19.782Z, url `?t5=sdk1-claude`, `button "Sign in" [ref=e5]`), MUX-1,
MUX-2 and STAT-1 (S1/S2 `out.jsonl`: Clients lines, `TAB_HELD` text `tab T194 is held by "claude-code #4036"
since 14:44:28 — …`, `Cursor: T194 … (held by me)`), LEASE-1 (LA/LB: refusal for T196, `Opened tab T197 (in
the background — …)`, both `Click counter: 1`, the list with holders and `*` on T196), CUR-1…3 (CU/CV), LOC-1
and LOC-2 (LO1/LO2), ASREF-1 and REP-1 (AR), TAB-3 and NET-12 (TN), SDK-8 (C: S8-3's six lines, S8-4's
`browser_use_active_tab` → `Now using T211 …`), and the regression rows (R: `Typed into e1`, `Clicked e6`,
`Clicked e7`, `Agent Bridge E2E Playground`, NET-1's two rows, `from cache: no`, `content-length: 13106` ×2;
DL-1 (a)–(d) with the sha256). Further: two of R's screenshots (`img\trust2-crop.png`: `status: TRUSTED click
received`; `img\act3-crop.png`: `status: form submitted (email = x@y.com)`); TRUST-2/EVAL-1 bands in
`frames-te\frames.csv` (106→96 at 15:02:38.834, 90 at 39.161, 106 at 44.183; 90 at 54.301, 106 at 59.387);
NET-1/DL-1 bands 106 only (285/190 frames); http8080.log `19:04:28 GET /e2e-playground.html 200` + favicon 404;
SCREEN-1 (`screen1.out`: 1576/1456/1465, median 1465); MUX-8 (`mux8-1.out`, `mux8-2.out`, X `out.jsonl`
15:08:31.967Z); SM-1 (`sm1.out`, UTF-16, and `sm1-log.txt`).
- **FAILs are FAILs by the written rule and were not re-tuned.**
  - **SM-1**: §4.19 requires "exactly one `extension session changed: <n> handles retired` with `<n>` ≥ 1".
    The log has `0 handles retired` (`sm1-log.txt`: `SM-1 LOG FAIL`, exit 1). The record does not rerun it
    and does not reinterpret it; the explanation (the `tabGone` at the quit, +10064 ms, 14 ms before
    `extensionStatus false`) is in `sm1.out`.
  - **REP-1**: the rule requires "an **image** of the fixture page". AR's `out.jsonl` has 0 image blocks.
    AR's session transcript (`71356c6e….jsonl`) has `"type":"image"` 0 times, while R's has 10.
  - **LOC-1**: the driver's claim holds. The rule's value clause has two forms. (a) The snapshot shows the
    textbox's value: LO1's snapshot prints `- textbox "Email address" [ref=e1]` with no value, so this form
    cannot be observed. (b) `status: email = a@b.com` by screenshot: the prescribed click comes next and
    rewrites the status line, and the LOC actor's tool list has no screenshot. Neither form can be observed
    in the prescribed order. "the counter stays at 1" also had no tool-side observation; only the deleted
    OS frame saw it. Recording it as FAIL (own check), as Run 8 did with self-failing checks, is correct.
    The frame was not used to flip the verdict.
- **N1 (MINOR) — ASREF-1's classification leans toward the result.** The sheet says "§4.18's Expected
  column, exactly". The `1+1` call was marked "(optional)" in §4.18. P-ASREF1 made it mandatory (call 4), so
  its clause was measured, and it differs: observed `asRef needs an Element; the value is not one`, expected
  `2` / `(no ref: the result is not an element)`. The record says "PASS (required)" and counts it among the
  24 PASS. The difference is fully disclosed (Finding 5, §5 line). Still, by "exactly" the honest label is
  "required clauses PASS, optional clause FAIL". The step agent should rule on it rather than take the count
  of 24 as given.
- **SM-0, not measured after reload exit 2: no retry, correct.** The integrity floor and #65 outrank the
  sheet's general "exit 2 ⇒ rerun". Nothing was pressed (`reload-sm0.txt`), and the log shows no extension
  disconnect or resync between 14:40:40Z and the quit, apart from the new daemon's own resync at 14:43:24Z,
  so later rows ran on the same build.
  **N2 (MINOR):** sheet step 2 and R-b both say a non-zero reload exit ⇒ "STOP the live part and ask the
  user". Step 9 says only "step 2's reload command (exit `0`)", without the consequence. The driver did not
  retry, but went on with the remaining rows. That is a defensible reading and it is disclosed (record
  :632–639). It is still a deviation from the literal step-2 consequence, and the step agent should ratify it.
- **SDK-6/SDK-7, waits for the user — correct.** `bb-login.txt`: `on ada.blackboard.com: no; sign-in
  buttons: 0` → `WAITS FOR THE USER`, exit 4. The sheet says exactly this. Nothing downstream ran
  (`exports pp1 files: 0`).
- The step-10 deviation (B1 before `daemon-shutdown`) is disclosed. The reason is correct: `t5.ts find` is
  a client and would spawn the daemon.

**4. REP-0 — pass.** `rep0Verdict`'s rule, applied to the numbers in `rep0-1.txt`:
- the probe was `visible +20 ms` inside the 1344 ms call, within [t0−50, t1+50];
- the report PNG read `#dd00fa` ×3 → magenta;
- the trigger was `LOCATOR_NOT_FOUND` with `attachErrors: []`;
- control B: probe visible +9 ms inside 1597 ms, PNG magenta;
- control A: `#3300f8` ×3 → blue.

Result: `REP-0 PASS`, exit 0, so the gate was correctly not applied. REP-1, TAB-3 and SDK-7's MCP leg were
free to run; SDK-7's never ran because the login did not. The failures directory epoch 1792766352706 is
14:39:12Z, inside the run. The earlier `s6-rep0` client at 14:17:32–39Z is S6 builder r2's disclosed dry-run
contact (`S6-builder-r2.md` §4: `listTabs`, refused with SET-UP exit 2; verifier-r2 NIT-6). It painted and
measured nothing, so this is not a hidden earlier REP-0 run (see N4).

**5. Restart — pass.**
- Quit: `quit.txt`: `sent Enter on chrome://quit in my own window`, `QUIT OK` at 15:08:19.752Z; chrome procs 0.
- Relaunch: `launch.txt`: `args: --restore-last-session`, not in a job, no behaviour flags.
- Counts: C1 = 3 windows (1,1,1); after `-CloseBlank`, 3 windows (1,1,1); after cleanup, equal to C0
  (2 windows, 1,1); switches `[--restore-last-session]`.
- Extension: back without a reload (`extensionStatus {"connected":true}` at 15:08:52.697Z, 1.6 s after the
  15:08:51 launch).
- MUX-8: run 1 15:08:27–42 and X's status at 15:08:31 both fall between the quit (15:08:19) and the
  relaunch (15:08:51), i.e. inside the quit window. Run 2 came after the restart, as the row requires.
- Daemon: pid 14400 before and after.

**6. Watch items — pass (NIT).** All 8 are recorded as seen, not seen or not testable. "Residual
`data-__bridge-mark` … not seen (… not separately counted)" is really "not tested". NIT.

**7. Hygiene by count — pass.** The token was read from `bridge.token` (32 chars) into a variable, then unset:
```
S6-daemon-log.txt: token=0 '://'=0 withheld=0 skill-table ids=0 (17 distinct, _1_1 excluded) any _N_N=0 ada.blackboard=0
S6-run-record.md:  token=0 skill-table ids=0; _N_N = 11, all "_1_1" (Part 1's dry-run stub); "[line withheld:" 2 = the hygiene labels;
                   non-localhost schemes: chrome://extensions ×2, chrome://quit ×6, https://example.com ×1 (TAB-3's own URL)
e2e §5 diff (+lines): token=0 skill-table ids=0 any _N_N=0
S6-daemon-log.txt = s6-run2\s6-daemon.log (cmp SAME), 171 lines; Part 1's 36 lines identical as its prefix;
  a contiguous slice of ~/.chrome-agent-bridge/daemon.log from line 573 (start pid=25652) to EOF
git status --short (--ignored, grep png|exports|chrome-agent) → 0 lines; ~/.chrome-agent-bridge/failures → empty
PNG files modified 18:53–18:55 local under %TEMP%, the repo, ~/.chrome-agent-bridge → none (the LOC-1 frame is gone)
s6-run2 PNGs: only img\act*/trust2* (R's fixture-viewport screenshots); frames-* hold only frames.csv
```
The record names no user tab, title or bookmark content. The only titles in Part 2 are the fixture's
(×12) and "Example Domain" (×1). It says only that a frame "showed the user's bookmark bar".

**8. Claims in the driver's Findings not supported by the raw outputs — NITs only.**
- **N3:** Hygiene :1136–1137 says TN's network calls held "lines about the user's own tabs". The two rows
  TN's output omits are `tab:T208` example.com rows, i.e. TAB-3's own tab (`TN/out.jsonl` 14:57:46.113Z),
  not the user's. LA's one omitted line is non-fixture.
- **N4:** Finding 8 leaves the 14:17 `s6-rep0` client unattributed. It is builder r2's disclosed contact (§4).
- **N5:** the record says only `—` was restored from PowerShell's mangling in `sm0.out`/`sm1.out`. `→` was
  restored too (raw `ΓåÆ`). The meaning is unchanged.
- **N6:** MUX-8 run 2's `exit 0` is not in `mux8-2.out`, which has no exit line, unlike `mux8-1.out`. It
  was captured separately, so it cannot be checked from the file.
- **N7:** Part 1's header (record :6) still reads "36 lines". The attached log now has 171; Part 2's
  hygiene says so. This is correct under "Part 1's lines stay", but a reader of the header is misled.
- **N8:** two ad-hoc read-only `listTabs` clients named `s6-driver-list` (14:52:40Z, 15:09:54Z; script
  `fixlist.mts` in the session scratchpad, which prints only fixture tabs and counts the rest) appear in the
  log. Only the first is reflected in the record (CUR-3's "driver listing"). This is harmless, but it is not
  a committed recipe.

## Findings

1. MINOR (N1): ASREF-1 is counted PASS although a measured clause of a rule that says "exactly" differs.
   The step agent should rule on PASS versus "required PASS, optional FAIL".
2. MINOR (N2): after SM-0's reload exited 2 the live part continued. The sheet's step-2/R-b consequence is
   "STOP the live part". No retry happened and nothing was pressed. The step agent should ratify this.
3. NIT (N3–N8): inaccuracies or omissions in the record's prose, listed above. None changes a verdict or
   a hygiene result.
4. NIT: watch item "residual mark — not seen" should read "not tested".
