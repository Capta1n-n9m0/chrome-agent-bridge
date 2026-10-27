# Stage 0 — auditor 1 report

Claude Opus 5.5, effort medium. Read-only; Chrome, the daemon and port 9234 untouched; no commit.

## 1. Verdict
DONE. The audit is `stage0-audit.md` (sections: Counts, Contracts on port 0, cited claims, Findings F1–F20, Exit-check
table, blind spots, §4.x numbers). No CRITICAL; 11 MAJOR, 7 MINOR, 2 NIT, every one plan-side except F3 (code-side
with a plan note).

## 2. Outputs
- `stage0-audit.md`; evidence `stage0-a1-files.txt`, `stage0-a1-counts.txt`, `stage0-a1-npmtest.txt`,
  `stage0-a1-contracts.txt`, `stage0-a1-code.txt` (all in `docs/plans/2026-10-27-step12-phase-f-steps/`).
- Counts at `0ba82f6`: 24 tools, 27 router methods (sw.ts and `METHOD_CLASSES`), 27 codes (26 on the wire: 9 + 17,
  plus `NO_CURSOR`), log-scan allowlist 54, `npm test` `4665 passed (4665)` in `191` files. All match the phase doc;
  the post-scope 25 / 28 / 27 is consistent.
- Contracts on port 0: Step 9 32 files / 1071 tests, Step 11 16 / 501, Step 11b 15 / 504 (the set taken from the test
  files of Step 11b's code commits, § As built), all exit 0.
- Run 18 → §4.26, Run 19 → §4.27.

## 4. Deviations
None. The npm-test evidence file was trimmed to its summary lines (the raw output held a local path).

## 5. Proposed decisions
### 2026-10-27 · Step 12: an `args` reply carries a marker, and its absence means an old extension
**Decided:** the extension marks a reply to `evaluate`/`evaluateSaveStart` sent with `args`; the SDK maps a missing
marker to `VERSION` on `evaluate`, `evaluateRef` and `evaluateToFile`. **Why:** `kind: "function"` is a real result too
(F1). **Instead of:** 0.4's `kind` test. **Revisit if:** Stage 0 finds a reply field already set by the old path.
**By:** Claude (proposed, contract-level, for user review)

### 2026-10-27 · Step 12: E stays class `upload` with the JavaScript switch not applied
**Decided:** the chooser's click is a bridge-written `click()`, as the class-`tab` `click` already does with JavaScript
off. **Why:** consistent with today's classes; #325's reading needs a parameter-aware gate outside S5's lane (F9).
**Instead of:** `JS_DISABLED` on the chooser path. **Revisit if:** the user prefers the strict reading. **By:** Claude
(proposed, contract-level, safety, for user review)

## 6. Findings
The top items for the session agent (the full list is in the audit):
- **F3, F4, F6 (D):** an idle kept session is outside `debuggerSessions` (so a disarm misses it); a block-list edit
  fires no `onUpdated`; a worker restart with a session attached is unmeasured. Each is a STOP if built as written.
- **F5 (D):** two calls on one tab overlap into `DEBUGGER_DEVTOOLS` today and would both run on a shared session, and
  session state bleeds between calls: "answers do not change" is false.
- **F1, F11 (B):** the `VERSION` precedent is `BAD_PARAMS` and cannot tell a real function result from an old
  extension; `callFunctionOn` loses today's sync-code `timeout`, and the `userGesture`.
- **F8 (C):** stacks in `exception.description`, the replay of messages logged while disarmed, blocked frames.
- **F2, F7, F10:** the tables split across S3a/S3b with no linking test; no `chrome.debugger.onEvent` exists for C and E;
  the S2 and S5 lanes miss `sdk/src/evaluate-save.ts`, `sdk/src/client.ts` and `extension/src/debugger.ts`.
- Exit checks rewritten: B2.1, B2.3, C3.1, C3.4, D4.2, E5.2, S8.1 (doc-check can never fail).
No new runtime fact for a `CLAUDE.md`, except one fact read in the code: the daemon forwards an unlisted method that
carries `tab` as a tab method, so a missing `methods.ts` line is invisible to every test (`daemon/src/methods.ts`
`classify`).

## 7. Handoff
No process left running. The measurers should add: a worker restart with a session attached (F6), `Runtime.terminateExecution`
after a `callFunctionOn` timeout (F11), `Page.enable` for `Page.fileChooserOpened` (F16).
