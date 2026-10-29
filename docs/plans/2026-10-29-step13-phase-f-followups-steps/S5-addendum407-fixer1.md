# S5-addendum407 fixer round 1

Model Sonnet, effort medium. Edited only `docs/e2e-test-plan.md` (the uncommitted dated note, line 2002, and the human CHECK line form in row 2008's cell 4). Not committed.

## 1. Verdict
DONE.

## 2. Outputs
- `node scripts/doc-check.mjs`: exit 0; the same three pre-existing items (counts in code: tools 25, router methods 28, codes 27; `CLAUDE.md:114 5596 passed`; `docs/plans/next-session-prompt.md:15`); "Checked 38 living docs".
- `git diff --numstat docs/e2e-test-plan.md`: `8	0	docs/e2e-test-plan.md` (unchanged: 8 insertions, 0 deletions).

## 3. Verifier verdict
Not applicable (fixer).

## 4. Deviations
Row 2008 (R20-POP-OTHER-3) cell 4 gained ` opener=<O or other or none>` in its human CHECK line form, because the same words appear there and the form must match the note. No other row cell touched. Rows 2006 and 2007 untouched.

## 5. Proposed decisions
The step agent's rulings (MAJOR-1, MAJOR-2, NIT-2) were written in as given.

## 6. Findings (old to new)

**MAJOR-1, clause (2).** Old: "Printed during the leg" = lines after the leg beyond lines before it, with `unread` if the after-capture does not begin with the before-capture; join = names the join (`OpenerJoin`, `opener-join`, `OPENER_JOIN`) or a `[bridge]` line matching no log-site form; log sites "listed" by `log-scan.test.ts`. New:
- capture unit stated (one line per UIA element name, `Save-S11bConsole`; lines may be pieces);
- content judged over the whole capture saved right after the leg, no prefix rule, no `unread` from a shifted list;
- join = names `OpenerJoin`, `opener-join`, `opener_join` or `OPENER_JOIN`, case-insensitive; the `[bridge]`-matches-no-form rule removed; static fact added: `extension/src/opener-join.ts` has no log call, so no product log line can come from the join;
- URL parts kept (`localhost:<P>` the slice's real port, `e2e-playground.html?popup`, `popup=1`), case-insensitive, any capture line;
- liveness control added: the after-leg capture must hold at least one `[bridge] evaluate` piece from the leg's own evaluate calls, else `console-join` and `console-url` print `unread` and the leg cannot PASS (NOT MEASURED, instrument limit); leg `human` round without a popup makes no probe and is NOT MEASURED anyway;
- `console-new` stated as the capture line count after minus before, never judged;
- closing example reworded to "a piece such as `[bridge] evaluate`".

**MAJOR-2, clause (3).** Old: `popup-opened` read from `listTabs` (tab count, and a new tab whose opener chain is O) after the 1 000 ms bound. New: `popup-opened=yes` whenever a `listTabs` row appears after the click that was absent from the row set read just before it and that no client opened (no `newTab` in flight), read at or after `sent` + 1 000 ms; opener recorded, not judged (`opener=<O or other or none>`, Chrome's `openerTabId` compared with O's tab id). The human CHECK line form gained `opener=<O or other or none>` in the note and in row 2008 cell 4.

**NIT-2.** `extension/test/log-allowlist.ts` named as the log-site list (enforced by `log-scan.test.ts`).

**NIT-1, NIT-3.** Accepted, no change.

## 7. Handoff
A fresh verifier re-checks clause (2) and (3) sentences and the CHECK form, and re-runs the cell diff (expect only the added `opener=` span in row 2008 c4 beyond the first verifier's spans). No local path or user name in the new text.
