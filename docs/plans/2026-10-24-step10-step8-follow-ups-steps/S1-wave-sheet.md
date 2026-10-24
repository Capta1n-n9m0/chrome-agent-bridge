# Step 10 S1 — wave sheet (Run 14: the R14 rows of `docs/e2e-test-plan.md` §4.21)

Written 2026-10-25 by the S1 prep builder, before any R14 row ran and before the rows were committed. The rows, their
expected text and their pass rules are §4.21; this sheet is the order, the commands, the record template and the
clean-up. **The helpers were not run against Chrome by their author** (the prep stage may not touch Chrome): their parse,
the window-geometry type, the placement JSON path, the threaded redirect server (with its positive control against the
old server) and the stop procedure's refusal path were dry-run without Chrome (`S1-prep-builder.md` §3). The build on
disk is Step 9's; **no `npm run build` in this wave** (phase doc 0.1). *Amended 2026-10-25 by the S1 prep fixer (round
1), before any R14 row ran: the step agent's rulings on the prep verifier's F1–F8 and N1–N5 (`S1-prep-fixer1.md`).*

**STOP RULE (#193): on any STOP line — a restore that fails, a guard that prints STOP, a human gate (pinning, a
grant), any throw — run the restore first if the safety state was touched since the found-state record, record its
read-back, write the ledger, and RETURN to the step agent. A helper may be fixed only between rows, before any
observation of the next row, and never past a STOP line.**

How the rule is carried out mechanically: every block below is ONE call of `recipes/s9-r14.ps1`. A guard prints a line
beginning `STOP:` and throws; any other throw in a block is caught the same way; the runner script then runs the stop
procedure itself — `Restore-S9All` (the safety half restores and reads back only if the found state was recorded, and
presses nothing that is already as found; then the pin state, the keyboard layout, the driver windows), the tabs, the
daemon and the servers stopped — prints `STOPPED at block <b>. Restore: …`, and exits **2**. Exit 2 = **write the ledger
and RETURN** (quote the `STOP:` lines and the `RESTORE …` / `STATE …` lines verbatim). After a stop every block but
`status` refuses (`NOT RUN: the wave stopped …`, exit 3). A STOP you meet outside a block (a classifier denial, a
window that is not yours, anything unexpected) → `-Block stop -Why "<what>"`, then the same: ledger, RETURN. Exit 0 =
the block ran (a row's `CHECK … FAIL` is recorded and the wave goes on — it is not a stop). Exit 3 = nothing ran (read
the line: if it names a stop, you missed one — RETURN; otherwise you called a block out of order — call the right one).

**Gates.** The pinning gate (R14-PIN) and the found-state guard (R14-FOUND) come before any state change; block 5
already applies the found-state guard to SAFE-0's tuple, before any reload (a reported tuple other than `safety
armed=true evaluate=true blockedCount=0` → `STOP: found-state guard …`, no reload). Human gates
that are a STOP: the toolbar button not pinned and UI Automation unable to pin it (no mouse-click pinning: #192/#202 do
not pre-approve it); any Chrome restart or kill (G10-2 is not this wave's); a reload whose script exits non-zero after
one re-run on exit 2. Also a STOP: a port-9234 holder that is not the daemon; a bridge MCP process running; a tracked
file changed or dist not Step 9's (a build would change what is measured); a restore that does not read back equal;
any count of the token, a non-fixture `://` or the test pattern in `daemon.log` (nothing is copied then) or in the
worker console, whoever wrote the line (R14-LOGS FAILS and is recorded; the stop procedure restores); a window above O
that covers it at R14-3 (`STOP: block r3: R14-3 placement guard …`, before the toolbar click). Kill only PIDs
`Test-SafeToKill` calls safe or that the wave started and identified (the runner script does both); node PID 22152 is
not ours.

**Never printed or committed:** the token (read only inside `s9.ts`'s scans); the block list as found (its count and
line count may be printed — the daemon logs the count by design, #132; its sha256 only when it is the empty text's — a
non-empty list prints `withheld(non-empty)`, also from `Set-S9BlockList -FromFile`; the restore compares the hashes in
the helper and prints only `block-list sha256 vs found equal` or `DIFFERENT`); any title or URL
of the user's tabs (listings are counts); any URL in R14-REL-3's output (a class only); a screenshot.

## 0. Set-up (the PowerShell tool, repo root)

The PowerShell tool keeps no state between calls; `s9-r14.ps1` keeps the wave's globals in
`%TEMP%\bridge-e2e\s14\r14-globals.clixml` and appends every printed line to `%TEMP%\bridge-e2e\s14\r14-raw.txt`
(the raw output the live verifier greps for `STOP:` lines, S1.5 with Stage 0 F20). It sets the Node path itself. Every
block is called exactly as:

```powershell
[Console]::OutputEncoding = [Text.Encoding]::UTF8
powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\s9-r14.ps1 -Block <name> [-Prep <sha>] [-DelayMs <ms>]
"exit $LASTEXITCODE"
```

Paste each block's output as it comes (verbatim, with the UTC times printed): **blocks 1–4 (pre-flight, servers,
window, setup) go to `S1.ledger.md`** — its "Found state" and "Live PIDs" sections — **not into the record**; the
record's "Lines" start with **L1 = SAFE-0** (block 5), its first recorded line (S1.2), and every later block's lines
follow in the record (`S1-run-record.md`, template below). After block 4 (setup) and at the end, `-Block status` prints
the PIDs and window handles for the ledger's "Live PIDs" section.

## Blocks, in run order

| # | Block | Rows | Notes |
|---|---|---|---|
| 1 | `-Block preflight -Prep <S1 prep commit>` | R14-PRE (read-only) | the prep commit is the one the step agent names in the runner brief; nothing is changed |
| 2 | `-Block servers` | R14-SRV | 8080, 8081 (`python -m http.server`), 8083 (`recipes/s9-redirect.py`, threaded); logs in `%TEMP%\bridge-e2e\s14` |
| 3 | `-Block window` | R14-PIN (human gate) | W opened; pin state read by UIA; not pinned → one UIA-only attempt; still not → STOP (exit 2) → RETURN: the step agent asks the user to pin the button once |
| 4 | `-Block setup` | R14-SETUP | the wave's daemon-log mark; `s9.ts setup` spawns the daemon; E and the worker console D |
| 5 | `-Block safe0` | **L1 = SAFE-0** (S1.2) | the record's first line; SAFE-0's tuple read first — reported and not the default → STOP (found-state guard, no reload); a reload by `recipes/reload-extension.ps1` only if SAFE-0 fails with the expected (or no) tuple (one re-run on exit 2), then SAFE-0 again |
| 6 | `-Block found` | R14-FOUND (S1.4 start; guard) | O opened; the found state recorded (copy the `FOUND STATE recorded:` line into the ledger's "Found state"); not the default → STOP |
| 7 | `-Block rel3` | R14-REL-3 | no state change |
| 8 | `-Block pop1` | R14-POP-1 | no state change |
| 9 | `-Block r3` | R14-3 | **first state change** (the options switch); toolbar click (pinned button); the placement guard (side by side, on a work area, no occluder above O) before the switch and before the click |
| 10 | `-Block type` | R14-4b | the background `r14-type` PID tracked (ended before the restore on any STOP); toolbar OFF during the trusted type, 20 s banner poll, toolbar re-arm; ~30 s. On `NOT DISCRIMINATING`: **once** `-Block type -DelayMs <the RERUN-DELAY printed>` before block 11 |
| 11 | `-Block ctl` | R14-5c-ctl | the positive control; a FAIL is a STOP |
| 12 | `-Block 5c` | R14-5c | block list `localhost:8081` (options page), the two downloads, the server-log counts, the list emptied again |
| 13 | `-Block restore` | R14-RESTORE (S1.4 end) | the read-back must equal the found state; a mismatch is a STOP that escalates |
| 14 | `-Block logs` | R14-LOGS (S1.6) | console capture + counts (`--mode console-s16`: every count 0, whoever wrote the line); daemon log counted, copied to `S1-daemon-log.txt` only at 0; a non-zero count in either → STOP after both are counted |
| 15 | `-Block teardown` | R14-TEARDOWN | tabs (every opened tab accounted for; r3 closed explicitly — by W's own UIA if its `closeTab` is refused), desk (pin as found, layout, windows D, O, E, W), daemon (`daemon.shutdown`, else its identified PID), servers (own PIDs, `Test-SafeToKill`), ports free; raw output copied to `S1-run-raw.txt` only after its committed-file scan passes |

Which rows need the pinned toolbar button: R14-3 (the re-arm click) and R14-4b (the disarm and the re-arm). No row uses
`Alt+Shift+K`. Every other change goes through the options page O (UIA patterns, no mouse).

### Resume after Return 2 (attempt 3)

*Added 2026-10-25 by the S1 wave fixer (`S1-wave-fixer.md`), applying the step agent's rulings on Return 2
(`S1.ledger.md`). Nothing ran against Chrome to write it.* Attempt 2 stopped at block 9's placement guard with the
safety state never changed. Attempt 3 does **not** re-run R14-REL-3 or R14-POP-1 (recorded in attempt 2; a failed row
is never re-run). The first call archives attempt 2's state and starts the resume; it refuses (exit 3, nothing
archived) unless the stored state is attempt 2's — stopped at r3, done exactly preflight … pop1, not itself a resume.
*Round 2 (2026-10-25, wave verifier F2):* only this exact call is accepted (`-Attempt 3`, both names); anything else
prints `USAGE: …` (never `STOP:`), exits 3 and changes nothing:

```powershell
[Console]::OutputEncoding = [Text.Encoding]::UTF8
powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\s9-r14.ps1 -Block reset -Attempt 3 -Skip rel3,pop1
"exit $LASTEXITCODE"
```

It prints `RESUME attempt 3: rel3, pop1 recorded in attempt 2, not re-run` and `RESUME attempt 3: blocks preflight,
servers, window, setup, safe0, found, r3, type, ctl, 5c, restore, logs, teardown; daemon.log mark
2026-10-24T21:14:17.041Z (the WaveStart stored in …)` (attempt 2's wave mark, kept for R14-LOGS). If attempt 2's mark is
no longer stored (its globals file and every archive gone), the reset refuses; pass `-LogMark 2026-10-24T21:14:17.041Z`
(the record's attempt-2 line `wave start 2026-10-24T21:14:17.041Z`) and the line says so; `-LogMark` while the mark is
stored is a `USAGE:` refusal. Then, one call each, exactly
as in §0, in this order:

`-Block preflight -Prep 5f17d54` · `-Block servers` · `-Block window` · `-Block setup` · `-Block safe0` (framing:
re-proves the build) · `-Block found` (framing: re-records the found state) · `-Block r3` · `-Block type` (its one
pre-registered re-run as in the table) · `-Block ctl` · `-Block 5c` · `-Block restore` · `-Block logs` ·
`-Block teardown`.

- `-Block rel3` and `-Block pop1` answer `NOT RUN: block … is skipped in this resume …` (exit 3); every other block
  keeps the order check against the order above (out of order → `NOT RUN … needs block … first`, exit 3). `-Attempt`,
  `-Skip` and `-LogMark` on any block but `reset` → `NOT RUN` (exit 3).
- Block r3 prints the RESUME line again, then the placement tries (ruling (a)): one line per work area,
  `PLACEMENT work area […] cut to y=<n> by taskbar class=<class>` or `… not cut (no shell taskbar intersects it)`
  (round 2, verifier F1: the bottom cut to the top of any shell taskbar intersecting it, an auto-hidden strip
  included; on this desk both monitors' auto-hidden taskbars cut at y=1078), then `PLACEMENT order <m>: […] …` (the
  areas as tried: W's monitor first, then the others in the system's order); per try `MOVED driver window E|D inside W's rect …`,
  `PLACED …`, `ROW R14-3 placement-attempt-<n> …` and `PLACEMENT attempt <n> on work area […]: free|not free — …`
  (records); then `PLACEMENT chosen: attempt <n> of <m>` and the unchanged guard (`ROW R14-3 placement-before-switch
  …` + `CHECK …`). No try free → `PLACEMENT none of the <m> work areas is free` and the same `STOP: R14-3 placement
  guard …` → RETURN. A non-zero occluder count is printed with each occluder named `driver:W|E|D|O` or
  `class=<ClassName> process=<name>` — never a title.
- Block logs (ruling (d)) counts `daemon.log` from attempt 2's mark (both attempts) and prints `R14-LOGS daemon.log
  counted from 2026-10-24T21:14:17.041Z (attempt 2's wave mark: …) - attempts 2 and 3` and `R14-LOGS attempt 2's worker
  console was not captured (its window D closed with attempt 2's stop procedure) - a recorded deviation; …`.
- The record: attempt 3's lines go into `S1-run-record.md` under a new heading `## Attempt 3 (runner 3) — resume after
  Return 2`, from its SAFE-0 line on; attempt 2's lines (R14-REL-3 PASS, R14-POP-1 FAIL) stand as recorded. The
  preflight still needs a clean tracked tree: the step agent commits this fix and its bookkeeping first.

## PIDs and handles to track (the ledger's "Live PIDs")

daemon (block 4, `-Block status` `S14Pids daemon=`), http8080 / http8081 / redirect8083 (block 2), driver windows W, E,
D, O (handles; blocks 3, 4, 6), the background `s9.ts r14-type` (block 10: `background r14-type PID <p> (tracked; …)`,
`S14Pids r14type=` in `-Block status` while it runs; on the success path it ends inside the block and the key is
removed; on any STOP the stop procedure ends its identified PID tree — command line naming `recipes/s9.ts` and
`r14-type`, each PID through `Test-SafeToKill` — BEFORE `Restore-S9All`). It is the only background process a block
starts; every other `s9.ts`/node call runs in the foreground of its block. At the end all are gone (block 15 prints
it).

## The restore and its read-back

- At the end: block 13 (`Restore-S9Safety R14-END`): the options switches `armed` and `evaluate` pressed only if off,
  the list saved empty only if it is not; then a stored read (O to about:blank, the old page proven gone, a fresh
  options page), `daemon.status` (`ROW R14-END wait-safety reached …`) and the toolbar title; the line
  `RESTORE safety read-back: stored page equal true, daemon.status equal true, title armed true, block-list sha256 vs
  found equal`.
- On a STOP: the same `Restore-S9All`, run by the script before it exits 2 (its lines are in the output: `RESTORE …`,
  `STATE …`, `RESTORE ok: …` or `STOP: RESTORE FAILED …`). A failed restore → RETURN with "RESTORE FAILED" as line 1;
  nothing more is pressed in Chrome.
- Rows chain back to the found state themselves: R14-3, R14-4b and R14-5c each end with `wait-safety … --guard` on
  armed, JavaScript on, 0 blocked sites — a miss is a STOP.

## End of the wave

Block 15 (teardown). Then, outside the script: `git status --short` (no tracked change by the wave except the files
below), `netstat -ano | findstr ":9234 :8080 :8081 :8083"` (no LISTENING line), `-Block status`.

Files for the commit after the live verifier (the step agent commits): `S1-run-record.md`, `S1-daemon-log.txt` (written
only at 0 counts), `S1-run-raw.txt` (written only after its scan). Never the console capture
(`%TEMP%\bridge-e2e\s14\r14-console.txt`), the server logs, a screenshot, or `%TEMP%\bridge-e2e\s14`'s other files.

## Known limits (recorded before the run; no change)

- N4: R14-4b's follow-up cannot tell "the disarm detached the debugger session" from `withDebugger`'s own `finally`
  detach (0.10's design).
- N5: `s9-r14.ps1` runs with `$ErrorActionPreference = 'Continue'`, so a non-terminating cmdlet error inside a block is
  neither a throw nor a STOP; the helpers that matter use `throw`.
- When the background `r14-type` prints a STOP before signalling READY, the driver still waits its 120 s for READY,
  then STOPs (the same stop procedure; only time is lost). Seen in the fixer's no-Chrome dry run.

## Record template (`S1-run-record.md`)

```
# Step 10 S1 — Run 14 record (§4.21)

Runner: <model> · Chrome <version> · Node <v> · HEAD <sha> (prep commit <sha>) · wave start <ISO>
PIDs: daemon <p> · http8080 <p> · http8081 <p> · redirect8083 <p> · driver windows W <h> E <h> D <h> O <h>
Pin state found: pinned=<b> · keyboard layout <hkl> · Chrome windows at start <n>

(The pre-flight lines of blocks 1–4 are in `S1.ledger.md` — "Found state" / "Live PIDs" — not here: L1 is the
record's first recorded line, S1.2.)

## Lines (one per observation; L1 = SAFE-0 is the first recorded line)
<UTC time> · <row ID> · <block> · `<observed text, verbatim>` · <PASS | FAIL | RECORD | NOT MEASURED> vs §4.21
L1: … · SAFE-0 · 5 · `ROW SAFE-0 safety …` · …
…

## Found state and restore (S1.4)
start (block 6): `FOUND STATE recorded: armed=… evaluate=… count=… lines=… sha256=…`
end (block 13): `STATE …` · `RESTORE safety read-back: … block-list sha256 vs found <equal | DIFFERENT>` · equal: <yes | no>

## STOP lines met (S1.5; every one is a return in S1.ledger.md)
<none | each STOP line verbatim, the block, the restore read-back, the ledger entry>

## Counts (S1.6; counts only)
daemon.log: `SCAN …` · console: `SCAN …` · S1-run-raw.txt: `SCAN …`

## Set-up fixes (helper changes between rows, before the next row's first observation; none after a STOP)
- none | …
```
