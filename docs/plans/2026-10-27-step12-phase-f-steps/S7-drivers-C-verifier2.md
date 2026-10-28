# S7-drivers-C verifier, round 2: liveC19's row drivers (the file chooser and G2)

Model and effort: Claude Opus 5.5, medium. Role: verifier (agent-rules §6), re-checking the tree after fixer round 1.
I only read and ran things; I edited nothing in the repo except this file and its evidence. Nothing ran against Chrome, a
daemon or port 9234. Raw output: `S7-drivers-C-verifier2-evidence.txt` (beside this file).

## 1. Verdict
**PASS-with-notes.** All three round-1 MAJORs are fixed. I re-aimed every round-1 mutant (M1a–M1d, M2a, M2b, M3a–M3c, M4a,
M4b, M5a) at the current code, and each one now turns a test red. So do eight extra mutants of mine. The checks on the
main tree all pass. Two findings are left, both MINOR:
- **MINOR-1.** Three mutants that override a row's want at the call site still pass every test.
- **MINOR-2.** The DIALOGS line's `wave-windows-open` count is printed but nothing judges it.

## 2. Outputs (re-derived)
Main tree, read-only commands, run on 2026-10-28:
- `npm run typecheck`: exit 0.
- `npx tsc --noEmit -p` on each of the seven recipe tsconfigs (`recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json`):
  **all exit 0**.
- `npm test`: **230 files, 5506 tests passed**, exit 0. This matches the fixer's count; the builder's was 5489.
- `npm run build`: exit 0, `built extension → dist/`.

Size, from `wc -l` and `git diff --numstat`:
- Code: `s12-r19-c.ts` 501 + `s12-r19-c.ps1` 139, plus 20 lines added to `s12-r19.ps1`, 1 to `-a.ps1` and 1 to `-lib.ps1`.
  That is **662 lines against the 750 cap**. `-b.ts` shows 8/8 changed lines; each one only adds the word `export`.
- Tests: `s12-r19-c.test.ts` 460 + 2 changed lines = **462 against the 600 cap**.

No product code changed: `git diff --stat HEAD -- shared daemon sdk mcp extension test-fixtures docs/e2e-test-plan.md` is
empty.

How I ran the mutants:
- I made a scratch worktree, `wt2`, at HEAD `7b5ff69` in the session scratchpad, ran `npm ci` in it, and copied the nine
  stage files into it from the main tree.
- Baseline there: `s12-r19-c.test.ts` + `s12-r19-static.test.ts` = **87 tests passed**.
- Afterwards I removed the five `node_modules/@bridge/*` junctions with `cmd /c rmdir` from PowerShell and confirmed 0
  reparse points were left. Then `git worktree remove --force` and `git worktree prune`.
- The main tree's `node_modules/@bridge` links are intact. `git worktree list` shows only the main tree.

## 3. Verifier verdict
This report.

## 4. Deviations
**How the PowerShell mutants were judged.** The test file runs 23 mutants of its own, and each one first checks that the
text it mutates is present (`mutate()`, `s12-r19-c.test.ts:358-365`). So any edit to one of those anchor lines fails
the file in `beforeAll` with "the mutated text exists". The file goes red, but not because of the behaviour under test.
- My first run marked M2b, M2c and M3a as "survived". That was an artefact: my script read only the `Tests` line, which
  showed "25 passed | 26 skipped", while the `Test Files` line was failed and the exit code 1.
- To judge the behavioural checks alone, I ran every PowerShell mutant against a copy of the test file with its `MUT`
  list emptied. That copy existed only in `wt2`.
- So each kill recorded below comes from "every check line holds on the real file", not from the anchor guard.

## 5. Proposed decisions
### 2026-10-28 · R19-RESTORE's DIALOGS count leaves out the worker-console capture window
**Decided:** `Get-R19DevToolsCount` (`s12-r19-c.ps1:53`) does not count `$global:D`. The sheet closes the capture
window "last, after the control press and the last segment's save", which is after R19-RESTORE reads its counts.
**Why:** counting it would make every liveC19 run STOP with `devtools-left-open`.
**Instead of:** counting every DevTools window.
**Revisit if:** the capture window is closed before R19-RESTORE.
**By:** Claude (proposed)

## 6. Findings

### Re-check of the round-1 MAJORs

**MAJOR-1 (the tests did not catch the mutant kinds): fixed.** Raw rows are in the evidence file.

| Round-1 mutant | Where it is aimed now | Result |
|---|---|---|
| M1a: REFUSE `dis` judged with the `dir` text | `REFUSE_LEGS` table | killed |
| M1b: CHOOSE-3 `clicks=0` | `WANT.choose3` | killed |
| M1c: CHOOSE-2 `clicks=1` | `WANT.choose2` | killed |
| M1d: JSOFF judged with the DISARMED text | `chooseJsoff` | killed |
| M2a: CHOOSE-4's STOP printed, not thrown | `choose4`'s `stopOnDialog` call | killed |
| M2b: the human step's closer failure becomes a bare `throw` | `Invoke-R19HumanDialog` | killed (P15) |
| M3a: DISARM's restore without the re-arm | DISARM `-Restore` | killed (P19b) |
| M3b: JSOFF without `-Restore` | JSOFF | killed (P19d) |
| M3c: MCP-d's `finally` without `Restore-R19Js` | `Invoke-R19McpD` | killed (P19e) |
| M4a: the MCP legs a–c `finally` without the closer | `Invoke-R19McpLegs` | killed |
| M4b: MCP leg d's `finally` without the closer | `Invoke-R19McpD` | killed |
| M5a: the click step acts on `$global:W` | `New-R19ClickStep` | killed (P8b) |

I added eight more mutants, and all eight were killed:
- M2a2: `stopOnDialog` never throws.
- M2a3: CHOOSE-2's STOP reads leg 1 instead of leg 0.
- M2a4: `outsideReached` ignores `files`.
- M2a5: HUMAN's STOP is dropped.
- M2c: `Close-R19Dialogs`' STOP becomes a bare `throw`.
- M4c: `Invoke-R19Ch`'s `finally` runs no closer.
- M5b: the human click is sent to W inside the step.
- M5c: the closer ignores window X.

**The fixer's own mutants are not vacuous.**
- The stub `Invoke-R19Row` and `Invoke-R19Steps` (`s12-r19-c.test.ts:270-286`) follow the real ones
  (`s12-r19-a.ps1:16-25`, `:37-45`): a `do` step sets `R19Changed`, `undo` clears it, and `-Restore` runs in a
  `finally` only while `R19Changed` is set.
- `Switch-R19Toolbar` is idempotent (`s12-r19-a.ps1:85`). So when a row dies after the open step but before the off
  step, P19b's restore re-arm cannot disarm by mistake.
- My independent runs above reach the same P-checks the fixer cites.

**MAJOR-2 (the outside-file STOP could never fire): fixed.**
- `recipes/s11.ts` still makes `s11-1k.bin` and `s11-out.bin` 1 024 bytes each, and the test pins both
  (`s12-r19-c.test.ts:47-48`).
- `outsideReached` (`s12-r19-c.ts:42`) now fires on any file on the refused page, or on `bytesEqual === true`.
  CHOOSE-2's outside leg runs on its own page, opened with `#sum=<sha256 of s11-out.bin>` (`:194`), and is read with the
  digest wait (`:205`).
- The fixture computes `bytesEqual` from the URL hash on every file input's change (`test-fixtures/s12-chooser.js:13`,
  `:28`, `:37`). So the STOP can now fire on the digest alone, and on the file count too. Mutants M2a3 and M2a4 are red.
- CHOOSE-HUMAN: PowerShell's `Get-R19OutSumFrag` (`s12-r19-c.ps1:47-51`) builds the same fragment from the same outside
  path `fileOf` uses. P21 pins the URL, and `stopWhen(outsideDigestHit(pg), …)` is at `s12-r19-c.ts:344` (M2a5 is red).
- One limit, recorded and not a finding: the reporter keeps the digest of the last changed input only.

**MAJOR-3 (MCP leg (c) failed on a correct build): fixed.**
- `TIMEOUT` is in `ATTACH_CODES` (`sdk/src/error.ts:66-74`).
- With a saved screenshot, `failureReport` returns no `isError`. Its text is the report, then `failedLine(code)`
  (`mcp/src/tools/registry.ts:332-337`).
- The report's head is `${code}: ${oneLine(message, 300)}` (`sdk/src/error.ts:398`). The 129-character
  `CHOOSER_TIMEOUT_MESSAGE` stays whole on line 1, so `text.includes(message)` holds.
- `mcpCodeOf` (`s12-r19-c.ts:94-99`) takes the code from line 1 when the last line's code equals it, and from line 1 of
  an `isError` text. The test builds that exact shape from the registry's real wording (`:119-125`, which pins the
  registry text) and expects PASS and `TIMEOUT`.
- The CHOOSE line prints `word(r)` = `mcpCodeOf(r)` (`:379`), so it prints `TIMEOUT`.
- Leg d's `JS_DISABLED` comes back through `withSafetyRefusals` as an `isError` line `JS_DISABLED: …`
  (`sdk/src/error.ts:124`), which is handled.
- Mutant MJ3 (`mcpCodeOf` requires `isError`) is red.

### Re-check of the round-1 MINORs and NITs (fixer §1)
Each one checked in the code:

| Item | Status |
|---|---|
| MINOR-1 | Fixed: `$global:R19RecordRows` and `Complete-R19Row` (`s12-r19-a.ps1:65`). The test runs the real function: FRAME PASS→RECORD, FAIL stays FAIL. FRAME's `dialog` leg now carries the verdict. |
| MINOR-2 | Fixed: the labels are `sdk` and `ref`. |
| MINOR-3 | Fixed: `chooseLegPrecond` per leg (`:65-69`, `:280`). A dialog left open still STOPs first (`judgeDialog`, `:57`). |
| MINOR-4 | Fixed: `unsent` (`s12-r19-c.ps1:29`), then `parseDlg`, then NOT MEASURED (P14). |
| MINOR-5 | Fixed: `judgeG2` requires `a === "ok"`. |
| MINOR-6 | Rulings still open (step agent). |
| MINOR-7 | Fixed: `late=` is printed from the page. |
| MINOR-8 | Fixed for liveC19 (P16–P18). liveA19/B19 stay unowned (§7). |
| MINOR-9 | Fixed: `Set-S11Front $global:W` (P20). |
| NIT-1, NIT-2 | Fixed. |
| NIT-3 | Fixed: `LATE_WATCH_MS = 9 500`, and the test pins both sides. |

**Builder edits outside the fixer's list.**
- `s12-r19-b.ts`: `export` added to `code`, `ROOT`, `State`, `state`, `fileOf`, `ev`, `timeline` and `withTab`. No body
  changed (`git diff`), so -b behaves as before.
- `s12-r19-static.test.ts`: `s12-r19-c.ps1` added to the two file lists. This widens the ASCII / no-SilentlyContinue and
  unresolved-call checks; it weakens nothing.
- `tsconfig.s11b.json`: the two new files added to `include`, which brings them under typecheck.

### Spec attack (§4.27 rows, the liveC19 line, R19-RESTORE; #356–#362; R7.1–R7.6)
Every block of liveC19's order has a registered driver; the static test passes. The wants and STOPs match their rows:
- CHOOSE-1, LABEL, REFUSE, 2, 3 and JSOFF.
- CHOOSE-4: `dialog-not-opened` and `dialog-left-open`, with three fresh pages.
- DISARM: ≤ 7 000 ms, DISARMED with its `data`, no banner STOP.
- LATE: `dialog=0`, a STOP only when a dialog stays.
- HUMAN and FRAME: RECORD.
- MCP a–e: (e) `existing-tool-changed`.
- G2-1 and G2-2.
- The step order follows the actor's `sig` order (P10).

The STOP reasons are in `STOP_REASONS` (static test). Nothing in the decisions #356–#362 changes a liveC19 pass rule.

**MINOR-1: a want overridden at the call site still passes every test.**
- Where: `s12-r19-c.ts:188`, `:207`, `:214`, and the guard at `s12-r19-c.test.ts:198-207`.
- Evidence (my mutants, full test files, 87 passed under each):
  - M1a2: REFUSE's `want: wantOf("BAD_PARAMS", q === "dis" ? CH_MSG.dir : message)`.
  - M1b2: `judgeChoose(o.obs, { ...WANT.choose3, clicks: 0 })`.
  - M1c2: `{ ...WANT.choose2, clicks: 1, answer: c[3].code }`.
- Why they survive: the "uses its WANT" check looks only for the text `WANT.x` in the body. Its regex
  `/judgeChoose\([^)]*, \{ answer:/` misses a spread followed by another key.
- Same mutant kind as round 1's (1). The round-1 forms are all killed; only this new form survives.
- Suggested fix: pin each call site's second argument exactly, for example
  `expect([...TS.matchAll(/judgeChoose\(([^;]*?)\), legs\)/g)].map(m => m[1]))` against the list of allowed forms. Also pin
  REFUSE's `wantOf("BAD_PARAMS", message)` with `message` coming from `REFUSE_LEGS`.

**MINOR-2: `wave-windows-open` is printed but never judged.**
- Where: `s12-r19-c.ps1:55-62`.
- The sheet's R19-RESTORE pass rule is "`DIALOGS` all 0". `Write-R19Dialogs` STOPs on `native` and on `devtools`, but
  a nonzero `--windows` count (window X or O still open) only prints. R19-RESTORE's ROW does not read the DIALOGS line.
- Suggested fix: STOP `not-restored` (or record FAIL) when that count is above 0.

**NIT-1: the test file's mutants work as a change detector.** Any edit to one of its 23 anchor lines fails the file
with "the mutated text exists", whatever the edit does (§4). It is harmless, but a later fixer should expect it.

## 7. Handoff
- Nothing is running. The worktree is removed and pruned. My mutant scripts (`v2-mut.mjs`, `v2-mut-ps.mjs`) are in the
  session scratchpad only.
- For the step agent before S7-live:
  - MINOR-6's two rulings are still open: JSOFF's MCP leg is MCP leg d, and KEPT runs on one page.
  - The RECORD print form needs a ruling (now implemented).
  - The proposal in §5.
  - Who owns a liveA19/B19 DIALOGS line, if §4.27's R19-RESTORE needs one there.
  - The two MINORs above (an optional fix round).
