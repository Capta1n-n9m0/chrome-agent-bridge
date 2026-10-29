# S7-live liveB19 fix round 3 - fixer report

Model: Claude Sonnet 5.5, effort medium. Leaf: no agents, no commits. Nothing run against Chrome, a daemon or a port.

## 1. Verdict
DONE. F1 to F4 fixed; F5 not touched (the verifier called V13-V15 existing gaps, outside "touch nothing else").

## 2. Outputs
Files: `recipes/s12-win-b.ps1` (F3 only), `recipes/test/s12-ps-b.test.ts`. `file` says ASCII text for the .ps1.
Counts, each run in the tree:
- `npm test`: exit 0, `Test Files 233 passed (233)`, `Tests 5588 passed (5588)` (round 2 had 5580: +3 restored, +5 new mutants).
- `npm run typecheck`: exit 0.
- `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json`: all seven exit 0.

## 3. Changes, by finding
- **F1**: B18, B19, B20 are back in `MUTANTS`, byte for byte as at HEAD (`git diff HEAD` shows no B18-B20 line). They kill on the fixed file (the file passes 39 of 39).
- **F2**: new check in the `item` group, "the opener presses with Open-S12UiaItem: already-Expanded items whose Expand throws are found=yes, no Expand, no Escape" (case `open-expanded`: both stubs Expanded, Expand throws). New mutant **B26** (opener calls `Invoke-S12UiaElement`) is killed by it.
- **F3**: `Open-S12DevToolsMenu` keeps `$t0` (taken at the start, then right after each step's success, before the 700 ms pause). Steps more-tools and developer-tools re-find every 200 ms until `Get-S12NowMs - $t0 -ge 3000`; menu-button stays one read. CHECK lines, Escape on miss, `Assert-S11Own`, the 8081 check and the 700/1500 ms pauses are unchanged. `Get-S12NowMs` is from `s12-win.ps1:38` (the timeline already depends on it).
  New `menu` checks:
  - "a menu item that appears on the 2nd or 3rd read is found and opened; the button is read once" (cases `late2`, `late3`);
  - "an item that never appears: found=no and Escape after a poll bounded to 3 000 ms from the previous success (every 200 ms), for both items" (cases `never`, `never-dev`; elapsed read from the stubbed clock: 3 100 ms and 3 800 ms, with 13 reads of the item).
  Test harness: the `Find-S12UiaByName` stub counts reads per pattern (`$global:Reads`, `$global:Appear`, both reset in `T`). The old check "a missing step ..." changed from `FIND count === 2` to "no Developer lookup, more than one More tools lookup" because the poll makes the count larger by design; the no-button case still demands exactly one FIND.
  New mutants: **B27** (no poll), **B28** (bound 300 ms), **B29** (bound 30 000 ms), **B30** (the button polled too).
- **F4**: B16 renamed "the item press rethrows (seen through the opener)". It is not dropped: it has the same text change as B25 but a different group and check (the opener's view), so it is not an exact duplicate in what it asserts. B25 is unchanged.
- **F5**: not touched.

## 4. Tests added or removed
Added (all in `s12-ps-b.test.ts`): item check "the opener presses with Open-S12UiaItem ..."; menu checks "a menu item that appears on the 2nd or 3rd read ..." and "an item that never appears ..."; mutants B26, B27, B28, B29, B30.
Restored: B18 escape: own check removed; B19 escape: foreground not checked; B20 escape: foreground before own check.
Removed: none. Renamed: B16. Count change: round 2 tests 31 -> now 39 (3 restored + 5 mutants; the new checks sit inside the existing group tests).

## 5. Red on round 2, green on mine
Round 2's ps1 was copied to `scratchpad/f3/s12-win-b.ps1` and put into the tree for one run, then the fixed file was put back (`cmp` identical).
- On the round-2 ps1: `Tests 5 failed | 34 passed (39)`. The `menu` group check fails (the late-appearance, never-appears and missing-step checks); B27, B28, B29 and B30 fail with "the mutated text is in the file" (the poll text does not exist there).
- B26 and the F2 check are green on round 2's ps1 and on mine: round 2 already used `Open-S12UiaItem`; the check's job is to kill the mutant, and B26 is killed (it passes, i.e. the mutated file turns the check red).
- On the fixed ps1: `Tests 39 passed (39)`.

## 6. Deviations, proposed decisions, findings
None. Handoff: the tree has uncommitted changes in the two files above, nothing running. A fresh verifier re-checks F1-F4 only.
