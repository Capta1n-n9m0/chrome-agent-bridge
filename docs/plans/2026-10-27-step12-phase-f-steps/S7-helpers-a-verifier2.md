# S7-helpers-a verifier 2 report (after fix round 1)

Model and effort: Opus 5.5, medium. Role: verifier (`docs/agent-rules.md` §6), re-checking only the items fix round 1 touched and
the three risks the brief names. I read and ran things and edited nothing in the repo except this report and
`S7-helpers-a-verifier2-evidence.txt`. Mutants ran on a copy in the session scratchpad (`v2mut/`), which was restored after
the run. No Chrome, no daemon, no port. Every process I started has exited. No commit.

## 1. Verdict
**PASS-with-notes.** Every finding from round 1 is resolved. The three risks hold. All exit checks pass. Two NITs and one
sheet-wording note follow, for the record.

## 2. Exit checks re-run (evidence §1)
| Check | Result |
|---|---|
| `npx vitest run recipes/test` | 55 files, **1242 passed** (fixer: 1242) |
| `npm test` | 221 files, **5142 passed** (fixer: 5142), exit 0 |
| `npm run typecheck` / `npm run build` | exit 0 / exit 0 (`built extension → dist/`) |
| the seven `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json` | all exit 0 |
| `node scripts/doc-check.mjs` | exit 0. No dead-path section and no S12 path in its output |
| `git status --short` | only the slice's files plus the round-1 reports (this report and its evidence file are added) |
| Size (recount) | code 357 = forms 134 + fixtures 200 + s11b-rules 1 (changed line) + s12-rules 2 + ps1 3 + playground 17. Tests 309 = forms test 304 + h8 5. Within 400 + 600 |
| Red first | 44 mutants on the copy, **44 killed** (evidence §2), including both survivors from round 1 (`ordered` strict, `sentinel` = entry count). The old matcher line restored in the test fails the MINOR-1 test. HEAD's `s11b-rules.ts` fails the new UP-OPT wording test |

## 3. Round-1 findings
| Finding | Status | Evidence |
|---|---|---|
| MAJOR-1 | **Resolved.** `createPreflightGuard` is gone. `dedupeIdenticalRows` (`recipes/s12-forms.ts:124-134`) drops only a `ROW` line whose text, minus the ISO time and the `s9-win: ` prefix, repeats; every other line passes. The test's 19 lines are byte-equal to `S1-live-record-liveB18.txt` lines 1-17 and 265-266 (I printed both). As printed they give `WARN row printed twice: RULES`; after the dedupe they give no WARN, n=6, both `STATE` and both `TOGGLE` lines stay, and both `RULES 0` stay. A second `ROW` for the same id with another verdict still warns. Mutants that disable the dedupe, apply it to every line, key it by id, skip the prefix strip, or store the raw line are all killed |
| MINOR-1 | **Resolved.** `recipes/test/s12-forms.test.ts:46` checks a positional `<a\|b>` or `<CODE>` with `altOk`. The round-1 survivor `answer=ok` is now killed, and the new test fails on the old matcher |
| MINOR-2 | **Resolved.** The new test (`:144-150`) has an entry without the sentinel, equal `ts` giving `ordered=yes`, a decrease giving `no`, and `sentinel=0`. Both round-1 survivors are killed |
| MINOR-3 | **Resolved.** `recipes/s11b-rules.ts:816` now reads `O2 did not show the saved text within 5 000 ms (observed <n> ms)`. The condition `o.o2Ms > 5000` and both return paths are unchanged |
| MINOR-4 | **Resolved.** `Verdict` now has seven words, with ranks PASS = RECORD = NOT RUN 0, NM 1, ND 2, FAIL 3, STOP 4 (`:111-112`). NOT RUN keeps its word (`:117`). Four rank and NOT RUN mutants are killed |
| NIT-2 | **Resolved.** `:102`: an after leg under 20 000 ms idle is NOT MEASURED whether it reads `seen` or `none`. A new assertion (`seen`, 19 999 ms) covers it, and both the old rule and a removed rule are killed |

## 4. The three risks
- **(i) The rebuild of `s12-forms.ts`.** Verifier 1 left a copy in the scratchpad (`mut/recipes/s12-forms.ts`) that was byte-equal to the builder's file. A `diff` of that copy against the repo shows only the hunks at 99, 102, 111-112, 114, 117 and 120-134, that is the NIT-2, MINOR-4 and MAJOR-1 regions (evidence §3). Lines 1-98 are identical, so every entry point in the builder's Handoff §7 (1)-(13), plus `dataField`, `forwardedFrom`, `newestEqual`, `FLOOR_MARGIN_MS`, `IDLE_MIN_MS_19`, `hasConsoleClause` and `settleConsoleClauses`, has the same signature and body. `settleConsoleClauses` changes only in its widened type and the NOT RUN rule. Forms (1)-(13) still match §4.27 by key and order: the sheet-parsing tests pass, and all 31 of verifier 1's form mutants are still killed.
- **(ii) `recipes/test/s11b-h8.test.ts`.** The diff adds 5 lines (one new `it`) and removes none. Every existing assertion is untouched, including the `o2Ms` 6061 → fail and 5000 → pass bounds. No verdict moves. No other test or recipe asserts the old wording; it survives only in historical run records under `docs/plans/`, which are not edited.
- **(iii) The corrected Handoff.** The load order (s9-win, s11-win, s11b-win, then s12-win, then `Assert-S12Patched`) matches `S1-helpers-a.md` §7, `S1-helpers-b.md` §7 item 1, and `recipes/s12-win.ps1:2` and `:185-188`. The `dedupeIdenticalRows` → `aggregateRows` call per slice, the unchanged restore print, the seven-verdict `settleConsoleClauses`, the `bannerConVerdict` rule and the `judgeUpOpt` text all match the code.

## 5. Notes (do not block)
- **NIT-A: the dedupe also hides an identical re-print.** `dedupeIdenticalRows` would also hide a real accidental re-print of a row with the same verdict, which `aggregateRows` used to flag. Because the time prefix is stripped, two prints at different times count as one. The verdict cannot move, since the aggregator keeps the worse verdict and the lines are identical, but the diagnostic is lost. This is the form verifier 1 suggested. A narrower choice, deduping only `ROW RULES`, remains open to the runner (S7-helpers-d) if wanted.
- **NIT-B: the fix meets (c)'s goal, not its literal wording.** §4.27 (c) (`docs/e2e-test-plan.md:1808`) says the preflight rows "print once per slice, so the aggregator prints no `WARN`". The fix meets the stated outcome (no WARN), but the record will still show `RULES 0` / `ROW RULES` twice, and two distinct `STATE`/`TOGGLE` lines. That is correct, because they are different measurements. The sheet's "print once" wording is for a later sheet edit; it is not this slice's to change.
- Verifier 1's NIT-1 and wording items W1-W3 were not in the fix's list and stand as recorded.

## 6. Proposed decisions
None.

## 7. Left behind
Nothing runs. Scratch: `v2mut/`, `v2mutate.mjs`, `v2mut-out.txt`, `v2-exit.txt`, `v2-doccheck.txt`, `forms.test.bak` in the session
scratchpad, outside the repo.
