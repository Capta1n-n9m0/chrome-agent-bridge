# S5-drivers-B3-verifier — R20-G2-1, R20-VERSION and the window helper

Verifier: Claude Opus 5.5, medium. Read and run only. No Chrome, no daemon, no live run. No window was moved: one
read-only listing of the desktop's top-level windows, numbers only (F1). Mutants ran on a copy outside the tree (#395).

## 1. Verdict

**FAIL**: one MAJOR (F1). The rest is MINOR or NIT. The judges match §4.28's pass rules, and none of them flatters a
result. The STOP mapping matches the sheet. Every exit check passes.

## 2. Outputs (re-derived)

| Check | Command | Result |
|---|---|---|
| tests | `npm test` | `Test Files 245 passed (245)`, `Tests 5864 passed (5864)`, exit 0 |
| count | `git diff` of the tests: 16 `it(` added to `s13-r20-b.test.ts`, 0 removed; 9 in the new `s13-win-ps.test.ts` | 5839 + 25 = 5864, as the builder says; none removed |
| typecheck | `npm run typecheck` | exit 0 |
| recipes | `npx tsc --noEmit -p` on each of the eight `recipes/tsconfig*.json` | all eight exit 0 |
| build | `npm run build` | exit 0 (`built extension → dist/`) |
| tree after the build | `git status --short` | only the slice's 7 files (4 M, 3 ??) |
| B2 and older code | `git diff recipes/s13-r20-b.ts` | removed lines: only the header comment and two import lines that were widened; no B2 judge or actor changed. No change to Run 17/19, `s13-forms.ts` or slice A |
| tsconfig | diff | `.s13` gets the include and `.s6` the exclude for `test/s13-win-ps.test.ts`, nothing else |
| private data | grep of the slice files and the builder report for a home path or user name | none |

The phase doc's "every new pure test fails on the code before the stage" holds trivially: the functions did not exist
before. The real proof is the mutant run in §3.

## 3. Red proof by mutants (the builder wrote the tests after the code)

**How it ran:** `s13-r20-b.ts`, its test, `s13-win-ps.test.ts` and `s13-win.ps1` were copied to the session scratchpad,
with imports pointed at the unchanged main-tree modules. The PowerShell test was pointed at the copy (`S13_WIN_REPO`).
The copy runs green: 47/47. Then 39 mutants ran, one at a time: 30 went **RED** and 9 **survived**.

| Survived | Mutant | Meaning |
|---|---|---|
| T1 | `bTimedOut`: `>=` → `>` (`s13-r20-b.ts:239`) | the 30 000 boundary is not tested (NIT) |
| T3 | `g2Rows` without the `usable` guard (`:246`) | an equivalent mutant: an unusable leg never has `bTimedOut` or PASS |
| **T4** | `g2Rows`: cause named on `cov.bTimedOut` alone, dropping `unc.v === "PASS"` (`:248`) | **covered times out while uncovered FAILs would name "capture of a covered window"**: the sheet's condition is not pinned (F2) |
| **T8** | `winCovered` with no work-area clip (`:229`) | the taskbar-strip cut is pinned only in `coveredPx`, not in what the actor prints (F2) |
| **T10** | `judgeVersionCall` without `o.files === 0` (`:320`) | **the row's discrimination clause ("uploads into the input, `files=1`") is not pinned**: the only `files=1` case also changes `code` (F2) |
| T22 | `rectOf` accepts a negative w or h (`:203`) | not tested (NIT) |
| T23 | `parsePlace` regex loosened to `/^refused/` (`:234`) | not tested (NIT) |
| P8 | the minimized check after the move removed (`s13-win.ps1:123`) | not tested (NIT) |
| P9 | `MinH` ignored (`s13-win.ps1:97`) | the `placeSmall` case fails on width, so height is never tested (NIT) |

**RED (30):**
- **TS:** T2 (LOCK_TIMEOUT counted as a timeout), T5, T6 and T7 (no clip; an overlap counted twice), T9 (an exact
  match loosened to `includes`), T11–T21 (each VERSION clause, NOT MEASURED → PASS, the hint, args `==`, the STOP
  word, the dialog STOP, z<0), T24–T26.
- **PowerShell:** P1 and P2 (the ownership check dropped for B, or removed), P3 (the taskbar counted), P4, P5, P6,
  P7 (no read-back), P10–P13.

The ownership refusal, the read-back, z, the taskbar exclusion and the `above` list are discriminating.

Files: `mutants.log` and `muts.json` in the session scratchpad (not committed).

## 4. Deviations

None from the brief.

## 5. The builder's proposed decisions, audited

1. **B "timed out" = not `ok`, not `LOCK_TIMEOUT`, reply at or after 30 000 ms.** Accept. Run 19's failure was
   `b=TIMEOUT b-reply=35106` (S7-run-record:122), so this definition catches the failure being re-measured. Leaving
   out LOCK_TIMEOUT is the conservative direction: it names fewer causes.
2. **ND for a failed alone-control or WB not at 0 px; NOT MEASURED for a refused placement.** Accept. Neither is a
   pass, and the first is the sheet's own clause. With F1 open, though, "WB not at 0 px" is the likely outcome.
3. **`a-effect` as a delta.** Accept. The same page is clicked in both legs and in the variant. Run 19's absolute
   count worked only because its page was fresh.
4. **VERSION's control upload not ok → `existing-tool-changed`; a dialog → `dialog-left-open`.** Accept. §4.28's STOP
   list names "R20-VERSION's control" under `existing-tool-changed` (line 1997). §4.27's carried rule makes "a native
   dialog left open" a STOP in any row.
   - The control leg's FAIL is still printed before the STOP. That matches B2's pattern, and no FAIL was turned into
     a STOP or the other way round.
   - Not raising `chooser-interception-left-on` here is right: build `63c771c` has no chooser interception.
   - An args leg that does not answer 7 is a FAIL leg, not a STOP. That is defensible: `evaluate`'s envelope (#377)
     is a changed path, so the "does not touch the changed paths" condition of `existing-tool-changed` does not
     clearly hold. NIT N4 asks for a sentence in the decision.
5. **Margin 16 px, minimum 500×400.** Accept with F1's amendment: WB is raised after the move.

The added `CHECK … b-covered-after-px` line is not judged and changes no verdict. `CHECK` is a carried form. Its cost
is N2.

## 6. Findings

### F1 MAJOR: the placement never raises WB, so the uncovered leg's `covered-by-others-px=0` depends on a z-order nothing sets (`recipes/s13-win.ps1:33`, `:113-124`)

**Where:** `Move` calls `SetWindowPos(h, 0, x, y, w, h, 0x0014)`. 0x0014 = `SWP_NOZORDER | SWP_NOACTIVATE`, so the
move keeps WB's place in the z-order.

**Why it matters:** the placement tiles the whole work area (two halves, a 16 px margin). Every counted window that
was above WB before the move, and is not WA, therefore lies over WA's or WB's slot. Nothing else in the row raises WB:
- the default screenshot does not focus a window; only `focusTab` calls `chrome.windows.update(…, {focused: true})`,
  at `extension/src/handlers/tabs.ts:72`;
- B's tab comes from `newTab({active: true})`, which activates the tab, not the window;
- A's trusted click raises WA, not WB.

**Evidence:** a read-only listing of this desktop (`s13-win.ps1`'s own `List()` plus one DWM read; numbers only,
nothing moved):

```
all=412 counted=6 counted-covering-90pct-of-work-area=5 first-such-z=0 work=1920x1080
```

Five of the six counted windows each cover at least 90% of the work area, and the topmost counted window is one of
them. Any of these that sits above WB and is not wave-owned gives `covered-by-others-px>0`. The leg then reads NOT
DISCRIMINATING, and #391 (6)'s uncovered control is lost. That result is honest (not flattering), but by construction
the leg cannot run on a normal desktop unless WB already happens to be second only to WA.

Topmost windows also stay above WB, for example the Chrome-owned topmost popup that appears after an options toggle
(`recipes/CLAUDE.md`, occlusion guards). Slice B toggles options for ROOT.

**The brief's frame question, answered: no, the invisible frame does not defeat the leg by construction.**
- The DWM read on the same listing gave `GetWindowRect − DWMWA_EXTENDED_FRAME_BOUNDS` of `dL=8 dT=0 dR=8 dB=8`. The
  maximized Chrome windows gave 8 on all sides.
- The placement is written and read in `GetWindowRect` space. The two rectangles are therefore 16 px apart in the
  same space the coverage is computed in; `Test-S13Placed` checks this and P6 is RED. WA's frame can never add
  pixels to WB.
- The frame only makes the covered leg's recorded px read up to about 8 px high at an edge (recorded, not judged).

**Suggested fix:**
1. In `Invoke-S13Place`, after the move and only for the owned handles, call `SetWindowPos(h, HWND_TOP=0, 0, 0, 0,
   0, SWP_NOMOVE|SWP_NOSIZE|SWP_NOACTIVATE = 0x0013)` on WB and then on WA. Add a stubbed test that the raise is
   called only for owned handles and never on a refusal.
2. Keep the TS `covered-by-others-px=0` check as the read-back.
3. B4 closes the wave's options window, or at least minimises it, before R20-G2-1, so that its topmost popup cannot
   sit over WB.
4. Optional: print a count of the counted windows above WB that are not the wave's (`others-above=<n>`). That would
   make an ND here explainable without a title.

### F2 MINOR: three judged branches cannot go red (mutants T4, T8, T10)

- **T4:** add `g2Rows(L("FAIL", true), L("FAIL"))` → no cause, at `s13-r20-b.ts:248`.
- **T8:** add a `winCovered` case where an `above` rectangle lies only in the taskbar strip outside `wa`, at `:229`.
- **T10:** add `judgeVersionCall({...call, files: 1})` → FAIL, at `:320`. This clause matters most of the three:
  `s12-chooser.js` counts `clicks` only on `#open`/`#lab` (line 31-35), so a click on `#vis` is invisible to
  `clicks=0`, and `files=0` is the row's only discriminator against a build that ignores `chooser`.

### F3 MINOR: the leg-usability decisions are inline actor code, not tested (`s13-r20-b.ts:285-294`)

Three decisions sit in `g2One`'s glue, and no test reaches them:
- a refused placement → NOT MEASURED;
- an alone-control error → ND;
- uncovered with `bCov !== 0` → ND.

A swapped condition there would never go red. **Fix:** make it a pure
`g2LegGate(leg, placeOk, aloneErr, bCov): V | "run"` with tests.

### N1 NIT: survivors T1, T22, T23, P8, P9 (§3)

Add a boundary case for each: 30 000 exactly; a negative w; `"refused"` with no word; a minimized window after the
move; a work area that is wide but short.

### N2 NIT: the extra `-after` value step can cost a measured leg (`s13-r20-b.ts:301-305`)

The step runs before `legLine` is printed. A malformed answer throws `HelperDefect` after the leg's `G2` line, so its
`LEG` line is lost. **Fix:** print the `LEG` line first, or catch the `HelperDefect` and print
`b-covered-after-px=unread`.

### N3 NIT: coverage is clipped to WA's display (`s13-win.ps1:110`)

`Get-S13RectsAnswer` clips every named window to WA's monitor work area. In the covered leg, if WB or X is on another
display, its recorded `covered-by-others-px` is wrong. This is recorded only: the uncovered leg places both windows on
WA's display.

### N4 NIT: VERSION records `clicks` it does not print, and the args decision is unstated

- The sdk and raw legs judge `clicks` (`:344`), but `VERSIONCH` has no `clicks` key, and the final `CHECK` prints only
  the control page's counters. **Fix:** add `CHECK R20-VERSION <leg> clicks=<n>`.
- State in decision (4) why an args answer other than 7 is a FAIL leg and not `existing-tool-changed` (§5 item 4).

### Checks that hold

- The G2 judges are Run 19's `judgeG2`, unchanged: A ok first, gap ≥ 450, holder ≥ 450, effect 1, B ok. `g2Line20`
  matches the sheet's form with the `leg=` key.
- The cause logic is right in the code (only the test is missing, F2). The alone-control runs before each leg, with
  a 10 s timeout. The focusFirst variant runs last and is a `CHECK` only.
- VERSION:
  - `judgeVersionCall` requires `message === CHOOSER_RELOAD_HINT`, imported from `daemon/src/intercept.ts:44`,
    which is the text the daemon throws at `:504`;
  - the MCP leg is read by its own line and `isError` (`mcpLineVerdict`); no code on line 1 and no old text is
    pinned;
  - the control is `ok`, with no hint and `files=1`;
  - args are judged `=== 7`;
  - `#vis` is the file input on `s12=c1` (`test-fixtures/s12-chooser.js:39-42`).
- `s13-win.ps1`:
  - it reads no title (the test greps for it; the C# has no `GetWindowText`);
  - it closes nothing;
  - only `Invoke-S13Place` moves a window, and only after both handles pass `$Owned` (P1/P2 RED);
  - `ShowWindow(SW_RESTORE)` runs only inside `Move` on those handles.

## 7. Handoff: what B4 must carry

- **The F1 fix, before liveB20:** the raise in `Invoke-S13Place`, or B4 raises WB itself, owned-checked. Also close or
  minimise the wave's options window before R20-G2-1.
- **`$global:S13Hwnd`:** the hash `{A, B, X}`, where WB = the window that actually holds B's tab. Find it after
  `newTab`: it may be X, or a human window. If WB is not wave-owned, `Invoke-S13Place` refuses (NOT MEASURED), as it
  should.
- **`$global:S13Owned`:** every handle the wave opened, as `[long[]]`.
- **The value steps:** `R20-G2-1-open`; `-rects-{covered,uncovered}` and their `-after` variants answer
  `Get-S13RectsAnswer`; `-place` answers `Invoke-S13Place`; `R20-VERSION-dlg`. B2's six `-dlg` steps stand.
- **STOP path:** `existing-tool-changed` and `dialog-left-open`, plus B2's `chooser-interception-left-on` and
  `throw-after-state`; matched to RETURN lines (R5.6).
- **Old build:**
  - the swap, `LOADED20 rerun=<k>`, `old-build-left-loaded`, and `NOT RUN — old build not loadable` (exit 2 twice);
  - run the actor's `version` only with `63c771c` loaded and ROOT in the Upload folders;
  - the current build is reloaded afterwards, even after a STOP.
- **Entry script:** the order of `s13-r20-a.ps1`, with `Get-R18Defs` before `Register-R20Blocks` (#405, B2-verifier
  §7).
- **Window guard:** it must also accept `S13 chooser fixture` and the playground's title for WA.
- **Restore:** close WA at the slice's restore; the actor closes only B's tab.
- **Fixture port:** 8081 is hard-coded (`PLAY`, `S13CH`, `URL`).
- **Private data in evidence:** the rects answer carries other windows' rectangles (numbers only). Keep it out of the
  committed evidence or reduce it to the printed `RECT` lines.
- **Before liveB20:** B2-verifier's F1 and F2, if not yet fixed.
