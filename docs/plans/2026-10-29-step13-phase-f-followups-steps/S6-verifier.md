# S6 verifier — Step 13 docs

Claude Opus 5.5, medium. Read-only; nothing edited except this report; nothing committed. Scope: `git diff` of
`docs/setup.md`, `docs/progress-and-roadmap.md`, `README.md` at HEAD `f6bafc5`, plus `…-steps/S6-claude-md-proposals.md` and
`…-steps/S6-builder.md`. Sources read: the phase doc (§ S6, Exit checks D6.1, § As built), `S5-run-record.md` §1–§7,
`docs/e2e-test-plan.md` Run 20 entry (3683–3698), `S5-liveC20b.md` §6, `docs/cleanup/2026-10-29-evidence/plan-drift.md`
finding 1, the package `CLAUDE.md` files, and the code named below.

## Verdict: FAIL

One MAJOR (stale "not yet shown live" sentences in `docs/setup.md` that Run 20 made false and that now contradict the
roadmap and README written in the same stage), three MINOR, three NIT. Everything else checked holds.

## Re-derived numbers

- `npm test` (2026-10-30, HEAD `f6bafc5`, tree with the S6 docs diff): `Test Files  251 passed (251)`,
  `Tests  6030 passed (6030)`; exit 0. Matches README:80, roadmap :5 and :195, proposals (c), builder §2.
- `node scripts/doc-check.mjs`: exit 0. `tools: 25 · router methods: 28 · codes: 27`. Flags: `CLAUDE.md:114  5596 passed`
  (expected, out of lane; proposals (c) covers it) and `docs/plans/next-session-prompt.md:15 **Resume:** …` (status text
  outside CLAUDE.md; out of lane, pre-existing). No dead path.
- Counts 25 tools / 28 router methods / 27 codes (26 on the wire): stated the same in roadmap :5, README:23, proposals (a).
- Lane: `git diff --stat` → `README.md | 18`, `docs/progress-and-roadmap.md | 21`, `docs/setup.md | 49`; 3 files only.
- Local path / user name / token: `(git diff; cat S6-claude-md-proposals.md S6-builder.md) | grep -i
  "c:\\users|/c/users|<user>|appdata|home/|~/"` → no hit; token string from `bridge.token` → count 0.

## Check 1 — citations and verdicts

Every added behaviour sentence I found cites an R20 row or a test, and each cited test file exists (`ls` of
`extension/test/{opener-join,s13-envelope,s12-args-cdp,s5a-chooser,manifest,debugger-keeper}.test.ts`,
`sdk/test/s12-console-cap.test.ts`, `mcp/test/{s13-chooser-busy,s12-console-cross}.test.ts`,
`daemon/test/s12-chooser-feature.test.ts`: all present). Each supports its sentence (grep: `s12-args-cdp.test.ts:256`
"the value keeps the page's key order through every serialiser path"; `s12-console-cap.test.ts:11` the `older lines cut`
marker; `s5a-chooser.test.ts:577-578` pins `CHOOSER_BUSY_MESSAGE`; `s13-chooser-busy.test.ts:23` bare message, `isError`;
`manifest.test.ts:39-44` exactly `webNavigation`; `s12-console-cross.test.ts:154` the class-name sentence).

Verdicts against `S5-run-record.md` "as verified": R20-ARGS-ORDER is RECORD as printed everywhere (README:33-34, setup.md:627-628,
roadmap :882); RESTORE rows FAIL (README:78, roadmap :5, :174); R20-POP-OTHER-3 NOT MEASURED (README:32, setup.md:292);
tally 20/8/1/3/2 of 34 (README:38-39, roadmap :5, :174) = record §1d and e2e-test-plan :3698. R20-POP-BG-3 110 ms, -FG-3
54 ms, CHOOSE-TWICE 7 ms `names-devtools=no`, CON-CAP indexes 192–200, G2-1 35 120 ms all match record §1a–§1b.

## Check 2 — quoted texts against code (byte for byte)

- `CHOOSER_BUSY_MESSAGE` (`extension/src/handlers/upload.ts:49`) = setup.md:908 quote. Match.
- `browser_console_messages` description (`mcp/src/tools/registry.ts:945`): the frames clause and "An object logged before
  this call shows its class name only, not its contents." match setup.md:166 and :774.
- #398 marker (`sdk/src/format/console-messages.ts:44`) `… [truncated: ${start} older lines cut — narrow with level/limit]` =
  setup.md:764 `<n>` form. Match.
- `OPENER_JOIN_HOLD_MS = 250` (`extension/src/opener-join.ts:16`) = "within 250 ms" setup.md:286.
- `extension/manifest.json:8` ends `"webNavigation"` = setup.md:103.

## Check 3 — phase doc § S6 items

Done: permission (setup.md:102-105), popup lease (:284-293), key order (:624-628), console cap and CON-NOTEA limit
(:761-766, :772-776), chooser text (:908, :1447-1448). Plan-drift finding 1's two in-lane amendments are dropped (tool-table
row :166 now states the frames clause as current text; the "description says only that frames are not read" sentence at
:750-751 replaced). Roadmap shows Step 13 built and Run 20 recorded, "It is not closed" (:5), table row "**not closed**"
(:174). README behaviour paragraph added (:66-79). Greps for "sorted", "oldest", "close DevTools", "frames are not read",
"unowned", "5596" in the three docs: remaining hits are history inside dated notes or still true (`oldest first` for the
print order; "unowned until someone claims it", :280; "Close DevTools" at :1444 is the #369 text, left on purpose).

Not done: the MAJOR below.

## Check 4 — #369 claim

`grep -n "DevTools wins" README.md docs/setup.md` → only setup.md:1444, unchanged; the only addition there is a dated note
about the chooser text. The proposed reword is in proposals (f), marked "waits for the user". Holds.

## Check 5 — proposals file

Covers the root Current state block (a), the test count (c), the plan-drift caveats in `mcp/CLAUDE.md` and
`extension/src/CLAUDE.md` (d1, d3), key order in `mcp/`, `sdk/`, `extension/src/evaluate/CLAUDE.md` (d2, d5, d6), the
false popup sentence in `daemon/CLAUDE.md:78-83` (d7), `opener-join.ts` in `extension/CLAUDE.md` Key files and the manifest
fact (d8), the settle-pause line for `daemon/CLAUDE.md` (d9). The `recipes/CLAUDE.md` DevTools UIA gotcha (b) is faithful to
`S5-liveC20b.md` §6 item 1 (nested pairs, ExpandCollapse/Invoke, the window's own tree, Group+Invoke / Button+Toggle,
Toggle=On, Group invoke undocks and docks); its "a reader that needs exactly one button finds two" comes from §2 and the
record §1c, also accurate. One stale statement missed (MINOR 2).

## Findings

### MAJOR 1 — `docs/setup.md` still says six Run 19 gaps are "not yet shown live" though Run 20 showed them; the roadmap and README now say the opposite

- **Where:** setup.md:646-647 ("so the MCP's live refusal of `args` is not yet shown", R19-ARGS-3); :649-651 ("R19-ARGS-OLD is
  not discriminating … so the live MCP text is not yet shown"); :754-755 ("the live row R19-CON-4 is not discriminating");
  :757-758 ("so it is not discriminating and the floor is not yet shown live", R19-CON-FLOOR); :921-923 (R19-CHOOSE-REFUSE not
  discriminating; R20-CHOOSE-REFUSE-DIS reached the disabled-input `BAD_PARAMS` live); :1429-1431 ("the live rows R19-ARGS-OLD
  and R19-VERSION did not discriminate on that MCP leg, so its exact printed form is not shown live").
- **Evidence:** `grep -n "not yet shown\|not discriminating\|not shown live" docs/setup.md` lists these lines with no 2026-10-30
  note. Record §1a: R20-ARGS-3 PASS (`MCPLINE … text=exact`, A3:122-128), R20-ARGS-OLD PASS (MCP `text=exact`, A3:239-250),
  R20-CON-4 PASS (A3:152-157), R20-CON-FLOOR PASS (A3:177-178); §1b: R20-CHOOSE-REFUSE-DIS PASS (`flip BAD_PARAMS exact`,
  B:107-110), R20-VERSION PASS. The roadmap diff states "R20-CON-4 and R20-CON-FLOOR PASS" (:885) and "R20-ARGS-3 PASS"
  (:882), and the builder updated the analogous R19-VERSION sentence (setup.md:930-932), so the user guide now contradicts the
  roadmap on the same rows and is inconsistent with itself.
- **Fix:** add a dated note after each, in the style of :931 (`*Updated 2026-10-30: Run 20 … (R20-ARGS-3, PASS).*` etc.),
  citing R20-ARGS-3, R20-ARGS-OLD, R20-CON-4, R20-CON-FLOOR, R20-CHOOSE-REFUSE-DIS, R20-VERSION. Leave R19-G2-1's "cause not
  established" (:338-339, :1435) as is: record §6 item 1 says the covered-window cause label is the sheet's, not proven.

### MINOR 1 — setup.md:284-293, the popup note: a dated note's sentence removed with no marker, and the italics broken

- **Evidence:** diff removes "The live check is Run 20's R20-POP-BG." from the `*Updated 2026-10-29 …*` note with no "was"
  marker, inserts a test citation into that 2026-10-29 note, and opens `*Updated 2026-10-30 …*` before the first `*` is
  closed (line :288 `(`extension/test/opener-join.test.ts`). *Updated 2026-10-30`), so one asterisk renders literally.
  `docs/docs-writing-guide.md:56-57` (supersede with a marker).
- **Fix:** close the 2026-10-29 note after "unowned." and keep or mark its last sentence (`*Superseded 2026-10-30: was "The
  live check is Run 20's R20-POP-BG", because Run 20 ran it.*`), then put the 2026-10-30 note as its own italic span.

### MINOR 2 — proposals miss the stale chooser bullet in `extension/src/CLAUDE.md:47-51`

- **Evidence:** it says the disabled-input refusal cannot be reached live (R19-CHOOSE-REFUSE `dis` NOT DISCRIMINATING) and
  R19-CHOOSE-KEPT "cause not established". Run 20: R20-CHOOSE-REFUSE-DIS PASS (B:107-110); R20-CHOOSE-KEPT RECORD, an
  identical second selection fires no `input`/`change` and `cancel` fires (B:94, 97). Proposals (d) has no item for it;
  (d9) only greps `extension/src/handlers/CLAUDE.md` and `extension/CLAUDE.md`.
- **Fix:** add a (d) item: append the R20 results to that bullet (a page whose own control flips the input to disabled
  reaches `BAD_PARAMS` live; CHOOSE-KEPT is Chrome's unchanged-selection rule, a RECORD).

### MINOR 3 — README:76-77 and setup.md:290-291 overstate the POP FAILs

- **Evidence:** README "the failures are three sheet clauses that cannot pass"; record §1a and #406: three rows (POP-BG,
  -FG, -OTHER) each fail on **two** clauses, of which the first (`held-call` equal to the control's `TAB_HELD` text) cannot
  pass by construction and the second (`console-new=0`) "cannot be bounded from console lines". setup.md says both "cannot
  pass by construction".
- **Fix:** README "three popup rows that fail on two sheet clauses (#406)"; setup.md "on two sheet clauses, one that cannot
  pass by construction and one that console lines cannot bound (#406)".

### NIT 1 — builder §2 says doc-check's "only flag is `CLAUDE.md:114`"; it also flags `docs/plans/next-session-prompt.md:15`
(status text; out of lane). Report accuracy only.

### NIT 2 — README:41 and roadmap :5 "nothing of Step 13 is pushed": the Step 13 plan and kickoff are on `origin/main`
(`git log origin/main -1` → `1171805 docs: Step 12 closes — … Step 13 plan and kickoff`). Say "nothing of Step 13's build
is pushed".

### NIT 3 — roadmap :5, Step 12 text: "pushed; *(was "next: Step 13" on 2026-10-29; …)* **Step 13** (the Phase F follow-ups,
…), then a minimal Phase G" reads as a dangling phrase now that "next:" is gone. Either keep "next:" inside the history
text with the dated note after it, or drop the parenthetical tail.

## Builder claims audited

- §2 test count, doc-check counts, lane: confirmed (except NIT 1).
- §3 table: each listed change is in the diff with the citation stated.
- §4 "#369 text left as is": confirmed (Check 4).
- §6 "no doc calls R20-ARGS-ORDER PASS": confirmed (`grep -n "ARGS-ORDER" README.md docs/setup.md docs/progress-and-roadmap.md`).
- §7 "no local path or user name": confirmed.
