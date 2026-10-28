# S7-helpers-e verifier report

Model: Claude Opus 5.5, medium effort. Read and run only; the main tree was not edited (this report and its evidence file
are the only files written). Nothing ran live: no Chrome, no daemon, no port 9234. Raw output:
`S7-helpers-e-verifier-evidence.txt` (beside this file).

## 1. Verdict
**PASS-with-notes.** All three items meet #363 and the §4.27 note. 29 of my 32 mutants were killed. Three survived: one
NIT (U13) and two override forms that the item 3 pin does not reach (M1d, M1f; MINOR-1). There is no CRITICAL or MAJOR finding.

## 2. Outputs (re-derived from the current tree, 2026-10-29)
- `npm test` (main tree): `Test Files 231 passed (231)`, `Tests 5519 passed (5519)`. This matches the builder's count
  (5506 → 5519, +13).
- `npm run typecheck`: exit 0. `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json`: all seven exit 0.
- Size (`git diff --numstat HEAD -- recipes`, `wc -l`): code is `s12-win.ps1` +12/−2, plus one changed line each in `s12-r19-b.ps1`,
  `s12-r19.ps1` and `s12-r19-lib.ps1`, so about 15 code lines (cap 150). Tests are the new 121-line file, `s12-r19-c.test.ts` +8/−1 and
  `s12-r19-static.test.ts` +2/−1, so about 131 test lines (cap 300). Both are within their caps.
- Red without the change: I worked in a scratch worktree at HEAD with the stage diff and its own `npm ci`. There I reverse-applied only the
  `.ps1` part of the diff and kept the tests. Result: `Tests 7 failed | 93 passed (100)`. The failures were the four UP-OPT tests, the
  R19-RESTORE call test, the static "every command exists" test and the line-455 pin. The item 3 test is source-text only, so it passes on
  the old code; its proof is the mutants below.
- Item 3's killer is the new test. With HEAD's `s12-r19-c.test.ts` put back, M1a2, M1b2 and M1c2 each failed only the line-455 pin. That
  pin fails on the new lib text whatever the mutant is, so the three survive the old tests, as verifier 2 reported.
- Scratch worktree: created in the session scratchpad and later unregistered with `git worktree remove --force` + `git worktree prune`.
  The removal left the folder half-deleted, because its `node_modules/@bridge/*` workspace junctions remained. Those junctions pointed only
  inside the worktree. I deleted each one with a non-recursive `[IO.Directory]::Delete`, checked that 0 reparse points were left, and only
  then removed the folder. `git worktree list` now shows only the main tree. I did not touch `wtv`.

### Mutant table
Each mutant was run against `s12-helpers-e`, `s12-r19-c`, `s12-r19-static`, `s12-helpers-b` and `s12-r18-static` (133 tests).

| # | Mutant | Result |
|---|---|---|
| U1 | no foreground after the save | killed (3 failed) |
| U2 | no foreground before the conflict read | killed (2) |
| U3 | foreground moved before the save (new pair on `$setSha = Set-S11Box …`) | killed (2) |
| U4 | `$o2T0` taken after the foreground | killed (1) |
| U5 | `$o2T0` not passed to `Wait-S12O2` | killed (1) |
| U5b | `Wait-S12O2` ignores `-T0` | killed (1) |
| U6 | FIX line missing | killed (1) |
| U7 | FIX line printed twice | killed (1) |
| U8a | foreground leaks into `Invoke-S12Opt` (the S12 pairs) | killed (6) |
| U8b | foreground leaks through `Wait-S12O2` | killed (6) |
| U8c | foreground leaks into `Invoke-S11Opt` (`s11-win.ps1`) | killed (7) |
| U8d | FIX line leaks into `Invoke-S12Opt` | killed (2) |
| U9 | source moved: the conflict anchor in `Invoke-S11Opt` changed | killed (15: the load throws) |
| U9b | a pair that matches more than once | killed (15: "did not match exactly once") |
| U10 | `s12-r19-b.ps1` calls `Invoke-S12Opt` again | killed (1) |
| U11 | run-start guard for `Invoke-S19Opt` dropped | killed (1) |
| U12 | `OPT O2 front` line dropped | killed (1) |
| U13 | front line passes `$o2Fg $o2Fg` (the conflict-read result is lost) | **survived** (NIT-1) |
| U14 | after-save foreground result inverted | killed (1) |
| D1 | liveA19 dropped from the R19-RESTORE `-in` list | killed (2) |
| D2 | liveB19 dropped | killed (2) |
| D3 | a STOP added on `wave-windows-open > 0` | killed (4) |
| D4 | capture window `$global:D` counted in `devtools` | killed (6) |
| D5 | native > 0 no longer a STOP | killed (3) |
| D6 | devtools > 0 no longer a STOP | killed (2; that run showed 26 skipped, see §6) |
| D7 | STOP before the line is printed | killed (3) |
| M1a2 | REFUSE `want: wantOf("BAD_PARAMS", q === "dis" ? CH_MSG.dir : message)` | killed (1) |
| M1b2 | `judgeChoose(o.obs, { ...WANT.choose3, clicks: 0 })` | killed (1) |
| M1c2 | `{ ...WANT.choose2, clicks: 1, answer: c[3].code }` | killed (1) |
| M1d | `want: { ...wantOf("TIMEOUT", CH_MSG.timeout), message: CH_MSG.missing }` | **survived** (MINOR-1) |
| M1e | `judgeChoose({ ...o.obs, clicks: … }, WANT.choose3)` | killed (1) |
| M1f | `Object.assign(WANT.choose3, { clicks: 0 })` just before the call | **survived** (MINOR-1) |

## 3. Verifier verdict
Not applicable (this is the verifier).

## 4. Deviations
- The brief asks for an "own `npm ci`, removed with `git worktree remove` + `git worktree prune`". `git worktree remove --force` alone
  could not delete the folder: npm's workspace junctions stopped it ("Directory not empty"). I first checked that every junction pointed
  inside the worktree, then removed the links one by one before the recursive delete. No path outside the scratchpad was touched. The main
  tree's `git status` and `git diff --stat` were unchanged before and after.

## 5. Proposed decisions
### 2026-10-29 · The `OPT O2 front` line is recorded in §4.27 or renamed
**Decided:** The session agent either adds `OPT O2 front after-save=<yes|no> before-conflict-read=<yes|no>` to the §4.27 dated note as a
record line of R19-UP-OPT (never judged), or has it renamed so that it does not share the `OPT O2 ` prefix with the form-(6) line.
**Why:** The investigator asked for O2's foreground to be recorded (§5), but the sheet names no such line, and §4.27 says code and spec
never diverge silently. **Instead of:** leaving an unlisted line beside a judged form. **Revisit if:** an aggregator ever parses
`OPT O2` lines. **By:** Claude (proposed)

## 6. Findings
**MINOR-1. Item 3's pin covers the arguments of `judgeChoose(` and `wantOf(`, not the expression around them.**
- Where: `recipes/test/s12-r19-c.test.ts:209-214`; the call sites are `recipes/s12-r19-c.ts:187`, `:213` and `:214`.
- Evidence: M1d wraps `wantOf(...)` in a spread followed by an override key (`want: { ...wantOf("TIMEOUT", CH_MSG.timeout), message: … }`),
  and M1f mutates the shared `WANT.choose3` just before the call. Both run to `Tests 133 passed (133)`.
- M1a2, M1b2 and M1c2 (the brief's three) are all killed, so the brief's exit check holds. M1d is the same kind of mutant as verifier 2's
  (an override at the call site) in a form one level out; M1f is an in-place mutation, which is less likely to be written by accident.
- Suggested fix: pin each `want:` expression's full text (`/want: (wantOf\([^)]*\))/` must equal the whole value up to `,` or `}`), and
  forbid `Object.assign(WANT` and `WANT\.[a-z0-9]+(\.[a-z]+)? =` in `s12-r19-c.ts`. Alternatively, `Object.freeze` the `WANT` tree
  (deeply) and test that it is frozen.

**MINOR-2. The new `OPT O2 front …` line is not a §4.27 form and shares the prefix of form (6)'s `OPT O2 shown=…`.**
- Where: `recipes/s12-win.ps1:189` and `:194`. §4.27 R19-UP-OPT (`docs/e2e-test-plan.md:1816`) expects only `OPT observed …` and
  `OPT O2 shown=… at=… polled-ms=…`; the #363 note (`:1893`) adds only the `FIX` line.
- Evidence: `grep -rln "OPT O2" recipes scripts` shows no parser today; the judge reads `o2Ms` from the observation JSON
  (`s11b-win.ps1:418`, `s12-r19-b.ts:168`), so nothing misjudges the row now. The values are fixed codes (`yes`/`no`), as the forms require.
- Suggested fix: see §5. Either option is design-local; the session agent writes the note.

**NIT-1. The `before-conflict-read` value has no discriminating test (U13 survived).** `recipes/test/s12-helpers-e.test.ts:43,59-60`:
the stub returns the same `$global:FgOk` for both foreground calls, so swapping the two variables cannot be seen. Suggested fix: have the
stub return `$true` on the first call and `$false` on the second, then expect `after-save=yes before-conflict-read=no`.

**NIT-2. `Wait-S12O2`'s parameter `$T0` and its local `$t0` are one variable** (`recipes/s12-win.ps1:156-157`; PowerShell names are
case-insensitive, `recipes/CLAUDE.md` Run 12 / Step 10 traps). `$t0 = $(if ($T0) { $T0 } else { Get-S12NowMs })` reassigns the
`[long]` parameter itself. This is correct (U5 and U5b show the test sees the difference), but it is the shape that gotcha warns about.
Suggested fix: rename the parameter, for example `-FromMs`.

**NIT-3. Line order.** The #351 (4) (a) note `O2 did not show the saved text in <n> ms` now comes two lines after the `OPT O2` line
(after the front and FIX lines), where the comment at `s12-win.ps1:170` says "printed after the O2 line". Nothing parses this order.

**Checked and in order:**
- Item 1 matches #363 and the investigator's §5. The clock starts at the save (`$o2T0` is taken right after `Set-S11Box`, before the
  foreground); the foreground's 300 ms counts against the bound by design. The second foreground comes before `Find-S11Texts` on O2.
  `$S12O2PollMaxMs = 15000` is unchanged, and the 5 000 ms bound lives in `upopt-judge`, which is untouched. The `OPT O2 shown=…` form is
  unchanged, and form (32)'s `FIX <what>` is printed exactly once. A failed foreground records `no` and does not throw:
  `Set-S9Foreground` returns a bool (`s9-win.ps1:265-273`).
- Only Run 19 is affected. `Invoke-S11Opt`'s text is unchanged (`git diff HEAD -- recipes/s11-win.ps1` is empty). U8a–U8d are killed.
  The R16, R17 and R18 call sites are unchanged.
- The patch fails loudly. Each `$S19OptPairs` regex goes through `Get-S12PatchedFunction`'s exactly-once throw (U9, U9b: 15 tests red, the
  load throws). Such a throw at load also stops Run 18's runner, as the existing S12 pairs already do.
- The load-made list in `s12-r19-static.test.ts:188` adds only `Invoke-S19Opt`, and `:190` pins its name in `s12-win.ps1`. The run-start
  guard at `s12-r19.ps1:69` exits 2 before preflight and before any row (U11 is killed).
- ASCII: all four changed `.ps1` files contain 0 non-ASCII characters. No new `SilentlyContinue` appears in the `s12-r19*.ps1` files
  that the static test scans; the one in `s12-win.ps1:196` copies the existing S12 line.
- Item 2 matches #363. The capture window `D` is not counted (D4 is killed). `wave-windows-open` is printed and never judged (D3 is
  killed). Native > 0 and devtools > 0 STOP after the line (D5, D6, D7). All four slice drivers are dot-sourced always
  (`s12-r19.ps1:25-28`), so the `Get-Command Write-R19Dialogs` guard cannot silently skip liveA19 or liveB19. The `dialogs` node
  subcommand does not care which slice it gets (`s12-r19-c.ts:483-485`). In liveB19, `$global:D` is re-set when the capture is reopened
  after SWEEP-HELD's reload (the `console` block, `s11b-r17.ps1:430`), so the new capture window is excluded too.
- `wave-windows-open` in liveA19: there is no window X, so the count is `O` only, after `rd-restore`. That is a record by #363, so a
  non-zero value cannot fail the slice. The builder's finding that `W` is never counted is accurate. It goes beyond the brief, and the
  sheet's expected text `wave-windows-open=0` (`:1848`) is overridden by the #363 note.
- One run event: in D6's run, one test file reported 26 skipped (probably the `hasPs` probe timing out in one file under load). The
  mutant was still killed by the intended tests. It was not reproduced, and is recorded only.

## 7. Handoff
Nothing is running. The scratch worktree is removed and pruned, and its folder deleted. The mutant script is in the evidence file. For
the fixer, if one is sent: MINOR-1 (test-only), MINOR-2 (rename, or leave it to the session agent's note), NIT-1 (test stub), NIT-2
(rename).
