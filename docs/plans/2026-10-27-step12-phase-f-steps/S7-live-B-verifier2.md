# S7-live liveB19 fix round 2 - verifier report

Model: Claude Opus 5.5, effort medium. Leaf: read and run only, no edits to the tree, no agents, no commits. Nothing was run
against Chrome, a daemon or a port. Raw output: `S7-live-B-verifier2-evidence.txt` (same folder).

## 1. Verdict

**FAIL**: one MAJOR (F1). The fix is a 3-line restore. The product change itself is right: `recipes/s12-win-b.ps1` follows
the measured path, and every guard is unchanged. But the fixer deleted three existing mutant tests that still work (B18-B20,
the `Send-S12Escape` guards). The report does not mention it. The fixer's "+3 tests" hides a removal of 3 and an addition of 6.

## 2. Outputs

- This report and `S7-live-B-verifier2-evidence.txt`.
- Tree state, before and after (evidence, `== BEFORE` / `== AFTER`): `git status --short` and `git diff --stat` are the
  same (3 files, 104+/20-). The hashes are the same before and after:
  `recipes/s12-win-b.ps1` `7bbdd23a...862ca`, `recipes/test/s12-ps-b.test.ts` `f08f97b3...b33`, and `S7-live.ledger.md`
  `3db38379...884954`. Every mutant and the HEAD copy ran from copies in the scratchpad. The tree's ps1 was never swapped
  (`cmp` of the scratch copy and the tree: identical).
- Counts, re-run from the tree:
  - `npm test`: exit 0, `Test Files 233 passed (233)`, `Tests 5580 passed (5580)`.
  - `npm run typecheck`: exit 0.
  - `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json`: all seven exit 0, with no output.
  - `npm run build`: exit 0, and it leaves the tree as it was.
- Test-count arithmetic: the file had 1 + 6 groups + 21 mutants = 28 tests at HEAD. It now has 1 + 7 + 23 = 31, so +3,
  which matches 5577 to 5580. The 5577 baseline was not re-run; it follows from 5580 - 3. Under that +3: B18, B19 and B20
  were removed, and `item`, B21, B22, B23, B24 and B25 were added.

## 3. Checks

### (1) The code follows the measured path, and nothing else changed

`git diff recipes/s12-win-b.ps1` (evidence, and lines 6-9, 39-57, 65-76 of the file):

- **Step 1** goes through `Find-S12AppMenuButton` (`s12-win-b.ps1:41-46`). It runs a `PropertyCondition` on
  `AutomationElement.ClassNameProperty = 'BrowserAppMenuButton'`, `Descendants` of window X only, and returns the element
  only when `Count -eq 1`. This is the measurer's snippet word for word, except that it uses
  `[Windows.Automation.AutomationElement]::ClassNameProperty` in place of `$S9UIA::ClassNameProperty`. The two are
  equivalent: `$S9UIA = [Windows.Automation.AutomationElement]` at `s9-win.ps1:174`, and the assembly is loaded at
  `s9-win.ps1:56`. The direct type also lets the test stub `$S9UIA`.
- **The press** goes through `Open-S12UiaItem` (`:49-57`). It uses ExpandCollapse when the element offers it, and calls
  Expand only when the state is not `Expanded`; otherwise it uses Invoke. It returns `$false` on a throw. This is the
  snippet word for word. It matches measurer §2 and §6 finding 1: the Button Expand, `More tools` Expand (skipped when
  already Expanded), and `Developer tools*` Invoke.
- **Steps 2 and 3** still use `Find-S12UiaByName` with `'More tools*'` / `'Developer tools*'`, `MenuItem`. That search
  covers X first and then the new windows, which matches "reachable under the browser window's tree" and "a new untitled
  window". `'Developer tools*'` matches `Developer tools Ctrl+Shift+I`.
- **Guards with the same bytes as HEAD** (diff context, unchanged lines):
  - `Assert-S11Own $Hwnd 'DevTools menu'`, the 8081 regex and its Stop9/throw, and the `$global:S12Before` / `S12Dev` line;
  - the CHECK words `devtools-menu step=<name> found=no|yes`, with step names `menu-button`, `more-tools` and
    `developer-tools`;
  - `Send-S12Escape $Hwnd; return $false` after a miss, the 700/1500 ms sleeps, `Test-S12DevToolsUi`, the
    `devtools-ui method=` line, the `S11Own` record, `[bool]$seen`, and `$S12DevMethod = 'uia-menu'`.
  - The `$steps` entry `'BrowserAppMenuButton'` for `menu-button` is now only a label, because that branch does not read
    it. It is harmless.
- **`Invoke-S12UiaElement` is unchanged** (`:31-38`, not in any hunk). Its other caller, `s12-win-c.ps1:102`, is
  untouched, and `git diff` lists no s12-win-c change.
- **ASCII:** `file recipes/s12-win-b.ps1` prints `ASCII text`.
- **PowerShell 5.1 traps:**
  - The new locals are `$root`, `$c`, `$b` and `$p`. Neither new function calls a helper that reads a script-level
    `$C`/`$B`/`$P`/`$Root`, so the case-insensitive dynamic-scope shadow (`recipes/CLAUDE.md`, Step 10 S5) cannot bite.
  - Neither function has an unintended pipeline output: `Expand()` and `Invoke()` return void, and only `return
    $true/$false` or the element is emitted.
  - The test's search group builds a real `PropertyCondition` under PS 5.1 (`COND ... ClassName ... BrowserAppMenuButton`
    passes), so that `New-Object` form works there.

### (2) Callers

- `s12-win-b.ps1:91` (`Invoke-S12DevProbe`, DEVPROBE) calls `[void](Open-S12DevToolsMenu $global:S12ProbeX)`.
- `s12-r19-b.ps1:58` (`New-R19DevSteps`) and `:141` (SWEEP-HELD) call `[void](Open-S12DevToolsMenu $global:R19Xk)`.

The signature `([long]$Hwnd)`, the throw-on-guard behaviour and the boolean return are unchanged. All three callers
discard the return, so none is affected. The repo has no other reference to `Customize and control*` in code (only in
older stage docs).

### (3) Red on HEAD, green on the fix

I used a scratch copy of the tree's test file that reads the ps1 path from an env var (`gen.mjs` in the evidence). It ran
from the scratchpad with `npx vitest run --root <scratch>`.

- **On HEAD's ps1** (`git show HEAD:recipes/s12-win-b.ps1`): `Tests 8 failed | 26 passed (34)` (31 tree tests + 3 restored
  B18-B20).
  - The real-file checks are red in `search`, `item` and `menu`.
  - The mutants B16, B21, B22, B23 and B24 are red (`the mutated text is in the file`).
  - `uia`, `escape`, `timeline` and `probe` stay green, as they should, because the fix does not touch them.
- **On the fix:** `Tests 50 passed (50)`. Every tree test passes, and so do B18-B20 and the 16 verifier mutant runs.

### (4) Mutants (16, verifier-written, applied to scratch copies only)

A mutant is killed when at least one group check turns false (evidence, `VMUT-RESULT`):

| # | Mutant | Result |
|---|---|---|
| V1 | Expanded guard dropped | killed (`item`: already Expanded) |
| V2 | opener presses with the old `Invoke-S12UiaElement` | **survived** (F2) |
| V3 | `Count -gt 0` | killed (`search`: two matches) |
| V4 | button searched in the new windows too | killed (`search`, two checks) |
| V5 | button by name `Chrome` via `Find-S12UiaByName` | killed (`menu`, several) |
| V6 | item throw swallowed as `$true` | killed (`uia`, `item`) |
| V7 | no Escape after a miss | killed (`uia`, `menu`) |
| V8 | step name `menu-button` renamed | killed (`uia`) |
| V9 | `found=yes` names the pattern, not the step | killed (`menu`) |
| V10 | neither pattern gives `$true` | killed (`item`) |
| V11 | Expanded guard inverted | killed (`uia`, `item`) |
| V12 | button condition is `TrueCondition` | killed (`search`) |
| V13 | no 700 ms pause between steps | survived (existing gap, not this round's) |
| V14 | `$S12DevMethod = 'uia'` | survived (existing gap) |
| V15 | `$global:S12Before` not reset per open | survived (existing gap) |
| V16 | `More tools` looked up by the button finder | killed (`uia`, `menu`) |

12 of 16 were killed. Of the four that survived, V2 touches this round's change. V13-V15 cover lines this round did not
change, and they are recorded only as notes (F5). The restored B18-B20 also kill on the fix, which is what makes their
deletion a regression (F1).

### (5) Re-runs: see §2

## 4. Findings

**F1 - MAJOR - three working mutant tests were deleted, and the report does not say so.** The deletion is at
`recipes/test/s12-ps-b.test.ts`, between `:259` (B17) and `:260` (B21). Before the change they sat at HEAD `:211-213`.

- Evidence: `git show HEAD:recipes/test/s12-ps-b.test.ts | grep '^  \["B'` lists `B18 escape: own check removed`, `B19
  escape: foreground not checked` and `B20 escape: foreground before own check`. The tree lists none of them (evidence,
  `== mutant lists`).
- All three still apply and still kill on the fixer's file. In the scratch run they show `✓ mutant B18 ... red`, `✓
  mutant B19 ... red` and `✓ mutant B20 ... red`, because `Send-S12Escape` is unchanged.
- The fixer report says "touches nothing else" and lists only "New mutants B21-B25; B16 retargeted". This breaks
  `docs/agent-rules.md` §2: "Never weaken a protective check ... a test", and a removed test needs a documented removal.
  The escape guards (own-window check before the foreground check, no key when not in the foreground) protect the only
  key this opener can send.
- Fix: restore the three HEAD lines to `MUTANTS`, unchanged. They pass as they are (verified above). Expected count after
  the restore: 5583.

**F2 - MINOR - no test pins the opener to `Open-S12UiaItem`.** Mutant V2 survives. It changes `s12-win-b.ps1:74` from
`-not (Open-S12UiaItem $el)` to `-not (Invoke-S12UiaElement $el)`.

- Why it survives: the `menu` group stubs both helpers to `$true` (`s12-ps-b.test.ts:30-31`), and the `uia` opener tests
  use an element whose patterns both throw.
- What it would cost live: it brings back the Expand without a guard. That threw `0x80131509` on an already-expanded
  `More tools`, which is the trap the measurer named.
- Fix: in the `menu` group, stub `Invoke-S12UiaElement` to `$false`, or add a `uia`-group case with an already-Expanded
  stub item that must not be expanded again.

**F3 - MINOR - the pacing between steps is not measured, and the finder has no retry.** `s12-win-b.ps1:76` keeps 700 ms.
The measurer's snippet has 800 ms after step 1.

- The measurer's evidence never ran the steps at this cadence. The Expand was at 00:11:36.96 and `More tools` was found
  at 00:11:47.79, 11 s later, in a separate phase (evidence lines 20 and 28 of `S7-live-B-measurer-evidence.txt`). So
  neither 700 ms nor 800 ms is a measured margin.
- `Find-S12UiaByName` reads once and has no retry. If the menu renders slowly, step 2 prints `found=no` and the last
  attempt's DevTools rows go NOT MEASURED again.
- Fix (the step agent's call): use 800 ms after `menu-button` as in the snippet, or better, a bounded re-find (say, up to
  3 s at 250 ms) for steps 2 and 3. That needs no new pass rule, because the CHECK lines stay the same.

**F4 - NIT - the fixer's red-run claim is off by one, and two mutants are duplicates.**

- The fixer reports `7 failed | 24 passed (31)` on HEAD. On HEAD I get 8 red among the 31 tree tests. B24 is also red,
  because its target text is absent on HEAD. The fixer says B24 was retargeted after that run, which explains the gap.
- B16 and B25 have the same `from` and `to` text, and differ only in the check they name (`s12-ps-b.test.ts:258, 264`).
  B16's name "no try around the item press" does not match what it does, which is a rethrow.
- Fix: rename B16, or make it really remove the `try`.

**F5 - NIT (existing gaps, not this round's).** V13 (no pause), V14 (method name) and V15 (`S12Before` not reset) survive.
The method name ends up in the DEVPROBE line, which the actor prints from `S12DevMethod`. Optional: add a `menu` check on
`CHECK devtools-ui method=uia-menu`.

## 5. Deviations

- I did not swap HEAD's ps1 into the tree. Instead I ran a scratch copy of the harness against a scratch HEAD copy, so the
  tree was never touched. That is safer and gives the same result.
- I added 16 mutants beyond the requested 8.

## 6. Proposed decisions

None.

## 7. Handoff

No process is left running. The scratch files (`gen.mjs`, `vmut.mjs`, `psb.test.ts`, `head.ps1`, `fix.ps1` and the run
logs) are in the session scratchpad under `v2/`. The tree has the same bytes as when I started. Next: a fixer restores
B18-B20 (F1), and should also handle F2 and F3. Then a fresh verifier re-checks only those items.
