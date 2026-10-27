# S7-live verifier 1 (Run 17b, helper fix F1: top-level variables are global under `powershell -File`)

Model/effort: Opus 5.5, medium. Role: verifier (agent-rules §6). Offline: no Chrome, no daemon, no live run, no port 9234.
Audited: `S7-live-fixer1.md` against `git diff HEAD -- recipes` and the working tree.

## 1. Verdict
**PASS-with-notes** (no CRITICAL or MAJOR; two NITs).

## 2. Checks

**(1) The diff changes names only.** `git diff --stat HEAD -- recipes`: `s11b-r17b.ps1 | 38 +-` (19 lines changed), `s11b-r17b-fix.test.ts | 2 +-`,
`s11b-r17b-static.test.ts | 4 +-`. I read every hunk: lines 28 (`$ids`→`$r17bIds`), 58-67 (`$tk/$er/$st/$nm`→`$r17bTk/Er/St/Nm`),
162 (`$n`→`$r17bN`), 349 (`$k/$o`→`$r17bK/$r17bO`), 354-368 (`$b`→`$r17bSlot`; slice summary `$n/$k`→`$r17bFailN/$r17bNmN`; catch `$tag`→`$r17bTag`).
No change to a block body, the STOP map, an expected text, a slice array, `$Record`/`$Framing` paths, an `exit` code or the `Say9` text
(the SLICE line prints the same values). Every renamed use is renamed: `grep -c -i '\$r17b(Ids|Tk|Er|St|Nm|N|K|O|Slot|FailN|NmN|Tag)\b'`
= 19 uses in the file, matching the 19 old uses in the minus hunks; none of the new names appears in any other `recipes/*.ps1`.
Both renamed loop variables used inside a `[scriptblock]::Create("...")` string (line 349) are expanded at creation, so no late lookup
remains.

**(2) Collisions and implicit globals.** I wrote an AST scan of my own (scratchpad `free.ps1`): for every function and scriptblock in
`s9-win.ps1`, `s11-win.ps1`, `s11b-win.ps1`, `s11b-r17.ps1` and `s11b-r17b.ps1`, the variables read without a scope prefix and never assigned or
declared as a parameter in that unit (the names that resolve through dynamic scope). Run on HEAD's runner and on the fixed runner: 83 names each,
**identical sets** (`diff` of the name lists empty). None of the removed names (`o k n b ids tk er st nm tag`) is read freely by a loaded
function or block except as scan artefacts I checked by hand: `$O` in `s11-win.ps1:347-360` is `Invoke-S11Row`'s own `[long]$O` parameter,
`$ids` in `s9-win.ps1:1160` and `s11b-r17.ps1:670` is assigned in the same function/block, `$root`/`$s` at `s9-win.ps1:439-441` are locals
of the enclosing function. The shared top-level names loaded code does read (`$Record`, `$Root`, `$LogDir`, `$Steps`, `$Repo`, `$Framing`,
`$FoundDir`, `$GlobalsFile`, `$DaemonLog`, `$Fix81`, `$EncName`, `$Blk`, `$NeedsAccess`, `$FramingBlocks`, `$Persist`, `$Blocks`, ...) are untouched.
The new test's collision set on the fixed file is empty (below), so no top-level name meets a `$Persist` entry or a `$global:` name of the four files.

**(3) Red/green.** Red, re-proved on HEAD's file (`git show HEAD:recipes/s11b-r17b.ps1` to the scratchpad):
`R17B_FILE_UNDER_TEST=<scratch>/head-r17b.ps1 npx vitest run recipes/test/s11b-r17b-scope.test.ts` →
`AssertionError: expected [ 'o' ] to deeply equal []`, `Tests 1 failed | 1 passed (2)`. Green on the fix:
`vitest run` of the scope, static and fix tests → `Test Files 3 passed (3)`, `Tests 37 passed (37)`. The three edited assertions in the existing
tests pin the same statements as before with the new names only (`foreach ($r17bN in ...) { $Blocks[$r17bN]`, `Test-S17Gate $r17bSlot)) { Invoke-S17Block 'teardown'; exit 3 }`,
`$r17bEr.Count -ne 0 -or $R17Funcs -ne 49 -or $R17Blocks.Count -ne 49`).

**(4) Counts and runs.**
- `npm test` → `Test Files 191 passed (191)`, `Tests 4665 passed (4665)` (fixer's claim 4665 / 191 confirmed).
- `npm run typecheck` exit 0; `npx tsc --noEmit -p recipes/tsconfig.s11b.json` exit 0.
- `-Block plan`: fixed file exit 0, HEAD's file (scratch copy) exit 0; `cmp` of the two outputs → identical, 2 lines (`PLAN liveA17B: ...`, `PLAN liveB17B: ...`).
- Parse of `recipes/s11b-r17b.ps1` with `[Parser]::ParseFile` → `parse errors: 0`.
- The runner's required behaviour (`docs/e2e-test-plan.md` 1690-1692, 1713: slices, the G11-3 `NOT RUN` branch and exit 3, STOP = exit 2) is
  carried by code the diff does not touch.

**(5) Scope fact reproduced** (scratchpad `scope.ps1`: `$global:O = [long]42; foreach ($k in @(1)) { $o = "str" }`):
`powershell -File scope.ps1` → `global O type: String value=str`; the same file run by `& '<path>'` from `-Command` → `global O type: Int64 value=42`.
So under `-File` the script's top level is the global scope, as F1 says.

## 3. Findings
- **NIT** `recipes/test/s11b-r17b-scope.test.ts:15-40`: the test checks one direction only (a top-level name overwriting a persisted or
  `$global:` name). It does not catch a future top-level name that shadows a name a loaded function reads freely (dynamic scope), nor a
  top-level `[ref]`-only or `$script:` assignment. Today the free-read set is unchanged by the fix (check 2), so this is not a defect of F1.
  Suggested: if the gotcha goes into `recipes/CLAUDE.md`, name the second direction too.
- **NIT** process (mine): one command of mine copied HEAD's file into `recipes/.__head-r17b.ps1` and deleted it in the same command; `git status --short`
  afterwards shows only the fixer's files. Nothing else in the repo was written except this report.

## 4. Proposed decisions
None.
