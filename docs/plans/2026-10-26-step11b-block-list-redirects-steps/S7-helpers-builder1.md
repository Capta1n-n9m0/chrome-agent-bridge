# S7-helpers H1 builder report (Step 11b)

Model: Sonnet 5.5, medium effort. No live run; nothing touched Chrome, the daemon or port 9234. Not committed.

## 1. Verdict
DONE (slice H1: items (a)-(e)). About 330 new lines including tests (cap 600).

## 2. Outputs
Created:
- `recipes/s11b-r17b-rules.ts` (pure: guard, line forms, `strictCall`, `refusedStop`, `judgeR17bRow`, `judgeCtlSlow`, `histSetupBackOutcome`)
- `recipes/test/s11b-r17b-hist.test.ts` (tests in the new file)

Changed:
- `recipes/s11b-rules.ts`: `HistoryKind` gets `"p3"`; `historyPlan("p3", tag)` = three 8081 pages `?s11b=<tag>1..3` (default tag `ac`), 0 set-up backs.
- `recipes/s11b.ts`: `--activate` boolean flag; `history` activation; `HISTORY_ROWS` gets the six R17B ids; `historyCall` and `judge-history` route them; new op `ctl-slow`.
- `recipes/tsconfig.s11b.json`: the two new files added to `include`.

Numbers (commands run here):
- `npm test`: 4583 passed, 185 files (before: 4560 / 184 per brief). None removed.
- `npm run typecheck` 0; `npm run build` 0; `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json` all 0.

## CLI forms for H3 (s11b-r17b.ps1)
- `B17 history --kind p3 --tab <key> [--tag ac] [--activate --label <word>]`. `p3` is the kind for R17B-ACT-CTL (with `--activate --label act-ctl`) and R17B-BACK-NOACT (without it; use another `--tag`, e.g. `na`).
  - Under `--activate`: after each `navigate`, the guard runs, then `evaluate 1`. Prints the existing `HISTORY <kind> built …`, then `HIST <label> built=<n> pages activated=<n>`, then `ACT <label> n=<k> ok`.
  - `--label` is required with `--activate` (the sheet's `act-ctl`, `bk`, `fw`, `sd`, `be`). `--dry` adds ` activate=yes label=<l>`.
  - Works with the existing kinds too (`back`, `fwd`, `samedoc`, `empty`). A refused set-up `back` is then a `STOP: unexpected BridgeError … at=back <i>` (exit 2), never the NOT BUILT path. For `samedoc` the second URL is `…#h2` and is activated too.
  - Guard failure prints `STOP: activation target is not a wave fixture page` (exit 2). The tab's handle must be in `opened` of `$S11_OUT/state.json` or `$S9_OUT/state.json` (union). See Finding 1.
- `B17 back|forward --row <R17B-…> --tab <key> [--times 1|2] [--rules-after n] [--blocked n --flip-total n]`: ids R17B-ACT-CTL, R17B-BACK, R17B-FWD, R17B-BACK-SAMEDOC, R17B-BACK-EMPTY, R17B-BACK-NOACT.
  - Non-`ok` is a `ROW … STOP` line plus `STOP: …` (exit 2), at once on any call, including the first of a pair, for ACT-CTL, SAMEDOC and EMPTY. For R17B-FWD only the first call of a `--times 2` pair is strict, so call the first forward with `forward --times 2` as RD-FWD does; a lone `--times 1` forward is judged like R17B-BACK. RD-* rows are unchanged.
  - R17B-BACK-NOACT: a `ROW R17B-BACK-NOACT PASS: recorded: answer <code>, …` line is always printed, after the RECORD/HISTREPLY lines, whether or not `--rules-after` is given.
  - Other R17B rows print their `ROW` only when `--rules-after` is given, as RD-* rows do.
- `B17 judge-history --row <R17B-…> --answer … --ms … [--rules-after …]` routes to the same judge.
- `B17 ctl-slow [--p87 8087]`: one timed GET of the slow server (tag `bctl`); prints `CTL 8087 slow answered after <ms> ms` and `ROW R17B-CTL 8087 PASS|STOP` (200 and at least 3 000 ms, else STOP).

## 4. Deviations
- Tests were written together with the code, not shown failing first; the pure logic is covered, and the `s11b.ts` wiring is pinned by static-slice tests as `s11b-hist-notbuilt.test.ts` does. Not shown by mutation.
- `ctl-slow` is a new op rather than a flag on `B17 ctl` (the brief allowed either); `B17 ctl` is untouched.
- The slow GET goes to 127.0.0.1:8087 like the other controls (the sheet's example URL says `localhost`).

## 5. Proposed decisions
None.

## 6. Findings (helper/sheet mismatches, none resolved by editing the sheet)
1. §4.25 says the guard checks the handle is "in its own `opened` list", but `s11.ts make` writes `state.json` without `opened` (recipes/CLAUDE.md, Run 17's helper facts). Only `s9.ts` keeps `opened`. H3 must open the history tabs via `S9 newtab` (or an equivalent that records them in `opened`), else `--activate` stops at its first page. I did not touch s9.ts (not my lane).
2. The sheet's row table says R17B-BACK-NOACT is judged by `B17 history`, `B17 back`; with `--activate` absent it prints a PASS-by-recording ROW. The sheet states the same ("passes by being recorded").
3. The Known limit (activation via `chrome.debugger` unmeasured) remains for R17B-ACT-CTL's live run.

## 7. Handoff
No processes or files left. H2 (build-proof, tabwatch, newtab-timed, press-after-reply) and H3 (s11b-r17b.ps1) follow. Existing static test `s11b-hist-notbuilt.test.ts` still pins the `if (!nb) throw e;` and the NOT BUILT tail, which are kept.
