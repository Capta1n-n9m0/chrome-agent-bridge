# End-to-End Test Plan

- **Date:** 2026-06-04
- **Scope:** Validate the Chrome Agent Bridge against a **real Chrome instance + real MCP client**.
- **Why manual:** these paths can't be unit-tested — they need the actual browser, the extension
  loaded in a real profile, and a live MCP connection. The 46 automated tests cover logic/protocol;
  this plan covers the rest.

Each test has an **ID**, **objective**, **steps** (as MCP tool calls), and an **expected result**.
Record outcomes in the [Results template](#results-template). A run "passes" when all **must-pass**
(★) cases pass.

---

## 1. Environment & preconditions

1. **Versions:** Chrome ≥ 116, Node ≥ 20.
2. **Build:** from the repo root — `npm install && npm run build`. Confirm
   `server/dist/index.js` and `extension/dist/{sw,options,offscreen,content}.js` exist.
3. **Token:** choose a secret, e.g. `openssl rand -hex 16`. Call it `<TOKEN>`.
4. **Register the MCP server** in your client (see `docs/setup.md` §3) with env
   `BRIDGE_TOKEN=<TOKEN>`, `BRIDGE_PORT=9234`. (Or run the inspector:
   `$env:BRIDGE_TOKEN="<TOKEN>"; npx @modelcontextprotocol/inspector node server/dist/index.js`.)
5. **Load the extension:** `chrome://extensions` → Developer mode → Load unpacked → select
   `extension/`.
6. **Configure the extension:** open its Options, set Port `9234` + Token `<TOKEN>`, Save.
7. **Serve the fixture** (for the deterministic cases) from the repo root:
   - `python -m http.server 8080 --directory test-fixtures` → fixture at
     `http://localhost:8080/e2e-playground.html`
   - or `npx http-server test-fixtures -p 8080`.
   Using `http://localhost` avoids the "allow file URLs" toggle and lets the extension inject.

**Fixture reference:** `test-fixtures/e2e-playground.html` exposes a sticky `status:` line that
updates on every interaction (so `browser_snapshot` / `browser_screenshot` can verify outcomes), a
labeled form, a synthetic-friendly counter button, a **trusted-only** button (flips only on a real
`isTrusted` event), a hover target, a jump link, a 1.5 s **async** loader, a long region with a
`BOTTOM MARKER` for scroll / full-page screenshots, and a **Perception fidelity** section (open +
closed shadow roots, a same-origin iframe, four hidden decoys, and the extra roles). For §4.7 it also
defines `window.__playground` in the **page** context — `{version, items, secret(), big: [0…499],
node: <button#counter>}` plus a `self` back-reference (a cycle) — so one `browser_evaluate` call
exercises every branch of the in-page serialiser (function, DOM node, over-`maxItems` array, cycle).

**CSP fixture:** `test-fixtures/e2e-playground-csp.html` (served alongside it at
`http://localhost:8080/e2e-playground-csp.html`) is a small page carrying
`<meta http-equiv="Content-Security-Policy" content="script-src 'self' 'unsafe-inline'">` — no
`'unsafe-eval'`. It has the same `window.__playground`, a counter button, and an `#eval-probe` line
that records what happens when the **page itself** calls `new Function("return 1")()`. EVAL-12 uses
it to show that `browser_evaluate` (CDP `Runtime.evaluate`) is not bound by the page CSP that blocks
the page's own eval. `python -m http.server` picks up the new file without a restart.

## 2. Diagnostics (where to look when something fails)

- **Extension service-worker console:** `chrome://extensions` → the extension → "service worker".
  Expect `[bridge] connection: up`. Errors from handlers surface here.
- **Server stderr:** the terminal/inspector running the MCP server. Expect the
  `WebSocket host listening on 127.0.0.1:9234` line.
- **MCP client tool output:** the text/image each tool returns, or an error envelope.
- **Offscreen document:** `chrome://extensions` → the extension → it may list "offscreen.html"
  as an active view; its console shows WS activity.

## 3. Smoke test (run this first) ★

| ID | Objective | Steps | Expected |
|---|---|---|---|
| SMOKE-1 | The whole loop works | With everything from §1 running, call `browser_navigate {"url":"http://localhost:8080/e2e-playground.html"}` | Active tab loads the playground; tool returns "Navigated active tab to …". SW console shows `connection: up`. |
| SMOKE-2 | Perception works | `browser_snapshot` | Returns a text outline including `textbox "Email address" [ref=…]`, `button "Sign in" [ref=…]`, `combobox "Favorite fruit" [ref=…]`. The `status:` line is a non-interactive `<div>` and is **not** in the snapshot by design — read it with `browser_screenshot`. |

If SMOKE-1/2 fail, stop and debug connection/injection before the rest.

## 4. Test cases

### 4.1 Connection & handshake

| ID | Objective | Steps | Expected |
|---|---|---|---|
| CONN-1 ★ | Extension connects | Start server, ensure token set in Options | SW console: `connection: up`. |
| CONN-2 ★ | Not-connected error is clear | Stop the server (or disable the extension), then call any tool | Tool returns an error like "Extension not connected — is Chrome open and the … extension enabled?" |
| CONN-3 ★ | Reconnect after server restart | With it connected, stop and restart the MCP server | Within a few seconds SW logs `connection: down` then `up`; a subsequent `browser_snapshot` works without touching the extension. |
| CONN-4 | Wrong token rejected | In Options set a wrong token, Save | SW logs `connection: down`/retries; tools return not-connected. Restore the correct token → reconnects. |
| CONN-5 | Idle keepalive (offscreen) | Connect, then leave Chrome idle / switch away for 3+ minutes (then repeat with 6+) | A `browser_snapshot` afterward still works (the offscreen document kept the socket alive). SW console shows no `connection: down` in between. |
| CONN-6 | Dead Chrome is detected fast (heartbeat) | With it connected, kill Chrome outright (Task Manager → end all `chrome.exe`, or close every window), then call `browser_status` once a minute | Within ~60 s (two 30 s heartbeat intervals) the tool reports `Extension: not connected` and the server stderr logs "stopped answering pings" — **not** a 30 s timeout per call. Relaunch Chrome → the extension reconnects on its own; `browser_snapshot` works without restarting the server. |
| CONN-7 | Port busy is explained and self-heals | Start an orphan first: in a terminal, `set BRIDGE_TOKEN=<token> && node server/dist/index.js` (leave it running). Then reconnect this session's MCP server (`/mcp`) and call `browser_status`, then `browser_snapshot` | `browser_status` says `WebSocket host: NOT listening (port 9234)` + `Problem: WebSocket port 9234 is busy (…EADDRINUSE…)`; `browser_snapshot` fails with that same reason (not the generic "not connected"). Ctrl-C the orphan → within ~15 s (5 s bind retry + extension reconnect) `browser_status` reports listening + connected and `browser_snapshot` works. |
| STAT-1 ★ | `browser_status` happy path | `browser_status` | Three lines: `WebSocket host: listening on 127.0.0.1:9234`, `Extension: connected`, `Active tab: [id] title — url` (the playground). |

### 4.2 Navigation

| ID | Objective | Steps | Expected |
|---|---|---|---|
| NAV-1 ★ | Navigate normal page | `browser_navigate {"url":"https://example.com"}` | Active tab shows example.com; tool confirms. |
| NAV-2 | Navigate fast/cached page | Navigate to the playground twice in a row | Both calls return promptly (no ~30 s hang — validates the load-listener-before-navigate fix). |
| NAV-3 | Restricted URL is handled | Manually focus a `chrome://settings` tab, then call `browser_snapshot` | Tool returns a clear "restricted URL (chrome://, New Tab, Web Store)…" error, not a hang/crash. |

### 4.3 Perception

| ID | Objective | Steps | Expected |
|---|---|---|---|
| PERC-1 ★ | Refs + roles | On the playground, `browser_snapshot` | Lists textbox/combobox/button/link entries with `[ref=eN]`. |
| PERC-2 ★ | Label-based naming | Inspect the snapshot text | Email input is `textbox "Email address"` (via `<label for>`); password is named "Password" (via `aria-labelledby`); search shows its placeholder. |
| PERC-3 ★ | Viewport screenshot | `browser_screenshot` | Returns a PNG of the current viewport that renders in the client. |
| PERC-4 | Full-page screenshot + banner | `browser_screenshot {"fullPage":true}` | Returns a taller PNG that includes the `BOTTOM MARKER`; the "extension is debugging this browser" banner appears briefly, then clears. |
| PERC-5 ★ | Shadow DOM | `browser_snapshot`, look in the "Perception fidelity" section | `button "Shadow button"` is listed (open root); `Sealed button` is **not** (closed root). Clicking the shadow ref sets `status: shadow button clicked`. |
| PERC-6 ★ | Same-origin iframe | `browser_snapshot` | `button "Iframe button"` is listed. `browser_click` on its ref sets `status: iframe button clicked (isTrusted = false)`. |
| PERC-7 | Iframe trusted click | `browser_click {"ref":"<iframe button>","trusted":true}` | The iframe's own line reads `iframe: TRUSTED click` — i.e. the frame-offset coordinates landed inside the frame, not on the page behind it. |
| PERC-8 ★ | Hidden variants | `browser_snapshot` | None of the four decoys appear: `Decoy: aria-hidden`, `Decoy: inert`, `Decoy: display none ancestor`, `Decoy: zero size`. |
| PERC-9 | Extra roles | `browser_snapshot` | Lists `spinbutton "Quantity"`, `slider "Volume"`, `listbox "Tags"`, `textbox "Notes editor"`, `tab "Details tab"`, and `button "Disabled action" [ref=eN] [disabled]`. |

### 4.4 Actions (content-script path)

| ID | Objective | Steps | Expected |
|---|---|---|---|
| ACT-1 ★ | Type into a field | snapshot → `browser_type {"ref":"<email ref>","text":"a@b.com"}` | Email field shows the text; `status:` line reads `email = a@b.com` (verify via another snapshot). |
| ACT-2 ★ | Click a button | `browser_click {"ref":"<counter ref>"}` | Counter increments; `status: counter = 1`. |
| ACT-3 | Type + submit | `browser_type {"ref":"<email ref>","text":"x@y.com","submit":true}` | `status: form submitted (email = x@y.com)`. |
| ACT-4 | Select option | `browser_select_option {"ref":"<fruit ref>","values":["Banana"]}` | `status: fruit = b`. (Also try `["c"]` by value.) |
| ACT-5 | Hover | `browser_hover {"ref":"<hover-target ref>"}` | `status: hovered`. |
| ACT-6 | Scroll | `browser_scroll {"direction":"down"}` then `browser_screenshot` | Viewport shows lower content / `BOTTOM MARKER` region. |
| ACT-7 | Press key | Focus a field via click, then `browser_press_key {"key":"Enter"}` | No error; if on the form field, behaves as Enter. |
| ACT-8 | Stale ref guidance | Navigate away and back, then act on an old ref | Tool returns "ref … not found — call browser_snapshot to re-snapshot". |

### 4.5 Trusted input (chrome.debugger)

| ID | Objective | Steps | Expected |
|---|---|---|---|
| TRUST-1 ★ | Synthetic click is ignored by the trusted-only button | `browser_click {"ref":"<trusted-only ref>"}` (default) | `status: synthetic click ignored`. (Confirms default path is synthetic.) |
| TRUST-2 ★ | Trusted click works | `browser_click {"ref":"<trusted-only ref>","trusted":true}` | Debugging banner appears; `status: TRUSTED click received`; banner clears after. |
| TRUST-3 | DevTools open on the tab | Open DevTools on the tab (F12, docked), then `browser_click {…,"trusted":true}` | **Chrome ≥ 152 (measured 2026-09-03):** the trusted click simply works — `status: TRUSTED click received` — because Chrome now lets an extension debugger attach alongside DevTools. **Older Chrome:** attach throws "Another debugger is already attached…", which the tool must surface as "Chrome DevTools (or another extension) is already attached to this tab — … Close DevTools on that tab and retry." (not a raw CDP string, not a 30 s timeout); closing DevTools → retry succeeds. Either outcome passes; record which. |
| TRUST-8 | Cancelled debugging session | `browser_type {"ref":"<trusted-input ref>","text":"<~200 chars>","trusted":true}`, and while the banner is up click its **Cancel** | Tool returns "The debugging session was cancelled mid-action … retry the action."; SW console logs `debugger detached … reason: canceled_by_user`. Retrying without cancelling works. |
| TRUST-4 ★ | Trusted typing replaces the field contents | On `#trusted-input`: `browser_type {"ref":"<ref>","text":"hi","trusted":true}`, then again with `"text":"yo"` | First: `status: TRUSTED input = hi`, field shows `hi`. Second: field shows `yo`, **not** `hiyo` (proves select-all-then-replace). |
| TRUST-5 ★ | Trusted key press | Click `#trusted-input` (default click focuses it), then `browser_press_key {"key":"Enter","trusted":true}` | `status: TRUSTED key = Enter`. |
| TRUST-6 | Trusted typing + submit | `browser_type {"ref":"<email ref>","text":"x@y.com","submit":true,"trusted":true}` | `status: form submitted (email = x@y.com)`. |
| TRUST-7 | Zoom-correct trusted click | Set Chrome zoom to 150 % (Ctrl +), then `browser_click {"ref":"<trusted-only ref>","trusted":true}` and re-run PERC-7 | `status: TRUSTED click received`; the iframe click still lands. Reset zoom to 100 % after. |

### 4.6 Tabs & history

| ID | Objective | Steps | Expected |
|---|---|---|---|
| TAB-1 ★ | List tabs | `browser_list_tabs` | Lists open tabs with ids; the active one marked `*`. |
| TAB-2 ★ | Switch active target | Open a second tab manually; `browser_select_tab {"id":<other>}` then `browser_snapshot` | Snapshot reflects the newly active tab (control target followed the switch). |
| TAB-3 | New tab | `browser_new_tab {"url":"https://example.com"}` | New active tab opens to example.com; tool returns its id. |
| TAB-4 | Close tab | `browser_close_tab {"id":<id>}` | That tab closes. |
| HIST-1 | Back/forward | Navigate A → B, then `browser_back`, then `browser_forward` | Tab returns to A, then forward to B. |

### 4.7 Evaluate (`browser_evaluate`, CDP `Runtime.evaluate`)

Every case shows Chrome's "extension is debugging this browser" banner while it runs; the banner
clearing afterwards is part of each expectation. Run EVAL-1…11 and EVAL-13…22 on the **main**
fixture and EVAL-12 on the **CSP** fixture.

| ID | Objective | Steps | Expected |
|---|---|---|---|
| EVAL-1 ★ | Basic expression + banner | `browser_evaluate {"expression":"document.title"}` | `Agent Bridge E2E Playground`; banner appears and clears. |
| EVAL-2 ★ | Object serialisation | `window.__playground` | Pretty JSON: `items`, `version`; `secret` shown as `"[Function: secret]"`; `node` shown as `<button id="counter">…`; `self` as `"[Circular]"`; `big` cut at 100 with `… 400 more`; trailing "output truncated" hint. |
| EVAL-3 ★ | Top-level await, page cookies | `(await fetch('/e2e-playground.html')).status` | `200`. |
| EVAL-4 ★ | `return` form | `const r = await fetch('/e2e-playground.html'); return r.status` | `200`. |
| EVAL-5 ★ | Thrown error | `throw new Error("boom")` | Tool error containing `Error: boom` and an `at` stack line; **not** a 30 s hang. |
| EVAL-6 | Rejected promise | `await Promise.reject(new TypeError("nope"))` | Tool error containing `TypeError: nope`. |
| EVAL-7 | Syntax error | `foo(` | Tool error naming the `SyntaxError`. Under `replMode` Chrome 152 supplies a real exception object, so `formatException` takes the `description` branch: `SyntaxError: Unexpected end of input` — no `Uncaught` prefix and no line/col (the `text` + `(line L, col C)` branch is the non-replMode shape and stays unit-tested). |
| EVAL-8 ★ | Async timeout | `await new Promise(r => setTimeout(r, 20000))` with `timeoutMs: 1000` | Fails in ~1 s with `Timed out after 1s…`; banner gone; the next tool call works. |
| EVAL-9 | Sync timeout | `while(true){}` with `timeoutMs: 1000` | Same outcome as EVAL-8 (CDP `timeout` terminated it); the tab is still responsive afterwards. **Record which CDP branch fired** — `exceptionDetails` "Execution was terminated" vs. a raw command error (pins the open box in plan E2.2). |
| EVAL-10 | Long timeout beats the server default | `await new Promise(r => setTimeout(r, 35000)); 1` with `timeoutMs: 40000` | Returns `1` after ~35 s — proves the per-call timeout (would otherwise fail at 30 s with "Timed out … calling evaluate"). |
| EVAL-11 | Completion value + REPL re-declare | `const a = 1; a + 1` twice in a row | `2` both times (second call would be `SyntaxError: Identifier 'a' has already been declared` without `replMode`). |
| EVAL-12 ★ | CSP bypass | On `http://localhost:8080/e2e-playground-csp.html`: `new Function("return 1")()` | `1`. For contrast, the fixture's own `#eval-probe` line reads `page eval: BLOCKED — EvalError: …` — the same call from page code is refused by the page CSP, so the CDP path is demonstrably not subject to it. |
| EVAL-13 ★ | Page-context DOM action | `document.querySelector('#counter').click(); document.querySelector('#count').textContent` | `"1"` (or the current count); `status: counter = N` on screen. |
| EVAL-14 | Node list | `document.querySelectorAll('button')` | Array of `<button id="…">…` descriptions; the `(DOM node — …)` hint is **absent** (it's a list, kind json). |
| EVAL-15 | Single node | `document.body` | `<body …>` description + the `(DOM node — use browser_snapshot refs to act on it)` hint. |
| EVAL-16 | DevTools open | Open DevTools on the tab, then EVAL-1 | Same rule as TRUST-3: Chrome ≥ 152 just works; older Chrome returns the "one debugger per tab" message. Record which. |
| EVAL-17 | Banner cancelled mid-run | EVAL-8 with `timeoutMs: 20000`, click the banner's **Cancel** | "The debugging session was cancelled mid-action…" within a second, not the timeout. |
| EVAL-18 | Restricted URL | Focus `chrome://extensions`, then EVAL-1 | "browser_evaluate is not available here: the active tab is a restricted URL…" |
| EVAL-19 | Big string | `'x'.repeat(50000)` | Cut, with the truncation hint. Note which limit applies: a **top-level** string is a CDP primitive that never reaches the in-page serialiser, so `maxString` (5 000) does not apply — the total `maxChars` cap does: 20 000 chars + `… [truncated: 30000 more chars]`. `maxString` applies to strings **nested** inside a serialised object. |
| EVAL-20 | `userGesture` | `navigator.clipboard.writeText("hi").then(() => "ok")` | `ok` (would reject without a user gesture on most pages). |
| EVAL-21 | Isolation | `typeof window.__agentBridge` | `"undefined"` — the content-script world is not visible to page code. |
| EVAL-22 | Regression smoke | ACT-2, TRUST-2, PERC-4 | Still pass (the `withDebugger` signature change and the `describeDebuggerError` wording change didn't regress them). |

### 4.8 Waiting

| ID | Objective | Steps | Expected |
|---|---|---|---|
| WAIT-1 ★ | Wait for text | Click the "Load message in 1.5s" button, then `browser_wait_for {"text":"Async content loaded!"}` | Returns success once the text appears (within ~1.5 s). |
| WAIT-2 | Wait seconds | `browser_wait_for {"seconds":2}` | Returns after ~2 s. |
| WAIT-3 | Timeout | `browser_wait_for {"text":"this never appears"}` | After ~10 s, returns a clear "Timed out waiting for text" error. |

### 4.9 Security

| ID | Objective | Steps | Expected |
|---|---|---|---|
| SEC-1 ★ | Localhost-only bind | From another device on the LAN, try to connect to `ws://<this-machine-ip>:9234` | Connection refused (server binds `127.0.0.1` only). |
| SEC-2 | Token required | Connect a raw WS client to `127.0.0.1:9234` and send a hello with a wrong/absent token | Server closes the socket; no commands accepted. |

### 4.10 Real-world premise validation ★

| ID | Objective | Steps | Expected |
|---|---|---|---|
| REAL-1 ★ | Drive a site you're already logged into | Navigate to a site where you're signed in (email, dashboard, etc.); `browser_snapshot`; read/act on something that requires your session | The page shows your **logged-in** state and the agent can perceive/act on it — proving the bridge drives the *real default profile*, not a fresh one. |
| REAL-2 | Multi-step task | A short real task: navigate → snapshot → type into a search/field → click → wait_for → snapshot the result | Completes end to end without manual intervention. |

## 5. Results template

Copy this and fill it in during the run:

```
Date: ____  Chrome version: ____  Node: ____  OS: ____

SMOKE-1 [ ]   SMOKE-2 [ ]
CONN-1 [ ] CONN-2 [ ] CONN-3 [ ] CONN-4 [ ] CONN-5 [ ] CONN-6 [ ] CONN-7 [ ] STAT-1 [ ]
NAV-1 [ ]  NAV-2 [ ]  NAV-3 [ ]
PERC-1 [ ] PERC-2 [ ] PERC-3 [ ] PERC-4 [ ] PERC-5 [ ] PERC-6 [ ] PERC-7 [ ] PERC-8 [ ] PERC-9 [ ]
ACT-1 [ ] ACT-2 [ ] ACT-3 [ ] ACT-4 [ ] ACT-5 [ ] ACT-6 [ ] ACT-7 [ ] ACT-8 [ ]
TRUST-1 [ ] TRUST-2 [ ] TRUST-3 [ ] TRUST-4 [ ] TRUST-5 [ ] TRUST-6 [ ] TRUST-7 [ ] TRUST-8 [ ]
TAB-1 [ ] TAB-2 [ ] TAB-3 [ ] TAB-4 [ ] HIST-1 [ ]
EVAL-1 [ ] EVAL-2 [ ] EVAL-3 [ ] EVAL-4 [ ] EVAL-5 [ ] EVAL-6 [ ] EVAL-7 [ ] EVAL-8 [ ] EVAL-9 [ ] EVAL-10 [ ] EVAL-11 [ ]
EVAL-12 [ ] EVAL-13 [ ] EVAL-14 [ ] EVAL-15 [ ] EVAL-16 [ ] EVAL-17 [ ] EVAL-18 [ ] EVAL-19 [ ] EVAL-20 [ ] EVAL-21 [ ] EVAL-22 [ ]
WAIT-1 [ ] WAIT-2 [ ] WAIT-3 [ ]
SEC-1 [ ] SEC-2 [ ]
REAL-1 [ ] REAL-2 [ ]

Failures / notes (TC id → what happened → SW-console / server-stderr excerpt):
- …
```

### Run 2 — 2026-09-03 (Phase C verification of commit `39e6cb4`)

```
Date: 2026-09-03  Chrome version: 152.0.7977.75 (Official Build, 64-bit)  Node: 20+  OS: Windows 11 Pro 26200
Display: 24" 1920×1080, OS scaling 100%, Chrome zoom 100% → DPR 1

SMOKE-1 [P]   SMOKE-2 [P]
PERC-1 [P] PERC-2 [P] PERC-3 [P] PERC-4 [P] PERC-5 [P] PERC-6 [P] PERC-7 [P] PERC-8 [P] PERC-9 [P]
ACT-1 [P] ACT-2 [P]
(other rows not re-run this pass — see Run 1, 2026-06-04, in §0 of docs/progress-and-roadmap.md)
```

Scope: PERC-5…9 (never run live before) plus a regression smoke over PERC-1…4 / ACT-1…2 to confirm
the Phase C snapshot rewrite didn't regress the earlier pass. **All 13 cases passed on the first
attempt; no code changes were needed.** Service-worker console clean (no errors) for the whole run.

Evidence per case:

- **PERC-1/2** — first snapshot: `textbox "Email address" [ref=e1]`, `textbox "Password" [ref=e2]`
  (via `aria-labelledby`), `textbox "Search query" [ref=e3]` (via placeholder),
  `combobox "Favorite fruit" [ref=e4]`, `button "Sign in" [ref=e5]`, `link "Jump to bottom" [ref=e9]`.
- **PERC-3/4** — viewport PNG renders; `fullPage:true` returns a taller PNG containing `BOTTOM MARKER`.
  The debugging banner appeared for the full-page capture and cleared afterwards.
- **ACT-1/2** — `browser_type e1 "a@b.com"` → `status: email = a@b.com`;
  `browser_click e6` → snapshot `Click counter: 1`, screenshot `status: counter = 1`.
- **PERC-5 ★** — `button "Shadow button" [ref=e10]` listed; `Sealed button (must not be listed)` absent
  from the snapshot even though the screenshot shows it *rendered* (so the exclusion is the closed-root
  rule, not a missing element). Click → `status: shadow button clicked`. The fixture attaches that
  listener to the button *inside* the open root and gives the host `<div>` none, so the RefMap held the
  shadow element, not the host.
- **PERC-6 ★** — `button "Iframe button" [ref=e11]` present on the **first** snapshot (no frame-population
  timing issue). Click → `status: iframe button clicked (isTrusted = false)`, frame `<p>`:
  `iframe: synthetic click`.
- **PERC-7** — `browser_click {ref:e11, trusted:true}` → frame `<p>`: `iframe: TRUSTED click`,
  `status: iframe button clicked (isTrusted = true)`. The banner appeared and cleared. Frame-offset
  `centerOf` is therefore correct **at 100% zoom / DPR 1**; HiDPI and non-100% zoom remain unverified
  (see Phase D / the "Trusted-click coordinates" limitation).
- **PERC-8 ★** — none of the four decoys appear in any snapshot. `Decoy: aria-hidden` and `Decoy: inert`
  are *visibly rendered* in the screenshot, so their exclusion is semantic pruning rather than absence.
  `Decoy: zero size` carries no `aria-hidden`/`inert`/`display:none`, so only the zero-size filter can
  drop it — confirming the `hasLayout(doc)` gate behaves correctly in real Chrome, which the jsdom unit
  tests cannot prove.
- **PERC-9** — snapshot lists `spinbutton "Quantity" [ref=e12]`, `slider "Volume" [ref=e13]`,
  `listbox "Tags" [ref=e14]`, `textbox "Notes editor" [ref=e15]` (contenteditable),
  `tab "Details tab" [ref=e16]`, `button "Disabled action" [ref=e17] [disabled]`.
  `browser_type e12 "7"` → `status: qty = 7`; `browser_click e16` → `status: role=tab clicked`.

Failures / notes:
- None. One documentation defect found and fixed in this commit: SMOKE-2 previously expected the
  `status:` text in the snapshot; Phase C snapshots list only interactive elements, so that line is
  screenshot-only.

### Run 3 — 2026-09-03 (Phase D verification of commits `4400a21` + `c2ceec5`)

```
Date: 2026-09-03  Chrome version: 152  Node: 20+  OS: Windows 11 Pro 26200
Display: 1920-px-wide window. Run across three conditions:
  (a) OS scaling 100%, Chrome zoom 100%  → DPR 1,    innerWidth 1920
  (b) OS scaling 100%, Chrome zoom 150%  → DPR 1.5,  innerWidth 1280
  (c) OS scaling 125%, Chrome zoom 100%  → DPR 1.25, innerWidth 1536

TRUST-4 [P] TRUST-5 [P] TRUST-6 [P] TRUST-7 [P]
ACT-1 [P] ACT-7 [P]                       (regression: default paths unchanged)
PERC-7 [P]                                (re-run under 150% zoom)
```

Evidence:
- **TRUST-4** — synthetic first as a control: `status: synthetic input ignored`. Then
  `trusted:true` with `"hi"` → `status: TRUSTED input = hi` and the field reads `hi`, having
  replaced the pre-existing `nope`. Again with `"yo"` → field reads `yo`, **not** `hiyo`, proving
  select-all-then-replace.
- **TRUST-5** — `browser_press_key {"key":"Enter","trusted":true}` → `status: TRUSTED key = Enter`.
- **TRUST-6** — failed on the first attempt and surfaced two real defects (both fixed in
  `4400a21`): the field read `x@ycom` because `.` was sent as `windowsVirtualKeyCode` 46 =
  `VK_DELETE`, and `#email` sat outside the `<form>` so no real Enter could submit it. After the
  fixes: `status: form submitted (email = x@y.com)` with the `.` intact.
- **TRUST-7** — at 150 % zoom the hit pad previously reported `hit at 635,755 exp 635,755 on=HTML`:
  correct coordinates, off-screen, hit nothing. After `c2ceec5`: `hit at 635,331 exp 635,331
  on=hit-pad`. `#trusted-only` and PERC-7's iframe button both hit under zoom too.
- **ACT-7** — no error; the `status:` line is unchanged because a synthetic `el.click()` does not
  move focus, so the synthetic keydown lands on `<body>`. Pre-existing behaviour, not a Phase D
  regression.

Zoom/DPR measurements (the D2 spike) are tabulated in
`docs/plans/2026-09-03-step2-phase-d-action-fidelity.md`, "Spike results".

Failures / notes:
- No open failures. Both defects found were fixed and re-verified in the same session.
- TRUST-3 (debugger-vs-DevTools conflict) still deferred.

### Run 4 — 2026-09-03 (Phase B robustness: commits `7e35ff9`, `d9a0ba0`, `458f291`)

```
Date: 2026-09-03  Chrome version: 152  Node: 20+  OS: Windows 11 Pro 26200
Display: 1920-px window, Chrome zoom left at 150% from Run 3 (DPR 1.5, innerWidth 1280) — irrelevant to these cases

STAT-1 [P]  TRUST-3 [P*]  TRUST-8 [P]  CONN-6 [P]  CONN-7 [P]  CONN-5 [P]
(* passed via the Chrome ≥ 152 branch — see below)
```

Scope: the 17th tool, the debugger-error UX, dead-Chrome detection, port-busy self-healing, and the
long-deferred idle-keepalive soak. **All six pass; no code changes needed after the three commits.**

Evidence per case:

- **STAT-1** — `browser_status` → `WebSocket host: listening on 127.0.0.1:9234` / `Extension: connected` /
  `Active tab: [1108099065] Agent Bridge E2E Playground — http://localhost:8080/e2e-playground.html`.
- **TRUST-3** — with DevTools docked on the tab (the viewport screenshot was visibly narrower), a
  `trusted:true` click on `#trusted-only` **succeeded**: `status: TRUSTED click received`. Chrome 152 lets
  an extension debugger attach alongside DevTools, so the "one debugger per tab" conflict this case was
  written for no longer happens. `describeDebuggerError`'s DevTools branch stays as a defensive path for
  older Chrome / other debugger extensions; it is unit-tested but could not be triggered live. The case
  text now accepts either outcome.
- **TRUST-8** — a ~600-character `browser_type {trusted:true}`; Cancel clicked on the banner mid-typing →
  tool error: "The debugging session was cancelled mid-action (the 'is debugging this browser' banner's
  Cancel was clicked, or DevTools took over the tab) — retry the action." SW console:
  `[bridge] debugger detached from tab 1108099065 reason: canceled_by_user`. Retry typed `retry ok` →
  `status: TRUSTED input = retry ok`.
- **CONN-6** — all `chrome.exe` ended. The *first* `browser_status` poll already said `Extension: not
  connected` — Chrome's exit closed the TCP socket cleanly, so the server saw `close` immediately and the
  heartbeat was never needed (it covers a *hung* peer, which only the unit test exercises). After relaunch,
  `browser_status` showed connected + the restored tab and `browser_snapshot` worked; the server was not
  restarted.
- **CONN-7** — orphan `node server/dist/index.js` started first, then `/mcp` reconnect. `browser_status`:
  `WebSocket host: NOT listening (port 9234)` + `Problem: WebSocket port 9234 is busy (listen EADDRINUSE:
  address already in use 127.0.0.1:9234): another chrome-agent-bridge instance is probably still running …
  retries the bind every 5s …`; `browser_snapshot` failed with that same text (not the generic "not
  connected"). Orphan Ctrl-C'd → the next `browser_status` (well under 15 s later) was listening +
  connected, and `browser_snapshot` worked. Nothing restarted.
- **CONN-5** — Chrome left untouched from 22:42:08. Checks at 22:45:38 (+3.5 min) and 22:51:43 (+6 min
  more, 9.5 min total idle): `browser_status` connected, `browser_snapshot` instant, no reconnect delay.
  The offscreen-document socket survives MV3 service-worker culling.

Failures / notes:
- None. One expectation was wrong rather than the code: TRUST-3 assumed Chrome still enforces one
  debugger per tab; Chrome 152 does not.


### Run 5 — 2026-09-07 (Step 4 `browser_evaluate`: commits `8a13b30`, `d2c7a8a`, `0757542`)

```
Date: 2026-09-07  Chrome version: 152.0.0.0 (UA-CH brand "Google Chrome" 152)  Node: 20+  OS: Windows 11 Pro 26200
Display: 1536-px innerWidth, DPR 1.25 (OS scaling 125%), Chrome zoom 100%
Fixtures: http://localhost:8080/e2e-playground.html and .../e2e-playground-csp.html

EVAL-1 [P] EVAL-2 [P] EVAL-3 [P] EVAL-4 [F -> fixed, re-run pending] EVAL-5 [P] EVAL-6 [P] EVAL-7 [P*]
EVAL-8 [P] EVAL-9 [P] EVAL-10 [P] EVAL-11 [P] EVAL-12 [P] EVAL-13 [P] EVAL-14 [P] EVAL-15 [P]
EVAL-16 [-] EVAL-17 [-] EVAL-18 [P] EVAL-19 [P*] EVAL-20 [F -> fixed, re-run pending] EVAL-21 [P] EVAL-22 [P]

(* passed against a corrected expectation — see the EVAL-7 / EVAL-19 rows in §4.7)
(- not run: EVAL-16 and EVAL-17 need a human at the keyboard — open DevTools, click the banner's Cancel)
```

**One real defect found and fixed** (`fix(extension): unwrap a promise-valued completion value`):
`Runtime.evaluate {awaitPromise: true}` unwraps exactly **one** promise level, and under
`replMode: true` that level is Chrome's own async wrapper around the script. So any expression whose
*completion value* is itself a promise came back as `Promise {}` — including the
`(async () => { … })()` form `wrapExpression` emits for a bare `return` (EVAL-4) and any
`p.then(…)` (EVAL-20). `evaluateInPage` now resolves such a result with a second
`Runtime.awaitPromise` on the same deadline, gated by the new pure `pendingPromiseId(raw)`
(4 unit tests). **EVAL-4 and EVAL-20 must be re-run after `npm run build` + an extension reload.**

Evidence per case:

- **EVAL-1 ★** — `document.title` → `Agent Bridge E2E Playground`. Banner appeared and cleared.
- **EVAL-2 ★** — `window.__playground` → pretty JSON with `"version": "1"`, `"items": [1,2,3]`,
  `"secret": "[Function: secret]"`, `"node": "<button id=\"counter\"> \"Click counter: 0\""`,
  `"self": "[Circular]"`, and `big` cut after element `99` with `"… 400 more"` as its last element,
  then `(output truncated — narrow the expression, e.g. pick fields or slice the array)`. Every
  serialiser branch behaved in real Chrome exactly as the jsdom unit tests predicted.
- **EVAL-3 ★** — `(await fetch('/e2e-playground.html')).status` → `200`.
- **EVAL-4 ★** — `const r = await fetch('/e2e-playground.html'); return r.status` → **`Promise {}`**,
  not `200`. Root-caused live: `await (async () => (await fetch('/e2e-playground.html')).status)()`
  — which the `\breturn\b` heuristic leaves unwrapped — returned `200`, and
  `await (async () => { … r.status })()` returned `undefined`, so `await` *was* being honoured and
  the missing piece was a second unwrap. Fixed as above; re-run pending.
- **EVAL-5 ★** — `throw new Error("boom")` → tool error `[chrome.debugger] Error: boom` +
  `    at <anonymous>:1:7`. Immediate, not a 30 s hang.
- **EVAL-6** — `await Promise.reject(new TypeError("nope"))` → `TypeError: nope` + `at <anonymous>:1:22`.
- **EVAL-7** — `foo(` → `SyntaxError: Unexpected end of input`. Clear, but with neither the `Uncaught`
  prefix nor a line/col: under `replMode` Chrome hands back a real `exception` object, so
  `formatException` takes its `description` branch rather than the `text` + position branch. The
  §4.7 expectation was corrected rather than the code — both branches stay unit-tested.
- **EVAL-8 ★** — `await new Promise(r => setTimeout(r, 20000))` with `timeoutMs: 1000` → in ~1 s,
  `Timed out after 1s — the debugger was detached; page-side work already started (e.g. a fetch)
  continues`. The next call (`document.title`) worked immediately; the banner was gone.
- **EVAL-9** — `while(true){}` with `timeoutMs: 1000` → the identical `Timed out after 1s …` message,
  and **the tab was fully responsive straight afterwards** (`document.title + document.readyState`
  returned instantly). *Which CDP branch:* the two branches are byte-identical to the agent by design
  (`timeoutMessage(ms)` is shared by `raceTimeout` and the `isExecutionTerminated` re-map), so the
  message cannot discriminate. What this run does pin: (a) Chrome 152 **does** honour
  `Runtime.evaluate.timeout` for synchronous code — V8 execution really was terminated, or the
  renderer main thread would still have been spinning and the next evaluate could not have run at
  all; and (b) the branch that *reports* is the bridge-side `raceTimeout`, because its deadline is
  set before `withDebugger` attaches (~100 ms) and so always expires before CDP's own timer, which
  starts only when evaluation begins. Both paths are implemented and render identically, so no code
  change was needed — this is the behaviour plan task E2.2 asked to pin.
- **EVAL-10** — `await new Promise(r => setTimeout(r, 35000)); 1` with `timeoutMs: 40000` → `1` after
  ~35 s. The per-call timeout (`bridge.call(…, {timeoutMs: 45000})`) beats the old fixed 30 s
  connection timeout, which would have failed with "Timed out after 30000ms calling evaluate".
- **EVAL-11** — `const a = 1; a + 1` → `2`, and `2` again on an immediate repeat. `replMode` gives
  both the completion value and `const` re-declaration.
- **EVAL-12 ★** — on the CSP fixture, `new Function("return 1")()` → `1`. (The `\breturn\b` heuristic
  correctly left it unwrapped — the word is inside a string literal.) The page's own `#eval-probe`
  line reads `page eval: BLOCKED — EvalError: Evaluating a string as JavaScript violates the
  following Content Security Policy directive because 'unsafe-eval' is not an allowed source of
  script: script-src 'self' 'unsafe-inline'`. Same call, same page: refused from page code, allowed
  over CDP. Design option A (`executeScript` + `new Function`) would have failed here.
- **EVAL-13 ★** — `document.querySelector('#counter').click(); document.querySelector('#count').textContent`
  → `1`; the counter and the `status:` line both moved.
- **EVAL-14** — `document.querySelectorAll('button')` → `NodeList [ "<button id=\"submit-btn\"> \"Sign
  in\"", … ]`, ten node descriptions — including the four decoys, because the serialiser walks the
  DOM rather than the a11y tree. Correct, and a useful contrast with `browser_snapshot`. No
  `(DOM node — …)` hint: kind is json.
- **EVAL-15** — `document.body` → `<body> "Agent Bridge E2E Playground status: counter = 1 Form Email
  address Password Favo…"` followed by `(DOM node — use browser_snapshot refs to act on it)`.
- **EVAL-16 / EVAL-17** — not run: both need a human at the keyboard (open DevTools on the tab; click
  the banner's Cancel mid-run). TRUST-3 and TRUST-8 already cover those two Chrome behaviours for the
  trusted-input path, and `browser_evaluate` reaches them through the same `withDebugger`.
- **EVAL-18** — a `chrome://extensions` tab made active, then `document.title` → `browser_evaluate is
  not available here: the active tab is a restricted URL (chrome://, the New Tab page, or the Chrome
  Web Store) where extensions can't attach a debugger. (Cannot access a chrome:// URL)`. The E2.1
  `what`-threading works: the message names `browser_evaluate`, not "Trusted input".
- **EVAL-19** — `'x'.repeat(50000)` → 20 000 `x`s + `… [truncated: 30000 more chars]` + the
  truncation hint. The limit that applied is `maxChars`, not `maxString`; §4.7 corrected.
- **EVAL-20** — `navigator.clipboard.writeText("hi").then(() => "ok")` → **`Promise {}`** — the same
  defect as EVAL-4. `userGesture` itself stays unproven until the re-run.
- **EVAL-21** — `JSON.stringify([typeof window.__agentBridge, typeof window.__playground])` →
  `["undefined","object"]`. The ISOLATED-world content script is invisible to page code and the
  page's own globals are visible, so `browser_evaluate` really is running in MAIN.
- **EVAL-22** — regression smoke after the `withDebugger(…, what)` signature change: `browser_click e6`
  → `count=1` (ACT-2); `browser_click {e7, trusted:true}` → `status: TRUSTED click received`
  (TRUST-2); `browser_screenshot {fullPage:true}` → a taller PNG containing `BOTTOM MARKER` (PERC-4).
  No regressions.

Failures / notes:
- One code defect (the promise-valued completion value) — fixed with a unit test; EVAL-4 and EVAL-20
  need a re-run after a rebuild + extension reload.
- Two plan expectations were wrong rather than the code (EVAL-7, EVAL-19); §4.7 corrected to match
  what Chrome 152 actually does.
- EVAL-16 and EVAL-17 remain unrun (human interaction required).
- Environment note: port 9234 was initially held by orphaned `node server/dist/index.js` processes
  from earlier Claude sessions. `browser_status` diagnosed it exactly as CONN-7 describes, and the run
  started once they were closed — one session at a time really is a hard constraint.

## 6. Exit criteria

- **All ★ must-pass cases pass** → the bridge is proven end-to-end; merge `feat/agent-bridge` → `main`.
- Any ★ failure → capture the diagnostics (§2) into the notes and we fix before merging.
- Non-★ failures are logged as roadmap items (see `docs/progress-and-roadmap.md`) unless they block a ★ case.
