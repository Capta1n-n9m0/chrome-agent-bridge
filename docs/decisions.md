# Decisions — chrome-agent-bridge

Newest first. Format and rules: [`docs-writing-guide.md`](docs-writing-guide.md#decisions).
Cite an entry by date + title. Closed steps' entries are in `docs/decisions-archive/` (index below).

**Earlier decisions** (before 2026-10-21) live where they were made: the design specs in
`docs/specs/` and the step plans in `docs/plans/`. When one matters again, restate it here
as a dated entry and point back.

## Open decisions

Step 12's contract-level decisions, open for the gate; the build follows the conservative option meanwhile (Step 11b's
were ruled on 2026-10-27, #311, #320). #322, #323, #325 and #326 are amended by Stage 0's entries below them:
- 2026-10-27 · Step 12: `args` for evaluate is a function source called with one JSON value (#322), amended by #330–#332
- 2026-10-27 · Step 12: `consoleMessages`: read on demand, the entry shape, class `tab` (#323), amended by #333, #334
- 2026-10-27 · Step 12: `uploadFiles {chooser: true}` intercepts the chooser only inside the call (#325), amended by #336
- 2026-10-27 · Step 12: G1 and G2 as ruled, their contract left to Stage 0 (#326), amended by #337, #338
- 2026-10-27 · Step 12: how every item passes the safety gate (#327)
- 2026-10-27 · Stage 0: the kept session's lifecycle; an overlapping call keeps today's answer (#335)
- 2026-10-27 · S2b: `browser_evaluate.args` as a written-out schema delta; the daemon's own reload text; the SDK's ninth refusal (#342)
- 2026-10-27 · S3a: the reply `{entries}` and the `level` threshold … (#344, item 1)
- 2026-10-27 · S3b: the console formatter's line form … the JavaScript-off line left for the gate (#345, items 1 and 3)
- **G12-2 for the user:** add the `webNavigation` permission so G1 can be built? (#337)

## Standing decisions

A decision that still governs how we work or what the product promises: one line, its date and title, and where
its full entry lives. Entries that only
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
- 2026-10-25 · Lean procedures: rules by pointer, package CLAUDE.md files, risk-tiered models (#230) — `decisions-archive/step11.md`
- 2026-10-25 · Commits carry exactly one trailer and no Claude-Session line (#231) — `decisions-archive/step11.md`
- 2026-10-25 · Gotchas follow the code they bind (#232) — `decisions-archive/step11.md`
- 2026-10-25 · Builders, fixers and live runners run Sonnet at medium effort from S5 on (#270) — `decisions-archive/step11.md`; amended by #289
- 2026-10-25 · S5 is split into seven slices; the stopped prep is salvaged per slice (#271) — `decisions-archive/step11.md`; its rule for small iterations is in `agent-rules.md` §7
- 2026-10-26 · Step agents never end their turn on a running child; commits carry the verifier's verdict (#286) — `decisions-archive/step11.md`; made permanent by #289; `agent-rules.md` §8, §10
- 2026-10-26 · How agents are run from Step 11b on; #286 stands; the cleanup pass's proposals applied (#289) — `decisions-archive/step11b.md`
- 2026-10-26 · Step 11b: the permission and the rule's scope ruled; Step 11's follow-ups become its stage S0F (#290) — `decisions-archive/step11b.md`
- 2026-10-26 · Stage 0 measures DNR in a separate scratch Chrome on a temporary profile (#294) — `decisions-archive/step11b.md`
- 2026-10-26 · Stage 0's incident: a stray `chrome.exe --version` reached the user's Chrome; never run Chrome without an own profile (#297) — `decisions-archive/step11b.md`; reported to the user 2026-10-27
- 2026-10-27 · The user rules Step 11b's gate: accept, `newTab` on `about:blank` (S6), then Run 17b (#311) — `decisions-archive/step11b.md`
- 2026-10-27 · Step 11b closes; three fix rounds per stage, the size-cap overrun, wave prompts in `handoffs.md`, the read-only roles (#320) — `decisions-archive/step11b.md`; `agent-rules.md` §6, §7

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
- 2026-10-22 · T1's extension details (#55) — `decisions-archive/step7.md`
- 2026-10-22 · T2's daemon details (#57) — `decisions-archive/step7.md`
- 2026-10-22 · T3's snapshot fields and capture rules (#58) — `decisions-archive/step7.md`
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
- 2026-10-24 · `downloadStart` and redirects onto a blocked host (#140) — `decisions-archive/step9.md`; ruled by #202, and its network-rule step placed after Step 11 by #229; built in Step 11b (#290, #292, #296); the gate ruled by #311; `newTab` covered by opening `about:blank` first (S6, #314), measured by Run 17b (#318)
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
- 2026-10-26 · Step 11b: the rule set stays equal to the block list and fails closed (#292) — `decisions-archive/step11b.md`
- 2026-10-26 · Step 11b: the bridge's answers when a hop is blocked stay as today (#293) — `decisions-archive/step11b.md`
- 2026-10-26 · S1: a default-port pattern makes two regex rules; an over-long regex fails closed (#300) — `decisions-archive/step11b.md`
- 2026-10-27 · `newTab` with a URL opens `about:blank` first (#295 as ruled by #311; built S6, #312–#314) — `decisions-archive/step11b.md`
- 2026-10-27 · A bridge `back`/`forward` reaches only pages a human or an activating call acted on (#308) — `decisions-archive/step11b.md`

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

**Product promises: uploads and local files**
- 2026-10-25 · Step 11: the upload is `Tab.upload` / `browser_upload_file` through `DOM.setFileInputFiles` (#234) — `decisions-archive/step11.md`
- 2026-10-25 · Step 11: paths cross the wire, never bytes (#235) — `decisions-archive/step11.md`
- 2026-10-25 · Step 11: upload folders are a human-held allow-list in the extension, empty by default (#236) — `decisions-archive/step11.md`
- 2026-10-25 · Step 11: the safety class `upload` and the code `UPLOAD_REFUSED` (#237) — `decisions-archive/step11.md`
- 2026-10-25 · Step 11: the wire method `uploadFiles`, no visibility lock, no focus (#238) — `decisions-archive/step11.md`; UP-1 passed on a background tab (#284)
- 2026-10-25 · Step 11: `Tab.upload`'s signature and result (#240) — `decisions-archive/step11.md`
- 2026-10-25 · Step 11: the MCP tool `browser_upload_file` (#241) — `decisions-archive/step11.md`
- 2026-10-25 · Step 11: nothing logs an upload path, and the rest of the safety boundary is unchanged (#242) — `decisions-archive/step11.md`; accepted at the gate (#288)
- 2026-10-25 · Stage 0: uploads need Chrome's file access, and the bridge never opens or reads `file:` pages (#245) — `decisions-archive/step11.md`; kept by #288
- 2026-10-25 · Stage 0: a `webkitdirectory` input is refused; `files` is the count Chrome accepted (#247) — `decisions-archive/step11.md`
- 2026-10-25 · Stage 0: who the folder rule protects against, and the broad-folder warning (#250) — `decisions-archive/step11.md`; changed by #288 (a home folder, or a folder of home folders, is refused as an Upload folder); built in S0F-a (#298)
- 2026-10-25 · S2: the `paths` cap, the exact messages, and the folder-line rules (#257) — `decisions-archive/step11.md`
- 2026-10-25 · S2: the `file:` rule's edges (#259) — `decisions-archive/step11.md`; changed by #288 (`listTabs` rows and tab events of a `file:` tab drop `title` and `url` and carry `hidden`); built in S0F-a (#298)
- 2026-10-26 · S5-liveB: the upload works on a background tab; a raw missing-file upload answers ok (#284) — `decisions-archive/step11.md`; changed by #288 (a missing file is an error in the extension too); built in S0F-b (#299)
- 2026-10-26 · The user rules Step 11's gate; Step 11 closes (#288) — `decisions-archive/step11.md`

## Archive

When a step closes, its entries move to `docs/decisions-archive/` with their numbers unchanged.

| File | Step | Numbers | Entries | Dates |
|---|---|---|---|---|
| [`step6.md`](decisions-archive/step6.md) | Step 6: the persistent daemon and protocol v2 | #1–#36 (incl. #2b) | 37 | 2026-10-21 → 2026-10-22 |
| [`step7.md`](decisions-archive/step7.md) | Step 7: multi-actor tabs | #37–#69 | 33 | 2026-10-22 → 2026-10-23 |
| [`step8.md`](decisions-archive/step8.md) | Step 8: the SDK surface and the MCP cursor | #70–#127 | 58 | 2026-10-23 → 2026-10-24 |
| [`step9.md`](decisions-archive/step9.md) | Step 9: Phase E safety | #128–#200, #202 | 74 | 2026-10-24 → 2026-10-24 |
| [`step10.md`](decisions-archive/step10.md) | Step 10: the Step 8 follow-ups | #201, #203–#229 | 28 | 2026-10-24 → 2026-10-25 |
| [`step11.md`](decisions-archive/step11.md) | Step 11: D3 file upload (and the lean procedures) | #230–#264, #266–#288 | 58 | 2026-10-25 → 2026-10-26 |
| [`step11b.md`](decisions-archive/step11b.md) | Step 11b: the block list stops redirected requests | #289–#320 | 32 | 2026-10-26 → 2026-10-27 |

## Log

The current step's entries (Step 12), newest first. Step 11b's are in `decisions-archive/step11b.md`.

### 2026-10-27 · S4a: the keeper's eight edge rules; V4-1's fix goes in S4b (#347)
**Decided:** S4a (`c9bb6cb`, verifier 4 PASS-with-notes after three fix rounds; two MAJOR races, each a session left
attached, found by verifiers 1 and 3 and fixed) as its eight proposals (`…-steps/S4a.md` §5): a kept session detaches
after any error of a use, a failed clean-up calls `drop()`; a re-check refusal of `JS_DISABLED` or `UPLOAD_REFUSED`
keeps the session (the tab's page is still allowed; the idle bound ends it), any other refusal or failure detaches; a
refusing re-check of a busy tab answers the refusal; a use waits at most 1 s for a pending detach on its tab; a session
killed during its attach is detached when the attach lands; `onDetach` forgets the entry and re-reads `getTargets`
within 1 s, detaching if the tab still reads attached or the read fails; the post-attach tab check releases only its
own entry; S4b bounds `tabCheck` at its source. **V4-1** (MINOR: a slow detach can make one call answer a false
`DEBUGGER_CANCELLED`, nothing left attached) and V3-4 (NIT, fails closed) are fixed in S4b, which reopens the module,
rather than by a fourth (Opus) fix round now. S4a's tests ran 710 lines against 675, within §7's 1.5× bound.
**Why:** each rule fails closed toward "nothing attached"; the known fix is one line in the slice that wires it.
**Instead of:** a fourth fix round on an unwired module.
**Revisit if:** S4b's verifier finds V4-1 changes an existing answer.
**By:** Claude (build decision)

### 2026-10-27 · S1-helpers-b: the Run 18 scanner, `raw-l1`, a missing list STOPs; two process slips (#346)
**Decided:** S1-helpers-b (`1bf351e`, verifier 4 PASS-with-notes after three fix rounds) as ruled in
`…-steps/S1-helpers-b.md` §5: `s11b scan18` follows §4.26's fixture definition and does not count a `://` with no
scheme; the old scanner's false FAILs came from the helpers' own `SCAN …: ://=` text and from `127.0.0.1:8081`, not the
extension's own page, so §4.26's stated cause and S7-run-record §5 item 8 are wrong on the cause (a finding; neither is
edited, the sheet's rule is unchanged); `s11b raw-l1` makes R18-UP-L1's two raw calls once; a missing Upload-folders
list element is a STOP, never a count of 0. S1-helpers-c's runner checks both option-page lists at R18-0 before any
state change (an empty `uploadfolders-warned` list's UIA exposure is unmeasured), keeps an outer `try` and uses no
`SilentlyContinue`. 757 lines (code 259 under its 350 cap) are within #344 (4). **Process slips, recorded:** the
builder ran `git checkout -- recipes/s11-win.ps1` once (forbidden by `agent-rules.md` §10; no other agent's work was in
that file), and verifier 1 wrote `core.autocrlf` into `.git/config` and removed it (checked absent at 2026-10-27
session-agent time). No damage found.
**Why:** the sheet's pass rules stand; the helpers read them.
**Instead of:** editing §4.26 after its commit (forbidden).
**Revisit if:** R18-0 shows the warned list is not exposed.
**By:** Claude (build decision)

### 2026-10-27 · S3b: the console formatter's line form; its output is capped in S5b; the JavaScript-off line left for the gate (#345)
**Decided:** S3b (`beaa805`, verifier PASS after one fix round): (1) for user review: `formatConsole`'s one-line form and
its export on `@bridge/sdk/format` only (the SDK's eight values unchanged), as `…-steps/S3b-builder.md` §5. (2) Its
output is not capped and can reach ~400 KB at 200 entries (S3b verifier F4), while `formatNetwork` caps at 20 000
characters: the conservative option is a cap of the same form and size, built in **S5b** (the next slice in the
sdk/mcp lane), with a test; the new tool has no earlier answer, so nothing existing changes. (3) A refused
`browser_console_messages` with JavaScript off prints the shared `JS_DISABLED` line, which says every other call still
works (F3): the line is not changed in Step 12 (a changed message is a forbidden fix to make a row pass, and the line is
contract); the user rules it with #334, which would remove the case.
**Why:** an uncapped tool result can flood the agent's context; the message is the user's with the class.
**Instead of:** measuring the size live first (CON-MCP still records it).
**Revisit if:** the user rules #334 for class `tab`.
**By:** Claude (build decision for (2); (1) and (3) for user review)

### 2026-10-27 · S3a: the reply `{entries}` and the `level` threshold; a shortened preview fails closed now; caps count code from here on (#344)
**Decided:** S3a (spec note `7b29b5d`, code `e835eb5`, verifier PASS-with-notes after two fix rounds): (1)
contract-level, for user review: the reply is `{entries}` and `level` is a severity threshold (`error > warning > info
> debug`, the level and everything more severe); (2) build decisions as `…-steps/S3a-builder.md` §5: the arm floor in
worker memory from the worker's start, failing closed; the source set, an entry with no source dropped; a 100 ms settle
and a 10 s bound; (3) **Note A is fixed now, not left to a live row:** a preview value V8 shortened (a cut part ending
in `…`) counts as an unknown source and drops its entry, the fail-closed option, built in S3b with the lane widened to
the reducer and its test (security at least as strict; a few lines). (4) S3a's 898 lines (code 351 under the 450 cap)
are accepted; #341's "Revisit if" has now been met twice, so **from S3b on a slice's cap counts code only, and tests
up to 1.5 times the cap on top**; a slice past either bound is DONE-PARTIAL.
**Why:** the shortening is unmeasured and a leak cannot be judged after the fact; the old caps under-counted the test
rows the exit checks require.
**Instead of:** waiting for a live row on Note A; keeping caps that every standard slice overran.
**Revisit if:** the live row shows entries dropped that should not be (then the rule is narrowed with a measurement);
a code-only overrun.
**By:** Claude (build decisions; (1) for user review; (3) the conservative option)

### 2026-10-27 · S1-helpers: the Run 18 block runner is its own slice, S1-helpers-c (#343)
**Decided:** S1-helpers-a (`8a3053b`) found that no slice of #339's split builds the Run 18 block runner (the script that
runs §4.26's blocks in order and calls the helpers). It becomes **S1-helpers-c** (risk low, cap 400), after
S1-helpers-b (UP-RACE-A, UP-OPT, the aggregator fixes, G-23's items, and S1-helpers-a's open MINOR F-b, the
`answer=VIOLATION` word outside §4.26's `answer=<ok|CODE>`). S1-helpers-a's ruling that an idle under 15 s on the
negative leg is that row's FAIL (§4.26's pass rule), while an `IDLE` under 15 s before a banner row is a helper STOP
(#340), reads the sheet as written.
**Why:** the runner is one coherent deliverable; adding it to S1-helpers-b's 350 would break the cap.
**Instead of:** raising S1-helpers-b's cap.
**Revisit if:** S1-helpers-b finishes well under its cap with the runner trivially small.
**By:** Claude (build decision)

### 2026-10-27 · S2b: `browser_evaluate.args` as a written-out schema delta; the daemon's own reload text; the SDK's ninth refusal (#342)
**Decided (contract-level for the schema and texts, for user review):** S2b's three proposals (`…-steps/S2b-builder.md`
§5): the #214 baseline is not regenerated; `browser_evaluate` gains `args` as a written-out delta in
`mcp/test/s2-focus-first.test.ts` (every other tool still equals the fixture); the daemon answers an `args` call to a
featureless extension `VERSION` with its own text `ARGS_RELOAD_HINT`, and the key's presence (`null` included) counts as
carrying `args`; the SDK refuses a non-string `fn` with `args` (a ninth fixed text) and the MCP runs the shared guard
itself. Both texts are in spec §10 by a dated note (S2b verifier F2). S2b's size, 382 lines against 300 (code 89,
tests 290, docs 3), is within #341's handling.
**Why:** #214 says the baseline moves only by a recorded decision; a delta keeps the other 23 tools pinned; a distinct
text tells the human which reload is meant.
**Instead of:** regenerating the fixture; reusing the general reload text.
**Revisit if:** the user rules on the MCP schema at the gate.
**By:** Claude (proposed; build decision for the size)

### 2026-10-27 · S2a: the test-heavy overrun is accepted; the guard's texts, the `(source\n)` form, the 500 ms paused wait (#341)
**Decided:** S2a commits as one slice at 1083 new lines (code 399, under its 450 cap; tests 684), a deviation from
`agent-rules.md` §7's 1.5× bound recorded here: nothing remains to build, the extra lines are the exit checks' own rows
(the round-trip table, the refusals through both handlers, the bound's paths, B2.2 through `GatedRouter`, the
sentinel), and no split leaves two pieces under the bound. S2a's three design-local proposals stand as written in
`…-steps/S2a-builder.md` §5: the eight fixed refusal texts of the args guard (also in the spec §10 note, `3ab9207`);
the source evaluated as `(source\n)` without `replMode`, a non-function refused (a trailing `;` answers `PAGE_ERROR`);
a 500 ms paused wait with the stop steps bounded.
**Why:** the cap exists to keep a builder's context small; this builder finished in one go and two Opus verifiers
passed it (22 mutants red).
**Instead of:** trimming exit-check tests, or a split after the fact.
**Revisit if:** a later slice overruns the same way: the caps then under-count tests, and #339's caps get a tests
allowance.
**By:** Claude (build decision)

### 2026-10-27 · S1-sheet: banner clauses per slice's control; a short idle is a helper STOP; S1-live after S2a lands (#340)
**Decided:** S1-sheet's X1 and X2 (`…-steps/S1-sheet.md`, Proposed decisions): each banner clause is judged by its own
slice's R18-BANNER-CTL, and S1-record applies the run-wide rule; an idle under 15 s before a banner row is a helper
STOP, not a new NOT MEASURED clause. R17-UP-6's 2 500 ms banner window stands and S1-helpers matches
`recipes/s11-win.ps1:30` to it. S1-live starts only when the tree is clean of uncommitted code: after S2a's commits,
and the record names the HEAD it built.
**Why:** the verifier's two MAJORs, ruled in the sheet before any observation; a live slice runs alone (#33's waves,
the kickoff).
**Instead of:** a run-wide control only; waiting for S2b too (it touches no extension file).
**Revisit if:** S2a's verdict is late enough to hold S1-live past S2b.
**By:** Claude (build decision)

### 2026-10-27 · Stage 0: the slice split, the raised caps and the plan-side corrections (#339)
**Decided:** Stage 0's split (`2026-10-27-step12-phase-f-steps/Stage0.md` §6) is the plan: S1-sheet, S1-helpers-a,
S1-helpers-b, S1-live, S1-record; S2a, S2b; S3a, S3b; S4a, S4b; S5a, S5b; S6-G2 (S6-G1 only on a G12-2 yes); S7; S8.
The four caps over the phase doc's stage limits are raised to Stage0.md §6's (S2a 450, S3a 450, S5a 550, S6-G1 350),
each under `agent-rules.md` §7's ~600. The plan-side findings (`stage0-audit.md` §4–§5, `stage0-audit-2.md` §5) and the
exit-check rewrites of `stage0-audit.md` §5 (B2.1, B2.3, C3.1, C3.3, C3.4, D4.2, E5.2, S8.1) bind as dated in the phase
doc. The DevTools gotcha in `extension/CLAUDE.md` stays until Run 19 measures it in the real profile (m2 D3c ran with
a flag, its control not measured).
**Why:** Stage 0's added work (the pause bound, the cross-table test, the shared prologue, the cancel paths) is real and
each slice stays one coherent piece.
**Instead of:** cutting each slice at the old limit (more slices, the same lines).
**Revisit if:** a slice reports DONE-PARTIAL at its new cap.
**By:** Claude (build decision)

### 2026-10-27 · Stage 0: G2 by the daemon, one request, a 500 ms pause (#338)
**Decided (contract-level, for user review):** Stage0.md §5 (auditor 2's (ii-a)): for `click`/`type`/`pressKey` with
`trusted: true` and no `focusEmulation`, the daemon takes the visibility lock, forwards `focusTab`, re-checks caller and
lease, forwards the input, replies, then holds the lock 500 ms before releasing. No wire, extension, SDK or MCP change;
under contention a trusted input answers `LOCK_TIMEOUT {holder}`, as a lock-taking call does today. Built as S6-G2 with
the spec §10 note first and the exit checks G6.5–G6.8 of Stage0.md §6.
**Why:** #321 Q6 (b) ruled a blocking action; m2 G2 measured ~10 ms needed, so 500 ms has margin; an old extension
works unchanged.
**Instead of:** (i) a `focus` param on the input (a silent no-op on an old extension); (ii-b) a hold token.
**Revisit if:** Run 19's R19-G2 rows show the hold misses a capture.
**By:** Claude (conservative option applied; the user ruled the behaviour, the mechanism is for review)

### 2026-10-27 · Stage 0: G1 waits for G12-2; it stays a documented limit (#337)
**Decided:** naming a background opener's real popup needs `webNavigation` (m2 G1: `sourceTabId` right 15 of 15 with
it; the manifest lacks it; no other source has a tab id). Per #321 and the phase doc, the permission returns to the
user as **G12-2**; S6-G1 (Stage0.md §6 draft) is not run until the user says yes; meanwhile #226's limit stands.
**Why:** a new manifest permission is the user's (G12-2).
**Instead of:** `Page.windowOpen` on a session per held tab (no tab id, a banner on every held tab).
**Revisit if:** the user rules G12-2.
**By:** Claude (the phase doc's fallback)

### 2026-10-27 · Stage 0: the chooser on the call's own session, with `Page.enable`; JavaScript off refuses it (#336)
**Decided (contract-level, for user review):** Stage0.md §5 "E on the call's own session": E does not depend on D or
G2; `Page.enable` before the interception (0 of 5 events without it, m2 E7); the click by `Runtime.evaluate
{userGesture: true}` (a trusted CDP click does not reach a background tab, m2 E6); an event without `backendNodeId`
refused; the `multiple` check on the event's `mode`; a refusal after the click ends the chooser by interception off and
detach; one chooser call per tab at a time; one shared prologue for both upload paths. **While JavaScript is off,
`chooser: true` answers `JS_DISABLED`** (a params rule in the gate), the conservative of the auditors' two readings.
**Why:** m2 E1–E8; security at least as strict as today.
**Instead of:** class `upload` alone, with the switch not applied (auditor 1); E on D's session.
**Revisit if:** the user rules the switch reading.
**By:** Claude (conservative option applied)

### 2026-10-27 · Stage 0: the kept session's lifecycle; an overlapping call keeps today's answer (#335)
**Decided (contract-level for the overlap answer, for user review):** #324 amended as Stage0.md §5 "the keeper's
lifecycle": kept sessions stay in `debuggerSessions`, idle or not; detach on a safety change that blocks a kept tab; a
start-up sweep detaches every `attached: true` tab target (a session survives a worker stop, m2 D4c); drop a session
after a call timeout or failed clean-up; each feature switches its CDP domains off before its call ends. **A second
CDP call overlapping one in flight on the same tab answers `DEBUGGER_DEVTOOLS` as today**; only non-overlapping calls
reuse the session. KEEP-2 judges the detach time. Before S4b ships, a scratch or Run 19 row measures a sweep detach of a
tab another client holds.
**Why:** m2 D2–D5; an existing tool must not answer differently without the user's ruling (the phase doc's STOP rule).
**Instead of:** per-tab serialisation (an overlapping call waits; friendlier, changes an existing answer).
**Revisit if:** the user prefers serialisation; a culled worker loses the session.
**By:** Claude (conservative option applied)

### 2026-10-27 · Stage 0: `consoleMessages` is class `evaluate` until the user rules (#334)
**Decided (contract-level, safety, for user review):** reading the console replays an error subclass's `message`
getter once (m1 C8): page code runs. The JavaScript switch could be read as "no page code at all", so the conservative
option is taken: `consoleMessages` is class **`evaluate`** in `METHOD_CLASSES` (refused `JS_DISABLED` while
JavaScript is off), and the tool's description says so. Stage 0 recommended class `tab` (the getter is the page's own
code, which a human's DevTools runs too); that is the user's to choose.
**Why:** `agent-rules.md` §4: security at least as strict; undoable by one table line.
**Instead of:** class `tab` (#323's proposal; Stage 0's recommendation).
**Revisit if:** the user rules for `tab`.
**By:** Claude (conservative option applied)

### 2026-10-27 · Stage 0: the console read — C1 on the tab's session, filtered before stripping (#333)
**Decided (contract-level, safety, for user review):** Stage0.md §5 "the console read": C1 holds (replay of up to
1000 earlier messages and uncaught errors, m1 C1–C3); `consoleAPICalled` and `exceptionThrown` (minus revoked); no
`Log.enable`; never `discardConsoleEntries`; the tab's own session only (frames excluded); before URLs and stacks are
stripped the reducer drops entries from a blocked, own-extension or `file:` source and entries before the latest arm;
an exception's description cut at its first stack line; the caps of #323; one top-level `chrome.debugger.onEvent`
listener in `sw.ts` feeding a per-call collector.
**Why:** m1 C1–C8; the gate's hiding rules reach the replayed text too.
**Instead of:** C2; auto-attaching to frames.
**Revisit if:** the user wants frame messages.
**By:** Claude (proposed; the shape stays open for the gate)

### 2026-10-27 · Stage 0: an old extension is detected by its hello, not by the answer (#332)
**Decided (contract-level, for user review):** the extension's hello gains an optional `features: ["evaluateArgs"]`
(proto stays 2); the daemon answers `VERSION` with the reload hint to an `evaluate`/`evaluateSaveStart` carrying `args`
when the hello lacked it. Covers the SDK, `evaluateRef`, `evaluateToFile` and the MCP alike; a real function result
stays `kind: "function"`.
**Why:** m1 B6: an old extension's answer cannot be read reliably (a `function` form answers `undefined`).
**Instead of:** #322's `kind` test; a reply marker checked in the SDK only.
**Revisit if:** the hello cannot change in Step 12.
**By:** Claude (conservative option applied)

### 2026-10-27 · Stage 0: an `args` call is bounded by a debugger pause and terminate (#331)
**Decided (contract-level, for user review):** `callFunctionOn` has no timeout and `terminateExecution` is refused for
an extension (m1 B7); the call is bounded by Stage0-measurer3.md §5's six steps (`Debugger.enable` with breakpoints
off before the call; at `timeoutMs` `Debugger.pause`, terminate only when a paused frame is the function's own script,
else resume; `Debugger.disable` always; nothing from `Debugger.paused` logged). S2a's fake-CDP tests and a Run 19 row
pin it.
**Why:** m3 B10 (3 of 3, and the verifier's reproduction); today's evaluate is bounded.
**Instead of:** a documented limit with m3 B11's recovery by navigation (the fallback).
**Revisit if:** `Debugger.enable` misbehaves with a human's DevTools open or on a heavy page (not measured).
**By:** Claude (proposed)

### 2026-10-27 · Stage 0: `args` crosses as a JSON string beside a function object (#330)
**Decided (contract-level, for user review):** #322's call form is replaced: `callFunctionOn {arguments: [{value}]}`
mangles JSON (keys sorted, null properties dropped, a top-level `null` lost; m1 B1). The source is evaluated to a
function object, then called on `globalThis` by a fixed wrapper with `[{objectId}, {value: JSON.stringify(args)}]`
(exact JSON, async resolves, no page global, works under a strict CSP; m1 runs 4–5, verifier V1); `asRef` and `saveTo`
on the same form; the expression wrapper off the `args` path. The caps and refusals of #322 stand.
**Why:** (i) fails its pass rule; (i′) passes.
**Instead of:** #322 (i); 0.4 (ii) (unmeasured).
**Revisit if:** a page that replaced `JSON.parse` breaks a live row.
**By:** Claude (proposed; the phase doc's fallback order)


### 2026-10-27 · Step 12: the stage order and Run 18's rows (#329)
**Decided:** the order of the phase doc's note under the box (2026-10-27): Stage 0, S1–S5, S6 as S6-G1 and S6-G2, S7,
S8; F not in scope. Run 18's rows as 0.3, §4.26 or the next free number (Stage 0 checks), the carried pass rules word
for word except #320's two re-writes.
**Why:** #320 item 1, #321.
**Instead of:** running B before A (Run 19 must use the fixed helpers).
**Revisit if:** Stage 0 finds a dependency the order breaks.
**By:** Claude (build decision)

### 2026-10-27 · Step 12: Run 19's seed rows and what Step 12 does not build (#328)
**Decided (proposed):** phase doc 0.11 (Run 19's seed rows, §4.27 or the next free number, fixture pages only,
expected text committed before any observation) and 0.12 (not in Step 12, with F parked by #321 and 0.8 (b)/(c) not
built). The G1/G2 rows join 0.11 from S6's as-built.
**Why:** the plan's proposal; the rows are written before the measurements (`agent-rules.md` §2).
**Instead of:** rows written after the build has been seen.
**Revisit if:** Stage 0 finds a row that cannot discriminate.
**By:** Claude (proposed)

### 2026-10-27 · Step 12: how every item passes the safety gate (#327)
**Decided (proposed, contract-level, safety, for user review):** phase doc 0.10 as written: only C adds a method,
entered in both tables in one commit; B and E keep their methods' classes; nothing on the wire reads or changes the
safety state; no new log site (the allowlist grows by 0) and `log-sentinel.test.ts` gains a sentinel in `args` and in a
console reply; a refusal reveals what it reveals today. G2's change to the lock touches no safety class.
**Why:** the root `CLAUDE.md` invariants; #139, #202.
**Instead of:** exempting or reclassifying any method (forbidden).
**Revisit if:** the audit finds an item that reaches a page or the debugger outside the gate.
**By:** Claude (proposed)

### 2026-10-27 · Step 12: G1 and G2 as ruled, their contract left to Stage 0 (#326)
**Decided (proposed, contract-level, for user review):** **G1** (#226): the extension's `tabCreated` carries the real
opener only if Stage 0 measures that `webNavigation.onCreatedNavigationTarget`'s `sourceTabId` (or another source the
current manifest already allows) names it for a background opener; the daemon's opener rule then grants the lease to
the opener's holder. A needed new permission returns to the user (G12-2) and G1 stays a documented limit until then.
**G2** (#321 Q6): a trusted click or typing holds the daemon's visibility lock from the focus through the input and a
settle pause after it; Stage 0 picks between (i) one wire call (a trusted input that focuses itself, under the lock)
and (ii) the daemon holding the lock across the existing `focusTab` and the input call, and measures the pause
(starting near 500 ms). The conservative reading until Stage 0 rules: no existing call's answer changes; a call without
`trusted` is untouched; the pause only adds time.
**Why:** #321; phase doc 0.9 leaves the mechanism to measurement.
**Instead of:** guessing a mechanism before the audit; G1 by a new permission without the user.
**Revisit if:** Stage 0's measurements.
**By:** Claude (proposed)

### 2026-10-27 · Step 12: `uploadFiles {chooser: true}` intercepts the chooser only inside the call (#325)
**Decided (proposed, contract-level, for user review):** phase doc 0.7 as written: interception on only inside the
call and off on every path; the same gate as `uploadFiles` (class `upload`, Upload folders, the file-URL check, the
missing-file check, `paths` caps, no path logged); the activating click by `Runtime.evaluate {userGesture: true}` (i),
else a trusted click with focus first (ii); `TIMEOUT` with a fixed message after 5 s with no chooser; E on one call's
own session if Stage 0 shows it receives `Page.fileChooserOpened`, else on D's. While JavaScript is off the
conservative reading applies until the audit weighs it: the chooser path is refused `JS_DISABLED` (its click runs a
script in the page).
**Why:** #321 Q4 (a); 0.7; the conservative option for the JavaScript switch.
**Instead of:** interception for a kept session's life (G12-2); a non-input target treated as a chooser without the
flag.
**Revisit if:** Stage 0 shows the click does not open the chooser on a background tab, or the audit argues the switch.
**By:** Claude (proposed)

### 2026-10-27 · Step 12: the kept debugger session's lifecycle (#324)
**Decided (proposed):** phase doc 0.6 as written: a pure keeper, at most one session per tab, reference-counted,
detached 5 s after the count reaches 0 (#321 Q3 (a)), and on disarm, on a blocked, own or `file:` page, on close or
replace, on every `onDetach` reason and at a worker restart; the gate re-check before every use; no wire, daemon, SDK or
MCP change; answers unchanged.
**Why:** #321 Q3 (a); the lifecycle is internal, and what the human sees is the ruled bound.
**Instead of:** (b) a session only for event-driven features; (c) none.
**Revisit if:** Stage 0 measures that a kept session changes an existing answer, or the banner outlives the bound.
**By:** Claude (proposed)

### 2026-10-27 · Step 12: `consoleMessages`: read on demand, the entry shape, class `tab` (#323)
**Decided (proposed, contract-level, for user review):** phase doc 0.5: C1 (#321 Q2 (a)) if Stage 0 measures that
`Runtime.enable` reports messages logged before it, else C2 (#321's fallback). A new router method `consoleMessages
{tabId, level?, limit?}` and tool `browser_console_messages {tab?, level?, limit?}`; entries `{level, text, ts, kind}`,
`text` ≤ 2 000 characters, ≤ 200 per reply, newest last, no source URL and no stack; the SDK `tab.consoleMessages`.
Class `tab` in `METHOD_CLASSES` and a lease-checked tab method without the visibility lock in `daemon/src/methods.ts`;
not gated by the JavaScript switch, because reading runs no page script (the conservative alternative, class
`evaluate`, is the audit's to weigh).
**Why:** #321 Q2; the plan's shape; a refusal reveals what a refused `snapshot` reveals.
**Instead of:** C3 (a page hook, not ruled); URLs or stacks in entries.
**Revisit if:** Stage 0's replay measurement; the audit argues the class.
**By:** Claude (proposed)

### 2026-10-27 · Step 12: `args` for evaluate is a function source called with one JSON value (#322)
**Decided (proposed, contract-level, for user review):** phase doc 0.4 (i): `evaluate` and `evaluateSaveStart` gain an
optional `args`; with it, `expression` is a function source called with `args` by `Runtime.callFunctionOn
{arguments: [{value}]}`, else today's expression byte for byte; `args` must survive `JSON.stringify`, ≤ 1 MiB, else
`BAD_PARAMS` with a fixed message that never shows the value; checked by the SDK, the shared guard and the extension;
an old extension's `kind: "function"` answer maps to `VERSION` in the SDK; the MCP `browser_evaluate {args}`, the #214
baseline re-pinned only by a recorded decision.
**Why:** #321 Q1; Playwright's shape; no injection by string building.
**Instead of:** (ii) a lexical binding (the fallback if (i) fails at Stage 0); (iii) a JSON literal pasted into the
string.
**Revisit if:** Stage 0 shows `callFunctionOn` leaves a page global, breaks the CSP page, or loses `awaitPromise`.
**By:** Claude (proposed)

### 2026-10-27 · The user rules Step 12's scope (G12-0) (#321)
**Decided (user):** the six questions of `docs/plans/2026-10-27-step12-phase-f.md` § For the user at G12-0:
1. **Scope and order:** A (Run 18, already #320), then B (`args`), C (console), D (kept debugger session), E (the file
   chooser). **F parked** (`back` onto bridge-built history; #308 (b)). **G1 built after Stage 0 measures it**, only if no
   new permission is needed, else it returns to the user (G12-2).
2. **Console:** (a) read on demand through the debugger, if Stage 0 confirms Chrome keeps earlier messages; else (b).
3. **Kept session:** (a) one per tab while an agent works, closed 5 s after its last call; the banner stays steady.
4. **File chooser:** (a) `chooser: true`, intercepted only inside that call, files only from the Upload folders.
5. **`back`:** (a) Chrome's rule is kept; agents navigate to the address instead.
6. **G2 (the trusted tools' focus/input gap): changed from the recommendation.** A trusted click or typing becomes one
   **blocking** action: it holds the visibility lock from the focus through the input and a short settle pause after it,
   so no other actor's capture or focus comes between. The user accepts that trusted actions and the browser are a
   little slower. Stage 0 picks the mechanism and measures the pause (starting near 500 ms).
In the chat the user first answered G1 "(a)" under Q6 and "measure first" under Q1; asked, the user chose measure, then
build. Push granted for the close-out, the Step 12 plan and this ruling.
**Why:** the user's ruling.
**Instead of:** G2 kept a known limit (the recommendation).
**By:** the user (ruled 2026-10-27; recorded by Claude)
