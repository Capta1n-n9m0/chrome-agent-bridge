# S3 builder report — Daemon relay, SDK and MCP (Step 9)

2026-10-24 · builder, Claude Opus 5.5 (`claude-opus-5-5`) · baseline HEAD `a3ec4f5` · nothing committed (the
step agent commits after the verifier) · no daemon started, no port but 0 bound, nothing outside the lane
touched. S1's extension files appeared in `git status` during the run; they were left alone.

## 1. Built (files)

Source (8 files, `git diff --stat`: 289 insertions, 45 deletions):

| File | What |
|---|---|
| `daemon/src/intercept.ts` | The relay (#132): `isSafetyStateEvent` branch in `extensionEvent`; a malformed `safetyState` dropped with the log line `safety state: malformed event dropped`; `onSafetyState` keeps only `{armed, evaluate, blockedCount}`, ignores an identical repeat, logs `safety state: armed=… evaluate=… blocked=N` (`safetyLogLine`), broadcasts `safetyStatus`, runs one `listTabs` (`refreshAfterSafety`; a failure logs `safety state: listTabs after the change failed`, no retry). `extensionDisconnected()` → null (log `safety state: not reported (extension disconnected)`, no broadcast); a new extension hello also resets the reported state to null. `status()` adds `safety`. Redaction while the last state received says disarmed (`redacting()`): `status()` rows without `url`, `sendGone` and `TAB_GONE` data without `lastUrl`/`lastTitle`, `leaseGranted.url` `""`. Cache: `record()` clears a `"blocked"` row's url/title (`forgetPage`) and does not note any hidden row; `tabRemoved {hidden:"blocked"}` clears before marking gone. Opener rule: `fillUrl` stops at a row carrying `hidden` (F40). |
| `daemon/src/handles.ts` | `HandleTable.forgetPage(tabId)` (F41). |
| `daemon/src/wsHost.ts` | Passes `broadcast` to the tab layer; calls `tabs.extensionDisconnected()` when the current extension socket closes. |
| `sdk/src/error.ts` | `safetyRefusalLine(code, data)`: the one plain line for `DISARMED` (by `data.scope`; no valid scope → `"all"`) and `DOMAIN_BLOCKED`; `renderReport` returns it for those codes. `ATTACH_CODES` unchanged. |
| `sdk/src/report.ts` | `@bridge/sdk/report` also exports `safetyRefusalLine` (the MCP's door). |
| `sdk/src/client.ts` | `client.safety(): Promise<SafetyState \| null>` (reads `daemon.status`, keeps the three fields, null when absent/malformed); `on("safetyStatus")` typed event (guard `isSafetyStatusEvent`); `TabInfo.hidden?: HiddenReason` (#148), `title`/`url` stay `""` for a hidden row. |
| `sdk/src/index.ts` | Type exports `SafetyState`, `HiddenReason` (values unchanged: still eight). |
| `mcp/src/tools/registry.ts` | `safetyStatusLine`; `browser_status` returns the Safety line as a **second text item** when the extension is connected; hidden rows rendered `(hidden: the bridge is off)` / `(hidden: blocked site)` in `browser_list_tabs` and `browser_status`'s `Active tab:`, `Cursor:`, `Human's active tab:` lines (missing fields print `""`, never `undefined`); `withSafetyRefusals(server)` registers all 23 tools through a wrapper that turns a `DISARMED`/`DOMAIN_BLOCKED` `BridgeError` into `{isError:true, content:[one line]}` (no attach call, no image). No tool added, removed or renamed; no input schema changed. |

Tests (5 new files, 72 tests): `daemon/test/safety.test.ts` (19), `daemon/test/safety-surface.test.ts` (2),
`sdk/test/safety.test.ts` (18), `mcp/test/safety.test.ts` (32), `mcp/test/safety-cross.test.ts` (1). No existing
test file was edited.

## 2. Results

Per-package `tsc` (`npx tsc --noEmit -p <pkg>/tsconfig.json`, after the change):

```
shared tsc exit=0
daemon tsc exit=0
sdk tsc exit=0
mcp tsc exit=0
extension tsc exit=0     (information only — S1's work in progress is in the tree)
```

`npm test` (whole repo, includes S1's in-progress extension tests):

```
 Test Files  96 passed (96)
      Tests  2302 passed (2302)
```

My lane (`npx vitest run daemon sdk mcp`): **771 tests / 44 files before → 843 / 49 after** (+72 / +5; per file:
19 + 2 + 18 + 32 + 1). Baseline for the whole repo was 1783 / 86; the rest of the difference is S1's.

`npm run build` tail (exit 0; `git status` shows no tracked file changed by it):

```
built mcp → dist/index.js
> @bridge/extension@0.1.0 build
> node build.mjs
built extension → dist/
build=0
```

**New tests fail without the change** (checked: the 8 changed source files replaced by their `HEAD` copies, the
five new files run, then restored — `git diff --stat` identical before and after): 46 failed, 8 passed. The 8
that pass on baseline are, by design, invariant guards: the two S3.3 method-table tests, the two S3.3 tool-list
tests, "no Safety line with the extension not connected", "any other error still throws", "a null state redacts
nothing", "listTabs replies keep hidden and add no title/url back". `sdk/test/safety.test.ts` failed at import on
baseline (no `safetyRefusalLine`), so its F25/F26/S3.1 tests were not run separately on baseline — those three
encode behaviour Step 8 already had (they pin it). The S3.3 method-table test was also shown failing on a
mutation (`"safetyToggle"` appended to `FREE_METHODS`: 2 failed), then `methods.ts` restored with `git checkout`
(it is unchanged by this stage).

## 3. S3.3 grep commands and outputs

```
$ grep -niE "arm|disarm|setSafety|block" daemon/src/methods.ts; echo "exit=$?"
exit=1
$ grep -A1 "reg.tool($" mcp/src/tools/registry.ts | grep -oE '"browser_[a-z_]+"' | tr -d '"' > <scratch>/tools.txt
$ wc -l < <scratch>/tools.txt
23
$ grep -niE "arm|disarm|setSafety|block" <scratch>/tools.txt; echo "exit=$?"
exit=1
```

Both empty, exit 1. No existing Step 8 name matched. The tool list was read from the registry source, not from
the test's hard-coded list.

## 4. Coverage — items 1–14 and the exit checks

| Item / check | Tests |
|---|---|
| 1 relay (null until reported, one log + one broadcast per change, identical repeat inert, extra keys dropped, malformed dropped content-free, null after close, no null broadcast) | daemon `safety.test.ts`: "daemon.status.safety is null until reported…", "an identical repeat…", "only the three fields…", "a malformed safetyState…", "the state goes back to null…"; cross test |
| 2 `daemon.status.safety` | same; cross test (`client.safety()`) |
| 3 redaction while disarmed; null redacts nothing; armed + JS off + blocked redacts nothing | daemon "while disarmed: status rows omit url…", "while disarmed a retire-all tabGone…", "the disarmed redaction outlives the extension socket", "a null state…", "armed with JavaScript off…"; cross test (`tabGone {tab}` only) |
| 4 cache: blocked row clears, disarmed row keeps, `tabRemoved` blocked, `listTabs` per change, its failure | daemon "a listTabs row hidden 'blocked'…", "…'disarmed' does not overwrite…", "a tabRemoved hidden 'blocked'…", "every safety-state change runs one listTabs…", "a failed listTabs after a change…"; cross test |
| 5 opener rule (F40) | daemon "a hidden popup's leaseGranted carries url ''… without the 2 s url fill" (fake clock: 0 ms, one `listTabs`), "while disarmed a popup's leaseGranted carries url ''…"; cross test (real time < 1000 ms) |
| 6 hidden rows pass through | daemon "listTabs replies keep hidden…"; cross test (`client.tabs()`) |
| 7 `safety()` / `on("safetyStatus")` | sdk `safety.test.ts` "client.safety() and on('safetyStatus')" (5 tests); cross test |
| 8 `TabInfo.hidden` | sdk "TabInfo for hidden rows"; cross test |
| 9 the plain line by scope; not in `ATTACH_CODES` | sdk "S3.1…" (3), "S3.2 — the plain line…" (7) |
| 10 F25, F26 | sdk "stage0-audit F25 / F26" (2) |
| 11 Safety line, 4 states + not reported, singular/plural | mcp `safety.test.ts` "S3.2 — browser_status's Safety line" (8) |
| 12 hidden rows in the MCP | mcp "hidden rows render as (hidden: …)" (3); cross test |
| 13 one line as an error, no report, no screenshot | mcp "S3.2 — DISARMED and DOMAIN_BLOCKED…" (19, across 15 tool calls); cross test |
| 14 no tool added/removed/renamed | mcp "S3.3 — no tool added…" (2) |
| **S3.1** | sdk "ATTACH_CODES holds neither code…" + the two "a Tab call refused … makes no attach call" |
| **S3.2** | mcp Safety-line tests (all four armed × JS, null, absent, malformed, 0/1/2 blocked); MCP line by scope (`browser_evaluate` scope evaluate vs 15 tools scope all, no scope → all); SDK line and `renderReport` by scope |
| **S3.3** (S3's half) | `daemon/test/safety-surface.test.ts` (tables vs `git show a3ec4f5:daemon/src/methods.ts`, hard-coded); mcp "the 23 tool names, in registration order, are Step 8's"; greps in §3 |
| Cross-package over real `ws`, port 0 | `mcp/test/safety-cross.test.ts` — daemon + SDK `connect()` + BridgeLink/MCP tools + raw `ws` v2 client vs a fake proto:2 extension |
| Old client (probe P3) | daemon "a client that ignores safetyStatus keeps working…" (raw `ws`), sdk "a client with no safetyStatus listener…", cross test (raw `ws` client answers `listTabs` after two broadcasts) |
| Log hygiene | `afterEach` in daemon `safety.test.ts` and the cross test: no `://`, host, title, sentinel pattern or token in any line; every `safety state:` line matches the four fixed forms |
| Unchanged while armed / JS on / 0 blocked, and while null | every existing test passes unmodified (843 in the lane, no expected text edited) |

## 5. Deviations

1. **The Safety line is a second text item**, not a new line in `browser_status`'s text. Every placement of a new
   line inside the first item breaks an existing Step 8 test's expected text (`mcp/test/tools.test.ts` "S5 —
   browser_status's Cursor…" asserts `lines.slice(3)` exactly and `.at(-1)`; `s5-cross.test.ts` asserts `.at(-1)`),
   and editing those is a forbidden fix. The second item keeps every existing line's text and order. See Proposed
   decision 5.
2. **The SDK's `report()` for the two codes.** Step 8's `sdk/test/failure-report.test.ts` loops over every
   `ErrorCodes` key (S0 added the two) and requires that a non-attach-set code get *no* `report` property. So a
   `Tab` error with `DISARMED`/`DOMAIN_BLOCKED` is rethrown untouched, as today. The scope-dependent wording lives in
   `safetyRefusalLine`, which `renderReport` (the function every `report()` renders through) returns for both codes
   and the MCP uses. A script reads the extension's own message on `err.message`. See Proposed decision 7.
3. **#148 "renderers in the SDK print `(hidden: …)`"**: the SDK has no tab-row renderer (`formatSnapshot`,
   `formatNetwork` and `report()` print no `listTabs` row), so the SDK change is `TabInfo.hidden`; the MCP renders
   the labels. Nothing was added to the SDK's value list.
4. **Redaction outlives the extension socket** (stricter than the brief's "a null state redacts nothing"): see
   Proposed decision 2. Before any report in the daemon's life nothing is redacted, as the brief says.

## 6. Proposed decisions (decisions.md format)

**1. 2026-10-24 · `safetyStatus` is never sent with null**
Decided: the daemon broadcasts `safetyStatus` only with a `SafetyState`; a reset to null (extension socket closed,
or a new extension hello) is visible through `daemon.status.safety` and the existing `extensionStatus`.
Why: `SafetyStatusParams` is `SafetyState` (S0, #132); a null param would fail `isSafetyStatusEvent` at every SDK.
Instead of: a null broadcast; a new event. Revisit if: a client must learn the reset without `extensionStatus`.
By: Claude (contract-level — what an event carries; for user review).

**2. 2026-10-24 · The daemon's redaction follows the last state received, across extension sockets**
Decided: `daemon.status.safety` goes null when the extension socket closes (#132), but the redaction of #134
(rows without `url`, `tabGone`/`TAB_GONE` without `lastUrl`/`lastTitle`, `leaseGranted.url` `""`) keys on the last
state received in this daemon's life, so it continues while a disarmed extension is away (reload, Chrome
restart) until the extension reports again. Never reported → nothing redacted.
Why: conservative rule — the cache still holds URLs learned before the disarm, and a reload's hello comes up to
2 s later (CLAUDE.md), a window in which "null redacts nothing" would serve them. Undoable; unchanged while armed.
Instead of: null redacts nothing (the brief's reading), which reopens F2's leak during every reconnect.
Revisit if: a disarmed state must be forgotten when the extension is gone for good.
By: Claude (contract-level — what the daemon reveals; for user review).

**3. 2026-10-24 · A new extension hello resets the reported state to null**
Decided: `safety` is null from each extension hello until that socket reports, not only after a close (an old
socket replaced while still open never "closes" as current, B7).
Why: the state belongs to the socket that reported it. Instead of: keeping the old socket's state. Revisit if: a
`browser_status` taken in that window is shown to mislead. By: Claude.

**4. 2026-10-24 · `leaseGranted.url` is `""` while disarmed, whatever the event carried**
Decided: in addition to F40 (hidden row → `""` at once), the daemon sends `url: ""` while the last state says
disarmed, even if a `tabCreated.url` arrived non-empty.
Why: every other daemon output withholds urls while disarmed (#134); this one channel would otherwise depend on
the extension alone. Instead of: relaying the event's url. Revisit if: never (no change while armed).
By: Claude (contract-level — what an event reveals; for user review).

**5. 2026-10-24 · `browser_status`'s Safety line is a second text item, shown only with the extension connected**
Decided: when the extension is connected, `browser_status` returns `[today's text, "Safety: …"]`; with the extension
not connected, today's single item (the state is null then and "reload the extension" would mislead).
Why: see Deviation 1 — the only placement that keeps every existing line's text and order and every existing test
unedited. Claude Code delivered both items of a non-error `[text, image]` result (S6b); two text items in a
non-error result are not measured — S4 should read the line from a live transcript.
Instead of: a new line in the first item (breaks the expected text of the Step 8 tests in `tools.test.ts` "S5 — browser_status's Cursor…" and `s5-cross.test.ts` (a) — forbidden); appending
` · Safety: …` to `Extension: connected` (changes an existing line's text).
Revisit if: S4's transcript shows the second item is not shown to the model.
By: Claude (contract-level — what the agent sees; for user review).

**6. 2026-10-24 · The refusal wording**
Decided: `DISARMED` all — "DISARMED: the user has turned the bridge off in Chrome. Stop and ask the user to turn it
back on; do not retry."; `DISARMED` evaluate — "DISARMED: the user has turned JavaScript off for the bridge in
Chrome, so evaluate (browser_evaluate) is refused; every other call still works. Ask the user before relying on
it; do not retry it."; `DOMAIN_BLOCKED` — "DOMAIN_BLOCKED: the user has blocked this site for the bridge in Chrome.
Stop and ask the user; do not retry, and do not try to reach the site another way." One wording for the SDK and
the MCP. A `DISARMED` without a valid `data.scope` reads as `"all"`.
Why: #133's two meanings; the stricter reading when the scope is missing. Instead of: separate SDK/MCP wordings;
appending the extension's message (it may differ by build). Revisit if: S4's actors misread a line. By: Claude.

**7. 2026-10-24 · Safety refusals get no `report` property; the line is `safetyRefusalLine` on `@bridge/sdk/report`**
Decided: see Deviation 2. `@bridge/sdk/report` gains one value, `safetyRefusalLine`; `renderReport` returns it for
the two codes. The main entry keeps its eight values.
Why: Step 8's attach-set contract test pins "no property for a non-attach code"; editing it is forbidden.
Instead of: setting `err.report` on `Tab` errors for the two codes (breaks that test); a new main-entry value
(the eight values are pinned). Revisit if: scripts need `err.report()` on a safety refusal.
By: Claude (contract-level — the SDK's surface, a subpath value; for user review).

**8. 2026-10-24 · The SDK exports the types `SafetyState` and `HiddenReason`**
Decided: type-only exports from `sdk/src/index.ts`, since `client.safety()` returns one and `TabInfo.hidden` is the
other. Why: callers can name what they get. Instead of: making them import `@bridge/shared`. Revisit if: the type
list is to stay frozen too. By: Claude (contract-level — exported types; for user review).

**9. 2026-10-24 · The MCP turns the two codes into the line in one wrapper over every tool**
Decided: `registerTools` registers through `withSafetyRefusals(server)`, so every tool — including those outside
`onTab` (`browser_new_tab`, `browser_close_tab`, `browser_download`, the network `id` lookup) — answers the line.
Why: one place, no tool missed. Instead of: per-tool catches. Revisit if: a tool must render a refusal otherwise.
By: Claude.

**10. 2026-10-24 · Hidden rows in the daemon: `"blocked"` clears, `"disarmed"` (or any other marker) keeps**
Decided: `record()` skips noting any hidden row and clears the cache only for `"blocked"`; `tabRemoved
{hidden:"disarmed"}` keeps the cache (today's `remove` behaviour with no `lastUrl`). The SDK sets `TabInfo.hidden`
only for a valid `HiddenReason`. Why: #134 as written. Revisit if: never. By: Claude.

## 7. Unfinished

Nothing in the brief is left unbuilt. Not done by design: no live run, no extension change (S2a's).

## 8. What S2a's extension must send for the relay to work

- **Event** `{"event":"safetyState","params":{"armed":<bool>,"evaluate":<bool>,"blockedCount":<non-negative safe
  integer>}}` — no `id`; exactly these three keys matter (extra keys are dropped by the daemon, never relayed). Send
  it **each time the connection comes up** (after the welcome, `ws-status` true) and **on every change** of any of
  the three. A frame named `safetyState` that fails `isSafetyState` is dropped (logged content-free).
- `blockedCount` counts the **valid** patterns only (#135); never send a pattern.
- `listTabs` rows: a hidden row omits `title` and `url` and carries `hidden: "disarmed" | "blocked"`; the daemon
  then stops a popup's url fill at once and, for `"blocked"`, clears its cache.
- `tabRemoved`: for a hidden tab, no `lastUrl`/`lastTitle`, and `hidden: "disarmed" | "blocked"` (`"blocked"`
  clears the daemon's cache for that handle).
- `tabCreated.url`: `""` for a tab created while disarmed or onto a blocked URL (#134, #146).
- Refusals: `DISARMED` with `data: {scope: "all" | "evaluate"}`, `DOMAIN_BLOCKED`; the MCP and the SDK read the
  scope from `data.scope`.
