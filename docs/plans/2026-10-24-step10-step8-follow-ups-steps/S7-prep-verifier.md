# S7 prep verifier report (Step 10, stage S7 — Run 15 prep)

Verifier (level 2, independent), Opus 5.5, 2026-10-25. Base `02eb0c2` + the prep builder's uncommitted files. Brief
`briefs/S7-prep-verifier.md`. I ran nothing against Chrome, started no daemon, actor, server or headless Chrome, and did
not build. I edited none of the builder's files. My only change was a set of temporary mutations to `recipes/s10-rules.ts`,
restored from a copy (the sha256 before and after is `7a34d1af…9703`).

## Verdict: **FAIL**

There is one CRITICAL finding and three MAJOR ones. The fixes are small, but as built the wave stops for certain at block 25
(SAVE-BLOCK). If the runner follows its brief literally, it also stops at block 2. Everything else holds up well:
- **Coverage:** every row the builder brief names is present.
- **Expected texts:** they are tied to the product constants by drift tests (`EXPECT10` against `safety.ts`,
  `registry.ts`, `safetyRefusalLine`, `evaluate/save.ts`, the store, and source lines of `intercept.ts` and `registry.ts`).
  I re-read the code for each string.
- **§4.20 and §4.21:** untouched.
- **STOP rule:** byte-identical in the sheet and the runner brief.
- **RET-1 and PP1:** the runner cannot reach them.
- **SAVE-IDONLY:** follows the step agent's ruling.

## Checks (commands and output)

| Check | Result |
|---|---|
| `npx tsc --noEmit -p recipes/tsconfig.s10.json` | `s10 exit 0` |
| `npx tsc --noEmit -p recipes/tsconfig.s9.json` | `s9 exit 0` |
| `npm run typecheck` | `typecheck exit 0` |
| `npx vitest run` | `Test Files 132 passed (132)` · `Tests 3216 passed (3216)` = 3165 + 51; the two new files alone: `2 passed`, `51 passed` (42 + 9, as the builder reports); nothing removed |
| `npx tsc --noEmit -p recipes/tsconfig.s6.json` | 26 errors in `extension/src/tabs.ts`, 3 in `extension/src/debugger.ts`. The builder's claim is confirmed: the failure predates this work and grows through the test glob |
| `git diff -U0 02eb0c2 -- docs/e2e-test-plan.md \| grep '^@@'` | `@@ -1292,0 +1293,110 @@`: pure additions after §4.21 (§4.21 starts at 1194, §4.22 at 1293, §5 at 1403) |
| `git status --short` | `M docs/e2e-test-plan.md` plus untracked files only in `recipes/s10*`, `recipes/test/s10-*`, `recipes/tsconfig.s10.json`, `test-fixtures/s10-*.html` and the steps dir. No `s9*` file and no product file is touched |
| STOP rule, whitespace-normalised sha256: builder brief, sheet, runner brief | all three `2a78af9c…dbb0`, one occurrence each |

**Mutation proofs** (mutate `recipes/s10-rules.ts`, run the two s10 test files, restore from a copy):

| Mutant | Result |
|---|---|
| M1 `answerBound` `+ 120` → `+ 200` | `1 failed` ("the answer: the exact form, the bound min(300, path + 120) …") |
| M3 `EXPECT10.capWarning` `—` → `-` | `1 failed` ("drift … the cap warning line (S3)") |
| M4 `step10Check` ignores the build equality (`if (false)`) | `1 failed` ("step10Check: the disk build and the Step 10 handler's refusal") |
| M5 `mcpfVerdict` ignores `active` | `1 failed` ("click / type / press: trusted on the page and the tab in front") |
| M2 `mcpfVerdict` drops "an untrusted click reached the button" | **survived** (`51 passed`), see m1 |

## Findings

### CRITICAL

**C1 — SAVE-BLOCK always stops, and the resume rule then keeps it from ever being measured.** `cmdSaveBlock` →
`pausedSave(c, id, "blk", "4m", …)` → `pageDigest`. When the page holds no `4m` value, `pageDigest` throws `SetUp("…holds no
built value…")`, which prints a `STOP:` line and exits 2. No block ever builds `4m` on the `blk` tab:

```
$ grep -n "blk" recipes/s10.ts recipes/s10-r15.ps1 | grep -v Pattern
recipes/s10.ts:895:    const r = await pausedSave(c, id, "blk", "4m", async () => {
recipes/s10-r15.ps1:580:function B-saveblk {
```

`B-save-a` builds only on `save` (`1m 4m surr json fix`) and `4m --tab close`.

Consequence: block 25 prints `STOP:` before `READY`, and the driver waits up to 120 s, then stops (sheet §5). After that
stop, `-Skip` must contain `saveblk`, because it is the stopped row block. So SAVE-BLOCK is lost for Run 15, and blocks
26–27 (JSD, MCPF-1-off) run only after a resume.

**Fix:** put `S10 save-build 4m --tab blk` at the start of `B-saveblk`, before `S15Touched`. Then add a static test: for
every `pausedSave`, `save-sdk` and `save-mcp` consumer, the tab and key pair is built in the same block or an earlier one.

Untested-live guess to add to §4: the page's `crypto.subtle` on `http://saveblk.localhost:8080` relies on Chrome treating
`*.localhost` as a secure context.

### MAJOR

**M1 — the build block's tracked-file check collides with the runner's tracked ledger.**
- `B-build` and `B-preflight` STOP on any line of `git status --porcelain --untracked-files=no` (`s10-r15.ps1:233,266`).
- `S7.ledger.md` becomes tracked with the prep commit (builder §8: "plus the step agent's own S7.ledger.md").
- The runner brief says "Write … AS YOU GO … the lines of blocks 1–7 go to `S7.ledger.md`", and the sheet says "Paste each
  block's output as it comes".

So a runner that records block 1 before calling block 2 gets `STOP: the build changed 1 tracked file(s)`. A resume's
preflight stops the same way unless the ledger is committed first.

**Fix:** have both checks ignore the steps dir (`git status --porcelain --untracked-files=no -- . ':!docs/plans/2026-10-24-step10-step8-follow-ups-steps'`),
or compare the porcelain lines before and after the build.

**M2 — SW-1 can conclude "the event ends the wait" because of a set-up slip.** The set-up guard runs once, before trial 1
(`s10.ts:536-539`). There is no per-trial check that `w` is in front before (ii) and `sw` is behind before (i). The restore
after (i) is fire-and-forget (`tabs.ts`: `void startRestore()`) and is skipped when a `focusTab` or a moved tab intervenes.
If it misses, (ii) switches too, so d ≈ 0 and `swOutcome` returns "the event ends the wait". That outcome closes the
carried input (0.8's table), so a set-up slip can produce a false conclusion.

**Fix:** before each capture, read `rowOf` (sw `active=false` before (i), w `active=true` before (ii)). If either is off,
that trial's d is "not measured", which makes the outcome undetermined. Add a rule test.

**M3 — resume dependencies the computed skip does not cover.**
- `save-ttl`, `savedis` and `savejs` need `4m` on `save`, which only `save-a` builds.
- `off` needs JavaScript off and `mcpf-off-prep` from `jsd`.

Any resume after `save-a` (or after a stop in `jsd`) therefore STOPs at the first dependent block, by `pageDigest` or by
`OFF-start`'s guard. Each such stop costs another return, and the rows are lost. Proposed decision 2 is sound only with
this addressed.

**Fix:** each consumer builds its own value without harm at block start, before any state change (build when
`__s10status[key]` is absent). State in the sheet that `off` cannot be resumed without `jsd`, or give `off` its own set-up.

### MINOR

**m1 — one clause of `mcpfVerdict` is not covered by a test.** The "no untrusted click / input" clauses have no test
(mutant M2 survived). They matter only if a content-path event sneaks in, but the row cites them as a rule. **Fix:** add
a test where a trusted plus an untrusted click → FAIL, and the same for type.

**m2 — two blocks have no time budget against the tool's 600 s cap.**
- `mcpf`: 10 actor turns, each with a 300 s turn timeout (`actorTurn`).
- `save-b`: 64 MiB through the SDK, then the MCP leg (10 s + 120 s), then SAVE-PRIM.

A tool-timeout kill bypasses the stop procedure: actors or the sampler are orphaned, and the wave is not marked stopped.
**Fix:** a turn timeout so that the worst case fits under 600 s, or split `mcpf` (click / type / press) and move SAVE-PRIM
into its own block.

**m3 — the Step 10 check accepts any S4-or-later build.** L1 tells the Step 10 build from Step 9's (`UNKNOWN_METHOD`)
and checks the daemon build. It would also pass an intermediate build, for example S4 without S4b. With the build of
committed HEAD plus a reload exit of 0, the risk is small. **Fix:** record it as a known limit.

### NIT

- `tokenOf()` returns `""` when neither `BRIDGE_TOKEN` nor `bridge.token` is found, and `countOf` then gives 0. The token
  count would pass without checking anything; print `token=not found` as NOT MEASURED.
- JSD's `no-png` has no positive control (`be.report === undefined` is the real check, so this is fine).
- REP-0 is a framing block and re-runs on a resume (acceptable for a probe; say so in the sheet).
- The R15-PIN gate runs after the build. That is harmless (no state change), but the builder brief put it in pre-flight;
  the report does not list it as a deviation.

## The builder's deviations (§5) and proposed decisions (§6)

| Item | Verdict |
|---|---|
| Block order daemon → reload → setup | **Agree.** The reload proof needs a running daemon (`extension resync`), and opening the tabs after the reload avoids the content script's `if (!window.__agentBridge)` keeping an old object. Revisit-if is right. |
| Computed resume skips | **Agree with the rule** (it cannot re-run an observed row: `$must` is computed from `S15Done`, the previous skip and the stopped row block; `-Skip` must equal it exactly; framing names are refused; `-Attempt` must be the stored one + 1). **Conditional on M3**: the dependency gaps make resumes stop again. |
| SAVE values from G–Z; k = 16 for answers, k = 32 for logs and transcripts | **Agree.** Answers hold only hex digits, digits and paths, and no path has a 16-character run of G–Z capitals. The long single-letter runs of `surr` (`G`, `K`) are not found in English prose at k = 32. |
| SAVE-64 memory = the largest rise among `--extension-process` renderers | **Agree, as a RECORD.** The method is stated before the run, and the sheet says which extension it serves is not proven. |
| JSD bridge-off leg with JavaScript also off | **Agree.** It proves 0.12's ordering (DISARMED wins). The plain bridge-off case with JavaScript on is covered by SAVE-DISARM's pull and Step 9's rows. |
| SAVE-4M control and the SDK/MCP leg split | **Agree.** Every SAVE row in S4 §7 is present, plus SAVE-FIX. SAVE-1M, -64 and -FIX run on both clients. |
| SAVE-IDONLY | **Follows the ruling.** Same `chrome.exe` (`Get-S9Chrome`), `--headless=new`, a fresh `--user-data-dir` at `%TEMP%\bridge-e2e\s15\idonly-profile` (refused if any Chrome already uses it), its own free port in 9301–9399, the fixture page, a Node CDP script over `ws` with an object control and a no-idOnly control, `Browser.close`, PIDs found by profile path and checked gone within 10 s, else `Test-SafeToKill`, then the profile removed. The user's profile is never named. |

## Walking the sheet (runnability)

- **Order, ports and actors:**
  - The order is preflight → build → servers → window (pin gate) → daemon → reload → setup → safe0 (L1, tuple guard) →
    console → found → rep0 → rows that change no state → state rows → restore → logs → teardown.
  - The ports are 8080 and 8085, both checked free (8082 is avoided).
  - Actors name their tabs explicitly: the daemon's `checkLease` passes unleased tabs and an explicit `tab` never claims
    (`intercept.ts:488,546`). Each actor is ended, followed by `wait-alone`, before the next client.
- **Strings and fixtures I confirmed:**
  - `javascript:void(0)` and `data:text/html,S15` pass `z.string().url()` (zod 3.25.76: `true true`), which resolves the
    builder's guess 13.
  - `data:` is a script scheme (`safety.ts:232`).
  - Saves are cleared at a disarm and when JavaScript is turned off (`sw.ts:45,353`).
  - The old bb-login at `2479301` (S5's parent) is ASCII and takes `-DryRunBase` / `-DryRunPage`.
  - The popup link and `openerTabId` are in `listTabs` rows.
- **Untested-live guesses that most threaten the wave**, after C1, M1, M2 and M3:
  1. The `--extension-process` filter of the memory sampler.
  2. Whether a sonnet actor makes only the named tool call (`callsVerdict` FAILs otherwise; recorded, not a STOP).
  3. The CAP-1 synthetic click on element 900 far below the fold in a background tab.
  4. SAVE-PRIM's 64 MiB through `chrome.debugger` (a guard follows it).
  5. Whether the headless Chrome's child processes carry the profile path on their command line, which
     `Get-S10HeadlessPids` relies on.

## Files

Written: `docs/plans/2026-10-24-step10-step8-follow-ups-steps/S7-prep-verifier.md` (this report). Nothing else changed:
`recipes/s10-rules.ts` was restored, with sha256 `7a34d1afe7686ce4e7777a903bfc17172b514393bce4bca5699cfa78b2ca9703`
before and after.

## Round 1 re-check (after `S7-prep-fixer1.md`)

Same rules as round 0: no Chrome, no daemon, no 9234, no edits to the fixer's files. My only change was two temporary
mutations of `recipes/s10-r15.ps1`, restored from a copy (sha256 `831c877f…a413` before and after; `s10-rules.ts`
`3d722188…439d` untouched).

### Verdict: **FAIL**, on one item only (W1 below)

C1, M1, M2, M3, m1, m3 and the NITs pass. W1 is the step agent's own wrapper check ("can it ever kill a process the wave
did not start?"), and the answer is yes. The fix is two lines; everything else may stand as is.

### Checks

| Check | Result |
|---|---|
| `npx tsc --noEmit -p recipes/tsconfig.s10.json` / `.s9.json` / `npm run typecheck` | `s10 exit 0` · `s9 exit 0` · `typecheck exit 0` |
| `npx vitest run` | `Test Files 132 passed (132)` · `Tests 3227 passed (3227)` = 3216 + 11 |
| `git diff -U0 02eb0c2 -- docs/e2e-test-plan.md \| grep '^@@'` | `@@ -1292,0 +1293,119 @@`: still pure additions after §4.21 |
| STOP rule (whitespace-normalised sha256) in the sheet, the runner brief and the builder brief | all three `06b34a38…07ae` |
| `git status --short` (tracked) | only ` M docs/e2e-test-plan.md` |

### The items

| Item | Re-check | Verdict |
|---|---|---|
| C1 | `B-saveblk` now starts with `S10 save-build 4m --tab blk`, before `S15Touched`. **Mutation D1:** I deleted that line, and `s10-rules.test.ts` reported `2 failed` (the "no dependency gap" test and the "discriminates" test). Restored. | PASS |
| M3 + the dependency test | **Mutation D2:** I deleted `S10 save-build 4m` from `B-save-ttl`, and got `2 failed` (same tests). Restored. So the test fails on a block with a removed build step, as asked. `B-off` gets its own JavaScript-off set-up through the same options-page path, starting from `Assert-Default` (found state), and records it as part of the row. | PASS |
| M1 | `Get-S15Tracked` uses the pathspec `':(exclude)docs/plans/2026-10-24-step10-step8-follow-ups-steps'`. Pre-flight is strict on it; the build check compares before and after (`s10-r15.ps1:117,305,333-342`). Everything outside the steps dir stays guarded, including §4.22. | PASS |
| M2 | `swPre` runs before each capture: (i) needs `sw` `active=false`, (ii) needs `w` `active=true`. A miss gives NaN, which means not measured, so the outcome is `undetermined` (`s10.ts:574-592`). The thresholds are unchanged. | PASS |
| m1 | The tests now include trusted + untrusted click → FAIL and the same for type. Press is ruled to stay as written. It is still **discriminating against an `ok` with nothing received**: the rule needs ≥ 1 *trusted* `keydown Escape` and the tab `active` after, so an `ok` that delivers nothing FAILs. | PASS |
| m2, the splits and turn bounds | `mcpf` is split into click / type / press, `save-b` into `save-64`, `save-64-mcp` and `prim`, and `savefix` is its own block. Turns are bounded at 75 s and 240 s; budgets are 330 s by default, 360 s for save-ttl and 300 s for bbl. A deadline that runs out throws, and the main `catch` runs `Invoke-S15Stop`. That means the restore runs whenever the state was touched (`Restore-S9All`), along with the background, foreground and actor clean-up and the `STOP:` line (`Fail-S15` → `Stop9`). Inside the stop procedure each node call is capped at 30 s. | PASS, except W1 |
| m3 | Recorded as a known limit; the check is unchanged. | PASS |
| NITs | `token=not found` now reads NOT MEASURED, never a pass; REP-0 is described as a probe that re-runs on a resume; the pin-gate placement is listed. | PASS |

**§4.22 lines the fixer changed.** I checked them against the fixer's list:
- Every change sits inside §4.22, which is still pure additions.
- Block renumbering, R15-PRE/R15-BUILD, SAFE-0, the SAVE-* rows and JSD/off change only steps, preconditions and new
  printed lines, plus the dated amendment paragraph.
- R15-LOGS: a missing token is now NOT MEASURED, and a STOP for daemon.log and the transcripts. That is stricter.
- SW-1: it adds "the table counts only measured trials, needs 3/3 measured". That equals the old `swOutcome` on NaN and
  adds a pre-condition.
- MCPF-1: the rule text is identical.

None of these loosens a rule, and all were written before any measurement.

### Findings

**W1 (MAJOR): the wrapper's tree kill can reach a process the wave did not start.**
- **Where:**
  - `Stop-S15Tree` (`s10-r15.ps1:123`) checks only the *root's* command line.
  - It then kills every PID that `Get-ProcTree` returns (`s9-win.ps1:1152`).
  - `Get-ProcTree` collects every process whose `ParentProcessId` equals a PID in the tree. It has no creation-time check.
- **The hole:** Windows keeps a dead parent's PID in `ParentProcessId`, and PIDs are reused. So when the timed-out node
  call got a recycled PID, any process orphaned by an earlier process with that PID is listed as its "child". The same
  goes, recursively, for the children of those orphans.
- **Why `Test-SafeToKill` does not help:** it rejects only the driver's own chain, so it calls such a process `safe:`.
- **A concrete case:** the user's Chrome browser process, if it was started by a launcher that has since exited (e.g. a
  `bgf-launch.ps1` relaunch), has a dead `ParentProcessId`. That is G10-2 territory.
- **Likelihood and scope:** low, but the cost is irreversible. Before round 1 the same path existed only in
  `Stop-S15Background`; the wrapper now puts it under every node call's timeout. (I missed it in round 0.)
- **Fix (two lines):**
  - In `Stop-S15Tree`, or in a wave-local copy of `Get-ProcTree`, keep a child only if its `CreationDate` ≥ its
    parent's `CreationDate`.
  - Optionally, kill only names in {node.exe, claude.exe, cmd.exe, conhost.exe}, and never `chrome.exe`.
  - Add a rule test on a synthetic process table: an orphan created before the root is excluded.

**Notes (no action needed):**
- **Orphans:**
  - A timed-out `s9-actor start` takes its own live children down with its tree.
  - An actor host that was already detached is ended by `End-AllActors` only if `Start-Actor` returned and recorded it.
    A hang inside `start` relies on the tree kill (sheet: "its PIDs are in the actors folder").
  - A daemon spawned by a timed-out call is in its tree. It is wave-started, and `Stop-S15Processes` tolerates its absence.
  - The headless Chrome is started by PowerShell, not node, so it is never in a node tree.
- **save-ttl's budget is tight:** 360 s for a 4m build, a 330 s idle, the start and the pulls, so about 25 s of slack.
  A slow start STOPs (conservative) instead of producing a wrong row.

## Round 2 re-check (after "Round 2 (fresh fixer)" in `S7-prep-fixer1.md`)

Same rules as before: no Chrome, no 9234, no edits to the fixer's files. Long commands ran in the background with
`timeout` bounds. My only change was four temporary mutations of `recipes/s10-rules.ts`, restored from a copy (sha256
`495bc432…a330b` before and after).

### Verdict: **PASS-with-notes**

W1 is closed.

### Checks

| Check | Result |
|---|---|
| Typechecks | `s10 exit 0` · `s9 exit 0` · `typecheck exit 0` |
| `npx vitest run` | `Test Files 132 passed (132)` · `Tests 3233 passed (3233)` = 3227 + 6 |
| `git diff -U0 02eb0c2 -- docs/e2e-test-plan.md` | still `@@ -1292,0 +1293,119 @@`; §4.22 untouched this round |
| STOP sentence | sheet and runner brief both `06b34a38…07ae` |
| Sheet row 26 | the save-ttl note is present: "Slack ≈ 25 s … a slow start or build runs out of budget → `STOP:` (the safe direction …)" |

### The items

| # | Re-check | Verdict |
|---|---|---|
| 1 | The tree walk no longer uses `Get-ProcTree`. A process counts as a child only if its parent PID is a member's and it was created no earlier than that member, level by level (`descendants` / `Get-S10Descendants`). The root needs its recorded creation time and a command line naming `recipes/(s10\|s9\|s9-actor\|s6).ts`, else `SKIP <pid> reused` or "not touched". So an orphan of a reused PID, the user's Chrome, the user's PowerShell or Claude sessions, and node PID 22152 are all excluded: they were all created before the wave's node call. `lateChildren` adds only children of a member that is gone, bounded above by the creation time of any new holder of that PID. | PASS (NIT N1) |
| 2 | Tree kills accept only `node`, `claude`, `cmd`, `conhost` and `esbuild`. `chrome.exe` is refused twice: in `treeKillable` and in `Stop-S15Pid` unless `-Headless`. The headless rule needs a process created at or after the launch stamp (the stamp is taken before `Start-Process`). It needs a profile under `%TEMP%\bridge-e2e\s15\`, and an exact `--user-data-dir=<dir>` followed by a space or a closing quote, so the `idonly-profile2` prefix bug is fixed. | PASS |
| 3 | `Stop-S15Pid` re-checks the recorded creation time and prints `SKIP <pid> reused`; with no recorded time it prints `SKIP … unidentified` and never kills. Every `Set-S15Pid` records it: fg, bg, web, bbl, daemon, mem, headless. `s10-ret1.ps1` re-checks the browser process (exit 2 on a mismatch) and each left-over process (`SKIP … reused`). | PASS |
| 4 | Mutants, each restored. X1 (`descendants` without the creation-time check): 1 failed. X2 (`chrome.exe` added to `TREE_KILL_NAMES` and `treeKillable`'s chrome line dropped): 2 failed, including the PowerShell-mirror test. X3 (the headless match turned back into a prefix match): 1 failed. X4 (no launch-stamp check): 1 failed. | PASS |
| 5 | `esbuild.exe` is tsx's service, a child of the wave's node call. It is killed only as a descendant: created after its parent, with the root identified as above, plus `Test-SafeToKill`. A user's own esbuild cannot qualify, because it would need the wave's node call as its parent and a later creation time. | PASS |
| 6 | When `Stop-S15Tree` leaves a member alive it returns `$false`. On the per-block timeout path the call goes on to `Fail-S15` anyway (`STOP: … its process tree ended: False`). In the stop procedure the result is reported as `processes: NOT all ended`, inside an existing STOP. So no path continues the wave after a partial kill. | PASS |

### Notes

**N1 (NIT):** one residual window remains in `lateChildren`. After a member is killed, its PID can be reused by a
process Y. If Y starts a child Z and exits, all between two passes (seconds apart), Z passes the check: its parent PID is
the member's, it was created later, and it has no live holder. It is still limited to node, claude, cmd, conhost and
esbuild and to `Test-SafeToKill`. It is negligible; record it as a known limit, no change.

## Wave fixer 1 check (after Return 1; `S7-wave-fixer1.md`, uncommitted on `23db872`)

Read-only file checks only: no Chrome, no daemon, no 9234. My only changes were three temporary mutations, each
restored from a copy. The sha256 before and after: `s10-rules.ts` `7b77460a…d8a2`, `s10-r15.ps1` `043e2fb6…c27e`,
`s10-win.ps1` `d721da22…b713`.

### Verdict: **PASS-with-notes**

### Checks

| Check | Result |
|---|---|
| Typechecks | `s10 exit 0` · `s9 exit 0` · `typecheck exit 0` |
| `npx vitest run` | `Test Files 132 passed (132)` · `Tests 3236 passed (3236)` = 3233 + 3 |
| `git diff --word-diff b55048d -- docs/e2e-test-plan.md` | exactly two additions, `{+*Granted 2026-10-25 (#221, widened by #222): run once in Run 15 after the other rows (PP1, then RET-1).*+}`, at the end of the RET-1 and PP1 rows; nothing else changed |
| STOP sentence (CR stripped, whitespace normalised) | sheet and runner brief both `06b34a38…07ae` |
| `git status` | no `s9*` file changed (`s9-win.ps1`, `s9-r14.ps1` untouched) |

### The six items

**(1) The pin fix: PASS, with N1 and N2.**
- `Get-S10PinState` only reads (UIA `FindAll`) and polls every 200 ms for up to 5 s. It may call `MoveWindow` once, only
  when the window is narrower than 1000 px, and only inside its monitor's work area. There is no Invoke, click or key
  press; a test asserts this.
- The UIA-only `Set-S9Pin` attempt and the `HUMAN GATE (pinning)` STOP in `B-window` are unchanged, so a button that
  is really missing still STOPs after the bound.
- The override of `Get-S9PinState` is defined only in `s10-win.ps1`. `s9-r14.ps1` dot-sources `s9-win.ps1` directly
  (line 80), so Run 14's scripts run alone with their behaviour unchanged.
- Callers: `B-window` passes the window W it just opened. `Restore-S9Desk` passes `$any[0]` from
  `Test-S9Live`-checked W/O/E. `Set-S9Pin` gets the same handles.

**(2) The new tests fail without the fix: PASS.** I ran three mutants, each restored:

| Mutant | Result |
|---|---|
| P1: `B-window` back to `Get-S9PinState` | `1 failed` ("the PowerShell side mirrors it, B-window and the s9 re-reads use it, and it never clicks") |
| P2: `pinStep` answers "unpinned" at once (the old reader) | `1 failed` ("waits, widens a narrow window once, and says unpinned only after the bound") |
| P3: the override removed | `1 failed` (the mirror test) |

**(3) Handle 1400: not provable from the logs, nothing indicates harm.**
- What survives: only the fixed probe (`pinprobe2.ps1`, loop variable `$wid`) and its output `pinprobe2-fixed.txt`.
  The faulty first run's output was not kept.
- By reading, the faulty run did this: `foreach ($w in 1400, …)` overwrote `$W` (PowerShell variable names ignore
  case), `MoveWindow(1400, …)` was sent, `Count $W` (UIA `FromHandle(1400)`) threw, and the `finally` posted `WM_CLOSE`
  to 1400 through `Close-S9Window`, which checks no identity.
- Why harm is unlikely: an HWND of 1400 (0x578) is far below the values top-level windows get on Windows 11. The fixer
  reports `IsWindow(1400)=False` and that the user's Chrome window was still there (window count 1 afterwards).
- I cannot confirm it independently.

**(4) Part B matches #221 and #222: PASS, with N3.**

| Requirement | Where it is met |
|---|---|
| PP1 read-only, and no write is planned or added (#222 allows hidden writes; none is used) | sheet §7 "Rules", runner brief |
| Login only by `bb-login.ps1`'s one press; a non-zero exit is a STOP, never retried | sheet §7 step 2 |
| `failureReports: false` | sheet §7 |
| REP-0 ran first in the attempt | sheet §7 (block 11) |
| Only sizes, sha256s, counts and exit codes in the record; no course or student data | sheet §7 "Rules", record template |
| The transcript is counted (`value-runs32`) and stays outside the repo | sheet §7 step 5 |
| Clean-up: the leg's exports/`sv` files, and PNGs created in the leg's time window, counted and never opened | sheet §7 step 6 |
| RET-1 runs last, after teardown | sheet §6 "Order" |
| `Test-SafeToKill` | inside `s10-ret1.ps1` |
| Re-run only after a tooling failure before `KILLED …`, on the step agent's order, as a new attempt | sheet §6 "Re-run rule" |
| Chrome not running → STOP, and "Chrome is NOT running" first in the return | sheet §6 step 2 |
| Both legs start with `Test-S10LegState -Phase start` and end with `-Phase end` (the block-list sha256 against the found state) | sheet §6 and §7 |

**(5) `Test-S10LegState`: sound by reading.**
- It opens its own options page through `Open-S9ChromePage` (which accepts only this extension's pages), reads the
  stored state with `Read-S9SafetyState -PassThru`, and calls `Test-S9DaemonSafety` (`s9.ts wait-safety`).
- It requires armed, JavaScript on, count `0`, 0 lines and the empty text's sha256, plus `daemon.status` equal.
  Otherwise it prints a `STOP:` line and returns `$false`.
- It always closes its own window and presses nothing.
- Records: after the teardown, `wait-safety` starts a fresh daemon, which idles out by itself (sheet §6 step 4). The
  helper was not run live.

**(6) Checks:** all pass (table above).

### Notes

- **N1 (MINOR):** `Get-S10PinState` does not check the handle's identity itself before its one `MoveWindow`. Today
  every caller passes a just-opened or `Test-S9Live`-checked wave window, so this is defence in depth.
  **Fix:** `if (-not (Test-S9Live $Hwnd)) { … no move }` before the widen.
- **N2 (NIT):** `Find-S10ActionButtons` searches every descendant, so page content is included (the old reader's
  comment said "outside the page"). A fixture-page button whose name starts with "Chrome Agent Bridge" would read as
  "pinned". The later press then fails and STOPs, which is the safe direction. W shows only fixture pages.
- **N3 (MINOR):** PP1's clean-up deletes any PNG created in `~/.chrome-agent-bridge/failures/` during the leg's time
  window. That folder is shared by every bridge client, so a PNG written by another client (another session of the
  user's) in that window would also be deleted. With `failureReports: false` the expected count is 0.
  **Fix:** delete only when the count is above 0 *and* the file was written by this leg (e.g. its name carries the
  leg's tab handle); otherwise record the count and leave the files.

## Wave fixer 2 check (after Return 2; `S7-wave-fixer2.md`, uncommitted on `e28b609`)

Read-only: no Chrome, no daemon, no 9234, no `claude -p`. Long commands ran in the background with `timeout` bounds. My
only changes were two temporary mutations, each restored from a copy. The sha256 before and after: `s10.ts`
`b2f3f092…214e`, `s10-rules.ts` `ed34fb1f…f5cc7`.

### Verdict: **PASS-with-notes**

### Checks

| Check | Result |
|---|---|
| Typechecks | `s10 exit 0` · `s9 exit 0` · `typecheck exit 0` |
| `npx vitest run` | `Test Files 132 passed (132)` · `Tests 3247 passed (3247)` = 3238 + 9 |
| STOP sentence (CR stripped, whitespace normalised) | sheet and runner brief both `06b34a38…07ae` |
| `git diff e28b609 -- docs/e2e-test-plan.md` | only additions (0 removed words): the dated SW-1R note, a blank line and the SW-1R row |
| Leftover processes (node / claude / python / esbuild) | only `22152 node host-daemon.mjs`, `23208 claude`, `24284 claude`, the three the fixer found before it began; nothing on 9234 |

### The five items

**(1) The `evalValue` audit: PASS.**
- `grep -n '"evaluate"\|\.evaluate(\|evaluateRef\|evaluateToFile\|evaluateSaveStart\|evalValue(' recipes/s10.ts` lists
  every page-evaluate path. Its harness reads all go through `evalValue`: the setup title, `LOG_EXPR`, the field value,
  `CAP_CLICKS`, VISLOG install/read, `pageDigest` and `save-build`. These are now sent as `return (<expr>);`.
- The measured expressions keep their form:
  - `valueExpr` (`return window.__s10v[k]`) only moved to `s10-rules.ts`;
  - the SAVE-REFUSE cases;
  - JSD's `1+1`, `document.body` and `return 'S15'`;
  - JSOFF's raw `evaluate "1+1"` (line 927);
  - the s10check empty expression.
- SAVE-PRIM is still `valueExpr("64m", true)`, the bare `window.__s10v["64m"]` with no `return`, which is what #217
  measures.
- Mutants:

| Mutant | Result |
|---|---|
| E1: `evalValue` sends the raw expression | `1 failed` ("s10.ts evalValue uses it, and nothing else in s10.ts does") |
| E2: SAVE-PRIM's bare form gains `return` | `1 failed` ("SAVE-PRIM's exception (#217) …") |

**(2) `ENABLE_TOOL_SEARCH`: PASS.**
- The fixer's offline evidence is kept in the shared scratchpad's `ts-probe\`.
  - In `control.jsonl` the tool calls are `ToolSearch`, then `mcp__dummy__probe_echo`, and the init lists `ToolSearch`.
  - In `off.jsonl` there is one call, `mcp__dummy__probe_echo`, and no `ToolSearch` in the init.
  - `probe.mjs` deletes the variable for the control run and sets `ENABLE_TOOL_SEARCH=false` only for the "off" run.
  - That supports the claim.
- The change is opt-in: `actorEnv(base, false)` returns `base` itself, so `s9-actor.ts` without `--no-tool-search`
  spawns exactly as before, and Run 13/14 behaviour is unchanged.
- Every Run 15 actor starts through the one `Start-Actor`. It passes `--no-tool-search` and STOPs, after recording the
  actor as running, if the start line lacks `tool search off`. That covers cap, save, fix, big, jsd, off and on. The
  sheet's PP1 command (§7, line 350) also carries the flag.
- No check text changed. In `s10-rules.ts` and `s9-rules.ts` the only removed line is the `SwOutcome` type, which came
  back with a lost space (see N1).

**(3) SW-1R: PASS.**
- I applied the four substitutions to SW-1's row (line 1380): the ID cell, `` `ROW SW-1 `` → `` `ROW SW-1R ``,
  `` `-Block sw1` `` → `` `-Block sw1r` `` and `` `s10.ts sw1` `` → `` `s10.ts sw1 --row SW-1R` ``. The result is
  byte-identical to the SW-1R row (line 1381): `cmp` reported no difference.
- Both thresholds (950 ms and 300 ms) are unchanged.
- SW-1's own row is untouched (`-| SW-1` count 0).
- The amendment says "recorded NOT MEASURED and re-measured as SW-1R".

**(4) The resume: PASS.**
- The state file `%TEMP%\bridge-e2e\s15\r15-globals.clixml`, read only:
  - `attempt=1`;
  - `stopped=sw1: s10.ts sw1 printed a STOP line (exit 2)`;
  - `done=preflight,…,rep0,bbl1,bbl2,mcpf-click,mcpf-type,mcpf-press,cap`;
  - `resume=none`;
  - mark `2026-10-25T09:57:04.349Z`.
- The required skip set is the row blocks done plus the stopped row block: `bbl1,bbl2,mcpf-click,mcpf-type,mcpf-press,
  cap,sw1`. That equals the call in the sheet and the runner brief.
- The record's ROW lines (blocks 8 and 10–18) and the raw output's two `STOP:` lines (both at `sw1`, 10:06:17Z) agree
  with the state file.
- Nothing observed is re-run. MCPF-1 and CAP-1 are skipped, as the step agent ruled. `sw1r` is not in the set, and the
  script refuses it as an extra.

**(5) Checks:** all pass (table above).

### Notes

- **N1 (NIT):** `s10-rules.ts` reformatted `export type SwOutcome ="runs to its bound" | …` (a space lost after `=`).
  It has no effect, but the file is no longer formatted consistently.
- **N2 (record):** the actor start line still prints its MCP config path, a local temp path with no `://`. This is
  unchanged from Run 14 and passes the committed-file scan.
