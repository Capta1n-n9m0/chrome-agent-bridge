# S5-runner verifier report, round 2

Model: Claude Opus 5.5. UTC 2026-10-26T04:08:46Z → 2026-10-26T04:14:41Z (`date -u`). Role: verifier, round 2 (agent-rules §6).
I re-checked only the items the fix round touched. Nothing ran live: no daemon, no Chrome UIA, no reload, no fixture server.
Ports 9234, 8081 and 8084 had no listener at the start or at the end (`netstat -ano`, no LISTEN lines). Scratch harnesses
and mutants are in
`C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\9c6ea090-7b81-4653-b2ad-abef50160f29\scratchpad\r16v\r2`.

## 1. Verdict

**PASS-with-notes.** MAJOR-1 and MINOR-1…4 are fixed, and each new test fails when its fix is reverted. One new MINOR:
a vetted tag exempts the whole line it sits on, so a leak added to that line passes the scan. Two NITs follow.

## 2. Checks

| # | Check | Result |
|---|---|---|
| a | MAJOR-1 | **Fixed.** I ran my round-1 harness `dbl.mjs` against the new text. It is built from the real `Step-S16`, `Stop-S16Wave`, `$Blocks['up-restore']`, `Invoke-S16Block` and the main try/catch. I ran it with five restore stubs. Returning `$false` after a STOP, throwing, returning a bare `$false`, and printing a STOP then returning `$true` each gave `RESTORE-CALLED 1`, "the stop met the restore itself; no second restore" and **exit 2**. A clean `$true` gave one call and exit 0. A STOP printed during the restore ends the wave: the block's STOP count throws, and exit is 2. s11-r16.ps1:345-352. |
| b | MINOR-1 | **Fixed.** I re-planted all 21 round-1 leaks (`mut.mts`): **21 of 21 caught**, and the unplanted baseline is clean. `scanPs1Output` lives in the committed `recipes/s11-win-rules.ts`, and `git diff` shows that file unchanged. The new `scanR16` rules only add checks (s11-r16-plan.ts:89-119). On the tag, see MINOR-A: a second `# vetted-clixml` site is refused and so is a moved tag, but a leak written on the tagged line itself is not. |
| c | MINOR-2 | **Fixed, and acceptable against the sheet and #245.** `Read-S16Early` (s11-r16.ps1:175-186, called at :391) runs only in liveB, right after `preflight`. It opens one window of its own (`Open-S11Window`: allow-listed URL, stable window set, marked window), reads the toggle read-only (`Read-S11FileAccess` presses nothing) and closes that window in a `finally`. That is the same read UP-0 makes. It starts no server, writes no file, opens no tab and changes no state. So "liveB does not start" holds in the sense #245 cares about: no upload row runs and nothing the user owns changes. My harness `early.mjs` runs the real `Read-S16Early`, `New-S16Window`, `Save-S16`, `Stop-S16Wave`, `Close-S16Windows` and the main loop; see the table after this one. |
| d | MINOR-3, MINOR-4 | **Fixed.** :132: exit 1 with no `^(ROW\|CHECK) ` line throws. :88-89: `/T` only for `srv*`, node gets `/F` alone. `taskkill` appears only at :89. The only PIDs ever recorded are `node` (:117), `srv8081` (:220) and `srv8084` (:222), and each is killed only when its start ticks match. No `chrome.exe` kill and no `Stop-Process`. |
| e | Regression | PowerShell 5.1.26100.9711 `ParseFile`: **0 errors**. 403 lines (≤500), 0 non-ASCII bytes, 0 CR bytes. `npm run typecheck` exit 0. `npm run build` exit 0 ("built extension → dist/"). `npm test`: **Test Files 152 passed (152), Tests 3784 passed (3784)**, which matches the fixer. `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11}.json`: all six exit 0. `git status`: only the lane files (`s11-r16.ps1`, `s11-r16-plan.ts`, `s11-r16-opt.ts`, the two tests, `tsconfig.s11.json` +4 includes), `journal.md` and the steps-dir reports. |

`early.mjs` results, one row per path (blocks = blocks run; globals = the globals file after the run):

| Read stub / open stub | Output | Exit | Blocks | Globals |
|---|---|---|---|---|
| `off` | window 7 closed; `GATE liveB refused before any state change` | 3 | preflight only | removed |
| `on` | window 7 closed; the whole slice | 0 | 30 | kept |
| `Stop9; 'unreadable'` | window closed, then STOP, then the wave ends | 2 | 1 | kept (teardown needed, as after any STOP) |
| read throws | window closed by the `finally`; the wave ends | 2 | 1 | kept |
| open: `Stop9; 0` | `no wave window`; the wave ends | 2 | 1 | kept |
| open registers window 9, then throws (omnibox) | `Close-S16Windows` in the stop procedure closes window 9 | 2 | 1 | kept |

**Do the new tests fail without the fix?** I copied `recipes/test/s11-r16-fixes.test.ts` to the scratch dir, changed only
its source path to `$env:MUT_PS1`, and ran it with the repo's vitest config:

```
orig  Tests 8 passed (8)
M1 (finally restored)      × false-return test  × throw test           Tests 2 failed | 6 passed
M2 (early read removed)    × off test  × on test                       Tests 2 failed | 6 passed
M3 (crash rule removed)    × crash test                                Tests 1 failed | 7 passed
M4 (always /T)             × Stop-S16Pid test                          Tests 1 failed | 7 passed
```

All four fixer claims are confirmed.

## 3. Findings

### MINOR-A: a vetted tag exempts its whole line, so a leak added to that line passes the scan. s11-r16-plan.ts:100, :107, :109
`rest` blanks every line that carries a vetted tag before `scanPs1Output` runs. The sink checks also skip the line once the
tag is present. The scan counts the tags but never checks what the tagged line says. `tag.mts` / `tag2.mts`:
```
MISSED sameLineHost    $h | Export-Clixml $GlobalsFile; Write-Host $Root   # vetted-clixml
MISSED sameLineSay     $h | Export-Clixml $GlobalsFile; Say9 "r $Root"   # vetted-clixml
MISSED clixmlToRecord  $Root | Export-Clixml $Record   # vetted-clixml          (writes ROOT into the repo's run record)
MISSED fwSame / fwRecord / ndSame   (the same on the vetted-file-write and vetted-node-output lines)
CAUGHT movedTag, secondTag, sameLineShow
```
The two older tags already had this gap in round 1; the new clixml tag inherits it. Today's three tagged lines are safe
by reading (:55, :75, :357). **Fix:** pin each vetted line's exact text, for example
`^\s*\$h \| Export-Clixml \$GlobalsFile\s+# vetted-clixml$`, and plant one same-line leak per tag in the test.

### NIT-A: `Read-S16Early` does not count STOP lines. s11-r16.ps1:175-186
It runs outside `Invoke-S16Block`, so a STOP line printed during it is not counted the way a block's is. With a stub that
prints `STOP: stray` and returns `on`, liveB ran all 30 blocks and exited 0. No real helper does this today:
- `Read-S11FileAccess` prints STOP only together with `unreadable`, which ends in `Fail-S16`.
- `Open-S11Window` returns 0 after its STOPs, so `New-S16Window` throws.
- `Close-S11Window` / `Close-S9Window` only `Say9`.

**Fix:** take `$s0 = $global:S16Stops` on entry and call `Fail-S16` if the count rose.

### NIT-B: a path variable inside a longer string, alone on a line, passes the scan. s11-r16-plan.ts:113
`"x $Root"` alone on a line in a block reaches stdout through the block's pipeline. It is MISSED (`strLine`). A bare
`$Root` and `"$DaemonLog"` are caught. **Fix:** also flag a line that is only a double-quoted string containing a
`SENSITIVE_VAR`.

### Notes (no change asked)
- On the OFF path, liveB writes only the framing `GATE` line and nothing to the run record. That is correct: the sheet has
  liveA's UP-0 record the 17 `NOT RUN — waits for G11-3` rows.
- NIT-1…NIT-5 from round 1 are still open. The fixer left them alone, as the brief allowed.

## 4. Proposed decisions

None.

## 5. Handoff

No process left running. The `%TEMP%\r16v2-globals.clixml` file the harness used was removed. Scratch files:
`early.mjs`/`early.sh` (MINOR-2 paths), `tag.mts`/`tag2.mts` (MINOR-A), `mkmut.mjs` and `m/` (mutants M1–M4 and the
relocated test). All are in the scratch dir above.
