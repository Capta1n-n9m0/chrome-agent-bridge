# S5-drivers-A fixer, round 1 (slice A1)

Model: Claude Sonnet 5.5, medium effort. No daemon, Chrome, reload or live run. Red evidence: `S5-drivers-A-fixer1-red.txt` (the new tests run before any code change).

## Findings

| # | Finding | Result | How | Tests |
|---|---|---|---|---|
| 2.1 | MAJOR POP-OTHER `human` | fixed | `prepareRound` runs front, guard, reset of every peer's grants, then the trigger. For a click leg the trigger is `clickGate(guard, sig(click k))`: the click is asked for only while O is the active tab (never C's tab), else the leg is NOT MEASURED. Every round ends with a sweep that closes each tab not in the round's baseline listing (closing releases the lease). The later click signals are still given after an unsent one, so the wave's step list stays in step. | `fixer 1: POP-OTHER round order` (2 tests) |
| 2.2 | MAJOR R20-0 | fixed | `Read-R20Worker` (ps1) types one expression through the existing `Start-S11bConsoleEval` (`stored` path, `-ExprFile`) and reads `R20READ <perm> <listener> <enabled>` after the call's marker; `enabled` is `management.getSelf()` with `enabled` and no `disabledReason`. Unreadable gives `unread` and the disk manifest's `permissions` is read; the proof prints `CHECK R20-0 fallback disk-manifest webNavigation=<yes/no> (recorded as such; ...)` (`diskNote20`). The proof no longer maps a throw to `enabled=no`: a throw ends the process with no LOADED20 line, which the wrapper maps to `throw-after-state`; `--enabled no` (from the console) gives `extension-disabled`. | ps tests `workerOk`, `workerNo`, `workerNoLine`, `workerFallback`, `zeroReadsWorker`, `zeroFallbackArgs`, `zeroCrash` (existing); `diskNote20` test |
| 2.3 | MAJOR MCP KEYORDER | fixed | `mcpOrderLines`: the KEYORDER `via=mcp` line is printed only from orders read from the MCP's own JSON text; a text that is not a JSON object prints `CHECK ... mcp text-not-a-json-object`; then `CHECK ... mcp RECORD not-discriminating`. The MCP leg also runs the five `TABLE` values (`mcpEqual`; `ARGS ... v<i>-mcp` and `total ... via=mcp`). | `fixer 1: the MCP leg` (3 tests) |
| 2.4 | MAJOR path leak | fixed | the three paths in `S5-drivers-A-builder-red.txt` became `<repo>`; scan of every S5-drivers-A* file and the new recipes files for the repo path (four spellings), the login, the git name and the home folder name: 0 hits. | scan script, not a test |
| 2.5 | MINOR `third` W2 | not fixed, recorded | no helper opens a window for an SDK tab (`newTab` takes only `url`/`active`; no window option anywhere in sdk/mcp). One window kept. | none |
| 2.6 | MINOR `ref` | fixed in code; sheet note is the session agent's | the leg runs; the answer prints `ANSWER ... ref <code>`, plus `CHECK ... ref-leg object-has-no-ref` and now `LEG ... ref RECORD` (added to the row's finish). The builder report's claim now matches the code. | none (live print) |
| 2.7 | MINOR POP-NONE | fixed | `newtab` prints `n` = tabs made and `others` = grants to A; `blocked` prints `n` = tabs added, `others` = grants to B. | none (live print) |
| 2.8 | MINOR `scanArgs20` | fixed | `ScanArgs.alsoNames`; `name=` sums the git name and the login names (USERNAME, os login, home folder name), never printed. | `fixer 1: both names are counted` (2 tests) |

## Sizes
Code: `s13-r20.ts` 171, `s13-r20.ps1` 134, `s13-r20-a.ts` 296 (601 in all; blank lines removed to fit ~600). Tests: 421 lines over three files.

## Checks
`npm test` 242 files, 5757 -> 5768 passed (+11, none removed). `npm run typecheck`, all eight `recipes/tsconfig*.json` and `npm run build` exit 0 (run before the last blank-line compaction; after it the three suites and `.s13`/`.s6` were re-run green).

## Findings for the session agent
- 2.6: the sheet's `KEYORDER ... leg=ref` is unreachable (an object has no element ref); it needs a dated note on section 4.28, like form (3).
- 2.9 NITs left: `Invoke-R20RestoreCheck` reads `$FoundJson` / `$NowJson`, which A2 must set; `rowVerdict20` ranks RECORD below PASS (the lib maps it to PASS).
- `Read-R20Worker` assumes the `stored` console path accepts an own expression file (pattern-checked by `Assert-S11Outside` only); it is not run live.
