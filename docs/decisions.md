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
- 2026-10-25 · Stage 0: uploads need Chrome's file access, and the bridge never opens or reads `file:` pages (#245) —
  **the one that matters most**: the gate refuses `file:` pages (a behaviour change for every method), and the new
  human gate G11-3 (the "Allow access to file URLs" toggle; Run 16 found it on, so it was not needed).
- 2026-10-25 · Stage 0: a `webkitdirectory` input is refused; `files` is the count Chrome accepted (#247) — the
  meaning of `files`.
- 2026-10-25 · Stage 0: who the folder rule protects against, and the broad-folder warning (#250) — warn or refuse a
  home folder.
- 2026-10-25 · S1: the marked set is the `saveTo` value refusals and the cap; the save leg's breakdowns keep the
  prefix (#254) — which wire messages lose the prefix.
- 2026-10-25 · S2: the `paths` cap, the exact messages, and the folder-line rules (#257) — the refusal texts.
- 2026-10-25 · S2: the `file:` rule's edges (#259) — `file:` tabs still listed with their URL.
- 2026-10-25 · S4: `prepareUpload` joins the `@bridge/sdk/download` subpath (#261) — an additive SDK export.
- 2026-10-25 · S4: the client line for `UPLOAD_REFUSED` names both causes (#263) — with #257's texts; wording #264.
- 2026-10-25 · S3: the failure-path unmark runs without the safety gate (#266) — safety-side.
- 2026-10-25 · S3: the upload's wire texts and its 15 s CDP bound (#268) — with #257.
- 2026-10-26 · The user's Chrome profile name reached a committed evidence file; redacted at the tip, history for the user (#283) — **before any push**.
- 2026-10-26 · S5-liveB: the upload works on a background tab; UP-6/UP-6B's banner FAIL is not product evidence; a raw missing-file upload answers ok (#284) — UP-RAW.
- 2026-10-25 · Lean procedures: rules by pointer, package CLAUDE.md files, risk-tiered models (#230) — its Revisit-if is met in count: the trial (`docs/plans/2026-10-25-lean-procedures.md` § Trial, Results) shows more first-check findings on Sonnet-built slices (5 MAJOR vs 0), at about half the tokens; keep #270 or change it.
- Step 11's gate items (pointers, no new ruling): S5.5 and part of S5.6 failed for liveA (#282); re-measure UP-OPT,
  UP-RACE-A, UP-DEVT before the gate or not (#285); the push G11-1, with #283 — the phase doc § As built, Gate checklist.

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
- 2026-10-25 · Builders, fixers and live runners run Sonnet at medium effort from S5 on (#270) — this file (Log)
- 2026-10-25 · S5 is split into seven slices; the stopped prep is salvaged per slice (#271) — this file (Log); its rule for small iterations is in `agent-rules.md` §7
- 2026-10-26 · Step agents never end their turn on a running child; commits carry the verifier's verdict (#286) — this file (Log); `agent-rules.md` §8, §10

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

### 2026-10-26 · S6 accepted; Step 11 stops at the gate (#287)
**Decided:** S6 (`bd755aa`, verifier PASS-with-notes after two Sonnet fix rounds) is accepted: `docs/setup.md`
(Uploading files; Upload folders; the `file:` refusal; 24 tools; 25 quoted texts byte-identical to the code),
`README.md`, `recipes/README.md`, the roadmap. The session agent applied `S6-claude-md-proposals.md` to the package
`CLAUDE.md` files (placed by #232; `extension/CLAUDE.md` kept within its budget by tightening three bullets).
Step 11 is **built and documented but not closed**: the gate stops on S5.5 and S5.6 (part) for liveA (#282) and waits
for the open decisions. One code item is carried to the next code stage: `browser_upload_file`'s description gains
the background-tab sentence Run 16 UP-1 allows (#262, #284), re-baselining that schema entry and setup.md's quote.
**Why:** the phase doc's gate checklist (§ As built) and STOP rules.
**Instead of:** closing Step 11 with failed checks.
**Revisit if:** the user rules the gate items.
**By:** Claude

### 2026-10-26 · Step agents never end their turn on a running child; commits carry the verifier's verdict (#286)
**Decided:** `docs/agent-rules.md` §8: a step agent never ends its turn while a child agent runs (it waits on the
child's report file with a bounded wait if the tool started the child in the background); a child kills any shell
command it left hanging. §10: the builder commits after the verifier's verdict so the message carries it.
**Why:** measured in Step 11: S5-liveA's first step agent ended its turn and its runner's hand-back went past it (a
fresh agent had to resume); S6 and S5-record saw the Agent tool start children in the background although briefs
asked foreground; an orphan `python -` from a fixer's mistyped heredoc spun ~1.5k CPU-seconds; S1–S4's commits said
"verifier: pending" (journal trial note, 19:02Z). Not changed, for the user: briefs pass no `effort` for Opus
verifiers, and three verifiers reported running at "low".
**Instead of:** ending the turn and relying on re-invocation (#225's revival still covers a lost hand-back).
**Revisit if:** the harness re-invokes a parent on a child's hand-back reliably.
**By:** Claude (process; for user review with the lean-procedures trial)

### 2026-10-26 · S5 closes: Run 16 stands as recorded; UP-OPT keeps its FAIL with no cause stated (#285)
**Decided:** Run 16 (`docs/e2e-test-plan.md` §5, `4071287`; verifier PASS-with-notes) stands: 30 rows, PASS 19 / FAIL 3
/ NOT MEASURED 3 / RECORD 4, plus UP-LOGS (liveA) split; UP-CLICK not run (#251). S5.1–S5.4 and S5.7 held over the
whole run; S5.5 failed for liveA and S5.6 failed in part for liveA (#282), which stop the gate for the user. UP-OPT
(6061 ms against the 5000 ms bound) keeps its FAIL with no cause stated — nothing in the record says why; UP-6/UP-6B
are ruled by #284. UP-RACE-A (no per-call times) and UP-DEVT (DevTools never proven open) are offered to the user as
re-registered rows for a later wave, not run now. SW-2 closed the ~1.5 s capture question (#282); no S5b.
**Why:** the whole-run verifier; the tally differences (liveB ledger 11 vs record 10 PASS; UP-0 (B) counted from CHECK
lines) are written into the section, never smoothed.
**Instead of:** a cause guessed for UP-OPT; re-running the race rows inside Step 11.
**Revisit if:** the user wants UP-OPT, UP-RACE-A or UP-DEVT re-measured before the gate.
**By:** Claude

### 2026-10-26 · S5-liveB: the upload works on a background tab; UP-6/UP-6B's banner FAIL is not product evidence; a raw missing-file upload answers ok (#284)
**Decided:** liveB's record stands (`S5-liveB.md`; verifier PASS-with-notes; S5.2–S5.6 hold for liveB; one run, exit
0, no STOP): PASS UP-1…UP-5, UP-8 (CSP), UP-9 (junction refused), UP-PATCH, UP-TWICE, UP-7J, UP-RESTORE, UP-LOGS;
FAIL UP-6B (its five refusal clauses pass; only the banner clause fails); RECORD UP-RAW, UP-NAV, UP-STALE; NOT
MEASURED UP-DEVT, UP-RACE-A, UP-RACE-B. Every upload row judged by the page reporter's hash; every refusal left 0
files; every final mark count 0. **UP-1, read off 0.6's table: the page received the file on a background tab — no
focus, no proposed decision**; the tool description may now say so (#262's Revisit-if; S6). UP-6 (liveA) and UP-6B
keep their FAIL as recorded, but no product defect is filed: the banner check cannot tell the product's attach from
the wave's own page reads, which also attach the debugger inside its sampling window (verifier F1). **UP-RAW:** a raw
`uploadFiles` (no SDK preflight) of a path inside an allowed folder whose file does not exist answered `ok`, and the
page holds one file — the extension cannot see the disk, so only the SDK preflight refuses a missing file; listed for
the user as a contract question (whether the extension should refuse, e.g. by Chrome's answer, or the limit stands
beside 0.4's "a raw client can skip the real-path step").
**Why:** the verifier's findings F1–F4; a failed row is recorded, never retuned; a row whose check cannot
discriminate is not evidence of a defect.
**Instead of:** filing UP-6 as a product defect; re-running UP-6B with a different banner check (a changed pass rule).
**Revisit if:** a banner check that excludes the wave's own attaches is written as a new, pre-registered row.
**By:** Claude (UP-RAW for user review, listed under Open decisions)

### 2026-10-26 · The user's Chrome profile name reached a committed evidence file; redacted at the tip, history for the user (#283)
**Decided:** line 1 of `…-steps/S5-liveB-console.txt`, committed in `262619f` (not pushed), was a DevTools window title
carrying the Chrome profile's display name. The session agent replaced that line with a redaction note in the next
commit; no other tracked file holds it (`git grep`, 0). The history still holds it in `262619f`: before any push
(G11-1), the user chooses between rewriting the unpushed history (a local rewrite of Step 11's unpushed commits) and
pushing with the redaction commit only. Live runners' console captures drop window-title lines from now on (S6/the
next wave's helpers).
**Why:** the repo is public and evidence never shows anything from the user's profile (agent-rules §2); the phase
doc's STOP rules list a title in committed evidence as a gate stop. Rewriting history is the user's (agent-rules §3).
**Instead of:** rewriting history now without the user; leaving the line at the tip.
**Revisit if:** — .
**By:** Claude (the redaction); user (the history, at G11-1)

### 2026-10-26 · S5-liveA closes with S5.5 and part of S5.6 failed as recorded; helper fixes before liveB (#282)
**Decided:** liveA's record stands (both runs; `S5-liveA.md` §3): PASS UP-L1, UP-0, UP-7 (a–c), SAVE-REFUSE-R (SDK and
MCP), SW-2 measured, UP-RESTORE (run 2, all four equal); FAIL UP-6 and UP-OPT; UP-FA RECORD (toggle on); UP-LOGS PASS
for the daemon log and actor results of both runs and the console of run 2, **NOT MEASURED** for the console over run
1's rows (UP-L1, UP-6, UP-7, SAVE-REFUSE-R). **SW-2 reads "the event ends the wait"** (warm-up excluded, d = [-24, 95,
68] ms, 3/3): the carried input closes, no S5b. Exit check **S5.5 failed for liveA**: the first runner met two
preflight STOPs (python not on the PowerShell tool's PATH; stale globals) and relaunched instead of returning — no
effect, nothing had started — recorded as a failed pre-registered check, which by the phase doc's STOP rules ("a live
runner continuing past a STOP line (#193)") stops the gate for the user; the write-up and liveB continue. No row is
re-run to cure it. Before liveB, one set-up fixer: UP-6-style judges print each clause verdict before the banner
verdict (F3; the pass rule unchanged); the scanners count scheme-plus-host matches, not a bare `://` (F4); the CLICK
print uses the first line (F5). liveB's runner returns on every STOP, preflight included, and starts the console
capture before its first row. An orphan `python -` (PID 22096, with its two bash parents, started 04:26:54Z from a
Bash tool call of this session's agent tree, ~1.5k CPU-seconds) was stopped by the session agent at ~04:58Z.
**Why:** the S5-liveA verifier's FAIL (MAJOR F1: S5.5; MAJOR F2: S5.6 console coverage); a failed check is reported,
never re-tuned (agent-rules §2).
**Instead of:** re-running liveA from the start to get clean S5.5/S5.6 (it re-measures completed rows to flatter the
record).
**Revisit if:** the user wants liveA re-run at the gate.
**By:** Claude

### 2026-10-26 · S5-liveA's first run stopped on a title check; the record stands, two helpers are fixed between rows (#281)
**Decided:** liveA's first run (exit 2 at ~04:20:42Z) stands as recorded: PASS UP-L1, UP-7 (a–c), SAVE-REFUSE-R (both
legs); FAIL UP-6 (all five: "banner seen on a refusal") and UP-OPT (`o2-follows`, 6061 ms or a conflict note), never
fixed in the wave; UP-FA not run because file access was found **ON** (the toggle untouched); SW-2 not measured (its
occluder guard fired on 3 foreign windows); the rest not run. The restore read back equal for the stored state, the
daemon status, the block list's and the Upload folders' hashes; only the toolbar-title check failed, which made the
runner print `RESTORE FAILED` and end. Rulings: (a) `chrome://extensions` is fixture by #277, so the record and
framing output may be committed; the runner's evidence scan is aligned to #277's set. (b) The title check reads only
the first line of the toolbar button's name (`recipes/CLAUDE.md`, Chrome 156's second line "Has access to this site";
`recipes/s9-win.ps1:179` matched the whole name), fixed between rows with a test, as a recorded set-up fix. (c) SW-2's
occluder guard is diagnosed (which windows, where); a fix may only change the wave's own window placement, never
loosen the guard. (d) The remaining liveA rows re-run from where it stopped as new record lines; UP-6 and UP-OPT keep
their FAIL; their cause goes to S5-record as a proposed decision. A fresh step agent continues the slice (#225).
**Why:** the stored safety state was restored (every hash equal), so the STOP was a helper defect already documented
in `recipes/CLAUDE.md`; a failed row is recorded, never retuned (agent-rules §2).
**Instead of:** fixing the helper past the STOP inside the run (forbidden); re-running UP-6/UP-OPT until they pass.
**Revisit if:** the diagnosis shows the occluders are the user's windows over the human's window (then SW-2 waits for
the user, recorded).
**By:** Claude

### 2026-10-26 · S5-runner: accepted; UP-0, UP-RESTORE and UP-LOGS run in both live blocks (#280)
**Decided:** `recipes/s11-r16.ps1` (403 lines) is accepted on verifier 2's PASS-with-notes. UP-0, UP-RESTORE and
UP-LOGS run in both `liveA` and `liveB`, as §4.23's Live column says ("A, B"; #272), which overrides the brief's "each
row in exactly one block". Open notes, recorded for the live slices: a line tagged "vetted" is skipped by the leak
scan (three such lines, read safe; MINOR-A); a `STOP:` during liveB's early file-access read is not counted (NIT-A);
a bare-string line passes the scan (NIT-B). Exit codes: 0 done, 2 STOP (after one restore, read back by hash), 3
liveB refused at G11-3.
**Why:** the sheet is the pre-registered source; both verifiers agreed; the open notes concern lines that are safe
today, and the live slices' fresh verifier scans the record itself by count.
**Instead of:** a third round on the scanner.
**Revisit if:** a live slice prints a vetted line with content.
**By:** Claude (S5-runner's proposal)

### 2026-10-26 · S5-win: accepted with its static-test gaps as notes for S5-runner (#279)
**Decided:** `recipes/s11-win.ps1` (451 lines, under the 500 cap) is accepted on verifier 2's PASS-with-notes without
another fix round. Its gaps go to S5-runner as binding notes: the output scan misses `Get-S11FoundText` as a source and
`Write-S11Pressed`, `[IO.File]::WriteAllText`, `Tee-Object` as sinks (every real call site read safe); 7 of 17 planted
bugs pass the static tests (each site correct by reading); a `STOP:` printed during the restore does not end the
restore, so the runner ends the wave on it; the race-A press timing, the `chrome://extensions/?id=` window title and
the options-page item counts on Chrome 156 are first measured live.
**Why:** the gaps are in test coverage, not in the shipped helpers; the live slice's guards and its fresh verifier
cover them; another round costs more than it saves.
**Instead of:** a second fix round on the scanner.
**Revisit if:** S5-liveA meets any of these sites.
**By:** Claude (S5-win's proposal)

### 2026-10-25 · S5-actor: accepted over its size; bare `localhost` is fixture; a verifier started the daemon (#278)
**Decided:** `recipes/s11.ts` (977 lines against a ~600 brief; no row missing, nothing dead or copied) is accepted.
UP-LOGS counts bare `localhost` on 8081/8084 as fixture (UP-8's page is `localhost:8084`; `isFixture10` did the
same), added to #277's §4.23 note before any observation. UP-RACE-A keeps the sheet's +1.6 s timing; only UP-RACE-B
waits on the actor's `loop-done` signal. Tab placement for UP-5 and the race rows, which the sheet leaves unnamed, is
set-up for S5-driver to choose and record, not a pass rule.
**Why:** the S5-actor verifiers (PASS-with-notes, two rounds). **The incident, recorded:** verifier 1's dry check of
the `fa` subcommand connected before refusing (its MINOR-1), which spawned the real daemon on 9234 (PID 22108) and
the user's extension connected; no tab call was made; the verifier identified the process as its own and stopped it
at 21:15Z; the session agent found 9234 free and no stray node process afterwards. The fix makes every tab subcommand
refuse before connecting (a spy test). The builder did not stop at DONE-PARTIAL as #271 asks.
**Instead of:** re-splitting `s11.ts` after the fact.
**Revisit if:** the trial shows size overruns on Sonnet-built slices are the norm (then the size rule needs a check,
not a request).
**By:** Claude

### 2026-10-25 · S5-rules: SW-2's edge cases and UP-LOGS's fixture set, ruled before Run 16 (#277)
**Decided:** (a) SW-2 is NOT MEASURED when the warm-up trial itself is not measured or when there are not exactly one
warm-up and three trials (as `s11-rules.ts` already does). (b) UP-LOGS counts as fixture only `http://` on the wave's
fixture servers (127.0.0.1 and `*.localhost` aliases, ports 8081 and 8084), `chrome://extensions`, and this
extension's own `chrome-extension://<id>/` pages — Step 10's reading (`recipes/s10-rules.ts` `isFixture10`); any other
loopback port counts as other. S5-actor aligns `s11-rules.ts` to (b) (today it treats every loopback port as fixture
and the extension's pages as other). Both as a dated §4.23 note, before any observation; (c) the S5-rules step agent's
one-line `exclude` in `recipes/tsconfig.s6.json` (outside its lane, the s9/s10 pattern of #228) is accepted.
**Why:** the sheet was silent on both (S5-rules verifiers 1 MINOR 3 and 2 MINOR 1). (a) can never turn a fail into a
pass; (b) is the stricter of the two readings for real hosts (a stray local server is not "fixture") and the earlier
run's for the wave's own extension pages, which the wave opens itself (options page, `chrome://extensions`).
**Instead of:** any loopback port as fixture (lets an unrelated local server's URL pass); the extension's own pages as
other (a STOP the wave causes itself).
**Revisit if:** a live slice opens a page outside this set on purpose (then a new dated note before that slice).
**By:** Claude

### 2026-10-25 · S3c: an erased type import lets the recipes programs see `Window.__agentBridge` (#276)
**Decided:** `extension/src/upload-files.ts` gains `import type {} from "./content/index.js";` (with a comment), which
the compiler removes; every recipes typecheck exits 0 and every `dist/` file is byte-identical (S3c verifier).
**Why:** the recipes programs pull `upload-files.ts` in without `content/index.ts`, where the `Window` augmentation
lives; the erased import carries the declaration and nothing else.
**Instead of:** a triple-slash reference or moving the declaration into a `.d.ts` file (safer against someone dropping
the `type` keyword, which would bundle the content script into `sw.js` — the verifier's NIT, recorded).
**Revisit if:** another extension file in a recipes program hits the same TS2339, or the `type` keyword is ever at risk.
**By:** Claude (S3c's proposal)

### 2026-10-25 · S5: a recipes typecheck broken since S3 is fixed before the live slices (#275)
**Decided:** a one-item slice **S3c** (doers Sonnet medium, verifier Opus) makes `npx tsc --noEmit -p
recipes/tsconfig.s10.json` exit 0 again (it exits 2 at `extension/src/upload-files.ts:133-134` since S3, measured by
the S5-fixtures verifier, NIT-4) without changing behaviour, and adds that typecheck to the checks the next code
stage runs. It runs in parallel with S5-helpers (file-disjoint).
**Why:** the root `CLAUDE.md` says all five recipes configs exit 0; the live helpers compile against the product
sources; S3's verifiers ran only the root typecheck.
**Instead of:** carrying it to S6 or amending the claim.
**Revisit if:** the fix needs a behaviour change (it escalates).
**By:** Claude

### 2026-10-25 · S5-fixtures: the fixture choices the sheet left open (#274)
**Decided:** UP-NAV uses `s11-upload.html?nav=1`, which lands on `?s11=nav-after`; the reporter records the text
input as `inputs["up-text"]`, so UP-6B's text-input step has its own record; the patch counter is
`window.__s11PatchedCalls` (also `state().patchedCalls`).
**Why:** the rows needed a landing page and a record for the text input; both verifiers passed it.
**Instead of:** a second fixture page for the navigation.
**Revisit if:** a live slice finds a row that cannot read them.
**By:** Claude (S5-fixtures' proposal)

### 2026-10-25 · Run 16 serves its fixtures on 8081, since 8080 is held by another program (#273)
**Decided:** the wave's fixture server listens on 127.0.0.1:8081 (the CSP server stays on 8084); §4.23's one mention
of 8080 (UP-8's control page) is amended to 8081 before any observation, with a dated note in the row. #251's port
stop now covers 8081 and 8084; 8080 is not used and its holder is never touched.
**Why:** 8080 is LISTENING by VS Code (PID 28444, the user's program), measured by S5's first ledger line and again
by the session agent at 20:32Z; 8081 and 8084 are free.
**Instead of:** stopping for the user to free 8080; killing its holder (never).
**Revisit if:** 8081 is taken at the live slice's port check (then it stops, per #251).
**By:** Claude

### 2026-10-25 · S5-sheet: Run 16's sheet choices; UP-9 stays behind G11-3 (#272)
**Decided:** as committed in §4.23 (`36cfc43`): UP-0, UP-RESTORE and UP-LOGS run in both live slices; UP-L1 opens
with a `FOUNDCHECK` that records only true/false (the found folders allow neither `<ROOT>` nor `<OUTSIDE>`); the
control for SAVE-REFUSE-R is judged by the `[chrome.debugger] ` prefix plus `boom`; the MCP leg is judged by
containment; the options-page texts are fixed now. UP-9 (a junction out of `<ROOT>`) stays in liveB, behind G11-3, as
0.12 places it, although the gate alone decides its refusal.
**Why:** the S5-sheet verifier endorsed the four choices (three rounds; two MAJORs fixed before the commit). Keeping
UP-9 where 0.12 put it changes no committed row.
**Instead of:** moving UP-9 to liveA by a 0.12 amendment (16 rows waiting instead of 17).
**Revisit if:** G11-3 stays open at S5-record — then UP-9 is re-registered in liveA as a new row.
**By:** Claude (S5-sheet's proposals)

### 2026-10-25 · S5 is split into seven slices; the stopped prep is salvaged per slice (#271)
**Decided:** S5 runs as slices, one Opus step agent each, in order: **S5-sheet** (§4.23 rows with expected text,
SAVE-REFUSE-R and SW-2 included) → **S5-fixtures** (the fixture pages and the CSP server) → **S5-helpers** (the
TypeScript actor and pass-rule helpers with their rule tests, `recipes/tsconfig.s11.json`) → **S5-driver** (the
PowerShell wave driver: options-page edit and read-back, toggle read, reload) → **S5-liveA** (reload, loaded-build
proof, UP-0, SAVE-REFUSE-R, SW-2, the refusals before the attach, the options rows, the toggle-off RECORD row,
restore) → **S5-liveB** (the upload rows, only with file access on: found on, or G11-3 granted) → **S5-record**
(the fresh verifier's row-by-row check, Run 16 in §5). The stopped prep builder's uncommitted files (about 5.6k
lines) are kept outside the repo in `C:\Users\aliev\Projects\step11-s5-salvage\` (the §4.23 draft as a patch);
each slice's builder may take its own piece from there, which its verifier audits like new work, or rewrite it
smaller.
**Why:** the user, 2026-10-25: "current step's builder agent context is over 700k … break up step in smaller
iterations". The single prep builder (Sonnet, high) wrote 18 files in 45 min with no commit; its brief pointed at
four sections of a 460 KB `e2e-test-plan.md`. The user chose salvage per slice.
**Instead of:** restarting S5 as one prep and one live stage; discarding the prep; verifying it whole.
**Revisit if:** a slice's builder still exceeds its budget (then split further).
**By:** user (the split and salvage); Claude (the slice boundaries)

### 2026-10-25 · Builders, fixers and live runners run Sonnet at medium effort from S5 on (#270)
**Decided:** for the rest of Step 11 (and as the standing rule in `docs/agent-rules.md` §7 until the user says
otherwise) builders, fixers and live runners run Sonnet, effort medium, on every stage; verifiers, step agents and the
session agent stay Opus; two failed Sonnet fix rounds → a third on Opus.
**Why:** the user, 2026-10-25, after S5's prep builder passed 700k tokens of context: "We need to change our plan to
run Sonnet on medium effort"; asked which roles, the user chose the doers, keeping an independent Opus check.
**Instead of:** #230's Opus doers on standard stages and Sonnet high on low ones; all roles on Sonnet.
**Revisit if:** Step 11's trial shows more verifier findings or live defects on these stages.
**By:** user (2026-10-25)

### 2026-10-25 · S3: the Upload folders box (#269)
**Decided:** its own textarea and Save on the options page; invalid lines listed by number with a reason (#257's
rules); a home folder or one holding `.ssh` warned, not refused (#250); the only writer of `safety.uploadFolders`.
**Why:** the block list's pattern, with #250's warning.
**Instead of:** sharing the block list's Save.
**Revisit if:** the user rules #250 as a refusal.
**By:** Claude (S3 builder's proposal)

### 2026-10-25 · S3: the upload's wire texts and its 15 s CDP bound (#268)
**Decided:** `NO_FILE_ACCESS_MESSAGE` (fixed, no path) for #245 (b); the finder's `REF_STALE` and `INTERNAL` are marked
with `markOwnRefusal` and reach the wire unprefixed, breakdowns keep `[chrome.debugger] `; the upload's CDP calls are
bounded at 15 s, chosen before any measurement (Run 16 records the durations; a bound is never retuned to a result).
**Why:** S1's contract (#246, #254) and a bound like the other CDP legs'.
**Instead of:** prefixed finder refusals; no bound.
**Revisit if:** Run 16 measures an upload near the bound.
**By:** Claude (S3 builder's proposal; wire text — for user review with #237 and #257)

### 2026-10-25 · S3: marking sweeps stray upload marks first; the finder runs in a CDP-created isolated world (#267)
**Decided:** before setting its mark the content script removes every stray `data-__bridge-upload` in the document,
so a concurrent second upload on one tab ends the first `REF_STALE`. #248's choice: `Page.getFrameTree` →
`Page.createIsolatedWorld` → `Runtime.evaluate {contextId}`, not `DOM.getDocument {pierce}`.
**Why:** a stray mark from a crashed call must not match a later call; the isolated world keeps page-patched
prototypes out of the finder.
**Instead of:** refusing while a mark exists (a crashed call would block the tab); the DOM-walk alternative.
**Revisit if:** Run 16 shows `createIsolatedWorld` needs `Page.enable`, or a same-origin frame is unreachable.
**By:** Claude (S3 builder's proposal)

### 2026-10-25 · S3: the failure-path unmark runs without the safety gate (#266)
**Decided:** after a failed upload the handler removes its own mark without passing the gate (so also after a
disarm), only in the marked document (`documentId`, since `d4718ca`), and never when the mark's injection was
itself rejected. It sets nothing and reads nothing back.
**Why:** "the mark is removed on every path" (0.7, S3.2) and leaving it is a forbidden fix; a disarm must not strand the
bridge's own attribute on a page. Both verifiers judged it not a hole in the gate: it only undoes the bridge's own
write in the document it made it in.
**Instead of:** gating the unmark (the mark would stay after a disarm); sweeping the tab's current document (MINOR 1:
it could script a page the tab navigated to).
**Revisit if:** Run 16's RECORD row shows Chrome running a script in a stale `documentId`.
**By:** Claude (safety-side — for user review, listed under Open decisions)

### 2026-10-25 · S4b: the `UPLOAD_REFUSED` client line's wording (#264)
**Decided:** the line in `sdk/src/error.ts` opens "the bridge will not upload that file", gives the two causes as
"either … or …" (not in an allowed Upload folder; "Allow access to file URLs" off for the extension, in the tool
description's own words), and keeps the closing "stop and ask the user; do not retry with another path". The MCP
shows the SDK's line and has no text of its own.
**Why:** one setting per cause, in the words the agent already has from the tool description.
**Instead of:** the extension's own toggle message, which names the product.
**Revisit if:** the user rules #257's texts differently, or wants a separate code for the toggle.
**By:** Claude (S4b builder's proposal; wire wording — for user review with #257 and #263)

### 2026-10-25 · S4: the client line for `UPLOAD_REFUSED` names both causes (#263)
**Decided:** the SDK's and the MCP's one-line rendering of `UPLOAD_REFUSED` (`sdk/src/error.ts`, S2's wording, #257)
names both causes the extension can refuse for — the file is not in a folder the user allows (extension options →
Upload folders), or the user has not allowed the extension file access in Chrome — and tells the agent to stop and
ask the user, never retry another path; fixed text, naming no path. Built as stage S4b (one item) after S3's texts
land.
**Why:** S4 finding B: since #245 (b) the extension refuses `UPLOAD_REFUSED` for the file-access toggle too, and a
one-cause line sends the user to the wrong setting.
**Instead of:** passing the extension's message through (the line is fixed per code since #163); keeping one cause.
**Revisit if:** the user prefers a separate code for the toggle.
**By:** Claude (wire wording — for user review with #257)

### 2026-10-25 · S4: the preflight's refusals and the answer's details (#262)
**Decided:** the SDK preflight's refusals name the entry's index (`paths[i]`), never the path; the MCP answer's `<n>`
is files sent, `file(s)` literal, each name the real file's basename; the description says the tab is not brought to
the front and makes no background claim until UP-1 measures it.
**Why:** no path in a message (#242); no unmeasured promise.
**Instead of:** echoing the path.
**Revisit if:** UP-1 measures the background case (the description then gains its sentence).
**By:** Claude (S4 builder's proposal)

### 2026-10-25 · S4: `prepareUpload` joins the `@bridge/sdk/download` subpath (#261)
**Decided:** keep the additive export `prepareUpload` on `@bridge/sdk/download` so the MCP shares the SDK's preflight;
the main entry keeps eight values.
**Why:** one preflight for both clients; a new `./upload` subpath needed `sdk/package.json`, outside S4's lane.
Additive and undoable.
**Instead of:** a new subpath, or a copy of the preflight in `mcp/`.
**Revisit if:** the user wants the subpaths to stay download-only.
**By:** Claude (SDK surface — for user review, listed under Open decisions)

### 2026-10-25 · S2: an upload's folder rule runs even for a tab gone at receipt (#260)
**Decided:** at receipt a call on a gone tab still reaches its handler (`TAB_UNKNOWN`, #137) except for class
`upload`, which first runs the folder rule: a path outside the folders, an empty list or a malformed `paths` answers
`UPLOAD_REFUSED` even when the tab is gone; with every path allowed the handler answers as for any tab class. A gone
tab whose last URL was blocked, own or `file:` therefore answers `UPLOAD_REFUSED`, not `DOMAIN_BLOCKED`, for a refused
path; no handler is reached either way. Spec §10's Step 11 note carries one line.
**Why:** it fails closed: the handler is never reached with a refused path, whatever the tab's state (S2 verifier
MINOR 2; S2 fixer 2 §4; judged sound by verifier 2).
**Instead of:** letting a gone tab reach the handler before the folder rule.
**Revisit if:** S3's handler needs `TAB_UNKNOWN` before `UPLOAD_REFUSED` for a closed tab.
**By:** Claude

### 2026-10-25 · S2: the `file:` rule's edges (#259)
**Decided:** within `DOMAIN_BLOCKED` the order is own page > `file:` > block list; every tab call on a `file:` tab is
refused, `closeTab` and `focusTab` included; a wrapper nesting deeper than the 4-level unwrap bound counts as
`file:`; `downloadStart` to a `file:` URL keeps its handler's `BAD_PARAMS`; `listTabs` rows and tab events of a
`file:` tab are **not** hidden (#245 (a) names calls only). Two `safety-gate.test.ts` cases that asserted `file:` was
allowed are amended with dated notes (Stage 0's "no test uses `file:`" was wrong; the S2 verifier judged the amendment
sound).
**Why:** #245 (a) applied literally, stricter where it was silent, without changing `listTabs`.
**Instead of:** hiding `file:` rows as blocked rows are hidden (stricter; offered to the user); allowing `closeTab`.
**Revisit if:** the user wants `file:` rows hidden (their URL names a local path) or `closeTab` allowed.
**By:** Claude (S2 builder's proposal; for user review with #245)

### 2026-10-25 · S2: the matcher's added refusal classes (#258)
**Decided:** beyond 0.4 and #249: control characters include DEL and C1; padding is any Unicode whitespace; a Windows
path with `<>"|?*` is refused; DOS device names (`CON PRN AUX NUL COM0–9 LPT0–9`, superscript `COM`/`LPT` digits,
`CONIN$`, `CONOUT$`) are refused by a segment's stem in any segment; `//?/` and `//./` are prefixes; a Windows path is
matched only against Windows folders and a POSIX path only against POSIX folders.
**Why:** each is ambiguous to Win32 path handling; refusing fails closed.
**Instead of:** passing such paths to Chrome.
**Revisit if:** a real file needs one of these names.
**By:** Claude (S2 builder's proposal)

### 2026-10-25 · S2: the `paths` cap, the exact messages, and the folder-line rules (#257)
**Decided:** at most 20 paths (`UPLOAD_FILES_MAX_PATHS`, `shared/src/protocol.ts`), each at most 4096 characters;
`UPLOAD_REFUSED_MESSAGE` is 0.5's wording and a malformed `paths` gets the same message; the SDK/MCP line, `FILE_PAGE_
MESSAGE` and `FILE_URL_MESSAGE` as in `…-steps/S2-builder.md` §5; folder lines are never trimmed (a line with leading or
trailing whitespace is invalid), blank and `#` lines are ignored, one trailing separator is allowed, a root and a
relative line are invalid.
**Why:** fixed texts naming no path, folder or count (#237); not trimming fails closed, and the options page (S3) can
mark invalid lines.
**Instead of:** trimming as the block list does; a separate malformed-`paths` text.
**Revisit if:** users paste folders with stray spaces.
**By:** Claude (S2 builder's proposal; the texts are wire-level, for user review with #237)

### 2026-10-25 · S2: `uploadFiles` enters the safety table in S2, with a stub registration S3 replaces (#256)
**Decided:** S2's lane widens to `extension/src/safety-call.ts` (the two `case "upload":` labels) and
`extension/src/sw.ts` (a top-level `router.on("uploadFiles", …)` stub that throws a fixed `INTERNAL`), so the safety
table entry and S2.2's and S2.5's gate rows land in S2. S3 replaces the stub with the real handler. The stub cannot be
reached while the folder list is empty (the gate answers `UPLOAD_REFUSED` first), and no build carrying it is loaded
before S5. The new gate rows run through `CallSafety` with a real tab read (S2 verifier MINOR 2: `testsTab`'s
`default: false` would compile a missing label silently).
**Why:** the router-scan tests require a registration for every classified method, and the build needs the labels
(confirmed by the S2 verifier on a scratch copy). Loosening the scan tests is a forbidden fix.
**Instead of:** moving the table entry and its rows to S3, which leaves S2's gate untested for a stage.
**Revisit if:** S3 finds the stub's shape in its way.
**By:** Claude

### 2026-10-25 · S1: the wording of `kind` in `saveTo`'s description (#255)
**Decided:** `browser_evaluate`'s `saveTo` description reads `… answer only the path, size, kind ("string" for a string
saved as is, "json" for anything else) and sha256 …`.
**Why:** it names both values `evaluateSaveStart` returns (#218), as #229 ordered.
**Instead of:** a bare "kind".
**Revisit if:** a third `kind` appears.
**By:** Claude (S1 builder's proposal)

### 2026-10-25 · S1: the marked set is the `saveTo` value refusals and the cap; the save leg's breakdowns keep the prefix (#254)
**Decided:** the refusals marked to pass through unprefixed are `save.ts`'s value refusals (including the stringify
`PAGE_ERROR`) and the in-session size cap — SAVE-REFUSE's set (#207, #218). The save leg's `INTERNAL` failures and its
transfer timeout keep `[chrome.debugger] `, as do `keys.ts`'s unsupported-key refusal and every page error.
**Why:** #246 names the `saveTo` refusals; the `INTERNAL` failures are breakdowns, not refusals; outside the session the
cap was already unprefixed. The narrower set changes the least wire text.
**Instead of:** marking every own error `save.ts` throws.
**Revisit if:** the user wants the `INTERNAL` failures, the timeouts or the key refusal unprefixed.
**By:** Claude (wire message text — for user review, listed under Open decisions)

### 2026-10-25 · S1: the own-refusal marker is a module-private WeakSet (#253)
**Decided:** `markOwnRefusal(err)` adds the error to a `WeakSet` private to `debugger-errors.ts`; only a marked own
coded `BridgeError` passes `describeDebuggerError` unchanged; a copy of a marked error is not marked.
**Why:** a marker carried by the error's shape (a property, a subclass) could be forged or copied onto a page error.
**Instead of:** a property or a subclass.
**Revisit if:** errors are cloned across a boundary before `describeDebuggerError`.
**By:** Claude

### 2026-10-25 · Stage 0 accepted; the stage split (#252)
**Decided:** Stage 0's audit is accepted (verifier PASS-with-notes, `…-steps/Stage0.md`). Stages: S1 1.5 h standard ·
S2 3 h standard · S3 3.5 h standard ∥ S4 2 h standard · S5 prep 2 h low, live 2 h standard · S6 1 h low. The findings
enter the stages as listed in `journal.md` (the stage-split line) and the phase doc's dated notes.
**Why:** the audit's split, with F1's rules (#245) in S2 and S3.
**Instead of:** the phase doc's original budgets.
**Revisit if:** G11-3 stays open at S5 (then the upload rows wait; the rest of Run 16 runs).
**By:** Claude

### 2026-10-25 · Stage 0: Run 16's pass rules corrected before S5 (#251)
**Decided:** UP-6's "no call" is judged by the SDK preflight's message constant and the page reporter, not `daemon.log`
(it logs no calls); UP-6's `..` row expects `UPLOAD_REFUSED` (the gate returns only safety refusals); UP-LOGS counts
`daemon.log`, the worker console and the actors' tool *results*, not the actors' own inputs, with `<ROOT>` named in the
sheet; UP-8's CSP server on port 8084 (S5 re-checks 8080/8081/8084 and stops if one is held by a program not its own);
UP-CLICK is not run (no proven safe way to close the native dialog in the wave's own window).
**Why:** Stage 0 F5, F6, F9, F13 and § UP-CLICK: as written, two rows could not fail and one failed by construction.
**Instead of:** running the rows as first written.
**Revisit if:** the daemon gains a per-call log line.
**By:** Claude

### 2026-10-25 · Stage 0: who the folder rule protects against, and the broad-folder warning (#250)
**Decided:** the folder rule binds an agent whose only reach is the bridge; an agent with a shell can copy or hard-link a
file into an allowed folder or drive the options page by UI Automation — a known limit, written in 0.4 and in
`docs/setup.md` (S6). The options page (S3) and `docs/setup.md` warn not to allow a home folder or any folder that holds
`bridge.token` or `.ssh`; a filesystem root stays refused (0.4); a home folder is warned, not refused.
**Why:** Stage 0 F3 and verifier M3.
**Instead of:** refusing a home folder outright (the stricter option, offered to the user).
**Revisit if:** the user prefers the refusal.
**By:** Claude (for user review — listed under Open decisions)

### 2026-10-25 · Stage 0: matcher details — a POSIX path with a backslash is refused; ASCII-only case folding (#249)
**Decided:** S2's matcher starts from Stage 0's 74-row table (`…-steps/stage0-matcher-cases.txt`) plus the verifier's
rows (M1: `/home/u/Up\x` refused; N2: folder lines with `/` separators, `..`, a UNC or `\\?\` prefix). A POSIX-shaped
path or folder line holding `\` is refused, never normalised; drive-letter case folding is ASCII-only (U+212A is not
`k`); doubled/trailing separators, DOS device names, trailing dot or space segments and over-long paths are refusal
classes; a malformed `paths` (not an array, a non-string, more than 20) fails closed at the gate.
**Why:** Stage 0 F9, F10 and verifier M1, N2: each is a fail-open the phase doc's list missed.
**Instead of:** 0.4's "after normalising separators" on POSIX; `toLowerCase`.
**Revisit if:** a real folder needs a character a refusal class excludes.
**By:** Claude

### 2026-10-25 · Stage 0: the finder runs in an isolated world (#248)
**Decided:** S3 resolves the marked input from an isolated world (`Page.createIsolatedWorld` + `Runtime.evaluate
{contextId}`) or by walking `DOM.getDocument {depth:-1, pierce:true}` in the extension (S3's choice, recorded), never
the page's main world; then `DOM.setFileInputFiles {objectId | backendNodeId}`. Amends #239.
**Why:** Stage 0 F11: page-patched prototypes run during main-world code; CSP was already measured not to block CDP
evaluate (EVAL-12).
**Instead of:** 0.7's main-world finder.
**Revisit if:** S3 shows a same-origin frame unreachable from the isolated world.
**By:** Claude

### 2026-10-25 · Stage 0: a `webkitdirectory` input is refused; `files` is the count Chrome accepted (#247)
**Decided:** the target rule (#239) refuses an input with `webkitdirectory` (`BAD_PARAMS`). `uploadFiles`'s `files` is
the number of paths handed to `DOM.setFileInputFiles` after it returned ok, documented as such; success is judged by
the page (Run 16's reporter), never by the answer.
**Why:** Stage 0 F4 (a directory input uploads a folder's contents the matcher never saw) and F7, with verifier M2 (a
read-back is 0 on a page that clears its input on `change`).
**Instead of:** the audit's read-back of `input.files.length`.
**Revisit if:** a client needs the page's own count, or directory uploads are wanted.
**By:** Claude (the meaning of `files` is wire-level — for user review with #238)

### 2026-10-25 · Stage 0: S1 marks the bridge's own refusals explicitly; page errors and timeouts keep the prefix (#246)
**Decided:** #244 (a) is reworded: a refusal the bridge raises on purpose inside `withDebugger` (the `saveTo` refusals,
including the `PAGE_ERROR` of the stringify refusal) carries an explicit marker that `describeDebuggerError` passes
through unchanged; `pageError` and `raceTimeout`'s `TIMEOUT` keep `[chrome.debugger] `. `debugger-errors.test.ts`'s
existing prefix assertions and the `debugger-errors.ts` line pinned by `recipes/test/s10-rules.test.ts` stay
byte-identical; a new failing test pins the marker.
**Why:** Stage 0 F2: as first worded, "an own `BridgeError` whose code is not a debugger code" also unprefixes EVAL-5's
page error and timeouts — no code tells them apart — which #229 and 0.14 say must not change.
**Instead of:** #244 (a)'s code-based rule.
**Revisit if:** the user wants timeouts unprefixed too.
**By:** Claude (it implements #229's ruling as the user stated it, EVAL-5 unchanged)

### 2026-10-25 · Stage 0: uploads need Chrome's file access, and the bridge never opens or reads `file:` pages (#245)
**Decided (conservative rule, for user review):** (a) the gate refuses every tab call on a `file:` tab and every
`navigate`/`newTab` to a `file:` URL (`DOMAIN_BLOCKED`, a fixed message), for every method, in S2 — before anyone is
asked to turn file access on; (b) the upload handler reads `chrome.extension.isAllowedFileSchemeAccess()` before
attaching and, when false, refuses `UPLOAD_REFUSED` with a second fixed message (the user has not allowed this
extension file access in Chrome), in S3; (c) a new human gate **G11-3**: the toggle "Allow access to file URLs" is
the user's to turn on (or to grant the wave to turn on and restore in its own window). Until G11-3, Run 16 runs every
row that needs no file access (SAVE-REFUSE-R, SW-2, the refusals before the attach, a RECORD row "toggle off →
refused") and the upload rows wait for the user.
**Why:** Stage 0 F1: Chromium's `dom_handler.cc` refuses `DOM.setFileInputFiles` with "Not allowed" unless the client
may read local files (re-fetched by the verifier); for an extension that is presumably the file-URL toggle, which
also lets the bridge navigate to and snapshot any `file:` page — past the folder rule — because the gate passes
`file:` URLs today (probe). The conservative option is the stricter one, undoable, and no existing test or row uses
`file:` (S2's verifier checks it).
**Instead of:** leaving `file:` reachable once the toggle is on; a raw `[chrome.debugger] Not allowed`; turning the
toggle on inside the wave without a grant (it changes the user's Chrome settings).
**Revisit if:** S5 measures that the upload works with the toggle off, or the user wants `file:` pages reachable.
**By:** Claude (for user review — listed under Open decisions)

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
