# S1-sheet — verifier report (Step 12, Run 18's wave sheet, `docs/e2e-test-plan.md` §4.26)

Model and effort: Claude Opus 5.5, medium. Read-only; no Chrome, no daemon, no `npm test` (S2a edits product code in
this tree, per the brief).

## 1. Verdict

**FAIL**: 2 MAJOR, 6 MINOR, 9 NIT. Both MAJORs are in how R18-BANNER-CTL's result is applied to the carried banner
clauses (R18-UP-6, and through "as R18-UP-6's" R18-F-RAW, -F-RAW-2 and -F-RAW-DIR). The two #320 re-writes are as
#320 and 0.3 state. Every other carried pass rule matches its source in substance. The STOP, port, capture, restore
and gate texts are present and correct. The fixes are small, one or two sentences each.

## 2. Outputs (what I ran)

- `git diff HEAD --stat` gives `docs/e2e-test-plan.md | 46 +`, `journal.md | 2 +`, `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md | 48 +` and `shared/src/protocol.ts | 9 +`. The last two belong to S2a and the journal lines to the session agent (15:19Z entries). The e2e plan diff is one hunk, `@@ -1719,6 +1719,52 @@`, entirely inside the new §4.26 (lines 1722–1766). No line of §4.23–§4.25 or §5 changed.
- `node scripts/doc-check.mjs` exits 0: `Checked 38 living docs (5 closed phase docs skipped for paths and status).` Counts: `tools: 24 · router methods: 27 · codes: 27`. `CLAUDE.md:108  4665 passed`.
- Ports, my own run: `date -u` gives `Tue, Oct 27, 2026 3:28:47 PM` (PowerShell `2026-10-27 15:28:47Z`). `netstat -ano` gives 306 lines, and the grep for local ports `80[89]x`/`9234` matched nothing (exit 1). `Get-NetTCPConnection` shows `0.0.0.0 8082 Bound 25896` and nothing on 8080, 8081, 8083 or 9234. This agrees with the sheet (1734): 8081 chosen, 8082 and 9234 avoided, 8080 unused (#273).
- Line map checked. Each source line the "as" paragraph (1726) cites holds the named row: 1701, 1702, 1629, 1512, 1653, 1514, 1654, 1516, 1656, 1518, 1657–1659, 1662, 1535, 1663, 1532, 1664, 1665, and the dated note at 1667.
- Control line: `extension/src/badge.ts:71` reads `disarmed: "safety: disarmed by the user"`. This is the same text as 0.3, and the sheet quotes it exactly (1738, 1758).
- Not judged here: R1.1's "committed". §4.26 is still uncommitted, so R1.1 is met only after the commit, which comes after the fixes below.

## 3. Carried rows: source and drift

| R18 row | Source chain | Pass rule | Steps / expected |
|---|---|---|---|
| R18-0 | R17B-0 (1701) | Verbatim ("R17B-0's pass rule, unchanged") plus a new (g) `tree=clean` STOP. (g) is new-row text, sourced from § S1 "main-tree build of committed code". | Verbatim plus (g) |
| R18-UP-L1 | R17B-UP-L1 1702 → R17-UP-L1 1629 → UP-L1 1512 | **Drift (MINOR M1).** R17B reads "if R17B-LOGS does not run or reads NOT MEASURED, … FAIL". R18 reads "if R18-LOGS **(liveA)** does not run or reads NOT MEASURED". The change is not named in the row's "Change named" cell. Everything else is verbatim (`either allowed is a STOP; both refusals exact, no data; reporter 0 files; mark never set`). | Expected adds ", no `data`" (N4). The `RAW` line is a helper print (G-23). |
| R18-UP-OPT | R17-UP-OPT 1653 → UP-OPT 1514 | **Re-write 1, as #320/0.3**: the poll ends at 15 000 ms, `shown`/`at` are recorded, and the bound stays "within 5 000 ms … no conflict note: record the time". Only the parenthetical is updated (adds Run 17b's 6 105 ms). | Step "O2 polled" re-written as #320. Expected adds `OPT observed … invalid items 3` (MINOR M3). |
| R18-UP-6 | R17-UP-6 1654 → UP-6 1516 | Clauses verbatim. "Per step:" dropped (N1). **Added (MAJOR X1, X2):** "judged only if R18-BANNER-CTL passed in both slices and the first leg's `IDLE` ≥ 15 000, else NOT MEASURED". | Window verbatim (500 ms before, 2 500 ms after, no other call in flight). The IDLE wait is added as a step (acceptable as a step). |
| R18-SAVE-REFUSE | R17-SAVE-REFUSE 1656 → SAVE-REFUSE-R 1518 | Clauses verbatim (equality, selective prefix, containment, `[browser_evaluate]`, no file and no `.part`). The added "if R18-LOGS (liveA) is NOT MEASURED the row is NOT MEASURED" is sourced: S7-run-record §1 judged R17B-SAVE-REFUSE exactly so. **Acceptable** (open item 3). | Expected adds "unprefixed" (from SAVE-REFUSE-R's rule) and the `LEG` lines (helper forms). |
| R18-F-RAW | F-RAW 1657 | **Verbatim**, word for word, including "(window as R17-UP-6)" and the slash/backslash/JSON-escaped forms. Carries X1 and X2 through "the banner clause as R18-UP-6's". | Steps verbatim. The control and IDLE come first. |
| R18-F-RAW-2 | F-RAW-2 1658 | Verbatim ("as R18-F-RAW; the present first file does not reach the page either (0 files)"). Same X1 and X2. | Verbatim |
| R18-F-RAW-DIR | F-RAW-DIR 1659 | Verbatim. Same X1 and X2. | Verbatim |
| R18-UP-RACE-A | R17-UP-RACE-A 1662 → UP-RACE-A 1535 | **Verbatim** clauses. Only parentheticals are dropped ("Run 16's loop ended before the press", "the known limit …"). **Re-write 2, as #320/0.3** (ON timed from the last reply), and it sits in the steps. | The loop end at the 120 cap is within R17's "at most 120" (open item 2, acceptable). Expected adds "on every later call" (N3). |
| R18-UP-DEVT | R17-UP-DEVT 1663 → UP-DEVT 1532 | Clauses verbatim. **Added:** "a DevTools window left open is a STOP" (MINOR M5). | "F12" becomes "the method is the helper's" (G-22, sourced by the Stage 0 note). The `DEVT` expected line is a helper form. |
| R18-RESTORE | RD-RESTORE 1664 / R17B-RESTORE (1716) | Verbatim ("all five equal to … of the same slice; any mismatch is a STOP that escalates"). | Expected adds "except the empty text's e3b0…" (N2, sourced from UP-0 1513). |
| R18-LOGS | RD-LOGS 1665 (+1667) / UP-LOGS 1538 | Per-slice control and NOT MEASURED clauses as 0.3. **Drift (MINOR M2):** RD-LOGS' probes `localhost:8085`, `a…a`, `bank.example`, `alias7` and `sock127`, its Chrome-owned-pattern clause and #306's `chrome-blocked` note are dropped. They are named as a change but justified by no cited source. The rule that remains is UP-LOGS's word for word plus #283's window-title drop. | Expected drops the same probes. |

## 4. Findings

**X1 · MAJOR · `docs/e2e-test-plan.md:1750` (and 1752–1754 through "as R18-UP-6's").**
- **Problem:** "judged only if R18-BANNER-CTL **passed in both slices**" adds a NOT MEASURED case that no source states. Phase doc 0.3 says "If the control **fails**, every banner clause of the run is NOT MEASURED". Under the sheet's own branch at 1736, a toggle that reads OFF means liveB18 never starts and its control never runs. "Both slices" would then make R18-UP-6's banner clause NOT MEASURED even when liveA's control passed. That contradicts the sheet's own decision paragraph (1740: "a slice whose control did not run reads **its own** banner clauses NOT MEASURED") and the preamble (1728: "made NOT MEASURED by a **failed** R18-BANNER-CTL").
- **It also cannot be implemented as written:** 1742 requires each row to print exactly one `ROW` line per slice, but liveA's helper cannot know liveB's control result when it prints R18-UP-6's verdict.
- **Fix:** replace "passed in both slices" with: "R18-BANNER-CTL passed in this row's slice; a FAIL of the control in the other slice makes it NOT MEASURED at S1-record (0.3: every banner clause of the run); a slice that did not start changes nothing." Then the helper judges on its own slice, and the record applies the run-wide rule.

**X2 · MAJOR · `docs/e2e-test-plan.md:1740` (last sentences), 1750, 1752.**
- **Problem:** "a shorter idle makes that row's banner clause NOT MEASURED" is a new NOT MEASURED clause on carried pass rules (R17-UP-6, F-RAW). G-21 raises only the control's negative-leg wait to 15 s. No source attaches an NOT MEASURED consequence to the banner rows' idle. The brief's rule therefore makes this a MAJOR finding. It opens a path from a "banner seen" FAIL to NOT MEASURED.
- **What stays:** the wait itself is a justified step, because the positive leg attaches right before the banner rows and 0.3 itself cites the 3–14 s linger.
- **Fix:** keep the wait as a step and the `IDLE` line as a record. Make an `IDLE` under 15 000 ms a helper guard that prints `STOP` before the row's first call, which binds the existing STOP rule and changes no pass rule. Alternatively, have the session agent record a dated decision citing G-21 before the sheet is committed.

**M1 · MINOR · `:1747`.**
- **Problem:** R18-UP-L1 narrows R17B-UP-L1's FAIL trigger from "R17B-LOGS" to "R18-LOGS (liveA)" without naming the change.
- **Why it is supportable:** R17B-UP-L1's own text, "the capture that holds this row's calls", together with R1.6, "R18-LOGS … in each slice", supports the narrowing.
- **Fix:** add it to the "Change named" cell with those two citations, or keep R17B's whole-row wording.

**M2 · MINOR · `:1758`.**
- **Problem:** dropping RD-LOGS' probes is a pass-rule change beyond #320's two re-writes. It is defensible only because the Run 16 source row UP-LOGS (1538) has no such probes.
- **Fix:** name UP-LOGS as the base rule, quote it, and state that RD-LOGS' redirect-fixture probes (1665, 1667) were Run 17's additions for fixtures Run 18 does not start. Also state that each URL probe is still caught by `other 0`.

**M3 · MINOR · `:1749`, `:1742` (6).**
- **Problem:** `OPT observed … invalid items 3` assumes the found Upload folders have `fi = 0`. R17-UP-OPT's own expected text while the lines are typed is `<fi+3> invalid lines`.
- **Fix:** write `invalid items <fi+3>`, or state that the count covers the three typed lines only.

**M4 · MINOR · `:1730`.**
- **Problem:** "a reporter holding a file where 0 is written" counts as "a file reaching a page from outside the Upload folders". That turns in-ROOT failures into STOPs: R18-F-RAW-2's `s11-1k.bin`, and R18-UP-DEVT's `<ROOT>\s11-1k.bin`. The phase doc lists such failures under "Continues anyway: a carried Run 18 row that fails with a passing control".
- **Fix:** limit the STOP to a file from `<OUTSIDE>` or from outside ROOT.

**M5 · MINOR · `:1756`.**
- **Problem:** "a DevTools window left open is a STOP" is added to a carried pass-rule cell, and no source names it. The phase doc's human gates say only that DevTools is "opened only in a window the wave opened". The STOP list names native dialogs.
- **Fix:** move it to the STOP paragraph (1730) as the sheet's own guard, or drop it.

**M6 · MINOR · `:1742` (5).**
- **Problem:** `RAW … data=<none|…>` leaves the printed form open. A `data` payload printed raw could carry a path, which is a STOP item.
- **Fix:** `data=<none|keys:<k1,k2>>`.

**NITs:**
- N1 · `:1750`: "Per step:" is dropped from R17-UP-6's rule.
- N2 · `:1757`: the empty-hash exception is added to RD-RESTORE's expected text. It is sourced from UP-0 1513 and is harmless.
- N3 · `:1755`: "on every later call" is added to the expected text.
- N4 · `:1747`: "no `data`" is moved into the expected text.
- N5 · `:1742`: slice naming is inconsistent: `<slice>` = `liveA18`, but `slice=<A|B>` elsewhere.
- N6 · `:1724`: the header says that only `netstat` and `date` ran, yet `Get-NetTCPConnection` and `Get-Date` are cited at 1734.
- N7 · `:1730`: the phase doc's "a `CLAUDE.md` runtime invariant that would have to change" is not in the STOP list.
- N8: the builder report's §6 has 8 items, not seven.
- N9 · `:1742` (4): it is not said how `attached=<yes|no>` is derived. Since the row is judged by control 1's K-devt, write `attached` = control 1 answered `DEBUGGER_DEVTOOLS`.

## 5. Brief checks

- **R18-BANNER-CTL (1740, 1748):** two legs, negative first, ≥ 15 s idle (G-21); positive = one `evaluate` of `1`; neg `none` and pos `seen`, as 0.3. The sheet adds `answer=ok` and `idle-ms` ≥ 15 000 to this new row's rule, which is acceptable. The rule "a failed control means every banner clause NOT MEASURED, the other clauses judged as written" matches 0.3, apart from X1's inconsistency. The G-24 wording ("attach no debugger") is used.
- **Capture files** (1738): `console-liveA18.txt` and `console-liveB18.txt`, committed as `S1-live-console-liveA18.txt` and `S1-live-console-liveB18.txt`. There is a guard against different paths and an overwrite. The control line `safety: disarmed by the user` is exact and is quoted from the slice's own file (R1.2).
- **Restore** (1730, 1757): by count and hash, with hashes not printed (except the public empty hash, N2).
- **STOP rule** (1730): in #193 form plus the phase doc's binding items. The forbidden fixes are listed. The rule against a helper fix past a STOP is stated, and R1.7's ledger match is stated.
- **Loaded-build proof** (1746): R18-0 is the first line of each slice and has the clean-tree check (g).
- **Gates** (1732): fixture pages only, the file-URL toggle read and never pressed, DevTools only in window X, the block list not edited.
- **Ports** (1734): checked above.
- **Helper line forms** (1742): concrete enough to build and to test by key, apart from M3, M6, N5 and N9.
- **Carried-row set:** complete against 0.3 and S7-run-record §1. All seven FAIL rows (UP-L1, UP-OPT, UP-6, F-RAW, -2, -DIR, UP-RACE-A) and all three NOT MEASURED rows (UP-DEVT, SAVE-REFUSE, LOGS) are present, plus R17B-0 and RESTORE. G-22, G-23 (four items) and G-24 are all present. "Not carried" is correct: UP-7, F-RAW-ENC and F-RAW-OK passed. S7 §5 items 7 and 8 are covered.
- **Nothing outside §4.26:** confirmed (§2).

## 6. The builder's open items (report §6)

1. Tail of 2 500 ms rather than the helper's 4 000: **acceptable**. 2 500 ms is R17-UP-6's written window, which F-RAW cites. The 4 000 ms tail was §4.23's. The record must note that Run 17b's tail was the helper's.
2. The UP-RACE-A loop ending at the 120 cap: **acceptable**. It is the source's own maximum, Run 17b's driver ran 120 calls, and it is not a new stop condition.
3. The SAVE-REFUSE console clause read as NOT MEASURED: **acceptable**, citing S7-run-record §1. See M1 for the matching UP-L1 wording.
4. A ≥ 15 s idle before every banner row: **the wait is acceptable; its NOT MEASURED consequence is X2.**
5. The build under test (S2a in the tree): **acceptable** for the sheet. The session agent must hold S1-live to a HEAD it chooses, and (g) records it.
6. The carried set taken from 0.3 and S7 §1: **acceptable**. Verified complete.
7. G-22, with the attach method left to the helper: **acceptable**. The Stage 0 note sources it, and the row is judged by K-devt alone (see N9).
8. A failed control in either slice means NOT MEASURED for every banner clause: **acceptable as 0.3's literal reading**, but R18-UP-6's "both slices" contradicts it (X1).

## 7. Handoff

- **Fixer:** X1, X2, M1–M6 and, optionally, the NITs. All are confined to `docs/e2e-test-plan.md` 1722–1766.
- **Re-check:** a fresh verifier re-checks only those lines.
- **R1.1:** waits for the commit after the fixes.

Nothing is running.
