# S5-liveC20b verifier 2 (fix round 1 of 3, second pass, decision #418)

Model and effort: Opus, medium. Read and ran only. Nothing ran against Chrome, port 8081 or the daemon, and no live
block ran. The only file written is this report. Nothing was committed. The untracked liveB20 files (#417) were not
touched. Scope: verifier 1's F1–F5 (`S5-liveC20b-verifier1.md`) as fixed by `S5-liveC20b-fixer1b.md`, plus a check that
the second pass broke nothing verifier 1 found sound.

## 1. Verdict
**PASS-with-notes.** F1, F2, F3 and F5 are fixed. F4 is built, but it cannot work on this runtime: I measured that
the three property ids do not resolve in managed UIA, so those fields will always print `n/a`. That is an honest
`n/a`, never a false state, so F4 stays MINOR. There is no CRITICAL or MAJOR finding. Nothing verifier 1 found sound has
regressed.

## 2. Outputs (my own runs, main tree with both fixer passes)
| Check | Result |
|---|---|
| `npm test` | `Test Files 251 passed (251)`, `Tests 6026 passed (6026)`, exit 0. Matches the fixer; the new assertions sit inside existing `it` blocks, so the count is unchanged. |
| `npm run typecheck` | exit 0 |
| `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b,.s13}.json` | all eight exit 0 |
| `npm run build` | exit 0 |
| `node scripts/doc-check.mjs` | exit 0 (one listed item, `docs/plans/next-session-prompt.md:15`, outside this lane) |
| `… recipes/s13-r20-c.ps1 -Block plan` | exit 0, `PLAN liveC20: preflight servers files window reload console r20-0c flag r20-devt-undock r20-devt-early r20-up-devt r20-keep-4 r20-sweep-held r20-restore r20-logs` |

**Each new assertion fails without its change.** I ran each mutation in a scratch copy of `recipes/` through the tests'
own `S13_DEVT_REPO` / `S13_R20_REPO` override. The main tree was not touched. The baseline in the copy was
`58 passed (58)`. Each mutation gave `1 failed | 57 passed (58)`:
- **F5:** both `Say9 'CHECK R20-RESTORE devtools-left-open=yes'` removed.
- **F2 class:** the ClassName clause removed from `Test-S13DiagSkip`.
- **F2 help:** `Test-S13FixedName` returns `$true`.
- **F3:** `Test-S13PopupMenu` returns `$true`.
- **F1:** the poll limited to one try.
- **F4 format:** the `pressed` bit word removed.

## 3. F1–F5: fixed, partly or not
**F1 (Customize button looked for once): FIXED.**
- `s13-devt.ps1:206-209` adds `Invoke-S13Poll`, which retries every 300 ms.
- `:266-268`: the first try uses the read taken 1.5 s after the open. Every later try re-reads X's whole tree and
  writes `DOCKDIAG button-poll try= ms= elements= matches=`.
- A growing `elements=` means the tree was late. A stable count with `matches=0` means the button has another name.
  This separates the two causes.
- `:288-291`: the items are polled for up to 3.6 s more, but only when the 700 ms read found none.
- The keyword fallback still runs after the poll, on the last tree (`:276-278`).
- See N1 on the limit: it counts tries, not time.

**F2 (user text from Chrome's UI in the evidence): FIXED, with a residual that §5 must still handle.**
- `:196`: `Test-S13DiagSkip` also skips by ClassName, using the list verifier 1 proposed. `Get-S13DiagDesc` reads the
  class first (`:224-225`).
- `:198`, `:237`: the help field is written only for fixed DevTools names, else `-`.
- `:270-274`, `:251-254`: KEY lines and the keyword candidate search are limited to the DevTools Document's rectangle
  (`devtools-doc`). Without one they fall back to every Document's rectangle (`all-docs`, so the fixture page, which
  is not private). With no rectangle they produce no KEY lines and no candidates, and the line `rects=0` says so.
- The bookmark bar, the toolbar, the avatar button and the omnibox are now out of the KEY lines by position as well
  as by class. This is better than asked.
- Residual (N2): text that belongs to this installation can still appear inside the DevTools document itself.

**F3 (NEWWIN could read a human's window): FIXED.**
- `:283`: the "before" list of top-level windows is re-taken just before the invoke, so the span is now only the
  ~0.7–4.3 s after it.
- `:300-303`: a new window's tree is read only when its root is a Menu or its class is `#32768` / `MenuHost*`.
  Otherwise the line is `NEWWIN skipped type=<ControlType> class=<fixed Chrome class or ->` (`:204`), and no title is
  ever read.
- Residual (N4): a Menu that a human opens in another Chrome window during those few seconds would still be read.

**F4 (pressed state held only in ARIA or MSAA): PARTLY. Built, but it cannot read anything on this runtime (MINOR).**
- **The code.** `:231-235` reads `GetCurrentPropertyValue([AutomationProperty]::LookupById(30096|30101|30102))` inside
  a try. It reads only for elements whose name passes `Test-S13DiagStateName` (a Dock side kind or the Customize
  button). `Format-S13DiagLegacy` (`:201`) maps the MSAA state bits correctly: 0x2 selected, 0x8 pressed,
  0x10 checked.
- **The ids are right:** UIA_LegacyIAccessibleStatePropertyId is 30096, AriaRole 30101, AriaProperties 30102.
- **They are unknown to managed UIA.** My read-only check on PowerShell 5.1 (CLR 4.0.30319.42000), after
  `Add-Type -AssemblyName UIAutomationClient` and once `AutomationElement::NameProperty` had been touched:
  - `LookupById(30005)` gives `AutomationElementIdentifiers.NameProperty`;
  - `LookupById(30096)`, `(30101)` and `(30102)` each give **null**;
  - managed UIA knows 54 ids in 30000–30200, and none in 30085–30103;
  - no `LegacyIAccessiblePattern` type exists, and `AutomationElement` has no Aria field;
  - `GetCurrentPropertyValue($null)` throws `ArgumentNullException`.
- **The result.** The `catch` leaves `n/a`, so every line will print `Leg=n/a,AriaRole=n/a,AriaProps=n/a`.
- **Mitigation.** Chrome maps `aria-pressed` to TogglePattern and checked/selected states to Toggle/SelectionItem, and
  the descriptor already records Toggle, Sel, Exp and Invoke. In most cases the evidence will still say whether the
  state can be read by a pattern.
- **Suggested fix (recipes only, optional before the one shot):** read 30096/30101/30102 through the native
  UIAutomationCore COM interface: a small `Add-Type` C# helper with ComImport `IUIAutomation` /
  `IUIAutomationElement`, CLSID `ff48dba4-60ef-4201-aa87-54103eef594e`, using `ElementFromHandle` and then
  `GetCurrentPropertyValue`. If it is not built, the runner reads `Leg=n/a` as "not measured", never as "no state".
- **Test gap.** The tests cover only the formatter, so the always-`n/a` path went unnoticed.

**F5 (a STOP reason hid a pane left open): FIXED.**
- `s13-r20-c-defs.ps1:181` and `:184`: both `finally` closes print `CHECK R20-RESTORE devtools-left-open=yes` before
  any rethrow, before the `devtools-left-open` STOP (`:182`, `:188`) and before the `not-restored` STOP (`:187`).
- The tests cover three STOP paths (`restoreSetThrows`, `restoreLeft2`, `restoreLeft1`) and its absence on the clean
  path (`restoreOk`).
- **A diagnostic only:**
  - it is a `CHECK` line, and `aggregateRows20` counts `ROW R20-…` only;
  - `grep` finds no reader of `CHECK R20-RESTORE devtools-left-open` in `recipes/*.ts|*.ps1` outside the tests (the
    only `CHECK R20-RESTORE` lines are emitted, not parsed, in `s13-r20.ts:154-155`);
  - it changes no verdict, gate or exit code.

## 4. Nothing verifier 1 found sound has regressed
- **The dock-read CHECK line and `dockReadLine`** (`s13-r20-c.ts:229-236`) did not change in this pass. The values are
  still whitelisted, the line is still CHECK and not ROW, and `CHECK rows20` stays 8 (`aggregateRows20` test unchanged
  and passing).
- **The F2 restore STOP** (`Close-R20CChecked`, `:177`) is unchanged. So are #416's NOT MEASURED path
  (`--found unread --changed no`) and the order: change, close, STOP, second open, read-back, close, dock-read line,
  DOCK node, then the STOPs. The existing restore tests pass unmodified.
- **What dockdiag does:**
  - The order is still `preflight servers window dockdiag` (test `DDORDER`). It has no files, reload, console, actor
    or safety change, and it sets no dock side.
  - It invokes at most one button: the exact-name Customize button, or a keyword `customize|more options` Button that
    is now also limited to the DevTools Document's rectangle. That is narrower than before. `test-fixtures/s11-upload.html`
    has no "customize" or "more options" text, so the `all-docs` fallback cannot pick a fixture button.
  - It never invokes Chrome's app menu or a Dock side button (Run 19's opener outside the instrument, as verifier 1 §4
    said).
  - It only reads other top-level windows: their ProcessId and runtime id, and for new ones their ControlType and
    ClassName.
  - It writes only `Join-Path $env:S11_OUT 'dockdiag-evidence.txt'`.
- **Unchanged:** `Read-S13DockSide`'s #413 rule and return value (`readDocked` gives `bottom`, key log
  `inv:customize,esc1`), every ROW verdict, every expected text and every pass rule. The second pass touched only
  diagnostic functions and the restore's CHECK line.

## 5. Findings
- **F4, MINOR (carried over):** see §3. It is inert by measurement. Either add a COM helper or accept it, and document
  `n/a` as "not measured".
- **N1, NIT.** `Invoke-S13Poll` (`s13-devt.ps1:206-209`) stops after `MaxMs/StepMs + 1` tries, whatever the elapsed
  time, but its comment says "up to $MaxMs".
  - Why it matters: if the button has another name (a likely cause), the button poll makes 21 full-tree reads of X,
    each of which can take seconds, so the run may last a minute or more with DevTools open.
  - It does not harm correctness: each `ms=` value is recorded.
  - Fix: stop when `ElapsedMilliseconds -ge MaxMs`, or stop when `elements=` has been stable for 3 tries.
- **N2, NIT (privacy residual, covered by §6).** Inside the DevTools document there can still be text that belongs to
  this installation and is not a fixture string:
  - the names of the user's extensions in Sources → Content scripts, if the last-used panel is Sources;
  - DOM that an extension injected into the fixture page, shown in the Elements panel;
  - console messages from extensions.

  A keyword such as `side`, `menu`, `control` or `devtools` can match any of these. §6 rules 2 and 6 handle it.
- **N3, NIT.** The ClassName skip is unanchored and case-insensitive (`^Tab`, `Profile`, `Download`, `Extensions`), so
  it also drops descriptors of DevTools' own web elements whose HTML class matches, for example `tabbed-pane-header-tab`
  or a Profiler panel class. Only descriptor lines are lost; COUNTS and the dock items are not filtered by it. The
  Customize and dock-button classes are not expected to match.
- **N4, NIT.** F3 residual: a Menu-type popup in another Chrome window that appears in the ~0.7–4.3 s after the invoke
  is still read. This is low probability and covered by §6 rule 5.

## 6. What the live runner must drop from the evidence
This section replaces verifier 1 §8 and stands alone. Read `<S11_OUT>\dockdiag-evidence.txt` before quoting, copying
or committing anything from it. The file stays outside the repo and is never added to a commit.
1. **Keep as is (counts and fixed words only):**
   - every `DOCKDIAG …` line: `pane=`, `button-poll try=…`, `button-poll found=…`, `key-region=…`,
     `current-name-matches=…`, `items-poll …`, `new-top-windows=…`, `no unique …`;
   - every `COUNTS …` line;
   - every `KEY <tag> lines=<n>` line;
   - every `NEWWIN skipped …` and `NEWWIN skipped-large …` line;
   - the record lines `CHECK dockdiag …`, `CHECK dock-read …` and `CHECK R20-RESTORE devtools-left-open=yes`.
2. **Descriptor lines** (`KEY before|after`, `MENU`, `NEWWIN <desc>`, `DOCKDIAG button <desc>`; form
   `type|name|id|class|patterns|help`): keep a line only when its name field is a fixed DevTools or Chrome string or a
   text found in `test-fixtures/s11-upload.html`.
   - Examples of fixed strings: "Customize and control DevTools", "Dock side", "Undock into separate window", "Dock to
     left/bottom/right…", "More options", "More tools", "Settings", "Close", DevTools panel and menu item names.
   - Replace every other line with `<type>|<dropped len=N>|<patterns>`.
   - Drop the id and class fields of a dropped line too.
3. **Drop the whole line** when its class field names Chrome's own views:
   `BookmarkButton|BookmarkBar|ToolbarActionView|Extensions|Avatar|Profile|TabHoverCard|Tab$|Omnibox|LocationBar|SidePanel|Download|Infobar|BrowserView`.
   The instrument should already have skipped these, so a hit means a skip failed: report it.
4. **The help field** (the last field) should be `-` on every non-fixed name. Drop it wherever the name was dropped
   under rule 2.
5. **Drop every `NEWWIN <desc>` line** unless all of that window's lines are Menu or MenuItem elements whose names pass
   rule 2.
6. **Drop any line whose name or id carries any of the following, before anything is committed:**
   - an extension name, a non-fixture DOM text or a console text;
   - the profile's display name, compared by eye and never printed;
   - the user's name or the account e-mail;
   - `http`, `www.`, `@`, `C:\`, `\Users\`, `chrome-extension://`, `.com`, `.org`, `.net`, `.io`.
7. **Read `Leg=n/a`, `AriaRole=n/a` and `AriaProps=n/a` as "not measured"** (managed UIA cannot read those ids; §3
   F4). They mean neither "no state" nor "not pressed".
8. **Report what was dropped** as counts per tag (for example `KEY after dropped=3`), never the dropped text.

## 7. Will one live run tell the three causes apart?
Yes, given rules 7 and N1.
- **Button not found.** The `button-poll` lines separate a late tree (`elements=` grows) from a renamed button (stable
  `elements=`, `matches=0`). The keyword `candidates=` count and the KEY lines inside the DevTools rectangle then show
  the real name, type, id, class and patterns.
- **Items not matched.** `COUNTS … items=0 kinds=u0l0b0r0` and `items-poll found=no` show it, with the MENU and
  `KEY after` names.
- **Pressed state unreadable.** `pressed-readable < items` and each dock item's Toggle, Sel and Exp patterns show it.
  The Legacy and ARIA state will not be there (F4).

This is enough structure to write a corrected reader, unless the state turns out to be held only in ARIA or MSAA. That
case would show as "items found, no Toggle/Sel" with `Leg=n/a`, and the next step would then be F4's COM fix, not a
guess.

## 8. Handoff
- Commit the seven recipes/test files before the live run (the clean-tree guard requires it).
- The run: `S11_OUT=<fresh dir> … recipes/s13-r20-c.ps1 -Block dockdiag`, then `-Block teardown`. The expected
  record line is `CHECK dockdiag remaining=0`.
- Optional before the one shot: F4's COM helper and N1's time limit.
- The scratch copy used for the mutation runs is `%TEMP%\v2mut` (outside the repo).
