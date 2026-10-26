# S4-helpers builder slice H7: the Run 17 block runner

Model Sonnet 5.5, effort medium. 2026-10-27. Nothing committed. Nothing was run against Chrome, the daemon or a port (offline only: parse check, plan tests, static tests, `-Block plan`).

## 1. Verdict: DONE-PARTIAL
The plan, both slice orders, the gate, the ports table, the STOP map, the prologue and 31 of 39 row/extra blocks are built; 8 blocks print `NOT BUILT` and exit 3 (list in section 5). The runner is about 590 lines (over the 600-line cap with tests, 530 more in tests and plan), so the cap clause was used for the typing/driver rows.

## 2. Outputs
- `recipes/s11b-r17-plan.ts` (new): `ROW_BLOCKS` (38 sheet rows, ids tied to the Helper column), `FRAMING_BLOCKS`, `EXTRA_BLOCKS` (`history g1-open g1-close root-add`), `sliceBlocks`, `ALL_BLOCKS`, G11-3 (`WAITS_FOR_G11_3`, `needsFileAccess`, `liveBGate`), `rd0Branch` (code 10 = FALLBACK), `NOT_BUILT`, `PORTS`, `STOP_MAP`, `stopPlan`.
- `recipes/s11b-r17.ps1` (new, ASCII, parse clean): `-Block` ValidateSet = plan list; `plan`, `liveA`, `liveB`, prologue, rows. Cloned from `s11-r16.ps1` (one printing site `Show-S16`, the stop procedure `Stop-S16Wave`, own PIDs only, globals in `r17-globals.clixml`); one new generic node runner `Invoke-R17Node 's9|s11|s11b'` with `-StopOnFail` (a check failure that is a row-level STOP).
- `recipes/test/s11b-r17-plan.test.ts` (16 tests, sheet-parsing) and `recipes/test/s11b-r17-static.test.ts` (10 tests; also runs `scanR16` on the new .ps1, which is empty).
- `recipes/tsconfig.s11b.json` include and `tsconfig.s6.json` exclude extended.
- **Two contract gaps closed (small fixes outside my files, named as the brief asks):**
  1. `recipes/s11b.ts`: new subcommand `foundlist --file <f>` (prints `FOUNDLIST blocks-fixtures=<yes|no>`, a STOP on `yes`); RD-0 (d) had a pure rule (`foundList`) but no CLI. Tested in the plan test.
  2. `recipes/s11b-win.ps1`: `Set-S11bBlockList $O @(extra lines)`: block list = found text plus lines, saved and read back by hash (the found text may not be read in the runner: `scanR16` forbids `Get-S11FoundText`, #279). Used by G1 open and close (`@('localhost:8085')` / `@()`).
- Numbers: `npm test` before 4339 / 171 files, after `Test Files 173 passed`, `Tests 4365 passed` (+26, none removed). `npx tsc --noEmit -p` on all seven `recipes/tsconfig*.json` exit 0. `npm run typecheck` 0, `npm run build` 0; no tracked change after the build except `journal.md` (not mine) and `tsconfig.s6.json` (exclude line).

## 3. Dry-run line (`R17 plan`, parse-only, runs nothing)
```
PLAN liveA: preflight servers files window console reload rd0 r17-up-l1 rd-ctl f-filetab f-home rd-caps-warn rd-regex history g1-open rd1 rd6 rd2 rd3 rd-dl-err rd-dl-hop rd7 rd8 rd-back rd-fwd rd-back-samedoc rd-rebuild-narrow rd-disarm g1-close rd4 rd5 rd5b rd-back-empty rd-dl-socket r17-up-opt r17-up-6 r17-up-7 r17-save-refuse rd-restore rd-logs teardown
PLAN liveB: preflight servers files window console reload rd0 root-add f-raw f-raw-2 f-raw-dir f-raw-enc f-raw-ok r17-up-race-a r17-up-devt rd-restore rd-logs teardown
PLAN not built: f-home rd-caps-warn rd-rebuild-narrow rd-disarm rd5 rd5b rd-dl-socket r17-up-opt
```
Row block names are the sheet's Helper-column names (`rd1`, `rd5b`, `rd-back`, `r17-up-l1`, ...). Prologue order is the sheet's literal one: **console before reload** (see section 6, finding 1).

## 4. STOP map (STOP line -> block -> exit). Every one ends through the same path: any `STOP:` line or throw -> `Invoke-S16Block`/`Invoke-R17Node` throws -> `catch` -> `Stop-S16Wave` (restore first when the state was touched, no second restore inside the restore, read-back, own PIDs, exit 2). The marker `# STOP-MAP <id>` stands on the detecting line; the static test checks marker, block and a Stop9/Fail/throw/StopOnFail path.

| id | STOP | block | exit |
|---|---|---|---|
| port-foreign | port held by a program the wave did not start (8090 held at all) | preflight, servers | 2 |
| tree-dirty | tracked file changed outside the steps dir | preflight | 2 |
| unpinned | toolbar button not pinned (human gate) | window | 2 |
| toggle-unreadable | file-URL toggle unreadable | rd0 (liveB: the early read after preflight) | 2 |
| found-unarmed | found state not armed with JavaScript on | rd0 (`Save-S11Found` prints STOP) | 2 |
| found-blocks | found list matches a fixture URL | rd0 (`B17 foundlist`) | 2 |
| l1-allowed | found Upload folders allow ROOT/OUTSIDE | r17-up-l1 (`S11 foundcheck`) | 2 |
| ctl-missed | an RD-CTL positive control missed | rd-ctl (`B17 ctl`) | 2 |
| covered-proceeds | covered call proceeds after its rules failed to install | rd1 (`--StopOnFail`) | 2 |
| covered-proceeds-3 | covered download proceeds | rd3 | 2 |
| rules-stuck | RULES above 0 after a reply | `Read-R17Rules`, called by every row | 2 |
| human-browsing | RD-6 reads 0 blocked hits | rd6 | 2 |
| own-rendered | RD-7 extension context in the tab | rd7: **gap**, prints `CTX NOT MEASURED` | (none) |
| file-rendered | RD-8 `file:` document rendered | rd8 (snapshot answers K-filepage) | 2 |
| stuck-rule-hit | RD-4 blocked hits not 1 | rd4 | 2 |
| answer-changed | bridge call on a no-redirect page answers differently | rd-back-empty | 2 |
| log-hit | pattern/URL/token in a log | rd-logs (`B17 scan`, `S11 scan`) | 2 |
| restore-mismatch | restore read-back differs | rd-restore (`Restore-S11Safety`, `S11 restore-check`) | 2 |
| console-input | console input holds a pattern | rd-regex (`B17 regex` code 2) | 2 |
| any-stop-line | any STOP line or throw after the first change | catch -> `Stop-S16Wave` | 2 |
Exit 3 (not run): the G11-3 gate (liveB, the seven rows written `ROW <id> NOT RUN - waits for G11-3`) and `NOT BUILT` blocks. RD-0's FALLBACK (code 10) is not a STOP: `R17Fallback` is set and every `RULES` read prints `NOT MEASURED`.

## 5. What is not built, and thin spots (for the follow-on builder)
Not built (print `NOT BUILT`, exit 3): `f-home`, `rd-caps-warn` (need a typed-lines helper in `s11b-win.ps1` that types without saving and reads summary/items, and pure judges of K-opt-sum/-item/K-caps; none exists), `rd-rebuild-narrow`, `rd-disarm` (drivers during an in-flight call plus `B17 rules --sample`), `rd5`, `rd5b` (`B17 stored` plus console typing plus save press), `rd-dl-socket` (`B17 socket` sampler with a signal file around 12 calls), `r17-up-opt` (S0F-a expectations need a new judge; `s11-r16-opt.ts` is Run 16's). RD-0 (a') (RD-CAPS-WARN's typing as the first line on FALLBACK) therefore cannot run yet.
Built but thin (the follow-on or the verifier should read these):
- **RD-BACK, RD-FWD, RD-BACK-SAMEDOC, RD-BACK-EMPTY:** `B17 back|forward` judges only when called with `--rules-after`, `--blocked`, `--flip-total`, which are measured after the call. The runner records the call, then reads hits (`--flip`) and `RULES` and fails the row when blocked > 0 (`CHECK ...: FAIL`); the flip-total == 2 and reply-time clauses are recorded, not judged. A `B17` post-hoc judge (or a two-phase flag) would close it.
- **RD-7:** `B17 ctx` needs the Chrome tab id, which handles hide; `CTX` is NOT MEASURED and the UIA read of the options heading is not built. The STOP is therefore unreachable (marked `gap` in the map).
- **F-FILETAB:** records `tabs`, `snapshot blocked1`, `navigate`; `S9 --expect` has no K-filepage/K-fileurl form, so texts are recorded, not judged; the control navigate of a fixture tab to the `file:` URL is not built.
- **RD-DL-ERR / RD-DL-HOP:** `LAT` is the wall clock of the node call (node start-up included); `d` is a difference of medians so the offset cancels, but the absolute numbers are not the SDK's reply times.
- RD-LOGS runs `B17 scan` on console and daemon slice and `S11 scan --what actors`; R17-UP-7's alias is not passed (`alias7` is then 0 by construction); the `sock127` marks are absent with `rd-dl-socket`.
- `r17-up-6` / `f-raw*` use `Invoke-S11bSamplerPasses` as driver; `r17-up-race-a` uses `Invoke-S11bRaceA`; `r17-up-devt` and `r17-up-7` are cloned from Run 16 with the B17/S11 subcommands. None has run.

## 6. Findings and deviations
1. **Order risk:** the sheet lists `console` before `reload`; I followed it literally. If reloading the extension orphans the worker DevTools window (unmeasured), RD-0's console eval ends as FALLBACK. Swapping is one line in the plan, the .ps1 lists and the plan test. `reload` also runs `S11 setup` (fixture tabs) as its last step; the sheet names no setup block.
2. `-Block liveB`: the toggle is read right after the preflight (as Run 16's `Read-S16Early`) rather than only in RD-0, so a toggle-off wave starts no server; RD-0 reads it again.
3. Servers are started as `cmd /c python -u ... > log 2>&1` (one log per port in `$S11_OUT\logs\p<port>.txt`, outside the repo) because `http.server` logs to stderr; killed by `taskkill /T` on the recorded cmd PID. Ports 8083-8091 are probed by TCP connect, never by HTTP (an HTTP probe would consume the flip server's first GET and wait out the delay server).
4. Lesson (again): a Bash heredoc dropped every backslash in my first test files; the tests were rewritten with the Write tool.
5. No proposed decisions.

## 7. Handoff
A follow-on builder: the eight blocks of section 5 (typed-rows helper and judges first), the post-hoc history judge, then a fresh verifier. No process left running.
