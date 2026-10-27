# S1-sheet — builder report (Step 12, Run 18's wave sheet)

Model and effort: Sonnet 5.5, medium. Docs only; no Chrome, no daemon, no npm test (S2a is editing code in this tree).

## 1. Verdict
DONE. R1.1 and the sheet half of R1.2–R1.7 are written. Open items are listed in section 6.

## 2. Outputs
- `docs/e2e-test-plan.md` new **§4.26 "R18 rows"**, lines **1722–1766** (45 long lines, +46 with the trailing blank line; `git diff --stat`: 46 insertions, 0 deletions), between §4.25 and `## 5. Results template` (now line 1768). No other section edited.
- `node scripts/doc-check.mjs`: exit 0, `Checked 38 living docs (5 closed phase docs skipped for paths and status).` Its one listed item, `CLAUDE.md:108  4665 passed`, is the test-count check and is unchanged.
- Ports: `netstat -ano` at **2026-10-27 15:21 UTC** (`date -u` printed `3:21:44 PM`; PowerShell UTC 15:21:48), 296 lines, 8080–8099 and 9234 empty. `Get-NetTCPConnection` shows 8082 "Bound" (PID 25896, no listener) — avoided. **Chosen: 8081 only** (no carried row needs a second server). Other listeners seen and unused: 9180, 9222.
- Rows written: R18-0, R18-UP-L1, R18-BANNER-CTL, R18-UP-OPT, R18-UP-6, R18-SAVE-REFUSE, R18-F-RAW, R18-F-RAW-2, R18-F-RAW-DIR, R18-UP-RACE-A, R18-UP-DEVT, R18-RESTORE, R18-LOGS. Also written: STOP rule (#193 plus the phase doc's), human gates, console capture per slice (`console-liveA18.txt`, `console-liveB18.txt`; control line `safety: disarmed by the user`, `extension/src/badge.ts` `disarmed`), banner control and its decision rule, the helper line-form contract (S1-helpers-a and -b, with the aggregator fixes), exit-check map.

## 3. Carried rows: source and line (lines in `docs/e2e-test-plan.md` before this insert)
| R18 row | Source rows (line) | Verbatim? |
|---|---|---|
| R18-UP-L1 | R17B-UP-L1 (1702) → R17-UP-L1 (1629) → UP-L1 (1512) | verbatim; `RAW` line added (G-23); console clause tied to R18-LOGS as R17B wrote |
| R18-UP-OPT | R17-UP-OPT (1653) → UP-OPT (1514) | **re-write 1 (#320): poll to 15 s, records whether and when; 5 000 ms bound kept** |
| R18-UP-6 | R17-UP-6 (1654) → UP-6 (1516) | verbatim; banner clause gated by R18-BANNER-CTL (#320) |
| R18-SAVE-REFUSE | R17-SAVE-REFUSE (1656) → SAVE-REFUSE-R (1518) | verbatim; console consequence written (see Findings) |
| R18-F-RAW / -F-RAW-2 / -F-RAW-DIR | F-RAW 1657, F-RAW-2 1658, F-RAW-DIR 1659 | verbatim; banner clause gated |
| R18-UP-RACE-A | R17-UP-RACE-A (1662) → UP-RACE-A (1535) | **re-write 2 (#320): ON pressed 1.6 s after the last call's reply** |
| R18-UP-DEVT | R17-UP-DEVT (1663) → UP-DEVT (1532) | verbatim; the helper's attach method is S1-helpers-a's (G-22) |
| R18-RESTORE | RD-RESTORE (1664); R17B-RESTORE (carried para, 1716) | verbatim |
| R18-LOGS | RD-LOGS (1665, note 1667); R17B-LOGS (1716) | verbatim minus the probes for fixtures that do not run (8085, long host, `bank.example`, `alias7`, `sock127`, `chrome-blocked`) |
| R18-0 (new) | R17B-0 (1701) | (a)–(f) unchanged, plus (g) `HEAD <12 hex> tree=clean` |
| R18-BANNER-CTL (new) | phase doc 0.3, G-21 (negative leg at least 15 s) | new |

Chosen convention: "as R17B `<id>`" with the §4.24 / §4.23 chain named by line, not quoted in full.

## 4. Deviations
None from the brief. Size: 45 lines, well under the cap.

## 5. Proposed decisions
None (design-local choices are in section 6).

## 6. Findings and open items (for the session agent; also in §4.26's last paragraph)
1. **Banner window conflict:** R17-UP-6 writes the tail as 2 500 ms after the reply; the helper's `$S11SampleTailMs` is 4 000 ms (`recipes/s11-win.ps1:30`). The sheet takes the written 2 500 ms; S1-helpers-a must set it per row.
2. **UP-RACE-A loop end:** the sources give "at least 60, at most 120" and no stop rule. The sheet ends the loop at the 120 cap so ON follows every call. A verifier should confirm this is not read as a third pass-rule change.
3. **SAVE-REFUSE's console clause:** I wrote that the row is NOT MEASURED if R18-LOGS (liveA) is NOT MEASURED, as S7-run-record judged R17B-SAVE-REFUSE. R17's text did not state this; marked "written now, not a change of the rule".
4. **Design-local numbers taken from sources:** the idle before every banner row's first step is at least 15 s (G-21's number, applied to the first leg of each banner row so the control's own banner cannot bleed into it); the negative leg has an empty "step" (window = the 500 ms lead plus the 2 500 ms tail).
5. **Build under test:** S2a edits product code in this tree; R18-0 (g) records HEAD. The phase order puts S1-live before S2a lands; the session agent should hold that.
6. **Stage0.md §6 names no carried row by id.** The set is phase doc 0.3 plus the FAIL and NOT MEASURED rows of S7-run-record §1. Not carried: UP-7, F-RAW-ENC, F-RAW-OK (passed in Run 17b).
7. **G-22:** no source says how to make DevTools attach where F12 did not; the sheet leaves the method to the helper and judges only by K-devt.
8. The banner-control rule makes a failed control in either slice (or a slice where it did not run) turn every banner clause of the run NOT MEASURED, the literal reading of the phase doc.

## 7. Handoff
Nothing running. Not committed (the brief says no). The sheet must be committed before S1-live starts (clean-tree guard, agent-rules §10). S1-helpers-a and -b build to the "Line forms the helpers print" paragraph of §4.26. `docs/plans/2026-10-27-step12-phase-f-steps/journal.md` was already modified in the tree before this slice and was not touched.
