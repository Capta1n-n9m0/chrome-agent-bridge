# S5-drivers-A2 fixer, round 1

Model and effort: Claude Sonnet 5.5, medium. No main-tree file reverted, stashed or moved. Red proof for the PowerShell fixes ran against a
scratch copy of `recipes/` with the fixes inverted (`S13_R20_REPO`; evidence `S5-drivers-A2-fixer1-red-ps.txt`: 3 failed, 26 passed). The
TypeScript tests have no scratch-run red (a scratch copy has no `node_modules`); they target each surviving mutant by construction (see 3.5).

## Findings

- **3.1 MAJOR, fixed.** `recipes/s13-r20.ps1` `Invoke-R20OldArgs`: the row now runs when the old build's `LOADED20` reads `keys=sorted` or
  `perm=no` (the sheet's proof); `args=` is only recorded (it is on the printed LOADED20 line). Test: `oldRowAnswered` (keys=sorted, perm=no,
  `args=answered`: the row runs; kills M15 and the old gate) and `oldRowNotRunVersion` (keys=page, perm=yes, `args=VERSION`: NOT RUN).
  Red: the "old-build gate is the sheet's proof" test fails on the inverted copy.
- **3.2 MAJOR, fixed.** `Invoke-R20Logs` calls `s11b clean-console --file <all>` right after writing the joined capture, before the control count's
  scans, as Run 19 does. Test: `logsOk` order check (clean-console before the first `s13-r20 scan`). Red: fails on the inverted copy.
- **3.3 MINOR, fixed (ROW line).** The `Complete-R19Row` wrapper adds the row id to `$global:R19RecordRows` for that call when any `LEG <row> <label> RECORD`
  line is present, so CON-NOTEA (allowed) and CON-CAP print `ROW … RECORD`. Test: `recordRow` (PEND RECORD, then PEND2 PASS: the list is restored).
  Red: fails on the inverted copy. Not done: the sheet's "CAP RECORD with the line length" is not printed; `CONCAP` prints `lines=`, `bodyChars=` and `last-index`,
  and I did not add a line the verifier did not size. Left to the session agent.
- **3.4 MINOR, fixed (not narrowed).** The settle step keeps a row's own FAIL (`$r20pv -match '^FAIL'`) when R20-LOGS is NOT MEASURED or FAIL. Test: `logsOwnFail`
  (CON-CAP pending FAIL stays `FAIL`, ARGS-3 pending PASS becomes `NOT MEASURED`). Red: fails on the inverted copy. I did not narrow `$R19DeferRe`: I did not
  re-derive which rows have a console clause from the sheet; a FAIL no longer gets lost either way. Left as a question for the session agent.
- **3.5 MINOR, fixed (tests).** `recipes/test/s13-r20-a2.test.ts`: M13 sentence-1 twice is FAIL; M14 a `limit: 3` text of three lines with the marker among them, and one of
  three lines that are not the last entries (needs the new `c.lastIndex === 200` clause in `capRow`, `s13-r20-a2.ts:86`), both FAIL; M10 exact MCP line but a different
  control text is FAIL. M13/M10 are existing code that these asserts now pin; M14's last-3 clause is new code. Not run as a mutant (no `node_modules` in a scratch copy); each assertion was written to fail exactly under its mutant.
- **3.6 MINOR, addendum for the builder's section 8 "How to run liveA20":**
  (a) start it from Git Bash (`S11_OUT=<dir> powershell.exe …`) because `python` is on Git Bash's PATH, not the PowerShell tool's (`recipes/CLAUDE.md`);
  (b) run it in the background: a slice outlasts the 600 s tool cap (`s12-r19.ps1` header);
  (c) "Resume: run `-Block teardown`" has Run 19's exception: after a STOP whose RETURN reads `restored=no` (a failed restore), run neither teardown nor a re-run; return to the user.
- **3.7 MINOR, fixed.** `s13-r20-a2.ts:37`: `conDesc` catches a throw from the tool listing and prints `LEG R20-CON-DESC actor-error FAIL`, exit 1. No test of the throw path
  (it needs a real MCP spawn); the catch is one line.
- **3.8 NITs:** not changed (same as Run 19; open tab not a safety item; builder's TS red proof replaced by the verifier's run).

## Exit checks

- `npm test`: 243 files, 5796 passed (5793 + 3), none removed. `npm run typecheck`: exit 0. All eight `recipes/tsconfig*.json`: exit 0. `npm run build`: exit 0.
- `git status --short` after the build: only the lane's files and the stage's docs files.
- New lines, code plus tests: `git diff --numstat 76f4f5e -- recipes` insertions + `wc -l` of the three untracked files (`s13-r20-a2.ts` 174, `s13-r20-a.ps1` 58,
  `test/s13-r20-a2.test.ts` 96) = **564** (cap 600).
