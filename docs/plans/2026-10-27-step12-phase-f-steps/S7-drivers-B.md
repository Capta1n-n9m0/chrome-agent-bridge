# S7-drivers-B: liveB19's row drivers (step report; step agent Opus 5.5, medium)

## 1. Verdict
**DONE.** Every block of liveB19's order (`recipes/s12-r19-lib.ps1:10`, checked against §4.27's liveB19 line) has a registered `$global:R19Blocks[...]` driver, `devprobe` included, and a static test proves it. The verifier's final verdict is **PASS-with-notes** after one fix round. Size: 542 code lines (cap 750) and 611 test lines (cap 600; 11 over, the extra is tests, within agent-rules §7's 1.5× allowance — §4). Nothing drove Chrome, the daemon or port 9234.

## 2. Outputs
- New: `recipes/s12-r19-b.ts` (actors and pure judges), `recipes/s12-r19-b.ps1` (the drivers, `Invoke-R19DevRow`, SWEEP-HELD's two actor phases with the reload, `Save-R19Seg`/`Open-R19Seg` and the R19-0 re-run at block level), `recipes/test/s12-r19-b.test.ts`.
- Edited: `recipes/s12-r19.ps1` (dot-source -b, the liveB19 registrations), `recipes/s12-r19-a.ps1` / `-a.ts` (MINOR-A; `Invoke-R19Row -Actor/-BudgetS`; the `carried` and `record` banner kinds; exports), `recipes/s12-r19-lib.ps1` (N-2, N-5; `Close-R19Bc` in liveB19 too), `recipes/s12-r19.ts` (N-3), `recipes/tsconfig.s11b.json`, `recipes/test/s12-r19-a.test.ts`, `recipes/test/s12-r19-static.test.ts`.
- Counts (verifier2's runs): `npx vitest run recipes/test` 1484 passed / 62 files before (HEAD, re-derived by verifier1 in a scratch worktree; the 9 known worktree-CRLF failures aside) → **1553 / 63** after. `npm test` 5453 passed, 229 files. `npm run typecheck`, `npm run build` and all 7 `npx tsc --noEmit -p recipes/tsconfig*.json` exit 0.
- Mutants: verifier1's 16 cases (S0, M1–M15; including a clause from the wrong line, a STOP not via `Stop-R19`, skipped restores, a DevTools judgment not from the control's code, SWEEP-HELD without its capture segments, and two liveA19 hooks) are all red after the fix; verifier2's 14 new ones: 11 red, 3 survive (N-1 below). liveA19's tests are green and its own mutants still red.
- Commit: §7.

## 3. Verifier verdict
- Round 1, `S7-drivers-B-verifier.md` (Opus, medium): **FAIL**. F1 carried banner rows could STOP `attach-on-refused-page`; F2 SWEEP-HELD read the reopened capture window as DevTools open (STOP on every attached run); F3 SWEEP-HELD nested node runs sharing one output file; F4 KEEP-OVERLAP leg a never overlapped; F5 KEEP-4/DEVT-NOFLAG words from the wrong call; F6 ten required mutants survived; MINORs F7–F10, NIT F11.
- My rulings for the fix: F1 — carried rows FAIL, never STOP (§4.27 STOP map, line ~1856, omits them; phase doc § STOP rules "Continues anyway, recorded", line ~444). F3 — two actor runs, the reload at block level, no edit to `Invoke-R17Node` or shared scripts.
- Fix round 1, `S7-drivers-B-fixer.md` (Sonnet, medium): F1–F11 fixed, none disputed.
- Round 2, `S7-drivers-B-verifier2.md` (Opus, medium): **PASS-with-notes**. Carried, unfixed:
  - **N-1 (MINOR):** three actor call sites in `s12-r19-b.ts` no test drives; the code is correct as written: `overlapA` concurrency (line ~301), `p.attached` into `judgeKeep4` (~138), `SWEEPPRE attached=` (~150). Fix: three source checks like the KEEPDT one.
  - **N-2 (NIT):** `SWEEPPRE attached=<yes|no>` and `KEEPDT … next=not-run` are outside §4.27's forms.
  - SWEEP-HELD's `devtools-open` for a DevTools window is "X's DevTools window still alive", not a UIA read (§5).
- Fix rounds used: 1 of 3.

## 4. Deviations
- **Tests 611 against 600.** One coherent slice; the extra is tests (agent-rules §7).
- **Tests written after the code** (builder). Red-on-stub re-proved by verifier1 (all pure judges constant: 6 red) and after the fix (9 red).
- **Hooks in S7-drivers-A's files:** `Invoke-R19Row -Actor/-BudgetS`, a `t` step, `Invoke-R19StepB` for new step kinds, the `carried`/`record` banner kinds, 12 new exports. liveA19 lines unchanged (verifier2 checked kind, label, IDLE read, budget).
- S7-helpers-d's N-4 (the swap's catch path) does not bind liveB19 (no swap); left for -DE. N-2, N-3 (SWEEP-HELD's re-run asks only `args=answered`), N-5 fixed with tests.

## 5. Proposed decisions (for the session agent)
### 2026-10-28 · The carried banner rows FAIL, never STOP
**Decided:** R19-UP-6 and R19-F-RAW, -2, -DIR judge their banner as `carried`: `seen` with IDLE ≥ 20 000 and a passing R19-BANNER-CTL is FAIL with the counts; `none` under both is PASS; else NOT MEASURED; a leg that sent no call is recorded. **Why:** §4.27's STOP map does not give these rows `attach-on-refused-page`, and the phase doc lets a carried row failing with a passing control continue, recorded. Run 18 read `seen` on 5 of 5 legs, so a STOP would likely end liveB19 before its KEEP and DevTools rows. **Instead of:** the builder's reading (W5) that the Banner rule's STOP covers every refused call. **Revisit if:** the sheet adds them to the STOP map. **By:** Claude (step agent's ruling)

### 2026-10-28 · KEEP-3's nav legs navigate by a wave window's omnibox
As `S7-drivers-B-builder.md` §5: nav-blocked, nav-own, nav-file type the target into window X's omnibox (`Set-S9Omnibox`; `Set-S11bOmnibox` for `file:`), since a bridge `navigate` refuses the event itself and §4.27 names no mechanism. Verifier1 found it sound. **By:** Claude (proposed; for the session agent)

### 2026-10-28 · SWEEP-HELD runs as two actor runs around the reload
Actor 1 sets up DevTools on X and exits; at block level `Save-R19Seg`, the reload, `Open-R19Seg`, the R19-0 re-run (`LOADED rerun=<k>` only); actor 2 re-claims and judges. **Why:** `Invoke-R17Node` has one output file and pid slot; a nested run corrupts the actor's record (verifier1 measured it on PS 5.1). **Instead of:** per-call output files in a shared script (outside the lane). **By:** Claude (step agent's ruling)

### 2026-10-28 · SWEEP-HELD's "DevTools still open" reads X's DevTools window as alive
`devtools-open` for an undocked DevTools window is `Test-S9Live` on X's DevTools handle (a docked pane by UIA). It catches a sweep that closes DevTools, not one that leaves it open but detached; the `after-reload` code still carries that case. **Revisit if:** the session agent wants a UIA read of the window's content. **By:** Claude (proposed; for the session agent)

## 6. Findings
- §4.27 wording problems (none edited): KEEP-3's "the tab navigated" has no mechanism (W1); `DEVNOFLAG probe=` lacks a word for another code (W3, the driver prints `other`); KEEP-2's `since-last-call-ms=0` is fixed text (W4); UP-6's `calls-sent=0` is a token, not a line form (printed `CALLS <id> calls-sent=<n>`); KEEP-4's "within 1 s" cannot hold with the menu method (~3.6 s; the leg still discriminates); W6, UP-DEVT's page URL carries an extra `s12x` key the reporter must ignore; N-2's two extra lines.
- No new runtime fact; nothing ran live. First-run risks: inline timeline events (toolbar press, options edit, omnibox) pause the sampler and can overstate `end-ms` in KEEP-3's disarm and block legs; `Test-S12DevToolsUi` assumes no other Chrome window opens during the menu; KEEP-1's trusted click needs the screen; the new actor commands `sweep-held --phase 1|2` and `banner --kind carried` have never run live.

## 7. Handoff
- Nothing running. Verifier1's scratch worktree is unregistered; it left a part-deleted folder with dangling `@bridge` junctions at the scratchpad's `wtv` (outside the repo, not deleted recursively, per the root CLAUDE.md gotcha). Main `node_modules` intact (verifier1).
- `docs/plans/2026-10-27-step12-phase-f-steps/journal.md` was modified by another writer during this slice; it is not in this slice's commit.
- Commit: `test(e2e): S7-drivers-B — liveB19's row drivers (verifier: PASS-with-notes)`, by a Sonnet committer; the hash is in the step agent's return.
- For -C and -DE: `Invoke-R19Row -Actor/-BudgetS`, `Invoke-R19DevRow`, the `t`/`val` steps in `Invoke-R19StepB`, `findTab`, and the `carried` banner kind are reusable. N-4 still binds -DE. N-1's three source checks can ride in the next slice.
- Before S7-live, the session agent rules on: the four proposals above and the §6 wording findings.
- Needs the user's keyboard: nothing.
- READ lists: as the step brief; the verifiers also read the builder and fixer reports as claims to audit.
