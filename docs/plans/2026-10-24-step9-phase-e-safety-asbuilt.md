# Step 9 — Phase E: safety — as-built register

Phase doc: `docs/plans/2026-10-24-step9-phase-e-safety.md` · Steps dir:
`docs/plans/2026-10-24-step9-phase-e-safety-steps/` (journal, briefs, ledgers, reports) · Kept by the
session agent; one section per stage, written at each stage close.

## Stage 0 — Spec audit · 2026-10-24 · verifier: PASS-with-notes · commit 0e72503

### Contracts (binding forward)
- Every Step 8 contract held on port 0 at a0700e0 (C1 attach set of 7 codes, C2 `code` required →
  `INTERNAL`, C3 session marker, C4 handles never reused, C5 cursor rule, C6 `TAB_HELD`, C7 FIFO lock).
- Baseline counts at a0700e0: 23 router methods, 23 codes, 23 tools, 1714 tests / 85 files.

### Decisions taken
- #132–#144 (Stage 0's D1–D13, the stricter option each); #145 the stage split (S2 → S2a + S2b); #131
  amended where its premises were refuted (F1, F2, F9).

### Deviations from the phase doc
- S2 split into S2a (enforcement) and S2b (UI) (#145); the phase doc carries the dated note (3d3c4be).

### Estimates vs actuals
- 1.5 h estimated; about 44 min of agent time (one fix round).

## Stage S0 — Types and codes · 2026-10-24 · verifier: PASS · commits 3d3c4be, aabc3b4, 2cc0049, 32e64a3, 5dbbce7

### Contracts (binding forward)
- 25 codes: `DISARMED` and `DOMAIN_BLOCKED` on the wire (24), `NO_CURSOR` SDK-only.
- `shared/src/protocol.ts`: `SafetyState {armed, evaluate, blockedCount}` + `isSafetyState`;
  `DaemonStatusSafety` (nullable); `SafetyScope "all"|"evaluate"` + `DisarmedData`; `HiddenReason
  "disarmed"|"blocked"`; `ExtensionListTabsRow`/`ListTabsRow` with `title?`/`url?`/`hidden?`;
  `TabRemovedParams.hidden`; events `safetyState` (extension → daemon) and `safetyStatus` (daemon →
  clients) with their guards. `tabCreated` has no marker (#146).
- Spec §10 (and §6.5) notes precede the code commit.

### Decisions taken
- #146 S0's build details; #147 where the split stage's checks close; #148 the SDK `TabInfo` shape.

### Estimates vs actuals
- 0.75 h estimated; about 27 min. Tests 1714 / 85 → 1783 / 86.

## Stage S1 — The gate and the host matcher · 2026-10-24 · verifier: PASS-with-notes · commits 9722cd6 (cases first), 2091f6b

### Contracts (binding forward)
- `extension/src/safety.ts` (gate, method table, post-check, redaction, network predicate) and
  `extension/src/safety-match.ts` (the #135 grammar and matcher; dot-boundary only). Pure; no logging.
- The method table classifies all 23 router methods; its lookup throws on an unknown name; a test scans
  `router.on(` names in `sw.ts` (S1.1, three mutants red). The `Router.on`-throws half closes at S2a
  (#147); it also closes the `router["on"]` / `.on.call` forms the scan misses.
- With armed, JavaScript on and an empty list, every method is allowed for every URL except this
  extension's own pages and navigation to `chrome-extension://` URLs (#138).

### Decisions taken
- #149–#158 (S1 report §5); #153–#156 contract-level, under Open decisions.

### Estimates vs actuals
- 2.5 h estimated; about 40 min. Tests +473 in 5 files (1783 → 2256 alone).

## Stage S3 — Daemon relay, SDK and MCP · 2026-10-24 · verifier: PASS-with-notes · commit 782b1d5

### Contracts (binding forward)
- The extension sends `{"event":"safetyState","params":{armed, evaluate, blockedCount}}` each time its
  connection comes up and on every change, never in the hello (S3 §7 → S2a). The daemon keeps the latest
  (null until reported; a new extension hello, and an extension disconnect, reset it to null —
  `daemon/src/intercept.ts:251-255`, noted by S5), logs one line per change with booleans
  and the count, serves `daemon.status.safety`, and broadcasts `safetyStatus` (never with null).
- While the last state says disarmed, the daemon omits URLs and titles from status rows, `tabGone`,
  `TAB_GONE` and `leaseGranted` (`url: ""`), also across an extension disconnect until a new report; a
  `"blocked"` hidden row clears that handle's cached url/title; one `listTabs` per state change; a
  stale `listTabs` reply cannot restore a cleared url.
- SDK: `client.safety()`, `on("safetyStatus")`, `TabInfo.hidden?`, types `SafetyState`/`HiddenReason`
  exported, `safetyRefusalLine` on `@bridge/sdk/report`; safety refusals carry no `report` property.
- MCP: `browser_status` gets a second text item `Safety: …` while the extension is connected; `DISARMED`
  (by scope) and `DOMAIN_BLOCKED` render as one stop-and-ask line; hidden rows `(hidden: …)`. Neither
  code is in the attach set.

### Decisions taken
- #159–#168 (S3 report §5); #159–#163 and #168 contract-level, under Open decisions.

### Deviations from the phase doc
- The `Safety:` line rides a second text item, not the first (#162); S4 needs a row proving the model
  sees it in a live transcript.

### Estimates vs actuals
- 2.5 h estimated; about 40 min in parallel with S1. daemon/sdk/mcp tests 771 / 44 → 844 / 49; full suite
  with S1: 2329 / 96, 0 failures.

## Stage S2a — Extension enforcement · 2026-10-24 · verifier: PASS-with-notes · commit a27ab45

### Contracts (binding forward)
- `sw.ts` serves every method through `GatedRouter` (`extension/src/router.ts`), the only router the worker
  constructs; the old `Router` core is kept unchanged beside it (#169). `GatedRouter.on` throws on a method
  with no safety class (S1.1's second half). An unknown method is `UNKNOWN_METHOD` in every state (#170).
- The state is read from `storage.local` per call, fails closed on an unreadable or wrong-typed value (#171);
  a disarm held in memory wins over a storage read (#176); a disarm whose write fails twice stays disarmed
  in memory and returns `"write-failed"` (#174). The toggle S2b calls: `safety.toggle()` →
  `"disarmed" | "armed" | "ignored" | "write-failed"`; the options page writes through `writeSafety`.
- Gate at receipt, before each first side effect and as the post-check, which also replaces error replies
  (#178); `navigate`/`newTab` are gated on the URL Chrome will open, so a relative URL cannot reach this
  extension's pages (#175, the round-1 CRITICAL); the offscreen document accepts only this extension's
  non-tab senders (#173).
- Disarm detaches every debugger session (a pure registry), waits re-check every 100 ms (#172), downloads are
  cleared and checked on their final URL, the network ingest drops events while disarmed and a request for
  good once one event was dropped (#179); `listTabs`/events redacted; a capture whose window showed another
  tab is refused `OFFSCREEN` (#177); `safetyState` is sent on connect and on change, never while the state
  is unreadable (#180).

### Decisions taken
- #169–#180 (S2a report §5); #174–#180 contract-level, under Open decisions.

### Estimates vs actuals
- 3 h estimated; about 62 min (one fix round, which fixed one CRITICAL). Tests 2329 / 96 → 2561 / 106.

## Stage S2b — Extension UI and the 0.7 log scan · 2026-10-24 · verifier: PASS-with-notes · commit 59388ed

### Contracts (binding forward)
- Manifest gains only `action` (no popup) and `commands._execute_action` (`Alt+Shift+K` suggested); no new
  permission. One top-level `action.onClicked` listener in `sw.ts` serves the button and the shortcut, calls
  `safety.toggle()` and logs one fixed line per press.
- Badge and title derived from the stored state at every worker start and on every change (#143 titles word
  for word; every failure state shows `OFF`, #181, #182).
- The options page: armed and JavaScript switches save on change (not debounced); the block list marks and
  counts invalid lines with S1's parser (#184); a button opens `chrome://extensions/shortcuts`; port and token
  unchanged (#186).
- Tests: the log scan allowlists 54 log sites (extension 15, daemon 33, sdk 0, mcp 6; *Corrected 2026-10-25 (Step 10 Stage 0 F8): was '60 log sites', because the allowlist has 54 entries (15 + 33 + 0 + 6) since S2b.*) and a sentinel test runs
  the real daemon on port 0 (#187); only the toggle module and the options page write the safety keys, and
  `storage.local.remove`/`clear` are refused everywhere (#188).

### Decisions taken
- #181–#188 (S2b report §5); #188 contract-level, under Open decisions. #189 orders the fix stage S2c.

### Estimates vs actuals
- 1.5 h estimated; about 56 min (one fix round). Tests 2561 / 106 → 2660 / 113.

## Stage S2c — Fix: failed re-arm write; narrow badge read · 2026-10-24 · verifier: PASS-with-notes · commit 6fef83c

### Contracts (binding forward)
- A rejected re-arm write returns memory to disarmed (fires `onDisarm`, does not move the 1 s re-arm
  guard), unless a newer `armed` change landed meanwhile; the next press retries the re-arm (#190, #174).
- The badge's stored read is `readStoredArmed` in `safety-state.ts`, asking exactly the safety keys; `sw.ts`
  no longer calls `storage.local.get(null)` (#191, supersedes #183's read).

### Decisions taken
- #189 (the stage), #190, #191.

### Estimates vs actuals
- Unbudgeted fix stage; about 25 min (one fix round). Tests 2660 / 113 → 2685 / 115.

## Stage S4 — E2E (live), Run 13 · 2026-10-24 · verifier: FAIL on process (escalated, #192) · commits 049a72a (rows first), e91e437, ba073d6, d101b77, 46d765b, e381696

### As run
- Rows §4.20 committed before the build (049a72a); the reload script exit 0 and SAFE-0 are the first two
  recorded lines; daemon build `99bb55c5…332d`.
- Rows (live verifier's count): **24 PASS, 7 FAIL, 3 RECORD, 5 NOT MEASURED** (pre-registered reasons). The
  FAILs: SAFE-11 start and SAFE-POP-1 (tooling), SAFE-5c's redirect half (TIMEOUT, single-threaded redirect
  server probable — the post-redirect `downloadStart` check of #140 is unmeasured live), SAFE-4(b) (the disarm
  stopped trusted typing 14 ms after the press, but the debugging banner was still up at 3 s, gone by 14 s),
  SAFE-3 (a background options window showed the re-arm only when foregrounded), SAFE-9 and SAFE-10's set-up
  (expected text wrong; dated notes beside the rows, #195). None is shown to be a product defect.
- Found state: a pre-Step-9 extension with no safety keys (armed, JS on, empty list); first read after the
  reload armed / JS on / 0 lines / sha256 of the empty text. Read-back at the end identical on every field,
  pin, keyboard layout and window count as found (S4.4).
- Log greps by count: `daemon.log` (210 lines) and the worker console 0 for the token, non-fixture `://`,
  `localhost:8081`, `:8083`, `bank.example`. Real hostnames in committed files: 0.
- Process deviation: the level-2 runner resolved four STOP points itself (blocks 4, 8, 9, 30) instead of
  returning; no state was changed at any of them. Ratification is the user's (#192); #193 sets one stop rule
  for later waves.

### Contracts (binding forward)
- Measured on Chrome 156: `Alt+Shift+K` is assigned as `_execute_action` and left the Windows input layout
  unchanged; `javascript:` through the bridge → `NAV_FAILED`, page unchanged; the toolbar extension button
  and the Extensions button expose no UIA Invoke pattern; the per-call safety read moved the snapshot
  round-trip median 3.6 → 5.3 ms (#139's Revisit-if not met).

### Decisions taken
- #192–#197 (S4 report §9); #192 integrity floor, under Open decisions; #194 carries four re-measurements
  to Step 10.

### Estimates vs actuals
- 1.5 h prep + 2.5 h live estimated; about 95 min of agent time in all. Tests 2685 / 115 → 2720 / 116
  (recipes/test).

### Needs the user's keyboard
- The ruling on Run 13 (#192); `/mcp` or a fresh session in any interactive Claude session using the bridge
  (daemon build changed); optionally pin the toolbar button (left unpinned, as found).

## Stage S5 — Docs · 2026-10-24 · verifier: PASS-with-notes · commit 2631c91

### As built
- `docs/setup.md` "Safety" (the three controls, `Alt+Shift+K`, badge states, what agents see, the JavaScript
  switch and the Blackboard recipes, the grammar with reserved names, the own-page block, the failure states,
  what the block list does not do); README security paragraph; the roadmap's Step 9 block; e2e-test-plan §1
  names the S4 helpers. Refusal texts quoted byte for byte from the code (#198). `CLAUDE.md` changes proposed
  in S5.md §7 and applied by the session agent (counts, key files, the "Step 9 — safety" gotcha block).
- Counts re-derived at `ba6029e`: 2720 tests / 116 files, 25 codes, 23 tools, 23 router methods.

### Deviations
- The docs follow the code where the brief differed: no `commands.onCommand` (#142).

### Decisions taken
- #198, #199.

### Estimates vs actuals
- 1 h estimated; about 21 min (one fix round: setup.md had promised `error.report()` on safety refusals).

## Open decisions for the user (running list; also in `docs/decisions.md` → Open decisions)
- #131–#141, #144 (Stage 0), #148 (S0), #153–#156 (S1), #159–#163, #168 (S3), #174–#180 (S2a), #188 (S2b), #192 (S4 — the gate item waits for it).

*Ruled 2026-10-24 (decisions.md · 2026-10-24 · The user rules on the 32 Step 9 open decisions; Step 9 closes (#202)): every open decision above is ruled. All ratified as built except
#133 (a new code `JS_DISABLED`, built in Step 10); #140 ratified with a `declarativeNetRequest` network rule planned
for a later step; #192 ratifies Run 13. Step 9 is closed.*

## Gate checklist (2026-10-24)

| Item | Met? | Evidence |
|---|---|---|
| S0.1–S0.2 | yes | S0.md; spec notes aabc3b4/2cc0049 before the code commit 5dbbce7 |
| S1.1–S1.3 | yes | S1.md; cases first 9722cd6; `Router.on` half at S2a |
| S2.1–S2.4 | yes | S2a.md, S2b.md, S2c.md |
| S3.1–S3.3 | yes | S3.md |
| S4.1–S4.4 | yes; process deviation ratified | S4.md, S4-run-record.md; #192 |
| S5.1 | yes | S5.md |
| STOP rules | none fired unruled | journal.md; #192 ruled by the user |
| Commits | one or more per stage, exact file lists, no `dist/`, token, `exports/` or screenshot | `git log a0700e0^..` |
| Safety state restored | yes, equal by hash | S4.md §5 |
| Open decisions | all ruled | #202 |
