# S4 live verifier brief (Step 9, Run 13)

Repo C:\Users\aliev\Projects\chrome-remote-extention. Git Bash; PowerShell 5.1. Model: Opus 5.5. You are a
FRESH, independent verifier: no Chrome interaction, no build, no daemon, no bridge client, nothing on 9234.
You may read and run greps/tests; you may NOT edit any file except your report. You must NOT spawn agents.
Finish in one go. Never print the token or a block-list pattern; every grep for them is BY COUNT.
Node: `export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"` first.

Read: `CLAUDE.md`; `docs/plans/2026-10-24-step9-phase-e-safety-steps/briefs/common.md` (binds; INTEGRITY
FLOOR, STOP rules, forbidden fixes); the phase doc's S4 exit checks with #141's wording
(`docs/plans/2026-10-24-step9-phase-e-safety.md`, "S4.1"…"S4.4" and their amended notes); `docs/e2e-test-plan.md`
§4.20 as COMMITTED (the pre-written expected text: `git show d101b77:docs/e2e-test-plan.md`, and check by `git log
-p -- docs/e2e-test-plan.md` that §4.20 was not changed after the run started); the wave sheet
`S4-wave-sheet.md`; the runner brief `briefs/S4-runner.md` (the rules the run was held to).

## Claims to audit, not facts

`S4-run-record.md`, `S4-daemon-log.txt`, `S4.ledger.md`, and the runner's uncommitted helper diff
(`git diff -- recipes/`). The runner's summary claims: 39 rows — 26 PASS, 5 FAIL (SAFE-11 start helper misread
then re-read; SAFE-3 options page not updating while its window was in the background; SAFE-POP-1 no
leaseGranted, believed a recipe error; SAFE-4(b) debugging banner still showing 3 s after the press; SAFE-5c
redirect half TIMEOUT, believed the single-threaded redirect server), 3 RECORD, 5 NOT MEASURED; restore read
back equal (armed, JS on, count 0, sha256 of the empty text); a `Restore-S9All` that first reported "RESTORE
FAILED" after a block-4 throw because of a window-count helper bug, and the run continued after fixing it;
throws at blocks 9, 14, 30 with no teardown; five live helper fixes; chrome:/chrome-extension: URLs written as
`:[//]` in the record.

## Check

1. **S4.1** `git log` order: rows commit 049a72a (and the pre-run fixer commits) precede the build/reload in the
   record's timestamps (commit times vs the record's first line).
2. **S4.2** the record's first two recorded lines are the reload script's exit 0 and SAFE-0.
3. **S4.3** row by row: the observed text vs §4.20's pre-written expected text; re-judge each verdict
   independently (PASS/FAIL/NOT MEASURED/RECORD). Flag any verdict that flatters the result, any row re-run to
   pass, any expected text paraphrased, any row missing from the record, any "extra read" used as a pass.
   For each FAIL, say whether the evidence supports "product defect" vs "tooling" — from the code
   (`extension/src`, `daemon/src`, `recipes/`) — without re-running anything live.
4. **S4.4** the start and end reads (armed, evaluate, count, sha256) equal; the sha256 is the empty-text
   hash only if count/lines 0 (check `e3b0c442…b855` is sha256("")); pin state, layout, window count as found.
5. **The "RESTORE FAILED" episode and the throws**: against the runner brief ("a failed restore → STOP, return")
   and the INTEGRITY FLOOR — was the safety state ever changed at that point (block order in the wave sheet)?
   Was continuing a deviation, and how serious? Same for the no-teardown throws at 9/14/30: did any come after a
   state change?
6. **Helper fixes mid-wave**: per the brief, only for rows without an observation yet; read the diff: does any
   fix change what a row checks or its pass rule? Do the helpers still never touch non-driver windows, never
   print the token or list text? Recipes typecheck (`npx tsc --noEmit -p recipes/tsconfig.s9.json`) and
   `npm test` (2720 / 116 expected).
7. **Log/evidence greps by count** over `S4-run-record.md`, `S4-daemon-log.txt`, `S4.ledger.md` and the helper
   diff: the token (read from `bridge.token` inside your command, never echoed), `://` (classify: fixture
   `localhost:808x` vs other — any other is a finding), `localhost:8081` where the rows say 0, `:8083`,
   `bank.example`, and any non-fixture hostname or `chrome-extension://<id>` form. Also check the extension id
   handling and that no user tab title/URL appears. Print counts only.
8. Processes: nothing listening on 9234/8080/8081/8083; no node besides PID 22152 (unrelated).
9. Proposed decisions the record implies (product defects as contract-level for user review).

## Output

Write `docs/plans/2026-10-24-step9-phase-e-safety-steps/S4-live-verifier.md`: the row table (ID, expected
(short), observed (short), runner verdict, your verdict), exit checks S4.1–S4.4 each PASS/FAIL with evidence,
numbered findings (CRITICAL/MAJOR/MINOR/NIT, location, evidence = command + output excerpt, fix), then the
verdict: FAIL if any CRITICAL/MAJOR or an exit check fails (note: failed SAFE rows recorded honestly do NOT
fail the stage by themselves — the STOP rules say a failed row "continues anyway, recorded"); MINOR/NIT only →
PASS-with-notes; else PASS. Do not commit. Return ≤ 15 lines + the path.
