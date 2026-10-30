# S5-drivers-C3 builder: liveC20's entry script and blocks

Model and effort: Sonnet 5.5, medium. Nothing was run against Chrome, a daemon or a port (only `-Block plan`, and PowerShell with every helper stubbed).

## 1. Verdict
DONE. Size: about 590 new lines of PowerShell and tests plus about 90 changed lines in existing files; the extra over the 600 cap is tests (accepted range, 1.5x).

## 2. Outputs
- New: `recipes/s13-r20-c.ps1` (entry, 71 lines), `recipes/s13-r20-c-defs.ps1` (blocks, 195), `recipes/test/s13-r20-c-ps.test.ts` (326, 31 tests).
- Changed: `recipes/s13-r20-c.ts` (H1/H2/H3 below), `recipes/test/s13-r20-c.test.ts` (+3 tests, 2 expectations extended), `recipes/test/s13-devt-ps.test.ts` (N2, +1 test), `recipes/s13-r20.ts` (one additive hook), `recipes/tsconfig.s13.json` (include) and `recipes/tsconfig.s6.json` (exclude) for the new ps test.
- Commands: `-Block plan` exit 0, prints `PLAN liveC20: preflight servers files window reload console r20-0c flag r20-devt-undock r20-devt-early r20-up-devt r20-keep-4 r20-sweep-held r20-restore r20-logs`. Both PS files parse with 0 errors.
- `npm test`: 251 files, **6012 passed** (start 250 / 5977). `npm run typecheck` 0; all eight `recipes/tsconfig*.json` 0; `npm run build` 0; `node scripts/doc-check.mjs` 0. `git status --short`: only the files above.
- Red proof: the TS tests import `condFor`, `pickRefusing`, `LEG_ORDER`, `lineCmd20`, which do not exist before the change. The PowerShell tests were checked by mutants on copies outside the tree (the `S13_R20_REPO` / `S13_DEVT_REPO` override, no `node_modules` junction): N2's mutant (Escape into any window) fails only the new N2 test; removing the dock `Set` from R20-RESTORE, reloading after a phase 1 that measured nothing, a plain KEEP-4 preset, running the conditional rows without the gate, and counting only the wave's own DevTools windows in DIALOGS each fail exactly one test.

## 3. How it is built
- Entry script as slice B: `-Block liveC20|plan|teardown [-Att <n>]`, exit 0/2/3, Run 17 defs read by the parser before `Register-R20Blocks`' tree-kill override, then `Register-R20CBlocks`; an unregistered name in the order is a STOP. The 8081-only preflight is the shared one in `Register-R20Blocks` (a chosen port other than 8081 is a `Fail-S16`); a fresh `S11_OUT` per attempt is the shared `Assert-R19CaptureFree`; the record is `S13-live-record-liveC20[-att<k>].txt` (`Get-R19RecordName`).
- Blocks: `r20-0c` (`Invoke-R20Zero ... 'R20-0C'`, then DevTools opened in X on the fixture page, `Read-S13DockSide`, closed in the guard; `dock` line through the node hook; `gate-dock`), `flag`, `r20-devt-undock`, `r20-devt-early`, `r20-up-devt`, `r20-keep-4`, `r20-sweep-held`, `r20-restore`, `r20-logs` (the shared `Invoke-R20Logs`). Every actor row is one `serve` step (600 s per row; the 120 s idle bound is `Invoke-R20Serve`'s default), through `Invoke-R20CGuarded`: X in front, the row, DevTools closed after it whatever happened. A row failure keeps its own STOP reason; otherwise a pane or window left (or a close that throws) is the STOP `devtools-left-open`.
- `gate-dock` runs once, at the end of `r20-0c`: the five NOT RUN rows print right after `DOCK R20-0C`, and every later DEVT and conditional block checks the remembered `run`/`notrun`. `gate-cond` runs once at the first conditional block with `--findings` (the refusing labels from `CHECK ... finding=devtools-refuses leg=<label>`) and `--legs` (the DEVT legs' verdict words; omitted when there are none, an empty argument would be dropped); exit 3 runs none of the three rows. When a leg refuses, the actor names it (`CHECK gate-cond under=<label> leg=<state> cond=<c> not-rerun=<others>`) and the PS side only copies `--leg/--cond`.
- ROOT: `root-add` (Run 17's, reused) runs inside the UP-DEVT block only; `rd-restore` removes it at R20-RESTORE.

### Carried verifier notes (each item)
- **C1 verifier2 N1:** `Write-R20CDialogs` takes `devtools=<n>` from `Get-R20CDevtCount`, its own read of every Chrome window title `^DevTools` except the capture window (`Get-S13Titles` leaves `$global:D` out), a human's DevTools included; never `Close-S13DevTools`'s `remaining`. The test puts a not-owned DevTools window in the list and a mutant that counts only own windows fails. The slice letter is printed as the sheet writes it: `DIALOGS C native=0 devtools=0 wave-windows-open=0`.
- **C1 verifier2 N2:** two tests in `s13-devt-ps.test.ts`: a failed press in X (menu in X) ends with one Escape into X; a failed press with the menu in the wave's own DevTools window sends no key at all. The "Escape into any window" mutant fails the second.
- **C1 verifier1 F4:** `Restore-R20CDock`: Open, Set to R20-0C's side, Close, Open plain, `Read-S13DockSide` (this is `DOCK R20-RESTORE`), Close. The node hook `dock --row R20-RESTORE --side <read> --found <found>` applies `dockRestoreVerdict`; a different or unread side prints `CHECK R20-RESTORE found-side=<found> read-back=<read>` and `STOPWHY not-restored`, and the block throws the STOP `not-restored`. The dock restore runs before the safety restore (a STOP's own restore still runs).
- **C2 verifier1 F6, verifier3 H3:** `Invoke-R20CSweep`: phase 1 through its own node call, its LEG lines stored in `$global:R20Carry` (the A2 mechanism), the capture saved before and reopened after the reload (`Save-R19Seg 'reload'`, the registered `reload` block, `Open-R19Seg`), `Invoke-R19Rerun` prints `LOADED20 rerun=<k>` (a stale build is the STOP `old-build-left-loaded`), then phase 2 completes the one ROW. Phase 1 exit other than 0: no reload, no phase 2, the tab closed (see the `--phase close` change below), one ROW from phase 1's verdict with the NOT MEASURED reason on its LEG line. The carry is dropped after the row.
- **C2 verifier3 H1:** a source-order test: UP-DEVT and SWEEP-HELD phase 1 call `earlierAttach` before the first `ctl0`, and `earlierAttach` evaluates `1 + 1`, waits `idle(row)` and judges with `earlierVerdict` (kills mutants e1, e2, e6; it is a text test of untestable async glue, as verifier3 allowed).
- **C2 verifier3 H2:** pure `condFor(label)` (undock to undocked/earlier, undocked to undocked/none, docked to docked/none, any other label a `HelperDefect`), `LEG_ORDER`, `pickRefusing(labels)` (first in sheet order whatever the arrival order, the others named); `gate-cond` uses them and prints the pick as a second CHECK line after the existing `run=yes refusing-legs=<n>` line. Two existing expectations of the gate-cond output were extended by that line.
- **C2 fixer1:** KEEP-4 sets the dock side in an earlier DevTools session (`-Pre`: open with the side, close), its own open is plain (no dock read or change inside the 5 s bound) and has no `ctl0`; SWEEP-HELD reopens the capture before phase 2.

## 4. Deviations
- `recipes/s13-r20-c.ts` got one change beyond H1/H2: `sweep-held --phase close` (finds the kept marker tab and closes it, prints `CHECK R20-SWEEP-HELD tab-closed=<yes|no>`, exit 0, no ROW). H3 needed a way to close the tab, and no shared helper can; nothing else in the actor changed.
- Size: see §1.
- Shared runner hook, one, additive: `recipes/s13-r20.ts` gains the exported `lineCmd20` and two branches in `main` (`flag --value`, `dock --row R20-0C|R20-RESTORE --side [--found]`), printing `flagLine` / `dockLine` and judging R20-RESTORE by `dockRestoreVerdict`. No slice A/B code or test changed (`s13-r20.ps1` is untouched).

## 5. Proposed decisions
### 2026-10-30 · liveC20: FLAG and DOCK sit after R20-0C's ROW, gate-dock right after DOCK
**Decided:** the ROW line of R20-0C is the last line of `Invoke-R20Zero`, then `DOCK R20-0C side=<s>`, then (when unread) the five NOT RUN rows, then the `flag` block's one `FLAG debugging-flag=<w>`. **Why:** the order table has `flag` after `r20-0c`; an unreadable side is no failure of the proof, so it must not change R20-0C's ROW. **Instead of:** a hook inside `Invoke-R20Zero` to print DOCK before the ROW. **Revisit if:** the user wants DOCK inside the ROW's verdict. **By:** Claude (proposed)
### 2026-10-30 · A found side of unread makes R20-RESTORE a STOP
**Decided:** with R20-0C's side unread (or R20-0C never run), R20-RESTORE skips the dock change, still reads the side back, and the verdict is `STOP not-restored` (`dockRestoreVerdict`: an unread side never passes). **Why:** the sheet and the form say so; strict. **Instead of:** skipping the dock check when nothing was changed. **Revisit if:** the user prefers a NOT RUN there (the STOP ends the slice before R20-LOGS). **By:** Claude (proposed)
### 2026-10-30 · A docked leg uses the found docked side, else bottom
**Decided:** `Get-R20CSide docked` returns R20-0C's side when it is bottom, right or left, else `bottom`. **Why:** the fewest dock changes; the sheet says only "docked". **Revisit if:** a side-specific refusal shows. **By:** Claude (proposed)
### 2026-10-30 · The three conditional rows run through one gate-cond call, asked at the first of them
**Decided:** see §3. A refusing label outside the three (a helper defect) is a STOP. **By:** Claude (proposed)

## 6. Findings
- Measured (PowerShell 5.1, a unit test): a scriptblock made by `.GetNewClosure()` runs in a module scope that cannot see functions defined inside the caller's script block; stubs used from a closure must be `function global:`. Production code is unaffected (everything is global there).
- Possible mismatch in slices A and B (not touched): `Write-R19Dialogs` passes the full slice name (`--slice liveA20`), so their line reads `DIALOGS liveA20 ...` where the sheet writes `DIALOGS A ...`. Slice C prints the letter. Worth one look by the session agent.
- A STOP in a row after a dock change leaves the persistent dock preference changed (the wave's STOP restore covers the safety state only). `DOCK R20-0C side=<s>` is in the record so the user can set it by hand; R20-RESTORE does not run after a STOP.
- The `gate-dock` NOT RUN rows and R20-0C's DOCK read were not run live; `Read-S13DockSide` on the real Customize menu is the open question of C1.

## 7. Handoff
Nothing is running. Files to commit: the nine paths in §2, this report. Before the live run, the session agent adds the `recipes/CLAUDE.md` Key-files line below and the decisions above, and commits everything (clean-tree guard).

Proposed Key-files line for `recipes/CLAUDE.md` (after the `s13-r20-b4` entry): "`s13-devt.ps1` (DevTools window and dock-side helpers, the bridge-independent control, FLAG; Step 13 S5-drivers-C1), `s13-r20-c.{ts,ps1}` (liveC20's actor and entry script) and `s13-r20-c-defs.ps1` (its blocks; the R20-0C dock read, gate-dock and gate-cond, the conditional rows, SWEEP-HELD's two phases, R20-RESTORE's dock order; `s13-r20.ts` also prints the `flag` and `dock` lines)".

## 8. How to run liveC20

**Ready to run** once this stage's commit and the session agent's bookkeeping are committed.

- **Command.** From the repo root, from **Git Bash**, **in the background** (a slice outlasts the 600 s tool cap):
  `S11_OUT=<fresh dir outside the repo> powershell.exe -NoProfile -ExecutionPolicy Bypass -File recipes/s13-r20-c.ps1 -Block liveC20`
  - A later attempt: `-Att <k>` with a fresh `S11_OUT`. `-Block plan` prints the order and runs nothing.
  - `-Block teardown -Att <k>` cleans up after the slice or a return; run it with the attempt's own `S11_OUT`.
  - Exit codes: 0 done, 2 STOP, 3 not run.
- **Prerequisites:**
  - A clean tree at a committed HEAD, then `npm run build`, then `recipes/reload-extension.ps1` (one re-run on exit 2).
  - Chrome running with the extension loaded and its toolbar button pinned; JavaScript on and armed, as found; ideally started with `--enable-unsafe-extension-debugging` (the `FLAG` line records it; without it the Stage 0 controls may not hold, which the rows' own control reads settle).
  - Port 9234 free or held by the daemon; **port 8081 free** (the preflight refuses any other port).
  - Window X is the wave's window W, in front, showing the Run 17 fixture page; nobody else uses the machine's keyboard and mouse. No DevTools window of the user's own on a `127.0.0.1`/`localhost` page (a human's DevTools window counts into `DIALOGS` and would be a STOP). Network is not needed (no old build).
- **Expected first record lines (R20-0C):** `MANIFEST ...`, exactly `LOADED20 keys=page nested=page elem=page perm=yes listener=yes enabled=yes args=answered`, R20-0's remaining lines, `HEAD <sha> tree=clean`, the S4 line, `ROW R20-0C PASS slice=C`, then `DOCK R20-0C side=<bottom|right|left|undock|unread>`, `CHECK gate-dock side-readable=yes` (or the five `ROW ... NOT RUN — dock side unreadable, it could not be restored` lines), then `FLAG debugging-flag=<yes|no|unread>`.
- **Where the record lands:** `docs/plans/2026-10-29-step13-phase-f-followups-steps/S13-live-record-liveC20.txt` (`-att<k>` for a later attempt). In `S11_OUT`: the console segments `console-liveC20-<k>.txt` (one more after SWEEP-HELD's reload), `actors-liveC20.jsonl`, the scan inputs.
- **What each STOP return means** (every `STOP <reason>` is followed by `RETURN <seq> after-stop=<reason> restored=... readback=...`):
  - `build-not-loaded`, `extension-disabled`, `reload-failed` (R20-0C, before any state change): rebuild and reload, new attempt.
  - `devtools-left-open` (a DevTools window or pane still open after a row or at R20-RESTORE, or a close that could not be read): close it only with the user.
  - `dialog-left-open`: a native dialog on a wave window; close it only with the user.
  - `old-build-left-loaded` (SWEEP-HELD: the build proof after the reload failed): check which build is loaded before anything else.
  - `not-restored`: the safety read-back differs, or the dock side read back differs from `DOCK R20-0C` (the record's `CHECK R20-RESTORE found-side=<s> read-back=<s>` names the found side: set it by hand in a tab's DevTools, then Customize and control, Dock side). Never retry past it. If `restored=no`, run neither teardown nor a re-run.
  - `text-leak` (R20-LOGS): escalate; do not commit the record.
  - `throw-after-state`: a helper or environment throw after the first state change, including a hung actor (`no ready signal for serve within the bound (120 s)` or `serve exceeded its budget of 600 s`) and a refused gate; the restore ran first. Read the actor's capture in `S11_OUT`, fix a helper only between rows, teardown, new attempt.
  - After any STOP in a DEVT row the dock preference may stay changed: take it from the `DOCK R20-0C` line.
- **NOT RUN outcomes** (printed by the actor from the sheet's own words): the five rows `R20-DEVT-UNDOCK`, `R20-DEVT-EARLY`, `R20-UP-DEVT`, `R20-KEEP-4`, `R20-SWEEP-HELD` when the side is unread; the three conditional rows plus the finding line (or its counts) when no DEVT leg refused. Both are recorded, never a pass; the wave goes on to R20-RESTORE (which then reads the dock side back and, for an unread found side, stops: proposed decision 2). A leg that ends NOT MEASURED, NOT DISCRIMINATING or RECORD is recorded.
- **Resume after a return:** run `-Block teardown -Att <k>` with that attempt's own `S11_OUT`; fix a helper only between rows, never past a STOP line; a new attempt takes `-Att <k+1>` and a fresh `S11_OUT` (at most three per slice). **Exception:** after a RETURN that reads `restored=no`, run neither teardown nor a re-run; return to the user.
