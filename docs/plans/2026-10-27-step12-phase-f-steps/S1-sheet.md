# S1-sheet — Run 18's wave sheet, §4.26 (step report)

Step agent: Claude Opus 5.5, effort medium. Risk: low. Builder: Sonnet, medium. Verifiers: Opus, medium (two rounds). Fixer: Sonnet, medium (one round). Committer: Sonnet, medium.

## 1. Verdict

DONE. §4.26 was written before any observation. No Chrome, no daemon and no tests were run.

## 2. Outputs

- `docs/e2e-test-plan.md` §4.26, "R18 rows", lines 1722–1766. The section sits between §4.25 and §5. The diff is one hunk, `@@ -1719,6 +1719,52 @@`, and removes no lines.
- Rows: R18-0, -UP-L1, -BANNER-CTL, -UP-OPT, -UP-6, -SAVE-REFUSE, -F-RAW, -F-RAW-2, -F-RAW-DIR, -UP-RACE-A, -UP-DEVT, -RESTORE and -LOGS.
- The sheet also holds the STOP lines, one console capture file per slice, the helper line forms for S1-helpers-a and -b, and the aggregator fixes.
- Each slice's control line, quoted as expected text: `safety: disarmed by the user`.
- Ports: the builder read `netstat -ano` at 2026-10-27 15:21 UTC. The sheet uses 8081 and avoids 8082 and 9234. Verifier 1 re-read the ports at 15:28:47 UTC.
- `node scripts/doc-check.mjs`: exit 0, `Checked 38 living docs (5 closed phase docs skipped for paths and status).`
- Leaf reports, all in this dir:
  - `S1-sheet-builder.md`, which maps each carried row to its source row
  - `S1-sheet-verifier.md`, round 1: FAIL with X1, X2 (MAJOR), M1–M6 and N1–N9
  - `S1-sheet-fixer.md`
  - `S1-sheet-verifier2.md`, round 2: PASS-with-notes
- Commit: the committer's hash. The session agent records it in the journal, because this report is part of that commit.

## 3. Verifier verdict

**PASS-with-notes** (`S1-sheet-verifier2.md`), after one fix round. Every carried pass rule matches its source row word for word, except #320's two re-writes:
- **UP-OPT:** the poll runs to 15 s, and the bound stays 5 000 ms.
- **UP-RACE-A:** the ON press is timed from the last call's reply.

Two NITs remain open, and neither needs a fix:
- **N-a:** "per step:" is lower case at line 1750.
- **N-b:** the STOP list names a pattern leak, but no R18-LOGS count looks for one. The S1-record can say that pattern leaks are not counted in Run 18.

## 4. Deviations

None from the brief.

I ruled on round 1's two MAJORs as the conservative, design-local fixes:
- **X1:** each banner clause is judged on the R18-BANNER-CTL of its own slice. S1-record applies the run-wide rule: a failed control in either slice makes every banner clause NOT MEASURED.
- **X2:** an idle under 15 000 ms before a banner row is a helper STOP before the row's first call. It is not a new NOT MEASURED clause on a carried rule.

## 5. Proposed decisions

### 2026-10-27 · The banner control is judged per slice, and the record applies the run-wide rule
**Decided:** a banner clause is judged on its own slice's R18-BANNER-CTL. S1-record then marks every banner clause NOT MEASURED if either slice's control failed. **Why:** phase doc 0.3 says only that a failed control voids the banner clauses. Requiring both slices would void liveA's clauses whenever liveB never runs, and a helper cannot know liveB's result when it prints liveA's verdict. **Instead of:** "judged only if the control passed in both slices". **Revisit if:** Run 18 has one slice's control pass and the other's fail. **By:** Claude (proposed)

### 2026-10-27 · Too short an idle before a banner row is a STOP, not NOT MEASURED
**Decided:** the wait of at least 15 s before a banner row stays a step. An `IDLE` under 15 000 ms makes the helper print STOP before the row's first call. **Why:** adding a NOT MEASURED case to a carried rule would be a pass-rule change beyond #320's two re-writes. **Instead of:** a new NOT MEASURED clause. **Revisit if:** the STOP fires in Run 18. **By:** Claude (proposed)

## 6. Findings

These are the builder's open items, all accepted by verifier 1 except the two folded into X1 and X2:
- **Banner tail:** R17-UP-6 writes a 2 500 ms tail after the reply, but `recipes/s11-win.ps1:30` uses 4 000 ms. The sheet keeps 2 500 ms, the source row's value. S1-helpers must make the helper match the sheet.
- **UP-RACE-A:** the loop ends at the 120-call cap.
- **UP-DEVT:** no source says how to make DevTools attach where F12 did not (G-22). The sheet leaves the method to S1-helpers and judges only by the K-devt control.
- **Build under test:** S2a is building product code in this tree. The record must state HEAD. If S1-live is meant to test the build without S2a, it should run before S2a lands. That is the session agent's call on order.

## 7. Handoff

Nothing is running, and no PIDs or watchers are left.

S1-helpers-a and -b build the line forms §4.26 names, including:
- `VERDICT_LINE` with multi-token row ids
- the history set-up lines written to the record
- no row printed twice
- the `IDLE` STOP
- the `RAW … data=<none|keys:…>` form

S1-live then runs against the sheet unchanged, since the expected text is fixed by this commit.

READ list given to the children: phase doc §0.3, § S1, R1.1–R1.7, § Human gates, § STOP rules, § Stage 0 notes; Stage0.md §6; stage0-audit-2.md §3 and §5 G-21–G-24; S7-run-record.md §1 and §5; #320, #329, #339; recipes/CLAUDE.md; env-checker.md; e2e-test-plan.md §4.23, the cited §4.24 rows, §4.25 and §5 Run 17b (by grep).
