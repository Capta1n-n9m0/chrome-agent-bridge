# Plan drift — cleanup pass 2026-10-26 (full pass)

- **Area cleaner:** Plan drift. **Model:** Claude Opus 5.5 (`claude-opus-5-5`).
- **Scope:** `git diff 965b1af..HEAD` (Step 11, 48 commits). Source of truth: `docs/plans/2026-10-25-step11-file-upload.md`
  § As built, and the code.
- **Counts checked against the code:** 24 tools (`mcp/src/tools/registry.ts`, `browser_upload_file` included); 27 codes,
  26 on the wire plus `NO_CURSOR` (`shared/src/codes.ts:3`, `UPLOAD_REFUSED` at :107); 27 router methods
  (`extension/src/safety.ts` `METHOD_CLASSES`, `uploadFiles: "upload"` at :93; doc-check agrees); `uploadFiles` in
  `daemon/src/methods.ts` `TAB_METHODS` (:32), no lock; `UPLOAD_FILES_MAX_PATHS = 20` (`shared/src/protocol.ts:578`);
  `Tab.upload` (`sdk/src/tab.ts:408`), `prepareUpload` (`sdk/src/upload.ts:96`). Every count in README.md, setup.md,
  recipes/README.md and the roadmap's Step 11 block matches.
- **Checked and found right (no finding):** setup.md § Uploading files, § Upload folders, § The bridge never opens local
  files (every quoted text and line reference re-read: `safety.ts:217/219/224`, `upload-files.ts:37`,
  `registry.ts:613/634-635`, `error.ts:136-137`, `options.html:51`, `options-model.ts:100-110/162-165`, `options.ts:93`);
  setup.md's tool table row and its 2026-10-26 notes; README.md's Step 11 paragraph and Run 16 tally; recipes/README.md's
  s11 rows and `tsconfig.s11.json`; the roadmap's Step 11 block and per-stage test table; e2e §5 Run 16 (counts 19/3/3/4
  +1 split, exit checks, open items match As built § S5 and the gate checklist); the spec's §10 Step 11 note (matches the
  code: class `upload`, order, `safety.uploadFolders`, no folder count on the wire); `docs/plans/handoffs.md` (nothing
  Step 11 touches).

## Findings

**1. `docs/setup.md:402-409` — the `Tab` method list does not contain `upload`, though its note says it was added.**
- Wrong: the list reads `… download(url, path)`, `focus`, `close`, `release`.` and the note right after it says
  `*Superseded 2026-10-26: the list had no upload(target, paths, {timeoutMs?}), because Step 11 S4 added it (#240)…*` —
  the note records a correction that was never made in the list.
- Evidence: `sdk/src/tab.ts:408` `async upload(target: Target, paths: string | string[], options: UploadOptions = {})`.
- Fix: insert `` `upload(target, paths, {timeoutMs?})`, `` after `` `download(url, path)`, `` in the list; keep the note.
- **Mechanical.**

**2. `docs/setup.md:1097-1109` (Safety → For scripts) — the safety-refusal codes omit `UPLOAD_REFUSED`.**
- Wrong: "A refused call throws a `BridgeError` with `code` `DISARMED` (`data.scope` `"all"`), `JS_DISABLED` (no `data`)
  or `DOMAIN_BLOCKED`, with no failure report attached … the one line Claude sees is `safetyRefusalLine(err.code,
  err.data)`".
- Evidence: `sdk/src/error.ts:148` `if (code === "UPLOAD_REFUSED") return UPLOAD_REFUSED_LINE;` (not in `ATTACH_CODES`,
  `shared/CLAUDE.md`); setup.md's own § Uploading files sends the reader here: "The refusal is a safety refusal like
  `DOMAIN_BLOCKED`: no failure report … ([Safety → For scripts](#for-scripts))".
- Fix: "… `JS_DISABLED` (no `data`), `DOMAIN_BLOCKED` or, for an upload, `UPLOAD_REFUSED` (no `data`), …" with a dated
  note `*Superseded 2026-10-26: was "… `JS_DISABLED` (no `data`) or `DOMAIN_BLOCKED`", because Step 11 S2 added
  `UPLOAD_REFUSED` (#237).*`
- **Mechanical.**

**3. `docs/setup.md:83-96` (install step 5, "Check") — no Step 11 upgrade note.** The step carries one dated note per
step that changed the extension (Steps 7, 8, 10); Step 11 changed the extension, the daemon (`methods.ts`) and the MCP
(a new tool) and adds two one-time human settings, but the paragraph stops at "*Updated 2026-10-25: Step 10 changed …
`JS_DISABLED`.*".
- Evidence: As built § S2/S3/S4 (`uploadFiles` in `sw.ts`, `daemon/src/methods.ts`, `mcp/src/tools/registry.ts`); an
  unreloaded extension answers through `GatedRouter` `unknown method: uploadFiles` (`extension/src/router.ts:45,111`, by
  reading).
- Fix: append `*Updated 2026-10-26: Step 11 changed the extension, the daemon and the MCP again — reload the extension and
  run /mcp after upgrading; an extension not reloaded since Step 10 answers browser_upload_file with unknown method:
  uploadFiles. Uploads stay refused until you add Upload folders and turn on Allow access to file URLs ([Uploading
  files](#uploading-files)).*`
- **Mechanical** (wording by the lead).

**4. `docs/setup.md:1155-1159` (Troubleshooting) — no entry for `UPLOAD_REFUSED`.** The first safety bullet lists
"`DISARMED` … `JS_DISABLED` … `DOMAIN_BLOCKED`: … your own controls, working as meant"; an upload refused for an empty
Upload folders list or the file-URL toggle (the default state, setup.md:741: "The list is empty by default, so every
upload is refused") is the most likely first-use failure and is not there.
- Fix: add to that bullet (or a new one) "`browser_upload_file` answers `UPLOAD_REFUSED`: the file is not in a folder
  you listed under Upload folders (empty by default), or Allow access to file URLs is off — see [Uploading
  files](#uploading-files)."
- **Mechanical** (an added pointer; no content beyond § Uploading files).

**5. `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md:3-25` (Status) — the status line stops at Step 10.** Each
step since Step 7 added a dated status correction (Step 9's and Step 10's propagators named counts and "its gate waits");
the last one reads "… 23 tools, 26 codes (25 on the wire), 26 router methods, 3273 tests in 132 files … closed
2026-10-25". Step 11 amended §10 (line 676) but not the status.
- Evidence: As built § Gate checklist "not met — Step 11 waits for the user"; tests 3811/154 (§ S6 / gate row 1).
- Fix: append `*Corrected 2026-10-26 (cleanup pass): Step 11 (D3 file upload: §10's Step 11 note) is built and E2E-run
  (Run 16): 24 tools, 27 codes (26 on the wire), 27 router methods, 3811 tests in 154 files (npm test on S6's tree); its
  gate waits on the user. Contracts and deviations: docs/plans/2026-10-25-step11-file-upload.md § As built.*`
- **Mechanical.**

**6. Spec §8.1 (`…multi-actor-design.md:383-389`) — no note for `Tab.upload` / `client.upload`.** §8.1 carries dated
notes for what Steps 8 and 10 added to the SDK and ends "The public surface is still eight values."; Step 11's SDK
addition is absent.
- Evidence: `sdk/src/tab.ts:408`; As built § S4 ("eight values; types pinned", #240, #261); `sdk/CLAUDE.md` (`upload.ts`
  behind `Tab.upload` / `client.upload`, the eight values unchanged).
- Fix: add `*Corrected 2026-10-26 (cleanup pass), on what Step 11 added to the SDK (Step 11 as-built § S4, § S4b):
  tab.upload(target, paths, {timeoutMs?}) → {files: [{name, bytes, sha256}]} (and the cursor's client.upload): the SDK
  checks each path (BAD_PARAMS naming the index, no call), sends fs.promises.realpath, and Chrome reads the files
  (uploadFiles, §10's Step 11 note; #235, #240, #261). The public surface is still eight values.*`
- **Mechanical** (a pointer-style note; the lead may shorten).

**7. Spec §11 (`…multi-actor-design.md:748-751`) — the repository layout has no Step 11 note.** Steps 7, 8 and 10 each
added a dated "Step N added these files" note; Step 11 added `extension/src/{upload-paths,upload-files}.ts`,
`extension/src/handlers/upload.ts`, `extension/src/content/upload-target.ts`, `sdk/src/upload.ts`, `test-fixtures/s11-*`
and the Run 16 helpers `recipes/s11*` with `recipes/tsconfig.s11.json` (`git diff --stat 965b1af..HEAD`).
- Fix: append `*Corrected 2026-10-26 (cleanup pass): Step 11 added extension/src/upload-paths.ts, upload-files.ts,
  handlers/upload.ts, content/upload-target.ts, sdk/src/upload.ts, the s11-* fixtures and Run 16's helpers in recipes/
  (s11*, tsconfig.s11.json) — see Step 11 as-built.*`
- **Mechanical.**

**8. Spec §12 row 3 (`…multi-actor-design.md:781-784`) and the roadmap's §3 (`docs/progress-and-roadmap.md:640-644`) —
the capture-switch question is still "undetermined", but Run 16's SW-2 decided it.**
- Wrong: spec "Row 3 — Step 10's differential row SW-1R stayed undetermined, so `activateForCapture`'s waits are
  unchanged and the ~1.5 s flash stays"; roadmap "Still not verified live after Step 10: why a background capture takes
  ~1.5 s (SW-1R undetermined, #226)".
- Evidence: As built § S5 "**SW-2: the event ends the wait** (no S5b)"; e2e §5 Run 16 "d = [-24, 95, 68] ms, 3/3 -> 'the
  event ends the wait' (#282), no S5b"; `extension/CLAUDE.md` (the waits stay).
- Fix (spec): append `*Corrected 2026-10-26 (cleanup pass): row 3 — Run 16's SW-2 measured d = −24, 95, 68 ms in 3/3
  after a warm-up: onActivated ends the wait, it does not run to its 1000 ms bound; the waits stay (decisions.md ·
  2026-10-26 · S5-liveA closes with S5.5 and part of S5.6 failed as recorded; helper fixes before liveB (#282)).*` Fix
  (roadmap §3): append `*Updated 2026-10-26 (cleanup pass): Run 16's SW-2 settled the capture wait — the event ends it
  (#282); still not verified live: the focus/input race of Stage 0 F19.*`
- **Mechanical.**

**9. `docs/progress-and-roadmap.md:743-748` (§5 Roadmap, the running "Updated" notes) — no Step 11 note; the last note
still says "Next: Step 11".** The paragraph gained one note per step close or build ("*Updated 2026-10-25 (cleanup
pass): Step 10 closed (#229); #140 is its own small step after Step 11, before Step 12.*") and stops there, while §1's
status line says Step 11 is built and E2E-run with its gate open.
- Fix: append `*Updated 2026-10-26 (cleanup pass): Step 11 is built and E2E-run (Run 16; [§1 Step 11
  block](#step-11--d3-file-upload-2026-10-25)), its gate open for the user (docs/decisions.md → Open decisions). Next:
  the #140 step (the block list stops redirected requests), then Step 12 (Phase F).*`
- **Mechanical.**

**10. `docs/progress-and-roadmap.md:810-813` — the #140 step's place is "set when Step 10 closes", but #229 set it.**
- Wrong: "**Later — the block list stops redirected requests** (#202, planned 2026-10-24): … Its place in the order is
  set when Step 10 closes."
- Evidence: the same file at :747-748 "#140 is its own small step after Step 11, before Step 12"; phase doc § Follow-ups
  "**Next step, after Step 11 and before Step 12 — the block list stops redirected requests** (decisions.md ·
  2026-10-25 · The user rules on Step 10's open decisions; Step 10 closes (#229))".
- Fix: retitle "**Next — the block list stops redirected requests**" and replace the last sentence with "It is the next
  step, after Step 11 and before Step 12 (decisions.md · 2026-10-25 · The user rules on Step 10's open decisions; Step
  10 closes (#229)). *Corrected 2026-10-26: was "Its place in the order is set when Step 10 closes"; #229 set it.*"
  (Strictly a leftover from Step 10's close, which the 2026-10-25 pass fixed at :747 only; now the very next step.)
- **Mechanical.**

**11. `docs/progress-and-roadmap.md:815-830` (Phase F) — lists D3 as still open, and lacks the native file chooser.**
- Wrong (a): ":828-830 *Updated 2026-10-24: after Step 8 the Phase F items still open include `args` for
  `browser_evaluate`, console capture, and D3 file upload (Phase D)…*" — D3 is built (the same file, :777 "**D3 file
  upload ✅** (Step 11 …)").
- Missing (b): the phase doc's § Follow-ups puts into Step 12 "intercepting the native file chooser (0.13), which
  reaches inputs that no target rule can"; neither the Phase F list nor the Step 12 line (:737 "**Step 12 — Phase F**
  (`args` for `browser_evaluate`, console capture, keep-attached debugger session)") names it. The roadmap's Step 11
  block (:307) says only "the native file chooser are not built (Step 12 / later)".
- Fix: (a) append to the :828 note `*Superseded 2026-10-26: D3 file upload is no longer open — built as Step 11.*`;
  (b) add a Phase F bullet "**Native file chooser** (`Page.setInterceptFileChooserDialog`, with the keep-attached
  debugger session): reaches file inputs no target rule can (Step 11 phase doc 0.13, § Follow-ups)."
- (a) **mechanical**; (b) adds plan content → **needs the user** (or the next phase kickoff), since it widens Step 12.

**12. `docs/progress-and-roadmap.md:646-697` (§4 Known limitations & risks) — nothing on uploads or the `file:` rule.**
The Step 11 block (:304-307) and setup.md § Uploading files → Known limits list them (an agent with a shell can fill an
allowed folder; a refusal tells which paths are not allowed; a raw client skips the real-path step and can ask for a
missing file, UP-RAW #284; a refusal after the CDP call can leave the file in the page), and the "Tab safety" bullet
(:684-691) still names only Step 9's three controls.
- Fix: add one bullet "**Uploads** — the folder rule binds an agent whose only reach is the bridge … (Step 11 block;
  `docs/setup.md` → Uploading files, Known limits)" and to "Tab safety": "since Step 11 the Upload folders list (empty by
  default) and the refusal of every call on a `file:` page (#245)."
- **Needs the user** only in the sense of being added content; the text is a pointer to existing records — the lead
  may treat it as mechanical.

**13. `docs/e2e-test-plan.md:9-14` (header) — the current test count is Step 10's.**
- Wrong: "*Corrected 2026-10-25 (Step 10 propagator): … at `025bdef` `npm test` runs 3273 tests in 132 files … and
  Step 10 is covered live by §4.21 (Run 14) and §4.22 (Run 15).*"
- Evidence: As built § Gate checklist row 1 "tests 3273/132 → 3811/154 (S6's `npm test`)"; §4.23 and §5 Run 16 exist.
- Fix: append `*Corrected 2026-10-26 (cleanup pass): was "3273 tests in 132 files" as the current count; on S6's tree
  npm test runs 3811 tests in 154 files (Step 11 as-built § Gate checklist), and Step 11 is covered live by §4.23 (Run
  16).*`
- **Mechanical.**

**14. `docs/e2e-test-plan.md:1464` (§4.23, row K-noacc) — the source line moved.**
- Wrong: "`extension/src/upload-files.ts:34-35` `NO_FILE_ACCESS_MESSAGE`".
- Evidence: the constant is at `extension/src/upload-files.ts:37-38` at HEAD (the text is unchanged, so the row's pass
  rule holds). §4.23's own note permits it: "if one has moved … only relocates the line (a mechanical correction)".
- Fix: `upload-files.ts:37-38` with `*Corrected 2026-10-26: was :34-35 (read at 7c4857d).*` All other §4.23 source lines
  re-read and still right.
- **Mechanical** (low value; §4.23 is a pre-run record — the lead may leave it).

**15. `docs/progress-and-roadmap.md:3` — `**Date:** 2026-10-25` while the status line (:5) is 2026-10-26.**
- Fix: `2026-10-26`. **Mechanical** (overlaps the State area; count it once).

**16. `docs/plans/next-session-prompt.md` — still the Step 11 kickoff** (title "Step 11 kickoff — D3 file upload", and
:34 "23 tools, 26 codes, 26 router methods"). Expected per the brief: the #140 kickoff is written after this pass, which
replaces it. **No action in this pass.**

## Tally

16 findings: 13 mechanical (1–10, 11 (a), 13–15), 2 needing the user or the next kickoff (11 (b); 12 if the lead does
not treat it as a pointer), 1 expected and deferred (16). None contradicts the code's counts; the drift is in
places Step 11's S6 did not reach (setup.md's older sections, the spec's status/§8/§11/§12, the roadmap's §3–§5, the e2e
header).
