# S4-helpers verifier 2: re-check after fix round 1

Model Opus 5.5, effort medium. 2026-10-27. Read-only: my only outputs are scratch files and this report.

Audited: `S4-helpers-verifier.md` (the findings) and `S4-helpers-fixer.md` (the fixer's claims). The sheet is
`docs/e2e-test-plan.md` §4.24, lines 1552–1662, and I read it whole. I also read the runner blocks and the functions
each finding names in `recipes/s11b-r17.ps1`, `s11b-win.ps1`, `s11b.ts` and `s11b-rules.ts`.

## 1. Verdict: FAIL

One MAJOR finding: on the console-FALLBACK branch, RD-7 has no way to STOP. The sheet says that on this branch "only
the UIA read can stop", and the UIA read is not built. The fix is small; §5 gives two options.

Everything else holds:
- M1–M5 and m1–m6, n1, n2 and n5 are fixed.
- 28 of my 29 mutants are killed.
- The survivor is a weak test fixture, not a code fault (m-new-2).
- No regression found.

## 2. Re-runs

| Check | Result |
|---|---|
| `npm test` (main tree) | `Test Files 177 passed (177)`, `Tests 4460 passed (4460)`, exit 0 |
| Count derivation | Before the slice: 4158 tests in 161 files. The 16 `s11b-*` files run alone: `16 passed`, `302 passed`. 4158 + 302 = 4460 and 161 + 16 = 177. The fixer's +54 tests in 2 files is right: 248 → 302, 14 → 16. No tracked test file is modified (`git status`), so nothing was removed. |
| `npx tsc --noEmit -p recipes/tsconfig*.json` (seven configs) | Exit 0 for each of fe, base, s10, s11, s11b, s6 and s9 |
| `.ps1` parse (`Parser::ParseFile`) | `s11b-r17.ps1 errors=0`, `s11b-win.ps1 errors=0` |
| `npm run typecheck` | Exit 0 |
| `npm run build` | Exit 0, `built extension → dist/` |
| `git status --short` after the build | Tracked changes: only `journal.md` (not this slice) and `recipes/tsconfig.s6.json`. The rest is untracked slice files. |
| `R17 -Block plan` | Exit 0. Both slice orders print, and `PLAN not built:` is empty. |
| `git diff HEAD -- docs/e2e-test-plan.md recipes/s9* recipes/s11-* recipes/s11.ts extension sdk daemon mcp shared` | Empty |
| `recipes/tsconfig.s6.json` | Its only change: 14 exclude names were added, including the two new test files. Accepted as before (n4). |

**Mutation proof.** I copied the tree to scratch and linked `node_modules` by a junction, which I removed with
`cmd /c rmdir` afterwards. Each mutant was applied, then the 16 `s11b-*` test files were run, then the mutant was
restored. Script: `scratchpad/v2/mutate.mjs`; output: `mut-out.txt`.

**Killed: 28 of 29.**
- M1: no record route; chatter sent to the record; router matching only `MANIFEST`.
- M2: the `lines=` form.
- M3: alias not taken from state.json; console scan without `--alias`; no `--sock-console`; `sockMarksMissing`
  ignored.
- M4: no linger.
- M5: filepage judged against K-fileurl; control navigate removed; tabs-hidden accepting any count.
- m1: err judged as needing INTERNAL; LAT +1; a null RULES read passing.
- m2: RD-7 with no RULES read.
- m3: no cancel write.
- m4: no tree check at RD-LOGS; double restore; no `throw` after the rules-stuck STOP; hop `ok` not a STOP; covered
  `ok` not a STOP.
- m5: narrow title regex.
- m6: `u8` in setup; history key `rb`.
- n1: substring CTX filter.
- n2: no `--only blocked`.
- n5: band edge moved from −350 to −340.

**Survived: 1.** Swapping `valid` and `invalid` in `stateCmd` (m-new-2).

## 3. Per finding

- **M1 · fixed.** `rd0` now opens with the guard, then `$env:S9_RAW = $Framing; $global:S11bRecordFile = $Record`, then
  the manifest eval.
  - `Write-S11bB17Out` sends only `^(MANIFEST |ROW )` lines to the record; the `# s11b-print-ok` site is still the
    single one.
  - The toggle read, `Save-S11Found` and `S11 found` run under `$Framing`.
  - FALLBACK branch:
    - `Write-S11bFallback` and the notice go to the framing file.
    - `Invoke-R17CapsWarn -First` sends its typing chatter to the framing file, then its judged ROW to the record.
  - This matches RD-0: "(a) … the first line of the record"; (a') is "the record's first line in place of (a) and
    (b)".
  - The PowerShell-run router test and the order test kill 3 of 3 mutants.

- **M2 · fixed** (one weak test: m-new-2). `B17 state` prints
  `STATE armed=<b> evaluate=<b> blocklist lines=<bl> uploadfolders valid=<f> invalid=<fi>`, matching the sheet's form
  character for character. It prints no hash.
  - `valid`/`invalid` come from `analyzeUploadFolders(found-uploadfolders.txt)`, and `TOGGLE reading <on|off>` comes
    from `found.json.toggle`. `Save-S11Found` writes that field (`s11-win.ps1:227`).
  - Not armed with JavaScript on, or an unreadable toggle, gives `stop17` (exit 2). The runner uses `-StopOnFail`.

- **M3 · fixed.**
  - (a) `B17 scan` takes `--alias`, else the alias in `state.json`. A missing alias prints NOT MEASURED
    (`aliasKnown`). The runner passes it to all three scans; `Invoke-R17Node` never prints its arguments.
  - (b) `rd-dl-socket` types `S11B-SOCK-START`/`-END` through `B17 mark`, which runs the pre-type check. It records the
    `daemon.log` line counts relative to `S16Mark`. `rd-logs` passes `--sock-console` / `--sock-lines` only when the
    row ran. Missing marks or bad counts print NOT MEASURED.
  - (c) `scan --what actors` walks `actors/*.turn-*` with S11's `resultLines`, and `S11 scan` is no longer called.
  - The scan line equals the sheet's RD-LOGS form: `scanLine17` has the same keys in the same order.

- **M4 · fixed, and no regression.** `storedListen` takes its verdict and signal at the match. It then answers 204
  until the first POST + `forMs` + 1 000 ms.
  - The typed poller loops for `forMs` from its own start, which is no later than the first POST. So every POST it can
    send reaches a live listener.
  - The poller URL is built from fragments (no contiguous `://`, pre-type checked). With no listener closed under it,
    no failed-request line naming `127.0.0.1:<ephemeral>` can reach the capture.
  - Bodies after the verdict are not stored. `STORED match=… lines=<n>` is the only output: no list text and no hash
    (`s11b-cli` asserts neither the sha nor `alpha` appears).
  - RD-5's restore now runs after the `stored` node ends, so after the poller is over.
  - The "no linger" mutant is killed by the POST-150-ms-after-match test, which expects 204 and then a refused port.

- **M5 · fixed, with one clause unjudged** (m-new-1).
  - `tabs` (exactly one `hidden(blocked)`, else NOT MEASURED), `snapshot` and `navigate` are judged K-filepage.
  - A second `tabs` checks the tab is untouched.
  - The control navigate of a fixture tab `ft` to the `file:` URL goes in as an argument and is never printed. It is
    judged K-fileurl.
  - `judgeCallAnswer` gained `filepage`/`fileurl`, tied to K17.
  - The `tabCreated url-empty=<b>` RECORD prints NOT MEASURED; see §4.

- **m1 · fixed.**
  - `judge-row` reads S9's own `ROW … (<ms> ms)` and prints `LAT RD-DL-HOP-<i> <ms> ms`. That is the sheet's form,
    with no prefix or suffix from B17.
  - RD-DL-ERR passes any code that is not DOMAIN_BLOCKED and records a text other than K-fetch.
  - A value that was never read turns a pass into NOT MEASURED.
  - `dl-record` wires `dlHopD` and `dlHopReading`.
  - `LAT RD-1` and `LAT RD-3` are printed.

- **m2 · RULES part fixed; UIA part open.** RD-7 and RD-8 read `RULES` right after the navigate reply. For the UIA
  read, see §4 and M-new.
- **m3 · fixed.** On a timeout the `stored` node writes `--cancel`. `awaitGo` returns `cancel`, the call prints NOT
  MEASURED and exits 3, and the hits are not judged.
- **m4 · fixed.**
  - `covered-proceeds-hop`, `-rd5` and `-rd5b` are STOPs (`stop17`, exit 2, and the runner throws).
  - `Assert-R17TreeClean` runs at the preflight and at the end of RD-LOGS.
  - Both survivors of round 1 (the double restore and the missing `throw`) are now killed.
- **m5 · fixed.** `clean-console` runs before every scan, and `scan --what console` also drops title lines. Both
  `DevTools - <profile>` and `… - Google Chrome` are dropped.
- **m6 · fixed.**
  - `S11 setup --only l1,u6,j7,a7,sv,raw,ra` exists in `s11.ts:450`. It covers `NEEDS` for `l1`, `up7` and
    `saverefuse-*`, and the `handleOf` keys of `s11b.ts`: u6, raw and ra. `x` is set up inside `r17-up-devt`.
  - No `u8` is set up, so nothing loads on 8084.
  - The history keys are `hb`, `hf`, `hs` and `he`, none of which is a `TAB_SPEC` key.
- **n1 · fixed.** The query value is compared whole, on `url` or `pendingUrl`.
- **n2 · fixed.** RD-BACK and RD-FWD print `HITS bk blocked=<n>`.
- **n5 · fixed.** The band edges are asserted, and the edge mutant is killed.

**The two changed existing assertions are legitimate:**
- CTX: `tabs=2 count=3` became `tabs=1 count=1`. The old value came from the substring bug n1 named: the fixture's tab
  7 (`?s11b=rd7p`) matched `rd7`. Under the whole-value rule only tab 8 is the row's tab, and that tab has one context.
  The test still proves the options context (tab 5) and other tags (tab 9) are excluded. It is not weaker.
- `stored --for 300`: `--for` used to default to `--timeout`, which was 5 000 ms. With the linger, each test would take
  6 s, so the tests pass `--for 300` and assert `storedExpression(port, 300)`. The assertion is the same, with the new
  parameter value.

## 4. The two NOT MEASURED items, judged against the sheet

**M5 `tabCreated url-empty=<b>`: consistent with the sheet, no STOP hidden.**
- It is a `RECORD` clause. Such clauses "pass by being recorded" and are never judged.
- I checked the client path. `tabCreated` reaches only the daemon: `daemon/src/wsHost.ts:191-197` broadcasts only
  `safetyStatus` / `extensionStatus`, and `handles.ts:104` keeps only url/title for its own use. No log line carries
  the params.
- So reading it would need product code, which is outside the lane. NOT MEASURED, with a reason and `S16NM++`, is the
  honest line.

**m2 RD-7 UIA read: not consistent on the FALLBACK branch.** See M-new.

## 5. New findings

### M-new · MAJOR · `recipes/s11b-r17.ps1` `rd7` (the `Invoke-S11bConsoleEval … 'ctx'` line and the `UIA read … NOT MEASURED` line) — on FALLBACK, RD-7 cannot STOP

- **The sheet's rule (RD-7):** "**STOP only on proof the page rendered:** `CTX count` > 0 for that tab, or the options
  page's own content (its heading `Chrome Agent Bridge`) read by UIA in the tab's window … Without the console `CTX`
  is NOT MEASURED and only the UIA read can stop."
- **Console branch: no STOP hidden.** `CTX count > 0` stops the wave (exit 2 → `Stop9` → throw), and an extension TAB
  context exists exactly when the page rendered.
- **FALLBACK branch: the STOP is hidden.** The `ctx` eval returns 10, and the block prints `CTX NOT MEASURED` and
  `UIA read … NOT MEASURED`. The navigation to `chrome-extension://<id>/options.html` still runs. Nothing in the block
  can stop it, so a rendered own page would not end the wave.
- The sheet says outright that this branch depends on the UIA read. Leaving the read unbuilt therefore removes a STOP
  the sheet requires on that branch.
- The FALLBACK is a known live possibility: the sheet's own known limits say console entry by UIA is unmeasured on
  Chrome 156.
- **The fixer's reason holds in part.** `tabs.create` (`extension/src/handlers/tabs.ts:83`) has no `windowId`, so `r7`
  may open in any normal window, including one the human owns. A UIA read there would break "only windows the wave
  opened".
- **Suggested fix** (the step agent picks; either is undoable):
  - **(a), the conservative option:** on `$global:R17Fallback`, RD-7 prints
    `ROW RD-7 NOT RUN - no stopper without the console (the UIA read is not built)` before any call and does not
    navigate. Record it as a proposed decision. Test it statically, with a mutant that removes the guard.
  - **(b):** build the read. Tie `r7` to a wave window, for example by the `windowId` that S9's tab rows carry
    (`s9-rules.ts:238`), matched to a window the wave opened. Then read the tab strip or the document by UIA. Treat a
    `r7` that is not in a wave window as NOT RUN.

### m-new-1 · MINOR · `s11b-rules.ts` `judgeFileTabRow` — F-FILETAB's "no url, no title" is not judged

- The sheet expects: "`tabs`: the row has `hidden=blocked`, no `url`, no `title`."
- The judge checks only `hidden(blocked)=1` from S9's summary.
- S9's summary has only totals (`withTitle`, `withUrl`), so it cannot isolate the hidden row.
- **Fix:** have `B17` read the `tabs` rows itself and check the one hidden row for no url and no title, printing
  counts only. Otherwise print that clause NOT MEASURED, not a silent pass.

### m-new-2 · MINOR · `recipes/test/s11b-fix-rules.test.ts:158-165` — the `B17 state` CLI test cannot tell `valid` from `invalid`

- The fixture text has 2 valid and 2 invalid lines, so swapping `valid: f.folderCount, invalid: f.invalidCount`
  survives (`302 passed`).
- The code is right as written.
- **Fix:** use an asymmetric fixture, for example 3 valid and 1 invalid.

### NIT
- **n-new-1:** RD-7's `ctx` read judges `count` even when the tagged tab count is 0. Since n1 that can happen, for
  example when the tab stays on `?s11b=rd7p`. Then count 0 is not evidence. Print `CTX … NOT MEASURED` when `tabs=0`.
  The 302 keeps the query, so no rendered page is missed today.
- **n-new-2:** the header comment at `s11b.ts:20` still documents `ctx --tab <chrome tab id>`, but the sub takes
  `--tag`.
- **n-new-3:** if the poller's first POST arrived after `--timeout`, the listener would close at once and a false STOP
  could follow. Today's timings exclude this: the poller is typed within about 10 s of the listener's start, and the
  timeout is 30 s. Name it in S4-live's notes.
- **Still open from round 1, as the fixer said:** the n1 sheet wording (`CTX r7` against `CTX tab=<label>`) and n8
  (`ERR_BLOCKED_BY_CLIENT` in the worker console) go to S4-record and S4-live.

## 6. Handoff

- Nothing is left running.
- The scratch tree was removed after `cmd /c rmdir` of its junction. The main `node_modules/.bin` has 42 entries.
- No python process and no listener on 8081–8091 or 9234. No Chrome, daemon or port was used.
- Evidence is in `C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\db8eb024-74ec-4214-a9db-b9aacafe8f57\scratchpad\v2\`:
  `npmtest.txt`, `checks.txt`, `build.txt`, `mutate.mjs` and `mut-out.txt`.
- **Re-check after the fix:** M-new (with its static test and the guard mutant); m-new-1 and m-new-2 if they are fixed;
  then counts, the seven tsconfigs and the build.
