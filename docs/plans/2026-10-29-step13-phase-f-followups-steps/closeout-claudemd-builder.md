# closeout-claudemd — builder report

Claude Sonnet 5.5, effort medium. 2026-10-30. Docs only; nothing committed.

## 1. Verdict
DONE. `node scripts/doc-check.mjs` exits 0: no "Over word budget", no new "Dead paths" or "Same gotcha in two places"
(output: `closeout-claudemd-builder-doccheck.txt`; the findings left are CLAUDE.md:28, the test-count line and the status line,
none mine).

## 2. Outputs (words before -> after, `wc -w`)
recipes/CLAUDE.md 2921 -> 3036 · extension/CLAUDE.md 3445 -> 3498 (after tightening) · daemon/CLAUDE.md 1860 -> 1910 ·
sdk/CLAUDE.md 1658 -> 1670 · mcp/CLAUDE.md 1152 -> 1172 · extension/src/CLAUDE.md 978 -> 1076 ·
extension/src/evaluate/CLAUDE.md 441 -> 497 · spec §10 (one note added).

## Applied, with the source checked
- (b) recipes/CLAUDE.md: DevTools toolbar bullet after the `TabItem` bullet. Checked against S5-liveC20b.md "What UI
  Automation showed" and §6 item 1. The wording in §6 item 1 is the same as the proposal.
- (d1) mcp/CLAUDE.md console bullet: newest lines kept, marker text. Checked against `sdk/src/format/console-messages.ts`
  (marker `<n> older lines cut`) and S5-run-record.md (`first-index=192 last-index=200`, R20-CON-CAP/-DESC PASS).
- (d2) mcp/CLAUDE.md line 20: key order. Checked against S5-run-record.md (R20-ARGS-ORDER, 5 of 5, RECORD).
- (d3, d4) extension/src/CLAUDE.md: frame bullet and replayed-args bullet (R20-CON-DESC, R20-CON-NOTEA PASS, #387).
- (d5) extension/src/evaluate/CLAUDE.md: kept the measured Chrome fact, added the S2 envelope, the limits and the fake CDP;
  replaced "compare ... never by key order". Checked against `SERIALIZER_JSON_SRC` (`serialize.ts`), `parseEnvelopeText`
  (`result.ts`), S2.md and #397. Deviation in wording: I wrote "parsed in the extension", since the code names
  `parseEnvelopeText`, not `callFn`.
- (d6) sdk/CLAUDE.md: key order and the JSDoc clause.
- (d7) daemon/CLAUDE.md: replaced the "background opener gets no lease" text with the S1 join (250 ms, R20-POP-BG-3 3 of 3,
  `in-ms=110`, R20-POP-OTHER-3 NOT MEASURED, 25 of 30). Kept the 100 ms / 2 s poll and the Run 9 numbers, and kept the
  pre-S1 runs (R14-POP-1, R15-POP-2) as measured history of the old behaviour, worded as "before S1".
  Checked against `extension/src/opener-join.ts` and S5-run-record.md.
- (d8, without the DevTools sentence) extension/CLAUDE.md: `opener-join.ts` entry (including S1's N2 clause); the
  `webNavigation` manifest fact beside `declarativeNetRequestWithHostAccess`. Checked against `opener-join.ts`,
  `extension/manifest.json`, `s3a-dnr-wiring.test.ts` (21 listeners, one `onCreatedNavigationTarget`), `manifest.test.ts`,
  decisions.md #393. Compensation: shortened wording in the Key files (older-files paragraph, locator/a11y entries,
  method-table clause, `upload-*` entries, `storage.session` bullet, esbuild bullet); no measured fact dropped. The
  "Undocked and DevTools-first" sentence is untouched (waits for #419 / (f)).
- (d9) The grep found no chooser sentence in `extension/src/handlers/CLAUDE.md` or `extension/CLAUDE.md` about the second
  chooser call. The only chooser entry is the bullet in extension/src/CLAUDE.md, so the `CHOOSER_BUSY_MESSAGE` fact went
  there (`handlers/upload.ts` line 49 and 166; `extension/test/s5a-chooser.test.ts` has 3 uses; `mcp/test/s13-chooser-busy.test.ts`
  exists; R20-CHOOSE-TWICE PASS). daemon/CLAUDE.md: one sentence on the settle pause `.then(release, release)` freeing the
  lock when the sleep rejects (`daemon/src/intercept.ts` `trustedInput`; `daemon/test/s6-trusted-focus.test.ts`, "a rejecting
  settle sleep" case; #390).
- (d10) extension/src/CLAUDE.md chooser bullet: rewrote the two stale sentences (disabled-input refusal now reached live,
  R20-CHOOSE-REFUSE-DIS PASS; R20-CHOOSE-KEPT RECORD with Chrome's unchanged-selection rule).
- (e) Spec §10: dated 2026-10-30 sub-bullet after the S1 note, saying "reads" means "acts on" and the `listTabs` intercept
  relays `openerTabId` unchanged (`daemon/src/intercept.ts`, `listTabs` method, the `{ ...t, tab: handle }` rows, about
  lines 672-684). The existing bullet is unedited.
- (g) The no-edit items hold: `client.ts` hello features unchanged (extension/CLAUDE.md), shared/CLAUDE.md untouched,
  recipes/CLAUDE.md already lists `s13-devt.ps1`.

## 4. Deviations
- S4's N3 NOT applied (E5.3's list is in `extension/test/s5a-chooser.test.ts`, outside the lane); e2e plan and R18-R20 rows
  untouched.
- Not touched: root CLAUDE.md, (a), (c), (f), liveB20 files; no line numbers of liveB20 files cited.
- One slip: an accidental Python REPL was started in the background by a Bash call (no file effect); it may still be a
  background task, harmless.

## 6. Findings
None new beyond the above. The "Same gotcha in two places" check stayed clean.
