# S5-drivers-B4b verifier report: liveB20's entry script, order, serve step, STOP path, RESTORE/LOGS, how-to

Model and effort: Opus, medium. Read and run only. No tracked file was edited. Nothing ran against Chrome, the daemon,
a fixture server, a port or the reload script. The only run of the entry script was `-Block plan`, after I read that the
top-level code of every file it dot-sources only loads types and assemblies. Evidence: `S5-drivers-B4b-verifier-evidence.txt`.

## 1. Verdict

**FAIL**, on one MAJOR (F1). The new `serve` step has no time bound. On every slice-B actor row, the actor can stay alive
without asking for a step, and the driver then waits forever. That removes the row's 600 s budget and the 120 s per-step
bound, and a hung slice never reaches its STOP, restore and RETURN. Everything else meets the brief, with three MINOR
findings and three NITs. The fix is small and stays in the lane.

## 2. Gates (re-run by me; evidence file)

- `npm test`: **5930 passed / 248 files**, exit 0. At 489bf47 it was 5899 / 247: +31 tests and +1 file, none removed.
  That is 28 in the new `s13-r20-b-ps.test.ts` plus 3 `it` blocks in `s13-r20-b4.test.ts`.
- `npm run typecheck`: 0. All eight `recipes/tsconfig*.json`: 0. `npm run build`: 0. `node scripts/doc-check.mjs`: 0.
- `-Block plan` prints the builder's order and exits 0. The tree was unchanged afterwards.
- Size: about 427 new or changed lines, under the 600-line cap. There is no user name or profile path in the new files or in
  the builder's evidence.

## 3. Items (1)–(7)

1. **Met.** `s13-r20-b.ps1:60-65` runs Get-R18Defs and the Run 17 loads before `Register-R20Blocks` (`:69`). The
   s13 files are dot-sourced at the top level (`:31-34`). Registration runs R20, then B4, then B (`:69-71`). A missing
   block is refused (`:72-73`). The file mirrors `s13-r20-a.ps1` line for line apart from these additions (diff in my
   session).
2. **Met.** The order is R20-0B; the three -3 rows; `root-add`; CLOSERPROBE; the three CHOOSE rows; G2-1; VERSION;
   RESTORE; LOGS. That is the addendum's order (l.2002: "after R20-0B and before the row-less CLOSERPROBE", 11 ids and
   one probe) set into §4.28's liveB20 line (l.1980, l.1997). The `root-add` placement is ruled in §4 (a).
3. **Met, except F1.**
   - Each step id matches the ids the actors ask for: the six `-dlg` ids (B2 §7), the six G2 ids, and `R20-VERSION-dlg`
     (B3 verifier §7).
   - The guard accepts `S13 chooser fixture`. The playground title was already accepted (`s11-win.ps1:17`).
   - N2 (B3 verifier2 §6) is answered by `serve`, but without a bound (F1).
4. **Met for the reasons tested; one reason is missing (F2).**
   - Every reason goes through `Stop-R19` → `Stop-R19Wave`, which always prints one RETURN.
   - 12 reasons are tested, and `checkStopReturn20` accepts each pair.
5. **Met.**
   - `Invoke-R20BRestore` closes WA and then runs the shared restore. That restore closes O, runs `rd-restore` (which
     removes ROOT), reads back by count and hash, and prints DIALOGS.
   - `Invoke-R20BLogs` copies the -3 evidence in a `finally`. `-Block teardown` copies it too. The copy holds counts and
     fixed words only.
6. **Met.**
   - MINOR-1 (`s13-r20-b4.ts:77`): I proved red on HEAD's code with a scratch probe that has no junction. Two
     expectations are RED on HEAD and green on the new code.
   - MINOR-2: its tests pass on HEAD, as intended, and kill both of the B4a verifier's mutants (5 and 4 RED).
   - MINOR-3: `Reset-R20Pop3Evidence` runs at `r20-0b` (`b-defs.ps1:80`). No test pins that call site (F3).
   - NIT-1: the files are dot-sourced at the top level.
7. **Met in shape** (it follows `S5-drivers-A2.md` §8 section for section), with gaps in F4.

## 4. The attacks

**(a) `root-add` after the three -3 rows: consistent; no condition changes.**
- The slice header "ROOT added" (l.1980, l.1997) is not a condition for every row. R20-0B, the first row, is explicitly
  "before ROOT is added" (l.1981).
- The -3 rows' own state column reads "JS on, armed; clients A (SDK), B (SDK)", with no ROOT (l.2006-2007).
- The addendum and #407 say each -3 row "copies its original cell for cell". The originals ran in liveA20, whose order
  has no `root-add` (`s13-r20.ps1:13`). So running the -3 rows before ROOT keeps their Upload-folders state identical to
  the originals'. Adding ROOT before them would be the departure.
- Every row that needs ROOT comes after the step: the three CHOOSE rows and VERSION (l.1982-1986).
- Run 19 put `root-add` at different points per slice (`s12-r19-lib.ps1:10-11`), so there is no fixed precedent
  against it.
- Ruling: no pre-registered condition is altered. Decision (1) is right.

**(b) Shared runner and liveA20: unchanged.** I compared `s13-r20.ps1` with HEAD line by line:
- `:14` changes only the liveB20 order.
- `:68` and `:91`: `Invoke-R20Zero` takes the row id with a default of `R20-0`. liveA20's block `:151` passes none, so its
  ROW line is identical. The `zero0b` test also prints the default form.
- `:183`: the `serve` branch is new. The `val` branch is byte-identical, and no liveA20 step has `k = 'serve'`.
- The edit at `s13-r20-ps.test.ts:180` replaces a substring check with a longer one, so it is stricter, not weaker. It is
  a documented move (builder §2).
- All `s13-r20-ps` tests pass.

**(c) Unasked steps, actor exit, STOP.**
- An unasked step can no longer hang a list. A step that is asked but not in the handlers is never answered. The actor's
  own 180 s `pressed` wait then throws, and the actor exits.
- When the actor exits, `serve` returns and `Invoke-R17Node` reads the exit code. A STOPWHY line reaches
  `Stop-R19Actor` with its reason.
- A handler that throws becomes the driver's tag: the actor is killed and the STOP is `throw-after-state`.
- **But** an actor that stays alive and asks nothing is never bounded (F1).

**(d) G2-1.**
- WB is found by `s12=g2b` among W and the wave's own windows only. It runs before WA opens, so WA's `s12=g2a` URL
  cannot match. The URL is compared and never printed.
- When `wb-unknown` comes back, the actor ignores the open answer and asks for `rects-covered`. `Format-S13Rects` then
  throws "window B is not a visible top-level window" (`s13-win.ps1:89`). That gives a loud `throw-after-state` after the
  restore, never a guess.
- Searching only the wave's windows also keeps the human gate: a human window's URL is never read. If B's tab landed in a
  human window, the slice stops instead of reading it. That is stricter than B3 verifier §7's "refused, NOT MEASURED",
  and right under the Human gates.
- The F1 raise is owned-checked (`s13-win.ps1:117`, `:127-128`).
- O is closed before the row (`b-defs.ps1:88`). The restore reopens it through `Use-S16Options`.
- The rects answers go only to `.pressed` files in `S11_OUT`. The record gets only the actor's `RECT` and CHECK lines.

**(e) VERSION.**
- `Invoke-R19Swapped $R19Commit['liveE19']` resolves to `63c771c` (`s12-r19-lib.ps1:15`).
- Its `finally` always runs restore-head, then the reload, then `Invoke-R19Rerun`, which is overridden to
  `Invoke-R20Rerun` and prints `LOADED20 rerun=<k>`. Any failure there is `old-build-left-loaded`, including after a STOP
  inside the row.
- The NOT RUN cases are: reload exit 2 twice (Run 19's frame); the old proof reads neither `keys=sorted` nor `perm=no`
  (as R20-ARGS-OLD does); and no ROOT, checked before the swap.
- NOT RUN without ROOT is not flattering, because NOT RUN never counts as a pass. It is also unreachable: `root-add`
  always runs first, and a failing `root-add` throws (NIT-1).

**(f) The proposed decisions.**
- (1) Agree.
- (2) Agree only with a bound (F1).
- (3) Agree, including STOP over NOT MEASURED when WB is not among the wave's windows.
- (4) Agree, with NIT-1.
- (5) Agree.
- (6) Carried.

**(g) The how-to.** A runner can start, read and resume, with the gaps in F4.

## 5. Findings

### F1 MAJOR: the `serve` step has no time bound, so a protective timeout is lost
- **Where:** `recipes/s13-r20-b-defs.ps1:17-25` (`Invoke-R20Serve`), reached from `s13-r20.ps1:183`.
- **What happens:**
  - The loop returns only when `Test-R20NodeAlive` is false.
  - `Invoke-R17Node` runs the driver to its end **before** `$p.WaitForExit($BudgetS * 1000)` (`recipes/s11b-r17.ps1:125-128`).
  - So for every slice-B actor row (CHOOSE ×3, G2-1, VERSION) the `-BudgetS 600` that `Invoke-R20Ch` passes is dead.
  - So is the 120 s per-step bound that the `val` list had (`Wait-S11Ready`, `s11-win.ps1:68-70`).
- **When it bites:** an actor that neither asks for a step nor exits hangs the slice with no end. Examples: a lingering
  handle or MCP child keeping node's event loop alive (`main` sets `process.exitCode` and never exits), or a call with no
  timeout. ROOT is added by then, and STOP / restore / RETURN (R5.6) are never reached.
- **The same weakness in another form:** a reused PID keeps `Get-Process -Id` true. Run 17 checks the start time
  (`S16Born`); this function does not.
- **Evidence:** `hang.ps1` in the scratchpad gives `Invoke-R20Serve` a live process that asks nothing. It never returned
  and was killed by a 20 s timeout (exit 124, no `SERVE-RETURNED` line).
- **Why MAJOR:** agent-rules §2, "never weaken a protective check … a timeout".
- **Suggested fix:**
  - Give the serve step the row's budget (`@{ k = 'serve'; h = …; s = $BudgetS }`) and an idle bound equal to
    `Wait-S11Ready`'s 120 s since the start or the last answer. On either bound, throw
    `no ready signal for <row> within the bound`. The existing path then kills the actor and STOPs `throw-after-state`
    after the restore.
  - Treat the actor as gone when the PID's start time differs from `$global:S16Born['node']`.
  - Add a PS test with a live, silent process that ends with the bound's throw (use a short bound passed in).
  - Say in the how-to what a hung slice means.

### F2 MINOR: the pre-registered STOP `outside-file-reached-page` is missing from slice B's list and from the how-to
- §4.28 l.2000 lists `outside-file-reached-page` for R20-CHOOSE-* and R20-VERSION.
- It is in `STOP_REASONS_20` (`s13-r20.ts:16`). It is not in `SLICE_B_STOPS` (`recipes/test/s13-r20-b-ps.test.ts:14`),
  which claims to list "every STOP reason slice B can reach". It is not in the how-to's STOP list (builder §8).
- No slice-B actor emits it (grep `StopWhy("` in `s13-r20-b.ts`: only `chooser-interception-left-on`,
  `dialog-left-open`, `throw-after-state`, `existing-tool-changed`).
- **Fix:**
  - Add it to the test list. The generic path already pairs it with a RETURN.
  - Add a how-to line for it: escalate, and do not commit the record until it is understood.
  - State as a proposed decision why no slice-B reader raises it (every path the rows send is under ROOT, after
    `root-add`), or name the reader that would.

### F3 MINOR: three wirings have no test (mutants survive)
Scratch copy, `S13_R20_REPO`; evidence file.
- `reset-not-called-in-0b`: `r20-0b` stops calling `Reset-R20Pop3Evidence`, and 28/28 still pass. This is B4a MINOR-3's
  call site. The test covers only the function.
- `teardown-no-copy`: `s13-r20-b.ps1:74` is removed, and 28/28 pass.
- `root-flag-first`: `$global:R20BRoot` is set before the Run 17 block runs, and 28/28 pass. This one is harmless at
  runtime, because a throwing `root-add` STOPs the wave anyway.
- **Fix:** in the `blocks` test, assert that `r20-0b` rotates an existing evidence file. Add a text assertion for the
  teardown copy. Assert the flag stays `False` when the wrapped block throws.

### F4 MINOR: the how-to leaves three things to guess (item 7, attack g)
- **Teardown:** `-Block teardown -Att <k>` must run with **the attempt's own `S11_OUT`**. The globals file, the capture
  and `r20-pop3-evidence.txt` are read from it. With a fresh `S11_OUT`, the copy silently copies nothing. The how-to says
  "fresh `S11_OUT`" only for a new attempt.
- **VERSION's NOT RUN outcomes** are not described: old build not loadable, either reason. The "recorded and the wave
  goes on" line names NOT MEASURED, NOT DISCRIMINATING and RECORD, but not NOT RUN.
- **A slice that never exits:** nothing tells the runner what it means or what to do. It is tied to F1.
- **Fix:** one line for each.

### NIT-1: "R20-VERSION NOT RUN — ROOT is not in the Upload folders" is a NOT RUN reason the sheet's up-front list lacks
- The sheet's list (l.1999) names only "old build cannot be loaded".
- This case is unreachable in liveB20 and cannot flatter a result.
- **Fix:** name it in decision (4) as a defensive guard, or drop it.

### NIT-2: R20-0's guard texts in slice B
In slice B, the guard texts of `Invoke-R20Zero` (`Fail-S16 'R20-0 …'`) and the proof's `CHECK R20-0 …` lines read
`R20-0`. This is cosmetic, and the builder already notes it in §7.

### NIT-3: SLICE_B_STOPS tests only the pairing
The per-reason STOP tests drive `Stop-R19` directly. They prove the generic STOP → RETURN pairing for each reason name,
not that each reason comes from its row. Each row's own reason is tested in B2, B3 and B4a. Worth one sentence in the
test title.

## 6. Liveness, counts, boundary

- liveA20's behaviour and printed lines are unchanged (§4 (b)).
- No pass rule or expected text is changed. MINOR-1 aligns leg `human`'s word with the sheet's "else NOT MEASURED"
  (l.2002), and the row verdict was already NOT MEASURED.
- There is no security-boundary or invariant effect. No log site was added to product code.

## 7. Handoff

- **Nothing is running.**
  - My scratch probes are in the session scratchpad, outside the repo: `red/` (TS red probe), `mut/` (PS mutants) and
    `hang/` (the serve-bound probe).
  - No junction was made, and no orphan process was left (checked).
  - `dist/` was rebuilt by `npm run build` (gitignored).
- **For the fixer:**
  - F1, with its test.
  - F2–F4.
  - Optionally the NITs.
- **No commit made.**
