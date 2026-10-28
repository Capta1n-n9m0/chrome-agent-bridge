# S7-drivers-A verifier, round 3: liveA19's row drivers after fix round 2

Model and effort: Opus 5.5, medium. Role: verifier (agent-rules §6). This round re-checks only the items fix round 2 touched. I only read and ran things. Every in-place mutant was restored byte for byte (`sha256sum -c`: all nine stage files OK). Nothing drove Chrome, the daemon or port 9234. Evidence: `docs/plans/2026-10-27-step12-phase-f-steps/S7-drivers-A-verifier3-evidence.txt`.

## 1. Verdict
**PASS-with-notes.** N2, MINOR-1, MINOR-2, MINOR-3, NIT-1 and NIT-4 are fixed as claimed, and each fix has a test that goes red without it. I rule the title conflict for fixer2: the toolbar's UIA read returns the `chrome.action` title (`BADGE_TITLES`), not the worker's log line, and verifier2 was wrong. This round has one new MINOR (the disarm side of the toolbar check is loose) and one NIT (the sheet's CON-4 step text). N1 and M6 are left to the step agent.

## 2. Outputs (re-derived)
| Command | Result |
|---|---|
| `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json` | all seven exit 0 |
| `npx vitest run recipes/test` | **1484 passed, 62 files** (claimed 1484 / 62: holds) |
| `npm run typecheck` | exit 0 |
| `npm test` | **5384 passed, 228 files** (claimed 5384 / 228: holds) |
| `npm run build` | exit 0, `built extension → dist/` |
| Size (`wc -l`, `git diff HEAD --numstat`) | **code 732** = 591 (`s12-r19-a.ts`) + 109 (`.ps1`) + 26 (`s12-r19.ps1`) + 1 (lib) + 5 (`s12-forms.ts`), cap 400. **Tests 461** = 449 + 11 + 1, cap 600 |

`s12-r19-a.ps1` contains 0 non-ASCII bytes. Its only top-level variable is `$R19DeferRe`, so the `$o` trap does not apply. `scanActors` (`recipes/s12-r19.ts`) is not in `git status`, so it is unchanged.

## 3. The items, re-checked

**N2: fixed.** `conFloor` sets `readAt = Date.now()` before `entriesOf` (`s12-r19-a.ts:478`). `floorCounts` drops times `>= readAt` before it counts (`s12-forms.ts:74`).
- The cut keeps the `i + 1` tick numbers because tick times only increase, so the filter removes a suffix.
- Mutant "readAt ignored" (`t < p.readAt` → `true`): the CONFLOOR test goes red.

**MINOR-1: fixed.**
- The undo step writes `"pre,post"` (`s12-r19-a.ps1:20`). The actor splits it into `onMs: onPre` and `onTitleMs: onPost` (`s12-r19-a.ts:476,480`).
- The disarmed side ends at `onMs − 500`, which matches the sheet's "between the off title and the on press". The after side starts at `onTitleMs + 500`, which matches "≥ 500 ms after the on title" (`docs/e2e-test-plan.md:1800`).
- `off` is still the OFF `post` (the title read), as the sheet says.
- Mutant "after window from the press": red.
- CON-4 reads the same `-done` file but ignores its value (`s12-r19-a.ts:383`), so the new two-value form breaks nothing.

**MINOR-2: fixed.** For `browser_status`, `actorRecord` writes only `status lines=<n> extension=<connected|other> active=<fixture|other|none>` (`s12-r19-a.ts:102`).
- These fixed words come from `registry.ts:405,408,420`: `Extension: connected`, `Active tab: [Tn] …`, `Active tab: none`.
- No title or URL can reach `actors-liveA19.jsonl`. The test runs the record through the unchanged `scanActors` and gets `pass`.
- Nothing §4.27 judges is lost. CON-MCP judges `browser_status` on the raw `r.text` before it writes the record (non-error, non-empty; `:316`). R19-LOGS's `SCANTOOL` still gets one line per tool.
- Mutant "status written whole": red.

**MINOR-3: fixed.** `Close-R19Bc` now runs after `Invoke-R19Stamped $R17Blocks['rd-restore']` (`s12-r19-lib.ps1:219`), inside a `try/catch`.
- It runs only for `liveA19` and only when `Get-Command` finds it.
- The catch prints a fixed `CHECK` word, so it carries no URL or handle text.
- The S7-helpers-d tests (`s12-r19.test.ts`, `s12-r19-static.test.ts`) pass in the full run.
- Mutant "Close-R19Bc before the restore" (the line order swapped): red. The test checks only the order of the source text, which is enough for a one-line move.

**NIT-1: fixed** (and see §4): `Test-R19Armed` now reads `-eq $S9TitleArmed` (`s12-r19-a.ps1:69`). Mutant "back to `-like 'safety: armed*'`": the static test goes red, and so does the behaviour scenario test. The PowerShell stub now returns the title form, not the log text (`s12-r19-a.test.ts:309-310`).

**NIT-4: fixed.**
- `fixture-handle` splits on `[\s*]+`, so `T2*` counts. Mutant "split on `\s+`": red.
- The list-tabs probe requires `mt !== ""`. Mutant "accept an empty `mt`": red. That test is a source-text match.
- The note that the B/C drivers must call `Close-R19Bc` is carried in fixer2's handoff.

**The eight round-1 mutants: no regression.** I wrote my own texts (`mut3.mjs`) and ran each in place against `s12-r19-a`, `s12-r19` and `s12-r19-static`. **All eight are red**:
- IDLE taken from the first match
- BANNER-CTL's idle read from the `-neg` id
- a banner STOP printed by `Say9`
- `Restore-R19Js`'s `not-restored` printed by `Say9`
- `do` does not set `R19Changed`
- `undo` does not run its restore
- `Switch-R19Toolbar` returns at once
- `conLegs` judges the first read's line for every read

Each of the first six also turns red the fixer's own mutant test with the same intent, which is expected. After the run, the hashes match the originals.

## 4. The title conflict, ruled from the source
**Fixer2 is right, and verifier2's judgment in round 2 was wrong.** The evidence:
- **What the UIA read returns.** `Get-S9ActionTitle` (`recipes/s9-win.ps1:348-355`) returns the first line of the toolbar button's UIA `Name`. That Name is the `chrome.action` title, which `showBadge` sets from `badgeOf(...).title` (`extension/src/badge.ts:117-122`).
- **What the title strings are.** They are the `BADGE_TITLES` strings (`badge.ts:46-55`), for example `Chrome Agent Bridge — armed (click to turn off)`.
- **What the log line is.** `safety: armed by the user` is `LOG_LINES.armed` (`badge.ts:71-77`). It is the worker console's log line for a press. It never appears in the title.
- **The recipes constants match.** `$S9TitleArmed`, `$S9TitleOff` and `$S9TitleJsOff` (`s9-win.ps1:178-180`) are byte-equal to `BADGE_TITLES`, and `recipes/test/s9-rules.test.ts:157-159` pins that.
- **Every sibling uses the exact title.** The helpers live runs have used all compare the UIA read with `$S9TitleArmed`, either exactly or as a prefix: `s11-win.ps1:320,334,477`, `s11b-win.ps1:337,464`, `s12-win.ps1:227`, and `s9-win.ps1:1094`.
- **So the old check could never pass live.** Under `-like 'safety: armed*'`, the first `Switch-R19Toolbar $true` would have hit `not-restored`. Fixer2's diagnosis stands.

**The other title comparisons in the drivers:**
- `Test-R19Armed` is the only title comparison. `Switch-R19Toolbar` uses it for both directions (`s12-r19-a.ps1:71,73`). The arm side is now exact and correct.
- The disarm side is loose (MINOR-A below).
- No driver compares against `$S9TitleOff` or `$S9TitleJsOff`, and no driver compares against a log line. The CON-4 row is judged on the refusal text, not on a title.

## 5. New findings

**MINOR-A: the disarm side of the toolbar check accepts any title that is not exactly armed.** `recipes/s12-r19-a.ps1:69,71,73`.
- **Before the press:** `Switch-R19Toolbar $false` returns at once, pressing nothing, whenever the title is not `$S9TitleArmed`. That includes the armed JS-off title (`$S9TitleJsOff`) and a `$null` read (`Get-S9ActionTitle` returns `$null` when it does not find exactly one button).
- **After the press:** the check `-ne $WantArmed` passes on the OFF title, on a `$null` read, and on any other text.
- **The effect:** nothing passes falsely. If the state was really armed, CON-4 and CON-FLOOR read entries and FAIL. If the state was JS-off and armed, the restore's `Switch-R19Toolbar $true` presses, which disarms, and then stops with `not-restored`. But the row is misattributed: the FAIL or STOP points at the product, not at the toolbar read.
- **Reachability:** the JS-off case needs a JS restore that failed without stopping, and that failure already stops (`Restore-R19Js`). So this is unlikely in the run.
- **Fix (one line):** add `Test-R19Off`, which checks that the title starts with `$S9TitleOff.Substring(0, 25)` (`Chrome Agent Bridge — OFF`, the form `s11b-r17b-press` uses). Use it for the disarm direction: return early only when the title reads off, and after the press stop with `throw-after-state` unless the title reads off.

**NIT-A: §4.27's CON-4 step text names the log line as the title.** `docs/e2e-test-plan.md:1796` says "the toolbar button pressed (off, title `safety: disarmed by the user`)". That string is `LOG_LINES.disarmed` (`badge.ts:72`). The title is `BADGE_TITLES.off`. The drivers are right not to compare against this text. Expected text is never edited, so a dated note on §4.27 (for the session agent) should say which string is the title. This is probably also where verifier2's reading came from.

## 6. N1 (not re-raised): the code follows the sheet; the risk, for the step agent's report
- **The code follows the sheet.** `s12-r19-a.ts:474` is `await sleep(3000)`, commented as §4.27's "wait 3 s". That matches the step text (`e2e-test-plan.md:1800`).
- **Disarmed side, the risk is unchanged from round 2 (estimated, not measured).** The judged span is `[off_post + 500, on_pre − 500)`. That is about 2.1–2.6 s, so `disarmed-ticks ≥ 3` is likely to FAIL at a 1 Hz tick.
- **After side, there is little margin (derived from the code, not measured).** Now that the window starts at the ON title, the span is `[onPost + 500, readAt)`.
  - `readAt − onPost` is the actor's 2 500 ms sleep plus at most about 50 ms of `pressed` polling. So the span is about 2 000–2 050 ms.
  - At exactly 1 000 ms per tick, `after-ticks ≥ 2` holds.
  - Any timer jitter that stretches one gap past 1 000 ms can leave only 1 tick in the span, which is a false FAIL.
  - The same holds for `exc-after ≥ 2`.
- **The ruling covers both sides.** The proposed 4.5 s disarmed wait addresses only the first. Lengthening the post-ON wait (for example to 3.5 s) is the same kind of step change: more judged ticks, the pass rule untouched.

## 7. Proposed decisions
None of my own. Fixer2's two proposed decisions (the redacted `list_tabs`/`status` records; the ON signal carrying two times) are consistent with the code and tests above. The N1 ruling (round 2 §7) is still open, and §6 suggests it also cover the post-ON wait.

## 8. Handoff
- No process is left running.
- Scratch files are in my scratchpad, outside the repo: `mut3.mjs`, `mut3.txt`, `runs.txt` and `sha-before.txt`.
- **The step agent:**
  - M6 (size): code 732 against the cap of 400.
  - MINOR-A, if a fix round remains: one function plus one line in `Switch-R19Toolbar`.
  - NIT-A and the N1 ruling, for the session agent.
