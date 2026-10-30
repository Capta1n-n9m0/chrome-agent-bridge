# S5-liveC20b verifier 5: fixer 4's fix of M1 (the late-titled undock window)

Model Opus 5.5, effort medium. I read the files and ran the checks. I edited nothing in the repo, started no agents, made no commits, and ran nothing against Chrome, port 8081 or the daemon. Scope: M1 of `S5-liveC20b-verifier4.md` as fixed in `S5-liveC20b-fixer4.md`, and a check that fixer 3's hunks are unchanged. Diff read: `git diff -- recipes` since `dfbac13`.

## 1. Verdict
**PASS-with-notes.** `Register-S13NewDevtWindows` polls for the new window only after an undock press, and only up to its bound. It registers each new window titled for the fixture port once. It registers the same kind of window the old single scan registered. The path for any other side is unchanged. The new tests fail without the poll. One minor note (N1): the helper's return value now leaks into `Set-S13DockSide`'s output. That is harmless for every caller today.

## 2. Checks run
| Check | Result |
|---|---|
| `npm test` | `Test Files 251 passed (251)`, `Tests 6030 passed (6030)` (matches the fixer) |
| `npm run typecheck` | exit 0 |
| 8 recipe tsconfigs (`tsconfig.json`, `.fe`, `.s6`, `.s9`, `.s10`, `.s11`, `.s11b`, `.s13`) | all 8 exit 0 |
| `npm run build` | exit 0, `built extension → dist/` |
| `node scripts/doc-check.mjs` | exit 0 |
| `s13-r20-c.ps1 -Block plan` | exit 0; `PLAN liveC20: preflight servers files window reload console r20-0c flag r20-devt-undock r20-devt-early r20-up-devt r20-keep-4 r20-sweep-held r20-restore r20-logs` |
| `file recipes/s13-devt.ps1` | `ASCII text, with very long lines (398), with CRLF line terminators` |
| Current tests against a scratch copy (scratchpad `m1/recipes`, `S13_DEVT_REPO`) in which the poll is replaced by the old `& $Sleep 1500; & $s13scan` for every side | `Tests 1 failed \| 23 passed (24)`: `regLate` expected `77 calls=3 sleeps=2 own=True`, received ` calls=1 sleeps=1 own=False` |

## 3. Item by item
1. **The poll (`recipes/s13-devt.ps1:199-205`).**
   - Side `undock`: `Invoke-S13Poll` runs with a 300 ms step and a 5000 ms bound. `[int](5000/300)` = 17, so it makes at most 18 probes and 17 sleeps, about 5.1 s. `regNever` pins this: `n=0 sleeps=17 own=False`.
   - Each probe scans `Get-S13Titles`. It keeps a window only when it is not in `$Before`, not already registered, and passes `Test-S13DevtTitle $title $Port`. These are the old loop's two conditions plus the once-only hashtable.
   - The poll stops at the first probe that registers anything. Every match in that one scan is registered, as in the old scan.
   - Any other side: `& $Sleep 1500; & $s13scan`. The default `$Sleep` is `Start-Sleep -Milliseconds`, so this is the old code. `regOther` pins it with `calls=1 sleeps=1`. If this side used the poll instead, the result would be `sleeps=0`, so the test would fail.
   - Scoping: the probe calls `$s13scan` through dynamic scope. `Invoke-S13Poll`'s own variables (`$Probe`, `$MaxMs`, `$StepMs`, `$Sleep`, `$s13sw`, `$s13n`, `$s13t`) do not hide `$Before`, `$Port` or `$s13reg`. The scan's `$s13t` is local to its own loop. `regLate` shows that this works.
2. **No new window class.** The helper registers only a window that appeared after the press, is not in the before-list, and is titled for the fixture port. The old scan registered the same kind of window. The difference is time: a window the human opened could now be taken for up to about 5.1 s after the undock press, instead of at the 1.5 s mark. The poll ends at the first hit, and only the undock press triggers it. No other caller exists (grep: `:218` only).
3. **Fixer 3's hunks are unchanged.** Here is what I compared with verifier 4's description:
   - `Test-S13Invokable`, `Invoke-S13Toggle` and `Press-S13DockKind` (`:189-196`): one Group with Invoke, a strict Toggle when no Group exists and the Button reads Off, and otherwise `False`.
   - The N1 guard in `Invoke-S13OpenTries` (`:153`), with `$XHwnd` passed at `:181` and `:215`.
   - The press call at `:217`.
   - The test hunks for `pressGroup`…`setOwnNoEsc`, `setLeft`, `setPressFail*` and `trySet` match what verifier 4 checked.
   - Fixer 4's only additions are the helper (`:197-205`), the call at `:218` in place of the sleep and the scan, the `LateAt`/`LateCalls` stub, and three test rows.

## 4. Findings
- **N1, minor: the helper's return leaks into `Set-S13DockSide`'s output.**
  - Where: `:218` calls `Register-S13NewDevtWindows $s13before $Port $Side` without capturing its result, and the helper ends in `@($s13reg.Keys)`.
  - Effect: when a window is registered, `Set-S13DockSide` returns the array `('<hwnd>', {done;changed;now})` instead of the documented object. I measured this in PowerShell 5.1 with a scratch reproduction: `count=2 type0=String`. Member enumeration still gives `done=True` and `now=undock`, or `False` on a failed read-back.
  - Callers: `Open-S13DevTools` (`:231-232`) reads only `.done` and `.now`. R20-RESTORE (`s13-r20-c-defs.ps1:181`) uses `[void]`. Neither caller is affected, and the test rows hide the leak because they read members too.
  - Suggested fix (one token, not needed for attempt 2): `$null = Register-S13NewDevtWindows ...`.

## 5. Not checked
- Live title timing, and whether 5 s is enough. Nothing was run against Chrome.
- M2 of verifier 4 is out of scope.

## 6. Proposed decisions
None.
