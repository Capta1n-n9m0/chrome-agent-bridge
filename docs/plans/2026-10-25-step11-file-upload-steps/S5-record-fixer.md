# S5-record fixer report: the Run 16 section in §5

Model: Sonnet 5.5, effort medium (#270). UTC start 2026-10-26T05:34:30Z, end about 05:41Z (`date -u`). Nothing live ran,
nothing committed. Edited only the Run 16 section of `docs/e2e-test-plan.md` and `S5-record-builder.md` (MINOR-5), plus
this report. Every fix is read from the committed record (REC) and the step reports.

## 1. Verdict

DONE. All nine findings fixed; none disputed. The section grew from 132 to 136 added lines, none removed
(`git diff HEAD --numstat`).

## 2. Findings, before and after

- **MINOR-1** (open items, UP-RACE-*/UP-DEVT). Before: "re-registered as new rows (per-call times; a DevTools-open check),
  not re-runs (LB section 9)." After: "to be re-registered as new pre-registered rows, not re-runs (proposed in LB
  section 9 for UP-RACE-A, per-call times, and UP-DEVT, a DevTools-open check; none exists yet; UP-RACE-B is not named
  there)."
- **MINOR-2** (UP-RACE-A row). Before: "...no per-call time (VB F2)." After: "...no per-call time, so the row does
  not exclude an `ok` returned during the disarm (VB F2; UP-7 (a) covers the gate)."
- **MINOR-3** Proposed decisions below, one per row; the open items now end the UP-OPT bullet with "Proposed decisions
  for UP-6 and UP-OPT: `S5-record-fixer.md` (#281 d)."
- **MINOR-4** Added before the Counts line: "UP-CLICK  -  [NOT RUN]  not run (#251) ... no ROW line, not counted." The
  counts stay as they were (30 row lines), since it has no ROW line.
- **MINOR-5** `S5-record-builder.md`: every spelling of the profile path replaced by `<user profile>`, and the two
  mentions of the username fragment by `<username>`. Count of the path forms and of the username there: **0** (it was
  6 and 5 per the verifier; all slash and escape forms).
- **NIT-1** Before: "each read back "hash=equal" (REC:91, 99, 108, 116, 361, 390)". After: the restores read back
  `hash=equal` at REC:99, 108, 161, 260 (UP-0 (B)), 361, 390; UP-OPT's read-backs are STATE lines (REC:38, 43); REC:91
  and 116 are set read-backs. I read the cited lines to confirm (REC:91 and 116 are `RESTORE ... hash=equal` lines
  written after a set, as the verifier says).
- **NIT-2** Before: "the runner's and the ledger's '11 PASS'". After: "the ledger's '11 PASS' (the runner's hand-back as it
  recorded it)". Source: `S5-liveB.ledger.md:8`; VB N3.
- **NIT-3** Preamble now reads "No row that had made an observation was re-run, except UP-RESTORE (run 1's stop-path
  read-back, REC:154-172, then run 2's PASS)".
- **NIT-4** The liveA console open item now says run 1 had no console capture at all (04:19:08Z-04:20:42Z), which also
  covers UP-0 and UP-OPT, and that #282 lists four rows.

## 3. Scans (counts only; token via `bridge.token` into a shell variable, never printed)

| Target | token | profile path / username | sentinel `s11-`+12 hex | non-fixture scheme://host | title lines |
|---|---|---|---|---|---|
| Run 16 section (136 lines, extracted to /tmp) | 0 | 0 | 0 | 0 | 0 |
| `S5-record-builder.md` | 0 | 0 | 0 | 1 (a placeholder `extension://` prose mention, host empty; the verifier found the same) | 3 (prose lines that quote the pattern `DevTools - `; no actual title) |

## 4. Deviations

None.

## 5. Proposed decisions

### 2026-10-26 · UP-6's banner FAIL has no established product cause; the check cannot tell
**Decided:** record UP-6 (liveA run 1, REC:59-66) and UP-6B (REC:281-288) as FAIL on the banner clause with no product
defect filed. The evidence: REC:60 and 282 show `banner=seen` with polls=21 (after the reply 20); the five liveA clauses
all print "banner seen on a refusal" because the judge lets a seen banner replace every other clause (VA F3), while in
UP-6B the five refusal clauses pass and only the banner clause fails (#284). The verifier shows the sampler window holds
the wave's own `evaluate` attaches (`recipes/s11.ts:401-412`, `evaluate.ts:37-39`; VB F1), so the banner is expected even
if no refusal attaches. Whether any refusal attaches the debugger is not shown by this record. **Why:** #284; the record
cannot separate the two causes. **Instead of:** filing a product defect; retuning the banner check. **Revisit if:** a new
pre-registered row samples the banner with no `evaluate` in the window (#284). **By:** Claude (proposed)

### 2026-10-26 · UP-OPT's o2-follows FAIL has no cause the record settles
**Decided:** keep UP-OPT as FAIL. The record shows eight clauses PASS and `o2-follows` FAIL: "O2 took 6061 ms (bound 5000)"
with `o2Conflict false` (REC:46, 55; VA table). No committed report names a cause (not the product, the
helper, window placement or the machine), and the row was never re-run (#281 d). A cause is not stated here.
**Why:** a failed row is recorded, never retuned (agent-rules §2); one 6061 ms observation cannot separate a slow second
options window from a product delay. **Instead of:** stating a cause, or loosening the 5000 ms bound. **Revisit if:** a new
pre-registered row times O2's update more than once. **By:** Claude (proposed)

## 6. Findings / Handoff

Nothing new. The step agent should confirm the section and the builder report, then commit. Not touched: the builder's
§5 "None" (outside my lane; these decisions now live in this report).
