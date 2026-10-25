# Decisions — chrome-agent-bridge

Newest first. Format and rules: [`docs-writing-guide.md`](docs-writing-guide.md#decisions).
Cite an entry by date + title. Closed steps' entries are in `docs/decisions-archive/` (index below).

**Earlier decisions** (before 2026-10-21) live where they were made: the design specs in
`docs/specs/` and the step plans in `docs/plans/`. When one matters again, restate it here
as a dated entry and point back.

## Open decisions

Step 10's were ruled on 2026-10-25 (#229); the lists of earlier steps' open decisions, with their rulings, are in
the archive entries they cite and in git (`817f8b1`).

**Step 11 (contract-level, proposed 2026-10-25; Stage 0 attacks them, then the session agent applies the
conservative rule and they wait for the user at the gate).** Each entry is in the Log below with its options.
- 2026-10-25 · Step 11: paths cross the wire, never bytes (#235) — recommended (A) paths only.
- 2026-10-25 · Step 11: upload folders are a human-held allow-list in the extension, empty by default (#236).
- 2026-10-25 · Step 11: the safety class `upload` and the code `UPLOAD_REFUSED` (#237).
- 2026-10-25 · Step 11: the wire method `uploadFiles`, no visibility lock, no focus (#238).
- 2026-10-25 · Step 11: `Tab.upload`'s signature and result (#240).
- 2026-10-25 · Step 11: the MCP tool `browser_upload_file` (#241).
- 2026-10-25 · Step 11: Run 16 may edit the Upload folders box in its own window (#243) — a gate if the user prefers.

## Standing decisions

A decision that still governs how we work or what the product promises: one line, its date and title, and where
its full entry lives. "(check)" marks a line the cleanup pass or the user should confirm. Entries that only
settled a build detail of one stage, or that a later entry replaced, are not listed; they stay in the archive.

**How we work**
- 2026-10-22 · Live E2E waves are run by Claude end to end (#33) — `decisions-archive/step6.md`
- 2026-10-23 · Later extension reloads use `recipes/reload-extension.ps1` (#65) — `decisions-archive/step7.md`
- 2026-10-24 · The roadmap after Step 8 (#129) — `decisions-archive/step9.md`; amended by #229 (the redirect-rule step after Step 11)
- 2026-10-24 · S4: Live runners return on every stop; one stop rule for sheet and brief (#193) — `decisions-archive/step9.md`
- 2026-10-25 · S5: `bb-login.ps1`'s post-submit wait — exit rules and the hard bound (#215) — `decisions-archive/step10.md`
- 2026-10-25 · Scratch worktrees never share `node_modules` through a junction a recursive delete can follow (#220) — `decisions-archive/step10.md`
- 2026-10-25 · Fresh agents instead of resumed ones (#225) — `decisions-archive/step10.md`
- 2026-10-25 · The user rules on Step 10's open decisions; Step 10 closes (#229) — `decisions-archive/step10.md`
- 2026-10-25 · Lean procedures: rules by pointer, package CLAUDE.md files, risk-tiered models (#230) — this file (Log)
- 2026-10-25 · Commits carry exactly one trailer and no Claude-Session line (#231) — this file (Log)
- 2026-10-25 · Gotchas follow the code they bind (#232) — this file (Log)

**Product promises: the daemon, the clients and their lifecycle**
- 2026-10-21 · The actor name carries the MCP's own process id (#2) — `decisions-archive/step6.md`
- 2026-10-21 · One daemon handover per connect(), then a VERSION error (#10) — `decisions-archive/step6.md`
- 2026-10-21 · The SDK clears its cursor when it reconnects after a daemon restart (#11) — `decisions-archive/step6.md`
- 2026-10-22 · A Step 6 client gives up with VERSION when no welcome arrives (#13) — `decisions-archive/step6.md`
- 2026-10-22 · What clients do on a close code other than 4002 (#15) — `decisions-archive/step6.md`
- 2026-10-22 · The SDK reports configuration and connection failures as NOT_CONNECTED (#21) — `decisions-archive/step6.md`
- 2026-10-22 · A reconnect after 4002 never hands the daemon over (#22) — `decisions-archive/step6.md`
- 2026-10-22 · The knock's 10 s budget runs per spawn cycle, with a handshake timeout per attempt (#23) — `decisions-archive/step6.md`
- 2026-10-22 · BridgeClient exposes welcome, extensionConnected and on("reconnected") in Step 6 (#24) — `decisions-archive/step6.md`
- 2026-10-22 · D3's daemon lifecycle: idle armed at start, every shutdown exits 0, bad env values, the log policy (#25) — `decisions-archive/step6.md`
- 2026-10-22 · The MCP connects without waiting for the extension, so Chrome closed reads as today (#27) — `decisions-archive/step6.md`
- 2026-10-22 · setup.md documents stopping the daemon by killing its process, with no stop script (#29) — `decisions-archive/step6.md`
- 2026-10-22 · The daemon's method classes are one table, and the download methods are free (#39) — `decisions-archive/step7.md`

**Product promises: tabs, handles, leases, locators, the cursor and failure reports**
- 2026-10-22 · Content-script failures are returned, not thrown, to carry `CODE:message` (#38) — `decisions-archive/step7.md`
- 2026-10-22 · The `tab` parameter keeps its "all"/"active" meanings for the network tools (#40) — `decisions-archive/step7.md`
- 2026-10-22 · A stale extension is refused for tab calls, detected by its hello (#42) — `decisions-archive/step7.md`
- 2026-10-22 · "The human's tab" is the active tab of the last-focused normal window (#43) — `decisions-archive/step7.md`
- 2026-10-22 · One deadline per call covers the lock wait and the forwarded call (#44) — `decisions-archive/step7.md`
- 2026-10-22 · The formatters reach the MCP through a `@bridge/sdk/format` subpath (#46) — `decisions-archive/step7.md`
- 2026-10-22 · T1's extension details (#55) — `decisions-archive/step7.md` (check)
- 2026-10-22 · T2's daemon details (#57) — `decisions-archive/step7.md` (check)
- 2026-10-22 · T3's snapshot fields and capture rules (#58) — `decisions-archive/step7.md` (check)
- 2026-10-22 · T4's MCP cursor and tool details (#59) — `decisions-archive/step7.md`
- 2026-10-23 · T5b's three fixes (#63) — `decisions-archive/step7.md`
- 2026-10-23 · S2b makes `code` required on error frames (#73) — `decisions-archive/step8.md`; ratified 2026-10-24 (#108)
- 2026-10-23 · S3.4 applies as written: the main entry also re-exports the formatters (#75) — `decisions-archive/step8.md`; ratified 2026-10-24 (#110)
- 2026-10-23 · `NO_CURSOR` enters `shared/src/codes.ts` as the 23rd code (#76) — `decisions-archive/step8.md`; ratified 2026-10-24 (#111)
- 2026-10-23 · A new daemon never reuses a handle number; the SDK guards stale `Tab`s (#79) — `decisions-archive/step8.md`; ratified 2026-10-24 (#112)
- 2026-10-23 · The session marker's mechanism, amended (#80) — `decisions-archive/step8.md`; ratified 2026-10-24 (#109)
- 2026-10-23 · The Chrome `id` stays beside `tab` this step; network calls without `tab` stay "active" (#81) — `decisions-archive/step8.md`; ratified 2026-10-24 (#113)
- 2026-10-23 · Page-function failures may carry `data` beside the marker (#82) — `decisions-archive/step8.md`; ratified 2026-10-24 (#114)
- 2026-10-23 · Locator rules, the MCP locator schema and the exported `BridgeError` (#83) — `decisions-archive/step8.md`; ratified 2026-10-24 (#115)
- 2026-10-23 · S1's locator details (#87) — `decisions-archive/step8.md`; ratified 2026-10-24 with a cap warning added (#117)
- 2026-10-23 · The SDK `Tab` surface details and the cursor rule as built (#90) — `decisions-archive/step8.md`; ratified 2026-10-24 (#118)
- 2026-10-23 · S2's handler details: the mark rides the serialiser, `pressKey` takes a target, `waitFor {locator}` rules (#92) — `decisions-archive/step8.md`
- 2026-10-23 · S4's failure-report details, and how the MCP reaches them (#93) — `decisions-archive/step8.md`; ratified 2026-10-24 (#120)
- 2026-10-23 · S2b's details: the `selectTab` refusal grep, the marker's edge cases, the handle mark (#94) — `decisions-archive/step8.md`; ratified 2026-10-24 (#121)
- 2026-10-23 · S5's MCP details: `browser_new_tab` activation, the status lines, the tool schemas, reports (#95) — `decisions-archive/step8.md`; ratified 2026-10-24 (#122)
- 2026-10-24 · The Step 6 surface names stay, marked experimental (#119) — `decisions-archive/step8.md`
- 2026-10-24 · Failure reports stay on by default (#120) — `decisions-archive/step8.md`
- 2026-10-24 · `evaluate {asRef}` on a non-element stays an error (#123) — `decisions-archive/step8.md`
- 2026-10-25 · S7: Run 15 stands as recorded; its follow-ups (#226) — `decisions-archive/step10.md`

**Product promises: background input, the screen and the MCP result shape**
- 2026-10-23 · The background-input policy (#89) — `decisions-archive/step8.md`; ratified 2026-10-24 (#106)
- 2026-10-24 · An MCP failure report with a screenshot stays a non-error result, re-probed on each Claude Code upgrade (#124) — `decisions-archive/step8.md`
- 2026-10-24 · FE and `focusFirst` are ratified; the MCP's trusted tools focus first too (#106) — `decisions-archive/step8.md`

**Product promises: the safety gate**
- 2026-10-24 · Phase E's design: the kill switch, the disarmed state, blocked sites, the JavaScript switch (#128) — `decisions-archive/step9.md`
- 2026-10-24 · The safety state travels as two events and a `daemon.status` field (#132) — `decisions-archive/step9.md`
- 2026-10-24 · What `listTabs`, tab events and the daemon reveal while disarmed or for a blocked tab (#134) — `decisions-archive/step9.md`
- 2026-10-24 · The block-list grammar (#135) — `decisions-archive/step9.md`
- 2026-10-24 · `tabs.claim` on a blocked tab is granted, every call on it refused (#136) — `decisions-archive/step9.md`
- 2026-10-24 · In-flight work at disarm and on a newly blocked tab (#137) — `decisions-archive/step9.md`
- 2026-10-24 · Script URLs and the JavaScript switch; own pages of every extension (#138) — `decisions-archive/step9.md`; script URLs with JavaScript off answer `JS_DISABLED` since #202/#219
- 2026-10-24 · The state is read per call, fails closed, and is locked to trusted contexts (#139) — `decisions-archive/step9.md`
- 2026-10-24 · `downloadStart` and redirects onto a blocked host (#140) — `decisions-archive/step9.md`; ruled by #202, and its network-rule step placed after Step 11 by #229
- 2026-10-24 · The shortcut is `_execute_action` (#142) — `decisions-archive/step9.md`
- 2026-10-24 · Badge and title (#143) — `decisions-archive/step9.md`
- 2026-10-24 · A re-arm right after a disarm is ignored (#144) — `decisions-archive/step9.md`
- 2026-10-24 · The SDK's `TabInfo` keeps `title` and `url` as strings and gains an optional `hidden` (#148) — `decisions-archive/step9.md`
- 2026-10-24 · S1: Rule 7 unwraps wrapper URLs and compares case-insensitively (#153) — `decisions-archive/step9.md`
- 2026-10-24 · S1: `downloadStart` checks its own URL against the block list only (#154) — `decisions-archive/step9.md`
- 2026-10-24 · S1: The network filter treats a tab showing this extension's own page as blocked (#155) — `decisions-archive/step9.md`
- 2026-10-24 · S1: Matcher details §5 leaves implicit (#156) — `decisions-archive/step9.md`
- 2026-10-24 · S1: The refusal messages (#158) — `decisions-archive/step9.md`
- 2026-10-24 · S3: `safetyStatus` is never sent with null (#159) — `decisions-archive/step9.md`
- 2026-10-24 · S3: The daemon's redaction follows the last state it received, across extension sockets (#160) — `decisions-archive/step9.md`
- 2026-10-24 · S3: `leaseGranted.url` is `""` while disarmed, whatever the event carried (#161) — `decisions-archive/step9.md`
- 2026-10-24 · S3: `browser_status`'s Safety line is a second text item, shown only while the extension is connected (#162) — `decisions-archive/step9.md`
- 2026-10-24 · S3: Safety refusals get no `report` property; the wording is `safetyRefusalLine` on `@bridge/sdk/report` (#163) — `decisions-archive/step9.md`
- 2026-10-24 · S3: The refusal wording (#164) — `decisions-archive/step9.md`; the JavaScript-off line is `JS_DISABLED` since #202/#219
- 2026-10-24 · S3: The SDK exports the types `SafetyState` and `HiddenReason` (#168) — `decisions-archive/step9.md`
- 2026-10-24 · S2a: an unknown method is `UNKNOWN_METHOD` in every state (#170) — `decisions-archive/step9.md`
- 2026-10-24 · S2a: storage keys, and a wrong-typed value makes the state unreadable (#171) — `decisions-archive/step9.md`
- 2026-10-24 · S2a: the offscreen document accepts only this extension's non-tab senders (#173) — `decisions-archive/step9.md`
- 2026-10-24 · S2a: a disarm whose write fails twice returns `"write-failed"` and stays disarmed in memory (#174) — `decisions-archive/step9.md`
- 2026-10-24 · S2a: `navigate`/`newTab` are gated on the URL Chrome will open (#175) — `decisions-archive/step9.md`
- 2026-10-24 · S2a: a disarm held in memory wins over a storage read (#176) — `decisions-archive/step9.md`
- 2026-10-24 · S2a: a capture whose window showed another tab is refused `OFFSCREEN` (#177) — `decisions-archive/step9.md`
- 2026-10-24 · S2a: the post-check also replaces error replies; `listTabs` with an unreadable state is refused, and has no post-check (#178) — `decisions-archive/step9.md`
- 2026-10-24 · S2a: the network ingest drops a request for good once one of its events was dropped (#179) — `decisions-archive/step9.md`
- 2026-10-24 · S2a: no `safetyState` is sent while the state cannot be read (#180) — `decisions-archive/step9.md`
- 2026-10-24 · S2b: the writers test refuses `storage.local.remove`/`clear` everywhere (#188) — `decisions-archive/step9.md`
- 2026-10-24 · The user rules on the 32 Step 9 open decisions; Step 9 closes (#202) — `decisions-archive/step9.md`
- 2026-10-25 · S4b: `JS_DISABLED`'s wire shape and the SDK line for an old extension (#219) — `decisions-archive/step10.md`

**Product promises: bulk data, `saveTo`, the cap warning and the schema baseline**
- 2026-10-24 · Bulk data through `browser_evaluate` was a test device only; the MCP gets a `saveTo` path (#127) — `decisions-archive/step8.md`
- 2026-10-25 · Stage 0: `saveTo` uses transport (B), with tab-carrying pulls (#205) — `decisions-archive/step10.md`
- 2026-10-25 · Stage 0: the cap warning reaches SDK actions as a client event (#206) — `decisions-archive/step10.md`
- 2026-10-25 · Stage 0: `saveTo`'s file rules are stricter than `browser_download`'s (#207) — `decisions-archive/step10.md`
- 2026-10-25 · S2: the MCP schema baseline, a failed focus's answer, and the focus sentence (#214) — `decisions-archive/step10.md`
- 2026-10-25 · S3: the cap warning's edges as built (#216) — `decisions-archive/step10.md`
- 2026-10-25 · S4: a primitive completion value crosses the CDP leg whole; S7 measures it (#217) — `decisions-archive/step10.md`
- 2026-10-25 · S4: `saveTo`'s wire methods, refusals, store caps, SDK form and file finish (#218) — `decisions-archive/step10.md`
- 2026-10-25 · S7: SAVE-REFUSE's `[chrome.debugger] ` prefix — the product stays for now; a fix is offered (#227) — `decisions-archive/step10.md`; ruled 2026-10-25: option (b) (#229)

## Archive

When a step closes, its entries move to `docs/decisions-archive/` with their numbers unchanged.

| File | Step | Numbers | Entries | Dates |
|---|---|---|---|---|
| [`step6.md`](decisions-archive/step6.md) | Step 6: the persistent daemon and protocol v2 | #1–#36 (incl. #2b) | 37 | 2026-10-21 → 2026-10-22 |
| [`step7.md`](decisions-archive/step7.md) | Step 7: multi-actor tabs | #37–#69 | 33 | 2026-10-22 → 2026-10-23 |
| [`step8.md`](decisions-archive/step8.md) | Step 8: the SDK surface and the MCP cursor | #70–#127 | 58 | 2026-10-23 → 2026-10-24 |
| [`step9.md`](decisions-archive/step9.md) | Step 9: Phase E safety | #128–#200, #202 | 74 | 2026-10-24 → 2026-10-24 |
| [`step10.md`](decisions-archive/step10.md) | Step 10: the Step 8 follow-ups | #201, #203–#229 | 28 | 2026-10-24 → 2026-10-25 |

## Log

The current step's entries (Step 11 and the lean-procedures work), newest first.

### 2026-10-25 · Step 11: Step 10's follow-ups — the details of #229's three items (#244)
**Decided (proposed):** (a) in `describeDebuggerError` (`extension/src/debugger-errors.ts`) an own `BridgeError`
whose code is not a debugger code passes through unchanged (code, message, `data`); raw Chrome and page errors keep
`[chrome.debugger] `; EVAL-5 unchanged; failing test first; live row SAVE-REFUSE-R. (b) `browser_evaluate`'s `saveTo`
description names `kind` (`string` | `json`); the #214 baseline is re-baselined for that one tool with a dated note.
(c) SW-2: SW-1R's differential design with one discarded warm-up trial, then three measured trials; the outcome table
of the Step 10 phase doc's 0.8 unchanged; a fix stage S5b only on "runs to its bound". Phase doc 0.14.
**Why:** the user ordered all three at Step 10's close (#229); these are the how.
**Instead of:** prefix-stripping at each caller; a new baseline file; SW-2 without a warm-up.
**Revisit if:** Stage 0 finds a caller that relies on the prefix of an own error.
**By:** Claude (proposed; Stage 0 attacks it)

### 2026-10-25 · Step 11: Run 16 may edit the Upload folders box in its own window (#243)
**Decided (proposed):** Run 16 (phase doc 0.12) runs on fixture pages only under #33; the wave may edit the options
page's Upload folders box in a window it opened, only to add its own scratch `<ROOT>` and to restore the found text
exactly (read back by hash); a failed restore is a stop. Rows UP-0…UP-9, UP-LOGS, UP-CLICK (RECORD, only if Stage 0
names a safe way to close the dialog), SAVE-REFUSE-R and SW-2.
**Why:** as Runs 13–15 edited the block list (#33); a wave cannot test the folder rule without one folder.
**Instead of:** a human gate for that edit (the user may still prefer it — listed under Open decisions).
**Revisit if:** the user makes it a gate, or a restore fails.
**By:** Claude (proposed)

### 2026-10-25 · Step 11: nothing logs an upload path, and the rest of the safety boundary is unchanged (#242)
**Decided (proposed):** no layer logs a path, folder, file name or an uploaded file's sha256; refusals name none;
the log-scan allowlist count stays; `log-sentinel.test.ts` gains a sentinel folder and file name. Step 9's invariants
hold, now covering the upload folders; armed, JavaScript on, empty block list and no folders → every existing tool
and test behaves as before, and `uploadFiles` answers `UPLOAD_REFUSED`. Phase doc 0.10–0.11.
**Why:** with paths on the wire (#235) the extension sees the path, so "never log a path" binds in every layer.
**Instead of:** redacting paths in the daemon's `redact` (it keys on `://` and the token only).
**Revisit if:** a debugging need for paths in logs appears (it would need a ruling, never a quiet change).
**By:** Claude (proposed)

### 2026-10-25 · Step 11: the MCP tool `browser_upload_file` (#241)
**Decided (proposed, contract):** input `{ref?, locator?, paths: string[] (1–20, absolute), tab?}`; answer
`Uploaded <n> file(s) to <target>:` then `<basename> · <bytes> bytes · sha256 <hex>` per file, no directory part;
the description names the folder rule, `UPLOAD_REFUSED` (ask the user, never retry another path), the banner and
"never click a file input"; `browser_click`'s description gains one sentence; 24 tools; the #214 baseline gains
exactly one entry. Phase doc 0.9.
**Why:** matches `browser_click`'s target fields and the SDK result (#240).
**Instead of:** a single `path` field; echoing full paths in the answer.
**Revisit if:** the user wants the answer to carry the paths.
**By:** Claude (proposed; for user review)

### 2026-10-25 · Step 11: `Tab.upload`'s signature and result (#240)
**Decided (proposed, contract):** `tab.upload(target, paths: string | string[], options?: {timeoutMs?})` →
`{files: {name, bytes, sha256}[]}`, mirrored by `client.upload(…)`; new types `UploadOptions`, `UploadResult`; the
main entry keeps eight values. A client preflight (absolute, exists, regular file, readable; `fs.realpath` sent; sha256
while reading) refuses with `BAD_PARAMS` and no call; it is a convenience, never the boundary. No `focusTab`. Phase
doc 0.8.
**Why:** within the ratified `Tab` surface (#118); the real-path step lets the extension refuse a junction that
points out (#236).
**Instead of:** no preflight (the extension cannot see links); bytes in the result.
**Revisit if:** sha256 of large files proves slow.
**By:** Claude (proposed; for user review)

### 2026-10-25 · Step 11: which element receives the files (#239)
**Decided (proposed):** in the content script, after the ref/locator resolves: an `<input type="file">`, a `<label>`
whose `control` is one, or an element with exactly one file-input descendant (open shadow roots, same-origin frames);
else `BAD_PARAMS`. Refused before attach: disabled; >1 path without `multiple`; 0 or >20 paths. A one-off mark
attribute, a closure-free finder by `Runtime.evaluate` returning an `objectId`, then `DOM.setFileInputFiles`; the mark
removed on every path; 0 matches `REF_STALE`, 2 `INTERNAL`. `a11y.ts`, `locate` and the snapshot unchanged. Phase doc
0.7.
**Why:** reaches the common hidden-input-behind-a-label pattern without changing locator rules.
**Instead of:** `DOM.getDocument {pierce}` + `DOM.querySelector` (Stage 0 weighs it); making hidden inputs targetable.
**Revisit if:** a strict CSP blocks the finder (UP-8).
**By:** Claude (proposed; Stage 0 attacks it)

### 2026-10-25 · Step 11: the wire method `uploadFiles`, no visibility lock, no focus (#238)
**Decided (proposed, contract):** tab method `uploadFiles {tab, ref | locator, paths: string[]}` → `{files: number}`
(+ `pastSnapshotCap?: true`); 1–20 paths; in `TAB_METHODS`, lease-checked, `takesLock` false; no `focusFirst`
(`DOM.setFileInputFiles` is not `Input.*`); the debugger banner shows. Whether it works on a background tab is
unmeasured: Run 16's UP-1 decides with a pre-written outcome table; a failure becomes a proposed decision, never a
fix in the wave. Phase doc 0.6.
**Why:** the upload needs no screen; adding focus without a measurement is a forbidden fix.
**Instead of:** taking the lock or focusing first by default.
**Revisit if:** UP-1 shows the page receives nothing on a background tab.
**By:** Claude (proposed; for user review)

### 2026-10-25 · Step 11: the safety class `upload` and the code `UPLOAD_REFUSED` (#237)
**Decided (proposed, contract):** `uploadFiles` gets class `upload` in `METHOD_CLASSES`: the tab's tests (disarmed →
`DISARMED {scope:"all"}`; blocked or own page → `DOMAIN_BLOCKED`), then the folder rule on every path →
`UPLOAD_REFUSED` (27 codes, 26 on the wire; spec §10 amended first); order `DISARMED` > `DOMAIN_BLOCKED` >
`UPLOAD_REFUSED` > `BAD_PARAMS`; the JavaScript switch does not apply. A fixed message naming no path, folder, count
or file, no `data`, not in the failure-report attach set; one line in the SDK and the MCP. A refusal reveals only that
a path is outside the folders. Phase doc 0.5.
**Why:** the agent must learn to ask the human, as with `JS_DISABLED` (#219).
**Instead of:** `BAD_PARAMS` (hides that the human decides); `DISARMED` with a new scope (#202 moved away from scopes).
**Revisit if:** the user wants the JavaScript switch to cover uploads.
**By:** Claude (proposed; for user review)

### 2026-10-25 · Step 11: upload folders are a human-held allow-list in the extension, empty by default (#236)
**Decided (proposed, contract, security):** a key `safety.uploadFolders` (folder paths, one per line) in
`chrome.storage.local`, read per call, missing = empty = refused, wrong-typed → every call `DISARMED` (#139, #171);
written only by the options page ("Upload folders"; a root and a relative path refused, a home folder warned); a pure
matcher `extension/src/upload-paths.ts` (separator boundary, drive letters case-insensitive, POSIX case-sensitive;
relative, `.`/`..`, UNC, `\\?\`/`\\.\`, an ADS `:`, control characters and empty refused; ≥ 40 cases first); the
clients send `fs.realpath`; the wire's safety state unchanged (no folder count). Phase doc 0.4.
**Why:** an upload sends local files to a page; an injected agent must not choose which. Safety lives in the
extension (Step 9).
**Instead of:** no rule; a per-upload confirmation (later mode); an allow-list in the client's config (the agent's
to edit; a forbidden fix).
**Revisit if:** the user wants the per-upload confirmation, or a folder count in the state.
**By:** Claude (proposed; for user review)

### 2026-10-25 · Step 11: paths cross the wire, never bytes (#235)
**Decided (proposed, contract):** (A) the client sends absolute paths; the extension passes them to
`DOM.setFileInputFiles`; Chrome reads the files. Known limit: a file changed between the client's check and Chrome's
read. Phase doc 0.3.
**Why:** same machine and user as Chrome; no 100 MiB frame limit; real `File` objects and Chrome's own events.
**Instead of:** (B) bytes in chunks into an extension store and a page-side `DataTransfer` (synthetic, CSP-fragile);
(C) a temp file the extension writes (it cannot).
**Revisit if:** the bridge ever serves a client on another machine.
**By:** Claude (proposed; for user review)

### 2026-10-25 · Step 11: the upload is `Tab.upload` / `browser_upload_file` through `DOM.setFileInputFiles` (#234)
**Decided (proposed):** names and mechanism as the Phase D sketch; not this step: intercepting the native file
chooser (needs Step 12's keep-attached session), drag-and-drop zones with no input, clearing an input, the
per-upload confirmation mode, a folder count in the state. Phase doc 0.2, 0.13.
**Why:** the roadmap orders D3 (#129); the CDP primitive exists and the extension already runs CDP sessions.
**Instead of:** a file-chooser interception now.
**Revisit if:** Stage 0 finds `DOM.setFileInputFiles` unusable through `chrome.debugger`.
**By:** Claude (proposed)

### 2026-10-25 · Step 11: the order of the stages (#233)
**Decided (proposed):** Stage 0 → S1 (#229's two code items) → S2 (contract) → S3 ∥ S4 → S5 (Run 16, alone) → S6
(docs); one live wave. Phase doc 0.1 and § Stages.
**Why:** S1 edits files S2–S4 also edit; S3 and S4 are file-disjoint.
**Instead of:** S1 inside S2.
**Revisit if:** Stage 0 finds S3 and S4 not disjoint.
**By:** Claude (proposed)

### 2026-10-25 · Gotchas follow the code they bind (#232)
**Decided:** A runtime gotcha lives in the `CLAUDE.md` of the code an agent would edit to break it (a top-level
extension file's fact in `extension/CLAUDE.md`, never a sub-folder file); every other package it binds gets a one-line
pointer that does not repeat the headline. Cross-package facts stay in the root.
**Why:** a folder `CLAUDE.md` loads only when an agent opens a file in that folder, so a fact filed by where it was
measured (e.g. the SDK's knock facts in `daemon/`) never reached the agent editing that code (L2 verifier F1, R1;
cleanup pass 2026-10-25, G1–G4).
**Instead of:** placing by the package where the fact was measured, with pointers only.
**Revisit if:** a gotcha binds two folders equally and pointers stop being enough.
**By:** user (ruled on the cleanup pass, 2026-10-25)

### 2026-10-25 · Commits carry exactly one trailer and no Claude-Session line (#231)
**Decided:** Every commit ends with exactly one trailer, `Co-Authored-By: Claude <model> <noreply@anthropic.com>`
for the model that wrote it, and no `Claude-Session:` line (`docs/agent-rules.md` §10, root `CLAUDE.md`
Conventions).
**Why:** the user's instruction during Step 10 S7, carried by the Step 10 and Step 11 kickoffs but recorded in no
decision entry (cleanup pass 2026-10-25, item P9).
**Instead of:** the earlier Conventions line, which added the session's `Claude-Session:` line.
**Revisit if:** the user asks for session links in commits again.
**By:** user (instruction during Step 10 S7; recorded 2026-10-25)

### 2026-10-25 · Lean procedures: rules by pointer, package CLAUDE.md files, risk-tiered models (#230)
**Decided:** Rules every agent follows live once, in `docs/agent-rules.md`; briefs, kickoffs and skills point to
it and never paste rules, spec text or numbers (`briefs/common.md` and the "paste verbatim" step end). The root
`CLAUDE.md` keeps the map, state and cross-package invariants; each package's gotchas move to its own `CLAUDE.md`,
which loads when an agent opens a file there (probed 2026-10-25). `CLAUDE.md` files carry no history notes. Fewer
files per stage; the as-built is a section of the phase doc. A cleanup pass (`cleanup-pass` skill,
`scripts/doc-check.mjs`) replaces the propagator. `decisions.md` keeps open and standing decisions and the current
step; closed steps go to `docs/decisions-archive/`. Low-risk stages (no contract file, nothing on the safety
side) get Sonnet at effort high for builders and fixers, Opus after two failed Sonnet fix rounds; every verifier,
step and session agent stays Opus; low-risk cleanup areas run Sonnet. The three-level agent tree stays.
**Why:** Step 10 cost about 17.5 h and 336k words in its steps dir from 46 briefs, each carrying 4.6k words of
pasted rules on top of a 13.3k-word `CLAUDE.md` loaded by every agent; the user: "it is getting out of control",
"we don't want to sacrifice quality for speed, we just want to remove the bloat".
**Instead of:** keeping all-Opus (#203) and the pasted blocks; or cutting verification levels (the user keeps the
levels and full cycles to keep each agent's context small).
**Revisit if:** Step 11's trial (`docs/plans/2026-10-25-lean-procedures.md` § Trial) shows more verifier findings
or live defects on Sonnet-built stages, or a package gotcha that failed to load where it was needed.
**By:** user (discussed 2026-10-25)
