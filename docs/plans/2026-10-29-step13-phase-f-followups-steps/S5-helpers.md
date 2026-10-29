# S5-helpers — Run 20's pure helpers and fixture (step report)

Step agent: Claude Opus 5.5, medium. Builder and fixers Sonnet, medium; verifiers Opus, medium; committer Sonnet,
medium. No product code, no live run, no daemon on 9234.

## 1. Verdict

DONE. The slice proposed in `S5-sheet.md` §7 is built: every §4.28 line form, the MCP-line judges, `busyExact`, the
newest-kept cap judge, the DevTools control and dock-side verdicts, the disabled-input reachability map and the fixture.
Commit hash: in the session agent's journal (the committer reports it after this file is staged).

## 2. Outputs

- `recipes/s13-forms.ts` (202 lines): forms (1)–(13) of §4.28 as pure formatters, plus the redefined `CONCAP`
  (`lines` = k+1) and `CHOOSE` (`names-devtools`); `busyExact` / `namesDevtools` on `CHOOSER_BUSY_MESSAGE` and
  `ErrorCodes.DEBUGGER_DEVTOOLS`; `MCP_LINES`, `mcpLineRead`, `mcpLineVerdict` (the MCP's own line and `isError`
  only); `concap20Stats` / `concap20Verdict` (marker pattern derived from the product's `formatConsole`; `expectK`
  default 9, another k is RECORD); `ctrl20Verdict`, `devt20Verdict`, `conditionalRows`, `devtRowGate`,
  `dockRestoreVerdict`, `DOCK_READ_PLACE`; `disClass`, `disVerdict`, `disBaselineOk`; `hasConsoleClause20`;
  `actorsVerdict`, `sentinelRows`.
- `recipes/test/s13-forms.test.ts` (377 lines, 51 tests): each form compared by key and alternatives with the sheet's
  own paragraph, parsed at test time; the old-text mutants (old overlap text vs `busyExact`, old cap marker vs the cap
  judge, a code-on-line-1 or extension-text reader vs the MCP-line judge) are rejected.
- `test-fixtures/s13-chooser.html` (16) + `s13-chooser.js` (55): `kept`, `disflip`, `disself` (`css:#dis`), `disbtn`;
  reporter `window.__s13ch`; window title "S13 chooser fixture".
- `recipes/tsconfig.s13.json` (5) and one exclude added to `recipes/tsconfig.s6.json` (below).
- `npm test`: 5654 passed, 238 files (measured by the step agent before the build) → 5705 passed, 239 files (verifier2
  and verifier3, re-run); +51, none removed. `npm run typecheck`, `npm run build` and all **8** `recipes/tsconfig*.json`
  exit 0 (verifier2).
- Size: 655 new lines (code and fixture 278, tests 377; `wc -l`).

## 3. Verifier verdict

- Round 0: FAIL, 1 MAJOR (a home path with the user's name in the builder's red-run evidence), 2 MINOR, 4 NIT
  (`S5-helpers-verifier.md`). Red proof re-run against an empty stub; 23 of 24 module mutants killed.
- Fix round 1 (`S5-helpers-fixer1.md`): all fixed except NIT-7 (docs, the session agent's).
- Round 1 re-check: code items all closed, all exit checks pass; FAIL on 1 new MAJOR (the fixer's report quoted the
  home-folder name in a grep pattern) and NIT-B (a fixer claim that does not reproduce; nothing to fix)
  (`S5-helpers-verifier2.md`).
- Fix round 2 (`S5-helpers-fixer2.md`): the name redacted; zero hits over every slice file.
- Round 2 re-check: **PASS** (`S5-helpers-verifier3.md`). Stage verdict **PASS-with-notes** (NIT-B, NIT-7 open). Two fix
  rounds of three used. Findings in all: 2 MAJOR, 2 MINOR, 6 NIT.

## 4. Deviations

- Size 655 against a cap of ~600: accepted under `agent-rules.md` §7, one coherent piece, code 278 well under the cap,
  the extra is tests.
- `recipes/tsconfig.s6.json` edited (one exclude for `test/s13-forms.test.ts`), outside the "one tsconfig entry":
  without it s6 exits 2 with 46 `chrome` type errors through the test's import of `extension/src/handlers/upload.ts`
  (verifier, scratch config). Same treatment Step 10 S8 gave the s9/s10 tests. No Run 19 file edited.
- The builder's red proof was reproduced against an empty stub after the test was written (42 fail, 6 pass); verifier
  accepted it together with the mutant table, and after round 1 the stub run is 46 fail, 5 pass.

## 5. Proposed decisions

### 2026-10-29 · S5-helpers: a mismatched MCP line is FAIL in the helper; `flip` TIMEOUT then `self` other is FAIL
**Decided:** `mcpLineVerdict` returns FAIL on any mismatch (calling a leg NOT DISCRIMINATING is the driver's call);
`disVerdict` returns FAIL when `flip` answers TIMEOUT and `self` answers anything other than the refusal or TIMEOUT.
**Why:** the sheet does not state these cases; the strict answer cannot flatter a result. **Instead of:** RECORD.
**Revisit if:** the gate rules either case differently. **By:** Claude (proposed)

## 6. Findings

- §4.28 form (3) lists `active-guard=<bg or fg>`, but R20-POP-NONE prints `active-guard=n/a`, `held-call=n/a`,
  `in-ms=n/a`. `popLine` prints what the row prints; form (3) needs a dated note (session agent).
- `recipes/CLAUDE.md` says "all seven" recipe tsconfigs: now 8, and the `.s6` exclude list should name
  `s13-forms.test.ts`. Root `CLAUDE.md:110` test count is stale (now 5705). Both for the session agent / S6.

## 7. Handoff (for S5-drivers)

- A driver importing `s13-forms.ts` needs a tsconfig with `chrome` in `types` to typecheck (`tsconfig.s13.json` is
  the model); under tsx it runs without one.
- Fixture reporter `window.__s13ch = {clicks, input, change, cancel, files, size, digest}`; add the title
  "S13 chooser fixture" to the driver's window guard (#367).
- `concap20Verdict` takes `expectK` (default 9). `mcpLineVerdict` FAIL is final unless the driver's own rule says NOT
  DISCRIMINATING. The verifier3 NIT F (close the reopened docked pane after the RESTORE read-back) is a driver step for
  S5-drivers-C; E and G are in the helpers (`DOCK_READ_PLACE`, `sentinelRows`).

READ list given to the builder and verifiers: `S5-sheet.md` (whole), `S5-sheet-fixer1.md`, `S5-sheet-builder.md` §7;
`docs/e2e-test-plan.md` §4.28 (lines 1938–1995); the phase doc § S5, Exit checks, STOP rules and forbidden fixes,
§ As built S1–S4; decisions #391, #395, #398, #399; `recipes/CLAUDE.md`; `recipes/s12-forms*.ts`.
