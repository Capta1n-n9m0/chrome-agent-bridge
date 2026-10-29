# S5-drivers-B3-builder — R20-G2-1, R20-VERSION and the window helper

Builder: Claude Sonnet 5.5, medium. No Chrome, no daemon, no live run, no real window touched (stubs only).

## 1. Verdict

**DONE.** Both actors, their pure judges, and `recipes/s13-win.ps1` are built and tested; nothing was run live.

## 2. Outputs

- `recipes/s13-r20-b.ts` 199 -> 383 lines: commands `g2-1` and `version` (`cmds` now has five).
- `recipes/test/s13-r20-b.test.ts` 138 -> 247 lines (+16 tests).
- `recipes/s13-win.ps1` (new, 125 lines): Win32 wrappers, pure formatting and placement, the two step answers.
- `recipes/test/s13-win-ps.test.ts` (new, 95 lines, 9 tests): the script run in PowerShell with every Win32 wrapper stubbed; `Initialize-S13Win` is made to throw so a test that reached Win32 would fail.
- `recipes/tsconfig.s13.json` (include), `recipes/tsconfig.s6.json` (exclude) for the new test.
- Size: about 520 new lines of code and tests (cap 600).
- `npm test`: 5839 passed, 244 files -> **5864 passed, 245 files** (+25; none removed). `npm run typecheck`, all eight `recipes/tsconfig*.json` and `npm run build` exit 0. `git status --short` after the build: the six files above only.

## 3. What was built

**R20-G2-1** (`g2-1`). Three clients (A the raw trusted `click`, B the default `screenshot` 100 ms after A's send with a 30 s timeout, C polling `daemon.status` every 50 ms). B's tab opens first; the `R20-G2-1-open` step makes PowerShell open WA on the A page; A's tab is found by `s12x=g2a`. Per leg (`covered`, then `uncovered`): the `RECT` lines for A, B, X (covered-by-others computed in TS); the alone-control (B's default screenshot with no holder, ok within 10 s, else the leg is `LEG … NOT DISCRIMINATING` and is skipped); A's page counter as a delta; `G2 R20-G2-1 leg=<…> a-reply=… b-reply=… gap-ms=… holder-after-reply-ms=… a-effect=… b=…`; the leg verdict on Run 19's pass rule (`judgeG2`, bounds 450). For `uncovered`: a placement answer other than `ok` makes the leg `NOT MEASURED`; WB with covered-by-others above 0 makes it NOT DISCRIMINATING. `g2Rows` adds `CHECK … cause=capture of a covered window` (covered times out, uncovered passes) or `cause=not established, rectangles recorded` (both time out). The SDK-default variant (`ta.click(ref, {trusted:true})`) runs last and prints only `CHECK … variant=focusFirst …`. Exit by `finish`: FAIL 1, NOT MEASURED 3, else 0.

**R20-VERSION** (`version`). On `s12=c1`: SDK leg and raw `uploadFiles` leg with the file input itself (`css:#vis`) as target: `VERSIONCH R20-VERSION leg=… code=… hint=… files=… exact=…`, PASS only on `VERSION` with message `===` `CHOOSER_RELOAD_HINT` (imported from `daemon/src/intercept.ts`), page `files=0 clicks=0`, no path leak (`rawLeaks`). MCP leg: `browser_new_tab` then `browser_upload_file {chooser:true}`; read by its own line and `isError` (`mcpLineRead` with `MCP_LINES.chooserOld`, `mcpLineVerdict`), printed as `MCPLINE R20-VERSION leg=mcp …` plus `CHECK … mcp files= clicks=`; an unreadable page leaves a passing line NOT MEASURED. Control: `upload` without `chooser`, `VERSIONCH … leg=control`, ok, no hint, `files=1`; `evaluate "(a) => a" {args: 7}` answers 7 (`CHECK … args=answered`, leg `args`). The reader never expects a code on MCP line 1 and pins no old text.

**STOPs raised on the TS side** (each `StopWhy`, `run()` prints `STOPWHY <why>`, exit 2; tested through `catchDecision`): `existing-tool-changed` (VERSION control upload not ok), `dialog-left-open` (native dialog count above 0, after the control check). A malformed value-step answer is a `HelperDefect` (thrown, not a STOP, as in B2).

**`s13-win.ps1`**: `Format-S13Rects` (per named window: rectangle, z index among counted windows with top = 0, and the counted windows above it, taskbar classes left out; an uncounted or unlisted named window is an error), `Get-S13Placement` (two side-by-side rectangles, 16 px margin, none when under 500x400 each), `Test-S13Placed` (inside work area, no overlap), `Invoke-S13Place` (moves only handles in the wave's own list; answers `ok` or `refused not-wave-window | gone | minimized | no-room | did-not-fit`; read back after the move), `Get-S13RectsAnswer`. Numbers and fixed words only; no title read (a test greps the source for `GetWindowText`/`.Title`). The coverage arithmetic is TS (`coveredPx`: union of the rectangles above, cut to the work area so the taskbar strip is outside); a test feeds the PowerShell answer to `parseRects` and `winCovered`. The C# `Add-Type` was compiled once (`Initialize-S13Win`, no window listed or moved).

## 4. Verifier verdict

None yet (verifier is the step agent's next child).

## 5. Deviations

- Tests were written after the code, not before; I did not run a red proof (no mutant or scratch-worktree run). A verifier should run mutants on a copy outside the tree: `judgeG2` bound, `g2Rows` cause branches, `coveredPx` union (overlaps counted once), `Invoke-S13Place`'s ownership check, `judgeVersionCall` exactness.
- `RECT` is read once before each leg as the sheet says; I added a post-leg read (`CHECK … b-covered-after-px=<n>`) so a "covered" timeout can be tied to the coverage at capture time (A's trusted click raises WA during the leg). It costs one more value step per leg.
- The sheet's `VERSIONCH` has no mcp form beyond `MCPLINE`; the mcp leg prints `MCPLINE` and a `CHECK` for the page counters.
- Rectangles come from `GetWindowRect` (includes Chrome's invisible frame, about 7 px), not DWM visible bounds; the 16 px placement margin absorbs it. A covered-by-others figure can therefore read a few pixels high at a window edge.
- Edits to `tsconfig.s6.json`/`tsconfig.s13.json` are the include/exclude entries only.

## 6. Proposed decisions

### 2026-10-29 · S5-drivers-B3: the unstated cases of R20-G2-1 and R20-VERSION
**Decided:** (1) B "timed out" = a code other than `ok` and `LOCK_TIMEOUT` with its reply at or after 30 000 ms from A's send. (2) A leg whose alone-control fails, or whose WB is not at 0 covered pixels (uncovered), is NOT DISCRIMINATING and is not run; a refused placement is NOT MEASURED. (3) `a-effect` is the page counter's delta over the leg. (4) VERSION's control upload not ok is `existing-tool-changed` (the sheet lists the control under that STOP); a native dialog is `dialog-left-open`. (5) The placement margin is 16 px and the minimum window 500x400. **Why:** the sheet leaves each open and each choice is the strict one. **Instead of:** judging a leg on a window that was not shown uncovered. **Revisit if:** liveB20 shows the invisible frame making WB read covered. **By:** Claude (proposed)

## 7. Findings

- PowerShell 5.1: a hashtable keyed by a `[long]` needs `[long]` literals (`$h[[long]2]`); an int key does not match a `[long]` `ContainsKey`. Met in the stub tests.

## 8. Handoff (B4)

Value steps the actor asks for (`sig(name)`; the PowerShell side answers with the text shown; each is read only once the actor signals it):

- `R20-G2-1-open`: open WA, a wave-owned window on `http://localhost:8081/e2e-playground.html?s12=g2a&s12x=g2a` (Run 19's `New-R19Open` shape); record `$global:S13Hwnd = [ordered]@{A=<WA>; B=<WB: the window of B's tab>; X=<the wave's front window, may equal either>}` and `$global:S13Owned` (every handle the wave opened). Answer is ignored.
- `R20-G2-1-rects-covered`, `R20-G2-1-rects-covered-after`, `R20-G2-1-rects-uncovered`, `R20-G2-1-rects-uncovered-after`: answer `Get-S13RectsAnswer $global:S13Hwnd`.
- `R20-G2-1-place`: answer `Invoke-S13Place $global:S13Hwnd.A $global:S13Hwnd.B $global:S13Owned`.
- `R20-VERSION-dlg`: native dialog count, an integer.
- (B2's six dialog-count steps stand.)

B4 must: dot-source `s13-win.ps1`; run rows with `-Actor 's13-r20-b'`, sub-commands `g2-1` and `version`; close WA at the slice's restore (the actor closes only B's tab); the window guard accepts the title `S13 chooser fixture` (B2 carry) and the playground's title for WA; the STOP path knows `existing-tool-changed` and `dialog-left-open` (plus B2's three); the old-build swap, `LOADED20 rerun=<k>`, `old-build-left-loaded` and `NOT RUN — old build not loadable` stay on the PowerShell side, and the actor `version` command must be run only with the old build loaded and ROOT in the Upload folders. Port 8081 is hard-coded in the actor URLs.
