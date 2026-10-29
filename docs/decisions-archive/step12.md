# Decisions archive — Step 12: Phase F, ergonomics (`args`, console, the kept session, the file chooser)

Entries moved verbatim from `docs/decisions.md` at the Step 12 close-out (2026-10-29); numbers unchanged, newest
first. Cite an entry by date + title ([`docs-writing-guide.md`](../docs-writing-guide.md#decisions)). The index is in
[`decisions.md`](../decisions.md#archive). The entries still open for the user are listed in `decisions.md` →
Open decisions; the decision text is unchanged.

### 2026-10-29 · The user rules Step 12's gate; Step 12 closes (#374)
**Decided (user),** on the session agent's grouped question list (chat, 2026-10-29):
1. **G12-2 granted:** the `webNavigation` permission for G1 (#337). G1 is built in Step 13, not in Step 12.
2. **#372 (b):** committed docs stop carrying the local path and the user's name from now on (write `<repo>`, `~` or
   `<user>`); files already committed and git history are left as they are; `LICENSE` keeps the name. **G12-1 granted:**
   push after the close-out.
3. **#369 keep:** the `DEBUGGER_DEVTOOLS` code and its rows stay; the next live run measures undocked DevTools and DevTools
   opened before the bridge's first attach; the doc claim is reworded only after that.
4. **#373, ARGS-1:** the "key order" clause covers what the page receives, so R19-ARGS-1 is **NOT DISCRIMINATING**, not
   FAIL. The returned `value`'s sorted keys are fixed in Step 13 (keep the page's key order).
5. **#373, CON-NOTEA:** Step 13 fixes it if Stage 0 shows a cheap way to read a replayed object's contents; else it is a
   documented limit.
6. **#355, the cap:** the console formatter keeps the **newest** lines and says how many older lines were cut.
7. **Texts:** #353's second-chooser refusal stops naming DevTools; the console tool's "frames are not read" becomes "only
   other-site frames are not read" (cleanup P2).
8. **#366 accepted** (control-2 judged against the old build's measured answer).
9. **#354 and #355's `chooser: false` rule accepted** as built.
10. **The cleanup pass's proposals P1–P11 approved** (`docs/cleanup/2026-10-29.md`).
11. **Next:** a small Step 13: the Phase F follow-ups above plus Run 19's re-measurement wave (#373) in one live run.
    After it, **Phase G is minimal: packaging for the user's own use only**; distribution to a wider audience later.

Run 19's tally with item 4: 42 PASS, 4 FAIL, 6 NOT DISCRIMINATING, 3 NOT MEASURED, 3 RECORD.
**Why:** the user's ruling.
**Instead of:** a full Phase G next; redacting pushed files and history; dropping the DevTools claim.
**By:** the user (ruled 2026-10-29; recorded by Claude)

### 2026-10-29 · Run 19's record accepted; its findings go to the user and a later recipes-only wave (#373)
**Decided:** S7-record (`2f68f99`, PASS-with-notes after two fix rounds) is Run 19's record. Its verdicts over 58 row ids:
42 PASS, 5 FAIL, 5 NOT DISCRIMINATING, 3 NOT MEASURED, 3 RECORD. R7.1–R7.6 are met.
- **S7-record's two choices against the result stand.** ARGS-1 is FAIL and ARGS-3 is FAIL. The user decides whether
  ARGS-1's "key order" clause covers only what the page receives; then it would be NOT DISCRIMINATING. It is listed
  under Open decisions.
- **CON-NOTEA is a product finding** for the user: an object logged before the read comes back as `Object`, and nothing
  leaks.
- **No product change in Step 12.** The phase's forbidden fixes hold after the wave too, and a fix needs the user's
  ruling.
- **A later recipes-only wave** re-measures under new row ids:
  - ARGS-3 with the MCP's own text;
  - the MCP legs of CON-4, ARGS-OLD and VERSION, read from the MCP's own lines;
  - CON-FLOOR with #361's waits;
  - CHOOSE-KEPT with a second file;
  - G2-1 with window geometry recorded.

  It is listed in the phase doc's Follow-ups.
- **Run 18's banner FAILs (#351 (2)) are marked not reproduced:** a 20 s idle and a passing control read none.
- **Three gotchas go to the close-out:** pre-read console messages carry no preview; a returned `value` has sorted keys;
  and the MCP prints its own code lines, which later waves must read.

**Why:** cause before verdict, never in the result's favour. The re-measurements need new rows, not edited old ones.
**Instead of:** re-running inside Step 12 past the per-slice budget.
**Revisit if:** the user rules ARGS-1's clause or asks for CON-NOTEA's fix.
**By:** Claude (session agent's rulings)

### 2026-10-29 · Run 19's five slices have run; S7-record next; the name in committed docs is the user's call (#372)
**Decided:** liveE19 attempt 1 (`fabd5f4`, `rows=10 warns=0 stop-return=0`, no fix round) closes the wave's live part.
- **liveE19's result:** R19-VERSION FAILs on its MCP leg alone (`code=ERROR`; the same shape as ARGS-OLD's MCP leg), and
  R19-RESTORE and R19-LOGS pass. The current build is loaded and proven at the end, the state is equal to R19-0, and
  nothing is left running.
- **The MCP-leg readings go to S7-record.** These are liveA19's ARGS-3 and CON-4, liveD19's ARGS-OLD and liveE19's
  VERSION. S7-record reads each MCP tool text against `mcpCodeOf`. A reader shown wrong makes its leg NOT
  DISCRIMINATING, never PASS.
- **The name in committed docs is the user's call.** The step agent found that steps-dir files carry the user's name.
  The check shows `C:\Users\<user>` paths and the author name in 167 docs files, 147 of them already on `origin/main`,
  plus `LICENSE`. That is the repo's long-standing practice, not a Run 19 leak, so nothing is rewritten. The question,
  redact the docs going forward or leave them, goes to the user with the push (G12-1).
- **Runner briefs from here** name scan patterns only as "the user's name", never spelled out.

**Why:** the wave ran in full, and every slice ended restored. A history rewrite, or a mass redaction of pushed files, is
not mine to take while the user is away.
**Instead of:** redacting 167 files in the close-out.
**Revisit if:** the user wants the docs redacted.
**By:** Claude (session agent's rulings)

### 2026-10-29 · liveD19's `devtools-left-open` STOP was the capture's own windows; fix round 2 and attempt 2 (#371)
**Decided:** liveD19 attempt 1 (`3fdfbfd`) escalated at R19-RESTORE: `DIALOGS … devtools=2`. The current build was
restored and proven (`LOADED rerun=1 … args=answered`), and the safety state was equal to R19-0.
- **The STOP was not a product result.** The two DevTools windows were the slice's own earlier worker-console capture
  windows. `Save-R19Seg` closes them with `Close-S11Window`, which only closes `S11Own` windows; each reopen also left a
  chrome://extensions window. This path ran for the first time here.
- **This is not an integrity-floor event.** The windows were the wave's own and were closed by the step agent, and
  nothing private or stateful was left.
- **The next step is fix round 2 and then attempt 2**, as proposed. Fix round 2 is recipes only: the segment save closes
  the capture window as the other close paths do, and closes or reuses the Extensions window, with tests. Attempt 2 runs
  into `d2`. liveE19 shares the frame and gets the fix before its run.
- **Control-2's reference is measured.** The old build's raw twin read `kind=undefined`, the same as liveA19's
  control-2, so S7-record judges control-2 PASS by #366. R19-ARGS-OLD's attempt 2 reading replaces this one only if it
  differs, and both are recorded then.
- **The MCP leg's `code=ERROR` stands FAIL as printed** (the tool text carries no code on line 1). S7-record reads it
  with liveA19's MCP legs.
- **`bd523bb`'s trailer slip is recorded, not amended.** It reads Opus for Sonnet-written code; the history is not
  rewritten.

**Why:** a STOP caused by the instrument's own windows, with the build and the state restored, is a helper defect inside
the budget.
**Instead of:** carrying liveD19 as STOPped, which would lose ARGS-OLD's verdict and control-2's reference.
**Revisit if:** attempt 2 STOPs again.
**By:** Claude (session agent's rulings)

### 2026-10-29 · liveC19 done in one attempt; REFUSE `dis` cannot be reached on its page; KEPT and G2-1 read for cause (#370)
**Decided:** liveC19 attempt 1 (`c5ca06a`, `rows=26 warns=0 stop-return=0`) gives 15 PASS, 2 RECORD and 3 FAIL. No STOP
fired. R19-RESTORE was equal to R19-0 with `native=0 devtools=0`, and R19-LOGS passed.
- **Fix round 1 (`0c42637`) is accepted.** CHOOSE-MCP leg b's `{css:"#in"}` pointed at a hidden input, which the locator
  never matches; it now targets the visible `#vis`. The sheet names no element, so this is the driver's choice, as
  in #368.
- **R19-CHOOSE-REFUSE leg `dis` is NOT DISCRIMINATING at S7-record**, with its cause named, never PASS. The page's
  button calls `click()` on a disabled input, which by the HTML spec does nothing. So no chooser opens, and the
  product's disabled-input refusal (after a chooser opens) cannot be reached on that page on any build. The refusal stays
  proved by its unit tests. A row that targets the disabled input itself goes to a later wave.
- **R19-CHOOSE-KEPT stays FAIL**, as printed (`change` 1 where 2 is wanted). The cause, that no `change` fires for an
  unchanged selection, is inferred and not measured. S7-record reads it, and if the evidence shows the cause, the row is
  a finding for a later row with a second file. It is not re-judged.
- **R19-G2-1 stays FAIL until S7-record reads its cause** (B's screenshot timed out at ~35 s in both variants). If the
  covered-window capture hang is shown, its `b=ok` clause becomes NOT DISCRIMINATING; it is never a PASS.
- **`profile-all=1` in the uncommitted actors file** (likely the MCP failure report's absolute screenshot path) is the
  known #349 (a) item. It is noted in the record, and nothing private is committed.
- **Before liveE19's attempt 1**, its step agent fixes the same hidden `#in` target at `recipes/s12-r19-de.ts:81`.

**Why:** a clause the page cannot reach is a sheet defect, named as such. An inferred cause is not a measured one, so it
does not change a verdict. No pass rule moves.
**Instead of:** re-running REFUSE and KEPT with a changed page or file, which would be new rows after an observation.
**Revisit if:** S7-record's cause reading for KEPT or G2-1 shows a product defect; that is a finding for the user.
**By:** Claude (session agent's rulings)

### 2026-10-29 · liveB19 closed at attempt 3; docked DevTools on Chrome 156 does not refuse the bridge's debugger (#369)
**Decided:** liveB19 attempt 3 (`a9393ed`, `rows=24 warns=0 stop-return=0`) gives the slice's verdicts:
- **14 PASS, 3 NOT MEASURED, 1 RECORD.** The NOT MEASURED rows are UP-DEVT, KEEP-4 and SWEEP-HELD; the RECORD is
  DEVT-NOFLAG. No verdict differs from attempt 2. R19-RESTORE was equal to R19-0, and R19-LOGS passed.
- **The opener fix is accepted.** Fix rounds 2–3 (`3478261`, PASS-with-notes) open DevTools through Chrome 156's menu,
  measured by UIA patterns only. The `found=yes` steps and the open pane prove the opener works. The verifier's MINOR (no
  test pins the ClassName finder) is carried.
- **The three DevTools rows stay NOT MEASURED.** DEVPROBE read `answer=ok attached=no` with DevTools open: 31 of 31 calls
  were `ok`, and one more was `ok` 70 s later. Run 18's F12 and Ctrl+Shift+I probes read the same.
- **This is a product-level finding.** On Chrome 156, a docked DevTools window did not make `chrome.debugger` refuse the
  bridge. So the `DEBUGGER_DEVTOOLS` path may be unreachable as the rows are written. Undocked DevTools, or DevTools
  opened before the bridge's first attach, were not measured.
- **It goes to the user** under Open decisions, as #351 (3) foresaw: keep the code and rows (a refusal that cannot be
  built live), find a condition that reproduces it, or drop the claim from `extension/CLAUDE.md`'s "one debugger per
  tab" bullet. No product or doc change is made meanwhile.
- **Two gotcha candidates go to `recipes/CLAUDE.md` at the close-out:** the Chrome 156 app-menu facts, and the fact
  that docked DevTools did not refuse the debugger.
- **liveB19 used every attempt and fix round** (three each).

**Why:** a NOT MEASURED whose instrument now works is a measurement of the product's environment. It is not a helper gap
any longer.
**Instead of:** a fourth attempt with undocked DevTools, which is past the budget, and its opener is unmeasured.
**Revisit if:** the user wants the undocked or DevTools-first conditions measured, as a new row in a later wave.
**By:** Claude (session agent's rulings; the DevTools question open for the user)

### 2026-10-29 · liveB19's attempt 2 accepted; its last attempt is spent on the DevTools opener (#368)
**Decided:** liveB19 attempt 2 (`6b56edd`, `rows=24 warns=0 stop-return=0`) ran with no FAIL. R19-UP-OPT passed at 362 ms
with the #363/#364 fix. R19-RESTORE was equal to R19-0, and R19-LOGS passed.
- **Attempt 1's fix round is accepted.** Attempt 1 stopped at KEEP-1 on a helper target: `{css:"body"}` can never match
  in the locator's walk. Fix round 1 (`a40aa86`) clicks `h1` instead. That is the driver's choice, because the sheet
  names no target, and the expected `ok` is unchanged.
- **The DevTools rows get the last attempt.** R19-UP-DEVT, KEEP-4 and SWEEP-HELD are NOT MEASURED because DEVPROBE found
  no `Customize and control*` menu button: Chrome 156 names it `Chrome`, and it offers only expand. UP-DEVT has been NOT
  MEASURED in three runs, and the slice still has budget (one attempt, two fix rounds). So fix round 2 runs before any
  later slice:
  1. A measurer proves the Chrome 156 menu path to "Developer tools" on a window the wave opened, reading names and
     patterns only.
  2. A fixer updates the opener, with tests.
  3. An Opus verifier checks it.
  4. **Attempt 3** runs the whole of liveB19.
- **How S7-record reads the two attempts:** each row's verdict comes from attempt 3, and attempt 2's verdicts are kept
  beside it. A row that reads differently in the two attempts is reported with both readings, never with the better one.
  If DEVPROBE still reads `attached=no`, the three rows stay NOT MEASURED, and the cause goes to the user.
- **liveA19's stray W window is accepted as closed.** The step agent closed it (fixture tabs only, left open by
  attempt 2's STOP).
- **Three gotcha candidates go to `recipes/CLAUDE.md` at the close-out:** `{css}` never matches `body`, `html` or
  `head`; Chrome 156's menu button is `Chrome`; and a STOP leaves windows open, so list them after it.

**Why:** a NOT MEASURED that a recipes fix can turn into a measurement should get that fix while the budget allows it. No
pass rule moves.
**Instead of:** carrying UP-DEVT NOT MEASURED a fourth time; a separate DevTools-only re-run outside the slice's order.
**Revisit if:** the menu path needs a click on a window the wave did not open (forbidden), in which case the rows stay NOT
MEASURED.
**By:** Claude (session agent's rulings)

### 2026-10-29 · liveA19 done in three attempts; its five FAILs go to S7-record for a cause reading; fix budget per slice (#367)
**Decided:** liveA19 ran to the end in attempt 3 (`785da10`, `rows=32 warns=0 stop-return=0`). R19-RESTORE was equal to
R19-0 by count and hash, and R19-LOGS passed.
- **The five FAILs are recorded, not fixed:** R19-ARGS-1 (SDK `value-equal=4`), R19-ARGS-3 (MCP leg `exact=no`),
  R19-CON-NOTEA, R19-CON-4 (`mcp-refused=no`) and R19-CON-FLOOR (`in-reply-disarmed=0`).
- **S7-record reads the cause of each from the evidence** before writing a verdict. If a helper check is shown wrong
  (the step agent suspects the MCP error-flag check in ARGS-3 and CON-4), the row is NOT DISCRIMINATING, never PASS. A
  product cause stays FAIL and becomes a finding.
- **Both fix rounds are accepted.** Round 1 (`079a063`) is #366's judge and the MCP actor's wait for its link. Round 2
  (`922f757`) makes the window guard accept the three S12 fixture titles; its verifier found liveB19 and liveC19 would
  have stopped on them too.
- **The gotcha** (a fixture title in the driver window) goes to `recipes/CLAUDE.md` at the close-out.
- **Budget:** three attempts and three fix rounds **per slice**. Each slice has its own step agent and starts from a
  clean tree, so liveA19's two rounds do not count against liveB19–E19.
- **Carried to liveB19:** verifier2's MINOR-1, a step in KEEP-3 that may give window X an error-page title.

**Why:** cause before verdict, with no pass rule moved. A per-slice budget matches how the slices run.
**Instead of:** a fourth liveA19 attempt to re-measure the FAILs, which is out of budget and would fix nothing in the
product.
**Revisit if:** S7-record finds a FAIL whose cause needs a re-run with a corrected helper; that is a new row in a later
wave.
**By:** Claude (session agent's rulings)

### 2026-10-29 · liveA19's STOP was a wrong constant in the sheet; control-2 is judged against the old build's measured answer; the MCP actor waits for its link (#366)
**Decided:** liveA19 attempt 1 (`e1c05c4`) stopped at R19-ARGS-1 on `existing-tool-changed`, but no tool had changed.
The control-2 constant `kind: "function"` for `evaluate "function f() {}"` came from a fake-extension test. A real page
treats that source as a declaration and answers `kind: "undefined"`; `(function f() {})` answers `function`
(the step agent's one probe). The STOP would have fired on any build.

Control-2 keeps its purpose, "a call without `args` answers as before", now measured instead of assumed:
- **liveA19:** control-2 must answer `ok` (else STOP), and its kind is recorded.
- **liveD19:** R19-ARGS-OLD's raw no-`args` twin sends the same call to the pre-S2a build, as the reference.
- **S7-record:** equal kinds PASS, different kinds FAIL; NOT MEASURED if ARGS-OLD is NOT RUN.

**Fix round 1 (recipes only, Sonnet fixer, Opus verifier)** covers that judge change in `-a.ts` and `-de.ts`, plus the
step agent's helper fix. The scripted MCP client waits up to 15 s while it gets the "connecting to the bridge daemon"
reply. An empty tab handle stops the helper instead of being sent. Every MCP-actor driver gets the fix (ARGS-1, ARGS-3,
CON-MCP, CON-CAP and the -C/-DE MCP legs). Attempt 2 runs from a fresh out folder.

**This is a correction after an observation.** The dated §4.27 note says so. It is a contract-level reading of the
sheet, so it is listed under Open decisions for the user.
**Why:** a constant copied from a fake cannot define "as before". The old build's measured answer can, and liveD19
already loads that build. The alternative of editing the expression to `(function f() {})` keeps the constant but
changes what the control sends, after seeing its answer.
**Instead of:** editing the expression; dropping control-2; judging it from the code alone.
**Revisit if:** the old build answers a different kind (then control-2 FAILs, and that is a finding); ARGS-OLD cannot run.
**By:** Claude (session agent's ruling; open for the user's review)

### 2026-10-29 · S7-drivers-DE accepted; liveE19 adds ROOT; ARGS-OLD's raw leg proved by its unit test (#365)
**Decided:** S7-drivers-DE (`babf405`, PASS-with-notes in the first verifier round, 21 mutants killed; 153 code /
236 test lines) and its three proposals (`…-steps/S7-drivers-DE.md` §5), each in a dated §4.27 note before any Run 19
observation:
1. **liveE19 adds `<ROOT>` inside R19-VERSION**, and R19-RESTORE restores it by hash.
2. **An old build that will not load is detected from the reload block's record line.** Its row is then `NOT RUN`, and
   the guard's own STOP count is cleared.
3. **In R19-ARGS-OLD's raw leg, "nothing forwarded" is proved by the unit test** and is named as not discriminating
   live.

The verifier's five small notes are carried as that report lists them. Its finding that Git Bash's `cmd //c rmdir`
leaves junctions in place, where PowerShell's `cmd /c rmdir` removes them, is a gotcha candidate for the close-out
(with #364's).
**Why:** the control upload needs ROOT, and the restore already reads it back. A check that cannot discriminate live is
named, not left looking like a proof (agent-rules §3 item 9 is satisfied by the unit test, which discriminates).
**Instead of:** a separate root-add block in liveE19's order (it changes the sheet's order); a live instrument in the
daemon.
**Revisit if:** the old builds do not load (both rows NOT RUN).
**By:** Claude (session agent's rulings)

### 2026-10-29 · S7-helpers-e accepted; the UP-OPT fix lives in Run 19's own helper copy (#364)
**Decided:** S7-helpers-e (`afccec8`, PASS-with-notes after one fix round; 15 code / 140 test lines) as proposed in
`…-steps/S7-helpers-e.md` §5:
- **The fix is in `Invoke-S19Opt`, not in `Invoke-S11Opt` as #363 worded it.** It is a patched copy that only Run 19
  calls.
- **Its two new lines are record lines.** `OPT O2 front …` and `FIX R19-UP-OPT …` are never judged; a dated §4.27 note
  says so before any Run 19 observation.
- **MINOR-1b is carried.** Four deliberate want-override forms still pass the tests (alias, `delete`, a `calls` edit).
  It is fixed by the next slice that edits `WANT` or the `calls` table.
- **liveD19's and liveE19's `DIALOGS` line goes to S7-drivers-DE.**
- **The verifiers' finding is a gotcha candidate for the close-out.** A worktree with its own `npm ci` still holds
  `node_modules/@bridge/*` junctions, which `git worktree remove` cannot delete; they are removed one by one first, as
  #220 says.

**Why:** Runs 16–18 stay reproducible as they were measured. The overrides that are likely to be written by accident
are already killed.
**Instead of:** editing the shared helper; a second fix round for deliberate forms.
**Revisit if:** R19-UP-OPT still reads `shown=no`.
**By:** Claude (session agent's rulings)

### 2026-10-28 · S7-drivers-C accepted; UP-OPT's cause is the helper's poll, fixed in S7-helpers-e (#363)
**Decided:** S7-drivers-C (`836a79e`, PASS-with-notes after one fix round; every liveC19 block driven; 662 code / 462
tests) with its proposals (`…-steps/S7-drivers-C.md` §5): the two RECORD rows print `RECORD`; JSOFF's MCP half is
CHOOSE-MCP leg d; CHOOSE-KEPT runs both calls on one fresh page; the `DIALOGS` count leaves out the capture window; and
`wave-windows-open` is a record. On the open choice, liveA19 and liveB19 print `DIALOGS` too: option (a), the conservative one, because it reads more.
The UP-OPT investigator (`…-steps/S7-up-opt-investigator.md`, 25 runs on a scratch Chrome) found the helper's poll is
the cause, not the page. The page held the saved text in O2 within 12–23 ms. The helper's write into O brings O to the front, and UIA does not
read a fully covered O2. **No product finding.** A new recipes-only slice, **S7-helpers-e**, comes before -DE: (1) `Invoke-S11Opt`
brings O2 to the front after the save, timed from the save, the conflict read too, with a `FIX` line; (2) liveA19's and liveB19's
R19-RESTORE call `Write-R19Dialogs`; (3) verifier2's MINOR-1 (a test that a row's want is not overridden at its call
site). Verifier2's MINOR-2 is closed by the record ruling. Dated §4.27 note written before any Run 19 observation.
**Why:** each keeps the row testing what it was written for; the bound is not moved; the fix is on the instrument the
investigator measured.
**Instead of:** a product change on the options page; a §4.27 note narrowing DIALOGS to liveC19.
**Revisit if:** R19-UP-OPT still reads `shown=no` with the fix (then the investigator's inference about Run 18's window
order is wrong; it was not measured there).
**By:** Claude (session agent's rulings)

### 2026-10-28 · S7-drivers-B accepted with its four rulings; KEEP-4's step timing (#362)
**Decided:** S7-drivers-B (`83521aa`, PASS-with-notes after one fix round; every liveB19 block driven) as its four
proposals (`…-steps/S7-drivers-B.md` §5): the carried banner rows FAIL with counts and never STOP; KEEP-3's navigation
legs use window X's omnibox; SWEEP-HELD runs as two actor runs around the reload; SWEEP-HELD's "DevTools still open"
reads the DevTools window as alive (it misses a DevTools left open but detached; the after-reload code still carries
that case). A dated §4.27 note, before any Run 19 observation, makes KEEP-4's "within 1 s" step "before the keeper's
5 s idle bound, the time printed" (the menu method takes ~3.6 s) and records the other three. The first verifier's
half-deleted scratch worktree (`wtv`, in the session scratchpad, with npm workspace links) is left in place: deleting
across links is the #220 hazard, and it is outside the repo.
**Why:** each keeps the row testing what it was written to test; none moves a pass rule.
**Instead of:** a STOP on a carried banner reading (would end liveB19 before its own rows).
**Revisit if:** DEVPROBE fails (KEEP-4 is NOT MEASURED anyway).
**By:** Claude (session agent's rulings)

### 2026-10-28 · S7-drivers-A accepted; CON-FLOOR's waits; the scripted MCP actor; driver caps raised (#361)
**Decided:** S7-drivers-A (`17b2f7d`, PASS-with-notes after two fix rounds; all 26 liveA19 rows driven) is accepted at
732 code lines against 400 (1.8×, past #344 (4)'s bound) as one coherent piece: the cap was my estimate, every row needs
its driver, and two verifiers passed it. For **-B, -C, -DE the code cap is set to 750 before they start** (tests up to
600), as drivers proved larger than #360 assumed. Before any Run 19 observation, a dated §4.27 note: R19-CON-FLOOR's
waits become 5 s and 3.5 s (the fixture ticks each 1 000 ms, so 3 s with ±500 ms margins judges two ticks against
`≥ 3`; thresholds unchanged); CON-4's "title" is the log line; the headless MCP actor is a scripted stdio client of
`mcp/dist/index.js`; tab lists in actor records are kept as counts and fixed words only (privacy, approved). MINOR-A
(the disarm check accepts any non-armed title, a failed read included) is fixed in -B, which reuses the helper.
**Why:** a wait that cannot meet its own threshold is a sheet defect found before the run, not a result; the actor
change keeps the tool text under test.
**Instead of:** leaving a likely false FAIL in; a model-driven actor (slower, nondeterministic, same tool text).
**Revisit if:** a driver slice still overruns 750.
**By:** Claude (session agent's rulings)

### 2026-10-28 · Run 19's row drivers are four more slices; S7-helpers-d's overrun accepted (#360)
**Decided:** S7-helpers-d (`c9ee1af`, PASS-with-notes after one fix round; DONE-PARTIAL) built the runner's frame (order,
STOP → RETURN, restore on throw, the swap's `finally`, the UP-OPT gate, forms (28), (29), (31), (32), the aggregator) but
no row drivers: #357's split missed them (my split, not the slices'). They become **S7-drivers-A** (liveA19's rows),
**-B** (liveB19, incl. `DEVPROBE`, `SWEEP-HELD`'s reload segments), **-C** (liveC19, incl. `CLOSERPROBE`'s use and the
G2 rows) and **-DE** (liveD19 and liveE19), sequential, risk low, code cap 400 with tests up to 600 each, each
registering its drivers as `$global:R19Blocks[...]` and carrying S7-helpers-d's notes N-1–N-5 where they bind. S7-helpers-d's
519 code lines against 400 are accepted as one coherent frame (verified; splitting it after the fact gains nothing);
#344 (4)'s rule otherwise stands. Its proposals: a throw before any state change prints `STOP throw-after-state`; the
UP-OPT investigator's report is `…-steps/S7-up-opt-investigator.md`, counted by the gate only once committed. M5 did
not recur in 23 runs (#359 closed).
**Why:** the run cannot start without drivers; each slice is one Run 19 slice.
**Instead of:** one large drivers slice.
**Revisit if:** a drivers slice reports DONE-PARTIAL.
**By:** Claude (build decision)

### 2026-10-28 · S7-helpers-c as built; its one unexplained test failure is hunted in S7-helpers-d (#359)
**Decided:** S7-helpers-c (`6a5a158`, PASS-with-notes after one fix round, three MAJORs fixed) as its proposals: the
swap leaves the old build in `extension/dist/` and the runner restores HEAD, so **S7-helpers-d calls `swapOldBuild`
inside a `try` whose `finally` always calls `restoreHead` and then the reload** (M1: three throw paths otherwise leave
the old build; their error wording is fixed in -d); the human-style click acts only on window X and sends nothing
unless the window under the point is X. **M5** (one test of `recipes/test/s12-ps-c.test.ts` failed in one full run,
unnamed; not in twelve later runs) is an unexplained firing (`agent-rules.md` §3 item 8): taken by the session agent,
not waved through: S7-helpers-d's verifier runs that file 20 times alone and 3 times inside the full suite and names
any failure; a recurrence is fixed in -d (a flaky guard on the live path is not acceptable), none is recorded with the
counts.
**Why:** the closer and the swap guard the user's screen and extension; an intermittent test there must be explained.
**Instead of:** accepting "did not recur" as the explanation.
**Revisit if:** it recurs in S7-helpers-d.
**By:** Claude (session agent's ruling)

### 2026-10-28 · §4.27's line-form gaps settled before Run 19 (#358)
**Decided:** S7-helpers-b (`e5b8341`, PASS-with-notes after two fix rounds; DevTools by Chrome's menu through UIA,
`uia-menu`, judged only by the control) found that forms (15) and (16) have no spelling for a banner that never went
off; a dated note in §4.27, written before any Run 19 observation, adds `end-ms=never`, judged as no end seen (a FAIL of
the end-time clause). The helpers' other wording findings (S7-helpers-a.md §6, S7-helpers-b.md §6) are settled by the
same note as their reports read; no pass rule moves. `uia-menu` is accepted as the DevTools method to try, the
`DEVPROBE` deciding.
**Why:** a grammar gap must be closed before the measurement, not after (`agent-rules.md` §2).
**Instead of:** letting S7-record interpret a line outside the form.
**Revisit if:** the DEVPROBE fails (every DevTools row NOT MEASURED, as §4.27 says).
**By:** Claude (session agent's ruling)

### 2026-10-28 · S7-helpers is four slices, run in order (#357)
**Decided:** Run 19's helpers (§4.27's 33 new line forms, the S12 fixture pages, #351 (4)'s three fixes, the runner)
are split, each risk low, code cap 400 with tests up to 600 (#344 (4)), one step agent each, sequential (one lane):
**S7-helpers-a** the fixture pages (§4.27's S12 pages, `#tb` and the click counter on `e2e-playground.html`), #351 (4),
and forms (1)–(13) for liveA19; **-b** forms (14)–(20), (25) and `DEVPROBE` for liveB19; **-c** forms (21)–(24), (26),
(27), (30), (33), `CLOSERPROBE`, and the old-build swap of #356 (2) for liveD19/liveE19; **-d** the Run 19 block runner
for liveA19–liveE19 with (28), (29), (31), (32) and the aggregator.
**Why:** one coherent deliverable each under the cap (`agent-rules.md` §7).
**Instead of:** one slice (it would overrun several times).
**Revisit if:** a slice finds its share far smaller than estimated (then -c and -d may merge).
**By:** Claude (build decision)

### 2026-10-28 · S7-sheet: what Run 19 cannot discriminate live; how an old build is loaded; the class note (#356)
**Decided:** S7-sheet (`a1b8544`, §4.27, 56 rows, verifier PASS-with-notes after two fix rounds): (1) **"no attach after
a disarm" cannot be made discriminating live** where the refused call follows a debugger call by seconds (KEEP-1's
banner clause, KEEP-3, CHOOSE-DISARM): no attach counter exists and #351 forbids building one. Those clauses rest on the
answers and the unit tests (S4a/S4b's disarm mutants), and §4.27 Open item 5 says so; it is listed for the gate, not
hidden (`agent-rules.md` §3 item 9, taken by the session agent: record, continue). (2) **An old build is loaded only by
replacing the main tree's gitignored `extension/dist/` with the old commit's build** (made in a scratch worktree with its
own `npm ci`, #220) and pressing reload by `recipes/reload-extension.ps1`; never "Load unpacked" from another folder (a
second extension in the user's profile, outside the grant). Each old-build slice ends by rebuilding HEAD into
`extension/dist/`, reloading, and proving the loaded build by R19-0's re-run line; a failed proof is a STOP that
escalates to the user (the extension may be stale). These slices (liveD19, liveE19) run last. (3) Phase doc 0.5 says
class `tab`; #334 rules `evaluate`: a dated note in 0.5 records it (written now). (4) The sheet's five unsourced bounds
are labelled as its own choices and are not tuned after the run.
**Why:** the integrity floor (say what a check cannot see); the user's profile holds exactly one bridge extension.
**Instead of:** a product attach counter (#351); loading the old build as a second unpacked extension.
**Revisit if:** the user wants the counter.
**By:** Claude (session agent's rulings)

### 2026-10-28 · S5b as built; an old extension's `chooser` is refused `VERSION` by a hello feature, as #332 (#355)
**Decided:** S5b (`5a5cd46`, verifier PASS-with-notes after one fix round): `Tab.upload(…, {chooser})` sends the key only
when given, a non-boolean refused `BAD_PARAMS` before files are read; `browser_upload_file {chooser}` as a written-out
#214 delta (three tools now differ from the fixture, each by its delta); `formatConsole` capped at 20 000 characters in
`formatNetwork`'s form, keeping the oldest lines (for user review, S5b F5: a console reader may want the newest;
`limit` narrows the read meanwhile); the `chooser` texts and the null/non-boolean rule for user review. **An extension
older than S5a ignores `chooser`** and treats the target as a file input (misleading, loosens nothing): the conservative
option, with #332's precedent, is built as **S5c**: the extension's hello adds `"uploadChooser"` to `features`, and the
daemon answers `VERSION` with a reload text to an `uploadFiles` carrying `chooser` when the hello lacked it, never
forwarding it. Tests 5075 → 5087 (S5b alone), none removed.
**Why:** an agent must not get a file-input answer to a chooser request from a stale build; the same mechanism already
exists.
**Instead of:** documenting the stale-build case only (S5b's interim).
**Revisit if:** the user prefers fewer feature names (then one `"step12"` feature).
**By:** Claude (conservative option applied; the texts and the cap's direction for user review)
*Built 2026-10-28 as S5c (spec note `d38b590`, code `11a1210`, verifier PASS-with-notes after one fix round): the rule
fires whenever the `chooser` key is present, `false` and `null` included, so an explicit `chooser: false` to an old
extension is refused too (stricter than needed; for user review: refusing only a value other than `false` would also
be safe). Tests 5103 → 5111.*

### 2026-10-28 · S6-G2: the daemon focuses under its own hold; an earlier client `focusTab` stays harmless (#354)
**Decided (contract-level, for user review):** S6-G2 (spec note `e467f48`, code `ae123de`, verifier PASS-with-notes
after one fix round) as built: a trusted `click`/`type`/`pressKey` without `focusEmulation` takes the lock, the daemon
forwards `focusTab`, re-checks caller and lease, forwards the input, replies, holds 500 ms, releases. The SDK and MCP
still send their own `focusTab` first (#89, #106); that call takes and frees the lock as before, then the daemon
focuses again under its hold: no deadlock, the answer on success is the input's, the cost one round trip and up to
500 ms before the caller's next lock-taking call. They are not changed in Step 12 (their lanes are closed; dropping the
client focus is a later simplification, noted for S8 at `sdk/src/policy.ts:36` and `mcp/CLAUDE.md`). A failed, late or
disconnected focus, or a lost lease, answers the `focusTab` error, sends no input and releases without the pause; a raw
client's trusted input now brings its tab to the front and may see `focusTab`'s refusal text (same code). The step
agent's own note: a rejecting injected `sleep` would hold the lock until disconnect (the default never rejects):
`.then(release, release)` is a one-line hardening, listed for the gate's fix list (it cannot happen in production,
and S8's lane is docs only).
**Why:** #321 Q6 (b) as ruled; #338's mechanism; nothing existing answers differently on success.
**Instead of:** changing the SDK and MCP focus path now.
**Revisit if:** Run 19's R19-G2 rows show a capture between focus and input.
**By:** Claude (build decision; the contract points for user review)

### 2026-10-28 · S5a: the chooser's refusal texts; two by-construction claims and the disarm wait go to Run 19 (#353)
**Decided (texts for user review):** S5a (spec note `8eab22c`, code `2099c08`, verifier PASS-with-notes after one fix
round) as its proposals (`…-steps/S5a.md` §5): a second chooser call on the same tab answers today's
`DEBUGGER_DEVTOOLS` text ("close DevTools") even with no DevTools attached (no new code is allowed; the misleading
wording is for the user); the chooser's input checks reuse today's messages, some naming a "file input"; the value
rule `uploadFiles: chooser must be true or false`. Carried as Run 19 rows, not fixed now: (a) a human's own click on
an Upload button **of the same held tab** during the call's 5 s window would be answered by the call (files only from
the Upload folders; by construction, unmeasured); (b) a page that opens its chooser after the call ends gets no Chrome
dialog on a background tab (as today without interception, Stage 0 m2 E4); (c) a disarm during the 5 s wait answers
`DISARMED` only at 5 s (fails closed; an early end needs the keeper); (d) the click in the upload's isolated world and
`DOM.describeNode` without `DOM.enable` (unmeasured). (a) is named to the user at the gate as what they see.
**Why:** no rule allows a new code or a changed existing message; the four are measurable live and none loosens the
gate.
**Instead of:** new refusal codes; a keeper change in S5a's lane.
**Revisit if:** Run 19 shows (a) happens in practice, or (d) fails.
**By:** Claude (build decisions; the texts and (a) for user review)

### 2026-10-28 · S4b: the keeper installed by the worker; two live facts measured before Run 19 (#352)
**Decided:** S4b (`63c771c`, verifiers PASS-with-notes ×2 → PASS, two fix rounds) as its five proposals
(`…-steps/S4b.md` §5): the keeper is installed by the worker only, so tests importing `debugger.ts` alone keep the
per-call path (no existing test exercises the production kept path; the live rows do); a CDP command failed or
unfinished at a use's end drops the session; V3-4 waits on KEEP-2's timings; the keeper's tab check is a class-`tab`
gate at phase `effect`, bounded at 1 s; the re-check runs after a pending detach and again if a newer one began. The
lane deviation (two lines in `handlers/console.ts`, a call site S4a's handoff named) is accepted. **Two facts that
decide whether existing answers change are measured now in a scratch Chrome on a temporary profile (#294, #297), not
left to Run 19:** CON-KEPT (does a second `Runtime.enable` in the same kept session replay the earlier console
messages? if not, `consoleMessages` on a kept tab answers differently, a STOP-class change, and S3a's handler must
reset the store's read another way) and SWEEP-HELD (#335: the start-up sweep's `detach` of a tab another client holds:
its error and that it has no side effect).
**Why:** "answers do not change" is a promise of D; a kept session is new, and the console replay was measured only
across sessions (Stage 0 m1 C7).
**Instead of:** shipping S4b on the hope that Run 19 shows it.
**Revisit if:** either measurement fails: then a proposed fix slice before S5, or C's handler detaches its own session
(a keeper bypass for `consoleMessages`).
**By:** Claude (build decisions; the measurement is the conservative option)
*Measured 2026-10-28 (`…-steps/S4b-measurer.md`, scratch Chrome 156 on a temporary profile, with
`--enable-unsafe-extension-debugging`, the no-flag case unmeasured): CON-KEPT holds 5 of 5 (a second `Runtime.enable` in
the same session replays every earlier message, in order, same timestamps), so `consoleMessages` on a kept tab answers
as on a fresh one; SWEEP-HELD holds 15 of 15 (our `detach` of a tab another client holds answers `Debugger is not
attached to the tab with id: N.`, the other client keeps working; the sweep ignores it). Two extensions attached to one
tab at once in that flagged setup (SH-4): `extension/CLAUDE.md`'s one-debugger-per-tab bullet stays until Run 19's
no-flag DevTools row measures the real profile (#339).*

### 2026-10-28 · Run 18's findings: UP-OPT measured first, the banner FAILs carried to Run 19, DevTools proven by a probe, three helper fixes in S7 (#351)
**Decided:** Run 18 (`…-steps/S1-run-record.md`, `63f2f89`; 17 verdicts: 10 PASS, 6 FAIL, 1 NOT MEASURED; both banner
controls passed) as its four proposals (§6), with one narrowing: (1) R18-UP-OPT's FAIL (O2 showed no saved text in
15 s) is a product finding; before any product change a read-only investigator measures a second options window on its
own, and any fix is a new Run 19 row; the 5 000 ms bound stands. (2) The banner FAILs (R18-UP-6, R18-F-RAW, -F-RAW-2,
-F-RAW-DIR) stay open findings, cause not established (two UP-6 legs that send no call read `banner=seen` beside a
passing control); they are carried to Run 19 as new rows after S4b. **No new product counter is built** to tell which
call attached (it would touch the logging and gate rules: the user's, G12-2); S7-helpers may use only existing signals
(the daemon's per-call log lines, the runner's own timing). (3) R18-UP-DEVT stays NOT MEASURED (F12 attached nothing,
twice); a row-less probe proves a DevTools-attach method by its control before any row uses it. (4) Three recipes-only
helper fixes (the UP-OPT row's wording; the console clauses judged before R18-LOGS; the preflight rows printed once)
are built in S7-helpers. Run 18's verifier NIT (the §5 entry points to a section 7 that no longer holds the text) is a
mechanical fix for the cleanup pass.
**Why:** cause before cure; no pass rule moved; a product instrument is beyond the ruled scope.
**Instead of:** product fixes on unmeasured causes; another F12 row.
**Revisit if:** the investigator shows O2 updates within 5 s with a corrected poll; the user wants the instrument.
**By:** Claude (build decisions; (1) and (2) are product findings for user review)
*Resolved 2026-10-29 (cleanup pass): (1) no product finding, the helper's poll (#363), R19-UP-OPT PASS; (2) not
reproduced in Run 19 (#373).*

### 2026-10-28 · A step agent that ends its turn on a running runner stalls the stage; live step agents wait in-turn (#350)
**Decided:** the liveB18 step agent ended its turn while its live runner ran ("waiting on my watch", against #286 and
`agent-rules.md` §8); the runner's completion notice then reached the session agent, not the step agent, which never
resumed: the finished run (21:00Z) sat unreported for ~6 h until the user asked. The session agent did not act on the
runner's notice either (it read it as interim). From now on every step-agent brief that holds a wait says it in so many
words: **wait inside the turn with Monitor (an until-loop on the child's report file, polling ≤ 120 s) and never end
the turn while a child runs**; and when the session agent receives a grandchild's completion notice, it checks within
that turn whether the step agent is still alive and, if not, sends a fresh one from the ledger (#225).
**Why:** the stall cost hours and was found by the user; #286's rule was known and not kept.
**Instead of:** trusting the standing rule alone.
**Revisit if:** the Agent tool routes a grandchild's notice to its parent.
**By:** Claude (process decision)

### 2026-10-27 · S1-live: R18-LOGS slice A's `profile=2` stands as a FAIL; liveB18 runs; the two paths are named (#349)
**Decided:** Run 18 liveA18 attempt 2 (built from `b8b493d`, a helper fix only; `…-steps/S1-live.md`) printed the
actors scan's `profile=2`, a STOP line of the helper by §4.26's committed rule ("0 for … the profile path"). The rule
is not changed and no match is excluded after the fact (`agent-rules.md` §2): **R18-LOGS slice A is judged FAIL as
written**, with its cause recorded. The two matches, both in the `sv-cycle` actor's tool result (an MCP agent's
transcript in the wave's own output folder, not a product log and not committed evidence): (a) the MCP failure
report's `Screenshot: <absolute path under the user's home>\.chrome-agent-bridge\failures\….png` line, the product's
designed reply to the caller since Step 8 (decisions-archive/step8.md #93, #120: the report names the saved
screenshot); (b) Claude Code's own `[Image: source: …]` line for the image item, not product output. Neither breaks the
root invariant (product code never **logs** a path) nor the phase doc's STOP rule (a path in a log or committed
evidence), so it is not a phase STOP: the phase continues. (a) is a **product finding for the user**: an MCP failure
report hands the agent an absolute path under the user's home; whether that reply should name only the file
(`failures\<name>.png`) is the user's to rule (a contract change of #93's report text, not built here). A later run that
wants the scan to discriminate gets a **new row**, written before its run (Run 19's R19-LOGS: the actors scan reads
product log lines and tool text only, the failure report's own line and the client's image line counted separately and
named), never an edit of R18-LOGS. **liveB18 starts as its attempt 1** (it runs no actor, so (a) and (b) cannot recur;
the found state was restored and read back equal); liveA18 is not re-run (the same measurement). The R18-UP-L1 and
R18-SAVE-REFUSE `ROW` lines were not printed because the runner prints them after R18-LOGS: S1-record judges those two
rows from their printed clause lines against the pre-written rule, and any clause without its printed line is NOT
MEASURED. R18-UP-OPT (O2 not shown within 15 s) and R18-UP-6 (`outside: banner seen`) FAIL with a passing control:
product findings, proposed by S1-record.
**Why:** the integrity floor forbids re-tuning a scan after its result; the slice's safety state is intact; the
remaining rows measure different things.
**Instead of:** excluding the two lines from the scan (weakening a pre-registered check); stopping the phase (no phase
STOP fired); re-running liveA18 (the same answer).
**Revisit if:** the user reads §4.26's "no path under the user's profile" as covering a tool result the product sends
by design, and rules the report text.
**By:** Claude (session agent's ruling of an escalation; (a) for user review)

### 2026-10-27 · S1-helpers-c: the runner applies the per-slice banner rule; fresh output per attempt; teardown never restores (#348)
**Decided:** S1-helpers-c (`8a8e1b0`, verifier 3 PASS-with-notes after two fix rounds) as proposed in
`…-steps/S1-helpers-c.md` §5: the runner applies §4.26's per-slice banner-control rule (#340) and prints NOT MEASURED
for a banner clause only when its other clauses passed; every slice and attempt gets a fresh `S11_OUT` and `-Att`;
teardown never restores, and after a failed-restore STOP the runner returns (the live runner then escalates). Its
findings: §4.26 lists the console capture before the reload, and only reload-then-capture works (the runner does
that; §4.26 is not edited, and S1-record notes it); the UIA exposure of an empty warned list is unmeasured (R18-0
STOPs before any state change if absent). Note H1 (the banner rule's pattern narrower than the verdict's) binds: no
helper's `ROW`/`CHECK` wording changes before S1-live.
**Why:** the sheet's rules, applied by code; a STOP never re-tries a restore blind.
**Instead of:** S1-record applying the per-slice rule by hand.
**Revisit if:** R18-0 STOPs on the warned list.
**By:** Claude (build decision)

### 2026-10-27 · S4a: the keeper's eight edge rules; V4-1's fix goes in S4b (#347)
**Decided:** S4a (`c9bb6cb`, verifier 4 PASS-with-notes after three fix rounds; two MAJOR races, each a session left
attached, found by verifiers 1 and 3 and fixed) as its eight proposals (`…-steps/S4a.md` §5): a kept session detaches
after any error of a use, a failed clean-up calls `drop()`; a re-check refusal of `JS_DISABLED` or `UPLOAD_REFUSED`
keeps the session (the tab's page is still allowed; the idle bound ends it), any other refusal or failure detaches; a
refusing re-check of a busy tab answers the refusal; a use waits at most 1 s for a pending detach on its tab; a session
killed during its attach is detached when the attach lands; `onDetach` forgets the entry and re-reads `getTargets`
within 1 s, detaching if the tab still reads attached or the read fails; the post-attach tab check releases only its
own entry; S4b bounds `tabCheck` at its source. **V4-1** (MINOR: a slow detach can make one call answer a false
`DEBUGGER_CANCELLED`, nothing left attached) and V3-4 (NIT, fails closed) are fixed in S4b, which reopens the module,
rather than by a fourth (Opus) fix round now. S4a's tests ran 710 lines against 675, within §7's 1.5× bound.
**Why:** each rule fails closed toward "nothing attached"; the known fix is one line in the slice that wires it.
**Instead of:** a fourth fix round on an unwired module.
**Revisit if:** S4b's verifier finds V4-1 changes an existing answer.
**By:** Claude (build decision)

### 2026-10-27 · S1-helpers-b: the Run 18 scanner, `raw-l1`, a missing list STOPs; two process slips (#346)
**Decided:** S1-helpers-b (`1bf351e`, verifier 4 PASS-with-notes after three fix rounds) as ruled in
`…-steps/S1-helpers-b.md` §5: `s11b scan18` follows §4.26's fixture definition and does not count a `://` with no
scheme; the old scanner's false FAILs came from the helpers' own `SCAN …: ://=` text and from `127.0.0.1:8081`, not the
extension's own page, so §4.26's stated cause and S7-run-record §5 item 8 are wrong on the cause (a finding; neither is
edited, the sheet's rule is unchanged); `s11b raw-l1` makes R18-UP-L1's two raw calls once; a missing Upload-folders
list element is a STOP, never a count of 0. S1-helpers-c's runner checks both option-page lists at R18-0 before any
state change (an empty `uploadfolders-warned` list's UIA exposure is unmeasured), keeps an outer `try` and uses no
`SilentlyContinue`. 757 lines (code 259 under its 350 cap) are within #344 (4). **Process slips, recorded:** the
builder ran `git checkout -- recipes/s11-win.ps1` once (forbidden by `agent-rules.md` §10; no other agent's work was in
that file), and verifier 1 wrote `core.autocrlf` into `.git/config` and removed it (checked absent at 2026-10-27
session-agent time). No damage found.
**Why:** the sheet's pass rules stand; the helpers read them.
**Instead of:** editing §4.26 after its commit (forbidden).
**Revisit if:** R18-0 shows the warned list is not exposed.
**By:** Claude (build decision)

### 2026-10-27 · S3b: the console formatter's line form; its output is capped in S5b; the JavaScript-off line left for the gate (#345)
**Decided:** S3b (`beaa805`, verifier PASS after one fix round): (1) for user review: `formatConsole`'s one-line form and
its export on `@bridge/sdk/format` only (the SDK's eight values unchanged), as `…-steps/S3b-builder.md` §5. (2) Its
output is not capped and can reach ~400 KB at 200 entries (S3b verifier F4), while `formatNetwork` caps at 20 000
characters: the conservative option is a cap of the same form and size, built in **S5b** (the next slice in the
sdk/mcp lane), with a test; the new tool has no earlier answer, so nothing existing changes. (3) A refused
`browser_console_messages` with JavaScript off prints the shared `JS_DISABLED` line, which says every other call still
works (F3): the line is not changed in Step 12 (a changed message is a forbidden fix to make a row pass, and the line is
contract); the user rules it with #334, which would remove the case.
**Why:** an uncapped tool result can flood the agent's context; the message is the user's with the class.
**Instead of:** measuring the size live first (CON-MCP still records it).
**Revisit if:** the user rules #334 for class `tab`.
**By:** Claude (build decision for (2); (1) and (3) for user review)

### 2026-10-27 · S3a: the reply `{entries}` and the `level` threshold; a shortened preview fails closed now; caps count code from here on (#344)
**Decided:** S3a (spec note `7b29b5d`, code `e835eb5`, verifier PASS-with-notes after two fix rounds): (1)
contract-level, for user review: the reply is `{entries}` and `level` is a severity threshold (`error > warning > info
> debug`, the level and everything more severe); (2) build decisions as `…-steps/S3a-builder.md` §5: the arm floor in
worker memory from the worker's start, failing closed; the source set, an entry with no source dropped; a 100 ms settle
and a 10 s bound; (3) **Note A is fixed now, not left to a live row:** a preview value V8 shortened (a cut part ending
in `…`) counts as an unknown source and drops its entry, the fail-closed option, built in S3b with the lane widened to
the reducer and its test (security at least as strict; a few lines). (4) S3a's 898 lines (code 351 under the 450 cap)
are accepted; #341's "Revisit if" has now been met twice, so **from S3b on a slice's cap counts code only, and tests
up to 1.5 times the cap on top**; a slice past either bound is DONE-PARTIAL.
**Why:** the shortening is unmeasured and a leak cannot be judged after the fact; the old caps under-counted the test
rows the exit checks require.
**Instead of:** waiting for a live row on Note A; keeping caps that every standard slice overran.
**Revisit if:** the live row shows entries dropped that should not be (then the rule is narrowed with a measurement);
a code-only overrun.
**By:** Claude (build decisions; (1) for user review; (3) the conservative option)

### 2026-10-27 · S1-helpers: the Run 18 block runner is its own slice, S1-helpers-c (#343)
**Decided:** S1-helpers-a (`8a3053b`) found that no slice of #339's split builds the Run 18 block runner (the script that
runs §4.26's blocks in order and calls the helpers). It becomes **S1-helpers-c** (risk low, cap 400), after
S1-helpers-b (UP-RACE-A, UP-OPT, the aggregator fixes, G-23's items, and S1-helpers-a's open MINOR F-b, the
`answer=VIOLATION` word outside §4.26's `answer=<ok|CODE>`). S1-helpers-a's ruling that an idle under 15 s on the
negative leg is that row's FAIL (§4.26's pass rule), while an `IDLE` under 15 s before a banner row is a helper STOP
(#340), reads the sheet as written.
**Why:** the runner is one coherent deliverable; adding it to S1-helpers-b's 350 would break the cap.
**Instead of:** raising S1-helpers-b's cap.
**Revisit if:** S1-helpers-b finishes well under its cap with the runner trivially small.
**By:** Claude (build decision)

### 2026-10-27 · S2b: `browser_evaluate.args` as a written-out schema delta; the daemon's own reload text; the SDK's ninth refusal (#342)
**Decided (contract-level for the schema and texts, for user review):** S2b's three proposals (`…-steps/S2b-builder.md`
§5): the #214 baseline is not regenerated; `browser_evaluate` gains `args` as a written-out delta in
`mcp/test/s2-focus-first.test.ts` (every other tool still equals the fixture); the daemon answers an `args` call to a
featureless extension `VERSION` with its own text `ARGS_RELOAD_HINT`, and the key's presence (`null` included) counts as
carrying `args`; the SDK refuses a non-string `fn` with `args` (a ninth fixed text) and the MCP runs the shared guard
itself. Both texts are in spec §10 by a dated note (S2b verifier F2). S2b's size, 382 lines against 300 (code 89,
tests 290, docs 3), is within #341's handling.
**Why:** #214 says the baseline moves only by a recorded decision; a delta keeps the other 23 tools pinned; a distinct
text tells the human which reload is meant.
**Instead of:** regenerating the fixture; reusing the general reload text.
**Revisit if:** the user rules on the MCP schema at the gate.
**By:** Claude (proposed; build decision for the size)

### 2026-10-27 · S2a: the test-heavy overrun is accepted; the guard's texts, the `(source\n)` form, the 500 ms paused wait (#341)
**Decided:** S2a commits as one slice at 1083 new lines (code 399, under its 450 cap; tests 684), a deviation from
`agent-rules.md` §7's 1.5× bound recorded here: nothing remains to build, the extra lines are the exit checks' own rows
(the round-trip table, the refusals through both handlers, the bound's paths, B2.2 through `GatedRouter`, the
sentinel), and no split leaves two pieces under the bound. S2a's three design-local proposals stand as written in
`…-steps/S2a-builder.md` §5: the eight fixed refusal texts of the args guard (also in the spec §10 note, `3ab9207`);
the source evaluated as `(source\n)` without `replMode`, a non-function refused (a trailing `;` answers `PAGE_ERROR`);
a 500 ms paused wait with the stop steps bounded.
**Why:** the cap exists to keep a builder's context small; this builder finished in one go and two Opus verifiers
passed it (22 mutants red).
**Instead of:** trimming exit-check tests, or a split after the fact.
**Revisit if:** a later slice overruns the same way: the caps then under-count tests, and #339's caps get a tests
allowance.
**By:** Claude (build decision)

### 2026-10-27 · S1-sheet: banner clauses per slice's control; a short idle is a helper STOP; S1-live after S2a lands (#340)
**Decided:** S1-sheet's X1 and X2 (`…-steps/S1-sheet.md`, Proposed decisions): each banner clause is judged by its own
slice's R18-BANNER-CTL, and S1-record applies the run-wide rule; an idle under 15 s before a banner row is a helper
STOP, not a new NOT MEASURED clause. R17-UP-6's 2 500 ms banner window stands and S1-helpers matches
`recipes/s11-win.ps1:30` to it. S1-live starts only when the tree is clean of uncommitted code: after S2a's commits,
and the record names the HEAD it built.
**Why:** the verifier's two MAJORs, ruled in the sheet before any observation; a live slice runs alone (#33's waves,
the kickoff).
**Instead of:** a run-wide control only; waiting for S2b too (it touches no extension file).
**Revisit if:** S2a's verdict is late enough to hold S1-live past S2b.
**By:** Claude (build decision)

### 2026-10-27 · Stage 0: the slice split, the raised caps and the plan-side corrections (#339)
**Decided:** Stage 0's split (`2026-10-27-step12-phase-f-steps/Stage0.md` §6) is the plan: S1-sheet, S1-helpers-a,
S1-helpers-b, S1-live, S1-record; S2a, S2b; S3a, S3b; S4a, S4b; S5a, S5b; S6-G2 (S6-G1 only on a G12-2 yes); S7; S8.
The four caps over the phase doc's stage limits are raised to Stage0.md §6's (S2a 450, S3a 450, S5a 550, S6-G1 350),
each under `agent-rules.md` §7's ~600. The plan-side findings (`stage0-audit.md` §4–§5, `stage0-audit-2.md` §5) and the
exit-check rewrites of `stage0-audit.md` §5 (B2.1, B2.3, C3.1, C3.3, C3.4, D4.2, E5.2, S8.1) bind as dated in the phase
doc. The DevTools gotcha in `extension/CLAUDE.md` stays until Run 19 measures it in the real profile (m2 D3c ran with
a flag, its control not measured).
**Why:** Stage 0's added work (the pause bound, the cross-table test, the shared prologue, the cancel paths) is real and
each slice stays one coherent piece.
**Instead of:** cutting each slice at the old limit (more slices, the same lines).
**Revisit if:** a slice reports DONE-PARTIAL at its new cap.
**By:** Claude (build decision)

### 2026-10-27 · Stage 0: G2 by the daemon, one request, a 500 ms pause (#338)
**Decided (contract-level, for user review):** Stage0.md §5 (auditor 2's (ii-a)): for `click`/`type`/`pressKey` with
`trusted: true` and no `focusEmulation`, the daemon takes the visibility lock, forwards `focusTab`, re-checks caller and
lease, forwards the input, replies, then holds the lock 500 ms before releasing. No wire, extension, SDK or MCP change;
under contention a trusted input answers `LOCK_TIMEOUT {holder}`, as a lock-taking call does today. Built as S6-G2 with
the spec §10 note first and the exit checks G6.5–G6.8 of Stage0.md §6.
**Why:** #321 Q6 (b) ruled a blocking action; m2 G2 measured ~10 ms needed, so 500 ms has margin; an old extension
works unchanged.
**Instead of:** (i) a `focus` param on the input (a silent no-op on an old extension); (ii-b) a hold token.
**Revisit if:** Run 19's R19-G2 rows show the hold misses a capture.
**By:** Claude (conservative option applied; the user ruled the behaviour, the mechanism is for review)

### 2026-10-27 · Stage 0: G1 waits for G12-2; it stays a documented limit (#337)
**Decided:** naming a background opener's real popup needs `webNavigation` (m2 G1: `sourceTabId` right 15 of 15 with
it; the manifest lacks it; no other source has a tab id). Per #321 and the phase doc, the permission returns to the
user as **G12-2**; S6-G1 (Stage0.md §6 draft) is not run until the user says yes; meanwhile #226's limit stands.
**Why:** a new manifest permission is the user's (G12-2).
**Instead of:** `Page.windowOpen` on a session per held tab (no tab id, a banner on every held tab).
**Revisit if:** the user rules G12-2.
**By:** Claude (the phase doc's fallback)

### 2026-10-27 · Stage 0: the chooser on the call's own session, with `Page.enable`; JavaScript off refuses it (#336)
**Decided (contract-level, for user review):** Stage0.md §5 "E on the call's own session": E does not depend on D or
G2; `Page.enable` before the interception (0 of 5 events without it, m2 E7); the click by `Runtime.evaluate
{userGesture: true}` (a trusted CDP click does not reach a background tab, m2 E6); an event without `backendNodeId`
refused; the `multiple` check on the event's `mode`; a refusal after the click ends the chooser by interception off and
detach; one chooser call per tab at a time; one shared prologue for both upload paths. **While JavaScript is off,
`chooser: true` answers `JS_DISABLED`** (a params rule in the gate), the conservative of the auditors' two readings.
**Why:** m2 E1–E8; security at least as strict as today.
**Instead of:** class `upload` alone, with the switch not applied (auditor 1); E on D's session.
**Revisit if:** the user rules the switch reading.
**By:** Claude (conservative option applied)

### 2026-10-27 · Stage 0: the kept session's lifecycle; an overlapping call keeps today's answer (#335)
**Decided (contract-level for the overlap answer, for user review):** #324 amended as Stage0.md §5 "the keeper's
lifecycle": kept sessions stay in `debuggerSessions`, idle or not; detach on a safety change that blocks a kept tab; a
start-up sweep detaches every `attached: true` tab target (a session survives a worker stop, m2 D4c); drop a session
after a call timeout or failed clean-up; each feature switches its CDP domains off before its call ends. **A second
CDP call overlapping one in flight on the same tab answers `DEBUGGER_DEVTOOLS` as today**; only non-overlapping calls
reuse the session. KEEP-2 judges the detach time. Before S4b ships, a scratch or Run 19 row measures a sweep detach of a
tab another client holds.
**Why:** m2 D2–D5; an existing tool must not answer differently without the user's ruling (the phase doc's STOP rule).
**Instead of:** per-tab serialisation (an overlapping call waits; friendlier, changes an existing answer).
**Revisit if:** the user prefers serialisation; a culled worker loses the session.
**By:** Claude (conservative option applied)

### 2026-10-27 · Stage 0: `consoleMessages` is class `evaluate` until the user rules (#334)
**Decided (contract-level, safety, for user review):** reading the console replays an error subclass's `message`
getter once (m1 C8): page code runs. The JavaScript switch could be read as "no page code at all", so the conservative
option is taken: `consoleMessages` is class **`evaluate`** in `METHOD_CLASSES` (refused `JS_DISABLED` while
JavaScript is off), and the tool's description says so. Stage 0 recommended class `tab` (the getter is the page's own
code, which a human's DevTools runs too); that is the user's to choose.
**Why:** `agent-rules.md` §4: security at least as strict; undoable by one table line.
**Instead of:** class `tab` (#323's proposal; Stage 0's recommendation).
**Revisit if:** the user rules for `tab`.
**By:** Claude (conservative option applied)

### 2026-10-27 · Stage 0: the console read — C1 on the tab's session, filtered before stripping (#333)
**Decided (contract-level, safety, for user review):** Stage0.md §5 "the console read": C1 holds (replay of up to
1000 earlier messages and uncaught errors, m1 C1–C3); `consoleAPICalled` and `exceptionThrown` (minus revoked); no
`Log.enable`; never `discardConsoleEntries`; the tab's own session only (frames excluded); before URLs and stacks are
stripped the reducer drops entries from a blocked, own-extension or `file:` source and entries before the latest arm;
an exception's description cut at its first stack line; the caps of #323; one top-level `chrome.debugger.onEvent`
listener in `sw.ts` feeding a per-call collector.
**Why:** m1 C1–C8; the gate's hiding rules reach the replayed text too.
**Instead of:** C2; auto-attaching to frames.
**Revisit if:** the user wants frame messages.
**By:** Claude (proposed; the shape stays open for the gate)

### 2026-10-27 · Stage 0: an old extension is detected by its hello, not by the answer (#332)
**Decided (contract-level, for user review):** the extension's hello gains an optional `features: ["evaluateArgs"]`
(proto stays 2); the daemon answers `VERSION` with the reload hint to an `evaluate`/`evaluateSaveStart` carrying `args`
when the hello lacked it. Covers the SDK, `evaluateRef`, `evaluateToFile` and the MCP alike; a real function result
stays `kind: "function"`.
**Why:** m1 B6: an old extension's answer cannot be read reliably (a `function` form answers `undefined`).
**Instead of:** #322's `kind` test; a reply marker checked in the SDK only.
**Revisit if:** the hello cannot change in Step 12.
**By:** Claude (conservative option applied)

### 2026-10-27 · Stage 0: an `args` call is bounded by a debugger pause and terminate (#331)
**Decided (contract-level, for user review):** `callFunctionOn` has no timeout and `terminateExecution` is refused for
an extension (m1 B7); the call is bounded by Stage0-measurer3.md §5's six steps (`Debugger.enable` with breakpoints
off before the call; at `timeoutMs` `Debugger.pause`, terminate only when a paused frame is the function's own script,
else resume; `Debugger.disable` always; nothing from `Debugger.paused` logged). S2a's fake-CDP tests and a Run 19 row
pin it.
**Why:** m3 B10 (3 of 3, and the verifier's reproduction); today's evaluate is bounded.
**Instead of:** a documented limit with m3 B11's recovery by navigation (the fallback).
**Revisit if:** `Debugger.enable` misbehaves with a human's DevTools open or on a heavy page (not measured).
**By:** Claude (proposed)

### 2026-10-27 · Stage 0: `args` crosses as a JSON string beside a function object (#330)
**Decided (contract-level, for user review):** #322's call form is replaced: `callFunctionOn {arguments: [{value}]}`
mangles JSON (keys sorted, null properties dropped, a top-level `null` lost; m1 B1). The source is evaluated to a
function object, then called on `globalThis` by a fixed wrapper with `[{objectId}, {value: JSON.stringify(args)}]`
(exact JSON, async resolves, no page global, works under a strict CSP; m1 runs 4–5, verifier V1); `asRef` and `saveTo`
on the same form; the expression wrapper off the `args` path. The caps and refusals of #322 stand.
**Why:** (i) fails its pass rule; (i′) passes.
**Instead of:** #322 (i); 0.4 (ii) (unmeasured).
**Revisit if:** a page that replaced `JSON.parse` breaks a live row.
**By:** Claude (proposed; the phase doc's fallback order)


### 2026-10-27 · Step 12: the stage order and Run 18's rows (#329)
**Decided:** the order of the phase doc's note under the box (2026-10-27): Stage 0, S1–S5, S6 as S6-G1 and S6-G2, S7,
S8; F not in scope. Run 18's rows as 0.3, §4.26 or the next free number (Stage 0 checks), the carried pass rules word
for word except #320's two re-writes.
**Why:** #320 item 1, #321.
**Instead of:** running B before A (Run 19 must use the fixed helpers).
**Revisit if:** Stage 0 finds a dependency the order breaks.
**By:** Claude (build decision)

### 2026-10-27 · Step 12: Run 19's seed rows and what Step 12 does not build (#328)
**Decided (proposed):** phase doc 0.11 (Run 19's seed rows, §4.27 or the next free number, fixture pages only,
expected text committed before any observation) and 0.12 (not in Step 12, with F parked by #321 and 0.8 (b)/(c) not
built). The G1/G2 rows join 0.11 from S6's as-built.
**Why:** the plan's proposal; the rows are written before the measurements (`agent-rules.md` §2).
**Instead of:** rows written after the build has been seen.
**Revisit if:** Stage 0 finds a row that cannot discriminate.
**By:** Claude (proposed)

### 2026-10-27 · Step 12: how every item passes the safety gate (#327)
**Decided (proposed, contract-level, safety, for user review):** phase doc 0.10 as written: only C adds a method,
entered in both tables in one commit; B and E keep their methods' classes; nothing on the wire reads or changes the
safety state; no new log site (the allowlist grows by 0) and `log-sentinel.test.ts` gains a sentinel in `args` and in a
console reply; a refusal reveals what it reveals today. G2's change to the lock touches no safety class.
**Why:** the root `CLAUDE.md` invariants; #139, #202.
**Instead of:** exempting or reclassifying any method (forbidden).
**Revisit if:** the audit finds an item that reaches a page or the debugger outside the gate.
**By:** Claude (proposed)

### 2026-10-27 · Step 12: G1 and G2 as ruled, their contract left to Stage 0 (#326)
**Decided (proposed, contract-level, for user review):** **G1** (#226): the extension's `tabCreated` carries the real
opener only if Stage 0 measures that `webNavigation.onCreatedNavigationTarget`'s `sourceTabId` (or another source the
current manifest already allows) names it for a background opener; the daemon's opener rule then grants the lease to
the opener's holder. A needed new permission returns to the user (G12-2) and G1 stays a documented limit until then.
**G2** (#321 Q6): a trusted click or typing holds the daemon's visibility lock from the focus through the input and a
settle pause after it; Stage 0 picks between (i) one wire call (a trusted input that focuses itself, under the lock)
and (ii) the daemon holding the lock across the existing `focusTab` and the input call, and measures the pause
(starting near 500 ms). The conservative reading until Stage 0 rules: no existing call's answer changes; a call without
`trusted` is untouched; the pause only adds time.
**Why:** #321; phase doc 0.9 leaves the mechanism to measurement.
**Instead of:** guessing a mechanism before the audit; G1 by a new permission without the user.
**Revisit if:** Stage 0's measurements.
**By:** Claude (proposed)

### 2026-10-27 · Step 12: `uploadFiles {chooser: true}` intercepts the chooser only inside the call (#325)
**Decided (proposed, contract-level, for user review):** phase doc 0.7 as written: interception on only inside the
call and off on every path; the same gate as `uploadFiles` (class `upload`, Upload folders, the file-URL check, the
missing-file check, `paths` caps, no path logged); the activating click by `Runtime.evaluate {userGesture: true}` (i),
else a trusted click with focus first (ii); `TIMEOUT` with a fixed message after 5 s with no chooser; E on one call's
own session if Stage 0 shows it receives `Page.fileChooserOpened`, else on D's. While JavaScript is off the
conservative reading applies until the audit weighs it: the chooser path is refused `JS_DISABLED` (its click runs a
script in the page).
**Why:** #321 Q4 (a); 0.7; the conservative option for the JavaScript switch.
**Instead of:** interception for a kept session's life (G12-2); a non-input target treated as a chooser without the
flag.
**Revisit if:** Stage 0 shows the click does not open the chooser on a background tab, or the audit argues the switch.
**By:** Claude (proposed)

### 2026-10-27 · Step 12: the kept debugger session's lifecycle (#324)
**Decided (proposed):** phase doc 0.6 as written: a pure keeper, at most one session per tab, reference-counted,
detached 5 s after the count reaches 0 (#321 Q3 (a)), and on disarm, on a blocked, own or `file:` page, on close or
replace, on every `onDetach` reason and at a worker restart; the gate re-check before every use; no wire, daemon, SDK or
MCP change; answers unchanged.
**Why:** #321 Q3 (a); the lifecycle is internal, and what the human sees is the ruled bound.
**Instead of:** (b) a session only for event-driven features; (c) none.
**Revisit if:** Stage 0 measures that a kept session changes an existing answer, or the banner outlives the bound.
**By:** Claude (proposed)

### 2026-10-27 · Step 12: `consoleMessages`: read on demand, the entry shape, class `tab` (#323)
**Decided (proposed, contract-level, for user review):** phase doc 0.5: C1 (#321 Q2 (a)) if Stage 0 measures that
`Runtime.enable` reports messages logged before it, else C2 (#321's fallback). A new router method `consoleMessages
{tabId, level?, limit?}` and tool `browser_console_messages {tab?, level?, limit?}`; entries `{level, text, ts, kind}`,
`text` ≤ 2 000 characters, ≤ 200 per reply, newest last, no source URL and no stack; the SDK `tab.consoleMessages`.
Class `tab` in `METHOD_CLASSES` and a lease-checked tab method without the visibility lock in `daemon/src/methods.ts`;
not gated by the JavaScript switch, because reading runs no page script (the conservative alternative, class
`evaluate`, is the audit's to weigh).
**Why:** #321 Q2; the plan's shape; a refusal reveals what a refused `snapshot` reveals.
**Instead of:** C3 (a page hook, not ruled); URLs or stacks in entries.
**Revisit if:** Stage 0's replay measurement; the audit argues the class.
**By:** Claude (proposed)

### 2026-10-27 · Step 12: `args` for evaluate is a function source called with one JSON value (#322)
**Decided (proposed, contract-level, for user review):** phase doc 0.4 (i): `evaluate` and `evaluateSaveStart` gain an
optional `args`; with it, `expression` is a function source called with `args` by `Runtime.callFunctionOn
{arguments: [{value}]}`, else today's expression byte for byte; `args` must survive `JSON.stringify`, ≤ 1 MiB, else
`BAD_PARAMS` with a fixed message that never shows the value; checked by the SDK, the shared guard and the extension;
an old extension's `kind: "function"` answer maps to `VERSION` in the SDK; the MCP `browser_evaluate {args}`, the #214
baseline re-pinned only by a recorded decision.
**Why:** #321 Q1; Playwright's shape; no injection by string building.
**Instead of:** (ii) a lexical binding (the fallback if (i) fails at Stage 0); (iii) a JSON literal pasted into the
string.
**Revisit if:** Stage 0 shows `callFunctionOn` leaves a page global, breaks the CSP page, or loses `awaitPromise`.
**By:** Claude (proposed)

### 2026-10-27 · The user rules Step 12's scope (G12-0) (#321)
**Decided (user):** the six questions of `docs/plans/2026-10-27-step12-phase-f.md` § For the user at G12-0:
1. **Scope and order:** A (Run 18, already #320), then B (`args`), C (console), D (kept debugger session), E (the file
   chooser). **F parked** (`back` onto bridge-built history; #308 (b)). **G1 built after Stage 0 measures it**, only if no
   new permission is needed, else it returns to the user (G12-2).
2. **Console:** (a) read on demand through the debugger, if Stage 0 confirms Chrome keeps earlier messages; else (b).
3. **Kept session:** (a) one per tab while an agent works, closed 5 s after its last call; the banner stays steady.
4. **File chooser:** (a) `chooser: true`, intercepted only inside that call, files only from the Upload folders.
5. **`back`:** (a) Chrome's rule is kept; agents navigate to the address instead.
6. **G2 (the trusted tools' focus/input gap): changed from the recommendation.** A trusted click or typing becomes one
   **blocking** action: it holds the visibility lock from the focus through the input and a short settle pause after it,
   so no other actor's capture or focus comes between. The user accepts that trusted actions and the browser are a
   little slower. Stage 0 picks the mechanism and measures the pause (starting near 500 ms).
In the chat the user first answered G1 "(a)" under Q6 and "measure first" under Q1; asked, the user chose measure, then
build. Push granted for the close-out, the Step 12 plan and this ruling.
**Why:** the user's ruling.
**Instead of:** G2 kept a known limit (the recommendation).
**By:** the user (ruled 2026-10-27; recorded by Claude)
