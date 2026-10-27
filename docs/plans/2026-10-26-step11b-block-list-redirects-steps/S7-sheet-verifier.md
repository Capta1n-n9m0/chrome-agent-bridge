# S7-sheet verifier report: Run 17b's wave sheet (§4.25)

Claude Opus 5.5, medium effort. 2026-10-27. Read and run only. I edited nothing except this file and made no commit.
Audited: `docs/e2e-test-plan.md` §4.25 (lines 1677–1716, uncommitted) against the phase doc (§ S7, Exit checks
D7.1–D7.7, STOP rules with the #311 paragraph, As built S4-* and S6), decisions #306, #308, #309, #311, #313, #314,
`S4-run-record.md`, `S4-investigation.md`, `S6.md`, the code (`extension/src/debugger.ts`, `handlers/evaluate.ts`,
`handlers/tabs.ts`, `newtab-open.ts`, `safety-call.ts`, `tab-events.ts`, `extension/build.mjs`) and the helpers
(`recipes/s11b.ts`, `recipes/s11b-rules.ts`, `recipes/s11b-win.ps1`, `recipes/s11b-r17.ps1`). I treated the builder's
report (`S7-sheet-builder.md`) as claims to audit.

## 1. Verdict

**FAIL**: two MAJOR findings (F1, F2). Everything else is MINOR or NIT.

## 2. Commands and outputs

- `git diff --stat`: `docs/e2e-test-plan.md | 40 ++++++++++++++++++++++++++++++++++++++++` (1 file, 40 insertions, 0
  deletions). `git diff docs/e2e-test-plan.md`: a single hunk `@@ -1674,6 +1674,46 @@`, all `+` lines between §4.24's
  item 7 and `## 5. Results template`. So §4.24 and Run 17's §5 record are byte-for-byte untouched (check 4 holds).
- `node scripts/doc-check.mjs --files docs/e2e-test-plan.md`: `tools: 24 · router methods: 27 · codes: 27`,
  `Checked 1 living docs`, exit 0.
- `netstat -ano` (288 lines) filtered for `:(808[0-9]|809[0-9]|9234)`: no line (grep exit 1). The sheet's ports 8081,
  8083, 8085, 8086, 8087 and 8091 are free, and none of them is 9234 (check 5 holds).
- `grep -c openBehindRules extension/dist/sw.js` → 2; `grep -c settleBlank` → 3. `git show db3f82e^:extension/src/handlers/tabs.ts | grep -c …` → 0. `build.mjs` has no `minify`, so the names survive the bundle.
  `git merge-base --is-ancestor db3f82e HEAD` → ancestor.
- `extension/src/debugger.ts:186` has `userGesture: true` in `evaluateInPage`'s `Runtime.evaluate`.
  `handlers/evaluate.ts:39,54` routes every `evaluate` through `evaluateInPage` (`withDebugger`, so it goes through
  `chrome.debugger`). The activation claim holds (check 6).
- `safety-call.ts:178-189` `resolveOpenUrl`: a string that `new URL` rejects, even against the base, is tested as the
  extension base (an own page). This bears on F4.

## 3. Checks

| # | Check | Result |
|---|---|---|
| 1 | D7.1: no observation; written before the run | holds (line 1679) |
| 2 | Every S7 row present with steps, expected text and pass rule | present. R17B-0's proof is not discriminating (**F1**). The back rows' pass rules are RD-BACK's as written. BACK-NOACT is a RECORD row. DISARM presses ON after the reply and keeps the other rules |
| 3 | Every Run 17 FAIL, NOT RUN or STOP row has an R17B- row | holds (diff below). The carried rows are unambiguous. One reinterpretation needs a fallback (**F6**) |
| 4 | §4.24 and §5 untouched | holds |
| 5 | Ports | hold |
| 6 | Activation: method, code, preconditions, rule, STOP line | holds. The allow-list is wider than needed (**F10**) |
| 7 | S6 "For S7-sheet" items and #313's N1 | all three items are present. The N1 recording is mis-specified (**F5**). V5's candidates cannot reach the path (**F4**) |
| 8 | STOP lines against the phase doc and #311 | under-reach (**F2**). The builder's proposed decision is supported for the cases it names |
| 9 | "Helpers needed" concrete and complete | the list exists but is incomplete and contradicts itself (**F3**) |
| 10 | Integrity and wording | no token, pattern, non-fixture URL or profile path. No expected text depends on a result. Small inconsistencies (**F7**, **F8**, **F9**) |

**Check 3 diff.** Run 17 FAIL: RD-BACK, RD-BACK-SAMEDOC, RD-DISARM, R17-UP-L1. STOP: RD-BACK-EMPTY. NOT RUN: RD-FWD,
RD-DL-SOCKET, R17-UP-OPT, R17-UP-6, R17-UP-7, R17-SAVE-REFUSE, F-RAW, F-RAW-2, F-RAW-DIR, F-RAW-ENC, F-RAW-OK,
R17-UP-RACE-A, R17-UP-DEVT, RD-RESTORE, RD-LOGS, plus liveB's second RD-0 (`S4-run-record.md:21`). Each one maps to
an R17B- row or block (liveB17B repeats R17B-0). The G11-3 branch is as §4.24 wrote it. Nothing is missing.

## 4. Findings

### F1 — MAJOR — `docs/e2e-test-plan.md:1697` (R17B-0 (e)): the S6 proof reads the disk file, not the loaded worker
**Evidence.** Step (e) has the worker console `fetch` its own `chrome.runtime.getURL("dist/sw.js")`. It then counts
S6's two names in that text and compares the text with the disk file. Chrome serves an unpacked extension's
`chrome-extension://` resource from the extension folder. The running service worker, by contrast, is the script
Chrome registered at the last reload. That gap is the root `CLAUDE.md` gotcha: a restarted Chrome "still ran the old
worker" after `dist/` changed. So the fetched text is the disk text. It will hold both names and equal the disk file
even when the worker that answers is the pre-S6 build, which is the one failure the proof exists to catch (a reload
that did not take). The names are discriminating against a pre-S6 *disk* build (0 occurrences before `db3f82e`,
`build.mjs` does not minify), but the target is the loaded build. The row's own remark, "a hash match alone is not
the proof", does not help, because both of its readings come from disk. I reached this by reading, not by measuring.
I found no evidence that Chrome serves the registered worker script to a `fetch`. D7.2 ("proves the loaded build
includes … S6") therefore rests on a non-discriminating check.
**Fix.** Keep the disk check as a "the built file has S6" line, and add a behavioural, read-only proof before any
state change:
- With the list as found, `newtab http://localhost:8081/e2e-playground.html?s11b=b0` runs under the TABWATCH listener.
- The judged line is `created-url=about:blank`. The pre-S6 path calls `tabs.create({url})`, so its `pendingUrl` is the
  URL itself (`handlers/tabs.ts:101`, `tab-events.ts:139`).
- Any other value is a STOP before any state change.

That means moving NEWTAB-PLAIN's judged `created-url` clause into R17B-0. Either restate the "first line" so D7.2 is
met by the MANIFEST line plus this behavioural line, or record the change as a dated note against D7.2.

### F2 — MAJOR — `docs/e2e-test-plan.md:1683` (STOP rule) and lines 1706–1707: the #311 STOP clause misses two activated back calls
**Evidence.** The phase doc (lines 472–474) says the clause "a bridge call answering differently from its
pre-Step-11b text on a page with no redirect" reads, *for back rows*, against the activated set-up. The sheet lists
only three cases that fire it: R17B-ACT-CTL, a set-up `back` of R17B-FWD, and R17B-BACK-EMPTY. Two more calls are in
the same position: an activated set-up and a target page with no redirect.
- **R17B-BACK-SAMEDOC**: `back` to the same 8081 page without `#h2`. The 8081 server never redirects, so BLK
  changes nothing.
- **R17B-FWD's first in-G1 `forward`**: P0 → P1, both 8081 pages.

Each row's pass rule turns a refusal into a row FAIL and the wave goes on. Run 17 made this same mistake: the clause
was met but not recognised as a STOP (`S4-run-record.md:37`, F1, #309). The phase doc's rule binds either way. The
runner, though, follows the sheet's STOP lines.
**Fix.** Add R17B-BACK-SAMEDOC's `back` and R17B-FWD's first `forward` to the STOP sentence. In the two rows, say that
an answer other than `ok` is the STOP. R17B-BACK and R17B-FWD's second `forward` land on the flip URL, which now
answers 302, so they keep RD-BACK's FAIL-and-continue rule.

On the builder's proposed decision (check 8): it is supported by the #311 paragraph for the cases it names. It does
not over-reach. ACT-CTL is a back call on an activated set-up with no redirect, and stopping there is the
conservative reading. Its one under-reach is F2.

### F3 — MINOR — line 1715 ("Helpers needed"): incomplete and self-contradictory
**Evidence.**
- (a) The list says `s11b.ts` gets "new ops only" and the existing ops are "reused unchanged". Yet `B17 history
  --activate` is a flag on the existing `history` op. Run 17's fix-5 "NOT BUILT" path lives inside that op
  (`recipes/s11b.ts:720-735`: `histNotBuilt17` … `bump(3)`), not in the `.ps1`. Item (1) puts the "no NOT BUILT path"
  rule only on `s11b-r17b.ps1`, so a `--activate` built on `history()` would inherit fix 5 and break the STOP line at
  line 1683.
- (b) `historyPlan` (`s11b-rules.ts:712`) knows only the kinds `back`, `fwd`, `samedoc` and `empty`. R17B-ACT-CTL and
  R17B-BACK-NOACT need a three-page 8081 history, which no listed op provides.
- (c) `B17 back` and `B17 forward` accept only `HISTORY_ROWS` (the RD- ids, `s11b.ts:678`) and judge them by id.
  Reusing them unchanged would print `ROW RD-BACK …` lines in Run 17b's record.
- (d) R17B-CTL's timed 8087 GET is not part of `B17 ctl`.
- (e) R17B-0's first line joins `B17 manifest`'s MANIFEST line and the new BUILD line into one line. Who prints the
  joined line is unstated.

**Fix.** Name each of these in the list:
- `B17 history`: a new kind (three 8081 pages) and the `--activate` flag, under which a set-up refusal is a STOP and
  never NOT BUILT.
- The R17B row ids in `HISTORY_ROWS` and the judges.
- The 8087 probe in `B17 ctl` (or a new op).
- The block that prints the first line.

### F4 — MINOR — line 1704 (R17B-NEWTAB-REFUSED): both candidates are refused by the gate, so the row cannot reach S6's V5 path
**Evidence.** `new URL("http://")` and `new URL("http://127.0.0.1:99999/")` both throw, with or without the base, so
`resolveOpenUrl` returns the extension base. The gate then refuses the call as an own page (K-own, `DOMAIN_BLOCKED`)
before any tab exists (`safety-call.ts:178-189`, `openTarget`). This can be decided from the code now, so the row's
"both gate-refused" branch is certain and V5 (#314: a failed `tabs.update` removes the blank tab) goes unmeasured.
**Fix.** Use a URL the gate passes and Chrome's `tabs.update` refuses. For example, `javascript:void 0` with
JavaScript on: `extension/CLAUDE.md` records Chrome refusing a `javascript:` navigation through the bridge
(`NAV_FAILED`, Run 13 SAFE-6c), and it is no non-fixture URL. Keep the before and after tab-row count. Pre-write the
expected `NAV_FAILED` as RECORD.

### F5 — MINOR — line 1703 (R17B-NEWTAB-LOAD): the N1 recording is mis-specified
**Evidence.** The row says "`completes` (a count above 1 is the 'double complete' case)". A normal S6 `newTab` gets at
least two `complete` events: the blank page's and the URL's. So "above 1" is the normal case, not N1's doubled blank
`complete`. The third case recorded, "whether the first complete preceded the first `loading` after the navigation",
is not N1's third case (`tabs.get` reading complete while the event is still queued, #313). Yet the row says "only
these three cases of N1 are measurable here".
**Fix.** Define `completes` as the `complete` events before the first post-navigation `loading` (expected 1). State
that the `tabs.get` case is not observable from the console and record it as NOT MEASURED.

### F6 — MINOR — line 1698 (R17B-UP-L1): no outcome if R17B-LOGS does not run
**Evidence.** The console clause is met "by R17B-LOGS' `SCAN` line". In Run 17, a STOP before RD-LOGS left UP-L1's
judgment open and it took a verifier round to settle (`S4-run-record.md:22`). This reading of the clause is
reasonable and does not weaken it.
**Fix.** Add: "if R17B-LOGS does not run or reads NOT MEASURED, R17B-UP-L1 is FAIL (its console clause not met)".

### F7 — MINOR — line 1697 (R17B-0): the expected text and the pass rule disagree
**Evidence.** `S6 commit=ancestor` is in Expected but no pass-rule clause reads it. The pass rule says "R17 `RD-0`'s
pass rule for (a)–(d)". That rule includes the console fallback, which the same cell then removes ("A console that
cannot evaluate is a STOP here"). The removal is the stricter direction, so nothing is weakened.
**Fix.** Judge `S6 commit=ancestor` (else STOP), and write "RD-0's pass rule for (a)–(d) without its fallback clause".

### F8 — NIT — line 1700: `K-nextpage` is not in table K17
**Evidence.** The preamble says every `K-…` key is §4.24's K17 (line 1679). K17 (lines 1594–1615) has no
`K-nextpage`. The row is RECORD, so nothing is judged on it.
**Fix.** Quote the text without a key ("Chrome's text, not a K17 constant").

### F9 — NIT — line 1716: "Not repeated … RD-CTL", yet R17B-CTL is a row
**Fix.** Say that R17B-CTL is a narrowed RD-CTL (8083, 8086, 8091, the 8085 counter and 8087; 8088 and 8089 are not
started).

### F10 — NIT — line 1681: the activation port allow-list is wider than the rows need
**Evidence.** Activations happen only on 8081 pages and on 8091 flip pages. The list also admits 8083 (a redirect
server that serves no page) and 8085 (the blocked fixture). All of these are fixture pages, so nothing unsafe follows.
**Fix.** Narrow the list to 8081 and 8091, and keep the opened-handle check.

## 5. Proposed decisions

None of my own. The builder's two proposals:
- **A refused `back` on an activated set-up is a STOP:** supported by the #311 paragraph, but it must cover
  SAMEDOC and FWD's first forward too (F2).
- **The S6 proof is the loaded file's text:** not supported as written. The file text comes from disk (F1). Use
  `tabs.onCreated`'s `pendingUrl` as the behavioural proof.

## 6. Handoff

No process started; nothing to kill. The sheet stays uncommitted until a fix round closes F1 and F2. A fresh verifier
then re-checks F1–F10 only.
