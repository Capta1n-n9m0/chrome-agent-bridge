# Step 5 — Network inspection: `browser_network_requests` / `browser_network_clear`

> **DRAFT — not yet started.** For agentic workers: TDD for the pure `NetworkLog` (reducer, bounds,
> query, formatter, body summary, serialise/merge) and for the server tools; the `chrome.webRequest`
> wiring, `chrome.storage.session` write-through and service-worker lifecycle are manual E2E. Steps use
> checkbox (`- [ ]`) syntax and are ordered so each Part leaves `npm test` + `npm run typecheck` green.
> Prerequisites: Steps 1–4 done (`2026-09-03-step1…3`, `2026-09-07-step4`). No `chrome.debugger` is
> involved, so nothing here depends on `withDebugger` / `describeDebuggerError`.

**Goal:** Let the agent see what the page is talking to — method, URL, status, resource type,
duration, size and (on request) headers and a request-body summary for every request the active tab
has made — so it can debug a failing XHR, discover an app's API, confirm a form really POSTed, or
tell whether a page has gone quiet. Captured **always-on and banner-free** (like the DevTools Network
panel with *Preserve log* ticked) in a bounded per-tab log, queried on demand. Two new tools
(18 → 20), plus an optional `networkIdle` mode for `browser_wait_for` (Part N6).

**Non-goals (v1):** response bodies; request bodies beyond a short redacted summary; WebSocket
frames; timing breakdown (DNS/TLS/TTFB); transfer size; modifying or blocking requests; surviving a
Chrome restart; scoping the log to the current document (it is per *tab*, navigation does not clear
it). All are listed under "Follow-ups"; response bodies have a sketch there because they force a
`withDebugger` refactor and must not be folded into this step.

**Files touched:**
- `shared/src/protocol.ts` (types only: `NetworkEntry`, `NetworkRequestsResult`)
- new `extension/src/network-log.ts` + `extension/test/network-log.test.ts`
- new `extension/src/network-state.ts`, `extension/src/handlers/network.ts`; `extension/src/sw.ts`;
  `extension/manifest.json` (`webRequest` permission)
- `server/src/tools/registry.ts` + `server/test/tools.test.ts`
- `test-fixtures/e2e-playground.html`, new `test-fixtures/ok.json`, new
  `test-fixtures/redir/index.html`
- `docs/e2e-test-plan.md`, `docs/setup.md`, `docs/progress-and-roadmap.md`, `CLAUDE.md`
- Part N6 only: `extension/src/handlers/wait.ts`, `server/src/tools/registry.ts` (`browser_wait_for`)

**Order of work:** N0 (types) → N1 (pure, TDD) → N2 (extension) → N3 (server, TDD) → N4 (E2E) →
N5 (docs + commits) → N6 (optional, `networkIdle`). N1 and N3 have no dependency on each other and
can run in parallel; N2 needs N1; N4 needs everything built, the extension reloaded **and
re-enabled** (see the N4 human gate — the manifest gains a permission).

---

## 0. Design decisions

### 0.1 Where the events come from

| Source | Banner? | Bodies? | Sees requests made *before* the agent asked? | Conflicts with `withDebugger`? | Notes |
|---|---|---|---|---|---|
| **A. `chrome.webRequest` observers** (**chosen for v1**) | no | request-body summary only (`requestBody` extraInfoSpec); **no response bodies** | yes — listeners are always on | no | Gives URL, method, type, status, headers, IP, cache flag, timestamps, initiator, `net::ERR_*`. Listeners must be registered synchronously at the top level of `sw.ts`; each event wakes the SW. |
| **B. CDP `Network` domain via `chrome.debugger`** | **yes, for the whole capture window** | yes (`Network.getResponseBody`, only while attached) | only after an explicit `start` | **yes** — `withDebugger`'s `finally { detach }` would kill a long-lived capture, and a second `attach` throws | Needs a per-tab attach session manager first. Right design for bodies; wrong default. |
| **C. `performance.getEntriesByType("resource")` via `callInPage`** | no | no | yes (page's own ~250-entry buffer) | no | No status codes, headers or failures; lost on navigation. A fallback, not a product. |

**Decision:** v1 is **A**. It matches the repo's "no banner by default" stance, needs no lifecycle
refactor, and covers the debug-an-XHR / discover-the-API use cases. `webRequest` (observe-only) is
allowed in MV3; only `webRequestBlocking` is policy-gated, and we never block.

### 0.2 Where the log lives — the service worker is culled

The MV3 service worker is terminated after ~30 s idle (the 25 s keepalive alarm makes that rare, not
impossible). Non-blocking `webRequest` events *wake* it, but an in-memory-only buffer would be empty
on every wake. Two fixes; **(1) is chosen**:

1. **Write-through to `chrome.storage.session`** — 10 MB quota, in memory, cleared when Chrome exits
   (exactly the lifetime we want), trusted-context-only by default (the content script cannot read it).
   Debounced flush (250 ms trailing, 1 s max wait); rehydrate on SW start. No new message plumbing.
2. Forward events to the offscreen document (already persistent) and keep the buffer there. More
   moving parts; only better if storage writes prove costly. Not chosen.

**Gotcha that shapes the code: a module service worker must not use top-level `await`** — Chrome
fails the worker with `TypeError: Top-level await is disallowed in service workers`, because the
script has to finish evaluating synchronously so its event listeners are known. So the rehydrate is
**not** awaited at the top: listeners ingest into the in-memory log from the first event, a
`ready = rehydrate()` promise runs alongside, and when it resolves the stored entries are **merged
underneath** the live ones (`NetworkLog.merge` — live wins on an id collision). Handlers `await ready`
before querying so a query right after a wake sees the full history.

Storage layout: one key per tab, `netlog:<tabId>` → `NetworkEntry[]`, plus `netlog:meta` →
`{ v: 1, since }`. The flush writes only the tabs that changed since the last flush
(`log.takeDirty()`), so a page-load storm in one tab does not re-serialise every other tab.
`forgetTab` removes the key. Rehydrate reads `storage.session.get(null)` and merges every `netlog:*`
key. If a `set` rejects (quota), the SW calls `log.evictOldest(0.5)` and retries once, logging
counts only. Reloading the extension at `chrome://extensions` clears session storage — expected.

### 0.3 Bounds and eviction

- **Per tab: 500 entries. Total: 2 000.** The `tabId: -1` bucket (requests Chrome cannot attribute
  to a tab: a site's own service worker, other extensions) counts as one tab.
- **Fair eviction:** when the total cap is hit, evict the oldest entry of the tab **with the most
  entries** — never the globally oldest. Otherwise one chatty background tab (a mail client polling)
  would push the quiet active tab's history out of the log, which is the history the agent asked for.
- `chrome.tabs.onRemoved` → `forgetTab`, so a long session with many closed tabs cannot grow the log.
- Per entry: at most 40 headers per side, each value cut to 512 chars; request-body summary ≤ 2 KB;
  URL stored whole but rendered cut at 300 chars. Worst case is then well under the 10 MB quota.

### 0.4 Privacy (non-negotiable — `CLAUDE.md` Conventions: never log page content or tokens)

- **`extraHeaders` is deliberately omitted** from every `extraInfoSpec`. Without it Chrome does not
  hand the extension `Cookie` / `Set-Cookie` (and a few transport headers such as `Accept-Encoding`),
  so cookies **never enter the extension at all** — stronger than redaction. If `Referer`/`Origin`
  turn out to be missing without it (NET-10 records what appears), that is a follow-up flag, not a
  v1 change.
- `redactHeaders` is defence in depth: `authorization`, `proxy-authorization`, `cookie`,
  `set-cookie`, `x-api-key`, `x-auth-token`, `x-csrf-token`, and any header whose name contains
  `token`, `secret` or `session` → value `<redacted>`. Applied at **ingest**, so the redacted form is
  the only one ever stored.
- Form fields named like `password`, `passwd`, `pwd`, `token`, `secret`, `otp`, `code` → `<redacted>`
  in the body summary; raw bodies are cut at 2 KB.
- Headers and bodies are only *returned* when asked (`includeHeaders` or an `id` lookup).
- **Query strings are kept** — they are part of the URL the agent needs to debug — and `docs/setup.md`
  must say so plainly (an `access_token=` in a URL will reach the model, the same way
  `browser_evaluate` can read `localStorage`).
- **The SW console never sees a URL.** Log counts and ids only (`[bridge] network: 212 entries,
  3 pending`). URLs carry tokens.

### 0.5 Query and output semantics

- **Tail semantics:** select the newest `limit` entries (default 50) for the tab, then **print them
  oldest → newest** so the transcript reads chronologically, like the Network panel. `total` is the
  pre-limit count so the agent knows it was truncated.
- Default target is the **active tab**; `tab: <id>` targets one tab; `tab: "all"` includes every tab
  and the `-1` bucket, with a `tab` column.
- `filter` matches the URL: plain substring (case-insensitive), or a `/regex/flags` when wrapped in
  slashes. An invalid regex is an error naming the pattern.
- `types` narrows by resource type and accepts the DevTools aliases agents will actually type:
  `xhr`/`fetch` → `xmlhttprequest`, `document` → `main_frame`, `frame` → `sub_frame`; other names
  pass through (`script`, `stylesheet`, `image`, `font`, `media`, `websocket`, `ping`, `other`, …).
- `failedOnly` keeps entries with `error` set or `status ≥ 400`.
- `id` returns one entry in full (headers + body) regardless of `includeHeaders`.
- One line per request, fixed-width columns, URL last so it can be long; times are **relative to
  now** (`2.1s ago`, `1m05s ago`) because "what happened after my click" is the question, and the
  formatter takes `now` so tests are deterministic. The recommended workflow for "only what my action
  caused" is `browser_network_clear` → act → `browser_network_requests`, and the tool description
  says so.

### 0.6 What `webRequest` cannot tell you (sets expectations in the tool description and docs)

- No response bodies, no transfer size (only `content-length` when present), no timing breakdown.
- **Cache hits skip `onHeadersReceived`** — `onCompleted` carries `statusCode`/`statusLine`/
  `responseHeaders`/`fromCache`, so the reducer must fill status from `onCompleted` too.
- A network-level `200` is not a successful `fetch`: a CORS-blocked response still logs as `200`.
- Requests issued by a site's own service worker are `tabId: -1`; the log cannot attribute them.
- Streams (EventSource, long polls) stay "pending" for their whole life — `pending()` therefore only
  counts entries started within the last 30 s, and `networkIdle` (N6) is activity-based, not
  pending-based.
- `data:`/`blob:` URLs never hit the network and never appear.

## N0. Wire protocol + shared types

```
→ { method: "networkRequests", params: { tab?: "active" | "all" | number, filter?: string,
                                         types?: string[], failedOnly?: boolean, limit?: number,
                                         includeHeaders?: boolean, id?: string } }
← { result: NetworkRequestsResult }

→ { method: "networkClear", params: { tab?: "active" | "all" | number } }
← { result: { cleared: number } }
```

```ts
export interface NetworkEntry {
  id: string;            // Chrome's requestId; redirect hops are suffixed ":2", ":3", …
  tabId: number;         // -1 = not attributable to a tab (site service workers, extensions)
  url: string;
  method: string;
  type: string;          // webRequest ResourceType: main_frame, xmlhttprequest, script, image, …
  initiator?: string;    // origin that started it
  startedAt: number;     // epoch ms (details.timeStamp of onBeforeRequest)
  endedAt?: number;      // set by onCompleted / onErrorOccurred / onBeforeRedirect
  durationMs?: number;
  status?: number;       // absent while pending or on a network error
  statusLine?: string;
  fromCache?: boolean;
  ip?: string;
  redirectUrl?: string;  // set on a 3xx hop that Chrome followed
  error?: string;        // net::ERR_* from onErrorOccurred
  responseSize?: number; // content-length, when present
  requestHeaders?: Record<string, string>;   // redacted at ingest, capped; only returned when asked
  responseHeaders?: Record<string, string>;
  requestBody?: string;  // ≤ 2 KB redacted summary; only returned when asked
}

export interface NetworkRequestsResult {
  entries: NetworkEntry[];  // the selected page, oldest → newest
  total: number;            // pre-limit count after filters
  pending: number;          // in flight, started < 30 s ago
  recordingSince: number;   // epoch ms — when this log started (extension load / last clear of "all")
  text: string;             // what the tool prints; rendered in the extension like `snapshot`
}
```

- [x] Add both interfaces to `shared/src/protocol.ts` — types only, no guard (same rationale as
      `EvalEnvelope`: they only ever travel as a `result`).

## Part N1 — `NetworkLog` (TDD, pure, node — no `chrome.*` imports)

`extension/src/network-log.ts` exports `NetworkLog`, `redactHeaders`, `summarizeBody`,
`normalizeType`, `formatEntries`, `formatEntry`, `isOwnTraffic`. Test file:
`extension/test/network-log.test.ts` (node environment; no jsdom needed). Hand-written fixture
builders (`before(id, {url, tabId, …})`, `headersReceived(id, 200, {...})`, `completed(id)`, …)
produce plain objects shaped like Chrome's details — define a **structural** input type in the
module so it never depends on `@types/chrome`'s (version-shifting) `*Details` names:

```ts
export interface WebRequestDetails {
  requestId: string; url: string; method: string; type: string; tabId: number;
  timeStamp: number; initiator?: string; frameId?: number;
  requestHeaders?: Array<{ name: string; value?: string }>;
  responseHeaders?: Array<{ name: string; value?: string }>;
  statusCode?: number; statusLine?: string; fromCache?: boolean; ip?: string;
  error?: string; redirectUrl?: string;
  requestBody?: { formData?: Record<string, string[]>; raw?: Array<{ bytes?: ArrayBuffer; file?: string }>; error?: string };
}
export type WebRequestEvent = "onBeforeRequest" | "onSendHeaders" | "onHeadersReceived"
                            | "onBeforeRedirect" | "onCompleted" | "onErrorOccurred";
```

### Task N1.1: ingest the event chain

- [x] Tests for `log.ingest(event, details)`:
  - `onBeforeRequest` creates an entry keyed by `requestId` with url/method/type/tabId/initiator/
        `startedAt = timeStamp`; the entry is pending.
  - `onSendHeaders` attaches request headers as a lower-cased `Record`, redacted, capped at 40 with
        values cut to 512 chars + `…`.
  - `onHeadersReceived` sets `status`, `statusLine`, redacted response headers, `responseSize` from
        `content-length` (absent when the header is absent or non-numeric).
  - `onCompleted` sets `endedAt`, `durationMs`, `fromCache`, `ip`; **a cache-hit chain with no
        `onHeadersReceived`** still ends with `status: 200` and headers (0.6).
  - `onErrorOccurred` sets `error` (e.g. `net::ERR_CONNECTION_REFUSED`) and ends the entry; no `status`.
  - A second `onCompleted` / late event for an already-ended id is idempotent (no duplicate, no
        `durationMs` change).
  - Events for an unknown `requestId` (SW restarted mid-request, then `onCompleted` arrives) create
        a best-effort entry from the fields every event carries (url/method/type/tabId/timeStamp) —
        never dropped.
- [x] Tests for `redactHeaders(list)` (0.4 list; case-insensitive; the `token`/`secret`/`session`
      substring rule; non-sensitive values untouched; duplicate names → last wins).
- [x] Implement.

### Task N1.2: redirects

- [x] Tests: `onBeforeRedirect` closes the current hop (`status: 301`, `redirectUrl`, `endedAt`) and
      the following `onBeforeRequest` with the **same** `requestId` opens a new entry with id
      `${requestId}:2` (then `:3`, …) so every hop is visible. A hop's headers belong to that hop.
      Querying by the bare id returns the first hop; by `id:2` the second.
- [x] Implement.

### Task N1.3: bounds, eviction, forget, clear, pending, activity

- [x] Tests:
  - per-tab cap 500: the 501st entry for a tab evicts that tab's oldest.
  - total cap 2 000 with **fair eviction** (0.3): with tab A holding 1 500 and tab B 500, a new
        entry for B evicts from **A**.
  - `evictOldest(0.5)` halves every tab (rounding up what is kept) and returns the count removed.
  - `forgetTab(tabId)` drops that tab's entries and marks nothing else dirty.
  - `clear(tabId | "all")` returns the count removed; `"all"` also resets `recordingSince` to `now`.
  - `pending(tabId | "all", { now, maxAgeMs = 30_000 })` counts entries with no `endedAt` started
        within the window; an unfinished entry older than the window is not counted (0.6).
  - `lastActivityAt(tabId | "all")` is the max `timeStamp` of any ingested event for that scope,
        `0` when nothing was seen — what N6's `networkIdle` reads.
  - `takeDirty()` returns the set of tabIds touched since the previous `takeDirty()` and clears it;
        eviction and `forgetTab` mark the affected tabs dirty.
- [x] Implement. Keep entries per tab in insertion order (an array per tab is enough; `Map<tabId, entry[]>`
      plus a `Map<id, entry>` index for O(1) ingest).

### Task N1.4: query

- [x] Tests for `query({ tabId: number | "all", filter?, types?, failedOnly?, limit?, includeHeaders?, id? })`:
  - default `limit` 50; returns the newest 50 **in chronological order**; `total` is the pre-limit
        count; `limit` is clamped to `[1, 500]`.
  - `filter: "ok.json"` (substring, case-insensitive); `filter: "/api\\/v[12]\\//"` (regex);
        `filter: "/OK/i"` (flags); `filter: "("` is a plain substring (no slashes → not a regex);
        `filter: "/(/"` throws `Invalid regex filter: /(/ — …`.
  - `types: ["xhr"]` matches `xmlhttprequest`; `["document"]` matches `main_frame`; `["fetch", "script"]`
        is a union (`normalizeType` tests separately).
  - `failedOnly` keeps `error` and `status ≥ 400`, drops pending and 2xx/3xx.
  - `tabId: "all"` includes the `-1` bucket; a numeric tab with no entries returns `total: 0`.
  - headers and `requestBody` are stripped from returned entries unless `includeHeaders` — except
        with `id`, which returns exactly that entry in full (or throws `No request with id …`).
  - `recordingSince` and `pending` are populated on every result.
- [x] Implement.

### Task N1.5: text rendering

- [x] Tests for `formatEntries(result, { now, scope })` — header line then one line per entry:

  ```
  Network — active tab: showing 4 of 212 (recording since 3m12s ago; 1 pending)
  [1042]  2.1s ago  GET     200  document   85ms   4.2 KB  http://localhost:8080/e2e-playground.html
  [1043]  1.9s ago  GET     200  xhr        12ms   118 B   http://localhost:8080/ok.json
  [1044]  1.5s ago  POST    501  xhr         9ms   —       http://localhost:8080/e2e-playground.html
  [1045]  1.0s ago  GET     ERR  xhr         3ms   —       http://127.0.0.1:9/  net::ERR_CONNECTION_REFUSED
  [1046]  0.4s ago  GET     ···  xhr        (pending)      http://10.255.255.1/
  [1047]  0.3s ago  GET     301  xhr         4ms   —       http://localhost:8080/redir  → /redir/
  Use filter/types/failedOnly to narrow, limit to widen, id for one request's headers and body.
  ```
  - a redirect hop shows `→ <redirectUrl>`; an error shows the `net::ERR_*`; pending shows `···`.
  - type column uses the DevTools names (`xhr`, `document`, `frame`, …) — `normalizeType` in reverse.
  - `tab: "all"` adds a `tab:<id>` column after the id.
  - duration `123ms` / `1.2s`; size `812 B` / `4.2 KB` / `1.1 MB`; `—` when unknown.
  - URL cut at 300 chars with `…`.
  - `recording since` uses the same "ago" formatter; `total: 0` prints `No requests recorded for
        <scope> (recording since …). Reload or act on the page, then query again.`
  - whole text capped at 20 000 chars with `… [truncated: N more lines — narrow with filter/limit]`
        (Step 4's convention).
- [x] Tests for `formatEntry(entry, { now })` (the `id` form):

  ```
  [1043] GET http://localhost:8080/ok.json
  type: xhr   initiator: http://localhost:8080   started 1.9s ago   took 12ms
  status: 200 OK   from cache: no   ip: 127.0.0.1   size: 118 B
  request headers:
    accept: */*
    authorization: <redacted>
  response headers:
    content-type: application/json
  request body:
    user=a&password=<redacted>
  ```
  - pending / error / redirect variants; missing sections are omitted, not printed empty.
- [x] Implement, including the pure `formatAgo(ms)`, `formatDuration(ms)`, `formatSize(bytes)` helpers.

### Task N1.6: request-body summary

- [x] Tests for `summarizeBody(requestBody)`:
  - `formData` → `k=v&k2=v2`; multi-valued keys repeat; values cut at 200 chars; fields named like
        the 0.4 list → `<redacted>`.
  - `raw` → UTF-8 decode of the first 2 KB (`TextDecoder`, `fatal: false`), `…[+N bytes]` suffix;
        undecodable/binary (a NUL in the first 64 bytes, or a `file` part) → `<binary N bytes>` /
        `<file upload: name>`; JSON bodies whose top-level keys match the sensitive list get those
        values redacted after decoding (best effort — parse, redact, re-stringify; on parse failure
        keep the raw cut).
  - `error` (Chrome could not read the body) → `<unavailable: reason>`; `undefined` → `undefined`.
- [x] Implement. **Summarise at ingest** — `raw[].bytes` is an `ArrayBuffer`, which cannot be stored
      in `storage.session` and must not be kept in memory.

### Task N1.7: serialise / merge / own-traffic filter

- [x] Tests: `toJSON()` → `{ meta: { v: 1, since }, tabs: { "<tabId>": NetworkEntry[] } }`;
      `merge(blob)` inserts entries **that are not already present** (live wins on id collision),
      keeps each tab's array in `startedAt` order, honours the caps, keeps the older `since`;
      a corrupt blob (`null`, wrong `v`, non-array tab) merges to nothing and never throws.
- [x] Tests for `isOwnTraffic(url, port)`: `ws://127.0.0.1:9234/` and `wss://…:9234` → true;
      `chrome-extension://…` → true; `http://127.0.0.1:8080/` → false (the E2E fixture is local too).
- [x] Implement.

**Deviations:** (1) column spacing in `formatEntries` differs from the illustrative sample above by a
single space between the duration and size columns — every column is fixed-width and joined by two
spaces (`[id]`6, `tab:<id>`8 only for `"all"`, ago 9, method 6, status 3, type 9, duration 4 right-
aligned, size 6; pending collapses duration+size into one 12-wide `(pending)` field). (2) `formatAgo`
returns the `" ago"` suffix itself (`"2.1s ago"`), since every call site wants it. (3) `formatEntries`
takes an optional `maxChars` (default 20 000) so the truncation test does not need 20 KB of fixture.
(4) `normalizeType` also maps `iframe` → `sub_frame`. (5) `NetworkLog` additionally exposes
`entriesFor(tabId)` (a copy of one tab's stored entries) and a `recordingSince` getter — N2's flush
needs to serialise just the dirty tabs. (6) `merge` does **not** mark tabs dirty (the data came from
storage, so re-writing it would be pointless).

## Part N2 — extension wiring (manual E2E; keep the glue thin)

### Task N2.1: manifest

- [x] `manifest.json`: add `"webRequest"` to `permissions`. `host_permissions: ["<all_urls>"]`
      already covers observation. **No** `webRequestBlocking`.
- [x] Note for the N4 human gate: after a permission is added, `chrome://extensions` may show the
      extension disabled with a "requires new permissions" notice — Reload, then Enable/Repair.

### Task N2.2: listeners, rehydrate, flush (all at the **top level** of `sw.ts`)

- [x] `const log = new NetworkLog({ now: Date.now })` and the six listeners, registered synchronously
      (MV3 needs them known on every SW start), all with `{ urls: ["<all_urls>"] }`:
      `onBeforeRequest` (`["requestBody"]`), `onSendHeaders` (`["requestHeaders"]`),
      `onHeadersReceived` (`["responseHeaders"]`), `onBeforeRedirect` (`["responseHeaders"]`),
      `onCompleted` (`["responseHeaders"]`), `onErrorOccurred` (no spec). **No `extraHeaders`** (0.4).
      Each: `if (isOwnTraffic(d.url, port)) return; log.ingest(name, d); scheduleFlush();`
      (`port` is read once from `chrome.storage.local` into a module variable, defaulting to 9234 —
      the WS host is on the loopback so the check is by port only).
- [x] `chrome.tabs.onRemoved` → `log.forgetTab(id); scheduleFlush()`.
- [x] `const ready: Promise<void> = chrome.storage.session.get(null).then(all => log.merge(fromKeys(all)))
      .catch(() => {})` — **not** awaited at the top level (0.2). Handlers receive `{ log, ready }`
      through a small `network-state.ts` module so `sw.ts` stays the wiring file.
- [x] `scheduleFlush()`: 250 ms trailing debounce with a 1 s max wait; the flush does
      `const dirty = log.takeDirty(); storage.session.set({ "netlog:meta": …, ...dirtyTabs })` and
      `storage.session.remove` for forgotten tabs; on rejection → `log.evictOldest(0.5)` and one
      retry; `console.warn` counts only.
- [x] SW console: `[bridge] network: rehydrated N entries` once; nothing per event.

### Task N2.3: handlers + router

- [x] `handlers/network.ts`:
  - `networkRequests(p)`: `await ready`; resolve `tab` (`undefined`/`"active"` → `activeTab().id`,
    `"all"`, or a number); coerce `limit` (`Number`, finite, default 50, clamp `[1, 500]`);
    `types` must be an array of strings if present; `id` must be a string if present; call
    `log.query(…)`; `text = id ? formatEntry(entry, {now}) : formatEntries(result, {now, scope})`;
    return `{ ...result, text }`.
  - `networkClear(p)`: `await ready`; resolve `tab`; `cleared = log.clear(scope)`; flush
    immediately (not debounced — the next query must not see stale storage after a wake); return
    `{ cleared }`.
- [x] `sw.ts`: `router.on("networkRequests", …)`, `router.on("networkClear", …)`.
- [x] `npm run build` succeeds; `dist/sw.js` contains the listener registrations outside any function.

**Deviations:** (1) `network-state.ts` owns the flush and the WS-port module variable and exports
`log`, `ready`, `scheduleFlush`, `flushNow`, `ownPort`, `setOwnPort`; `sw.ts` registers the six
listeners (a thin `ingest(name, d)` wrapper that drops own traffic) plus `chrome.tabs.onRemoved`, and
`getConfig()` calls `setOwnPort` so the port follows the options page (default 9234 until the first
read). (2) On a rejected `set` the retry writes the union of the original dirty set and the tabs the
`evictOldest(0.5)` newly dirtied, otherwise storage would keep rows memory no longer has; a second
failure warns and keeps memory only. (3) `networkRequests` treats an `id` lookup as global
(`tabId: "all"`) and skips resolving the active tab, so a detail lookup cannot fail with "No active
tab"; `tab` is otherwise resolved as specified. (4) `flushNow()` serialises against an in-flight
flush so `networkClear`'s immediate write cannot interleave with a debounced one.

## Part N3 — server tools (TDD)

### Task N3.1: `browser_network_requests`

- [x] `server/test/tools.test.ts`:
  - `browser_network_requests({})` calls `bridge.call("networkRequests", {})` (no defaults injected —
    the extension owns them) and returns `result.text`.
  - `{ filter: "/api/", types: ["xhr"], failedOnly: true, limit: 10, includeHeaders: true, tab: "all" }`
    passes through verbatim; `{ id: "1043" }` passes through.
  - a bridge error propagates (existing tool-error path).
- [x] Schema:
  `filter: z.string().optional()`, `types: z.array(z.string()).optional()`,
  `failedOnly: z.boolean().optional()`, `limit: z.number().int().min(1).max(500).optional()`,
  `includeHeaders: z.boolean().optional()`, `id: z.string().optional()`,
  `tab: z.union([z.literal("active"), z.literal("all"), z.number().int()]).optional()` — each with a
  one-line `.describe(…)`.
- [x] Description (agent-facing — this is the only documentation the model reads at call time):
  *"List recent network requests made by the active tab — method, status, type, duration, size, URL —
  captured continuously with no debugger banner, like the DevTools Network panel with 'Preserve log'.
  Newest 50 by default, printed oldest first. `filter` matches the URL (substring or /regex/),
  `types` narrows by resource type (xhr, script, image, document, …), `failedOnly` keeps network
  errors and 4xx/5xx. Pass `id` for one request's headers and request-body summary. Response bodies
  are not available (use browser_evaluate to re-fetch if you need one). Call browser_network_clear
  before an action to see only what it caused."*

### Task N3.2: `browser_network_clear`

- [x] Test: `browser_network_clear({})` → `bridge.call("networkClear", {})` → text `Cleared N requests.`;
      `{ tab: "all" }` passes through.
- [x] Schema `{ tab: <same union> }`. Description: *"Forget the recorded network requests for the
      active tab (or `tab:"all"`). Use it right before an action so the next browser_network_requests
      shows only what that action caused."*
- [x] Bump the tool count 18 → 20 in `CLAUDE.md`, `docs/setup.md` (tool table rows) and the roadmap.

**Deviations:** none — the two tools pass their params to `bridge.call` verbatim (no defaults
injected), the schemas and descriptions are as specified, and the shared `tab` union is a single
`tabTarget` zod value reused by both tools.

## Part N4 — E2E (manual, `docs/e2e-test-plan.md` new §4.8 "Network"; Waiting/Security/Real-world shift to §4.9–4.11)

**Human gate before this part:** `npm run build`; `chrome://extensions` → reload **and confirm the
extension is enabled** (the new `webRequest` permission may have disabled it); reconnect MCP (`/mcp`);
serve the fixtures with `python -m http.server 8080 --directory test-fixtures`; `browser_status`
reports connected. Reloading the extension empties `storage.session`, so the log starts fresh.

Fixture additions (`test-fixtures/`):
- [x] `ok.json` → `{"ok":true,"items":[1,2,3]}`.
- [x] `redir/index.html` → `<!doctype html><title>redir</title>ok` — `python -m http.server`
      answers `GET /redir` with `301 → /redir/`, which is the redirect case for free.
- [x] `e2e-playground.html`: a new `<section aria-label="Network">` with buttons, each updating the
      status line with the fetch's outcome (`set("fetch ok.json → 200")`, or the error name):
  - **Fetch JSON** → `fetch('/ok.json')`
  - **Fetch 404** → `fetch('/nope')`
  - **POST form** → `fetch('/e2e-playground.html', { method: 'POST', body: new URLSearchParams({ user: 'a', password: 'p' }) })`
    (`http.server` answers `501 Unsupported method` — a status the log must show; the *body summary*
    is the point of the case)
  - **Fetch redirect** → `fetch('/redir')`
  - **Fetch unreachable** → `fetch('http://127.0.0.1:9/')` (`net::ERR_CONNECTION_REFUSED`)
  - **Fetch black hole** → `fetch('http://10.255.255.1/')` (non-routable: stays pending ~20 s, then
    `net::ERR_CONNECTION_TIMED_OUT`; on a network that rejects fast, record the error instead)
  - **Fetch cross-origin** → `fetch('https://example.com/')` (CORS rejects the *fetch*; the *network*
    entry is a 200 — 0.6)
  - **Fetch 20×** → twenty `fetch('/ok.json?i=' + n)` in a loop (feeds NET-14 with `browser_evaluate`)

| ID | Objective | Steps | Expected |
|---|---|---|---|
| NET-1 ★ | Always-on capture, no banner | Navigate to the fixture, then `browser_network_requests {}` | The `document` GET (200) plus any assets; **no** debugging banner at any point; ids present. |
| NET-2 ★ | XHR + id lookup | Click **Fetch JSON**; query; then `{"id": "<that id>"}` | Line `GET 200 xhr … 118 B …/ok.json`; the detail shows `content-type: application/json`, request headers **without any `cookie` key** (0.4), `initiator: http://localhost:8080`. |
| NET-3 | 4xx | **Fetch 404**; `{"failedOnly": true}` | Exactly the `404 …/nope` line (the 200s are filtered out). |
| NET-4 ★ | Body summary + redaction | **POST form**; `{"id": …}` | `POST 501`; `request body: user=a&password=<redacted>`. |
| NET-5 | Network error | **Fetch unreachable**; query | `ERR … http://127.0.0.1:9/ net::ERR_CONNECTION_REFUSED`. |
| NET-6 | Redirect hops | **Fetch redirect**; query | Two lines with ids `N` and `N:2`: `301 … /redir → /redir/` then `200 … /redir/`. |
| NET-7 | Pending | **Fetch black hole**; query within 5 s; query again after ~25 s | First `··· (pending)` and `1 pending` in the header; later `ERR … net::ERR_CONNECTION_TIMED_OUT` and `0 pending`. |
| NET-8 | Cross-origin | **Fetch cross-origin**; query | A `200` entry for `https://example.com/` even though the page's status line reports a `TypeError` — the docs' "network 200 ≠ fetch success" claim. |
| NET-9 ★ | Filters | `{"filter":"/nope\|ok\\.json/"}`; `{"filter":"/(/"}`; `{"types":["xhr"]}`; `{"limit":2}` | The regex returns only those URLs; the bad regex is a clear `Invalid regex filter` error; `types` drops the document/assets; `limit:2` prints the two newest in chronological order with `showing 2 of N`. |
| NET-10 ★ | Logged-in site privacy | Open a site you are signed into (e.g. GitHub), act once, `{"includeHeaders": true}` and an `id` lookup | **No `cookie` / `set-cookie` header at all** on any entry; any `authorization` shows `<redacted>`; record whether `referer`/`origin` appear (0.4 follow-up flag); the SW console contains counts only — **no URL**. |
| NET-11 ★ | SW culling soak | **Fetch JSON**; leave Chrome untouched ≥ 3 min (verify the SW stopped in `chrome://serviceworker-internals` or the extension's "service worker (inactive)" label); **Fetch JSON** again; query | **Both** fetches listed with ids from before and after the restart — proves the write-through + merge; `rehydrated N entries` appears once in the SW console. |
| NET-12 | Tab lifecycle | `browser_new_tab` to the fixture, **Fetch JSON** there, `{"tab":"all"}`; close that tab; `{"tab":"all"}` again | The second tab's entries appear with a `tab:<id>` column, then vanish after the close; the first tab's entries are intact. |
| NET-13 | Clear | `browser_network_clear {}` → `Cleared N requests.`; query | `No requests recorded …` until the next request; `recording since` unchanged (only `"all"` resets it). |
| NET-14 | Cap + responsiveness | Click **Fetch 20×** ~25 times (or `browser_evaluate` a loop of 600 `fetch('/ok.json?i='+i)`); query with `{"limit": 500}` | Header shows `showing 500 of 500`; the oldest ids are gone; Chrome and the fixture stay responsive; no quota warning in the SW console (or exactly one, followed by a working query). |
| NET-15 | Regression smoke | ACT-2, TRUST-2, EVAL-1, WAIT-1 | Still pass — the manifest change and the new top-level listeners did not disturb the router or `withDebugger`. |
| NET-16 | *(N6 only)* Network idle | **Fetch JSON** then `browser_wait_for {"networkIdle": true}`; **Fetch black hole** then the same | Returns in ~0.5 s both times (activity-based: the pending black hole does not block it); `{"networkIdle": true, "idleMs": 2000}` takes ~2 s. |

- [x] Run all, record in the scorecard (§5) as **Run 6** with Chrome version + date; add the NET row
      to the results template.


**Deviations:** (1) The fixture's **Fetch unreachable** button targets `http://127.0.0.1:9999/`, not
the plan's `http://127.0.0.1:9/` — Chrome refuses port 9 before it reaches the network
(`net::ERR_UNSAFE_PORT`), so the plan's URL never produced the intended
`net::ERR_CONNECTION_REFUSED`. (2) NET-8 does not match its expectation on Chrome 152: a CORS-blocked
`fetch` fires `onErrorOccurred` (`net::ERR_FAILED`), so the entry is an error, not a `200` — §0.6's
"a network 200 is not a successful fetch" illustration needs a different example in the N5 docs.
(3) The cases were run in the order 1–10, 12–15, then 11, because NET-11's ≥ 3 min idle soak must be
the last thing the agent does (any tool call wakes the service worker). (4) `includeHeaders: true` is
a no-op through the MCP tool — the tool prints `result.text` and `formatEntries` renders only the
table, so headers are reachable only via the `id` form; recorded in the scorecard for an N5
docs/description decision rather than changed here (it would alter frozen N1 formatter output).
(5) NET-10's "SW console contains counts only" was verified by source audit rather than by reading
the console — `chrome://extensions` is a restricted URL the agent cannot evaluate in.
(6) NET-11 could not be run as written: the bridge's 25 s keepalive alarm means the service worker
**never idles out**, so leaving Chrome untouched for 3 min proves nothing. It was run instead by
force-stopping the worker from `chrome://serviceworker-internals`. The write-through therefore
protects against a forced stop or crash of the worker — not against routine idle culling (the
keepalive prevents it) and not across a Chrome exit (`storage.session` is cleared by design). The
case passes on its substance (a pre-stop and a post-restart entry listed together, one
`rehydrated N entries` line, `netlog:meta` surviving), but the specific pre-soak entry was lost
because its tab was closed during the soak — `forgetTab`, as designed. (7) Chrome's `webRequest`
`requestId` counter restarted low after the worker churn, so entry ids are unique only within a
capture session; `docs/setup.md` (N5) should say so.

## Part N5 — docs + commits

- [ ] `docs/setup.md`: two tool-table rows; a new "Inspecting network requests" subsection (what is
      captured, per-tab + Preserve-log semantics, the clear→act→query workflow, filters, the `id`
      form, what is *not* available: bodies/timing/WS frames, the 500/2 000 caps, `tabId -1`);
      in "Security notes": headers are redacted, cookies are never received, **query strings are
      kept**, nothing network-related is logged to the console.
- [ ] `docs/e2e-test-plan.md`: §4.8 table above, fixture notes in §1, results template row.
- [ ] `docs/progress-and-roadmap.md`: 20 tools; Step 5 milestone row; §0 entry once E2E ran; §3
      verified/not-verified; Phase F loses "wait_for network-idle" if N6 landed, gains the follow-ups
      below.
- [ ] `CLAUDE.md`: 20 tools; key-files line for `network-log.ts` / `handlers/network.ts`; gotchas:
      *module SWs reject top-level `await` — rehydrate is a promise the listeners run ahead of, then
      `merge`*; *`webRequest` listeners must be registered synchronously at the top level*;
      *cache hits skip `onHeadersReceived` — fill status from `onCompleted`*; *`extraHeaders` is
      omitted on purpose so cookies never reach the extension*; *`storage.session` is emptied by an
      extension reload and has a 10 MB quota — the flush halves the log on a rejected `set`*;
      *never log a URL from the SW*.
- [ ] Commits (each green, trailer per `CLAUDE.md`):
      `feat(extension): NetworkLog reducer, query and formatter (pure)`,
      `feat(extension): webRequest capture with session-storage write-through`,
      `feat(server): browser_network_requests + browser_network_clear`,
      `test(e2e): NET-1…15 + network fixtures`, `docs: network inspection`,
      and, if N6 lands, `feat: browser_wait_for networkIdle`.

## Part N6 — optional: `browser_wait_for { networkIdle: true }`

Only if N1–N5 landed green. Roadmap Phase F item; trivially cheap once `lastActivityAt` exists.
Activity-based, not pending-based (0.6): idle means *no webRequest event for the tab in the last
`idleMs`*, so a long-poll or EventSource cannot make it hang the way Playwright's `networkidle` does.

- [ ] `extension/src/handlers/wait.ts`: new branch when `p.networkIdle === true`: `await ready`;
      `idleMs` default 500 (clamp `[100, 10_000]`); poll every 100 ms until
      `now - log.lastActivityAt(tab.id) >= idleMs` (a tab with no activity ever is idle
      immediately); give up after the existing 10 s ceiling with `Timed out waiting for network idle`.
      Return `{ ok: true, idleAfterMs }`.
- [ ] `server/test/tools.test.ts`: `browser_wait_for({ networkIdle: true, idleMs: 800 })` calls
      `bridge.call("waitFor", { networkIdle: true, idleMs: 800 })` and returns
      `Network idle for 800ms`; the existing `text`/`seconds` forms are unchanged.
- [ ] Schema: `networkIdle: z.boolean().optional()`, `idleMs: z.number().int().min(100).max(10000).optional()`;
      description gains *"or `networkIdle:true` to wait until the tab has made no request for
      `idleMs` (default 500)"*. Handler error when none of `text`/`seconds`/`networkIdle` is given
      names all three.
- [ ] NET-16 recorded; `docs/setup.md` row updated.

## Definition of done

- `npm test` green with the new `network-log` suite and the tools tests; `npm run typecheck` clean;
  `npm run build` emits `dist/sw.js` with the listeners at the top level.
- NET-1…15 (and NET-16 if N6) recorded in `docs/e2e-test-plan.md` §5 "Run 6" against a stated
  Chrome version — NET-10 and NET-11 in particular, since they are the privacy and lifecycle claims.
- `browser_network_requests` / `browser_network_clear` in `docs/setup.md` with the security paragraph.
- No URL, header value or body ever written to the SW console or server stderr; no `cookie` header
  ever stored.

## Follow-ups (not in this step)

- **Response bodies via CDP (option B) — the natural Step 6.** `browser_network_capture
  { action: "start" | "stop" }` attaches `chrome.debugger`, `Network.enable`, records
  `requestWillBeSent` / `responseReceived` / `loadingFinished` **into the same `NetworkLog`**
  (entries gain a `cdpRequestId`), and `browser_network_requests { id, includeBody: true }` calls
  `Network.getResponseBody` while attached. Bodies are fetchable only while attached and while the
  entry is in CDP's buffer, so `stop` or a navigation makes them unavailable — the tool must say so.
  **Prerequisite refactor:** `withDebugger` becomes a per-tab session with an attach refcount, so a
  trusted click or `browser_evaluate` during a capture reuses the attachment instead of detaching in
  `finally`; `describeDebuggerError` gains the "already attached by *us*" case. That refactor is the
  whole reason bodies are not in v1, and it is shared with Step 4's "keep-attached session" follow-up.
- **WebSocket frames** — `webRequest` sees only the handshake; frames need CDP
  `Network.webSocketFrame*`, i.e. the capture above.
- **Scope to the current document** (`since: "navigation"`): key entries by `documentId` and let the
  query drop pre-navigation entries; today the log is per tab like *Preserve log*.
- **`extraHeaders` flag** if NET-10 shows `referer`/`origin` missing and an agent needs them —
  opt-in, with cookies still redacted at ingest.
- **Query-string redaction flag** (`access_token=`, `signature=`, …) for users who want URLs
  scrubbed before they reach the model.
- **Timing breakdown / transfer size** from `performance.getEntriesByType("resource")` joined on URL
  (option C as a *supplement*, not a source).
- **`browser_wait_for { url: "/regex/" }`** — wait for a specific request to complete; reads the
  same log.

## Stages for an orchestrator (mirrors `2026-09-07-step4-orchestration-prompt.md`)

| Stage | Plan parts | Subagent deliverable | Commit |
|---|---|---|---|
| 1 | N0 + N1 | shared types; `extension/src/network-log.ts` with the full TDD suite | `feat(extension): NetworkLog reducer, query and formatter (pure)` |
| 2 | N2 | manifest permission; top-level listeners + rehydrate/merge + debounced flush; `network-state.ts`; `handlers/network.ts`; router; `npm run build` | `feat(extension): webRequest capture with session-storage write-through` |
| 3 | N3 | the two tools (+ tests); tool count 18 → 20 | `feat(server): browser_network_requests + browser_network_clear` |
| 4 | N4 | **Human gate first** (rebuild, reload **and re-enable**, `/mcp`, serve fixtures). Fixtures + §4.8; run NET-1…15 with the `mcp__chrome-agent-bridge__*` tools; scorecard Run 6; fix runtime bugs with a unit test when the bug is in pure logic — stop and report if a fix touches extension code | `test(e2e): NET-1…15 + network fixtures` (+ `fix(...)`) |
| 5 | N5 | setup / e2e-plan / roadmap / CLAUDE.md; Definition of done checked | `docs: network inspection` |
| 6 (optional) | N6 | `networkIdle` in `wait.ts` + `browser_wait_for` schema (+ tests); NET-16 | `feat: browser_wait_for networkIdle` |

Stop-and-ask triggers for the orchestrator: any change to the N0 wire shapes; any proposal to add
`extraHeaders` or to log a URL; anything touching `withDebugger` (that is Step 6); a stage that
cannot finish its part.
