# S7-helpers verifier report, round 4 (Step 11b, Run 17b's live helpers): M1 only

Model: Opus 5.5, medium effort. Read and run only. This report is the only file written in the main tree. Chrome, the
daemon and port 9234 were not touched.

**Scope.** Verifier 3's M1, as fixed by fix round 3 (`S7-helpers-fixer3.md`), checked against `docs/e2e-test-plan.md`
§4.25 row R17B-RD-2 (line 1701) and the row's STOP paragraph (line 1686).

**How the mutants were run.** A scratch `git worktree` outside the repo (`<scratchpad>/wt4`), detached at `d68d14c`,
held the stage's 16 recipes files copied in. It ran its own `npm ci`. Its five `node_modules/@bridge/*` junctions
pointed into the worktree itself. They were removed with `cmd /c rmdir` before `git worktree remove --force`.
Afterwards `git worktree list` shows only the main tree, and the main tree's `node_modules/@bridge` (5 entries) and
`.bin` (42) are intact. No `git stash`, `checkout` or `reset` was run in the main tree.

## 1. Verdict

**PASS-with-notes.**
- M1 is fixed. The snapshot clause now reads r2's own row by its handle, so a change to another tab cannot move the
  verdict.
- No outcome gives a false PASS through the judge. Every way the row can be unreadable gives NOT MEASURED.
- The TABROW line prints labels and counts only.
- Every exit check holds.
- Two notes remain, both MINOR or below (§4): the sheet's step "Background tab count noted" no longer has a read, and
  the SDK glue of `rd2-row` is pinned only by strings.

## 2. Exit checks (main tree, re-derived)

| Check | Result |
|---|---|
| `npx vitest run` | **4663 passed, 190 files**, exit 0. Round 3: 4660 / 190. At `d68d14c`: 4560 / 184 (verifier 3's base run; not re-run here). The stage adds 6 test files (184 + 6 = 190) |
| None removed | `s11b-r17b-fix.test.ts` has 24 tests (round 3: 21), so 4660 + 3 = 4663. The worktree's `recipes/test/s11b-r17b` baseline: 6 files, 103 passed |
| `npm run typecheck` / `npm run build` | 0 / 0 |
| `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json` | 0, 0, 0, 0, 0, 0, 0 |
| `git diff HEAD -- docs/e2e-test-plan.md recipes/s11b-r17.ps1 extension daemon shared sdk mcp` | empty (0 lines) |
| Tree after the build | `git status --short`: 25 lines. 6 modified, 10 new recipes, 9 reports (§6). No `dist/` and no other file |
| Token, pattern, real URL | The fix adds none. Its test fixtures use `localhost:8085` and `127.0.0.1:8081` only. The scan also finds `example.org` and `example.test` in the older `-build` and `-hist` tests. Those are reserved test names for negative cases and were not added by this round |

## 3. M1: the fix checked

**Where it lives.** The new code is in three places:
- the rules, `recipes/s11b-r17b-rules.ts:113-142`: `rd2TabRowLine`, `parseTabRowLine` and `judgeRd2Snapshot`;
- the op, `recipes/s11b.ts:851-869` (`rd2-row`), registered at `:1212`;
- the clause, `recipes/s11b.ts:530` (`r17bClause`, kind `rd2-snap`).

The block is `recipes/s11b-r17b.ps1:239-258`.

**Against the sheet.** The sheet judges "`snapshot` K-tab when the row is hidden, else recorded with its class". The
outcomes map as follows:

| r2's own row (read by its handle) | Snapshot | Verdict | Sheet |
|---|---|---|---|
| `hidden=blocked` | K-tab code **and** message | PASS | K-tab when hidden |
| `hidden=blocked` | anything else, incl. `ok` | FAIL | K-tab when hidden |
| not hidden | any code | PASS "recorded (code)" | else recorded with its class |
| `disarmed`, other reason, not found, found twice, no `r2` key, read failed, no TABROW line | any | NOT MEASURED | not stated; conservative |
| readable | no snapshot ROW line | NOT MEASURED | – |

- **Verifier 3's false PASS is gone.** In that case r2 is hidden, the snapshot answers `ok`, and another hidden tab
  leaves during the window. That now gives FAIL. The fix test reproduces it at `s11b-r17b-fix.test.ts:55-61`.
- **The opposite case is right too.** r2 is not hidden and another tab joins the hidden set. That is now recorded,
  not failed, as the sheet asks.
- **Can a not-hidden reading still give a false PASS?** Only if the SDK showed r2's row as not hidden while the
  extension withholds it. The sheet defines "hidden" by that very row, so this is the product's own answer, not a
  skew from the helper.
- **Disarmed is NOT MEASURED.** RD-2 runs armed in G1, and the clause names only `hidden(blocked)`.
- **What an unreadable read does.** `rd2Row` catches both a `handleOf` failure (the Stop is thrown and caught,
  `s11b.ts:84-86, 857-861`) and a failed session. Either way it prints `read=failed` or `handle=none`, which
  `parseTabRowLine` reads as unreadable, so the clause returns NOT MEASURED (`bump(3)` → `$snapC` = 3).
- **A stale `r2` key cannot flatter the row.** `handleOf` reads `$S11_OUT\state.json`, the same file S9 writes
  (`S9_OUT = S11_OUT`, `s11b-r17.ps1:33`). A stale key is used only when `newtab` failed. Then `$ans` already fails
  the row.

**What the line prints.** `TABROW R17B-RD-2 rows=<n> found=yes hidden=blocked|none|disarmed|other`, or `found=no|many`,
`handle=none` or `read=failed`. No handle, URL or title appears. The fix test feeds rows that carry a URL and a title
and checks the exact line (`:68-75`). The rows count is a count over every tab, which the brief allows.

**What else the removed `S9 … tabs` calls carried.** Two calls were removed.
- **The call after the 2 s.** It printed the S9 tab summary ROW. Only the clause used it, and the sheet's expected text
  for `tabs` is r2's own row. TABROW now records that row at the same point, after the 2 s and before `snapshot`.
- **The call before `newtab`.** Fixer 2 had added it. See N-a.

**The judged clauses are unchanged.**
- The `$codes` list (answer, hits, snapshot, RULES, listener) is byte-identical. The test pins it at `:88`.
- The blocked-hit STOP is unchanged.
- The `closeTab` record is unchanged.

**Run 17's paths are unchanged.**
- `git diff HEAD -- recipes/s11b-r17.ps1` is empty.
- `rd2-row`, `--tabrow-from` and `rd2-snap` occur only in `s11b-r17b.ps1:245-250` and `s11b.ts` (grep over `recipes`).
- `r17b-clause` is called only by the R17B blocks.
- The plan (`s11b-r17b-plan.ts`) names no `tabs` step for RD-2.

**Mutation pass.** The script is `<scratchpad>/mut4.mjs` and the log `<scratchpad>/mut4.log`. Each mutant is one exact
replacement, run against `npx vitest run recipes/test/s11b-r17b`, then restored.

| Mutant | Result |
|---|---|
| Rows filtered by "hidden", not by handle (a summary reading) | killed |
| The handle printed in TABROW | killed |
| Unreadable gives PASS | killed |
| `disarmed` parsed as readable | killed |
| Two rows under the handle read as found | killed |
| Hidden accepts any message under the K-tab code | killed |
| No snapshot row passes | killed |
| `parseTabRowLine` ignores the label | killed |
| The block's `rd2-row` call removed | killed |
| `rd2Row` drops the `hidden` field of `client.tabs()` | **survived** (N-b) |
| `rd2Row`'s `handleOf` failure not caught | **survived** (N-b) |
| The clause given the snapshot file as `--tabrow-from` | survived. The result is unreadable, so NOT MEASURED, which is safe |

**Without the fix.** Fixer 2's version is not in git. The proof uses two checks instead:
- `rd2TabRowLine` and `parseTabRowLine` did not exist before, so the test file's import fails.
- A hand-made "any hidden(blocked) tab means hidden" reading fails 4 of the 7 tests in the M1 block, the probe test
  `:55` among them (24 run, 4 failed).

## 4. Findings

### N-a — MINOR — the sheet's step "Background tab count noted" has no read any more
**Where:** `recipes/s11b-r17b.ps1:239-258`; the sheet `docs/e2e-test-plan.md:1701`, column Steps.

**Evidence.** The step list begins "Background tab count noted; the console listener started …". Fixer 2's `tabs`
call before `newtab` (`tabs0.txt`, fixer 2 §N2) was the only read made before `newtab`. Fix round 3 removed it, and the
block now starts with `Start-R17bWatch`. The builder's version had no such read either. The step is not judged and not
named in Expected, so no verdict depends on it and it cannot give a false PASS. The row's record still loses the one
step that has no read.

**Fix.** Add `[void](Call9 'R17B-RD-2' 'tabs0' 'tabs' @() 'record')` before `Start-R17bWatch`. It records only and
feeds no clause. Alternatively, the step agent records "the before count is not taken" as a known gap before the run.

### N-b — NIT — `rd2Row`'s SDK glue is pinned only by strings
**Where:** `recipes/s11b.ts:853-869`; test `recipes/test/s11b-r17b-fix.test.ts:93-100`.

**Evidence.** Two mutants survived:
- **The `hidden` field dropped.** Mapping each row to `{ handle: t.handle }` would make every r2 row read "not
  hidden", so a leaked `ok` snapshot would be "recorded", a silent PASS.
- **The catch removed.** Without it, a missing key would print a STOP instead of an unreadable line.

The code as written is correct: `TabInfo.hidden` is the SDK field (`sdk/src/client.ts:184, 404`). Like
`reportFileTabRows`, it is glue over the SDK, and the static test checks only that `c.tabs()`, `rd2TabRowLine(` and
`catch` appear.

**Fix (optional).** Export a pure mapper, `(tabs) => Rd2TabRow[]`, and test it on a row with `hidden: "blocked"`.
Alternatively, have the live runner check that a TABROW line reads `hidden=blocked` on a known hidden tab.

### N4 (carried, unchanged)
The step agent still records N2's reading before the run (verifier 2's N4, left as briefed). M1's fix makes it moot for
the count. The NOT MEASURED reading of `disarmed` is new and can be recorded with it.

## 5. Handoff

- M1 is closed. N-a is MINOR and N-b is a NIT, so the verdict is PASS-with-notes.
- The step agent either applies N-a's one-line record call or records the gap before the run.
- No processes are left running.
- Scratch files:
  - `C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\d035dea7-b98d-4720-a2c2-977e538a66da\scratchpad\mut4.mjs`
  - `…\scratchpad\mut4.log`
  - `…\scratchpad\v4-{tc,build,rtc,test}.log`

## 6. The stage's changed and new files (`git status --short`, before this report)

```
 M recipes/s11b-rules.ts
 M recipes/s11b-win-rules.ts
 M recipes/s11b-win.ps1
 M recipes/s11b.ts
 M recipes/test/s11b-win-static.test.ts
 M recipes/tsconfig.s11b.json
?? docs/plans/2026-10-26-step11b-block-list-redirects-steps/S7-helpers-builder1.md
?? docs/plans/2026-10-26-step11b-block-list-redirects-steps/S7-helpers-builder2.md
?? docs/plans/2026-10-26-step11b-block-list-redirects-steps/S7-helpers-builder3.md
?? docs/plans/2026-10-26-step11b-block-list-redirects-steps/S7-helpers-fixer.md
?? docs/plans/2026-10-26-step11b-block-list-redirects-steps/S7-helpers-fixer2.md
?? docs/plans/2026-10-26-step11b-block-list-redirects-steps/S7-helpers-fixer3.md
?? docs/plans/2026-10-26-step11b-block-list-redirects-steps/S7-helpers-verifier.md
?? docs/plans/2026-10-26-step11b-block-list-redirects-steps/S7-helpers-verifier2.md
?? docs/plans/2026-10-26-step11b-block-list-redirects-steps/S7-helpers-verifier3.md
?? recipes/s11b-r17b-build.ts
?? recipes/s11b-r17b-plan.ts
?? recipes/s11b-r17b-rules.ts
?? recipes/s11b-r17b.ps1
?? recipes/test/s11b-r17b-build.test.ts
?? recipes/test/s11b-r17b-fix.test.ts
?? recipes/test/s11b-r17b-hist.test.ts
?? recipes/test/s11b-r17b-plan.test.ts
?? recipes/test/s11b-r17b-press.test.ts
?? recipes/test/s11b-r17b-static.test.ts
```
Plus this report: `docs/plans/2026-10-26-step11b-block-list-redirects-steps/S7-helpers-verifier4.md`.
