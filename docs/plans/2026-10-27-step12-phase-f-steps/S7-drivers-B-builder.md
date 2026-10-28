# S7-drivers-B builder: liveB19's row drivers

Model and effort: Sonnet 5.5, medium. Nothing ran live: no daemon, Chrome, fixture server or port 9234.

## 1. Verdict
DONE. Every block of liveB19's order has a registered driver, DEVPROBE included. Code is 450 new lines in the two new files, plus about 60 changed in existing ones (cap 750). Tests are 394 lines in the new file plus 30 changed elsewhere (cap 600).

## 2. Outputs
Files, new:
- `recipes/s12-r19-b.ts` (the actors and pure judges)
- `recipes/s12-r19-b.ps1` (the drivers)
- `recipes/test/s12-r19-b.test.ts`

Files, edited:
- `recipes/s12-r19.ps1`: dot-sources -b and registers 15 blocks as `$global:R19Blocks['<block>'] = { … }`.
- `recipes/s12-r19-a.ps1` and `recipes/s12-r19-a.ts`: MINOR-A, plus the hooks listed in §4.
- `recipes/s12-r19-lib.ps1`: N-2, N-5, and the bc close in liveB19.
- `recipes/s12-r19.ts`: N-3.
- `recipes/tsconfig.s11b.json`: includes the new files.
- `recipes/test/s12-r19-static.test.ts`: extended with the liveB19 static test.
- `recipes/test/s12-r19-a.test.ts`: the toolbar stub gets `$S9TitleOff`, and the actor-command regex skips -b rows.

Commands and numbers:
- Line counts: `wc -l recipes/s12-r19-b.ts recipes/s12-r19-b.ps1 recipes/test/s12-r19-b.test.ts` gives 311, 139 and 394. `git diff --numstat -- recipes` gives the edits.
- `npx vitest run recipes/test`: before 1484 tests, 62 files; after 1530 tests, 63 files.
- Every `npx tsc --noEmit -p` on the 7 `recipes/tsconfig*.json` files exits 0.
- `npm run typecheck`: exit 0, no output.
- `npm run build`: `built extension → dist/`.
- `npm test`: `Test Files 229 passed (229)`, `Tests 5430 passed (5430)`.

### Rows and blocks
- **New actors** (`s12-r19-b.ts`): `devprobe`, `up-6`, `raw` (F-RAW, -2, -DIR), `keep-1`, `keep-2`, `keep-3`, `con-kept`, `overlap-a`, `up-devt`, `keep-4`, `sweep-held`, `devnoflag`, `upopt-judge`.
- **Already there, reused:** `root-add`, `r19-banner-ctl`, `closerprobe`, `r19-restore`, `r19-logs`, and the UP-OPT report gate (`Test-R19Gate`).
- **DEVPROBE:** a driver that calls `devprobe()` through `Invoke-S12DevProbe`. `attached` is read from the printed line's `answer=`/`attached=` only. `$global:R19Devt` is `no` unless that line says `yes`.
- **DevTools rows:** `Invoke-R19DevRow` serves UP-DEVT, KEEP-4 and SWEEP-HELD.
  - If DEVPROBE was not `yes`, it prints `ROW <id> NOT MEASURED — DevTools was not attached` and touches nothing.
  - Otherwise it opens window X on a fixture, runs `Invoke-R19Row` with a restore, and a finally closes DevTools (`Close-S12DevTools`) and X.
  - A DevTools left open is `Stop-R19 'devtools-left-open'`.
  - DevTools is opened only by `Open-S12DevToolsMenu` (uia-menu).
  - The judgement is from the control call's code.
- **SWEEP-HELD:** `Invoke-R19SweepReload` runs `Save-R19Seg 'reload'`, then the reload, then `Open-R19Seg`, then `Invoke-R19Rerun`. A failed re-run is `old-build-left-loaded`. The actor re-claims the tab after the reload and prints `SWEEPHELD`. `devtools-open` is read by the driver through UIA (a `val` step).
- **UP-OPT:** `Invoke-R19UpOpt` runs R18's steps. `upopt-judge` replaces `s11b judge-opt`, so no `ROW R17-UP-OPT` line enters the record.
- **UP-6 and F-RAW\*:** 5 and 1 sampler windows through `Invoke-R19Row -Banner refused`. The actor waits for `idle(id)` before every window, so IDLE is at least 20 000 ms. Page and refusal clauses are judged with `refusalStepJudge` with `banner:false`. The banner goes through the Banner rule.
- **KEEP-1:** one timeline; the row prints `PASS banner-clause=NOT DISCRIMINATING`.
- **KEEP-2:** six timelines (idle ×3, ctl ×3). It prints `CHECK … medians … measured=<yes|no>`, which KEEP-3 reads.
- **KEEP-3:** each change has its own undo.
  - Disarm and block are inline events of the timeline; the undo follows it.
  - nav-blocked, nav-own and nav-file each get a wave window opened by a `do` step and closed by its `undo`.
  - nav-file runs only when `$global:S16Toggle` is `on`; otherwise `CHECK … NOT RUN — waits for G11-3`.
  - close is the actor's own `tab.close()`.
  - replace is a `CHECK … NOT RUN`.
  - The next call must be the exact refusal, else the STOP `kept-session-used`. The composite restore is toolbar on, `Restore-R19Block`, close X.
- **CON-KEPT, KEEP-OVERLAP leg a, DEVT-NOFLAG:** CON-KEPT also reads through `browser_console_messages`. DEVT-NOFLAG prints `DEVNOFLAG probe=… kept-then-devtools=…` and `ROW R19-DEVT-NOFLAG RECORD`; the words come from DEVPROBE and KEEP-4's devtools leg.
- **bc tab:** `Invoke-R19Restore` calls `Close-R19Bc` in liveA19 and liveB19.

## 3. Verifier verdict
None yet. A fresh Opus verifier is next.

## 4. Deviations
- **Tests after the code, not before.** To show the decision tests are red on a stub: I replaced `s12-r19-b.ts` with an all-constant stub (judges return `PASS`, `cmds` empty) and ran the pure-decision and sheet-word tests. 10 failed. I then restored the real file; `git status` shows only the intended files.
- **Hooks in S7-drivers-A's files (small):**
  - `Invoke-R19Row` gained `-Actor` and `-BudgetS`.
  - A `t` step counts as a front-needing step.
  - An unknown step kind calls `Invoke-R19StepB`.
  - A banner leg whose actor printed `CALLS <id> sent=0` is judged by the new `record` kind: `RECORD` if seen, never a STOP. §4.27 says a UP-6 positive with `calls-sent=0` is a recorded finding.
  - Each banner leg's label is its step id's suffix (`outside`, `missing`, …), so `BANNERCALL` lines differ per leg.
  - `Complete-R19Row` appends `$global:R19PassNote[$Id]` to a bare `PASS`; only KEEP-1 uses it.
- **Exports:** 12 names in `s12-r19-a.ts` gained `export` (`run`, `att`, `idle`, `sig`, …).
- **Static test:** `Invoke-S12Opt` is made at load by `s12-win.ps1` and is allow-listed in the "every command exists" test, with a check that `s12-win.ps1` makes it.
- **N-1 to N-5** (S7-helpers-d.md lines 20 to 25; N-1 is outside the brief's N-2 to N-5 and was fixed by S7-helpers-d's own mutants):
  - **N-2 (binds R19-0, which liveB19 runs):** done. A proof that printed no LOADED line and did not exit 2 is `throw-after-state`; a stale one is still `old-build-left-loaded`. Tests Z1, Z2 and two mutants.
  - **N-3 (binds the SWEEP-HELD re-run):** done in `proofExit(..., rerun)`. A re-run asks only for `args=answered`; stale is still 2. Test in the new file.
  - **N-4 (the swap's catch can print a fs path):** does not bind liveB19, which runs no swap. Left for -DE.
  - **N-5 (binds R19-0):** done. A throw in r17b-0 still releases the held LOADED in the `finally`. Z3 and a mutant.
- **MINOR-A:** done. `Switch-R19Toolbar` reads the title once, accepts only the two exact titles, and a title that is neither is `Stop-R19` (`throw-after-state` when disarming, `not-restored` when arming). The read after the press must be the exact wanted title. Tests T1 to T5 and two mutants.

## 5. Proposed decisions
### 2026-10-28 · KEEP-3's nav legs are driven by the omnibox of a wave window
**Decided:** nav-blocked, nav-own and nav-file are driven by typing the target into a wave-opened window X's omnibox (`Set-S9Omnibox`; `Set-S11bOmnibox` for the file: URL), as an event inside the timeline. The actor finds that window's tab by the `s12x=k3<leg>` query marker and claims it. `since-last-call-ms` is the event time minus the last call's reply.
**Why:** a page script cannot navigate to `chrome-extension:` or `file:`, and the bridge's `navigate` refuses them. The sheet says only "navigated".
**Instead of:** a bridge navigation, which would refuse the event itself.
**Revisit if:** the first live run shows the omnibox does not leave the tab claimable.
**By:** Claude (proposed)

## 6. Findings
Wording in §4.27 (none edited):
- **W1.** KEEP-3's "the tab navigated" has no mechanism. See the proposed decision.
- **W2.** `end-ms` has no spelling for "never ended": `never` is printed (S7-helpers-b W1).
- **W3.** `DEVNOFLAG probe=` has three words, but the probe can answer another code, and `kept-then-devtools` can be `ok`. The driver prints `other` for an unnamed code; `ok` is a word for the probe only.
- **W4.** KEEP-2's "since-last-call-ms=0" on both legs is fixed text; the actor prints 0.
- **W5.** The sheet's UP-6 text treats a `seen` on a refused leg that reached the extension as a finding for the gate's order, but the Banner rule makes it a STOP with IDLE and control. The driver follows the Banner rule for legs that sent a call and `RECORD` for those that sent none.
- **W6.** UP-DEVT's fixture page is `s11-upload.html?s11=xwin&s12x=devt`. If the page reads the whole query string rather than the `s11` key, the extra key breaks the reporter.

First-run risks (no new runtime fact; nothing ran):
- The banner timeline's inline events (toolbar press, options edit, omnibox) pause sampling for a second or more. The first `none` read after the pause can overstate `end-ms` in KEEP-3's disarm and block legs, whose tolerance is 2 000 ms.
- A DevTools window found by `Test-S12DevToolsUi` with `$global:S12Before` assumes no other Chrome window opened since the menu was invoked.
- KEEP-1's trusted click calls `focusTab`, and so needs the screen.
- The `tabs()` row's `url` is `""` for a withheld tab. `findTab` matches by marker before the first call, when the URL is still plain.
- KEEP-3's `block` leg opens its tab on `s12blk.localhost:8081` before the pattern, as CON-3 does.
- Not built, as the brief said: a UIA read for the infobar's Cancel (the cancel leg is `not-measured` and a `RECORD` LEG), and the end-of-slice `DIALOGS` read.

## 7. Handoff
- Nothing running. No PIDs, servers or worktrees.
- Nothing committed; the step agent starts a verifier (Opus, medium) then a committer.
- The `R19DBG=1` env var makes `recipes/test/s12-r19-b.test.ts` print the stubbed PowerShell run's stdout and stderr.
- A trap met while writing: this tool's Bash heredocs unescape `\\`, so edit test files with the Edit tool.
- For -C and -DE:
  - `Invoke-R19Row -Actor/-BudgetS` and `Invoke-R19DevRow` are reusable.
  - So are `t` and `val` steps in `Invoke-R19StepB`.
  - So is `findTab` in `s12-r19-b.ts`.
  - N-4 still binds the old-build slices.
