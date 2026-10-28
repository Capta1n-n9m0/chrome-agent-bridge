# S7-helpers-b verifier report, round 3 (after fix round 2)

Model and effort: Claude Opus 5.5, medium. Read and run only. This report is the only file I added to the repo. The
mutants ran in place and were restored, and `sha256sum -c` passed on all four slice files. Scratch files are in
`<scratchpad>/v3/`: `mut3.mjs`, `mut3-out.txt`, `sha-pre.txt`, and copies of the four files.
Scope: M28, P6 and the new wording NIT only. MINOR-2 (`end-ms=never`, a sheet finding) and the F12 docked-pane NIT
(outside this lane) are recorded here and do not count against the slice.

## 1. Verdict
**PASS-with-notes.** Both mutants that survived round 2 are now killed, along with every variant I added. The code
change is the wording comment only. Counts, the typechecks and the size limits all hold. The one note is a NIT (§5).

## 2. Mutants (`mut3.mjs`, verifier2's `mut2.mjs` plus variants; each runs the slice's own test file)
| Mutant | Result |
|---|---|
| M28: `CAP_MARK` loosened to `more lines,.* narrow`, as verifier2 defined it | **KILLED** (1 failed, 31 passed; CONCAP's marker test) |
| M28b (mine): the tail loosened to `more lines, .*\]$` | **KILLED** (the same test) |
| P6: `$S9UIA::FromHandle([IntPtr]$w)` replaced by `$S9UIA::RootElement`, as verifier2 defined it | **KILLED** (2 failed; `search` real-file check and B13b) |
| P6c (mine): the whole desktop reached another way, `[Windows.Automation.AutomationElement]::RootElement`, which bypasses the `$S9UIA` stub | **KILLED** (2 failed: no `FH` lines) |
| P6d (mine): `FromHandle($Hwnd)`, so only window X is searched | **KILLED** (2 failed) |
| P6e (mine): the search list plus handle 0 | **KILLED** (2 failed) |
| Rerun of round 2's killed mutants: M19, M23, P3, P4, P5, P5b, P6b, P8 | all still **KILLED** |

Restore: `s12-forms-b.ts` sha `5b1b8d83…` and `s12-win-b.ps1` sha `0996182c…` match before and after (EQUAL).
`sha256sum -c` passes on all four files.

## 3. What changed since round 1
- `recipes/s12-forms-b.ts` is byte-identical to round 0 and round 1 (sha `5b1b8d83…`).
- `recipes/s12-win-b.ps1`: I diffed it against verifier2's scratch copy (`v2b/s12-win-b.ps1`, sha `eacad09d…`, the
  round-1 file). The only change is the header comment at lines 7-8: "sends NO key" now reads "sends no opening key",
  plus one new line naming the closing Escape to X. That fixes the new NIT, and nothing else changed.
- Test files. The CONCAP test gains the look-alike `… foo — narrow with level/limit]` → `marker=no`
  (`s12-forms-b.test.ts:259-260`). `s12-ps-b.test.ts` gains:
  - the `mkRoot` and `UiaStub` stubs (`:63-77`);
  - the `find-roots` group;
  - the `search` check, which needs exactly `FH 7|FH 30|FH 7|FH 30` and `FOUND yes` (`:147-148`);
  - mutant B13b (`:206`).

  These are the fixes verifier2 named.
- `git status` shows no other new or changed paths. `S7-helpers-a.md` and `journal.md` were already modified when the
  session started.

## 4. Outputs (re-derived)
| Check | Result |
|---|---|
| `npx vitest run recipes/test` | **1302 passed, 57 files**, as claimed |
| The two slice files alone | 60 tests, 2 files. Before the slice: 1302 − 60 = **1242 tests, 55 files**, as claimed |
| `npx tsc --noEmit -p` on all seven `recipes/tsconfig*.json` | all exit 0 |
| `npm run typecheck` | exit 0 |
| Size (`wc -l`) | 116 + 96 = **212 code lines** (cap 400); 265 + 232 = **497 test lines** (cap 600) |

## 5. Notes
- **NIT (new).** The test title at `recipes/test/s12-forms-b.test.ts:248` says "(its constant, not a copy)". But
  `CAP_MARK` (`recipes/s12-forms-b.ts:101`) is still a copy of the SDK text, and the fixer's report says the SDK does not
  export it. The test does compare against the real `formatConsole` output, so the behaviour is covered. Fix: drop the
  parenthesis from the title.
- **Recorded, not counted:** MINOR-2 (`end-ms=never`, for the sheet). The F12 docked-pane close in `s12-win.ps1`
  `Close-S12DevTools` (outside the lane), which the session agent should carry into the Run 19 sheet's note on the menu
  method.

## 6. Handoff
Nothing is running. Nothing was committed.
