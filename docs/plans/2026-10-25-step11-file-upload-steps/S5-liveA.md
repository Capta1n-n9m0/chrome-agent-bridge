# S5-liveA step report — Run 16, liveA (both runs)

Step 11 (D3 file upload), stage S5 (Run 16, live), slice S5-liveA. Risk: standard (the user's real Chrome).
Step agent 2: Opus 5.5, 2026-10-26 04:26Z → 04:52Z, resuming the slice from its ledger after the first step agent
ended its turn before its runner handed back (#281, #225). Numbers come from `S5-run-record.md`, the reports named
below, and the commands they quote.

## 1. Verdict

**ESCALATE** (the slice's rows are all run and recorded; the verifier's verdict is **FAIL** on two MAJOR
bookkeeping/coverage findings that no fix round can cure without re-running completed rows — they need the session
agent's ruling). No row verdict is wrong (verifier §2).

## 2. Outputs

- `e3152f9` — the first run's record, framing output, runner report and ledger, unedited (#281 (a)).
- `ddc3955` — the set-up fixes between rows (#281 (b), (c)): the toolbar title read on its first line only
  (`recipes/s9-win.ps1` `Get-S9FirstLine`), `recipes/s11-evidence.ts` (counts by #277's fixture rule), SW-2's
  placement of the wave's own window clear of the taskbars plus per-occluder diagnostic lines (guard verdict
  unchanged). `npm test` 3784 → 3803 (153 files; 19 new tests in `recipes/test/s11-liveA-fixes.test.ts`), re-run by
  the verifier; all recipes tsconfigs exit 0.
- The second run's record lines (appended to `S5-run-record.md` from line 180), `S5-liveA-framing2.txt`,
  `S5-liveA-daemon.txt`, `S5-liveA-occluders.txt`, and the reports `S5-liveA-fixer.md`, `S5-liveA-runner2.md`,
  `S5-liveA-verifier.md`, this report and the ledger — committed together after this report by a committer.

## 3. liveA tally (both runs)

| Row | Run | Verdict | Reason (one line) |
|---|---|---|---|
| UP-L1 | 1 | PASS | build = sha256 of `daemon/dist/index.js`; both raw calls refused as pre-written; FOUNDCHECK root/outside `not` |
| UP-0 | 1 | PASS | found state armed, JavaScript on, both boxes 0 lines; file-URL toggle read **on**, nothing pressed |
| UP-OPT | 1 | FAIL | `o2-follows`: O2 took 6061 ms (no conflict note); the other 8 clauses PASS; never re-run (#281) |
| UP-FA | 1 | RECORD | not run — the toggle is on |
| UP-6 | 1 | FAIL | the banner was seen during the refusals (all 5 checks); its other clauses are not recorded (verifier F3) |
| UP-7 | 1 | PASS | a/b/c: the disarmed, blocked and folder-removed refusals exact, page untouched, state read back equal per leg |
| SAVE-REFUSE-R | 1 | PASS | SDK leg: 4 exact + control prefixed + no files; MCP leg: tool search off, 4 contained and unprefixed, no files |
| SW-2 | 1 → 2 | PASS (measured) | run 1 stopped at the occluder guard before trial 0; run 2 measured 1 + 3 trials (see §4) |
| UP-RESTORE | 1 → 2 | PASS (run 2) | run 1's stop-path restore: stored and daemon equal, title check failed (helper defect); run 2: all four equal |
| UP-LOGS | 2 | PASS for what was scanned; console part NOT MEASURED for run 1's rows | console, daemon and actors all 0; the console capture covers only run 2 (verifier F2) |

## 4. SW-2, read off its table

Run 2, record lines 180–192: `PLACE W` cut W to the work area clear of the taskbars; `GUARD occluders total=0
foreign=0`. Warm-up (trial 0) recorded and excluded, d=770 ms. Trials 1–3: d=[-24, 95, 68] ms, `measured 3/3
trials` → **"the event ends the wait"** (d ≤ 300 ms in 3/3), the carried input closes; **no S5b**. Visibility log
RECORD: w=8, sw=8 events (4 trials). S5.7 holds (verifier).

## 5. Restore read-back

- Run 1 (stop procedure, 04:20:37–41Z): stored page equal, `daemon.status` equal, block list and Upload folders 0
  lines `hash=equal`; `title armed false` → `RESTORE FAILED` — the title check compared the toolbar name's two lines
  against a one-line constant (recipes/CLAUDE.md gotcha; #281).
- Run 2 UP-RESTORE (04:39:46–56Z), against run 1's UP-0 found record (booleans, counts, hashes): press pair off/on
  read by title; `RESTORE armed=equal evaluate=equal blocklist lines=0 hash=equal uploadfolders lines=0 hash=equal`,
  daemon equal, `title armed true`; found texts deleted after the match. Only the public empty-text hash is printed.
  The safety state is as found. The file-URL toggle was never pressed (G11-3; found ON).

## 6. STOP lines and their returns (S5.5)

| STOP line (where) | Return |
|---|---|
| `python was not found` (framing 2, 04:18:20Z, preflight) | **none made**: the first runner tore down and relaunched from Git Bash (runner §2); back-filled in the ledger 04:50Z; nothing had started (verifier F1) |
| `a previous wave's globals exist` (framing 6, 04:18:35Z, preflight) | **none made**, same as above |
| `GUARD 3 foreign occluder(s) above window … (SW-2)` (record 143) | the stop procedure ran; the runner returned at 04:20:42Z (ledger) |
| `the toolbar title does not read armed; the press pair is not sent` (record 148) | same return |
| `RESTORE FAILED …` (record 171), `the restore failed … the wave is over` (172), `the wave ended …` (179) | same return; ruled by #281 |
| run 2: none (8 blocks, all exit 0) | — |

## 7. SW-2's occluder diagnosis (`S5-liveA-occluders.txt`)

Both monitors 1920×1080; the taskbars are auto-hidden, their windows at y 1078..1126 (2 px inside each monitor).
Run 1's W was maximized on monitor 1 (frame [1912,-8,3848,1088]): `Shell_SecondaryTrayWnd` and `Shell_TrayWnd`
(explorer) were both overlapped by **the wave's own W's frame** (the second by its 8 px overhang). The
`Chrome_WidgetWin_1` occluder was **not identified**: run 1's guard printed class and process only, and no topmost
Chrome window existed at diagnosis time; candidates are the options page's Chrome-owned bubble after UP-7's toggles
(recipes/CLAUDE.md), a wave window, or a user window. Fix: placement of W only; the guard's verdict unchanged (no
exemption, no read areas). Run 2's guard saw 0 occluders, with W resized and no options window open at the time
(verifier F6 note).

## 8. Verifier findings (`S5-liveA-verifier.md`, Opus 5.5, 04:42:36Z → 04:48:50Z) — FAIL

- **MAJOR F1** — S5.5: two preflight STOPs without a return (§6). Ledger back-filled; needs a ruling.
- **MAJOR F2** — S5.6 coverage: the worker console was captured only in run 2 (one disarm event in it vs two in the
  daemon log), so UP-L1, UP-6, UP-7 and SAVE-REFUSE-R were never console-scanned; record UP-LOGS (console) NOT
  MEASURED for them. The daemon and actor scans cover both runs.
- **MINOR F3** — `recipes/s11.ts:407`: a seen banner replaces every UP-6 step's verdict, so the refusal clauses are
  not shown; for liveB print the clause verdicts, then the banner verdict.
- **MINOR F4** — `scanText`/`evidenceCounts` count every literal `://`, so the helpers' own `SCAN …: ://=n` lines
  count as other (3 in the record, verified as the only cause; fails closed).
- **NIT F5** — `recipes/s9-win.ps1:408` CLICK print still prints the name's second line (splits record lines).
- **NIT F6** — the run-2 order skipped preflight, files, reload, UP-0; nothing weakened except F2.
- **NIT N1, N3** — S5.2's first line is UP-L1's found read; the record carries verdicts, not observed texts (S5.3
  verified through the judge's 22 constants: 0 differ from §4.23).
- Holds: S5.1, S5.2 (same daemon build id in both runs, no product diff since `0abd25e`), S5.3, S5.4, S5.7; the
  set-up fixes loosen no guard and change no pass rule; new tests fail on the pre-fix file.

## 9. Agents

| Agent | Model, effort | UTC |
|---|---|---|
| Step agent 1 | Opus 5.5 | 04:17Z → ended its turn ~04:18Z (runner's hand-back went past it) |
| Live runner 1 | Sonnet 5.5, medium | 04:18:20Z → 04:20:42Z (wave); report ~04:21Z |
| Step agent 2 (this) | Opus 5.5 | 04:26Z → 04:52Z |
| Fixer | Sonnet 5.5, medium | 04:26Z → 04:37Z |
| Live runner 2 | Sonnet 5.5, medium | 04:38Z → 04:41Z (blocks 04:38:37Z → 04:40:05Z) |
| Verifier | Opus 5.5 | 04:42:36Z → 04:48:50Z |

## 10. Deviations

- The brief's "`-Block teardown` first" was not possible: teardown refuses while the globals' `S16Changed` is true
  (no UP-RESTORE had passed), and its stop path would have restored against closed windows. Run 2 ran servers →
  window → setup → console → sw-2 → up-restore → up-logs → teardown, each its own block; UP-RESTORE compared with run
  1's UP-0 found record. The verifier found nothing weakened but the console coverage (F2).
- Runner 2 ran each block in the foreground (each under 40 s) instead of background markers; every hand-back came
  back to this agent.
- The evidence commit goes ahead although `s11-evidence.ts` exits 2 on the record: its 3 "other" hits are the
  literal `://=` of the three SCAN lines (F4; verified by the verifier's and my own grep).
- No fix round after the FAIL: F1 is a bookkeeping fact and F2 a coverage gap; curing either needs a ruling or the
  re-run of completed rows, which the brief forbids.

## 11. Proposed decisions

### 2026-10-26 · S5-liveA: the two un-returned preflight STOPs stand recorded; no re-run
**Decided:** the first runner's two preflight STOPs (python not on the PowerShell tool's PATH; the stale globals)
are recorded as returns not made, with no effect (nothing had started). **Why:** both came before any state change,
and the relaunch's preflight passed. **Instead of:** re-running liveA. **Revisit if:** liveB's runner meets a STOP
it does not return on. **By:** Claude (proposed)

### 2026-10-26 · S5-liveA: UP-LOGS (console) is NOT MEASURED for the first run's rows
**Decided:** liveA's UP-LOGS covers the daemon log and actor results for both runs and the worker console for run 2
only; the console scan of UP-L1, UP-6, UP-7 and SAVE-REFUSE-R is NOT MEASURED. Whether liveB's UP-LOGS covers the
same refusal paths, or SAVE-REFUSE-R's `saveTo` refusals need a console-covered re-measurement row, is for the
session agent. **Why:** verifier F2; a NOT MEASURED never counts as a pass. **Instead of:** reporting UP-LOGS PASS
for the slice. **Revisit if:** S5-record finds the console capture of another slice covering those paths. **By:**
Claude (proposed)

### 2026-10-26 · Helper fixes for liveB before it runs (F3, F4, F5)
**Decided (proposed):** a set-up fixer before liveB: UP-6B and UP-6-style judges print each clause verdict before
the banner verdict; the scanners count only scheme-plus-host matches (or the SCAN line prints `urls=`); the CLICK
print uses the first line. **Why:** F3 hides refusal clauses; F4 blocks evidence commits falsely; F5 splits lines.
**Instead of:** carrying them as notes. **Revisit if:** the session agent prefers to leave liveB's helpers as built.
**By:** Claude (proposed; F3's change touches a judge's output, not its pass rule)

## 12. Findings (runtime facts)

- Chrome 156's toolbar button name has the second line even when read through the action button's UIA `Name`, and
  the s9 title helpers must read the first line (now fixed; the gotcha in recipes/CLAUDE.md already states it).
- A maximized Chrome window's frame overhangs its monitor by 8 px and meets an auto-hidden taskbar's 2 px strip on
  both monitors: an occluder guard over a maximized wave window stops on the taskbars (`S5-liveA-occluders.txt`).
- The daemon exits after 600 s idle between a STOP and a re-run (`S5-liveA-daemon.txt` 04:30:41Z); the next client
  spawned it with the same build id.

## 13. Handoff

- No wave PIDs remain; globals removed; 8081/8084 free. The daemon (PID 26292) may still hold 9234 until idle exit.
  A python.exe (PID 22096, stdin script, parent bash, started 04:26:54Z) and node 22152 are not this slice's.
- `%TEMP%\bridge-e2e\s11\` keeps `found.json` (booleans, counts, hashes), `opt-obs.json`, `console.txt` outside
  the repo.
- liveB next: the toggle was found ON (G11-3 not needed); the proposed helper fixes above come first if ruled.
