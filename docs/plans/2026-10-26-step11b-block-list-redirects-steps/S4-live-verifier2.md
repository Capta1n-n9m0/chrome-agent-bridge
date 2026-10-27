# S4-live verifier 2: the between-attempts helper fix after Run 17 liveA attempt 3

Model / effort: Opus 5.5, medium. Role: verifier (`docs/agent-rules.md` §6). Offline only: no Chrome, extension, daemon or live
block; only `-Block plan` ran, and nothing in `%TEMP%\bridge-e2e\s11b` changed (no file there written in the last 10 minutes,
checked after the plan run). No repo file edited apart from this report. Claims audited: `S4-live-fixer2.md`.

## 1. Verdict
**PASS-with-notes** (no CRITICAL or MAJOR; 4 NITs, 1 note).

## 2. Root causes (item 1): both confirmed from code
- **`opened`.** `recipes/s9.ts:221-224` `noteOpened` builds a default only when `state.json` is absent, then calls
  `s.opened.includes`. `recipes/s11.ts:425` `make` writes `{alias, sentinel, tabs, files}` with no `opened`; `setup`
  (s11.ts:449-468) and `found` (s11.ts:488-489) load and save the whole object. The runner points both helpers at one file
  (`s11b-r17.ps1:31-33`: `S9_OUT = S11_OUT`). In the record (`S4-live-run3A-record.md`), the STOP `Cannot read properties of
  undefined (reading 'includes')` comes right after `tabs2`. The next line of the block is `New-R17Tab 'F-FILETAB' 'ft'`
  (`s11b-r17.ps1:496`), the first s9 `newtab` in slice A. Everything before it (`files`, `reload`, `rd0`, `rd-ctl`) uses
  s11/s11b only. Confirmed.
- **Time prefix.** `s9.ts:158`: `` const say = (msg) => console.log(`${iso()} ${msg}`) ``. Every ROW and CHECK line goes
  through it (s9.ts:186, 197, 677, 681, 692). The s9 STOP line does not: it is printed bare at s9.ts:1277. At HEAD,
  `parseCallRow` and `fileExistsFrom` were anchored `^ROW `, and the crash test in `Invoke-R17Node` was `'^(ROW|CHECK) '`.
  The record shows the effect: four `NOT MEASURED: no ROW line for step …`, each straight after a time-prefixed ROW line.
  `s11.ts:228` and `s11b.ts:77` print bare. Confirmed.

## 3. The fixes are right and narrow (item 2)
- **`stateCompat`** (`s11b-rules.ts:871-882`) copies the object with `{ ...s }`. It adds `tabs: {}` and `opened: []` only when
  the key is absent (`in` test), and never changes or removes a key. `stateCompatCmd` (s11b.ts:488-497) rewrites the file only
  when it adds something. It prints key names only, and stops (exit 2) on a non-object.
- **Every later save keeps the added keys.** s9 `newtab --as` (s9.ts:559-561) and `noteOpened` save the parsed object whole.
  So do s11 `setup` and `found`. No s11b subcommand writes `state.json`: `grep writeFileSync recipes/s11b.ts` shows the only
  such write is line 495.
- **Where `Sync-R17State` runs.** The runner calls s11 `make|setup|found` at `s11b-r17.ps1:415`, 444, 467 and 825, all through
  `Invoke-R17Node`. No other path runs s11.ts: s11-win.ps1 and s11b-win.ps1 start no s11.ts process. The sync runs after the
  exit handling (only on exit 0, 1 or 3; an exit 2 has already thrown).
  - Slice A runs `files` (make) and `reload` (setup) before any s9 call.
  - `preflight`, `servers`, `window` and `console` make no s9 call.
  - Slice B's only s11 writer after `rd0` is `setup --only x` (line 825).
  - The new test proves that only those three s11 commands call `saveState`.
- **PowerShell 5.1 semantics**, run in a scratch `.ps1` that mimics the two functions:
  - The outer return value stays `[1]` (count 1).
  - `$global:R17Out` is the s11 call's output after the sync.
  - When the inner call throws, the `finally` still restores `R17Out` and the throw propagates, so a state-compat STOP stays
    a STOP.
  - `'s11' -eq 's11' -and 'make' -in 'make','setup','found'` gives True, and with `'l1'` it gives False.
  - Nothing reads `R17Out` after an s11 make, setup or found anyway: line 470 starts a new node.
- **The time-prefix pattern** is `(?:\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z )?`, optional and anchored at `^`. It admits
  only an exact `toISOString()` stamp and one space, so `[bridge] ROW …` and `… s9-win: ROW …` cannot match. The
  PowerShell crash test uses the same form.
- **`parseCallRow` still picks the right step's line.** It keeps `ROW \S+ <escaped step> ` with a space after the step, so
  `nav-after` (`ROW F-FILETAB nav-after T1870 …`) is not `nav`, and `tabs2` is not `tabs`. The test asserts the `nav-after`
  case. It keeps the last match per step.

## 4. The crash-test change (item 3)
- **The sheet's intent.** §4.24 of the plan reads: "A failed row is recorded and the wave goes on". The STOP rule lists "any
  throw after the first state change". The HEAD throw on an s9 exit 1 was an artefact of the prefix, not a pre-registered
  STOP.
- **What exit 1 means for s9.** An s9 exit 1 comes only from `failed = true`, which is set beside a printed CHECK line
  (s9.ts:182-199 and the other `failed = true` sites). Every s9 throw exits 2 (s9.ts:1271-1278).
- **What is still a crash.** A node that dies before printing (a module error) still has no ROW or CHECK line and is still
  thrown.

**Every `-StopOnFail`** (`grep -n StopOnFail recipes/s11b-r17.ps1`):

| Line | Call |
|---|---|
| 470 | s11b state |
| 471 | foundlist |
| 474 | s11 foundcheck |
| 477 | rd-ctl |
| 524 | RD-1 nav (covered-proceeds) |
| 555 | RD-3 dl (covered-proceeds-3) |
| 558 | RD-3 dl-ctl |
| 655, 657 | RD-BACK-EMPTY via `Invoke-R17History` → line 263 |
| 836 | restore-check |
| 851, 854, 855 | RD-LOGS scans |

On exit 1 every one of these still reaches line 140 (`Stop9 …; throw 'stop'`). The new crash test runs first and now passes
on the time-prefixed CHECK line, so the s9 ones (524, 555, 558) STOP on the row-level path instead of the crash path. **No
STOP became a non-STOP.**

**Every other place exit 1 or 2 is handled:**
- `Invoke-R17Node` (lines 137-141), `Wait-R17Bg` (lines 204-205), RD-0 (lines 455-456), `Write-R17Row` (line 183), and the
  console-eval `$c -eq 2` sites (506, 610, 659, 774).
- None of these changed apart from line 139.

**The non-`-StopOnFail` s9 calls whose exit 1 is now a counted FAIL instead of a throw:**
- `New-R17Tab` (`'ok'`)
- RD-4 nav (line 639)
- the 12 RD-DL-SOCKET calls (line 789)

For each, the sheet's STOP is carried elsewhere and is unchanged:
- RD-4's stuck-rule STOP is the hits check (line 642).
- RD-DL-SOCKET now reaches its own `sock-close` restore instead of throwing mid-change.

## 5. Scope (item 4)
`git diff HEAD --stat` touches four files:
- `S4-live.ledger.md`, which is the step agent's, not the fixer's
- `recipes/s11b-r17.ps1` (+6/-1)
- `recipes/s11b-rules.ts` (+16/-2)
- `recipes/s11b.ts` (+13/-2)

Plus the untracked `recipes/test/s11b-seams.test.ts`. The diff reads as claimed:
- Only the prefix is added to the two regexes.
- The new function and subcommand.
- The comment line.
- The crash-test regex and the sync hook.

Unchanged:
- No `K17`, judge or verdict function, expected text, pass rule or STOP-MAP comment changed.
- `docs/e2e-test-plan.md` is unchanged.
- `s9.ts`, `s9-rules.ts` and `s11.ts` are unchanged.

## 6. The new tests fail on HEAD (item 5)
- **Setup.** A scratch `git worktree add --detach <scratchpad>\headwt HEAD` with its own `npm ci`. No stash, checkout or
  reset of the main tree. I copied in only the new test. Then `npx vitest run recipes/test/s11b-seams.test.ts`.
- **Result: 7 tests, 6 failed.** The failures:
  - `expected null to deeply equal { code: 'DOMAIN_BLOCKED' … }`
  - judge-row `code: 3` (NOT MEASURED)
  - the crash regex `expected false to be true`
  - `stateCompat is not a function`
  - state-compat `code: 2`
  - the ps1 hook string missing
- **The one test that passed** pins `s9.ts`'s `say` source. That matches the fixer's claim.
- **Cleanup.** I removed the worktree's five `node_modules\@bridge\*` junctions with `cmd /c rmdir` before `git worktree
  remove --force`; all five pointed inside the worktree (#220). `git worktree list` shows only the main tree, and `git status`
  is unchanged.
- **The fixtures match s9's printed form:**
  - `said()` is `` `${new Date().toISOString()} ${line}` ``, which is `say` exactly, and a source assertion pins it.
  - Row lines come from the real `rowLine` and `checkLine` in `s9-rules.ts`.
  - The `-file` line matches s9.ts:681.
  - One fixture is the record's own line, verbatim.

## 7. Sweep-table spot-check (item 6): eight seams, all OK as claimed

| Seam | Producer | Parser | Result |
|---|---|---|---|
| rd6 HITS | `s11b.ts:331` `hitsLine` → `HITS <tag> redirect=<n> blocked=<n>` (s11b-rules.ts:58-59), bare | `Get-R17Hits` (ps1:162-164) unanchored `blocked=(\d+)`, `redirect=(\d+)` over that node's `R17Out` | OK |
| rd-back HISTREPLY / FLIP | `s11b.ts:694` `HISTREPLY <row> kind=… ms=… start=… reply=…`; `s11b.ts:334` `FLIP <tag> n200= n302= total=` | ps1:252 same field order; ps1:258 `total=(\d+)` read right after `Get-R17Hits -Flip` | OK |
| r17-up-opt / up7 via `Invoke-S11Row` | `s11-win.ps1:347-361` is a UIA driver inside the `s11 up7` node; s11 output bare | crash test and exit code only | OK |
| rd-restore | `s11-win.ps1:475` `now.json`, `Save-S11Found` `found.json` | `s11 restore-check` (`-StopOnFail`, ps1:836) | OK (same writer pair as Run 16) |
| rd-logs scan inputs | state.json `alias`/`sentinel` (from make, kept by stateCompat's spread) | `scanCtx` (s11b.ts:380-392) and `Get-R17Alias` (ps1:270-274) | OK |
| RD-8 snapshot | s9 `say(rowLine(...))` with the K-filepage message | ps1:624 unanchored `-match 'This tab shows a local file'` | OK |
| judge-row `lat` → LAT | `latLine` printed by s11b judge-row, bare | `Get-R17LatMs` (ps1:285) unanchored | OK |
| state.json `tabs` lookups | s11 setup keys / s9 `--as` keys | s9 `resolveTab` (s9.ts:258), s11b `handleOf` (s11b.ts:532-540) | OK (keys disjoint as listed) |

**Missed seams: none found.** I also checked:
- `Show-S16`'s `'^STOP:'` count (ps1:58). s9's STOP lines are bare (s9.ts:1265, 1277), and s9 has no `say("STOP…`.
- `Write-R17Row`.
- `Wait-R17Bg`: it runs s11b only.
- `Invoke-R17Flight`'s `CALLT`: s11b, bare.

## 8. Gates (item 7)
- `npm test`: **Test Files 179 passed (179); Tests 4495 passed (4495)**. This matches the claim.
- `npx tsc --noEmit -p` exits 0 for all seven configs: `recipes/tsconfig.json`, `.fe`, `.s10`, `.s11`, `.s11b`, `.s6` and
  `.s9`.
- `npm run typecheck` exit 0.
- `powershell -File recipes\s11b-r17.ps1 -Block plan` exit 0 (3 lines).
- `s11b-r17.ps1` has 0 bytes over 127.
- **Typecheck coverage of the new test.** The new test is not in `recipes/tsconfig.s11b.json`'s `include`, but it is
  type-checked. `recipes/tsconfig.s6.json`'s `test/*.test.ts` glob picks it up, and it is not in that file's `exclude`.
  `npx tsc --noEmit -p recipes/tsconfig.s6.json --listFiles` lists `recipes/test/s11b-seams.test.ts`, together with
  `s11b.ts`, `s11b-rules.ts` and `s9-rules.ts`, and the run exits 0.

## 9. Findings
1. **NIT**: `S4-live-fixer2.md` §4 implies no config type-checks the new test. `tsconfig.s6.json` does, through its glob
   (§8 evidence). Fix: if the follow-up adds the test to `tsconfig.s11b.json`'s `include`, also add it to
   `tsconfig.s6.json`'s `exclude`, as for its sibling s11b tests, so one config owns it.
2. **NIT**: `s11b-r17.ps1:152` `New-R17Tab` expects `ok` without `-StopOnFail`. A failed set-up `newtab` is now a counted
   FAIL, and the block goes on, where it used to be a thrown crash. The next call naming the key still STOPs: s9
   `resolveTab` throws SetUp → exit 2 (s9.ts:258-259), or s11b `handleOf` stops. So a failed set-up still ends in a STOP one
   call later. This is acceptable under the sheet, but the record will show a FAIL line before that STOP. No fix needed;
   worth a line in the runner's brief.
3. **NIT (positive, for the step agent)**: some pre-registered judgments were masked as NOT MEASURED at HEAD and are now
   reachable for the first time:
   - the STOP-MAP `covered-proceeds-hop` (ps1:585: an `ok` hop makes judge-row exit 2)
   - the RD-DL-ERR/HOP verdicts
   - the F-FILETAB filepage/fileurl verdicts
   - the RD-1/RD-3 LAT values

   Attempt 4 can therefore stop where attempt 3 did not. This is correct behaviour, not a regression.
4. **NIT**: `stateCompat` (s11b-rules.ts:878-879) tests presence (`in`), not type, so `opened: null` would still crash s9. No
   producer writes that. No fix needed.
5. **Note (not the fixer's lane)**: in attempt 3 the `ft` tab was created before `noteOpened` threw, so it is in no state
   list. The fixer's handoff, start attempt 4 with `-Block teardown`, stands. The runner should confirm that no stray
   fixture tab from attempt 3 remains before the preflight.

## 10. Proposed decisions
None.
