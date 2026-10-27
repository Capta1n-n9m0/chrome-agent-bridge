# S1-helpers-a re-verifier (after fix round 1)

Model: Opus 5.5, effort medium. Leaf verifier: read and ran only. No main-tree file edited, nothing committed, no agent
spawned, no Chrome, daemon or port touched. Mutations ran only in a scratch worktree (removed). Raw output:
`S1-helpers-a-verifier2-evidence.txt`.

## 1. Verdict

**PASS-with-notes.** F1 (MAJOR) is fixed: the PowerShell guards now run under vitest with stubbed helpers, and every
mutant of the first verifier's list (M5, M10, M11, M15–M18, M20, M21–M23, M26) fails when applied to the real files,
plus five extra mutants of my own. All exit checks pass. Two MINOR and one NIT remain (§4).

## 2. Outputs (re-derived)

| Check | Command | Result |
|---|---|---|
| Recipes tests | main tree, `npx vitest run recipes/test` | `Test Files 49 passed (49)`, `Tests 1090 passed (1090)` (1072 → 1090, +18: s12-ps 17 new, s12-helpers +1) |
| Full suite, run 1 | main tree, `npm test` | exit 0, `Test Files 198 passed (198)`, `Tests 4768 passed (4768)` |
| Full suite, run 2 | same | exit 0, `198 passed`, `4768 passed`. The fixer's 2 failures did not recur. `s12-ps.test.ts` took 18.9 s / 18.5 s for 17 tests, slowest single test 1.65 s against its 60 s spawn and 120 s test timeouts: not flaky in two loaded runs |
| Typecheck | main tree, `tsc -p <pkg>/tsconfig.json --noEmit` for shared, daemon, sdk, mcp, extension | all exit 0. Worktree: `npm run typecheck` exit 0 |
| Recipes tsconfigs | main tree, `npx tsc --noEmit -p recipes/<t>.json` × 7 | tsconfig, .fe, .s6, .s9, .s10, .s11, .s11b: all exit 0 |
| Build | worktree, `npm run build` | exit 0 (`built extension → dist/`); not run in the main tree |
| PS parse / ASCII | `Parser::ParseFile` on `recipes/s12-win.ps1`; `grep -c $'[\x80-\xff]'` | `errors=0`; 0 non-ASCII lines; `file`: ASCII text |
| Lane | `git status --short` | `recipes/s11b.ts` (M), `recipes/s12-rules.ts`, `s12-win.ps1`, `test/s12-helpers.test.ts`, `test/s12-ps.test.ts`, and reports in the steps dir; `journal.md` is the session agent's. HEAD moved to `81b8c49` during this check (S2b and as-built commits, neither touches `recipes/`: `git show --stat`) |

Worktree: `git worktree add --detach` at `e481efe`, the five slice files copied from the main tree (`cmp` identical before
and after the mutants), `npm ci` there. Its five `node_modules/@bridge/*` links pointed inside the worktree and were
removed with `cmd /c rmdir` before `git worktree remove --force`. The main tree's `node_modules/.bin` still holds 42 entries.

## 3. Checks, item by item

**1. Mutants (evidence §Mutants).** A Node runner mutated the real `recipes/s12-win.ps1` / `recipes/s11b.ts` inside the
worktree, ran `s12-ps.test.ts` + `s12-helpers.test.ts` (baseline 34 passed), and restored.
- First verifier's list, all **killed**:
  - M5 (no `throw` in `Assert-S12Tail`) → `idle: every check holds on the real file` red.
  - M10, M11, M15, M16, M17 → the matching group test on the real file red, and the fixer's built-in mutant test red too
    (its "mutated text is in the file" precondition fails).
  - M18 (the neg-leg guard line removed) → `leg` group red.
  - M20 → `devt` group red, plus the static `Close-S12DevTools` regex.
  - M21 (forced `DEBUGGER_DEVTOOLS`), M22 (a `session(` in the neg branch; my variant, not the fixer's text),
    M23 (`return (1);`, my variant), M26 (`bump(0)`) → the `s11bTies(s11b)` real-file test red.
- My own, killed: X1 (idle STOP through `Say9`), X2 (`IdleMs` forced to 15000), X3 (no `Assert-S11Outside`), X4 (Save
  without the free check), X5 (the wait uses 14000), X7 (judge exit inverted).
- **Survived:** X6 (`ANSWER … pos` ignores `violations`) and X8 (the `CHECK bannerctl-pos violations=` line removed). See F-b.

**Audit of "13 mutants are built into the tests".** Valid. `SRC` is the real file read from `recipes/s12-win.ps1`; each
group's first `it` runs the real text and asserts every check true. Each mutant `it` first asserts the real file holds
the text it replaces, then runs `SRC.replace(from, to)` and expects that one check to read false. The real file's
behaviour is asserted directly; the mutants only prove the checks discriminate. `run()` writes the text to a temp copy
because it must be dot-sourced after the stubs; that copy is the real file's content (CRLF normalised), not an embedded
re-implementation. My independent mutation of the file itself confirms it.

**2. F2.** `Invoke-S12BannerLeg` no longer STOPs under 15 000 ms. The `leg` group's `neg5000` case runs the sampler and
leaves `IdleMs=5000` in `$global:S12Leg` with no STOP line. `bannerCtlPass({idleMs: 14_999})` is false, and
`bannerCtlLines` then prints `ROW R18-BANNER-CTL FAIL` (`s12-helpers.test.ts`, R18-BANNER-CTL). The pre-registered rule
holds.

The kept unknown-stamp STOP fires only on a missing or unreadable stamp. `Wait-S12Idle` writes a stamp when it finds none
and waits the full 15 s, so on the documented path (wait, then leg) the neg leg always has a measured idle and never
sees unknown. The STOP can fire only through a runner bug (wait skipped, stamp deleted) and then no number exists to
print. That is consistent with §4.26 ("the helper waits for it and prints the idle it measured") and with the ruling.
No finding.

**3. F6.**
- `CHECK bannerctl-<leg> violations=<n>` fits the existing generic form `CHECK …` (§4.26 "Existing, unchanged") ✓.
- `ANSWER R18-BANNER-CTL pos VIOLATION` and hence `BANNERCTL … leg=pos answer=VIOLATION` put a value outside
  `answer=<ok|CODE>` (`VIOLATION` is not an error code). It changes no pass rule: a non-`ok` answer FAILs the row, which
  is what §4.26's condition "no other bridge call in flight" implies, and it matches `refusalStepJudge`'s existing FAIL on
  `violations > 0` (`s11b.ts:711`). With one call per process it is 0 by construction. Untested: X6, X8. → F-b.
- The PS global `$global:S12Leg` is tested (`the result is left in $global:S12Leg`, mutant F6 red) ✓.

**4. F8.** At HEAD, `extension/src/handlers/evaluate.ts:43–44` sends `wrapExpression(expression)` when `args` is absent.
`wrapExpression` (`evaluate/wrap.ts`) returns `"1"` unchanged, since there is no `return`. `evaluateInPage`
(`debugger.ts:182–190`) runs it as `Runtime.evaluate {expression, replMode: true, awaitPromise: true}`, which gives the
completion value 1. `bannerctl` passes no `args`. So the bare `1` evaluates to 1 ✓, and `s11b.ts` sends
`expression: "1"` ✓.

**5. Others.**
- F3: static ties only, no tsconfig change; M21, M22, M23 and M26 killed ✓.
- F4: `Test-S12Idle` calls `Assert-S12Tail` first; `tail4000` tested; M5 killed ✓.
- F7: `Assert-S12CaptureFree` exists, validates the slice, and is tested (text STOP + throw, other slice free, bad slice
  throws). The raw names `console-liveA18.txt` / `console-liveB18.txt` are checked against §4.26. The prologue call and
  the fresh out folder are handoff text; the prologue STOP now catches a stale file before R18-0 ✓.
- F9: `^http://(127\.0\.0\.1|localhost):8081/`; about:blank and :8084 get no key; M19 and F9 mutants red ✓.
- F10: the no-op `.replace` is gone, both slices' committed and raw names plus `-att2` are checked, and both PS-dependent
  blocks use `skipIf` ✓.
- F11: `devtSlice` / `devtRow` are computed right after `dry`, before `session(`; tied, mutant red ✓.

**6. Regressions.**
- The seven line forms are still compared by key with §4.26 (`each form is in section 4.26 by key`).
- `s12-rules.ts` builds the `CONSOLE`, `BANNERCTL`, `ROW`, `IDLE` and `DEVT` strings exactly as §4.26 writes them.
- Default `devt`: no `--slice` gives no `DEVT` lines, and no `--row` gives `"R17-UP-DEVT"`. The only other change is the
  up-front validation, so the output is unchanged ✓.
- No new print of a URL, path, title or token. The new STOP texts name a window handle or a slice only, and
  `consoleLineCmd` prints the base name.
- Shadowing: grep for `$idle`, `$cap`, `$leg`, `$since` in s9, s11 and s11b-win.ps1 finds none, and no other `.ps1` uses
  `$global:S12*`. The top level still assigns only `$S11SampleTailMs` and `$S12IdleMinMs` ✓.

**7. Counts.** See §2. 1090 and 4768 both re-derived; no drop.

**8. Size.**
- Code: `s12-rules.ts` 52 + `s12-win.ps1` 140 + `s11b.ts` +48/−1 (`git diff --numstat`) = **240**.
- Tests: 165 + 152 = **317**.
- Total **557**: over the 450 cap, under 675 (1.5×). The extra is tests and code alone is ≤ 450, so the §7 allowance
  applies. It must be recorded under Deviations in the stage report. The fixer's 558 counts the deleted line.

## 4. Findings

**F-a — MINOR — the fixer's first `npm test` failures are unexplained.** Location: fixer report §Checks. Evidence: two
runs of mine, `Tests 4768 passed (4768)` both. `s12-ps.test.ts`'s worst test is 1.65 s against a 60 s spawn timeout, so
this slice's PS tests are an unlikely cause. The failure did not recur and its names were not captured, so whether it
came from this slice or from S2a/S2b (committed during my check) cannot be established (agent-rules §3 item 8: a test
firing that is not explained). Suggested: the step agent records it in the ledger as unreproduced, and a future
red run saves its `FAIL` lines.

**F-b — MINOR — `violations` handling is untested, and `VIOLATION` sits outside `answer=<ok|CODE>`.** Location:
`recipes/s11b.ts` bannerctl (`CHECK bannerctl-pos violations=…` and the `ANSWER R18-BANNER-CTL pos …` line, about lines
989–990). Evidence: mutants X6 (`"ok"` regardless of violations) and X8 (the CHECK line removed) leave `34 passed (34)`.
The verdict class is right (FAIL), but the line carries a non-code in the CODE slot of a pre-registered form. Suggested:
keep `answer=<ok|CODE>` as the evaluate's own answer, and judge violations in `bannerctl-judge` (for example a
`--pos-violations` input that FAILs on > 0), or record `VIOLATION` as a named pseudo-code in the sheet's ledger. Add a
static tie for the CHECK line and the violation path. It is reachable only with a second call in the process, which the
code cannot make.

**F-c — NIT — the embedded mutants pin exact text.** Location: `recipes/test/s12-ps.test.ts` MUTANTS. Each asserts its
`from` string is in the real file, so a harmless refactor of a guard's wording turns a test red. This is intentional
and it fails loudly, not silently. Noted only.

Carried, not a finding here: F5 (stamp-writing convention) is handoff-only by ruling. S1-helpers-b must test that its
process wrapper calls `Set-S12AttachStamp`.

## 5. Proposed decisions

None.

## 6. Handoff

- No processes left. The worktree is removed, and the scratchpad keeps only `mut.mjs` and the logs.
- For the committer: the five slice files and the reports (builder, verifier, evidence, fixer, verifier2, verifier2
  evidence).
- The stage report must state the 557-line size under Deviations.
