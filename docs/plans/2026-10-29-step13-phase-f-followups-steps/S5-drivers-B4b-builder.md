# S5-drivers-B4b builder report: liveB20's entry script, order, rows' PowerShell side, STOP path, RESTORE/LOGS

Model and effort: Sonnet, medium. Nothing was run against Chrome, a daemon, a fixture server or a port. The only invocation of the entry script was `-Block plan` (it stops before any state is read or set; it touched no Chrome and no port). Nothing is committed.

## 1. Verdict

DONE. liveB20 is runnable end to end from the how-to in section 8. About 425 new lines of code and tests (cap 600).

## 2. Outputs

- New: `recipes/s13-r20-b.ps1` (75 lines, the entry script), `recipes/s13-r20-b-defs.ps1` (97, slice B's definitions and `Register-R20BBlocks`), `recipes/test/s13-r20-b-ps.test.ts` (231, 28 tests).
- Edited (`git diff --numstat`): `recipes/s13-r20.ps1` +4/-4 (the liveB20 order; `Invoke-R20Zero` takes a row id, default `R20-0`; the step runner knows the `serve` step kind), `recipes/s13-r20-b4.ts` +1/-1, `recipes/test/s13-r20-b4.test.ts` +16, `recipes/test/s13-r20-ps.test.ts` +1/-1 (the liveB20 order assertion, a documented move: the order is now the addendum's), both tsconfigs +1/-1 (the new test).
- Evidence: `S5-drivers-B4b-builder-test.txt` (npm test), `-gates.txt` (typecheck, eight tsconfigs, build, doc-check), `-mutants.txt`.
- Gates (all exit 0): `npm test` **5899 passed / 247 files -> 5930 passed / 248 files** (+31, none removed); `npm run typecheck` 0; all eight `recipes/tsconfig*.json` 0; `npm run build` 0; `node scripts/doc-check.mjs` 0.
- `-Block plan` prints: `PLAN liveB20: preflight servers files window reload console r20-0b r20-pop-bg-3 r20-pop-fg-3 r20-pop-other-3 root-add closerprobe r20-choose-twice r20-choose-kept r20-choose-refuse-dis r20-g2-1 r20-version r20-restore r20-logs` (exit 0).
- Red proofs (scratch copy of `recipes/` outside the repo, mutants on the PowerShell files, tests run from the main tree with `S13_R20_REPO` pointing at the copy): 12 of 12 mutants killed (`-mutants.txt`). The TypeScript notes' red is by construction: the permission classifier refused the `node_modules` junction a TypeScript scratch copy needs, so I did not retry or work around it (agent-rules 3 item 10). The scratch copy `red/` (no junction) stays in the session scratchpad.

## 3. What was built, one line per handoff item

1. Entry script `recipes/s13-r20-b.ps1`, `-Block liveB20 | plan | teardown [-Att <n>]`. Loads Run 17's functions (`:57-58`) before `Register-R20Blocks` (`:60-61`, `:69`), dot-sources `s13-win.ps1`, `s13-r20-b4.ps1`, `s13-r20-b-defs.ps1` at its top level (`:32-34`, closes B4a NIT-1), registers in the order `Register-R20Blocks`, `Register-R20B4Blocks`, `Register-R20BBlocks` (`:69-71`; the last replaces restore and logs). It refuses to start when a name of the order has no block (`:72-73`: an unregistered name would print NOT RUN and go on).
2. Order: `recipes/s13-r20.ps1:14` is the addendum's: R20-0B; the three -3 rows; **`root-add`**; CLOSERPROBE; the three CHOOSE rows; G2-1; VERSION; RESTORE; LOGS. `Get-R19Order 'liveB20'` and the `r20-0b` name existed; the -3 rows and `root-add` were added. R20-0B runs `Invoke-R20Zero $R17bZero 'R20-0B'` (`s13-r20.ps1:68`, `b-defs.ps1:80`): ROW `R20-0B ... slice=B` (tested).
3. Blocks (`s13-r20-b-defs.ps1`): chooser rows `Register-R20BBlocks :78-` with `Invoke-R20Ch` (`:28`, `-Actor 's13-r20-b'`, W in front, closer and WA close in a finally); six `-dlg` steps (`New-R20Dlg :26`, ids as B2 section 7); window guard `Format-S9Title :10` accepts `S13 chooser fixture` (tied to the fixture's `<title>` by a test); G2-1: `Invoke-R20G2Open :44`, `New-R20G2Handlers :52` (open, place, four rects steps), `$global:S13Hwnd` {A,B,X} and `$global:S13Owned` as `[long[]]` (a test caught the type being lost through a function return; fixed with a cast), WB found by `Find-R20WinB :37` (the owned window whose document URL holds `s12=g2b`, read and compared, never printed), the options window closed before the row (`:88`), `Invoke-S13Place` raises WB and WA itself (B3 fixer); VERSION: `r20-version` swaps to `$R19Commit['liveE19']` = `63c771c` through Run 19's `Invoke-R19Swapped` with row id (so `LOADED20 rerun=<k>`, `old-build-left-loaded`, and `NOT RUN -- old build not loadable` come from Run 19's frame), `Test-R20OldLoaded :58` reads the old build's own proof first, `NOT RUN` without ROOT; the actor's `version` runs only with the old build read and ROOT added (`$global:R20BRoot`, set by a wrapper over `root-add`).
   - **N2 contract (B3 verifier2):** the value-step runner answers steps in list order and would hang 120 s on a step the actor never asks. Slice B's rows therefore use one `serve` step (`Invoke-R20Serve :17`, `Invoke-R19StepB` branch at `s13-r20.ps1:183`): it answers whichever ids the actor asks, in any order, and ends when the actor's process is gone. Tested (a, c asked; b never; no hang).
4. STOP/RETURN: every slice-B reason (`popup-lease-wrong`, `chooser-interception-left-on`, `dialog-left-open`, `throw-after-state`, `existing-tool-changed`, `old-build-left-loaded`, `not-restored`, `text-leak`, `devtools-left-open`, plus `build-not-loaded`, `extension-disabled`, `reload-failed`) is in `STOP_REASONS_20` (`s13-r20.ts:16`; test asserts it), and each is run through `Invoke-R19Slice` in the test: `STOP <r>` then exactly one `RETURN 1 after-stop=<r> ...`, accepted by `checkStopReturn20` (12 tests).
5. RESTORE: `Invoke-R20BRestore :75` closes WA, clears the handles, then the shared `Invoke-R20Restore`. LOGS: `Invoke-R20BLogs :76` runs the shared `Invoke-R20Logs` and copies `r20-pop3-evidence.txt` (counts only) to `docs/plans/2026-10-29-step13-phase-f-followups-steps/S13-live-evidence-liveB20-pop3[-att<k>].txt` in a finally (also after a text-leak STOP); `-Block teardown -Att <n>` copies it too (`s13-r20-b.ps1:74`), for a slice that stopped before LOGS.
6. B4a notes: MINOR-1 `s13-r20-b4.ts:77` (`fin(o.human ? "NOT MEASURED" : "NOT DISCRIMINATING")`; tests in `s13-r20-b4.test.ts`, human leg with a guard-skip and a pre-click round); MINOR-2 three tests (two counted rounds with a failing clause, a clause miss, a join count: FAIL; a grant to C in an uncounted `fg` round of leg `bg`: STOP; a pre-click grant to B: STOP); MINOR-3 `Reset-R20Pop3Evidence :73` (rotates an existing file to `.prev-<time>` at `r20-0b`'s start, before R20-0B's proof); NIT-1 as item 1.
7. Section 8.

## 4. Verifier verdict

None yet (the step agent's next child).

## 5. Deviations

None from the brief. Outside the stated lane list but inside `recipes/s13-*`: `recipes/s13-r20.ps1` (order, row id, serve branch) and `recipes/test/s13-r20-ps.test.ts` (one assertion), both needed.

## 6. Proposed decisions

### 2026-10-30 · S5-drivers-B4b: the unstated cases of liveB20's PowerShell side
**Decided:** (1) `root-add` runs after R20-POP-OTHER-3 and before CLOSERPROBE: the sheet puts ROOT in the slice's preconditions but R20-0B says "before ROOT is added" and the POP rows need none. (2) Slice-B rows answer value steps through one `serve` step, not an id-by-id list, so a step the actor skips cannot hang the driver. (3) WB is found by reading the document URL of the wave's own windows for `s12=g2b` before WA opens; X is the foreground window when the wave owns it, else WA. When WB is not found the open step answers `wb-unknown` and the first rects step fails loudly (a STOP `throw-after-state`), never a guess; a refused placement stays the actor's NOT MEASURED. (4) R20-VERSION is `NOT RUN` when ROOT was not added, and `NOT RUN -- old build not loadable` when the old build's own proof reads neither `keys=sorted` nor `perm=no` (as R20-ARGS-OLD). (5) The -3 rows' evidence is rotated at slice start, not cleared, so an earlier attempt's counts survive. (6) The N4 sentence of B3 verifier 1 (why an `args` answer other than 7 is a FAIL leg and not `existing-tool-changed`) is not answered here. **Why:** each is the strict reading of an unstated case. **Instead of:** guessing WB; letting an unasked step block 120 s. **Revisit if:** liveB20 shows the document URL unreadable by UIA (then WB is `wb-unknown`). **By:** Claude (proposed)

## 7. Findings and handoff

- Measured (PowerShell 5.1): a function that returns a `[long[]]` hands the caller `Object[]` (the output is unrolled), so `$global:S13Owned` needs the cast at the assignment. A `,@(...)` return needs `@(f)[0]` in the caller; a plain return with `@(f)` is simpler and is what the entry script uses.
- Carried, not changed (B3 verifier 1): **N3** (coverage is clipped to WA's display work area; WB or X on another display records a wrong covered-by-others-px, only in the covered leg) and **N4** (VERSION's `clicks` are judged but not printed; decision (4)'s sentence on `args`). Pass rules are unchanged.
- Cosmetic: the proof's CHECK lines still read `CHECK R20-0 ...` in slice B (the ROW is `R20-0B`).
- The committed -3 evidence copy is named `S13-live-evidence-liveB20-pop3[-att<k>].txt`; the committer stages it with the record.
- Nothing is running; no PID, log or watcher. The scratch copy `red/` and `mut.cjs`, `mut-out.txt` are in the session scratchpad. Nothing needs the user's keyboard now; liveB20 itself needs the human gates of the phase doc.

## 8. How to run liveB20

**Ready to run** once this stage's commit and the session agent's bookkeeping are committed.

- **Command.** From the repo root, from **Git Bash** (python is on Git Bash's PATH), **in the background** (a slice outlasts the 600 s tool cap):
  `S11_OUT=<fresh dir outside the repo> powershell.exe -NoProfile -ExecutionPolicy Bypass -File recipes/s13-r20-b.ps1 -Block liveB20`
  - A later attempt: `-Att <k>` with a fresh `S11_OUT`.
  - `-Block plan` prints the order and runs nothing.
  - `-Block teardown [-Att <k>]` cleans up after the slice or a return (see the exception under Resume); it also copies the -3 evidence file into the steps dir.
  - Exit codes: 0 done, 2 STOP, 3 not run.
- **Prerequisites:**
  - A clean tree at a committed HEAD (every bookkeeping edit committed), then `npm run build`, then `recipes/reload-extension.ps1` (one re-run on exit 2).
  - Chrome running with the extension loaded and its toolbar button pinned; JavaScript on and armed, as found.
  - Port 9234 free or held by the daemon; **port 8081 free** (the `servers` block starts the fixture server; the actors' URLs hard-code 8081).
  - ROOT: the `root-add` block adds the wave's own folder `<S11_OUT>\wave\root` to the Upload folders after the -3 rows; nothing to do by hand.
  - **The old build `63c771c`** for R20-VERSION: network for the scratch worktree's own `npm ci`, which lives under `S11_OUT` (the code refuses one inside the repo).
  - Window X (the wave's window) in front for the UIA click of R20-POP-OTHER-3's `human` leg; the screen must hold room for two windows side by side of at least 500 x 400 each (R20-G2-1's `uncovered` leg), otherwise that leg is NOT MEASURED.
- **Expected first record lines (R20-0B):** `MANIFEST ...`, then exactly `LOADED20 keys=page nested=page elem=page perm=yes listener=yes enabled=yes args=answered`, then R20-0's remaining lines, `HEAD <sha> tree=clean`, the S4 line and `ROW R20-0B PASS slice=B`.
- **Where the record lands:** `docs/plans/2026-10-29-step13-phase-f-followups-steps/S13-live-record-liveB20.txt` (`-att<k>` for a later attempt); the -3 rows' counts in `S13-live-evidence-liveB20-pop3[-att<k>].txt` (written at R20-LOGS or at teardown). In `S11_OUT`: the console segments `console-liveB20-<k>.txt`, the actors file `actors-liveB20.jsonl`, the scan inputs and `r20-pop3-evidence.txt`. The window rectangles' answers stay in `S11_OUT`; only the printed `RECT` lines reach the record.
- **What each STOP return means** (every `STOP <reason>` is followed by `RETURN <seq> after-stop=<reason> restored=... readback=...`, and the runner returns):
  - `build-not-loaded`, `extension-disabled`, `reload-failed` (R20-0B, before any state change): rebuild and reload, new attempt.
  - `popup-lease-wrong` (the -3 rows): a product defect; escalate.
  - `existing-tool-changed` (R20-VERSION's control upload, with the old build loaded): escalate; the swap restores HEAD first.
  - `chooser-interception-left-on` (a CHOOSE row's control upload failed): check the safety state first; escalate.
  - `dialog-left-open`, `devtools-left-open` (a native dialog or a DevTools window left on screen): close it only with the user.
  - `old-build-left-loaded` (the swap could not restore HEAD, reload it and prove it): check which build is loaded before anything else.
  - `not-restored` (the read-back differs from R20-0B's by count or hash): escalate; never retry past it.
  - `text-leak` (R20-LOGS: a name, path, sentinel or token count above 0): escalate and do not commit the record.
  - `throw-after-state` (a helper or environment throw after the first state change; the restore ran first). Includes R20-G2-1's `wb-unknown` (B's window not found).
- **Resume after a return:** run `-Block teardown -Att <k>`; fix a helper only between rows, never past a STOP line; a new attempt takes `-Att <k+1>` and a fresh `S11_OUT` (at most three per slice). **Exception:** after a RETURN that reads `restored=no`, run neither teardown nor a re-run; return to the user. A leg that ends NOT MEASURED, NOT DISCRIMINATING or RECORD is recorded and the wave goes on.
