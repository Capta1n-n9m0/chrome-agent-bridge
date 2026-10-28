# S7-drivers-A verifier: liveA19's row drivers

Model and effort: Opus 5.5, medium. Role: verifier (agent-rules §6); read and run only, no edit to the repo. Nothing drove
Chrome, the daemon or port 9234 (only `-Block plan` and stubbed harnesses). Evidence:
`docs/plans/2026-10-27-step12-phase-f-steps/S7-drivers-A-verifier-evidence.txt`.

## 1. Verdict
**FAIL.** Six MAJOR findings. Four are pass-rule clauses that a driver either never judges or judges against the wrong
time or count (M1–M4). One is the exit criterion on mutant-red tests, which is not met (M5). One is the size cap (M6).
The builder's coverage claims hold: every liveA19 row has a driver, no driver prints `no driver built`, the builder's
five mutants turn red, every mutated file parses, and all checks are green.

## 2. Outputs (re-derived)
| Command | Result |
|---|---|
| `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json` | all seven exit 0 |
| `npm run typecheck` / `npm run build` | exit 0 / exit 0, `built extension → dist/` |
| `npx vitest run recipes/test` | 1464 passed, 62 files (HEAD 1433 / 61 per S7-helpers-d: +31, +1 file, nothing removed) |
| `npm test` | 5364 passed, 228 files |
| `powershell -File recipes/s12-r19.ps1 -Block plan` (5.1) | prints the five orders; liveA19's matches §4.27's line |
| Size (`wc -l`, `git diff HEAD --numstat`) | code 530 (`s12-r19-a.ts`) + 102 (`s12-r19-a.ps1`) + 26 (`s12-r19.ps1`) = **658** against a cap of 400; tests 297 + 11 + 1 = **309** against 600 |

The new tests fail without the change. With the `r19-con-3` registration renamed, two static tests go red. With
R19-ARGS-3's `-Restore` removed, one goes red. Without `s12-r19-a.ts`/`.ps1` the test file cannot import or read them.

## 3. Exit criteria
- **Every liveA19 row has a driver: met.** I parsed the ids from §4.27 line 1851 myself: 26 ids, 23 of them new
  drivers plus R19-0, R19-RESTORE and R19-LOGS. All are registered and in `Get-R19Order liveA19`. The static test
  derives the ids from the sheet's line, not from the builder's list.
- **Mutants red: not met (M5).** The builder's five mutants are red. The brief's three classes, aimed at the paths the
  scenarios do not reach, all survive. Each mutated file parses (0 errors), so a red result would not come from a
  parse failure.
- **Forms by key: met.** The `CONREF`, `CONFLOOR`, `BANNERCALL` (34), `BANNERCTL`, `BANNERCON`, `ARGS`/`ARGSREF`, `EFF`,
  `GLOBALS`, `STOPCALL`, `CON`, `CONMCP` and `CONCAP` lines come from the S7-helpers form functions, and I checked the
  keys against §4.27 row by row. Three things also hold:
  - The Banner rule's 20 000 ms holds (`IDLE_MIN_MS_19`, and `$S12IdleMinMs = 20000` is set after the s12-win files).
  - CON-BANNER runs its negative leg first. Its after leg is at least 20 s: `windowed`'s 2 500 ms plus a 20 000 ms sleep.
  - The STOP reasons are the sheet's names (the test checks them against `STOP_REASONS`).
- **The deviations:** see §5.
- **PowerShell 5.1 and the `$o` trap: met, with one latent issue (m6).** The file is ASCII and parses under 5.1. The only
  top-level variable is `$R19DeferRe`, and the locals carry an `r19` prefix.
- **Logging and security: met, with one MAJOR (M4).** No product code is touched (`git diff` lists recipes only). The
  token goes to the MCP child only through the environment. The printed lines hold counts and codes only.

## 4. Findings

**M1 MAJOR: in the refusal rows, three of the sheet's clauses never reach the ROW, and the MCP clause tests the wrong
thing.** `recipes/s12-r19-a.ts:339-347`, `:311-333`.
- **Why the clauses are lost:** the row's verdict comes from `LEG` lines only. `Complete-R19Row` maps `LEG`→`ROW`, and
  `$R19VerdictRe` (`s12-r19-lib.ps1:21`) matches `ROW` lines; the exit code counts only when it is 2. In `refuse()` the
  MCP check prints a `CHECK` and CON-4's read after arming prints an `ANSWER`; neither is a `LEG`.
- **What the MCP check tests:** `mcpText.trim() !== ""`. An MCP tool that returned entries would pass it.
- **What the sheet asks:**
  - R19-CON-3 (and, by "As R19-CON-3", -OWN and -FILE): "the MCP result for the console tool equals
    `browser_snapshot`'s". The driver never calls `browser_snapshot`.
  - R19-CON-JSOFF: "control `browser_evaluate "1"` and `browser_snapshot`", "the console tool's result equals
    `browser_evaluate`'s", "the snapshot answers". The driver makes an SDK `evaluate` the control and calls no snapshot.
  - R19-CON-4: "the read after arming answers `ok`".
- **Fix:** add the MCP `browser_snapshot` and `browser_evaluate` controls. Compare the texts for equality. Print each
  clause as a `LEG`: the MCP clause, CON-JSOFF's snapshot, CON-4's read after arming.

**M2 MAJOR: R19-ARGS-2's `sent` total cannot rise above 2, so the sheet's discrimination is lost.**
`s12-r19-a.ts:183`: `sent += d > 0 && wire ? 1 : 0`.
- A refusal outside the two wire labels never adds to the total, whatever went on the wire.
- The sheet: "`sent` = calls the actor's own wrapper around `client.call` put on the wire"; "a build whose SDK does not
  check sends all 9, so `sent` rises above 2".
- With an SDK that does not check, and an extension that refuses with the same shared texts, the row prints `sent=2` and
  passes.
- **Fix:** `sent += d > 0 ? 1 : 0`. Judge `sent === 2` and require that each wire label sent exactly once.

**M3 MAJOR: R19-CON-FLOOR times the ON press too late, a likely false FAIL.** `s12-r19-a.ps1:18`, `:70`.
- **What is recorded:** the `undo` step writes the `.pressed` time after `Switch-R19Toolbar $true`. That function
  presses, sleeps 700 ms, then reads the title over UIA. So `on` is the real press plus at least 700 ms.
- **How the judge counts:** `floorCounts` counts a tick as "disarmed" when its time is before `on − 500`. A tick logged
  between the real arm and `on − 500` is kept by the product, which is correct, but judged as a disarmed tick in the
  reply. Then `in-reply-disarmed ≥ 1` and the row FAILs.
- **How likely:** the `tick` page logs every 1 000 ms (`test-fixtures/s12-console.js:6`), and that window is at least
  200 ms plus the UIA read wide. So the chance per run is at least about 20%.
- **The sheet's rule:** "between the off title and the **on press**". This is the RD-DISARM lesson in `recipes/CLAUDE.md`
  (#308).
- **Fix:** record the ON time just before `Invoke-S9ActionButton`, and the OFF time after the off title is read.

**M4 MAJOR: CON-MCP writes the human's tab list into `actors-liveA19.jsonl`, and R19-LOGS will then FAIL every pending
row.**
- **Where it happens:** `mcpOpen` appends every tool result whole (`s12-r19-a.ts:97`). The existing-tools probe calls
  `browser_list_tabs` (`:288`), whose text is "title — URL" for every open tab, the human's included
  (`mcp/src/tools/registry.ts:674`).
- **What follows:** `scan-actors` fails on any tool with `other > 0` (`recipes/s12-r19.ts:77`). R19-LOGS then prints FAIL
  for every deferred ARGS/CON row (`s12-r19-lib.ps1:236`). It also leaves the human's tab titles and URLs in a file.
- **Why this needs a ruling:** the tool set is the sheet's choice, and the sheet also expects `other 0`. The two
  conflict, and the driver neither noticed nor raised it. Adding a scanner exemption would be a contract question for
  the session agent.
- **Fix, for the session agent to rule:** call `browser_list_tabs` as the probe but write only a redacted record of it
  (for example the line count and whether the page's handle is present), or have the session agent rule on a narrower
  probe.

**M5 MAJOR: the exit criterion "each driver's decision logic has a test red on a stub" is not met.**
- **What is untested:** the actor bodies (`args1` … `ownFile`, `conFloor`, `refuse`) and the PowerShell step engine:
  the `do`/`s`/`undo` steps, the banner judge, the restores, the toolbar switch, and the IDLE parse.
- **Why:** the scenarios run no `-Steps` and no `-Banner`. My mutants, run over the test file's own stubbed scenarios
  (`mut.mjs` in my scratch dir) and then in place, with the files restored byte-identical and their sha256 hashes
  checked, all survive (evidence):
  - **Wrong line:** IDLE taken from the first match; BANNER-CTL's `--idle` read from the `-neg` id; conRead judging the
    `all` line for every read.
  - **STOP not through `Stop-R19`:** the banner STOP printed by `Say9`; Restore-R19Js's `not-restored` printed by `Say9`.
  - **Restore skipped:** `do` no longer sets `R19Changed`; `undo` does not run its restore; Switch-R19Toolbar does nothing.

  The static test only catches a missing `-Restore` in a registration.
- **Fix:** add stubbed scenarios that run the steps, the banner path and the restores through `Invoke-R19Row`. Move
  each actor's verdict into a pure function and test it (the args2 total, the refusal clauses, the floor times).

**M6 MAJOR (process): size.** Code is 658 lines against a cap of 400 (1.65×). Under §7, code alone over the cap is
DONE-PARTIAL, and the builder reports it so. #360's "Revisit if: a drivers slice reports DONE-PARTIAL" applies. The
session agent decides: accept it as it did for S7-helpers-d, or split.

**m1 MINOR:** the MCP actor is a scripted stdio client, not the "headless MCP actor (tool search off)" of §4.27
(ARGS-1, ARGS-3, CON-MCP, CON-CAP). See §5.

**m2 MINOR:** a throw in the actor of a row with no state change becomes a wave STOP, `throw-after-state`, instead of a
row FAIL. This covers `keys()`, `beat()`, `entriesOf`, the CSP probe and the floor `evaluate`s
(`s12-r19-a.ts:199-202, 212, 222, 253, 431`, and `main`'s catch at `:528`). It errs on the safe side, but one product
error ends the slice. **Fix:** wrap the calls in `att` and print a FAIL `LEG`.

**m3 MINOR:** the actors' IDLE stamp skips `newTab`, `tabs.claim`, `release` and `close` (`:120`, `:450`). The sheet's
one IDLE definition counts "any call other than `snapshot`, `listTabs`, `daemon.status`". In `ownFile` the `claim` comes
right before `idle()`.

**m4 MINOR:** `Invoke-R19Row`'s `-Steps` parameter shadows the runner's `$Steps` (the steps dir) through dynamic scope
for everything a row calls (`s12-r19-a.ps1:33`). It is harmless today, since no in-row helper reads `$Steps`, but it is
the `$o`/`$global:O` trap class. **Fix:** rename it to `-StepList`.

**m5 MINOR:** R19-CON-FRAME's leg b does not judge `sentinel=2` (`:405`). It is also not downgraded when leg a is
NOT DISCRIMINATING; the sheet says leg b "is then recorded without that control".

**m6 MINOR:** `Invoke-R19BannerCtl` and `Invoke-R19ConBanner` discard the actor's exit code (`s12-r19-a.ps1:85`, `:97`).
When the actor crashes it prints `STOP: Error`, and that line gets no `Stop-R19` and no `RETURN` (R7.6). **Fix:** route
`rc == 2` through `Stop-R19Actor`, as `Invoke-R19Row` does.

**m7 MINOR:** R19-ARGS-3's `browser_snapshot` is an SDK `snapshot()` (`:367`).

**NIT:**
- `bannerCtlRow` returns `idleMs >= 0 ? 0 : 0` (`:471`).
- The MCP child's stderr is set to `"pipe"` and never read (`:92`).
- `tsconfig.s11b.json` now covers `s12-*` files. That is useful, since they also pull in `s12-forms*.ts` and
  `s12-r19.ts`, but the name misleads.

## 5. The deviations, judged by §4 precedence
- **MCP actor as a scripted stdio client: MINOR, needs a ruling.** §4.27 is the governing layer and names a headless
  actor with tool search off; the phase doc says nothing. The client calls the same MCP server and reads the same tool
  texts that the pass rules and R19-LOGS judge, and it has no model in the loop, so the deviation changes a step, not a
  pass rule. Under §2 it should be ruled before the run, as a Proposed decision. The builder lists it but proposes none.
- **R19-ARGS-2's effects above 0 as `throw-after-state`: follows the governing layer.** R7.6's list (line 1856) names
  `args-ran-js-off` for ARGS-3 only, and `throw-after-state` "(any slice)" is the catch-all, which #360 adopts for
  throws before a state change. The reason name misleads, so record it as a Proposed decision.
- **The `bc` tab closing right after the positive leg: deviates (MINOR).** R19-BANNER-CTL says "The `bc` tab closes at
  the slice's end", and the sheet governs. The explicit close (`:470`) is redundant anyway: `run()`'s `finally` closes
  every actor tab (`:126`). **Fix:** keep the `bc` tab open until R19-RESTORE (one close block), or get a ruling.
- **`tsconfig.s11b.json`: fine (NIT).** The project's tsconfig exits 0 and the change follows the CLAUDE.md rule that
  recipes get their own tsconfigs. A dedicated `tsconfig.s12.json` would need a root `CLAUDE.md` edit, which only the
  session agent makes.

## 6. Proposed decisions
### 2026-10-28 · liveA19's MCP rows use a scripted stdio MCP client
**Decided:** the "headless MCP actor" of R19-ARGS-1, -ARGS-3, -CON-MCP and -CON-CAP is a scripted
`@modelcontextprotocol/sdk` client of `mcp/dist/index.js`, with no model in the loop. **Why:** the same tool surface,
exact arguments and no ToolSearch noise. **Instead of:** `claude -p` with `ENABLE_TOOL_SEARCH=false`. **Revisit if:** a
row needs a model's tool choice. **By:** Claude (proposed, for the session agent; ruled before the run).

## 7. Handoff
- No processes left running. The repo is unchanged by me; the sha256 hashes match before and after the in-place mutants.
- The fixer needs M1–M5, and should add m2–m6 if within its rounds. M4 and M6 also need a ruling from the session agent.
