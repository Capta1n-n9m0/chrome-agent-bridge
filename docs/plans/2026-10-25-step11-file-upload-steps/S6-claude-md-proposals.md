# S6 — proposed `CLAUDE.md` lines for Step 11 (for the session agent to apply)

Written by the S6 builder (Sonnet 5.5, medium). The builder does not edit `CLAUDE.md` files. Each line below has a
**source** (a step-report line, a test file, a code line or a measured Run 16 row) and a **place** (decisions.md ·
2026-10-25 · Gotchas follow the code they bind (#232): the package `CLAUDE.md` of the code the gotcha binds).

**Already present (grep of every `CLAUDE.md` on 2026-10-26, so not proposed again):** `extension/CLAUDE.md` Key files
for `upload-paths.ts`, `upload-files.ts`, `handlers/upload.ts`, `options-model.ts`, the Upload folders box, the 27
router methods and `uploadFiles` class `upload` (lines 40–56), and the `markOwnRefusal` gotcha (line ~112);
`extension/src/content/CLAUDE.md` the `data-__bridge-upload` bullet (line 56); root `CLAUDE.md` "24 tools, 27 codes (26
on the wire), 27 router methods" and the `mcp/` "24 tools" line; `mcp/CLAUDE.md:50` "the 24 tools".

## Root `CLAUDE.md`

1. **Current state block (session-closeout, not a gotcha):** Step 11 built through S5 and documented in S6; Run 16
   (30 rows, PASS 19 / FAIL 3 / NOT MEASURED 3 / RECORD 4, `docs/e2e-test-plan.md` §5); the next step per the phase
   doc's Follow-ups. Source: phase doc § As built (S5 block), `docs/progress-and-roadmap.md` Step 11 block.
2. **Commands, line 119:** `npm test` reads `3273 passed, 132 files`; `npm test` on 2026-10-26 (S6 tree, before any S6
   commit) printed `Test Files 154 passed (154)`, `Tests 3811 passed (3811)`. `node scripts/doc-check.mjs` flags the
   old number. Source: the command run by this builder.
3. **Invariants:** none. The existing invariants hold (the folder list is written only by the options page, which is
   the safety-gate invariant already stated).
4. **Skills / Docs lists:** none.

## `extension/CLAUDE.md`

Place: Runtime gotchas, beside the "Safety gate" bullets, unless noted.

1. **The gate refuses `file:` pages whatever the toggle says.** Every tab call on a tab showing a `file:` URL
   (`closeTab` and `focusTab` included) and every `navigate`/`newTab` to a `file:` URL is `DOMAIN_BLOCKED`
   (`FILE_PAGE_MESSAGE`, `FILE_URL_MESSAGE`); the order within `DOMAIN_BLOCKED` is own page > `file:` > block list; a
   wrapper nested deeper than the 4-level unwrap bound counts as `file:`; `listTabs` rows and tab events of a `file:` tab
   are not hidden; `downloadStart` to a `file:` URL keeps its handler's `BAD_PARAMS`. Source: `extension/src/safety.ts:353`
   and `:372`; decisions.md #245 (a), #259; the two `extension/test/safety-gate.test.ts` cases amended with dated notes
   (S2 report, `S2.md`).
2. **An upload's folder rule runs at receipt even for a tab that is gone** (`TAB_UNKNOWN` is not answered first for class
   `upload`); a refused, empty or malformed `paths` answers `UPLOAD_REFUSED` whatever the tab's state; a wrong-typed
   `safety.uploadFolders` makes the state unreadable and refuses every method `DISARMED`. Source: decisions.md #260;
   `extension/test/s2-upload-gate.test.ts`.
3. **`DOM.setFileInputFiles` needs "Allow access to file URLs" for the extension.** The handler reads
   `chrome.extension.isAllowedFileSchemeAccess()` before attaching and refuses `UPLOAD_REFUSED` with
   `NO_FILE_ACCESS_MESSAGE` when it is not `true`; Chromium refuses with "Not allowed" otherwise. Run 16 found the toggle
   on and never pressed it; the "Not allowed with the toggle on surfaces as `DEBUGGER_ATTACH`" case stays unmeasured.
   Source: `extension/src/upload-files.ts:37-42`; `stage0-cdp.txt` (Chromium `dom_handler.cc`); `S3.md` §6; Run 16 UP-0.
4. **An upload reaches a background tab with no focus and no visibility lock.** The page received the file on a tab
   that was not active (Chrome 156). Source: Run 16 row UP-1, `S5-liveB.md` §10 and decisions.md #284.
5. **The upload's CDP calls are bounded at 15 s**, a bound chosen before any measurement; Run 16 recorded no upload near
   it (UP-OPT's 6061 ms is the options page, a different bound). Source: decisions.md #268; `S5-record.md`.
6. **The finder is shipped as a literal closure-free string and must stay so:** its guard test copies esbuild's options
   instead of reading `extension/build.mjs`, so `keepNames: true` there would pass the tests yet ship a finder that calls
   `__name`. Source: `S3-verifier2.md` NIT A (line 80) and `S3.md` § 5 item 6 (the follow-up); phase doc Follow-ups (a test-only change is listed there).
7. **Extension tests are not type-checked** (`extension/tsconfig.json` covers `src` only). Source: `S2.md` §6.
8. **SW-2 (replace the "waits stay" clause near line 187 with the measured result):** Run 16's differential row, with a
   discarded warm-up (770 ms), read d = [-24, 95, 68] ms in 3/3, i.e. the tab-activation event ends the capture wait
   (the 0.14 (c) table); no S5b, and `activateForCapture`'s waits are unchanged. Source: `docs/e2e-test-plan.md` §5 Run 16,
   row SW-2 (REC:180-192); decisions.md #282, #285.
9. **Key files:** none missing. Optional: the `saveTo`-store bullet (lines ~107-113) already carries S1's behaviour.

## `extension/src/handlers/CLAUDE.md`

None. `handlers/upload.ts` only registers `uploadFiles`; the facts it carries (the background attach, the unmark on
failure, the file-access refusal) are bound to `extension/src/upload-files.ts` and are proposed above under
`extension/CLAUDE.md` (items 2–4). `extension/CLAUDE.md` Key files already lists `handlers/upload.ts`, and this file
holds gotchas, not a file list (`grep -i upload extension/src/handlers/CLAUDE.md` is empty by design).

## `extension/src/evaluate/CLAUDE.md`

1. Pointer only: `saveTo`'s marked refusals (`evaluate/save.ts:129-130, 151, 223`) are described in `extension/CLAUDE.md` →
   `markOwnRefusal` (#254); this file needs no copy of the set.

## `extension/src/content/CLAUDE.md`

None. The `data-__bridge-upload` bullet exists.

## `sdk/CLAUDE.md`

1. **Key files, `src/`:** add `upload.ts` (Step 11 S4: `prepareUpload` — every path absolute, an existing regular
   readable file, else `BAD_PARAMS` naming the entry's index and never its path; sends `fs.promises.realpath`; sha256 and
   size from one read; re-exported on the `@bridge/sdk/download` subpath; the types `UploadOptions`, `UploadResult` are
   exported from `index.ts`, the eight values unchanged) and `Tab.upload(target, paths, {timeoutMs?})` / the cursor's
   `client.upload` in the `tab.ts` / `client.ts` entries. Source: `sdk/src/upload.ts:1-20`, `sdk/src/tab.ts:408`,
   `sdk/src/index.ts:39-40`; decisions.md #240, #261, #262; `sdk/test/s11-upload.test.ts`.
2. **`error.ts`:** `safetyRefusalLine("UPLOAD_REFUSED")` is the one fixed line naming both causes (the folder rule and
   "Allow access to file URLs" off); the MCP shows it. Source: `sdk/src/error.ts:136`; decisions.md #263, #264.
3. **Gotcha:** `fs.promises.realpath` canonicalises case and 8.3 names where `fs.realpathSync` keeps the given form, so the
   SDK must use the former for the folder rule; not measured: an unreadable file (`EACCES`) and a folder on a
   `subst`/mapped drive (the real path may resolve past the drive letter and never match). Source: `stage0-audit.md` F8;
   `S4.md` §6.

## `mcp/CLAUDE.md`

1. **Key files, `tools/registry.ts`:** add `browser_upload_file` (Step 11 S4: `prepareUpload` first, then
   `uploadFiles` with the real paths; the answer `Uploaded <n> file(s) to <target>:` and `<name> · <bytes> bytes · sha256
   <hex>`, no directory; the description's last clause says the answer is not proof) and that `browser_click`'s
   description now ends with the focus sentence and also points a file input to this tool (a test,
   `s2-focus-first.test.ts`, requires the focus sentence last). Source: `mcp/src/tools/registry.ts:492,612-640`;
   `mcp/test/s4-upload-tool.test.ts`; decisions.md #241, #262.
2. **Gotcha:** the tool's description makes no background-tab claim yet, although Run 16 UP-1 measured it works (#262's
   Revisit-if; #284 allows the sentence); adding it changes the schema baseline test by that tool's entry only.
   Source: `S5-liveB.md` §10; decisions.md #262, #284.

## `shared/CLAUDE.md`

1. **Key files, `codes.ts`:** "the 26 error codes of spec §10: 25 on the wire" is stale: 27 codes, 26 on the wire, with
   `UPLOAD_REFUSED` (out of `ATTACH_CODES`). Source: `node scripts/doc-check.mjs` ("codes: 27"); `shared/src/codes.ts:11-13,
   66`; decisions.md #237.
2. **Key files, `protocol.ts`:** add `UPLOAD_FILES_MAX_PATHS = 20` and the `uploadFiles` params guard (1-20 non-empty
   strings, other keys such as `tab`/`tabId` allowed). Source: `shared/src/protocol.ts:578-606`; decisions.md #257.

## `daemon/CLAUDE.md`

1. **Key files, `methods.ts`:** add `uploadFiles` to the "tab methods, lease-checked, no lock" list (another client's tab
   → `TAB_HELD`; forwarded with a numeric `tabId` and the real paths; `takesLock` false). Source:
   `daemon/src/methods.ts:9,32`; `daemon/test/s2-upload-methods.test.ts`, `mcp/test/s4-upload-cross.test.ts` (over real
   `ws` on port 0); decisions.md #238.

## `recipes/CLAUDE.md`

1. **Key files:** the `s11*` helpers are listed in `recipes/README.md` now; the `recipes/CLAUDE.md` Key-files entry should
   name them in one line: `s11.ts` (the SDK actor), `s11-rules.ts` (pure pass rules and the expected texts, tied to the
   product constants by `recipes/test/s11-rules.test.ts`), `s11-evidence.ts` (the leak-scan counter), `s11-csp.py`,
   `s11-r16.ps1` / `s11-r16-plan.ts` (the block runner and its pure plan), `s11-win.ps1` / `s11-win-rules.ts`
   (UI Automation for the Upload folders box and the file-URL toggle's read), `s11-r16-opt.ts` (UP-OPT's judge). Source:
   `recipes/s11*` headers; `S5-rules.md`, `S5-win.md`, `S5-runner.md`.
2. **Gotcha, a scan pattern belongs in a scratch file:** a report written by an agent can leak the very profile path it
   used as a scan pattern; name the pattern in the report only by a placeholder, and a window title can carry the
   Chrome profile's display name (a worker console's first line: "DevTools - <profile>"). Source: `S5-record.md` §6
   (MINOR-5, NEW-1); decisions.md #283.
3. **Gotcha, a STOP line ends the wave:** any `STOP:` printed by an `s11-win.ps1` helper, including one inside
   `Restore-S11Safety`, ends the wave; never print `$_` from these helpers; set `$global:W` to the front window before
   `Enter-S11Guards`; call `Save-S11Found` before `Invoke-S11Opt`; UP-RACE-A needs the pinned toolbar button. Source:
   `S5-win.md` §6.
4. **Gotcha, ports and the maximized window:** port 8080 may be held by VS Code (`Code.exe`), tripping #251's port STOP;
   a maximized Chrome window's frame overhangs its monitor by 8 px and meets an auto-hidden taskbar's 2 px strip, so an
   occluder guard over a maximized wave window stops on the taskbars (the existing occlusion bullet at line ~113 can
   carry it). Source: `S5-fixtures.md` §6; `S5-liveA.md` §12, `S5-liveA-occluders.txt`.
5. **Gotcha, the recipes typecheck is a separate gate:** `recipes/tsconfig.s10.json` exited 2 from S3 until S3c (an
   erased `import type` fixes it); S3's verifiers ran only the root typecheck. All six `recipes/tsconfig*.json` now
   exit 0 (the root `CLAUDE.md` Commands line lists five configs and should name `tsconfig.s11.json`). Source: `S3c.md`;
   decisions.md #276.

## Not proposed (no source, or already recorded elsewhere)

- The UP-RAW limit (a raw upload of a missing file answers ok) and the other known limits are in `docs/setup.md` §
  Uploading files and the phase doc's Open items; they are contract questions for the user (#284), not package gotchas.
