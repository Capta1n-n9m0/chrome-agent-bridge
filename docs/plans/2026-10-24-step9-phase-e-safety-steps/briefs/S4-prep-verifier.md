# S4 prep verifier brief (Step 9, stage S4 — E2E live; prep half)

Repo C:\Users\aliev\Projects\chrome-remote-extention (chrome-agent-bridge). Shell: Git Bash on Windows
(PowerShell 5.1 present). Read CLAUDE.md first; its "Runtime gotchas" bind. HARD RULES: never print the
token; never push; **no Chrome interaction, no extension reload, no `npm run build`, no daemon, no bridge
client, nothing on 9234** (the live wave is a later agent's). You may read and run tests/typecheck; you may
NOT edit any file except your own report. You must NOT spawn agents. Finish in one go. Model: Opus 5.5.
Node: `export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"` first.

Read `docs/plans/2026-10-24-step9-phase-e-safety-steps/briefs/common.md` in full (part of this brief) and the
builder's brief `briefs/S4-prep-builder.md` (what was asked).

## Claims to audit, not facts

The prep builder's report `S4-prep-builder.md` and commits `049a72a` (§4.20 rows in `docs/e2e-test-plan.md`)
and `e91e437` (helpers `recipes/s9*.{ts,ps1,py}`, `recipes/test/s9-rules.test.ts`, `recipes/tsconfig.s9.json`,
`S4-wave-sheet.md`). Base: `3821d0f`.

## Check

1. **S4.1 order**: the rows commit precedes any build/reload (nothing live yet) and contains every SAFE row's
   expected text; `git show --stat 049a72a` touches only the plan.
2. **Rows discriminating**: every row has a pass rule written in advance that a wrong build/behaviour would
   fail; expected text matches the committed code and the rulings AS RULED (#128–#191 in `docs/decisions.md`;
   spot-check ≥ 10 strings against source: `sdk/src/report.ts`, `mcp/src/tools/registry.ts`,
   `extension/src/badge.ts`, `extension/src/options*.ts`, `extension/options.html`, `extension/src/safety*.ts`,
   `daemon/src/`). Merge completeness: every row ID in `stage0-audit.md` §7, every handoff row in `S2a.md` §7,
   `S2b.md` §7, `S3.md` §7 (incl. #162's `Safety:` line as browser_status's second text item from a live
   transcript) and Stage 0's four Chrome-only facts is present or explicitly dropped with a reason. SAFE-0 is a
   true stale check (only the new build can give its answer); the found state is read before any toggle; the
   restore (SAFE-11) compares armed, JS and the sha256 per S4.4. The deviations the builder took (SAFE-0
   without a toggle, 1000 chars, `:8083`, console rule, transcripts outside the repo) — are they sound or do
   they weaken a check? "Not measured" rows: justified, or a dodge?
3. **Helpers safe**: they touch only a window/tab the driver opened (HWND identified by diff; no match on the
   user's windows); UIA matches never by a bare name (toolbar Reload vs card reload); the toolbar button by
   the `Chrome Agent Bridge` prefix; no helper prints or writes the token, a URL from a live read, a title, or
   block-list text (only count + sha256); the token is never read into output; the Token field of the options
   page is never read; the found-text save file (if any) is outside the repo and deleted after the restore;
   kills only via Test-SafeToKill / identified PIDs; nothing binds other than 127.0.0.1; no `chrome://`
   via `--new-window`; PowerShell 5.1 traps (UTF-8, alias `R`, `"` stripping, `>` UTF-16) handled; page code
   as literal strings (no `String(fn)` under tsx); keyboard layout restore sane.
4. **Pre-registered restore**: the wave sheet makes restore + read-back mandatory even after a failure
   mid-wave, and defines STOP + escalate if it fails; pin state restored.
5. Re-run `npx tsc --noEmit -p recipes/tsconfig.s9.json` and `npm test` (expect 2718 / 116; paste tails);
   show the new rules test fails on a mutation of one rule (revert after; you may edit a scratch copy outside
   the repo, or `git stash` your own temporary change and confirm the tree is clean at the end).
6. Product code untouched: `git diff --stat 3821d0f..HEAD -- extension daemon sdk mcp shared` empty.
7. Token / URL / pattern grep by COUNT over the committed files (never print matches).

## Output

Write `docs/plans/2026-10-24-step9-phase-e-safety-steps/S4-prep-verifier.md`: numbered findings (CRITICAL /
MAJOR / MINOR / NIT, `file:line`, evidence = command + output excerpt, suggested fix), then the verdict —
FAIL if any CRITICAL or MAJOR; MINOR/NIT only → PASS-with-notes; else PASS. Do not commit it (the step agent
commits). Return ≤ 15 lines + the path.
