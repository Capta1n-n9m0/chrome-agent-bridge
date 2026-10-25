# S7 wave fixer, round 1 (Run 15, after Return 1) — report

Fixer: Opus 5.5, 2026-10-25. Brief `briefs/S7-wave-fixer1.md`, plus the step agent's mid-task update (#222, `23db872`:
cite #221 and #222; RET-1's re-run rule). Base `488e69e` → `23db872`. Not committed. No agent spawned. No click, no
toolbar press, no pinning; no daemon or bridge client started; the user's windows, tabs, chrome.exe processes and node
PID 22152 untouched.

## Part A — the pin reader

### Probe (read-only, my own windows, `test-fixtures` server on 127.0.0.1:8080 started and stopped by its PID)

Scripts in the scratchpad (`pinprobe.ps1`, `pinprobe2.ps1`; outside the repo). Each opened ONE window of its own
(`chrome.exe --new-window http://localhost:8080/e2e-playground.html?pinprobe=…`), read UIA, closed it by `WM_CLOSE`.
Output (counts, types, classes, rects; names only of elements containing "Bridge" — all the fixture's or ours):

```
W=8916346 class='Chrome_WidgetWin_1' rect=[1912,-8,3848,1088] width=1936 iconic=False open took 446 ms
poll +149 ms: Extensions button present=True; old-reader buttons=1          (every poll to +1678 ms: 1)
[normal] elements total 133; containing 'Bridge': 5
[normal]   type=Pane class='BrowserRootView' … name="Agent Bridge E2E Playground - Google Chrome - …"  (window title)
[normal]   type=Button class='ToolbarActionView' rect=[3674,46,34x34] offscreen=False name="Chrome Agent Bridge — armed (click to turn off) \n Has access to this site"
[normal]   type=Document / Text / TabItem(class 'Tab') … "Agent Bridge E2E Playground"  (the fixture page)
[normal] ToolbarActionView elements: 1 (types: Button)
[normal] Extensions button class='ExtensionsToolbarButton' type=Button rect=[3710,46,34x34]
[normal] container class='ToolbarView' type=ToolBar rect=[1920,40,1920x46] children=8
[normal] container class='ExtensionsToolbarDesktop' type=Pane rect=[3674,46,70x34] children=2
[normal] old reader Find-S9ActionButtons: 1                                  (maximized: identical)
-- probe 2, timing from the launch (25 ms polls) and a width sweep of my own window:
window 3278346/592122 appeared +198 ms after the launch
+262..285 ms: toolbar=True extBtn=True actionViews=1 ours=1 oldReader=1      (first poll already had it)
width 1400 / 1000 / 800 / 700 / 600: actionViews=1 ours=1 oldReader=1
width 516 (Chrome's minimum here; 500 and 400 asked): toolbar=True extBtn=True actionViews=0 ours=0 oldReader=0
```

Brief items: (1) timing — the toolbar and the action exist at the first poll, 149–285 ms after the window appeared;
not the cause in a wide window. (2) width — **at 516 px the pinned action is overflowed into the Extensions menu: no
`ToolbarActionView` exists at all; at 600 px and wider it is there.** (3) name — first line `Chrome Agent Bridge — armed
(click to turn off)`, second line `Has access to this site`; `StartsWith('Chrome Agent Bridge')` matches. (4) window —
W is the top-level `Chrome_WidgetWin_1` frame. (5) type — `Button`, class `ToolbarActionView`.

**Finding:** the button **is pinned** now (read 1 in every wide window). The old reader read once, with no wait, and
reads an overflowed action as "unpinned". **Cause of Return 1: not determined with certainty.** Runner 1's W was not
measured (its size was not printed); a new window takes the size of the last active Chrome window, and the only
mechanism I could reproduce that yields 0 is a narrow window (≤ ~516–600 px). Timing alone does not explain it (the
runner's restore re-read 0 again ~seconds later). It is also possible the button was pinned between Return 1 and now;
the probe cannot tell. The Chrome window count was 2 at the runner's start and is 1 now (the user's; mine closed).

Probe incident (recorded): in probe 2's first run a PowerShell variable `$w` (loop) aliased `$W` (case-insensitive), so
`MoveWindow` and the final `WM_CLOSE` went to handle `1400`, which was not a window (`IsWindow(1400)=False`; UIA's
`FromHandle` on it failed at once, before the close). My own window 3278346 stayed open; I checked it (Chrome window
class, fixture title) and closed it by handle. Nothing else was touched. Fixed (`$wid`) and re-run.

### Fix (s10 code only; `recipes/s9-win.ps1` unchanged)

- `recipes/s10-rules.ts`: `PIN_NAME`, `PIN_WAIT_MS = 5000`, `PIN_WIDEN_AFTER_MS = 1000`, `PIN_NARROW_PX = 1000`,
  `PIN_WIDEN_TO_PX = 1200`; `pinNameMatches(name, type, class)` (first line starts with the name; class
  `ToolbarActionView` or a Button); `pinStep({found, elapsedMs, widthPx, widened})` → `pinned | wait | widen | unpinned`.
- `recipes/s10-win.ps1`: `Find-S10ActionButtons` and `Get-S10PinState <hwnd> [-WaitMs] [-Quiet]` — poll every 200 ms up
  to 5 s; a window narrower than 1000 px is widened ONCE (its own window, `MoveWindow` within its monitor's work area,
  to 1200 px) after 1 s; then pinned / unpinned. No click, no Invoke, no key. **`Get-S9PinState` is overridden** in
  `s10-win.ps1` (after the dot-source, as `Format-S9Title` is) to call `Get-S10PinState`, so the restore's pin check
  (`Restore-S9Desk`) and `Set-S9Pin`'s final check use it too.
- `recipes/s10-r15.ps1` `B-window`: `$global:PinnedBefore = Get-S10PinState $global:W`; the UIA-only pin attempt and
  the `HUMAN GATE (pinning)` STOP are unchanged.
- Press helpers: `Get-S9ActionTitle`, `Wait-S9ActionTitle`, `Invoke-S9ActionButton`, `Get-S9BadgePixels` use
  `Find-S9ActionButtons` (Button + name prefix). The probe shows that match is right (Button, the name starts with
  `Chrome Agent Bridge`); they only fail in a narrow W, and the rows that press run after R15-3's placement (W ≈ half a
  monitor) — not changed. Such a failure throws → STOP (the safe direction).
- Test (`recipes/test/s10-rules.test.ts`, +3): the name match (access-note line, CRLF, default title, fixture page, not
  the first line); `pinStep` (the old reader's "unpinned at 0 ms" is now `wait`; narrow → `widen` at 1 s; `unpinned`
  only at 5 s); the PS mirror (constants, the match and decision lines, the override after the dot-source, `B-window`
  uses `Get-S10PinState` and not `Get-S9PinState`, the reader holds no click/Invoke/key/`Set-S9Pin`, the gate text
  unchanged, `PIN_NAME` = manifest name = `$S9Name`). With the pre-fix `s10-win.ps1`/`s10-r15.ps1` the third test
  fails (1 failed / 61 passed), checked.

### Probe again with the fixed reader (read-only)

```
[normal] old reader Find-S9ActionButtons: 1
toolbar buttons named 'Chrome Agent Bridge…': 1 after 47 ms (window 1936 px) -> pinned=true
[restored] toolbar buttons named 'Chrome Agent Bridge…': 1 after 38 ms (window 1918 px) -> pinned=true
width 600: … oldReader=1 fixed=True
width 516: actionViews=0 ours=0 oldReader=0 fixed=False          (-WaitMs 0: a single read)
PIN read: no button after 1212 ms in a 516 px window - widened my own window 854372 to 1200 px (nothing clicked)
toolbar buttons named 'Chrome Agent Bridge…': 1 after 1486 ms (window 1200 px, widened) -> pinned=true
```

Left running after the probes: nothing — no python, no probe window (Chrome windows 1 = the user's), nothing
LISTENING on 8080/9234; node 22152 only (not mine).

## Part B — grants, docs, runner fill-ins (citing #221 and #222)

- `S7-wave-sheet.md`: Gates paragraph — "RET-1 is prepared only / the pp1 leg is prepared only" replaced (dated
  *Amended* note citing #221, #222); a new paragraph "Run 15 restarts from block 1" (`-Block reset`, attempt 1 observed
  nothing; the new reader). §4 — after the teardown, PP1 then RET-1. §6 RET-1 and §7 PP1 rewritten: "granted once for
  Run 15 (#221, widened by #222)"; order after teardown, PP1 first, RET-1 last; each starts with
  `Test-S10LegState -Phase start` (else STOP) and ends with `-Phase end` (read-back equal by hash); RET-1: Chrome not
  running at the end → STOP, return at once with "Chrome is NOT running" first; RET-1's re-run rule (#222: only a tooling
  failure before `KILLED …`, ordered by the step agent under a new attempt; never after an observation). PP1: read-only,
  no write planned or added; `bb-login.ps1` real run (no `-DryRunBase`), exit 0 → go on, else STOP; `failureReports:
  false` (export-grades); REP-0 ran in block 11; clean-up deletes the leg's `exports/pp1-*.json`, the `sv` file and PNGs
  created in the leg's window in `failures/` and in the actor's own `tool-results/` (by its `session_id` — the actor's
  cwd is the repo, so its project directory is shared with other sessions), counted, never opened; only sizes and
  sha256s recorded; the transcript counted (`value-runs32`). Record template: "Not run" replaced by a "PP1 and RET-1"
  block. The ready-to-ask packages are kept as asked.
- New helper `Test-S10LegState -Leg PP1|RET-1 -Phase start|end` (`recipes/s10-win.ps1`): its own options-page window,
  the stored state and sha256 vs the found state (the empty text's), `daemon.status` via `s9.ts wait-safety`, one
  `LEG …` line, a STOP line on a mismatch, window closed; presses nothing. **Not run live** (it would start a daemon;
  the probe was to start none) — parse-checked only; untested live, like the prep helpers.
- `briefs/S7-runner.md`: binding bullet amended (RET-1 / PP1 as the only exceptions); "you never run …" replaced by the
  granted, ordered procedure (dated note) and a "restarts from block 1" bullet; Record line updated. The STOP RULE
  paragraph is byte-identical with the sheet's (checked).
- `docs/e2e-test-plan.md` §4.22: only `*Granted 2026-10-25 (#221, widened by #222): run once in Run 15 after the other
  rows (PP1, then RET-1).*` at the end of the RET-1 and PP1 rows; `git diff b55048d -- docs/e2e-test-plan.md` = those
  two lines.
- Pass rules: both judgeable as written. Notes, no edit: PP1's §4.22 text names no transcript scan command — the sheet's
  `s10.ts scan --mode transcript` reads the `sv` folder's `s15v-*.txt` as the values, so the MCP file is the value
  counted (the old sheet text "with the SDK file in the sv folder" is not needed when the hashes agree); its other
  counts (the real site's `scheme://host`) are not PP1's rule and would fail `scanVerdict10`'s transcript mode — the
  sheet says to read only `value-runs32` for PP1. The `sv` folder is gone after the teardown; step 4 recreates it.

## Checks

- `npx tsc --noEmit -p recipes/tsconfig.s10.json` 0; `… tsconfig.s9.json` 0; `npm run typecheck` 0.
- `npx vitest run` (= `npm test`): **3236 passed, 132 files** = 3233 + 3 (all in `recipes/test/s10-rules.test.ts`,
  59 → 62); nothing removed.
- PowerShell parse: `s10-win.ps1`, `s10-r15.ps1`, `s10-ret1.ps1`, `s10-mem.ps1`, `s9-win.ps1` — 0 errors each.
- STOP RULE paragraph: byte-identical in `S7-wave-sheet.md` and `briefs/S7-runner.md` (compared, CR stripped).
- `git diff b55048d -- docs/e2e-test-plan.md`: 2 lines, the two dated notes only.
- Left running: nothing of mine (no python, no probe window, no daemon, no node but 22152; ports 8080/9234 not
  LISTENING). The one stray `python` hang (a heredoc in Git Bash) was stopped by TaskStop; it had started nothing.

## Commit file list

- `recipes/s10-rules.ts`, `recipes/s10-win.ps1`, `recipes/s10-r15.ps1`, `recipes/test/s10-rules.test.ts`
- `docs/e2e-test-plan.md`
- `docs/plans/2026-10-24-step10-step8-follow-ups-steps/S7-wave-sheet.md`, `…/briefs/S7-runner.md`,
  `…/S7-wave-fixer1.md` (this report)
- (the step agent's own: `S7.ledger.md`, `S7.md`, `briefs/S7-live-verifier.md`, `briefs/S7-wave-fixer1.md`)

## Follow-ups after the verifier's check (N1, N3; same rules: no Chrome action, no commit)

- **N1** — `Get-S10PinState` (`recipes/s10-win.ps1`) checks the window itself before any `MoveWindow`: `Test-S9Live
  $Hwnd` (recorded at open time, same owner pid, `Chrome_WidgetWin_1`, one of the wave's titles). On a mismatch it
  moves nothing, prints `PIN read: … window <h> is not the wave's own - not moved -> pinned=false` and returns
  `$false` (the existing human-gate STOP path). Test: the reader contains the check, before `MoveWindow`.
- **N3** — PP1 never deletes a file it did not write. `recipes/s9-actor.ts start <name> --failures-dir <absolute dir>`
  (new, optional; the dir is created) writes the actor's MCP config with `env: {BRIDGE_FAILURES_DIR: <dir>}`
  (`recipes/s9-rules.ts` `mcpConfig(node, entry, failuresDir?)`; without the argument the config is unchanged, so every
  Run 13–15 actor is unaffected). Honoured: Claude Code passes a stdio server's config `env` to its process; the MCP
  builds its failure reports with `env: process.env` (`mcp/src/tools/registry.ts`), and the SDK's `failuresDir` reads
  `env.BRIDGE_FAILURES_DIR` first (`sdk/src/error.ts`) — by reading the code; not run live. Sheet §7: step 0 makes
  the leg-own folder `%TEMP%\bridge-e2e\s15\pp1-failures\<legStart>` and counts the shared `failures\`; step 4 starts
  the actor with `--failures-dir`; step 6 deletes only the `exports\pp1-<date>.json` step 3 printed as written (and
  only if written after `$legStart`), `s15v-pp1-mcp.txt`, the leg folder's contents, and PNGs in the pp1 actor's own
  session `tool-results\` (its `session_id`); the shared `failures\` is counted again, a rise recorded, nothing
  deleted there. Record template and runner brief updated to match. Tests (+2 in `s10-rules.test.ts`): `mcpConfig`
  with and without the folder; `s9-actor.ts` takes `--failures-dir` (absolute); SDK and MCP read the variable; the
  sheet names `--failures-dir` and `pp1-failures`.
- Checks (follow-ups): tsc s10 0, s9 0; `npm run typecheck` 0; `npm test` **3238 passed, 132 files** (3236 + 2); PowerShell parse 0 errors (s10-win, s10-r15, s10-ret1, s10-mem, s9-win); STOP RULE byte-identical in sheet and runner brief; `git diff b55048d -- docs/e2e-test-plan.md` still the two notes. Found and fixed on the way: a Bash heredoc had halved backslashes in two test lines (one made the "override after the dot-source" check vacuous: `indexOf` was -1); both rewritten with the Edit tool and the check now also asserts the dot-source is found. Not in the required set: `tsc -p recipes/tsconfig.s6.json` reports `chrome` type errors in `extension/src/tabs.ts`, `debugger.ts` (files this round did not touch; not investigated).
