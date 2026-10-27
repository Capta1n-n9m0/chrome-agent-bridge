# S1-live verifier, fix round 1 (Claude Opus 5.5, medium effort)

Read and run only; nothing edited in the tree, nothing committed, nothing run against Chrome or the daemon on 9234.
Scratch copies live under the session scratchpad (`head/`, `fix/`, `mut/`, `run.mjs`, `run2.mjs`).

## 1. Verdict
**PASS-with-notes** (two NITs, no CRITICAL/MAJOR/MINOR).

## 2. Outputs (re-run by me)
- `npx vitest run recipes/test/s12` → `Test Files 7 passed (7)`, `Tests 152 passed (152)`.
- `npm test` → `Test Files 210 passed (210)`, `Tests 5010 passed (5010)`. The diff adds one describe with 2 `it`s; nothing removed.
- `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json` → all seven exit 0.
- `npm run typecheck` → exit 0.
- `git status --short` → tracked changes only `recipes/s12-win.ps1`, `recipes/test/s12-helpers-b.test.ts`; the rest are the
  untracked steps-dir files of this stage (evidence, record, runner, fixer, ledger).

## 3. Check 1: the diagnosis
- Evidence line 53/63 of `S1-live-evidence-liveA18-att1.txt`: `ParameterBindingArgumentTransformationException; ... (id
  ParameterArgumentTransformationError,Get-S9Options)` in block r18-up-opt.
- `Invoke-S11Opt` (recipes/s11-win.ps1:272) holds the second options window in `$O2`; HEAD's pair 1 (recipes/s12-win.ps1:178 at HEAD)
  replaced the 6 s loop with `$o2 = Wait-S12O2 $O2 $setSha`. PowerShell variable names are case-insensitive, so `$o2` *is* `$O2`: the
  handle becomes the `[pscustomobject]` result, and the next statement after the patched span, `Get-S9Options $O2` (s11-win.ps1:284,
  a `[long]` parameter), cannot convert it. That is exactly the observed exception and function. Reproduced on HEAD's file with the
  fixer's own stub harness: `HANDLE Get-S9Options 5` then `HANDLE-RUN threw ParameterBindingArgumentTransformationException`.
- The fixer's second effect is also right: `$O2` is reassigned at s11-win.ps1:299, so even without the throw HEAD's `Format-S12OptO2 $o2`
  would have formatted a handle.
- Collision sweep of the patched `Invoke-S12Opt` (all variables of s11-win.ps1:265-311 plus the two replacements): `$O`, `$Root`,
  `$ObsJson`, `$found`, `$foundCount`, `$next`, `$O2`, `$doc`, `$standing`, `$setSha`, `$o2Ms`, `$o2Eq`, `$o2Conflict`, `$s1`,
  `$storedSha`, `$summaryAfterSave`, `$firstTyped`, `$typed`, `$line`, `$summaryTyped`, `$ulI`, `$ulW`, `$invalidItems`, `$warnedItems`,
  `$invalidCount`, `$warnedCount`, `$whileTyping`, `$storedWhileTypingSha`, `$summaryAfterRevert`, `$obs`, and the new `$o2Res`. No two
  match case-insensitively. The removed loop's `$t0`/`$cur` no longer exist in the function and nothing later reads them.
- `$o2Res` survives the `$O2` reassignment at :299 and is what the OPT O2 line (pair 2, after :308) formats; `$o2Ms`/`$o2Eq` are set
  from it before :284 and `$o2Ms` reaches the obs JSON at :307 unchanged in meaning.
- Callees: `Wait-S12O2($O2, [string]$SetSha)` (s12-win.ps1:156) binds its own locals (`$t0`, `$at`, `$same`, `$el`) in its own scope
  and reads the script-level `$S12O2PollMaxMs` through dynamic scope; nothing in it writes the caller's variables. `Format-S12OptO2($R)`
  and `Format-S12OptObserved` are pure. `$S12OmniPairs` (s12-win.ps1:181) introduces no variable, only `$(Get-S12UrlClass $Url)` on
  `Set-S9Omnibox`'s own `$Url` (s9-win.ps1:287-302); no collision there.
- `Get-S12PatchedFunction` (s12-win.ps1:146-154) uses a `MatchEvaluator`, so `$` in the replacement is not a substitution; the dot-source
  inside `if { . (...) }` (s12-win.ps1:184-185) lands in the file's scope (an `if` body is not a new scope); the harness confirms
  `Invoke-S12Opt` exists and runs.
- Downstream: `Invoke-R18UpOpt` (recipes/s12-r18-lib.ps1:220-231) calls `Invoke-S12Opt $r18O $Root $r18Of`, then
  `Get-S11bOptObs` (recipes/s11b-win.ps1:411-420) reads `$j.o2Ms`, `$j.o2Conflict`, `setSha`, `storedSha`, `storedWhileTypingSha`,
  `foundCount`, `firstTypedLine`, `summary*`; all are still written by s11-win.ps1:307 with the same keys. The `r18-` prefixed locals of
  the block are distinct from the patched function's names (and in a different scope anyway). Obs JSON from the fixed function, two
  stubbed runs (`run2.mjs`): text shown at once → `"o2Ms":0` and `OPT O2 shown=yes at=0 polled-ms=0`; never shown →
  `"o2Ms":15000` and `OPT O2 shown=no at=none polled-ms=15000`, which the unchanged judge bound (`o.o2Ms > 5000`, recipes/s11b-rules.ts:816)
  fails, as §4.26's R18-UP-OPT row requires. Nothing else on the path takes a `[long]` from a variable the patch touches.

No other trap found that would make r18-up-opt throw on the next attempt from this code path.

## 4. Check 2: forms, rules, scope of the change
- `git diff HEAD -- recipes/`: s12-win.ps1 changes only the replacement strings of pairs 1 and 2 (`$o2` → `$o2Res`, five uses); both
  regexes, `$S12O2PollMaxMs = 15000` (s12-win.ps1:143), `Wait-S12O2`, both `Format-*` functions and the Omni pairs are byte-identical.
- §4.26 Line forms item (6) — `OPT observed standing x<n> invalid items <…> warned items <n>` and
  `OPT O2 shown=<yes|no> at=<ms|none> polled-ms=<n>` — are produced by the unchanged `Format-S12OptObserved`/`Format-S12OptO2`; the R18-UP-OPT
  row (poll to 15 000 ms, bound 5 000 ms) is untouched. The fixed run prints `SAY OPT observed standing x1 invalid items 1 warned items 0`
  and `SAY OPT O2 shown=yes at=0 polled-ms=0`, matching the FORMS regexes of the same test file.
- No file outside recipes/s12-win.ps1 and its test is modified in the tracked tree.

## 5. Check 3: the new test discriminates
Method: the fixer's `PRE` + `HANDLE_BODY` templates extracted verbatim from recipes/test/s12-helpers-b.test.ts and run by `run.mjs`
against three scratch dirs, each holding the tree's s9-win.ps1, s11-win.ps1, s11b-r17b.ps1 and one s12-win.ps1; the five assertions of the
two `it`s evaluated as written.

| s12-win.ps1 | Get-S9Options 777 | Close 777 ×2 | RUN ok | O2 line | observed line |
|---|---|---|---|---|---|
| `git show HEAD:recipes/s12-win.ps1` | false | false | false (`threw ParameterBindingArgumentTransformationException`) | false | false |
| working tree (fix) | true | true | true | true | true |
| mutant: `$o2` only in the Format call (s12-win.ps1:179) | true | true | true | **false** (`SAY OPT O2 shown=no at=none polled-ms=`) | true |

So both `it`s fail on HEAD, both pass with the fix, and the Format-only mutant is caught by the second `it` (the O2-line regex).

## 6. Findings
1. **NIT** — recipes/test/s12-helpers-b.test.ts:144-171: the new describe exercises only the shown-at-once path (`MatchAt = 0`). The
   timeout path through the *patched* function (`$o2Res.PolledMs` into `$o2Ms`) is not asserted there; I ran it by hand (`o2Ms:15000`,
   `shown=no at=none polled-ms=15000`). Suggested: a second run with `$global:MatchAt` beyond 15 000 ms asserting the O2 line and the obs
   JSON's `o2Ms`. Not blocking: `Wait-S12O2` itself is covered by the existing tests.
2. **NIT** — fixer report §6 proposes a recipes/CLAUDE.md bullet; recipes/CLAUDE.md:87 already records the case-insensitivity gotcha
   (`$h` shadowing `$H`). The session agent should extend that bullet with this instance (a regex patch introducing a name into a
   re-defined function) rather than add a new one.

Fixer report claims audited: diagnosis, diff, red/green, 152 / 5010 counts, tsconfigs and typecheck all reproduce. Its "4 uses" in pair 1
is four `$o2Res` in pair 1 plus one in pair 2 — consistent with the diff.

## 7. Handoff
No processes left; the daemon (PID 35188) was not touched. Scratch files only under the session scratchpad.
