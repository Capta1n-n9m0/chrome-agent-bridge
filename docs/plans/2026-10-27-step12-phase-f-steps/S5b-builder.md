# S5b builder — the chooser in the SDK, the MCP and setup.md; the console formatter's cap

Builder, Opus, medium effort. Base: `7e26dab` (S5a's spec note `8eab22c`, code `2099c08`). Not committed.

## 1. Verdict

**DONE.**

## 2. Outputs

**Code**
- `sdk/src/upload.ts`: `UploadOptions.chooser?: boolean`, and `chooserParam(value)`. It returns `{}` for `undefined` or
  `null`, so `null` is never sent, and `{chooser}` for a boolean. Any other value is refused
  `BAD_PARAMS "upload: chooser must be true or false"`.
- `sdk/src/tab.ts`: `Tab.upload` checks `chooser` after the target and before the files are read, and spreads it into
  the `uploadFiles` params. The doc comment has a chooser paragraph. `client.upload` is unchanged and passes its
  options through.
- `mcp/src/tools/registry.ts`: `browser_upload_file` gains `chooser: z.boolean().optional()` with a description, and
  the tool description gains one sentence at its end (§5). The tool sends `chooser` only when it is given.
- `sdk/src/format/console-messages.ts`: `formatConsole(entries, {maxChars?})` is capped the way `formatNetwork` is.
  The default is 20 000 characters. Whole lines are kept from the oldest, while the text fits. A cut ends with one
  marker line, `… [truncated: <n> more lines, the newest — narrow with level/limit]`. Text under the cap is unchanged.
  The MCP's `browser_console_messages` calls it as before, so it is capped by default.

**Tests** (new files, plus two written-out deltas)
- `sdk/test/s12-upload-chooser.test.ts` (4 tests):
  - With no options, `{}`, `{timeoutMs}`, `{chooser: undefined}` or `{chooser: null}`, the params are exactly
    `{ref, paths, tab}`, with the keys checked.
  - `true` and `false` are each sent as given.
  - Five non-boolean values are each refused `BAD_PARAMS` with no call, before the files are read (the path is a
    missing file).
  - `client.upload` hands `chooser` on; the type is `boolean | undefined`; the SDK still exports eight values.
- `sdk/test/s12-console-cap.test.ts` (3 tests):
  - 200 entries of 2000 characters: at most 20 000 characters, and the kept lines plus the cut lines make 200.
  - Text under the cap is unchanged; a line that fits `maxChars` exactly is kept, and one character less cuts it.
  - A first line longer than the cap leaves only the marker.
- `mcp/test/s12-upload-chooser.test.ts` (4 tests):
  - Without `chooser`, the call is exactly `uploadFiles {ref, paths, tab}` (keys checked) and the answer is today's.
  - `chooser: true` (with a locator) and `chooser: false` are sent, and the answer is in the same form with no
    directory.
  - The description ends with the chooser sentence, once.
  - `browser_console_messages` with 200 × 2000 characters ends in the marker, cut at or before 20 000 characters.
- `mcp/test/s2-focus-first.test.ts`: the #214 delta, `S5B_CHOOSER_PROPERTY` written out. `browser_upload_file`'s
  expected schema gains exactly `chooser`, and the test title names S5b. Nothing else is changed:
  `browser_evaluate` (S2b's `args`), `browser_console_messages` (S3b) and `browser_upload_file` (this delta) are the
  only tools that differ from the fixture, and the fixture file is untouched.
- `sdk/test/s11-upload.test.ts`: a one-line re-pin, see §4.

**Docs:** `docs/setup.md`.
- The Tools row for `browser_upload_file`.
- The quoted description, kept equal to the code.
- The `From Claude` and `From a script` signatures.
- A new paragraph, "A button that opens the file dialog: `chooser`".
- The JavaScript-off sentence: "…except one with `chooser`".
- Four Known-limits bullets: #353 (a)–(c), plus S5a verifier V9 (a refusal after the files were set).

**Numbers**
- `npm test`, run first: **5075 passed, 214 files**.
- My slice: 11 new tests, all passing (`npx vitest run` on the three new files: `Tests 11 passed (11)`), so 5086 for
  this slice. None removed.
- The whole tree after: `Tests 5100 passed (5100)`, `Test Files 218 passed (218)`. That count includes another
  agent's in-flight S6-G2 work (§6): `daemon/test/s6-trusted-focus.test.ts` passes 14 tests, and 5075 + 11 + 14 = 5100.
- `npm run typecheck`: exit 0.
- All seven `recipes/tsconfig*.json` (`.fe`, plain, `.s10`, `.s11`, `.s11b`, `.s6`, `.s9`): exit 0 each.
- `npm run build`: exit 0. `git status --short` shows no tracked change from the build. `dist/` is ignored; the
  tracked changes listed there are this slice's and S6-G2's.
- Log sites +0. `extension/test/log-allowlist.ts` has 54 entries, unchanged, and the log scan passes. The diff to
  `sdk/src` and `mcp/src` adds no `console.` text and no log call.

**Size** (`git diff --numstat` plus the line counts of the new files)

| Kind | Lines | Files |
|---|---|---|
| Code | **62** of a 150 cap | upload.ts +13, tab.ts +8, registry.ts +11, console-messages.ts +30 (−15 removed in all) |
| Tests | **225** of a 225 cap | 212 new (88 + 39 + 85), s2-focus-first.test.ts +11, s11-upload.test.ts +2 |
| Docs | 29 (not counted) | `docs/setup.md` +29 / −5 |

**Seen red before the code:**
- All 3 cap tests that check a cut were red on the pre-slice formatter: no marker, and `maxChars` ignored.
- Every chooser-sending and refusal test in both new upload files was red, and so were the MCP description and
  console-cap tests.
- The s2-focus-first schema test was red once the delta was written: the property was missing.
- The no-chooser tests passed on the old code, as they should, because they pin today's params.
- The `s11-upload.test.ts` type pin went red at `npm run typecheck` (TS2344) once `chooser` was added.

## 3. Verifier verdict

Not applicable (builder).

## 4. Deviations

- **An existing test assertion was edited outside s2-focus-first.test.ts.** `sdk/test/s11-upload.test.ts:325` pinned
  `UploadOptions` literally to `{timeoutMs?: number}`. That is a compile-time check, so `npm run typecheck` failed once
  the goal's `chooser` option was added. I re-pinned it to `{timeoutMs?: number; chooser?: boolean}` with a dated
  comment. This is the same kind of edit S2b made in `sdk/test/s3-signatures.test.ts` for `args`. The `Tab.upload`
  and `client.upload` signature pins are unchanged, and no runtime assertion changed. Why: the brief's goal (an option
  on the existing options object) cannot be met while that pin stands. I followed the goal and kept the edit minimal.
- **Tests were trimmed to fit the cap.** A first draft had 284 test lines. I cut repeated cases (a second locator
  case, a separate under-cap test, a full `client.upload` connection) to reach 225.

## 5. Proposed decisions

### 2026-10-28 · S5b: `chooser` in the SDK and the MCP, and the texts (for user review)
**Decided:**
- **SDK.** `UploadOptions.chooser?: boolean`. `undefined` and `null` send nothing; `true` and `false` are sent as
  given; any other value is `BAD_PARAMS "upload: chooser must be true or false"` before the files are read. This
  matches the extension's own text, with the SDK's `upload:` prefix.
- **MCP property description:** "true: ref or locator is the element whose click opens the page's file dialog (a
  button or link), not the file input itself; the bridge clicks it and fills the dialog's input without showing the
  dialog. Refused while JavaScript is off for the bridge. Default false."
- **MCP tool sentence, appended last:** "With chooser=true, ref or locator may instead be the button or link whose
  click opens the page's own file dialog: the bridge clicks it and puts the files into that dialog's input without
  showing the dialog — still only files in the Upload folders, and refused (JS_DISABLED) while JavaScript is off for
  the bridge."
- **`docs/setup.md`:** the chooser paragraph and the four limit bullets, as written there. They say in plain words
  what the human sees: a banner and no dialog, and a click of their own on that tab during the 5 s may be the one the
  call answers. The paragraph also names the `DEBUGGER_DEVTOOLS` text for a second call ("close DevTools" even with
  none open, #353).
- **Sending `false`.** `chooser: false` is sent when a caller passes it, because the shared guard accepts it and the
  extension treats it as absent.

**Why:** the brief requires that `chooser` is sent only when given and never as `null`. The texts state the rule,
the Upload folders limit and the JavaScript-off refusal, and they reuse existing wording.
**Instead of:** dropping `false` on the client, which would make the params depend on a value the caller chose;
refusing `null` in the SDK (the spec treats `null` as absent).
**Revisit if:** the user rules other texts at Step 12's gate.
**By:** Claude (proposed)

### 2026-10-28 · S5b: `formatConsole`'s cap
**Decided:**
- 20 000 characters, the same loop as `formatNetwork`: whole lines while the text fits, and the marker line added
  after the capped text.
- The kept lines are the oldest, in the order given, as `formatNetwork` keeps its first rows.
- The marker is `… [truncated: <n> more lines, the newest — narrow with level/limit]`. It differs from the network
  marker in two places: "the newest" says which lines were cut, and it names the console tool's own parameters. A
  smaller `limit` keeps the newest entries, so it brings the cut lines back.
- If even the first line does not fit `maxChars`, only the marker is printed. At the default this cannot happen,
  because a text is cut at 2000 characters.
- The cap is exported as an option, `FormatConsoleOptions.maxChars`, on the `@bridge/sdk/format` subpath only.

**Why:** #345 (2) asks for the same form and size. `browser_console_messages` is new in Step 12, so no earlier answer
changes.
**Instead of:** keeping the newest lines with the marker first. That is arguably more useful, but it is not
`formatNetwork`'s form.
**Revisit if:** the user prefers the newest lines kept (a few-line change).
**By:** Claude (proposed)

## 6. Findings

- **The tree was not idle.** While I worked, another agent's S6-G2 build changed `daemon/src/{intercept,methods}.ts`,
  `daemon/test/methods.test.ts` and `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md`. It also added
  `daemon/test/s6-trusted-focus.test.ts` and `…-steps/S6-G2-builder.md`. The brief said "Nothing else is running".
  In one mid-run `npm test`, 12 of its tests failed while it was being written; at the end all pass. I touched none
  of those files. The `docs/plans/.../S5a.md` change was already in the tree before I started.
- **For the committer**, this slice's files are: `sdk/src/{upload,tab}.ts`, `sdk/src/format/console-messages.ts`,
  `mcp/src/tools/registry.ts`, `mcp/test/s2-focus-first.test.ts`, `sdk/test/s11-upload.test.ts`, the three new test
  files and `docs/setup.md`. Of these, only `docs/setup.md` changed in its Tools row and Uploads section, and only
  there.
- No new runtime fact; nothing ran against Chrome.

## 7. Handoff

- Nothing left running; no port bound. Host tests bind port 0 only.
- The §4.27 placeholders (the CHOOSE-* live rows) were not in this brief's lane; they remain for S5's step agent or S7.
- The loaded extension does not have S5a's build; a live wave reloads it.
