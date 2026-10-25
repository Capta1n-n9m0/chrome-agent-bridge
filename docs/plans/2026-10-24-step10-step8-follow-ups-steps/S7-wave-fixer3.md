# S7 wave fixer, round 3 — re-measurement rows after Return 4 (non-live)

Opus 5.5, level-2 fixer, 2026-10-25. Brief: `briefs/S7-wave-fixer3.md`. Base `8acde66`. No Chrome action, no daemon,
no 9234, no bridge client, no `npm run build`; `S7-run-record.md` / `S7.ledger.md` not edited; the real state files under
`%TEMP%\bridge-e2e\s15` only read (sha256 equal before and after, §5). Status: **done**.

## 1. RET-1R (item 1)

- **Fix:** `recipes/s10-ret1.ps1` — the relaunch line now reads
  `$o = @(powershell -NoProfile -ExecutionPolicy Bypass -File .\recipes\bgf-launch.ps1 -Exe (Get-S9Chrome))` (no
  `-ArgLine`). `bgf-launch.ps1:15` `param([Parameter(Mandatory = $true)][string]$Exe, [string]$ArgLine = '')` and `:45`
  `CreateProcess(exe, "\"" + exe + "\" " + args, …)`: with the default the command line is the quoted exe and nothing
  else — a plain launch (re-read, as the brief asked; it is what the session agent's manual relaunch used, exit 0).
- **Row ID:** `param([string]$Granted = '', [string]$Row = 'RET-1')`; `-Row` takes `RET-1` / `RET-1R` only (else
  `USAGE:`, exit 3); `-Granted G10-2` still required. Every line, the `$Row.ready/.pressed` signals, the `wait-safety`
  rows (`$Row-found`, `$Row-reconnect`) and the default output folder (`%TEMP%\bridge-e2e\s15-ret1r`, so RET-1's files stay)
  carry the row; the holder and judge get `--row $Row`. `recipes/s10-ret1.ts`: `rowId()` (`--row`, `RET_ROWS` only) used by
  `hold` and `judge`. `recipes/s10-rules.ts`: `RET_ROWS`. `recipes/s10-win.ps1`: `Test-S10LegState` accepts `RET-1R`. The
  STOP texts are unchanged but for the ID (`… Chrome is NOT running; the step agent tells the user at once`).
- **Row:** §4.22 `RET-1R (G10-2)` right after RET-1 = RET-1's row with only `| RET-1R (G10-2) |`, `-Granted G10-2 -Row
  RET-1R`, `RET-1R not run - disarmed as found …`, `ROW RET-1R `, `CHECK RET-1R ` changed; the dated note verbatim after the
  table.
- **Tests** (`recipes/test/s10-rules.test.ts`, "RET-1R …"): the launch line has no `-ArgLine` and no `''`/`""` (fails on
  `8acde66`'s line), the launcher's default, the row plumbing, no hard-coded `RET-1` left in code lines, the row = the
  transform of RET-1's.

## 2. MCPF-1R and CAP-1R's MCP leg (item 2)

- **Rows** (§4.22, each right after its original): MCPF-1R = MCPF-1 with the ID, `-Block mcpf1r-*`, actors `mcpf1r-*`,
  `s10.ts mcpf --kind <kind> --row MCPF-1R`, and at the head of Steps "**The one stated difference from MCPF-1:** the actor
  starts with tool search off (`--no-tool-search` → `ENABLE_TOOL_SEARCH=false`, S7 wave fixer 2; its start line must
  confirm it, else STOP), so its first call is a bridge tool; no check is relaxed." — every CHECK (incl. `-calls`,
  `-answer`, `3of3`) and the `mcpfVerdict` rule unchanged. CAP-1R = CAP-1's Stage S7 text and its MCP expected text
  verbatim with `CAP-1R-mcp`, the same difference sentence, and **the SDK half is not re-run**: the MCP leg needs nothing
  it sets up (tab `cap` from `setup`, its own click baseline, `cap1-sdk` releases its claim) — stated in the row. Dated
  note verbatim before the table.
- **Runner** (`recipes/s10-r15.ps1`): `Invoke-S15Mcpf([string]$Kind, [string]$Row = 'MCPF-1')` (actor `mcpf-<kind>` for
  MCPF-1 — unchanged blocks — or `mcpf1r-<kind>`; `S10 mcpf … --row $Row`); new blocks `mcpf1r-click/-type/-press`
  (`Invoke-S15Mcpf '<kind>' 'MCPF-1R'`) and `cap1r` (`Start-Actor 'cap1r'`, `S10 cap1-mcp --actor cap1r --row CAP-1R`,
  `End-Actor`, `wait-alone CAP-1R-end`). Placed after `off`, before `restore` (with `r3r`), so the Return 2 test's proxy
  still holds; all default budget (330 + 15 + 160 = 505 ≤ 570, the m2 test covers them). `recipes/s10.ts`: `mcpf --row`
  (`MCPF_ROWS`; its tally in `state.json` `mcpfTallyR`), `cap1-mcp --row` (`CAP_ROWS`, id `<row>-mcp`). Dependency test
  (`blockDependencyGaps`) passes with the new blocks; `S10_VALUE_NEEDS` lists the new `r3r-check` command.

## 3. R15-3R (item 3) — verdict: **added**

Evidence (Run 15 attempt 2, `r15-raw.txt.20261025T104021Z` lines 362–382): `placement-before-switch` read 0 occluders at
10:35:57.464Z; after the switch OFF through O's page, `placement-before-click` at 10:36:00.247Z read one: `OCCLUDER 1
class=Chrome_WidgetWin_1 process=chrome rect [3617,80,3840,105] owner=driver:O rootOwner=driver:O topmost=true popup=true
toolwindow=false noactivate=true`. `owner=driver:O` is `Get-S9OccluderIds` (`s9-win.ps1:907-925`) matching GW_OWNER's
handle to `$global:O` by equality, and `rootOwner` GA_ROOTOWNER likewise — so the window is a Chrome popup owned by the
wave's own options window O. Its rect lies in O's top strip: W, a window of the same Chrome at the same y, measured its
page area `[1920,121,3840,1080]` (y ≥ 121), and the popup ends at y 105.

Why the rule is not weaker for what R15-3 judges: R15-3 reads, by UI Automation, O's page — the two checkboxes,
`#safety-status`, the summary — to see whether O shows the re-arm while visible beside W. The exemption applies only to
an occluder that is not a driver window, whose owner AND root owner are driver windows, and whose rect overlaps none of
the rects of O's page area (`RootWebArea`) and those four elements, **measured at the guard** (each found once, non-empty,
inside O's window rect — else "not measured" and nothing is exempt, which also catches a DPI mismatch between UIA and
`GetWindowRect`). Any other occluder, any unidentified one, and a second non-exempt one still stop the row; the placement
tries keep R15-3's rule. It cannot hide a covered status text or checkbox. What it cannot show (recorded in the row's
spirit, not tested): Chrome's own occlusion state of O with a 223×25 owned popup over its toolbar — by Chrome's rule a
partly covered window is not occluded; not measured.

- **Code:** `recipes/s10-rules.ts` `R3R_READ_ELEMENTS`, `r3rReadMeasured`, `r3rOccluderExempt`, `r3rPlacementVerdict`
  (end of file); `recipes/s10.ts` `r3r-check --file --row --step` (`cmdR3rCheck`: rect-check's lines, then `READ rects …`,
  `EXEMPT <i> yes|no — <why>`, the CHECK); `recipes/s10-win.ps1` `Test-S10Placement … -ExemptOwned` (adds `readRects`
  from the new `Get-S10OptionsReadRects $O` and calls `s10.ts r3r-check`; without the switch unchanged) ; block `r3r` =
  `B-r3`'s body with `R15-3R` and `-ExemptOwned` on the two guards only (tested by normalising one into the other).
- **Row:** §4.22 R15-3R right after R15-3 = R15-3's text with `R15-3` → `R15-3R`, `-Block r3r`, `-ExemptOwned` on the two
  guard steps, and the Guard clause replaced by the one added rule (exact CHECK text for an exempt pass written in); dated
  note citing #212 (title and Revisit-if) and the session agent's order, quoting the OCCLUDER line.
- **Tests:** Return 3's guard input fails `placementVerdict` (R15-3's rule) and passes `r3rPlacementVerdict` only with the
  read rects; fails for owner `other`/root `none`/a driver window itself, overlap with the page or an element (touching
  edges allowed), missing/duplicate/empty/outside rects, an unidentified count, a second non-exempt occluder. Dry run of
  `s10.ts r3r-check` on that JSON: without `readRects` → `EXEMPT 1 no — the read elements' rects were not measured`, `CHECK
  … FAIL`, exit 1; with them → `EXEMPT 1 yes …`, `CHECK … PASS — … except 1 exempt window(s) …`, exit 0.
- **For the session agent:** #212 says the exemption "is the user's call"; R15-3's row narrows that to a *non-driver*
  window, and this one is driver-owned — I added R15-3R on the brief's order, but whether that narrowing satisfies #212 is
  yours to confirm before `r3r` runs (if not: a proposed decision; note the resume rule refuses `r3r` in a skip set, so
  dropping it means an amended order). `Get-S10OptionsReadRects` is untested live (UIA rect reads, no Chrome here).

## 4. SAVE-REFUSE (item 4)

Dated note verbatim, after the table that holds the row (a note inside a Markdown table would break it), led by
`**SAVE-REFUSE** —`; the row's text is unchanged. **Where the prefix comes from** (read only):
`extension/src/evaluate/save.ts:110-125` throws the refusals as `BridgeError(BAD_PARAMS | PAGE_ERROR, <message>)` inside
`collectSaveText`, which `extension/src/debugger.ts:254-263` (`evaluateToSave`) runs inside `withDebugger`; its `mapError`
(`debugger.ts:33` → `debuggerError`, `:45-48`) is applied to every throw of the body by `extension/src/safety-debugger.ts:109`;
`describeDebuggerError` (`extension/src/debugger-errors.ts:22-29`) keeps an own `BridgeError`'s code and data but runs its
message through `describeRaw`, whose fallback `extension/src/debugger-errors.ts:58` returns
`` `[chrome.debugger] ${raw}` ``. This is documented as intended (`debugger-errors.ts:16-20`: "keeps its code and data,
while its message goes through the same string logic as before (E2E EVAL-5 expects `[chrome.debugger] Error: boom`)").
So the product behaves as designed and the row text is what is wrong: §4.22's expected text was tied by the drift test to
the throwing constants (`primitiveSaveText`, `collectSaveText` called directly), never through `withDebugger`. Whether the
product should drop the prefix for its own refusals (it reads as a debugger failure to an agent) is the proposed decision.

## 5. The attempt-4 sheet, the logs gap, the resume (item 5)

- **Logs gap:** `B-logs` now scans `$scanActors` = this attempt's actors ∪ every `$EarlierActors` (`mcpf-click`,
  `mcpf-type`, `mcpf-press`, `cap`, `save`, `fix`, `big`, `jsd`, `off`, `on`) whose folder exists, and prints `R15-LOGS
  actors scanned: <n> (…)`. PP1's actor is excluded (its leg counts it; its transcript can carry real-site hosts).
- **Resume rule:** the stored state (sha256 `FB166F6B…2C9E7C`) is attempt 3, `S15Stopped` empty, `S15Done` through
  `teardown` — the old rule refused it ("not stopped"). `B-reset` now also accepts a torn-down attempt (`$tornDown`; no
  stopped block then). Skip set by the rule = done (savedis, savejs, saveblk, jsd, off) ∪ the stored resume's skip (17) =
  all 22 original row blocks.
- **Call:** `-Block reset -Attempt 4 -Skip bbl1,bbl2,mcpf-click,mcpf-type,mcpf-press,cap,sw1,sw1r,pop2,save-a,savefix,save-64,save-64-mcp,prim,idonly,save-ttl,r3,savedis,savejs,saveblk,jsd,off`.
  **Dry run on copies** (scratch `dry\<case>\`, `S10_OUT` pointed there; script `scratchpad\dry.ps1`): accepted, exit 0,
  `RESUME attempt 4: … not re-run` and `blocks preflight, …, rep0, mcpf1r-click, mcpf1r-type, mcpf1r-press, cap1r, r3r,
  restore, logs, teardown; daemon.log mark 2026-10-25T09:57:04.349Z`; then `-Block mcpf-click` → `NOT RUN … skipped`,
  `-Block logs` → `needs block restore first`, `-Block mcpf1r-click` → `needs block rep0 first` (all exit 3). Refused
  (exit 3, `USAGE:`): without `off`, without `r3`, without `mcpf-click`, plus `mcpf1r-click`, plus `r3r`, plus framing
  `rep0`, `-Attempt 3`, `-Attempt 5`. Real `r15-globals.clixml`, `r15-raw.txt`, `state.json`: sha256 equal before/after.
- **Sheet / brief:** `S7-wave-sheet.md` §1 rows 32a–32e and the subsection "Re-measurements after Return 4 (attempt 4)"
  (the call, the printed lines, the block order, the logs scope, the record heading, then RET-1R: fixture server on 8080
  first — the teardown stops it, runner 4's set-up fix — `Test-S10LegState -Leg RET-1R`, `s10-ret1.ps1 -Granted G10-2 -Row
  RET-1R`, end read-back, server stopped by PID); `briefs/S7-runner.md` the matching bullet (Return 3's marked superseded).
  The STOP sentence is repeated byte-identical in both (a test compares them).
- **Open (not in this brief):** Return 5 — `Test-S10LegState … -Phase end` after a relaunch threw `expected exactly 1 new
  Chrome window, found 2`; unchanged, flagged in both texts as a STOP as written until the step agent rules.

## Checks

`npx tsc --noEmit -p recipes/tsconfig.s10.json` 0; `… tsconfig.s9.json` 0; `npm run typecheck` 0; `npm test` **3266
passed, 132 files** (= 3247 + 19, all in `recipes/test/s10-rules.test.ts`: 73 → 92); PowerShell parse of `s10-r15.ps1`,
`s10-win.ps1`, `s10-ret1.ps1`: 0 errors each; `git diff --numstat 8acde66 -- docs/e2e-test-plan.md` → `12 0` (additions
only: 4 rows, 4 notes, 4 blank lines).

## Commit file list

`docs/e2e-test-plan.md`, `recipes/s10-r15.ps1`, `recipes/s10-ret1.ps1`, `recipes/s10-ret1.ts`, `recipes/s10-rules.ts`,
`recipes/s10-win.ps1`, `recipes/s10.ts`, `recipes/test/s10-rules.test.ts`,
`docs/plans/2026-10-24-step10-step8-follow-ups-steps/S7-wave-sheet.md`, `…/briefs/S7-runner.md`, `…/S7-wave-fixer3.md`,
`…/briefs/S7-wave-fixer3.md` (and the runner-owned `S7-run-record.md`, `S7.ledger.md`, `S7-daemon-log.txt`,
`S7-run-raw.txt`, `briefs/S7-postrelaunch.md` as the step agent decides — not touched by me).
