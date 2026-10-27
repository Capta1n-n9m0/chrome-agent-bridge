# S7-helpers fixer report (Step 11b, Run 17b's live helpers)

Sonnet 5.5, medium effort. No live run; Chrome, the daemon and port 9234 were not touched. No commit.

## Result

All ten listed findings fixed; none disputed. Exit checks: `npm test` 4654 passed, 190 files (before 4639 / 189; none
removed; new file `recipes/test/s11b-r17b-fix.test.ts`, 15 tests). `npm run typecheck` 0, `npm run build` 0, the seven recipes
tsconfigs (`.`, `.fe`, `.s6`, `.s9`, `.s10`, `.s11`, `.s11b`) all 0. `git diff HEAD -- docs/e2e-test-plan.md recipes/s11b-r17.ps1
extension daemon shared sdk mcp` is empty. No token, pattern or real URL.

## Fixes

- **F1** `r17b-newtab-plain`: the page clause no longer greps a title S9 never prints. A new op `B17 r17b-clause --kind snap-page`
  reads S9's snapshot ROW line (`elements>0` and a counter other than `none`). Pure judge `judgeSnapshotPage` (rules.ts).
- **F2** `r17b-rd-2`: `$codes` now holds the `newtab` call's exit code (`$ans`) and the snapshot clause (`B17 r17b-clause --kind
  rd2-snap`, pure `judgeRd2Snapshot`: K-tab when `hidden(blocked)>=1` in the tabs row, else recorded). Clause list pinned by a static test.
- **F3** `r17b-newtab-refused`: the listener read's exit code is kept (`$wc`; 3 when no console). Answer code `BAD_PARAMS` or
  `DOMAIN_BLOCKED`, `$wc` = 3 or no answer row prints `ROW ... NOT MEASURED (path not reached ...)`, never PASS.
- **F4** `r17b-0`: the `finally` copies `STOP: `, `ROW `, `BUILD `, `S6 commit=`, `MANIFEST ` lines of the scratch file to the record
  (`Write-S9Raw`, profile path redacted) when the block did not finish.
- **F5** `historyCall` (s11b.ts): every call's reply time is collected; `msForJudge` gives R17B-ACT-CTL the largest of the pair
  (other rows keep the last call).
- **F6** `Invoke-R17bCarried` records the record's line count, runs the Run 17 block, then calls new op `B17 carried-row`, which
  prints `ROW <R17B id> <worst verdict> (as R17 <ID>; n verdict lines)` from the block's new record lines (`carriedRowLine`; RECORD
  counts as a pass; no verdict line gives NOT MEASURED). R17B-UP-L1's line adds that its console clause is judged by R17B-LOGS' SCAN.
  The RD-CTL part of R17B-CTL gets the same line (`ROW R17B-CTL <verdict> ...`) beside the existing `ROW R17B-CTL 8087 ...`.
  `s11b-r17.ps1` is not edited.
- **F7** per the adopted decision: a leftover blank tab prints `ROW R17B-NEWTAB-REFUSED FAIL ...`, `S16Fail++`, the wave continues.
  The `blank-left` STOP-MAP entry (plan.ts) and its marker are removed; `s11b-r17b-plan.test.ts` line 110 no longer lists `blank-left`
  (an expectation edited, no test removed).
- **F11(a)** the runner stops unless Run 17's file parses with 0 errors and gives exactly 49 functions and 49 blocks (re-measured
  0 / 49 / 49 with the runner's own counting).
- **F11(d)** message now "the manifest read did not return 0 (console unavailable, a failed check or a STOP)".
- **F11(f)** NEWTAB-LOAD and NEWTAB-REFUSED keep the listener read's exit code; 2 is a STOP.

## Files

`recipes/s11b-r17b.ps1`, `recipes/s11b-r17b-rules.ts` (additions), `recipes/s11b-r17b-plan.ts` (one STOP_MAP line out),
`recipes/s11b.ts` (additive: import, `allMs`, ops `r17b-clause` and `carried-row`), `recipes/test/s11b-r17b-fix.test.ts` (new),
`recipes/test/s11b-r17b-plan.test.ts` (one list entry). Smoke-run offline: `carried-row` and `r17b-clause` print the expected lines.

## Notes

- The new tests assert strings and judges that did not exist before, so they fail on the pre-fix code; I did not run a separate mutation pass.
- The `ROW R17B-CTL <verdict>` line (RD-CTL part) and `ROW R17B-CTL 8087 ...` are two lines; a recorder combines them as the sheet's pass rule says.
