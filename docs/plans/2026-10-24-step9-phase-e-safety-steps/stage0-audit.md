# Step 9 Stage 0 — spec audit (findings)

Auditor: Stage 0 builder (Claude Opus 5.5), 2026-10-24, at `a0700e0` (baseline `59be263` + the run-opening
docs commit). No feature code was written. Evidence files beside this one:
`stage0-evidence-contracts.txt` (Step 8 contracts, executed), `stage0-evidence-premises.txt` (Step 9 premises,
executed), `stage0-probe.test.ts.txt` (the throwaway probe's source; it ran as `mcp/test/zz-stage0-probe.test.ts`
and was deleted). Every socket bound 127.0.0.1 port 0; the real daemon and Chrome were never touched.

Glossary used below: **gate** = the planned `safetyDecision` check in the extension; **post-check** = the same
check run again just before a reply is sent (proposed here); **attach set** = the 7 codes on which the SDK
attaches a failure report (`sdk/src/error.ts:66`); **TabInfoCache** = the service worker's last url/title per tab
(`extension/src/tab-events.ts`), the source of `tabRemoved.lastUrl/lastTitle`.

Severity count: **CRITICAL 2 · MAJOR 14 · MINOR 18 · NIT 9** (43 findings, F1–F43).
*Fixer r1 (2026-10-24): was "MINOR 14 … 39 findings, F1–F39"; F40–F43 added from the verifier's V4, V5, V12a,
V12b; every file:line re-checked against `a0700e0` (corrections listed in `stage0-fixer1.md`); V1–V17 folded in
(see that report). A bare `tabs.ts` below is `extension/src/tabs.ts`; the handlers are always prefixed
`handlers/`.*

## 1. Counts (recomputed 2026-10-24)

| Item | Phase doc / kickoff | Measured | Command |
|---|---|---|---|
| Router methods | 23 | **23**: navigate snapshot screenshot click type scroll hover selectOption pressKey back forward listTabs focusTab newTab closeTab waitFor evaluate locate networkRequests networkClear downloadStart downloadChunk downloadEnd — identical to 0.1's list | `grep -c "router.on(" extension/src/sw.ts` → 23 |
| Codes | 23 (22 wire + `NO_CURSOR`) → 25 (24 wire) | **23** = 9 daemon + 13 extension + 1 SDK (`shared/src/codes.ts:8-42`) | read |
| MCP tools | 23 | **23** | `grep -c "server.tool(" mcp/src/tools/registry.ts` → 23 |
| `npm test` | 1714 / 85 | **1714 passed, 85 files** (20.4 s) | `npm test` 08:53Z |
| `npm run typecheck` | exit 0 | **exit 0** | |
| `npm run build` | exit 0, no tracked change | **exit 0**; `git status --short` after build: only the untracked `stage0.ledger.md` | |
| Node / npm | v25.2.1 / 11.6.2 | same | `node -v`, `npm -v` |
| Log call sites | — | 21 `console.*` sites across `extension/src daemon/src sdk/src mcp/src`, plus the daemon's injected `log(` calls | `grep -rn "console\.\(log\|warn\|error\|info\|debug\)" … \| wc -l` |

Every count in the phase doc holds (F31).

## 2. Step 8 contracts — re-executed (all HELD)

Commands and raw output: `stage0-evidence-contracts.txt`. Probe = `npx vitest run mcp/test/zz-stage0-probe.test.ts`
(real `WsHost` + real SDK `connect()` + fake proto:2 extension, port 0).

| # | Contract | Verdict | Discriminating evidence |
|---|---|---|---|
| C1 | Attach set = 7 codes | **HELD** | probe C1: each of `LOCATOR_NOT_FOUND LOCATOR_AMBIGUOUS REF_STALE OFFSCREEN PAGE_ERROR NAV_FAILED TIMEOUT` → `attachCalls=["networkRequests","screenshot","snapshot"]`; `RESTRICTED_URL`, `INTERNAL`, `DEBUGGER_ATTACH` and the future strings `DISARMED`, `DOMAIN_BLOCKED` → `attachCalls=[]`. Existing: `sdk/test/failure-report.test.ts:187-189` `expect([...ATTACH_CODES].sort()).toEqual([...SEVEN].sort())` (1 passed) |
| C2 | `code` required; codeless → `INTERNAL` on receipt, logged once per connection | **HELD** | probe C2: `e1=INTERNAL/no code here e2=INTERNAL logLines=["extension error without code: click"]`; existing `daemon/test/tabs.test.ts:1312` (`-t "S2b.4"`, 2 passed) |
| C3 | Session marker branches; retire on change | **HELD** | probe C3: the 6 `chooseMarker` branches (worker-restart reuse, chrome-start fresh, reload reuses local, reload with no local fresh, chrome-update fresh, no-event fresh); same marker → call ok; marker A→B → `TAB_GONE`, one `tabGone` to the holder, log `extension session changed: 2 handles retired` (the unheld human tab counts). Existing `extension/test/session-marker.test.ts` 19 passed |
| C4 | Handle numbers never reused across daemons | **HELD** | probe C4: daemon A minted `T2`, daemon B on the same mark dir `T66`; A's `T2` on B → `TAB_UNKNOWN`. `daemon/test/handle-mark.test.ts` 10 passed |
| C5 | MCP cursor rule | **HELD** (existing tests only) | `mcp/test/tools.test.ts:167-174` "an explicit `tab` does not move the cursor": `expect(f.work().map(([, p]) => p?.tab)).toEqual(["T1", "T9", "T1"]); expect(f.claims()).toBe(1)`; `-t cursor` 30 passed; `cursor.test.ts` 18 passed; `s5-cross.test.ts -t "the cursor stays"` 1 passed |
| C6 | `TAB_HELD {owner, since}` fail-fast | **HELD** | probe C6: `code=TAB_HELD data={"owner":"probe-owner","since":…} reachedExtension=[]` |
| C7 | Visibility lock FIFO; `LOCK_TIMEOUT {holder}` | **HELD** | probe C7: forwarded `200@0, 201@315, 202@629` (each after the previous answer at 315/628); waiter with `timeoutMs:150` → `LOCK_TIMEOUT {"holder":"probe-lock-a"}`, never forwarded. `lock.test.ts:61` "is FIFO" `expect(order).toEqual(["B", "C"])` |

Two facts the runs surfaced that Step 9 depends on: a call queued on the lock **is forwarded** once granted (C7) —
so "a queued call must be refused" holds only through the extension's gate at receipt; and `tabGone` after a
retire **carries the daemon-cached `lastUrl`/`lastTitle`** (C3) — see F2.

## 3. Findings

### CRITICAL

**F1 · plan-side (0.1, 0.3) · One gate before the handler does not cover in-flight work; the handlers are
multi-step.** A call that passed the gate keeps running after disarm, and several handlers start *new*
privileged steps late: the untrusted `click`/`type` escalate to a fresh CDP session after the content path fails
(`extension/src/handlers/actions.ts:41-57, 74-94`); `evaluate {asRef}` runs a second debugger session to sweep its
mark (`handlers/evaluate.ts:48-80`, `sweepMark` at `:85`); the switch-mode screenshot waits for its capture slot
and up to 1 000 ms + 50 ms before `captureVisibleTab` (`extension/src/tabs.ts:161-200`, `showTab` at `:228-251`);
`downloadStart`'s fetch can finish after disarm (`handlers/download.ts:27-40`). So 0.3's "every debugger session
is detached at disarm" can be undone by a handler that attaches after the detach, and a capture or an evaluate
result can be returned after the human pressed OFF — in effect a page call that the gate did not stop. A disarm
that lands between receipt and the first side effect (e.g. during the screenshot's slot wait, `tabs.ts:187-195`)
still switches the human's window — a visible side effect no post-check undoes (V17).
*Amendment for 0.1:* "*Amended 2026-10-24 (Stage 0 F1): the gate runs at receipt, again right before each
first side effect (`showTab`, `captureVisibleTab`, `tabs.update`/`create`/`remove`, each action's `callInPage`
and trusted input), and again just before the reply (the post-check); each run re-reads the state (D8). Order
in every run: the state first — disarmed → `DISARMED {scope:"all"}`; JavaScript off and an `evaluate` →
`DISARMED {scope:"evaluate"}` — then the tab. The tab test: a live tab is tested by its current `url` and
`pendingUrl`; a tab replaced during the call (`tabs.onReplaced`) is tested under its new id; a tab that no
longer exists (closed during the call, or unreadable) is tested by the last URL the worker knew for it, and when
none is known, or it is not blocked, **the reply stands as today**. So with the state armed, JavaScript on and
an empty block list, no run of the gate ever changes a reply, including for `evaluate("window.close()")`, a
click that closes its popup, or a call across a Memory-Saver replacement. At receipt, a tab that cannot be read
is left to the handler (today's `TAB_UNKNOWN`). `newTab` and `closeTab` post-check the state only; `listTabs` is
redacted, not refused (D3). Every new `chrome.debugger.attach` re-checks the gate (`withDebugger`), and every
service-worker poll loop re-checks it per tick. Side effects already done are not undone.*" Code-side: S1 (pure
gate and post-check predicate over `{state, target: live {urls} | replaced {urls} | gone {lastUrl?}}`), S2
(wiring).

**F2 · plan-side (0.3, 0.4, 0.6) · URL/title redaction in `listTabs` alone leaks through events and the daemon's
cache.** (a) `tabCreated {url}` and `tabRemoved {lastUrl, lastTitle}` are sent from top-level listeners outside
the router (`sw.ts:107-122`), so the gate never sees them; 0.3 redacts only `listTabs` while disarmed, and 0.4
redacts events only for blocked tabs — a tab the human opens while disarmed still sends its URL. (b) The daemon
caches every URL/title it sees (`daemon/src/intercept.ts:212` from `tabCreated`, `478-490` from `listTabs`;
`handles.ts:105-111` `note` never clears) and serves it in `daemon.status` (`intercept.ts:334-343`), in
`tabGone` (`intercept.ts:316-324`) and in `TAB_GONE`'s data (`intercept.ts:427-435`). The extension's side:
`tabCreated.url` is `tab.pendingUrl ?? tab.url` (`extension/src/tab-events.ts:90`) and `tabRemoved`'s
`lastUrl`/`lastTitle` come from the always-updated cache (`tab-events.ts:96-101`, fed at `sw.ts:113-115`). Executed: after the extension switched to redacted rows,
`daemon.status` still returned `["T2","http://localhost:8080/x"]` (premises P1); a retire's `tabGone` carried
`lastUrl`/`lastTitle` (contracts C3). So, as proposed, a URL the human opens during disarm reaches any client via
`daemon.status`.
*Amendment for 0.3:* "*Amended 2026-10-24 (Stage 0 F2): while disarmed, `tabCreated.url` is `""` and
`tabRemoved` carries no `lastUrl`/`lastTitle` but `hidden: "disarmed"`; the same for a blocked tab (by its URL at
the event) with `hidden: "blocked"`. The daemon, while the last safety state it received says disarmed, omits
`url` from `daemon.status` rows and `lastUrl`/`lastTitle` from `tabGone` and `TAB_GONE` (it keeps its cache, so
re-arming restores today's output); a `listTabs` row or `tabRemoved` with `hidden: "blocked"` clears that
handle's cached url/title (F41); the opener rule's `leaseGranted.url` carries what the redacted sources gave
(F40).*" Code-side: S1 (pure event redaction), S2 (`sw.ts`, `tab-events.ts`), S3 (daemon output).

### MAJOR

**F3 · plan-side (0.4) · Own extension pages: the block is required, not merely proposed, and must cover
`pendingUrl`.** No `web_accessible_resources` in `extension/manifest.json` (pages cannot open
`chrome-extension://…`), and `downloadStart` refuses non-http(s) (`handlers/download.ts:19`). But the extension
itself can `chrome.tabs.update`/`create` to its own `options.html` (`handlers/navigate.ts:11`,
`handlers/tabs.ts:73`), and by Chromium's attach rule an extension's debugger is refused only on *other*
extensions' pages — the Chrome docs found by one search do not state the own-page case
([chrome.debugger reference](https://developer.chrome.com/docs/extensions/reference/api/debugger)), so it is
**assumed reachable** until S4 measures it. Reachable means `evaluate` in `options.html` runs with the
extension's full `chrome.*` (it could write the safety state) and trusted input could flip the switches.
*Amendment for 0.4:* "*Amended 2026-10-24 (Stage 0 F3, narrowed by fixer r1 / V8): the own-page block is
required: every method on a tab whose `url` or `pendingUrl` is one of this extension's own pages
(`chrome-extension://<chrome.runtime.id>/…`) is refused `DOMAIN_BLOCKED` and its `listTabs` row and events are
hidden as `"blocked"`; `navigate`/`newTab` to **any** `chrome-extension://` URL (any id) is refused
`DOMAIN_BLOCKED` (nothing uses it today). A tab showing another extension's page, opened by the human, is
treated as today (Chrome already refuses scripting and the debugger there, `inject.ts:9`). Whether
`chrome.debugger` can attach to the own options page is measured in S4 (SAFE-7c), not assumed safe.*"
Code-side S1/S2. *Fixer r1: was "every method on a tab whose url is a `chrome-extension://` URL — any extension
id", because blocking every id changes `navigate`-away, `closeTab`, `focusTab` and `listTabs` titles for other
extensions' pages while armed with an empty list, for a small gain (V8b); the wider rule is kept as an option
in D7 for the user.*

**F4 · code-side S2 · `storage.local` is readable and writable by content scripts by default.** Chrome's storage
docs: local storage "by default … is exposed to content scripts, but this behavior can be changed by calling
`chrome.storage.local.setAccessLevel()`" ([chrome.storage](https://developer.chrome.com/docs/extensions/reference/api/storage)).
The safety state will live there (0.2), next to the token (`sw.ts:157`). Our content script never uses
`chrome.storage` or `chrome.runtime` (`grep -rn "chrome\.\(storage\|runtime\)" extension/src/content/` → empty),
so restricting costs nothing (the options page is an extension page, a trusted context; `offscreen.ts` uses only
`chrome.runtime` messaging). Item: S2 calls `chrome.storage.local.setAccessLevel({accessLevel:
"TRUSTED_CONTEXTS"})` at module scope of `sw.ts`, **after** every listener registration, guarded so it can never
throw synchronously (`chrome.storage.local.setAccessLevel?.(…)?.catch(() => {})` inside `try`), not awaited — a
synchronous throw above the listeners (e.g. the method missing; the manifest's `minimum_chrome_version` is
`"116"`) would stop them registering (V7). A failure leaves nothing to undo. Without it, any code that reaches
the content-script world can change the safety state (an integrity-floor class).

**F5 · plan-side (0.3) · "`waitFor` polls stop at their next tick" is false for two of the four arms.** The text
arm polls inside the page for up to 10 s (`handlers/wait.ts:36-47`, one `executeScript` the worker cannot
interrupt) and the `seconds` arm is a plain sleep of up to 60 s (`wait.ts:25-28`). Only the locator arm
(`locator-wait.ts:43-77`) and the network-idle arm (`wait.ts:131-139`) tick in the worker.
*Amendment for 0.3:* "*Amended 2026-10-24 (Stage 0 F5): the locator and network-idle waits re-check the gate
each tick and end `DISARMED`/`DOMAIN_BLOCKED`; the text wait (page-side, ≤ 10 s) and the `seconds` wait end on
their own and their reply is replaced by the post-check (F1). A seconds-wait may also be cut by a 100 ms
re-check loop (build choice).*" Each tick also re-checks the tab's URL, so a tab the human navigates onto a
blocked site mid-wait cannot answer "text found" from the blocked page.

**F6 · code-side S2 · The extension keeps no record of its debugger sessions.** `withDebugger` attaches, runs,
detaches, with no bookkeeping (`extension/src/debugger.ts:19-38`). `chrome.debugger.getTargets()` reports
`attached` but not *who* attached (DevTools counts too), so "detach every session the extension holds" needs a
registry. A detach mid-command surfaces as "Detached while handling command" → `DEBUGGER_CANCELLED`
(`debugger-errors.ts:51`), not `DISARMED`. Items: a pure session registry (attach/detach injected, unit-tested —
this also makes S2.2 testable without mocking `chrome.*`); `withDebugger` refuses to attach while refused by the
gate; an error from a session the disarm detached becomes `DISARMED`.

**F7 · plan-side (0.1) · The gate's signature cannot express what the plan asks of it.**
`safetyDecision(method, params, tabUrl, state) → allow | {code…}` lacks: a redaction outcome (`listTabs` is
allowed but rewritten); two URLs per tab (`url` and `pendingUrl` — during a navigation `url` is still the old
page); the target URL of `navigate`/`newTab`/`downloadStart` (from `params.url`); a tab gone or replaced during
the call (F1); the network scope — what the extension receives is a `tabId` (the daemon already resolved an
absent or `"active"` `tab`, `daemon/src/intercept.ts:532-534`), `scope: "all"` (filter, not refuse), or an `id`
lookup forwarded with neither (`intercept.ts:530`, "a request-id lookup is global"; `handlers/network.ts:16-21`).
*Amendment for 0.1:* "*Amended 2026-10-24 (Stage 0 F7): `safetyDecision(method, params, target, state)` where
`target` is `live {urls}` (the tab's `url` and `pendingUrl`), `replaced {urls}` (under the new id), `gone
{lastUrl?}`, `own {url}` (the call's own URL for `navigate`/`newTab`/`downloadStart`) or `none` (a global
network `id` lookup, `scope: "all"`), returns `allow | {redact: "disarmed" | "blocked"} | {code, message,
data?}`; the network methods resolve their scope (`tabId` | `"all"` | `id`) first.*"

**F8 · plan-side (0.4) · `downloadStart`'s "final URL" check comes after the blocked host was already
requested.** `fetch(url, {credentials: "include", redirect: "follow"})` (`handlers/download.ts:27`) follows
every hop with the profile's cookies; `res.url` is known only when the last response's headers arrive, and the
body is read (`handlers/download.ts:34`) and stored (`:42`) before `finalHost` is computed (`:43-45`). `redirect: "manual"` gives an opaque
redirect whose `Location` cannot be read, so the worker cannot vet hops itself; webRequest is non-blocking in MV3.
*Amendment for 0.4:* "*Amended 2026-10-24 (Stage 0 F8): `downloadStart` checks its URL before fetching and
`res.url` as soon as `fetch` resolves, aborting the body read; a redirect hop onto a blocked host is still
requested (cookies included) — the bytes are never kept. Blocking the hop itself would need a
`declarativeNetRequest` session rule (a new manifest permission): an open decision for the user, the same one
that would stop a bridge `navigate` bounced by an allowed redirector onto a blocked host (D9, V13).*" Related,
by reading only (unmeasured): the worker's own fetches are logged under tab `-1`
(`network-log.ts:455`) and the `"all"` scope returns every tab including `-1` (`network-log.ts:494-498`), so a
download's redirect URLs may be listed by `browser_network_requests {tab:"all"}` — the network filter (F9) must
cover tab `-1`; S4 row SAFE-5d measures it.

**F9 · plan-side (0.3, 0.4) · The network filter, as proposed, misses four paths.** (a) Entries keep
`redirectUrl` and `initiator` (`network-log.ts:265`, `461`): an allowed request redirected onto a blocked host
stores the blocked URL; a blocked page's sub-requests to other hosts (analytics with account ids in the query)
have an allowed `url` but a blocked `initiator`. (b) An ingest-only filter keeps entries recorded before the
human added a pattern (they are also rehydrated from `storage.session`, `network-state.ts:49-59`). (d) An `id`
lookup is global (`daemon/src/intercept.ts:530`, `handlers/network.ts:16-21`): the filter must drop a blocked
entry found by id too (V10). (c) The
ingest point is synchronous (`sw.ts:53-57`): it cannot `await` the state, and events arrive before the state is
read after a worker start.
*Amendment for 0.3/0.4:* "*Amended 2026-10-24 (Stage 0 F9): an entry is dropped at ingest when the state is
disarmed, or when its `url`, `redirectUrl` or `initiator` host is blocked, or the tab's last known top-level URL
is blocked; the same predicate (minus "disarmed") filters every query, an `id` lookup included, so a pattern
added later hides older entries. Events that arrive before the stored state is read are held in memory (bounded) and decided once it
is read. Entries recorded before a disarm stay (they were recorded while armed).*"

**F10 · plan-side (0.2) · "A call never acts on a state older than the last change" cannot hold with an
`onChanged` cache.** The options page writes `storage.local` directly (`options.ts:11`); the worker learns it
only when `storage.onChanged` is delivered, so a call landing in between reads the old cache.
*Amendment for 0.2:* "*Amended 2026-10-24 (Stage 0 F10): the router's gate reads `chrome.storage.local.get`
per call, after a `ready` promise (the `network-state.ts` model, no top-level `await`); the toolbar/shortcut
toggles update an in-memory copy synchronously before writing; the copy serves only the synchronous webRequest
filter. A failed read refuses the call (fail closed) with `DISARMED` and a message saying the state could not
be read. Missing keys mean the defaults (armed, JavaScript on, empty list).*"

**F11 · code-side S2 · The switch-mode capture never checks what it captured.** `captureWithRetry` captures the
window's visible tab (`tabs.ts:253-260`) after waiting up to 1 s for activation (`tabs.ts:228-251`); if the
human switches that window to another tab meanwhile (e.g. a blocked one), that tab is captured and returned.
Item: after the capture, re-read the window's active tab; if it is not the target, or its URL is blocked, discard
the image and refuse. (Pre-existing; Step 9 makes it a block-list leak.)

**F12 · plan-side (0.6) · The safety state should not ride the hello, and the daemon drops unknown extension
events.** The hello is built in the offscreen document (`extension/src/client.ts:9-12` `helloFrame`) from the
worker's `connect` message (`offscreen.ts:6-31`); the worker already passes `session` that way (`sw.ts:185-187`,
`offscreen.ts:12-13`), so the state *could* ride it — but the hello is sent once per connection, and the
offscreen document keys its client on `port:token:session` (`offscreen.ts:13-19`), so a state carried there
would force a reconnect on every change (V14). An unknown extension→daemon event is counted and
dropped (`wsHost.ts:297-300`; `intercept.ts:207-230` has no `else`) — executed: P3 `clientSawEvents=[]
extensionEventsCounted=1`. The SDK tolerates unknown daemon→client events (`sdk/src/client.ts:521-533`; P3
`listTabsAfter=ok`), and `isHello`/`isWelcome` tolerate extra keys (`shared/src/protocol.ts:151-173`). Ruling
proposed in §8 (D1).
*Amendment for 0.6:* "*Amended 2026-10-24 (Stage 0 F12): the state is not carried on the hello. The service
worker sends an extension→daemon event `safetyState {armed, evaluate, blockedCount}` each time its connection
comes up and on every change; the daemon keeps the latest (null until reported, null again when the extension
socket closes), adds `safety: {armed, evaluate, blockedCount} | null` to `daemon.status`, and relays a
daemon→client event `safetyStatus` with the same params on every change. An old daemon counts and drops the
unknown event; an old SDK ignores the unknown event (D1).*"

**F13 · code-side S3 · The MCP prints `undefined — undefined` for a redacted row.** Executed (P2):
`browser_list_tabs` → `"T1* undefined — undefined"`; `browser_status` → `Active tab: [T1] undefined — undefined`
(`mcp/src/tools/registry.ts:343, 352, 357-358, 553`). The SDK's `tabs()` already maps absent fields to `""`
(`sdk/src/client.ts:348-349`; P1 `[["T1","",""],…]`). Item: S3 renders `(hidden: the bridge is off)` /
`(hidden: blocked site)` from the redaction marker (D3).

**F14 · plan-side (0.5) · The JavaScript switch has bypasses besides `evaluate`.** `navigate`/`newTab` take any
URL (`handlers/navigate.ts:5-11`, `handlers/tabs.ts:72-73`): a `javascript:` URL runs agent-chosen script in the
page (Chrome's MV3 `tabs.update` is believed to refuse it — unmeasured; today a refusal surfaces as `NAV_FAILED`
with Chrome's text, `navigate.ts:13-16`), and a `data:text/html,<script>…` URL runs script in an opaque-origin page
(no user data, but still "JavaScript").
*Amendment for 0.5:* "*Amended 2026-10-24 (Stage 0 F14): while JavaScript is off, `navigate`/`newTab` to a
`javascript:`, `data:` or `blob:` URL are refused `DISARMED` with `data.scope: "evaluate"`; while it is on they
behave as today (Chrome decides). S4 measures Chrome's own answer to `javascript:` with JavaScript on as a record
(SAFE-6c).*" Contract-level → for user review. *Fixer r1: was "`javascript:` refused always (`BAD_PARAMS`)",
because that changes today's answer (`NAV_FAILED`, or Chrome running it) while armed with JavaScript on, and
with JavaScript on a `javascript:` URL grants nothing `evaluate` does not (V8a).*

**F15 · plan-side (testability) · Four exit checks cannot fail or are not discriminating.** S2.3 (`grep -rn
"safety" extension/src` — a log line printing a URL need not contain "safety"); S3.3 (a grep for
`arm|disarm|setSafety|block` — a method named otherwise passes); S2.2 ("else an E2E row" is an escape hatch); S4.4
(a block list compared by line count passes when a pattern changed). Stricter wording in §6.

**F16 · plan-side (threat model) · The block list is not a network firewall, and the plan does not say so.**
Page script on an allowed page (an agent's `evaluate`, a meta refresh, `window.open`, a form post) and
`back`/`forward` (`handlers/history.ts:3-12`, target unknown in advance) can make Chrome load a blocked host with
cookies; the bridge only refuses to read or act there afterwards (plus the post-check). A cross-origin `<iframe>`
of a blocked host inside an allowed page is not walked by the snapshot (same-origin frames only — CLAUDE.md
"Snapshots…"), but **is visible in a screenshot**, and its sub-requests are dropped from the network log only by
the `initiator` rule (F9).
*Amendment (new paragraph under 0.4):* "*Amended 2026-10-24 (Stage 0 F16): what the block list does and does
not do — it refuses every bridge call on a tab whose top-level URL is blocked and every navigation the bridge
itself starts to one; it does not stop a page from loading a blocked host, and a blocked host framed inside an
allowed page shows in that page's screenshots. `docs/setup.md` "Safety" says so.*"

### MINOR

**F17 · code-side S1/S2 · S1.1's test cannot import `sw.ts`** (every line from `sw.ts:59` on calls `chrome.*` at
module load). A source-text scan works but misses a method registered through a variable. Stricter: `Router.on`
throws when a method has no class in the safety table (structural), plus S1.1's source scan.

**F18 · plan-side (lanes) · S2's lane omits files the work needs:** `tab-events.ts` (event redaction, F2),
`network-log.ts` (query filter, F9), `tabs.ts` (`pendingUrl` read, capture verification, F11), `download.ts`
(store clear at disarm), `network-scope.ts` (scope resolution, F7). *Amendment:* "*Amended 2026-10-24 (Stage 0
F18): S2's lane is `extension/src/**` except `content/**` and `safety.ts` (S1's), plus `options.html`,
`manifest.json`, `extension/test/`.*" S3's lane has no `shared/`: every wire type S3 needs must land in S0.

**F19 · code-side S2 · The router answers any extension context.** `chrome.runtime.onMessage` runs any
`{target:"sw", type:"ws-message"}` through the router (`sw.ts:200-207`) — the offscreen document, but also the
options page and content-script worlds. The gate covers it, but defence in depth: accept only when
`sender.url` is this extension's `offscreen.html` **and** `sender.tab === undefined` — a *tab* showing
`chrome-extension://<id>/offscreen.html` (the human can open it) has the same `sender.url` and runs
`offscreen.ts` too (V6). (Alternative: check the context type via `chrome.runtime.getContexts`.)

**F20 · plan-side (0.2) · The shortcut.** Chrome's commands docs: the reserved `_execute_action` command triggers
the action and dispatches `action.onClicked`, not `commands.onCommand`; browser shortcuts always win over
extension ones ([chrome.commands](https://developer.chrome.com/extensions/commands)). A suggested key that
conflicts is left unassigned (known behaviour, not in the found docs → S4 reads `chrome://extensions/shortcuts`).
Whether `Alt+Shift+K` is free in Chrome 156 is not documented in the results → S4 row. On Windows, Alt+Shift can
switch the input language (unmeasured with K in the chord) → S4 row reads the keyboard layout before/after.
Proposed build decision D11: `_execute_action` with `suggested_key Alt+Shift+K`, one `action.onClicked` listener.
*Amendment for 0.2 (fourth bullet) and S2's deliverable:* "*Amended 2026-10-24 (Stage 0 F20): the shortcut is
the reserved `_execute_action` command (`suggested_key` `Alt+Shift+K`), which Chrome dispatches as
`action.onClicked`; one top-level `action.onClicked` listener serves the button and the shortcut, and there is
no `commands.onCommand` listener (D11). Whether the key is assigned (a conflicting suggestion is left
unassigned) and whether Alt+Shift changes the Windows input language are read in S4 (SAFE-2).*"

**F21 · plan-side (0.3) · `tabs.claim {active:true}` on a blocked tab, and the MCP's first touch while
disarmed.** The claim is the daemon's (`intercept.ts:570-587`; `{active:true}` forwards only `listTabs` and picks the `current` row, `intercept.ts:470-475` — a redacted row keeps `current`); any client can already
claim an unheld tab by handle, so refusing `{active:true}` alone protects nothing and would need the daemon to
know the block list (0.1 keeps it out). Ruling D5: claim succeeds, every page call on it is refused. Consequence
to document: the MCP's first untargeted tool while disarmed claims the human's tab, then gets `DISARMED`; the
cursor stays there after re-arming (cursor rule unchanged). A held blocked tab's popups are leased to the holder
at once by the opener rule (`intercept.ts:213-217`, with `leaseGranted`) — equivalent to claiming by handle (V16).
*Amendment for 0.3 (first bullet):* "*Amended 2026-10-24 (Stage 0 F21): `tabs.claim` (by handle or
`{active:true}`) and the opener rule's grants are never refused for safety — they are bookkeeping, and the
daemon does not know the block list. On a claimed tab that is blocked, or on any tab while disarmed, every page
call is refused by the extension. The MCP's first untargeted tool while disarmed therefore claims the human's
tab and gets `DISARMED`; the cursor stays on that tab after re-arming (D5).*"

**F22 · plan-side (0.4) · Pattern grammar is underspecified** — does `localhost:8081` include subdomains; what
port does `bank.example:443` mean; IDN; IPv6; comments; a pasted URL. Ruling D4 and the case table (§5).
*Amendment for 0.4 (first bullet):* "*Amended 2026-10-24 (Stage 0 F22): the grammar is stage0-audit.md §5 (D4).
Per line: trimmed; empty and `#` lines ignored; a pasted `http`/`https`/`ws`/`wss` URL is reduced to
`host[:port]`; otherwise `[*.]HOST[:PORT]`, HOST a DNS name (letters, digits, `-`, `_`, dots; Unicode accepted),
an IPv4 literal or a bracketed IPv6 literal; lower-cased, one trailing dot dropped, IDN to punycode, IP literals
canonicalised. `HOST` matches itself and its subdomains at a dot boundary, `*.HOST` subdomains only, an IP literal
only itself, `:PORT` only that effective port; anything else is invalid (kept, shown, matches nothing, not
counted). `blob:`, `filesystem:` and `view-source:` URLs are tested by their inner URL; a URL with no host never
matches. S1.3's cases are §5's table.*"

**F23 · plan-side (0.6) · `blockedCount` must count valid patterns only**, and the options page must show
invalid lines (red, with a count) — otherwise a typo silently blocks nothing while `browser_status` reads "1
blocked site".
*Amendment for 0.6 (first bullet):* "*Amended 2026-10-24 (Stage 0 F23): `blockedCount` counts the valid
patterns only; the options page marks each invalid line and shows how many there are.*"

**F24 · code-side S2 · In-flight downloads.** Dropping the store at disarm (0.3) does not stop a fetch in flight
(`handlers/download.ts:27-42`, fetch → body → `store.put`): it lands in the store after the drop. The post-check refuses its reply; the store entry
must also be released when the reply is refused.

**F25 · code-side S2/S3 · Failure reports while disarmed or blocked.** The attach set stays without the two codes
(probe C1, #120). An attach-set failure (e.g. `TIMEOUT`) whose attach calls land after a disarm gets them refused
(`attachErrors: ["snapshot: DISARMED…"]`) — no screen switch, because the gate refuses `screenshot` before
`activateForCapture`. S3 test: an attach while the fake extension answers `DISARMED` → report with
`attachErrors`, no PNG written.

**F26 · code-side S3 · The SDK's `focusFirst` while disarmed.** `Tab.click/type/pressKey({trusted:true})` sends
`focusTab` first (`sdk/src/tab.ts:165-168`); `focusTab` is refused `DISARMED`, so the trusted action is never
sent and the error is `focusTab`'s. Correct and conservative; S3 adds a test so it stays that way.

**F27 · plan-side (0.5) · One code for the JavaScript switch.** Ruling D2: `DISARMED` with `data: {scope:
"evaluate"}` (S0.2's 25 codes stand). The kill switch's refusals carry `data: {scope: "all"}` so a client can tell
them apart without parsing messages. The two must also *read* differently (V9): 0.6's MCP line for `DISARMED`
("the bridge is off — stop and ask") is wrong for `scope: "evaluate"`, where every other tool still works.
*Amendment for 0.5 (first bullet) and 0.6 (second bullet):* "*Amended 2026-10-24 (Stage 0 F27): one code —
`evaluate` while JavaScript is off is refused `DISARMED` with `data: {scope: "evaluate"}`; the kill switch's
refusals carry `data: {scope: "all"}`; 25 codes stand (D2). The extension's message, the MCP's line and the SDK's
`report()` differ by scope: `"all"` — the user turned the bridge off, stop and ask them; `"evaluate"` — the user
turned JavaScript off, every other tool still works, ask before relying on `browser_evaluate`.*"

**F28 · plan-side (0.7) · The log scan must include the daemon's injected logger.** Daemon lines go through
`options.log`/`deps.log?.(…)` (`wsHost.ts:240`, `intercept.ts:180, 203`), not `console.*`; a scan of
`console.*` alone misses them. The scan enumerates both, and a runtime test runs the gate, the matcher and the
toggles with a sentinel pattern/URL/token and asserts the sentinel is in no captured log line.
*Amendment for 0.7:* "*Amended 2026-10-24 (Stage 0 F28): the static scan enumerates every `console.*` call
site and every call of the daemon's injected logger (`options.log`, `deps.log`) in the four packages against
the allowlist, and a runtime test drives the gate, the matcher, the toggles and the daemon's safety relay with a
sentinel pattern, URL, title and token and finds none of them in any captured log line.*"

**F29 · code-side S2 · `asRef`'s mark can be left behind by a disarm.** Its sweep needs a new debugger session
(`handlers/evaluate.ts:68, 78, 85-91`), which F1/F6 forbid after disarm. Accept: the `data-__bridge-mark` attribute stays on one
element until the page reloads. Recorded so nobody "fixes" it by exempting the sweep from the gate (a forbidden
fix).

**F30 · plan-side (0.3) · The network methods' gate decision depends on what the daemon forwards.** A
`networkRequests`/`networkClear` with no `tab` (or `"active"`) means the human's tab (#81), but the daemon
already resolves it to a `tabId` before forwarding (`daemon/src/intercept.ts:532-534`), so the gate sees a
`tabId`, not "the human's tab", and needs no `humansTab()`; `tab: "all"` arrives as `scope: "all"`
(`:531`); an `id` lookup arrives with neither (`:530`). A `tabId` may name a closed tab whose log is still
queryable (`network-scope.ts:5-6`). *Fixer r1: was "its gate decision needs the human's tab URL (`humansTab()`)",
because the daemon resolves the tab first (V10).*
*Amendment for 0.3 (first bullet):* "*Amended 2026-10-24 (Stage 0 F30): the network methods are gated on what
the daemon forwards. While disarmed, all of them are refused `DISARMED`. While armed: a `tabId` is refused
`DOMAIN_BLOCKED` when that tab's URL (for a closed tab, the last URL the worker knew; none known → allowed) is
blocked; `scope: "all"` and an `id` lookup are never refused, but every entry they return passes the network
filter (F9), so a blocked entry is never returned, found by id or not.*"

*F40–F43 were added by fixer r1 from the verifier's V4, V5, V12a, V12b; numbered after F39 so no earlier
reference moves.*

**F40 · plan-side (0.3, 0.4), code-side S3 · `leaseGranted.url` is a URL channel too (V4).** The opener rule
(`daemon/src/intercept.ts:209-217`) sends `leaseGranted {url}` from `tabCreated.url` or from `fillUrl`'s
`listTabs` polls (`intercept.ts:255-277`). F2's redaction covers it transitively (`""` from the event, hidden
rows from `listTabs`), but `fillUrl` then keeps polling for a URL that never comes, up to `URL_FILL_MAX_MS`
(2 s), delaying the grant. Item: `fillUrl` stops at a row carrying `hidden` (the grant goes out with `url: ""`);
an S3 test (fake extension: hidden popup row → `leaseGranted` with `url: ""`, sent without the 2 s wait).
*Amendment for 0.3/0.4 (with F2's):* "*Amended 2026-10-24 (Stage 0 F40): the opener rule's `leaseGranted.url`
is `""` for a tab created while disarmed or onto a blocked URL; the daemon does not wait for a URL it will not
be given.*"

**F41 · plan-side (0.4), code-side S2/S3 · A URL cached before the human added a pattern stays served (V5).**
`note` never clears (`daemon/src/handles.ts:105-111`) and `remove` keeps the cached URL when the event has none
(`handles.ts:160-165`), so after a pattern is added `daemon.status`, `tabGone` and `TAB_GONE` keep serving the
now-blocked URL learned while it was allowed. §4 row (3)'s "the cache keeps the tab's last *allowed* URL,
acceptable" is therefore wrong for that case. Items: a `listTabs` row with `hidden: "blocked"` clears that
handle's cached url/title in `record()` (`intercept.ts:478-490`); a `tabRemoved` with `hidden: "blocked"` (D3)
marks the handle gone with no `lastUrl`/`lastTitle`; on every `safetyState` event whose `blockedCount` or
`armed` changed, the daemon runs one `listTabs` (as `resync` does) so the clear happens within one round trip.
While armed with an empty list no row is hidden, so nothing changes. S3 tests for all three.
*Amendment for 0.4 (third bullet):* "*Amended 2026-10-24 (Stage 0 F41): a tab that becomes blocked loses its
cached URL and title in the daemon at the next `listTabs` — which the daemon runs on every safety-state change —
and a blocked tab's `tabRemoved` carries `hidden: "blocked"` instead of `lastUrl`/`lastTitle`.*"

**F42 · code-side S2 · The badge is not persisted across a reload or a Chrome restart (V12a).** A badge and title
set with `chrome.action.setBadgeText`/`setTitle` are not documented, in what Stage 0 read, to survive an
extension reload or a Chrome restart (unmeasured; treated as not persisted), so after either a disarmed bridge
could show no badge — it would look armed. Item: on every worker start, at module scope after the
listeners, not awaited, the worker reads the state from `storage.local` and sets badge and title (the same
`ready` read as D8). SAFE-9 reads the badge/title by UIA after the reload (§7).

**F43 · plan-side (0.2) · The control is a toggle: a panic double-click or a second shortcut press re-arms
(V12b).** Item: a toggle that would **re-arm** within 1 000 ms of the last disarm is ignored (badge stays `OFF`);
a disarm is never delayed or ignored. The options page's switch is not debounced (a deliberate control). New row
SAFE-1b (§7). Proposed decision D13.
*Amendment for 0.2 (first bullet):* "*Amended 2026-10-24 (Stage 0 F43): a button click or shortcut press that
would re-arm within 1 s of the last disarm is ignored; disarming always takes effect at once.*"

### NIT

**F31** · Kickoff counts (23/23/23, 1714/85, typecheck 0, build 0, no tracked change) all hold at `a0700e0`.
**F32** · `shared/test/codes.test.ts:30-33` asserts `toHaveLength(23)` and `codes.ts:2-4` says "Exactly these 23":
S0 updates both with a documented reason (a count change, not an error text — not a forbidden fix).
**F33** · `pressKey` cannot express `Alt+Shift+K`: one key, modifiers only Shift for `A–Z`
(`extension/src/keys.ts:16, 51`), so an agent cannot press the shortcut through trusted input; even if it
could, the toggle while armed only disarms (the safe direction), and while disarmed `pressKey` is refused.
**F34** · `chrome://` pages: the code already maps "Cannot access a chrome:// URL" to `RESTRICTED_URL`
(`debugger-errors.ts:45-49`) and scripting refusals likewise (`inject.ts:9`); a live confirmation on
`chrome://extensions` is S4 row SAFE-7d. Navigation to `chrome://` stays allowed (D10).
**F35** · Disarm does not purge network entries recorded while armed (they were already visible); stated in F9.
**F36** · The safety keys must not collide with `port`, `token`, `sessionMarker` in `storage.local`; the existing
`onChanged` listener reconnects only on `token`/`port` (`sw.ts:238-240`) — keep it so.
**F37** · Badge: both disarmed and JS off → `OFF` wins (one badge); build decision D12.
**F38** · `downloadStart` already refuses non-http(s) URLs (`handlers/download.ts:19`), so the own pages are unreachable
through it; the block still applies for uniformity.
**F39** · Worker restart mid-disarm is safe by construction once F10 holds: `storage.local` survives worker
restarts and reloads, the gate awaits `ready` and reads per call. S2 unit-tests the "before ready" path; no live
row can force a worker restart reliably (the 25 s keepalive alarm, `sw.ts:229-236`).

## 4. Attack on the #131 proposals and the phase doc's Open items

| Proposal (#131 item) | Premise | Verdict | Proposed ruling |
|---|---|---|---|
| (1) 0.1 one pure gate before every handler | handlers are single-step | **Wrong premise** (F1, F7) | gate at receipt + post-check + attach re-check + per-tick re-check; richer signature |
| (1) table classifies every router method; test fails on unclassified | test can read `router.on` names | Holds with F17 (registration guard) | keep + `Router.on` throws on an unclassified method |
| (1) daemon/SDK enforce nothing new; no method changes state | — | Holds; the daemon may *add* output redaction (F2) | keep; S3.3 made executable (§6) |
| (2) 0.3 `listTabs` disarmed → handles + `current`, no titles/URLs | listTabs is the only URL channel | **Incomplete** (F2: events, daemon cache) | redact events and daemon output too; add a `hidden` marker (D3) |
| (2) network log records nothing while disarmed | ingest can await state | **Incomplete** (F9 c) | in-memory copy + pre-ready buffer |
| (2) `DISARMED` out of the attach set | — | Holds (probe C1) | keep; also `DOMAIN_BLOCKED` (#120) |
| (3) 0.4 no title/URL for blocked tabs in `listTabs`/events | — | **Incomplete** (F41): redacted sources put no blocked URL into the daemon cache, but a URL cached while the host was still allowed stays served after the pattern is added (`handles.ts:105-111, 160-165`). *Fixer r1: was "Holds … the cache keeps the tab's last allowed URL, acceptable" (V5).* | keep, with the `hidden` marker (D3); a hidden row or `tabRemoved` clears the cache; `listTabs` on every safety change (F41) |
| (3) network log: no entry whose URL host is blocked | `url` is the only host | **Incomplete** (F9 a, b) | `url`/`redirectUrl`/`initiator`/tab URL; ingest + query |
| (3) own pages always blocked, own id | only own pages matter | Holds; widen navigation only (F3, V8b) | act/hide: own id, `url` and `pendingUrl`; `navigate`/`newTab` to any `chrome-extension://` id refused |
| (4) 0.6 `{armed, evaluate, blockedCount}` on hello and on change | the hello can carry it | **Wrong premise** (F12) | new events, no hello field (D1) |
| (4) MCP renders the codes as one plain line | — | Holds | keep; plus redacted-row rendering (F13) |
| (5) 0.7 static scan of log call sites | `console.*` is every log | **Incomplete** (F28) | include the daemon logger; add a sentinel runtime test |
| Open item: wire shape of 0.6 | — | ruled | D1 |
| Open item: one code or two for JS | — | ruled | D2 |
| Open item: `listTabs` redaction | — | ruled | D3 |
| Open item: network log while disarmed | — | ruled | D6 (with F9) |
| Open item: pattern grammar | — | ruled | D4 + §5 table |

## 5. Blind spots (seed list, extended) and rulings

| Blind spot | Finding | Ruling |
|---|---|---|
| Self-re-arming via options page / `chrome://extensions` / shortcuts page | F3, F4, F33, F34, F43 | own-page block (own id, `url` + `pendingUrl`; navigation to any extension id refused); `storage.local` locked to trusted contexts; chrome:// interaction already refused (S4 confirms); a re-arm right after a disarm ignored |
| Human's tab claimed while blocked | F21 | claim-and-refuse (D5); popups by the opener rule likewise |
| In-flight work at disarm (waitFor, evaluate, download, report capture) | F1, F5, F6, F24, F25 | re-check before each first side effect, post-check, attach re-check, per-tick re-check, store release (D6) |
| **Extended (fixer r1):** a tab closed or replaced during the call | F1 (V3) | gone → last known URL, none → reply stands; replaced → new id; state checks unchanged |
| **Extended (fixer r1):** `leaseGranted.url`; a URL cached before a pattern was added | F40, F41 | `""` without a 2 s wait; cache cleared on hidden rows/`tabRemoved` and a `listTabs` per safety change |
| **Extended (fixer r1):** badge after reload/restart; panic double-click | F42, F43 | badge re-derived at every worker start; re-arm debounce (D13) |
| Calls queued on the visibility lock | C7 (forwarded after grant) | refused by the gate at receipt — no daemon change; SAFE-4b proves it live |
| Redirects onto a blocked host | F8, F16 | post-check on the tab's URL after `navigate`; next calls refused; download hop requested but bytes dropped |
| Cross-origin iframe of a blocked host | F16 | not walked; **visible in screenshots**; requests filtered by `initiator`; documented |
| Network log: allowed page → blocked host; pre-disarm entries | F9, F35 | filter by url/redirectUrl/initiator/tab; query-time too; pre-disarm entries stay |
| Matcher edge cases | F22 | D4 + table |
| Worker restart mid-disarm | F10, F39 | `ready` + per-call read; fail closed |
| What the human sees | F20, F23, F37 | D11, D12 |
| Log hygiene | F28 | 0.7 scan incl. daemon logger + sentinel test |
| Token | — | unchanged; Step 9 adds no token read; F4 also shields it from content scripts |
| **Extended:** JavaScript switch bypass by `javascript:`/`data:`/`blob:` URLs | F14 | refuse while JavaScript is off (D7) |
| **Extended:** capture of the wrong tab during the 1 s switch | F11 | verify after capture |
| **Extended:** router reachable from any extension context | F19 | sender check (`offscreen.html` and no `sender.tab`) |
| **Extended:** network `id` lookups (global) | F9, F30 | filtered like `"all"`; refused while disarmed |
| **Extended:** MCP/SDK rendering of redacted rows | F13 | `hidden` marker |
| **Extended:** `tabs.claim` by handle defeats an `{active:true}`-only refusal | F21 | claim-and-refuse |
| **Extended:** download URLs under tab `-1` in the `"all"` network scope | F8 | filter covers tab `-1`; SAFE-5d |
| **Extended:** state read failure | F10 | fail closed |
| **Extended:** invalid block-list lines | F23 | count valid only, show invalid |
| **Extended:** `back`/`forward` onto a blocked host | F16 | cannot be pre-checked; post-check + next call |
| **Extended:** asRef mark residue at disarm | F29 | accepted, documented |
| **Extended:** SDK `focusFirst`, MCP first touch while disarmed | F21, F26 | unchanged behaviour, tested |
| **Extended:** `storage.onChanged` ordering vs in-flight calls | F1, F10 | per-call read + post-check; ordering no longer matters |
| **Extended:** the phase doc's own exit checks that cannot fail | F15 | §6 |

### Matcher grammar (proposed, D4) and case table

*Fixer r1 (2026-10-24): was written with real registrable domains (a `.com` name, its lookalike, a `.de` IDN,
a bare TLD); every example now uses reserved names (`.example`, `.test`, RFC 2606/6761) so S1's committed test data
cannot be read as anyone's real list (V15). Rules 2, 3, 5 and 7 amended for V15's gaps and V8b; cases 41–50
added.*

Grammar, per line of the options textarea:
1. Trim whitespace. An empty line or a line starting with `#` is ignored.
2. A line that parses as an absolute `http`/`https`/`ws`/`wss` URL is reduced to its `host[:port]` (scheme, user
   info, path, query dropped) — a pasted URL blocks its whole host. The URL parser drops a default port, so a
   pasted `https://bank.example:443/` becomes `bank.example` (any port — broader, so stricter), while a typed
   `bank.example:443` is port-restricted.
3. Otherwise the line must be `[*.]HOST[:PORT]`: `HOST` a DNS name (letters, digits, `-`, `_`, dots — `_` because
   the WHATWG URL parser accepts it in hostnames, so the human can block such a host; Unicode accepted and
   converted to punycode by Chrome's URL parser), an IPv4 literal, or a bracketed IPv6 literal `[…]`; `*.` only as
   a leading prefix and never before an IP literal; `PORT` 1–65535. Anything else is **invalid**: kept in the
   text, shown red in the options page, matches nothing, not counted.
4. Normalise: lower case; one trailing dot removed; IDN → punycode; IP literals canonicalised by
   `new URL("http://" + host)` (so `2130706433` → `127.0.0.1`).
5. A URL is tested by its canonical `hostname` (lower case, trailing dot removed) and its **effective port**
   (explicit, else 80 for `http`/`ws`, 443 for `https`/`wss`). `blob:`, `filesystem:` and `view-source:` URLs are
   tested by their inner URL. A `file:` URL with a host (`file://server/share/…`) is tested by that host and has
   no port (a `:PORT` pattern never matches it); a URL with no host (`about:`, `data:`, `file:///…`, `chrome:`)
   never matches a pattern.
6. `HOST` (no `*.`) matches the host itself and any subdomain (`host === p || host.endsWith("." + p)`); `*.HOST`
   matches subdomains only; an IP literal matches only itself; `:PORT` restricts to that effective port, no port
   = any port. No substring and no dot-less `endsWith` (forbidden fix).
7. Separately, not configurable (F3): every method on a tab showing one of **this** extension's pages
   (`chrome-extension://<chrome.runtime.id>/…`, by `url` or `pendingUrl`) is refused `DOMAIN_BLOCKED`, and
   `navigate`/`newTab` to **any** `chrome-extension://` URL is refused `DOMAIN_BLOCKED`.

| # | Pattern line | URL tested | Expected |
|---|---|---|---|
| 1 | `bank.example` | `https://bank.example/` | match |
| 2 | `bank.example` | `https://www.bank.example/a` | match |
| 3 | `bank.example` | `https://notbank.example/` | no (suffix lookalike) |
| 4 | `bank.example` | `https://bank.example.evil.test/` | no |
| 5 | `*.bank.example` | `https://bank.example/` | no |
| 6 | `*.bank.example` | `https://a.b.bank.example/` | match |
| 7 | `BANK.EXAMPLE` | `https://Bank.Example/` | match |
| 8 | `bank.example.` | `https://bank.example/` | match |
| 9 | `bank.example` | `https://bank.example./` | match |
| 10 | `bank.example:8443` | `https://bank.example:8443/` | match |
| 11 | `bank.example:8443` | `https://bank.example/` | no |
| 12 | `bank.example:443` | `https://bank.example/` | match (effective port) |
| 13 | `bank.example` | `http://bank.example:8080/` | match (no port = any) |
| 14 | `localhost:8081` | `http://localhost:8081/x` | match |
| 15 | `localhost:8081` | `http://localhost:8080/x` | no |
| 16 | `localhost:8081` | `http://app.localhost:8081/` | match (subdomain rule) |
| 17 | `127.0.0.1` | `http://127.0.0.1:8081/` | match |
| 18 | `127.0.0.1` | `http://localhost:8081/` | no (no DNS) |
| 19 | `127.0.0.1` | `http://2130706433/` | match (canonical IPv4) |
| 20 | `*.127.0.0.1` | — | invalid |
| 21 | `[::1]:8081` | `http://[::1]:8081/` | match |
| 22 | `::1` | — | invalid (IPv6 must be bracketed) |
| 23 | `bücher.example` | `https://xn--bcher-kva.example/` | match |
| 24 | `xn--bcher-kva.example` | `https://bücher.example/` | match |
| 25 | `   bank.example   ` | `https://bank.example/` | match (trimmed) |
| 26 | *(empty)* | — | ignored |
| 27 | `# my bank` | — | ignored |
| 28 | `bank example` | — | invalid |
| 29 | `*bank.example` | — | invalid |
| 30 | `*` | — | invalid (disarm exists for "everything") |
| 31 | `bank.example:0` / `bank.example:70000` | — | invalid |
| 32 | `https://bank.example/login?x=1` | `https://www.bank.example/` | match (reduced to `bank.example`) |
| 33 | `bank.example` | `https://user:pw@bank.example/` | match |
| 34 | `bank.example` | `blob:https://bank.example/uuid` | match |
| 35 | `bank.example` | `view-source:https://bank.example/` | match |
| 36 | `bank.example` | `about:blank`, `data:text/html,x` | no |
| 37 | `bank.example` | `wss://bank.example/socket` | match |
| 38 | `example` | `https://bank.example/` | match (valid; the options page warns "blocks a whole top-level domain") |
| 39 | *(no pattern)* | `chrome-extension://<this id>/options.html` | blocked: acting on it and navigating to it (rule 7) |
| 40 | *(no pattern)* | `chrome://extensions` | not blocked by the list (`RESTRICTED_URL` on interaction) |
| 41 | *(no pattern)* | `chrome-extension://<another id>/page.html` | `navigate`/`newTab` to it refused; a tab the human opened on it is not blocked by the list (Chrome refuses scripting and the debugger there) |
| 42 | `my_host.example` | `https://my_host.example/` | match (`_` accepted) |
| 43 | `bank.example` | `filesystem:https://bank.example/temporary/x` | match (inner URL) |
| 44 | `bank.example` | `file://bank.example/share/x` | match (a `file:` URL with a host) |
| 45 | `bank.example:445` | `file://bank.example/share/x` | no (`file:` has no port) |
| 46 | `bank.example` | `file:///C:/x` | no (no host) |
| 47 | `https://bank.example:443/` | `https://bank.example:8443/` | match (default port dropped on paste → any port) |
| 48 | `bank.example:443` | `https://bank.example:8443/` | no (a typed port restricts) |
| 49 | `https://bank.example:8443/x` | `https://bank.example:8443/` | match (reduced to `bank.example:8443`) |
| 50 | `https://bank.example:8443/x` | `https://bank.example/` | no |

## 6. Testability of S0.1–S5.1

| Check | Executable? | Discriminating? | Proposed stricter wording |
|---|---|---|---|
| S0.1 | yes | weak ("≥ before + new") | "`npm test` = 1714 + n with n ≥ 1, no test removed, listed per file; typecheck exit 0" |
| S0.2 | yes (`git log` order) | yes | add: "the two codes are in `EXTENSION_ERROR_CODES`; `codes.test.ts` asserts 25 and both names; the safety-state guard rejects a missing/extra-typed field (tests); the event names of D1 are in `protocol.ts`" |
| S1.1 | yes (source scan) | yes with a mutation | add F17: "`Router.on` of an unclassified name throws (test)" |
| S1.2 | yes | yes | add "× {redaction outcome for `listTabs`}; the network forms × {`tabId`, `scope:"all"`, `id` lookup} (refused while disarmed; `"all"`/`id` never refused while armed, their entries filtered); and the post-check predicate over {state changed, tab now blocked, **tab gone during the call**, **tab replaced during the call**}. Required rows (fixer r1, V3): {tab gone, tab replaced} × armed + JS on + empty list → **reply unchanged** (e.g. `evaluate("window.close()")`, a click that closes its popup); tab gone × disarmed → `DISARMED`; tab gone with a last URL that is blocked → `DOMAIN_BLOCKED`, with none known → reply unchanged; tab replaced with the new id's URL blocked → `DOMAIN_BLOCKED`; a tab unreadable at receipt × armed → allow (the handler answers `TAB_UNKNOWN` as today); a network call on a closed tab × armed + empty list → allow" |
| S1.3 | yes | yes | "the 50 cases of stage0-audit.md §5 (≥ 20), committed before the matcher (`git log` order)" |
| S2.1 | yes | yes | add "and for an unknown method, bad JSON and a handler that throws before its first await — the gate's position is before any handler code" |
| S2.2 | partly (escape hatch) | no as written | "the debugger session registry is pure and unit-tested: disarm detaches every recorded session; `withDebugger` refuses to attach while refused; a detach-caused error becomes `DISARMED`" |
| S2.3 | yes | **no** (F15) | "the 0.7 scan test enumerates every `console.*` and injected-logger call site in the four packages against an allowlist, and a sentinel test (pattern, URL, title, token) finds none in captured log output" |
| S2.4 | yes | yes | "`grep -c '^import\b' extension/dist/content.js` → `0` and `grep -c '^export\b' extension/dist/content.js` → `0` (both 0 at `a0700e0` after `npm run build`); and a vitest test parses `extension/src/sw.ts` with the TypeScript compiler API (`typescript` is a root devDependency) and fails on any `AwaitExpression` or `for await` whose nearest enclosing function is the source file — shown failing on a mutation that appends `const st = await chrome.storage.local.get("armed");`. Quick check beside it: `grep -cE '^[^[:space:]/*].*\bawait\b' extension/src/sw.ts` → `0` at `a0700e0`, `1` on that mutation (run by fixer r1 on a scratch copy); the grep misses an `await` on an indented continuation line at module scope, so the AST test is the check." *Fixer r1: was "grep `^\s*await` at module scope, exit 1", which matches 4 correct in-function awaits at baseline (`sw.ts:141, 165, 186, 187`) (V11).* |
| S3.1 | yes | yes | keep |
| S3.2 | yes | yes | "all four armed × JS states **and** 'not reported' (an extension that predates Step 9), singular/plural blocked count; and the MCP line and the SDK `report()` for `DISARMED` differ by `data.scope` (`"all"` vs `"evaluate"`), both tested (V9)" |
| S3.3 | yes | **no** (F15) | "the safety keys are written only by `options.ts` and the toggle module (a static test over `storage.local.set` call sites); no daemon/SDK/MCP method name is added beyond D1's events (a test diffs `methods.ts` tables and the MCP tool list against Step 8's)" |
| S4.1 | yes (`git log`) | yes | keep |
| S4.2 | yes | yes | keep |
| S4.3 | yes | yes | "observed text against the pre-written expected text, row by row, by a fresh verifier" |
| S4.4 | yes | **weak** (count) | "armed, JS and the **sha256 of the block-list text** read back equal the start's; neither the list nor its hash's input is printed" |
| S5.1 | yes | yes | keep |

## 7. SAFE rows proposed for S4 (S4 writes them into `docs/e2e-test-plan.md` §4.20 before the build)

Fixtures on 8080 and 8081 (python `http.server`), plus a small `recipes/` redirect server on 8082 for SAFE-5b/5d.
Every row reads the page's own reporter or the refusal's code (LESSON "an `ok` is not evidence").

| Row | Steps | Expected (pass rule written now) |
|---|---|---|
| SAFE-0 | after reload exit 0: disarm by toolbar; SDK `tab.snapshot()` on the 8080 fixture | `DISARMED` (`data.scope:"all"`) — only the new build can give it; first recorded line after the reload's |
| SAFE-1 | toolbar click → SDK `snapshot`, MCP `browser_snapshot`, `browser_status`, `listTabs`; click again → both work | badge `OFF` (button name/title via UIA contains "OFF"); SDK and MCP get `DISARMED`; MCP line 1 starts `DISARMED:` and tells the model to ask the user; status line `Safety: DISARMED by the user · JavaScript on · 0 blocked sites`; `listTabs` rows with a non-empty title: 0; after re-arm `Safety: armed …` and the snapshot lists the fixture's elements |
| SAFE-1b | (fixer r1, F43) armed: two toolbar clicks by UIA 200 ms apart; then wait 1.5 s and click once more | after the pair: badge `OFF` and an SDK `snapshot` → `DISARMED` (the second click ignored); after the third click: armed, the snapshot lists the fixture's elements |
| SAFE-2 | `chrome://extensions/shortcuts` read by UIA: the command shows `Alt+Shift+K`; press it by UIA in the driver's window, twice | assigned (else the row records "unassigned" and fails); same results as SAFE-1; keyboard layout before = after |
| SAFE-3 | the options page's switch toggled by UIA | same as SAFE-1; badge follows within 1 s |
| SAFE-4 | (a) `waitFor {locator}` for an element that never appears, `timeoutMs` 20 000; disarm 2 s in; (b) trusted `type` of 200 chars into the fixture input; disarm mid-way | (a) `DISARMED` ≤ 300 ms after the click; (b) the call ends `DISARMED`, the fixture reporter shows fewer than 200 chars, the debugging banner is gone ≤ 1 s (UIA: no infobar) |
| SAFE-4b | client A holds the lock with a screenshot; client B's screenshot queued; disarm while B waits | B gets `DISARMED`, no image; the human's tab never switched to B's tab (page `visibilitychange` reporter) |
| SAFE-5 | block `localhost:8081`; SDK calls on the 8081 tab; `navigate` the 8080 tab to 8081; the 8080 tab works; `listTabs`; `networkRequests {tab:"all"}`; `daemon.status` | 8081 calls → `DOMAIN_BLOCKED` with no host or pattern in message/data; navigate → `DOMAIN_BLOCKED`, tab URL unchanged (8080 reporter still loaded); 8080 snapshot ok; 8081 rows hidden (`hidden:"blocked"`); entries with host `localhost:8081`: 0 (counted); daemon.status rows with an 8081 url: 0 |
| SAFE-5b | `navigate` the 8080 tab to 8082's redirect to an 8081 page | `DOMAIN_BLOCKED` (post-check); next `snapshot` `DOMAIN_BLOCKED`; no 8081 entry in the log (counted) |
| SAFE-5c | `downloadStart` of an 8081 file; of an 8082 URL that redirects to 8081 | both `DOMAIN_BLOCKED`; no download store entry (a follow-up `downloadChunk` on any id → error); the 8081 server log shows the hop request for the second (recorded as the documented limit, F8) |
| SAFE-5d | after SAFE-5c, `networkRequests {tab:"all"}` | entries with an 8081 url, redirectUrl or initiator: 0 (counted); records whether tab `-1` entries exist at all |
| SAFE-6 | JavaScript off: `evaluate`, `evaluate {asRef}`; `click` on the fixture | both evaluates `DISARMED` `data.scope:"evaluate"`; click lands (fixture reporter); status `JavaScript off`; badge per D12 |
| SAFE-6b | JavaScript off: `navigate` to `javascript:void 0` and to a `data:text/html` URL | both `DISARMED scope:"evaluate"`; tab URL unchanged (fixer r1: was "`BAD_PARAMS` and …", V8a) |
| SAFE-6c | JavaScript on: `navigate` the fixture tab to `javascript:void 0` | a record, not a check: Chrome's own answer (believed `NAV_FAILED` with Chrome's text; unmeasured) and whether the fixture's reporter changed |
| SAFE-7 | `navigate` and `newTab` to `chrome-extension://<this id>/options.html` | `DOMAIN_BLOCKED`; tab URL unchanged; tab count unchanged |
| SAFE-7b | the driver opens the options page in its own tab by UIA; agent `listTabs`, `snapshot`, `screenshot`, `evaluate` on its handle | row hidden; every call `DOMAIN_BLOCKED`; options page state unchanged (read by UIA) |
| SAFE-7c | the own-page debugger question (F3): no row may exempt the gate to measure it, so S4 records it only if a measurement exists that needs no exemption (e.g. a throwaway unpacked test extension loaded in the driver's own Chrome profile — needs a grant, so by default skipped) | recorded as "not measured; blocked before attach" — the block does not depend on the answer |
| SAFE-7d | `navigate` a driver tab to `chrome://extensions`; trusted `click` at a point | `RESTRICTED_URL` (debugger refused); extension card state unchanged |
| SAFE-8 | disarm; load the 8080 fixture with a fresh query string by UIA; re-arm; `networkRequests {filter:<query>}`; control while armed | 0 entries; control ≥ 1 |
| SAFE-9 | set disarmed + JS off + one test pattern; `reload-extension.ps1`; `browser_status`; then restore | exit 0; `Safety: DISARMED by the user · JavaScript off · 1 blocked site` after the hello; the toolbar button's badge/title read by UIA after the reload contains "OFF" (F42, V12a) |
| SAFE-10 | log scan of `daemon.log` (copied as `.txt`) and the worker console captured during the wave | counts: `://` 0 in new lines, the token 0, `localhost:8081` 0, `8082` 0 — printed as counts only |
| SAFE-11 | restore and read back | armed true, JS on, sha256 of the block-list text equal to the start's (S4.4) |

## 8. Proposed decisions

### 2026-10-24 · The safety state travels as two events and a `daemon.status` field (D1)
**Decided:** the service worker sends an extension→daemon event `safetyState {armed, evaluate, blockedCount}` after
each connection comes up (`ws-status` true) and on every change; never in the hello. The daemon keeps the latest
(null until reported, null again when the extension socket closes), logs one line per change with booleans and
the count only, adds `safety: {armed, evaluate, blockedCount} | null` to `daemon.status`, and broadcasts a
daemon→client event `safetyStatus` with the same params on every change. The SDK exposes it read-only:
`client.safety()` (reads `daemon.status`) and `on("safetyStatus")`. `browser_status` prints `Safety: armed |
DISARMED by the user · JavaScript on|off · N blocked site(s)`, or `Safety: not reported (reload the extension)`
when null. Types and guards in `shared/src/protocol.ts` at S0.
**Why:** the hello is sent once per connection and the offscreen document keys its client on
`port:token:session`, so a state carried there would force a reconnect on every change (F12, as corrected by
V14); a field on `extensionStatus` would break its documented meaning (true only on a hello, spec §10);
unknown event names are ignored by old SDK clients and old daemons (probe P3), so it is backward compatible.
**Instead of:** a hello field; a field on `extensionStatus`; a field on `welcome` (a client connecting later reads
`daemon.status` instead).
**Revisit if:** a client needs the state before its first call without a round trip.
**By:** Claude (proposed; contract-level — for user review)

### 2026-10-24 · The JavaScript switch reuses `DISARMED` with a scope (D2)
**Decided:** `evaluate` (with or without `asRef`) while JavaScript is off is refused `DISARMED` with `data:
{scope: "evaluate"}`; kill-switch refusals carry `data: {scope: "all"}`. 25 codes stand. The extension's
message, the MCP's line and the SDK's `report()` differ by scope: `"all"` — the user turned the bridge off, stop
and ask them; `"evaluate"` — the user turned JavaScript off, every other tool still works (V9; S3.2 tests both).
**Why:** an agent's correct reaction is close (ask the user before relying on the refused capability); the scope
tells them apart without a third code or message parsing; S0.2's count is pre-registered.
**Instead of:** a third code `JS_DISABLED` (clearer name, but changes a pre-registered check and the spec twice).
**Revisit if:** a client must branch on it often enough that `data.scope` proves awkward.
**By:** Claude (proposed; contract-level — for user review)

### 2026-10-24 · What `listTabs`, tab events and the daemon reveal while disarmed or for a blocked tab (D3)
**Decided:** a hidden `listTabs` row keeps `id`, `windowId`, `active`, `openerTabId`, `current` (and the daemon's
`tab`, `owner`), drops `title` and `url`, and adds `hidden: "disarmed" | "blocked"`. While disarmed every row is
`"disarmed"`; while armed, a row whose `url` or `pendingUrl` is blocked (or one of this extension's own pages) is
`"blocked"`. `tabCreated.url` is `""` and `tabRemoved` has no `lastUrl`/`lastTitle` but the same `hidden` marker,
under the same rule. The daemon, while the last state says disarmed, omits `url` from `daemon.status` rows and
`lastUrl`/`lastTitle` from `tabGone`/`TAB_GONE` (cache kept); a `listTabs` row or `tabRemoved` with
`hidden: "blocked"` clears that handle's cached url/title, and the daemon runs one `listTabs` on every safety-state
change so a newly blocked tab's cache is cleared within one round trip (F41); the opener rule's `leaseGranted.url`
is then `""` and `fillUrl` stops at a hidden row instead of polling 2 s (F40). The MCP and the SDK render a hidden
row as `(hidden: the bridge is off)` / `(hidden: blocked site)`.
**Why:** F2, F40, F41 — redaction at one channel leaks through the others, including a cache filled before the
pattern existed; the marker keeps agents able to say why (0.3's intent) and fixes F13; everything is unchanged
while armed with an empty list (no row or event is ever hidden then; own pages excepted, which nothing opens today).
**Instead of:** redacting `listTabs` only (#131 as recorded); no marker (MCP prints `undefined — undefined`).
**Revisit if:** the user wants URLs visible while disarmed.
**By:** Claude (proposed; contract-level — for user review)

### 2026-10-24 · The block-list grammar (D4)
**Decided:** the grammar and matching rules of stage0-audit.md §5 (host and subdomains; `*.` subdomains only;
optional port = effective port; IDN to punycode; canonical IP literals, bracketed IPv6; `#` comments; a pasted URL
reduced to its host; invalid lines kept, shown, not counted; `blob:`/`filesystem:`/`view-source:` by the inner
URL; `file:` by its host if any; this extension's own pages blocked always and navigation to any
`chrome-extension://` URL refused), with the 50-case table as S1.3's test list.
**Why:** settles F22 with the strictest readings that never match by substring.
**Instead of:** exact-host only (misses subdomains the human means); allowing `*` (duplicates disarm).
**Revisit if:** the user wants path-level blocking or an allow-list mode.
**By:** Claude (proposed; contract-level — for user review)

### 2026-10-24 · `tabs.claim` on a blocked tab is granted, every call on it refused (D5)
**Decided:** the daemon's claim stays bookkeeping only (F21); the extension refuses every page call on the tab.
The opener rule likewise: a popup of a held blocked tab is leased to the holder at once
(`daemon/src/intercept.ts:213-217`, with `leaseGranted`), and every page call on it is refused while it is blocked.
**Why:** a lease grants no page capability; any client can claim an unheld tab by handle, so refusing
`{active:true}` alone protects nothing, and it would put block-list knowledge in the daemon (0.1); the opener
grant is equivalent to claiming the popup by handle (V16); with an empty list nothing changes.
**Instead of:** refusing the claim; withholding opener grants for blocked tabs.
**Revisit if:** a lease on a blocked tab is ever shown to grant a capability, or an opener grant is shown to reveal
something a claim by handle does not (e.g. a popup URL in `leaseGranted` — redacted by D3/F40).
**By:** Claude (proposed; contract-level — for user review)

### 2026-10-24 · In-flight work at disarm and on a newly blocked tab (D6)
**Decided:** (1) gate at receipt, again right before each first side effect (`showTab`, `captureVisibleTab`,
`tabs.update`/`create`/`remove`, each action's `callInPage` and trusted input — V17), and a post-check before the
reply (all methods but `listTabs`, which is redacted, and `newTab`/`closeTab`, whose post-check is the state only).
Every run checks the state first (disarmed → `DISARMED`; JavaScript off + `evaluate` → `DISARMED scope:"evaluate"`),
then the tab: a live tab by its current `url`/`pendingUrl`; a tab replaced during the call under its new id; a
tab gone during the call (or unreadable) by the last URL the worker knew for it — **none known, or not blocked →
the reply stands as today**. At receipt an unreadable tab is left to the handler (today's `TAB_UNKNOWN`). So with
the state armed, JavaScript on and an empty list, `evaluate("window.close()")`, a click that closes its popup and
a call across a Memory-Saver replacement answer exactly as today (V3; S1.2's required rows); (2) `withDebugger`
re-checks before attaching;
a pure session registry detaches every session at disarm; errors from those sessions become `DISARMED`; (3)
worker-side poll loops re-check per tick; (4) at disarm the download store is cleared and a late fetch's entry
is released when its reply is refused; (5) a capture verifies the captured tab (F11); (6) the network log drops
events while disarmed and filters blocked hosts at ingest and at query (F9), with a pre-ready buffer; entries
recorded while armed stay.
**Why:** F1, F5, F6, F9, F11, F24; nothing changes while armed with JavaScript on and an empty list, because
every refusal needs a disarmed state, JavaScript off on an `evaluate`, or a URL that matches a pattern (own pages
excepted), and a tab that vanished mid-call keeps today's answer.
**Instead of:** one check at receipt (0.1 as written); refusing whenever the tab cannot be re-read at the
post-check (fail closed by analogy with D8 — rejected: it turns today's `ok` for a self-closing tab into an error
while armed, V3).
**Revisit if:** the post-check is shown to refuse a reply the human wanted after re-arming quickly (it only ever
refuses); or a blocked page is shown to close itself to slip a reply past the post-check (then the last known URL
must be kept for every tab the call touched).
**By:** Claude (proposed; contract-level — for user review)

### 2026-10-24 · Script URLs and the JavaScript switch; own pages of every extension (D7)
**Decided:** while JavaScript is off, `navigate`/`newTab` to a `javascript:`, `data:` or `blob:` URL →
`DISARMED` `scope:"evaluate"`; while it is on, those behave as today. `navigate`/`newTab` to any
`chrome-extension://` URL → `DOMAIN_BLOCKED`; acting on a tab, and its `listTabs` row/events, are blocked/hidden
only for **this** extension's own pages (by `url` or `pendingUrl`). `chrome://` navigation is unchanged
(interaction is already refused, F34).
**Why:** F3, F14, and the conservative rule's second property (V8): with JavaScript on, a `javascript:` URL grants
nothing `evaluate` does not, so refusing it then would only change today's answer; acting on another extension's
page is already refused by Chrome for scripting and the debugger, so blocking every id would change
`navigate`-away, `closeTab`, `focusTab` and `listTabs` titles there for little gain. Navigation *to* any extension
page is refused because nothing uses it today and it is the only way the bridge itself could put one in front.
**Instead of:** `javascript:` → `BAD_PARAMS` always (the audit's first draft); every extension id blocked for every
method and hidden in `listTabs` (wider; its cost is the changed answers above — **offered to the user as the
alternative**); own id only for navigation too; leaving script URLs to Chrome while JavaScript is off.
**Revisit if:** a recipe needs a `data:` page with JavaScript off; SAFE-6c shows Chrome running a `javascript:`
navigation in a way `evaluate` could not; a screenshot of another extension's page is judged sensitive (then the
wider rule).
**By:** Claude (proposed; contract-level — for user review)

### 2026-10-24 · The state is read per call, fails closed, and is locked to trusted contexts (D8)
**Decided:** F10's read rule (per-call `storage.local.get` after `ready`, in-memory copy for webRequest only,
defaults when absent, fail closed with `DISARMED` on a read error — of the *state*, not of a tab, see D6) and
F4's `storage.local.setAccessLevel({accessLevel: "TRUSTED_CONTEXTS"})`, called at module scope after every
listener registration, guarded so it cannot throw synchronously, not awaited (V7); the router accepts
`ws-message` only when `sender.url` is this extension's `offscreen.html` and `sender.tab` is undefined (F19, V6).
**Why:** a call never acts on a stale state; no page-adjacent context can write it.
**Instead of:** an `onChanged` cache (0.2's allowance).
**Revisit if:** the per-call read is measured to cost more than a few ms.
**By:** Claude (proposed; contract-level — for user review)

### 2026-10-24 · `downloadStart` and redirects onto a blocked host (D9)
**Decided:** check the URL before the fetch and `res.url` when `fetch` resolves, aborting the body; document that a
hop onto a blocked host is still requested. A `declarativeNetRequest` session rule that blocks requests to
blocked hosts itself (new manifest permission `declarativeNetRequestWithHostAccess`) is **not** built in Step 9.
That one open decision covers both places it would help (V13): a download's redirect hop, and a bridge `navigate`
that an allowed open redirector bounces onto a blocked host (a main-frame GET with the profile's cookies, a side
effect the post-check refuses to report but cannot undo).
**Why:** F8, F16; the manifest lane allows only `action` and `commands`.
**Instead of:** `redirect: "error"` (breaks Blackboard → S3 downloads); DNR now (outside the lane); two separate
DNR decisions.
**Revisit if:** the user wants either hop blocked (then DNR in a later step, for both).
**By:** Claude (proposed; contract-level — for user review)

### 2026-10-24 · Stricter exit checks for Step 9 (D10)
**Decided:** S0.1, S0.2, S1.1–S1.3, S2.1–S2.4, S3.2, S3.3, S4.3, S4.4 read as in stage0-audit.md §6.
**Why:** F15 — four checks could not fail as written; Stage 0 may only make checks stricter (kickoff §7).
**Instead of:** the original wording.
**Revisit if:** a stricter check proves unexecutable (then escalate, never loosen silently).
**By:** Claude (proposed; pre-registered rules — for user review)

### 2026-10-24 · The shortcut is `_execute_action` (D11)
**Decided:** manifest `commands: {"_execute_action": {"suggested_key": {"default": "Alt+Shift+K"}}}`; the button
and the shortcut share one top-level `action.onClicked` listener; no `commands.onCommand` listener.
**Why:** Chrome dispatches `action.onClicked` for `_execute_action` (commands docs); one code path for both.
**Instead of:** a named command plus `onCommand`.
**Revisit if:** S4 finds the reserved command does not fire with no popup.
**By:** Claude

### 2026-10-24 · Badge and title (D12)
**Decided:** disarmed → badge `OFF` red, title "Chrome Agent Bridge — OFF: agents are refused (click to turn
on)"; armed with JavaScript off → badge `JS` amber, title "… armed, JavaScript off (click to turn off)"; armed →
no badge, title "… armed (click to turn off)". The options page states the block count and invalid lines.
**Why:** 0.2/0.5 ask for it; one badge at a time, `OFF` wins (F37).
**Instead of:** a badge per control.
**Revisit if:** the user prefers other words or colours.
**By:** Claude

### 2026-10-24 · A re-arm right after a disarm is ignored (D13)
**Decided:** a toolbar click or shortcut press that would re-arm within 1 000 ms of the last disarm is ignored
(badge stays `OFF`); a disarm always takes effect at once and is never debounced; the options page's switch is
not debounced. The badge and title are re-derived from `storage.local` at every worker start (F42).
**Why:** F43 (V12b) — the control is a toggle, so a panic double-click or a repeated shortcut would otherwise
re-arm; ignoring only the re-arm direction errs safe.
**Instead of:** no debounce; a symmetric debounce (could delay a disarm); a separate "off only" shortcut.
**Revisit if:** SAFE-1b shows the debounce confusing the human, or the user wants a different window.
**By:** Claude (proposed; contract-level — how the safety state is changed — for user review)

## 9. Proposed stage split (estimates)

| Stage | Content (beyond the phase doc) | Estimate | Parallel |
|---|---|---|---|
| Stage 0 | this audit | 1.5 h (actual: see stage0-builder.md) | alone |
| S0 — types and codes | 2 codes; safety-state type + guard; D1 event types/guards; `hidden` field type (D3); spec §10 and §6.5 notes first; `codes.test.ts` 23 → 25 | 0.75 h | alone |
| S1 — gate, matcher (pure) | D4 grammar + 50 cases first; `safetyDecision` with the F7 signature; post-check predicate; `listTabs`/event redaction; network predicate (url/redirectUrl/initiator/tab); `Router.on` guard's table | 2.5 h | ∥ S3 |
| S2a — extension enforcement | state module (`ready`, per-call read, fail closed, access level); router gate + post-check + sender check; debugger session registry; per-tick waits; capture verification; download checks/release; network ingest+query filter with pre-ready buffer; event redaction | 3 h | after S1 |
| S2b — extension UI | manifest `action` + `_execute_action`; badge/title; options page (switches, list, invalid lines, shortcuts link); the 0.7 log scan + sentinel test | 1.5 h | after S2a |
| S3 — daemon, SDK, MCP | D1 relay, `daemon.status.safety`, disarmed output redaction (D3), `client.safety()`, `Safety:` line, hidden-row rendering, one-line code rendering, attach-set test, `focusFirst` test | 2.5 h | ∥ S1 (needs S0 only) |
| S4 — E2E | rows of §7 (+ the 8082 redirect recipe, UIA helpers for the button, options switch, shortcut, keyboard layout) | 1.5 h prep + 2.5 h live | alone |
| S5 — docs | setup.md "Safety" incl. F16's threat model; CLAUDE.md; README; roadmap | 1 h | last |
