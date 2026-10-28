# S7-drivers-A fixer, round 1

Model and effort: Sonnet 5.5, medium. Role: fixer (agent-rules §6). No live run: nothing drove Chrome, the daemon or port 9234.

## 1. Verdict
**DONE-PARTIAL.** Every listed finding is fixed (M1–M5, m2–m7, the `bc` deviation) except two limits below: M1's -OWN/-FILE MCP clause (disputed) and m2 (fixed at the run level, glue untested). M6 (size) is not in scope and is worse: code is now 722 lines.

## 2. Outputs
| Command | Result |
|---|---|
| `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json` | all seven exit 0 |
| `npx vitest run recipes/test` | 1481 passed, 62 files (before 1464 / 62: +17) |
| `npm run typecheck` / `npm run build` | exit 0 / `built extension → dist/` |
| `npm test` | 5381 passed, 228 files (before 5364 / 228) |
| `wc -l` code | `s12-r19-a.ts` 586, `s12-r19-a.ps1` 109, `s12-r19.ps1` +26 (unchanged since the builder), `s12-r19-lib.ps1` +1 (new) = 722 |
| tests | `s12-r19-a.test.ts` 422, `s12-r19.test.ts` +11, `s12-r19-static.test.ts` +1 = 434 new (cap 600) |

## 3. Findings: finding → fix → place → test
| Finding | Fix | Where | Test |
|---|---|---|---|
| M1 MCP clauses | `refuseRow` also calls `browser_snapshot` (CON-3, CON-4) or `browser_evaluate "1"` plus `browser_snapshot` (CON-JSOFF) over the MCP; `judgeMcpRefusal` compares texts (CON-3: equals the snapshot's; JSOFF: equals evaluate's, snapshot not an error; CON-4: error carrying the disarmed message). Printed as `LEG <row> mcp`; CON-4's read after arming is `LEG CON-4 after` (FAIL on any error) | `s12-r19-a.ts` `judgeMcpRefusal`, `refuseRow`, `refuse` | "the MCP clauses" (9 asserts) |
| M2 ARGS-2 `sent` | `sent += d > 0 ? 1 : 0`; `judgeArgs2` needs total 2 and each wire label exactly once | `judgeArgs2`, `args2` | "ARGS-2: `sent` counts every call..." |
| M3 FLOOR timing | `Switch-R19Toolbar` records `R19Press = {pre, post}`: pre just before the press, post after the new title is read; the `do` step reports post (OFF), the `undo` step reports pre (ON) | `s12-r19-a.ps1` `Get-R19PressMs`, `Invoke-R19Steps`, `Switch-R19Toolbar` | scenario S15 and the mutant "ON stamped after the title read" |
| M4 list_tabs | `actorRecord` writes `list-tabs lines=<n> fixture-handle=<yes\|no>` for `browser_list_tabs`; the handle is passed as the call's third argument. No scanner change | `s12-r19-a.ts` `actorRecord`, `mcpOpen` | "a browser_list_tabs result is never written whole" (a non-fixture title/URL absent, no `://`, and the record passes `scanActors`) |
| M5 mutants | Stubbed scenarios S8–S16 through `Invoke-R19Row`/`Invoke-R19BannerCtl` run `-StepList`, the banner path, both restores and the toolbar. `conRead`'s loop moved to exported `conLegs` | test file `STUBS`, `SCENARIOS`; `conLegs` | 8 verifier mutants all red, see §3a |
| m2 stateless crash | `run(..., stateless)`: a non-StopWhy throw in an actor that changes no state prints `LEG <row> actor-error FAIL`, exit 1, not a wave STOP | `run`, `crashLine`, `cmds` | `crashLine` only (the `run` path needs a daemon: untested glue) |
| m3 IDLE stamp | stamps after `newTab`, `close`, `claim`, `release`; MCP calls stamp except `IDLE_EXEMPT_TOOLS` (snapshot, list_tabs, status) | `run`, `ownFile`, `mcpOpen` | `IDLE_EXEMPT_TOOLS` equality |
| m4 `-Steps` | renamed `-StepList` (and `Invoke-R19Steps`'s parameter); the 10 registrations follow | `s12-r19-a.ps1`, `s12-r19.ps1` | every scenario passes `-StepList` |
| m5 CON-FRAME b | `judgeFrameB`: needs `sentinel=2`; `RECORD` when leg a is NOT DISCRIMINATING | `judgeFrameB`, `conFrame` | "CON-FRAME leg b needs sentinel=2..." |
| m6 crash rc | `Invoke-R19BannerCtl`/`ConBanner` read the actor's exit; 2 goes through `Stop-R19Actor` | `s12-r19-a.ps1` | S13 and the mutant "a crashed BANNER-CTL actor is not a STOP" |
| m7 ARGS-3 snapshot | MCP `browser_snapshot` instead of the SDK `snapshot()` | `args3` | none (glue) |
| `bc` tab | not closed by the row (opened with `keep`); the handle is written to `bc-tab.txt`; `Invoke-R19Restore` (liveA19 only, guarded by `Get-Command Close-R19Bc`) runs actor `close-bc` first | `bannerCtlRow`, `closeBc`, `Close-R19Bc`, lib line 217 | "the bc tab is closed by R19-RESTORE" (static) |
| NIT `idleMs >= 0 ? 0 : 0` | left as is (cosmetic; the line still reads the idle); the stderr pipe and the tsconfig name untouched | | |

### 3a. The verifier's eight mutants, now red (stubbed scenario through `Invoke-R19Row`, each mutated file parses)
IDLE from the first match (S10); BANNER-CTL `--idle` from the neg id (S12); banner STOP via `Say9` (S11); Restore-R19Js via `Say9` (S14); `do` not setting `R19Changed` (S8); `undo` not running its restore (S9); toolbar switch pressing nothing (S15); `conRead` judging the `all` line for every read: the per-read judgement is `conLegs`, whose test gives each read different entries (a mutant that judges `all`'s line fails the `limit3` want of 3 entries). That last one I reasoned, I did not run it as a mutant. Two extra mutants are in the list (ON stamped after the title; crashed BANNER-CTL not a STOP): 14 PowerShell mutants in all.

## 4. Deviations
- **M1, -OWN and -FILE: not done, disputed.** The verifier read "As R19-CON-3" as asking for an MCP clause on those rows. The sheet's rows for -OWN and -FILE name the SDK read and the snapshot control only, and the target tab is held by the SDK client's claim, so an MCP call on it would answer `TAB_HELD`, not the refusal under test. I did not add it. The session agent may rule otherwise.
- **M1, CON-4's MCP clause** is "an error carrying the disarmed message", not equality with the snapshot: the sheet asks for equality only for CON-3 and JSOFF.
- **Lane:** one line added to `recipes/s12-r19-lib.ps1` (inside the lane's glob `recipes/s12-r19*`), for the `bc` close.

## 5. Proposed decisions
### 2026-10-28 · liveA19's list_tabs probe is recorded as a count, not as text
**Decided:** CON-MCP still calls `browser_list_tabs`, and writes to `actors-<slice>.jsonl` only `list-tabs lines=<n> fixture-handle=<yes|no>`. `scan-actors` is not changed and has no exemption. **Why:** the tool's text lists every open tab's title and URL, the human's included, which both leaks them into a file and fails R19-LOGS's `other 0`. **Instead of:** a scanner exemption for the tool (a contract change to the log rule), or dropping the probe. **Revisit if:** a row needs the list's text itself. **By:** Claude (proposed, for session-agent review).

### 2026-10-28 · liveA19's headless MCP actor stays a scripted stdio client (m1)
No code change; the verifier's proposal (§6 of its report) stands as proposed, for the session agent.

## 6. Findings
- **Test-R19Armed was wrong (new, not on the list).** `-like '*armed*'` is true for `safety: disarmed by the user`, so every toolbar switch would have judged the state unchanged and stopped. Now `-like 'safety: armed*'` (badge.ts `safety: armed by the user`). The new toolbar scenarios use the real titles and fail on the old test.
- Not done: m2's `run` path, ARGS-3's MCP snapshot and `closeBc` are daemon-bound glue with no unit test.

## 7. Handoff
Nothing running. Uncommitted: the files in the brief's lane plus `recipes/s12-r19-lib.ps1`. A fresh verifier should re-check M1–M5, the `bc` close and `Test-R19Armed`; M6 (size, now 722 against a cap of 400) needs the session agent's decision.
