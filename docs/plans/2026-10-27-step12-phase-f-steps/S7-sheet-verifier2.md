# S7-sheet verifier 2: re-check after fix round 1 (`docs/e2e-test-plan.md` §4.27)

Claude Opus 5.5, medium effort. Role: verifier (`docs/agent-rules.md` §6). This is a docs stage, so no build, typecheck or
test was run (the brief's deviation). I edited nothing except this report and its evidence file,
`S7-sheet-verifier2-evidence.txt` (commands, the quotes checked at HEAD `e7958eb`, source lines). §4.27 runs from line
1768 to 1860.

## 1. Verdict

**PASS-with-notes.** Every MAJOR is fixed, and no CRITICAL or MAJOR remains. Five new MINOR findings come from lines the
fixer added or from parts of earlier findings that are still open, plus four NITs. The exit checks pass:
- `node scripts/doc-check.mjs` exits 0. It reports 4 dead paths, all S12 fixtures that S7-helpers builds, and count
  drifts from earlier stages.
- The diff is one hunk, `@@ -1767,0 +1768,94 @@`: 94 insertions and 0 deletions. It sits between §4.26's end (1766)
  and `## 5.` (1862), and nothing else in the file changed.

The MINORs should be fixed in this sheet before S7-helpers builds to it. They cost one Sonnet fix round, and no
re-verify is needed beyond a spot check.

## 2. The first verifier's findings

| Finding | Status | Evidence |
|---|---|---|
| MAJOR-1 attach STOPs | **Fixed** | The phrase "counted by the keeper" is gone. The Banner rule (1810) makes a positive a STOP only with `IDLE >= 20 000` and a passing slice control, else NOT MEASURED. It also says such a STOP is for the session agent to judge, not a product FAIL. This is sound against `recipes/CLAUDE.md:159-161`. There is now one R19-BANNER-CTL each in slices A, B and C (1817, 1851–1853). KEEP-3 and CHOOSE-DISARM carry no banner STOP. In each judged row the refused calls come before that row's next CDP call (ARGS-3: its control comes first, then the idle; CHOOSE-JSOFF: its plain upload comes last), so one idle covers them. The IDLE wording is uneven (MINOR-E). |
| MAJOR-2 ARGS-OLD | **Fixed** | The raw leg quotes `s12-args-cross.test.ts:156` exactly. `forwarded` is now read from the answer. A forwarding daemon returns `kind: "function"`, which the twin control on the old worker shows. Line form (7) matches. The hint text is equal at `intercept.ts:41-42`. |
| MAJOR-3 CON-FRAME | **Fixed** | Leg a uses a same-site pair (`p.`/`f.s12site.localhost`) and expects 2, then 13. Leg b uses a cross-site pair (`localhost`/`127.0.0.1`) and expects 2. `Stage0-measurer1.md:48` is quoted exactly. `a-nopattern entries=2` is set as the control and is NOT DISCRIMINATING. Open item 4 is corrected. That Chrome keeps the same-site frame in process is not measured, and the row says so. |
| MAJOR-4 S3a handoff rows | **Fixed** | CON-FLOOR has gained `exc-*` keys and form (10). `S3a.md` §7 is quoted exactly (:28-30). NOTEA has gained an allowed leg, and the F1 title is exact (`:141`). The allowed leg's expectation has a new risk (MINOR-A). |
| MAJOR-5 capture across reloads | **Fixed** | The Capture segments paragraph is workable: `CAPSEG` (form 35), a save before each reload, all segments read as one stream, and the control line in the last segment. The capture window is named as the exception in `DIALOGS` (30), RESTORE and liveA19. One small gap remains (NIT-A). |
| MINOR-1 | **Fixed**, with a new conflict | `LOADED` is the second line. Slices D and E run R19-0 in full first. This leaves two `ROW R19-0` lines in one slice (MINOR-D). |
| MINOR-2 | **Fixed**, and the dispute is **correct** | Form (8) has gained `ordered`, `newest` and `marker`. `BANNERCALL` (34) is added for CON-MCP and CHOOSE-1. CON-MCP's five tools all exist in `mcp/src/tools/registry.ts` at HEAD. `TAB_GONE` is printed as the code only (`intercept.ts:601`, which carries `data {lastUrl, lastTitle}`). R19-CHOOSE-MCP (1842) has no banner clause as it stands, so nothing needs a sampler there. The args sentinel is now defined, but its name clashes (NIT-B). |
| MINOR-3 fixtures | **Fixed** | `s12=`, `#tb`, `beat` and `clicks` are stated for the playground. `#vis` is on `none` and `single`. CHOOSE-4 names the page for each leg. |
| MINOR-4 closer order | **Partly fixed** | R19-CLOSER comes before every chooser row in liveC19. But liveB19's R19-KEEP-2 ctl leg is a `chooser: true` call that runs earlier (MINOR-B). |
| MINOR-5 | **Fixed** | The after leg is at 20 000 ms, against a worst case of about 19 s (Open item 8). The margin is thin but sourced. |
| MINOR-6 | **Fixed** | `CHOOSER_RELOAD_HINT` is equal to `intercept.ts:44-45` at HEAD. The test claims (`true`/`false`/`null`, "nothing forwarded", `uploadChooser`) and the spec §10 S5c quotes are exact. |
| MINOR-7 | **Not changed; that is acceptable** | #351 says "carried to Run 19 as new rows after S4b" (`decisions.md:283-284`), which names a stage, not a row order. With a 20 s idle before every leg, KEEP-2's linger is not needed to space the legs. |
| MINOR-8 | **Fixed** | KEEP-1 prints `banner-clause=NOT DISCRIMINATING`. |
| NIT-1, NIT-2 | **Fixed** | Every cited line was re-checked at HEAD (evidence file). There is one residual: CON-FLOOR cites reduce test `:215`, which is the `it` title; the `ts: 500` case is at `:217`. That is trivial. |
| NIT-3 | **Fixed** | — |
| NIT-4 | **No change; correct** | — |

**Open item 5.** The gaps it records as NOT DISCRIMINATING are acceptable as recorded open items, and they leave no exit
check failed:
- R7.3 (phase doc :410-411) asks for each feature row's pre-written answer and counts, and for CHOOSE-4's dialog. KEEP-3
  and CHOOSE-DISARM keep those: exact refusals, the `kept-session-used` STOP, the `end-ms` differential and the dialog.
- The live gap concerns only one way of detecting a phase-doc STOP. The unit tests cover it, and CON-3/-4/-OWN/-FILE/-JSOFF,
  ARGS-3 and CHOOSE-2/-JSOFF keep it under the Banner rule.

The wording needs one change (NIT-C).

## 3. New findings (lines added or changed by fix round 1)

### MINOR

- **A. The allowed NOTEA leg can fail a correct build (1802, `noteaok`).** It expects `entries=1` for
  `console.log({e: err})`. The real preview value of that Error is the whole stack: "Error: s12-noteaok " + `SENTINEL`,
  the stack line, and the script URL. Note A drops any preview value that V8 shortened (the cut part ends in `…`), and
  `S3a.md:66-68` says that this shortening "is unmeasured … a live row decides". The sheet sets no bound on the length of
  `SENTINEL` or of the message. So a long sentinel makes V8 cut the preview, and the correct build prints `entries=0`,
  which the row reads as "drops every object holding an Error" (a FAIL).
  **Fix:** bound the message, for example "the Error's message is `s12-noteaok` alone, and the sentinel is counted from a
  second plain `console.log`". Then state that `entries=0` with a shortened preview is RECORD (the V8 cut that Note A
  waits for), not a FAIL.
- **B. R19-CLOSER does not come before the first row that can raise a native dialog (1822, 1853).** liveB19's R19-KEEP-2
  ctl leg runs `tab.upload(…, {chooser: true})` three times on `s12=single`. If the interception fails, that opens
  Chrome's dialog in slice B, before any closer has been proven, and not in window X.
  **Fix:** run the KEEP-2 ctl leg in X with a `CLOSERPROBE` first in liveB19, or state that liveB19 runs one.
- **C. The R7.6 map (1856) is incomplete.**
  - R19-CLOSER prints `STOP dialog-left-open` (1829), but the map's list for `dialog-left-open` leaves it out.
  - `chooser-interception-left-on` is mapped to CHOOSE-4 and CHOOSE-DISARM, but those rows print `dialog-not-opened`, and
    no row prints the first reason.
  - **Fix:** add R19-CLOSER, and either drop the unused reason or name the row that prints it.
- **D. Two `ROW R19-0` lines in one slice.**
  - liveD19 and liveE19 (1854) now run R19-0 in full and then re-run it, and liveB19 re-runs it after SWEEP-HELD. This is
    against "exactly one `ROW` per id and slice" (1780) and helper fix (c), "the preflight rows print once per slice"
    (1808).
  - **Fix:** say that the re-run prints only its `LOADED …` line (labelled, for example `LOADED rerun=<k> …`), with no
    `ROW` line and no preflight lines.
- **E. IDLE has three definitions.**
  - The Banner rule (1810): since the last reply of any call other than `snapshot`, `listTabs` and `daemon.status`.
  - BANNER-CTL (1817): since the last reply of any CDP call.
  - UP-6 and F-RAW (1818-1819): since the last CDP call.
  - ARGS-3 (1787): since the control.
  - The sheet never lists which calls are CDP calls, so S7-helpers cannot build "CDP" to the letter.
  - **Fix:** use the Banner rule's definition everywhere.

### NIT

- **A.** Capture segments (1858) reopens the capture after R19-0's re-run, so the re-run's worker output is not
  captured. Reopen the capture before the re-run, as the Prologue starts it before R19-0.
- **B.** R19-ARGS-1's fifth value is described as "a `SENTINEL` key and value". That is the test's own
  `SENTINEL = "sentinel-args-K7W3-"` (`s12-args-cross.test.ts:17`), while 1772 defines `SENTINEL` as the constant of
  `s12-console.js`. Write "the args sentinel" in ARGS-1, to match R19-LOGS.
- **C.** Open item 5 says that the step agent raises §3 item 9 "if it judges it unacceptable". But §3 item 9 is
  "stop and escalate" for a check that cannot be made discriminating. Since the item already sends the gap to the session
  agent, the step agent should report it upward without that condition.
- **D.** The expected `CON` lines leave out the new keys. Examples: CON-1 has no `ordered=yes`, and its `limit=3` leg has
  no `newest=yes`. A helper that compares by key needs them written, or a statement that a key left out means "not
  judged".

## 4. Checks with no finding

- Lines added by the fixer print no sentinel, console text, `args` value, path, URL, pattern or token. These are forms
  (7), (8), (10), (30), (33), (34) and (35), KEEP-3's code-only `TAB_GONE`, and `profile-other`.
- Every new pass rule names what a wrong build prints. Examples: `forwarded=yes`; `exc-in-reply-disarmed ≥ 3`;
  `a-pattern` 13; `b-oop` 13; `opened=no` as NOT MEASURED, not a STOP.
- The new STOP lines (`dialog-left-open` from R19-CLOSER, the Banner-rule STOPs) each return, apart from the gaps in the
  map (MINOR-C).

## 5. Proposed decisions

None new. The first verifier's Banner-rule decision (2026-10-28) is adopted in the sheet as it stands.

## 6. Handoff

I started no process, bound no port, and changed no file except this report and its evidence file. A Sonnet fixer
(round 2 of 3) fixes MINOR-A to E and the NITs in §4.27 only. A spot check of those lines then suffices, because the
verdict does not hinge on them. After that, the committer stages the sheet and the S7-sheet reports.
