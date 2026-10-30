# S6 verifier 2 — Step 13 docs, after fix round 1

Claude Opus 5.5, medium. I only read and ran commands; nothing was edited except this report, and nothing was committed. Scope: the
findings of `S6-verifier.md` checked against `S6-fixer1.md`, the uncommitted diff of `README.md`,
`docs/progress-and-roadmap.md`, `docs/setup.md`, and `S6-claude-md-proposals.md` / `S6-builder.md`.

## Verdict: PASS-with-notes

All seven findings are fixed. Every sentence the fixer added cites an R20 row that exists, with the "as verified" verdict
in `S5-run-record.md`. Two NITs are left: one is a leftover part of MINOR 1, and one is a tense mismatch. Neither is wrong.

## Commands

- `node scripts/doc-check.mjs`: exit 0; `tools: 25 · router methods: 28 · codes: 27`. Flags: `CLAUDE.md:114  5596 passed`
  and `docs/plans/next-session-prompt.md:15 **Resume:** …` (status text). Both are out of lane, as the brief says. No dead path.
- `git diff --stat`: `README.md | 17`, `docs/progress-and-roadmap.md | 21`, `docs/setup.md | 70`. Only those three
  files changed (the S6-* files are untracked).
- Local path, user name and token: a grep of the diff plus the proposals and builder files for `c:\users`, `/c/users`, the user
  name and `appdata` found nothing. The `bridge.token` string appears 0 times.
- No count changed in the fix round, so I did not re-run `npm test` (6030 / 251 stays the first verifier's figure).

## Findings re-checked

| Finding | Status | Evidence |
|---|---|---|
| MAJOR 1 (stale "not yet shown") | **fixed** | setup.md:649 R19-ARGS-3 → "was not shown in Run 19" plus a dated note citing R20-ARGS-3 PASS; :652-654 R20-ARGS-OLD PASS; :757 R20-CON-4 PASS; :760 R20-CON-FLOOR PASS; :927-928 R20-CHOOSE-REFUSE-DIS PASS; :1435-1437 R20-ARGS-OLD, R20-VERSION PASS. Record rows: R20-ARGS-3 PASS (:71), R20-CON-4 PASS (:72), R20-CON-FLOOR PASS (:73), R20-ARGS-OLD PASS (:74), R20-CHOOSE-REFUSE-DIS PASS (:131), R20-VERSION PASS (:133). The texts match the record's evidence: `MCPLINE … text=exact` (A3:122-128); `flip BAD_PARAMS exact` (B:107-110). R19-G2-1's "cause not established" is left as is. The setup guide now agrees with the roadmap (:882, :885). |
| MINOR 1 (popup note italics) | **fixed** (one residue, NIT A) | setup.md:286-289: the 2026-10-29 span now closes after `opener-join.test.ts`.)*`; the 2026-10-30 note is its own `*…*` span (:290-296). The asterisks balance. |
| MINOR 2 (proposals miss the chooser bullet) | **fixed** | proposals (d10), lines 100-103. It names `extension/src/CLAUDE.md` 47-51, which still holds the stale bullet (checked). Its text matches the record: CHOOSE-REFUSE-DIS PASS `BAD_PARAMS`; CHOOSE-KEPT RECORD, an identical selection fires no `input`/`change` and `cancel` fires (record :130, :155, :279). |
| MINOR 3 (POP FAILs overstated) | **fixed** | README:76 "three popup rows that fail on two sheet clauses (#406)"; setup.md:292-294 "FAIL on two sheet clauses, one that cannot pass by construction and one that console lines cannot bound, while their lease clause held (#406)". Both match record :214 and #406. |
| NIT 1 (builder doc-check flags) | **fixed** | S6-builder.md:13-15 lists both flags. |
| NIT 2 ("nothing of Step 13 is pushed") | **fixed** | README:77 and roadmap :5 now say "nothing of Step 13's build is pushed". |
| NIT 3 (dangling "next:") | **fixed** | roadmap :5 "pushed; next: *(superseded 2026-10-30: Step 13 is built, see above)* **Step 13** (…)". The phrase reads as history with its marker. |

Other checks on the added sentences:
- Dated notes follow the doc's style (`*Updated 2026-10-30: …*`, `*superseded 2026-10-30: was …, because …*`). The italics
  balance in every added span: setup.md:649, :653-654, :757 (inside parentheses), :760, :910, :927-928, :1435-1437, and the
  README superseded note.
- The #369 "DevTools wins" text: `grep -n "DevTools wins"` finds it only at setup.md:1444, unchanged. The fixer did not touch it.
- Verdicts named outside the fixer's list but still in the diff (R20-POP-BG-3 PASS, R20-POP-FG-3 PASS, R20-CHOOSE-KEPT RECORD,
  R20-ARGS-ORDER RECORD as printed, R20-POP-OTHER-3 NOT MEASURED) match the record, :126-133 and :214-216.

## Findings

### NIT A — setup.md:286-289: the 2026-10-29 note's last sentence was removed without a marker

- **Evidence:** the diff deletes "The live check is Run 20's R20-POP-BG." from the `*Updated 2026-10-29 …*` note and
  puts a test citation (`extension/test/opener-join.test.ts`) into that dated note. Neither change has a marker.
  `docs/docs-writing-guide.md` rule 5 (supersede with a dated marker). The first verifier's fix said "keep or mark" the
  sentence. The fixer closed the italics but did neither.
- **Fix (optional):** restore the sentence, or add `*Superseded 2026-10-30: was "The live check is Run 20's R20-POP-BG",
  because Run 20 ran it.*` before the 2026-10-30 note. The meaning is correct as it stands, because the next note reports
  the check.

### NIT B — setup.md:934-935: the R19-VERSION sentence keeps the present tense

- **Evidence:** "R19-VERSION is not discriminating on its MCP leg … so the live MCP text is not yet shown." It is followed by
  the builder's `*Updated 2026-10-30: … (R20-VERSION, PASS).*`. The fixer changed its siblings (:649, :652-653) to "was not
  shown in Run 19". This line is the only "not yet shown" left in the file (`grep -n "not yet shown" docs/setup.md` → :935).
  The dated note right after it makes it accurate, so this is a matter of consistency only.
- **Fix (optional):** "R19-VERSION was not discriminating … so the live MCP text was not shown in Run 19."
