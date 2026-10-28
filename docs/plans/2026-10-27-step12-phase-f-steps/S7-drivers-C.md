# S7-drivers-C: liveC19's row drivers, the file chooser rows and G2 (step report; step agent Opus 5.5, medium)

## 1. Verdict
**DONE.** Every block of liveC19's order (`recipes/s12-r19-lib.ps1:11`) has a registered driver, and the static test
"every liveC19 block has a driver" proves it against §4.27's liveC19 line. The final verifier verdict is
**PASS-with-notes**, reached after one fix round. Size: 662 code lines against the 750 cap, and 462 test lines against
the 600 cap. Nothing drove Chrome, the daemon or port 9234. This step agent is a fresh one resuming after the first
step agent died; it ran verifier round 2 and did not redo any substep that was already finished.

## 2. Outputs
- New files:
  - `recipes/s12-r19-c.ts`: the actors, the `WANT` and `REFUSE_LEGS` tables, and the pure judges.
  - `recipes/s12-r19-c.ps1`: the drivers, the human dialog step, the closer and `Write-R19Dialogs`.
  - `recipes/test/s12-r19-c.test.ts`.
- Edited files:
  - `recipes/s12-r19.ps1`: dot-sources -c and holds the liveC19 registrations.
  - `recipes/s12-r19-a.ps1`: `Complete-R19Row` gains the RECORD print, one line.
  - `recipes/s12-r19-lib.ps1`: R19-RESTORE now calls `Write-R19Dialogs` for liveC19, one line.
  - `recipes/s12-r19-b.ts`: eight helpers are exported. Only `export` was added; nothing changes in how -b behaves.
  - `recipes/tsconfig.s11b.json` and `recipes/test/s12-r19-static.test.ts`: the new files are added to their lists.
- Counts, from verifier2's run in the main tree:
  - `npm test`: 230 files and 5506 tests passed. Before the stage there were 5453 at HEAD `9b14658`; the extra tests are
    -C's.
  - `npx vitest run recipes/test`: 1553 tests in 63 files before the stage, 1606 in 64 files after (re-derived by
    verifier1 and the fixer).
  - `npm run typecheck`, `npm run build` and all seven `npx tsc --noEmit -p recipes/tsconfig*.json` exit 0.
- Mutants:
  - All 12 of round 1's mutants are now killed: M1a–M1d, M2a, M2b, M3a–M3c, M4a, M4b and M5a. Verifier2 re-aimed each
    one at the code where it now lives.
  - Verifier2 added 8 mutants of its own, and all 8 are killed.
  - The fixer's 23 PowerShell mutants run inside the test file. Verifier2 found them not vacuous: the stubs follow the
    real `Invoke-R19Row` and `Invoke-R19Steps` restore logic.
- Commit: `test(e2e): S7-drivers-C — liveC19's row drivers (verifier: PASS-with-notes)`. The hash is in the step
  agent's return.

## 3. Verifier verdict
- **Round 1** (`S7-drivers-C-verifier.md`, Opus, medium): **FAIL**.
  - MAJOR-1: the tests did not catch the mutant kinds; 11 of 14 mutants survived.
  - MAJOR-2: the `outside-file-reached-page` STOP could never fire. `s11-out.bin` is 1 024 bytes, the same size as
    `s11-1k.bin`.
  - MAJOR-3: MCP leg (c) failed on a correct build's TIMEOUT failure report, which carries no `isError`.
  - Also MINOR-1 to MINOR-9 and NIT-1 to NIT-3.
- **Fix round 1** (`S7-drivers-C-fixer.md`, Sonnet, medium): every finding fixed, none disputed. MINOR-6 was left for a
  ruling (§5).
- **Round 2** (`S7-drivers-C-verifier2.md` and its `-evidence.txt`, Opus, medium): **PASS-with-notes**.
  - MAJOR-2 and MAJOR-3 are confirmed fixed against the code: `recipes/s11.ts`, `mcp/src/tools/registry.ts` and
    `sdk/src/error.ts`.
  - It also audited the builder-only edits in `-b.ts`, `tsconfig.s11b.json` and the static test. Nothing is weakened.
  - Three findings are carried, not fixed:
    - **MINOR-1:** a want overridden at its call site passes every test, for example `{ ...WANT.choose3, clicks: 0 }`
      at `s12-r19-c.ts:188`, `:207` and `:214`. The static check only looks for the text `WANT.x`.
    - **MINOR-2:** `Write-R19Dialogs` (`s12-r19-c.ps1:55-62`) prints `wave-windows-open` but never judges it, while
      R19-RESTORE's rule says "DIALOGS all 0".
    - **NIT-1:** the test file's 23 anchored mutants turn it red on any edit to an anchored line, whatever the edit
      does. A later fixer should expect this.
- **Fix rounds used:** 1 of 3. The PASS-with-notes findings are left for the next slice that touches -C, or for the
  session agent's ruling on MINOR-2 below.

## 4. Deviations
- None from the brief.
- `S7-drivers-C-verifier2` returned through its completion notice. This step agent's turn stayed open while it ran
  (#286).
- Files in the steps dir that are not this stage's are left out of the commit: `journal.md`, `env-checker-2.md`,
  `S7-up-opt-investigator.md` and `s7-upopt-*.txt`.

## 5. Proposed decisions (for the session agent to rule)
### 2026-10-28 · A RECORD row prints `ROW <id> RECORD`, not PASS
**Decided:** R19-CHOOSE-FRAME and R19-CHOOSE-HUMAN print `ROW <id> RECORD` through `$global:R19RecordRows` in
`Complete-R19Row`, as R19-DEVT-NOFLAG already does. A FAIL clause inside either row (CHOOSE-FRAME's new `dialog` leg)
still prints FAIL. This is implemented.
**Why:** the row form is `ROW <id> <…|RECORD>`. Before the fix these rows printed PASS, and CHOOSE-FRAME's dialog FAIL
was lost.
**Instead of:** leaving them ranked as PASS.
**Revisit if:** the aggregator needs RECORD to rank as PASS.
**By:** Claude (proposed; verifier1 §5, implemented by fixer 1)

### 2026-10-28 · CHOOSE-JSOFF's "the same through the MCP" is R19-CHOOSE-MCP leg d
**Decided:** JSOFF's own ROW covers the SDK path. Its MCP half is measured as R19-CHOOSE-MCP leg d, with the JavaScript
switch off and `Restore-R19Js` in that leg's `finally`.
**Why:** the MCP actor and its closer live in the MCP block. Duplicating them inside JSOFF would add a second MCP
session without measuring anything new.
**Instead of:** an MCP leg inside JSOFF's ROW.
**Revisit if:** the sheet wants JSOFF's ROW to carry the MCP verdict.
**By:** Claude (proposed; MINOR-6a)

### 2026-10-28 · CHOOSE-KEPT runs its two calls on one page
**Decided:** R19-CHOOSE-KEPT's "(fresh load each)" is read as one page, with `change` going 1 → 2.
**Why:** the row measures that the kept debugger session does not break a second chooser call. A reload between the two
calls would end that session's page state, which is the very thing under test.
**Instead of:** a fresh load per call.
**Revisit if:** the sheet means a reload between the calls; then it needs a dated §4.27 note on what KEPT measures.
**By:** Claude (proposed; MINOR-6b; for the session agent, since it reads the sheet's text)

### 2026-10-28 · liveA19 and liveB19's DIALOGS line has no owner
**Decided:** none; this needs a ruling. R19-RESTORE lists a `DIALOGS` line (form 30) for every slice, but only liveC19
prints it (`Write-R19Dialogs`). Two options:
- (a) Name -DE, or a small follow-up slice, to call `Write-R19Dialogs` in liveA19's and liveB19's R19-RESTORE.
- (b) Add a dated §4.27 note saying DIALOGS applies only to the slices that can raise a native dialog.

(a) is the conservative option, because it reads more.
**By:** Claude (proposed; open)

### 2026-10-28 · The DIALOGS count leaves out the worker-console capture window
**Decided:** `Get-R19DevToolsCount` (`s12-r19-c.ps1:53`) does not count `$global:D`.
**Why:** the sheet closes the capture window last, after R19-RESTORE reads its counts. Counting it would make every
liveC19 run STOP with `devtools-left-open`.
**Instead of:** counting every DevTools window.
**Revisit if:** the capture window is closed before R19-RESTORE.
**By:** Claude (proposed; verifier2 §5)

### 2026-10-28 · `wave-windows-open` in the DIALOGS line is judged, or the sheet says it is a record
**Decided:** none; this needs a ruling (verifier2 MINOR-2). Either `Write-R19Dialogs` STOPs or FAILs when that count is
non-zero, or §4.27 gets a dated note that it is a record. Windows X and O are still open at that point by design, so
"all 0" cannot hold literally for this count.
**By:** Claude (proposed; open)

### Carried from the builder (`S7-drivers-C-builder.md` §5), none disputed by either verifier
- `dialog=` is read after the reply.
- CHOOSE-4's and DISARM's `change` is the dialog's own change.
- CHOOSE-2 (b) is a raw wire call.
- An unproved human click makes the leg NOT MEASURED.
- G2-1's focusFirst variant is printed as a CHECK line.
- CHOOSE-LATE's `opened` is now also printed with the page's `late` key (MINOR-7).

## 6. Findings
- §4.27 wording problems, for dated notes (none edited here; see `S7-drivers-C-builder.md` §6):
  - The size is 1 000 in the sheet but 1 024 in fact.
  - CHOOSE-2 (b)'s text is reachable only by a raw call.
  - CHOOSE-4 leg a's `change`.
  - The JSOFF control's `change` and `clicks`.
  - CHOOSE-1 uses one page per call.
  - CLOSERPROBE runs once.
- No new runtime fact; nothing ran live.
- First-run risks: the dialogs' owner is assumed to be W or X; the MCP actor reads the reporter through
  `browser_evaluate`; the reporter keeps only the last changed input's digest (verifier2).
- `recipes/test/s12-r19-c.test.ts` takes about 50 s, because it runs one PowerShell per mutant in parallel.

## 7. Handoff
- Nothing is running. Verifier2's scratch worktree is removed and pruned, with its junctions taken out first.
- For -DE: N-4 from S7-helpers-d still binds -DE. MINOR-1's call-site check can ride in the next slice that touches -C.
- Before S7-live, the session agent rules on the §5 proposals and the §6 wording notes.
- Needs the user's keyboard: nothing.
