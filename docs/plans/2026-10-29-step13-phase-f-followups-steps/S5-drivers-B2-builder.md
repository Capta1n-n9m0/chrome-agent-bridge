# S5-drivers-B2 builder report

## 1. Verdict
DONE. Built, not run live. #405 in the shared runner and the three slice-B chooser rows' actor and judges.

## 2. Outputs
Files (new lines by `wc -l` and `git diff --numstat`; cap 600, used about 420):
- `recipes/s13-r20-b.ts` (new, 190): `choose-twice`, `choose-kept`, `choose-refuse-dis` commands, the pure judges, `stopFor`, `preludeStop`.
- `recipes/test/s13-r20-b.test.ts` (new, 127): 20 tests.
- `recipes/s13-r20.ps1` (+29): `Get-R20Procs`, `Get-R20KillList`, `Install-R20StopKill`, one call in `Register-R20Blocks`.
- `recipes/test/s13-r20-ps.test.ts` (+74, additions only): 10 PowerShell-with-stubs tests (own `runBody`, one PowerShell run).
- `recipes/tsconfig.s13.json` (include entries) and `recipes/tsconfig.s6.json` (one exclude entry, see Deviations).

Numbers:
- `npm test` before: 243 files, 5807 passed (run before my first edit). After: 244 files, 5837 passed (`npm test`; +30 = 20 + 10, none removed).
- `npm run typecheck`, all eight `recipes/tsconfig*.json`, `npm run build`: `npm run typecheck` exit 0; `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b,.s13}.json` all exit 0 (`.s6` after the exclude entry; the chain's first `.s6` run, before it, exited 2); `npm run build` exit 0; `git status --short` shows only my files (the 5 above plus this report).
- Red proof for #405 (scratch copy of HEAD's `recipes/` made by `git archive` into a temp folder outside the tree, tests pointed at it by `S13_R20_REPO` / `S13_R20_PS1`): the 4 kill tests fail there (ORIG kill, no tree kill); the preflight tests pass there by design (the code already existed, S5-liveA20 fix round 2; they pin it behaviourally).

## 4. Deviations
1. `recipes/tsconfig.s6.json` is outside my lane: its `test/*.test.ts` glob compiled my new test with chrome-typed imports (2 errors families, exit 2). I added `test/s13-r20-b.test.ts` to its exclude list, as slice A did for its tests. One token; exit 0 after.
2. KEPT's prelude compares the two files' SHA-256 from the wave `state.json` (made by the runner), not a page-computed digest: the page can compute a digest only after an upload. The leg itself compares the page-computed digests.
3. The B-window clause of the sheet is untouched (nothing here opens windows).

## 5. Proposed decisions (the sheet is silent; each is pre-written in code and tests)
1. **Tree kill mechanism (#405):** `Win32_Process` ParentProcessId walk (`Get-R20KillList`, pure, tested with stubs); a descendant whose command line matches `daemon[\\/]dist[\\/]index.js` is skipped with its whole subtree; the root is killed last; only the name `node` (the actor) gets the tree kill, every other recorded name goes to Run 17's own `Stop-S16Pid`; the same PID plus start-time check as Run 17. Installed by `Register-R20Blocks` (runs after the entry script's `Get-R18Defs` load), the original kept in `$global:R20StopOrig` once.
2. **KEPT row verdict:** leg `same` prints `LEG … same RECORD`; with the shared `Complete-R19Row` override the row then reads RECORD when leg `different` passes (the sheet lists KEPT among rows that may end RECORD); a FAIL or NOT MEASURED stays.
3. **KEPT digest unreadable:** a page digest that never became non-null (20 reads of 100 ms) makes leg `different` NOT MEASURED, `digest-differs=n/a`.
4. **REFUSE-DIS `btn` baseline:** `btn` not reading TIMEOUT makes a PASS or RECORD NOT DISCRIMINATING (a FAIL stays FAIL). `ok` with a file on `self` is FAIL even when `flip` is refused (the sheet's "on `flip` or `self`"). `self` always runs, in the order btn, flip, self. The row prints one `LEG R20-CHOOSE-REFUSE-DIS row <verdict>`.
5. **TWICE tolerances:** call 1 TIMEOUT between 4 900 and 8 000 ms of its send (R19-CHOOSE-3's margins; the sheet says "about 5 s"); serialised MCP = call 2 text `other` and its reply 4 000 ms or more after call 1's reply; then no MCP `LEG` line is printed (only `CHECK … mcp NOT MEASURED — the MCP serialised the calls`) so the SDK leg alone decides the row.
6. **STOP reasons:** control upload not ok = `chooser-interception-left-on` (TWICE and KEPT); a dialog count above 0 = `dialog-left-open` (all three); KEPT's prelude STOP uses `throw-after-state` (the sheet names no reason). The lines are printed first, the STOP after.

## 6. Findings
- Measured in PowerShell 5.1: `[\/]` in a .NET regex does not match a backslash, so a daemon path check needs `[\\/]` as Run 17's `Test-S16Port` has it; the new daemon-in-tree test caught my first version (it killed the daemon's two processes).
- A function that returns `, @(...)` and is called as `@(f ...)` yields a one-element nested array; return the plain array.
- A test double of Run 17's `Stop-S16Pid` must be redefined before every `Register-R20Blocks`, else the second capture is the override and a non-actor name recurses.

## 7. Handoff (B3 and B4 need)
- The actor asks the PowerShell side for the native-dialog count through these value steps (each answers a count, `Get-R19DialogN`): `R20-CHOOSE-TWICE-dlg`; `R20-CHOOSE-KEPT-different-dlg`, `R20-CHOOSE-KEPT-same-dlg`; `R20-CHOOSE-REFUSE-DIS-btn-dlg`, `-flip-dlg`, `-self-dlg`. Run order inside each row: calls, then `sig`. B4's blocks must supply them (as `New-R19Dlg` / `@{ k = 'val'; … }` in `s12-r19-c.ps1`), and a row-level `-Actor 's13-r20-b'` with commands `choose-twice`, `choose-kept`, `choose-refuse-dis`.
- The driver window guard must learn the title `S13 chooser fixture` (`recipes/s12-win.ps1` line 17 and `recipes/test/s12-title.test.ts` line 46 list only the S12 titles; outside my lane, #367). Not done here.
- The new STOP reasons `chooser-interception-left-on`, `dialog-left-open` and `throw-after-state` must be known to `Stop-R19`/the RETURN table (the sheet lists them); `outside-file-reached-page` is not produced by these rows (no outside file is used).
- The fixture port is 8081 (the actor's `URL` helper hard-codes it, as Run 19's).
- Nothing was run live; no Chrome, no daemon, no port; the product daemon was not touched. No file in the main tree was reverted or moved.
