# Step 10 S7 — wave sheet (Run 15: the R15 rows of `docs/e2e-test-plan.md` §4.22)

Written 2026-10-25 by the S7 prep builder, before any R15 row ran, before the rows were committed and before the Step 10
build was loaded. The rows, their expected text and their pass rules are §4.22; this sheet is the order, the commands,
the record template and the clean-up. **The helpers were not run against Chrome by their author** (the prep stage may
not touch Chrome): their parse, the block runner's order / stop / resume paths, the scans and BBL-1's judge were
dry-run without Chrome, and the fixtures were run through the extension's own content code and node:vm
(`S7-prep-builder.md` §3). **This wave builds** (block 2): Run 15 measures the Step 10 build of the committed code.

**STOP RULE (#193): on any STOP line — a restore that fails, a guard that prints STOP, a human gate (pinning, a
grant), any throw — run the restore first if the safety state was touched since the found-state record, record its
read-back, write the ledger, and RETURN to the step agent. A helper may be fixed only between rows, before any
observation of the next row, and never past a STOP line.**

How the rule is carried out mechanically: every block below is ONE call of `recipes/s10-r15.ps1`. A guard prints a line
beginning `STOP:` and throws; any other throw in a block is caught the same way; the runner script then runs the stop
procedure itself — the background `s10.ts` (if any) ended by its identified PID tree, every running actor ended, the
memory sampler and the headless Chrome ended, the windows R and bb-login's closed, `Restore-S9All` (the safety half
restores and reads back only if the found state was recorded, and presses nothing already as found; then the pin, the
keyboard layout, W O E D), the tabs, the daemon (only the wave's own, by its recorded PID) and the servers stopped —
prints `STOPPED at block <b>. Restore: …`, and exits **2**. Exit 2 = **write the ledger and RETURN** (quote the `STOP:`
lines and the `RESTORE …` / `STATE …` lines verbatim). After a stop every block but `status` refuses (`NOT RUN: the wave
stopped …`, exit 3). A STOP met outside a block (a classifier denial, a window that is not yours, anything unexpected)
→ `-Block stop -Why "<what>"`, then the same: ledger, RETURN. Exit 0 = the block ran (a row's `CHECK … FAIL` is recorded
and the wave goes on — it is not a stop). Exit 3 = nothing ran (read the line: if it names a stop, you missed one —
RETURN; otherwise you called a block out of order — call the right one).

**Gates.** Before any state change: the pinning gate (R15-PIN) and the found-state guard (SAFE-0's tuple in block 8,
R15-FOUND in block 10: anything but armed, JavaScript on, an empty list → STOP, nothing changed — #213). Human gates
that are a STOP: the toolbar button not pinned and UI Automation unable to pin it (no mouse-click pinning); any Chrome
restart or kill other than RET-1's (§6); a reload whose script exits non-zero after one re-run on exit 2;
anything that would touch a real site or a real login other than the PP1 leg's (§7; BBL-1 is dry runs only).
*Amended 2026-10-25 (S7 wave fixer 1): was "RET-1 is prepared only — G10-2" and "the pp1 leg is prepared only —
G10-3", because the user granted both for Run 15 (decisions.md · 2026-10-25 · The user grants RET-1's Chrome kill
(G10-2) and the pp1 leg (G10-3) once for Run 15; the button is already pinned (#221)), widened by decisions.md ·
2026-10-25 · The user widens Step 10's grants: unlimited Chrome restarts, repeated pp1 reads, hidden pp1 writes (#222).
They run after block 35 (teardown), PP1 first, then RET-1 (§6, §7).*

**Run 15 restarts from block 1** (S7 wave fixer 1, 2026-10-25): attempt 1 stopped at block 4 (the pin reader, Return
1) before block 5's daemon-log mark, so no row was observed; the next runner calls a plain `-Block reset` (it archives
attempt 1) and starts again at block 1. The pin reader is now `Get-S10PinState` (`recipes/s10-win.ps1`): a bounded wait
(≤ 5 s) and one widening of the driver's own window W when W is narrower than 1000 px (Chrome overflows a pinned action
into the Extensions menu in a narrow window — measured: none at 516 px, present at 600 px and wider); it never clicks.
If it still finds no button, the pinning gate's STOP stands exactly as written.
Also a STOP: a port-9234 holder that is not a daemon; a bridge MCP process running at pre-flight; a tracked file changed
outside the steps dir before or after the build (M1: the ledger and the record live in the steps dir); the Step 10 check failing (block 8); a restore that does not read back equal; any non-zero
count in R15-LOGS or the raw-output scan; an occluder above O at R15-3. Kill only PIDs `Test-SafeToKill` calls safe or
that the wave started and identified (the runner script does both); node PID 22152 is not ours.

**Never printed or committed:** the token; the block list as found (its count may be printed; its sha256 only when it is
the empty text's); the test pattern `saveblk.localhost` (no helper line prints it; `Set-S9BlockList` prints the count
and the sha256 of the wave's own one-line list); any title or URL of the user's tabs; a `saveTo` path (`<saveTo>`); an
expression (`<expr>`); an evaluated value; a screenshot; an actor transcript whole (its lines are quoted only through
`s10.ts`'s scrubbed `ROW` lines, after R15-LOGS counted the transcript).

## 0. Set-up (the PowerShell tool, repo root)

The PowerShell tool keeps no state between calls; `s10-r15.ps1` keeps the wave's globals in
`%TEMP%\bridge-e2e\s15\r15-globals.clixml` and appends every printed line to `%TEMP%\bridge-e2e\s15\r15-raw.txt` (the
raw output the live verifier greps for `STOP:` lines, S7.6 with Stage 0 F20). It sets the Node path, `S9_OUT` (= the
s15 folder, shared with `s9.ts`), `S9_ACTORS` and `S9_CLAUDE` itself. Every block is called exactly as:

```powershell
[Console]::OutputEncoding = [Text.Encoding]::UTF8
powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\s10-r15.ps1 -Block <name> [-Prep <sha>]
"exit $LASTEXITCODE"
```

Paste each block's output as it comes (verbatim, with the UTC times printed): **blocks 1–7 (pre-flight, build, servers,
window, daemon, reload, setup) go to `S7.ledger.md`** — its "Found state" and "Live PIDs" sections — **not into the
record**; the record's "Lines" start with **L1 = SAFE-0** (block 8), its first recorded line (S7.2), and every later
block's lines follow in the record (template below). After block 7 and at the end, `-Block status` prints the PIDs and
window handles for the ledger.

## 1. Blocks, in run order

*Amended 2026-10-25 by the S7 prep fixer (round 1), before any row ran: MCPF-1 runs as three blocks, SAVE-FIX, SAVE-64's
MCP leg and SAVE-PRIM as their own blocks; every row block builds the page values it reads at its start (a resume never
depends on a skipped block); each block is bounded by a budget (below). The verifier's findings and what changed:
`S7-prep-fixer1.md`.*

**Budgets and the tool's cap (m2).** The PowerShell tool ends a call at 600 s, which would bypass the stop procedure.
Every node script a block runs (`s10.ts`, `s9.ts`, `s9-actor.ts`, `s6.ts`) is bounded by the block's **budget**,
counted from the block's start: past it, the call's identified process tree is ended (`Test-SafeToKill`), a `STOP:`
line is printed and the stop procedure runs inside the same call. **Worst case per block = budget + its longest call
outside a node script + the stop procedure (≤ 160 s: one actor's end 30 s, the headless Chrome 10 s, the restore's UIA
steps ≈ 45 s, cleanup and `daemon.shutdown` bounded by 30 s each inside the stop, the kills).** A rule test
(`recipes/test/s10-rules.test.ts`) requires ≤ 570 s for every block. Actor turns are bounded by 75 s (240 s for the 64 MiB
`saveTo` turn); a turn that does not end in time is a `STOP:`. **A block that the tool still ends at its cap is itself a
STOP:** run `-Block stop -Why "<block> hit the tool's 600 s cap"` (it ends the recorded foreground/background node
calls, the actors, the sampler and the headless Chrome, restores, and marks the wave stopped), write the ledger, RETURN.
Call every block with the tool's timeout at 600 000 ms.

| # | Block | Rows | ≈ time | Budget · worst case | Notes |
|---|---|---|---|---|---|
| 1 | `-Block preflight -Prep <S7 prep commit>` | R15-PRE (read-only) | 10 s | 330 · 505 s | the prep commit is the one the step agent names in the runner brief; tracked files clean outside the steps dir |
| 2 | `-Block build` | R15-BUILD | 1–2 min | 330 · 505 s | `npm run build` of committed code; the tracked status outside the steps dir equal before and after it |
| 3 | `-Block servers` | R15-SRV | 5 s | 330 · 505 s | 8080 (`test-fixtures`), 8085 (`recipes/fixtures`) |
| 4 | `-Block window` | R15-PIN (human gate) | 10 s | 330 · 505 s | W opened; pin read by UIA; not pinned → one UIA-only try; still not → STOP → RETURN (the step agent asks the user once) |
| 5 | `-Block daemon` | R15-DAEMON | 10 s | 330 · 505 s | the wave's daemon-log mark; the new build's daemon (a running older one is handed over by `connect()`) |
| 6 | `-Block reload` | R15-RELOAD | 20 s | 330 · 550 s | `recipes/reload-extension.ps1` (outside the node budget: 60 s); one re-run on exit 2; else STOP |
| 7 | `-Block setup` | R15-SETUP | 30 s | 330 · 505 s | the nine fixture tabs, opened after the reload |
| 8 | `-Block safe0` | **L1 = SAFE-0** + the Step 10 check | 15 s | 330 · 505 s | the record's first line; the tuple guard; any FAIL → STOP (no second reload) |
| 9 | `-Block console` | R15-CONSOLE | 15 s | 330 · 505 s | E, D |
| 10 | `-Block found` | R15-FOUND (S7.4 start; guard) | 15 s | 330 · 505 s | O; copy `FOUND STATE recorded: …` into the ledger |
| 11 | `-Block rep0` | REP-0 (probe, #97) | 20 s | 330 · 505 s | window R; any verdict recorded; exit 2 → STOP. A probe, not a row: it runs again in every attempt of a resume |
| 12 | `-Block bbl1` | BBL-1 delayed-old, delayed-new | 1 min | 300 · 555 s | no bridge; bb-login (outside the node budget: ≤ 95 s per leg); its windows closed by handle |
| 13 | `-Block bbl2` | BBL-1 stuck, elsewhere | 3.5 min | 300 · 555 s | two 90 s bounds |
| 14 | `-Block mcpf-click` | MCPF-1 focus question + click ×3 | 1–3 min | 330 · 505 s | actor `mcpf-click`; 4 turns ≤ 75 s each |
| 15 | `-Block mcpf-type` | MCPF-1 type ×3 | 1–2 min | 330 · 505 s | actor `mcpf-type`; 3 turns |
| 16 | `-Block mcpf-press` | MCPF-1 press ×3, the tally | 1–2 min | 330 · 505 s | actor `mcpf-press`; 3 turns; prints `ROW MCPF-1 tally …` + `CHECK MCPF-1 3of3` |
| 17 | `-Block cap` | CAP-1 | 1–2 min | 330 · 505 s | SDK, then actor `cap` (2 turns) |
| 18 | `-Block sw1` | SW-1 | 30 s | 330 · 505 s | W in front, `w` selected; a pre-check before each capture (M2) |
| 19 | `-Block pop2` | R15-POP-2 (a), (b) | 30 s | 330 · 505 s | |
| 20 | `-Block save-a` | SAVE-1M, SAVE-4M, SAVE-SURR, SAVE-JSON, SAVE-REFUSE, SAVE-HOLD, SAVE-CLOSE | 2–3 min | 330 · 505 s | builds 1m, 4m, surr, json, 4m on `close`; actor `save` (1 turn) |
| 21 | `-Block savefix` | SAVE-FIX | 1 min | 330 · 505 s | builds fix; actor `fix` (1 turn); the transcript extracted and judged |
| 22 | `-Block save-64` | SAVE-64 SDK (+ memory RECORD) | 1–2 min | 330 · 505 s | builds 64m; the memory sampler |
| 23 | `-Block save-64-mcp` | SAVE-64 MCP | 1–4 min | 330 · 505 s | builds 64m; actor `big` (1 turn ≤ 240 s) |
| 24 | `-Block prim` | SAVE-PRIM | 1–2 min | 330 · 505 s | builds 64m; the guard after it |
| 25 | `-Block idonly` | SAVE-IDONLY (RECORD probe) | 30 s | 330 · 505 s | throwaway headless Chrome, its PIDs checked gone |
| 26 | `-Block save-ttl` | SAVE-TTL | 6 min | 360 · 535 s | builds 4m; 330 s idle inside one call. **Slack ≈ 25 s** (360 s budget − the 330 s idle − the 4m build, the `saveTo` start and the pulls): a slow start or build runs out of budget → `STOP:` (the safe direction: no row is written past the budget, never a wrong SAVE-TTL row); a resume re-runs nothing (row block) |
| 27 | `-Block r3` | R15-3 | 30 s | 330 · 505 s | **first state change** (the options switch); toolbar click; the placement guard; occluder → STOP |
| 28 | `-Block savedis` | SAVE-DISARM | 20 s | 330 · 505 s | builds 4m first; background `s10.ts save-disarm` (PID tracked); toolbar OFF, re-arm |
| 29 | `-Block savejs` | SAVE-JSOFF | 20 s | 330 · 505 s | builds 4m first; background `s10.ts save-jsoff`; options JavaScript off / on |
| 30 | `-Block saveblk` | SAVE-BLOCK | 20 s | 330 · 505 s | builds 4m on `blk` first (C1); background `s10.ts save-block`; options block list set / emptied |
| 31 | `-Block jsd` | MCPF-1-off prep, JSD (JavaScript off) | 1–2 min | 330 · 505 s | ends with JavaScript **still off** (block off uses it in the same attempt) |
| 32 | `-Block off` | JSD (bridge off), MCPF-1-off, JSD (JavaScript on) | 2–4 min | 330 · 505 s | if block jsd did not run in this attempt (a resume), it first takes MCPF-1-off's baseline and turns JavaScript off itself (M3); toolbar OFF, re-arm, JavaScript on; ends at the found state |
| 33 | `-Block restore` | R15-RESTORE (S7.4 end) | 20 s | 330 · 505 s | a mismatch is a STOP that escalates |
| 34 | `-Block logs` | R15-LOGS (S7.6), SAVE-LOG | 1 min | 330 · 505 s | console, daemon.log (copied to `S7-daemon-log.txt` at 0), every transcript |
| 35 | `-Block teardown` | R15-TEARDOWN | 30 s | 330 · 505 s | raw output scanned and copied to `S7-run-raw.txt` at 0; the saveTo files deleted |

Which rows need the pinned toolbar button: R15-3 (the re-arm), SAVE-DISARM (OFF and re-arm), block off (OFF and
re-arm). No row uses `Alt+Shift+K`. Every other change goes through the options page O (UIA patterns, no mouse). No
foreground sleep loop of the runner's own: the blocks' own waits are the only waits.

### Resume after a return (only if the step agent decides to resume)

The only resume is `-Block reset -Attempt <the stored attempt + 1> -Skip <blocks>`, where `-Skip` must be exactly the
set of **row** blocks already done in the stopped attempt (or skipped by an earlier resume) plus the stopped block when
it is a row block — so no observed row is ever re-run (#213); framing blocks (1–11, 33–35) are never skipped and run
again (REP-0, block 11, is a probe, not a row: it runs again in every attempt). Every row block builds what it reads and
block off sets JavaScript off itself when jsd did not run in the attempt, so any computed resume measures. Anything else prints `USAGE: …` (never `STOP:`), exits 3 and changes nothing. A stop before block 5 (no
daemon-log mark yet) is not resumed: a plain `-Block reset` archives it and the wave starts again at block 1 (no row was
observed). The resume prints `RESUME attempt <n>: <skipped> observed in an earlier attempt or stopped in one, not
re-run` and the run order; R15-LOGS counts `daemon.log` from the first attempt's mark; the record gets a heading
`## Attempt <n> (runner <n>) — resume after Return <k>`, from its SAFE-0 line on. Every brief fill-in for a resume is
committed before the runner starts (#213).

## 2. PIDs and handles to track (the ledger's "Live PIDs")

daemon (block 5), http8080 / http8085 (block 3), driver windows W, E, D, O (handles; blocks 4, 9, 10), R (block 11,
closed in it), bb-login's own windows (printed `own window <H> opened`, closed in their block), the actors (`mcpf-click`,
`mcpf-type`, `mcpf-press`, `cap`, `save`, `fix`, `big`, `jsd`, `off`, `on`: `s9-actor.ts start` prints host and claude PIDs; each ended in its
block, `wait-alone` after), the background `s10.ts` of blocks 28–30 (`background s10.ts <cmd> PID <p> (tracked; …)`),
the memory sampler (block 22), the foreground node call of the moment (`fg`, recorded so `-Block stop` can end it after a tool-cap kill), the headless Chrome (block 25; its PIDs = every chrome.exe whose command line names the
throwaway profile). At the end all are gone (block 35 prints it).

*Added 2026-10-25 (S7 prep fixer, round 2; the verifier's W1):* **which processes the wave may kill.** Every PID is
recorded with its creation time when the wave identifies it, and every kill re-checks it: a mismatch prints `SKIP <pid>
reused` and kills nothing. A node call's tree is walked level by level by creation time (`Get-S10Descendants`: a child
only if created no earlier than its parent — never `s9-win.ps1`'s `ParentProcessId`-only `Get-ProcTree`, which takes a
reused PID's orphans, e.g. a Chrome whose launcher exited); a child a member started after the tree was identified is
ended in up to two more passes (`Get-S10LateChildren`); only `node`, `claude`, `cmd`, `conhost` and `esbuild` (the service tsx starts) are killed from a
tree — **never `chrome.exe`** (any other image is left running and the clean-up reports "NOT all ended"). SAVE-IDONLY's
headless Chrome is ended by `Browser.close`; if still alive, only `chrome.exe` processes created at or after the launch
stamp block 25 records, whose command line carries `--user-data-dir=` the throwaway profile under
`%TEMP%\bridge-e2e\s15`, each through `Test-SafeToKill`. The rules are `recipes/s10-rules.ts` (`descendants`,
`lateChildren`, `treeKillable`, `headlessKillable`, `sameProcess`), mirrored in `recipes/s10-win.ps1` and tied by
`recipes/test/s10-rules.test.ts`.

## 3. The restore and its read-back

- At the end: block 33 (`Restore-S9Safety R15-END`): each options switch pressed only if off, the list saved only if
  not empty; a stored read (O to about:blank, the old page proven gone, a fresh options page), `daemon.status`, the
  toolbar title; the line `RESTORE safety read-back: stored page equal true, daemon.status equal true, title armed true,
  block-list sha256 vs found equal`.
- On a STOP: the same `Restore-S9All`, run by the script before it exits 2. A failed restore → RETURN with "RESTORE
  FAILED" as line 1; nothing more is pressed in Chrome.
- Rows chain back to the found state themselves: blocks 27–30 and 32 end with `wait-safety … --guard` on armed,
  JavaScript on, 0 blocked sites; block 31 ends with JavaScript off on purpose (block 32 starts with a guard on it; without jsd in its attempt, block 32 turns JavaScript off itself first).

## 4. End of the wave

Block 35 (teardown). Then, outside the script: `git status --short` (no tracked change by the wave except the files
below), `netstat -ano | findstr ":9234 :8080 :8081 :8083 :8085"` (no LISTENING line), `-Block status`, and that
`%TEMP%\bridge-e2e\s15\sv` is gone (the saveTo files) and no `s15v-*` file is left anywhere under `%TEMP%\bridge-e2e\s15`.
Then the two granted legs, in this order: **PP1 (§7), then RET-1 (§6)** — each starts with its found-state check and
ends with its read-back by hash (`Test-S10LegState`); every STOP line in them is a return (#193). *(Added 2026-10-25,
S7 wave fixer 1, #221/#222.)*

Files for the commit after the live verifier (the step agent commits): `S7-run-record.md`, `S7-daemon-log.txt`
(written only at 0 counts), `S7-run-raw.txt` (written only after its scan). Never the console capture, the server logs,
the actor transcripts or turn files, the memory samples, bb-login's outputs, a screenshot or `%TEMP%\bridge-e2e\s15`'s
other files.

## 5. Known limits (recorded before the run; no change)

- MCPF-1: focus and input are two calls (F19); one actor cannot show another actor's capture between them.
- R15-POP-2 reads the popup's `openerTabId` from `listTabs` after the click; the daemon used the `tabCreated` event's
  value, which no client sees.
- SAVE-CLOSE cannot see the store's `dropTab`; SAVE-TTL cannot tell an expiry from a worker restart (same text).
- SAVE-64's memory is the largest rise among the `--extension-process` renderers: which extension it serves is not
  proven (a RECORD).
- SAVE-IDONLY runs on a throwaway headless Chrome of the same `chrome.exe`, not the user's profile: the headless
  build's CDP is assumed to answer as the headful one (same binary).
- `s10-r15.ps1` runs with `$ErrorActionPreference = 'Continue'`: a non-terminating cmdlet error inside a block is not
  a STOP; the helpers that matter use `throw`.
- When a background `s10.ts` prints a STOP before its READY, the driver still waits for READY (≤ 120 s, and never past
  the block's budget), then STOPs.
- *Added 2026-10-25 (S7 prep fixer 1):* L1 tells the Step 10 build from Step 9's (a Step 9 extension answers
  `UNKNOWN_METHOD`); it would also pass an intermediate Step 10 build (S4 without S4b). That the loaded extension is
  S4b's is shown by the JSD rows themselves (`JS_DISABLED`, S4b's code) and by block 2's build of the committed HEAD
  (verifier m3).
- *Added 2026-10-25 (S7 prep fixer 1), untested live:* the save page's `crypto.subtle` on `http://saveblk.localhost:8080`
  (SAVE-BLOCK's tab) relies on Chrome treating `*.localhost` as a secure context; if it does not, `save-build 4m --tab
  blk` throws and block 30 STOPs before its first state change.
- *Added 2026-10-25 (S7 prep fixer 1), untested live:* the block budgets run every node script through
  `Start-Process` with its output in a file (`fg-*.out` in the s15 folder, deleted after each call); the bounded call,
  the tree kill and the STOP were dry-run with a sleeping stand-in script only.
- *Added 2026-10-25 (prep verifier round-2 re-check, N1):* a residual PID-reuse window in the tree kill — if a killed
  member's PID is reused and the reuser starts a child and exits within seconds between kill passes, that child could be
  killed; limited to node/claude/cmd/conhost/esbuild and `Test-SafeToKill`; recorded, no change.

## 6. RET-1 (G10-2) — granted once for Run 15 (#221, widened by #222)

*Amended 2026-10-25 (S7 wave fixer 1): was "prepared, NOT run … The runner never runs it; the record says `RET-1: not
run — waits for the user (G10-2)`", because the user granted it (decisions.md · 2026-10-25 · The user grants RET-1's
Chrome kill (G10-2) and the pp1 leg (G10-3) once for Run 15; the button is already pinned (#221)), widened by
decisions.md · 2026-10-25 · The user widens Step 10's grants: unlimited Chrome restarts, repeated pp1 reads, hidden pp1
writes (#222). The ready-to-ask package the user answered is kept below as asked.*

**Order.** After block 35 (teardown) and after PP1 (§7) — RET-1 is the most disruptive leg and runs **last**: if
Chrome does not come back, nothing else is left to run. Never before the teardown, never twice in one attempt.

**Re-run rule (#222).** RET-1 may be re-run only when a run failed on **tooling before any observation** (the script
stopped before its `KILLED Chrome's browser process …` line, e.g. the holder never got READY, or a `SKIP … reused`
before the kill) — and then only when the step agent orders it, under a new attempt, recorded as such. A run that
produced an observation (any line from `KILLED …` on) is **never** re-run to pass; a re-measurement is a new row ID.
`Test-SafeToKill` and "never the user's own tabs or windows" still bind.

Steps (the PowerShell tool, repo root; output pasted verbatim into the record under `## RET-1`):

1. Found-state check (else STOP — return; nothing killed):
   ```powershell
   [Console]::OutputEncoding = [Text.Encoding]::UTF8
   $env:S9_RAW = Join-Path $env:TEMP 'bridge-e2e\s15\legs-raw.txt'
   powershell -NoProfile -ExecutionPolicy Bypass -Command ". .\recipes\s10-win.ps1; if (Test-S10LegState -Leg RET-1 -Phase start) { exit 0 } else { exit 2 }"
   "exit $LASTEXITCODE"
   ```
   Exit 0 → step 2; anything else → STOP (the `STOP: LEG RET-1 start: …` line) → write the ledger, RETURN.
2. The leg:
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\s10-ret1.ps1 -Granted G10-2
   "exit $LASTEXITCODE"
   ```
   Exit 0 → step 3. Exit 3 (`RET-1 not run - disarmed as found …`, F16) → STOP, RETURN. Exit 2 (a `STOP:` line:
   several browser processes, Test-SafeToKill refusing, the relaunch failing, the holder not ending) → RETURN. **If the
   script ends with Chrome not running** (check: `@(Get-Process chrome -ErrorAction SilentlyContinue).Count` = 0, or
   the relaunch's STOP line) **that is a STOP: RETURN at once, and the first line of your return says "Chrome is NOT
   running"** — the step agent tells the user.
3. Read-back (after the relaunch; Chrome is running again):
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -Command ". .\recipes\s10-win.ps1; if (Test-S10LegState -Leg RET-1 -Phase end) { exit 0 } else { exit 2 }"
   "exit $LASTEXITCODE"
   ```
   `LEG RET-1 end: … block-list sha256 vs found equal … -> equal` is the leg's restore read-back (Chrome's restart
   never re-arms or changes `storage.local`: the state is read back, nothing is pressed). Not equal → STOP, RETURN.
4. Record the daemon serving after the leg (`netstat -ano | findstr ":9234"`: its PID; it idles out by itself and is
   never killed by hand) and `@(Get-Process chrome).Count` ≥ 1 (a count only).

Expected text and pass rule: §4.22 RET-1 (unchanged). Session restore and "Restore pages?" are not judged and never
pressed; the user's own tabs and windows are never touched.

Ready-to-ask package (as put to the user; answered "G10-2 granted", #221):

> **What:** to see the bridge retire held tabs when Chrome dies without an orderly quit (row RET-1), I would kill your
> Chrome's main process once and start it again. **What is lost:** anything not saved in your open tabs — a half-filled
> form, an unsent message, an upload in progress. **What you will see:** Chrome closes at once, then reopens within
> ~10 s; depending on your start-up setting it restores your tabs by itself or shows "Restore pages?" (the row does not
> depend on either; I will not press it). **How long:** about 2 minutes, during which you should not use Chrome. **What
> I read back:** the bridge daemon's log line `extension session changed: <n> handles retired`, the test script's own
> fixture tab only, and the bridge's on/off, JavaScript and blocked-sites state (it must be exactly as before). **What I
> never touch:** your own tabs and windows. Reply "G10-2 granted" to allow it once.

## 7. PP1 (G10-3) — granted once for Run 15 (#221, widened by #222)

*Amended 2026-10-25 (S7 wave fixer 1): was "prepared, NOT run … The runner never runs it; the record says `PP1: not run
— waits for the user (G10-3)`", because the user granted it (#221: "G10-3 granted for pp1"), widened by #222 (pp1 may
be read as many times as Step 10 needs; writes only if hidden from students — **this leg plans no write and adds
none**). The ready-to-ask package is kept below.*

**Order.** After block 35 (teardown), **before** RET-1 (§6). REP-0's failure-report probe (#97) has already run in this
attempt (block 11, a framing block that runs in every attempt) — the precondition for any row that could attach a
non-fixture tab; this leg also runs every SDK call with `failureReports: false`, so no report is taken.

**Rules.** Read-only (`recipes/blackboard/readonly.ts`; nothing is written to Blackboard). A login only through
`recipes/bb-login.ps1`'s one press — a real run, never `-DryRunBase`; exit 0 → continue; any other exit → STOP (leave
the window as the script leaves it; RETURN). The SDK leg is `export-grades.ts`, which already connects with
`failureReports: false`. Into the record go only sizes, sha256s, counts, handles and exit codes — never data, a course
name beyond "pp1", a title, a URL, a grade or any student data (the repo is public). The actor's transcript is scanned
by count (`value-runs32`) and stays outside the repo. Every STOP line is a return (#193): run the clean-up of step 6
first (it changes nothing in the safety state), then the end check (step 7), write the ledger, RETURN.

Steps (the PowerShell tool, repo root, unless Git Bash is named; `$env:S9_OUT`, `$env:S9_ACTORS` as the wave sets them:
`%TEMP%\bridge-e2e\s15`, `…\s15\actors`):

0. `$legStart = [DateTime]::UtcNow` (kept; the leg's window starts here); the leg's own failures folder
   `$pf = Join-Path $env:TEMP "bridge-e2e\s15\pp1-failures\$($legStart.ToString('yyyyMMddTHHmmss'))"` (new, empty); the
   shared folder **counted only**: `$f0 = @(Get-ChildItem "$HOME\.chrome-agent-bridge\failures" -Filter *.png
   -ErrorAction SilentlyContinue).Count`.
1. Found-state check (else STOP — the leg does not run):
   ```powershell
   [Console]::OutputEncoding = [Text.Encoding]::UTF8
   $env:S9_RAW = Join-Path $env:TEMP 'bridge-e2e\s15\legs-raw.txt'
   powershell -NoProfile -ExecutionPolicy Bypass -Command ". .\recipes\s10-win.ps1; if (Test-S10LegState -Leg PP1 -Phase start) { exit 0 } else { exit 2 }"
   "exit $LASTEXITCODE"
   ```
2. Login: `powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\bb-login.ps1; "exit $LASTEXITCODE"` — exit 0
   (`LOGGED IN …` or `SIGNED IN …`, its window closed) → step 3; any other exit → STOP, RETURN (a press is never
   retried).
3. SDK leg: `npm run recipe -- recipes/blackboard/export-grades.ts pp1 --hold` (prints the page's length `<L>`, bytes,
   sha256 `<H>`, the held tab `<T#>`, and `written exports\pp1-<date>.json — <b> bytes, sha256 <H>`).
4. MCP leg: `New-Item -ItemType Directory -Force "$env:TEMP\bridge-e2e\s15\sv" | Out-Null` (the teardown removed it);
   `node --import tsx recipes/s9-actor.ts start pp1 --failures-dir $pf` (the actor's MCP config then carries
   `env: {BRIDGE_FAILURES_DIR: <$pf>}`, which the MCP's failure reports read — `sdk/src/error.ts` `failuresDir`, the
   MCP passes `process.env`; the SDK leg takes no report at all, `failureReports: false`);
   `node --import tsx recipes/s10.ts pp1-plan --length <L>
   --tab <T#>` prints the actor's prompt (the path shown as `<saveTo: …>`; send it with the real path
   `%TEMP%/bridge-e2e/s15/sv/s15v-pp1-mcp.txt` through `s9-actor.ts send pp1 "<prompt>"` from Git Bash);
   `s9-actor.ts end pp1`; `s9-actor.ts extract pp1 --out <file outside the repo>`.
5. Compare: sha256 of the SDK file = of the MCP file = `<H>` (`Get-FileHash … -Algorithm SHA256`; sizes too);
   `node --import tsx recipes/s10.ts scan --mode transcript --file <transcript>` — it reads the `sv` folder's
   `s15v-*.txt` files as the values, so the MCP file (the same bytes as the SDK file when the hashes agree) is the value
   it counts → `value-runs32=0` is PP1's transcript criterion; the scan's other counts (e.g. `scheme://host` of the
   real site) are recorded as counts, not judged as PP1's pass rule.
6. Clean-up: `npm run recipe -- recipes/blackboard/export-grades.ts pp1 --drop-held <T#>`; `npm run recipe --
   recipes/s6.ts close-bb-tab <T#>`. **PP1 never deletes a file it did not write:** delete the one
   `exports\pp1-<date>.json` that step 3 printed as `written …` (and only if its LastWriteTimeUtc ≥ `$legStart`) and the
   `sv` file `s15v-pp1-mcp.txt`; the contents of `$pf` (the leg's own failures folder), then `$pf`; and the PNGs in **this
   actor's own** Claude Code `tool-results\` directory
   (`$HOME\.claude\projects\C--Users-aliev-Projects-chrome-remote-extention\<session_id>\tool-results\`, the
   `session_id` read from the pp1 actor's own `out.jsonl` init line — never another session's directory; only PNGs with
   CreationTimeUtc ≥ `$legStart`). All of them **counted, deleted by full path, never opened, attached, copied or
   printed by name**. The shared `$HOME\.chrome-agent-bridge\failures\` is **only counted** again (`$f1`): a rise
   `$f1 − $f0` is recorded as a finding and **nothing is deleted there**. Record the counts (0 expected each).
   *(Amended 2026-10-25, wave fixer 1 after the verifier's N3: was "delete … any PNG created inside the leg's window in
   `failures\` …", because that folder is shared with other clients.)*
7. End check: as step 1 with `-Phase end` → `LEG PP1 end: … block-list sha256 vs found equal … -> equal`; not equal →
   STOP, RETURN.

Expected text and pass rule: §4.22 PP1 (unchanged).

Ready-to-ask package (as put to the user; answered "G10-3 granted for pp1", #221):

> **What:** redo the Step 8 check S6.3 on your real course "pp1" through the new `saveTo`: read the gradebook export
> once in your logged-in Chrome tab and save it twice — by the SDK and by a headless Claude session using
> `browser_evaluate {saveTo}` — then compare the two files' sha256 with the page's own. **Login:** your Blackboard
> session as it is (if a login is needed, `recipes/bb-login.ps1` presses the one autofilled submit button, as in Step 8).
> **What is read:** the course's gradebook columns and grades (read-only by construction; nothing is written to
> Blackboard). **What is written, where:** `exports/pp1-<date>.json` (gitignored) and one file under
> `%TEMP%\bridge-e2e\s15\sv\`, both deleted after the comparison unless you want them kept; only sizes and hashes go
> into the record. **How long:** ~5 minutes. Reply "G10-3 granted for pp1" to allow it once.

## 8. Record template (`S7-run-record.md`)

```
# Step 10 S7 — Run 15 record (§4.22)

Runner: <model> · Chrome <version> · Node <v> · HEAD <sha> (prep commit <sha>) · wave start <ISO>
PIDs: daemon <p> · http8080 <p> · http8085 <p> · driver windows W <h> E <h> D <h> O <h>
Pin state found: pinned=<b> · keyboard layout <hkl> · Chrome windows at start <n>
Build: daemon/dist/index.js <hash16>… (block 2) · reload exit <c>

(The lines of blocks 1–7 are in `S7.ledger.md` — "Found state" / "Live PIDs" — not here: L1 is the record's first
recorded line, S7.2.)

## Lines (one per observation; L1 = SAFE-0 is the first recorded line)
<UTC time> · <row ID> · <block> · `<observed text, verbatim>` · <PASS | FAIL | RECORD | NOT MEASURED> vs §4.22
L1: … · SAFE-0 · 8 · `ROW SAFE-0 safety …` · …
…

## Outcome tables (written in §4.22 before the run; filled from the lines)
SW-1: d = [<d1>, <d2>, <d3>] ms → <runs to its bound | the event ends the wait | undetermined>
SAVE-PRIM (#217): <not met | MET | corrupt> · SAVE-IDONLY (#217): <not met | MET | not measured>
R15-POP-2 (#211): (a) <class> / <grant> → <reading> · (b) <class> / <grant> → <reading>

## PP1 and RET-1 (granted once for Run 15, #221, widened by #222; after the teardown: PP1, then RET-1)
PP1: `LEG PP1 start: … -> equal` · bb-login exit <c> · SDK leg <L> characters, <b> bytes, sha256 <H> · MCP file <b'> bytes, sha256 <H'> · transcript value-runs32=<n> · PNGs: leg folder <n> (deleted), actor tool-results <n> (deleted), shared failures/ rise <n> (counted only) · exports/sv files deleted <n> · `LEG PP1 end: … -> equal` · <PASS | FAIL | NOT MEASURED> vs §4.22 PP1
RET-1: `LEG RET-1 start: … -> equal` · the script's ROW/CHECK lines verbatim · Chrome running after: <yes | NO> · `LEG RET-1 end: … -> equal` · <PASS | FAIL | NOT MEASURED> vs §4.22 RET-1

## Found state and restore (S7.4)
start (block 10): `FOUND STATE recorded: armed=… evaluate=… count=… lines=… sha256=…`
end (block 33): `STATE …` · `RESTORE safety read-back: … block-list sha256 vs found <equal | DIFFERENT>` · equal: <yes | no>

## STOP lines met (S7.6 with F20; every one is a return in S7.ledger.md)
<none | each STOP line verbatim, the block, the restore read-back, the ledger entry>

## Counts (S7.6; counts only)
daemon.log: `SCAN …` · console: `SCAN …` · transcripts: `SCAN …` per actor · S7-run-raw.txt: `SCAN …`

## Set-up fixes (helper changes between rows, before the next row's first observation; none after a STOP)
- none | …
```
