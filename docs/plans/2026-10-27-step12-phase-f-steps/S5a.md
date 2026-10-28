# S5a — the native file chooser: the extension side (step report)

Step agent: Opus, effort medium. Children: builder, fixer and both verifiers Opus (medium); committer Sonnet (medium).
READ list given to the builder and verifiers: phase doc §0.7, §0.10, § S5, E5.1–E5.3, § Exit checks (Every stage),
§ STOP rules and forbidden fixes, the dated note under § Stage 0; decisions #325, #327, #335, #336, #344 (4), #347,
#352 and the Step 11 upload rules they cite (#236, #237, #245, #247, #257, #284, #288, #299); Stage0.md §4 (E rows),
§6 (S5a row); Stage0-measurer2.md (E1–E8); stage0-audit.md §4 F9, F16, §5 E5.2; S4b.md §2 and Handoff; spec §10; the
CLAUDE.md files of extension/, extension/src/, extension/src/content/, extension/src/handlers/.

## 1. Verdict

**DONE.** `uploadFiles {chooser: true}` is built in the extension, with one fix round. The spec §10 note is committed
alone, before the code.

## 2. Outputs

- Commits: spec note `<NOTE>`, then code `<CODE>` (see §7 for the file list).
- Code: `extension/src/upload-files.ts`, `extension/src/handlers/upload.ts`, `extension/src/safety.ts` (the `chooser`
  params rule: `JS_DISABLED` while JavaScript is off), `shared/src/protocol.ts` (the `chooser` param in the guard).
  `extension/src/content/upload-target.ts` is unchanged (see §4).
- Tests: three new files, `extension/test/s5a-chooser.test.ts`, `extension/test/s5a-chooser-keeper.test.ts`,
  `shared/test/protocol-s5a.test.ts`. No existing test file edited.
- `npm test`: 5028 passed (211 files) → 5072 (builder) → **5075 passed, 214 files** (fixer; re-derived by verifier 2),
  none removed.
- `npm run typecheck`, all seven `recipes/tsconfig*.json`, `npm run build`: exit 0; no tracked change after the build
  (verifier 2). Log sites +0, allowlist 54.
- Size (verifier 2's count): 370 of 550 code lines, 783 of 825 test lines.
- New tests fail on the pre-slice code: all 3 files fail at HEAD in a scratch worktree (verifier 1, §2).

## 3. Verifier verdict

- `S5a-verifier.md` (+ `S5a-verifier-evidence.txt`): **PASS-with-notes**, 17 mutants all red, among them E5.1's
  (interception off skipped on an error: 17 red). Findings V1–V4 MINOR, V5–V9 NIT.
- Fix round 1 (`S5a-fixer.md`) closed V1 (spec limit stated), V2 (gate re-check after `Page.fileChooserOpened`, before
  `DOM.describeNode`), V3 (the transient-activation sentence marked unmeasured, its late-opener row named) and V8 (a
  `GatedRouter` row: a path outside the Upload folders with `chooser: true`, `UPLOAD_REFUSED`, CDP 0).
- `S5a-verifier2.md`: **PASS-with-notes**. Five mutants all red (E5.1's: 19 red). Notes N1 (the V1 limit names no
  live row in the spec; carried in Handoff) and N2 (a disarm during the 5 s wait answers `DISARMED` only at 5 s; fails
  closed; needs the keeper, out of lane).
- Not fixed, carried as notes: V4 (text of the second-chooser refusal), V5 (`chooser` message; `null` accepted by the
  handler, refused by the guard), V6 (isolated-world click and `DOM.describeNode` without `DOM.enable` unmeasured;
  both fail closed), V7 (the mark set by a page function duplicating the content script's `REF_STALE` text), V9 (a
  post-check refusal after the files were set, as with `evaluate`).

## 4. Deviations

- **No content-script method:** `content/index.ts` is outside the lane, so the chooser target is marked by an
  `executeScript` page function in `upload-files.ts` reading `__agentBridge.refs` (V7). `content/upload-target.ts`
  unchanged.
- **New fixed texts:** the chooser `TIMEOUT` and the no-input refusal (allowed by #325/#336); `uploadFiles: chooser must
  be true or false` (no decision names it; proposed below); two breakdown phrasings inside today's `file upload: …;
  nothing was uploaded` form.
- **The fixer's extra change:** the after-event refusal is rethrown through `markOwnRefusal`, so it arrives with the
  gate's own code and message rather than a `[chrome.debugger]` prefix (verifier 2: no text, no path added).

## 5. Proposed decisions

All from the children, full text in `S5a-builder.md` §5, `S5a-fixer.md` §5, `S5a-verifier.md` §5; **By: Claude
(proposed)**:
1. The chooser's click runs in the upload's isolated world (`Page.createIsolatedWorld`, #248's reason); revisit if
   CHOOSE-1 shows no event. Unmeasured (Stage 0 clicked in the main world).
2. **For user review (contract):** a second chooser call on a tab with one in flight answers `DEBUGGER_DEVTOOLS` with
   today's "Another debugger" text. Verifier 1 (V4): the text tells the agent to close DevTools even when no debugger is
   attached yet; the decision should say so, or a precise text be ruled. No new code.
3. **For user review (texts):** the chooser's input rules from `DOM.describeNode` (`webkitdirectory`, `disabled`,
   `mode` vs path count, unknown `mode` fails closed), reusing today's texts, incl. the mark-gone texts that say "file
   input".
4. **For user review (contract):** `chooser` values: `true` is the chooser path; `false`/`null`/absent the input path;
   anything else `BAD_PARAMS "uploadFiles: chooser must be true or false"`; the gate refuses `JS_DISABLED` for any value
   other than `undefined`/`null`/`false`; the shared guard accepts only a boolean (S5b must never send `null`, V5).
5. The wait is armed at the click and the 5 s bound runs from the click's reply; off-step and `Page.disable` failures
   are swallowed and drop a kept session (S4b).
6. A gate re-check after `Page.fileChooserOpened`, before the files are set (verifier 1, V2; built in round 1).
7. The after-event gate refusal passes through unprefixed (fixer).

## 6. Findings

- No pre-registered check failed. Nothing ran against Chrome; no new runtime fact.
- By construction, unmeasured (now stated in the spec note): a human's own chooser on a front tab while the call's
  interception is on is taken by the call (V1); the click's transient activation lapses before the interception goes
  off, so a late opener cannot open Chrome's dialog (V3, F16). Both need live rows before S5 ships.
- A disarm during the wait detaches the session at once (interception ends), but the call answers `DISARMED` only at
  5 s (N2); closing the wait on the keeper's kill is a later slice's (keeper out of lane).
- Both verifiers saw 9 failures in `recipes/test/s11-r16-runner.test.ts` in scratch worktrees only (CRLF checkout of a
  `.ps1`); the main tree passes. Not this slice's.

## 7. Handoff

- Nothing running; no port bound; scratch worktrees removed. The loaded extension does not have this build (a wave
  reloads it with `recipes/reload-extension.ps1`).
- Code commit file list: `extension/src/upload-files.ts`, `extension/src/handlers/upload.ts`, `extension/src/safety.ts`,
  `shared/src/protocol.ts`, the three new test files, and this slice's reports (`S5a.md`, `-builder`, `-fixer`,
  `-verifier`, `-verifier-evidence.txt`, `-verifier2`).
- **S5b needs:** SDK `tab.upload(target, paths, {chooser: true})` (never sending `null`); MCP `browser_upload_file
  {chooser}` and the #214 re-baseline; `docs/setup.md` (the chooser line, V1's limit, V9); §4.27 placeholders.
- **Live rows for S7 (§4.27), fixture pages only:** CHOOSE-1…9, CHOOSE-KEPT, CHOOSE-FRAME (`S5a-builder.md` §7), plus
  the late-opener row (front tab, openers ~4.9 s and ~5.1 s after the click; pass rule: never Chrome's own dialog; V3)
  and a human-style click during the wait on a front tab, recording which input received the files (V1, N1).
  CHOOSE-1, -2 and -5 run first (V6: the isolated-world click and `DOM.describeNode` without `DOM.enable`).
