# S1-helpers-b verifier 3 report (round 3, after fix round 2)

Model and effort: Opus 5.5, medium. Role: agent-rules §6 Verifier. I re-checked only verifier 2's F-A to F-E as fixer 2 fixed
them, plus anything the fix broke. No Chrome, no daemon, no port 9234. I edited no repo file except this report and
`S1-helpers-b-verifier3-evidence.txt` ("ev."). Mutants and the build ran in my own worktree of `e835eb5` with the 13 slice
files copied in. Each mutant was an exact-string replace, and each file was restored and compared byte for byte
("restored=true" for all). One slip in the cleanup: my `cmd //c rmdir` from Git Bash failed ("cannot find the file"), so
`git worktree remove --force` ran with the five `@bridge` junctions still in place. They pointed inside the worktree (ev.), so
nothing outside it was touched. I then removed them with PowerShell `cmd /c rmdir` and pruned. The main tree's
`node_modules/.bin` still holds 42 entries and `node_modules/@bridge` all 5.

## 1. Verdict

**FAIL.** One MAJOR finding: a failed exit check. F-C's restored backslash stop in `scan18`'s walk is not proven by any
mutant. Fixer 2 called that mutant equivalent, and it is not: removing the stop hides a non-fixture URL from R18-LOGS. The
code itself is right. Everything else holds or is MINOR/NIT. The fix is one test case.

## 2. Numbers (ev.)

- `npx vitest run recipes/test`: **1122 → 1129 passed, 52 files**, in the main tree and the worktree. The +7 are exactly the
  7 `it`s of `s12-helpers-b-fix2.test.ts`, so no test was removed.
- `tsc --noEmit -p`: exit 0 for all seven `recipes/tsconfig*.json` and the five packages (main tree). `npm run typecheck`
  also exits 0 in the worktree.
- Full `npm test` in the worktree:
  - The first run gave **9 failed, 4854 passed**. All nine are `recipes/test/s11-r16-runner.test.ts`, the known CRLF-checkout
    gotcha (`recipes/CLAUDE.md`); that file is untouched by the slice.
  - I re-checked out the untouched `.ps1` files with LF (`git -c core.autocrlf=false checkout -- <file>`, worktree only, no
    config written). The second run gave **4863 passed, 205 files**, exit 0.
- `sdk/test/failure-report.test.ts`: 69 passed in the worktree. In the main tree at my run time it also passed, 69 of 69: the
  other agent's sdk/src work has moved on. The fixer's one failure was outside the slice, as claimed.
- `npm run build` in the worktree: exit 0. Afterwards `git status --short` shows only the 13 slice files.
- `Parser::ParseFile`: 0 errors and 0 non-ASCII bytes in each of `s12-win.ps1`, `s11-win.ps1`, `s11b-win.ps1` and
  `s11b-r17b.ps1`.
- Size (`git diff --numstat HEAD -- recipes` insertions, plus `wc -l` of the three new tests):
  - **Code: 259.** That is 3 + 5 + 18 + 2 + 1 + 92 + 49 + 89. The fixer's own per-file list also sums to 259; it printed 256.
  - **Tests: 482.** That is 3 + 22 + 200 + 128 + 129. The fixer printed 485 because it counted a 3 twice.
  - **Total: 741.** Numbers only, as briefed.
- Line forms (5)–(8) still match §4.26 by key: "every skeleton is written in the sheet" passes.

## 3. Mutants (ev.; the three `s12-helpers-b*` test files run against each)

**Red, so the fix is proven:**
- F2a (uploads doubled): 3 tests fail.
- F2b (page judge dropped from `l1Step`): 1. F2b2 (error judge dropped): 2.
- F2c (no `CHECK UP-L1 build`): 2.
- F2d (build judge out of the row): 1.
- F2e (no `resetPage`): 1.
- New, all mine:
  - F2f (the RAW line from a fixed K-gate answer instead of the call's own): 2.
  - F2g (no locator on `raw-outside`): 2. F2g2 (a locator on both calls): 2.
  - F2h (the page read before the call): 2.
  - F2i (a 1 s `uploadFiles` timeout instead of 60 s): 1.
  - F2j (an extra path on `raw-outside`): 1.
  - F2k (the two files swapped): 2.
- F1d (the `$` anchor dropped): 2. F1f (userinfo stripped): 1.
- FCb (the backslash stop removed from `isFixture18`): 1.
- F8b (PowerShell `([/?#]|$)` dropped, run in PowerShell): 1.
- FD1 and FD2 (each scoped call reverted to `$doc`, run in PowerShell): 1 each.

**Green, so no test catches the change:**
- **FCa:** the backslash stop removed from `scan18`'s walk alone. This is F-1 below.
- **FD3:** the invalid regex applied to `uploadfolders-warned`. This is F-3 below.

## 4. Findings

### F-1 MAJOR (failed exit check): FCa is not equivalent; the walk's backslash stop is untested
**Where:** `recipes/s12-rules.ts` `scan18`, the walk regex `/[a-z][a-z0-9+.-]*:\/\/[^\s/'"`<>)\]\\,;]*/gi`; test
`recipes/test/s12-helpers-b-fix2.test.ts` "a fixture URL inside escaped JSON …".

Fixer 2 says removing the `\\` from the walk only changes what the match holds after the host, so "no count differs". That
misses how `matchAll` resumes. Without the stop, a match runs on past a `\` into the next URL's scheme and ends at its `:` or
`/`. The next URL's `scheme://` is then consumed, so it is never counted.

Agent results are JSON, where a newline is the two characters `\n`, so a fixture URL followed by a newline and an evil URL
looks like this (ev., `npx tsx fca.ts`; real = the code, mutant = FCa, s11 = `scanText`):

| text | real | mutant FCa | s11 `scanText` other |
|---|---|---|---|
| `{"r":"see http://localhost:8081\nhttp://evil.example/x"}` | urls 2, fx 1, **other 1** | urls 1, fx 1, **other 0** | 1 |
| `http://localhost:8081\thttps://evil.example/` | other 1 | **other 0** | 1 |
| `http://localhost:8081\http://evil.example/` | other 1 | **other 0** | 1 |

So the mutant hides a non-fixture URL from R18-LOGS, whose `other 0` is a STOP gate on leaks. That is a weakening of a
leak count. The code as written is correct and matches `scanText` character for character. The exit check ("each affected
fix proven by a mutant that goes red") fails only for want of a test.

**Fix (test only, one case):** in `fix2`, assert that
`scan18('{"r":"see http://localhost:8081\\nhttp://evil.example/x"}', ctx)` gives `urls 2, fixture 1, other 1`, then show FCa
red.

### F-2 MINOR: a missing Upload-folders list is a throw only inside a `try`, and an empty list's UIA presence is unmeasured
**Where:** `recipes/s11-win.ps1:296-297`; `recipes/s9-win.ps1:609` `Get-S9ById` (an existing helper, `FindFirst` by
AutomationId, `$null` when absent).

The ids match `extension/options.html:59-60` (`<ul id="uploadfolders-invalid">`, `<ul id="uploadfolders-warned">`), and the
block list is `#invalid-lines` (`:45`), so the scoping is right.

Fixer 2 says a missing element "throws (loud, not a silent 0)". I measured it in PowerShell 5.1 with `$ErrorActionPreference
= 'Continue'`, the runners' setting, and `Find-S11Texts` taken from the real file (ev.):
- `$null.FindAll` is statement-terminating.
- **With no enclosing `try`, the function returns nothing, `@()` gives `count=0`, and the script goes on.** That is a silent
  0 with an error record. It also happens through a `Step-S16`-style `& {}` call.
- Only an enclosing `try` turns it into a throw.

Run 17's runner wraps the whole wave in `try { … } catch { Stop-S16Wave … }` (`s11b-r17.ps1:887-906`), so there it would
be a STOP. The R18 runner (S1-helpers-c) is not written yet.

Two consequences:
- (a) Outside such a `try`, an absent `uploadfolders-warned` reads `warned items 0`, which is §4.26 (6)'s expected value.
- (b) Inside one, if Chrome's UIA omits an **empty** `<ul>` (R18-UP-OPT expects `warned items 0`, so that list is empty),
  a correct page STOPs. That would happen after the wave's first Upload-folders change. The fixer flags this as unmeasured,
  and the stub (`Get-S9ById` returns its id string) cannot reach the null path.

**Fix:**
- In `Invoke-S11Opt`, check each list explicitly. A null list with the matching items absent from the rest of the page
  (block list excluded) is 0; otherwise STOP. Or STOP explicitly and measure empty-`ul` exposure in Run 18's prologue.
- Either way, add a stub case where `Get-S9ById` returns `$null`.
- S1-helpers-c should keep the outer `try`.

### F-3 NIT: the stub folds both Upload-folders lists into one page
**Where:** `recipes/test/s12-helpers-b.test.ts`, the `PRE` stub: `Find-S11Texts` answers every `uploadfolders-*` id with
`$global:Page`.

The FD3 mutant (the invalid regex applied to the warned list) goes green. Live, that would read `invalid items 0` and FAIL
loudly, not pass, so it is no weakening. It is still untested.

**Fix:** a separate `$global:Warned` list for the `uploadfolders-warned` id.

### F-4 NIT: the fixer's size sums
The code is 259, not 256, and the tests are 482, not 485 (§2). This is arithmetic only.

## 5. Points the brief asked about

- **F-A:** closed. `rawL1Run` against the fake client proves all of the following (the F2a–F2k reds):
  - the exact sequence (`daemon.status`, then reset, `uploadFiles` and state read, twice);
  - exactly two uploads, with `S11 l1`'s params: no locator and `s11-1k.bin`, then `{css:"#up-single"}` and `s11-out.bin`,
    one path each;
  - the 60 s timeout, through the static tie;
  - every check `S11 l1` makes (`s11.ts:492-512`): the build judge, `all([judgeError(err,"K-gate"), refusalPageJudge(page)])`
    per step, the build judge in the row, and the STOP;
  - each `RAW` line from its own call's answer (F2f red, and `code=ok` on the allowed call).

  The real CLI path is the same code: `rawL1` (`s11b.ts`) only builds the client, the state and the dist sha, calls
  `rawL1Run`, then bumps and STOPs. `S11State.files` / `filePath` give the same paths as s11's `fp`, and `handleOf("l1")`
  reads the same `state.json`. The one difference, `bcall` recording a ledger span, is harmless. The `sdkMod ??=` line makes
  `attempt` recognise the fake's `BridgeError`; in the real path `session` has already set it.
- **F-B:** closed. F1d, F1f and F8b are red, and both twins' tables hold the five boundary URLs.
- **F-C:** the code is right; the test does not cover it (F-1). On the attacks the brief named (ev.):
  - `http://localhost:8081\@evil` counts as fixture. That is correct: for the special `http` scheme, WHATWG and Chrome read
    `\` as `/`, so the host is `localhost:8081` and `@evil` is path.
  - `http://evil\.localhost:8081/` and `http://\evil.example/` count as other.
  - `chrome-extension://<own>\@evil.example/` counts as fixture. Chrome treats `chrome-extension` as a standard scheme, so the
    host is the own id.
  - `http:\\evil.example/` is not counted at all, by `scan18` and by s11's `scanText` alike. That is a pre-existing NIT,
    not this slice's.

  So the stop lets no non-fixture host count as fixture, and every case equals `scanText`.
- **F-D:** scoped per the step agent's ruling, and the ids match `options.html`. No remaining regex in R18-UP-OPT's path
  (`Invoke-S11Opt` / `Invoke-S12Opt`) counts block-list items:
  - the standing-text count (`s11-win.ps1:275`) is page-wide, but its text exists only in the Upload-folders section;
  - `s11b-win.ps1:370` `Get-S11bTypedObs` still reads `^Line \d+: …` page-wide, but it is Run 17's F-HOME/R17-UP-OPT
    observation, untouched by this slice and not named by §4.26 for R18.

  The missing-element behaviour is in F-2.
- **F-E:** closed. The static tie is red on F6b, per fixer 2. I did not re-run F6b.
- **§4.26 wording:** verifier 2's F-F (the Helper cells for R18-UP-L1 and R18-LOGS still name `S11 l1` and the S9/S11 scans)
  stands. I made no edit.

## 6. For the fixer (round 3)

1. **F-1:** add the `\n` JSON case to `fix2` and show FCa red. Optionally add the `\t` case.
2. **F-2:** an explicit null check on both lists, with a null-returning stub case, or have the step agent rule that Run 18
   measures empty-`ul` exposure first.
3. **F-3** (optional): a separate warned-list stub, with FD3 red.
