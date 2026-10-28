# S7-drivers-B verifier: liveB19's row drivers

Model and effort: Opus 5.5, medium. Nothing ran live: no daemon, Chrome, fixture server or port 9234. Raw output:
`S7-drivers-B-verifier-evidence.txt` (sections §1–§8 below are its sections).

## 1. Verdict
**FAIL.** Five MAJOR findings and a failed exit check. Five of my ten driver mutants survive: the skipped restores
(M3, M4), the SWEEP-HELD reload without its capture segments (M5), a clause read from the wrong line (M6), and a
DevTools judgment not from the control's code (M8, M12). Two findings are defects in the live path, and they are
likely to end liveB19 early: the carried banner rows can STOP on a reason §4.27 does not give them (F1), and
SWEEP-HELD reads the reopened capture window as "DevTools still open", so it STOPs `devtools-left-open` on every
attached run (F2). Typecheck, the 7 recipes tsconfigs, the build and both test suites are green. The size is within
the cap.

## 2. Outputs
- `npx vitest run recipes/test`: **before** (HEAD 93f2fc1, a scratch worktree made with `git worktree add` and
  `npm ci`) `Tests 9 failed | 1475 passed (1484)`, `Test Files 1 failed | 61 passed (62)`. The 9 are the known
  worktree-CRLF failures in `s11-r16-runner.test.ts` (recipes/CLAUDE.md), so the claimed 1484/62 holds. **After**
  (main tree): `Tests 1530 passed (1530)`, `Test Files 63 passed (63)`. +46 tests, +1 file (§1, §2).
- All 7 `npx tsc --noEmit -p recipes/tsconfig*.json` exit 0. `npm run typecheck` exits 0. `npm run build` prints
  `built extension → dist/`. `npm test` gives `Test Files 229 passed (229)`, `Tests 5430 passed (5430)` (§3).
- Size, re-counted with `wc -l` and `git diff --numstat` (§4):
  - Code: 311 + 139 new, plus 57 added in the edited files, for about 507 (cap 750).
  - Tests: 394 new, plus 26 added, for about 420 (cap 600).
  - Within the cap, but many lines run to 200–294 characters.
- Red on a stub, re-proved (S0): all nine pure judges of `s12-r19-b.ts` replaced by constants turns 6 tests red (§5).
- Tree: `git status --short` and the sha256 of every `recipes/*`, `recipes/test/*` file and the builder report are
  identical before and after (§8). My mutants ran on a copy of the builder's files inside the scratch worktree, not in
  place, so nothing in the main tree was ever modified. The worktree is unregistered (`git worktree list` shows only
  main). The main `node_modules` and its junctions are intact.

## 4. Deviations
- I ran the mutants in a scratch copy, not in place as the brief said: the same files and the same tests, with no
  risk to the main tree. Each mutated `.ps1` was parse-checked (0 errors each) and each file was restored and its sha
  checked.
- `git worktree remove --force` left a part-deleted scratch folder (`scratchpad/wtv`, dangling `@bridge` junctions)
  behind. It is outside the repo, and I did not delete it recursively.

## 6. Findings

### F1 · MAJOR · The carried banner rows STOP where §4.27 records a finding
`recipes/s12-r19-b.ps1:84,86` run R19-UP-6 and R19-F-RAW* with `-Banner refused -Why attach-on-refused-page`.
`judgeBannerRefused` (`recipes/s12-r19-a.ts:54-57`) has no FAIL: `seen` with IDLE ≥ 20 000 and a passing control is
`STOP attach-on-refused-page`, and anything else is NOT MEASURED.
- §4.27's STOP map gives `attach-on-refused-page` to "R19-CON-3, -OWN, -FILE, -JSOFF, R19-ARGS-3, R19-CHOOSE-2,
  -JSOFF … not R19-KEEP-3". UP-6 and F-RAW are not in it, and their pages are not blocked, own or `file:` pages.
- UP-6's pass rule: "no banner sample positive in the window … a `seen` on a refused leg that did reach the
  extension is a finding for the gate's order, recorded".
- F-RAW's pass rule: "a banner here is a finding only with a passing R19-BANNER-CTL".
- Phase doc § STOP rules, "Continues anyway, recorded": "a carried Run 18 row that fails with a passing control (a
  product finding, proposed)".
- Run 18 read `seen` on 5 of 5 legs, so this STOP is the likely live outcome. It would end liveB19 before every KEEP
  and DevTools row.
- The new `record` kind (`s12-r19-a.ts:61`, `judgeBannerNoCall`) ignores IDLE and the control. With a failed
  R19-BANNER-CTL, `none` is PASS. The BANNER-CTL row says a failed control makes "the carried rows" banner clauses NOT
  MEASURED.

The builder's W5 reads the Banner rule as covering every refused call. The STOP rule and the STOP map name the rows,
and the phase doc says these rows continue.

*Fix:* add a `carried` kind to the `banner` command:
- `seen` with IDLE ≥ 20 000 and the control passing is FAIL, with both counts recorded;
- `none` with both conditions is PASS;
- anything else is NOT MEASURED;
- never a STOP.

Use it for every leg of UP-6 and F-RAW; legs with `sent=0` keep the record wording but obey IDLE and the control.
Add a stubbed test that a `seen` UP-6 leg is no STOP.

### F2 · MAJOR · SWEEP-HELD reads the capture window as "DevTools open", then STOPs on it
- `Invoke-R19SweepReload` (`s12-r19-b.ps1:59-63`) reopens the worker-console capture with `Open-R19Seg`. That
  window's title starts with `DevTools` (`s9-win.ps1:581`, `Wait-S9NewWindow … 'DevTools*'`).
- `$global:S12Before` was taken before the reload, by `Open-S12DevToolsMenu` (`s12-win-b.ps1:50`). So the new capture
  window is not in it.
- The `val` step `Test-S12DevToolsUi $global:R19Xk @($global:S12Before)` (`s12-r19-b.ps1:132`) checks windows first
  (`s12-win.ps1:85-87`). It returns the capture window, so `devtools-open=yes` whatever happened to X's DevTools.
  §4.27's discrimination ("a sweep that took the tab from DevTools would close the DevTools session
  (`devtools-open=no`)") is therefore lost.
- `Close-S12DevTools` then re-checks against the same `S12Before` (`s12-win.ps1:129-130`) and finds the capture
  window. It prints `STOP: a DevTools window or pane is left open` and returns `$false`, and `Invoke-R19DevRow` turns
  that into `Stop-R19 'devtools-left-open'`. This happens on every attached run.

*Fix:*
- Exclude `$global:D`, the capture window, in the check, or add it to `$global:S12Before` after `Open-R19Seg`.
- Judge `devtools-open` from X's own DevTools record (`$global:S12Dev`).
- Test it with a stub where the capture window reopens.

### F3 · MAJOR · SWEEP-HELD's reload runs two nested node processes inside the running actor
- `Invoke-R19SweepReload` is a `do` step, so it runs inside the driver of `Invoke-R17Node 's12-r19-b' sweep-held`. It
  calls `Invoke-R19Rerun`, which is `Invoke-R19Node 's12-r19' proof`. It also runs `$R17Blocks['reload']`, which ends
  in `Invoke-R17Node 's11' setup` (`s11b-r17.ps1:444`).
- `Invoke-R17Node` uses one fixed `node-out.txt` / `node-err.txt` and one pid slot, `node`
  (`s11b-r17.ps1:116-133`).
- Measured here (§7, PS 5.1): the file is in use, so the delete fails; the nested `Start-Process` onto the same file
  starts anyway; the result is `FILE: 3|2`, with the nested writer over the outer's first line.
- So the actor's record is corrupted. The re-run's `LOADED rerun=<k>` line also gets mixed into the actor's output,
  which `Show-S16` reprints at the end. And `S16Pids.Remove('node')` drops the outer actor's pid, which leaves an
  orphan if it is ever killed.
- No liveA19 driver nests a node call. `Invoke-R19Swapped` reloads outside any actor.

*Fix:*
- Split SWEEP-HELD into two actor runs: a first that sets up DevTools and exits, then the reload, `Open-R19Seg` and
  the re-run at block level, then a second actor that re-claims and judges.
- Or give `Invoke-R17Node` per-call output files. That is outside this slice; ask the step agent first.

### F4 · MAJOR · KEEP-OVERLAP leg a never overlaps
`s12-r19-b.ts:289-291`: `const [f, s] = [await p1, await att(() => t.evaluate("2"))]` waits for the first call to
finish before it starts the second. Measured with the same shape (§6): `second start=1506`, not 300.
- The second call then answers `ok`.
- `judgeOverlap` turns that into FAIL. §4.27 says "a build that lets the second share the session answers `ok`", so
  this is a false product FAIL on a correct build.
- No test drives the actor.

*Fix:*
- Start the second call before awaiting the first:
  `const p2 = att(() => t.evaluate("2")); const [f, s] = [await p1, await p2];`
- Check the first call's value (`1`): "the first answers as without the second".

### F5 · MAJOR · KEEP-4's line and DEVT-NOFLAG's word can come from the wrong call
`s12-r19-b.ts:128`: `keepdtLine(R, "devtools", dv?.code ?? p.answer)`.
- When the judged call `dv` answers `ok`, the `KEEPDT … leg=devtools next=` line prints the poll's answer, usually
  `DEBUGGER_DEVTOOLS`.
- `Invoke-R19Keep4` reads that line into `$global:R19KeptAns`, so DEVT-NOFLAG records `kept-then-devtools=K-devt` for a
  call that answered `ok`.
- The row's verdict uses `dv` and stays right, but the record (form 19) and the RECORD row are false. That is the
  integrity floor's "never invent a result".
- A related gap: when the poll never reaches K-devt (`p.attached` false, so the opener failed in this row), KEEP-4
  and SWEEP-HELD judge a product FAIL. It should be NOT MEASURED, as `devtJudges` does for UP-DEVT
  (`s11b.ts:1077`).

*Fix:*
- Use `code(dv)` in the line.
- Make the legs NOT MEASURED when `!p.attached`.
- Unit-test both.

### F6 · MAJOR (exit check) · The required mutants survive (§5)
| Mutant | Result |
|---|---|
| M3: KEEP-3's composite `-Restore` removed | survived |
| M4: nav-blocked's undo no longer restores the block list | survived |
| M5: SWEEP-HELD's step calls the reload and re-run without `Save-R19Seg`/`Open-R19Seg` | survived (b test and static test) |
| M6: DEVT-NOFLAG's `--probe` and `--kept` swapped | survived |
| M8: DevTools opened by the F12 method instead of `Open-S12DevToolsMenu` | survived |
| M10: UP-6 without `-Banner` | survived |
| M11: KEEP-3's `kept-session-used` STOP turned into a FAIL leg | survived |
| M12: SWEEP-HELD's `devtools-open` a constant `yes` | survived |
| M9: the liveA19 hook: every banner leg judged `record` | survived (s12-r19-a.test.ts, 51 green) |
| M15: the liveA19 hook: `Invoke-R19Row` ignores `-Actor` | survived (a, b and static tests) |
| M1, M2, M7, M13, M14 | killed |

The tests prove that `Invoke-R19SweepReload` orders its segments, but not that SWEEP-HELD calls it. They check KEEP-3's
step ids, not what the undo steps do, and they never run `Invoke-R19Keep3`'s restore.

*Fix:*
- Run `Invoke-R19Keep3`, `Invoke-R19SweepHeld` and `Invoke-R19DevtNoflag` through a stub `Invoke-R19Row` that runs the
  step bodies.
- Assert the restore calls, the segment order and the `devnoflag` arguments.
- Assert the `--kind` that `Invoke-R19Row` passes (refused for a liveA19 row, carried or record for UP-6) and the actor
  name it passes.
- Add a TypeScript test of the `kept-session-used` throw.

### F7 · MINOR · BANNER-CTL is not consulted by KEEP-1 or KEEP-2
§4.27 R19-BANNER-CTL: "A FAIL makes every banner clause of this slice NOT MEASURED (… slice B: the carried rows,
R19-KEEP-1 and -2's banner clauses)". `keep1` and `keep2` (`s12-r19-b.ts:205-244`) never read `x.ctl`. So with a
failed control, KEEP-1's banner leg still passes or fails, and KEEP-2 still feeds KEEP-3's medians.
*Fix:* when `x.ctl !== "pass"`, make KEEP-1's banner leg and KEEP-2's end clause NOT MEASURED, which also makes
`measured=no`.

### F8 · MINOR · KEEP-2's idle legs print `next=ok` without reading the answer
`s12-r19-b.ts:230-232`: `next` starts as `"ok"` and is never set on the idle leg. *Fix:* set
`next = code((await att(() => con.evaluate("1"))).e)`.

### F9 · MINOR · DEVPROBE's actor exit code is dropped
`s12-r19-b.ps1:42`: `[void](Invoke-R19Node …)`. An actor `STOPWHY devtools-left-open` (exit 2,
`s12-r19-b.ts:103`), or a `findTab` failure, gives `rc=2` and no STOP. That holds unless the window driver also failed.
`Invoke-R19DevtNoflag` (`:137`) drops its exit code the same way. *Fix:* `if ($rc -eq 2) { Stop-R19Actor 'DEVPROBE'
$global:R17Out }`.

### F10 · MINOR · CON-KEPT leaves its MCP tab open
`s12-r19-b.ts:280` opens a tab through `browser_new_tab` and never closes it. `run()` closes only `x.open` tabs.
*Fix:* `browser_close_tab {tab: mt}`.

### F11 · NIT · Line forms
- UP-6 prints `IDLE R19-UP-6-<leg> since-attach-ms=`, where §4.27 says `IDLE R19-UP-6 since-attach-ms=<n>` per leg.
- It prints `CALLS <id> sent=<n>`, where the sheet says `calls-sent=0`.
- KEEP-2's ctl leg checks the code only. The pass rule asks no more, but the expected text quotes
  `SINGLE_FILE_INPUT_MESSAGE`.
- KEEP-4 opens DevTools by the menu, about 3.6 s after the call (`s12-win-b.ps1:52-58`, 3 × 700 + 1 500 ms). §4.27
  says "within 1 s". The polls keep the session alive, so the leg still discriminates. This is wording only.

### Checked and holding
- **Every block registered.** Every block of liveB19's order is registered (the static test, and I re-read
  `s12-r19-lib.ps1:10` against `s12-r19.ps1:119-135`).
- **DevTools only in a wave window.** DevTools opens only in a wave window on an 8081 fixture
  (`Open-S12DevToolsMenu` asserts both).
- **DEVPROBE.** `attached` is taken from the DEVPROBE line's code (M1 killed).
- **NOT MEASURED path.** It touches nothing.
- **UP-OPT.** It sits behind `Test-R19Gate`, and its `O2 did not show…` line comes from the patched `Invoke-S12Opt`
  (`s12-win.ps1:170,181`).
- **N-2, N-3, N-5.** Done, with tests and mutants.
- **MINOR-A.** `$S9TitleOff` exists (`s9-win.ps1:178`). An unreadable title is a STOP through `Stop-R19`, never a
  product verdict.
- **Redaction (#361).** The MCP actor adds no new tool to the record: `browser_new_tab` and `browser_console_messages`
  already pass through `actorRecord`.
- **liveA19 left alone.** In liveA19 no actor prints `CALLS`, and every `s` step id equals its row id, so the `record`
  kind and the new labels do not change any liveA19 line today. Its tests are green and its in-suite mutants are red.
  F6's M9 and M15 show that these hooks have no test.
- **KEEP-3's omnibox proposal.** Sound: a bridge `navigate` would refuse the event itself, and `Set-S9Omnibox` is the
  wave-window method `recipes/CLAUDE.md` names. It is a step-agent ruling, not mine.
- **DEVNOFLAG's `other`.** For `kept-then-devtools` it is the sheet's own word. Adding `other` to `probe` is a wording
  gap (W3), recorded, not edited.

## 7. Handoff
- Nothing running. The scratch worktree is unregistered, and the main tree is unchanged (sha256 + status).
- For the fixer:
  - F1 is a ruling the step agent should confirm: "carried banner rows FAIL, never STOP", from the STOP map and the
    phase doc's "continues anyway".
  - F3 changes SWEEP-HELD's structure.
  - F2 to F6 are fixes in this slice's files.
  - Re-run my mutants: the scratchpad's `mut/mutants.mjs`, its cases listed in evidence §5.
