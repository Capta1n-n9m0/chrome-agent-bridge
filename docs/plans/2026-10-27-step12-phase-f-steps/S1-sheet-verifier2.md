# S1-sheet — verifier report, round 2 (Step 12, `docs/e2e-test-plan.md` §4.26)

Model and effort: Claude Opus 5.5, medium. Read-only; a fresh agent. Scope: the round-1 findings (`S1-sheet-verifier.md`)
against the fixer's claims (`S1-sheet-fixer.md`), then new drift from the fixes. No Chrome, no daemon, no `npm test`.

## 1. Verdict

**PASS-with-notes.** X1, X2 and M1–M6 are fixed, and so are N1, N5, N6, N7 and N9. N2, N3, N4 and N8 were skipped, and
correctly: they are harmless and sourced, and N8 sits outside the lane. The fixes add no pass-rule drift. The only
pass-rule changes are still #320's two re-writes. Two new NITs follow (§4). R1.1's "committed" is met once the commit
lands; the sheet half of R1.2–R1.7 is met (§3).

## 2. Outputs (what I ran)

- `git diff HEAD -- docs/e2e-test-plan.md` has one hunk, `@@ -1719,6 +1719,52 @@`, with 0 removed lines and 30 non-empty
  added lines. §4.26 runs from 1722 to 1766, and `## 5. Results template` is at 1768. No other section of the file is
  touched. The other changes in the tree (`--stat`: journal, the spec, `extension/`, `shared/`) belong to S2a and the
  session agent.
- `node scripts/doc-check.mjs` exits 0: `Checked 38 living docs (5 closed phase docs skipped for paths and status).`, with
  counts `tools: 24 · router methods: 27 · codes: 27` and the known `CLAUDE.md:108  4665 passed`.
- Source pass-rule cells were read from `git show HEAD:docs/e2e-test-plan.md` at lines 1702, 1654, 1657, 1663, 1653,
  1662, 1665 and 1538, and compared with the R18 cells.

## 3. Findings re-checked

| Id | Status | Line | Evidence |
|---|---|---|---|
| X1 | **fixed** (session ruling) | 1740, 1748, 1750, 1752 | 1740: "a row's banner clause is judged by the helper on its own slice's R18-BANNER-CTL … The run-wide rule is applied by S1-record: if the control fails in either slice, every banner clause of the run … is NOT MEASURED". 1750 (R18-UP-6): "judged on this row's slice's R18-BANNER-CTL (liveA) … a FAIL of the control in the other slice makes it NOT MEASURED at S1-record". 1752 (F-RAW): "judged on liveB's own control; the run-wide rule applied at S1-record". 1754: F-RAW-2 and -DIR inherit it through "as R18-F-RAW". The decision paragraph, the control row and the preamble (1728) now agree, and the old "both slices" wording appears nowhere in §4.26 (grep). |
| X2 | **fixed** (session ruling) | 1740, 1750, 1752 | "an `IDLE` under 15 000 ms is a helper STOP printed before the row's first call (a guard of the helper, no new NOT MEASURED clause on a carried rule)". 1750: "a helper STOP before the first leg"; 1752: the same. The wait itself remains a step. |
| M1 | fixed | 1747 | The "Changes named" cell names the R17B-LOGS → R18-LOGS (liveA) reading and cites R17B-UP-L1's "the capture that holds this row's calls" and R1.6. |
| M2 | fixed | 1758 | It names UP-LOGS (1538) as the base, the RD-LOGS probes (1665, 1667) as Run 17's additions, and `other 0` as still catching them. Checked against 1538: token, non-fixture `scheme://host`, sentinel and profile counted to 0; control line else NOT MEASURED; an unfound token NOT MEASURED; non-zero is a STOP; commit only after a pass. All of these are present. The window-title drop (#283) is RD-LOGS'. |
| M3 | fixed | 1742 (6), 1749 | `invalid items <fi+3 …>`, with R17-UP-OPT's `<fi+3> invalid lines` cited. |
| M4 | fixed | 1730 | "a reporter holding a file taken from `<OUTSIDE>` or from outside ROOT; a reporter holding a file from inside ROOT where 0 is written is a FAIL of its row … not a STOP". |
| M5 | fixed | 1730, 1756 | It now sits in the STOP list as "the sheet's own guard". The UP-DEVT cell keeps only a pointer to it. |
| M6 | fixed | 1742 (5) | `data=<none\|keys:<k1,k2>>` (data keys only, never values). |
| N1 | fixed | 1750 | "word for word: per step: exact code …" (see N-a). |
| N2–N4 | not fixed, correctly | 1757, 1755, 1747 | Sourced and harmless, as round 1 found. N4 is now also named in the change cell. |
| N5 | fixed | 1742 (1) | "`<slice>` = `liveA18`\|`liveB18` (and `slice=<A\|B>` is the same slice's letter)". |
| N6 | fixed | 1724 | The header lists `netstat -ano`, `date -u`, `Get-NetTCPConnection` and `Get-Date`. |
| N7 | fixed | 1730 | "a **`CLAUDE.md` runtime invariant that would have to change**". |
| N8 | not fixed, correctly | — | It is in the builder report, which is outside the fixer's lane. |
| N9 | fixed | 1742 (4) | "`attached=yes` = control 1 answered `DEBUGGER_DEVTOOLS`". |

**No new drift.** R18-UP-6's and R18-F-RAW's clauses, R18-UP-DEVT's, and R18-UP-L1's "either allowed … mark never set"
still match their sources (1654, 1657, 1663, 1702) word for word. The only differences are dropped parentheticals,
which are not clauses. The two #320 re-writes are unchanged. **UP-OPT**: the poll runs to 15 000 ms and the bound stays
"within 5 000 ms … no conflict note; record the time" (1749 against 1653). **UP-RACE-A**: ON comes 1.6 s after the last
reply, with the rule word for word (1755). The new IDLE STOP is a guard line, so R1.7 covers it through the STOP
paragraph's ledger match.

**Exit checks, sheet half.**
- R1.2: the `CONSOLE` line plus the per-slice control clause (1738, 1758).
- R1.3: 1740 and 1748, now consistent.
- R1.4: the table and the map (1745–1760).
- R1.5: 1757.
- R1.6: 1758.
- R1.7: 1730.
- R1.1 waits for the commit.

## 4. New notes

- **N-a · NIT · `:1750`.** "per step:" is lower-case after "word for word:", while the source (1654) reads "Per step:".
  This is a case change only. No fix is needed.
- **N-b · NIT · `:1730` against `:1758`.** The STOP list names "a pattern … in a log", but no R18-LOGS count scans for a
  pattern. RD-LOGS' Chrome-owned-pattern clause and its typed-input clause are covered only by "the base rule is
  UP-LOGS", not named one by one. This is consistent with the UP-LOGS base, and Run 18 edits no block list, so it is
  not drift. The record may say that pattern leaks are not counted in Run 18.

## 5. Handoff

The step agent can accept the sheet and start the committer. R1.1 is met once §4.26 is committed, before any S1-live
observation. Nothing is running.
