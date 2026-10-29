# S7-live liveB19 fix round 2 - fixer report

Model: Claude Sonnet 5.5, effort medium. Leaf: no agents, no commits.

## 1. Verdict
DONE.

## 2. Outputs
Files: `recipes/s12-win-b.ps1`, `recipes/test/s12-ps-b.test.ts` (no other file).

Diff summary (`recipes/s12-win-b.ps1`):
- Lines 6-9 header: now names the measured Chrome 156 path (Button `Chrome` / ClassName `BrowserAppMenuButton` Expand, MenuItem `More tools` Expand, MenuItem `Developer tools` Invoke), citing S7-live-B-measurer.md.
- New `Find-S12AppMenuButton` (before `Send-S12Escape`): window X only, PropertyCondition on `AutomationElement.ClassNameProperty` = `BrowserAppMenuButton`, returns the element only when exactly one matches, else `$null`.
- New `Open-S12UiaItem`: ExpandCollapse offered -> Expand only if `ExpandCollapseState` is not `Expanded`; else Invoke; `$false` on a throw or neither pattern.
- `Open-S12DevToolsMenu`: step `menu-button` is `('menu-button','BrowserAppMenuButton','Button')` and is found by `Find-S12AppMenuButton`; `more-tools` and `developer-tools` still by name via `Find-S12UiaByName`; the press is `Open-S12UiaItem`. Guards unchanged (Assert-S11Own, 8081 check, `$global:S12Before`, CHECK lines and step names, Escape after a miss, Test-S12DevToolsUi, return value, `uia-menu`).
- Decision: `Invoke-S12UiaElement` is NOT changed (`recipes/s12-win-c.ps1:102` still uses it, Invoke first); a new helper was added instead.

Tests (`recipes/test/s12-ps-b.test.ts`): stubs for `Find-S12AppMenuButton`/`Open-S12UiaItem` in the preamble; `$ALL` uses `BrowserAppMenuButton`; the search stub now filters by the PropertyCondition value; new group `item` (8 cases); new search checks (Name-only button -> no, `Chrome`/BrowserAppMenuButton -> yes, two matches -> no, a button only in a new window -> no); opener throw tests now stub the button finder; added `open-find-throw2` (by-name finder throws -> found=no). New mutants B21-B25; B16 retargeted to `Open-S12UiaItem`'s catch.

## 3. Red then green
Red: HEAD's `s12-win-b.ps1` copied from a scratch path over the file, new test file run, then my version restored from a scratch copy (no stash/checkout/reset):
`npx vitest run recipes/test/s12-ps-b.test.ts` -> `Tests 7 failed | 24 passed (31)`. Real-file checks red: `search`, `item`, `menu`; mutants B16, B21, B22, B23 (their target text absent on HEAD).
Green (my code, after retargeting B16/B24): `Tests 31 passed (31)`.

## 4. Counts
- `npm test`: `Test Files 233 passed (233)`, `Tests 5580 passed (5580)` (baseline 5577, 233 files; +3 tests, +0 files).
- `npm run typecheck`: exit 0.
- `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json`: all exit 0.
- ASCII check of `s12-win-b.ps1`: no non-ASCII bytes.

## 5. Deviations
None. Not run against Chrome (stubbed tests only). The 700 ms pause between steps is unchanged (measured menu listing was 800 ms after Expand; Find searches fresh, so left as is).

## 6. Proposed decisions
None new (the measurer's 2026-10-29 ClassName decision is implemented as proposed).

## 7. Handoff
No process left running. Uncommitted: the two files above. Scratch copies in the session scratchpad `head/`.
