# Step 11 S3 — verifier report: the extension's handler, mark, options page

Model: Opus 5.5 (`claude-opus-5-5`). Date 2026-10-25. Role: verifier (agent-rules §6), risk standard. Commit checked:
`7e12707` (parent `acbb042`, S4's, out of scope). Commit: none (brief).

## 1. Verdict

**PASS-with-notes.** S3.1–S3.4, the every-stage checks and the brief's extra criteria hold. No CRITICAL or MAJOR
finding. Two MINOR and five NIT, none blocking.

## 2. Outputs and checks (from a `git archive 7e12707` copy in `%TEMP%\s3v-7e12707`, own `npm ci`, no junction)

| Check | Command | Result |
|---|---|---|
| typecheck | `npm run typecheck` | EXIT 0 (all five projects) |
| tests after | `npm test` | `Test Files 143 passed (143)`, `Tests 3583 passed (3583)` |
| tests before | same copy with `extension/src`, `extension/test`, `extension/options.html` from `acbb042`, `npx vitest run` | `Test Files 140 passed (140)`, `Tests 3532 passed (3532)` |
| delta | | +51 tests, +3 files. Rewritten in place, count unchanged: `sw-static.test.ts` (1 test), `s2-upload-gate.test.ts` (3 tests); `safety-writers.test.ts` +4. No test removed. Matches the builder's report. |
| build | `npm run build` | EXIT 0, `built extension → dist/` |
| tree after build | `git status --short` (copy has its own git) | empty |
| a11y/snapshot/locate | `git diff eac8324 7e12707 --stat -- extension/src/content/{a11y,snapshot,locate}.ts` | empty |
| lane | `git diff --name-status acbb042 7e12707` | 17 files: `extension/src` (not the six excluded files), `extension/options.html`, `extension/test/`, the builder report. In lane. |
| log scan | `log-allowlist.ts`, `log-scan.test.ts` unchanged; `console.` in `extension/src/**/*.ts` 15 at `acbb042`, 15 at `7e12707`; no `console.` in any S3 file | count unchanged |
| shipped finder | `grep -c __name dist/sw.js dist/content.js` | 0 / 0; `dist/sw.js` finder = the source function modulo semicolons |

**Red on the pre-change code.** New/changed tests run against `extension/src` + `options.html` reverted to `acbb042`:
`Test Files 6 failed (6)`, `Tests 14 failed | 37 passed (51)` — the three new handler/target/gate files fail at import
(the modules do not exist), all 11 options tests red, `sw-static` red, 2 of 4 new `safety-writers` tests red (the other
two are mutation self-tests of the scanner; see NIT 5).

**Verifier's own mutants** (each applied to S3's source, the six S3/S2-upload test files run, file restored;
copy clean after): all 18 red.

| Mutant | Red |
|---|---|
| V1 finder removes the mark from the first carrier only | 1 |
| V2 `done = true` before the CDP leg (no sweep on its failures) | 5 |
| V3 the `many` refusal not marked | 2 |
| V4 file access `allowed ?` instead of `=== true` | 1 |
| V5 file-access check after inject | 3 |
| V6 content: `webkitdirectory` attribute not checked | 3 |
| V7 `unmarkUpload` sweeps every mark | 1 |
| V8 no 15 s bound around the CDP leg | 2 |
| V9 finder skips same-origin frames | 1 |
| V10 finder does not re-check `webkitdirectory` | 1 |
| V11 no effect check before the mark | 2 |
| V12 `/home/<name>` not warned | 1 |
| V13 `Runtime.releaseObject` not in a `finally` | 1 |
| V14 single-file check off (content) | 2 |
| V15 label rule (ii) dropped | 3 |
| V16 no guard passed to `withDebugger` | 3 |
| V17 a breakdown marked own (unprefixed) | 1 |
| V18 the Save writes `blockList` instead of `uploadFolders` | 3 |

Plus the builder's nine (main world, no failure sweep, `REF_STALE` unmarked, …), not re-run.

**Brief criteria, item by item.**
- S3.1: (i)–(iii), the closed root excluded, and each 0.7 refusal tested in jsdom through the shipped
  `window.__agentBridge.markUpload` (`s3-upload-target.test.ts`). #247 `webkitdirectory` → `BAD_PARAMS` in the content
  rule and again in the finder (V6, V10).
- S3.2: mark set once (stray marks swept first) and removed on success, CDP error, not found, timeout, disarm (at the
  effect and mid-session), attach failure; tested on `UPLOAD_FINDER_SRC` and `unmarkUpload`; 0 → `REF_STALE`, 2 →
  `INTERNAL`.
- S3.3: `UPLOAD_STEP_METHODS` asserted call by call with params (`Page.getFrameTree` → `Page.createIsolatedWorld` →
  `Runtime.evaluate {contextId}` → `DOM.setFileInputFiles {files, objectId}` → `Runtime.releaseObject`); effect
  before attach (`log` = `["effect"]` on a refusal). This list is 0.7's (finder → set → release), with the frame tree
  and isolated world added because of #248.
- #248: every `Runtime.evaluate` carries the isolated world's `contextId`. The finder is closure-free and calls only
  DOM methods, which in an isolated world use that world's own prototypes.
- #245 (b): `NO_FILE_ACCESS_MESSAGE` pinned literally, names no path; read before effect, inject, mark or attach
  (`log` = `["tabs.get","fileAccess"]`); a throw or a non-`true` value refuses.
- #246: the finder's refusals are `markOwnRefusal`-ed and pinned through `uploadByMark` → `withDebugger` unprefixed;
  breakdowns, the raw Chrome error and `TIMEOUT` keep `[chrome.debugger] ` (literal pins).
- S2's stub tests: rewritten as "the handler is unreachable with a refused path". The real handler runs behind the
  gate over a recording `chrome`, every form gets `UPLOAD_REFUSED`, and no `chrome` call is made.
- S3.4 / options: only `options.ts` writes `uploadFolders` (writers test, V18); the model marks a root and a relative
  line with their reasons; #250 standing warning pinned literally; home and `.ssh` warned, never refused (#257).
- Refusal texts: none names a path, folder, file or the mark; the only variable in an S3 message is a ref id (`e12`).

## 3. Deviations

None from the brief. The S3 changes in the copy were reverted by overlaying files (`git archive acbb042 …`), not with
`git checkout` in the main tree. The main tree was not touched.

## 4. Proposed decisions

None of my own. On the builder's "the failure-path sweep removes the bridge's own mark without passing the gate":
it is **not a hole in the gate**. Nothing on the wire reaches it (it is not a router method; it runs only in
`uploadFiles`'s `finally` after `markUpload` was asked for, on the same `tabId`, after a call the gate admitted). It
runs one fixed function that removes only this call's attribute value and reads nothing back. 0.7 requires
removal "on every path … disarm", so the builder followed a pre-stated rule. It is still safety-side, so the "for
user review" mark is right. One sharpening, under MINOR 1 below.

## 5. Findings

**MINOR 1 — the ungated sweep is scoped to the tab, not to the marked document.** `extension/src/handlers/upload.ts:59-64,88`.
If the tab navigated between the mark and the failure, `chrome.scripting.executeScript` runs the sweep function in the
*new* document, which may be a blocked host. The content script is injected on demand, so `window.__agentBridge` is
undefined there, the function throws, and the error is swallowed: no effect and no read. Still, the bridge runs a
script in a page the gate would refuse. Evidence: by reading `inject.ts:75-97` (`target: { tabId }`, `world:
"ISOLATED"`, no `documentIds`). Suggested fix: capture the `documentId` from `markUpload`'s `InjectionResult`
(Chrome ≥ 106) and sweep with `target: { tabId, documentIds: [id] }`. A navigated tab then gets no script. Record it
with the builder's decision for the user.

**MINOR 2 — S5's row list leaves three `chrome.*` paths unmeasured** (builder report §7). The list covers the file-access
read (row 1; it also shows whether `chrome.extension.isAllowedFileSchemeAccess()` returns a promise in the MV3 worker —
if not, every upload refuses, which fails closed), `createIsolatedWorld` without `Page.enable`, same-origin frame reach,
the mark after success and failure, DevTools/attach, a stale content script and the options page. Missing:
(a) a disarm (or a block-list edit) landing during an upload, with the page's MutationObserver judging the mark and
the files (this is the ungated-sweep decision's live behaviour); (b) two uploads in a row on one page (a repeated
`Page.createIsolatedWorld` with the same `worldName`); (c) a raw Chrome error text from `DOM.setFileInputFiles` checked
for no path (it passes through `describeDebuggerError` unchanged). Suggested fix: S5 adds (a)–(c) as rows or RECORD rows.

**NIT 1 — a page can keep the mark itself.** The page can move the marked input into a closed shadow root, or navigate
away so the marked document sits in the back/forward cache. The finder (`upload-files.ts` `uploadFinderFn`) and
`unmarkUpload` reach neither, so the attribute (a random UUID) stays on that page until the next `markUpload` sweeps
strays (`content/upload-target.ts:117`). Only a hostile or unusual page does this, and nothing leaks. Record it as a
known limit beside 0.7.

**NIT 2 — a test's name does not match its body.** `extension/test/s3-upload-handler.test.ts:277` "a CDP error
(DOM.setFileInputFiles fails)" fails `Page.createIsolatedWorld`. A `DOM.setFileInputFiles` failure is covered only at
`setFilesByMark` level, and V13 shows that test discriminates. Rename the test, or add the handler-level row.

**NIT 3 — no automated guard that the shipped finder stays closure-free.** `UPLOAD_FINDER_SRC = String(uploadFinderFn)`.
A bundler with `keepNames` inserts `__name(visit, "visit")`, which throws in the isolated world. I showed this with
`npx tsx` (it prints `…}__name(visit,"visit");try{visit(document)…`), while `dist/sw.js` and vitest have none. Only
the builder's manual grep checks `dist`. Suggested fix: a test that scans `extension/dist/sw.js` (or the build config)
for `__name`, or a `extension/CLAUDE.md` gotcha shared with `SERIALIZER_SRC`.

**NIT 4 (spec attack) — the last effect check is before the attach, not before `DOM.setFileInputFiles`.**
`debugger.ts:uploadByMark`; 0.5 says "before the first side effect (before attaching)". A folder removed or a host
blocked during the session's three CDP round trips is caught only by the post-check, after the file may already be in
the page. A disarm is caught, because it detaches the session. The phase doc's Open items already list this as a
known limit, and the builder follows the spec. Optional fix: pass `guard` into `setFilesByMark` and call it once
between the finder and `DOM.setFileInputFiles`.

**NIT 5 — two of the four new writers tests pass on the pre-change code.** `extension/test/safety-writers.test.ts:256`
("the toggle also writes the folders") and `:267` ("a handler writes `safety.uploadFolders`") are mutation self-tests
of the test's own scanner, so they need not fail before S3. The two direct tests (`:247` and the options-switch
mutation) are red at `acbb042`. Recorded, not a defect.

Also recorded: the content `BAD_PARAMS` texts are tested through their constants, not as literals. S6 must quote
them from `content/upload-target.ts`.

## 6. Handoff

No process left running. The scratch copy `C:\Users\aliev\AppData\Local\Temp\s3v-7e12707` (own `node_modules`, no
junction) and its logs are deleted at the end of this run. The S4 tests in the copy all passed.
