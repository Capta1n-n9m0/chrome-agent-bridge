# Step 11 S4 — verifier report (the SDK and the MCP)

**Model:** Opus 5.5 (`claude-opus-5-5`). **Role:** verifier (`docs/agent-rules.md` §6). **Date:** 2026-10-25.
**Audited:** `acbb042` (parent `f0d0e69`). **Where:** `git archive` copies of both commits in my scratchpad, each
with its own `npm ci` (no junction to the main tree), per the brief's deviation (1). Port 0 only.

## 1. Verdict

**PASS-with-notes.** S4.1–S4.4 and the every-stage checks hold. The new tests fail on `f0d0e69`, and 11 mutants of
mine are red. There is no CRITICAL or MAJOR finding. There are 2 MINOR findings and 4 NITs, listed in §6.

## 2. Outputs (numbers from my own runs)

| Check | Command (scratch copy) | Result |
|---|---|---|
| Typecheck | `npm run typecheck` at `acbb042` | exit 0 (all five projects) |
| Tests after | `npm test` at `acbb042` | `Test Files 140 passed (140)`, `Tests 3532 passed (3532)` |
| Tests before | `npx vitest run` at `f0d0e69` | `Test Files 137 passed (137)`, `Tests 3489 passed (3489)` |
| Delta | — | +43 tests, +3 files (26 + 14 + 3). No test was removed. |
| Build | `npm run build` at `acbb042` | exit 0 |
| Tree after build | `git status --short` in the copy (committed before the build) | 0 lines |

My numbers match the builder's. Only my own files were changed, so no other package was touched:
`git diff --stat f0d0e69 acbb042 -- shared daemon extension sdk/test/s3-signatures.test.ts` is empty.

## 3. Fail before the change

I copied the six new or changed test files onto the `f0d0e69` copy and ran
`npx vitest run sdk/test/s11-upload.test.ts mcp/test/{s2-focus-first,s4-upload-cross,s4-upload-tool,safety,tools}.test.ts`.
- The result was `6 failed (6)` files and `23 failed | 179 passed (202)` tests.
- Every new MCP test was red (14 of 14), and so was every cross test (3 of 3).
- Each of the five amended assertions was red: the baseline, the order, the 24 count, the 19 tab tools, and "every tool surfaces the reason".
- `s11-upload.test.ts` failed to load because `upload.ts` was missing.

A load failure does not show much, so I also ran the SDK file with only `sdk/src/upload.ts` added to the parent:
- The result was `21 failed | 5 passed (26)`.
- The 5 passes are the three `prepareUpload` unit tests (the new module itself), the eight-values pin (an invariant)
  and the `expectTypeOf` pin, which does nothing at runtime.
- `tsc -p sdk` on that copy shows the pin red: `TS2305 … no exported member 'UploadOptions'` and
  `TS2339 Property 'upload' does not exist on type 'Tab'`.

**Mutants.** Each mutant was applied to the `acbb042` copy and restored after its run.
- Runner: `scratchpad\mutants.mjs`. Output: `scratchpad\v-mutants.txt`.
- Each run covered `s11-upload`, `s4-upload-tool`, `s4-upload-cross` and `s2-focus-first`, 87 tests in all.

| Mutant | Red |
|---|---|
| M1 `realpathSync` (JS) in place of `fs.promises.realpath` (F8) | 1 (the F8 canonical-case test) |
| M2 send the given path, not the real one | 3 (the junction test, F8, the cross test) |
| M3 MCP answer prints `f.path` | 4 (including the sentinel test and the cross test) |
| M4 MCP preflight moved inside `onTab` (after the claim) | 5 (the refusal rows: "no claim either") |
| M5 `browser_click` pointer after the focus sentence (F12) | 2 (the new one and the existing `endsWith` test) |
| M6 `Tab.upload` sends before the preflight | 12 |
| M7 a refusal message names the path | 4 |
| M8 a wrong sha256 | 7 |
| M9 `focusTab` before the upload | 8 |
| M11 daemon `takesLock("uploadFiles")` true | 1 (the cross lock row, after a 30 s timeout) |
| M10 the `isFile` check removed | **0 red**: see NIT 1 |

## 4. Exit checks

- **S4.1 met.** Every refusal makes zero calls:
  - Through `Tab.upload`, a relative path, a missing file, a directory, `""`, `[]`, 21 paths, a non-string entry and
    a missing second entry are refused `BAD_PARAMS`. So are a bad target and a stale Tab.
  - Through `client.upload`, a refusal sends no frame after the claim.
  - Through the MCP, no claim is made either (M4, M6).
  - The real path behind a junction is sent: a junction made in `os.tmpdir()` in the SDK test, and a junction in the cross test.
  - The sha256 equals the file's, for an empty file, a 3 MiB file and a 70 kB file.
  - The preflight uses `fs.promises.realpath` (`sdk/src/upload.ts:15`, `:71`). M1 shows that the test tells it apart from `realpathSync`.
- **S4.2 met.**
  - The main entry still has exactly eight values (an `index` keys test).
  - `UploadOptions`, `UploadResult`, `Tab["upload"]` and `BridgeClient["upload"]` are pinned with `toEqualTypeOf`, and `sdk/tsconfig.json` includes `test`.
  - `sdk/test/s3-signatures.test.ts` is unchanged and green.
- **S4.3 met.**
  - The baseline test checks `all` for 24 entries and exactly one `browser_upload_file`. Its schema is `browser_click`'s
    own `ref`/`locator`/`tab` plus `paths`, with `required:["paths"]`.
  - The other 23 tools are deep-compared with the `f45e3bf` fixture as before. The fixture file is untouched.
  - The answer carries no sentinel directory, `dirname` or `tmpdir` (M3 is red).
  - The `browser_click` sentence is at `mcp/src/tools/registry.ts:492`, before the focus sentence, which stays last (F12; M5 is red).
- **S4.4 met.** The real `WsHost` ran on port 0 with the real `ws`, the real SDK `connect`, the MCP `BridgeLink`/cursor/tools and a fake proto:2 extension:
  - `uploadFiles` arrives as `{…, paths:[realPath], tabId:200}` from the SDK and `tabId:101` from the MCP, with no `tab` key.
  - Another client's handle gets `TAB_HELD`, and nothing is forwarded.
  - The upload completes while another client's screenshot holds the lock. A control screenshot is queued behind that lock, and M11 makes this row red.
- **Every-stage checks:** met (§2).
- **The description (brief):** it names each of these:
  - absolute paths;
  - "extension options → Upload folders";
  - `UPLOAD_REFUSED` with "stop and ask the user, and never retry with another path";
  - "Allow access to file URLs" (#245);
  - the banner;
  - "Never click a file input";
  - "not proof that the page received them" (#247).

  It says "The tab is not brought to the front" but does not claim that a background tab works. That is right while
  UP-1 is unmeasured (0.9, #238).
- **0.10:**
  - The SDK and MCP diffs add no log site (`grep console. sdk/src mcp/src`: only the existing `mcp/src/index.ts` lines).
  - Refusals name only `paths[i]` and an errno code. An errno's own message, which names the path, is dropped (`errnoOf`).
  - The cross test scans the daemon's log file, its raw lines and the console for the sentinel directory and file name.
- **The three amended MCP tests only extend their expectations; none is weakened.**
  - `tools.test.ts`: 23 → 24 and 18 → 19 are exact counts that grew by the one tool, and `toContain("browser_upload_file")` is added.
  - The no-daemon test's `ARGS` gains a real file, so the call reaches the link and must still show the stored reason.
  - `safety.test.ts`: Step 8's 23 names still `toEqual` in order once the new name is filtered out. A length of 24 and the new tool's position are added.
  - `s2-focus-first.test.ts`: the 23-entry comparison is unchanged and the new entry is pinned literally.

## 5. Deviations (mine)

- The scratchpad is shared with earlier agents of this session. My `v-typecheck.txt`, `v-test.txt`, `v-build.txt`,
  `v-status.txt` and `v-mutants.txt` may have overwritten older files with the same names. Those were not this
  stage's evidence.

## 6. Findings

**MINOR 1 — the `@bridge/sdk/download` subpath gains a value (`prepareUpload`). That is a contract change recorded only as a "Deviation"** (`sdk/src/download.ts:17-18`).
- Nothing pins the subpath's key set. `sdk/test/s4-evaluate-to-file.test.ts:483` checks for the presence of two names, not equality. So no test or exit check is broken.
- Every earlier subpath value was taken as a contract-level decision and put to the user: #46 (`./format`), the Step 8 `./report` entry, #163 (`safetyRefusalLine`) and #205 (two helpers on this same subpath).
- #240 names only the types and the eight values, so no pre-stated rule covers this.
- Under `docs/agent-rules.md` §4 the change belongs under Proposed or Open decisions, "for user review", not under Deviations.
- The change is additive, undoable, adds no ninth main-entry value and leaves every existing behaviour unchanged. That is the conservative option, so I do not count it as a FAIL.
- **Fix:** the session agent records it as a decision (contract, for user review, beside #240), as #205 did.

**MINOR 2 — the MCP misreports the file-access refusal (spec gap, S2's line × S3's message).**
- `sdk/src/error.ts:133` renders every `UPLOAD_REFUSED` as "that file is not in a folder the user allows for uploads".
- #245 (b) gives the file-access refusal a second fixed message (S3, uncommitted:
  `extension/src/upload-files.ts:34`, "Chrome does not allow this extension to read local files …").
- Through `browser_upload_file` that message is replaced by the folder line (`withSafetyRefusals`). An agent then
  tells the user to fix the folder list when the toggle is the cause.
- The tool description names both causes, which softens this. SDK callers keep the extension's message.
- This is not S4's code (the line is S2's, #257), but S4 is the first tool that shows it.
- **Fix (contract wording, for user review with #257):** have the line name both causes, or render the
  extension's fixed message for `UPLOAD_REFUSED`, since it names no path.

**NIT 1 — M10 survives.** Without the `isFile` check, a directory is still refused (`BAD_PARAMS … cannot be read
(EISDIR)`), because the read fails. The check is redundant against the tests and harmless. A FIFO or device path is
not tested.

**NIT 2 — `Uploaded <n>` counts the files sent, not `reply.files`** (`mcp/src/tools/registry.ts:634`). If the
extension ever answers a different count, the MCP hides it. The builder recorded this as a proposed decision. An
assertion or a mismatch line would cost little.

**NIT 3 — `Tab.upload` repeats the cap-warning logic of `#action`** (`sdk/src/tab.ts`, beside `:191-196`) so that it
can pass `timeoutMs`. Behaviour is the same and it is tested.

**NIT 4 — stale counts for the session agent.** `mcp/CLAUDE.md`, `sdk/CLAUDE.md` (Key files) and the root
`CLAUDE.md` still say 23 tools and do not list `upload.ts` or `Tab.upload`. The builder flagged this. Only the
session agent may edit these files.

**Not measured, to record:** `fs.promises.realpath` resolves a `subst` or mapped drive to its real target (Node uses
`GetFinalPathNameByHandle`). So an Upload folder entered as `Z:\…` would never match, and the refusal would be
fail-closed. I did not create a `subst` drive (it changes the user's session state). This belongs in S5's or S6's
notes, not in a fix.

**Attacks that held:**
- A refusal message and its errno text (no path).
- The order of the target check, the preflight and the claim (a bad target makes no read and no call).
- A junction's real name is the name the page sees.
- An UPLOAD_REFUSED gets no report; REF_STALE gets one.
- No `focusTab` is sent.
- The MCP's thrown `BAD_PARAMS` follows the `saveTo` pattern (`registry.ts:832`).

## 7. Handoff

- I started no process that outlives its test. The cross tests bound port 0 and closed.
- I deleted the scratch copies `scratchpad\new` and `scratchpad\old` at the end. The npm workspace junctions under
  `node_modules\@bridge\` were removed first with `cmd /c rmdir`.
- I edited no tracked file in the main tree. This report is my only output. Commit: no.
