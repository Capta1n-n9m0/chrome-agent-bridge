# S4-live substep 0 — fixer report (N1, N4)

Model/effort: Sonnet, medium. Role: fixer. Offline only; nothing committed.

## Changes
- `recipes/s11b.ts`: new `scanCtx(a, what)` builds the one `Scan17Ctx` (token, state.json sentinel, `--alias` else state.json alias,
  ownId, profile, `consoleStream: what === "console"`); `scan` and `redact-console` both use it. `redact-console` takes `--alias`,
  re-runs `scan17` + `verdict17` on the input (same control-line rule as `scan`) and refuses with `STOP` (exit 2, no output file)
  unless the verdict is pass. `--out` goes through `outsideRepo` like `--file`.
- `recipes/s11b-r17.ps1`: rd-logs passes `$ac` (the `--alias` args) to `redact-console` as the scan call does.
- `recipes/test/s11b-chrome-blocked.test.ts` (+3 tests): CLI redaction equals `isChromeBlockedLine17` line by line under the scan's
  context (own `chrome-extension://<id>/` line redacted; alias given); refusal with no output file for an alias line and for a
  capture without the control line; `--out` inside the repo refused.
- `recipes/tsconfig.s11b.json` include and `recipes/tsconfig.s6.json` exclude: the new test file added.

## Gates
- `npm test`: Test Files 178 passed (178), Tests 4485 passed (4485) (was 4482/178).
- All seven `recipes/tsconfig*.json`: exit 0. `npm run typecheck`: exit 0. `npm run build`: exit 0.
- `git status --short`: only lane files plus the step docs.

## Deviation / note
- Red-before was not run: reverting would need checkout/stash (forbidden). By reading the old code, the three new tests fail on it
  (old redactor had no `ownId` so the own-URL line stayed raw, no refusal, no `--out` guard).
- N2's wording (naming `console-evidence.txt` as the only committable console text) is not touched; the refusal covers its alternative.
