# S7-sheet builder report

Claude Sonnet 5.5, medium effort. 2026-10-27. Docs only; Chrome not touched; no recipe, no product code, no commit.

## 1. Verdict
DONE. `docs/e2e-test-plan.md` §4.25 inserted between §4.24 and "## 5. Results template" (39 long lines, all insertions; `git diff` shows 40 insertions, 0 deletions, so §4.24 and Run 17's §5 are byte-for-byte untouched). The file has no §4 contents line to extend.

## 2. Outputs
- `docs/e2e-test-plan.md` §4.25 (heading "4.25 R17B rows").
- `node scripts/doc-check.mjs --files docs/e2e-test-plan.md`: "Checked 1 living docs"; counts line `tools: 24 · router methods: 27 · codes: 27`; no finding.

### Rows (ids)
- **R17B-0** found state, K-constants, and the build proof in one first line (`MANIFEST … BUILD sw=equal s6-names=2/2`): the loaded sw.js text must hold `openBehindRules` and `settleBlank` (present in the current `extension/dist/sw.js`), equal to the disk file; commit `db3f82e` is an ancestor of HEAD (checked now: yes). A console that cannot evaluate is a STOP.
- **R17B-UP-L1** Run 17's FAIL (console-scan clause only), met by R17B-LOGS.
- **R17B-CTL** RD-CTL for 8083, 8086, 8091, the 8085 counter, plus the 8087 slow server.
- **R17B-ACT-CTL** control: three activated 8081 pages, back x2, forward x2, all `ok`; a refusal is a STOP (#311 clause).
- **R17B-BACK-NOACT** RECORD: unactivated history, one `back`.
- **R17B-RD-2** pre-written answer success `{id, tab}`, blocked = 0 (a hit is a STOP), `snapshot` K-tab, `tabCreated` url recorded.
- **R17B-NEWTAB-PLAIN** allowed page, today's answer, page loaded, blocked = 0; `created-url=about:blank` judged as the behavioural S6 proof.
- **R17B-NEWTAB-LOAD** S6 N1: five trials against the 3 s slow server, reply after the load; completes count, first-complete time recorded.
- **R17B-NEWTAB-REFUSED** RECORD for a URL Chrome refuses (`http://`, then `http://127.0.0.1:99999/`); judged: no blank tab left (#314).
- **R17B-BACK**, **R17B-FWD**, **R17B-BACK-SAMEDOC**, **R17B-BACK-EMPTY** with RD-BACK's pass rules as written, activated set-ups; set-up `back` refusal is a STOP (no "NOT BUILT" path).
- **R17B-DISARM** ON pressed 1.6 s after the reply; other RD-DISARM rules unchanged; state compared with G1's count (the slip of Run 17's helper).
- Carried by reference to the §4.24 rows (id only changes): R17B-RD-DL-SOCKET, -UP-OPT, -UP-6, -UP-7, -SAVE-REFUSE, liveB17B (F-RAW, -2, -DIR, -ENC, -OK, UP-RACE-A, UP-DEVT, with the G11-3 branch as written), R17B-RESTORE, R17B-LOGS.
- Not repeated (passed or recorded in Run 17): listed in §4.25.

## 3. Activation method chosen
The bridge's own `evaluate` of `1` on each page right after its load, before the tab leaves it (including the last page). Code: `extension/src/debugger.ts:186` (`Runtime.evaluate` with `userGesture: true`; also `extension/src/evaluate/save.ts:104`). It is the same CDP call `S4-investigation.md` §3 measured working (8 of 8). Preconditions named in the sheet: JavaScript switch ON (R17B-0 already stops otherwise), the target a wave fixture page, the debugging banner shown on the wave's own tab during each call. Stated gap: the investigation used its own CDP connection, the bridge goes through `chrome.debugger` and detaches; R17B-ACT-CTL measures that. If it fails, the proposed alternative (not used) is a trusted click on a fixture link, a different set-up and a new run. The activation-only-on-wave-fixture-pages rule is written as a rule and a STOP line.

## 4. Netstat
`netstat -ano` at 2026-10-27 04:55Z (284 lines), filtered for local ports 8080-8099 and 9234: no line (exit 1), so all free: 8081, 8083, 8085, 8086, 8087, 8091 (used), 8090 unbound, 9234 free, no daemon. Held by others and not used by the sheet: 9180, 9222. 8088 and 8089 are not started (RD-7/RD-8 not repeated). Same ports as Run 17 (no collision since the sheet needs the existing helpers' servers).

## 5. Deviations
None from the brief. Size: 39 lines, but each is dense (the cap was a line count, about 220).

## 6. Proposed decisions
### 2026-10-27 · Run 17b: a refused `back` on an activated set-up is a STOP, and the activation control comes first
**Decided:** R17B-ACT-CTL runs before the back rows; any `back`/`forward` refusal on an activated page set with no redirect (the control, a set-up `back` of R17B-FWD, R17B-BACK-EMPTY) is a STOP, the #311 reading of RD-BACK-EMPTY's clause. **Why:** otherwise a failed activation would make every back row fail or stay silent. **Instead of:** turning a refused set-up `back` into "NOT BUILT" (Run 17's helper fix 5, #309). **Revisit if:** the user prefers a recorded NOT MEASURED. **By:** Claude (proposed, design-local)

### 2026-10-27 · Run 17b: `tabCreated.url` is read from Chrome's `tabs.onCreated`, and the S6 proof is the loaded file's text
**Decided:** clients never see `tabCreated`, so a console listener on `chrome.tabs.onCreated` records the raw `pendingUrl`/`url` (the extension's frame is redacted for blocked URLs); the build proof is the loaded sw.js text holding S6's two function names plus the disk-equality and the ancestor check. **Why:** only the console can observe both. **By:** Claude (proposed, design-local)

## 7. Findings / handoff
- Unknown, not invented: which URL Chrome itself refuses for `tabs.create` (R17B-NEWTAB-REFUSED names two candidates and says a gate refusal before any tab exists is "path not reached").
- S7-helpers needs: `s11b-r17b.ps1` (new), `B17 history --activate`, `B17 build-proof`, `B17 tabwatch`, `B17 newtab-timed`, `Invoke-S11bPressAfterReply`, console ops `build-proof` and `tabwatch`, plus tests (the full list is in §4.25 "Helpers needed").
- The sheet is uncommitted; it must be committed before any observation (D7.1). Nothing to kill; nothing running.
