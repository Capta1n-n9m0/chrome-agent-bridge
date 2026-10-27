# S4-live substep 0 — builder report (#306)

Model/effort: Sonnet, medium.

## 1. Verdict
DONE (about 150 new lines including tests and the note; under the 200 cap).

## 2. Outputs
Files changed (no commit):
- `recipes/s11b-rules.ts`: `Scan17Ctx.consoleStream`, `Scan17.chromeBlocked`, `isChromeBlockedLine17`, `redactChromeBlocked17`, `CHROME_BLOCKED_LABEL`; `scan17` leaves qualifying lines out of every other count; `scanLine17` appends ` chrome-blocked=<n>` only when n > 0; `OWN_SCAN_LINE` accepts the optional suffix.
- `recipes/s11b.ts`: `scan` passes `consoleStream: what === "console"`; new `redact-console --file <capture> --out <evidence>` command (drops title lines, redacts, prints a count only).
- `recipes/s11b-r17.ps1`: `rd-logs` runs `redact-console` into `console-evidence.txt` (in S11_OUT, after the console scan; the raw `console.txt` stays outside the repo and is the only file scanned).
- `recipes/test/s11b-chrome-blocked.test.ts` (new, 10 tests).
- `docs/e2e-test-plan.md`: one dated italic paragraph right after the table, after the RD-LOGS row (the row's text is untouched; a blank line separates it from the table).

Definition of "Chrome's network-error form": the console stream only (`scan --what console`; not daemon, actors, other); the line holds `net::ERR_BLOCKED_BY_CLIENT`; no `[bridge]`; no `127.0.0.1`; it names `localhost:8085`; a scan of the line alone shows no non-fixture URL, token, a-run, bank.example, alias, sentinel or profile path.

Numbers:
- New test file against HEAD's `s11b-rules.ts`: 7 failed, 3 passed (the 3 that pass assert only STOP on lines HEAD already stops). After: 10 of 10 pass.
- `npm test` after: 178 files, 4482 passed. Before: not run separately; 4472 by subtraction (4482 - 10 new), no test removed or edited.
- `npx tsc --noEmit -p` for all seven `recipes/tsconfig*.json`: exit 0. `npm run typecheck`: exit 0. `npm run build`: exit 0.
- `git status --short`: only the four modified lane files, the new test, and the untouched untracked `S4-live.ledger.md`.

## 4. Deviations
- The SCAN line carries `chrome-blocked=<n>` only when n > 0, so every existing pinned SCAN text and test stays byte-identical. The dated note says so.
- The `scan` CLI wiring (`consoleStream`) and the `redact-console` command have no CLI-level test (pure functions are tested); offline only.
- Raw `console.txt` is in `S11_OUT` (TEMP), not the steps dir; the runner writes no raw console text into the repo, so the redacted copy `console-evidence.txt` is what may be committed.

## 5. Proposed decisions
None.

## 6. Findings
- A heredoc'd Python script mangled `\r?\n` escapes (as the memory note warns); repaired and checked by tests.

## 7. Handoff
No processes started. Commit is the step agent's: list the five files above plus this report.
