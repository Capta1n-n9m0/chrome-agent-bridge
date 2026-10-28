# S7-helpers-b builder report

Model and effort: Sonnet 5.5, medium. Layer followed: brief -> decision #357 -> sheet §4.27 (forms by key).

## 1. Verdict
DONE. Not committed. No Chrome, daemon or port touched.

## 2. Outputs
New files (all under `recipes/`):
- `recipes/s12-forms-b.ts` (116 lines): forms (14)-(20), (25), the attach judgment, the poll loop, the banner timeline maths.
- `recipes/s12-win-b.ps1` (81 lines): the DevTools opener, the DEVPROBE window procedure, the banner timeline sampler.
- `recipes/test/s12-forms-b.test.ts` (238 lines), `recipes/test/s12-ps-b.test.ts` (137 lines).
- Size: 197 lines of code, 375 of tests (cap 400 + 600).
- Choice stated: new exports are in a NEW file `s12-forms-b.ts`; `s12-forms.ts` is untouched.

Numbers (commands run by me):
- `npx vitest run recipes/test`: before 1242 tests, 55 files; after **1283 tests, 57 files** (+41: 29 forms-b, 12 ps-b).
- `npm run typecheck`: exit 0 (shared, daemon, sdk, mcp, extension all clean).
- `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json`: all seven exit 0.
  None of them includes `s12-*` files, so I also checked my three TS files with a throwaway tsconfig
  (extends `tsconfig.s11b.json`, deleted after): exit 0.

Red-first evidence:
- TS: tests first against a stub module whose every export threw: 26 of 29 failed (the 3 that passed
  are parser-only checks that call no helper). Then the real module: 29/29.
- Mutants on the real TS (each restored, `diff` clean):
  - `devprobeLine` printing `r.attached` instead of the code: 1 test red.
  - `attachedFrom` also true for `ok`: 5 red.
  - `bannerEndMs` using `>` instead of `>=`: survived, so I added a case (a `none` read exactly at the reply); now caught.
  - `conkeptLine` ignoring `ordered(second)`: 1 red.
- PowerShell: 8 mutants (B1-B8) each flip their check: fixture check removed, 8084 allowed, a missing step passing,
  no Escape after a miss, the UI deciding, one-read timeline, own-window check dropped, X closed after DevTools left open.

Each form has a test: `matches §4.27 by key` (the test parses part B's paragraph at line 1808 and builds a regexp per
token; it also rejects a swapped key, a missing key and a text where a count belongs).
- (14) DEVPROBE: `devprobeLine`, `attachedFrom`, `pollUntilDevtools`, `devprobe`.
- (15) KEEPSEQ: `keepseqLine`.
- (16) KEEPEND: `keependLine`.
- (17) CONKEPT: `conkeptLine`.
- (18) SWEEPHELD: `sweepheldLine`.
- (19) KEEPDT: `keepdtLine`.
- (20) OVERLAP: `overlapLine`, `overlapExact` (K-devt's code and message from `recipes/s11-rules.ts`).
- (25) CONCAP: `concapStats`, `concapLine`.

DEVPROBE's `attached`: `devprobeLine` ignores any `attached` field it is given and prints `attachedFrom(answer)`. The test
"a UIA 'DevTools is open' signal from the opener cannot make attached yes" has the opener return
`{uiShowsDevtools: true, success: true}` while every control answers `ok`: the line ends `attached=no`.
Another test: an opener that throws still polls and still closes, and a K-devt answer then decides.

## 3. Verifier verdict
Not run (the step agent starts it).

## 4. Deviations
None. The new test files are not in any `tsconfig*.json` (the s12 files never were); I did not edit a tsconfig (outside the lane).

## 5. Proposed decisions
### 2026-10-28 · DEVPROBE opens DevTools through Chrome's menu by UIA, with no key
**Decided:** the method is `uia-menu`: UIA invokes "Customize and control ..." then "More tools" then "Developer tools" in window X. It sends no key.
**Why:** F12 and Ctrl+Shift+I both rely on a key reaching the page. They attached nothing twice (#351 (3)); the cause was not established.
A menu route does not depend on keyboard focus. The probe line decides by the control's answer code, so a wrong guess costs one honest `attached=no`.
**Instead of:** Ctrl+Shift+J (same key path), right-click Inspect (a mouse click on the page).
**Revisit if:** the live DEVPROBE prints `attached=no` with the CHECK line `devtools-ui ... found=window|pane`. That would show the UI opens but the extension session is still allowed alongside it
(Stage 0 measured coexisting); the rows would then stay NOT MEASURED honestly.
**By:** Claude (proposed)

## 6. Findings
Wording in §4.27 (not edited):
- W1. Forms (15) and (16) have `end-ms=<e>` with no spelling for "no `none` read within the window". KEEP-2 says a build that never detaches "shows no `none` by 25 000".
  The helpers print `end-ms=never` in that case, which does not match the form. The sheet needs a spelling, or the runner must judge it before printing.
- W2. The sheet has no definition of `banner=gaps:<m>`. I read `<m>` as the number of separate runs of `none` reads inside the window. An empty window is `gaps:1`.
- W3. `poll-ms` is not defined. I use the widest gap between two consecutive sampler reads (worst resolution), because the rows need `poll-ms` at most 250.
- W4. R19-SWEEP-HELD's `reclaimed=` and `devtools-open=` have no stated source for `reclaimed`; the helper only formats them.
- W5. CONCAP `first-index` and `last-index` need the line text to carry the index. The fixture's lines carry `s12-cap-<n>:`, and `concapStats` reads that. The MCP formatter prefixes each line with a timestamp and level; the regexp finds the index anywhere in the line.
- W6. The sheet says `DAEMONLOG` twice (S7-helpers-a W3); nothing new here.

New runtime fact: none measured (nothing was run against Chrome). The UIA names "Customize and control*", "More tools*", "Developer tools*" are unverified guesses for Chrome 156.

## 7. Handoff (to S7-helpers-c and -d)
Nothing is running: no PIDs, servers or worktrees.

**Load order.** PowerShell: `s9-win.ps1`, `s11-win.ps1`, `s11b-win.ps1`, `s12-win.ps1`, then `s12-win-b.ps1`
(it needs `New-S16Window` from the block runner, `Close-S12DevTools`, `Test-S12DevToolsUi`, `Get-S12NowMs`, `Invoke-S11Change`, `Wait-S11Ready`, `Write-S11Pressed`).
TypeScript: `recipes/s12-forms-b.ts` imports `s11-rules.ts` (`K`) and the type `ConEntry` from `s12-forms.ts`.

**TypeScript entry points** (`recipes/s12-forms-b.ts`):
- `attachedFrom(code: string): boolean`: true only for `DEBUGGER_DEVTOOLS`.
- `pollUntilDevtools(call: () => Promise<string>, clock: Clock, o?: {deadlineMs?, gapMs?}): Promise<{answer, ms, attached}>`: defaults 15 000 ms and 500 ms; a throw is the answer `ERROR`.
- `devprobe({method, clock, open, close, call, deadlineMs?, gapMs?}): Promise<{line, result, openError, closeError}>`: `open` and `close` are the two signal waits of `DEVPROBE` / `DEVPROBE-done`; `close` runs in a `finally`; `closeError` should become the STOP `devtools-left-open`.
- `devprobeLine(method, {answer, ms}): string`: refuses a method that is not a plain lowercase word.
- `Clock = {now(): number; sleep(ms): Promise<void>}`.
- `parseTimeline(s: string): BannerRead[]`: reads the PowerShell sampler's `<epoch ms>:<1|0>,...`.
- `bannerSpan(reads, fromMs, toMs): string`: `continuous` or `gaps:<m>`.
- `bannerEndMs(reads, lastReplyMs): number | null`.
- `pollMsOf(reads): number`.
- `keepseqLine(row, {calls, gapMs, answersOk, banner, endMs, pollMs})`.
- `keependLine(row, {leg, sinceLastCallMs, endMs, next})`.
- `conkeptLine(first: ConEntry[], second: ConEntry[])`.
- `sweepheldLine({afterReload, devtoolsOpen, reclaimed})`.
- `keepdtLine(row, leg, next)`.
- `overlapExact({code, message?}): boolean`, `overlapLine(row, {leg, first, second, exact})`.
- `concapStats(text, sentinel): ConcapStats`, `concapLine(stats)`.
  - `ConcapStats` also has `consecutive` and `moreLines`, which the line does not print. -d judges `consecutive` and `n = 200 - lines`.

**PowerShell entry points** (`recipes/s12-win-b.ps1`):
- `$S12DevMethod` = `'uia-menu'`: pass it as `method=` in `devprobe`.
- `Invoke-S12DevProbe [-Url ...]`: opens X (default `http://127.0.0.1:8081/s12-console.html?s12=con`), runs `Invoke-S11Change 'DEVPROBE'` (open on `DEVPROBE.ready`, close on `DEVPROBE-done.ready`), then closes X; `$false` after a STOP.
  The actor's `evaluate "1"` loop runs between the two `.pressed` signals; the actor prints the DEVPROBE line.
- `Open-S12DevToolsMenu <hwnd>`: the opener (own window, 8081 fixture only, no key). `Close-S12DevTools` (from `s12-win.ps1`) closes what it recorded.
- `Invoke-S12Timeline <Row> <hwnds> <DurationMs> [<PollMs=120>]`: waits `<Row>-timeline.ready`, polls `Test-S9Banner`, writes the timeline string as the text of `<Row>-timeline.pressed`. Feed it to `parseTimeline`.
  The clock is epoch ms, the same as the actor's `Date.now()`.
- `Format-S12Timeline`, `Find-S12UiaByName`, `Invoke-S12UiaElement`, `Send-S12Escape` are internals.

**DevTools method chosen:** `uia-menu` (§5). Unproven live: the DEVPROBE decides.
Not built (by the brief): the CLOSERPROBE, the KEEP-3 event helpers, the KEEPEND/KEEPSEQ driver and the runner. Those are -c and -d.
**Needs the user's keyboard:** nothing.
