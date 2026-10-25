# Step 11 S4 — builder report (the SDK and the MCP)

**Model:** Opus 5.5 (`claude-opus-5-5`). **Role:** builder (`docs/agent-rules.md` §6). **Date:** 2026-10-25.
**Base:** `f0d0e69`, with S3's uncommitted extension work in the same tree (not touched, not committed here).

## 1. Verdict

**DONE.** `Tab.upload`, `client.upload`, the shared preflight, `browser_upload_file` and `browser_click`'s pointer are
built test-first; S4.1–S4.4 and the every-stage checks hold on my files. The verifier is pending.

## 2. Outputs

**Code (lane `sdk/src/`, `mcp/src/tools/registry.ts`):**
- `sdk/src/upload.ts` (new): `prepareUpload(paths)`, types `UploadOptions`, `UploadResult`, `PreparedUpload`.
  - It checks 1–20 entries, each a non-empty string, absolute (`path.isAbsolute`), existing, a regular file (`stat`
    after resolving), readable.
  - It sends `fs.promises.realpath` of each file (F8). The size and sha256 come from one streamed read.
  - Every refusal is `BAD_PARAMS` with the text `upload: paths[i] …`. It names the index and the errno code, never
    the path. Nothing logs.
- `sdk/src/tab.ts`: `Tab.upload(target, paths, options?)`.
  - Order: the stale guard, `normalizeTarget`, the preflight, then one `uploadFiles {ref|locator, paths: real[], tab}`
    with `options.timeoutMs` as the call timeout.
  - A reply with `pastSnapshotCap` emits one `warning` event.
  - No `focusTab` is sent. The failure report follows the usual attach set, so `UPLOAD_REFUSED` gets none.
- `sdk/src/client.ts`: `client.upload(…)` mirrors the method on the cursor.
- `sdk/src/index.ts`: `export type { UploadOptions, UploadResult }`. The main entry still has eight values.
- `sdk/src/download.ts`: re-exports `prepareUpload` and the types on the `@bridge/sdk/download` subpath, so the MCP
  shares the preflight. This follows the precedent of `checkSaveTarget`.
- `mcp/src/tools/registry.ts`:
  - `browser_upload_file` is registered right after `browser_select_option`. Its input is `{ref?, locator?,
    paths: string[] (minLength 1 each, 1–UPLOAD_FILES_MAX_PATHS), tab?}`.
  - Order: the target check, then the preflight (before any call, the cursor's claim included), then
    `uploadFiles` with the real paths.
  - The answer is `Uploaded <n> file(s) to <target>:`, then `<name> · <bytes> bytes · sha256 <hex>` per file, plus
    the cap warning line when the reply carries the flag.
  - `browser_click`'s description gains one sentence, before its focus sentence (F12): ` To put a file into a file
    input use browser_upload_file instead: clicking a file input opens a native file dialog the bridge cannot see or
    close.`

**The tool's description (exact):** "Put one or more local files into a file input — an <input type=\"file\">, a
label for one, or an element holding exactly one (the hidden input behind an \"Attach\" button or drop zone) — found
by ref or `locator` in this session's tab (the active tab is claimed on first use) or `tab`, as if the user had picked
them in the file dialog. `paths` are absolute file paths on this computer; Chrome reads the files itself. The tab is
not brought to the front. Every file must lie in a folder the user allowed in Chrome (extension options → Upload
folders), and the user must have turned on \"Allow access to file URLs\" for the extension (chrome://extensions → the
extension's Details); otherwise the answer is UPLOAD_REFUSED — then stop and ask the user, and never retry with
another path. Shows Chrome's 'is debugging this browser' banner briefly. Never click a file input (browser_click):
that opens a native file dialog the bridge cannot see or close. The answer lists each file's name, size and sha256 as
read on this computer: it says what Chrome accepted, which is not proof that the page received them — check the page
(e.g. browser_snapshot) to confirm."

**Tests (new):**
- `sdk/test/s11-upload.test.ts` (26 tests): the refusals with zero calls, the real path through a junction, the F8
  canonical case (win32 only), the hash, the mirror, the warning, `UPLOAD_REFUSED` without a report against
  `REF_STALE` with one, and the type pins.
- `mcp/test/s4-upload-tool.test.ts` (14 tests).
- `mcp/test/s4-upload-cross.test.ts` (3 tests): real daemon `WsHost` on port 0, real `ws`, a fake proto:2 extension.

**Tests (amended, with dated notes; no test removed):**
- `mcp/test/s2-focus-first.test.ts`: the schema re-baseline.
- `mcp/test/safety.test.ts`: the tool-list order.
- `mcp/test/tools.test.ts`: 23 → 24 tools, 18 → 19 tab-touching tools, and an `ARGS` entry for the new tool.

**Counts:**
| Command | Before (`f0d0e69`) | After |
|---|---|---|
| `npx vitest run sdk mcp` | 766 passed, 37 files | 809 passed, 40 files (+43 = 26 + 14 + 3) |
| `npm test` | 3489 passed, 137 files | 3532 passed, 140 files (same +43; the run included S3's uncommitted extension changes, all green) |
| `npm run typecheck` | — | exit 0 (all five projects, S3's tree included) |
| `npx tsc --noEmit -p sdk/tsconfig.json`, `-p mcp/tsconfig.json` | — | exit 0, exit 0 |
| `npm run build` | — | exit 0; `git status --short` shows no tracked change from the build |

**Tests fail first:** before the code, `sdk/test/s11-upload.test.ts` failed to load (`../src/upload.js` missing), and
`npx vitest run mcp` showed 19 failed. Those were every new MCP unit test and the five amended assertions. Three
mutants of the preflight, each restored after its run:
- `realpathSync` (JS) in place of `fs.promises.realpath`: the F8 test is red.
- Sending the given path in place of the real one: 3 red (the junction test, the F8 test, and the cross test's
  forwarded paths).
The cross test's lock row has a control: a second lock-taking `screenshot` is not forwarded while the first holds the
lock, so the row can tell the difference. I did not run a daemon mutant (`daemon/` is outside my lane).

**Schema baseline diff** (the live `tools/list` from `npx tsx mcp/test/tool-schemas.ts` against the f45e3bf fixture):
- 24 tools against 23: added `browser_upload_file`, nothing removed.
- Changed against f45e3bf: `browser_evaluate` only. That is S4 of Step 10 and S1, and it is already in S1's
  expectation. So against S1 there is exactly one added entry.
- The added entry is `{$schema draft-07, additionalProperties:false, type:"object", required:["paths"], properties:
  {ref, locator, tab}`, which are byte-equal to `browser_click`'s, `+ paths: {type:"array", items:{type:"string",
  minLength:1}, minItems:1, maxItems:20, description:"Absolute paths of the files to put into the input (1–20; more
  than one only if the input takes several). Each must lie in a folder the user allowed in Chrome (extension options
  → Upload folders)."}}`.
- The fixture file is untouched. The test writes the new entry out literally.

### Exit checks
- **S4.1 met.** These are refused `BAD_PARAMS` with zero calls, through `Tab.upload`, `client.upload` and the MCP:
  a relative path, a missing file, a directory, an empty string, an empty list, 21 paths, a non-string entry, and a
  missing second file. A bad target and a stale Tab are refused with no call too.
  - The real path is sent: a junction made in a temp dir resolves to the target, in the SDK, the MCP and the cross
    test.
  - The result's sha256 equals the file's (including a 3 MiB file and an empty one).
- **S4.2 met.**
  - Eight values (`index` keys test).
  - `UploadOptions`, `UploadResult`, `Tab["upload"]` and `BridgeClient["upload"]` are pinned with `expectTypeOf`
    (checked by `tsc -p sdk`).
  - `sdk/test/s3-signatures.test.ts` is unchanged and green.
- **S4.3 met.**
  - The baseline differs from S1's by one added entry.
  - The answer carries no sentinel directory name, no `dirname`, and no `os.tmpdir()`.
  - The `browser_click` sentence is present before the focus sentence, which is still last (F12; the existing
    `endsWith` test is green).
  - The description names each item the brief lists.
- **S4.4 met.**
  - Over real `ws` on port 0, `uploadFiles` is forwarded with numeric `tabId` 200 (SDK `newTab`) and 101 (MCP
    cursor). It carries the real paths and no `tab` key.
  - Another client's handle gets `TAB_HELD` from the SDK and from the MCP, and nothing is forwarded.
  - The upload completes while another client's default-mode screenshot holds the lock.
  - No sentinel directory or file name appears in the daemon log file, its raw lines or the console.

## 3. Verifier verdict

Pending (a step-agent matter).

## 4. Deviations

- **The MCP shares the SDK's preflight through `@bridge/sdk/download`.** `download.ts` re-exports it, inside
  `sdk/src/`. I did not add a new `sdk/package.json` subpath, which is outside the lane. The subpath now exports one
  more value, `prepareUpload`. The main entry is unchanged.
- **Three existing MCP tests were amended** (dated notes): the tool count, the tab-touching list and the
  registration order. The brief's lane includes `mcp/test/`, and the phase doc's "24 tools" requires the change.
- **`mcp/CLAUDE.md` and the root `CLAUDE.md` still say 23 tools.** Only the session agent edits `CLAUDE.md` files
  (§5), so this is left for the session agent or S6.

## 5. Proposed decisions

### 2026-10-25 · S4: the preflight's messages name the entry's index, never its path
**Decided:** a preflight refusal reads `upload: paths[i] does not exist` (or `is not an absolute path …`, `is not a
regular file …`, `cannot be read (EACCES)`). It names the index and an errno code. It never names the path, folder or
file name.
**Why:** phase doc 0.10 ("refusal messages name none of them"). The MCP shows the message to the model.
**Instead of:** naming the path, as `evaluateToFile`'s messages do.
**Revisit if:** users find the index too little to act on.
**By:** Claude (proposed)

### 2026-10-25 · S4: the answer's shape details
**Decided:**
- `<n>` in `Uploaded <n> file(s) to <target>:` is the number of files the client prepared and sent, and the text
  `file(s)` is literal, as written in 0.9.
- `<target>` is the ref or the described locator, as the other action tools print it.
- `name` is the real path's basename, which is the name Chrome gives the page's `File`.
- The tool is registered after `browser_select_option`.
- There is no default call timeout beyond the client's 30 s.
**Why:** 0.9's text taken literally; the name the page will see; the tools grouped with the actions.
**Instead of:** `reply.files` as `<n>`. On success it equals the count sent (#247).
**Revisit if:** UP rows show large files that need a longer default.
**By:** Claude (proposed)

### 2026-10-25 · S4: the description says the tab is not brought to the front, and does not say it works in the background
**Decided:** the description states the design fact that there is no focus. It makes no claim that a background tab
receives the file.
**Why:** UP-1 has not been measured (#238). 0.9 says "works on a background tab (if UP-1 holds)".
**Instead of:** "works on a background tab".
**Revisit if:** UP-1 passes; S6 may then add the sentence (a description, not a schema, change).
**By:** Claude (proposed)

## 6. Findings

- No pre-registered check failed.
- **Not tested: an unreadable regular file** (`EACCES`). Making one portably on Windows needs ACL edits. The code
  path is the same `BAD_PARAMS` refusal as a failed read.
- **Not a runtime fact, only seen in tests:** on this machine a junction made with `symlinkSync(…, "junction")` in
  `os.tmpdir()` resolves through `fs.promises.realpath` to the target's own path, which agrees with Stage 0 F8.

## 7. Handoff

- **Processes:** none started that outlive the tests. The cross tests bind port 0 and close.
- **Scratch:** `C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\9c6ea090-7b81-4653-b2ad-abef50160f29\scratchpad\`
  (`s4-npm-test.txt`, `live-schemas.json`).
- **For S5 and S6:** the tool's description and the SDK and MCP refusal texts are quoted above for `docs/setup.md`.
  The MCP bundle changed, so interactive sessions need `/mcp` or a fresh session.
- **Commit:** only my files (listed in the commit). S3's files are left as they are.
