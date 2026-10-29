# S8: proposed CLAUDE.md edits (for the session agent; no CLAUDE.md was edited)

Written 2026-10-29 by the S8 builder (Claude Sonnet 5.5, medium). Counts come from `node scripts/doc-check.mjs`
(tools 25, router methods 28, codes 27) and `npm test` (5596 passed, 235 files, 2026-10-29). Gotcha text is taken from the
named decision or record; the session agent checks each against its source before writing it.

## 1. Root `CLAUDE.md`

| Line | Old | New |
|---|---|---|
| 17-18 | `**24 tools, 27 codes (26 on the wire),` / `27 router methods**` | `**25 tools, 27 codes (26 on the wire),` / `28 router methods**` |
| 88 | `the 24 tools` | `the 25 tools` |
| 113 | `vitest — 4665 passed, 191 files (`npm test` 2026-10-27, Step 11b S7-live; recipes/test included)` | `vitest — 5596 passed, 235 files (`npm test` 2026-10-29, Step 12 S8; recipes/test included)` |
| Current state block | "Step 12 mid-phase: S1–S6 built, S7 Run 19 prep in progress" and its Resume bullet | rewrite at the close: Run 19 recorded (#373: 42 PASS, 5 FAIL, 5 ND, 3 NOT MEASURED, 3 RECORD), S8 docs done, phase close next |

Also check the "Step 12 so far" bullet: it says tool, code and method counts "change in Step 12 and are recomputed at S8": they are now 25 / 27 (26) / 28.

## 2. `mcp/CLAUDE.md`

- Line 9 and line 52: `24 MCP tools` / `the 24 tools` become `25`. Add `browser_console_messages` to the tool list wherever the file names tools.
- New gotcha: **The MCP prints its own refusal lines, and a rethrown error has no code on line 1.** An error that is neither a
  safety nor an attach error (`VERSION` from a stale extension) reaches the agent as the bare message; the safety lines are the
  SDK's (`sdk/src/error.ts:119-128`), not the extension's text. A reader that looks for the extension's text or for a code on
  line 1 reads the MCP wrong (Run 19: R19-ARGS-3 FAIL, R19-CON-4, R19-ARGS-OLD, R19-VERSION ND; `mcp/test/safety.test.ts`,
  `mcp/test/s12-args-cross.test.ts`; #373, S7-run-record §4 item 8).
- New gotcha: **`browser_console_messages` output is capped at 20 000 characters and keeps the oldest lines**, with a marker
  `… [truncated: N more lines, the newest — narrow with level/limit]` (R19-CON-CAP PASS; `sdk/test/s12-console-cap.test.ts`).
  The direction is open for the user (#355).

- Line 54 (the trusted-tools bullet): its last sentence, "Focus and input are two calls, so another actor's capture in the same
  window can come between them (… not seen live)", is stale after S6-G2. Replace it with a pointer: the daemon holds the visibility
  lock across both calls and 500 ms after the reply (`daemon/CLAUDE.md`; #338, #354); the live timing row R19-G2-1 FAILED, cause not
  established.

## 3. `sdk/CLAUDE.md`

- New gotcha (measured by S3b): `sdk/test/failure-report.test.ts` fails any `sdk/src` file containing `console.`, a module
  path like `./console.js` included; name console code files otherwise.
- New fact: `formatConsole` lives on the `@bridge/sdk/format` subpath only; the main surface keeps exactly eight values
  (`sdk/test/s12-console-format.test.ts`, last test). `Tab.consoleMessages` and `Tab.upload(…, {chooser})`,
  `evaluate*(…, {args})` are the Step 12 additions (`sdk/test/s12-upload-chooser.test.ts`, `mcp/test/s12-args-cross.test.ts`).
- New gotcha: **`evaluate`'s returned `value` has object keys sorted** (Chrome's `returnByValue`; Stage 0
  `Stage0-measurer1.md:36-37`; R19-ARGS-1 FAIL). Compare as JSON or by key, never by key order. Pre-Step 12, not an `args` defect.

## 4. `extension/CLAUDE.md`

- Line 42: `all 27 router methods` becomes `all 28 router methods`; add `consoleMessages` (class `evaluate`, #334) to the methods the line
  names.
- New gotcha: **Replayed console args carry no `preview`**, so an object logged before the read comes back as its class name
  (`Object`) and an Error inside it loses its message (`stage0-m1-C.txt:216-244` against live args `:277-300`;
  `extension/src/console-messages.ts:168-177`; R19-CON-NOTEA FAIL, A3E:406). A shortened preview fails closed (#344).
- New gotcha: **a same-site frame's console messages are read; a cross-site frame in another process is not** (R19-CON-FRAME
  PASS: 13 entries without the block pattern, 2 with it, 2 for the out-of-process frame). The MCP tool description still says
  only "frames are not read".
- Revisit the "one debugger per tab, DevTools wins" bullet (#369): on Chrome 156 docked DevTools did not make `chrome.debugger`
  refuse the bridge (DEVPROBE `answer=ok attached=no`, 31 of 31 `ok`; Run 18's F12 probes the same). Undocked DevTools and
  DevTools opened before the first attach are unmeasured. The user rules whether to keep the claim; until then add the
  measurement beside it, do not delete it.
- New fact, the kept session (`extension/src/debugger-keeper.ts`, `extension/test/debugger-keeper.test.ts`): idle detach at 5 s;
  live, the idle detach ended the banner a median 5.1 s later than an immediate drop (R19-KEEP-2 PASS); the banner's
  steadiness across calls is not shown live (R19-KEEP-1 banner clause ND).
- New fact: replayed messages are replayed again by a second `Runtime.enable` in a kept session (R19-CON-KEPT PASS,
  `first=11 second=11 equal=yes`; #352).
- New fact: the hello lists `features: ["evaluateArgs", "uploadChooser"]` (`extension/test/s12-args-call.test.ts`, last test).
- New fact, the chooser: a disabled-input refusal is reached only after a chooser opens; a page whose button calls `click()` on a
  disabled input never opens one (HTML spec), so the live row cannot reach it (R19-CHOOSE-REFUSE ND, #370); unit-tested in
  `extension/test/s5a-chooser.test.ts`. Two chooser calls with the same file left the page's `change` at 1 (R19-CHOOSE-KEPT
  FAIL, cause not established).
- Banner: Run 18's `seen` on refused uploads did not reproduce at 20 s idle with a passing control (R19-UP-6, R19-F-RAW family
  PASS); no attach counter exists (#351 (2)).

## 5. `daemon/CLAUDE.md`

- New fact (S6-G2, #338, #354): a trusted `click`/`type`/`pressKey` without `focusEmulation` holds the visibility lock from a
  daemon-forwarded `focusTab` through the input and 500 ms after the reply (`TRUSTED_SETTLE_MS`, `daemon/src/methods.ts`;
  `daemon/test/s6-trusted-focus.test.ts`). Live: R19-G2-2 PASS (5 of 5 intact strings); R19-G2-1 FAIL, the other client's screenshot
  got `TIMEOUT` at about 35 s, cause not established (a covered-window capture hang fits, is not shown).
- New fact: `VERSION` for a featureless extension: `ARGS_RELOAD_HINT` for `evaluate`/`evaluateSaveStart` `{args}` and
  `CHOOSER_RELOAD_HINT` for `uploadFiles {chooser}`, nothing forwarded (`daemon/src/intercept.ts:41-45`,
  `daemon/test/s12-args-feature.test.ts`, `daemon/test/s12-chooser-feature.test.ts`). The feature belongs to its socket.
- `daemon/src/methods.ts`: `consoleMessages` is a lease-checked tab method with no visibility lock (counts: 28 router methods).

## 6. `recipes/CLAUDE.md` (gotcha candidates of #364-#373)

- **#364 / #365:** a scratch worktree with its own `npm ci` still holds `node_modules/@bridge/*` junctions that
  `git worktree remove` cannot delete; remove them one by one first (as #220). Git Bash's `cmd //c rmdir` leaves junctions in
  place; PowerShell's `cmd /c rmdir` removes them.
- **#366:** a pass constant copied from a fake-extension test is not a measurement: control-2's `kind: "function"` for
  `evaluate "function f() {}"` was wrong; a real page answers `kind=undefined` (a declaration), `(function f() {})` answers
  `function` (A3E:154, D2E:166). The scripted MCP actor must wait for its link ("connecting to the bridge daemon") before the first call.
- **#367:** the driver window guard refuses unknown fixture window titles; a new fixture page's title must be added to it.
- **#368:** `{css:"body"}` (also `html`, `head`) never matches in the locator walk; Chrome 156's app-menu button is named
  `Chrome`; a STOP leaves windows open, so list them after it.
- **#369:** Chrome 156 docked DevTools did not refuse the bridge's debugger (see extension above); the Chrome 156 app-menu facts of
  liveB19's opener (UIA patterns only) belong here.
- **#370:** a fixture button that calls `click()` on a disabled input opens nothing (HTML spec); a row about the disabled-input
  refusal needs a handler that targets the input itself.
- **#371:** `Save-R19Seg` must close the worker-console capture window it opened; `Close-S11Window` closes only `S11Own` windows, and
  each reopen leaves a `chrome://extensions` window (the `devtools-left-open` STOP).
- **#372 / #373:** MCP text is read by the MCP's own lines (see mcp above). A row whose reader is shown wrong is ND; a wrong
  expected text in the sheet leaves it FAIL (#195). The name in committed docs stays the user's call (#372).
