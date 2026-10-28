# S7-helpers-b: liveB19's line forms and DEVPROBE (step report)

Step agent: Opus 5.5, medium. Builder and fixers Sonnet, medium; verifiers Opus, medium; committer Sonnet, medium.
Brief READ list: `docs/e2e-test-plan.md` §4.27 (lines 1768–1860); phase doc § S7 and R7.1–R7.6; `S7-helpers-a.md`
§6–§7, `S7-sheet.md` §7, `S1-helpers-a.md`, `S4b.md`, `S4b-measurer.md`; decisions #339, #351, #352, #356, #357;
`recipes/CLAUDE.md`. Layer followed: brief → #357 → §4.27 (forms by key).

## 1. Verdict
DONE. Two fix rounds (of three).

## 2. Outputs
- Commit: `e5b8341` (14 files; this hash line is written after the commit and left uncommitted for the session agent).
- New code: `recipes/s12-forms-b.ts` (forms (14)–(20), (25), the attach judgment, the poll-until-K-devt loop, the
  banner timeline maths), `recipes/s12-win-b.ps1` (the DevTools opener by UIA menu, the DEVPROBE window procedure,
  the banner timeline sampler). Tests: `recipes/test/s12-forms-b.test.ts`, `recipes/test/s12-ps-b.test.ts`.
- Size (verifier3's count): 212 lines of code (cap 400), 497 of tests (cap 600).
- `npx vitest run recipes/test`: 1242 tests, 55 files (HEAD, step agent) → 1302 tests, 57 files (verifier3).
- All seven `npx tsc --noEmit -p recipes/tsconfig*.json` and `npm run typecheck` exit 0 (verifier3). The new test
  files are typechecked through `tsconfig.s6.json`'s `test/*.test.ts` glob, as `s12-forms.ts` is; the builder's
  sentence saying no tsconfig covers them is wrong (verifier1 NIT, recorded in `S7-helpers-b-fixer.md`).
- Leaf reports: `S7-helpers-b-builder.md`, `-verifier.md` (+ evidence), `-fixer.md`, `-verifier2.md` (+ evidence),
  `-fixer2.md`, `-verifier3.md`.

## 3. Verifier verdict
- Verifier 1 (`S7-helpers-b-verifier.md`): FAIL. MAJOR-1: the UIA menu opener had no try/catch on Invoke/Expand
  (a throw under `Continue` printed a false `found=yes`; under `Stop` it threw before the DEVPROBE signal) and
  searched the menu only inside window X, not in new top-level Chrome windows as `Set-S9Pin` does. MINOR-2:
  `end-ms=never` (a sheet finding, below). MINOR-3: six surviving mutants. NITs: timeline stamp after the read, no
  start signal, F12 to close a docked pane, the tsconfig sentence.
- Fixer 1: MAJOR-1 fixed (`Invoke-S12UiaElement` returns `$false` on a throw; `Get-S12SearchHwnds` = X then the new
  Chrome windows); timeline NITs fixed (`TIMELINE <Row> started`); four of six mutants killed.
- Verifier 2 (`-verifier2.md`): FAIL. MAJOR-1 proved fixed under PowerShell 5.1 with a real-E_FAIL stub, `Continue`
  and `Stop`; M28 (CONCAP marker pattern) and P6 (UIA search scope) still survived.
- Fixer 2: M28 killed by a look-alike marker test; P6 killed by a `FromHandle` stub asserting the exact search list;
  the header now says "sends no opening key" (the only key is a closing Escape to X after a missed step).
- Verifier 3 (`-verifier3.md`): **PASS-with-notes.** M28, P6 and four variants killed; `s12-forms-b.ts` byte-identical
  since round 0, so `attached` still derives only from the control's code. Note: the test title at
  `recipes/test/s12-forms-b.test.ts:248` says "(its constant, not a copy)" while `CAP_MARK` is a copy of the SDK text.

## 4. Deviations
None. The F12 close of a docked DevTools pane lives in `Close-S12DevTools` (`recipes/s12-win.ps1`, S7-helpers-a) and
was not changed: it runs only for a docked pane, and a failure ends in the STOP `devtools-left-open` by design
(verifier2 judged it acceptable as a recorded NIT).

## 5. Proposed decisions
### 2026-10-28 · DEVPROBE opens DevTools through Chrome's menu by UIA, with no opening key
**Decided:** `DEVPROBE method=uia-menu`: UIA presses Chrome's menu button in window X, then "More tools", then
"Developer tools", searching X and the new top-level Chrome windows; no opening key. `attached` comes only from the
control `evaluate "1"`'s code (`yes` iff `DEBUGGER_DEVTOOLS`). **Why:** F12 attached nothing twice (#351 (3)); a menu
route does not depend on keyboard focus, and a wrong guess costs one honest `attached=no`. **Instead of:**
Ctrl+Shift+I/J (the same key path), right-click Inspect (a page click). **Revisit if:** the live DEVPROBE prints
`found=no` (Chrome 156's `ExpandCollapse.Expand()` answered E_FAIL in `Set-S9Pin`, so the button may offer no
usable pattern; a mouse click would need the user's grant), or `attached=no` while the DevTools UI is found open.
The UIA names ("Customize and control*", "More tools*", "Developer tools*") are unverified on Chrome 156.
**By:** Claude (proposed)

## 6. Findings
Wording in §4.27 for the session agent (none edited):
- **W1 (verifier MINOR-2).** Forms (15) `KEEPSEQ` and (16) `KEEPEND` have `end-ms=<e>` with no spelling for "the
  banner never went off in the window". On R19-KEEP-1 a correct build cannot show an off read inside the sampler
  window, and KEEP-2's never-detaching build "shows no `none` by 25 000". The helpers print `end-ms=never` (printing
  25000 would record a measurement nobody made). Suggested: a dated note adding `|never` to (15) and (16).
- W2. `banner=gaps:<m>` is undefined; the helper reads `<m>` as the number of separate runs of off reads in the window.
- W3. `poll-ms` is undefined; the helper uses the widest gap between consecutive sampler reads.
- W4. SWEEPHELD's `reclaimed=` has no stated source; the helper only formats it (-d supplies it).
- W5. CONCAP's indices are read from the fixture's `s12-cap-<n>:` text anywhere in the line (the MCP formatter
  prefixes a timestamp and level).
No new runtime fact: nothing ran against Chrome.

## 7. Handoff (to S7-helpers-c and -d)
Nothing is running: no PIDs, servers or worktrees. Verifier scratch is in the session scratchpad, outside the repo.

**Load order.** PowerShell: `s9-win.ps1`, `s11-win.ps1`, `s11b-win.ps1`, `s12-win.ps1`, `s12-win-b.ps1`, then
`Assert-S12Patched`. TypeScript: `recipes/s12-forms-b.ts` (imports `K` from `s11-rules.ts`, type `ConEntry` from
`s12-forms.ts`).

**TypeScript entry points** (`recipes/s12-forms-b.ts`; signatures in the file):
- (14) `attachedFrom(code)`; `pollUntilDevtools(call, clock, {deadlineMs=15000, gapMs=500})` (a throw is the answer
  `ERROR`); `devprobe({method, clock, open, close, call})` (`close` in a `finally`; a `closeError` is the STOP
  `devtools-left-open`); `devprobeLine(method, {answer, ms})`; `Clock = {now(), sleep(ms)}`.
- Banner timeline: `parseTimeline(s)`, `bannerSpan(reads, fromMs, toMs)`, `bannerEndMs(reads, lastReplyMs)` (null →
  `never`), `pollMsOf(reads)`.
- (15) `keepseqLine(row, {...})`; (16) `keependLine(row, {...})`; (17) `conkeptLine(first, second)`;
  (18) `sweepheldLine({afterReload, devtoolsOpen, reclaimed})`; (19) `keepdtLine(row, leg, next)`;
  (20) `overlapExact({code, message?})`, `overlapLine(row, {...})`; (25) `concapStats(text, sentinel)`,
  `concapLine(stats)` (`consecutive` and `moreLines` are for -d to judge, not printed).

**PowerShell entry points** (`recipes/s12-win-b.ps1`):
- `$S12DevMethod` = `'uia-menu'` (pass as `method=`).
- `Invoke-S12DevProbe [-Url]`: opens X (default the 8081 `s12-console.html?s12=con`), waits `DEVPROBE.ready`, opens
  DevTools, waits `DEVPROBE-done.ready`, closes DevTools and X; `$false` after a STOP. The actor's `evaluate "1"`
  loop runs between the signals and prints the line.
- `Open-S12DevToolsMenu <hwnd>` (own window, 8081 fixture only); `Close-S12DevTools` is S7-helpers-a's.
- `Invoke-S12Timeline <Row> <hwnds> <DurationMs> [<PollMs=120>]`: waits `<Row>-timeline.ready`, prints
  `TIMELINE <Row> started`, writes the epoch-ms timeline as the text of `<Row>-timeline.pressed` (feed to
  `parseTimeline`).
- Internals: `Get-S12SearchHwnds`, `Find-S12UiaByName`, `Invoke-S12UiaElement`, `Send-S12Escape`, `Format-S12Timeline`.

Not built here (by #357): CLOSERPROBE, the KEEP-3 event helpers, the KEEPSEQ/KEEPEND drivers, the runner.
Needs the user's keyboard: nothing.
