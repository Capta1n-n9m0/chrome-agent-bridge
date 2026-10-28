# S7-helpers-a — Run 19's helpers, part a: the S12 fixture pages, Run 18's three helper fixes, liveA19's line forms

Step agent: Claude Opus 5.5, medium. Builder Sonnet 5.5, medium; fixer Sonnet 5.5, medium; verifiers Opus 5.5, medium;
committer Sonnet 5.5, medium. Risk low (#357). No live run: nothing drove Chrome or the daemon; port 9234 untouched.
Brief's READ list: `docs/agent-rules.md`; `docs/e2e-test-plan.md` §4.27 (and §4.26's line-form paragraph by grep); phase
doc § S7 and § Exit checks; `S7-sheet.md` §7; `S1-run-record.md` §6; `S1-helpers-a.md`, `-b.md`, `-c.md` §7; decisions
#349, #351, #356, #357; `recipes/CLAUDE.md`; `test-fixtures/`.

## 1. Verdict
DONE. One fix round (of three).

## 2. Outputs
- Commit: `4673783` (21 files; this hash line itself is written after the commit and is left uncommitted for the session agent's bookkeeping commit).
- New: `recipes/s12-forms.ts` (forms (1)–(13), the console-clause settler, the identical-ROW dedupe),
  `recipes/test/s12-forms.test.ts`; `test-fixtures/s12-console.html` + `.js`, `s12-notea.js`, `s12-noteaok.js`,
  `s12-chooser.html` + `.js`, `s12-chooser-frame.html`.
- Edited: `recipes/s12-rules.ts` (`optO2NoteLine`), `recipes/s12-win.ps1` (`Format-S12OptO2Note`, printed by
  `Invoke-S12Opt` when O2 is not shown), `recipes/s11b-rules.ts` (UP-OPT over-bound wording only, no verdict moved),
  `recipes/test/s11b-h8.test.ts` (one test added, none changed or removed), `test-fixtures/e2e-playground.html`
  (the `s12=` block: `window.__s12`, `beat`, `#tb`, the click counter). `e2e-playground-csp.html` already served
  `#eval-probe`; unchanged.
- Numbers (verifier 2's re-run, `S7-helpers-a-verifier2.md`): `npx vitest run recipes/test` 1211 → 1242 (55 files);
  `npm test` 5142 passed; `npm run typecheck`, `npm run build`, the seven `npx tsc --noEmit -p recipes/tsconfig*.json`
  and `node scripts/doc-check.mjs` exit 0; doc-check lists no dead path at all (no S12 page left dead, part B's chooser
  pages included). Size 357 code lines (fixtures counted) + 309 test lines, under 400 + 600.
- Red first: verifier 1 ran 33 mutants and the test caught 30 of them; verifier 2 ran 44 and the test caught all 44.
  With every export stubbed, 17 tests fail and 9 pass.

## 3. Verifier verdict
- Verifier 1 (`S7-helpers-a-verifier.md`, with its evidence file): **FAIL**. MAJOR-1: the preflight guard missed
  #351 (4) (c)'s measured cause, the identical `ROW RULES PASS: RULES 0` at R18-0 and at the restore. MINOR-1 to 4,
  NIT-1, NIT-2, and wording notes W1–W3.
- Fixer (`S7-helpers-a-fixer.md`): fixed MAJOR-1 (`dedupeIdenticalRows`, tested on Run 18's own record lines),
  MINOR-1 to 4 and NIT-2. None disputed.
- Verifier 2 (`S7-helpers-a-verifier2.md`, with its evidence file): **PASS-with-notes**.
  - NIT-A: the dedupe also hides a real same-verdict re-print. The runner may dedupe `ROW RULES` only.
  - NIT-B: the record still prints the preflight rows twice. The goal (no WARN) is met.
  - NIT-1 and W1–W3 stand.

## 4. Deviations
- Form (13): §4.27 part A defines `DAEMONLOG <row> sentinel=<n> console-text=<n>` while saying it is part B's. Part B's
  (28) is `DAEMONLOG <slice> … args-text=<n>`. (13) is built from part A's keys; (28) is S7-helpers-d's.
- #351 (4) (b) and (c) are built as reusable pieces. Calling them is S7-helpers-d's runner duty, because the order of
  rows belongs to the runner.
- The chooser pages (part B) are built here, so S7-helpers-c need not build them.

## 5. Proposed decisions
None.

## 6. Findings
Wording in §4.27, for the record; none was edited:
- W1. R19-CON-1, -2 and -REJ's expected `CON` lines omit `cut=` (`docs/e2e-test-plan.md:1792-1794`).
  R19-CON-NOTEA (`:1802`) writes `marker=0 url=0 stack=0`, which is not form (8)'s order.
- W2. Part B says `late.opened`, but the reporter key is `window.__s12ch.late`. The runner reads `late`.
- W3. R19-CON-BANNER's `ROW … <PASS|FAIL>` sits beside a NOT MEASURED outcome; `bannerConRow` accepts all three.
  (13) and (28) both define `DAEMONLOG`.
- NIT-B. (c)'s "print once per slice" is met by its goal (no WARN), not by the letter.

The fixtures are statically tested and run in jsdom by verifier 1. Their behaviour in Chrome is first seen live:
- `__s12ch.late=yes` means only that `click()` did not throw; the dialog count by UIA is the evidence.
- `__s12ch.clicks` drops a click that comes within 50 ms of a counted one.

## 7. Handoff (to S7-helpers-b, -c, -d)
Nothing is running: no PIDs, servers or worktrees. The verifiers' scratch probes are in the session scratchpad,
outside the repo.

**Load order.** PowerShell dot-sources `s9-win.ps1`, `s11-win.ps1`, `s11b-win.ps1`, then `s12-win.ps1`, then calls
`Assert-S12Patched`. TypeScript imports `recipes/s12-forms.ts`, which imports only `node:crypto`, and
`recipes/s12-rules.ts`.

**Entry points, all in `recipes/s12-forms.ts`.** Signatures are in the file; this list matches its exports.
- (1) `loadedLine`
- (2) `argsLine`, `argsTotalLine`
- (3) `argsrefLine`, `argsrefTotalLine`, `dataField` (prints keys only)
- (4) `effLine` (null prints `absent`)
- (5) `globalsLine`
- (6) `stopcallLine`
- (7) `oldLine`, `forwardedFrom` (reads the answer)
- (8) `conLine` (with `ConEntry`), `newestEqual` (by hash)
- (9) `conrefLine`
- (10) `floorCounts` (`FLOOR_MARGIN_MS` 500), `conFloorLine`
- (11) `conmcpStats`, `conmcpLine`
- (12) `bannerConLine`, `bannerConVerdict`, `bannerConRow`, and `IDLE_MIN_MS_19` (20 000 ms).
  -d uses `IDLE_MIN_MS_19` for every Run 19 idle; Run 18's `IDLE_MIN_MS` in `s12-rules.ts` is still 15 000.
- (13) `daemonlogLine(row, sentinel, consoleText)`

**#351 (4).**
- (a) is done: R19-UP-OPT reuses `Invoke-S12Opt`, which now prints the O2 note.
- (b) is -d's duty: call `settleConsoleClauses(pending, "ok"|"fail"|"unread")` and print its final `ROW` lines before
  R19-LOGS. `hasConsoleClause(id)` picks the rows; `settleConsoleClauses` takes all seven verdicts.
- (c) is -d's duty: once per slice, pass the slice's record lines through `dedupeIdenticalRows` before `aggregateRows`
  (`recipes/s11b-r17b-rules.ts`). Weigh NIT-A here: deduping `ROW RULES` only keeps the WARN for a real re-print.

**Fixtures** (`test-fixtures/`, one server on 8081):
- `s12-console.html?s12=con|rej|big|tick|frame|frameoop|notea|noteaok|nav|cap`
  - `SENTINEL` is `s12sent-5f3a9c71`, also `window.S12_SENTINEL`.
  - The page sets `window.__s12`. It never sets `window.__s12eff`.
- `s12-chooser.html?s12=c1|label|none|picker|single|dir|dis|late49|late51|human|frame#sum=<hex>`
  - The page sets `window.__s12ch`.
  - Ids: `#open #in #vis #lab #in2 #second`; the frame's are `#fbtn #fin`.
- `e2e-playground.html?s12=…`
  - `beat` on `as`.
  - `#tb` and a counted button on `g2a` and `g2b`.

The args sentinel for R19-ARGS-1 is not defined here; -d defines the scanner constant.
