# S1 prep verifier — report (Step 10, stage S1, Run 14 prep)

Verifier: Opus 5.5, level 2, independent of the builder, 2026-10-25, working tree at `b016712` + the prep builder's
uncommitted work. No agent spawned, no commit, no fix, no Chrome action. Live processes: the threaded redirect server
on 8083 and HEAD's single-threaded copy on 18083, each started by me and stopped by its own listener PID (ports free
before and after).

## Verdict: FAIL (one MAJOR, a small fix)

Everything the brief lists holds except one thing: when a STOP fires during block `type`, the stop procedure leaves
the background `s9.ts r14-type` process running. That process keeps acting in Chrome after the STOP and is left behind
as an orphan `node` process (F1). The fix is small, and one fixer round should close it. The MINOR findings below are
for the step agent to decide on before the commit. None of them changes a pass rule after a measurement, because
nothing has been measured yet.

## Findings (ranked)

### MAJOR

**F1. The stop procedure does not end the background `r14-type`, so after a STOP it can still type into and focus
Chrome, and it is left as an orphan node.**
`recipes/s9-r14.ps1` `B-type` starts it with `$p = S9Bg 'r14-4b' @('r14-type', …)`. The PID is never stored in
`$global:S14Pids`. `Invoke-S14Stop` / `Stop-S14Processes` stop only `daemon`, `web`, `web1` and `red`:
```
foreach ($k in @('web', 'web1', 'red')) { if ($global:S14Pids[$k]) { … Stop-S14Pid … } }
```
Two paths reach the stop procedure while `r14-type` is still alive:
- `Invoke-S9PressWhenReady` throws after `signalReady`. For example, `Invoke-S9ActionButton` throws
  `toolbar buttons named …: 0 (need exactly 1)`, which is the builder's own untested-live guess 2: at 60 % width Chrome
  moves the icon into the puzzle menu.
- `Fail-S14 'r14-type did not end within 150 s'`.

In both cases `r14-type` goes on. It finishes its 1000-character trusted `type`, then waits up to 90 s for armed (true
again after the restore), then runs `focusTab t4` and a trusted `type "R14ok"`. All of that happens during or after
`Restore-S9All`, which closes the driver windows. `daemon.shutdown` is then refused while that client is connected, so
the daemon is killed by PID, and the `node` process is never killed. That is a helper continuing past a STOP (#193)
and an orphan node (ESCALATION). The wave sheet says the process "ends inside the block", which is true only on the
success path.
*Fix:* in `B-type`, store the PID as `$global:S14Pids['r14type'] = $p.Id; Save-S14`. In `Invoke-S14Stop`, kill it
with `Stop-S14Pid` (Test-SafeToKill) **before** `Restore-S9All`, and on `Fail-S14 … 150 s` as well. Then add one line
to the sheet's "PIDs to track".

### MINOR

**F2. Under the written R14-LOGS console rule and the code's verdict, a Chrome-owned console line can pass the CHECK
and fail the row.** §4.21 R14-LOGS: "in both SCAN lines `token=0`, `other 0`, `localhost:8081=0`, `:8083=0`,
`bank.example=0` … a console `CHECK … FAIL` likewise [is a STOP]". `consoleVerdict` (`s9-rules.ts:521-530`) fails only
on the token, on a non-fixture `://`, or on a **bridge** line with a URL or pattern. A Chrome-owned line naming
`localhost:8081` gives `CHECK SAFE-10 scan-console PASS`, so `B-logs` does not stop, while the written rule says FAIL.
Run 13's console counted 0 (`S4-run-record.md:105`), so the risk is low. This is the builder's proposed decision 5.
*Fix (before the commit):* either judge the console by S1.6 as written (all counts 0), or amend the row's text so
that the two agree. Do not decide it after the run.

**F3. A human-disarmed or non-empty found state reaches SAFE-0 before the found-state guard, and SAFE-0 then triggers
a reload.** `cmdSafe0` (`s9.ts:378-399`) checks `navigate-own-options` against `BLOCKED:ext`. The gate refuses a
disarmed bridge with `DISARMED` first, so SAFE-0 FAILs (exit 1) → `B-safe0` runs `reload-extension.ps1` → SAFE-0 FAILs
again → `STOP: SAFE-0 still fails after the reload: the loaded extension is not the Step 9 build`. That is an
extension reload nobody needed and a STOP with the wrong cause. The guard in block 6 never runs. The safety state is
not changed (it lives in `storage.local`), so this is MINOR.
*Fix:* in `B-safe0`, before any reload, read the `ROW SAFE-0 safety` tuple. If it is reported and not
`armed=true evaluate=true blockedCount=0`, print `STOP: found-state guard …` (no reload).

**F4. R14-REL-3's class check can pass with no class printed.** `classStepVerdict` accepts `rel-class <T#> not listed`,
and `hidden=<h> (no url to class)`. A closed or missing r3 therefore gives `rel-class PASS` with no wrapper, inner
scheme or own-page value, which is what 0.10 asks for. Run 13's r3 was listed and not hidden, so the class is expected
in practice.
*Fix:* make `not listed` (and `hidden=disarmed`) NOT MEASURED, not PASS. Keep `hidden=blocked` as PASS and say so in
the row (an own page whose URL the extension withholds).

**F5. R14-3's guard does not judge "not covered" by other windows.** `placementVerdict` checks W against O, the work
areas, and the minimized and visible flags. `occluders above O <n>` is only recorded. 0.10 says "the options window
visible (not covered) … checked by window rectangles". `Set-S9SideBySide` brings O and then W to the front, so other
driver windows sit below O, but an always-on-top window could still cover O and the guard would pass.
*Fix:* either add `occluders === 0` to the guard, or write in the row now that occluders are a record and why (the
builder's guess 3: an overlay window may be counted).

**F6. R14-4b's `typeVerdict` turns "the disarm did not stop the call" into NOT DISCRIMINATING, never FAIL.** The rule is
inherited from §4.20. An `ok` reply, or k = 1000 with `pressed` < `replied` (the press landed during the call and the
call still finished), is the product defect the row exists to catch. It is reported as "the press missed the typing",
gets one re-run, and is then recorded NOT MEASURED. It never passes, so no pass is vacuous, but the row cannot FAIL on
that defect.
*Fix:* give `r14-type` its own verdict. If the press time is before the reply and the reply is `ok` or k = n, that is
FAIL. Keep NOT DISCRIMINATING only for a press after the reply.

**F7. The block-list count is printed for a non-empty list.** The `STATE … count=<n> lines=<n>` line and
`ROW R14-FOUND status … blockedCount=<n>` both print it. This brief's item 4 reads "count + sha256 never printed for a
non-empty list", and the builder withheld only the sha256 (proposed decision 3). The daemon itself logs `blocked=<n>`
by design (#132), so withholding the count in the recipes alone would be cosmetic. The step agent should decide which
reading of S1.4 / 0.10 holds ("the list … never printed") and record it with decision 3.

**F8. Two parts of the record template can be read against S1.2 and S1.4.**
- *S1.2.* The template puts a "Pre-flight (blocks 1–4)" section of verbatim lines before `L1 = SAFE-0`. S1.2 says "the
  first recorded line proves the loaded build". *Fix:* say in the template that S1.2's first line is L1 of "Lines", or
  move the pre-flight lines to the ledger.
- *S1.4.* S1.4 says "none printed", yet the empty-text sha256 `e3b0…b855` is printed. I read that as acceptable (it
  shows only that the list is empty). Leave it to the step agent with F7.

### NIT

- N1. A blocked r3 relies on W's closing at the teardown. If `rel` leaves r3 on an own page, `S9 cleanup` cannot close
  it (`closeTab` is refused), and R14-TEARDOWN's `cleanup: <n> of <n>` will print one fewer. Run 13's row named
  `Close-S9Tab`; `B-teardown` does not call it. The tab is closed only if it is in W.
- N2. Unused in Run 14, but `Set-S9BlockList -FromFile` prints the found list's sha256 (`s9-win.ps1:688`), against
  proposed decision 3.
- N3. An unknown `s9.ts` command exits 2 without a `STOP:` line (`s9.ts:1166-1168`). The `S9` wrapper turns it into a
  stop, so the line still appears.
- N4. The R14-4b follow-up cannot tell "the disarm detached the session" from `withDebugger`'s own `finally` detach.
  This is 0.10's design, not the builder's.
- N5. `$ErrorActionPreference = 'Continue'`: a non-terminating cmdlet error in a block is neither a throw nor a STOP.
  The helpers that matter use `throw`.

## Checks (command → output)

1. **§4.20 untouched.**
   - `git diff f45e3bf -- docs/e2e-test-plan.md` → one hunk `@@ -1191,6 +1191,71 @@`, 65 added, 0 removed.
   - §4.20 is lines 1070–1193 at `f45e3bf`. Diffed line by line with the working tree's 1070–1193: `SECTION420_IDENTICAL`.
   - §4.21 = lines 1194–1258.
2. **Rows vs 0.10.**
   - Each row quotes its 0.10 bullet. The control runs before R14-5c (block order `ctl` → `5c`, and a FAIL is a STOP).
   - Server-log counts: 5c1 0/0, 5c2 hop 1 and target 1. Mutation M3 (hop 0 allowed) turns the test red.
   - R14-POP-1 prints the claim and owner lines and their CHECK before `click-synthetic`, and the trusted fallback runs
     only on "nothing opened".
   - R14-3 measures the rects before the switch and before the toolbar click.
   - R14-4b reads k from `#trusted-input`'s value and re-arms, then sends `R14ok` and reads the value back. The trusted
     type selects all first (`content/actions.ts:37-46` `field.select()`), so `value === "R14ok"` is right. The banner
     is polled every 250 ms for at least 20 s and recorded with no bound.
   - R14-REL-3 prints the class only (`scrubAll`).
   - Discrimination is good except F4, F5 and F6.
3. **Expected text against product constants.**
   - Re-derived: `safety.ts:167-179` (DISARMED_ALL, OWN_PAGE, BLOCKED_URL, EXTENSION_URL), `badge.ts:46-48`,
     `options-model.ts:57-59`, `debugger-errors.ts:38-40` (`DEBUGGER_DEVTOOLS`), `intercept.ts:400`
     (`leaseGranted {tab, reason:"opener", url}`), `intercept.ts:444` (`row.owner` = the client name),
     `intercept.ts:278` (`safety state:` on arrival) against `:243` (`extension resync` after `listTabs`).
   - `printf 'localhost:8081' | sha256sum` → `14ceab87…402a`, as written in the row.
   - The fixture link and `test-fixtures/dl/hello.txt` exist.
   - The test imports `BLOCKED_URL_MESSAGE`, `BADGE_TITLES`, `optionsStatus`, `describeDebuggerError`, and reads the
     source for `WRAPPER_SCHEMES` and the fixture link, so the expected text is pinned.
   - Ordering is correct: §4.21 records SAFE-0's log order and does not judge it.
4. **Framing.**
   - SAFE-0's text is unchanged from §4.20, and `cmdSafe0` is unchanged in the diff.
   - The reload runs only on a FAIL, with one re-run on exit 2.
   - The found-state guard holds, apart from F3.
   - The sha256 of a non-empty list is withheld (F7).
   - The restore and its read-back check the stored page, `daemon.status` and the title.
   - S1.6 covers both `daemon.log` and the console (F2).
   - The pin gate (block 3) runs before any state change. It is UIA only: `$global:S9PinUiaOnly = $true`, the mouse
     path at `s9-win.ps1:376` is skipped, and the menu's pin button is pressed through the Invoke pattern.
5. **The one stop rule.**
   - `grep -A3 '^\*\*STOP RULE (#193)'` → md5 `9f3f7bfb…` in `S1-wave-sheet.md`, `briefs/S1-runner.md` and §4.21. The
     text is byte-identical, wrapping included.
   - `diff` of the runner brief against `briefs/common.md`: ESCALATION + LESSONS (common 115–192 vs runner 81–158),
     SPEC-DISCREPANCY (194–214 vs 159–179) and INTEGRITY FLOOR (225–250 vs 181–206) are all equal.
   - Every `s9.ts` throw goes through the catch → `STOP: … (exit 2)` (`s9.ts:1173-1179`). No `process.exit` exists.
   - Every block throw → `Invoke-S14Stop` (`Stop9`, `Restore-S9All`, the processes, `S14Stopped`), and later blocks
     get exit 3. Exception: F1.
6. **Safety and integrity.**
   - The safety state is written only through the options page (UIA Toggle and Value) and the toolbar button
     (`Invoke-S9ActionButton`). No wire, daemon or SDK path writes it.
   - Kills go only through `Stop-S14Pid` → `Test-SafeToKill`, or by own PIDs. A daemon that is not identified is left
     alone. Chrome is never restarted.
   - `Set-S9SideBySide` checks `Test-S9Live` before moving a window.
   - No helper prints the token. URLs are printed as a class or as fixture URLs only.
7. **Redirect server threading.**
   - `netstat` showed 8083 free before.
   - Threaded `s9-redirect.py 8083`, then `s9.ts redirect-probe --port 8083` →
     `concurrent 302 in 27 ms, 302 in 12 ms (idle socket held open: yes)` + `CHECK … PASS — 2 of 2 …`, exit 0. The
     server log shows both GETs.
   - HEAD's copy on 18083 → `no answer in 5010 ms, no answer in 5001 ms` + `CHECK … FAIL — 0 of 2`, exit 1.
   - Both stopped by `taskkill //PID <listener PID>`, and 8083 and 18083 were free after. The control discriminates.
8. **Checks.**
   - `npx tsc --noEmit -p recipes/tsconfig.s9.json` → 0. `npm run typecheck` → 0.
   - `npm test` → **2744 passed, 116 files**. That is 2720 + 24, all in `recipes/test/s9-rules.test.ts`: HEAD 35 `it(`
     → 59, with 0 lines removed.
   - Scratch mutations of `s9-rules.ts`, restored afterwards (sha equal), each turned exactly one test red:
     - M1: the `logHits` boundary removed.
     - M2: the overlap check removed.
     - M3: a hop of 0 allowed.
     - M4: URL lines allowed in `classStepVerdict`.
     - M5: the 1 s bound removed.
   - `npm run build` → 0, and the dist sha256s still equal the runner's `$Dist` (`99bb55c5…`, `5a2888f7…`,
     `bcb20e28…`, `a8beec6c…`, `f8b52058…`).
   - `git status --short` shows no dist change (dist is ignored).
   - Lane: only `recipes/s9*` (and the new `recipes/s9-r14.ps1`), the test, §4.21, and the steps dir.
     `briefs/common.md`, `journal.md`, `S1.ledger.md` and `briefs/S1-*.md` belong to the step and session agents.
9. **Wave sheet runnable.**
   - Every function the runner calls exists once in `s9-win.ps1` (29 names checked), and every `s9.ts` subcommand and
     flag it uses is defined.
   - Both `.ps1` files parse with 0 errors.
   - With a scratch `S9_OUT`: `-Block servers` → `NOT RUN: block servers needs block preflight first`, exit 3.
     `-Block status` → the globals, exit 0.
   - The clean-up is complete except F1 and N1.
   - The record template has UTC time · row ID · block · observed verbatim · verdict.

## Files for the commit (after the fix round)

Prep builder: `docs/e2e-test-plan.md`, `recipes/s9-redirect.py`, `recipes/s9-rules.ts`, `recipes/s9-win.ps1`,
`recipes/s9.ts`, `recipes/s9-r14.ps1`, `recipes/test/s9-rules.test.ts`,
`docs/plans/2026-10-24-step10-step8-follow-ups-steps/S1-wave-sheet.md`,
`docs/plans/2026-10-24-step10-step8-follow-ups-steps/briefs/S1-runner.md`,
`docs/plans/2026-10-24-step10-step8-follow-ups-steps/S1-prep-builder.md`; this report
`docs/plans/2026-10-24-step10-step8-follow-ups-steps/S1-prep-verifier.md`. The step agent's own (commit at its
discretion): `briefs/common.md`, `journal.md`, `S1.ledger.md`, `briefs/S1-prep-builder.md`, `briefs/S1-prep-verifier.md`,
`briefs/S1-verbatim.md`.

## Round 1 re-check (2026-10-25, after `S1-prep-fixer1.md`)

Same rules as round 0: independent, no fix, no commit, no Chrome, no daemon. I ran no `s9-r14.ps1` block and nothing
that connects to 9234. The only s9.ts command I ran was `s9.ts bogus`, which exits before connecting.

### Verdict: PASS-with-notes

Every finding from round 0 (F1–F8, N1–N5) is fixed as the step agent ruled in `briefs/S1-prep-fixer1.md`. None of the
fixer's five interpretations makes a pass rule vacuous or less strict than the ruling:

- (1) k = 0 with `DISARMED` after a press is NOT DISCRIMINATING. It can never pass, and §4.21 already had the k = 0
  re-run.
- (2) A missing press time or an unreadable k is a FAIL.
- (3) Both log halves are counted before the STOP.
- (4) The SAFE-0 guard stops whatever SAFE-0's exit code is. That is stricter.
- (5) The wave's own `-Lines` keep their sha256 (`localhost:8081`, the test pattern).

### Per finding (command → output)

- **F1 — fixed.**
  - `s9-r14.ps1` `B-type` stores `$global:S14Pids['r14type'] = $p.Id`.
  - `Stop-S14Background` identifies the process by a command line naming `recipes/s9.ts` and `r14-type`. It stops the
    tree children first, each PID through `Test-SafeToKill`.
  - `Invoke-S14Stop` calls it before `Restore-S9All`, and the 150 s timeout reaches it through `Fail-S14`.
  - The sheet's "PIDs to track" lists it.
  - Mutant `try { $b = Stop-S14Background }` → `try { $b = $true }` turned the F1 test red, and the file was restored.
  - Residual, not a finding: killing the client does not stop a trusted type the extension already has in flight.
    That type ends by itself or at a disarm, inside the extension.
- **F2 — fixed.**
  - `consoleVerdictS16` fails on every S1.6 count: the token, a non-fixture `://`, `localhost:8081`, `:8083` and
    `bank.example`.
  - `scan-file --mode console-s16` prints `CHECK R14-LOGS …`. `B-logs` counts both halves, then STOPs.
  - The §4.21 row names `console-s16`.
  - Mutant: the `localhost:8081` clause removed from `consoleVerdictS16` only → the F2 test went red; restored.
- **F3 — fixed, but the test pins only the order of the text.**
  - `B-safe0` parses `ROW SAFE-0 safety (…)` and calls `Fail-S14 "found-state guard: …"` before `reload-extension.ps1`
    when the tuple is not `$S14Default`.
  - Mutant `if ($tuple -and $tuple -ne $S14Default)` → `if ($false)` left the suite **green**. The F3 test only checks
    that the text "found-state guard" comes before `reload-extension.ps1`.
  - NOTE (MINOR, non-blocking): the code is right by reading. A test that pins the condition itself would close this.
- **F4 — fixed.**
  - `classStepVerdict` returns `notMeasured` for `not listed` and `hidden=disarmed`, and PASS for `hidden=blocked`
    with its reason.
  - Mutant (`notMeasured:true` → `pass:true`) → red; restored.
  - The §4.21 R14-REL-3 row agrees.
- **F5 — fixed.**
  - `placementVerdict` fails when `occluders > 0` or when the count is not measured.
  - `S9Geo.Occluders` skips cloaked, click-through and alpha-0 layered windows. The exact rule is written in the row.
  - Both guard messages begin `R14-3 placement guard`.
  - Mutant (`occ > 0` → `occ > 99`) → red; restored.
- **F6 — fixed.**
  - `r14TypeVerdict` makes it a FAIL when the press comes at or before the reply and the reply is `ok` or k = n.
  - Mutant (that branch → `notDiscriminating:true`) → red; restored.
  - `cmdR14Type` uses it (`s9.ts:946-950`).
- **F7/F8 — fixed.**
  - `Restore-S9Safety` prints `block-list sha256 vs found equal|DIFFERENT`, and `DIFFERENT` fails the restore.
  - The sheet (lines 60-61, 138, 141) and the runner brief (lines 64-65) say L1 = SAFE-0 is the first recorded line,
    and that the pre-flight lines go to `S1.ledger.md`.
- **N1 — fixed.**
  - `cleanup` prints `… closed, … already gone, … still listed` and `cleanup: still listed <…|none>`.
  - `B-teardown` closes r3 with `Close-S9OtherTab`, which uses UIA Invoke on the Close button, prints no title, and
    throws unless exactly one such tab exists. It then re-checks that the list reads `none`, and any other tab still
    listed is a STOP.
  - Untested live, as the fixer says.
- **N2 — fixed.** Mutant (`$shaShown = $sha`) → red; restored.
- **N3 — fixed.** `node --import tsx recipes/s9.ts bogus` →
  `STOP: s9.ts: unknown command "bogus" (a set-up error in the caller) (at …)`, exit 2. There is no unit test; this
  run is the evidence.
- **N4, N5** are listed in the sheet's "Known limits" (lines 120-124) and in the R14-4b row.

### Invariants

- **STOP RULE:** `grep -A3 '^\*\*STOP RULE (#193)' | md5sum` gives `9f3f7bfb…` in the sheet, the runner brief and
  §4.21, byte-identical.
- **Verbatim sections:** `diff` of the runner brief against `common.md` shows ESCALATION + LESSONS, SPEC-DISCREPANCY
  and INTEGRITY FLOOR equal.
- **§4.20:** lines 1070–1193 at `f45e3bf` against the working tree → `S420_EQ`.
- **§4.21 diff:** `git diff f45e3bf --numstat -- docs/e2e-test-plan.md` → `73 0`.

### Checks

- `npx tsc --noEmit -p recipes/tsconfig.s9.json` → 0. `npm run typecheck` → 0.
- `npm test` → **2751 passed, 116 files**. That is 2744 + 7, all in `s9-rules.test.ts` (59 → 66), with 0 lines removed
  against HEAD.
- `npm run build` → 0, and the dist sha256s are still `99bb55c5…`, `5a2888f7…`, `bcb20e28…`, `a8beec6c…` and
  `f8b52058…`. `git status --short --untracked-files=no` lists only the intended files.
- Every mutant was reverted, and the sha256 of each file was equal after.
- Deviation, noted and not mine: the fixer's dry run reached the real extension (one hello and one resync, no tab call,
  no state change). It is in `S1-prep-fixer1.md`.

### Final commit file list

- **Prep commit:**
  - `docs/e2e-test-plan.md`
  - `recipes/s9-redirect.py`, `recipes/s9-rules.ts`, `recipes/s9-win.ps1`, `recipes/s9.ts`, `recipes/s9-r14.ps1`
  - `recipes/test/s9-rules.test.ts`
  - in `docs/plans/2026-10-24-step10-step8-follow-ups-steps/`: `S1-wave-sheet.md`, `briefs/S1-runner.md`,
    `S1-prep-builder.md`, `S1-prep-verifier.md`, `S1-prep-fixer1.md`
- **The step agent's own, at its discretion:** `briefs/common.md`, `journal.md`, `S1.ledger.md`,
  `briefs/S1-prep-builder.md`, `briefs/S1-prep-verifier.md`, `briefs/S1-prep-fixer1.md`, `briefs/S1-verbatim.md`.
