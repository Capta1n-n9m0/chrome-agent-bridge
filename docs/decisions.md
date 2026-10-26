# Decisions — chrome-agent-bridge

Newest first. Format and rules: [`docs-writing-guide.md`](docs-writing-guide.md#decisions).
Cite an entry by date + title. Closed steps' entries are in `docs/decisions-archive/` (index below).

**Earlier decisions** (before 2026-10-21) live where they were made: the design specs in
`docs/specs/` and the step plans in `docs/plans/`. When one matters again, restate it here
as a dated entry and point back.

## Open decisions

Step 11b (contract-level; the conservative option applies until the user rules at the gate; Stage 0 attacks them):
- **#292** 2026-10-26 · Step 11b: the rule set stays equal to the block list and fails closed — options: (a) per-call
  rules from the gate's own parsed list, fail closed with the existing `DISARMED` refusal (recommended, applied);
  (b) standing rules for the whole list (needs 0.4 (A)/(B)); (c) fail open when the API rejects (forbidden).
- **#293** 2026-10-26 · Step 11b: the bridge's answers when a hop is blocked stay as today — options: (a) the existing
  codes and texts, a blocked download hop recognised by `onErrorOccurred` `ERR_BLOCKED_BY_CLIENT` (recommended,
  applied); (b) a new `REDIRECT_BLOCKED` code; (c) `NAV_FAILED` with Chrome's text. Amended by #296 (the fallback
  dropped).
- **#295** 2026-10-26 · `newTab` stays uncovered until the user rules on opening it on `about:blank` — options: (a)
  open `about:blank`, install the rule, navigate (0 of 10 leaked; `tabCreated.url` = `about:blank`, two history
  entries) (recommended for security); (b) `newTab` as today, its first request escaping a blocked redirect, a known
  gap (applied, conservative).

Step 11's were ruled on 2026-10-26 (#288, #289, #290); the lists of earlier steps' open decisions, with their rulings,
are in the archive entries they cite and in git.

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
- 2026-10-26 · How agents are run from Step 11b on; #286 stands; the cleanup pass's proposals applied (#289) — this file (Log)
- 2026-10-26 · Step 11b: the permission and the rule's scope ruled; Step 11's follow-ups become its stage S0F (#290) — this file (Log)

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
- 2026-10-25 · Stage 0: who the folder rule protects against, and the broad-folder warning (#250) — `decisions-archive/step11.md`; changed by #288 (a home folder, or a folder of home folders, is refused as an Upload folder)
- 2026-10-25 · S2: the `paths` cap, the exact messages, and the folder-line rules (#257) — `decisions-archive/step11.md`
- 2026-10-25 · S2: the `file:` rule's edges (#259) — `decisions-archive/step11.md`; changed by #288 (`listTabs` rows and tab events of a `file:` tab drop `title` and `url` and carry `hidden`)
- 2026-10-26 · S5-liveB: the upload works on a background tab; a raw missing-file upload answers ok (#284) — `decisions-archive/step11.md`; changed by #288 (a missing file is an error in the extension too)
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

## Log

The current step's entries (Step 11b), newest first. Step 11's are in `decisions-archive/step11.md`.

### 2026-10-27 · S3b: a blocked download hop is recognised strictly within 300 ms; the caps warning's thresholds (#303)
**Decided:** S3b's two proposals (`…-steps/S3b.md` §5): a hop counts only for tab −1, `xmlhttprequest`, the own
initiator, `ERR_BLOCKED_BY_CLIENT` and a URL the call's own list blocks, within 300 ms of that call's rejected `fetch`
(only a rejected fetch waits); the options page warns on one call's rule count against the caps and on a regex over 119
characters, naming line numbers only. Two blocked downloads within the same 300 ms can both answer `DOMAIN_BLOCKED`
(fails safe). The verifier's open notes (`Date.now` rather than `performance.now()`; `HopWatch.blocked()` unused in
production) are left as notes for S5's cleanup. ~580 lines against ~400, accepted as one piece.
**Why:** the measured event fields; the event-versus-rejection order is not yet measured.
**Instead of:** a hit lasting the whole fetch, which made a 404 wait and could misname it (round 1's failure).
**Revisit if:** Run 17's RD-DL-HOP records the order or a latency near 300 ms; RD-CAPS-WARN disagrees with 119.
**By:** Claude

### 2026-10-26 · S3a: `back`/`forward` wait for their load while they hold rules; the rebuild narrows to block-list edits in S3b (#302)
**Decided:** S3a as built (`92252df`, `c9db926`; 494 lines against ~400, accepted as one piece): each DNR call bounded
at 5 s, `back`/`forward` (in `handlers/history.ts`, an accepted lane deviation) wait up to 10 s for their load only
while they hold rules, so with an empty list they behave exactly as before. S3a verifier's M2 — the keeper rebuilds on
every safety-setting change, so toggling the JavaScript switch or the Upload folders can, for a few milliseconds,
refuse an unrelated `navigate` `DISARMED` (fail closed) — is fixed in S3b, whose lane gains
`extension/src/safety-state.ts` for it: the rebuild runs only when the block list's stored value changed or the state
became unreadable. Recorded as unmeasured: the keeper assumes Chrome applies one extension's rule updates in the order
sent.
**Why:** a spurious refusal is safe but wrong; the narrowing keeps #292's "a list change rebuilds" exactly.
**Instead of:** leaving M2 as a documented limit.
**Revisit if:** Run 17's RD-BACK/RD-FWD rows show the tab not yet loading when `goBack`/`goForward` return, or a
client with a timeout under 10 s meets `TIMEOUT` on `back`/`forward` with a non-empty list.
**By:** Claude

### 2026-10-26 · S2: the keeper is accepted; it re-syncs when the last live call ends; S3a bounds DNR calls (#301)
**Decided:** S2's keeper (`e7bb081`, 682 lines against a ~500 cap, accepted as complete). Three things go to S3a,
which may edit the keeper for them: (a) after a rejected rebuild, the keeper retries a clear when the last live call
ends and is synced again if it succeeds (a successful update with no live call is the "rebuild that succeeds" of
#292), instead of staying unsynced until the next list edit or a worker restart (S2 verifier V3); (b) a time bound on
each DNR call, past which the call is refused and the timed-out add's ids are kept for later removal (V2); (c)
`back`/`forward` hold their tab rule until the load they start has settled, or S3a records why it cannot and Run 17
measures it. R1's missing test (a rejected install keeps the leftover rules) is added in S3a.
**Why:** (a) a failed update must not leave the bridge refusing navigations for an unbounded time when nothing is in
flight, and no security is lost (a call still needs a synced keeper to proceed); (b) a DNR call that never settles
would hang every covered call; (c) a rule removed before the hop it exists for does nothing.
**Instead of:** shipping S2's "unsynced until the next edit" (harsher than 0.5's intent); no bound.
**Revisit if:** Run 17 shows a rule outliving its call.
**By:** Claude

### 2026-10-26 · S1: a default-port pattern makes two regex rules; an over-long regex fails closed (#300)
**Decided:** a pattern with a default port (`host:443`, `host:80`) makes two short regex rules (with and without the
port, as the URL can carry it) instead of one alternation, each regex capped at 119 characters by a test; a host long
enough (about 80+ characters with a port or `*.`) to make a regex Chrome rejects leaves the covered call refused (fail
closed, #292), and S3b's options-page caps warning names that case. S3 or Run 17 records `isRegexSupported` for the
two `bank.example:443` regexes and one long host.
**Why:** S1's verifier found the single alternation too large for Chrome's per-regex memory cap (Latin-1, 2048 bytes,
read in Chromium's source), which would have refused every covered call while such a pattern was listed; the split
keeps the blocking identical (0 disagreements with `isUrlBlocked` in 7.5 M fuzzed pairs).
**Instead of:** #296 item 7's "one regex per pattern" (amended here); `requestDomains` for ported hosts (it ignores the
port, so it would over-block).
**Revisit if:** `isRegexSupported` disagrees with the 119-character bound on Chrome 156.
**By:** Claude

### 2026-10-26 · S0F-b: only a readable 200 is a file; one 5 s bound for the whole check (#299)
**Decided:** the pre-attach check (`upload-exists.ts`) counts a path as a file only on a 200 with a readable first
chunk; a reject, status 0 (a folder), any other status or error and the check's timeout all refuse `BAD_PARAMS`
naming `paths[i]` only; one 5 s bound covers every path of the call (the verifier found a per-path bound could outrun
the daemon's 30 s wait and attach after the client gave up). The stage's ~376 lines against a ~300 cap are accepted
(the excess is tests).
**Why:** fails closed on anything not proven a file; no path leaves the extension.
**Instead of:** classifying by outcome with an allow on unknown statuses; a per-path bound.
**Revisit if:** Run 17's F-RAW rows disagree, or a real file under an allowed folder is refused.
**By:** Claude

### 2026-10-26 · S0F-a: the home check is one shared predicate, slightly stricter than Stage 0's table (#298)
**Decided:** S0F-a's proposals: one predicate in `extension/src/upload-paths.ts` serves the options page and the gate,
and refuses a home-folder parent itself too (for example `/var/home`), not only the folders inside it; the
`listTabs` safety decision hides a `file:` tab as the tab rows and events do; the builder's edit of
`recipes/test/s11-rules.test.ts` (the changed options texts; Run 16's recorded texts still checked byte for byte) and
the fixer's correction of one `docs/setup.md` sentence the build made false are accepted as lane deviations.
**Why:** stricter is the safe side of an Upload-folder rule; the two edits only keep tests and docs true.
**Instead of:** Stage 0's narrower table (a parent like `/var/home` allowed as a folder).
**Revisit if:** a real Upload folder of the user's is refused by it.
**By:** Claude

### 2026-10-26 · Stage 0's incident: a stray `chrome.exe --version` reached the user's Chrome; never run Chrome without an own profile (#297)
**Decided:** a Stage 0 measurer ran `chrome.exe --version` once with no `--user-data-dir`; Windows handed it to the
user's running Chrome ("Opening in existing browser session."), which may have opened a window or tab there. No
evidence depends on it and nothing else reached that Chrome. From now on no agent runs `chrome.exe` on this machine
without its own `--user-data-dir`, not even for `--version` (read it from CDP `Browser.getVersion` or the install
folder); the rule is a `recipes/CLAUDE.md` gotcha and #294 stands with it.
**Why:** #294's Revisit-if ("disturbs the user's running Chrome in any way") was met by a command outside the method,
not by the scratch instance itself, which stayed separate (`Stage0.md` §7, `Stage0-verifier.md` M4).
**Instead of:** dropping the scratch-profile method (the instance itself never touched the user's Chrome).
**Revisit if:** any other path from an agent to the user's Chrome shows up.
**By:** Claude (to be reported to the user)

### 2026-10-26 · Stage 0's reconciled proposals adopted; S0F split; the download half is built (#296)
**Decided:** `Stage0.md` §6 items 2–11, as written there: download rules typed `resourceTypes:["xmlhttprequest"]`
with `tabIds:[-1]` and the own initiator, guarded by a test (an untyped rule cut the offscreen socket, measured); 0.6's
guessed-error fallback dropped (the worker's blocked hop is seen by `onErrorOccurred`, read before `ingest`);
`navigate`'s post-check unchanged (`tab.url` reads the blocked URL); a disarm does not lift a running call's rules
(only the call's end and the start-up clear do); install keyed on the method class and run once per call; a rejected
rebuild leaves the previous rules and refuses the reply; an empty list makes no API call; Chrome's text never reaches
the wire; S1's translation per item 7 (plain hosts by canonical `requestDomains`, IP literals, `*.` and ports by
anchored regex), the caps read at run time from `MAX_NUMBER_OF_SESSION_RULES`/`MAX_NUMBER_OF_REGEX_RULES` (no
`minimum_chrome_version` change), past the cap fail closed and the options page warns; `back`/`forward` carry the
tab rule; Run 17's amendments (item 9); S0F by check (i) from the worker, the home predicate with ASCII case folding
and the 8.3/macOS aliases, `file:` rows hidden as `"blocked"`, split into **S0F-a** (home, `hidden`, the tool
description) and **S0F-b** (the missing-file check); the plan-side notes of item 11. Amends #291, #292, #293 where they
differ.
**Why:** each is a measurement (`Stage0.md` §4) or makes a rule stricter within 0.4 (C); none changes an answer on a
page with no redirect.
**Instead of:** the phase doc's unmeasured guesses (an untyped download rule would have cut the bridge's own socket).
**Revisit if:** S1–S3's tests or Run 17 contradict a measurement.
**By:** Claude

### 2026-10-26 · `newTab` stays uncovered until the user rules on opening it on `about:blank` (#295)
**Decided (contract-level, for user review):** Stage 0 measured that `tabs.create({url})` sends its first request
before any rule installed on the new tab's id can act (10 of 10; verifier 5 of 5), while opening `about:blank`,
installing the rule, then navigating sent 0 of 10 — at the cost of `tabCreated.url` reading `about:blank` and a second
history entry. That changes an event and the tab's history, so the conservative option applies: Step 11b builds
`newTab` exactly as today (its first request still escapes a blocked redirect, recorded as a known gap, RD-2 a RECORD
row), and the `about:blank` form is listed under Open decisions.
**Why:** `docs/agent-rules.md` §4's conservative option: every existing tool behaving identically, security no weaker
than today; #140 named only `navigate` and `downloadStart`, `newTab` was 0.2's proposal.
**Instead of:** building the `about:blank` form now (an event and history change the user has not seen).
**Revisit if:** the user rules for it; then it is one small stage after S3 (the rule keeper already covers a tab id).
**By:** Claude (conservative option applied)

### 2026-10-26 · Stage 0 measures DNR in a separate scratch Chrome on a temporary profile (#294)
**Decided:** #290's four checks and 0.2's unconfirmed DNR facts are measured on a scratch test extension loaded into a
**separate Chrome instance started on a fresh temporary `--user-data-dir`** outside the repo (installed Chrome, or
Chrome for Testing if the installed build will not load an unpacked extension that way), driven over its own CDP
connection, with fixture servers on 127.0.0.1 only. It is closed by CDP `Browser.close` or its own window, never by
killing `chrome.exe`; the temporary profile is deleted afterwards. The user's profile, its extensions and its tabs are
not touched, so no grant is needed (the phase doc's Human gates name only the user's profile).
**Why:** #290 asks for measurements, not reading; the phase doc forbids loading the scratch extension into the user's
profile without a grant; a temporary profile is neither the user's profile nor a restart of their Chrome.
**Instead of:** loading the scratch extension into the user's profile (needs a grant); deferring (1)–(4) to Run 17's
RECORD rows (too late: (1) or (2) failing must stop the step before any code).
**Revisit if:** a second Chrome instance disturbs the user's running Chrome in any way, or the measurement cannot be
made there; then the step agent escalates and the session agent decides.
**By:** Claude

### 2026-10-26 · Step 11b: the bridge's answers when a hop is blocked stay as today (#293)
**Decided (proposed, contract-level, for user review):** phase doc 0.6. `newTab` keeps today's answer (Stage 0
records it); `navigate` answers `DOMAIN_BLOCKED` with an existing block message and no `data` (if `tab.url` after a
blocked main frame is not the blocked URL, the post-check uses the navigation's committed or attempted URL);
`downloadStart` answers R14-5c's exact text when its own rules blocked the hop, recognised by a `webRequest.onErrorOccurred`
`net::ERR_BLOCKED_BY_CLIENT` for an out-of-tab request whose URL the call's list blocks; any other failure keeps
today's answer.
**Why:** no new code, method or message: every test, row and client line stays valid.
**Instead of:** a `REDIRECT_BLOCKED` code (a wire change for no new information); `NAV_FAILED` with Chrome's raw text.
**Revisit if:** Stage 0 shows the worker's own requests do not reach its `webRequest` (then the flagged fallback of
0.6 is proposed), or `tab.url` cannot name the blocked URL.
**By:** Claude (proposed; the conservative option applied)

### 2026-10-26 · Step 11b: the rule set stays equal to the block list and fails closed (#292)
**Decided (proposed, contract-level, for user review):** phase doc 0.5. The rules are a pure function of the
`BlockList` the call's own gate read produced; each covered call (`navigate`, `newTab`, `downloadStart`, 0.2) installs
its rules before its first side effect and removes them after its post-check on every path; a list change rebuilds
every live call's rules atomically; the worker clears all session rules at start before serving a call; disarm
clears them; an update that rejects refuses the call with the existing `stateUnreadableRefusal()`, and a failed
rebuild aborts live covered calls and refuses new ones until a rebuild succeeds. `newTab` with a URL is covered as
`navigate` is (0.2).
**Why:** one source of truth with the gate, no stale rule, no new code; fail closed as an unreadable state does (#139).
**Instead of:** standing rules for the whole list (that is 0.4 (A)/(B), not ruled); a cached copy of the list (two
sources); failing open.
**Revisit if:** Stage 0's measurements show per-call install cannot be in force before the navigation starts (#290
check (2)), or the caps make realistic lists fail closed.
**By:** Claude (proposed; the conservative option applied)

### 2026-10-26 · Step 11b: the build-level proposals of the phase doc are adopted for the audit (#291)
**Decided (proposed):** phase doc 0.1 (stage order Stage 0 → S0F → S1 → S2 → S3 → S4 slices → S5, nothing in
parallel), 0.2's shape (session rules only), 0.7 (no rule for own pages or `file:`; Chrome's refusal confirmed by
Stage 0 and recorded by RD-7/RD-8), 0.8 (no rule, filter, URL or rejection text logged; at most one counts-only log
line), 0.9 (what is out of scope), 0.10 (Run 17's rows) and 0.11's how (one shared home predicate in both callers;
the missing-file check chosen by Stage 0's measurement, the pre-attach check preferred; `file:` rows hidden with the
blocked reason unless Stage 0 shows a client must tell them apart).
**Why:** recorded before Stage 0 so the audit can attack them (kickoff §4).
**Instead of:** deciding after the audit, which would let the audit check nothing.
**Revisit if:** Stage 0 finds a defect in any of them; the amended form is then recorded as a new entry.
**By:** Claude

### 2026-10-26 · Step 11b: the permission and the rule's scope ruled; Step 11's follow-ups become its stage S0F (#290)
**Decided (user):** 0.3 (A) `declarativeNetRequestWithHostAccess`; 0.4 (C) rules only for the requests of a bridge
`navigate`/`newTab`/`downloadStart` in flight, so the human's own browsing is unchanged. The user asked for care on
whether DNR does this job under MV3: Stage 0 measures, before any code, that (1) a session rule with `tabIds` and
`resourceTypes: ["main_frame"]` blocks a redirect hop of a `navigate` started by `chrome.tabs.update`; (2) the rule is
in force when `updateSessionRules` resolves, before the navigation starts; (3) whether a rule matches the service
worker's own `fetch` (the download half; 0.4's last paragraph stands: if not, recorded, not a STOP); (4) the
rule-count and quota limits against the largest block list the matcher accepts. A failure of (1) or (2) is a STOP for
the user. Step 11's three code follow-ups (#288 items 3b, 3c, 3d) run first, as stage **S0F**, after Stage 0 and
before S1, the way #229's follow-ups ran as Step 11's S1.
**Why:** the user's rulings at Step 11's gate.
**Instead of:** 0.3 (B) (an install warning, nothing gained); 0.4 (A) the profile-wide firewall; the follow-ups as a
separate step.
**Revisit if:** Stage 0 fails (1) or (2), or the follow-ups exceed one stage's size (then split per agent-rules §7).
**By:** user (the rulings); Claude (the Stage 0 checks and the stage placement)

### 2026-10-26 · How agents are run from Step 11b on; #286 stands; the cleanup pass's proposals applied (#289)
**Decided (user):** (a) models by risk: Opus builds and fixes contract and safety code and runs every verifier; Sonnet
builds and fixes recipes, fixtures and docs and runs the live runners. (b) **Every agent runs at medium effort,
Opus and Sonnet alike, and every brief passes `effort` explicitly** (three Step 11 verifiers ran at "low" when none
was passed). (c) #286 is permanent: a step agent never ends its turn while a child runs (it waits on the child's
report file with a bounded wait). (d) The 27 proposals of `docs/cleanup/2026-10-26.md` are applied at their
recommendations; where the report gave none, Claude chose: D6 a decision number alone is enough where the sentence
states the decision; P2 two fix rounds, a third only by an Opus fixer; P8 report caps 1,500 words for builders, fixers
and runners, 2,500 for verifiers; G3 only the title forms the record shows are kept; S3 the phase doc's As built is
put in stage order.
**Why:** the lean-procedures trial (#230's Revisit-if met): Sonnet halved the cost; its slices drew more first-check
findings but closed within two rounds, and none were contract code.
**Instead of:** all-Sonnet builders (#270 as written); high effort for verifiers.
**Revisit if:** a medium-effort verifier misses a finding a later stage or live run catches.
**By:** user (a)–(c) and the instruction to apply (d); Claude (d)'s unresolved choices
