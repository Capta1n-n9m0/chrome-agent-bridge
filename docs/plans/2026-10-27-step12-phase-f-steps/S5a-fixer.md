# Step 12 S5a — the native file chooser, the extension side: fixer report (round 1)

Model / effort: Opus, medium. Role: fixer (`docs/agent-rules.md` §6). Date: 2026-10-28. Findings fixed: V1, V2, V3, V8
of `S5a-verifier.md` §6. Layer followed: the brief and the verifier's proposed decision (§5). Nothing was committed.

## 1. Verdict

**DONE.** All four findings are closed. The keeper, `debugger.ts`, `sw.ts`, `safety.ts`, `shared/` and the input
(no-chooser) path are untouched by this round.

## 2. Outputs

**V2: the gate is re-checked after the chooser event** (`extension/src/upload-files.ts`, `extension/src/handlers/upload.ts`)
- `ChooserDeps` has a new optional field, `effect?: () => Promise<void>`. `setFilesByChooser` runs it after the event
  has arrived (after the no-event `TIMEOUT`) and before the `backendNodeId` / `mode` checks and `DOM.describeNode`.
- If the effect refuses, the error is thrown inside the `try`. So the `finally` sends the interception off and
  `Page.disable`, and the use ends with an error, which makes the keeper drop the session. `files: []` is never sent.
- The refusal is rethrown through `markOwnRefusal`. Without that, `withDebugger`'s `mapError` would prefix the message
  with `[chrome.debugger]` (measured: the first run of the new row failed exactly so). With it, the gate's own code,
  message and data pass through unchanged, as they do from the keeper's re-check before the use.
- `chooseByMark` passes `effect: call && (() => call.effect())`.

**New rows** (each one shown to fail without the fix: with the `await deps.effect?.()` line removed, 3 failed / 43
passed, among them both new V2 rows; restored afterwards)
- `s5a-chooser.test.ts`, "V2: a disarm or a block between the click and the event…". The 4th handler effect (the first
  one after the event) refuses, once with `DISARMED` and once with `DOMAIN_BLOCKED`. Each case checks:
  - the wire answer is the gate's own, unprefixed;
  - 0 `DOM.describeNode` and 0 `DOM.setFileInputFiles`;
  - `offs() === 1`;
  - the log after the click is exactly `Runtime.evaluate, effect, intercept off, Page.disable, detach, page:unmark`;
  - the mark is swept.
- `s5a-chooser-keeper.test.ts`, "V2: the gate refusing after the event…". The same refusal goes through the keeper.
  The off step is sent, `[attach, detach] = [1, 1]` (the session is dropped at once), and there are 0 `describeNode`
  and 0 `setFileInputFiles` calls.
- **V8:** `s5a-chooser.test.ts`, in the `GatedRouter` describe. `chooser: true` with `[OUTSIDE]` and with
  `[P1, OUTSIDE]`, JavaScript on, answers `UPLOAD_REFUSED` `UPLOAD_REFUSED_MESSAGE`. The CDP counter (attach +
  sendCommand) is 0, there is no `executeScript` and no file probe.
- **One S5a test changed.** The expected log of the S5a success row (`s5a-chooser.test.ts`, "success: tab → file access
  → …") now has an `effect` before `DOM.describeNode`. This is the change V2 asks for. The test is uncommitted S5a
  work in this lane, not an existing tracked test. `fakeCall` gained an optional `refusal` factory.

**V3 and V1: the spec note** (`docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md`, §10's S5a note)
- The step list names the gate re-check after the event (V2).
- The transient-activation sentence is now marked **by construction, unmeasured**, with no Stage 0 row and no source
  cited. It names the live row it needs before S5 ships:
  - a front fixture tab whose clicked element opens its chooser by `setTimeout` at about 4.9 s after the click, and in
    a second run at about 5.1 s;
  - pass rule: Chrome's own file dialog never shows.
- A new "limit" bullet states V1, marked by construction and unmeasured, with behaviour unchanged. On a front tab, a
  chooser the human opens while the interception is on is taken:
  - opened before the call's click, it is intercepted and freed only by the off step;
  - opened after the click, within the wait, it may receive the call's paths (which are always inside the Upload
    folders).

**Checks** (run on the final tree)
- `npx vitest run`: **5072 → 5075 passed, 214 files** (+3, none removed).
- `npm run typecheck`: exit 0. All seven `recipes/tsconfig*.json`: exit 0. `npm run build`: exit 0.
- `git status --short` was identical before and after the build.
- Log sites: +0. The diff over `extension/src` adds 0 `console.` lines, and the log allowlist is untouched (54).
- **Size** (`git diff HEAD --numstat`, `wc -l`):
  - Code: 253 (`upload-files.ts`) + 105 (`handlers/upload.ts`) + 5 (`safety.ts`) + 7 (`protocol.ts`) = **370 / 550**.
  - Tests: **783 / 825** (the three new files).
  - The spec note: 61 lines.

## 4. Deviations

- One uncommitted S5a test's expected log was edited (see above), as V2's own consequence.
- The `markOwnRefusal` wrap was not named in the brief. It is needed so the refusal reads as the gate's own answer
  rather than a debugger failure.

## 5. Proposed decisions

### 2026-10-28 · S5a fixer: the after-event gate refusal passes through unprefixed
**Decided:** the refusal raised by the re-check after the chooser event is marked as an own refusal, so the agent gets
the gate's exact code, message and data. **Why:** the same refusal from the keeper's re-check before the use is
unprefixed; a `[chrome.debugger]` prefix would make a disarm read as a debugger failure. **Instead of:** letting
`mapError` prefix it. **Revisit if:** a gate refusal ever needs to be told apart from an own one inside a session.
**By:** Claude (proposed)

## 6. Findings

- No pre-registered check failed.
- No new runtime fact: nothing ran against Chrome.
- V2's optional part (closing the waiter when the session is killed, so a disarm during the wait answers at once
  rather than at 5 s) is not done. It needs the keeper, which is out of lane. It stays a note for a later slice.

## 7. Handoff

- Nothing is running. Only `dist/` was rebuilt, which git ignores.
- A fresh verifier re-checks V1, V2, V3 and V8.
- The late-opener row and the human-click row belong in §4.27, before S5 closes.
