# S5-drivers-C1 fixer, round 1

Model and effort: Sonnet 5.5, medium. Nothing was run against Chrome, a daemon, a port or UIA. Red runs used `S13_DEVT_REPO` pointing at a scratch copy of the old `s13-devt.ps1` outside the tree (no `node_modules` junction, #395, #220).

## Per finding

- **F1 MAJOR: fixed.** New `Register-S13Own` records the owner pid in `$global:S9WinIds` and sets `S11Own`. It is called when `Set-S13DockSide` adopts a new DevTools window, and in `Open-S13DevTools` after `Open-S12DevToolsMenu` when `$global:S12Dev.How -eq 'window'`. The pid comes from a thin wrapper `Get-S13WinPid` (stubbed in the tests). The test's `Test-S9Live` stub now requires an `S9WinIds` entry, as the real one does.
  - Red (old script, new tests): `setUndock` gave `OWN50=False`; the new flow gave `own50=False closed=0 rem=1 done=False`, which is the verifier's `closed=0 remaining=1`. Both fail on the old script and pass on the new one.
  - New tests: undock, close (`closed=1 rem=0`), undock again, then set bottom (`done=True now=bottom`); the pid is recorded after an undock; the `S12Dev` window path records it.
- **F2 MINOR: fixed.** The prune now covers only the scope's own DevTools handles (never X, never other `S11Own` windows), and only when the new wrapper `Test-S13Alive` (`IsWindow`) says the handle is gone. Tests: `setKeepOthers` (a second own window survives), `setDockBack` keeps `OWN1=True`, `setUndockThenDock` drops only 50. Red by construction: the old line removed any `S11Own` key that `Test-S9Live` refused, so `OWN2` would have dropped under the new stub (the stub refuses a handle with no pid record).
- **F3 MINOR: fixed, proposed decision.** `Close-S13DevTools`'s `windows` count is now the wave's own (`S11Own`) windows titled `^DevTools`, plus any window matching `Test-S13DevtTitle` for the fixture port; `remaining` adds the pane. A human's DevTools on another page is never counted. Red: `closeHumanOther` returned `0 1 1` on the old script; now `0 0 0`.
  - **Proposed decision (agent-rules §5 form).** Question: what does `Close-S13DevTools` count as remaining? Choice: the wave's own DevTools windows, any window titled for the fixture port (`127.0.0.1` or `localhost`, port 8081), and the pane. Why: a human's DevTools on another page must not raise a false `devtools-left-open` STOP, while a foreign DevTools window on the fixture port still does (strict). Alternative: count every `^DevTools` window (the old behaviour; spurious STOPs). Reversible: yes (one filter).
- **F4 MINOR: handoff text, restated here (builder report untouched).** R20-RESTORE order: `Open-S13DevTools` (plain, then set) -> `Set-S13DockSide <found side>` -> `Close-S13DevTools` -> `Open-S13DevTools` (plain) -> `Read-S13DockSide` (its word is `DOCK R20-RESTORE`; `Set-S13DockSide`'s `now` is not the read-back) -> `Close-S13DevTools`.
- **F5 MINOR: fixed.** `setDockBack` now asserts `log("setDockBack")` does not match `/esc50/`. Red by construction: the mutant sends Escape into `$Menu.hwnd` (50), which logs `esc50` in that case, and the assertion rejects it. The classifier was not asked; no mutant was run.
- **F6 NIT: fixed.** The header now says it "prints no line of its own" and names the Run 19 functions' own fixed lines.
- **F7 NIT: text only.** C2 must give each leg's tab a marker unique among open tabs (for example `s12=con&leg=u1`). Otherwise the target read sees two matches and says `unread` (RECORD). No code change.

## Gates (after the fixes)
- `npm test`: 249 files, 5951 passed (was 5950 / 249; +1 test). `npm run typecheck` 0. All eight `recipes/tsconfig*.json` exit 0. `npm run build` 0. `node scripts/doc-check.mjs` 0.
- `git status --short`: only the slice's files and reports. Slice size: 218 + 249 = 467 lines.
- Left over: none (scratch copy is in the session scratchpad only).
