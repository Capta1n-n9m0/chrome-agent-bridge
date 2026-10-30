# S5-liveC20b fixer 4 (M1 of verifier 4)

## Finding
M1: `Set-S13DockSide` registered a DevTools window made by an Undock press (Register-S13Own) by one title check after a fixed 1500 ms sleep. A late title meant the window was never registered, Close-S13DevTools skipped it, and the row stopped on devtools-left-open.

## Change (recipes/s13-devt.ps1)
- New `Register-S13NewDevtWindows($Before, $Port, $Side, $Sleep)` replaces the sleep and the single scan in `Set-S13DockSide`.
- Side `undock`: `Invoke-S13Poll` (300 ms step, 5000 ms bound) scans `Get-S13Titles` for windows not in the before-list and titled for the fixture port (`Test-S13DevtTitle`). Each is registered once (a local handle set) and the poll ends at the first registration. The bound is 17 sleeps (PowerShell rounds 5000/300 up), about 5.1 s.
- Any other side: one 1500 ms settle and one scan, as before.
- Unchanged: the reader, #413's rule, the dock-own-window drop loop, the read-back, done/changed/now, and the Press-S13DockKind diff from fixer 3.

## Tests (recipes/test/s13-devt-ps.test.ts, inside the existing S13 devt `it`, so the test count is unchanged)
- regLate: title on the third poll -> registered (77, 3 scans, 2 sleeps, own).
- regNever: no title -> nothing registered, 17 sleeps, poll ends at its bound.
- regOther: side `right` -> one settle sleep, one scan, no poll.
- Stub: `$global:LateAt` / `$global:LateCalls` make window 77 appear from the Nth `Get-S13Titles` call.

## Checks
- npm test: Test Files 251 passed (251), Tests 6030 passed (6030).
- npm run typecheck: exit 0.
- recipes tsconfig, .fe, .s6, .s9, .s10, .s11, .s11b, .s13: all exit 0.
- npm run build: exit 0.
- node scripts/doc-check.mjs: exit 0.
- s13-r20-c.ps1 -Block plan: exit 0.
- ASCII: the file-is-ASCII test in the same suite passes.

## Not run
Nothing against Chrome, a port or the daemon. Diff is about 14 new lines in the .ps1 and 6 in the test.
