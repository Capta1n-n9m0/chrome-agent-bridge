# S4-sheet builder report (Step 11b, Run 17's wave sheet)

Model and effort: Sonnet 5.5, medium. Role: builder (`docs/agent-rules.md` §6). Docs slice; no typecheck, test or build.

## 1. Verdict
DONE. `docs/e2e-test-plan.md` §4.24 is rewritten as Run 17's full wave sheet (110 lines, under the ~350 cap). Not committed (brief).

## 2. Outputs
- `docs/e2e-test-plan.md` §4.24 (lines 1552 to about 1661): retitled "R17 rows (Step 11b S4-sheet, Run 17: …)". It holds the preamble and pass rules, the STOP rule with the row-level STOPs, the fixtures-and-ports table, the slices and order (with G1, the one list group), the helper abbreviations and printed line forms, table K17 (23 expected-text keys, each with its constant name), the three long-host fixtures, 38 rows (Row, Live, Steps, Expected, Pass rule, Helper), the placeholder mapping, known limits, and "Commands S4-helpers must provide" (7 items). Nothing else was edited; §4.20 to §4.23 and §5 are untouched.
- `node scripts/doc-check.mjs`: exit 0. Last line: `Checked 36 living docs (5 closed phase docs skipped for paths and status).` Findings it prints are outside this lane: the planned `recipes/tsconfig.s11b.json` in the phase doc, the stated test count 4158 against `CLAUDE.md:112`, and `extension/CLAUDE.md` over its word budget (3733 against 3500). My first draft added five dead-path hits (planned helper files, a grep regex); I reworded them.

## 3. READ list
`docs/agent-rules.md`; phase doc `2026-10-26-step11b-block-list-redirects.md` (0.3–0.11, Stages note, S4, D4.x, Human gates, STOP rules, As built through S3b); `docs/decisions.md` #293–#303; the Run 17 notes of S0F-a, S0F-b, S3a, S3b; `stage0-audit.md` §3 and F9; `Stage0.md` §6 items 7 and 9; `docs/e2e-test-plan.md` §4.21, §4.23, §4.24 and the Run 16 record's open items (§5); `recipes/CLAUDE.md`; `recipes/s9.ts`, `s9-redirect.py`, `s9-r14.ps1`, `s11.ts`, `s11-r16.ps1`, `s11-win.ps1` (headers and function lists). Code constants re-read: `extension/src/safety.ts`, `options-model.ts`, `options.ts`, `upload-exists.ts`, `upload-paths.ts`, `upload-files.ts`, `handlers/{upload,download,history}.ts`, `debugger-errors.ts`, `errors.ts`, `tabs.ts`, `evaluate/save.ts`, `safety-dnr.ts`, `sdk/src/upload.ts`, `sdk/src/error.ts`.

## 4. Ports picked, with the evidence
`netstat -ano | grep -E "[:.](808[0-9]|809[0-9]|9234)[[:space:]]"` at 2026-10-26 20:17 UTC: no line (exit 1), 278 lines in all, so 8080–8099 and 9234 are free and the daemon is not running. Picked: 8081 allowed fixtures, 8083 immediate redirector, 8085 blocked fixture (BLK = `localhost:8085`), 8086 delayed redirector, 8087 slow allowed server, 8088 redirector to this extension's `options.html`, 8089 redirector to `file:`, 8090 deliberately unbound (the closed port), 8091 flip redirector. 8080 is deliberately not used. The sheet makes the preflight re-check them and stop on a foreign holder.

## 5. Row map (merged, renamed, dropped)
- **Merged:** RD-PERM and RD-START into RD-0 (a), (b), because the manifest read and the idle rule count are one found-state record. RD-NAV-HOP into RD-1, the same call. RD-REBUILD into RD-5b, because the in-flight rule count and 0 hits are one measurement.
- **Kept and reworded:** RD-BACK, RD-FWD, RD-BACK-SAMEDOC, RD-BACK-EMPTY, RD-DISARM, RD-DL-HOP, RD-DL-ERR, RD-DL-SOCKET, RD-REBUILD-NARROW, RD-CAPS-WARN, F-RAW, F-RAW-2, F-RAW-DIR, F-RAW-ENC, F-RAW-OK.
- **Renamed (new ids, Run 16 record untouched):** UP-L1, UP-6, UP-7, SAVE-REFUSE-R, UP-OPT, UP-RACE-A, UP-DEVT to `R17-UP-L1`, `R17-UP-6`, `R17-UP-7`, `R17-SAVE-REFUSE`, `R17-UP-OPT`, `R17-UP-RACE-A`, `R17-UP-DEVT`.
- **Added:** RD-0, RD-CTL, RD-1 to RD-8 (RD-2 RECORD; RD-7 and RD-8 RECORD with a STOP if Chrome follows), RD-5b, RD-REGEX (the `isRegexSupported` record), F-HOME, F-FILETAB, RD-RESTORE, RD-LOGS.
- **Dropped:** none.

## 6. Deviations
None. Decisions about the sheet's form, all design-local:
- Block-list edits are grouped (G1: found + BLK, saved once, read back by count and hash), not restored after every row as §4.23 did. This keeps the edits to the fewest and still restores before the next group.
- New bounds written now, before any observation: RD-BACK and RD-FWD reply within 12 000 ms (the 10 000 ms `HISTORY_SETTLE_MS` plus 2 000); R17-UP-RACE-A "no call started at or after P + 1 000 ms answers `ok`" (SAFE-3's OFF-title bound); RD-5's gap of at most 1 000 ms; the RD-DL-HOP 250 ms reading, which is recorded and not judged.
- R17-UP-OPT keeps Run 16's 5 000 ms O2 bound (Run 16 took 6 061 ms and failed); the bound is not moved.
- A block-list host counts as "test pattern" in RD-LOGS: `localhost:8085`, a run of 24 `a`, `bank.example` (all reserved or fixture names).

## 7. Proposed decisions
None to record (the choices above are design-local and sit in §4.24).

## 8. Findings
1. **RD-CAPS-WARN's placeholder ("about 90 characters") is wrong in kind.** The bound is the regex length, 119 characters (`MAX_SAFE_REGEX_CHARS`, #300), and I measured the regex as 47 + host length for a host of three labels with a non-default port. I ran `blockListRuleWarnings` (tsx, scratch script, nothing committed): hosts of three `a` labels (24, 24, 22) gave no warning, (24, 24, 23) gave `Line 2`, and adding (24, 24, 24) gave `Lines 2, 3`. The sheet uses these three hosts.
2. **S3a's RD-BACK placeholder cannot work as written.** A 302 makes the history entry the final URL, not the redirector. RD-BACK and RD-FWD therefore need a "flip" redirector (first GET answers 200, later GETs 302, `no-store`), a new `s9-redirect.py` mode listed for S4-helpers (port 8091).
3. **S3a's placeholder says `back` answers `ok` after a blocked hop. The code does not promise it.** `back` and `forward` are class `tab` (`safety.ts`), so the post-check reads the tab's URL and may answer `DOMAIN_BLOCKED` with `BLOCKED_TAB_MESSAGE`. The sheet records the answer as one of the two and judges the hit counts, the time bound and the rule count.
4. **RD-0's loaded-build proof needs a console expression entry by UIA (typing into the worker's DevTools console), which no committed helper does.** The sheet gives a behaviour-only fallback and says what it costs (D4.2 is then met by behaviour, flagged to the verifier; every `RULES` clause becomes NOT MEASURED). The step agent should treat it as the main S4-helpers risk.
5. **Phase doc 0.10 does not define RD-5b.** It comes from `stage0-audit.md` F9 and `Stage0.md` §6 item 9 and was written as such. S0F-b's RD placeholders and 0.10 otherwise agree.
6. **0.4 (C) and RD-4:** if the found block list is non-empty, RD-BACK-EMPTY is `NOT RUN` (the wave never removes found lines). RD-0 (d) stops the wave if the found list matches a fixture URL.
7. **Wave-made test state in docs:** `C:\Users\fixture-home`, `<ROOT>` and `<OUTSIDE>` are the only path-like strings; no real site, token or user path appears in the sheet.

## 9. Handoff
No process left running; no file other than §4.24 and this report was edited (the scratch scripts are in the session scratchpad, uncommitted). Next: S4-helpers builds the 7 commands listed at the end of §4.24, then a verifier checks the sheet against the constants before the sheet is committed (D4.1 needs it committed before any observation). `docs/plans/2026-10-26-step11b-block-list-redirects-steps/journal.md` was already modified before this slice and is left alone.
