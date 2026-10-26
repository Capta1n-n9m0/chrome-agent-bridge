# S4-helpers — Run 17's live helpers (step report)

Step agent: Claude Opus 5.5, medium effort. Risk: low (recipes and fixtures). Children: eight builders H1–H8 (Sonnet,
medium), verifiers 1–4 (Opus, medium), fixers 1–2 (Sonnet, medium), fixer 3 (Opus, medium, the third round §7 allows),
committer (Sonnet, medium).

## 1. Verdict
DONE. Every command of `docs/e2e-test-plan.md` §4.24's closing list exists in `recipes/s11b*`, with tests or dry-run
lines, proven offline only (unit tests, servers on ephemeral ports, `--dry`, `--expr`/`--read` on fixture dumps,
`-Block plan`, PowerShell parse checks). Nothing drove Chrome, the extension or the daemon. The commit hash is in the
committer's hand-back.

## 2. Outputs
- New: `recipes/s11b-delay.py` (8086), `s11b-flip.py` (8091), `s11b-slow.py` (8087); `s11b-rules.ts` (hit counter, K17
  ties, console expressions and parsers, RD-REGEX fragment builder with its in-process `rulesOf` proof, the stored judge,
  row judges, the Run 17 scanner `scan17`); `s11b.ts` (`B17`: manifest, rules, regex, ctx, stored, hits, ctl, scan,
  foundlist, back, forward, history, socket, race, devt, up6, raw, filetab, call, judge-*); `s11b-win.ps1` +
  `s11b-win-rules.ts` (`Invoke-S11bConsoleEval` / `Start-` / `Complete-`, `Open-S11bWindow`, `Open-S11bFileWindow`,
  `Get-S11bCaps`, race and sampler drivers); `s11b-r17.ps1` + `s11b-r17-plan.ts` (every row block, liveA/liveB,
  the G11-3 gate, the RD-0 FALLBACK branch, the STOP map); `recipes/tsconfig.s11b.json`; 16 test files `recipes/test/s11b-*`.
- Changed: `recipes/tsconfig.s6.json` exclude line only (its `test/*.test.ts` glob would pull the chrome-typed s11b tests,
  the same remedy as s9/s10/s11).
- Numbers (verifier4, re-run): `npm test` 4158/161 before → **4472 passed / 177 files** (+314 tests, +16 files, none
  removed); all seven `recipes/tsconfig*.json`, `npm run typecheck`, `npm run build` exit 0, no tracked change after the
  build; `git diff HEAD` over §4.24, s9*/s11* recipes and product code empty.
- Leaf reports: `S4-helpers-builder1.md` … `-builder8.md`, `-verifier.md` … `-verifier4.md`, `-fixer.md` … `-fixer3.md`.
  Brief READ lists: §4.24 (lines 1552–1662), the phase doc S4 and D4.1–D4.6 / gates / STOP rules, `S4-sheet.md`,
  `S4-sheet-verifier3.md` R3-1/R3-2, `recipes/CLAUDE.md`, the Run 14/16 helpers.

## 3. Verifier verdicts
- `S4-helpers-verifier.md`: **FAIL** — M1 (MANIFEST not the record's first line), M2 (RD-0 (c) STATE form), M3 (RD-LOGS
  printed unmeasured alias7/sock127 as 0; actor results via old `S11 scan`), M4 (stored poller posting to a closed
  listener → a non-fixture loopback line in the console capture), M5 (F-FILETAB control leg and judging missing);
  MINOR m1–m6; NITs. Fixer 1 fixed all taken items.
- `S4-helpers-verifier2.md`: **FAIL** — M-new: on the console-FALLBACK branch RD-7 had no STOP detector. Step agent chose
  option (a); fixer 2: RD-7 is NOT RUN without the console.
- `S4-helpers-verifier3.md`: **PASS-with-notes** — m3-1 (console first failing inside RD-7), m3-2 (F-FILETAB ★ clause
  NOT MEASURED, so the row could never pass). Fixed by the Opus fixer 3 (`B17 filetab`, probe before RD-7's tab).
- `S4-helpers-verifier4.md`: **PASS-with-notes** — two NITs open: n4-1 (the lone `hidden=disarmed` test checks "not
  pass", not "fail"), n4-2 (the frozen sheet's F-FILETAB helper cell does not name `B17 filetab`: S4-record states it).

## 4. Deviations
- Eight builder slices instead of the brief's two: the list is ~6,800 lines with tests; H2, H3 and H8 ran over the
  ~600 cap as one coherent set each (stated in their reports).
- A third fix round, on an Opus fixer (§7), so the ★ row F-FILETAB can pass in Run 17.
- RD-LOGS calls the new `B17 scan` (`scan17`), not `S11 scan`: `S11 scan` admits only 8081/8084 and cannot print the
  RD-LOGS Expected line. RD-0 (d) uses a new `B17 foundlist`; F-FILETAB's hidden-row clause uses `B17 filetab`.
- CTX prints the closing list's form `CTX <label> count=<n>` (the RD-7 row writes `CTX tab=<label> …`; the sheet is
  inconsistent; S4-record notes it).
- I killed builder 4's hung `python -` heredoc shell (its own PIDs, identified by command line) after it had reported.

## 5. Proposed decisions
### 2026-10-27 · B17 stored sends the stored list to a loopback listener; only a fixed verdict is printed
**Decided:** the typed poller POSTs `chrome.storage.local`'s block list to a 127.0.0.1 listener of the helper, which
compares sha256 in its own process and prints only `STORED match=<yes|no> lines=<n>`; the listener stays open until the
poller ends. **Why:** settles R3-1/R3-2: no block-list text or hash reaches the console capture or any output.
**Instead of:** printing a hash in the console, or typing the expected hash. **Revisit if:** S4-live finds the worker
cannot reach loopback, or the network log records the POST. **By:** Claude (proposed)
### 2026-10-27 · Reload runs before the worker console is opened
**Decided:** prologue order `… reload, console`. **Why:** a reload ends the worker and detaches its DevTools window; the
sheet needs only that the capture start before RD-0 and `RULES 0` be read on the reloaded build (Run 16 did the same).
**Instead of:** the sheet's listing order. **Revisit if:** S4-live sees the capture miss a line RD-LOGS needs. **By:**
Claude (proposed)
### 2026-10-27 · RD-7 does not run without the console
**Decided:** on the FALLBACK branch (or a console lost at RD-7's probe) RD-7 prints NOT RUN before any call. **Why:**
the UIA read of the options heading is not built, so nothing could stop the wave if the own page rendered.
**Instead of:** running RD-7 with CTX NOT MEASURED. **Revisit if:** a UIA read tied to a wave-owned window is built.
**By:** Claude (proposed)
Smaller ones, in the builder reports: the delay server logs no status (builder1); the `S11B-MARK` console marker
(builder6); CTX found by query tag (builder8); in-flight windows by the call's own clock (builder8); the race `.press`
file (builder5); `dlHopReading` bands ±50 ms around −300 and 0 (builder3). Verifier 1 accepted each (§5 of its report).

## 6. Findings
- Unproven until the live run (builder6, builder4): the DevTools console prompt's UIA name and that typed text reaches
  it, chronological order of the console dump, `file:///` omnibox typing, `Get-S11bCaps`' `<li>` read, the worker's
  loopback POST. RD-0's FALLBACK branch covers the console failing.
- Sheet risk for S4-live (verifier n8): Chrome may log `net::ERR_BLOCKED_BY_CLIENT` lines naming `localhost:8085` in the
  worker console for RD-3 / RD-DL-HOP; by the sheet's own RD-LOGS rule that fails RD-LOGS (a STOP). Not a helper defect.
- Known residual race: the console can still be lost between RD-7's probe and its CTX read (fixer3).
- `tabCreated url-empty` (F-FILETAB RECORD) is NOT MEASURED: tab events reach no client or log without product code.
- RD-BACK's `tabs.get().status` after `goBack` is NOT MEASURED through the SDK.

## 7. Handoff
- Nothing running; no port 8081–8091/9234 held by this slice.
- `journal.md` has an uncommitted edit this slice did not make; left alone, not committed.
- S4-live: a clean tree is required (commit first); run slices in the background (longer than 600 s); treat return
  code 10 of the console helpers as FALLBACK; `S4-run-record.md` is the record path the runner writes.
