# S8-builder — Docs

Claude Sonnet 5.5, effort medium, 2026-10-27. **Verdict: DONE.** No commit.

## Files changed
- `docs/setup.md` (Safety, reload note)
- `docs/progress-and-roadmap.md` (Step 11b block and its table row)
- `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` (one dated note after §10's S6 bullet)
- `extension/src/safety-dnr-keeper.ts` (header comment only, line 7)
- `docs/plans/2026-10-26-step11b-block-list-redirects-steps/S8-claude-md-proposals.md` (new)
- this report

## Changed sentences and their rows
| File | Sentence | Row |
|---|---|---|
| setup.md | P6: `back`/`forward` removed from "can make Chrome load it"; "holds the rules since Step 11b (below)" | R17B-BACK, R17B-FWD |
| setup.md | "While a bridge `navigate`, `browser_new_tab` with a URL, `back`, `forward` or `downloadStart` runs …" | R17B-RD-2, R17B-BACK, R17B-FWD |
| setup.md | newTab covered: blocked 0 (Run 17 RD-2 saw 1); first address `about:blank`; slow page replies 3074-3102 ms | R17B-RD-2, RD-2, R17B-NEWTAB-LOAD |
| setup.md | back/forward covered with an activation, blocked 0, `DOMAIN_BLOCKED`, once each, rules 0 after | R17B-BACK, R17B-FWD, R17B-ACT-CTL |
| setup.md | limit sentence: `INTERNAL` again 1 of 1; reaches only acted-on pages; evaluate gives `ok` 4 of 4; seven upload FAILs not fixed | R17B-BACK-NOACT, R17B-ACT-CTL, #308 |
| setup.md | reload note: S6 opens newTab URL on a blank page | R17B-RD-2 |
| progress | "Updated 2026-10-27 (S8)" paragraph; table row status | R17B-RD-2, R17B-BACK, R17B-FWD, R17B-BACK-NOACT, R17B-ACT-CTL, R17B-LOGS and the seven FAIL rows named |
| spec §10 | dated note: "never on the blank page's load" slightly strong (N1/N3); Run 17b saw none of the first two cases, third not measured | R17B-NEWTAB-LOAD, R17B-RD-2 |
| keeper comment | `newTab` no longer "not covered" | comment only (R17B-RD-2) |

Unmeasured, labelled: `tabs.get().status` after `goBack`; the `tabs.get`-ahead-of-event case; "measured once each" for
back/forward. The seven FAIL rows are stated as not Step 11b claims and not fixed.

## Proposals
P7 and P8 and the Current-state and handlers bullets are in `S8-claude-md-proposals.md`; no CLAUDE.md edited.

## Checks
See the final message for the doc-check line; typecheck/test/build were run because a `.ts` file changed (comment only).
