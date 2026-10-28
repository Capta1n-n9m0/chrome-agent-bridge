# S7-drivers-C verifier: liveC19's row drivers (the file chooser and G2)

Model and effort: Claude Opus 5.5, medium. Role: verifier (agent-rules §6). Read-only; nothing ran against Chrome, a daemon or
port 9234. Raw output: `S7-drivers-C-verifier-evidence.txt` (beside this file).

## 1. Verdict
**FAIL.** There are three MAJOR findings. Three of the five mutant kinds the brief names survive the tests: 11 of my 14
mutants pass every test, and the five MAJOR-1 lists are the ones that show it. The `outside-file-reached-page` STOP can
never fire. A correct build fails R19-CHOOSE-MCP leg (c). The other checks pass: the static coverage test, typecheck,
build, the test counts and the size.

## 2. Outputs (re-derived)
- `npx vitest run recipes/test`: at HEAD `9b14658` there were **63 files and 1553 tests**. I ran it in a scratch
  worktree with its own `npm ci`. Nine tests of `s11-r16-runner.test.ts` failed there; that is the CRLF-worktree gotcha
  in `recipes/CLAUDE.md`, and the same tests pass in the main tree. With the builder's work there are **64 files and
  1589 tests**, all passing. The difference is **+36**, which matches the builder's report.
- `npm test`: **230 files, 5489 tests passed**. `npm run typecheck`: exit 0. `npm run build`: exit 0, printing
  `built extension → dist/`.
- `npx tsc --noEmit -p recipes/<tsconfig.json, .fe, .s6, .s9, .s10, .s11, .s11b>.json`: **all seven exit 0**.
- Size (`wc -l`, counted again):
  - Code: `s12-r19-c.ts` 453 + `s12-r19-c.ps1` 118 + 20 lines added to `s12-r19.ps1` = **591 against the 750 cap**.
  - Tests: `s12-r19-c.test.ts` 320 + 2 changed lines = **322 against the 600 cap**.
  - Within the caps.
- Static coverage: every block in liveC19's order (`s12-r19-lib.ps1:11`) is registered, and so is every row id on the
  §4.27 liveC19 line (checked by `s12-r19-c.test.ts` "every liveC19 block has a driver"; it passes).
- Scratch worktree cleanup:
  - I removed it, but not in the right order at first. My first `cmd //c rmdir` calls failed on Git Bash quoting, and the
    `git worktree remove --force` chained after them ran anyway and failed with "Directory not empty". The five junctions
    it could have followed (`node_modules/@bridge/*`) all pointed inside the worktree itself.
  - I then removed the junctions with `cmd /c rmdir` from PowerShell, confirmed 0 reparse points were left, deleted the
    folder and ran `git worktree prune`.
  - The main tree is unchanged: same `git status`, `node_modules/@bridge` links intact.

## 3. Verifier verdict
This report.

## 4. Deviations
None from the brief.

## 5. Proposed decisions
### 2026-10-28 · A RECORD row prints `ROW <id> RECORD`, not PASS
**Decided:** R19-CHOOSE-FRAME and R19-CHOOSE-HUMAN print `ROW <id> RECORD`, as `Invoke-R19DevtNoflag` does for
R19-DEVT-NOFLAG (`s12-r19-b.ps1:155`). Any FAIL clause inside them (CHOOSE-FRAME's dialog count) prints as FAIL.
**Why:** form `ROW <id> <…|RECORD>`. `Get-R19Verdict` (`s12-r19-lib.ps1:40`) reads RECORD as PASS, so these two rows
currently print `ROW … PASS`, and CHOOSE-FRAME's dialog FAIL never reaches its ROW.
**Instead of:** leaving the rank as it is.
**Revisit if:** the aggregator needs RECORD to rank as PASS.
**By:** Claude (proposed)

## 6. Findings

**MAJOR-1: the tests do not discriminate mutant kinds (1), (2), (3) and (5), and the closer half of (4). This is an exit
check that failed.**
- Where: every row function in `recipes/s12-r19-c.ts:123-437`, and the `-Restore` blocks and `finally` clauses in
  `recipes/s12-r19-c.ps1:68-117`.
- Evidence (`vc-mut.mjs`, each mutant alone, then `vitest run s12-r19-c.test.ts s12-r19-static.test.ts`; all 70 tests pass
  under each of these mutants):

  | Mutant kind | Mutant | Result |
  |---|---|---|
  | (1) | M1a: REFUSE `dis` judged with the `dir` text | 70 passed |
  | (1) | M1b: CHOOSE-3 judged `clicks=0` | 70 passed |
  | (1) | M1c: CHOOSE-2 judged `clicks=1` | 70 passed |
  | (1) | M1d: CHOOSE-JSOFF judged against the DISARMED text | 70 passed |
  | (2) | M2a: CHOOSE-4's `throw new StopWhy` replaced by `say("STOP …")` | 70 passed |
  | (2) | M2b: `Invoke-R19HumanDialog`'s `Stop-R19` replaced by a bare `throw` | 70 passed |
  | (3) | M3a: DISARM's `-Restore` without `Switch-R19Toolbar $true` | 70 passed |
  | (3) | M3b: JSOFF without `-Restore` | 70 passed |
  | (3) | M3c: MCP-d's `finally` without `Restore-R19Js` | 70 passed |
  | (4) | M4a, M4b: the MCP blocks' `finally` without `Close-R19Dialogs` | 70 passed |
  | (5) | M5a: `New-R19ClickStep` acting on `$global:W` instead of `$global:R19Xk` | 70 passed |

- Only M2c (in `Close-R19Dialogs`) and M5b (inside `Invoke-R19HumanDialog`) were killed.
- Cause: the per-row want tables and STOP throws live in the actor functions, which no test runs. The stub
  `Invoke-R19Row` (`s12-r19-c.test.ts:174`) ignores `-Restore` and never runs a step's `f`.
- Suggested fix:
  - Lift each row's wants into exported data (for example `WANTS['R19-CHOOSE-3'] = {answer, clicks, …}`) and pin each
    one to its §4.27 clause.
  - Run the actor functions over a fake `Ctx` (a fake `Tab`/`sig`) so the STOP throws are reached.
  - In the PowerShell stubs, make `Invoke-R19Row` run `$Restore` when a stubbed actor dies after a `do` step, and run
    each step's `f`, so the restore, closer and window-X mutants turn a check red.

**MAJOR-2: the STOP `outside-file-reached-page` can never fire.**
- Where: `recipes/s12-r19-c.ts:42`, `:170`, `:303`.
- `outsideReached` treats "a file whose size differs from `s11-1k.bin`" as outside. But `recipes/s11.ts:426` makes
  `s11-out.bin` 1024 bytes, the same as `s11-1k.bin` (random content, so the digests differ).
- An outside file that reached the page therefore makes the CHOOSE-2 leg FAIL, but the wave does not STOP. That breaks
  §4.27's STOP map and the integrity floor ("a file reaching a page from outside the Upload folders").
- The unit test (`s12-r19-c.test.ts:40`) uses a fictional 512-byte file.
- Suggested fix: open CHOOSE-2's page with `#sum=<sha256 of s11-out.bin>` and STOP when `bytesEqual === true` or when
  `files > 0` after the outside leg. Run that leg on its own page before (b) and (c). Use the same digest test for
  CHOOSE-HUMAN.

**MAJOR-3: R19-CHOOSE-MCP leg (c) fails on a correct build, and its CHOOSE line prints `ok`.**
- Where: `recipes/s12-r19-c.ts:79`, `:332`, `:346`; and `s12-r19-c.test.ts:95`, which pins the wrong rule.
- Chain of facts:
  - `TIMEOUT` is in `ATTACH_CODES` (`sdk/src/error.ts:66-74`).
  - `browser_upload_file` with `tab` runs through `onTab` → `attempt` (`mcp/src/tools/registry.ts:358-359`).
  - The MCP attaches a failure report, and when the screenshot is saved the result carries **no `isError`**: the code is
    on line 1 and `failedLine` is the last line (`registry.ts:332-336`).
  - The scripted MCP actor's environment does not turn reports off (`s12-r19-a.ts:114`).
- So `judgeMcpErr`, which requires `isError`, FAILs. `word()` prints `ok` for a TIMEOUT. The row's expected text ("the
  result line carries `TIMEOUT` and the fixed text") still holds on line 1.
- Suggested fix: accept the failure-report form, i.e. line 1 `TIMEOUT: <CHOOSER_TIMEOUT_MESSAGE>` plus either `isError`
  or `failedLine("TIMEOUT")` as the last line, and take the CHOOSE line's code from line 1. The resulting `shot-line` is
  expected in R19-LOGS (#349).

**MINOR-1: RECORD rows print `ROW … PASS`, and CHOOSE-FRAME's dialog clause is lost.** `s12-r19-c.ts:211-212`, `:304`;
`s12-r19-lib.ps1:40`. See §5.

**MINOR-2: CHOOSE-1's labels are not §4.27's.** The sheet's line is `CHOOSE R19-CHOOSE-1 sdk ok …`; the driver prints
`locator` and `ref` (`s12-r19-c.ts:125`). Either print `sdk` for the first call or get a dated note.

**MINOR-3: CHOOSE-4 never checks each leg's precondition.** Each leg tests the interception "after a success / a
`TIMEOUT` / a refusal after the interception". The driver prints the answer (`ANSWER …`, `s12-r19-c.ts:242`) but does not
check it. Leg c on a build that answers `BAD_PARAMS` before the interception would pass without testing its exit. Make
the leg NOT MEASURED when the answer is not `ok`, `TIMEOUT` and the single-file text respectively.

**MINOR-4: a click that was never sent becomes a product STOP.** `Invoke-R19HumanDialog` discards the result of
`Invoke-S12HumanClick` (`s12-r19-c.ps1:28`). If no click was sent (target not found, wrong foreground, other window at
the point), `after-click=0` becomes the STOP `dialog-not-opened`, blaming the product for a helper failure. Return a
sentinel, and record NOT MEASURED or a `throw-after-state` STOP instead.

**MINOR-5: G2-1 does not check A's answer.** The rule says "A's click `ok` first", but A's reply code is neither printed
nor judged (`s12-r19-c.ts:391-411`). Only the order and `a-effect` are.

**MINOR-6: two silent readings of §4.27, which the builder's §6 should have listed.**
- CHOOSE-JSOFF's "the same through the MCP" happens only in R19-CHOOSE-MCP leg d, not in JSOFF's own ROW.
- CHOOSE-KEPT's "(fresh load each)" is run on one page (`change` goes 1 → 2).
- Both readings keep the measurement, but each needs a ruling.

**MINOR-7: CHOOSE-LATE's `opened` is not read from the page.** It is inferred from files and dialogs
(`s12-r19-c.ts:61`), but the sheet says "the page records `late.opened` itself", and the fixture keeps `__s12ch.late`
(`test-fixtures/s12-chooser.js:62`). Print the page's key.

**MINOR-8: no DIALOGS line exists for liveC19.** Nothing prints form (30) `DIALOGS <slice> …`: 0 sites outside
`s12-forms-c.ts`. The liveC19 line ("R19-LOGS (the dialogs' closure read by `DIALOGS`)") and R19-RESTORE's pass rule
need it. -B deferred it by its brief; the step agent should name its owner before S7-live.

**MINOR-9: G2's B tab may open in the wrong window.** B's tab is opened with `active: true` (`s12-r19-c.ts:385`), and
nothing brings W to the front first (`Invoke-R19G2` has no `s`/`t` step, so `Set-S11Front` does not run). It can land in,
and activate, a window that is not the wave's. Bring W to the front first.

**NIT-1: the JSOFF control line prints a fixed value.** It prints `clicks=0` (`s12-r19-c.ts:319`), which nothing
measured. The pass rule does not use it, so the record should say "not measured".

**NIT-2: CHOOSE-KEPT prints `ERROR` for a failed call.** It should print the code (`s12-r19-c.ts:195`).

**NIT-3: CHOOSE-LATE's 8 000 ms read starts too early.** It starts at the call's start, not at the click
(`s12-r19-c.ts:280-281`).

**Judging the builder's §4.27 wording findings and workarounds** (each keeps what the row measures unless noted):
- **(1) Size 1 000 vs 1 024.** The driver judges against `state.json`, and the digest and size stay the evidence.
  Correct; the sheet needs a dated note (R19-CHOOSE-1 and R19-CHOOSE-MCP).
- **(2) CHOOSE-2 (b) by raw wire call.** Confirmed: the SDK refuses a missing file itself (`sdk/src/upload.ts:87`, a
  different text). The raw call is the only path that reaches the extension's missing-file check on the chooser path,
  which is what the row and its forbidden-fix list target. It keeps the row; it needs a dated note.
- **(3) CHOOSE-4 `change` as the dialog's delta.** This keeps "the dialog was cancelled, no file chosen", since the
  fixture counts change on every input. Correct.
- **(4) JSOFF control's `change`/`clicks`.** The pass rule is unchanged, but `clicks=0` is printed rather than measured
  (NIT-1).
- **(5) One fresh page per CHOOSE-1 call, (6) CLOSERPROBE once.** Both are consistent with the R19-CHOOSE-1 and
  R19-CLOSER rows.
- **Proposal: `dialog=` read after the reply.** Acceptable: a native file dialog is modal and stays open. But it counts
  only dialogs owned by W or X, so a tab that lands in another window is a blind spot (the builder's own first-run risk).

## 7. Handoff
- Nothing running. The scratch worktree is removed and pruned.
- The mutant script `vc-mut.mjs` is in the session scratchpad. A fixer can re-run it with
  `node vc-mut.mjs <worktree> [prefix]`.
- Re-verification after a fix: run M1a–M5a again; each must be killed. Re-check MAJOR-2 and MAJOR-3 against
  `recipes/s11.ts:426` and `mcp/src/tools/registry.ts:332-336`.
