# S5-drivers-A — the liveA20 driver, first half A1 (step report)

Step agent: Claude Opus 5.5, medium. Builder and fixers Sonnet 5.5, medium; verifiers Opus 5.5, medium; committer Sonnet 5.5, medium.

## 1. Verdict

**DONE-PARTIAL.** The step agent split the slice before the build (Run 19's slice-A driver was about 2,000 lines; agent-rules §7). A1 is built and
verified: the shared Run 20 runner, the PowerShell wrapper, and the actors for R20-0, R20-POP-BG, -FG, -OTHER, -NONE, R20-ARGS-ORDER and
R20-ARGS-3. **Remains (A2):** R20-CON-DESC, -CON-NOTEA, -CON-CAP, -CON-4, -CON-FLOOR, R20-ARGS-OLD, R20-RESTORE, R20-LOGS; the entry script
(param `-Block`, the s9/s11/s11b/s12 window dot-sources, `Register-R20Blocks`, `Invoke-R19Main`); and the carried MINORs of §6.

## 2. Outputs

- New: `recipes/s13-r20.ts` (174), `recipes/s13-r20-a.ts` (306), `recipes/s13-r20.ps1` (140): code 620. Tests `recipes/test/s13-r20.test.ts` (128),
  `s13-r20-a.test.ts` (130), `s13-r20-ps.test.ts` (196): 454. Total 1,074 (`wc -l`).
- Changed: `recipes/tsconfig.s13.json` (include list), `recipes/tsconfig.s6.json` (exclude list gains the three new tests, as for `s13-forms.test.ts`).
- `npm test`: 239 files / 5,705 passed at the start → 242 files / 5,772 passed (+67, none removed), re-run by verifier3 after the last edit.
  `npm run typecheck`, all eight `recipes/tsconfig*.json`, `npm run build` exit 0; after the build the tree holds only the lane's files; no `s12-*`
  or `s13-forms.ts` diff; 0 hits for a local home path or the user's name across the slice's files (verifier3).
- What A1 provides: `s13-r20.ts` — Run 20's STOP reasons, `stopLine`/`returnLine`, `checkStopReturn20` (R5.6), `rowVerdict20`/`aggregateRows20`
  (one ROW per id and slice), `scan20`/`scan20Stream`/`scan20Actors` (counts only, patterns by argument; login and git names both counted),
  `restoreCompare20` (count and sha256, hashes never printed), `capturePath20`, `proofDecision20`, CLI `proof`, `s4`, `port`, `restore-compare`,
  `rows20`, `scan`, `scan-actors`. `s13-r20.ps1` — dot-sources `s12-r19-lib.ps1` and `s12-r19-a.ps1` unchanged, adds R20 keys to their tables, and
  redefines only the functions that pin Run 19 text; `Read-R20Worker` (on `Start-S11bConsoleEval`) for `perm`/`listener`/`enabled`, the disk-manifest
  FALLBACK, `Invoke-R20PopClick`, `Invoke-R20RestoreCheck`; A2 slots `$R20SlotCon`, `$R20SlotAfterArgs3`, `$R20SlotOld`.
- Every A1 STOP reaches a RETURN with a test: `build-not-loaded`, `extension-disabled`, `reload-failed`, `popup-lease-wrong`,
  `existing-tool-changed`, `args-ran-js-off`, `throw-after-state`, `not-restored`.

Reports: `S5-drivers-A-builder.md`, `-fixer1.md`, `-fixer2.md`, `-verifier.md`, `-verifier2.md`, `-verifier3.md` (+ evidence `.txt`).
READ list given to every child: `S5-sheet.md` §6–§7, `S5-sheet-fixer1.md`, `S5-helpers.md` §7, `recipes/s13-forms.ts`, e2e plan §4.28 (l.1938–1996),
the phase doc § S5, Exit checks, Human gates, STOP rules, As built S1–S4; decisions #385, #391, #395, #399, #400; `recipes/CLAUDE.md`; Run 19's
drivers read-only.

## 3. Verifier verdict

- Round 0 (`S5-drivers-A-verifier.md`): **FAIL**, 4 MAJOR (POP-OTHER `human` grant cleared after the click; R20-0 worker read missing and
  `enabled` not read; ARGS-ORDER MCP `KEYORDER` values not measured; a local path in the red evidence) + 4 MINOR.
- Round 1 (`-verifier2.md`): **FAIL**, 2 new MAJOR (disk-manifest path lost its separators; the `human` leg's skipped round threw and its `t0`
  included the click latency) + 2 MINOR.
- Round 2 (`-verifier3.md`): **PASS-with-notes**, 0 MAJOR, 4 MINOR + 1 NIT (§6). Fix rounds used: 2 of 3.

## 4. Deviations

- Pre-split to A1 (DONE-PARTIAL), as the step brief allowed.
- Size: code 620 (cap ~600) and total 1,074, over 1.5 × the cap. Accepted only because the stage is DONE-PARTIAL in any case: the growth came from
  the fix rounds' required tests and reads. A2's brief should cap A2 at 600 again and keep the entry script small.
- Fixer round 2 ran one mutant by editing a main-tree file and restoring it (against #395); verifier3 found no residue and the gates green.
- `recipes/tsconfig.s6.json` edited (exclude list): needed for the eight tsconfigs to exit 0, within "a recipes tsconfig entry if needed".

## 5. Proposed decisions

### 2026-10-29 · R20-ARGS-ORDER's `ref` leg is recorded, not judged
**Decided:** the driver runs step (c) and records its actual answer (`ANSWER … ref <code>` and a recorded leg line); no `KEYORDER … leg=ref` line.
**Why:** `evaluateRef` and the extension refuse a non-element value, so a keyed object has no ref (verifier round 0, checked in `sdk/src`).
**Instead of:** a fabricated `KEYORDER` ref line. **Revisit if:** the SDK gains a value ref. **By:** Claude (proposed; the §4.28 dated note is the
session agent's).

## 6. Findings (carried; A2 fixes the first two before any live run)

1. MINOR `recipes/s13-r20-a.ts:97`: `in-ms` is clamped at 0, so a grant landing between the grant reset and the click stamp would read as a fast
   pass. Fix: tolerance `at >= t0 - 20`, anything earlier not counted; a pure test, plus a test for `popRound`'s clamp and wait-after-trigger.
2. MINOR `recipes/s13-r20.ps1:68`: in the FALLBACK, R20-0's CHECK lines print before `MANIFEST`, breaking "MANIFEST first, LOADED20 second". Fix:
   hold them and print after LOADED20.
3. MINOR: R20-POP-OTHER `third` runs B's tab in window W, not the sheet's W2 (no SDK/MCP/daemon `newTab` takes a window). The leg still
   discriminates by its stated rule (a fallback to Chrome's opener grants to C; a grant to B is the STOP), but nothing records the window. Fix in
   A2: print `CHECK R20-POP-OTHER b-window=W (sheet: W2)`, or open W2 with `Open-S11Window` and have B `claim` the tab; or the session agent adds a
   dated note.
4. NIT `recipes/s13-r20.ps1:131`: the click goes ahead on any ready content except `skip`; require `go`.
5. For the session agent: a dated §4.28 note on the `ref` leg (§5); `recipes/CLAUDE.md` "all seven" tsconfigs → eight and the `.s6` exclude list.

## 7. How to run liveA20

**Not runnable yet.** liveA20 runs only after A2 lands its rows and the entry script; until then this section states what A1 fixes for the runner.
- **Command (after A2):** the entry script A2 writes, from the repo root, in Windows PowerShell 5.1: `powershell -NoProfile -ExecutionPolicy Bypass
  -File recipes/<A2 entry script>.ps1 -Block liveA20`. It dot-sources the window helpers, then `recipes/s13-r20.ps1`, calls `Register-R20Blocks`
  and `Invoke-R19Main liveA20`. The actors run under tsx (`npx tsx recipes/s13-r20-a.ts <cmd>`); `recipes/s13-r20.ts proof` gives R20-0's line.
- **Prerequisites:** §4.28's slice prologue (preflight, `PORT` line, the fixture server on 8081 for CON-NOTEA, the files, `npm run build` from a clean
  tree at a committed HEAD, `recipes/reload-extension.ps1`, one re-run on exit 2); JS on and armed as found; the worker-console capture window
  open before the first row; every bookkeeping edit committed (a clean-tree guard stops the wave).
- **Expected first two record lines:** §4.26's `MANIFEST …` line, then exactly
  `LOADED20 keys=page nested=page elem=page perm=yes listener=yes enabled=yes args=answered`. If the console cannot evaluate, `perm`/`listener`
  print `unread`, a `CHECK R20-0 …` FALLBACK line records the disk manifest (and the `enabled` source) — after LOADED20 once finding 2 is fixed.
- **Where the record lands:** the steps dir, `S13-live-record-<block>.txt` (`-att<k>` on a later attempt); console segments
  `console-liveA20-<k>.txt`.
- **STOP returns:** every `STOP <reason>` is followed by `RETURN <seq> after-stop=<reason> restored=… readback=…` and the runner returns.
  `build-not-loaded`, `extension-disabled`, `reload-failed` — R20-0, before any state change (reload or build problem: rebuild, reload, start a new
  attempt); `popup-lease-wrong` — a POP row granted the popup to a non-holder (a product defect, escalate); `existing-tool-changed` — an
  ARGS-ORDER control answered differently; `args-ran-js-off` — R20-ARGS-3's effect counter moved with JavaScript off (escalate);
  `not-restored` — the read-back differs from R20-0's by count or hash (escalate; never retry past it); `throw-after-state` — any throw after the
  first state change (helper or environment; the restore ran first). A2 adds `text-leak`, `old-build-left-loaded`, `dialog-left-open`,
  `devtools-left-open`.

## 8. Handoff

No processes running; nothing live was run. Commit: see the committer's line below. A2 reuses `s13-r20.ts` (all slices B/C too: STOP/RETURN,
aggregator, `scan20*`, `restoreCompare20`, `capturePath20`) and appends to `s13-r20-a.ts` `cmds` and below the marker in `Register-R20Blocks`.
