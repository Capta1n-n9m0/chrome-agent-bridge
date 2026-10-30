# S5-drivers-C2 builder: liveC20's actor

Model and effort: Sonnet 5.5, medium. Nothing was run against Chrome, a daemon, a port or UIA.

## 1. Verdict
DONE. All five rows built (no DONE-PARTIAL): `recipes/s13-r20-c.ts` (200 lines) and `recipes/test/s13-r20-c.test.ts` (130 lines), 330 new lines in all.

## 2. Outputs
- Files: `recipes/s13-r20-c.ts`, `recipes/test/s13-r20-c.test.ts`; `recipes/tsconfig.s13.json` (both added to include), `recipes/tsconfig.s6.json` (the test added to exclude). C1, slices A/B, Run 17/19 files untouched.
- `npm test`: 250 files, 5969 passed (start 5951 / 249; +18 tests, +1 file). `npm run typecheck` 0. All eight `recipes/tsconfig*.json` exit 0. `npm run build` 0. `node scripts/doc-check.mjs` 0. `git status --short`: the four files above and this report.
- Red: the first run of the tests failed twice on the real file (a docked control answer `na` was parsed as title `na`, not `n/a`; a fixture error in my page helper), then both were fixed. A red run on a copy outside the tree and mutants on copies were not made: a copy has no `node_modules` (no junction, #395/#220), so the pure judges are proven by construction (each test asserts the sheet's exact line or verdict and fails if the judge is bypassed: `devtLegResult` is only `ctrl20Verdict` + `devt20Verdict` + the line builders, and the tests pin the output of each branch).

## 3. Interface for C3 (wire exactly this)
Run through `Invoke-R19Row` with `-Actor 's13-r20-c'` and `-StepList @(@{k='serve'; h=<handlers>; s=600})` (as `Invoke-R20Ch`). `Invoke-R19Row` appends `--slice` and `--ctl`; the actor ignores them. Before each DEVT/conditional row the PS side puts window X in front (`Set-S11Front`): the actor opens its tabs with `newTab(active: true)`, so they land in X as its active tab, which is the tab the DevTools opener acts on. The port is 8081 (C1 requires it; the URLs are Run 19's `URL()`). `finally` on the PS side: `Close-S13DevTools` (an actor throw can leave DevTools open).

| Command (first argument) | Further args | Rows / what it does |
|---|---|---|
| `devt-undock` | none | R20-DEVT-UNDOCK, leg `undock` |
| `devt-early` | none | R20-DEVT-EARLY, legs `undocked` then `docked` |
| `up-devt` | `--leg undocked` or `docked` | R20-UP-DEVT under that DevTools state (needs ROOT in state.json: `fileOf`) |
| `keep-4` | `--leg undocked` or `docked` | R20-KEEP-4 |
| `sweep-held` | `--leg undocked` or `docked` and `--phase 1` (default) or `--phase 2` | R20-SWEEP-HELD; the reload between the phases is C3's |
| `gate-dock` | `--dock <bottom or right or left or undock or unread>` | prints the five NOT RUN rows and exits 3 for `unread` (or any non-side word); else `CHECK gate-dock side-readable=yes`, exit 0 |
| `gate-cond` | `--findings <comma list of refusing legs, or none>` | no refusing leg: prints the three conditional rows `NOT RUN — no DevTools condition refused` + the finding CHECK line, exit 3; else `CHECK gate-cond run=yes refusing-legs=<n>`, exit 0 |

Who prints the NOT RUN texts: the actor, via `gate-dock` and `gate-cond`, derived from `devtRowGate` / `conditionalRows` (no text copied into PowerShell). C3 calls them and shows the lines; for `--findings` C3 collects the legs from the lines `CHECK <row> finding=devtools-refuses leg=<label>` that the DEVT rows print (labels `undock`, `undocked`, `docked`; pass any non-empty words, only the count matters; `undock` and `undocked` are one state). For the conditional rows C3 maps a refusing leg to `--leg`: `undock` and `undocked` give `undocked`, `docked` gives `docked`. Use `none` when there are none (PowerShell drops an empty argument).

Step ids (`<row>-<leg>-<step>`; `<leg>` is `undock`, `undocked` or `docked` for the DEVT rows, and the `--leg` state for the conditional rows) in signal order, and the answer the PS side gives (one `serve` handler per id; the handler for `…-undock-…`/`…-undocked-…` calls `Get-S13Control … 'undock'`, `…-docked-…` calls it with `'docked'`):

1. `R20-DEVT-UNDOCK-undock-{ctl0, open, ctl1, close}`; `R20-DEVT-EARLY-undocked-{…}`, `R20-DEVT-EARLY-docked-{…}`. Order: (UNDOCK only, in the actor: `evaluate "1 + 1"`, then the shared `idle()` to 20 000 ms), `ctl0`, `open`, `ctl1`, then the bridge call, then `close`.
2. `R20-UP-DEVT-<state>-{open, ctl1, ctl2, close}` (order: open, ctl1, `evaluate "1"`, ctl2, upload, close, `evaluate "1"`).
3. `R20-KEEP-4-<state>-{open, ctl1, close}` (one `consoleMessages` first, then open, ctl1, `consoleMessages`, close, `consoleMessages`).
4. `R20-SWEEP-HELD-<state>-{open, ctl1}` in phase 1; `-{ctl2, check, close}` in phase 2.

Answers: `ctl*` = `<windows or na> <ok or none or na> <yes or no or unread> <targets>` (`Get-S13Control`'s fields; docked: `na na …`); `open` = `ok` or `fail` (`Open-S13DevTools`, `opened` and `done`); `close` = the `remaining` integer of `Close-S13DevTools`, or `unread`; `check` = `yes` or `no` (DevTools still open, UIA). An odd answer to `ctl*` reads as `attached=unread` (RECORD); a non-count `close` answer is the STOP `devtools-left-open` (strict).

Tab markers (the URL's `s12x=` token, which `Get-S13Control $Marker` takes, exported as `MARKER`): UNDOCK `s12x=r20u1`, EARLY undocked `s12x=r20eu1`, EARLY docked `s12x=r20ed1`, UP-DEVT `s12x=r20cup` (page `s11-upload.html`), KEEP-4 `s12x=r20ck4`, SWEEP-HELD `s12x=r20csw`. The handler picks the marker from the row and leg of the id. None is a substring of another.

SWEEP-HELD between the phases: the actor leaves the tab open (kept, released) and DevTools open. C3 reloads the extension, reopens the worker-console capture (the control read needs `$global:D`), prints R20-0C's proof as `LOADED20 rerun=<k>`, then runs phase 2. If phase 1 prints a `control-pre` verdict other than PASS, phase 2 still runs (it closes DevTools through the `close` step).

Exit codes: 0 pass or RECORD; 1 any FAIL; 2 STOP (`STOPWHY <reason>`: `devtools-left-open` when `close` leaves a count other than 0 or unread, `throw-after-state` from `findTab`/the reporter; a `HelperDefect` ends `STOP: HelperDefect`, exit 2); 3 NOT MEASURED. Output lines: `LEG <row> <label> <verdict>` (the verdict may carry the sheet's text, e.g. `RECORD devtools-control-unreadable`, `NOT MEASURED DevTools was not attached`, which `Invoke-R19Row` turns into the one `ROW`); `CTRL20`, `DEVT20`, `KEEPDT`, `SWEEPHELD`, `IDLE`, `ANSWER`, `CHECK` lines. Leg labels of the conditional rows: UP-DEVT `control`, `control1`, `upload`, `page`, `control2` (only `control` when a control is not PASS); KEEP-4 `devtools`, `closed`; SWEEP-HELD `control-pre` (phase 1), `sweep` (phase 2).

## 4. Deviations
- The actor always makes the bridge call after the after-open control, whatever the control read (the control gates the verdict, not the call). A failed `open` only prints `CHECK … open=fail`; the control decides the leg (an undocked leg with no window is RECORD).
- `x.open` is used for tabs (Run 19's helper), so `last-attach.stamp` is shared with other actors; `idle()` is the shared one.

## 5. Proposed decisions
### 2026-10-30 · The finding `devtools-refuses` is a CHECK line
**Decided:** `CHECK <row> finding=devtools-refuses leg=<label>`, printed by the DEVT rows for a leg that is FAIL with K-devt exactly. **Why:** §4.28 gives the finding no line form; a CHECK needs no change to the form list and C3 reads the legs from it. **Instead of:** a new form letter in §4.28 (a sheet edit). **Revisit if:** the user wants the finding in a numbered form. **By:** Claude (proposed)
### 2026-10-30 · Unstated cases decided strict
**Decided:** (a) an `evaluate "1 + 1"` that does not answer 2, or an idle under 20 000 ms, makes the UNDOCK leg NOT MEASURED; (b) an `ok` with a value other than 2 is FAIL (`value=n/a`, plus a `value-wrong=yes` CHECK); (c) a conditional row whose control passes but whose call is not refused is FAIL, never NOT MEASURED; a control that is not PASS is the row's only leg; (d) a `close` answer that is not a count is the STOP `devtools-left-open`; (e) in KEEP-4 the time from the first call to the end of the open step is printed (`open-ms`) and not judged, because it includes the dock change and the "before the 5 s idle bound" cannot be read more exactly; (f) SWEEP-HELD's control is read in both phases. **By:** Claude (proposed)

## 6. Findings
None measured (nothing was run live). Known limits for the verifier: the conditional rows' pass rules are R17-UP-DEVT's (via `judgeErr17`/`refusalPageJudge`), R19-KEEP-4's (`judgeKeep4`) and R19-SWEEP-HELD's (`judgeSweep`), reused read-only; `devprobe`, `devprobeLine` and `attachedFrom` are not imported. `readPage`/`reset` of Run 19 are not exported, so small copies sit in this file.

## 7. Handoff
C3: entry `recipes/s13-r20-c.ps1`, blocks `recipes/s13-r20-c-defs.ps1` (the serve handlers above, X in front, `Close-S13DevTools` in a finally, the sweep reload and capture reopen, the R20-0C dock gate through `gate-dock`, the conditional gate through `gate-cond`, FLAG, RESTORE/LOGS). The `STOP devtools-left-open` has no restore on the actor side; C3 matches it to a RETURN.
