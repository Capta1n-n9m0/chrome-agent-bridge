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
  (null until reported; a new extension hello resets it to null), logs one line per change with booleans
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

## Open decisions for the user (running list; also in `docs/decisions.md` → Open decisions)
- #131–#141, #144 (Stage 0), #148 (S0), #153–#156 (S1), #159–#163, #168 (S3), #174–#180 (S2a).
