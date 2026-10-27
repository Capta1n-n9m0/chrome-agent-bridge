# S7-sheet — Run 17b's wave sheet (step report)

Step agent: Claude Opus 5.5, effort medium. Date 2026-10-27.

## 1. Verdict
DONE. `docs/e2e-test-plan.md` §4.25 "R17B rows" is written, verified PASS (third verifier), and committed before any Run 17b observation (D7.1). Nothing was run live and Chrome was not touched.

## 2. Outputs
- `docs/e2e-test-plan.md` §4.25: 40 inserted lines (dense table rows), 0 deleted, in one hunk between §4.24 and "## 5. Results template" (`git diff --stat`, quoted by every verifier). §4.24 and Run 17's §5 record untouched. No §4 contents line exists, so none was added.
- `node scripts/doc-check.mjs --files docs/e2e-test-plan.md` exits 0 (verifier3).
- Rows: R17B-0 (found state; first line `MANIFEST … BUILD disk-s6-names=2/2 created-url=about:blank`; the S6 proof is a `newTab` on an 8081 fixture page before any state change, whose Chrome-side created-tab URL must read `about:blank`), R17B-UP-L1, R17B-CTL, R17B-ACT-CTL (the activation control), R17B-BACK-NOACT (RECORD), R17B-RD-2, R17B-NEWTAB-PLAIN, R17B-NEWTAB-LOAD (S6.md: reply time against load), R17B-NEWTAB-REFUSED (RECORD; `newtab javascript:void 0`, expected `INTERNAL` with Chrome's text, recorded not predicted), R17B-BACK, R17B-FWD, R17B-BACK-SAMEDOC, R17B-BACK-EMPTY, R17B-DISARM (ON pressed after the reply), every Run 17 FAIL / NOT RUN / STOP-hit row carried as "as R17 `<id>`" with its pass rule word for word (liveB included, G11-3's branch as written), R17B-LOGS, R17B-RESTORE.
- Activation method, named before the run: the bridge's own `evaluate` of `1` on each fixture page after its load and before the tab leaves it; `extension/src/debugger.ts:186` sends CDP `Runtime.evaluate` with `userGesture: true` through `chrome.debugger` (banner shows; JavaScript switch must be ON). Given only on wave-opened 8081/8091 fixture pages, as a rule and a STOP line.
- Ports: `netstat -ano` 2026-10-27 04:55 UTC (builder) and re-run by verifier1: 8081, 8083, 8085–8087, 8091 free; none is 9234.
- Helpers needed (for S7-helpers, listed in §4.25 line ~1713): new `recipes/s11b-r17b.ps1` (the r17b blocks, liveA17B/liveB17B, prints R17B-0's first line, no NOT BUILT path); in `recipes/s11b.ts` new ops `B17 build-proof`, `B17 tabwatch`, `B17 newtab-timed`, flag `--activate` on `B17 history` (activation + fixture-page guard; set-up `back` refusal is a STOP, the fix-5 NOT BUILT path disabled), STOP lines from the R17B judges for a refused target call, R17B ids in `HISTORY_ROWS`, a timed 8087 GET; in `recipes/s11b-rules.ts` a three-page 8081 history kind; in `recipes/s11b-win.ps1` `Invoke-S11bPressAfterReply` and console op `tabwatch`; tests for each (§4.25 item 4).

## 3. Verifier verdicts
- `S7-sheet-verifier.md` (Opus): FAIL — F1 MAJOR (the S6 proof read the disk `sw.js`, not the loaded worker), F2 MAJOR (two activated back/forward calls missing from the #311 STOP list), F3–F7 MINOR, F8–F10 NIT.
- `S7-sheet-fixer.md` (Sonnet): all ten fixed, none disputed.
- `S7-sheet-verifier2.md` (Opus): PASS-with-notes — V2-1 MINOR (`NEWTAB-REFUSED` predicted `NAV_FAILED`; the code gives `INTERNAL`), V2-2..V2-4 NIT.
- `S7-sheet-fixer2.md` (Sonnet): all four fixed.
- `S7-sheet-verifier3.md` (Opus): **PASS**.

## 4. Deviations
- Three rows beyond the phase doc's S7 list (R17B-ACT-CTL, R17B-NEWTAB-LOAD, R17B-NEWTAB-REFUSED), from S6.md "For S7-sheet" and a control for the activation; verifier1 judged them justified and non-weakening.
- §4.25 is 40 lines, far under the ~220 cap, because rows are dense table lines and carried rows reference §4.24 text by id.

## 5. Proposed decisions
### 2026-10-27 · A refused set-up back on an activated history is a STOP
**Decided:** in Run 17b every activated `back`/`forward` on a page with no redirect that answers anything but `ok` prints a STOP (ACT-CTL, FWD's set-up backs and first forward, SAMEDOC, BACK-EMPTY); Run 17's "NOT BUILT" helper path is not carried. **Why:** the #311 STOP paragraph reads RD-BACK-EMPTY's clause against the activated set-up; Run 17 turned such refusals into row failures and missed the STOP (#309). **Instead of:** a FAIL and continue. **Revisit if:** R17B-ACT-CTL shows the bridge's `evaluate` does not give the activation. **By:** Claude (proposed)
### 2026-10-27 · tabCreated.url is read from Chrome's own event
**Decided:** R17B-0 (f) and R17B-RD-2 read the created-tab URL from a worker-console `chrome.tabs.onCreated` listener. **Why:** clients never see `tabCreated`; the daemon holds it. **Instead of:** a new wire read. **By:** Claude (proposed)

## 6. Findings
- Unmeasured, stated in the sheet: the investigation's activation used its own CDP link; the bridge's goes through `chrome.debugger` and detaches between calls (R17B-ACT-CTL measures it).
- Code fact (verifier2/3): `newTab`'s navigate error is not wrapped (`extension/src/handlers/tabs.ts:95`, `newtab-open.ts:96-101`) and maps to `INTERNAL` (`errors.ts:31`), unlike `navigate`'s `NAV_FAILED`.

## 7. Handoff
No processes running. Next: S7-helpers builds the "Helpers needed" list (§4.25 line ~1713) with tests. Briefs' READ lists: phase doc § S7, D7.1–D7.7, STOP rules; decisions #306, #308, #309, #311, #313, #314; §4.24; S4-run-record.md, S4-investigation.md, S6.md; `extension/src/debugger.ts`, `handlers/tabs.ts`, `safety-call.ts`, `errors.ts`; `recipes/s11b*.{ts,ps1}`.
