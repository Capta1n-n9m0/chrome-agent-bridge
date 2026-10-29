# S5-drivers-A2 verifier, round 1 (re-check after fixer 1)

Model and effort: Claude Opus 5.5, medium. Read and run only; no main-tree file edited, reverted, stashed or moved. Mutants ran in a scratch
worktree outside the repo (`<TEMP>/v2wt`: `git worktree add` at 76f4f5e, the lane's files copied in, its own `npm ci`). The five
`node_modules/@bridge` junctions were removed with `cmd /c rmdir` before `git worktree remove`. Afterwards the main tree still has 5 `@bridge`
entries and `.bin/vitest`. No daemon, Chrome, reload or live run. Evidence: `S5-drivers-A2-verifier2.txt`.

## 1. Verdict

**FAIL**: 1 MAJOR (new, N1; it answers question (b)), 2 MINOR, 2 NIT. Fixes 3.1, 3.2, 3.3 (ROW line), 3.4 (own FAIL), 3.5 and 3.7 are in and
pinned: every mutant is killed (§3). Every exit check passes. The MAJOR finding: the settle step still defers every slice-A ARGS and CON row,
but no slice-A row has a console clause. As a result, R20-LOGS can still change those rows' verdicts, and a STOP before R20-LOGS drops their
ROW lines. The fix is one line plus one test expectation.

## 2. Exit checks (re-derived)

| Check | Result |
|---|---|
| `npm test` = 5772 + n, none removed | **243 files, 5796 passed**, exit 0 (fixer's claim holds; +3 over round 0's 5793) |
| `npm run typecheck`; all eight `recipes/tsconfig*.json`; `npm run build` | all exit 0 |
| `git status --short` after the build | only the lane's 11 recipes files and the stage's `S5-drivers-A2-*` docs files |
| Size (cap 600) | numstat insertions 16+91+3+23+94+7+1+1 = 236, plus 174 + 58 + 96 untracked = **564** (fixer's count holds) |
| No `recipes/s12-*` or `s13-forms.ts` edit | `git diff --stat 76f4f5e -- 'recipes/s12-*' recipes/s13-forms.ts` empty |
| No home path or user name in slice files or evidence | grep for the name, the login and a home path over the lane files and all `S5-drivers-A2-*` files: no hit |

## 3. Round-0 findings

- **3.1 MAJOR: closed.** `s13-r20.ps1:188` now gates on `keys=sorted|perm=no`. Mutant P31 (the old `args=(VERSION|UNKNOWN_METHOD)` gate)
  fails `the old-build gate is the sheet's proof …`.
- **3.2 MAJOR: closed.** `s13-r20.ps1:204` runs `s11b clean-console` on the joined capture before the first scan. Mutant P32 (the line
  removed) fails the `R20-LOGS drops the capture's window-title lines …` test.
- **3.3 MINOR: ROW line closed; the line-length part is open (question (a)), see N3.** The `Complete-R19Row` wrapper (`:164–169`) turns the row
  to RECORD when a `LEG … RECORD` line is present. Mutant P33 fails `a leg the sheet calls RECORD makes the row RECORD`.
- **3.4 MINOR: the own-FAIL part is closed** (mutant P34 fails the logs test). **The narrowing was not done. Re-derived: it is needed. See N1 (MAJOR).**
- **3.5 MINOR: closed (question (c)).** All run in the worktree, each alone, with a reset between:
  M10 (`judgeCon4Mcp` without `r.text === ctl.text`) fails `R20-CON-4 …`;
  M13 (`n1 >= 1`) fails `R20-CON-DESC …`;
  M14a (no `!c.marker`) fails `R20-CON-CAP …` (test l.47);
  **M14b (no `c.lastIndex === 200`, i.e. the pre-fix `capRow`) fails `R20-CON-CAP …` (test l.48): the new test is red on the pre-fix code**;
  M14c (no `limit: 3` control at all) fails.
  Baseline and after reset: 39/39 pass in the two files. M10 and M13 were already correct code, so their new asserts are red only against
  the mutant, which is what 3.5 asked for.
- **3.6 MINOR: closed in the report (question (e)); one copy is missing, see N2.** All three addendum facts are correct:
  (a) `recipes/CLAUDE.md` l.136–137: "`python` is on Git Bash's PATH but not the PowerShell tool's: start a runner that needs it from Git Bash";
  (b) `s12-r19.ps1` l.11: "A slice is longer than the tool's 600 s cap: run it in the background";
  (c) `s12-r19.ps1` l.10: "After a STOP that names a failed restore …: never run -Block teardown or re-run; return to the user".
- **3.7 MINOR: closed.** `s13-r20-a2.ts:37` catches a throw from the tool listing and prints `LEG R20-CON-DESC actor-error FAIL`, exit 1.
  (d) There is no test of the throw path; see N4 (NIT, acceptable).
- **3.8 NIT: unchanged; none matters more after the fixes.** The `notea` tab left open on a throw is still not a safety item. R20-RESTORE
  does not count tabs.

## 4. New findings

### N1 MAJOR: the deferral covers rows that have no console clause, so R20-LOGS changes their verdicts and a STOP drops their ROW lines

`recipes/s13-r20.ps1:17`: `$R19DeferRe = '^R20-(ARGS|CON)-[A-Z0-9]'`, commented "the rows with a console clause". With A2 this matches eight
rows: ARGS-ORDER, ARGS-3, CON-DESC, CON-NOTEA, CON-CAP, CON-4, CON-FLOOR and ARGS-OLD.

Re-derived from §4.28 (question (b)):
- None of the slice-A ARGS or CON rows (l.1968–1975) has a console or logs clause. A grep of each row for `daemon.log|logs|scan|console
  text|in the console` finds nothing. The only console mention, at l.1975, says `consoleMessages` "is not needed".
- The only slice-A rows with a worker-console clause are the POP rows (`console-new=0`). Their drivers judge that inline and do not defer it.
- Run 19 deferred because its rows had console clauses (#351 (4)(b)). That reason does not carry over to Run 20.

Can the over-wide deferral still change a verdict after fix 3.4? **Yes, in three ways:**
1. R20-LOGS is NOT MEASURED. This happens on a lost segment (`CAPSEG … saved=no`), which is plausible because ARGS-OLD reloads the
   extension twice. Every PASS, RECORD or NOT DISCRIMINATING row then prints `NOT MEASURED`. The test `logsOwnFail` pins this:
   `s13-r20-ps.test.ts:281` expects `ROW R20-ARGS-3 NOT MEASURED` for a row whose own verdict is PASS.
2. R20-LOGS is FAIL (a scan exit 1). Every PASS, RECORD or NOT MEASURED row then prints `FAIL`.
3. A STOP between a row and R20-LOGS. Examples: `old-build-left-loaded` at ARGS-OLD, or `not-restored` / `dialog-left-open` at R20-RESTORE.
   The pending rows are never written, because nothing flushes `$global:R19Pending` on a STOP (`grep R19Pending` shows only the reset at
   `s12-r19-lib.ps1:207` and the settle steps). Up to seven measured rows then have only `CHECK … console-clause pending` and no `ROW` line.
   That breaks "exactly one `ROW` per id and slice" (l.1952).

Points 1 and 2 judge a row on a clause its written pass rule does not have (preamble l.1942: a row passes when every clause of **its** pass
rule holds). This is the same class as round 0's 3.1.

**Fix:** in A2's lane, make the slice-A deferral match nothing: `$R19DeferRe = '(?!)'`, or name only the rows with a console clause, of which
slice A has none. Change `logsOwnFail` to expect `ROW R20-ARGS-3 PASS` (written at its own row). Add a test that a CON row's ROW line is
printed at the row, before R20-LOGS. If the B/C drivers need a deferral, they can set their own pattern.

If the session agent reads R20-LOGS's "else NOT MEASURED for the slice" (l.1977) as covering every row of the slice, then points 1 and 2 are
the intended reading and should get a dated note. Point 3 still stands either way: on that reading the fix is to flush the pending rows on a
STOP.

### N2 MINOR: the entry script's header lacks two of the operating facts

`recipes/s13-r20-a.ps1:7`: "After a STOP or at the end of a slice, run -Block teardown." This has no exception for a failed restore, and the
header does not say to run in the background. Run 19's header has both (`s12-r19.ps1` l.10–11). The fixer added them only to its report
(3.6). A runner who reads the script, not the report, would run teardown after `restored=no`.

**Fix:** copy `s12-r19.ps1` l.10–11 into the header (ASCII).

### N3 MINOR: R20-CON-CAP's "RECORD with the line length" is not printed

Question (a). §4.28 l.1972: "a different `k` with the same rule held is RECORD **with the line length**". `capRow` prints
`CONCAP lines= body-chars= …` and a `CHECK … sdk-entries= limit3-…` line, but no line length. The value can be derived as
`(body-chars − (k−1)) / k` only when every kept line has the same length, which the RECORD case exists to question. The CONCAP form is fixed
by key (l.1952), so the length belongs on a `CHECK` line.

**Fix:** add `CHECK R20-CON-CAP line-chars=<min>-<max>` (counts only) from `concap20Stats`' body lines. Printing it on every run is harmless.
This does not change any verdict, so it is MINOR.

### N4 NIT: CON-DESC's throw path has no test

Question (d). `conDesc` is not exported, and `listDescriptions` spawns the real MCP server. A test would need to mock the module of
`@modelcontextprotocol/sdk/client`. The catch is one statement that maps the throw to the same FAIL leg form its siblings use, and no state
is changed. Acceptable without a test. If one is wanted: export `conDesc` with an injectable lister.

## 5. Proposed decisions

None. N1's alternative reading (l.1977, "for the slice") is the session agent's call if it prefers that reading to the fix.
