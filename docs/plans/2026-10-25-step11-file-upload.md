# Step 11 — D3 file upload (`browser_upload_file`, `Tab.upload`)

**Date:** 2026-10-25 · **Status:** Running — Stage 0 done 2026-10-25 (kickoff `docs/plans/next-session-prompt.md`)
**Design of record:** this doc's "Decisions"; the design spec `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md`
binds for everything it does not change (§5 layer contract, §6 the human, §10 protocol and codes, with the Step 9 and
Step 10 dated notes) · **Roadmap:** `docs/progress-and-roadmap.md` §5 (Phase D, "D3 file upload — not started") ·
**As built:** § As built below (decisions.md · 2026-10-25 · Lean procedures: rules by pointer, package CLAUDE.md
files, risk-tiered models (#230)) · **Steps
dir:** `docs/plans/2026-10-25-step11-file-upload-steps/` (created at kickoff).

> **PRECONDITION — the Step 11 run starts only after the user has ruled Step 10's open decisions** (decisions.md →
> Open decisions → Step 10: #204's contract-level parts, #205, #206, #207, #208, #216 item 2, #217, #218, #219 item
> 1, #227). A ruling may add a small stage to Step 11 — for example #227 option (b) (an own coded `BridgeError`
> thrown inside `withDebugger` keeps its message unprefixed, failing test first, then a new row SAVE-REFUSE-R), or
> the `saveTo` parameter description's missing `kind` (a schema-text change under #214's recorded re-baseline;
> Step 10 as-built § S8). Such work runs as stage **S1** below, before any upload code, and its text is pasted into
> this doc as a dated note when the ruling lands. G10-1 (the `step8` tag and any push) may still be open: Step 11
> never tags or pushes, so it does not wait for it. If the rulings are missing, the session agent stops before
> Stage 0, writes one line in the run journal and asks the user. Modelled on how Step 10 made #192 its precondition.

*Met 2026-10-25: the user ruled every Step 10 open decision (decisions.md · 2026-10-25 · The user rules on Step 10's
open decisions; Step 10 closes (#229)). #204–#208, #216 item 2, #217, #218 and #219 item 1 are accepted as built;
G10-1 is granted (the `step8` tag and its push are Step 10's close-out, not Step 11's). The ruling orders stage S1
below with two items — #227 option (b) and `kind` in the `saveTo` parameter description — and adds row SW-2 (the
~1.5 s capture switch, re-measured with a warm-up trial) to Run 16. It places the network rule against redirects onto
blocked sites (#140) as its own small step after Step 11, before Step 12 (Follow-ups).*

## Why

The bridge can click, type, read, evaluate, download and save, but it cannot put a file into an `<input
type="file">`: a synthetic click cannot open a file chooser, and a trusted click opens a native dialog the bridge
cannot see or answer. Every "attach a file" form — a coursework submission, a support ticket, an import page — stops
an agent or a script at that step. Chrome's DevTools protocol has the primitive (`DOM.setFileInputFiles`), and the
extension already runs CDP sessions through `chrome.debugger`. Phase D sketched it on 2026-09-03 (Part D3 of
`docs/plans/2026-09-03-step2-phase-d-action-fidelity.md`), and the order after Step 10 is decisions.md · 2026-10-24 ·
The roadmap after Step 8 (#129): Step 11 is D3 file upload, Step 12 Phase F.

An upload is also the bridge's first action that sends **local files** to a web page. An agent that a page has
talked into it (prompt injection) could upload `~/.ssh/id_ed25519` or `bridge.token` to an attacker's form. So
Step 11 is as much a safety step as a feature: the files that may be uploaded are decided by the human, in Chrome,
and enforced in the extension, like Step 9's switches.

## Outcome (planned)

- `Tab.upload(target, paths)` in the SDK and `browser_upload_file` in the MCP (24 tools) put one or more local files
  into a file input on a tab, by ref or locator, in the background, through one CDP call — the bytes never cross
  the wire; only paths do.
- Uploads are refused unless every file lies in a folder the human allowed on the extension's options page
  ("Upload folders", empty by default, so uploads are off until the human adds one); the refusal is a new code
  `UPLOAD_REFUSED` that names no path or folder.
- The kill switch, the block list and the own-page block refuse uploads as they refuse every tab call; nothing logs a
  path or a folder.
- Run 16 (live, fixture pages only) proves by the page's own hash that the file the page received is the file on
  disk, on a background tab, through the SDK and the MCP, and that every refusal leaves the page with nothing.
- First, Step 10's ordered follow-ups (#229): the bridge's own refusals inside a debugger session lose the
  `[chrome.debugger] ` prefix (live row SAVE-REFUSE-R), `browser_evaluate`'s `saveTo` description names `kind`, and
  Run 16 re-measures the ~1.5 s capture switch with a warm-up trial (SW-2).
- `npm test` grows from 3273 / 132 (at `eac8324`) with failing-tests-first units for the matcher, the gate class, the
  target rule, the mark, the SDK preflight and the MCP tool.

## Decisions

**(user)** marks a choice the user already ruled (cited by date + title); the *what* is fixed, the *how* below it
is proposed. Everything marked **(proposed)** is recorded by the session agent in `docs/decisions.md` before Stage 0
is spawned, so the audit can attack it; a wrong premise is a finding, and the decision gets a dated note.
Contract-level proposals are also listed under Open decisions for the user.

### 0.1 Precondition and the order of the stages (proposed)

- Nothing starts until Step 10's open decisions are ruled (the box above; met by #229). The work #229 orders is stage
  S1, before any upload code, since #227 (b) touches `extension/src/debugger-errors.ts` and the `saveTo` description
  `mcp/src/tools/registry.ts`, which S2–S4 also edit.
- One live wave, **Run 16** (stage S5), after the code stages, on the Step 11 build: the upload rows, SAVE-REFUSE-R
  and SW-2 (0.14). It runs under decisions.md · 2026-10-24 · S4: Live runners return on every stop; one stop rule
  for sheet and brief (#193).

### 0.2 Step 11 is D3 file upload (user — the what; proposed — the name and the mechanism)

decisions.md · 2026-10-24 · The roadmap after Step 8 (#129) orders "Step 11 — D3 file upload" (the order open for
veto). *Proposed:* the tool is `browser_upload_file` and the SDK method `Tab.upload`, through CDP
`DOM.setFileInputFiles`, as the Phase D sketch and the Step 10 phase doc's Follow-ups name them. Drag-and-drop zones
with no file input, and intercepting the native file chooser, are not this step (0.13).

### 0.3 Paths cross the wire, never bytes (proposed — contract-level)

`DOM.setFileInputFiles {files: string[], nodeId | backendNodeId | objectId}` takes **paths that Chrome itself
opens**. Chrome runs on the same machine as the daemon and every client (the `127.0.0.1` bind), as the same user, so a
path the client can read, Chrome can read. The extension cannot read local files at all.
- **(A) Paths only (recommended).** The client sends absolute paths; the extension passes them to
  `DOM.setFileInputFiles`; Chrome reads the files. No bytes on the wire, no size limit from the 100 MiB frame
  (`daemon/CLAUDE.md`, "one frame > 100 MiB closes the extension socket"), the page gets real `File` objects with Chrome's
  own name, size, type and `lastModified`, and the `change`/`input` events come from Chrome.
- (B) Bytes over the wire: the client reads the file, pushes it in 1 MiB chunks into an extension store, and the
  page builds a `File` from a `DataTransfer` and assigns `input.files`. Rejected: a new push direction and a store
  for every byte, synthetic events, a fabricated `lastModified`/type, and page code that a strict CSP or a framework
  may defeat — for no gain, since Chrome can read the path.
- (C) Bytes to a temp file the extension writes, then (A): rejected — an extension cannot write local files.

Consequence of (A): the **extension sees the path** (unlike `saveTo`, whose path never left the client), so "never
log a path" binds in the extension, the daemon, the SDK and the MCP alike (0.10). The bytes the page receives are
whatever is on disk when Chrome reads it (a file changed between the client's check and Chrome's read is a known
limit, recorded, not guarded).

*Note 2026-10-25 (Stage 0 F1): Chrome refuses `DOM.setFileInputFiles` ("Not allowed") unless the CDP client may read
local files — for this extension, presumably its "Allow access to file URLs" toggle, which would also open `file:`
pages to navigate and snapshot, past the folder rule. Ruled conservatively (decisions.md · 2026-10-25 · Stage 0:
uploads need Chrome's file access, and the bridge never opens or reads `file:` pages (#245)): the gate refuses `file:`
pages (S2), the upload checks `isAllowedFileSchemeAccess()` first (S3), and human gate G11-3 holds the toggle.*

### 0.4 Upload folders: a human-held allow-list in the extension, empty by default (proposed — contract-level, security)

The exfiltration risk is real (Why). Options:
- (a) No rule (as `browser_download` writes anywhere). Rejected: one injected instruction uploads any file.
- **(b) Recommended: a list of folders the human allows, held in the extension and empty by default** — so uploads
  are off until the human opts in, and an agent can never add a folder.
- (c) A confirmation in Chrome per upload (a notification the human clicks). Strongest, but every unattended script
  stops; offered as a later mode (0.13), not built.
- (d) An allow-list in the SDK's or MCP's configuration (an environment variable). Rejected: Step 9's rule is that
  safety is enforced in the extension, never in the daemon or SDK (a forbidden fix), and a client's config is the
  agent's to edit.

*Proposed details for (b):*
- **Storage.** A new key `safety.uploadFolders` (a string of folder paths, one per line, like `safety.blockList`) in
  `chrome.storage.local`, beside Step 9's `SAFETY_KEYS` (`extension/src/safety-state.ts`); missing = empty = uploads
  refused; read per call; a wrong-typed value makes the state unreadable and refuses **every** call `DISARMED`, as
  Step 9's keys do (decisions.md · 2026-10-24 · The state is read per call, fails closed, and is locked to trusted
  contexts (#139); · S2a: storage keys, and a wrong-typed value makes the state unreadable (#171)).
- **Writers.** Only the options page writes it (a new "Upload folders" box beside "Blocked sites");
  `extension/test/safety-writers.test.ts` extends to the key; no wire, daemon, SDK or MCP method reads or changes it.
  The options page refuses a filesystem root (`C:\`, `/`) and a relative path, and says why (build decision: the
  wording; proposed rule: a root is refused, a home directory is accepted with a warning).
- **The matcher** (`extension/src/upload-paths.ts`, pure, no `chrome.*`, no log call): a path is allowed when it is
  absolute and, after normalising separators, lies strictly inside an allowed folder at a **separator boundary**
  (`file === folder + sep + rest`, never a bare string prefix — `C:\Up\x` is not inside `C:\Uploads`), compared
  case-insensitively for drive-letter paths and case-sensitively for POSIX paths. Refused outright: a relative path,
  any `.` or `..` segment, a UNC path (`\\server\share`), a device or long-path prefix (`\\?\`, `\\.\`), a `:` after
  the drive letter (an NTFS alternate data stream), a NUL or control character, an empty string. A case table of at
  least 40 Windows and POSIX cases is written first (model: `extension/test/safety-match.test.ts`).
- **Links.** The extension cannot resolve a symlink or a junction. The SDK and the MCP send `fs.realpath` of each
  file (0.8), and the extension checks that real path, so a junction inside an allowed folder that points out is
  refused. A raw WebSocket client could send a lie, but such a client already holds the token and runs as the user,
  who can read the file anyway; recorded as a known limit.
- **The safety state on the wire is unchanged:** `safetyState`/`safetyStatus` and `daemon.status.safety` keep
  `{armed, evaluate, blockedCount}`; no folder count is added (conservative: no event shape changes; the refusal tells
  the agent). Offered alternative: an `uploadFolders` count in the state.

*Note 2026-10-25 (Stage 0 F3, F9, F10, M1, M3, N2): the folder rule binds an agent whose only reach is the bridge; an
agent with a shell can copy or link a file into an allowed folder — a known limit; the options page and `docs/setup.md`
warn against a home folder or one holding `bridge.token` or `.ssh` (#250). The matcher starts from
`…-steps/stage0-matcher-cases.txt` plus the verifier's rows; a POSIX path holding `\` is refused, never normalised;
case folding is ASCII-only; every matcher refusal reaches the wire as `UPLOAD_REFUSED`, and a malformed `paths` fails
closed at the gate (#249).*

### 0.5 The gate and the refusal (proposed — contract-level)

- **Class.** `uploadFiles` gets a new safety class **`upload`** in `METHOD_CLASSES` (`extension/src/safety.ts`): the
  tab's tests as class `tab` (disarmed → `DISARMED {scope:"all"}`; a blocked tab or this extension's own page →
  `DOMAIN_BLOCKED`), then the folder rule on every path → **`UPLOAD_REFUSED`**. The JavaScript switch does not apply:
  the bridge's own fixed finder (0.7) is not agent code. `GatedRouter.on` keeps throwing for an unclassified method.
- **Order.** `DISARMED` > `DOMAIN_BLOCKED` > `UPLOAD_REFUSED` > the handler's own `BAD_PARAMS`; the gate runs at
  receipt, again before the first side effect (before attaching), and as the post-check, as for every method; a
  disarm detaches the session (`extension/src/safety-debugger.ts`).
- **The code.** A new extension code `UPLOAD_REFUSED` (27 codes, 26 on the wire), spec §10 amended first. Options:
  (i) the new code (recommended — the agent must learn to ask the human, as with `JS_DISABLED`); (ii) `BAD_PARAMS`
  (hides that the human decides); (iii) `DISARMED` with a new scope (rejected: #202 moved away from scopes). Its
  message is fixed and names no path, folder, count or file name: `That file is not in a folder the user allows for
  uploads in Chrome (extension options → Upload folders); the bridge will not upload it. Ask the user.` (wording a
  build decision). It carries no `data`. It is not in the SDK's failure-report attach set; the SDK's
  `safetyRefusalLine` and the MCP render it as one line.
- **What a refusal reveals.** That a path is outside the folders, never which folders exist. Repeated probing tells
  an agent which of its paths are allowed — accepted (it cannot upload the others), recorded.
- **Note (#227).** Until S1, an own coded `BridgeError` thrown inside `withDebugger` reaches the wire with its message
  prefixed `[chrome.debugger] ` (`extension/src/debugger-errors.ts`). #229 rules #227 (b), so after S1 the bridge's
  own coded refusals keep their message unprefixed wherever they are thrown; the upload's refusals are raised before
  the attach anyway. Expected texts are tied to the throwing constants and to S1's rule.

### 0.6 The method, its tables, the lock and focus (proposed — contract-level wire)

- **Wire.** One tab method `uploadFiles {tab, ref | locator, paths: string[]}` → `{files: number}` (plus
  `pastSnapshotCap?: true` when resolved from a locator past the cap, as every action since Step 10 S3). `paths` has
  1–20 entries (a cap; build decision on the number).
- **Daemon.** `daemon/src/methods.ts` `TAB_METHODS` (resolved, lease-checked); `takesLock` false — the upload needs
  no screen.
- **Focus.** None: `DOM.setFileInputFiles` is not `Input.*`, so `focusFirst` (decisions.md · 2026-10-23 · The
  background-input policy (#89)) does not apply. Whether it works on a background tab is **unmeasured**; Run 16's
  row UP-1 decides it with an outcome table written first: the page received the file on a background tab → no
  focus; the call answered `ok` and the page received nothing → recorded FAIL, and a proposed decision (focus first,
  as trusted input) goes to the user — never fixed inside the wave.
- **The banner.** The call attaches the debugger, so Chrome's "is debugging this browser" banner shows for the call
  (and may linger seconds, R14-4b); the tool description says so.

### 0.7 Which element receives the files (proposed)

- **Target rule** (in the content script, after the ref or locator resolves; not a locator rule — `a11y.ts` and
  `locate` are unchanged): the element is (i) an `<input type="file">`; or (ii) a `<label>` whose `control` is one;
  or (iii) an element with **exactly one** `<input type="file">` descendant (open shadow roots and same-origin frames
  included). Anything else → `BAD_PARAMS` (`not a file input`). This reaches the common hidden-input pattern (a
  `display:none` input behind a visible label or drop zone), which the snapshot prunes and no locator matches.
- **Refusals** (`BAD_PARAMS`, before the attach): a disabled input; more than one path for an input without
  `multiple`; zero paths; more than 20. The `accept` attribute is not enforced (Chrome does not enforce it for
  `DOM.setFileInputFiles`; to be confirmed at Stage 0).
- **From the content script to a CDP node.** The content script sets a fresh one-off attribute (e.g.
  `data-__bridge-upload="<mark>"`, a build decision; never `MARK_ATTR`'s name) on the chosen input; inside one
  debugger session a closure-free finder (shipped as a literal string, searching the document, open shadow roots and
  same-origin frames) runs by `Runtime.evaluate` and returns the element's `objectId`; then
  `DOM.setFileInputFiles {files, objectId}`; the mark is removed on every path (success, CDP error, not found,
  timeout, disarm) and a sweep removes a stray one — the reverse of Step 8's `data-__bridge-mark`
  (`extension/src/evaluate/mark.ts`, `extension/src/content/marked.ts`). Zero matches → `REF_STALE`; two →
  `INTERNAL`. Stage 0 weighs the alternative `DOM.getDocument {depth:-1, pierce:true}` + `DOM.querySelector` and
  whether a page's CSP can block the finder (row UP-8 measures it).
- **Pure parts, unit-tested first:** the target rule (jsdom), the finder and unmark strings (jsdom, exactly the
  shipped strings), and the CDP step list (as `extension/src/trusted-input.ts` lists trusted input's steps).

*Note 2026-10-25 (Stage 0 F4, F7, F11, M2): an input with `webkitdirectory` is refused `BAD_PARAMS` (#247); the
finder runs in an isolated world or by `DOM.getDocument {pierce}`, never the page's main world (#248); the answer's
`files` is the count Chrome accepted, not proof — the page judges (#247).*

### 0.8 The SDK: `Tab.upload` within the eight values (proposed — contract-level SDK surface)

- `tab.upload(target: Target, paths: string | string[], options?: {timeoutMs?: number}): Promise<UploadResult>`,
  with `UploadResult = {files: {name: string; bytes: number; sha256: string}[]}` (basename, size and the sha256 of the
  bytes the client read), and the client's cursor mirror `client.upload(…)` (decisions.md · 2026-10-24 · The SDK
  `Tab` surface and the cursor rule are ratified (#118)). New **types** `UploadOptions` and `UploadResult`; the main
  entry keeps exactly eight values (`sdk/src/index.ts`); no Step 8 or Step 10 signature changes.
- **Preflight, before any call** (a convenience and the realpath step, not the security boundary): each path
  absolute (`BAD_PARAMS`), existing, a regular file (not a directory), readable; `fs.realpath` of each is what is
  sent; the sha256 is computed while reading. A refusal makes no call.
- Not trusted input: no `focusTab`. A failure in the attach set (`REF_STALE`, `LOCATOR_NOT_FOUND`, …) gets the usual
  failure report; `UPLOAD_REFUSED` does not.

### 0.9 The MCP tool `browser_upload_file` (proposed — contract-level tool name and schema)

- Input: `{ref?, locator?, paths: string[] (1–20, absolute), tab?}` — the target fields as `browser_click`'s.
- Answer: `Uploaded <n> file(s) to <target>:` then one line per file `<basename> · <bytes> bytes · sha256 <hex>` — no
  directory part of any path (the model gave the paths; the answer still repeats only names).
- Description: absolute paths; the files must lie in a folder the user allowed in Chrome (extension options → Upload
  folders), otherwise `UPLOAD_REFUSED` — ask the user, never retry another path; works on a background tab (if UP-1
  holds); the debugging banner shows briefly; **never click a file input** — `browser_click` there opens a native
  file dialog the bridge cannot see or close. `browser_click`'s description gains one sentence pointing to
  `browser_upload_file` (a description, not a schema change).
- 24 tools. The tool-schema baseline (`mcp/test/s2-focus-first.test.ts`, decisions.md · 2026-10-25 · S2: the MCP
  schema baseline, a failed focus's answer, and the focus sentence (#214)) is re-baselined once, recorded, by adding
  exactly this one entry; the other 23 stay byte-identical.

### 0.10 Nothing logs a path, a folder or a file name (proposed)

No layer logs a path, a folder, a file name or the sha256 of an uploaded file; refusal messages name none of them.
`extension/test/log-scan.test.ts` keeps its allowlist count (Stage 0 recounts it at `eac8324`; Step 10 left it
unchanged) and `extension/test/log-sentinel.test.ts` adds a sentinel folder and file name, finding neither in any
log. Committed live evidence prints paths only as `<ROOT>\<name>` with fixture names, and is scanned for the user's
profile path by count.

### 0.11 The rest of the safety boundary is unchanged (proposed)

Step 9's invariants hold: one gate in the extension over every router method; a new method enters the safety table
or `GatedRouter.on` throws; no wire, daemon, SDK or MCP method changes the safety state — now including the upload
folders; the state is read per call and fails closed; the extension's own pages stay blocked; nothing logs a pattern,
URL, title, the token, an evaluated value, a `saveTo` path or an upload path. With the bridge armed, JavaScript on,
an empty block list and no upload folders, every existing tool and test behaves as at `eac8324` (`uploadFiles`
answers `UPLOAD_REFUSED`).

### 0.12 Run 16 — the live rows (proposed)

New `docs/e2e-test-plan.md` §4.23, rows with expected text committed before the build is loaded. Fixture
`test-fixtures/s11-upload.html`: file inputs (single; `multiple`; `display:none` behind a `<label>`; inside an open
shadow root; inside a same-origin frame; a disabled one; a text input as a wrong target); on every `change` it reads
each `File` (`arrayBuffer()`, `crypto.subtle.digest("SHA-256")` — 127.0.0.1 is a secure context) and shows count,
names, sizes, hashes and `event.isTrusted` in a reporter element. Test files are random bytes made by the wave in a
scratch folder (`<ROOT>`) with fixture names; sizes 0 B, 1 KiB, 5 MiB, 50 MiB.
- **UP-0** found state (armed? JavaScript? block list and upload folders counted and hashed, never printed); the
  wave adds `<ROOT>` on the options page in its own window and reads it back.
- **UP-1** SDK, one 1 KiB file into the single input of a **background** fixture tab: page hash = file hash,
  `isTrusted: true`, the tab still in the background and the human's tab unchanged. 0.6's outcome table decides.
- **UP-2** three files (0 B, 5 MiB, 50 MiB) into the `multiple` input: order, names, sizes, hashes.
- **UP-3** the hidden input through its label (`{text}` locator); **UP-4** the shadow-root and the frame inputs.
- **UP-5** MCP leg: a headless actor (tool search off) uploads one file; the answer line as pre-written; page hash =
  file hash.
- **UP-6** refusals, each leaving the reporter at 0 files: a file outside `<ROOT>` → `UPLOAD_REFUSED` (verbatim
  text); a `..` path → the matcher's code; a text input → `BAD_PARAMS`; two paths into the single input →
  `BAD_PARAMS`; a missing file → `BAD_PARAMS` from the SDK with no call (`daemon.log` shows none).
- **UP-7** safety: disarmed → `DISARMED`; the fixture host blocked (a `*.localhost` alias) → `DOMAIN_BLOCKED`;
  `<ROOT>` removed → `UPLOAD_REFUSED`; JavaScript off → the upload still works.
- **UP-8** a fixture served with `Content-Security-Policy: script-src 'self'` (a small threaded server on a port Stage
  0 checks free, not 8082 or 8083): the upload works.
- **UP-9** a junction inside `<ROOT>` pointing outside (`mklink /J`, no admin) → `UPLOAD_REFUSED`.
- **UP-LOGS** `daemon.log`, the worker console and every actor transcript: 0 for the token, a non-fixture
  `scheme://host`, the sentinel folder name and the user's profile path, by count.
- **UP-CLICK** (RECORD, run only if Stage 0 names a safe way to close the dialog by UI Automation in the wave's own
  window): what a trusted click on a file input does.
- **SAVE-REFUSE-R** and **SW-2** (0.14), on the same build, before the restore.
- Restore: the upload folders, block list, armed and JavaScript read back equal to UP-0 by hash.

*Corrected 2026-10-25 (Stage 0 F5, F6, F9, F13, § UP-CLICK; decisions.md · 2026-10-25 · Stage 0: Run 16's pass rules
corrected before S5 (#251)): UP-6's "no call" is judged by the SDK preflight's message constant and the reporter, not
`daemon.log` (which logs no calls); UP-6's `..` row expects `UPLOAD_REFUSED`; UP-LOGS counts the actors' tool results,
not their own inputs, with `<ROOT>` named in the sheet; UP-8 uses port 8084; UP-CLICK is not run. UP-0 also reads the
file-URL toggle (in a window the wave opened, read only); with it off, a RECORD row measures what the upload answers,
and the upload rows UP-1…UP-5, UP-8, UP-9 wait for G11-3 (#245).*

### 0.13 Not in Step 11 (proposed)

Intercepting the native file chooser (`Page.setInterceptFileChooserDialog` + `Page.fileChooserOpened` after a click,
as Playwright does — it needs a debugger session kept attached to receive events, which is Step 12's keep-attached
session); drag-and-drop zones with no file input; clearing a file input (`files: []`); the per-upload confirmation
mode of 0.4 (c); an upload-folder count in the safety state.

### 0.14 Step 10's follow-ups ordered by #229 (user — the what; proposed — the details)

decisions.md · 2026-10-25 · The user rules on Step 10's open decisions; Step 10 closes (#229):
- **(a) #227 option (b)** (decisions.md · 2026-10-25 · S7: SAVE-REFUSE's `[chrome.debugger] ` prefix — the product stays for now; a fix is offered (#227)). The bridge's own coded refusals thrown inside `withDebugger` keep their message
  unprefixed; raw Chrome and page errors keep `[chrome.debugger] `; EVAL-5 is unchanged. *Proposed:* in
  `describeDebuggerError` (`extension/src/debugger-errors.ts`), an own `BridgeError` whose code is not a debugger
  code passes through with its code, message and `data` unchanged; a failing test first (a `saveTo` refusal thrown
  inside the session, its wire message equal to the throwing constant), plus a test that a raw Chrome error and a
  page error still carry the prefix and EVAL-5's expected text still holds. Live row **SAVE-REFUSE-R**: SAVE-REFUSE's
  refusals (#207, #218) through the SDK and the MCP, each wire message equal to its constant with no prefix; written
  in §4.23 before Run 16, SAVE-REFUSE's Run 15 record untouched.
  *Corrected 2026-10-25 (Stage 0 F2; decisions.md · 2026-10-25 · Stage 0: S1 marks the bridge's own refusals
  explicitly; page errors and timeouts keep the prefix (#246)): "an own `BridgeError` whose code is not a debugger
  code" would also unprefix EVAL-5's page error and timeouts; the bridge's own refusals carry an explicit marker
  instead, and `pageError` and `TIMEOUT` keep the prefix.*
- **(b) `kind` in the `saveTo` description.** `browser_evaluate`'s `saveTo` parameter description names the answer's
  `kind` (`string` or `json`, from `evaluateSaveStart`'s result, #218). It sits in the `inputSchema` that #214's
  baseline pins, so the baseline is re-baselined for that one tool with a dated note in the test; the other 22 entries
  stay byte-identical. S4's later re-baseline (the new tool) starts from S1's.
- **(c) SW-2** — the ~1.5 s capture switch re-measured as a new row (SW-1/SW-1R's records unchanged): SW-1R's
  differential design (per trial, (i) a default-mode screenshot of a background fixture tab in the human's window and
  (ii) one of a fixture tab already in front of the same window, ≥ 1.5 s apart, the pre-checks of (i) and (ii) as
  SW-1R's) with **one warm-up trial first, discarded**, then three measured trials; d = (i)'s client-measured
  duration − (ii)'s. Outcome table, written before the run and unchanged from 0.8 of the Step 10 phase doc: d ≥ 950
  ms in 3/3 → the wait runs to its bound → a fix stage **S5b** (named by Run 16's step agent, first naming the
  mechanism; a top-level `tabs.onActivated` listener escalates — it touches the 'listeners at the top level of
  `sw.ts`' invariant) with its own re-measure row; d ≤ 300 ms in 3/3 → the event ends the wait, recorded, the carried
  input closes; anything else → undetermined, recorded, no change. No code change unless SW-2 decides one.
  `activateForCapture`'s 1000 ms and 50 ms waits stay unless S5b is ordered.

## Stages

**Lane** is the explicit grant a step agent needs (`docs/agent-rules.md` §3 item 5). **Risk** picks the models
(`docs/agent-rules.md` §7): *standard* → Opus throughout; *low* → Sonnet (effort high) builder and first two
fixers, a third fix round on Opus, Opus verifier. Budgets are estimates; the step report records the actual beside each. **Verifier focus** is in addition
to `agent-rules.md` §6 and the stage's exit checks.

### Stage 0 — Spec audit (2 h, first, alone; risk: standard)
- [ ] Four lenses over this doc: (a) every cited file, function, message and Chrome/CDP/MCP API exists and
      behaves as stated, **executed**, not read; (b) every count and bound recomputed from the repo; (c) blind spots,
      extending the seed list below; (d) every exit check executable and discriminating, pass rules written before
      any measurement. Output `…-steps/stage0-audit.md`, findings ranked and tagged plan-side (a dated note here) or
      code-side (a stage item). Then: Step 10's "Contracts (binding forward)" and Step 9's
      re-executed on port 0; counts recomputed (26 router methods, 26 codes, 23 tools, 3273 tests / 132 files, the
      log-scan count); `DOM.setFileInputFiles`'s parameters, events and errors confirmed from Chrome's protocol
      documentation (one targeted search allowed, source recorded); 0.7's finder vs `DOM.getDocument`; the matcher's
      case table drafted for S2.
**Lane:** the steps dir; read-only elsewhere; port 0 only. **Verifier focus:** re-execute five findings; the contract
runs are real (port 0); `DOM.setFileInputFiles`'s source cited.

*Moved 2026-10-25 from the kickoff (#230).* **Code to cite by execution:** `extension/src/debugger.ts`
(`withDebugger`, `runWithDebugger`'s guard and session registry) and `debugger-errors.ts` (where an own `BridgeError`
is prefixed; EVAL-5's text); `safety.ts` (`METHOD_CLASSES`, `safetyDecision`, where class `upload` and a path check
sit), `safety-state.ts`, `safety-match.ts` (the model for the folder matcher); `evaluate/mark.ts` and
`content/marked.ts` (the mark pattern 0.7 reverses); `content/a11y.ts` (file inputs listed as `button`;
`display:none` inputs pruned: confirm by test); `handlers/target.ts`, `handlers/actions.ts`; `options.ts`,
`options.html`, `options-model.ts`, `extension/test/safety-writers.test.ts`; `daemon/src/methods.ts`; `sdk/src/`
`tab.ts`, `client.ts`, `index.ts`, `download.ts`, `evaluate-save.ts`; `mcp/src/tools/registry.ts` and
`mcp/test/s2-focus-first.test.ts`; `shared/src/protocol.ts`, `codes.ts`. `DOM.setFileInputFiles`: parameters, whether
it needs `DOM.enable`/`DOM.getDocument`, events, and what it does with a missing path, a directory, `accept` and a
non-`multiple` input, stated plainly where only S5 can measure it.

**Blind spots, seed list (extend it):** the folder rule on Windows (drive-letter case, `/` vs `\`, trailing
separators, 8.3 names, UNC and `\\?\` prefixes, alternate data streams, `..`, mapped and `subst` drives, OneDrive
placeholders), POSIX case, a symlink or junction as an allowed folder, the real path on another drive; exfiltration
around the rule (a device name such as `CON`, a hard link to a file outside, a file swapped between the client's
check and Chrome's read, whether an agent can get a folder into the options page); the element (replaced between the
mark and the CDP call, a cross-origin frame or closed shadow root, a re-render on `change`, `input` vs `change` order,
a form that uploads on `change`); the finder under a strict CSP and with JavaScript off (0.5 says it is not "agent
JavaScript": attack it); background tabs (UP-1's outcome table, the banner, a disarm during the call); logs (the
daemon's `redact` keys on `://` and the token, so only "never log params" protects a path; the SDK failure report;
the MCP's error rendering; an MCP actor's transcript); S1's callers of the prefix; SW-2's warm-up and pre-checks.

### Stage S1 — Step 10's ordered follow-ups (1 h, after Stage 0; risk: standard)
- [ ] 0.14 (a): own coded refusals unprefixed inside `withDebugger`; failing test first; EVAL-5's text unchanged.
- [ ] 0.14 (b): `kind` in `browser_evaluate`'s `saveTo` description; the schema baseline re-baselined for that one
      tool with a dated note (#214).
**Lane:** `extension/src/debugger-errors.ts` (and a caller only if the test shows it must), `mcp/src/tools/registry.ts`
(`browser_evaluate`'s `saveTo` description only), `extension/test/`, `mcp/test/`. **Parallel with:** nothing (S2
edits both files after it). *Added 2026-10-25 by #229.* **Verifier focus:** the new test fails at `eac8324`; raw
Chrome and page errors keep the prefix; EVAL-5's text unchanged; the baseline differs in one entry.

### Stage S2 — The contract: code, gate, matcher, tables (2.5 h, after S1; risk: standard)
- [ ] Spec §10 note first (`UPLOAD_REFUSED`, `uploadFiles`, class `upload`); `shared/src/codes.ts` and
      `protocol.ts` (params, result, guard); `extension/src/upload-paths.ts` (0.4's matcher, case table first);
      `safety.ts` class `upload` and its decision; `safety-state.ts` key `safety.uploadFolders` (read per call, fail
      closed); `daemon/src/methods.ts`; the SDK's `safetyRefusalLine` and the MCP's one-line rendering of the code;
      `log-sentinel` sentinel path.
**Lane:** `docs/specs/…-design.md` (§10 note), `shared/src/`, `extension/src/{safety,safety-state,upload-paths}.ts`,
`daemon/src/methods.ts`, `sdk/src/error.ts`, `mcp/src/tools/registry.ts` (`withSafetyRefusals` only), their `test/`
dirs. **Parallel with:** nothing (every later stage builds on it). **Verifier focus:** spec §10 note before the code;
three matcher mutants red; no attach while disarmed; 27 codes; log count unchanged.

### Stage S3 — The extension: handler, mark, options page (3 h, after S2; risk: standard)
- [ ] `extension/src/handlers/upload.ts`; the content-script target rule and mark (`extension/src/content/`); the
      finder and the CDP steps beside `debugger.ts`'s other CDP legs; `sw.ts` registration (top level, no `await`);
      the options page "Upload folders" box (`options.html`, `options.ts`, `options-model.ts`); the writers test.
**Lane:** `extension/src/` (not `a11y.ts`, `snapshot.ts`, `locate.ts`), `extension/options.html`, `extension/test/`.
**Parallel with:** S4 (file-disjoint). **Verifier focus:** mark removed on every path; shipped strings tested;
`a11y.ts`/`snapshot.ts`/`locate.ts` diff empty; writers test.

### Stage S4 — The SDK and the MCP (2 h, after S2; risk: standard)
- [ ] `Tab.upload` + the client mirror + the preflight (`sdk/src/`); `browser_upload_file` and `browser_click`'s
      sentence (`mcp/src/tools/registry.ts`); the schema baseline re-baselined by one entry; a cross-package test over
      real `ws` on port 0 with a fake proto:2 extension.
**Lane:** `sdk/src/`, `mcp/src/tools/registry.ts`, `sdk/test/`, `mcp/test/`. **Parallel with:** S3. **Verifier
focus:** zero calls on a preflight refusal; real path sent; eight values; one added schema entry; no directory in any
answer.

### Stage S5 — Run 16 (live): the upload rows (1.5 h prep + 1.5 h live, after S3 and S4, alone; risk: prep low, live standard)
- [ ] §4.23 rows of 0.12, SAVE-REFUSE-R and SW-2 (0.14) with expected text, committed before the build is loaded;
      the fixture and its CSP server;
      helpers `recipes/s11*.{ts,ps1,py}` and their rule tests; main-tree build of committed code, the reload script,
      the loaded-build proof first; the record `…-steps/S5-run-record.md`; §5 Run 16.
- [ ] The safety state, including the upload folders, restored and read back equal to the found state.
**Lane:** `recipes/s11*`, `recipes/test/s11-*`, a `recipes/tsconfig.s11.json`, `test-fixtures/s11-*`,
`docs/e2e-test-plan.md` §4.23 and §5, the steps dir. **No product code.** **Models:** the prep builder and fixer
(helpers, rule tests, fixtures, rows) Sonnet, per §7 (a third fix round on Opus); the live runner and every verifier Opus. **Verifier focus:** every
upload row by the page's reporter; refusals leave 0 files; restore read-back by hash including the Upload folders;
SW-2's warm-up excluded.

*Moved 2026-10-25 from the kickoff (#230).* **How the live wave runs** (#33, #193, #213): (1) rows and expected text
committed, with every brief fill-in; (2) the safety state recorded as found (armed, JavaScript, the block list and
Upload folders counted and hashed, never printed); (3) main-tree `npm run build` of committed code, the reload
script (exit 0; one re-run on exit 2), the loaded-build proof first; (4) fixtures on 8080/8081 and the threaded CSP
server (port picked at Stage 0 by `netstat`), files made by the wave under `<ROOT>`, actors: SDK scripts and
headless `claude -p` sessions with tool search off; the toolbar button, the shortcut and the options page only in
windows the wave opened; (5) on any STOP line the runner restores and returns; (6) restore and read back; (7)
results into `docs/e2e-test-plan.md` §5 as Run 16, with the run record and the daemon log as `.txt`; a fresh
verifier re-reads the record against the pre-written text and scans for `scheme://host`, the token, the test
patterns, the sentinel folder and the profile path by count. A failed row is recorded, never fixed in the wave.
- [ ] S5b, only if SW-2 reads "runs to its bound": the fix (failing test first where pure) and its re-measure row.
      **Lane (S5b):** `extension/src/tabs.ts` and its tests; a top-level listener escalates.

### Stage S6 — Docs (1 h, last; risk: low)
- [ ] `docs/setup.md` (Uploading files; the Safety section's Upload folders; the tool list), `README.md`,
      `recipes/README.md`, the roadmap's Phase D and Step 11 blocks; gotchas and Key-files lines for the package
      `CLAUDE.md` files proposed for the session agent (`…-steps/S6-claude-md-proposals.md`).
**Lane:** docs only. **Verifier focus:** setup text matches the code byte for byte; gotchas cite sources.

## Exit checks (pre-registered)

Every stage: `npm test` = before + n, no test removed unless the stage's text says so and the report lists it per
file; `npm run typecheck` and `npm run build` exit 0; `git status --short` shows no tracked change after the build;
every new test of pure logic fails on the code before the stage (the verifier proves it).

- **Z.1** (Stage 0) findings ranked with command and output; Step 10's and Step 9's contracts executed on port 0
  (held or CRITICAL); counts recomputed; every **(proposed)** decision attacked; `DOM.setFileInputFiles`'s
  documented behaviour cited with its source; the stage split in `journal.md`.
- **R.1** (S1) an own coded `BridgeError` thrown inside `withDebugger` reaches the wire with its message unchanged
  (a test that fails at `eac8324`); a raw Chrome error and a page error keep the `[chrome.debugger] ` prefix (tests);
  EVAL-5's expected text unchanged. **R.2** the `saveTo` description names `kind`; the schema baseline differs from
  `eac8324`'s in `browser_evaluate`'s entry only, with a dated note in the test; SAVE-REFUSE-R and SW-2 pre-written
  in §4.23 before Run 16 (checked at S5.1).
- **S2.1** the matcher's case table (≥ 40 cases, Windows and POSIX, every refusal class of 0.4) passes, and three
  mutants are red: a bare prefix without the separator boundary, case-insensitive POSIX, `..` allowed. **S2.2**
  `uploadFiles` in `METHOD_CLASSES` as `upload` (the router-scan test passes); disarmed → `DISARMED {scope:"all"}`
  with no attach; a blocked tab and this extension's own page → `DOMAIN_BLOCKED`; outside every folder and an empty
  list → `UPLOAD_REFUSED`; a wrong-typed `safety.uploadFolders` → `DISARMED` for every method; JavaScript off → not
  refused (tests). **S2.3** `codes.ts` lists 27 codes with `UPLOAD_REFUSED` on the wire list; spec §10's note
  precedes the code commit (`git log` order); `UPLOAD_REFUSED` not in `ATTACH_CODES`; the SDK line and the MCP line
  tested. **S2.4** `uploadFiles` in `TAB_METHODS`, `takesLock` false, another client's tab → `TAB_HELD` (tests).
  **S2.5** the log scan's count unchanged; the sentinel test finds no sentinel path or folder.
- **S3.1** the target rule (i)–(iii) and each refusal of 0.7, in jsdom, with the shipped code. **S3.2** the mark is
  set once and removed on every path (success, CDP error, not found, timeout, disarm), tested on the shipped finder
  and unmark strings; zero matches → `REF_STALE`, two → `INTERNAL`. **S3.3** the CDP step list asserted (finder →
  `DOM.setFileInputFiles {files, objectId}` → release), the gate's effect check before the attach. **S3.4** only the
  options page writes `safety.uploadFolders` (writers test); the options model refuses a root and a relative path;
  `git diff eac8324 -- extension/src/content/a11y.ts extension/src/content/snapshot.ts extension/src/content/locate.ts`
  is empty.
- **S4.1** SDK refusals with no call (relative, missing, directory; a test counts calls = 0); the real path is sent
  (a junction made in a temp dir); the result's sha256 equals the file's. **S4.2** eight values; `Tab.upload`'s and
  `client.upload`'s types pinned (`expectTypeOf`); every Step 8 and Step 10 SDK signature unchanged (the pinned list).
  **S4.3** the MCP schema baseline differs from S1's by exactly one added tool; the answer carries no directory
  part of any path (a sentinel directory name); `browser_click`'s sentence present. **S4.4** over real `ws` on port 0:
  `uploadFiles` forwarded with a numeric `tabId` and the real paths, lease-checked, the lock never taken.
- **S5.1** §4.23 committed before the first observation (`git log` order against the record's first timestamp).
  **S5.2** the first recorded line proves the loaded build; a reload only by `recipes/reload-extension.ps1`.
  **S5.3** observed text against the pre-written text, row by row, by a fresh verifier; every upload row judged by
  the page's own reporter, never by an `ok`. **S5.4** armed, JavaScript, the block list's sha256 and the upload
  folders' sha256 read back equal to UP-0, none printed. **S5.5** every `STOP`/guard line in the raw output and the
  daemon log matched to a return in the ledger (#193). **S5.6** UP-LOGS by count. **S5.7** SW-2's warm-up trial
  is recorded and excluded; its outcome is read off 0.14 (c)'s table unchanged; S5b runs only on "runs to its bound".
- **S6.1** `docs/setup.md` quotes the tool's description, the refusal and the options texts byte for byte from the
  code; every new `CLAUDE.md` gotcha cites its source.

## Human gates

- **G11-0** — Step 10's open decisions ruled before Stage 0 (the box at the top; met by #229).
- **G11-1** — any push or tag. #229's G10-1 grant covers Step 10's `step8` tag and its push only; Step 11's own
  commits are not pushed without a fresh grant.
- **G11-2** — any upload to a page that is not a test fixture on 127.0.0.1 / `*.localhost`, and any live work on a
  real site or with the user's credentials. Uploading is outward-facing: a real-site row needs a fresh grant naming
  the site and the file. decisions.md · 2026-10-25 · The user widens Step 10's grants: unlimited Chrome restarts,
  repeated pp1 reads, hidden pp1 writes (#222) was for Step 10 and is not standing.
- **G11-3** *(added 2026-10-25, Stage 0 F1, #245)* — the extension's "Allow access to file URLs" toggle: the user
  turns it on, or grants the wave to turn it on and restore it in its own window (it reloads the extension). Until
  then Run 16's upload rows wait; the rest of the wave runs.
- **Proposed, under decisions.md · 2026-10-22 · Live E2E waves are run by Claude end to end (#33):** the wave may edit
  the Upload folders box on the options page in its own window, as Runs 13–15 edited the block list, only to add its
  own `<ROOT>` and to restore the found text exactly; a restore that fails is a stop. If the user prefers, this is a
  gate.
- **Carried:** reloads by `recipes/reload-extension.ps1`, one re-run on exit 2 (decisions.md · 2026-10-23 · Later
  extension reloads use `recipes/reload-extension.ps1` (#65); · S6's findings ruled: the user's answers, stage S6b for
  REP-1, re-registered rows (#99)); the toolbar button is pinned (decisions.md · 2026-10-25 · The user grants RET-1's
  Chrome kill (G10-2) and the pp1 leg (G10-3) once for Run 15; the button is already pinned (#221) recorded "Already
  pinned") — a reader that says otherwise returns and
  the user is asked once, never a mouse click; no Chrome restart is planned, and any needs a fresh grant.

## STOP rules and forbidden fixes

**Stops the gate** (the write-up continues): a pre-registered check fails after the fix rounds `docs/agent-rules.md`
§6–§7 allow (2; 3 on a low-risk stage) *(Corrected 2026-10-25: was "after 2 fix rounds", because #230's third, Opus
round for low-risk stages applies from Step 11)*; a router method
reachable without the safety gate; an upload accepted for a file outside the human's folders; any path by which a
client, the daemon or a page changes the safety state (the upload folders included) or reaches the extension's own
pages; a safety state not restored after the wave; a path, folder, file name, pattern, URL, title, evaluated value or
the token in a log or committed evidence; an upload to a non-fixture page; a `CLAUDE.md` runtime invariant that would
have to change; anything pushed or tagged; a port-9234 holder that is not the daemon, or an orphan process; the test
count dropping without a documented removal; a live runner continuing past a STOP line (#193).

**Continues anyway, recorded:** a live row that fails (the fix is a proposed decision, e.g. UP-1's background outcome);
UP-CLICK not run; SW-2's outcome either way.

**Forbidden fixes:** enforcing the folder rule in the daemon, the SDK or the MCP instead of the extension (the client
preflight is a convenience, never the boundary); a wire, daemon, SDK or MCP method that reads, adds or removes an
upload folder, arms, disarms, edits the block list or turns JavaScript on; matching a folder by bare string prefix,
or case-insensitively on POSIX; dropping the real-path step; exempting or reclassifying `uploadFiles` in the safety
table to make a row pass; sending file bytes over the wire instead of paths without a ruling; a refusal message that
names a path, folder or file; leaving the upload mark on an element; changing `a11y.ts`, `locate`'s rules or the
snapshot to make a hidden input targetable; adding focus or the visibility lock to the upload without a measurement;
judging an upload by its `ok`; editing a row's expected text after its run; choosing a bound after seeing the
measurement; and, from Steps 6–10, still binding: everything in `docs/agent-rules.md` §2; making `BridgeClient` reconnect on a close code other than 4002; letting the MCP crash when
`connect()` fails; editing a test's expected text to match a changed error; regenerating
`sdk/test/fixtures/baseline-51de800.json`; adding `windows.update({focused:true})` outside `focusTab`.

## As built

One block per stage, written by the session agent at the stage close (format: `docs/docs-writing-guide.md` § Phase
doc header); at the phase close, the gate checklist (item → met? → evidence).

### Stage 0 — Spec audit · 2026-10-25 · verifier: PASS-with-notes · commits `b962460`, `deaffd1` · models: step agent, auditor, verifier Opus 5.5
- **Z.1 met.** Step 8, 9 and 10 contracts re-executed on port 0 from a `git archive` copy: held. Counts recomputed
  by auditor and verifier (`…-steps/stage0-counts.txt`). Matcher table 74 rows (`stage0-matcher-cases.txt`).
  `DOM.setFileInputFiles` cited from Chromium's `dom_handler.cc` (`stage0-cdp.txt`). ~0.5 h against 2 h.
- **Findings:** 1 CRITICAL (F1, the file-access check → #245, G11-3), 5 MAJOR (F2 → #246; F3 → #250; F4 → #247;
  F5, F6 → #251), 9 MINOR, 1 NIT (`stage0-audit.md` §6); verifier 3 MINOR, 2 NIT, no CRITICAL/MAJOR.
- **Decisions:** #245–#252. Notes applied above at 0.3, 0.4, 0.7, 0.12, 0.14 (a), Human gates, Open items.
- **Contracts (binding forward):** the gate passes `file:` URLs until S2 lands #245 (a); `fs.realpathSync` keeps 8.3
  names and the given case, `fs.promises.realpath` canonicalises (F8, S4 uses the latter);
  `s2-focus-first.test.ts` requires `browser_click`'s description to end with the focus sentence (F12, S4).

## Open items

- Contract-level, ruled at Stage 0 by the conservative rule and listed for the user at the gate: 0.3 (paths only),
  0.4 (the human-held folder list, empty by default, the real-path step), 0.5 (class `upload`, the code
  `UPLOAD_REFUSED` and its text), 0.6 (`uploadFiles`'s wire shape, no lock, no focus), 0.8 (`Tab.upload`'s
  signature and result), 0.9 (the tool name, schema and answer).
- Waiting for the user: G11-2 for any real-site upload; G11-1 for any push. (G11-0 met by #229.)
- Known limits, recorded, not fixed: a raw client can skip the real-path step; a file changed between the client's
  read and Chrome's read; a refusal tells an agent which of its paths are allowed; *(added 2026-10-25, Stage 0
  F3, F15)* an agent with a shell can put a file into an allowed folder; a refusal raised after the CDP call (a
  disarm, a folder removed) can leave the file in the page.
- *Added 2026-10-25 (Stage 0):* for the user at the gate — #245 (`file:` pages refused; G11-3), #247 (the meaning of
  `files`), #250 (warn or refuse a home folder).

## Follow-ups

- **Step 12 — Phase F** (after the network-rule step): `args` for `browser_evaluate`, console/error capture, the keep-attached debugger session —
  and, with it, intercepting the native file chooser (0.13), which reaches inputs that no target rule can.
- **Next step, after Step 11 and before Step 12 — the block list stops redirected requests** (decisions.md ·
  2026-10-25 · The user rules on Step 10's open decisions; Step 10 closes (#229)): a `declarativeNetRequest` session
  rule (a new permission) so a redirect hop of a download or a navigation onto a blocked site is never sent
  (decisions.md · 2026-10-24 · `downloadStart` and redirects onto a blocked host (#140)). Its own small step.
- **Carried from Step 10:** a popup lease for a background opener, only as a design change (decisions.md ·
  2026-10-25 · S7: Run 15 stands as recorded; its follow-ups (#226)). SW-2 is in Run 16 (0.14).
- **Later, if wanted:** the per-upload confirmation mode; drag-and-drop zones.
