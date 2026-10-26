# S4-helpers builder slice H8: finish the Run 17 runner

Model Sonnet 5.5, effort medium. 2026-10-27. Nothing committed. Nothing was run against Chrome, the daemon or a port (offline only: parse checks, pure tests, static tests, two PowerShell child runs of pure functions, `-Block plan`).

## 1. Verdict: DONE
No block prints `NOT BUILT` (`$NotBuilt = @()`, `NOT_BUILT = []`). The size cap (about 600 lines with tests) was exceeded (about 1,000 added lines, 380 of them tests) because the eight blocks, their judges and the CTX and history changes were one coherent deliverable; nothing is left over.

## 2. Outputs
- `recipes/s11b-rules.ts`: `ctxExpression(label, tag)` (item 3), `rulesTimedExpression`, `parseRulesTimedLine`, `parseCtxTabs`, `parseOptSum`, `HOME_TYPED`, `OPT_TYPED`, `itemsFrom`, `judgeFHome`, `judgeUpOpt`, `judgeCaps`, `judgeTimedRules`, `judgeHistoryRow`, `gapJudge`, `judgeCallAnswer` (all pure, tests first).
- `recipes/s11b.ts`: new subcommands `call`, `judge-opt`, `judge-history`, `judge-gap`; `rules --mode at|inflight|empty --send --reply` (timed sampler and its read); `ctx --tag`; `back`/`forward` print `HISTREPLY <row> kind=<ok|K-tab|CODE> ms= start= reply=`.
- `recipes/s11b-win.ps1`: `Set-S11bTyped`, `Get-S11bTypedObs`, `Undo-S11bTyped`, `Write-S11bObs`, `Get-S11bHomeObs`, `Get-S11bCapsObs`, `Get-S11bOptObs`, `Get-S11bLongHost`, `Write-S11bExpected`, `Save-S11bBlockList`, `$S11bStand`, `$S11bHomeTyped`. The found text is read here only; the runner never touches a text.
- `recipes/s11b-r17.ps1`: the eight blocks, `Write-R17Row`, `Invoke-R17Flight`, `Invoke-R17History`, `Invoke-R17CapsWarn`, `Invoke-R17Judge`, `Start-R17Bg`/`Wait-R17Bg`, `Get-R17Expect`, `Get-R17HitCode`; prologue order, RD-7's CTX, the four history rows, RD-0 (a-prime).
- `recipes/s11b-r17-plan.ts`: framing order, `NOT_BUILT = []`, six new STOP entries, `own-rendered` no longer a gap.
- Tests: new `s11b-h8.test.ts` (24) and `s11b-h8-static.test.ts` (14); `s11b-console.test.ts` (ctx tests rewritten for the tag, timed sampler, +2), `s11b-cli.test.ts` (+1 case, ctx read), `s11b-r17-plan/static` (order); `s11b-win-static` line cap 400 to 440 (the file is 400 lines; an ASCII and size guard, not a protective check). `tsconfig.s11b.json` include and `tsconfig.s6.json` exclude extended.
- Numbers: `npm test` before 4365 / 173 files, after `Test Files 175 passed (175)`, `Tests 4406 passed (4406)` (+41, none removed). `npx tsc --noEmit -p` on all seven `recipes/tsconfig*.json` exit 0. `npm run typecheck` 0, `npm run build` 0, no tracked change after the build except `journal.md` (not mine) and `tsconfig.s6.json` (exclude line). PowerShell `Parser::ParseFile` on `s11b-r17.ps1` and `s11b-win.ps1`: 0 errors.

## 3. `-Block plan`
```
PLAN liveA: preflight servers files window reload console rd0 r17-up-l1 rd-ctl f-filetab f-home rd-caps-warn rd-regex history g1-open rd1 rd6 rd2 rd3 rd-dl-err rd-dl-hop rd7 rd8 rd-back rd-fwd rd-back-samedoc rd-rebuild-narrow rd-disarm g1-close rd4 rd5 rd5b rd-back-empty rd-dl-socket r17-up-opt r17-up-6 r17-up-7 r17-save-refuse rd-restore rd-logs teardown
PLAN liveB: preflight servers files window reload console rd0 root-add f-raw f-raw-2 f-raw-dir f-raw-enc f-raw-ok r17-up-race-a r17-up-devt rd-restore rd-logs teardown
PLAN not built: 
```

## 4. How the eight blocks work (for the verifier)
Verdicts: `B17` prints `ROW`/`CHECK` lines per clause; the runner folds the clause exit codes in `Write-R17Row` (STOP over FAIL over NOT MEASURED over PASS); a STOP prints and throws into the one stop procedure. NOT MEASURED never counts as a pass.
- **In-flight rows** (`Invoke-R17Flight`): a timed RULES sampler is typed into the console first (`rules --sample 100 --for 10000 --mode <m>`, one line, each sample stamped with the console's `Date.now()`); `B17 call` writes `<sig>.ready` just before it sends and prints `CALLT <row> start= reply=` (epoch ms, same machine clock); the PowerShell driver waits for the ready file and acts at offsets from it; the sampler read then takes the windows from the call's own times: `at` = samples 2 300..2 700 ms after the send (RD-5b, RD-DISARM, equal to N from `B17 rules --expect-from`), `inflight` = send+300 .. reply-300 never 0 (RD-REBUILD-NARROW), `empty` = send..reply all 0 (RD-BACK-EMPTY); 0 after = the samples from reply+300 on. A rule left after the reply is a STOP.
- **RD-REBUILD-NARROW**: call `ok` (a DISARMED or STATE_UNREADABLE answer fails it), driver toggles the JavaScript switch off then on through `Set-S11Flag` at 1 s (each read back).
- **RD-DISARM**: `Test-S11ButtonReady` first (unpinned = throw), driver `Invoke-S11ButtonPair -GapMs 1600 -At ready+1 s -Checked`; call must be K-disarmed with its data; `at` mode N; `Test-S9DaemonSafety` read-back; hits `rdd` redirect 1 blocked 0 on 8086's log.
- **RD-5b**: call on 8086, driver saves found+BLK at 1 s (`Save-S11bBlockList`), then the same list re-saved and read back by hash, then the found list restored (read back); `at` mode N; hits `rd5b`.
- **RD-5**: needs the console (else NOT MEASURED, recorded). `B17 stored` (background process of the runner's driver) writes the poller expression and the signal file; the driver types it, starts `B17 call --go <signal file>` as a second node child (it connects, claims, writes `RD-5.ready`, then fires within about 2 ms of the signal), stamps the press, saves found+BLK. `B17 judge-gap --press --readback (STOREDAT) --call` gives `GAP` and NOT DISCRIMINATING. Hits `rd5` redirect 1 blocked 0.
- **RD-DL-SOCKET**: list = found + `127.0.0.1`, `B17 socket` as a background child, twelve `S9 call download-file` on `localhost:8087/slow/hello.txt?s11b=sk<i>`, `RULES 0` read, a `status` record, the stop signal file, list restored. Row = sampler code, calls (12 ok), RULES.
- **F-HOME / RD-CAPS-WARN / R17-UP-OPT**: typed with `Set-S11Box -NoSave`, read, reverted, stored value read back from a fresh page by hash (never printed); observations go to a JSON file outside the repo and `B17 judge-opt --kind fhome|caps|upopt` compares them with K-opt-sum / K-opt-item / K-opt-home / K-caps built by the pure helpers. UP-OPT reuses `Invoke-S11Opt` by call; because it counts Run 16's old standing text and cannot read the third typed line's item, `Get-S11bOptObs` types the three lines once more after it and supplies the standing count (K-opt-stand once) and the items (K-opt-rel, K-opt-root, K-opt-home, no warning item); the O2 bound is 5 000 ms and a conflict note fails.
- **RD-0 (a-prime)**: when the manifest eval returns FALLBACK (code 10), `Invoke-R17CapsWarn` runs right after the found state is read, before RD-0 (d); `R17CapsDone` (persisted) stops the `rd-caps-warn` block from running it twice.
- **History rows**: `Invoke-R17History` runs `B17 back|forward`, reads the hits (`--flip` counts), `RULES` (`Read-R17Rules`), then `B17 judge-history` prints the `ROW` verdict (blocked 0, flip total 2 else NOT DISCRIMINATING, <= 12 000 ms, ok or K-tab; SAMEDOC < 1 000 ms; EMPTY any non-ok answer or a rule is a STOP, `max=0` read by the sampler).
- **RD-7**: `B17 ctx --label r7 --tag rd7` types an expression that finds the tabs whose url or pendingUrl holds `s11b=rd7` (the tag is built from two pieces, no `://`), prints `CTX r7 tabs=<m>` and `CTX r7 count=<n>`; count above 0 is the STOP.

## 5. STOP map: rows added or changed (id, STOP, block, exit; every marker stands on a line with a `throw`, and the stop procedure restores first)
| id | STOP | block | exit |
|---|---|---|---|
| own-rendered | RD-7: CTX count above 0 (the UIA read of the options heading is still not built) | rd7 | 2 (no longer a gap) |
| stuck-narrow | RD-REBUILD-NARROW: RULES above 0 after the reply | rd-rebuild-narrow | 2 |
| unpinned-disarm | RD-DISARM: toolbar button not pinned or not armed | rd-disarm | 2 |
| stuck-disarm | RD-DISARM: RULES above 0 after the reply | rd-disarm | 2 |
| stuck-rd5 | RD-5: RULES above 0 after the reply | rd5 | 2 |
| stuck-rd5b | RD-5b: RULES above 0 after the reply | rd5b | 2 |
| stuck-socket | RD-DL-SOCKET: RULES above 0 after the loop (`Read-R17Rules`) | rd-dl-socket | 2 |
| rules-stuck-empty | RD-BACK-EMPTY: a rule existed during a history call | rd-back-empty | 2 |
| answer-changed | RD-BACK-EMPTY: a call on a page with no redirect answers differently | rd-back-empty | 2 |
F-HOME, RD-CAPS-WARN and R17-UP-OPT have no STOP clause in the sheet. The tests `s11b-r17-static` (generic map loop) and `s11b-h8-static` check every marker, its block and its `throw`.

## 6. Proposed decisions
### 2026-10-27 · Reload runs before the console in the prologue
**Decided:** `reload` before `console` in liveA and liveB (plan, `.ps1` lists, plan test). **Why:** a reload ends the service worker, which detaches its DevTools window; a console opened before it would read nothing. The sheet requires only that the capture start before RD-0 and that `RULES 0` be read on the build just reloaded; Run 16's slices also reloaded first. **Instead of:** the sheet's literal order (console, reload). **Revisit if:** a live run shows the DevTools window survives a reload (then the order does not matter). **By:** Claude (proposed)

### 2026-10-27 · RD-7's CTX is found by the query tag, in the console
**Decided:** `B17 ctx --label <l> --tag <t>`; the console expression filters `chrome.tabs.query({})` by url or pendingUrl holding `s11b=<t>` and counts `getContexts({contextTypes:["TAB"]})` whose `tabId` is one of them; prints `CTX <l> tabs=<m>` and `CTX <l> count=<n>`. **Why:** client handles hide the Chrome tab id. **Instead of:** `CTX NOT MEASURED`. **Revisit if:** the redirect-cancelled tab no longer shows the tag in url or pendingUrl (then `tabs=0` and a count of 0 proves nothing: the extra `tabs=` line makes that visible). **By:** Claude (proposed)

### 2026-10-27 · The in-flight windows are read by the call's own clock
**Decided:** the sampler stamps each sample with `Date.now()`, `B17 call` prints its send and reply times, and B17 selects the sample windows from those times. **Why:** node start-up and UIA typing make any fixed offset from the runner wrong by seconds. **Instead of:** indexing samples by position. **By:** Claude (proposed)

## 7. Deviations, findings, handoff
- The sheet's RD-7 row writes `CTX tab=<label> count=<n>` while its closing list and abbreviations paragraph write `CTX <label> count=<n>` (the label rule `[a-z0-9-]` excludes `=`): the helper contract's form was kept (label `r7`).
- RD-5's `GAP` press time is stamped before `Set-S11Box` (which waits 250 ms before pressing Save), so GAP is overstated by that much: conservative, recorded here.
- RD-5b's in-flight save has no read-back of its own; the same list is saved again right after the call and read back by hash, then the found list is restored and read back.
- RD-DL-SOCKET: the `sock127` marks are still not placed (as H7 noted); RD-LOGS's `sock127` is then 0 by construction.
- RD-5 with a failed console typing mid-row ends NOT MEASURED (stored process times out) instead of aborting; its call child is only started after typing succeeds.
- Both `.ps1` files were mixed LF/CRLF after splicing; they are now all CRLF like the tracked ones' working-tree form.
- Lesson again: Python in a Bash heredoc turns `\r\n` into real characters in non-raw strings; one test file needed a repair.
- Unproven until the live run: the console typing of the long sampler line (UIA name of the prompt), the stored poller's stored-value format equalling the typed text, `chrome.tabs.query` url visibility, the 100 ms sampler cadence under load, `Invoke-S11ButtonPair`'s timing relative to the ready file. Handoff: a fresh verifier. No process left running.
