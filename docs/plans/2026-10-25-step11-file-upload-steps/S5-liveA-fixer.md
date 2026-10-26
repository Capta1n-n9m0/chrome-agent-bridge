# S5-liveA fixer report (set-up fixes, #281)

Model: Sonnet 5.5, effort medium. UTC start 2026-10-26T04:26Z, end 04:37Z.

## 1. Verdict
DONE. One open item for the step agent: the Chrome occluder of SW-2 could not be identified (section 6).

## 2. Outputs
- Commit 1 `e3152f9` (the four liveA evidence files, unedited; journal.md untouched).
- Commit 2 `ddc3955`: `recipes/s9-win.ps1`, `recipes/s11-win.ps1`, `recipes/s11-r16.ps1`, `recipes/s11-win-rules.ts`,
  `recipes/s11-evidence.ts` (new), `recipes/test/s11-liveA-fixes.test.ts` (new, 19 tests), `recipes/tsconfig.s11.json`,
  `docs/plans/2026-10-25-step11-file-upload-steps/S5-liveA-occluders.txt`. This report is NOT committed (the step agent does).
- `npm test`: 3784 -> 3803 passed (152 -> 153 files); the 19 new tests are the whole difference (`vitest run --exclude` of the
  new file gave 3784 before the fixes to the harness). `npx tsc --noEmit -p recipes/tsconfig.{s11,s9,s10,s6,fe,json}` all exit 0.
  PowerShell 5.1 ParseFile: s9-win, s11-win, s11-r16 0 errors. `s11-win.ps1` and `s11-r16.ps1` are ASCII; `s9-win.ps1` keeps its
  18 pre-existing non-ASCII lines (the title constants' dash, BOM), none added. `s11-win.ps1` is 485 lines (cap 500).

## 3. The fixes
1. Title first line: new `Get-S9FirstLine` in `s9-win.ps1`; `Get-S9ActionTitle` returns only the first line and prints
   `ACTION name "<first>" ... (+N further line(s) not shown)` (also for the help text); `Wait-S9ActionTitle` compares the first line.
   Constants and the callers' `-eq` untouched. Tests execute the real functions under powershell.exe with `Find-S9ActionButtons`
   stubbed to a two-line name. Run against `git show HEAD:recipes/s9-win.ps1` (env `S11_TEST_S9WIN`), 2 of the 3 title tests fail
   (`EQ True` missing; `Has access` printed); the third (a different first line stays unequal) passes on both, as it should.
2. Evidence scan: `recipes/s11-evidence.ts` (`npm run recipe -- recipes/s11-evidence.ts --file f [--file f2]`). No connection, no
   ROW/CHECK line, counts only; generic sentinel `s11-` + 12 hex plus state.json's when it differs in shape; exit 0 or 2 (1 usage).
   Pure `evidenceCounts` is tested on the fixture cases of #277 and the generic sentinel.
3. SW-2 placement: pure `clearPlacement` (s11-win-rules.ts) mirrored by `Get-S11ClearRect`; `Set-S11Place` (own window only,
   asserted first; restore, then MoveWindow into the work area cut 8 px clear of any overlapping taskbar rect); called in the sw-2
   block before `Set-S11Front` and the guard. The PowerShell and TypeScript functions are run on the same 6 cases and must agree.
   Guard: verdict logic byte for byte; added per occluder `OCCLUDER detail rect=[..] owner= rootOwner= topmost= popup= toolwindow=
   noactivate=` (via `Format-S11Occluder`; no titles). A test fails if the verdict lines change, a class/allow-list appears, or the
   sw-2 call gains an argument.

## 4. Evidence-scan lines (the four committed files)
```
EVIDENCE S5-run-record.md: ://=16 (fixture 16, other 0) token=0 sentinel=0 profile=0
EVIDENCE S5-liveA-framing.txt: ://=2 (fixture 2, other 0) token=0 sentinel=0 profile=0
EVIDENCE S5-liveA-runner.md: ://=5 (fixture 2, other 3) token=0 sentinel=0 profile=0
EVIDENCE S5-liveA.ledger.md: ://=0 (fixture 0, other 0) token=0 sentinel=0 profile=0
```
Exit 2 because of the runner report: its 3 "other" are the literal prose placeholders `scheme://host` (twice) and `extension://...`
(read by `grep -o`, no host, no real URL). The record and framing are clean by the #277 rule, so #281 (a) holds.

## 5. Occluder diagnosis (S5-liveA-occluders.txt)
Monitors [0,0,1920,1080] and [1920,0,3840,1080], work areas equal to them; the taskbar is auto-hide on; both bars sit at y 1078..1126
(2 px inside the monitor). W's page area in the record, [1920,177,3840,1080], is that of a maximized window, whose frame is
[1912,-8,3848,1088].
- Shell_SecondaryTrayWnd [1920,1078,3840,1126] (explorer): the user's shell, but overlapped by the wave's own W (the maximized frame reaches
  y 1088). Placement avoids it.
- Shell_TrayWnd [0,1078,1920,1126] (explorer): overlapped by W's 8 px frame overhang into monitor 0 (x 1912..1920). Placement avoids it.
- Chrome_WidgetWin_1: NOT identified. Now only one visible chrome top-level window exists (a maximized frame, not topmost, owner none);
  no topmost Chrome popup is present. The first run's guard printed class and process only, and `Enter-S11Guards` treats any non-driver
  window as foreign, so the window could be a Chrome-owned popup of a wave window (the documented options-page bubble), a leftover wave
  window, or the user's window; the record cannot tell. The new detail line will say (owner/rootOwner kind, topmost/noactivate).

## 6. Deviations / handoff
- Placement is a fix of the wave's own window only; if the Chrome occluder is the user's window over W, SW-2 waits for the user (#281 Revisit-if).
  Decide after the next SW-2 attempt reads its detail line: owner=W|E|D|O with `topmost=True popup=True` means a wave-owned bubble
  (still foreign by the unchanged rule, so STOP); owner=none and not topmost means a user window.
- `Set-S11Place` moves/resizes W (un-maximizing if needed) in the sw-2 block. Run order is unchanged: `sw-2` then `up-restore`,
  `up-logs`, `teardown`, and the rows not yet run (`up-fa` etc.) as before. Nothing else depends on W's size.
- A scratch note: the SAFE_VARS list was not changed; the new print lines use names already on it (`$state`, `$res`).
