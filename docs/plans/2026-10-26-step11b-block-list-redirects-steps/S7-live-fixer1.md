# S7-live fixer 1 (Run 17b, finding F1: top-level variables are global under `powershell -File`)

Model/effort: Sonnet 5.5, medium. Role: fixer (agent-rules section 6). Offline only.

## 1. Verdict
DONE.

## 2. Outputs
Files: `recipes/s11b-r17b.ps1` (renames only), `recipes/test/s11b-r17b-scope.test.ts` (new), and the three renamed names followed in
`recipes/test/s11b-r17b-static.test.ts` (2 regexes) and `recipes/test/s11b-r17b-fix.test.ts` (1 string). No other file touched. Not committed.

Renames (top-level, outside functions and scriptblocks):

| old | new | where |
|---|---|---|
| `$o` | `$r17bO` | carried-block loop (was the F1 collision with `$Persist`/`$global:O`) |
| `$k` | `$r17bK` (loop at the carried blocks); `$r17bNmN` (slice summary) | `$global:` and local use of `$k` in the dot-sourced files |
| `$n` | `$r17bN` (framing-block loop); `$r17bFailN` (slice summary) | |
| `$b` | `$r17bSlot` | slice loop |
| `$ids` | `$r17bIds` | `plan` line |
| `$nm`, `$st`, `$tk`, `$er` | `$r17bNm`, `$r17bSt`, `$r17bTk`, `$r17bEr` | Run 17 reader |
| `$tag` | `$r17bTag` | catch block |

Kept: `$Name = $Block`. Every `$Name` in `s9-win`, `s11-win`, `s11b-win`, `s11b-r17` is a function parameter or a local assignment
(checked by grep), none a read of a global. Kept also the intentional shared script variables (`$Root`, `$Record`, `$Blocks`, `$Framing`, ...):
they are the same names Run 17's runner sets.

## 3. Collision list checked
AST of the four read files: `$global:` names used = d e l0 o pinnedbefore r17actorran r17bg r17capsdone r17errms r17fallback r17fwdnotbuilt
r17hist r17hopms r17nb r17out r17press r17rd3ms r17rulesok r17socklog0 r17socklog1 r17sockran s11brecordfile s11found s11own s11roottext
s11stable s16actor s16born s16changed s16consoleread s16fail s16gone s16inrestore s16mark s16nm s16pids s16stops s16toggle s9chromestart
s9found s9parkcache s9pinuiaonly s9winids w winstart x; plus all 26 `$Persist` names. Pre-fix top-level assigned/foreach names compared
case-insensitively: the only hit against that set is `o` (also `st`, `k`, `n`, `b`, `ids`, `tag` are read as locals in the dot-sourced files, so they were renamed
as the brief asks). Post-fix: 0 hits.

## 4. Red/green proof
`recipes/test/s11b-r17b-scope.test.ts` (PowerShell AST; 2 tests). Red on the pre-fix file (`git show HEAD:recipes/s11b-r17b.ps1` to a temp file,
run with `R17B_FILE_UNDER_TEST=<temp>`): `AssertionError: expected [ 'o' ] to deeply equal []` (1 failed, 1 passed). Green on the fixed file.
The second test is a permanent discriminating probe (`foreach ($k in 'a') { $o = 'x' }` is flagged; function and scriptblock locals are not).

## 5. Counts
- `npm test`: 4665 passed, 191 files (before 4663 / 190; +2 tests, +1 file). Two existing static/fix tests that pinned the old names were updated first
  (they failed on the renames: `$b` gate regex, `$er.Count` string, `$n` foreach regex).
- `npx tsc --noEmit -p recipes/tsconfig.s11b.json` exit 0; `npm run typecheck` exit 0.
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\s11b-r17b.ps1 -Block plan` exit 0, the same two PLAN lines.
- PowerShell parse of `s11b-r17b.ps1`: 0 errors.

## 6. Findings
Under `powershell -File` any top-level assignment in a runner is global. Candidate gotcha for `recipes/CLAUDE.md` (session agent to place):
test pins a runner's top-level names against `$Persist` and the `$global:` names it reads (`s11b-r17b-scope.test.ts`).
