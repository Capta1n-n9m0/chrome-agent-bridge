# S7-helpers-e fixer report (round 1)

Sonnet, medium effort. Nothing live. No commit, stash, checkout or reset. Lane kept: `recipes/s12-win.ps1`, `recipes/test/s12-r19-c.test.ts`, `recipes/test/s12-helpers-e.test.ts`. `recipes/s12-r19-c.ts` was mutated for evidence and restored (`git diff` on it is empty). MINOR-2 and NIT-3 untouched.

## 1. Verdict
All three listed findings fixed. `npm test`: 231 files, 5520 tests passed (5519 + 1). `npm run typecheck` exit 0. `tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json`: all exit 0.

## 2. MINOR-1 (source pins, no deep-freeze)
- `recipes/test/s12-r19-c.test.ts:215-221`, a new `it` after the call-site pin. For every `{ want: ` in `s12-r19-c.ts` it requires `wantOf(` ... `)` followed by `, dlg: `, or the leg's own `c[3], sum`. It also forbids `Object.assign/defineProperty/defineProperties/setPrototypeOf(` and any assignment into `WANT` (regex `(?<!const )\bWANT\b[\w.\[\]"]*\s*(op?=)(?![=>])`).
- No anchor line of `s12-r19-c.ts` was edited, so no anchors changed.
- Mutants (applied to `s12-r19-c.ts`, test run, file restored from a copy): M1a2 red (1 failed), M1b2 red, M1c2 red, M1d red, M1f red. Clean file: 53 passed. Extra check: `WANT.choose3.clicks = 0;` before the call also red.
- Size: +7 test lines.

## 3. NIT-1
- `recipes/test/s12-helpers-e.test.ts`: the stub `Set-S9Foreground` counts calls (`$global:FgCalls`); with `FgOk = 'split'` it returns `$true` on the first call and `$false` on the second. New `Run 'R19S'` and an expectation of `OPT O2 front after-save=yes before-conflict-read=no`.
- Mutant U13 (`Format-S19OptFront $o2Fg $o2Fg` in `s12-win.ps1`): 1 failed, 11 passed (red). File restored (`cmp` identical).
- Size: +3 test lines changed or added.

## 4. NIT-2
- `recipes/s12-win.ps1:156-157`: `Wait-S12O2`'s `[long]$T0` renamed `[long]$FromMs`; the local `$t0` is now a separate variable. The call in `$S19OptPairs` passes it positionally, so it needed no change. Default (now) is the same. `s12-helpers-e` passes.

## 5. Deviations
My first regex edit had a Python escape slip (a literal backspace in place of `\b`) that made the WANT-assignment pin vacuous. I found it when the pin passed on a file that should not pass, then rewrote the line and showed `WANT.choose3.clicks = 0` red.
