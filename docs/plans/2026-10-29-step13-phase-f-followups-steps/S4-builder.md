# Step 13 S4 — builder report (small fixes: the second-chooser text, the settle pause's release)

**Verdict: DONE.** Builder, Opus, medium effort. HEAD at start `33ba954`. Not committed.

## 1. What was built

**(1) The second-chooser text (#389, option (a); T4.1).**
- Spec first: a dated note `Note 2026-10-29 (Step 13 S4; …)` at the end of §10's amendments in
  `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md`, citing #389 and the phase doc 0.6. It says the S5a bullet
  ("with the text an overlapping debugger use answers today (#335)") no longer holds and states the new text.
- `extension/src/handlers/upload.ts`: new exported constant `CHOOSER_BUSY_MESSAGE`:
  `uploadFiles: another file chooser upload is still running on this tab; retry after it ends`.
  `chooserUpload` throws `new BridgeError(ErrorCodes.DEBUGGER_DEVTOOLS, CHOOSER_BUSY_MESSAGE)` when `chooserTabs.take`
  fails, in place of the borrowed `describeDebuggerError` overlap text; the now unused `describeDebuggerError` import is
  removed; the function's JSDoc names the new text. Same code, same moment (after the prologue, before any page call or
  attach). `extension/src/debugger-errors.ts` untouched.

**(2) The settle pause's release (#390; T4.2).** `daemon/src/intercept.ts:577`:
`void this.sleep(pause).then(release, release);` (was `.then(release)`).

## 2. Tests (failing first)

| Test | File | Red before the fix | Green after |
|---|---|---|---|
| second chooser call: code `DEBUGGER_DEVTOOLS`, message `=== CHOOSER_BUSY_MESSAGE`, the literal pinned, no `/devtools/i`, no digit (no tab id) | `extension/test/s5a-chooser.test.ts` | yes (`expected 'Chrome DevTools (or another extension…' to be undefined` — the constant did not exist) | yes |
| `describeDebuggerError`'s overlap text, byte for byte (the other paths unchanged) | same file | green (a guard, not a change) | yes |
| a rejecting injected `sleep`: the trusted click replies, the lock holder is `undefined` right after, B's screenshot is forwarded under holder `b` and answers; `process.on("unhandledRejection")` collects nothing (real timers, three `setImmediate` turns) | `daemon/test/s6-trusted-focus.test.ts` (`setup` gained an optional `sleep`, spread into the `TabLayer` deps) | yes (`expected 'a' to be undefined`, plus vitest's `Unhandled Rejection: Error: sleep failed`) | yes |
| MCP: a `DEBUGGER_DEVTOOLS` carrying the chooser-busy text, through a real `tools/call` over the MCP SDK's in-memory transport, is `isError: true` with exactly one text item equal to the bare message, no DevTools | `mcp/test/s13-chooser-busy.test.ts` (new) | green before the fix (expected: it pins how the MCP already renders a rethrown non-attach, non-safety error; it uses a pinned literal, not the extension's constant) | yes |

Red run: `S4-builder-red.txt` (3 failed: the two new red tests and one collateral, the next test in
`s5a-chooser.test.ts`, which failed only because the red test left tab 5's chooser slot taken; green after the fix).
Green run: `S4-builder-green.txt` (4 files, 79 tests, `log-scan.test.ts` included). The red run was taken in the main
tree by writing the tests before the fix (allowed by the brief); no revert, mutant or worktree was used.

## 3. Checks (own runs)

- `npm test` before: **237 files, 5650 passed** (`S4-builder-test-before.txt`). After: **238 files, 5654 passed**, no
  failures (`S4-builder-test-after.txt`). +4 tests: 2 extension, 1 daemon, 1 MCP; no test removed or edited (the daemon
  `setup` helper gained an optional parameter; existing calls unchanged).
- `npm run typecheck`: exit 0 (`S4-builder-typecheck.txt`).
- The seven `npx tsc --noEmit -p recipes/tsconfig*.json`: all exit 0 (`S4-builder-recipes-tsc.txt`).
- `npm run build`: exit 0 (`S4-builder-build.txt`). `git status --short` after: only the five edited tracked files, the
  new MCP test and this report's evidence; no build output tracked.
- Counts: no code added (27 codes, 26 on the wire, unchanged); no method; no log call (`log-scan.test.ts` and
  `recipes/test/s11-rules.test.ts` unchanged and passing in the full run); `debugger-errors.ts` untouched.

## 4. Size

New lines (git numstat + new file): intercept 1, daemon test 33, spec 8, upload.ts 4 (6 removed), extension test 28,
MCP test 52 = **126** of the 150 cap.

## 5. Deviations and notes

- None from the brief. No daemon on 9234, no reload; the MCP test uses an in-memory transport, no socket.
- The MCP test was green before the fix by design (T4.1's MCP clause is a rendering check, #389); the verifier's
  red-on-pre-slice proof applies to the extension and daemon tests.
- The E5.3 "no path in any chooser message" list (`s5a-chooser.test.ts`) does not include the new constant; the new
  test asserts the text is fixed and carries no digit instead.

## 6. Proposed decisions

None.
