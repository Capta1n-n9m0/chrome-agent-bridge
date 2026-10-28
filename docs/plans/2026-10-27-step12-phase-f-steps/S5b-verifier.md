# S5b verifier: the chooser in the SDK, the MCP and setup.md, and the console formatter's cap

Verifier, Opus, medium effort. Base: `7e26dab` (S5a's spec note `8eab22c`, code `2099c08`). I audited S5b's 10 files
and nothing else. I did not audit or touch the S6-G2 files in the main tree. Command output is in
`S5b-verifier-evidence.txt`, next to this file.

## 1. Verdict

**PASS-with-notes.** Every exit check in the brief holds. There are 3 MINOR findings and 2 NIT findings, and none of
them breaks a rule.

## 2. Outputs

**How I ran it.** I made a scratch worktree at HEAD `7e26dab` and ran `npm ci` in it, with no junction into the main
tree. I copied S5b's files in, in two steps: the tests first, then the src files. I then removed the worktree. Its
`node_modules/@bridge` junctions pointed only inside the worktree. The main tree's `node_modules/.bin` still has its
42 entries.

**Exit checks.**

| Check | Result |
|---|---|
| Tests, before → after | **5075 → 5086** (+11). Files: 214 → 217. None removed. |
| The 9 failures in both runs | The same 9, in `recipes/test/s11-r16-runner.test.ts`, before and after. They come from the worktree's CRLF checkout of `recipes/s11-r16.ps1`: `core.autocrlf=true`, the file's first line ends `\r\n` in the worktree and `\n` in the main tree (S5a.md §6). They have nothing to do with S5b. |
| `npm run typecheck` | exit 0 |
| All seven `recipes/tsconfig*.json` | exit 0 each |
| `npm run build` | exit 0. `git status --short` after the build shows only S5b's 7 modified and 3 new files. |
| New tests red on the pre-slice code | **9 of 11 red** at runtime (all 3 cap tests, chooser true/false, the non-boolean refusal, the MCP chooser call, the MCP description, the MCP console cap). The S2.3 schema delta is red too. |
| The 2 that stay green | The two "without chooser, exactly today's params" tests. They pin today's behaviour, so they should pass before the slice. |
| Compile-time pins | The `client.upload`/type test (`s12-upload-chooser.test.ts:83,85`) and the `s11-upload.test.ts:326` pin are red under `tsc -p sdk/tsconfig.json` on the pre-slice source (TS2353, TS2344). |
| E5.3 | The only existing test files changed are `s2-focus-first.test.ts` (the delta) and `s11-upload.test.ts` (one type pin). No runtime assertion of an existing upload test changed. |
| No path in a message | Each new refusal test checks the message exactly, `upload: chooser must be true or false`. The MCP answer test checks that the sentinel directory is absent. |
| Log sites | +0. The S5b diff adds no `console.`, `log(` or logger text to `sdk/` or `mcp/` (grep exit 1). `extension/test/log-allowlist.ts` has 54 entries, and S5b touches no extension file. |
| `chooser` sent only when given | Yes, in the SDK and the MCP. A call without it sends `{ref, paths, tab}`, with the keys checked in order. |
| MCP schema | Only `browser_evaluate`, `browser_console_messages` and `browser_upload_file` differ from the #214 fixture (`s2-focus-first.test.ts:271-306`), each by a written-out delta. The fixture file is untouched. |
| Size | `git diff --numstat` plus `wc -l`: code **62** of 150 (upload 13, tab 8, registry 11, console-messages 30). Tests **225** of 225 (212 new, s2-focus-first +11, s11-upload +2). Docs +29/−5, not counted. Within the cap. |

**The `s11-upload.test.ts:325` type pin is a permitted change.** It is a compile-time pin of `UploadOptions`. The
goal adds an option to that same object, which `tsc` cannot accept while the old pin stands. The edit is one line
with a dated comment. The `Tab.upload` and `client.upload` signature pins are unchanged. This is the same kind of
change as S2b's in `sdk/test/s3-signatures.test.ts` for `args` (`git show 9921715`).

**Mutants.** I applied each one alone, ran the named tests and restored the file. 20 of 23 were red:

- **Chooser params:**
  - `null` sent (M1), red.
  - The refusal of a non-boolean dropped (M3), red.
  - `false` dropped in the SDK (M4), red.
  - The chooser checked after the file read (M5), red.
  - The SDK always sends the key (M6), red.
  - The MCP always sends it, drops it, or sends only `true` (M7, M8, M9), red.
  - M2 survives but is equivalent: `Tab#send` runs `defined()`, which drops an `undefined` key (`sdk/src/tab.ts:159`).
- **Schema delta:**
  - An extra property (M10), red.
  - A changed property description (M11), red.
  - `chooser` made required (M12), red.
  - The tool sentence changed (M13), red.
- **Cap:**
  - 40 000 (M14), red.
  - Off by one (M16), red.
  - No marker (M17), red.
  - A wrong count in the marker (M18), red.
  - The MCP passes a huge `maxChars` (M19), red.
  - The newest lines kept instead of the oldest (M20), red.
  - 20 310 (M15c), red.
  - **19 000 (M15) and 18 270 (M15b) survive.** See F1.

**The setup.md claims, checked against the spec note `8eab22c` and the code `2099c08`.** Each sentence is supported:

- The interception is on only inside the call, and the dialog is handed back on every path (`upload-files.ts:414-479`
  `finally`).
- The human sees the banner and no file dialog.
- It works on a background tab: Stage 0 m2 E1 and E2 measured this with the click in the main world (Stage0.md:87).
  See F4.
- The Upload folders rule, the file-URL rule and the answer are the same as without `chooser`.
- `JS_DISABLED` while JavaScript is off (`safety.ts`, the `cls === "upload"` rule).
- `TIMEOUT` after 5 s with nothing uploaded (`CHOOSER_WAIT_MS`, `CHOOSER_TIMEOUT_MESSAGE`).
- A page's own file picker answers `BAD_PARAMS` (`CHOOSER_NO_INPUT_MESSAGE`; Stage 0 m2 E2).
- A second call on the same tab answers `DEBUGGER_DEVTOOLS` with the "close DevTools" text (`ChooserTabs`, #353).
- The four limits match #353 (a)–(c), the spec's limit paragraph, S5a verifier2 N2 (a disarm answers only at 5 s,
  the session already detached) and V9 (a post-check refusal after the files were set).
- The quoted description equals the code, and `registry.ts:613` is still the description's line.

I found no sentence that the code does not support.

## 3. Verifier verdict

Not applicable (this is the verifier's report).

## 4. Deviations

None. The 9 failures in the worktree are environment-only and appear in both runs (§2).

## 5. Proposed decisions

### 2026-10-28 · S5b: `formatConsole`'s cut keeps the oldest lines, as `formatNetwork` does
**Decided:** Accept the builder's form for now, and name it to the user at the gate (F5).
**Why:** #345 (2) asked for the same form as `formatNetwork`.
**Instead of:** keeping the newest lines.
**Revisit if:** the user prefers the newest lines kept.
**By:** Claude (proposed)

## 6. Findings

**F1 · MINOR: the 20 000 default is not pinned exactly.**
- Where: `sdk/test/s12-console-cap.test.ts:13-24`.
- What: with 2000-character entries, each line is about 2030 characters. Any cap from about 18 280 to 20 308 keeps
  the same 9 lines, so M15 (19 000) and M15b (18 270) pass every test (evidence §4).
- Why it matters: #345 (2) asks for the *size* of `formatNetwork`'s cap, and no test holds that size.
- Fix: add one default-cap test with entries whose joined text is exactly 20 000 characters (kept whole) and one at
  20 001 (cut).

**F2 · MINOR: the `chooser` property description says "not the file input itself".**
- Where: `mcp/src/tools/registry.ts:631` (and the copy in `S5B_CHOOSER_PROPERTY`, `s2-focus-first.test.ts:140-144`).
- What: the spec note `8eab22c` says the target with `chooser: true` may be "a button, a link, a label, **or the
  file input itself**". The code has no rule against a file input on the chooser path: the mark has no file-input
  rule. The model would read the phrase as a ban.
- Fix: for example "(a button or link; a file input works too)". This is contract text for user review, and the
  delta moves with it.

**F3 · MINOR, outside S5b's lane, for the step or session agent: nothing guards `chooser` against an old extension.**
- What: `args` has one (#332, `ARGS_RELOAD_HINT`, `daemon/src/intercept.ts:492`). `chooser` has none.
- An extension built before S5a, which includes the one loaded now, ignores the key. At `2099c08^`,
  `isUploadFilesParams` and `checkUploadParams` read no `chooser`. Such an extension runs the input path:
  - A button target gets today's `BAD_PARAMS`, which names "file input".
  - A file-input target uploads without the click.
  - The JavaScript-off rule is not applied.
- This loosens nothing compared with today's upload path, but the answer misleads the agent. `docs/setup.md` does not
  say that `chooser` needs the reloaded extension.
- Fix: either a recorded decision (a feature flag as #332's, or accept and document it), or one setup.md sentence
  saying the extension must be reloaded.

**F4 · NIT: the setup.md chooser paragraph states the built path as fact.**
- Where: `docs/setup.md:780-792`.
- What: Stage 0 measured the click in the main world. The built path clicks in an isolated world and calls
  `DOM.describeNode` without `DOM.enable` (#353 (d), V6), and it has not run live. The "not yet measured live" mark
  covers only the limits list.
- Fix: one clause, "Run 19 checks it live".

**F5 · NIT: the console cap cuts the newest lines.**
- What: the newest lines are the ones most relevant to "what did my click cause". The marker does point to `limit`,
  which keeps the newest entries. The builder listed this as Revisit, and it is for the user at the gate.

## 7. Handoff

- Nothing is running and no port is bound. The tests bound port 0 only, so 9234 was never used.
- The scratch worktree is removed, and `git worktree list` shows only the main tree.
- The main tree is unchanged apart from this report and `S5b-verifier-evidence.txt`.
- Not committed (the brief says so).
