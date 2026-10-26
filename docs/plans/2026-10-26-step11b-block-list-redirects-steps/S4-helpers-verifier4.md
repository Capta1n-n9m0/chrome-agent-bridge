# S4-helpers verifier 4: re-check after fix round 3

Opus 5.5, medium effort, 2026-10-27. Read-only: I edited no file in the lane, and my only outputs are scratch files and this report.

**What I audited.** I checked the claims in `S4-helpers-fixer3.md` against verifier 3's findings m3-1, m3-2, n3-1 and n3-2 in `S4-helpers-verifier3.md`.

**What I read.**
- The sheet, §4.24 (`docs/e2e-test-plan.md` lines 1552–1662): the pass rules, the STOP rule, and the rows RD-0, F-FILETAB, RD-7 and RD-8.
- `recipes/CLAUDE.md`.
- In `recipes/s11b-r17.ps1`: the `rd7`, `rd8` and `f-filetab` blocks, `Read-R17Rules` and `Invoke-R17Node`.
- In `recipes/s11b-win.ps1`: `Start-`, `Complete-` and `Invoke-S11bConsoleEval`.
- In `recipes/s11b.ts`: `writeExpr`, the `rules` and `ctx` console subcommands, `session`, `reportFileTabRows` and `filetab`.
- In `recipes/s11b-rules.ts`: `judgeFileTabHidden`.
- In `sdk/src/client.ts`: `TabInfo` and `tabs()`.
- The new and changed tests in `s11b-fix-static.test.ts` and `s11b-fix-rules.test.ts`.

## 1. Verdict: PASS-with-notes

- No CRITICAL, MAJOR or MINOR finding, and every exit check passes.
- m3-1 and m3-2 are fixed as claimed.
- The NITs n3-1 and n3-2 are done.
- The two changed fixer-2 tests were changed for a real reason and are not weaker.
- Two new NITs follow, in §4.

## 2. Re-runs

| Check | Result |
|---|---|
| `npm test` (main tree) | `Test Files 177 passed (177)`, `Tests 4472 passed (4472)`, exit 0 |
| Count derivation | Before the slice: 4158 tests in 161 files. The 16 `s11b-*` files alone: `16 passed`, `314 passed`, none skipped (verbose run: 0 `↓`), so the PowerShell stub tests ran. 4158 + 314 = 4472 and 161 + 16 = 177. Fix round 3 added 8 (306 → 314). No tracked test file is modified, so none was removed. |
| `npx tsc --noEmit -p` on all seven `recipes/tsconfig*.json` (fe, base, s10, s11, s11b, s6, s9) | exit 0 each |
| `.ps1` parse (`Parser::ParseFile`) | `recipes\s11b-r17.ps1 errors=0`, `recipes\s11b-win.ps1 errors=0` |
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0, `built extension → dist/` |
| `git status --short` after the build | Tracked changes: only `journal.md` and `recipes/tsconfig.s6.json` (1 line changed, the exclude list accepted before). Everything else is untracked slice files. |
| `R17 -Block plan` | exit 0. `PLAN liveA` and `PLAN liveB` print in the sheet's order, with `f-filetab` and `rd7` in place. `PLAN not built:` is empty. |
| `B17 filetab --dry` | `PLAN filetab ok reads the tab list; prints labels and counts only`, exit 0 |
| `git diff HEAD -- docs/e2e-test-plan.md recipes/s9* recipes/s11-* recipes/s11.ts extension sdk daemon mcp shared` | Empty (0 lines) |

### Mutation proof

**Method.**
- I made a scratch copy from `git ls-files -co --exclude-standard`, without `bridge.token`, `.git` or `node_modules`. The `.ps1` files came over with LF endings, so the CRLF gotcha does not apply.
- I linked `node_modules` by a junction and removed it with `cmd /c rmdir` before deleting the copy. The main tree's `node_modules/.bin` still has 42 entries.
- For each mutant I applied it, ran the 16 `s11b-*` files, then restored the file.
- Both the baseline before and the baseline after are green.
- The script is `scratchpad\v4\mutate.mjs` and its output is `mut-out.txt`.

| Mutant | Result |
|---|---|
| RD-7 probe and its re-check removed | KILLED |
| re-check removed only (the probe kept) | KILLED |
| probe moved to after `New-R17Tab` | KILLED |
| re-check without its `return` | KILLED |
| CTX `if ($c -eq 10) { R17Fallback = $true }` removed | KILLED |
| CTX FALLBACK set on `-eq 3` instead of 10 | KILLED |
| `f-filetab`'s `@('filetab')` call removed | KILLED |
| `judgeFileTabHidden`: url check dropped | KILLED |
| title check dropped | KILLED |
| `reason !== "blocked"` check dropped | KILLED |
| `hid.length !== 1` changed to `< 1` | KILLED |
| an empty string counted as a url (`v !== ""` dropped) | KILLED |
| the line always prints `url=no` | KILLED |
| `reportFileTabRows` without its TABSHIDDEN line | KILLED |
| `ctx`: `if (c.count > 0 && tabs !== 0)` (n3-1) | KILLED |
| only `hidden === "blocked"` rows counted as hidden | SURVIVED (NIT n4-1) |

## 3. Per item

### m3-1 (RD-7 probe): fixed

**The order in `$Blocks['rd7']` (`s11b-r17.ps1:586-605`) is now:**
1. The fixer-2 guard.
2. `Read-R17Rules`, the probe.
3. The re-check, which prints the same NOT RUN line, counts it with `S16NM++` and returns.
4. Only then `New-R17Tab`, then the navigate.

**Every way the probe can fail stops RD-7 before its tab.** I traced each return code of `Read-R17Rules` → `Invoke-S11bConsoleEval` → `Start-` / `Complete-S11bConsoleEval`:
- **10 (FALLBACK).** A marker that was not typed, a marker not seen within 8 s, an expression that was not entered, or a read that timed out. Each sets `R17Fallback`, so the re-check returns.
- **2, or a RULES count above 0.** `Stop9` then `throw 'stop'`. This is the existing `rules-stuck` STOP, and no navigate follows.
- **3 is not reachable from the probe.**
  - Phase 1 (`writeExpr`) exits only 0 or 2.
  - The plain `rules --read` gives 3 only through `noLine`. `Complete-S11bConsoleEval` treats a `NOT MEASURED: no …` result as "keep polling", and then as 10 at its bound.
  - So the `S16NM++; return` branch of `Read-R17Rules`, which falls through to the tab, cannot follow a console failure here.

**Nothing is typed before the tab except the probe.** It types two things:
- the marker `void console.log("S11B-MARK <ms>")`;
- the file that `B17 rules --expr` wrote after `preTypeCheck`. `writeExpr` exits 2 on a pattern and writes nothing.

The static test pins exactly one `Read-R17Rules` before the tab. It also pins that no `Enter-S11bConsoleText`, `SendKeys`, `Start-` or `Invoke-S11bConsoleEval` stands there.

**After the navigate, only the stated race remains.**
- The post-navigate `Read-R17Rules` and the CTX eval can now be the first place the console is lost. That is the probe-to-CTX race the fixer named for S4-live.
- `$c -eq 10` at CTX now sets `R17Fallback`, so later rows (RD-8 onward) see it. Both the stub test and the mutants confirm this.

**The CTX text (n3-2).** The line now reads `CTX NOT MEASURED (see the line above)`. On exit 10 the line above is `FALLBACK: console eval unavailable`. On exit 3 it is B17's own `NOT MEASURED: CTX matched 0 tabs …` or `no CTX line …`. Both read correctly.

**RD-8 is unchanged.** It still makes no console call and holds no `R17Fallback`, and its snapshot STOP stands as it was.

### m3-2 (F-FILETAB hidden row): fixed

**`judgeFileTabHidden` (`s11b-rules.ts:849-863`) matches the sheet's clause.** The clause reads: "the row has `hidden=blocked`, no `url`, no `title` (exactly one hidden row; else NOT MEASURED)".
- Hidden rows that number other than 1 are NOT MEASURED (`nm17`).
- With exactly one, the row passes only on `hidden=blocked` with an empty or absent url and title. Anything else fails (`bad17`).

**It prints no URL and no title.**
- The line is `TABSHIDDEN F-FILETAB rows=<n> hidden=<n>[ reason=<blocked|disarmed|other> url=<yes|no> title=<yes|no>]`.
- The reasons are fixed strings.
- The tests check that neither a planted `secret` url nor a `Private` title reaches the line or the reason.

**`B17 filetab` reads only the tab list.**
- It uses `session("s11b-filetab", …)` with `failureReports: false` and calls `c.tabs()` alone. It claims no tab and makes no state change.
- `judged` prints `ROW F-FILETAB tabs hidden row PASS|FAIL|NOT MEASURED: …` and exits 0, 1 or 3.
- `Invoke-R17Node` counts exit 1 as a failure, because a `ROW` line is present, and exit 3 as NOT MEASURED.

**Its place in the block is safe.**
- It runs after the `F-FILETAB tabs` judge and before `Close-S11Window $FW`, while the file window is still open.
- It changes `$global:R17Out`, but every later `Invoke-R17Row` follows its own `Call9`, so nothing reads a stale output.

**The misleading RECORD line is gone.** `RECORD F-FILETAB tabs hidden row … NOT MEASURED` and its `S16NM++` are removed (`grep` finds no `RECORD F-FILETAB tabs hidden`).
- The only F-FILETAB NOT MEASURED left is `tabCreated url-empty`, a RECORD clause the round did not touch.
- So the ★ row can now PASS: all its pass clauses are judged in-lane.

**The SDK passes the facts through.**
- `BridgeClient.tabs()` (`sdk/src/client.ts:391-405`) normalises a missing `url` or `title` to `""` and keeps `hidden` only when it is a known reason.
- So "absent" and `""` cannot be told apart, and `reason=other` cannot occur through the SDK. Both are harmless: an empty string is "no url", and an unknown reason would count as not hidden.

### The two changed fixer-2 tests: changed for a real reason, not weaker

- **"exactly one `return` before the tab" is now "two".**
  - Its other assertions are unchanged: the guard's exact text, and the guard standing before `New-R17Tab`, `Call9` and `Invoke-S11bConsoleEval`.
  - The new fixer-3 test pins that both returns are the exact NOT RUN guard, so the count of 2 cannot hide a stray `return`.
- **The F-FILETAB test.** It used to pin the removed RECORD line. Now it pins the `filetab` call, its place after the tabs judge and before the window closes, and that both old forms are absent. It checks more than before, and the call-removal mutant is killed.

### NIT n3-1: done

The CLI test (`CTX t1 tabs=0` with `count=1` gives exit 2) kills verifier 3's surviving mutant.

### Regressions

None found:
- Fix round 3 touched only these: the RD-7 probe and re-check, the CTX FALLBACK line and its text, the `filetab` call, the removed RECORD line, `judgeFileTabHidden`, `FileTabListRow`, `reportFileTabRows`, `filetab` and its `SUBCOMMANDS` entry, and the tests.
- The other `s11b-*` tests, the full suite, all seven tsconfigs, the parse checks, the plan and the build are green.
- The product-tree diff is empty.

## 4. New findings

### n4-1 · NIT · `recipes/test/s11b-fix-rules.test.ts:433`: a single `hidden=disarmed` row is checked only as `pass === false`

- **The gap.** The mutant that counts only `hidden === "blocked"` rows as hidden survives. Under it, a lone disarmed row becomes NOT MEASURED ("0 hidden rows") instead of FAIL.
- **Why it hardly matters.** RD-0 requires the bridge to be armed before F-FILETAB. When disarmed, every row is hidden, so the count is above 1 and the row is NOT MEASURED either way.
- **Suggested fix.** Also assert `notMeasured` is undefined and the line holds `reason=disarmed`.

### n4-2 · NIT · `docs/e2e-test-plan.md:63` (F-FILETAB Helper column): `B17 filetab` is not named

- **The gap.** The sheet's helper cell names `R17 f-filetab (S9 call … tabs, … snapshot blocked1, … navigate), Open-S11bFileWindow`. It does not name the new `B17 filetab` read, which now judges the `tabs` clause beside S9's totals.
- **Why it is only a NIT.** The sheet is frozen, so this is not a defect of the helper.
- **Suggested fix.** S4-record should state in the record that the row's `tabs` clause has two judged lines (the fixer's own note), and that the client `s11b-filetab` is a wave actor.

## 5. Handoff

- **Nothing is left running.**
  - I started no Chrome, daemon, python or server.
  - `Get-NetTCPConnection` shows no listener on 8081–8091 or 9234.
  - The only `node` processes were vitest, tsc, the build and `B17 filetab --dry`, which connects to nothing. All have exited.
- **The scratch tree is deleted.** I removed its junction with `cmd /c rmdir` first, and the main `node_modules/.bin` count is unchanged at 42.
- **Evidence** is in `C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\db8eb024-74ec-4214-a9db-b9aacafe8f57\scratchpad\v4\`: `checks.txt`, `npmtest.txt`, `s11b.txt`, `mutate.mjs` and `mut-out.txt`.
- **Open for later stages:**
  - RD-7's race between the probe and the CTX read (S4-live notes);
  - n4-2 (S4-record);
  - the `stored` timing edge carried from n-new-3 (S4-live).
