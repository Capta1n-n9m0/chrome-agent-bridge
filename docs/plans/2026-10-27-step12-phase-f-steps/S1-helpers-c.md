# S1-helpers-c — Run 18's block runner (step report)

Step agent: Claude Opus 5.5, effort medium. Risk: low. The builder, the two fixers and the committer ran on Sonnet 5.5
at medium effort. The three verifiers ran on Opus 5.5 at medium effort. Sonnet wrote all the code. Nothing in this
slice drove Chrome or a daemon, or used port 9234.

## 1. Verdict
DONE. Verifier 3 gave **PASS-with-notes** after two fix rounds, so one of the three rounds is left.

## 2. Outputs
- **Commit:** the committer makes it after the verdict. The hash is in the step agent's return.
- **Files (new):**

  | File | Lines | What it holds |
  |---|---|---|
  | `recipes/s12-r18.ps1` | 101 | Entry: `-Block liveA18 \| liveB18 \| plan \| teardown`, `-Att <n>` |
  | `recipes/s12-r18-lib.ps1` | 305 | Order lists, sequencer, row bodies, STOP/restore, banner rule, R18-0 list check |
  | `recipes/test/s12-r18.test.ts` | 414 | Stubbed PowerShell scenarios |
  | `recipes/test/s12-r18-static.test.ts` | 159 | Static ties to §4.26 and to the helper entry points |

- **Reports:** `S1-helpers-c-builder.md`, `-verifier.md` (+ `-evidence.txt`), `-fixer.md`, `-verifier2.md` (+ evidence),
  `-fixer2.md`, `-verifier3.md` (+ evidence), and this file.
- **Counts:** the numbers below are verifier 3's.
  - `npx vitest run recipes/test`: 1131 → 1209. The 1131 is the HEAD set, re-derived by verifier 1.
  - `npm test`: 5008 passed, 210 files, on the first run.
  - All seven `recipes/tsconfig*.json`, `npm run typecheck` and `npm run build` exit 0.
  - Both `.ps1` files parse with 0 errors, are ASCII, and contain no `SilentlyContinue`, `&&` or `??`.
- **Size (#344 (4)):** code 351 of the 400 cap, tests 551 of 600. Both counts are non-blank, non-comment lines.
- **Helper entry points the runner calls:** a static test checks that each one exists.
  - s12-win.ps1: `Assert-S12CaptureFree`, `Save-S12Console`, `Wait-S12Idle`, `Test-S12Idle`, `Invoke-S12BannerLeg`,
    `Invoke-S12Opt` (made at load), `Invoke-S12RaceA`, `Invoke-S12DevtRow`, `Assert-S12Patched`, `Set-S12AttachStamp`.
  - s11b-win.ps1: `Invoke-S11bSamplerPasses`, `Get-S11bOptObs`, `Get-S11bStopCause`.
  - s11-win.ps1: `Read-S11FileAccess`, `Restore-S11Safety`, `Test-S11Own`, `Set-S11Front`, `Get-S11Summary`,
    `Close-S11Window`.
  - s9-win.ps1: `Get-S9ById`, `Get-S9Options`, `Test-S9Live`, `Set-S9Foreground`, `Call9`.
  - Run 17's functions and blocks (`s11b-r17.ps1`), Run 17b's `r17b-0` block, `Start-R17bWatch`, `Read-R17bWatch` and
    `Set-S17Raw`.
  - Subcommands `s11 foundcheck|setup|saverefuse-sdk|saverefuse-mcp` and
    `s11b raw-l1|bannerctl|bannerctl-judge|leg-line|clean-console|console-line|scan18|rows18|up6|raw|race|devt`.

## 3. Verifier verdicts
- **Verifier 1: FAIL.**
  - MAJOR F1: the entry blocks were untested, and seven mutants survived, the missing IDLE guard among them.
  - MAJOR F2: banner rows printed FAIL where §4.26 rules NOT MEASURED.
  - MAJOR F3: `s11 setup` attached the debugger without writing a stamp, so liveB could record a false `idle-ms`.
  - MINOR F4–F10 and NITs.
  - The brief's three mutants were already red: a skipped restore on throw, a skipped R18-0 list check, a row out of
    order.
- **Fix round 1:** the step agent ruled on each finding. The rulings were:
  - The row bodies move into the lib and get tests.
  - The runner is "the helper" that applies the per-slice banner rule.
  - Every slice and every attempt gets a fresh `S11_OUT`.
  - The new `-Att` parameter, and a STOP when the record already holds text.
  - `rows18` runs at the end of R18-LOGS.
  - The `EVIDENCE` key.
  - The R18-UP-L1 and R18-SAVE-REFUSE `ROW` lines print after R18-LOGS.
  - The globals guard comes before `Load-S16`.
- **Verifier 2: FAIL.**
  - MAJOR G1: the F2 rule never fired on the lines the helpers really print, and the test fixtures used a form no helper
    prints.
  - MINOR G2: R18-UP-6's idle guard was untested.
  - MINOR G3: running teardown after a failed-restore STOP pressed the restore again.
  - NIT n-a.
- **Fix round 2:** the rulings were:
  - The fixtures are built from the helpers' real line shapes.
  - A row converts to NOT MEASURED only when the printed lines show every non-banner clause passed (F-RAW: `LEAKS <row> 0`).
  - Teardown never restores, and after a failed restore the runner returns to the user.
- **Verifier 3: PASS-with-notes** (`S1-helpers-c-verifier3.md`).
  - It checked G1 hardest, against `refusalStepJudge` (`s11b.ts:723-732`). That judge reports "banner seen" only after
    every other clause in §4.26 has passed, apart from the leak count, and the runner requires the leak count to be 0.
  - MINOR H1: the `ROW` branch of the banner rule accepts a one-token label only, and two fail-safe mutants survive
    (W6, W3).
  - **H1 is accepted as a note, not fixed.** The verifier showed it cannot be reached from any line the helpers print
    today, and in Run 18 helpers change only between rows. If a helper's `ROW`/`CHECK` wording changes before S1-live,
    H1 must be fixed first; its suggested fix is in the verifier's report.

## 4. Deviations
- **Prologue order:** the prologue runs window, then reload, then console. §4.26 lists the console before the build and
  the reload, but a reload restarts the worker, and a console opened before it would lose it. All three verifiers agreed.
  This is recorded as a §4.26 wording finding; §4.26 was not edited.
- **Old ids alongside:** rows that reuse Run 17 or Run 17b operations also print their old ids (`ROW UP-L1`,
  `ROW R17-UP-6`, `ROW F-RAW`, `ROW R17B-0 …`) beside the one `ROW R18-…` line. `rows18`'s `CHECK rows` total counts
  those lines too, and S1-record must read it that way (verifier 2).
- **`slice=` on every banner row:** banner rows carry `slice=<A|B>` even when the row runs in one slice only. §4.26
  allows trailing text, and `rows18` parses these lines (verifier 2).

## 5. Proposed decisions
### 2026-10-27 · The Run 18 runner applies the per-slice banner-control rule itself
**Decided:** when a slice's R18-BANNER-CTL did not pass, the runner prints a banner row (R18-UP-6, R18-F-RAW, -F-RAW-2,
-F-RAW-DIR) as `NOT MEASURED (banner clause: R18-BANNER-CTL did not pass) slice=<A|B>`. It does so only when the printed
lines show that every other clause passed (for F-RAW, `LEAKS <row> 0`); otherwise the row stays FAIL. The run-wide rule
stays S1-record's (#340).
**Why:** §4.26 says the banner clause "is judged by the helper on its own slice's R18-BANNER-CTL", and no existing
helper reads the control.
**Instead of:** leaving the rule to S1-record. That would put a `ROW … FAIL` line into the record that contradicts the
sheet's rule.
**Revisit if:** a helper's `ROW`/`CHECK` wording changes (H1).
**By:** Claude (step agent's ruling, proposed)

### 2026-10-27 · Each Run 18 slice and attempt gets its own out folder and record file; teardown never restores
**Decided:** each slice and each attempt runs with a fresh `S11_OUT` and `-Att <n>`. The record is
`S1-live-record-<slice>[-att<n>].txt`, and a record that already holds text is a STOP. `-Block teardown` never presses
the restore. After a STOP that names a failed restore, no teardown and no re-run follow: the runner returns to the user.
**Why:** a shared folder let liveB read liveA's attach stamp (F3). An appended record breaks the rule that the record's
first line is `MANIFEST`. A restore pressed by teardown would act without the user after a STOP that escalates.
**By:** Claude (step agent's ruling, proposed)

## 6. Findings
- **§4.26 wording (no edit made):**
  - The prologue order (console before reload) contradicts the only order that works (see Deviations).
  - The Helper cells name `S11 l1` and the old scanners, as S1-helpers-b found.
  - The cell "judged by the helper" names no helper that can read the control. The runner now does it.
- **Unmeasured:** whether UIA exposes an empty `uploadfolders-warned` list (#346). If it does not, R18-0 stops before
  any state change with `R18-0: the option-page list uploadfolders-warned was not found (an empty list may not be
  exposed); nothing was changed`, and the empty-list rule then needs a ruling.
- **Not exercised:** none of the entry's blocks ran against Chrome. They are covered by stubbed scenarios and static
  checks only.
- **Earlier verifiers' notes:** verifier 3 found no process slips. Verifier 2 saw 3 extra tests from S4a's temporary
  files, which are not in this slice.

## 7. Handoff (for S1-live)
Nothing is running: no PID, watcher or worktree. The verifiers' mutants and repros are in the session scratchpad,
outside the repo. **The binding call list and the full STOP list are in `S1-helpers-c-fixer2.md` §7.** It is summarised
here.

**Command sequence:** start from a clean tree at a committed HEAD. Each slice runs for more than 600 s, so run it in the
background from **Git Bash** (`python` is not on the PowerShell tool's PATH).
1. Run `npm run build`.
2. liveA18: `S11_OUT=<fresh dir outside the repo>/a1 powershell.exe -NoProfile -ExecutionPolicy Bypass -File recipes/s12-r18.ps1 -Block liveA18`.
   The runner's `reload` block runs `recipes/reload-extension.ps1` itself, with one re-run on exit 2.
   `-Block plan` prints both orders and runs nothing.
3. liveB18: `S11_OUT=<another fresh dir>/b1 powershell.exe -NoProfile -ExecutionPolicy Bypass -File recipes/s12-r18.ps1 -Block liveB18`.
   If the toggle reads OFF, the runner writes five `ROW R18-<row> NOT RUN — waits for G11-3` lines, exits 3 and does not
   start liveB.
4. Exit codes: 0 done, 3 not run, 2 STOP. On exit 2 the safety state was restored first.
5. After exit 2: if the STOP names a failed restore, never run teardown and never re-run; return to the user. Otherwise
   run `-Block teardown` with the same `S11_OUT`, then make the next attempt with a new `S11_OUT` and `-Att 2` (or 3).

**Output files:**

| File | Where | Notes |
|---|---|---|
| Record `S1-live-record-<slice>[-att<n>].txt` | steps dir | First line is `MANIFEST … BUILD …` |
| `r18-framing.txt` | `<S11_OUT>` | Framing lines; also teardown's output |
| `console-<slice>.txt` | `<S11_OUT>` | Raw console capture |
| `console-<slice>-evidence.txt` | `<S11_OUT>` | The scan-passed copy; commit it as `S1-live-console-<slice>[-att<n>].txt` |
| `daemon-slice-<slice>.txt` | `<S11_OUT>` | The daemon-log slice |
| `rows18-<slice>.txt` | `<S11_OUT>` | The `rows18` input |

**How the record reads:**
- R18-UP-L1 and R18-SAVE-REFUSE print their `ROW` after R18-LOGS. At the row's own time the runner prints
  `CHECK <row> console-clause pending R18-LOGS`.
- `CHECK rows n=… verdict=…`, plus any `WARN`, is the record's last line.

**STOP lines the runner itself prints** (exact texts in fixer2 §7):
- **Main:** `the record file already holds text; give this attempt its own -Att` and
  `a previous wave's globals exist; run -Block teardown first`.
- **Preflight:**
  - `a dist file is missing; run npm run build first`
  - `Chrome is not running (it is never launched here)`
  - `python was not found`
  - `port <k> is held by a program the wave did not start (#251)`
  - `the tracked tree is not clean outside the steps dir`
- **Servers:** `the fixture server on 8081 did not answer` and `port 8081 is not held by the wave's own server`.
- **R18-0:**
  - `R18-0 (g): the tracked tree is not clean outside the steps dir`
  - `R18-0 after a state change would overwrite the found texts; refused`
  - `R18-0: the option-page list <id> was not found (an empty list may not be exposed); nothing was changed`
- **Gate and banner control:**
  - `the file-URL toggle is unreadable; nothing changed`
  - `R18-BANNER-CTL: a leg printed no ANSWER or no violations CHECK line`
  - the `IDLE` STOP that `Test-S12Idle` prints before any banner row
- **Stop procedure:**
  - `the restore failed or printed a STOP during the stop procedure; the wave is over`
  - `the wave ended (<cause>)`
  - `row <id> printed a STOP` and `block <name> printed a STOP`
- **Load time** (exit 2, nothing changed):
  - `STOP: Run 17's block <name> was not read from s11b-r17.ps1`
  - `STOP: Run 17b's r17b-0 block or the S12 helpers were not read`
- **From the helpers it calls:**
  - `Assert-S12Patched` and `Assert-S12CaptureFree`
  - the sampler tail
  - the devt and race STOPs
  - Run 17's `Fail-S16` texts: window not pinned, reload exit, restore mismatch
  - any `STOP:` from `s11` or `s11b`
