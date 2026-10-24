# Step 9 — Phase E: safety (the human's kill switch, a JavaScript switch, blocked sites)

**Date:** 2026-10-24 · **Status:** Built and E2E-run (Run 13), 2026-10-24; gate open — the user rules on Run 13 (#192) and the Step 9 open decisions. *Superseded 2026-10-24: was "Planned (kickoff …)".*
**Design of record:** this doc's "Decisions" (the design spec `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md`
binds for everything it does not change: §5 layer contract, §6 the human, §10 protocol and codes) ·
**Roadmap:** `docs/progress-and-roadmap.md` §5 Phase E · **As-built:**
`docs/plans/2026-10-24-step9-phase-e-safety-asbuilt.md` (created at the first stage close) ·
**Steps dir:** `docs/plans/2026-10-24-step9-phase-e-safety-steps/` (created at kickoff).

## Why

The bridge drives the user's real, logged-in Chrome. Since Step 4, `browser_evaluate` runs arbitrary
JavaScript with the page's full authority plus a user gesture; since Step 8, scripts can do the same
without a model in the loop. The only boundaries today are the `127.0.0.1` bind and the token. The
human has no way, inside Chrome, to say "stop now", "no JavaScript", or "never touch my bank". Phase E
gives the human those three controls, enforced in the browser itself, so they hold whatever the
daemon, a client or a leaked token does.

## Outcome

Results (2026-10-24; as-built `docs/plans/2026-10-24-step9-phase-e-safety-asbuilt.md`):

- **Codes:** 25 (24 on the wire): `DISARMED` (with `data.scope` `"all"` or `"evaluate"`, #133) and
  `DOMAIN_BLOCKED` added in S0.
- **Tests** (`npm test`, each stage's verifier on a clean tree): baseline 1714 / 85 → S0 1783 / 86 → S1 ∥ S3
  2329 / 96 → S2a 2561 / 106 → S2b 2660 / 113 → S2c 2685 / 115 → S4 2720 / 116 (re-derived by S5 at
  `ba6029e`). `npm run typecheck` and `npm run build` exit 0 at every close.
- **The gate:** one gate (`extension/src/safety.ts`, served by `GatedRouter`) over all 23 router methods, at
  receipt, before each first side effect and as the post-check; the state in `storage.local`, read per call,
  failing closed; nothing on the wire changes it.
- **Run 13** (live, `docs/e2e-test-plan.md` §5; record `…-steps/S4-run-record.md`): rows committed before
  the build; reload exit 0 and SAFE-0 first; **24 PASS, 7 FAIL, 3 RECORD, 5 NOT MEASURED** (live verifier's
  count). Among the PASS rows, verbatim: SAFE-1 (toolbar disarm → SDK and MCP `DISARMED`, re-arm works),
  SAFE-2 (`Alt+Shift+K`), SAFE-6 (JavaScript off → `evaluate` `DISARMED` scope evaluate, `click` lands), SAFE-7 /
  REL-1 (`DOMAIN_BLOCKED: The bridge never opens extension pages.`), SAFE-5 (8081 blocked, hidden rows, no
  8081 network entry), SAFE-8 (nothing logged while disarmed), SAFE-10 (log scan 0). The FAILs (SAFE-11
  start, SAFE-POP-1, SAFE-5c's redirect half, SAFE-4 (b) banner, SAFE-3, SAFE-9 and SAFE-10's set-up) are none
  shown to be a product defect; four are re-measured in Step 10 (#194). Safety state read back equal to the
  found state by hash (armed, JavaScript on, empty list). The live verifier failed the run **on process**
  (the runner resolved four stops itself, no state changed at any) — ratification is the user's (#192).

## Decisions

Decided with the user on 2026-10-24 (decisions.md · 2026-10-24 · Phase E's design: the kill switch, the
disarmed state, blocked sites, the JavaScript switch (#128)): the four choices marked **(user)** below.
Everything else is proposed by this doc, audited at Stage 0, and recorded by the session agent.

### 0.1 Enforced in the extension, by one pure gate (proposed)

Every method the service worker's router serves passes one gate before its handler:
`safetyDecision(method, params, tabUrl, state) → allow | {code, message, data?}`, a pure function in
`extension/src/safety.ts`, unit-tested over every method. A table classifies **every** router method
(today 23: `navigate snapshot screenshot click type scroll hover selectOption pressKey back forward
listTabs focusTab newTab closeTab waitFor evaluate locate networkRequests networkClear downloadStart
downloadChunk downloadEnd`); a test fails when a method is registered with no class, so a new method
cannot bypass the gate. The daemon and the SDK enforce nothing new: the browser is the boundary,
because it is the one place the human controls and the token does not reach.
**Never:** a wire method, daemon method or SDK call that arms, disarms, edits the block list or turns
JavaScript on. Only the human changes the safety state, through the extension's own UI.

*Amended 2026-10-24 (Stage 0 F1): the gate runs at receipt, again right before each
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
service-worker poll loop re-checks it per tick. Side effects already done are not undone.*
*(Decisions cited: decisions.md · 2026-10-24 · In-flight work at disarm and on a newly blocked tab (#137) = D6;
D8 = · The state is read per call, fails closed, and is locked to trusted contexts (#139); D3 = · What `listTabs`,
tab events and the daemon reveal while disarmed or for a blocked tab (#134). Stage 0's Dn is decisions.md
#(131+n), per · Step 9's stage split after Stage 0: S2 becomes S2a (enforcement) and S2b (UI) (#145).)*
*Superseded 2026-10-24: was "Every method the service worker's router serves passes one gate before its
handler", because handlers are multi-step and start new privileged steps after receipt, so one check at receipt
does not cover in-flight work (Stage 0 F1; decisions.md · 2026-10-24 · In-flight work at disarm and on a newly
blocked tab (#137)).*

*Amended 2026-10-24 (Stage 0 F7): `safetyDecision(method, params, target, state)` where
`target` is `live {urls}` (the tab's `url` and `pendingUrl`), `replaced {urls}` (under the new id), `gone
{lastUrl?}`, `own {url}` (the call's own URL for `navigate`/`newTab`/`downloadStart`) or `none` (a global
network `id` lookup, `scope: "all"`), returns `allow | {redact: "disarmed" | "blocked"} | {code, message,
data?}`; the network methods resolve their scope (`tabId` | `"all"` | `id`) first.*
*Superseded 2026-10-24: was "`safetyDecision(method, params, tabUrl, state) → allow | {code, message, data?}`",
because that signature cannot express a redaction, two URLs per tab, a call's own target URL, a tab gone or
replaced during the call, or the network scope (Stage 0 F7; decisions.md · 2026-10-24 · In-flight work at
disarm and on a newly blocked tab (#137)).*

### 0.2 The kill switch: toolbar button, options page, keyboard shortcut (user)

- The manifest gains an `action` (toolbar button, no popup) and a `commands` entry. One click on the
  button, or the shortcut (suggested `Alt+Shift+K`, changeable at `chrome://extensions/shortcuts`),
  toggles **armed ↔ disarmed**. The options page has the same switch.
  *Amended 2026-10-24 (Stage 0 F43): a button click or shortcut press that
  would re-arm within 1 s of the last disarm is ignored; disarming always takes effect at once.*
  *(decisions.md · 2026-10-24 · A re-arm right after a disarm is ignored (#144).)*
- State `armed: boolean` in `chrome.storage.local`, default **true** (today's behaviour), surviving
  worker restarts, reloads and Chrome restarts. The gate reads it per call (no top-level `await`;
  `storage.onChanged` may keep a cache, but a call never acts on a state older than the last change).
  *Amended 2026-10-24 (Stage 0 F10): the router's gate reads `chrome.storage.local.get`
  per call, after a `ready` promise (the `network-state.ts` model, no top-level `await`); the toolbar/shortcut
  toggles update an in-memory copy synchronously before writing; the copy serves only the synchronous webRequest
  filter. A failed read refuses the call (fail closed) with `DISARMED` and a message saying the state could not
  be read. Missing keys mean the defaults (armed, JavaScript on, empty list).*
  *Superseded 2026-10-24: was "`storage.onChanged` may keep a cache, but a call never acts on a state older
  than the last change", because the options page writes `storage.local` directly and the worker learns it only
  when `onChanged` is delivered, so a call in between would read the old cache (Stage 0 F10; decisions.md ·
  2026-10-24 · The state is read per call, fails closed, and is locked to trusted contexts (#139)).*
- The badge shows `OFF` (red) while disarmed, nothing while armed; the button's title says which.
- The `action.onClicked` and `commands.onCommand` listeners are registered at the top level of `sw.ts`
  (`CLAUDE.md`: listeners must exist on every worker start).
  *Amended 2026-10-24 (Stage 0 F20): the shortcut is
  the reserved `_execute_action` command (`suggested_key` `Alt+Shift+K`), which Chrome dispatches as
  `action.onClicked`; one top-level `action.onClicked` listener serves the button and the shortcut, and there is
  no `commands.onCommand` listener (D11). Whether the key is assigned (a conflicting suggestion is left
  unassigned) and whether Alt+Shift changes the Windows input language are read in S4 (SAFE-2).*
  *Superseded 2026-10-24: was "The `action.onClicked` and `commands.onCommand` listeners", because Chrome
  dispatches the reserved `_execute_action` command as `action.onClicked`, not `commands.onCommand` (Stage 0
  F20; decisions.md · 2026-10-24 · The shortcut is `_execute_action` (#142)).*

### 0.3 What "disarmed" does: refuse page calls (user)

- Every method that reads or acts on a page — navigation, input, snapshot, screenshot, `locate`,
  `waitFor`, `evaluate`, `focusTab`, `newTab`, `closeTab`, the network and download methods — is
  refused with a new code **`DISARMED`** (message: the user has turned the bridge off in Chrome; ask
  them to turn it on). `listTabs` and the hello still answer, so agents can say why; the daemon's own
  `daemon.status`, `tabs.claim`/`tabs.release` are untouched (bookkeeping, no page).
  *Proposed, for the audit:* `listTabs` while disarmed returns handles and `current` but not titles or
  URLs.
  *Amended 2026-10-24 (Stage 0 F2): while disarmed, `tabCreated.url` is `""` and
  `tabRemoved` carries no `lastUrl`/`lastTitle` but `hidden: "disarmed"`; the same for a blocked tab (by its URL at
  the event) with `hidden: "blocked"`. The daemon, while the last safety state it received says disarmed, omits
  `url` from `daemon.status` rows and `lastUrl`/`lastTitle` from `tabGone` and `TAB_GONE` (it keeps its cache, so
  re-arming restores today's output); a `listTabs` row or `tabRemoved` with `hidden: "blocked"` clears that
  handle's cached url/title (F41); the opener rule's `leaseGranted.url` carries what the redacted sources gave
  (F40).*
  *Amended 2026-10-24 (Stage 0 F40): the opener rule's `leaseGranted.url`
  is `""` for a tab created while disarmed or onto a blocked URL; the daemon does not wait for a URL it will not
  be given.*
  *(Both: decisions.md · 2026-10-24 · What `listTabs`, tab events and the daemon reveal while disarmed or for a
  blocked tab (#134) — a hidden `listTabs` row keeps `id`, `windowId`, `active`, `openerTabId`, `current`, the
  daemon's `tab` and `owner`, drops `title` and `url`, and adds `hidden: "disarmed" | "blocked"`. This extends
  the proposal above: redacting `listTabs` alone leaked through the tab events and the daemon's cache.)*
  *Amended 2026-10-24 (Stage 0 F21): `tabs.claim` (by handle or
  `{active:true}`) and the opener rule's grants are never refused for safety — they are bookkeeping, and the
  daemon does not know the block list. On a claimed tab that is blocked, or on any tab while disarmed, every page
  call is refused by the extension. The MCP's first untargeted tool while disarmed therefore claims the human's
  tab and gets `DISARMED`; the cursor stays on that tab after re-arming (D5).*
  *(decisions.md · 2026-10-24 · `tabs.claim` on a blocked tab is granted, every call on it refused (#136).)*
  *Amended 2026-10-24 (Stage 0 F30): the network methods are gated on what
  the daemon forwards. While disarmed, all of them are refused `DISARMED`. While armed: a `tabId` is refused
  `DOMAIN_BLOCKED` when that tab's URL (for a closed tab, the last URL the worker knew; none known → allowed) is
  blocked; `scope: "all"` and an `id` lookup are never refused, but every entry they return passes the network
  filter (F9), so a blocked entry is never returned, found by id or not.*
  *(decisions.md · 2026-10-24 · In-flight work at disarm and on a newly blocked tab (#137), item (6); the daemon
  resolves an absent or `"active"` network `tab` to a `tabId` before forwarding, so the gate needs no
  `humansTab()`.)*
- At the moment of disarming: every debugger session the extension holds is detached (the banner goes),
  `waitFor` polls stop at their next tick with `DISARMED`, a pending download is dropped from the
  `DownloadStore`.
  *Amended 2026-10-24 (Stage 0 F5): the locator and network-idle waits re-check the gate
  each tick and end `DISARMED`/`DOMAIN_BLOCKED`; the text wait (page-side, ≤ 10 s) and the `seconds` wait end on
  their own and their reply is replaced by the post-check (F1). A seconds-wait may also be cut by a 100 ms
  re-check loop (build choice).*
  *Superseded 2026-10-24: was "`waitFor` polls stop at their next tick with `DISARMED`", because only the
  locator and network-idle arms tick in the worker; the text arm polls inside the page (one `executeScript`) and
  the `seconds` arm is a plain sleep (Stage 0 F5; decisions.md · 2026-10-24 · In-flight work at disarm and on a
  newly blocked tab (#137)).*
- The network log **records nothing while disarmed** (proposed): its observers drop events, so traffic
  of the disarmed period never reaches an agent after re-arming.
  *(Amended 2026-10-24: Stage 0 F9's amendment, under 0.4's third bullet, settles this for 0.3 and 0.4 alike —
  dropped at ingest while disarmed, events before the stored state is read held in a bounded buffer; entries
  recorded before a disarm stay.)*
- `DISARMED` is not in the failure-report attach set (a report would only be refused too).
- The socket stays up; `browser_status` and the SDK see the state (0.6).

### 0.4 Blocked sites: a block list, empty by default (user)

- The options page holds one host pattern per line: `bank.com` (that host and its subdomains),
  `*.bank.com` (subdomains only), `localhost:8081` (host and port). Exact grammar, IDN/punycode, IP
  literals, ports, case and trailing dots are settled at Stage 0 and unit-tested.
  *Amended 2026-10-24 (Stage 0 F22): the grammar is stage0-audit.md §5 (D4).
  Per line: trimmed; empty and `#` lines ignored; a pasted `http`/`https`/`ws`/`wss` URL is reduced to
  `host[:port]`; otherwise `[*.]HOST[:PORT]`, HOST a DNS name (letters, digits, `-`, `_`, dots; Unicode accepted),
  an IPv4 literal or a bracketed IPv6 literal; lower-cased, one trailing dot dropped, IDN to punycode, IP literals
  canonicalised. `HOST` matches itself and its subdomains at a dot boundary, `*.HOST` subdomains only, an IP literal
  only itself, `:PORT` only that effective port; anything else is invalid (kept, shown, matches nothing, not
  counted). `blob:`, `filesystem:` and `view-source:` URLs are tested by their inner URL; a URL with no host never
  matches. S1.3's cases are §5's table.*
  *(decisions.md · 2026-10-24 · The block-list grammar (#135). §5 = `docs/plans/2026-10-24-step9-phase-e-safety-steps/stage0-audit.md` §5, 50 cases, reserved names only.)*
- A call whose tab's current URL matches is refused with a new code **`DOMAIN_BLOCKED`**; so is
  `navigate`/`newTab` to a matching URL, and `downloadStart` whose URL **or final URL after redirects**
  matches. A tab the human navigates onto a blocked site while an agent holds it is refused from the
  next call.
  *Amended 2026-10-24 (Stage 0 F8): `downloadStart` checks its URL before fetching and
  `res.url` as soon as `fetch` resolves, aborting the body read; a redirect hop onto a blocked host is still
  requested (cookies included) — the bytes are never kept. Blocking the hop itself would need a
  `declarativeNetRequest` session rule (a new manifest permission): an open decision for the user, the same one
  that would stop a bridge `navigate` bounced by an allowed redirector onto a blocked host (D9, V13).*
  *(decisions.md · 2026-10-24 · `downloadStart` and redirects onto a blocked host (#140); V13 = Stage 0
  verifier item 13, in `stage0-verifier.md`.)*
- `listTabs` and tab events carry no title or URL for a blocked tab (proposed); the network log records
  no entry whose URL host is blocked (proposed).
  *Amended 2026-10-24 (Stage 0 F41): a tab that becomes blocked loses its
  cached URL and title in the daemon at the next `listTabs` — which the daemon runs on every safety-state change —
  and a blocked tab's `tabRemoved` carries `hidden: "blocked"` instead of `lastUrl`/`lastTitle`.*
  *(decisions.md · 2026-10-24 · What `listTabs`, tab events and the daemon reveal while disarmed or for a
  blocked tab (#134).)*
  *Amended 2026-10-24 (Stage 0 F9): an entry is dropped at ingest when the state is
  disarmed, or when its `url`, `redirectUrl` or `initiator` host is blocked, or the tab's last known top-level URL
  is blocked; the same predicate (minus "disarmed") filters every query, an `id` lookup included, so a pattern
  added later hides older entries. Events that arrive before the stored state is read are held in memory (bounded) and decided once it
  is read. Entries recorded before a disarm stay (they were recorded while armed).*
  *(Applies to 0.3's third bullet too; decisions.md · 2026-10-24 · In-flight work at disarm and on a newly
  blocked tab (#137), item (6).)*
  *Superseded 2026-10-24: was "the network log records no entry whose URL host is blocked", because an entry's
  `redirectUrl` and `initiator` can name a blocked host while its `url` does not, and an ingest-only filter keeps
  entries recorded before the pattern was added (Stage 0 F9; decisions.md · 2026-10-24 · In-flight work at
  disarm and on a newly blocked tab (#137)).*
- Empty by default: nothing changes until the human adds a line.
- **The extension's own pages are always blocked** (proposed, not configurable):
  `chrome-extension://<this id>/…` — otherwise an agent could open `options.html` and re-arm itself or
  empty the list with trusted input.
  *Amended 2026-10-24 (Stage 0 F3, narrowed by fixer r1 / V8): the own-page block is
  required: every method on a tab whose `url` or `pendingUrl` is one of this extension's own pages
  (`chrome-extension://<chrome.runtime.id>/…`) is refused `DOMAIN_BLOCKED` and its `listTabs` row and events are
  hidden as `"blocked"`; `navigate`/`newTab` to **any** `chrome-extension://` URL (any id) is refused
  `DOMAIN_BLOCKED` (nothing uses it today). A tab showing another extension's page, opened by the human, is
  treated as today (Chrome already refuses scripting and the debugger there, `inject.ts:9`). Whether
  `chrome.debugger` can attach to the own options page is measured in S4 (SAFE-7c), not assumed safe.*
  *Superseded 2026-10-24: was "(proposed, not configurable)", because the block is required, not merely
  proposed — the extension itself can `tabs.update`/`create` to its own `options.html`, and its debugger there is
  assumed reachable until measured (Stage 0 F3; decisions.md · 2026-10-24 · Script URLs and the JavaScript
  switch; own pages of every extension (#138), which offers the wider every-extension rule to the user as the
  alternative).*

*Amended 2026-10-24 (Stage 0 F16): what the block list does and does
not do — it refuses every bridge call on a tab whose top-level URL is blocked and every navigation the bridge
itself starts to one; it does not stop a page from loading a blocked host, and a blocked host framed inside an
allowed page shows in that page's screenshots. `docs/setup.md` "Safety" says so.*
*(Related: decisions.md · 2026-10-24 · `downloadStart` and redirects onto a blocked host (#140), on the
`declarativeNetRequest` rule not built.)*

### 0.5 The JavaScript switch (user)

- Options-page switch **"Allow JavaScript (`browser_evaluate`)"**, default **on** (today's behaviour).
  Off → `evaluate` (with or without `asRef`) is refused (`DISARMED` with `data.scope: "evaluate"`, or a
  code of its own — Stage 0 rules); every other tool keeps working. The badge or title says `JS off`.
  *Amended 2026-10-24 (Stage 0 F27): one code —
  `evaluate` while JavaScript is off is refused `DISARMED` with `data: {scope: "evaluate"}`; the kill switch's
  refusals carry `data: {scope: "all"}`; 25 codes stand (D2). The extension's message, the MCP's line and the SDK's
  `report()` differ by scope: `"all"` — the user turned the bridge off, stop and ask them; `"evaluate"` — the user
  turned JavaScript off, every other tool still works, ask before relying on `browser_evaluate`.*
  *Superseded 2026-10-24: was "(`DISARMED` with `data.scope: "evaluate"`, or a code of its own — Stage 0
  rules)", because Stage 0 ruled one code (Stage 0 F27; decisions.md · 2026-10-24 · The JavaScript switch
  reuses `DISARMED` with a scope (#133)).*
  *Amended 2026-10-24 (Stage 0 F14): while JavaScript is off, `navigate`/`newTab` to a
  `javascript:`, `data:` or `blob:` URL are refused `DISARMED` with `data.scope: "evaluate"`; while it is on they
  behave as today (Chrome decides). S4 measures Chrome's own answer to `javascript:` with JavaScript on as a record
  (SAFE-6c).*
  *(decisions.md · 2026-10-24 · Script URLs and the JavaScript switch; own pages of every extension (#138).
  This narrows "every other tool keeps working" above for those three URL schemes while JavaScript is off.)*
  *(Badge per decisions.md · 2026-10-24 · Badge and title (#143): armed with JavaScript off → badge `JS` amber;
  `OFF` wins when both apply.)*
- The Blackboard recipes need it on (`boot-bb.ts` loads `bb.js` by `evaluate`); `docs/setup.md` says so.

### 0.6 Agents see the state (proposed)

- The extension reports `{armed, evaluate, blockedCount}` (never the patterns) to the daemon on hello
  and on every change; the daemon relays it to clients the way it relays `extensionStatus`.
  `browser_status` prints `Safety: armed | DISARMED by the user · JavaScript on|off · N blocked sites`;
  the SDK exposes it read-only. Wire shape (a new event or a field on an existing one) is ruled at
  Stage 0, conservative rule.
  *Amended 2026-10-24 (Stage 0 F12): the state is not carried on the hello. The service
  worker sends an extension→daemon event `safetyState {armed, evaluate, blockedCount}` each time its connection
  comes up and on every change; the daemon keeps the latest (null until reported, null again when the extension
  socket closes), adds `safety: {armed, evaluate, blockedCount} | null` to `daemon.status`, and relays a
  daemon→client event `safetyStatus` with the same params on every change. An old daemon counts and drops the
  unknown event; an old SDK ignores the unknown event (D1).*
  *Superseded 2026-10-24: was "to the daemon on hello and on every change", because the hello is sent once per
  connection and the offscreen document keys its client on `port:token:session`, so a state on the hello would
  force a reconnect on every change (Stage 0 F12; decisions.md · 2026-10-24 · The safety state travels as two
  events and a `daemon.status` field (#132), which also fixes `browser_status`'s `Safety: not reported (reload
  the extension)` when the state is null and the SDK's read-only `client.safety()` / `on("safetyStatus")`).*
  *Amended 2026-10-24 (Stage 0 F23): `blockedCount` counts the valid
  patterns only; the options page marks each invalid line and shows how many there are.*
  *(decisions.md · 2026-10-24 · The block-list grammar (#135): invalid lines kept, shown, not counted.)*
- The MCP renders `DISARMED` / `DOMAIN_BLOCKED` as one plain line telling the model to stop and ask the
  user, never to retry in a loop.
  *Amended 2026-10-24 (Stage 0 F27): one code —
  `evaluate` while JavaScript is off is refused `DISARMED` with `data: {scope: "evaluate"}`; the kill switch's
  refusals carry `data: {scope: "all"}`; 25 codes stand (D2). The extension's message, the MCP's line and the SDK's
  `report()` differ by scope: `"all"` — the user turned the bridge off, stop and ask them; `"evaluate"` — the user
  turned JavaScript off, every other tool still works, ask before relying on `browser_evaluate`.*
  *Superseded 2026-10-24: was "as one plain line telling the model to stop and ask the user" for every
  `DISARMED`, because for `scope: "evaluate"` every other tool still works, so "stop" is the wrong instruction
  (Stage 0 F27, V9; decisions.md · 2026-10-24 · The JavaScript switch reuses `DISARMED` with a scope (#133)).
  The MCP and the SDK also render a hidden `listTabs` row as `(hidden: the bridge is off)` / `(hidden: blocked
  site)` (Stage 0 F13; #134).*

### 0.7 Nothing new is logged (proposed)

The roadmap's "never log page content or tokens" becomes an executable check: a test enumerates every
log call site in `extension/src`, `daemon/src`, `sdk/src`, `mcp/src` (static scan) against an allowlist
of what each may print; the block-list patterns, URLs, titles and the token are never logged; the
toggles log one line each (`safety: disarmed by the user`, no pattern, no URL).

*Amended 2026-10-24 (Stage 0 F28): the static scan enumerates every `console.*` call
site and every call of the daemon's injected logger (`options.log`, `deps.log`) in the four packages against
the allowlist, and a runtime test drives the gate, the matcher, the toggles and the daemon's safety relay with a
sentinel pattern, URL, title and token and finds none of them in any captured log line.*
*(Recorded with the phase doc's proposals: decisions.md · 2026-10-24 · The Step 9 phase doc's proposals,
recorded before Stage 0 so the audit can attack them (#131); the scan's check is S2.3 as amended by #141.)*

## Stages

One stage per part. **Lane** is the explicit grant a step agent needs under the `step-agent`
ESCALATION list.

### Stage S0 — Types and codes
- [x] Spec §10 amended first (dated note), then `DISARMED` and `DOMAIN_BLOCKED` in
      `shared/src/codes.ts` (25 codes: 24 on the wire, `NO_CURSOR` from the SDK); the safety-state
      type and its guard; the wire shape ruled at Stage 0 (0.6).
**Lane:** `shared/src/`, `shared/test/`, `docs/specs/…-design.md` (§10 note). **Parallel with:** first, alone.
*Amended 2026-10-24 (decisions.md · 2026-10-24 · Step 9's stage split after Stage 0: S2 becomes S2a
(enforcement) and S2b (UI) (#145)): S0's budget is 0.75 h, alone; its first deliverable pastes Stage 0's plan-side
amendment texts into this doc (this commit), and the spec gets a dated note in §6.5 (the human now also holds
the kill switch, the JavaScript switch and the block list) beside §10's. The wire shape is #132 (events
`safetyState` E→D and `safetyStatus` D→C, `daemon.status.safety`), the codes #133 (`DISARMED {scope}`), the
`hidden` marker #134; `shared/test/codes.test.ts`'s count 23 → 25 is a count change, not an error text (Stage 0
F32). The types every later stage needs land here, since S3's lane has no `shared/` (Stage 0 F18).*

### Stage S1 — The gate and the host matcher (pure, TDD)
- [x] `extension/src/safety.ts`: the method table (every router method classified), `safetyDecision`,
      the host-pattern parser and matcher, the `listTabs`/event redaction, the network-log filter
      predicate. Failing tests first.
**Lane:** `extension/src/safety.ts`, `extension/test/`. **Parallel with:** S3 (file-disjoint).
*Amended 2026-10-24 (#145): S1's budget is 2.5 h, in parallel with S3 (2.5 h). Its gate has the F7 signature
and the post-check predicate (0.1's notes), and its matcher cases are stage0-audit.md §5's 50 (S1.3 as amended
below).*

### Stage S2 — Extension wiring and UI
- [x] The router calls the gate before every handler; `storage.local` state with defaults;
      `storage.onChanged`; disarm → detach debuggers, stop waits, drop pending downloads, stop network
      recording; manifest `action` + `commands`; top-level `action.onClicked` / `commands.onCommand`;
      badge and title; the options page (switches, block list, a link that opens
      `chrome://extensions/shortcuts`); the own-extension-page block; download final-URL check.
**Lane:** `extension/src/` (`sw.ts`, `router.ts`, `options.ts`, `handlers/*`, `network-state.ts`,
`debugger.ts`), `extension/options.html`, `extension/manifest.json`, `extension/test/`.
**Parallel with:** after S1.

*Amended 2026-10-24 (Stage 0 F20) — S2's deliverable: the shortcut is
the reserved `_execute_action` command (`suggested_key` `Alt+Shift+K`), which Chrome dispatches as
`action.onClicked`; one top-level `action.onClicked` listener serves the button and the shortcut, and there is
no `commands.onCommand` listener (D11). Whether the key is assigned (a conflicting suggestion is left
unassigned) and whether Alt+Shift changes the Windows input language are read in S4 (SAFE-2).*
*Superseded 2026-10-24: was "manifest `action` + `commands`; top-level `action.onClicked` /
`commands.onCommand`" as two listeners, because `_execute_action` arrives as `action.onClicked` (Stage 0 F20;
decisions.md · 2026-10-24 · The shortcut is `_execute_action` (#142)). The manifest's `commands` entry stays: it
declares `_execute_action`.*

*Amended 2026-10-24 (Stage 0 F18): S2's lane is `extension/src/**` except `content/**` and `safety.ts` (S1's), plus `options.html`,
`manifest.json`, `extension/test/`.*
*Superseded 2026-10-24: was the file list above, because the work also needs `tab-events.ts` (event
redaction, F2), `network-log.ts` (query filter, F9), `tabs.ts` (`pendingUrl`, capture verification, F11),
`download.ts` (store clear at disarm) and `network-scope.ts` (scope resolution, F7) (Stage 0 F18; decisions.md ·
2026-10-24 · Step 9's stage split after Stage 0: S2 becomes S2a (enforcement) and S2b (UI) (#145)).*

*Amended 2026-10-24 (decisions.md · 2026-10-24 · Step 9's stage split after Stage 0: S2 becomes S2a
(enforcement) and S2b (UI) (#145)): Stage S2 is run as two stages, each with its own verifier. The name S2b is
Step 9's own; Step 8's S2b (the daemon half of Step 8's S2) is unrelated.*
*Superseded 2026-10-24: was one Stage S2 of 3 h, because #137 and #139 roughly double the enforcement work
(#145).*

#### Stage S2a — Extension enforcement (3 h, after S1)
- [x] (From S2's checkbox, by content:) the router calls the gate before every handler — at receipt, before each
      first side effect and as the post-check (0.1's F1 note); `storage.local` state with defaults, read per
      call after `ready`, failing closed (0.2's F10 note), `setAccessLevel` to trusted contexts and the
      router's sender check (#139); `storage.onChanged`; the state module's toggle (the in-memory copy updated
      before the write; the 1 s re-arm rule of #144); disarm → detach debuggers (a pure session registry),
      stop waits, drop pending downloads, stop network recording; the network ingest and query filter with
      the pre-ready buffer (0.4's F9 note); the `listTabs`/event redaction wired in `sw.ts`/`tab-events.ts`;
      capture verification (Stage 0 F11); the own-extension-page block; download final-URL check.
**Lane:** S2's lane as amended by F18 minus the manifest and the options page: `extension/src/**` except
`content/**`, `safety.ts` (S1's) and `options.ts`; plus `extension/test/`. **Parallel with:** after S1.

#### Stage S2b — Extension UI and the 0.7 log scan (1.5 h, after S2a)
- [x] (From S2's checkbox, by content:) manifest `action` + `commands` (`_execute_action`, F20 note above);
      the top-level `action.onClicked` listener calling S2a's toggle; badge and title (#143), re-derived from
      `storage.local` at every worker start (Stage 0 F42, #144); the options page (switches, block list with
      invalid lines marked and counted — 0.6's F23 note — and a link that opens
      `chrome://extensions/shortcuts`); the 0.7 log scan and sentinel test (0.7's F28 note).
**Lane:** `extension/manifest.json`, `extension/options.html`, `extension/src/options.ts`, the badge (a module
of its own under `extension/src/` plus its start-up and the `action.onClicked` registration in `sw.ts`), the
log-scan test, `extension/test/`. **Parallel with:** after S2a.
*(Split of S2's exit checks, IDs kept: S2.1 and S2.2 are S2a's; S2.3 is S2b's; S2.4 is checked at both closes,
since both stages edit `sw.ts`.)*
*Corrected 2026-10-24 (S0 fixer r1): was stated under the stage split as if #145 made it — this split of S2's exit
checks and S2b's lane gaining the badge's start-up and the `action.onClicked` registration in `sw.ts` — because
#145 does not assign exit checks (it names the budgets, the order and the lanes only). Both are the S0 step agent's,
proposed (S0.md Proposed decisions); #145 split the stage.*

### Stage S3 — Daemon relay, SDK and MCP
- [x] The daemon relays the safety state; `daemon.status` carries it; the SDK exposes it read-only;
      `browser_status`'s `Safety:` line; the MCP's one-line rendering of the two codes; both codes stay
      out of the attach set (a test).
**Lane:** `daemon/src/`, `daemon/test/`, `sdk/src/`, `sdk/test/`, `mcp/src/`, `mcp/test/`.
**Parallel with:** S1 (types from S0 only); cross-package verifier over real `ws` with a fake extension.
*Amended 2026-10-24 (#145): S3's budget is 2.5 h, in parallel with S1. Its wire shape is #132; its output
redaction and hidden-row rendering #134 (0.3's F2/F40 notes, 0.4's F41 note).*

### Stage S4 — E2E (live, the driver's; rows `SAFE-*` in `docs/e2e-test-plan.md` §4.20)
- [x] Rows written and committed before the build is loaded (proposed list, Stage 0 completes it):
      SAFE-0 stale check (a call refused `DISARMED` only the new build can give); SAFE-1 toolbar click
      disarms → badge `OFF` → an SDK call and an MCP call get `DISARMED` → click re-arms → both work;
      SAFE-2 the shortcut does the same; SAFE-3 the options switch; SAFE-4 disarm during a running
      `waitFor` and a trusted action's debugger session → refused within one poll, banner gone;
      SAFE-5 `localhost:8081` blocked → calls on the 8081 fixture tab and `navigate` to it refused, the
      8080 fixture works, `listTabs` shows no 8081 title/URL, the network log has no 8081 entry;
      SAFE-6 JavaScript off → `evaluate` refused, `click` works; SAFE-7 `navigate` to the extension's
      options page refused; SAFE-8 nothing recorded in the network log while disarmed; SAFE-9 every
      toggle survives an extension reload (by script); SAFE-10 the log scan: no pattern, URL or token
      in `daemon.log` or the worker's console lines captured during the wave.
- [x] **The wave ends with the safety state restored** — armed, JavaScript on, the block list exactly
      as it was before the wave (read and recorded at the start) — and the record shows the read-back.
**Lane:** `recipes/`, `docs/e2e-test-plan.md`, the steps dir.
*Amended 2026-10-24 (#145): S4's budget is 1.5 h prep + 2.5 h live, alone, after S2b and S3. Stage 0 completed
the proposed row list in `docs/plans/2026-10-24-step9-phase-e-safety-steps/stage0-audit.md` §7 (SAFE-0…SAFE-11,
with SAFE-1b, 4b, 5b–5d, 6b, 6c, 7b–7d), which S4 writes into §4.20 before the build is loaded.*

### Stage S5 — Docs
- [x] `docs/setup.md` "Safety" section (the three controls, the shortcut, what agents see, the
      JavaScript switch and the Blackboard recipes, the own-page block); `CLAUDE.md` (key files,
      gotchas measured in S4); `README.md` security paragraph; the roadmap's Phase E block.
**Lane:** docs only.
*Amended 2026-10-24 (#145): S5's budget is 1 h, last. The "Safety" section also states what the block list
does not do (0.4's F16 note).*

## Exit checks (pre-registered)

- **S0.1** `npm test` ≥ before + new; typecheck green. **S0.2** `codes.ts` lists 25 codes with the two
  new ones on the wire lists; spec §10's dated note precedes the code commit (`git log` order).
  - *Amended 2026-10-24 (Stage 0 §6; decisions.md · 2026-10-24 · Stricter exit checks for Step 9 (#141)):
    S0.1 reads "`npm test` = 1714 + n with n ≥ 1, no test removed, listed per file; typecheck exit 0".*
    *Superseded 2026-10-24: was "`npm test` ≥ before + new; typecheck green", because "≥ before + new" is weak
    (Stage 0 F15/§6; #141).*
  - *Amended 2026-10-24 (Stage 0 §6; decisions.md · 2026-10-24 · Stricter exit checks for Step 9 (#141)):
    S0.2 reads as written, and adds "the two codes are in `EXTENSION_ERROR_CODES`; `codes.test.ts` asserts 25
    and both names; the safety-state guard rejects a missing/extra-typed field (tests); the event names of D1
    are in `protocol.ts`" (D1 = #132).*
- **S1.1** every name passed to `router.on(` in `extension/src/sw.ts` appears in the safety table — a
  test that reads the router's registered names, and fails when one is added unclassified (shown by a
  mutation). **S1.2** `safetyDecision` tested for every class × {armed, disarmed} × {JS on, off} ×
  {blocked, not blocked, own-extension page}. **S1.3** the matcher's table of cases (≥ 20, including
  subdomain vs suffix-lookalike `notbank.com`, port, IDN, IP, case, trailing dot, empty and invalid
  lines) written before the matcher.
  - *Amended 2026-10-24 (Stage 0 §6; decisions.md · 2026-10-24 · Stricter exit checks for Step 9 (#141)):
    S1.1 reads as written, and adds F17: "`Router.on` of an unclassified name throws (test)".* (`Router.on`
    lives in `extension/src/router.ts`, outside S1's lane as written — see the S0 builder report.)
  - *Amended 2026-10-24 (Stage 0 §6; decisions.md · 2026-10-24 · Stricter exit checks for Step 9 (#141)):
    S1.2 reads as written, and adds "× {redaction outcome for `listTabs`}; the network forms × {`tabId`,
    `scope:"all"`, `id` lookup} (refused while disarmed; `"all"`/`id` never refused while armed, their entries
    filtered); and the post-check predicate over {state changed, tab now blocked, **tab gone during the call**,
    **tab replaced during the call**}. Required rows (fixer r1, V3): {tab gone, tab replaced} × armed + JS on +
    empty list → **reply unchanged** (e.g. `evaluate("window.close()")`, a click that closes its popup); tab
    gone × disarmed → `DISARMED`; tab gone with a last URL that is blocked → `DOMAIN_BLOCKED`, with none known →
    reply unchanged; tab replaced with the new id's URL blocked → `DOMAIN_BLOCKED`; a tab unreadable at receipt ×
    armed → allow (the handler answers `TAB_UNKNOWN` as today); a network call on a closed tab × armed + empty
    list → allow".*
  - *Amended 2026-10-24 (Stage 0 §6; decisions.md · 2026-10-24 · Stricter exit checks for Step 9 (#141)):
    S1.3 reads "the 50 cases of stage0-audit.md §5 (≥ 20), committed before the matcher (`git log` order)".*
    *Superseded 2026-10-24: was "the matcher's table of cases (≥ 20, including subdomain vs suffix-lookalike
    `notbank.com`, … ) written before the matcher", because §5's 50 cases (reserved names only, e.g. the
    lookalike `notbank.example`) are the list, and "before" is read from `git log` order (Stage 0 §6, V15;
    decisions.md · 2026-10-24 · The block-list grammar (#135); #141).*
- **S2.1** no handler runs before the gate (a test over the router with a disarmed state: zero handler
  calls). **S2.2** disarm detaches every attached debugger (test with a stubbed `chrome.debugger` where
  the glue is unit-testable; else an E2E row). **S2.3** `grep -rn "safety" extension/src` shows no log
  line printing a pattern or URL. **S2.4** the content script bundle is still an IIFE; no top-level
  `await` in `sw.ts`.
  - *Amended 2026-10-24 (#145): S2.1 and S2.2 are S2a's checks, S2.3 is S2b's, S2.4 is checked at both S2a's
    and S2b's close (both edit `sw.ts`); the IDs stay S2.1–S2.4.*
    *Corrected 2026-10-24 (S0 fixer r1): was "Amended 2026-10-24 (#145)", because #145 does not assign exit
    checks: this assignment is the S0 step agent's, proposed (S0.md Proposed decisions); #145 split the stage.*
  - *Amended 2026-10-24 (Stage 0 §6; decisions.md · 2026-10-24 · Stricter exit checks for Step 9 (#141)):
    S2.1 reads as written, and adds "and for an unknown method, bad JSON and a handler that throws before its
    first await — the gate's position is before any handler code".*
  - *Amended 2026-10-24 (Stage 0 §6; decisions.md · 2026-10-24 · Stricter exit checks for Step 9 (#141)):
    S2.2 reads "the debugger session registry is pure and unit-tested: disarm detaches every recorded session;
    `withDebugger` refuses to attach while refused; a detach-caused error becomes `DISARMED`".*
    *Superseded 2026-10-24: was "test with a stubbed `chrome.debugger` where the glue is unit-testable; else an
    E2E row", because "else an E2E row" is an escape hatch that makes the check non-discriminating (Stage 0
    F15, F6; #141).*
  - *Amended 2026-10-24 (Stage 0 §6; decisions.md · 2026-10-24 · Stricter exit checks for Step 9 (#141)):
    S2.3 reads "the 0.7 scan test enumerates every `console.*` and injected-logger call site in the four
    packages against an allowlist, and a sentinel test (pattern, URL, title, token) finds none in captured log
    output".*
    *Superseded 2026-10-24: was "`grep -rn "safety" extension/src` shows no log line printing a pattern or
    URL", because a log line printing a URL need not contain "safety", so the grep cannot fail (Stage 0 F15,
    F28; #141).*
  - *Amended 2026-10-24 (Stage 0 §6; decisions.md · 2026-10-24 · Stricter exit checks for Step 9 (#141)):
    S2.4 reads "`grep -c '^import\b' extension/dist/content.js` → `0` and `grep -c '^export\b'
    extension/dist/content.js` → `0` (both 0 at `a0700e0` after `npm run build`); and a vitest test parses
    `extension/src/sw.ts` with the TypeScript compiler API (`typescript` is a root devDependency) and fails on
    any `AwaitExpression` or `for await` whose nearest enclosing function is the source file — shown failing on
    a mutation that appends `const st = await chrome.storage.local.get("armed");`. Quick check beside it: `grep
    -cE '^[^[:space:]/*].*\bawait\b' extension/src/sw.ts` → `0` at `a0700e0`, `1` on that mutation (run by fixer
    r1 on a scratch copy); the grep misses an `await` on an indented continuation line at module scope, so the
    AST test is the check."* (The audit's own fixer-r1 history note on this row is not repeated here; see
    stage0-audit.md §6.)
    *Superseded 2026-10-24: was "the content script bundle is still an IIFE; no top-level `await` in
    `sw.ts`" with no command, because Stage 0 named the commands and a mutation-proven AST test (Stage 0 §6,
    V11; #141).*
- **S3.1** `DISARMED` and `DOMAIN_BLOCKED` are not in `ATTACH_CODES` (test). **S3.2** `browser_status`
  prints the `Safety:` line in all four armed × JS states (test). **S3.3** no new client-to-daemon or
  daemon-to-extension method changes the safety state (`grep` over `methods.ts` and the router: no
  `arm`/`disarm`/`setSafety`/`block`, empty and exit 1).
  - *Amended 2026-10-24 (Stage 0 §6; decisions.md · 2026-10-24 · Stricter exit checks for Step 9 (#141)):
    S3.2 reads "all four armed × JS states **and** 'not reported' (an extension that predates Step 9),
    singular/plural blocked count; and the MCP line and the SDK `report()` for `DISARMED` differ by
    `data.scope` (`"all"` vs `"evaluate"`), both tested (V9)".*
    *Superseded 2026-10-24: was "in all four armed × JS states (test)", because the null state, the count's
    plural and the two scopes' wording also need tests (Stage 0 §6, V9; #132, #133; #141).*
  - *Amended 2026-10-24 (Stage 0 §6; decisions.md · 2026-10-24 · Stricter exit checks for Step 9 (#141)):
    S3.3 reads "the safety keys are written only by `options.ts` and the toggle module (a static test over
    `storage.local.set` call sites); no daemon/SDK/MCP method name is added beyond D1's events (a test diffs
    `methods.ts` tables and the MCP tool list against Step 8's)".*
    *Superseded 2026-10-24: was "`grep` over `methods.ts` and the router: no `arm`/`disarm`/`setSafety`/`block`,
    empty and exit 1", because a method named otherwise passes the grep (Stage 0 F15; #141). The `storage.local.set`
    half reads `extension/src`, which S3's lane does not hold: whichever stage writes the toggle module (S2a)
    or the options page (S2b) carries that test, and S3 carries the method-table diff.*
    *Corrected 2026-10-24 (S0 fixer r1): was stated here as settled, beside #141 and the stage split, because
    #145 does not assign exit checks: moving the `storage.local.set` half to S2a/S2b is the S0 step agent's,
    proposed (S0.md Proposed decisions); #145 split the stage.*
- **S4.1** rows committed before the build is loaded. **S4.2** the reload script's exit 0 and SAFE-0 are
  the first recorded lines. **S4.3** every SAFE row's observed text in the record. **S4.4** the final
  safety-state read-back equals the start's.
  - *Amended 2026-10-24 (Stage 0 §6; decisions.md · 2026-10-24 · Stricter exit checks for Step 9 (#141)):
    S4.3 reads "observed text against the pre-written expected text, row by row, by a fresh verifier".*
    *Superseded 2026-10-24: was "every SAFE row's observed text in the record", because presence alone does not
    compare it with the expected text (Stage 0 §6; #141).*
  - *Amended 2026-10-24 (Stage 0 §6; decisions.md · 2026-10-24 · Stricter exit checks for Step 9 (#141)):
    S4.4 reads "armed, JS and the **sha256 of the block-list text** read back equal the start's; neither the
    list nor its hash's input is printed".*
    *Superseded 2026-10-24: was "the final safety-state read-back equals the start's", because a block list
    compared by line count passes when a pattern changed (Stage 0 F15; #141).*
- **S5.1** `setup.md` documents the three controls and the shortcut; every new gotcha cites its source.

## Human gates

- **G9-1** — the E2E wave toggles the **user's real extension's** safety state and presses Chrome's
  toolbar button and shortcut by UI automation in the driver's own window (as `reload-extension.ps1`
  does for the reload). Covered by decisions.md · 2026-10-22 · Live E2E waves are run by Claude end to
  end (#33) and #64/#65 for UI automation of the extension card; the restore of S4 is mandatory. A
  restore that fails stops the run and asks the user.
- **G9-2** — pinning the extension's button to the toolbar, if UI automation cannot reach an unpinned
  button: the driver may pin it by UI automation; if that fails, ask the user once.

## STOP rules and forbidden fixes

**Stops the gate:** a router method reachable without the gate; any path by which a client changes the
safety state; the own-extension-page block missing; a log line carrying a pattern, URL, title or the
token; the safety state not restored after S4; a `CLAUDE.md` runtime invariant that would have to
change.

**Forbidden fixes:** exempting a method from the gate to make a row pass; a wire, daemon or SDK method
that arms, disarms, edits the list or enables JavaScript; arming by default on a reload after the human
disarmed; enforcing in the daemon or SDK instead of the extension (they may only add to it); matching
blocked hosts by substring; logging a pattern or URL to debug the matcher; weakening any Step 6–8
invariant (leases, the lock, the cursor rule, the token gate, the bind).

## Open items

- Ruled at Stage 0 (conservative rule, listed for the user): the wire shape of 0.6; one code or two
  for the JavaScript switch (0.5); `listTabs` redaction while disarmed and for blocked tabs; the network
  log while disarmed; the exact pattern grammar.
  *Amended 2026-10-24: ruled at Stage 0 and listed under Open decisions for the user — the wire shape #132,
  one code #133, the redaction #134, the grammar #135, the network log while disarmed #137 item (6) (with 0.4's
  F9 note); also #136, #138–#141 and #144 (decisions.md · 2026-10-24, titles as cited in the notes above).*
- Not this step: an audit log of agent actions (it would log page content: needs its own design);
  per-client permissions; Chrome's own "site access" for the extension (`host_permissions` stays
  `<all_urls>`).

## Follow-ups (later steps, planned 2026-10-24 — decisions.md · 2026-10-24 · The roadmap after Step 8 (#129))

- **Step 10 — Step 8 follow-ups:** the six work items of wave W2 (#106 MCP trusted tools focus first;
  #117 a warning past the snapshot's 800 cap; #125 a squashed `step8` release tag; #126 a live N ≥ 1
  retire row; #127 `browser_evaluate {saveTo}` and S6.3 redone through it) and the carried inputs
  (the ~1.5 s failure-report screen switch; `bb-login.ps1`'s condition-based post-submit wait).
- **Step 11 — D3 file upload:** `browser_upload_file` / `Tab.upload` via `DOM.setFileInputFiles`.
- **Step 12 — Phase F items:** `args` for `browser_evaluate`, console/error capture, and the
  keep-attached debugger session if the design allows.
