# S7-drivers-DE builder report

Model Sonnet 5.5, effort medium. Nothing committed, nothing run live.

## 1. Verdict
DONE (with the Deviation and Findings below for the session agent).

## 2. Outputs
Layer followed: brief and §4.27 rows (liveD19 / liveE19 bullet, R19-ARGS-OLD, R19-VERSION).

New files (code / tests):
- `recipes/s12-r19-de.ts` (117 lines): actors `args-old` and `version`, pure judges, WANT logic.
- `recipes/s12-r19-de.ps1` (20 lines): `Invoke-R19OldArgs`, `Invoke-R19OldVersion`, `Add-R19RootOnce`.
- `recipes/test/s12-r19-de.test.ts` (227 lines): 36 tests.

Edited: `recipes/s12-r19-lib.ps1` (swap frame, `Test-R19ReloadGaveUp`, DIALOGS for D/E), `recipes/s12-r19.ps1` (dot-source, two registrations), `recipes/s12-r19.ts` (N-4 `swapFailText`), `recipes/tsconfig.s11b.json`, and four existing tests (below).

Sizes (`git diff --numstat HEAD -- recipes` plus `wc -l`): code about 137 new lines plus 19 changed in lib/entry/ts (about 156); tests 227 new plus 10 changed. Far under the 750 / 600 caps.

Counts:
- `npm test` before: 231 files, 5520 passed. After: 232 files, 5558 passed.
- `npx vitest run recipes` before: 65 files, 1620 passed. After: 66 files, 1658 passed.
- `npm run typecheck`: exit 0 (tail shows no errors).
- `tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json`: all seven exit 0.

What was built:
- R19-ARGS-OLD: legs sdk, mcp, ref, file, raw, control; prints `OLD R19-ARGS-OLD leg=… code=… hint=… forwarded=…` (form 20). Pass: every args leg `VERSION`, `hint` = message `===` the daemon's `ARGS_RELOAD_HINT` (MCP: text contains it), raw leg `forwarded=no`; the control (no-args SDK call `ok`, no hint) also needs its raw twin to answer `ok` with `kind: "function"` (printed as `CHECK … control raw-twin kind=…`). Before the actor, the driver runs the old build's proof; a proof that does not read `consoleMessages=UNKNOWN_METHOD` makes the row `NOT RUN — old build not loadable`.
- R19-VERSION: legs sdk, mcp, raw on `s12-chooser.html?s12=c1` with the file input `#in` as target; prints `VERSIONCH …` (form 27); pass: `VERSION`, hint, `exact` (`message ===` `CHOOSER_RELOAD_HINT`; MCP: text contains it), page `files=0` and `clicks=0`, no path (`rawLeaks` of ROOT, sentinel, file name) in the text. Control `uploadFiles` without chooser `ok`, `files=1`, no hint; then `evaluate "(a) => a" {args: 7}` answers 7 (`LEG … args`).
- Hint texts are imported from `daemon/src/intercept.ts` (the recipes tsconfig allows it; tsc exit 0). A test compares them to the source text and to the sheet's quotes.
- Swap frame: `Invoke-R19Swapped` gets an optional `$RowId`. With it, a reload failure whose record line is `reload-extension.ps1 exit 2 (attempt 2)` (the reload block's own line, only lines after this reload) prints `ROW <id> NOT RUN — old build not loadable (reload exit 2 twice)`, skips the rows, and resets the guard-STOP count the reload block's `Fail-S16` added. Any other failure (exit 3, no row id, an older give-up line) still throws. The `finally` (restore-head, segment save, reload, reopen, re-proof, `old-build-left-loaded`) is unchanged and tested to still run.
- DIALOGS at R19-RESTORE for liveD19 and liveE19 (lib condition list; `Write-R19Dialogs` was already generic).
- N-4: `swapFailText` passes only text starting `swap: ` (the swap's own wording; tests show none holds a path separator); any other error (an fs error with a path) prints `error`.
- Tests that prove it (pure): the mutants raw forwarded=yes, an SDK leg non-VERSION, chooser leg files=1 / clicks=1, missing hint, message not `===`, non-VERSION, a path in the text, control not ok, the generic `RELOAD_HINT` as hint. PowerShell with stubs: 9 mutants of the frame and the drivers, each turning its named check red. Static test: every liveD19 / liveE19 block registered, entry lines pinned, no `no driver built`, ASCII, parses, STOP words are the sheet's.

Existing tests changed (documented moves, no count dropped): `s12-r19.test.ts` (harness stubs `Invoke-R19OldArgs` / `Invoke-R19OldVersion` / `Add-R19RootOnce` so the frame tests keep running through the entry's registration lines; the N-4 regex pin), `s12-r19-c.test.ts` and `s12-helpers-e.test.ts` (DIALOGS condition now five slices), `s12-r19-static.test.ts` (file lists include `s12-r19-de.ps1`).

## 3. Verifier verdict
Not run (Opus verifier next).

## 4. Deviations
- None from the brief's scope. Two design points go beyond the sheet's words, see Proposed decisions 1 and 2.

## 5. Proposed decisions
### 2026-10-29 · liveE19 adds ROOT to the Upload folders from inside the R19-VERSION block
**Decided:** `r19-old-version` runs `Add-R19RootOnce` (the Run 17 `root-add` block, once) on the current build before the swap; R19-RESTORE restores. The slice's order list is not changed. **Why:** the control `uploadFiles` without `chooser` must be `ok` with `files=1`, which needs `<ROOT>` among the Upload folders; liveE19's order has no `root-add` (B and C do). Editing the order would break the pinned `orderE` tests. **Instead of:** a `root-add` entry in `$R19Order`. **Revisit if:** the sheet adds `root-add` to liveE19. **By:** Claude (proposed)

### 2026-10-29 · A give-up of the old build's reload is read from the record line, and clears the guard count
**Decided:** NOT RUN is detected by the line `reload-extension.ps1 exit 2 (attempt 2)` that the reload block prints, and the `Fail-S16` count is reset for that one case. **Why:** the block throws a bare `stop` and its `STOP:` line would otherwise make the block fail as a STOP. **Instead of:** copying the reload loop into the frame. **Revisit if:** the reload block's wording changes (the test pins it to the real frame, not to the block). **By:** Claude (proposed)

### Smaller design-local choices
- The MCP legs cannot compare with `===` (the tool wraps the message), so `hint`/`exact` use `text.includes`.
- The raw leg's `forwarded` is `yes` for any `ok` answer, not only for `kind: "function"` (a silent forward returning undefined is also forwarded).
- The control prints one `OLD … leg=control` line; its raw twin is a `CHECK … control raw-twin kind=` line.
- Both rows use `s12-chooser.html` pages (`none` for ARGS-OLD, `c1` for VERSION); no banner, idle or state steps.

## 6. Findings
- Sheet gap: liveE19's bullet and R19-VERSION say nothing about Upload folders, yet the control needs `<ROOT>` added (Proposed decision 1). The sheet should say "ROOT added" for liveE19.
- STOP `outside-file-reached-page` ("where applicable") has no application here: both rows use only `<ROOT>` files and refuse before anything is read. None is thrown.
- The no-args raw twin and the exact `forwarded` words are my reading of the sheet's parenthetical; wording could be stated in §4.27.
- Bash heredocs lost the backslashes of a regex while editing (known, memory); caught by the new frame test.
- Not provable offline: the live behaviour of the MCP error text format for VERSION (the `isError` text begins with the code per `mcpCodeOf`; contains-check is used for the hint).

## 7. Handoff
Verifier: re-run the counts above; check `Invoke-R19Swapped`'s new try/catch against §4.27 ("exit 2 twice"), that D's proof gating matches "R19-0's consoleMessages line is not expected here", and that adding `Add-R19RootOnce` is acceptable. No PIDs, no logs, nothing left running. No `docs/e2e-test-plan.md` or `decisions.md` edits were made.
