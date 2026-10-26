# S4-sheet fixer report (Step 11b, Run 17's wave sheet)

Model and effort: Sonnet 5.5, medium. Role: fixer (`docs/agent-rules.md` §6). Lane: `docs/e2e-test-plan.md` §4.24 only. Not committed.

## 1. Verdict
DONE. All 13 findings fixed; none disputed. Line numbers are in the current file (§4.24 = 1552 to 1661, 111 lines).

## 2. Per finding
- **F1 fixed** (STOP rule line 1558; RD-7 and RD-8 rows near 1624-1625). K-own and `ok` are both recorded, neither is a STOP. STOP only on proof of rendering: `CTX tab=<label> count=<n>` above 0 (worker console `chrome.runtime.getContexts`), or the options page's content read by UIA in the wave's window. Without the console, `CTX` is NOT MEASURED. RD-8's STOP is now "the tab's URL reads a `file:` URL" (Stage 0: stayed on the redirector, `ERR_UNSAFE_REDIRECT`). The `CTX` line form is added to the helper list.
- **F2 fixed** (RD-DL-HOP). `d` = median hop time minus median RD-DL-ERR time; about -300 ms means the event was in hand; within about 50 ms of 0 is #303's trigger; a positive `d` beyond 50 ms is recorded as unexplained. Still RECORD.
- **F3 fixed** (RD-REGEX, RD-LOGS). The typed console expression builds hosts and scaffolding from fragments, so no `://`, run of 24 `a`, `bank.example` or `localhost:8085` stands contiguous. The helper checks the typed text against every RD-LOGS pattern before typing and prints `STOP: console input holds a pattern` (a unit-tested rule). Regexes are compared by length and hash with `rulesOf` inside the helper's own process. RD-LOGS states that the capture includes the wave's own input. Helper item 2 names it.
- **F4 fixed** (RD-DL-SOCKET). Reworded as a no-regression row; records `HANDSHAKE during call: not exercised`; the typed-rule guard stays the unit test.
- **F5 fixed** (RD-5b, RD-DISARM). `RULES expect=<N>` with N = `countRules(found+BLK)` printed by the helper; the sample equals N.
- **F6 fixed** (RD-0 (c), F-HOME, R17-UP-OPT). RD-0 prints `uploadfolders valid=<f> invalid=<fi>` and `blocklist lines=<bl>`. F-HOME expects `<f+1>` folders with K-opt-sum's singular or plural and `<fi+4>` invalid lines. UP-OPT expects `<f+1>` folders, and `<fi+3>` invalid lines while typed, with the invalid clause only when `fi` > 0.
- **F7 fixed** (RD-BACK, RD-FWD). One flip-server request is NOT DISCRIMINATING; an answer other than `ok` or K-tab fails the row.
- **F8 fixed** (RD-5). The call starts at or after the stored-value read-back and within 1 000 ms of the press; otherwise NOT DISCRIMINATING.
- **F9 fixed** (RD-LOGS). Added `alias7=0` (R17-UP-7 (b)'s alias, passed by argument, never printed) and `sock127=<n>` (counted only inside RD-DL-SOCKET's window, must be 0 there). BLK stays `localhost:8085` and is stated as a STOP-by-design pattern: rows that land on 8085 print labels only and write no raw result to a scanned stream. I kept the alias-free BLK because an alias would still appear in any URL to the blocked page, so it would not remove the case; this is the verifier's second option.
- **F10 fixed** (RD-0 fallback). RD-CAPS-WARN's read-only typing runs first as RD-0 (a'), the record's first line.
- **F11 fixed** (helper list and fixture/row helper cells). Each item names its file, all `recipes/s11b*` (new: `s11b-r17` .ps1, `s11b` .ts with B17 `up6`, `raw`, `race`, `devt`, `ctx`, `s11b-win` .ps1 with `Open-S11bFileWindow`, `Get-S11bCaps`, `Invoke-S11bConsoleEval`, `s11b-flip` .py, `s11b-slow` .py). `s11.ts`, `s11-win.ps1`, `s11-r16.ps1` are untouched. The one out-of-lane file is `s9-redirect.py` with a tested `--delay` option, which Stage 0's audit proposed decision allows; flip moved to a new file. No item dropped. Planned files are written as `name (.ext)` so `doc-check` reports no dead path.
- **F12 fixed** (RD-REBUILD-NARROW). Sampling from 300 ms after the send to 300 ms before the reply.
- **F13 fixed** (RD-CAPS-WARN). The unquoted clause is dropped.

## 3. Checks
- K17 table untouched; no expected text edited. No test pattern, real site, user path or token added (only fixture names; `C:\Users\fixture-home` as before).
- `node scripts/doc-check.mjs`: exit 0. Last line: `Checked 36 living docs (5 closed phase docs skipped for paths and status).` Its findings are outside the lane (planned `recipes/tsconfig.s11b.json`, counts, `extension/CLAUDE.md` budget).
- §4.24 length: 111 lines (cap about 350).

## 4. Deviations and proposed decisions
None. Design-local choices (F3's pre-type check, F9's by-design STOP) sit in the sheet.

## 5. Handoff
A fresh verifier re-checks F1 to F3 and the reworded rows (RD-0 (c), RD-DL-SOCKET, RD-LOGS, RD-5, RD-5b, RD-DISARM, F-HOME, R17-UP-OPT, helper list). The scratch script is in the session scratchpad.
