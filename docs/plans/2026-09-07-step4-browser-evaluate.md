# Step 4 — `browser_evaluate`: run JavaScript in the active tab

> **DRAFT — not yet started.** For agentic workers: TDD for the pure logic (`extension/src/evaluate/*`,
> the `describeDebuggerError` change, the server tool, the per-call timeout in `ExtensionConnection`);
> the `chrome.debugger` glue is manual E2E. Steps use checkbox (`- [ ]`) syntax and are ordered so each
> Part leaves `npm test` + `npm run typecheck` green. Prerequisites: Steps 1–3 done
> (`2026-09-03-step1…3`). Independent of Step 5 (network inspection).

**Goal:** One new MCP tool, `browser_evaluate`, that runs a JavaScript expression in the active tab's
**page (MAIN) context** and returns its value — the equivalent of typing into the DevTools console.
This unlocks everything the 17 fixed tools can't express: reading `window.__APP_STATE__`, calling a
page's own `fetch` with its cookies, poking at `localStorage`, scraping a value that isn't in the
accessibility snapshot, or dispatching a bespoke DOM action.

**Non-goals (v1):** picking a frame other than the top document; persistent REPL state across calls
beyond what `replMode` gives for free; injecting code at document-start on every navigation; returning
DOM node *handles* (nodes are serialised to a description); a banner-free path. All are listed under
"Follow-ups".

**Files touched:**
- new `extension/src/evaluate/serialize.ts`, `wrap.ts`, `result.ts` + `extension/test/evaluate-*.test.ts`
- new `extension/src/handlers/evaluate.ts`; `extension/src/debugger.ts`, `debugger-errors.ts` (+ test),
  `extension/src/sw.ts`
- `server/src/connection.ts`, `server/src/bridge.ts`, `server/src/tools/registry.ts` +
  `server/test/{connection,bridge,tools}.test.ts`
- `test-fixtures/e2e-playground.html`, new `test-fixtures/e2e-playground-csp.html`
- `docs/e2e-test-plan.md`, `docs/setup.md`, `docs/progress-and-roadmap.md`, `CLAUDE.md`

**Order of work:** E0 (protocol) → E1 (pure, TDD) → E2 (extension) → E3 (server, TDD) → E4 (E2E) →
E5 (docs + commits). E1 and E3 have no dependency on each other and can be done in parallel; E2 needs
E1; E4 needs everything built and the extension reloaded.

---

## 0. Design decisions

### 0.1 How to execute the code

Three ways to run a *string* of JavaScript from an MV3 extension. Only one is reliable.

| Option | Banner? | Bypasses page CSP? | `await` support | Exceptions surfaced? | Notes |
|---|---|---|---|---|---|
| **A. `chrome.scripting.executeScript({world:"MAIN", func})` wrapping `new Function(code)`** | no | **no** — `new Function` runs under the page's `script-src`, so any site without `'unsafe-eval'` (GitHub, Google, most banks/SaaS) throws `EvalError` | yes (wrap in async IIFE) | only via `unwrapResult`'s null-means-failure convention — no message | Banner-free, but fails on exactly the sites the user most wants to automate. |
| **B. `chrome.userScripts.execute()`** (Chrome 135+) | no | yes | yes | partial | Requires the user to flip the per-extension **"Allow User Scripts"** toggle in `chrome://extensions` and a new `userScripts` permission; the API is still moving. Good banner-free candidate later. |
| **C. CDP `Runtime.evaluate` via `chrome.debugger`** (**chosen**) | yes, per call (same as `click {trusted:true}`) | **yes** | `awaitPromise:true` (+ `replMode` top-level `await`) | **yes** — `exceptionDetails` with message + stack | `timeout` is built in for sync code, and `withDebugger` + `describeDebuggerError` already exist for exactly this. |

**Decision:** implement **C** only in v1. It reuses `withDebugger`, so a DevTools-open tab or a
cancelled banner already produce the one-line messages from Step 3. The banner is the price; the same
trade-off was already accepted for trusted input. Option B is the natural banner-free follow-up once
the API settles, and A is not worth its own code path. No `Runtime.enable` is needed — `Runtime.evaluate`
and `Runtime.callFunctionOn` work without events, so nothing has to be torn down on detach.

### 0.2 How to get the value back (result shaping)

`Runtime.evaluate {returnByValue:true}` is *not* enough on its own. It JSON-serialises in the page, so:

| Page value | `returnByValue:true` gives | What the agent should see |
|---|---|---|
| DOM node | `{}` | `<div id="app" class="x">…</div>` (tag, id, class, text head) |
| `Map`/`Set` | `{}` | `Map(2) {"a" => 1, …}` |
| class instance | plain fields, prototype name lost | `Foo {a: 1}` |
| cyclic object | CDP error "Object reference chain is too long" | truncated object with `[Circular]` |
| function | `undefined` / dropped | `function foo(a, b) { … }` (source head) |
| `Error` | `{}` | `name: message` + stack |
| `BigInt`, `NaN`, `Infinity`, `-0` | `unserializableValue: "123n"` etc. | that string |
| 10 000-row array | 10 000 rows | first 100 + `… 9 900 more` |

**Decision: a two-call protocol with an in-page serialiser.**

1. `Runtime.evaluate { expression: wrapExpression(code), replMode: true, awaitPromise: true,
   returnByValue: false, userGesture: true, timeout }` — the user's code runs exactly once.
   `replMode` gives top-level `await`, `let`/`const` re-declaration across calls, and the
   **completion value** of a multi-statement script (`const a = 1; a + 1` → `2`, like the console).
2. If the result is a primitive (`value` / `unserializableValue` / type `undefined`), shape it and stop.
3. If the result has an `objectId`: `Runtime.callFunctionOn { objectId, functionDeclaration:
   SERIALIZER_SRC, arguments: [{ value: limits }], returnByValue: true }` runs the pure serialiser
   **with `this` = the object** and returns a small JSON *envelope*; then `Runtime.releaseObject`
   (best-effort, ignore failures).

The serialiser is a **self-contained function** (no closures, no imports, no `chrome.*`) shipped as
`String(fn)`. It is unit-tested under jsdom in node *and* is the exact source injected into the page,
so the tests test what ships. Rejected alternative: wrapping the user's code in an IIFE that calls the
serialiser inline — that breaks `replMode`'s completion-value semantics for multi-statement code and
forces the `return` heuristic on every call.

Envelope returned by the serialiser (also the shape the handler returns after shaping primitives):

```ts
interface EvalEnvelope {
  kind: "json" | "node" | "function" | "error" | "undefined" | "unserializable" | "other";
  value?: unknown;          // present for kind "json" only — plain JSON the agent can reuse
  description: string;      // what the tool prints; for "json" it's JSON.stringify(value, null, 2)
  truncated: boolean;       // any limit (depth/items/string/total chars) was hit
}
```

### 0.3 Timeouts — three layers, all needed

- **CDP `Runtime.evaluate.timeout`** terminates *synchronous* execution (`while(true){}`). It does
  **not** fire while the script is parked on an `await` — an idle promise isn't "executing".
- So the handler **races** the CDP call against its own `timeoutMs` timer. On timer expiry it throws
  `Timed out after Ns` and `withDebugger`'s `finally` detach cancels the pending command (the loser's
  rejection must be swallowed with `.catch(() => {})` or it becomes an unhandled rejection in the SW).
  Detaching does **not** stop page-side work already started (a `fetch` keeps going) — document it.
- **The server's `ExtensionConnection` has a fixed 30 s per-call timeout** (`connection.ts`). A
  60 s evaluate would be reported by the *server* as "Timed out after 30000ms calling evaluate" while
  the extension is still busy. Fix: `bridge.call(method, params, { timeoutMs })` → the connection uses
  `timeoutMs` for that call, and the tool passes `evaluate timeoutMs + 5 000`. Small, TDD, Part E3.1.

### 0.4 Security (must land in `docs/setup.md`)

`browser_evaluate` runs with the full authority of the logged-in page **plus `userGesture`** (so it
can open popups, write the clipboard, start autoplay). Anything the user could do in that tab's
console — read tokens from `localStorage`, call authenticated APIs, submit forms — the agent can now
do. The localhost bind + token remain the only boundary; the roadmap's Phase E arm/disarm toggle
becomes more valuable, not less. The tool description says so in one clause, so the model knows it is
holding a sharp tool. Never log the expression or the result in the SW console beyond their length.

## E0. Wire protocol

```
→ { method: "evaluate", params: { expression: string, timeoutMs?: number } }
← { result: EvalEnvelope }
   or
← { error: { message: "Uncaught TypeError: x is not a function\n    at <anonymous>:1:5" } }
```

Errors from the page are ordinary bridge `error` responses (the `Router` already maps a thrown
`Error` to `{error:{message}}`), so the server tool needs no new error plumbing.

- [x] Add `EvalEnvelope` to `shared/src/protocol.ts` (both halves import it) — types only, no guard.

## Part E1 — pure logic (TDD, node + jsdom)

All three modules import nothing from `chrome.*` and run under vitest like `debugger-errors.ts`.
Directory: `extension/src/evaluate/`.

### Task E1.1: `serialize.ts` — the in-page serialiser

- [x] `extension/test/evaluate-serialize.test.ts` (jsdom environment, like `snapshot.test.ts`).
      Export `serializeForAgent(value, limits)` **and** `SERIALIZER_SRC = String(serializerFn)`.
      One test proves self-containment: `new Function("return " + SERIALIZER_SRC)().call(value, limits)`
      gives the same envelope as calling the export directly (catches an accidental closure over an
      import or helper).
- [x] Limits object (defaults): `{ maxDepth: 6, maxItems: 100, maxString: 5_000 }`; the handler passes
      them explicitly so tests and page agree.
- [x] Cases (each is one `it`):
  - plain JSON object/array → `kind:"json"`, `value` deep-equal, `description` is pretty JSON.
  - nested `undefined`/function values inside objects → replaced by the strings `"undefined"` /
        `"[Function: name]"` (JSON would silently drop the key; agents should see it existed).
  - depth beyond `maxDepth` → `"[Object]"` / `"[Array(N)]"` placeholders, `truncated:true`.
  - array/object longer than `maxItems` → first N kept, `"… 9900 more"` sentinel, `truncated:true`.
  - string longer than `maxString` (top-level or nested) → cut + `"…[+N chars]"`, `truncated:true`.
  - cyclic object → `"[Circular]"`, no throw, `truncated:true`.
  - `Map`/`Set` → `kind:"json"` with `{ __type:"Map", entries:[[k,v],…] }` / `{ __type:"Set", values:[…] }`.
  - `Date` → ISO string; `RegExp` → `String(re)`; `BigInt` → `"123n"`; `Symbol` → `String(sym)`.
  - `Error` (incl. subclasses, and `DOMException`) → `kind:"error"`, description `name: message` +
        first 5 stack lines.
  - DOM `Element` → `kind:"node"`, description `<tag id="…" class="…"> "first 80 chars of textContent"`;
        `Document` → `#document <url>`; `Window` → `Window <url>`; `Text` node → its text.
  - `NodeList`/`HTMLCollection`/array of nodes → array of node descriptions (so
        `document.querySelectorAll("a")` is useful), honouring `maxItems`.
  - function → `kind:"function"`, description = first 200 chars of `String(fn)`.
  - class instance → `kind:"json"`, description prefixed by the constructor name (`Foo {…}`) — only
        own enumerable props, getters **not** invoked (they can throw or have side effects).
  - a getter that throws during own-prop walk → the prop becomes `"[Threw: msg]"`, no overall throw.
  - `ArrayBuffer`/typed arrays → `"Uint8Array(1024)"` — never dump bytes.
- [x] Implement. Iterative or bounded-recursive walk; never call `toJSON`/`valueOf` on page objects
      (prototype-poisoning safety: use `Object.prototype.toString.call`, `Array.isArray`, and
      `instanceof` guards wrapped in try/catch, because page code can redefine anything).

### Task E1.2: `wrap.ts` — `wrapExpression(code)`

`replMode` already handles top-level `await` and completion values, so the wrapper exists for one
reason: a bare `return` is a syntax error outside a function, and agents will write it.

- [x] Tests:
  - `"document.title"` → unchanged.
  - `"const a = 1; a + 1"` → unchanged (replMode returns `2`; verified in EVAL-11).
  - `"await fetch('/x')"` → unchanged (replMode top-level await).
  - `"const r = await fetch('/x'); return r.status"` → `(async () => {\n<code>\n})()`.
  - `"return 1"` → wrapped; `"returnValue"` / `"x.return()"` / a string literal containing
        `"return"` → **not** wrapped (word-boundary regex `\breturn\b` outside of an obvious
        string is good enough; document that it is a heuristic and that a false positive only
        costs the completion-value behaviour, a false negative costs a SyntaxError the agent sees).
  - trailing `;`/whitespace/comment lines don't confuse it.
- [x] Implement. Don't parse JS. Export the regex so the tool description can state the rule.

### Task E1.3: `result.ts` — `shapeEvaluateResult(raw, callFn?)` and `formatException`

Turns the raw CDP responses into an `EvalEnvelope` or a thrown `Error`. Pure; the handler supplies
the second CDP call as a callback so this module never touches `chrome.*`.

- [x] Tests for `formatException(exceptionDetails)`:
  - `throw new Error("boom")` → message is `exception.description` (has `Error: boom` + stack).
  - `throw "x"` → `exception.value` is `"x"` → message `Uncaught x`.
  - rejected promise (`awaitPromise`) → same shape as thrown; covered by the first two.
  - `SyntaxError` at compile → `exceptionDetails.text` (`Uncaught SyntaxError: …`) with
        `lineNumber`/`columnNumber` appended as `(line L, col C)` when present.
  - stack trimmed to 8 lines; total message ≤ 2 000 chars.
- [x] Tests for `shapeEvaluateResult(raw, { limits, maxChars, callFn })`:
  - `{result:{type:"number", value:42}}` → `{kind:"json", value:42, description:"42"}`.
  - `{result:{type:"string", value:"hi"}}` → description `hi` (no added quotes — agents paste it).
  - `{result:{type:"undefined"}}` → `{kind:"undefined", description:"undefined"}`, no `value`.
  - `{result:{type:"number", unserializableValue:"NaN"}}` / `"-0"` / `"Infinity"` /
        `{type:"bigint", unserializableValue:"12n"}` → `kind:"unserializable"`, description = that string.
  - `{result:{type:"object", objectId:"1"}}` → `callFn("1", limits)` is invoked exactly once and its
        envelope is returned; `callFn` throwing → falls back to `kind:"other"` with
        `raw.result.description ?? raw.result.className` (never lose the call to a serialiser bug).
  - `{result:{type:"object", subtype:"null", value:null}}` → `{kind:"json", value:null, description:"null"}`
        (no `callFn` — `null` has no `objectId`).
  - `exceptionDetails` present → throws `Error(formatException(...))`; `callFn` not invoked.
  - description longer than `maxChars` (default 20 000) → cut, suffixed
        `\n… [truncated: N more chars]`, `truncated:true`; `value` is left intact (it is not sent to
        the model, only `description` is).
- [x] Implement.

**Deviations:** (E1, all small and test-pinned)

- `maxDepth` counts levels *below* the root: a value is replaced by `[Object]`/`[Array(N)]` when its
  depth is **> `maxDepth`** (root = depth 0). The plain reading (`>=`) would have made `maxDepth: 6`
  expand only five levels.
- The `… N more` sentinel for an over-long **object** is an extra `"…"` key holding `"… N more"`
  (arrays push the sentinel as their last element, as specified) — an object has no positional slot.
- Getter policy: the walk reads only **own enumerable** props, so a class's prototype getters are
  never invoked (the plan's requirement); an *own* accessor is read inside a `try/catch`, which is
  what produces `"[Threw: msg]"`. Both bullets hold with one rule.
- `formatException` renders CDP's 0-based `lineNumber`/`columnNumber` as 1-based `(line L, col C)`,
  matching what the DevTools console shows.
- `shapeEvaluateResult` is `async` (its `callFn` does a CDP round-trip) and `callFn` is optional —
  without one, an `objectId` result degrades to `kind:"other"` instead of throwing.
- Nested non-finite numbers (`NaN`, `Infinity`) are serialised as their string form rather than
  `JSON.stringify`'s silent `null`, for the same reason nested `undefined` is kept visible.

## Part E2 — extension handler

### Task E2.1: generalise `describeDebuggerError` (TDD)

The restricted-URL message currently starts with "Trusted input is not available here" — wrong for
eval and for full-page screenshots.

- [x] `extension/test/debugger-errors.test.ts`: `describeDebuggerError(err, "browser_evaluate")`
      produces "browser_evaluate is not available here: the active tab is a restricted URL…"; the
      one-arg form still says "Trusted input" (no behaviour change for Step 3 callers).
- [x] `withDebugger(tabId, fn, what = "Trusted input")` threads `what` into both `describeDebuggerError`
      calls. Update `fullPageScreenshot` to pass `"Full-page screenshot"`.

### Task E2.2: `debugger.ts` gets `evaluateInPage`

- [x] `export async function evaluateInPage(tabId, expression, timeoutMs, limits): Promise<EvalEnvelope>`:
  1. `withDebugger(tabId, …, "browser_evaluate")`.
  2. Inside: `raceTimeout(send("Runtime.evaluate", { expression, replMode: true, awaitPromise: true,
     returnByValue: false, userGesture: true, timeout: timeoutMs, generatePreview: false }), timeoutMs)`.
  3. `shapeEvaluateResult(raw, { limits, callFn })` where `callFn(objectId, limits)` does
     `Runtime.callFunctionOn { objectId, functionDeclaration: SERIALIZER_SRC, arguments: [{value: limits}],
     returnByValue: true }`, checks its own `exceptionDetails`, then `Runtime.releaseObject` in a
     try/catch. The second call is also inside the race (share one deadline).
- [x] `raceTimeout(p, ms)` helper: rejects with `Error("Timed out after ${ms/1000}s — the debugger was
      detached; page-side work already started (e.g. a fetch) continues")`; attaches `p.catch(()=>{})`.
- [ ] Pin the observed Chrome 152 behaviour of `Runtime.evaluate.timeout` on a sync loop in a comment
      next to the call (it surfaces as `exceptionDetails` "Execution was terminated" **or** as a
      command error — record which, and make sure `formatException` / `describeDebuggerError` render
      it as `Timed out after Ns` in either branch — add a regex case for it in `describeDebuggerError`).

### Task E2.3: `handlers/evaluate.ts` + router

- [x] `evaluate(p)`:
  - `expression` must be a non-empty string, else throw
    `browser_evaluate requires a non-empty "expression" string`.
  - `timeoutMs`: default 10 000, clamp to `[100, 60_000]` (`Number()` + `isFinite`; undefined → default).
  - `activeTab()`; `evaluateInPage(tab.id, wrapExpression(expression), timeoutMs, DEFAULT_LIMITS)`.
  - Return the envelope unchanged.
- [x] `sw.ts`: `router.on("evaluate", evaluate)`.
- [x] No `ensureContent` — this path never touches the content script or the ISOLATED world; that is
      deliberate (a page whose CSP blocks the content script still works, and `window.__agentBridge`
      is never visible to page code).
- [x] `console.log("[bridge] evaluate", expression.length, "chars")` only — never the text or result.

**Deviations:** (E2)

- The sync-timeout wording lives in `debugger-errors.ts`, not in the handler: `isExecutionTerminated(err)`
  matches Chrome's `Execution was terminated` (and a bare `Timed out`) wherever it surfaces — as
  `exceptionDetails` rendered by `formatException`, or as a raw command error — and `timeoutMessage(ms)`
  is the single wording shared with `raceTimeout`. `describeDebuggerError` gained a branch for it too
  (it has no `ms`, so it renders "<what> timed out: …"); `evaluateInPage` re-maps any such failure to
  `Timed out after Ns` in one outer `catch`, so both CDP branches read identically to the agent. No E1
  module was changed.
- `raceTimeout(p, ms, message?)` takes an optional message so the second CDP call can share the first
  call's deadline (remaining ms) while still reporting the *total* timeout.
- The last E2.2 box stays unticked: which branch Chrome actually uses for a `while(true){}` timeout can
  only be observed against real Chrome (E2E EVAL-9). Both branches are handled and commented at the call
  site; EVAL-9 just has to record which one fires.


## Part E3 — server (TDD)

### Task E3.1: per-call timeout through `bridge.call`

- [x] `server/test/connection.test.ts`: `connection.call("m", {}, { timeoutMs: 20 })` rejects after
      ~20 ms with `Timed out after 20ms calling m`; without the option the constructor default applies.
- [x] `server/test/bridge.test.ts`: `bridge.call(m, p, opts)` forwards `opts` to the connection.
- [x] Implement in `connection.ts` / `bridge.ts` (optional third arg; no call-site changes elsewhere).

### Task E3.2: `browser_evaluate` in `registry.ts`

- [x] `server/test/tools.test.ts`:
  - `browser_evaluate({expression:"1+1"})` calls `bridge.call("evaluate", {expression:"1+1",
    timeoutMs: 10000}, {timeoutMs: 15000})` and returns `description` as text.
  - `timeoutMs: 30000` → bridge opts `timeoutMs: 35000`.
  - `truncated: true` → text ends with one line: `(output truncated — narrow the expression, e.g. pick
    fields or slice the array)`.
  - `kind:"node"` → text ends with `(DOM node — use browser_snapshot refs to act on it)`.
  - an `error` from the bridge propagates as a thrown error (existing tool-error path; the SDK turns it
    into `isError:true` content).
- [x] Schema: `{ expression: z.string().min(1).describe(…), timeoutMs: z.number().int().min(100).max(60000).optional().describe("Default 10000. Also bounds the server-side wait.") }`.
- [x] Description (agent-facing — this wording matters; it's the only docs the model reads at call time):
      *"Run JavaScript in the active tab's page context and return the result, like the DevTools
      console: the last expression's value is returned, top-level `await` works, and `return` is
      allowed. Results are JSON where possible; DOM nodes, functions and errors come back as short
      descriptions — use browser_snapshot refs to act on elements. Output is capped (~20k chars, 100
      items per array, depth 6) — select what you need. Runs with the page's full logged-in authority
      and shows Chrome's 'is debugging this browser' banner while it runs."*
- [x] Bump the tool count (17 → 18) in `CLAUDE.md`, `docs/setup.md`, roadmap.

**Deviations:** (E3)

- `docs/setup.md` states no tool *count*, so the "17 → 18" bump there is the new
  `browser_evaluate(expression, timeoutMs?)` row in the tool table; the "Running JavaScript"
  subsection and the security paragraph remain Part E5's work.
- Output text format: `description`, then the `(DOM node — …)` hint when `kind === "node"`, then the
  `(output truncated — …)` hint when `truncated` — so with both, the truncation hint is last.
- `ExtensionConnection.call` gained an optional third arg typed by a new exported
  `CallOptions { timeoutMs?: number }`; `Bridge.call` forwards it verbatim.

## Part E4 — E2E (manual, `docs/e2e-test-plan.md` new section "4.7 Evaluate")

Fixture changes:
- [x] `e2e-playground.html`: add a `<script>` setting `window.__playground = { version: "1",
      items: [1,2,3], secret() { return "s3cret" }, big: Array.from({length: 500}, (_, i) => i),
      node: document.getElementById("counter") }` and a self-reference `window.__playground.self =
      window.__playground` (cycle).
- [x] New `e2e-playground-csp.html`: same body, plus
      `<meta http-equiv="Content-Security-Policy" content="script-src 'self' 'unsafe-inline'">` (no
      `'unsafe-eval'`), so option A's failure mode is demonstrably not ours.

| ID | Objective | Steps | Expected |
|---|---|---|---|
| EVAL-1 ★ | Basic expression + banner | `browser_evaluate {"expression":"document.title"}` | `Agent Bridge E2E Playground`; banner appears and clears. |
| EVAL-2 ★ | Object serialisation | `window.__playground` | Pretty JSON: `items`, `version`; `secret` shown as `"[Function: secret]"`; `node` shown as `<button id="counter">…`; `self` as `"[Circular]"`; `big` cut at 100 with `… 400 more`; trailing "output truncated" hint. |
| EVAL-3 ★ | Top-level await, page cookies | `(await fetch('/e2e-playground.html')).status` | `200`. |
| EVAL-4 ★ | `return` form | `const r = await fetch('/e2e-playground.html'); return r.status` | `200`. |
| EVAL-5 ★ | Thrown error | `throw new Error("boom")` | Tool error containing `Error: boom` and an `at` stack line; **not** a 30 s hang. |
| EVAL-6 | Rejected promise | `await Promise.reject(new TypeError("nope"))` | Tool error containing `TypeError: nope`. |
| EVAL-7 | Syntax error | `foo(` | Tool error `Uncaught SyntaxError…` with line/col. |
| EVAL-8 ★ | Async timeout | `await new Promise(r => setTimeout(r, 20000))` with `timeoutMs: 1000` | Fails in ~1 s with `Timed out after 1s…`; banner gone; the next tool call works. |
| EVAL-9 | Sync timeout | `while(true){}` with `timeoutMs: 1000` | Same outcome as EVAL-8 (CDP `timeout` terminated it); the tab is still responsive afterwards. |
| EVAL-10 | Long timeout beats the server default | `await new Promise(r => setTimeout(r, 35000)); 1` with `timeoutMs: 40000` | Returns `1` after ~35 s — proves E3.1 (would otherwise fail at 30 s with "Timed out … calling evaluate"). |
| EVAL-11 | Completion value + REPL re-declare | `const a = 1; a + 1` twice in a row | `2` both times (second call would be `SyntaxError: Identifier 'a' has already been declared` without `replMode`). |
| EVAL-12 ★ | CSP bypass | On the **CSP fixture**: `new Function("return 1")()` | `1` — and, for contrast, note in the scorecard that the same line typed into the page's own inline script would throw `EvalError`. |
| EVAL-13 ★ | Page-context DOM action | `document.querySelector('#counter').click(); document.querySelector('#count').textContent` | `"1"` (or current count); `status: counter = N` on screen. |
| EVAL-14 | Node list | `document.querySelectorAll('button')` | Array of `<button id="…">…` descriptions, `(DOM node — …)` hint absent (it's a list, kind json). |
| EVAL-15 | Single node | `document.body` | `<body …>` description + the `(DOM node — use browser_snapshot refs…)` hint. |
| EVAL-16 | DevTools open | Open DevTools on the tab, then EVAL-1 | Same rule as TRUST-3: Chrome ≥ 152 just works; older Chrome returns the "one debugger per tab" message. Record which. |
| EVAL-17 | Banner cancelled mid-run | EVAL-8 with `timeoutMs: 20000`, click the banner's **Cancel** | "The debugging session was cancelled mid-action…" within a second, not the timeout. |
| EVAL-18 | Restricted URL | Focus `chrome://extensions`, then EVAL-1 | "browser_evaluate is not available here: the active tab is a restricted URL…" (E2.1 wording). |
| EVAL-19 | Big string | `'x'.repeat(50000)` | Description cut at `maxString` (5 000) with `…[+45000 chars]`, `truncated` hint. |
| EVAL-20 | `userGesture` | `navigator.clipboard.writeText("hi").then(() => "ok")` | `ok` (would reject without a user gesture on most pages). |
| EVAL-21 | Isolation | `typeof window.__agentBridge` | `"undefined"` — the content-script world is not visible to page code. |
| EVAL-22 | Regression smoke | ACT-2, TRUST-2, PERC-4 | Still pass (the `withDebugger` signature change and `describeDebuggerError` wording change didn't regress them). |

- [ ] Run all, record in the scorecard (§5) with Chrome version + date, like the Phase B run.

**Deviations:** (E4)

- The plan assumed §4.7 of `docs/e2e-test-plan.md` was free; it was "Waiting". The Evaluate table went
  in as the new **§4.7** (next to Actions/Trusted input, where it belongs) and Waiting / Security /
  Real-world shifted to §4.8 / §4.9 / §4.10. Two EVAL rows in the table were also given a scorecard
  hook: EVAL-9 now says explicitly to record *which* CDP branch fired, and EVAL-12 points at the CSP
  fixture's `#eval-probe` line for the contrast rather than asking the runner to type it by hand.
- `e2e-playground-csp.html` is not a byte-copy of the main fixture's body — the perception fixtures
  (shadow roots, iframe, decoys, extra roles) have nothing to do with CSP. It carries what the EVAL
  cases need: the same `window.__playground` object, a counter button, the status line, and an
  `#eval-probe` paragraph that records the page's own `new Function()` result (`EvalError` under this
  CSP), which is the contrast EVAL-12 asks the scorecard to note.
- **EVAL-1…22 were not run.** The WebSocket port 9234 was held by an orphaned
  `node server/dist/index.js` from an earlier Claude session (`browser_status`:
  `NOT listening … EADDRINUSE`), and this session was not permitted to terminate the stale processes.
  The two boxes that depend on a live run — "Run all, record in the scorecard (§5)" here and the
  E2.2 box pinning Chrome's sync-timeout branch — stay unticked. The fixture, the CSP fixture, the
  §4.7 table and the §1 fixture notes are all in place, so the run is a pure re-execution once the
  port is free.

## Part E5 — docs + commits

- [ ] `docs/setup.md`: add `browser_evaluate(expression, timeoutMs?)` to the tool table; a new
      "Running JavaScript" subsection (what's returned, limits, `return`/`await` rules, the banner,
      the timeout not cancelling page work); the security paragraph from §0.4 in the security section.
- [ ] `docs/e2e-test-plan.md`: §4.7 table above + fixture notes in §1.
- [ ] `docs/progress-and-roadmap.md`: 18 tools; Step 4 entry in §0 once E2E ran; Phase F gains the
      follow-ups below; Phase E note that arm/disarm is now higher priority.
- [ ] `CLAUDE.md`: 18 tools; key-files line for `evaluate/*`; gotchas: *CDP `Runtime.evaluate.timeout`
      doesn't fire while awaiting — race your own timer*; *`returnByValue` turns nodes/Maps into `{}` —
      use the `callFunctionOn` serialiser*; *the server call timeout is per-call now — pass
      `timeoutMs` for anything that may exceed 30 s*; *`describeDebuggerError` takes a `what`*.
- [ ] Commits (each green): `feat(extension): in-page serialiser + expression wrapper (pure)`,
      `feat(extension): evaluate handler over CDP Runtime.evaluate`,
      `feat(server): per-call timeout + browser_evaluate tool`,
      `test(e2e): EVAL-1…22 + CSP fixture`, `docs: browser_evaluate`. Trailer per `CLAUDE.md`.

## Definition of done

- `npm test` green with new suites for serialize / wrap / result / connection / bridge / tools;
  `npm run typecheck` clean.
- EVAL-1…22 recorded in `docs/e2e-test-plan.md` §5 against a stated Chrome version.
- `browser_evaluate` appears in `docs/setup.md` with the security paragraph.
- No expression or result text is ever written to the SW console or server stderr.

## Follow-ups (not in this step)

- **Banner-free path** via `chrome.userScripts.execute` (option B) once Chrome's API is stable and the
  "Allow User Scripts" toggle is documented in setup; same envelope, so only the transport changes.
- **`args` parameter**: `browser_evaluate({expression, args: [...]})` exposed as `args` in the page,
  so agents pass data without string-escaping it. Sketch: prepend `const args = <JSON.stringify(args)>;`
  (JSON is valid JS in ES2019+); needs the `return`-wrapper to keep `args` in scope. Cheap; do it when
  a real use shows up.
- **Frame targeting**: `Runtime.evaluate` takes a `contextId`; expose `frame: "<url substring>"` after
  enumerating contexts via `Runtime.executionContextCreated` (needs `Runtime.enable` + teardown).
- **Return a ref for a node**: let a `kind:"node"` result carry `[ref=eN]` by round-tripping through
  the content script's RefMap — bridges "find it with JS, act on it with the fixed tools".
- **Keep-attached session**: each call pays attach/detach (~100 ms + banner flicker). A per-tab
  attach manager shared with Step 5's Part N4 would amortise it; needs a lifecycle design first.
- **Console capture**: `console.log` inside the expression is lost today; `Runtime.enable` +
  `consoleAPICalled` could append it to the result. Belongs with roadmap Phase F's console tool.
- **Arm/disarm** (roadmap Phase E) — a kill switch in the options page matters more once eval exists.
