# FE — wave sheet (Step 8 stage FE, live part: focus emulation for trusted input)

Written 2026-10-23 by the FE builder, before any FE build was loaded and before any FE row ran (exit
check FE.4: the rows and this sheet are committed before the main-tree build). Rows, expected text and
PASS rules: `docs/e2e-test-plan.md` §4.17 (decisions.md #71, #78, #85 item 3). The outcome is read only
by the table there (`npx tsx recipes/fe.ts verdict` applies it); nothing below changes a row's text or
rule after step 2 starts. Integrity floor and forbidden fixes: `briefs/common.md`.

Standing rules (from Step 7's waves, unchanged): the driver runs every step itself (#33); the driver is
not a bridge client (no bridge MCP in the driver's session); evidence shows fixture pages only (B2);
no DevTools window focused during a row (B3); the driver's window uncovered (B4); kill only identified
PIDs after `Test-SafeToKill` prints `safe: …`; Chrome is never restarted or quit here; the user's own
windows and tabs are never named, captured, typed into or closed — `listTabs` data about them is
compared by handle and window id only and never printed.

## Set-up (Windows PowerShell 5.1, repo root)

```powershell
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$env:Path = "$env:LOCALAPPDATA\Author Software\nvm\.nodejs;$env:Path"
# the §1 item 8 helpers (Get-BridgeLog, Get-BridgeDaemon, Get-DaemonBuild, Get-DriverChain,
# Get-ProcTree, Test-SafeToKill) — paste the block from docs/e2e-test-plan.md §1 item 8
. .\recipes\t5-win.ps1                       # Open-T5Window, Set-T5Topmost, Set-T5Foreground, Get-T5Foreground, Close-T5Window
$env:FE_OUT = "$env:TEMP\bridge-e2e\fe-run1"  # a directory that does not exist yet (one per run)
Test-Path $env:FE_OUT                        # must print False
$U = 'http://localhost:8080/e2e-playground.html?t5='
function FE { npx tsx recipes/fe.ts @args; "exit $LASTEXITCODE" }
function Start-FECapture([long]$H, [string]$Name, [int]$Seconds) {
  Start-Process -PassThru -WindowStyle Hidden -FilePath powershell -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', '.\recipes\fe-win.ps1', '-Hwnd', $H, '-Seconds', $Seconds, '-IntervalMs', '50', '-Csv', "$env:FE_OUT\frames-$Name.csv", '-StopFile', "$env:FE_OUT\stop-$Name"
}
```
(`-WindowStyle Hidden`, never `-NoNewWindow`: CLAUDE.md, MUX-6. `$env:FE_OUT` has no spaces, so
PowerShell 5.1's `-ArgumentList` splitting does not bite.)

## Order of work

0. **Pre-flight [SH]** — record each line:
   `git log --oneline -3` (HEAD is the FE commit that holds this sheet and §4.17, or a later commit with
   no extension/daemon change); `git status --short -- extension daemon shared sdk mcp` → nothing (the
   build is of committed code, with no other stage's work in flight); `Get-BridgeDaemon` (none, or the
   one ours); `Test-Path Env:BRIDGE_TOKEN` → `False`; `git check-ignore bridge.token` → `bridge.token`;
   the fixture server (`$HOME\miniconda3\python.exe -I -m http.server 8080 --bind 127.0.0.1 --directory
   test-fixtures`, hidden, stderr to `$env:TEMP\bridge-e2e\http8080.log`) answering `200`;
   `npx tsc --noEmit -p recipes/tsconfig.fe.json` → exit 0; `FE selftest` → `SELFTEST PASS — 79/79 checks
   as expected`, `exit 0` (the rules' dry run).
1. **Build [SH]** — `npm run build` in the main tree (exit 0); `Get-DaemonBuild` (record the sha256).
2. **Reload [SH]** — `powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\reload-extension.ps1;
   $LASTEXITCODE` → **`0` — the run's first recorded line** (FE.5). Anything else ⇒ **stop and ask the
   user** (integrity floor); no row runs.
3. **Driver window [UI]** — `$Wf = Open-T5Window "${U}fe-human"`; if its width is under 800 px,
   `Move-T5Window $Wf.Hwnd 0 0 1280 900`; `Set-T5Topmost $Wf.Hwnd`; `Set-T5Foreground $Wf.Hwnd` → `True`;
   `npx tsx recipes/t5.ts find --current` → `<T#> fixture` (B1). Repeat the B1 check before every
   command below; if it prints `not a fixture page`, `Set-T5Foreground $Wf.Hwnd` and check again.
4. **FE-0 [SH]** — `FE check`. `FE-0 PASS` ⇒ go on. `FE-0 FAIL` ⇒ not an outcome: run step 2 again
   (exit `0` required) and `FE check` once more; a second `FE-0 FAIL` ⇒ STOP and escalate.
5. **FE-5 first [SH]** — `FE control --phase first`.
6. **Positive control (FE-PC) [SH]** —
   `$c = Start-FECapture $Wf.Hwnd positive 30`; wait 3 s; `FE positive`; wait until `$c.HasExited`
   (≤ 30 s); `FE frames "$env:FE_OUT\frames-positive.csv" --for positive`.
   Either part FAIL ⇒ recorded; **STOP and escalate** (§4.17: FE-4's clause is not discriminating /
   void). No FE-1…FE-3.
7. **The block FE-1, FE-2, FE-3 under one capture loop [SH]** —
   `Set-T5Foreground $Wf.Hwnd` → `True`; `$c = Start-FECapture $Wf.Hwnd block 900`; wait 3 s;
   `Get-T5Foreground` (record: the `Hwnd` must be `$Wf.Hwnd`, else `Set-T5Foreground` once more and
   record both); then, in this shell, with nothing else started in between (no new window, no other
   program): B1, `FE fe1`; B1, `FE fe2`; B1, `FE fe3`; then
   `New-Item -ItemType File "$env:FE_OUT\stop-block" | Out-Null`; wait until `$c.HasExited`;
   `FE frames "$env:FE_OUT\frames-block.csv" --for block`.
   A `VOID` ⇒ recorded; STOP and escalate (the window clause cannot be judged). Any foreground change in
   the span is an FE-4 FAIL whatever caused it (pre-registered; never re-run to remove it).
8. **FE-5 last [SH]** — B1, `FE control --phase last`.
9. **FE-3c (observation) [SH]** — B1, `FE fe3 --control`.
10. **Verdict [SH]** — `FE verdict`. Its last line is the outcome (or `STOP — …` / `INCOMPLETE — …`,
    which are not outcomes). The session agent records "The background-input policy" from it (FE.6).
11. **Close-down [SH]** — `npx tsx recipes/t5.ts cleanup` (closes any unheld `?t5=` tab a crashed trial
    left); `Set-T5Topmost $Wf.Hwnd -Off`; `Close-T5Window $Wf.Hwnd`; stop the fixture server; stop the
    daemon only after `Test-SafeToKill <pid>` prints `safe: …`; log hygiene on the FE part of
    `daemon.log` (§4.12's block: `://`, the token, withheld → `0`, `0`, `0`), attached as
    `FE-daemon-log.txt`; copy `$env:FE_OUT\fe-results.jsonl` → `FE-run-results.txt`, the two CSVs →
    `FE-frames-positive.txt`, `FE-frames-block.txt` (no URL, title or image in them; check with
    `Select-String -SimpleMatch '://'` → count `0` before attaching).
12. **Record** — `FE-run-record.md` (skeleton below): every command and the text it printed, verbatim;
    a fresh verifier re-reads it against §4.17 and re-runs `FE verdict --results FE-run-results.txt
    --csv-positive FE-frames-positive.txt --csv-block FE-frames-block.txt` on the attached copies.

**Re-runs.** A command that exits `2` (set-up, `FAILED — Error: SET-UP: …`) or `3` (the human's tab was
not visible) measured nothing for the trial it stopped in: fix the set-up and run the command again.
Every recorded trial counts — a re-run **adds** trials, it never replaces them — and the verdict uses
all of them (no best-of-three). A trial command that prints `FAILED — …` after a call (exit 1) is
copied into the record as is and listed for the verifier. A row is never re-run under a looser rule,
and no expected text or rule changes after step 2.

## What each row records

| Step | Command | Copied into the record |
|---|---|---|
| 2 | `reload-extension.ps1` | its output and `$LASTEXITCODE` |
| 4 | `FE check` | all `fe-check:` lines; `Get-DaemonBuild` |
| 5, 8 | `FE control --phase first\|last` | all `fe-5:` lines (6 trials × 6 lines + verdict lines + the block line) |
| 6 | `FE positive`; `FE frames … --for positive` | all `fe-positive:` and `fe-frames:` lines |
| 7 | `Get-T5Foreground`; `FE fe1`, `fe2`, `fe3`; `FE frames … --for block` | the foreground line; all `fe-1:`/`fe-2:`/`fe-3:` lines; the `fe-frames:` lines |
| 9 | `FE fe3 --control` | all `fe-3c:` lines |
| 10 | `FE verdict` | all `fe-verdict:` lines |
| 11 | hygiene counts | the three counts and the attached files' names |

## Log hygiene

Before attaching anything: copy `daemon.log` (the FE part, from the reload's `extension resync` line
to the end) to `$env:TEMP\bridge-e2e\fe-daemon.log`, then count — never print — `://`, the token (read
into a variable from `bridge.token`, then `Remove-Variable`) and `[line withheld:` in the copy, as §4.12
does. Expected `0`, `0`, `0`; a non-zero first or second count ⇒ the log is not attached. The JSONL and
CSV copies get the `://` count too.

## FE-run-record.md skeleton

```markdown
# FE — run record (Step 8 stage FE: focus emulation for trusted input), <date>

Evidence for the FE rows of `docs/e2e-test-plan.md` §4.17. Each block is the command and the text it
printed, copied from the driver's shell. Times UTC. Rows and rules committed in `<commit>` before the
build was loaded (FE.4). Attached: `FE-daemon-log.txt` (<n> lines; hygiene <a>/<b>/<c>),
`FE-run-results.txt`, `FE-frames-positive.txt`, `FE-frames-block.txt`. No images were kept.

## Pre-flight (step 0) — <time>
<git log, git status, daemon, BRIDGE_TOKEN, check-ignore, fixture 200, tsc exit, selftest last line>

## Build (step 1)
<npm run build exit; Get-DaemonBuild>

## Reload (step 2) — the first recorded line
<reload-extension.ps1 output; exit 0>

## Driver window (step 3)
<Open-T5Window hwnd; Set-T5Foreground True; t5.ts find --current>

## FE-0 (step 4)
<fe-check lines>  → FE-0 PASS / FAIL (and the re-check, if any)

## FE-5 first (step 5)
<fe-5 lines>  → control holds / VOID

## FE-PC positive control (step 6)
<fe-positive lines; fe-frames lines>  → page PASS/FAIL; capture PASS/FAIL

## FE-1, FE-2, FE-3 and the block capture (step 7)
<Get-T5Foreground; fe-1, fe-2, fe-3 lines; fe-frames lines>

## FE-5 last (step 8)
<fe-5 lines>

## FE-3c observation (step 9)
<fe-3c lines>

## Verdict (step 10)
<fe-verdict lines>  → OUTCOME (A) / (B) / (C)

## Observations (not judged)
<the target page's visibility per trial (the `observation —` lines); FE-3's focus-step answers; the
call times; anything else seen>

## Close-down and hygiene (step 11)
<cleanup lines; Test-SafeToKill; counts 0/0/0; attached files>

## Deviations and set-up fixes
<each with its diff or reason; "none" if none>
```
