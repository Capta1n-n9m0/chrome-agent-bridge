# S7-helpers — Run 17b's live helpers (step report)

Step agent: Claude Opus 5.5, medium effort. Risk: low (recipes, tests). Children: builders H1–H3 (Sonnet, medium),
verifiers 1–4 (Opus, medium), fixers 1–2 (Sonnet, medium), fixer 3 (Opus, medium, the third round §7 allows),
committer (Sonnet, medium).

## 1. Verdict
DONE. Every helper of `docs/e2e-test-plan.md` §4.25's "Helpers needed" list (line ~1713) exists in `recipes/s11b*`,
with tests, proven offline only. Nothing drove Chrome, the extension, the daemon or port 9234. The commit hash is in
the committer's hand-back.

## 2. Outputs
- New: `recipes/s11b-r17b.ps1` (every `r17b-…` block, `liveA17B`/`liveB17B`, R17B-0's joined first line, the STOP map,
  no NOT BUILT path; reads Run 17's blocks from `s11b-r17.ps1` with PowerShell's parser, which it checks: 0 errors,
  49 functions, 49 blocks), `s11b-r17b-plan.ts` (order, STOP map, expected text by key, `-Block plan`),
  `s11b-r17b-rules.ts` (activation guard, strict-call STOPs, R17B judges, `histReplyLine`, RD-2's own-row snapshot
  judge), `s11b-r17b-build.ts` (BUILD / TABWATCH parsers and judges, newtab-timed judge); six test files
  `recipes/test/s11b-r17b-{hist,build,press,plan,static,fix}.test.ts`.
- Changed (additive; Run 17's paths unchanged, old test counts per file unchanged): `recipes/s11b.ts` (history kind
  `p3`, `history --activate --label`, R17B ids in `HISTORY_ROWS`, ops `ctl-slow`, `tabwatch`, `build-proof`,
  `newtab-timed`, `r17b-clause`, `carried-row`, `rd2-row`; `ctl --skip`), `s11b-rules.ts` (`HistoryKind`/`historyPlan`
  `p3`, `judgeCtl` optional `skipped`), `s11b-win.ps1` (`Invoke-S11bPressAfterReply`, console op `tabwatch`),
  `s11b-win-rules.ts` (press timing), `recipes/test/s11b-win-static.test.ts` (line cap 440 → 480, a size guard;
  verifier 1 F10 accepted), `recipes/tsconfig.s11b.json` (includes).
- Numbers: `npm test` 4560 passed / 184 files at `d68d14c` (step agent, before) → **4663 passed / 190 files**
  (verifier 4), none removed. `npm run typecheck`, `npm run build` and all seven recipes tsconfigs exit 0 (verifier 4).
  `git diff HEAD -- docs/e2e-test-plan.md recipes/s11b-r17.ps1 extension daemon shared sdk mcp` empty.
- Brief READ list given to children: §4.25 (lines 1677–1715) and §4.24 (1564–1676); the phase doc § S7, § Exit checks,
  § STOP rules, § As built S4-helpers/S6/S7-sheet; decisions #315, #305, #306 (#313 for H2); `S4-helpers.md`,
  `S7-sheet.md`; `recipes/CLAUDE.md`; the existing `recipes/s11b*` and tests.

## 3. Verifier verdicts
- `S7-helpers-verifier.md`: **FAIL** — F1 (NEWTAB-PLAIN could never pass), F2 (RD-2 row left out the answer and
  snapshot clauses), F3 (NEWTAB-REFUSED PASS on the not-reached branch) MAJOR; F4–F7 MINOR; F8–F11 NIT. Fixer 1 fixed
  F1–F7, F11(a)(d)(f).
- `S7-helpers-verifier2.md`: **PASS-with-notes** — N1 (ACT-CTL 12 000 ms on the runner's path), N2 (RD-2 snapshot
  read a summary count) MINOR; N3–N5 NIT. Fixer 2 fixed N1, N2, N3, N5.
- `S7-helpers-verifier3.md`: **PASS-with-notes** — M1 MINOR: fixer 2's count reading allowed a false PASS if another
  hidden tab changed in RD-2's window. Taken to a third round (Opus fixer 3): RD-2 now judges r2's own row by handle.
- `S7-helpers-verifier4.md`: **PASS-with-notes** — M1 fixed (12 mutants, 9 killed; survivors harmless or in glue).
  Open: MINOR, R17B-RD-2's step "Background tab count noted" has no read since fixer 3 removed the `tabs` call before
  `newtab` (nothing judged depends on it); NIT, `rd2-row`'s SDK mapping covered only by text tests. Fix rounds are
  exhausted; both go to S7-live as findings.

## 4. Deviations
- Three builder slices plus three fix rounds (the third on Opus, §7) — M1 could otherwise pass a leak unseen.
- Builders wrote tests with the code; verifiers 1–4 proved them by mutation in scratch worktrees instead.
- `ctl-slow` is a new op rather than a flag on `B17 ctl`; `B17 ctl --skip` added (8088/8089 only; no weakening, F9).
- Run record path in the runner: `…-steps/S7-run-record.md` (the sheet names none; `$Record` in the .ps1).

## 5. Proposed decisions
### 2026-10-27 · R17B-NEWTAB-REFUSED's leftover blank tab fails the row; the wave continues
**Decided:** `ROW R17B-NEWTAB-REFUSED FAIL`, not a STOP. **Why:** the row's pass rule says so; the STOP paragraph covers
a blank tab after a refused *install*, which a `javascript:` refusal of `tabs.update` is not (verifier 1 F7).
**Instead of:** H3's STOP. **Revisit if:** the session agent reads #314's STOP as covering any refused `newTab` step.
**By:** Claude (proposed)
### 2026-10-27 · A wrong `created-url` inside G1 fails R17B-NEWTAB-PLAIN; only R17B-0 (f) stops on it
**Decided:** the helpers keep the rows' own rules: R17B-0 (f) STOPs on `created-url` ≠ `about:blank`; in G1 the same
reading fails R17B-NEWTAB-PLAIN (its pass rule) and is recorded. **Why:** the STOP line "newTab opening its URL before
its rules are installed" is not measurable by `created-url` alone after R17B-0 proved the build; the row text governs.
**Instead of:** a STOP in G1. **Revisit if:** the session agent reads the #311 STOP as binding every `created-url`.
**By:** Claude (proposed; verifier 2 N4, for the session agent)
### 2026-10-27 · R17B-RD-2's snapshot clause is judged on r2's own row by handle
**Decided:** the new `B17 rd2-row --tab r2` reads the SDK tab list and prints `TABROW R17B-RD-2 rows=<n> found=yes
hidden=…` (labels only); unreadable is NOT MEASURED. **Why:** a summary count over every tab could give a false PASS
(verifier 3 M1). **By:** Claude (proposed)
Smaller ones in the leaf reports: H1 history tabs opened by `S9 call newtab` (the guard's `opened` list); H2 TABWATCH
`reply-ms` from the helper's own LAT and its `completes` counting rule; H3 the 8085 counter keeps tag `ctl` (F8a).

## 6. Findings
- For S7-live (open, verifier 4): R17B-RD-2 records no background tab count before `newtab`; the runner adds
  `Call9 'R17B-RD-2' 'tabs0' 'tabs' @() 'record'` between rows if wanted, or records the gap.
- Sheet issues, not resolved by editing the sheet (verifier 1 F8, F6): R17B-CTL's `bctl` tag vs RD-CTL's `ctl` lines;
  `TABWATCH reply-ms` is not a listener value; carried rows print their R17 ROW lines plus a
  `ROW <R17B id> <worst verdict> (as R17 <id>; …)` line the record uses.
- The preflight refuses to start while Run 17's `%TEMP%\bridge-e2e\s11b\r17-globals.clixml` exists (root CLAUDE.md).
- Unproven until the live run: the bridge's `evaluate` giving the activation (R17B-ACT-CTL measures it), the tabwatch
  console listener over UIA, the press-after-reply reading `node-out.txt` while the call runs (verifier 1 measured the
  file readable mid-run).

## 7. Handoff
Nothing running; no port 8080–8099/9234 held by this stage. S7-live needs a clean tree (this commit), the S6 build
loaded (`npm run build` + `recipes/reload-extension.ps1`), the leftover clixml ruled, and `-Block plan` to list the
order. Leaf reports: `S7-helpers-builder1..3.md`, `-verifier.md`, `-verifier2..4.md`, `-fixer.md`, `-fixer2.md`,
`-fixer3.md`.
