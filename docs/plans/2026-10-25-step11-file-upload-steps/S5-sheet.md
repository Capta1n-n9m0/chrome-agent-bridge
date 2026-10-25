# S5-sheet — Run 16's rows, `docs/e2e-test-plan.md` §4.23 (step report)

Step agent: Claude Opus 5.5. Risk: low (docs only). Date: 2026-10-25.

## 1. Verdict

**DONE.** §4.23 sits after §4.22 and before §5 (`docs/e2e-test-plan.md` lines 1445–1540, +96 lines, 0 removed;
one table line per row as in §4.22, about 29 KB, so under the 150–250 line guide by form, not by content).
Final verifier verdict: **PASS-with-notes** (verifier3).

## 2. Outputs

- `docs/e2e-test-plan.md` §4.23: pass rules, the STOP rule and the liveA/liveB order (#271); the
  G11-3 branch (17 rows "NOT RUN — waits for G11-3", plus the rows that still run); a K-constants table
  (exact text + `file:line` of each throwing constant, no prefix, #246/#254); 27 rows with Live, Steps (helper
  placeholders only), Expected text and Pass rule; SW-2 with 0.14 (c)'s outcome table verbatim and the warm-up
  excluded; UP-RESTORE with read-back by count and hash at the end of each slice (S5.4); the map of S3.md §7's twelve.
- Reports in this dir: `S5-sheet-builder.md`, `-verifier.md`, `-fixer.md`, `-verifier2.md`, `-fixer2.md`,
  `-verifier3.md`.
- Typecheck/test/build: not run (docs only); `git diff --stat` shows only `docs/e2e-test-plan.md` for this slice
  (the one-line `journal.md` edit is the session agent's, pre-existing, not committed here).

## 3. Verifier findings by round (Sonnet-built slice)

| Round | Verifier | Verdict | Findings |
|---|---|---|---|
| 1 | `S5-sheet-verifier.md` | FAIL | MAJOR F1: UP-L1 expected K-notarget, but the gate refuses first (K-gate) before UP-OPT → liveA would STOP on row 1. MAJOR F2: UP-6's `..` step went through the SDK's `realpath`, so it never reached the dot-segment check; `<OUTSIDE>` undefined. MINOR F3: UP-9 is gate-decided yet waits for G11-3. MINOR F4: "the helper test is the authority" let expected text drift. MINOR F5: UP-OPT summary named no moment. NIT: K-opt-stand cite off by one. |
| 2 | `S5-sheet-verifier2.md` | PASS-with-notes | F1–F5 and the NIT fixed and correct against the code (K-notarget moved to UP-6, a liveA row, after UP-OPT). New MINOR M1: nothing checked that the found Upload folders text allows neither `<ROOT>` nor `<OUTSIDE>`. NIT N1: UP-L1's refusal proves S2's gate, not S3's handler. |
| 3 | `S5-sheet-verifier3.md` | PASS-with-notes | M1 and N1 fixed (preflight `FOUNDCHECK root=not outside=not` before any state change; booleans only). NIT open: name `parseUploadFolders` / `uploadPathsAllowed` (imported, not copied) for the helper — left to S5-helpers. |

## 4. Agents

| Agent | Model, effort | Start (UTC) | End (UTC) |
|---|---|---|---|
| builder | Sonnet 5.5, medium | 19:58:40 | 20:02:09 |
| verifier | Opus 5.5 | 20:02:30 | 20:06:13 |
| fixer (round 1) | Sonnet 5.5, medium | 20:06:40 | 20:07:34 |
| verifier2 | Opus 5.5 | ~20:07:45 | 20:09:39 |
| fixer2 (round 2) | Sonnet 5.5, medium | ~20:09:55 | 20:10:28 |
| verifier3 | Opus 5.5 | ~20:10:35 | 20:11:21 |
| committer (fixer2's lane, commit only) | Sonnet 5.5, medium | see commit | see commit |

Builder context use (its own report): about 110k tokens. Ends are the report files' write times.

## 5. Deviations

- The builder did not use the salvage patch as written (it named helpers and files that do not exist and ran over
  size); it rewrote §4.23 and corrected several off-by-one line cites.
- Round 2 fixed a MINOR finding of a PASS-with-notes verdict before committing, because the sheet is
  pre-registered and a set-up flaw found later would have to become a new row.

## 6. Proposed decisions

### 2026-10-25 · UP-9 keeps waiting for G11-3 because 0.12 lists it there
**Decided:** UP-9 stays in the 17-row waiting list, and the sheet says the reason is phase doc 0.12, not the code
order (its refusal is the gate's). **Why:** this slice's lane excludes the phase doc. **Instead of:** moving it to
liveA (waiting list 16). **Revisit if:** the session agent amends 0.12 with a dated note. **By:** Claude (proposed)

### 2026-10-25 · Builder's four sheet choices, endorsed by the verifier
**Decided:** UP-0, UP-RESTORE and UP-LOGS run in both liveA and liveB; SAVE-REFUSE-R's control is judged by the
`[chrome.debugger] ` prefix plus `boom`; the MCP leg is judged by containment; the option-page texts are fixed in the
K table now. **Why:** each slice must leave the safety state as found; the control's text is CDP's, not ours; the
MCP framing is not part of the constants. **Revisit if:** the MCP framing becomes a pinned constant. **By:** Claude (proposed)

## 7. Findings / handoff

- For S5-helpers: build `foundcheck` by importing `parseUploadFolders` and `uploadPathsAllowed` from
  `extension/src/upload-paths.ts` (verifier3 NIT); every helper name in §4.23 is a placeholder to match.
- Nothing running from this slice; the daemon (PID 14072) was not touched.
