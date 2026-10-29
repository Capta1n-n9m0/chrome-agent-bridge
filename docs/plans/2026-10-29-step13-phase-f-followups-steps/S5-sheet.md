# S5-sheet — Run 20's wave sheet (step report)

Step agent: Claude Opus 5.5, medium. Builder and fixers Sonnet, medium; verifiers Opus, medium; committer Sonnet,
medium. Docs only, no live run.

## 1. Verdict

DONE. `docs/e2e-test-plan.md` §4.28 "R20 rows" is written and committed before any Run 20 observation (R5.1). Commit
hash: in the session agent's journal (the committer reports it after this file is staged).

## 2. Outputs

- `docs/e2e-test-plan.md`: +58 lines, 0 deleted, one hunk (§4.28 only; `git diff --stat`, re-run by each verifier). No
  R18/R19 row or other section is edited.
- No §5 Run 20 skeleton: §5 holds one copy-and-fill template and post-run entries only (the Run 19 entry is S7-record's
  after-the-run record), so S5-record writes the Run 20 entry after the run. Accepted by the verifier.
- Rows by slice (31 ids):
  - **liveA20 (15):** R20-0, POP-BG, POP-FG, POP-OTHER, POP-NONE, ARGS-ORDER, ARGS-3, CON-DESC, CON-NOTEA, CON-CAP,
    CON-4, CON-FLOOR, ARGS-OLD, RESTORE, LOGS.
  - **liveB20 (8):** R20-0B, CHOOSE-TWICE, CHOOSE-KEPT, CHOOSE-REFUSE-DIS, G2-1, VERSION, RESTORE, LOGS (plus the
    row-less CLOSERPROBE).
  - **liveC20 (8):** R20-0C (with the found DevTools dock side), DEVT-UNDOCK, DEVT-EARLY, UP-DEVT / KEEP-4 / SWEEP-HELD
    (conditional, only for a leg that printed `devtools-refuses`), RESTORE (dock side restored and read back), LOGS
    (plus the `FLAG` record line).
- `node scripts/doc-check.mjs`: no dead path; counts `tools: 25 · router methods: 28 · codes: 27`; the only flag is the
  pre-existing `CLAUDE.md:110 5596 passed` (stale test count; for S6 or the closeout).

## 3. Verifier verdict

- Round 0: FAIL, 1 MAJOR, 7 MINOR, 3 NIT (`S5-sheet-verifier.md`, evidence `S5-sheet-verifier-doc-check.txt`). Fix round
  1 (`S5-sheet-fixer1.md`) closed all eleven.
- Round 1 re-check: FAIL, 1 new MAJOR (the dock side read where it is not observable, so its restore could not fail),
  2 MINOR, 1 NIT (`S5-sheet-verifier2.md`). Fix round 2 (`S5-sheet-fixer2.md`) closed all four.
- Round 2 re-check: **PASS-with-notes**, 3 NITs (`S5-sheet-verifier3.md`). Two fix rounds of three used.

## 4. Deviations

- No §5 skeleton (above). ARGS-OLD closes liveA20 and VERSION closes liveB20, each with a swap back and a `LOADED20`
  re-run, in place of Run 19's slices D and E, because #384 fixes three live slices. No banner rows: no R20 row
  re-measures a banner clause.
- The three round-2 NITs are not fixed in the sheet; they are carried to the S5-helpers and S5-drivers briefs (§7).

## 5. Proposed decisions

### 2026-10-29 · A DevTools row whose bridge call is refused prints FAIL and records the finding
**Decided:** a DevTools row (R20-DEVT-UNDOCK, -EARLY) whose call is refused while the control shows DevTools attached
is printed FAIL against its pre-written `ok` (#391 (1)) and recorded as the finding `devtools-refuses`, with no STOP;
it then gates the three conditional rows. **Why:** the expected text stays as written before the run. **Instead of:**
calling it PASS-as-finding. **Revisit if:** the user rules the #369 claim differently at the gate. **By:** Claude
(proposed)

## 6. Findings

- Pre-declared RECORD / NOT MEASURED / NOT REACHABLE / NOT RUN, written in the rows: R20-0 `perm`/`listener` if the
  worker console cannot evaluate; POP-OTHER `unjoined` and `human` legs; POP-NONE `blocked`; CON-NOTEA (NOT MEASURED if
  the fixture port 8081 is held or the pre-pattern read does not show the two entries; its cut-path clause NOT
  REACHABLE, S3a not run); CHOOSE-TWICE MCP leg (if the MCP serialises the calls); CHOOSE-KEPT leg `same`;
  CHOOSE-REFUSE-DIS (reachability stated first; RECORD if Chrome emits no chooser); G2-1 legs (NOT DISCRIMINATING if B
  alone cannot be captured); ARGS-OLD and VERSION (NOT RUN if the old build cannot load); DEVT rows (RECORD / NOT
  MEASURED by the control; NOT RUN if the dock side cannot be read); the conditional rows NOT RUN when neither
  condition refuses.
- Stale outside this lane (for S6 / the session agent): `mcp/CLAUDE.md` and `extension/src/CLAUDE.md` still say the
  console cap keeps the oldest lines (pre-S3b).

## 7. Handoff: the proposed split for S5-helpers and S5-drivers-A/B/C

Sizes are code plus tests, estimates; a slice that grows is split before it starts.

- **S5-helpers (~590):** `recipes/s13-forms.ts` (~220: the §4.28 line forms as pure formatters, the MCP-line judges on
  the SDK's own constants and `isError`, `busyExact` on `CHOOSER_BUSY_MESSAGE`, the newest-kept cap judge, the DevTools
  control and dock-side verdict maps, the disabled-input reachability map); `recipes/test/s13-forms.test.ts` (~280, a
  failing test first per form, with old-text mutants: the old overlap text must fail `busyExact`, the old marker the
  cap judge, a code-on-line-1 reader the MCP-line judge); new fixture `test-fixtures/s13-chooser.html` + `.js` (~90:
  `kept`, `disflip`, `disself`, `disbtn`); a recipes tsconfig entry (every `recipes/tsconfig*.json` exits 0).
- **S5-drivers-A (liveA20, ~600):** `recipes/s13-r20.ts` (shared block runner, `scan20` over the user's name, the
  sentinel and the token), `recipes/s13-r20.ps1` (wrapper over `s12-r19-lib.ps1`), `recipes/s13-r20-a.ts`, tests. Split
  A1 (R20-0, POP, ARGS-ORDER, ARGS-3) / A2 (CON, ARGS-OLD, RESTORE, LOGS) if it grows.
- **S5-drivers-B (liveB20, ~560):** `recipes/s13-r20-b.ts`, `recipes/s13-win.ps1` (window rectangles and z-order,
  numbers only), tests.
- **S5-drivers-C (liveC20, ~540):** `recipes/s13-r20-c.ts`, `recipes/s13-devt.ps1` (the bridge-independent control:
  `DevTools - …` window titles and the worker console's `getTargets()` read before the call; the dock-side read and
  restore in a tab's DevTools in window X; closing every DevTools window the wave opened), tests.
- **Reused read-only:** `recipes/s12-win*.ps1`, `s12-r19-lib.ps1`, `s12-oldbuild.ts`, `s11-rules.ts`, `s11b.ts`,
  `s9-rules.ts`, `s10-rules.ts`, the forms in `s12-forms*.ts` that pin no changed text, and the drivers' exported
  plumbing (list: `S5-sheet-builder.md` §7).
- **Needs an s13 counterpart (pins an old text or reads the wrong source):** the cap marker readers (`CAP_MARK`,
  `concapStats`/`concapLine`, `CAP_MARKER`/`conmcpStats`; S3b, #398); the second-chooser overlap judges
  (`overlapExact`/`overlapLine`, `s12-r19-b.ts`, `s12-r19-c.ts`; S4, #389); `devprobe`/`devprobeLine`/`attachedFrom`
  (#391 (1)); `loadedLine`; `hasConsoleClause` and the R19 block runner with `scan18`; the MCP-leg readers in
  `s12-r19-a.ts` / `-de.ts` and `s12-r19-c.ts` `mcpCodeOf` / `judgeMcpErr` (they read a code on line 1; corrected item:
  `S5-sheet-fixer1.md`, which supersedes the last bullet of `S5-sheet-builder.md` §7).
- **Carry into the S5-helpers / S5-drivers briefs (verifier3 NITs):** (E) §4.28 form (13) says the dock side is read
  "in the wave's own DevTools window": the driver reads it in a tab's DevTools in window X, as R20-0C says; (F) the
  driver closes the reopened docked pane after the RESTORE read-back, and window X is closed by the wave as usual;
  (G) the `SCAN20 actors` line has no row field, so the helper attributes the sentinel count to the ARGS rows.

READ list given to the builder and verifiers: the phase doc § 0.8, the dated note, § S5, Exit checks, Human gates,
STOP rules and forbidden fixes, § As built; decisions #382, #384–#398; `Stage0.md` §5 and § Measured facts;
`stage0-m2-D.txt`; e2e plan §1, §4.27, §5 header and Run 19 entry; Step 12 phase doc § Follow-ups; Step 12
`S7-run-record.md` §4–§6; `recipes/CLAUDE.md`; `docs/docs-writing-guide.md`.
