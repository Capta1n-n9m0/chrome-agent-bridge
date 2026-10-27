# S7-helpers verifier report, round 2 (Step 11b, Run 17b's live helpers)

Model: Opus 5.5, medium effort. Read and run only. This report is the only file written in the main tree. A scratch
`git worktree` (detached at `d68d14c`, the stage's 21 files copied in, its own `npm ci`) held the mutants. Its
`node_modules/@bridge/*` were npm's workspace links into the worktree itself, not junctions to the main tree. They were
removed with `cmd /c rmdir` before `git worktree remove`. Afterwards `git worktree list` shows only the main tree, and
the main tree's `node_modules/@bridge` (5 entries) and `.bin` (42) are intact. There was no live run, and Chrome, the
daemon and port 9234 were not touched. Scope: verifier 1's findings F1–F7, F11(a), F11(d) and F11(f), plus the two new
`s11b.ts` ops.

## 1. Verdict

**PASS-with-notes.** Every exit check holds. F1, F2, F3, F4, F6, F7, F11(a), F11(d) and F11(f) are fixed, and their
new tests fail without the fix (§3). Two MINOR findings remain:
- **N1: F5 is not fixed on the path the runner takes.** The new `msForJudge` branch cannot be reached from
  `R17B r17b-act-ctl`.
- **N2: F2's new snapshot judge assumes something the wave does not give it.** It reads "the row is hidden" from the
  `hidden(blocked)` count, and the wave's own options window keeps that count at 1 or more throughout G1.

Neither can turn a failing row into a PASS. N1 leaves one clause unjudged, as before the fix. N2 can only fail a row
that the sheet would have recorded. The rest are NITs.

## 2. Exit checks (re-derived, main tree)

| Check | Result |
|---|---|
| `npm test` | **4654 passed, 190 files**, exit 0 (round 1 after: 4639 / 189; at `d68d14c`: 4560 / 184) |
| None removed | Per-file counts (vitest JSON): `s11b-r17b-build` 21, `-hist` 23, `-plan` 13, `-press` 11, `-static` 11, all equal to round 1. `-fix` 15 is new. 4560 + 79 + 15 = 4654. The `-plan` edit (line 110) drops one id from a list inside an existing `it`; the test count stays 13 |
| `npm run typecheck` / `npm run build` | exit 0 / exit 0 |
| Recipes tsconfigs `""`, `.fe`, `.s6`, `.s9`, `.s10`, `.s11`, `.s11b` | 0, 0, 0, 0, 0, 0, 0 |
| `git diff HEAD -- docs/e2e-test-plan.md recipes/s11b-r17.ps1 extension daemon shared sdk mcp` | empty |
| Tree after the build | `git status --short`: only the stage's 6 modified files and 15 untracked files (stage files and reports) |
| Token, pattern, real URL | grep of the new and changed files: no token. The only URLs are 127.0.0.1/localhost fixtures |

**The two new ops leave Run 17's paths unchanged.**
- `r17b-clause` and `carried-row` are new `cmds` entries only (`recipes/s11b.ts:524-539`, `:1177-1178`).
- `historyCall` gains `allMs.push` and branches that run only when `isR17bRow(row)`. The RD rows still reach their old
  judges, and Run 17's tests pass unchanged.

**They print no URL, token, list text or rule.**
- `r17b-clause` prints one `CHECK <label> …` line. The label is a fixed string from the runner. The `why` texts are
  fixed words plus an answer code (`s11b-r17b-rules.ts:102-117`). It reads its input files through `outsideRepo` and
  never prints their paths.
- `carried-row` prints `ROW <R17B id> <verdict> (as R17 <ID>; n verdict lines)` and nothing else.

## 3. Mutation pass (scratch worktree; `<scratchpad>/mut2.mjs`, log `mut2.log`)

Method: one exact replacement per mutant, then `npx vitest run recipes/test/s11b`, then the file restored. The
baseline was 28 files and 471 tests, all green. **20 of 25 mutants were killed.**

| Fix | Killed | Survived |
|---|---|---|
| F1 | block reverted to the title grep | counter clause ignored; elements clause ignored (N3) |
| F2 | answer exit code dropped from `$codes`; the `hidden` test ignored | `$snapC` dropped from `$codes`; K-tab compared by code only (N3) |
| F3 | gate-refused branch dropped; the listener read discarded (`[void]`) | `$wc -eq 3` ignored (N3) |
| F4 | `finally` copy off; `STOP: ` left out of the copied set | — |
| F5 | `msForJudge` replaced by `last.ms` in `historyCall`; `msForJudge` returns the last call for ACT-CTL | — (but see N1: the code those tests pin is not on the runner's path) |
| F6 | best verdict instead of worst; no verdict line read as PASS; the carried line not printed after a carried block; R17B-CTL's line not printed; R17B-UP-L1's note dropped | — |
| F7 | the leftover blank tab made a STOP again | — |
| F11(a) | parse errors ignored; counts loosened to `-lt 40` | — |
| F11(d) | old message restored | — |
| F11(f) | NEWTAB-LOAD's `$wc -eq 2` STOP dropped; NEWTAB-REFUSED's dropped | — |

## 4. Findings

### N1 — MINOR — F5 is not fixed on the runner's path: R17B-ACT-CTL still judges only the last reply of each pair
- **Where:** `recipes/s11b-r17b.ps1:222-223`, which reaches `s11b-r17.ps1:248-263` and then `recipes/s11b.ts:764-772`.
- **Evidence:**
  - The block calls `Invoke-R17History 'R17B-ACT-CTL' 'back' 'ac' '' 2 -StopOnFail`. That runs `B17 back --row … --tab
    … --times 2` **without** `--rules-after` (`s11b-r17.ps1:249-251`).
  - So `historyCall` returns at `if (a.opts["rules-after"] === undefined) return;` (`s11b.ts:770`). The new
    `ms: msForJudge(row, allMs)` branch (`:772`) never runs.
  - The verdict comes from the next step, `judge-history --ms <HISTREPLY ms>` (`s11b-r17.ps1:252-255`).
    `HISTREPLY ms` is `last.ms` (`s11b.ts:764`), the second call only.
  - The F5 tests pin `msForJudge` and the presence of the string `ms: msForJudge(row, allMs)` (`s11b-r17b-fix.test.ts:79-89`).
    They do not pin the path the runner takes. The fixer's report says F5 is fixed; it is not on that path.
  - A first `back` or `forward` over 12 000 ms still shows only in its `LAT …-1` line, and the row can print PASS.
    This is the same exposure verifier 1 rated MINOR.
- **Fix:** have `historyCall` print the judged value in `HISTREPLY` for R17B rows (`ms=${Math.round(msForJudge(row,
  allMs))}`). The `start`/`reply` fields R17B-BACK-EMPTY reads are separate and stay as they are. Alternatively, have
  `judge-history` take the `LAT` maximum. Add a test that drives the runner's argument shape (no `--rules-after` on
  `back`, then `judge-history`).

### N2 — MINOR — R17B-RD-2's snapshot clause reads "hidden" from a count that the wave's options window keeps at ≥ 1
- **Where:** `recipes/s11b-r17b-rules.ts:110-117` (`judgeRd2Snapshot`).
- **Evidence:**
  - The judge decides that the row is hidden when the tabs row has `hidden(blocked)=N` with N ≥ 1. That N counts
    every tab in the list (`s9-rules.ts:263`).
  - The extension's own options page is listed hidden as `blocked` (`recipes/CLAUDE.md`, Run 17's helper facts).
    Run 17's F-FILETAB closes window O for exactly that reason (`s11b-r17.ps1:479-481`).
  - G1 opens O through `g1-open` → `Use-S16Options` (`s11b-r17.ps1:515-517`), and nothing closes it before R17B-RD-2.
    So N ≥ 1 even when tab `r2` is not hidden.
  - In that branch the sheet says the snapshot is "recorded with its class". The judge instead requires K-tab, so an
    `ok` snapshot gives `CHECK … FAIL`, and the row prints `ROW R17B-RD-2 FAIL`.
  - The expected branch (r2 hidden, snapshot K-tab) judges correctly, and the judge cannot pass a wrong result. But the
    "else recorded" half of the clause cannot be reached in this runner.
- **Fix:** judge the hidden state of `r2`'s own row. Options:
  - a B17 op over `client.tabs()` keyed by r2's handle, in the style of `judgeFileTabHidden`;
  - the `hidden(blocked)` count after `newtab` minus a count read just before it;
  - closing O before R17B-RD-2, as F-FILETAB does.

  Pin it with a test where the options row is counted.

### N3 — NIT — five survivors in the new tests
- **F1:** `judgeSnapshotPage` requires `elements>0 && counter`. The only failing fixture has both false, so dropping
  either half survives.
- **F2:** the static test checks that `$snapC` appears in the block, not that it is in `$codes`. `judgeRd2Snapshot`'s
  K-tab check is not tested with a right code and a wrong message.
- **F3:** the `$wc -eq 3` arm of the not-reached branch is not pinned.

The code is right in each case. Only the tests are loose. **Fix:** add a mixed fixture (`elements=12 counter=none`), a
`toContain("$snapC, $(if ($global:R17RulesOk)")` check, a K-tab code with a wrong message, and a `$wc -eq 3` string check.

### N4 — NIT — the #311 STOP "newTab opening its URL before its rules are installed" is detected only before G1 (not changed by the fixer)
Removing `blank-left` took away no detector of a *refused install*. No row forces one, and the entry only ever watched
R17B-NEWTAB-REFUSED's `javascript:` refusal, which the adopted F7 decision rules out. The other 18 `STOP-MAP` ids still
match their 18 markers one to one, each with a `Stop9` + `throw` or a `-StopOnFail` return. The static test
(`s11b-r17b-static.test.ts:55-60`) holds both directions.

The first half of the STOP line has a STOP detector only in R17B-0 (f) (`created-url`, before any state change). In G1,
`created-url=other` fails R17B-NEWTAB-PLAIN, as that row's text says, and is only recorded in RD-2 and NEWTAB-LOAD. A
blocked hit is a STOP in RD-2 and NEWTAB-LOAD.

This is the same kind of row-versus-STOP-paragraph ambiguity as F7, and it was already there before this stage.
**Fix:** the step agent records a reading before the run (for example: in G1, `created-url=other` fails the row and the
#311 STOP is carried by the blocked-hit STOPs). Never resolve it by editing the sheet.

### N5 — NIT — R17B-NEWTAB-REFUSED, if Chrome accepted `javascript:`
An `ok` answer would leave tab `nr`. The count check would then print `FAIL (… a blank tab is left)`, which misnames the
cause, and `nr` is never closed (the runner's teardown closes the wave's windows, not single tabs). The verdict (FAIL by
the count rule) matches the sheet. **Fix:** close `nr` when the answer is `ok`, and word the FAIL as "the tab-row count
changed".

## 5. Items that hold (evidence)

- **F1:** `r17b-newtab-plain` judges the page from S9's own `snap` ROW detail (`<T> elements=<n> counter=<…>`,
  `s9.ts:503`) through `B17 r17b-clause --kind snap-page` (`s11b-r17b.ps1:265-267`). The title grep is gone (mutant F1c
  killed).
- **F2:**
  - `$ans`, the `newtab` call's exit code, is the first clause (`:242`, `:254`; mutant F2a killed). A non-`ok` answer
    gives exit 1, so the row prints FAIL, as the sheet's "NOT as pre-written, recorded, row fails" requires.
  - The snapshot clause is present, but see N2.
- **F3:** `s11b-r17b.ps1:299-306` checks in this order:
  - the listener read's exit code is kept, and 2 is a STOP;
  - a count that cannot be read or that moved between its two reads gives NOT MEASURED;
  - a count that changed gives FAIL;
  - `BAD_PARAMS` or `DOMAIN_BLOCKED`, `$wc = 3` (which includes `TABWATCH none` through `noLine`, `s11b.ts:128-131`)
    or no answer row gives NOT MEASURED (path not reached);
  - only then PASS.

  The sheet's branch is met.
- **F4:** on any exit before `$r17b0Done`, the `finally` copies the scratch file's `STOP:`, `ROW`, `BUILD`, `S6 commit=`
  and `MANIFEST` lines to the record through `Write-S9Raw`, after `Set-S17Raw` has pointed `S9_RAW` back at the record
  (`:202-208`). `Stop9` lines are bare `STOP:` lines and match. ROW lines printed by `Say9` (prefix `s9-win: `) are not
  copied, but R17B-0 prints none of its own.
- **F6:**
  - `Invoke-R17bCarried` counts the record's lines, runs Run 17's block, then prints `ROW <R17B id> <worst verdict> (as
    R17 <ID>; …)` from the new lines only (`:120-132`).
  - The verdict pattern accepts both the bare form and the `<ISO> s9-win:` form, and does not count S9 call lines.
  - R17B-CTL's RD-CTL part gets the same line (`:214-216`).
  - A carried block that STOPs throws before the line, so no verdict hides a STOP.
- **F7:** a leftover tab gives `ROW … FAIL`, `S16Fail++`, and the wave continues (`:303`). There is no `blank-left`
  marker or map entry left (mutant F7 killed).
- **F11(a):** `$er.Count -ne 0 -or $R17Funcs -ne 49 -or $R17Blocks.Count -ne 49` STOPs (`:67`).
- **F11(d):** the message is changed (`:172`).
- **F11(f):** both listener reads keep their exit code, and 2 is a STOP (`:288`, `:300`).

## 6. Handoff

N1 and N2 are MINOR. The step agent decides whether a fixer takes them in this round. Their fixes touch
`recipes/s11b.ts` (`historyCall`'s `HISTREPLY` for R17B rows) and `recipes/s11b-r17b-rules.ts` /
`recipes/s11b-r17b.ps1` (RD-2's hidden test), plus tests. N4 needs a recorded reading, not code.

The scratch script and logs are in the session scratchpad: `mut2.mjs`, `mut2.log`, `exits2.log`, `test2.log`. No
processes are left running.
