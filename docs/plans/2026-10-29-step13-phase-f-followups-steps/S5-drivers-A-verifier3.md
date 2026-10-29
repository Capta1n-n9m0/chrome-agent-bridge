# S5-drivers-A verifier, round 3 (liveA20 driver, slice A1)

Model: Claude Opus 5.5, medium effort. Read and run only. No daemon on 9234, no Chrome, no reload, no live run.
Evidence: `S5-drivers-A-verifier3.txt`.

## 1. Verdict: PASS-with-notes

Round 2's two MAJOR findings are fixed and red-proven. What remains is MINOR or NIT, plus one process finding.

| Exit check | Result |
|---|---|
| `npm test` | 242 files, **5772 passed** (5705 at stage start, none removed; the fixer's count holds) |
| `npm run typecheck`, the eight `recipes/tsconfig*.json`, `npm run build` | all exit 0 |
| Tree after build | only the lane's two tsconfigs, the untracked lane files and the S5-drivers-A* reports |
| No s12-* or `s13-forms.ts` diff | `git diff --stat` lists only `recipes/tsconfig.s13.json` and `recipes/tsconfig.s6.json` |
| Size | code 620 (174 + 140 + 306), tests 454 |
| Mutants | 5 of 5 red (M1 to M5, evidence file), in a scratch worktree with its own `npm ci`. The `@bridge/*` junctions were removed with `cmd /c rmdir`, then the worktree was removed. The main tree's `node_modules` is intact |
| Local path or user name | 0 hits in each S5-drivers-A* file and each new recipes file (counts only) |

## 2. Round 2's items re-checked

1. **Disk manifest (2.1): fixed.** `s13-r20.ps1:54` uses `Join-Path (Split-Path -Parent $PSScriptRoot)
   'extension\manifest.json'` with `-ErrorAction Stop` and a silent catch, so no path reaches any stream. The fallback
   tests expect exactly `disk=yes` (`s13-r20-ps.test.ts:177-178`). A forced `no` (M1) is red. The file has no mutant
   residue: 0 hits for the old broken path or the word mutant, and the file matched the scratch copy byte for byte.
2. **POP-OTHER `human` (2.2): fixed.**
   - (a) `clickGate` (`s13-r20-a.ts:79-83`) always gives round k's signal. The content is `skip` for a guard other than
     `fg`. Later rounds after an unsent click also give `skip` (`:122`). The signal file is written atomically
     (`s11b.ts:683-684`, tmp then rename), so `Read-R20Ready` cannot read a half-written file.
     `Invoke-R20PopClick` answers `unsent` on `skip` without touching UIA (M2 red). A skip round is pushed with its
     non-`fg` guard and is not counted, so the leg is NOT DISCRIMINATING and never hits the 120 s throw (M3 red,
     `s13-r20-a.test.ts:101`).
   - (b) `t0` comes from the PowerShell stamp written right after `Send-S12MouseClick` (`s13-r20.ps1:138-139`), and
     the 2.5 s wait starts after the trigger returns (`s13-r20-a.ts:95-96`). M4 is red.
3. **`enabled` with no console read (2.3): fixed.** LOADED20 keeps its `yes|no` form (`s13-r20.ts:122-123`) and
   `ENABLED_UNREAD_20` names the source when `--enabled` is absent (`:124`). M5 is red. See finding 3.2 about where
   this line lands in the record.
4. **W2 (2.4): kept as one window. MINOR, see finding 3.3.**

## 3. Findings

### 3.1 MINOR: the `inMs` clamp turns a grant from before the click into a fast pass
`s13-r20-a.ts:97`: `inMs = Math.max(0, P.A.grants[0].at - t0)`. The grants are cleared before the trigger
(`prepareRound`, `:73`), but the click stamp `t0` comes after the UIA search, the foreground checks and the click
(`s13-r20.ps1:132-139`). A grant to A that lands in that gap is not caused by this round's click. For example, a late
grant for the previous round's popup. It reads `inMs=0`, is taken as `handle`, and counts toward a PASS. The only
negative values a correct run produces are clock-granularity ones: Node's `Date.now()` against .NET's
`DateTimeOffset.UtcNow`, which differ by a few ms at most. No test covers `popRound`'s clamp or its
wait-after-trigger, because `popRound` is not exported.
**Fix:** take only grants with `at >= t0 - 20` (a small, named tolerance). A grant earlier than that makes the round
print `CHECK R20-POP-OTHER human grant-before-click=yes` and makes it NOT counted, or a FAIL. Extract the choice as a
pure `inMsOf(grants, t0)` and test it with a pre-click grant.

### 3.2 MINOR: in the FALLBACK, R20-0's CHECK lines come before MANIFEST
`Invoke-R20Zero` prints every non-LOADED20 line of the proof at once (`s13-r20.ps1:68`). That happens before the
`$Zero` block prints MANIFEST (`:76`), and the record is already the raw sink for `r20-0`. So in the FALLBACK, the
segment starts with `CHECK R20-0 enabled-source=reachability …` and `CHECK R20-0 fallback disk-manifest …`, and only
then `MANIFEST …` and `LOADED20 …`. §4.28's R20-0 (l.1962) says the first line is MANIFEST and the second is exactly
LOADED20. The pattern comes from Run 19's `Invoke-R19Zero` (`s12-r19-lib.ps1:161`), but round 2 made it more likely
in Run 20: `ENABLED_UNREAD_20` is printed on every FALLBACK.
**Fix:** hold the proof's CHECK lines with LOADED20 and release them right after it, in the same Show-S16 wrapper
(`:75`), or accept a dated sheet note.

### 3.3 MINOR (kept): `third` runs with B's tab in W, and nothing in the output says so
B's tab `T` is opened in the same window (`s13-r20-a.ts:159`). §4.28 l.1964 sets B's tab in W2. The leg still
discriminates by its stated rule:
- **Opener fallback:** the grant would go to C, who holds W's active tab. W is fronted before every round, so W2
  would not be the last-focused window either way.
- **"B's own traffic during the popup does not move the grant":** this is still tested. B's `evaluate "1"` loop runs
  through every round, and a grant to B is the STOP.

The only case lost is a fallback to "the active tab of a window other than the opener's", which only W2 would show.
The fixer's report says "the sheet's one-window record stays (the unjoined line)". That is not accurate:
`UNJOINED_LINE` is about unjoined tabs, and no output line records that B's tab is in W.
**Fix:** print `CHECK R20-POP-OTHER third b-window=W (sheet: W2)` at the start of the leg, or have the session agent
add a dated note. Route 1 of verifier2 §2.4 is still available.

### 3.4 NIT: `Invoke-R20PopClick` fails open on an unexpected ready content
`s13-r20.ps1:131` refuses only on `skip`. Empty or any other content goes on to click. The atomic write makes this
unreachable today. Requiring `go` (`if ($Guard -ne 'go') { return 'unsent' }`) is the safer form for a click on a
human-visible window.

### 3.5 Process finding (MINOR): the #395 breach by fixer round 2
The fixer says it ran its old-path mutant and then restored the file. The step brief records that this was done in
the main-tree file, which breaks #395 (mutants never touch the main tree). No residue remains:
- the current `s13-r20.ps1` holds the fixed path;
- it has 0 hits for the old path or a mutant marker;
- the gates pass on it.

No harm resulted. The step agent should restate #395 in the next fixer brief and record the breach in the stage
report.
