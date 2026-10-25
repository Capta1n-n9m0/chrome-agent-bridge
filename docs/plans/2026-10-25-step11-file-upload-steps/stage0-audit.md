# Step 11 — Stage 0 spec audit

**Date:** 2026-10-25 · **Role:** builder (Stage-0 auditor), model **Opus 5.5** · **Tree:** HEAD `fc7a571` (product code
identical to `eac8324`: `git diff --name-only eac8324 HEAD` lists only `.md`, `scripts/doc-check.mjs` and a lean-procedures
`.mjs`), exported by `git archive` into a scratch folder with its own `npm ci` (no worktree, no junction). Port 0 only;
no daemon on 9234, no Chrome touched.

## 1. Verdict

**DONE.** Z.1 is met: findings ranked with commands, Step 9's and Step 10's contracts executed on port 0 (all held),
counts recomputed, every (proposed) decision attacked, `DOM.setFileInputFiles` cited with its source, the stage split
in `journal.md`. One CRITICAL finding (F1) is plan-side and contract-level: it needs the user before S2's gate and
before Run 16.

## 2. Outputs

| File | What |
|---|---|
| `stage0-counts.txt` | counts with their commands; `node scripts/doc-check.mjs` output |
| `stage0-contracts.txt` | the port-0 contract probes' full output, and the 27 shipped test files that pin Step 10's contracts |
| `stage0-probes.ts.txt` | the probe sources (scratch only, never in the repo) and the realpath probe |
| `stage0-cdp.txt` | `DOM.setFileInputFiles`'s definition, the one web lookup, Playwright's use of it, Node's realpath variants, `netstat` |
| `stage0-matcher-cases.txt` | the matcher's case table for S2 (74 rows, Windows and POSIX) |

**Counts** (recomputed; all agree with the root `CLAUDE.md` and the phase doc):

| Count | Value | Command |
|---|---|---|
| router methods | 26 | `grep -o 'router.on("…"' extension/src/sw.ts \| sort -u \| wc -l` → 26; probe `classified=26 swScan=26 equal=true` |
| codes / on the wire | 26 / 25 | probe `daemon=9 extension=16 sdk=1 total=26 wire=25` (doc-check reports only `codes: 26`) |
| MCP tools | 23 | quoted `browser_*` names in `registry.ts` → 23; doc-check `tools: 23` |
| `npm test` | 3273 tests / 132 files | full `npx vitest run` in the scratch tree, exit 0 |
| log-scan allowlist | 54 (extension 15, daemon 33, sdk 0, mcp 6) | probe over `LOG_ALLOWLIST` |
| SDK main-entry values | 8 | probe over `Object.keys(sdk/src/index.ts)` |

**Contracts.** Step 8 C1–C4, C6, C7, Step 9's daemon side (relay, redaction, attach set) and Step 10's 0.3 wire: Step 10
Stage 0's probe, re-run verbatim except the code counts (26/25): 11/11 pass. Step 9's extension side on the Step 10
build (`GatedRouter.on` throws on every unclassified name incl. `uploadFiles`; unknown method `UNKNOWN_METHOD` with 0 state
reads; `DISARMED {scope:"all"}` > `DOMAIN_BLOCKED`; JavaScript off → `JS_DISABLED`, no data, for `evaluate` and
`evaluateSaveStart`): pass. Step 10's contracts (focus first and the #214 baseline, the cap warning, `saveTo`, `JS_DISABLED`,
the log scan at 54): 27 shipped test files, 915 tests, pass. **All held; no CRITICAL from the contracts.**

## 3. Verifier verdict

Not applicable (leaf report; the step agent sends the verifier).

## 4. Deviations

- The one web lookup went to Chromium's `dom_handler.cc`, not the protocol docs page: the parameters come from Chrome's
  protocol definition as shipped in a local Playwright `protocol.d.ts` (a file, read by `grep`), and the open question
  was the browser-side gate. Source URL in `stage0-cdp.txt` §2.
- The fixture port 8080 is held by VS Code at audit time (F13); nothing was stopped.

## 5. Proposed decisions

### 2026-10-25 · Uploads need Chrome's file access, and the bridge never opens or reads `file:` pages
**Decided:** (a) the gate refuses every tab call on a `file:` tab and every `navigate`/`newTab` to a `file:` URL
(`DOMAIN_BLOCKED`, a fixed message), for all methods, before Step 11 asks anyone to turn file access on; (b) the upload
handler reads `chrome.extension.isAllowedFileSchemeAccess()` (`@types/chrome` `index.d.ts:4574`) before attaching and,
when false, refuses `UPLOAD_REFUSED` with a second fixed message ("the user has not allowed this extension file access
in Chrome"); (c) a human gate **G11-3**: the user turns on "Allow access to file URLs" for the bridge, or grants the wave
to do it on `chrome://extensions` in its own window and restore it (read back) — it reloads the extension. **Why:** F1.
**Instead of:** leaving `file:` reachable once the toggle is on; a raw `[chrome.debugger] Not allowed`. **Revisit if:** S5
measures that the upload works with the toggle off. **By:** Claude (proposed; **for user review**, contract and security)

### 2026-10-25 · S1 marks the bridge's own refusals explicitly; page errors and timeouts keep the prefix
**Decided:** #244 (a) is reworded: a refusal the bridge raises on purpose inside `withDebugger` (the `saveTo` refusals of
`evaluate/save.ts`, incl. the `PAGE_ERROR` of `STRINGIFY_FAILED_MESSAGE`) is created with an explicit marker that
`describeDebuggerError` passes through unchanged; `pageError` (`evaluate/result.ts:82`) and `raceTimeout`'s `TIMEOUT`
keep `[chrome.debugger] `. `debugger-errors.test.ts:92-101` stays byte-identical; a new failing test pins the marker.
`debugger-errors.ts:58` stays byte-identical (pinned by `recipes/test/s10-rules.test.ts:1276`). **Why:** F2. **Instead of:**
"an own `BridgeError` whose code is not a debugger code" (unprefixes EVAL-5 and timeouts). **Revisit if:** the user wants
timeouts unprefixed too. **By:** Claude (proposed; for user review — wire message text)

### 2026-10-25 · The target rule refuses `webkitdirectory` inputs, and `files` is read back from the page
**Decided:** S3's target rule refuses an input with `webkitdirectory` (`BAD_PARAMS`); after the CDP call the handler
reads the input's `files.length` in the content script and returns it as `files`. **Why:** F4, F7. **Instead of:** a
directory upload the matcher cannot see into; a count that echoes the request. **Revisit if:** directory uploads are
wanted. **By:** Claude (proposed; `files`' meaning is wire-level — for user review)

### 2026-10-25 · The finder runs in an isolated world
**Decided:** S3 runs the finder with `Runtime.evaluate {contextId}` in a world from `Page.createIsolatedWorld`, or walks
`DOM.getDocument {depth:-1, pierce:true}` in the extension; not in the page's main world. **Why:** F11. **Instead of:**
the page's world, where page-patched prototypes run during the bridge's code. **Revisit if:** S3 shows a same-origin
frame unreachable from the isolated world. **By:** Claude (proposed; design-local)

### 2026-10-25 · The Run 16 pass rules F5, F6, F9 rewritten before S5
**Decided:** UP-6's "no call" is judged by the SDK's own preflight message constant and the page reporter, not
`daemon.log`; UP-LOGS counts in `daemon.log`, the worker console and the actors' tool *results* (not the actor's own
tool inputs), and `<ROOT>` is named in the sheet; UP-6's `..` row expects `UPLOAD_REFUSED`. **Why:** F5, F6, F9. **By:**
Claude (proposed)

## 6. Findings

Tags: **P** plan-side (a dated phase-doc note), **C** code-side (a stage item). Evidence file in brackets.

| # | Sev | Tag | Finding and evidence | Proposal |
|---|---|---|---|---|
| F1 | CRITICAL | P, contract | `DOM.setFileInputFiles` is refused in the browser process unless the CDP client may read local files: `if (!allow_file_access_) return Response::ServerError("Not allowed")`, then `GrantReadFile` per path [cdp §2]. For an extension client that flag is (from memory, **not confirmed** — one lookup only) the "Allow access to file URLs" toggle; `docs/e2e-test-plan.md:48` implies it is off on this machine. Turning it on also opens `file:` pages: the gate allows them today (probe: `navigate-file/armed -> ok handlerCalls=1`, `newTab-file/armed -> ok`) and the manifest holds `<all_urls>` — so navigate + snapshot/evaluate would read any local file, past the folder rule. Today the wire error would be `DEBUGGER_ATTACH "[chrome.debugger] Not allowed"` (probe). | Proposed decision 1; a 0.3/0.4 note; G11-3; UP-0 reads the toggle; S5 measures "toggle off → Not allowed" as a RECORD row |
| F2 | MAJOR | P+C, S1 | #244 (a) as worded unprefixes EVAL-5: `pageError` is an own `BridgeError` `PAGE_ERROR`, and so is the `saveTo` stringify refusal — no code separates them. Probe: EVAL-5 today `PAGE_ERROR "[chrome.debugger] Error: boom"`, under #244 `"Error: boom"`; `TIMEOUT` too. `debugger-errors.test.ts:92-101` pins the prefix on own `PAGE_ERROR`/`TIMEOUT` (editing it is a forbidden fix); `s10-rules.test.ts:1276` pins `debugger-errors.ts:58` by source [contracts]. | Proposed decision 2 |
| F3 | MAJOR | P | 0.4's threat model is unstated: the folder rule binds an agent whose only reach is the bridge. An agent with a shell (Claude Code) can copy any file into an allowed folder, hard-link it (realpath keeps the link: `hard.txt … nlink=2`), or edit the options page by UI Automation as #243's wave does [cdp §4]. | A dated note in 0.4 and in `docs/setup.md` (S6): which agents the rule protects against |
| F4 | MAJOR | C, S3 | A `webkitdirectory` input takes a directory path and uploads its contents: Playwright refuses files for it ("[webkitdirectory] input requires passing a path to a directory") [cdp §3]; the matcher and the realpath step see only the folder path, not junctions inside it. | Proposed decision 3 |
| F5 | MAJOR | P | UP-6 "a missing file → … no call (`daemon.log` shows none)" cannot fail: the daemon logs no per-call line (log allowlist: only `extension error without code: ${method}`) [counts, contracts]. | Proposed decision 5 |
| F6 | MAJOR | P | UP-LOGS "0 for the user's profile path" in every actor transcript: the MCP actor's own tool input carries `<ROOT>\…`, and any scratch folder is under the profile, so it fails by construction or is excused ad hoc. | Proposed decision 5 |
| F7 | MINOR | C, S3 | `{files: number}` echoes the request; UP-1's "ok but nothing" outcome is visible only on the page. | Proposed decision 3 |
| F8 | MINOR | C, S4 | `fs.realpathSync` (JS) keeps 8.3 names and the given case (`LONGFO~1`, lower case); `realpathSync.native` and `fs.promises.realpath` canonicalise; all three resolve the junction and keep an ADS suffix (`f.txt:ads`, `isFile=true`) [cdp §4]. | S4 uses `fs.promises.realpath`; the extension's ADS rule stays the guard |
| F9 | MINOR | P, S2 | The gate can only return a `SafetyRefusal`, so every matcher refusal is `UPLOAD_REFUSED`; UP-6's "the matcher's code" is unwritten. A malformed `paths` (not an array, a non-string, > 20) must also fail closed at the gate. | Proposed decision 5; an S2 item |
| F10 | MINOR | C, S2 | 0.4's refusal classes miss doubled and trailing separators, DOS device names, trailing dot/space segments, padding, length; `toLowerCase` folds U+212A into `k` (executed) [matcher-cases]. | The 74-row table; ASCII-only case folding |
| F11 | MINOR | C, S3 | 0.7's finder runs in the page's main world. CSP is not the issue (EVAL-12 already measured CDP evaluate past a CSP, `e2e-test-plan.md:336`); page-patched prototypes are. Playwright resolves the element in its utility world and passes `objectId` (no `DOM.enable`, no `getDocument`) [cdp §3]. | Proposed decision 4; UP-8 stays (header CSP) |
| F12 | MINOR | C, S4 | `s2-focus-first.test.ts:235` requires `browser_click`'s description to *end with* the focus sentence: 0.9's added sentence goes before it. | S4 item |
| F13 | MINOR | P, S5 | 8080 is LISTENING by `Code` (PID 28444); 8081–8086, 8090, 9234 free; none in an excluded range [cdp §5]. | UP-8 port **8084**; S5 checks 8080/8081 first and stops if held |
| F14 | MINOR | C, S2 | `safetyDecision` ignores `params` (`safety.ts:271`, probe `a="allow" b="allow"`), and `SafetyContext` (`safety.ts:155`) holds only `extensionId`, `blockList`: class `upload` needs `paths` and the parsed folders in the view, `failClosedView` (`safety-state.ts:131`) too. | S2 item |
| F15 | MINOR | P | A disarm or a folder removed after `DOM.setFileInputFiles` returns: the reply is a refusal, the page holds the file. "Every refusal leaves the page with nothing" holds only before the attach. | A known-limit line in Open items |
| F16 | NIT | P | doc-check reports no wire-code count; 25 recomputed. A11y facts confirmed by jsdom: file inputs list as `button`; `display:none`/`opacity:0`/`visibility:hidden` inputs are pruned (`{css:'#hid1'}` → `LOCATOR_NOT_FOUND`); `{text}` on a `<label>` resolves the label, whose `control` is the input [contracts]. | none |

**Attacks with no finding:** #233 (S3 and S4 file-disjoint: lanes checked), #234, #235 (paths only; no frame limit;
`GrantReadFile` confirms Chrome reads the path), #237's order and code count (27/26), #238 (`classify("uploadFiles",
{tab})` = `tab`, `takesLock` = false today), #240 (eight values held), #242 (daemon `redact` passes every path:
probe `PASSES` ×3), 0.13, 0.14 (c) (its outcome table equals the Step 10 phase doc's lines 320–322).

**Proposed dated phase-doc notes (plan-side findings):**
- 0.3, 0.4 (F1): *Note 2026-10-25 (Stage 0 F1): Chrome refuses `DOM.setFileInputFiles` ("Not allowed") unless the CDP
  client may read local files — for this extension, presumably its "Allow access to file URLs" toggle, which also opens
  `file:` pages to navigate and snapshot. The bridge refuses `file:` pages and checks the toggle before an upload
  (proposed; for user review); G11-3 added.*
- 0.4 (F3): *Note 2026-10-25 (Stage 0 F3): the folder rule binds an agent whose only reach is the bridge; an agent with a
  shell can copy or link a file into an allowed folder. Choose folders accordingly; recorded as a known limit.*
- 0.12 UP-6, UP-LOGS (F5, F6, F9): *Corrected 2026-10-25 (Stage 0): UP-6's "no call" is judged by the SDK preflight's
  message constant and the reporter, not `daemon.log` (which logs no calls); the `..` row expects `UPLOAD_REFUSED`;
  UP-LOGS counts the actors' tool results, not their own inputs.*
- 0.12 UP-8 (F13): *Port 8084 (Stage 0 `netstat`, 2026-10-25); 8080 was held by another program at the audit.*
- Open items (F15): *a refusal after the CDP call (a disarm, a folder removed) can leave the file in the page.*

**`DOM.setFileInputFiles` [cdp §1–3].** Parameters: `files: string[]`, and one of `nodeId`, `backendNodeId`, `objectId`;
empty return. With `objectId` no `DOM.enable`/`getDocument` is needed (Playwright). Browser side: the file-access check,
then a read grant per path. **Only S5 can measure:** the toggle's mapping and default; a background tab (UP-1); event
order and `isTrusted`; a missing path and a directory (raw `client.call`, RECORD); `accept` (not enforced by Playwright's
checks — unmeasured); more than one file into a non-`multiple` input (the bridge refuses first; from memory Chrome keeps
the first); the banner.

**UP-CLICK.** No proven safe way. Chrome's file dialog is a native `#32770` window owned by the tab's window; the
recipes' keystrokes (`keybd_event` Enter/Alt in `reload-extension.ps1:176-187`) go to the foreground window, which may be
the user's; Chrome's toolbar buttons expose no UIA Invoke (`recipes/CLAUDE.md:57`), and no recipe has met a file dialog.
A candidate (UIA Invoke on the Cancel button of a `#32770` whose owner is the wave's own window handle, no key, no
mouse, STOP if open after 5 s) is unmeasured, and the MCP's trusted click first brings the tab to the front of its
window. Recommendation: UP-CLICK not run in Run 16 (allowed by "Continues anyway").

## 7. Handoff

- Recommended stages (also in `journal.md`): **S1** 1.5 h, standard (F2's rule); **S2** 3 h, standard (+F9, F10, F14,
  and F1's `file:` rule if ruled); **S3** 3.5 h, standard (+F4, F7, F11, F1's file-access check) ∥ **S4** 2 h, standard
  (+F8, F12); **S5** prep 2 h low, live 2 h standard (G11-3 first; F5, F6, F9, F13); **S6** 1 h, low (+F3's text).
- Waiting for the user: F1 (proposed decision 1, G11-3) before S2's gate code and before Run 16.
- No processes left; scratch tree and probe files only under the scratch folder; the test junction removed with
  `cmd /c rmdir`.
