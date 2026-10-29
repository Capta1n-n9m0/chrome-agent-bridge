# S5-addendum407 verifier report

Model Opus, effort medium. Read-only on the repo apart from this report and its evidence file. No Chrome, daemon or
fixture was run. Audited: the uncommitted lines 2001-2008 of `docs/e2e-test-plan.md` (HEAD `39b51cd`), against #407
(`docs/decisions.md` l.221), #406, #404, the original rows l.1966-1968, line form (3) l.1952 and the pass preamble l.1942.

## 1. Verdict

**FAIL**: two MAJOR findings, both in the dated note's operational readings. The row cells themselves copy cleanly.
- **MAJOR-1:** clause (2) is read off a capture whose "lines" are UI Automation element names, not console messages. As
  written it may FAIL or read `unread` on a correct build. This is the same class of defect as -2's N1.
- **MAJOR-2:** clause (3)'s `popup-opened` reading can turn a popup leased to nobody into NOT MEASURED, which hides the
  very product gap #407 names.

## 2. Outputs

- Evidence: `docs/plans/2026-10-29-step13-phase-f-followups-steps/S5-addendum407-verifier-diff.txt` (the script and its full output).
- This report.

## 3. Verifier verdict

Not applicable (this is the verifier).

## 4. Deviations

None.

## 5. Proposed decisions

None. The fixes are below. One item may need escalating (§6, E1).

## 6. Findings

### Check 1: cell-by-cell diff (by script)

`python -I celldiff.py docs/e2e-test-plan.md`: each line is split into its six cells on `|` outside backticks, then
tokens are compared with difflib. All three pairs have 6 cells. Differing spans per cell:

| Pair | c1 | c2 | c3 | c4 | c5 | c6 |
|---|---|---|---|---|---|---|
| BG → BG-3 | 2 | 0 | 0 | 16 | 8 | 3 |
| FG → FG-3 | 2 | 0 | 1 | 3 | 1 | 3 |
| OTHER → OTHER-3 | 2 | 0 | 1 | 7 | 2 | 3 |

How the spans are classified:
- **c1:** the id plus a suffix ` — re-measures R20-POP-X per #407`.
- **c3:** for FG, `As R20-POP-BG` → `-BG-3`, a self cross reference. For OTHER, only the W2 sentence was inserted.
- **c4:** the ids and the POP line keys `holder=A`, `console-join=0 console-url=0` (replacing `console-new=0`), plus the
  `CHECK … console-new=<n> RECORD` line. BG's held-call sentence is rewritten to clause (1). OTHER also gets the human
  `CHECK … popup-opened` line.
- **c5:** for BG, clause (1) and clause (2) replace "is `TAB_HELD`" and "printed no line meanwhile (`console-new=0` …, no
  URL)". FG changes only the `Same clauses as R20-POP-BG-3` reference. OTHER inserts the BG-3 clauses, the
  probe-only-when-opened rule and the human-leg rule, and renames `ROW R20-POP-OTHER-3 unjoined`.
- **c6:** `S5-helpers` → `S5-drivers-B4`, the reader ids `-3`, and `; decision #407` appended.

Every span is one of the allowed changes, except two outside the brief's list (NIT-1):
- c1's "re-measures … per #407" suffix. The preamble at l.1942 requires it: "Each re-measured row says which … row it
  re-measures".
- c6's `; decision #407` source pointer.

No other differences were found. c2 (state) is byte-identical in all three rows. BG's c3 (steps) is byte-identical.

### Check 2: changed spans against #407

Kept, as the diff shows:
- The lease clause ("exactly one `leaseGranted {reason: "opener"}` … within **1 000 ms**"), `others=0`, the active
  guard and its NOT DISCRIMINATING rule, 3 of 3, both discrimination texts, the `unjoined` leg and `popup-lease-wrong`.
  None of these spans appears in the diff.
- FG's R15-POP-2 (a) record line.

Changed:
- **Console window.** It was "between the first popup's open and the last grant" (form (3), l.1952). It is now the whole
  leg. A wider window is stricter, so this is not a loosening.
- **OTHER-3's clauses.** OTHER-3 now states the held-call and console clauses explicitly, where the original pass cell
  did not. This is not a new condition: form (3) carries `held-call` and `console-new` (expected 0) in every POP line,
  and liveA20 judged OTHER on them (#404).

Against #407's wording:
- **Clause (1)** follows #407: code `TAB_HELD`, the message names A's client, the control on O is `TAB_HELD` by code, and
  the handle and time are not compared. The added substring `held by "<A's client name>"` is an operational reading of
  "names A's client", and it matches the code (Check 3).
- **Clause (3)** reproduces #407, plus "PASS only when all three rounds opened". That is the original 3-of-3 rule, so it
  is not an addition.
- **The W2 note** matches #407's sentence ("if it can be made, as the sheet asks"). The `b-window=W` record is an addition
  that does not judge.
- **The readings of clause (2) and clause (3)** are where the defects are (MAJOR-1, MAJOR-2).

### Check 3: passability on a correct build, from the code

**Held-call.** `daemon/src/intercept.ts:606-615` builds the message as `` `tab ${handle} is held by ${JSON.stringify(owner)} since ${hhmmss(c.since)} — …` `` with data `{owner, since}`.
- `owner = this.name(c.owner)` (l.186-187) is `registry.nameOf(id)`. The registry stores the hello's `meta.name ??
  DEFAULT_CLIENT_NAME` (`daemon/src/registry.ts:42`).
- The SDK does not rewrite the message (`sdk/src/error.ts:160` uses `err.message`; no TAB_HELD case in `sdk/src`).
- So `held by "<name>"` is a substring for any name that JSON leaves unescaped. It can pass. A client that sends no name
  gets the default name (NIT for B4).

**Log sites.** `grep -rn "console\.(log|warn|error|info|debug)" extension/src` finds 15 sites. Only
`badge.ts:183` (`safety: …` texts, `badge.ts:70-76`) lacks the `[bridge]` prefix. None prints a URL:
- evaluate prints a length (`handlers/evaluate.ts:39`).
- `sw.ts:329` prints the socket error, whose only URL would be `ws://127.0.0.1:9234`. That holds none of the listed parts.

`extension/src/opener-join.ts:11` says "No log call", and there is none. On a correct build, `console-url=0` and the
"names the join" part of `console-join` can hold.

**The capture instrument (MAJOR-1).** The readings assume a console capture made of console lines. The instrument liveA20
used, which B4 will reuse, is `Save-S11bConsole` (`recipes/s11b-win.ps1:185-193`). It walks
`FindAll(Descendants, TrueCondition)` over the DevTools window and writes **every element's UIA Name** as one line. The
count is taken by `Get-R20ConsoleCount` (`recipes/s13-r20.ps1:184-186`).

liveA20's deltas over one leg were `console-new=95`, `90`, `129` (`S13-live-record-liveA20-att3.txt` l.28, 37). These
are `cn1-cn0` (`recipes/s13-r20-a.ts:124-140`) over legs of about 4 s that make roughly a dozen `evaluate` calls. The
capture therefore changes in ways not explained by product log lines.

**Line forms vs. preamble.** The expected-text lines agree with the note's line forms. Every value is a count, a label
or a fixed word, and nothing quotes a console text, URL or name. This agrees with the preamble at l.1942.

### Check 4: the dated note

- `git diff --numstat` gives `8 0 docs/e2e-test-plan.md`, a pure insertion. The liveB20 order line (l.1980) and the
  bullet at l.1997 are untouched, and the order and "11 ids and one probe" (8+3, from l.1997) are stated only in the
  note.
- `grep -n "R20-POP-[A-Z]*-2" docs/e2e-test-plan.md` finds nothing. No -2 id is reused.
- The note keeps liveA20's FAILs and #406 standing, and judges G1.4 on BG-3.
- `popup-lease-wrong` is extended to the -3 rows. The `unjoined` and `human` legs are added to the up-front list by note.

### Check 5: no path and no user name

`git diff -U0 docs/e2e-test-plan.md | grep "^+" | grep -i 'C:\\|Users|<user and git names>'` exits 1 (no match). The
evidence file holds no path either.

### Check 6: doc-check

`node scripts/doc-check.mjs` exits 0 and reports three items:
- counts in code (tools 25, router methods 28, codes 27);
- `CLAUDE.md:114 5596 passed`;
- `docs/plans/next-session-prompt.md:15`.

It checked 38 living docs. All three items predate this diff (the builder reported the same three). None is new.

---

### MAJOR-1: clause (2)'s readings do not fit the capture they will run on

**Where:** `docs/e2e-test-plan.md:2002`, the clause (2) sentences ("Printed during the leg …"; "comes from the opener
join … a `[bridge]` line matching none of the product's log-site forms").

**Evidence:** Check 3. The capture is a dump of the UIA Names of all DevTools descendants, not a list of console
messages. Two failure modes follow, and neither has been measured:

**(a) It can FAIL by construction.** `console.log("[bridge] evaluate", expression.length, "chars")` passes three
arguments, and DevTools renders them as separate spans. A descendant walk may emit `[bridge] evaluate` as a Name of its
own, with or without the row's joined text. Such a fragment matches no whole-line log-site form, so under the note's
rule it "comes from the opener join". The result would be `console-join>0`, a FAIL on a correct build. Every leg makes
`evaluate` calls, and leg `third` makes one every 300 ms. This is -2's N1 class: a reader rule that the instrument
cannot satisfy.

**(b) It can read `unread` by construction.** "Printed during the leg" requires the after-capture to begin with the
before-capture. Three things can break that prefix on a correct build:
- the DevTools console list may be virtualized (rows scroll out of the tree);
- identical consecutive messages are grouped, and leg `third` repeats `[bridge] evaluate 1 chars`;
- any changing UI name may sit after the message list.

If the prefix breaks, the clause reads `unread`, BG-3 cannot PASS, and G1.4 is again unproven. That outcome is what
#407 was ruled to prevent. liveA20's unexplained deltas of 90-129 lines suggest the capture's structure shifts within
a leg.

**Suggested fix (the step agent chooses; it must be written before liveB20):**
1. State the capture's unit. A capture line is a UIA Name. A `[bridge]` Name matches a log site when it is that site's
   rendered text or one of its fixed pieces (for example `[bridge] evaluate`, `chars`).
2. Add a measured precondition before liveB20 that the before-capture is a prefix of the after-capture and that the
   delta holds every line the leg printed. For example, check that the delta holds the leg's known number of
   `[bridge] evaluate` texts, allowing for grouping. Measure it in a scratch Chrome (#294) or in B4's dry run. If the
   control fails, the clause is NOT MEASURED by a stated instrument limit, not an unexplained `unread`.
3. Optionally, if the prefix fails, judge content over the whole after-capture. This is stricter than the leg window, so
   it cannot flatter. It still needs (2)'s completeness evidence, because lines missing from the tree cannot be judged.

**E1 (escalation item, not a rewording of #407):** if no capture of the worker console can be shown complete, clause (2)
cannot be measured as #407 words it, and BG-3 cannot PASS on any build. That should go to the user before liveB20, not
after.

### MAJOR-2: `popup-opened` read conjunctively can hide a popup leased to nobody

**Where:** `docs/e2e-test-plan.md:2002`, clause (3): "`popup-opened` is read from `listTabs` (the tab count, and a new tab
whose opener chain is O)".

**Evidence:** the opener chain available to a client is Chrome's `openerTabId` on the `listTabs` row. It is present
"Only when Chrome reports one" (`shared/src/protocol.ts:772-773`; `ListTabsRow` extends it at l.785). The product grants
only through that field ("no join, no grant", #385; `intercept.ts:323, 350-356`).

Read as "count rose **and** opener is O", a popup that Chrome creates without `openerTabId` reads `popup-opened=no`. The
round then becomes NOT MEASURED instead of the FAIL #407 orders: "a popup opened and leased to nobody (a product
finding: back to the user)". liveA20's human leg printed `granted-to=none` (#406), which is exactly the case to tell
apart. This loosens #407's clause (3), which asks only "whether a popup tab was created".

**Suggested fix:** `popup-opened=yes` whenever a new tab appears after the click, meaning a `listTabs` row absent before
the click that no client opened. Record its opener separately and do not judge it, for example `opener=<O or other or
none>` in the human `CHECK` line.

### NIT-1: spans outside the enumerated list

**Where:** l.2006-2008, c1 and c6. The c1 "— re-measures … per #407" suffix and the c6 `; decision #407` pointer are
outside the brief's list. The preamble at l.1942 requires the first, and the second is an inert pointer to the source.
Accept both.

### NIT-2: wrong file named for the log-site list

**Where:** l.2002. The note says `extension/test/log-scan.test.ts` "lists the sites". The list is
`extension/test/log-allowlist.ts`, which `log-scan.test.ts:9` imports. Its entries are source forms, and B4 must derive
rendered forms from them. Suggested fix: name `log-allowlist.ts`.

### NIT-3: an unchanged procedure reference

**Where:** l.2008, c3. OTHER-3 keeps "as in R20-POP-BG" for the opening procedure. That procedure is identical in BG-3,
so it is harmless (the builder's proposed decision). Accept.

### NITs for the B4 driver (implement exactly)

1. `holder=A` requires the substring `held by ` + `JSON.stringify(<A's hello name>)`. Give every actor an explicit
   plain-ASCII hello name with no quote or backslash; without one, the registry uses `DEFAULT_CLIENT_NAME`.
2. `held-call=TAB_HELD` means **both** B's popup call and B's control on O answer code `TAB_HELD`. A control that is not
   `TAB_HELD` fails the clause. Never compare the messages, and never print them.
3. In leg `human`, B's probe runs after the `popup-opened` read and the grant read, so it cannot affect the grant.
   `held-call=n/a` applies only for rounds with no popup.
4. The `popup-opened` read happens at or after `sent` + 1 000 ms, matching the popup's row against the pre-click row set
   (MAJOR-2's fix).
5. A per-round STOP: `popup-lease-wrong` on a grant to B or C, in every leg including `human`.
6. Console matching: case-insensitive `opener-join|openerjoin|opener_join`. The URL parts are `localhost:<P>` with the
   slice's real `<P>`, `e2e-playground.html?popup` and `popup=1`. Run them on the window-title-cleaned delta. Print
   counts only.
7. `n=` counts only the rounds counted. A leg with fewer than 3 counted rounds is NOT DISCRIMINATING (the `bg`/`third`
   guard) or NOT MEASURED (`human` with no popup), never PASS.
8. Each leg prints exactly one `CHECK <row> <leg> console-new=<n> RECORD`, and the value never enters the verdict.

## 7. Handoff

Nothing running. Nothing committed. A fixer addresses MAJOR-1 and MAJOR-2 in the dated note. MAJOR-1 may need the
step agent's measurement or E1's escalation first. A fresh verifier then re-checks only the note's clause (2) and (3)
sentences and re-runs the cell diff, to confirm that the row cells are still unchanged.
