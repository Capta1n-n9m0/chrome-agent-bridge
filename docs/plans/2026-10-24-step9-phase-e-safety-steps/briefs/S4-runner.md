# S4 live runner brief (Step 9, stage S4 — Run 13, the live wave)

Repo C:\Users\aliev\Projects\chrome-remote-extention (chrome-agent-bridge). Shell: Git Bash on Windows;
Windows PowerShell 5.1 for the UIA helpers. Model: Opus 5.5. You are a level-2 agent: you must NOT spawn
agents (headless `claude -p` actor sessions run by `recipes/s9-actor.ts` are the wave's actors and are
allowed). Finish in one go: run the wave start to end, then return.

Read first, in full: `CLAUDE.md` (its "Runtime gotchas", especially "Driving Chrome from the outside (live
waves, Windows)" and the Step 7/8 bullets, are measured facts and bind); `docs/plans/2026-10-24-step9-phase-e-
safety-steps/briefs/common.md` (part of this brief: LESSONS, INTEGRITY FLOOR, STOP rules, forbidden fixes);
`docs/e2e-test-plan.md` §1 items 8–9 and §4.20 (the SAFE rows — the expected text is fixed; you never edit
it); `docs/plans/2026-10-24-step9-phase-e-safety-steps/S4-wave-sheet.md` (the run order and commands — follow
it block by block); `S4-prep-builder.md`, `S4-prep-fixer1.md` (helper notes, untested-live guesses);
`S4.ledger.md`.

## Grant and limits (from the user's standing grant: decisions.md #33, #64/#65; gates G9-1, G9-2)

You drive the user's REAL Chrome profile: build, `recipes/reload-extension.ps1`, a Chrome window YOU open,
UIA presses of the toolbar button, the shortcut and the options page in that window, SDK scripts and headless
actors. Binding:
- Never use the user's own tabs or windows; every UIA action targets the driver's own HWND(s) (the helpers
  check identity). Never restart Chrome (needs a fresh grant → STOP and return).
- Reload: exit 0; on exit 2 one re-run; any other result or a second non-zero → STOP (restore first if the
  state was changed) and return.
- Pinning (G9-2): the helper may pin by UIA; if pinning fails → STOP and return (the step agent asks the user).
- The found-state guard (block 8): anything other than armed, JavaScript on, empty list → STOP before any toggle.
- **Any stop or helper throw after the first state change: run `Restore-S9All` and record its read-back
  before returning.** A failed restore → record it, STOP, return at once with "RESTORE FAILED" as line 1.
- Kill only PIDs `Test-SafeToKill` calls safe, or ones you started and identified. Node PID 22152 is an
  unrelated Codex host: never touch it. Stop the daemon you started at the end by `daemon.shutdown` (or its
  identified PID). Fixture/redirect servers: your own PIDs.
- Never print or write the token, a block-list pattern from a live read, a URL or title of the user's tabs.
  Evidence shows only fixture pages. Logs and transcripts are grepped BY COUNT (`://`, the token, `localhost:8081`,
  `:8083`, `bank.example`) before any of their lines enter the repo; transcripts stay in the scratchpad
  `C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\1faae82b-fe51-435e-85fa-a8f40f9e23c3\scratchpad\`;
  only quoted lines go into the record. No screenshot is committed (PNGs stay outside the repo).
- A failed row is RECORDED as failed with the observed text verbatim and the wave continues (unless it is a
  STOP). Never re-run a failed row to make it pass; never edit a row's expected text; never change product
  code; never exempt anything from the gate. A helper bug (your tooling, not the product) may be fixed in
  `recipes/` mid-wave only if the row has not produced an observation yet; note it in the record as a
  deviation with the diff summary.
- Port 9234: only the daemon spawned by your first SDK client may hold it; any other holder → STOP.
- Node: `export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"` first in every Bash call
  running node/npm/npx. Python: `$HOME\miniconda3\python.exe`. Long jobs: Bash calls have a 10-min cap —
  start servers detached (as the sheet says), never a foreground sleep loop beyond a row's own bounded waits.

## Pre-flight

`git status` (no modified tracked files; untracked docs in the steps dir are fine), `git log` includes the
prep commits (049a72a rows, e91e437 helpers, ba073d6 and the fixer-r2 commit). Process listing: no
`mcp/dist/index.js` descends from this session; no node holding 9234. Record the pre-build state (pre-Step-9
extension; no safety controls) as the record's header.

## Record

Write `docs/plans/2026-10-24-step9-phase-e-safety-steps/S4-run-record.md` AS YOU GO (template in the wave
sheet): header (date, HEAD, build ids, pre-build state), then line 1 = the reload script's exit 0, line 2 =
SAFE-0 (S4.2), then every row: UTC time · row ID · observed text verbatim · PASS / FAIL / NOT MEASURED /
RECORD against §4.20. The found state and the final read-back by `armed`, `evaluate`, `count`, `sha256`
only. Keep `S4.ledger.md`'s "Live PIDs" and "Found state" sections current (daemon, servers, actor sessions,
driver HWNDs, pin state found, layout found).

At the end: the daemon log section new since your mark copied to `S4-daemon-log.txt` only after its count
grep (paste the counts into the record; if any forbidden count is non-zero, do NOT copy it — record the
counts and STOP-report it); all your PIDs stopped; driver windows closed; pin state and layout as found.
Do not commit (the step agent commits after the live verifier).

## Return

≤ 20 lines: rows PASS / FAIL / NOT MEASURED / RECORD counts with the failed IDs; the found state and the
read-back (equal? hash equal?); log greps by count; PIDs started and stopped; deviations; anything that needs
the user (e.g. `/mcp` in their interactive Claude sessions, since the daemon build changed); the record path.
