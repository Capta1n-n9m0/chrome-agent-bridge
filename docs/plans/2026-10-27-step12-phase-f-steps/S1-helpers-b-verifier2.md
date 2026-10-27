# S1-helpers-b verifier 2 report (round 2, after fix round 1)

Model and effort: Opus 5.5, medium. Role: agent-rules §6 Verifier, re-checking only F1–F8 of `S1-helpers-b-verifier.md` and
the mutants M5, M8, M9, M15, M21–M24, plus anything the fix broke. No Chrome, no daemon, no port 9234. I edited no repo file
except this report and `S1-helpers-b-verifier2-evidence.txt` ("ev."). One slip: I wrote a scratch script into `recipes/` by
mistake. I moved it to my scratch folder within a minute, before any test or typecheck read the tree, and `git status` showed
it gone. Mutants and the build ran in my own worktree of `8a3053b` with the 12 slice files copied in (LF checkout via
`git -c`, so no git config was written). That worktree is removed: its five workspace junctions pointed inside it and were
removed with `rmdir` first. The main tree's `node_modules/.bin` still holds 42 entries. During my run another agent committed
S3a (`7b29b5d`, `e835eb5`). Neither commit touches `recipes/` (`git diff --stat 8a3053b HEAD -- recipes` is empty).

## 1. Verdict

**FAIL.** One MAJOR finding: the F2 tie that the ruling asks for is not discriminating. The code itself is right. Everything
else holds, or is MINOR or NIT.

## 2. Numbers (ev.)

- `npx vitest run recipes/test`: **1104 → 1122 passed, 51 files.** This is the same in the main tree and in the worktree.
- `tsc --noEmit -p`: exit 0 for all seven `recipes/tsconfig*.json` and the five packages.
- Full `npm test`, run once: **4856 passed, 204 files**, exit 0.
- `npm run build` in the worktree: exit 0. Afterwards `git status --short` shows only the 12 slice files.
- `Parser::ParseFile`: 0 errors and 0 non-ASCII bytes in each of `s12-win.ps1`, `s11-win.ps1`, `s11b-win.ps1` and
  `s11b-r17b.ps1`.
- Size (`git diff --numstat HEAD -- recipes` plus `wc -l` of the two new tests): **code 252, tests 350, total 602**. This
  matches the fixer.
- No test was removed. `s11-win-static.test.ts` swaps one import and one constant (`K17_TEXT["K-opt-stand"]`, justified by
  F7); `s11b-r17b-fix.test.ts` only adds tests.
- Line forms (5)–(8) still match §4.26 by key: `s12-helpers-b.test.ts` "every skeleton is written in the sheet" passes. The
  `SCAN` line printed by `scan18` is s11's `logsLine`, which is §4.26's form unchanged.

## 3. Mutants (ev.; each applied in the worktree, the named tests run, the file restored and compared byte for byte)

**Red (the fix is proven):**
- Verifier 1's green ones:
  - M5: the `newtabTimed` CHECK branch removed.
  - M8 and M9: the HEAD regexes back in `s11-win.ps1`. These run in PowerShell: the patched `Invoke-S12Opt` with stubs.
  - M15: `-ne 1` changed to `-lt 1`, run in PowerShell.
  - M21: `raceLoopDone` ignores `toCap`.
  - M21b (new): the call site passes `false`.
  - M22 and M23.
  - M24: a static tie only, see F-A.
- F1: `8081|8084`, a bare `://` counted, any `chrome-extension` id, `https` accepted, the exit code always 0, `scanText`'s
  URL counts returned.
- F2f: the `RAW` line dropped.
- F4: the id taken as the first token.
- F6a: retry 0 ms, run in PowerShell.
- F8a: one label only, and F8c: any extension id, both run in PowerShell.

**Green (no test catches the change):**
- F2a: `raw-l1` loops over `[...calls, ...calls]`, which makes four uploads.
- F2b: `l1Step` drops `refusalPageJudge`.
- F2c: no `CHECK UP-L1 build` line.
- F2d: the build judge is left out of the ROW verdict.
- F2e: no `resetPage` before each call.
- F1d: `FIXTURE_HOST_18` loses its end anchor.
- F1f: userinfo is stripped before the host test.
- F8b: `Get-S12UrlClass` loses `([/?#]|$)`.
- F6b: `realIo.signal` is non-atomic again.

## 4. Findings

### F-A MAJOR (failed exit check): the F2 tie does not prove "exactly two calls" or "the same checks"
**Where:** `recipes/test/s12-helpers-b-fix.test.ts:55-83`; `recipes/s11b.ts` `l1Step` and `rawL1`.

The code is right. I read `rawL1` against `S11 l1` (`s11.ts` `async l1()`) line by line:
- the same `daemon.status.build` check against the sha256 of `daemon/dist/index.js`;
- ONE `raw-root` call (`s11-1k.bin`, no target) and ONE `raw-outside` call (`#up-single`, `s11-out.bin`), each after
  `window.__s11.reset()`;
- the same method (`uploadFiles`), params and 60 s timeout;
- the same judges, `all([judgeError(err,"K-gate"), refusalPageJudge(page)])`, and the same `checkLine` and `rowLine` from
  `s11-rules.ts`;
- the same STOP.

So it prints `CHECK UP-L1 build …`, the two `CHECK UP-L1 raw-root|raw-outside …` lines, each call's `RAW R18-UP-L1 …`, and
`ROW UP-L1 …`, as the handoff names them.

The ruling, though, asks for `raw-l1` to be "tied to `S11 l1`'s calls and checks by test". The test says it checks "the same
two calls … and the same checks", but five weakening mutants pass it (F2a–F2e). Two matter most:
- F2a doubles the uploads, which is the defect verifier 1's F2 was about.
- F2b drops the reporter check ("reporter 0 files; mark never set"), so a file reaching the page would pass `l1Step`.

Why the test misses them:
- The count tie (`uploadFiles` once in the source) does not bound how often the loop runs.
- The judge tie reads only `s11.ts`, never `l1Step`.
- The `l1Step` tests use an empty page, so they cannot tell whether the page judge is there.

**Fix (test only):**
- Tie `l1Step`'s source: assert it contains `all([judgeError(err, "K-gate"), refusalPageJudge(page)])`.
- Add an `l1Step` case with a page that holds a file (or `markAdded: 1`) under a K-gate refusal, and expect FAIL.
- Tie the loop: `for (const [label, target, name] of calls)` in `rawL1`, with `calls` holding exactly the two tuples.
  Better: factor the step list into an exported constant and assert its length is 2.
- Tie the `say(checkLine11("UP-L1 build"`, `j.push` / `all(j)` and `resetPage` lines.

### F-B MINOR: the scanner's boundary cases are right but untested
**Where:** `recipes/s12-rules.ts` `FIXTURE_HOST_18` and `isFixture18`; `recipes/s12-win.ps1` `Get-S12UrlClass`; tests
`s12-helpers-b-fix.test.ts:41`, `URL_TABLE` in `s12-helpers-b.test.ts`.

**Evidence:** the attack table (ev., `npx tsx attack.ts`) runs `scan18` against s11's `scanText` and s9's `scanCounts`.
`scan18` classes each of these as other:
- `HTTP://evil.example`;
- `chrome-extension://<other id>/`, and the own id plus one character;
- `http://127.0.0.1:8081.evil/`;
- `http://localhost:80810/`;
- `http://localhost:8081@evil.example/` and `http://user@localhost:8081/`;
- `:8081:9234`, `[::1]:8081`, `https://localhost:8081`;
- `chrome://extensionsx`, `localhost.:8081`, `x.http://localhost:8081`;
- 8080, 8083 and 8084.

So `scan18` is at least as strict as `scanText` on every case. It is looser than s9 only in these places:
- the bare `://` (ruled);
- `127.0.0.1:8081`, `*.localhost:8081` and an upper-case `LOCALHOST:8081` (§4.26's definition);
- `localhost:8081?q` and `#f` (§4.26's host-only definition);
- `localhost:8081,evil.example`. This is not a valid URL, `scanText` does the same, and NIT-level.

It is stricter than s9 on 8080, 8083 and `chrome://extensionsx`. No real `scheme://host` leaks.

None of the boundary cases the brief names is in a test, though: F1d, F1f and F8b go green. The `$` anchor and the PowerShell
`([/?#]|$)` are exactly what stops `8081.evil` and `80810`.

**Fix:** add `http://127.0.0.1:8081.evil/`, `http://localhost:80810/`, `http://localhost:8081@evil.example/`,
`HTTP://evil.example/` and `chrome-extension://<own id>x/` to `URL_TABLE` (both twins), and to the scan18 "other" list.

### F-C MINOR: `scan18` dropped `scanText`'s backslash stop, so a JSON-escaped fixture URL counts as other (a false STOP)
**Where:** `recipes/s12-rules.ts` `scan18`, the regex `/[a-z][a-z0-9+.-]*:\/\/[^\s/'"`<>)\]\,;]*/gi`, and `isFixture18`'s host
class `[^\s/"'`)<>\?#,;\]]+`.

Against `s11-rules.ts:504, 517`, both classes lost the `\\` (a backslash). This is likely the backslash-loss trap in memory.

**Evidence (ev.):**
- `http://localhost:8081\evil` gives `scan18 other=1` but `scanText fx=1`.
- `\"http://localhost:8081\"` (a fixture origin inside a twice-encoded JSON string) gives `scan18 other=1` but
  `scanText fx=1`.

This is stricter, so it is no leak. But R18-LOGS makes a non-zero count a STOP, and actors' results are JSON. The fixer's
claim that it "reuses `scanText`" holds for the token, sentinel and profile counts, not for the URL walk.

**Fix:** restore `\\` in both classes, matching `scanText` and `isFixture11` character for character, and add the
`\"http://localhost:8081\"` case.

### F-D MINOR: the new invalid-item regex also counts the block list's invalid lines
**Where:** `recipes/s11-win.ps1:296-297`; `extension/src/options.ts:82` and `:126`; `extension/options.html:45, 59`.

The Upload folders list (`#uploadfolders-invalid`) and the Blocked sites list (`#invalid-lines`) print the same form,
`Line n: “…” — reason`. `Find-S11Texts $doc` searches the whole options page. So `invalid items` reads fi + 3 + (the found
block list's invalid lines).

§4.26 (6) expects `<fi+3>`. A found block list with one invalid line would therefore FAIL R18-UP-OPT on helper text. The
recorded found block lists were all `lines=0`, so the risk is low. R18-0's `STATE` line does not print the block list's
invalid count, so nothing guards it. HEAD's regexes were keyed on the typed texts and did not have this problem.

**Fix:** search only under `uploadfolders-invalid` and `uploadfolders-warned` (`Get-S9ById`), or STOP when the found block
list's invalid count is non-zero. Add a stub page with a block-list item to the PowerShell test.

### F-E NIT: F6's Node half is untested
`realIo.signal`'s `.tmp`-then-rename (F6b green) has no tie. The PowerShell 200 ms retry, which is tested (F6a red), covers the
risk on its own, so a static `toContain` is enough.

### F-F NIT (a §4.26 wording finding; I did not edit it): the sheet's Helper cells name the replaced helpers
- `R18-UP-L1`'s Helper cell reads `S11 foundcheck`, `S11 l1`. The F2 ruling replaces that with `S11 foundcheck`,
  `s11b raw-l1`.
- `R18-LOGS`'s cell names `S9 scan-log`, `S9 scan-file`, `S11 scan`, where the F1 ruling uses `s11b scan18`.

The "Aggregator fixes" clause still gives Run 17b's own-page diagnosis (verifier 1's F1). These are for the step agent or a
dated note.

## 5. Points the brief asked about

- **F1:** fixed in the lane, s9-rules.ts untouched.
  - The token, sentinel and profile are counted by `scanText` itself (the `...scanText(text, ctx)` spread). F1h is red.
  - `://` counts `scheme://host` only, with the bare `://` neither fixture nor other. F1b is red.
  - The classes follow §4.26's definition (8081 only, both loopback names, `*.localhost`, `chrome://extensions`, the own
    id). F1a, F1c and F1e are red.
  - The `SCAN` form is unchanged.
  - Subcommand exits: 2 on a count, 3 on NOT MEASURED (F1g red).
  - The fixer's "the URL count +1" mutant was "not run". I ran F1b and F1h in its place.
- **F2:** the code is correct and makes exactly two raw calls with `S11 l1`'s params and checks (§4, F-A). The test does not
  prove it.
- **F3:** all five are proven red. M8, M9 and M15 ran in PowerShell, not by grep.
- **F4:** red, and `ROW SAVE-REFUSE-R sdk-leg PASS` / `mcp-leg FAIL` give two ids and no WARN.
- **F5:** M22 and M23 are red through `main`. M24 is a static tie only (folded into F-A).
- **F6:** the PowerShell guard is proven. The Node half is a NIT.
- **F7:** the comment at `s11b-win.ps1:352` is updated, and Run 16's runner is declared retired for UP-OPT in the fixer's
  report. That retirement needs the step agent's acceptance, recorded where Run 16's runner is described.
- **F8:** `Get-S12UrlClass` and `isFixture18` agree on the 11-URL table (F8a and F8c red). The boundaries are untested (F-B).
- **Size:** code 252, tests 350, total 602, as stated. The numbers only, as briefed.

## 6. For the fixer (round 2)

1. **F-A:** the `l1Step` judge tie, a page-with-file FAIL case, and a tie on the loop (or an exported two-step list).
2. **F-B and F-C:** the boundary URLs in both twins' table, and `\\` restored in `scan18` and `isFixture18`.
3. **F-D:** scope the item search to the Upload folders lists.
4. **Afterwards:** re-run F2a–F2e, F1d, F1f, F8b and a backslash mutant, and show them red.
