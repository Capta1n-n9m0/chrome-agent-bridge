# S4-live — Run 17, live (step report)

Step agent: Claude Opus 5.5, medium effort. Risk: live standard. Children: substep-0 builder, fixers 0/0b (Sonnet,
medium); helper fixers 1 (Sonnet), 2, 3, 3b, 4, 4b, 5, 5b (Opus, medium); verifiers 0, 0b, 0c, 1, 2, 3, 3b, 4, 5, 5b
(Opus, medium); live runners 1–8 (Sonnet, medium); committers (Sonnet, medium). Ledger: `S4-live.ledger.md`.

## 1. Verdict
**ESCALATE.** A pre-registered row-level STOP rule fired in attempt 7 (phase doc § STOP rules: "a bridge call answering
differently from its pre-Step-11b text on a page with no redirect"): `RD-BACK-EMPTY` answered `INTERNAL` where the sheet
expects `ok`. The runner's STOP path restored the safety state and read it back equal. No further attempt was made
(`agent-rules.md` §3 item 1). liveB did not run (it needs liveA to finish); RD-LOGS and RD-RESTORE as rows did not run.

**D4.3 (attempt 7, record `S4-live-run7A-record.md`):** RD-1 `HITS rd1 redirect=1 blocked=0` (PASS, K-tab, 94 ms);
RD-2 `HITS rd2 redirect=1 blocked=1` (RECORD, #295: `newTab` still lets the first request escape, as Stage 0 measured);
RD-3 `HITS rd3 redirect=1 blocked=0`, control `HITS rd3c redirect=0 blocked=0` (PASS, K-url, no file); RD-4
`HITS rd4 redirect=1 blocked=1` (PASS); RD-6 `HITS rd6 redirect=1 blocked=1`, `RD6 url=fixture-8085`, RULES 0 before
and after (as pre-written for 0.4 (C); the record prints no judged ROW line for RD-6).

## 2. Outputs
- Commits (all `recipes/s11b*`, `recipes/test/s11b-*`, the #306 note, steps-dir files): `723b63c` (substep 0, #306),
  `041ea89` (fix 1), `4446d17` (fix 2), `344f386` (fix 3), `9e3fbe4` (fix 4), `2c1af4b` (fix 5); the evidence commit
  follows this report.
- Tests (`npm test`, each verifier re-ran): 4472/177 at start → **4535 passed / 183 files**; none removed. All seven
  `recipes/tsconfig*.json`, `npm run typecheck`, `npm run build` exit 0 on each change. Product code untouched; the build
  in `dist/` is 723b63c's (substep 1: `npm run build` exit 0, no tracked change).
- Attempt records: `S4-live-run1-record.md`, `S4-live-run3A-record.md` … `S4-live-run7A-record.md` (attempt 2 wrote
  none). Runner reports `S4-live-runner1.md` … `-runner7.md`; post-STOP scans and teardown `S4-live-runner8.md`.
  Evidence: `S4-live-run7A-console.txt` (the redacted worker-console copy; `chrome-blocked` redacted=0).
- Leaf reports: `S4-live-builder0.md`, `-fixer0.md`, `-fixer0b.md`, `-fixer1.md` … `-fixer5b.md`, `-verifier0.md`,
  `-verifier0b.md`, `-verifier0c.md`, `-verifier1.md` … `-verifier5b.md`.

### Rows (attempt 7, as the record prints them)
| Row | Result |
|---|---|
| RD-0 (a) (first record line `MANIFEST dnrWithHostAccess=true staticRuleSets=absent`), (b) `RULES 0`, (c), (d) | PASS; `TOGGLE reading on` (nothing pressed) |
| R17-UP-L1, RD-CTL | PASS |
| F-FILETAB | PASS (tabs, hidden row, snapshot, navigate, untouched, control); `tabCreated url-empty` NOT MEASURED |
| F-HOME, RD-CAPS-WARN | PASS |
| RD-REGEX | RECORD: `bank443-schemes len=59`, `bank443-explicit len=57`, `h119 len=119`, `h120 len=120`, `h121 len=121`, all `supported=true` |
| RD-1, RD-3, RD-4 | PASS (D4.3 above) |
| RD-6, RD-2 | as D4.3 above (RD-2 RECORD) |
| RD-DL-ERR-1..3 | PASS (K-fetch, 314/312/312 ms) |
| RD-DL-HOP-1..3 | PASS (K-url, no file, blocked=0, 9/9/9 ms); RECORD `d=-303 ms reading=the event was in hand at the rejection` |
| RD-7 | RECORD: K-own (39 ms), `HITS rd7 redirect=1`, `CTX r7 count=0`; the UIA heading read NOT MEASURED |
| RD-8 | RECORD: navigate `ok`, then snapshot `INTERNAL` (the tab shows an error page), `HITS rd8 redirect=1`; the file-rendered STOP check did not fire |
| RD-BACK | FAIL: answer `INTERNAL` (6 ms); `HITS bk blocked=0`; `FLIP bk n200=1 n302=0 total=1` |
| RD-FWD | NOT MEASURED: its history set-up was not built (`HISTDIAG fwd row=2 navigations=3 backs-done=0`; `HISTORY fwd set-up NOT BUILT at=back 1 INTERNAL "Cannot find a next page in history."`) |
| RD-BACK-SAMEDOC | FAIL: answer `INTERNAL` (6 ms) |
| RD-REBUILD-NARROW | PASS (`ok`, 3 126 ms; in-flight samples min=1, 0 after) |
| RD-DISARM | FAIL: `DOMAIN_BLOCKED` (K-tab), want `DISARMED`; samples = 1 then 0 (PASS clause); `HITS rdd redirect=1 blocked=0`; wait-safety NOT reached |
| RD-5, RD-5b | PASS (RD-5 `GAP 369 ms`; RD-5b in-flight = expect 1, then 0; blocked=0 both) |
| RD-BACK-EMPTY | **STOP**: answer `INTERNAL`, not `ok` |
| RD-DL-SOCKET, R17-UP-OPT, R17-UP-6, R17-UP-7, R17-SAVE-REFUSE, RD-RESTORE (row), RD-LOGS (row) | NOT RUN (after the STOP) |
| liveB: F-RAW, F-RAW-2, F-RAW-DIR, F-RAW-ENC, F-RAW-OK, R17-UP-RACE-A, R17-UP-DEVT | NOT RUN (liveA did not finish; the toggle read on, so G11-3 is not the reason) |

### Exit checks
- **D4.1** met: §4.24 committed in `336547d`, the #306 note in `723b63c`, before the first observation.
- **D4.2** met in every attempt that reached RD-0 (1, 3–7): the first record line is the MANIFEST line above.
- **D4.3**: RD-1 and RD-3 show 0 hits on the blocked port with the pre-written answer; RD-4 1; RD-6 as pre-written.
  RD-2 shows 1 (a RECORD by the sheet, #295; the phase doc's D4.3 wording lists RD-2 among the zero rows).
- **D4.4**: met by the STOP-path restore of attempt 7 (`RESTORE read-back: stored page equal true, daemon.status equal
  true, title armed true`; both texts the empty-text hash, equal to RD-0). Not by the RD-RESTORE row, which did not run.
  After runner 8's teardown attempt (no write: its restore threw at the toolbar step, before any box), the step agent
  read `daemon.status` safety: armed=true evaluate=true blockedCount=0.
- **D4.5** met: every STOP or guard line has its return in the ledger (returns 1–7, plus runner 8's teardown STOP).
- **D4.6** not met as a row: RD-LOGS did not run. Post-STOP offline scans (runner 8, not the row): every count 0 in
  every capture of attempts 1, 3–7 (consoles and daemon slices); attempt 7's console PASS; the consoles of attempts 1,
  3–6 NOT MEASURED (no disarm control line); every record and report PASS on `scan --what other`.

## 3. Verifier verdicts
Substep 0: verifier0 PASS-with-notes, verifier0b PASS-with-notes (R1–R3), verifier0c PASS-with-notes. Fix 1: verifier1
PASS-with-notes. Fix 2: verifier2 PASS-with-notes. Fix 3: verifier3 **FAIL** (F1 MAJOR: the stop-cause filter let a
rethrown engine message and fixture texts through), verifier3b PASS-with-notes. Fix 4: verifier4 PASS-with-notes. Fix 5:
verifier5 PASS-with-notes (MINOR-1 taken), verifier5b PASS-with-notes.

## 4. Deviations
- Seven attempts, each a fresh runner from the prologue (teardown first from attempt 3), so RD-0, UP-L1, RD-CTL,
  F-FILETAB, F-HOME, RD-CAPS-WARN and RD-REGEX were measured again in later attempts. Every earlier attempt's record
  stays as written; no row result disagreed between attempts. Each attempt ended on a STOP and was a return.
- Fix 5 turns RD-FWD's unbuildable set-up into NOT MEASURED instead of a STOP (RD-FWD had not been observed).
- The ledger's line 12 held a profile path (my own `$TEMP` expansion); runner 8's scan caught it, and I redacted it to
  `%TEMP%` before any commit.
- Runner 8's teardown (to clear leftovers) refused, because RD-RESTORE never passed; its stop path opened and closed the
  wave's own options check window and refused to press a toolbar window it did not open. Nothing was pressed or written.

## 5. Proposed decisions
### 2026-10-27 · Run 17 ends at the RD-BACK-EMPTY STOP; the user rules before any re-run
**Decided:** no further attempt. **Why:** a pre-registered STOP rule fired; whether the bridge's `back` answered `ok`
before Step 11b on a background tab navigated by the bridge is unmeasured (the call held no rule: empty list).
**Instead of:** a helper change to make the back rows pass. **Revisit if:** the user rules, or a scratch-Chrome (#294)
measurement shows the refusal predates Step 11b. **By:** Claude (proposed, for user review)
### 2026-10-27 · Helper fixes made between attempts (fix 1–5) stand as committed
**Decided:** keep `041ea89`, `4446d17`, `344f386`, `9e3fbe4`, `2c1af4b` (each verified). **Why:** each was a set-up or
reporting defect found live; none changed a pass rule, judge, expected text or the sheet. **By:** Claude (proposed)

## 6. Findings
1. **`chrome.tabs.goBack` refused every back in Run 17** with `INTERNAL "Cannot find a next page in history."`
   (RD-FWD's set-up, RD-BACK, RD-BACK-SAMEDOC, RD-BACK-EMPTY; 5–6 ms), on background tabs that the bridge had opened
   and navigated (`HISTDIAG fwd row=2`: the navigations committed). The found list was empty, so no Step 11b rule was
   in play. Verifier5's unmeasured hypotheses (`S4-live-verifier5.md` §5): Chrome's history-manipulation intervention
   marking extension-made entries as skippable (most likely), or entries replaced. A separating measurement: the #294
   scratch Chrome with CDP `Page.getNavigationHistory`.
2. **RD-REGEX:** H120 (120) and H121 (121) are reported supported, longer than the 119 bound: "disagrees with the 119
   bound" — #300's and #303's revisit trigger is met.
3. **RD-DL-HOP:** `d = -303 ms` ("the event was in hand at the rejection"): #303's latency trigger is not met.
4. **RD-DISARM FAIL:** the in-flight navigate answered K-tab, not `DISARMED`, and wait-safety was not reached; the rule
   outlived the disarm as #296 says (samples 1, then 0).
5. **RD-2:** `newTab` still lets the first request escape (blocked=1), as #295 records.
6. Live helper facts (for `recipes/CLAUDE.md` at closeout): Chrome 156 does not expose `<p id="blocklist-summary">` by
   AutomationId (already at `s9-win.ps1:629-631`; a new helper met it again); s9.ts prints ROW/CHECK lines after an ISO
   time while s11/s11b print bare; s11.ts `make` writes `state.json` without s9's `opened` list; the extension's own
   options tab is listed hidden as `blocked`, so "exactly one hidden row" needs the options window closed.

## 7. Handoff
- Nothing running; ports 8081–8091 free; no wave process left (runner 8). The SDK daemon may be up (exits when idle).
- `%TEMP%\bridge-e2e\s11b\r17-globals.clixml` remains with `S16Changed` true; `-Block teardown` refuses it and the next
  preflight will too. The safety state itself is the found state (D4.4 above). Clearing it needs a ruling (delete the
  globals file, or a teardown path that accepts a STOP-path restore).
- Preserved captures (outside the repo): `%TEMP%\bridge-e2e\s11b\run1`, `run3` … `run7`.
- S4-record should judge the records against §4.24 and note: RD-6 and RD-8 print no judged ROW line; the CTX line form
  is `CTX r7 count=<n>` (S4-helpers' note).
