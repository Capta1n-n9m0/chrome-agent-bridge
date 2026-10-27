# S7-helpers verifier report, round 3 (Step 11b, Run 17b's live helpers)

Model: Opus 5.5, medium effort. Read and run only. This report is the only file written in the main tree.

**Scope.** Fix round 2's N1, N2, N3 and N5, checked against `docs/e2e-test-plan.md` §4.25 (R17B-ACT-CTL, R17B-RD-2,
R17B-NEWTAB-REFUSED), plus an attack on N2's new reading. N4 was left alone as briefed.

**How the mutants were run.** A scratch `git worktree` held them. It was detached at `d68d14c` with the stage's
recipes files copied in, and it ran its own `npm ci`. Its `node_modules/@bridge/*` were five junctions that pointed
into the worktree itself, and none pointed at the main tree. They were removed with `cmd /c rmdir` before
`git worktree remove --force`.

**State afterwards.** `git worktree list` shows only the main tree. The main tree's `node_modules/@bridge` (5 entries)
and `.bin` (42) are intact. Chrome, the daemon and port 9234 were not touched.

## 1. Verdict

**PASS-with-notes.**
- Every exit check holds.
- N1, N2 and N5 are fixed on the path the runner takes, and every mutant of their fixes is killed (§3).
- N3's new tests pin the code they name.
- One MINOR finding remains, M1. N2's count-difference reading can give a false PASS of R17B-RD-2's snapshot clause, but
  only in a narrow case. Another tab must leave the hidden set during the 2 s window, while `r2` is hidden and the
  product leaks a snapshot.

## 2. Exit checks (re-derived, main tree)

| Check | Result |
|---|---|
| `npm test` (`vitest run`) | **4660 passed, 190 files**, exit 0. At `d68d14c`: 4560 / 184. At round 2: 4654 / 190 |
| None removed | Per-file counts (verbose run): `s11b-r17b-build` 21, `-fix` **21** (round 2: 15), `-hist` 23, `-plan` 13, `-press` 11, `-static` 11. 4654 + 6 = 4660 |
| `npm run typecheck` / `npm run build` | 0 / 0 |
| `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json` | 0, 0, 0, 0, 0, 0, 0 |
| `git diff HEAD -- docs/e2e-test-plan.md recipes/s11b-r17.ps1 extension daemon shared sdk mcp` | empty |
| Tree after the build | `git status --short`: 23 lines. 6 modified stage files, 6 new stage recipes, 6 new tests and 7 reports. Nothing else |
| Token, pattern, real URL | grep of `s11b-r17b-rules.ts` and `s11b-r17b-fix.test.ts`: no URL outside 127.0.0.1/localhost, no token |

## 3. Mutation pass (scratch worktree; `<scratchpad>/mut3.mjs`, log `mut3.log`)

**Method.** One exact replacement per mutant, then `npx vitest run recipes/test/s11b`, then the file restored. The
baseline in the worktree was 477 passed, exit 0. **All 9 mutants were killed.**

| Fix | Mutant | Result |
|---|---|---|
| N1 | the `historyCall` call site reverted to the old inline `HISTREPLY … ms=${last.ms}` | killed |
| N1 | `histReplyLine` prints `lastMs` instead of `msForJudge` | killed |
| N1 | `reply=` computed from the judged value instead of the last call | killed (BACK-EMPTY's `start`/`reply` are pinned) |
| N2 | the old reading restored: hidden when the after count is 1 or more | killed |
| N2 | the before count ignored (b = 0) | killed |
| N2 | the before `tabs` call removed from `r17b-rd-2` | killed |
| N5 | the close of `nr` removed | killed |
| N5 | the close moved after the FAIL line (the single close, not a copy) | killed |
| N5 | the old wording "the tab-row count changed: a blank tab is left" restored | killed |

**Without the fixes.** Without fix round 2, the N1 test's `histReplyLine` import does not exist. The mutants above show
that each new assertion bites the behaviour itself, not only the symbol name.

## 4. The fixed items (evidence)

### N1 (fixed)
**Path.** The runner's path is `Invoke-R17History` (`s11b-r17.ps1:247-262`, unchanged). It sends `back --times 2` with
no `--rules-after`, matches `HISTREPLY \S+ kind=(\S+) ms=(\d+) …` and passes `ms` to `judge-history`.
`judgeHistoryCmd` (`s11b.ts:1162`) then calls `judgeR17bRow`.

**What changed.** `historyCall` now prints `histReplyLine(row, kind, allMs, last.ms, lastStart)` (`s11b.ts:764`).
- Its `ms` is `msForJudge`, which is `max(allMs)` for R17B-ACT-CTL only (`s11b-r17b-rules.ts:92-95, 129-131`).
- `start` and `reply` are still the last call's, so R17B-BACK-EMPTY's reads are unchanged.

**Other rows are byte-identical.** For every other row (Run 17's RD-* and the other R17B rows) `msForJudge` returns the
last element of `allMs`. Every iteration pushes `last.ms` before the early returns, so that element is `last.ms` and
the line is unchanged.

**What R17B-ACT-CTL now gets.** A 13 000 ms first call gives `ms=13000`, so `judgeR17bRow` returns FAIL "over 12000".
This is the sheet's "each reply under 12 000 ms".

**One narrow case.** A first call that is refused still returns through `strictCall` → `refusedStop` (a STOP) before
`HISTREPLY`, as the sheet's STOP clause requires.

### N2 (fixed as described; see M1)
**The block.** `r17b-rd-2` (`s11b-r17b.ps1:239-262`) takes a `tabs` call before `newtab` (`tabs0.txt`) and one 2 s after
it. It then runs `r17b-clause --kind rd2-snap --tabs-before-from … --tabs-from …`.

**The judge.** `judgeRd2Snapshot` (`s11b-r17b-rules.ts:118-126`) reads "hidden" only when `hidden(blocked)` rose.
- The wave's options window, hidden in both reads, no longer counts.
- The case verifier 2 raised (before 1, after 1, snapshot `ok`) now gives "recorded", which the sheet requires.

**Matches the sheet.** The sheet's own step list begins "Background tab count noted", so the earlier `tabs` call is
consistent with the steps.

### N3 (tests)
- Mixed F1 fixtures cover elements without a counter and a counter without elements.
- The full `$codes = @($ans, …, $snapC, …)` string is checked.
- A K-tab code with a wrong message is not taken for K-tab.
- The `$wc -eq 3` arm of the not-reached branch is checked by regex.

They pin existing code, as the fixer says.

### N5 (fixed)
**The close.** On `$code -eq 'ok'`, `Close-R17Tab 'R17B-NEWTAB-REFUSED' 'nr'` runs (`s11b-r17b.ps1:304`).
- It runs after both counts and the listener read, so the judged count still sees the tab.
- It runs before every return and before the listener STOP.

**The wording.** The FAIL names the cause in either case: "the javascript: URL was accepted …" or "the tab-row count
changed".

**Unchanged.** The verdict logic is the same as before: count moved → NOT MEASURED; count changed → FAIL; gate-refused
or unreadable → NOT MEASURED; else PASS.

## 5. Findings

### M1 — MINOR — N2's count difference is read from a summary of every tab, so a concurrent change elsewhere can skew it, one way to a false PASS
**Where:** `recipes/s11b-r17b-rules.ts:122` (`if (a <= b) return { pass: true, … }`).

**Evidence.** The input is the `tabs` summary line (`s9-rules.ts:263`), which counts all tabs, the human's included.
Between the two reads (newtab plus 2 s), any other tab can enter or leave the hidden set. Two ways for that to happen:
- A human tab navigates onto or off a host on the found list.
- A hidden tab is closed.

A probe through `node --import tsx` gave:
```
b=2 a=1 snap ok {"pass":true,"why":"the r2 row is not hidden; the snapshot is recorded"}
b=2 a=2 snap ok {"pass":true,"why":"the r2 row is not hidden; the snapshot is recorded"}
b=1 a=3 snap ok {"pass":false,"why":"the r2 row is hidden and the snapshot answered ok, not K-tab"}
```

**What the outcomes mean.**
- **False PASS (the case the brief asked about).** Suppose r2 is hidden and its snapshot wrongly answers `ok` (a
  product leak). If another hidden tab leaves the set in the window, a = b and the clause passes as "recorded".
  - `a < b` is impossible from r2 alone, yet it is read as "not hidden" too.
  - No other clause of the row catches this leak. Hits, RULES and the answer do not look at the snapshot.
- **False FAIL.** r2 is not hidden, and another tab joins the hidden set, so a = b + 1 and an `ok` snapshot fails the
  row. That is recorded and is not a false pass.
- **Not reached by the wave's own tabs.** The tabs `hb`, `hf` and `hs` sit on 8081/8091 pages that do not move during
  RD-2. The options window is constant. So only something outside the wave's control can skew the count.

**Likelihood.** It needs a concurrent human or page action in a 2 s window together with a product leak, so it is
unlikely. It is still a path to a false PASS.

**Fix (any one):**
- **(a) Best: judge r2's own row.** Use a `B17` op over `client.tabs()` keyed by r2's handle, in the style of
  `judgeFileTabHidden`, so no count is involved.
- **(b) Cheaper: tighten the count reading.** Treat `a < b`, `a > b + 1`, or a `total=` that did not rise by exactly 1
  as NOT MEASURED. This removes every skew a single concurrent change can cause, except one: a hidden tab navigating
  off the list while r2 is hidden still reads a = b. Add tests for b = 2, a = 1 and for a total that did not rise.

### NIT — N4 (unchanged, as briefed)
The step agent still records the reading before the run (verifier 2, N4).

## 6. Handoff

M1 is MINOR, so the verdict is PASS-with-notes. The step agent decides one of two things:
- fix it with (b), whose tests are small, or (a);
- or record the residual window as a known limit before the run.

**Files in the session scratchpad:**
`C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\d035dea7-b98d-4720-a2c2-977e538a66da\scratchpad\mut3.mjs`,
`…\scratchpad\mut3.log` and `…\scratchpad\n2probe.ts`.

The worktree is removed, and no processes are left running.
