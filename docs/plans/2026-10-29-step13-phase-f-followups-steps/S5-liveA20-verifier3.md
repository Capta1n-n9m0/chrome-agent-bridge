# S5-liveA20 fix round 3 (the last): verifier report

Verifier: Claude Opus 5.5, medium. Role: `docs/agent-rules.md` §6 Verifier, no deviations. I only read and ran things. I
edited nothing except this report and `S5-liveA20-verifier3.txt` (raw output, home path written as `<home>`). No live
block ran, and nothing touched Chrome, the daemon or the ports.

## Verdict: PASS-with-notes

The round-3 diff is correct and stays in scope. Read statically, attempt 3 should get through NOTEA-b, ARGS-OLD,
R20-RESTORE and R20-LOGS without another helper throw of the kinds that stopped attempts 1 and 2. The notes cover what
a static read cannot rule out (N1, N2) and confirm the cause of the orphan (N3).

## Re-runs (raw output in the .txt)

| Check | Result |
|---|---|
| New tests on HEAD's `s13-r20.ps1` (`S13_R20_PS1` = `git show HEAD:` copy) | **3 failed**, 36 passed (39) |
| New tests on the fix | 39 passed |
| `npm test` | 243 files, **5807 passed** (5804 + 3, as the fixer said) |
| Eight recipes tsconfigs (`fe`, base, `s10`, `s11`, `s11b`, `s13`, `s6`, `s9`) | all exit 0 |
| `S11_OUT=<fresh mktemp dir> … s13-r20-a.ps1 -Block plan`, exit read with `$?` | exit 0; 22 blocks, same order as the ledger; dir left empty |

A small mismatch in the fixer's report: it says "3 failed, 36 skipped". I saw 36 *passed*. The red is still the
discriminating part.

## (a) `Invoke-R20OptionsStep` (`recipes/s13-r20.ps1:187-195`)

**What `Read-S11Stored` does** (`s11-win.ps1:167-176`), step by step:
- `Assert-S11Own`.
- `Set-S9Omnibox O about:blank`. This brings O to the foreground itself (`s9-win.ps1:290`) and throws only if it can't.
- Waits until O has left the options page.
- `Set-S9Omnibox O <options URL>`, then waits until O shows the options page.
- `Read-S11State`, which only reads UIA (`s11-win.ps1:152-165`) and prints one `STATE` line: counts plus the empty-text
  hash.

It changes no state: a box or toggle is set only by `Set-S11Box` or `Set-S9Switch`. It prints no URL, because
`Set-S9Omnibox`'s two lines are patched to print the url-class (`$S12OmniPairs`, `s12-win.ps1:192`). Attempt 2's record
confirms this: every load prints `now shows url-class=…`, at lines 109, 111, 117, 119, 200, 202, 205 and 207.

**It works from the state O is in after CON-4 / CON-FLOOR.** Attempt 2's STOP path is the direct evidence (record
lines 186-208):
1. The toolbar was pressed twice more at 17:01:31.9 and 17:01:33.5. That is four presses after O's last fresh load,
   plus the failed read.
2. `Read-S11Stored O` then reached about-blank at 17:01:34.6, the own page at 17:01:35.3, and printed `STATE` at
   17:01:35.4.
3. A second one followed at 17:01:36.9.

The wrapper calls the same function on the same window in the same kind of state. Its first step does the
foreground-and-type that the stale read skipped.

**Can the wrapper make a restore fail where HEAD would not have?** No.
- On HEAD, `Restore-R19Block` → `Set-S11BoxVerified` → `Set-S11Box` (needs `Get-S9Options`) → `Read-S11Stored`
  (`s11-win.ps1:195-196`). So HEAD's restore already calls `Read-S11Stored` on O, one step later. The wrapper adds
  nothing new that can fail. It only runs the same call earlier, and then `Set-S11Box` meets a page it has just loaded.
- If `Read-S11Stored` throws inside the wrapper:
  - In the step's undo: `R19Changed` stays `$true`, because it is cleared only after `& $r19s.f` returns
    (`s12-r19-a.ps1:21`).
  - In `Invoke-R19Row`'s `finally` (`s12-r19-a.ps1:44`): the throw replaces the original error, as HEAD's
    `Get-S9Options` throw did in attempt 2.
  - Either way the block exception goes to `Stop-R19Wave` with `throw-after-state`. That path runs the unwrapped
    `Restore-R19State` (`s13-r20.ps1:24`: `Use-S16Options`, `Set-S9Foreground W`, `Restore-S11Safety`), then reads
    back and prints `restored=yes|no readback=equal|n/a` truthfully (`s12-r19-lib.ps1:79-81`).
  - So the STOP reason a helper throw gets is unchanged, the stop path still restores and reads back, and no STOP rule
    was touched. **This is not a loosening.**
  - One difference: a box read-back that is actually unequal is still `not-restored` (from `Restore-R19Block`, which is
    unchanged). A load that throws before it is `throw-after-state`, the same class HEAD gives `Set-S11Box`'s throw.

**PS 5.1 scoping.** I tested a copy of the helper with stubs (.txt §6):
- The bare `throw` after the nested `try { Get-S9DocUrl } catch { }` rethrows the **original** error.
- The op's side effect and return value pass through.
- The three scriptblocks use only literals and script-level functions, so there is no closure or `$using` issue. They
  resolve in the same way as the existing `{ Set-R19BlockAdd … }` blocks did.
- `$r20u` is a local inside the function's catch, so it cannot shadow a global. `$global:O` is named explicitly, and it
  is the window `Use-S16Options` just returned or replaced.
- `Get-S12UrlClass` is loaded: `s13-r20-a.ps1:26` dot-sources `s12-win.ps1`.
- The regex `is not on this extension.s options page` matches the exact `s9-win.ps1:605` text.

**The diagnostic prints no URL.** The only `Say9` prints `CHECK <row> options-window url-class=<class>`.

**N1 (MINOR, diagnostic quality, not blocking).** `Get-S12UrlClass ''` returns `url-class=other`. An empty read (no
`RootWebArea`, the probable cause of the stale read) therefore prints the same as a foreign page. If the line ever
fires, it will not tell these two cases apart. A later fix could add an `empty` class. It is outside this lane, and it
does not affect the run.

## (b) "ARGS-3 and R20-RESTORE need no change": confirmed, with one residual

- **R20-RESTORE** (`s13-r20.ps1:211-218`):
  - It closes O if O is the wave's own.
  - `rd-restore` (`s11b-r17.ps1:834-841`) then calls `Use-S16Options`, which opens a **new** options window when O is
    not own or not live. `Restore-S11Safety` starts with the toolbar pair and then `Read-S11Stored` on that new window.
  - It never reads an old document. This holds even if ARGS-OLD's two extension reloads closed O's tab, because
    `Test-S11Own` checks `Test-S9Live`. Run 19's `Invoke-R19Restore` (`s12-r19-lib.ps1:229-235`) has the same shape.
  - Confirmed.
- **ARGS-3** (`s13-r20.ps1:132`): `Set-S11Flag` → `Set-S9Switch` → `Get-S9Options` (`s9-win.ps1:726`) reads O
  directly, with no fresh load.
  - In attempt 2 this passed at 17:01:04, even though O's last fresh load was in the prologue (around 16:59) and the
    POP rows had opened and focused other windows in between. So time and occlusion alone did not make O stale. The
    toolbar presses are what came between ARGS-3 and NOTEA-b.
  - Attempt 3 keeps the same order, with ARGS-3 before CON-4 / CON-FLOOR, so the claim holds on the evidence.
  - **N2 (MINOR, residual risk):** the cause is still unproven. If the stale read comes from something other than the
    toolbar presses, ARGS-3's `do` step and its restore are the one other place on the path that reads O without a
    fresh load. Wrapping `{ Set-R19JsOff }` / `{ Restore-R19Js }` in the same helper would cost about 2.5 s and remove
    that risk. This is optional, and I make no change here.

## (c) Static walk after NOTEA-b

**NOTEA-b itself:**
- The handle file comes from leg a, in the same `S11_OUT`.
- The actor waits up to 180 s for each `pressed` (`s12-r19-a.ts:370`, `sig`). The extra about 2.5 s in the `do` step
  and about 2.5 s in the undo fit easily.
- After the wrapper's load, `Set-S11Box` reads the page it just loaded. The undo is `Read-S11Stored` +
  `Set-S11BoxVerified` (its own read-back).
- I found nothing else that reads O.

**`r20-args-old`** (`s13-r20.ps1:135` → `Invoke-R19Swapped`, `s12-r19-lib.ps1:124-143`). The top-level names it needs
are all set in `s13-r20-a.ps1`:
- `$R19Commit` (`s12-r19-lib.ps1:15`, dot-sourced), `$R17Blocks['reload'|'console']` (`s13-r20-a.ps1:59`), `$Record`,
  `$Steps`, `$env:S11_OUT`.
- The swap's worktree is `<S11_OUT>\old-wt`, outside the repo as `s12-oldbuild.ts:48` requires. It runs its own
  `npm ci` and removes links with `rmdir` (`s12-oldbuild.ts:30-34`), as in Run 19.
- `Save-R19Seg` / `Open-R19Seg` handle D and E and reopen D before `& $Rows`. `Invoke-R20OldArgs` → `Read-R20Worker`
  uses the fresh `$global:D`.
- The rerun proof in the `finally` is `Invoke-R19Rerun` → `Invoke-R20Rerun` (redefined, `s13-r20.ps1:30-31`), again on
  the reopened D.
- `Invoke-R19Row 'R20-ARGS-OLD'` has no step list and does not touch O.

**Compared with Run 19's top level** (`s12-r19.ps1:19-71` against `s13-r20-a.ps1:17-63`):
- Every variable is present except `$Dash` and the `-b`/`-de` file globals (`$R19Fix`, `$global:R19Xk`).
- `$Dash` is used only in `s11b-r17b.ps1` block text and `s12-r19-c.ps1:86,96` (CHOOSE rows), none of which is on
  liveA20's path. R20 writes `[char]0x2014` itself.
- `$global:R19Xk` is null, and `Write-R19Dialogs` / `Get-R19DlgWindows` filter null out.

**`r20-restore`:**
- `rd-restore` reads `$FoundJson`/`$NowJson` (`s13-r20-a.ps1:43-44`), and `Step-S16` and `Read-R17Rules` come from the
  r17 functions (`s13-r20-a.ps1:57`).
- `Write-R19Dialogs` needs `Get-S12DialogCount` (`s12-win-c.ps1`, loaded at `s13-r20-a.ps1:28`) and
  `Get-S9ChromeWindows`.
- `Invoke-R20RestoreCheck` reads the same two json paths.

**`r20-logs`:**
- `$DaemonLog` is set at `s13-r20-a.ps1:45`.
- `$global:S16Mark` is set in R20's preflight since round 1 (`s13-r20.ps1:111`).
- `R19Segs` and `R19Pending` are globals.
- `Save-R19Seg 'end'` needs a live D, which ARGS-OLD's `finally` reopened.
- The node subcommands are `s11b clean-console` and `s13-r20 scan|scan-actors|rows20`.

I found no dropped setup and no stale-window read on these three blocks. I did not audit the row judges.

## (d) The orphan actor: cause confirmed (fixer cause (b), with the exact mechanism)

1. `s13-r20-a.ps1:20` (as `s12-r19.ps1:22`) puts `…\nvm\.nodejs` first on `PATH`. The `node.exe` there is the
   **NVM for Windows 2.0 shim**: 766,760 bytes, OriginalFilename `shim.exe`, "Node.js shim" (.txt §7).
2. `Invoke-R17Node` starts it (`s11b-r17.ps1:121`), so `S16Pids['node']` is the shim's PID. The shim starts the real
   `node.exe` as its child with the same arguments.
3. `Stop-S16Pid` (`s11b-r17.ps1:90-97`) uses `taskkill /F` without `/T` for non-`srv` names (line 94), so only the shim
   dies.
4. Measured with a harmless `node -e "setTimeout…"` under the wave's PATH (.txt §8): `children=1`,
   `taskkill exit=0`, `shim exited=True`, `child node.exe alive-after-kill=True`. I killed that child.
5. The attempt-2 record matches: `$p.WaitForExit(300000)` (line 127) returned within 46 ms of "stopped own process node"
   (17:01:31.576 → 31.622). The killed process did end. The survivor (PID 38600, the actor's own command line) is the
   child.
6. The fixer's (a) (taskkill's exit code is not checked) is true but is not the cause here: taskkill exited 0.

**N3 (MAJOR for the harness, not a blocker for attempt 3):**
- **When it happens:** only when `Stop-S16Pid 'node'` runs, which is on a driver throw or a budget overrun
  (`s11b-r17.ps1:126,128`). On a normal exit the shim waits for its child, so no orphan is left. A clean attempt 3
  leaves none.
- **What it costs after a STOP:** any STOP raised inside an actor row will again leave the real node alive, still
  connected to the daemon and maybe holding tab leases. The wave is already stopping at that point, and the runner can
  find it by its command line (`recipes\s13-r20-a*.ts`), as in attempt 2.
- **Fix (for the step agent to rule on):** the fix belongs in `s11b-r17.ps1` / Run 19's lane. It is not a plain `/T`,
  which line 88's comment rules out because the real node may have spawned the daemon. It could kill the shim's
  direct `node.exe` children by `ParentProcessId` before the shim, or point `-FilePath` at the real `node.exe`.
  Out of lane for this round.

## (e) Scope

`git diff --stat` touches only `recipes/s13-r20.ps1` (+10/−1), `recipes/test/s13-r20-ps.test.ts` (+24) and the ledger.
Outside the new helper, the only change in `s13-r20.ps1` is the one `Invoke-R20NoteaB` line.

Unchanged:
- the step ids (`R20-CON-NOTEA-block`)
- the actor (`s13-r20-a2`) and its command (`con-notea-b`)
- `Restore-R19Block` / `Set-R19BlockAdd` (`s12-r19-a.ps1`, untouched)
- every STOP reason, pass rule, judge, expected text and POP function

The new tests are source-level and discriminating: 3 red on HEAD, green on the fix.

## Findings

| # | Severity | Where | Finding |
|---|---|---|---|
| N1 | MINOR | `s13-r20.ps1:191` / `s12-win.ps1:181-187` | An empty doc URL prints `url-class=other`, the same as a foreign page; the diagnostic can't tell those two cases apart. |
| N2 | MINOR (residual) | `s13-r20.ps1:132` | ARGS-3 still reads O without a fresh load. It passed in attempt 2 in the same order; optional symmetric wrap. |
| N3 | MAJOR (harness, out of lane) | `s11b-r17.ps1:94,121,126` | The nvm shim + `taskkill /F` without `/T` leave the real actor alive after any driver-throw STOP. It cannot happen on a passing run. |
| — | note | fixer3 report | "36 skipped" should read "36 passed" in the red run. |

**Attempt 3, concretely:**
- The NOTEA-b throw class is addressed by a call that is proven in the same state (the attempt-2 STOP path).
- The ARGS-OLD, R20-RESTORE and R20-LOGS paths read no stale window and need no setup that R20 dropped.
- What remains are live-only risks a static read cannot see: the old-build swap's `npm ci` inside its 300 s budget, and
  the two extension reloads. Run 19's liveD19 ran both with the same code.
