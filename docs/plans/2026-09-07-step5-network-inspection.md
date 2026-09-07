# Step 5 — Network inspection: `browser_network_requests` / `browser_network_clear`

> **DRAFT — not yet started.** For agentic workers: TDD for the pure `NetworkLog` reducer/query/format
> logic and the server tools; the `chrome.webRequest` wiring and service-worker lifecycle are manual
> E2E. Steps use checkbox (`- [ ]`) syntax. Prerequisites: Steps 1–3 done; independent of Step 4.

**Goal:** Let the agent see what the page is talking to — the URL, method, status, resource type,
timing, size, and (optionally) headers of every request the active tab has made — so it can debug a
failing XHR, discover an app's API, confirm a form actually POSTed, or wait for a fetch to finish.
Captured **always-on and banner-free** in a bounded per-tab ring buffer, queried on demand.

**Non-goals (v1):** response bodies (see §0 and Part N4), request bodies beyond a short form/JSON
summary, WebSocket frames, modifying or blocking requests, capturing across Chrome restarts.

**Files touched:** `extension/manifest.json` (`webRequest` permission), new `extension/src/network-log.ts`
+ `extension/test/network-log.test.ts`, new `extension/src/handlers/network.ts`, `extension/src/sw.ts`,
`server/src/tools/registry.ts`, `server/test/tools.test.ts`, `test-fixtures/e2e-playground.html`,
`docs/e2e-test-plan.md`, `docs/setup.md`, `docs/progress-and-roadmap.md`, `CLAUDE.md`.

---

## 0. Design decision: where the events come from

| Source | Banner? | Bodies? | Sees requests made *before* the agent asked? | Conflicts with `withDebugger`? | Notes |
|---|---|---|---|---|---|
| **A. `chrome.webRequest` observers** (**chosen for v1**) | no | request body summary only (`requestBody` extraInfoSpec); **no response bodies** | yes — listeners are always on | no | Gives URL, method, type, status, headers, IP, cache flag, timing, initiator, error code. Listeners must be registered at the top level of `sw.ts`; the SW is woken for events. |
| **B. CDP `Network` domain via `chrome.debugger`** | **yes, for the whole capture window** | yes (`Network.getResponseBody`, only while attached) | only after `start` | **yes** — `withDebugger`'s `finally { detach }` would kill a long-lived capture, and a second `attach` throws | Needs a per-tab attach session manager first. Right design for bodies; wrong default. |
| **C. `performance.getEntriesByType("resource")` via `callInPage`** | no | no | yes (last ~250 entries) | no | No status codes, no headers, no failures; ring buffer is the page's. A fallback, not a product. |

**Decision:** v1 is **A**. It matches the repo's "no banner by default" stance, needs no lifecycle
refactor, and covers the debug-an-XHR / discover-the-API use cases. Response bodies are deferred to
**Part N4** (option B) which is written here as a separate, opt-in follow-up because it forces the
`withDebugger` refactor.

**Privacy rule (non-negotiable, from `CLAUDE.md` Conventions):** never log page content or tokens.
The log **redacts by default** `authorization`, `cookie`, `set-cookie`, `proxy-authorization`,
`x-api-key`, `x-auth-token`, and any header whose name contains `token`/`secret` — values replaced by
`<redacted>`. Headers are only *returned* when the tool is asked for them (`includeHeaders` or a
detail lookup). Query strings are kept (they are part of the URL the agent needs), but the setup doc
must say so.

## Lifecycle hazard: the service worker is culled

The MV3 service worker holds the log in memory and is terminated after ~30 s idle. Non-blocking
`webRequest` listeners *wake* it, but the buffer would be empty each time. Two fixes, pick **(1)**:

1. **Write-through to `chrome.storage.session`** (10 MB quota, cleared when Chrome exits — exactly the
   lifetime we want). Batch writes with a ~250 ms debounce; rehydrate the in-memory log on SW start
   (top-level `await storage.session.get`). Simple; no new message plumbing.
2. Forward events to the offscreen document (already persistent) via `runtime.sendMessage` and keep the
   buffer there; query it the same way. More moving parts; only better if storage writes prove costly.

Cap the log at **500 entries per tab, 2 000 total** (oldest evicted) and **drop entries for tabs that
close** (`chrome.tabs.onRemoved`) so it can't grow unbounded across a long session.

## Wire protocol

```
→ { method: "networkRequests", params: { tabId?: number | "all", filter?: string, limit?: number,
                                         includeHeaders?: boolean, id?: string } }
← { result: { entries: NetworkEntry[], total: number, pending: number, text: string } }

→ { method: "networkClear", params: { tabId?: number | "all" } }
← { result: { cleared: number } }
```

```ts
interface NetworkEntry {
  id: string;            // chrome's requestId — stable across the event chain
  tabId: number;         // -1 for non-tab (service worker / extension) requests, excluded by default
  url: string;
  method: string;
  type: string;          // webRequest ResourceType: main_frame, xmlhttprequest, script, image, …
  initiator?: string;    // origin that started it
  status?: number;       // absent while pending or on error
  statusLine?: string;
  fromCache?: boolean;
  ip?: string;
  error?: string;        // net::ERR_* from onErrorOccurred
  startedAt: number;     // epoch ms
  endedAt?: number;
  durationMs?: number;
  responseSize?: number; // from content-length when present
  requestHeaders?: Record<string, string>;   // redacted; only populated when asked
  responseHeaders?: Record<string, string>;
  requestBody?: string;  // ≤ 4 KB summary: form fields as k=v, or UTF-8 decoded raw
}
```

## Part N1 — `NetworkLog` reducer (TDD, pure, node)

### Task N1.1: ingest the webRequest event chain

- [ ] `extension/test/network-log.test.ts`: a `NetworkLog` with `ingest(event, details)` where `event` ∈
      `onBeforeRequest | onSendHeaders | onHeadersReceived | onCompleted | onErrorOccurred` and
      `details` are plain objects shaped like Chrome's (hand-written fixtures, no `chrome.*`):
  - `onBeforeRequest` creates an entry keyed by `requestId` with url/method/type/tabId/initiator/startedAt.
  - `onSendHeaders` attaches redacted request headers; `authorization: Bearer x` → `<redacted>`.
  - `onHeadersReceived` sets `status`, `statusLine`, redacted response headers, `responseSize` from
        `content-length`.
  - `onCompleted` sets `endedAt`, `durationMs`, `fromCache`, `ip`; the entry is no longer pending.
  - `onErrorOccurred` sets `error` (e.g. `net::ERR_CONNECTION_REFUSED`) and ends the entry.
  - Events for an unknown `requestId` (SW restarted mid-request) create a best-effort entry rather than
        being dropped.
  - Redirects: a 3xx `onHeadersReceived` followed by a new `onBeforeRequest` with the **same**
        `requestId` becomes a second entry (suffix the id `:2`) so both hops are visible.
- [ ] Implement `NetworkLog` in `extension/src/network-log.ts`. No `chrome.*` imports — the SW passes
      `details` in. Export the header redaction as `redactHeaders(headers)` (its own tests).

### Task N1.2: bounds + eviction

- [ ] Tests: per-tab cap 500 (oldest evicted), total cap 2 000, `forgetTab(tabId)` drops that tab's
      entries, `clear(tabId | "all")` returns the count removed. `pending()` counts entries with no
      `endedAt` (this is what a future `wait_for {networkIdle:true}` reads).

### Task N1.3: query + text rendering

- [ ] Tests for `query({ tabId, filter, limit, includeHeaders, id })`:
  - default `limit` 50, newest first; `total` is the pre-limit count so the agent knows it's truncated.
  - `filter` is a case-insensitive substring match on the URL **or** a `/regex/` when wrapped in
        slashes (e.g. `/api\/v[12]\//`); invalid regex → thrown error naming the pattern.
  - `tabId` omitted → the caller (SW) resolves the active tab; `"all"` includes `tabId: -1` entries.
  - `id` → exactly that entry with headers and `requestBody` regardless of `includeHeaders`.
  - headers are stripped from the returned entries unless `includeHeaders` or `id`.
- [ ] Tests for `formatEntries(entries, {total, pending, includeHeaders})` — one line per request:
      `[id] 200 GET https://host/path?q=1  xmlhttprequest  123ms  4.2 KB` ; pending →
      `[id] ··· GET …  (pending)`; error → `[id] ERR GET …  net::ERR_NAME_NOT_RESOLVED`; a trailing
      summary line `Showing 50 of 212 (3 pending). Use filter/limit or id for detail.` Headers, when
      included, are indented under the line. Cap the whole text at 20 000 chars with a truncation note
      (same convention as Step 4).

### Task N1.4: request-body summary (optional in v1; keep if cheap)

- [ ] Tests: `formData` → `k=v&k2=v2` (values truncated to 200 chars each); `raw` bytes → UTF-8 decode of
      the first 4 KB, else `<binary N bytes>`; **redact** form fields named like `password`/`token`.

### Task N1.5: serialise / rehydrate

- [ ] Tests: `toJSON()` → `fromJSON()` round-trips entries and pending state; a corrupt blob rehydrates
      to an empty log (never throws on SW start).

## Part N2 — extension wiring

### Task N2.1: manifest + listeners

- [ ] `manifest.json`: add `"webRequest"` to `permissions` (host permission `<all_urls>` already covers
      observation). No `webRequestBlocking` — observe only.
- [ ] `sw.ts` **top level** (not inside `connect()` — MV3 needs listeners registered synchronously on
      every SW start): register the five listeners with `{ urls: ["<all_urls>"] }` and extraInfoSpec
      `["requestHeaders", "extraHeaders"]` / `["responseHeaders", "extraHeaders"]` / `["requestBody"]`
      as appropriate; each calls `log.ingest(name, details)` then `scheduleFlush()`.
- [ ] `chrome.tabs.onRemoved` → `log.forgetTab(id)`.
- [ ] Rehydrate: `const log = NetworkLog.fromJSON(await chrome.storage.session.get("networkLog"))` at
      module top (top-level await is fine — `sw.js` is an ESM module). `scheduleFlush` debounces
      `storage.session.set` at 250 ms.
- [ ] Ignore the bridge's own traffic: entries whose URL starts with `ws://127.0.0.1:` or is
      `chrome-extension://` are dropped in the SW before ingest (keep `NetworkLog` protocol-agnostic).

### Task N2.2: handlers + router

- [ ] `handlers/network.ts`: `networkRequests(p)` resolves `tabId` (default `activeTab().id`), clamps
      `limit` to `[1, 500]`, calls `log.query`, returns `{ entries, total, pending, text }`;
      `networkClear(p)` → `{ cleared }`.
- [ ] `sw.ts`: `router.on("networkRequests", …)`, `router.on("networkClear", …)`.

## Part N3 — server tools (TDD)

### Task N3.1: `browser_network_requests`

- [ ] `server/test/tools.test.ts`: calls `bridge.call("networkRequests", {filter, limit, includeHeaders,
      id, tabId})` with only the args given and returns `result.text`; an `id` lookup passes through.
- [ ] Schema: `{ filter: z.string().optional(), limit: z.number().int().min(1).max(500).optional(),
      includeHeaders: z.boolean().optional(), id: z.string().optional(),
      tab: z.union([z.literal("active"), z.literal("all"), z.number().int()]).optional() }`.
      Description: *"List network requests made by the active tab (newest first): status, method, URL,
      type, duration, size. `filter` is a URL substring or /regex/. Pass `id` for one request's headers
      and body summary. Captured continuously, no debugger banner; response bodies are not available."*

### Task N3.2: `browser_network_clear`

- [ ] Test + schema `{ tab: … }`; returns `Cleared N requests.` Bump the tool count (→ 19 with Step 4 → 20).

## Part N4 — (later) response bodies via CDP — **separate step, do not fold into v1**

Sketch so the v1 shapes leave room for it:

- `browser_network_capture { action: "start" | "stop" }` attaches `chrome.debugger`, `Network.enable`,
  records `requestWillBeSent`/`responseReceived`/`loadingFinished` **into the same `NetworkLog`**
  (entries gain a `cdpRequestId`), and `browser_network_requests {id, includeBody:true}` calls
  `Network.getResponseBody` while attached. Bodies are only fetchable while the session is attached and
  the entry is in CDP's buffer, so `stop` (or a navigation) makes them unavailable — the tool must say so.
- **Prerequisite refactor:** `withDebugger` becomes a per-tab session with an attach refcount, so a
  trusted click or `browser_evaluate` during a capture reuses the attachment instead of detaching it in
  `finally`. `describeDebuggerError` gains the "already attached by *us*" case. This is the whole
  reason bodies are not in v1.

## Part N5 — E2E (manual, `docs/e2e-test-plan.md` new section "NET")

Fixture additions to `test-fixtures/e2e-playground.html` (served by `python -m http.server 8080`):
a **"Fetch JSON"** button → `fetch('/fixtures/ok.json')` (add the file); a **"Fetch 404"** button →
`fetch('/nope')`; a **"POST form"** button → `fetch('/e2e-playground.html', {method:'POST', body: new
URLSearchParams({user:'a', password:'p'})})`; a **"Fetch unreachable"** button →
`fetch('http://127.0.0.1:9/')`; a **"Slow fetch"** button → `fetch('/e2e-playground.html?slow=' + Date.now())`
with the click handler delaying 3 s before calling it (no server changes needed).

- [ ] NET-1 load the fixture, `browser_network_requests` → the `main_frame` GET and the inline assets,
      no banner ever appears.
- [ ] NET-2 click "Fetch JSON" → an `xmlhttprequest` 200 with a size; `id` lookup shows redacted-free
      headers and `content-type: application/json`.
- [ ] NET-3 "Fetch 404" → status 404 line.
- [ ] NET-4 "POST form" → `POST`, `requestBody` shows `user=a&password=<redacted>`.
- [ ] NET-5 "Fetch unreachable" → `ERR` line with `net::ERR_CONNECTION_REFUSED`.
- [ ] NET-6 `filter: "/nope|ok\\.json/"` returns exactly the two; `filter: "("` → a clear invalid-regex
      error.
- [ ] NET-7 **SW-culling soak:** click "Fetch JSON", switch to another app for ≥ 3 min (SW culled — check
      `chrome://serviceworker-internals`), click it again from the fixture, then query: **both** fetches
      present (rehydration works).
- [ ] NET-8 a logged-in site (e.g. GitHub): `id` lookup shows `cookie: <redacted>` and
      `authorization: <redacted>`; nothing sensitive in the SW console.
- [ ] NET-9 open a second tab, fetch there, close it → `browser_network_requests {tab:"all"}` no
      longer lists it; the active tab's entries are intact.
- [ ] NET-10 `browser_network_clear` → `Cleared N`, next query is empty until the next request.
- [ ] NET-11 500+ requests in one tab (a loop in `browser_evaluate` from Step 4, or a page reload storm)
      → `total` reports 500 and the oldest are gone; Chrome stays responsive.

## Follow-ups

- `browser_wait_for { networkIdle: true }` (roadmap Phase F) reads `log.pending()` — trivially cheap
  once N1.2 exists; land it in this step if time allows.
- Part N4 bodies, after the `withDebugger` session refactor.
- WebSocket frames (`webRequest` sees the handshake only; frames need CDP `Network.webSocketFrame*`).
