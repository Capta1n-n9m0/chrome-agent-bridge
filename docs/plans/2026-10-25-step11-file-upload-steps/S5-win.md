# S5-win — Run 16 UI Automation helpers (step report)

Step agent: Claude Opus 5.5, 2026-10-25T21:24Z → 2026-10-26T03:38Z (`date -u`). RISK: low (recipes only).
Brief READ list: `docs/e2e-test-plan.md` lines 1445–1552 (§4.23) only; `recipes/CLAUDE.md`; `S5-actor.md` and the
signal-file sections of `S5-actor-builder.md` / `S5-actor-fixer.md`; decisions #243, #245, #273, #277, #278; models
`recipes/s10-win.ps1`, `recipes/s9-win.ps1`; the salvage draft `step11-s5-salvage/recipes/s11-win.ps1`.

## 1. Verdict

**DONE.** Verifier round 2: **PASS-with-notes** (`S5-win-verifier2.md`).

## 2. Outputs

- `recipes/s11-win.ps1` — 451 lines (`wc -l`, cap 500); dot-sources `s10-win.ps1`; ParseFile 0 errors.
- `recipes/s11-win-rules.ts` (191 lines) — hashing, restore-by-hash check, `addLine`, `found.json` shape, toggle
  reading, signal names, URL allow-list, occluder verdict, the output scanner.
- `recipes/test/s11-win-rules.test.ts`, `recipes/test/s11-win-static.test.ts` — the pure tests, the static scan of the
  .ps1 (no file-URL toggle press, no secret output, guard-before-input, parse), and a test that runs the two string
  functions (`Add-S11Line`, line count) in PowerShell against the TS rules.
- `recipes/tsconfig.s11.json` — the new .ts files added to `include`.
- Tests: 3699 → 3738 (builder) → **3746 passed, 150 files** (fixer; re-derived by verifier2). `npm run typecheck`,
  `npm run build`, `npx tsc --noEmit -p recipes/tsconfig.s11.json`: exit 0 (verifier2's re-run).
- Nothing ran against real Chrome in any agent: no UIA on a live window, no daemon, no reload, no launch; 9234 free
  before and after (both verifiers).

### Step → helper map (verifier round 1's map, updated for the fix round)

| §4.23 step given to UIA / the options page | Helper |
|---|---|
| UP-L1 preflight: found Upload folders text for `foundcheck` | `Save-S11Found` |
| UP-0: stored state, texts outside the repo, `found.json` | `Read-S11Stored`, `Save-S11Found`, `Assert-S11Outside` |
| UP-0: file-URL toggle in window E, read only | `Open-S11Extensions`, `Read-S11FileAccess` |
| UP-OPT: set + save, poll, typed lines, revert, stored read | `Invoke-S11Opt` |
| UP-FA / UP-6 / UP-6B / UP-1: banner sampler (4 s after the reply) | `Invoke-S11Sampler` |
| UP-1 / SW-2: W in front, cursor parked | `Set-S11Front` |
| UP-7 (a)(b)(c), UP-7J: change, read back, restore | `Invoke-S11Row`, `Set-S11Flag`, `Set-S11BoxVerified` |
| UP-DEVT: window X, F12 twice, X closed | `Open-S11Window`, `Invoke-S11Row UP-DEVT`, `Close-S11Window` |
| UP-RACE-A: presses at ready +1.5 s / +1.6 s | `Invoke-S11Race A`, `Invoke-S11ButtonPair` |
| UP-RACE-B: block-list edit at +1.5 s, restored on loop-done | `Invoke-S11Race B` |
| liveB: ROOT added again | `Add-S11Root` |
| UP-RESTORE: press pair, fresh page, restore by hash, `now.json`, title | `Restore-S11Safety` (`-Btn` mandatory) |
| UP-LOGS: worker console | s9 `Open-/Read-S9WorkerConsole`, reused |
| Pinned button (human gate) | `Get-S10PinState` via `Invoke-S11ButtonPair` |
| Occluder / cursor-park guards | `Enter-S11Guards` |
| S5-actor signals | `Wait-S11Ready`, `Write-S11Pressed`, `Invoke-S11Change`, `Clear-S11Signals` |

## 3. Verifier verdicts and findings by severity

| Agent | Model, effort | UTC | Result |
|---|---|---|---|
| Builder | Sonnet 5.5, medium | 21:24 → 21:34 (2026-10-25) | DONE, 412 lines, ~130k context |
| Verifier 1 | Opus 5.5 | 21:34:40 → 21:44:39 | **FAIL**: 1 MAJOR, 9 MINOR, 6 NIT |
| Fixer 1 | Sonnet 5.5, medium | 21:46 → ~22:10 by its report; hand-back reached the step agent ~03:29 (2026-10-26) | DONE, all MAJOR/MINOR fixed, NIT-6 not; 451 lines, ~150k context |
| Verifier 2 | Opus 5.5 | 03:29:49 → ~03:37 (2026-10-26) | **PASS-with-notes**: 1 MINOR, 3 NIT |

- Round 1 MAJOR-1: the banner sampler stopped at the actor's `-sampled.ready`, so the 4 s after the reply that UP-1,
  UP-6, UP-6B and UP-FA judge was never sampled. Fixed (polls 4000 ms more, inside the actor's 30 s wait).
- Round 1 MINORs (race A timing vs #278, `now.json` + mandatory `-Btn`, no ROOT-again helper, the press pair's end
  state, the outside-the-repo check, the UP-OPT double count, `Open-S11Window` able to launch Chrome, broad window
  titles, scanner blind spots and surviving mutants): all closed per verifier 2.
- Open after round 2 (accepted as notes, no fix round):
  - **MINOR-N1:** the output scanner does not know `Get-S11FoundText` as a text source, nor `Write-S11Pressed`,
    `[IO.File]::WriteAllText`, `Tee-Object` as sinks. Every real call site is safe by reading.
  - **NIT-N2:** 7 of verifier 2's 17 mutants pass the static tests (press-timing lines, the prefix check,
    `Add-S11Root` not in the guard-first list, a widened title pattern); the code is correct by reading.
  - **NIT-N3:** race A presses late by one button lookup; the sampler tail can run slightly past 4 s.
  - **NIT-N5:** a `STOP:` line printed during the restore does not stop the restore; the runner must treat it as the
    end of the wave.
  - Carried NIT: `New Tab`, `about:blank`, bare `Extensions` stay allowed titles (from s9/s10), matched only on a
    wave-opened handle.

The Sonnet build drew 1 MAJOR at the first verification; one Sonnet fix round closed it.

## 4. Deviations

- None from the brief. The fixer's hand-back reached the step agent about 5 h after its own recorded end; its files
  were complete and verifier 2 audited them as they stand.
- `docs/plans/2026-10-25-step11-file-upload-steps/journal.md` shows an uncommitted one-line change made outside this
  slice (not by its agents' reports); it is left out of this slice's commit.

## 5. Proposed decisions

### 2026-10-26 · S5-win accepted with its scanner blind spot as a note
**Decided:** accept S5-win at PASS-with-notes; MINOR-N1 and NIT-N2/N3/N5 go to S5-runner as notes, not a fix round.
**Why:** every real output site was read safe by two verifiers; the gaps are in the test's reach, not the code.
**Instead of:** a third fix round on a test extension. **Revisit if:** S5-runner adds an output site in
s11-win.ps1 or calls `Get-S11FoundText` outside `Restore-S11Safety`/`Invoke-S11Opt`. **By:** Claude (proposed)

## 6. Findings (for S5-runner and S5-liveA)

- Set `$global:W` to the front window before `Enter-S11Guards` / `Set-S11Front`; call `Save-S11Found` before
  `Invoke-S11Opt`; UP-RACE-A needs the pinned toolbar button (unpinned prints `STOP:`).
- Any `STOP:` line, including one inside `Restore-S11Safety`, ends the wave (NIT-N5); never print `$_` from these
  helpers (NIT-6).
- Unmeasured until live: the `chrome://extensions/?id=` window title; `Find-S11Texts` item counts on Chrome 156; race
  A press offsets.

## 7. Handoff

No PIDs, no watchers, nothing running. Verifier 2's scratch copy:
`C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\9c6ea090-7b81-4653-b2ad-abef50160f29\scratchpad\v2`
(no `node_modules` junction). Next: S5-runner (the block runner) dot-sources `recipes/s11-win.ps1`; a live dry run
is S5-liveA's first row.
