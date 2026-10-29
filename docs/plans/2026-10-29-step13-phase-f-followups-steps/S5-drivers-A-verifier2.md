# S5-drivers-A verifier, round 2 (liveA20 driver, slice A1)

Model: Claude Opus 5.5, medium effort. Read and run only. No daemon on 9234, no Chrome, no reload, no live run.
Evidence: `S5-drivers-A-verifier2.txt`.

## 1. Verdict: FAIL

Round 1's findings are fixed, apart from 2.5 (see below). The fix itself adds two MAJOR defects, both on R20-0's
FALLBACK and on the `human` leg's click path. A third finding (2.3) is MINOR.

| Exit check | Result |
|---|---|
| `npm test` | 242 files, **5768 passed** (5705 at stage start, +63, none removed; the fixer's count holds) |
| `npm run typecheck`, the eight `recipes/tsconfig*.json`, `npm run build` | all exit 0 |
| Tracked tree after build | only the lane's two tsconfigs and the untracked lane and report files |
| No s12-* or `s13-forms.ts` diff | `git diff --stat` lists only `recipes/tsconfig.s13.json` and `recipes/tsconfig.s6.json` |
| Size | code 601 (171 + 134 + 296), tests 421 |
| Local path or user name in any S5-drivers-A* file or new recipes file | 0 hits in each of 14 files (counts only) |
| New tests fail without the change | 7 of 8 mutants red, run in a scratch worktree with its own `npm ci`. The `@bridge/*` junctions were removed with `cmd /c rmdir` and the worktree was removed after; the main tree's `node_modules` is intact. M8 stays green, see 2.1 |

## 2. Findings

### 2.1 MAJOR (new): the FALLBACK records the disk manifest's `webNavigation` as `no`, a reading never taken
`recipes/s13-r20.ps1:54` reads `-LiteralPath "$PSScriptRoot..extensionmanifest.json"`. The backslashes are lost, so
the path is `<recipes>..extensionmanifest.json`, which does not exist. `Get-Content` raises a non-terminating error,
so the `try` catches nothing. It returns `$null`, `.permissions -contains 'webNavigation'` is false, and `Disk` becomes
`'no'` on every run. I ran the function alone with the console unavailable and it printed `disk=no`, while
`extension/manifest.json` holds `webNavigation`. Live, the FALLBACK would therefore print
`CHECK R20-0 fallback disk-manifest webNavigation=no`, a false record. The error that PowerShell writes to stderr also
carries the full local path, user name included, into whatever stream the wave transcribes.

The test `s13-r20-ps.test.ts:169-171` accepts `disk=(yes|no)`, so it cannot catch this. Mutant M8 (Disk forced to
`'no'`) stays green.

**Fix:** `Join-Path $PSScriptRoot '..\extension\manifest.json'`, written with Edit and not a heredoc (backslashes).
Read it with `-ErrorAction Stop`. Make the test expect exactly `disk=yes`, since the repo manifest has the permission.

### 2.2 MAJOR (new): POP-OTHER `human`, the click path stalls or FAILs a correct build
- **(a) A refused guard drops its own click signal.** `clickGate` (`s13-r20-a.ts:77`) short-circuits on `g !== "fg"`,
  so `sig(...-click<k>)` is never sent for round k. Only rounds k+1 to 3 are signalled (`:112`). The PowerShell step
  list (`s13-r20.ps1:114`, `Invoke-R19StepB` → `Wait-S11Ready`) then waits on `click<k>.ready`. After 120 s it throws
  "no ready signal", where the sheet expects NOT MEASURED. The fixer's report says "the later click signals are still
  given after an unsent one", but the current round's own signal is not. The test covers `clickGate` alone.
  **Fix:** always give round k's signal, with the guard as the ready content (`realIo.signal(name, "skip")`), and
  have `Invoke-R20PopClick` return `unsent` on `skip`. Alternatively, give `click<k>` from `popLeg` when the trigger
  returned `unsent` without sending it. Add a test that the three click signals are given in every case.
- **(b) The time and wait window include the helper's latency.** `prepareRound` stamps `t0` before the trigger
  (`:73-74`). For a click leg the trigger is the whole round trip: the ready poll (20 ms), a UIA `FindAll` over the
  Chrome window's descendants (`Find-S12UiaByName`, `s12-win-b.ps1:21-28`), the foreground checks, the click, then the
  `.pressed` poll (50 ms). `popRound`'s wait (`:86`) ends 2 500 ms after `t0`, and `judgePop` (`:33`) needs a non-null
  `inMs ≤ 1000` on every counted round. A UIA search of about a second turns a correct build's `human` leg into a FAIL:
  `in-ms` grows with the helper's latency, or is null when the grant lands in the 400 ms tail. Nothing measured bounds
  that latency.
  **Fix:** have `Invoke-R20PopClick` write `sent <epoch ms>` stamped right after `Send-S12MouseClick`. For a click leg,
  take `t0` from that stamp and start the 2.5 s wait after the trigger returns. Test it with the stamp injected.

### 2.3 MINOR: `enabled=yes` is printed with no reading when the console cannot evaluate
`s13-r20.ts:120` sets `enabled: o.enabled === "no" ? "no" : "yes"`, and `Invoke-R20Zero` passes `--enabled` only when
read (`s13-r20.ps1:64`). In the FALLBACK, LOADED20 says `enabled=yes` with nothing behind it. The sheet reads the
`chrome://extensions` card for `enabled` in that case. A1 does not read the card, and `loadedLine20` (helpers) allows
only `yes|no`. **Fix:** print `CHECK R20-0 enabled-source=reachability` (the proof's calls reached the extension) when
`--enabled` is absent, or read the card. Otherwise the session agent adds a dated note.

### 2.4 MINOR (2.5 of round 1, kept): a way to put B's tab in W2 does exist
The fixer is right that no SDK, MCP or daemon `newTab` takes a window: `sdk/src/client.ts:368` takes
`{active}`, and the extension calls `chrome.tabs.create({url, active})` with no `windowId`
(`extension/src/handlers/tabs.ts:85-101`). Two routes still exist with code already written:
1. The wave opens W2 with a fixture URL (`Open-S11Window` / `Open-S9Window`, which start `--new-window <url>`), and B
   takes that tab with `client.claim(handle)` (`sdk/src/client.ts:376`, `tabs.claim`), finding the handle by `listTabs`.
2. `chrome.tabs.create` without `windowId` opens in the last-focused window, so B's `newTab` lands in W2 when W2 is in
   front at that moment.

Discrimination is unchanged, so this stays MINOR. A route is available if the session agent wants the sheet's set-up.

## 3. Round 1's items re-checked
- **2.1 POP-OTHER `human`:** fixed apart from 2.2 above. The order is front, guard, reset of every peer's grants,
  then the trigger (`prepareRound`, mutant M1 red). The click is asked only while O reads `fg` (M2 red). Each round's
  new tabs are swept by `closeTab`. A held-by-none popup can be closed: the daemon's lease check passes an unheld tab
  (`daemon/src/leases.ts:41`).
- **2.2 R20-0:** fixed apart from 2.1 above.
  - The expression typed at `s13-r20.ps1:40` holds the sheet's two step (2) expressions byte for byte. It goes
    through the existing `Start-S11bConsoleEval` (signature checked against `s11b-win.ps1:233`; `ExprFile` skips B17)
    and is read only after the call's own `S11B-MARK`, as a whole `R20READ` line (the B17 convention).
  - Under a fake `chrome` the expression prints `yes yes yes`, `no no yes` and `yes yes no` for the three cases.
  - `management.getSelf()` is an acceptable reading of step (3)'s `management.get`. It returns the same
    `ExtensionInfo` for the calling extension and needs no `management` permission. A disabled extension has no
    worker, so from the console that case reads as `unread` rather than `no`. The `--enabled no` path stays tested
    (M7 red).
  - `perm=yes` comes only from the console. The disk read passes `--disk`, never `--perm` (M6 red).
  - A throw in `proof` now prints no LOADED20 line and maps to `throw-after-state` (`s13-r20.ts:109`, `:171`;
    `s13-r20.ps1:69`). It no longer maps to `extension-disabled`.
- **2.3 ARGS-ORDER MCP:** fixed. `mcpOrderLines` derives the orders from the MCP's own JSON text, or prints
  `CHECK … text-not-a-json-object`, then `CHECK … mcp RECORD not-discriminating`. That matches §4.28 l.1966's
  "`KEYORDER … via=mcp` printed as `RECORD not-discriminating`" (M3 red). The five `TABLE` values run on the MCP leg as
  record lines. No fabricated value remains.
- **2.4 path leak:** fixed. 0 hits in every S5-drivers-A* file and every new recipes file.
- **2.6:** `LEG … ref RECORD` is now printed (`s13-r20-a.ts:238`). The dated sheet note is still the session agent's.
- **2.7:** fixed. POP-NONE prints the counts it read (`:179`, `:188`).
- **2.8:** fixed. The git name and the login and home-folder names are counted and never printed (M4 red).
- **2.9 NITs:** unchanged, as the fixer says (`$FoundJson` / `$NowJson` are A2's; `rowVerdict20` ranks RECORD below
  PASS).
- **Output paths (item 6):** the new lines print codes, fixed words, orders, counts and yes/no only. No pattern, URL,
  token or evaluated value is printed. The exception is the stderr path in 2.1, which comes from the defect and not
  from a print.
