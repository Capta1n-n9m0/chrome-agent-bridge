# S5-helpers verifier report (Step 13, Run 20's pure helpers and fixture)

Verifier: Claude Opus 5.5, medium. Read and run only; no slice file edited, nothing committed. Evidence:
`S5-helpers-verifier-evidence.txt` (mutant table, in-memory checks, the tsconfig proof, exit checks).

## 1. Verdict

**FAIL**: one MAJOR (a local path with the user's name in the builder's red evidence file, a STOP-rule item if committed).
The code itself is sound. Every assigned form exists and matches the sheet. The judges reject every old text. With the
MAJOR fixed and the MINORs below taken or accepted, this slice is PASS-with-notes.

## 2. Exit checks (re-run in the main tree)

| Check | Result |
|---|---|
| `npm test` | `Test Files 239 passed (239)`, `Tests 5702 passed (5702)`. n = 48: the new file has 48 tests (vitest on the file alone, `(48)`), and 5702 − 48 = 5654 at 238 files is the brief's baseline. The tracked diff touches no test file (`git diff --stat`: only `recipes/tsconfig.s6.json`), so no test was removed. |
| `npm run typecheck` | exit 0 |
| recipes tsconfigs | **8** configs (`.json`, `.fe`, `.s6`, `.s9`, `.s10`, `.s11`, `.s11b`, `.s13`), each `npx tsc --noEmit -p` exit 0 |
| `npm run build` | exit 0 |
| `git status --short` after the build | only `M recipes/tsconfig.s6.json` plus the 5 slice files and the builder's 2 report files |
| Run 19 files | none edited (`git diff --stat`); `s12-forms-c.ts` `chooseLine` and `s11-rules.ts` `K` are imported read-only |
| Size | 634 new lines (199 module, 359 tests, 71 fixture, 5 config). Code is 275 lines, under the ~590 cap. The total is under 1.5× and the extra is tests (agent-rules §7). |

## 3. Red proof and mutants (#395: scratch copies only)

The builder wrote its red run after the module existed, against an empty stub. I re-ran it the same way, outside the
tree: a scratch vitest config with root = repo and `../s13-forms.js` aliased to a scratch module. The main tree was not
touched.
- **Stub:** 42 failed, 6 passed, which matches the builder's file. The 6 that pass are the 2 parser self-checks, the 3
  fixture tests and the count-refusal test. The fixture tests fail without the fixture files: `readFileSync` throws at
  collection. The count-refusal test is vacuous on a stub (NIT-6). **The stub reproduction is enough as a red proof**,
  together with the mutant table below, which proves each judge's tests discriminate.
- **Identity copy (harness control):** 48 passed.
- **Mutants killed (23 of 24):** busy check on code only (3 failed), busy check that accepts any message (2), names-devtools
  always false (1), cap marker read last (2), cap marker regex set back to Run 19's (1), `k = lines` (1), MCP `includes`
  read as exact (1), MCP verdict ignoring `isError` (1), MCP jsDisabled line set to the extension's text (2), a reader that
  strips a code on line 1 (2), an unread control passing (1), the finding given on any `DEBUGGER_DEVTOOLS` text (1), a
  missing `self` passing (1), `self` ignored (1), a sentinel allowed on any tool (1), an unread restore side passing (1),
  POP key order swapped (1), `names-devtools` dropped (1), `CONCAP lines=k` (2), `data` ignored in the refusal class (1),
  the console-clause regex widened (1), count / word / integer guards removed (1 each).
- **Mutant survived:** removing `lastIndex === total && firstIndex === total - k + 1` from `concap20Verdict` passes all 48
  tests (MINOR-2).
- **Named old-text mutants, checked in memory against the real judges** (`npx tsx`):
  - `busyExact(K-devt)` is false and `namesDevtools(K-devt)` is true; the product's busy text passes `busyExact` with
    `namesDevtools` false.
  - The Run 19 cap text (oldest nine, old marker last) is FAIL. The oldest nine under the **new** marker are FAIL in the
    real judge. The newest nine under the old marker are FAIL.
  - The MCP output `VERSION\n<ARGS_RELOAD_HINT>` is FAIL in the s13 judge but PASS in Run 19's `judgeMcpErr`, which is the
    reader fault #373 names. Run 19's `mcpCodeOf` on the real MCP output reads `ERROR`.
  - `JS_DISABLED_MESSAGE` fed to the JS line judge is FAIL, and the MCP line does not contain the extension's message.
  - Each of the five `MCP_LINES` passes on its own bare output with `isError`.

## 4. Spec audit (§4.28, S5-sheet.md §7, fixer1's corrected item)

- **Forms (1)–(13), CONCAP and CHOOSE redefined:**
  - Each formatter's keys and order match the "Line forms (Run 20)" paragraph (re-read by me). The test parses that
    paragraph at run time, and exact `toBe` strings pin the order.
  - `CONCAP lines` counts the marker (k+1), and `first-index` is 200−k+1.
  - `CHOOSE` appends `names-devtools` after Run 19's keys, reusing `chooseLine`.
- **R20-POP-NONE `n/a` (builder's flagged gap):**
  - Form (3) allows only `active-guard=<bg or fg>`, but the row's expected text prints `active-guard=n/a`, `held-call=n/a`
    and `in-ms=n/a`.
  - `popLine` prints what the row prints, and the test checks the row text itself.
  - Following the row is the right layer: the row is the pre-written expected text R5.3 judges by. The session agent
    should add a dated note to form (3); see Findings.
- **Constants:**
  - The module imports `CHOOSER_BUSY_MESSAGE`, `CHOOSER_TIMEOUT_MESSAGE`, `DISABLED_INPUT_MESSAGE`, `ARGS_RELOAD_HINT`,
    `CHOOSER_RELOAD_HINT` and `safetyRefusalLine`.
  - It derives the #398 marker pattern from `formatConsole` and checks the form: `older lines cut`, one number. The live
    first line is `… [truncated: 191 older lines cut — narrow with level/limit]`.
  - Exceptions: NIT-4 and the test literal in MINOR-3.
- **MCP legs (forbidden fix):**
  - The judge reads only the MCP text and `isError`. `exact` means the whole text equals the line, and the text must be
    one line.
  - This matches the product: `mcp/src/tools/registry.ts` `withSafetyRefusals` sends the SDK line, and the MCP SDK's
    `createToolError(error.message)` sends the bare message. `mcp/test/s13-chooser-busy.test.ts` pins
    `[{type:"text", text}]`, `isError: true`.
  - No judge matches the extension's text on an MCP leg.
- **Fixture:**
  - `kept` is a button and a hidden enabled `#in`.
  - `disflip`'s handler is exactly `input.click(); input.disabled = true;`.
  - `disself` is a visible `#dis` disabled from the start, for `css:#dis`.
  - `disbtn` is a button and an `#in` disabled from the start.
  - The reporter gives `clicks`, `input`, `change`, `cancel`, `files` (live), `size` and `digest`, as CHKEPT and
    CHOOSE-REFUSE-DIS read them. The page fetches and sends nothing, and its title `S13 chooser fixture` is named for
    the driver window guard (#367). The 50 ms click de-duplication follows `s12-chooser.js`.
- **Verifier3 NITs:**
  - E: `DOCK_READ_PLACE` is "a tab's DevTools in window X", and the test checks the sheet says it.
  - F: `dockRestoreVerdict` judges the read-back. Closing the reopened pane is rightly left to S5-drivers-C; it is not a
    pure helper.
  - G: `sentinelRows` sends the evaluate tools' counts to R20-ARGS-ORDER and R20-ARGS-OLD, and `actorsVerdict` allows a
    sentinel only on the four tools the R20-LOGS row names, including `tab.evaluate`.
- **The builder's design-local choices:**
  - (a) An MCP-line mismatch is FAIL, and NOT DISCRIMINATING is the driver's call on a reader shown wrong. This is sound:
    it is #373's split between a wrong reader and a wrong text.
  - (b) On a `flip` TIMEOUT, a `self` answer outside the three listed is FAIL. This is sound and mirrors the sheet's own
    rule for `flip`; it is the conservative reading.
  - (c), stated in §5: a `before` control is judged on `attached` only. This matches the sheet's pass sentence, "before-open
    read attached=no".
- **`tsconfig.s6.json` edit:**
  - **It is needed.** A scratch config that extends `.s6` without the new exclude gives exit 2. The errors are TS2304/TS2503
    `chrome`: 26 in `extension/src/tabs.ts`, 9 in `debugger.ts`, 8 in `handlers/upload.ts`, 3 in `inject.ts`, all reached
    through the test's import of `handlers/upload.ts`. The same config with the exclude gives exit 0.
  - **It is acceptable.** It is the same treatment Step 10 S8 gave the s9/s10 tests (#228, `recipes/CLAUDE.md`), it is
    one entry, and `.s13` compiles the file with `chrome` in `types`.
- **Local path / user name:** none in the 5 slice files. One is in the builder's red file (MAJOR-1).

## 5. Findings

**MAJOR-1: a local home path with the user's name in the builder's evidence file.**
- **Where:** `docs/plans/2026-10-29-step13-phase-f-followups-steps/S5-helpers-builder-red.txt:2`.
- **Evidence:** the vitest banner line `RUN v2.1.9 C:/Users/<user>/Projects/chrome-remote-extention` (name redacted here;
  a `grep -i "Users/"` over the new files hits only this line). The file also carries raw ANSI escapes.
- **Why it matters:** the phase doc's STOP rules list "a path … or the user's name in … committed evidence", and #374 bars
  local paths from committed docs. The file sits in the steps dir that the committer stages.
- **Fix:** before commit, strip the ANSI codes and replace the path with `<repo>`, or drop the banner line. Then re-run the
  same `grep`.

**MINOR-2: the cap judge's "newest kept" clause has no test.**
- **Where:** `recipes/test/s13-forms.test.ts:210-237`, covering `recipes/s13-forms.ts:135`.
- **Evidence:** the mutant that removes `s.lastIndex === total && s.firstIndex === total - k + 1` passes all 48 tests. The
  real judge does reject the oldest nine under the new marker (in memory: `FAIL`), but nothing pins that. Every existing
  cap mutant fails on the marker, the gap test or the count instead. #398's core change, which end is kept, is therefore
  the one clause a later edit could lose silently before Run 20.
- **Fix:** add a test that `[<new marker 191>, rows 1..9]` is FAIL (with `last-index=9` read from the stats).

**MINOR-3: the cap verdict says PASS where the sheet says RECORD, and one test string is a copy.**
- **Where:** `recipes/s13-forms.ts:132-136`; `recipes/test/s13-forms.test.ts:192`.
- **Evidence:**
  - R20-CON-CAP pre-states `k = 9` and says "a different `k` with the same rule held is RECORD with the line length", but
    `concap20Verdict` returns PASS for any `k` that keeps the rule.
  - Separately, the extension-text mutant hard-codes the first sentence of the extension's JavaScript-off message, though
    `JS_DISABLED_MESSAGE` is exported from `extension/src/safety.ts`. It is not even the whole message.
- **Fix:**
  - Add an `expectK` (default 9) that returns `RECORD` when the rule holds with another `k`, or state in the module that
    the driver must apply it.
  - Import `JS_DISABLED_MESSAGE` for the mutant.

**NIT-4: two literals where constants exist.**
- **Where:** `recipes/s13-forms.ts:86` and `:153`.
- **Evidence:** `K_DEVT_CODE = "DEBUGGER_DEVTOOLS"` copies `ErrorCodes.DEBUGGER_DEVTOOLS` (`@bridge/shared`). The DevTools
  refusal text is taken from the recipe table `K["K-devt"]` (pinned to a literal in `s11-rules.test.ts`). The product keeps
  that text inside `describeRaw` (`extension/src/debugger-errors.ts:52`), not exported, so `K` is the nearest pinned
  source.
- **Fix:** import `ErrorCodes`. For the text, optionally pin `K["K-devt"].message` against `describeDebuggerError` with
  an "Another debugger is already attached" input.

**NIT-5: some judge inputs are untested or left to the driver.**
- **Where:** `busyExact` (`recipes/s13-forms.ts:88`); `MCP_LINES.chooserOld`.
- **Evidence:** R20-CHOOSE-TWICE also requires "no `data`", but `busyExact` takes no `data`. `MCP_LINES.chooserOld`
  (R20-VERSION's MCP leg) is not asserted against `CHOOSER_RELOAD_HINT` in the "lines come from the product" test, so no
  test kills a mutant there.
- **Fix:** add `data === undefined` to `busyExact`, and add the `chooserOld` assertion.

**NIT-6: the count-refusal test passes without the module.**
- **Where:** `recipes/test/s13-forms.test.ts:137-141` (also the bare `toThrow()` at `:97`, `:134-135`).
- **Evidence:** `expect(() => F.portLine(...)).toThrow()` passes on the stub because calling `undefined` throws. The guard
  removals x01–x03 are still killed.
- **Fix:** `toThrow(/count|integer|fixed code/)`.

**NIT-7 (for the session agent, out of this lane): three doc updates.**
- §4.28 form (3) should get a dated note allowing `n/a` for `active-guard`, as R20-POP-NONE's row prints it.
- `recipes/CLAUDE.md` says "all seven" recipe tsconfigs; there are now 8, and its exclude list should name
  `s13-forms.test.ts`.
- Root `CLAUDE.md:110`'s 5596 is stale: the count is now 5702.

**Handoff note for S5-drivers:**
- `s13-forms.ts` reaches chrome-typed extension sources, so a driver that imports it type-checks only under a config with
  `chrome` in `types`, like `.s13`, or extend `.s13`'s `include`.
- At run time it loads under tsx without `chrome` (my in-memory script imported it).
