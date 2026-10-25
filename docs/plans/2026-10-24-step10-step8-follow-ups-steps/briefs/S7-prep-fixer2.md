# S7 prep fixer brief, round 2 (fresh agent; Step 10, stage S7 — Run 15 prep)

The general rules are `briefs/S7-prep-fixer1.md` (read it in full: no Chrome, no port 9234, no `claude -p`, no
headless Chrome, no reload, no `npm run build`, no commit; Write/Edit tools for any code with backslashes; the
verbatim blocks at its end bind). You are a level-2 FIXER: you must NOT spawn agents; finish in one go.

## Context

Round 1's fixer report is `S7-prep-fixer1.md`; the verifier's round-1 re-check (end of `S7-prep-verifier.md`) FAILs
on one item only, **W1 MAJOR**: `Stop-S15Tree` / `Stop-S15Background` kill everything `Get-ProcTree`
(`recipes/s9-win.ps1:1152`) returns, and `Get-ProcTree` follows `ParentProcessId` with no creation-time check, so a
reused PID's orphans (even the user's Chrome after its launcher exited) count as children, and `Test-SafeToKill` calls
them safe. A first round-2 fixer started this fix and **hung** (no report). Its partial edits are in the tree
(mtimes 06:29–06:30): `recipes/s10-r15.ps1` (lines ~137, ~219–227: `SKIP <pid> reused`), `recipes/s10-win.ps1`
(`Get-S10Born`), `recipes/s10-rules.ts`, `recipes/test/s10-rules.test.ts`. **First** read them against the items
below (`git diff` is not available — the files are untracked; compare with the descriptions in `S7-prep-fixer1.md` and
the verifier report) and finish or correct them; do not assume they are complete or right. Its last words were "One
stand-in survived step 3" during a no-Chrome dry run of the timeout path — find out why a stand-in could survive (a
real gap in the kill path is a finding to fix, not to hide).

## Items (all must hold)

1. A process is a descendant only if its CreationDate is no earlier than its parent's (walk level by level), in s10
   code only (do not change `s9-win.ps1`; write an s10 copy if needed).
2. The wave's kill paths never kill `chrome.exe`. The SAVE-IDONLY headless Chrome is ended by `Browser.close` and then,
   if still alive, only by its own recorded PIDs whose CreationDate is ≥ the wave's launch stamp and whose command line
   carries the temp `--user-data-dir` under `%TEMP%\bridge-e2e\s15`.
3. Every kill re-checks the PID's CreationDate against the value recorded when the wave identified it; a mismatch → not
   killed, printed `SKIP <pid> reused`.
4. A rule test of the pure part (the descendant filter; the chrome/user-data-dir rule) that fails without the fix —
   show it failing on a mutant, then restored.
5. State save-ttl's ~25 s slack in the sheet (a slow start → STOP, the safe direction).

## How you work (binding — the previous fixer hung)

- Run every command that could take long or hang (vitest, tsc, any PowerShell dry run, anything starting a process)
  **in the background with a bounded timeout** (e.g. `timeout 600 …` in Git Bash, or a PowerShell job you
  `Wait-Job -Timeout` and then `Stop-Job`), never a foreground command that can hang. Dry-run stand-ins are ones you
  start yourself, identified by PID and creation time; at the end list `node`/`powershell`/`python`/`ping`/`timeout`
  processes you started and confirm none survives (never touch chrome.exe, node PID 22152, or the user's
  powershell/claude sessions).
- Keep your report current as you go: append a "Round 2 (fresh fixer)" section to `S7-prep-fixer1.md` at the start and
  update it after each item.

## Checks before you return

tsc s10 and s9 0; `npm run typecheck` 0; `npm test` = 3227 + n (per file, nothing removed); the four s10 PowerShell
scripts parse with 0 errors; a no-Chrome dry run of the per-block timeout path with stand-ins that leaves nothing
running; STOP sentence still byte-identical in sheet and runner brief; §4.22 still a pure addition. Return ≤ 10 lines
with the final commit file list.
