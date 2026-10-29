# S5-addendum407 builder report

Model Sonnet, effort medium.

## 1. Verdict
DONE. No ESCALATE: every #407 clause was written so it can pass on a correct build.

## 2. Outputs
- `docs/e2e-test-plan.md`, §4.28: 8 lines inserted, pure insertion (`git diff --stat`: 8 insertions, 0 deletions; CRLF kept).
  Line 2001 blank; 2002 the dated note; 2003 blank; 2004-2005 the table header and separator (copied from lines 1962-1963);
  2006 R20-POP-BG-3; 2007 R20-POP-FG-3; 2008 R20-POP-OTHER-3; the original blank line then precedes `## 5. Results template`.
- No existing line edited (rows 1964-1993, order line 1980, bullets 1995-2000 untouched).
- Method: a script copied lines 1966-1968 and applied asserted single-occurrence replacements (so a diff against the originals shows only these spans).
- `node scripts/doc-check.mjs`: exit with three findings, none in my lane or lines: counts in code (tools 25, router methods 28, codes 27); `CLAUDE.md:114 5596 passed` (test count to check against the last `npm test`); `docs/plans/next-session-prompt.md:15` status text. "Checked 38 living docs". No path or user-name finding.

## 3. Spans changed per row (old -> new, brief)
All three rows: first cell id `R20-POP-X ★` -> `R20-POP-X-3 ★`, and ` — re-measures R20-POP-X per #407` appended; last cell `S5-helpers: R20 r20-pop-x` -> `S5-drivers-B4: R20 r20-pop-x-3`, `; decision #407` appended to the Source part.

- BG-3: `POP R20-POP-BG … held-call=TAB_HELD active-guard=bg console-new=0` -> `POP R20-POP-BG-3 … held-call=TAB_HELD holder=A active-guard=bg console-join=0 console-url=0` plus `CHECK R20-POP-BG-3 bg console-new=<n> RECORD`. Held-call sentence "equal in code and message to B's control call" -> code `TAB_HELD`, message contains `held by "<A's client name>"`, control on O also `TAB_HELD`, handle and time not compared, `holder=A` printed and never the message. Pass cell: "B's call on the popup is `TAB_HELD`, and the worker console printed no line meanwhile (`console-new=0` …)" -> `TAB_HELD` naming A (`holder=A`) and `console-join=0 console-url=0` (content rule; `console-new` RECORD only). Discrimination text, bounds and `others=0` unchanged.
- FG-3: `As R20-POP-BG, with` -> `As R20-POP-BG-3, with`; expected line -> `POP R20-POP-FG-3 … holder=A … console-join=0 console-url=0` plus the `CHECK … fg console-new=<n> RECORD`; `Same clauses as R20-POP-BG` -> `…BG-3`. The R15-POP-2 (a) record line is kept.
- OTHER-3: leg `third` expected line -> `POP R20-POP-OTHER-3 leg=third … holder=A … console-join=0 console-url=0`; leg `human` line -> `POP R20-POP-OTHER-3 leg=human … holder=A … console-join=0 console-url=0` plus one `CHECK R20-POP-OTHER-3 human round=<k> popup-opened=<yes or no> granted-to=…` per click and a per-leg `console-new` RECORD line; `ROW R20-POP-OTHER unjoined` -> `ROW R20-POP-OTHER-3 unjoined`. Steps cell, leg `third`: W2 note appended after "(an `evaluate "1"` every 300 ms on its tab …)". Pass cell: after "B's own traffic … does not move the grant." added the BG-3 clauses for each leg, the held-call probe running only in a round whose popup opened, and the leg `human` rule (popup-opened=no is NOT MEASURED and not counted; `granted-to=none` with a popup opened is FAIL; PASS only when 3 of 3 opened and met the clauses).
- Dated note (line 2002): states the #407 reference and that no observation was made; liveA20 FAILs and #406 stand and the `-2` ids are withdrawn; G1.4 judged on BG-3; order after R20-0B and before `CLOSERPROBE`, BG-3, FG-3, OTHER-3; liveB20 becomes 11 ids and one probe; STOP `popup-lease-wrong` in the three rows; `unjoined` and `human` legs added to the up-front NOT MEASURED list; the -3 line forms; clauses (1)-(3) with the operational readings (capture before and after, join and URL token lists, `listTabs` read after the 1 000 ms bound from the `sent` stamp, the FAIL / NOT MEASURED / STOP rules); the W2 fallback line.

## 4. Deviations
None.

## 5. Proposed decisions (design-local choices under §4)
- OTHER-3's steps cell keeps the lowercase procedure reference "as in R20-POP-BG" unchanged: it names the opening procedure, and BG-3's procedure is identical. Only "own clauses" references (`As …`, `Same clauses as …`) became `-3`.
- The added `CHECK … console-new=<n> RECORD` lines are put in each row's expected text, as the brief's line forms require.
- The note holds the readings in one paragraph; the rows point to them by wording only, so there is a single place to read the rules.
- Verified code facts cited: `daemon/src/intercept.ts` line 612 builds `tab ${handle} is held by ${JSON.stringify(owner)} since …`, so `held by "<name>"` matches for a plain name. A name with quotes or backslashes would appear JSON-escaped; the driver's client names are plain.

## 6. Findings
doc-check's three findings are outside this lane (pre-existing).

## 7. Handoff
Nothing running. Not committed. Next: the B4 helpers (`r20-pop-bg-3`, `r20-pop-fg-3`, `r20-pop-other-3`) must implement the line forms in the dated note, then the verifier checks the byte-for-byte copy against lines 1966-1968.
