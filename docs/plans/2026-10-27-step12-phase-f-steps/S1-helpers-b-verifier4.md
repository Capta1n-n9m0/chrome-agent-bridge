# S1-helpers-b verifier 4 report (round 4, after fix round 3)

Model and effort: Opus 5.5, medium. Role: agent-rules §6 Verifier. I re-checked only verifier 3's F-1 to F-4 as fixer 3
fixed them, against the step agent's F-2 ruling, plus anything the fix broke. No Chrome, no daemon, no port 9234. I edited
no repo file except this report and `S1-helpers-b-verifier4-evidence.txt` ("ev."). Mutants ran in my own worktree of
`e835eb5` with the 13 slice files copied in (HEAD moved to `c6ad96f` meanwhile; `git diff --stat e835eb5 HEAD -- recipes`
is empty, so the base is the same for this slice). Each mutant was an exact single-string replace, restored and compared
byte for byte (`restored=true` for all). PowerShell logic ran in Windows PowerShell 5.1.

## 1. Verdict

**PASS-with-notes.** F-1, F-3 and F-4 are closed. F-2 is closed for `Continue` and `Stop`, the settings every runner uses,
and each part of it is proven by a red mutant. One MINOR: under `$ErrorActionPreference = 'SilentlyContinue'` with no
enclosing `try`, the plain `throw` is swallowed. The STOP line still prints, but the counts read 0 and the script goes
on, so the ruling's "whatever `$ErrorActionPreference`" is not met to the letter. No runner in `recipes/` sets
`SilentlyContinue`.

## 2. Numbers (ev.)

- `npx vitest run recipes/test`, main tree: **1129 → 1131 passed, 52 files** (+2: the F-1 case and the null-list case).
- `tsc --noEmit -p`: exit 0 for all seven `recipes/tsconfig*.json` and the five packages (main tree).
- Worktree: `npm run build` exit 0; `npm run typecheck` exit 0; `git status --short` after the build shows only the 13
  slice files.
- Full `npm test`, worktree:
  - with the CRLF checkout: **9 failed, 4856 passed**, all nine in `s11-r16-runner.test.ts`, the known gotcha (as
    verifier 3 saw it);
  - after re-checking out the untouched `recipes/*.ps1` files with LF (worktree only, no config written): **4865 passed,
    205 files**, exit 0.
  - The fixer's 4881/207 comes from the main tree, which also holds other agents' new tests. I did not judge those tests.
- `Parser::ParseFile`: 0 errors and 0 non-ASCII bytes in each of `s11-win.ps1`, `s11b-r17b.ps1`, `s11b-win.ps1` and
  `s12-win.ps1`.
- `s11-win.ps1` vs HEAD (`git diff -U0`): hunks `@@ -24 +24 @@` and `@@ -296,2 +296,2 @@` only. Line 275 is unchanged.
  It counts the standing text through `$S11Warning`, which line 24 replaced, so the lane holds.
- Size (`git diff --numstat HEAD -- recipes` insertions, plus `wc -l` of the three new tests):
  - **code 259** (3+5+18+2+1+92+49+89), **under 350**;
  - **tests 498** (3+22+211+128+134);
  - **total 757**.
  - These agree with fixer 3's numbers.
- Line forms (5)–(8) still match §4.26 by key: "every skeleton is written in the sheet" passes in the suite. §4.26 (6)
  names `s11-win.ps1:24, 275, 296` as the lines replaced, which matches the diff (275 by way of 24).

## 3. Mutants (ev.; the three `s12-helpers-b*` test files run against each)

All of the following go **red**:

| Mutant | Change | Red tests |
|---|---|---|
| FCa (F-1) | the `\\` stop dropped from `scan18`'s walk | 1, the new F-1 case |
| F2-iffalseI / W | `if (-not $ulI)` / `if (-not $ulW)` made `if ($false)` | 2 each: the null-list test and the counts test, which gains extra `OPT observed` lines |
| F2-nothrowI / W | the `throw` removed | 2 each |
| F2-nostopI / W | the `Stop9` removed, the `throw` kept | 1 each, the null-list test |
| F3-invalidFromWarned | the invalid items read from the warned list | 1 |
| F3-idsSwapped | the two `Get-S9ById` ids swapped | 1 |
| F3-warnedPageWide | the warned items read from `$doc` | 1 |
| F3-warnedRegexToInvalid | the invalid regex on the warned list (verifier 3's FD3, green before) | 1 |

**No-`try` probe.** The stub test exercises only the in-`try` path, so I ran the real lines 296–297 with no enclosing
`try`: they were wrapped in a function, with the real `Find-S11Texts` and a `Get-S9ById` that returns `$null` for one id
(ev., `nulllist.ps1`).

| Case | `Continue` | `Stop` | `SilentlyContinue` |
|---|---|---|---|
| Real code | STOP line, terminating throw, exit 1, no `AFTER` | STOP line, terminating throw, exit 1, no `AFTER` | STOP line, then `COUNTS invalid=0 warned=0` and `AFTER` (F-A below) |
| `nothrow` mutant | STOP line, then 0 and `AFTER` | not run | not run |
| `noif` mutant | 0 and `AFTER`, with no STOP line | not run | not run |

So under `Continue` (the runners' setting) and with no `try`, the explicit `throw` is what turns verifier 3's silent 0
into a stop.

## 4. Findings

### F-A MINOR: the throw is swallowed under `SilentlyContinue` outside a `try`
**Where:** `recipes/s11-win.ps1:296-297`, `{ Stop9 '…'; throw '…' }`.

**Evidence (ev., `nulllist.ps1`, `throwforms.ps1`):** with `$ErrorActionPreference = 'SilentlyContinue'` and no `try`, the
real code prints `STOP: uploadfolders-invalid list not found`, then `COUNTS invalid=0 warned=0` and `AFTER`, exit 0. The
same happens for the warned list. A minimal `function A { throw 'plain'; Write-Host 'A went on' }` behaves the same way.
A form that sets `$ErrorActionPreference = 'Stop'` locally before the `throw` terminates under `SilentlyContinue` (exit 1),
and is caught inside a `try` like the plain one.

**Impact:** low.
- `grep ErrorActionPreference recipes/*.ps1` shows only `Stop` and `Continue`.
- The STOP line still prints, and a live runner returns on every STOP line (§6).
- It falls short only of the ruling's literal "whatever `$ErrorActionPreference`".

**Fix:** in both `if` blocks, `{ Stop9 '…'; $ErrorActionPreference = 'Stop'; throw '…' }`. The assignment is local to
`Invoke-S11Opt` and sits on the failing path only. Add a stub case that runs the null list under `SilentlyContinue` with no
`try` and asserts no `OPT observed` line follows. Alternatively, the step agent rules that `SilentlyContinue` is out of
scope.

### F-B NIT (carried, not new): empty-`<ul>` UIA exposure is still unmeasured
Fixer 3's handoff states this correctly. If Chrome's UIA omits an empty `uploadfolders-warned` list, a correct page now
STOPs in R18-UP-OPT, which expects `warned items 0`. This is loud, not silent. Run 18's prologue or S1-helpers-c should
measure it first, as the handoff says. No action is needed in this slice.

## 5. The brief's items

- **F-1:** closed. The `\n`-in-JSON case gives `[2,1,1]`, and FCa is red.
- **F-2:** closed for `Continue`/`Stop`, as ruled.
  - It is a STOP line plus a throw, in or out of a `try`.
  - Every part is proven red: the check, the throw and the `Stop9`.
  - The ids match `options.html`, as verifier 3 found.
  - The `SilentlyContinue` gap is F-A.
- **F-3:** closed. The stub now keeps the invalid list (`$global:Page`) and the warned list (`$global:Warned`) apart, and
  four list-mixing mutants, FD3 among them, are red.
- **F-4:** closed. Code 259, tests 498.
- **Fix-broke check:** no regressions.
  - The full suite is green in the worktree (LF), and recipes typecheck and build exit 0.
  - The new invalid regex `^Line \d+: “.*” — (?!warning: )` is ASCII in source and counts the real U+201C,
    U+201D and U+2014 characters (the stub's `L` builds them with `[char]`, and the counts test gives 4/0 and 3/1).
- **Exit checks "Every stage"** (phase doc l.387–389): `npm test` +2 with no test removed; typecheck, the seven recipes
  tsconfigs and the build all exit 0; the tree is clean of tracked changes after the build apart from the slice; the new
  tests go red on the mutants. Met.
- **§4.26 wording:** no new problem. Verifier 2's F-F (the Helper cells for R18-UP-L1 and R18-LOGS) stands; I made no edit.

## 6. Cleanup

- I removed the five `@bridge` junctions inside the worktree (each pointing into the worktree) with PowerShell
  `cmd /c rmdir`.
- Then `git worktree remove --force` (exit 0) and `git worktree prune`.
- The main tree's `node_modules/.bin` still holds 42 entries and `@bridge` all 5, and `git status --short recipes` shows
  the same 13 files.
- Scratch files stay in the session scratchpad under `verifier4/`.
