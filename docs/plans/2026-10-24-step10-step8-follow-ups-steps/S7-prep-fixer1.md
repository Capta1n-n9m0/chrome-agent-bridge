# S7 prep fixer report, round 1 (Step 10, stage S7 — Run 15 prep)

Fixer (level 2), Opus 5.5, 2026-10-25. Base `02eb0c2` + the prep builder's uncommitted files. Brief
`briefs/S7-prep-fixer1.md`. I ran nothing against Chrome, started no daemon, actor, server or headless Chrome, and
did not build. I committed nothing. I edited no product code and no `s9*` file.

## Summary

All eight items are fixed, each with a test. Two decisions go beyond the brief's letter and are raised below:
- **m2 — a block deadline in the runner.** I added it because no turn timeout alone can bound blocks such as save-a.
- **m1 — the press clause.** The brief says "the same for press", but adding that clause would change a pass rule, and
  the same brief forbids pass-rule changes. I did not add it.

**Checks:** `tsc` s10 0, s9 0; `npm run typecheck` 0; `npm test` **3227 passed / 132 files** (= 3216 + 11, all in
`recipes/test/s10-rules.test.ts`, 42 → 53; `s10-fixtures.test.ts` unchanged at 9; nothing removed). PowerShell parse:
0 errors in `s10-r15.ps1`, `s10-win.ps1`, `s10-mem.ps1` and `s10-ret1.ps1`.
`git diff -U0 02eb0c2 -- docs/e2e-test-plan.md` is still one hunk of pure additions (`@@ -1292,0 +1293,119 @@`), so no
line of §4.20 or §4.21 changed. The STOP rule is byte-identical (whitespace-normalised sha256 `4cc295e26f25…`) in the
sheet, the runner brief, the builder brief and §4.22. `s10-r15.ps1` is still ASCII (0 non-ASCII characters).

## Findings → what changed → the test that proves it

### C1 — SAVE-BLOCK always stopped

- **What changed:** `B-saveblk` now builds the value first: `S10 save-build 4m --tab blk`, before `S15Touched` and before
  any state change (`recipes/s10-r15.ps1:686`).
- **The dependency table:** a pure table and analyser in `recipes/s10-rules.ts`:
  - `S10_VALUE_NEEDS` (:877) lists, for every s10.ts command, the page values it reads (`"args"` means the row's own
    `<ROW> <key> [--tab]`).
  - `S10_STATE_NEEDS` (:918) lists the states a call needs and the runner text that produces them.
  - `blockDependencyGaps` (:1005) parses `$Order`, `$RowBlocks` and every `function B-*` body of the runner. It reports:
    - a block without its function;
    - `setup` not framing, or not placed before every row block;
    - an unknown command;
    - a non-literal `save-build`;
    - a value not built earlier in the same block;
    - a tab that `setup` does not open;
    - a state producer missing, or placed after the call.
- **Tests** (`recipes/test/s10-rules.test.ts:576-631`):
  - **Real runner:** no gaps.
  - **Discriminating:** each of these yields exactly the expected gap lines:
    - the verifier's C1 runner (the build line removed from saveblk);
    - an M3 runner for save-ttl;
    - an M3 runner for block off;
    - a synthetic block whose producer comes after its call;
    - an unknown command.
  - **Tied to s10.ts:** the table keys equal the `commands` map of `recipes/s10.ts` (minus `pp1-plan`). For every fixed
    entry, the command's source contains the key literal and its tab literal, or it delegates to `cmdSaveSdk` /
    `cmdSaveMcp` (whose default tab is `save`). A command that reads a page value must not be listed with no needs.
- **Red before the fix:** on the builder's runner the analyser printed 18 gap lines.
  - 9 came from save-a's `foreach $k` loop, a non-literal key. That loop is now explicit lines.
  - The others were the verifier's cases:
    - `save-ttl: … needs 4m on save`;
    - `savedis` and `savejs` (4m on save);
    - `saveblk: save-block needs 4m on blk`;
    - four `off:` gaps: JavaScript off ×2, and the MCPF-1-off baseline ×2.
- **Mutants:**
  - "value needs ignored" → 1 failed.
  - "producer order ignored" survived at first, so I added the synthetic late-producer test; it then fails 1.

### M3 — every row block is self-sufficient

- **Blocks that now build their own values at their start:**
  - `B-save-ttl` builds 4m (:625).
  - `B-savedis` and `B-savejs` build 4m before their first change (:661, :674).
  - `B-savefix` builds fix.
  - `B-save-64`, `B-save-64-mcp` and `B-prim` each build 64m.
  - `B-save-a` builds 1m, 4m, surr, json, and 4m on `close`, as explicit lines.
- **Block off** (:710):
  - If `jsd` is in `S15Done` (it ran in this attempt), the block works as before.
  - If not (a resume that skipped jsd), it runs, in order:
    1. `Assert-Default 'OFF-setup-found'`;
    2. `S10 mcpf-off-prep`;
    3. sets `S15Touched`;
    4. `Set-S9Switch $global:O -Which evaluate -On $false`, the same options-page path as jsd;
    5. the title wait.

    All of this is recorded as part of its row. Then the existing `OFF-start` guard runs.
- **Tests:** the same dependency test now covers every row block. The `off` case is in the discriminating test.
- **Dry run:**
  - A crafted stop inside save-a → the resume prints the computed skip `bbl1 … pop2, save-a`.
  - Attempt 2's run order is `…, rep0, savefix, save-64, …`.
  - `save-a` is refused (`NOT RUN: … skipped in this resume`).
  - `save-64` before `savefix` is refused.
  - The output is in §Dry runs.

### M1 — the clean-tree guards collided with the tracked ledger

- **What changed:**
  - A new `Get-S15Tracked` (:117) runs
    `git status --porcelain --untracked-files=no -- . ':(exclude)docs/plans/2026-10-24-step10-step8-follow-ups-steps'`.
  - **Preflight** is strict on it (any line → STOP) and prints `tracked files: clean outside the steps dir …`.
  - **The build block** records the status before `npm run build` and compares it after. Any difference → STOP. The
    line `git status: no tracked change after the build` is kept verbatim.
- **Tests** (:634): the function holds exactly that pathspec; preflight fails on any line; the build reads before and
  after `npm run build` and compares them; no other `git status --porcelain` is left in the runner.
- **Proof by hand, from PowerShell as the runner calls git:** I appended a line to the tracked `…-steps/S4.md`.
  - With the pathspec, only ` M docs/e2e-test-plan.md` is listed.
  - Without it, `S4.md` is listed too.
  - I restored `S4.md` from a copy, and `git status` for it is clean.
- **Dry run:** preflight STOPs on the modified `docs/e2e-test-plan.md`, which is outside the steps dir. So §4.22,
  recipes and fixtures stay guarded.

### M2 — SW-1 could report "the event ends the wait" because of a set-up slip

- **What changed:**
  - `swPre(phase, row)` (`s10-rules.ts:1059`) and `swMeasured` were added.
  - `cmdSw1` (`s10.ts:574`) reads the intended tab's `listTabs` row before each capture: (i) `sw` must be
    `active=false`; (ii) `w` must be `active=true`.
  - A miss prints `pre-(<phase>) <tab> active=<b> (needs …) → NOT MEASURED (never re-run)`. The capture is not taken,
    d becomes NaN, and the loop goes on to the next trial.
  - A new line `ROW SW-1 measured <m>/3 trials (a decided outcome needs 3/3)`.
  - `swOutcome` and its thresholds (0.8 / F3) are unchanged.
- **§4.22 SW-1 (pre-condition only):** the steps now name both pre-checks, with a dated note. Each trial's
  pre-check lines and the new measured line were added. The sentence "The table counts only measured trials and needs
  3/3 measured … else undetermined" was added. 0.8's F3 note, quoted verbatim, is untouched.
- **Test** (:376): `swPre` on each branch and on an unlisted tab. The verifier's case: two measured trials at d ≈ 0 plus
  one not measured → `undetermined`. Mutant "(i) wants front" → 1 failed.

### m1 — the missing `mcpfVerdict` tests

- **Tests** (:343):
  - click, trusted + untrusted → FAIL with the exact text "an untrusted click reached the button";
  - type, trusted + untrusted → FAIL with "an untrusted input reached the field".
- **Press — deviation, for the step agent to decide:**
  - The brief says "the same for type and press". But `mcpfVerdict` and §4.22's MCPF-1 rule name no untrusted clause
    for press ("press — ≥ 1 trusted keydown Escape"). Adding one would change a pass rule, which this same brief
    forbids.
  - So the press test pins the rule as written: trusted + untrusted keydown → PASS, and untrusted-only → FAIL.
  - If the step agent wants the clause, it is a one-line change in `mcpfVerdict`, plus an amendment of the §4.22 MCPF-1
    rule.
- **Mutant:** the verifier's surviving M2 mutant (drop "an untrusted click reached the button") now fails this test.

### m2 — every block's worst case under 600 s

A turn timeout alone cannot do it. save-a holds six SDK saves, and each save start is bounded at 185 s by code
(60 s page + 120 s transfer + 5 s), so the sum of its bounds is far over 600 s. What I did:
- **Splits:**
  - `mcpf` → `mcpf-click` (the focus question + 3 trials), `mcpf-type` and `mcpf-press`, each with its own actor.
    `cmdMcpf --kind` stores each kind's count in `state.json`. The press block prints §4.22's unchanged
    `ROW MCPF-1 tally click 3/3 · type 3/3 · press 3/3` + `CHECK MCPF-1 3of3` (`mcpfTally`, `s10-rules.ts:1079`). A kind
    from an earlier attempt is printed `not in this attempt`, and the check is NOT MEASURED for that attempt.
  - `save-a` → `save-a` + `savefix`.
  - `save-b` → `save-64` (SDK + memory), `save-64-mcp` and `prim`.
- **Turn bounds:** `TURN_S = 75` and `TURN_BIG_S = 240` (the 64 MiB `saveTo` turn) (`s10.ts:272`). Before, every turn
  was 300 s.
- **A block deadline:**
  - Every node script a block runs (`s10.ts`, `s9.ts`, `s9-actor.ts`, `s6.ts`) now goes through `Invoke-S15Node`
    (:136). It is `Start-Process` with the output in a file; the output is printed when the script ends.
  - The deadline comes from `$BudgetS` / `$DefaultBudgetS`:
    - 330 s by default;
    - 360 s for save-ttl;
    - 300 s for bbl1 and bbl2.
  - Past the deadline, the call's tree is ended. `Stop-S15Tree` (:123) touches only processes whose command line names
    one of those scripts, each checked with `Test-SafeToKill`. Then a `STOP:` line is printed and the stop procedure
    runs inside the same tool call.
  - Inside the stop procedure, each node call has a 30 s cap instead.
  - The foreground PID is recorded as `fg`, so `-Block stop` ends it after a tool-cap kill.
  - `Wait-S10Bg` never waits past the deadline.
- **Each block's worst case** = budget + its longest call outside a node script (`$UnwrappedS`: bb-login 95 s, the
  reload 60 s, otherwise 15 s) + the stop procedure (`$StopBoundS` 160 s). That is ≤ 555 s for every block; the sheet
  §1 lists each.
- **Tests** (:654):
  - every block in `$Order` stays ≤ 570;
  - the deadline line is present, and there is no direct `node` call left in the runner;
  - `TURN_S` and `TURN_BIG_S` fit the default budget (4 × 80 ≤ 330, and 65 + 240 + 5 ≤ 330);
  - `mcpfTally` on each branch (mutant → 1 failed).
- **The sheet** states: "A block that the tool still ends at its cap is itself a STOP: run `-Block stop -Why …`". The
  runner brief says the same.
- **Dry run:** a sleeping stand-in script, with a deadline 4 s away:
  - ended after 7 s;
  - its tree was ended with `safe:` verdicts;
  - a `STOP:` line was printed, and the call threw;
  - 0 stand-in processes were left.

  Two more cases: a deadline already past → STOP before the call; inside the stop procedure → the 30 s cap is used.

### m3 — the known limit of L1

- §4.22 SAFE-0 (L1) row, and sheet §5: L1 tells the Step 10 build from Step 9's. That the loaded extension is S4b's is
  shown by the JSD rows themselves (`JS_DISABLED`) and by block 2's build of the committed HEAD. No check changed.

### NITs

- **Token not found:**
  - `scanLine10` and `scanVerdict10` (`s10-rules.ts:630, :645`) take `tokenFound`. When it is false, the line prints
    `token=not found` and the verdict is NOT MEASURED. Any other non-zero count still fails first.
  - `scanText` (`s10.ts:1276`) passes it.
  - In the runner, daemon.log, the transcripts and the raw output treat a non-zero exit as bad, so the STOP is
    conservative and nothing uncounted is copied. The console prints NOT MEASURED with the cause on the CHECK line.
  - The §4.22 R15-LOGS row says so. Test at :477.
- **REP-0:** the sheet says it is a probe, not a row, and runs again in every attempt of a resume (§1 row 11 and the
  resume paragraph).
- **Pin gate (deviation, listed as the brief asks):** R15-PIN runs in block 4 (`window`), after the build. The builder
  brief put it in pre-flight. That is harmless, since no state changes before it, and it is unchanged.

## Changed lines of `docs/e2e-test-plan.md` §4.22

Line numbers are as they stand now. Every change is inside §4.22, which runs from 1293 to 1411.
- **1343–1350 (new):** the dated amendment paragraph.
- **1352:** "blocks 1–10 and 27–30" → "blocks 1–11 and 33–35".
- **1356, R15-PRE:**
  - the new printed line `tracked files: clean outside the steps dir …`;
  - the STOP case now reads "a tracked file changed outside `…-steps/` (M1)".
- **1357, R15-BUILD:**
  - the new lines `tracked changes outside the steps dir before the build: 0` and `(the tracked status … equal before
    and after …)`;
  - the STOP case now reads "a tracked status outside the steps dir that differs after the build";
  - `git status: no tracked change after the build` is kept verbatim.
- **1363, SAFE-0 (L1):** the m3 known limit appended. The check and its text are unchanged.
- **1368, R15-LOGS:** a sentence on token-not-found → NOT MEASURED, which is a STOP for daemon.log and the transcripts.
- **1371:** "(blocks 11–20)" → "(blocks 12–26)".
- **1376, MCPF-1:**
  - Steps: three blocks and actors, and turns ≤ 75 s.
  - Expected: the per-block line `ROW MCPF-1 <kind> passed <n>/3 (kept for the tally)` is added.
  - The tally line and the 3of3 CHECK are unchanged, plus a sentence on the resume case.
  - The pass rule is unchanged.
- **1378, SW-1:**
  - Steps: the two pre-checks plus the dated M2 note.
  - Expected: the pre-check lines, the not-measured lines and `ROW SW-1 measured <m>/3 trials …`.
  - Rule: "counts only measured trials, needs 3/3 measured …". The thresholds are 0.8's and unchanged.
- **1380, SAVE-1M:** Steps: what save-a builds (fix moved to savefix; "every row block builds the values it reads").
- **1387, SAVE-FIX:** Steps: `-Block savefix`, `save-build fix`.
- **1388, SAVE-64:** Steps: `-Block save-64`; `-Block save-64-mcp` builds 64m; the turn is ≤ 240 s.
- **1389, SAVE-PRIM:** Steps: `-Block prim` builds 64m.
- **1391, SAVE-TTL:** Steps: `save-build 4m` first.
- **1393:** "(blocks 21–26; each ends" → "(blocks 27–32; each builds the value it reads before its first change, and
  each ends".
- **1399, SAVE-DISARM, and 1400, SAVE-JSOFF:** Steps: `save-build 4m` first.
- **1401, SAVE-BLOCK:** Steps: `save-build 4m --tab blk` first (C1).
- **1402, JSD:** `-Block off` steps: off's own JavaScript-off set-up when jsd did not run in the attempt (M3).

## Dry runs (scratchpad only: `…\scratchpad\fx1\`; no Chrome, no daemon, no 9234)

1. **`harness.ps1`** loads the runner's own function definitions by text and runs `Invoke-S15Node`:
   - `S10 --help` → exit 0.
   - `S10 no-such-command` → a `STOP:` line, and it throws.
   - A stand-in `fake\recipes\s10.ts` sleeping 60 s, with a deadline 4 s away:
     - its arguments reached it with spaces intact (`["sleep","an arg with spaces"]`);
     - 4 `safe:` / `already gone` lines for its tree;
     - `STOP: block dryrun: node … did not end within the block's budget (4 s left) …`, and it threw after 7 s;
     - 0 stand-in processes left, and `fg` cleared.
   - A deadline already past → `STOP: … its budget of 60 s is used up before node recipes/s10.ts --help`.
   - Inside the stop procedure, the call ran under the 30 s cap.
2. **`resume.ps1`**, on a real `s10-r15.ps1` with a crafted state: a stop inside save-a in attempt 1, with blocks 1–19
   done.
   - `-Block savefix` → `NOT RUN: the wave stopped at 'save-a: …'`.
   - These resumes are refused, each printing `USAGE:` (never STOP) and exiting 3:
     - `-Skip save-a` → refused, naming the exact required set;
     - `+rep0` → `names framing block(s) rep0`;
     - `-Attempt 3` → refused.
   - The computed resume `-Attempt 2 -Skip bbl1,bbl2,mcpf-click,mcpf-type,mcpf-press,cap,sw1,pop2,save-a` → the
     `RESUME attempt 2: …` lines and the order `preflight … rep0, savefix, save-64, save-64-mcp, prim, idonly, …`.
   - In attempt 2: `save-a` → `NOT RUN: … skipped in this resume`; `save-64` → `needs block savefix first`.
   - Then `preflight -Prep HEAD`:
     - `STOP: 1 tracked file(s) modified outside the steps dir …`;
     - the stop procedure: `RESTORE safety: nothing to restore`, `no daemon of this wave recorded - none touched`,
       `STOPPED at block preflight …`, exit 2;
     - every block → `NOT RUN`;
     - the next resume (`-Attempt 3`) needs the same nine-block skip (the previous skip is carried).

## Untested live (added to the sheet §5)

- **The `Start-Process` wrapper:** its output is shown when the script ends instead of streamed, and a hidden window
  replaces the inherited console. Only the stand-in was run. `S10Bg` already used the same pattern in the builder's
  runner.
- **The 75 s turn bound** for a sonnet turn with one MCP call. A slow first turn becomes a STOP (`did not end`), not a
  re-run.
- **`crypto.subtle` on `saveblk.localhost`** (the verifier's guess): `save-build 4m --tab blk` now runs first in block 30.
  If the page cannot hash, the build throws before any state change.

## Proposed decision (for the step agent)

**2026-10-25 · S7: each Run 15 block bounds itself by a budget, under the tool's cap.**
- **Decided:** every node script a block runs is bounded by the block's deadline (330 s by default; save-ttl 360 s;
  bbl 300 s). Past it, the call's identified tree is ended and the stop procedure runs in the same call. Each block's
  worst case is ≤ 555 s; a rule test checks it.
- **Why:** the brief's turn timeouts alone cannot bound blocks that hold several 185 s-bounded save starts, and a
  tool-cap kill bypasses the stop procedure.
- **Instead of:** one row per block, or only the turn timeouts plus "a tool timeout is a STOP".
- **Revisit if:** a live block hits its budget in a run where nothing hung.

## Files for the commit

Unchanged from the builder's list, plus this report:

- `recipes/s10.ts`
- `recipes/s10-rules.ts`
- `recipes/s10-win.ps1`
- `recipes/s10-mem.ps1`
- `recipes/s10-r15.ps1`
- `recipes/s10-ret1.ts`
- `recipes/s10-ret1.ps1`
- `recipes/tsconfig.s10.json`
- `recipes/test/s10-rules.test.ts`
- `recipes/test/s10-fixtures.test.ts`
- `test-fixtures/s10-mcpf.html`
- `test-fixtures/s10-cap.html`
- `test-fixtures/s10-save.html`
- `docs/e2e-test-plan.md`
- `docs/plans/2026-10-24-step10-step8-follow-ups-steps/S7-wave-sheet.md`
- `docs/plans/2026-10-24-step10-step8-follow-ups-steps/briefs/S7-runner.md`
- `docs/plans/2026-10-24-step10-step8-follow-ups-steps/S7-prep-builder.md`
- `docs/plans/2026-10-24-step10-step8-follow-ups-steps/S7-prep-verifier.md`
- `docs/plans/2026-10-24-step10-step8-follow-ups-steps/S7-prep-fixer1.md`
- `docs/plans/2026-10-24-step10-step8-follow-ups-steps/S7.ledger.md`
- `docs/plans/2026-10-24-step10-step8-follow-ups-steps/briefs/S7-prep-builder.md`
- `docs/plans/2026-10-24-step10-step8-follow-ups-steps/briefs/S7-prep-verifier.md`
- `docs/plans/2026-10-24-step10-step8-follow-ups-steps/briefs/S7-prep-fixer1.md`
- `docs/plans/2026-10-24-step10-step8-follow-ups-steps/briefs/S7-verbatim.md`

## Round 2 (fresh fixer)

*Started 2026-10-25 08:59 by the fresh round-2 fixer (the first round-2 fixer hung with no report). Brief:
`briefs/S7-prep-fixer2.md`; the one open finding is the verifier's W1 (round-1 re-check). Updated after each item.*

Status: **done** (2026-10-25 09:15; resumed once after a usage-limit pause). Every item holds; checks below.

**The hung fixer's partial edits, read against items 1–5:** `descendants` / `treeKillable` / `headlessKillable` /
`sameProcess` (`s10-rules.ts`) and their mirrors `Get-S10Descendants` / `Test-S10TreeKillable` /
`Test-S10HeadlessKillable` (`s10-win.ps1`), `Set-S15Pid` recording the creation time, `Stop-S15Pid`'s `SKIP <pid>
reused` re-check, `Stop-S15Tree` and `Stop-S15Headless` on them, and five tests — present and right. Missing or wrong:
`s10-ret1.ps1` walked by creation time but killed left-overs **without** the creation-time re-check (item 3); a
non-killable process in a tree was skipped yet the tree still reported "ended"; the headless rule matched
`--user-data-dir=…\idonly-profile2` as `…\idonly-profile` (prefix); nothing caught a child started between the tree's
snapshot and its parent's kill; save-ttl's slack (item 5) was not in the sheet.

**Why "one stand-in survived step 3"** (the hung fixer's last words). `node` on PATH is nvm-windows' **shim**
(`…\nvm\.nodejs` → `.shim`), which starts the real `node.exe` as its child. The hung harness's step 2 ended a stand-in
with `Stop-S15Pid` (one PID): the shim died, the real node lived on (its `s.out` later printed "ended by itself") and
was counted in step 3. That was a harness artefact — the runner ends node calls only through `Stop-S15Tree`, and
`Stop-S15Pid` only on single processes (python servers, the powershell sampler, the daemon, which the SDK spawns with
the real node). **But re-running the timeout path found a real gap:** every `node --import tsx` call has an
`esbuild.exe` child (tsx's service), which the image allowlist skipped — so every timed-out tree left it running.

| Item | What changed | Where | Proof |
|---|---|---|---|
| 1 | descendant = created no earlier than its parent, level by level (kept); **new** `lateChildren` / `Get-S10LateChildren`: up to two more passes for children a member started after the snapshot, never a reused PID's own (`c.born < holder.born`) | `s10-rules.ts` `descendants`, `lateChildren`; `s10-win.ps1` `Get-S10Descendants`, `Get-S10LateChildren`; `s10-r15.ps1` `Stop-S15Tree` | tests "a descendant is created no earlier…", "a child started after the tree was identified…"; mutants M1, M2 red |
| 2 | tree kills: only node/claude/cmd/conhost/**esbuild**, never `chrome.exe`, anything else left → "NOT all ended"; headless: `Browser.close`, then only `chrome.exe` born ≥ the launch stamp with `--user-data-dir=` exactly the profile under `%TEMP%\bridge-e2e\s15` | `s10-rules.ts` `TREE_KILL_NAMES`, `headlessKillable`; `s10-win.ps1`; `s10-r15.ps1` `Stop-S15Tree`, `Stop-S15Pid`, `Stop-S15Headless` | tests "a tree kill never takes chrome.exe…", "the headless Chrome…" (+3 cases); mutant M4 red |
| 3 | every kill re-checks the creation time recorded at identification → `SKIP <pid> reused`; **RET-1 too** (the browser process and each left-over) | `s10-r15.ps1` `Stop-S15Pid`, `Stop-S15Tree`; `s10-ret1.ps1` step 3 | test "the PowerShell side mirrors…" (text ties incl. ret1); dry run step 3 |
| 4 | rule tests of the pure part | `test/s10-rules.test.ts` | mutants below |
| 5 | save-ttl's ≈ 25 s slack → a slow start is a STOP (safe direction) | sheet §1 row 26 | — |

Also in the sheet (§2): a dated paragraph "which processes the wave may kill".

**Mutants (item 4)** of `recipes/s10-rules.ts`, each restored from a copy (sha256 `85830ac9…e591` before and after):
M1 `descendants` without the creation-time check → 1 failed ("a descendant is created no earlier…"); M2 `lateChildren`
without the reused-holder bound → 1 failed; M4 `headlessKillable` without the end-of-value boundary → 1 failed. M3
(dropping `lateChildren`'s alive-member skip) stayed green: it is an equivalent mutant (the holder bound `c.born <
holder.born = m.born` already excludes every child), kept for clarity. Dropping the `chrome.exe` line of `treeKillable`
is equivalent too while `TREE_KILL_NAMES` lacks it; adding `chrome.exe` to the list fails the `not.toContain` test.

**Dry run (no Chrome, no daemon, no 9234; `scratchpad\fx2\harness3.ps1`, the runner's functions loaded by text):**
1. PowerShell mirror on the tests' tables: descendants `100,101,104,102`, late children `110,111,113`, headless rule
   True/False/False/False — equal to the TS rules.
2. A shim-started stand-in: tree = shim `node.exe`, `conhost.exe`, real `node.exe`, `esbuild.exe`; `Stop-S15Tree` ended
   all four, 0 left.
3. A wrong recorded creation time → `SKIP <pid> reused`, the process alive (both `Stop-S15Tree` and `Stop-S15Pid`); the
   right one → ended, 0 left.
4. The per-block timeout path: a stand-in `recipes\s10.ts` starting a child node every 150 ms (30 in all), deadline
   3 s → `STOP: block dryrun3: … did not end within the block's budget`, threw; 23 kills (≈ 0.85 s each:
   `Test-SafeToKill` + CIM), **0 stand-ins, 0 esbuild left**, `fg` cleared. The first run (before `esbuild.exe` entered
   the list) reported `SKIP … esbuild.exe … left running` and `tree ended: False` — the gap fixed above. The children
   not in the snapshot needed no late pass: libuv puts a non-detached child in a kill-on-close job, so they died with
   the real node; the late pass is for detached children (the actor host is spawned detached).
5. Afterwards: no `node`/`powershell`/`python`/`ping`/`timeout`/`esbuild` process of mine (only node 22152, untouched).

**Checks:** `tsc -p recipes/tsconfig.s10.json` exit 0; `.s9` exit 0; `npm run typecheck` exit 0; `npx vitest run`
132 files, **3233** passed = 3227 + 6 (all in `recipes/test/s10-rules.test.ts`; nothing removed); the four s10 scripts
parse with 0 errors (`s10-win.ps1` keeps its BOM and one `—` in a title regex, as before); the STOP rule
(whitespace-normalised) is byte-identical in the sheet and the runner brief; `git diff -U0 02eb0c2 --
docs/e2e-test-plan.md` is still the one pure-addition hunk `@@ -1292,0 +1293,119 @@` (not touched this round).

**Files changed this round:** `recipes/s10-rules.ts`, `recipes/s10-win.ps1`, `recipes/s10-r15.ps1`,
`recipes/s10-ret1.ps1`, `recipes/test/s10-rules.test.ts`, `S7-wave-sheet.md`, this report. **The commit file list** is
round 1's list above plus `briefs/S7-prep-fixer2.md`.
