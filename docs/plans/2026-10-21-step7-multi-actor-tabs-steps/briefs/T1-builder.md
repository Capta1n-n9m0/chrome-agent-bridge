# T1 builder brief (written by the T1 step agent, 2026-10-22)

You are the BUILDER for stage T1 ("Extension: tabId, codes, events") of Step 7 of chrome-agent-bridge.
Model: Claude Opus 5.5. You are a level-2 agent: do NOT spawn agents. Finish in one go, never wait.

## Preamble (role-prompts.md, verbatim)

Repo C:\Users\aliev\Projects\chrome-remote-extention (chrome-agent-bridge: MCP server +
Chrome MV3 extension; TypeScript; vitest). Shell: Git Bash on Windows. Checks:
`npm run typecheck`, `npm test`, `npm run build`. Read CLAUDE.md first; its "Runtime
gotchas" and "Testing philosophy" bind. HARD RULES: never commit or print the token
(`bridge.token`, `.env`); never bind anything but 127.0.0.1; never push; never touch the
user's real Chrome profile (no extension reload, no live browsing) unless your brief grants
it; never log URLs, header values or bodies from extension code. Report in the exact format
requested. Never invent results — if something did not run, say so. Decisions you take go
in your report as "Proposed decisions" (date · plain title, then Decided / Why / Instead of /
Revisit if). No internal codes without a one-line gloss.

## Read first (binding)

1. `CLAUDE.md` (runtime gotchas bind).
2. `docs/plans/2026-10-21-step7-multi-actor-tabs-steps/briefs/common.md` — read IN FULL. Its
   SPEC-DISCREPANCY PROTOCOL, INTEGRITY FLOOR, forbidden fixes, LESSONS and the "Running state"
   PARALLEL-STAGE RULES bind you. In particular:
   - node is not on PATH: first `export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"`.
   - Stage T2 is editing `daemon/` in this same working tree right now. NEVER touch `daemon/`,
     `shared/`, `sdk/`, `mcp/`. Run only `npx vitest run extension/` and `npm run typecheck`
     (typecheck covers all packages; if it fails ONLY in `daemon/`, that is T2's in-flight work —
     report it, do not fix it, and confirm `npx tsc -p extension --noEmit` is clean).
   - **NO `npm run build` in the main tree** (and no `node extension/build.mjs` writing
     `extension/dist/`: the user's real Chrome loads `extension/dist/` unpacked). To check the
     bundles, run esbuild with the same options as `extension/build.mjs` into an outdir in your
     scratchpad (e.g. a small script that imports esbuild and builds to a temp dir), then grep the
     content bundle for `import`/`export` statements.
   - Do not commit. The step agent commits later.
3. Phase doc `docs/plans/2026-10-21-step7-multi-actor-tabs.md`: "### Stage T1" (all checkboxes and
   notes), decisions 0.1, 0.5 (only as context — `activateForCapture` is T3's), 0.6, 0.8 (T3's), and
   exit checks T1.1–T1.7 with the *Sharpened 2026-10-22* notes on T1.4/T1.5.
4. Spec `docs/specs/2026-10-21-daemon-sdk-multi-actor-design.md` §5, §6.2, §10.
5. Stage 0 audit `…-steps/stage0-audit.md`: F1, F3, F4, F6, F8, F16, F17, F18, F21, F29, F30, F33.
6. `docs/decisions.md` entries #38, #42, #43, #48, #50 (2026-10-22), and "selectTab stays as an alias
   of focusTab for one release" (#2b) — focusTab itself is T3, NOT yours.
7. `…-steps/T0.md` § Handoff (event param shapes; omit absent optionals, never send `null`).

## What to build (lane: `extension/src/`, `extension/test/`, `test-fixtures/e2e-playground.html` only)

Overall rule: **no behaviour change when `tabId` is absent** (a Step 6 daemon sends none) except
the ones listed here. **Every existing user-visible message text stays byte-identical**; you add
codes, you do not reword. Editing an existing test's expected *message text* is forbidden; changing
an existing test's access path to the same text (e.g. `.message` after a return-type change, or
adding `code` to an expected error object) is allowed — list each such edit in your report.

### A. Errors with codes (0.6, #38, F1, F29, F30)
- `extension/src/errors.ts`: a `BridgeError(code, message, data?)` — re-export `@bridge/shared`'s
  `BridgeError`/`ErrorCodes` if it bundles cleanly into the ESM bundles (check), else a local class
  with the same shape. Plus a pure `toWireError(err)`: `BridgeError` → `{code, message, data?}`
  (omit `data` when undefined); plain `Error` → `{code:"INTERNAL", message}`; non-Error →
  `{code:"INTERNAL", message: String(err)}`. Plus a pure `splitCoded("CODE:message")`: code is the
  text before the first `:` if it matches `/^[A-Z][A-Z_]*$/`, else `INTERNAL` with the whole string.
- `router.ts`: serialise errors through `toWireError`. Unknown method →
  `{code:"UNKNOWN_METHOD", message:"unknown method: <m>"}` (message unchanged). Update
  `router.test.ts` (add `code` to expected objects; keep message texts) and add tests: a thrown
  `BridgeError` → `{code, message, data}`; plain Error → INTERNAL; non-Error → INTERNAL.
- Content script (`extension/src/content/*`): the pure action functions keep throwing (existing
  `actions.test.ts` stays valid) but their errors carry a code (e.g. a tiny local `codedError(code,
  msg)` that sets `.code` — content is an IIFE: no import of shared needed; esbuild bundles imports
  anyway, but keep the content bundle free of `import`/`export`). Codes: ref not found → `REF_STALE`;
  `centerForInput` "outside the viewport" → `OFFSCREEN`; selectOption "no option matched" →
  `BAD_PARAMS`; anything else → `INTERNAL`. In `content/index.ts` wrap every public
  `window.__agentBridge` method in one guard that catches and RETURNS
  `{__bridgeError: "<CODE>:<message>"}` (#38). Test the guard (jsdom) and `centerForInput`'s
  two codes if it can be reached from a test (extract the guard + centerForInput logic into a pure
  module if needed).
- `inject.ts` `unwrapResult`: null OR undefined OR missing frame → `BridgeError("REF_STALE", <the
  exact current text>)` (CLAUDE.md invariant; F30 keeps the restricted-URL clause). A result object
  with a string `__bridgeError` → `BridgeError(splitCoded(...))`. Anything else → returned as today.
  `ensureContent` / `callInPage` rejections: keep the exact current message text; code from a pure
  classifier on Chrome's raw message: `/no tab with id/i` → `TAB_UNKNOWN`; restricted patterns
  (`cannot access`, `chrome://`, `chrome-extension://`, `extensions gallery`, `cannot be scripted`,
  `devtools://`) → `RESTRICTED_URL`; else `INTERNAL`. Tests: REF_STALE on null AND on undefined AND
  on a missing frame; the marker split; the classifier.
- `debugger-errors.ts`: `describeDebuggerError(err, what)` returns `{code, message}` with the
  **message strings exactly as today**: execution terminated → `TIMEOUT`; "another debugger is
  already attached" → `DEBUGGER_DEVTOOLS`; restricted → `RESTRICTED_URL`; detached/not attached →
  `DEBUGGER_CANCELLED`; anything else (`[chrome.debugger] …`) → `DEBUGGER_ATTACH`. If `err` is
  already a `BridgeError` (our own code threw inside `fn`, e.g. PAGE_ERROR or TIMEOUT), keep ITS code
  and data but produce the message exactly as today's string logic would from its message (E2E
  EVAL-5 expects `[chrome.debugger] Error: boom`, DL-2 `[chrome.debugger] TypeError: Failed to
  fetch`). Update `debugger-errors.test.ts` by access path only (`.message`), keep every regex; add
  one test per code for its Chrome string (T1.3).
- `debugger.ts`: `withDebugger` throws `BridgeError(code, message, data)` from the above.
  `raceTimeout` rejects with `BridgeError("TIMEOUT", message)`; the evaluate catch's
  `timeoutMessage` throw → `TIMEOUT`, same text.
- `evaluate/result.ts`: a page exception throws `BridgeError("PAGE_ERROR", <same formatted text>,
  {name, stack?})` — `name` from `exception.className` (fallback `"Error"`), `stack` only when the
  description has more than one line (omit otherwise; never `null`). Test it.
- Handlers, codes with unchanged texts: navigate missing url → `BAD_PARAMS`; navigate's
  `tabs.update` rejection / load timeout → `NAV_FAILED` with `data: {error: <raw message>}`;
  `downloadStart` non-http URL → `BAD_PARAMS`, `HTTP <status>` → `DOWNLOAD_HTTP` with
  `data: {status, contentType}`, its timeout → `TIMEOUT`; waitFor's "requires one of" → `BAD_PARAMS`,
  its two timeouts → `TIMEOUT`; evaluate's empty expression → `BAD_PARAMS`; network's
  `Invalid tab`/`id must be a string`/`types`/`limit` → `BAD_PARAMS`. Keep this list; do not invent
  other codes; anything else stays a plain Error → INTERNAL. Codes must be among the 22 in
  `shared/src/codes.ts` (do not edit it).
- `console.warn` in `actions.ts`'s escalation paths currently prints `err`; Chrome's raw message can
  contain a URL. Print the code only (e.g. `(err as {code?}).code ?? "INTERNAL"`).

### B. `targetTab` (0.1, F4, F8/#43, F17, F18)
- `tabs.ts`: `humansTab()` = `chrome.windows.getLastFocused({windowTypes:["normal"]})` → the active
  tab of that window via `chrome.tabs.query({active:true, windowId})`. No lowercase `focused` key
  anywhere in that call (T3.3 greps for it). On rejection or no tab: throw
  `"No normal Chrome window is focused (a DevTools or popup window may have focus) — click a normal Chrome window and retry"`
  (code INTERNAL — F21: no dedicated code). `activeTab()` stays in `tabs.ts` but becomes module-
  private and is called ONLY inside `targetTab`'s fallback (T1.2's grep).
- `targetTab(p, method)`: `p.tabId` present (anything but `undefined`) and not an integer number →
  `BAD_PARAMS` "tabId must be an integer"; integer → `chrome.tabs.get(tabId)`, a "No tab with id"
  rejection → `TAB_UNKNOWN` (phase-doc 0.1 — NOT TAB_GONE; do not follow F21's TAB_GONE). Absent and
  `typeof p.tab === "string"` → `BAD_PARAMS` with F17's text (not used by the network handlers).
  Absent → `console.warn` naming ONLY the method (once per method per worker lifetime is fine) then
  `activeTab()` (= `humansTab()`). The warning text must pass T1.5's sharpened grep, i.e. contain
  no standalone word `p`, `params`, `tab`, `info`, `changeInfo` inside the call's parentheses (write
  e.g. `` `[bridge] ${method}: no tabId given — using the focused normal window's active one (Step 6 fallback)` ``
  and RUN the grep).
- F18: a helper used only by the page-touching paths (snapshot, click, type, scroll, hover,
  selectOption, pressKey, waitFor text, evaluate, fullPage screenshot): if `tab.discarded`, throw
  "The tab was discarded by Chrome's Memory Saver — call browser_navigate or focus it to reload"
  (INTERNAL). Not for navigate/back/forward/network/networkIdle.
- Replace all 13 `activeTab()` sites in `handlers/*` with `targetTab(p, "<method>")` (`back`/
  `forward` now take `p`). `grep -rn "activeTab()" extension/src/handlers` must return nothing.
- `screenshot` viewport mode with an explicit `tabId` whose tab is not `active` in its window: throw
  a clear INTERNAL error ("a viewport screenshot of a background tab needs the Step 7 capture switch
  — pass fullPage:true for now") instead of silently capturing the window's visible tab. Fallback
  path unchanged. (T3 replaces this with `activateForCapture`.)
- `closeTab` / `selectTab` (F4): read `p.tabId ?? p.id`; neither → `BAD_PARAMS`, never fall back;
  non-integer → `BAD_PARAMS`; "No tab with id" → `TAB_UNKNOWN`. selectTab's body otherwise unchanged
  (focusTab and the alias are T3). `newTab` unchanged (its `active` default is T3's).
- `listTabs`: unchanged fields plus `current: true` on exactly the `humansTab()` tab (omit the key
  on the others; if the resolver fails, no tab gets it and listTabs still succeeds). `active` keeps
  its per-window meaning.
- network (`handlers/network.ts`, #40/F3): scope from `p.tabId` (integer → that tab; do NOT call
  `chrome.tabs.get` — a closed tab's log stays queryable), else `p.scope === "all"` → all, else the
  legacy `p.tab` (undefined/"active" → `targetTab` fallback, "all", integer, else the existing
  error). Keep the `label` as today for the legacy path; with `tabId` use the number.
- Put the pure parts (validation, error classification) where they can be unit-tested; test
  `targetTab` with a stubbed `globalThis.chrome` (`vi.stubGlobal`): BAD_PARAMS for a non-numeric
  `tabId` (T1.3), TAB_UNKNOWN for "No tab with id", the F17 refusal, the fallback warn (assert the
  warn's arguments contain the method name and nothing derived from params), closeTab with neither
  `tabId` nor `id` → BAD_PARAMS.

### C. Tab events (T1 checkbox 3, F16, F33, T0 handoff)
- A pure module (e.g. `extension/src/tab-events.ts`): a `TabInfoCache` (tabId → {url?, title?})
  with `fill(tabs)` that only sets ids not already present (live wins), `update(tabId, changeInfo,
  tab)`, `take(tabId)` (remove + return), `move(removed, added)`; builders
  `tabCreatedParams(tab)` = `{tabId, url: tab.pendingUrl ?? tab.url ?? "", ...(openerTabId !==
  undefined ? {openerTabId} : {})}`; `tabRemovedParams(tabId, cached)` with `lastUrl`/`lastTitle`
  only when known (never `null`, never `""`→ omit empty); `tabReplacedParams(added, removed)`; and
  `eventFrame(event, params)` → the JSON string `{"event":…,"params":…}` (no `id`). Tests: each
  frame passes T0's guards (`isTabCreatedEvent` / `isTabRemovedEvent` / `isTabReplacedEvent` from
  `@bridge/shared`), has no `id`, never contains `null`; the cache semantics; and `Router.handle`
  returns `null` for an id-less event frame (the relay's inbound side).
- `sw.ts`: at the TOP LEVEL, synchronously, each `addListener(` line starting at column 1:
  `chrome.tabs.onCreated` → send `tabCreated`; `chrome.tabs.onUpdated` → cache update;
  `chrome.tabs.onRemoved` (a second, separate listener; the network log's existing one stays as it
  is) → send `tabRemoved` with the cached last url/title, then drop the entry; `chrome.tabs.onReplaced`
  → send `tabReplaced`, move the cache entry. Send = `chrome.runtime.sendMessage({target:"offscreen",
  type:"send", data: eventFrame(...)}).catch(() => {})` (the existing offscreen "send" relay; if no
  socket is open the event is dropped — say so in a comment). After the listeners: one non-awaited
  `chrome.tabs.query({}).then(t => cache.fill(t)).catch(() => {})` (F16). NO top-level `await`
  (`grep -nE "^(await|const .*= await|void await)" extension/src/sw.ts` must print nothing). NO URL,
  title, `p`/`params`/`tab`/`info`/`changeInfo` in any `console.*`. Also reword the existing line
  `console.warn("[bridge] debugger detached from tab", source.tabId, "reason:", reason);` so it
  passes T1.5's sharpened grep (keep the tab id number and reason, e.g.
  `"[bridge] debugger detached, tabId", source.tabId, ...`).

### D. Hello (#42, F6)
- `client.ts` hello becomes `{type:"hello", token, role:"extension", proto:2}`. Extract the frame
  builder as a pure function and test that it passes shared's `isHello` and carries role/proto.

### E. Fixture (T1 checkbox 5, #6, T1.7)
- `test-fixtures/e2e-playground.html`: add an "open popup" link-button: `<a id="open-popup"
  href="e2e-playground.html?popup=1" target="_blank">Open popup</a>` (relative → a fixture page,
  never an external URL), placed near the other link in the "Actions" area. The file must stay LF
  (`.gitattributes` pins it; check with `file` or `grep -c $'\r'`). Report the new byte size
  (`wc -c`) — NET-1's expected `12.6 KB` depends on it; the step agent handles that.

## Checks to run and paste (tails, with counts)
- `npx vitest run extension/` (before your change: record the extension count first) and after.
- `npm run typecheck` (or `npx tsc -p extension --noEmit` if daemon/ is red from T2 — say which).
- Scratch-dir esbuild of the four extension bundles; `grep -nE "^\s*(import|export)\b"` on the
  content bundle prints nothing.
- Exit-check greps: T1.2 both greps; T1.4 both greps; T1.5 both greps; T1.7 grep; and
  `grep -rn "focused" extension/src/tabs.ts`.
- For each new test file / block: revert the matching src change (e.g. `git stash push -- <src
  files>` or a temporary copy), run, show it fails, restore. Paste the counts.

## Report (return as your final message; also write it to
`docs/plans/2026-10-21-step7-multi-actor-tabs-steps/T1-builder-report.md`)
Built (files) · test/typecheck/bundle results pasted with counts · exit-check grep outputs · tests
that fail without the change (evidence) · every edited existing test assertion (file:line, old →
new) · deviations from the phase doc · proposed decisions · anything left unfinished. ≤ 120 lines.
