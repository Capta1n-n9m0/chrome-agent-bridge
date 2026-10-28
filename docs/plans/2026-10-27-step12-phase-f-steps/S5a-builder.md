# Step 12 S5a — the native file chooser, the extension side: builder report

Model / effort: Opus, medium. Role: builder (`docs/agent-rules.md` §6). Date: 2026-10-28.

## 1. Verdict

**DONE.** `uploadFiles {chooser: true}` is built in the extension on the call's own session through S4b's keeper. One
shared prologue serves both paths, the gate has a `chooser` params rule for JavaScript off, and the shared guard
accepts the param. E5.1–E5.3 hold, the brief's extra checks hold, and both mutants are red. Live behaviour is
unmeasured: see §7 for the rows.

## 2. Outputs

- **Spec note first** (to be committed alone, before the code): `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md`
  §10, "Amended 2026-10-28 (Step 12 S5a …)". It covers the param, the shared prologue, the step list, the refusals,
  one chooser call per tab, and the JavaScript rule. It adds 49 lines.
- **Files changed** (`git diff --numstat HEAD`, added/removed):
  - `extension/src/upload-files.ts` 243/0
  - `extension/src/handlers/upload.ts` 105/7
  - `extension/src/safety.ts` 5/1
  - `shared/src/protocol.ts` 7/3
  - the spec 49/0
- **New untracked files:**
  - `extension/test/s5a-chooser.test.ts` (613 lines, 41 tests)
  - `extension/test/s5a-chooser-keeper.test.ts` (96 lines, 2 tests)
  - `shared/test/protocol-s5a.test.ts` (21 lines, 1 test)
  - this report
- **Size (#344 (4)):** code 360 of 550; tests 730 of 825.
- **Tests:** `npx vitest run` before: `Test Files 211 passed (211)`, `Tests 5028 passed (5028)`. After: `Test Files 214
  passed (214)`, `Tests 5072 passed (5072)`. That is +44, all in the three new files. None removed, and no existing
  test file was edited (`git diff --stat HEAD -- extension/test shared/test` is empty).
- **Checks** (all after the change):
  - `npx tsc --noEmit -p shared/tsconfig.json` exit 0, and the same for `extension/tsconfig.json`.
  - `npm run typecheck` exit 0.
  - `recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b}.json` each exit 0.
  - `npm run build` exit 0.
  - `git status --short` shows only the five modified sources and the three new tests: the build changed no tracked
    file.
  - Log sites: +0. There is no `console.` in `upload-files.ts` or `handlers/upload.ts`, and `log-scan.test.ts` passes
    unchanged with the allowlist at 54.
  - `daemon/`, `sdk/`, `mcp/`, `debugger.ts`, `debugger-keeper.ts`, `sw.ts` and `handlers/console.ts` are untouched.
- **New tests fail on the pre-slice code.** I checked this in a scratch worktree at HEAD (`npm ci` there, no junction;
  removed afterwards, with its workspace links unlinked by `rmdir` first). The three new files were copied in and run:
  `Test Files 3 failed (3)`, `Tests 3 failed (3)`.
  - `s5a-chooser.test.ts` fails at load, because its imports do not exist on HEAD.
  - Both keeper tests fail on behaviour (HEAD ignores `chooser` and runs the input path).
  - The guard test fails on behaviour (HEAD accepts `chooser: "true"`).
  - Behaviourally, the "input path" legs of the E5.2 `describe.each` and the GatedRouter "controls" test are the
    reference half of a sameness check and would hold on HEAD. On HEAD they fail only because the file cannot load. Each
    chooser leg ends with a success run that asserts the chooser step list, which is red on HEAD's behaviour.
- **Mutants (each reverted from a copy, `git diff` re-checked):**
  - (M1) **The off step skipped on an error** (a mutant `finally` that switches the interception off only after
    success): 17 tests red, among them every E5.1 error row, the TIMEOUT, each input rule, the handler's refusal,
    disarm and TIMEOUT rows, and the keeper refusal row (`Tests 17 failed | 26 passed (43)`). Evidence:
    `…/scratchpad/mutant-off.txt` (session scratch, not committed).
  - (M2) **The gate's `chooser` rule removed:** 2 red, the GatedRouter `JS_DISABLED` row and the chooser leg of the
    gate row (`Tests 2 failed | 39 passed (41)`).

## 3. Exit checks

- **E5.1:**
  - The step list is `CHOOSER_STEP_METHODS`: `Page.enable` → intercept on → `Page.getFrameTree` →
    `Page.createIsolatedWorld` → `Runtime.evaluate {userGesture: true}` → `DOM.describeNode` → `DOM.setFileInputFiles
    {files, backendNodeId}` → intercept off → `Page.disable`.
  - The fake counts the off step on every path: success; seven error points; the TIMEOUT; five input-rule refusals;
    mark gone or not unique; disarm mid-session; and a failing off step that does not mask success.
  - M1 is red.
- **E5.2 (as rewritten, stage0-audit.md §5):**
  - `uploadPrologue` (params, tab, file-URL check, missing-file check) is the one function both paths call.
  - `describe.each` runs the same prologue tests on both paths: caps, target required, toggle off, missing file. It
    also runs the same gate rows on both paths: folders inside and outside, malformed `paths`, a blocked tab, a `file:`
    tab, disarmed, and a gone tab, in all three phases.
  - The chooser's own input rules are tested separately: no `backendNodeId`, `mode` against the path count (an unknown
    mode fails closed), `webkitdirectory` and `disabled` by `DOM.describeNode`.
- **E5.3:**
  - Without `chooser`, the existing upload tests pass unedited, including `s3-upload-handler.test.ts`, which pins the
    input path's order and step list.
  - No path, segment or mark appears in any chooser message (a test collects them); there are 0 console calls.
  - Log sites +0.
- **The brief's extra checks:**
  - `JS_DISABLED` for `chooser: true` (also `"yes"` and `1`) through `GatedRouter`: attach + `sendCommand` 0,
    `executeScript` 0, no probe. The controls: JavaScript off without `chooser`, with `false` or with `null` uploads;
    JavaScript on with `chooser` uploads.
  - The no-chooser `TIMEOUT` comes at exactly 5 s and is unprefixed.
  - A refusal after the click ends the chooser: the off step, `Page.disable`, then the detach. Through the keeper the
    session detaches at once on a refusal and is kept on success. `files: []` is never sent.
  - One chooser per tab: a second chooser call answers `DEBUGGER_DEVTOOLS` (today's overlap text), with no page call or
    attach. The tab is free again after success and after a failure.

## 4. Deviations

- **No content-script method was added.** `content/index.ts` is outside the lane, so the target is marked by a
  closure-free `executeScript` function in `upload-files.ts` (`CHOOSER_MARK_PAGE_FN`). It reads the exposed
  `__agentBridge.refs` and returns the content script's own `REF_STALE` marker. `content/upload-target.ts` is
  therefore unchanged. Unlike `markUploadTarget`, the chooser mark does not sweep stray marks of other values; the
  clicker matches only this call's value.
- **Five new fixed texts.** `CHOOSER_TIMEOUT_MESSAGE` and the no-input refusal are allowed by #325 and #336.
  `CHOOSER_PARAM_MESSAGE` (`uploadFiles: chooser must be true or false`) is not named by a decision (see §5, item 4).
  Two breakdown phrasings inside today's `file upload: …; nothing was uploaded` form are also new: "the click failed"
  and "no node description".

## 5. Proposed decisions

### 2026-10-28 · S5a: the chooser's click runs in the upload's isolated world
**Decided:** the clicker runs by `Runtime.evaluate {userGesture: true, contextId}` in a `Page.createIsolatedWorld` world, as today's finder does. It calls `click()`, or dispatches a `click` event for a non-HTML element. **Why:** #248's reason holds: a page-patched `click` is not called. **Instead of:** the main world, the world Stage 0 m2 E2 most likely used. **Revisit if:** the chooser's first live row (CHOOSE-1) shows no event from the isolated world. Then the click moves to the main world. **By:** Claude (proposed)

### 2026-10-28 · S5a: one chooser per tab answers today's overlap text
**Decided:** a second chooser call on a tab whose chooser call is in flight answers `DEBUGGER_DEVTOOLS` with `describeDebuggerError`'s "Another debugger" text. It does so after the prologue and before any page call. **Why:** #335 keeps an overlap's answer as today, and no new code or text is needed. **Instead of:** a new message, which would say plainly that a chooser is already open. **Revisit if:** the user prefers a precise text. **By:** Claude (proposed, contract-level, for user review)

### 2026-10-28 · S5a: the chooser's input rules by `DOM.describeNode`; unknown `mode` fails closed
**Decided:**
- `webkitdirectory` refuses `DIRECTORY_INPUT_MESSAGE` and `disabled` refuses `DISABLED_INPUT_MESSAGE`, both read from
  `DOM.describeNode`'s attributes (stage0-audit F9).
- More than one path with a `mode` other than `selectMultiple` refuses `SINGLE_FILE_INPUT_MESSAGE`.
- A missing node description is an `INTERNAL` breakdown.
- The mark gone or not unique reuses today's `UPLOAD_MARK_GONE_MESSAGE` and `UPLOAD_MARK_NOT_UNIQUE_MESSAGE`, although
  their wording says "file input".

**Why:** existing texts, and fail-closed defaults. **Instead of:** new texts for a non-input target. **Revisit if:**
the user wants the mark-gone text reworded for a chooser target. **By:** Claude (proposed; the texts for user review)

### 2026-10-28 · S5a: `chooser` values, and the gate's JavaScript rule fails closed
**Decided:**
- The handler takes `true` as the chooser path. `false`, `null` and absent take the input path. Anything else is
  `BAD_PARAMS "uploadFiles: chooser must be true or false"`.
- The gate refuses `JS_DISABLED` for any `chooser` that is not `undefined`, `null` or `false`, in every phase.
- The shared guard (`isUploadFilesParams`) accepts only a boolean. It is stricter for clients; null is not sent by
  the SDK or MCP.

**Why:** the conservative reading of #336, applied to junk values too. **Instead of:** refusing only `true`. **By:**
Claude (proposed, contract-level, for user review)

### 2026-10-28 · S5a: the wait is armed at the click and lasts 5 s from its reply
**Decided:**
- The waiter ignores any `Page.fileChooserOpened` before the click's `Runtime.evaluate` is sent, and any child
  session's or other tab's event.
- The 5 s bound starts after the click's reply. The click's transient activation therefore lapses before the
  interception goes off, so a late chooser cannot open Chrome's dialog (F16).
- The off step's and `Page.disable`'s failures are swallowed. The command is tracked by `send`, so a kept session is
  dropped (S4b).

**Why:** F16; S4b's `UseCommands`. **Revisit if:** a live row shows a chooser opened after the bound. **By:** Claude
(proposed)

## 6. Findings

- No pre-registered check failed.
- **By construction, unmeasured:**
  - A disarm during the 5 s wait detaches the session at once, which ends the interception. The call itself answers
    `DISARMED` only when the wait ends, up to 5 s later: the worker does not see its own detach, and `sw.ts` is
    outside the lane.
  - A human's own chooser on the same tab inside the 5 s window would be taken as the call's. The tab is normally in
    the background, where the chooser is cancelled at once without interception (m2).
- `DOM.describeNode` without `DOM.enable` is unmeasured on Chrome 156.
- No new runtime fact: nothing ran against Chrome.

## 7. Handoff

- Nothing is running; no port is bound; the scratch worktree is removed (`git worktree list` shows main only;
  `node_modules/.bin` has 42 entries, unchanged).
- **Commit order:** the spec note alone first, then the five sources and three tests.
- **S5b needs:**
  - SDK `tab.upload(target, paths, {chooser: true})`.
  - MCP `browser_upload_file {chooser}` and the #214 re-baseline.
  - The SDK's JavaScript-off line, if any.
  - `docs/setup.md`.
- **Live rows the chooser needs (S5b/S7, §4.27; fixture pages only):**
  - CHOOSE-1: a `<button>` whose click calls a hidden input's `click()`, on a background tab. Expect `{files: 1}`, the
    page's `change` count +1, and no dialog. This proves the isolated-world `userGesture` click.
  - CHOOSE-2: the target is a `<label for>` and the input itself; `multiple` with two paths gives `{files: 2}`.
  - CHOOSE-3: the target opens nothing. Expect `TIMEOUT` with the fixed text after ≈5 s, and no dialog afterwards.
  - CHOOSE-4: after each chooser call, a human-style click on the same input opens Chrome's own dialog. The wave closes
    it.
  - CHOOSE-5: `showOpenFilePicker` gives the no-input refusal. A single input with two paths, a `webkitdirectory`
    input and a `disabled` input give their refusals, and the page's input is unchanged.
  - CHOOSE-6: JavaScript off gives `JS_DISABLED` with nothing on the page (no `click` event).
  - CHOOSE-7: two concurrent chooser calls on one tab; the second gives `DEBUGGER_DEVTOOLS`.
  - CHOOSE-8: a disarm during the wait gives `DISARMED` within ≤ 5 s and leaves no interception (the next human click
    opens the dialog).
  - CHOOSE-9: a path outside the Upload folders gives `UPLOAD_REFUSED`; with the file-URL toggle off, also
    `UPLOAD_REFUSED`; a missing file gives `BAD_PARAMS paths[i]`.
  - CHOOSE-KEPT: two sequential chooser calls share one kept session, and the banner stays steady.
  - CHOOSE-FRAME: a same-origin iframe's button (whether activation reaches the child frame is unmeasured).
- The loaded extension does not have this build; the wave reloads it (`recipes/reload-extension.ps1`).
