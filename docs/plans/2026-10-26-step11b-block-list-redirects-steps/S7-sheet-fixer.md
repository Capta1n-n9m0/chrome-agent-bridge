# S7-sheet fixer report

Claude Sonnet 5.5, medium effort. 2026-10-27. Docs only; Chrome not touched; nothing run live; no commit. Only `docs/e2e-test-plan.md` §4.25 and this file were touched.

## 1. Verdict
DONE. All ten findings fixed; none disputed.

## 2. Outputs
- `git diff --stat docs/e2e-test-plan.md`: 40 insertions, 0 deletions; one hunk `@@ -1674,6 +1674,46 @@`, so §4.24 and Run 17's §5 are byte-for-byte untouched.
- `node scripts/doc-check.mjs --files docs/e2e-test-plan.md`: `tools: 24 · router methods: 27 · codes: 27`, `Checked 1 living docs`, exit 0.
- §4.25 is 40 lines (cap about 220).

## 3. Per finding
- **F1 (MAJOR), fixed.** R17B-0 (e) now says plainly it reads the disk (names in `extension/dist/sw.js`, ancestor check) and drops the fetch-the-loaded-file claim. New step (f), before any state change and with the list as found: start a `chrome.tabs.onCreated` listener, `newtab` an 8081 playground page, read `pendingUrl`/`url`. `created-url=about:blank` is the pass; any other value is a STOP (pre-S6 `tabs.create({url})` gives the URL). It opens one tab and changes no safety state. The first line now reads `BUILD disk-s6-names=2/2 created-url=about:blank`; the line-forms entry is updated. NEWTAB-PLAIN keeps its own `created-url` judgment (a second sample).
- **F2 (MAJOR), fixed.** The STOP sentence adds R17B-FWD's first `forward` (P0 to P1) and R17B-BACK-SAMEDOC's `back`, and says R17B-BACK and FWD's second `forward` keep the FAIL-and-continue rule. Both rows' pass rules now say an answer other than `ok` is a STOP.
- **F3 (MINOR), fixed.** "Helpers needed" rewritten: R17B-0's first line is printed by the `.ps1` block; a new three-page history kind in `HistoryKind`/`historyPlan`; `B17 history --activate` with a set-up refusal as STOP and the `histNotBuilt17`/`bump(3)` NOT BUILT path (`s11b.ts` ~720-735) disabled; R17B ids in `HISTORY_ROWS` with judges; the timed 8087 GET; `build-proof` now disk plus tabwatch; the console op list trimmed to `tabwatch`. The "new ops only" wording is gone.
- **F4 (MINOR), fixed.** The refused-URL row uses `newtab javascript:void 0` with the JavaScript switch ON. Expected `NAV_FAILED` is pre-written as RECORD (Run 13 SAFE-6c, `extension/CLAUDE.md`). The row explains why the two `http://` candidates are dropped (`safety-call.ts:178-189`).
- **F5 (MINOR), fixed.** `completes` is defined as the `complete` events before the first post-navigation `loading` (expected 1). The `tabs.get` case is NOT MEASURED (not observable from the console).
- **F6 (MINOR), fixed.** R17B-UP-L1 is FAIL if R17B-LOGS does not run or reads NOT MEASURED.
- **F7 (MINOR), fixed.** `S6 commit=ancestor` is judged in (e); the pass rule is RD-0's for (a)-(d) without its console-fallback clause.
- **F8 (NIT), fixed.** `K-nextpage` replaced by "Chrome's text, not a K17 constant".
- **F9 (NIT), fixed.** The "not repeated" list says R17B-CTL is a narrowed RD-CTL (8083, 8086, 8091, the 8085 counter, 8087; 8088 and 8089 not started) and that R17B-0 succeeds Run 17's RD-0.
- **F10 (NIT), fixed.** The activation allow-list is 8081 and 8091; the opened-handle check stays. The helper test list says 8081 and 8091 only.

## 4. Deviations
None. I did not edit the builder's report; its proposed decision "the S6 proof is the loaded file's text" is superseded by F1's fix. The step agent should not carry it into decisions.md. The other proposal (a refused activated `back` is a STOP) now also covers SAMEDOC and FWD's first forward.

## 5. Handoff
Nothing running. The sheet stays uncommitted. A fresh verifier re-checks F1-F10 only.
