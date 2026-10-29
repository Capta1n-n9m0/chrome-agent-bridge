# Decisions — chrome-agent-bridge

Newest first. Format and rules: [`docs-writing-guide.md`](docs-writing-guide.md#decisions).
Cite an entry by date + title. Closed steps' entries are in `docs/decisions-archive/` (index below).

**Earlier decisions** (before 2026-10-21) live where they were made: the design specs in
`docs/specs/` and the step plans in `docs/plans/`. When one matters again, restate it here
as a dated entry and point back.

## Open decisions

None. The user ruled Step 12's gate on 2026-10-29 (#374, `decisions-archive/step12.md`); every item listed here
before was settled by it. Step 13's scope is ruled by the same entry (`docs/plans/2026-10-29-step13-phase-f-followups.md`).

For Step 13's gate (contract-level; the run goes on with the conservative option, recorded in the Log):
- **#385, G1's shape.** Stage 0 replaced #376: the extension joins Chrome's navigation-target event and sends the real
  opener in `tabCreated.openerTabId`; with no join it sends none and nothing is granted. No wire shape changes, but the
  field's meaning does. Options: keep #385 (recommended), or (A) a new `sourceTabId` field with a hello feature.
- **#389, the chooser text.** Option (a), the same code with its own message (recommended); (b) a new code.

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
- 2026-10-27 · The user rules #318 and the cleanup proposals; Step 11b closes (#320) — three fix rounds per stage, the size-cap overrun, wave prompts in `handoffs.md`, the read-only roles; `decisions-archive/step11b.md`; `agent-rules.md` §6, §7
- 2026-10-27 · The user rules Step 12's scope (G12-0) (#321) — `decisions-archive/step12.md`
- 2026-10-29 · The user rules Step 12's gate; Step 12 closes (#374) — `webNavigation` granted; no local path or name in new committed docs (`docs-writing-guide.md`); Step 13 = the Phase F follow-ups and Run 19's re-measurement; then a minimal Phase G for the user's own use; `decisions-archive/step12.md`

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
- 2026-10-27 · Run 17's STOP predates Step 11b: Chrome's `back` skips pages with no user activation … (#308) — a bridge `back`/`forward` reaches only pages a human or an activating call acted on; `decisions-archive/step11b.md`

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
| [`step12.md`](decisions-archive/step12.md) | Step 12: Phase F, ergonomics | #321–#374 | 54 | 2026-10-27 → 2026-10-29 |

## Log

The current step's entries (Step 13, numbered after #374), newest first. Step 12's (#321–#374) are in
`decisions-archive/step12.md`, Step 11b's in `decisions-archive/step11b.md`.

### 2026-10-29 · S2: a page's `toJSON` hook still shapes `description`; left as it was, a follow-up (#397)
**Decided:** no change in Step 13. The text form is built in the page by `SERIALIZER_SRC`, which #386 keeps
byte-identical; the behaviour predates S2. **Why:** fixing it changes the serialiser itself, outside #374's scope.
**Instead of:** editing `SERIALIZER_SRC` now. **Revisit if:** the user wants `description` hook-proof; then a later step.
**By:** Claude

### 2026-10-29 · S2: page `toJSON` hooks never reach `value`; `__mark` present exactly when a mark was asked (#396)
**Decided:** #386 narrowed: the wrapper's own JSON writer calls no page `toJSON`, so a hooked object no longer falls
back but keeps its real value; the envelope is accepted only with its own keys and types, and with `__mark` exactly when
the call asked for a mark; only a page that replaces a global such as `JSON.stringify` gets today's fallback. **Why:**
S2's verifier found a page `Array.prototype.toJSON` silently changing `value`, a forged `__mark` reaching a plain reply
and a dropped `__mark` leaving a mark in the page (`S2-verifier.md` F1–F3), all fixed in round 1. **Instead of:** the
builder's acceptance of a forged envelope. **Revisit if:** a page hook passes the shape check with a wrong value.
**By:** Claude

### 2026-10-29 · S1: mutants and pre-slice runs never touch the main tree (#395)
**Decided:** a verifier or builder proves a test red on the pre-slice code, or runs a mutant, only in a scratch git
worktree with its own `npm ci` (#220) or an in-memory copy, never by reverting, moving or editing files in the main
tree. **Why:** S1's first verifier copied the stage's files out and reverted them in the main tree; the session's
terminal closed mid-run and the work was missing from the tree until the session agent copied it back (journal,
10:31Z). **Instead of:** "revert, run, restore" in place. **Revisit if:** never; it binds every later stage brief.
**By:** Claude

### 2026-10-29 · S1: a navigation target for a tab Chrome gave no `openerTabId` is ignored (#394)
**Decided:** the join acts only on a tab whose `tabs.onCreated` carried an `openerTabId`; a navigation-target event for
any other tab is dropped. **Why:** such a tab is sent at once under #385 and nothing waits for a join; ignoring the
event keeps today's behaviour for it. **Instead of:** granting from a late navigation target. **Revisit if:** Run 20
finds a popup Chrome creates without `openerTabId`. **By:** Claude (the builder's, endorsed by S1's step agent)

#384–#393 record Stage 0's attack on them (`docs/plans/2026-10-29-step13-phase-f-followups-steps/Stage0.md` §5,
commit `8f23ac9`, verifier PASS-with-notes); the full reasoning is there.

### 2026-10-29 · Stage 0: adding `webNavigation` is not a G13-2 matter (#393)
**Decided:** S1's manifest change needs only the usual reload. **Why:** measured in a scratch Chrome: the warning list
and the card's permissions are unchanged and the extension stays enabled, with and without the debugging flag.
**Instead of:** asking the user first. **Revisit if:** after S1 the user's card shows a disabled state or a new
permission line. **By:** Claude

### 2026-10-29 · Stage 0: #383 kept; Run 19's unmeasured leftovers named in Follow-ups (#392)
**Decided:** as Stage0.md §5 (#383 kept). **By:** Claude

### 2026-10-29 · Stage 0: Run 20 at §4.28 with seven row changes before the sheet (#391)
**Decided:** #382 amended as Stage0.md §5: the DevTools rows expect `ok` and read a control independent of the bridge's
answer before the call; POP-OTHER gains a third-client leg; CON-NOTEA is the documented class-name line plus the
blocked-frame leg; ARGS-ORDER's discriminating leg is the SDK's; R20-0 also proves the permission; G2-1 gains an
uncovered-window control; CHOOSE-REFUSE-DIS tries an enabled-then-disabled input, else RECORD. Run 19's chooser judges
are not reused. **Why:** Run 19's DevTools "control" was the refusal code itself; the MCP prints `description`, already
in page order. **Instead of:** the seed rows as written. **Revisit if:** the DevTools control cannot be read on the
user's Chrome; then those rows are RECORD. **By:** Claude

### 2026-10-29 · Stage 0: the settle pause's `.then(release, release)` kept, its reason corrected (#390)
**Decided:** #381 amended: a rejecting injected `sleep` today is an unhandled rejection the daemon treats as fatal, not a
lock held to disconnect; production injects none. S4's test asserts the lock is free and no unhandled rejection.
**By:** Claude

### 2026-10-29 · Stage 0: the second-chooser refusal keeps `DEBUGGER_DEVTOOLS` with its own fixed text (#389)
**Decided:** option (a) of #380. A dated spec §10 note first (the spec quotes today's text); every other path's text
byte-identical; T4.1 adds the MCP check (bare message, `isError: true`). **Why:** the MCP shows only the message under
either option, so a new code would reach no agent without more MCP work and would move every count; an old extension's
answer differs only in text. **Instead of:** (b) a new code. **Revisit if:** the user wants the two cases told apart by
code. **By:** Claude (Stage 0 decides, per the phase doc's 0.6)

### 2026-10-29 · Stage 0: two pinned tests outside S3b's files join its lane (#388)
**Decided:** #379 amended: `mcp/test/s12-upload-chooser.test.ts` and `recipes/test/s12-forms-b.test.ts` pin the old
marker and change in S3b's commit (Run 19's helper itself is not edited); the marker is the first line and counts the
rows cut. **Why:** `npm test` includes `recipes/test`; #379's Revisit-if met. **By:** Claude

### 2026-10-29 · Stage 0: CON-NOTEA stays a documented limit; S3a is not run (#387)
**Decided:** #378 resolved "no". The tool-description sentence (an object logged before the read shows its class name
only) is product code and goes to S3b; `docs/setup.md` to S6. **Why:** measured: `Runtime.getProperties` runs an Error
subclass's `message` getter on every read under every option, and a Proxy needs a second call, so two of the four
"cheap" conditions fail. **Instead of:** S3a with a skip list. **Revisit if:** the user accepts page getters of the
kind the replay already runs. **By:** Claude (mechanical under #374 item 5)

### 2026-10-29 · Stage 0: the envelope crosses as one JSON string from a wrapper, its shape checked on receipt (#386)
**Decided:** #377 amended: the serialiser source stays byte-identical; a closure-free wrapper returns `JSON.stringify`
of the envelope, parsed inside `serializerCall`; a value without the envelope's own keys and types falls back as today
(a page's `toJSON` hook controls the string). Paths: `evaluate`, `args`, `asRef`, the mark sweep; `evaluateSaveStart`
is not one. The fake CDP sorts keys under `returnByValue` first, so S2's mutant can fail. **Why:** measured page order
6 of 6; the fake did not sort, so today's "page order" test could not fail. **By:** Claude

### 2026-10-29 · Stage 0: G1 by a join in the extension — `tabCreated.openerTabId` is the navigation source; no join, no grant (#385)
**Decided:** #376 replaced. The worker holds a `tabCreated` whose tab has an `openerTabId` until that tab's
`onCreatedNavigationTarget` arrives (either order) or 250 ms pass; joined, it sends `openerTabId` = `sourceTabId`; not
joined, it sends no `openerTabId`, so the daemon grants nothing. No new field, no late event, no hello feature, no
daemon change; a dated spec §10 note says what the field now means. Ids only, no URL, no log. **Why:** measured in a
scratch Chrome: `tabs.onCreated` comes first 60 of 60, the join follows within 0.6 ms, `sourceTabId` is right 60 of 60,
while Chrome's `openerTabId` names the window's active tab for a background opener 25 of 30, so the phase doc's
fallback to it would lease the popup to the wrong client (a STOP line). **Instead of:** (A) a new `sourceTabId` field
with a hello feature (a protocol, hello and daemon change); (B) the fallback; (C) a late event. **Revisit if:** Run 20
sees an unjoined popup, or a tab with an opener and no navigation target turns up. **By:** Claude, **for the user's
review at the gate**: the field's meaning changes (Ctrl+click and middle-click tabs, and a background opener's popup, go
to the opener's holder instead of the active tab's; an unjoined tab no longer grants). Built as the conservative option:
no grant without a join is stricter than today.

### 2026-10-29 · Stage 0: the stages run one at a time in the main tree; S3a dropped (#384)
**Decided:** #375 amended: S1 → S2 → S3b → S4 → S5 → S6, sequential; S5 as sheet, helpers, drivers A/B/C, three live
slices (A: R20-0, POP, ARGS, CON; B: CHOOSE, G2; C: the DevTools rows alone), the record. **Why:** "disjoint" was false
and two stages in one tree break the per-stage exit checks. **Instead of:** parallel lanes. **By:** Claude

#375–#383 are the phase doc's proposals (`docs/plans/2026-10-29-step13-phase-f-followups.md` § Decisions 0.1–0.9),
numbered at kickoff so Stage 0 can attack them. Each holds as written in that section until Stage 0 or a later entry
changes it; the full text is there, not here.

### 2026-10-29 · Not in Step 13: the Phase F items left out; Phase G after it stays minimal (#383)
**Decided:** as phase doc § 0.9. **Why:** #374 items 11 and 1–7 bound the step. **Instead of:** a larger step.
**Revisit if:** the user widens the scope. **By:** Claude (proposed; Stage 0 attacks it)

### 2026-10-29 · Run 20: §4.28, `R20-…` ids, old rows never edited, re-measured rows name their R19 row (#382)
**Decided:** as phase doc § 0.8 (seed rows; Stage 0 checks the section number is free). **Why:** #373's re-measurement
list and the new features need one live run; old evidence stays as it was. **Instead of:** editing R19 rows.
**Revisit if:** Stage 0 finds §4.28 taken or a seed row unmeasurable. **By:** Claude (proposed; Stage 0 attacks it)

### 2026-10-29 · The settle pause releases the lock on rejection too, if S4 has room (#381)
**Decided:** as phase doc § 0.7, `.then(release, release)` with a failing test first. **Why:** a rejecting `sleep`
would hold the visibility lock until disconnect (#354). **Instead of:** leaving it in Follow-ups. **Revisit if:** S4
exceeds its cap. **By:** Claude (proposed; Stage 0 attacks it)

### 2026-10-29 · The second-chooser refusal: own message under `DEBUGGER_DEVTOOLS` (a) unless Stage 0 says (b) (#380)
**Decided:** as phase doc § 0.6, option (a) recommended; Stage 0 records the final choice with its reason. **Why:**
#374 item 7; (a) changes one text and no count. **Instead of:** (b) a new code. **Revisit if:** Stage 0 shows the
code would be untrue on that path. **By:** Claude (proposed; Stage 0 decides)

### 2026-10-29 · The console texts: newest lines kept with a cut marker; "only other-site frames are not read" (#379)
**Decided:** as phase doc § 0.5. **Why:** #374 items 6 and 7. **Instead of:** keeping the oldest lines. **Revisit
if:** a pinned test outside the named files depends on the old marker. **By:** Claude (proposed; Stage 0 attacks it)

### 2026-10-29 · CON-NOTEA: one `Runtime.getProperties` read if Stage 0 measures it cheap, else a documented limit (#378)
**Decided:** as phase doc § 0.4, with its four "cheap" conditions. **Why:** #374 item 5. **Instead of:** reading
through page code (forbidden). **Revisit if:** Stage 0's measurement. **By:** Claude (proposed; Stage 0 measures)

### 2026-10-29 · `evaluate`'s value keeps the page's key order: the serialiser's envelope crosses as a JSON string (#377)
**Decided:** as phase doc § 0.3; reply shape unchanged; every serialiser path covered. **Why:** #374 item 4; Chrome
sorts keys of a `returnByValue` object. **Instead of:** re-sorting on receipt; documenting it. **Revisit if:** Stage 0
finds an envelope value a JSON string changes. **By:** Claude (proposed; Stage 0 attacks it)

### 2026-10-29 · G1: the popup lease from `webNavigation`'s `sourceTabId`, as one field or a late event (#376)
**Decided:** as phase doc § 0.2 (the Stage0.md §6 draft; the daemon grants only to the source tab's holder; no new
router method; the manifest gains exactly `webNavigation`). **Why:** #374 item 1 granted the permission; #337 measured
`sourceTabId` names the opener. **Instead of:** leaving #226's limit. **Revisit if:** Stage 0 cannot join the event in
a usable bound and the late event fails too. **By:** Claude (proposed; the permission by the user, #374)

### 2026-10-29 · Step 13's order and slices: Stage 0 → S1 → S2/S3a/S3b/S4 → S5 Run 20 → S6 (#375)
**Decided:** as phase doc § 0.1; S2, S3b and S4 may run beside S1 once S1's spec note is committed; live slices run
alone. **Why:** G1 changes the manifest, which every later reload and live row needs. **Instead of:** a strict
sequence. **Revisit if:** two lanes touch one file. **By:** Claude (proposed; Stage 0 attacks it)
