# S5-drivers-B4b verifier, round 2: re-check of fixer1 (F1-F4, NIT-1, NIT-3)

Model and effort: Opus, medium. Read and run only. No tracked file was edited. Nothing ran against Chrome, a daemon, a
fixture server, a port or the reload script. `-Block plan` ran once, after I read that it exits before Run 17's files are
read and that the files it dot-sources only define functions. Evidence: `S5-drivers-B4b-verifier2-gates.txt`,
`S5-drivers-B4b-verifier2-test.txt`, `S5-drivers-B4b-verifier2-mutants.txt`.

## 1. Verdict

**PASS-with-notes.** F1 (MAJOR) is fixed. Both bounds throw on the runner's existing path, and that path ends in STOP
`throw-after-state` after the restore, with its RETURN line. Neither bound can fire on a correct run of any slice-B actor
row, and neither is looser than Run 17's `val` list. F2, F3, F4, NIT-1 and NIT-3 are resolved. There is no new CRITICAL
or MAJOR. Three NITs are below.

## 2. Gates (re-run by me)

- `npm test`: **5934 passed / 248 files**, exit 0. The start of B4b was 5899 / 247, the first verifier's run was 5930 / 248,
  and fixer1 added +4 tests. No test was removed.
- `npm run typecheck` exit 0. All eight `recipes/tsconfig*.json` (fe, json, s6, s9, s10, s11, s11b, s13) exit 0.
  `npm run build` exit 0. `node scripts/doc-check.mjs` exit 0.
- `-Block plan` exit 0. It prints the order R20-0B, the three -3 rows, `root-add`, CLOSERPROBE, the three CHOOSE rows,
  G2-1, VERSION, RESTORE, LOGS.
- Changed files and evidence (fixer1's and mine) contain no user name or private path (grep of the name forms and
  `Users\`: no hit).

## 3. The attacks

**(a) F1: a throw at either bound reaches STOP `throw-after-state` with the restore and RETURN.** Traced:
1. `Invoke-R20Serve` throws (`s13-r20-b-defs.ps1:34-35`).
2. It is called from `Invoke-R19StepB` (`s13-r20.ps1:183`), inside `Invoke-R19Steps` (`s12-r19-a.ps1:22`), which is
   the driver of `Invoke-R17Node`.
3. `s11b-r17.ps1:116` catches the throw into `$tag` (`Get-S11bStopCause`: our own `throw` keeps its message). Then
   `:117` runs `Stop-S16Pid 'node'`, which kills the actor only when its start time equals `S16Born`. `:118` waits, and
   `:125` throws "the driver of ... threw".
4. `Invoke-R19Node` rethrows it, because the message matches neither mapped form (`s12-r19-lib.ps1:58-62`).
5. The finallys of `Invoke-R19Row` and `Invoke-R20Ch` run: the closer and WA's close.
6. `Invoke-R19Slice`'s catch (`s12-r19-lib.ps1:215-216`) calls `Stop-R19Wave`. The reason is `throw-after-state`,
   because `R19Reason` is empty. Since `S16Changed` is set, it restores, reads back, then kills the wave's processes,
   prints `RETURN <seq> after-stop=throw-after-state ...`, and returns 2.
7. For VERSION, `Invoke-R19Swapped`'s finally first restores HEAD, reloads and prints `LOADED20 rerun`. If any of that
   fails, the reason becomes `old-build-left-loaded` (`:136-...`).

The path is correct.

**(b) Can a bound fire on a correct run?** No. The serve window opens when `Start-Process` returns (`s11b-r17.ps1:114-116`).
The idle clock restarts **after** each handler has answered (`$r20ta = Get-Date` after `Write-S11Pressed`), so a handler's
own time counts only toward the budget. VERSION's swap, its `npm ci`, the reload and the old build's own proof
(`Test-R20OldLoaded`, a separate node with no driver) all run **before** `Invoke-R20Ch` spawns the actor. They are outside
the serve window.

The table bounds each legitimate gap from the actor's code (`s13-r20-b.ts`), using the calls' own timeouts and sleeps
(`x.open` = newTab + 1.2 s; `ev` ≤ 20 s; SDK default 30 s; chooser wait about 5 s, Run 19 margin 4.9-8 s). "Usual" is
my estimate with calls answering normally. It is an estimate, not a measurement.

| Row | Longest idle gap | Usual (est.) | Ceiling if the expected waits run out | Whole row |
|---|---|---|---|---|
| CHOOSE-TWICE | start → `-dlg` (only step): tsx start, open, 2 uploads (call 1 waits about 5 s), MCP spawn, new tab + 1.5 s, 2 MCP calls (about 5 s), control (open, upload, 0.3 s, eval) | about 25-35 s | about 40 s with both chooser waits at 8 s | < 60 s |
| CHOOSE-KEPT | start → `different-dlg`; then → `same-dlg`: open, upload, page13 (at most 21 polls), 2 s, upload, page13 | about 10-15 s each | < 30 s | < 60 s |
| CHOOSE-REFUSE-DIS | each leg: open, upload (`btn` waits out the chooser, ≤ 8 s), 0.3 s, eval | about 10 s | < 20 s | < 60 s |
| G2-1 | `rects-<leg>` → `rects-<leg>-after`: alone screenshot (≤ 10 s), 1 s, timeline (A ≤ 30 s, B 0.1 s + 30 s), eval | about 35-45 s | about 43 s plus eval | about 150-200 s |
| G2-1 | last answer → exit: 1 s, focusFirst variant (B ≤ 30 s), tab close | about 32 s | < 65 s | (included above) |
| VERSION | start → `-dlg` (only step): open, refused calls, MCP spawn, 1.5 s, raw, control, evaluate | about 20-30 s | < 60 s | < 60 s |

Every gap stays under 120 s and every row under 600 s, with at least 2x margin even when the expected waits run out (the
chooser wait, G2's 30 s B timeout, the 10 s alone-control). The only path past 120 s is several calls each running to its
own 30 s default timeout. That is not a correct run, and Run 17's `val` list (120 s per step) had the same limit. The
actor's own 180 s `pressed` wait is the actor's bound and counts from its signal. The driver answers well within it.

The bounds are not looser than Run 17's: idle 120 s equals `Wait-S11Ready`'s 120 s (`s11-win.ps1:68-70`), and the budget
600 s equals the `-BudgetS 600` that `Invoke-R20Ch` already passed. The dispatch defaults are 600 and 120, and
`Invoke-R20Ch` passes `s = 600`.

**(c) The start-time check cannot misread the wave's own actor as gone.**
- `Set-S16Pid` (`s11b-r17.ps1:85-89`) records `(Get-Process -Id).StartTime.Ticks`. `Test-R20NodeAlive` compares the same
  property of the same process, so the precision is identical and the values are equal.
- A missing `S16Born['node']` skips the comparison. The actor then counts as alive, which can only keep serve running,
  and the bounds still end it.
- A reused PID whose `StartTime` cannot be read gives `$null`, which is unequal, so it counts as gone. That is the safe
  direction.
- `S16Born` is set before the driver starts (`:115-116`).

**(d) liveA20 is unchanged.** At `s13-r20.ps1:183` the `val` branch's body is byte-identical to HEAD 489bf47 (extracted
both and ran `cmp`: identical). `if` became `elseif` after a new `serve` test. No liveA20 step has `k = 'serve'`, so its
dispatch is unchanged. Nothing else in the fixer's diff touches `s13-r20.ps1`.

**(e) F2: the claim is true and acceptable.**
- `s13-r20-b.ts` raises only `chooser-interception-left-on`, `dialog-left-open`, `throw-after-state` and
  `existing-tool-changed`.
- Every path it sends comes from `fileOf(state(), …)` under ROOT.
- In §4.28 (l.1980-2008), `<OUTSIDE>` appears only in the prologue's list of files (l.1995). No CHOOSE row (l.1982-1984)
  and not VERSION (l.1986) sends an outside file, or states an expected value or pass clause about one. The reason sits
  in the STOP list (l.2000), carried over from Run 19, where R19-CHOOSE-2 sends `<OUTSIDE>\s11-out.bin` (l.1840).
- So no pre-registered reading is missing.
- The decision, as proposed, is right: adding a check now would be a new pass rule written after the sheet. The reason is
  in `SLICE_B_STOPS`, its pairing is tested, and the how-to says to escalate and not commit.

**(f) The F3 tests kill their mutants.** These are my own runs on copies (evidence file):

| Mutant | Result | Test that kills it |
|---|---|---|
| m1: `r20-0b` without `Reset-R20Pop3Evidence` | killed | "each block calls its row …": `ZERO-ROTATED True PREV=1` is missing |
| m2: the teardown `Copy-R20Pop3Evidence` line removed | killed | "-Block teardown copies the -3 evidence …" |
| m3: the root flag set before the wrapped `root-add` | killed | "the root flag stays False …" |

Each copy also fails the window-title test. That test reads `<REPO>/test-fixtures`, which I did not copy, so it is a copy
artifact and not a kill. The fixed tree gives 32/32.

**F1 red without the fix.** In a copy outside the main tree, with no `node_modules` and no link (`find -type l` empty), I
deleted the two bound throws from `Invoke-R20Serve`. The serve-bound test went red:
- It printed `IDLE-RETURNED`, `IDLE-FAST False` and `BUDGET-RETURNED`.
- Serve waited out the silent process's whole 60 s life instead of throwing at 1 s.
- Duration 64.96 s, 2 failed, one of them the copy artifact.

With the fix, it prints `IDLE-THREW … (1 s)` and `BUDGET-THREW … 1 s`, each in under 30 s. This replaces fixer1's red
line, which had no vitest summary.

**(g) The corrected §8 is enough to run liveB20.** I checked it against the code.
- **Starting it.** The command matches the script's header and `param` block (`liveB20 | plan | teardown`, `-Att`). The
  record name matches `Get-R19RecordName` (`s13-r20.ps1:19`). The evidence copy name matches `Get-R20EvidenceCopy`.
  ROOT is `<S11_OUT>\wave\root`.
- **Port 8081.** The "port 8081 free" prerequisite is needed. `Select-R20Port` moves to 8082 if 8081 is held
  (`s13-r20.ps1:33`), but the actors hard-code 8081. This was already true before this stage, and §8 states it.
- **Reading a return.** §8 covers teardown with the attempt's own `S11_OUT`, VERSION's two NOT RUN outcomes, and a hung
  row (now a `throw-after-state`). It also covers the `restored=no` exception, which stops teardown and any re-run.
- A runner can start, read and resume without guessing.

## 4. Findings

- **NIT-A** `s13-r20.ps1:183`: the dispatch's forwarding of `$S.s` and `$S.i` is not pinned by a test. The only dispatch
  test (`s13-r20-b-ps.test.ts:75`) passes neither, and the defaults equal the values `Invoke-R20Ch` sends, so a mutant
  that drops the forwarding survives as an equivalent one. There is no runtime effect today. Fix (optional): one test
  with `s = 1` on a silent process that expects the budget throw.
- **NIT-B**: fixer1's F1 red line has no vitest summary ("not captured"). My run above is the red proof of record.
- **NIT-2** (round 1): still open, cosmetic. The builder notes it.

## 5. Proposed decisions

I agree with both of fixer1's decisions, (`outside-file-reached-page` has no slice-B reader) and (VERSION's ROOT guard
is a defensive NOT RUN). Neither changes a pass rule.

## 6. Handoff

- **Nothing is running.** The test children have exited, and no daemon, Chrome, server or port was touched.
- **The scratch copies.** They are in the session scratchpad, outside the repo: `red/`, `m1/`, `m2/`, `m3/` and
  `v2-*.txt`.
- **The deleted `red/` folder.** Before I reused the folder name, my first command deleted `red/`, the first verifier's
  scratch probe folder from the same scratchpad. It was scratch only and not cited as evidence.
- **A classifier denial (§3 item 10).** A second `rm -rf "$S/$m"` on scratch folders was refused by the built-in removal
  check. I did not retry it. I made the copies in fresh folders without any removal. The scratch folders are left for
  the user to delete.
- `dist/` was rebuilt by `npm run build` (gitignored).
- No commit.
