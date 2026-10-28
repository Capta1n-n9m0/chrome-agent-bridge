# S7-helpers-a builder report

Model and effort: Sonnet 5.5, medium. No live run, no Chrome, no daemon, no port; no fixture server started. No commit.

## 1. Verdict
DONE.

## 2. Outputs
Files (new): `recipes/s12-forms.ts` (135 lines), `recipes/test/s12-forms.test.ts` (254), `test-fixtures/s12-console.html` + `.js`, `s12-notea.js`,
`s12-noteaok.js`, `s12-chooser.html` + `.js`, `s12-chooser-frame.html` (about 200 lines of fixtures with their comments).
Edited: `recipes/s12-rules.ts` (+2: `optO2NoteLine`), `recipes/s12-win.ps1` (+3/-1: `Format-S12OptO2Note`, and the `$S12OptPairs` print),
`test-fixtures/e2e-playground.html` (+17: the `s12=` block; `e2e-playground-csp.html` unchanged, it already has `#eval-probe` and the BLOCKED text).
Size: about 360 lines of code (fixtures counted), 254 of tests; under the 400/600 cap.
Numbers:
- `npx vitest run recipes/test`: before 54 files / 1211 tests; after 55 files / 1237 tests (26 new).
- `npm test`: 221 files, 5137 passed. `npm run typecheck`: exit 0. `npm run build`: exit 0 (`built extension → dist/`).
- the seven `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json`: all exit 0. `tsconfig.s6.json`'s `test/*.test.ts` glob already covers the new files; no tsconfig edit.
- `node scripts/doc-check.mjs`: exit 0; no "Dead paths" section (no S12 fixture path listed). Its other lines (24 vs 25 tools, 27 vs 28 methods, decisions.md over budget) are not from this slice.
- Red first: `recipes/s12-forms.ts` was first a stub (every export throws "stub"), and `optO2NoteLine` likewise. `npx vitest run recipes/test/s12-forms.test.ts` printed `22 failed` of 26 (for example `× each form's keys and their order equal the sheet's > (1) LOADED …`); the 4 that passed were the parser and matcher self-tests and two static checks. After the real code: 26 passed (3 test-side fixes came first: a wrong expected count of mine in the CONFLOOR sample, the key regex missing capitals, three static assertions too strict).
- `git status --short`: only the files above.

How forms are compared: `recipes/test/s12-forms.test.ts` parses §4.27's "Line forms (part A)" paragraph at test time (items (1)-(13), backticked templates, `[rerun=<k> ]` expanded to both spellings). A form matches when its tokens, `key=` names and their order equal the template's and each value is one of the template's alternatives (a count, a fixed word or a CODE). The test proves the matcher discriminates (a swapped key, a missing key, a bad value fail).

## 3. Verifier verdict
None yet (a fresh Opus verifier next).

## 4. Deviations
- Form (13): the brief says "(13) `DAEMONLOG <row>` defined in part B". §4.27 defines it twice: part A's text says `(13) DAEMONLOG <row> sentinel=<n> console-text=<n>` "is part B's R19-LOGS, not defined here", and part B's (28) is `DAEMONLOG <slice> sentinel=<n> console-text=<n> args-text=<n>`. I built (13) from part A's keys (`daemonlogLine(row, sentinel, consoleText)`); (28), with `args-text`, is S7-helpers-d's. A test greps the doc for both.
- #351 (4) (b) and (c) are built as reusable pure pieces (`settleConsoleClauses`, `createPreflightGuard`); applying them is the runner's duty (S7-helpers-d), see Handoff.
- Chooser pages are built (not dropped); S7-helpers-c need not build them.

## 5. Proposed decisions
None needed.

## 6. Findings
- Wording (not edited): §4.27's R19-CON-BANNER row says `ROW R19-CON-BANNER <PASS|FAIL>`, yet its pass rule makes a seen negative leg NOT MEASURED. `bannerConRow` accepts all three (the carried `ROW` form allows NOT MEASURED).
- Wording: the handoff of S7-sheet says "(13) per row, (28) per slice" while part A calls (13) "part B's, not defined here"; see Deviations.
- `window.__s12ch.late` is `yes` when the late `click()` returned without throwing, because a page cannot tell whether Chrome opened a chooser; the row's own `opened` key must be read with that limit (the dialog count by UIA is the evidence).
- `window.__s12ch.clicks` counts click gestures on `#open` or `#lab` (a click within 50 ms of a counted one is dropped as the activation of the same gesture); in `s12=frame` the frame's button adds to the parent's counter. Not run in a browser: the fixtures are syntax-checked (`node --check`) and statically tested only, so their behaviour is first observed live (R19-CHOOSE-1 etc.). The `ARGS-STOP` row's `beat` and the `g2` counters on the playground are likewise unrun.
- Not done and not mine: a jsdom behaviour test of the fixtures (size cap).

## 7. Handoff (to S7-helpers-b, -c, -d)
Load order: the Run 18 order stays: PowerShell dot-sources `s9-win.ps1`, `s11-win.ps1`, then `s12-win.ps1` (it patches `Invoke-S11Opt` into `Invoke-S12Opt` and now prints the O2 note). TypeScript: import from `recipes/s12-forms.ts` (no dependency but `node:crypto`) and `recipes/s12-rules.ts`; `s12-forms.ts` imports nothing from the repo.

Entry points, all in `recipes/s12-forms.ts` unless stated:
- (1) `loadedLine({rerun?, consoleMessages, entries, console, exception, args}): string`
- (2) `argsLine(row, label, answer, valueEqual, jsonEqual)`, `argsTotalLine(row, {table, valueEqual, jsonEqual, via})`
- (3) `argsrefLine(label, {code, exact, data?, sent})`, `argsrefTotalLine({refusals, exact, dataNone, sent, effects, control})`; `dataField(data)` prints keys only
- (4) `effLine(row, before|null, after|null)` (null prints `absent`)
- (5) `globalsLine(row, {args, fn, newOwnKeys})`
- (6) `stopcallLine(row, {answer, ms, boundMs, usable, next})`
- (7) `oldLine(row, {leg, code, hint, forwarded})`, `forwardedFrom(leg, {ok, value?})` (reads the answer; `n/a` off the raw leg)
- (8) `conLine(row, label, entries, {sentinel, ordered?, newest?, markers?})`; `newestEqual(read, full, limit)` (hash)
- (9) `conrefLine(row, label, {code, message, data?}, expectedMessage, sameAs)`
- (10) `floorCounts({ticks, excs, offMs, onMs}, entries): FloorCounts` (judges `t >= off+500` and `t < on-500`; after: `t >= on+500`; `FLOOR_MARGIN_MS`), `conFloorLine(counts)`
- (11) `conmcpStats(text)` then `conmcpLine(label, {lines, form, truncated, entriesViaSdk})`
- (12) `bannerConLine(leg, polls, banner, idleMs)`, `bannerConVerdict(neg, pos, after, posAnswer)`, `bannerConRow(verdict)`, `IDLE_MIN_MS_19 = 20000` (Run 18's `IDLE_MIN_MS` in `s12-rules.ts` is still 15000; -d must use the 20 000 one for every Run 19 idle)
- (13) `daemonlogLine(row, sentinel, consoleText)`; (28) is not built.
- #351 (4) (a): done for the helper: `Format-S12OptO2Note($R)` in `recipes/s12-win.ps1` (printed by `Invoke-S12Opt` after the O2 line when `Shown` is false) and `optO2NoteLine(shown, polledMs)` in `recipes/s12-rules.ts`. R19-UP-OPT reuses `Invoke-S12Opt`, so nothing else is needed. Test: text assertions on the file (the function and the patch pair); the full stubbed run of `Invoke-S12Opt` is in `s12-helpers-b.test.ts` and still passes.
- #351 (4) (b): runner duty. Reusable piece: `hasConsoleClause(id)`, `settleConsoleClauses(pending, "ok"|"fail"|"unread")` returns the final `ROW` lines (worst verdict wins). The runner must call it, and print those lines, before R19-LOGS. Reason it is not a helper: the order of rows is the runner's.
- #351 (4) (c): runner duty. Reusable piece: `createPreflightGuard()` (`emit(line, phase?)`, `reset()` per slice). The runner must route R19-0's `MANIFEST/RULES/STATE/TOGGLE/FOUNDLIST/HEAD` lines through `emit` (a `LOADED` line and any non-"preflight" phase pass, so R19-RESTORE's `RULES 0` prints), and must make the Run 18 `rows18` call once.

Fixtures (all under `test-fixtures/`, one server on 8081): `s12-console.html?s12=<con|rej|big|tick|frame|frameoop|notea|noteaok|nav|cap>` (constant `SENTINEL` = `s12sent-5f3a9c71`, also `window.S12_SENTINEL`; the effect counter `window.__s12eff` is never set by the page), `s12-chooser.html?s12=<c1|label|none|picker|single|dir|dis|late49|late51|human|frame>#sum=<hex>` with `window.__s12ch = {clicks, change, files, bytes, bytesEqual, late}` (ids `#open #in #vis #lab #in2 #second`; frame `#fbtn #fin`), `e2e-playground.html?s12=<a1|a2|a3|ag|bc|as|g2a|g2b|ac…>` (`window.__s12`; `beat` on `as`; `#tb` and button `s12 click` counted in `__s12.clicks` on `g2a`/`g2b`). The args sentinel for R19-ARGS-1's fifth value is not defined here (it is `mcp/test/s12-args-cross.test.ts`'s); S7-helpers-d defines the scanner constant.
Left behind: no processes, no scratch files in the repo.
