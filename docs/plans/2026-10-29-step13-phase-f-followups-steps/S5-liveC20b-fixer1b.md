# S5-liveC20b fixer 1b (verifier 1's F1-F5, decision #418)

Model and effort: Sonnet, medium. Nothing run against Chrome, a port or the daemon. Nothing committed. The untracked liveB20 files (#417) were not touched.

## 1. Verdict
DONE. F1-F5 are fixed on top of the earlier fixer's tree; Read-S13DockSide's rule (#413), every ROW verdict and every expected text are unchanged.

## 2. Outputs
Per finding (all in `recipes/s13-devt.ps1` unless noted; find the code by function name, the lines moved):
- **F1.** New `Invoke-S13Poll` (a probe retried every 300 ms, bounded, returns found/tries/ms). In `Get-S13DockDiag` the Customize button is polled up to 6 s (it re-reads the whole tree on each try), and after the invoke the Dock side items are polled up to 3.6 s more when the first COUNTS read shows `items=0`. Reader's `Open-S13Customize` is unchanged (verifier did not ask).
- **F2.** `Test-S13DiagSkip` takes a class and skips Chrome's view classes (BookmarkButton, BookmarkBar, ToolbarActionView, Extensions, Avatar, Profile, TabHoverCard, ^Tab, Omnibox, LocationBar, SidePanel, Download, Infobar, BrowserView); `Get-S13DiagDesc` reads the class first. HelpText is written only when `Test-S13FixedName` matches (fixed DevTools prefixes), else `-`. KEY lines (`Write-S13DiagKeywords`, new `$Rects` argument) and the keyword button search are restricted to the DevTools document: Documents whose Name starts `DevTools`, told apart from the page's Document by that name; if none, every Document rectangle (`key-region=all-docs`). No rectangle, no KEY lines.
- **F3.** The "before" top-window list is re-taken just before the invoke. A new window is read only when `Test-S13PopupMenu` (root type Menu, or class `#32768` / `MenuHost*`); else `NEWWIN skipped type=<T> class=<fixed Chrome class or ->` (`Format-S13NewWinSkip`). No title is ever read.
- **F4.** For elements whose Name passes `Test-S13DiagStateName` (a Dock side kind or the Customize button) the descriptor adds `Leg=<n>(selected|pressed|checked words)` (UIA property 30096), `AriaRole=` (30101, 20 chars) and `AriaProps=` (30102, 80 chars), each through `GetCurrentPropertyValue(LookupById)` in a try; `n/a` when the managed API cannot read it.
- **F5.** `recipes/s13-r20-c-defs.ps1` `Restore-R20CDock`: both `finally` closes now print `CHECK R20-RESTORE devtools-left-open=yes` when the close left DevTools open, before any throw or `not-restored` STOP.

Evidence file line forms now: `DOCKDIAG pane= elements= top-before=`; `DOCKDIAG button-poll try=<n> ms= elements= matches=`; `DOCKDIAG button-poll found= tries= ms=`; `DOCKDIAG key-region=<devtools-doc|all-docs> documents= rects=`; `KEY before|after <desc>` / `KEY <tag> lines=`; `DOCKDIAG current-name-matches= used= candidates= document-rects=`; `DOCKDIAG button <desc>`; `COUNTS at-<ms>ms ...` (x2); `DOCKDIAG items-poll found= tries= at=<ms>ms` (only when the first read had no items); `MENU <desc>`; `NEWWIN skipped type= class=` or `NEWWIN <desc>` (menu windows only); `DOCKDIAG new-top-windows= menu-lines-left=`. A desc is `type|name|id|class|patterns+Leg/Aria|help-or--`.

Tests (assertions added inside existing `it` blocks, so the count does not move): `s13-devt-ps.test.ts` gets the class skip, fixed-name help, state-name, legacy-state words, popup test, NEWWIN skip text and the two poll cases (found on try 3; never: 4 tries); `s13-r20-c-ps.test.ts` gets the F5 CHECK line (present in three STOP paths, absent in the clean restore).
- `npm test`: 251 files, 6026 tests passed (before 6026 / 251, same).
- `npm run typecheck` exit 0; the eight recipe tsconfigs (`.`, `.fe`, `.s6`, `.s9`, `.s10`, `.s11`, `.s11b`, `.s13`) all exit 0; `npm run build` exit 0; `node scripts/doc-check.mjs` exit 0; `-Block plan` exit 0.
- Size: about 55 new lines over the earlier diff (cap 150).

## 3. Deviations
- Tests were added after the code, not before (recipe lane).
- F1's poll of the items is only run when the 700 ms read found none, so a menu that draws on time costs no extra wait.
- The Legacy/Aria reads use the managed `LookupById`, which may not know those ids on this runtime; then the line shows `n/a`. Live-unverified, by design of a one-shot instrument.

## 4. Proposed decisions
None.

## 5. Findings
Unmeasured: whether the DevTools Document is named `DevTools*` on Chrome 156 (the line `key-region=` says which branch ran) and whether the property ids resolve.

## 6. Handoff
Commit the recipes and test files before the live run (clean-tree guard). The verifier's §8 evidence rules still apply to the runner; the `-` help field and class skips shrink what it must drop.
