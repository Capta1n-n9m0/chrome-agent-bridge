# S4-helpers verifier 3: re-check after fix round 2

Model Opus 5.5, effort medium. 2026-10-27. Read-only. My only outputs are scratch files and this report.

Audited: the fixer's claims in `S4-helpers-fixer2.md`, against verifier 2's findings in `S4-helpers-verifier2.md`. I read the sheet's §4.24 (`docs/e2e-test-plan.md` lines 1552–1662), mainly its pass rules, STOP rule, slices, F-FILETAB, RD-7 and RD-8. I read `recipes/CLAUDE.md`. In the changed code I read the `rd0`, `rd7`, `rd8` and `f-filetab` blocks, plus `Read-R17Rules` and `Invoke-R17Flight` in `recipes/s11b-r17.ps1`. I read the console-eval functions in `recipes/s11b-win.ps1`, the `ctx` and `state` subcommands in `recipes/s11b.ts`, and `judgeFileTabRow` in `recipes/s11b-rules.ts`. I read the new and changed tests in `recipes/test/s11b-fix-static.test.ts`, `s11b-fix-rules.test.ts` and `s11b-cli.test.ts`.

## 1. Verdict: PASS-with-notes

- No CRITICAL or MAJOR finding, and every exit check passes.
- M-new is fixed for its stated case: RD-7 does not run when FALLBACK is known before the row starts. One narrower path remains: the console is first lost inside RD-7 itself (MINOR m3-1).
- The `B17 state` fixture now kills the swap mutant.
- F-FILETAB's clause is now honestly NOT MEASURED. Two problems remain (MINOR m3-2):
  - The fixer's reason ("without product changes") is wrong.
  - The `RECORD` prefix puts a judged clause on a line form the sheet says passes.
- The three NITs are done as claimed.

## 2. Re-runs

| Check | Result |
|---|---|
| `npm test` (main tree) | `Test Files 177 passed (177)`, `Tests 4464 passed (4464)`, exit 0 |
| Count derivation | Before the slice: 4158 tests in 161 files. The 16 `s11b-*` files alone: `16 passed`, `306 passed`. 4158 + 306 = 4464 and 161 + 16 = 177. Fix round 2 added 4 (302 → 306), as the fixer said. No tracked test file is modified, so none was removed. |
| `npx tsc --noEmit -p` on all seven `recipes/tsconfig*.json` (fe, base, s10, s11, s11b, s6, s9) | exit 0 each |
| `.ps1` parse (`Parser::ParseFile`) | `s11b-r17.ps1 errors=0`, `s11b-win.ps1 errors=0` |
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0, `built extension → dist/` |
| `git status --short` after the build | Tracked changes: only `journal.md` and `recipes/tsconfig.s6.json`. The latter's diff is still only the 14 added exclude names (n4, accepted before). Everything else is untracked slice files. |
| `R17 -Block plan` | exit 0. Both slice orders print, and `PLAN not built:` is empty. |
| `git diff HEAD -- docs/e2e-test-plan.md recipes/s9* recipes/s11-* recipes/s11.ts extension sdk daemon mcp shared` | Empty (0 lines) |

**Mutation proof.** I made a scratch copy of the tree without `.git`, `node_modules` and `bridge.token`; the token was deleted from the copy at once. I linked `node_modules` by a junction and removed it with `cmd /c rmdir` before deleting the copy. For each mutant I applied it, ran the 16 `s11b-*` test files, then restored the file. The baseline after all restores was `16 passed`, `306 passed`. The script is `scratchpad/v3/mutate.mjs` and its output is `mut-out.txt`.

| Mutant | Result |
|---|---|
| RD-7 guard condition → `if ($false)` | KILLED (1 file fails) |
| RD-7 guard line removed | KILLED |
| RD-7 guard without its `return` | KILLED |
| `stateCmd` `valid`/`invalid` swapped (survived in round 2) | KILLED |
| `ctx --read` tabs=0 branch disabled | KILLED |
| `ctx --read` tabs=0 exits 0 instead of 3 (no `bump(3)`) | KILLED |
| F-FILETAB NOT MEASURED line and its `S16NM++` removed | KILLED |
| RD-8 snapshot STOP regex made unmatchable | KILLED |
| `ctx` STOP made conditional on `tabs !== 0` | SURVIVED (a near-equivalent mutant; see NIT n3-1) |

## 3. Per item

### M-new: fixed for FALLBACK known at the row's start; one narrower path remains (m3-1)

- **The guard.** `$Blocks['rd7']` opens with this line, at `s11b-r17.ps1:590`:
  `if ($global:R17Fallback) { Say9 'ROW RD-7 NOT RUN - no stopper without the console (the UIA read is not built)'; $global:S16NM++; return }`
  - It comes before `New-R17Tab` (the first call), the navigate and every console eval.
  - So when FALLBACK is set at RD-0, or by any earlier row, RD-7 makes no call and changes no state.
- **Every place that sets `R17Fallback` comes earlier in the order, or is RD-7 itself.**
  - RD-0 sets it at line 448 when the manifest eval returns 10.
  - `Read-R17Rules` sets it at line 166. RD-1, RD-3, RD-DL-ERR and RD-DL-HOP all call it, and all run before RD-7 in G1.
  - `Invoke-R17Flight` sets it at line 216.
  - `R17Fallback` is in `$Persist`, so it carries across separate `-Block` invocations.
  - The guard therefore covers every FALLBACK reached before RD-7.
- **The console path is unchanged.**
  - After the guard the block is unchanged from verifier 2's description: tab, navigate, `Read-R17Rules`, 2 s, `tabs`, hits, the `ctx` eval, STOP on exit 2 (the `own-rendered` STOP-MAP line), NOT MEASURED on any other non-zero code, then the UIA NOT MEASURED line and the close.
  - The UIA line's text changed and now names the console CTX as the stopper. Its counting is unchanged.
  - I had no pre-fix copy to diff, because the files are untracked. This is a structural comparison with verifier 2's report.
- **RD-8 does not depend on the console. The fixer's claim holds.**
  - `rd8` holds no `Invoke-S11bConsoleEval` and no `R17Fallback`. Its STOP is `snapshot` output matching `This tab shows a local file`, which is K-filepage (`safety.ts` `FILE_PAGE_MESSAGE`, sheet K17).
  - Since Step 11 the gate refuses every call on a `file:` page with that text. So that refusal is proof the tab's URL reads `file:`, which is the sheet's RD-8 STOP condition.
  - `Read-R17Rules` inside `rd8` is only the RULES clause. Under FALLBACK it prints NOT MEASURED and never blocks the snapshot STOP.
  - A static test pins all three facts, and the regex mutant is killed.
- **The NOT RUN wording is consistent with the sheet.**
  - RD-7 is a RECORD row, not a ★ row.
  - The sheet uses `NOT RUN — <reason>` for rows a precondition skips.
  - `S16NM++` keeps it out of any pass count.
  - The proposed decision (fixer2) is the right vehicle for the stricter reading.

### m-new-2 (`B17 state` fixture): fixed

- The fixture is now 3 valid lines and 1 invalid line (`C:\w\a`, `C:\w\b`, `C:\w\c`, `relative\x`). The test asserts `[3, 1]` and the whole `STATE …` line.
- The swap mutant is now killed. It survived in round 2.

### m-new-1 (F-FILETAB "no url, no title"): now NOT MEASURED, with a wrong reason (m3-2)

- `f-filetab` prints `RECORD F-FILETAB tabs hidden row has no url, no title: NOT MEASURED (…cannot be isolated without product changes)` and adds 1 to `S16NM`.
- **Is NOT MEASURED allowed by the sheet's conventions? Yes, as an outcome, never as a pass.**
  - The pass-rules paragraph says "`NOT MEASURED` never counts as a pass". F-FILETAB's Expected cell names NOT MEASURED as an outcome of the `tabs` clause, though its only stated trigger there is "not exactly one hidden row".
  - So a pass clause of a ★ row may be NOT MEASURED. The row is then NOT MEASURED, not PASS.
  - Because of this one line, F-FILETAB cannot PASS in Run 17 as built. This affects the record, not only this helper; see m3-2.
- The `judgeFileTabRow` judge still checks exactly one `hidden(blocked)` and prints `ROW F-FILETAB tabs PASS (…)` for that part.

### NITs: all done as claimed

- **n-new-1 (CTX over 0 tabs).** In `ctx --read` (`s11b.ts:172-186`):
  - A count above 0 is checked first and is a STOP.
  - Otherwise `tabs=0` prints `NOT MEASURED: CTX matched 0 tabs, …` and exits 3. `rd7` then prints its CTX NOT MEASURED and counts it.
  - A missing `tabs` line behaves as before.
  - Both mutants of the branch are killed.
- **n-new-2 (header comment).** `s11b.ts:20` now documents `ctx --label <l> --tag <t>`, the STOP on count > 0 and the tabs=0 rule. This matches the code.
- **n-new-3 (`stored` timing edge).** It is documented in a comment above the timeout in `storedListen`, as claimed. The behaviour is unchanged.
  - The fixer's statement of the consequence is right. Past `--timeout` the listener has closed, so a late POST is a failed request on a closed port. That can only reach the capture or fail the RD-5 judgement; it cannot make RD-5 pass.
  - It stays in S4-live's notes.

### Regressions

None found:
- The guard, the fixture, the `ctx` branch and the two `Say9` lines are the only changes the fix touched.
- The other 293 `s11b-*` tests, the full suite, every tsconfig, the parse checks, the plan and the build are all green.
- The product-tree diff is empty.

## 4. New findings

### m3-1 · MINOR · `recipes/s11b-r17.ps1:590-600` (`rd7`): a console lost for the first time inside RD-7 reaches the navigate with no stopper

- **The path.**
  1. The guard reads `R17Fallback` once, at the block's start.
  2. The first console eval in the block is `Read-R17Rules` at line 593, after the navigate at 592.
  3. If the console stops taking input exactly there (the mark is not seen in 8 s, or the text is not entered), `Read-R17Rules` sets `R17Fallback` and returns.
  4. The `ctx` eval at line 597 does not check the flag. It returns 10, so the block prints `CTX NOT MEASURED` and goes on.
  - The navigate has already run, and nothing could stop a rendered own page. This is the sheet's FALLBACK case ("only the UIA read can stop") on a row that has run.
  - A `ctx` eval that returns 10 by itself, with `Read-R17Rules` passing, also leaves `R17Fallback` unset for later rows.
- **Evidence:** the order of lines 590–598, and `Start-S11bConsoleEval` / `Complete-S11bConsoleEval -FallbackOnTimeout` (`s11b-win.ps1:207-266`). These return 10 on any mark or entry failure, at any eval.
- **Why MINOR, not MAJOR like M-new.** M-new was certain whenever RD-0 fell back, and the sheet calls that a known live possibility. This path needs a console that worked at RD-0 and at every RULES read in G1 (RD-1, RD-3, RD-DL-ERR, RD-DL-HOP), then fails at RD-7. The step agent may weigh it higher.
- **Suggested fix**, cheap and in the lane:
  - Probe the console right before `New-R17Tab`, for example with a `Read-R17Rules` as a "RULES before" read. Then re-check `$global:R17Fallback`, and print the same NOT RUN line if it is now set.
  - In the `ctx` branch, set `$global:R17Fallback = $true` on exit 10.
  - A loss between the probe and the `ctx` read stays possible and cannot be removed. Name that leftover race in S4-live's notes. Pin both changes with a static test, as the fixer did for the guard.

### m3-2 · MINOR · `recipes/s11b-r17.ps1` `f-filetab` (the `RECORD F-FILETAB tabs hidden row …` line): the NOT MEASURED clause can be avoided in the lane, and its prefix reads as a passing RECORD

- **(a) The reason is wrong.** The fixer says the hidden row "cannot be isolated without product changes". Only S9's printer reduces the rows to totals (`s9-rules.ts:250-264`, `summarizeTabs`/`tabsLine`).
  - The SDK's tab list returns each row with `hidden`, `url` and `title` (`sdk/src/client.ts:184`).
  - `recipes/s11b.ts` is an SDK client in this slice's lane. A `B17` subcommand could list the tabs, pick the one `hidden: "blocked"` row, and print `url`/`title` presence as booleans, which leaks nothing. This is what verifier 2 suggested.
  - As built, F-FILETAB, a ★ row, can never PASS in Run 17, for a clause that is measurable without touching the product.
- **(b) The prefix misleads.** The sheet says "`RECORD` clauses pass by being recorded", but this is a judged pass clause.
  - Next to it, the record will show `ROW F-FILETAB tabs PASS (exactly one tab is hidden as blocked)`.
  - A record writer could add those up to a PASS row.
- **Suggested fix:** build the in-lane read (a), or at least:
  - give the line a non-RECORD prefix (for example `CLAUSE F-FILETAB … NOT MEASURED`);
  - correct the reason to "S9's `tabs` prints only totals";
  - hand S4-record the rule that F-FILETAB's row verdict is at best NOT MEASURED.

### NIT

- **n3-1:** the mutant `if (c.count > 0 && tabs !== 0)` survives. With a real `ctxExpression`, a count above 0 with tabs = 0 cannot happen, because the count is filtered by the matched tabs, so the mutant is near-equivalent. A one-line CLI test (`CTX t1 tabs=0` plus `count=1` gives exit 2) would pin the order the fixer described ("checked first").
- **n3-2:** on `ctx` exit 3 from the tabs=0 branch, `rd7` prints `CTX NOT MEASURED (no CTX line from the console)`. That reason is wrong for this case; B17's own line just before it gives the right one. Change the text to "(see the line above)" or something equally neutral.

## 5. Handoff

- Nothing is left running. I started no python, Chrome or daemon, and nothing listens on 8081–8091 or 9234 (`netstat`: none).
- The scratch tree was deleted after `cmd /c rmdir` of its junction. The main `node_modules/.bin` has 42 entries, unchanged.
- Evidence is in `C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\db8eb024-74ec-4214-a9db-b9aacafe8f57\scratchpad\v3\`: `npmtest.txt`, `checks.txt`, `build.txt`, `mutate.mjs` and `mut-out.txt`.
- Open for later stages:
  - m3-1's leftover race (S4-live notes);
  - m3-2 (b) for S4-record, if (a) is not built;
  - the n-new-3 `stored` edge (S4-live);
  - the n1 sheet wording and n8 (S4-record, S4-live).
