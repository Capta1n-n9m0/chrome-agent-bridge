# S5-liveC20b verifier 1 (fix round 1 of 3, decision #418)

Model and effort: Opus, medium. Read and ran only; nothing run against Chrome, port 8081 or the daemon; no
`-Block dockdiag`/`liveC20`/`teardown`. Nothing edited but this report; nothing committed. The untracked liveB20
files (#417) were not touched.

## 1. Verdict
**PASS-with-notes.** The three tasks of #418 are built as asked. No CRITICAL or MAJOR finding. Five MINOR findings and
four NITs. Three of the MINOR findings (F1–F3) are about how well the one live diagnostic separates the causes and what
private text its evidence file can hold. None changes a verdict, gate, pass rule or expected text. The live runner must
apply §8 below before it keeps any evidence.

## 2. Outputs (checks run by me, main tree with the fixer's diff)
| Check | Result |
|---|---|
| `npm test` | `Test Files 251 passed (251)`, `Tests 6026 passed (6026)`, exit 0. Before: 6016 / 251, so +10, matching the fixer. |
| `npm run typecheck` | exit 0 |
| `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b,.s13}.json` | all eight exit 0 |
| `npm run build` | exit 0 |
| `node scripts/doc-check.mjs` | exit 0. Two listed items, both outside this lane and not touched by the diff: `docs/plans/next-session-prompt.md:15` (the one named in the brief) and `CLAUDE.md:114 5596 passed` (an old stated test count). |
| `powershell … recipes/s13-r20-c.ps1 -Block plan` | exit 0; `PLAN liveC20: preflight servers files window reload console r20-0c flag r20-devt-undock r20-devt-early r20-up-devt r20-keep-4 r20-sweep-held r20-restore r20-logs` |

**The new tests fail without the change.** Each revert ran in a scratch copy of `recipes/*.ps1`, using the tests' own
`S13_R20_REPO` / `S13_DEVT_REPO` override. The main tree was not touched.
- F2 reverted (HEAD's two unchecked `finally { [void](Close-S13DevTools …) }`, with the dock-read call kept): `1 failed | 36 passed (37)`.
  The failing test is "#418 F2: a close in R20-RESTORE that leaves DevTools open …".
- Both `Write-R20CDockRead` call sites and the `dockdiag` registration removed: `2 failed | 35 passed`. The failing
  tests are "#418 F3: one dock-read CHECK line …" and "#418: -Block dockdiag has its own order …".
- In `s13-devt.ps1`, the `pane` field write and the item-count write removed: `1 failed | 20 passed (21)`, with `expected '0 n/a 1 yes 0 u0l0b0r0 0 0' to be '0 yes 1 yes 4 u1l1b1r1 4 1'`.
- `dockReadLine` / `dock-read` do not exist at HEAD, so those four TS tests fail on the import alone.

## 3. What I checked and found sound
- **Task 1 (F3).** `Read-S13DockSide` (`s13-devt.ps1:147-160`) resets `$global:S13DockDiag` and records windows, pane,
  the Customize count, invoked, the items, the kinds and the pressed counts. Its return value and key log did not change
  (test `readDockedLog` still `inv:customize,esc1`). Both call sites reset the diagnostic before the read
  (`s13-r20-c-defs.ps1:77`, `:183`). `Write-R20CDockRead` (`:67-70`) passes every field to `dockReadLine`
  (`s13-r20-c.ts:229-236`), which whitelists each value: 1–3 digits, `yes|no|n/a`, or `u\d l\d b\d r\d`. Anything else
  prints `n/a`, so no text can reach the record. The line is `CHECK …`, never `ROW`, and `aggregateRows20` counts
  `ROW R20-…` only (tested), so `CHECK rows20` stays 8. No gate reads the line.
- **Task 2 (F2).** `Close-R20CChecked` (`:177`) treats `remaining > 0` or a thrown close as left open. After the change's
  close, the STOP comes before the second open. After the read-back close, the dock-read line and the DOCK node call are
  written first, then the STOP. #416's path (`--found unread --changed no`) and the restore order are unchanged, and the
  existing restore tests pass unmodified.
- **The blocks dockdiag uses.** None needs `files`, `reload` or `console`, and none changes the safety state:
  - `preflight` (`s13-r20.ps1:133-142`): clean tree, dist files, Chrome running, python, port 8081 free, 9234 free or
    the daemon, the log mark, `Assert-R19CaptureFree 'dockdiag'`.
  - `servers` (`:143-149`): the wave's own `http.server` on 8081.
  - `window` (Run 17's, `s11b-r17.ps1:422-427`): `New-S16Window $FixtureHuman`, then a read-only pin check with
    `S9PinUiaOnly`.
  - None sets `S16Changed`. `Get-R20CX` is `$global:W`, which `window` sets.
- **Teardown after dockdiag.** Run 17's `teardown` (`s11b-r17.ps1:862-875`) does everything needed:
  - `S16Changed` is false, so teardown is not refused.
  - `Close-S16Windows` skips `D`/`E` (unset) and runs `Close-S11All`, which closes X and any DevTools window
    `Register-S13Own` adopted.
  - `s11 clean` is idempotent (`s11.ts:440-447`).
  - `Stop-S16All` ends the 8081 server, and `Save-S16` with `S16Gone` deletes `r20-globals.clixml`.
- **The record file.** A dockdiag run writes `S13-live-record-dockdiag.txt` (`Get-R19RecordName`, `s13-r20.ps1:19`) in
  the steps dir. The prologue blocks go to the framing file (`Set-R19Raw`), so the record holds only the `dockdiag`
  block's own lines: `CHECK devtools-menu …`, `CHECK devtools-ui …`, `KEY F12 pressed into window <h>`,
  `CHECK dockdiag remaining=<n>`, or a STOP/RETURN. These are handles and fixed words.
- **The guards do not misfire:**
  - `Assert-R17TreeClean` reads tracked files only and excludes the steps dir, so the uncommitted ledger and the #417
    files pass. The recipes diff must be committed first, which is intended.
  - The record guard refuses a second dockdiag run without `-Att 2`, which is correct.
  - liveC20 attempt 2 writes `…-liveC20-att2.txt`, so it does not collide with the dockdiag record.
  - The globals guard refuses liveC20 until teardown has run after dockdiag, which is correct.

## 4. Deviations (the fixer's, as I judge them)
- X shows `s11-upload.html?s11=human` (the `window` block's page), not `e2e-playground.html`. This is acceptable: it is
  an 8081 fixture, and the slice's own rows use the same X.
- `Open-S13DevTools` opens DevTools through Run 19's opener, which invokes Chrome's app-menu button (`Chrome` → More
  tools → Developer tools) by UIA patterns. That happens outside `Get-S13DockDiag`, so the instrument's own "at most one
  button" holds. It is the same opener liveC20 already uses under the DevTools grant, but the runner's brief should
  state it so the rule is not read as broken.
- Partial test-first on the PS side (fixer §3). Recipes are a low-risk lane, but this is noted.

## 5. Proposed decisions
None from me. One open choice is for the session agent: whether `S13-live-record-dockdiag.txt` is committed as the
diagnostic's record. It holds handles and fixed words only.

## 6. Findings

**F1, MINOR. The Customize button is searched once, about 3 s after the open, so a late DevTools accessibility tree
looks like "button not found"** (`s13-devt.ps1:244-246`; `s13-r20-c-defs.ps1:203`).
- **Evidence.** Run 19's opener (`s12-win-b.ps1:74-80`) re-finds menu items every 200 ms for up to 3000 ms because "the
  menu draws late". `Get-S13DockDiag` takes one `Get-S13DiagAll` snapshot after a 1.5 s sleep.
- **Why it matters.** Chrome builds a new WebContents' UIA tree asynchronously, so a sparse DevTools tree reads as
  `current-name-matches=0 candidates=0 … nothing invoked`. The `elements=` count and the `KEY before` lines only hint at
  this. The run is planned as ONCE.
- **Fix.** Poll for the exact-name button every 300 ms for up to 6 s. Write each attempt's `elements=` and match count
  to the file, then fall back to the keyword search. Without that fix, the runner should treat `elements=` under a few
  hundred with `current-name-matches=0` as "not discriminating: tree not ready", not as "button not found".

**F2, MINOR. The evidence file can carry user text from Chrome's own UI in X; the skip list does not cover the real
carriers** (`s13-devt.ps1:195-197, 207-216`).
- **Keyword lines.** X's UIA tree includes the bookmark bar, pinned extension buttons, the avatar button, tab-group
  headers and any infobar. The keyword filter is a case-insensitive substring match, so:
  - `dock` matches "Docker…", "Docking…";
  - `side` matches "Inside", "Outside", "Sidebar", "Seaside";
  - `menu`, `control` and `customize` match ordinary bookmark or folder names;
  - `devtools` matches extension names such as "Redux DevTools" or "Vue.js devtools".

  On a developer's bookmark bar the chance of at least one such hit is moderate, not negligible.
- **The help field.** It prints `HelpText` (60 chars). For a Chrome views bookmark button, the accessible
  description/tooltip can carry the bookmark's URL. Not measured on Chrome 156; plausible.
- **The skip test.** `Test-S13DiagSkip` checks Name and AutomationId only. Chrome's avatar button is
  ClassName `AvatarToolbarButton` with an id like `view_<n>` and the profile's display name as its Name, so the
  `profile|account|avatar` skip does not catch it. It would print only if the profile name hits a keyword, which is
  low-probability. The unit test (`diagSkip`, `'x','AvatarButton'`) uses an id Chrome does not use.
- **Pane names.** An element named after the window title (which can carry the profile name, recipes/CLAUDE.md "A window
  title can carry the Chrome profile's display name") is skipped only when its type is Window/TitleBar. A `Pane` with
  that name is not skipped. It prints only if a keyword hits, which is low-probability.
- **What is fine.** Document, TabItem and Window elements are skipped, and Value patterns and URLs are never read
  directly. The DevTools document's own descendants (DevTools strings, the fixture's DOM and console) are not private.
- **Fix.** Also skip by ClassName (`Avatar|Profile|Bookmark|ToolbarActionView|ExtensionsToolbar|TabHoverCard|Omnibox|LocationBar`),
  and drop `HelpText` for elements outside the Document rectangles. Until then, §8 applies.

**F3, MINOR. The NEWWIN dump reads any new top-level window of the browser process, including a human's** (`s13-devt.ps1:226-228, 262-266`).
- **Soundness of the detection.** All Chrome windows share the browser PID, and an HWND element's runtime id
  (`42.<hwnd>`) is stable, so finding new windows by PID and runtime id works.
- **Why a human's window gets in.** "Before" is taken before the full-tree read of X, which can take seconds, and
  "after" comes at 2.5 s or later. Any small Chrome popup appearing in that span is dumped if it has 150 descendants or
  fewer. Examples: a tab hover card, whose labels are a tab title and domain; the status bubble, which shows a URL; a
  menu the human opened in another window.
- **The rule it breaks.** This is reading, not input, but it touches a window the wave did not open, against the brief.
- **Likely unneeded.** Run 19's opener finds Chrome's native menu items as descendants of X (`Find-S12UiaByName $Hwnd`),
  and DevTools' main menu is a soft (in-document) menu, so the MENU dump of X probably suffices.
- **Fix.** Dump only new windows whose Win32 owner is X or whose root control type is Menu, and otherwise count them
  only. Until then, §8 applies.

**F4, MINOR. The descriptor cannot show a pressed state exposed only as ARIA properties or a legacy MSAA state**
(`s13-devt.ps1:209-215`).
- **What it covers.** It records Invoke, Toggle, SelectionItem and ExpandCollapse. That separates "pattern missing" from
  "pattern present but none On", which is enough to name the cause.
- **What it misses.** If the dock buttons carry their state only in `AriaProperties` (`pressed=true` / `checked=true`)
  or `LegacyIAccessible.State`, the evidence will show "no pattern" but not the readable alternative, so the corrected
  reader could not be written from it.
- **Fix.** Add `AriaProperties`, filtered to `pressed|checked|selected` keys, and `LegacyIAccessible.State` in hex to
  the descriptor of lines whose name passes `ConvertTo-S13DockKind` or `Dock side`. Both are fixed-vocabulary values.

**F5, MINOR. A STOP reason can hide a pane left open in R20-RESTORE** (`s13-r20-c-defs.ps1:181, 186-187`).
- If the change throws while its close also leaves DevTools open, the thrown error wins (`throw-after-state`) and
  `devtools-left-open` is never named.
- If the read-back both differs and leaves DevTools open, `not-restored` wins.
- Either way the wave STOPs and teardown closes X. But the RETURN line does not say a pane was left, which §8 of the
  sheet treats as its own STOP.
- **Fix (optional).** `Say9 'CHECK R20-RESTORE devtools-left-open=yes'` before rethrowing or before the `not-restored`
  STOP when `$r20left` is set.

**N1, NIT.** `Get-S13DiagCounts` (`s13-devt.ps1:232-234`) hard-codes `windows=0` in the COUNTS lines, and dockdiag never
counts titled DevTools windows. If DevTools opens undocked, the file shows `pane=no` and "nothing invoked" but not the
window count. Add `titled=<n>` (from `Get-S13Titles`/`Test-S13DevtTitle`, count only) to the first DOCKDIAG line.

**N2, NIT.** The Escape in the `finally` (`:269`) is sent whenever the invoke answered yes. If the menu did not open or
had already closed, an Escape into a focused DevTools toggles its Console drawer, a DevTools preference. It is not a
dock side and not safety state. The existing `Close-S13Customize` has the same trait.

**N3, NIT.** `Add-S13DiagLine` appends (`:199`). A second dockdiag run into the same `S11_OUT` mixes two runs in one
file, and no guard covers it. Use a fresh `S11_OUT` per run, as the entry script's comment already says for attempts.

**N4, NIT.** `-Block plan` prints only the liveC20 order. Printing `PLAN dockdiag: preflight servers window dockdiag`
too would let the runner confirm the order without running anything.

## 7. Will the instrument tell the three causes apart?
Mostly yes, given F1:
- **Button not found:** `current-name-matches` together with `used=keyword candidates=` and the `KEY before` lines
  (names with customize, control, menu or more options) show what the button is called, unless the tree is not ready
  (F1).
- **Items not matched:** `COUNTS … items=0 kinds=u0l0b0r0` together with the `MENU` and `KEY after` lines (dock,
  undock, side) show the real item names.
- **Pressed state unreadable:** `pressed-readable < items`, plus each item's `Toggle=`/`Sel=` patterns, show it (F4
  limits what can be done about it).

The two COUNTS reads at about 700 ms and 2500 ms, with the real elapsed time in the tag, also separate a slow menu from
a missing one. The wait timings are sound for a soft menu. A native menu would also appear under X (Run 19's opener
finds its items there).

## 8. What the live runner must drop from the evidence
Read `dockdiag-evidence.txt` in `S11_OUT` before quoting, copying or committing anything from it. The file itself stays
outside the repo and is never added to a commit.
1. **Keep as is:** every `DOCKDIAG …` header line and every `COUNTS …` line. These are counts and fixed words only.
2. **`KEY`, `MENU` and `NEWWIN` descriptor lines:** keep a line only when its name field is a DevTools or Chrome
   fixed string. Examples: "Customize and control DevTools", "Dock side", "Undock into separate window",
   "Dock to left/bottom/right…", "More options", "More tools", "Close", "Settings", "Side panel", "Search tabs",
   "Chrome", "Extensions", or a fixture text you can find in `test-fixtures/s11-upload.html`. Replace every other
   line with `<type>|<dropped len=N>|…`, keeping only the type and the patterns.
3. **Drop the whole line** for any element whose class field names Chrome's own views:
   `BookmarkButton|BookmarkBar|ToolbarActionView|Extensions|Avatar|Profile|TabHoverCard|Tab$|Omnibox|LocationBar|SidePanel|Download|Infobar|BrowserView`.
4. **Drop the help field** (the last `|` field) of every line not kept under rule 2. It may hold a bookmark URL.
5. **Drop every `NEWWIN` line** unless all of that window's lines are MenuItem/Menu elements whose names pass rule 2.
   Keep the counts line `DOCKDIAG new-top-windows=<n>`.
6. **Search the kept text before it is committed**, for each of the following; any hit drops the line:
   - the profile's display name, read from `chrome://settings` by eye and never printed, or as a placeholder in the
     report;
   - `http`, `www.`, `@`, `C:\`, `\Users\`, `.com`, `.org`, `.net`, `.io`;
   - the user's name and the account e-mail.
7. **Report what was dropped** as counts per tag (for example `KEY before dropped=3`), never the dropped text.

## 9. Handoff
- **Before the live run:** commit the seven recipes/test files. The clean-tree guard requires it; the steps-dir files
  are exempt.
- **The run:** `S11_OUT=<fresh dir> powershell.exe -NoProfile -ExecutionPolicy Bypass -File recipes/s13-r20-c.ps1 -Block dockdiag`,
  then `-Block teardown`.
- **Expected record line:** `CHECK dockdiag remaining=0`.
- **Evidence:** `<S11_OUT>\dockdiag-evidence.txt`, read under §8.
- **Recommended before the one live shot (each is small and recipe-only):** F1 (polling) and F4 (ARIA state). They raise
  the chance that the single run yields a corrected reader.
