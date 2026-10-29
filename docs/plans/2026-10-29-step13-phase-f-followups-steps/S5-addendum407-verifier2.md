# S5-addendum407 verifier report, round 2

Model Opus, effort medium. I only read and ran commands. I edited no repo file apart from this report and its evidence
file. I ran no Chrome, daemon, fixture, `npm test` or build, and read no raw run record. I audited the uncommitted dated
note at `docs/e2e-test-plan.md:2002` and rows 2006-2008 (HEAD `39b51cd`) against #407 (`docs/decisions.md:221`),
round 1's report and the fixer's claims.

## 1. Verdict

**FAIL.** Round 1's three findings are fixed as ruled. The fix's new liveness control brings two MAJOR findings:
- **MAJOR-A:** the control names a source that never reaches the worker, and over a whole-slice capture it cannot be
  tied to "the leg's own" calls.
- **MAJOR-B:** the text does not say whether a FAIL or STOP outranks the `unread` → NOT MEASURED path. One reading
  hides the FAIL #407 orders.

Both are one-sentence fixes, and neither needs escalation.

## 2. Outputs

- This report.
- `docs/plans/2026-10-29-step13-phase-f-followups-steps/S5-addendum407-verifier2-diff.txt`: the cell-diff delta, the
  numstat, the scans and the `dist` grep.

## 3. Verifier verdict

Not applicable (this is the verifier).

## 4. Deviations

None.

## 5. Proposed decisions

None. The fixes are below.

## 6. Findings

### Item 1: round 1's findings, re-checked

**MAJOR-1 (clause (2) vs the UIA capture): fixed as ruled.** The new spans at l.2002:
- Unit: "one capture line per UI Automation element name in the DevTools window, so a log line may appear whole or as
  pieces".
- Window: "Content is judged over the whole capture saved right after the leg (from the slice's start), not over a
  before/after difference … so there is no prefix rule and no `unread` from a shifted list".
- Join: "names the join (`OpenerJoin`, `opener-join`, `opener_join` or `OPENER_JOIN`, case-insensitive …)".
- Static fact: "`extension/src/opener-join.ts` has no log call … so no product log line can come from the join".
- URL: "any of `localhost:<P>` …, `e2e-playground.html?popup`, `popup=1`, case-insensitive, on any capture line".
- Liveness control: "the after-leg capture must hold at least one piece `[bridge] evaluate` from the leg's own
  `evaluate` calls (B's probe); if it holds none, `console-join` and `console-url` print `unread` and the leg cannot
  PASS (NOT MEASURED …)".
- Count: "`console-new` … the capture's line count after the leg minus before it, never judged".

The old fragment rule ("a `[bridge]` line matching none of the product's log-site forms") and the prefix rule are gone.

**MAJOR-2 (popup-opened tied to the opener): fixed as ruled.** l.2002 now reads: "`popup-opened=yes` whenever a
`listTabs` row appears after the click that was absent from the row set read just before the click and that no client
opened (no `newTab` in flight), read at or after the click's `sent` stamp + 1 000 ms …; its opener is recorded, not
judged (`opener=<O or other or none>` …)". The same `opener=` key is in the note's line form and in row 2008, cell 4.
The opener comparison can be made: `ListTabsRow` carries Chrome's `id` beside `tab` (`shared/src/protocol.ts:779-787`)
and `openerTabId` when Chrome reports one (l.772-773).

**NIT-2 (the log-site list): fixed.** l.2002 reads "the log-site list is `extension/test/log-allowlist.ts`, which
`extension/test/log-scan.test.ts` enforces".

### Item 2: can the new readings pass on a correct build? (from code)

**The capture.** `Save-S11bConsole` (`recipes/s11b-win.ps1:185-193`) selects the Console tab and walks
`FindAll(Descendants, TrueCondition)`. It writes every non-empty UIA Name as one line, with newlines flattened.
`Get-R20ConsoleCount` (`recipes/s13-r20.ps1:183-185`) counts those lines, or returns -1. The note describes this
correctly.

**Join names.** `extension/build.mjs` sets neither `minify` nor `sourcemap`. The bundle keeps the name:
`grep -n OpenerJoin extension/dist/sw.js` gives `5184:var OpenerJoin = class {` and
`6301:var openerJoin = new OpenerJoin(…)`. V8 infers the class name from the `var`, so a thrown error's stack frame
names `OpenerJoin.<method>`, and the note's claim holds. The `// src/opener-join.ts` comment (l.5178) shows only in
Sources, never in the Console list.

Can anything else in the capture match `openerjoin`, `opener-join` or `opener_join` (case-insensitive)?
- The 15 log sites in `extension/src` (grep in the evidence file; `badge.ts:183` plus 14 `[bridge] …` forms) contain
  none of them. `opener-join.ts` has no `console.` call.
- R20-0B's typed console text (l.1965 step (2), reused by l.1981) is
  `chrome.runtime.getManifest().permissions.includes("webNavigation")` and
  `typeof chrome.webNavigation === "object" && chrome.webNavigation.onCreatedNavigationTarget.hasListeners()`. Neither
  matches, and their echoed results are `true`/`false`.
- DevTools' own names ("Console", "Filter", "Default levels", panel tabs, `sw.js:<line>` links) do not match.
- The worker's `chrome-extension://<id>/sw.js` does not match.
- The window title (`DevTools` or `DevTools - <profile>`, `recipes/CLAUDE.md:134-138`) can match only if the profile
  name does. NIT-B4-1 covers that.

**URL parts.**
- No log site prints a URL. `evaluate` prints a length (`handlers/evaluate.ts:39`). `sw.ts:329` prints a WebSocket
  error to `127.0.0.1:9234`, which holds no `localhost:<P>`.
- R20-0B's fixture URL is opened by the SDK (`newtab`), not typed into the worker console. Nothing before the -3 rows in
  liveB20 puts `localhost:<P>`, `e2e-playground.html?popup` or `popup=1` into that window.
- Residual, not a finding: a Chrome-originated "Uncaught (in promise)" text that quotes a page URL would match. That
  would be a product defect (an unhandled rejection carrying a URL), so a FAIL there is fair.

`console-join=0 console-url=0` can therefore pass on a correct build.

**Liveness control.** MAJOR-A below.

**The `human` leg's new-tab rule** is sound. In that leg B and C are idle and A makes no `newTab`. The pre-click set
holds any popup still closing. The read at `sent` + 1 000 ms matches the grant bound. The only false source is a tab
the user or Chrome opens during the click window. That would print `popup-opened=yes granted-to=none`, a FAIL: it
errs toward reporting, not hiding (NIT-B4-3).

**Is #407 loosened?**
- Clause (1) is unchanged since round 1.
- Clause (3) now reads exactly "whether a popup tab was created".
- Clause (2)'s whole-capture window is wider than the leg. MINOR-C covers what that window really holds.
- The one place a FAIL could be dodged is MAJOR-B.

### MAJOR-A: the liveness control names the wrong source and cannot be tied to the leg

**Where:** `docs/e2e-test-plan.md:2002`: "at least one piece `[bridge] evaluate` from the leg's own `evaluate` calls
(B's probe)", and "in leg `human` a round with no popup makes no probe".

**Evidence:**
1. **B's probe never reaches the worker.** `daemon/src/intercept.ts:606-615` (`checkLease`) throws `TAB_HELD` in the
   daemon before forwarding. B's popup call and B's control call on O are both refused there, so neither runs
   `handlers/evaluate.ts:39` and neither prints `[bridge] evaluate`.
2. **Which calls do reach the worker** (as `evaluate`s that print the piece):
   - legs `bg`, `fg`, `third`: A's `O.evaluate("window.open(…)")` (l.2006, c3);
   - leg `third`: B's own `evaluate "1"` every 300 ms on its tab (l.2008, c3);
   - A's "call on its popup is `ok`" (l.2006, c4), but its method is not stated.
   In leg `human` there is no A `evaluate` that opens the popup, so the leg's only possible worker-side `evaluate` is
   A's `ok` call, and only if it is an `evaluate`.
3. **Unattributable.** The capture spans the slice, and identical pieces from earlier rows are already in it: R20-0B's
   two SDK `evaluate`s, and every earlier -3 leg. Read literally ("holds at least one piece"), the control is vacuous
   after the slice's first `evaluate`: a frozen or detached DevTools window would pass it. Read as "from the leg's own
   calls", B4 cannot tell from a whole capture which call printed a piece. The result is either a control that cannot
   fail or a reader's choice made at run time.

**Suggested fix (the step agent chooses; write it before liveB20):**
- Replace "(B's probe)" with the calls that reach the worker. State that A's call on its popup is an `evaluate`, in
  every leg including `human`.
- Make attribution operational by one stated rule. Either:
  - (a) the count of capture lines holding `[bridge] evaluate` is higher after the leg than before it. Note the risk
    that a full, virtualised list (MINOR-C) keeps the count flat, which gives `unread` on a correct build. Or:
  - (b) the leg makes one marker `evaluate` whose expression length is unique in the slice, and the control requires a
    capture line holding `[bridge] evaluate` and that length. This is stated to hold only if B4's dry run shows a row's
    Name carries the number. Otherwise use (a).

### MAJOR-B: the `unread` path does not yield to FAIL or STOP

**Where:** l.2002. One sentence says "if it holds none … the leg cannot PASS (NOT MEASURED, a stated instrument
limit)". Two others say "The leg is FAIL if any round has a popup opened and `granted-to=none` … it is the STOP
`popup-lease-wrong` if a popup is granted to B or C".

**Evidence:** neither sentence states its precedence over the other.
- A driver may print NOT MEASURED for a leg whose lease clause failed (`granted-to=none` or `others>0`, or
  `held-call` not `TAB_HELD`) because the console read `unread`. This applies to all four legs, BG-3 included.
- In leg `human` this hides exactly what #407 orders as a FAIL ("a popup opened and leased to nobody (a product
  finding: back to the user)").
- MAJOR-A makes `unread` likely in leg `human` under a strict reading.
- #406's sibling ruling for KEPT already words the safe order: "every clause is judged first; NOT MEASURED … only when
  all hold and a digest stays unreadable" (`docs/decisions.md`, item (3) above #407).

**Suggested fix:** add to the liveness sentence: "Every other clause is judged first: a STOP or FAIL stands whatever
the console reads; `unread` only turns what would be a PASS into NOT MEASURED." Apply it to every leg of the three
rows.

### MINOR-C: "the whole capture … from the slice's start" is not established

**Where:** l.2002: "judged over the whole capture saved right after the leg (from the slice's start) … a stricter
window than the leg".

**Evidence:**
- The capture is the UIA tree of the visible DevTools window. Chrome's DevTools console list renders only the rows in
  or near its viewport (a virtual list). This is an outside fact that has not been measured in this repo:
  `grep -niE virtual recipes/CLAUDE.md` and the Step 13 docs give nothing. If it holds, earlier rows scroll out of the
  tree, and the capture is the visible tail, not the slice.
- A correct build still passes. The consequence is weaker coverage: a matching line printed mid-leg can scroll out
  unseen, and leg `third` prints a line every 300 ms.
- The clause's completeness rests on the static fact (no log call in the join, enforced by `log-scan.test.ts`), which
  the note already states.

**Suggested fix:** replace "the whole capture … (from the slice's start) … a stricter window" with "the capture as
saved right after the leg, which holds the rows DevTools renders, at least the newest". Say that the live read is a
backstop to the static fact and is not proof that every line was seen. No escalation is needed for G1.4: the clause
stays judgeable and honest. If the step agent wants the live read to be complete, round 1's E1 still applies.

### Item 3: cell diff re-run

`diff --strip-trailing-cr` of round 1's output against the current output finds **one** changed span, row
R20-POP-OTHER-3, cell 4, span [7]. Its only change is the inserted `opener=<O or other or none> ` in the human `CHECK`
form. No other span in any cell of any of the three rows changed. Rows 2006 and 2007 are unchanged, as the fixer
claims.

### Item 4: numstat, scans, doc-check

- `git diff --numstat docs/e2e-test-plan.md` gives `8	0`.
- `git diff -U0 … | grep "^+" | grep -inE` for drive paths, `/c/`, `Users` and the user's and git names exits 1 (no
  match).
- `node scripts/doc-check.mjs` exits 0. It reports the same three items as round 1 (code counts 25/28/27;
  `CLAUDE.md:114 5596 passed`; `docs/plans/next-session-prompt.md:15`) over 38 living docs. Nothing is new.

### NITs for the B4 driver (in addition to round 1's eight)

1. Drop the window-title line, the root element's Name, before matching the join and URL patterns (#283), so a
   profile name can neither match nor be printed.
2. Match `[bridge] evaluate` as a substring of a capture line, case-sensitive. Match the join and URL patterns as
   case-insensitive substrings. Print counts only.
3. `popup-opened`: compare by Chrome `id` against the pre-click `listTabs` set. Exclude rows whose `newTab` any actor
   issued in the window, though none is expected in `human`. Read `openerTabId` only for the `opener=` label.
4. Take the after-leg capture after the leg's last call has answered and after the popup's close. Take the before-leg
   capture just before the leg's first call, so `console-new` brackets the leg.
5. Run MAJOR-B's order in code: compute the lease, held-call and STOP verdicts first, and let `unread` only downgrade a
   would-be PASS.

## 7. Handoff

Nothing is running and nothing is committed. A fixer addresses MAJOR-A and MAJOR-B, and optionally MINOR-C, in the
note at l.2002, plus row 2006 c4 if A's popup call is named an `evaluate` there. The next verifier re-checks only the
liveness sentence, the precedence sentence and any cell span the fix adds, and re-runs the cell diff
(`S5-addendum407-verifier2-diff.txt` holds the current baseline).
